import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { GameState, ItemId, RaidDifficulty } from "@hearthforge/shared";
import { makeDungeonQueueEntry } from "@hearthforge/shared";
import { createTestGame } from "./test-helpers";
import { xpForLevel } from "./leveling";
import { advanceActionQueue, setActiveAction } from "./actions";
import { computeStats } from "./character";
import { startCombat, stopCombat } from "./combat";
import { startDungeon } from "./dungeon";
import { equipItem } from "./equipment";
import { itemCount } from "./inventory";
import { grantLoot } from "./mail";
import { isSalvageable, salvageYield } from "./salvage";
import { advance } from "./tick";
import {
  abandonRaid,
  closeRaidResult,
  continueRaid,
  onRaidDefeat,
  onRaidMonsterKilled,
  onRaidRoomCleared,
  raidChestAvailable,
  raidCombatMonster,
  raidFee,
  restartRaidRoom,
  startRaid,
  startRaidFromQueue,
  tickRaid,
} from "./raid";

/**
 * QA-Runde 2, 1.4.0 Raid „Die Hallen von Gobkha'raz“ (Kontrolleur, claude:2026-10-26T12:00:00+02:00).
 * Echter Raid-Content (`gobkharaz`), aber kein Kampf-RNG: Boss-Kills und Tode werden über die raid.ts-Pfade ausgelöst.
 * `it.fails("BUG: …")` = SOLL-Erwartung, die heute scheitert (Befund im Bericht design/qa/1.4.0-r2-raid.md).
 * Normales `it` = geprüftes und gültiges Verhalten.
 */
const MONDAY = new Date(2026, 9, 26, 12, 0, 0).getTime(); // Mo 26.10.2026, Woche 42 seit 05.01. ⇒ Index 42 % 8 = 2 „war_drums“
const PAYDAY = new Date(2026, 10, 9, 12, 0, 0).getTime(); // Mo 09.11.2026 ⇒ Index 44 % 8 = 4 „payday“
const RAID = "gobkharaz";
const FEES: Record<RaidDifficulty, number> = { normal: 300_000, heroic: 900_000, mythic: 2_500_000 };

function raider(gold = 5_000_000, seed = 7, clears: Record<RaidDifficulty, number> = { normal: 1, heroic: 1, mythic: 0 }): GameState {
  const s = createTestGame({ name: "QA2" }, content, seed);
  for (const id of Object.keys(content.skills)) s.skills[id] = { xp: xpForLevel(99) };
  s.dungeonsCleared.behind_the_throne = 1;
  s.raid!.clears = clears;
  s.character.gold = gold;
  return s;
}

function leaveCombat(s: GameState): void {
  s.combat.monsterId = null;
  s.combat.dungeonId = null;
  s.combat.encounterIndex = 0;
}

/** Boss des aktuellen Raums gilt als besiegt (Belohnungspfad von raid.ts), danach ist der Kampf vorbei. */
function killBoss(s: GameState, nowMs?: number): void {
  s.combat.encounterIndex = 4;
  onRaidRoomCleared(s, content, nowMs);
  leaveCombat(s);
}

function ownedRaidPieces(s: GameState): ItemId[] {
  const ids: ItemId[] = [];
  for (const slot of s.inventory.slots) if (slot && slot.itemId.startsWith("gk_")) ids.push(slot.itemId);
  for (const inst of s.inventory.instances) if (inst.baseItemId.startsWith("gk_")) ids.push(inst.baseItemId);
  for (const [id, qty] of Object.entries(s.bank)) if (qty > 0 && id.startsWith("gk_")) ids.push(id as ItemId);
  for (const inst of s.bankInstances ?? []) if (inst.baseItemId.startsWith("gk_")) ids.push(inst.baseItemId);
  return ids;
}

