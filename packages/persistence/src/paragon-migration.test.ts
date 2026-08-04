import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { GameSettings, GameState } from "@hearthforge/shared";
import { createGame } from "@hearthforge/engine";
import { deserialize, serialize } from "./index";

/**
 * Paragonturm-Persistenz (SAVE_VERSION 60→61, dungeon-rework-spec §7 + Save-Kompat-Gesetz):
 *  - Alt-Saves (< 61) ohne `state.paragon` laden mit dem Default { checkpoint: 0, best: 0 }.
 *  - Der Etagen-Checkpoint + Rekord und eine AKTIVE Turm-Etage (`combat.paragonFloor`)
 *    überleben den Save/Load-Round-Trip (Checkpoint-Semantik: Pause/Save/Offline verlustfrei).
 *  - sanitize härtet STRIKT: Finites/Ganzzahlen, best ≥ checkpoint, paragonFloor === checkpoint+1
 *    (sonst wird der Kampf beendet — der Checkpoint bleibt, kein Verlust, kein Etagen-Spoofing).
 */

/** Fester Zeitstempel für serialize UND deserialize — kein Offline-Catch-up-Tick im Test. */
function roundTrip(s: GameState): GameState {
  const now = 1_000_000;
  const r = deserialize(serialize(s, now), content, now);
  expect(r).not.toBeNull();
  return r!.state;
}

describe("Paragonturm-Persistenz (SAVE 61)", () => {
  it("Migration v60→v61: Alt-Save ohne paragon lädt mit Default { 0, 0 }", () => {
    const s = createGame({ name: "Alt" }, content, 42);
    delete (s as Partial<GameState>).paragon; // v60-Shape simulieren
    (s as { version: number }).version = 60;
    const loaded = roundTrip(s);
    expect(loaded.version).toBeGreaterThanOrEqual(61);
    expect(loaded.paragon).toEqual({ checkpoint: 0, best: 0 });
    expect(loaded.combat.paragonFloor).toBeUndefined();
  });

  it("Checkpoint-Round-Trip: Fortschritt + AKTIVE Etage überleben Save/Load (Pause = verlustfrei)", () => {
    const s = createGame({ name: "Kletterer" }, content, 42);
    s.paragon = { checkpoint: 7, best: 12 };
    // Mitten in Etage 8 gespeichert (gültig: paragonFloor === checkpoint + 1, aktiver Kampf).
    s.combat.monsterId = "void_titan";
    s.combat.enemyHp = 1234;
    s.combat.paragonFloor = 8;
    const loaded = roundTrip(s);
    expect(loaded.paragon).toEqual({ checkpoint: 7, best: 12 });
    expect(loaded.combat.paragonFloor).toBe(8);
    expect(loaded.combat.monsterId).toBe("void_titan");
    expect(loaded.combat.enemyHp).toBe(1234);
    // Zweiter Round-Trip ist stabil (Migration + sanitize idempotent).
    const again = roundTrip(loaded);
    expect(again.paragon).toEqual(loaded.paragon);
    expect(again.combat.paragonFloor).toBe(8);
  });

  it("sanitize STRIKT: gespoofte paragonFloor (≠ checkpoint+1) beendet den Kampf — Checkpoint bleibt", () => {
    const s = createGame({ name: "Editor" }, content, 42);
    s.paragon = { checkpoint: 3, best: 3 };
    s.combat.monsterId = "void_titan";
    s.combat.paragonFloor = 999; // Save-Edit: Etagen-999-Erträge erschleichen
    const loaded = roundTrip(s);
    expect(loaded.combat.paragonFloor).toBeUndefined();
    expect(loaded.combat.monsterId, "inkonsistente Turm-Etage ⇒ Kampf beendet").toBe(null);
    expect(loaded.paragon).toEqual({ checkpoint: 3, best: 3 }); // kein Verlust
  });

  it("sanitize STRIKT: paragonFloor ohne aktiven Kampf wird geräumt; NaN/negativ/float → Defaults/Invarianten", () => {
    const s = createGame({ name: "Korrupt" }, content, 42);
    s.paragon = { checkpoint: Number.NaN, best: -5 };
    s.combat.paragonFloor = 4; // verwaist: kein monsterId
    const loaded = roundTrip(s);
    expect(loaded.paragon).toEqual({ checkpoint: 0, best: 0 });
    expect(loaded.combat.paragonFloor).toBeUndefined();

    const s2 = createGame({ name: "Korrupt2" }, content, 42);
    s2.paragon = { checkpoint: 6.9, best: 2 }; // float + Rekord hinter dem Aufstieg
    const loaded2 = roundTrip(s2);
    expect(loaded2.paragon.checkpoint).toBe(6); // gefloort
    expect(loaded2.paragon.best, "Invariante best ≥ checkpoint erzwungen").toBe(6);
  });

  it("Tod-Reset-Persistenz-Sicht: checkpoint 0 + hoher best-Rekord ist ein legitimer, stabiler Zustand", () => {
    const s = createGame({ name: "Gefallen" }, content, 42);
    s.paragon = { checkpoint: 0, best: 41 }; // nach Tod im Turm
    const loaded = roundTrip(s);
    expect(loaded.paragon).toEqual({ checkpoint: 0, best: 41 });
  });
});

