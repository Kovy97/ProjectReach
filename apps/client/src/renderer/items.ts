import { SHOW_ITEM_TIERS } from "./featureFlags";
import { content } from "@hearthforge/content";
import { itemTier } from "@hearthforge/engine"; // claude:2026-10-23T18:30:00+02:00 — Stufen-Sortierung (1.4.0)
import {
  ITEM_RARITIES,
  instanceDisplayName,
  type ContentDB,
  type ItemInstance,
  type ItemRarity,
  type LocalizedString,
  type Locale,
} from "@hearthforge/shared";

/**
 * Auto-Discovery der Item-Bilder: Lege einfach `assets/items/<itemId>.png` ab
 * (später Pixelart) — die Datei wird automatisch verknüpft. Kein Code-Eintrag nötig.
 * Fehlt ein Bild, fällt die Anzeige auf das Emoji-Icon bzw. einen Platzhalter zurück.
 * Vorhandene Icons: alle Erze + komplettes Kupfer-Set (copper_sword, copper_dagger,
 * copper_breastplate, copper_2haxe, … sowie copper_arrowheads).
 */
const ITEM_IMAGES = import.meta.glob<string>("./assets/items/*.{png,webp}", {
  eager: true,
  query: "?url",
  import: "default",
});

const BY_ID: Record<string, string> = {};
for (const [path, url] of Object.entries(ITEM_IMAGES)) {
  const file = path.split("/").pop() ?? "";
  const id = file.replace(/\.(png|webp)$/, "");
  if (!id) continue;
  // Full-Res-Pipeline (Task #277): .webp (aus den Archiv-Originalen regeneriert, hohe Qualität)
  // gewinnt gegen ein evtl. noch daneben liegendes altes komprimiertes .png derselben ID.
  if (file.endsWith(".webp") || !BY_ID[id]) BY_ID[id] = url;
}

/**
 * codex:2026-08-02T11:24:00+02:00 — Bestehende, freigegebene Artworks dürfen eine zweite
 * sichtbare Content-ID bedienen, ohne die persistierte Item-ID oder Auto-Discovery-Dateien zu
 * duplizieren. Ein künftig ergänztes exaktes `hunting_bow`-Asset gewinnt weiterhin automatisch.
 */
const ITEM_IMAGE_ALIASES: Readonly<Record<string, string>> = {
  hunting_bow: "ashwood_longbow",
  // claude:2026-10-25T17:10:00+02:00 — Spieler-Bugreport: ohne Bild zeigte die Haut das 🩹-Emoji („hellblaue Kapsel“).
  // Übergang bis zum eigenen Bild aus der 1.4.0-Asset-Runde: die schwarzrote Drachenhaut passt zu „schwarz versengt“.
  cinderwretch_hide: "raw_dragonhide",
};

/** claude:2026-10-24T12:30:00+02:00 — Raid-Varianten (…_heroic/_mythic) zeigen bis zum eigenen Bild das Normal-Bild statt eines Emojis. */
const RAID_VARIANT_RE = /_(heroic|mythic)$/;

/** Bild-URL zu einer Item-ID (oder null, wenn (noch) kein Bild hinterlegt ist). */
export function getItemImage(itemId: string): string | null {
  return (
    BY_ID[itemId] ??
    BY_ID[ITEM_IMAGE_ALIASES[itemId] ?? ""] ??
    (RAID_VARIANT_RE.test(itemId) ? BY_ID[itemId.replace(RAID_VARIANT_RE, "")] : undefined) ??
    null
  );
}

/** CSS-Klasse für die Seltenheits-Färbung (Name/Rahmen). */
export function rarityClass(rarity: ItemRarity | undefined): string {
  return `rarity-${rarity ?? "common"}`;
}

// ── Geteilte Item-Sortierung (Inventar + Bank) ──────────────────────────────

