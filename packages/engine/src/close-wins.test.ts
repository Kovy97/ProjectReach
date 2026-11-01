import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { GameState } from "@hearthforge/shared";
import { CLOSE_WIN_HP_DIVISOR, isCloseWin } from "@hearthforge/shared";
import { createTestGame, grantAllDungeons } from "./test-helpers";
import { combatStep, startCombat } from "./combat";
import { startDungeon } from "./dungeon";
import { computeStats } from "./character";
import { achievementProgress, checkAchievements } from "./achievements";

/**
 * claude:2026-10-31T09:29:00+01:00 — Chef-Entscheid 31.10.2026 (versteckte Erfolge aufräumen): „Heute nicht“ (`ach_deaths_100`)
 * verlangt jetzt einen Sieg mit höchstens 5 % Leben. Zähler `stats.closeWins`, einziger Inkrement-Ort combat.ts `onEnemyDefeated`
 * (Zone, Champion, Dungeon, Raid, Turm). Gemessen wird das Leben NACH dem tödlichen Treffer, bevor der Kill etwas anderes auslöst.
 *
 * Aufbau: Auto-Essen aus (kein Essen gewählt), vor jedem Schritt Leben auf den Prüfwert setzen und den Gegner-Timer nullen, den
 * Spieler-Timer fällig stellen. So schlägt nur der Spieler. Der Nahkampf-Lebensraub des tödlichen Treffers heilt noch VOR dem Kill-Pfad
 * mit; das Leben nach dem Schritt ist also genau das Leben, mit dem `onEnemyDefeated` rechnet (danach endet der Tick). Seed fest.
 */

/** Kämpft bis zum ersten Kill und hält das Leben vor jedem Schritt auf `hp`. */
function killAtHp(s: GameState, hp: number): void {
  s.character.food = null;
  s.combat.enemyHp = 1;
  let guard = 0;
  while (s.combat.kills < 1 && s.combat.monsterId && guard++ < 400) {
    s.character.hp = hp;
    s.combat.enemyTimerMs = 0;
    s.combat.playerTimerMs = 1_000_000;
    combatStep(s, content);
  }
}

function strongGame(seed: number): GameState {
  return createTestGame({ name: "Knapp", baseAttributes: { str: 80, dex: 80, con: 80 } }, content, seed);
}

// claude:2026-11-01T13:17:00+01:00 — Chef 01.11.: Schwelle 20 % statt 5 %.
describe("isCloseWin (Schwelle 20 %)", () => {
  it("genau 20 % zählt, knapp darüber nicht, tot oder kaputte Werte nie", () => {
    expect(CLOSE_WIN_HP_DIVISOR).toBe(5);
    expect(isCloseWin(20, 100)).toBe(true);
    expect(isCloseWin(1, 100)).toBe(true);
    expect(isCloseWin(20.01, 100)).toBe(false);
    expect(isCloseWin(21, 100)).toBe(false);
    expect(isCloseWin(0, 100)).toBe(false);
    expect(isCloseWin(-3, 100)).toBe(false);
    expect(isCloseWin(5, 0)).toBe(false);
    expect(isCloseWin(Number.NaN, 100)).toBe(false);
    expect(isCloseWin(5, Number.POSITIVE_INFINITY)).toBe(false);
  });
});

describe("stats.closeWins im Kill-Pfad", () => {
  it("frischer Spielstand startet bei 0", () => {
    expect(strongGame(1).stats.closeWins).toBe(0);
  });

  it("Kill mit höchstens 20 % Leben zählt und schaltet „Heute nicht“ frei", () => {
    const s = strongGame(4);
    expect(startCombat(s, content, "chicken")).toBe(true);
    const maxHp = computeStats(s, content).maxHp;
    killAtHp(s, 1);
    expect(s.combat.kills).toBe(1);
    expect(isCloseWin(s.character.hp, maxHp), `Leben beim Kill ${s.character.hp}/${maxHp}`).toBe(true);
    expect(s.stats.closeWins).toBe(1);
    expect(achievementProgress(s, { type: "close_wins", count: 1 })).toBe(1);
    expect(checkAchievements(s, content)).toContain("ach_deaths_100");
    expect(s.achievements).toContain("ach_deaths_100");
  });

  it("Kill mit 21 % Leben zählt nicht, „Heute nicht“ bleibt gesperrt", () => {
    const s = strongGame(4);
    expect(startCombat(s, content, "chicken")).toBe(true);
    const maxHp = computeStats(s, content).maxHp;
    const hp = Math.ceil(maxHp * 0.21);
    expect(isCloseWin(hp, maxHp)).toBe(false);
    killAtHp(s, hp);
    expect(s.combat.kills).toBe(1);
    expect(s.stats.closeWins).toBe(0);
    expect(checkAchievements(s, content)).not.toContain("ach_deaths_100");
  });

  it("gemessen nach dem tödlichen Treffer: dessen Lebensraub zählt mit", () => {
    const s = strongGame(4);
    expect(startCombat(s, content, "chicken")).toBe(true);
    const maxHp = computeStats(s, content).maxHp;
    const hp = Math.floor(maxHp / CLOSE_WIN_HP_DIVISOR); // vor dem Schlag genau an der Schwelle
    expect(isCloseWin(hp, maxHp)).toBe(true);
    killAtHp(s, hp);
    expect(s.combat.kills).toBe(1);
    expect(s.character.hp, "Nahkampf-Lebensraub des Todesstoßes").toBeGreaterThan(hp);
    expect(s.stats.closeWins).toBe(isCloseWin(s.character.hp, maxHp) ? 1 : 0);
  });

  it("Dungeon-Welle läuft über denselben Kill-Pfad und zählt mit", () => {
    const s = grantAllDungeons(strongGame(3), content);
    expect(startDungeon(s, content, "crypt_depths")).toBe(true);
    const maxHp = computeStats(s, content).maxHp;
    killAtHp(s, 1);
    expect(s.combat.kills).toBe(1);
    expect(s.combat.dungeonId).toBe("crypt_depths");
    expect(isCloseWin(s.character.hp, maxHp)).toBe(true);
    expect(s.stats.closeWins).toBe(1);
  });
});

describe("„Heute nicht“ (ach_deaths_100): neue Bedingung, ID unverändert", () => {
  const def = content.achievements.find((a) => a.id === "ach_deaths_100")!;

  it("ein knapper Sieg statt 100 Tode, bleibt versteckt, rare", () => {
    expect(def.condition).toEqual({ type: "close_wins", count: 1 });
    expect(def.hidden).toBe(true);
    expect(def.rarity).toBe("rare");
    expect(def.name).toMatchObject({ en: "Not Today", de: "Heute nicht" });
  });

  it("100 Tode allein schalten den Erfolg nicht mehr frei; wer ihn schon hat, behält ihn", () => {
    const s = strongGame(2);
    s.stats.deaths = 100;
    expect(checkAchievements(s, content)).not.toContain("ach_deaths_100");
    const alt = strongGame(2);
    alt.achievements.push("ach_deaths_100");
    checkAchievements(alt, content);
    expect(alt.achievements.filter((id) => id === "ach_deaths_100")).toHaveLength(1);
  });
});
