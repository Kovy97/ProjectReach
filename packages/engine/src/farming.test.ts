import { describe, expect, it } from "vitest";
import type { ContentDB, CropDef, FarmPlot, GameState, ItemDef } from "@hearthforge/shared";
import { MAX_FARM_PLOTS, plotsUnlocked } from "@hearthforge/shared";
import { content } from "@hearthforge/content";
import { createGame } from "./state";
import { advance } from "./tick";
import { addItem, itemCount } from "./inventory";
import {
  collectPlot,
  plantCrop,
  plotProgress,
  setAutoReplant,
  setNextCrop,
  switchToNextCrop,
  tickFarmPlots,
  uprootPlot,
} from "./farming";

const GROW = 600_000; // 10 min
const SEED = "test_seed";
const YIELD = "test_herb";

/** Content mit injiziertem Crop-Katalog + Platzhalter-Items (content-dev liefert die echten). */
function testContent(): ContentDB {
  const seed: ItemDef = { id: SEED, name: SEED, type: "material", stackable: true };
  const herb: ItemDef = { id: YIELD, name: YIELD, type: "material", stackable: true };
  const crop: CropDef = {
    id: "test_crop",
    name: "Test Crop",
    seedItem: SEED,
    yieldItem: YIELD,
    yieldMin: 8,
    yieldMax: 8,
    levelRequired: 1,
    growMs: GROW,
    xp: 24,
    tier: 1,
  };
  return {
    ...content,
    items: { ...content.items, [SEED]: seed, [YIELD]: herb },
    crops: { test_crop: crop },
  };
}

describe("farming plots — Datenmodell & createGame", () => {
  it("createGame initialisiert MAX_FARM_PLOTS leere Plots (auto-replant AN)", () => {
    const s = createGame({ name: "X" }, content, 1);
    expect(s.farmPlots).toHaveLength(MAX_FARM_PLOTS);
    for (const p of s.farmPlots) {
      expect(p.cropId).toBeNull();
      expect(p.plantedAtMs).toBe(0);
      expect(p.autoReplant).toBe(true);
      expect(p.readyYield).toBe(0);
    }
  });

  it("plotsUnlocked steigt monoton 3→9 mit dem Farming-Level", () => {
    expect(plotsUnlocked(1)).toBe(3);
    expect(plotsUnlocked(9)).toBe(3);
    expect(plotsUnlocked(10)).toBe(4);
    expect(plotsUnlocked(55)).toBe(7);
    expect(plotsUnlocked(85)).toBe(9);
    expect(plotsUnlocked(99)).toBe(9);
  });
});

describe("farming plots — Reife & Ertrag", () => {
  it("erntet exakt bei growMs (keine Sekunde früher)", () => {
    const c = testContent();
    const s = createGame({ name: "X" }, c, 1);
    addItem(s.inventory, c, SEED, 5);
    expect(plantCrop(s, c, 0, "test_crop")).toBe(true);
    expect(itemCount(s.inventory, SEED)).toBe(4); // 1 Saat sofort verbraucht

    advance(s, c, GROW - 1000); // knapp davor
    expect(itemCount(s.inventory, YIELD)).toBe(0);
    expect(s.farmPlots[0]!.cropId).toBe("test_crop");

    advance(s, c, 1000); // exakt reif
    expect(itemCount(s.inventory, YIELD)).toBe(8);
  });

  it("gewährt Farming-XP pro Ernte (passiv-getunt = crop.xp)", () => {
    const c = testContent();
    const s = createGame({ name: "X" }, c, 1);
    addItem(s.inventory, c, SEED, 1);
    plantCrop(s, c, 0, "test_crop"); // auto-replant würde nachsäen, aber nur 1 Saat → genau 1 Ernte
    s.farmPlots[0]!.autoReplant = false;
    advance(s, c, GROW);
    expect(s.skills.farming?.xp).toBe(24);
  });
});

