import { createRng as createRngW3, deriveEventRngSeed } from "@hearthforge/engine"; // claude:2026-10-25T00:30:00+02:00
import { defaultRaidState, defaultSkillEventState, defaultWorkOrderState } from "@hearthforge/shared";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { ContentDB, GameState, HuntTrap, HuntZoneDef, ItemDef } from "@hearthforge/shared";
import { TOOL_SLOTS, BAIT_ITEM_ID, HUNT_FIRST_CATCH_MULT, huntCatchXp, HUNTING_SKILL_ID, HUNT_TRAP_SLOTS, SAVE_VERSION, defaultHuntTraps, defaultPrestigeState, emptyEquipKit, emptyHuntTrap } from "@hearthforge/shared";
import { addItem, advance, createGame, huntBaitCount, huntTrapWaiting, setHuntTrap, xpForLevel, storagePredicate } from "@hearthforge/engine";
import { deserialize, serialize } from "./index";

/**
 * Der Kit-0-Spiegel gegen die getragene Ausruestung — OHNE die Werkzeug-Slots. Seit SAVE 87
 * gehoeren Werkzeuge keinem Kit mehr (Chef-Entscheid 31.08.2026): sie haengen am Charakter und
 * bleiben beim Wechsel liegen, der Spiegel traegt dort also immer null.
 */
function ohneWerkzeuge<T extends object>(equipment: T): T {
  const kopie = { ...equipment } as T;
  for (const slot of TOOL_SLOTS) (kopie as Record<string, unknown>)[slot] = null;
  return kopie;
}


/**
 * Jagen (SAVE_VERSION 85, design/handwerk-fasern-jagen/spec-technik.md §3/§5): Migration v84 → v85
 * (neue Felder `huntTraps`/`huntCatchSeq`/`stats.huntCatches`, byte-genau), Sanitize-Härtung der Fallen
 * gegen den Content (Gebiet, Restzeit, letzter Fang, Zähler, Länge), OfflineSummary.huntCatches und
 * Round-Trip des v85-Fixtures. Läuft gegen EIGENEN Jagd-Katalog (content-dev liefert `huntingZones`
 * parallel) — Muster hunting.test.ts.
 */
const VAULT_DIR = join(__dirname, "..", "fixtures", "save-compat");
const SAVED_AT = 1_756_400_000_000;
const PASTURES_MS = 300_000;

type SaveShape = { version: number; savedAt: number; state: GameState };

function huntContent(): ContentDB {
  const zones: HuntZoneDef[] = [
    { zoneId: "pastures", levelRequired: 1, trapMs: PASTURES_MS, xp: 10 },
    { zoneId: "borderlands", levelRequired: 10, trapMs: 480_000, xp: 30 },
  ];
  const items = { ...content.items };
  if (!items[BAIT_ITEM_ID]) {
    const bait: ItemDef = { id: BAIT_ITEM_ID, name: "Worm Bait", type: "material", stackable: true, value: 1 };
    items[BAIT_ITEM_ID] = bait;
  }
  return { ...content, items, huntingZones: zones };
}

/** Held mit Jagen 12, zwei gestellten Fallen (eine mit Fang-Breadcrumb), Köder in Inventar UND Lager. */
function huntSave(c: ContentDB): SaveShape {
  const s = createGame({ name: "Fallensteller" }, c, 9);
  s.character.createdAt = 1_700_000_000_000;
  s.skills[HUNTING_SKILL_ID] = { xp: xpForLevel(12) };
  s.monsterKills.boar = 4;
  s.monsterKills.chicken = 2;
  addItem(s.inventory, c, BAIT_ITEM_ID, 10);
  s.bank[BAIT_ITEM_ID] = 5;
  expect(setHuntTrap(s, c, 0, "pastures", true)).toBe("ok");
  expect(setHuntTrap(s, c, 1, "pastures", false)).toBe("ok");
  s.huntTraps[0]!.lastMissed = true;
  s.huntTraps[1]!.remainingMs = 120_000;
  s.huntTraps[1]!.lastCatch = { seq: 2, monsterId: "boar", items: [{ id: "raw_hide", qty: 7 }, { id: "raw_boar_loin", qty: 1 }], gold: 25 };
  s.huntCatchSeq = 2;
  s.stats.huntCatches = 2;
  const normalized = deserialize(serialize(s, SAVED_AT), c, SAVED_AT)!.state;
  return JSON.parse(serialize(normalized, SAVED_AT)) as SaveShape;
}

