import type { ActionDef, ContentDB, GameState, ItemId, ItemInstance, RngState, SkillId, WorkOrder, WorkOrderKind, WorkOrderState, WorkOrderTier } from "@hearthforge/shared";
import {
  defaultWorkOrderState,
  defaultWorkOrderTierClocks,
  EVENT_CRAFT_SKILLS,
  ORDER_GATHER_SKILLS,
  ORDER_GOLD_KIND_FACTOR,
  ORDER_GOLD_SELL_FACTOR,
  ORDER_INPUT_REACH_DEPTH,
  ORDER_INTERVAL_SPREAD,
  ORDER_LEGACY_TIER,
  ORDER_MAX_OPEN,
  ORDER_TIER_FLOOR_BELOW,
  ORDER_TIERS,
  ORDER_TOP_TIER_WEIGHT,
  TAVERN_BANDS,
  TAVERN_GOLD_BY_BAND,
  WORK_CRATE_MATERIAL_KINDS,
  tavernBandForLevel,
} from "@hearthforge/shared";
import { nextFloat } from "./rng";
import { levelFromXp } from "./leveling";
import { itemCount, removeInstance, removeItem } from "./inventory";
import { grantLoot } from "./mail";
import { sellPrice } from "./shop";
import { goldFindMult, prestigeSkillXpMult } from "./prestige-effects";
import { syncProgression } from "./character";
import { tavernBandMaterials, tavernExpectedQty, tavernHashFloat, tavernMainOutput } from "./tavern";

/**
 * claude:2026-10-24T23:05:00+02:00 — Arbeitsaufträge (1.4.0 „Feder und Stahl“ Welle 3 AU, Chef 23.10.2026; Zahlen
 * design/1.4.0-balance-werkstatt.md §4). claude:2026-10-25T17:05:00+01:00 — seit 1.4.1 gestuft (Chef 25.10.2026, design/1.4.1-auftraege-gestuft.md):
 * Quelle ist nicht mehr das Ereignis „Kundschaft“, sondern je Stufe eine eigene Uhr in Online-Skilling-Zeit
 * (`onWorkOrderActionCompleted`, aufgerufen aus events.ts nach jeder Online-Aktion). Zahlen je Stufe in `ORDER_TIERS`.
 *
 * Wiederverwendet die Auftragslogik der Taverne (Haupt-Output, erwartete Menge, Gold-Bänder, Band-Materialien,
 * Hash-Kisten) ohne die Taverne selbst (`TAVERN_ENABLED` bleibt aus). Abweichungen laut Spec:
 * - Menge und XP rechnen mit der EFFEKTIVEN Dauer (Werkzeug, Lager, Tempo), sonst wären Aufträge mit
 *   Spitzenwerkzeug nur halb so lang (§4.2/§4.5).
 * - Fortschritt immer mit Startanker `stats.producedBySkill[skill][item] − baseline` (seit SAVE 95 nur Ware aus Aktionen des
 *   Auftrags-Skills, claude:2026-10-24T16:03:31+02:00, Chef-Entscheid QA-Runde 2 Werkstatt B2), auch beim Liefern. Nie der Bestand,
 *   sonst erfüllte eine volle Bank jeden Lieferauftrag ohne Arbeit (§4.3).
 * - Kein Vorgriff: nur Aktionen mit `levelRequired ≤ Level`; Herstellaufträge nur, wenn die Zutaten erreichbar sind.
 * - Lohn: Gold über dem Verkaufswert, XP-Batzen, Werkstattkiste je Stufe 0/10/100 % (ohne Ausrüstung). Würfe aus `eventRng`.
 */

