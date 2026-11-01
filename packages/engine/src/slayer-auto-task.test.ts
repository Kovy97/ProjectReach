import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { ContentDB, DungeonDef, GameState } from "@hearthforge/shared";
import { ELITE_WINDOW_MS, makeFightQueueEntry } from "@hearthforge/shared"; // claude:2026-10-31T12:30:41+01:00 — + makeFightQueueEntry (1.4.2)
import { createGame } from "./state";
import { xpForLevel } from "./leveling";
import { addItem } from "./inventory";
import { computeStats } from "./character";
import { combatStep, startCombat } from "./combat";
import { advance } from "./tick";
import { enqueueAction, enqueueFight, enqueueFightAtFront, setActiveAction } from "./actions"; // claude:2026-10-31T13:58:31+01:00 — + Sofort kämpfen (D2)
import { startDungeon } from "./dungeon";
import { startEliteCombat } from "./elites";
import { grantAllDungeons } from "./test-helpers";
import { applySlayerAutoSwitch, assignTask, queueSlayerAutoTask, recordKillForSlayer, setSlayerAutoTask } from "./slayer"; // claude:2026-10-31T12:30:41+01:00 — + queueSlayerAutoTask

/**
 * claude:2026-10-25T10:32:00+01:00 — 1.4.1 S1 „Aufträge automatisch fortsetzen“ (Chef-Freigabe 25.10.2026).
 * `slayerAutoTask` an ⇒ beim Abschluss vergibt die Engine sofort den nächsten Auftrag beim selben Meister (assignTask,
 * state.rng); ein normaler Zonen-/Turmkampf gegen das alte Auftragsmonster wechselt auf das neue, ein Queue-Kampf bekommt
 * die neue Auftragsgröße als Rest. Dungeon/Raid/Champion/Paragon wechseln nie. Offline läuft derselbe Tick-Pfad.
 *
 * Fixture: Kampflevel 30 (Attribute 80, Kupferschwert, Auto-Essen) OHNE Zonen-Freigaben ⇒ der Welt-Pool ist die Weide (Eber, Imp, Ziege, Stier; Fenster nach unten
 * gestreckt), der Turm hat bei Slayer 1 nichts auf Niveau ⇒ nur Welt-Aufträge, kein Todesrisiko, kurze Aufträge.
 */
const MASTER = "brenna_ashwick";
const ACTION = "cut_normal_tree";

function hunter(seed: number): GameState {
  const s = createGame({ name: "Auto", baseAttributes: { str: 80, dex: 80, con: 80 }, createdAt: 1 }, content, seed);
  for (const id of ["attack", "power", "defence", "vitality", "ranged", "magic", "warding"]) s.skills[id] = { xp: xpForLevel(30) };
  // claude:2026-10-25T15:49:00+01:00 — 1.4.1 Slayer B: Turm-Etagen 1–5 tragen jetzt Welt-Werte plus Zuschlag. Der nackte Held mit Kupferschwert
  // starb in der 8-h-Nacht einmal auf Etage 3 (Tod beendet den Kampf). Der Test prüft die Auftragskette, nicht das Überleben,
  // darum trägt der Kampflevel-30-Held jetzt die passende Stahl-Stufe (Anforderung 20).
  s.character.equipment.mainhand = "steel_sword";
  s.character.equipment.offhand = "steel_kiteshield";
  s.character.equipment.helmet = "steel_fullhelm";
  s.character.equipment.body = "steel_platebody";
  s.character.equipment.legs = "steel_platelegs";
  s.character.equipment.gloves = "steel_gauntlets";
  s.character.equipment.boots = "steel_sabatons";
  addItem(s.inventory, content, "cooked_trout", 2000);
  s.character.food = "cooked_trout";
  s.character.autoEatTier = 3;
  s.character.hp = computeStats(s, content).maxHp;
  return s;
}

