/**
 * Auto-Discovery der Slot-Platzhalter-Icons: Lege `assets/equipslots/<slotId>.png` ab
 * (z.B. `assets/equipslots/helmet.png`) — das Bild wird automatisch als Slot-Icon genutzt.
 * Fehlt ein Bild, fällt die Anzeige auf das Emoji-Fallback zurück.
 * Gültige Slot-IDs: helmet, amulet, mainhand, offhand, body, legs, gloves, boots, cape, ring1, ring2.
 */
const SLOT_ICONS = import.meta.glob<string>("./assets/equipslots/*.{png,webp}", {
  eager: true,
  query: "?url",
  import: "default",
});

const BY_SLOT: Record<string, string> = {};
for (const [path, url] of Object.entries(SLOT_ICONS)) {
  const id = path.split("/").pop()?.replace(/\.(png|webp)$/, "");
  if (id) BY_SLOT[id] = url;
}

/** Slot-Icon-URL zu einer Slot-ID (oder null, wenn (noch) kein Bild hinterlegt ist). */
export function getEquipSlotIcon(slotId: string): string | null {
  return BY_SLOT[slotId] ?? null;
}

/** Emoji-Fallback für leere Equip-Slots (wenn kein PNG vorhanden). */
export const SLOT_EMOJI_FALLBACK: Record<string, string> = {
  helmet: "⛑",
  amulet: "📿",
  mainhand: "⚔",
  offhand: "🛡",
  body: "🦺",
  legs: "👖",
  gloves: "🧤",
  boots: "👢",
  cape: "🧣",
  ring1: "💍",
  ring2: "💍",
};
