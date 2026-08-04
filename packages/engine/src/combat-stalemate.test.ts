import { describe, it, expect } from "vitest";
import { content } from "@hearthforge/content";
import { createTestGame } from "./test-helpers";
import { startCombat, combatStep } from "./combat";
import { computeStats } from "./character";
import { addItem } from "./inventory";
import { xpForLevel } from "./leveling";

/**
 * Guard (ST1): Ein Kampf ohne Netto-Fortschritt (Gegner-Regen ≥ DPS) wird nach STALEMATE_NO_PROGRESS_MS
 * automatisch gestoppt (stopReason="stalemate") statt endlos still zu laufen — und ein gewinnbarer Kampf
 * löst das NICHT aus.
 */
describe("Stalemate-Erkennung (ST1)", () => {
  it("Regen-Wall (kann nicht killen, stirbt nicht) → Kampf stoppt mit stopReason=stalemate", () => {
    const s = createTestGame({ name: "X" }, content, 1);
    // Praktisch unsterblich (riesige con → riesige maxHp), aber praktisch keine Offensive:
    // attack/power niedrig + KEINE Waffe → Mini-Schaden, kann den Regen nicht überbieten.
    s.character.baseAttributes.con = 9999;
    s.skills.attack = { xp: xpForLevel(1) };
    s.skills.power = { xp: xpForLevel(1) };
    s.character.equipment.mainhand = null;
    // Reichlich Food als zusätzliche Überlebens-Reserve.
    const food = Object.values(content.items).find((it) => (it.healAmount ?? 0) > 0)!.id;
    addItem(s.inventory, content, food, 1_000_000);
    s.character.food = food;
    // Gegner mit dem höchsten Regen (am sichersten nicht killbar bei Mini-Offensive).
    const mon = Object.values(content.monsters)
      // Frei startbare Openworld-Regen-Mobs: dungeonOnly (W3), Turm-Gates (slayerFloor/
      // slayerRequirement) und dg_-Wellen-Kopien würden startCombat verweigern bzw. verfälschen.
      .filter((m) => (m.regen ?? 0) > 0 && !m.dungeonOnly && m.slayerFloor == null && !m.slayerRequirement && !m.id.startsWith("dg_"))
      .sort((a, b) => (b.regen ?? 0) - (a.regen ?? 0))[0]!;
    expect(startCombat(s, content, mon.id)).toBe(true);
    s.character.hp = computeStats(s, content).maxHp; // voll starten → stirbt nicht (isoliert den Patt)

    for (let t = 0; t < 700 && s.combat.stopReason !== "stalemate"; t++) {
      combatStep(s, content);
    }
    expect(s.combat.kills).toBe(0); // hat nie gekillt
    expect(s.combat.stopReason).toBe("stalemate");
    expect(s.combat.monsterId).toBeNull();
  });

  it("gewinnbarer Kampf (Standard-Held vs Huhn) → KEIN Stalemate, killt", () => {
    const s = createTestGame({ name: "X" }, content, 1);
    for (const id of ["attack", "power", "defence", "vitality"]) s.skills[id] = { xp: xpForLevel(20) };
    const chicken = content.monsters["chicken"] ? "chicken" : Object.keys(content.monsters)[0]!;
    expect(startCombat(s, content, chicken)).toBe(true);
    for (let t = 0; t < 700; t++) combatStep(s, content);
    expect(s.combat.stopReason).not.toBe("stalemate");
    expect(s.combat.kills).toBeGreaterThan(0);
  });
});