function load(save: SaveShape, c: ContentDB): GameState {
  const result = deserialize(JSON.stringify(save), c, save.savedAt);
  expect(result).not.toBeNull();
  return result!.state;
}

/** Save ohne `discoveredItems` (sanitize füllt Erst-Besitz aus Inventar/Bank nach — für Byte-Vergleiche neutralisieren). */
function withoutDiscovered(save: SaveShape): SaveShape {
  const copy = JSON.parse(JSON.stringify(save)) as SaveShape;
  delete (copy.state as Partial<GameState>).discoveredItems;
  return copy;
}

describe("Migration v84 → v85 (Jagen)", () => {
  it("v84-Fixture: huntTraps = Default, huntCatchSeq 0, stats.huntCatches 0 (+ v86-Konto tailoring 0) — sonst byte-genau; Round-Trip stabil", () => {
    const json = readFileSync(join(VAULT_DIR, "v84-synthetic-1.2.0.json"), "utf-8");
    const raw = JSON.parse(json) as SaveShape;
    expect(raw.version).toBe(84);
    expect((raw.state as Partial<GameState>).huntTraps).toBeUndefined();
    expect((raw.state as Partial<GameState>).huntCatchSeq).toBeUndefined();
    expect((raw.state.stats as Partial<GameState["stats"]>).huntCatches).toBeUndefined();
    const result = deserialize(json, content, raw.savedAt)!;
    expect(result.offlineTicks).toBe(0);
    expect(result.offline.huntCatches).toBeUndefined();
    const s = result.state;
    expect(s.version).toBe(SAVE_VERSION);
    expect(s.huntTraps).toEqual(defaultHuntTraps());
    expect(s.huntCatchSeq).toBe(0);
    expect(s.stats.huntCatches).toBe(0);
    // Gegenprobe (Muster Vault-Pin): das Original um GENAU diese Felder ergänzt trifft die neuen Bytes.
    const erwartet = JSON.parse(json) as SaveShape;
    erwartet.version = SAVE_VERSION;
    erwartet.state.version = SAVE_VERSION;
    erwartet.state.huntTraps = defaultHuntTraps();
    erwartet.state.huntCatchSeq = 0;
    erwartet.state.stats.huntCatches = 0;
    // v85-Nachtrag (Ausrüstungs-Kits, Chef-Entscheid 28.08.2026): Vorlagen `[null, null, null]` → Kit 0 =
    // getragene Ausrüstung, Kits 1/2 leer, Kit 0 aktiv; `equipLoadouts` verschwindet aus dem State.
    // v87 (vierter Werkzeug-Slot): migrateState baut den Equipment-Record generisch aus EQUIP_SLOTS
    // neu — `tool4` kommt als null dazu. VOR dem Kit-Spiegel, der aus diesem Record entsteht.
    erwartet.state.character.equipment.tool4 = null;
    erwartet.state.equipKits = [
      // v87: der Spiegel traegt keine Werkzeuge mehr (sie gehoeren keinem Kit).
      { equipment: ohneWerkzeuge({ ...erwartet.state.character.equipment }), equippedInstances: { ...erwartet.state.character.equippedInstances } },
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
    // claude:2026-10-18T00:30:00+02:00 — Jagdbuch/Talentbäume (kein SAVE-Bump): sanitize ergänzt die Defaults.
    Object.assign(erwartet.state, { talents: {}, petPity: {} });
    erwartet.state.character.companionPetId2 = null;
    erwartet.state.prestige = defaultPrestigeState(); // claude:2026-10-17T23:30:00+02:00 — SAVE 88 (Prestige)
    Object.assign(erwartet.state.character, { meal: null, mealKeep: true }); // claude:2026-10-23T16:50:00+02:00 — SAVE 89 (Mahlzeit-Platz)
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
    erwartet.state.slayerAutoTask = false; // claude:2026-10-25T10:32:00+01:00 — SAVE 96 (1.4.1): Auto-Auftrag aus
    erwartet.state.inventory.variantCells = {}; // claude:2026-10-25T18:11:00+01:00 — SAVE 98: neues Feld, das Fixture hat keine reinen Variantengruppen
    erwartet.state.bankOrder = (erwartet.state.bankOrder ?? []).filter((id): id is string => typeof id === "string" && !storagePredicate(content)(id));
    expect(withoutDiscovered(JSON.parse(serialize(s, raw.savedAt)) as SaveShape)).toEqual(withoutDiscovered(erwartet));
    const again = deserialize(serialize(s, raw.savedAt), content, raw.savedAt)!;
    expect(again.state).toEqual(s);
  });

  it("handgebautes Save ganz ohne die Jagd-Felder lädt mit Defaults (auch ohne Jagd-Katalog im Content)", () => {
    const c = huntContent();
    const save = huntSave(c);
    delete (save.state as Partial<GameState>).huntTraps;
    delete (save.state as Partial<GameState>).huntCatchSeq;
    delete (save.state.stats as Partial<GameState["stats"]>).huntCatches;
    for (const cc of [c, content, { ...content, huntingZones: undefined }]) {
      const s = load(save, cc);
      expect(s.huntTraps).toEqual(defaultHuntTraps());
      expect(s.huntCatchSeq).toBe(0);
      expect(s.stats.huntCatches).toBe(0);
    }
  });
});

describe("Sanitize: huntTraps gegen den Content härten", () => {
  it("gültiger Jagd-Save bleibt byte-genau erhalten (Fixpunkt): Gebiete, Restzeiten, Breadcrumbs, Köder", () => {
    const c = huntContent();
    const save = huntSave(c);
    const s = load(save, c);
    expect(JSON.parse(serialize(s, SAVED_AT))).toEqual(save);
    expect(s.huntTraps[0]).toMatchObject({ zoneId: "pastures", remainingMs: PASTURES_MS, autoRebait: true, lastCatch: null, lastMissed: true });
    expect(s.huntTraps[1]).toMatchObject({ zoneId: "pastures", remainingMs: 120_000, autoRebait: false, lastMissed: false });
    expect(s.huntTraps[1]!.lastCatch).toEqual({ seq: 2, monsterId: "boar", items: [{ id: "raw_hide", qty: 7 }, { id: "raw_boar_loin", qty: 1 }], gold: 25 });
    expect(s.huntCatchSeq).toBe(2);
    expect(s.stats.huntCatches).toBe(2);
    expect(huntBaitCount(s)).toBe(13);
  });

  it("unbekanntes Gebiet ⇒ Platz leer (Restzeit 0, Breadcrumbs bleiben); ohne Jagd-Katalog werden ALLE Plätze geleert", () => {
    const c = huntContent();
    const save = huntSave(c);
    save.state.huntTraps[0]!.zoneId = "nirgendwo";
    const s = load(save, c);
    expect(s.huntTraps[0]).toEqual({ zoneId: null, remainingMs: 0, autoRebait: true, lastCatch: null, lastMissed: true });
    expect(s.huntTraps[1]!.zoneId).toBe("pastures"); // der andere Platz bleibt
    // Content ohne `huntingZones` (Jagd inert): keine gestellte Falle überlebt, der letzte Fang schon.
    const inert = load(huntSave(c), { ...c, huntingZones: undefined });
    for (const t of inert.huntTraps) {
      expect(t.zoneId).toBeNull();
      expect(t.remainingMs).toBe(0);
    }
    expect(inert.huntTraps[1]!.lastCatch?.monsterId).toBe("boar");
    expect(inert.huntCatchSeq).toBe(2);
  });

  it("remainingMs wird auf [0, trapMs] geklemmt; NaN/negativ/Infinity ⇒ 0", () => {
    const c = huntContent();
    const save = huntSave(c);
    const traps = save.state.huntTraps as unknown as Array<Record<string, unknown>>;
    traps[0]!.remainingMs = 99_999_999; // „ewig gestellt" per Save-Edit
    traps[1]!.remainingMs = -5;
    const s = load(save, c);
    expect(s.huntTraps[0]!.remainingMs).toBe(PASTURES_MS);
    expect(s.huntTraps[1]!.remainingMs).toBe(0);
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, "bald", null]) {
      const b = huntSave(c);
      (b.state.huntTraps as unknown as Array<Record<string, unknown>>)[0]!.remainingMs = bad;
      expect(load(b, c).huntTraps[0]!.remainingMs).toBe(0);
      expect(load(b, c).huntTraps[0]!.zoneId).toBe("pastures");
    }
  });

  it("lastCatch: unbekanntes Monster ⇒ null; unbekannte Items/Mengen < 1 gestrippt; gold/seq negativ oder NaN ⇒ 0", () => {
    const c = huntContent();
    const save = huntSave(c);
    const lc = save.state.huntTraps[1]!.lastCatch as unknown as Record<string, unknown>;
    lc.items = [{ id: "raw_hide", qty: 3 }, { id: "gibt_es_nicht", qty: 2 }, { id: "raw_boar_loin", qty: 0 }, { id: "feather", qty: 2.9 }, "müll", { qty: 4 }];
    lc.gold = -40;
    lc.seq = Number.NaN;
    const s = load(save, c);
    expect(s.huntTraps[1]!.lastCatch).toEqual({ seq: 0, monsterId: "boar", items: [{ id: "raw_hide", qty: 3 }, { id: "feather", qty: 2 }], gold: 0 });

    const b = huntSave(c);
    (b.state.huntTraps[1]!.lastCatch as unknown as Record<string, unknown>).monsterId = "phantom";
    expect(load(b, c).huntTraps[1]!.lastCatch).toBeNull();
    const d = huntSave(c);
    (d.state.huntTraps[1] as unknown as Record<string, unknown>).lastCatch = "kein Objekt";
    expect(load(d, c).huntTraps[1]!.lastCatch).toBeNull();
  });

  it("huntCatchSeq wird auf die höchste gespeicherte Fang-Nummer angehoben; nicht-endliche Zähler ⇒ 0", () => {
    const c = huntContent();
    const save = huntSave(c);
    save.state.huntCatchSeq = 0; // manipuliert: kleiner als lastCatch.seq 2 → Toast-Dedupe würde kippen
    save.state.huntTraps[0]!.lastCatch = { seq: 7, monsterId: "chicken", items: [], gold: 0 };
    const s = load(save, c);
    expect(s.huntCatchSeq).toBe(7);
    const b = huntSave(c);
    (b.state as unknown as Record<string, unknown>).huntCatchSeq = Number.NaN;
    (b.state.stats as unknown as Record<string, unknown>).huntCatches = -3;
    const t = load(b, c);
    expect(t.huntCatchSeq).toBe(2); // ≥ lastCatch.seq
    expect(t.stats.huntCatches).toBe(0);
  });

  it("Länge exakt HUNT_TRAP_SLOTS: zu kurz aufgefüllt, zu lang gekappt, Müll-Einträge ⇒ leer, Flags strikt boolean", () => {
    const c = huntContent();
    const short = huntSave(c);
    short.state.huntTraps = short.state.huntTraps.slice(0, 2);
    const s = load(short, c);
    expect(s.huntTraps).toHaveLength(HUNT_TRAP_SLOTS);
    expect(s.huntTraps[0]!.zoneId).toBe("pastures");
    for (let i = 2; i < HUNT_TRAP_SLOTS; i++) expect(s.huntTraps[i]).toEqual(emptyHuntTrap());

    const long = huntSave(c);
    long.state.huntTraps = [...long.state.huntTraps, ...defaultHuntTraps(), ...defaultHuntTraps()];
    expect(load(long, c).huntTraps).toHaveLength(HUNT_TRAP_SLOTS);

    const junk = huntSave(c);
    (junk.state.huntTraps as unknown[])[2] = "kaputt";
    (junk.state.huntTraps as unknown[])[3] = null;
    (junk.state.huntTraps as unknown[])[4] = { zoneId: 42, remainingMs: "x", autoRebait: "ja", lastCatch: 1, lastMissed: "nein" };
    const j = load(junk, c);
    expect(j.huntTraps[2]).toEqual(emptyHuntTrap());
    expect(j.huntTraps[3]).toEqual(emptyHuntTrap());
    expect(j.huntTraps[4]).toEqual({ zoneId: null, remainingMs: 0, autoRebait: true, lastCatch: null, lastMissed: false });
    (junk.state as unknown as Record<string, unknown>).huntTraps = "keine Liste";
    expect(load(junk, c).huntTraps).toEqual(defaultHuntTraps());
  });
});

