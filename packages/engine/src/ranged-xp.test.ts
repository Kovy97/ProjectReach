import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { MELEE_XP_PER_DAMAGE, combatXpLevelMult } from "@hearthforge/shared";
import { createTestGame } from "./test-helpers";
import { startCombat, combatStep } from "./combat";
import { xpForLevel } from "./leveling";
import type { GameState } from "@hearthforge/shared";

/**
 * P2.1 — Ranged-Offense-XP war ×2 überdreht: pro Schaden bekam ranged die DOPPELTE
 * Schadens-XP (damage × MELEE_XP_PER_DAMAGE × 2). Damit erreichte ein Bogen-Build in ~1h
 * bereits L40 und die ranged-Gates (22/42/62/80/95) waren faktisch wirkungslos.
 *
 * Fix: Faktor von ×2 auf ×1.2, dann Balance-Pass 3 #9b auf ×1.1 gesenkt (symmetrisch zu MAGIC_XP_FACTOR;
 * leichter Bonus fürs Munitions-Handicap, sonst melee-Niveau). Dieser Test rekonstruiert die vergebene
 * XP exakt aus dem Schadens-Log und prüft den Faktor.
 *
 * Level-Range-XP (CEO #113): IN-RANGE kämpfen (ranged L45 vs L40-Mob, diff 5 = volle Bandbreite →
 * Kampf-XP-Faktor 1), damit die Rekonstruktion exakt bleibt. Über L40 → earlyXpMult = 1.
 */
const RANGED_XP_FACTOR = 1.1; // Erwartung — muss mit combat.ts übereinstimmen (Balance-Pass 3 #9b).
const MONSTER = "forest_warden"; // L40
const SKILL_LEVEL = 45; // diff 5 → volle Kampf-XP

function rangedXpFromOneHit(seed: number): { gained: number; dmg: number } {
  const s: GameState = createTestGame(
    { name: "X", baseAttributes: { dex: 80, con: 80 } },
    content,
    seed,
  );
  // >L40 → earlyXpMult = 1 (exakte Rekonstruktion). Gates für den Bogen erfüllen.
  for (const id of ["ranged", "vitality"]) s.skills[id] = { xp: xpForLevel(SKILL_LEVEL) };
  s.character.equipment.mainhand = "copper_shortbow"; // feuert ohne Munition (#286)
  startCombat(s, content, MONSTER);
  s.combat.enemyHp = 1; // nächster landender Treffer tötet → genau ein schadender Schlag

  const before = s.skills.ranged!.xp;
  let guard = 0;
  while (s.combat.kills < 1 && s.combat.monsterId && guard++ < 600) combatStep(s, content);
  expect(s.combat.kills, "Mob wurde nicht getötet").toBe(1);

  const killHit = s.combat.log
    .filter((e) => e.by === "player" && (e.kind === "hit" || e.kind === "crit"))
    .pop();
  return { gained: s.skills.ranged!.xp - before, dmg: killHit!.amount };
}

describe("P2.1 — Ranged-Offense-XP-Faktor", () => {
  it("vergibt damage × MELEE_XP_PER_DAMAGE × 1.1 (kein ×2/×1.2 mehr)", () => {
    const { gained, dmg } = rangedXpFromOneHit(123);
    // diff 5 = volle Bandbreite → Kampf-XP-Faktor 1; earlyXpMult(45) = 1.
    const mult = combatXpLevelMult(SKILL_LEVEL, content.monsters[MONSTER]!.level);
    expect(mult).toBe(1);
    const damageXp = dmg * MELEE_XP_PER_DAMAGE * RANGED_XP_FACTOR;
    const oldDamageXp = dmg * MELEE_XP_PER_DAMAGE * 1.2; // vor Balance-Pass 3
    const killXp = content.monsters[MONSTER]!.xp;
    // Schadens-XP-Anteil entspricht ×1.1 (nicht ×1.2) + voller Kill-Bonus.
    expect(gained).toBeCloseTo(damageXp + killXp, 5);
    // Sanity: hätte der alte ×1.2-Faktor gegolten, wäre der Zuwachs strikt größer.
    expect(gained).toBeLessThan(oldDamageXp + killXp);
  });
});
