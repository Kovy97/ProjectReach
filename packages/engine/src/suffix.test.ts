import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { ActionDef, ContentDB, ItemDef, ItemInstance, SuffixDef } from "@hearthforge/shared";
import { DEFAULT_CRAFT_SUFFIX_CHANCE, instanceBonusDelta } from "@hearthforge/shared";
import { createGame } from "./state";
import { rollSuffix, suffixPool, tryCraftSuffix } from "./suffix";
import { setActiveAction } from "./actions";
import { advance } from "./tick";
import { addItem, expandBaseCapacity, getInstance } from "./inventory";
import { equipInstance, equipItem } from "./equipment";
import { computeStats } from "./character";

/**
 * Test-Content mit Suffix-Pool + Basis-Equipment. Der echte Pool kommt von content-dev; hier
 * injizieren wir ihn, um das Engine-Fundament headless zu prüfen (wie enchant.test.ts für Affixe).
 */
function suffixContent(): ContentDB {
  const sword: ItemDef = {
    id: "test_sword",
    name: { en: "Test Sword", de: "Testschwert" },
    type: "equipment",
    slot: "mainhand",
    weaponStyle: "melee",
    stackable: false,
  };
  const bull: SuffixDef = {
    id: "suffix_bull",
    suffix: { en: "of the Bull", de: "des Stiers" },
    appliesTo: ["weapon_melee"],
    statsPerIlvl: { meleeDamage: 0.7 },
    // k auf der aktuellen Attributskala (Rundung seit Itemization 2.0 §1.2 ganzzahlig, min 1).
    attrPerIlvl: { str: 0.225 },
    weight: 100,
  };
  const wolf: SuffixDef = {
    id: "suffix_wolf",
    suffix: { en: "of the Wolf", de: "des Wolfes" },
    appliesTo: ["weapon_melee"],
    statsPerIlvl: { meleeDamage: 0.55 },
    softStats: ["attackIntervalMs"],
    weight: 60,
    minIlvl: 10,
  };
  const magus: SuffixDef = {
    id: "suffix_magus",
    suffix: { en: "of the Magus", de: "des Magus" },
    appliesTo: ["weapon_magic"],
    statsPerIlvl: { magicDamage: 0.7 },
    weight: 100,
  };
  return {
    ...content,
    suffixes: { suffix_bull: bull, suffix_wolf: wolf, suffix_magus: magus },
    items: { ...content.items, test_sword: sword },
  };
}

