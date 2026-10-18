import type { GameState } from "@hearthforge/shared";
import { PRESTIGE_UNLOCK_QUEST_ID } from "@hearthforge/shared";

/**
 * claude:2026-10-18T14:00:00+02:00 — Sichtbarkeit des Scherbenaltars in der Sidebar (Prestige „Der Aschesturz").
 * Sichtbar, sobald das Ziel erreichbar ist: Kapitel 21 eingelöst (Ende Band 1) ODER schon ein Aufstieg.
 * Rein lesend, ein Boolean, daher als `useGameSelector`-Selektor geeignet (kein Re-Render pro Tick).
 */
export function prestigeNavVisible(state: GameState): boolean {
  if ((state.prestige?.count ?? 0) > 0) return true;
  return (state.quests?.claimed ?? []).includes(PRESTIGE_UNLOCK_QUEST_ID);
}