describe("farming plots — Offline-Mehrzyklen & Auto-Replant", () => {
  it("auto-replant AN: floor(elapsed/growMs) Ernten bei genug Saat + Rest-Fortschritt bleibt", () => {
    const c = testContent();
    const s = createGame({ name: "X" }, c, 1);
    addItem(s.inventory, c, SEED, 10);
    plantCrop(s, c, 0, "test_crop"); // verbraucht 1 → 9 übrig

    // 3,5 Wachsperioden offline → 3 Ernten, Plot wächst weiter (Rest-Fortschritt).
    advance(s, c, GROW * 3 + GROW / 2);
    expect(itemCount(s.inventory, YIELD)).toBe(24); // 3 × 8
    // 1 (plant) + 3 (replant nach jeder Ernte) = 4 Saat verbraucht → 6 übrig
    expect(itemCount(s.inventory, SEED)).toBe(6);
    expect(s.farmPlots[0]!.cropId).toBe("test_crop");
    const prog = plotProgress(s, c, 0);
    expect(prog.pct).toBeGreaterThan(0.4);
    expect(prog.pct).toBeLessThan(0.6); // ~50 % Rest-Fortschritt übernommen
  });

  it("auto-replant AUS: genau 1 Ernte, egal wie viele Zyklen vergehen", () => {
    const c = testContent();
    const s = createGame({ name: "X" }, c, 1);
    addItem(s.inventory, c, SEED, 10);
    plantCrop(s, c, 0, "test_crop");
    setAutoReplant(s, 0, false);
    advance(s, c, GROW * 5);
    expect(itemCount(s.inventory, YIELD)).toBe(8); // exakt 1 Ernte
    expect(s.farmPlots[0]!.cropId).toBeNull(); // Plot leer (reif & abgeholt)
  });

  it("Saat-Erschöpfung stoppt sauber (letzte Ernte gewährt, dann Plot leer)", () => {
    const c = testContent();
    const s = createGame({ name: "X" }, c, 1);
    addItem(s.inventory, c, SEED, 2); // plant(1) + 1 Replant-Saat
    plantCrop(s, c, 0, "test_crop"); // 1 übrig
    advance(s, c, GROW * 5);
    // Ernte 1 → replant (Saat 1→0); Ernte 2 → keine Saat → Plot leer
    expect(itemCount(s.inventory, YIELD)).toBe(16); // 2 Ernten
    expect(itemCount(s.inventory, SEED)).toBe(0);
    expect(s.farmPlots[0]!.cropId).toBeNull();
  });
});

describe("farming plots — Plot-API Guards", () => {
  it("plantCrop scheitert bei gesperrtem Plot / fehlendem Level / fehlender Saat", () => {
    const c = testContent();
    const s = createGame({ name: "X" }, c, 1); // Farming Lv1 → 3 Plots frei
    // Gesperrt: Index 3 (>=3) bei Lv1.
    addItem(s.inventory, c, SEED, 5);
    expect(plantCrop(s, c, 3, "test_crop")).toBe(false);
    expect(plantCrop(s, c, 0, "unknown_crop")).toBe(false);

    // Level zu niedrig.
    const c2 = testContent();
    c2.crops!.high = { ...c2.crops!.test_crop!, id: "high", levelRequired: 50 };
    const s2 = createGame({ name: "Y" }, c2, 1);
    addItem(s2.inventory, c2, SEED, 5);
    expect(plantCrop(s2, c2, 0, "high")).toBe(false);

    // Keine Saat.
    const s3 = createGame({ name: "Z" }, c, 1);
    expect(plantCrop(s3, c, 0, "test_crop")).toBe(false);
  });

  it("uprootPlot leert einen wachsenden Plot (Saat verfällt)", () => {
    const c = testContent();
    const s = createGame({ name: "X" }, c, 1);
    addItem(s.inventory, c, SEED, 5);
    plantCrop(s, c, 0, "test_crop");
    expect(uprootPlot(s, 0)).toBe(true);
    expect(s.farmPlots[0]!.cropId).toBeNull();
    expect(uprootPlot(s, 0)).toBe(false); // schon leer
  });

  it("readyYield wird geparkt (autoBank aus + Inventar voll) und per collectPlot abgeholt", () => {
    const c = testContent();
    const s = createGame({ name: "X" }, c, 1);
    s.settings.autoBank = false;
    addItem(s.inventory, c, SEED, 1);
    plantCrop(s, c, 0, "test_crop");
    s.farmPlots[0]!.autoReplant = false;
    // Inventar mit Fremd-Items volllaufen lassen (alle Slots belegt, kein YIELD-Stack vorhanden).
    for (let i = 0; i < s.inventory.slots.length; i++) {
      if (!s.inventory.slots[i]) s.inventory.slots[i] = { itemId: "filler_" + i, qty: 1 };
    }
    advance(s, c, GROW);
    expect(itemCount(s.inventory, YIELD)).toBe(0);
    expect(s.farmPlots[0]!.readyYield).toBe(8);
    expect(plotProgress(s, c, 0).ready).toBe(true);

    // Platz schaffen, einsammeln.
    s.inventory.slots[0] = null;
    const got = collectPlot(s, c, 0);
    expect(got).toBe(8);
    expect(itemCount(s.inventory, YIELD)).toBe(8);
    expect(s.farmPlots[0]!.readyYield).toBe(0);
  });
});