/**
 * Auto-Aufstieg-Toggle (SAVE_VERSION 66→67, Welle JJ — Aldric A2): neues Settings-Feld
 * `settings.autoParagonAscend` (Default false, Opt-in). Migration defaultet fehlende Felder,
 * die Härtung ist STRIKT boolean und läuft bei jedem Load (Muster autoBank).
 */
describe("Auto-Aufstieg-Setting (SAVE 67)", () => {
  it("Migration v66→v67: Alt-Save ohne autoParagonAscend lädt mit false (Opt-in-Default)", () => {
    const s = createGame({ name: "Alt66" }, content, 42);
    delete (s.settings as Partial<GameSettings>).autoParagonAscend; // v66-Shape simulieren
    (s as { version: number }).version = 66;
    const loaded = roundTrip(s);
    expect(loaded.version).toBeGreaterThanOrEqual(67);
    expect(loaded.settings.autoParagonAscend).toBe(false);
    expect(loaded.settings.autoBank, "Bestands-Setting bleibt unangetastet").toBe(true);
  });

  it("Round-Trip erhält ein aktiviertes Toggle (true bleibt true, idempotent)", () => {
    const s = createGame({ name: "Kletterer" }, content, 42);
    s.settings.autoParagonAscend = true;
    const loaded = roundTrip(s);
    expect(loaded.settings.autoParagonAscend).toBe(true);
    const again = roundTrip(loaded);
    expect(again.settings.autoParagonAscend).toBe(true);
  });

  it("Härtung STRIKT boolean: Nicht-boolean-Werte fallen auf den Default false zurück", () => {
    for (const bad of ["true", 1, null, {}]) {
      const s = createGame({ name: "Editor" }, content, 42);
      (s.settings as unknown as Record<string, unknown>).autoParagonAscend = bad;
      const loaded = roundTrip(s);
      expect(loaded.settings.autoParagonAscend, `Wert ${JSON.stringify(bad)}`).toBe(false);
    }
  });
});

/**
 * Paragon-Truhen-Breadcrumb (SAVE_VERSION 67→68, Welle LL — Fun-Retest paragon-aldric P1):
 * `paragonChestSeq` (monotoner Zähler) + `lastParagonChest` (UI-Breadcrumb, Muster lastPetDrop).
 * Migration defaultet fehlende Felder (0/null); sanitize härtet das Shape (floor 1..MAX, items
 * nur bekannte IDs mit qty ≥ 1) und erzwingt die Monotonie paragonChestSeq ≥ lastParagonChest.seq.
 */
