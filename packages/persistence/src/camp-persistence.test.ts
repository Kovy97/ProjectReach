import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { CampState, GameState } from "@hearthforge/shared";
import {
  CAMP_TOWNHALL_ID,
  MAX_OFFLINE_MS,
  SAVE_VERSION,
  TICK_MS,
  campLayoutSlots,
  campPointInBuildable,
  defaultCampState,
} from "@hearthforge/shared";
import { createGame } from "@hearthforge/engine";
import { deserialize, serialize } from "./index";

/**
 * Persistenz des Lagers (`GameState.camp`, SAVE_VERSION 75→76, Task #358): Migration
 * (Alt-Save-Default = leeres Lager), Round-Trip-Idempotenz befüllter Lager (Stufen + aktiver
 * Bau-Auftrag), die sanitize-Härtung (Unknown-Id-Strip, Stufen-/Timer-Klemmen, Job-Validierung,
 * seq-Monotonie) und der Offline-Report („Die Hände haben gearbeitet"). Muster
 * equip-loadouts-persistence.test.ts.
 */

/** Fester Zeitstempel für serialize UND deserialize — kein Offline-Catch-up-Tick im Test. */
function roundTrip(s: GameState): GameState {
  const now = 1_000_000;
  const r = deserialize(serialize(s, now), content, now);
  expect(r).not.toBeNull();
  return r!.state;
}

/**
 * Ein legitimes, befülltes Lager: Zentralhaus II, zwei Hütten, laufender Wachturm-Neubau.
 * Die Karten-Positionen (SAVE 78) liegen vollständig im Kartenrand, damit der Reparatur-Pass beim
 * Laden ein reiner No-op ist (Round-Trip-Identität).
 */
function builtCamp(): CampState {
  return {
    buildings: { camp_townhall: 2, camp_fishing_hut: 1, camp_sawpit: 1 },
    buildJob: { buildingId: "camp_watchtower", targetLevel: 1, remainingMs: 1_234_500 },
    // Bauwarteschlange (SAVE 81): ein geplanter Folgebau, damit der Round-Trip auch das neue
    // Feld traegt statt es nur leer durchzureichen.
    buildQueue: ["camp_fishing_hut"],
    buildSeq: 4,
    lastCompletedBuild: { buildingId: "camp_sawpit", level: 1, seq: 4 },
    refine: {},
    positions: {
      camp_townhall: { x: 0.5, y: 0.5 },
      camp_watchtower: { x: 0.35, y: 0.28 },
      camp_fishing_hut: { x: 0.25, y: 0.6 },
      camp_sawpit: { x: 0.7, y: 0.35 },
    },
    mapVisuals: {},
  };
}

describe("Lager — Migration v75→v76", () => {
  it("Alt-Save ohne das Feld (v75-Shape): camp = defaultCampState (leeres Lager)", () => {
    const s = createGame({ name: "Alt" }, content, 1);
    delete (s as Partial<GameState>).camp;
    const loaded = roundTrip(s);
    expect(loaded.camp).toEqual(defaultCampState());
    expect(loaded.version).toBe(s.version);
  });

  it("frischer Save (createGame): leeres Lager, Bautrupp frei", () => {
    const s = createGame({ name: "Neu" }, content, 1);
    expect(s.camp).toEqual(defaultCampState());
  });

  it("kaputtes Nicht-Objekt-Feld (Array/String) fällt auf das leere Lager zurück", () => {
    const s = createGame({ name: "Kaputt" }, content, 1);
    (s as unknown as { camp: unknown }).camp = ["nope"];
    expect(roundTrip(s).camp).toEqual(defaultCampState());
    (s as unknown as { camp: unknown }).camp = "nope";
    expect(roundTrip(s).camp).toEqual(defaultCampState());
  });
});

describe("Lager — Round-Trip", () => {
  it("erhält Stufen + laufenden Bau-Auftrag + Breadcrumb verlustfrei (idempotent)", () => {
    const s = createGame({ name: "Bauherr" }, content, 1);
    s.camp = builtCamp();
    const loaded = roundTrip(s);
    expect(loaded.camp).toEqual(builtCamp());
    const again = roundTrip(loaded);
    expect(again.camp).toEqual(loaded.camp);
  });
});

