import { describe, expect, it } from "vitest";
import type { CampBuildingDef, ContentDB, GameState } from "@hearthforge/shared";
import {
  CAMP_FOOTPRINT,
  CAMP_LAYOUT_AREA,
  CAMP_LAYOUT_CLAIM,
  CAMP_MAP_BUILDABLE,
  CAMP_TOWNHALL_ID,
  campBoxesOverlap,
  campFootprint,
  campLayoutSlots,
  campPointInBuildable,
  campPositionFitsMap,
  campRepairPositions,
  defaultCampState,
} from "@hearthforge/shared";
import { content } from "@hearthforge/content";
import { createGame } from "./state";
import { advance } from "./tick";
import { addItem, itemCount } from "./inventory";
import { bankCount } from "./bank";
import {
  campBuildStartReason,
  campBuildingDef,
  campBuildingLevel,
  campBuildingPosition,
  campDemolishReason,
  campDemolishRefund,
  campMoveReason,
  campOccupiedPositions,
  campPlacementReason,
  campPositionReason,
  campUsedBuildSlots,
  cancelCampBuild,
  demolishCampBuilding,
  moveCampBuilding,
  placeCampBuilding,
  resetCampMapVisual,
  setCampMapVisual,
  startCampBuild,
} from "./camp";

/**
 * New-Haven-Dorfkarte — FREIE PLATZIERUNG (Task #370, SAVE_VERSION 78).
 * Grundlage: design/newhaven-karte-spec.md §2 (Kernmechanik) + §4 (Logik-Umfang).
 *
 * Abgedeckt: Flächen-/Raster-Geometrie, `placeCampBuilding` mit allen Gates in fester Reihenfolge,
 * kostenloses `moveCampBuilding` (inkl. Sperre während des Baus), `demolishCampBuilding` mit exakter
 * Erstattungs-Mathematik (Summe aller Stufen, je Posten abgerundet), die Prädikat==Verb-Guards
 * (Muster Task #364 Fix 5a) und der offline==online-Beweis.
 */

const FISH = "camp_fishing_hut";
const SAW = "camp_sawpit";

/** Frischer Spielstand (New Haven ist seit Task #365 ab Spielstart offen). */
function game(seed = 1): GameState {
  return createGame({ name: "Karte" }, content, seed);
}

/** Zahlt Gold + alle Materialien einer Stufe direkt ins Inventar/Konto ein. */
function fund(s: GameState, buildingId: string, targetLevel: number): void {
  const def = campBuildingDef(content, buildingId)!;
  const lvl = def.levels[targetLevel - 1]!;
  s.character.gold += lvl.gold;
  for (const c of lvl.items) addItem(s.inventory, content, c.itemId, c.qty);
}

/**
 * Setzt ein Gebäude ohne Bauzeit auf eine Stufe UND auf einen Standort (Test-Abkürzung).
 * `buildSeq` wird mitgezogen — Vertrag von `campBoostCached` (s. camp.ts).
 */
function stand(s: GameState, buildingId: string, level: number, x: number, y: number): void {
  s.camp.buildings[buildingId] = level;
  s.camp.positions[buildingId] = { x, y };
  s.camp.buildSeq += 1;
}

// ── 1. Fläche, Grundfläche, Raster (reine Geometrie-Konstanten) ────────────────────────────────

