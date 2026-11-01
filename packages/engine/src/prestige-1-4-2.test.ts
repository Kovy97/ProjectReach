import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { GameState } from "@hearthforge/shared";
import {
  FARM_PLOT_SLOTS,
  HUNT_TRAP_SLOTS,
  HUNT_TRAP_SLOTS_TOTAL,
  MAX_FARM_PLOTS,
  MAX_OFFLINE_MS,
  PET_ECHO_FACTOR,
  PRESTIGE_TALENT_TREE_ID,
  PRESTIGE_UNLOCK_QUEST_ID,
  achievementPoints,
  earnedAP,
  effectiveMaxOfflineMs,
  prestigeTalentValue,
} from "@hearthforge/shared";
import { createGame } from "./state";
import { xpForLevel } from "./leveling";
import { advance, effectiveActionDurationMs } from "./tick";
import { setActiveAction } from "./actions";
import { addItem } from "./inventory";
import { useConsumable } from "./consumable";
import { petEchoFactor, petEchoValue, petFoodHealMult, petPityProgress, tryPetDrop } from "./pets";
import { huntSetReason, huntTrapSlots } from "./hunting";
import { farmPlotsUnlocked, plantCrop, plotProgress } from "./farming";
import { estateStatus } from "./estates";
import { campBuildDurationMs } from "./camp";
import { onWorkOrderActionCompleted, workOrdersOf } from "./orders";
import { talentEffect } from "./talents";
import { canClaimQuest, claimQuest, questStatus, refreshDailyQuests } from "./quests"; // claude:2026-10-31T13:58:31+01:00 — A1 Tagesbrett
import { prestigeSkillXpMult, talentRareDropMult } from "./prestige-effects";
import {
  PRESTIGE_SOURCE_IDS,
  PRESTIGE_STATE_FIELDS,
  ascend,
  prestigeAscendPreview,
  prestigeBestiaryEntryComplete,
  prestigePointsPreview,
  prestigeRunSummary,
} from "./prestige";

// claude:2026-10-30T18:22:00+01:00 — 1.4.2 (Chef 30.10.): New Haven überlebt den Aschesturz. Gebäude, Stufen, Karte,
// Bau-Warteschlange und Veredelungs-Wahl bleiben unverändert; die Boni (z. B. Wachturm-Offline-Zeit) wirken sofort weiter.
// claude:2026-10-30T18:54:00+01:00 — 1.4.2 Welle 1 (design/1.4.2-aschesturz-spec.md): Narbenquellen (§ 2.1/2.2), Hauptbuch
// (nie doppelt, E2), Zeichen der Asche (§ 2.3), Vorschau `sources` (§ 2.4), jedes neue Narbenbuch-Talent (§ 3), Begleiter-Spur E10 (§ 4).

function ready(seed = 7): GameState {
  const s = createGame({ name: "Asche", portrait: "char_3" }, content, seed);
  return unlockAscend(s);
}

/** Freischaltung (4×99 + Kapitel 21) für den laufenden Durchgang setzen (auch nach einem Aufstieg). */
function unlockAscend(s: GameState): GameState {
  for (const id of Object.keys(content.skills).slice(0, 4)) s.skills[id] = { xp: xpForLevel(99) };
  if (!s.quests.claimed.includes(PRESTIGE_UNLOCK_QUEST_ID)) s.quests.claimed.push(PRESTIGE_UNLOCK_QUEST_ID);
  return s;
}

/** Narbenbuch-Ränge direkt setzen (der Kauf ist in talents.test.ts geprüft); ein Aufstieg schaltet den Baum frei. */
function scars(s: GameState, ranks: Record<string, number>): GameState {
  s.prestige.count = Math.max(1, s.prestige.count);
  s.talents = { ...s.talents, [PRESTIGE_TALENT_TREE_ID]: { ...ranks } };
  return s;
}

function setLevel(s: GameState, skill: string, level: number): void {
  s.skills[skill] = { xp: xpForLevel(level) };
}

function source(s: GameState, id: string) {
  return prestigePointsPreview(s, content).sources.find((x) => x.id === id)!;
}

/** Erstes Gebäude mit Offline-Bonus (Wachturm) aus dem echten Katalog, kein Id-Hardcoding. */
const WATCHTOWER = (content.campBuildings ?? []).find((b) => b.levels.some((l) => l.boost?.kind === "offlineCapMs"))!;
const OTHER = (content.campBuildings ?? []).find((b) => b.id !== WATCHTOWER.id)!;
const PET_IDS = Object.keys(content.pets);
const RAID_BOSSES = (content.raids ?? []).flatMap((r) => r.rooms.map((room) => room.bossId));

