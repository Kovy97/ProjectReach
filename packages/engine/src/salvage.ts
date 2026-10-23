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
  salvageLadder,
} from "@hearthforge/shared";
import { dropSourcesOf } from "./drop-sources";
import { itemTier } from "./tiers";
import { itemCount, removeInstance, removeItem } from "./inventory";
import { grantLoot } from "./mail";
import { sellPrice } from "./shop";

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
