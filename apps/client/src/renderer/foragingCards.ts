/**
 * Auto-Discovery der Foraging-Hintergrundkarten: Lege `assets/foraging-cards/<actionId>.png` ab —
 * das Bild erscheint automatisch als Hintergrund der zugehörigen Foraging-Aktionskarte.
 * Fehlt ein Bild, bleibt das Banner unverändert.
 */
const FORAGING_IMAGES = import.meta.glob<string>("./assets/foraging-cards/*.{png,webp}", {
  eager: true,
  query: "?url",
  import: "default",
});

const BY_ID: Record<string, string> = {};
for (const [path, url] of Object.entries(FORAGING_IMAGES)) {
  const id = path.split("/").pop()?.replace(/\.(png|webp)$/, "");
  if (id) BY_ID[id] = url;
}

/** Hintergrund-Bild-URL für eine Foraging-Aktions-ID (oder null, falls keins hinterlegt). */
export function getForagingCard(actionId: string): string | null {
  return BY_ID[actionId] ?? null;
}