describe("1.4.2 · New Haven bleibt beim Aschesturz", () => {
  it("Wächterliste stuft camp als keep ein", () => {
    expect(PRESTIGE_STATE_FIELDS.camp).toBe("keep");
    expect(PRESTIGE_STATE_FIELDS.slayerFreeSkipDay).toBe("keep");
  });

  it("Gebäude, Karte, Warteschlange und Boni überstehen den Sturz", () => {
    const s = ready();
    s.camp.buildings[WATCHTOWER.id] = 2;
    s.camp.buildings[OTHER.id] = 1;
    s.camp.positions[WATCHTOWER.id] = { x: 0.25, y: 0.5 };
    s.camp.positions[OTHER.id] = { x: 0.75, y: 0.4 };
    s.camp.buildQueue = [OTHER.id];
    s.camp.buildSeq = 5;
    const before = structuredClone(s.camp);
    const offlineBefore = effectiveMaxOfflineMs(s, content);
    expect(offlineBefore).toBeGreaterThan(MAX_OFFLINE_MS);

    expect(ascend(s, content)).toBe(true);

    expect(s.prestige.count).toBe(1);
    expect(s.camp).toEqual(before);
    expect(effectiveMaxOfflineMs(s, content)).toBe(offlineBefore);
    // Der Rest des Durchgangs ist trotzdem neu (Gegenprobe: Fertigkeiten zurück).
    expect(s.skills[Object.keys(content.skills)[0]!]?.xp ?? 0).toBeLessThan(xpForLevel(99));
  });
});

describe("1.4.2 · Narbenquellen je Sturz (Spec § 2.1)", () => {
  it("gold: 1 je 250.000 Gold beim Sturz, Deckel 20, `next` = fehlendes Gold", () => {
    const s = ready();
    s.character.gold = 1_100_000;
    expect(source(s, "gold")).toMatchObject({ kind: "run", amount: 1_100_000, scars: 4, cap: 20, next: 150_000 });
    s.character.gold = 5_000_000;
    expect(source(s, "gold")).toMatchObject({ scars: 20, next: null });
    s.character.gold = 9_999_999;
    expect(source(s, "gold").scars).toBe(20);
  });

  it("dungeons: 1 je 20 Abschlüsse DIESES Durchgangs (Laufanker), Deckel 10", () => {
    const s = ready();
    s.dungeonsCleared = { [content.dungeons[0]!.id]: 45, [content.dungeons[1]!.id]: 10 };
    s.prestige.runStart.dungeons = 15; // 55 − 15 = 40
    expect(source(s, "dungeons")).toMatchObject({ amount: 40, scars: 2, cap: 10, next: 20 });
    s.dungeonsCleared = { [content.dungeons[0]!.id]: 999 };
    expect(source(s, "dungeons")).toMatchObject({ scars: 10, next: null });
  });

  it("slayer: 1 je 10 Aufträge dieses Durchgangs (Laufanker), Deckel 10", () => {
    const s = ready();
    s.slayerTasksCompleted = 52;
    s.prestige.runStart.slayerTasks = 15; // 37
    expect(source(s, "slayer")).toMatchObject({ amount: 37, scars: 3, cap: 10, next: 3 });
  });

  it("raid: normal 2 / heroisch 4 / mythisch 6 je Abschluss dieses Durchgangs, Deckel 12, Laufanker je Stufe", () => {
    const s = ready();
    s.raid!.clears = { normal: 3, heroic: 1, mythic: 0 };
    s.prestige.runStart.raidClears = { normal: 1, heroic: 0, mythic: 0 }; // 2 × normal + 1 × heroisch = 8
    expect(source(s, "raid")).toMatchObject({ amount: 3, scars: 8, cap: 12, next: 1 });
    s.raid!.clears = { normal: 3, heroic: 1, mythic: 1 }; // + 6 = 14 ⇒ Deckel
    expect(source(s, "raid")).toMatchObject({ amount: 4, scars: 12, next: null });
  });

  it("Der tiefere Schnitt (Rang 2, +50 %) wirkt nur auf „je Sturz“, nie auf die Sammlung", () => {
    const s = ready();
    s.character.ownedPets = { [PET_IDS[0]!]: true, [PET_IDS[1]!]: true }; // einmalig 8
    s.character.gold = 500_000; // je Sturz +2
    const plain = prestigePointsPreview(s, content);
    scars(s, { pointsBoost: 2 });
    const p = prestigePointsPreview(s, content);
    expect(p.pointsMult).toBe(0.5);
    expect(p.onceTotal).toBe(8);
    expect(p.runSubtotal).toBe(plain.runSubtotal);
    expect(p.runTotal).toBe(Math.floor(p.runSubtotal * 1.5));
    expect(p.total).toBe(p.runTotal + 8);
    expect(p.fromMult).toBe(p.total - p.subtotal);
  });
});

