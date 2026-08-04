import { describe, expect, it } from "vitest";
import { content as baseContent } from "@hearthforge/content";
import { BLOCK_CAP } from "@hearthforge/shared";
import type { ContentDB, ItemInstance } from "@hearthforge/shared";
import { createGame } from "./state";
import { computeStats } from "./character";

/**
 * Bollwerk-Rune-Faltung (design/weapon-dps-rc-xp-spec.md §3): die blockChance einer VERZAUBERUNG
 * (Bollwerk-Rune / affix_bulwark) wird ADDITIV auf die Schild-Basis-blockChance gelegt (Endclamp
 * BLOCK_CAP), NICHT per Math.max. Der alte MAX-Fold machte die Rune auf genau den High-Block-
 * Schilden wirkungslos (Basis ≥ Rune-Flat). Additiv bringt Block in Linie mit den drei anderen
 * Trinity-Achsen (armorRating/evasionRating/wardCapacity sind schon additiv). Die BASIS-Fold über
 * mehrere Slots bleibt MAX (ein Schild) — hier separat geprüft.
 */

const SHIELD_ID = "iron_kiteshield"; // vorhandener Offhand-Schild; Basis-blockChance wird überschrieben
const RUNE_FLAT = 0.08;

// Content-Klon: Schild-Basis-blockChance setzen + synthetische Bollwerk-Rune (blockChance-Trinity).
function contentWith(baseBlock: number): ContentDB {
  return {
    ...baseContent,
    items: {
      ...baseContent.items,
      [SHIELD_ID]: { ...baseContent.items[SHIELD_ID]!, blockChance: baseBlock },
    },
    affixes: {
      ...baseContent.affixes,
      test_bulwark: {
        id: "test_bulwark",
        prefix: { en: "Bulwark", de: "Bollwerk-" },
        bonusByTier: [{}],
        trinityByTier: [{ blockChance: RUNE_FLAT }],
      },
    },
  };
}

function bulwarkInstance(): ItemInstance {
  return {
    instanceId: "inst_bulwark_shield",
    baseItemId: SHIELD_ID,
    affixes: [{ affixId: "test_bulwark", tier: 1 }],
  };
}

/** blockChance eines Charakters mit Schild (optional bollwerk-verzaubert). Kein 2H-Mainhand. */
function blockOf(baseBlock: number, withRune: boolean): number {
  const c = contentWith(baseBlock);
  const s = createGame({ name: "Held" }, c, 7);
  s.character.equipment.offhand = SHIELD_ID;
  if (withRune) s.character.equippedInstances = { offhand: bulwarkInstance() };
  return computeStats(s, c).blockChance;
}

describe("Bollwerk-Rune: additiv statt MAX (Spec §3)", () => {
  it("Rune addiert auf die Schild-Basis (0.40 + 0.08 = 0.48), nicht max(0.40,0.08)=0.40", () => {
    expect(blockOf(0.4, false)).toBeCloseTo(0.4, 6); // Basis allein
    expect(blockOf(0.4, true)).toBeCloseTo(0.48, 6); // additiv
    // Regressions-Anker: der alte MAX-Fold hätte die Rune auf dem hohen Basis-Block verschluckt.
    expect(blockOf(0.4, true)).toBeGreaterThan(blockOf(0.4, false));
  });

  it("Summe wird auf BLOCK_CAP (0.5) geclampt: 0.45 + 0.08 → 0.50", () => {
    expect(BLOCK_CAP).toBe(0.5);
    expect(blockOf(0.45, false)).toBeCloseTo(0.45, 6);
    expect(blockOf(0.45, true)).toBeCloseTo(0.5, 6); // 0.53 → Cap 0.50, NICHT max(0.45,0.08)=0.45
  });
});
