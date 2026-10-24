import { createRng as createRngW3, deriveEventRngSeed } from "@hearthforge/engine"; // claude:2026-10-25T00:30:00+02:00
import { defaultRaidState, defaultSkillEventState, defaultWorkOrderState } from "@hearthforge/shared";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { GameState } from "@hearthforge/shared";
import { PRESTIGE_HISTORY_MAX, PRESTIGE_UNLOCK_QUEST_ID, SAVE_VERSION, defaultPrestigeRunBaseline, defaultPrestigeState } from "@hearthforge/shared";
import {
  PRESTIGE_CHARACTER_FIELDS,
  PRESTIGE_STATE_FIELDS,
  ascend,
  collectMail,
  createGame,
  mailCollectBlocked,
  prestigeFreightLocked,
  prestigeRunCounters,
  prestigeRunSummary,
  questObjectiveProgress,
  questStatus,
  secondPetSlotUnlocked,
  talentEffect,
  xpForLevel, storagePredicate } from "@hearthforge/engine";
import { deserialize, serialize } from "./index";

// claude:2026-10-17T23:30:00+02:00 — Prestige-Fundament (SAVE 88, 1.3 Welle B1): Migration v87 → v88,
// Sanitize-Härtung, Vault-Fixture v88 (nach einem echten Aufstieg gepinnt) und der Wächter gegen die
// Schlüssel eines voll befüllten Spielstands.

const VAULT = join(__dirname, "..", "fixtures", "save-compat");
type SaveShape = { version: number; savedAt: number; state: GameState };

function read(file: string): { json: string; raw: SaveShape } {
  const json = readFileSync(join(VAULT, file), "utf8");
  return { json, raw: JSON.parse(json) as SaveShape };
}

function loadState(state: unknown, version = SAVE_VERSION): GameState {
  const at = 1_760_000_000_000;
  const res = deserialize(JSON.stringify({ version, savedAt: at, state }), content, at);
  expect(res).not.toBeNull();
  return res!.state;
}

describe("Migration v87 → v88", () => {
  it("v87-Vault-Save bekommt den Default-Prestige-Zustand — und SAVE 88 ändert sonst nichts am Laden", () => {
    const { json, raw } = read("v87-synthetic-1.3.0.json");
    expect(raw.version).toBe(87);
    expect((raw.state as unknown as Record<string, unknown>).prestige).toBeUndefined();
    const res = deserialize(json, content, raw.savedAt)!;
    expect(res.offlineTicks).toBe(0);
    expect(res.state.version).toBe(SAVE_VERSION); // claude:2026-10-23T16:50:00+02:00 — seit 1.4.0 läuft die Kette weiter (v89+)
    expect(res.state.prestige).toEqual(defaultPrestigeState());

    // Gegenprobe: derselbe v87-Save, in dem das Feld schon als Default steht, lädt byte-gleich. Damit ist
    // belegt, dass die v88-Migration GENAU dieses eine Feld ergänzt (alle übrigen Lade-Schritte sind dieselben).
    const mitFeld = JSON.parse(json) as SaveShape;
    mitFeld.state.prestige = defaultPrestigeState();
    const res2 = deserialize(JSON.stringify(mitFeld), content, raw.savedAt)!;
    expect(serialize(res2.state, raw.savedAt)).toBe(serialize(res.state, raw.savedAt));
  });

  it("ein alter Test-Save mit version 88 OHNE Feld (v88 ging einst in v87 auf) lädt ebenfalls mit Default", () => {
    const { raw } = read("v87-synthetic-1.3.0.json");
    const s = loadState(raw.state, 88);
    expect(s.prestige).toEqual(defaultPrestigeState());
  });
});

