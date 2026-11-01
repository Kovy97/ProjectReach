// claude:2026-10-31T14:58:54+01:00 — Narben-Rückgabe und Nachzahlung zu 1.4.2 (SAVE 102, Chef-Auftrag 31.10.2026): Engine-Verben direkt.
// Den Ladepfad (Original-Version, Reihenfolge nach dem Offline-Nachholen, Vault) prüft persistence/save102-respec.test.ts.
import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { GameState, PrestigeRecord, PrestigeRunTally } from "@hearthforge/shared";
import { PRESTIGE_TALENT_TREE_ID, PRESTIGE_UNLOCK_QUEST_ID, emptyPrestigeRespecRetro } from "@hearthforge/shared";
import { createGame } from "./state";
import { xpForLevel } from "./leveling";
import { isDungeonUnlocked } from "./dungeon";
import {
  acknowledgePrestigeRespec,
  applyPrestigeRespec142,
  ascend,
  prestigePointsPreview,
  prestigeRespecPending,
  prestigeRetroRunScars,
} from "./prestige";

const TALLY: PrestigeRunTally = {
  playMs: 0,
  chronicleChapter: 0,
  questsClaimed: 0,
  kills: 0,
  dungeons: 0,
  achievements: 0,
  petsFound: 0,
  slayerTasks: 0,
  paragonBest: 0,
  gold: 0,
};

function rec(count: number, tally?: Partial<PrestigeRunTally>): PrestigeRecord {
  const r: PrestigeRecord = { count, points: 40, totalLevel: 1000, skills99: 4, activePlayMs: 0 };
  if (tally) r.tally = { ...TALLY, ...tally };
  return r;
}

function fallen(): GameState {
  const s = createGame({ name: "Asche" }, content, 5);
  s.prestige.count = 2;
  s.prestige.points = 3;
  s.prestige.pointsSpent = 22;
  s.prestige.history = [rec(1, { gold: 3_000_000, dungeons: 45, slayerTasks: 95 }), rec(2, { gold: 249_999, dungeons: 19, slayerTasks: 9 })];
  s.talents = { [PRESTIGE_TALENT_TREE_ID]: { earlyXp: 1, chronicleRecall: 1, dungeonRecall: 1 }, slayer: { tracking: 1 } };
  return s;
}

describe("prestigeRetroRunScars", () => {
  it("je Eintrag mit Bilanz nach den 1.4.2-Regeln und Deckeln; ohne Bilanz 0", () => {
    expect(prestigeRetroRunScars([rec(1, { gold: 3_000_000, dungeons: 45, slayerTasks: 95 })])).toEqual({ gold: 12, dungeons: 2, slayer: 9, runs: 1 });
    expect(prestigeRetroRunScars([rec(1, { gold: 99_000_000, dungeons: 1000, slayerTasks: 1000 })])).toEqual({ gold: 20, dungeons: 10, slayer: 10, runs: 1 });
    expect(prestigeRetroRunScars([rec(1, { gold: 249_999, dungeons: 19, slayerTasks: 9 }), rec(2)])).toEqual({ gold: 0, dungeons: 0, slayer: 0, runs: 1 });
    expect(prestigeRetroRunScars(undefined)).toEqual({ gold: 0, dungeons: 0, slayer: 0, runs: 0 });
  });
});

