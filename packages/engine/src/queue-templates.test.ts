import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { GameState, QueuedAction } from "@hearthforge/shared";
import {
  QUEUE_TEMPLATE_MAX_ENTRIES,
  QUEUE_TEMPLATE_NAME_MAX,
  QUEUE_TEMPLATE_SLOTS,
  makeDungeonQueueEntry,
  makeFightQueueEntry,
} from "@hearthforge/shared";
import { createTestGame } from "./test-helpers";
import { advance } from "./tick";
import { advanceActionQueue, enqueueAction, enqueueFight, setActiveAction } from "./actions";
import { startCombat } from "./combat";
import {
  cleanQueueTemplates,
  clearQueueTemplate,
  currentActivityQueueEntry,
  loadQueueTemplate,
  normalizeQueueTemplateName,
  queueTemplateAt,
  renameQueueTemplate,
  saveQueueTemplate,
} from "./queueTemplates";
import { PRESTIGE_STATE_FIELDS } from "./prestige";
import { actionsUnlockedAtLevel, nextRecipeUnlock } from "./recipeUnlocks";
import { levelFromXp, xpForLevel } from "./leveling";

/**
 * claude:2026-10-31T16:08:21+01:00 — Warteschlangen-Vorlagen (1.4.2, SAVE 103; Sweep-Idee mit Chef-GO 31.10.2026): drei Plätze, Speichern der
 * laufenden Aktivität (Restziel) + Warteschlange, Laden hinten über die enqueue-Verben (Stapel-Regel, Übersprungene gezählt), Leeren,
 * Umbenennen, Lade-Härtung. Dazu die Rezept-Freischaltungs-Helfer für die UI.
 */
function game(): GameState {
  return createTestGame({ name: "Planer", createdAt: 1 }, content, 7);
}

describe("Warteschlangen-Vorlagen: Speichern", () => {
  it("neuer Stand: drei leere Plätze, Feld bleibt beim Aschesturz", () => {
    const s = game();
    expect(s.queueTemplates).toEqual([null, null, null]);
    expect(QUEUE_TEMPLATE_SLOTS).toBe(3);
    expect(PRESTIGE_STATE_FIELDS.queueTemplates).toBe("keep");
  });

  it("laufende Aktion mit Restziel zuerst, dann die Warteschlange; die Warteschlange bleibt unberührt", () => {
    const s = game();
    setActiveAction(s, content, "cut_normal_tree", 7);
    enqueueAction(s, content, "mine_copper", 25);
    enqueueFight(s, content, "chicken", 10);
    const before = JSON.stringify(s.actionQueue);
    expect(saveQueueTemplate(s, 1, "  Morgenrunde  ")).toBe(true);
    expect(s.queueTemplates[1]).toEqual({
      name: "Morgenrunde",
      entries: [
        { kind: "action", actionId: "cut_normal_tree", target: 7 },
        { kind: "action", actionId: "mine_copper", target: 25 },
        makeFightQueueEntry("chicken", 10),
      ],
    });
    expect(JSON.stringify(s.actionQueue)).toBe(before);
    expect(s.activeActionId).toBe("cut_normal_tree");
    // Vorlage und Warteschlange teilen keine Objekte.
    s.actionQueue[0]!.target = 99;
    expect(s.queueTemplates[1]!.entries[1]!.target).toBe(25);
  });

  it("endlose Aktion bleibt endlos; Queue-Kampf mit Rest-Kills; manueller Kampf als ∞", () => {
    const s = game();
    setActiveAction(s, content, "cut_normal_tree");
    expect(currentActivityQueueEntry(s)).toEqual({ kind: "action", actionId: "cut_normal_tree", target: null });

    const f = game();
    enqueueFight(f, content, "chicken", 5);
    expect(advanceActionQueue(f, content)).toBe(true);
    f.queueFight!.remaining = 3;
    expect(currentActivityQueueEntry(f)).toEqual(makeFightQueueEntry("chicken", 3));

    const m = game();
    expect(startCombat(m, content, "cow")).toBe(true);
    expect(currentActivityQueueEntry(m)).toEqual(makeFightQueueEntry("cow", null));
  });

  it("nichts zu speichern oder ungültiger Platz: false, nichts geändert", () => {
    const s = game();
    expect(saveQueueTemplate(s, 0, "leer")).toBe(false);
    enqueueAction(s, content, "mine_copper", 5);
    expect(saveQueueTemplate(s, 3, "x")).toBe(false);
    expect(saveQueueTemplate(s, -1, "x")).toBe(false);
    expect(saveQueueTemplate(s, 0.5, "x")).toBe(false);
    expect(s.queueTemplates).toEqual([null, null, null]);
  });

  it("höchstens QUEUE_TEMPLATE_MAX_ENTRIES Einträge, überschreibt einen belegten Platz", () => {
    const s = game();
    setActiveAction(s, content, "cut_normal_tree", 1);
    const ids = ["mine_copper", "cut_normal_tree"];
    for (let i = 0; i < QUEUE_TEMPLATE_MAX_ENTRIES + 10; i++) enqueueAction(s, content, ids[i % 2]!, 1);
    expect(saveQueueTemplate(s, 2, "voll")).toBe(true);
    expect(s.queueTemplates[2]!.entries).toHaveLength(QUEUE_TEMPLATE_MAX_ENTRIES);
    expect(s.queueTemplates[2]!.entries[0]).toEqual({ kind: "action", actionId: "cut_normal_tree", target: 1 });
    s.actionQueue = [];
    setActiveAction(s, content, "mine_copper", 4);
    expect(saveQueueTemplate(s, 2, "neu")).toBe(true);
    expect(s.queueTemplates[2]).toEqual({ name: "neu", entries: [{ kind: "action", actionId: "mine_copper", target: 4 }] });
  });

  it("Name: Steuerzeichen raus, getrimmt, höchstens 24 Zeichen ohne halbierte Schriftzeichen, leer erlaubt", () => {
    expect(QUEUE_TEMPLATE_NAME_MAX).toBe(24);
    expect(normalizeQueueTemplateName("a\u0000b\nc\td")).toBe("abcd");
    expect(normalizeQueueTemplateName("")).toBe("");
    expect(normalizeQueueTemplateName(42)).toBe("");
    const long = "🔥".repeat(30);
    expect(Array.from(normalizeQueueTemplateName(long))).toHaveLength(24);
    expect(normalizeQueueTemplateName(long)).toBe("🔥".repeat(24));
    expect(normalizeQueueTemplateName("x".repeat(23) + " y")).toBe("x".repeat(23));
  });
});

