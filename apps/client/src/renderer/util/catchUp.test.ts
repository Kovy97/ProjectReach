import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { advance, createGame, setActiveAction } from "@hearthforge/engine";
import {
  buildCatchUpSummary,
  catchUpDone,
  catchUpSavedAt,
  extendCatchUp,
  startCatchUp,
  stepCatchUp,
} from "./catchUp";

// claude:2026-10-31T16:34:28+01:00 — Rückkehr in Häppchen (1.4.2): gleiche Tickfolge wie der Einzelaufruf, gefälschte Zeit.

const HOUR = 3_600_000;
// Fester Kalenderanker (kein Date.now im Test): ein Mittwoch, 12:00 UTC.
const WALL_NOW = Date.UTC(2026, 9, 28, 12, 0, 0);

function fresh() {
  const s = createGame({ name: "Test" }, content, 7);
  setActiveAction(s, content, "cut_normal_tree", null);
  return s;
}

function runChunked(totalMs: number, clock: () => number) {
  const s = fresh();
  const job = startCatchUp(s, content, totalMs, WALL_NOW);
  let steps = 0;
  while (!stepCatchUp(job, content, clock)) steps += 1;
  return { s, job, steps: steps + 1 };
}

describe("Rückkehr in Häppchen", () => {
  it("liefert dieselbe Tickfolge wie ein einziger advance-Aufruf (3 h)", () => {
    const total = 3 * HOUR;
    const whole = fresh();
    advance(whole, content, total, { nowMs: WALL_NOW });
    // Gefälschte Uhr, die jedes Häppchen "langsam" aussehen lässt: erzwingt wechselnde Häppchengrößen.
    let tick = 0;
    const { s, steps } = runChunked(total, () => (tick += 90));
    expect(steps).toBeGreaterThan(3);
    expect(s.totalTicks).toBe(whole.totalTicks);
    expect(s.character.gold).toBe(whole.character.gold);
    expect(JSON.stringify(s.skills)).toBe(JSON.stringify(whole.skills));
    expect(JSON.stringify(s.inventory)).toBe(JSON.stringify(whole.inventory));
    expect(JSON.stringify(s.rng)).toBe(JSON.stringify(whole.rng));
    expect(s.accumulatorMs).toBe(whole.accumulatorMs);
  });

  it("schneidet 3 h in Häppchen von höchstens 30 Minuten und zählt Fortschritt, Ende erreicht", () => {
    const s = fresh();
    const job = startCatchUp(s, content, 3 * HOUR, WALL_NOW);
    const before = job.doneMs;
    stepCatchUp(job, content, () => 0);
    expect(job.doneMs - before).toBeLessThanOrEqual(30 * 60_000);
    expect(job.doneMs).toBeGreaterThan(0);
    while (!stepCatchUp(job, content, () => 0)) { /* weiter */ }
    expect(catchUpDone(job)).toBe(true);
    expect(job.doneMs).toBe(job.totalMs);
  });

  it("stempelt savedAt auf den nachgerechneten Stand, nicht auf jetzt, solange Rückstand bleibt", () => {
    const s = fresh();
    const job = startCatchUp(s, content, 3 * HOUR, WALL_NOW);
    expect(catchUpSavedAt(job)).toBe(WALL_NOW - 3 * HOUR);
    stepCatchUp(job, content, () => 0);
    expect(catchUpSavedAt(job)).toBe(WALL_NOW - 3 * HOUR + job.doneMs);
    expect(catchUpSavedAt(job)).toBeLessThan(WALL_NOW);
    while (!stepCatchUp(job, content, () => 0)) { /* weiter */ }
    expect(catchUpSavedAt(job)).toBe(WALL_NOW);
  });

  it("verlängert den Rückstand um die Echtzeit des Nachholens", () => {
    const s = fresh();
    const job = startCatchUp(s, content, 10 * 60_000, WALL_NOW);
    extendCatchUp(job, 5_000);
    expect(job.totalMs).toBe(10 * 60_000 + 5_000);
    extendCatchUp(job, -3);
    extendCatchUp(job, Number.NaN);
    expect(job.totalMs).toBe(10 * 60_000 + 5_000);
  });

  it("baut einen Bericht mit Ertrag, XP und Dauer", () => {
    const total = 2 * HOUR;
    const { s, job } = runChunked(total, () => 0);
    const summary = buildCatchUpSummary(job, content);
    expect(summary.ms).toBe(total);
    expect(summary.xp).toBeGreaterThan(0);
    expect(Object.keys(summary.items).length).toBeGreaterThan(0);
    expect(summary.skillXp.woodcutting?.xp ?? 0).toBeGreaterThan(0);
    expect(s.totalTicks).toBeGreaterThan(0);
  });
});