describe("Falle wartet auf Köder (review-1.2.0 P2, 29.08.2026): Sanitize toleriert den Zustand, Offline-Lauf startet sie", () => {
  /** Held mit einer WARTENDEN Falle (Auto an, Gebiet gesetzt, Restzeit 0) und ohne Köder — Sanitize-Fixpunkt. */
  function waitingSave(c: ContentDB): SaveShape {
    const s = createGame({ name: "Wartender" }, c, 21);
    s.character.createdAt = 1_700_000_000_000;
    s.monsterKills.boar = 1;
    addItem(s.inventory, c, BAIT_ITEM_ID, 1);
    expect(setHuntTrap(s, c, 0, "pastures", true)).toBe("ok");
    advance(s, c, PASTURES_MS); // Wurf, kein Köder ⇒ wartet
    expect(huntTrapWaiting(s.huntTraps[0]!)).toBe(true);
    const normalized = deserialize(serialize(s, SAVED_AT), c, SAVED_AT)!.state;
    return JSON.parse(serialize(normalized, SAVED_AT)) as SaveShape;
  }

  it("wartende Falle bleibt beim Laden byte-genau erhalten (zoneId gesetzt, remainingMs 0) — kein SAVE-Bump, kein neues Feld", () => {
    const c = huntContent();
    const save = waitingSave(c);
    expect(save.version).toBe(SAVE_VERSION);
    expect(save.state.huntTraps[0]).toEqual({ zoneId: "pastures", remainingMs: 0, autoRebait: true, lastCatch: save.state.huntTraps[0]!.lastCatch, lastMissed: save.state.huntTraps[0]!.lastMissed });
    expect(Object.keys(save.state.huntTraps[0]!).sort()).toEqual(["autoRebait", "lastCatch", "lastMissed", "remainingMs", "zoneId"]);
    const s = load(save, c);
    expect(huntTrapWaiting(s.huntTraps[0]!)).toBe(true);
    expect(JSON.parse(serialize(s, SAVED_AT))).toEqual(save);
  });

  it("Offline-Lauf: ohne Köder wartet sie weiter (kein Wurf, kein Fang); mit Köder im Lager startet sie beim Laden und wirft", () => {
    const c = huntContent();
    const save = waitingSave(c);
    const idle = deserialize(JSON.stringify(save), c, SAVED_AT + PASTURES_MS * 6)!;
    expect(idle.offlineTicks).toBeGreaterThan(0);
    expect(huntTrapWaiting(idle.state.huntTraps[0]!)).toBe(true);
    expect(idle.state.huntCatchSeq).toBe(save.state.huntCatchSeq);
    expect(idle.state.huntTraps[0]!.lastMissed).toBe(save.state.huntTraps[0]!.lastMissed);
    expect(idle.offline.huntCatches).toBeUndefined();

    const stocked = JSON.parse(JSON.stringify(save)) as SaveShape;
    stocked.state.bank[BAIT_ITEM_ID] = 2;
    const later = deserialize(JSON.stringify(stocked), c, SAVED_AT + PASTURES_MS * 6)!;
    expect(later.state.bank[BAIT_ITEM_ID]).toBeUndefined(); // beide Köder gezogen: Neustart + ein Erneuern
    expect(huntTrapWaiting(later.state.huntTraps[0]!)).toBe(true); // nach zwei Würfen wieder ohne Köder
    expect(later.state.huntCatchSeq).toBeGreaterThanOrEqual(save.state.huntCatchSeq);
    expect(later.state.huntTraps[0]!.zoneId).toBe("pastures");
  });
});

