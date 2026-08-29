import { describe, expect, it } from "vitest";
import { hasRecipe, registerRecipe, selectRecipe } from "./fxParticles";
// Seiteneffekt-Import: registriert alle Bibliotheks-Rezepte (Feuer/Blitz/Frost/Gift/Arkan/Leere/
// Aether, Nahkampf, Pfeil, Trefferreaktionen, Begleiter, Status-Körpereffekte) unter denselben
// Schlüsseln wie die Mira-Sprites (`combatFx.ts`) — ohne diesen Import wäre die Registry für
// diese Tests leer (CombatPage importiert sie genauso, nur wegen des Seiteneffekts).
import "./fxParticleLibrary";

describe("fxParticles — Rezept-Registry (Kampfeffekte Partikel-Schicht, Chef-Entscheid 28.08.2026)", () => {
  it("liefert null für einen unbekannten Schlüssel", () => {
    expect(selectRecipe("kein_rezept_registriert_xyz", false, new Map())).toBeNull();
    expect(hasRecipe("kein_rezept_registriert_xyz")).toBe(false);
  });

  it("registrierte Schlüssel sind über hasRecipe auffindbar", () => {
    registerRecipe("test_has_key", [() => {}]);
    expect(hasRecipe("test_has_key")).toBe(true);
  });

  it("wählt bei crit=true immer die Crit-Variante, egal welche normale Variante zuletzt lief", () => {
    const v1: () => void = () => {};
    const v2: () => void = () => {};
    const critFn: () => void = () => {};
    registerRecipe("test_crit_vorrang", [v1, v2], critFn);
    const lastVariant = new Map<string, number>();
    // ein paar normale Picks zuerst, damit ein "zuletzt gespielt"-Zustand existiert
    selectRecipe("test_crit_vorrang", false, lastVariant);
    for (let i = 0; i < 20; i++) {
      const picked = selectRecipe("test_crit_vorrang", true, lastVariant);
      expect(picked?.run).toBe(critFn);
      expect(picked?.index).toBe(-1);
    }
  });

  it("crit fällt ohne registrierte Crit-Variante auf die normale Pool-Auswahl zurück", () => {
    const v1: () => void = () => {};
    const v2: () => void = () => {};
    registerRecipe("test_crit_ohne_sonderdatei", [v1, v2]);
    const picked = selectRecipe("test_crit_ohne_sonderdatei", true, new Map());
    expect(picked).not.toBeNull();
    expect([v1, v2]).toContain(picked!.run);
  });

  it("wiederholt bei mehreren Varianten nie zweimal hintereinander denselben Index", () => {
    const variants = [() => {}, () => {}, () => {}, () => {}];
    registerRecipe("test_kein_repeat", variants);
    const lastVariant = new Map<string, number>();
    let prev = -1;
    for (let i = 0; i < 300; i++) {
      const picked = selectRecipe("test_kein_repeat", false, lastVariant);
      expect(picked).not.toBeNull();
      expect(picked!.index).not.toBe(prev);
      prev = picked!.index;
    }
  });

  it("ein einziger Varianten-Eintrag liefert immer denselben (kein Pool zum Vermeiden nötig)", () => {
    const only: () => void = () => {};
    registerRecipe("test_einzelvariante", [only]);
    const lastVariant = new Map<string, number>();
    for (let i = 0; i < 5; i++) {
      const picked = selectRecipe("test_einzelvariante", false, lastVariant);
      expect(picked?.run).toBe(only);
      expect(picked?.index).toBe(0);
    }
  });

  it("ein leerer Varianten-Pool (ohne Crit-Treffer) liefert null", () => {
    registerRecipe("test_leerer_pool", []);
    expect(selectRecipe("test_leerer_pool", false, new Map())).toBeNull();
  });
});