describe("1.4.2 · Einmalige Quellen und Hauptbuch (Spec § 2.2)", () => {
  it("pets: 4 je besessenem, unbezahltem Begleiter; der zweite Sturz zahlt dieselben nie wieder", () => {
    const s = ready();
    s.character.ownedPets = { [PET_IDS[0]!]: true, [PET_IDS[1]!]: true, [PET_IDS[2]!]: true };
    expect(source(s, "pets")).toMatchObject({ kind: "once", amount: 3, scars: 12, cap: 92, next: 1, paid: 0, total: 23 });
    expect(ascend(s, content)).toBe(true);
    expect(s.prestige.paid.pets).toEqual([PET_IDS[0], PET_IDS[1], PET_IDS[2]]);

    unlockAscend(s);
    expect(source(s, "pets")).toMatchObject({ amount: 0, scars: 0, paid: 3 });
    s.character.ownedPets[PET_IDS[3]!] = true;
    expect(source(s, "pets")).toMatchObject({ amount: 1, scars: 4 });
    const before = s.prestige.points;
    const pv = prestigePointsPreview(s, content);
    expect(ascend(s, content)).toBe(true);
    expect(s.prestige.points - before).toBe(pv.total);
    expect(s.prestige.paid.pets).toEqual(PET_IDS.slice(0, 4));
    unlockAscend(s);
    expect(prestigePointsPreview(s, content).fromPets).toBe(0);
  });

  it("bestiary: Kill + jede Loot-ItemId gesehen; Raid-Boss 1 Kill; `dg_`-Varianten nie; je Eintrag einmal", () => {
    const s = ready();
    const chicken = content.monsters.chicken!;
    s.monsterKills = { chicken: 3, goblin: 7, [RAID_BOSSES[0]!]: 1 };
    s.seenDrops = { chicken: chicken.loot.slice(1).map((l) => l.itemId), goblin: [] };
    expect(prestigeBestiaryEntryComplete(s, content, "chicken")).toBe(false); // ein Loot fehlt
    expect(prestigeBestiaryEntryComplete(s, content, RAID_BOSSES[0]!)).toBe(true); // Raid-Boss: Kill genügt
    expect(prestigeBestiaryEntryComplete(s, content, "goblin")).toBe(false);
    const dg = Object.keys(content.monsters).find((id) => id.startsWith("dg_"));
    if (dg) {
      s.monsterKills[dg] = 5;
      expect(prestigeBestiaryEntryComplete(s, content, dg)).toBe(false);
    }
    expect(source(s, "bestiary")).toMatchObject({ amount: 1, scars: 1, cap: 141, total: 141 });
    s.seenDrops.chicken = chicken.loot.map((l) => l.itemId);
    expect(prestigePointsPreview(s, content).newBestiary).toEqual(["chicken", RAID_BOSSES[0]].sort((a, b) =>
      Object.keys(content.monsters).indexOf(a!) - Object.keys(content.monsters).indexOf(b!)));
    expect(ascend(s, content)).toBe(true);
    expect([...s.prestige.paid.bestiary].sort()).toEqual(["chicken", RAID_BOSSES[0]!].sort());
    unlockAscend(s);
    expect(source(s, "bestiary")).toMatchObject({ amount: 0, scars: 0, paid: 2 });
  });

  it("achievements: 1 je volle 100 AP über dem bezahlten Stand, der Rest bleibt für später", () => {
    const s = ready();
    const picked: string[] = [];
    let ap = 0;
    for (const a of content.achievements) {
      if (ap >= 250) break;
      picked.push(a.id);
      ap += achievementPoints(a);
    }
    s.achievements = picked;
    const earned = earnedAP(s, content);
    expect(earned).toBeGreaterThanOrEqual(250);
    expect(source(s, "achievements")).toMatchObject({ amount: earned, scars: Math.floor(earned / 100), cap: 141, paid: 0 });
    expect(ascend(s, content)).toBe(true);
    expect(s.prestige.paid.ap).toBe(Math.floor(earned / 100) * 100);
    unlockAscend(s);
    const rest = earned % 100;
    expect(source(s, "achievements")).toMatchObject({ amount: rest, scars: 0, next: 100 - rest });
  });

  it("raidFirst: erster Abschluss je Stufe 5 / 10 / 20, je Stufe genau einmal", () => {
    const s = ready();
    s.raid!.clears = { normal: 4, heroic: 1, mythic: 0 };
    expect(source(s, "raidFirst")).toMatchObject({ amount: 2, scars: 15, cap: 35, next: 1, paid: 0, total: 3 });
    expect(ascend(s, content)).toBe(true);
    expect(s.prestige.paid.raids).toEqual(["normal", "heroic"]);
    unlockAscend(s);
    expect(source(s, "raidFirst").scars).toBe(0);
    s.raid!.clears = { normal: 4, heroic: 1, mythic: 1 };
    expect(source(s, "raidFirst")).toMatchObject({ amount: 1, scars: 20, next: null });
  });

  it("E2: leeres Hauptbuch ⇒ der erste Sturz zahlt die bestehende Sammlung genau einmal (Gutschrift == Vorschau)", () => {
    const s = ready();
    s.character.ownedPets = { [PET_IDS[5]!]: true };
    s.raid!.clears = { normal: 1, heroic: 0, mythic: 0 };
    s.prestige.runStart.raidClears = { normal: 1, heroic: 0, mythic: 0 }; // Migration: Raid zählt erst ab dem Update
    const pv = prestigePointsPreview(s, content);
    expect(pv.fromPets).toBe(4);
    expect(pv.fromRaidFirst).toBe(5);
    expect(pv.fromRaid).toBe(0); // der alte Abschluss zählt nur als Erst-Abschluss
    const sum = prestigeRunSummary(s, content);
    expect(sum.points.total).toBe(pv.total);
    expect(sum.points.lines.reduce((a, l) => a + l.points, 0)).toBe(sum.points.subtotal);
    expect(ascend(s, content)).toBe(true);
    expect(s.prestige.points).toBe(pv.total);
    expect(s.prestige.history.at(-1)!.points).toBe(pv.total);
    unlockAscend(s);
    const again = prestigePointsPreview(s, content);
    expect(again.onceTotal).toBe(0);
  });

  it("sources: feste Reihenfolge, Arten, Deckel; Summen == Aufschlüsselung", () => {
    const s = ready();
    s.character.gold = 300_000;
    s.character.ownedPets = { [PET_IDS[0]!]: true };
    const p = prestigePointsPreview(s, content);
    expect(p.sources.map((x) => x.id)).toEqual([...PRESTIGE_SOURCE_IDS]);
    const kinds = Object.fromEntries(p.sources.map((x) => [x.id, x.kind]));
    for (const id of ["base", "skills99", "totalLevel", "chronicle", "paragon", "gold", "dungeons", "slayer", "raid"]) expect(kinds[id], id).toBe("run");
    for (const id of ["pets", "bestiary", "achievements", "raidFirst"]) expect(kinds[id], id).toBe("once");
    const caps = Object.fromEntries(p.sources.map((x) => [x.id, x.cap]));
    expect(caps).toMatchObject({ base: 10, skills99: 89, totalLevel: 25, chronicle: 12, paragon: 10, gold: 20, dungeons: 10, slayer: 10, raid: 12, pets: 92, bestiary: 141, achievements: 141, raidFirst: 35 });
    const sumOf = (k: "run" | "once"): number => p.sources.filter((x) => x.kind === k).reduce((a, x) => a + x.scars, 0);
    expect(sumOf("run")).toBe(p.runSubtotal);
    expect(sumOf("once")).toBe(p.onceTotal);
    expect(p.total).toBe(p.runTotal + p.onceTotal);
    expect(source(s, "skills99")).toMatchObject({ amount: 4, scars: 32, next: 1 });
  });
});

