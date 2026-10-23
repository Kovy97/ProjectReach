import type { ArrowDef, ContentDB, GameState, ItemDef, ItemId, RngState } from "@hearthforge/shared";
import { AMMO_SAVER_CAP, ARROW_TIER_RANGED_LEVEL, effectiveWeaponEffects } from "@hearthforge/shared";
import { itemCount, removeItem } from "./inventory";
import { levelFromXp } from "./leveling";
import { nextFloat } from "./rng";

/**
 * claude:2026-10-24T18:10:00+02:00 — Köcher und Pfeile (1.4.0 „Feder und Stahl“ FK, Chef 23.10.2026;
 * Zahlen design/1.4.0-balance-fernkampf.md §3/§5).
 *
 * - Der Köcher ist die einzige Nebenhand für Bögen. Andere Haupthände legen ihn ab (equipment.ts).
 * - `character.quiver` ist der geladene Pfeilstapel. Einfache Pfeile sind kein Item: Ohne Ladung (oder bei
 *   Menge 0) schießt der Bogen mit seiner Spanne weiter, nie Stillstand, auch offline.
 * - Jeder Schuss verbraucht einen Pfeil (auch ein Fehlschuss). `ammoSaver` aus Haupthand + Köcher spart mit
 *   Chance (Summe, Deckel AMMO_SAVER_CAP); ein RNG-Zug je Schuss nur bei geladenem Pfeil und Summe > 0.
 * - Leer + „Automatisch nachfüllen“ (Standard an): dieselbe Pfeilart kommt aus dem Lager nach. Die Ladung
 *   behält dafür ihre Art mit Menge 0.
 * - Pfeile sind Lagerware (Regal „Pfeile“): Bestand in `state.bank` ohne Bankfach.
 */

const BOW_TYPES: ReadonlySet<string> = new Set(["shortbow", "longbow"]);

export function isQuiverItem(item: ItemDef | null | undefined): boolean {
  return !!item && item.type === "equipment" && item.weaponType === "quiver";
}

export function isBowItem(item: ItemDef | null | undefined): boolean {
  return !!item && !!item.weaponType && BOW_TYPES.has(item.weaponType);
}

/** Pfeil-Daten eines Items (nur echte Pfeile). */
export function arrowDefOf(content: ContentDB, itemId: ItemId | null | undefined): ArrowDef | undefined {
  return itemId ? content.items[itemId]?.arrow : undefined;
}

/** Fernkampf-Level, ab dem ein Pfeil eingelegt werden darf. */
export function arrowRequiredLevel(arrow: ArrowDef): number {
  return ARROW_TIER_RANGED_LEVEL[Math.max(0, Math.min(ARROW_TIER_RANGED_LEVEL.length - 1, arrow.tier - 1))] ?? 1;
}

/** Trägt der Charakter einen Köcher in der Nebenhand? */
export function quiverEquipped(state: GameState, content: ContentDB): boolean {
  return isQuiverItem(content.items[state.character.equipment.offhand ?? ""]);
}

/** Schießt der Charakter gerade mit Bogen und Köcher (Voraussetzung für echte Pfeile)? */
export function bowAndQuiver(state: GameState, content: ContentDB): boolean {
  return isBowItem(content.items[state.character.equipment.mainhand ?? ""]) && quiverEquipped(state, content);
}

/**
 * Der Pfeil, der beim nächsten Schuss wirkt: geladen, Menge > 0, Bogen + Köcher angelegt. Sonst undefined
 * (einfache Pfeile). Einzige Quelle für computeStats (Bonus) und combat.ts (Effekt, Verbrauch).
 */
export function activeArrow(state: GameState, content: ContentDB): { itemId: ItemId; def: ArrowDef } | undefined {
  const load = state.character.quiver;
  if (!load || load.qty <= 0) return undefined;
  const def = arrowDefOf(content, load.itemId);
  if (!def || !bowAndQuiver(state, content)) return undefined;
  return { itemId: load.itemId, def };
}

/** Verfügbarer Vorrat einer Pfeilart außerhalb des Köchers (Lager + Inventar). */
export function arrowStock(state: GameState, itemId: ItemId): number {
  return (state.bank[itemId] ?? 0) + itemCount(state.inventory, itemId);
}

export type LoadQuiverResult = { ok: true; qty: number } | { ok: false; reason: "noQuiver" | "notArrow" | "level" | "none" };

/**
 * „Pfeile einlegen“: legt `qty` (Standard: alles) einer Pfeilart aus Lager und Inventar in den Köcher. Eine
 * andere geladene Art geht vorher zurück ins Lager. Prüft das Fernkampf-Level der Pfeilstufe.
 */
