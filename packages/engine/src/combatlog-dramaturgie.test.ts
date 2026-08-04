import { describe, expect, it } from "vitest";
import type { ContentDB, ItemDef, MonsterDef } from "@hearthforge/shared";
import {
  DODGE_CAP,
  MELEE_LIFESTEAL,
  MELEE_LIFESTEAL_CAP_ABS,
  MELEE_LIFESTEAL_CAP_PCT,
} from "@hearthforge/shared";
import { content } from "@hearthforge/content";
import { createGame } from "./state";
import { computeStats } from "./character";
import { startCombat, combatStep } from "./combat";

/**
 * Regressionstests E+-Paket (design/battle-040-dramaturgie.md §E+, Chef-GO 2026-08-03) —
 * drei ADDITIVE Event-Lücken, NUR Log-Emission, null Mechanik-/RNG-Änderung:
 *
 *  Lücke 1: bleed/poison tickten STUMM — `emitBurnTick` feuerte nur für burn. Jetzt emittiert
 *           `emitDotTick` für ALLE Schadens-DoTs (burn/bleed/poison) den bestehenden
 *           `kind:"dot"`-Event mit `status` = DoT-Art (~1×/Sekunde, gedrosselt).
 *  Lücke 2: Schock-Aussetzer und Leder-Dodge loggten beide als nacktes `kind:"miss"` —
 *           ununterscheidbar vom echten Fehlschlag. Jetzt additives Feld
 *           `missReason: "shock"|"dodge"`; echte Misses bleiben OHNE das Feld.
 *  Lücke 3: der Melee-STIL-Lebensraub (MELEE_LIFESTEAL) heilte stumm (nur Gear-Lifesteal
 *           loggte). Jetzt dieselbe `kind:"lifesteal"`-Emission mit unterscheidbarer Quelle
 *           `source:"meleeLifesteal"`; ohne echte Heilung (volle HP) KEIN Geister-Event.
 */

function withItems(c: ContentDB, items: ItemDef[]): ContentDB {
  const map = { ...c.items };
  for (const it of items) map[it.id] = it;
  return { ...c, items: map };
}
function withMonster(c: ContentDB, m: MonsterDef): ContentDB {
  return { ...c, monsters: { ...c.monsters, [m.id]: m } };
}

/** Passiver Riesen-HP-Dummy: greift praktisch nie an (Riesen-Intervall), stirbt nie. */
function dummy(id: string, over: Partial<MonsterDef> = {}): MonsterDef {
  return {
    id,
    name: { en: id, de: id },
    level: 10,
    maxHp: 5_000_000,
    damage: 6,
    accuracy: 100_000,
    evasion: 0,
    defense: 0,
    attackIntervalMs: 9_999_999,
    xp: 0,
    gold: 0,
    loot: [],
    ...over,
  };
}

const SWORD: ItemDef = {
  id: "tt_dram_sword",
  name: "Dramaturgie-Testklinge",
  type: "equipment",
  stackable: false,
  slot: "mainhand",
  weaponStyle: "melee",
  twoHanded: false,
  bonus: { meleeDamage: 25, accuracy: 200 },
};

const WAND: ItemDef = {
  id: "tt_dram_wand",
  name: "Dramaturgie-Testzepter",
  type: "equipment",
  stackable: false,
  slot: "mainhand",
  weaponStyle: "magic",
  twoHanded: false,
  bonus: { magicDamage: 25, accuracy: 200 },
  manaCost: 5,
};

/** Leder-Probe: riesiges evasionRating ⇒ dodgeChance sättigt auf DODGE_CAP. */
const LEATHER: ItemDef = {
  id: "tt_dram_leather",
  name: "Dramaturgie-Testleder",
  type: "equipment",
  stackable: false,
  slot: "body",
  evasionRating: 1_000_000, // Top-Level-Trinity-Feld (kein EquipBonus) — Σevr sättigt die Dodge-Kurve
};

function setup(monster: MonsterDef, items: ItemDef[], seed: number, mainhand?: string, body?: string) {
  const c = withMonster(withItems(content, items), monster);
  const s = createGame({ name: "D", baseAttributes: { con: 400, str: 20 } }, c, seed);
  if (mainhand) s.character.equipment.mainhand = mainhand;
  if (body) s.character.equipment.body = body;
  s.character.food = null;
  expect(startCombat(s, c, monster.id)).toBe(true);
  const st = computeStats(s, c);
  return { s, c, st, monster };
}

/** Ein Tick, in dem KEINE Seite angreift (beide Timer unter dem Intervall gehalten). */
function idleTick(s: ReturnType<typeof createGame>, c: ContentDB): void {
  s.combat.playerTimerMs = 0;
  s.combat.enemyTimerMs = 0;
  combatStep(s, c);
}

