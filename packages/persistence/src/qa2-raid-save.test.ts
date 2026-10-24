import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { GameState } from "@hearthforge/shared";
import { makeDungeonQueueEntry } from "@hearthforge/shared";
import { continueRaid, createGame, onRaidDefeat, onRaidRoomCleared, raidChestAvailable, setActiveAction, startRaid, startRaidFromQueue, xpForLevel } from "@hearthforge/engine";
import { deserialize, serialize } from "./index";

/**
 * QA-Runde 2, 1.4.0 Raid über Save/Load und Offline-Aufholen (Kontrolleur, claude:2026-10-26T12:00:00+02:00).
 * Echter Raid-Content; Kämpfe laufen nur dort, wo der Ausgang vom Kampf-RNG unabhängig ist (Stufe-1-Held stirbt sofort).
 * `it.fails("BUG: …")` = SOLL-Erwartung, die heute scheitert (Befund im Bericht design/qa/1.4.0-r2-raid.md).
 */
const AT = new Date(2026, 9, 26, 12, 0, 0).getTime(); // Mo 26.10.2026
const NEXT_WEEK = AT + 7 * 86_400_000;
const H8 = 8 * 3_600_000;

function raider(gold = 5_000_000): GameState {
  const s = createGame({ name: "QA2" }, content, 8);
  for (const id of Object.keys(content.skills)) s.skills[id] = { xp: xpForLevel(99) };
  s.dungeonsCleared.behind_the_throne = 1;
  s.raid!.clears = { normal: 1, heroic: 1, mythic: 0 };
  s.character.gold = gold;
  return s;
}

function leaveCombat(s: GameState): void {
  s.combat.monsterId = null;
  s.combat.dungeonId = null;
  s.combat.encounterIndex = 0;
}

function clearAllRooms(s: GameState, nowMs?: number): void {
  for (let room = 0; room < 5; room++) {
    s.combat.encounterIndex = 4;
    onRaidRoomCleared(s, content, nowMs);
    leaveCombat(s);
    if (room < 4) expect(continueRaid(s, content)).toBe(true);
  }
  expect(s.raid!.run!.phase).toBe("complete");
}

describe("Warteschlange über Save/Load", () => {
  it("Abschluss-Fenster gespeichert, mit Raid-Warteschlange: nach dem Laden läuft Runde 2 und hat ihre Gebühr bezahlt", () => {
    const s = raider();
    expect(startRaidFromQueue(s, content, "gobkharaz", "normal", 3, AT)).toBe("ok");
    const afterFee = s.character.gold;
    clearAllRooms(s, AT);
    const res = deserialize(serialize(s, AT), content, AT + 10_000)!;
    const out = res.state;
    expect(out.raid!.lastResult?.outcome).toBe("complete");
    expect(out.raid!.queue).toMatchObject({ remaining: 2, completed: 1 });
    expect(out.raid!.run).toMatchObject({ phase: "fight", room: 0, feePaid: 300_000 });
    expect(out.character.gold).toBe(afterFee - 300_000);
    expect(out.combat.dungeonId).toBe("gk_room_1");
    expect(out.combat.monsterId).toBe("gk_toll_thug");
  });

  it("Dungeon-Warteschlangeneintrag auf einen Raid-Raum startet nach dem Laden keinen Kampf (kein Gratis-Raid)", () => {
    const s = raider();
    s.actionQueue = [makeDungeonQueueEntry("gk_room_5", 2)];
    const res = deserialize(serialize(s, AT), content, AT + 60_000)!;
    expect(res.state.combat.monsterId).toBeNull();
    expect(res.state.combat.dungeonId).toBeNull();
    expect(res.state.raid!.run).toBeNull();
    expect(res.state.stats.kills).toBe(0);
    expect(res.state.actionQueue.some((q) => q.kind === "dungeon")).toBe(false);
  });
});

