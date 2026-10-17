import type { ContentDB, GameState, SkillId } from "@hearthforge/shared";
import { meetsRequirements } from "./equipment";

/**
 * Bester Werkzeug-Tempofaktor für eine Fertigkeit (z.B. Spitzhacke → Bergbau).
 * Berücksichtigt Inventar UND ausgerüstete Items; `speedMult < 1` = schneller.
 * Ohne passendes (nutzbares) Werkzeug 1. Werkzeuge müssen NICHT ausgerüstet sein,
 * aber ihre Skill-Anforderungen erfüllt sein.
 */
export function bestToolSpeed(state: GameState, content: ContentDB, skill: SkillId): number {
  let best = 1;

  const consider = (itemId: string | null): void => {
    if (!itemId) return;
    const item = content.items[itemId];
    const tool = item?.tool;
    if (tool && tool.skill === skill && tool.speedMult < best && meetsRequirements(state, item)) {
      best = tool.speedMult;
    }
  };

  for (const slot of state.inventory.slots) consider(slot?.itemId ?? null);
  for (const itemId of Object.values(state.character.equipment)) consider(itemId);
  // claude:2026-10-17T21:00:00+02:00 Kit-Scan entfernt: Kits besitzen seit SAVE 87 keine Werkzeug-Slots mehr
  // (Werkzeuge haengen am Charakter), ein Scan inaktiver Kits fand nie etwas.

  return best;
}
