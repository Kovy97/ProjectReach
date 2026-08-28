import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type {
  ContentDB,
  GameState,
  ItemDef,
  MonsterDef,
  WeaponEffect,
} from "@hearthforge/shared";
import { KILL_COOLDOWN_MS } from "@hearthforge/shared";
import { createGame } from "./state";
import { computeStats } from "./character";
import { combatStep, startCombat, stopCombat } from "./combat";
import { advance } from "./tick";
import { xpForLevel } from "./leveling";

/**
 * Guard-Tests der Spezial-Effekt-Familien (Waffen 2.0, design/itemization-parity-fix.md §2.1) —
 * CONTENT-UNABHÄNGIG mit synthetischen Items: jede Familie beweist, dass die Wirkung (a) FEUERT
 * und (b) NICHT DOPPELT zündet (Once-Only-/Cap-/Consume-Semantik, §2.3.4). Erwartungswerte werden
 * aus computeStats abgeleitet (min==max-Waffen ⇒ deterministische NON-Crit-Treffer; Anti-Krit-
 * Offhand drückt critChance auf 0). Kampf-Skills sind auf L60 eingefroren (Monster-L5 ⇒ Offensiv-
 * XP-Faktor 0 ⇒ keine Attribut-/Level-Drift während der Messung).
 */

const FROZEN_SKILLS = ["attack", "power", "defence", "vitality", "ranged", "magic", "warding"];

function eff(type: WeaponEffect["type"], over: Partial<WeaponEffect> = {}): WeaponEffect {
  return { type, chance: 1, magnitude: 0, durationMs: 0, ...over };
}

function dummy(over: Partial<MonsterDef> = {}): MonsterDef {
  return {
    id: "fx_dummy",
    name: "Trainingspuppe",
    level: 5,
    maxHp: 100_000,
    damage: 0.1,
    accuracy: 0,
    evasion: 0,
    defense: 0,
    attackIntervalMs: 9_999_999,
    xp: 0,
    gold: 0,
    loot: [],
    ...over,
  };
}

const NOCRIT: ItemDef = {
  id: "fx_nocrit",
  name: "Anti-Krit-Buckler",
  type: "equipment",
  stackable: false,
  slot: "offhand",
  bonus: { critChance: -1 },
};

function meleeWeapon(effects: WeaponEffect[], over: Partial<ItemDef> = {}): ItemDef {
  return {
    id: "fx_weapon",
    name: "FX-Klinge",
    type: "equipment",
    stackable: false,
    slot: "mainhand",
    weaponStyle: "melee",
    weaponType: "sword",
    damageMin: 99,
    damageMax: 99,
    attackIntervalMs: 1000,
    weaponEffects: effects,
    ...over,
  };
}

function withContent(items: ItemDef[], monsters: MonsterDef[] = [dummy()]): ContentDB {
  const c: ContentDB = { ...content, items: { ...content.items }, monsters: { ...content.monsters } };
  for (const i of [...items, NOCRIT]) c.items[i.id] = i;
  for (const m of monsters) c.monsters[m.id] = m;
  return c;
}

/** Frischer Kampf: Skills eingefroren, Waffe/Offhand gesetzt, HP voll, Kampf gestartet. */
function newFight(
  c: ContentDB,
  weaponId: string | null,
  opts: { monsterId?: string; seed?: number } = {},
): GameState {
  const s = createGame({ name: "FX" }, c, opts.seed ?? 7);
  for (const id of FROZEN_SKILLS) s.skills[id] = { xp: xpForLevel(60) };
  s.character.equipment.mainhand = weaponId;
  s.character.equipment.offhand = "fx_nocrit";
  s.character.hp = computeStats(s, c).maxHp;
  startCombat(s, c, opts.monsterId ?? "fx_dummy");
  return s;
}

function playerHits(s: GameState): Array<{ kind: string; amount: number }> {
  return s.combat.log
    .filter((e) => e.by === "player" && (e.kind === "hit" || e.kind === "crit"))
    .map((e) => ({ kind: e.kind, amount: e.amount }));
}

/** Deterministischer NON-Crit-Basistreffer der ausgerüsteten min==max-Waffe. */
function baseHit(s: GameState, c: ContentDB): number {
  return Math.round(computeStats(s, c).attackDamageMin);
}

// ── Familie 1: KONDITIONALE Schadens-Mods (multiplikativ auf den Einzelschlag) ──