describe("Lager — sanitize-Härtung", () => {
  it("strippt unbekannte Gebäude-IDs aus buildings (Content-Drift/Save-Edit)", () => {
    const s = createGame({ name: "Drift" }, content, 1);
    s.camp = builtCamp();
    s.camp.buildings.camp_luftschloss = 3;
    const loaded = roundTrip(s);
    expect(loaded.camp.buildings.camp_luftschloss).toBeUndefined();
    expect(loaded.camp.buildings).toEqual(builtCamp().buildings);
  });

  it("klemmt Stufen auf ganze Zahlen 1..3 (Überhang → 3, Bruch → floor, ≤0/NaN → Eintrag raus)", () => {
    const s = createGame({ name: "Klemme" }, content, 1);
    s.camp = defaultCampState();
    (s.camp.buildings as Record<string, number>).camp_townhall = 7;
    (s.camp.buildings as Record<string, number>).camp_fishing_hut = 2.9;
    (s.camp.buildings as Record<string, number>).camp_sawpit = 0;
    (s.camp.buildings as Record<string, number>).camp_mine_adit = Number.NaN;
    const loaded = roundTrip(s);
    expect(loaded.camp.buildings).toEqual({ camp_townhall: 3, camp_fishing_hut: 2 });
  });

  it("verwirft einen Bau-Auftrag mit unbekannter ID oder falscher Zielstufe (≠ Stufe+1)", () => {
    const s = createGame({ name: "JobDrift" }, content, 1);
    s.camp = defaultCampState();
    s.camp.buildJob = { buildingId: "camp_luftschloss", targetLevel: 1, remainingMs: 1000 };
    expect(roundTrip(s).camp.buildJob).toBeNull();
    // Zielstufe 3, aber Gebäude steht auf 0 → strukturell unstimmig → Job weg.
    s.camp.buildJob = { buildingId: CAMP_TOWNHALL_ID, targetLevel: 3, remainingMs: 1000 };
    expect(roundTrip(s).camp.buildJob).toBeNull();
  });

  it("klemmt remainingMs auf 0..Basis-Bauzeit; korrupte Werte fallen KONSERVATIV auf die volle Bauzeit (kein Instant-Fertig-Exploit)", () => {
    const s = createGame({ name: "Timer" }, content, 1);
    s.camp = defaultCampState();
    // Überhang: mehr als die Basis-Bauzeit kann ein legitimer Job nie tragen (buildSpeed verkürzt nur).
    s.camp.buildJob = { buildingId: CAMP_TOWNHALL_ID, targetLevel: 1, remainingMs: 99_999_999 };
    expect(roundTrip(s).camp.buildJob!.remainingMs).toBe(600_000);
    // NaN → volle Bauzeit statt 0 (sanitize zahlt nie aus).
    s.camp.buildJob = { buildingId: CAMP_TOWNHALL_ID, targetLevel: 1, remainingMs: Number.NaN };
    expect(roundTrip(s).camp.buildJob!.remainingMs).toBe(600_000);
    // Negativ → 0 (fertig beim nächsten Tick, kein Rückwärtslauf).
    s.camp.buildJob = { buildingId: CAMP_TOWNHALL_ID, targetLevel: 1, remainingMs: -5 };
    expect(roundTrip(s).camp.buildJob!.remainingMs).toBe(0);
  });

  it("erzwingt buildSeq ≥ lastCompletedBuild.seq (Monotonie-Muster petDropSeq) und härtet den Breadcrumb", () => {
    const s = createGame({ name: "Seq" }, content, 1);
    s.camp = defaultCampState();
    s.camp.buildings.camp_sawpit = 1;
    s.camp.buildSeq = 1;
    s.camp.lastCompletedBuild = { buildingId: "camp_sawpit", level: 1, seq: 9 };
    const loaded = roundTrip(s);
    expect(loaded.camp.buildSeq).toBe(9);
    // Breadcrumb mit unbekannter ID fliegt komplett.
    s.camp.lastCompletedBuild = { buildingId: "camp_luftschloss", level: 1, seq: 9 };
    expect(roundTrip(s).camp.lastCompletedBuild).toBeNull();
  });
});