/** Läuft Tick für Tick, bis der laufende Auftrag abgeschlossen ist (Abschluss-Zähler steigt). */
function finishTask(s: GameState): void {
  const done0 = s.slayerTasksCompleted;
  let guard = 0;
  while (s.slayerTasksCompleted === done0 && guard++ < 200_000) advance(s, content, 100);
  expect(s.slayerTasksCompleted, "Auftrag in der Zeitschranke abgeschlossen").toBe(done0 + 1);
}

describe("S1 Schalter und Neuvergabe", () => {
  it("setSlayerAutoTask setzt das Feld; Standard aus", () => {
    const s = hunter(1);
    expect(s.slayerAutoTask).toBe(false);
    setSlayerAutoTask(s, true);
    expect(s.slayerAutoTask).toBe(true);
    setSlayerAutoTask(s, false);
    expect(s.slayerAutoTask).toBe(false);
  });

  it("aus: Abschluss leert den Auftrag ohne RNG-Zug; an: sofort der nächste beim selben Meister", () => {
    const s = hunter(2);
    expect(assignTask(s, content, MASTER)).not.toBeNull();
    const t1 = s.slayerTask!;
    t1.progress = t1.required - 1;
    const rng = { ...s.rng };
    expect(recordKillForSlayer(s, content, t1.monsterId)).toBe(true);
    expect(s.slayerTask).toBeNull();
    expect(s.rng).toEqual(rng); // aus ⇒ bit-identisch zum Alt-Verhalten

    setSlayerAutoTask(s, true);
    assignTask(s, content, MASTER);
    const t2 = s.slayerTask!;
    t2.progress = t2.required - 1;
    const points0 = s.slayerPoints;
    expect(recordKillForSlayer(s, content, t2.monsterId)).toBe(true);
    expect(s.slayerPoints).toBeGreaterThan(points0);
    expect(s.slayerTasksCompleted).toBe(2);
    expect(s.slayerTask).not.toBeNull();
    expect(s.slayerTask!.masterId).toBe(MASTER);
    expect(s.slayerTask!.progress).toBe(0);
  });
});

