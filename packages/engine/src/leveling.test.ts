import { describe, expect, it } from "vitest";
import { levelFromXp, xpForLevel } from "./leveling";

/**
 * Guard für die Binärsuche in `levelFromXp` (PERF-Umbau Offline-Catch-up, 2026-07-22):
 * die Optimierung muss SEMANTISCH EXAKT der alten Linearsuche entsprechen — levelFromXp ist
 * die einzige XP→Level-Quelle der gesamten Engine (computeStats/Mastery/Requirements/…);
 * jede Abweichung wäre ein Determinismus-/Balance-Bruch.
 */
describe("leveling", () => {
  /** Referenz: die alte Linearsuche, 1:1 (MAX_LEVEL 99, Tabelle über xpForLevel rekonstruiert). */
  function levelFromXpLinear(xp: number): number {
    let level = 1;
    while (level < 99 && xpForLevel(level + 1) <= xp) level++;
    return level;
  }

  it("Binärsuche == alte Linearsuche an ALLEN Tabellen-Grenzwerten (±1/±0.5) und Sonderwerten", () => {
    const probes: number[] = [NaN, Infinity, -Infinity, -1, -0.5, 0, 0.5, 1];
    for (let lvl = 1; lvl <= 99; lvl++) {
      const t = xpForLevel(lvl);
      probes.push(t - 1, t - 0.5, t, t + 0.5, t + 1);
    }
    probes.push(xpForLevel(99) * 2); // weit über dem Cap
    for (const xp of probes) {
      expect(levelFromXp(xp), `xp=${xp}`).toBe(levelFromXpLinear(xp));
    }
  });

  it("Binärsuche == alte Linearsuche über ein dichtes Zufalls-Sample (fester Seed)", () => {
    // Einfacher LCG (deterministisch, kein Engine-RNG nötig).
    let seed = 123456789;
    const rnd = (): number => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    const maxXp = xpForLevel(99) * 1.2;
    for (let i = 0; i < 20000; i++) {
      const xp = rnd() * maxXp - 1000;
      expect(levelFromXp(xp), `xp=${xp}`).toBe(levelFromXpLinear(xp));
    }
  });

  it("Eckwerte: 0 XP → Level 1, exakte Schwelle erreicht das Level, Cap bei 99", () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(xpForLevel(2))).toBe(2);
    expect(levelFromXp(xpForLevel(50))).toBe(50);
    expect(levelFromXp(xpForLevel(50) - 1)).toBe(49);
    expect(levelFromXp(xpForLevel(99))).toBe(99);
    expect(levelFromXp(Number.MAX_SAFE_INTEGER)).toBe(99);
  });
});
