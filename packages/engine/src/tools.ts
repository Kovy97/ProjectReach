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
  // Ausrüstungs-Kits (28.08.2026): ein Werkzeug in einem inaktiven Kit gehört dem Spieler genauso — es zählt,
  // sonst müsste er zum Sammeln das Kit wechseln (CEO-Entscheid auf offenen Punkt des Kits-Agenten).
  state.equipKits?.forEach((kit, i) => {
    if (i === state.activeKit) return;
    for (const itemId of Object.values(kit.equipment)) consider(itemId);
  });

  return best;
}