describe("Warteschlangen-Vorlagen: Laden, Leeren, Umbenennen", () => {
  it("hängt hinten an, mit Stapel-Regel; die Vorlage bleibt und ist mehrfach ladbar", () => {
    const s = game();
    setActiveAction(s, content, "mine_copper", 10);
    enqueueFight(s, content, "chicken", 4);
    saveQueueTemplate(s, 0, "Kupfer");
    s.actionQueue = [];
    setActiveAction(s, content, null);
    enqueueAction(s, content, "mine_copper", 5); // gleicher letzter Eintrag ⇒ das erste Vorlagen-Ziel wird aufaddiert
    expect(loadQueueTemplate(s, content, 0)).toEqual({ added: 2, skipped: 0 });
    expect(s.actionQueue).toEqual([{ kind: "action", actionId: "mine_copper", target: 15 }, makeFightQueueEntry("chicken", 4)]);
    expect(loadQueueTemplate(s, content, 0)).toEqual({ added: 2, skipped: 0 });
    expect(s.actionQueue).toHaveLength(4);
    expect(queueTemplateAt(s, 0)!.entries).toHaveLength(2);
  });

  it("unbekannte und ungültige Einträge werden übersprungen und gezählt", () => {
    const s = game();
    const dungeonOnly = Object.values(content.monsters).find((m) => m.dungeonOnly)!;
    s.queueTemplates[1] = {
      name: "Drift",
      entries: [
        { kind: "action", actionId: "gibt_es_nicht", target: 3 },
        makeFightQueueEntry(dungeonOnly.id, 2),
        makeFightQueueEntry("kein_monster", 2),
        makeDungeonQueueEntry("kein_dungeon", 1),
        { kind: "action", actionId: "cut_normal_tree", target: null },
      ] as QueuedAction[],
    };
    expect(loadQueueTemplate(s, content, 1)).toEqual({ added: 1, skipped: 4 });
    expect(s.actionQueue).toEqual([{ kind: "action", actionId: "cut_normal_tree", target: null }]);
  });

  it("leerer oder ungültiger Platz: nichts passiert", () => {
    const s = game();
    expect(loadQueueTemplate(s, content, 0)).toEqual({ added: 0, skipped: 0 });
    expect(loadQueueTemplate(s, content, 7)).toEqual({ added: 0, skipped: 0 });
    expect(s.actionQueue).toEqual([]);
  });

  it("geladene Vorlage läuft im nächsten Tick an, wenn nichts lief", () => {
    const s = game();
    enqueueAction(s, content, "cut_normal_tree", 2);
    saveQueueTemplate(s, 0, "");
    s.actionQueue = [];
    loadQueueTemplate(s, content, 0);
    advance(s, content, 100);
    expect(s.activeActionId).toBe("cut_normal_tree");
  });

  it("Leeren und Umbenennen", () => {
    const s = game();
    enqueueAction(s, content, "mine_copper", 5);
    saveQueueTemplate(s, 2, "alt");
    expect(renameQueueTemplate(s, 2, " neu\u0007 ")).toBe(true);
    expect(s.queueTemplates[2]!.name).toBe("neu");
    expect(renameQueueTemplate(s, 0, "x")).toBe(false); // leerer Platz
    expect(clearQueueTemplate(s, 2)).toBe(true);
    expect(clearQueueTemplate(s, 2)).toBe(false);
    expect(s.queueTemplates).toEqual([null, null, null]);
  });
});