/** Sortiermodi für Item-Listen: "newest" = unveränderte/natürliche Reihenfolge. "qty" (Menge,
 * absteigend) ist NUR in der Bank sinnvoll (Charakter-Inventar hat feste Slot-Mengen) — s.
 * BankPage, die "qty" lokal behandelt (compareItemsBy kennt nur itemId-abgeleitete Modi). */
// claude:2026-10-23T18:30:00+02:00 — 1.4.0 ST: neuer Modus "tier" (Stufe absteigend, dann Seltenheit, dann Name).
export type ItemSortMode = "newest" | "name" | "value" | "rarity" | "qty" | "type" | "tier";

// claude:2026-10-24T17:47:00+02:00 — Sortierung nach Stufe nur, solange Stufen sichtbar sind (Chef 24.10.: vorläufig aus).
export const ITEM_SORT_MODES: ItemSortMode[] = (["newest", "type", "name", "value", "rarity", "tier", "qty"] as ItemSortMode[]).filter((m) => SHOW_ITEM_TIERS || m !== "tier");

// Abgeleitet aus dem vollständigen 8-Tier-Enum (shared: ITEM_RARITIES, aufsteigend niedrig→hoch),
// statt einer eigenen Teil-Liste zu pflegen — sonst fallen neue/seltene Tiers (poor/superRare/godly)
// stumm auf Rang 0 zurück (Sweep2 P2).
const ITEM_RARITY_ORDER: Record<string, number> = Object.fromEntries(
  ITEM_RARITIES.map((r, i) => [r, i]),
);

/** Numerischer Rarity-Rang (niedrig→hoch, s. `ITEM_RARITIES`) — Welle PP (Truhen-Enthüllung):
 *  Dungeon-Beute wird "common zuerst, Jackpot als Finale" sortiert, dieselbe Quelle wie die
 *  Inventar-/Bank-Sortierung nach Seltenheit (`compareItemsBy`) statt einer zweiten Rang-Tabelle. */
export function rarityRank(rarity: ItemRarity | undefined): number {
  return ITEM_RARITY_ORDER[rarity ?? "common"] ?? 0;
}

/**
 * Vergleichsfunktion für Item-IDs nach Typ/Name/Wert/Seltenheit (Wert & Seltenheit absteigend,
 * Name alphabetisch, Typ nach der Reihenfolge der Filter-Chips). "newest"/"qty" werden hier NICHT behandelt — "newest" behält die eigene
 * natürliche Reihenfolge des Aufrufers, "qty" braucht die tatsächliche Stückzahl je Eintrag
 * (nicht aus der Item-ID ableitbar) und wird direkt in BankPage sortiert.
 * Geteilt zwischen CharacterPage (Inventar) und BankPage, damit beide Seiten identisch sortieren.
 */
export function compareItemsBy(
  mode: Exclude<ItemSortMode, "newest" | "qty">,
  idA: string,
  idB: string,
  content: ContentDB,
  tr: (v: LocalizedString) => string,
): number {
  const defA = content.items[idA];
  const defB = content.items[idB];
  if (mode === "name") return tr(defA?.name ?? "").localeCompare(tr(defB?.name ?? ""));
  if (mode === "value") return (defB?.value ?? 0) - (defA?.value ?? 0);
  if (mode === "tier") {
    const d = (itemTier(content, idB) ?? 0) - (itemTier(content, idA) ?? 0);
    if (d !== 0) return d;
    const r = (ITEM_RARITY_ORDER[defB?.rarity ?? "common"] ?? 0) - (ITEM_RARITY_ORDER[defA?.rarity ?? "common"] ?? 0);
    if (r !== 0) return r;
    return tr(defA?.name ?? "").localeCompare(tr(defB?.name ?? ""));
  }
  if (mode === "type") {
    // Chef-Wunsch 29.08.2026: „Inventar sortieren nach Typ — Materialien, Essen, Ruestung usw."
    // Gruppiert nach denselben Kategorien wie die Filter-Leiste (`FILTER_CATEGORIES`) und in
    // DERSELBEN Reihenfolge — der Spieler kennt sie von den Chips daneben. Innerhalb einer Gruppe
    // alphabetisch, damit die Reihenfolge stabil und vorhersagbar bleibt. Unbekanntes ans Ende.
    const rank = (id: string): number => {
      const idx = (FILTER_CATEGORIES as readonly string[]).indexOf(filterCategoryOf(id));
      return idx < 0 ? FILTER_CATEGORIES.length : idx;
    };
    const delta = rank(idA) - rank(idB);
    if (delta !== 0) return delta;
    return tr(defA?.name ?? "").localeCompare(tr(defB?.name ?? ""));
  }
  return (ITEM_RARITY_ORDER[defB?.rarity ?? "common"] ?? 0) - (ITEM_RARITY_ORDER[defA?.rarity ?? "common"] ?? 0);
}

