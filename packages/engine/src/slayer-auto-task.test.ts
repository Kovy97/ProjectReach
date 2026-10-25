import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { ContentDB, DungeonDef, GameState } from "@hearthforge/shared";
import { ELITE_WINDOW_MS } from "@hearthforge/shared";
import { createGame } from "./state";
import { xpForLevel } from "./leveling";
import { addItem } from "./inventory";
import { computeStats } from "./character";
import { combatStep, startCombat } from "./combat";
import { advance } from "./tick";
import { enqueueAction, enqueueFight } from "./actions";
import { startDungeon } from "./dungeon";
import { startEliteCombat } from "./elites";
import { grantAllDungeons } from "./test-helpers";
import { applySlayerAutoSwitch, assignTask, recordKillForSlayer, setSlayerAutoTask } from "./slayer";

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
  s.character.equipment.mainhand = "copper_sword";
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

  it("Queue-Kampf: Rest = neue Auftragsgröße, altes Monster nicht zurück in die Queue, andere Einträge bleiben", () => {
    const s = hunter(4);
    setSlayerAutoTask(s, true);
    assignTask(s, content, MASTER);
    const old = s.slayerTask!.monsterId;
    expect(enqueueFight(s, content, old, 25)).toBe(true);
    expect(enqueueAction(s, content, ACTION, 10)).toBe(true);
    advance(s, content, 100); // Leerlauf startet den Queue-Kampf
    expect(s.queueFight).toEqual({ monsterId: old, remaining: 25 });
    s.slayerTask!.progress = s.slayerTask!.required - 1;
    finishTask(s);
    const next = s.slayerTask!;
    expect(s.queueFight).toEqual({ monsterId: next.monsterId, remaining: next.required });
    expect(s.combat.monsterId).toBe(next.monsterId);
    expect(s.actionQueue).toEqual([{ kind: "action", actionId: ACTION, target: 10 }]);

    // Schalter aus: der neue Auftrag läuft genau bis zu seinem Ende, dann geht die Queue weiter.
    setSlayerAutoTask(s, false);
    finishTask(s);
    advance(s, content, 100);
    expect(s.slayerTask).toBeNull();
    expect(s.queueFight).toBeNull();
    expect(s.combat.monsterId).toBeNull();
    expect(s.activeActionId).toBe(ACTION);
    expect(s.actionQueue).toEqual([]);
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
    // Gemessen (Seed 21): 147 Aufträge, 819 Punkte mit Auto; ohne Auto 1 Auftrag, 4 Punkte. Schwellen bewusst tolerant.
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