describe("farming plots — Determinismus (kein RNG-Zug ohne Ernte)", () => {
  it("leere Plots ziehen kein RNG", () => {
    const c = testContent();
    const s = createGame({ name: "X" }, c, 12345);
    const before = s.rng.state;
    advance(s, c, GROW * 3); // keine Aktion, keine Crops gepflanzt
    expect(s.rng.state).toBe(before);
  });

  it("gesperrte Plots reifen nicht und ziehen kein RNG", () => {
    const c = testContent();
    const s = createGame({ name: "X" }, c, 999); // Lv1 → Plots 0..2 frei, 3..8 gesperrt
    // Direkt in einen gesperrten Plot „pflanzen" (umgeht plantCrop-Guard absichtlich für den Test).
    s.farmPlots[8] = { cropId: "test_crop", plantedAtMs: 0, autoReplant: true, readyYield: 0, readyItem: null, nextCropId: null };
    const before = s.rng.state;
    advance(s, c, GROW * 5);
    expect(s.rng.state).toBe(before); // kein grantHarvest
    expect(itemCount(s.inventory, YIELD)).toBe(0);
    expect(s.farmPlots[8]!.cropId).toBe("test_crop"); // bleibt erhalten, reift später wenn frei
  });

  it("ohne Crop-Katalog (content.crops undefined) ist tickFarmPlots ein No-op", () => {
    const s = createGame({ name: "X" }, content, 7);
    s.farmPlots[0] = { cropId: "whatever", plantedAtMs: 0, autoReplant: true, readyYield: 0, readyItem: null, nextCropId: null };
    const before = s.rng.state;
    tickFarmPlots(s, content); // content ohne crops
    expect(s.rng.state).toBe(before);
    // Defensiv: unbekannte Crop wird geleert.
    expect(s.farmPlots[0]!.cropId).toBeNull();
  });
});

// ───────────────────────────────────────────────────────────────────────────
// Folgesorte je Beet (`FarmPlot.nextCropId`, SAVE_VERSION 82) — Chef-GO 25.08.2026 (1.1.0),
// design/rezension-patch-2026-08-25.html #p12. Chef-Entscheide: einmalig (#12.1), Saat fehlt ⇒
// Beet leer + Plan bleibt, kein Rückfall (#12.2), „Jetzt wechseln" (#12.3).
// ───────────────────────────────────────────────────────────────────────────

const GROW_A = 600_000; // 10 min
const GROW_B = 1_200_000; // 20 min
const SEED_A = "seed_a";
const SEED_B = "seed_b";
const YIELD_A = "yield_a";
const YIELD_B = "yield_b";

/** Zwei Sorten mit UNTERSCHIEDLICHER Wachszeit (A 10 min, B 20 min) + eine Hochstufen-Sorte. */
function twoCropContent(): ContentDB {
  const mk = (id: string): ItemDef => ({ id, name: id, type: "material", stackable: true });
  const cropA: CropDef = {
    id: "crop_a", name: "A", seedItem: SEED_A, yieldItem: YIELD_A,
    yieldMin: 8, yieldMax: 8, levelRequired: 1, growMs: GROW_A, xp: 24, tier: 1,
  };
  const cropB: CropDef = { ...cropA, id: "crop_b", name: "B", seedItem: SEED_B, yieldItem: YIELD_B, growMs: GROW_B, xp: 40 };
  const cropHigh: CropDef = { ...cropA, id: "crop_high", name: "High", levelRequired: 50 };
  return {
    ...content,
    items: { ...content.items, [SEED_A]: mk(SEED_A), [SEED_B]: mk(SEED_B), [YIELD_A]: mk(YIELD_A), [YIELD_B]: mk(YIELD_B) },
    crops: { crop_a: cropA, crop_b: cropB, crop_high: cropHigh },
  };
}

