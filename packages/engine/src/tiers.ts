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
import { storageShelfOf } from "./storage";

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

/**
 * claude:2026-10-24T16:33:21+02:00 — Stammt die Stufe dieses Teils nur aus der Herstellungs-Anforderung (Umhang-Regel B4: Ausrüstung ohne Trage-Anforderung
 * und ohne Gebiet)? Solche Teile stimmen bei den Material-Stufen mit Stufe I, also wie vor B4 (CEO-Entscheid QA-Runde 2).
 */
function craftDerivedTier(content: ContentDB, item: ItemDef): boolean {
  if (typeof item.tier === "number" || typeof item.arrow?.tier === "number" || item.type !== "equipment") return false;
  if (Object.values(item.requirements ?? {}).some((v) => typeof v === "number" && v > 0)) return false;
  return lowestDropSourceLevel(content, item.id) === null;
}

function gearTier(content: ContentDB, item: ItemDef): number | null {
  if (typeof item.tier === "number") return item.tier;
  if (typeof item.arrow?.tier === "number") return item.arrow.tier; // claude:2026-10-26T03:05:00+02:00 — Pfeile tragen ihre Stufe selbst (QA-Klarheit P2)
  if (item.type !== "equipment") return null;
  const reqs = Object.values(item.requirements ?? {}).filter((v): v is number => typeof v === "number" && v > 0);
  if (reqs.length > 0) return tierForLevel(Math.max(...reqs));
  // Ohne Trage-Anforderung (vor allem Schmuck und Umhänge aus Drops): Stufe aus der niedrigsten Drop-Quelle
  // (design/1.4.0-balance-werkstatt.md §1.2), damit Sterne und Bergungs-Ertrag dieselbe Stufe meinen.
  const src = lowestDropSourceLevel(content, item.id);
  if (src !== null) return tierForLevel(sourceLevelToWearLevel(src));
  // claude:2026-10-24T15:21:04+02:00 — ohne Trage-Anforderung UND ohne Gebiet: die Herstellungs-Anforderung (niedrigstes Rezept-Level),
  // auf die Stufen-Skala abgebildet wie ein Ausrüstungs-Level (QA-Runde 2 Klarheit B4, CEO-Entscheid; z. B. hardened_warcape,
  // Schneidern 45 ⇒ VI statt I). Ohne Rezept bleibt Stufe I (Markenladen-Schmuck u. a.).
  const craft = lowestCraftLevel(content, item.id);
  return tierForLevel(craft ?? 1);
}