describe("Effekt-Familie: konditionale Schadens-Mods (§2.1/§2.3.3)", () => {
  it("execute: +25 % nur unter der Ziel-HP-Schwelle — bei vollem Ziel Basisschaden", () => {
    const c = withContent([meleeWeapon([eff("execute", { magnitude: 0.25, threshold: 0.2 })])]);
    const low = newFight(c, "fx_weapon");
    const b = baseHit(low, c);
    low.combat.enemyHp = 10_000; // < 20 % von 100 000
    advance(low, c, 900);
    expect(playerHits(low)[0]).toEqual({ kind: "hit", amount: Math.round(b * 1.25) });

    const full = newFight(c, "fx_weapon");
    advance(full, c, 900);
    expect(playerHits(full)[0]).toEqual({ kind: "hit", amount: b }); // Bedingung gated wirklich
  });

  it("giantSlayer: +15 % nur gegen Monster ÜBER dem eigenen Kampf-Niveau", () => {
    const c = withContent(
      [meleeWeapon([eff("giantSlayer", { magnitude: 0.15 })])],
      [dummy({ id: "fx_giant", level: 99 }), dummy({ id: "fx_weak", level: 1 })],
    );
    const vsGiant = newFight(c, "fx_weapon", { monsterId: "fx_giant" });
    const b = baseHit(vsGiant, c);
    advance(vsGiant, c, 900);
    expect(playerHits(vsGiant)[0]!.amount).toBe(Math.round(b * 1.15));

    const vsWeak = newFight(c, "fx_weapon", { monsterId: "fx_weak" });
    advance(vsWeak, c, 900);
    expect(playerHits(vsWeak)[0]!.amount).toBe(b);
  });

  it("desperation: +30 % nur unter der eigenen HP-Schwelle", () => {
    const c = withContent([meleeWeapon([eff("desperation", { magnitude: 0.3, threshold: 0.3 })])]);
    const hurt = newFight(c, "fx_weapon");
    const b = baseHit(hurt, c);
    hurt.character.hp = 1;
    advance(hurt, c, 900);
    expect(playerHits(hurt)[0]!.amount).toBe(Math.round(b * 1.3));

    const healthy = newFight(c, "fx_weapon");
    advance(healthy, c, 900);
    expect(playerHits(healthy)[0]!.amount).toBe(b);
  });

  it("bounty: +20 % nur gegen das aktive Slayer-Ziel", () => {
    const c = withContent([meleeWeapon([eff("bounty", { magnitude: 0.2 })])]);
    const tasked = newFight(c, "fx_weapon");
    const b = baseHit(tasked, c);
    tasked.slayerTask = {
      masterId: "fx_master",
      monsterId: "fx_dummy",
      isTower: false,
      required: 999,
      progress: 0,
      xpReward: 0,
      pointReward: 0,
    };
    advance(tasked, c, 900);
    expect(playerHits(tasked)[0]!.amount).toBe(Math.round(b * 1.2));

    const idle = newFight(c, "fx_weapon"); // kein Task
    advance(idle, c, 900);
    expect(playerHits(idle)[0]!.amount).toBe(b);
  });

  it("firstBlood: +25 % nur auf das unverletzte Ziel (2. Treffer wieder Basis)", () => {
    const c = withContent([meleeWeapon([eff("firstBlood", { magnitude: 0.25 })])]);
    const s = newFight(c, "fx_weapon");
    const b = baseHit(s, c);
    advance(s, c, 1700); // 2 Treffer (Intervall 800 ms)
    const hits = playerHits(s);
    expect(hits[0]!.amount).toBe(Math.round(b * 1.25));
    expect(hits[1]!.amount).toBe(b); // zündet nicht doppelt
  });

  it("frostbite: +25 % nur gegen verlangsamte Ziele (Frost liegt erst NACH Treffer 1 an)", () => {
    const c = withContent([
      meleeWeapon([
        eff("frost", { chance: 1, magnitude: 0, durationMs: 8_000 }),
        eff("frostbite", { magnitude: 0.25 }),
      ]),
    ]);
    const s = newFight(c, "fx_weapon");
    const b = baseHit(s, c);
    advance(s, c, 1700);
    const hits = playerHits(s);
    expect(hits[0]!.amount).toBe(b); // noch kein Frost auf dem Ziel
    expect(hits[1]!.amount).toBe(Math.round(b * 1.25)); // jetzt verlangsamt → Bonus
  });

  it("surplus: +20 % Zauberschaden nur über der WARD-Schwelle (Zauberreserve 28.08.2026: liest den eigenen Ward vor dem Cast-Recharge)", () => {
    const surplusRobe: ItemDef = {
      id: "fx_surplus_robe",
      name: "FX-Stoffrobe",
      type: "equipment",
      stackable: false,
      slot: "body",
      wardCapacity: 1000,
    };
    const c = withContent([
      meleeWeapon([eff("surplus", { magnitude: 0.2, threshold: 0.8 })], {
        weaponStyle: "magic",
        weaponType: "staff",
      }),
      surplusRobe,
    ]);
    const s = newFight(c, "fx_weapon");
    s.character.equipment.body = "fx_surplus_robe"; // NACH startCombat (wie im wardSiphon-Test)
    const st = computeStats(s, c);
    const b = Math.round(st.attackDamageMin);
    s.character.ward = st.maxWard; // voll > 80 %
    advance(s, c, 900);
    expect(playerHits(s)[0]!.amount).toBe(Math.round(b * 1.2));
    s.character.ward = st.maxWard * 0.5; // unter 80 %
    advance(s, c, 800);
    expect(playerHits(s)[1]!.amount).toBe(b);
  });

  it("surplus: ohne Stoff-Pool (maxWard 0) inaktiv — Basisschaden (Zauberreserve: Mana-Anteil wäre immer 100 %)", () => {
    const c = withContent([
      meleeWeapon([eff("surplus", { magnitude: 0.2, threshold: 0.8 })], {
        weaponStyle: "magic",
        weaponType: "staff",
      }),
    ]);
    const s = newFight(c, "fx_weapon");
    const st = computeStats(s, c);
    expect(st.maxWard).toBe(0);
    s.character.mana = st.maxMana; // Reserve voll — darf den Effekt NICHT mehr zünden
    advance(s, c, 900);
    expect(playerHits(s)[0]!.amount).toBe(Math.round(st.attackDamageMin));
  });

  it("vengeance: erlittener Treffer lädt GENAU EINEN Gegenschlag (+40 %) auf", () => {
    const c = withContent(
      [meleeWeapon([eff("vengeance", { magnitude: 0.4 })])],
      [dummy({ id: "fx_dummy", accuracy: 1000, attackIntervalMs: 2_500, damage: 0.1 })],
    );
    const s = newFight(c, "fx_weapon");
    const b = baseHit(s, c);
    advance(s, c, 4_000); // Spieler schlägt bei 0.8/1.6/2.4/3.2/4.0 s; Gegner trifft bei 2.5 s
    const enemyHits = s.combat.log.filter((e) => e.by === "enemy" && e.kind === "hit").length;
    expect(enemyHits).toBe(1);
    const hits = playerHits(s).map((h) => h.amount);
    // Nur der Schlag NACH dem erlittenen Treffer ist gebufft — der darauf folgende wieder Basis
    // (die Aufladung ist verbraucht, kein Doppel-Zünden).
    expect(hits).toEqual([b, b, b, Math.round(b * 1.4), b]);
  });

  it("verschiedene Kinds stapeln MULTIPLIKATIV auf dem Einzelschlag (§2.3.3)", () => {
    const c = withContent([
      meleeWeapon([
        eff("execute", { magnitude: 0.25, threshold: 0.2 }),
        eff("desperation", { magnitude: 0.3, threshold: 0.3 }),
      ]),
    ]);
    const s = newFight(c, "fx_weapon");
    const b = baseHit(s, c);
    s.combat.enemyHp = 10_000;
    s.character.hp = 1;
    advance(s, c, 900);
    expect(playerHits(s)[0]!.amount).toBe(Math.round(b * 1.25 * 1.3));
  });
});

