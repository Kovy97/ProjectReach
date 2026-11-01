// claude:2026-10-31T14:58:54+01:00 — Save-Vertrag SAVE 102 (Narben-Rückgabe und Nachzahlung zu 1.4.2, Chef-Auftrag 31.10.2026):
// `prestige.respec142`. Rückgabe exakt (nur Narbenbuch, Jägerkodex bleibt), Nachzahlung mit Beispiel-Historie samt Deckeln, Sammlung ins
// Hauptbuch ohne Doppelbezug beim nächsten Aschesturz, Stand ohne Sturz ohne Nachzahlung, Dev-Stand 99–101 nur Rückgabe, Idempotenz,
// erstes Offline-Fenster noch mit den alten Rängen, Leben auf das neue Maximum, Sanitizing, „Verstanden“ über Laden und Speichern.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { GameState, PrestigeRecord, PrestigeRunTally } from "@hearthforge/shared";
import {
  PRESTIGE_UNLOCK_QUEST_ID,
  SAVE_VERSION,
  defaultPrestigePaidLedger,
  earnedAP,
  effectiveMaxOfflineMs,
  emptyPrestigeRespecRetro,
} from "@hearthforge/shared";
import { isDungeonQueueEntry } from "@hearthforge/shared";
import {
  acknowledgePrestigeRespec,
  ascend,
  canEnterDungeon,
  computeStats,
  createGame,
  enqueueDungeonRuns,
  farmPlotsUnlocked,
  isDungeonUnlocked,
  startDungeon,
  prestigePointsPreview,
  prestigeRespecPending,
  xpForLevel,
} from "@hearthforge/engine";
import { deserialize, serialize } from "./index";

const VAULT_DIR = join(__dirname, "..", "fixtures", "save-compat");
const AT = 1_762_400_000_000;
const HOUR = 3_600_000;
type SaveShape = { version: number; savedAt: number; state: GameState };

const TALLY: PrestigeRunTally = {
  playMs: 1000,
  chronicleChapter: 21,
  questsClaimed: 40,
  kills: 5000,
  dungeons: 0,
  achievements: 10,
  petsFound: 1,
  slayerTasks: 0,
  paragonBest: 0,
  gold: 0,
};

function record(count: number, tally?: Partial<PrestigeRunTally>): PrestigeRecord {
  const rec: PrestigeRecord = { count, points: 50, totalLevel: 1100, skills99: 4, activePlayMs: count * 1000 };
  if (tally) rec.tally = { ...TALLY, ...tally };
  return rec;
}

/**
 * Ein Spielstand, wie ihn 1.4.1 (SAVE 98) mit drei Stürzen gespeichert hätte: Ränge im Narbenbuch (40 Narben bezahlt) und im
 * Jägerkodex, zwei Begleiter, ein normaler Raid-Abschluss, Historie mit Bilanzen. Ohne `respec142` (gab es vor 102 nicht).
 */
function v98WithFalls(): GameState {
  const s = createGame({ name: "Narbenträgerin" }, content, 21);
  const [petA, petB] = Object.keys(content.pets);
  s.character.ownedPets = { [petA!]: true, [petB!]: true } as typeof s.character.ownedPets;
  s.raid!.clears = { normal: 1, heroic: 0, mythic: 0 };
  s.prestige.count = 3;
  s.prestige.points = 10;
  s.prestige.pointsSpent = 40;
  s.prestige.runStart.raidClears = { normal: 1, heroic: 0, mythic: 0 };
  s.prestige.history = [
    record(1), // vor der Bilanz-Welle geschrieben: zählt 0
    record(2, { gold: 3_000_000, dungeons: 45, slayerTasks: 95 }), // 12 + 2 + 9
    record(3, { gold: 10_000_000, dungeons: 300, slayerTasks: 200 }), // Deckel: 20 + 10 + 10
  ];
  s.talents = { prestige: { startingGold: 2, keepTools: 1, earlyXp: 2, damage: 1 }, slayer: { tracking: 2 } };
  return s;
}

/** Als Rohstand einer älteren Version: `version` gesetzt, das SAVE-102-Feld entfernt (ältere Stände kennen es nicht). */
function asOld(s: GameState, version: number): string {
  const raw = structuredClone(s) as unknown as Record<string, unknown> & { prestige: Record<string, unknown> };
  raw.version = version;
  delete raw.prestige.respec142;
  return JSON.stringify({ version, savedAt: AT, state: raw });
}

