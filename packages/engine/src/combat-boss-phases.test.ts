import { describe, expect, it } from "vitest";
import type { BossPhase, CombatState, ContentDB, MonsterDef } from "@hearthforge/shared";
import { createPetAbilityRuntime } from "@hearthforge/shared";
import { content } from "@hearthforge/content";
import { createGame } from "./state";
import { computeStats } from "./character";
import { combatBossPhase, combatMonsterView, combatStep, startCombat } from "./combat";

/**
 * claude:2026-10-25T06:30:00+02:00 — Bossphasen (1.4.0 Raid R4, Spec design/1.4.0-balance-raid.md §3 Regeln 1–6) mit
 * synthetischem Test-Content (die echten Raid-Bosse entstehen parallel im Content-Paket). Außerhalb des Raids sind die
 * Raid-Faktoren 1, die Phasenlogik ist dieselbe.
 */

function mob(id: string, fields: Partial<MonsterDef>): MonsterDef {
  return {
    id,
    name: { en: id, de: id },
    level: 10,
    maxHp: 10_000,
    damage: 5,
    accuracy: 100_000,
    evasion: 0,
    defense: 0,
    attackIntervalMs: 3000,
    xp: 0,
    gold: 0,
    loot: [],
    ...fields,
  } as MonsterDef;
}

const P1: BossPhase = { atHpPct: 0.75, logKey: "tp.p1", wardShieldPct: 0.12 };
const P2: BossPhase = { atHpPct: 0.5, logKey: "tp.p2", intervalRamp: { everyMs: 1000, mult: 0.5, maxStacks: 2 }, resist: ["burn"] };
const P3: BossPhase = {
  atHpPct: 0.25,
  logKey: "tp.p3",
  attackIntervalMult: 0.8,
  damageMult: 1.3,
  defense: 290,
  healPerHitPct: 0.01,
  inflict: { type: "bleed", chance: 1, magnitude: 2.5, durationMs: 6000 },
};
// Absichtlich unsortiert: die Engine wählt die tiefste erreichte Schwelle selbst.
const BOSS = mob("tp_boss", { phases: [P3, P1, P2] });
const BOSS_TWO_SHIELDS = mob("tp_boss2", {
  phases: [P1, { atHpPct: 0.5, logKey: "tp2.p2", wardShieldPct: 0.1 }],
});
const BOSS_NTH = mob("tp_nth", { phases: [{ atHpPct: 1, logKey: "nth", everyNth: { n: 2, mult: 3 } }] });
const BOSS_PLAIN_NTH = mob("tp_nth_plain", { phases: [{ atHpPct: 1, logKey: "plain" }] });
const ENRAGED_PLAIN = mob("tp_enr_plain", { enrage: { belowHpPct: 1, damageMult: 10 } });
const ENRAGED_PHASED = mob("tp_enr_phased", { enrage: { belowHpPct: 1, damageMult: 10 }, phases: [{ atHpPct: 0.01, logKey: "late" }] });

const C: ContentDB = {
  ...content,
  monsters: {
    ...content.monsters,
    [BOSS.id]: BOSS,
    [BOSS_TWO_SHIELDS.id]: BOSS_TWO_SHIELDS,
    [BOSS_NTH.id]: BOSS_NTH,
    [BOSS_PLAIN_NTH.id]: BOSS_PLAIN_NTH,
    [ENRAGED_PLAIN.id]: ENRAGED_PLAIN,
    [ENRAGED_PHASED.id]: ENRAGED_PHASED,
  },
};

/** Held mit viel CON (überlebt jeden Testschlag, One-Shot-Deckel bindet nicht), ohne Essen. */
function hero(seed = 1) {
  const s = createGame({ name: "P", baseAttributes: { con: 500 } }, C, seed);
  s.character.food = null;
  s.character.hp = computeStats(s, C).maxHp;
  return s;
}

/** Ein Tick ohne Spieler- und Gegnerangriff (Timer frisch), damit nur die Phasenlogik wirkt. */
function quietTick(s: ReturnType<typeof hero>): void {
  s.combat.playerTimerMs = 0;
  s.combat.enemyTimerMs = 0;
  combatStep(s, C);
}

function phaseEvents(s: ReturnType<typeof hero>) {
  return s.combat.log.filter((e) => e.kind === "phase").map((e) => ({ k: e.amount, key: e.phaseKey }));
}

