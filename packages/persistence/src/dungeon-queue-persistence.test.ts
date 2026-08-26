import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { GameState } from "@hearthforge/shared";
import { PARAGON_DUNGEON_ID, SAVE_VERSION, makeDungeonQueueEntry, makeFightQueueEntry } from "@hearthforge/shared";
import {
  addItem,
  advanceActionQueue,
  canEnterDungeon,
  createGame,
  enqueueDungeonRuns,
  equipItem,
  xpForLevel,
} from "@hearthforge/engine";
import { deserialize, serialize } from "./index";

/**
 * Persistenz der DUNGEON-QUEUE (SAVE_VERSION 82→83, Chef-Auftrag 26.08.2026 „Dungeons queuebar"):
 *  • Migration: Alt-Saves (< 83) bekommen `queueDungeon: null`; Queue-Einträge bleiben unverändert.
 *  • Round-Trip: "dungeon"-Einträge (endlich + ∞) und ein LAUFENDER Queue-Dungeon-Lauf
 *    (`queueDungeon` + passender `combat.dungeonId`) überleben Save/Load verlustfrei.
 *  • Sanitize: unbekannte Dungeons / Paragonturm (keine Wellen) raus, kaputte Laufzeit verworfen,
 *    queueDungeon⇔combat-Invariante (Mismatch → Rest an die Queue-Front, NICHTS geht still verloren),
 *    Dungeon-Skip-Breadcrumb nur solange sein Grund heute noch gilt (Muster queue-skip-load).
 *  • `combat.lastDungeonClear` ist transient (Load-Whitelist) — kein Save-Bump-Anteil.
 *  • Offline-Catch-up beim Laden führt einen laufenden Queue-Dungeon-Lauf zu Ende (Läufe zählen).
 * Der Release-Pin (save-compat-vault.test.ts v80-Block) sichert zusätzlich die Default-Fläche
 * eines echten migrierten Saves (v80 → v83: exakt drei neue Flächen).
 */

const WARBAND = "goblin_warband";
const NOW = 1_000_000;

/** Fester Zeitstempel für serialize UND deserialize — kein Offline-Catch-up-Tick im Test. */
function roundTrip(s: GameState): GameState {
  const r = deserialize(serialize(s, NOW), content, NOW);
  expect(r).not.toBeNull();
  return r!.state;
}

/** Alle Zonen + die Kriegsbande offen (Bestandsschutz-Grants, Muster engine test-helpers). */
function unlockAll(s: GameState): GameState {
  for (const z of content.zones) s.legacyZoneGrants[z.id] = true;
  s.dungeonsUnlocked[WARBAND] = true;
  return s;
}

/** Gerüsteter L99-Held (Muster engine dungeon-queue.test.ts) — räumt die Kriegsbande zügig. */
function champion(seed: number): GameState {
  const s = unlockAll(createGame({ name: "Champion", baseAttributes: { str: 10, con: 10 } }, content, seed));
  for (const id of ["attack", "power", "defence", "ranged", "magic", "warding", "vitality"]) {
    s.skills[id] = { xp: xpForLevel(99) };
  }
  for (const g of ["godiron_sword", "godiron_fullhelm", "godiron_platebody", "godiron_platelegs", "godiron_kiteshield"]) {
    addItem(s.inventory, content, g, 1);
    equipItem(s, content, g);
  }
  expect(s.character.equipment.mainhand).toBe("godiron_sword");
  addItem(s.inventory, content, "cooked_voidray", 1000);
  s.character.food = "cooked_voidray";
  return s;
}

