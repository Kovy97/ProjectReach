import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { ContentDB, EliteZoneState } from "@hearthforge/shared";
import { ELITE_WINDOW_MS, TICK_MS, eliteZoneCooldownBand } from "@hearthforge/shared";
import { createGame } from "./state";
import { advance, step } from "./tick";
import { combatStep } from "./combat";
import { createRng } from "./rng";
import {
  deriveEliteRngSeed,
  eliteScaledMonster,
  eliteVariantsForZone,
  initEliteZonesEarlyHook,
  initEliteZonesStaggered,
  onEliteKilled,
  startEliteCombat,
} from "./elites";

/**
 * Elite-/World-Spawns — Phase 1 (design/elite-spawns-concept.md + design/elite-balance-spec.md).
 * `content` (real, packages/content) hat eine LEERE `elites`-Registry (Phase 1 verhaltens-neutral) —
 * diese Suite testet die Mechanik daher über eine ISOLIERTE Test-Content-Überlagerung (Muster
 * paragon.test.ts): reale Zonen/Monster/Items/Suffixe (aus `...content`), aber eine eigene,
 * kontrollierte `elites`-Variante.
 */
const TEST_UNIQUE_ITEM = "rusty_sword"; // reales Equipment-Item; content.suffixes trägt einen
// minIlvl:1-Pool für "weapon_melee" (suffix_bear) → der garantierte Suffix-Roll landet zuverlässig.

const TEST_VARIANT = {
  id: "test_elite_pastures",
  zone: "pastures", // ungegatete Start-Zone (kein requiresQuest)
  baseMonsterId: "chicken", // L1-Basis-Mob der Pastures
  name: { en: "Test Elite Chicken" },
  statMults: { hp: 5, damage: 1.2 },
  uniqueItemId: TEST_UNIQUE_ITEM,
  // Chef-Korrektur 2026-07-22: Unique ist KEIN Garantie-Drop mehr (Default 0.2) — die meisten Tests
  // hier wollen einen DETERMINISTISCHEN Kill-Pfad, daher explizit auf 1 gesetzt (uniqueDropChance
  // selbst wird eigens unten getestet).
  uniqueDropChance: 1,
  uniqueSuffixChance: 1,
} as const;

const TEST_CONTENT: ContentDB = {
  ...content,
  elites: { [TEST_VARIANT.id]: TEST_VARIANT },
};

// TS' `in`-Control-Flow-Narrowing ist auf `EliteZoneState` (ein strukturelles, nicht diskriminiertes
// Union) unzuverlässig (excess-property-Ambiguität) — hier stattdessen ein Extract-basierter,
// runtime-geprüfter Cast. Hält die Tests lesbar, ohne `as unknown as …` an jeder Stelle.
type ActiveElite = Extract<EliteZoneState, { variantId: string }>;
type RestingElite = Extract<EliteZoneState, { cooldownMs: number }>;
function asActive(entry: EliteZoneState): ActiveElite {
  expect("variantId" in entry, "erwartet Aktiv-Zustand").toBe(true);
  return entry as ActiveElite;
}
function asResting(entry: EliteZoneState): RestingElite {
  expect("variantId" in entry, "erwartet Ruhe-Zustand").toBe(false);
  return entry as RestingElite;
}