describe("Sanitize prestige", () => {
  const base = (): GameState => createGame({ name: "T" }, content, 1);

  it("kaputte Werte: Default bzw. ganzzahlig ≥ 0; ungültige Historien-Einträge fallen weg; count ≥ Historie", () => {
    const s = base();
    (s as unknown as { prestige: unknown }).prestige = {
      count: -3,
      points: 12.9,
      pointsSpent: Number.NaN,
      history: [
        { count: 1, points: 40, totalLevel: 1010, skills99: 4, activePlayMs: 1000 },
        { count: 0, points: 1, totalLevel: 1, skills99: 1, activePlayMs: 1 }, // count < 1
        { count: 2, points: -1, totalLevel: 1, skills99: 1, activePlayMs: 1 }, // negativ
        { count: 3, points: 1.5, totalLevel: 1, skills99: 1, activePlayMs: 1 }, // Bruch
        "x",
        null,
        { count: 4, points: 50, totalLevel: 1100, skills99: 5, activePlayMs: 2000, extra: true },
      ],
    };
    const back = loadState(s);
    expect(back.prestige).toEqual({
      count: 2,
      points: 12,
      pointsSpent: 0,
      // claude:2026-10-18T19:40:00+02:00 — Welle E1: ohne `runStart` zählt alles ab Spielbeginn, nur die Spielzeit
      // kommt exakt aus dem jüngsten Historien-Eintrag.
      runStart: { kills: 0, dungeons: 0, achievements: 0, pets: 0, slayerTasks: 0, activePlayMs: 2000 },
      history: [
        { count: 1, points: 40, totalLevel: 1010, skills99: 4, activePlayMs: 1000 },
        { count: 4, points: 50, totalLevel: 1100, skills99: 5, activePlayMs: 2000 },
      ],
    });
  });

  it("fehlend, null oder Unsinn ⇒ Default; Historie gedeckelt (jüngste bleiben)", () => {
    for (const v of [undefined, null, 7, "x", []]) {
      const s = base() as unknown as Record<string, unknown>;
      if (v === undefined) delete s.prestige;
      else s.prestige = v;
      expect(loadState(s).prestige).toEqual(defaultPrestigeState());
    }
    const s = base();
    s.prestige.history = Array.from({ length: PRESTIGE_HISTORY_MAX + 5 }, (_, i) => ({
      count: i + 1,
      points: 1,
      totalLevel: 1000,
      skills99: 4,
      activePlayMs: i,
    }));
    s.prestige.count = PRESTIGE_HISTORY_MAX + 5;
    const back = loadState(s);
    expect(back.prestige.history).toHaveLength(PRESTIGE_HISTORY_MAX);
    expect(back.prestige.history[0]!.count).toBe(6);
    expect(back.prestige.count).toBe(PRESTIGE_HISTORY_MAX + 5);
  });

  it("gültiger Zustand ist ein Fixpunkt (Round-Trip byte-gleich)", () => {
    const s = base();
    // claude:2026-10-18T19:40:00+02:00 — Welle E1: mit `runStart` und einem Eintrag mit, einem ohne `tally`.
    s.prestige = { count: 2, points: 7, pointsSpent: 93, runStart: { kills: 900, dungeons: 4, achievements: 12, pets: 3, slayerTasks: 6, activePlayMs: 20 }, history: [
      { count: 1, points: 50, totalLevel: 1040, skills99: 4, activePlayMs: 10 },
      { count: 2, points: 50, totalLevel: 1050, skills99: 4, activePlayMs: 20, tally: {
        playMs: 10, chronicleChapter: 23, questsClaimed: 31, kills: 500, dungeons: 2, achievements: 7, petsFound: 1, slayerTasks: 4, paragonBest: 15, gold: 123_456,
      } },
    ] };
    const at = 1_760_000_000_000;
    const once = serialize(deserialize(serialize(s, at), content, at)!.state, at);
    const twice = serialize(deserialize(once, content, at)!.state, at);
    expect(twice).toBe(once);
    expect((JSON.parse(once) as SaveShape).state.prestige).toEqual(s.prestige);
  });
});

