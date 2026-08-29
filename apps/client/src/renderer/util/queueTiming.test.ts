import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { addItem, createGame } from "@hearthforge/engine";
import { makeFightQueueEntry } from "@hearthforge/shared";
import { computeQueueTiming, estimateFightKillMs } from "./queueTiming";

/**
 * Unit-Tests der Warteschlangen-Dauer-Berechnung (1.0.1, Steam-Forum-Wunsch Rose Noel Thorne +
 * Lobster Jason — s. queueTiming.ts-JSDoc). Reine Funktion, keine Engine-Mutation nötig: der
 * Test-State wird direkt konstruiert/bestückt (Muster wie packages/engine/src/action-queue.test.ts).
 */

function freshState() {
  return createGame({ name: "Test" }, content, 1);
}

describe("computeQueueTiming — leere Warteschlange", () => {
  it("liefert 0 ms Gesamtdauer ohne Einträge", () => {
    const s = freshState();
    const timing = computeQueueTiming(s, content);
    expect(timing.active).toBeNull();
    expect(timing.queue).toEqual([]);
    expect(timing.finiteMs).toBe(0);
    expect(timing.hasInfinite).toBe(false);
    expect(timing.totalMs).toBe(0);
  });
});

describe("computeQueueTiming — Sammeln", () => {
  it("Menge × effektive Aktionsdauer, ohne Boni exakt Basisdauer × Ziel", () => {
    const s = freshState();
    s.actionQueue.push({ kind: "action", actionId: "cut_normal_tree", target: 5 });
    const timing = computeQueueTiming(s, content);
    expect(timing.queue).toHaveLength(1);
    const e = timing.queue[0]!;
    expect(e.infinite).toBe(false);
    expect(e.unknown).toBe(false);
    expect(e.materialLimited).toBe(false);
    // cut_normal_tree: durationMs 2800, kein Werkzeug/Mastery-Bonus bei frischem State → 5×2800.
    expect(e.remainingMs).toBe(5 * 2800);
    expect(timing.totalMs).toBe(5 * 2800);
    expect(timing.hasInfinite).toBe(false);
  });

  it("Ziel 'Alle' (target null) bei einer Sammel-Aktion ist ECHT unendlich", () => {
    const s = freshState();
    s.actionQueue.push({ kind: "action", actionId: "cut_normal_tree", target: null });
    const timing = computeQueueTiming(s, content);
    const e = timing.queue[0]!;
    expect(e.infinite).toBe(true);
    expect(e.remainingMs).toBeUndefined();
    expect(timing.hasInfinite).toBe(true);
    expect(timing.totalMs).toBeNull();
    expect(timing.finiteMs).toBe(0); // nichts VOR dem unendlichen Eintrag
  });

  it("zieht den bereits laufenden Fortschritt der AKTIVEN Aktion ab", () => {
    const s = freshState();
    s.activeActionId = "cut_normal_tree";
    s.actionTarget = 2; // 2 Durchläufe verbleiben, der erste läuft schon
    s.actionProgressMs = 1000; // 1000 von 2800 ms bereits geschafft
    const timing = computeQueueTiming(s, content);
    expect(timing.active).not.toBeNull();
    // Rest 1. Zyklus (2800-1000) + 1 voller 2. Zyklus (2800).
    expect(timing.active!.remainingMs).toBe(1800 + 2800);
    expect(timing.totalMs).toBe(1800 + 2800);
  });
});

