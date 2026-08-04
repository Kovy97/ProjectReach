import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { GameState } from "@hearthforge/shared";
import { makeFightQueueEntry } from "@hearthforge/shared";
import { advanceActionQueue, createGame, enqueueFight } from "@hearthforge/engine";
import { deserialize, serialize } from "./index";

/**
 * Persistenz der KAMPF-QUEUE (SAVE_VERSION 72→73, Task #312, Chef-GO 2026-07-24):
 *  • Migration: Alt-Einträge (ohne `kind`) → `kind:"action"` gestempelt, verlustfrei; neue Felder
 *    `queueFight`/`queuePaused`/`lastQueueSkip` default-initialisiert.
 *  • Round-Trip: "fight"-Einträge (endlich + ∞) und ein LAUFENDER Queue-Kampf (`queueFight` +
 *    passender `combat.monsterId`) überleben Save/Load verlustfrei.
 *  • Sanitize: unbekannte/dungeonOnly-Monster raus, kaputte kinds → "action", queueFight⇔combat-
 *    Invariante (Mismatch → Rest-Ziel zurück an die Queue-Front, NICHTS geht still verloren).
 * Der Release-Pin (save-compat-vault.test.ts v73-Block) sichert zusätzlich die Default-Fläche
 * eines echten migrierten Saves.
 */

/** Fester Zeitstempel für serialize UND deserialize — kein Offline-Catch-up-Tick im Test. */
function roundTrip(s: GameState): GameState {
  const now = 1_000_000;
  const r = deserialize(serialize(s, now), content, now);
  expect(r).not.toBeNull();
  return r!.state;
}

describe("Kampf-Queue-Migration (SAVE 72 → 73)", () => {
  it("stempelt Alt-Einträge (ohne kind) verlustfrei auf kind 'action' und defaultet die neuen Felder", () => {
    const s = createGame({ name: "Alt" }, content, 1);
    s.version = 72;
    // Alt-Shape simulieren: Einträge OHNE kind, neue Felder fehlen komplett (Muster Alt-Save).
    (s as unknown as Record<string, unknown>).actionQueue = [
      { actionId: "cut_normal_tree", target: 5 },
      { actionId: "smelt_bronze", target: null },
    ];
    delete (s as Partial<GameState>).queueFight;
    delete (s as Partial<GameState>).queuePaused;
    delete (s as Partial<GameState>).lastQueueSkip;

    const loaded = roundTrip(s);
    expect(loaded.actionQueue).toEqual([
      { kind: "action", actionId: "cut_normal_tree", target: 5 },
      { kind: "action", actionId: "smelt_bronze", target: null },
    ]);
    expect(loaded.queueFight).toBeNull();
    expect(loaded.queuePaused).toBe(false);
    expect(loaded.lastQueueSkip).toBeNull();
    expect(loaded.version).toBeGreaterThanOrEqual(73);
  });
});

describe("Kampf-Queue-Round-Trip (fight-Einträge + laufender Queue-Kampf)", () => {
  it("erhält geplante fight-Einträge (endlich + ∞) und gemischte Ketten verlustfrei", () => {
    const s = createGame({ name: "Jäger" }, content, 1);
    expect(enqueueFight(s, content, "chicken", 25)).toBe(true);
    (s.actionQueue as GameState["actionQueue"]).push({ kind: "action", actionId: "cut_normal_tree", target: 3 });
    expect(enqueueFight(s, content, "cow", null)).toBe(true); // ∞-Eintrag

    const loaded = roundTrip(s);
    expect(loaded.actionQueue).toEqual([
      makeFightQueueEntry("chicken", 25),
      { kind: "action", actionId: "cut_normal_tree", target: 3 },
      makeFightQueueEntry("cow", null),
    ]);
    // Idempotent: zweiter Round-Trip ändert nichts mehr.
    expect(roundTrip(loaded).actionQueue).toEqual(loaded.actionQueue);
  });

  it("erhält einen LAUFENDEN Queue-Kampf (queueFight + combat.monsterId) mit Rest-Ziel", () => {
    const s = createGame({ name: "Mitten" }, content, 1);
    enqueueFight(s, content, "chicken", 10);
    expect(advanceActionQueue(s, content)).toBe(true); // Kampf läuft an (pastures ist ungegated)
    expect(s.combat.monsterId).toBe("chicken");
    expect(s.queueFight).toEqual({ monsterId: "chicken", remaining: 10 });

    const loaded = roundTrip(s);
    expect(loaded.combat.monsterId).toBe("chicken");
    expect(loaded.queueFight).toEqual({ monsterId: "chicken", remaining: 10 });
  });
});

