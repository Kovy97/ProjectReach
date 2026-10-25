// claude:2026-10-25T14:57:00+01:00 — 1.4.1 Slayer A (Chef-GO 25.10.2026): der Turm füllt seinen Pool nicht mehr mit Monstern unter
// CL − TOWER_TASK_LEVEL_MAX_UNDER auf, solange es Welt-Aufträge gibt; zu wenige Turm-Kandidaten auf Niveau teilen sich
// einen Topf mit dem Welt-Pool. Echter Content, synthetischer Immer-Turm-Master (wie die Welle-LL-Tests in slayer.test.ts).
import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { ContentDB, SlayerMasterDef } from "@hearthforge/shared";
import { createGame } from "./state";
import { xpForLevel } from "./leveling";
import { assignTask, TOWER_TASK_LEVEL_MAX_UNDER, worldTaskMonsters } from "./slayer";

function setCombatLevel(s: ReturnType<typeof createGame>, lvl: number): void {
  for (const id of ["attack", "power", "defence", "ranged", "magic", "warding", "vitality"]) s.skills[id] = { xp: xpForLevel(lvl) };
}

const turmMaster: SlayerMasterDef = {
  id: "a141_tower_master",
  name: "A141",
  unlock: { combatLevel: 1, slayerLevel: 1 },
  taskPool: [],
  towerTaskChance: 1,
  taskAmount: { min: 5, max: 10 },
  basePoints: 5,
  skipCost: 10,
};
const rc: ContentDB = { ...content, slayerMasters: [...(content.slayerMasters ?? []), turmMaster] };

function stand(cl: number, sl: number, seed: number): ReturnType<typeof createGame> {
  const s = createGame({ name: "X" }, rc, seed);
  setCombatLevel(s, cl);
  s.skills["slayer"] = { xp: xpForLevel(sl) };
  for (const req of ["plague_mask", "mirror_ward", "ear_plugs", "soul_veil", "void_anchor"]) s.bank[req] = 1;
  return s;
}

describe("slayer — 1.4.1 A: Turm-Pool ohne Auffüllen nach unten", () => {
  // Vorher (Nachrechnung 25.10.): Slayer 45 / CL 57 zog Etage-3-Mobs L48 und L50, Slayer 61 / CL 70 den void_stalker L66.
  for (const [sl, cl] of [[45, 57], [45, 59], [61, 70], [61, 74], [61, 78]] as const) {
    it(`Slayer ${sl} / CL ${cl}: kein Turm-Auftrag unter CL − 3, Welt-Aufträge füllen den Topf`, () => {
      const s = stand(cl, sl, 41 + cl);
      expect(worldTaskMonsters(s, rc).length, "Welt hat Aufträge").toBeGreaterThan(0);
      let turm = 0;
      let welt = 0;
      for (let i = 0; i < 200; i++) {
        const t = assignTask(s, rc, "a141_tower_master")!;
        expect(t).not.toBeNull();
        const m = rc.monsters[t.monsterId]!;
        if (t.isTower) {
          turm++;
          expect(m.slayerFloor ?? m.zone, `${t.monsterId} als Turm-Auftrag`).toBeTruthy();
          expect(m.level, `Trivial-Ziel ${t.monsterId} (L${m.level})`).toBeGreaterThanOrEqual(cl - TOWER_TASK_LEVEL_MAX_UNDER);
        } else {
          welt++;
          expect(m.zone).not.toBe("slayer_tower");
        }
        s.slayerTask = null;
      }
      expect(turm, "Turm-Gegner auf Niveau bleiben im Topf").toBeGreaterThan(0);
      expect(welt, "gemeinsamer Topf mit dem Welt-Pool").toBeGreaterThan(0);
    });
  }

  it("deterministisch: gleicher Seed und Stand ergeben dieselbe Auftragsfolge", () => {
    const folge = (): string[] => {
      const s = stand(70, 61, 7);
      const out: string[] = [];
      for (let i = 0; i < 30; i++) {
        out.push(assignTask(s, rc, "a141_tower_master")!.monsterId);
        s.slayerTask = null;
      }
      return out;
    };
    expect(folge()).toEqual(folge());
  });
});
