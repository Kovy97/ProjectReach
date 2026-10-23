import { describe, expect, it } from "vitest";
import { content as base } from "@hearthforge/content";
import type { ContentDB, DungeonDef, GameState, RaidDef } from "@hearthforge/shared";
import { makeRaidQueueEntry } from "@hearthforge/shared";
import { createTestGame } from "./test-helpers";
import { xpForLevel } from "./leveling";
import { itemCount } from "./inventory";
import { advanceActionQueue } from "./actions";
import { stopCombat } from "./combat";
import { trinityGatePasses } from "./enchant";
import {
  abandonRaid,
  activeRaidFight,
  continueRaid,
  onRaidDefeat,
  onRaidMonsterKilled,
  onRaidRoomCleared,
  raidChestAvailable,
  raidCombatMonster,
  raidDifficultyUnlocked,
  raidFee,
  raidWeekIndex,
  raidWeeklyModifier,
  restartRaidRoom,
  startRaid,
  tickRaid,
} from "./raid";

/**
 * Raid-Lauf (1.4.0 „Feder und Stahl“ Welle 4; claude:2026-10-25T05:00:00+02:00). Synthetischer Mini-Raid aus
 * Bestands-Monstern, damit die Lauf-Logik ohne den Raid-Content prüfbar ist. Chef 23.10.: Gebühr je Runde, Tod
 * Normal gratis neu, Heroisch 100.000, Mythisch Ende mit 25 % zurück; Rast, Wochen-Modifikator, Erstkill-Truhe.
 */
const MONDAY = new Date(2026, 9, 26, 12, 0, 0).getTime(); // Mo 26.10.2026, lokale Zeit