const RING_MASTER_PREFIX = "ring_master_";
const WORK_CRATE_PREFIX = "work_crate_";
const WORK_CRATE_SUFFIXES = ["i", "ii", "iii", "iv", "v"] as const;
const SALT_WORK_CRATE = 31;
const CRATE_MATERIAL_QTY_MIN = 3;
const CRATE_MATERIAL_QTY_MAX = 8;
const WORK_CRATE_RUNE_CHANCE = 0.05;
const CRATE_RUNE_TIER_BY_BAND: readonly number[] = [0, 1, 2, 3, 3, 4];
/** Auftraggeber ohne passenden Kunden: neutrales Gilden-Siegel. */
export const ORDER_GUILD_CUSTOMER_ID = "guild";

export function workOrdersOf(state: GameState): WorkOrderState {
  return (state.workOrders ??= defaultWorkOrderState());
}

/** Kein neues Angebot möglich: drei offene Aufträge oder ein unbeantwortetes Angebot (Spec §3.2). */
export function workOrdersFull(state: GameState): boolean {
  const o = state.workOrders;
  if (!o) return false;
  return o.offer !== null || o.open.length >= ORDER_MAX_OPEN;
}

function skillLevel(state: GameState, skill: SkillId): number {
  return levelFromXp(state.skills[skill]?.xp ?? 0);
}

/** Auftragsart eines Skills (null = keine Aufträge: Diebeskunst, Ländereien, Kampf). */
export function workOrderKindFor(skill: SkillId): WorkOrderKind | null {
  if (ORDER_GATHER_SKILLS.has(skill)) return "deliver";
  if (EVENT_CRAFT_SKILLS.has(skill)) return "produce";
  return null;
}

/**
 * claude:2026-10-26T01:25:00+02:00 — Einzelstücke (Ausrüstung mit Suffix/Runen als Instanz) zählen mit: sonst zeigte ein Herstellauftrag auf
 * Ausrüstung „erledigt“, ließ sich aber nie abgeben (QA-Aufträge P2-1). Gesperrte Instanzen (Bergungs-Schloss) zählen nicht.
 */
function deliverableInstances(state: GameState, itemId: ItemId): Array<{ inst: ItemInstance; inBank: boolean }> {
  const locked = state.lockedItems ?? {};
  const out: Array<{ inst: ItemInstance; inBank: boolean }> = [];
  // claude:2026-10-24T16:03:31+02:00 — Chef-Entscheid QA-Runde 2 Werkstatt B1 „das Schloss schützt immer“: auch das Basis-Schloss (Item-ID) sperrt alle
  // Einzelstücke dieses Items (wie bei der Bergung, salvage.ts).
  if (locked[itemId]) return out;
  for (const inst of state.inventory.instances ?? []) if (inst.baseItemId === itemId && !locked[inst.instanceId]) out.push({ inst, inBank: false });
  for (const inst of state.bankInstances ?? []) if (inst.baseItemId === itemId && !locked[inst.instanceId]) out.push({ inst, inBank: true });
  // Die schwächsten zuerst: ohne Runen/Suffix, dann nach Suffix-Wurf.
  const score = (i: ItemInstance): number => i.affixes.length * 10 + (i.suffix ? 1 + (i.suffix.roll ?? 0) : 0);
  return out.sort((a, b) => score(a.inst) - score(b.inst));
}

// claude:2026-10-24T15:21:04+02:00 — Bestand = Inventar + Lager/Bank + freie Einzelstücke. Angelegtes zählt nicht, auch nicht der Köcher
// (CEO-Entscheid QA-Runde 2 Fernkampf B2: ausgerüstete Munition wie angelegte Ausrüstung; der Köcher-Deckel lässt den Rest im Lager).
function stockOf(state: GameState, itemId: ItemId): number {
  // claude:2026-10-24T16:03:31+02:00 — gesperrter Stapel zählt nie als Bestand (Chef-Entscheid QA-Runde 2 Werkstatt B1); gesperrte Einzelstücke fallen in
  // deliverableInstances heraus.
  const stack = state.lockedItems?.[itemId] ? 0 : itemCount(state.inventory, itemId) + (state.bank[itemId] ?? 0);
  return stack + deliverableInstances(state, itemId).length;
}

