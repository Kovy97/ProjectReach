/**
 * Auto-Discovery der Skill-Hintergrundbilder: Lege `assets/skill-backgrounds/<skillId>.png` ab —
 * das Bild erscheint automatisch als geblurrter Hintergrund ALLER Aktionskarten dieses Skills.
 * `<skillId>` = die Skill-ID aus content.skills (z.B. mining, woodcutting, smithing …).
 * Fehlt ein Bild, bleibt das Banner ohne Skill-Background (Standard-Gradient).
 */
const SKILL_BG_IMAGES = import.meta.glob<string>("./assets/skill-backgrounds/*.{png,webp}", {
  eager: true,
  query: "?url",
  import: "default",
});

// Perf-Welle (2026-07-22): ~480px-breite `<skillId>.card.webp`-Varianten (gen. per Sharp-Skript,
// Quellbilder sind 2172px breit) für das kleine Aktionskarten-Banner (SkillPage) — der volle
// Decode-Kosten fiel dort auf JEDER der bis zu ~80 Karten unnötig an.
const SKILL_BG_CARD_IMAGES = import.meta.glob<string>("./assets/skill-backgrounds/*.card.webp", {
  eager: true,
  query: "?url",
  import: "default",
});

const BY_ID: Record<string, string> = {};
for (const [path, url] of Object.entries(SKILL_BG_IMAGES)) {
  if (path.endsWith(".card.webp")) continue; // Card-Varianten separat indiziert (s.u.)
  const id = path.split("/").pop()?.replace(/\.(png|webp)$/, "");
  if (id) BY_ID[id] = url;
}

const BY_ID_CARD: Record<string, string> = {};
for (const [path, url] of Object.entries(SKILL_BG_CARD_IMAGES)) {
  const id = path.split("/").pop()?.replace(/\.card\.webp$/, "");
  if (id) BY_ID_CARD[id] = url;
}

/** Hintergrund-Bild-URL für eine Skill-ID (oder null, falls keins hinterlegt). */
export function getSkillBackground(skillId: string): string | null {
  return BY_ID[skillId] ?? null;
}

/** Kleine (~480px) Karten-Variante, mit Fallback auf das große Bild, falls keine Card-Variante
 *  hinterlegt ist. */
export function getSkillBackgroundCard(skillId: string): string | null {
  return BY_ID_CARD[skillId] ?? BY_ID[skillId] ?? null;
}
