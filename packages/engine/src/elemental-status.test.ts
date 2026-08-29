import { describe, expect, it } from "vitest";
import type { ContentDB, ItemDef, MonsterDef } from "@hearthforge/shared";
import {
  AETHER_WARD_ON_HIT,
  AETHER_WARD_PIERCE,
  BURN_VULNERABILITY,
  FREEZE_IMMUNITY_MS,
  FROST_FREEZE_STACKS,
  MELEE_LIFESTEAL,
  MELEE_LIFESTEAL_CAP_ABS,
  MELEE_LIFESTEAL_CAP_PCT,
  POISON_MAX_STACKS,
  POISON_REGEN_MULT,
  SHOCK_ARC_FRACTION,
  SHOCK_DELAY_CAP_MS,
  SHOCK_DELAY_MS,
  TICK_MS,
  VOID_WEAKEN,
  effectiveWeaponEffects,
  isStatusEffectType,
} from "@hearthforge/shared";
import { content } from "@hearthforge/content";
import { createGame } from "./state";
import { computeStats } from "./character";
import { applyEnemyStatus, combatStep, startCombat } from "./combat";

/**
 * Elementar-Effekte (Chef-GO 28.08.2026, design/elementar-status-konzept.md) — Regressionsschutz je
 * Element, beide Seiten (Symmetrie-Pflicht):
 *  Feuer   Glut: brennendes Ziel nimmt BURN_VULNERABILITY mehr Schaden (Treffer + DoT-Ticks).
 *  Frost   die FROST_FREEZE_STACKS-te Anwendung friert ein (ein Angriff fällt aus, missReason "frozen"),
 *          danach FREEZE_IMMUNITY_MS Immunität; Zähler verfällt, wenn Frost abläuft.
 *  Blitz   jede Anwendung verzögert den nächsten Angriff um SHOCK_DELAY_MS (Kette ≤ SHOCK_DELAY_CAP_MS,
 *          endet mit dem ausgeführten Angriff); Anwendungschance = Content-chance (CEO 28.08.); Krit mit
 *          Schock-Waffe springt über (SHOCK_ARC_FRACTION); KEIN miss shock mehr.
 *  Gift    Stapel bis POISON_MAX_STACKS (Schaden × Stapel), Regeneration/Lebensraub × POISON_REGEN_MULT.
 *  Leere   Entzug (void): entkräftetes Ziel macht VOID_WEAKEN weniger Schaden.
 *  Arkan   Resonanz = momentum auf den Arkan-Waffen (Content-Guard).
 *  Aether  Lichtsegen (lightblessing): Ward-Füllung je Zauber + Ward-Durchdringung.
 * Deterministisch: Vergleiche laufen mit demselben Seed (identische RNG-Züge, nur der Faktor unterscheidet).
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
  id: "tt_el_sword",
  name: "Elementar-Testklinge",
  type: "equipment",
  stackable: false,
  slot: "mainhand",
  weaponStyle: "melee",
  twoHanded: false,
  bonus: { meleeDamage: 25, accuracy: 200 },
};

function wand(id: string, effects: ItemDef["weaponEffects"]): ItemDef {
  return {
    id,
    name: id,
    type: "equipment",
    stackable: false,
    slot: "mainhand",
    weaponStyle: "magic",
    twoHanded: false,
    bonus: { magicDamage: 25, accuracy: 200 },
    weaponEffects: effects,
  };
}

/** Stoff-Probe: liefert einen Ward-Pool (Trinity-Feld), sonst nichts. */
const ROBE: ItemDef = {
  id: "tt_el_robe",
  name: "Elementar-Testrobe",
  type: "equipment",
  stackable: false,
  slot: "body",
  wardCapacity: 100,
};

/** Regen-Probe: flacher HP-Regen aus Ausrüstung. */
const REGEN_BODY: ItemDef = {
  id: "tt_el_regen",
  name: "Elementar-Regenweste",
  type: "equipment",
  stackable: false,
  slot: "body",
  bonus: { hpRegenPerSec: 10 },
};