/**
 * claude:2026-10-24T16:03:31+02:00 — Fortschritts-Zähler eines Auftrags (SAVE 95, Chef-Entscheid QA-Runde 2 Werkstatt B2 „nur die passende Quelle zählt“):
 * erzeugte Stücke aus Aktionen des Auftrags-Skills (`stats.producedBySkill`, tick.ts). Beet-Ernte, Diebstahl und Nebenfunde
 * anderer Skills zählen nicht, also auch kein XP-Batzen über Umwege.
 */
function producedFor(state: GameState, skill: SkillId, itemId: ItemId): number {
  return state.stats.producedBySkill?.[skill]?.[itemId] ?? 0;
}

/** Herstellbar über eine erreichbare Aktion (Tiefe ≤ ORDER_INPUT_REACH_DEPTH), Bestand > 0 oder Gold-Shop. */
function reachable(state: GameState, content: ContentDB, itemId: ItemId, depth: number, shop: ReadonlySet<ItemId>): boolean {
  if (stockOf(state, itemId) > 0 || shop.has(itemId)) return true;
  if (depth > ORDER_INPUT_REACH_DEPTH) return false;
  return producedBySomeAction(state, content, itemId, shop, depth);
}

/** Wird das Item von einer erreichbaren Aktion als Haupt-Output hergestellt, deren Zutaten wieder erreichbar sind? */
function producedBySomeAction(state: GameState, content: ContentDB, itemId: ItemId, shop: ReadonlySet<ItemId>, depth: number): boolean {
  for (const a of Object.values(content.actions)) {
    if (!(a.durationMs > 0) || (a.levelRequired ?? 1) > skillLevel(state, a.skill)) continue;
    const main = tavernMainOutput(content, a);
    if (main?.itemId !== itemId) continue;
    if ((a.inputs ?? []).every((inp) => reachable(state, content, inp.itemId, depth + 1, shop))) return true;
  }
  return false;
}

/**
 * Reichen die Zutaten für `count` Stück der Aktion (Spec §4.1)? Je Zutat: (a) Bestand für den ganzen Auftrag,
 * (b) eine erreichbare Aktion stellt sie her (Zutaten rekursiv erreichbar, Tiefe ≤ 3), (c) Gold-Shop.
 * Reine Kampf-Drops zählen nur über (a).
 */
function inputsReachable(state: GameState, content: ContentDB, action: ActionDef, count: number, perRun: number): boolean {
  const shop = new Set(content.shop.map((e) => e.itemId));
  const runs = Math.ceil(count / Math.max(1e-9, perRun));
  for (const inp of action.inputs ?? []) {
    if (stockOf(state, inp.itemId) >= inp.qty * runs) continue;
    if (shop.has(inp.itemId)) continue;
    if (producedBySomeAction(state, content, inp.itemId, shop, 1)) continue;
    return false;
  }
  return true;
}

export interface WorkOrderCandidate {
  action: ActionDef;
  itemId: ItemId;
  perRun: number;
  weight: number;
}

/** Kandidaten eines Skills (Spec §4.1): erreichbare Stufen, Tier-Boden Level − 25, höchste Stufe ×3. */
export function workOrderCandidates(state: GameState, content: ContentDB, skill: SkillId): WorkOrderCandidate[] {
  const kind = workOrderKindFor(skill);
  if (!kind) return [];
  const level = skillLevel(state, skill);
  const raw: { action: ActionDef; itemId: ItemId; perRun: number; lr: number }[] = [];
  for (const id of Object.keys(content.actions).sort()) {
    const a = content.actions[id]!;
    if (a.skill !== skill || !(a.durationMs > 0)) continue;
    const lr = a.levelRequired ?? 1;
    if (lr > level) continue;
    const hasInputs = !!a.inputs && a.inputs.length > 0;
    if (kind === "deliver" ? hasInputs : !hasInputs) continue;
    const main = tavernMainOutput(content, a);
    if (!main || main.itemId.startsWith(RING_MASTER_PREFIX)) continue;
    raw.push({ action: a, itemId: main.itemId, perRun: tavernExpectedQty(main), lr });
  }
  if (raw.length === 0) return [];
  const top = Math.max(...raw.map((c) => c.lr));
  const floor = Math.min(level - ORDER_TIER_FLOOR_BELOW, top);
  return raw
    .filter((c) => c.lr >= floor)
    .map((c) => ({ action: c.action, itemId: c.itemId, perRun: c.perRun, weight: c.lr === top ? ORDER_TOP_TIER_WEIGHT : 1 }));
}