describe("suffix system (random rolls)", () => {
  it("rollSuffix ist deterministisch (gleicher Seed → gleicher Roll)", () => {
    const c = suffixContent();
    const sword = c.items.test_sword!;
    const a = createGame({ name: "A" }, c, 1234);
    const b = createGame({ name: "B" }, c, 1234);
    const ra = rollSuffix(a, c, sword, 50, 1);
    const rb = rollSuffix(b, c, sword, 50, 1);
    expect(ra).toBeDefined();
    expect(ra).toEqual(rb);
    expect(a.rng.state).toBe(b.rng.state); // identische RNG-Sequenz konsumiert
  });

  it("zieht KEINEN RNG, wenn kein Suffix möglich ist (Determinismus-Disziplin)", () => {
    const c = suffixContent();
    const sword = c.items.test_sword!;
    const s = createGame({ name: "X" }, c, 7);
    const before = s.rng.state;
    expect(rollSuffix(s, c, sword, 50, 0)).toBeUndefined(); // Chance 0
    expect(s.rng.state).toBe(before);
    expect(rollSuffix(s, { ...c, suffixes: undefined }, sword, 50, 1)).toBeUndefined(); // kein Pool
    expect(s.rng.state).toBe(before);
  });

  it("filtert den Pool nach Item-Typ und minIlvl (Schwert zieht nie Magier-Suffix)", () => {
    const c = suffixContent();
    const sword = c.items.test_sword!;
    const low = suffixPool(c, sword, 5).map((d) => d.id);
    expect(low).toEqual(["suffix_bull"]); // wolf gated (minIlvl 10), magus typ-gefiltert
    const high = suffixPool(c, sword, 50).map((d) => d.id);
    expect(high).toEqual(["suffix_bull", "suffix_wolf"]); // sortiert, ohne magus
  });

  it("Stat-Overlay: instanceBonusDelta rechnet den Suffix-Bonus mit (lineare Stats + Attribute)", () => {
    const c = suffixContent();
    const inst: ItemInstance = {
      instanceId: "inst_bull",
      baseItemId: "test_sword",
      affixes: [],
      suffix: { suffixId: "suffix_bull", ilvl: 100, roll: 1 },
    };
    const delta = instanceBonusDelta(inst, c);
    expect(delta.bonus.meleeDamage).toBe(14); // 0.7 · S(100)=20 · variance(1)=1 → 14
    expect(delta.modifiers.str).toBe(5); // 0.225 · 20 = 4.5 → round half-up 5 (ganzzahlig, §1.2)
  });

  it("Stat-Overlay: Soft-Stats (Speed) nutzen die gedeckelte Endpunkt-Skala, nicht 20× linear", () => {
    const c = suffixContent();
    const inst: ItemInstance = {
      instanceId: "inst_wolf",
      baseItemId: "test_sword",
      affixes: [],
      suffix: { suffixId: "suffix_wolf", ilvl: 100, roll: 1 },
    };
    const delta = instanceBonusDelta(inst, c);
    expect(delta.bonus.meleeDamage).toBe(11); // 0.55 · 20 → 11
    expect(delta.bonus.attackIntervalMs).toBe(-250); // gedeckelter Endpunkt bei ilvl100 (Chef #9: von -150 angehoben)
  });

  it("Attack-Speed-Suffix wirkt schon am Mindest-ilvl spuerbar (Chef #9: kein -0.0s)", () => {
    // Regression: die alten Endpunkte (-15..-150) rundeten bei niedrigem ilvl auf ~-20 ms und damit in
    // der Sekunden-Anzeige auf -0.0s. Am Suffix-Mindest-ilvl (10) muss der Bonus jetzt eine echte,
    // in -0.1s sichtbare Groessenordnung haben (<= -50 ms).
    const c = suffixContent();
    const inst: ItemInstance = {
      instanceId: "inst_wolf_low",
      baseItemId: "test_sword",
      affixes: [],
      suffix: { suffixId: "suffix_wolf", ilvl: 10, roll: 1 },
    };
    const delta = instanceBonusDelta(inst, c);
    expect(delta.bonus.attackIntervalMs).toBeDefined();
    expect(delta.bonus.attackIntervalMs!).toBeLessThanOrEqual(-50); // echte Beschleunigung, rundet nicht auf 0
    expect(delta.bonus.attackIntervalMs!).toBeLessThan(0); // senkt das Intervall (schneller), nie positiv
  });

  it("Stat-Overlay: unbekannte Suffix-ID wird defensiv übersprungen (kein Crash)", () => {
    const c = suffixContent();
    const inst: ItemInstance = {
      instanceId: "inst_unknown",
      baseItemId: "test_sword",
      affixes: [],
      suffix: { suffixId: "suffix_does_not_exist", ilvl: 50, roll: 0.5 },
    };
    const delta = instanceBonusDelta(inst, c);
    expect(delta.bonus).toEqual({});
    expect(delta.modifiers).toEqual({});
  });

  it("Apply-Hook tryCraftSuffix: erzeugt eine Suffix-Instanz und schleust sie ins Inventar", () => {
    const c = suffixContent();
    // Chance ist bei 0.95 gedeckelt → über mehrere Seeds wird zuverlässig mind. ein Suffix gerollt.
    let s = createGame({ name: "Crafter" }, c, 1);
    let res = tryCraftSuffix(s, c, "test_sword", 50, 1);
    for (let seed = 2; !res && seed < 30; seed++) {
      s = createGame({ name: "Crafter" }, c, seed);
      res = tryCraftSuffix(s, c, "test_sword", 50, 1);
    }
    expect(res).not.toBeNull();
    expect(res!.instance.suffix?.suffixId).toMatch(/^suffix_/);
    expect(res!.instance.baseItemId).toBe("test_sword");
    expect(res!.intake.kept).toBe(true);
    expect(s.nextInstanceSeq).toBe(1);
    const held = s.inventory.instances.find((i) => i.instanceId === res!.instance.instanceId);
    expect(held?.suffix).toBeDefined();
  });

  it("Schmuck-Boost-Suffixe (Itemization 2.0 §7): jewelry-Tag matcht Ringe, boostPerIlvl rollt 1..3", () => {
    const ring: ItemDef = {
      id: "test_ring",
      name: { en: "Test Ring", de: "Testring" },
      type: "equipment",
      slot: "ring1",
      stackable: false,
    };
    const brute: SuffixDef = {
      id: "suffix_brute",
      suffix: { en: "of the Brute", de: "des Schlägers" },
      appliesTo: ["jewelry"],
      boostPerIlvl: { power: 0.12 },
      weight: 40,
      minIlvl: 15,
    };
    // Hoher k-Wert zum Beweis des harten 1..3-Deckels (§7: clamp(max(1, round(k·S·var)), 1, 3)).
    const bulwark: SuffixDef = {
      id: "suffix_bulwark_test",
      suffix: { en: "of the Bulwark", de: "des Bollwerks" },
      appliesTo: ["jewelry"],
      boostPerIlvl: { defence: 0.5 },
      weight: 40,
    };
    const c: ContentDB = {
      ...content,
      suffixes: { suffix_brute: brute, suffix_bulwark_test: bulwark },
      items: { ...content.items, test_ring: ring },
    };

    // Pool-Filter: der Ring (jewelry) matcht beide; ein Schwert (weapon_melee) keinen.
    expect(suffixPool(c, ring, 50).map((d) => d.id)).toEqual(["suffix_brute", "suffix_bulwark_test"]);
    expect(suffixPool(c, c.items.rusty_sword!, 50)).toEqual([]);

    const boostAt = (suffixId: string, ilvl: number, roll: number) =>
      instanceBonusDelta(
        { instanceId: "i", baseItemId: "test_ring", affixes: [], suffix: { suffixId, ilvl, roll } },
        c,
      ).skillBoost;
    // Früh: min 1 (0.12 · S(15)=2.5 · 0.85 ≈ 0.26 → round 0 → min 1).
    expect(boostAt("suffix_brute", 15, 0)).toEqual({ power: 1 });
    // ilvl 100, top-roll: 0.12 · 20 · 1 = 2.4 → 2 (ganzzahlig).
    expect(boostAt("suffix_brute", 100, 1)).toEqual({ power: 2 });
    // Deckel: 0.5 · 20 = 10 → hart auf 3 geclamped.
    expect(boostAt("suffix_bulwark_test", 100, 1)).toEqual({ defence: 3 });

    // Wirkung über computeStats: der gerollte Defence-Boost wird aggregiert (skillBoosts). Rüstungs-
    // Trinität / Itemization 2.5 (armor-trinity-spec §1.1/§1.3/§3): er speist KEINEN Kampfterm mehr —
    // defense kommt nur aus armorRating, evasion nur aus DEX-Kern → beide unverändert zur Basis.
    const s = createGame({ name: "X" }, c, 1);
    const before = computeStats(s, c);
    s.character.equipment.ring1 = "test_ring";
    s.character.equippedInstances.ring1 = {
      instanceId: "inst_bulwark",
      baseItemId: "test_ring",
      affixes: [],
      suffix: { suffixId: "suffix_bulwark_test", ilvl: 100, roll: 1 },
    };
    const after = computeStats(s, c);
    expect(after.skillBoosts).toEqual({ defence: 3 });
    expect(after.defense).toBeCloseTo(before.defense, 10);
    expect(after.evasion).toBeCloseTo(before.evasion, 10);
  });

  it("Apply-Hook: nicht-Equipment-Basis bekommt nie einen Suffix", () => {
    const c = suffixContent();
    const s = createGame({ name: "X" }, c, 1);
    const before = s.rng.state;
    // Ein Material-Item (kein Equipment) → null, ohne RNG.
    const matId = Object.values(c.items).find((i) => i.type === "material")?.id ?? "item_scrap";
    expect(tryCraftSuffix(s, c, matId, 50, 1)).toBeNull();
    expect(s.rng.state).toBe(before);
  });
});

