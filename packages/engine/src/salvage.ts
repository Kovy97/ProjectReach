// claude:2026-10-23T22:40:00+02:00 — Bergung (1.4.0 „Feder und Stahl“ BG, Chef 23.10.2026).
//
// Chef: „Bergung soll nur bei gedroppten Items gehen, es geht mir um die Herkunft, dass die Teile nicht vom Crafting
// stammen und man so fast endlos recyclet.“ Herkunftsregel (Goal BG, A13, design/1.4.0-balance-werkstatt.md §1.1):
// zerlegbar ist ein Ausrüstungsteil, wenn es (1) eine Drop-Quelle hat, (2) KEIN Rezept es herstellt, (3) es in keinem
// Shop steht und (4) es kein verliehener Meisterring ist. Ein Guard-Test hält fest, dass kein herstellbares Teil je in
// einer Drop-Quelle steht; damit ist „zerlegbar“ gleichbedeutend mit „stammt aus einem Drop“, ohne Herkunftsfeld je
// Exemplar. Ertrag: Material der Stufe des Gegenstands nach Klasse plus Reliktstaub nach Rarität (§1.2–§1.4), Wert
// 70–90 % des Verkaufspreises. Deterministisch, kein RNG, keine XP, kein Auto-Zerlegen.
import type { ContentDB, GameState, ItemDef, ItemId, ItemRarity, SalvageClass } from "@hearthforge/shared";
import {
  ITEM_RARITIES,
  RELIC_DUST_BY_RARITY,
  RELIC_DUST_ITEM_ID,
  SALVAGE_SHARES,
  SALVAGE_TARGET_RATIO,
  effectiveBankCapacity,
  salvageLadder,
  syncBankOrder,
} from "@hearthforge/shared";
import { dropSourcesOf } from "./drop-sources";
import { itemTier } from "./tiers";
import { itemCount, removeInstance, removeItem } from "./inventory";
import { isStorageItem, storagePredicate } from "./storage"; // claude:2026-10-26T06:55:00+02:00 — Bank-Bergung (Chef BG1)
import { grantLoot } from "./mail";
import { equipmentSellKind, sellPrice } from "./shop";
import type { EquipmentSellFilter } from "./shop"; // claude:2026-10-31T11:16:44+01:00 — Art-Filter der Massen-Bergung

// ── Herkunftsregel ─────────────────────────────────────────────────────────

const craftedCache = new WeakMap<ContentDB, { crafted: Set<ItemId>; shop: Set<ItemId> }>();

function indexes(content: ContentDB): { crafted: Set<ItemId>; shop: Set<ItemId> } {
  let idx = craftedCache.get(content);
  if (idx) return idx;
  const crafted = new Set<ItemId>();
  for (const a of Object.values(content.actions)) {
    if ((a.inputs?.length ?? 0) === 0) continue;
    for (const l of a.loot) crafted.add(l.itemId);
  }
  const shop = new Set<ItemId>();
  for (const e of content.shop ?? []) shop.add(e.itemId);
  for (const e of content.tokenShop ?? []) shop.add(e.itemId);
  for (const e of content.slayerShop ?? []) shop.add(e.itemId);
  idx = { crafted, shop };
  craftedCache.set(content, idx);
  return idx;
}

/** Wird dieses Item von einem Rezept hergestellt (Aktion mit Zutaten)? */
export function isCraftedItem(content: ContentDB, itemId: ItemId): boolean {
  return indexes(content).crafted.has(itemId);
}

/** Herkunftsregel der Bergung (s. Kopf). */
export function isSalvageable(content: ContentDB, itemId: ItemId): boolean {
  const item = content.items[itemId];
  if (!item || item.type !== "equipment") return false;
  if (itemId.startsWith("ring_master_")) return false;
  const { crafted, shop } = indexes(content);
  if (crafted.has(itemId) || shop.has(itemId)) return false;
  return dropSourcesOf(content, itemId).length > 0;
}

// ── Klasse, Stufe, Ertrag ──────────────────────────────────────────────────