describe("Warteschlangen-Vorlagen: Lade-Härtung", () => {
  it("fehlt/kaputt ⇒ drei leere Plätze; Länge normalisiert; unbekannte Einträge raus; Ziele normalisiert", () => {
    expect(cleanQueueTemplates(undefined, content)).toEqual([null, null, null]);
    expect(cleanQueueTemplates("x", content)).toEqual([null, null, null]);
    expect(cleanQueueTemplates([5, null], content)).toEqual([null, null, null]);
    const raw = [
      {
        name: "  A\u0001B  ",
        entries: [
          { kind: "action", actionId: "mine_copper", target: 2.7 },
          { kind: "action", actionId: "weg", target: 1 },
          { kind: "fight", monsterId: "chicken", target: -3, actionId: "egal" },
          { kind: "raid", raidId: "kein_raid", raidDifficulty: "normal", target: 1 },
          { actionId: "cut_normal_tree", target: Number.POSITIVE_INFINITY },
          "müll",
        ],
      },
      { name: 7, entries: "nein" },
      null,
      { name: "vierter Platz", entries: [] },
    ];
    expect(cleanQueueTemplates(raw, content)).toEqual([
      {
        name: "AB",
        entries: [
          { kind: "action", actionId: "mine_copper", target: 2 },
          makeFightQueueEntry("chicken", null),
          { kind: "action", actionId: "cut_normal_tree", target: null },
        ],
      },
      { name: "", entries: [] },
      null,
    ]);
  });

  it("höchstens QUEUE_TEMPLATE_MAX_ENTRIES Einträge, idempotent", () => {
    const entries = Array.from({ length: QUEUE_TEMPLATE_MAX_ENTRIES + 5 }, (_, i) => ({ kind: "action", actionId: "mine_copper", target: i + 1 }));
    const once = cleanQueueTemplates([null, { name: "lang", entries }, null], content);
    expect(once[1]!.entries).toHaveLength(QUEUE_TEMPLATE_MAX_ENTRIES);
    expect(cleanQueueTemplates(JSON.parse(JSON.stringify(once)), content)).toEqual(once);
  });
});

describe("Rezept-Freischaltungen (UI-Helfer)", () => {
  function levelsOf(skill: string): number[] {
    return Object.values(content.actions).filter((a) => a.skill === skill).map((a) => a.levelRequired ?? 1);
  }

  it("nextRecipeUnlock: kleinste Stufe über der aktuellen, mit genau den Aktionen dieser Stufe", () => {
    const s = game();
    const skill = "smithing";
    const now = levelFromXp(s.skills[skill]?.xp ?? 0);
    const expected = Math.min(...levelsOf(skill).filter((l) => l > now));
    const next = nextRecipeUnlock(s, content, skill)!;
    expect(next.level).toBe(expected);
    expect(next.actionIds.length).toBeGreaterThan(0);
    expect(next.actionIds).toEqual(actionsUnlockedAtLevel(content, skill, expected));
    for (const id of next.actionIds) expect(content.actions[id]!.levelRequired ?? 1).toBe(expected);
  });

  it("nextRecipeUnlock: auf der Freischalt-Stufe zählt sie als erreicht; ganz oben null; unbekannter Skill null", () => {
    const s = game();
    const skill = "smithing";
    const first = nextRecipeUnlock(s, content, skill)!;
    s.skills[skill] = { xp: xpForLevel(first.level) };
    expect(nextRecipeUnlock(s, content, skill)!.level).toBeGreaterThan(first.level);
    s.skills[skill] = { xp: xpForLevel(Math.max(...levelsOf(skill))) };
    expect(nextRecipeUnlock(s, content, skill)).toBeNull();
    expect(nextRecipeUnlock(s, content, "kein_skill")).toBeNull();
  });

  it("actionsUnlockedAtLevel: Stufe 1 = Aktionen ohne/mit Stufe 1; ungültige Stufe leer", () => {
    const lvl1 = actionsUnlockedAtLevel(content, "woodcutting", 1);
    expect(lvl1).toContain("cut_normal_tree");
    expect(actionsUnlockedAtLevel(content, "woodcutting", 0)).toEqual([]);
    expect(actionsUnlockedAtLevel(content, "woodcutting", 1.5)).toEqual([]);
  });
});