/** Beste XP je Minute im Skill mit EFFEKTIVER Dauer (Spec §4.5). */
export function bestEffectiveXpPerMinute(
  state: GameState,
  content: ContentDB,
  skill: SkillId,
  durOf: (a: ActionDef) => number,
): number {
  const level = skillLevel(state, skill);
  let best = 0;
  for (const a of Object.values(content.actions)) {
    if (a.skill !== skill || (a.levelRequired ?? 1) > level || !(a.durationMs > 0)) continue;
    const rate = (a.xp / Math.max(1, durOf(a))) * 60_000;
    if (rate > best) best = rate;
  }
  return best;
}

/** Auftraggeber für einen Skill: Tavernen-Gäste mit diesem Beruf, sonst Zusatz-Kunden, sonst das Gilden-Siegel. */
export function workOrderCustomers(content: ContentDB, skill: SkillId): string[] {
  const out: string[] = [];
  for (const g of content.tavernGuests ?? []) {
    if (g.givesTasks && g.rarity === "daily" && g.skill === skill) out.push(g.id);
  }
  for (const c of content.orderCustomers ?? []) if (c.skill === skill) out.push(c.id);
  return out.sort();
}

/**
 * Würfelt ein Auftragsangebot der Stufe `tier` für die Aktion, deren Abschluss die Stufen-Uhr fällig gemacht hat. Das Angebot
 * gehört zu deren Skill. null = kein machbarer Auftrag (leerer Pool) oder kein Platz; dann wartet die Stufe.
 * `durOf` = effektive Dauer einer Aktion (tick.ts `effectiveActionDurationMs`, als Rückruf gegen einen Importzyklus).
 * claude:2026-10-25T17:05:00+01:00 — `tier` (1.4.1): Minuten, XP-Faktor, Band-Gold-Faktor und Angebots-Laufzeit aus `ORDER_TIERS`.
 * Ohne Angabe Stufe 2 (= der 1.4.0-Auftrag bis auf den XP-Faktor 1,0 statt 1,5 und die Minuten 20/25/30).
 */