describe("Elite-/World-Spawns — Zyklus (tickEliteSpawns via step())", () => {
  it("spawnt in einer freigeschalteten Zone mit Variante bei Fälligkeit — Breadcrumb+Seq gesetzt, Fenster FEST 15 Min", () => {
    const s = createGame({ name: "Elite" }, TEST_CONTENT, 1);
    s.eliteZones.pastures = { cooldownMs: TICK_MS }; // in einem Tick fällig
    const prevSeq = s.eliteSpawnSeq;

    step(s, TEST_CONTENT, false);

    const entry = asActive(s.eliteZones.pastures);
    expect(entry.variantId).toBe(TEST_VARIANT.id);
    expect(entry.remainingMs).toBe(ELITE_WINDOW_MS); // FEST, keine Varianz (balance-spec §3)
    expect(s.eliteSpawnSeq).toBe(prevSeq + 1);
    expect(s.lastEliteSpawn).toEqual({
      zoneId: "pastures",
      variantId: TEST_VARIANT.id,
      seq: s.eliteSpawnSeq,
    });
  });

  it("despawnt nach Ablauf des Fensters (ohne laufenden Kampf) mit frischem Cooldown im PER-ZONE-Band", () => {
    const s = createGame({ name: "Elite" }, TEST_CONTENT, 2);
    s.eliteZones.pastures = { variantId: TEST_VARIANT.id, remainingMs: TICK_MS }; // gleich fällig
    step(s, TEST_CONTENT, false); // Fenster läuft ab (kein aktiver Kampf gegen diese Variante)

    const rested = asResting(s.eliteZones.pastures);
    const band = eliteZoneCooldownBand("pastures");
    expect(rested.cooldownMs).toBeGreaterThanOrEqual(band.minMs);
    expect(rested.cooldownMs).toBeLessThanOrEqual(band.maxMs);
  });

  it("gesperrte Zone spawnt nicht — Cooldown bleibt fällig stehen (kein Busy-Loop, kein RNG-Zug)", () => {
    const s = createGame({ name: "Locked" }, TEST_CONTENT, 3);
    // "borderlands" ist per Default gesperrt (requiresQuest chronicle_03, nicht erfüllt). Damit NUR
    // das Zonen-Gate isoliert getestet wird (nicht "keine Variante"), bekommt sie künstlich eine.
    const gatedContent: ContentDB = {
      ...TEST_CONTENT,
      elites: {
        ...TEST_CONTENT.elites,
        test_elite_borderlands: { ...TEST_VARIANT, id: "test_elite_borderlands", zone: "borderlands" },
      },
    };
    s.eliteZones.borderlands = { cooldownMs: TICK_MS };
    const rngBefore = s.eliteRng.state;

    for (let i = 0; i < 50; i++) step(s, gatedContent, false);

    const entry = asResting(s.eliteZones.borderlands);
    expect(entry.cooldownMs).toBe(0); // fällig, aber gesperrt → bleibt fällig stehen
    expect(s.eliteRng.state).toBe(rngBefore); // kein einziger RNG-Zug
    expect(s.lastEliteSpawn).toBeNull();
  });

  it("Zone ohne Elite-Variante spawnt nicht (auch wenn ungegatet)", () => {
    const s = createGame({ name: "NoVariant" }, TEST_CONTENT, 4);
    // "slayer_tower" ist ungegatet, aber TEST_CONTENT.elites hat keinen Eintrag für sie.
    s.eliteZones.slayer_tower = { cooldownMs: TICK_MS };
    const rngBefore = s.eliteRng.state;

    for (let i = 0; i < 50; i++) step(s, TEST_CONTENT, false);

    const entry = asResting(s.eliteZones.slayer_tower);
    expect(entry.cooldownMs).toBe(0);
    expect(s.eliteRng.state).toBe(rngBefore);
  });

  it("leere elites-Registry: NIE ein Spawn, egal wie viele Zonen fällig sind", () => {
    // Content-dev Phase 2 (2026-07-22, design/elite-balance-spec.md) hat `content.elites` mit den
    // 28 echten Varianten befüllt — der reale Content ist ab jetzt NICHT mehr leer. Der eigentliche
    // Zweck dieses Tests (eine leere Registry darf NIE spawnen) bleibt unverändert wichtig, jetzt
    // über eine EXPLIZITE leere Überlagerung statt über die (nicht mehr zutreffende) Phase-1-
    // Annahme "der echte Content ist leer".
    const EMPTY_ELITES_CONTENT: ContentDB = { ...content, elites: {} };
    const s = createGame({ name: "EmptyElites" }, EMPTY_ELITES_CONTENT, 5);
    for (const zoneId of Object.keys(s.eliteZones)) {
      s.eliteZones[zoneId] = { cooldownMs: TICK_MS };
    }
    for (let i = 0; i < 30; i++) step(s, EMPTY_ELITES_CONTENT, false);
    for (const entry of Object.values(s.eliteZones)) {
      expect("variantId" in entry).toBe(false);
    }
    expect(s.lastEliteSpawn).toBeNull();
    expect(s.eliteSpawnSeq).toBe(0);
  });
});

