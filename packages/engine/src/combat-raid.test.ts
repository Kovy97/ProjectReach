import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContentDB, DungeonDef, ItemDef, MonsterDef, RaidDef, RaidRun, RaidWeeklyModifierId } from "@hearthforge/shared";
import { ARMOR_PEN_CAP, DEFENSE_MITIGATION_K, defaultRaidState } from "@hearthforge/shared";
import { content } from "@hearthforge/content";
import { createGame } from "./state";
import { computeStats } from "./character";
import { beginDungeonRun } from "./dungeon";
import { combatMonsterView, combatStep, startCombat } from "./combat";

/**
 * claude:2026-10-25T06:40:00+02:00 — Raid-Anbindung im Kampf (1.4.0 Welle 4): Gegner-Auflösung Paragon → Elite → Raid →
 * Content, Wellen-Kill/Raum-Abschluss/Tod/Patt an engine/raid.ts, Phasenwerte × Raid-Faktoren (Spec §3 Regel 5) und die
 * Spielerseite der Wochen-Modifikatoren (§7). Die drei raid.ts-Hooks sind hier Spione (ihr Inhalt gehört raid.ts);
 * activeRaidFight, raidCombatMonster und die Faktoren laufen echt. Synthetischer Test-Content.
 */
vi.mock("./raid", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./raid")>();
  return {
    ...actual,
    onRaidMonsterKilled: vi.fn(),
    onRaidRoomCleared: vi.fn(),
    onRaidDefeat: vi.fn(),
  };
});
import * as raid from "./raid";

const killedSpy = vi.mocked(raid.onRaidMonsterKilled);
const clearedSpy = vi.mocked(raid.onRaidRoomCleared);
const defeatSpy = vi.mocked(raid.onRaidDefeat);

function mob(id: string, fields: Partial<MonsterDef>): MonsterDef {
  return {
    id,
    name: { en: id, de: id },
    level: 300,
    maxHp: 1000,
    damage: 4,
    accuracy: 100_000,
    evasion: 0,
    defense: 50,
    attackIntervalMs: 3000,
    xp: 0,
    gold: 0,
    loot: [],
    ...fields,
  } as MonsterDef;
}

const TRASH = mob("rt_trash", {});
const BOSS = mob("rt_boss", {
  maxHp: 10_000,
  damage: 6,
  defense: 100,
  phases: [
    { atHpPct: 0.75, logKey: "rt.p1", wardShieldPct: 0.12 },
    { atHpPct: 0.5, logKey: "rt.p2", defense: 200, inflict: { type: "bleed", chance: 1, magnitude: 2, durationMs: 6000 } },
  ],
});
const ROOM: DungeonDef = {
  id: "rt_room",
  name: { en: "room", de: "Raum" },
  requiredLevel: 1,
  encounters: [TRASH.id, TRASH.id, TRASH.id, TRASH.id, BOSS.id],
  raidOnly: true,
  loot: [],
  xp: 0,
  gold: 0,
};
const zero = { normal: 0, heroic: 0, mythic: 0 };
const RAID = {
  id: "rt_raid",
  name: { en: "raid", de: "Raid" },
  unlockDungeonId: ROOM.id,
  rooms: [{ id: "r1", name: { en: "r1", de: "r1" }, dungeonId: ROOM.id, bossId: BOSS.id, table: { draws: 1, extraChance: 0, entries: [] } }],
  fees: zero,
  heroicRestartCost: 0,
  mythicRefundPct: 0.25,
  scaling: {
    normal: { hpMult: 1, damageMult: 1, levelAdd: 0, defenseMult: 1 },
    heroic: { hpMult: 2, damageMult: 1.6, levelAdd: 10, defenseMult: 1.1 },
    mythic: { hpMult: 2.4, damageMult: 1.85, levelAdd: 20, defenseMult: 1.2 },
  },
  reinforcedWave: { index: 3, hpMult: 1.5, damageMult: 1.15 },
  trashLoot: [],
  trashPieceChance: zero,
  bossSideLoot: [],
  suffixChance: zero,
  weeklyChest: { extraItems: [], dust: zero },
  maxAutoRestarts: 0,
} as unknown as RaidDef;