export function makeWorkOrderOffer(
  state: GameState,
  content: ContentDB,
  action: ActionDef,
  rng: RngState,
  durOf: (a: ActionDef) => number = (a) => a.durationMs,
  tier: WorkOrderTier = ORDER_LEGACY_TIER,
): WorkOrder | null {
  const kind = workOrderKindFor(action.skill);
  if (!kind || workOrdersFull(state)) return null;
  const def = ORDER_TIERS[tier]; // claude:2026-10-25T17:05:00+01:00
  const minutes = def.minutes[Math.min(def.minutes.length - 1, Math.floor(nextFloat(rng) * def.minutes.length))]!;
  const pool: { c: WorkOrderCandidate; count: number }[] = [];
  // claude:2026-10-26T01:25:00+02:00 — kein zweiter Auftrag auf ein Item, für das schon einer offen ist (sonst erfüllte dieselbe Arbeit beide, QA-Aufträge P2-2).
  const openItems = new Set((state.workOrders?.open ?? []).map((x) => x.itemId));
  for (const c of workOrderCandidates(state, content, action.skill)) {
    if (openItems.has(c.itemId)) continue;
    const count = Math.max(1, Math.round(((minutes * 60_000) / Math.max(1, durOf(c.action))) * c.perRun));
    if (kind === "produce" && !inputsReachable(state, content, c.action, count, c.perRun)) continue;
    pool.push({ c, count });
  }
  if (pool.length === 0) return null;
  const total = pool.reduce((a, p) => a + p.c.weight, 0);
  let x = nextFloat(rng) * total;
  let pick = pool[pool.length - 1]!;
  for (const p of pool) {
    x -= p.c.weight;
    if (x < 0) {
      pick = p;
      break;
    }
  }
  const level = skillLevel(state, action.skill);
  const band = Math.max(1, Math.min(TAVERN_BANDS, tavernBandForLevel(level)));
  // claude:2026-10-25T17:05:00+01:00 — Band-Gold × Stufen-Faktor, XP-Faktor je Stufe (ersetzt ORDER_XP_MINUTE_FACTOR 1,5; Chef 25.10.2026).
  const gold = Math.round(
    ORDER_GOLD_SELL_FACTOR * pick.count * sellPrice(content, pick.c.itemId) +
      (TAVERN_GOLD_BY_BAND[band] ?? 0) * ORDER_GOLD_KIND_FACTOR[kind] * def.bandGoldFactor,
  );
  const xp = Math.round(minutes * def.xpFactor * bestEffectiveXpPerMinute(state, content, action.skill, durOf));
  const customers = workOrderCustomers(content, action.skill);
  const customerId = customers.length > 0 ? customers[Math.min(customers.length - 1, Math.floor(nextFloat(rng) * customers.length))]! : ORDER_GUILD_CUSTOMER_ID;
  const o = workOrdersOf(state);
  o.seq += 1;
  const order: WorkOrder = {
    id: o.seq,
    kind,
    tier, // claude:2026-10-25T17:05:00+01:00
    skill: action.skill,
    actionId: pick.c.action.id,
    itemId: pick.c.itemId,
    count: pick.count,
    minutes,
    band,
    gold,
    xp,
    customerId,
    baseline: 0,
  };
  o.offer = order;
  o.offerMsLeft = def.offerTtlMs; // claude:2026-10-25T17:05:00+01:00 — Laufzeit je Stufe
  return order;
}

/**
 * claude:2026-10-25T17:05:00+01:00 — Neuwurf einer Stufen-Uhr (1.4.1): gleichverteilt in [(1 − ORDER_INTERVAL_SPREAD), (1 + ORDER_INTERVAL_SPREAD)]
 * × Mittel, ein Wurf aus dem übergebenen Strom (`eventRng`).
 */
export function rollWorkOrderInterval(tier: WorkOrderTier, rng: RngState): number {
  const mean = ORDER_TIERS[tier].meanIntervalMs;
  return Math.round(mean * (1 - ORDER_INTERVAL_SPREAD + 2 * ORDER_INTERVAL_SPREAD * nextFloat(rng)));
}

/** Prüf-Reihenfolge der Stufen-Uhren: höchste Stufe zuerst (claude:2026-10-25T17:05:00+01:00). */
const WORK_ORDER_TIERS_DESC: readonly WorkOrderTier[] = [3, 2, 1];

/**
 * claude:2026-10-25T17:05:00+01:00 — Stufen-Uhren der Arbeitsaufträge (1.4.1, Chef 25.10.2026; design/1.4.1-auftraege-gestuft.md).
 * Nach einer ONLINE abgeschlossenen Aktion (events.ts `onSkillActionCompleted`, nur im Live-Loop): Skills ohne Aufträge
 * (Diebeskunst, Ländereien, Kampf) zählen nicht. Sonst laufen alle drei Uhren um die effektive Dauer der Aktion herunter
 * (Boden 0). Ist Platz (kein Angebot, weniger als ORDER_MAX_OPEN offen), bekommt die höchste fällige Stufe ein Angebot für
 * den Skill dieser Aktion, danach wird ihre Uhr neu gewürfelt. Ohne Platz oder ohne machbaren Auftrag bleibt die Uhr auf 0
 * und wartet; dann darf die nächstniedrigere fällige Stufe es versuchen. Alle Würfe aus `rng` (= `state.eventRng`).
 */
