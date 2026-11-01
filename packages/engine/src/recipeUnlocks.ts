// claude:2026-10-31T16:08:21+01:00 — Rezept-Freischaltungen für die UI (1.4.2, Sweep-Ideen mit Chef-GO 31.10.2026): „nächste Freischaltung“
// auf der Skill-Seite und die neu freien Rezepte im Levelaufstieg-Toast. Reine Ableitung aus dem Content (`ActionDef.levelRequired`,
// fehlt = Stufe 1) und dem Skill-Level; kein RNG, keine Mutation.
import type { ActionId, ContentDB, GameState, SkillId } from "@hearthforge/shared";
import { levelFromXp } from "./leveling";

/** Stufe, ab der eine Aktion frei ist (Muster `actionLevelMet`: fehlt ⇒ 1). */
function requiredLevel(content: ContentDB, actionId: ActionId): number {
  return content.actions[actionId]?.levelRequired ?? 1;
}

/** Alle Aktions-Ids eines Skills in Content-Reihenfolge. */
function skillActionIds(content: ContentDB, skillId: SkillId): ActionId[] {
  return Object.keys(content.actions).filter((id) => content.actions[id]!.skill === skillId);
}

/**
 * Aktionen (Rezepte, Sammel-/Verarbeitungsaktionen) des Skills, die GENAU auf Stufe `level` frei werden, in Content-Reihenfolge. Für den
 * Levelaufstieg-Toast („Neu: …“). Leer, wenn auf dieser Stufe nichts dazukommt oder `level` keine ganze Zahl ≥ 1 ist.
 */
export function actionsUnlockedAtLevel(content: ContentDB, skillId: SkillId, level: number): ActionId[] {
  if (!Number.isInteger(level) || level < 1) return [];
  return skillActionIds(content, skillId).filter((id) => requiredLevel(content, id) === level);
}

/**
 * Nächste Stufe ÜBER dem aktuellen Skill-Level, auf der neue Aktionen frei werden, samt diesen Aktionen (Content-Reihenfolge). `null`, wenn
 * im Skill nichts mehr freizuschalten ist (oder der Skill keine Aktionen hat).
 */
export function nextRecipeUnlock(
  state: GameState,
  content: ContentDB,
  skillId: SkillId,
): { level: number; actionIds: ActionId[] } | null {
  const current = levelFromXp(state.skills[skillId]?.xp ?? 0);
  let next: number | null = null;
  for (const id of skillActionIds(content, skillId)) {
    const req = requiredLevel(content, id);
    if (req > current && (next === null || req < next)) next = req;
  }
  if (next === null) return null;
  return { level: next, actionIds: actionsUnlockedAtLevel(content, skillId, next) };
}
