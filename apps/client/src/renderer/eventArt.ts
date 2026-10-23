import type { SkillEventId } from "@hearthforge/shared";

/**
 * claude:2026-10-25T01:10:00+02:00 — Ereigniskarten (1.4.0 „Feder und Stahl“ EV): Bilder unter
 * `assets/events/<id>.(png|webp)` (1536×1024, deckend; Asset-Liste Gruppe H). Auto-Discovery wie blessings.ts.
 * Fehlt ein Bild, zeigt die Meldung ihr Emoji-Symbol.
 */
const EVENT_IMAGES = import.meta.glob<string>("./assets/events/*.{png,webp}", {
  eager: true,
  query: "?url",
  import: "default",
});

const BY_ID: Record<string, string> = {};
for (const [path, url] of Object.entries(EVENT_IMAGES)) {
  const id = path.split("/").pop()?.replace(/\.(png|webp)$/, "");
  if (id && !id.endsWith(".card")) BY_ID[id] = url;
}

export function getEventImage(id: SkillEventId): string | null {
  return BY_ID[id] ?? null;
}

/** Emoji-Rückfall je Ereignis. */
export const EVENT_ICON: Record<SkillEventId, string> = {
  rich_vein: "⛏",
  storm_fell: "🌲",
  fish_shoal: "🐟",
  wild_garden: "🌿",
  guard_change: "🗝",
  inspiration: "✒",
  thrifty_hand: "✂",
  masterpiece: "⚒",
  bountiful_harvest: "🌾",
  fresh_trail: "🐾",
  customer: "📜",
};