/** Bergungs-Klasse eines Teils (Werkstatt-Spec §1.2, Prüfreihenfolge). */
export function salvageClass(item: ItemDef): SalvageClass {
  if (item.slot === "ring1" || item.slot === "amulet") return "jewel";
  if (item.slot === "cape") return "cape";
  if (item.weaponStyle === "melee") return "plate";
  if (item.weaponStyle === "ranged") return "leather";
  if (item.weaponStyle === "magic" || item.weaponType === "focus") return "cloth";
  if (item.slot === "offhand" && ((item.blockChance ?? 0) > 0 || (item.armorRating ?? 0) > 0)) return "plate";
  if ((item.armorRating ?? 0) > 0) return "plate";
  if ((item.evasionRating ?? 0) > 0) return "leather";
  if ((item.wardCapacity ?? 0) > 0) return "cloth";
  return "plate";
}

export interface SalvageYield {
  /** Material-Ertrag (ohne Staub). */
  items: { itemId: ItemId; qty: number }[];
  /** Reliktstaub. */
  dust: number;
  /** Tatsächlich genutzte Stufe (nach eventuellem Abstieg, §1.4). */
  tier: number;
  cls: SalvageClass;
}

function dustFor(rarity: ItemRarity | undefined): number {
  return RELIC_DUST_BY_RARITY[rarity ?? "common"] ?? 0;
}

/**
 * Ertrag eines Teils nach der Rechenregel §1.4 (ganzzahlige Vergleiche, kein Zufall). null = nicht zerlegbar.
 * Gibt immer den Ertrag des Basis-Items zurück; Einzelstücke (Suffix/Runen) zerlegen sich wie ihre Basis.
 */
export function salvageYield(content: ContentDB, itemId: ItemId): SalvageYield | null {
  if (!isSalvageable(content, itemId)) return null;
  const item = content.items[itemId]!;
  const cls = salvageClass(item);
  const S = sellPrice(content, itemId);
  const D = dustFor(item.rarity);
  const T = itemTier(content, itemId) ?? 1;
  const shares = SALVAGE_SHARES[cls];
  for (let t = T; t >= 1; t--) {
    const { mats, fill } = salvageLadder(cls, t);
    const budget = Math.max(0, SALVAGE_TARGET_RATIO * S - D);
    const q = new Map<ItemId, number>();
    let G = D;
    mats.forEach((mat, i) => {
      const unit = sellPrice(content, mat);
      const n = Math.floor((budget * (shares[i] ?? 0)) / unit);
      if (n > 0) {
        q.set(mat, (q.get(mat) ?? 0) + n);
        G += n * unit;
      }
    });
    // Auffüllen bis ins Band (10·G ≥ 7·S), nie über 90 % (10·(G+u) ≤ 9·S).
    const candidates = [...new Set([...mats, ...fill])];
    let guard = 0;
    while (10 * G < 7 * S && guard++ < 10_000) {
      const ok = candidates.filter((u) => 10 * (G + sellPrice(content, u)) <= 9 * S);
      if (ok.length === 0) break;
      const below = ok.filter((u) => G + sellPrice(content, u) <= SALVAGE_TARGET_RATIO * S);
      const pick = below.length > 0
        ? below.reduce((a, b) => (sellPrice(content, b) > sellPrice(content, a) ? b : a))
        : ok.reduce((a, b) => (sellPrice(content, b) < sellPrice(content, a) ? b : a));
      q.set(pick, (q.get(pick) ?? 0) + 1);
      G += sellPrice(content, pick);
    }
    if (7 * S <= 10 * G && 10 * G <= 9 * S) {
      return { items: [...q].map(([id, qty]) => ({ itemId: id, qty })), dust: D, tier: t, cls };
    }
  }
  return { items: [], dust: D, tier: T, cls };
}

// ── Sperren (Schloss) ──────────────────────────────────────────────────────

/** Ist dieses Item (Item-ID) oder Einzelstück (Instanz-ID) gegen Zerlegen gesperrt? */
export function isSalvageLocked(state: GameState, id: string): boolean {
  return state.lockedItems?.[id] === true;
}

/** Schloss umschalten (Item-ID für Stapel, Instanz-ID für Einzelstücke). */
export function toggleSalvageLock(state: GameState, id: string): boolean {
  const locks = (state.lockedItems ??= {});
  if (locks[id]) delete locks[id];
  else locks[id] = true;
  return locks[id] === true;
}

// ── Zerlegen ───────────────────────────────────────────────────────────────