function load(json: string, now = AT): GameState {
  const r = deserialize(json, content, now);
  expect(r).not.toBeNull();
  return r!.state;
}

describe("SAVE 102: Rückgabe und Nachzahlung für einen Stand von vor 1.4.2 (Original-Version 98, drei Stürze)", () => {
  it("Rückgabe exakt: Narbenbuch leer, 40 Narben zurück, Jägerkodex bleibt", () => {
    const s = load(asOld(v98WithFalls(), 98));
    expect(s.version).toBe(SAVE_VERSION);
    expect(s.talents.prestige).toBeUndefined();
    expect(s.talents.slayer).toEqual({ tracking: 2 });
    expect(s.prestige.pointsSpent).toBe(0);
    expect(s.prestige.respec142!.refunded).toBe(40);
    expect(s.prestige.respec142!.acknowledged).toBe(false);
    expect(prestigeRespecPending(s)).toBe(true);
  });

  it("Nachzahlung: Gold 3 Mio → 12, 45 Dungeons → 2, 95 Aufträge → 9; Deckel 20/10/10; Eintrag ohne Bilanz 0; Sammlung jetzt", () => {
    const s = load(asOld(v98WithFalls(), 98));
    const r = s.prestige.respec142!;
    expect(r.retro.gold).toBe(12 + 20);
    expect(r.retro.dungeons).toBe(2 + 10);
    expect(r.retro.slayer).toBe(9 + 10);
    expect(r.retro.pets).toBe(8); // 2 Begleiter × 4
    expect(r.retro.raidFirst).toBe(5); // erster normaler Abschluss
    expect(r.retro.bestiary).toBe(0);
    expect(r.retro.achievements).toBe(Math.floor(earnedAP(s, content) / 100));
    const sum = r.retro.gold + r.retro.dungeons + r.retro.slayer + r.retro.pets + r.retro.bestiary + r.retro.achievements + r.retro.raidFirst;
    expect(r.retro.total).toBe(sum);
    // Guthaben = alt 10 + Rückgabe 40 + Nachzahlung.
    expect(s.prestige.points).toBe(10 + 40 + sum);
  });

  it("Sammlung steht im Hauptbuch; der nächste Aschesturz zahlt sie nicht noch einmal, nur was danach dazukommt", () => {
    const s = load(asOld(v98WithFalls(), 98));
    const [petA, petB, petC] = Object.keys(content.pets);
    expect(s.prestige.paid.pets).toEqual([petA, petB]);
    expect(s.prestige.paid.raids).toEqual(["normal"]);
    const before = prestigePointsPreview(s, content);
    expect(before.fromPets).toBe(0);
    expect(before.fromRaidFirst).toBe(0);
    expect(before.onceTotal).toBe(0);

    for (const id of Object.keys(content.skills).slice(0, 4)) s.skills[id] = { xp: xpForLevel(99) };
    s.quests.claimed.push(PRESTIGE_UNLOCK_QUEST_ID);
    s.character.ownedPets[petC as keyof typeof s.character.ownedPets] = true;
    const preview = prestigePointsPreview(s, content);
    expect(preview.newPets).toEqual([petC]); // nur der neue Begleiter
    expect(preview.fromPets).toBe(4);
    const pointsBefore = s.prestige.points;
    expect(ascend(s, content)).toBe(true);
    expect(s.prestige.points).toBe(pointsBefore + preview.total);
    expect(s.prestige.paid.pets).toEqual([petA, petB, petC]);
    // Der Beleg reist durch den Sturz (unbestätigt bleibt unbestätigt), die Ränge des Jägerkodex auch.
    expect(s.prestige.respec142!.refunded).toBe(40);
    expect(s.prestige.respec142!.acknowledged).toBe(false);
    expect(prestigePointsPreview(s, content).onceTotal).toBe(0);
  });

  it("Leben und Schutz werden auf das neue Maximum geklemmt (Narbengewebe fällt weg)", () => {
    const raw = v98WithFalls();
    raw.talents.prestige = { maxHp: 5 };
    raw.prestige.pointsSpent = 6 + 9 + 12 + 15 + 18;
    raw.character.hp = computeStats(raw, content).maxHp;
    const s = load(asOld(raw, 98));
    expect(s.prestige.respec142!.refunded).toBe(60);
    const max = computeStats(s, content).maxHp;
    expect(max).toBeLessThan(raw.character.hp);
    expect(s.character.hp).toBe(max);
  });

  it("idempotent: dasselbe Alt-JSON zweimal geladen ergibt dasselbe; der gehobene Stand zahlt beim zweiten Laden nichts mehr", () => {
    const json = asOld(v98WithFalls(), 98);
    const a = serialize(load(json), AT);
    const b = serialize(load(json), AT);
    expect(b).toBe(a);
    const again = serialize(load(a), AT);
    expect(again).toBe(a);
  });

  it("ein Rohstand mit Beleg wird nie ein zweites Mal ausgezahlt, auch mit verfälschter alter Version", () => {
    const once = load(asOld(v98WithFalls(), 98));
    const tampered = structuredClone(once) as unknown as Record<string, unknown>;
    tampered.version = 95;
    const back = load(JSON.stringify({ version: 95, savedAt: AT, state: tampered }));
    expect(back.prestige.points).toBe(once.prestige.points);
    expect(back.prestige.respec142).toEqual(once.prestige.respec142);
  });
});