describe("v88-Vault-Fixture (nach einem echten Aufstieg gepinnt)", () => {
  const { json, raw } = read("v88-synthetic-1.3.0.json");

  it("trägt v88, einen Aufstieg samt Historie, behaltene Sammlung und gesperrte Rabenfracht", () => {
    expect(raw.version).toBe(88);
    expect(raw.state.version).toBe(88);
    const s = deserialize(json, content, raw.savedAt)!.state;
    expect(s.prestige.count).toBe(1);
    expect(s.prestige.history).toHaveLength(1);
    expect(s.prestige.points).toBe(s.prestige.history[0]!.points);
    expect(s.prestige.points).toBeGreaterThan(0);
    expect(s.talents.slayer).toBeDefined();
    expect(Object.keys(s.character.ownedPets).length).toBeGreaterThanOrEqual(2);
    expect(s.character.companionPetId2).not.toBeNull();
    // Rabenfracht liegt noch im Postfach, ist aber gesperrt (zweiter Durchgang, noch keine 4×99).
    const freight = s.mailbox.find((m) => m.kind === "transfer");
    expect(freight).toBeDefined();
    // claude:2026-10-18T12:00:00+02:00 — Welle B2 (Format-Nachtrag v88): die beim Aufstieg gehaltene Post trägt das Flag.
    expect(freight!.prestigeHeld).toBe(true);
    expect(prestigeFreightLocked(s, content)).toBe(true);
    expect(collectMail(s, content, freight!.id).blocked).toBe("prestige_locked");
    // Quest-Laufanker: Kapitel 1 (Sammeln) zählt nur, was im zweiten Durchgang gesammelt wurde (40 Kupfererz),
    // nicht die Lebenszeit-Summe von über 80 000.
    const ch1 = content.quests.find((q) => q.id === "chronicle_01")!;
    expect(s.stats.itemsGathered).toBeGreaterThan(80_000);
    expect(questObjectiveProgress(s, content, ch1, 0)).toBe(40);
    const ch2 = content.quests.find((q) => q.id === "chronicle_02")!;
    expect(questStatus(s, content, ch2)).toBe("locked");
  });

  it("Sanitize-Fixpunkt: Laden + Speichern ist byte-gleich (bis auf die Felder späterer Versionen)", () => {
    // claude:2026-10-23T16:50:00+02:00 — seit SAVE 89 (1.4.0) ergänzt die Kette den Mahlzeit-Platz; sonst bleibt alles gleich.
    const s = deserialize(json, content, raw.savedAt)!.state;
    const erwartet = JSON.parse(json) as SaveShape;
    erwartet.version = SAVE_VERSION;
    erwartet.state.version = SAVE_VERSION;
    Object.assign(erwartet.state.character, { meal: null, mealKeep: true });
    erwartet.state.settings.estateNotifications = true;
    // claude:2026-10-23T22:05:00+02:00 — SAVE 90 (Materiallager): Option an, Lagerware ohne Bankfach, Lücken einmal geschlossen.
    erwartet.state.settings.materialsToStorage = true;
    erwartet.state.lockedItems = {}; // claude:2026-10-24T17:05:00+02:00 — SAVE 90 (Bergung): Schloss-Liste
    // claude:2026-10-24T20:25:00+02:00 — SAVE 91 (Bognerei): Köcher leer, Nachfüllen an.
    erwartet.state.settings.quiverAutoRefill = true;
    erwartet.state.character.quiver = null;
    // claude:2026-10-25T00:30:00+02:00 — SAVE 92 (Ereignisse/Aufträge): Strom aus rng abgeleitet, leere Listen.
    erwartet.state.eventRng = createRngW3(deriveEventRngSeed(erwartet.state.rng.state));
    erwartet.state.skillEvents = defaultSkillEventState();
    erwartet.state.workOrders = defaultWorkOrderState();
    // claude:2026-10-25T04:50:00+02:00 — SAVE 93 (Raid): leerer Raid-Zustand, Schalter aus.
    erwartet.state.raid = defaultRaidState();
    Object.assign(erwartet.state.settings, { raidAutoContinue: false, raidAutoBuyRestart: false });
    erwartet.state.stats.harvestedById = {}; // claude:2026-10-24T15:21:04+02:00 — SAVE 94 (Beet-Ernte-Zähler, alte Saves starten bei 0)
    erwartet.state.stats.producedBySkill = {}; // claude:2026-10-24T16:03:31+02:00 — SAVE 95 (Erzeugt je Skill, ohne offene Aufträge leer)
    erwartet.state.bankOrder = (erwartet.state.bankOrder ?? []).filter((id): id is string => typeof id === "string" && !storagePredicate(content)(id));
    expect(JSON.parse(serialize(s, raw.savedAt))).toEqual(erwartet);
  });

  it("Wächter: jedes Feld des voll befüllten Spielstands ist eingestuft, und jede Einstufung existiert dort", () => {
    const stateKeys = Object.keys(raw.state);
    expect(stateKeys.filter((k) => !(k in PRESTIGE_STATE_FIELDS))).toEqual([]);
    // claude:2026-10-24T17:05:00+02:00 — Felder späterer Versionen fehlen im v88-Pin naturgemäß (SAVE 90: lockedItems).
    const SPAETER = ["lockedItems", "eventRng", "skillEvents", "workOrders", "raid"]; // SAVE 90/92/93
    expect(Object.keys(PRESTIGE_STATE_FIELDS).filter((k) => !stateKeys.includes(k) && !SPAETER.includes(k))).toEqual([]);
    const charKeys = Object.keys(raw.state.character);
    expect(charKeys.filter((k) => !(k in PRESTIGE_CHARACTER_FIELDS))).toEqual([]);
  });
});

