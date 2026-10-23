import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { GameState } from "@hearthforge/shared";
import { SAVE_VERSION, defaultRaidState, makeRaidQueueEntry } from "@hearthforge/shared";
import { createGame, onRaidRoomCleared, startRaid, xpForLevel } from "@hearthforge/engine";
import { deserialize, serialize } from "./index";

/** Raid (SAVE 92 → 93, 1.4.0 Welle 4; claude:2026-10-25T06:10:00+02:00). */
const AT = 1_761_400_000_000;
type SaveShape = { version: number; savedAt: number; state: GameState };

function raider(): GameState {
  const s = createGame({ name: "Raid" }, content, 6);
  for (const id of Object.keys(content.skills)) s.skills[id] = { xp: xpForLevel(99) };
  s.dungeonsCleared.behind_the_throne = 1;
  s.character.gold = 1_000_000;
  return s;
}

describe("Migration v92 → v93", () => {
  it("Alt-Save bekommt den leeren Raid-Zustand und die Schalter aus", () => {
    const s = createGame({ name: "Raid" }, content, 6);
    const save = JSON.parse(serialize(s, AT)) as SaveShape;
    save.version = 92;
    save.state.version = 92;
    delete (save.state as Partial<GameState>).raid;
    delete (save.state.settings as Partial<GameState["settings"]>).raidAutoContinue;
    delete (save.state.settings as Partial<GameState["settings"]>).raidAutoBuyRestart;
    const out = deserialize(JSON.stringify(save), content, AT)!.state;
    expect(out.version).toBe(SAVE_VERSION);
    expect(out.raid).toEqual(defaultRaidState());
    expect(out.settings.raidAutoContinue).toBe(false);
    expect(out.settings.raidAutoBuyRestart).toBe(false);
  });
});

describe("Raid über Save/Load", () => {
  it("laufender Raid-Kampf überlebt die Kampf-Gate-Prüfung und ist ein Fixpunkt", () => {
    const s = raider();
    expect(startRaid(s, content, "gobkharaz", "normal")).toBe("ok");
    const once = serialize(deserialize(serialize(s, AT), content, AT)!.state, AT);
    const st = (JSON.parse(once) as SaveShape).state;
    expect(st.raid?.run?.phase).toBe("fight");
    expect(st.combat.dungeonId).toBe("gk_room_1");
    expect(st.combat.monsterId).not.toBeNull();
    expect(serialize(deserialize(once, content, AT)!.state, AT)).toBe(once);
  });

  it("Rast mit Beute und Zählern bleibt erhalten", () => {
    const s = raider();
    startRaid(s, content, "gobkharaz", "normal");
    s.combat.encounterIndex = 4;
    onRaidRoomCleared(s, content);
    s.combat.monsterId = null;
    s.combat.dungeonId = null;
    const out = deserialize(serialize(s, AT), content, AT)!.state;
    expect(out.raid?.run?.phase).toBe("rest");
    expect(out.raid?.run?.lastLoot.length).toBeGreaterThan(0);
    expect(out.raid?.bossKills["gk_tallymistress:normal"]).toBe(1);
  });

  it("Raid-Einträge der Warteschlange bleiben, unbekannte fliegen", () => {
    const s = raider();
    s.actionQueue = [makeRaidQueueEntry("gobkharaz", "heroic", 3), makeRaidQueueEntry("no_raid", "normal", 1)];
    const out = deserialize(serialize(s, AT), content, AT)!.state;
    expect(out.actionQueue).toEqual([makeRaidQueueEntry("gobkharaz", "heroic", 3)]);
  });

  it("kaputte Raid-Daten werden geklemmt, nie erfunden", () => {
    const s = raider();
    (s as { raid: unknown }).raid = {
      run: { raidId: "gobkharaz", difficulty: "epic", room: 9, phase: "rest" },
      clears: { normal: -3, heroic: 2.7, mythic: "x" },
      bossKills: { "gk_warking:mythic": 4, nonsense: 9 },
      weekly: { week: 3, chests: { "gk_warking:normal": true, bad: 1 } },
      fastestMs: { normal: -1, heroic: 3_600_000 },
      feesPaid: NaN,
      lastResult: { seq: 2, difficulty: "normal", outcome: "won" },
      resultSeq: 1,
      queue: { raidId: "gobkharaz", difficulty: "normal", remaining: 2, completed: 0 },
    };
    const out = deserialize(serialize(s, AT), content, AT)!.state;
    expect(out.raid).toEqual({
      run: null,
      clears: { normal: 0, heroic: 2, mythic: 0 },
      bossKills: { "gk_warking:mythic": 4 },
      weekly: { week: 3, chests: { "gk_warking:normal": true } },
      fastestMs: { heroic: 3_600_000 },
      feesPaid: 0,
      lastResult: null,
      resultSeq: 1,
      queue: null,
    });
  });
});