describe("Dorfkarte — freie Kartenfläche & Auto-Raster (0..1-Koordinaten, keine Pixel)", () => {
  it("die Fläche ist wohlgeformt: ≥ 1 Polygon, je ≥ 3 Punkte, alle Koordinaten in 0..1", () => {
    expect(CAMP_MAP_BUILDABLE.length).toBeGreaterThanOrEqual(1);
    for (const poly of CAMP_MAP_BUILDABLE) {
      expect(poly.length).toBeGreaterThanOrEqual(3);
      for (const p of poly) {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThanOrEqual(1);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeLessThanOrEqual(1);
      }
    }
    expect(CAMP_FOOTPRINT.halfW).toBeGreaterThan(0);
    expect(CAMP_FOOTPRINT.halfH).toBeGreaterThan(0);
  });

  it("die volle Karte ist bebaubar; die Gebäude-Grundfläche bleibt innerhalb des Randes", () => {
    // codex:2026-07-31T19:00:03+02:00 — keine Wasser/Fels/Lichtungs-Sperrzonen mehr.
    expect(campPointInBuildable(0.5, 0.5)).toBe(true);
    expect(campPointInBuildable(0.02, 0.02)).toBe(true);
    expect(campPointInBuildable(0.98, 0.98)).toBe(true);
    // codex:2026-07-31T20:21:01+02:00 — der gültige Rand folgt der prozentualen Grundfläche statt einem veralteten Pixelgefühl.
    expect(
      campPositionFitsMap(CAMP_TOWNHALL_ID, {
        x: CAMP_FOOTPRINT.halfW,
        y: CAMP_FOOTPRINT.halfH,
      }),
    ).toBe(true);
    expect(campPositionFitsMap(CAMP_TOWNHALL_ID, { x: 0.02, y: 0.5 })).toBe(false);
    expect(campPointInBuildable(Number.NaN, 0.5)).toBe(false);
    expect(campPointInBuildable(0.5, Number.POSITIVE_INFINITY)).toBe(false);
    expect(campPointInBuildable(1.5, 0.5)).toBe(false);
    expect(campPointInBuildable(-0.1, 0.5)).toBe(false);
  });

  it("das Raster trägt mehr Plätze als es je Gebäude gibt, liegt komplett auf der Lichtung und vergibt jede Zelle nur einmal", () => {
    const slots = campLayoutSlots();
    // 16 Katalog-Gebäude (15 + Taverne) — das Raster muss jedes unterbringen können (Migration/Autoplatzierung).
    expect(slots.length).toBeGreaterThanOrEqual((content.campBuildings ?? []).length);
    for (const s of slots) {
      expect(campPointInBuildable(s.x, s.y)).toBe(true);
      // Release-Fix 0.3.0 (Bot-1 Befund 3): jeder Platz liegt in der zentralen Lichtungsfläche —
      // nicht mehr am Kartenrand (Waldhang/Felswand/Bach/Palisade).
      expect(s.x).toBeGreaterThanOrEqual(CAMP_LAYOUT_AREA.minX);
      expect(s.x).toBeLessThanOrEqual(CAMP_LAYOUT_AREA.maxX);
      expect(s.y).toBeGreaterThanOrEqual(CAMP_LAYOUT_AREA.minY);
      expect(s.y).toBeLessThanOrEqual(CAMP_LAYOUT_AREA.maxY);
      // Die volle Gebäudebühne bleibt im Kartenrand — sonst würde der Reparatur-Pass die
      // Auto-Position beim nächsten Laden wieder verschieben (Auto-Plätze müssen load-stabil sein).
      expect(campPositionFitsMap(CAMP_TOWNHALL_ID, s)).toBe(true);
    }
    // Kein Doppel-Claim: kein Rasterplatz liegt in der Zuständigkeitszelle eines anderen — so
    // vergibt die Auto-Verteilung (campFirstFreeLayoutSlot) jeden Platz höchstens einmal. (Der
    // frühere Voll-Bühnen-Kollisionstest ist bewusst weg: die Lichtungs-Plätze dürfen sich an den
    // Bühnenrändern berühren, Überlappung ist erlaubte Spielerwahl seit Chef-Entscheid 2026-07-31.)
    for (let i = 0; i < slots.length; i++) {
      for (let j = i + 1; j < slots.length; j++) {
        expect(
          campBoxesOverlap(slots[i]!, CAMP_LAYOUT_CLAIM, slots[j]!, { halfW: 0, halfH: 0 }),
          `Rasterplätze ${i}/${j} beanspruchen dieselbe Zelle`,
        ).toBe(false);
      }
    }
    // Stabil über Aufrufe hinweg (Memo darf nichts verändern).
    expect(campLayoutSlots()).toEqual(slots);
  });

  it("Auto-Verteilung: ALLE 16 Katalog-Gebäude bekommen je einen EIGENEN Rasterplatz (Migrations-Garantie)", () => {
    // Härtester Fall der v77→v78-Migration: volles Lager, keine einzige gespeicherte Position.
    // Muss trotz des dichteren Lichtungs-Rasters 1:1 auf die Plätze abbilden (Zellen-Semantik) —
    // seit 1.2.0 inkl. Taverne (16. Gebäude, sechste Raster-Spalte, s. shared CAMP_LAYOUT_COLS).
    const camp = defaultCampState();
    for (const def of content.campBuildings ?? []) camp.buildings[def.id] = 1;
    campRepairPositions(camp, content.campBuildings);
    const slots = campLayoutSlots();
    (content.campBuildings ?? []).forEach((def, i) => {
      expect(camp.positions[def.id], `${def.id} nicht auf Rasterplatz ${i}`).toEqual(slots[i]);
    });
  });

  it("Kollisionstest: Berühren ist erlaubt, Überlappen nicht", () => {
    const a = { x: 0.5, y: 0.5 };
    const touch = { x: 0.5 + 2 * CAMP_FOOTPRINT.halfW, y: 0.5 };
    const inside = { x: 0.5 + CAMP_FOOTPRINT.halfW, y: 0.5 };
    expect(campBoxesOverlap(a, CAMP_FOOTPRINT, touch, CAMP_FOOTPRINT)).toBe(false);
    expect(campBoxesOverlap(a, CAMP_FOOTPRINT, inside, CAMP_FOOTPRINT)).toBe(true);
    // Nur EINE Achse überlappt ⇒ keine Kollision.
    expect(campBoxesOverlap(a, CAMP_FOOTPRINT, { x: 0.5, y: 0.9 }, CAMP_FOOTPRINT)).toBe(false);
    expect(campFootprint(FISH)).toEqual(CAMP_FOOTPRINT);
  });
});

// ── 2. placeCampBuilding: Platzierung + Baustart in EINEM Schritt ──────────────────────────────