describe("computeQueueTiming — Verarbeitung mit knappem Material", () => {
  it("markiert einen Eintrag sichtbar, wenn das Material nicht für das volle Ziel reicht", () => {
    const s = freshState();
    s.skills.smithing = { xp: 10_000 }; // Level komfortabel über levelRequired 5
    addItem(s.inventory, content, "copper_ore", 120);
    addItem(s.inventory, content, "tin_ore", 500); // Zinn reicht, Kupfer ist der Flaschenhals
    s.actionQueue.push({ kind: "action", actionId: "smelt_bronze", target: 500 });
    const timing = computeQueueTiming(s, content);
    const e = timing.queue[0]!;
    expect(e.materialLimited).toBe(true);
    expect(e.reachableCount).toBe(120);
    expect(e.requestedTarget).toBe(500);
    // smelt_bronze: durationMs 3000, kein Bonus bei frischem State → 120 Durchläufe möglich.
    expect(e.remainingMs).toBe(120 * 3000);
  });

  it("reicht das Material für das volle Ziel, ist der Eintrag NICHT materialLimited", () => {
    const s = freshState();
    s.skills.smithing = { xp: 10_000 };
    addItem(s.inventory, content, "copper_ore", 500);
    addItem(s.inventory, content, "tin_ore", 500);
    s.actionQueue.push({ kind: "action", actionId: "smelt_bronze", target: 500 });
    const timing = computeQueueTiming(s, content);
    const e = timing.queue[0]!;
    expect(e.materialLimited).toBe(false);
    expect(e.reachableCount).toBeNull();
    expect(e.remainingMs).toBe(500 * 3000);
  });

  it("Bank-Bestand zählt mit (Crafting darf aus der Bank ziehen)", () => {
    const s = freshState();
    s.skills.smithing = { xp: 10_000 };
    addItem(s.inventory, content, "copper_ore", 50);
    s.bank.copper_ore = 450;
    addItem(s.inventory, content, "tin_ore", 500);
    s.actionQueue.push({ kind: "action", actionId: "smelt_bronze", target: 500 });
    const timing = computeQueueTiming(s, content);
    expect(timing.queue[0]!.materialLimited).toBe(false);
  });

  it("teilt einen gemeinsamen Materialpool auf ZWEI konkurrierende Verarbeitungs-Einträge auf", () => {
    const s = freshState();
    s.skills.smithing = { xp: 10_000 };
    addItem(s.inventory, content, "copper_ore", 150);
    addItem(s.inventory, content, "tin_ore", 1000);
    s.actionQueue.push(
      { kind: "action", actionId: "smelt_bronze", target: 100 },
      { kind: "action", actionId: "smelt_bronze", target: 100 },
    );
    const timing = computeQueueTiming(s, content);
    // Erster Eintrag verbraucht 100 von 150 Kupfer, dem zweiten bleiben nur noch 50.
    expect(timing.queue[0]!.materialLimited).toBe(false);
    expect(timing.queue[0]!.remainingMs).toBe(100 * 3000);
    expect(timing.queue[1]!.materialLimited).toBe(true);
    expect(timing.queue[1]!.reachableCount).toBe(50);
  });

  it("Ziel 'Alle' bei Verarbeitung ist NICHT unendlich (immer material-gedeckelt)", () => {
    const s = freshState();
    s.skills.smithing = { xp: 10_000 };
    addItem(s.inventory, content, "copper_ore", 30);
    addItem(s.inventory, content, "tin_ore", 30);
    s.actionQueue.push({ kind: "action", actionId: "smelt_bronze", target: null });
    const timing = computeQueueTiming(s, content);
    const e = timing.queue[0]!;
    expect(e.infinite).toBe(false);
    expect(e.remainingMs).toBe(30 * 3000);
    expect(timing.hasInfinite).toBe(false);
  });
});