describe("Gebühren je Stufe (A8/B1) und Zahltag", () => {
  it("300.000 / 900.000 / 2.500.000; Zahltag ×0,80; Gold genau in Höhe der Gebühr reicht, ein Gold weniger nicht", () => {
    for (const d of ["normal", "heroic", "mythic"] as const) {
      expect(raidFee(content, RAID, d)).toBe(FEES[d]);
      expect(raidFee(content, RAID, d, "payday")).toBe(Math.round(FEES[d] * 0.8));
      const ok = raider(FEES[d]);
      expect(startRaid(ok, content, RAID, d, MONDAY)).toBe("ok");
      expect(ok.character.gold).toBe(0);
      expect(ok.raid!.run).toMatchObject({ difficulty: d, room: 0, phase: "fight", feePaid: FEES[d], modifier: "war_drums" });
      expect(ok.raid!.feesPaid).toBe(FEES[d]);
      const poor = raider(FEES[d] - 1);
      expect(startRaid(poor, content, RAID, d, MONDAY)).toBe("gold");
      expect(poor.raid!.run).toBeNull();
      expect(poor.character.gold).toBe(FEES[d] - 1);
    }
    const pay = raider(240_000);
    expect(startRaid(pay, content, RAID, "normal", PAYDAY)).toBe("ok");
    expect(pay.raid!.run!.modifier).toBe("payday");
    expect(pay.character.gold).toBe(0);
  });
});

describe("Aufgeben im Mythisch-Kampf gegen Fliehen (A15)", () => {
  it("Referenz: Fliehen (Stopp-Knopf) im Mythisch-Kampf = Tod der Stufe, 25 % der Gebühr zurück", () => {
    const s = raider();
    expect(startRaid(s, content, RAID, "mythic")).toBe("ok");
    const afterFee = s.character.gold;
    stopCombat(s);
    tickRaid(s, content, 100, false);
    expect(s.raid!.run).toBeNull();
    expect(s.character.gold).toBe(afterFee + 625_000);
    expect(s.raid!.lastResult).toMatchObject({ outcome: "defeated", refund: 625_000 });
  });

  // claude:2026-10-24T15:18:33+02:00 — B1 behoben: Aufgeben im Mythisch-Kampf nimmt den Pfad des Stopp-Knopfs (A15).
  it("„Aufgeben“ (Raid-Karte) im laufenden Mythisch-Kampf verlässt denselben Kampf und gibt wie Fliehen 25 % zurück", () => {
    const s = raider();
    expect(startRaid(s, content, RAID, "mythic")).toBe("ok");
    const afterFee = s.character.gold;
    abandonRaid(s, content); // RaidSection.tsx „Aufgeben“ während run.phase === "fight"
    expect(s.raid!.run).toBeNull();
    // SOLL (A15: Kampf verlassen = gefallen, Mythisch 25 % zurück): gleiche Rückgabe wie beim Stopp-Knopf.
    expect(s.character.gold).toBe(afterFee + 625_000);
    expect(s.raid!.lastResult).toMatchObject({ outcome: "defeated", refund: 625_000 });
    expect(s.combat.monsterId).toBeNull();
    expect(s.combat.dungeonId).toBeNull();
  });

  it("Aufgeben im Mythisch-Kampf einer Warteschlangen-Runde: 25 % zurück, Warteschlange endet mit Grund (wie Fliehen)", () => {
    const s = raider();
    expect(startRaidFromQueue(s, content, RAID, "mythic", 3)).toBe("ok");
    const afterFee = s.character.gold;
    abandonRaid(s, content);
    expect(s.raid!.run).toBeNull();
    expect(s.raid!.queue).toBeNull();
    expect(s.character.gold).toBe(afterFee + 625_000);
    expect(s.lastQueueSkip).toMatchObject({ reason: "defeated", raidId: RAID });
  });

  it("Aufgeben im Normal-/Heroisch-Kampf: Lauf endet ohne Rückgabe (kein Tod-Dialog dazwischen)", () => {
    for (const d of ["normal", "heroic"] as const) {
      const s = raider();
      expect(startRaid(s, content, RAID, d)).toBe("ok");
      const afterFee = s.character.gold;
      abandonRaid(s, content);
      expect(s.raid!.run).toBeNull();
      expect(s.character.gold).toBe(afterFee);
      expect(s.raid!.lastResult).toMatchObject({ outcome: "abandoned", refund: 0 });
    }
  });

  it("Aufgeben in der Mythisch-Rast erstattet 25 % wie Tod und Fliehen (CEO-Entscheid N2)", () => {
    const s = raider();
    expect(startRaid(s, content, RAID, "mythic")).toBe("ok");
    const afterFee = s.character.gold;
    const fee = s.raid!.run!.feePaid;
    killBoss(s);
    expect(s.raid!.run!.phase).toBe("rest");
    const goldBefore = s.character.gold;
    abandonRaid(s, content);
    expect(s.raid!.run).toBeNull();
    const refund = Math.round(fee * 0.25);
    expect(s.character.gold).toBe(goldBefore + refund);
    expect(goldBefore).toBeGreaterThanOrEqual(afterFee);
    expect(s.raid!.lastResult).toMatchObject({ outcome: "abandoned", refund });
  });
});