describe("Bossphasen: Betreten, Schild, Patt-Reset (Spec §3 Regeln 1–3)", () => {
  it("Schwelle betreten: Log mit logKey, Ward-Schild in % maxHp, Patt-Zähler zurück", () => {
    const s = hero();
    expect(startCombat(s, C, BOSS.id)).toBe(true);
    quietTick(s); // volle HP ⇒ Basis
    expect(s.combat.bossPhase).toBe(0);
    s.combat.enemyHp = 7400; // < 75 %
    s.combat.enemyHpLow = 7400;
    s.combat.noProgressMs = 59_950; // ohne Reset wäre das in diesem Tick ein Patt
    quietTick(s);
    expect(phaseEvents(s)).toEqual([{ k: 1, key: "tp.p1" }]);
    expect(s.combat.bossPhase).toBe(1);
    expect(s.combat.enemyWard).toBe(1200); // 12 % von 10.000
    expect(s.combat.monsterId).toBe(BOSS.id);
    expect(s.combat.stopReason).toBeUndefined();
    expect(s.combat.noProgressMs).toBe(0);
  });

  it("Kontrolle: ohne Phasenwechsel bricht derselbe Zustand als Patt ab", () => {
    const s = hero();
    startCombat(s, C, BOSS.id);
    quietTick(s);
    s.combat.enemyHp = 9000;
    s.combat.enemyHpLow = 9000;
    s.combat.noProgressMs = 59_950;
    quietTick(s);
    expect(s.combat.monsterId).toBeNull();
    expect(s.combat.stopReason).toBe("stalemate");
  });

  it("übersprungene Schilde gelten trotzdem (kein Burst-Skip), je Phase ein Log-Eintrag", () => {
    const s = hero();
    startCombat(s, C, BOSS_TWO_SHIELDS.id);
    quietTick(s);
    s.combat.enemyHp = 4000; // 75 % und 50 % in einem Rutsch
    quietTick(s);
    expect(phaseEvents(s)).toEqual([
      { k: 1, key: "tp.p1" },
      { k: 2, key: "tp2.p2" },
    ]);
    expect(s.combat.enemyWard).toBe(2200);
    expect(s.combat.bossPhase).toBe(2);
  });

  it("Phase ist die TIEFSTE erreichte Schwelle: Heilung über die Schwelle setzt sie nicht zurück", () => {
    const s = hero();
    startCombat(s, C, BOSS.id);
    quietTick(s);
    s.combat.enemyHp = 4900;
    quietTick(s);
    expect(s.combat.bossPhase).toBe(2);
    s.combat.enemyHp = 9900; // z. B. Heilung je Treffer
    quietTick(s);
    expect(s.combat.bossPhase).toBe(2);
    expect(combatBossPhase(s, C)?.phase?.logKey).toBe("tp.p2");
  });

  it("Resistenz der neuen Phase löscht den laufenden Brand", () => {
    const s = hero();
    startCombat(s, C, BOSS.id);
    quietTick(s);
    s.combat.enemyHp = 4900;
    s.combat.enemyEffects = [{ type: "burn", remainingMs: 5000, magnitude: 0 }];
    quietTick(s);
    expect(s.combat.bossPhase).toBe(2);
    expect(s.combat.enemyEffects.some((e) => e.type === "burn")).toBe(false);
    expect(combatMonsterView(s, C)?.resist).toEqual(["burn"]);
  });
});

describe("Bossphasen: Laden mitten in Phase 3 (Regel 4)", () => {
  it("Phase wird still aus den HP abgeleitet: kein Schild, kein Log, Phasenwerte greifen sofort", () => {
    const s = hero();
    startCombat(s, C, BOSS.id);
    // Load-Pfad: `combat` wird über eine Feld-Whitelist neu gebaut, transiente Felder fehlen.
    const loaded: CombatState = {
      monsterId: BOSS.id,
      enemyHp: 2000, // 20 % ⇒ Phase 3
      playerTimerMs: 0,
      enemyTimerMs: 2350, // Phase 3: Takt 3000 × 0,8 = 2400 ⇒ schlägt in diesem Tick (Basis-Takt nicht)
      kills: 0,
      eventCount: 0,
      enemyEffects: [],
      playerEffects: [],
      log: [],
      dungeonId: null,
      encounterIndex: 0,
      petAbility: createPetAbilityRuntime(),
    };
    s.combat = loaded;
    combatStep(s, C);
    expect(s.combat.bossPhase).toBe(3);
    expect(phaseEvents(s)).toEqual([]);
    expect(s.combat.enemyWard ?? 0).toBe(0); // verbrauchte/übersprungene Schilde kommen nicht wieder
    expect(s.combat.log.some((e) => e.by === "enemy" && (e.kind === "hit" || e.kind === "miss"))).toBe(true);
    // Phasen-inflict (Blutung, Chance 1) ersetzt den (fehlenden) Basis-inflict.
    expect(s.combat.playerEffects.some((e) => e.type === "bleed")).toBe(true);
    const view = combatMonsterView(s, C)!;
    expect(view.defense).toBe(290); // absolute Phasen-Rüstung (außerhalb des Raids Faktor 1)
    expect(view.damage).toBeCloseTo(5 * 1.3, 10);
  });
});