describe("Kampf-Queue-Sanitize (Härtung beim Laden)", () => {
  it("wirft unbekannte/dungeonOnly/kaputte fight-Einträge raus, normiert kaputte kinds auf 'action'", () => {
    const s = createGame({ name: "Kaputt" }, content, 1);
    (s as unknown as Record<string, unknown>).actionQueue = [
      { kind: "fight", actionId: "", monsterId: "chicken", target: 25 }, // gültig
      { kind: "fight", actionId: "", monsterId: "gibt_es_nicht", target: 5 }, // unbekannt → raus
      { kind: "fight", actionId: "", monsterId: "goblin_reaver", target: 5 }, // dungeonOnly → raus
      { kind: "fight", actionId: "", target: 5 }, // ohne monsterId → raus
      { kind: "fight", actionId: "", monsterId: "chicken", target: -3 }, // ≤0 → ∞ (null)
      { kind: "irgendwas", actionId: "cut_normal_tree", target: 2 }, // kaputtes kind → action
      { kind: "fight", actionId: "cut_normal_tree", monsterId: "cow", target: 7.9 }, // actionId wird normiert, Float → floor
    ];
    const loaded = roundTrip(s);
    expect(loaded.actionQueue).toEqual([
      makeFightQueueEntry("chicken", 25),
      makeFightQueueEntry("chicken", null),
      { kind: "action", actionId: "cut_normal_tree", target: 2 },
      makeFightQueueEntry("cow", 7),
    ]);
  });

  it("queueFight⇔combat-Invariante: ohne passenden laufenden Kampf wandert das Rest-Ziel an die Queue-Front", () => {
    const s = createGame({ name: "Invariante" }, content, 1);
    enqueueFight(s, content, "cow", 3); // wartender Fremd-Eintrag (bleibt hinter der Front)
    s.queueFight = { monsterId: "chicken", remaining: 7 };
    expect(s.combat.monsterId).toBeNull(); // kein Kampf → Invariante verletzt

    const loaded = roundTrip(s);
    expect(loaded.queueFight).toBeNull();
    expect(loaded.actionQueue).toEqual([
      makeFightQueueEntry("chicken", 7), // Rest-Ziel gerettet, vorn
      makeFightQueueEntry("cow", 3),
    ]);
    // Idempotent: beim Re-Load bleibt der Front-Eintrag einfach stehen (kein Doppel-Unshift).
    expect(roundTrip(loaded).actionQueue).toEqual(loaded.actionQueue);
  });

  it("queueFight mit erfülltem/kaputtem remaining oder dungeonOnly-Monster wird verworfen", () => {
    const build = () => createGame({ name: "QF" }, content, 1);
    // remaining 0 = Ziel bereits erfüllt → Laufzeit weg, KEIN Front-Eintrag.
    const done = build();
    done.queueFight = { monsterId: "chicken", remaining: 0 };
    const loadedDone = roundTrip(done);
    expect(loadedDone.queueFight).toBeNull();
    expect(loadedDone.actionQueue).toEqual([]);
    // dungeonOnly-Monster in der Laufzeit (Save-Edit) → verworfen, kein Front-Eintrag.
    const dg = build();
    dg.queueFight = { monsterId: "goblin_reaver", remaining: 5 };
    const loadedDg = roundTrip(dg);
    expect(loadedDg.queueFight).toBeNull();
    expect(loadedDg.actionQueue).toEqual([]);
    // Kaputtes remaining (NaN via JSON → null-Ersatz unmöglich: direkt Objekt-Müll) → verworfen.
    const broken = build();
    (broken as unknown as Record<string, unknown>).queueFight = { monsterId: "chicken", remaining: "viele" };
    const loadedBroken = roundTrip(broken);
    expect(loadedBroken.queueFight).toBeNull();
  });

  it("queuePaused wird strikt boolesch und ohne Queue/Laufzeit hygienisch gelöscht; lastQueueSkip-Whitelist", () => {
    const s = createGame({ name: "Pause" }, content, 1);
    (s as unknown as Record<string, unknown>).queuePaused = "ja"; // Nicht-Boolean → false
    (s as unknown as Record<string, unknown>).lastQueueSkip = { monsterId: "entferntes_monster", reason: "gate_locked" };
    const loaded = roundTrip(s);
    expect(loaded.queuePaused).toBe(false);
    // Skip-Breadcrumb bleibt AUCH für unbekannte Monster erhalten (Content-Drift ist gerade der Grund).
    expect(loaded.lastQueueSkip).toEqual({ monsterId: "entferntes_monster", reason: "gate_locked" });

    // true + leere Queue + keine Laufzeit → nichts zu pausieren → false (Hygiene).
    const empty = createGame({ name: "Leer" }, content, 1);
    empty.queuePaused = true;
    expect(roundTrip(empty).queuePaused).toBe(false);

    // true + nicht-leere Queue → bleibt true (Tod-Pause überlebt Save/Load).
    const paused = createGame({ name: "Tot" }, content, 1);
    enqueueFight(paused, content, "chicken", 5); // enqueue löscht die Pause → danach setzen
    paused.queuePaused = true;
    expect(roundTrip(paused).queuePaused).toBe(true);

    // Unbekannter Skip-Grund → Breadcrumb weg.
    const badReason = createGame({ name: "Grund" }, content, 1);
    (badReason as unknown as Record<string, unknown>).lastQueueSkip = { monsterId: "chicken", reason: "wetter" };
    expect(roundTrip(badReason).lastQueueSkip).toBeNull();
  });
});
