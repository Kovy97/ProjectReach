import { describe, expect, it } from "vitest";
import { content as base } from "@hearthforge/content";
import type { ContentDB, DungeonDef, GameState, RaidDef } from "@hearthforge/shared";
import { makeRaidQueueEntry } from "@hearthforge/shared";
import { createTestGame } from "./test-helpers";
import { xpForLevel } from "./leveling";
import { advanceActionQueue } from "./actions";
import { stopCombat } from "./combat";
import { advance } from "./tick";
import {
  abandonRaid,
  continueRaid,
  onRaidDefeat,
  onRaidMonsterKilled,
  onRaidRoomCleared,
  raidChestAvailable,
  raidCombatMonster,
  raidOccupied,
  startRaid,
  tickRaid,
} from "./raid";

/**
 * QA-Prüfrunde 1.4.0 Raid (Ablauf und Zustände), claude:2026-10-26T10:00:00+02:00 (Kontrolleur).
 * Synthetischer Mini-Raid wie raid.test.ts (zwei Räume aus Bestands-Goblins), damit die Lauf-Logik ohne
 * RAID_DAMAGE_SCALE-Abhängigkeit prüfbar ist. `it.fails` = SOLL-Erwartung, die heute scheitert (Befund);
 * sobald der Fehler behoben ist, meldet vitest den Test als „unerwartet bestanden“ und `.fails` ist zu entfernen.
 */
const MONDAY = new Date(2026, 9, 26, 12, 0, 0).getTime(); // Mo 26.10.2026
const NEXT_MONDAY = new Date(2026, 10, 2, 12, 0, 0).getTime(); // Mo 02.11.2026