function weapon(id: string, fields: Partial<ItemDef>): ItemDef {
  return {
    id,
    name: { en: id, de: id },
    type: "equipment",
    stackable: false,
    slot: "mainhand",
    weaponStyle: "melee",
    weaponType: "sword",
    damageMin: 400,
    damageMax: 400,
    attackIntervalMs: 2000,
    ...fields,
  } as ItemDef;
}
const W_POISON = weapon("rt_w_poison", { weaponEffect: { type: "poison", chance: 1, magnitude: 1, durationMs: 6000 } });
const W_BLEED = weapon("rt_w_bleed", { weaponEffect: { type: "bleed", chance: 1, magnitude: 1, durationMs: 6000 } });
const W_PEN = weapon("rt_w_pen", { armorPen: 0.2 });
const W_PEN_HIGH = weapon("rt_w_pen_high", { armorPen: 0.5 });
const W_FIRE = weapon("rt_w_fire", { weaponStyle: "magic", weaponType: "staff", magicTheme: "fire" });

const C: ContentDB = {
  ...content,
  monsters: { ...content.monsters, [TRASH.id]: TRASH, [BOSS.id]: BOSS },
  items: {
    ...content.items,
    ...Object.fromEntries([W_POISON, W_BLEED, W_PEN, W_PEN_HIGH, W_FIRE].map((w) => [w.id, w])),
  },
  dungeons: [...content.dungeons, ROOM],
  raids: [RAID],
};

/** Held mitten im Raid-Raum (Stufe/Woche wählbar), Welle `wave`, Gegner auf skalierten Voll-HP. */
function raidHero(opts: { difficulty?: RaidRun["difficulty"]; modifier?: RaidWeeklyModifierId; wave?: number; seed?: number; weaponId?: string } = {}) {
  const s = createGame({ name: "R", baseAttributes: { con: 500 } }, C, opts.seed ?? 1);
  s.character.food = null;
  if (opts.weaponId) s.character.equipment.mainhand = opts.weaponId;
  s.raid = defaultRaidState();
  s.raid.run = {
    raidId: RAID.id,
    difficulty: opts.difficulty ?? "heroic",
    room: 0,
    phase: "fight",
    feePaid: 0,
    restarts: 0,
    loot: [],
    lastLoot: [],
    bossSeq: 0,
    startedAtMs: 0,
    modifier: opts.modifier ?? "quiet_halls",
    restMs: 0,
  } as RaidRun;
  expect(beginDungeonRun(s, C, ROOM)).toBe(true);
  const wave = opts.wave ?? 0;
  s.combat.encounterIndex = wave;
  s.combat.monsterId = ROOM.encounters[wave]!;
  s.combat.enemyHp = raid.raidCombatMonster(s, C)!.maxHp;
  s.character.hp = computeStats(s, C).maxHp;
  return s;
}

/** Tick ohne Angriffe beider Seiten. */
function quietTick(s: ReturnType<typeof raidHero>): void {
  s.combat.playerTimerMs = 0;
  s.combat.enemyTimerMs = 0;
  combatStep(s, C);
}

beforeEach(() => {
  killedSpy.mockClear();
  clearedSpy.mockClear();
  defeatSpy.mockClear();
});

describe("Raid-Gegner-Auflösung und Wellenwechsel", () => {
  it("im Raid kämpft die skalierte Instanz, außerhalb das Content-Monster", () => {
    const s = raidHero({ difficulty: "heroic" });
    const view = combatMonsterView(s, C)!;
    expect(view.maxHp).toBe(2000);
    expect(view.damage).toBeCloseTo(4 * 1.6, 10);
    expect(view).toEqual(raid.raidCombatMonster(s, C));
    s.raid!.run = null; // kein laufender Raid ⇒ Content
    expect(combatMonsterView(s, C)).toBe(C.monsters[TRASH.id]);
  });

  it("Wellen-Kill ⇒ onRaidMonsterKilled, nächste Welle mit skalierten Voll-HP (Welle 4 verstärkt)", () => {
    const s = raidHero({ wave: 0 });
    s.combat.enemyEffects = [{ type: "burn", remainingMs: 5000, magnitude: 1e7 }];
    quietTick(s);
    expect(killedSpy).toHaveBeenCalledTimes(1);
    expect(killedSpy.mock.calls[0]![2].id).toBe(TRASH.id);
    expect(s.combat.encounterIndex).toBe(1);
    expect(s.combat.enemyHp).toBe(2000);

    const r = raidHero({ wave: 2 });
    r.combat.enemyEffects = [{ type: "burn", remainingMs: 5000, magnitude: 1e7 }];
    quietTick(r);
    expect(r.combat.encounterIndex).toBe(3);
    expect(r.combat.enemyHp).toBe(raid.raidCombatMonster(r, C)!.maxHp);
    expect(r.combat.enemyHp).toBe(3000); // 1000 × 2,0 × 1,5
    expect(clearedSpy).not.toHaveBeenCalled();
  });

  it("Boss besiegt ⇒ onRaidRoomCleared statt Dungeon-Abschluss, danach endDungeon", () => {
    const s = raidHero({ wave: 4 });
    expect(s.combat.monsterId).toBe(BOSS.id);
    s.combat.enemyEffects = [{ type: "burn", remainingMs: 5000, magnitude: 1e9 }];
    quietTick(s);
    expect(clearedSpy).toHaveBeenCalledTimes(1);
    expect(killedSpy).not.toHaveBeenCalled();
    expect(s.dungeonsCleared[ROOM.id]).toBeUndefined();
    expect(s.combat.monsterId).toBeNull();
    expect(s.combat.dungeonId).toBeNull();
  });
});