describe("Elite-/World-Spawns — Online-only (Determinismus-/offline==online-Gesetz)", () => {
  it("der Zyklus läuft NUR online; die Kern-Progression bleibt trotzdem offline==online bit-identisch", () => {
    const ACTION = "mine_copper";
    const SEED = 777;
    const TOTAL_TICKS = 400;

    const online = createGame({ name: "X" }, TEST_CONTENT, SEED);
    online.eliteZones.pastures = { cooldownMs: TICK_MS };
    online.activeActionId = ACTION;
    for (let k = 0; k < TOTAL_TICKS; k++) advance(online, TEST_CONTENT, TICK_MS);

    const offline = createGame({ name: "X" }, TEST_CONTENT, SEED);
    offline.eliteZones.pastures = { cooldownMs: TICK_MS };
    offline.activeActionId = ACTION;
    advance(offline, TEST_CONTENT, TOTAL_TICKS * TICK_MS, { offline: true });

    // Referenz: derselbe Seed, NIE avanciert — der exakte Elite-Ausgangszustand.
    const fresh = createGame({ name: "X" }, TEST_CONTENT, SEED);
    fresh.eliteZones.pastures = { cooldownMs: TICK_MS };

    // Online: der Zyklus lief wirklich (Cooldown-Ablauf + Varianten-Wurf bewegten eliteRng).
    expect(online.eliteRng.state).not.toBe(fresh.eliteRng.state);
    expect("variantId" in online.eliteZones.pastures).toBe(true);

    // Offline: KOMPLETTER No-op für das gesamte Elite-Feature (Konzept §1.3) — nichts hat sich
    // gegenüber dem unavancierten Referenz-State verändert.
    expect(offline.eliteRng).toEqual(fresh.eliteRng);
    expect(offline.eliteZones).toEqual(fresh.eliteZones);
    expect(offline.eliteSpawnSeq).toBe(0);
    expect(offline.lastEliteSpawn).toBeNull();

    // Kern-Progression bleibt TROTZDEM bit-identisch zwischen online und offline — das eigentliche
    // Determinismus-Gesetz (der eigene eliteRng-Strom darf state.rng nie verschieben).
    expect(offline.rng).toEqual(online.rng);
    expect(offline.skills).toEqual(online.skills);
    expect(offline.inventory).toEqual(online.inventory);
    expect(offline.mastery).toEqual(online.mastery);
    // Sanity: es wurde tatsächlich gegraben (sonst wäre state.rng nie gezogen worden — der Test
    // bewiese dann nichts).
    expect(online.skills.mining?.xp ?? 0).toBeGreaterThan(0);
  });
});

