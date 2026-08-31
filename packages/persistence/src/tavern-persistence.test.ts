import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { ContentDB, GameState } from "@hearthforge/shared";
import { CAMP_TAVERN_ID, SAVE_VERSION, TAVERN_SEATS, defaultHuntTraps, defaultTavernState, emptyEquipKit } from "@hearthforge/shared";
import { createGame, tavernRefresh, acceptTavernTask, xpForLevel, syncProgression } from "@hearthforge/engine";
import { deserialize, serialize } from "./index";

/**
 * Taverne (SAVE_VERSION 84, design/1.2.0-alive/taverne-spec-technik.md §2): Migration v83 → v84
 * (neues Feld `tavern`, neue Zähler `actionRunsById`/`producedById`), Sanitize-Härtung der Plätze/
 * Aufgaben/Zähler/Breadcrumb gegen den Content und Round-Trip-Stabilität des v84-Fixtures.
 */
const VAULT_DIR = join(__dirname, "..", "fixtures", "save-compat");
const DAY = 20260827;
const SAVED_AT = 1_756_300_000_000;

type SaveShape = { version: number; savedAt: number; state: GameState };

/** Midgame-Held mit gebauter Taverne und Tagesbesetzung (echter Content), als Save-Objekt. */
function tavernSave(): SaveShape {
  const s = createGame({ name: "Wirtin" }, content, 77);
  s.character.createdAt = 1_700_000_000_000;
  for (const id of ["mining", "woodcutting", "fishing", "foraging", "cooking", "smithing", "leatherworking", "tailoring", "thieving", "herblore", "runecrafting", "jewelcrafting", "farming", "attack", "power", "defence", "vitality"]) {
    s.skills[id] = { xp: xpForLevel(30) };
  }
  s.skills.slayer = { xp: xpForLevel(25) };
  syncProgression(s, content);
  for (const z of content.zones) s.legacyZoneGrants[z.id] = true;
  s.camp.buildings[CAMP_TAVERN_ID] = 1;
  s.camp.buildSeq += 1;
  expect(tavernRefresh(s, content, DAY)).toBe(true);
  expect(s.tavern.seats.filter((x) => x.task !== null)).toHaveLength(TAVERN_SEATS);
  expect(acceptTavernTask(s, content, 1)).toBe(true);
  s.tavern.deliveredByGuest = { grumm: 3, nessa: 1 };
  s.tavern.deliverSeq = 4;
  s.tavern.totalDelivered = 4;
  s.tavern.deliveredToday = 1;
  s.tavern.lastDelivery = { seq: 4, guestId: "grumm", gold: 150, xp: 900, skill: "mining", items: [{ id: "copper_ore", qty: 8 }], crates: ["black_market_crate_i"] };
  // Einmal durch die Ladekette normalisieren (sanitize vergibt z. B. der gebauten Taverne ihren
  // Karten-Platz), damit die Sanitize-Fälle unten von einem echten Fixpunkt aus mutieren.
  const normalized = deserialize(serialize(s, SAVED_AT), content, SAVED_AT)!.state;
  return JSON.parse(serialize(normalized, SAVED_AT)) as SaveShape;
}

/** Save ohne `discoveredItems` (sanitize füllt Erst-Besitz aus Inventar/Bank nach — für Byte-Vergleiche neutralisieren). */
function withoutDiscovered(save: SaveShape): SaveShape {
  const copy = JSON.parse(JSON.stringify(save)) as SaveShape;
  delete (copy.state as Partial<GameState>).discoveredItems;
  return copy;
}

function load(save: SaveShape, c: ContentDB = content): GameState {
  const result = deserialize(JSON.stringify(save), c, save.savedAt);
  expect(result).not.toBeNull();
  return result!.state;
}