describe("Lager — Offline-Aufholung", () => {
  it("baut im Offline-Fenster fertig und meldet es im Offline-Report (campBuilds)", () => {
    const s = createGame({ name: "Offline" }, content, 1);
    s.quests.completed.push("chronicle_04");
    s.camp = defaultCampState();
    // Laufender Zentralhaus-Bau, Rest 30 s — das Offline-Fenster (5 min) vollendet ihn.
    s.camp.buildJob = { buildingId: CAMP_TOWNHALL_ID, targetLevel: 1, remainingMs: 30_000 };
    const savedAt = 1_000_000;
    const r = deserialize(serialize(s, savedAt), content, savedAt + 300_000);
    expect(r).not.toBeNull();
    expect(r!.state.camp.buildJob).toBeNull();
    expect(r!.state.camp.buildings[CAMP_TOWNHALL_ID]).toBe(1);
    expect(r!.state.camp.buildSeq).toBe(1);
    expect(r!.offline.campBuilds).toEqual([{ buildingId: CAMP_TOWNHALL_ID, level: 1 }]);
  });

  it("ohne Fertigstellung im Fenster: kein campBuilds-Feld (fehlt statt leer)", () => {
    const s = createGame({ name: "Weiterbau" }, content, 1);
    s.camp = defaultCampState();
    s.camp.buildJob = { buildingId: CAMP_TOWNHALL_ID, targetLevel: 1, remainingMs: 600_000 };
    const savedAt = 1_000_000;
    const r = deserialize(serialize(s, savedAt), content, savedAt + 60_000);
    expect(r).not.toBeNull();
    expect(r!.state.camp.buildJob!.remainingMs).toBe(600_000 - 60_000);
    expect(r!.offline.campBuilds).toBeUndefined();
  });
});

// ── SAVE 77: Offline-Veredelung + Tages-Gratis-Skip (Task #359) ──────────────────────────────────

const SMELTER = "camp_smelter";

/** Spielstand mit gebautem Schmelzofen III und beherrschtem Rezept. */
function smelterState(name = "Ofen"): GameState {
  const s = createGame({ name }, content, 1);
  s.camp = defaultCampState();
  s.camp.buildings[SMELTER] = 3;
  s.skills.smithing = { xp: 1_000_000 }; // weit über smelt_iron (L10)
  return s;
}

describe("Veredelung — Migration v76→v77", () => {
  it("Alt-Save ohne camp.refine bekommt einen leeren Rezept-Slot-Record", () => {
    const s = createGame({ name: "Alt76" }, content, 1);
    delete (s.camp as Partial<CampState>).refine;
    expect(roundTrip(s).camp.refine).toEqual({});
  });

  it("kaputtes refine-Feld (Array/String/null) fällt auf {} zurück", () => {
    const s = createGame({ name: "Kaputt" }, content, 1);
    for (const bad of [["nope"], "nope", null, 7]) {
      (s.camp as unknown as { refine: unknown }).refine = bad;
      expect(roundTrip(s).camp.refine).toEqual({});
    }
  });

  it("Alt-Save ohne slayerFreeSkipDay bekommt 0; frischer Save trägt 0", () => {
    const s = createGame({ name: "Alt" }, content, 1);
    expect(s.slayerFreeSkipDay).toBe(0);
    delete (s as Partial<GameState>).slayerFreeSkipDay;
    expect(roundTrip(s).slayerFreeSkipDay).toBe(0);
  });
});