// ── Familie 2: TRANSIENTE ZÄHLER (momentum/firstStrike/eagleEye/everyNth) ──

describe("Effekt-Familie: Zähler-Effekte (§2.3.4 — Reset & Caps)", () => {
  it("momentum: +2 %/Treffer bis zum Stapel-Cap (3) — wächst nicht darüber hinaus", () => {
    const c = withContent([meleeWeapon([eff("momentum", { magnitude: 0.02, stacks: 3 })])]);
    const s = newFight(c, "fx_weapon");
    const b = baseHit(s, c);
    advance(s, c, 4_100); // 5 Treffer
    const hits = playerHits(s).map((h) => h.amount);
    expect(hits.slice(0, 5)).toEqual([
      b,
      Math.round(b * 1.02),
      Math.round(b * 1.04),
      Math.round(b * 1.06),
      Math.round(b * 1.06), // Cap: bleibt bei 3 Stapeln
    ]);
  });

  it("momentum: Stapel resetten beim Gegnerwechsel (Kill → Respawn startet bei Basis)", () => {
    const cBase = withContent([meleeWeapon([eff("momentum", { magnitude: 0.02, stacks: 5 })])]);
    const probe = newFight(cBase, "fx_weapon");
    const b = baseHit(probe, cBase);
    // Dummy stirbt am 2. Treffer (Basis + 10 HP) → 3. Treffer ist der 1. am neuen Gegner.
    const c = withContent(
      [meleeWeapon([eff("momentum", { magnitude: 0.02, stacks: 5 })])],
      [dummy({ maxHp: b + 10 })],
    );
    const s = newFight(c, "fx_weapon");
    advance(s, c, 2 * 800 + KILL_COOLDOWN_MS + 1_000); // 2 Treffer + Cooldown + 1 Treffer
    const hits = playerHits(s).map((h) => h.amount);
    expect(hits[0]).toBe(b);
    expect(hits[1]).toBe(Math.round(b * 1.02)); // Kill-Treffer mit 1 Stapel
    expect(hits[2]).toBe(b); // neuer Gegner → Stapel 0 (Reset bei Gegnerwechsel)
  });

  it("firstStrike: der ERSTE Treffer der Begegnung ×2 — der zweite wieder Basis", () => {
    const c = withContent([meleeWeapon([eff("firstStrike")])]); // magnitude 0 ⇒ Spec-Default ×2
    const s = newFight(c, "fx_weapon");
    const b = baseHit(s, c);
    advance(s, c, 1_700);
    const hits = playerHits(s).map((h) => h.amount);
    expect(hits).toEqual([Math.round(b * 2), b]);
  });

  it("eagleEye: der erste Treffer ist garantiert kritisch — genau einmal (critChance ist 0)", () => {
    const c = withContent([meleeWeapon([eff("eagleEye")])]);
    const s = newFight(c, "fx_weapon");
    const st = computeStats(s, c);
    const critVal = Math.round(st.attackDamageMin * st.critDamage); // Krit = Mittel × critDamage (§1.3)
    advance(s, c, 1_700);
    const hits = playerHits(s);
    expect(hits[0]).toEqual({ kind: "crit", amount: critVal });
    expect(hits[1]!.kind).toBe("hit"); // Garantie verbraucht, kein Dauer-Krit
  });

  it("everyNth (n=5): genau jeder 5. Treffer schlägt doppelt", () => {
    const c = withContent([meleeWeapon([eff("everyNth", { magnitude: 1, stacks: 5 })])]);
    const s = newFight(c, "fx_weapon");
    const b = baseHit(s, c);
    advance(s, c, 4_900); // 6 Treffer
    const hits = playerHits(s).map((h) => h.amount);
    expect(hits.slice(0, 6)).toEqual([b, b, b, b, Math.round(b * 2), b]);
  });

  it("critBurst: flacher Zusatzschaden NUR bei Krits (via eagleEye erzwungen)", () => {
    const c = withContent([meleeWeapon([eff("eagleEye"), eff("critBurst", { magnitude: 10 })])]);
    const s = newFight(c, "fx_weapon");
    const st = computeStats(s, c);
    const b = Math.round(st.attackDamageMin);
    const critVal = Math.round(st.attackDamageMin * st.critDamage);
    advance(s, c, 1_700);
    const hits = playerHits(s);
    expect(hits[0]).toEqual({ kind: "crit", amount: critVal + 10 }); // Blitz obendrauf
    expect(hits[1]).toEqual({ kind: "hit", amount: b }); // NON-Crit: kein Flat
  });

  it("doubleStrike (Palette-Hook): Chance 1 ⇒ pro Angriff GENAU zwei Schläge (keine Kaskade)", () => {
    const c = withContent([meleeWeapon([eff("doubleStrike", { chance: 1 })])]);
    const s = newFight(c, "fx_weapon");
    const b = baseHit(s, c);
    advance(s, c, 900); // 1 Angriffszyklus
    expect(playerHits(s).map((h) => h.amount)).toEqual([b, b]);
    advance(s, c, 800); // 2. Zyklus
    expect(playerHits(s).length).toBe(4); // exakt 2 je Zyklus — Zweitschlag löst keinen dritten aus
  });
});

