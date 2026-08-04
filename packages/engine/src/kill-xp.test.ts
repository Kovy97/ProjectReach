import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { MELEE_XP_PER_DAMAGE, combatXpLevelMult } from "@hearthforge/shared";
import { createTestGame } from "./test-helpers";
import { startCombat, combatStep, ATTACK_STANCE_ATTACK_SHARE } from "./combat";
import { xpForLevel } from "./leveling";

/**
 * Regression: `monster.xp` wurde in der CombatPage als Belohnung angezeigt (⭐), aber nie vergeben.
 * Jetzt wird die Kill-XP OSRS-artig stil-geroutet: Nahkampf-XP (Schaden + Kill-Bonus) geht NUR an
 * den aktiven Stil-Skill (Default „attack"), nicht mehr gleichzeitig auf attack & power.
 *
 * Level-Range-XP (CEO #113): die Kampf-XP wird zusätzlich über die Level-Differenz (Stil-Skill vs
 * Mob-Level) gedämpft. Damit die Rekonstruktion exakt bleibt, kämpfen die Tests IN-RANGE: Stil-Skill
 * L45 gegen einen L40-Mob (diff 5 = volle Bandbreite → Faktor 1) und über L40 (→ earlyXpMult = 1).
 * Hohe Attribute, damit der Spieler den L40-Mob zuverlässig trifft und überlebt.
 */
const IN_RANGE_MONSTER = "forest_warden"; // L40
const SKILL_LEVEL = 45; // diff 5 → volle Kampf-XP (combatXpLevelMult = 1)

describe("Kill-XP (monster.xp)", () => {
  it("ein Nahkampf-Kill: attack bekommt 55 % Schadens-XP + vollen Kill-Bonus, power die 45 % (balance-pass2 #7)", () => {
    const s = createTestGame({ name: "X", baseAttributes: { str: 80, dex: 80, con: 80 } }, content, 4);
    s.skills.attack = { xp: xpForLevel(SKILL_LEVEL) };
    s.skills.power = { xp: xpForLevel(SKILL_LEVEL) };
    // Default-Stil ist "attack" → XP nur auf attack.
    expect(s.character.combatStyle).toBe("attack");
    startCombat(s, content, IN_RANGE_MONSTER); // Nahkampf (rusty_sword)
    s.combat.enemyHp = 1; // der nächste landende Treffer tötet → genau ein schadender Schlag
    const atkBefore = s.skills.attack.xp;
    const powBefore = s.skills.power.xp;

    let guard = 0;
    while (s.combat.kills < 1 && s.combat.monsterId && guard++ < 600) combatStep(s, content);
    expect(s.combat.kills).toBe(1);

    const killHit = s.combat.log
      .filter((e) => e.by === "player" && (e.kind === "hit" || e.kind === "crit"))
      .pop();
    expect(killHit, "kein Treffer-Log gefunden").toBeDefined();
    const dmg = killHit!.amount;

    const killXp = content.monsters[IN_RANGE_MONSTER]!.xp; // > 0
    expect(killXp).toBeGreaterThan(0);

    // Spieler UNTER Mob (L45 vs L65) → nie gedämpft → Faktor 1; earlyXpMult(45) = 1 → exakte Rekonstruktion.
    const mult = combatXpLevelMult(SKILL_LEVEL, content.monsters[IN_RANGE_MONSTER]!.level);
    expect(mult).toBe(1);
    // attack-Zuwachs: 55 % der Schadens-XP (Default-attack-Split) + VOLLER Kill-Bonus (der Kill-Bonus
    // wird NICHT gesplittet — nur die per-Treffer-Offensiv-XP in grantOffenseXp).
    const damageXp = dmg * MELEE_XP_PER_DAMAGE;
    expect((s.skills.attack?.xp ?? 0) - atkBefore).toBeCloseTo(
      damageXp * ATTACK_STANCE_ATTACK_SHARE + killXp,
      5,
    );
    // power bekommt jetzt die restlichen 45 % der Schadens-XP (früher 0 → boar-Wall).
    expect((s.skills.power?.xp ?? 0) - powBefore).toBeCloseTo(
      damageXp * (1 - ATTACK_STANCE_ATTACK_SHARE),
      5,
    );
  });

  it("mit Stil „power\" geht die Nahkampf-XP stattdessen komplett auf power (nicht attack)", () => {
    const s = createTestGame({ name: "X", baseAttributes: { str: 80, dex: 80, con: 80 } }, content, 7);
    s.skills.attack = { xp: xpForLevel(SKILL_LEVEL) };
    s.skills.power = { xp: xpForLevel(SKILL_LEVEL) };
    s.character.combatStyle = "power";
    startCombat(s, content, IN_RANGE_MONSTER);
    s.combat.enemyHp = 1;
    const atkBefore = s.skills.attack.xp;
    const powBefore = s.skills.power.xp;

    let guard = 0;
    while (s.combat.kills < 1 && s.combat.monsterId && guard++ < 600) combatStep(s, content);
    expect(s.combat.kills).toBe(1);

    const killHit = s.combat.log
      .filter((e) => e.by === "player" && (e.kind === "hit" || e.kind === "crit"))
      .pop();
    const dmg = killHit!.amount;
    const killXp = content.monsters[IN_RANGE_MONSTER]!.xp;

    expect((s.skills.power?.xp ?? 0) - powBefore).toBeCloseTo(dmg * MELEE_XP_PER_DAMAGE + killXp, 5);
    expect((s.skills.attack?.xp ?? 0) - atkBefore).toBe(0);
  });

  it("der Kill-Bonus ist wirksam: attack-Zuwachs liegt über der reinen Schadens-XP", () => {
    const s = createTestGame({ name: "X", baseAttributes: { str: 80, dex: 80, con: 80 } }, content, 11);
    s.skills.attack = { xp: xpForLevel(SKILL_LEVEL) };
    s.skills.power = { xp: xpForLevel(SKILL_LEVEL) };
    startCombat(s, content, IN_RANGE_MONSTER);
    s.combat.enemyHp = 1;
    const atkBefore = s.skills.attack.xp;
    let guard = 0;
    while (s.combat.kills < 1 && s.combat.monsterId && guard++ < 600) combatStep(s, content);
    expect(s.combat.kills).toBe(1);

    const killHit = s.combat.log
      .filter((e) => e.by === "player" && (e.kind === "hit" || e.kind === "crit"))
      .pop();
    const dmg = killHit!.amount;
    const gained = (s.skills.attack?.xp ?? 0) - atkBefore;
    // Zuwachs ist strikt größer als die reine Schadens-XP (= Kill-Bonus wurde vergeben).
    expect(gained).toBeGreaterThan(dmg * MELEE_XP_PER_DAMAGE);
  });
});