function raidContent(): ContentDB {
  const rooms: DungeonDef[] = [1, 2].map((i) => ({
    id: `test_room_${i}`,
    name: { en: `Room ${i}`, de: `Raum ${i}` },
    requiredLevel: 1,
    encounters: ["goblin", "goblin", "goblin", "goblin", "goblin_warchief"],
    raidOnly: true,
    loot: [],
    xp: 0,
    gold: 0,
  }));
  const def: RaidDef = {
    id: "test_raid",
    name: { en: "Test Raid", de: "Test-Raid" },
    unlockDungeonId: base.dungeons[0]!.id,
    rooms: rooms.map((d, i) => ({
      id: `r${i}`,
      name: d.name,
      dungeonId: d.id,
      bossId: "goblin_warchief",
      table: { draws: 1, extraChance: 0, entries: [{ itemId: "copper_sword", weight: 3 }, { itemId: "copper_dagger", weight: 2 }] },
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
    trashLoot: [{ itemId: "relic_dust", chance: 1, qty: { normal: [1, 1], heroic: [1, 2], mythic: [2, 3] } }],
    trashPieceChance: { normal: 0, heroic: 0, mythic: 0 },
    bossSideLoot: [{ itemId: "godiron_bar", chance: 1, qty: { normal: [2, 4], heroic: [2, 4], mythic: [2, 4] } }],
    suffixChance: { normal: 0, heroic: 0, mythic: 0 },
    weeklyChest: { extraItems: [{ itemId: "godiron_bar", qty: 5 }], dust: { normal: 15, heroic: 25, mythic: 40 } },
    maxAutoRestarts: 3,
  };
  return { ...base, dungeons: [...base.dungeons, ...rooms], raids: [def] };
}

function game(c: ContentDB, gold = 50_000): GameState {
  const s = createTestGame({ name: "R" }, c, 9);
  for (const id of Object.keys(c.skills)) s.skills[id] = { xp: xpForLevel(99) };
  s.dungeonsCleared[c.raids![0]!.unlockDungeonId] = 1;
  s.character.gold = gold;
  return s;
}

describe("Freischaltung und Start", () => {
  it("Normal nach dem Unlock-Dungeon, Heroisch nach einem Normal-Abschluss, Mythisch nach Heroisch", () => {
    const c = raidContent();
    const s = game(c);
    expect(raidDifficultyUnlocked(s, c, "test_raid", "normal")).toBe(true);
    expect(raidDifficultyUnlocked(s, c, "test_raid", "heroic")).toBe(false);
    s.raid!.clears = { normal: 1, heroic: 0, mythic: 0 };
    expect(raidDifficultyUnlocked(s, c, "test_raid", "heroic")).toBe(true);
    expect(raidDifficultyUnlocked(s, c, "test_raid", "mythic")).toBe(false);
    s.dungeonsCleared = {};
    expect(raidDifficultyUnlocked(s, c, "test_raid", "normal")).toBe(false);
  });

  it("Start zieht die Gebühr, betritt Raum 1 mit voller Heilung, blockt einen zweiten Lauf", () => {
    const c = raidContent();
    const s = game(c);
    s.character.hp = 1;
    expect(startRaid(s, c, "test_raid", "normal")).toBe("ok");
    expect(s.character.gold).toBe(49_000);
    expect(s.combat.dungeonId).toBe("test_room_1");
    expect(s.character.hp).toBeGreaterThan(1);
    expect(activeRaidFight(s, c)?.room.id).toBe("r0");
    expect(startRaid(s, c, "test_raid", "normal")).toBe("busy");
    const poor = game(c, 10);
    expect(startRaid(poor, c, "test_raid", "normal")).toBe("gold");
  });
});

describe("Skalierung und Wochen-Modifikator", () => {
  it("Stufe und verstärkte Welle 4 skalieren die Gegnerwerte", () => {
    const c = raidContent();
    const s = game(c);
    s.raid!.clears = { normal: 1, heroic: 0, mythic: 0 };
    startRaid(s, c, "test_raid", "heroic");
    const g = c.monsters.goblin!;
    const m = raidCombatMonster(s, c)!;
    expect(m.maxHp).toBe(Math.round(g.maxHp * 2));
    expect(m.damage).toBeCloseTo(g.damage * 1.6, 9);
    expect(m.level).toBe(g.level + 10);
    s.combat.encounterIndex = 3;
    expect(raidCombatMonster(s, c)!.maxHp).toBe(Math.round(g.maxHp * 2 * 1.5));
    expect(m.loot).toEqual([]);
    expect(m.gold).toBe(0);
  });

  it("Wochen-Modifikator rotiert je Kalenderwoche, Zahltag senkt die Gebühr", () => {
    const c = raidContent();
    expect(raidWeekIndex(new Date(2026, 0, 5, 0, 0).getTime())).toBe(0);
    expect(raidWeekIndex(new Date(2026, 0, 11, 23, 59).getTime())).toBe(0);
    expect(raidWeekIndex(new Date(2026, 0, 12, 0, 1).getTime())).toBe(1);
    expect(raidWeeklyModifier(new Date(2026, 0, 5).getTime())).toBe("quiet_halls");
    expect(raidWeeklyModifier(new Date(2026, 0, 12).getTime())).toBe("borrowed_fire");
    expect(raidFee(c, "test_raid", "normal", "payday")).toBe(800);
  });
});

describe("Beute, Rast, Abschluss", () => {
  it("Boss: Tabellen-Teil, Nebenbeute, einmal je Woche die Truhe; danach Rast, dann der nächste Raum", () => {
    const c = raidContent();
    const s = game(c);
    startRaid(s, c, "test_raid", "normal", MONDAY);
    onRaidMonsterKilled(s, c, c.monsters.goblin!, MONDAY);
    expect(itemCount(s.inventory, "relic_dust") + (s.bank.relic_dust ?? 0)).toBe(1);
    s.combat.encounterIndex = 4;
    onRaidRoomCleared(s, c, MONDAY);
    const run = s.raid!.run!;
    expect(run.phase).toBe("rest");
    expect(run.lastLoot.some((l) => l.itemId === "copper_sword" || l.itemId === "copper_dagger")).toBe(true);
    expect(run.lastLoot.find((l) => l.itemId === "relic_dust")?.qty).toBe(15); // Truhe
    expect(raidChestAvailable(s, "goblin_warchief", "normal", MONDAY)).toBe(false);
    expect(s.raid!.bossKills["goblin_warchief:normal"]).toBe(1);
    // Online ohne Auto-Weiter wartet die Rast auf den Knopf.
    tickRaid(s, c, 10_000, false, MONDAY);
    expect(s.raid!.run!.phase).toBe("rest");
    expect(continueRaid(s, c)).toBe(true);
    expect(s.combat.dungeonId).toBe("test_room_2");
    s.combat.encounterIndex = 4;
    onRaidRoomCleared(s, c, MONDAY);
    expect(s.raid!.run!.phase).toBe("complete");
    expect(s.raid!.clears.normal).toBe(1);
    tickRaid(s, c, 5_000, true, MONDAY); // offline schließt der Abschluss selbst
    expect(s.raid!.run).toBeNull();
    expect(s.raid!.lastResult?.outcome).toBe("complete");
  });
});

describe("Tod je Stufe", () => {
  it("Normal: Neustart gratis; Heroisch: Neustart kostet; Mythisch: Ende mit 25 % zurück", () => {
    const c = raidContent();
    const n = game(c);
    startRaid(n, c, "test_raid", "normal");
    onRaidDefeat(n, c, "defeated");
    expect(n.raid!.run!.phase).toBe("defeated");
    const g = n.character.gold;
    expect(restartRaidRoom(n, c)).toBe("ok");
    expect(n.character.gold).toBe(g);

    const h = game(c);
    h.raid!.clears = { normal: 1, heroic: 0, mythic: 0 };
    startRaid(h, c, "test_raid", "heroic");
    onRaidDefeat(h, c, "stalemate");
    const hg = h.character.gold;
    expect(restartRaidRoom(h, c)).toBe("ok");
    expect(h.character.gold).toBe(hg - 500);

    const m = game(c);
    m.raid!.clears = { normal: 1, heroic: 1, mythic: 0 };
    startRaid(m, c, "test_raid", "mythic");
    const mg = m.character.gold;
    onRaidDefeat(m, c, "defeated");
    expect(m.raid!.run).toBeNull();
    expect(m.character.gold).toBe(mg + 2000);
    expect(m.raid!.lastResult).toMatchObject({ outcome: "defeated", refund: 2000 });
  });

  it("offline: Normal startet höchstens dreimal neu, dann endet der Lauf", () => {
    const c = raidContent();
    const s = game(c);
    startRaid(s, c, "test_raid", "normal");
    for (let i = 0; i < 4; i++) {
      s.combat.monsterId = null;
      onRaidDefeat(s, c, "defeated");
      tickRaid(s, c, 5_000, true);
    }
    expect(s.raid!.run).toBeNull();
    expect(s.raid!.lastResult?.outcome).toBe("defeated");
  });

  // claude:2026-10-25T11:55:00+02:00 — Kampf verlassen zählt wie ein Tod (kein hängender Lauf, kein Ausweg aus Mythisch).
  it("Kampf verlassen: Normal landet im Tod-Dialog, Mythisch endet mit Rückgabe", () => {
    const c = raidContent();
    const n = game(c);
    startRaid(n, c, "test_raid", "normal");
    stopCombat(n);
    tickRaid(n, c, 100, false);
    expect(n.raid!.run!.phase).toBe("defeated");
    expect(restartRaidRoom(n, c)).toBe("ok");
    expect(activeRaidFight(n, c)).not.toBeNull();

    const m = game(c);
    m.raid!.clears = { normal: 1, heroic: 1, mythic: 0 };
    startRaid(m, c, "test_raid", "mythic");
    const mg = m.character.gold;
    stopCombat(m);
    tickRaid(m, c, 100, false);
    expect(m.raid!.run).toBeNull();
    expect(m.character.gold).toBe(mg + 2000);
    expect(m.raid!.lastResult).toMatchObject({ outcome: "defeated", refund: 2000 });
  });
});

describe("Warteschlange", () => {
  it("jede Runde zahlt ihre Gebühr; fehlt Gold, stoppt der Eintrag mit Meldung", () => {
    const c = raidContent();
    const s = game(c, 1500);
    s.actionQueue = [makeRaidQueueEntry("test_raid", "normal", 2)];
    expect(advanceActionQueue(s, c)).toBe(true);
    expect(s.character.gold).toBe(500);
    expect(s.raid!.queue).toMatchObject({ remaining: 2, completed: 0 });
    s.combat.encounterIndex = 4;
    onRaidRoomCleared(s, c);
    tickRaid(s, c, 5_000, false);
    s.combat.encounterIndex = 4;
    onRaidRoomCleared(s, c);
    tickRaid(s, c, 5_000, false); // Abschluss → nächste Runde, Gold reicht nicht
    expect(s.raid!.run).toBeNull();
    expect(s.raid!.queue).toBeNull();
    expect(s.lastQueueSkip).toMatchObject({ reason: "raid_gold", raidId: "test_raid" });
  });

  it("Aufgeben beendet den Lauf ohne Rückgabe", () => {
    const c = raidContent();
    const s = game(c);
    startRaid(s, c, "test_raid", "normal");
    abandonRaid(s, c);
    expect(s.raid!.run).toBeNull();
    expect(s.combat.dungeonId).toBeNull();
    expect(s.raid!.lastResult?.outcome).toBe("abandoned");
  });
});

// claude:2026-10-25T16:55:00+02:00 — Ägis auf Raid-Rüstung jeder Klasse (Spec §2.1, Nachmessung §13 V1); sonst gilt die Trinität.
describe("Ägis-Gate für Raid-Rüstung", () => {
  it("Ägis III passt auf Raid-Leder und -Stoff (Stufe XIII), nicht auf Leder/Stoff des Bestands; Ausweich-Rune bleibt Leder-only", () => {
    const aegis = base.affixes!.affix_aegis!;
    const evasion = base.affixes!.affix_evasion!;
    for (const id of ["gk_poison_chest", "gk_poison_chest_heroic", "gk_fire_head_mythic", "gk_bleed_legs"]) {
      expect(trinityGatePasses(aegis, 3, base.items[id]!), id).toBe(true);
    }
    const oldLeather = Object.values(base.items).find((i) => i.type === "equipment" && (i.evasionRating ?? 0) > 0 && (i.armorRating ?? 0) <= 0 && i.tier !== 13)!;
    const oldCloth = Object.values(base.items).find((i) => i.type === "equipment" && (i.wardCapacity ?? 0) > 0 && (i.armorRating ?? 0) <= 0 && i.slot === "body" && i.tier !== 13)!;
    expect(trinityGatePasses(aegis, 3, oldLeather), oldLeather.id).toBe(false);
    expect(trinityGatePasses(aegis, 3, oldCloth), oldCloth.id).toBe(false);
    expect(trinityGatePasses(evasion, 3, base.items.gk_bleed_chest!)).toBe(false);
    expect(trinityGatePasses(aegis, 3, base.items.gk_king_greatsword!)).toBe(false);
  });
});
