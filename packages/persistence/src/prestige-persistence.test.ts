import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { GameState } from "@hearthforge/shared";
import { PRESTIGE_HISTORY_MAX, SAVE_VERSION, defaultPrestigeState } from "@hearthforge/shared";
import {
  PRESTIGE_CHARACTER_FIELDS,
  PRESTIGE_STATE_FIELDS,
  collectMail,
  createGame,
  prestigeFreightLocked,
  questObjectiveProgress,
  questStatus,
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
