import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { GameState } from "@hearthforge/shared";
import {
  PRESTIGE_POINTS_CORE_99,
  PRESTIGE_POINTS_PER_99,
  PRESTIGE_POINTS_PER_EXTRA_99,
  PRESTIGE_RUN_BASELINE_KEYS,
  PRESTIGE_RUN_TALLY_KEYS,
  PRESTIGE_TALENT_TREE_ID,
  PRESTIGE_UNLOCK_QUEST_ID,
  defaultPrestigeRunBaseline,
} from "@hearthforge/shared";
import { createGame } from "./state";
import { levelFromXp, xpForLevel } from "./leveling";
import { totalLevel } from "./character";
import {
  PRESTIGE_POINTS_LINE_KEYS,
  ascend,
  prestigePointsLedger,
  prestigePointsPreview,
  prestigeRunCounters,
  prestigeRunSummary,
  type PrestigeRunSummary,
} from "./prestige";

// claude:2026-10-18T19:40:00+02:00 — Prestige Welle E1 (Chef-Wunsch 18.10.: Aufstiegs-Fenster mit Bilanz des
// Durchgangs + Narben-Zusammensetzung): Bilanz vor/nach dem Aufstieg, Baselines (zweiter Durchgang zählt nur
// Neues), Aufschlüsselung summiert exakt auf `total` == Gutschrift von `ascend`, Historien-`tally`, Alt-Pfad.

const SKILLS = Object.keys(content.skills);
const PETS = Object.keys(content.pets);
const ACH = content.achievements.map((a) => a.id);

function fresh(seed = 7): GameState {
  return createGame({ name: "Asche", portrait: "char_3" }, content, seed);
}

function setLevel(s: GameState, skillId: string, level: number): void {
  s.skills[skillId] = { xp: xpForLevel(level) };
}

function claim(s: GameState, ...ids: string[]): void {
  for (const id of ids) if (!s.quests.claimed.includes(id)) s.quests.claimed.push(id);
}

/** Erster Durchgang, aufstiegsbereit, mit Spuren in jedem Lebenszeit-Zähler. */
function firstRun(): GameState {
  const s = fresh();
  for (const id of SKILLS.slice(0, 5)) setLevel(s, id, 99);
  for (const id of SKILLS.slice(5, 9)) setLevel(s, id, 80);
  claim(s, "chronicle_05", PRESTIGE_UNLOCK_QUEST_ID, "chronicle_22", "chronicle_23");
  s.monsterKills = { goblin: 4614, chicken: 12 };
  s.dungeonsCleared = { [content.dungeons[0]!.id]: 3, [content.dungeons[1]!.id]: 2 };
  s.achievements = ACH.slice(0, 5);
  s.character.ownedPets = { [PETS[0]!]: true, [PETS[1]!]: true };
  s.slayerTasksCompleted = 41;
  s.paragon = { checkpoint: 12, best: 37 };
  s.character.gold = 1_234_567;
  s.activePlayMs = 8_000_000;
  return s;
}

/** Teilmenge der Bilanz, die als Historien-`tally` gespeichert wird. */
function tallyOf(sum: PrestigeRunSummary): Record<string, number> {
  return Object.fromEntries(PRESTIGE_RUN_TALLY_KEYS.map((k) => [k, sum[k]]));
}