function raidContent(): ContentDB {
  const rooms: DungeonDef[] = [1, 2].map((i) => ({
    id: `qa_room_${i}`,
    name: { en: `Room ${i}`, de: `Raum ${i}` },
    requiredLevel: 1,
    encounters: ["goblin", "goblin", "goblin", "goblin", "goblin_warchief"],
    raidOnly: true,
    loot: [],
    xp: 0,
    gold: 0,
  }));
  const def: RaidDef = {
    id: "qa_raid",
    name: { en: "QA Raid", de: "QA-Raid" },
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
      mythic: { hpMult: 2.4, damageMult: 1.7, levelAdd: 20, defenseMult: 1.2 },
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
  const s = createTestGame({ name: "QA" }, c, 11);
  for (const id of Object.keys(c.skills)) s.skills[id] = { xp: xpForLevel(99) };
  s.dungeonsCleared[c.raids![0]!.unlockDungeonId] = 1;
  s.character.gold = gold;
  return s;
}

/** Beide Räume von Hand räumen (Boss-Kill-Pfad von raid.ts, ohne Kampf-RNG). */
function clearBothRooms(s: GameState, c: ContentDB, nowMs?: number): void {
  s.combat.encounterIndex = 4;
  onRaidRoomCleared(s, c, nowMs);
  s.combat.monsterId = null;
  s.combat.dungeonId = null;
  expect(s.raid!.run!.phase).toBe("rest");
  expect(continueRaid(s, c)).toBe(true);
  s.combat.encounterIndex = 4;
  onRaidRoomCleared(s, c, nowMs);
  s.combat.monsterId = null;
  s.combat.dungeonId = null;
  expect(s.raid!.run!.phase).toBe("complete");
}

describe("Befund A: Phase „complete“ ist nicht raidOccupied", () => {
  // claude:2026-10-26T02:30:00+02:00 — Befund behoben (raidOccupied zählt „complete“): IST-Test auf SOLL umgestellt.
  it("SOLL: während des 3-s-Abschluss-Countdowns bleibt der Held belegt, die Warteschlange rückt nicht weiter", () => {
    const c = raidContent();
    const s = game(c);
    s.actionQueue = [makeRaidQueueEntry("qa_raid", "normal", 2), makeRaidQueueEntry("qa_raid", "normal", 1)];
    advance(s, c, 100); // Leerlauf → advanceActionQueue startet den ersten Eintrag (×2)
    expect(s.raid!.queue).toMatchObject({ remaining: 2, completed: 0 });
    clearBothRooms(s, c);
    expect(raidOccupied(s)).toBe(true);
    advance(s, c, 100); // ein Tick im Abschluss-Countdown
    expect(s.raid!.run?.phase).toBe("complete");
    expect(s.raid!.queue).toMatchObject({ remaining: 2, completed: 0 });
    expect(s.actionQueue.length).toBe(1);
  });

  it("SOLL: der zweite Lauf des ×2-Eintrags startet erst nach dem Abschluss, der ×1-Eintrag danach", () => {
    const c = raidContent();
    const s = game(c);
    s.actionQueue = [makeRaidQueueEntry("qa_raid", "normal", 2), makeRaidQueueEntry("qa_raid", "normal", 1)];
    advance(s, c, 100);
    clearBothRooms(s, c);
    advance(s, c, 3_100); // Abschluss-Countdown (3 s) läuft in der Warteschlange selbst ab
    expect(s.raid!.queue).toMatchObject({ remaining: 1, completed: 1 }); // noch der ×2-Eintrag, ein Lauf fertig
    expect(s.raid!.lastResult?.outcome).toBe("complete");
    expect(s.actionQueue.length).toBe(1); // ×1 wartet noch
  });
});

describe("Befund B: Stopp-Knopf in einer Warteschlangen-Runde", () => {
  // claude:2026-10-26T02:30:00+02:00 — Befund behoben (QA-Raid #4): Stopp in einer Warteschlangen-Runde beendet die Warteschlange, der Tod-Dialog wartet.
  it("SOLL: Stopp beendet die Warteschlange; der Lauf wartet im Tod-Dialog statt stumm neu zu starten", () => {
    const c = raidContent();
    const s = game(c);
    s.actionQueue = [makeRaidQueueEntry("qa_raid", "normal", null)];
    advance(s, c, 100);
    expect(s.raid!.run?.phase).toBe("fight");
    stopCombat(s); // Spieler drückt „Fliehen“/Stopp
    advance(s, c, 100); // Kampf verlassen = Tod
    expect(s.raid!.run?.phase).toBe("defeated");
    expect(s.raid!.queue).toBeNull();
    expect(s.lastQueueSkip).toMatchObject({ reason: "defeated", raidId: "qa_raid" });
    advance(s, c, 5_000); // online ohne Warteschlange: keine Auto-Entscheidung
    expect(s.raid!.run?.phase).toBe("defeated");
    expect(s.raid!.run?.restarts).toBe(0);
  });
});

describe("Befund C: Aufgeben in Phase „complete“ lässt die Warteschlange stehen", () => {
  it("SOLL: abandonRaid in „complete“ beendet auch die Raid-Warteschlange", () => {
    const c = raidContent();
    const s = game(c);
    s.actionQueue = [makeRaidQueueEntry("qa_raid", "normal", 3)];
    advance(s, c, 100);
    clearBothRooms(s, c);
    abandonRaid(s, c); // Knopf „Aufgeben“ der Raid-Karte (im 3-s-Fenster erreichbar)
    expect(s.raid!.run).toBeNull();
    expect(s.raid!.queue).toBeNull();
  });
});

describe("Befund D: abandonRaid im Kampf räumt den Kampfzustand nur teilweise", () => {
  it("SOLL: Aufgeben im Kampf hinterlässt denselben Zustand wie stopCombat (Phase, XP-Akkumulator, Stopp-Grund)", () => {
    const c = raidContent();
    const s = game(c);
    startRaid(s, c, "qa_raid", "normal");
    s.combat.bossPhase = 2;
    s.combat.bossPhaseMs = 1234;
    s.combat.encounterXp = { attack: 10 } as GameState["combat"]["encounterXp"];
    s.combat.stopReason = "stalemate";
    abandonRaid(s, c);
    expect(s.combat.monsterId).toBeNull();
    expect(s.combat.bossPhase).toBeUndefined();
    expect(s.combat.encounterXp).toBeUndefined();
    expect(s.combat.stopReason).toBeUndefined();
  });
});

describe("Befund E: Auto-Weiter schließt den Abschluss-Bildschirm nach 3 s selbst", () => {
  // claude:2026-10-26T02:30:00+02:00 — Befund behoben (QA-Raid #10): online schließt nur der Spieler den Abschluss-Dialog.
  it("SOLL: mit raidAutoContinue (ohne Warteschlange) bleibt der Abschluss-Dialog stehen, bis der Spieler ihn schließt", () => {
    const c = raidContent();
    const s = game(c);
    s.settings.raidAutoContinue = true;
    startRaid(s, c, "qa_raid", "normal");
    clearBothRooms(s, c);
    tickRaid(s, c, 3_000, false);
    expect(s.raid!.run?.phase).toBe("complete");
    tickRaid(s, c, 3_000, true); // offline schließt er sich selbst
    expect(s.raid!.run).toBeNull();
    expect(s.raid!.lastResult?.outcome).toBe("complete");
  });
});

describe("Befund H: Suffix-ilvl der Boss-Teile ist das Basis-Level, Trash-Teile nehmen das skalierte Level", () => {
  function withSuffixes(): ContentDB {
    const c = raidContent();
    const def = c.raids![0]!;
    return {
      ...c,
      raids: [{ ...def, suffixChance: { normal: 1, heroic: 1, mythic: 1 }, trashPieceChance: { normal: 1, heroic: 1, mythic: 1 } }],
    };
  }
  function suffixIlvls(s: GameState): number[] {
    return [...s.inventory.instances, ...(s.bankInstances ?? [])].map((i) => i.suffix?.ilvl ?? -1);
  }

  it("SOLL: beide Pfade nutzen dasselbe (skalierte) Level der Stufe", () => {
    const c = withSuffixes();
    const s = game(c);
    s.raid!.clears = { normal: 1, heroic: 0, mythic: 0 };
    startRaid(s, c, "qa_raid", "heroic");
    s.combat.encounterIndex = 4;
    onRaidRoomCleared(s, c);
    expect(suffixIlvls(s)).toEqual([c.monsters.goblin_warchief!.level + 10]);
  });
});

describe("Positiv: Wochenwechsel, Mythisch in der Warteschlange, Heroisch ohne Gold", () => {
  it("Wochenwechsel mitten im Lauf: Modifikator bleibt, die Truhe der neuen Woche ist wieder offen", () => {
    const c = raidContent();
    const s = game(c);
    expect(startRaid(s, c, "qa_raid", "normal", MONDAY)).toBe("ok");
    const mod = s.raid!.run!.modifier;
    s.combat.encounterIndex = 4;
    onRaidRoomCleared(s, c, MONDAY);
    expect(raidChestAvailable(s, "goblin_warchief", "normal", MONDAY)).toBe(false);
    expect(raidChestAvailable(s, "goblin_warchief", "normal", NEXT_MONDAY)).toBe(true);
    s.combat.monsterId = null;
    s.combat.dungeonId = null;
    continueRaid(s, c);
    s.combat.encounterIndex = 4;
    onRaidRoomCleared(s, c, NEXT_MONDAY); // Raum 2 in der neuen Woche
    expect(s.raid!.run!.modifier).toBe(mod);
    expect(s.raid!.weekly.chests["goblin_warchief:normal"]).toBe(true); // Truhe der neuen Woche gezogen
    expect(s.raid!.run!.lastLoot.find((l) => l.itemId === "relic_dust")?.qty).toBe(15);
  });

  it("Mythisch-Tod in der Warteschlange: Rückgabe, Lauf und Warteschlange enden mit Meldung", () => {
    const c = raidContent();
    const s = game(c);
    s.raid!.clears = { normal: 1, heroic: 1, mythic: 0 };
    s.actionQueue = [makeRaidQueueEntry("qa_raid", "mythic", null)];
    expect(advanceActionQueue(s, c)).toBe(true);
    const g = s.character.gold;
    s.combat.monsterId = null;
    s.combat.dungeonId = null;
    onRaidDefeat(s, c, "defeated");
    expect(s.character.gold).toBe(g + 2000);
    expect(s.raid!.run).toBeNull();
    expect(s.raid!.queue).toBeNull();
    expect(s.lastQueueSkip).toMatchObject({ reason: "dungeon_defeated", raidId: "qa_raid" });
  });

  it("Heroisch in der Warteschlange mit „automatisch kaufen“, aber ohne Gold: Lauf endet, kein Minus", () => {
    const c = raidContent();
    const s = game(c, 3_100); // Gebühr 3000, danach 100 < 500 Neustart
    s.raid!.clears = { normal: 1, heroic: 0, mythic: 0 };
    s.settings.raidAutoBuyRestart = true;
    s.actionQueue = [makeRaidQueueEntry("qa_raid", "heroic", 5)];
    expect(advanceActionQueue(s, c)).toBe(true);
    expect(s.character.gold).toBe(100);
    s.combat.monsterId = null;
    s.combat.dungeonId = null;
    onRaidDefeat(s, c, "defeated");
    tickRaid(s, c, 3_000, false);
    expect(s.character.gold).toBe(100);
    expect(s.raid!.run).toBeNull();
    expect(s.raid!.lastResult?.outcome).toBe("defeated");
    expect(s.raid!.queue).toBeNull();
  });

  it("Raid-Start während einer Aktion mit Mengen-Ziel: Rest wandert an die Queue-Front, Raid läuft", () => {
    const c = raidContent();
    const s = game(c);
    const actionId = Object.keys(c.actions)[0]!;
    s.activeActionId = actionId;
    s.actionTarget = 7;
    expect(startRaid(s, c, "qa_raid", "normal")).toBe("ok");
    expect(s.activeActionId).toBeNull();
    expect(s.actionQueue[0]).toMatchObject({ kind: "action", actionId, target: 7 });
  });
});