/** Frisches Spiel mit A auf Beet 0 (Saat A: `seedsA`, Saat B: `seedsB` im Inventar). */
function withCropA(seedsA: number, seedsB: number, seed = 777): { s: GameState; c: ContentDB } {
  const c = twoCropContent();
  const s = createGame({ name: "X" }, c, seed);
  addItem(s.inventory, c, SEED_A, seedsA);
  if (seedsB > 0) addItem(s.inventory, c, SEED_B, seedsB);
  expect(plantCrop(s, c, 0, "crop_a")).toBe(true);
  return { s, c };
}

/** Die Felder, an denen sich offline == online messen lässt (bit-identisch). */
function farmSnapshot(s: GameState) {
  return {
    plots: s.farmPlots,
    inv: s.inventory.slots,
    bank: s.bank,
    rng: s.rng.state,
    xp: s.skills.farming?.xp ?? 0,
    elapsed: s.elapsedMs,
  };
}

describe("Folgesorte — setNextCrop-Guards", () => {
  it("lehnt leeres Beet, unbekannte Sorte, zu hohes Level, gleiche Sorte und gesperrtes Beet ab", () => {
    const { s, c } = withCropA(5, 0);
    expect(setNextCrop(s, c, 1, "crop_b")).toBe(false); // leer: dort pflanzt man direkt
    expect(setNextCrop(s, c, 0, "ghost")).toBe(false); // unbekannt
    expect(setNextCrop(s, c, 0, "crop_high")).toBe(false); // Level 50 > 1
    expect(setNextCrop(s, c, 0, "crop_a")).toBe(false); // == wachsende Sorte
    s.farmPlots[8] = { cropId: "crop_a", plantedAtMs: 0, autoReplant: true, readyYield: 0, readyItem: null, nextCropId: null };
    expect(setNextCrop(s, c, 8, "crop_b")).toBe(false); // gesperrt (Lv1 → 3 Beete)
    expect(s.farmPlots[0]!.nextCropId).toBeNull();
    // Gültig — auch OHNE Saat von B im Besitz (Saat wird zur Reife abgezogen, #p12).
    expect(setNextCrop(s, c, 0, "crop_b")).toBe(true);
    expect(s.farmPlots[0]!.nextCropId).toBe("crop_b");
    expect(itemCount(s.inventory, SEED_A)).toBe(4); // keine Saat beim Planen abgezogen
    // null löscht den Plan.
    expect(setNextCrop(s, c, 0, null)).toBe(true);
    expect(s.farmPlots[0]!.nextCropId).toBeNull();
  });

  it("plotProgress meldet nextSeedMissing nur mit Plan UND ohne Saat", () => {
    const { s, c } = withCropA(5, 0);
    expect(plotProgress(s, c, 0).nextSeedMissing).toBe(false); // kein Plan
    setNextCrop(s, c, 0, "crop_b");
    expect(plotProgress(s, c, 0).nextSeedMissing).toBe(true); // Plan, keine Saat B
    s.bank[SEED_B] = 1; // Lager zählt mit
    expect(plotProgress(s, c, 0).nextSeedMissing).toBe(false);
  });
});