describe("Veredelung — Round-Trip & Sanitize", () => {
  it("erhält einen befüllten Rezept-Slot verlustfrei (idempotent)", () => {
    const s = smelterState();
    s.camp.refine[SMELTER] = { recipeId: "smelt_iron", accMs: 42_000, produced: 137 };
    const once = roundTrip(s);
    expect(once.camp.refine[SMELTER]).toEqual({ recipeId: "smelt_iron", accMs: 42_000, produced: 137 });
    // Zweiter Durchlauf ändert nichts mehr (Sanitize ist ein Fixpunkt).
    expect(roundTrip(once).camp.refine).toEqual(once.camp.refine);
  });

  it("strippt Schlüssel, die gar keine Veredelungs-Anlage sind", () => {
    const s = smelterState();
    s.camp.refine.camp_sawpit = { recipeId: "smelt_iron", accMs: 0, produced: 0 };
    s.camp.refine.camp_luftschloss = { recipeId: "smelt_iron", accMs: 0, produced: 0 };
    expect(roundTrip(s).camp.refine).toEqual({});
  });

  it("strippt unbekannte UND für die Anlage unzulässige Rezept-IDs", () => {
    const s = smelterState();
    for (const bad of ["gibts_nicht", "smelt_bronze" /* 2 Zutaten */, "cook_shrimp" /* falsche Anlage */]) {
      s.camp.refine[SMELTER] = { recipeId: bad, accMs: 0, produced: 0 };
      expect(roundTrip(s).camp.refine[SMELTER], bad).toBeUndefined();
    }
  });

  it("behält ein (noch) NICHT beherrschtes Rezept — Level ist Spielstand, nicht Struktur", () => {
    const s = smelterState();
    s.skills.smithing = { xp: 0 }; // Level 1, smelt_iron braucht 10
    s.camp.refine[SMELTER] = { recipeId: "smelt_iron", accMs: 0, produced: 5 };
    expect(roundTrip(s).camp.refine[SMELTER]?.recipeId).toBe("smelt_iron");
  });

  it("klemmt accMs auf einen Durchlauf der EIGENEN Stufe und härtet produced", () => {
    const s = smelterState(); // Stufe III
    s.camp.refine[SMELTER] = { recipeId: "smelt_iron", accMs: 9_999_999, produced: 3.7 };
    const a = roundTrip(s);
    expect(a.camp.refine[SMELTER]!.accMs).toBe(60_000); // 3600000/60 = Stufe-III-Durchlauf
    expect(a.camp.refine[SMELTER]!.produced).toBe(3);

    // NaN/negativ → 0 (kein Soft-Brick, keine non-finiten Zahlen im Save).
    s.camp.refine[SMELTER] = { recipeId: "smelt_iron", accMs: Number.NaN, produced: -5 };
    const b = roundTrip(s);
    expect(b.camp.refine[SMELTER]).toEqual({ recipeId: "smelt_iron", accMs: 0, produced: 0 });
  });

  /**
   * Task #364 Fix 2 (Audit #363): die accMs-Klemme hing an der BESTEN Katalog-Stufe (60 000 ms)
   * statt an der tatsächlichen Stufe des Slots — ein Stufe-I-Schmelzofen (20/h ⇒ 180 000 ms je
   * Durchlauf) verlor damit bei JEDEM Laden bis zu 120 000 ms echten Fortschritt.
   */
  it("Stufe I: der volle Akkumulator überlebt Save/Load (kein Fortschritts-Verlust)", () => {
    for (const [level, perRun] of [[1, 180_000], [2, 90_000], [3, 60_000]] as const) {
      const s = smelterState(`Stufe${level}`);
      s.camp.buildings[SMELTER] = level;
      // Ein voll aufgeladener Slot: genau EIN Durchlauf der eigenen Stufe (so klemmt die Engine).
      s.camp.refine[SMELTER] = { recipeId: "smelt_iron", accMs: perRun, produced: 12 };
      expect(roundTrip(s).camp.refine[SMELTER], `Stufe ${level}`).toEqual({
        recipeId: "smelt_iron",
        accMs: perRun,
        produced: 12,
      });
      // Und weiterhin eine harte Obergrenze: darüber wird auf die eigene Stufe gestutzt.
      s.camp.refine[SMELTER] = { recipeId: "smelt_iron", accMs: perRun + 1, produced: 12 };
      expect(roundTrip(s).camp.refine[SMELTER]!.accMs, `Stufe ${level} Überlauf`).toBe(perRun);
    }
  });

  it("Stufe-I-Fortschritt überlebt auch den ECHTEN Engine-Aufladezustand (Ende-zu-Ende)", () => {
    // Ohne Erz lädt tickCampRefine den Akku verlustfrei auf einen Durchlauf auf (180 000 ms bei
    // Stufe I). Genau dieser Zustand landet im Save — und muss ihn unverändert überstehen.
    const s = smelterState("EchteAufladung");
    s.camp.buildings[SMELTER] = 1;
    s.camp.refine[SMELTER] = { recipeId: "smelt_iron", accMs: 0, produced: 0 };
    const savedAt = 1_000_000;
    const charged = deserialize(serialize(s, savedAt), content, savedAt + 8 * 3_600_000)!.state;
    expect(charged.camp.refine[SMELTER]!.accMs).toBe(180_000); // aufgeladen, nichts produziert
    expect(roundTrip(charged).camp.refine[SMELTER]!.accMs).toBe(180_000); // und übersteht den Load
  });

  it("härtet slayerFreeSkipDay auf eine ganze Zahl ≥ 0", () => {
    const s = createGame({ name: "Stempel" }, content, 1);
    s.slayerFreeSkipDay = 20260727;
    expect(roundTrip(s).slayerFreeSkipDay).toBe(20260727);
    for (const [bad, expected] of [[Number.NaN, 0], [-3, 0], [20260727.9, 20260727]] as const) {
      s.slayerFreeSkipDay = bad;
      expect(roundTrip(s).slayerFreeSkipDay, String(bad)).toBe(expected);
    }
  });
});

