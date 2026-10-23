/**
 * Auto-Discovery der Kampf-Skill-Icons: `assets/skills/<skillId>.png`.
 * Dateiname = Skill-ID (lowercase, exakt wie in COMBAT_SKILL_IDS).
 * Fehlt ein Bild, gibt `getSkillIcon` null zurück.
 */
const SKILL_IMAGES = import.meta.glob<string>("./assets/skills/*.{png,webp}", {
  eager: true,
  query: "?url",
  import: "default",
});

const BY_ID: Record<string, string> = {};
for (const [path, url] of Object.entries(SKILL_IMAGES)) {
  const id = path
    .split("/")
    .pop()
    ?.replace(/\.(png|webp)$/, "");
  if (id) BY_ID[id] = url;
}

/** Bild-URL für eine Skill-ID (oder null, falls keins hinterlegt). */
export function getSkillIcon(skillId: string): string | null {
  return BY_ID[skillId] ?? null;
}

/**
 * Zentraler Emoji-Fallback je Skill-ID, für den Fall dass weder `getSkillIcon` (Kampf-Skills)
 * noch `getSidebarIcon` (Gathering/Crafting-Skills) ein PNG liefern. Einzige Quelle — vorher
 * 4-5x fast identisch dupliziert (MasteryPage, SkillsOverviewPage, ItemWikiModal, Onboarding,
 * teilweise ItemTooltip als Teilmenge `SKILL_BOOST_EMOJI`). Design-System-Bericht 24.07.2026 §6.1.
 */
export const SKILL_EMOJI_FALLBACK: Record<string, string> = {
  woodcutting: "🪓",
  mining: "⛏️",
  fishing: "🎣",
  hunting: "🪤",
  smithing: "🔨",
  cooking: "🍳",
  farming: "🌾",
  foraging: "🌿",
  thieving: "🗝️",
  leatherworking: "🧵",
  tailoring: "🪡",
  bowcraft: "🏹", // claude:2026-10-24T19:40:00+02:00 — Bognerei (1.4.0 FK)
  jewelcrafting: "💍",
  runecrafting: "🔮",
  herblore: "🧪",
  slayer: "⚔️",
  attack: "🎯",
  power: "💪",
  defence: "🛡️",
  ranged: "🏹",
  magic: "✨",
  warding: "🔯",
  vitality: "❤️",
};