describe("1.4.2 · Zeichen der Asche (Spec § 2.3)", () => {
  it("+2 % Fertigkeits-XP je bisherigem Sturz ohne Talent, höchstens +20 %, auch über Stufe 99", () => {
    const s = createGame({ name: "Z" }, content, 1);
    expect(prestigeSkillXpMult(s, content, "mining", 0)).toBe(1);
    s.prestige.count = 1;
    expect(prestigeSkillXpMult(s, content, "mining", 0)).toBeCloseTo(1.02, 12);
    s.prestige.count = 7;
    expect(prestigeSkillXpMult(s, content, "mining", xpForLevel(99) * 3)).toBeCloseTo(1.14, 12);
    s.prestige.count = 40;
    expect(prestigeSkillXpMult(s, content, "mining", 0)).toBeCloseTo(1.2, 12);
  });
});

describe("1.4.2 · Neue Narbenbuch-Talente (Spec § 3)", () => {
  it("Bezahlte Rechnung: Auto-Essen-Stufe, Auto-Buff (ohne Trank-Wahl) und Bankplätze bleiben; ohne Rang nicht", () => {
    const setup = (): GameState => {
      const s = ready();
      s.character.autoEatTier = 3;
      s.character.autoPotion = { healPotionId: "cooked_shrimp", healThreshold: 0.55, autoRebuffTonics: true, autoRebuffUnlocked: true };
      s.bankSlotsPurchased = 4;
      return s;
    };
    const without = setup();
    expect(ascend(without, content)).toBe(true);
    expect(without.character.autoEatTier).toBe(0);
    expect(without.character.autoPotion.autoRebuffUnlocked).toBe(false);
    expect(without.bankSlotsPurchased).toBe(0);

    const s = scars(setup(), { startingGold: 1, keepTools: 1, keepPurchases: 1 });
    expect(prestigeAscendPreview(s, content).kept.keepPurchases).toBe(true);
    expect(ascend(s, content)).toBe(true);
    expect(s.character.autoEatTier).toBe(3);
    expect(s.character.autoPotion).toEqual({ healPotionId: null, healThreshold: 0.55, autoRebuffTonics: true, autoRebuffUnlocked: true });
    expect(s.bankSlotsPurchased).toBe(4);
  });

  it("Ungebrochene Fährte: 25 / 50 / 100 % der Slayer-Punkte und Marken bleiben (abgerundet)", () => {
    for (const [rank, sp, tok] of [[0, 0, 0], [1, 250, 83], [2, 500, 166], [3, 1001, 333]] as const) {
      const s = ready();
      s.slayerPoints = 1001;
      s.character.questTokens = 333;
      if (rank > 0) scars(s, { startingGold: 1, keepTools: 1, keepBankStacks: 1, keepSlayerPoints: rank });
      const pv = prestigeAscendPreview(s, content);
      expect(pv.kept.slayerPoints, `Rang ${rank}`).toBe(sp);
      expect(pv.summary.goes.slayerPoints).toBe(1001 - sp);
      expect(pv.summary.goes.questTokens).toBe(333 - tok);
      expect(ascend(s, content)).toBe(true);
      expect(s.slayerPoints, `Rang ${rank}`).toBe(sp);
      expect(s.character.questTokens, `Rang ${rank}`).toBe(tok);
    }
  });

  it("Geübte Hand: Aktionsdauer −4 / −8 / −12 %", () => {
    const s = createGame({ name: "H" }, content, 1);
    const action = content.actions.cut_normal_tree!;
    const base = effectiveActionDurationMs(s, content, action);
    scars(s, { earlyXp: 2, actionSpeed: 3 });
    expect(effectiveActionDurationMs(s, content, action)).toBe(Math.round(base * 0.88));
  });

  it("Meisterglut: Meisterschafts-XP je Abschluss × 2 (Rang 3)", () => {
    const run = (rank: number): number => {
      const s = createGame({ name: "M" }, content, 1);
      if (rank > 0) scars(s, { masteryXp: rank }); // Ränge direkt gesetzt: ohne Geübte Hand, gleiche Dauer
      const action = content.actions.cut_normal_tree!;
      const dur = effectiveActionDurationMs(s, content, action);
      setActiveAction(s, content, action.id);
      advance(s, content, dur);
      return s.mastery[action.id]?.xp ?? 0;
    };
    const base = run(0);
    expect(base).toBeGreaterThan(0);
    // Genau ein Abschluss je Lauf (gleiche Dauer), also gleiche Meisterschaftsstufe vor der Vergabe.
    expect(run(3)).toBeCloseTo(base * 2, 9);
  });

  it("Glutblut: Essen heilt +30 % (Faktor additiv zum Begleiter), Tränke unberührt", () => {
    const heal = (rank: number): number => {
      const s = createGame({ name: "G" }, content, 1);
      setLevel(s, "vitality", 60);
      if (rank > 0) scars(s, { foodHeal: rank }); // ohne Narbengewebe: gleiches maximales Leben
      s.character.hp = 1;
      addItem(s.inventory, content, "cooked_shrimp", 1);
      expect(useConsumable(s, content, "cooked_shrimp")).toBe(true);
      return s.character.hp - 1;
    };
    const base = heal(0);
    expect(base).toBeGreaterThan(0);
    expect(heal(3)).toBe(Math.round(base * 1.3));
    const s = scars(createGame({ name: "G" }, content, 1), { foodHeal: 3 });
    expect(petFoodHealMult(s, content)).toBeCloseTo(1.3, 12);
  });

  it("Scharfer Blick: Schwellen-Faktor nur für Einträge ≤ 1/500, derselbe Wurf (Helfer für combat.ts)", () => {
    const s = createGame({ name: "B" }, content, 1);
    expect(talentRareDropMult(s, content, 1 / 1000)).toBe(1);
    scars(s, { damage: 2, goldFind: 1, rareDrop: 3 });
    expect(talentRareDropMult(s, content, 1 / 1000)).toBeCloseTo(1.15, 12);
    expect(talentRareDropMult(s, content, 1 / 500)).toBeCloseTo(1.15, 12);
    expect(talentRareDropMult(s, content, 0.01)).toBe(1);
  });

  it("Lange Nacht: Offline-Fenster +2/4/6/8 h (Rang 4: 8 h → 16 h, mit Wachturm bis 19 h); shared == engine", () => {
    const s = createGame({ name: "N" }, content, 1);
    for (const [rank, hours] of [[1, 2], [2, 4], [3, 6], [4, 8]] as const) {
      scars(s, { offlineHours: rank });
      expect(effectiveMaxOfflineMs(s, content)).toBe(MAX_OFFLINE_MS + hours * 3_600_000);
      expect(prestigeTalentValue(s, content, "offlineHours")).toBe(talentEffect(s, content, "offlineHours"));
    }
    s.camp.buildings[WATCHTOWER.id] = WATCHTOWER.levels.length;
    expect(effectiveMaxOfflineMs(s, content)).toBe(19 * 3_600_000);
    s.prestige.count = 0; // Baum gesperrt ⇒ wirkungslos (wie talentEffect)
    expect(prestigeTalentValue(s, content, "offlineHours")).toBe(0);
    expect(talentEffect(s, content, "offlineHours")).toBe(0);
  });

  it("Rabenpost: Auftrags-Uhren laufen × 1,4 (Rang 2), ohne zusätzlichen Wurf", () => {
    const tick = (rank: number): { clocks: Record<number, number>; rng: number } => {
      const s = createGame({ name: "R" }, content, 1);
      if (rank > 0) scars(s, { offlineHours: 1, workOrders: rank });
      const before = { ...workOrdersOf(s).tierMs! };
      onWorkOrderActionCompleted(s, content, content.actions.cut_normal_tree!, 1000, s.eventRng!);
      const after = workOrdersOf(s).tierMs!;
      return { clocks: { 1: before[1] - after[1], 2: before[2] - after[2], 3: before[3] - after[3] }, rng: s.eventRng!.state };
    };
    const a = tick(0);
    const b = tick(2);
    expect(a.clocks).toEqual({ 1: 1000, 2: 1000, 3: 1000 });
    expect(b.clocks).toEqual({ 1: 1400, 2: 1400, 3: 1400 });
    expect(b.rng).toBe(a.rng);
  });

  it("Fallensteller: +1/+2 Fallenplätze (6 → 8); ohne `content` (Alt-Aufrufer) nur die Stufen-Plätze", () => {
    const s = createGame({ name: "F" }, content, 1);
    setLevel(s, "hunting", 99);
    expect(s.huntTraps).toHaveLength(HUNT_TRAP_SLOTS_TOTAL);
    expect(huntTrapSlots(s, content)).toBe(HUNT_TRAP_SLOTS);
    expect(huntSetReason(s, content, HUNT_TRAP_SLOTS + 1, "pastures")).toBe("no_slot");
    scars(s, { offlineHours: 1, workOrders: 1, huntTraps: 2 });
    expect(huntTrapSlots(s, content)).toBe(HUNT_TRAP_SLOTS_TOTAL);
    expect(huntTrapSlots(s)).toBe(HUNT_TRAP_SLOTS);
    expect(huntSetReason(s, content, HUNT_TRAP_SLOTS + 1, "pastures")).not.toBe("no_slot");
    expect(estateStatus(s, content).trapsUnlocked).toBe(HUNT_TRAP_SLOTS_TOTAL);
    // Niedrige Stufe: die Plätze kommen zu den Stufen-Plätzen dazu.
    setLevel(s, "hunting", 1);
    expect(huntTrapSlots(s, content)).toBe(3);
  });

  it("Saatkammer: +1/2/3 Beete (9 → 12), Pflanzen auf Beet 12 erst mit Rang 3", () => {
    const s = createGame({ name: "S" }, content, 1);
    setLevel(s, "farming", 99);
    expect(s.farmPlots).toHaveLength(FARM_PLOT_SLOTS);
    expect(farmPlotsUnlocked(s, content)).toBe(MAX_FARM_PLOTS);
    expect(plotProgress(s, content, FARM_PLOT_SLOTS - 1).locked).toBe(true);
    const crop = Object.values(content.crops ?? {}).sort((a, b) => a.levelRequired - b.levelRequired)[0]!;
    addItem(s.inventory, content, crop.seedItem, 3);
    expect(plantCrop(s, content, FARM_PLOT_SLOTS - 1, crop.id)).toBe(false);
    scars(s, { offlineHours: 1, workOrders: 1, huntTraps: 1, farmPlots: 3 });
    expect(farmPlotsUnlocked(s, content)).toBe(FARM_PLOT_SLOTS);
    expect(plotProgress(s, content, FARM_PLOT_SLOTS - 1).locked).toBe(false);
    expect(plantCrop(s, content, FARM_PLOT_SLOTS - 1, crop.id)).toBe(true);
    expect(estateStatus(s, content).plotsUnlocked).toBe(FARM_PLOT_SLOTS);
  });

  it("Bauherrin: Bauzeit neuer Bauten −15 / −30 %, multiplikativ zum Schreibzelt", () => {
    const s = createGame({ name: "B" }, content, 1);
    expect(campBuildDurationMs(s, content, 600_000)).toBe(600_000);
    scars(s, { offlineHours: 2, campBuild: 2 });
    expect(campBuildDurationMs(s, content, 600_000)).toBe(420_000);
    const tent = (content.campBuildings ?? []).find((b) => b.levels.some((l) => l.boost?.kind === "buildSpeed"));
    if (tent) {
      s.camp.buildings[tent.id] = 1;
      const cut = tent.levels[0]!.boost!.value;
      expect(campBuildDurationMs(s, content, 600_000)).toBe(Math.round(600_000 * (1 - cut) * 0.7));
    }
  });

  it("Echo der Gefährten: Echo-Gewicht 35 / 50 % statt 25 %", () => {
    const s = createGame({ name: "E" }, content, 1);
    const pet = content.pets[PET_IDS[0]!]!;
    expect(petEchoFactor(s, content)).toBe(PET_ECHO_FACTOR);
    scars(s, { petEcho: 1 });
    expect(petEchoFactor(s, content)).toBe(0.35);
    scars(s, { petEcho: 2 });
    expect(petEchoFactor(s, content)).toBe(0.5);
    expect(petEchoValue(pet, s, content)).toBeCloseTo(petEchoValue(pet) * 2, 12);
  });
});