describe("Folgesorte — Reife mit Plan", () => {
  it("sät bei Reife die Folgesorte (Saat B abgezogen, cropId gewechselt, Plan genullt, plantedAtMs = Reifezeitpunkt)", () => {
    const { s, c } = withCropA(5, 1);
    setNextCrop(s, c, 0, "crop_b");
    advance(s, c, GROW_A);
    expect(itemCount(s.inventory, YIELD_A)).toBe(8); // Ernte A gutgeschrieben
    expect(itemCount(s.inventory, SEED_B)).toBe(0); // EINE Saat B verbraucht
    expect(itemCount(s.inventory, SEED_A)).toBe(4); // Saat A unangetastet (kein Nachsäen von A)
    const p = s.farmPlots[0]!;
    expect(p.cropId).toBe("crop_b");
    expect(p.nextCropId).toBeNull(); // einmalig (#12.1)
    expect(p.plantedAtMs).toBe(GROW_A); // Reifezeitpunkt, nicht „jetzt"
    expect(plotProgress(s, c, 0).growing).toBe(true);
  });

  it("wechselt auch bei Auto-Nachpflanzen AUS (der Plan ist ein ausdrücklicher Säe-Auftrag)", () => {
    const { s, c } = withCropA(5, 1);
    setAutoReplant(s, 0, false);
    setNextCrop(s, c, 0, "crop_b");
    advance(s, c, GROW_A * 2); // 2 Zyklen A: Ernte A bei 10, Wechsel auf B, B wächst (10 von 20 min)
    expect(s.farmPlots[0]!.cropId).toBe("crop_b");
    expect(itemCount(s.inventory, YIELD_A)).toBe(8);
    expect(itemCount(s.inventory, YIELD_B)).toBe(0); // B noch nicht reif
    expect(plotProgress(s, c, 0).pct).toBeCloseTo(0.5, 5);
  });

  it("Offline-Mehrfachzyklus mit Sortenwechsel: A 10 min → B 20 min, 55 min = 3 Ernten, 3 RNG-Züge, B mit 5 min Fortschritt", () => {
    const { s, c } = withCropA(5, 3);
    setNextCrop(s, c, 0, "crop_b");
    // Referenz: gleicher Seed, genau 3 Ernten OHNE Plan (3,5 Zyklen A) → identischer RNG-Verbrauch.
    const ref = withCropA(5, 0);
    advance(ref.s, ref.c, GROW_A * 3 + GROW_A / 2);

    advance(s, c, 55 * 60_000); // Ernte A bei 10, B bei 30, B bei 50; danach B 5 min alt
    expect(itemCount(s.inventory, YIELD_A)).toBe(8);
    expect(itemCount(s.inventory, YIELD_B)).toBe(16);
    expect(itemCount(s.inventory, SEED_B)).toBe(0); // Wechsel bei 10 + Nachsaat bei 30 und 50 = 3 von 3
    expect(itemCount(s.inventory, SEED_A)).toBe(4); // A nie nachgesät
    expect(s.rng.state).toBe(ref.s.rng.state); // exakt 3 Ernte-Züge
    expect(s.skills.farming!.xp).toBe(24 + 40 + 40);
    const p = s.farmPlots[0]!;
    expect(p.cropId).toBe("crop_b");
    expect(p.nextCropId).toBeNull();
    expect(p.plantedAtMs).toBe(50 * 60_000);
    expect(plotProgress(s, c, 0).pct).toBeCloseTo(5 / 20, 5);
  });

  it("offline == online mit Plan: ein 55-min-Sprung und 55 × 1 min landen bit-identisch", () => {
    const off = withCropA(5, 3, 4242);
    setNextCrop(off.s, off.c, 0, "crop_b");
    const on = withCropA(5, 3, 4242);
    setNextCrop(on.s, on.c, 0, "crop_b");
    advance(off.s, off.c, 55 * 60_000);
    for (let i = 0; i < 55; i++) advance(on.s, on.c, 60_000);
    expect(farmSnapshot(on.s)).toEqual(farmSnapshot(off.s));
    expect(on.s.farmPlots[0]!.cropId).toBe("crop_b");
  });
});