describe("Migration v83 → v84 (Taverne)", () => {
  it("v83-Fixture: `tavern` = Default, beide Zähler = {}, sonst unverändert; Round-Trip stabil", () => {
    const json = readFileSync(join(VAULT_DIR, "v83-synthetic-1.1.0.json"), "utf-8");
    const raw = JSON.parse(json) as SaveShape;
    expect(raw.version).toBe(83);
    expect((raw.state as Partial<GameState>).tavern).toBeUndefined();
    expect((raw.state.stats as Partial<GameState["stats"]>).actionRunsById).toBeUndefined();
    const result = deserialize(json, content, raw.savedAt)!;
    expect(result.offlineTicks).toBe(0);
    const s = result.state;
    expect(s.version).toBe(SAVE_VERSION);
    expect(s.tavern).toEqual(defaultTavernState());
    expect(s.stats.actionRunsById).toEqual({});
    expect(s.stats.producedById).toEqual({});
    // Gegenprobe: das Original um GENAU diese Felder ergänzt trifft die neuen Bytes (Muster Vault-Pin).
    // `discoveredItems` neutralisiert: das synthetische v83-Fixture wurde ohne Erst-Besitz-Marker
    // erzeugt, sanitize füllt sie seit jeher aus Inventar/Bank nach (kein v84-Belang).
    const erwartet = JSON.parse(json) as SaveShape;
    erwartet.version = SAVE_VERSION;
    erwartet.state.version = SAVE_VERSION;
    erwartet.state.tavern = defaultTavernState();
    erwartet.state.stats.actionRunsById = {};
    erwartet.state.stats.producedById = {};
    // Kette v83 → v84 → v85 (Jagen, SAVE_VERSION 85): sechs leere Fallenplätze, Fang-Nummer 0, Fang-Zähler 0.
    erwartet.state.huntTraps = defaultHuntTraps();
    erwartet.state.huntCatchSeq = 0;
    erwartet.state.stats.huntCatches = 0;
    // v85-Nachtrag (Ausrüstungs-Kits, Chef-Entscheid 28.08.2026): Vorlagen `[null, null, null]` → Kit 0 =
    // getragene Ausrüstung, Kits 1/2 leer, Kit 0 aktiv; `equipLoadouts` verschwindet aus dem State.
    erwartet.state.equipKits = [
      { equipment: { ...erwartet.state.character.equipment }, equippedInstances: { ...erwartet.state.character.equippedInstances } },
      emptyEquipKit(),
      emptyEquipKit(),
    ];
    erwartet.state.activeKit = 0;
    erwartet.state.stats.huntCatchesById = {}; // Jagen-XP nach Monster (28.08.2026): Fänge je Art, Default {}
    erwartet.state.skills.tailoring = { xp: 0 }; // v86 Skill-Split Schneidern (28.08.2026): neues Konto, hier 0 (kein Handwerk-XP/Stoff im Craft-Log)
    delete (erwartet.state as unknown as { equipLoadouts?: unknown }).equipLoadouts;
    // v87 Bank-Platzierung (Chef-Auftrag 31.08.2026 "wie OSRS"): `bankOrder` traegt die Faecher,
    // die Mengen bleiben in `bank`. BEWUSST als LETZTE Erwartung, nach allen anderen Anpassungen —
    // dieselbe Reihenfolge-Falle wie im Sanitize selbst: wer die Faecher zu frueh bildet, nimmt
    // eine Bank, die spaeter noch bereinigt wird, und erwartet Items, die es dann nicht mehr gibt.
    erwartet.state.bankOrder = Object.keys(erwartet.state.bank ?? {}).sort();
    expect(withoutDiscovered(JSON.parse(serialize(s, raw.savedAt)) as SaveShape)).toEqual(withoutDiscovered(erwartet));
    const again = deserialize(serialize(s, raw.savedAt), content, raw.savedAt)!;
    expect(again.state).toEqual(s);
  });

  it("Save ganz ohne `tavern`/Zähler (handgebaut) lädt mit Defaults", () => {
    const save = tavernSave();
    delete (save.state as Partial<GameState>).tavern;
    delete (save.state.stats as Partial<GameState["stats"]>).actionRunsById;
    delete (save.state.stats as Partial<GameState["stats"]>).producedById;
    const s = load(save);
    expect(s.tavern).toEqual(defaultTavernState());
    expect(s.stats.actionRunsById).toEqual({});
    expect(s.stats.producedById).toEqual({});
  });
});

