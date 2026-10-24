import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { GameState } from "@hearthforge/shared";
import { defaultRaidState } from "@hearthforge/shared";
import { advance, createGame, raidOccupied, startRaid, startRaidFromQueue, stopCombat, xpForLevel } from "@hearthforge/engine";
import { deserialize, serialize } from "./index";

/**
 * QA 1.4.0 Spielstände (Kontrolleur, 2026-10-23): Raid-Lauf über Save/Load und Offline-Aufholen.
 * `it.fails` = dokumentierter Befund (Test ist so formuliert, wie es SEIN SOLL; er reißt heute und
 * wird nach dem Fix auf `it` umgestellt). Plain `it` = Absicherung des Ist-Zustands.
 */
const AT = 1_761_500_000_000;
const H8 = 8 * 60 * 60 * 1000;
type SaveShape = { version: number; savedAt: number; state: GameState };

function raider(gold = 5_000_000): GameState {
  const s = createGame({ name: "QA-Raid" }, content, 11);
  for (const id of Object.keys(content.skills)) s.skills[id] = { xp: xpForLevel(99) };
  s.dungeonsCleared.behind_the_throne = 1;
  s.raid = { ...defaultRaidState(), clears: { normal: 1, heroic: 1, mythic: 0 } };
  s.character.gold = gold;
  return s;
}

const roundTrip = (s: GameState, at: number): string => serialize(deserialize(serialize(s, at), content, at)!.state, at);

describe("Raid: Lauf in Phase „fight“ ohne passenden Kampf (Fenster zwischen Stopp-Knopf und nächstem Tick)", () => {
  it("Referenz online: der nächste Tick wertet den verlassenen Mythisch-Kampf als Tod und erstattet 25 %", () => {
    const s = raider();
    expect(startRaid(s, content, "gobkharaz", "mythic")).toBe("ok");
    const goldAfterFee = s.character.gold;
    stopCombat(s);
    advance(s, content, 100);
    expect(s.raid!.run).toBeNull();
    expect(s.raid!.lastResult?.outcome).toBe("defeated");
    expect(s.character.gold).toBe(goldAfterFee + Math.round(2_500_000 * 0.25));
  });

  it("[BEFUND] Laden im selben Fenster: der Lauf wird still gelöscht, Rückgabe und Ergebnis fehlen", () => {
    const s = raider();
    expect(startRaid(s, content, "gobkharaz", "mythic")).toBe("ok");
    const goldAfterFee = s.character.gold;
    stopCombat(s);
    const out = deserialize(serialize(s, AT), content, AT)!.state; // now === savedAt ⇒ 0 Ticks
    expect(out.raid!.run).toBeNull();
    // SOLL (wie online): 25 % der Gebühr zurück und ein Ergebnis-Breadcrumb.
    expect(out.character.gold).toBe(goldAfterFee + Math.round(2_500_000 * 0.25));
    expect(out.raid!.lastResult?.outcome).toBe("defeated");
  });

  it("[BEFUND] Normal aus der Warteschlange: `raid.queue` bleibt ohne Lauf hängen, Round-Trip ist kein Fixpunkt", () => {
    const s = raider();
    expect(startRaidFromQueue(s, content, "gobkharaz", "normal", 3)).toBe("ok");
    stopCombat(s);
    const once = serialize(deserialize(serialize(s, AT), content, AT)!.state, AT);
    const st = (JSON.parse(once) as SaveShape).state;
    // claude:2026-10-26T04:10:00+02:00 — behoben: Laden wendet „Kampf verlassen = Tod“ an, Warteschlange endet, Fixpunkt hält.
    expect(st.raid!.run?.phase).toBe("defeated");
    expect(st.raid!.queue).toBeNull();
    expect(serialize(deserialize(once, content, AT)!.state, AT)).toBe(once);
  });
});

describe("Raid: Rast im letzten Raum (Content-Schrumpf / Tamper)", () => {
  it("[BEFUND] Lauf hängt in „rest“, blockiert die Warteschlange und löst sich auch offline nie", () => {
    const s = raider();
    expect(startRaid(s, content, "gobkharaz", "normal")).toBe("ok");
    const run = s.raid!.run!;
    run.room = 4; // letzter Raum
    run.phase = "rest";
    run.restMs = 0;
    s.combat.monsterId = null;
    s.combat.dungeonId = null;
    s.actionQueue = [{ kind: "action", actionId: "mine_copper", target: null }];
    const res = deserialize(serialize(s, AT), content, AT + 60 * 60 * 1000)!;
    // SOLL: die Rast im letzten Raum ist unmöglich (onRaidRoomCleared setzt dort „complete“) ⇒ Sanitize/Tick lösen auf.
    expect(raidOccupied(res.state)).toBe(false);
    expect(res.state.activeActionId).toBe("mine_copper");
  });
});

