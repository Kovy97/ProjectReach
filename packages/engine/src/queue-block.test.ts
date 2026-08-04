import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { makeFightQueueEntry } from "@hearthforge/shared";
import { createGame } from "./state";
import {
  enqueueAction,
  enqueueFight,
  prioritizeQueueEntry,
  queueBlockReason,
  setActiveAction,
} from "./actions";
import { startCombat, stopCombat } from "./combat";
import { advance } from "./tick";
import { addItem } from "./inventory";
import { xpForLevel } from "./leveling";

/**
 * TASK #369 — „Die stille Endlos-Sperre" (Spielerfalle aus dem 0.3.0-Bot-Sweep).
 *
 * BEFUND: läuft eine Aktivität OHNE Ziel (∞-Preset), rückt die Warteschlange nie vor —
 * `advanceActionQueue` wird nur aufgerufen, wenn die laufende Aktivität endet. Das ist die
 * KORREKTE Semantik von ∞ („mach das für immer"), aber sie war für den Spieler komplett
 * unsichtbar: eingereihte Einträge blieben wortlos liegen, ohne einen einzigen Hinweis.
 *
 * ENTSCHEID (Variante A, Chef-Vorschlag): die Engine-Semantik bleibt UNANGETASTET (kein neuer
 * State, kein SAVE-Bump, kein RNG, offline == online bit-identisch) — stattdessen macht die
 * reine Ableitung `queueBlockReason(state, content)` den Zustand maschinenlesbar, damit die UI
 * ihn benennen kann. Auflösung mit EINEM Klick über den bestehenden Prioritäts-Pfad (#326/#327).
 *
 * Diese Datei ist der Wächter für beide Hälften: (1) die Sperre selbst bleibt reproduzierbar
 * (sonst hat jemand die ∞-Semantik heimlich geändert), (2) sie wird korrekt GEMELDET, und
 * (3) der Ein-Klick-Ausweg funktioniert.
 */

/** Kampfstarker Held (Muster fight-queue.test.ts) — Weiden sind ungegated, `chicken` immer wählbar. */
function fighter(seed = 1) {
  return createGame({ name: "Jäger", baseAttributes: { str: 6, con: 80 } }, content, seed);
}

/** Held mit Schmieden 5 + Material für `smelt_bronze` (Verarbeitung MIT `inputs`). */
function smith(oreQty: number) {
  const s = fighter(2);
  s.skills.smithing = { xp: xpForLevel(5) };
  addItem(s.inventory, content, "copper_ore", oreQty);
  addItem(s.inventory, content, "tin_ore", oreQty);
  return s;
}

describe("Task #369 — die Endlos-Sperre existiert (dokumentierte ∞-Semantik)", () => {
  it("∞-Aktion blockiert eine eingereihte Kampf-Queue dauerhaft (Sweep-Repro, 60 s)", () => {
    const s = fighter();
    setActiveAction(s, content, "cut_normal_tree", null); // ∞ — kein Mengen-Ziel
    expect(enqueueFight(s, content, "chicken", 5)).toBe(true);

    advance(s, content, 60_000);

    // Unverändert BLOCKIERT — genau der gemessene Sweep-Befund, jetzt als bewusster Vertrag.
    expect(s.activeActionId).toBe("cut_normal_tree");
    expect(s.combat.monsterId).toBeNull();
    expect(s.actionQueue).toEqual([makeFightQueueEntry("chicken", 5)]);
    expect(s.queuePaused).toBe(false); // NICHT pausiert — genau darum war es so still
  });

  it("∞-Kampf blockiert eine eingereihte Aktion genauso", () => {
    const s = fighter();
    expect(enqueueFight(s, content, "chicken", null)).toBe(true); // ∞-Kampf
    advance(s, content, 1_000); // Queue-Kampf läuft an
    expect(s.queueFight).toEqual({ monsterId: "chicken", remaining: null });
    expect(enqueueAction(s, content, "cut_normal_tree", 3)).toBe(true);

    advance(s, content, 60_000);

    expect(s.combat.monsterId).toBe("chicken");
    expect(s.activeActionId).toBeNull();
    expect(s.actionQueue).toEqual([{ kind: "action", actionId: "cut_normal_tree", target: 3 }]);
  });
});