function payOut(state: GameState, content: ContentDB, y: SalvageYield, times: number): void {
  for (const it of y.items) grantLoot(state, content, it.itemId, it.qty * times);
  if (y.dust > 0) grantLoot(state, content, RELIC_DUST_ITEM_ID, y.dust * times);
}

/**
 * Zerlegt `qty` Stück eines gestapelten (unverzauberten) Teils aus dem Inventar. Gesperrte oder nicht zerlegbare
 * Items: 0. Gibt die zerlegte Stückzahl zurück.
 */
export function salvageItem(state: GameState, content: ContentDB, itemId: ItemId, qty = 1): number {
  if (typeof qty !== "number" || !Number.isFinite(qty) || qty <= 0) return 0; // claude:2026-10-24T15:21:04+02:00 — derselbe Finite-Guard wie salvageBankItem (QA-Runde 2 Werkstatt B3)
  if (isSalvageLocked(state, itemId)) return 0;
  const y = salvageYield(content, itemId);
  if (!y) return 0;
  const n = Math.min(Math.max(0, Math.floor(qty)), itemCount(state.inventory, itemId));
  if (n <= 0) return 0;
  const removed = removeItem(state.inventory, itemId, n);
  if (removed <= 0) return 0;
  payOut(state, content, y, removed);
  return removed;
}

/** Zerlegt ein Einzelstück (Suffix/Runen) aus der Inventar-Tasche; Runen gehen verloren (UI warnt vorher). */
export function salvageInstance(state: GameState, content: ContentDB, instanceId: string): boolean {
  if (isSalvageLocked(state, instanceId)) return false;
  const inst = state.inventory.instances.find((i) => i.instanceId === instanceId);
  if (!inst || isSalvageLocked(state, inst.baseItemId)) return false;
  const y = salvageYield(content, inst.baseItemId);
  if (!y) return false;
  if (!removeInstance(state.inventory, instanceId)) return false;
  payOut(state, content, y, 1);
  return true;
}

/**
 * claude:2026-10-26T06:55:00+02:00 — Zerlegen direkt in der Bank (Chef-Entscheid BG1, Spec „Zerlegen in Inventar und Bank“).
 * Gleiche Regeln wie im Inventar: nur zerlegbare Beute, Schloss auf Item bzw. Basis. Das geleerte Fach bleibt leer stehen
 * (OSRS-Verhalten wie beim Abheben). Gibt die zerlegte Stückzahl zurück.
 */
export function salvageBankItem(state: GameState, content: ContentDB, itemId: ItemId, qty = 1): number {
  // claude:2026-10-24T15:21:04+02:00 — Finite-Guard wie depositItem (QA-Runde 2 Werkstatt B3): NaN fiel durch beide Vergleiche und schrieb
  // `bank[item] = have − NaN`. Nicht-endlich oder ≤ 0 ⇒ nichts zerlegen.
  if (typeof qty !== "number" || !Number.isFinite(qty) || qty <= 0) return 0;
  if (isSalvageLocked(state, itemId)) return 0;
  const y = salvageYield(content, itemId);
  if (!y) return 0;
  const have = state.bank[itemId] ?? 0;
  const n = Math.min(Math.max(0, Math.floor(qty)), have);
  if (n <= 0) return 0;
  if (n >= have) delete state.bank[itemId];
  else state.bank[itemId] = have - n;
  syncBankOrder(state, effectiveBankCapacity(state, content), storagePredicate(content));
  payOut(state, content, y, n);
  return n;
}

/** Zerlegt ein Einzelstück aus dem Gear-Vault der Bank (`bankInstances`); Runen gehen verloren (UI warnt vorher). */
export function salvageBankInstance(state: GameState, content: ContentDB, instanceId: string): boolean {
  if (isSalvageLocked(state, instanceId)) return false;
  const idx = state.bankInstances.findIndex((i) => i.instanceId === instanceId);
  const inst = idx >= 0 ? state.bankInstances[idx] : undefined;
  if (!inst || isSalvageLocked(state, inst.baseItemId)) return false;
  const y = salvageYield(content, inst.baseItemId);
  if (!y) return false;
  state.bankInstances.splice(idx, 1);
  syncBankOrder(state, undefined, storagePredicate(content));
  payOut(state, content, y, 1);
  return true;
}