export function onWorkOrderActionCompleted(
  state: GameState,
  content: ContentDB,
  action: ActionDef,
  effDurMs: number,
  rng: RngState,
  durOf: (a: ActionDef) => number = (a) => a.durationMs,
): WorkOrder | null {
  if (!workOrderKindFor(action.skill)) return null;
  const o = workOrdersOf(state);
  const clocks = (o.tierMs ??= defaultWorkOrderTierClocks());
  const d = Math.max(0, Number.isFinite(effDurMs) ? effDurMs : 0);
  for (const t of WORK_ORDER_TIERS_DESC) clocks[t] = Math.max(0, (Number.isFinite(clocks[t]) ? clocks[t] : ORDER_TIERS[t].meanIntervalMs) - d); // fehlend/kaputt → Mittelwert (wie Sanitize)
  if (workOrdersFull(state)) return null;
  for (const t of WORK_ORDER_TIERS_DESC) {
    if (clocks[t] > 0) continue;
    const offer = makeWorkOrderOffer(state, content, action, rng, durOf, t);
    if (!offer) continue;
    clocks[t] = rollWorkOrderInterval(t, rng);
    return offer;
  }
  return null;
}

/** Online-Uhr: das unbeantwortete Angebot verfällt nach der Laufzeit seiner Stufe (`ORDER_TIERS[tier].offerTtlMs`). */
export function tickWorkOrders(state: GameState, dtMs: number): void {
  const o = state.workOrders;
  if (!o?.offer) return;
  o.offerMsLeft -= dtMs;
  if (o.offerMsLeft <= 0) {
    o.offer = null;
    o.offerMsLeft = 0;
  }
}

/** Angebot annehmen: Startanker setzen. false = kein Angebot oder schon drei offen. */
export function acceptWorkOrder(state: GameState): boolean {
  const o = workOrdersOf(state);
  if (!o.offer || o.open.length >= ORDER_MAX_OPEN) return false;
  // claude:2026-10-26T01:25:00+02:00 — Startanker hinter dem Restbedarf schon offener Aufträge auf dasselbe Item (Alt-Stände, QA-Aufträge P2-2).
  const offer = o.offer;
  const produced = producedFor(state, offer.skill, offer.itemId); // claude:2026-10-24T16:03:31+02:00 — Zähler je Skill (SAVE 95)
  const pending = o.open
    .filter((x) => x.itemId === offer.itemId && x.skill === offer.skill)
    .reduce((sum, x) => sum + Math.max(0, x.count - Math.max(0, Math.min(x.count, produced - x.baseline))), 0);
  const order = { ...offer, baseline: produced + pending };
  o.open.push(order);
  o.offer = null;
  o.offerMsLeft = 0;
  return true;
}

export function declineWorkOrder(state: GameState): void {
  const o = workOrdersOf(state);
  o.offer = null;
  o.offerMsLeft = 0;
}

/** Offenen Auftrag aufgeben (ohne Lohn). */
export function abandonWorkOrder(state: GameState, id: number): boolean {
  const o = workOrdersOf(state);
  const i = o.open.findIndex((x) => x.id === id);
  if (i < 0) return false;
  o.open.splice(i, 1);
  return true;
}

export interface WorkOrderProgress {
  done: number;
  count: number;
  /** Arbeit erledigt (Startanker erreicht). */
  ready: boolean;
  /** Abgebbarer Bestand (Inventar + Lager + ungesperrte Einzelstücke). claude:2026-10-26T02:35:00+02:00 */
  stock: number;
}