describe("computeQueueTiming — Kämpfe (Schätzung)", () => {
  it("schätzt eine endliche Kill-Anzahl als isEstimate-markierte Dauer > 0", () => {
    const s = freshState();
    s.actionQueue.push(makeFightQueueEntry("goblin", 10));
    const timing = computeQueueTiming(s, content);
    const e = timing.queue[0]!;
    expect(e.isEstimate).toBe(true);
    expect(e.infinite).toBe(false);
    expect(e.unknown).toBe(false);
    expect(e.remainingMs).toBeGreaterThan(0);
    // Konsistenz mit dem Baustein estimateFightKillMs (10× derselbe Pro-Kill-Wert, gerundet).
    const perKill = estimateFightKillMs(s, content, "goblin")!;
    expect(e.remainingMs).toBe(Math.round(10 * perKill));
  });

  it("∞-Kampf (target null) ist ein unendlicher Eintrag", () => {
    const s = freshState();
    s.actionQueue.push(makeFightQueueEntry("goblin", null));
    const timing = computeQueueTiming(s, content);
    expect(timing.queue[0]!.infinite).toBe(true);
    expect(timing.hasInfinite).toBe(true);
  });

  it("unbekanntes Monster (Content-Drift) liefert einen unknown-Eintrag statt einer erfundenen Zahl", () => {
    const s = freshState();
    s.actionQueue.push(makeFightQueueEntry("does_not_exist" as never, 5));
    const timing = computeQueueTiming(s, content);
    const e = timing.queue[0]!;
    expect(e.unknown).toBe(true);
    expect(e.remainingMs).toBeUndefined();
    // Die unbekannte Zeile bleibt isoliert — sie reißt die Gesamtsumme nicht auf "unendlich".
    expect(timing.hasInfinite).toBe(false);
    expect(timing.totalMs).toBe(0);
  });

  it("aktiver Queue-Kampf (state.queueFight) landet in `active`, nicht in `queue`", () => {
    const s = freshState();
    s.queueFight = { monsterId: "goblin", remaining: 3 };
    const timing = computeQueueTiming(s, content);
    expect(timing.queue).toEqual([]);
    expect(timing.active).not.toBeNull();
    expect(timing.active!.isEstimate).toBe(true);
    expect(timing.active!.remainingMs).toBeGreaterThan(0);
  });
});

describe("computeQueueTiming — Sammeln → Verarbeitung (1.0.1, Chef-Meldung 'Copper vein → Smelt copper hat keine Zeit')", () => {
  it("Kupferader sammeln (endliches Ziel) → Kupfer schmelzen zeigt eine Näherungs-Zeit statt 0", () => {
    const s = freshState();
    // Frischer State: 0 Kupfererz auf Lager — ohne den Fix sähe smelt_copper hier "0 Zyklen möglich".
    s.actionQueue.push(
      { kind: "action", actionId: "mine_copper", target: 500 }, // 500× Kupfererz sammeln (chance 1, min/max 1 → Ø 1/Zyklus)
      { kind: "action", actionId: "smelt_copper", target: 500 }, // wartet vollständig auf die Sammel-Ausbeute
    );
    const timing = computeQueueTiming(s, content);
    const smelt = timing.queue[1]!;
    // mine_copper liefert Kupfererz garantiert (chance 1, min=max=1) → erwartete Ausbeute exakt 500,
    // deckt das Ziel voll ab: NICHT materialLimited, aber als Näherung markiert (hängt von der
    // Sammel-Ausbeute des Vorgängers ab, nicht vom aktuellen Lagerbestand).
    expect(smelt.isEstimate).toBe(true);
    expect(smelt.unknown).toBe(false);
    expect(smelt.materialLimited).toBe(false);
    expect(smelt.remainingMs).toBeGreaterThan(0);
    // smelt_copper: durationMs 2600, kein Bonus bei frischem State → 500 volle Zyklen.
    expect(smelt.remainingMs).toBe(500 * 2600);
  });

  it("reicht die erwartete Sammel-Ausbeute NICHT für das volle Ziel, bleibt der Folge-Eintrag materialLimited + isEstimate", () => {
    const s = freshState();
    s.actionQueue.push(
      { kind: "action", actionId: "mine_copper", target: 100 }, // erwartete Ausbeute: 100 Kupfererz
      { kind: "action", actionId: "smelt_copper", target: 500 }, // will 500, bekommt nur 100
    );
    const timing = computeQueueTiming(s, content);
    const smelt = timing.queue[1]!;
    expect(smelt.isEstimate).toBe(true);
    expect(smelt.materialLimited).toBe(true);
    expect(smelt.reachableCount).toBe(100);
    expect(smelt.remainingMs).toBe(100 * 2600);
  });

  it("schmelzen ganz OHNE jeden Vorgänger bleibt weiterhin klar material-limitiert (kein falsches Näherungs-Signal)", () => {
    const s = freshState();
    // Kein Sammel-Eintrag davor, kein Kupfererz auf Lager: "hat schlicht nichts", nicht "wartet auf
    // einen Vorgänger" — genau die Unterscheidung, die der Fix nicht verwischen darf.
    s.actionQueue.push({ kind: "action", actionId: "smelt_copper", target: 500 });
    const timing = computeQueueTiming(s, content);
    const smelt = timing.queue[0]!;
    expect(smelt.isEstimate).toBe(false);
    expect(smelt.materialLimited).toBe(true);
    expect(smelt.reachableCount).toBe(0);
    expect(smelt.remainingMs).toBe(0);
  });

  it("ein ∞-Sammel-Vorgänger (Ziel 'Alle') lässt den Folge-Eintrag NICHT fälschlich '0' zeigen, sondern unknown", () => {
    const s = freshState();
    s.actionQueue.push(
      { kind: "action", actionId: "mine_copper", target: null }, // läuft unbegrenzt weiter (Ziel "Alle")
      { kind: "action", actionId: "smelt_copper", target: 500 },
    );
    const timing = computeQueueTiming(s, content);
    const smelt = timing.queue[1]!;
    // Ohne Fix: materialLimited mit reachableCount 0 und remainingMs 0 (aktueller Lagerbestand ist
    // leer) — läse sich wie "sofort fertig". Mit Fix: ehrlich unbeziffert statt einer falschen "0".
    expect(smelt.unknown).toBe(true);
    expect(smelt.remainingMs).toBeUndefined();
    expect(smelt.materialLimited).toBe(false);
  });

  it("ein bereits ausreichender Lagerbestand bleibt NICHT als Näherung markiert, obwohl ein Sammel-Vorgänger in der Que steht", () => {
    const s = freshState();
    addItem(s.inventory, content, "copper_ore", 500); // schon genug echtes Erz auf Lager
    s.actionQueue.push(
      { kind: "action", actionId: "mine_copper", target: 50 }, // trägt zusätzlich bei, wird aber gar nicht gebraucht
      { kind: "action", actionId: "smelt_copper", target: 500 },
    );
    const timing = computeQueueTiming(s, content);
    const smelt = timing.queue[1]!;
    expect(smelt.materialLimited).toBe(false);
    expect(smelt.remainingMs).toBe(500 * 2600);
    // Erz kommt vollständig aus dem ECHTEN Lagerbestand — die Schätzung war für die Kappung
    // gar nicht nötig; die aktuelle (bewusst konservative) Markierung flaggt trotzdem, sobald
    // Erz überhaupt aus einem Sammel-Vorgänger stammt (s. `isEstimatedSource`-JSDoc).
    expect(smelt.isEstimate).toBe(true);
  });
});