/** Rang einer Rarität (für den Sammel-Knopf „alle Beute bis Rarität X“). */
function rarityRank(r: ItemRarity | undefined): number {
  return ITEM_RARITIES.indexOf(r ?? "common");
}

export interface SalvagePlanEntry {
  itemId: ItemId;
  /** Instanz-ID bei Einzelstücken, sonst null (ganzer Stapel). */
  instanceId: string | null;
  qty: number;
}

/**
 * Vorschau des Sammel-Knopfs: alle zerlegbaren, nicht gesperrten Teile im Inventar bis einschließlich `maxRarity`.
 * Einzelstücke mit Runen sind ausgenommen (Runen gingen verloren; das soll eine bewusste Einzel-Entscheidung sein).
 */
export function salvagePlan(state: GameState, content: ContentDB, maxRarity: ItemRarity): SalvagePlanEntry[] {
  const max = rarityRank(maxRarity);
  const out: SalvagePlanEntry[] = [];
  const seen = new Set<ItemId>();
  for (const slot of state.inventory.slots) {
    if (!slot || slot.instance || seen.has(slot.itemId)) continue;
    seen.add(slot.itemId);
    const item = content.items[slot.itemId];
    if (!item || rarityRank(item.rarity) > max || isSalvageLocked(state, slot.itemId)) continue;
    if (!isSalvageable(content, slot.itemId)) continue;
    out.push({ itemId: slot.itemId, instanceId: null, qty: itemCount(state.inventory, slot.itemId) });
  }
  for (const inst of state.inventory.instances) {
    const item = content.items[inst.baseItemId];
    if (!item || rarityRank(item.rarity) > max) continue;
    if (inst.affixes.length > 0) continue;
    if (isSalvageLocked(state, inst.instanceId) || isSalvageLocked(state, inst.baseItemId)) continue;
    if (!isSalvageable(content, inst.baseItemId)) continue;
    out.push({ itemId: inst.baseItemId, instanceId: inst.instanceId, qty: 1 });
  }
  return out;
}

/** Führt einen Sammel-Plan aus (`salvagePlan`). Gibt die Zahl zerlegter Stücke zurück. */
export function salvageBatch(state: GameState, content: ContentDB, maxRarity: ItemRarity): number {
  let n = 0;
  for (const e of salvagePlan(state, content, maxRarity)) {
    if (e.instanceId) n += salvageInstance(state, content, e.instanceId) ? 1 : 0;
    else n += salvageItem(state, content, e.itemId, e.qty);
  }
  return n;
}

// ── Massen-Bergung (Diablo-3-Stil, Chef 31.10.2026) ────────────────────────
// claude:2026-10-31T11:16:44+01:00 — Kandidaten, Raritäts-Plan, Vorschau und Sammel-Ausführung über Inventar UND Bank.
// Keine neue Spielregel: alles läuft über die vier bestehenden Verben (salvageItem/Instance, salvageBankItem/Instance).
// Deterministisch, kein RNG, kein Save-Feld.

export type SalvageSource = "inventory" | "bank";

export interface SalvageCandidate {
  source: SalvageSource;
  itemId: ItemId;
  /** Instanz-ID bei Einzelstücken, sonst null (ganzer Stapel). */
  instanceId: string | null;
  qty: number;
  rarity: ItemRarity;
  /** Einzelstück mit Verzauberung (Runen gehen beim Zerlegen verloren). */
  hasRunes: boolean;
  /** claude:2026-10-31T13:58:31+01:00 — Befund A3: Einzelstück mit Suffix (Zufallswurf geht beim Zerlegen verloren). */
  hasSuffix: boolean;
  /** Gesperrt (Schloss auf Item, Basis oder Instanz). */
  locked: boolean;
}

export interface SalvagePick {
  source: SalvageSource;
  itemId: ItemId;
  instanceId: string | null;
  qty: number;
}

export interface SalvageSummary {
  /** Zerlegte (bzw. in der Vorschau: zu zerlegende) Stückzahl. */
  pieces: number;
  items: { itemId: ItemId; qty: number }[];
  dust: number;
}

