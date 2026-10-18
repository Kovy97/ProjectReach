import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { GameState } from "@hearthforge/shared";
import { PRESTIGE_HISTORY_MAX, SAVE_VERSION, defaultPrestigeState } from "@hearthforge/shared";
import {
  PRESTIGE_CHARACTER_FIELDS,
  PRESTIGE_STATE_FIELDS,
  ascend,
  collectMail,
  createGame,
  mailCollectBlocked,
  prestigeFreightLocked,
  questObjectiveProgress,
  questStatus,
  secondPetSlotUnlocked,
  talentEffect,
  xpForLevel,
} from "@hearthforge/engine";
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
    expect(res.state.version).toBe(88);
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
    s.prestige = { count: 2, points: 7, pointsSpent: 93, history: [
      { count: 1, points: 50, totalLevel: 1040, skills99: 4, activePlayMs: 10 },
      { count: 2, points: 50, totalLevel: 1050, skills99: 4, activePlayMs: 20 },
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

  it("Sanitize-Fixpunkt: Laden + Speichern ist byte-gleich", () => {
    const s = deserialize(json, content, raw.savedAt)!.state;
    expect(serialize(s, raw.savedAt)).toBe(json);
  });

  it("Wächter: jedes Feld des voll befüllten Spielstands ist eingestuft, und jede Einstufung existiert dort", () => {
    const stateKeys = Object.keys(raw.state);
    expect(stateKeys.filter((k) => !(k in PRESTIGE_STATE_FIELDS))).toEqual([]);
    expect(Object.keys(PRESTIGE_STATE_FIELDS).filter((k) => !stateKeys.includes(k))).toEqual([]);
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
