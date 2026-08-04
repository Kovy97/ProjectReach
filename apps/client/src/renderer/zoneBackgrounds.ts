/**
 * Auto-Discovery der Zonen-Hintergründe (Map-Bereiche): lege `assets/zones/<zoneId>.png` ab,
 * dann erscheint es automatisch als Hintergrund der Zonen-Karte UND als Kampf-Backdrop.
 * `<zoneId>` = die Zone-ID aus content.zones (lowercase). Fehlt ein Bild, greift der Fallback.
 */
const ZONE_IMAGES = import.meta.glob<string>("./assets/zones/*.{png,webp}", {
  eager: true,
  query: "?url",
  import: "default",
});

// Perf-Welle (2026-07-22): ~480px-breite `<id>.card.webp`-Varianten (gen. per Sharp-Skript,
// Quellbilder sind 2172px+ breit) für die kleinen Karten-Verwendungen (Zonen-Auswahlkarte,
// Bestiary-Zonenkopf, …) — der volle Decode-Kosten (55-85ms bei voller Auflösung) fiel dort
// unnötig an, da die Karte selbst nur ~150-250 CSS-px breit ist. Vollbild-Verwendungen (Kampf-
// Backdrop, immersive Zonen-Map) bleiben bei `getZoneBackground` (großes Bild).
const ZONE_CARD_IMAGES = import.meta.glob<string>("./assets/zones/*.card.webp", {
  eager: true,
  query: "?url",
  import: "default",
});

const BY_ID: Record<string, string> = {};
for (const [path, url] of Object.entries(ZONE_IMAGES)) {
  if (path.endsWith(".card.webp")) continue; // Card-Varianten separat indiziert (s.u.)
  const id = path
    .split("/")
    .pop()
    ?.replace(/\.(png|webp)$/, "");
  if (id) BY_ID[id] = url;
}

const BY_ID_CARD: Record<string, string> = {};
for (const [path, url] of Object.entries(ZONE_CARD_IMAGES)) {
  const id = path
    .split("/")
    .pop()
    ?.replace(/\.card\.webp$/, "");
  if (id) BY_ID_CARD[id] = url;
}

/** Hintergrund-Bild-URL einer Zone (oder null, falls noch keins hinterlegt). */
export function getZoneBackground(zoneId: string | null | undefined): string | null {
  return zoneId ? BY_ID[zoneId] ?? null : null;
}

/** Kleine (~480px) Karten-Variante, mit Fallback auf das große Bild, falls keine Card-Variante
 *  hinterlegt ist (z.B. neu hinzugefügte Zone ohne generiertem Thumbnail). */
export function getZoneBackgroundCard(zoneId: string | null | undefined): string | null {
  if (!zoneId) return null;
  return BY_ID_CARD[zoneId] ?? BY_ID[zoneId] ?? null;
}