describe("E+ Lücke 1: bleed/poison-DoTs emittieren dot-Events (vorher stumm)", () => {
  it("bleed am GEGNER: dot-Event by player mit status bleed, amount = Magnitude/s, ~1×/Sekunde", () => {
    const { s, c } = setup(dummy("tt_dram_bleed_mob"), [], 11);
    s.combat.enemyEffects.push({ type: "bleed", remainingMs: 3000, magnitude: 12 });
    const hpBefore = s.combat.enemyHp;
    for (let i = 0; i < 10; i++) idleTick(s, c); // 1 Sekunde
    const dots = s.combat.log.filter((e) => e.kind === "dot");
    // Drossel: genau EINE Zeile in dieser Sekunde (Sekundengrenze 3s→2s), nicht 10.
    expect(dots).toHaveLength(1);
    expect(dots[0]!.by).toBe("player"); // DoT am Gegner = vom Spieler verursacht
    expect(dots[0]!.status).toBe("bleed");
    expect(dots[0]!.amount).toBe(12);
    // Log-only-Beleg: der Schaden floss unverändert weiter (10 Ticks à magnitude·0,1).
    expect(hpBefore - s.combat.enemyHp).toBeCloseTo(12, 5);
  });

  it("poison am SPIELER: dot-Event by enemy mit status poison", () => {
    const { s, c } = setup(dummy("tt_dram_poison_mob"), [], 12);
    s.combat.playerEffects.push({ type: "poison", remainingMs: 3000, magnitude: 8 });
    for (let i = 0; i < 10; i++) idleTick(s, c);
    const dots = s.combat.log.filter((e) => e.kind === "dot");
    expect(dots).toHaveLength(1);
    expect(dots[0]!.by).toBe("enemy"); // DoT am Spieler = vom Gegner verursacht
    expect(dots[0]!.status).toBe("poison");
    expect(dots[0]!.amount).toBe(8);
  });

  it("Geister-Guard: ohne Schadens-DoT (auch mit frost/shock) entsteht NIE ein dot-Event", () => {
    const { s, c } = setup(dummy("tt_dram_nodot_mob"), [], 13);
    s.combat.enemyEffects.push({ type: "frost", remainingMs: 5000, magnitude: 0 });
    s.combat.playerEffects.push({ type: "frost", remainingMs: 5000, magnitude: 0 });
    for (let i = 0; i < 20; i++) idleTick(s, c);
    expect(s.combat.log.some((e) => e.kind === "dot")).toBe(false);
  });
});

describe("E+ Lücke 2: missReason unterscheidet Schock-Aussetzer und Leder-Dodge vom echten Miss", () => {
  it("Schock am SPIELER: fälliger Angriff setzt aus → miss by player mit missReason shock", () => {
    const { s, c, st } = setup(dummy("tt_dram_shockp_mob"), [SWORD], 14, SWORD.id);
    s.combat.playerEffects.push({ type: "shock", remainingMs: 5000, magnitude: 1 }); // Chance 1 ⇒ sicherer Aussetzer
    s.combat.playerTimerMs = st.attackIntervalMs; // Angriff DIESES Ticks fällig
    s.combat.enemyTimerMs = 0;
    combatStep(s, c);
    const miss = s.combat.log.find((e) => e.kind === "miss" && e.by === "player");
    expect(miss).toBeTruthy();
    expect(miss!.missReason).toBe("shock");
    // Der Aussetzer ersetzt den Schlag komplett — kein Treffer im selben Tick.
    expect(s.combat.log.some((e) => e.by === "player" && (e.kind === "hit" || e.kind === "crit"))).toBe(false);
  });

  it("Schock am GEGNER (Symmetrie): fälliger Gegner-Angriff setzt aus → miss by enemy mit missReason shock", () => {
    const monster = dummy("tt_dram_shocke_mob", { attackIntervalMs: 1000 });
    const { s, c } = setup(monster, [], 15);
    s.combat.enemyEffects.push({ type: "shock", remainingMs: 5000, magnitude: 1 });
    s.combat.playerTimerMs = 0;
    s.combat.enemyTimerMs = monster.attackIntervalMs; // Gegner-Angriff fällig
    combatStep(s, c);
    const miss = s.combat.log.find((e) => e.kind === "miss" && e.by === "enemy");
    expect(miss).toBeTruthy();
    expect(miss!.missReason).toBe("shock");
  });

  it("Leder-Dodge: ausgewichener Gegner-Treffer loggt missReason dodge", () => {
    const monster = dummy("tt_dram_dodge_mob", { attackIntervalMs: 1000 });
    const { s, c, st } = setup(monster, [LEATHER], 16, undefined, LEATHER.id);
    expect(st.dodgeChance).toBeCloseTo(DODGE_CAP, 6); // Leder aktiv (Riesen-evasionRating sättigt)
    let dodge: (typeof s.combat.log)[number] | undefined;
    for (let i = 0; i < 200 && !dodge && s.combat.monsterId !== null; i++) {
      s.combat.playerTimerMs = 0;
      s.combat.enemyTimerMs = monster.attackIntervalMs;
      combatStep(s, c);
      dodge = s.combat.log.find((e) => e.kind === "miss" && e.by === "enemy" && e.missReason === "dodge");
    }
    expect(dodge).toBeTruthy(); // 40 % je Attacke ⇒ binnen weniger Attacken
    expect(s.stats.deaths).toBe(0); // con 400 vs damage 6 — kein Tod verfälscht das Fenster
  });

  it("ECHTER Fehlschlag bleibt ohne missReason (beide Richtungen)", () => {
    // Spieler-Miss: Riesen-Evasion des Gegners ⇒ Contest-Boden 10 % ⇒ ~90 % echte Misses.
    // Gegner-Miss: accuracy 0 ⇒ Contest-Boden 10 % ⇒ ~90 % echte Misses. Kein Leder (dodge 0),
    // kein Schock — jedes miss-Event MUSS ohne missReason laufen.
    const monster = dummy("tt_dram_realmiss_mob", { evasion: 1_000_000_000, accuracy: 0, attackIntervalMs: 1000 });
    const { s, c, st } = setup(monster, [SWORD], 17, SWORD.id);
    expect(st.dodgeChance).toBe(0);
    let playerMiss: (typeof s.combat.log)[number] | undefined;
    let enemyMiss: (typeof s.combat.log)[number] | undefined;
    for (let i = 0; i < 200 && !(playerMiss && enemyMiss); i++) {
      s.combat.playerTimerMs = st.attackIntervalMs;
      s.combat.enemyTimerMs = monster.attackIntervalMs;
      combatStep(s, c);
      playerMiss ??= s.combat.log.find((e) => e.kind === "miss" && e.by === "player");
      enemyMiss ??= s.combat.log.find((e) => e.kind === "miss" && e.by === "enemy");
    }
    expect(playerMiss).toBeTruthy();
    expect(playerMiss!.missReason).toBeUndefined();
    expect(enemyMiss).toBeTruthy();
    expect(enemyMiss!.missReason).toBeUndefined();
  });
});

