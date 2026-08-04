import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { createTestGame } from "./test-helpers";
import { startCombat, combatStep } from "./combat";

describe("enemy self-regeneration", () => {
  it("ein Gegner mit regen heilt sich, wenn er unter Maximum ist", () => {
    const s = createTestGame({ name: "X" }, content, 1);
    startCombat(s, content, "moss_golem");
    const max = content.monsters.moss_golem!.maxHp;
    // Künstlich Schaden setzen + Spieler-Timer so, dass der Spieler in diesem Tick nicht trifft.
    s.combat.enemyHp = max - 50;
    s.combat.playerTimerMs = 0;

    const before = s.combat.enemyHp;
    combatStep(s, content);
    // regen 3/s * 0,1s = 0,3 HP pro Tick → Gegner-HP gestiegen (abzüglich evtl. Spielerschaden = keiner hier).
    expect(s.combat.enemyHp).toBeGreaterThan(before);
    expect(s.combat.enemyHp).toBeLessThanOrEqual(max);
  });

  it("regen heilt nie über das Maximum", () => {
    const s = createTestGame({ name: "X" }, content, 1);
    startCombat(s, content, "moss_golem");
    const max = content.monsters.moss_golem!.maxHp;
    s.combat.enemyHp = max; // bereits voll
    s.combat.playerTimerMs = 0;

    combatStep(s, content);
    expect(s.combat.enemyHp).toBeLessThanOrEqual(max);
  });

  it("Gegner ohne regen bleibt unverändert (kein passives Heilen)", () => {
    const s = createTestGame({ name: "X" }, content, 1);
    startCombat(s, content, "goblin");
    const max = content.monsters.goblin!.maxHp;
    s.combat.enemyHp = max - 10;
    s.combat.playerTimerMs = 0;
    const before = s.combat.enemyHp;
    combatStep(s, content);
    // Ohne regen darf der Goblin nicht von selbst HP gewinnen.
    expect(s.combat.enemyHp).toBeLessThanOrEqual(before);
  });
});