describe("SAVE 102: wer nichts bekommt", () => {
  it("v98-Stand ohne Sturz: keine Nachzahlung, kein Beleg, Hauptbuch leer (E2 zahlt beim ersten Sturz)", () => {
    const raw = v98WithFalls();
    raw.prestige.count = 0;
    raw.prestige.history = [];
    raw.prestige.points = 0;
    raw.prestige.pointsSpent = 0;
    delete (raw.talents as Record<string, unknown>).prestige;
    const s = load(asOld(raw, 98));
    expect(s.prestige.respec142).toBeNull();
    expect(s.prestige.points).toBe(0);
    expect(s.prestige.paid).toEqual(defaultPrestigePaidLedger());
    expect(prestigePointsPreview(s, content).fromPets).toBe(8);
    expect(prestigeRespecPending(s)).toBe(false);
  });

  it("Dev-Stand 101 (schon 1.4.2-Regeln): nur die Rückgabe, keine Nachzahlung trotz Bilanzen und unbezahlter Sammlung", () => {
    const s = load(asOld(v98WithFalls(), 101));
    expect(s.talents.prestige).toBeUndefined();
    expect(s.prestige.respec142).toEqual({ refunded: 40, retro: emptyPrestigeRespecRetro(), acknowledged: false });
    expect(s.prestige.points).toBe(10 + 40);
    expect(s.prestige.paid).toEqual(defaultPrestigePaidLedger());
  });

  it("Stand ab 102: nichts passiert (Ränge und Guthaben bleiben)", () => {
    const s = load(JSON.stringify({ version: SAVE_VERSION, savedAt: AT, state: v98WithFalls() }));
    expect(s.talents.prestige).toEqual({ startingGold: 2, keepTools: 1, earlyXp: 2, damage: 1 });
    expect(s.prestige.points).toBe(10);
    expect(s.prestige.pointsSpent).toBe(40);
    expect(s.prestige.respec142).toBeNull();
  });
});

describe("SAVE 102: Folgen des Rang-Verlusts bis zum Neukauf", () => {
  // claude:2026-10-31T15:36:11+01:00 — Coordinator 31.10.: auch der vorgeplante Lauf bleibt startbar (Alte-Pfade-Dungeons für den laufenden Durchgang in `dungeonsUnlocked`).
  it("„Alte Pfade“: der laufende Lauf geht weiter, der vorgeplante Lauf bleibt in der Warteschlange und startbar", () => {
    const raw = v98WithFalls();
    raw.talents.prestige = { earlyXp: 1, chronicleRecall: 1, dungeonRecall: 1 };
    raw.prestige.pointsSpent = 4 + 10 + 8;
    const recallOnly = content.dungeons.filter(
      (d) => !d.raidOnly && d.requiresQuest && d.encounters.length > 0 && content.monsters[d.encounters[0]!],
    );
    const [running, planned] = recallOnly;
    expect(running && planned).toBeTruthy();
    raw.dungeonsCleared = { [running!.id]: 2, [planned!.id]: 5 };
    expect(isDungeonUnlocked(raw, content, running!.id)).toBe(true);
    expect(startDungeon(raw, content, running!.id)).toBe(true);
    expect(enqueueDungeonRuns(raw, content, planned!.id, 10)).toBe(true);
    const s = load(asOld(raw, 98));
    expect(s.prestige.respec142!.refunded).toBe(22);
    expect(s.combat.dungeonId).toBe(running!.id); // der Lauf geht weiter
    expect(isDungeonUnlocked(s, content, running!.id)).toBe(true);
    expect(s.actionQueue.some((e) => isDungeonQueueEntry(e) && e.dungeonId === planned!.id)).toBe(true); // nichts gelöscht
    // Kein `dungeon_locked` beim Start: beide Dungeons stehen für diesen Durchgang in `dungeonsUnlocked`.
    expect(s.dungeonsUnlocked[running!.id]).toBe(true);
    expect(s.dungeonsUnlocked[planned!.id]).toBe(true);
    expect(canEnterDungeon(s, content, planned!.id)).toBe(true);
    // Der Stand bleibt beim zweiten Laden derselbe (die Freischaltung ist gespeichert, nichts wird doppelt gerechnet).
    expect(serialize(load(serialize(s, AT)), AT)).toBe(serialize(s, AT));
  });
});