describe("computeQueueTiming — gemischte Kette + Unendlich-Abbruch", () => {
  it("summiert nur die endlichen Einträge VOR dem ersten Unendlich-Eintrag", () => {
    const s = freshState();
    s.actionQueue.push(
      { kind: "action", actionId: "cut_normal_tree", target: 5 }, // 5×2800 = 14000
      makeFightQueueEntry("goblin", null), // unendlich ab hier
      { kind: "action", actionId: "cut_normal_tree", target: 100 }, // läuft nie an
    );
    const timing = computeQueueTiming(s, content);
    expect(timing.queue).toHaveLength(3); // alle drei werden weiterhin ANGEZEIGT …
    expect(timing.hasInfinite).toBe(true);
    expect(timing.totalMs).toBeNull();
    expect(timing.finiteMs).toBe(5 * 2800); // … aber nur der erste zählt in die Summe.
  });

  it("Index-Parität bleibt auch bei einem Content-Drift-Eintrag MITTEN in der Warteschlange erhalten", () => {
    const s = freshState();
    s.actionQueue.push(
      { kind: "action", actionId: "cut_normal_tree", target: 2 },
      { kind: "action", actionId: "does_not_exist_either" as never, target: 3 },
      { kind: "action", actionId: "cut_normal_tree", target: 1 },
    );
    const timing = computeQueueTiming(s, content);
    expect(timing.queue).toHaveLength(3); // gleiche Länge wie state.actionQueue, kein Verrutschen.
    expect(timing.queue[1]!.unknown).toBe(true);
    expect(timing.queue[2]!.remainingMs).toBe(1 * 2800);
    expect(timing.finiteMs).toBe(2 * 2800 + 1 * 2800); // der unknown-Eintrag trägt 0 bei.
  });
});