describe("1.4.2 · Begleiter-Spur E10 (Spec § 4)", () => {
  const combatPets = PET_IDS.filter((id) => content.pets[id]!.source.kind === "combat");
  const styleOf = (id: string): string => (content.pets[id]!.source as { style: string }).style;
  const melee = combatPets.filter((id) => styleOf(id) === "melee");
  const others = combatPets.filter((id) => styleOf(id) !== "melee");

  function hunter(withTalent: boolean): GameState {
    const s = createGame({ name: "Spur" }, content, 3);
    setLevel(s, "slayer", 90);
    if (withTalent) s.talents = { slayer: { trail: 1 } }; // nur der Pech-Schutz, Chance unverändert
    for (const id of melee) s.character.ownedPets[id] = true; // kein passender Nahkampf-Begleiter mehr offen ⇒ kein Wurf
    return s;
  }

  it("Kill im anderen Stil: Pech-Schutz der übrigen Kampf-Begleiter +1, OHNE RNG-Zug; Skill-Begleiter unberührt", () => {
    const s = hunter(true);
    const rng = s.rng.state;
    expect(tryPetDrop(s, content, { kind: "combat", style: "melee" })).toBeNull();
    expect(s.rng.state).toBe(rng);
    for (const id of others) expect(s.petPity[id], id).toBe(1);
    expect(Object.keys(s.petPity).sort()).toEqual([...others].sort());
  });

  it("ohne Talent `petPity` zählt nichts mit", () => {
    const s = hunter(false);
    tryPetDrop(s, content, { kind: "combat", style: "melee" });
    expect(s.petPity).toEqual({});
  });

  it("volle Spur: der nächste Kill im passenden Stil garantiert den Begleiter; der Zähler steigt nie über die Schwelle", () => {
    const s = hunter(true);
    const target = others[0]!;
    const pity = petPityProgress(s, content, content.pets[target]!)!;
    s.petPity[target] = pity.threshold - 1;
    tryPetDrop(s, content, { kind: "combat", style: "melee" });
    expect(s.petPity[target]).toBe(pity.threshold);
    tryPetDrop(s, content, { kind: "combat", style: "melee" });
    expect(s.petPity[target]).toBe(pity.threshold); // gedeckelt
    expect(tryPetDrop(s, content, { kind: "combat", style: styleOf(target) as "ranged" | "magic" })).toBe(target);
    expect(s.character.ownedPets[target]).toBe(true);
  });

  it("passender Stil unverändert: genau ein Wurf je offenem Begleiter des Stils", () => {
    const a = hunter(true);
    const b = hunter(false);
    tryPetDrop(a, content, { kind: "combat", style: "ranged" });
    tryPetDrop(b, content, { kind: "combat", style: "ranged" });
    expect(a.rng.state).toBe(b.rng.state);
  });
});