describe("SAVE 102: Reihenfolge beim Laden (echtes v101-Fixture)", () => {
  it("das erste Offline-Fenster rechnet noch mit „Lange Nacht“ (+2 h), danach ist der Rang zurückgegeben", () => {
    const json = readFileSync(join(VAULT_DIR, "v101-synthetic-1.4.2.json"), "utf-8");
    const raw = JSON.parse(json) as SaveShape;
    expect(raw.state.talents.prestige?.offlineHours).toBe(1);
    const res = deserialize(json, content, raw.savedAt + 30 * HOUR)!;
    expect(res.state.talents.prestige).toBeUndefined();
    expect(res.offlineMs).toBe(effectiveMaxOfflineMs(res.state, content) + 2 * HOUR);
  });

  it("das Saatkammer-Beet 10 bleibt bepflanzt und ruht bis zum Neukauf (kein Verlust)", () => {
    const json = readFileSync(join(VAULT_DIR, "v101-synthetic-1.4.2.json"), "utf-8");
    const raw = JSON.parse(json) as SaveShape;
    const s = deserialize(json, content, raw.savedAt)!.state;
    expect(farmPlotsUnlocked(s, content)).toBe(9);
    expect(s.farmPlots[9]).toEqual(raw.state.farmPlots[9]);
  });
});

describe("SAVE 102: „Verstanden“ und Sanitizing", () => {
  it("acknowledgePrestigeRespec setzt das Flag einmal; es übersteht Speichern und Laden", () => {
    const s = load(asOld(v98WithFalls(), 98));
    expect(acknowledgePrestigeRespec(s)).toBe(true);
    expect(acknowledgePrestigeRespec(s)).toBe(false);
    expect(prestigeRespecPending(s)).toBe(false);
    const back = load(serialize(s, AT));
    expect(back.prestige.respec142!.acknowledged).toBe(true);
    const none = createGame({ name: "Ohne" }, content, 2);
    expect(acknowledgePrestigeRespec(none)).toBe(false);
  });

  it("kaputter Beleg: Zahlen ganzzahlig ≥ 0, total = Summe, acknowledged nur bei true; kein Objekt ⇒ null; Guthaben unberührt", () => {
    const s = createGame({ name: "Beleg" }, content, 4);
    s.prestige.count = 1;
    s.prestige.points = 77;
    (s.prestige as unknown as Record<string, unknown>).respec142 = {
      refunded: -5,
      retro: { gold: 3.7, dungeons: "x", slayer: 2, pets: Number.NaN, bestiary: 1, achievements: 4, raidFirst: 5, total: 9999, extra: 1 },
      acknowledged: "yes",
      extra: true,
    };
    const back = load(JSON.stringify({ version: SAVE_VERSION, savedAt: AT, state: s }));
    expect(back.prestige.respec142).toEqual({
      refunded: 0,
      retro: { gold: 3, dungeons: 0, slayer: 2, pets: 0, bestiary: 1, achievements: 4, raidFirst: 5, total: 15 },
      acknowledged: false,
    });
    expect(back.prestige.points).toBe(77);
    for (const bad of [undefined, null, 7, "x", [1]]) {
      (s.prestige as unknown as Record<string, unknown>).respec142 = bad;
      expect(load(JSON.stringify({ version: SAVE_VERSION, savedAt: AT, state: s })).prestige.respec142, String(bad)).toBeNull();
    }
  });
});