/** Niedrigstes Skill-Level eines Rezepts (Aktion mit Zutaten), das dieses Item herstellt; null = keins. */
function lowestCraftLevel(content: ContentDB, itemId: ItemId): number | null {
  let min: number | null = null;
  for (const a of Object.values(content.actions)) {
    if ((a.inputs?.length ?? 0) === 0 || !a.loot.some((l) => l.itemId === itemId)) continue;
    const lvl = typeof a.levelRequired === "number" && a.levelRequired > 0 ? a.levelRequired : 1;
    if (min === null || lvl < min) min = lvl;
  }
  return min;
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
  // claude:2026-10-24T16:03:31+02:00 — CEO-Korrektur QA-Runde 2 Klarheit B3: wieder die HÄUFIGSTE Stufe (die „niedrigste“ hatte Götteisen X, Sehne I,
  // Aether-Essenz VI, Leere-Rune V), dazu die KETTENKAPPE: ein Material steht nie über einem Material, zu dem es direkt
  // verarbeitet wird (Eisenerz ≤ Eisenbarren, Kohle ≤ Stahlbarren). Transitiv über die Kette, weil jede Runde die Stufen der
  // Folge-Materialien aus der Vorrunde liest, bis nichts mehr wechselt. Die Kräuter-/Essenzen-Ausnahme gilt auch hier: Kräuter,
  // Essenzen und Zauberrunen (Regale „herbs“/„essences“) erben ihre Stufe nicht über ein einzelnes Folgerezept, sonst zöge die
  // Aether-Rune (VI) die Aether-Essenz von XII auf VI und mit ihr Reliquienscherbe und Götzenmünze.
  const recipes = Object.values(content.actions).filter((a) => (a.inputs?.length ?? 0) > 0);
  const isMat = (id: ItemId): boolean => content.items[id]?.type === "material" && typeof content.items[id]?.tier !== "number";
  // claude:2026-10-24T16:33:21+02:00 — CEO-Entscheid QA-Runde 2: Umhänge (alle Teile mit Stufe aus der Umhang-Regel B4, heute nur die sechs hergestellten
  // Umhänge ohne Anforderung) tragen ihre B4-Stufe nur selbst; bei den Material-Stimmen zählen sie mit Stufe I wie vor B4. Sonst
  // kippt die knappe Mehrheit von Nessel-Stoff (7:5) und Dämmer-Essenz (10:8) auf III. Wörtlich „gar nicht mitzählen“ hätte die
  // Dämmer-Essenz (8:9) trotzdem auf III gehoben und sechs weitere Stoff-Materialien verschoben (Spinnenseide/Leerenfaden ohne
  // Stufe, Flachs/Leinen IV, Geisterseide/-gewebe IX); das widerspräche dem Ziel „alle übrigen Werte unverändert“.
  const craftDerived = new Set(Object.values(content.items).filter((i) => craftDerivedTier(content, i)).map((i) => i.id));
  const voteTierOf = (id: ItemId): number | undefined => (craftDerived.has(id) ? 1 : map.get(id));
  const isMaterialItem = (id: ItemId): boolean => content.items[id]?.type === "material";
  const capExempt = (id: ItemId): boolean => {
    const shelf = storageShelfOf(content, id);
    return shelf === "herbs" || shelf === "essences";
  };
  for (let pass = 0; pass < 40; pass++) {
    const votes = new Map<ItemId, Map<number, number>>();
    const caps = new Map<ItemId, number>();
    for (const a of recipes) {
      let outTier: number | null = null;
      let matCap: number | null = null;
      for (const l of a.loot) {
        const t = map.get(l.itemId);
        const tv = voteTierOf(l.itemId); // claude:2026-10-24T16:33:21+02:00 — B4-Teile stimmen mit I (s. o.)
        if (tv !== undefined && (outTier === null || tv < outTier)) outTier = tv;
        if (t !== undefined && isMaterialItem(l.itemId) && (matCap === null || t < matCap)) matCap = t;
      }
      // claude:2026-10-26T03:05:00+02:00 — Rezepte ohne Stufen-Ausgabe (Tränke, Essen, Brennen) stimmen für „keine Stufe“ (0). So bleiben
      // Trank-Kräuter ohne Sterne, auch wenn ein einzelnes Ausrüstungsrezept sie braucht (Pestmaske, QA-Klarheit P3).
      const vote = outTier ?? 0;
      for (const inp of a.inputs!) {
        if (!isMat(inp.itemId)) continue;
        const v = votes.get(inp.itemId) ?? new Map<number, number>();
        v.set(vote, (v.get(vote) ?? 0) + 1);
        votes.set(inp.itemId, v);
        if (matCap !== null && !capExempt(inp.itemId)) caps.set(inp.itemId, Math.min(caps.get(inp.itemId) ?? matCap, matCap));
      }
    }
    let changed = false;
    for (const [id, v] of votes) {
      let best = 0;
      let bestN = -1;
      // „Keine Stufe“ gewinnt nur gegen ALLE Stufen-Stimmen zusammen (echte Mehrheit); sonst die häufigste Stufe, Gleichstand → niedriger.
      let tiered = 0;
      for (const [t, n] of v) {
        if (t === 0) continue;
        tiered += n;
        if (n > bestN || (n === bestN && t < best)) { best = t; bestN = n; }
      }
      if ((v.get(0) ?? 0) > tiered) best = 0;
      // claude:2026-10-24T16:03:31+02:00 — Kettenkappe (s. o.): nie über dem niedrigsten Material, zu dem es direkt verarbeitet wird.
      const cap = caps.get(id);
      if (best !== 0 && cap !== undefined && cap < best) best = cap;
      if (best === 0) {
        if (map.delete(id)) changed = true;
      } else if (map.get(id) !== best) {
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
