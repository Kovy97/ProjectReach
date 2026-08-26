import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { PARAGON_DUNGEON_ID, TICK_MS, makeDungeonQueueEntry, makeFightQueueEntry } from "@hearthforge/shared";
import type { GameState } from "@hearthforge/shared";
import { createTestGame } from "./test-helpers";
import { createGame } from "./state";
import { advance } from "./tick";
import { startCombat, stopCombat } from "./combat";
import { startDungeon } from "./dungeon";
import {
  advanceActionQueue,
  dungeonRunProgress,
  enqueueAction,
  enqueueDungeonRuns,
  enqueueDungeonRunsAtFront,
  enqueueFight,
  prioritizeQueueEntry,
  queueBlockReason,
  resumeActionQueue,
  setActiveAction,
} from "./actions";
import { equipItem } from "./equipment";
import { addItem, itemCount } from "./inventory";
import { xpForLevel } from "./leveling";

/**
 * DUNGEON-QUEUE (SAVE_VERSION 83, Chef-Auftrag 26.08.2026): „Dungeons sollen nun queuebar sein —
 * wie Kämpfe mit 1×/25×/50×/∞-Knöpfen. Der Spieler kämpft normal durch den Dungeon und fängt
 * nach dem Endboss wieder von neu an."
 *
 * Vertrag (engine/actions.ts + tick.ts):
 *  • "dungeon"-Queue-Eintrag (`enqueueDungeonRuns`/`enqueueDungeonRunsAtFront`), `target` = Läufe.
 *  • Ein Lauf ZÄHLT beim Endboss-Kill (`dungeonsCleared`-Delta); danach im SELBEN Tick Welle 1.
 *  • Tod/Patt: Lauf abgebrochen (zählt nicht), Rest an die Queue-Front, Queue pausiert (wie Kampf).
 *  • Flucht (manueller stopCombat): Eintrag beendet, Queue läuft ohne Pause weiter (wie Kampf).
 *  • Offline == online bit-identisch (derselbe Tick-Pfad, kein RNG in der Queue-Logik).
 *
 * Test-Gelände: die Goblin-Kriegsbande (`goblin_warband`, 5 Wellen inkl. Endboss, Truhe vor dem
 * Boss) — ein L99-Held in Godiron räumt sie in wenigen Sekunden pro Lauf.
 */

const WARBAND = "goblin_warband";
const CRYPT = "crypt_depths";
const WARBAND_DEF = content.dungeons.find((d) => d.id === WARBAND)!;

function setCombatLevel(s: GameState, lvl: number): void {
  for (const id of ["attack", "power", "defence", "ranged", "magic", "warding", "vitality"]) {
    s.skills[id] = { xp: xpForLevel(lvl) };
  }
}

/** Gerüsteter L99-Held (Muster dungeon.test.ts): räumt die Kriegsbande sicher und zügig. */
function champion(seed: number): GameState {
  const s = createTestGame({ name: "Champion", baseAttributes: { str: 10, con: 10 } }, content, seed);
  setCombatLevel(s, 99);
  for (const g of ["godiron_sword", "godiron_fullhelm", "godiron_platebody", "godiron_platelegs", "godiron_kiteshield"]) {
    addItem(s.inventory, content, g, 1);
    equipItem(s, content, g);
  }
  expect(s.character.equipment.mainhand).toBe("godiron_sword"); // wirklich getragen (Sweep3-Guard)
  addItem(s.inventory, content, "cooked_voidray", 1000);
  s.character.food = "cooked_voidray";
  s.dungeonsUnlocked[WARBAND] = true;
  s.dungeonsUnlocked[CRYPT] = true;
  return s;
}

/** Tick für Tick vorrücken, bis `cond` gilt (oder `maxMs` verstrichen sind). */
function advanceUntil(s: GameState, cond: (s: GameState) => boolean, maxMs: number): void {
  let t = 0;
  while (!cond(s) && t < maxMs) {
    advance(s, content, TICK_MS);
    t += TICK_MS;
  }
}

