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
});
