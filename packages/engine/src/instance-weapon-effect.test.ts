import { describe, expect, it } from "vitest";
import { content as baseContent } from "@hearthforge/content";
import type { ContentDB, ItemInstance } from "@hearthforge/shared";
import { createTestGame } from "./test-helpers";
import { startCombat } from "./combat";
import { advance } from "./tick";

/**
 * Regression (Enchantment Welle 2): Eine im Mainhand ausgerüstete Item-Instanz mit einem
 * Feuer-Rune-Affix (burn) muss im Kampf den Burn auf den Gegner anwenden — der Hook in
 * applyWeaponEffects nutzt effectiveInstanceWeaponEffects (Basis + Affix) statt nur der Basis.
 * Die Basis-Waffe (copper_sword) hat selbst KEINEN weaponEffect → ohne Affix kein Burn.
 */

// Synthetische Affix-Definition (content-dev liefert die echte Feuer-Rune in Welle 2).
function contentWithFireRune(): ContentDB {
  return {
    ...baseContent,
    affixes: {
      ...baseContent.affixes,
      test_fire_rune: {
        id: "test_fire_rune",
        prefix: { en: "Fiery", de: "Feuriges" },
        bonusByTier: [{}],
        weaponEffectByTier: [{ type: "burn", chance: 1, magnitude: 5, durationMs: 4000 }],
      },
    },
  };
}

function fireRuneInstance(): ItemInstance {
  return {
    instanceId: "inst_fire_sword",
    baseItemId: "copper_sword",
    affixes: [{ affixId: "test_fire_rune", tier: 1 }],
  };
}

/**
 * Läuft den Kampf in kleinen Schritten und meldet, ob je ein Burn-Status gegen den Gegner
 * angewandt wurde. Geprüft über das Combat-Log (`kind:"status", status:"burn"`), da der Gegner
 * bei einem Treffer sterben kann und enemyEffects beim Tod geleert werden — der Log-Eintrag bleibt.
 */
function sawEnemyBurn(content: ContentDB, withInstance: boolean): boolean {
  const s = createTestGame({ name: "Held", baseAttributes: { str: 12, con: 6 } }, content, 42);
  s.character.equipment.mainhand = "copper_sword";
  if (withInstance) s.character.equippedInstances = { mainhand: fireRuneInstance() };
  startCombat(s, content, "goblin");
  let burned = false;
  for (let t = 0; t < 30_000 && !burned; t += 500) {
    advance(s, content, 500);
    if (s.combat.log.some((e) => e.kind === "status" && e.status === "burn" && e.by === "player"))
      burned = true;
  }
  return burned;
}

describe("Instanz-Waffeneffekte im Kampf (Enchantment Welle 2)", () => {
  it("Feuer-Rune-Affix auf der Instanz wendet Burn an, Basis-Waffe ohne Affix nicht", () => {
    const content = contentWithFireRune();
    expect(sawEnemyBurn(content, true)).toBe(true);
    expect(sawEnemyBurn(content, false)).toBe(false);
  });
});
