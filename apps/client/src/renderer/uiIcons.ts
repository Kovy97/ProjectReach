/**
 * Auto-Discovery der UI-Icons aus assets/icons/*.png
 * Import-Dateiname (ohne .png) als Schlüssel, z.B. "icon_attribute_strength".
 * Kein Code-Eintrag nötig — neue PNGs werden automatisch erkannt.
 */
const ICON_IMAGES = import.meta.glob<string>("./assets/icons/*.{png,webp}", {
  eager: true,
  query: "?url",
  import: "default",
});

const BY_NAME: Record<string, string> = {};
for (const [path, url] of Object.entries(ICON_IMAGES)) {
  const name = path.split("/").pop()?.replace(/\.(png|webp)$/, "");
  if (name) BY_NAME[name] = url;
}

// claude:2026-10-30T21:45:00+01:00 — Haken für Stil-spezifische Symbole (Dev-Stil „Synty“, synty/loader.ts): liefert eine Ersatz-URL oder null (= Bestand). Ohne
// registrierten Haken ändert sich nichts.
let ersatz: ((name: string) => string | null) | null = null;
export function setUiIconOverride(fn: ((name: string) => string | null) | null): void {
  ersatz = fn;
}

/** URL eines benannten UI-Icons (oder null, wenn nicht vorhanden). */
export function getUiIcon(name: string): string | null {
  if (ersatz) {
    const o = ersatz(name);
    if (o) return o;
  }
  return BY_NAME[name] ?? null;
}