export function workOrderProgress(state: GameState, order: WorkOrder): WorkOrderProgress {
  const produced = producedFor(state, order.skill, order.itemId); // claude:2026-10-24T16:03:31+02:00 — nur der Auftrags-Skill (SAVE 95)
  const done = Math.max(0, Math.min(order.count, produced - order.baseline));
  return { done, count: order.count, ready: done >= order.count, stock: stockOf(state, order.itemId) };
}

export type WorkOrderDeliverReason = "ok" | "not_found" | "not_ready" | "no_stock";
export interface WorkOrderDeliverResult {
  reason: WorkOrderDeliverReason;
  gold: number;
  xp: number;
  crateItemId: ItemId | null;
}

function takeFromStock(state: GameState, itemId: ItemId, qty: number): number {
  // claude:2026-10-24T16:03:31+02:00 — gesperrter Stapel wird nie abgegeben (Chef-Entscheid QA-Runde 2 Werkstatt B1); dann nur freie Einzelstücke.
  const stackLocked = state.lockedItems?.[itemId] === true;
  let taken = stackLocked ? 0 : removeItem(state.inventory, itemId, Math.min(qty, itemCount(state.inventory, itemId)));
  const rest = qty - taken;
  if (rest > 0 && !stackLocked) {
    const inBank = state.bank[itemId] ?? 0;
    const take = Math.min(rest, inBank);
    if (take > 0) {
      if (inBank - take > 0) state.bank[itemId] = inBank - take;
      else delete state.bank[itemId];
      taken += take;
    }
  }
  // claude:2026-10-26T01:25:00+02:00 — danach Einzelstücke, die schwächsten zuerst (QA-Aufträge P2-1).
  for (const { inst, inBank } of deliverableInstances(state, itemId)) {
    if (taken >= qty) break;
    if (inBank) {
      const i = state.bankInstances.findIndex((x) => x.instanceId === inst.instanceId);
      if (i >= 0) state.bankInstances.splice(i, 1);
    } else {
      removeInstance(state.inventory, inst.instanceId);
    }
    taken += 1;
  }
  return taken;
}

export function workCrateItemId(band: number): ItemId {
  const b = Math.max(1, Math.min(WORK_CRATE_SUFFIXES.length, Math.floor(band)));
  return `${WORK_CRATE_PREFIX}${WORK_CRATE_SUFFIXES[b - 1]}`;
}

/**
 * Auftrag abgeben (online, ohne Zeitlimit): Arbeit erledigt UND Bestand da. Zieht `count` Stück (Inventar, dann
 * Lager), zahlt Gold (× Goldfund), den XP-Batzen und je nach Stufe eine Werkstattkiste des Bands (`eventRng`).
 */
export function deliverWorkOrder(
  state: GameState,
  content: ContentDB,
  id: number,
  rng: RngState,
): WorkOrderDeliverResult {
  const o = workOrdersOf(state);
  const order = o.open.find((x) => x.id === id);
  const fail = (reason: WorkOrderDeliverReason): WorkOrderDeliverResult => ({ reason, gold: 0, xp: 0, crateItemId: null });
  if (!order) return fail("not_found");
  const p = workOrderProgress(state, order);
  if (!p.ready) return fail("not_ready");
  if (p.stock < order.count) return fail("no_stock");
  takeFromStock(state, order.itemId, order.count);
  const gold = Math.round(order.gold * goldFindMult(state, content));
  state.character.gold += gold;
  const entry = (state.skills[order.skill] ??= { xp: 0 });
  const xp = order.xp * prestigeSkillXpMult(state, content, order.skill, entry.xp);
  entry.xp += xp;
  syncProgression(state, content);
  let crateItemId: ItemId | null = null;
  // claude:2026-10-25T17:05:00+01:00 — Kisten-Chance je Stufe (0 / 10 / 100 %). Der Wurf wird IMMER gezogen, auch bei 0 und 1: so verbraucht jede
  // Abgabe genau einen `eventRng`-Wurf, unabhängig von der Stufe (deterministisch; nextFloat < 1 gilt immer, Stufe 3 zahlt also sicher).
  const crateRoll = nextFloat(rng);
  if (crateRoll < ORDER_TIERS[order.tier ?? ORDER_LEGACY_TIER].crateChance) {
    const crate = workCrateItemId(order.band);
    if (content.items[crate]) {
      grantLoot(state, content, crate, 1);
      crateItemId = crate;
    }
  }
  o.open = o.open.filter((x) => x.id !== id);
  o.delivered += 1;
  return { reason: "ok", gold, xp: Math.round(xp), crateItemId };
}