describe("enqueueDungeonRuns: Einreihen + Ablehnung", () => {
  it("reiht bekannte Dungeons ein (endlich + ∞) und STAPELT benachbarte gleiche Dungeons", () => {
    const s = champion(1);
    expect(enqueueDungeonRuns(s, content, WARBAND, 25)).toBe(true);
    expect(enqueueDungeonRuns(s, content, WARBAND, 25)).toBe(true); // benachbart gleich → stapelt
    expect(enqueueDungeonRuns(s, content, CRYPT, 1)).toBe(true); // anderer Dungeon → neuer Eintrag
    expect(enqueueDungeonRuns(s, content, CRYPT, null)).toBe(true); // ∞ stapelt nie
    expect(s.actionQueue).toEqual([
      makeDungeonQueueEntry(WARBAND, 50),
      makeDungeonQueueEntry(CRYPT, 1),
      makeDungeonQueueEntry(CRYPT, null),
    ]);
    // Der Übergangs-Shape: Platzhalter-actionId "" (die Alt-UI blendet den Eintrag aus), kind "dungeon".
    expect(s.actionQueue[0]!.actionId).toBe("");
    expect(s.actionQueue[0]!.kind).toBe("dungeon");
  });

  it("lehnt unbekannte Dungeons und den Paragonturm (keine Wellen) sauber ab — beide Varianten", () => {
    const s = champion(1);
    expect(enqueueDungeonRuns(s, content, "gibt_es_nicht", 5)).toBe(false);
    expect(enqueueDungeonRunsAtFront(s, content, "gibt_es_nicht", 5)).toBe(false);
    expect(content.dungeons.find((d) => d.id === PARAGON_DUNGEON_ID)?.encounters).toEqual([]);
    expect(enqueueDungeonRuns(s, content, PARAGON_DUNGEON_ID, 5)).toBe(false);
    expect(enqueueDungeonRunsAtFront(s, content, PARAGON_DUNGEON_ID, 5)).toBe(false);
    expect(s.actionQueue).toEqual([]);
    expect(s.combat.monsterId).toBeNull(); // nichts angefasst
  });

  it("Gate wird beim Einreihen NICHT geprüft (Vorplanen), beim START aber: gesperrt → Skip mit Grund", () => {
    const s = createGame({ name: "Frisch" }, content, 1); // Kriegsbande hinter chronicle_04 → gesperrt
    expect(enqueueDungeonRuns(s, content, WARBAND, 3)).toBe(true);
    expect(s.actionQueue).toEqual([makeDungeonQueueEntry(WARBAND, 3)]);
    expect(advanceActionQueue(s, content)).toBe(false);
    expect(s.lastQueueSkip).toEqual({ monsterId: "", dungeonId: WARBAND, reason: "dungeon_locked" });
    expect(s.actionQueue).toEqual([]); // konsumiert, nicht hängen geblieben
    expect(s.queueDungeon).toBeNull();
    expect(s.combat.monsterId).toBeNull();
  });

  it("ein unbekannt gewordener Dungeon (Content-Drift) wird beim Start mit Grund übersprungen", () => {
    const s = champion(1);
    s.actionQueue.push(makeDungeonQueueEntry("gibt_es_nicht", 2)); // Alt-Save-Drift simulieren
    enqueueAction(s, content, "cut_normal_tree", 1);
    expect(advanceActionQueue(s, content)).toBe(true); // Skip → nächster Eintrag läuft
    expect(s.lastQueueSkip).toEqual({ monsterId: "", dungeonId: "gibt_es_nicht", reason: "unknown_dungeon" });
    expect(s.activeActionId).toBe("cut_normal_tree");
  });
});

