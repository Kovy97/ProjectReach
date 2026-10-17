import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { GameState } from "@hearthforge/shared";
import { objectiveProgress } from "./quests";

/**
 * Chef-Report 31.08.2026: „Habe gerade die Quest abgeschlossen fuer 10 Hollow Choir und 40 Skelett-
 * Viecher, danach kam die Quest fuer den Dungeon-Endboss und die wurde einfach erledigt, obwohl ich
 * den nie gemacht habe."
 *
 * Ursache: Kapitel 11 („Der Fuerst der Tiefe") zielte auf `skeleton_nekro` — dieselbe Kreatur
 * roamt aber offen in der Krypta. Der echte Endboss ist `dg_skeleton_nekro`, dessen Kills auf die
 * Basis-Id laufen. Wer fuer Kapitel 10 vierzig Skelette farmt, hatte das Boss-Kapitel also erfuellt,
 * bevor er den Dungeon je betrat.
 */

function stateMit(over: Partial<GameState>): GameState {
  return {
    monsterKills: {},
    dungeonsCleared: {},
    stats: { kills: 0, itemsGathered: 0, itemsCrafted: 0, craftedById: {} },
    skills: {},
    character: { totalLevel: 1 },
    paragon: { best: 0 },
    ...over,
  } as unknown as GameState;
}

const kapitel11 = content.quests.find((q) => q.id === "chronicle_11")!;

describe("Boss-Kapitel der Krypta", () => {
  it("Skelette im Gebiet zu farmen erfuellt das Boss-Kapitel NICHT", () => {
    const s = stateMit({
      monsterKills: { skeleton_nekro: 99, skeleton_warrior: 400, hollow_choir: 50 } as never,
    });
    for (const obj of kapitel11.objectives) {
      expect(objectiveProgress(s, content, obj)).toBe(0);
    }
  });

  it("ein geraeumter Durchgang der Krypta-Tiefen erfuellt es", () => {
    const s = stateMit({ dungeonsCleared: { crypt_depths: 1 } as never });
    for (const obj of kapitel11.objectives) {
      expect(objectiveProgress(s, content, obj)).toBeGreaterThanOrEqual(obj.count);
    }
  });

  /**
   * Der Waechter fuer die ganze Klasse: Ein Boss-Kapitel darf nie auf ein Monster zielen, das der
   * Spieler auch ausserhalb des Dungeons treffen kann. Alle uebrigen Boss-Kapitel haben dafuer
   * einen eigenen `dungeonOnly`-Gegner; nur die Krypta teilte sich Basis und Boss.
   */
  it("kein Kapitel zielt auf ein offen farmbares Monster, das einen Dungeon-Boss meint", () => {
    const verdaechtig: string[] = [];
    for (const q of content.quests) {
      if (!q.id.startsWith("chronicle_")) continue;
      // Boss-Kapitel erkennt man an einem einzelnen Kill-Ziel mit count 1.
      const einzel = q.objectives.length === 1 ? q.objectives[0]! : null;
      if (!einzel || einzel.type !== "kill_monster" || einzel.count !== 1) continue;
      const id = einzel.target;
      const m = id ? content.monsters[id] : undefined;
      if (m && !(m as { dungeonOnly?: boolean }).dungeonOnly) verdaechtig.push(`${q.id} → ${id}`);
    }
    // Die Welt-Bosse der offenen Zonen (Kapitel 2/3/7/8/9) sind ausdruecklich offen gemeint und
    // stehen namentlich hier — alles andere waere ein neuer Fall dieses Fehlers.
    const erlaubt = ["chronicle_02", "chronicle_03", "chronicle_07", "chronicle_08", "chronicle_09"];
    const unerwartet = verdaechtig.filter((z) => !erlaubt.some((id) => z.startsWith(id)));
    expect(unerwartet).toEqual([]);
  });
});