describe("Bossphasen: Takt-Rampe, jeder n-te Angriff, Heilung je Treffer, keine Wut", () => {
  function inPhase2(bossPhaseMs: number, enemyTimerMs: number) {
    const s = hero();
    startCombat(s, C, BOSS.id);
    s.combat.enemyHp = 4000;
    s.combat.bossPhase = 2; // bereits betreten
    s.combat.bossPhaseMs = bossPhaseMs;
    s.combat.bossAttackCount = 0;
    s.combat.playerTimerMs = 0;
    s.combat.enemyTimerMs = enemyTimerMs;
    combatStep(s, C);
    return s.combat.log.some((e) => e.by === "enemy" && (e.kind === "hit" || e.kind === "miss"));
  }

  it("intervalRamp: nach 2 × everyMs Takt × 0,5² (750 ms), gedeckelt bei maxStacks", () => {
    expect(inPhase2(1900, 700)).toBe(true); // 2000 ms in der Phase ⇒ 750 ms ⇒ Angriff
    expect(inPhase2(0, 700)).toBe(false); // 100 ms ⇒ 3000 ms ⇒ kein Angriff
    expect(inPhase2(9900, 600)).toBe(false); // Deckel 2 Stufen: 750 ms, nicht 375 ms
  });

  it("everyNth: der n-te Angriff der Phase schlägt × mult (gleicher Seed, ~3-facher Schaden)", () => {
    function hitAmount(monsterId: string, count: number, seed: number): number {
      const s = hero(seed);
      startCombat(s, C, monsterId);
      s.combat.bossPhase = 1;
      s.combat.bossPhaseMs = 0;
      s.combat.bossAttackCount = count;
      s.combat.playerTimerMs = 0;
      s.combat.enemyTimerMs = 2950;
      combatStep(s, C);
      return s.combat.log.filter((e) => e.by === "enemy" && e.kind === "hit").reduce((a, e) => a + e.amount, 0);
    }
    let boosted = 0;
    let plain = 0;
    for (let seed = 1; seed <= 40; seed++) {
      boosted += hitAmount(BOSS_NTH.id, 1, seed); // zweiter Angriff ⇒ × 3
      plain += hitAmount(BOSS_NTH.id, 0, seed); // erster Angriff ⇒ × 1
    }
    expect(plain).toBeGreaterThan(0);
    expect(boosted / plain).toBeGreaterThan(2.6);
    expect(boosted / plain).toBeLessThan(3.4);
    // Phase ohne everyNth: kein Zähler.
    const s = hero(1);
    startCombat(s, C, BOSS_PLAIN_NTH.id);
    s.combat.enemyTimerMs = 2950;
    combatStep(s, C);
    expect(s.combat.bossAttackCount).toBe(0);
  });

  it("healPerHitPct: je gelandetem Treffer Anteil maxHp, Gift auf dem Boss halbiert", () => {
    function healed(poisoned: boolean): number {
      const s = hero();
      startCombat(s, C, BOSS.id);
      s.combat.enemyHp = 2000;
      s.combat.bossPhase = 3;
      s.combat.bossPhaseMs = 0;
      s.combat.playerTimerMs = 0;
      s.combat.enemyTimerMs = 2350;
      if (poisoned) s.combat.enemyEffects = [{ type: "poison", remainingMs: 5000, magnitude: 0 }];
      combatStep(s, C);
      expect(s.combat.log.some((e) => e.by === "enemy" && e.kind === "hit" && e.amount > 0)).toBe(true);
      return s.combat.enemyHp - 2000;
    }
    expect(healed(false)).toBeCloseTo(100, 6); // 1 % von 10.000
    expect(healed(true)).toBeCloseTo(50, 6);
  });

  it("Monster mit Phasen haben keine Wut (Regel 6), ohne Phasen bleibt die Wut", () => {
    function total(monsterId: string): number {
      let sum = 0;
      for (let seed = 1; seed <= 30; seed++) {
        const s = hero(seed);
        startCombat(s, C, monsterId);
        s.combat.enemyHp = 5000;
        s.combat.playerTimerMs = 0;
        s.combat.enemyTimerMs = 2950;
        combatStep(s, C);
        sum += s.combat.log.filter((e) => e.by === "enemy" && e.kind === "hit").reduce((a, e) => a + e.amount, 0);
      }
      return sum;
    }
    const enraged = total(ENRAGED_PLAIN.id);
    const phased = total(ENRAGED_PHASED.id);
    expect(phased).toBeGreaterThan(0);
    expect(enraged).toBeGreaterThan(phased * 5);
  });
});