describe("Heroisch-Tod offline (Chef R3)", () => {
  // claude:2026-10-24T15:18:33+02:00 — B2 behoben (CEO, analog R3): scheitert der Auto-Kauf offline, wartet der Tod-Dialog.
  it("Auto-Kauf an, Gold reicht nicht: beim Offline-Aufholen wartet der Lauf im Tod-Dialog, die 900.000 verfallen nicht", () => {
    const s = raider(950_000); // 900k Gebühr, danach 50k < 100k Neustart
    s.settings.raidAutoBuyRestart = true;
    expect(startRaid(s, content, "gobkharaz", "heroic", AT)).toBe("ok");
    const afterFee = s.character.gold;
    const res = deserialize(serialize(s, AT), content, AT + H8)!;
    expect(res.state.stats.deaths).toBe(1);
    expect(res.state.character.gold).toBe(afterFee);
    // SOLL (R3): keine Entscheidung durch die Engine, wenn der Kauf nicht möglich ist ⇒ Tod-Dialog wartet.
    expect(res.state.raid!.run?.phase).toBe("defeated");
    expect(res.state.raid!.lastResult).toBeNull();
  });
});

// claude:2026-10-24T15:18:33+02:00 — QA2-Saves B2 (CEO: offline wie online) über echtes Offline-Aufholen.
describe("Eigene Aktion während Rast/Tod-Dialog über Save/Load", () => {
  it("Rast + endlose eigene Aktion, 8 h offline: Raid wartet in der Rast, die Aktion läuft und bringt XP, Gold unverändert, Fixpunkt", () => {
    const s = raider();
    expect(startRaid(s, content, "gobkharaz", "normal", AT)).toBe("ok");
    s.combat.encounterIndex = 4;
    onRaidRoomCleared(s, content, AT);
    leaveCombat(s);
    expect(s.raid!.run!.phase).toBe("rest");
    setActiveAction(s, content, "mine_copper");
    const gold = s.character.gold;
    const res = deserialize(serialize(s, AT), content, AT + H8)!;
    expect(res.state.raid!.run).toMatchObject({ phase: "rest", room: 0 });
    expect(res.state.activeActionId).toBe("mine_copper");
    expect(res.offline.skillXp.mining?.xp ?? 0).toBeGreaterThan(0);
    expect(res.state.character.gold).toBe(gold);
    expect(res.state.stats.deaths).toBe(0);
    const once = serialize(deserialize(serialize(res.state, AT + H8), content, AT + H8)!.state, AT + H8);
    expect(serialize(deserialize(once, content, AT + H8)!.state, AT + H8)).toBe(once);
  });

  it("Normal-Tod-Dialog + endlose eigene Aktion, 8 h offline: kein automatischer Neustart, die Aktion läuft weiter", () => {
    const s = raider();
    expect(startRaid(s, content, "gobkharaz", "normal", AT)).toBe("ok");
    leaveCombat(s);
    onRaidDefeat(s, content, "defeated");
    setActiveAction(s, content, "mine_copper");
    const res = deserialize(serialize(s, AT), content, AT + H8)!;
    expect(res.state.raid!.run).toMatchObject({ phase: "defeated", restarts: 0 });
    expect(res.state.activeActionId).toBe("mine_copper");
    expect(res.offline.skillXp.mining?.xp ?? 0).toBeGreaterThan(0);
  });
});

describe("Wochentruhe über Save/Load", () => {
  it("in Woche A gezogen, in Woche B geladen: Truhe wieder offen, Modifikator des laufenden Laufs bleibt", () => {
    // Heroisch, Tod-Dialog ohne Auto-Kauf: der einzige Lauf-Zustand, der offline wartet (R3) und so eine Woche überdauert.
    const s = raider(10_000_000);
    expect(startRaid(s, content, "gobkharaz", "heroic", AT)).toBe("ok");
    const mod = s.raid!.run!.modifier;
    s.combat.encounterIndex = 4;
    onRaidRoomCleared(s, content, AT);
    leaveCombat(s);
    expect(s.raid!.run!.phase).toBe("rest");
    expect(continueRaid(s, content)).toBe(true);
    leaveCombat(s);
    onRaidDefeat(s, content, "defeated");
    expect(s.raid!.run!.phase).toBe("defeated");
    expect(raidChestAvailable(s, "gk_tallymistress", "heroic", AT)).toBe(false);
    const out = deserialize(serialize(s, AT), content, NEXT_WEEK)!.state;
    expect(out.raid!.run?.phase).toBe("defeated");
    expect(out.raid!.run?.modifier).toBe(mod);
    expect(raidChestAvailable(out, "gk_tallymistress", "heroic", NEXT_WEEK)).toBe(true);
    expect(raidChestAvailable(out, "gk_tallymistress", "heroic", AT)).toBe(false);
  });
});