describe("Heroisch-Tod offline mit „Neustart automatisch kaufen“ (R3: keine verfallene Gebühr ohne Wahl des Spielers)", () => {
  it("Referenz (R3): ohne Auto-Kauf wartet der Lauf offline im Tod-Dialog, Gold unverändert", () => {
    const s = raider();
    expect(startRaid(s, content, RAID, "heroic")).toBe("ok");
    leaveCombat(s);
    onRaidDefeat(s, content, "defeated");
    const gold = s.character.gold;
    tickRaid(s, content, 8 * 3_600_000, true);
    expect(s.raid!.run?.phase).toBe("defeated");
    expect(s.raid!.lastResult).toBeNull();
    expect(s.character.gold).toBe(gold);
  });

  it("BELEG (Hinweis, Folge von R3): solange der Heroisch-Tod-Dialog offline wartet, ruht auch die Aktions-Warteschlange", () => {
    const s = raider();
    expect(startRaid(s, content, RAID, "heroic")).toBe("ok");
    leaveCombat(s);
    onRaidDefeat(s, content, "defeated");
    const actionId = Object.keys(content.actions).find((id) => content.actions[id]!.skill === "mining")!;
    s.actionQueue = [{ kind: "action", actionId, target: null }];
    advance(s, content, 60 * 60_000, { offline: true });
    expect(s.raid!.run?.phase).toBe("defeated");
    expect(s.activeActionId).toBeNull();
    expect(s.actionQueue.length).toBe(1);
  });

  // claude:2026-10-24T15:18:33+02:00 — B2 behoben (CEO, analog R3): scheitert der Auto-Kauf, wartet der Tod-Dialog.
  it("Auto-Kauf an, aber Gold reicht nicht (offline, keine Warteschlange): der Tod-Dialog wartet, die Gebühr verfällt nicht", () => {
    const s = raider(950_000); // 900k Gebühr, danach 50k < 100k Neustart
    s.settings.raidAutoBuyRestart = true;
    expect(startRaid(s, content, RAID, "heroic")).toBe("ok");
    leaveCombat(s);
    onRaidDefeat(s, content, "defeated");
    tickRaid(s, content, 5_000, true);
    // SOLL: Der Kauf ist nicht möglich ⇒ keine Entscheidung durch die Engine, der Tod-Dialog wartet (wie ohne Auto-Kauf).
    expect(s.raid!.run?.phase).toBe("defeated");
    expect(s.raid!.lastResult).toBeNull();
  });

  it("Auto-Kauf an, drei Neustarts gekauft, vierter Tod offline: Limit erreicht, der Tod-Dialog wartet auf den Spieler", () => {
    const s = raider(2_000_000);
    s.settings.raidAutoBuyRestart = true;
    expect(startRaid(s, content, RAID, "heroic")).toBe("ok");
    for (let i = 0; i < 3; i++) {
      leaveCombat(s);
      onRaidDefeat(s, content, "defeated");
      tickRaid(s, content, 5_000, true);
      expect(s.raid!.run?.phase).toBe("fight");
    }
    expect(s.raid!.run!.restarts).toBe(3);
    expect(s.character.gold).toBe(2_000_000 - 900_000 - 300_000);
    leaveCombat(s);
    onRaidDefeat(s, content, "defeated");
    tickRaid(s, content, 5_000, true);
    // SOLL: Limit erreicht ⇒ nicht die Engine entscheidet; der Dialog wartet auf den Spieler (Neustart kaufen oder Aufgeben).
    expect(s.raid!.run?.phase).toBe("defeated");
    expect(s.raid!.lastResult).toBeNull();
  });

  it("Wartender Dialog nach gescheitertem Auto-Kauf: der Spieler kauft später selbst nach (Gold reicht) und spielt weiter", () => {
    const s = raider(950_000);
    s.settings.raidAutoBuyRestart = true;
    expect(startRaid(s, content, RAID, "heroic")).toBe("ok");
    leaveCombat(s);
    onRaidDefeat(s, content, "defeated");
    advance(s, content, 60_000, { offline: true });
    expect(s.raid!.run?.phase).toBe("defeated");
    expect(s.character.gold).toBe(50_000);
    expect(s.raid!.run!.restMs).toBe(0); // Countdown läuft nicht ins Minus
    s.character.gold += 100_000; // z. B. erarbeitet
    expect(restartRaidRoom(s, content)).toBe("ok");
    expect(s.raid!.run!.phase).toBe("fight");
    expect(s.character.gold).toBe(50_000);
  });

  it("A6 bleibt: in der Warteschlange entscheidet die Engine; scheitert der Auto-Kauf, endet Lauf und Warteschlange", () => {
    const s = raider(950_000);
    s.settings.raidAutoBuyRestart = true;
    expect(startRaidFromQueue(s, content, RAID, "heroic", 3)).toBe("ok");
    leaveCombat(s);
    onRaidDefeat(s, content, "defeated");
    tickRaid(s, content, 5_000, false);
    expect(s.raid!.run).toBeNull();
    expect(s.raid!.queue).toBeNull();
    expect(s.raid!.lastResult).toMatchObject({ outcome: "defeated", refund: 0 });
    expect(s.character.gold).toBe(50_000);
  });
});