describe("OfflineSummary.huntCatches", () => {
  it("zählt die Fänge des Offline-Fensters je Monster; fehlt ohne Fang", () => {
    const c = huntContent();
    const s = createGame({ name: "Nachtjäger" }, c, 17);
    s.monsterKills.boar = 1; // einziges fangbares Monster → jeder Fang ist ein Eber
    addItem(s.inventory, c, BAIT_ITEM_ID, 40);
    expect(setHuntTrap(s, c, 0, "pastures", true)).toBe("ok");
    const json = serialize(s, SAVED_AT);

    const same = deserialize(json, c, SAVED_AT)!;
    expect(same.offlineTicks).toBe(0);
    expect(same.offline.huntCatches).toBeUndefined();

    const later = deserialize(json, c, SAVED_AT + PASTURES_MS * 8)!;
    expect(later.offlineTicks).toBeGreaterThan(0);
    const caught = later.state.huntCatchSeq;
    expect(caught).toBeGreaterThan(0); // 8 Würfe à 70 % — mindestens einer sitzt
    expect(later.offline.huntCatches).toEqual([{ monsterId: "boar", count: caught }]);
    // XP je Fang = Kampf-XP des Ebers × HUNT_XP_PER_CATCH, der erste Fang zusätzlich × HUNT_FIRST_CATCH_MULT.
    expect(later.offline.skillXp[HUNTING_SKILL_ID]?.xp).toBe(huntCatchXp(c.monsters.boar!.xp) * (caught - 1 + HUNT_FIRST_CATCH_MULT));
    expect(later.state.stats.huntCatchesById.boar).toBe(caught);
    expect(later.state.stats.huntCatches).toBe(caught);
    // Kein Ruhm: Offline-Kills bleiben 0, obwohl gefangen wurde.
    expect(later.offline.kills).toBeUndefined();
    expect(later.state.monsterKills.boar).toBe(1);
  });
});