// ── Such-/Typ-Filter-Leiste (Bank + Charakter-Inventar, Chef-Auftrag 2026-07-09) ────────────
// Geteilt zwischen BankPage (voll) und CharacterPage (kompakt) — siehe components/ItemFilterBar.

/** Warenkategorien für die Typ-Filter-Chips. Ähnliche Heuristik wie ShopPage.categoryOf, aber
 * "food" wird in Nahrung/Tränke aufgesplittet (Herblore-Rezepte → Tränke) und die shopspezifische
 * "seeds"-Kategorie entfällt (im Bank/Inventar-Kontext keine eigene Warengruppe). */
export type FilterCategory = "all" | "weapons" | "armor" | "tools" | "food" | "potions" | "materials";

export const FILTER_CATEGORIES: Exclude<FilterCategory, "all">[] = [
  "weapons",
  "armor",
  "tools",
  "food",
  "potions",
  "materials",
];

// Item-IDs, die per Herblore-Rezept entstehen (→ Tränke-Filter statt Nahrung). Aus
// content.actions abgeleitet (skill === "herblore"), NICHT hart kodiert — bleibt bei neuen
// Rezepten automatisch aktuell. Einmal beim Modul-Load berechnet (content ist ein statischer
// Import, ändert sich nie zur Laufzeit — s. ShopPage.SHOP_BY_CATEGORY für dasselbe Muster).
const POTION_ITEM_IDS: Set<string> = (() => {
  const ids = new Set<string>();
  for (const action of Object.values(content.actions)) {
    if (action.skill !== "herblore") continue;
    for (const roll of action.loot) ids.add(roll.itemId);
  }
  return ids;
})();

/** Typ-Filter-Kategorie einer Item-ID (für die Chip-Leiste). */
export function filterCategoryOf(itemId: string): FilterCategory {
  const item = content.items[itemId];
  if (!item) return "materials";
  if (item.type === "tool") return "tools";
  if (item.type === "equipment") return item.weaponStyle ? "weapons" : "armor";
  if (item.type === "consumable") return POTION_ITEM_IDS.has(itemId) ? "potions" : "food";
  return "materials";
}

/** True, wenn die Item-ID ODER ihr lokalisierter Name (AKTUELLE Sprache) den Suchtext enthält.
 * Leerer Suchtext matcht immer (kein Filter aktiv). Case-insensitive. */
export function itemMatchesSearch(itemId: string, query: string, tr: (v: LocalizedString) => string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (itemId.toLowerCase().includes(q)) return true;
  const item = content.items[itemId];
  return item ? tr(item.name).toLowerCase().includes(q) : false;
}

/** True, wenn eine Item-Instanz (verzaubert/gesuffixt) über ihren vollen Anzeige-Namen (Basis +
 * Präfix/Suffix, aktuelle Sprache) ODER ihre Basis-Item-ID den Suchtext matcht — so findet man
 * z.B. eine Instanz über den Suffix-Namen ("... des Bären"), nicht nur über den Basis-Namen. */
export function instanceMatchesSearch(inst: ItemInstance, query: string, locale: Locale): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (inst.baseItemId.toLowerCase().includes(q)) return true;
  return instanceDisplayName(inst, content, locale).toLowerCase().includes(q);
}