// ── Familie 3: KILL-TRIGGER ──

describe("Effekt-Familie: Kill-Trigger (§2.1)", () => {
  const KILLABLE = (over: Partial<MonsterDef> = {}) => dummy({ maxHp: 40, ...over });

  it("cooldownOnKill: Kill-Cooldown = KILL_COOLDOWN_MS − X", () => {
    // Effekt-Dauer < KILL_COOLDOWN_MS (jetzt 2000), damit ein positiver Rest-Cooldown bleibt
    // (2000 würde den gesamten Cooldown aufheben → 0-Edge, siehe Nachbar-Test unten).
    const c = withContent(
      [meleeWeapon([eff("cooldownOnKill", { durationMs: 1_000 })])],
      [KILLABLE()],
    );
    const s = newFight(c, "fx_weapon");
    let guard = 100;
    while (s.combat.kills === 0 && guard-- > 0) advance(s, c, 100);
    expect(s.combat.kills).toBe(1);
    expect(s.combat.cooldownRemainingMs).toBe(KILL_COOLDOWN_MS - 1_000);
  });

  it("cooldownOnKill == KILL_COOLDOWN_MS: Dungeon-Wellen-Wechsel bei 0-Cooldown beendet den Tick — kein Stale-Monster-Rest (Sweep6 T8-P3-2)", () => {
    // Latenter Pfad (heute content-unerreichbar: max. cooldownOnKill 2000 ms < KILL_COOLDOWN_MS):
    // drückt eine Waffe den Cooldown auf 0, rückte der Wellen-Pfad vor, aber der Rest-Tick rechnete
    // mit dem lokalen `monster` der ALTEN Welle weiter (alte Angriffswerte/maxHp gegen die neue
    // enemyHp). Die Guards prüfen jetzt `monsterId !== monster.id` statt nur `=== null`.
    const c = withContent(
      [meleeWeapon([eff("cooldownOnKill", { durationMs: KILL_COOLDOWN_MS })])],
      [
        // Welle 1: stirbt am ersten Spielerschlag; greift JEDEN Tick an (Marker: „enemy"-Events).
        dummy({ id: "fx_wave1", maxHp: 40, attackIntervalMs: 100, accuracy: 0, damage: 1 }),
        // Welle 2: Default-Dummy (Intervall 9 999 999 ms) — liefert im Kill-Tick sicher kein Event.
        dummy({ id: "fx_wave2" }),
      ],
    );
    c.dungeons = [
      ...c.dungeons,
      {
        id: "fx_dungeon",
        name: { en: "FX Dungeon", de: "FX-Dungeon" },
        requiredLevel: 0,
        keyItem: "bones",
        keysPerRun: 0,
        encounters: ["fx_wave1", "fx_wave2"],
        loot: [],
        xp: 0,
        gold: 0,
      },
    ];
    const s = newFight(c, "fx_weapon", { monsterId: "fx_wave1" });
    s.combat.dungeonId = "fx_dungeon"; // Kampf als Dungeon-Run deklarieren (Gate/Key hier irrelevant)
    s.combat.encounterIndex = 0;

    let guard = 100;
    while (s.combat.kills === 0 && guard-- > 0) combatStep(s, c);
    expect(s.combat.kills).toBe(1);

    // 0-Cooldown: Welle 2 steht sofort, ohne Cooldown/Summary …
    expect(s.combat.monsterId).toBe("fx_wave2");
    expect(s.combat.cooldownRemainingMs).toBeUndefined();
    // … und der Kill-Tick endet MIT dem Wellen-Wechsel: Welle 2 ist unberührt, und die alte Welle
    // (Intervall 100 ms = würde noch im selben Tick feuern) hat nach dem Kill NICHT mehr angegriffen.
    expect(s.combat.enemyHp).toBe(c.monsters.fx_wave2!.maxHp);
    const killSeq = s.combat.log.find((e) => e.kind === "kill")!.seq;
    expect(s.combat.log.some((e) => e.by === "enemy" && e.seq > killSeq)).toBe(false);
  });

  it("wardOnKill: +X Ward je Kill (Differenz zur effektlosen Baseline, gleiche Seed; Zauberreserve 28.08.2026: ersetzt manaOnKill)", () => {
    const killRobe: ItemDef = {
      id: "fx_kill_robe",
      name: "FX-Stoffrobe",
      type: "equipment",
      stackable: false,
      slot: "body",
      wardCapacity: 100_000, // groß genug, um nie zu deckeln (Kill-Refill 10 % läuft in beiden Läufen identisch)
    };
    const cFx = withContent([meleeWeapon([eff("wardOnKill", { magnitude: 6 })]), killRobe], [KILLABLE()]);
    const cBase = withContent([meleeWeapon([]), killRobe], [KILLABLE()]);
    const run = (c: ContentDB): number => {
      const s = newFight(c, "fx_weapon");
      s.character.equipment.body = "fx_kill_robe"; // NACH startCombat (wie im wardSiphon-Test)
      s.character.ward = 0;
      advance(s, c, 1_000);
      expect(s.combat.kills).toBe(1);
      return s.character.ward;
    };
    expect(run(cFx) - run(cBase)).toBeCloseTo(6, 6);
  });

  it("wardOnKill: No-op ohne Stoff-Pool (maxWard 0) — kein Ward-Zufluss, kein Crash", () => {
    const c = withContent([meleeWeapon([eff("wardOnKill", { magnitude: 6 })])], [KILLABLE()]);
    const s = newFight(c, "fx_weapon");
    s.character.ward = 0;
    advance(s, c, 1_000);
    expect(s.combat.kills).toBe(1);
    expect(computeStats(s, c).maxWard).toBe(0);
    expect(s.character.ward).toBe(0);
  });

  it("healOnKill: +X HP je Kill (Differenz zur Baseline, gleiche Seed)", () => {
    const cFx = withContent([meleeWeapon([eff("healOnKill", { magnitude: 4 })])], [KILLABLE()]);
    const cBase = withContent([meleeWeapon([])], [KILLABLE()]);
    const run = (c: ContentDB): number => {
      const s = newFight(c, "fx_weapon");
      s.character.hp = 5;
      advance(s, c, 1_000);
      expect(s.combat.kills).toBe(1);
      return s.character.hp;
    };
    expect(run(cFx) - run(cBase)).toBeCloseTo(4, 9);
  });

  it("luckyStrike: +15 % Gold von Kills (Rundung auf dem gestreuten Wurf)", () => {
    const cFx = withContent(
      [meleeWeapon([eff("luckyStrike", { magnitude: 0.15 })])],
      [KILLABLE({ gold: 100 })],
    );
    const cBase = withContent([meleeWeapon([])], [KILLABLE({ gold: 100 })]);
    const run = (c: ContentDB): number => {
      const s = newFight(c, "fx_weapon");
      advance(s, c, 1_000);
      expect(s.combat.kills).toBe(1);
      return s.character.gold;
    };
    const goldBase = run(cBase);
    expect(goldBase).toBeGreaterThanOrEqual(100);
    expect(run(cFx)).toBe(Math.round(goldBase * 1.15)); // identische RNG-Streuung, +15 % obendrauf
  });

  it("overkillCarry: der Überschuss des Todesstoßes trifft den Respawn (min. 1 Rest-HP)", () => {
    const c = withContent([meleeWeapon([eff("overkillCarry")])], [KILLABLE()]);
    const s = newFight(c, "fx_weapon");
    const b = baseHit(s, c); // ≫ 40 → Überschuss deckelt auf maxHp−1
    expect(b).toBeGreaterThan(40 + 1);
    advance(s, c, 1_000);
    expect(s.combat.kills).toBe(1);
    expect(s.combat.enemyHp).toBe(1); // 40 − min(Überschuss, 39) = 1
    // Übergabe ist konsumiert: der Zähler steht wieder auf 0 (kein Doppel-Carry).
    expect(s.combat.effectCounters?.overkillCarry).toBe(0);
  });

  it("plaguebearer: der nächste Gegner startet mit dem Gift der Basiswaffe", () => {
    const c = withContent(
      [
        meleeWeapon([
          eff("poison", { chance: 1, magnitude: 0.4, durationMs: 4_000 }),
          eff("plaguebearer"),
        ]),
      ],
      [KILLABLE()],
    );
    const s = newFight(c, "fx_weapon");
    advance(s, c, 1_000);
    expect(s.combat.kills).toBe(1);
    const poison = s.combat.enemyEffects.find((e) => e.type === "poison");
    expect(poison).toBeDefined();
    expect(poison!.magnitude).toBe(0.4); // Magnitude der Basiswaffe (§2.1)
    expect(s.combat.effectCounters?.plague).toBeNull(); // Übergabe konsumiert
  });
});