describe("Folgesorte — Saat fehlt (#12.2: kein Rückfall, Plan bleibt)", () => {
  it("Beet wird leer, Ernte eingesammelt, Saat A NICHT nachgesät, Plan bleibt stehen", () => {
    const { s, c } = withCropA(5, 0); // Saat A reichlich, Saat B keine
    setNextCrop(s, c, 0, "crop_b");
    advance(s, c, GROW_A * 3); // ohne Plan gäbe das 3 Ernten A
    expect(itemCount(s.inventory, YIELD_A)).toBe(8); // genau EINE Ernte
    expect(itemCount(s.inventory, SEED_A)).toBe(4); // kein Rückfall auf A
    const p = s.farmPlots[0]!;
    expect(p.cropId).toBeNull();
    expect(p.plantedAtMs).toBe(0);
    expect(p.nextCropId).toBe("crop_b"); // Plan bleibt
    expect(plotProgress(s, c, 0).nextSeedMissing).toBe(true); // UI-Warnung
  });

  it("später verfügbare Saat: der Tick sät das leere Beet zum Fensterbeginn ein — offline == online", () => {
    const mk = () => {
      const g = withCropA(5, 0, 99);
      setNextCrop(g.s, g.c, 0, "crop_b");
      advance(g.s, g.c, GROW_A * 3); // → leer, Plan B wartet
      expect(g.s.farmPlots[0]!.cropId).toBeNull();
      addItem(g.s.inventory, g.c, SEED_B, 1); // Saat kommt ZWISCHEN zwei advance-Aufrufen
      return g;
    };
    const t0 = GROW_A * 3;
    const off = mk();
    const on = mk();

    // Phase 1: halbe B-Zeit. Beide Pfade pflanzen zum Fensterbeginn t0 (nicht am Fensterende).
    advance(off.s, off.c, GROW_B / 2);
    for (let i = 0; i < GROW_B / 2 / 60_000; i++) advance(on.s, on.c, 60_000);
    for (const g of [off, on]) {
      const p = g.s.farmPlots[0]!;
      expect(p.cropId).toBe("crop_b");
      expect(p.nextCropId).toBeNull(); // Plan erfüllt
      expect(p.plantedAtMs).toBe(t0);
      expect(itemCount(g.s.inventory, SEED_B)).toBe(0);
      expect(plotProgress(g.s, g.c, 0).pct).toBeCloseTo(0.5, 5);
    }
    expect(farmSnapshot(on.s)).toEqual(farmSnapshot(off.s));

    // Phase 2: bis über die Reife von B. Ernte B, keine Saat mehr → leer, KEIN Plan mehr.
    advance(off.s, off.c, GROW_B);
    for (let i = 0; i < GROW_B / 60_000; i++) advance(on.s, on.c, 60_000);
    for (const g of [off, on]) {
      expect(itemCount(g.s.inventory, YIELD_B)).toBe(8);
      expect(g.s.farmPlots[0]!.cropId).toBeNull();
      expect(g.s.farmPlots[0]!.nextCropId).toBeNull();
    }
    expect(farmSnapshot(on.s)).toEqual(farmSnapshot(off.s));
  });

  it("leeres Beet mit Plan: im selben Offline-Fenster gesät UND schon geerntet (Fensterbeginn zählt)", () => {
    const g = withCropA(5, 0, 5);
    setNextCrop(g.s, g.c, 0, "crop_b");
    advance(g.s, g.c, GROW_A); // leer, Plan B
    addItem(g.s.inventory, g.c, SEED_B, 2);
    advance(g.s, g.c, GROW_B + GROW_B / 4); // gesät bei t0=GROW_A, reif bei t0+GROW_B, Nachsaat, 25 %
    expect(itemCount(g.s.inventory, YIELD_B)).toBe(8);
    expect(itemCount(g.s.inventory, SEED_B)).toBe(0);
    expect(g.s.farmPlots[0]!.cropId).toBe("crop_b");
    expect(g.s.farmPlots[0]!.plantedAtMs).toBe(GROW_A + GROW_B);
    expect(plotProgress(g.s, g.c, 0).pct).toBeCloseTo(0.25, 5);
  });

  it("manuelles Pflanzen der geplanten Sorte auf das leere Beet erfüllt den Plan", () => {
    const { s, c } = withCropA(5, 0);
    setNextCrop(s, c, 0, "crop_b");
    advance(s, c, GROW_A); // leer, Plan B bleibt
    addItem(s.inventory, c, SEED_B, 1);
    expect(plantCrop(s, c, 0, "crop_b")).toBe(true);
    expect(s.farmPlots[0]!.nextCropId).toBeNull();
    // Andere Sorte manuell gepflanzt → Plan bleibt (greift dann zur nächsten Reife).
    const g2 = withCropA(5, 0);
    setNextCrop(g2.s, g2.c, 0, "crop_b");
    advance(g2.s, g2.c, GROW_A);
    expect(plantCrop(g2.s, g2.c, 0, "crop_a")).toBe(true);
    expect(g2.s.farmPlots[0]!.nextCropId).toBe("crop_b");
  });
});

