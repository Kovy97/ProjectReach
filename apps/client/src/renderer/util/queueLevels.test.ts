import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { createGame } from "@hearthforge/engine";
import { levelFromXp, xpForLevel } from "@hearthforge/engine";
import { makeFightQueueEntry } from "@hearthforge/shared";
import { computeQueueLevels, effectiveActionXpGain, projectActionLevel } from "./queueLevels";

/**
 * Unit-Tests der Warteschlangen-Level-Projektion (Chef 25.08.2026 — s. queueLevels.ts-JSDoc).
 * Reine Funktion, keine Engine-Mutation nötig: der Test-State wird direkt konstruiert/bestückt
 * (Muster wie util/queueTiming.test.ts, packages/engine/src/action-queue.test.ts).
 *
 * `cut_normal_tree` (woodcutting, 4 XP/Ausführung, keine `inputs`) und `mine_copper` (mining,
 * 5 XP/Ausführung, keine `inputs`) sind reine Sammel-Aktionen — bei frischem State greift kein
 * Buff-/Segens-/Risiko-Multiplikator (alle Faktoren aus `effectiveActionXpGain` sind dann exakt
 * 1), die erwartete XP ist also schlicht `action.xp * Ausführungen`.
 */

function freshState() {
  return createGame({ name: "Test" }, content, 1);
}

describe("effectiveActionXpGain — frischer State", () => {
  it("liefert exakt action.xp ohne Buffs/Segen/Risiko", () => {
    const s = freshState();
    const action = content.actions.cut_normal_tree!;
    expect(effectiveActionXpGain(s, content, action)).toBe(4);
  });
});

describe("computeQueueLevels — ein Eintrag über eine Level-Grenze", () => {
  it("zeigt fromLevel -> toLevel, wenn die Ausführungen das Level tatsächlich anheben", () => {
    const s = freshState();
    s.skills.woodcutting = { xp: xpForLevel(30) }; // exakt Level 30, wie im Chef-Beispiel
    // Genug Ausführungen, um mindestens bis Level 33 zu kommen (cut_normal_tree: 4 XP/Stück).
    const target = Math.ceil((xpForLevel(33) - xpForLevel(30)) / 4) + 1;
    s.actionQueue.push({ kind: "action", actionId: "cut_normal_tree", target });
    const levels = computeQueueLevels(s, content);
    const e = levels.queue[0];
    expect(e).not.toBeNull();
    expect(e!.skillId).toBe("woodcutting");
    expect(e!.fromLevel).toBe(30);
    expect(e!.toLevel).toBe(levelFromXp(xpForLevel(30) + 4 * target));
    expect(e!.toLevel).toBeGreaterThanOrEqual(33);
  });

  it("Ziel ohne Level-Änderung bleibt eine stille Zeile (null) — kein Rauschen", () => {
    const s = freshState();
    s.skills.woodcutting = { xp: xpForLevel(30) };
    s.actionQueue.push({ kind: "action", actionId: "cut_normal_tree", target: 1 }); // +4 XP, bleibt Level 30
    const levels = computeQueueLevels(s, content);
    expect(levelFromXp(xpForLevel(30) + 4)).toBe(30); // Testannahme absichern
    expect(levels.queue[0]).toBeNull();
  });
});

describe("computeQueueLevels — kumulative Verkettung", () => {
  it("zwei Einträge DESSELBEN Skills: Eintrag 2 startet dort, wo Eintrag 1 endete", () => {
    const s = freshState();
    const target1 = 50; // 200 XP
    const target2 = 5000; // 20000 XP — garantiert weitere Level-Sprünge
    s.actionQueue.push(
      { kind: "action", actionId: "cut_normal_tree", target: target1 },
      { kind: "action", actionId: "cut_normal_tree", target: target2 },
    );
    const levels = computeQueueLevels(s, content);
    const e1 = levels.queue[0]!;
    const e2 = levels.queue[1]!;
    expect(e1).not.toBeNull();
    expect(e2).not.toBeNull();
    expect(e1.fromLevel).toBe(1);
    expect(e1.toLevel).toBe(levelFromXp(4 * target1));
    // Kern der Anforderung: die Kette reißt nicht ab — Eintrag 2 sieht das Level NACH Eintrag 1.
    expect(e2.fromLevel).toBe(e1.toLevel);
    expect(e2.toLevel).toBe(levelFromXp(4 * (target1 + target2)));
  });

  it("zwei verschiedene Skills laufen komplett getrennt (kein gegenseitiges Verschieben)", () => {
    const s = freshState();
    s.skills.mining = { xp: xpForLevel(20) }; // Mining startet bereits auf Level 20
    const woodTarget = 5000; // hebt woodcutting deutlich an
    s.actionQueue.push(
      { kind: "action", actionId: "cut_normal_tree", target: woodTarget }, // woodcutting, 4 XP/Stk.
      { kind: "action", actionId: "mine_copper", target: 1 }, // mining, +5 XP — bleibt auf Level 20
    );
    const levels = computeQueueLevels(s, content);
    const wood = levels.queue[0]!;
    expect(wood.skillId).toBe("woodcutting");
    expect(wood.fromLevel).toBe(1); // NICHT von mining beeinflusst
    // mining-Eintrag: +5 XP reicht nicht für einen weiteren Level ab 20 → keine Zeile, aber falls
    // doch (Content-Änderung), muss der Startpunkt in jedem Fall exakt Level 20 sein.
    const mining = levels.queue[1];
    if (mining) {
      expect(mining.skillId).toBe("mining");
      expect(mining.fromLevel).toBe(20);
    } else {
      expect(levelFromXp(xpForLevel(20) + 5)).toBe(20); // Testannahme absichern
    }
  });
});