describe("placeCampBuilding: Gates in fester Reihenfolge", () => {
  it("Normalfall: Position gespeichert, Bau gestartet, Kosten gebucht", () => {
    const s = game();
    fund(s, CAMP_TOWNHALL_ID, 1);
    expect(placeCampBuilding(s, content, CAMP_TOWNHALL_ID, 0.5, 0.5)).toBe("ok");
    expect(campBuildingPosition(s, CAMP_TOWNHALL_ID)).toEqual({ x: 0.5, y: 0.5 });
    expect(s.camp.buildJob).toEqual({
      buildingId: CAMP_TOWNHALL_ID,
      targetLevel: 1,
      remainingMs: 600_000,
    });
    expect(s.character.gold).toBe(0);
    expect(s.stats.goldSpent).toBe(500);
    // Der Platz ist ab dem Baustart belegt (der Bautrupp reserviert ihn).
    expect(campOccupiedPositions(s)).toEqual([{ buildingId: CAMP_TOWNHALL_ID, pos: { x: 0.5, y: 0.5 } }]);
  });

  it("Koordinaten werden auf 4 Nachkommastellen gerundet gespeichert (stabile Saves)", () => {
    const s = game();
    fund(s, CAMP_TOWNHALL_ID, 1);
    expect(placeCampBuilding(s, content, CAMP_TOWNHALL_ID, 0.523456789, 0.4987654)).toBe("ok");
    expect(campBuildingPosition(s, CAMP_TOWNHALL_ID)).toEqual({ x: 0.5235, y: 0.4988 });
  });

  it("unknown_building: ID nicht im Katalog", () => {
    const s = game();
    expect(placeCampBuilding(s, content, "camp_luftschloss", 0.5, 0.5)).toBe("unknown_building");
  });

  it("already_built: was steht, wird ausgebaut (startCampBuild), nicht erneut platziert", () => {
    const s = game();
    stand(s, CAMP_TOWNHALL_ID, 1, 0.5, 0.5);
    fund(s, CAMP_TOWNHALL_ID, 2);
    expect(placeCampBuilding(s, content, CAMP_TOWNHALL_ID, 0.3, 0.5)).toBe("already_built");
    // Die Position bleibt unangetastet — ein Ausbau verrückt nie ein Gebäude.
    expect(campBuildingPosition(s, CAMP_TOWNHALL_ID)).toEqual({ x: 0.5, y: 0.5 });
    expect(startCampBuild(s, content, CAMP_TOWNHALL_ID)).toBe("ok");
    expect(campBuildingPosition(s, CAMP_TOWNHALL_ID)).toEqual({ x: 0.5, y: 0.5 });
  });

  it("out_of_bounds: Grundfläche über Kartenrand, außerhalb 0..1 und nicht-endliche Werte", () => {
    const s = game();
    fund(s, CAMP_TOWNHALL_ID, 1);
    for (const [x, y] of [
      [0.02, 0.5],
      [0.5, 0.02],
      [0.98, 0.98],
      [1.5, 0.5],
      [-0.2, 0.5],
      [Number.NaN, 0.5],
      [0.5, Number.POSITIVE_INFINITY],
    ] as const) {
      expect(placeCampBuilding(s, content, CAMP_TOWNHALL_ID, x, y), `${x}/${y}`).toBe("out_of_bounds");
    }
    // Kein Bau gestartet, kein Gold weg, keine Position angelegt.
    expect(s.camp.buildJob).toBeNull();
    expect(s.camp.positions).toEqual({});
    expect(s.stats.goldSpent).toBe(0);
  });

  it("Überlappung ist erlaubt: Gebäude besitzen gegeneinander keine Hitbox", () => {
    const s = game();
    stand(s, CAMP_TOWNHALL_ID, 1, 0.5, 0.5);
    fund(s, FISH, 1);
    // codex:2026-07-31T23:56:00+02:00 — exakt derselbe Mittelpunkt ist legal; nur der Rand bleibt Gate.
    expect(placeCampBuilding(s, content, FISH, 0.5, 0.5)).toBe("ok");
    expect(campBuildingPosition(s, FISH)).toEqual({ x: 0.5, y: 0.5 });
  });

  it("crew_busy / no_slot / cannot_afford kommen unverändert aus campBuildStartReason", () => {
    // crew_busy
    const busy = game();
    fund(busy, CAMP_TOWNHALL_ID, 1);
    expect(placeCampBuilding(busy, content, CAMP_TOWNHALL_ID, 0.5, 0.5)).toBe("ok");
    fund(busy, FISH, 1);
    expect(placeCampBuilding(busy, content, FISH, 0.2, 0.5)).toBe("crew_busy");

    // no_slot: ohne Zentralhaus gibt es 0 Bauplätze — die Fläche ist trotzdem in Ordnung.
    const noSlot = game();
    fund(noSlot, FISH, 1);
    expect(campPositionReason(noSlot, FISH, 0.5, 0.5)).toBe("ok");
    expect(placeCampBuilding(noSlot, content, FISH, 0.5, 0.5)).toBe("no_slot");

    // cannot_afford
    const broke = game();
    expect(placeCampBuilding(broke, content, CAMP_TOWNHALL_ID, 0.5, 0.5)).toBe("cannot_afford");
  });

  it("Reihenfolge: der Kartenrand schlägt die Bau-Gates; Überlappung ist kein Grund mehr", () => {
    const s = game(); // pleite, kein Zentralhaus ⇒ cannot_afford/no_slot lägen an
    expect(placeCampBuilding(s, content, FISH, 0.02, 0.02)).toBe("out_of_bounds");
    stand(s, CAMP_TOWNHALL_ID, 1, 0.5, 0.5);
    // codex:2026-07-31T23:56:00+02:00 — trotz überlappendem Mittelpunkt greift erst das echte Kostengate.
    expect(placeCampBuilding(s, content, FISH, 0.52, 0.5)).toBe("cannot_afford");
    // …und `already_built` schlägt beide.
    expect(placeCampBuilding(s, content, CAMP_TOWNHALL_ID, 0.02, 0.02)).toBe("already_built");
  });

  it("Kapazität bleibt reine ANZAHL-Grenze: das 5. Gebäude blockt trotz freier Fläche", () => {
    const s = game();
    // codex:2026-07-31T19:00:03+02:00 — Zentralhaus I gewährt 4 Gebäudekapazität.
    stand(s, CAMP_TOWNHALL_ID, 1, 0.5, 0.5);
    const slots = campLayoutSlots();
    const ids = [SAW, "camp_mine_adit", "camp_seed_garden", "camp_fence_tent"];
    ids.forEach((id, i) => stand(s, id, 1, slots[i]!.x, slots[i]!.y));
    expect(campUsedBuildSlots(s, content)).toBe(4);
    fund(s, FISH, 1);
    const free = slots[10]!;
    expect(campPositionReason(s, FISH, free.x, free.y)).toBe("ok");
    expect(placeCampBuilding(s, content, FISH, free.x, free.y)).toBe("no_slot");
  });

  it("Debug-Free erlässt nur Kosten; Position, Crew und Kapazität bleiben echte Gates", () => {
    // codex:2026-07-31T19:00:03+02:00 — flüchtiger Optionsparameter, kein Save-Feld.
    const free = game();
    expect(placeCampBuilding(free, content, CAMP_TOWNHALL_ID, 0.5, 0.5, { waiveCosts: true })).toBe("ok");
    expect(free.character.gold).toBe(0);
    expect(free.stats.goldSpent).toBe(0);
    expect(itemCount(free.inventory, "oak_log")).toBe(0);
    expect(placeCampBuilding(free, content, FISH, 0.7, 0.5, { waiveCosts: true })).toBe("crew_busy");

    const noCapacity = game();
    expect(placeCampBuilding(noCapacity, content, FISH, 0.5, 0.5, { waiveCosts: true })).toBe("no_slot");
    expect(placeCampBuilding(noCapacity, content, CAMP_TOWNHALL_ID, 0.02, 0.5, { waiveCosts: true })).toBe("out_of_bounds");
  });
});

