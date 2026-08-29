import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { UI_TEXT } from "../i18n/translations";

/**
 * Guard-Test (Review 1.2.0 P2, „kein Test prüft, dass jeder Pet-Kind/-Ability einen Text-Key
 * hat — genau da fehlten heute vier Keys"): läuft über den TATSÄCHLICHEN Content-Katalog (nicht
 * nur die geschlossene Typ-Taxonomie in shared/index.ts) und verlangt für jedes vorkommende
 * `skillEffect.kind`/`combatAbility.kind` beide Text-Familien, die die UI tatsächlich liest:
 *  - `pet.effect.skill.<kind>` (PetGalleryPage.tsx, kurzes Label) UND `pet.passive.<kind>`
 *    (util/petText.ts `passiveText`, voller Satz mit echten Zahlen).
 *  - `pet.effect.combat.<kind>` (PetGalleryPage.tsx) UND `pet.ability.<kind>` (util/petText.ts
 *    `abilityBody`).
 * Prüft `UI_TEXT.en`/`UI_TEXT.de` DIREKT statt über `t()` — `t()` fällt bei einer fehlenden
 * Übersetzung still auf `en` und dann auf den rohen Key zurück (s. i18n/index.tsx), genau das
 * würde die Lücke verschlucken, die dieser Test finden soll (traf `pet.effect.skill.bonusAmmo`,
 * s. Fix daneben).
 */
describe("Pet-Texte — jedes Content-Kind hat en+de Keys (Guard, Review 1.2.0 P2)", () => {
  const pets = Object.values(content.pets);
  const skillKinds = Array.from(new Set(pets.map((p) => p.skillEffect.kind))).sort();
  const abilityKinds = Array.from(new Set(pets.map((p) => p.combatAbility.kind))).sort();

  it("hat mindestens ein skillEffect- und ein combatAbility-Kind zu prüfen (Guard lebt)", () => {
    expect(pets.length).toBeGreaterThan(0);
    expect(skillKinds.length).toBeGreaterThan(0);
    expect(abilityKinds.length).toBeGreaterThan(0);
  });

  for (const kind of skillKinds) {
    it(`skillEffect.kind "${kind}": pet.effect.skill.${kind} existiert in en UND de`, () => {
      expect(UI_TEXT.en[`pet.effect.skill.${kind}`]).toBeTypeOf("string");
      expect(UI_TEXT.de?.[`pet.effect.skill.${kind}`]).toBeTypeOf("string");
    });

    it(`skillEffect.kind "${kind}": pet.passive.${kind} existiert in en UND de`, () => {
      expect(UI_TEXT.en[`pet.passive.${kind}`]).toBeTypeOf("string");
      expect(UI_TEXT.de?.[`pet.passive.${kind}`]).toBeTypeOf("string");
    });
  }

  for (const kind of abilityKinds) {
    it(`combatAbility.kind "${kind}": pet.effect.combat.${kind} existiert in en UND de`, () => {
      expect(UI_TEXT.en[`pet.effect.combat.${kind}`]).toBeTypeOf("string");
      expect(UI_TEXT.de?.[`pet.effect.combat.${kind}`]).toBeTypeOf("string");
    });

    it(`combatAbility.kind "${kind}": pet.ability.${kind} existiert in en UND de`, () => {
      expect(UI_TEXT.en[`pet.ability.${kind}`]).toBeTypeOf("string");
      expect(UI_TEXT.de?.[`pet.ability.${kind}`]).toBeTypeOf("string");
    });
  }
});
