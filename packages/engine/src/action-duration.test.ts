import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { TICK_MS } from "@hearthforge/shared";
import { createGame } from "./state";
import { setActiveAction } from "./actions";
import { advance, effectiveActionDurationMs } from "./tick";
import { itemCount } from "./inventory";
import { xpForLevel } from "./leveling";

// Regression-Schutz für die Fortschrittsleiste: die UI teilt `actionProgressMs` durch
// `effectiveActionDurationMs(...)`. Genau dieser Wert muss der Punkt sein, an dem die ENGINE die
// Aktion abschließt — sonst resettet die Bar vor (oder nach) 100 % (Chef-Bug: „resettet bevor sie
// das Ende erreicht", sobald Werkzeug/Mastery beschleunigen).
describe("effectiveActionDurationMs ↔ Engine-Abschluss (Fortschrittsleiste)", () => {
  const ACTION = "cut_normal_tree";
  const OUTPUT = "normal_log";

  it("ohne Speed-Bonus = Basis-Dauer", () => {
    const s = createGame({ name: "X" }, content, 1);
    const action = content.actions[ACTION]!;
    expect(effectiveActionDurationMs(s, content, action)).toBe(action.durationMs);
  });

  it("mit Mastery-Speed < Basis-Dauer", () => {
    const s = createGame({ name: "X" }, content, 1);
    const action = content.actions[ACTION]!;
    s.mastery[ACTION] = { xp: xpForLevel(51) }; // Tempo-Bonus aktiv (masterySpeedMult(51) < 1)
    expect(effectiveActionDurationMs(s, content, action)).toBeLessThan(action.durationMs);
  });

  it("Engine schließt exakt bei effectiveActionDurationMs ab (= UI-Nenner)", () => {
    const s = createGame({ name: "X" }, content, 1);
    const action = content.actions[ACTION]!;
    // Beschleunigt → effektive Dauer liegt unter der Basis; vor dem ersten Abschluss bleibt die
    // Mastery-XP konstant, also ist effDur bis dahin stabil.
    s.mastery[ACTION] = { xp: xpForLevel(51) };
    const effDur = effectiveActionDurationMs(s, content, action);
    const ticksToComplete = Math.ceil(effDur / TICK_MS);

    setActiveAction(s, content, ACTION);

    // Einen Tick VOR dem rechnerischen Abschluss: noch kein Ertrag, Aktion läuft weiter.
    advance(s, content, (ticksToComplete - 1) * TICK_MS);
    expect(itemCount(s.inventory, OUTPUT)).toBe(0);
    expect(s.activeActionId).toBe(ACTION);

    // Der entscheidende Tick erreicht effDur → genau jetzt fällt der erste Ertrag.
    advance(s, content, TICK_MS);
    expect(itemCount(s.inventory, OUTPUT)).toBeGreaterThanOrEqual(1);
  });
});

// ── Das Lager: Skill-Tempo im Aktions-Pfad (Task #359, encampment-balance.md §3) ────────────────

/**
 * Der Lager-Tempo-Faktor lebt in `effectiveActionDurationMs` — EIN gemeinsamer Multiplikator-Hook
 * (keine Sonderwege je Skill, encampment-konzept.md „Technische Leitplanken"). Engine-Abschluss und
 * UI-Fortschrittsleiste teilen ihn damit automatisch.
 */
describe("Lager-Tempo im Aktions-Pfad", () => {
  /** Setzt EIN Lager-Gebäude auf eine Stufe (inkl. buildSeq — Cache-Vertrag aus camp.ts). */
  function withBuilding(id: string, level: number): ReturnType<typeof createGame> {
    const s = createGame({ name: "Lager" }, content, 1);
    s.camp.buildings[id] = level;
    s.camp.buildSeq += 1;
    return s;
  }

  it("Sägeplatz I/II/III verkürzt Holzfällen um 5/10/15 % (auf die Basis-Dauer)", () => {
    const action = content.actions.cut_normal_tree!;
    for (const [level, cut] of [[1, 0.05], [2, 0.10], [3, 0.15]] as const) {
      const s = withBuilding("camp_sawpit", level);
      expect(effectiveActionDurationMs(s, content, action), `Stufe ${level}`).toBe(
        Math.round(action.durationMs * (1 - cut)),
      );
    }
  });

  it("wirkt NUR auf den eigenen Skill (Sägeplatz beschleunigt kein Bergbau)", () => {
    const s = withBuilding("camp_sawpit", 3);
    const bare = createGame({ name: "Ohne" }, content, 1);
    const mining = Object.values(content.actions).find((a) => a.skill === "mining")!;
    expect(effectiveActionDurationMs(s, content, mining)).toBe(
      effectiveActionDurationMs(bare, content, mining),
    );
  });

  it("Werkhof beschleunigt ALLE 7 Handwerks-Skills um 9 % (eine gemeinsame Art; seit SAVE 86 auch Schneidern)", () => {
    const s = withBuilding("camp_workyard", 3);
    const crafts = ["smithing", "cooking", "leatherworking", "tailoring", "jewelcrafting", "runecrafting", "herblore"];
    for (const skill of crafts) {
      const action = Object.values(content.actions).find((a) => a.skill === skill);
      if (!action) continue;
      expect(effectiveActionDurationMs(s, content, action), skill).toBe(
        Math.round(action.durationMs * 0.91),
      );
    }
  });

  it("Feldgarten beschleunigt FORAGING über den Aktions-Pfad (12 %)", () => {
    const s = withBuilding("camp_seed_garden", 3);
    const action = Object.values(content.actions).find((a) => a.skill === "foraging")!;
    expect(effectiveActionDurationMs(s, content, action)).toBe(
      Math.round(action.durationMs * 0.88),
    );
  });

  it("Engine-Abschluss folgt dem Lager-Wert (Fortschrittsleiste bleibt synchron)", () => {
    const s = withBuilding("camp_sawpit", 3);
    const action = content.actions.cut_normal_tree!;
    const dur = effectiveActionDurationMs(s, content, action);
    expect(dur).toBeLessThan(action.durationMs);
    // Die effektive Dauer ist kein Vielfaches von TICK_MS → auf das Tick-Raster aufrunden
    // (Muster des Basis-Tests oben).
    const ticksToComplete = Math.ceil(dur / TICK_MS);
    setActiveAction(s, content, "cut_normal_tree");
    // Einen Tick VOR dem rechnerischen Abschluss darf noch nichts gedroppt sein …
    advance(s, content, (ticksToComplete - 1) * TICK_MS);
    expect(itemCount(s.inventory, "normal_log")).toBe(0);
    // … und mit dem Tick, der die Dauer erreicht, schließt die Engine ab.
    advance(s, content, TICK_MS);
    expect(itemCount(s.inventory, "normal_log")).toBeGreaterThan(0);
  });
});
