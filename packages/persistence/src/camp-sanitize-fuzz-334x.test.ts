import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { CampState, GameState } from "@hearthforge/shared";
import {
  CAMP_MAX_OFFLINE_BONUS_MS,
  CAMP_TOWNHALL_ID,
  MAX_OFFLINE_MS,
  campLayoutSlots,
  campPointInBuildable,
  defaultCampState,
} from "@hearthforge/shared";
import { computeStats, createGame } from "@hearthforge/engine";
import { deserialize, serialize } from "./index";

/**
 * AD-HOC-PRÜFDATEI (Prüfauftrag 2026-08-03, „New-Haven-Persistenz härten-prüfen", Punkt 2/3):
 * Fuzz der camp-Sanitize-Flächen (buildings/buildJob/positions/mapVisuals/refine) durch die VOLLE
 * deserialize-Kette + Mid-Build-/Mid-Veredelungs-Proben über Save/Load mit Offline-Cap.
 *
 * KEIN Produktionscode wird angefasst. Erwartung überall: NIE null/Crash, computeStats endlich,
 * keine non-finiten Zahlen im State, Round-Trip-Fixpunkt (zweiter Load ändert nichts mehr).
 *
 * NaN-Anmerkung: `deserialize` nimmt einen JSON-String — NaN ist in JSON nicht darstellbar
 * (JSON.stringify schreibt null). Der „NaN-Fall" erreicht sanitize also als null (deckt denselben
 * Nicht-Zahl-Pfad ab). ECHTES Infinity ist dagegen via `1e999` im Roh-JSON injizierbar
 * (JSON.parse("1e999") === Infinity) — beide Wege werden gefahren.
 */

const NOW = 1_000_000;
const SEVEN_DAYS = 7 * 24 * 3_600_000;
const SMELTER = "camp_smelter";

/** Rekursiv nach non-finiten Zahlen suchen (Muster save-compat-vault.test.ts). */
function findNonFinite(value: unknown, path: string, out: string[]): void {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) out.push(`${path} = ${value}`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((v, i) => findNonFinite(v, `${path}[${i}]`, out));
    return;
  }
  if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) findNonFinite(v, `${path}.${k}`, out);
  }
}

/**
 * Volle Lade-Kette + Basis-Invarianten: nie null, spielbar (computeStats endlich > 0), keine
 * non-finiten Zahlen, Round-Trip-Fixpunkt. `mutateJson` erlaubt Roh-JSON-Manipulation
 * (Infinity-Injektion via 1e999). Liefert den geladenen State für Detail-Asserts.
 */
function loadHardened(s: GameState, mutateJson?: (json: string) => string): GameState {
  let json = serialize(s, NOW);
  if (mutateJson) {
    const mutated = mutateJson(json);
    expect(mutated, "Sentinel-Ersetzung hat nicht gegriffen").not.toBe(json);
    json = mutated;
  }
  const r = deserialize(json, content, NOW);
  expect(r, "deserialize lieferte null").not.toBeNull();
  const state = r!.state;

  const stats = computeStats(state, content);
  expect(Number.isFinite(stats.maxHp)).toBe(true);
  expect(stats.maxHp).toBeGreaterThan(0);

  const nonFinite: string[] = [];
  findNonFinite(state, "state", nonFinite);
  expect(nonFinite, `non-finite Werte: ${nonFinite.join(", ")}`).toEqual([]);

  const again = deserialize(serialize(state, NOW), content, NOW);
  expect(again).not.toBeNull();
  expect(again!.state, "Round-Trip nicht idempotent").toEqual(state);
  return state;
}

/** Frischer Spielstand mit direktem camp-Zugriff für die Mutationen. */
function freshState(name: string, seed = 1): GameState {
  return createGame({ name }, content, seed);
}

// ── Prüfpunkt 1 (Beleg): deterministische Raster-Verteilung der Bestandsgebäude (v77→v78) ────────