/**
 * Craft-Trigger-Guard: beweist, dass eine abgeschlossene Equipment-Craft-Aktion über den tick.ts-
 * Pfad (completeAction) tatsächlich Suffix-Instanzen erzeugt — scharfgeschaltet. Mit hoher Chance
 * deterministisch Suffixe, mit Chance 0 keiner, und ohne explizite Chance greift der globale Default.
 */
function craftContent(suffixChance?: number): ContentDB {
  const base = suffixContent();
  const bar: ItemDef = {
    id: "test_bar",
    name: { en: "Test Bar", de: "Testbarren" },
    type: "material",
    stackable: true,
  };
  const action: ActionDef = {
    id: "craft_test_sword",
    name: { en: "Forge Test Sword", de: "Testschwert schmieden" },
    skill: "smithing",
    durationMs: 100,
    xp: 5,
    inputs: [{ itemId: "test_bar", qty: 1 }],
    loot: [{ itemId: "test_sword", chance: 1, min: 1, max: 1 }],
    ...(suffixChance !== undefined ? { suffixChance } : {}),
  };
  return {
    ...base,
    items: { ...base.items, test_bar: bar },
    actions: { ...base.actions, craft_test_sword: action },
  };
}

/** Zählt gehaltene Equipment-Instanzen mit Suffix in der Inventar-Tasche. */
function suffixInstancesIn(inv: ReturnType<typeof createGame>["inventory"]): number {
  return inv.instances.filter((i) => i.suffix).length;
}