export interface SalvageOutcome extends SalvageSummary {
  /** Einheiten des Ertrags, die direkt ins Materiallager gingen (Einstellung „Material ins Lager“, kein Überlauf). */
  toStorage: number;
  /** Einheiten des Ertrags, die wegen vollem Inventar in der Bank gelandet sind. */
  toBank: number;
  /** Einheiten des Ertrags, die als Überlauf-Post gelandet sind. */
  toMail: number;
}

/** Alle zerlegbaren Einträge in Inventar oder Bank (gesperrte und verzauberte sind markiert, nicht ausgefiltert). */
export function salvageCandidates(state: GameState, content: ContentDB, source: SalvageSource): SalvageCandidate[] {
  const out: SalvageCandidate[] = [];
  const rarityOf = (id: ItemId): ItemRarity => content.items[id]?.rarity ?? "common";
  if (source === "inventory") {
    const seen = new Set<ItemId>();
    for (const slot of state.inventory.slots) {
      if (!slot || slot.instance || seen.has(slot.itemId)) continue;
      seen.add(slot.itemId);
      if (!isSalvageable(content, slot.itemId)) continue;
      const qty = itemCount(state.inventory, slot.itemId);
      if (qty <= 0) continue;
      out.push({ source, itemId: slot.itemId, instanceId: null, qty, rarity: rarityOf(slot.itemId), hasRunes: false, hasSuffix: false, locked: isSalvageLocked(state, slot.itemId) });
    }
    for (const inst of state.inventory.instances) {
      if (!isSalvageable(content, inst.baseItemId)) continue;
      out.push({
        source, itemId: inst.baseItemId, instanceId: inst.instanceId, qty: 1, rarity: rarityOf(inst.baseItemId),
        hasRunes: inst.affixes.length > 0,
        hasSuffix: !!inst.suffix, // claude:2026-10-31T13:58:31+01:00 — A3
        locked: isSalvageLocked(state, inst.instanceId) || isSalvageLocked(state, inst.baseItemId),
      });
    }
    return out;
  }
  const ordered: ItemId[] = [];
  const seenBank = new Set<ItemId>();
  for (const id of state.bankOrder ?? []) if (id && !seenBank.has(id) && (state.bank[id] ?? 0) > 0) { seenBank.add(id); ordered.push(id); }
  for (const id of Object.keys(state.bank)) if (!seenBank.has(id) && (state.bank[id] ?? 0) > 0) { seenBank.add(id); ordered.push(id); }
  for (const id of ordered) {
    if (!isSalvageable(content, id)) continue;
    out.push({ source, itemId: id, instanceId: null, qty: state.bank[id]!, rarity: rarityOf(id), hasRunes: false, hasSuffix: false, locked: isSalvageLocked(state, id) });
  }
  for (const inst of state.bankInstances) {
    if (!isSalvageable(content, inst.baseItemId)) continue;
    out.push({
      source, itemId: inst.baseItemId, instanceId: inst.instanceId, qty: 1, rarity: rarityOf(inst.baseItemId),
      hasRunes: inst.affixes.length > 0,
      hasSuffix: !!inst.suffix, // claude:2026-10-31T13:58:31+01:00 — A3
      locked: isSalvageLocked(state, inst.instanceId) || isSalvageLocked(state, inst.baseItemId),
    });
  }
  return out;
}

/**
 * Ergebnis des Raritäts-Knopfs: exakte Rarität, ohne Gesperrte und Verzauberte (und, mit `keepSuffix`, ohne Suffix-Teile);
 * `protectedCount` zählt, was dabei liegen bleibt.
 */
export interface SalvageRarityPlan {
  picks: SalvagePick[];
  pieces: number;
  protectedCount: number;
}

export function salvageRarityPlan(
  state: GameState,
  content: ContentDB,
  // claude:2026-10-31T13:58:31+01:00 — Befund A3 (Chef-GO): `keepSuffix` (Standard true) lässt Teile mit Suffix liegen, Schalter „Teile mit Suffix behalten“.
  opts: { sources: SalvageSource[]; rarity: ItemRarity; kind?: EquipmentSellFilter; keepSuffix?: boolean },
): SalvageRarityPlan {
  const picks: SalvagePick[] = [];
  let pieces = 0;
  let protectedCount = 0;
  const kind = opts.kind ?? "all";
  const keepSuffix = opts.keepSuffix !== false; // claude:2026-10-31T13:58:31+01:00 — A3
  for (const source of opts.sources) {
    for (const c of salvageCandidates(state, content, source)) {
      if (c.rarity !== opts.rarity) continue;
      if (kind !== "all" && equipmentSellKind(content.items[c.itemId]) !== kind) continue;
      if (c.locked || c.hasRunes || (keepSuffix && c.hasSuffix)) { protectedCount += c.qty; continue; } // claude:2026-10-31T13:58:31+01:00 — A3: Suffix wie Runen
      picks.push({ source, itemId: c.itemId, instanceId: c.instanceId, qty: c.qty });
      pieces += c.qty;
    }
  }
  return { picks, pieces, protectedCount };
}