describe("Veredelung — Offline-Report (campRefined)", () => {
  it("veredelt im Offline-Fenster und meldet Gebäude + Output-Menge", () => {
    const s = smelterState("OfflineOfen");
    s.bank.iron_ore = 500;
    s.camp.refine[SMELTER] = { recipeId: "smelt_iron", accMs: 0, produced: 0 };
    const savedAt = 1_000_000;
    // 1 h offline, Schmelzofen III = 60/h.
    const r = deserialize(serialize(s, savedAt), content, savedAt + 3_600_000);
    expect(r).not.toBeNull();
    expect(r!.state.camp.refine[SMELTER]!.produced).toBe(60);
    expect(r!.offline.campRefined).toEqual([{ buildingId: SMELTER, itemId: "iron_bar", qty: 60 }]);
    expect(r!.state.bank.iron_ore).toBe(440);
  });

  it("ohne Produktion im Fenster: kein campRefined-Feld (fehlt statt leer)", () => {
    const s = smelterState("Leerlauf");
    s.camp.refine[SMELTER] = { recipeId: "smelt_iron", accMs: 0, produced: 0 };
    // KEIN Erz → nichts zu tun.
    const savedAt = 1_000_000;
    const r = deserialize(serialize(s, savedAt), content, savedAt + 3_600_000);
    expect(r!.offline.campRefined).toBeUndefined();
  });

  it("ohne gebaute Anlage passiert offline nichts", () => {
    const s = createGame({ name: "Ohne" }, content, 1);
    s.bank.iron_ore = 500;
    const savedAt = 1_000_000;
    const r = deserialize(serialize(s, savedAt), content, savedAt + 3_600_000);
    expect(r!.offline.campRefined).toBeUndefined();
    expect(r!.state.bank.iron_ore).toBe(500);
  });
});

// ── SAVE 78: New-Haven-Dorfkarte, freie Platzierung (Task #370) ─────────────────────────────────

/**
 * Karten-Positionen (`camp.positions`): Migration der Bestandsspieler (v77 kennt das Feld nicht),
 * Round-Trip befüllter Karten und der deterministische Reparatur-Pass (`campRepairPositions`).
 * Invariante nach JEDEM Laden: genau die Gebäude auf der Karte haben eine Position und jede hält
 * ihre vollständige Bühne im Kartenrand. Überlappung ist seit Chefentscheid ausdrücklich erlaubt.
 */
function expectMapInvariants(camp: CampState, expectedIds: string[]): void {
  expect(Object.keys(camp.positions).sort()).toEqual([...expectedIds].sort());
  const entries = Object.entries(camp.positions);
  for (const [id, pos] of entries) {
    expect(Number.isFinite(pos.x) && Number.isFinite(pos.y), `${id} nicht-endlich`).toBe(true);
    expect(campPointInBuildable(pos.x, pos.y), `${id} außerhalb der Fläche`).toBe(true);
  }
}