describe("Elite-/World-Spawns — Kill-Pfad", () => {
  it("startEliteCombat → Kill → genau eine Unique-Instanz mit Suffix (uniqueDropChance 1), Zone zurück in Ruhe, kein Respawn", () => {
    const s = createGame(
      { name: "Killer", baseAttributes: { str: 80, dex: 80, con: 80 } },
      TEST_CONTENT,
      6,
    );
    s.eliteZones.pastures = { variantId: TEST_VARIANT.id, remainingMs: ELITE_WINDOW_MS };

    expect(startEliteCombat(s, TEST_CONTENT, "pastures")).toBe(true);
    expect(s.combat.eliteVariantId).toBe(TEST_VARIANT.id);
    const scaled = eliteScaledMonster(TEST_CONTENT, TEST_VARIANT.id)!;
    expect(s.combat.monsterId).toBe(scaled.id);
    expect(s.combat.enemyHp).toBe(scaled.maxHp);
    expect(scaled.maxHp).toBe(Math.round(content.monsters.chicken!.maxHp * TEST_VARIANT.statMults.hp));

    s.combat.enemyHp = 1; // der nächste landende Treffer tötet
    let guard = 0;
    while (s.combat.monsterId !== null && guard++ < 2000) combatStep(s, TEST_CONTENT);
    expect(guard, "Kampf in der Zeitschranke beendet").toBeLessThan(2000);

    // Kampf sauber beendet — kein Respawn desselben Elites.
    expect(s.combat.monsterId).toBeNull();
    expect(s.combat.eliteVariantId).toBeUndefined();

    // Genau EINE Unique-Instanz mit Suffix im Besitz (uniqueDropChance 1 ⇒ garantiert gefallen).
    const uniques = s.inventory.instances.filter((i) => i.baseItemId === TEST_UNIQUE_ITEM);
    expect(uniques.length).toBe(1);
    expect(uniques[0]!.suffix).toBeDefined();

    // Zone zurück in Ruhe mit frischem Cooldown im PER-ZONE-Band.
    const rested = asResting(s.eliteZones.pastures);
    const band = eliteZoneCooldownBand("pastures");
    expect(rested.cooldownMs).toBeGreaterThanOrEqual(band.minMs);
    expect(rested.cooldownMs).toBeLessThanOrEqual(band.maxMs);

    // Erneutes Starten schlägt fehl — die Zone trägt keine aktive Variante mehr.
    expect(startEliteCombat(s, TEST_CONTENT, "pastures")).toBe(false);
  });

  it("uniqueDropChance: der Wurf feuert IMMER (Sequenz-Stabilität) — bei 0 kein Unique, identischer eliteRng-Konsum wie bei 1", () => {
    // uniqueSuffixChance:0 isoliert den Kill-Pfad auf GENAU zwei eliteRng-Züge (Drop-Chance-Wurf +
    // Despawn-Cooldown-Wurf) — kein Suffix-Wurf (rollSuffix zieht bei Chance 0 nie), kein extraLoot.
    const zeroVariant = { ...TEST_VARIANT, id: "test_elite_zero", uniqueDropChance: 0, uniqueSuffixChance: 0 };
    const oneVariant = { ...TEST_VARIANT, id: "test_elite_one", uniqueDropChance: 1, uniqueSuffixChance: 0 };
    const zeroContent: ContentDB = { ...content, elites: { [zeroVariant.id]: zeroVariant } };
    const oneContent: ContentDB = { ...content, elites: { [oneVariant.id]: oneVariant } };

    const sZero = createGame({ name: "Zero" }, zeroContent, 42);
    sZero.eliteRng = createRng(999); // identischer Startzustand für beide Läufe
    sZero.combat.eliteVariantId = zeroVariant.id;

    const sOne = createGame({ name: "One" }, oneContent, 42);
    sOne.eliteRng = createRng(999);
    sOne.combat.eliteVariantId = oneVariant.id;

    const monster = eliteScaledMonster(zeroContent, zeroVariant.id)!;
    onEliteKilled(sZero, zeroContent, monster);
    onEliteKilled(sOne, oneContent, eliteScaledMonster(oneContent, oneVariant.id)!);

    expect(sZero.inventory.instances.filter((i) => i.baseItemId === TEST_UNIQUE_ITEM).length).toBe(0);
    expect(sOne.inventory.instances.filter((i) => i.baseItemId === TEST_UNIQUE_ITEM).length).toBe(1);

    // Der Drop-Chance-Wurf feuert in BEIDEN Fällen identisch (gleicher Draw-Count) — der eliteRng-
    // Endzustand ist damit gleich, obwohl das Ergebnis (Drop ja/nein) divergiert.
    expect(sZero.eliteRng.state).toBe(sOne.eliteRng.state);
  });

  it("Elite-Kampf wird zu Ende geführt, auch wenn das Fenster mitten im Kampf abläuft (Grace)", () => {
    const s = createGame(
      { name: "Grace", baseAttributes: { str: 80, dex: 80, con: 80 } },
      TEST_CONTENT,
      9,
    );
    s.eliteZones.pastures = { variantId: TEST_VARIANT.id, remainingMs: TICK_MS }; // gleich fällig
    expect(startEliteCombat(s, TEST_CONTENT, "pastures")).toBe(true);
    // startEliteCombat greift NICHT in eliteZones ein (nur combat) — remainingMs bleibt TICK_MS.
    s.combat.enemyHp = 1_000_000; // Kampf bleibt künstlich lang aktiv

    // Das Fenster läuft mitten im Kampf ab — der Zyklus friert es bei 0 ein statt zu despawnen.
    step(s, TEST_CONTENT, false);
    step(s, TEST_CONTENT, false);
    const midFight = asActive(s.eliteZones.pastures);
    expect(midFight.remainingMs).toBe(0);
    expect(s.combat.monsterId).not.toBeNull(); // der Kampf läuft unbeeindruckt weiter

    // Jetzt regulär beenden (Kill) — der Kill-Pfad despawnt die Zone explizit.
    s.combat.enemyHp = 1;
    let guard = 0;
    while (s.combat.monsterId !== null && guard++ < 2000) combatStep(s, TEST_CONTENT);
    expect(s.combat.monsterId).toBeNull();
    const rested = s.eliteZones.pastures;
    expect("variantId" in rested).toBe(false);
  });
});

