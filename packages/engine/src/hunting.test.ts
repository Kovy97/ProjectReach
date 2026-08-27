import { describe, expect, it } from "vitest";
import type { ContentDB, GameState, HuntZoneDef, ItemDef, MonsterDef } from "@hearthforge/shared";
import {
  BAIT_ITEM_ID,
  HUNTING_SKILL_ID,
  HUNT_CATCH_BASE,
  HUNT_CATCH_CAP,
  HUNT_LOOT_ROLLS,
  HUNT_SLOT_LEVELS,
  HUNT_TRAP_SLOTS,
  defaultHuntTraps,
} from "@hearthforge/shared";
import { content } from "@hearthforge/content";
import { createGame } from "./state";
import { advance } from "./tick";
import { addItem, itemCount } from "./inventory";
import { bankCount } from "./bank";
import { xpForLevel } from "./leveling";
import { nextFloat, nextInt } from "./rng";
import {
  clearHuntTrap,
  huntBaitCount,
  huntCatchChance,
  huntSetReason,
  huntTrapSlots,
  huntZoneDef,
  huntableMonsters,
  setHuntAutoRebait,
  setHuntTrap,
  tickHuntTraps,
} from "./hunting";

/**
 * Jagen (1.2.0 „Fasern und Fallen", spec-technik §3): Plätze nach Stufe, Gebiets-Gates, Köderverbrauch
 * (Inventar → Lager), Fang-Pfad (5 Beute-Würfe, Gold ×5, Jagen-XP, Breadcrumbs), Auto-Erneuern,
 * Determinismus und offline == online. Läuft gegen EIGENEN Mini-Content (content-dev liefert
 * `huntingZones`/`bait_worm` parallel) — nur der letzte Block prüft den echten Katalog, falls vorhanden.
 */

const PASTURES_MS = 300_000; // 5 min
const BORDER_MS = 480_000; // 8 min
const PASTURES_XP = 10;
/** Synthetisches Weiden-Tier mit sicherer Beute (chance 1) — macht den Fang-Inhalt vorhersagbar. */
const HARE: MonsterDef = {
  id: "test_hare",
  name: { en: "Test Hare", de: "Testhase" },
  level: 3,
  maxHp: 10,
  damage: 1,
  accuracy: 1,
  evasion: 1,
  defense: 0,
  attackIntervalMs: 3000,
  xp: 5,
  gold: 10,
  loot: [{ itemId: "rawhide", chance: 1, min: 1, max: 1 }],
  family: "beast",
  zone: "pastures",
};

function testContent(): ContentDB {
  const zones: HuntZoneDef[] = [
    { zoneId: "pastures", levelRequired: 1, trapMs: PASTURES_MS, xp: PASTURES_XP },
    { zoneId: "borderlands", levelRequired: 10, trapMs: BORDER_MS, xp: 30 },
  ];
  const items = { ...content.items };
  if (!items[BAIT_ITEM_ID]) {
    const bait: ItemDef = { id: BAIT_ITEM_ID, name: "Worm Bait", type: "material", stackable: true, value: 1 };
    items[BAIT_ITEM_ID] = bait;
  }
  return { ...content, items, monsters: { ...content.monsters, [HARE.id]: HARE }, huntingZones: zones };
}

function game(c: ContentDB, seed = 1): GameState {
  return createGame({ name: "Fallensteller" }, c, seed);
}

function setLevel(s: GameState, level: number): void {
  s.skills[HUNTING_SKILL_ID] = { xp: xpForLevel(level) };
}

/** Standard-Aufbau: Hase besiegt, `bait` Köder im Inventar, Falle auf den Weiden gestellt. */
function readyGame(c: ContentDB, seed: number, bait = 3, autoRebait = true): GameState {
  const s = game(c, seed);
  s.monsterKills[HARE.id] = 1;
  if (bait > 0) addItem(s.inventory, c, BAIT_ITEM_ID, bait);
  expect(setHuntTrap(s, c, 0, "pastures", autoRebait)).toBe("ok");
  return s;
}

