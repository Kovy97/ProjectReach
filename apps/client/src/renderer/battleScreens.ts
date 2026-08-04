/**
 * Auto-Discovery der Battlescreen-Hintergründe: lege `assets/battlescreens/<id>.png` ab,
 * dann erscheint es automatisch als Kampf-Backdrop in der CombatPage.
 * `<id>` = Zonen-ID oder Dungeon-ID (Dateiname ohne Endung), z.B. `pastures`, `crypt_depths`.
 *
 * Priorität im Kampf:
 *   1. getBattleScreen(cs.dungeonId)       — Dungeon-Run
 *   2. getBattleScreen(monster.zone)       — Zonen-Kampf
 *   3. Fallback auf getDungeonBackground / getZoneBackground (bisherige Zone-Maps)
 */
const BATTLESCREEN_IMAGES = import.meta.glob<string>("./assets/battlescreens/*.{png,webp}", {
  eager: true,
  query: "?url",
  import: "default",
});

// Perf-Welle (2026-07-22): ~480px-breite `<id>.card.webp`-Varianten (gen. per Sharp-Skript,
// Quellbilder sind 1122×1402px+) für die kleinen Karten-Verwendungen (Monster-/Zonen-/Dungeon-
// Auswahlkarten) — der volle Decode-Kosten fiel dort unnötig an. Der volle Kampf-Backdrop
// (`getBattleScreen`, Vollbild) bleibt unverändert groß.
const BATTLESCREEN_CARD_IMAGES = import.meta.glob<string>("./assets/battlescreens/*.card.webp", {
  eager: true,
  query: "?url",
  import: "default",
});

const BY_ID: Record<string, string> = {};
for (const [path, url] of Object.entries(BATTLESCREEN_IMAGES)) {
  if (path.endsWith(".card.webp")) continue; // Card-Varianten separat indiziert (s.u.)
  const id = path.split("/").pop()?.replace(/\.(png|webp)$/, "");
  if (id) BY_ID[id] = url;
}

const BY_ID_CARD: Record<string, string> = {};
for (const [path, url] of Object.entries(BATTLESCREEN_CARD_IMAGES)) {
  const id = path.split("/").pop()?.replace(/\.card\.webp$/, "");
  if (id) BY_ID_CARD[id] = url;
}

/** Kampfhintergrund-URL für eine Zone-ID oder Dungeon-ID (oder null, falls kein Bild hinterlegt). */
export function getBattleScreen(id: string | null | undefined): string | null {
  return id ? BY_ID[id] ?? null : null;
}

/** Kleine (~480px) Karten-Variante, mit Fallback auf das große Bild, falls keine Card-Variante
 *  hinterlegt ist. */
export function getBattleScreenCard(id: string | null | undefined): string | null {
  if (!id) return null;
  return BY_ID_CARD[id] ?? BY_ID[id] ?? null;
}
