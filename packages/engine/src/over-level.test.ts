import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import {
  MELEE_XP_PER_DAMAGE,
  XP_FULL_GAP,
  XP_ZERO_GAP,
  combatXpLevelMult,
} from "@hearthforge/shared";
import { createTestGame } from "./test-helpers";
import { startCombat, combatStep, ATTACK_STANCE_ATTACK_SHARE } from "./combat";
import { xpForLevel } from "./leveling";

/**
 * Level-Range-XP für Kampf (CEO #113): über-levelte Mobs geben KEIN Kampf-XP mehr (gegen ewiges
 * Farmen am selben schwachen Mob), aber Loot/Gold bleibt UNBERÜHRT (schwache Mobs bleiben Material-/
 * Gold-Quelle). Sanfte Bandbreite: voller XP bis XP_FULL_GAP Level über dem Mob, dann linear runter
 * auf 0 ab XP_ZERO_GAP drüber. „Spieler-Level" = der Stil-/Kampf-Skill, der die XP empfängt.
 */

/** Tötet genau einen Mob (nächster Treffer landet) und liefert Stil-XP-Zuwachs + Gold + dmg + Log. */
function killOnce(
  monsterId: string,
  skillLevel: number,
  seed = 4,
): { gainedXp: number; gold: number; dmg: number; xpLog: number | undefined } {
  const s = createTestGame({ name: "X", baseAttributes: { str: 80, dex: 80, con: 80 } }, content, seed);
  // Aktiver Stil-Skill (Default „attack") auf das Test-Level, plus die Nachbar-Skills.
  s.skills.attack = { xp: xpForLevel(skillLevel) };
  s.skills.power = { xp: xpForLevel(skillLevel) };
  startCombat(s, content, monsterId as never);
  s.combat.enemyHp = 1; // nächster landender Treffer tötet → genau ein schadender Schlag
  const xpBefore = s.skills.attack.xp;
  const goldBefore = s.character.gold;

  let guard = 0;
  while (s.combat.kills < 1 && s.combat.monsterId && guard++ < 600) combatStep(s, content);
  expect(s.combat.kills, "Mob wurde nicht getötet").toBe(1);

  const killHit = s.combat.log
    .filter((e) => e.by === "player" && (e.kind === "hit" || e.kind === "crit"))
    .pop();
  const xpEvent = s.combat.log.filter((e) => e.by === "player" && e.kind === "xp").pop();
  return {
    gainedXp: s.skills.attack.xp - xpBefore,
    gold: s.character.gold - goldBefore,
    dmg: killHit!.amount,
    xpLog: xpEvent?.amount,
  };
}

describe("combatXpLevelMult (Formel)", () => {
  it("on-level + Puffer (diff ≤ XP_FULL_GAP) gibt volle 1.0", () => {
    expect(combatXpLevelMult(1, 1)).toBe(1); // exakt on-level
    expect(combatXpLevelMult(1 + XP_FULL_GAP, 1)).toBe(1); // diff = FULL_GAP → noch voll
    expect(combatXpLevelMult(1, 5)).toBe(1); // Spieler UNTER Mob → niemals dämpfen
  });

  it("zwischen FULL_GAP und ZERO_GAP fällt es linear von 1 auf 0", () => {
    // Mitte des Bandes → 0.5
    const mid = (XP_FULL_GAP + XP_ZERO_GAP) / 2;
    expect(combatXpLevelMult(1 + mid, 1)).toBeCloseTo(0.5, 10);
    // diff = FULL_GAP + 1 → knapp unter 1
    const oneStep = combatXpLevelMult(1 + XP_FULL_GAP + 1, 1);
    expect(oneStep).toBeLessThan(1);
    expect(oneStep).toBeGreaterThan(0);
  });

  it("ab XP_ZERO_GAP über dem Mob = 0 (kein Kampf-XP)", () => {
    expect(combatXpLevelMult(1 + XP_ZERO_GAP, 1)).toBe(0); // exakt an der Schwelle
    expect(combatXpLevelMult(50, 1)).toBe(0); // weit drüber
    expect(combatXpLevelMult(120, 1)).toBe(0);
  });
});

