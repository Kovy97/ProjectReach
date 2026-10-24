import { describe, expect, it } from "vitest";
import type { AffixDef, Locale, WeaponEffect } from "@hearthforge/shared";
import { LOCALES } from "@hearthforge/shared";
import { runeFitsHint, runeTargetLabel } from "./runeTargets";
import { UI_TEXT } from "./i18n/translations";
import { weaponEffectProse } from "./util/weaponEffectProse";

/**
 * Runen Tier IV (Chef-Entscheid 25.08.2026, design/runen-tier-iv.html §3/§4) — zwei Follow-ups
 * aus dem Engine-Fundament, hier belegt:
 *  1. `runeTargetLabel`/`runeFitsHint` müssen `AffixDef.requiresTrinity` lesen, auch OHNE
 *     `trinityByTier` (die drei neuen Kinds tragen selbst keinen Trinity-Stat-Bonus).
 *  2. `weaponEffectProse` braucht für alle drei neuen Kinds (blockRestore/combatXp/lootChance)
 *     ein Template in ALLEN 7 Sprachen — sonst zeigt der Tooltip `weaponEffect.fallback`.
 * Muster: util/queueTiming.test.ts (reine Funktionen, kein Engine-State nötig).
 */

/** `t()` exakt wie `useI18n().t` (i18n/index.tsx): Locale → en-Fallback → Key selbst. */
function tFor(locale: Locale): (key: string) => string {
  return (key: string) => UI_TEXT[locale]?.[key] ?? UI_TEXT.en[key] ?? key;
}

/**
 * Synthetischer Affix wie die Rune der Ungebrochenen Mauer (blockRestore, Schild): kein eigener
 * Trinity-Wert (`trinityByTier` fehlt), aber `requiresTrinity: "armorRating"` — Platte, nicht
 * Schild, ist hier bewusst die Test-Achse (armorRating), um sie von den bestehenden
 * `trinityByTier`-Runen klar abzugrenzen.
 */
function makeRequiresTrinityAffix(): AffixDef {
  return {
    id: "test_requires_trinity_rune",
    prefix: "Testrune",
    bonusByTier: [{}, {}, {}, {}],
    appliesTo: ["armor"],
    requiresTrinity: "armorRating",
  };
}

describe("runeTargetLabel — requiresTrinity ohne trinityByTier", () => {
  it("liefert die feine Klassen-Antwort (Plattenrüstung), nicht das grobe appliesTo-Tag (Rüstung)", () => {
    const t = tFor("de");
    const def = makeRequiresTrinityAffix();
    expect(runeTargetLabel(def, 4, t)).toBe("Plattenrüstung");
  });
});

describe("runeFitsHint — requiresTrinity ohne trinityByTier", () => {
  it("liefert den armorRating-Hinweis, nicht null", () => {
    const t = tFor("de");
    const def = makeRequiresTrinityAffix();
    // claude:2026-10-24T18:56:00+02:00 — Textpass P1: „Rüstungswert“ wie das Stat-Label (Glossar 24.10.)
    expect(runeFitsHint(def, 4, t)).toBe("Nur auf Teilen, die selbst einen Rüstungswert tragen.");
  });
});

describe("runeTargetLabel — Regressionsschutz: trinityByTier hat weiterhin Vorrang", () => {
  it("eine klassische Trinity-Rune (Ägide, evasionRating) bleibt unverändert Lederrüstung", () => {
    const t = tFor("de");
    const def: AffixDef = {
      id: "test_classic_trinity_rune",
      prefix: "Testrune",
      bonusByTier: [{}],
      appliesTo: ["armor"],
      trinityByTier: [{ evasionRating: 1 }],
    };
    expect(runeTargetLabel(def, 1, t)).toBe("Lederrüstung");
  });
});

const NEW_KINDS: WeaponEffect["type"][] = ["blockRestore", "combatXp", "lootChance"];

function makeSyntheticEffect(type: WeaponEffect["type"]): WeaponEffect {
  return { type, chance: 1, magnitude: 0.1, durationMs: 0 };
}

describe("weaponEffectProse — Runen-Tier-IV-Kinds in allen 7 Sprachen", () => {
  for (const locale of LOCALES) {
    for (const type of NEW_KINDS) {
      it(`${type} liefert in ${locale} einen echten Text, keinen Fallback`, () => {
        const t = tFor(locale);
        const prose = weaponEffectProse(makeSyntheticEffect(type), t);
        expect(prose).not.toBe(t("weaponEffect.fallback"));
        // Der Zahlwert muss sichtbar sein (10 % magnitude aus makeSyntheticEffect) — kein
        // unaufgelöster Platzhalter darf im Text übrig bleiben.
        expect(prose).toContain("10");
        expect(prose).not.toMatch(/\{[a-z]+\}/);
      });
    }
  }
});

describe("weaponEffectProse — DE/EN Wortlaut der drei neuen Kinds (wörtliche Doku fürs Reporting)", () => {
  it("DE", () => {
    const t = tFor("de");
    expect(weaponEffectProse(makeSyntheticEffect("blockRestore"), t)).toBe(
      "Jeder erfolgreiche Block heilt dich um 10 % deiner maximalen Leben.",
    );
    expect(weaponEffectProse(makeSyntheticEffect("combatXp"), t)).toBe(
      "+10 % Kampf-XP aus jeder Quelle.",
    );
    expect(weaponEffectProse(makeSyntheticEffect("lootChance"), t)).toBe(
      "+10 % Beutechance von besiegten Gegnern.",
    );
  });

  it("EN", () => {
    const t = tFor("en");
    expect(weaponEffectProse(makeSyntheticEffect("blockRestore"), t)).toBe(
      "Each successful block heals you for 10% of your max health.",
    );
    expect(weaponEffectProse(makeSyntheticEffect("combatXp"), t)).toBe(
      "+10% combat XP from all sources.",
    );
    expect(weaponEffectProse(makeSyntheticEffect("lootChance"), t)).toBe(
      "+10% loot chance from defeated enemies.",
    );
  });
});