describe("Dungeon-Queue-Migration (SAVE 82 → 83)", () => {
  it("v82-Alt-Save ohne queueDungeon: Migration setzt explizit null, Queue-Einträge bleiben byte-gleich", () => {
    const s = createGame({ name: "Alt" }, content, 1);
    s.actionQueue.push({ kind: "action", actionId: "cut_normal_tree", target: 5 }, makeFightQueueEntry("chicken", null));
    const raw = JSON.parse(serialize(s, NOW)) as { version: number; state: Record<string, unknown> };
    raw.version = 82;
    raw.state.version = 82;
    delete raw.state.queueDungeon; // so sieht ein v82-Save aus
    const json = JSON.stringify(raw);
    expect(json).not.toContain("queueDungeon");

    const loaded = deserialize(json, content, NOW)!.state;
    expect(loaded.version).toBe(SAVE_VERSION);
    expect(SAVE_VERSION).toBeGreaterThanOrEqual(83);
    expect("queueDungeon" in loaded).toBe(true); // explizit vorhanden, nicht nur „undefined"
    expect(loaded.queueDungeon).toBeNull();
    expect(loaded.actionQueue).toEqual([
      { kind: "action", actionId: "cut_normal_tree", target: 5 },
      makeFightQueueEntry("chicken", null),
    ]);
    // Idempotent: zweiter Load ändert nichts mehr.
    expect(roundTrip(loaded)).toEqual(loaded);
  });
});

describe("Dungeon-Queue-Round-Trip (dungeon-Einträge + laufender Queue-Dungeon-Lauf)", () => {
  it("erhält geplante dungeon-Einträge (endlich + ∞) in gemischten Ketten verlustfrei", () => {
    const s = createGame({ name: "Planer" }, content, 1);
    expect(enqueueDungeonRuns(s, content, WARBAND, 25)).toBe(true);
    s.actionQueue.push({ kind: "action", actionId: "cut_normal_tree", target: 3 });
    s.actionQueue.push(makeFightQueueEntry("chicken", 5));
    expect(enqueueDungeonRuns(s, content, "crypt_depths", null)).toBe(true);

    const loaded = roundTrip(s);
    expect(loaded.actionQueue).toEqual([
      makeDungeonQueueEntry(WARBAND, 25),
      { kind: "action", actionId: "cut_normal_tree", target: 3 },
      makeFightQueueEntry("chicken", 5),
      makeDungeonQueueEntry("crypt_depths", null),
    ]);
    expect(roundTrip(loaded).actionQueue).toEqual(loaded.actionQueue);
  });

  it("erhält einen LAUFENDEN Queue-Dungeon-Lauf (queueDungeon + combat.dungeonId) mit Rest und Zähler", () => {
    const s = unlockAll(createGame({ name: "Läufer" }, content, 1));
    expect(enqueueDungeonRuns(s, content, WARBAND, 3)).toBe(true);
    expect(advanceActionQueue(s, content)).toBe(true);
    expect(s.combat.dungeonId).toBe(WARBAND);
    s.queueDungeon!.completed = 1; // ein Clear geschafft, Lauf 2 von 3 läuft
    s.queueDungeon!.remaining = 2;

    const loaded = roundTrip(s);
    expect(loaded.queueDungeon).toEqual({ dungeonId: WARBAND, remaining: 2, completed: 1 });
    expect(loaded.combat.dungeonId).toBe(WARBAND);
    expect(loaded.combat.monsterId).toBe(s.combat.monsterId);
    expect(loaded.actionQueue).toEqual([]);
    expect(roundTrip(loaded).queueDungeon).toEqual(loaded.queueDungeon);
  });
});