describe("Migrationskette — deterministische Raster-Verteilung (v77-Shape ohne positions)", () => {
  it("verteilt Bestandsgebäude in KATALOG-Reihenfolge auf die ersten Rasterplätze — reproduzierbar", () => {
    const built = [CAMP_TOWNHALL_ID, "camp_watchtower", "camp_storehouse", SMELTER, "camp_smokehouse"];
    const mk = (): CampState => {
      const s = freshState("Raster", 7);
      s.camp = defaultCampState();
      for (const id of built) s.camp.buildings[id] = 1;
      delete (s.camp as Partial<CampState>).positions; // v77-Shape
      delete (s.camp as Partial<CampState>).mapVisuals; // v79-Shape
      return loadHardened(s).camp;
    };
    const a = mk();
    const b = mk();
    expect(a).toEqual(b); // Determinismus: zweimal dasselbe Save ⇒ identische Karte

    // Erwartung aus dem Katalog ableiten (nicht hardcoden): gebaute IDs in Katalog-Reihenfolge
    // bekommen slots[0], slots[1], … — genau die campRepairPositions-Garantie.
    const slots = campLayoutSlots();
    const catalogOrder = (content.campBuildings ?? []).map((x) => x.id).filter((id) => built.includes(id));
    expect(catalogOrder.length).toBe(built.length);
    catalogOrder.forEach((id, i) => {
      expect(a.positions[id], `${id} nicht auf Rasterplatz ${i}`).toEqual(slots[i]);
      expect(campPointInBuildable(a.positions[id]!.x, a.positions[id]!.y)).toBe(true);
    });
    // v79→v80: fehlendes mapVisuals wird zu {} — Alt-Saves behalten die Renderer-Defaults.
    expect(a.mapVisuals).toEqual({});
  });
});

// ── Prüfpunkt 2: Fuzz — kaputte Saves durch deserialize ─────────────────────────────────────────

describe("Fuzz — camp als Ganzes kaputt", () => {
  it("Nicht-Objekt-camp (String/Array/Zahl/null) fällt auf das leere Lager zurück", () => {
    for (const bad of ["nope", ["nope"], 7, null]) {
      const s = freshState("Kaputt");
      (s as unknown as { camp: unknown }).camp = bad;
      const loaded = loadHardened(s);
      expect(loaded.camp, JSON.stringify(bad)).toEqual(defaultCampState());
    }
  });
});

describe("Fuzz — buildings", () => {
  it("unbekannte Gebäude-IDs fliegen; Stufe 0/-1 ⇒ Eintrag raus, 4 ⇒ 3, 2.9 ⇒ 2", () => {
    const s = freshState("Stufen");
    const b = s.camp.buildings as Record<string, number>;
    b.camp_luftschloss = 2; // unbekannt
    b[CAMP_TOWNHALL_ID] = 4; // Überhang
    b.camp_fishing_hut = 0; // „nicht gebaut" darf keinen Eintrag tragen
    b.camp_sawpit = -1; // negativ
    b.camp_storehouse = 2.9; // Bruch
    const loaded = loadHardened(s);
    expect(loaded.camp.buildings).toEqual({ [CAMP_TOWNHALL_ID]: 3, camp_storehouse: 2 });
  });

  it("Stufe als Infinity (Roh-JSON 1e999) ⇒ Eintrag raus, kein Crash", () => {
    const s = freshState("Unendlich");
    (s.camp.buildings as Record<string, number>)[CAMP_TOWNHALL_ID] = 66600666;
    const loaded = loadHardened(s, (j) => j.replace('"camp_townhall":66600666', '"camp_townhall":1e999'));
    expect(loaded.camp.buildings[CAMP_TOWNHALL_ID]).toBeUndefined();
  });
});

