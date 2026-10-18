import { getZoneBackground } from "./zoneBackgrounds";

/**
 * claude:2026-10-18T14:00:00+02:00 — Auto-Discovery der Prestige-Bilder („Der Aschesturz", 1.3 Welle D):
 * `assets/ui/prestige/<name>.{png,webp}`. Kein Code-Eintrag nötig, sobald die Datei liegt; fehlt sie, greift
 * der jeweilige Fallback (nie ein Fehler):
 *  - `altar_scene`    Altar-Szene des Scherbenaltars (Banner oben auf der Seite) → Fallback: Hallen-Kulisse `idolhall`.
 *  - `ash_notch`      Aschekerbe-Abzeichen am Porträt → Fallback: CSS-Kerben (`.ash-notch`).
 *  - `book_of_scars`  Symbol des Narbenbuchs (Reiter) → Fallback: kein Symbol.
 * Sidebar-Symbol separat: `assets/sidebar/sidebaricon_prestige.webp` (sidebarIcons.ts), Fallback 🕯️.
 * Knotensymbole des Narbenbuchs: `assets/ui/talents/prestige/<knotenId>.webp` (components/TalentTree.tsx).
 */
const PRESTIGE_IMAGES = import.meta.glob<string>("./assets/ui/prestige/*.{png,webp}", {
  eager: true,
  query: "?url",
  import: "default",
});

const BY_NAME: Record<string, string> = {};
for (const [path, url] of Object.entries(PRESTIGE_IMAGES)) {
  const name = path.split("/").pop()?.replace(/\.(png|webp)$/, "");
  if (name) BY_NAME[name] = url;
}

/** Altar-Szene (eigene Datei oder die Hallen-Kulisse als Fallback; null nur, wenn beides fehlt). */
export function getAltarScene(): string | null {
  return BY_NAME["altar_scene"] ?? getZoneBackground("idolhall") ?? null;
}

/** Aschekerbe-Abzeichen (oder null: CSS-Fallback). */
export function getAshNotchArt(): string | null {
  return BY_NAME["ash_notch"] ?? null;
}

/** Symbol des Narbenbuchs für den Reiter (oder null). */
export function getBookOfScarsArt(): string | null {
  return BY_NAME["book_of_scars"] ?? null;
}
