import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { SimPlayer } from "./sim-player";
import { RealisticPlayer } from "./sim-realistic";
import {
  checkGoal,
  combatLevel,
  completeQuest,
  describeGoal,
  formatMultiGoalMarkdown,
  formatSimDuration,
  gold,
  killMonster,
  obtainItem,
  ownedItemCount,
  reachTotalLevel,
  skillLevel,
} from "./sim-goals";
import type { SimGoal } from "./sim-goals";
import { PERSONAS, formatPersonaReport, runAllPersonas } from "./sim-personas";

const MIN = 60 * 1000;
const H = 60 * MIN;

describe("sim-goals — checkGoal (Einzel-Checks auf echtem State)", () => {
  it("describeGoal liefert für jede Ziel-Art einen menschlichen Kurznamen", () => {
    const goals: SimGoal[] = [
      combatLevel(25),
      skillLevel("fishing", 30),
      gold(10_000),
      killMonster("cow", 20),
      completeQuest("q_first_steps"),
      obtainItem("normal_log", 5),
      reachTotalLevel(50),
    ];
    for (const g of goals) {
      expect(describeGoal(g).length).toBeGreaterThan(0);
    }
    expect(describeGoal(skillLevel("fishing", 30))).toContain("fishing");
    expect(describeGoal(obtainItem("normal_log", 5))).toContain("normal_log");
  });

  it("misst gold / killMonster / skillLevel / reachTotalLevel korrekt", () => {
    const p = new SimPlayer(content, { seed: 1, creation: { name: "Check" } });
    const s = p.state;

    s.character.gold = 250;
    expect(checkGoal(s, content, gold(500))).toMatchObject({ done: false, progress: 0.5 });
    expect(checkGoal(s, content, gold(250)).done).toBe(true);
    expect(checkGoal(s, content, gold(250)).progress).toBe(1);

    s.monsterKills["chicken"] = 3;
    expect(checkGoal(s, content, killMonster("chicken", 5))).toMatchObject({ done: false, progress: 0.6 });
    expect(checkGoal(s, content, killMonster("chicken", 3)).done).toBe(true);

    p.setSkillLevel("woodcutting", 10);
    expect(checkGoal(s, content, skillLevel("woodcutting", 10)).done).toBe(true);
    const partial = checkGoal(s, content, skillLevel("woodcutting", 20));
    expect(partial.done).toBe(false);
    expect(partial.progress).toBeGreaterThan(0);
    expect(partial.progress).toBeLessThan(1);
    expect(partial.detail).toContain("woodcutting Lv 10/20");

    const base = Object.keys(content.skills).length;
    expect(checkGoal(s, content, reachTotalLevel(base)).done).toBe(true);
    const tl = checkGoal(s, content, reachTotalLevel(base + 18)); // woodcutting 10 = +9 über Basis
    expect(tl.done).toBe(false);
    expect(tl.progress).toBeCloseTo(0.5, 5);
  });

  it("obtainItem zählt Inventar + Lager (ownedItemCount)", () => {
    const p = new SimPlayer(content, { seed: 2, creation: { name: "Owner" } });
    p.give("normal_log", 5);
    p.deposit("normal_log", 2);
    expect(ownedItemCount(p.state, "normal_log")).toBe(5);
    expect(checkGoal(p.state, content, obtainItem("normal_log", 10))).toMatchObject({ done: false, progress: 0.5 });
    expect(checkGoal(p.state, content, obtainItem("normal_log", 5)).done).toBe(true);
  });

  it("obtainItem zeigt Trainings-Routen-Fortschritt statt 0 % (Sweep6 T4-#6)", () => {
    // T4-Repro: obtainItem(rune_arcane_ii) bei RC 30 (Rezept-Gate darüber) stand im Bericht auf
    // „◐ 0 %", obwohl die Trainings-Route aktiv lief — jetzt zählt der XP-Fortschritt Richtung
    // Rezept-Level anteilig (gekappt bei 50 %; die zweite Hälfte bleibt dem Besitz).
    const p = new SimPlayer(content, { seed: 6, creation: { name: "Route" } });
    const goal = obtainItem("rune_arcane_ii", 1);
    p.setSkillLevel("runecrafting", 30);
    const c = checkGoal(p.state, content, goal);
    expect(c.done).toBe(false);
    expect(c.progress).toBeGreaterThan(0);
    expect(c.progress).toBeLessThanOrEqual(0.5);
    expect(c.detail).toContain("Route: runecrafting Lv 30/");
    // Monoton: mehr Skill-XP ⇒ mehr progress (solange das Gate zu ist); Besitz dominiert weiter.
    p.setSkillLevel("runecrafting", 35);
    expect(checkGoal(p.state, content, goal).progress).toBeGreaterThan(c.progress);
    p.give("rune_arcane_ii", 1);
    expect(checkGoal(p.state, content, goal).done).toBe(true);
    // FREIGESCHALTETE Quellen brauchen den Proxy nicht (Besitz bewegt sich dort selbst) —
    // kein Phantom-„Route"-Fortschritt für längst zugängliche Items.
    const unlockedSrc = checkGoal(p.state, content, obtainItem("crude_bone", 5));
    expect(unlockedSrc.detail).not.toContain("Route");
    expect(unlockedSrc.progress).toBe(0);
  });

  it("completeQuest misst Objective-Fortschritt und erkennt Erfüllung engine-seitig", () => {
    const p = new SimPlayer(content, { seed: 3, creation: { name: "Quester" } });
    const goal = completeQuest("q_first_steps"); // 5× chicken erlegen
    expect(checkGoal(p.state, content, goal)).toMatchObject({ done: false, progress: 0 });
    p.state.monsterKills["chicken"] = 2;
    expect(checkGoal(p.state, content, goal).progress).toBeCloseTo(0.4, 5);
    p.state.monsterKills["chicken"] = 5;
    expect(checkGoal(p.state, content, goal).done).toBe(true);
    // Unbekannte Quest crasht nicht, sondern meldet sich im Detail.
    const nope = checkGoal(p.state, content, completeQuest("__nope__"));
    expect(nope.done).toBe(false);
    expect(nope.detail).toContain("existiert nicht");
  });
});