// claude:2026-10-24T15:18:33+02:00 — QA2-Saves B2 (CEO: offline wie online): eine eigene Aktion oder ein eigener Kampf des Spielers wird von der
// Raid-Automatik (Rast-Countdown, Neustart nach Tod, nächste Warteschlangen-Runde) nicht verworfen; der Lauf wartet.
describe("Eigene Aktion/eigener Kampf während Rast, Tod-Dialog oder Abschluss (QA2-Saves B2)", () => {
  const MINE = "mine_copper";

  it("Rast + endlose eigene Aktion, offline: der Raid wartet in der Rast, die Aktion läuft weiter und bringt XP", () => {
    const s = raider();
    expect(startRaid(s, content, RAID, "normal")).toBe("ok");
    killBoss(s);
    expect(s.raid!.run!.phase).toBe("rest");
    setActiveAction(s, content, MINE);
    expect(s.activeActionId).toBe(MINE);
    const xp = s.skills.mining!.xp;
    advance(s, content, 60 * 60_000, { offline: true });
    expect(s.raid!.run?.phase).toBe("rest");
    expect(s.raid!.run!.room).toBe(0);
    expect(s.activeActionId).toBe(MINE);
    expect(s.skills.mining!.xp).toBeGreaterThan(xp);
    expect(s.raid!.run!.restMs).toBe(3_000); // Countdown ruht
  });

  it("Rast + eigene Aktion, online mit Auto-Weiter: gleiches Verhalten wie offline (wartet)", () => {
    const s = raider();
    s.settings.raidAutoContinue = true;
    expect(startRaid(s, content, RAID, "normal")).toBe("ok");
    killBoss(s);
    setActiveAction(s, content, MINE);
    tickRaid(s, content, 10_000, false);
    expect(s.raid!.run?.phase).toBe("rest");
    expect(s.activeActionId).toBe(MINE);
  });

  it("Rast: endet die eigene Aktion (oder stoppt der Spieler sie), läuft der Countdown offline weiter und der nächste Raum beginnt", () => {
    const s = raider();
    expect(startRaid(s, content, RAID, "normal")).toBe("ok");
    killBoss(s);
    setActiveAction(s, content, MINE);
    tickRaid(s, content, 10_000, true);
    expect(s.raid!.run?.phase).toBe("rest");
    setActiveAction(s, content, null);
    tickRaid(s, content, 2_900, true);
    expect(s.raid!.run?.phase).toBe("rest");
    tickRaid(s, content, 200, true);
    expect(s.raid!.run?.phase).toBe("fight");
    expect(s.raid!.run!.room).toBe(1);
  });

  it("Rast + eigener Kampf (offline): der Raid betritt keinen Raum, der eigene Kampf bleibt", () => {
    const s = raider();
    expect(startRaid(s, content, RAID, "normal")).toBe("ok");
    killBoss(s);
    expect(startCombat(s, content, "chicken")).toBe(true);
    tickRaid(s, content, 10_000, true);
    expect(s.raid!.run?.phase).toBe("rest");
    expect(s.combat.monsterId).toBe("chicken");
    expect(s.combat.dungeonId).toBeNull();
  });

  it("Normal-Tod-Dialog + eigene Aktion, offline: kein Gratis-Neustart, der Dialog wartet; ohne Aktion startet der Raum neu", () => {
    const s = raider();
    expect(startRaid(s, content, RAID, "normal")).toBe("ok");
    leaveCombat(s);
    onRaidDefeat(s, content, "defeated");
    setActiveAction(s, content, MINE);
    tickRaid(s, content, 10_000, true);
    expect(s.raid!.run?.phase).toBe("defeated");
    expect(s.raid!.run!.restarts).toBe(0);
    expect(s.activeActionId).toBe(MINE);
    setActiveAction(s, content, null);
    tickRaid(s, content, 3_000, true);
    expect(s.raid!.run?.phase).toBe("fight");
    expect(s.raid!.run!.restarts).toBe(1);
  });

  it("Abschluss mit Folgerunde in der Warteschlange + eigene Aktion: keine neue Runde (keine Gebühr), Abschluss wartet", () => {
    const s = raider();
    expect(startRaidFromQueue(s, content, RAID, "normal", 3)).toBe("ok");
    for (let room = 0; room < 5; room++) {
      killBoss(s);
      if (room < 4) expect(continueRaid(s, content)).toBe(true);
    }
    expect(s.raid!.run!.phase).toBe("complete");
    const gold = s.character.gold;
    setActiveAction(s, content, MINE);
    tickRaid(s, content, 10_000, true);
    expect(s.raid!.run?.phase).toBe("complete");
    expect(s.character.gold).toBe(gold);
    expect(s.activeActionId).toBe(MINE);
    closeRaidResult(s, content); // der Spieler schließt selbst: zählt, nächste Runde startet
    expect(s.raid!.queue).toMatchObject({ remaining: 2, completed: 1 });
    expect(s.raid!.run?.phase).toBe("fight");
  });

  it("Abschluss ohne Folgerunde + eigene Aktion, offline: der Dialog schließt (betritt keinen Raum), die Aktion läuft weiter", () => {
    const s = raider();
    expect(startRaid(s, content, RAID, "normal")).toBe("ok");
    for (let room = 0; room < 5; room++) {
      killBoss(s);
      if (room < 4) expect(continueRaid(s, content)).toBe(true);
    }
    setActiveAction(s, content, MINE);
    tickRaid(s, content, 3_000, true);
    expect(s.raid!.run).toBeNull();
    expect(s.raid!.lastResult?.outcome).toBe("complete");
    expect(s.activeActionId).toBe(MINE);
  });

  it("Warteschlangen-Runde, Rast + eigene Aktion: kein Raum-Eintritt, die Warteschlange bleibt stehen (nichts verworfen)", () => {
    const s = raider();
    expect(startRaidFromQueue(s, content, RAID, "normal", 3)).toBe("ok");
    killBoss(s);
    setActiveAction(s, content, MINE);
    tickRaid(s, content, 10_000, false);
    expect(s.raid!.run?.phase).toBe("rest");
    expect(s.raid!.queue).toMatchObject({ remaining: 3 });
    expect(s.activeActionId).toBe(MINE);
  });
});

