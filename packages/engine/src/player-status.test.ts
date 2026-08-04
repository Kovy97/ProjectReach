import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { createGame } from "./state";
import { startCombat, combatStep } from "./combat";
import { computeStats } from "./character";

/**
 * Regression: Vom Monster zugefügte Nicht-Gift-Effekte (Blutung/Brennen) müssen den Spieler
 * als DoT schädigen — früher verarbeitete tickPlayerEffects nur "poison".
 */
function hpAfter(effect: "none" | "bleed" | "burn"): number {
  const s = createGame({ name: "X", baseAttributes: { con: 20 } }, content, 123);
  s.character.hp = computeStats(s, content).maxHp;
  startCombat(s, content, "chicken"); // schwacher Gegner → HP-Differenz kommt fast nur vom Effekt
  if (effect !== "none") {
    s.combat.playerEffects.push({ type: effect, remainingMs: 10_000, magnitude: 2 });
  }
  for (let i = 0; i < 50; i++) combatStep(s, content); // 5 s
  return s.character.hp;
}

describe("Spieler-Statuseffekte (Monster-Inflict)", () => {
  it("Blutung schädigt den Spieler über Zeit (vorher wirkungslos)", () => {
    const base = hpAfter("none");
    const bled = hpAfter("bleed");
    // Gleicher Seed/Gegner → einzige Differenz ist der Blutungs-DoT (~2/s × 5s, Squish-Skala).
    expect(base - bled).toBeGreaterThan(8);
  });

  it("Brennen schädigt den Spieler ebenfalls als DoT", () => {
    const base = hpAfter("none");
    const burned = hpAfter("burn");
    expect(base - burned).toBeGreaterThan(8);
  });

  it("Schock am Spieler verursacht keinen HP-Schaden (stört nur den Angriffstimer)", () => {
    const s = createGame({ name: "X", baseAttributes: { con: 20 } }, content, 5);
    s.character.hp = computeStats(s, content).maxHp;
    startCombat(s, content, "chicken");
    s.combat.playerEffects.push({ type: "shock", remainingMs: 10_000, magnitude: 1 });
    const hp0 = s.character.hp;
    // 1 Tick: weder Huhn- noch Spieler-Timer feuern → der Schock selbst zieht keine HP ab.
    combatStep(s, content);
    expect(s.character.hp).toBe(hp0);
  });
});
