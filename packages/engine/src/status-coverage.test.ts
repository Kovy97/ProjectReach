import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { SPECIAL_EFFECT_TYPES, effectiveWeaponEffects } from "@hearthforge/shared";

/**
 * Regression-Guard für die Iter-21-Bugklasse: ein Statuseffekt, der von Inhalten
 * ausgelöst, aber von der Kampf-Tick-Logik nicht behandelt wird, läuft stumm ins Leere.
 * Diese Mengen müssen den switch-Zweigen in combat.ts (tickPlayerEffects/tickEnemyEffects) entsprechen.
 */
// tickPlayerEffects: poison/burn/bleed = DoT, frost = langsamer, shock = aussetzen.
const PLAYER_HANDLED = new Set(["poison", "burn", "bleed", "frost", "shock"]);
// tickEnemyEffects: poison/burn/bleed = DoT, frost = langsamer, shock = Schaden-Amp.
const ENEMY_HANDLED = new Set(["poison", "burn", "bleed", "frost", "shock"]);
// Spezial-Kinds (Waffen 2.0 §2.1): passive Bedingungs-Effekte, in combat.ts implementiert
// (collectSpecialEffects → strikeEnemy/onEnemyDefeated/…). SPECIAL_EFFECT_TYPES ist die
// Engine-Wahrheit — ein Content-Kind außerhalb BEIDER Mengen wäre „definiert, aber nie angewandt".
const SPECIAL_HANDLED = new Set<string>(SPECIAL_EFFECT_TYPES);

describe("Statuseffekt-Abdeckung (Anti-Regression)", () => {
  it("jeder vom Monster zugefügte Effekt-Typ wird auf der Spielerseite behandelt", () => {
    const unhandled = new Set<string>();
    for (const m of Object.values(content.monsters)) {
      if (m.inflict && !PLAYER_HANDLED.has(m.inflict.type)) unhandled.add(m.inflict.type);
    }
    expect([...unhandled], `nicht behandelte Inflict-Typen: ${[...unhandled].join(", ")}`).toEqual([]);
  });

  it("jeder Waffen-Effekt-Typ (Status ODER Spezial-Kind, inkl. weaponEffects[]) ist implementiert", () => {
    const unhandled = new Set<string>();
    for (const it of Object.values(content.items)) {
      for (const eff of effectiveWeaponEffects(it)) {
        if (!ENEMY_HANDLED.has(eff.type) && !SPECIAL_HANDLED.has(eff.type)) unhandled.add(eff.type);
      }
    }
    expect([...unhandled], `nicht behandelte Waffen-Effekt-Typen: ${[...unhandled].join(", ")}`).toEqual([]);
  });

  it("jeder von einer Pet-Ability zugefügte Status wird auf der Gegnerseite behandelt", () => {
    const unhandled = new Set<string>();
    for (const p of Object.values(content.pets)) {
      const ab = p.combatAbility;
      if ((ab.kind === "onHitStatus" || ab.kind === "delayedDot") && ab.status && !ENEMY_HANDLED.has(ab.status)) {
        unhandled.add(ab.status);
      }
    }
    expect([...unhandled], `nicht behandelte Pet-Status-Typen: ${[...unhandled].join(", ")}`).toEqual([]);
  });
});
