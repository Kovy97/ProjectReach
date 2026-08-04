/**
 * Auto-Discovery der Dungeon-Hintergründe: lege `assets/dungeons/<dungeonId>.png` ab,
 * dann erscheint es automatisch als Hintergrund der Dungeon-Karte UND als Kampf-Backdrop.
 * `<dungeonId>` = die Dungeon-ID aus content.dungeons (lowercase). Fehlt ein Bild, greift der Fallback.
 */
const DUNGEON_IMAGES = import.meta.glob<string>("./assets/dungeons/*.{png,webp}", {
  eager: true,
  query: "?url",
  import: "default",
});

// Perf-Welle (2026-07-22): ~480px-breite `<id>.card.webp`-Varianten (gen. per Sharp-Skript,
// Quellbilder sind 2172px+ breit) für die kleinen Karten-Verwendungen (Dungeon-Auswahlgrid,
// Paragon-Karte) — der volle Decode-Kosten fiel dort unnötig an, da die Karte selbst nur ~150-250
// CSS-px breit ist. Vollbild-Verwendungen (Kampf-Backdrop) bleiben bei `getDungeonBackground`.
const DUNGEON_CARD_IMAGES = import.meta.glob<string>("./assets/dungeons/*.card.webp", {
  eager: true,
  query: "?url",
  import: "default",
});

const BY_ID: Record<string, string> = {};
for (const [path, url] of Object.entries(DUNGEON_IMAGES)) {
  if (path.endsWith(".card.webp")) continue; // Card-Varianten separat indiziert (s.u.)
  const id = path
    .split("/")
    .pop()
    ?.replace(/\.(png|webp)$/, "");
  if (id) BY_ID[id] = url;
}

const BY_ID_CARD: Record<string, string> = {};
for (const [path, url] of Object.entries(DUNGEON_CARD_IMAGES)) {
  const id = path
    .split("/")
    .pop()
    ?.replace(/\.card\.webp$/, "");
  if (id) BY_ID_CARD[id] = url;
}

/** Hintergrund-Bild-URL eines Dungeons (oder null, falls noch keins hinterlegt). */
export function getDungeonBackground(dungeonId: string | null | undefined): string | null {
  return dungeonId ? BY_ID[dungeonId] ?? null : null;
}

/** Kleine (~480px) Karten-Variante, mit Fallback auf das große Bild, falls keine Card-Variante
 *  hinterlegt ist (z.B. neu hinzugefügter Dungeon ohne generiertem Thumbnail). */
export function getDungeonBackgroundCard(dungeonId: string | null | undefined): string | null {
  if (!dungeonId) return null;
  return BY_ID_CARD[dungeonId] ?? BY_ID[dungeonId] ?? null;
}