describe("S1 Kampfwechsel", () => {
  it("manueller Kampf: nach jedem Abschluss steht das neue Auftragsmonster voll da, lastKill meldet das alte", () => {
    const s = hunter(3);
    setSlayerAutoTask(s, true);
    assignTask(s, content, MASTER);
    expect(startCombat(s, content, s.slayerTask!.monsterId)).toBe(true);
    let switches = 0;
    for (let i = 0; i < 8; i++) {
      const old = s.slayerTask!.monsterId;
      s.slayerTask!.progress = s.slayerTask!.required - 1; // der nächste Kill schließt ab
      finishTask(s);
      const next = s.slayerTask!;
      expect(next.progress).toBe(0);
      expect(s.combat.monsterId).toBe(next.monsterId);
      expect(s.combat.enemyHp).toBe(content.monsters[next.monsterId]!.maxHp);
      expect(s.combat.lastKill?.monsterId).toBe(old);
      if (next.monsterId !== old) switches++;
    }
    expect(switches, "mindestens ein echter Monsterwechsel").toBeGreaterThan(0);
  });

  // claude:2026-10-25T11:42:00+01:00 — Review 1.4.1: Queue-Planung geht vor; ∞ bleibt ∞.
  it("endlicher Queue-Kampf ohne weitere Einträge: Rest = neue Auftragsgröße, altes Monster nicht zurück", () => {
    const s = hunter(4);
    setSlayerAutoTask(s, true);
    assignTask(s, content, MASTER);
    const old = s.slayerTask!.monsterId;
    expect(enqueueFight(s, content, old, 25)).toBe(true);
    advance(s, content, 100); // Leerlauf startet den Queue-Kampf
    expect(s.queueFight).toEqual({ monsterId: old, remaining: 25 });
    s.slayerTask!.progress = s.slayerTask!.required - 1;
    finishTask(s);
    const next = s.slayerTask!;
    expect(s.queueFight).toEqual({ monsterId: next.monsterId, remaining: next.required });
    expect(s.combat.monsterId).toBe(next.monsterId);
    expect(s.actionQueue).toEqual([]);
  });

  // claude:2026-10-31T12:30:41+01:00 — 1.4.2 (Spieler-Feedback): der neue Auftrag wartet jetzt am Queue-Ende statt liegen zu bleiben.
  it("endlicher Queue-Kampf mit wartenden Einträgen: kein Wechsel, Eintrag läuft zu Ende, neuer Auftrag am Queue-Ende", () => {
    const s = hunter(4);
    setSlayerAutoTask(s, true);
    assignTask(s, content, MASTER);
    const old = s.slayerTask!.monsterId;
    expect(enqueueFight(s, content, old, 25)).toBe(true);
    expect(enqueueAction(s, content, ACTION, 10)).toBe(true);
    advance(s, content, 100);
    expect(s.queueFight).toEqual({ monsterId: old, remaining: 25 });
    s.slayerTask!.progress = s.slayerTask!.required - 1;
    finishTask(s);
    expect(s.slayerTask).not.toBeNull(); // neuer Auftrag ist vergeben
    expect(s.queueFight?.monsterId).toBe(old); // aber der geplante Kampf läuft weiter
    expect(s.queueFight!.remaining).toBe(24);
    expect(s.combat.monsterId).toBe(old);
    const next = s.slayerTask!;
    expect(s.actionQueue).toEqual([
      { kind: "action", actionId: ACTION, target: 10 },
      makeFightQueueEntry(next.monsterId, next.required), // neuer Auftrag hinter der Planung des Spielers
    ]);
    let guard = 0;
    while (s.activeActionId !== ACTION && guard++ < 200_000) advance(s, content, 100);
    expect(s.activeActionId).toBe(ACTION); // Holzfällen startet nach den restlichen Kills
    expect(s.queueFight).toBeNull();
    expect(s.actionQueue).toEqual([makeFightQueueEntry(next.monsterId, next.required)]);
    guard = 0;
    while (s.queueFight === null && guard++ < 200_000) advance(s, content, 100);
    expect(s.queueFight).toEqual({ monsterId: next.monsterId, remaining: next.required }); // danach läuft der Auftrag
    expect(s.combat.monsterId).toBe(next.monsterId);
  });

  it("kein doppelter Eintrag: steht das neue Ziel schon als Kampf in der Queue, wird nichts angehängt", () => {
    const s = hunter(5);
    setSlayerAutoTask(s, true);
    expect(startCombat(s, content, "chicken")).toBe(true);
    s.queueFight = { monsterId: "chicken", remaining: 10 };
    s.actionQueue = [makeFightQueueEntry("cow", 5)];
    s.slayerTask = { masterId: MASTER, monsterId: "cow", isTower: false, required: 20, progress: 0, xpReward: 0, pointReward: 5 };
    expect(applySlayerAutoSwitch(s, content, "chicken")).toBeNull();
    expect(s.actionQueue).toEqual([makeFightQueueEntry("cow", 5)]);
    expect(queueSlayerAutoTask(s, content)).toBe(false);
  });

  it("queueSlayerAutoTask: nur mit Schalter, frischem Auftrag und bekämpfbarem Ziel; queuePaused bleibt unberührt", () => {
    const s = hunter(5);
    s.slayerTask = { masterId: MASTER, monsterId: "cow", isTower: false, required: 20, progress: 0, xpReward: 0, pointReward: 5 };
    expect(queueSlayerAutoTask(s, content)).toBe(false); // Schalter aus
    setSlayerAutoTask(s, true);
    s.slayerTask.progress = 3;
    expect(queueSlayerAutoTask(s, content)).toBe(false); // kein frisch vergebener Auftrag
    s.slayerTask = { masterId: MASTER, monsterId: "goblin", isTower: false, required: 20, progress: 0, xpReward: 0, pointReward: 5 };
    expect(queueSlayerAutoTask(s, content)).toBe(false); // Gebiet gesperrt
    expect(s.actionQueue).toEqual([]);
    s.slayerTask = { masterId: MASTER, monsterId: "cow", isTower: false, required: 20, progress: 0, xpReward: 0, pointReward: 5 };
    s.queuePaused = true;
    expect(queueSlayerAutoTask(s, content)).toBe(true);
    expect(s.actionQueue).toEqual([makeFightQueueEntry("cow", 20)]);
    expect(s.queuePaused).toBe(true); // keine Spieler-Eingabe, also kein Wiederaufnahme-Signal
  });

  // claude:2026-10-31T13:58:31+01:00 — Befund D2: hinter einem Endlos-Eintrag liefe der Auftrag nie, er gehört davor.
  it("D2: queueSlayerAutoTask stellt den Auftrag vor den ersten Endlos-Eintrag, endliche Einträge davor bleiben vorn", () => {
    const s = hunter(5);
    setSlayerAutoTask(s, true);
    s.slayerTask = { masterId: MASTER, monsterId: "cow", isTower: false, required: 20, progress: 0, xpReward: 0, pointReward: 5 };
    const finite = { kind: "action" as const, actionId: ACTION, target: 10 };
    const endless = { kind: "action" as const, actionId: ACTION, target: null };
    s.actionQueue = [finite, endless, makeFightQueueEntry("cow", 5)]; // der Kuh-Kampf hinter ∞ kommt nie dran
    expect(queueSlayerAutoTask(s, content)).toBe(true);
    expect(s.actionQueue).toEqual([finite, makeFightQueueEntry("cow", 20), endless, makeFightQueueEntry("cow", 5)]);
    // Ein ∞-Kampf ist ebenso endlos.
    s.actionQueue = [makeFightQueueEntry("boar", null)];
    expect(queueSlayerAutoTask(s, content)).toBe(true);
    expect(s.actionQueue).toEqual([makeFightQueueEntry("cow", 20), makeFightQueueEntry("boar", null)]);
    // „Alles verarbeiten“ (∞ MIT Material) endet von selbst: der Auftrag kommt danach.
    const craftAll = Object.values(content.actions).find((a) => (a.inputs?.length ?? 0) > 0)!;
    const craftEntry = { kind: "action" as const, actionId: craftAll.id, target: null };
    s.actionQueue = [craftEntry];
    expect(queueSlayerAutoTask(s, content)).toBe(true);
    expect(s.actionQueue).toEqual([craftEntry, makeFightQueueEntry("cow", 20)]);
  });

  it("D2: „Sofort kämpfen“ parkt ∞-Holzfällen an der Front; der automatisch vergebene Auftrag läuft trotzdem als Nächstes", () => {
    const s = hunter(9);
    setSlayerAutoTask(s, true);
    assignTask(s, content, MASTER);
    const old = s.slayerTask!.monsterId;
    setActiveAction(s, content, ACTION, null);
    s.slayerTask!.progress = s.slayerTask!.required - 1;
    expect(enqueueFightAtFront(s, content, old, 1)).toBe(true);
    expect(s.actionQueue).toEqual([{ kind: "action", actionId: ACTION, target: null }]); // ∞ geparkt
    finishTask(s);
    const next = s.slayerTask!;
    let guard = 0;
    while (s.queueFight?.monsterId !== next.monsterId && guard++ < 2000) advance(s, content, 100);
    expect(s.queueFight).toEqual({ monsterId: next.monsterId, remaining: next.required }); // der neue Auftrag läuft
    expect(s.actionQueue).toEqual([{ kind: "action", actionId: ACTION, target: null }]); // ∞ wartet dahinter
    expect(s.activeActionId).toBeNull();
  });

  it("∞-Queue-Kampf: Wechsel aufs neue Ziel, bleibt ∞", () => {
    const s = hunter(4);
    setSlayerAutoTask(s, true);
    assignTask(s, content, MASTER);
    const old = s.slayerTask!.monsterId;
    expect(enqueueFight(s, content, old, null)).toBe(true);
    expect(enqueueAction(s, content, ACTION, 10)).toBe(true);
    advance(s, content, 100);
    s.slayerTask!.progress = s.slayerTask!.required - 1;
    finishTask(s);
    const next = s.slayerTask!;
    expect(s.queueFight).toEqual({ monsterId: next.monsterId, remaining: null });
    expect(s.combat.monsterId).toBe(next.monsterId);
    expect(s.actionQueue).toEqual([{ kind: "action", actionId: ACTION, target: 10 }]);
  });

  it("nicht bekämpfbares neues Ziel: Auftrag bleibt vergeben, kein Wechsel, Queue unverändert", () => {
    const s = hunter(5);
    setSlayerAutoTask(s, true);
    expect(startCombat(s, content, "chicken")).toBe(true);
    s.queueFight = { monsterId: "chicken", remaining: 10 };
    // goblin lebt in den Grenzlanden (Kapitel 3), ohne Freigabe hart gesperrt.
    s.slayerTask = { masterId: MASTER, monsterId: "goblin", isTower: false, required: 20, progress: 0, xpReward: 0, pointReward: 5 };
    expect(applySlayerAutoSwitch(s, content, "chicken")).toBeNull();
    expect(s.queueFight).toEqual({ monsterId: "chicken", remaining: 10 });
    expect(s.slayerTask!.monsterId).toBe("goblin");
  });

  it("defensiv: Dungeon-, Champion- und Paragon-Kampfzustand wechseln nie; Kampf gegen ein fremdes Monster auch nicht", () => {
    const s = hunter(6);
    setSlayerAutoTask(s, true);
    expect(startCombat(s, content, "chicken")).toBe(true);
    s.slayerTask = { masterId: MASTER, monsterId: "cow", isTower: false, required: 20, progress: 0, xpReward: 0, pointReward: 5 };
    expect(applySlayerAutoSwitch(s, content, "boar")).toBeNull(); // Kampf galt nicht dem alten Auftragsmonster
    for (const patch of [{ dungeonId: "x" }, { paragonFloor: 3 }, { eliteVariantId: "y" }]) {
      const before = { ...s.combat };
      Object.assign(s.combat, patch);
      expect(applySlayerAutoSwitch(s, content, "chicken")).toBeNull();
      s.combat = before;
    }
    expect(applySlayerAutoSwitch(s, content, "chicken")?.id).toBe("cow");
  });

  it("Dungeon: der Abschluss vergibt nur den neuen Auftrag, der Lauf bleibt bei seiner nächsten Welle", () => {
    const dungeon: DungeonDef = {
      id: "test_auto_dungeon",
      name: { en: "Test", de: "Test" },
      requiredLevel: 1,
      encounters: ["chicken", "chicken", "cow"],
      loot: [],
      xp: 0,
      gold: 0,
    };
    const c: ContentDB = { ...content, dungeons: [...content.dungeons, dungeon] };
    const s = grantAllDungeons(hunter(7), c);
    setSlayerAutoTask(s, true);
    s.slayerTask = { masterId: MASTER, monsterId: "chicken", isTower: false, required: 1, progress: 0, xpReward: 0, pointReward: 5 };
    expect(startDungeon(s, c, dungeon.id)).toBe(true);
    s.combat.enemyHp = 0.5;
    let guard = 0;
    while (s.slayerTasksCompleted === 0 && guard++ < 2000) combatStep(s, c);
    expect(s.slayerTasksCompleted).toBe(1);
    expect(s.slayerTask).not.toBeNull();
    expect(s.slayerTask!.progress).toBe(0);
    expect(s.combat.dungeonId).toBe(dungeon.id);
    expect(s.combat.encounterIndex).toBe(1);
    expect(s.combat.monsterId).toBe("chicken");
    // claude:2026-10-31T12:30:41+01:00 — 1.4.2: der neue Auftrag wartet am Queue-Ende, bis der Lauf vorbei ist.
    expect(s.actionQueue).toEqual([makeFightQueueEntry(s.slayerTask!.monsterId, s.slayerTask!.required)]);
  });

  it("Champion: Abschluss über einen Elite-Kill vergibt den neuen Auftrag, der Kampf endet wie immer", () => {
    const variant = {
      id: "test_auto_champion",
      zone: "pastures",
      baseMonsterId: "chicken",
      name: { en: "Test Champion" },
      statMults: { hp: 1, damage: 1 },
      uniqueItemId: "rusty_sword",
      uniqueDropChance: 0,
      uniqueSuffixChance: 0,
    };
    const c: ContentDB = { ...content, elites: { [variant.id]: variant } };
    const s = hunter(8);
    setSlayerAutoTask(s, true);
    s.slayerTask = { masterId: MASTER, monsterId: "chicken", isTower: false, required: 1, progress: 0, xpReward: 0, pointReward: 5 };
    s.eliteZones.pastures = { variantId: variant.id, remainingMs: ELITE_WINDOW_MS };
    expect(startEliteCombat(s, c, "pastures")).toBe(true);
    s.combat.enemyHp = 0.5;
    let guard = 0;
    while (s.combat.monsterId !== null && guard++ < 2000) combatStep(s, c);
    expect(s.slayerTasksCompleted).toBe(1);
    expect(s.slayerTask).not.toBeNull();
    expect(s.slayerTask!.progress).toBe(0);
    expect(s.combat.monsterId).toBeNull();
    expect(s.actionQueue).toEqual([makeFightQueueEntry(s.slayerTask!.monsterId, s.slayerTask!.required)]); // claude:2026-10-31T12:30:41+01:00 — 1.4.2
  });
});