describe("Elite-/World-Spawns — enrageDamageMultOverride (Spike-Kill-Schutz)", () => {
  it("ersetzt NUR damageMult bei vererbtem Basis-enrage; ohne Feld bleibt der Basis-Wert; ohne Basis-enrage wirkungslos", () => {
    const base = content.monsters.bull_boss!; // trägt enrage {belowHpPct:0.4, damageMult:1.6}
    expect(base.enrage).toBeDefined();
    const overrideVariant = {
      ...TEST_VARIANT,
      id: "test_elite_enrage_override",
      baseMonsterId: "bull_boss",
      enrageDamageMultOverride: 1.35,
    };
    const plainVariant = { ...TEST_VARIANT, id: "test_elite_enrage_plain", baseMonsterId: "bull_boss" };
    const noEnrageVariant = { ...TEST_VARIANT, id: "test_elite_no_enrage", enrageDamageMultOverride: 1.1 }; // baseMonsterId chicken, kein enrage
    const c: ContentDB = {
      ...content,
      elites: {
        [overrideVariant.id]: overrideVariant,
        [plainVariant.id]: plainVariant,
        [noEnrageVariant.id]: noEnrageVariant,
      },
    };

    const overridden = eliteScaledMonster(c, overrideVariant.id)!;
    expect(overridden.enrage?.damageMult).toBe(1.35);
    expect(overridden.enrage?.belowHpPct).toBe(base.enrage!.belowHpPct); // Rest unangetastet

    const plain = eliteScaledMonster(c, plainVariant.id)!;
    expect(plain.enrage?.damageMult).toBe(base.enrage!.damageMult); // ohne Feld = Basis-Wert

    const noEnrage = eliteScaledMonster(c, noEnrageVariant.id)!;
    expect(noEnrage.enrage).toBeUndefined(); // Basis (chicken) hat kein enrage → Feld wirkungslos
  });
});