describe("RealisticPlayer.pursue — Multi-Goal-Scheduler", () => {
  it("erreicht mindestens 2 von 3 Zielen im Spielzeit-Budget (ehrlich, ohne Cheats)", () => {
    // Budget-Re-Pin 6 h → 8 h [Itemization 2.0]: die Frühwelt ist BEWUSST härter (5s-Kill-Cooldown
    // + kein Natur-Regen + neue Ökonomie ⇒ ~20-30 % langsameres Frühgame, Chef-gewollt) — das
    // Budget bildet das ab, die Messlatte (≥2/3 Ziele, ehrlich) bleibt unverändert.
    // Stand [#279 Verkaufs-Ökonomie] (Monster-Gold = 0, Gold NUR noch via Verkaufen — der Sim-
    // Spieler versilbert seine Material-Überschüsse selbst) + [Food-Pass #5] (Waffen ×1,25/Tier,
    // Hybrid-Food ~18 % maxHp @4,5-s-Takt): Seed 5 erreicht 2/3 — woodcutting 15 nach ~34 Min,
    // gold(500) latcht nach ~35 Min (Verkaufs-Windfall; die Zielgeraden-Reserve wird seit dem
    // Food-Pass-Fix direkt nach den Einkommens-Ereignissen des Fensters nachgezogen, sonst fraß
    // der Food-Restock den Windfall im selben Fenster wieder auf). Das KAMPF-Ziel bleibt offen
    // (CL 5/10 nach 8 h, 16 Tode an on-level-Frühwelt-Mobs — „Rüstung ist Pflicht"-Druck,
    // Chef-gewollt). Die 500er-Gold-Schwelle blieb bewusst UNVERÄNDERT zur Kill-Gold-Ära.
    const rp = new RealisticPlayer(content, { seed: 5, style: "melee", name: "Multi" });
    const res = rp.pursue([combatLevel(10), skillLevel("woodcutting", 15), gold(500)], { budgetMs: 8 * H });
    const achieved = res.goals.filter((g) => g.achieved).length;
    expect(achieved).toBeGreaterThanOrEqual(2);
    expect(res.goals).toHaveLength(3);
    expect(res.totalSimMs).toBeLessThanOrEqual(8 * H);
    for (const g of res.goals) {
      expect(g.progress).toBeGreaterThanOrEqual(0);
      expect(g.progress).toBeLessThanOrEqual(1);
      if (g.achieved) {
        expect(g.progress).toBe(1);
        expect(g.simTimeMs).toBeLessThanOrEqual(res.totalSimMs);
      }
    }
    // Alle Ziele erreicht ⇒ der Lauf steigt VOR dem Budget-Ende aus.
    if (res.allAchieved) expect(res.totalSimMs).toBeLessThan(8 * H);
  });

  it("ist bit-deterministisch: gleiche Seed ⇒ identisches MultiGoalResult", () => {
    const run = () => {
      const rp = new RealisticPlayer(content, { seed: 21, style: "melee", name: "Det" });
      return JSON.stringify(rp.pursue([combatLevel(5), skillLevel("woodcutting", 8), gold(150)], { budgetMs: 2 * H }));
    };
    expect(run()).toBe(run());
  });

  it("rotiert bei Blockade: ein unerreichbares Ziel stoppt die anderen nicht", () => {
    const rp = new RealisticPlayer(content, { seed: 9, style: "melee", name: "Rotor" });
    const res = rp.pursue([killMonster("__ghost__", 5), skillLevel("woodcutting", 5), gold(100)], { budgetMs: 2 * H });
    const ghost = res.goals[0]!;
    expect(ghost.achieved).toBe(false);
    expect(ghost.blocked).toBe(true);
    expect(ghost.note).toContain("existiert nicht");
    // Die anderen Ziele laufen trotzdem durch.
    expect(res.goals[1]!.achieved).toBe(true);
    expect(res.goals[2]!.achieved).toBe(true);
    // Die Blockade ist als Friction dokumentiert (realistisches Spieler-Feedback).
    expect(res.frictions.some((f) => f.what.includes("blockiert"))).toBe(true);
  });

  it("liefert monoton steigende Fortschritts-Werte (Hochwassermarke, latchend)", () => {
    const rp = new RealisticPlayer(content, { seed: 13, style: "melee", name: "Mono" });
    const res = rp.pursue([combatLevel(8), skillLevel("woodcutting", 10), gold(300)], { budgetMs: 3 * H });
    for (const g of res.goals) {
      expect(g.progressSamples.length).toBeGreaterThan(0);
      for (let i = 1; i < g.progressSamples.length; i++) {
        expect(g.progressSamples[i]!).toBeGreaterThanOrEqual(g.progressSamples[i - 1]!);
      }
      expect(g.progress).toBeGreaterThanOrEqual(g.progressSamples[g.progressSamples.length - 1]!);
    }
  });
});

