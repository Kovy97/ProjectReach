import { describe, expect, it } from "vitest";
import { content } from "./index";

/**
 * Chef-Test 25.08.2026: "Tattered Field Cape of the Tortoise hat den special effect 15% mehr Gold von
 * Gegnern.. aber es droppt kein Gold von Gegnern lol". luckyStrike multipliziert das Kill-Gold
 * (combat.ts rollKillGold) — und seit dem Juli-Entscheid "kein Monster-Gold" hat KEIN Monster Gold.
 * Solange das so ist, darf kein Item und kein Affix den Effekt tragen: ein sichtbarer Effekt, der
 * nichts tut, ist ein Versprechen ans Nichts.
 */
describe("tote Effekte", () => {
  const monsterMitGold = Object.values(content.monsters).filter((m) => (m.gold ?? 0) > 0);

  it("kein Monster droppt Gold (Juli-Entscheid) — sonst diesen Guard ueberdenken", () => {
    expect(monsterMitGold).toEqual([]);
  });

  it("luckyStrike (+Gold von Kills) wird von keinem Item genutzt", () => {
    const traeger = Object.values(content.items).filter((i) => i.weaponEffect?.type === "luckyStrike").map((i) => i.id);
    expect(traeger).toEqual([]);
  });

  it("luckyStrike wird von keinem Affix genutzt", () => {
    const traeger = Object.values(content.affixes ?? {})
      .filter((a) => (a.weaponEffectByTier ?? []).some((fx) => fx?.type === "luckyStrike"))
      .map((a) => a.id);
    expect(traeger).toEqual([]);
  });

  /**
   * Chef-Entscheidung E1 25.08.2026: skillBoost.defence wirkte seit der Rüstungs-Trinität nirgends
   * mehr (computeStats ruft lvlEff nur für attack/power/ranged/magic/warding; combat.ts nutzt defence
   * nur fürs XP-Routing; meetsRequirements liest levelFromXp ohne Boost). Alle 51 Träger wurden auf
   * Trinity-Klassenwert (Rüstung/Schild) bzw. +con (Schmuck/Umhang) umgestellt — kein Item darf den
   * toten Boost mehr tragen.
   */
  it("kein Item traegt skillBoost.defence (Chef-Entscheidung E1 25.08.2026)", () => {
    const traeger = Object.values(content.items)
      .filter((i) => (i.skillBoost as { defence?: number } | undefined)?.defence != null)
      .map((i) => i.id);
    expect(traeger).toEqual([]);
  });
});
