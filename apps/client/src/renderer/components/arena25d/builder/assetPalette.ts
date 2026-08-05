/**
 * Scene-Builder — Asset-Palette (Chef-Auftrag Punkt 2): Thumbnails+Namen automatisch aus
 * `assets/arena/*.webp` (derselbe Ordner/dasselbe `import.meta.glob`-Muster wie `../assets.ts`
 * `ARENA_ASSET_IMAGES` — EIGENE, unabhängige glob-Instanz statt eines Re-Exports, weil `assets.ts`
 * bewusst nur ein `Record<file, url>` für die Auflösung exportiert, keine iterierbare/sortierte
 * Palette). Jede neue Mira-/Chef-Datei erscheint sofort ohne Codeänderung — reine Dateisystem-
 * Konvention (Datei ablegen, fertig).
 */
import type { PropPlaceholderKind } from "../manifest";
import { listZoneManifestIds, PLACEHOLDER_KINDS } from "../manifest";

export interface PaletteEntry {
  /** Ziel-Dateiname (das, was im Manifest unter `props[].file` landet) — z.B. "arena_pastures_prop_01.webp". */
  file: string;
  /** Ladbare Vite-Asset-URL fürs Thumbnail/die 3D-Textur. */
  url: string;
  /** Anzeigename fürs Palette-Grid — Dateiname ohne Erweiterung, Unterstriche zu Leerzeichen. */
  label: string;
  /** Grobe Zonen-Zugehörigkeit aus dem Namensschema `arena_<zoneId>_...` (Mira-Konvention) — für den
   *  Präfix-Filter ("nur Props dieser Zone zeigen"). `null` bei Nicht-Zonen-Dateien (z.B. `arena_sun_glow.webp`). */
  zoneHint: string | null;
}

const ASSET_URLS = import.meta.glob<string>("../../../assets/arena/*.{webp,png}", {
  eager: true,
  query: "?url",
  import: "default",
});

// Bundle-Beweis-kritisch (identisches Muster/identische Begründung wie `../manifest.ts`s
// Registry-Aufbau, s. dortiges JSDoc "DIESES `if` ist NICHT optional"): `KNOWN_ZONE_IDS` UND die
// `ARENA_ASSET_PALETTE`-Konstruktion weiter unten sind reiner Top-Level-Modul-Code mit echter
// Arbeit (Object.entries/map/sort) — ungegatet würde das in JEDEM Build laufen, UNABHÄNGIG davon,
// ob `SceneBuilderApp` je gerendert wird (ES-Module führen Top-Level-Code beim ersten Import aus).
// Mit dem Gate faltet Vite `import.meta.env.DEV` in Produktions-Builds zur literalen Konstante
// `false` — der komplette Block wird dadurch nachweislich toter Code (s. Abschlussbericht
// "Bundle-Grep"). `|| __SCENE_BUILDER_BUILD__` (Standalone-EXE, 2026-08-05): im dedizierten
// Scene-Builder-Build (DEV=false!) muss die Palette gefüllt sein; im Spieler-Build faltet
// `false || false` exakt wie bisher (s. ../README.md "Standalone-EXE").
const KNOWN_ZONE_IDS: Set<string> =
  import.meta.env.DEV || __SCENE_BUILDER_BUILD__ ? new Set(listZoneManifestIds()) : new Set();

function deriveZoneHint(file: string): string | null {
  // Schema "arena_<zoneId>_..." — probiert absteigend längere Präfixe, weil einige Zone-IDs selbst
  // Unterstriche enthalten (z.B. "slayer_tower"); erster Treffer gegen den echten Content-Katalog gewinnt.
  const withoutExt = file.replace(/\.(webp|png)$/i, "");
  if (!withoutExt.startsWith("arena_")) return null;
  const rest = withoutExt.slice("arena_".length);
  const parts = rest.split("_");
  for (let take = parts.length - 1; take >= 1; take--) {
    const candidate = parts.slice(0, take).join("_");
    if (KNOWN_ZONE_IDS.has(candidate)) return candidate;
  }
  return null;
}

function toLabel(file: string): string {
  return file.replace(/\.(webp|png)$/i, "").replace(/_/g, " ");
}

/** Sortiert, EINMAL beim Modul-Import gebaut (das Glob-Ergebnis ist ohnehin statisch/build-zeitlich
 *  fest, s. `eager:true`) — die Palette-UI liest diese Liste read-only. Gegated wie `KNOWN_ZONE_IDS`
 *  oben (s. dortiger Kommentar) — leeres Array außerhalb von Dev-Builds. */
export const ARENA_ASSET_PALETTE: PaletteEntry[] =
  import.meta.env.DEV || __SCENE_BUILDER_BUILD__
    ? Object.entries(ASSET_URLS)
      .map(([path, url]) => {
        const file = path.split("/").pop() ?? path;
        return { file, url, label: toLabel(file), zoneHint: deriveZoneHint(file) };
      })
      .sort((a, b) => a.file.localeCompare(b.file))
  : [];

/** Filtert die Palette nach Suchtext (Datei-/Label-Teilstring, case-insensitive) UND optional nach
 *  Zonen-Präfix ("nur diese Zone" vs. "alle zeigen"). Einträge OHNE Zonen-Hinweis (z.B. das
 *  zonenübergreifende `arena_sun_glow.webp`) bleiben beim Zonen-Filter IMMER sichtbar — sie sind
 *  keiner Zone "fremd", der Filter soll nur zonen-SPEZIFISCHE Dateien anderer Zonen ausblenden. */
export function filterPalette(entries: PaletteEntry[], search: string, zoneFilter: string | null): PaletteEntry[] {
  const needle = search.trim().toLowerCase();
  return entries.filter((e) => {
    if (zoneFilter && e.zoneHint !== null && e.zoneHint !== zoneFilter) return false;
    if (!needle) return true;
    return e.file.toLowerCase().includes(needle) || e.label.toLowerCase().includes(needle);
  });
}

/** Drei prozedurale Platzhalter-Einträge (Baum/Busch/Fels, s. `../assets.ts` `makePlaceholderPropTexture`)
 *  — bleiben IMMER in der Palette verfügbar, auch wenn/bevor eine Zone eigene Mira-Dateien hat, damit
 *  der Chef nie vor einer leeren Palette steht (0-Treffer ist der Normalfall am Tag 1 einer neuen Zone).
 *  Gegated wie `KNOWN_ZONE_IDS`/`ARENA_ASSET_PALETTE` oben. */
export const PLACEHOLDER_PALETTE: { kind: PropPlaceholderKind; label: string }[] =
  import.meta.env.DEV || __SCENE_BUILDER_BUILD__
    ? PLACEHOLDER_KINDS.map((kind) => ({ kind, label: `Platzhalter: ${kind === "tree" ? "Baum" : kind === "bush" ? "Busch" : "Fels"}` }))
    : [];