describe("fxParticleLibrary — vollständige Abdeckung (Chef-Wunsch 28.08.2026: alle Waffen)", () => {
  const MAGIC_THEMES = ["arcane", "fire", "frost", "shock", "poison", "void", "aether"] as const;
  const SLASH_FAMILIES = ["cut", "heavy", "blunt", "thrust"] as const;
  const BLOOD_VARIANTS = ["red", "ichor", "bone"] as const;
  const PET_IMAGES = ["bite", "bolt", "ward", "mark", "pilfer", "critstar"] as const;
  // Elementar-Effekte (28.08.2026): "void" (Entzug) ist als sechster StatusType dazugekommen.
  const STATUS_TYPES = ["burn", "frost", "shock", "poison", "bleed", "void"] as const;

  it("jedes der sieben Magie-Themen hat Geschoss- UND Einschlag-Rezepte", () => {
    for (const theme of MAGIC_THEMES) {
      expect(hasRecipe(`missile_${theme}`)).toBe(true);
      expect(hasRecipe(`impact_${theme}`)).toBe(true);
    }
  });

  it("jede der vier Nahkampf-Familien hat ein Slash-Rezept", () => {
    for (const family of SLASH_FAMILIES) {
      expect(hasRecipe(`slash_${family}`)).toBe(true);
    }
  });

  it("Pfeil hat Geschoss- UND Einschlag-Rezept", () => {
    expect(hasRecipe("missile_arrow")).toBe(true);
    expect(hasRecipe("impact_arrow")).toBe(true);
  });

  it("jede Blutvariante, Block und Fehlschlag haben ein Rezept", () => {
    for (const variant of BLOOD_VARIANTS) {
      expect(hasRecipe(`blood_${variant}`)).toBe(true);
    }
    expect(hasRecipe("impact_block")).toBe(true);
    expect(hasRecipe("miss_whiff")).toBe(true);
  });

  // P2-Fix (Review 1.2.0): Magie-Treffer bekommen ihre eigene Trefferreaktion (gedämpfte Funken-/
  // Motes statt Blut, s. fxParticleLibrary.ts `magicHitReaction`/CombatPage.tsx
  // `playParticleMagicBlood`) — je der sieben Magie-Themen, nicht die drei Blutvarianten.
  it("jedes der sieben Magie-Themen hat eine eigene Trefferreaktion statt Blut", () => {
    for (const theme of MAGIC_THEMES) {
      expect(hasRecipe(`blood_magic_${theme}`)).toBe(true);
    }
  });

  it("jede der sechs Begleiter-Bildfamilien hat ein Rezept", () => {
    for (const image of PET_IMAGES) {
      expect(hasRecipe(`pet_${image}`)).toBe(true);
    }
  });

  it("jeder StatusType hat ein Aufflammen- UND ein Ambient-Rezept", () => {
    for (const type of STATUS_TYPES) {
      expect(hasRecipe(`status_${type}`)).toBe(true);
      expect(hasRecipe(`statusAmbient_${type}`)).toBe(true);
    }
  });

  // Elementar-Effekte (28.08.2026): eigenes Eiskristall-Platzen für `missReason:"frozen"`
  // (dritte Frost-Anwendung in Folge), getrennt vom laufenden status_frost/statusAmbient_frost.
  it("Einfrieren (dritte Frost-Anwendung) hat ein eigenes Platz-Rezept", () => {
    expect(hasRecipe("status_frozen")).toBe(true);
  });

  it("Feuer-Geschoss hat drei Varianten plus eine separate Crit-Variante (Serie exakt portiert)", () => {
    const lastVariant = new Map<string, number>();
    const seen = new Set<number>();
    for (let i = 0; i < 100; i++) {
      const picked = selectRecipe("missile_fire", false, lastVariant);
      seen.add(picked!.index);
    }
    expect(seen).toEqual(new Set([0, 1, 2]));
    const critPicked = selectRecipe("missile_fire", true, new Map());
    expect(critPicked?.index).toBe(-1);
  });

  it("jedes der 3-Varianten-Magiethemen liefert tatsächlich alle drei Indizes über viele Ziehungen", () => {
    for (const key of ["missile_frost", "missile_poison", "missile_arcane", "missile_void", "missile_aether", "missile_shock", "impact_frost", "impact_poison", "impact_arcane", "impact_void", "impact_aether", "impact_shock", "impact_fire"]) {
      const lastVariant = new Map<string, number>();
      const seen = new Set<number>();
      for (let i = 0; i < 150; i++) {
        const picked = selectRecipe(key, false, lastVariant);
        expect(picked).not.toBeNull();
        seen.add(picked!.index);
      }
      expect(seen).toEqual(new Set([0, 1, 2]));
    }
  });
});
