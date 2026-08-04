import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { MELEE_LIFESTEAL, MELEE_LIFESTEAL_CAP_PCT } from "@hearthforge/shared";
import { createTestGame } from "./test-helpers";
import { startCombat, combatStep } from "./combat";
import { equipItem } from "./equipment";
import { computeStats } from "./character";
import { addItem } from "./inventory";

/**
 * Regression Playtest 2026-06-25 / B3: `magic`-Offense-XP (früher `magic_off`) lief auf ×2, ranged auf ×1.2 →
 * Magier levelten ihren Offense-Skill ~67 % schneller als Bogis (Stil-Parität gebrochen).
 * Beide ressourcen-abhängigen Stile sollen denselben XP-pro-Schaden-Faktor haben.
 */

/** Summiert den vom Spieler ausgeteilten Schaden aus dem Kampf-Log. */
function playerDamageDealt(s: ReturnType<typeof createTestGame>): number {
  return s.combat.log
    .filter((e) => e.by === "player" && (e.kind === "hit" || e.kind === "crit"))
    .reduce((sum, e) => sum + e.amount, 0);
}

function runStyle(weaponId: string, prep: (s: ReturnType<typeof createTestGame>) => void) {
  const s = createTestGame({ name: "X", baseAttributes: { int: 6, dex: 6, wis: 4 } }, content, 5);
  addItem(s.inventory, content, weaponId, 1);
  expect(equipItem(s, content, weaponId).ok).toBe(true);
  prep(s);
  const style = computeStats(s, content).style;
  const skill = style === "magic" ? "magic" : "ranged";
  startCombat(s, content, "goblin");
  // Reine Offense-XP messen: bis UNMITTELBAR vor dem ersten Kill akkumulieren. Der Kill-Bonus
  // (monster.xp) ist stil-paritätisch, aber flach pro Kill — seit der Kill-XP-Anhebung (Pacing)
  // würde er die XP-pro-Schaden-Ratio verfälschen, da beide Stile unterschiedlichen Gesamtschaden
  // austeilen. Wir isolieren den reinen XP-pro-Schaden-Faktor (das eigentliche B3-Ziel).
  let xp = 0;
  let dmg = 0;
  for (let i = 0; i < 300; i++) {
    if (s.combat.kills > 0) break;
    xp = s.skills[skill]?.xp ?? 0;
    dmg = playerDamageDealt(s);
    s.character.mana = computeStats(s, content).maxMana; // Magie: nie Mana-leer
    combatStep(s, content);
  }
  return { style, xp, dmg };
}

describe("Stil-XP-Parität (magic vs. ranged)", () => {
  it("magic und ranged geben denselben XP-pro-Schaden-Faktor (B3 behoben, kein ×2 mehr)", () => {
    const magic = runStyle("gnarled_staff", () => {});
    const ranged = runStyle("copper_shortbow", () => {
      // Keine Munition mehr (#286) — der Bogen feuert direkt.
    });

    expect(magic.style).toBe("magic");
    expect(ranged.style).toBe("ranged");

    const magicXp = magic.xp;
    const rangedXp = ranged.xp;
    const magicDmg = magic.dmg;
    const rangedDmg = ranged.dmg;

    expect(magicDmg).toBeGreaterThan(0);
    expect(rangedDmg).toBeGreaterThan(0);

    // XP/Schaden muss für beide Stile praktisch gleich sein (vor dem Fix war magic ~1.67× ranged).
    const magicRatio = magicXp / magicDmg;
    const rangedRatio = rangedXp / rangedDmg;
    // Toleranz deckt earlyXpMult-Rundungen pro Level ab; der Faktor selbst ist identisch.
    expect(magicRatio / rangedRatio).toBeGreaterThan(0.9);
    expect(magicRatio / rangedRatio).toBeLessThan(1.1);
  });
});

/**
 * Regression Playtest 2026-06-25 / P1-Combat-Gefahr: Lebensraub war 0.12 ohne Deckel → ein
 * Lifesteal-Melee heilte mehr zurück als reinkam (0 Tode, Auto-Eat nie ausgelöst). Gesenkt auf
 * 0.08 + Deckel pro Treffer. Dieser Test pinnt beide Eigenschaften.
 */
describe("Lebensraub-Deckel (Combat-Gefahr)", () => {
  it("Lebensraub ist moderat (0.08) und je Treffer auf einen HP-Anteil gedeckelt", () => {
    expect(MELEE_LIFESTEAL).toBeLessThanOrEqual(0.1); // nicht mehr trivialisierend hoch
    expect(MELEE_LIFESTEAL_CAP_PCT).toBeGreaterThan(0);
    expect(MELEE_LIFESTEAL_CAP_PCT).toBeLessThan(0.2); // ein Treffer heilt nie ~voll
  });

  it("ein einzelner harter Treffer heilt nicht über den maxHp-Deckel hinaus", () => {
    const s = createTestGame({ name: "X", baseAttributes: { str: 8, con: 8 } }, content, 5);
    addItem(s.inventory, content, "bronze_sword", 1);
    equipItem(s, content, "bronze_sword");
    const st = computeStats(s, content);
    const cap = Math.round(st.maxHp * MELEE_LIFESTEAL_CAP_PCT);
    startCombat(s, content, "goblin");
    s.character.hp = 1; // maximal Raum für Heilung
    // Ein riesiger Treffer (über den Deckel) würde ohne Cap fast voll heilen.
    // Simuliere via Log-unabhängiger Direktprüfung: nach einigen Schritten darf die pro-Tick-
    // Heilung den Cap nicht überschreiten (HP-Sprung ≤ cap + DoT-Rauschen).
    let maxJump = 0;
    for (let i = 0; i < 50; i++) {
      const before = s.character.hp;
      const deathsBefore = s.stats.deaths;
      combatStep(s, content);
      if (s.combat.monsterId === null) break; // Niederlage bricht jetzt ab (Chef 2026-07-01) → Tod nullt monsterId
      // Der Voll-Heal beim Tod ist kein Lebensraub-Treffer; die Pro-Treffer-Messung endet mit dem break
      // oben. Der deaths-continue darunter ist damit ein defensiver No-Op (Tod hat monsterId genullt).
      if (s.stats.deaths > deathsBefore) continue;
      const jump = s.character.hp - before;
      if (jump > 0) maxJump = Math.max(maxJump, jump);
    }
    // Heilsprung pro Tick (Lebensraub eines Treffers) bleibt am Deckel.
    expect(maxJump).toBeLessThanOrEqual(cap + 1);
  });
});