describe("Jagen — Plätze & Katalog", () => {
  it("createGame startet mit HUNT_TRAP_SLOTS leeren Plätzen (Auto-Erneuern AN), Seq 0, Zähler 0", () => {
    const s = game(testContent());
    expect(s.huntTraps).toEqual(defaultHuntTraps());
    expect(s.huntTraps).toHaveLength(HUNT_TRAP_SLOTS);
    expect(s.huntCatchSeq).toBe(0);
    expect(s.stats.huntCatches).toBe(0);
  });

  it("huntTrapSlots folgt HUNT_SLOT_LEVELS (1/10/25/45/65/85 → 1..6, Deckel 6)", () => {
    const s = game(testContent());
    expect(huntTrapSlots(s)).toBe(1); // ohne Skill-Eintrag = Stufe 1
    const expected = [1, 2, 3, 4, 5, 6];
    HUNT_SLOT_LEVELS.forEach((lvl, i) => {
      setLevel(s, lvl - 1);
      expect(huntTrapSlots(s)).toBe(Math.max(1, expected[i]! - 1));
      setLevel(s, lvl);
      expect(huntTrapSlots(s)).toBe(expected[i]);
    });
    setLevel(s, 99);
    expect(huntTrapSlots(s)).toBe(HUNT_TRAP_SLOTS);
  });

  it("huntZoneDef liefert den Katalog-Eintrag, null für Unbekanntes und ohne Katalog", () => {
    const c = testContent();
    expect(huntZoneDef(c, "pastures")?.trapMs).toBe(PASTURES_MS);
    expect(huntZoneDef(c, "nirgendwo")).toBeNull();
    expect(huntZoneDef({ ...content, huntingZones: undefined }, "pastures")).toBeNull();
  });
});

describe("Jagen — fangbare Monster", () => {
  it("nur Familie beast/humanoid, nicht dungeonOnly, kein Boss (enrage/Dungeon-Endgegner), zone passt, ≥ 1 Kill", () => {
    const c = testContent();
    const s = game(c);
    expect(huntableMonsters(s, c, "pastures")).toEqual([]); // nichts besiegt
    // Weiden: bull_boss (enrage) und the_imp (Dämon) fallen trotz Kill heraus.
    for (const id of ["boar", "chicken", "bull_boss", "the_imp"]) s.monsterKills[id] = 5;
    expect(huntableMonsters(s, c, "pastures")).toEqual(["chicken", "boar"]); // Content-Reihenfolge
    // Grenzlande: goblin_reaver (dungeonOnly) und goblin_warchief (Dungeon-Endgegner + enrage) nie.
    for (const id of ["goblin", "goblin_reaver", "goblin_warchief"]) s.monsterKills[id] = 1;
    expect(huntableMonsters(s, c, "borderlands")).toEqual(["goblin"]);
    // Zone muss passen: der Eber taucht in den Grenzlanden nicht auf.
    expect(huntableMonsters(s, c, "borderlands")).not.toContain("boar");
  });

  it("die benannten Content-Bosse (enrage / Dungeon-Endgegner / ach_boss_*-Ziele) sind nirgends fangbar", () => {
    const c = testContent();
    const s = game(c);
    for (const id of Object.keys(c.monsters)) s.monsterKills[id] = 1;
    const bosses = c.achievements
      .filter((a) => a.id.startsWith("ach_boss_") && a.condition.type === "monster_kills")
      .map((a) => a.condition.target as string);
    expect(bosses.length).toBeGreaterThan(5);
    const huntable = new Set<string>();
    for (const z of c.zones) for (const id of huntableMonsters(s, c, z.id)) huntable.add(id);
    for (const b of bosses) expect(huntable.has(b), b).toBe(false);
    for (const m of Object.values(c.monsters)) if (m.enrage) expect(huntable.has(m.id), m.id).toBe(false);
    for (const d of c.dungeons) expect(huntable.has(d.encounters[d.encounters.length - 1] ?? ""), d.id).toBe(false);
    // Zonen-Bosse OHNE enrage (nur über den Erfolg markiert) fallen ebenfalls heraus …
    for (const id of ["goblin_warlock", "frost_hexer", "roc_elder"]) expect(huntable.has(id), id).toBe(false);
    // … die gewöhnlichen Tiere/Humanoiden bleiben fangbar (Konzept B3).
    for (const id of ["chicken", "cow", "boar", "feral_goat", "goblin", "thorn_wolf", "forest_hare", "gray_wolf", "mud_crab", "frost_hound", "roc", "roc_hunter"]) {
      expect(huntable.has(id), id).toBe(true);
    }
    // Krypta und Götzenhalle: nichts Fangbares (Absicht laut Konzept).
    expect(huntableMonsters(s, c, "crypt")).toEqual([]);
    expect(huntableMonsters(s, c, "idolhall")).toEqual([]);
  });
});