describe("Abschluss: Laufzeit, Bestzeit, Dialog-Uhr", () => {
  it("BELEG (UI-Befund RaidScreens.tsx:256): im Abschluss-Fenster läuft elapsedMs weiter, die live gerechnete Laufzeit weicht von fastestMs ab", () => {
    const s = raider();
    expect(startRaid(s, content, RAID, "normal")).toBe("ok");
    for (let room = 0; room < 5; room++) {
      killBoss(s);
      if (room < 4) {
        expect(s.raid!.run!.phase).toBe("rest");
        expect(continueRaid(s, content)).toBe(true);
      }
    }
    const run = s.raid!.run!;
    expect(run.phase).toBe("complete");
    expect(s.raid!.clears.normal).toBe(2);
    const recorded = s.raid!.fastestMs.normal!;
    expect(s.elapsedMs - run.startedAtMs).toBe(recorded); // im Moment des Abschlusses gleich
    advance(s, content, 1_000, { offline: false }); // Dialog steht online offen, die Spieluhr läuft weiter
    expect(s.raid!.run?.phase).toBe("complete");
    expect(s.elapsedMs - s.raid!.run!.startedAtMs).toBeGreaterThan(recorded); // Dialog-Formel driftet ⇒ „Neue Bestzeit“ verschwindet, Zeit zählt hoch
  });

  it("Auto-Weiter online ohne Warteschlange: Rast endet nach 3 s von selbst, der Abschluss-Dialog bleibt stehen", () => {
    const s = raider();
    s.settings.raidAutoContinue = true;
    expect(startRaid(s, content, RAID, "normal")).toBe("ok");
    killBoss(s);
    expect(s.raid!.run!.phase).toBe("rest");
    tickRaid(s, content, 2_900, false);
    expect(s.raid!.run!.phase).toBe("rest");
    tickRaid(s, content, 200, false);
    expect(s.raid!.run!.phase).toBe("fight");
    expect(s.raid!.run!.room).toBe(1);
    expect(s.combat.dungeonId).toBe("gk_room_2");
    for (let room = 1; room < 5; room++) {
      killBoss(s);
      if (room < 4) tickRaid(s, content, 3_100, false);
    }
    expect(s.raid!.run!.phase).toBe("complete");
    tickRaid(s, content, 10_000, false);
    expect(s.raid!.run!.phase).toBe("complete"); // online schließt nur der Spieler
  });
});