describe("Folgesorte — Roden, Jetzt wechseln, Robustheit", () => {
  it("uprootPlot verwirft den Plan mit", () => {
    const { s, c } = withCropA(5, 0);
    setNextCrop(s, c, 0, "crop_b");
    expect(uprootPlot(s, 0)).toBe(true);
    expect(s.farmPlots[0]!.cropId).toBeNull();
    expect(s.farmPlots[0]!.nextCropId).toBeNull();
  });

  it("switchToNextCrop (#12.3): rodet und sät die Folgesorte sofort — nur mit Saat", () => {
    const { s, c } = withCropA(5, 0);
    setNextCrop(s, c, 0, "crop_b");
    advance(s, c, GROW_A / 2);
    expect(switchToNextCrop(s, c, 0)).toBe(false); // keine Saat B → nichts passiert
    expect(s.farmPlots[0]!.cropId).toBe("crop_a");
    expect(s.farmPlots[0]!.nextCropId).toBe("crop_b");
    addItem(s.inventory, c, SEED_B, 1);
    expect(switchToNextCrop(s, c, 0)).toBe(true);
    expect(itemCount(s.inventory, SEED_B)).toBe(0);
    expect(itemCount(s.inventory, YIELD_A)).toBe(0); // keine Ernte von A (gerodet)
    const p = s.farmPlots[0]!;
    expect(p.cropId).toBe("crop_b");
    expect(p.nextCropId).toBeNull();
    expect(p.plantedAtMs).toBe(s.elapsedMs);
    expect(switchToNextCrop(s, c, 0)).toBe(false); // kein Plan mehr
  });

  it("Plan auf eine aus dem Content entfernte Sorte wird beim Tick verworfen, Beet läuft normal weiter", () => {
    const { s, c } = withCropA(5, 0);
    s.farmPlots[0]!.nextCropId = "ghost_crop";
    advance(s, c, GROW_A * 2 + GROW_A / 2); // 2 Ernten A mit Auto-Nachsaat
    expect(itemCount(s.inventory, YIELD_A)).toBe(16);
    expect(s.farmPlots[0]!.cropId).toBe("crop_a");
    expect(s.farmPlots[0]!.nextCropId).toBeNull();
  });

  it("Alt-Save-Beet OHNE das Feld (undefined) verhält sich wie heute: 3,5 Zyklen = 3 Ernten, Rest bleibt", () => {
    const c = twoCropContent();
    const s = createGame({ name: "X" }, c, 31337);
    addItem(s.inventory, c, SEED_A, 10);
    const legacy = { cropId: "crop_a", plantedAtMs: 0, autoReplant: true, readyYield: 0, readyItem: null };
    s.farmPlots[0] = legacy as FarmPlot; // kein nextCropId-Key
    // Referenz: identisches Spiel mit sauberem Feld.
    const r = createGame({ name: "X" }, c, 31337);
    addItem(r.inventory, c, SEED_A, 10);
    r.farmPlots[0] = { ...legacy, nextCropId: null };
    advance(s, c, GROW_A * 3 + GROW_A / 2);
    advance(r, c, GROW_A * 3 + GROW_A / 2);
    expect(itemCount(s.inventory, YIELD_A)).toBe(24);
    expect(itemCount(s.inventory, SEED_A)).toBe(7);
    expect(s.farmPlots[0]!.cropId).toBe("crop_a");
    expect(s.farmPlots[0]!.plantedAtMs).toBe(GROW_A * 3);
    expect(farmSnapshot(s)).toEqual(farmSnapshot(r));
  });

  it("Bit-Identität ohne Plan: neue Schleife == alte Rechnung (Ernten, Saat, RNG, Restübertrag)", () => {
    // Alte Rechnung nachgestellt: cycles = floor(elapsed/growMs), Rest = elapsed − cycles·growMs.
    const { s, c } = withCropA(10, 0, 2024);
    const before = s.rng.state;
    const elapsed = GROW_A * 4 + 123_400;
    advance(s, c, elapsed);
    expect(itemCount(s.inventory, YIELD_A)).toBe(4 * 8);
    expect(itemCount(s.inventory, SEED_A)).toBe(9 - 4);
    expect(s.farmPlots[0]!.plantedAtMs).toBe(GROW_A * 4);
    expect(s.rng.state).not.toBe(before);
    // Leeres Spiel ohne Plan: keinerlei Wirkung, kein RNG.
    const empty = createGame({ name: "Y" }, c, 2024);
    const b2 = empty.rng.state;
    advance(empty, c, elapsed);
    expect(empty.rng.state).toBe(b2);
    for (const p of empty.farmPlots) expect(p.nextCropId).toBeNull();
  });
});