describe("applyPrestigeRespec142", () => {
  it("Rückgabe: nur der Narbenbuch-Baum, Guthaben + pointsSpent; ohne retro keine Nachzahlung", () => {
    const s = fallen();
    const r = applyPrestigeRespec142(s, content, { retro: false });
    expect(r).toEqual({ refunded: 22, retro: emptyPrestigeRespecRetro(), acknowledged: false });
    expect(s.talents[PRESTIGE_TALENT_TREE_ID]).toBeUndefined();
    expect(s.talents.slayer).toEqual({ tracking: 1 });
    expect(s.prestige.points).toBe(25);
    expect(s.prestige.pointsSpent).toBe(0);
  });

  it("mit retro: Bilanz-Narben plus Sammlung aus derselben Vorschau, Hauptbuch fortgeschrieben; zweiter Aufruf ändert nichts", () => {
    const s = fallen();
    const pet = Object.keys(content.pets)[0]!;
    s.character.ownedPets = { [pet]: true } as typeof s.character.ownedPets;
    const once = prestigePointsPreview(s, content);
    const r = applyPrestigeRespec142(s, content, { retro: true })!;
    expect(r.retro.gold + r.retro.dungeons + r.retro.slayer).toBe(12 + 2 + 9);
    expect(r.retro.pets).toBe(4);
    expect(r.retro.pets + r.retro.bestiary + r.retro.achievements + r.retro.raidFirst).toBe(once.onceTotal);
    expect(r.retro.total).toBe(23 + once.onceTotal);
    expect(s.prestige.points).toBe(3 + 22 + r.retro.total);
    expect(s.prestige.paid.pets).toEqual([pet]);
    expect(prestigePointsPreview(s, content).onceTotal).toBe(0);
    const snapshot = JSON.stringify(s);
    expect(applyPrestigeRespec142(s, content, { retro: true })).toBe(s.prestige.respec142);
    expect(JSON.stringify(s)).toBe(snapshot);
  });

  it("ohne Sturz: keine Nachzahlung, nichts ausgegeben ⇒ Beleg null", () => {
    const s = createGame({ name: "Neu" }, content, 6);
    s.character.ownedPets = { [Object.keys(content.pets)[0]!]: true } as typeof s.character.ownedPets;
    expect(applyPrestigeRespec142(s, content, { retro: true })).toBeNull();
    expect(s.prestige.respec142).toBeNull();
    expect(s.prestige.points).toBe(0);
    expect(prestigeRespecPending(s)).toBe(false);
  });

  // claude:2026-10-31T15:36:11+01:00 — Coordinator 31.10.: über „Alte Pfade“ offene Dungeons bleiben für den laufenden Durchgang offen, der nächste Sturz setzt das zurück.
  it("„Alte Pfade“: nur über den Rang offene Dungeons bleiben im laufenden Durchgang offen (`dungeonsUnlocked`), bis zum nächsten Sturz", () => {
    const s = fallen();
    const recallOnly = content.dungeons.filter((x) => x.requiresQuest && !x.raidOnly);
    const [d, never] = recallOnly;
    s.dungeonsCleared = { [d!.id]: 3 }; // `never` wurde nie geräumt: bleibt zu
    expect(isDungeonUnlocked(s, content, d!.id)).toBe(true);
    expect(isDungeonUnlocked(s, content, never!.id)).toBe(false);
    applyPrestigeRespec142(s, content, { retro: false });
    expect(s.talents[PRESTIGE_TALENT_TREE_ID]).toBeUndefined();
    expect(s.dungeonsUnlocked).toEqual({ [d!.id]: true });
    expect(isDungeonUnlocked(s, content, d!.id)).toBe(true);
    expect(isDungeonUnlocked(s, content, never!.id)).toBe(false);
    expect(s.dungeonsCleared[d!.id]).toBe(3);
    // Der nächste Sturz setzt `dungeonsUnlocked` zurück; ohne neu gekauften Rang ist der Dungeon dann wieder zu.
    for (const id of Object.keys(content.skills).slice(0, 4)) s.skills[id] = { xp: xpForLevel(99) };
    s.quests.claimed.push(PRESTIGE_UNLOCK_QUEST_ID);
    expect(ascend(s, content)).toBe(true);
    expect(s.dungeonsUnlocked[d!.id]).toBeUndefined();
    expect(isDungeonUnlocked(s, content, d!.id)).toBe(false);
  });

  it("ohne „Alte Pfade“ schaltet die Rückgabe nichts frei", () => {
    const s = fallen();
    s.talents[PRESTIGE_TALENT_TREE_ID] = { earlyXp: 1 };
    const d = content.dungeons.find((x) => x.requiresQuest && !x.raidOnly)!;
    s.dungeonsCleared = { [d.id]: 3 };
    applyPrestigeRespec142(s, content, { retro: false });
    expect(s.dungeonsUnlocked).toEqual({});
  });
});

describe("acknowledgePrestigeRespec und der Aschesturz", () => {
  it("Verstanden setzt das Flag; der Beleg übersteht den Sturz unverändert", () => {
    const s = fallen();
    applyPrestigeRespec142(s, content, { retro: false });
    expect(prestigeRespecPending(s)).toBe(true);
    for (const id of Object.keys(content.skills).slice(0, 4)) s.skills[id] = { xp: xpForLevel(99) };
    s.quests.claimed.push(PRESTIGE_UNLOCK_QUEST_ID);
    expect(ascend(s, content)).toBe(true);
    expect(s.prestige.respec142).toEqual({ refunded: 22, retro: emptyPrestigeRespecRetro(), acknowledged: false });
    expect(acknowledgePrestigeRespec(s)).toBe(true);
    expect(prestigeRespecPending(s)).toBe(false);
    expect(acknowledgePrestigeRespec(s)).toBe(false);
  });
});