function setup(monster: MonsterDef, items: ItemDef[], seed: number, mainhand?: string, body?: string) {
  const c = withMonster(withItems(content, items), monster);
  const s = createGame({ name: "E", baseAttributes: { con: 400, str: 20 } }, c, seed);
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

type LogEvent = ReturnType<typeof createGame>["combat"]["log"][number];
const playerHits = (s: ReturnType<typeof createGame>): LogEvent[] =>
  s.combat.log.filter((e) => e.by === "player" && (e.kind === "hit" || e.kind === "crit"));
const enemyHits = (s: ReturnType<typeof createGame>): LogEvent[] =>
  s.combat.log.filter((e) => e.by === "enemy" && e.kind === "hit");

// ── Feuer: Glut ──────────────────────────────────────────────────────────────────────────────

describe("Feuer — Glut (BURN_VULNERABILITY)", () => {
  function playerHitVs(burning: boolean): number {
    const { s, c, st } = setup(dummy("tt_el_ember_mob"), [SWORD], 21, SWORD.id);
    if (burning) s.combat.enemyEffects.push({ type: "burn", remainingMs: 10_000, magnitude: 0 }); // Status ohne DoT
    s.combat.playerTimerMs = st.attackIntervalMs;
    s.combat.enemyTimerMs = 0;
    combatStep(s, c);
    const hit = playerHits(s)[0];
    expect(hit).toBeTruthy();
    return hit!.amount;
  }

  it("brennender GEGNER nimmt genau ×(1+BURN_VULNERABILITY) Treffer-Schaden (gleicher Seed)", () => {
    const plain = playerHitVs(false);
    const burning = playerHitVs(true);
    expect(burning).toBe(Math.round(plain * (1 + BURN_VULNERABILITY)));
    expect(burning).toBeGreaterThan(plain);
  });

  function enemyHitOnPlayer(burning: boolean): number {
    const monster = dummy("tt_el_ember_mob2", { attackIntervalMs: 1000, damage: 100 });
    const { s, c } = setup(monster, [], 22);
    if (burning) s.combat.playerEffects.push({ type: "burn", remainingMs: 10_000, magnitude: 0 });
    s.combat.playerTimerMs = 0;
    s.combat.enemyTimerMs = monster.attackIntervalMs;
    combatStep(s, c);
    const hit = enemyHits(s)[0];
    expect(hit).toBeTruthy();
    return hit!.amount;
  }

  it("Symmetrie: brennender SPIELER nimmt ×(1+BURN_VULNERABILITY) Gegner-Schaden", () => {
    const plain = enemyHitOnPlayer(false);
    const burning = enemyHitOnPlayer(true);
    expect(burning).toBe(Math.round(plain * (1 + BURN_VULNERABILITY)));
  });

  it("Glut gilt für alle Quellen: der Brand-DoT selbst tickt ×(1+BURN_VULNERABILITY)", () => {
    const { s, c } = setup(dummy("tt_el_ember_dot"), [], 23);
    s.combat.enemyEffects.push({ type: "burn", remainingMs: 1000, magnitude: 10 });
    const before = s.combat.enemyHp;
    for (let i = 0; i < 10; i++) idleTick(s, c);
    expect(before - s.combat.enemyHp).toBeCloseTo(10 * (1 + BURN_VULNERABILITY), 5);
  });
});

// ── Frost: Einfrieren ────────────────────────────────────────────────────────────────────────

describe("Frost — dritte Anwendung friert ein, danach Immunität", () => {
  const frost = { type: "frost" as const, magnitude: 1, durationMs: 5000 };

  it("GEGNER: erst die FROST_FREEZE_STACKS-te Anwendung setzt frozen; der nächste fällige Angriff fällt aus (missReason frozen)", () => {
    const monster = dummy("tt_el_freeze_mob", { attackIntervalMs: 1000 });
    const { s, c } = setup(monster, [], 31);
    for (let i = 1; i < FROST_FREEZE_STACKS; i++) {
      applyEnemyStatus(s, monster, frost);
      expect(s.combat.elemental?.enemy.frozen).toBe(false);
    }
    applyEnemyStatus(s, monster, frost);
    const ec = s.combat.elemental!.enemy;
    expect(ec.frozen).toBe(true);
    expect(ec.frostStacks).toBe(0);
    expect(ec.freezeImmunityMs).toBe(FREEZE_IMMUNITY_MS);
    // Fälliger Gegner-Angriff: fällt aus, kein Treffer, Log unterscheidbar vom echten Fehlschlag.
    s.combat.playerTimerMs = 0;
    s.combat.enemyTimerMs = monster.attackIntervalMs;
    combatStep(s, c);
    expect(enemyHits(s)).toHaveLength(0);
    const miss = s.combat.log.find((e) => e.kind === "miss" && e.by === "enemy");
    expect(miss?.missReason).toBe("frozen");
    expect(ec.frozen).toBe(false); // genau EIN Angriff
    // Immun: weitere Anwendungen zählen nicht.
    for (let i = 0; i < FROST_FREEZE_STACKS; i++) applyEnemyStatus(s, monster, frost);
    expect(ec.frozen).toBe(false);
    expect(ec.frostStacks).toBe(0);
    // Nach Ablauf der Immunität friert eine neue Dreierkette wieder ein.
    for (let i = 0; i < FREEZE_IMMUNITY_MS / 100; i++) idleTick(s, c);
    expect(ec.freezeImmunityMs).toBe(0);
    for (let i = 0; i < FROST_FREEZE_STACKS; i++) applyEnemyStatus(s, monster, frost);
    expect(ec.frozen).toBe(true);
  });

  it("Zähler verfällt, sobald der Frost abläuft (Anwendungen müssen in Folge fallen)", () => {
    const monster = dummy("tt_el_freeze_reset");
    const { s, c } = setup(monster, [], 32);
    applyEnemyStatus(s, monster, { type: "frost", magnitude: 1, durationMs: 300 });
    applyEnemyStatus(s, monster, { type: "frost", magnitude: 1, durationMs: 300 });
    expect(s.combat.elemental?.enemy.frostStacks).toBe(2);
    for (let i = 0; i < 3; i++) idleTick(s, c); // Frost läuft aus
    expect(s.combat.enemyEffects.some((e) => e.type === "frost")).toBe(false);
    expect(s.combat.elemental?.enemy.frostStacks).toBe(0);
    applyEnemyStatus(s, monster, frost);
    expect(s.combat.elemental?.enemy.frostStacks).toBe(1);
    expect(s.combat.elemental?.enemy.frozen).toBe(false);
  });

  it("Symmetrie: drei Frost-Treffer eines Monsters frieren den SPIELER ein — sein fälliger Angriff fällt aus", () => {
    const monster = dummy("tt_el_freeze_player", {
      attackIntervalMs: 1000,
      inflict: { type: "frost", chance: 1, magnitude: 1, durationMs: 8000 },
    });
    const { s, c, st } = setup(monster, [SWORD], 33, SWORD.id);
    for (let i = 0; i < FROST_FREEZE_STACKS; i++) {
      s.combat.playerTimerMs = 0;
      s.combat.enemyTimerMs = monster.attackIntervalMs;
      combatStep(s, c);
    }
    expect(enemyHits(s).length).toBe(FROST_FREEZE_STACKS); // alle drei Treffer gelandet (Riesen-Accuracy)
    expect(s.combat.elemental?.player.frozen).toBe(true);
    s.combat.playerTimerMs = st.attackIntervalMs;
    s.combat.enemyTimerMs = 0;
    combatStep(s, c);
    expect(playerHits(s)).toHaveLength(0);
    expect(s.combat.log.some((e) => e.by === "player" && e.kind === "miss" && e.missReason === "frozen")).toBe(true);
    expect(s.combat.elemental?.player.frozen).toBe(false);
  });
});

// ── Blitz: Verzögerung, Kette, Anwendungschance, Überspringen ────────────────────────────────

describe("Blitz — jede Anwendung verzögert den nächsten Angriff (Kette ≤ SHOCK_DELAY_CAP_MS)", () => {
  const shock = { type: "shock" as const, magnitude: 1, durationMs: 5000 };

  it("GEGNER: Timer −SHOCK_DELAY_MS je Anwendung, status-Log mit amount = ms, Deckel je Kette, Reset mit dem ausgeführten Angriff", () => {
    const monster = dummy("tt_el_shock_mob", { attackIntervalMs: 3000 });
    const { s, c } = setup(monster, [], 41);
    s.combat.enemyTimerMs = 1000;
    applyEnemyStatus(s, monster, shock);
    expect(s.combat.enemyTimerMs).toBe(1000 - SHOCK_DELAY_MS);
    const delayLogs = () => s.combat.log.filter((e) => e.kind === "status" && e.status === "shock");
    expect(delayLogs()).toHaveLength(1);
    expect(delayLogs()[0]!.by).toBe("player");
    expect(delayLogs()[0]!.amount).toBe(SHOCK_DELAY_MS);
    // Kette bis zum Deckel — darüber hinaus keine weitere Verzögerung und keine weitere Zeile.
    const links = SHOCK_DELAY_CAP_MS / SHOCK_DELAY_MS;
    for (let i = 1; i < links; i++) applyEnemyStatus(s, monster, shock);
    expect(s.combat.enemyTimerMs).toBe(1000 - SHOCK_DELAY_CAP_MS);
    expect(s.combat.elemental?.enemy.shockDelayMs).toBe(SHOCK_DELAY_CAP_MS);
    applyEnemyStatus(s, monster, shock);
    expect(s.combat.enemyTimerMs).toBe(1000 - SHOCK_DELAY_CAP_MS);
    expect(delayLogs()).toHaveLength(links);
    // Der fällige Angriff beendet die Kette; danach verzögert eine neue Anwendung wieder.
    s.combat.playerTimerMs = 0;
    s.combat.enemyTimerMs = monster.attackIntervalMs;
    combatStep(s, c);
    expect(enemyHits(s)).toHaveLength(1);
    expect(s.combat.elemental?.enemy.shockDelayMs).toBe(0);
    const t0 = s.combat.enemyTimerMs;
    applyEnemyStatus(s, monster, shock);
    expect(s.combat.enemyTimerMs).toBe(t0 - SHOCK_DELAY_MS);
    // Die alte Aussetz-Semantik ist tot: nie ein miss mit missReason shock.
    for (let i = 0; i < 40; i++) combatStep(s, c);
    expect(s.combat.log.some((e) => e.kind === "miss" && e.missReason === "shock")).toBe(false);
  });

  it("Symmetrie: Monster-Schock verzögert den SPIELER-Timer; Anwendungschance ist die chance (magnitude 0 ⇒ trotzdem)", () => {
    const monster = dummy("tt_el_shock_player", {
      attackIntervalMs: 1000,
      inflict: { type: "shock", chance: 1, magnitude: 0, durationMs: 5000 },
    });
    const { s, c, st } = setup(monster, [], 42);
    s.combat.playerTimerMs = 0;
    s.combat.enemyTimerMs = monster.attackIntervalMs;
    combatStep(s, c);
    expect(enemyHits(s)).toHaveLength(1);
    expect(s.combat.playerEffects.some((e) => e.type === "shock")).toBe(true);
    // Zauberreserve und Weisheit (Chef-GO 28.08.2026): der Weisheits-Status-Widerstand des Spielers
    // (Basis-WIS 3 ⇒ 3 %) kürzt die Verzögerung × (1 − r); die Spec pinnt das in spell-reserve.test.ts.
    const delay = Math.round(SHOCK_DELAY_MS * (1 - st.statusResist));
    expect(st.statusResist).toBeGreaterThan(0);
    // Der Spieler-Timer hat in diesem Tick bereits +TICK_MS gesammelt (Spieler-Zweig läuft vor dem Gegner-Zweig).
    expect(s.combat.playerTimerMs).toBe(TICK_MS - delay);
    const ev = s.combat.log.find((e) => e.kind === "status" && e.status === "shock");
    expect(ev?.by).toBe("enemy");
    expect(ev?.amount).toBe(delay);
  });

  function castOnce(effects: ItemDef["weaponEffects"], seed: number) {
    const w = wand("tt_el_shockwand_" + seed, effects);
    const { s, c, st } = setup(dummy("tt_el_shock_cast_" + seed), [w], seed, w.id);
    expect(st.style).toBe("magic");
    s.combat.playerTimerMs = st.attackIntervalMs;
    s.combat.enemyTimerMs = 0;
    combatStep(s, c);
    return s;
  }

  it("Waffen-Proc: chance 1 wendet Schock an (magnitude egal), chance 0 nie (CEO 28.08.: chance zaehlt wie bei allen Status)", () => {
    const always = castOnce([{ type: "shock", chance: 1, magnitude: 0, durationMs: 4000 }], 43);
    expect(playerHits(always)).toHaveLength(1);
    expect(always.combat.enemyEffects.some((e) => e.type === "shock")).toBe(true);
    const never = castOnce([{ type: "shock", chance: 0, magnitude: 1, durationMs: 4000 }], 43);
    expect(playerHits(never)).toHaveLength(1);
    expect(never.combat.enemyEffects.some((e) => e.type === "shock")).toBe(false);
  });

  it("Überspringen: Krit mit Schock-Waffe trifft ein zweites Mal für SHOCK_ARC_FRACTION (zweite Treffer-Zeile, HP-Abzug)", () => {
    const withShock = castOnce(
      [
        { type: "shock", chance: 1, magnitude: 1, durationMs: 4000 },
        { type: "eagleEye", chance: 1, magnitude: 0, durationMs: 0 }, // erster Treffer = garantierter Krit
      ],
      44,
    );
    const hits = playerHits(withShock);
    expect(hits).toHaveLength(2);
    expect(hits[0]!.kind).toBe("crit");
    expect(hits[1]!.kind).toBe("hit");
    expect(hits[1]!.amount).toBe(Math.max(1, Math.round(hits[0]!.amount * SHOCK_ARC_FRACTION)));
    expect(5_000_000 - withShock.combat.enemyHp).toBeCloseTo(hits[0]!.amount + hits[1]!.amount, 5);
    // review-1.2.0 P2 (29.08.2026): der Überspring-Treffer trägt sein eigenes Log-Merkmal (kein nacktes zweites "hit"),
    // der Haupttreffer nicht.
    expect(hits[0]!.hitKind).toBeUndefined();
    expect(hits[1]!.hitKind).toBe("shockArc");
    // Ohne Schock-Status auf der Waffe springt nichts über.
    const noShock = castOnce([{ type: "eagleEye", chance: 1, magnitude: 0, durationMs: 0 }], 44);
    expect(playerHits(noShock)).toHaveLength(1);
    expect(noShock.combat.log.some((e) => e.hitKind === "shockArc")).toBe(false);
  });
});

// ── Gift: Stapel, halbierter Unterhalt ───────────────────────────────────────────────────────

describe("Gift — Stapel bis POISON_MAX_STACKS, Regeneration und Lebensraub halbiert", () => {
  const poison = { type: "poison" as const, magnitude: 10, durationMs: 5000 };

  it("GEGNER: drei Anwendungen = 3 Stapel = dreifacher Tick-Schaden; Deckel POISON_MAX_STACKS; Stapel-Zeilen tragen die Stapelzahl", () => {
    const monster = dummy("tt_el_poison_mob");
    const { s, c } = setup(monster, [], 51);
    for (let i = 0; i < 3; i++) applyEnemyStatus(s, monster, poison);
    expect(s.combat.elemental?.enemy.poisonStacks).toBe(3);
    const before = s.combat.enemyHp;
    for (let i = 0; i < 10; i++) idleTick(s, c);
    expect(before - s.combat.enemyHp).toBeCloseTo(10 * 3, 5);
    for (let i = 0; i < POISON_MAX_STACKS + 2; i++) applyEnemyStatus(s, monster, poison);
    expect(s.combat.elemental?.enemy.poisonStacks).toBe(POISON_MAX_STACKS);
    const stackLines = s.combat.log.filter((e) => e.kind === "status" && e.status === "poison").map((e) => e.amount);
    expect(stackLines).toEqual([0, 2, 3, 4, 5]); // Erst-Anwendung 0, dann je neuer Stapel seine Zahl, am Deckel nichts mehr
    // Stapel verfallen mit dem Gift.
    s.combat.enemyEffects = s.combat.enemyEffects.filter((e) => e.type !== "poison");
    idleTick(s, c);
    expect(s.combat.elemental?.enemy.poisonStacks).toBe(0);
  });

  it("Alt-Save-Toleranz: ein Gift-Status ohne Zähler tickt als EIN Stapel", () => {
    const { s, c } = setup(dummy("tt_el_poison_legacy"), [], 52);
    s.combat.playerEffects.push({ type: "poison", remainingMs: 3000, magnitude: 8 });
    const hp0 = s.character.hp;
    for (let i = 0; i < 10; i++) idleTick(s, c);
    expect(hp0 - s.character.hp).toBeCloseTo(8, 5);
  });

  it("GEGNER-Regeneration × POISON_REGEN_MULT, solange Gift liegt", () => {
    function regained(poisoned: boolean): number {
      const monster = dummy("tt_el_poison_regen", { regen: 10 });
      const { s, c } = setup(monster, [], 53);
      s.combat.enemyHp = monster.maxHp - 1000;
      if (poisoned) applyEnemyStatus(s, monster, { type: "poison", magnitude: 0, durationMs: 5000 });
      const before = s.combat.enemyHp;
      for (let i = 0; i < 10; i++) idleTick(s, c);
      return s.combat.enemyHp - before;
    }
    expect(regained(false)).toBeCloseTo(10, 5);
    expect(regained(true)).toBeCloseTo(10 * POISON_REGEN_MULT, 5);
  });

  it("Symmetrie: vergifteter SPIELER regeneriert halb (Gear-Regen) und raubt halb (Melee-Lebensraub)", () => {
    function regen(poisoned: boolean): number {
      const { s, c, st } = setup(dummy("tt_el_poison_pregen"), [REGEN_BODY], 54, undefined, REGEN_BODY.id);
      expect(st.hpRegenPerSec).toBe(10);
      s.character.hp = st.maxHp - 100;
      if (poisoned) s.combat.playerEffects.push({ type: "poison", remainingMs: 5000, magnitude: 0 });
      const hp0 = s.character.hp;
      for (let i = 0; i < 10; i++) idleTick(s, c);
      return s.character.hp - hp0;
    }
    expect(regen(false)).toBeCloseTo(10, 5);
    expect(regen(true)).toBeCloseTo(10 * POISON_REGEN_MULT, 5);

    function lifesteal(poisoned: boolean): { heal: number; dmg: number; maxHp: number } {
      const { s, c, st } = setup(dummy("tt_el_poison_ls"), [SWORD], 55, SWORD.id);
      s.character.hp = st.maxHp - 50;
      if (poisoned) s.combat.playerEffects.push({ type: "poison", remainingMs: 5000, magnitude: 0 });
      s.combat.playerTimerMs = st.attackIntervalMs;
      s.combat.enemyTimerMs = 0;
      combatStep(s, c);
      const hit = playerHits(s)[0]!;
      const ls = s.combat.log.find((e) => e.kind === "lifesteal" && e.source === "meleeLifesteal");
      return { heal: ls?.amount ?? 0, dmg: hit.amount, maxHp: st.maxHp };
    }
    const plain = lifesteal(false);
    const sick = lifesteal(true);
    expect(sick.dmg).toBe(plain.dmg); // gleicher Seed, gleicher Treffer
    const cap = Math.min(Math.round(plain.maxHp * MELEE_LIFESTEAL_CAP_PCT * 10) / 10, MELEE_LIFESTEAL_CAP_ABS);
    expect(plain.heal).toBeCloseTo(Math.min(cap, Math.round(plain.dmg * MELEE_LIFESTEAL * 10) / 10), 5);
    // Halbierung des TATSÄCHLICHEN Raubs (nach dem Deckel) — sonst bliebe sie am Deckel unsichtbar.
    expect(sick.heal).toBeCloseTo(Math.round(plain.heal * POISON_REGEN_MULT * 10) / 10, 5);
    expect(sick.heal).toBeLessThan(plain.heal);
  });
});

// ── Leere: Entzug ────────────────────────────────────────────────────────────────────────────

describe("Leere — Entzug (void): das Ziel macht VOID_WEAKEN weniger Schaden", () => {
  it("entkräfteter SPIELER trifft ×(1−VOID_WEAKEN) (gleicher Seed)", () => {
    function hitVs(voided: boolean): number {
      const { s, c, st } = setup(dummy("tt_el_void_p"), [SWORD], 61, SWORD.id);
      if (voided) s.combat.playerEffects.push({ type: "void", remainingMs: 5000, magnitude: VOID_WEAKEN });
      s.combat.playerTimerMs = st.attackIntervalMs;
      s.combat.enemyTimerMs = 0;
      combatStep(s, c);
      return playerHits(s)[0]!.amount;
    }
    const plain = hitVs(false);
    expect(hitVs(true)).toBe(Math.max(1, Math.round(plain * (1 - VOID_WEAKEN))));
  });

  it("Symmetrie: entkräfteter GEGNER schlägt schwächer (Spanne ×(1−VOID_WEAKEN) vor dem Wurf)", () => {
    function enemyHit(voided: boolean): number {
      const monster = dummy("tt_el_void_e", { attackIntervalMs: 1000, damage: 100 });
      const { s, c } = setup(monster, [], 62);
      if (voided) applyEnemyStatus(s, monster, { type: "void", magnitude: VOID_WEAKEN, durationMs: 5000 });
      s.combat.playerTimerMs = 0;
      s.combat.enemyTimerMs = monster.attackIntervalMs;
      combatStep(s, c);
      return enemyHits(s)[0]!.amount;
    }
    const plain = enemyHit(false);
    const weak = enemyHit(true);
    expect(weak).toBeLessThan(plain);
    expect(weak).toBeGreaterThanOrEqual(Math.floor(plain * (1 - VOID_WEAKEN)) - 1);
    expect(weak).toBeLessThanOrEqual(Math.ceil(plain * (1 - VOID_WEAKEN)) + 1);
  });

  it("void ist ein Status-Typ (Waffen-Proc-Pfad) und wird bei Erst-Anwendung geloggt", () => {
    expect(isStatusEffectType("void")).toBe(true);
    const monster = dummy("tt_el_void_log");
    const { s } = setup(monster, [], 63);
    applyEnemyStatus(s, monster, { type: "void", magnitude: VOID_WEAKEN, durationMs: 5000 });
    expect(s.combat.log.some((e) => e.kind === "status" && e.status === "void" && e.by === "player")).toBe(true);
  });
});

// ── Aether: Lichtsegen ───────────────────────────────────────────────────────────────────────

describe("Aether — Lichtsegen (lightblessing): Ward-Füllung je Zauber, Ward-Durchdringung", () => {
  const LIGHT = { type: "lightblessing" as const, chance: 1, magnitude: AETHER_WARD_ON_HIT, durationMs: 0 }; // 0,02 seit Balance-Audit 28.08.
  /** Treffer-Ereignisse mit Lichtsegen-Annotation (review-1.2.0 P2: `wardRestored` am Treffer, kein eigenes Status-Ereignis). */
  const blessedHits = (s: ReturnType<typeof createGame>): LogEvent[] => playerHits(s).filter((e) => (e.wardRestored ?? 0) > 0);

  function castWith(effects: ItemDef["weaponEffects"], monster: MonsterDef, seed: number, mana = Infinity) {
    const w = wand("tt_el_lightwand_" + (effects?.length ?? 0), effects);
    const { s, c, st } = setup(monster, [w, ROBE], seed, w.id, ROBE.id);
    expect(st.maxWard).toBeGreaterThan(0);
    if (Number.isFinite(mana)) s.character.mana = mana;
    s.character.ward = 0;
    s.combat.playerTimerMs = st.attackIntervalMs;
    s.combat.enemyTimerMs = 0;
    combatStep(s, c);
    return { s, st };
  }

  it("jeder gelandete Zauber füllt magnitude × maxWard des eigenen Wards (zusätzlich zum Cast-Recharge)", () => {
    const monster = dummy("tt_el_light_fill");
    const plain = castWith([], monster, 71);
    const blessed = castWith([LIGHT], monster, 71);
    expect(playerHits(plain.s)).toHaveLength(1);
    expect(playerHits(blessed.s)).toHaveLength(1);
    expect(blessed.s.character.ward - plain.s.character.ward).toBeCloseTo(AETHER_WARD_ON_HIT * blessed.st.maxWard, 5);
    // review-1.2.0 P2 (29.08.2026): der Treffer trägt den tatsächlich aufgefüllten Ward als Annotation
    // `wardRestored` (1 Dezimale); ohne Segen fehlt das Feld. Kein eigenes Status-Ereignis im Protokoll.
    expect(blessedHits(plain.s)).toHaveLength(0);
    expect(plain.s.combat.log.some((e) => e.kind === "status")).toBe(false);
    expect(blessed.s.combat.log.some((e) => e.kind === "status")).toBe(false);
    const ev = blessedHits(blessed.s);
    expect(ev).toHaveLength(1);
    expect(ev[0]!.wardRestored).toBeCloseTo(Math.round(AETHER_WARD_ON_HIT * blessed.st.maxWard * 10) / 10, 5);
  });

  it("bei vollem Ward KEINE Lichtsegen-Angabe am Treffer (keine Geister-Angaben); der Ward bleibt gedeckelt", () => {
    const monster = dummy("tt_el_light_full");
    const w = wand("tt_el_lightwand_full", [LIGHT]);
    const { s, c, st } = setup(monster, [w, ROBE], 74, w.id, ROBE.id);
    s.character.ward = st.maxWard;
    s.combat.playerTimerMs = st.attackIntervalMs;
    s.combat.enemyTimerMs = 0;
    combatStep(s, c);
    expect(playerHits(s)).toHaveLength(1);
    expect(s.character.ward).toBe(st.maxWard);
    expect(blessedHits(s)).toHaveLength(0);
    expect(playerHits(s)[0]!.wardRestored).toBeUndefined();
  });

  it("Lichtsegen greift auch bei mana 0 im Save (Zauberreserve 28.08.2026: jeder Magie-Angriff ist ein Zauber, kein schwacher Stabschlag mehr)", () => {
    const monster = dummy("tt_el_light_nomana");
    const plain = castWith([], monster, 72, 0);
    const blessed = castWith([LIGHT], monster, 72, 0);
    expect(playerHits(blessed.s)).toHaveLength(1);
    expect(blessed.s.character.ward - plain.s.character.ward).toBeCloseTo(AETHER_WARD_ON_HIT * blessed.st.maxWard, 5);
  });

  it("Treffer durchdringen AETHER_WARD_PIERCE des Gegner-Wards (Ward-Gegner nimmt HP-Schaden, ohne den Segen nicht)", () => {
    const monster = dummy("tt_el_light_pierce", { wardCapacity: 100_000 });
    const plain = castWith([], monster, 73);
    const blessed = castWith([LIGHT], monster, 73);
    const plainHit = playerHits(plain.s)[0]!;
    const blessedHit = playerHits(blessed.s)[0]!;
    expect(plainHit.absorbed).toBeGreaterThan(0);
    expect(plainHit.amount).toBe(0); // wardBreak 0 ⇒ alles im Pool
    expect(blessedHit.absorbed).toBe(plainHit.absorbed);
    expect(blessedHit.amount).toBe(Math.round(plainHit.absorbed! * AETHER_WARD_PIERCE));
    expect(monster.maxHp - blessed.s.combat.enemyHp).toBeCloseTo(blessedHit.amount, 5);
  });
});

// ── Content-Guards: die Elementleiter trägt die Effekte wirklich ──────────────────────────────

describe("Content — Elementar-Effekte liegen auf den Leiter-Waffen", () => {
  const fx = (id: string) => {
    const item = content.items[id];
    expect(item, id).toBeTruthy();
    return effectiveWeaponEffects(item);
  };

  it("Leere-Waffen tragen Entzug (void, magnitude VOID_WEAKEN) zusätzlich zu bane/execute", () => {
    for (const id of ["blacksteel_staff", "godiron_staff", "runite_wand", "voidcaller_staff", "felmagician_rod", "drowned_choirstaff"]) {
      const v = fx(id).find((e) => e.type === "void");
      expect(v, id).toBeTruthy();
      expect(v!.magnitude).toBe(VOID_WEAKEN);
      expect(v!.chance).toBeGreaterThan(0);
      expect(v!.durationMs).toBeGreaterThan(0);
    }
  });

  it("Arkan-Waffen tragen Resonanz (momentum +2 % je Treffer, 10 Stapel)", () => {
    for (const id of ["cracked_staff", "steel_staff", "adamantium_wand", "aetherium_wand"]) {
      const m = fx(id).find((e) => e.type === "momentum");
      expect(m, id).toBeTruthy();
      expect(m!.magnitude).toBe(0.02);
      expect(m!.stacks).toBe(10);
    }
  });

  it("Aether-Waffen tragen Lichtsegen (lightblessing, magnitude AETHER_WARD_ON_HIT)", () => {
    for (const id of ["titanium_staff", "aetherium_staff", "aether_runestaff", "godspark_staff"]) {
      const l = fx(id).find((e) => e.type === "lightblessing");
      expect(l, id).toBeTruthy();
      expect(l!.magnitude).toBe(AETHER_WARD_ON_HIT);
    }
  });

  it("jeder Schock-Effekt im Content hat eine Anwendungschance 0 < magnitude ≤ 1 (magnitude ist seit den Elementar-Effekten die Proc-Chance)", () => {
    const bad: string[] = [];
    const check = (owner: string, e: { type: string; magnitude: number } | undefined) => {
      if (e && e.type === "shock" && !(e.magnitude > 0 && e.magnitude <= 1)) bad.push(`${owner}: ${e.magnitude}`);
    };
    for (const it of Object.values(content.items)) for (const e of effectiveWeaponEffects(it)) check(it.id, e);
    for (const m of Object.values(content.monsters)) check(m.id, m.inflict);
    for (const a of Object.values(content.affixes ?? {})) {
      for (const e of a.weaponEffectByTier ?? []) check(a.id, e);
    }
    expect(bad).toEqual([]);
  });
});