function runCrafts(c: ContentDB, seed: number, gameMs: number) {
  const s = createGame({ name: "Crafter" }, c, seed);
  expandBaseCapacity(s.inventory, content, 4000);
  addItem(s.inventory, c, "test_bar", 10_000);
  setActiveAction(s, c, "craft_test_sword");
  advance(s, c, gameMs);
  return s;
}

describe("suffix craft-trigger (tick.ts scharfgeschaltet)", () => {
  it("Equipment-Craft mit hoher suffixChance erzeugt deterministisch Suffix-Instanzen", () => {
    const c = craftContent(1); // → auf SUFFIX_CHANCE_CAP (0.95) gedeckelt
    const s = runCrafts(c, 42, 3_000); // ~30 Crafts à 100 ms
    const made = suffixInstancesIn(s.inventory);
    expect(made).toBeGreaterThan(0);
    // Reproduzierbar: gleicher Seed → exakt gleiche Anzahl.
    const s2 = runCrafts(c, 42, 3_000);
    expect(suffixInstancesIn(s2.inventory)).toBe(made);
  });

  it("Equipment-Craft mit suffixChance 0 erzeugt NIE eine Suffix-Instanz", () => {
    const c = craftContent(0);
    const s = runCrafts(c, 42, 3_000);
    expect(suffixInstancesIn(s.inventory)).toBe(0);
    // Alle Ausgaben bleiben gewöhnliche Stacks/Plain-Items (keine Instanzen in der Tasche).
    expect(s.inventory.instances).toHaveLength(0);
  });

  it("ohne explizite Chance greift der globale DEFAULT_CRAFT_SUFFIX_CHANCE", () => {
    expect(DEFAULT_CRAFT_SUFFIX_CHANCE).toBeGreaterThan(0);
    const c = craftContent(undefined); // weder LootRoll- noch ActionDef-Chance gesetzt
    const s = runCrafts(c, 7, 6_000); // ~60 Crafts → bei ~20 % praktisch sicher ≥1 Suffix
    expect(suffixInstancesIn(s.inventory)).toBeGreaterThan(0);
  });

  it("Stat-Overlay-Wirkung: ein gecraftetes Suffix-Schwert hebt computeStats (str/meleeDamage)", () => {
    // Vergleich gegen DASSELBE Basis-Schwert OHNE Suffix isoliert die reine Suffix-Wirkung (der
    // Charakter trägt eine Starter-Waffe; absolutes Vorher/Nachher würde deren Basis-Schaden mischen).
    const c = craftContent(1);
    const withSuffix = runCrafts(c, 42, 3_000);
    const suffixInst = withSuffix.inventory.instances.find((i) => i.suffix);
    expect(suffixInst).toBeDefined();
    expect(equipInstance(withSuffix, c, suffixInst!.instanceId).ok).toBe(true);
    const suffixStats = computeStats(withSuffix, c);

    const plain = createGame({ name: "Plain" }, c, 42);
    addItem(plain.inventory, c, "test_sword", 1); // plaines, suffixloses Basis-Schwert
    expect(equipItem(plain, c, "test_sword").ok).toBe(true);
    const plainStats = computeStats(plain, c);

    // suffix_bull (der einzige bei niedrigem ilvl mögliche Pool-Eintrag) gibt meleeDamage + str.
    expect(suffixStats.meleeDamage).toBeGreaterThan(plainStats.meleeDamage);
    expect(suffixStats.attributes.str).toBeGreaterThan(plainStats.attributes.str);
  });
});

// ───────────────────────────────────────────────────────────────────────────