describe("Rast und Raumwechsel", () => {
  it("Rast heilt LP und Ward voll; der nächste Raum beginnt mit Welle 1 und skalierten Werten", () => {
    const s = raider();
    expect(startRaid(s, content, RAID, "heroic")).toBe("ok");
    killBoss(s);
    const stats = computeStats(s, content);
    s.character.hp = 1;
    s.character.ward = 0;
    expect(continueRaid(s, content)).toBe(true);
    expect(s.character.hp).toBe(stats.maxHp);
    expect(s.character.ward).toBe(stats.maxWard);
    expect(s.combat.encounterIndex).toBe(0);
    expect(s.combat.monsterId).toBe("gk_armory_breaker");
    const m = raidCombatMonster(s, content)!;
    expect(m.maxHp).toBe(Math.round(content.monsters.gk_armory_breaker!.maxHp * 2.0));
    expect(s.combat.enemyHp).toBe(m.maxHp);
    expect(m.level).toBe(content.monsters.gk_armory_breaker!.level + 10);
  });

  it("Doppelte Belohnung: ein zweiter Raum-Abschluss ohne laufenden Kampf vergibt nichts mehr", () => {
    const s = raider();
    expect(startRaid(s, content, RAID, "normal")).toBe("ok");
    killBoss(s);
    const loot = JSON.stringify(s.raid!.run!.loot);
    const dust = itemCount(s.inventory, "relic_dust") + (s.bank.relic_dust ?? 0);
    onRaidRoomCleared(s, content); // nochmal, aber der Lauf steht in „rest“ und es gibt keinen Kampf
    expect(JSON.stringify(s.raid!.run!.loot)).toBe(loot);
    expect(itemCount(s.inventory, "relic_dust") + (s.bank.relic_dust ?? 0)).toBe(dust);
    expect(s.raid!.bossKills["gk_tallymistress:normal"]).toBe(1);
  });
});