describe("Raid: Tod und Patt", () => {
  it("Tod im Raid ⇒ onRaidDefeat('defeated') NACH dem Aufräumen", () => {
    let dungeonAtCall: string | null | undefined;
    defeatSpy.mockImplementationOnce((st) => {
      dungeonAtCall = st.combat.dungeonId;
    });
    const s = raidHero({ wave: 1 });
    s.character.hp = 0.01;
    s.combat.playerEffects = [{ type: "bleed", remainingMs: 5000, magnitude: 1000 }];
    quietTick(s);
    expect(defeatSpy).toHaveBeenCalledTimes(1);
    expect(defeatSpy.mock.calls[0]![2]).toBe("defeated");
    expect(dungeonAtCall).toBeNull();
    expect(s.combat.stopReason).toBe("defeated");
  });

  it("Patt im Raid ⇒ onRaidDefeat('stalemate')", () => {
    const s = raidHero({ wave: 1 });
    s.combat.enemyHpLow = s.combat.enemyHp;
    s.combat.noProgressMs = 59_950;
    quietTick(s);
    expect(s.combat.stopReason).toBe("stalemate");
    expect(defeatSpy).toHaveBeenCalledTimes(1);
    expect(defeatSpy.mock.calls[0]![2]).toBe("stalemate");
  });

  it("Tod außerhalb des Raids meldet nichts", () => {
    const s = createGame({ name: "N" }, C, 1);
    s.character.food = null;
    expect(startCombat(s, C, TRASH.id)).toBe(true);
    s.character.hp = 0.01;
    s.combat.playerEffects = [{ type: "bleed", remainingMs: 5000, magnitude: 1000 }];
    combatStep(s, C);
    expect(s.combat.stopReason).toBe("defeated");
    expect(defeatSpy).not.toHaveBeenCalled();
  });
});

describe("Raid: Phasenwerte × Stufen-Faktoren (Spec §3 Regel 5)", () => {
  it("Ward-Schild in % der skalierten maxHp", () => {
    const s = raidHero({ wave: 4, difficulty: "heroic" });
    quietTick(s);
    s.combat.enemyHp = 0.7 * 20_000;
    quietTick(s);
    expect(s.combat.bossPhase).toBe(1);
    expect(s.combat.enemyWard).toBe(2400); // 12 % von 20.000
  });

  it("absolute Phasen-Rüstung × Rüstungsfaktor (inkl. Offenes Zeughaus), inflict × Schadensfaktor, Blutfest ×1,5", () => {
    const s = raidHero({ wave: 4, difficulty: "heroic" });
    s.combat.enemyHp = 9000; // 45 % ⇒ Phase 2 (still abgeleitet)
    let view = combatMonsterView(s, C)!;
    expect(view.defense).toBe(220); // 200 × 1,1
    expect(view.inflict?.magnitude).toBeCloseTo(2 * 1.6, 10);
    expect(view.inflict?.durationMs).toBe(6000);

    const a = raidHero({ wave: 4, difficulty: "heroic", modifier: "open_armory" });
    a.combat.enemyHp = 9000;
    expect(combatMonsterView(a, C)!.defense).toBe(275); // 200 × 1,1 × 1,25

    const b = raidHero({ wave: 4, difficulty: "mythic", modifier: "blood_feast" });
    b.combat.enemyHp = 0.45 * 24_000;
    view = combatMonsterView(b, C)!;
    expect(view.inflict?.magnitude).toBeCloseTo(2 * 1.85, 10);
    expect(view.inflict?.durationMs).toBe(9000);
  });
});