/** Stufe einer Werkstattkiste (consumable.kind "workCrate"), sonst null. */
export function workCrateTier(content: ContentDB, itemId: ItemId): number | null {
  const c = content.items[itemId]?.consumable;
  if (c?.kind !== "workCrate") return null;
  return Math.max(1, Math.min(TAVERN_BANDS, Math.floor(c.tier ?? 1)));
}

/**
 * Inhalt einer Werkstattkiste (Spec §4.6 A, rein, per Hash wie die Schwarzmarktbehälter): drei Band-Materialien
 * × 3–8, 5 % eine Verzauberungsrune des Band-Tiers. Keine Ausrüstung, keine Unikate, kein Reliktstaub.
 */
export function rollWorkCrateContents(state: GameState, content: ContentDB, tier: number): { id: ItemId; qty: number }[] {
  const band = Math.max(1, Math.min(TAVERN_BANDS, Math.floor(tier)));
  const seed = Math.floor(state.character?.createdAt ?? 0);
  const seq = state.workOrders?.delivered ?? 0;
  const gathered = Math.floor(state.stats?.itemsGathered ?? 0);
  const h = (k: number): number => tavernHashFloat(seed, seq, gathered, band, SALT_WORK_CRATE, k);
  const out: { id: ItemId; qty: number }[] = [];
  const mats = tavernBandMaterials(content, band);
  const chosen: ItemId[] = [];
  for (let k = 0; k < WORK_CRATE_MATERIAL_KINDS && mats.length > chosen.length; k++) {
    const rest = mats.filter((m) => !chosen.includes(m));
    const id = rest[Math.min(rest.length - 1, Math.floor(h(1 + k) * rest.length))]!;
    chosen.push(id);
    const span = CRATE_MATERIAL_QTY_MAX - CRATE_MATERIAL_QTY_MIN + 1;
    out.push({ id, qty: CRATE_MATERIAL_QTY_MIN + Math.min(span - 1, Math.floor(h(5 + k) * span)) });
  }
  if (h(9) < WORK_CRATE_RUNE_CHANCE) {
    const runeTier = CRATE_RUNE_TIER_BY_BAND[band] ?? 1;
    const runes = Object.keys(content.items).filter((id) => content.items[id]?.rune?.tier === runeTier).sort();
    if (runes.length > 0) out.push({ id: runes[Math.min(runes.length - 1, Math.floor(h(10) * runes.length))]!, qty: 1 });
  }
  return out;
}

/** Öffnet eine Werkstattkiste (Inventar zuerst, sonst Lager) und legt den Inhalt über grantLoot ab. */
export function openWorkCrate(state: GameState, content: ContentDB, itemId: ItemId): { itemId: ItemId; tier: number; items: { id: ItemId; qty: number }[] } | null {
  const tier = workCrateTier(content, itemId);
  if (tier === null || stockOf(state, itemId) < 1) return null;
  const items = rollWorkCrateContents(state, content, tier);
  if (items.length === 0) return null;
  if (takeFromStock(state, itemId, 1) < 1) return null;
  for (const { id, qty } of items) {
    grantLoot(state, content, id, qty);
    state.stats.itemsGathered += qty;
  }
  return { itemId, tier, items };
}
