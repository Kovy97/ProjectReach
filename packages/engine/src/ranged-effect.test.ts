import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { createTestGame } from "./test-helpers";
import { startCombat, combatStep } from "./combat";

/**
 * Hilfsfunktion: kämpft N Ticks und meldet, ob je ein Frost-Effekt am Gegner auftrat.
 *
 * Seit dem Enchant-Rework kommen Waffeneffekte NICHT mehr aus festen "verzauberten"
 * Items (die alten per-Waffe-Rezepte sind raus), sondern aus einer Item-INSTANZ mit
 * Affix: Basis-Bogen + `affix_frost` → Frost-Waffeneffekt via
 * `effectiveInstanceWeaponEffects`. Combat liest die Instanz aus
 * `character.equippedInstances.mainhand` (nur wenn `baseItemId === equipment.mainhand`).
 *
 * Ammo-Removal (#286): Der frühere „ohne Munition kein Effekt"-Kontrast ist GESTORBEN —
 * es gibt keine Munition mehr, jeder Fernkampf-Schuss ist scharf und trägt den Effekt.
 */
function fightAndDetectFrost(seed: number): boolean {
  const s = createTestGame({ name: "X", baseAttributes: { dex: 20, str: 16, con: 16 } }, content, seed);
  // Basis-Fernkampfwaffe + ausgerüstete Frost-Instanz (affix_frost, höchster Tier = sichere Chance).
  s.character.equipment.mainhand = "mithril_longbow";
  s.character.equippedInstances = {
    ...s.character.equippedInstances,
    mainhand: {
      instanceId: "inst_test_frostbow",
      baseItemId: "mithril_longbow",
      affixes: [{ affixId: "affix_frost", tier: 3 }],
    },
  };
  startCombat(s, content, "ash_tyrant"); // zäh, nicht frostimmun

  for (let i = 0; i < 4000; i++) {
    combatStep(s, content);
    if (s.combat.enemyEffects.some((e) => e.type === "frost")) return true;
  }
  return false;
}

describe("ranged weapon effect (#286: munitionsfrei)", () => {
  it("löst den Frost-Effekt ohne jegliche Munition aus (jeder Schuss ist scharf)", () => {
    expect(fightAndDetectFrost(777)).toBe(true);
  });

  it("Content: Frost-Affix erzeugt einen Frost-Waffeneffekt", () => {
    const frost = content.affixes?.affix_frost;
    expect(frost?.weaponEffectByTier?.[2]?.type).toBe("frost");
  });
});
