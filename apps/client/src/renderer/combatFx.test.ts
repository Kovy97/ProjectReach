import { describe, expect, it } from "vitest";
import type { ItemDef, PetAbilityKind } from "@hearthforge/shared";
import { PET_ABILITY_CAP } from "@hearthforge/shared";
import { content } from "@hearthforge/content";
import {
  bloodVariantFor,
  fxSprite,
  magicThemeFor,
  petFxImageFor,
  petFxTargetSide,
  petFxThemeFor,
  slashFamilyFor,
  type PetFxImage,
  type PetFxTheme,
} from "./combatFx";

/** Minimal-Waffe wie in packages/engine/src/*.test.ts (Muster `armor()`/`meleeWeapon()`). */
function weapon(over: Partial<ItemDef>): ItemDef {
  return { id: "test_weapon", name: "test", type: "equipment", stackable: false, ...over } as ItemDef;
}

describe("combatFx — Auto-Discovery (fxSprite)", () => {
  it("liefert eine URL für eines der 33 gelieferten Welle-1-Sprites", () => {
    expect(fxSprite("fx_impact_fire")).toBeTruthy();
    expect(fxSprite("fx_missile_arrow")).toBeTruthy();
    expect(fxSprite("fx_slash_cut")).toBeTruthy();
    expect(fxSprite("fx_blood_ichor")).toBeTruthy();
    expect(fxSprite("fx_pet_bite")).toBeTruthy();
    expect(fxSprite("fx_crit_magic")).toBeTruthy();
    expect(fxSprite("fx_miss_whiff")).toBeTruthy();
  });

  it("liefert null für ein (noch) nicht geliefertes Sprite (Rückfall-Regel)", () => {
    expect(fxSprite("fx_impact_does_not_exist")).toBeNull();
  });
});

describe("magicThemeFor — Familie A (Konzept §2, Chef-D1: alle sieben Themen)", () => {
  it("liest den klassischen Waffeneffekt-Typ (burn/frost/frostbite/shock/poison/plaguebearer)", () => {
    expect(magicThemeFor(weapon({ weaponEffect: { type: "burn", chance: 1, magnitude: 1, durationMs: 1000 } }))).toBe("fire");
    expect(magicThemeFor(weapon({ weaponEffect: { type: "frost", chance: 1, magnitude: 1, durationMs: 1000 } }))).toBe("frost");
    expect(magicThemeFor(weapon({ weaponEffect: { type: "frostbite", chance: 1, magnitude: 1, durationMs: 1000 } }))).toBe("frost");
    expect(magicThemeFor(weapon({ weaponEffect: { type: "shock", chance: 1, magnitude: 1, durationMs: 1000 } }))).toBe("shock");
    expect(magicThemeFor(weapon({ weaponEffect: { type: "poison", chance: 1, magnitude: 1, durationMs: 1000 } }))).toBe("poison");
    expect(magicThemeFor(weapon({ weaponEffect: { type: "plaguebearer", chance: 1, magnitude: 1, durationMs: 1000 } }))).toBe("poison");
    expect(magicThemeFor(weapon({ weaponEffect: { type: "bane", chance: 1, magnitude: 1, durationMs: 1000, targetFamily: "undead" } }))).toBe("void");
    expect(magicThemeFor(weapon({ weaponEffect: { type: "execute", chance: 1, magnitude: 1, durationMs: 1000 } }))).toBe("void");
  });

  it("erkennt Aether-Waffen an der ID (aether_orb — echter Content-Item ohne eigenen Statuseffekt)", () => {
    expect(magicThemeFor(content.items.aether_orb)).toBe("aether");
  });

  it("synthetische aether_/godspark_-Waffe ohne Statuseffekt löst zu 'aether' auf", () => {
    expect(magicThemeFor(weapon({ id: "aether_prototype", weaponType: "staff" }))).toBe("aether");
    expect(magicThemeFor(weapon({ id: "godspark_prototype", weaponType: "wand" }))).toBe("aether");
  });

  // Content-Realität (Stand 2026-08-27, s. Bericht an den Chef): die EINZIGEN zwei echten mainhand-
  // Waffen mit aether_/godspark_-Präfix (aether_runestaff, godspark_staff) tragen beide selbst einen
  // klassischen burn-Effekt — nach der (vom Auftrag vorgegebenen) Prioritätsreihenfolge gewinnt der
  // Status VOR der ID-Erkennung, das "aether"-Thema ist mit dem heutigen Katalog also nie in echt zu
  // sehen. Dieser Test hält die Ist-Reihenfolge fest, damit eine künftige Content-Änderung (Waffe ohne
  // burn) sofort auf "aether" umschlägt, statt dass die Divergenz unbemerkt bleibt.
  it("Elementleiter (Chef-GO 28.08.2026): aether_runestaff/godspark_staff tragen Brand, lösen aber per magicTheme zu 'aether' auf", () => {
    expect(magicThemeFor(content.items.aether_runestaff)).toBe("aether");
    expect(magicThemeFor(content.items.godspark_staff)).toBe("aether");
  });

  it("Priorität: ein klassischer Statuseffekt schlägt eine Aether-ID (Reihenfolge aus dem Auftrag)", () => {
    expect(
      magicThemeFor(weapon({ id: "aether_test_staff", weaponEffect: { type: "burn", chance: 1, magnitude: 1, durationMs: 1000 } })),
    ).toBe("fire");
  });

  it("fällt ohne Status/Aether-ID auf arkan zurück (Standard), bleed zählt NICHT als Magie-Thema", () => {
    expect(magicThemeFor(weapon({ id: "plain_wand" }))).toBe("arcane");
    expect(magicThemeFor(weapon({ id: "plain_wand", weaponEffect: { type: "bleed", chance: 1, magnitude: 1, durationMs: 1000 } }))).toBe(
      "arcane",
    );
    expect(magicThemeFor(null)).toBe("arcane");
    expect(magicThemeFor(undefined)).toBe("arcane");
  });
});