function addYield(items: Map<ItemId, number>, y: SalvageYield, times: number): number {
  for (const it of y.items) items.set(it.itemId, (items.get(it.itemId) ?? 0) + it.qty * times);
  return y.dust * times;
}

function toSummary(pieces: number, items: Map<ItemId, number>, dust: number): SalvageSummary {
  return { pieces, items: [...items].filter(([, q]) => q > 0).map(([itemId, qty]) => ({ itemId, qty })), dust };
}

/** Aggregierte Vorschau (Stück, Material, Reliktstaub) für eine Auswahl. Nicht zerlegbare Picks zählen nicht. */
export function salvagePreview(content: ContentDB, picks: SalvagePick[]): SalvageSummary {
  const items = new Map<ItemId, number>();
  let dust = 0;
  let pieces = 0;
  for (const p of picks) {
    const n = Math.floor(p.qty);
    const y = Number.isFinite(n) && n > 0 ? salvageYield(content, p.itemId) : null;
    if (!y) continue;
    pieces += n;
    dust += addYield(items, y, n);
  }
  return toSummary(pieces, items, dust);
}

function lootHeld(state: GameState, itemId: ItemId): { bank: number; mail: number } {
  let mail = 0;
  for (const m of state.mailbox ?? []) for (const a of m.items) if (a.itemId === itemId) mail += a.qty;
  return { bank: state.bank[itemId] ?? 0, mail };
}

/**
 * Führt eine Auswahl über die vier Verben aus. Jeder Pick wird erst beim Ausführen geprüft (Menge geklemmt, Schloss,
 * Bestand). Gibt zurück, was wirklich herauskam, und wie viel davon wegen vollem Inventar in Bank oder Post gelandet ist.
 */
export function salvagePicks(state: GameState, content: ContentDB, picks: SalvagePick[]): SalvageOutcome {
  const outputIds = new Set<ItemId>([RELIC_DUST_ITEM_ID]);
  for (const p of picks) for (const it of salvageYield(content, p.itemId)?.items ?? []) outputIds.add(it.itemId);
  const before = new Map<ItemId, { bank: number; mail: number }>();
  for (const id of outputIds) before.set(id, lootHeld(state, id));

  const items = new Map<ItemId, number>();
  let dust = 0;
  let pieces = 0;
  for (const p of picks) {
    let n: number;
    if (p.instanceId) {
      const ok = p.source === "bank" ? salvageBankInstance(state, content, p.instanceId) : salvageInstance(state, content, p.instanceId);
      n = ok ? 1 : 0;
    } else if (p.source === "bank") n = salvageBankItem(state, content, p.itemId, p.qty);
    else n = salvageItem(state, content, p.itemId, p.qty);
    const y = n > 0 ? salvageYield(content, p.itemId) : null;
    if (!y) continue;
    pieces += n;
    dust += addYield(items, y, n);
  }
  // Ausrüstung ist nie ihr eigenes Ertragsmaterial, daher zeigt der Zuwachs in Bank bzw. Post nur den Überlauf.
  let toStorage = 0;
  let toBank = 0;
  let toMail = 0;
  const storageOn = state.settings?.materialsToStorage !== false;
  for (const id of outputIds) {
    const a = before.get(id)!;
    const b = lootHeld(state, id);
    const dBank = Math.max(0, b.bank - a.bank);
    if (storageOn && isStorageItem(content, id)) toStorage += dBank;
    else toBank += dBank;
    toMail += Math.max(0, b.mail - a.mail);
  }
  return { ...toSummary(pieces, items, dust), toStorage, toBank, toMail };
}