describe("Fuzz — buildJob", () => {
  it("unbekanntes Gebäude ⇒ Job weg (dokumentiert: sanitize erstattet NIE)", () => {
    const s = freshState("JobDrift");
    s.camp.buildJob = { buildingId: "camp_luftschloss", targetLevel: 1, remainingMs: 1000 };
    expect(loadHardened(s).camp.buildJob).toBeNull();
  });

  it("negatives remainingMs ⇒ 0 (fertig im nächsten Tick, kein Rückwärtslauf)", () => {
    const s = freshState("Negativ");
    s.camp.buildJob = { buildingId: CAMP_TOWNHALL_ID, targetLevel: 1, remainingMs: -1_000_000 };
    expect(loadHardened(s).camp.buildJob!.remainingMs).toBe(0);
  });

  it("absurd großes remainingMs (9e15) ⇒ auf Basis-Bauzeit der Zielstufe geklemmt (600 000)", () => {
    const s = freshState("Riese");
    s.camp.buildJob = { buildingId: CAMP_TOWNHALL_ID, targetLevel: 1, remainingMs: 9e15 };
    expect(loadHardened(s).camp.buildJob!.remainingMs).toBe(600_000);
  });

  it("remainingMs als ECHTES Infinity (1e999) ⇒ konservativ volle Bauzeit", () => {
    const s = freshState("JobInf");
    s.camp.buildJob = { buildingId: CAMP_TOWNHALL_ID, targetLevel: 1, remainingMs: 66600666 };
    const loaded = loadHardened(s, (j) => j.replace('"remainingMs":66600666', '"remainingMs":1e999'));
    expect(loaded.camp.buildJob!.remainingMs).toBe(600_000);
  });

  it("remainingMs NaN (serialisiert zu null) ⇒ konservativ volle Bauzeit", () => {
    const s = freshState("JobNaN");
    s.camp.buildJob = { buildingId: CAMP_TOWNHALL_ID, targetLevel: 1, remainingMs: Number.NaN };
    expect(loadHardened(s).camp.buildJob!.remainingMs).toBe(600_000);
  });

  it("targetLevel ≠ Stufe+1 oder jenseits des Katalogs ⇒ Job weg", () => {
    const s = freshState("Ziel");
    s.camp.buildings[CAMP_TOWNHALL_ID] = 3;
    s.camp.buildJob = { buildingId: CAMP_TOWNHALL_ID, targetLevel: 4, remainingMs: 1000 };
    expect(loadHardened(s).camp.buildJob).toBeNull();
    s.camp.buildJob = { buildingId: CAMP_TOWNHALL_ID, targetLevel: 2, remainingMs: 1000 }; // Stufe wäre 3+1
    expect(loadHardened(s).camp.buildJob).toBeNull();
  });
});

describe("Fuzz — positions", () => {
  it("unbekannte IDs und Positionen NIE gebauter Gebäude fliegen", () => {
    const s = freshState("PosDrift");
    s.camp.buildings.camp_sawpit = 1;
    s.camp.positions.camp_sawpit = { x: 0.5, y: 0.5 };
    s.camp.positions.camp_luftschloss = { x: 0.4, y: 0.4 }; // unbekannt
    s.camp.positions[SMELTER] = { x: 0.6, y: 0.6 }; // nie gebaut
    const loaded = loadHardened(s);
    expect(Object.keys(loaded.camp.positions)).toEqual(["camp_sawpit"]);
    expect(loaded.camp.positions.camp_sawpit).toEqual({ x: 0.5, y: 0.5 });
  });

  it("außerhalb 0..1 (x=42/y=-13) ⇒ deterministische Reparatur auf Rasterplatz 0", () => {
    const s = freshState("Weit");
    s.camp.buildings.camp_sawpit = 1;
    s.camp.positions.camp_sawpit = { x: 42, y: -13 };
    expect(loadHardened(s).camp.positions.camp_sawpit).toEqual(campLayoutSlots()[0]);
  });

  it("x als Infinity (1e999) bzw. NaN (null) ⇒ Rasterplatz, kein Crash", () => {
    const s = freshState("PosInf");
    s.camp.buildings.camp_sawpit = 1;
    s.camp.positions.camp_sawpit = { x: 66600666, y: 0.5 };
    const a = loadHardened(s, (j) => j.replace('"x":66600666', '"x":1e999'));
    expect(a.camp.positions.camp_sawpit).toEqual(campLayoutSlots()[0]);

    const s2 = freshState("PosNaN");
    s2.camp.buildings.camp_sawpit = 1;
    s2.camp.positions.camp_sawpit = { x: Number.NaN, y: 0.5 }; // JSON ⇒ null
    expect(loadHardened(s2).camp.positions.camp_sawpit).toEqual(campLayoutSlots()[0]);
  });

  it("strukturell kaputte Einträge (String/Array/Zahl/null) ⇒ Rasterplatz", () => {
    for (const bad of ["nope", ["0.5", "0.5"], 42, null, { x: "0.5", y: 0.5 }]) {
      const s = freshState("PosKaputt");
      s.camp.buildings.camp_sawpit = 1;
      (s.camp.positions as Record<string, unknown>).camp_sawpit = bad;
      const loaded = loadHardened(s);
      expect(loaded.camp.positions.camp_sawpit, JSON.stringify(bad)).toEqual(campLayoutSlots()[0]);
    }
  });

  it("Rand-exakte Position (Bühne exakt im Kartenrand) bleibt EXAKT erhalten", () => {
    const s = freshState("Rand");
    s.camp.buildings.camp_sawpit = 1;
    s.camp.positions.camp_sawpit = { x: 0.08, y: 0.1422 }; // halfW/halfH — knappster legaler Punkt
    expect(loadHardened(s).camp.positions.camp_sawpit).toEqual({ x: 0.08, y: 0.1422 });
  });
});