describe("prestigeRunSummary: Bilanz des laufenden Durchgangs", () => {
  it("frischer Spielstand: Durchgang 1, alle Zähler 0, alle Fertigkeiten in Content-Reihenfolge", () => {
    const s = fresh();
    const sum = prestigeRunSummary(s, content);
    expect(sum.run).toBe(1);
    expect(sum.skills.map((x) => x.id)).toEqual(SKILLS);
    for (const { id, level } of sum.skills) expect(level).toBe(levelFromXp(s.skills[id]?.xp ?? 0));
    expect(sum.totalLevel).toBe(totalLevel(s, content));
    expect(sum.skills99).toEqual([]);
    expect({
      playMs: sum.playMs,
      chronicleChapter: sum.chronicleChapter,
      questsClaimed: sum.questsClaimed,
      kills: sum.kills,
      dungeons: sum.dungeons,
      achievements: sum.achievements,
      petsFound: sum.petsFound,
      slayerTasks: sum.slayerTasks,
      paragonBest: sum.paragonBest,
    }).toEqual({ playMs: 0, chronicleChapter: 0, questsClaimed: 0, kills: 0, dungeons: 0, achievements: 0, petsFound: 0, slayerTasks: 0, paragonBest: 0 });
    expect(sum.gold).toBe(s.character.gold);
    expect(s.prestige.runStart).toEqual(defaultPrestigeRunBaseline());
  });

  it("erster Durchgang vor dem Aufstieg: alles seit Spielbeginn; rein lesend und deterministisch", () => {
    const s = firstRun();
    const before = JSON.stringify(s);
    const sum = prestigeRunSummary(s, content);
    expect(JSON.stringify(s)).toBe(before);
    expect(prestigeRunSummary(structuredClone(s), content)).toEqual(sum);

    expect(sum.run).toBe(1);
    expect(sum.playMs).toBe(8_000_000);
    expect(sum.skills99).toEqual(SKILLS.slice(0, 5));
    expect(sum.skills.filter((x) => x.level >= 99).map((x) => x.id)).toEqual(sum.skills99);
    expect(sum.chronicleChapter).toBe(23);
    expect(sum.questsClaimed).toBe(4);
    expect(sum.kills).toBe(4626);
    expect(sum.dungeons).toBe(5);
    expect(sum.achievements).toBe(5);
    expect(sum.petsFound).toBe(2);
    expect(sum.slayerTasks).toBe(41);
    expect(sum.paragonBest).toBe(37);
    expect(sum.gold).toBe(1_234_567);
  });

  it("ascend schreibt die Baselines und hängt die kompakte Bilanz an die Historie; danach beginnt Durchgang 2 bei 0", () => {
    const s = firstRun();
    const sum = prestigeRunSummary(s, content);
    const counters = prestigeRunCounters(s);
    expect(ascend(s, content)).toBe(true);

    expect(s.prestige.runStart).toEqual(counters);
    expect(s.prestige.runStart).toEqual({ kills: 4626, dungeons: 5, achievements: 5, pets: 2, slayerTasks: 41, activePlayMs: 8_000_000 });
    expect(Object.keys(s.prestige.runStart)).toEqual([...PRESTIGE_RUN_BASELINE_KEYS]);
    const rec = s.prestige.history.at(-1)!;
    expect(rec.points).toBe(sum.points.total);
    expect(rec.tally).toEqual(tallyOf(sum));
    expect(Object.keys(rec.tally!)).toEqual([...PRESTIGE_RUN_TALLY_KEYS]);

    // Nach dem Aufstieg beschreibt die Bilanz den neuen, leeren Durchgang (Lebenszeit-Zähler blieben erhalten).
    expect(s.monsterKills).toEqual({ goblin: 4614, chicken: 12 });
    const next = prestigeRunSummary(s, content);
    expect(next.run).toBe(2);
    expect(next.playMs).toBe(0);
    expect(next.kills).toBe(0);
    expect(next.dungeons).toBe(0);
    expect(next.achievements).toBe(0);
    expect(next.petsFound).toBe(0);
    expect(next.slayerTasks).toBe(0);
    expect(next.questsClaimed).toBe(0);
    expect(next.chronicleChapter).toBe(0);
    expect(next.paragonBest).toBe(0);
    expect(next.skills99).toEqual([]);
    expect(next.gold).toBe(s.character.gold);
  });

  it("zweiter Durchgang zählt nur Neues; der zweite Aufstieg schreibt Baselines und Bilanz fort", () => {
    const s = firstRun();
    expect(ascend(s, content)).toBe(true);

    // Fortschritt im zweiten Durchgang.
    s.monsterKills.goblin = (s.monsterKills.goblin ?? 0) + 30;
    s.monsterKills.chicken = (s.monsterKills.chicken ?? 0) + 7;
    s.dungeonsCleared[content.dungeons[0]!.id] = (s.dungeonsCleared[content.dungeons[0]!.id] ?? 0) + 4;
    s.achievements.push(ACH[5]!, ACH[6]!);
    s.character.ownedPets[PETS[2]!] = true;
    s.slayerTasksCompleted += 3;
    s.activePlayMs += 1_500_000;
    s.paragon = { checkpoint: 0, best: 12 };
    for (const id of SKILLS.slice(10, 14)) setLevel(s, id, 99);
    claim(s, "chronicle_01", "chronicle_02", PRESTIGE_UNLOCK_QUEST_ID);
    s.character.gold = 9_999;

    const sum = prestigeRunSummary(s, content);
    expect(sum.run).toBe(2);
    expect(sum.playMs).toBe(1_500_000);
    expect(sum.kills).toBe(37);
    expect(sum.dungeons).toBe(4);
    expect(sum.achievements).toBe(2);
    expect(sum.petsFound).toBe(1);
    expect(sum.slayerTasks).toBe(3);
    expect(sum.paragonBest).toBe(12);
    expect(sum.questsClaimed).toBe(3);
    expect(sum.chronicleChapter).toBe(21);
    expect(sum.skills99).toEqual(SKILLS.slice(10, 14));
    expect(sum.gold).toBe(9_999);

    const pointsBefore = s.prestige.points;
    const counters = prestigeRunCounters(s);
    expect(ascend(s, content)).toBe(true);
    expect(s.prestige.count).toBe(2);
    expect(s.prestige.points - pointsBefore).toBe(sum.points.total);
    expect(s.prestige.runStart).toEqual(counters);
    expect(s.prestige.history).toHaveLength(2);
    expect(s.prestige.history[0]!.tally!.kills).toBe(4626);
    expect(s.prestige.history[1]!.tally).toEqual(tallyOf(sum));
  });

  it("Alt-Pfad: fehlt `runStart` (Test-Save vor E1) oder `prestige` ganz, zählt die Bilanz seit Spielbeginn", () => {
    const s = firstRun();
    s.prestige.count = 1;
    delete (s.prestige as unknown as Record<string, unknown>).runStart;
    const sum = prestigeRunSummary(s, content);
    expect(sum.run).toBe(2);
    expect(sum.kills).toBe(4626);
    expect(sum.playMs).toBe(8_000_000);
    delete (s as unknown as Record<string, unknown>).prestige;
    const sum2 = prestigeRunSummary(s, content);
    expect(sum2.run).toBe(1);
    expect(sum2.kills).toBe(4626);
  });

  it("Baseline über dem aktuellen Zähler (manipuliert) ergibt nie negative Werte", () => {
    const s = fresh();
    s.prestige.runStart = { kills: 50, dungeons: 9, achievements: 9, pets: 9, slayerTasks: 9, activePlayMs: 1e9 };
    const sum = prestigeRunSummary(s, content);
    for (const k of ["playMs", "kills", "dungeons", "achievements", "petsFound", "slayerTasks"] as const) {
      expect(sum[k], k).toBe(0);
    }
  });
});