describe("Raid: Wochen-Modifikatoren, Spielerseite (Spec §7)", () => {
  it("Geliehenes Feuer: dein Brand tickt ×1,10", () => {
    function burnLoss(modifier: RaidWeeklyModifierId): number {
      const s = raidHero({ wave: 1, modifier });
      s.combat.enemyEffects = [{ type: "burn", remainingMs: 5000, magnitude: 10 }];
      const before = s.combat.enemyHp;
      quietTick(s);
      return before - s.combat.enemyHp;
    }
    expect(burnLoss("borrowed_fire") / burnLoss("quiet_halls")).toBeCloseTo(1.1, 10);
  });

  it("Geliehenes Feuer: Treffer einer Feuer-Themen-Waffe ×1,10 (gleiche Würfe)", () => {
    function hits(modifier: RaidWeeklyModifierId): number {
      let sum = 0;
      for (let seed = 1; seed <= 20; seed++) {
        const s = raidHero({ wave: 1, modifier, seed, weaponId: W_FIRE.id });
        s.combat.playerTimerMs = computeStats(s, C).attackIntervalMs - 50;
        s.combat.enemyTimerMs = 0;
        combatStep(s, C);
        sum += s.combat.log.filter((e) => e.by === "player" && (e.kind === "hit" || e.kind === "crit")).reduce((a, e) => a + e.amount, 0);
      }
      return sum;
    }
    const base = hits("quiet_halls");
    expect(base).toBeGreaterThan(0);
    expect(hits("borrowed_fire") / base).toBeGreaterThan(1.08);
    expect(hits("borrowed_fire") / base).toBeLessThan(1.12);
  });

  function procDuration(weaponId: string, type: "poison" | "bleed", modifier: RaidWeeklyModifierId): number {
    const s = raidHero({ wave: 1, modifier, weaponId });
    s.combat.playerTimerMs = computeStats(s, C).attackIntervalMs - 50;
    s.combat.enemyTimerMs = 0;
    combatStep(s, C);
    return s.combat.enemyEffects.find((e) => e.type === type)?.remainingMs ?? -1;
  }

  it("Giftküche: dein Gift hält 50 % länger", () => {
    expect(procDuration(W_POISON.id, "poison", "quiet_halls")).toBe(6000);
    expect(procDuration(W_POISON.id, "poison", "poison_kitchen")).toBe(9000);
  });

  it("Blutfest: deine Blutung auf dem Gegner hält 50 % länger", () => {
    expect(procDuration(W_BLEED.id, "bleed", "quiet_halls")).toBe(6000);
    expect(procDuration(W_BLEED.id, "bleed", "blood_feast")).toBe(9000);
  });

  it("Bestienhunger: nur der Raum-Boss heilt 0,20 % maxHp je gelandetem Treffer", () => {
    function bossGain(modifier: RaidWeeklyModifierId, wave: number): number {
      const s = raidHero({ wave, modifier });
      const max = raid.raidCombatMonster(s, C)!.maxHp;
      s.combat.enemyHp = 0.9 * max;
      s.combat.playerTimerMs = 0;
      s.combat.enemyTimerMs = 2950;
      const before = s.combat.enemyHp;
      combatStep(s, C);
      expect(s.combat.log.some((e) => e.by === "enemy" && e.kind === "hit" && e.amount > 0)).toBe(true);
      return s.combat.enemyHp - before;
    }
    expect(bossGain("beast_hunger", 4) - bossGain("quiet_halls", 4)).toBeCloseTo(0.002 * 20_000, 6);
    expect(bossGain("beast_hunger", 1) - bossGain("quiet_halls", 1)).toBeCloseTo(0, 10);
  });

  it("Offenes Zeughaus: dein armorPen zählt doppelt, der Deckel bleibt", () => {
    function reduction(weaponId: string, modifier: RaidWeeklyModifierId): number {
      const s = raidHero({ wave: 1, modifier, weaponId });
      s.combat.playerTimerMs = computeStats(s, C).attackIntervalMs - 50;
      s.combat.enemyTimerMs = 0;
      combatStep(s, C);
      const hit = s.combat.log.find((e) => e.by === "player" && (e.kind === "hit" || e.kind === "crit"))!;
      return hit.mitigated! / hit.rawDamage!;
    }
    const red = (def: number, pen: number) => (def * (1 - pen)) / (def * (1 - pen) + DEFENSE_MITIGATION_K);
    // Rüstung der Instanz: 50 × 1,1 (Heroisch) × 1,25 (Zeughaus) = 69 (raidCombatMonster rundet).
    expect(reduction(W_PEN.id, "open_armory")).toBeCloseTo(red(69, 0.4), 2);
    expect(reduction(W_PEN_HIGH.id, "open_armory")).toBeCloseTo(red(69, ARMOR_PEN_CAP), 2);
    expect(reduction(W_PEN.id, "quiet_halls")).toBeCloseTo(red(55, 0.2), 2);
  });
});
