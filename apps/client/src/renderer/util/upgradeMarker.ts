import { content } from "@hearthforge/content";
import { meetsRequirements } from "@hearthforge/engine";
import type { GameState, ItemDef, ItemInstance } from "@hearthforge/shared";
import { weaponRangeStats } from "./itemCompare";

/**
 * claude:2026-10-31T16:34:28+01:00 — Aufwertungs-Marker ▲ (1.4.2). Kennzeichnet Ausrüstung in Inventar und Bank, deren
 * KERNWERT über dem angelegten Teil desselben Platzes liegt und die der Held schon tragen darf.
 *
 * Kernwert je Rüstungs-Trinität: Platte = Rüstung, Leder = Ausweichen, Stoff = Ward (jeweils das Feld, das das Teil
 * dominiert); Waffen = DPS (Spanne x Tempo) im selben Kampfstil. Verglichen wird nur Gleiches mit Gleichem: ein
 * Stoffhut gegen eine Plattenhaube oder ein Stab gegen ein Schwert bekommt nie einen Marker. Leere Plätze, Schmuck und
 * Teile ohne Kernwert bleiben ohne Marker (dort entscheidet der Spieler selbst).
 */
export type CoreKind = "armor" | "evasion" | "ward" | "dps";
export interface CoreValue {
  kind: CoreKind;
  /** Waffen: Kampfstil, damit Schwert und Stab nie verglichen werden. */
  style?: string;
  value: number;
}

// Plain-Items ändern ihren Kernwert nie: einmal je Item-ID berechnen, nicht je Zelle und Frame.
const plainCache = new Map<string, CoreValue | null>();

function computeCore(item: ItemDef, inst: ItemInstance | undefined): CoreValue | null {
  if (item.type !== "equipment") return null;
  const range = weaponRangeStats(item, inst);
  if (range) return { kind: "dps", style: item.weaponStyle ?? "melee", value: range.dps };
  const armor = item.armorRating ?? 0;
  const evasion = item.evasionRating ?? 0;
  const ward = item.wardCapacity ?? 0;
  const top = Math.max(armor, evasion, ward);
  if (top <= 0) return null;
  if (top === armor) return { kind: "armor", value: armor };
  if (top === evasion) return { kind: "evasion", value: evasion };
  return { kind: "ward", value: ward };
}

export function coreValueOf(itemId: string, inst?: ItemInstance): CoreValue | null {
  const item = content.items[itemId];
  if (!item) return null;
  if (inst) return computeCore(item, inst);
  if (plainCache.has(itemId)) return plainCache.get(itemId)!;
  const core = computeCore(item, undefined);
  plainCache.set(itemId, core);
  return core;
}

/** True, wenn das Teil (mit optionaler Instanz) den angelegten Kernwert seines Platzes übertrifft und anlegbar ist. */
export function isUpgradeOverEquipped(state: GameState, itemId: string, inst?: ItemInstance): boolean {
  const item = content.items[itemId];
  if (!item || item.type !== "equipment" || !item.slot) return false;
  const slot = item.slot;
  if (slot === "ring1" || slot === "ring2") return false;
  const eqId = state.character.equipment[slot];
  if (!eqId || eqId === undefined) return false;
  const eqInst = state.character.equippedInstances?.[slot];
  const mine = coreValueOf(itemId, inst);
  if (!mine) return false;
  const worn = coreValueOf(eqId, eqInst);
  if (!worn || worn.kind !== mine.kind || worn.style !== mine.style) return false;
  if (mine.value <= worn.value + 1e-6) return false;
  return meetsRequirements(state, item);
}