// ── 3. moveCampBuilding: kostenlos, jederzeit — außer am Bautrupp ──────────────────────────────

describe("moveCampBuilding: reine Anordnung (kostenlos, keine Bauzeit)", () => {
  it("verschiebt und ändert sonst NICHTS (Stufe, Gold, Material, Bauauftrag, buildSeq)", () => {
    const s = game();
    stand(s, CAMP_TOWNHALL_ID, 2, 0.5, 0.5);
    s.character.gold = 1234;
    addItem(s.inventory, content, "oak_log", 7);
    const seqBefore = s.camp.buildSeq;
    expect(moveCampBuilding(s, content, CAMP_TOWNHALL_ID, 0.3, 0.62)).toBe("ok");
    expect(campBuildingPosition(s, CAMP_TOWNHALL_ID)).toEqual({ x: 0.3, y: 0.62 });
    expect(campBuildingLevel(s, CAMP_TOWNHALL_ID)).toBe(2);
    expect(s.character.gold).toBe(1234);
    expect(s.stats.goldSpent).toBe(0);
    expect(itemCount(s.inventory, "oak_log")).toBe(7);
    expect(s.camp.buildJob).toBeNull();
    expect(s.camp.buildSeq).toBe(seqBefore); // Verschieben ist keine Bau-Änderung
  });

  it("under_construction: weder der laufende NEUBAU noch der laufende AUSBAU ist ziehbar", () => {
    // Neubau
    const neu = game();
    fund(neu, CAMP_TOWNHALL_ID, 1);
    expect(placeCampBuilding(neu, content, CAMP_TOWNHALL_ID, 0.5, 0.5)).toBe("ok");
    expect(moveCampBuilding(neu, content, CAMP_TOWNHALL_ID, 0.3, 0.5)).toBe("under_construction");
    expect(campBuildingPosition(neu, CAMP_TOWNHALL_ID)).toEqual({ x: 0.5, y: 0.5 });

    // Ausbau
    const aus = game();
    stand(aus, CAMP_TOWNHALL_ID, 1, 0.5, 0.5);
    fund(aus, CAMP_TOWNHALL_ID, 2);
    expect(startCampBuild(aus, content, CAMP_TOWNHALL_ID)).toBe("ok");
    expect(moveCampBuilding(aus, content, CAMP_TOWNHALL_ID, 0.3, 0.5)).toBe("under_construction");
    // Ein ANDERES Gebäude darf währenddessen ziehen (der Bautrupp hindert nur sein eigenes).
    stand(aus, FISH, 1, 0.25, 0.6);
    expect(moveCampBuilding(aus, content, FISH, 0.2, 0.7)).toBe("ok");
  });

  it("not_placed / unknown_building / out_of_bounds; Überlappung bleibt frei", () => {
    const s = game();
    expect(moveCampBuilding(s, content, "camp_luftschloss", 0.5, 0.5)).toBe("unknown_building");
    expect(moveCampBuilding(s, content, FISH, 0.5, 0.5)).toBe("not_placed");
    stand(s, FISH, 1, 0.3, 0.5);
    stand(s, SAW, 1, 0.6, 0.5);
    expect(moveCampBuilding(s, content, FISH, 0.02, 0.02)).toBe("out_of_bounds");
    // codex:2026-07-31T23:56:00+02:00 — Ziel darf die Bühne des Sägeplatzes überlagern.
    expect(moveCampBuilding(s, content, FISH, 0.56, 0.5)).toBe("ok");
    expect(campBuildingPosition(s, FISH)).toEqual({ x: 0.56, y: 0.5 });
    // Auf den EIGENEN Platz zurück ist immer erlaubt (kollidiert nie mit sich selbst).
    expect(moveCampBuilding(s, content, FISH, 0.3, 0.5)).toBe("ok");
  });
});