describe("formatMultiGoalMarkdown — Bericht für Sweep-Agenten", () => {
  it("zeigt ✅/◐/❌ je Ziel samt WARUM und dem SPIELZEIT-Hinweis", () => {
    const snapshot = new SimPlayer(content, { seed: 1, creation: { name: "Fmt" } }).snapshot();
    const md = formatMultiGoalMarkdown({
      name: "Report",
      totalSimMs: 4 * H,
      allAchieved: false,
      frictions: [],
      snapshot,
      log: [],
      goals: [
        {
          goal: skillLevel("woodcutting", 5),
          description: "woodcutting auf Level 5",
          achieved: true,
          progress: 1,
          simTimeMs: 18 * MIN,
          blocked: false,
          detail: "woodcutting Lv 6/5",
          progressSamples: [0.4, 1],
        },
        {
          goal: killMonster("__ghost__", 5),
          description: "5× __ghost__ erlegen",
          achieved: false,
          progress: 0,
          simTimeMs: 4 * H,
          blocked: true,
          note: "Monster __ghost__ existiert nicht im Content",
          detail: "0/5 __ghost__ (unbekanntes Monster!)",
          progressSamples: [0, 0],
        },
        {
          goal: reachTotalLevel(999),
          description: "Gesamtlevel 999 erreichen",
          achieved: false,
          progress: 0.02,
          simTimeMs: 4 * H,
          blocked: false,
          detail: "Gesamtlevel 39/999",
          progressSamples: [0.01, 0.02],
        },
      ],
    });
    expect(md).toContain("# Multi-Goal-Report — Report");
    expect(md).toContain("**Ziele:** 1/3 erreicht");
    expect(md).toContain("| woodcutting auf Level 5 | ✅ | woodcutting Lv 6/5 | 18 min |");
    expect(md).toContain("❌ blockiert");
    expect(md).toContain("Monster __ghost__ existiert nicht im Content");
    expect(md).toContain("◐ 2 %");
    expect(md).toContain("Nicht erreicht — warum:");
    expect(md).toContain("SPIELZEIT");
  });

  it("formatSimDuration rendert Spielzeit menschenlesbar", () => {
    expect(formatSimDuration(90 * MIN)).toBe("1 h 30 min");
    expect(formatSimDuration(45 * MIN)).toBe("45 min");
  });
});

describe("Persona-Integration — allrounder (Multi-Goal-Referenz)", () => {
  it("ist registriert und liefert ein MultiGoalResult mit 3 Zielen", () => {
    expect(PERSONAS.some((p) => p.id === "allrounder")).toBe(true);
    const results = runAllPersonas(content, { seed: 4, budgetMs: 30 * MIN, only: ["allrounder"] });
    expect(results).toHaveLength(1);
    const r = results[0]!;
    expect(r.multiGoal).toBeDefined();
    expect(r.multiGoal!.goals).toHaveLength(3);
    expect(r.summary).toContain("Ziele");
    // Der Persona-Report rendert den Multi-Goal-Block mit.
    const md = formatPersonaReport(results);
    expect(md).toContain("Multi-Goal — allrounder");
    expect(md).toContain("| Ziel | Status | Stand | Spielzeit |");
  });
});