// claude:2026-10-18T12:00:00+02:00 — Prestige Welle B2: Post-Sperre-Flag, Narbenbuch-Ränge und die ruhende
// Platz-2-Wahl des Jägerkodex überstehen Laden/Speichern (SAVE 88, Format-Nachtrag ohne neue Version).
describe("Welle B2: Post-Sperre-Flag, Narbenbuch, Jägerkodex-Gate über Save/Load", () => {
  const at = 1_760_000_000_000;
  const base = (): GameState => createGame({ name: "T" }, content, 1);

  it("prestigeHeld: nur exakt true und nur an Mail mit Inhalt überlebt; Round-Trip ist Fixpunkt", () => {
    const s = base();
    (s as unknown as { mailbox: unknown[] }).mailbox = [
      { id: "mail_0", kind: "overflow", createdSeq: 0, items: [{ itemId: "onyx", qty: 2 }], instances: [], prestigeHeld: true },
      { id: "mail_1", kind: "letter", createdSeq: 1, items: [], instances: [], from: "warden", textKey: "mail.letter.test", prestigeHeld: true },
      { id: "mail_2", kind: "overflow", createdSeq: 2, items: [{ itemId: "onyx", qty: 1 }], instances: [], prestigeHeld: "yes" },
      { id: "mail_3", kind: "transfer", createdSeq: 3, items: [{ itemId: "onyx", qty: 1 }], instances: [], fromSaveName: "Z", prestigeHeld: 1 },
      { id: "mail_4", kind: "letter", createdSeq: 4, items: [{ itemId: "onyx", qty: 1 }], instances: [], from: "brenna", textKey: "mail.letter.x", prestigeHeld: true },
    ];
    s.mailSeq = 5;
    const back = loadState(s);
    expect(back.mailbox.map((m) => [m.id, m.prestigeHeld ?? null])).toEqual([
      ["mail_0", true],
      ["mail_1", null], // Brief ohne Geschenk: nichts zu sperren
      ["mail_2", null],
      ["mail_3", null],
      ["mail_4", true],
    ]);
    const once = serialize(back, at);
    const twice = serialize(deserialize(once, content, at)!.state, at);
    expect(twice).toBe(once);
  });

  it("nach einem Aufstieg: Narbenbuch-Ränge bleiben, Platz-2-Wahl bleibt trotz ruhendem Jägerkodex, gehaltene Post bleibt gesperrt", () => {
    const s = base();
    const skills = Object.keys(content.skills);
    for (const id of skills.slice(0, 4)) s.skills[id] = { xp: xpForLevel(99) };
    s.skills.slayer = { xp: xpForLevel(90) };
    s.quests.claimed.push("chronicle_21");
    const pets = Object.keys(content.pets);
    s.character.ownedPets = { [pets[0]!]: true, [pets[1]!]: true };
    s.character.companionPetId = pets[0]!;
    s.character.companionPetId2 = pets[1]!;
    s.prestige.count = 1;
    s.talents = { slayer: { tracking: 5, collar: 1 }, prestige: { earlyXp: 2, maxHp: 1 } };
    s.mailbox = [{ id: "mail_0", kind: "overflow", createdSeq: 0, items: [{ itemId: "onyx", qty: 2 }], instances: [] }];
    s.mailSeq = 1;
    expect(ascend(s, content)).toBe(true);
    expect(s.prestige.count).toBe(2);

    const back = loadState(JSON.parse(serialize(s, at)).state);
    expect(back.talents).toEqual({ slayer: { tracking: 5, collar: 1 }, prestige: { earlyXp: 2, maxHp: 1 } });
    expect(back.character.companionPetId2).toBe(pets[1]);
    expect(secondPetSlotUnlocked(back, content)).toBe(false); // Slayer wieder 1 ⇒ Kodex ruht
    expect(talentEffect(back, content, "prestigeEarlyXp")).toBeCloseTo(0.2, 12);
    expect(back.mailbox[0]!.prestigeHeld).toBe(true);
    expect(mailCollectBlocked(back, content, back.mailbox[0]!)).toBe("prestige_locked");
  });
});

