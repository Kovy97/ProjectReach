import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { createGame } from "./state";
import { startCombat, combatStep } from "./combat";
import { setActiveAction } from "./actions";
import { advance } from "./tick";
import {
  hasActionDropSeen,
  hasDropSeen,
  markActionDropSeen,
  markDropSeen,
  seenDropCount,
} from "./drops";

describe("Collection-Log (gesehene Drops)", () => {
  it("frischer Spielstand hat noch keine entdeckten Drops", () => {
    const s = createGame({ name: "X" }, content, 1);
    expect(s.seenDrops).toEqual({});
    const chicken = content.monsters.chicken!;
    expect(hasDropSeen(s, "chicken", chicken.loot[0]!.itemId)).toBe(false);
    expect(seenDropCount(s, chicken)).toEqual({ seen: 0, total: chicken.loot.length });
  });

  it("markDropSeen ist idempotent und nur für das jeweilige Monster", () => {
    const s = createGame({ name: "X" }, content, 1);
    markDropSeen(s, "chicken", "feather");
    markDropSeen(s, "chicken", "feather");
    expect(s.seenDrops.chicken).toEqual(["feather"]);
    expect(hasDropSeen(s, "chicken", "feather")).toBe(true);
    expect(hasDropSeen(s, "cow", "feather")).toBe(false);
  });

  it("ein erbeuteter Drop wird im Kampf als entdeckt markiert", () => {
    const s = createGame({ name: "X", baseAttributes: { str: 20, dex: 16, con: 16 } }, content, 3);
    startCombat(s, content, "chicken");
    // genug Ticks für mehrere Kills → mindestens ein Drop fällt.
    for (let i = 0; i < 600 && (s.seenDrops.chicken?.length ?? 0) === 0; i++) combatStep(s, content);
    const dropped = s.seenDrops.chicken ?? [];
    expect(dropped.length).toBeGreaterThan(0);
    // Jeder markierte Drop ist tatsächlich ein Loot-Eintrag des Huhns.
    const lootIds = content.monsters.chicken!.loot.map((l) => l.itemId);
    for (const id of dropped) expect(lootIds).toContain(id);
  });
});

describe("Aktions-Collection-Log (gesehene Aktions-Drops)", () => {
  it("frischer Spielstand hat noch keine entdeckten Aktions-Drops", () => {
    const s = createGame({ name: "X" }, content, 1);
    expect(s.seenActionDrops).toEqual({});
    expect(hasActionDropSeen(s, "mine_copper", "copper_ore")).toBe(false);
  });

  it("markActionDropSeen ist idempotent und nur für die jeweilige Aktion", () => {
    const s = createGame({ name: "X" }, content, 1);
    markActionDropSeen(s, "mine_copper", "copper_ore");
    markActionDropSeen(s, "mine_copper", "copper_ore");
    expect(s.seenActionDrops.mine_copper).toEqual(["copper_ore"]);
    expect(hasActionDropSeen(s, "mine_copper", "copper_ore")).toBe(true);
    expect(hasActionDropSeen(s, "mine_tin", "copper_ore")).toBe(false);
  });

  it("ein erhaltener Aktions-Drop wird beim Abschluss als entdeckt markiert", () => {
    const s = createGame({ name: "X" }, content, 7);
    setActiveAction(s, content, "mine_copper");
    advance(s, content, 60_000);
    // Kupfer ist garantiert (chance 1) → nach mehreren Abschlüssen ist es entdeckt.
    expect(hasActionDropSeen(s, "mine_copper", "copper_ore")).toBe(true);
    // Jeder markierte Drop ist ein echter Loot-Eintrag der Aktion.
    const lootIds = content.actions.mine_copper!.loot.map((l) => l.itemId);
    for (const id of s.seenActionDrops.mine_copper ?? []) expect(lootIds).toContain(id);
  });
});
