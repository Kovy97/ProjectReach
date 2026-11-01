import { content } from "@hearthforge/content";
import type { QuestObjective } from "@hearthforge/shared";
import { jumpToMonster, jumpToPage } from "./monsterJump";
import { jumpToAction } from "./skillJump";

// claude:2026-10-31T16:34:28+01:00 — Ideen-Welle 1.4.2: Quest-/Chronik-Ziele anklickbar. Liefert je Zieltyp den Sprung
// (Kill → Monsterkarte, Sammeln/Herstellen → Rezept, Dungeon → Kampfseite, Skill-Stufe → Skill-Seite) oder null.

/** Erste Aktion (niedrigste Stufe), die das Item liefert; Sammelgut kommt aus `loot`. */
function actionProducing(itemId: string): string | null {
  let best: { id: string; lvl: number } | null = null;
  for (const a of Object.values(content.actions)) {
    if (!a.loot?.some((l) => l.itemId === itemId)) continue;
    const lvl = a.levelRequired ?? 1;
    if (!best || lvl < best.lvl) best = { id: a.id, lvl };
  }
  return best ? best.id : null;
}

export function objectiveJump(obj: QuestObjective): (() => void) | null {
  switch (obj.type) {
    case "kill_monster": {
      const id = obj.target ?? obj.targets?.[0];
      return id && content.monsters[id] ? () => jumpToMonster(id) : null;
    }
    case "gather_items":
    case "craft_items": {
      if (!obj.target) return null;
      const actionId = content.actions[obj.target] ? obj.target : actionProducing(obj.target);
      return actionId ? () => jumpToAction(actionId) : null;
    }
    case "dungeons_cleared":
      return () => jumpToPage("combat");
    case "reach_skill_level":
      return obj.target && content.skills[obj.target] ? () => jumpToPage(obj.target!) : null;
    default:
      return null;
  }
}