describe("Elite-/World-Spawns — Phase-1.5-Achsen (evasion/wardCapacity/regenMult/inflictOverride)", () => {
  it("statMults.evasion: skaliert die Basis-Evasion; ohne Feld bleibt der Basis-Wert", () => {
    const base = content.monsters.goblin_rogue!; // evasion 6, kein wardCapacity/regen/inflict
    const withEva = { ...TEST_VARIANT, id: "test_evasion", baseMonsterId: "goblin_rogue", statMults: { hp: 5, damage: 1.5, evasion: 2 } };
    const withoutEva = { ...TEST_VARIANT, id: "test_no_evasion", baseMonsterId: "goblin_rogue" };
    const c: ContentDB = { ...content, elites: { [withEva.id]: withEva, [withoutEva.id]: withoutEva } };

    expect(eliteScaledMonster(c, withEva.id)!.evasion).toBe(Math.round(base.evasion * 2));
    expect(eliteScaledMonster(c, withoutEva.id)!.evasion).toBe(base.evasion); // unverändert
  });

  it("statMults.wardCapacity: skaliert die Basis-Ward NUR bei Ward-Basis; ohne Feld/ohne Basis-Ward unverändert", () => {
    const wardBase = content.monsters.the_imp!; // wardCapacity 8
    const noWardBase = content.monsters.goblin_rogue!; // kein wardCapacity
    const withWard = { ...TEST_VARIANT, id: "test_ward", baseMonsterId: "the_imp", statMults: { hp: 5, damage: 1.35, wardCapacity: 5 } };
    const withoutWard = { ...TEST_VARIANT, id: "test_no_ward_field", baseMonsterId: "the_imp" };
    const wardMultNoBase = { ...TEST_VARIANT, id: "test_ward_no_base", baseMonsterId: "goblin_rogue", statMults: { hp: 5, damage: 1.5, wardCapacity: 3 } };
    const c: ContentDB = {
      ...content,
      elites: { [withWard.id]: withWard, [withoutWard.id]: withoutWard, [wardMultNoBase.id]: wardMultNoBase },
    };

    expect(eliteScaledMonster(c, withWard.id)!.wardCapacity).toBe(Math.round(wardBase.wardCapacity! * 5));
    expect(eliteScaledMonster(c, withoutWard.id)!.wardCapacity).toBe(wardBase.wardCapacity); // unverändert
    expect(eliteScaledMonster(c, wardMultNoBase.id)!.wardCapacity).toBe(noWardBase.wardCapacity); // No-op (undefined)
  });

  it("regenMult: skaliert die Basis-Selbstheilung NUR bei vorhandenem Basis-regen; ohne Feld/ohne Basis-regen unverändert", () => {
    const regenBase = content.monsters.tide_siren!; // regen 0.3
    const noRegenBase = content.monsters.goblin_rogue!; // kein regen
    const withRegen = { ...TEST_VARIANT, id: "test_regen", baseMonsterId: "tide_siren", statMults: { hp: 2.5, damage: 1.35 }, regenMult: 2 };
    const withoutRegen = { ...TEST_VARIANT, id: "test_no_regen_field", baseMonsterId: "tide_siren" };
    const regenMultNoBase = { ...TEST_VARIANT, id: "test_regen_no_base", baseMonsterId: "goblin_rogue", regenMult: 2 };
    const c: ContentDB = {
      ...content,
      elites: { [withRegen.id]: withRegen, [withoutRegen.id]: withoutRegen, [regenMultNoBase.id]: regenMultNoBase },
    };

    expect(eliteScaledMonster(c, withRegen.id)!.regen).toBeCloseTo(regenBase.regen! * 2, 10);
    expect(eliteScaledMonster(c, withoutRegen.id)!.regen).toBe(regenBase.regen); // unverändert
    expect(eliteScaledMonster(c, regenMultNoBase.id)!.regen).toBe(noRegenBase.regen); // No-op (undefined)
  });

  it("inflictOverride: ersetzt einen vererbten Status komplett; erzeugt NEU, falls die Basis keinen trägt; ohne Feld unverändert", () => {
    const inflictBase = content.monsters.mire_crawler!; // inflict poison chance:0.3 magnitude:1 durationMs:6000
    expect(inflictBase.inflict).toBeDefined();
    const overridden = {
      ...TEST_VARIANT,
      id: "test_inflict_override",
      baseMonsterId: "mire_crawler",
      inflictOverride: { type: "poison" as const, chance: 0.3, magnitude: 2, durationMs: 6000 },
    };
    const unchanged = { ...TEST_VARIANT, id: "test_inflict_unchanged", baseMonsterId: "mire_crawler" };
    // "chicken" (TEST_VARIANT-Basis) trägt selbst KEINEN inflict — NEU-Zugang-Fall.
    const newInflict = {
      ...TEST_VARIANT,
      id: "test_inflict_new",
      inflictOverride: { type: "burn" as const, chance: 0.25, magnitude: 1, durationMs: 4000 },
    };
    expect(content.monsters.chicken!.inflict).toBeUndefined();
    const c: ContentDB = {
      ...content,
      elites: { [overridden.id]: overridden, [unchanged.id]: unchanged, [newInflict.id]: newInflict },
    };

    expect(eliteScaledMonster(c, overridden.id)!.inflict).toEqual({ type: "poison", chance: 0.3, magnitude: 2, durationMs: 6000 });
    expect(eliteScaledMonster(c, unchanged.id)!.inflict).toEqual(inflictBase.inflict); // unverändert vererbt
    expect(eliteScaledMonster(c, newInflict.id)!.inflict).toEqual({ type: "burn", chance: 0.25, magnitude: 1, durationMs: 4000 });
  });
});

