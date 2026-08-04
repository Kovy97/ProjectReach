/**
 * Auto-Discovery der Aktions-Icons: Lege `assets/actions/<actionId>.png` ab —
 * die Datei wird automatisch der Aktionskarte zugeordnet (kein Code-Eintrag nötig).
 * Fehlt ein Bild, fällt die Karte auf das Ausgabe-Item-Icon zurück.
 */
const ACTION_IMAGES = import.meta.glob<string>("./assets/actions/*.{png,webp}", {
  eager: true,
  query: "?url",
  import: "default",
});

const BY_ID: Record<string, string> = {};
for (const [path, url] of Object.entries(ACTION_IMAGES)) {
  const id = path.split("/").pop()?.replace(/\.(png|webp)$/, "");
  if (id) BY_ID[id] = url;
}

/** Bild-URL zu einer Aktions-ID (oder null, falls keins hinterlegt). */
export function getActionSrc(actionId: string): string | null {
  return BY_ID[actionId] ?? null;
}