describe("Lauf zählt nach dem Endboss → sofort Welle 1, bis das Ziel erreicht ist", () => {
  it("Ziel 1: exakt ein Clear, dann sauber idle; lastDungeonClear trägt die Abschluss-Belohnung (Erst-Clear doppelt)", () => {
    const s = champion(7);
    expect(enqueueDungeonRuns(s, content, WARBAND, 1)).toBe(true);
    advance(s, content, 10 * 60_000);

    expect(s.stats.deaths).toBe(0);
    expect(s.dungeonsCleared[WARBAND]).toBe(1); // EXAKT eins — kein zweiter Lauf angefangen
    expect(s.combat.monsterId).toBeNull();
    expect(s.combat.dungeonId).toBeNull();
    expect(s.queueDungeon).toBeNull();
    expect(s.actionQueue).toEqual([]);
    expect(s.queuePaused).toBe(false);
    expect(dungeonRunProgress(s)).toBeNull();
    // Clear-Zeremonie-Vertrag (transient): Summary des Abschlusses.
    const clear = s.combat.lastDungeonClear!;
    expect(clear).toBeDefined();
    expect(clear.dungeonId).toBe(WARBAND);
    expect(clear.clearNo).toBe(1);
    expect(clear.firstClear).toBe(true);
    expect(WARBAND_DEF.gold).toBeGreaterThan(0);
    expect(clear.gold).toBe(WARBAND_DEF.gold * 2); // Erst-Clear-Bonus (§5.1.3): Clear-Gold doppelt
    if (WARBAND_DEF.xp > 0) expect(clear.xp).toBeGreaterThan(0);
    expect(Array.isArray(clear.loot)).toBe(true);
  });

  it("Ziel 3: nach jedem Clear steht im SELBEN Tick Welle 1 (Lauf n von 3), exakt 3 Clears, dann idle", () => {
    const s = champion(11);
    enqueueDungeonRuns(s, content, WARBAND, 3);
    advanceUntil(s, (x) => (x.dungeonsCleared[WARBAND] ?? 0) >= 1, 10 * 60_000);
    expect(s.dungeonsCleared[WARBAND]).toBe(1);
    // Im Clear-Tick: der Dungeon läuft bereits wieder ab Welle 1 — frischer Kampfzustand.
    expect(s.combat.dungeonId).toBe(WARBAND);
    expect(s.combat.encounterIndex).toBe(0);
    expect(s.combat.monsterId).toBe(WARBAND_DEF.encounters[0]);
    expect(s.combat.enemyHp).toBe(content.monsters[WARBAND_DEF.encounters[0]!]!.maxHp);
    expect(s.combat.kills).toBe(0);
    expect(s.combat.log).toEqual([]); // startDungeon leert das Log …
    expect(s.combat.lastDungeonClear?.clearNo).toBe(1); // … die Summary überlebt den Neustart
    expect(s.queueDungeon).toEqual({ dungeonId: WARBAND, remaining: 2, completed: 1 });
    expect(dungeonRunProgress(s)).toEqual({ dungeonId: WARBAND, run: 2, target: 3, completed: 1, remaining: 2 });
    expect(s.queuePaused).toBe(false);

    advance(s, content, 20 * 60_000);
    expect(s.stats.deaths).toBe(0);
    expect(s.dungeonsCleared[WARBAND]).toBe(3); // EXAKT drei
    expect(s.combat.monsterId).toBeNull();
    expect(s.combat.dungeonId).toBeNull();
    expect(s.queueDungeon).toBeNull();
    expect(s.actionQueue).toEqual([]);
    // Folge-Clears zahlen das Clear-Gold einfach (kein Erst-Clear-Bonus mehr).
    expect(s.combat.lastDungeonClear).toMatchObject({ dungeonId: WARBAND, clearNo: 3, firstClear: false, gold: WARBAND_DEF.gold });
  });

  it("∞: läuft weiter und weiter, `completed` zählt mit, queueBlockReason meldet die stille Sperre", () => {
    const s = champion(13);
    enqueueDungeonRuns(s, content, WARBAND, null);
    enqueueAction(s, content, "cut_normal_tree", 1); // kommt bei ∞ nie dran
    advance(s, content, 15 * 60_000);

    expect(s.stats.deaths).toBe(0);
    expect(s.dungeonsCleared[WARBAND]).toBeGreaterThanOrEqual(3);
    expect(s.combat.dungeonId).toBe(WARBAND); // läuft noch
    expect(s.queueDungeon?.remaining).toBeNull();
    expect(s.queueDungeon?.completed).toBe(s.dungeonsCleared[WARBAND]);
    expect(dungeonRunProgress(s)).toEqual({
      dungeonId: WARBAND,
      run: s.dungeonsCleared[WARBAND]! + 1,
      target: null,
      completed: s.dungeonsCleared[WARBAND],
      remaining: null,
    });
    expect(queueBlockReason(s, content)).toBe("endless_fight");
    expect(itemCount(s.inventory, "normal_log")).toBe(0);
    expect(s.actionQueue).toEqual([{ kind: "action", actionId: "cut_normal_tree", target: 1 }]);
  });

  it("manueller Dungeon-Lauf (startDungeon ohne Queue) zählt NICHT auf ein Queue-Ziel und meldet keine Sperre", () => {
    const s = champion(15);
    enqueueAction(s, content, "cut_normal_tree", 1);
    expect(startDungeon(s, content, WARBAND)).toBe(true);
    expect(s.queueDungeon).toBeNull();
    expect(dungeonRunProgress(s)).toBeNull();
    expect(queueBlockReason(s, content)).toBeNull(); // endliche Exkursion (unverändert)
    advance(s, content, 10 * 60_000);
    expect(s.dungeonsCleared[WARBAND]).toBe(1); // ein Lauf, KEIN Auto-Neustart
    expect(s.queueDungeon).toBeNull();
    expect(itemCount(s.inventory, "normal_log")).toBeGreaterThanOrEqual(1); // Queue lief danach weiter
  });
});