describe("Fuzz — mapVisuals", () => {
  it("Skalierung 0 / -5 ⇒ 1; 10 000 ⇒ 300; NaN(null) ⇒ Override weg; Spiegel als String ⇒ false", () => {
    const s = freshState("Visuals");
    for (const id of [CAMP_TOWNHALL_ID, "camp_sawpit", "camp_fishing_hut", "camp_storehouse"]) {
      s.camp.buildings[id] = 1;
    }
    const mv = s.camp.mapVisuals as Record<string, unknown>;
    mv[CAMP_TOWNHALL_ID] = { scalePercent: 0, flipped: true };
    mv.camp_sawpit = { scalePercent: -5, flipped: "yes" }; // String-Spiegel
    mv.camp_fishing_hut = { scalePercent: 10_000, flipped: true };
    mv.camp_storehouse = { scalePercent: Number.NaN, flipped: true }; // JSON ⇒ null
    const loaded = loadHardened(s);
    expect(loaded.camp.mapVisuals[CAMP_TOWNHALL_ID]).toEqual({ scalePercent: 1, flipped: true });
    expect(loaded.camp.mapVisuals.camp_sawpit).toEqual({ scalePercent: 1, flipped: false });
    expect(loaded.camp.mapVisuals.camp_fishing_hut).toEqual({ scalePercent: 300, flipped: true });
    expect(loaded.camp.mapVisuals.camp_storehouse).toBeUndefined();
  });

  it("Skalierung als ECHTES Infinity (1e999) ⇒ Override weg, kein Crash", () => {
    const s = freshState("VisInf");
    s.camp.buildings[CAMP_TOWNHALL_ID] = 1;
    (s.camp.mapVisuals as Record<string, unknown>)[CAMP_TOWNHALL_ID] = {
      scalePercent: 66600666,
      flipped: true,
    };
    const loaded = loadHardened(s, (j) => j.replace('"scalePercent":66600666', '"scalePercent":1e999'));
    expect(loaded.camp.mapVisuals[CAMP_TOWNHALL_ID]).toBeUndefined();
  });

  it("unbekannte IDs, Overrides ohne Karten-Präsenz und Nicht-Objekt-Einträge fliegen", () => {
    const s = freshState("VisDrift");
    s.camp.buildings[CAMP_TOWNHALL_ID] = 1;
    const mv = s.camp.mapVisuals as Record<string, unknown>;
    mv.camp_luftschloss = { scalePercent: 150, flipped: false }; // unbekannt
    mv[SMELTER] = { scalePercent: 150, flipped: false }; // nie gebaut ⇒ keine Position
    mv[CAMP_TOWNHALL_ID] = ["nope"]; // Array
    const loaded = loadHardened(s);
    expect(loaded.camp.mapVisuals).toEqual({});
  });

  it("Bruch-Skalierung wird gerundet (250.6 ⇒ 251) — identisch zur Engine-Klemme", () => {
    const s = freshState("VisRound");
    s.camp.buildings[CAMP_TOWNHALL_ID] = 1;
    s.camp.mapVisuals[CAMP_TOWNHALL_ID] = { scalePercent: 250.6, flipped: false };
    expect(loadHardened(s).camp.mapVisuals[CAMP_TOWNHALL_ID]).toEqual({ scalePercent: 251, flipped: false });
  });
});