describe("v85-Fixture: Round-Trip mit Jagd-Stand", () => {
  it("lädt (Kette v85 → v86), trägt Jagen-XP, Fang-Breadcrumb und Fang-Zähler; Sanitize-Fixpunkt bis auf das v86-Konto", () => {
    const json = readFileSync(join(VAULT_DIR, "v85-synthetic-1.2.0.json"), "utf-8");
    const raw = JSON.parse(json) as SaveShape;
    expect(raw.version).toBe(85);
    expect(raw.state.version).toBe(85);
    const result = deserialize(json, content, raw.savedAt)!;
    expect(result.offlineTicks).toBe(0);
    const s = result.state;
    expect(s.huntTraps).toHaveLength(HUNT_TRAP_SLOTS);
    expect(s.skills[HUNTING_SKILL_ID]!.xp).toBeGreaterThan(0);
    expect(s.huntCatchSeq).toBeGreaterThan(0);
    expect(s.stats.huntCatches).toBeGreaterThan(0);
    const withCatch = s.huntTraps.filter((t: HuntTrap) => t.lastCatch !== null);
    expect(withCatch.length).toBeGreaterThan(0);
    for (const t of withCatch) {
      expect(content.monsters[t.lastCatch!.monsterId]).toBeDefined();
      for (const it of t.lastCatch!.items) expect(content.items[it.id]).toBeDefined();
    }
    expect(s.monsterKills.boar).toBeGreaterThan(0);
    expect(huntBaitCount(s)).toBeGreaterThan(0);
    // Sanitize-Fixpunkt: das Fixture IST bereits die gehärtete Form — bis auf die v86-Kette (Skill-Split
    // Schneidern, 28.08.2026): Version 86 und das neue Konto `skills.tailoring = { xp: 0 }` (das Fixture
    // trägt weder Handwerk-XP noch Stoff-Rezepte im Craft-Log; die XP-Aufteilung pinnt
    // tailoring-split-persistence.test.ts).
    const erwartet = JSON.parse(json) as SaveShape;
    erwartet.version = SAVE_VERSION;
    erwartet.state.version = SAVE_VERSION;
    erwartet.state.skills.tailoring = { xp: 0 };
    // v87 (vierter Werkzeug-Slot): migrateState baut den Equipment-Record generisch aus EQUIP_SLOTS
    // neu — `tool4` kommt als null dazu, im Charakter wie in jedem Kit-Spiegel.
    erwartet.state.character.equipment.tool4 = null;
    for (const kit of erwartet.state.equipKits) kit.equipment.tool4 = null;
    // v87 Bank-Platzierung (Chef-Auftrag 31.08.2026 "wie OSRS"): `bankOrder` traegt die Faecher,
    // die Mengen bleiben in `bank`. BEWUSST als LETZTE Erwartung, nach allen anderen Anpassungen —
    // dieselbe Reihenfolge-Falle wie im Sanitize selbst: wer die Faecher zu frueh bildet, nimmt
    // eine Bank, die spaeter noch bereinigt wird, und erwartet Items, die es dann nicht mehr gibt.
    erwartet.state.bankOrder = Object.keys(erwartet.state.bank ?? {}).sort();
    // claude:2026-10-18T00:30:00+02:00 — Jagdbuch/Talentbäume (kein SAVE-Bump): sanitize ergänzt die Defaults.
    Object.assign(erwartet.state, { talents: {}, petPity: {} });
    erwartet.state.character.companionPetId2 = null;
    erwartet.state.prestige = defaultPrestigeState(); // claude:2026-10-17T23:30:00+02:00 — SAVE 88 (Prestige)
    Object.assign(erwartet.state.character, { meal: null, mealKeep: true }); // claude:2026-10-23T16:50:00+02:00 — SAVE 89 (Mahlzeit-Platz)
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
    erwartet.state.slayerAutoTask = false; // claude:2026-10-25T10:32:00+01:00 — SAVE 96 (1.4.1): Auto-Auftrag aus
    erwartet.state.inventory.variantCells = {}; // claude:2026-10-25T18:11:00+01:00 — SAVE 98: neues Feld, das Fixture hat keine reinen Variantengruppen
    erwartet.state.bankOrder = (erwartet.state.bankOrder ?? []).filter((id): id is string => typeof id === "string" && !storagePredicate(content)(id));
    expect(JSON.parse(serialize(s, raw.savedAt))).toEqual(erwartet);
  });
});
