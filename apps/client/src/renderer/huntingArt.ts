/**
 * Auto-Discovery der Jagd-Zustandsbilder: `assets/ui/hunting/trap_<state>.webp` (state =
 * "empty" | "set" | "caught", design/handwerk-fasern-jagen/spec-technik.md §4). Kein Code-
 * Eintrag nötig — sobald Mira die Dateien ablegt, gewinnen sie automatisch gegenüber dem
 * 🪤-Emoji-Platzhalter (HuntingPage.tsx).
 */
const HUNTING_IMAGES = import.meta.glob<string>("./assets/ui/hunting/*.{png,webp}", {
  eager: true,
  query: "?url",
  import: "default",
});

const BY_NAME: Record<string, string> = {};
for (const [path, url] of Object.entries(HUNTING_IMAGES)) {
  const name = path.split("/").pop()?.replace(/\.(png|webp)$/, "");
  if (name) BY_NAME[name] = url;
}

export type HuntTrapArtState = "empty" | "set" | "caught";

/** Bild-URL des Fallen-Zustandsbilds (oder null, falls noch keins hinterlegt — Emoji-Fallback). */
export function getHuntingTrapArt(trapState: HuntTrapArtState): string | null {
  return BY_NAME[`trap_${trapState}`] ?? null;
}