describe("Jagen — Gates & Falle stellen", () => {
  it("huntSetReason: no_slot / zone_locked / level / nothing_huntable / no_bait / busy / ok", () => {
    const c = testContent();
    const s = game(c);
    expect(huntSetReason(s, c, 1, "pastures")).toBe("no_slot"); // Stufe 1 → nur Platz 0
    expect(huntSetReason(s, c, -1, "pastures")).toBe("no_slot");
    expect(huntSetReason(s, c, HUNT_TRAP_SLOTS, "pastures")).toBe("no_slot");
    expect(huntSetReason(s, c, 0, "nirgendwo")).toBe("zone_locked"); // nicht im Katalog
    expect(huntSetReason(s, c, 0, "borderlands")).toBe("zone_locked"); // Kampf-Gate (chronicle_03)
    s.legacyZoneGrants.borderlands = true;
    expect(huntSetReason(s, c, 0, "borderlands")).toBe("level"); // Jagen 1 < 10
    setLevel(s, 10);
    expect(huntSetReason(s, c, 0, "borderlands")).toBe("nothing_huntable");
    expect(huntSetReason(s, c, 0, "pastures")).toBe("nothing_huntable");
    s.monsterKills[HARE.id] = 1;
    expect(huntSetReason(s, c, 0, "pastures")).toBe("no_bait");
    addItem(s.inventory, c, BAIT_ITEM_ID, 1);
    expect(huntSetReason(s, c, 0, "pastures")).toBe("ok");
    expect(setHuntTrap(s, c, 0, "pastures", true)).toBe("ok");
    expect(huntSetReason(s, c, 0, "pastures")).toBe("busy");
    expect(setHuntTrap(s, c, 0, "pastures", true)).toBe("busy");
  });

  it("setHuntTrap zieht GENAU einen Köder (Inventar vor Lager), setzt remainingMs = trapMs und Auto-Erneuern", () => {
    const c = testContent();
    const s = game(c);
    setLevel(s, 10);
    s.monsterKills[HARE.id] = 1;
    addItem(s.inventory, c, BAIT_ITEM_ID, 1);
    s.bank[BAIT_ITEM_ID] = 2;
    expect(huntBaitCount(s)).toBe(3);
    expect(setHuntTrap(s, c, 0, "pastures", false)).toBe("ok");
    expect(itemCount(s.inventory, BAIT_ITEM_ID)).toBe(0); // Inventar zuerst
    expect(bankCount(s, BAIT_ITEM_ID)).toBe(2);
    expect(s.huntTraps[0]).toMatchObject({ zoneId: "pastures", remainingMs: PASTURES_MS, autoRebait: false });
    expect(setHuntTrap(s, c, 1, "pastures", true)).toBe("ok"); // zweiter Platz (Stufe 10) aus dem Lager
    expect(bankCount(s, BAIT_ITEM_ID)).toBe(1);
    expect(s.huntTraps[1]!.autoRebait).toBe(true);
    expect(setHuntTrap(s, c, 2, "pastures", true)).toBe("no_slot");
  });

  it("clearHuntTrap leert den Platz ohne Köder-Erstattung; setHuntAutoRebait schaltet um", () => {
    const c = testContent();
    const s = readyGame(c, 1, 1);
    expect(huntBaitCount(s)).toBe(0);
    clearHuntTrap(s, 0);
    expect(s.huntTraps[0]!.zoneId).toBeNull();
    expect(s.huntTraps[0]!.remainingMs).toBe(0);
    expect(huntBaitCount(s)).toBe(0);
    setHuntAutoRebait(s, 0, false);
    expect(s.huntTraps[0]!.autoRebait).toBe(false);
    setHuntAutoRebait(s, 0, true);
    expect(s.huntTraps[0]!.autoRebait).toBe(true);
    clearHuntTrap(s, 99); // ungültiger Platz: No-op
    setHuntAutoRebait(s, 99, false);
  });

  it("huntCatchChance: Basis 70 %, +0,5 pp je Stufe über der Gebietsstufe, Deckel 95 %, unbekannt 0", () => {
    const c = testContent();
    const s = game(c);
    expect(huntCatchChance(s, c, "pastures")).toBeCloseTo(HUNT_CATCH_BASE, 10);
    expect(huntCatchChance(s, c, "borderlands")).toBeCloseTo(0.7 - 9 * 0.005, 10);
    setLevel(s, 21);
    expect(huntCatchChance(s, c, "pastures")).toBeCloseTo(0.8, 10);
    setLevel(s, 99);
    expect(huntCatchChance(s, c, "pastures")).toBe(HUNT_CATCH_CAP);
    expect(huntCatchChance(s, c, "nirgendwo")).toBe(0);
  });
});