describe("slashFamilyFor — Familie B (Konzept §2)", () => {
  it("mappt jeden Nahkampf-WeaponType auf seine Slash-Familie", () => {
    expect(slashFamilyFor("dagger")).toBe("cut");
    expect(slashFamilyFor("sword")).toBe("cut");
    expect(slashFamilyFor("scimitar")).toBe("cut");
    expect(slashFamilyFor("greatsword")).toBe("heavy");
    expect(slashFamilyFor("greataxe")).toBe("heavy");
    expect(slashFamilyFor("battleaxe")).toBe("heavy");
    expect(slashFamilyFor("axe")).toBe("heavy");
    expect(slashFamilyFor("mace")).toBe("blunt");
    expect(slashFamilyFor("maul")).toBe("blunt");
    expect(slashFamilyFor("spear")).toBe("thrust");
    expect(slashFamilyFor("shortbow")).toBe("arrow");
    expect(slashFamilyFor("longbow")).toBe("arrow");
  });

  it("fällt ohne WeaponType (Gegner-Angriffe haben keine Waffendaten) auf 'cut' zurück", () => {
    expect(slashFamilyFor(undefined)).toBe("cut");
    expect(slashFamilyFor(null)).toBe("cut");
  });
});

describe("bloodVariantFor — Familie C (Konzept §2)", () => {
  it("Skelett-IDs zählen als Knochenstaub, auch wenn family='undead' getaggt ist (echte Content-Daten)", () => {
    expect(content.monsters.skeleton_warrior?.family).toBe("undead"); // Prämisse: Skelette sind NICHT auf construct getaggt
    expect(bloodVariantFor(content.monsters.skeleton_warrior)).toBe("bone");
  });

  it("construct-Familie ist Knochenstaub", () => {
    expect(bloodVariantFor(content.monsters.moss_golem)).toBe("bone");
  });

  it("undead/demon (ohne Skelett-ID) ist Ichor", () => {
    expect(bloodVariantFor(content.monsters.iron_revenant)).toBe("ichor");
    expect(bloodVariantFor(content.monsters.the_imp)).toBe("ichor");
  });

  it("beast/humanoid/dragonkin und fehlendes Monster (Spieler getroffen) sind rotes Blut", () => {
    expect(bloodVariantFor(content.monsters.chicken)).toBe("red");
    expect(bloodVariantFor(undefined)).toBe("red");
    expect(bloodVariantFor(null)).toBe("red");
  });
});

