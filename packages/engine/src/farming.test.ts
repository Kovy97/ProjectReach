import { describe, expect, it } from "vitest";
import type { ContentDB, CropDef, ItemDef } from "@hearthforge/shared";
import { MAX_FARM_PLOTS, plotsUnlocked } from "@hearthforge/shared";
import { content } from "@hearthforge/content";
import { createGame } from "./state";
import { advance } from "./tick";
import { addItem, itemCount } from "./inventory";
import { collectPlot, plantCrop, plotProgress, setAutoReplant, tickFarmPlots, uprootPlot } from "./farming";

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
    s.farmPlots[8] = { cropId: "test_crop", plantedAtMs: 0, autoReplant: true, readyYield: 0, readyItem: null };
    const before = s.rng.state;
    advance(s, c, GROW * 5);
    expect(s.rng.state).toBe(before); // kein grantHarvest
    expect(itemCount(s.inventory, YIELD)).toBe(0);
    expect(s.farmPlots[8]!.cropId).toBe("test_crop"); // bleibt erhalten, reift später wenn frei
  });

  it("ohne Crop-Katalog (content.crops undefined) ist tickFarmPlots ein No-op", () => {
    const s = createGame({ name: "X" }, content, 7);
    s.farmPlots[0] = { cropId: "whatever", plantedAtMs: 0, autoReplant: true, readyYield: 0, readyItem: null };
    const before = s.rng.state;
    tickFarmPlots(s, content); // content ohne crops
    expect(s.rng.state).toBe(before);
    // Defensiv: unbekannte Crop wird geleert.
    expect(s.farmPlots[0]!.cropId).toBeNull();
  });
});