// ── 4. demolishCampBuilding: 50 % der Summe ALLER Stufen, abgerundet ───────────────────────────

describe("demolishCampBuilding: Erstattungs-Mathematik + Nebenwirkungen", () => {
  it("Fischerhütte III: Gold 20 800 → 10 400, jedes Material einzeln halbiert und abgerundet (15 → 7)", () => {
    const s = game();
    stand(s, FISH, 3, 0.5, 0.5);
    expect(campDemolishRefund(s, content, FISH)).toEqual({
      gold: 10_400,
      items: [
        { itemId: "blackwood_log", qty: 20 },
        { itemId: "raw_ironscale_bass", qty: 30 },
        { itemId: "timber_beam", qty: 1 },
        { itemId: "ironbark_log", qty: 30 },
        { itemId: "raw_lobster", qty: 40 },
        { itemId: "timber_brace", qty: 4 },
        { itemId: "raw_crypteel", qty: 50 },
        { itemId: "raw_anglerfish", qty: 30 },
        { itemId: "shadowpine_log", qty: 30 },
        { itemId: "timber_anchor", qty: 7 }, // 15 / 2 = 7,5 → abgerundet
      ],
    });
  });

  it("nur die GEBAUTEN Stufen zählen (Stufe I ≠ Stufe III)", () => {
    const s = game();
    stand(s, FISH, 1, 0.5, 0.5);
    expect(campDemolishRefund(s, content, FISH)).toEqual({
      gold: 400,
      items: [
        { itemId: "blackwood_log", qty: 20 },
        { itemId: "raw_ironscale_bass", qty: 30 },
        { itemId: "timber_beam", qty: 1 },
      ],
    });
  });

  it("SUMMIEREN, dann halbieren — nie je Stufe abrunden (ungerade Gold-/Mengen-Summen)", () => {
    // Synthetischer Katalog: 3 × 501 Gold + 3 × 1 Brett. Summe 1503/3 → 751 Gold + 1 Brett.
    // Je Stufe gerundet wären es 3 × 250 = 750 Gold und 3 × 0 = 0 Bretter (die „Falle" aus §4).
    const def: CampBuildingDef = {
      id: "camp_test_odd",
      name: { en: "Odd", de: "Ungerade" },
      levels: [1, 2, 3].map(() => ({
        gold: 501,
        items: [{ itemId: "oak_log", qty: 1 }],
        buildMs: 1000,
        boost: { kind: "buildSpeed" as const, value: 0 },
      })),
    };
    const odd = { ...content, campBuildings: [...(content.campBuildings ?? []), def] } as ContentDB;
    const s = game();
    s.camp.buildings.camp_test_odd = 3;
    s.camp.positions.camp_test_odd = { x: 0.5, y: 0.5 };
    s.camp.buildSeq += 1;
    expect(campDemolishRefund(s, odd, "camp_test_odd")).toEqual({
      gold: 751,
      items: [{ itemId: "oak_log", qty: 1 }],
    });
  });

  it("Abriss: Stufe 0, Platz frei, Bauplatz frei, Erstattung über die Normalpfade, buildSeq erhöht", () => {
    const s = game();
    stand(s, CAMP_TOWNHALL_ID, 1, 0.5, 0.5);
    stand(s, FISH, 1, 0.25, 0.6);
    s.character.gold = 0;
    s.stats.goldSpent = 5_000;
    const seqBefore = s.camp.buildSeq;
    expect(campUsedBuildSlots(s, content)).toBe(1);

    expect(demolishCampBuilding(s, content, FISH)).toBe("ok");
    expect(campBuildingLevel(s, FISH)).toBe(0);
    expect(s.camp.buildings[FISH]).toBeUndefined();
    expect(campBuildingPosition(s, FISH)).toBeNull();
    expect(campUsedBuildSlots(s, content)).toBe(0);
    expect(s.camp.buildSeq).toBe(seqBefore + 1); // Boost-Cache-Schlüssel muss mitziehen
    expect(s.camp.lastCompletedBuild).toBeNull(); // ein Abriss ist keine Fertigstellung

    // Gold zurück + Lebenszeit-Statistik um den erstatteten Anteil korrigiert.
    expect(s.character.gold).toBe(400);
    expect(s.stats.goldSpent).toBe(4_600);
    // Materialien über grantLoot (Inventar → Bank → Post): nichts geht verloren.
    expect(itemCount(s.inventory, "blackwood_log") + bankCount(s, "blackwood_log")).toBe(20);
    expect(itemCount(s.inventory, "timber_beam") + bankCount(s, "timber_beam")).toBe(1);
  });

  it("löscht den Veredelungs-Slot der abgerissenen Anlage", () => {
    const s = game();
    stand(s, "camp_smelter", 1, 0.5, 0.5);
    s.camp.refine.camp_smelter = { recipeId: "smelt_iron", accMs: 1000, produced: 5 };
    expect(demolishCampBuilding(s, content, "camp_smelter")).toBe("ok");
    expect(s.camp.refine.camp_smelter).toBeUndefined();
  });

  it("not_built / unknown_building / under_construction (erst abbrechen, dann abreißen)", () => {
    const s = game();
    expect(demolishCampBuilding(s, content, "camp_luftschloss")).toBe("unknown_building");
    expect(demolishCampBuilding(s, content, FISH)).toBe("not_built");
    expect(campDemolishRefund(s, content, FISH)).toEqual({ gold: 0, items: [] });

    stand(s, CAMP_TOWNHALL_ID, 1, 0.5, 0.5);
    fund(s, CAMP_TOWNHALL_ID, 2);
    expect(startCampBuild(s, content, CAMP_TOWNHALL_ID)).toBe("ok");
    expect(demolishCampBuilding(s, content, CAMP_TOWNHALL_ID)).toBe("under_construction");
    expect(campBuildingLevel(s, CAMP_TOWNHALL_ID)).toBe(1);
    // Nach dem Abbruch geht es (der Ausbau-Abbruch lässt Stufe I stehen).
    expect(cancelCampBuild(s, content)).toBe(true);
    expect(demolishCampBuilding(s, content, CAMP_TOWNHALL_ID)).toBe("ok");
  });

  it("Bauen → Abreißen → Bauen ist verlustfrei zulässig (der Platz wird wirklich frei)", () => {
    const s = game();
    stand(s, CAMP_TOWNHALL_ID, 1, 0.5, 0.5);
    stand(s, FISH, 1, 0.25, 0.6);
    expect(demolishCampBuilding(s, content, FISH)).toBe("ok");
    fund(s, FISH, 1);
    expect(placeCampBuilding(s, content, FISH, 0.25, 0.6)).toBe("ok");
  });
});