describe("Beute (R2 Chef-Entscheid: Boss-Teile als Chance; Nebenbeute; Trash; Wochentruhe)", () => {
  it("Boss ohne Truhe: Nebenbeute immer (6 Staub, 2–4 Götzeneisen), Raid-Teile nur in rund 35 % der Kills, nie Gold", () => {
    let withPiece = 0;
    const N = 120;
    for (let seed = 1; seed <= N; seed++) {
      const s = raider(5_000_000, seed);
      expect(startRaid(s, content, RAID, "normal")).toBe("ok");
      const gold = s.character.gold;
      killBoss(s); // ohne nowMs ⇒ keine Wochentruhe
      expect(s.character.gold).toBe(gold);
      const got = s.raid!.run!.lastLoot;
      expect(got.find((l) => l.itemId === "relic_dust")?.qty).toBe(6);
      const bars = got.find((l) => l.itemId === "godiron_bar")?.qty ?? 0;
      expect(bars).toBeGreaterThanOrEqual(2);
      expect(bars).toBeLessThanOrEqual(4);
      const pieces = got.filter((l) => l.itemId.startsWith("gk_"));
      expect(pieces.length).toBeLessThanOrEqual(2); // 1 Ziehung + 15 % zweite
      for (const p of pieces) expect(content.raids![0]!.rooms[0]!.table.entries.some((e) => e.itemId === p.itemId)).toBe(true);
      if (pieces.length > 0) withPiece++;
    }
    expect(withPiece / N).toBeGreaterThan(0.2);
    expect(withPiece / N).toBeLessThan(0.55);
  });

  it("Wochentruhe: sicheres Teil + 15 Staub + 5 Barren, einmal je Boss und Stufe je Kalenderwoche; Stufen getrennt", () => {
    const s = raider(10_000_000, 3);
    expect(startRaid(s, content, RAID, "heroic", MONDAY)).toBe("ok");
    killBoss(s, MONDAY);
    const got = s.raid!.run!.lastLoot;
    expect(got.filter((l) => l.itemId.startsWith("gk_")).length).toBeGreaterThanOrEqual(1);
    expect(got.find((l) => l.itemId === "relic_dust")?.qty).toBe(10 + 25);
    expect(got.find((l) => l.itemId === "godiron_bar")!.qty).toBeGreaterThanOrEqual(2 + 5);
    expect(raidChestAvailable(s, "gk_tallymistress", "heroic", MONDAY)).toBe(false);
    expect(raidChestAvailable(s, "gk_tallymistress", "normal", MONDAY)).toBe(true);
    expect(raidChestAvailable(s, "gk_quartermaster", "heroic", MONDAY)).toBe(true);
    abandonRaid(s, content);
    expect(startRaid(s, content, RAID, "heroic", MONDAY + 3_600_000)).toBe("ok");
    killBoss(s, MONDAY + 3_600_000);
    expect(s.raid!.run!.lastLoot.find((l) => l.itemId === "relic_dust")?.qty).toBe(10); // nur Nebenbeute, Truhe schon weg
  });

  it("Varianten: Heroisch-Beute heißt <id>_heroic (variantOf, Rarität heroic, Stufe XIII, Wert 50.000), Mythisch entsprechend", () => {
    for (const [d, suffix, rarity, value] of [["heroic", "_heroic", "heroic", 50_000], ["mythic", "_mythic", "mythic", 90_000]] as const) {
      const s = raider(10_000_000, 5);
      expect(startRaid(s, content, RAID, d, MONDAY)).toBe("ok");
      killBoss(s, MONDAY); // Truhe garantiert mindestens ein Teil
      const ids = ownedRaidPieces(s);
      expect(ids.length).toBeGreaterThanOrEqual(1);
      for (const id of ids) {
        expect(id.endsWith(suffix)).toBe(true);
        const it = content.items[id]!;
        expect(it.variantOf).toBe(id.slice(0, -suffix.length));
        expect(it.rarity).toBe(rarity);
        expect(it.tier).toBe(13);
        expect(it.value).toBe(value);
        expect(content.items[it.variantOf!]).toBeDefined();
      }
    }
  });

  it("Trash-Kill: Reliktstaub immer (Menge je Stufe), kein Gold; Boss-Kill löst keinen Trash-Pfad aus", () => {
    for (const [d, lo, hi] of [["normal", 1, 1], ["heroic", 1, 2], ["mythic", 2, 3]] as const) {
      const s = raider(5_000_000, 11);
      expect(startRaid(s, content, RAID, d)).toBe("ok");
      const gold = s.character.gold;
      const m = raidCombatMonster(s, content)!;
      onRaidMonsterKilled(s, content, m);
      const dust = s.raid!.run!.loot.find((l) => l.itemId === "relic_dust")!.qty;
      expect(dust).toBeGreaterThanOrEqual(lo);
      expect(dust).toBeLessThanOrEqual(hi);
      expect(s.character.gold).toBe(gold);
      const before = JSON.stringify(s.raid!.run!.loot);
      onRaidMonsterKilled(s, content, content.monsters.gk_tallymistress!);
      expect(JSON.stringify(s.raid!.run!.loot)).toBe(before);
    }
  });

  it("Zerlegen: alle 93 Raid-Teile sind zerlegbar und liefern Material (BG/A13)", () => {
    const ids = Object.keys(content.items).filter((id) => id.startsWith("gk_") && content.items[id]!.tier === 13);
    expect(ids.length).toBe(93);
    for (const id of ids) {
      expect(isSalvageable(content, id), id).toBe(true);
      const y = salvageYield(content, id);
      expect(y, id).not.toBeNull();
    }
  });
});

