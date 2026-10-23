import type { ActionDef, ContentDB, GameState, ItemId, ItemInstance, RngState, SkillId, WorkOrder, WorkOrderKind, WorkOrderState } from "@hearthforge/shared";
import {
  defaultWorkOrderState,
  EVENT_CRAFT_SKILLS,
  ORDER_CRATE_CHANCE,
  ORDER_GATHER_SKILLS,
  ORDER_GOLD_KIND_FACTOR,
  ORDER_GOLD_SELL_FACTOR,
  ORDER_INPUT_REACH_DEPTH,
  ORDER_MAX_OPEN,
  ORDER_MINUTES,
  ORDER_OFFER_TTL_MS,
  ORDER_TIER_FLOOR_BELOW,
  ORDER_TOP_TIER_WEIGHT,
  ORDER_XP_MINUTE_FACTOR,
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
 * design/1.4.0-balance-werkstatt.md §4). Quelle ist das Ereignis „Kundschaft“ beim Arbeiten (events.ts).
 *
 * Wiederverwendet die Auftragslogik der Taverne (Haupt-Output, erwartete Menge, Gold-Bänder, Band-Materialien,
 * Hash-Kisten) ohne die Taverne selbst (`TAVERN_ENABLED` bleibt aus). Abweichungen laut Spec:
 * - Menge und XP rechnen mit der EFFEKTIVEN Dauer (Werkzeug, Lager, Tempo), sonst wären Aufträge mit
 *   Spitzenwerkzeug nur halb so lang (§4.2/§4.5).
 * - Fortschritt immer mit Startanker `stats.producedById − baseline`, auch beim Liefern. Nie der Bestand,
 *   sonst erfüllte eine volle Bank jeden Lieferauftrag ohne Arbeit (§4.3).
 * - Kein Vorgriff: nur Aktionen mit `levelRequired ≤ Level`; Herstellaufträge nur, wenn die Zutaten erreichbar sind.
 * - Lohn: Gold über dem Verkaufswert, XP-Batzen, 10 % Werkstattkiste (ohne Ausrüstung). Würfe aus `eventRng`.
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
  for (const inst of state.inventory.instances ?? []) if (inst.baseItemId === itemId && !locked[inst.instanceId]) out.push({ inst, inBank: false });
  for (const inst of state.bankInstances ?? []) if (inst.baseItemId === itemId && !locked[inst.instanceId]) out.push({ inst, inBank: true });
  // Die schwächsten zuerst: ohne Runen/Suffix, dann nach Suffix-Wurf.
  const score = (i: ItemInstance): number => i.affixes.length * 10 + (i.suffix ? 1 + (i.suffix.roll ?? 0) : 0);
  return out.sort((a, b) => score(a.inst) - score(b.inst));
}

function stockOf(state: GameState, itemId: ItemId): number {
  return itemCount(state.inventory, itemId) + (state.bank[itemId] ?? 0) + deliverableInstances(state, itemId).length;
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
 * Würfelt ein Auftragsangebot für die Aktion, die das Ereignis „Kundschaft“ ausgelöst hat. Das Angebot gehört
 * zu deren Skill. null = kein machbarer Auftrag (dann zählt der Wurf als gewöhnliches Ereignis).
 * `durOf` = effektive Dauer einer Aktion (tick.ts `effectiveActionDurationMs`, als Rückruf gegen einen Importzyklus).
 */
export function makeWorkOrderOffer(
  state: GameState,
  content: ContentDB,
  action: ActionDef,
  rng: RngState,
  durOf: (a: ActionDef) => number = (a) => a.durationMs,
): WorkOrder | null {
  const kind = workOrderKindFor(action.skill);
  if (!kind || workOrdersFull(state)) return null;
  const minutes = ORDER_MINUTES[Math.min(ORDER_MINUTES.length - 1, Math.floor(nextFloat(rng) * ORDER_MINUTES.length))]!;
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
  const gold = Math.round(
    ORDER_GOLD_SELL_FACTOR * pick.count * sellPrice(content, pick.c.itemId) + (TAVERN_GOLD_BY_BAND[band] ?? 0) * ORDER_GOLD_KIND_FACTOR[kind],
  );
  const xp = Math.round(minutes * ORDER_XP_MINUTE_FACTOR * bestEffectiveXpPerMinute(state, content, action.skill, durOf));
  const customers = workOrderCustomers(content, action.skill);
  const customerId = customers.length > 0 ? customers[Math.min(customers.length - 1, Math.floor(nextFloat(rng) * customers.length))]! : ORDER_GUILD_CUSTOMER_ID;
  const o = workOrdersOf(state);
  o.seq += 1;
  const order: WorkOrder = {
    id: o.seq,
    kind,
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
  o.offerMsLeft = ORDER_OFFER_TTL_MS;
  return order;
}

/** Online-Uhr: das unbeantwortete Angebot verfällt nach ORDER_OFFER_TTL_MS. */
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
  const produced = state.stats.producedById?.[offer.itemId] ?? 0;
  const pending = o.open
    .filter((x) => x.itemId === offer.itemId)
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
  const produced = state.stats.producedById?.[order.itemId] ?? 0;
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
  let taken = removeItem(state.inventory, itemId, Math.min(qty, itemCount(state.inventory, itemId)));
  const rest = qty - taken;
  if (rest > 0) {
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
 * Lager), zahlt Gold (× Goldfund), den XP-Batzen und mit 10 % eine Werkstattkiste des Bands (`eventRng`).
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
  if (nextFloat(rng) < ORDER_CRATE_CHANCE) {
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