describe("Dungeon-Queue-Sanitize (Save-Edit-/Drift-Härtung)", () => {
  it("wirft unbekannte Dungeons, den Paragonturm (keine Wellen) und Einträge ohne dungeonId raus; kaputte Ziele → ∞", () => {
    const s = createGame({ name: "Drift" }, content, 1);
    s.actionQueue.push(
      makeDungeonQueueEntry("gibt_es_nicht", 2),
      makeDungeonQueueEntry(PARAGON_DUNGEON_ID, 2),
      { kind: "dungeon", actionId: "", target: 2 } as GameState["actionQueue"][number],
      makeDungeonQueueEntry(WARBAND, Number.NaN),
      makeDungeonQueueEntry(WARBAND, 7.9),
    );
    const loaded = roundTrip(s);
    expect(loaded.actionQueue).toEqual([
      makeDungeonQueueEntry(WARBAND, null), // NaN → ∞ (wie actionTarget)
      makeDungeonQueueEntry(WARBAND, 7), // Float → abgerundet
    ]);
  });

  it("queueDungeon⇔combat-Invariante: passt der Kampf nicht, wandert der Rest als Eintrag an die Queue-Front", () => {
    const s = unlockAll(createGame({ name: "Geist" }, content, 1));
    enqueueDungeonRuns(s, content, WARBAND, 4);
    advanceActionQueue(s, content);
    s.queueDungeon = { dungeonId: WARBAND, remaining: 3, completed: 1 };
    s.actionQueue.push({ kind: "action", actionId: "cut_normal_tree", target: 1 });

    // (a) Geister-Run: Dungeon-Id steht, aber kein Gegner mehr (monsterId null).
    const ghost = roundTrip({ ...s, combat: { ...s.combat, monsterId: null } });
    expect(ghost.queueDungeon).toBeNull();
    expect(ghost.actionQueue).toEqual([
      makeDungeonQueueEntry(WARBAND, 3),
      { kind: "action", actionId: "cut_normal_tree", target: 1 },
    ]);
    // Front-Eintrag ist sanitize-stabil → idempotent.
    expect(roundTrip(ghost).actionQueue).toEqual(ghost.actionQueue);

    // (b) anderer Dungeon läuft als der Queue-Lauf meint.
    const other = roundTrip({ ...s, combat: { ...s.combat, dungeonId: "crypt_depths" } });
    expect(other.queueDungeon).toBeNull();
    expect(other.actionQueue[0]).toEqual(makeDungeonQueueEntry(WARBAND, 3));

    // (c) ∞-Rest kehrt als ∞-Eintrag zurück.
    const endless = roundTrip({
      ...s,
      queueDungeon: { dungeonId: WARBAND, remaining: null, completed: 9 },
      combat: { ...s.combat, monsterId: null },
    });
    expect(endless.actionQueue[0]).toEqual(makeDungeonQueueEntry(WARBAND, null));
  });

  it("kaputte Laufzeit wird verworfen (remaining ≤ 0/NaN, unbekannter Dungeon); completed wird geklemmt", () => {
    const s = unlockAll(createGame({ name: "Edit" }, content, 1));
    enqueueDungeonRuns(s, content, WARBAND, 2);
    advanceActionQueue(s, content);
    const running = s.queueDungeon!;
    expect(running.dungeonId).toBe(WARBAND);

    for (const bad of [0, -1, "5", {}]) {
      const loaded = roundTrip({ ...s, queueDungeon: { ...running, remaining: bad as number } });
      expect(loaded.queueDungeon, `remaining=${String(bad)}`).toBeNull();
      expect(loaded.actionQueue, `remaining=${String(bad)}`).toEqual([]); // erfüllt/kaputt → nicht neu eingereiht
    }
    // NaN/Infinity werden von JSON zu `null` — das ist per Save-Form ∞ (identisch zu queueFight).
    for (const nonFinite of [Number.NaN, Number.POSITIVE_INFINITY]) {
      const loaded = roundTrip({ ...s, queueDungeon: { ...running, remaining: nonFinite } });
      expect(loaded.queueDungeon).toEqual({ dungeonId: WARBAND, remaining: null, completed: 0 });
    }
    const unknown = roundTrip({ ...s, queueDungeon: { ...running, dungeonId: "gibt_es_nicht" } });
    expect(unknown.queueDungeon).toBeNull();
    expect(unknown.actionQueue).toEqual([]);
    const paragon = roundTrip({ ...s, queueDungeon: { ...running, dungeonId: PARAGON_DUNGEON_ID } });
    expect(paragon.queueDungeon).toBeNull();

    const clamped = roundTrip({ ...s, queueDungeon: { ...running, completed: -5 as number } });
    expect(clamped.queueDungeon).toEqual({ dungeonId: WARBAND, remaining: 2, completed: 0 });
    const floated = roundTrip({ ...s, queueDungeon: { ...running, completed: 2.7 } });
    expect(floated.queueDungeon).toEqual({ dungeonId: WARBAND, remaining: 2, completed: 2 });
  });

  it("queuePaused-Hygiene kennt die Dungeon-Laufzeit: nur mit Queue ODER Laufzeit bleibt die Pause stehen", () => {
    const s = unlockAll(createGame({ name: "Pause" }, content, 1));
    enqueueDungeonRuns(s, content, WARBAND, 2);
    advanceActionQueue(s, content);
    s.queuePaused = true;
    expect(roundTrip(s).queuePaused).toBe(true); // Laufzeit da → Pause bleibt
    s.queueDungeon = null;
    s.combat.monsterId = null;
    s.combat.dungeonId = null;
    expect(roundTrip(s).queuePaused).toBe(false); // nichts zu pausieren → Flag fällt
  });

  it("Dungeon-Skip-Breadcrumb überlebt den Load nur, solange sein Grund heute noch gilt", () => {
    const s = createGame({ name: "Skip" }, content, 7); // Kriegsbande gesperrt (chronicle_04)
    expect(enqueueDungeonRuns(s, content, WARBAND, 3)).toBe(true);
    expect(advanceActionQueue(s, content)).toBe(false);
    expect(s.lastQueueSkip).toEqual({ monsterId: "", dungeonId: WARBAND, reason: "dungeon_locked" });

    const stillLocked = roundTrip(s);
    expect(canEnterDungeon(stillLocked, content, WARBAND)).toBe(false);
    expect(stillLocked.lastQueueSkip).toEqual({ monsterId: "", dungeonId: WARBAND, reason: "dungeon_locked" });

    unlockAll(stillLocked); // Voraussetzung inzwischen erfüllt → veraltete Meldung fällt
    expect(canEnterDungeon(stillLocked, content, WARBAND)).toBe(true);
    const unlocked = roundTrip(stillLocked);
    expect(unlocked.lastQueueSkip).toBeNull();

    // unknown_dungeon bleibt, solange der Dungeon fehlt; auf einen bekannten Dungeon gemünzt fällt er.
    s.lastQueueSkip = { monsterId: "", dungeonId: "gibt_es_nicht", reason: "unknown_dungeon" };
    expect(roundTrip(s).lastQueueSkip).toEqual({ monsterId: "", dungeonId: "gibt_es_nicht", reason: "unknown_dungeon" });
    s.lastQueueSkip = { monsterId: "", dungeonId: WARBAND, reason: "unknown_dungeon" };
    expect(roundTrip(s).lastQueueSkip).toBeNull();
    // Monster-Grund mit Dungeon-Id → Unsinn → fällt.
    s.lastQueueSkip = { monsterId: "", dungeonId: WARBAND, reason: "gate_locked" };
    expect(roundTrip(s).lastQueueSkip).toBeNull();
    // Der bestehende Monster-Pfad bleibt unberührt (Muster queue-skip-load.test.ts).
    s.lastQueueSkip = { monsterId: "goblin", reason: "gate_locked" };
    expect(roundTrip(s).lastQueueSkip).toEqual({ monsterId: "goblin", reason: "gate_locked" });
  });

  it("combat.lastDungeonClear ist transient: überlebt den Load NICHT (keine nachgeholte Zeremonie)", () => {
    const s = createGame({ name: "Transient" }, content, 1);
    s.combat.lastDungeonClear = { dungeonId: WARBAND, clearNo: 1, firstClear: true, gold: 10, xp: 5, loot: [] };
    expect(serialize(s, NOW)).toContain("lastDungeonClear");
    expect(roundTrip(s).combat.lastDungeonClear).toBeUndefined();
  });
});

describe("Offline-Catch-up beim Laden führt einen Queue-Dungeon-Lauf zu Ende", () => {
  it("laufender Lauf 1 von 2 gespeichert → nach 10 Minuten offline: 2 Clears, Queue leer, sauber idle", () => {
    const s = champion(4242);
    expect(enqueueDungeonRuns(s, content, WARBAND, 2)).toBe(true);
    expect(advanceActionQueue(s, content)).toBe(true);
    expect(s.queueDungeon).toEqual({ dungeonId: WARBAND, remaining: 2, completed: 0 });

    const result = deserialize(serialize(s, NOW), content, NOW + 10 * 60_000);
    expect(result).not.toBeNull();
    expect(result!.offlineTicks).toBeGreaterThan(0);
    const loaded = result!.state;
    expect(loaded.stats.deaths).toBe(0);
    expect(loaded.dungeonsCleared[WARBAND]).toBe(2);
    expect(loaded.queueDungeon).toBeNull();
    expect(loaded.combat.monsterId).toBeNull();
    expect(loaded.combat.dungeonId).toBeNull();
    expect(loaded.actionQueue).toEqual([]);
    expect(loaded.queuePaused).toBe(false);
  });
});