describe("Jagen — Tick, Fang, Auto-Erneuern", () => {
  it("ohne content.huntingZones ist der Tick inert (kein RNG, keine Änderung)", () => {
    const c = testContent();
    const s = readyGame(c, 1);
    const inert: ContentDB = { ...c, huntingZones: undefined };
    const before = JSON.stringify(s);
    advance(s, inert, PASTURES_MS * 3);
    const after = JSON.parse(JSON.stringify(s)) as GameState;
    const orig = JSON.parse(before) as GameState;
    expect(after.rng).toEqual(orig.rng);
    expect(after.huntTraps).toEqual(orig.huntTraps);
    expect(after.huntCatchSeq).toBe(0);
  });

  it("wirft exakt bei trapMs, folgt der dokumentierten RNG-Reihenfolge (Chance → Monster → Gold → 5×Beute)", () => {
    const c = testContent();
    const s = readyGame(c, 7, 5);
    advance(s, c, PASTURES_MS - 1000);
    expect(s.huntTraps[0]!.remainingMs).toBe(1000);
    expect(s.huntCatchSeq).toBe(0);

    // Erwartung aus einer Kopie des RNG vorab nachrechnen.
    const rng = { state: s.rng.state };
    const hit = nextFloat(rng) < huntCatchChance(s, c, "pastures");
    let expectedGold = 0;
    if (hit) {
      expect(nextInt(rng, 0, 0)).toBe(0); // Pool = [test_hare]
      expectedGold = HUNT_LOOT_ROLLS * (HARE.gold + nextInt(rng, 0, Math.ceil(HARE.gold * 0.4)));
    }
    const goldBefore = s.character.gold;
    advance(s, c, 1000);
    const t = s.huntTraps[0]!;
    if (hit) {
      expect(t.lastCatch).toMatchObject({ seq: 1, monsterId: HARE.id, gold: expectedGold, items: [{ id: "rawhide", qty: HUNT_LOOT_ROLLS }] });
      expect(t.lastMissed).toBe(false);
      expect(s.character.gold - goldBefore).toBe(expectedGold);
      expect(itemCount(s.inventory, "rawhide")).toBe(HUNT_LOOT_ROLLS);
      expect(s.skills[HUNTING_SKILL_ID]!.xp).toBe(PASTURES_XP);
      expect(s.huntCatchSeq).toBe(1);
      expect(s.stats.huntCatches).toBe(1);
      expect(s.stats.itemsGathered).toBe(HUNT_LOOT_ROLLS);
    } else {
      expect(t.lastCatch).toBeNull();
      expect(t.lastMissed).toBe(true);
      expect(s.character.gold).toBe(goldBefore);
      expect(s.huntCatchSeq).toBe(0);
    }
    // Auto-Erneuern mit Köder: Platz bleibt gestellt, Restzeit voll (kein Überschuss bei exaktem Treffer).
    expect(t.zoneId).toBe("pastures");
    expect(t.remainingMs).toBe(PASTURES_MS);
    expect(huntBaitCount(s)).toBe(3); // 5 − 1 (stellen) − 1 (erneuern)
  });

  it("ein Fang erzeugt KEINE Kill-Spuren: monsterKills, stats.kills, Slayer bleiben unberührt (seenDrops zählt, Chef 28.08.)", () => {
    const c = testContent();
    // Seed suchen, bei dem der erste Wurf sitzt (Chance 70 %).
    let s: GameState | null = null;
    for (let seed = 1; seed < 60 && !s; seed++) {
      const g = readyGame(c, seed, 2);
      advance(g, c, PASTURES_MS);
      if (g.huntTraps[0]!.lastCatch) s = g;
    }
    expect(s).not.toBeNull();
    expect(s!.monsterKills[HARE.id]).toBe(1); // unverändert (Baseline aus readyGame)
    expect(s!.stats.kills).toBe(0);
    // Chef 28.08.2026: Fänge zählen ins Collection-Log (Jagdbuch zeigt Beute erst nach dem ersten Fund) — aber NICHT als Kill.
    expect(s!.seenDrops[HARE.id]?.length ?? 0).toBeGreaterThan(0);
    expect(s!.skills.slayer).toBeUndefined();
    expect(s!.combat.monsterId).toBeNull();
    expect(s!.stats.huntCatches).toBe(1);
    expect(s!.huntTraps[0]!.lastCatch!.seq).toBe(s!.huntCatchSeq);
  });

  it("mehrere Würfe im Fenster: Schleife (solange remainingMs ≤ 0), Rest-Übertrag verlustfrei, Köder je Wurf", () => {
    const c = testContent();
    const s = readyGame(c, 3, 10);
    advance(s, c, PASTURES_MS * 2 + 30_000); // zwei Würfe + 30 s in den dritten Zyklus
    const t = s.huntTraps[0]!;
    expect(t.zoneId).toBe("pastures");
    expect(t.remainingMs).toBe(PASTURES_MS - 30_000);
    expect(huntBaitCount(s)).toBe(10 - 1 - 2);
    expect(s.huntCatchSeq + (t.lastMissed ? 1 : 0)).toBeGreaterThanOrEqual(1);
  });

  it("ohne Köder bleibt der Platz nach dem Wurf leer; Auto-Erneuern AUS verbraucht keinen Köder", () => {
    const c = testContent();
    const a = readyGame(c, 5, 1); // einziger Köder geht beim Stellen drauf
    advance(a, c, PASTURES_MS * 5);
    expect(a.huntTraps[0]!.zoneId).toBeNull();
    expect(a.huntTraps[0]!.remainingMs).toBe(0);
    expect(a.huntCatchSeq + (a.huntTraps[0]!.lastMissed ? 1 : 0)).toBe(1); // genau EIN Wurf

    const b = readyGame(c, 5, 4, false);
    advance(b, c, PASTURES_MS * 5);
    expect(b.huntTraps[0]!.zoneId).toBeNull();
    expect(huntBaitCount(b)).toBe(3); // nur der Stell-Köder weg
  });

  it("Auto-Erneuern zieht Köder aus dem Lager, wenn das Inventar leer ist", () => {
    const c = testContent();
    const s = readyGame(c, 2, 1);
    s.bank[BAIT_ITEM_ID] = 2;
    advance(s, c, PASTURES_MS * 2);
    expect(s.huntTraps[0]!.zoneId).toBe("pastures");
    expect(bankCount(s, BAIT_ITEM_ID)).toBe(0);
    expect(s.bank[BAIT_ITEM_ID]).toBeUndefined(); // 0-Eintrag entfernt
    advance(s, c, PASTURES_MS);
    expect(s.huntTraps[0]!.zoneId).toBeNull(); // dritter Wurf ohne Köder → leer
  });

  it("gesperrte Plätze ticken nicht; Gebiet aus dem Katalog entfernt → Platz wird geleert (kein RNG)", () => {
    const c = testContent();
    const s = readyGame(c, 4, 3);
    // Platz 1 per Save-Edit belegt, obwohl Stufe 1 nur Platz 0 freischaltet.
    s.huntTraps[1] = { zoneId: "pastures", remainingMs: 1000, autoRebait: true, lastCatch: null, lastMissed: false };
    advance(s, c, 5000);
    expect(s.huntTraps[1]!.remainingMs).toBe(1000);
    // Katalog ohne Weiden: die gestellte Falle auf Platz 0 wird geleert, ohne RNG zu ziehen.
    const rngBefore = s.rng.state;
    tickHuntTraps(s, { ...c, huntingZones: [{ zoneId: "borderlands", levelRequired: 10, trapMs: BORDER_MS, xp: 30 }] }, 1000);
    expect(s.huntTraps[0]!.zoneId).toBeNull();
    expect(s.rng.state).toBe(rngBefore);
  });

  it("Jagen-XP hebt die Stufe und schaltet Plätze frei (Level-up über den normalen Skill-Pfad)", () => {
    const c: ContentDB = { ...testContent(), huntingZones: [{ zoneId: "pastures", levelRequired: 1, trapMs: PASTURES_MS, xp: xpForLevel(10) }] };
    let s: GameState | null = null;
    for (let seed = 1; seed < 60 && !s; seed++) {
      const g = readyGame(c, seed, 2);
      advance(g, c, PASTURES_MS);
      if (g.huntTraps[0]!.lastCatch) s = g;
    }
    expect(huntTrapSlots(s!)).toBe(2);
    expect(s!.character.totalLevel).toBeGreaterThan(game(c).character.totalLevel);
  });
});