describe("Elite-/World-Spawns — per-Zone-Cooldown-Bänder + Früh-Haken (elite-balance-spec.md §3)", () => {
  it("initEliteZonesEarlyHook (createGame): Pastures fällt nach ~15–25 Min, Zonen entzerrt bis ~100 Min", () => {
    const zones = initEliteZonesEarlyHook(content, createRng(1234));
    const pastures = asResting(zones.pastures!);
    expect(pastures.cooldownMs).toBeGreaterThanOrEqual(15 * 60_000);
    expect(pastures.cooldownMs).toBeLessThanOrEqual(25 * 60_000);

    const idolhall = asResting(zones.idolhall!);
    expect(idolhall.cooldownMs).toBeGreaterThanOrEqual((15 + 72) * 60_000);
    expect(idolhall.cooldownMs).toBeLessThanOrEqual((15 + 72 + 10) * 60_000);

    // Determinismus: gleicher Seed ⇒ gleiches Ergebnis.
    expect(initEliteZonesEarlyHook(content, createRng(1234))).toEqual(zones);
  });

  it("createGame nutzt tatsächlich den Früh-Haken (nicht den Steady-State-Band-Roll)", () => {
    const s = createGame({ name: "Neu" }, content, 55);
    const pastures = asResting(s.eliteZones.pastures!);
    // Früh-Haken-Bereich (15–25 Min) liegt WEIT unter dem Steady-State-Band (55–75 Min) — die
    // beiden Formeln überlappen sich nicht, ein Treffer im Früh-Haken-Bereich beweist die Auswahl.
    const steadyBand = eliteZoneCooldownBand("pastures");
    expect(pastures.cooldownMs).toBeLessThan(steadyBand.minMs);
  });

  it("initEliteZonesStaggered (Migration): jede Zone würfelt in ihrem EIGENEN Steady-State-Band (kein Früh-Haken)", () => {
    const zones = initEliteZonesStaggered(content, createRng(1234));
    for (const zone of content.zones) {
      const entry = asResting(zones[zone.id]!);
      const band = eliteZoneCooldownBand(zone.id);
      expect(entry.cooldownMs).toBeGreaterThanOrEqual(band.minMs);
      expect(entry.cooldownMs).toBeLessThanOrEqual(band.maxMs);
    }
    // Determinismus: gleicher Seed ⇒ gleiches Ergebnis.
    expect(initEliteZonesStaggered(content, createRng(1234))).toEqual(zones);
  });

  it("unbekannte Zone fällt auf das Default-Band zurück (Content-Drift-Leitplanke)", () => {
    const band = eliteZoneCooldownBand("some_future_zone_xyz");
    expect(band.minMs).toBeGreaterThan(0);
    expect(band.maxMs).toBeGreaterThan(band.minMs);
    // "slayer_tower" ist real, aber nicht in der balance-spec-Tabelle → ebenfalls Default-Band.
    expect(eliteZoneCooldownBand("slayer_tower")).toEqual(band);
    // Eine ECHTE Tabellen-Zone hat garantiert ein ANDERES (spezifischeres) Band.
    expect(eliteZoneCooldownBand("pastures")).not.toEqual(band);
  });
});

describe("Elite-/World-Spawns — Struktur-Helfer (pure)", () => {
  it("deriveEliteRngSeed: deterministische Bit-Mischung, kein Identitäts-Passthrough", () => {
    expect(deriveEliteRngSeed(42)).toBe(deriveEliteRngSeed(42));
    expect(deriveEliteRngSeed(42)).not.toBe(42);
    expect(deriveEliteRngSeed(1)).not.toBe(deriveEliteRngSeed(2));
  });

  it("eliteVariantsForZone: nur die Varianten der angefragten Zone, deterministisch sortiert", () => {
    const variants = eliteVariantsForZone(TEST_CONTENT, "pastures");
    expect(variants.map((v) => v.id)).toEqual([TEST_VARIANT.id]);
    expect(eliteVariantsForZone(TEST_CONTENT, "borderlands")).toEqual([]);
    // Content-dev Phase 2: der ECHTE Content hat pastures jetzt mit 3 realen Varianten befüllt
    // (design/elite-balance-spec.md §1.1) — eine leere Registry-Abfrage wird stattdessen explizit
    // konstruiert, der ursprüngliche Test-Zweck ("unbekannte/leere Zone ⇒ []") bleibt unverändert.
    const EMPTY_ELITES: ContentDB = { ...content, elites: {} };
    expect(eliteVariantsForZone(EMPTY_ELITES, "pastures")).toEqual([]);
    expect(eliteVariantsForZone(content, "pastures").map((v) => v.id)).toEqual([
      "elite_pastures_boar",
      "elite_pastures_bull",
      "elite_pastures_imp",
    ]);
  });

  it("eliteScaledMonster: identität + Stat-Skalierung, kein Basis-Loot-Verlust", () => {
    const base = content.monsters.chicken!;
    const scaled = eliteScaledMonster(TEST_CONTENT, TEST_VARIANT.id)!;
    expect(scaled.id).toBe(base.id); // Kill-Credit-Konsistenz (Bestiarium/Slayer)
    expect(scaled.maxHp).toBe(Math.round(base.maxHp * TEST_VARIANT.statMults.hp));
    expect(scaled.damage).toBeCloseTo(base.damage * TEST_VARIANT.statMults.damage, 6);
    expect(scaled.loot).toEqual(base.loot); // unveränderte Zonen-Loot-Tabelle (§3.3)
    expect(eliteScaledMonster(TEST_CONTENT, "does_not_exist")).toBeNull();
  });
});
