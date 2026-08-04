import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { createTestGame } from "./test-helpers";
import { startCombat, combatStep } from "./combat";
import { useConsumable } from "./consumable";
import { addItem } from "./inventory";

describe("poison status on the player", () => {
  it("Gift verursacht Schaden über Zeit und läuft ab", () => {
    const s = createTestGame({ name: "X", baseAttributes: { con: 6 } }, content, 3);
    startCombat(s, content, "goblin");
    s.character.hp = 200;
    s.combat.playerEffects.push({ type: "poison", remainingMs: 300, magnitude: 10 });

    const before = s.character.hp;
    combatStep(s, content); // 1 Tick = 100ms → 1 Schaden (10/s)
    expect(s.character.hp).toBeLessThan(before);
    expect(s.combat.playerEffects[0]?.remainingMs).toBe(200);

    // Nach insgesamt 300ms ist das Gift verflogen.
    combatStep(s, content);
    combatStep(s, content);
    expect(s.combat.playerEffects.some((e) => e.type === "poison")).toBe(false);
  });

  it("Antigift-Tonikum entfernt Gift", () => {
    const s = createTestGame({ name: "X" }, content, 1);
    addItem(s.inventory, content, "antivenom_tonic", 1);
    s.combat.playerEffects.push({ type: "poison", remainingMs: 5000, magnitude: 4 });

    const ok = useConsumable(s, content, "antivenom_tonic");
    expect(ok).toBe(true);
    expect(s.combat.playerEffects.some((e) => e.type === "poison")).toBe(false);
  });

  it("giftige Gegner sind als solche im Content markiert", () => {
    expect(content.monsters.pit_spider?.inflict?.type).toBe("poison");
    expect(content.monsters.mire_crawler?.inflict?.type).toBe("poison");
    expect(content.monsters.antivenom_tonic).toBeUndefined();
    expect(content.items.antivenom_tonic?.curesPoison).toBe(true);
  });
});