describe("Sanitize: state.tavern gegen den Content härten", () => {
  it("gültiger Tavernen-Save bleibt byte-genau erhalten (Fixpunkt), angenommene Aufgabe überlebt", () => {
    const save = tavernSave();
    const s = load(save);
    expect(JSON.parse(serialize(s, SAVED_AT))).toEqual(save);
    expect(s.tavern.seats).toHaveLength(TAVERN_SEATS);
    expect(s.tavern.seats[1]!.task!.accepted).toBe(true);
    expect(s.tavern.deliveredByGuest).toEqual({ grumm: 3, nessa: 1 });
    expect(s.tavern.lastDelivery!.items).toEqual([{ id: "copper_ore", qty: 8 }]);
    expect(s.tavern.lastDelivery!.crates).toEqual(["black_market_crate_i"]);
  });

  it("unbekannter Gast ⇒ Platzhalter-Gast mit task null; unbekannte/fremde Vorlage ⇒ task null", () => {
    const save = tavernSave();
    const seats = save.state.tavern.seats;
    const placeholder = content.tavernGuests!.find((g) => g.givesTasks)!.id;
    seats[0]!.guestId = "niemand";
    seats[1]!.task!.templateId = "gibt_es_nicht";
    // Vorlage eines ANDEREN Gastes an Platz 2: Vorlage existiert, gehört aber nicht zum Gast.
    const foreign = content.tavernTasks!.find((t) => t.guestId !== seats[2]!.guestId)!;
    seats[2]!.task!.templateId = foreign.id;
    seats[2]!.task!.kind = foreign.kind;
    const s = load(save);
    expect(s.tavern.seats[0]).toEqual({ guestId: placeholder, task: null, swaps: seats[0]!.swaps });
    expect(s.tavern.seats[1]!.task).toBeNull();
    expect(s.tavern.seats[1]!.guestId).toBe(seats[1]!.guestId);
    expect(s.tavern.seats[2]!.task).toBeNull();
    expect(s.tavern.seats[3]!.task).not.toBeNull();
    // Idempotent: zweiter Load ändert nichts mehr.
    const again = deserialize(serialize(s, SAVED_AT), content, SAVED_AT)!.state;
    expect(again).toEqual(s);
  });

  it("Zahlen geklemmt: count ≥ 1, band 1..5, baseline/Gold/XP ≥ 0 ganzzahlig; unbekannte rewardItems gestrichen", () => {
    const save = tavernSave();
    const task = save.state.tavern.seats[3]!.task!;
    task.count = 0;
    task.band = 99;
    task.baseline = -3;
    task.rewardGold = Number.NaN as unknown as number;
    task.rewardXp = 12.7;
    task.requiredLevel = -1;
    task.rewardItems = [{ id: "nicht_da", qty: 5 }, { id: "copper_ore", qty: 0 }, { id: "iron_ore", qty: 2.9 }, { id: "oak_log", qty: 3 }];
    (task as unknown as Record<string, unknown>).accepted = "ja";
    (task as unknown as Record<string, unknown>).paysCrate = 1;
    const s = load(save);
    const t = s.tavern.seats[3]!.task!;
    expect(t.count).toBe(1);
    expect(t.band).toBe(5);
    expect(t.baseline).toBe(0);
    expect(t.rewardGold).toBe(0);
    expect(t.rewardXp).toBe(12);
    expect(t.requiredLevel).toBe(0);
    expect(t.rewardItems).toEqual([{ id: "iron_ore", qty: 2 }, { id: "oak_log", qty: 3 }]);
    expect(t.accepted).toBe(false);
    expect(t.paysCrate).toBe(false);
  });

  it("Ziel je Art muss existieren; unbekannter Belohnungs-Skill oder falsche Art ⇒ task null", () => {
    const save = tavernSave();
    const seats = save.state.tavern.seats;
    seats[0]!.task!.targetId = "item_das_es_nicht_gibt";
    seats[1]!.task!.rewardSkill = "tanzen";
    (seats[2]!.task as unknown as Record<string, unknown>).kind = "singen";
    seats[3]!.task!.actionId = "aktion_die_es_nicht_gibt";
    const s = load(save);
    expect(s.tavern.seats[0]!.task).toBeNull();
    expect(s.tavern.seats[1]!.task).toBeNull();
    expect(s.tavern.seats[2]!.task).toBeNull();
    expect(s.tavern.seats[3]!.task).not.toBeNull();
    expect(s.tavern.seats[3]!.task!.actionId).toBeUndefined();
  });

  it("Plätze-Länge: 0 bleibt 0; verkürzt/verlängert ⇒ exakt TAVERN_SEATS (fehlende = Platzhalter mit task null); kein Array ⇒ []", () => {
    const placeholder = content.tavernGuests!.find((g) => g.givesTasks)!.id;
    const empty = tavernSave();
    empty.state.tavern.seats = [];
    expect(load(empty).tavern.seats).toEqual([]);

    const short = tavernSave();
    short.state.tavern.seats = short.state.tavern.seats.slice(0, 2);
    const s1 = load(short);
    expect(s1.tavern.seats).toHaveLength(TAVERN_SEATS);
    expect(s1.tavern.seats[2]).toEqual({ guestId: placeholder, task: null, swaps: 0 });
    expect(s1.tavern.seats[3]).toEqual({ guestId: placeholder, task: null, swaps: 0 });
    // Der nächste tavernRefresh besetzt die Platzhalter neu (gleicher Tag reicht).
    expect(tavernRefresh(s1, content, DAY)).toBe(true);
    expect(s1.tavern.seats.filter((x) => x.task !== null)).toHaveLength(TAVERN_SEATS);

    const long = tavernSave();
    long.state.tavern.seats.push({ guestId: "grumm", task: null, swaps: 0 }, { guestId: "nessa", task: null, swaps: 2 });
    expect(load(long).tavern.seats).toHaveLength(TAVERN_SEATS);

    const broken = tavernSave();
    (broken.state.tavern as unknown as Record<string, unknown>).seats = "kaputt";
    expect(load(broken).tavern.seats).toEqual([]);
    const missing = tavernSave();
    (missing.state as unknown as Record<string, unknown>).tavern = 42;
    expect(load(missing).tavern).toEqual(defaultTavernState());
  });

  it("Zähler/Flags: day/swapsUsed/… endlich ganzzahlig ≥ 0, introSeen strikt boolesch, swaps geklemmt", () => {
    const save = tavernSave();
    const t = save.state.tavern as unknown as Record<string, unknown>;
    t.day = Number.NaN;
    t.swapsUsed = -2;
    t.deliveredToday = 1.9;
    t.totalDelivered = Number.POSITIVE_INFINITY;
    t.deliverSeq = "7";
    t.introSeen = "ja";
    (save.state.tavern.seats[0] as unknown as Record<string, unknown>).swaps = -1;
    const s = load(save);
    expect(s.tavern.day).toBe(0);
    expect(s.tavern.swapsUsed).toBe(0);
    expect(s.tavern.deliveredToday).toBe(1);
    expect(s.tavern.totalDelivered).toBe(0);
    expect(s.tavern.deliverSeq).toBe(0);
    expect(s.tavern.introSeen).toBe(false);
    expect(s.tavern.seats[0]!.swaps).toBe(0);
  });

  it("deliveredByGuest nur bekannte Gäste mit gültigen Zahlen; lastDelivery nur mit gültiger Form", () => {
    const save = tavernSave();
    save.state.tavern.deliveredByGuest = { grumm: 3, geist: 9, nessa: Number.NaN, pim: -1, kell: 2.5 } as Record<string, number>;
    const s = load(save);
    expect(s.tavern.deliveredByGuest).toEqual({ grumm: 3, kell: 2 });

    const badGuest = tavernSave();
    badGuest.state.tavern.lastDelivery!.guestId = "geist";
    expect(load(badGuest).tavern.lastDelivery).toBeNull();

    const badSkill = tavernSave();
    badSkill.state.tavern.lastDelivery!.skill = "tanzen";
    expect(load(badSkill).tavern.lastDelivery).toBeNull();

    const badItems = tavernSave();
    badItems.state.tavern.lastDelivery!.items = [{ id: "nicht_da", qty: 1 }, { id: "iron_ore", qty: 3 }];
    badItems.state.tavern.lastDelivery!.crates = ["nicht_da", "black_market_crate_iii"];
    (badItems.state.tavern.lastDelivery as unknown as Record<string, unknown>).gold = -5;
    const s2 = load(badItems);
    expect(s2.tavern.lastDelivery).toEqual({ seq: 4, guestId: "grumm", gold: 0, xp: 900, skill: "mining", items: [{ id: "iron_ore", qty: 3 }], crates: ["black_market_crate_iii"] });

    const shape = tavernSave();
    (shape.state.tavern as unknown as Record<string, unknown>).lastDelivery = "kaputt";
    expect(load(shape).tavern.lastDelivery).toBeNull();
  });

  it("ohne Tavernen-Content: Plätze und Gast-Zähler fallen weg, Zähler bleiben (inert, kein Throw)", () => {
    const plain: ContentDB = { ...content, tavernGuests: undefined, tavernTasks: undefined };
    const save = tavernSave();
    const s = load(save, plain);
    expect(s.tavern.seats).toEqual([]);
    expect(s.tavern.deliveredByGuest).toEqual({});
    expect(s.tavern.lastDelivery).toBeNull();
    expect(s.tavern.day).toBe(DAY);
    expect(s.tavern.deliverSeq).toBe(4);
    const again = deserialize(serialize(s, SAVED_AT), plain, SAVED_AT)!.state;
    expect(again).toEqual(s);
  });

  it("Stats-Zähler: nur endliche nicht-negative Zahlen je ID (NaN/negativ ⇒ 0)", () => {
    const save = tavernSave();
    save.state.stats.actionRunsById = { mine_copper: 5, mine_iron: Number.NaN, smelt_copper: -2 } as Record<string, number>;
    (save.state.stats as unknown as Record<string, unknown>).producedById = "kaputt";
    const s = load(save);
    expect(s.stats.actionRunsById).toEqual({ mine_copper: 5, mine_iron: 0, smelt_copper: 0 });
    expect(s.stats.producedById).toEqual({});
  });
});

