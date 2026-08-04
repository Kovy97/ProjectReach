import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { createTestGame } from "./test-helpers";
import { startCombat, combatStep } from "./combat";

/**
 * Lässt den Waldvogt in einem Tick genau einmal angreifen und liefert den
 * geloggten Trefferschaden (0 bei Fehlschlag). enemyHp steuert den Wut-Zustand.
 */
function loggedEnemyHit(enemyHpRatio: number, seed: number): number {
  const monster = content.monsters.forest_warden!;
  // Hoher con → große maxHp: der Rüstungs-Trinität-One-Shot-Cap (§1.6, min(dmg, 0.5·maxHp)) darf
  // NICHT binden, sonst würden sowohl der Normal- als auch der Wut-Treffer auf denselben Cap gedrückt
  // und die Wut-Differenz verschwände. Mit con 500 (maxHp ~1005, Cap ~502) bleibt jeder Waldvogt-
  // Treffer klar unter dem Cap → die Enrage-1,6×-Skalierung schlägt wie gewollt durch.
  const s = createTestGame({ name: "X", baseAttributes: { con: 500 } }, content, seed);
  startCombat(s, content, "forest_warden");
  s.combat.enemyHp = Math.max(1, Math.round(monster.maxHp * enemyHpRatio));
  s.character.hp = 5000; // groß genug, um den Treffer zu überleben (kein Tod/Reset)
  s.combat.enemyTimerMs = monster.attackIntervalMs - 1; // Gegner schlägt in diesem Tick
  s.combat.playerTimerMs = 0; // Spieler nicht (Timer noch nicht voll)

  combatStep(s, content);
  const hit = [...s.combat.log].reverse().find((e) => e.by === "enemy" && e.kind === "hit");
  return hit?.amount ?? 0;
}

/** Summiert den Trefferschaden über viele Seeds (robust gegen einzelne Fehlschläge). */
function totalEnemyDamage(enemyHpRatio: number): number {
  let total = 0;
  for (let seed = 1; seed <= 120; seed++) total += loggedEnemyHit(enemyHpRatio, seed);
  return total;
}

describe("enemy enrage", () => {
  it("Content: Waldvogt und Endboss haben Wut-Parameter", () => {
    expect(content.monsters.forest_warden!.enrage).toBeTruthy();
    expect(content.monsters.last_idol!.enrage).toBeTruthy();
  });

  it("unter dem Wut-Schwellwert trifft der Gegner härter als bei vollem Leben", () => {
    const full = totalEnemyDamage(1.0); // 100% HP → kein Enrage
    const low = totalEnemyDamage(0.1); // 10% HP → Enrage (Schwelle 0,35)
    expect(full).toBeGreaterThan(0);
    // Enrage 1,6× → spürbar mehr Gesamtschaden über dieselben Seeds.
    expect(low).toBeGreaterThan(full * 1.3);
  });
});