// claude:2026-10-18T19:40:00+02:00 — Prestige Welle E1 (Aufstiegs-Bilanz, Format-Nachtrag SAVE 88 ohne Bump):
// `prestige.runStart` und `PrestigeRecord.tally` überstehen Laden/Speichern; Test-Saves vor E1 laden weiter.
describe("Welle E1: Baselines (runStart) und Bilanz (tally) über Save/Load", () => {
  const at = 1_760_000_000_000;
  const base = (): GameState => createGame({ name: "T" }, content, 1);
  const TALLY = { playMs: 10, chronicleChapter: 23, questsClaimed: 31, kills: 500, dungeons: 2, achievements: 7, petsFound: 1, slayerTasks: 4, paragonBest: 15, gold: 123_456 };

  it("tally: nur vollständig gültig übernommen (Fremdschlüssel fallen weg); kaputte Bilanz entfällt, der Eintrag bleibt", () => {
    const s = base();
    const entry = (count: number, tally: unknown): Record<string, unknown> => ({ count, points: 50, totalLevel: 1050, skills99: 4, activePlayMs: count * 10, tally });
    (s as unknown as { prestige: unknown }).prestige = {
      count: 5,
      points: 0,
      pointsSpent: 0,
      runStart: { kills: 1, dungeons: 2, achievements: 3, pets: 4, slayerTasks: 5, activePlayMs: 50 },
      history: [
        entry(1, { ...TALLY, extra: 9 }),
        entry(2, { ...TALLY, kills: -1 }),
        entry(3, { ...TALLY, gold: 1.5 }),
        entry(4, "x"),
        entry(5, (({ gold: _g, ...rest }) => rest)(TALLY)),
      ],
    };
    const back = loadState(s);
    expect(back.prestige.history.map((h) => h.count)).toEqual([1, 2, 3, 4, 5]);
    expect(back.prestige.history[0]!.tally).toEqual(TALLY);
    expect(Object.keys(back.prestige.history[0]!.tally!)).toEqual(Object.keys(TALLY));
    for (const h of back.prestige.history.slice(1)) expect("tally" in h, `Eintrag ${h.count}`).toBe(false);
    expect(back.prestige.runStart).toEqual({ kills: 1, dungeons: 2, achievements: 3, pets: 4, slayerTasks: 5, activePlayMs: 50 });
  });

  it("runStart: kaputte Werte ⇒ 0, Fremdschlüssel fallen weg; fehlt/kein Objekt ⇒ Default (Spielzeit aus der Historie)", () => {
    const s = base();
    s.prestige = {
      count: 1,
      points: 0,
      pointsSpent: 0,
      runStart: { kills: -5, dungeons: Number.NaN, achievements: 2.7, pets: "x", slayerTasks: 3, activePlayMs: 99, extra: 1 } as never,
      history: [{ count: 1, points: 40, totalLevel: 1010, skills99: 4, activePlayMs: 777 }],
    };
    expect(loadState(s).prestige.runStart).toEqual({ kills: 0, dungeons: 0, achievements: 2, pets: 0, slayerTasks: 3, activePlayMs: 99 });
    for (const v of [undefined, null, 7, [1, 2]]) {
      const t = structuredClone(s) as unknown as { prestige: Record<string, unknown> };
      if (v === undefined) delete t.prestige.runStart;
      else t.prestige.runStart = v;
      expect(loadState(t).prestige.runStart, String(v)).toEqual({ ...defaultPrestigeRunBaseline(), activePlayMs: 777 });
    }
    // Erster Durchgang ohne Historie: alles 0.
    const fresh = base() as unknown as { prestige: Record<string, unknown> };
    delete fresh.prestige.runStart;
    expect(loadState(fresh).prestige.runStart).toEqual(defaultPrestigeRunBaseline());
  });

  it("nach einem echten Aufstieg: Baselines und Bilanz überstehen Save/Load byte-gleich, die Bilanz des neuen Durchgangs bleibt gleich", () => {
    const s = base();
    for (const id of Object.keys(content.skills).slice(0, 4)) s.skills[id] = { xp: xpForLevel(99) };
    s.quests.claimed.push(PRESTIGE_UNLOCK_QUEST_ID);
    s.monsterKills = { goblin: 300 };
    s.dungeonsCleared = { [content.dungeons[0]!.id]: 2 };
    s.achievements = content.achievements.slice(0, 3).map((a) => a.id);
    s.slayerTasksCompleted = 9;
    s.elapsedMs = 150_000; // Invariante activePlayMs ≤ elapsedMs (sanitize)
    s.activePlayMs = 123_000;
    const before = prestigeRunSummary(s, content);
    const counters = prestigeRunCounters(s);
    expect(ascend(s, content)).toBe(true);
    s.monsterKills.goblin = 310; // etwas Fortschritt im zweiten Durchgang

    // Fixpunkt ab dem ersten Laden (der erste Load setzt unabhängig von E1 `dungeonsUnlocked` aus der
    // Lebenszeit-Regel „Cleared ⇒ Unlocked"; Befund an die Leitung gemeldet, hier bewusst nicht festgeschrieben).
    const back = deserialize(serialize(s, at), content, at)!.state;
    const once = serialize(back, at);
    expect(serialize(deserialize(once, content, at)!.state, at)).toBe(once);
    expect(back.prestige).toEqual(s.prestige);
    expect(back.prestige.runStart).toEqual(counters);
    expect(back.prestige.history[0]!.tally).toMatchObject({ kills: 300, dungeons: 2, achievements: before.achievements, slayerTasks: 9, playMs: 123_000 });
    expect(back.prestige.history[0]!.points).toBe(before.points.total);
    expect(prestigeRunSummary(back, content)).toEqual(prestigeRunSummary(s, content));
    expect(prestigeRunSummary(back, content).kills).toBe(10);
  });

  it("v88-Fixture: Baselines des echten Aufstiegs gepinnt; Test-Save vor E1 (ohne runStart) lädt weiter", () => {
    const { json, raw } = read("v88-synthetic-1.3.0.json");
    const s = deserialize(json, content, raw.savedAt)!.state;
    // Zählerstände beim Aufstieg der Fixture-Kette (danach nur 40 Kupfererz gesammelt, keine Kills/Dungeons).
    expect(s.prestige.runStart).toEqual({ kills: 4689, dungeons: 0, achievements: 0, pets: 2, slayerTasks: 0, activePlayMs: 1_440_000_000 });
    expect(prestigeRunCounters(s)).toEqual(s.prestige.runStart);
    const sum = prestigeRunSummary(s, content);
    expect(sum.run).toBe(2);
    expect(sum.kills).toBe(0);
    expect(sum.playMs).toBe(0);
    // Der Historien-Eintrag stammt aus der Zeit vor E1 und trägt (ehrlich) keine Bilanz.
    expect(s.prestige.history[0]!.tally).toBeUndefined();

    const old = JSON.parse(json) as SaveShape;
    delete (old.state.prestige as unknown as Record<string, unknown>).runStart;
    const legacy = deserialize(JSON.stringify(old), content, raw.savedAt)!.state;
    expect(legacy.prestige.runStart).toEqual({ ...defaultPrestigeRunBaseline(), activePlayMs: 1_440_000_000 });
    expect(legacy.prestige.history).toEqual(s.prestige.history);
    expect(prestigeRunSummary(legacy, content).kills).toBe(4689); // ohne Baseline: seit Spielbeginn
  });
});

// claude:2026-10-18T20:30:00+02:00 — Befund E1: „geräumt ⇒ offen“ darf nach einem Aufstieg nicht greifen.
describe("Dungeon-Freischaltung nach dem Aschesturz", () => {
  it("ohne Aufstieg öffnet ein geräumter Dungeon beim Laden (Bestandsschutz), nach einem Aufstieg nicht", () => {
    const fresh = createGame({ name: "T" }, content, 1);
    fresh.dungeonsCleared = { crypt_depths: 3 };
    fresh.dungeonsUnlocked = {};
    expect(loadState(JSON.parse(JSON.stringify(fresh))).dungeonsUnlocked.crypt_depths).toBe(true);
    const asc = createGame({ name: "T" }, content, 1);
    asc.dungeonsCleared = { crypt_depths: 3 };
    asc.dungeonsUnlocked = {};
    asc.prestige = { ...asc.prestige, count: 1 };
    expect(loadState(JSON.parse(JSON.stringify(asc))).dungeonsUnlocked.crypt_depths).toBeUndefined();
  });
});
