import { describe, expect, it } from "vitest";
import { content as base } from "@hearthforge/content";
import type { ContentDB, DungeonDef, GameState, RaidDef, RaidDifficulty, SlayerMasterDef } from "@hearthforge/shared";
import { DUNGEON_VARIANT_PREFIX, ELITE_WINDOW_MS, SLAYER_POINTS_PER_CHAMPION_KILL, SLAYER_POINTS_PER_RAID_BOSS } from "@hearthforge/shared";
import { createGame } from "./state";
import { createTestGame } from "./test-helpers";
import { xpForLevel } from "./leveling";
import { combatStep } from "./combat";
import { startEliteCombat } from "./elites";
import { onRaidRoomCleared, startRaid } from "./raid";
import {
  WORLD_TASK_EHP_PER_POINT,
  assignTask,
  scaledTaskPoints,
  taskPointReward,
  towerTaskPointsMult,
  worldTaskEffortPoints,
} from "./slayer";

/**
 * claude:2026-10-25T10:32:00+01:00 — 1.4.1 Slayer-Punkte (Chef-Freigabe 25.10.2026):
 *  S3 Welt-Aufträge zahlen mindestens nach Aufwand: max(scaledTaskPoints, round(N × (maxHp + Ward) / 1.000)); Turm unverändert.
 *  S4 flache Zusatzquellen: Champion-Kill +20, Raid-Hallen-Boss +10/+25/+50 (Normal/Heroisch/Mythisch), ohne Multiplikatoren.
 */
const content = base;
const master: SlayerMasterDef = content.slayerMasters!.find((m) => m.id === "brenna_ashwick")!;
const worldMonsters = Object.values(content.monsters).filter(
  (m) => m.slayerFloor == null && m.zone !== "slayer_tower" && !m.dungeonOnly && !m.id.startsWith(DUNGEON_VARIANT_PREFIX),
);
const towerMonsters = Object.values(content.monsters).filter((m) => m.slayerFloor != null);

describe("S3 Welt-Aufträge nach Aufwand", () => {
  it("Formel: Maximum aus Boden und Aufwand, nie weniger als scaledTaskPoints (jedes Welt-Monster, N 15…50)", () => {
    expect(WORLD_TASK_EHP_PER_POINT).toBe(1000);
    for (const m of worldMonsters) {
      for (const n of [master.taskAmount.min, 20, 32, 41, master.taskAmount.max]) {
        const floor = scaledTaskPoints(master, n);
        const effort = Math.round((n * (m.maxHp + (m.wardCapacity ?? 0))) / 1000);
        const got = taskPointReward(content, master, m.id, false, n);
        expect(got, `${m.id} n=${n}`).toBe(Math.max(floor, effort));
        expect(got).toBeGreaterThanOrEqual(floor);
        expect(worldTaskEffortPoints(content, m.id, n)).toBe(effort);
      }
    }
  });

  it("Messbeispiele Endgame-Pool: Schreckenswolf und Nekromant zahlen nach Aufwand, Schnell-Monster nur den Boden", () => {
    expect(taskPointReward(content, master, "dire_wolf", false, 40)).toBe(18); // 40 × 448 / 1.000
    expect(taskPointReward(content, master, "skeleton_nekro", false, 44)).toBe(16); // 44 × (281 + 84 Ward) / 1.000
    expect(taskPointReward(content, master, "forest_hare", false, 40)).toBe(scaledTaskPoints(master, 40)); // 36 HP: Boden
    expect(taskPointReward(content, master, "iron_sentinel", false, 30)).toBe(scaledTaskPoints(master, 30)); // 3,9 < Boden 5
  });

  it("Turm-Aufträge bleiben bit-identisch (scaledTaskPoints × Etagen-Zuschlag)", () => {
    for (const m of towerMonsters) {
      for (const n of [15, 32, 50]) {
        const old = Math.max(1, Math.round(scaledTaskPoints(master, n) * towerTaskPointsMult(content, m.id, true)));
        expect(taskPointReward(content, master, m.id, true, n), `${m.id} n=${n}`).toBe(old);
      }
    }
  });

  it("Frühspiel (Kampflevel 30, Weide): jeder vergebene Auftrag zahlt exakt den alten Boden", () => {
    const s = createGame({ name: "Früh" }, content, 5);
    for (const id of ["attack", "power", "defence", "vitality", "ranged", "magic", "warding"]) s.skills[id] = { xp: xpForLevel(30) };
    for (let i = 0; i < 40; i++) {
      const t = assignTask(s, content, master.id)!;
      expect(t.isTower).toBe(false);
      expect(t.pointReward).toBe(scaledTaskPoints(master, t.required));
      s.slayerTask = null;
    }
  });

  it("assignTask fixiert taskPointReward (Endgame, alle Zonen offen, Turm und Welt gemischt)", () => {
    const s = createTestGame({ name: "End" }, content, 6);
    for (const id of Object.keys(content.skills)) s.skills[id] = { xp: xpForLevel(99) };
    let world = 0;
    for (let i = 0; i < 60; i++) {
      const t = assignTask(s, content, master.id)!;
      expect(t.pointReward).toBe(taskPointReward(content, master, t.monsterId, t.isTower, t.required));
      if (!t.isTower) world++;
      s.slayerTask = null;
    }
    expect(world).toBeGreaterThan(0);
  });
});