// ── 5. Prädikat == Verb (Muster Task #364 Fix 5a) ──────────────────────────────────────────────

describe("Prädikate sind deckungsgleich mit ihren Verben und mutieren nichts", () => {
  /** Repräsentative Lagen — jede prüft alle Gebäude × alle Testpositionen. */
  function situations(): { label: string; state: GameState }[] {
    const fresh = game();

    const funded = game();
    fund(funded, CAMP_TOWNHALL_ID, 1);

    const busy = game();
    fund(busy, CAMP_TOWNHALL_ID, 1);
    startCampBuild(busy, content, CAMP_TOWNHALL_ID);

    const grown = game();
    stand(grown, CAMP_TOWNHALL_ID, 2, 0.5, 0.5);
    grown.character.gold = 10_000_000;
    const slots = campLayoutSlots();
    [FISH, SAW, "camp_mine_adit"].forEach((id, i) => stand(grown, id, 1, slots[i]!.x, slots[i]!.y));
    for (const def of content.campBuildings ?? []) {
      for (const c of def.levels[0]!.items) addItem(grown.inventory, content, c.itemId, c.qty);
      for (const c of def.levels[1]!.items) addItem(grown.inventory, content, c.itemId, c.qty);
    }

    const maxed = game();
    (content.campBuildings ?? []).forEach((def, i) => {
      const slot = campLayoutSlots()[i]!;
      stand(maxed, def.id, 3, slot.x, slot.y);
    });

    return [
      { label: "frisch", state: fresh },
      { label: "bezahlbar", state: funded },
      { label: "Bautrupp beschäftigt", state: busy },
      { label: "ausgebautes Lager", state: grown },
      { label: "voll ausgebaut", state: maxed },
    ];
  }

  const PROBES: [number, number][] = [
    [0.5, 0.5],
    [0.25, 0.6],
    [0.62, 0.5],
    [0.02, 0.02], // außerhalb
    [1.4, 0.5], // außerhalb
    [Number.NaN, 0.5], // außerhalb
    // Rand-exakte Minimal-Position (Bühne exakt im Kartenrand) — seit dem Lichtungs-Raster
    // (2026-08-03) kein Rasterplatz mehr, aber weiterhin die knappste legale Spielerwahl.
    [CAMP_FOOTPRINT.halfW, CAMP_FOOTPRINT.halfH],
  ];

  it("campPlacementReason == placeCampBuilding in jeder Lage (alle Gebäude × alle Positionen)", () => {
    for (const { label, state } of situations()) {
      for (const def of [...(content.campBuildings ?? []), { id: "camp_luftschloss" } as CampBuildingDef]) {
        for (const [x, y] of PROBES) {
          const predicted = campPlacementReason(state, content, def.id, x, y);
          const copy = structuredClone(state);
          const actual = placeCampBuilding(copy, content, def.id, x, y);
          expect(predicted, `${label} / ${def.id} / ${x},${y}`).toBe(actual);
        }
      }
    }
  });

  it("campMoveReason == moveCampBuilding und campDemolishReason == demolishCampBuilding", () => {
    for (const { label, state } of situations()) {
      for (const def of [...(content.campBuildings ?? []), { id: "camp_luftschloss" } as CampBuildingDef]) {
        for (const [x, y] of PROBES) {
          const predictedMove = campMoveReason(state, content, def.id, x, y);
          const moveCopy = structuredClone(state);
          expect(predictedMove, `move ${label} / ${def.id} / ${x},${y}`).toBe(
            moveCampBuilding(moveCopy, content, def.id, x, y),
          );
        }
        const predictedDemolish = campDemolishReason(state, content, def.id);
        const demoCopy = structuredClone(state);
        expect(predictedDemolish, `demolish ${label} / ${def.id}`).toBe(
          demolishCampBuilding(demoCopy, content, def.id),
        );
      }
    }
  });

  it("alle Prädikate mutieren NICHTS — auch nicht bei fehlendem camp-Objekt (UI ruft pro Render)", () => {
    const s = game();
    fund(s, CAMP_TOWNHALL_ID, 1);
    stand(s, FISH, 1, 0.25, 0.6);
    const before = structuredClone(s);
    for (const def of content.campBuildings ?? []) {
      campPlacementReason(s, content, def.id, 0.5, 0.5);
      campMoveReason(s, content, def.id, 0.5, 0.5);
      campDemolishReason(s, content, def.id);
      campDemolishRefund(s, content, def.id);
      campPositionReason(s, def.id, 0.5, 0.5);
      campOccupiedPositions(s);
      campBuildingPosition(s, def.id);
    }
    expect(s).toEqual(before);

    const legacy = game();
    delete (legacy as Partial<GameState>).camp;
    expect(campPlacementReason(legacy, content, CAMP_TOWNHALL_ID, 0.5, 0.5)).toBe("cannot_afford");
    expect(campMoveReason(legacy, content, CAMP_TOWNHALL_ID, 0.5, 0.5)).toBe("not_placed");
    expect(campDemolishReason(legacy, content, CAMP_TOWNHALL_ID)).toBe("not_built");
    expect(campOccupiedPositions(legacy)).toEqual([]);
    expect(legacy.camp).toBeUndefined();
  });
});

