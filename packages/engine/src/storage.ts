// claude:2026-10-23T20:50:00+02:00 — Materiallager (1.4.0 „Feder und Stahl“ ML, Chef 23.10.2026).
//
// Prinzip (Goal ML): Das Lager ist ein eigener BEREICH der Bank, keine zweite Kasse. Materialien bleiben in
// `state.bank`, damit jedes Rezept, jedes Gebäude, Farming, Jagd, Verzauberung und jede Warteschlange ohne Umbau
// weiter aus dem Bestand liest. Neu ist nur: Materialien mit Regal belegen keinen Bankplatz und keine
// `bankOrder`-Zelle mehr, sondern stehen auf der Lager-Seite an einem festen Platz.
//
// Regal-Zuordnung: abgeleitet aus Item-Feldern und dem Katalog (wer stellt es her, wer lässt es fallen), damit
// der 23k-Zeilen-Katalog nicht 344 Mal angefasst werden muss. `ItemDef.shelf` überschreibt im Einzelfall.
// Chef-Entscheid ML-2: ins Lager kommen auch Rohfisch/rohes Fleisch, Samen und Köder, Verzauberungsrunen,
// Monsterteile und Diebes-Wertsachen. Annahme A10: alle übrigen Handwerksmaterialien ebenfalls; nur Schlüssel
// und Siegel bleiben in der Bank. Rein, je ContentDB einmal berechnet, kein State, kein RNG.
import type { ContentDB, ItemId, StorageShelfId } from "@hearthforge/shared";
import { STORAGE_SHELVES } from "@hearthforge/shared";

/** Schutz-Ausrüstung für den Slayer-Turm (hergestellte Materialien, keine Rohstoffe): Regal „Sonstiges“. */
const SLAYER_GEAR = new Set(["plague_mask", "mirror_ward", "ear_plugs", "soul_veil", "void_anchor", "slayer_ward_capsule", "tower_forge_compound"]);

/** Schlüssel, Siegel und Marken, die als Bank-Gegenstände bleiben (A10). */
const BANK_ONLY = /(_key|_sigil|_seal)$|^masters_mark$/;

function classify(
  content: ContentDB,
  id: ItemId,
  producers: Map<ItemId, Set<string>>,
  seeds: Set<ItemId>,
  crops: Set<ItemId>,
  baits: Set<ItemId>,
  shopIds: Set<ItemId>,
): StorageShelfId | null {
  const item = content.items[id];
  if (!item || item.type !== "material") return null;
  if (item.shelf !== undefined) return item.shelf;
  if (BANK_ONLY.test(id) && id !== "smugglers_key") return null;
  const by = producers.get(id) ?? new Set<string>();
  if (item.rune) return "enchant_runes";
  if (seeds.has(id) || baits.has(id) || id.endsWith("_seed") || id.startsWith("bait_")) return "seeds";
  if (/_arrow(_|$)|^arrow_shaft$|_arrowheads$/.test(id)) return "arrows";
  if (id.endsWith("_bar")) return "bars";
  if (id.endsWith("_ore") || id === "coal") return "ores";
  if (id.endsWith("_log") || id.startsWith("timber_")) return "wood";
  if (/hide|leather/.test(id) || id === "wyvern_scale" || id === "bowstring") return "hides";
  if (id.startsWith("fiber_") || id.startsWith("cloth_") || id === "spider_silk" || id === "void_thread") return "fibers";
  if (SLAYER_GEAR.has(id) || shopIds.has(id)) return "misc";
  if (id.startsWith("rough_") || by.has("jewelcrafting+") || id === "cut_gemstone") return "gems";
  if (/essence|_rune$/.test(id) || id === "magic_binder") return "essences";
  if (id.startsWith("raw_")) return "fish";
  if (crops.has(id) || id.startsWith("herb_") || by.has("foraging")) return "herbs";
  if (by.has("thieving")) return "loot";
  if (by.size === 0) return "loot";
  return "misc";
}

const cache = new WeakMap<ContentDB, Map<ItemId, StorageShelfId | null>>();

function shelfMap(content: ContentDB): Map<ItemId, StorageShelfId | null> {
  let map = cache.get(content);
  if (map) return map;
  map = new Map();
  const producers = new Map<ItemId, Set<string>>();
  for (const a of Object.values(content.actions)) {
    for (const l of a.loot) {
      const set = producers.get(l.itemId) ?? new Set<string>();
      set.add(a.skill + ((a.inputs?.length ?? 0) > 0 ? "+" : ""));
      producers.set(l.itemId, set);
    }
  }
  const seeds = new Set<ItemId>();
  const crops = new Set<ItemId>();
  for (const c of Object.values(content.crops ?? {})) {
    seeds.add(c.seedItem);
    crops.add(c.yieldItem);
  }
  const baits = new Set<ItemId>();
  for (const z of content.huntingZones ?? []) if (z.baitItemId) baits.add(z.baitItemId);
  const shopIds = new Set<ItemId>((content.shop ?? []).map((e) => e.itemId));
  for (const id of Object.keys(content.items)) map.set(id, classify(content, id, producers, seeds, crops, baits, shopIds));
  cache.set(content, map);
  return map;
}

/** Regal eines Items im Materiallager, oder null (kein Material bzw. bleibt in der Bank). */
export function storageShelfOf(content: ContentDB, itemId: ItemId): StorageShelfId | null {
  return shelfMap(content).get(itemId) ?? null;
}

/** Liegt dieses Item im Materiallager statt in einem Bankplatz? */
export function isStorageItem(content: ContentDB, itemId: ItemId): boolean {
  return storageShelfOf(content, itemId) !== null;
}

/** Prädikat für die Bank-Helfer in shared (`usedBankSlots`, `syncBankOrder`). */
export function storagePredicate(content: ContentDB): (itemId: ItemId) => boolean {
  const map = shelfMap(content);
  return (id) => (map.get(id) ?? null) !== null;
}

/** Alle Materialien je Regal, in Regal-Reihenfolge (`STORAGE_SHELVES`), für die Lager-Seite. */
export function storageShelves(content: ContentDB): { shelf: StorageShelfId; items: ItemId[] }[] {
  const map = shelfMap(content);
  return STORAGE_SHELVES.map((shelf) => ({
    shelf,
    items: Object.keys(content.items).filter((id) => map.get(id) === shelf),
  }));
}
