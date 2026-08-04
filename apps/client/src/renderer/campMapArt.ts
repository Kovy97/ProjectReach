/**
 * Auto-Discovery der Dorfkarten-Grafiken (Task #371, Muster campArt.ts): der Kartengrund selbst
 * plus zwei GEBÄUDEUNABHÄNGIGE Bauzustands-Overlays (Baustelle/Gerüst, s. design/
 * newhaven-karte-spec.md §3 „Empfehlung: gebäudeunabhängig — 4 Assets statt 60"). Solange die
 * Chef-PNGs fehlen, zeichnet die Karte ihren Untergrund und ihre Bauzustände per CSS selbst
 * (styles/newhaven.css `.nh-map-bg`/`.nh-map-site-placeholder`/`.nh-map-scaffold-placeholder`) —
 * diese Datei liefert nur den Bild-Ersatz, sobald er da ist, ohne dass NewHavenPage.tsx angefasst
 * werden muss (kein Code-Eintrag nötig, die Datei wird beim Ablegen automatisch verknüpft).
 *
 * KONVENTION (Dateinamen für den Chef):
 *  - Kartengrund:            `assets/camp/camp_map_<day|night>.webp`
 *  - leerer Platz:           `assets/camp/camp_slot_empty_<day|night>.webp`
 *  - Baustelle (Neubau):     `assets/camp/camp_site_<day|night>.webp`
 *  - Gerüst (Ausbau):        `assets/camp/camp_scaffold_<day|night>.webp`
 */
import type { CampLightPhase } from "./campArt";

const MAP_IMAGES = import.meta.glob<string>("./assets/camp/*.{png,webp}", {
  eager: true,
  query: "?url",
  import: "default",
});

const BY_KEY: Record<string, string> = {};
for (const [path, url] of Object.entries(MAP_IMAGES)) {
  const file = path.split("/").pop() ?? "";
  const key = file.replace(/\.(png|webp)$/, "");
  if (!key) continue;
  // .webp gewinnt gegen ein evtl. daneben liegendes .png (Muster campArt.ts/items.ts).
  if (file.endsWith(".webp") || !BY_KEY[key]) BY_KEY[key] = url;
}

// codex:2026-07-30T22:30:00+02:00 — alle freigegebenen generischen Bauzustände samt Nachtfallback.
function phaseArt(base: string, phase: CampLightPhase): string | null {
  return BY_KEY[`${base}_${phase}`] ?? BY_KEY[`${base}_day`] ?? null;
}

/** Kartengrund der Dorfkarte (oder null — dann zeichnet `.nh-map-bg` die Lichtung per CSS). */
export function getCampMapBackground(phase: CampLightPhase = "day"): string | null {
  return phaseArt("camp_map", phase);
}

/** Freie Baufläche für den Platzierungsgeist (oder null → dessen gezeichnete Fläche). */
export function getCampSlotArt(phase: CampLightPhase = "day"): string | null {
  return phaseArt("camp_slot_empty", phase);
}

/** Baustellen-Platzhalter für einen NEUBAU im Gang (oder null → CSS-Schraffur). */
export function getCampSiteArt(phase: CampLightPhase = "day"): string | null {
  return phaseArt("camp_site", phase);
}

/** Gerüst-Andeutung für einen AUSBAU im Gang (oder null → CSS-Schraffur-Overlay). */
export function getCampScaffoldArt(phase: CampLightPhase = "day"): string | null {
  return phaseArt("camp_scaffold", phase);
}