describe("v84-Fixture: Round-Trip mit befüllter Taverne", () => {
  it("lädt über die Kette v84 → v86, trägt vier besetzte Plätze (eine angenommen), Abgabe-Zähler und beide Stats-Zähler", () => {
    const json = readFileSync(join(VAULT_DIR, "v84-synthetic-1.2.0.json"), "utf-8");
    const raw = JSON.parse(json) as SaveShape;
    expect(raw.version).toBe(84);
    expect(raw.state.version).toBe(84);
    const result = deserialize(json, content, raw.savedAt)!;
    expect(result.offlineTicks).toBe(0);
    const s = result.state;
    expect(s.tavern.seats).toHaveLength(TAVERN_SEATS);
    expect(s.tavern.seats.filter((x) => x.task !== null)).toHaveLength(TAVERN_SEATS);
    expect(s.tavern.seats.some((x) => x.task?.accepted)).toBe(true);
    expect(s.tavern.totalDelivered).toBe(1);
    expect(s.tavern.deliverSeq).toBe(1);
    expect(s.tavern.lastDelivery).not.toBeNull();
    expect(s.tavern.introSeen).toBe(true);
    expect(Object.keys(s.stats.actionRunsById).length).toBeGreaterThan(0);
    expect(Object.keys(s.stats.producedById).length).toBeGreaterThan(0);
    // Sanitize-Fixpunkt: das Fixture IST bereits die gehärtete Form — bis auf die v85-Kette (Jagen):
    // Version 85, sechs leere Fallenplätze, Fang-Nummer 0, Fang-Zähler 0 (hunt-persistence.test.ts pinnt
    // die Migration v84 → v85 byte-genau; hier nur die Taverne).
    const erwartet = JSON.parse(json) as SaveShape;
    erwartet.version = SAVE_VERSION;
    erwartet.state.version = SAVE_VERSION;
    erwartet.state.huntTraps = defaultHuntTraps();
    erwartet.state.huntCatchSeq = 0;
    erwartet.state.stats.huntCatches = 0;
    // v85-Nachtrag (Ausrüstungs-Kits, Chef-Entscheid 28.08.2026): Vorlagen `[null, null, null]` → Kit 0 =
    // getragene Ausrüstung, Kits 1/2 leer, Kit 0 aktiv; `equipLoadouts` verschwindet aus dem State.
    erwartet.state.equipKits = [
      { equipment: { ...erwartet.state.character.equipment }, equippedInstances: { ...erwartet.state.character.equippedInstances } },
      emptyEquipKit(),
      emptyEquipKit(),
    ];
    erwartet.state.activeKit = 0;
    erwartet.state.stats.huntCatchesById = {}; // Jagen-XP nach Monster (28.08.2026): Fänge je Art, Default {}
    erwartet.state.skills.tailoring = { xp: 0 }; // v86 Skill-Split Schneidern (28.08.2026): neues Konto, hier 0 (kein Handwerk-XP/Stoff im Craft-Log)
    delete (erwartet.state as unknown as { equipLoadouts?: unknown }).equipLoadouts;
    // v87 Bank-Platzierung (Chef-Auftrag 31.08.2026 "wie OSRS"): `bankOrder` traegt die Faecher,
    // die Mengen bleiben in `bank`. BEWUSST als LETZTE Erwartung, nach allen anderen Anpassungen —
    // dieselbe Reihenfolge-Falle wie im Sanitize selbst: wer die Faecher zu frueh bildet, nimmt
    // eine Bank, die spaeter noch bereinigt wird, und erwartet Items, die es dann nicht mehr gibt.
    erwartet.state.bankOrder = Object.keys(erwartet.state.bank ?? {}).sort();
    expect(JSON.parse(serialize(s, raw.savedAt))).toEqual(erwartet);
  });
});