describe("Ketten mit Kampf- und Aktions-Einträgen", () => {
  it("Dungeon(1) → Kampf(1) → Sammeln(1): alles läuft der Reihe nach, dann idle", () => {
    const s = champion(17);
    enqueueDungeonRuns(s, content, WARBAND, 1);
    enqueueFight(s, content, "chicken", 1);
    enqueueAction(s, content, "cut_normal_tree", 1);
    advance(s, content, 15 * 60_000);

    expect(s.dungeonsCleared[WARBAND]).toBe(1);
    expect(s.monsterKills["chicken"]).toBe(1);
    expect(itemCount(s.inventory, "normal_log")).toBeGreaterThanOrEqual(1);
    expect(s.combat.monsterId).toBeNull();
    expect(s.queueDungeon).toBeNull();
    expect(s.queueFight).toBeNull();
    expect(s.actionQueue).toEqual([]);
    expect(s.activeActionId).toBeNull();
  });

  it("Kampf(1) → Dungeon(2): der Dungeon startet nahtlos nach dem Kill-Ziel und läuft zweimal", () => {
    const s = champion(19);
    enqueueFight(s, content, "chicken", 1);
    enqueueDungeonRuns(s, content, WARBAND, 2);
    advance(s, content, 15 * 60_000);

    expect(s.monsterKills["chicken"]).toBe(1);
    expect(s.dungeonsCleared[WARBAND]).toBe(2);
    expect(s.combat.monsterId).toBeNull();
    expect(s.actionQueue).toEqual([]);
  });
});