export function loadQuiver(state: GameState, content: ContentDB, itemId: ItemId, qty?: number): LoadQuiverResult {
  if (!quiverEquipped(state, content)) return { ok: false, reason: "noQuiver" };
  const def = arrowDefOf(content, itemId);
  if (!def) return { ok: false, reason: "notArrow" };
  if (levelFromXp(state.skills.ranged?.xp ?? 0) < arrowRequiredLevel(def)) return { ok: false, reason: "level" };
  const cur = state.character.quiver;
  if (cur && cur.itemId !== itemId) unloadQuiver(state);
  const want = Math.max(0, Math.floor(qty ?? Number.POSITIVE_INFINITY));
  const fromBank = Math.min(state.bank[itemId] ?? 0, want);
  if (fromBank > 0) {
    const rest = (state.bank[itemId] ?? 0) - fromBank;
    if (rest > 0) state.bank[itemId] = rest;
    else delete state.bank[itemId];
  }
  const fromInv = want - fromBank > 0 ? removeItem(state.inventory, itemId, Math.min(want - fromBank, itemCount(state.inventory, itemId))) : 0;
  const moved = fromBank + fromInv;
  const before = state.character.quiver?.itemId === itemId ? state.character.quiver.qty : 0;
  if (moved <= 0 && before <= 0) return { ok: false, reason: "none" };
  state.character.quiver = { itemId, qty: before + moved };
  return { ok: true, qty: moved };
}

/** „Pfeile herausnehmen“: der ganze Stapel geht zurück ins Lager, der Köcher ist leer (einfache Pfeile). */
export function unloadQuiver(state: GameState): number {
  const load = state.character.quiver;
  state.character.quiver = null;
  if (!load || load.qty <= 0) return 0;
  state.bank[load.itemId] = (state.bank[load.itemId] ?? 0) + load.qty;
  return load.qty;
}

/**
 * Hält die Ladung an der Ausrüstung: ohne Köcher in der Nebenhand gehen die Pfeile ins Lager zurück. Nach
 * jedem Ausrüsten, Ablegen und Kit-Wechsel aufrufen (equipment.ts, loadouts.ts) und beim Laden (persistence).
 */
export function syncQuiverLoad(state: GameState, content: ContentDB): void {
  if (state.character.quiver && !quiverEquipped(state, content)) unloadQuiver(state);
}

/** Summe der Pfeil-Sparchance aus Haupthand und Köcher (Deckel AMMO_SAVER_CAP). */
export function ammoSaverChance(state: GameState, content: ContentDB): number {
  let sum = 0;
  for (const slot of ["mainhand", "offhand"] as const) {
    const item = content.items[state.character.equipment[slot] ?? ""];
    for (const fx of effectiveWeaponEffects(item)) if (fx.type === "ammoSaver") sum += Math.max(0, fx.magnitude);
  }
  return Math.min(AMMO_SAVER_CAP, sum);
}

/**
 * Ein Schuss: verbraucht einen Pfeil (außer die Sparchance greift). Ist der Stapel danach leer, füllt die
 * Option „Automatisch nachfüllen“ dieselbe Art aus dem Lager nach. Kein Pfeil geladen ⇒ nichts passiert,
 * kein RNG-Zug (einfache Pfeile). Gibt die verbrauchte Pfeil-ID zurück (für Statistik/Log), sonst null.
 */
export function consumeArrow(state: GameState, content: ContentDB, rng: RngState): ItemId | null {
  const arrow = activeArrow(state, content);
  if (!arrow) return null;
  const load = state.character.quiver!;
  const save = ammoSaverChance(state, content);
  if (save > 0 && nextFloat(rng) < save) return null;
  load.qty -= 1;
  if (load.qty <= 0) refillQuiver(state, content);
  return arrow.itemId;
}

/** Leeren Köcher aus dem Lager nachfüllen (nur mit Option an); bleibt sonst als „leer, Art gemerkt“ stehen. */
export function refillQuiver(state: GameState, content: ContentDB): boolean {
  const load = state.character.quiver;
  if (!load || load.qty > 0) return false;
  if (state.settings.quiverAutoRefill === false) return false;
  const stock = state.bank[load.itemId] ?? 0;
  if (stock <= 0) return false;
  delete state.bank[load.itemId];
  load.qty = stock;
  void content;
  return true;
}

/**
 * claude:2026-10-24T19:25:00+02:00 — Auswahl „Pfeile einlegen“ (Client): jede Pfeilart mit Vorrat außerhalb des
 * Köchers oder der gerade geladenen, höchste Stufe zuerst. `usable` = Fernkampf-Level reicht.
 */
export function arrowChoices(
  state: GameState,
  content: ContentDB,
): { itemId: ItemId; def: ArrowDef; stock: number; usable: boolean; requiredLevel: number }[] {
  const ranged = levelFromXp(state.skills.ranged?.xp ?? 0);
  const loaded = state.character.quiver?.itemId;
  const out: { itemId: ItemId; def: ArrowDef; stock: number; usable: boolean; requiredLevel: number }[] = [];
  for (const item of Object.values(content.items)) {
    if (!item.arrow) continue;
    const stock = arrowStock(state, item.id);
    if (stock <= 0 && item.id !== loaded) continue;
    const requiredLevel = arrowRequiredLevel(item.arrow);
    out.push({ itemId: item.id, def: item.arrow, stock, usable: ranged >= requiredLevel, requiredLevel });
  }
  return out.sort((a, b) => b.def.tier - a.def.tier || a.itemId.localeCompare(b.itemId));
}