describe("Level-Range-XP im Kampf", () => {
  it("über-levelter Spieler am Low-Mob: 0 Kampf-XP, aber Gold/Loot UNBERÜHRT", () => {
    // L50-attack vs L1-Huhn → diff 49 ≥ ZERO_GAP → Faktor 0.
    const over = killOnce("chicken", 50);
    expect(over.gainedXp).toBe(0); // keinerlei Kampf-XP auf den Stil-Skill

    // Gold bleibt voll (NICHT gedämpft): mind. der Basiswert des Mobs (Streuung kann nur erhöhen).
    expect(over.gold).toBeGreaterThanOrEqual(content.monsters.chicken!.gold);

    // „zu schwach"-Signal: eine Kampf-XP-Log-Zeile mit Betrag 0 (für die UI-Anzeige).
    expect(over.xpLog).toBe(0);
  });

  it("on-level Spieler bekommt volle Kampf-XP + normales Gold", () => {
    // Anfänger (Skill auf Mob-Level) am passenden Mob: diff 0 → Faktor 1.
    const lvl = content.monsters.chicken!.level;
    const on = killOnce("chicken", lvl);
    expect(on.gainedXp).toBeGreaterThan(0);
    expect(on.gold).toBeGreaterThanOrEqual(content.monsters.chicken!.gold);
    // Kill-XP-Log zeigt den vollen Mob-XP-Wert (Faktor 1).
    expect(on.xpLog).toBe(content.monsters.chicken!.xp);
  });

  it("in-range (diff = XP_FULL_GAP) bleibt volle Belohnung; exakte Rekonstruktion", () => {
    // L45-attack vs L40-Mob → diff 5 = FULL_GAP → Faktor 1; earlyXpMult(45) = 1.
    const monster = "forest_warden";
    const r = killOnce(monster, content.monsters[monster]!.level + XP_FULL_GAP);
    const killXp = content.monsters[monster]!.xp;
    // attack-Delta = 55 % der Schadens-XP (Default-attack-Split, balance-pass2 #7) + voller Kill-Bonus.
    expect(r.gainedXp).toBeCloseTo(
      r.dmg * MELEE_XP_PER_DAMAGE * ATTACK_STANCE_ATTACK_SHARE + killXp,
      5,
    );
    expect(r.gold).toBeGreaterThanOrEqual(content.monsters[monster]!.gold);
  });

  it("knapp über dem Band (diff = XP_FULL_GAP + 1) ist reduziert, aber > 0", () => {
    const monster = "forest_warden"; // L40
    const skillLvl = content.monsters[monster]!.level + XP_FULL_GAP + 1; // diff 6
    const reduced = killOnce(monster, skillLvl);
    const full = killOnce(monster, content.monsters[monster]!.level); // diff 0 → voll
    const mult = combatXpLevelMult(skillLvl, content.monsters[monster]!.level);
    expect(mult).toBeGreaterThan(0);
    expect(mult).toBeLessThan(1);
    expect(reduced.gainedXp).toBeGreaterThan(0);
    expect(reduced.gainedXp).toBeLessThan(full.gainedXp); // gedämpft, aber nicht genullt
  });
});

describe("Vitality respektiert die Level-Bandbreite (Chef-Entscheid 2026-07-08)", () => {
  it("über-leveltes vitality vs Trivial-Mob → KEINE Vitality-XP (vorher +109-Leck)", () => {
    const s = createTestGame({ name: "X", baseAttributes: { str: 80, dex: 80, con: 80 } }, content, 4);
    s.skills.vitality = { xp: xpForLevel(90) }; // weit über chicken (L1), diff >> XP_ZERO_GAP
    s.skills.attack = { xp: xpForLevel(90) };
    s.skills.power = { xp: xpForLevel(90) };
    startCombat(s, content, "chicken" as never);
    s.combat.enemyHp = 1;
    const vitBefore = s.skills.vitality.xp;
    let guard = 0;
    while (s.combat.kills < 1 && s.combat.monsterId && guard++ < 600) combatStep(s, content);
    expect(s.combat.kills).toBe(1);
    expect(s.skills.vitality.xp).toBe(vitBefore); // ausgeteilter Schaden gibt am Grey-Mob nichts mehr
  });

  it("on-level bleibt Vitality-XP voll erhalten", () => {
    const s = createTestGame({ name: "X", baseAttributes: { str: 80, dex: 80, con: 80 } }, content, 4);
    s.skills.vitality = { xp: 0 }; // L1 vs chicken L1 → Faktor 1
    startCombat(s, content, "chicken" as never);
    s.combat.enemyHp = 1;
    const vitBefore = s.skills.vitality.xp;
    let guard = 0;
    while (s.combat.kills < 1 && s.combat.monsterId && guard++ < 600) combatStep(s, content);
    expect(s.combat.kills).toBe(1);
    expect(s.skills.vitality.xp).toBeGreaterThan(vitBefore);
  });
});