describe("petFxImageFor / petFxTargetSide — Familie D (alle 16 PetAbilityKind-Werte)", () => {
  const allKinds = Object.keys(PET_ABILITY_CAP) as PetAbilityKind[];

  it("deckt jeden PetAbilityKind mit einer der sechs Bildfamilien ab", () => {
    expect(allKinds.length).toBe(25); // claude:2026-10-18T02:00:00+02:00 — 1.3.0: +9 Kinds (Begleiter-Rework)
    const valid: PetFxImage[] = ["bite", "bolt", "ward", "mark", "pilfer", "critstar"];
    for (const kind of allKinds) {
      expect(valid).toContain(petFxImageFor(kind));
    }
  });

  it("mappt die drei Schaden/Kontroll-artigen Kinds auf 'bite', die DoT-Kinds auf 'bolt'", () => {
    expect(petFxImageFor("multiHit")).toBe("bite");
    expect(petFxImageFor("burstDamage")).toBe("bite");
    expect(petFxImageFor("armorRend")).toBe("bite");
    expect(petFxImageFor("delayedDot")).toBe("bolt");
    expect(petFxImageFor("onHitStatus")).toBe("bolt");
  });

  it("mappt Schutz/Heilung auf 'ward', Timing-Sabotage auf 'mark', Diebstahl/Krit separat", () => {
    for (const kind of ["shield", "heal", "blockNextEnemyHit", "wardRestore", "lifestealBurst"] as const) {
      expect(petFxImageFor(kind)).toBe("ward");
    }
    for (const kind of ["accuracyDownEnemy", "enemyAttackDelay", "stun"] as const) {
      expect(petFxImageFor(kind)).toBe("mark");
    }
    expect(petFxImageFor("stealDrop")).toBe("pilfer");
    expect(petFxImageFor("guaranteedCrit")).toBe("critstar");
    expect(petFxImageFor("armorPierceHit")).toBe("critstar");
  });

  it("nur 'ward' zielt auf den Spieler (Schutz/Heilung), alles andere auf den Gegner", () => {
    expect(petFxTargetSide("ward")).toBe("player");
    for (const image of ["bite", "bolt", "mark", "pilfer", "critstar"] as const) {
      expect(petFxTargetSide(image)).toBe("enemy");
    }
  });
});

// petFxThemeFor (Chef-Auftrag 29.08.2026): der Pyreling ("Flame Nova", status:"burn") schoss
// bislang einen stahlfarbenen Blitz statt Feuer — die Begleiter-Partikel kannten kein Element.
// Läuft gegen den echten Content-Katalog (packages/content/src/index.ts `pets`), damit ein
// künftiger Content-Wechsel (neuer status, umgetauftes Pet) den Test sofort bricht statt still
// falsch zu bleiben.
describe("petFxThemeFor — Begleiter-Partikel-Thema (Familie D, Chef-Auftrag 29.08.2026)", () => {
  it("leitet das Thema der sechs Begleiter mit status-Feld über die Elementleiter ab", () => {
    const cases: Array<[string, PetFxTheme]> = [
      // claude:2026-10-18T02:00:00+02:00 — 1.3.0: Element über status ODER das neue Kind (emberBrand/emberDetonate/…).
      ["pyreling", "fire"], // Funkenregen, emberDetonate
      ["slagfiend", "fire"], // Schlackenspritzer, emberBrand
      ["witherling", "poison"], // Blight Bloom, poison (delayedDot)
      ["hemlock", "poison"], // Lähmgift, cripplingPoison
      ["gorehound", "bleed"], // Reißen, executeBleed
    ];
    for (const [id, theme] of cases) {
      const pet = content.pets[id];
      expect(pet, `Pet ${id} fehlt im Content-Katalog`).toBeTruthy();
      expect(petFxThemeFor(pet!)).toBe(theme);
    }
  });

  it("leitet das Thema der fünf status-losen Begleiter über die explizite Tabelle ab", () => {
    const cases: Array<[string, PetFxTheme]> = [
      ["hoarspite", "frost"], // Grave Frost
      ["gemwraith", "arcane"], // Prismatic Lance
      ["glyphmaw", "arcane"], // Rune Feast
      ["vellumoth", "arcane"], // Sigil Ward
      ["charnel", "void"], // Feast of the Fallen
    ];
    for (const [id, theme] of cases) {
      const pet = content.pets[id];
      expect(pet, `Pet ${id} fehlt im Content-Katalog`).toBeTruthy();
      expect(pet!.combatAbility.status).toBeUndefined();
      expect(petFxThemeFor(pet!)).toBe(theme);
    }
  });

  it("Begleiter ohne Treffer bleiben beim heutigen neutralen Aussehen (null)", () => {
    for (const id of ["quillshrike", "gloomrat", "ironmaw", "carrionwing", "ashgut", "carapace"]) {
      const pet = content.pets[id];
      expect(pet, `Pet ${id} fehlt im Content-Katalog`).toBeTruthy();
      expect(petFxThemeFor(pet!)).toBeNull();
    }
  });
});