describe("Task #369 — queueBlockReason meldet die Sperre (reine Ableitung)", () => {
  it("∞-Sammelaktion (ohne inputs) ⇒ \"endless_action\"", () => {
    const s = fighter();
    setActiveAction(s, content, "cut_normal_tree", null);
    enqueueFight(s, content, "chicken", 5);
    expect(queueBlockReason(s, content)).toBe("endless_action");
  });

  it("∞-Verarbeitung (mit inputs) ⇒ \"action_until_materials\" — kein falscher „für immer\"-Alarm", () => {
    const s = smith(20);
    setActiveAction(s, content, "smelt_bronze", null);
    enqueueAction(s, content, "cut_normal_tree", 3);
    expect(queueBlockReason(s, content)).toBe("action_until_materials");
  });

  it("∞-Kampf ⇒ \"endless_fight\"; ein MANUELLER Kampf (ohne Queue-Ziel) ebenso", () => {
    const queued = fighter();
    enqueueFight(queued, content, "chicken", null);
    advance(queued, content, 1_000);
    enqueueAction(queued, content, "cut_normal_tree", 3);
    expect(queueBlockReason(queued, content)).toBe("endless_fight");

    const manual = fighter();
    enqueueAction(manual, content, "cut_normal_tree", 3);
    expect(startCombat(manual, content, "chicken")).toBe(true);
    expect(manual.queueFight).toBeNull(); // manueller Kampf, kein Queue-Eintrag dahinter
    expect(queueBlockReason(manual, content)).toBe("endless_fight");
  });

  it("Tod-/Patt-Pause hat Vorrang ⇒ \"paused\" (die UI zeigt dafür ihren eigenen Block)", () => {
    const s = fighter();
    setActiveAction(s, content, "cut_normal_tree", null);
    enqueueFight(s, content, "chicken", 5);
    s.queuePaused = true;
    expect(queueBlockReason(s, content)).toBe("paused");
  });

  it("KEINE Sperre: leere Queue, endliches Ziel, Leerlauf, endlicher Queue-Kampf, Dungeon-Lauf", () => {
    const empty = fighter();
    setActiveAction(empty, content, "cut_normal_tree", null);
    expect(queueBlockReason(empty, content)).toBeNull(); // nichts wartet

    const finite = fighter();
    setActiveAction(finite, content, "cut_normal_tree", 10); // läuft aus
    enqueueFight(finite, content, "chicken", 5);
    expect(queueBlockReason(finite, content)).toBeNull();

    const idle = fighter();
    enqueueFight(idle, content, "chicken", 5); // nichts läuft → der nächste Tick startet ihn
    expect(queueBlockReason(idle, content)).toBeNull();

    const finiteFight = fighter();
    enqueueFight(finiteFight, content, "chicken", 5);
    advance(finiteFight, content, 1_000);
    enqueueAction(finiteFight, content, "cut_normal_tree", 3);
    expect(finiteFight.queueFight?.remaining).toBe(5);
    expect(queueBlockReason(finiteFight, content)).toBeNull();

    // Dungeon-Lauf: eine bewusst betretene, ENDLICHE Exkursion — kein Fehlalarm.
    const dungeon = fighter();
    enqueueAction(dungeon, content, "cut_normal_tree", 3);
    startCombat(dungeon, content, "chicken");
    dungeon.combat.dungeonId = "irgendein_dungeon";
    expect(queueBlockReason(dungeon, content)).toBeNull();
  });

  it("ist eine reine Ableitung: mutiert den State nicht und zieht kein RNG", () => {
    const s = fighter();
    setActiveAction(s, content, "cut_normal_tree", null);
    enqueueFight(s, content, "chicken", 5);
    const before = JSON.stringify(s);
    expect(queueBlockReason(s, content)).toBe("endless_action");
    expect(queueBlockReason(s, content)).toBe("endless_action"); // idempotent
    expect(JSON.stringify(s)).toBe(before);
  });

  it("Content-Drift: unbekannte laufende Aktion meldet keine Sperre (der Tick räumt sie ab)", () => {
    const s = fighter();
    s.activeActionId = "gibt_es_nicht" as never;
    s.actionTarget = null;
    enqueueFight(s, content, "chicken", 5);
    expect(queueBlockReason(s, content)).toBeNull();
  });
});

describe("Task #369 — Ein-Klick-Ausweg (bestehender Prioritäts-Pfad, #326/#327)", () => {
  it("⚡ auf den wartenden Eintrag startet ihn sofort; die ∞-Aktion wandert als ∞ zurück", () => {
    const s = fighter();
    setActiveAction(s, content, "cut_normal_tree", null);
    enqueueFight(s, content, "chicken", 5);
    expect(queueBlockReason(s, content)).toBe("endless_action");

    expect(prioritizeQueueEntry(s, content, 0)).toBe(true);

    expect(s.combat.monsterId).toBe("chicken");
    expect(s.queueFight).toEqual({ monsterId: "chicken", remaining: 5 });
    expect(s.activeActionId).toBeNull();
    // Die ∞-Aktion ist nicht verloren — sie steht als ∞ an der Front und läuft danach weiter.
    expect(s.actionQueue).toEqual([
      { kind: "action", actionId: "cut_normal_tree", target: null },
    ]);
    // Jetzt sperrt der Kampf nicht mehr (endliches Kill-Ziel) …
    expect(queueBlockReason(s, content)).toBeNull();
    // … und nach dem manuellen Stopp läuft die ∞-Aktion wieder an.
    stopCombat(s);
    advance(s, content, 1_000);
    expect(s.activeActionId).toBe("cut_normal_tree");
    expect(s.actionTarget).toBeNull();
  });

  it("⚡ löst auch die ∞-Kampf-Sperre auf (Kampf zurück an die Front, Aktion läuft)", () => {
    const s = fighter();
    enqueueFight(s, content, "chicken", null);
    advance(s, content, 1_000);
    enqueueAction(s, content, "cut_normal_tree", 3);
    expect(queueBlockReason(s, content)).toBe("endless_fight");

    expect(prioritizeQueueEntry(s, content, 0)).toBe(true);

    expect(s.activeActionId).toBe("cut_normal_tree");
    expect(s.combat.monsterId).toBeNull();
    expect(s.actionQueue).toEqual([makeFightQueueEntry("chicken", null)]);
    expect(queueBlockReason(s, content)).toBeNull(); // endliches Mengen-Ziel läuft aus
  });
});