describe("S1 offline (derselbe Tick-Pfad)", () => {
  /** Queue-Kampf ∞ gegen das erste Auftragsmonster plus eine Aktion dahinter, dann `hours` Offline-advance. */
  function offline(auto: boolean, seed: number, hours: number): GameState {
    const s = hunter(seed);
    setSlayerAutoTask(s, auto);
    assignTask(s, content, MASTER);
    enqueueFight(s, content, s.slayerTask!.monsterId, null);
    enqueueAction(s, content, ACTION, 5);
    advance(s, content, 100);
    expect(s.combat.monsterId).not.toBeNull();
    advance(s, content, hours * 3_600_000, { offline: true });
    return s;
  }

  it("8 h offline: mit Auto mehrere Aufträge samt Punkten, ohne Auto höchstens einer", () => {
    const on = offline(true, 21, 8);
    // Gemessen (Seed 21, vor 1.4.1 B mit Kupferschwert): 147 Aufträge, 819 Punkte mit Auto; ohne Auto 1 Auftrag, 4 Punkte. Schwellen bewusst tolerant.
    expect(on.slayerTasksCompleted).toBeGreaterThanOrEqual(20);
    expect(on.slayerPoints).toBeGreaterThanOrEqual(20 * 4);
    expect(on.stats.deaths).toBe(0);
    expect(on.slayerTask).not.toBeNull();
    expect(on.combat.monsterId).toBe(on.slayerTask!.monsterId); // kämpft immer am aktuellen Auftrag
    expect(on.actionQueue).toEqual([{ kind: "action", actionId: ACTION, target: 5 }]); // andere Einträge bleiben

    const off = offline(false, 21, 8);
    expect(off.slayerTasksCompleted).toBeLessThanOrEqual(1);
    expect(off.slayerTask).toBeNull();
    expect(on.slayerPoints).toBeGreaterThan(off.slayerPoints);
  }, 300_000);

  it("Determinismus: gleiche Seeds ergeben dasselbe Ergebnis", () => {
    const a = offline(true, 33, 2);
    const b = offline(true, 33, 2);
    expect(a.slayerTasksCompleted).toBeGreaterThan(1);
    expect(b).toEqual(a);
  }, 300_000);
});
