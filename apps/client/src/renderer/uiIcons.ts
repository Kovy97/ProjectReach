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

/** URL eines benannten UI-Icons (oder null, wenn nicht vorhanden). */
export function getUiIcon(name: string): string | null {
  return BY_NAME[name] ?? null;
}