describe("Sets und Räume", () => {
  it("A14: Normal-Kopf plus Heroisch-Brust zählen als zwei Teile desselben Sets (Stufe 2 aktiv)", () => {
    const s = raider();
    const before = computeStats(s, content).attributes.int;
    grantLoot(s, content, "gk_fire_head", 1);
    grantLoot(s, content, "gk_fire_chest_heroic", 1);
    expect(equipItem(s, content, "gk_fire_head").ok).toBe(true);
    const afterOne = computeStats(s, content).attributes.int;
    expect(equipItem(s, content, "gk_fire_chest_heroic").ok).toBe(true);
    const afterTwo = computeStats(s, content).attributes.int;
    const headInt = content.items.gk_fire_head!.modifiers!.int!;
    const chestInt = content.items.gk_fire_chest_heroic!.modifiers!.int!;
    expect(afterOne - before).toBe(headInt);
    expect(afterTwo - afterOne).toBe(chestInt + 6); // +6 Intelligenz aus Stufe 2 des Ornats
  });

  it("Raid-Räume sind ohne Raid-Lauf weder direkt noch über die Dungeon-Warteschlange startbar", () => {
    const s = raider();
    expect(startDungeon(s, content, "gk_room_5")).toBe(false);
    expect(s.combat.monsterId).toBeNull();
    s.actionQueue = [makeDungeonQueueEntry("gk_room_5", 3)];
    advanceActionQueue(s, content);
    expect(s.combat.monsterId).toBeNull();
    expect(s.combat.dungeonId).toBeNull();
    expect(s.raid!.run).toBeNull();
    expect(s.actionQueue.length).toBe(0);
  });
});