describe("computeQueueLevels — Level-Cap 99", () => {
  it("kappt bei 99 (\"98 -> 99\")", () => {
    const s = freshState();
    s.skills.woodcutting = { xp: xpForLevel(99) - 1 }; // exakt Level 98
    s.actionQueue.push({ kind: "action", actionId: "cut_normal_tree", target: 100_000 }); // weit über den Cap hinaus
    const levels = computeQueueLevels(s, content);
    const e = levels.queue[0]!;
    expect(e.fromLevel).toBe(98);
    expect(e.toLevel).toBe(99);
  });

  it("bereits auf Level 99: keine Zeile mehr (Rauschen)", () => {
    const s = freshState();
    s.skills.woodcutting = { xp: xpForLevel(99) };
    s.actionQueue.push({ kind: "action", actionId: "cut_normal_tree", target: 10_000 });
    const levels = computeQueueLevels(s, content);
    expect(levels.queue[0]).toBeNull();
  });
});

describe("computeQueueLevels — unendliches Ziel", () => {
  it("liefert null statt einer erfundenen Zahl, und trägt NICHTS zum Tracker bei", () => {
    const s = freshState();
    s.actionQueue.push(
      { kind: "action", actionId: "cut_normal_tree", target: null }, // ∞ — läuft bis der Spieler stoppt
      { kind: "action", actionId: "cut_normal_tree", target: 50 },
    );
    const levels = computeQueueLevels(s, content);
    expect(levels.queue[0]).toBeNull();
    const e2 = levels.queue[1];
    // Der ∞-Eintrag hat den Tracker NICHT fortgeschrieben — Eintrag 2 startet beim echten
    // Ist-Stand (Level 1, 0 XP), nicht bei einer erfundenen Hochrechnung des ∞-Laufs.
    if (e2) expect(e2.fromLevel).toBe(1);
    else expect(levelFromXp(4 * 50)).toBe(1); // Testannahme absichern (200 XP reicht nicht für Level 2)
  });
});

describe("computeQueueLevels — Kampf-Einträge bleiben außen vor", () => {
  it("ein Kampf-Queue-Eintrag liefert null, ohne einen Skill-Tracker zu berühren", () => {
    const s = freshState();
    s.actionQueue.push(makeFightQueueEntry("goblin", 10));
    const levels = computeQueueLevels(s, content);
    expect(levels.queue[0]).toBeNull();
  });
});

describe("computeQueueLevels — aktive Aktion zählt vor den Queue-Einträgen", () => {
  it("die aktive Aktion (Rest-Ziel) wird ZUERST verbucht — der erste Queue-Eintrag baut darauf auf", () => {
    const s = freshState();
    s.activeActionId = "cut_normal_tree";
    s.actionTarget = 50; // Rest-Ziel der laufenden Aktion: noch 50 Durchläufe
    s.actionQueue.push({ kind: "action", actionId: "cut_normal_tree", target: 5000 });
    const levels = computeQueueLevels(s, content);
    expect(levels.active).not.toBeNull();
    expect(levels.active!.fromLevel).toBe(1);
    expect(levels.active!.toLevel).toBe(levelFromXp(4 * 50));
    const first = levels.queue[0]!;
    expect(first).not.toBeNull();
    expect(first.fromLevel).toBe(levels.active!.toLevel); // Verkettung über die Grenze hinweg
  });

  it("ohne Rest-Ziel (∞ oder keine aktive Aktion) ist `active` null, ohne den Tracker zu stören", () => {
    const s = freshState();
    s.activeActionId = "cut_normal_tree";
    s.actionTarget = null; // "Alle" — läuft unbegrenzt
    s.actionQueue.push({ kind: "action", actionId: "cut_normal_tree", target: 50 });
    const levels = computeQueueLevels(s, content);
    expect(levels.active).toBeNull();
    const first = levels.queue[0]!;
    expect(first.fromLevel).toBe(1); // echter Ist-Stand, nicht durch die ∞-Aktivität verschoben
  });
});

describe("projectActionLevel — combinedTarget-Faltung der \"läuft\"-Zeile", () => {
  it("rechnet unabhängig von computeQueueLevels mit derselben Formel ab dem AKTUELLEN Level", () => {
    const s = freshState();
    s.skills.woodcutting = { xp: xpForLevel(10) };
    const combined = 5000; // z.B. Rest-Ziel + gefaltete Queue-Einträge derselben Aktion
    const e = projectActionLevel(s, content, "cut_normal_tree", combined);
    expect(e).not.toBeNull();
    expect(e!.fromLevel).toBe(10);
    expect(e!.toLevel).toBe(levelFromXp(xpForLevel(10) + 4 * combined));
  });

  it("∞ (null) liefert null", () => {
    const s = freshState();
    expect(projectActionLevel(s, content, "cut_normal_tree", null)).toBeNull();
  });

  it("Content-Drift (unbekannte Aktion) liefert null statt zu crashen", () => {
    const s = freshState();
    expect(projectActionLevel(s, content, "does_not_exist" as never, 50)).toBeNull();
  });
});
