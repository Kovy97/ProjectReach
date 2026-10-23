import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { BOSS_FROST_SLOW_MULT, FROST_SLOW, WARD_HIT_DAMPING } from "@hearthforge/shared";
import { createGame } from "./state";
import { computeStats } from "./character";
import { combatStep, startCombat } from "./combat";
import { beginDungeonRun } from "./dungeon";

/**
 * claude:2026-10-25T22:05:00+02:00 — Chef-Entscheide 1.4.0 Welle 5:
 *  W4 „Ward dämpft“: solange der Ward steht, nimmt jeder Treffer WARD_HIT_DAMPING (30 %) weniger Schaden.
 *  F1: Dungeon-/Raid-Bosse nehmen nur BOSS_FROST_SLOW_MULT (die Hälfte) der Frost-Verlangsamung.
 */
describe("Ward-Dämpfung (W4)", () => {
  /** Erster Gegnertreffer: Verlust an HP (ohne Ward) bzw. an Ward (mit Ward). Ward zieht kein RNG ⇒ gleicher Wurf. */
  function firstHitLoss(withWard: boolean): number {
    const s = createGame({ name: "D", baseAttributes: { con: 200 } }, content, 11);
    s.character.food = null;
    s.character.hp = computeStats(s, content).maxHp;
    expect(startCombat(s, content, "chicken")).toBe(true);
    s.combat.enemyHp = 1e9; // der Gegner überlebt, bis er trifft
    s.character.ward = withWard ? 1_000_000 : 0;
    const hp0 = s.character.hp;
    const ward0 = s.character.ward;
    for (let i = 0; i < 400; i++) {
      combatStep(s, content);
      const lost = withWard ? ward0 - s.character.ward : hp0 - s.character.hp;
      if (lost > 0) return lost;
    }
    throw new Error("kein Treffer");
  }

  it("ein vom Ward geschluckter Treffer ist um 30 % kleiner als derselbe Treffer auf die HP", () => {
    expect(WARD_HIT_DAMPING).toBe(0.3);
    const onHp = firstHitLoss(false);
    const onWard = firstHitLoss(true);
    expect(onWard).toBeCloseTo(onHp * (1 - WARD_HIT_DAMPING), 6);
  });
});

describe("Frost an Bossen (F1)", () => {
  function timerStepUnderFrost(atBoss: boolean): number {
    const d = content.dungeons.find((x) => !x.raidOnly && x.encounters.length >= 3)!;
    const s = createGame({ name: "F", baseAttributes: { con: 200 } }, content, 4);
    s.character.hp = computeStats(s, content).maxHp;
    expect(beginDungeonRun(s, content, d)).toBe(true);
    const idx = atBoss ? d.encounters.length - 1 : 0;
    s.combat.encounterIndex = idx;
    s.combat.monsterId = d.encounters[idx]!;
    s.combat.enemyHp = 1e9;
    s.combat.enemyTimerMs = 0;
    s.combat.playerTimerMs = -1e9; // Spieler greift in diesem Tick nicht an
    s.combat.enemyEffects = [{ type: "frost", remainingMs: 60_000, magnitude: 1 }];
    combatStep(s, content);
    return s.combat.enemyTimerMs;
  }

  it("Trash nimmt die volle Verlangsamung, der Boss nur die Hälfte", () => {
    expect(BOSS_FROST_SLOW_MULT).toBe(0.5);
    expect(timerStepUnderFrost(false)).toBeCloseTo(100 * (1 - FROST_SLOW), 6);
    expect(timerStepUnderFrost(true)).toBeCloseTo(100 * (1 - FROST_SLOW * BOSS_FROST_SLOW_MULT), 6);
  });
});