describe("Tod / Flucht / Fremd-Unterbrechung", () => {
  /** Frischer L1-Held ohne Essen in der L45-Kriegsbande: stirbt in Welle 1. */
  function doomed(seed: number): GameState {
    const s = createTestGame({ name: "Underdog" }, content, seed);
    s.dungeonsUnlocked[WARBAND] = true;
    s.character.food = null;
    return s;
  }

  it("Tod im Lauf: kein Clear gezählt, Rest-Läufe zurück an die Front, Queue pausiert — Wiederaufnahme manuell", () => {
    const s = doomed(3);
    enqueueDungeonRuns(s, content, WARBAND, 5);
    enqueueAction(s, content, "cut_normal_tree", 1);
    advance(s, content, 5 * 60_000);

    expect(s.stats.deaths).toBe(1); // genau EIN Tod — kein Auto-Neustart des verlorenen Laufs
    expect(s.dungeonsCleared[WARBAND]).toBeUndefined();
    expect(s.combat.monsterId).toBeNull();
    expect(s.combat.dungeonId).toBeNull();
    expect(s.queueDungeon).toBeNull();
    expect(s.queuePaused).toBe(true);
    expect(s.actionQueue).toEqual([
      makeDungeonQueueEntry(WARBAND, 5),
      { kind: "action", actionId: "cut_normal_tree", target: 1 },
    ]);
    expect(itemCount(s.inventory, "normal_log")).toBe(0); // nichts wurde still übersprungen

    // Manuelle Wiederaufnahme startet den Rest sofort neu (Lauf 1 von 5).
    expect(resumeActionQueue(s, content)).toBe(true);
    expect(s.queuePaused).toBe(false);
    expect(s.combat.dungeonId).toBe(WARBAND);
    expect(s.queueDungeon).toEqual({ dungeonId: WARBAND, remaining: 5, completed: 0 });
  });

  it("offline: Tod pausiert ab dort — der Rest der Offline-Zeit verfällt für die Queue", () => {
    const s = doomed(5);
    enqueueDungeonRuns(s, content, WARBAND, 5);
    enqueueAction(s, content, "cut_normal_tree", 1);
    advance(s, content, 30 * 60_000, { offline: true });

    expect(s.stats.deaths).toBe(1);
    expect(s.queuePaused).toBe(true);
    expect(s.actionQueue).toEqual([
      makeDungeonQueueEntry(WARBAND, 5),
      { kind: "action", actionId: "cut_normal_tree", target: 1 },
    ]);
    expect(itemCount(s.inventory, "normal_log")).toBe(0);
  });

  it("Flucht (manueller stopCombat) beendet den Eintrag: Rest verfällt, die Queue läuft OHNE Pause weiter", () => {
    const s = champion(21);
    enqueueDungeonRuns(s, content, WARBAND, 5);
    enqueueAction(s, content, "cut_normal_tree", 1);
    advance(s, content, 3_000);
    expect(s.combat.dungeonId).toBe(WARBAND);
    expect(s.queueDungeon).toEqual({ dungeonId: WARBAND, remaining: 5, completed: 0 });

    stopCombat(s); // Spieler klickt „Fliehen"
    advance(s, content, TICK_MS); // Leerlauf-Tick: Konsum + nächster Eintrag
    expect(s.queueDungeon).toBeNull();
    expect(s.queuePaused).toBe(false);
    expect(s.activeActionId).toBe("cut_normal_tree");
    expect(s.actionQueue).toEqual([]); // kein Dungeon-Rest zurückgestellt (expliziter Stopp)
    advance(s, content, 2 * 60_000);
    expect(itemCount(s.inventory, "normal_log")).toBeGreaterThanOrEqual(1);
    expect(s.dungeonsCleared[WARBAND]).toBeUndefined();
  });

  it("Fremd-Kampf (manueller startCombat) während des Laufs: Rest-Läufe zurück an die Queue-Front", () => {
    const s = champion(23);
    enqueueDungeonRuns(s, content, WARBAND, 5);
    advance(s, content, 3_000);
    expect(startCombat(s, content, "chicken")).toBe(true);
    advance(s, content, TICK_MS);
    expect(s.queueDungeon).toBeNull();
    expect(s.actionQueue[0]).toEqual(makeDungeonQueueEntry(WARBAND, 5));
    expect(s.combat.monsterId).toBe("chicken");
    expect(s.combat.dungeonId).toBeNull();
  });

  it("manueller Aktivitäts-Start (setActiveAction) während des Laufs: Rest-Läufe zurück an die Queue-Front", () => {
    const s = champion(25);
    enqueueDungeonRuns(s, content, WARBAND, 5);
    advance(s, content, 3_000);
    setActiveAction(s, content, "cut_normal_tree");
    expect(s.queueDungeon).toBeNull();
    expect(s.actionQueue[0]).toEqual(makeDungeonQueueEntry(WARBAND, 5));
    expect(s.activeActionId).toBe("cut_normal_tree");
  });
});

