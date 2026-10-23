// claude:2026-10-23T18:00:00+02:00 — Stufen-Anzeige (1.4.0 „Feder und Stahl“ ST, Chef 23.10.2026).
//
// Jedes Ausrüstungsteil bekommt eine Stufe I–XII aus seiner Trage-Anforderung, mit denselben Bändern wie die
// Metallleiter (Kupfer 1, Bronze 5, Eisen 10 … Götteisen 99). Drops, Leder, Stoff, Schmuck und Einzelstücke
// erhalten ihre Stufe damit automatisch, ohne gepflegte Liste. Materialien (Chef: ja) bekommen die Stufe des
// niedrigsten Ausrüstungsteils, in dessen Rezeptkette sie eingehen; Materialien ohne Weg in Ausrüstung (Fisch,
// Tränke-Kräuter) bleiben ohne Stufe. `ItemDef.tier` überschreibt (Raid-Beute = 13).
// Reine Funktion der ContentDB, je ContentDB einmal berechnet. Kein Spielstand, kein RNG.
import type { ContentDB, ItemDef, ItemId } from "@hearthforge/shared";
import { lowestDropSourceLevel, sourceLevelToWearLevel } from "./drop-sources";

/** Höchste reguläre Stufe (Götteisen). Raid-Beute steht darüber (13). */
export const MAX_ITEM_TIER = 12;
/** Stufe der Raid-Beute. */
export const RAID_ITEM_TIER = 13;

/** Anforderungs-Untergrenzen der Stufen I–XII. */
const TIER_FLOORS = [1, 5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 99] as const;

/** Stufe zu einer Anforderungsstufe (1–99). */
export function tierForLevel(level: number): number {
  let tier = 1;
  for (let i = 0; i < TIER_FLOORS.length; i++) if (level >= TIER_FLOORS[i]!) tier = i + 1;
  return tier;
}

function gearTier(content: ContentDB, item: ItemDef): number | null {
  if (typeof item.tier === "number") return item.tier;
  if (item.type !== "equipment") return null;
  const reqs = Object.values(item.requirements ?? {}).filter((v): v is number => typeof v === "number" && v > 0);
  if (reqs.length > 0) return tierForLevel(Math.max(...reqs));
  // Ohne Trage-Anforderung (vor allem Schmuck und Umhänge aus Drops): Stufe aus der niedrigsten Drop-Quelle
  // (design/1.4.0-balance-werkstatt.md §1.2), damit Sterne und Bergungs-Ertrag dieselbe Stufe meinen.
  const src = lowestDropSourceLevel(content, item.id);
  return tierForLevel(src === null ? 1 : sourceLevelToWearLevel(src));
}

const cache = new WeakMap<ContentDB, Map<ItemId, number>>();

function buildTierMap(content: ContentDB): Map<ItemId, number> {
  const map = new Map<ItemId, number>();
  for (const item of Object.values(content.items)) {
    const t = gearTier(content, item);
    if (t !== null) map.set(item.id, t);
  }
  // Materialien: rückwärts durch die Rezeptketten (Erz → Barren → Schwert). Ein Material bekommt die Stufe, in
  // die es am häufigsten eingeht (Gleichstand → niedriger). So bleibt der Götteisen-Barren XII, obwohl ein
  // einzelnes Schmuckrezept der Stufe X ihn auch braucht. Nur Rezepte mit Stufen-Ausgabe zählen.
  const recipes = Object.values(content.actions).filter((a) => (a.inputs?.length ?? 0) > 0);
  const isMat = (id: ItemId): boolean => content.items[id]?.type === "material" && typeof content.items[id]?.tier !== "number";
  for (let pass = 0; pass < 20; pass++) {
    const votes = new Map<ItemId, Map<number, number>>();
    for (const a of recipes) {
      let outTier: number | null = null;
      for (const l of a.loot) {
        const t = map.get(l.itemId);
        if (t !== undefined && (outTier === null || t < outTier)) outTier = t;
      }
      if (outTier === null) continue;
      for (const inp of a.inputs!) {
        if (!isMat(inp.itemId)) continue;
        const v = votes.get(inp.itemId) ?? new Map<number, number>();
        v.set(outTier, (v.get(outTier) ?? 0) + 1);
        votes.set(inp.itemId, v);
      }
    }
    let changed = false;
    for (const [id, v] of votes) {
      let best = 0;
      let bestN = -1;
      for (const [t, n] of v) if (n > bestN || (n === bestN && t < best)) { best = t; bestN = n; }
      if (map.get(id) !== best) {
        map.set(id, best);
        changed = true;
      }
    }
    if (!changed) break;
  }
  return map;
}

/** Stufe eines Items (1–13) oder null, wenn es keine hat (Verbrauchsgüter, Fisch, Kräuter …). */
export function itemTier(content: ContentDB, itemId: ItemId): number | null {
  let map = cache.get(content);
  if (!map) {
    map = buildTierMap(content);
    cache.set(content, map);
  }
  return map.get(itemId) ?? null;
}
