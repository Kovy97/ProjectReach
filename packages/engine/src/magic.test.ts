import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { createTestGame } from "./test-helpers";
import { equipItem } from "./equipment";
import { computeStats } from "./character";
import { startCombat } from "./combat";
import { advance } from "./tick";
import { addItem } from "./inventory";

describe("magic combat", () => {
  it("kämpft im Magie-Stil mit dem Stab und hält Mana in Grenzen", () => {
    const s = createTestGame({ name: "Magier", baseAttributes: { int: 6, wis: 4 } }, content, 3);
    addItem(s.inventory, content, "gnarled_staff", 1);
    expect(equipItem(s, content, "gnarled_staff").ok).toBe(true);
    expect(computeStats(s, content).style).toBe("magic");

    const maxMana = computeStats(s, content).maxMana;
    startCombat(s, content, "goblin");
    advance(s, content, 10_000);

    expect(s.skills.magic?.xp).toBeGreaterThan(0); // hat mit Magie gekämpft
    expect(s.character.mana).toBeGreaterThanOrEqual(0);
    expect(s.character.mana).toBeLessThanOrEqual(maxMana);
  });

  it("regeneriert Mana außerhalb des Kampfes", () => {
    const s = createTestGame({ name: "Magier", baseAttributes: { wis: 8 } }, content, 1);
    s.character.mana = 0;
    advance(s, content, 5_000);
    expect(s.character.mana).toBeGreaterThan(0);
  });
});