describe("E+ Lücke 3: Melee-Stil-Lebensraub loggt (source meleeLifesteal)", () => {
  it("gelandeter Melee-Treffer unter Max-HP: lifesteal-Event mit korrektem Betrag (Formel + Caps)", () => {
    const { s, c, st } = setup(dummy("tt_dram_ls_mob"), [SWORD], 18, SWORD.id);
    s.character.hp = st.maxHp / 2; // weit unter Max — Heilung landet voll
    s.combat.playerTimerMs = st.attackIntervalMs;
    s.combat.enemyTimerMs = 0;
    combatStep(s, c);
    const hit = s.combat.log.find((e) => e.by === "player" && (e.kind === "hit" || e.kind === "crit"));
    expect(hit).toBeTruthy(); // accuracy 200 vs evasion 0 ⇒ sicherer Treffer
    const ls = s.combat.log.find((e) => e.kind === "lifesteal");
    expect(ls).toBeTruthy(); // Kern der Regression: der Stil-Lebensraub ist nicht mehr STUMM
    expect(ls!.by).toBe("player");
    expect(ls!.source).toBe("meleeLifesteal"); // unterscheidbar vom Gear-Lifesteal (source "lifesteal")
    // Exakte Formel des (unveränderten) Heil-Pfads: min(caps, round(dmg·MELEE_LIFESTEAL·10)/10).
    const cap = Math.min(Math.round(st.maxHp * MELEE_LIFESTEAL_CAP_PCT * 10) / 10, MELEE_LIFESTEAL_CAP_ABS);
    expect(ls!.amount).toBeCloseTo(
      Math.min(cap, Math.round(hit!.amount * MELEE_LIFESTEAL * 10) / 10),
      5,
    );
    // Ohne Gear-Lifesteal (lifestealPct 0) existiert KEIN zweites lifesteal-Event.
    expect(s.combat.log.filter((e) => e.kind === "lifesteal")).toHaveLength(1);
  });

  it("Geister-Guard: bei vollen HP (Heilung 0) entsteht KEIN lifesteal-Event", () => {
    const { s, c, st } = setup(dummy("tt_dram_lsfull_mob"), [SWORD], 19, SWORD.id);
    s.character.hp = st.maxHp; // voll — der Raub verpufft, darf aber keine Zeile erzeugen
    s.combat.playerTimerMs = st.attackIntervalMs;
    s.combat.enemyTimerMs = 0;
    combatStep(s, c);
    expect(s.combat.log.some((e) => e.by === "player" && (e.kind === "hit" || e.kind === "crit"))).toBe(true);
    expect(s.combat.log.some((e) => e.kind === "lifesteal")).toBe(false);
  });

  it("Stil-Guard: Magie-Treffer erzeugt keinen Melee-Stil-Lebensraub", () => {
    const { s, c, st } = setup(dummy("tt_dram_lsmagic_mob"), [WAND], 20, WAND.id);
    s.character.hp = st.maxHp / 2;
    s.combat.playerTimerMs = st.attackIntervalMs;
    s.combat.enemyTimerMs = 0;
    combatStep(s, c);
    expect(s.combat.log.some((e) => e.by === "player" && (e.kind === "hit" || e.kind === "crit"))).toBe(true);
    expect(s.combat.log.some((e) => e.kind === "lifesteal" && e.source === "meleeLifesteal")).toBe(false);
  });
});