describe("Paragon-Truhen-Breadcrumb (SAVE 68)", () => {
  it("Migration v67→v68: Alt-Save ohne die Felder lädt mit Zähler 0 + Breadcrumb null", () => {
    const s = createGame({ name: "Alt67" }, content, 42);
    const raw = s as unknown as Record<string, unknown>;
    delete raw.paragonChestSeq;
    delete raw.lastParagonChest;
    (s as { version: number }).version = 67;
    const loaded = roundTrip(s);
    expect(loaded.version).toBeGreaterThanOrEqual(68);
    expect(loaded.paragonChestSeq).toBe(0);
    expect(loaded.lastParagonChest).toBeNull();
  });

  it("Round-Trip erhält Breadcrumb + Zähler verlustfrei (auch leere items — All-Miss-Truhe)", () => {
    const s = createGame({ name: "Kletterer" }, content, 42);
    s.paragonChestSeq = 4;
    s.lastParagonChest = {
      floor: 10,
      chestTier: 2,
      items: [{ id: "godiron_bar", qty: 3 }, { id: "soulopal", qty: 1 }],
      seq: 4,
    };
    const loaded = roundTrip(s);
    expect(loaded.paragonChestSeq).toBe(4);
    expect(loaded.lastParagonChest).toEqual(s.lastParagonChest);
    // Quittierter Breadcrumb (null) + hoher Zähler bleiben stabil (seq NIE genullt).
    const s2 = createGame({ name: "Quittiert" }, content, 42);
    s2.paragonChestSeq = 9;
    s2.lastParagonChest = null;
    const loaded2 = roundTrip(s2);
    expect(loaded2.paragonChestSeq).toBe(9);
    expect(loaded2.lastParagonChest).toBeNull();
    // All-Miss-Truhe: leeres items-Array ist ein legitimer Breadcrumb und überlebt.
    const s3 = createGame({ name: "Pechvogel" }, content, 42);
    s3.paragonChestSeq = 1;
    s3.lastParagonChest = { floor: 5, chestTier: 1, items: [], seq: 1 };
    const loaded3 = roundTrip(s3);
    expect(loaded3.lastParagonChest).toEqual({ floor: 5, chestTier: 1, items: [], seq: 1 });
  });

  it("sanitize STRIKT: kaputte Shapes → Breadcrumb verworfen; unbekannte Item-IDs gestrippt; seq-Monotonie erzwungen", () => {
    // Kaputtes floor/Shape ⇒ Breadcrumb weg, Zähler bleibt.
    const s = createGame({ name: "Editor" }, content, 42);
    s.paragonChestSeq = 5;
    (s as unknown as Record<string, unknown>).lastParagonChest = { floor: "zehn", chestTier: 1, items: [], seq: 2 };
    const loaded = roundTrip(s);
    expect(loaded.lastParagonChest).toBeNull();
    expect(loaded.paragonChestSeq).toBe(5);

    // Unbekannte/defekte item-Rows fliegen raus; gültige bleiben.
    const s2 = createGame({ name: "Editor2" }, content, 42);
    s2.paragonChestSeq = 2;
    (s2 as unknown as Record<string, unknown>).lastParagonChest = {
      floor: 5,
      chestTier: 1,
      items: [
        { id: "ghost_item_xyz", qty: 3 },
        { id: "godiron_bar", qty: 2.9 },
        { id: "soulopal", qty: -4 },
        42,
      ],
      seq: 2,
    };
    const loaded2 = roundTrip(s2);
    expect(loaded2.lastParagonChest).toEqual({
      floor: 5,
      chestTier: 1,
      items: [{ id: "godiron_bar", qty: 2 }], // gefloort; Geister/negative/defekte Rows raus
      seq: 2,
    });

    // Monotonie: Zähler NIE unter dem Breadcrumb-seq (Muster petDropSeq).
    const s3 = createGame({ name: "Editor3" }, content, 42);
    (s3 as unknown as Record<string, unknown>).paragonChestSeq = -7;
    s3.lastParagonChest = { floor: 5, chestTier: 1, items: [], seq: 3 };
    const loaded3 = roundTrip(s3);
    expect(loaded3.paragonChestSeq).toBe(3);
  });
});
