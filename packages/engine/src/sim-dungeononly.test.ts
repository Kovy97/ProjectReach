import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { createGame } from "./state";
import { grantAllZones } from "./test-helpers";
import { startCombat } from "./combat";
import { GEARED_HERO, simulateCombat } from "./sim";

/**
 * Welle P (ceo-run-2026-07-13, Chef-Designgesetz „Boss-Kapitel erzwingt den Dungeon"):
 * Der Sim-Balance-Harness misst dungeonOnly-Monster über die gate-neutralisierte Sim-Content-
 * Sicht (sim.ts simCombatContent) — der PRODUKTIONS-Guard (startCombat verweigert dungeonOnly,
 * combat.ts:296) bleibt dabei unangetastet hart. Vor diesem Fix meldete der Report JEDES
 * sub-L100-dungeonOnly-Monster als falschen ⛔-Skill-Band-Wall (startCombat-Refuse ⇒ 0 Kills +
 * 1 „Tod" pro 5-s-Chunk), was Fix-Welle O zwang, die Warband-Flips zu revertieren.
 */
describe("Welle P: Sim-Harness misst dungeonOnly, Produktions-Guard bleibt hart", () => {
  const WARBAND = [
    "goblin_reaver",
    "goblin_pikeman",
    "goblin_siegebrute",
    "goblin_bloodshaman",
    "goblin_warchief",
  ] as const;

  it("Content-Pin: die 5 Warband-Encounter tragen dungeonOnly (Chef-Muster 2026-07-13)", () => {
    for (const id of WARBAND) {
      expect(content.monsters[id]?.dungeonOnly, `${id} muss dungeonOnly sein`).toBe(true);
    }
    // Gegenprobe der bewussten NICHT-Flip-Entscheidung (s. Content-Kommentar am Monster):
    // der Zonen-Nekro hat eine separate dg_-Dungeon-Kopie und bleibt frei kämpfbar.
    expect(content.monsters["skeleton_nekro"]?.dungeonOnly).not.toBe(true);
    expect(content.monsters["dg_skeleton_nekro"]).toBeDefined();
  });

  it("Produktions-Guard: startCombat verweigert JEDES dungeonOnly-Monster auch mit offenen Zonen", () => {
    const s = grantAllZones(createGame({ name: "Guard" }, content, 1), content);
    const dungeonOnlyIds = Object.values(content.monsters)
      .filter((m) => m.dungeonOnly)
      .map((m) => m.id);
    expect(dungeonOnlyIds.length).toBeGreaterThanOrEqual(WARBAND.length);
    for (const id of dungeonOnlyIds) {
      expect(startCombat(s, content, id), `startCombat(${id}) muss false bleiben`).toBe(false);
      expect(s.combat.monsterId).toBe(null);
    }
  });

  it("Balance-Karte: der geared Held killt die Warband-Bosse messbar (kein falscher Skill-Band-Wall)", () => {
    for (const id of WARBAND) {
      const r = simulateCombat(id, 180_000, GEARED_HERO);
      // Vor dem Harness-Fix: kills=0 UND deaths=36 (jeder 5-s-Chunk zählte den Refuse als Tod).
      expect(r.kills, `${id}: geared Held muss Kills erzielen`).toBeGreaterThan(0);
      expect(r.deaths, `${id}: kein Pseudo-Tod durch verweigerten Kampfstart`).toBe(0);
    }
    // Die Sim-Sicht ist ein Klon — der Live-Content behält sein Flag (kein Mutations-Leck).
    for (const id of WARBAND) expect(content.monsters[id]?.dungeonOnly).toBe(true);
  }, 120_000);
});