describe("Dorfkarte — Migration v77→v78", () => {
  it("Bestandsspieler ohne das Feld: JEDES gebaute Gebäude bekommt einen freien Rasterplatz", () => {
    const s = createGame({ name: "Alt77" }, content, 1);
    s.camp = defaultCampState();
    s.camp.buildings[CAMP_TOWNHALL_ID] = 2;
    s.camp.buildings.camp_fishing_hut = 1;
    s.camp.buildings.camp_sawpit = 3;
    delete (s.camp as Partial<CampState>).positions; // v77-Shape

    const loaded = roundTrip(s);
    // Niemand verliert etwas: alle Stufen unverändert.
    expect(loaded.camp.buildings).toEqual({
      camp_townhall: 2,
      camp_fishing_hut: 1,
      camp_sawpit: 3,
    });
    expectMapInvariants(loaded.camp, [CAMP_TOWNHALL_ID, "camp_fishing_hut", "camp_sawpit"]);
    // Verteilung in KATALOG-Reihenfolge auf die ersten Rasterplätze (deterministisch).
    const slots = campLayoutSlots();
    expect(loaded.camp.positions[CAMP_TOWNHALL_ID]).toEqual(slots[0]);
    expect(loaded.camp.positions.camp_fishing_hut).toEqual(slots[1]);
    expect(loaded.camp.positions.camp_sawpit).toEqual(slots[2]);
  });

  it("die Verteilung ist reproduzierbar (zweimal dasselbe Save ⇒ identische Karte)", () => {
    const mk = (): CampState => {
      const s = createGame({ name: "Repro" }, content, 7);
      s.camp = defaultCampState();
      for (const id of [CAMP_TOWNHALL_ID, "camp_watchtower", "camp_storehouse", "camp_smelter"]) {
        s.camp.buildings[id] = 1;
      }
      delete (s.camp as Partial<CampState>).positions;
      return roundTrip(s).camp;
    };
    expect(mk()).toEqual(mk());
  });

  it("der laufende NEUBAU bekommt seinen reservierten Platz ebenfalls migriert", () => {
    const s = createGame({ name: "ImBau" }, content, 1);
    s.camp = defaultCampState();
    s.camp.buildings[CAMP_TOWNHALL_ID] = 1;
    s.camp.buildJob = { buildingId: "camp_watchtower", targetLevel: 1, remainingMs: 1000 };
    delete (s.camp as Partial<CampState>).positions;
    const loaded = roundTrip(s);
    expectMapInvariants(loaded.camp, [CAMP_TOWNHALL_ID, "camp_watchtower"]);
  });

  it("leeres Lager bleibt leer (keine Geister-Positionen)", () => {
    const s = createGame({ name: "Leer" }, content, 1);
    delete (s.camp as Partial<CampState>).positions;
    expect(roundTrip(s).camp.positions).toEqual({});
  });

  it("kaputtes positions-Feld (Array/String/null/Zahl) fällt auf die Auto-Verteilung zurück", () => {
    const s = createGame({ name: "Kaputt" }, content, 1);
    s.camp.buildings.camp_sawpit = 1;
    for (const bad of [["nope"], "nope", null, 7]) {
      (s.camp as unknown as { positions: unknown }).positions = bad;
      expectMapInvariants(roundTrip(s).camp, ["camp_sawpit"]);
    }
  });
});