/**
 * Die Felder, an denen sich offline == online messen lässt. `quests.completed`/`achievements` sind
 * bewusst NICHT dabei: ihre REIHENFOLGE hängt davon ab, wie oft evaluateQuests/checkAchievements
 * zwischen den Fenstern liefen (Mengen-Semantik, kein Jagd-Belang — Muster farmSnapshot).
 */
function huntSnapshot(s: GameState) {
  return {
    traps: s.huntTraps,
    seq: s.huntCatchSeq,
    catches: s.stats.huntCatches,
    gathered: s.stats.itemsGathered,
    xp: s.skills[HUNTING_SKILL_ID]?.xp ?? 0,
    inventory: s.inventory,
    bank: s.bank,
    gold: s.character.gold,
    rng: s.rng,
    elapsedMs: s.elapsedMs,
    mailbox: s.mailbox,
    discovered: s.discoveredItems,
    quests: [...s.quests.completed].sort(),
    achievements: [...s.achievements].sort(),
  };
}

describe("Jagen — Determinismus & offline == online", () => {
  /** Zwei Fallen in DEMSELBEN Gebiet plus eine in einem zweiten (anderer Rhythmus, andere Beute). */
  function scenario(seed: number): GameState {
    const c = testContent();
    const s = game(c, seed);
    setLevel(s, 25);
    s.legacyZoneGrants.borderlands = true;
    s.monsterKills[HARE.id] = 1;
    s.monsterKills.boar = 1;
    s.monsterKills.chicken = 1;
    s.monsterKills.goblin = 1;
    addItem(s.inventory, c, BAIT_ITEM_ID, 20);
    s.bank[BAIT_ITEM_ID] = 20;
    expect(setHuntTrap(s, c, 0, "pastures", true)).toBe("ok");
    expect(setHuntTrap(s, c, 1, "borderlands", true)).toBe("ok");
    expect(setHuntTrap(s, c, 2, "pastures", true)).toBe("ok");
    return s;
  }

  it("gleicher Seed + gleiche Aktionen ⇒ bit-identischer State", () => {
    const c = testContent();
    const a = scenario(11);
    const b = scenario(11);
    advance(a, c, 55 * 60_000);
    advance(b, c, 55 * 60_000);
    // (createGame stempelt `createdAt` mit der Wanduhr — deshalb der Jagd-Schnappschuss statt des ganzen JSON.)
    expect(huntSnapshot(a)).toEqual(huntSnapshot(b));
    expect(a.huntCatchSeq).toBeGreaterThan(0);
  });

  it("55-Minuten-Sprung == 55 × 1 Minute (Fänge je Falle, Köder, Restzeit, RNG) — Würfe laufen in Zeitreihenfolge über alle Fallen", () => {
    const c = testContent();
    const jump = scenario(23);
    const steps = scenario(23);
    advance(jump, c, 55 * 60_000);
    for (let i = 0; i < 55; i++) advance(steps, c, 60_000);
    expect(huntSnapshot(jump)).toEqual(huntSnapshot(steps));
    expect(jump.huntCatchSeq).toBeGreaterThan(0);
    expect(jump.huntTraps[1]!.lastCatch === null || jump.huntTraps[1]!.lastCatch.monsterId === "goblin").toBe(true);
    expect(huntBaitCount(jump)).toBeLessThan(37);
  });

  it("auch ungerade Fenster (7-Minuten-Stücke) landen auf demselben Stand", () => {
    const c = testContent();
    const jump = scenario(42);
    const odd = scenario(42);
    advance(jump, c, 70 * 60_000);
    for (let i = 0; i < 10; i++) advance(odd, c, 7 * 60_000);
    expect(huntSnapshot(jump)).toEqual(huntSnapshot(odd));
  });
});

