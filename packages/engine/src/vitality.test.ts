import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { createTestGame } from "./test-helpers";
import { computeStats } from "./character";
import { startCombat } from "./combat";
import { advance } from "./tick";
import { levelFromXp } from "./leveling";

describe("vitality skill", () => {
  it("steigt durchs Kämpfen und erhöht die max. HP", () => {
    const s = createTestGame({ name: "X", baseAttributes: { str: 8 } }, content, 1);
    const baseMax = computeStats(s, content).maxHp;

    startCombat(s, content, "goblin");
    // Niederlage bricht den Kampf jetzt ab (Chef 2026-07-01) statt still gegen denselben Gegner neu zu
    // starten. Der ungeschützte Held stirbt am Goblin → hier wird nach jedem Abbruch manuell neu
    // eingestiegen (genau der neue Spiel-Loop), damit die 5-Minuten-Farm wie zuvor durchläuft.
    for (let t = 0; t < 300; t++) {
      advance(s, content, 1000);
      if (s.combat.monsterId === null) startCombat(s, content, "goblin");
    }

    expect(s.skills.vitality?.xp ?? 0).toBeGreaterThan(0);
    expect(levelFromXp(s.skills.vitality?.xp ?? 0)).toBeGreaterThan(1);
    expect(computeStats(s, content).maxHp).toBeGreaterThan(baseMax);
  });
});