// ── 6. Verhältnis zu startCampBuild / cancelCampBuild ──────────────────────────────────────────

describe("startCampBuild bleibt gültig: Ausbau ohne Positionswechsel, Neubau mit Auto-Platz", () => {
  it("Neubau OHNE Positionswahl (Listen-Ansicht) bekommt den ersten freien Rasterplatz", () => {
    const s = game();
    fund(s, CAMP_TOWNHALL_ID, 1);
    expect(startCampBuild(s, content, CAMP_TOWNHALL_ID)).toBe("ok");
    const auto = campBuildingPosition(s, CAMP_TOWNHALL_ID);
    expect(auto).toEqual(campLayoutSlots()[0]);
    expect(campPointInBuildable(auto!.x, auto!.y)).toBe(true);

    // Das nächste Gebäude nimmt den nächsten freien Platz — nie denselben.
    advance(s, content, 600_000);
    fund(s, FISH, 1);
    expect(startCampBuild(s, content, FISH)).toBe("ok");
    expect(campBuildingPosition(s, FISH)).toEqual(campLayoutSlots()[1]);
  });

  it("Ausbau (Stufe II) lässt die Position exakt stehen", () => {
    const s = game();
    stand(s, CAMP_TOWNHALL_ID, 1, 0.42, 0.66);
    fund(s, CAMP_TOWNHALL_ID, 2);
    expect(startCampBuild(s, content, CAMP_TOWNHALL_ID)).toBe("ok");
    expect(campBuildingPosition(s, CAMP_TOWNHALL_ID)).toEqual({ x: 0.42, y: 0.66 });
    advance(s, content, 8 * 3_600_000);
    expect(campBuildingLevel(s, CAMP_TOWNHALL_ID)).toBe(2);
    expect(campBuildingPosition(s, CAMP_TOWNHALL_ID)).toEqual({ x: 0.42, y: 0.66 });
  });

  it("cancelCampBuild gibt den reservierten Platz eines NEUBAUS frei, den eines AUSBAUS nicht", () => {
    const neu = game();
    fund(neu, CAMP_TOWNHALL_ID, 1);
    expect(placeCampBuilding(neu, content, CAMP_TOWNHALL_ID, 0.5, 0.5)).toBe("ok");
    expect(cancelCampBuild(neu, content)).toBe(true);
    expect(campBuildingPosition(neu, CAMP_TOWNHALL_ID)).toBeNull();
    expect(neu.camp.positions).toEqual({});
    // Der Platz ist wirklich wieder frei — ein anderes Gebäude darf dort hin.
    stand(neu, CAMP_TOWNHALL_ID, 1, 0.2, 0.5);
    fund(neu, FISH, 1);
    expect(placeCampBuilding(neu, content, FISH, 0.5, 0.5)).toBe("ok");

    const aus = game();
    stand(aus, CAMP_TOWNHALL_ID, 1, 0.5, 0.5);
    fund(aus, CAMP_TOWNHALL_ID, 2);
    expect(startCampBuild(aus, content, CAMP_TOWNHALL_ID)).toBe("ok");
    expect(cancelCampBuild(aus, content)).toBe(true);
    expect(campBuildingPosition(aus, CAMP_TOWNHALL_ID)).toEqual({ x: 0.5, y: 0.5 });
  });

  it("campBuildStartReason bleibt unverändert das Bau-Prädikat (keine Karten-Gründe darin)", () => {
    const s = game();
    fund(s, CAMP_TOWNHALL_ID, 1);
    expect(campBuildStartReason(s, content, CAMP_TOWNHALL_ID)).toBe("ok");
  });
});