// claude:2026-10-31T13:58:31+01:00 — Befund A1: Aschesturz am selben Tag. Vorher zog refreshDailyQuests danach ein zweites Brett
// (zweiter Markenbezug) und setzte die Serie auf 1. Jetzt wandert das Tagesbrett mit, offene Karten messen ab dem Neustand.
describe("1.4.2 · Tagesbrett überlebt den Aschesturz (A1)", () => {
  const DAY = 20261031;
  it("gleicher Tag: dasselbe Brett, eingelöst bleibt eingelöst, Serie bleibt, offene Karten nicht sofort erfüllt", () => {
    const s = ready(11);
    s.stats.lastDailyDay = 20261030;
    s.stats.dailyStreak = 4;
    expect(refreshDailyQuests(s, content, DAY)).toBe(true);
    expect(s.stats.dailyStreak).toBe(5);
    expect(s.quests.daily.quests.length).toBeGreaterThan(1);
    s.quests.daily.quests[0]!.claimed = true; // heute schon eingelöst
    // Lebenszeit-Zähler weit hochdrehen: ohne neue Baseline wären die offenen Karten nach dem Sturz sofort erfüllt.
    s.stats.kills += 100_000;
    s.stats.itemsGathered += 100_000;
    s.stats.itemsCrafted += 100_000;
    for (const id of Object.keys(content.monsters)) s.monsterKills[id] = (s.monsterKills[id] ?? 0) + 10_000;
    for (const id of Object.keys(content.items)) s.stats.craftedById[id] = (s.stats.craftedById[id] ?? 0) + 10_000;
    const board = structuredClone(s.quests.daily);
    const tokens = s.character.questTokens;

    expect(ascend(s, content)).toBe(true);
    expect(s.quests.daily).toEqual(board);
    expect(refreshDailyQuests(s, content, DAY)).toBe(false); // derselbe Tag: nichts neu gezogen
    expect(s.quests.daily).toEqual(board);
    expect(s.stats.dailyStreak).toBe(5);
    expect(s.stats.lastDailyDay).toBe(DAY);

    const claimed = board.quests[0]!.questId;
    expect(canClaimQuest(s, content, claimed)).toBe(false);
    expect(claimQuest(s, content, claimed)).toBe(false);
    for (const entry of board.quests.slice(1)) {
      const q = content.quests.find((x) => x.id === entry.questId)!;
      expect(questStatus(s, content, q), q.id).toBe("active");
      expect(canClaimQuest(s, content, q.id), q.id).toBe(false);
    }
    expect(s.character.questTokens).toBe(tokens);

    // Nächster Tag: neues Brett, die Serie läuft weiter.
    expect(refreshDailyQuests(s, content, 20261101)).toBe(true);
    expect(s.stats.dailyStreak).toBe(6);
    expect(s.quests.daily.quests.every((d) => !d.claimed)).toBe(true);
  });

  it("ohne Brett (noch nie gezogen) bleibt der Neustand leer wie bisher", () => {
    const s = ready(12);
    expect(s.quests.daily).toEqual({ day: 0, quests: [] });
    expect(ascend(s, content)).toBe(true);
    expect(s.quests.daily).toEqual({ day: 0, quests: [] });
  });
});