describe("Dorfkarte — Round-Trip & sanitize-Härtung", () => {
  it("erhält frei gewählte Positionen verlustfrei (idempotent)", () => {
    const s = createGame({ name: "Bauherr" }, content, 1);
    s.camp = builtCamp();
    const loaded = roundTrip(s);
    expect(loaded.camp.positions).toEqual(builtCamp().positions);
    expect(roundTrip(loaded).camp.positions).toEqual(loaded.camp.positions);
  });

  it("strippt Positionen unbekannter Gebäude UND solcher ohne Karten-Präsenz", () => {
    const s = createGame({ name: "Drift" }, content, 1);
    s.camp = builtCamp();
    s.camp.positions.camp_luftschloss = { x: 0.5, y: 0.4 };
    s.camp.positions.camp_smelter = { x: 0.8, y: 0.4 }; // nie gebaut
    const loaded = roundTrip(s);
    expect(loaded.camp.positions.camp_luftschloss).toBeUndefined();
    expect(loaded.camp.positions.camp_smelter).toBeUndefined();
    expect(loaded.camp.positions).toEqual(builtCamp().positions);
  });

  it("klemmt Koordinaten auf 0..1 und rundet auf 4 Nachkommastellen", () => {
    const s = createGame({ name: "Klemme" }, content, 1);
    s.camp = defaultCampState();
    s.camp.buildings.camp_sawpit = 1;
    // In der Fläche, aber mit Fließkomma-Rauschen.
    s.camp.positions.camp_sawpit = { x: 0.5123456789, y: 0.4987654321 };
    expect(roundTrip(s).camp.positions.camp_sawpit).toEqual({ x: 0.5123, y: 0.4988 });
    // Weit außerhalb: 0..1-Klemme greift, danach ist der Punkt keine gültige Fläche mehr ⇒
    // deterministische Reparatur auf den ersten freien Rasterplatz.
    s.camp.positions.camp_sawpit = { x: 42, y: -13 };
    expect(roundTrip(s).camp.positions.camp_sawpit).toEqual(campLayoutSlots()[0]);
  });

  it("repariert nicht-endliche und strukturell kaputte Einträge", () => {
    const s = createGame({ name: "Korrupt" }, content, 1);
    s.camp = defaultCampState();
    s.camp.buildings.camp_sawpit = 1;
    for (const bad of [
      { x: Number.NaN, y: 0.5 },
      { x: 0.5, y: Number.POSITIVE_INFINITY },
      { x: "0.5", y: 0.5 },
      ["0.5", "0.5"],
      null,
      42,
    ]) {
      (s.camp.positions as Record<string, unknown>).camp_sawpit = bad;
      const loaded = roundTrip(s);
      expectMapInvariants(loaded.camp, ["camp_sawpit"]);
      expect(loaded.camp.positions.camp_sawpit, JSON.stringify(bad)).toEqual(campLayoutSlots()[0]);
    }
  });

  it("Position außerhalb der bebaubaren Fläche (Wasser/Fels) wandert auf einen freien Rasterplatz", () => {
    const s = createGame({ name: "Wasser" }, content, 1);
    s.camp = defaultCampState();
    s.camp.buildings.camp_sawpit = 1;
    s.camp.positions.camp_sawpit = { x: 0.02, y: 0.02 }; // Kartenecke, nie bebaubar
    expect(roundTrip(s).camp.positions.camp_sawpit).toEqual(campLayoutSlots()[0]);
  });

  it("Überlappende gültige Positionen bleiben über Save-Round-Trips exakt erhalten", () => {
    const s = createGame({ name: "Kollision" }, content, 1);
    s.camp = defaultCampState();
    s.camp.buildings[CAMP_TOWNHALL_ID] = 1; // Katalog-Index 0
    s.camp.buildings.camp_sawpit = 1; // Katalog-Index 5
    s.camp.positions[CAMP_TOWNHALL_ID] = { x: 0.5, y: 0.5 };
    s.camp.positions.camp_sawpit = { x: 0.52, y: 0.5 }; // überlappt
    const loaded = roundTrip(s);
    expect(loaded.camp.positions[CAMP_TOWNHALL_ID]).toEqual({ x: 0.5, y: 0.5 });
    // codex:2026-07-31T23:56:00+02:00 — Sanitize entzerrt die bewusste Spieleranordnung nicht mehr.
    expect(loaded.camp.positions.camp_sawpit).toEqual({ x: 0.52, y: 0.5 });
    expectMapInvariants(loaded.camp, [CAMP_TOWNHALL_ID, "camp_sawpit"]);
    // Und der reparierte Stand ist ein Fixpunkt.
    expect(roundTrip(loaded).camp.positions).toEqual(loaded.camp.positions);
  });

  it("Positionen bleiben über einen echten Offline-Catch-up unverändert (der Bautrupp verrückt nichts)", () => {
    const s = createGame({ name: "Offline" }, content, 1);
    s.camp = builtCamp();
    const savedAt = 1_000_000;
    const r = deserialize(serialize(s, savedAt), content, savedAt + 8 * 3_600_000);
    expect(r).not.toBeNull();
    // Der Wachturm-Neubau ist fertig — seine Position ist exakt die reservierte geblieben.
    expect(r!.state.camp.buildings.camp_watchtower).toBe(1);
    expect(r!.state.camp.positions).toEqual(builtCamp().positions);
  });
});

