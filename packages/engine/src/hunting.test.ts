import { describe, expect, it } from "vitest";
import type { ContentDB, GameState, HuntZoneDef, ItemDef, MonsterDef } from "@hearthforge/shared";
import {
  BAIT_ITEM_ID,
  HUNTING_SKILL_ID,
  HUNT_CATCH_BASE,
  HUNT_CATCH_CAP,
  HUNT_LOOT_ROLLS,
  HUNT_LOOT_ROLLS_DOUBLED,
  HUNT_SLOT_LEVELS,
  HUNT_TRAP_SLOTS,
  HUNT_TRAP_SLOTS_TOTAL,
  PET_SKILL_EFFECT_CAP,
  defaultHuntTraps, huntCatchXp, HUNT_FIRST_CATCH_MULT, HUNT_XP_PER_CATCH } from "@hearthforge/shared";
import { content } from "@hearthforge/content";
import { createGame } from "./state";
import { advance } from "./tick";
import { addItem, itemCount } from "./inventory";
import { bankCount } from "./bank";
import { xpForLevel } from "./leveling";
import { nextFloat, nextInt } from "./rng";
import { equipPet, grantPet, petHuntDoubleRollsChance } from "./pets";
import { masterDoubleYieldBonus } from "./capes";
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
  huntTrapWaiting,
  tickHuntTraps, huntZoneBaitId } from "./hunting";

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
    expect(s.huntTraps).toHaveLength(HUNT_TRAP_SLOTS_TOTAL); // claude:2026-10-30T18:44:00+01:00 — SAVE 99: Array 8 (Fallensteller), Stufen-Plätze bleiben ≤ HUNT_TRAP_SLOTS
    expect(s.huntCatchSeq).toBe(0);
    expect(s.stats.huntCatches).toBe(0);
  });

  it("huntTrapSlots folgt HUNT_SLOT_LEVELS (1/5/15/30/50/75 → 1..6, Deckel 6)", () => {
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
  it("jede Familie, auch dungeonOnly (Chef 28.08.2026); nur dg_-Varianten und Bosse (enrage/Dungeon-Endgegner) bleiben draußen; zone passt, ≥ 1 Kill", () => {
    const c = testContent();
    const s = game(c);
    expect(huntableMonsters(s, c, "pastures")).toEqual([]); // nichts besiegt
    // Weiden: bull_boss (enrage) fällt trotz Kill heraus; the_imp (Dämon) ist seit 28.08.2026 fangbar.
    for (const id of ["boar", "chicken", "bull_boss", "the_imp"]) s.monsterKills[id] = 5;
    expect(huntableMonsters(s, c, "pastures")).toEqual(["chicken", "boar", "the_imp"]); // Content-Reihenfolge, Daemon zaehlt seit 28.08.2026 mit
    // Grenzlande: goblin_reaver (dungeonOnly) und goblin_warchief (Dungeon-Endgegner + enrage) nie.
    for (const id of ["goblin", "goblin_reaver", "goblin_warchief"]) s.monsterKills[id] = 1;
    expect(huntableMonsters(s, c, "borderlands")).toEqual(["goblin", "goblin_reaver"]); // Reaver ist dungeonOnly, seit 28.08.2026 fangbar
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
    // Chef 28.08.2026: jede Familie ist fangbar — Krypta (Untote) und Götzenhalle (Konstrukte) liefern jetzt Kandidaten,
    // der Endgegner der Götzenhalle bleibt als Boss draußen.
    expect(huntableMonsters(s, c, "crypt").length).toBeGreaterThan(0);
    expect(huntableMonsters(s, c, "idolhall").length).toBeGreaterThan(0);
    expect(huntableMonsters(s, c, "idolhall")).not.toContain("drazhan");
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
      expect(s.skills[HUNTING_SKILL_ID]!.xp).toBe(huntCatchXp(HARE.xp) * HUNT_FIRST_CATCH_MULT);
      expect(s.stats.huntCatchesById[HARE.id]).toBe(1);
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

  it("ohne Köder WARTET die Falle nach dem Wurf (Gebiet bleibt, review-1.2.0 P2); Auto-Erneuern AUS leert den Platz und verbraucht keinen Köder", () => {
    const c = testContent();
    const a = readyGame(c, 5, 1); // einziger Köder geht beim Stellen drauf
    advance(a, c, PASTURES_MS * 5);
    expect(a.huntTraps[0]!.zoneId).toBe("pastures");
    expect(a.huntTraps[0]!.remainingMs).toBe(0);
    expect(huntTrapWaiting(a.huntTraps[0]!)).toBe(true);
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
    expect(huntTrapWaiting(s.huntTraps[0]!)).toBe(true); // dritter Wurf ohne Köder → wartet (Gebiet bleibt, review-1.2.0 P2)
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
    // Seit 28.08.2026 kommt die XP vom gefangenen Monster: ein Erstfang (×HUNT_XP_PER_CATCH × HUNT_FIRST_CATCH_MULT)
    // soll hier genau die Stufe des zweiten Fallenplatzes erreichen.
    const base = testContent();
    const fatHare = { ...HARE, xp: Math.ceil(xpForLevel(HUNT_SLOT_LEVELS[1]!) / (HUNT_XP_PER_CATCH * HUNT_FIRST_CATCH_MULT)) };
    const c: ContentDB = { ...base, monsters: { ...base.monsters, [HARE.id]: fatHare } };
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

/**
 * review-1.2.0 P2 (29.08.2026): Falle wartet auf Köder statt ihr Gebiet zu vergessen. Zustandsdefinition
 * `zoneId !== null && remainingMs === 0` (kein neues Feld, kein SAVE-Bump), Neustart zum Fensterbeginn mit dem
 * Köder der ZONE, kein Wurf/RNG-Zug beim Warten, Verben konsistent (busy/leeren/Auto aus), offline == online.
 */
describe("Jagen — Falle wartet auf Köder (review-1.2.0 P2)", () => {
  it("Definition: leer / laufend / wartend über huntTrapWaiting; eine laufende Falle hat immer remainingMs ≥ 1", () => {
    const c = testContent();
    const s = game(c, 1);
    expect(huntTrapWaiting(s.huntTraps[0]!)).toBe(false); // leer
    s.monsterKills[HARE.id] = 1;
    addItem(s.inventory, c, BAIT_ITEM_ID, 1);
    expect(setHuntTrap(s, c, 0, "pastures", true)).toBe("ok");
    expect(s.huntTraps[0]!.remainingMs).toBeGreaterThanOrEqual(1);
    expect(huntTrapWaiting(s.huntTraps[0]!)).toBe(false); // läuft
    advance(s, c, PASTURES_MS - 100);
    expect(s.huntTraps[0]!.remainingMs).toBe(100);
    expect(huntTrapWaiting(s.huntTraps[0]!)).toBe(false);
    advance(s, c, 100); // Wurf, Auto-Erneuern ohne Köder ⇒ wartet
    expect(s.huntTraps[0]).toMatchObject({ zoneId: "pastures", remainingMs: 0, autoRebait: true });
    expect(huntTrapWaiting(s.huntTraps[0]!)).toBe(true);
    // Robust gegen kaputte Werte: NaN/negativ MIT Gebiet zählt als wartend, ohne Gebiet nie.
    expect(huntTrapWaiting({ zoneId: "pastures", remainingMs: Number.NaN })).toBe(true);
    expect(huntTrapWaiting({ zoneId: "pastures", remainingMs: -5 })).toBe(true);
    expect(huntTrapWaiting({ zoneId: null, remainingMs: 0 })).toBe(false);
  });

  it("beim Warten fällt kein Wurf und kein RNG-Zug, auch über lange Fenster; der Breadcrumb des letzten Wurfs bleibt", () => {
    const c = testContent();
    const s = readyGame(c, 5, 1); // einziger Köder ging beim Stellen drauf
    advance(s, c, PASTURES_MS);
    expect(huntTrapWaiting(s.huntTraps[0]!)).toBe(true);
    const throws = s.huntCatchSeq + (s.huntTraps[0]!.lastMissed ? 1 : 0);
    expect(throws).toBe(1);
    const rngBefore = s.rng.state;
    const { lastCatch, lastMissed } = s.huntTraps[0]!;
    tickHuntTraps(s, c, PASTURES_MS * 20);
    expect(s.rng.state).toBe(rngBefore);
    advance(s, c, PASTURES_MS * 20);
    expect(s.huntCatchSeq + (s.huntTraps[0]!.lastMissed ? 1 : 0)).toBe(throws);
    expect(s.huntTraps[0]).toMatchObject({ zoneId: "pastures", remainingMs: 0, lastCatch, lastMissed });
  });

  it("Köder wieder da (Inventar ODER Lager) ⇒ Neustart zum Fensterbeginn: EIN Köder gezogen, volle Fallenzeit", () => {
    const c = testContent();
    const a = readyGame(c, 6, 1);
    advance(a, c, PASTURES_MS); // wartet
    addItem(a.inventory, c, BAIT_ITEM_ID, 3);
    advance(a, c, 1000);
    expect(a.huntTraps[0]).toMatchObject({ zoneId: "pastures", remainingMs: PASTURES_MS - 1000 });
    expect(huntTrapWaiting(a.huntTraps[0]!)).toBe(false);
    expect(huntBaitCount(a)).toBe(2);

    const b = readyGame(c, 6, 1);
    advance(b, c, PASTURES_MS);
    b.bank[BAIT_ITEM_ID] = 1;
    advance(b, c, 1000);
    expect(b.huntTraps[0]!.remainingMs).toBe(PASTURES_MS - 1000);
    expect(bankCount(b, BAIT_ITEM_ID)).toBe(0);
    expect(b.bank[BAIT_ITEM_ID]).toBeUndefined(); // 0-Eintrag entfernt
  });

  it("Neustart im großen Fenster: mit 2 Ködern wirft die wartende Falle im 55-Minuten-Sprung zweimal und wartet dann wieder", () => {
    const c = testContent();
    const s = readyGame(c, 7, 1);
    advance(s, c, PASTURES_MS); // Wurf 1, wartet
    const seqBefore = s.huntCatchSeq;
    addItem(s.inventory, c, BAIT_ITEM_ID, 2);
    advance(s, c, 55 * 60_000);
    expect(huntBaitCount(s)).toBe(0);
    expect(s.huntTraps[0]).toMatchObject({ zoneId: "pastures", remainingMs: 0 });
    expect(huntTrapWaiting(s.huntTraps[0]!)).toBe(true);
    expect(s.huntCatchSeq - seqBefore).toBeLessThanOrEqual(2); // höchstens zwei Würfe (einer je Köder)
  });

  it("Neustart-Reihenfolge bei knappem Köder: kleinerer Platz-Index zuerst, die andere Falle wartet weiter", () => {
    const c = testContent();
    const s = game(c, 8);
    setLevel(s, 15); // drei Plätze
    s.monsterKills[HARE.id] = 1;
    addItem(s.inventory, c, BAIT_ITEM_ID, 2);
    expect(setHuntTrap(s, c, 0, "pastures", true)).toBe("ok");
    expect(setHuntTrap(s, c, 2, "pastures", true)).toBe("ok");
    advance(s, c, PASTURES_MS); // beide werfen bei 5 min ohne Köder ⇒ beide warten
    expect(huntTrapWaiting(s.huntTraps[0]!)).toBe(true);
    expect(huntTrapWaiting(s.huntTraps[2]!)).toBe(true);
    addItem(s.inventory, c, BAIT_ITEM_ID, 1);
    advance(s, c, 1000);
    expect(s.huntTraps[0]!.remainingMs).toBe(PASTURES_MS - 1000);
    expect(huntTrapWaiting(s.huntTraps[2]!)).toBe(true);
    expect(huntBaitCount(s)).toBe(0);
  });

  it("Verben: Stellen auf eine wartende Falle = busy; Leeren leert sie; Auto-Erneuern AUS leert sie ebenfalls (laufende Falle bleibt gestellt)", () => {
    const c = testContent();
    const s = readyGame(c, 9, 1);
    advance(s, c, PASTURES_MS);
    expect(huntTrapWaiting(s.huntTraps[0]!)).toBe(true);
    addItem(s.inventory, c, BAIT_ITEM_ID, 1);
    expect(huntSetReason(s, c, 0, "pastures")).toBe("busy");
    expect(setHuntTrap(s, c, 0, "pastures", true)).toBe("busy");
    expect(huntBaitCount(s)).toBe(1); // nichts gezogen
    clearHuntTrap(s, 0);
    expect(s.huntTraps[0]).toMatchObject({ zoneId: null, remainingMs: 0, autoRebait: true });
    expect(huntSetReason(s, c, 0, "pastures")).toBe("ok");

    const t = readyGame(c, 9, 1);
    advance(t, c, PASTURES_MS);
    setHuntAutoRebait(t, 0, false);
    expect(t.huntTraps[0]).toMatchObject({ zoneId: null, remainingMs: 0, autoRebait: false });
    // Laufende Falle: AUS lässt sie gestellt, sie leert sich erst nach ihrem Wurf.
    const u = readyGame(c, 9, 2);
    setHuntAutoRebait(u, 0, false);
    expect(u.huntTraps[0]!.zoneId).toBe("pastures");
    advance(u, c, PASTURES_MS);
    expect(u.huntTraps[0]!.zoneId).toBeNull();
    expect(huntBaitCount(u)).toBe(1);
  });

  it("Köder der ZONE zählt: ein Krebsköder-Gebiet wartet trotz Würmern und startet erst mit Krebsködern", () => {
    const base = testContent();
    const c: ContentDB = { ...base, huntingZones: base.huntingZones!.map((z) => (z.zoneId === "pastures" ? { ...z, baitItemId: "bait_crab" } : z)) };
    const s = game(c, 10);
    s.monsterKills[HARE.id] = 1;
    addItem(s.inventory, c, "bait_crab", 1);
    addItem(s.inventory, c, BAIT_ITEM_ID, 5);
    expect(setHuntTrap(s, c, 0, "pastures", true)).toBe("ok");
    advance(s, c, PASTURES_MS * 2);
    expect(huntTrapWaiting(s.huntTraps[0]!)).toBe(true);
    expect(itemCount(s.inventory, BAIT_ITEM_ID)).toBe(5);
    addItem(s.inventory, c, "bait_crab", 1);
    advance(s, c, 1000);
    expect(s.huntTraps[0]!.remainingMs).toBe(PASTURES_MS - 1000);
    expect(itemCount(s.inventory, "bait_crab")).toBe(0);
    expect(itemCount(s.inventory, BAIT_ITEM_ID)).toBe(5);
  });

  it("Save-Edit (wartend + Auto AUS) ist kein toter Zustand: startet einmal mit Köder, leert sich nach dem Wurf", () => {
    const c = testContent();
    const s = readyGame(c, 11, 1);
    advance(s, c, PASTURES_MS);
    s.huntTraps[0]!.autoRebait = false; // direkt am State vorbei (setHuntAutoRebait würde leeren)
    addItem(s.inventory, c, BAIT_ITEM_ID, 2);
    advance(s, c, PASTURES_MS);
    expect(s.huntTraps[0]!.zoneId).toBeNull();
    expect(huntBaitCount(s)).toBe(1);
  });

  it("offline == online: Warten, Nachschub und Neustart — 55-Minuten-Sprung == 55 × 1 Minute (zwei Fallen, knapper Köder)", () => {
    const c = testContent();
    function scarce(seed: number): GameState {
      const s = game(c, seed);
      setLevel(s, 15);
      s.monsterKills[HARE.id] = 1;
      s.monsterKills.boar = 1;
      addItem(s.inventory, c, BAIT_ITEM_ID, 3); // zwei fürs Stellen, einer fürs erste Erneuern (Platz 0 gewinnt)
      expect(setHuntTrap(s, c, 0, "pastures", true)).toBe("ok");
      expect(setHuntTrap(s, c, 2, "pastures", true)).toBe("ok");
      return s;
    }
    const jump = scarce(31);
    const steps = scarce(31);
    advance(jump, c, 55 * 60_000);
    for (let i = 0; i < 55; i++) advance(steps, c, 60_000);
    expect(huntSnapshot(jump)).toEqual(huntSnapshot(steps));
    expect(huntTrapWaiting(jump.huntTraps[0]!)).toBe(true);
    expect(huntTrapWaiting(jump.huntTraps[2]!)).toBe(true);
    expect(huntBaitCount(jump)).toBe(0);
    // Nachschub ZWISCHEN den Fenstern (Angeln/Kauf/Post): beide Pfade starten identisch neu.
    for (const s of [jump, steps]) addItem(s.inventory, c, BAIT_ITEM_ID, 4);
    advance(jump, c, 55 * 60_000);
    for (let i = 0; i < 55; i++) advance(steps, c, 60_000);
    expect(huntSnapshot(jump)).toEqual(huntSnapshot(steps));
    expect(huntBaitCount(jump)).toBe(0);
    expect(huntTrapWaiting(jump.huntTraps[0]!)).toBe(true);
    expect(huntTrapWaiting(jump.huntTraps[2]!)).toBe(true);
    expect(jump.huntCatchSeq).toBeGreaterThan(0);
  });
});

/**
 * 1.2.0 (Chef 28.08.2026, zweiter Umbau): Jagen-Begleiter booted_tomcat (Leon) — Passiv `huntDoubleRolls` (5 % Chance je
 * Fang auf HUNT_LOOT_ROLLS_DOUBLED = 10 statt 5 Beute-Durchläufe; EIN RNG-Zug vor den Beute-Würfen, nur mit aktivem Leon =
 * Schritt 4 der RNG-Reihenfolge) und Begleiter-Wurf je FANG als Schritt 6 (Kopfkommentar hunting.ts). Das frühere Passiv
 * `huntCatchChance` (+3 pp) ist gestrichen: die Fangchance kennt kein Begleiter-Passiv mehr.
 */
describe("Jagen — Begleiter (booted_tomcat, 1.2.0)", () => {
  it("Passiv huntDoubleRolls: Content 5 % auf hunting (Cap 0,05); die Fangchance bleibt OHNE Begleiter-Bonus; fremde Pets 0", () => {
    const c = testContent();
    const s = game(c);
    expect(content.pets?.booted_tomcat?.skillEffect).toMatchObject({ kind: "huntDoubleRolls", skill: "hunting", value: 0.05 });
    expect(PET_SKILL_EFFECT_CAP.huntDoubleRolls).toBe(0.05);
    expect(petHuntDoubleRollsChance(s, c, HUNTING_SKILL_ID)).toBe(0); // kein Pet
    grantPet(s, "booted_tomcat"); // erstes Pet rüstet sich selbst aus
    expect(s.character.companionPetId).toBe("booted_tomcat");
    expect(petHuntDoubleRollsChance(s, c, HUNTING_SKILL_ID)).toBe(0.05);
    expect(petHuntDoubleRollsChance(s, c, "fishing")).toBe(0); // skill-gebunden
    // Kein Fangchancen-Bonus mehr (war +3 pp): Basis 70 %, Stufenformel, Deckel 95 % — mit und ohne Leon identisch.
    expect(huntCatchChance(s, c, "pastures")).toBeCloseTo(HUNT_CATCH_BASE, 10);
    expect(huntCatchChance(s, c, "borderlands")).toBeCloseTo(0.7 - 9 * 0.005, 10);
    setLevel(s, 99);
    expect(huntCatchChance(s, c, "pastures")).toBe(HUNT_CATCH_CAP);
    expect(huntCatchChance(s, c, "nirgendwo")).toBe(0);
    // claude:2026-10-18T02:00:00+02:00 — Echo (1.3.0): ein anderes Pet (rotbark) ausgerüstet ⇒ der besessene Leon wirkt
    // nur noch mit 25 % (0,0125); rotbark selbst liefert kein Jagen-Glück.
    setLevel(s, 1);
    grantPet(s, "rotbark");
    expect(equipPet(s, "rotbark")).toBe(true);
    expect(petHuntDoubleRollsChance(s, c, HUNTING_SKILL_ID)).toBeCloseTo(0.0125, 10);
    // Abgelegt ⇒ weiterhin nur das Echo.
    expect(equipPet(s, null)).toBe(true);
    expect(petHuntDoubleRollsChance(s, c, HUNTING_SKILL_ID)).toBeCloseTo(0.0125, 10);
  });

  it("huntDoubleRolls: EIN Zug (Schritt 4) nur mit aktivem Leon — Treffer ⇒ 10 Beute-Durchläufe, sonst 5; Gold bleibt ×5 (exakte RNG-Züge)", () => {
    const c = testContent();
    let seenDouble = false;
    let seenSingle = false;
    for (let seed = 1; seed < 800 && !(seenDouble && seenSingle); seed++) {
      const s = readyGame(c, seed, 5);
      grantPet(s, "booted_tomcat"); // besessen UND ausgerüstet ⇒ Schritt 4 zieht, Schritt 6 (Begleiter-Wurf) nicht mehr
      expect(s.character.companionPetId).toBe("booted_tomcat");
      advance(s, c, PASTURES_MS - 1000);
      const rng = { state: s.rng.state };
      if (!(nextFloat(rng) < huntCatchChance(s, c, "pastures"))) continue; // 1. Fangchance
      nextInt(rng, 0, 0); // 2. Monster (Pool = [test_hare])
      const goldRoll = HARE.gold + nextInt(rng, 0, Math.ceil(HARE.gold * 0.4)); // 3. Gold-Streuung
      const doubled = nextFloat(rng) < 0.05; // 4. Leon-Glück (genau EIN Zug)
      const passes = doubled ? HUNT_LOOT_ROLLS_DOUBLED : HUNT_LOOT_ROLLS;
      for (let pass = 0; pass < passes; pass++) {
        nextFloat(rng); // 5. Chance (rawhide, chance 1)
        nextInt(rng, 1, 1); // 5. Menge (Material ⇒ kein Suffix-Zug)
      }
      // 6. Begleiter-Wurf entfällt (Leon im Besitz, kein weiteres Jagen-Pet im Test-Content).
      const goldBefore = s.character.gold;
      advance(s, c, 1000);
      expect(s.rng.state).toBe(rng.state);
      expect(s.huntTraps[0]!.lastCatch).toMatchObject({ seq: 1, monsterId: HARE.id, items: [{ id: "rawhide", qty: passes }], gold: goldRoll * HUNT_LOOT_ROLLS });
      expect(s.character.gold - goldBefore).toBe(goldRoll * HUNT_LOOT_ROLLS); // Gold NIE verdoppelt
      expect(itemCount(s.inventory, "rawhide")).toBe(passes);
      expect(s.stats.itemsGathered).toBe(passes);
      if (doubled) seenDouble = true;
      else seenSingle = true;
    }
    expect(seenDouble).toBe(true);
    expect(seenSingle).toBe(true);
    expect(HUNT_LOOT_ROLLS_DOUBLED).toBe(HUNT_LOOT_ROLLS * 2);
  });

  it("ohne Leon (kein Pet / fremdes Pet) fällt Schritt 4 komplett weg — die Fang-Sequenz bleibt bit-identisch", () => {
    const c = testContent();
    let checked = 0;
    for (let seed = 1; seed < 60 && checked < 3; seed++) {
      const s = readyGame(c, seed, 5);
      grantPet(s, "rotbark"); // fremdes Pet (woodcutting), ausgerüstet
      advance(s, c, PASTURES_MS - 1000);
      const rng = { state: s.rng.state };
      if (!(nextFloat(rng) < huntCatchChance(s, c, "pastures"))) continue;
      nextInt(rng, 0, 0);
      nextInt(rng, 0, Math.ceil(HARE.gold * 0.4));
      for (let pass = 0; pass < HUNT_LOOT_ROLLS; pass++) {
        nextFloat(rng);
        nextInt(rng, 1, 1);
      }
      nextFloat(rng); // 6. Begleiter-Wurf: booted_tomcat noch nicht im Besitz (dropChance 1/8000 ⇒ praktisch nie)
      advance(s, c, 1000);
      expect(s.rng.state).toBe(rng.state);
      expect(s.huntTraps[0]!.lastCatch?.items).toEqual([{ id: "rawhide", qty: HUNT_LOOT_ROLLS }]);
      checked++;
    }
    expect(checked).toBe(3);
  });

  it("Begleiter-Wurf je Fang (RNG-Schritt 6, nach Beute/XP): dropChance 1 ⇒ Pet beim ersten Fang; im Besitz ⇒ kein weiterer Zug", () => {
    const base = testContent();
    const tomcat = base.pets!.booted_tomcat!;
    const c: ContentDB = { ...base, pets: { ...base.pets, booted_tomcat: { ...tomcat, dropChance: 1 } } };
    // Seed suchen, bei dem der erste Wurf sitzt (Chance 70 %); die RNG-Züge des Fangs vorab nachrechnen.
    let s: GameState | null = null;
    let expectedRng = 0;
    for (let seed = 1; seed < 60 && !s; seed++) {
      const g = readyGame(c, seed, 5);
      advance(g, c, PASTURES_MS - 1000);
      const rng = { state: g.rng.state };
      if (!(nextFloat(rng) < huntCatchChance(g, c, "pastures"))) continue; // 1. Fangchance
      nextInt(rng, 0, 0); // 2. Monster (Pool = [test_hare])
      nextInt(rng, 0, Math.ceil(HARE.gold * 0.4)); // 3. Gold-Streuung
      // Schritt 4 (Leon-Glück) entfällt: das Pet ist noch nicht im Besitz, also nicht aktiv.
      for (let pass = 0; pass < HUNT_LOOT_ROLLS; pass++) {
        nextFloat(rng); // 5. Chance (rawhide, chance 1)
        nextInt(rng, 1, 1); // 5. Menge (Material ⇒ kein Suffix-Zug)
      }
      nextFloat(rng); // 6. Begleiter-Wurf (booted_tomcat noch nicht im Besitz)
      expectedRng = rng.state;
      advance(g, c, 1000);
      s = g;
    }
    expect(s).not.toBeNull();
    expect(s!.huntTraps[0]!.lastCatch?.seq).toBe(1);
    expect(s!.character.ownedPets.booted_tomcat).toBe(true);
    expect(s!.character.companionPetId).toBe("booted_tomcat");
    expect(s!.lastPetDrop).toEqual({ petId: "booted_tomcat", seq: 1 });
    expect(s!.petDropSeq).toBe(1);
    expect(s!.rng.state).toBe(expectedRng); // exakt 14 Züge — Pet-Wurf NACH der Beute
    // Zweiter Fang: Pet im Besitz UND ausgerüstet ⇒ Schritt 6 zieht NICHT mehr, dafür Schritt 4 (Leon-Glück) genau
    // einmal (14 bzw. 24 Züge bei Treffer, 1 bei Fehlschlag).
    const rng2 = { state: s!.rng.state };
    if (nextFloat(rng2) < huntCatchChance(s!, c, "pastures")) {
      nextInt(rng2, 0, 0);
      nextInt(rng2, 0, Math.ceil(HARE.gold * 0.4));
      const passes = nextFloat(rng2) < 0.05 ? HUNT_LOOT_ROLLS_DOUBLED : HUNT_LOOT_ROLLS; // 4. Leon-Glück
      for (let pass = 0; pass < passes; pass++) {
        nextFloat(rng2);
        nextInt(rng2, 1, 1);
      }
    }
    advance(s!, c, PASTURES_MS);
    expect(s!.rng.state).toBe(rng2.state);
    expect(s!.petDropSeq).toBe(1);
  });

  it("Fehlschlag der Falle ⇒ kein Begleiter-Wurf (nur der eine Fangchancen-Zug)", () => {
    const base = testContent();
    const c: ContentDB = { ...base, pets: { ...base.pets, booted_tomcat: { ...base.pets!.booted_tomcat!, dropChance: 1 } } };
    let seen = false;
    for (let seed = 1; seed < 80 && !seen; seed++) {
      const g = readyGame(c, seed, 5);
      advance(g, c, PASTURES_MS - 1000);
      const rng = { state: g.rng.state };
      if (nextFloat(rng) < huntCatchChance(g, c, "pastures")) continue; // Treffer — anderen Seed suchen
      advance(g, c, 1000);
      expect(g.huntTraps[0]!.lastMissed).toBe(true);
      expect(g.rng.state).toBe(rng.state);
      expect(g.character.ownedPets.booted_tomcat).toBeUndefined();
      seen = true;
    }
    expect(seen).toBe(true);
  });

  it("offline == online bleibt mit Begleiter-Wurf und -Passiv (55-Minuten-Sprung == 55 × 1 Minute)", () => {
    const base = testContent();
    const c: ContentDB = { ...base, pets: { ...base.pets, booted_tomcat: { ...base.pets!.booted_tomcat!, dropChance: 0.5 } } };
    const build = (): GameState => {
      const s = game(c, 31);
      setLevel(s, 25);
      s.monsterKills[HARE.id] = 1;
      s.monsterKills.boar = 1;
      addItem(s.inventory, c, BAIT_ITEM_ID, 40);
      expect(setHuntTrap(s, c, 0, "pastures", true)).toBe("ok");
      expect(setHuntTrap(s, c, 1, "pastures", true)).toBe("ok");
      return s;
    };
    const jump = build();
    const steps = build();
    advance(jump, c, 55 * 60_000);
    for (let i = 0; i < 55; i++) advance(steps, c, 60_000);
    expect(huntSnapshot(jump)).toEqual(huntSnapshot(steps));
    expect(jump.character.ownedPets.booted_tomcat).toBe(true);
    expect(steps.character.ownedPets.booted_tomcat).toBe(true);
    expect(jump.petDropSeq).toBe(steps.petDropSeq);
    expect(jump.lastPetDrop).toEqual(steps.lastPetDrop);
  });
});

describe("Jagen — Meisterring Jagen (ring_master_hunting, Revision 29.08.2026)", () => {
  const RING = "ring_master_hunting";
  /** Test-Content ohne Begleiter-Wurf (booted_tomcat dropChance 0 ⇒ Schritt 6 zieht nicht): die Fang-Sequenz ist exakt nachrechenbar. */
  function ringContent(): ContentDB {
    const base = testContent();
    const tomcat = base.pets?.booted_tomcat;
    return tomcat ? { ...base, pets: { ...base.pets, booted_tomcat: { ...tomcat, dropChance: 0 } } } : base;
  }

  it("Content: der Ring trägt doubleYield/hunting 5 %; masterDoubleYieldBonus liest ihn nur ausgerüstet und nur für hunting", () => {
    const c = ringContent();
    expect(content.items[RING]?.masterPerk).toEqual({ kind: "doubleYield", skill: "hunting", value: 0.05 });
    const s = game(c);
    expect(masterDoubleYieldBonus(s, c, HUNTING_SKILL_ID)).toBe(0); // kein Ring
    s.character.equipment.ring1 = RING;
    expect(masterDoubleYieldBonus(s, c, HUNTING_SKILL_ID)).toBe(0.05);
    expect(masterDoubleYieldBonus(s, c, "fishing")).toBe(0); // skill-gebunden
    s.character.equipment.ring1 = "ring_master_fishing"; // fremder Sammler-Ring: doubleYield/fishing
    expect(masterDoubleYieldBonus(s, c, HUNTING_SKILL_ID)).toBe(0);
  });

  it("Perk aktiv: je getroffenem Beute-Eintrag EIN Zug in Schritt 5, Treffer ⇒ Menge ×2 (exakte RNG-Züge, Gold bleibt ×5)", () => {
    const c = ringContent();
    let seenDouble = false;
    let seenSingle = false;
    for (let seed = 1; seed < 800 && !(seenDouble && seenSingle); seed++) {
      const s = readyGame(c, seed, 5);
      s.character.equipment.ring1 = RING;
      advance(s, c, PASTURES_MS - 1000);
      const rng = { state: s.rng.state };
      if (!(nextFloat(rng) < huntCatchChance(s, c, "pastures"))) continue; // 1. Fangchance
      nextInt(rng, 0, 0); // 2. Monster (Pool = [test_hare])
      const goldRoll = HARE.gold + nextInt(rng, 0, Math.ceil(HARE.gold * 0.4)); // 3. Gold-Streuung
      // Schritt 4 (Leon-Glück) entfällt: kein Pet.
      let expectQty = 0;
      for (let pass = 0; pass < HUNT_LOOT_ROLLS; pass++) {
        nextFloat(rng); // 5. Chance (rawhide, chance 1)
        const qty = nextInt(rng, 1, 1); // 5. Menge
        expectQty += nextFloat(rng) < 0.05 ? qty * 2 : qty; // 5. Meisterring-Zug (genau EINER je Treffer)
      }
      // Schritt 6 entfällt (dropChance 0).
      const goldBefore = s.character.gold;
      advance(s, c, 1000);
      expect(s.rng.state).toBe(rng.state);
      expect(s.huntTraps[0]!.lastCatch).toMatchObject({ seq: 1, monsterId: HARE.id, items: [{ id: "rawhide", qty: expectQty }], gold: goldRoll * HUNT_LOOT_ROLLS });
      expect(s.character.gold - goldBefore).toBe(goldRoll * HUNT_LOOT_ROLLS); // Gold NIE verdoppelt
      expect(itemCount(s.inventory, "rawhide")).toBe(expectQty);
      expect(s.stats.itemsGathered).toBe(expectQty);
      expect(expectQty).toBeGreaterThanOrEqual(HUNT_LOOT_ROLLS);
      expect(expectQty).toBeLessThanOrEqual(HUNT_LOOT_ROLLS * 2);
      if (expectQty > HUNT_LOOT_ROLLS) seenDouble = true;
      else seenSingle = true;
    }
    expect(seenDouble).toBe(true);
    expect(seenSingle).toBe(true);
  });

  it("Perk-Zug nur bei Menge > 0: ein Eintrag mit min=max=0 zieht keinen Meisterring-Wurf", () => {
    const base = ringContent();
    const nothing: MonsterDef = { ...HARE, id: "test_hare_empty", loot: [{ itemId: "rawhide", chance: 1, min: 0, max: 0 }] };
    const c: ContentDB = { ...base, monsters: { ...base.monsters, [nothing.id]: nothing } };
    delete (c.monsters as Record<string, MonsterDef>)[HARE.id]; // Pool = [test_hare_empty]
    let checked = 0;
    for (let seed = 1; seed < 80 && checked < 3; seed++) {
      const s = game(c, seed);
      s.monsterKills[nothing.id] = 1;
      addItem(s.inventory, c, BAIT_ITEM_ID, 5);
      expect(setHuntTrap(s, c, 0, "pastures", true)).toBe("ok");
      s.character.equipment.ring1 = RING;
      advance(s, c, PASTURES_MS - 1000);
      const rng = { state: s.rng.state };
      if (!(nextFloat(rng) < huntCatchChance(s, c, "pastures"))) continue;
      nextInt(rng, 0, 0);
      nextInt(rng, 0, Math.ceil(HARE.gold * 0.4));
      for (let pass = 0; pass < HUNT_LOOT_ROLLS; pass++) {
        nextFloat(rng);
        nextInt(rng, 0, 0); // Menge 0 ⇒ KEIN Perk-Zug
      }
      advance(s, c, 1000);
      expect(s.rng.state).toBe(rng.state);
      expect(s.huntTraps[0]!.lastCatch?.items).toEqual([]);
      checked++;
    }
    expect(checked).toBe(3);
  });

  it("ohne Ring / mit fremdem Sammler-Ring (fishing) fällt der Perk-Zug komplett weg — Sequenz und Stand bit-identisch", () => {
    const c = ringContent();
    const bare = readyGame(c, 11, 10);
    const foreign = readyGame(c, 11, 10);
    foreign.character.equipment.ring1 = "ring_master_fishing";
    expect(masterDoubleYieldBonus(foreign, c, HUNTING_SKILL_ID)).toBe(0);
    advance(bare, c, 4 * PASTURES_MS);
    advance(foreign, c, 4 * PASTURES_MS);
    expect(bare.rng.state).toBe(foreign.rng.state);
    expect(huntSnapshot(bare)).toEqual(huntSnapshot(foreign));
    expect(bare.huntCatchSeq).toBeGreaterThan(0);
    // Und der Perk-Zug allein trennt beide Stände: MIT Jagen-Ring läuft die Sequenz auseinander (mind. ein Fang ⇒ ≥ 5 Extra-Züge).
    const ring = readyGame(c, 11, 10);
    ring.character.equipment.ring1 = RING;
    advance(ring, c, 4 * PASTURES_MS);
    // Bis zum ersten Fang laufen beide identisch (Schritt 1 ist derselbe Zug), ab dort zieht nur der Ring weiter.
    expect(ring.rng.state).not.toBe(bare.rng.state);
  });

  it("offline == online mit Ring (55-Minuten-Sprung == 55 × 1 Minute, zwei Fallen)", () => {
    const c = ringContent();
    const build = (): GameState => {
      const s = game(c, 47);
      setLevel(s, 25);
      s.monsterKills[HARE.id] = 1;
      s.monsterKills.boar = 1;
      s.character.equipment.ring1 = RING;
      addItem(s.inventory, c, BAIT_ITEM_ID, 40);
      expect(setHuntTrap(s, c, 0, "pastures", true)).toBe("ok");
      expect(setHuntTrap(s, c, 1, "pastures", true)).toBe("ok");
      return s;
    };
    const jump = build();
    const steps = build();
    advance(jump, c, 55 * 60_000);
    for (let i = 0; i < 55; i++) advance(steps, c, 60_000);
    expect(huntSnapshot(jump)).toEqual(huntSnapshot(steps));
    expect(jump.rng.state).toBe(steps.rng.state);
    expect(jump.huntCatchSeq).toBeGreaterThan(0);
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

describe("Jagen: XP nach dem gefangenen Monster (Chef 28.08.2026)", () => {
  it("huntCatchXp = Kampf-XP des Monsters × 5 (Huhn 10, Eber 100, Roc 10 250), Erstfang ×2 obendrauf", () => {
    expect(huntCatchXp(2)).toBe(10);
    expect(huntCatchXp(20)).toBe(100);
    expect(huntCatchXp(2050)).toBe(10250);
    expect(huntCatchXp(0)).toBe(1);
    expect(HUNT_FIRST_CATCH_MULT).toBe(2);
  });
});

describe("Koeder-Stufen (Chef 28.08.2026: Angeln liefert je Gebietsstufe den Koeder)", () => {
  it("huntZoneBaitId: Tabelle nach Gebietsstufe, eigenes Feld gewinnt", () => {
    expect(huntZoneBaitId({ levelRequired: 1 })).toBe("bait_worm");
    expect(huntZoneBaitId({ levelRequired: 39 })).toBe("bait_maggot");
    expect(huntZoneBaitId({ levelRequired: 40 })).toBe("bait_crab");
    expect(huntZoneBaitId({ levelRequired: 95 })).toBe("bait_glow");
    expect(huntZoneBaitId({ levelRequired: 1, baitItemId: "bait_squid" })).toBe("bait_squid");
  });

  it("Gebiet mit Krebskoeder: Wuermer reichen nicht, Krebskoeder wird beim Stellen und beim Erneuern gezogen", () => {
    const base = testContent();
    const c: ContentDB = { ...base, huntingZones: base.huntingZones!.map((z) => (z.zoneId === "pastures" ? { ...z, baitItemId: "bait_crab" } : z)) };
    const s = game(c, 5);
    s.monsterKills[HARE.id] = 1;
    addItem(s.inventory, c, BAIT_ITEM_ID, 5);
    expect(huntSetReason(s, c, 0, "pastures")).toBe("no_bait");
    addItem(s.inventory, c, "bait_crab", 2);
    expect(setHuntTrap(s, c, 0, "pastures", true)).toBe("ok");
    expect(itemCount(s.inventory, "bait_crab")).toBe(1);
    expect(itemCount(s.inventory, BAIT_ITEM_ID)).toBe(5);
    advance(s, c, PASTURES_MS + 1000);
    expect(itemCount(s.inventory, "bait_crab")).toBe(0);
    expect(itemCount(s.inventory, BAIT_ITEM_ID)).toBe(5);
    expect(s.huntTraps[0]!.zoneId).toBe("pastures");
  });
});