describe("Fuzz — refine", () => {
  it("unbekanntes Rezept, artfremdes Rezept und Nicht-Anlagen-Schlüssel ⇒ Slot weg", () => {
    const s = freshState("RefineDrift");
    s.camp.buildings[SMELTER] = 3;
    s.skills.smithing = { xp: 1_000_000 };
    const rf = s.camp.refine as Record<string, unknown>;
    rf[SMELTER] = { recipeId: "gibts_nicht", accMs: 0, produced: 0 };
    rf.camp_sawpit = { recipeId: "smelt_iron", accMs: 0, produced: 0 }; // keine Anlage
    rf.camp_luftschloss = { recipeId: "smelt_iron", accMs: 0, produced: 0 }; // unbekannt
    expect(loadHardened(s).camp.refine).toEqual({});
  });

  it("Slot-Zahlen: accMs Infinity (1e999) ⇒ 0, produced -3 ⇒ 0 — Rezept bleibt", () => {
    const s = freshState("RefineZahlen");
    s.camp.buildings[SMELTER] = 3;
    s.skills.smithing = { xp: 1_000_000 };
    s.camp.refine[SMELTER] = { recipeId: "smelt_iron", accMs: 66600666, produced: -3 };
    const loaded = loadHardened(s, (j) => j.replace('"accMs":66600666', '"accMs":1e999'));
    expect(loaded.camp.refine[SMELTER]).toEqual({ recipeId: "smelt_iron", accMs: 0, produced: 0 });
  });
});

// ── Prüfpunkt 3: Mid-Build / Mid-Veredelung über Save/Load ──────────────────────────────────────