describe("Jagen — echter Content (nur wenn content-dev geliefert hat)", () => {
  const zones = content.huntingZones;
  it.skipIf(!zones)("huntingZones: bekannte Zonen, Stufen/Zeiten aufsteigend, xp > 0, alle Zonen außer slayer_tower", () => {
    const ids = new Set(content.zones.map((z) => z.id));
    let lastLevel = 0;
    let lastMs = 0;
    for (const z of zones!) {
      expect(ids.has(z.zoneId), z.zoneId).toBe(true);
      expect(z.levelRequired).toBeGreaterThan(lastLevel);
      expect(z.trapMs).toBeGreaterThan(lastMs);
      expect(z.xp).toBeGreaterThan(0);
      lastLevel = z.levelRequired;
      lastMs = z.trapMs;
    }
    const covered = new Set(zones!.map((z) => z.zoneId));
    for (const z of content.zones) if (z.id !== "slayer_tower") expect(covered.has(z.id), z.id).toBe(true);
    expect(covered.has("slayer_tower")).toBe(false);
    expect(content.items[BAIT_ITEM_ID]).toBeDefined();
    expect(content.skills[HUNTING_SKILL_ID]).toBeDefined();
  });

  it.skipIf(!zones)("Weiden-Falle mit Eber-Kill fängt auf echtem Content (offline == online)", () => {
    const seed = 5;
    const build = (): GameState => {
      const s = createGame({ name: "Echt" }, content, seed);
      s.monsterKills.boar = 1;
      addItem(s.inventory, content, BAIT_ITEM_ID, 30);
      expect(setHuntTrap(s, content, 0, "pastures", true)).toBe("ok");
      return s;
    };
    const pastures = huntZoneDef(content, "pastures")!;
    const a = build();
    const b = build();
    advance(a, content, pastures.trapMs * 6);
    for (let i = 0; i < 6; i++) advance(b, content, pastures.trapMs);
    expect(huntSnapshot(a)).toEqual(huntSnapshot(b));
    expect(a.huntCatchSeq).toBeGreaterThan(0);
    expect(a.monsterKills.boar).toBe(1);
    expect(a.skills[HUNTING_SKILL_ID]!.xp).toBeGreaterThan(0);
  });
});
