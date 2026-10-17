import { describe, expect, it } from "vitest";
import { UI_TEXT } from "../i18n/translations";
import { weaponEffectProse } from "./weaponEffectProse";
import type { WeaponEffect } from "@hearthforge/shared";

/**
 * Chef-Fund 31.08.2026 (Bildbeleg): Auf der Karte der Rune des Schleiertrinkers stand wörtlich
 * „On hit, {pct}% of the damage you deal flows into your ward." Der Platzhalter kam nie an —
 * `weaponEffectProse` ersetzt {chance}, {magnitude}, {flat}, {threshold}, {stacks}, {duration} und
 * {family}, aber kein {pct}. Genau EIN Template benutzte ihn, in allen sieben Sprachen.
 *
 * Dieser Waechter prueft nicht die eine Zeile, sondern die ganze Klasse: Kein Effekt-Template in
 * KEINER Sprache darf einen Platzhalter tragen, den der Bauer nicht kennt.
 */

/** Die Platzhalter, die `weaponEffectProse` tatsaechlich ersetzt (s. dortiges JSDoc). */
const BEKANNT = new Set(["chance", "magnitude", "flat", "threshold", "stacks", "duration", "family"]);

describe("Waffeneffekt-Texte", () => {
  it("benutzen nur Platzhalter, die auch ersetzt werden — in jeder Sprache", () => {
    const fehler: string[] = [];
    for (const [locale, tabelle] of Object.entries(UI_TEXT)) {
      for (const [key, text] of Object.entries(tabelle as Record<string, string>)) {
        if (!key.startsWith("weaponEffect.")) continue;
        for (const m of text.matchAll(/\{([a-zA-Z]+)\}/g)) {
          if (!BEKANNT.has(m[1]!)) fehler.push(`${locale} ${key} → {${m[1]}}`);
        }
      }
    }
    expect(fehler).toEqual([]);
  });

  it("der Schleiertrinker nennt seine Zahl statt eines Platzhalters", () => {
    const eff: WeaponEffect = { type: "wardSiphon", chance: 1, magnitude: 0.1, durationMs: 0 };
    const t = (k: string): string => (UI_TEXT.en as Record<string, string>)[k] ?? k;
    const satz = weaponEffectProse(eff, t);
    expect(satz).toContain("10%");
    expect(satz).not.toMatch(/\{[a-zA-Z]+\}/);
  });
});