describe("Mid-Build über Save/Load", () => {
  /** Zentralhaus II steht, Ausbau auf III läuft (Basis-Bauzeit 24 h — überlebt jedes Offline-Fenster). */
  function midBuildState(name: string): GameState {
    const s = freshState(name);
    s.camp.buildings[CAMP_TOWNHALL_ID] = 2;
    s.camp.buildJob = { buildingId: CAMP_TOWNHALL_ID, targetLevel: 3, remainingMs: 86_400_000 };
    return s;
  }

  it("now = savedAt: Load ist byte-stabil (Serialize-Fixpunkt), Bau-Job wert-identisch", () => {
    // Erst EIN Load normalisiert (sanitize verteilt die Position); danach muss die Kette
    // serialize → deserialize → serialize die Bytes exakt reproduzieren.
    const normalized = loadHardened(midBuildState("ByteGleich"));
    const json = serialize(normalized, NOW);
    const r = deserialize(json, content, NOW);
    expect(r).not.toBeNull();
    expect(r!.offlineMs).toBe(0);
    expect(r!.offlineTicks).toBe(0);
    expect(serialize(r!.state, NOW)).toBe(json);
    expect(r!.state.camp.buildJob).toEqual({
      buildingId: CAMP_TOWNHALL_ID,
      targetLevel: 3,
      remainingMs: 86_400_000,
    });
  });

  it("+7 Tage ohne Wachturm: Bau schreitet EXAKT um das 8-h-Fenster voran, nicht um Echtzeit", () => {
    const s = midBuildState("Cap8h");
    const r = deserialize(serialize(s, NOW), content, NOW + SEVEN_DAYS);
    expect(r).not.toBeNull();
    expect(r!.offlineMs).toBe(MAX_OFFLINE_MS); // 28 800 000 — nicht 604 800 000
    expect(r!.state.camp.buildJob!.remainingMs).toBe(86_400_000 - MAX_OFFLINE_MS); // 57 600 000
    expect(r!.state.camp.buildings[CAMP_TOWNHALL_ID]).toBe(2); // NICHT fertig
    expect(r!.offline.campBuilds).toBeUndefined();
  });

  it("+7 Tage mit Wachturm III: Fenster 11 h — der Bau bekommt exakt die 3 Bonus-Stunden dazu", () => {
    const s = midBuildState("Cap11h");
    s.camp.buildings.camp_watchtower = 3;
    const r = deserialize(serialize(s, NOW), content, NOW + SEVEN_DAYS);
    expect(r).not.toBeNull();
    expect(r!.offlineMs).toBe(MAX_OFFLINE_MS + CAMP_MAX_OFFLINE_BONUS_MS); // 39 600 000
    expect(r!.state.camp.buildJob!.remainingMs).toBe(86_400_000 - MAX_OFFLINE_MS - CAMP_MAX_OFFLINE_BONUS_MS);
  });

  it("+7 Tage mitten in der Veredelung: produced = Fenster × Rate, accMs bleibt beim angefangenen Rest", () => {
    const s = freshState("MidRefine");
    s.camp.buildings[SMELTER] = 1; // Stufe I: 20/h ⇒ 180 000 ms je Durchlauf
    s.skills.smithing = { xp: 1_000_000 };
    s.bank.iron_ore = 1_000;
    s.camp.refine[SMELTER] = { recipeId: "smelt_iron", accMs: 90_000, produced: 5 }; // halber Durchlauf
    const r = deserialize(serialize(s, NOW), content, NOW + SEVEN_DAYS);
    expect(r).not.toBeNull();
    // 8 h × 20/h = 160 Durchläufe; der halbe Durchlauf (90 000 ms) bleibt exakt als Rest stehen.
    expect(r!.state.camp.refine[SMELTER]!.produced).toBe(5 + 160);
    expect(r!.state.camp.refine[SMELTER]!.accMs).toBe(90_000);
    const oreQty = content.actions.smelt_iron!.inputs!.find((i) => i.itemId === "iron_ore")!.qty;
    expect(r!.state.bank.iron_ore).toBe(1_000 - 160 * oreQty);
    expect(r!.offline.campRefined).toEqual([
      { buildingId: SMELTER, itemId: "iron_bar", qty: 160 * content.actions.smelt_iron!.loot[0]!.min },
    ]);
  });
});

// ── Prüfpunkt 4: mapVisuals-/Überlappungs-Semantik ──────────────────────────────────────────────

describe("Karten-Semantik — Überlappung & Klemmen", () => {
  it("IDENTISCHE Positionen zweier Gebäude bleiben beim Sanitize EXAKT erhalten (Chef-Nachentscheid 31.07.)", () => {
    const s = freshState("Deckung");
    s.camp.buildings[CAMP_TOWNHALL_ID] = 1;
    s.camp.buildings.camp_sawpit = 1;
    s.camp.positions[CAMP_TOWNHALL_ID] = { x: 0.5, y: 0.5 };
    s.camp.positions.camp_sawpit = { x: 0.5, y: 0.5 }; // volle Deckung — erlaubte Spielerwahl
    const loaded = loadHardened(s);
    expect(loaded.camp.positions[CAMP_TOWNHALL_ID]).toEqual({ x: 0.5, y: 0.5 });
    expect(loaded.camp.positions.camp_sawpit).toEqual({ x: 0.5, y: 0.5 });
  });

  it("gültige Skalierung/Spiegelung im 1..300-Fenster übersteht den Load unverändert", () => {
    const s = freshState("Kalibrier");
    s.camp.buildings[CAMP_TOWNHALL_ID] = 1;
    s.camp.mapVisuals[CAMP_TOWNHALL_ID] = { scalePercent: 1, flipped: true };
    expect(loadHardened(s).camp.mapVisuals[CAMP_TOWNHALL_ID]).toEqual({ scalePercent: 1, flipped: true });
    s.camp.mapVisuals[CAMP_TOWNHALL_ID] = { scalePercent: 300, flipped: false };
    expect(loadHardened(s).camp.mapVisuals[CAMP_TOWNHALL_ID]).toEqual({ scalePercent: 300, flipped: false });
  });
});