// codex:2026-08-03T12:45:00+02:00 — SAVE_VERSION 80: visuelle Gebäude-Anpassung ist ein
// Engine-Verb, damit UI, Autosave und Save-Härtung denselben Vertrag verwenden.
describe("Dorfkarte — persistierte visuelle Anpassung", () => {
  it("speichert Skalierung und Spiegelung, klemmt Werte und lässt sie bei Bewegung bestehen", () => {
    const s = game();
    stand(s, CAMP_TOWNHALL_ID, 1, 0.5, 0.5);

    expect(setCampMapVisual(s, content, CAMP_TOWNHALL_ID, { scalePercent: 155.6, flipped: true })).toBe(true);
    expect(s.camp.mapVisuals[CAMP_TOWNHALL_ID]).toEqual({ scalePercent: 156, flipped: true });
    expect(moveCampBuilding(s, content, CAMP_TOWNHALL_ID, 0.6, 0.6)).toBe("ok");
    expect(s.camp.mapVisuals[CAMP_TOWNHALL_ID]).toEqual({ scalePercent: 156, flipped: true });

    expect(setCampMapVisual(s, content, CAMP_TOWNHALL_ID, { scalePercent: -20, flipped: false })).toBe(true);
    expect(s.camp.mapVisuals[CAMP_TOWNHALL_ID]?.scalePercent).toBe(1);
    expect(setCampMapVisual(s, content, CAMP_TOWNHALL_ID, { scalePercent: 999, flipped: false })).toBe(true);
    expect(s.camp.mapVisuals[CAMP_TOWNHALL_ID]?.scalePercent).toBe(300);
  });

  it("weist unbekannte/unplatzierte/ungültige Änderungen ab und Reset entfernt den Override", () => {
    const s = game();
    expect(setCampMapVisual(s, content, CAMP_TOWNHALL_ID, { scalePercent: 150, flipped: true })).toBe(false);
    stand(s, CAMP_TOWNHALL_ID, 1, 0.5, 0.5);
    expect(setCampMapVisual(s, content, "camp_unknown", { scalePercent: 150, flipped: true })).toBe(false);
    expect(setCampMapVisual(s, content, CAMP_TOWNHALL_ID, { scalePercent: Number.NaN, flipped: true })).toBe(false);
    expect(setCampMapVisual(s, content, CAMP_TOWNHALL_ID, { scalePercent: 150, flipped: true })).toBe(true);
    expect(resetCampMapVisual(s, content, CAMP_TOWNHALL_ID)).toBe(true);
    expect(s.camp.mapVisuals).toEqual({});
    expect(resetCampMapVisual(s, content, CAMP_TOWNHALL_ID)).toBe(false);
  });

  it("entfernt Overrides bei Abriss und beim Abbruch eines nie fertiggestellten Neubaus", () => {
    const built = game();
    stand(built, FISH, 1, 0.5, 0.5);
    expect(setCampMapVisual(built, content, FISH, { scalePercent: 165, flipped: true })).toBe(true);
    expect(demolishCampBuilding(built, content, FISH)).toBe("ok");
    expect(built.camp.mapVisuals).toEqual({});

    const pending = game();
    fund(pending, CAMP_TOWNHALL_ID, 1);
    expect(placeCampBuilding(pending, content, CAMP_TOWNHALL_ID, 0.5, 0.5)).toBe("ok");
    expect(setCampMapVisual(pending, content, CAMP_TOWNHALL_ID, { scalePercent: 140, flipped: false })).toBe(true);
    expect(cancelCampBuild(pending, content)).toBe(true);
    expect(pending.camp.mapVisuals).toEqual({});
  });
});

// ── 8. Determinismus ──────────────────────────────────────────────────────────────────────────

describe("Determinismus: Platzierung ist RNG-frei und offline == online bit-identisch", () => {
  it("gleicher Seed, gleiche Platzierung: 1 großes Offline-Fenster == viele kleine Live-Ticks", () => {
    const make = () => {
      const s = game(42);
      fund(s, CAMP_TOWNHALL_ID, 1);
      expect(placeCampBuilding(s, content, CAMP_TOWNHALL_ID, 0.37, 0.62)).toBe("ok");
      return s;
    };
    const offline = make();
    const online = make();
    const WINDOW = 600_000 + 5_000;
    advance(offline, content, WINDOW, { offline: true });
    for (let t = 0; t < WINDOW; t += 1_000) advance(online, content, 1_000);

    expect(offline.camp).toEqual(online.camp);
    expect(offline.camp.positions[CAMP_TOWNHALL_ID]).toEqual({ x: 0.37, y: 0.62 });
    expect(offline.rng.state).toBe(online.rng.state);
    expect(offline.elapsedMs).toBe(online.elapsedMs);
  });

  it("Verschieben und Abreißen ziehen NIE am RNG", () => {
    const s = game();
    stand(s, CAMP_TOWNHALL_ID, 1, 0.5, 0.5);
    stand(s, FISH, 1, 0.25, 0.6);
    const rngBefore = s.rng.state;
    expect(moveCampBuilding(s, content, FISH, 0.7, 0.6)).toBe("ok");
    expect(demolishCampBuilding(s, content, FISH)).toBe("ok");
    expect(s.rng.state).toBe(rngBefore);
  });
});