describe("Raid: Offline-Aufholen mit Toden und Neustarts", () => {
  it("Normal, schwacher Held: bis zu drei Gratis-Neustarts, dann Ende; Bericht und Fixpunkt halten", () => {
    const s = raider();
    expect(startRaid(s, content, "gobkharaz", "normal")).toBe("ok");
    const goldAfterFee = s.character.gold;
    const res = deserialize(serialize(s, AT), content, AT + H8)!;
    const st = res.state;
    expect(st.stats.deaths).toBeGreaterThanOrEqual(1);
    expect(res.offline.deaths).toBe(st.stats.deaths);
    if (st.raid!.run === null) {
      // Lauf vorbei: genau maxAutoRestarts Neustarts wurden verbraucht, Ergebnis „defeated“, kein Gold verloren.
      expect(st.stats.deaths).toBe(1 + content.raids![0]!.maxAutoRestarts);
      expect(st.raid!.lastResult?.outcome).toBe("defeated");
      expect(st.character.gold).toBeGreaterThanOrEqual(goldAfterFee);
      expect(res.offline.combatStopped).toBe(true);
    } else {
      expect(["fight", "defeated"]).toContain(st.raid!.run.phase);
    }
    // Der Killer im Bericht ist ein bekanntes Raid-Monster.
    expect(res.offline.diedAgainst && content.monsters[res.offline.diedAgainst]).toBeTruthy();
    // Fixpunkt ab dem zweiten Load: der erste Serialize trägt noch die bewusst transienten Kampffelder
    // (`stopReason`, `enemyWard`, `noProgressMs`), die migrateState beim Laden verwirft (Vault-Doku v93).
    const once = serialize(deserialize(serialize(st, AT + H8), content, AT + H8)!.state, AT + H8);
    expect(serialize(deserialize(once, content, AT + H8)!.state, AT + H8)).toBe(once);
  });

  // claude:2026-10-26T04:10:00+02:00 — QA-Raid #8: ohne Auto-Kauf und ohne Warteschlange entscheidet offline nicht die Engine, der Tod-Dialog wartet.
  it("Heroisch ohne „Neustart kaufen“: nach dem Tod wartet der Lauf auf den Spieler, keine 100.000 Gold werden abgebucht", () => {
    const s = raider(1_000_000);
    expect(startRaid(s, content, "gobkharaz", "heroic")).toBe("ok");
    const goldAfterFee = s.character.gold;
    const res = deserialize(serialize(s, AT), content, AT + H8)!;
    expect(res.state.stats.deaths).toBe(1);
    expect(res.state.raid!.run?.phase).toBe("defeated");
    expect(res.state.raid!.lastResult).toBeNull();
    expect(res.state.character.gold).toBe(goldAfterFee);
  });

  // claude:2026-10-24T15:18:33+02:00 — QA2-Raid B2 (CEO, analog R3): IST auf SOLL umgestellt; scheitert der Auto-Kauf, wartet der Tod-Dialog.
  it("Heroisch mit „Neustart kaufen“, aber zu wenig Gold: kein Neustart, kein Minus, der Lauf wartet im Tod-Dialog", () => {
    const s = raider(950_000); // 900k Gebühr, danach 50k < 100k Neustart
    s.settings.raidAutoBuyRestart = true;
    expect(startRaid(s, content, "gobkharaz", "heroic")).toBe("ok");
    const goldAfterFee = s.character.gold;
    const res = deserialize(serialize(s, AT), content, AT + H8)!;
    expect(res.state.raid!.run?.phase).toBe("defeated");
    expect(res.state.raid!.lastResult).toBeNull();
    expect(res.state.character.gold).toBe(goldAfterFee);
    expect(res.state.character.gold).toBeGreaterThanOrEqual(0);
  });

  it("Mythisch offline: Tod beendet den Lauf mit 25 % Rückgabe", () => {
    const s = raider();
    expect(startRaid(s, content, "gobkharaz", "mythic")).toBe("ok");
    const goldAfterFee = s.character.gold;
    const res = deserialize(serialize(s, AT), content, AT + H8)!;
    expect(res.state.raid!.run).toBeNull();
    expect(res.state.character.gold).toBe(goldAfterFee + Math.round(2_500_000 * 0.25));
    expect(res.state.raid!.lastResult?.refund).toBe(Math.round(2_500_000 * 0.25));
  });
});

describe("Raid: Nebenwirkung des Ladens", () => {
  it("[BEFUND P3] laufender Raid-Kampf trägt den Raid-Raum in `dungeonsUnlocked` ein (Load-Regel „aktiver Run ⇒ unlocked“)", () => {
    const s = raider();
    expect(startRaid(s, content, "gobkharaz", "normal")).toBe("ok");
    expect(s.dungeonsUnlocked.gk_room_1).toBeUndefined();
    const out = deserialize(serialize(s, AT), content, AT)!.state;
    // SOLL: Raid-Räume sind keine freischaltbaren Dungeons; der Eintrag ist eine stille Mutation beim Laden.
    expect(out.dungeonsUnlocked.gk_room_1).toBeUndefined();
  });
});
