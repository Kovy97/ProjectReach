import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { actionSuccessChance, thievingRiskMods } from "@hearthforge/shared";
import { createGame } from "./state";
import { setActiveAction, setThievingRisk } from "./actions";
import { advance } from "./tick";

describe("thieving risk mode (careful vs. bold)", () => {
  it("Default eines frischen Spielstands ist careful", () => {
    const s = createGame({ name: "X" }, content, 1);
    expect(s.thievingRisk).toBe("careful");
  });

  it("setThievingRisk schaltet den Modus um", () => {
    const s = createGame({ name: "X" }, content, 1);
    setThievingRisk(s, "bold");
    expect(s.thievingRisk).toBe("bold");
    setThievingRisk(s, "careful");
    expect(s.thievingRisk).toBe("careful");
  });

  it("careful ist sicherer, careful belohnt weniger, careful betäubt kürzer (Mods)", () => {
    const careful = thievingRiskMods("careful");
    const bold = thievingRiskMods("bold");
    // careful: höhere Erfolgschance, geringerer Stun, weniger Belohnung als bold.
    expect(careful.successBonus).toBeGreaterThan(bold.successBonus);
    expect(careful.stunMult).toBeLessThan(bold.stunMult);
    expect(careful.rewardMult).toBeLessThan(bold.rewardMult);
  });

  it("careful gibt eine höhere effektive Erfolgschance als bold", () => {
    const a = content.actions.pickpocket_beggar!;
    const careful = thievingRiskMods("careful");
    const bold = thievingRiskMods("bold");
    expect(actionSuccessChance(a, 1, careful.successBonus)).toBeGreaterThan(
      actionSuccessChance(a, 1, bold.successBonus),
    );
  });

  it("bold betäubt bei Fehlschlag spürbar länger als careful (gleicher Seed)", () => {
    // Längste je beobachtete Betäubung = der bei einem Fehlschlag gesetzte Wert (vor dem Abbau im
    // nächsten Tick). bold skaliert ihn mit 1.5, careful mit 0.5 → bold-Peak > careful-Peak.
    const peakStun = (risk: "careful" | "bold"): number => {
      const s = createGame({ name: "X" }, content, 123);
      setThievingRisk(s, risk);
      setActiveAction(s, content, "pickpocket_beggar");
      let peak = 0;
      for (let i = 0; i < 800; i++) {
        advance(s, content, 100);
        if (s.stunMs > peak) peak = s.stunMs;
      }
      return peak;
    };
    const carefulPeak = peakStun("careful");
    const boldPeak = peakStun("bold");
    expect(carefulPeak).toBeGreaterThan(0); // beide haben mindestens einen Fehlschlag erlebt
    expect(boldPeak).toBeGreaterThan(carefulPeak);
  });

  it("careful und bold erzeugen unterschiedliche Beute (Gold) — der Modus wirkt", () => {
    const goldAfter = (risk: "careful" | "bold"): number => {
      const s = createGame({ name: "X" }, content, 123);
      setThievingRisk(s, risk);
      setActiveAction(s, content, "pickpocket_beggar");
      for (let i = 0; i < 800; i++) advance(s, content, 100);
      return s.character.gold;
    };
    expect(goldAfter("careful")).not.toBe(goldAfter("bold"));
  });
});