// codex:2026-08-03T12:45:00+02:00 — SAVE_VERSION 80: Spieler-Kalibrierung folgt Claudes
// normalem Migration-/Sanitize-/Round-Trip-Vertrag und ist kein UI- oder localStorage-Sonderweg.
describe("Lager — persistierte Karten-Darstellung (v79→v80)", () => {
  it("migriert Alt-Saves ohne mapVisuals auf leere Overrides", () => {
    const s = createGame({ name: "Altkarte" }, content, 1);
    s.version = 79;
    delete (s.camp as Partial<CampState>).mapVisuals;
    const loaded = roundTrip(s);
    expect(loaded.version).toBe(SAVE_VERSION);
    expect(loaded.camp.mapVisuals).toEqual({});
  });

  it("erhält gültige Skalierung und Spiegelung idempotent", () => {
    const s = createGame({ name: "Kartograph" }, content, 1);
    s.camp.buildings[CAMP_TOWNHALL_ID] = 2;
    s.camp.positions[CAMP_TOWNHALL_ID] = { x: 0.5, y: 0.5 };
    s.camp.mapVisuals[CAMP_TOWNHALL_ID] = { scalePercent: 173, flipped: true };
    const once = roundTrip(s);
    expect(once.camp.mapVisuals[CAMP_TOWNHALL_ID]).toEqual({ scalePercent: 173, flipped: true });
    expect(roundTrip(once).camp.mapVisuals).toEqual(once.camp.mapVisuals);
  });

  it("klemmt, rundet und strippt unmögliche oder verwaiste Overrides", () => {
    const s = createGame({ name: "Reparatur" }, content, 1);
    s.camp.buildings[CAMP_TOWNHALL_ID] = 1;
    s.camp.buildings.camp_sawpit = 1;
    s.camp.positions[CAMP_TOWNHALL_ID] = { x: 0.5, y: 0.5 };
    s.camp.positions.camp_sawpit = { x: 0.7, y: 0.5 };
    (s.camp.mapVisuals as Record<string, unknown>)[CAMP_TOWNHALL_ID] = {
      scalePercent: 999.4,
      flipped: "yes",
    };
    (s.camp.mapVisuals as Record<string, unknown>).camp_sawpit = { scalePercent: 0, flipped: true };
    (s.camp.mapVisuals as Record<string, unknown>).camp_unknown = { scalePercent: 150, flipped: true };
    const loaded = roundTrip(s);
    expect(loaded.camp.mapVisuals[CAMP_TOWNHALL_ID]).toEqual({ scalePercent: 300, flipped: false });
    expect(loaded.camp.mapVisuals.camp_sawpit).toEqual({ scalePercent: 1, flipped: true });
    expect(loaded.camp.mapVisuals.camp_unknown).toBeUndefined();

    delete loaded.camp.positions.camp_sawpit;
    delete loaded.camp.buildings.camp_sawpit;
    expect(roundTrip(loaded).camp.mapVisuals.camp_sawpit).toBeUndefined();
  });
});

describe("Wachturm — effektives Offline-Fenster (SAVE 77)", () => {
  it("ohne Wachturm bleibt das Fenster bei 8 h", () => {
    const s = createGame({ name: "Ohne" }, content, 1);
    const savedAt = 1_000_000;
    const r = deserialize(serialize(s, savedAt), content, savedAt + 20 * 3_600_000);
    expect(r!.offlineMs).toBe(MAX_OFFLINE_MS);
  });

  it("Wachturm I/II/III hebt das Fenster auf 9/10/11 h", () => {
    for (const [level, hours] of [[1, 9], [2, 10], [3, 11]] as const) {
      const s = createGame({ name: "Turm" }, content, 1);
      s.camp.buildings.camp_watchtower = level;
      const savedAt = 1_000_000;
      const r = deserialize(serialize(s, savedAt), content, savedAt + 20 * 3_600_000);
      expect(r!.offlineMs, `Stufe ${level}`).toBe(hours * 3_600_000);
    }
  });

  it("das größere Fenster schreibt sich auch in den Fortschritt durch (mehr Ticks)", () => {
    const mk = (level: number): number => {
      const s = createGame({ name: "Turm" }, content, 1);
      if (level > 0) s.camp.buildings.camp_watchtower = level;
      const savedAt = 1_000_000;
      return deserialize(serialize(s, savedAt), content, savedAt + 20 * 3_600_000)!.offlineTicks;
    };
    expect(mk(3)).toBeGreaterThan(mk(0));
    expect(mk(3) - mk(0)).toBe((3 * 3_600_000) / TICK_MS);
  });
});
