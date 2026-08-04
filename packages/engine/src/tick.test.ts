import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { createGame } from "./state";
import { setActiveAction } from "./actions";
import { advance } from "./tick";
import { itemCount, usedSlots } from "./inventory";
import { xpForLevel } from "./leveling";

function newGame(seed: number) {
  return createGame({ name: "Test" }, content, seed);
}

describe("engine", () => {
  it("ist deterministisch bei gleicher Seed", () => {
    const run = () => {
      const s = newGame(12345);
      setActiveAction(s, content, "cut_normal_tree");
      advance(s, content, 60_000);
      s.character.createdAt = 0; // Wall-Clock-Metadaten neutralisieren
      return s;
    };
    expect(run()).toEqual(run());
  });

  it("sammelt XP und Loot, solange eine Aktion aktiv ist", () => {
    const s = newGame(1);
    // Über L40 setzen → Frühgame-XP-Verstärker = 1, damit die Erwartung exakt bleibt.
    s.skills.woodcutting = { xp: xpForLevel(45) };
    const before = s.skills.woodcutting.xp;
    setActiveAction(s, content, "cut_normal_tree"); // 3 s pro Abschluss
    advance(s, content, 30_000); // → 10 Abschlüsse

    // 10 Abschlüsse × aktuelle Aktion-XP (oberhalb L40 ohne Frühgame-Lift).
    expect((s.skills.woodcutting?.xp ?? 0) - before).toBe(10 * content.actions.cut_normal_tree!.xp);
    expect(itemCount(s.inventory, "normal_log")).toBe(10);
  });

  it("macht ohne aktive Aktion keinen Fortschritt", () => {
    const s = newGame(1);
    advance(s, content, 30_000);
    expect(s.skills.woodcutting).toBeUndefined();
    expect(itemCount(s.inventory, "normal_log")).toBe(0); // nichts gesammelt
  });

  it("advance: nicht-endliches/nicht-positives dt ist ein No-op (accumulator bleibt endlich)", () => {
    const s = newGame(1);
    setActiveAction(s, content, "cut_normal_tree");
    // NaN darf `accumulatorMs` NICHT dauerhaft vergiften (jeder folgende advance wäre sonst tot).
    expect(advance(s, content, Number.NaN)).toBe(0);
    expect(Number.isFinite(s.accumulatorMs)).toBe(true);
    expect(advance(s, content, Number.POSITIVE_INFINITY)).toBe(0);
    expect(advance(s, content, -5000)).toBe(0);
    expect(Number.isFinite(s.accumulatorMs)).toBe(true);
    // Danach läuft ein normaler Sprung weiterhin (Uhr wurde nicht vergiftet).
    expect(advance(s, content, 30_000)).toBeGreaterThan(0);
    expect(itemCount(s.inventory, "normal_log")).toBeGreaterThan(0);
  });
});