describe("S4 Champion-Kill: +20 Slayer-Punkte, flach", () => {
  it("jeder Champion-Kill zahlt SLAYER_POINTS_PER_CHAMPION_KILL, auch mit Jagdtempo und ohne Auftrag; Breadcrumb trägt den Betrag", () => {
    expect(SLAYER_POINTS_PER_CHAMPION_KILL).toBe(20);
    const variant = {
      id: "test_points_champion",
      zone: "pastures",
      baseMonsterId: "chicken",
      name: { en: "Test Champion" },
      statMults: { hp: 1, damage: 1 },
      uniqueItemId: "rusty_sword",
      uniqueDropChance: 0,
      uniqueSuffixChance: 0,
    };
    const c: ContentDB = { ...content, elites: { [variant.id]: variant } };
    const s = createGame({ name: "Champ", baseAttributes: { str: 80, dex: 80, con: 80 } }, c, 7);
    s.skills.slayer = { xp: xpForLevel(99) };
    s.talents = { slayer: { pace: 3 } }; // Jagdtempo wirkt nur auf Aufträge, nicht auf diese Quelle
    for (let k = 1; k <= 2; k++) {
      s.eliteZones.pastures = { variantId: variant.id, remainingMs: ELITE_WINDOW_MS };
      expect(startEliteCombat(s, c, "pastures")).toBe(true);
      const before = s.slayerPoints;
      s.combat.enemyHp = 0.5;
      let guard = 0;
      while (s.combat.monsterId !== null && guard++ < 2000) combatStep(s, c);
      expect(s.slayerPoints - before).toBe(20);
      expect(s.lastEliteKill?.slayerPoints).toBe(20);
      expect(s.eliteKillSeq).toBe(k);
    }
  });
});

describe("S4 Raid: Hallen-Boss +10/+25/+50 nach Stufe", () => {
  function raidContent(): ContentDB {
    const rooms: DungeonDef[] = [1, 2].map((i) => ({
      id: `pts_room_${i}`,
      name: { en: `Room ${i}`, de: `Raum ${i}` },
      requiredLevel: 1,
      encounters: ["goblin", "goblin", "goblin", "goblin", "goblin_warchief"],
      raidOnly: true,
      loot: [],
      xp: 0,
      gold: 0,
    }));
    const def: RaidDef = {
      id: "pts_raid",
      name: { en: "Test Raid", de: "Test-Raid" },
      unlockDungeonId: base.dungeons[0]!.id,
      rooms: rooms.map((d, i) => ({
        id: `r${i}`,
        name: d.name,
        dungeonId: d.id,
        bossId: "goblin_warchief",
        table: { draws: 1, extraChance: 0, entries: [{ itemId: "copper_sword", weight: 1 }] },
      })),
      fees: { normal: 1000, heroic: 3000, mythic: 8000 },
      heroicRestartCost: 500,
      mythicRefundPct: 0.25,
      scaling: {
        normal: { hpMult: 1, damageMult: 1, levelAdd: 0, defenseMult: 1 },
        heroic: { hpMult: 2, damageMult: 1.6, levelAdd: 10, defenseMult: 1.1 },
        mythic: { hpMult: 2.4, damageMult: 1.85, levelAdd: 20, defenseMult: 1.2 },
      },
      reinforcedWave: { index: 3, hpMult: 1.5, damageMult: 1.15 },
      trashLoot: [],
      trashPieceChance: { normal: 0, heroic: 0, mythic: 0 },
      bossSideLoot: [],
      suffixChance: { normal: 0, heroic: 0, mythic: 0 },
      weeklyChest: { extraItems: [], dust: { normal: 0, heroic: 0, mythic: 0 } },
      maxAutoRestarts: 3,
    };
    return { ...base, dungeons: [...base.dungeons, ...rooms], raids: [def] };
  }

  for (const [difficulty, want] of [["normal", 10], ["heroic", 25], ["mythic", 50]] as Array<[RaidDifficulty, number]>) {
    it(`${difficulty}: jeder Boss +${want}, ohne Multiplikatoren`, () => {
      expect(SLAYER_POINTS_PER_RAID_BOSS[difficulty]).toBe(want);
      const c = raidContent();
      const s: GameState = createTestGame({ name: "R" }, c, 9);
      for (const id of Object.keys(c.skills)) s.skills[id] = { xp: xpForLevel(99) };
      s.dungeonsCleared[c.raids![0]!.unlockDungeonId] = 1;
      s.raid!.clears = { normal: 1, heroic: 1, mythic: 0 };
      s.character.gold = 100_000;
      s.talents = { slayer: { pace: 3 } };
      expect(startRaid(s, c, "pts_raid", difficulty)).toBe("ok");
      s.combat.encounterIndex = 4;
      const p0 = s.slayerPoints;
      onRaidRoomCleared(s, c);
      expect(s.slayerPoints - p0).toBe(want);
      expect(s.raid!.run!.phase).toBe("rest");
    });
  }
});