describe("Sofort-Start (Betreten mit 1×/25×/50×/∞) + Priorisierung", () => {
  it("enqueueDungeonRunsAtFront startet sofort und stellt den laufenden Queue-Kampf mit Rest zurück", () => {
    const s = champion(29);
    enqueueFight(s, content, "chicken", 10);
    advance(s, content, TICK_MS); // Leerlauf-Tick startet den Kampf
    expect(s.queueFight).toEqual({ monsterId: "chicken", remaining: 10 });

    expect(enqueueDungeonRunsAtFront(s, content, WARBAND, 2)).toBe(true);
    expect(s.combat.dungeonId).toBe(WARBAND);
    expect(s.combat.encounterIndex).toBe(0);
    expect(s.queueDungeon).toEqual({ dungeonId: WARBAND, remaining: 2, completed: 0 });
    expect(s.queueFight).toBeNull();
    expect(s.actionQueue).toEqual([makeFightQueueEntry("chicken", 10)]);

    // Nach den zwei Läufen geht es mit den 10 Hühnern weiter.
    advance(s, content, 15 * 60_000);
    expect(s.dungeonsCleared[WARBAND]).toBe(2);
    expect(s.monsterKills["chicken"]).toBe(10);
    expect(s.actionQueue).toEqual([]);
  });

  it("prioritizeQueueEntry: derselbe bereits laufende Dungeon ist ein No-op (kein Neustart des Laufs)", () => {
    const s = champion(31);
    enqueueDungeonRuns(s, content, WARBAND, 3);
    advance(s, content, 3_000);
    const killsBefore = s.combat.kills;
    s.actionQueue.push(makeDungeonQueueEntry(WARBAND, 2));
    expect(prioritizeQueueEntry(s, content, 0)).toBe(false);
    expect(s.actionQueue).toEqual([makeDungeonQueueEntry(WARBAND, 2)]); // unangetastet
    expect(s.combat.kills).toBe(killsBefore); // Lauf nicht neu gestartet
    expect(s.queueDungeon).toEqual({ dungeonId: WARBAND, remaining: 3, completed: 0 });
  });

  it("Regression: startDungeon stellt eine laufende ENDLICHE Aktion mit Rest an die Queue-Front (Wurzel-Regel wie startCombat)", () => {
    const s = champion(33);
    setActiveAction(s, content, "cut_normal_tree", 5);
    expect(s.actionTarget).toBe(5);
    expect(startDungeon(s, content, WARBAND)).toBe(true);
    expect(s.actionQueue[0]).toEqual({ kind: "action", actionId: "cut_normal_tree", target: 5 });
    expect(s.activeActionId).toBeNull();
    expect(s.actionTarget).toBeNull(); // Invariante activeActionId === null ⇒ actionTarget === null
  });
});

describe("Determinismus-GESETZ: Dungeon-Läufe offline == online (bit-identisch)", () => {
  it("Dungeon(2) → Sammeln(3) → Kampf(2): online getickt == offline in einem Rutsch", () => {
    const build = () => {
      const s = champion(12345);
      // Die L99-Meisterringe des Helden verleiht `checkMasteryCapes` einmal pro advance am
      // Fenster-ENDE (online: nach dem 1. Tick, offline: nach dem ganzen Batch) — das würde nur
      // die Inventar-SLOT-REIHENFOLGE Ring↔Loot verschieben, ein queue-fremdes Artefakt. Ein
      // Leerlauf-Tick vorab verleiht sie in beiden Läufen an derselben Stelle.
      advance(s, content, TICK_MS);
      enqueueDungeonRuns(s, content, WARBAND, 2);
      enqueueAction(s, content, "cut_normal_tree", 3);
      enqueueFight(s, content, "chicken", 2);
      return s;
    };
    const online = build();
    const offline = build();
    const totalMs = 12 * 60 * 1000;

    for (let t = 0; t < totalMs; t += TICK_MS) advance(online, content, TICK_MS); // Tick für Tick
    advance(offline, content, totalMs, { offline: true }); // ein Rutsch (Offline-Catch-up)

    expect(offline.dungeonsCleared[WARBAND]).toBe(2);
    expect(offline.monsterKills["chicken"]).toBe(2);
    // Bekannte, queue-FREMDE Artefakte angleichen (exakt das Muster von fight-queue.test.ts):
    // activePlayMs zählt offline nicht; createdAt stempelt Date.now(); Achievements/Quests werden
    // online inkrementell/offline im Batch freigeschaltet; die Elite-Felder ticken nur online.
    online.activePlayMs = offline.activePlayMs;
    online.character.createdAt = offline.character.createdAt;
    online.eliteZones = offline.eliteZones;
    online.eliteRng = offline.eliteRng;
    online.eliteSpawnSeq = offline.eliteSpawnSeq;
    online.lastEliteSpawn = offline.lastEliteSpawn;
    online.eliteCodex = offline.eliteCodex;
    online.achievements.sort();
    offline.achievements.sort();
    online.quests.completed.sort();
    offline.quests.completed.sort();
    online.quests.claimed.sort();
    offline.quests.claimed.sort();
    // Kern: RNG, Kills, Clears, Loot, Skills, Queue-Zustand, lastDungeonClear — bit-identisch.
    expect(offline).toEqual(online);
  });
});