// ── Familie 4: RESSOURCEN & SUSTAIN ──

describe("Effekt-Familie: Ressourcen & Sustain (§2.1)", () => {
  it("ammoSaver: NO-OP seit #286 (keine Munition mehr) — kein Verbrauch, kein RNG-Draw, bit-identisch zur Baseline", () => {
    // Der Effekt-Typ bleibt im Typ erlaubt (Alt-Katalog-Duldung), aber die Engine liest ihn
    // nirgends mehr: ein Bogen MIT ammoSaver muss sich bit-identisch zu einem Bogen OHNE
    // verhalten (gleiche Seeds → gleiche Treffer/Kills, kein zusätzlicher RNG-Draw).
    const bow = (effects: WeaponEffect[]): ItemDef =>
      meleeWeapon(effects, {
        weaponStyle: "ranged",
        weaponType: "shortbow",
      });
    const run = (effects: WeaponEffect[]): { shots: number; kills: number } => {
      const c = withContent([bow(effects)]);
      const s = createGame({ name: "FX" }, c, 7);
      for (const id of FROZEN_SKILLS) s.skills[id] = { xp: xpForLevel(60) };
      s.character.equipment.mainhand = "fx_weapon";
      s.character.hp = computeStats(s, c).maxHp;
      startCombat(s, c, "fx_dummy");
      advance(s, c, 2_500); // Fernkampf-Intervall 1000 ms → 2 Schüsse
      return { shots: playerHits(s).length, kills: s.combat.kills };
    };
    const saver = run([eff("ammoSaver", { chance: 1 })]);
    const base = run([]);
    expect(saver.shots).toBeGreaterThanOrEqual(2); // der Bogen feuert (ohne jegliche Munition)
    expect(saver.shots).toBe(base.shots); // No-op: identische Sequenz (kein zusätzlicher RNG-Draw)
    expect(saver.kills).toBe(base.kills);
  });

  // manaDrain: ENTFERNT (Zauberreserve 28.08.2026) — Mana wird nicht verbraucht; Träger auf wardSiphon umgestellt.

  it("wardSiphon: 8 % des verursachten Schadens füllt den eigenen Ward-Pool (Differenz zur Baseline)", () => {
    // elite-balance-spec.md §5 / hollowveil_locket: analog Lebensraub, aber Ward statt HP.
    const wardRobe: ItemDef = {
      id: "fx_ward_robe",
      name: "FX-Stoffrobe",
      type: "equipment",
      stackable: false,
      slot: "body",
      wardCapacity: 100_000, // groß genug, um in diesem Test nie zu deckeln
    };
    const cFx = withContent([meleeWeapon([eff("wardSiphon", { magnitude: 0.08 })]), wardRobe]);
    const cBase = withContent([meleeWeapon([]), wardRobe]);
    const run = (c: ContentDB): { ward: number; hits: number; dmgPerHit: number } => {
      const s = newFight(c, "fx_weapon");
      s.character.equipment.body = "fx_ward_robe"; // NACH startCombat, wie im thorns-Test oben
      s.character.ward = 0; // isoliert den Siphon-Zufluss vom Voll-Ward-Start (startCombat)
      advance(s, c, 2_500); // 3 Treffer
      return { ward: s.character.ward, hits: playerHits(s).length, dmgPerHit: baseHit(s, c) };
    };
    const fx = run(cFx);
    const base = run(cBase);
    expect(fx.hits).toBe(base.hits);
    expect(fx.hits).toBeGreaterThanOrEqual(3);
    // Differenz zur Baseline — isoliert den Siphon-Zufluss vom
    // passiven Warding-Skill-Regen (tickWardRegen), der in BEIDEN Läufen identisch mitläuft.
    expect(fx.ward - base.ward).toBeCloseTo(fx.dmgPerHit * 0.08 * fx.hits, 6);
  });

  it("wardSiphon: No-op ohne Stoff-Pool (maxWard=0) — kein Ward-Zufluss, kein Crash", () => {
    const c = withContent([meleeWeapon([eff("wardSiphon", { magnitude: 0.08 })])]);
    const s = newFight(c, "fx_weapon");
    s.character.ward = 0;
    advance(s, c, 2_500);
    expect(computeStats(s, c).maxWard).toBe(0);
    expect(s.character.ward).toBe(0);
  });

  it("antiRegen: blutende Ziele regenerieren nicht (Gegner-HP strikt niedriger als Baseline)", () => {
    const bleed = eff("bleed", { chance: 1, magnitude: 0.1, durationMs: 60_000 });
    const mkC = (extra: WeaponEffect[]): ContentDB =>
      withContent([meleeWeapon([bleed, ...extra])], [dummy({ regen: 50 })]);
    const run = (c: ContentDB): number => {
      const s = newFight(c, "fx_weapon");
      advance(s, c, 4_000);
      return s.combat.enemyHp;
    };
    const hpAnti = run(mkC([eff("antiRegen")]));
    const hpBase = run(mkC([]));
    expect(hpAnti).toBeLessThan(hpBase); // Regen unterdrückt, solange die Blutung liegt
  });

  it("antiRegen zählt JEDEN aktiven DoT: auch BRENNENDE Ziele regenerieren nicht (Sweep6 T2-F2)", () => {
    // Vorher triggerte nur bleed|poison — skeleton_nekro (der Regen-Untote der Krypta) resistet
    // genau diese beiden, wodurch antiRegen auf der Grabstahlklinge dort nie greifen konnte.
    // burn zählt jetzt mit (die Klinge erhält parallel einen Burn-Proc, content-dev).
    const burn = eff("burn", { chance: 1, magnitude: 0.1, durationMs: 60_000 });
    const mkC = (extra: WeaponEffect[]): ContentDB =>
      withContent([meleeWeapon([burn, ...extra])], [dummy({ regen: 50 })]);
    const run = (c: ContentDB): number => {
      const s = newFight(c, "fx_weapon");
      advance(s, c, 4_000);
      return s.combat.enemyHp;
    };
    const hpAnti = run(mkC([eff("antiRegen")]));
    const hpBase = run(mkC([]));
    expect(hpAnti).toBeLessThan(hpBase); // Regen unterdrückt, solange der Brand liegt
  });

  it("gutter: eigene DoT-Ticks +50 % (Gegner-HP strikt niedriger als Baseline)", () => {
    const bleed = eff("bleed", { chance: 1, magnitude: 10, durationMs: 60_000 });
    const run = (extra: WeaponEffect[]): number => {
      const c = withContent([meleeWeapon([bleed, ...extra])]);
      const s = newFight(c, "fx_weapon");
      advance(s, c, 4_000);
      return s.combat.enemyHp;
    };
    const hpGutter = run([eff("gutter", { magnitude: 0.5 })]);
    const hpBase = run([]);
    expect(hpGutter).toBeLessThan(hpBase);
    // ~+50 % auf ~3,2 s Blutung (10/s) ⇒ Differenz in der Größenordnung 16 HP.
    expect(hpBase - hpGutter).toBeGreaterThan(10);
  });

  it("catalyst: eigene Status halten +3 s länger (burn 3 s → 6 s beim Anlegen)", () => {
    const burn = eff("burn", { chance: 1, magnitude: 1, durationMs: 3_000 });
    const firstBurnMs = (extra: WeaponEffect[]): number => {
      const c = withContent([meleeWeapon([burn, ...extra])]);
      const s = newFight(c, "fx_weapon");
      let guard = 50;
      while (s.combat.enemyEffects.length === 0 && guard-- > 0) advance(s, c, 100);
      return s.combat.enemyEffects.find((e) => e.type === "burn")!.remainingMs;
    };
    expect(firstBurnMs([eff("catalyst", { durationMs: 3_000 })])).toBe(6_000);
    expect(firstBurnMs([])).toBe(3_000);
  });

  it("thorns (Rüstungs-Chase): jeder erlittene Treffer reflektiert flachen Schaden auf den Angreifer", () => {
    const vest: ItemDef = {
      id: "fx_thorns_vest",
      name: "Dornenweste",
      type: "equipment",
      stackable: false,
      slot: "body",
      weaponEffect: eff("thorns", { magnitude: 77 }),
    };
    const c = withContent(
      [vest],
      [dummy({ accuracy: 1000, attackIntervalMs: 500, damage: 0.1 })],
    );
    const s = newFight(c, null); // unbewaffnet — thorns lebt auf der RÜSTUNG
    s.character.equipment.body = "fx_thorns_vest";
    advance(s, c, 3_000);
    const enemyHits = s.combat.log.filter((e) => e.by === "enemy" && e.kind === "hit").length;
    const thornsProcs = s.combat.log.filter(
      (e) => e.by === "player" && e.kind === "hit" && e.amount === 77,
    ).length;
    expect(enemyHits).toBeGreaterThanOrEqual(3);
    expect(thornsProcs).toBe(enemyHits); // genau 1 Reflekt je erlittenem Treffer — nie doppelt
  });

  it("Spezial-Zähler resetten bei Kampfende (stopCombat) — §2.3.4 (und werden nie persistiert: der Load-Pfad baut combat über eine Feld-Whitelist ohne effectCounters neu auf)", () => {
    const c = withContent([meleeWeapon([eff("momentum", { magnitude: 0.02, stacks: 5 })])]);
    const s = newFight(c, "fx_weapon");
    advance(s, c, 1_700); // 2 Treffer → Stapel > 0
    expect(s.combat.effectCounters?.momentumStacks).toBeGreaterThan(0);
    stopCombat(s);
    expect(s.combat.effectCounters).toBeUndefined();
  });

  it("packLeader: die Pet-Ability lädt +25 % schneller (Timer-Vergleich, deterministisch)", () => {
    const petId = Object.keys(content.pets).sort()[0]!;
    const run = (effects: WeaponEffect[]): number => {
      const c = withContent([meleeWeapon(effects)]);
      const s = newFight(c, "fx_weapon");
      s.character.ownedPets[petId] = true;
      s.character.companionPetId = petId;
      advance(s, c, 500); // 5 Ticks — weit unter jedem Ability-Intervall
      return s.combat.petAbility.timerMs;
    };
    const boosted = run([eff("packLeader", { magnitude: 0.25 })]);
    const base = run([]);
    expect(base).toBe(500);
    expect(boosted).toBe(625); // 500 × 1.25
  });
});