describe("Narben-Aufschlüsselung (prestigePointsLedger)", () => {
  function sumLines(sum: PrestigeRunSummary): number {
    return sum.points.lines.reduce((a, l) => a + l.points, 0);
  }

  it("feste Zeilen-Reihenfolge; Zeilen summieren exakt auf subtotal, subtotal + fromMult = total = Vorschau", () => {
    const s = firstRun();
    const sum = prestigeRunSummary(s, content);
    const p = prestigePointsPreview(s, content);
    expect(sum.points.lines.map((l) => l.key)).toEqual([...PRESTIGE_POINTS_LINE_KEYS]);
    expect(sumLines(sum)).toBe(sum.points.subtotal);
    expect(sum.points.subtotal + sum.points.fromMult).toBe(sum.points.total);
    expect(sum.points).toEqual(prestigePointsLedger(p));
    expect(sum.points.total).toBe(p.total);
    expect(sum.points.mult).toBe(0);
    expect(sum.points.fromMult).toBe(0);

    const line = Object.fromEntries(sum.points.lines.map((l) => [l.key, l]));
    expect(line.base).toEqual({ key: "base", points: p.fromBase });
    expect(line.skills99).toEqual({ key: "skills99", amount: PRESTIGE_POINTS_CORE_99, points: PRESTIGE_POINTS_CORE_99 * PRESTIGE_POINTS_PER_99 });
    expect(line.skills99Extra).toEqual({ key: "skills99Extra", amount: 1, points: PRESTIGE_POINTS_PER_EXTRA_99 });
    expect(line.totalLevel).toEqual({ key: "totalLevel", amount: p.totalLevel, points: p.fromTotalLevel });
    expect(line.chronicle).toEqual({ key: "chronicle", amount: 2, points: p.fromChronicle });
    expect(line.paragon).toEqual({ key: "paragon", amount: 37, points: p.fromParagon });
  });

  it("frischer Spielstand: alle sechs Zeilen vorhanden, nur der Grundbetrag zählt", () => {
    const sum = prestigeRunSummary(fresh(), content);
    expect(sum.points.lines.map((l) => l.key)).toEqual([...PRESTIGE_POINTS_LINE_KEYS]);
    expect(sum.points.lines.filter((l) => l.points > 0).map((l) => l.key)).toEqual(["base"]);
    expect(sumLines(sum)).toBe(sum.points.total);
  });

  it("mit „Der tiefere Schnitt“: Multiplikator-Zuschlag ausgewiesen, Gutschrift von ascend == total", () => {
    const s = firstRun();
    s.paragon.best = 999; // Paragon-Anteil gedeckelt
    s.prestige.count = 1; // Narbenbuch freigeschaltet
    s.prestige.points = 5;
    s.talents = { ...s.talents, [PRESTIGE_TALENT_TREE_ID]: { pointsBoost: 1 } };
    const sum = prestigeRunSummary(s, content);
    expect(sum.run).toBe(2);
    expect(sum.points.mult).toBe(0.25);
    expect(sum.points.total).toBe(Math.floor(sum.points.subtotal * 1.25));
    expect(sum.points.fromMult).toBe(sum.points.total - sum.points.subtotal);
    expect(sum.points.fromMult).toBeGreaterThan(0);
    expect(sumLines(sum)).toBe(sum.points.subtotal);
    expect(sum.points.lines.find((l) => l.key === "paragon")).toEqual({ key: "paragon", amount: 999, points: 10 });

    expect(ascend(s, content)).toBe(true);
    expect(s.prestige.points).toBe(5 + sum.points.total);
    expect(s.prestige.history.at(-1)!.points).toBe(sum.points.total);
    expect(s.prestige.history.at(-1)!.tally).toEqual(tallyOf(sum));
  });
});
