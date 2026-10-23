import { describe, expect, it } from "vitest";
import type { ContentDB, EquipSlot, GameState, ItemDef, MonsterDef, SetDef, SetEffectDef, WeaponStyle } from "@hearthforge/shared";
import { DEFENSE_MITIGATION_K } from "@hearthforge/shared";
import { content } from "@hearthforge/content";
import { createGame } from "./state";
import { activeSetEffects, activeSets, computeStats, countSetPieces } from "./character";
import { combatStep, startCombat } from "./combat";
import { createTestGame } from "./test-helpers";

/**
 * claude:2026-10-25T06:50:00+02:00 — Set-Stufen (1.4.0 Raid R7, Spec 1.4.0-balance-raid.md §6.1/§6.2), Varianten-Zählung (A14),
 * Hauptattribut-Schmuck (§10.5) und die Set-Effekte im Kampfpfad, mit synthetischem Test-Content. Werte der Effekte = die
 * Spezifikations-Spalte (§6.1). Zusätzlich: ohne Set bleibt der Kampf bitgleich.
 */

const ARMOR_SLOTS: EquipSlot[] = ["helmet", "body", "legs", "gloves", "boots"];

function piece(id: string, slot: EquipSlot, extra: Partial<ItemDef> = {}): ItemDef {
  return { id, name: { en: id, de: id }, type: "equipment", stackable: false, slot, ...extra } as ItemDef;
}
function pieces(prefix: string, extra: Partial<ItemDef> = {}): ItemDef[] {
  return ARMOR_SLOTS.map((slot) => piece(`${prefix}_${slot}`, slot, extra));
}

const E = {
  burnPct: { kind: "burnDamagePct", value: 0.2 },
  burnMs: { kind: "burnDurationMs", value: 2000 },
  interest: { kind: "fireInterest", perStack: 0.015, maxStacks: 8 },
  collection: { kind: "fireCollection", every: 5, value: 0.2, perStack: 0.02, wardPct: 1 },
  poisonPct: { kind: "poisonDamagePct", value: 0.2 },
  plague: { kind: "creepingPlague", maxStacks: 7, perStack: 0.01 },
  outbreak: { kind: "outbreak", value: 1, cooldownMs: 8000 },
  bleedPct: { kind: "bleedDamagePct", value: 0.2 },
  wounds: { kind: "openWounds", maxStacks: 3, value: 0.15, perStack: 0.03 },
  toll: { kind: "bloodToll", value: 1.25, healPct: 0.2, cooldownMs: 8000 },
} satisfies Record<string, SetEffectDef>;

function tieredSet(id: string, prefix: string, attr: "str" | "dex" | "int", boost: "power" | "ranged" | "magic", fx: SetEffectDef[][]): SetDef {
  return {
    id,
    name: { en: id, de: id },
    pieces: ARMOR_SLOTS.map((s) => `${prefix}_${s}`),
    // Alt-Felder absichtlich gesetzt: mit `tiers` werden sie ignoriert.
    minPieces: 1,
    bonus: { maxHp: 999 },
    modifiers: { [attr]: 100 },
    tiers: [
      { pieces: 2, modifiers: { [attr]: 6, con: 6 }, effects: fx[0] },
      { pieces: 4, modifiers: { [attr]: 6, con: 6, lck: 4 }, effects: fx[1] },
      { pieces: 5, modifiers: { [attr]: 6, con: 6, lck: 4 }, skillBoost: { [boost]: 6 }, effects: fx[2] },
    ],
  };
}

const BLOOD = tieredSet("t_blood", "tb", "str", "power", [[E.bleedPct], [E.wounds], [E.toll]]);
const STALK = tieredSet("t_stalk", "tp", "dex", "ranged", [[E.poisonPct], [E.plague], [E.outbreak]]);
const FIRE = tieredSet("t_fire", "tf", "int", "magic", [[E.burnPct, E.burnMs], [E.interest], [E.collection]]);
const LEGACY: SetDef = {
  id: "t_legacy",
  name: { en: "legacy", de: "alt" },
  pieces: ["tl_helmet", "tl_body"],
  minPieces: 2,
  bonus: { maxHp: 7 },
  modifiers: { wis: 3 },
  skillBoost: { warding: 2 },
};

const VARIANT = piece("tb_helmet_heroic", "helmet", { variantOf: "tb_helmet" });
const LEGACY_VARIANT = piece("tl_body_heroic", "body", { variantOf: "tl_body" });
const RING = piece("t_ring", "ring1", { primaryAttribute: 12, primarySkillBoost: 4 });

function weapon(id: string, style: WeaponStyle, fields: Partial<ItemDef> = {}): ItemDef {
  return {
    id,
    name: { en: id, de: id },
    type: "equipment",
    stackable: false,
    slot: "mainhand",
    weaponStyle: style,
    weaponType: style === "ranged" ? "longbow" : style === "magic" ? "staff" : "sword",
    damageMin: 300,
    damageMax: 300,
    attackIntervalMs: 2000,
    twoHanded: style !== "melee",
    ...fields,
  } as ItemDef;
}
const W_MELEE = weapon("tw_melee", "melee");
const W_BOW = weapon("tw_bow", "ranged");
const W_STAFF = weapon("tw_staff", "magic");
const W_BURN = weapon("tw_burn", "magic", { weaponEffect: { type: "burn", chance: 1, magnitude: 1, durationMs: 5000 } });
const W_BURN_NEVER = weapon("tw_burn0", "magic", { weaponEffect: { type: "burn", chance: 0, magnitude: 1, durationMs: 5000 } });
const W_POISON = weapon("tw_poison", "ranged", { weaponEffect: { type: "poison", chance: 1, magnitude: 1, durationMs: 60_000 }, attackIntervalMs: 800 });
const W_BLEED = weapon("tw_bleed", "melee", { weaponEffect: { type: "bleed", chance: 1, magnitude: 1, durationMs: 60_000 }, attackIntervalMs: 800 });

const DUMMY: MonsterDef = {
  id: "t_dummy",
  name: { en: "dummy", de: "Puppe" },
  level: 10,
  maxHp: 50_000_000,
  damage: 0,
  accuracy: 1,
  evasion: 0,
  defense: 100,
  attackIntervalMs: 10_000_000,
  xp: 0,
  gold: 0,
  loot: [],
} as MonsterDef;

const ITEMS: ItemDef[] = [
  ...pieces("tb"),
  ...pieces("tp"),
  ...pieces("tf", { wardCapacity: 50 }),
  piece("tl_helmet", "helmet"),
  piece("tl_body", "body"),
  VARIANT,
  LEGACY_VARIANT,
  RING,
  W_MELEE,
  W_BOW,
  W_STAFF,
  W_BURN,
  W_BURN_NEVER,
  W_POISON,
  W_BLEED,
];

const C: ContentDB = {
  ...content,
  items: { ...content.items, ...Object.fromEntries(ITEMS.map((i) => [i.id, i])) },
  sets: [...content.sets, BLOOD, STALK, FIRE, LEGACY],
  monsters: { ...content.monsters, [DUMMY.id]: DUMMY },
};

function bare(seed = 1, attrs: Record<string, number> = {}): GameState {
  const s = createGame({ name: "S", baseAttributes: { con: 300, ...attrs } }, C, seed);
  for (const slot of Object.keys(s.character.equipment) as EquipSlot[]) s.character.equipment[slot] = null;
  s.character.food = null;
  return s;
}
function wear(s: GameState, prefix: string, n: number): void {
  ARMOR_SLOTS.slice(0, n).forEach((slot) => (s.character.equipment[slot] = `${prefix}_${slot}`));
}

describe("Set-Stufen in computeStats (§6.2, kumulativ) und Varianten-Zählung (A14)", () => {
  it("2/4/5 Teile addieren die Stufen kumulativ; Alt-Felder eines Stufen-Sets wirken nicht", () => {
    const base = computeStats(bare(), C);
    const rows = [0, 1, 2, 3, 4, 5].map((n) => {
      const s = bare();
      wear(s, "tb", n);
      const st = computeStats(s, C);
      return {
        str: st.attributes.str - base.attributes.str,
        con: st.attributes.con - base.attributes.con,
        lck: st.attributes.lck - base.attributes.lck,
        power: st.skillBoosts.power ?? 0,
        maxHp: st.maxHp - base.maxHp - (st.attributes.con - base.attributes.con) * 2,
      };
    });
    expect(rows.map((r) => r.str)).toEqual([0, 0, 6, 6, 12, 18]);
    expect(rows.map((r) => r.con)).toEqual([0, 0, 6, 6, 12, 18]);
    expect(rows.map((r) => r.lck)).toEqual([0, 0, 0, 0, 4, 8]);
    expect(rows.map((r) => r.power)).toEqual([0, 0, 0, 0, 0, 6]);
    for (const r of rows) expect(r.maxHp).toBeCloseTo(0, 6); // Alt-`bonus.maxHp` 999 bleibt außen vor
  });

  it("eine Heroisch-Variante zählt als ihr Normal-Teil (gemischtes Set)", () => {
    const s = bare();
    wear(s, "tb", 5);
    s.character.equipment.helmet = VARIANT.id;
    expect(countSetPieces(s, C, BLOOD)).toBe(5);
    expect(computeStats(s, C).skillBoosts.power).toBe(6);
  });

  it("Alt-Set ohne tiers: unverändert minPieces + bonus/modifiers/skillBoost, Varianten zählen mit", () => {
    const base = computeStats(bare(), C);
    const one = bare();
    one.character.equipment.helmet = "tl_helmet";
    expect(computeStats(one, C).attributes.wis).toBe(base.attributes.wis);
    expect(activeSets(one, C).map((x) => x.id)).not.toContain(LEGACY.id);
    const two = bare();
    two.character.equipment.helmet = "tl_helmet";
    two.character.equipment.body = LEGACY_VARIANT.id;
    const st = computeStats(two, C);
    expect(st.attributes.wis - base.attributes.wis).toBe(3);
    expect(st.skillBoosts.warding).toBe(2);
    expect(st.maxHp - base.maxHp).toBeCloseTo(7, 6);
    expect(activeSets(two, C).map((x) => x.id)).toContain(LEGACY.id);
  });

  it("activeSets/activeSetEffects: Stufen-Set ab 2 Teilen aktiv, Effekte der erreichten Stufen in Reihenfolge", () => {
    const s = bare();
    wear(s, "tf", 1);
    expect(activeSets(s, C).map((x) => x.id)).not.toContain(FIRE.id);
    expect(activeSetEffects(s, C)).toEqual([]);
    wear(s, "tf", 4);
    expect(activeSets(s, C).map((x) => x.id)).toContain(FIRE.id);
    expect(activeSetEffects(s, C).map((e) => e.kind)).toEqual(["burnDamagePct", "burnDurationMs", "fireInterest"]);
    wear(s, "tf", 5);
    expect(activeSetEffects(s, C).map((e) => e.kind)).toEqual(["burnDamagePct", "burnDurationMs", "fireInterest", "fireCollection"]);
  });
});

describe("Hauptattribut-Schmuck (§10.5)", () => {
  it.each([
    [null, "str", "power"],
    [W_MELEE.id, "str", "power"],
    [W_BOW.id, "dex", "ranged"],
    [W_STAFF.id, "int", "magic"],
  ] as const)("Haupthand %s ⇒ +12 %s, +4 %s", (weaponId, attr, boost) => {
    const without = bare();
    without.character.equipment.mainhand = weaponId;
    const withRing = bare();
    withRing.character.equipment.mainhand = weaponId;
    withRing.character.equipment.ring1 = RING.id;
    const a = computeStats(without, C);
    const b = computeStats(withRing, C);
    expect(b.attributes[attr] - a.attributes[attr]).toBe(12);
    expect((b.skillBoosts[boost] ?? 0) - (a.skillBoosts[boost] ?? 0)).toBe(4);
    for (const other of ["str", "dex", "int"] as const) {
      if (other !== attr) expect(b.attributes[other]).toBe(a.attributes[other]);
    }
  });
});

// ── Set-Effekte im Kampf (§6.1, Spezifikations-Spalte) ─────────────────────────────────────────

/** Kampf gegen die Puppe (greift nie an, stirbt nie); Spieler-Timer frisch. */
function fight(prefix: string | null, n: number, weaponId: string, seed = 1, attrs: Record<string, number> = {}): GameState {
  const s = bare(seed, attrs);
  if (prefix) wear(s, prefix, n);
  s.character.equipment.mainhand = weaponId;
  expect(startCombat(s, C, DUMMY.id)).toBe(true);
  s.character.hp = computeStats(s, C).maxHp;
  s.combat.playerTimerMs = 0;
  return s;
}
function tickNoAttack(s: GameState): void {
  s.combat.playerTimerMs = 0;
  combatStep(s, C);
}
function tickAttack(s: GameState): void {
  s.combat.playerTimerMs = computeStats(s, C).attackIntervalMs - 50;
  combatStep(s, C);
}
function dotLoss(prefix: string | null, n: number, type: "burn" | "poison" | "bleed", weaponId: string, stacks = 0): number {
  const s = fight(prefix, n, weaponId);
  s.combat.enemyEffects = [{ type, remainingMs: 5000, magnitude: 10 }];
  if (stacks > 0) s.combat.effectCounters = { ...(s.combat.effectCounters ?? emptyCounters()), bleedStacks: stacks };
  const before = s.combat.enemyHp;
  tickNoAttack(s);
  return before - s.combat.enemyHp;
}
function emptyCounters() {
  return { momentumStacks: 0, firstHitDone: false, hitCount: 0, vengeancePrimed: false, overkillCarry: 0, plague: null };
}
function playerHits(s: GameState) {
  return s.combat.log.filter((e) => e.by === "player" && (e.kind === "hit" || e.kind === "crit") && !e.hitKind);
}

describe("Set 2/5: Brand-, Gift- und Blutungsbonus, Brand +2 s", () => {
  it("DoT-Ticks des Set-Typs × 1,20", () => {
    expect(dotLoss("tf", 2, "burn", W_STAFF.id) / dotLoss(null, 0, "burn", W_STAFF.id)).toBeCloseTo(1.2, 6);
    expect(dotLoss("tp", 2, "poison", W_BOW.id) / dotLoss(null, 0, "poison", W_BOW.id)).toBeCloseTo(1.2, 6);
    expect(dotLoss("tb", 2, "bleed", W_MELEE.id) / dotLoss(null, 0, "bleed", W_MELEE.id)).toBeCloseTo(1.2, 6);
    // Fremder Typ bleibt unberührt.
    expect(dotLoss("tf", 2, "poison", W_STAFF.id)).toBeCloseTo(dotLoss(null, 0, "poison", W_STAFF.id), 6);
  });

  it("Ornat 2/5: dein Brand hält 2 s länger", () => {
    const a = fight(null, 0, W_BURN.id);
    tickAttack(a);
    const b = fight("tf", 2, W_BURN.id);
    tickAttack(b);
    expect(a.combat.enemyEffects.find((e) => e.type === "burn")?.remainingMs).toBe(5000);
    expect(b.combat.enemyEffects.find((e) => e.type === "burn")?.remainingMs).toBe(7000);
  });
});

describe("Ornat 4/5 Zinsfeuer und 5/5 Eintreibung", () => {
  it("Zins zählt volle Sekunden Brand und verfällt mit dem Brand", () => {
    const s = fight("tf", 4, W_STAFF.id);
    s.combat.enemyEffects = [{ type: "burn", remainingMs: 1500, magnitude: 0 }];
    for (let i = 0; i < 10; i++) tickNoAttack(s);
    expect(s.combat.effectCounters?.fireInterestMs).toBe(1000);
    for (let i = 0; i < 6; i++) tickNoAttack(s); // Brand läuft ab
    expect(s.combat.enemyEffects.some((e) => e.type === "burn")).toBe(false);
    expect(s.combat.effectCounters?.fireInterestMs ?? 0).toBe(0);
  });

  it("Zauberschaden × (1 + 1,5 % je Zinsstufe), gleiche Würfe", () => {
    let withInterest = 0;
    let without = 0;
    for (let seed = 1; seed <= 20; seed++) {
      for (const interestMs of [2900, 0]) {
        const s = fight("tf", 4, W_STAFF.id, seed);
        s.combat.enemyEffects = [{ type: "burn", remainingMs: 5000, magnitude: 0 }];
        s.combat.effectCounters = { ...emptyCounters(), fireInterestMs: interestMs };
        tickAttack(s); // +100 ms ⇒ 3000 ms ⇒ 3 Stufen bzw. 0
        const sum = playerHits(s).reduce((a, e) => a + e.amount, 0);
        if (interestMs > 0) withInterest += sum;
        else without += sum;
      }
    }
    expect(without).toBeGreaterThan(0);
    expect(withInterest / without).toBeCloseTo(1.045, 2);
  });

  it("Eintreibung: jeder 5. Zauber detoniert 20 % des Restbrands, entzündet neu (volle Dauer) und füllt den Ward", () => {
    const s = fight("tf", 5, W_BURN_NEVER.id);
    s.combat.enemyEffects = [{ type: "burn", remainingMs: 3000, magnitude: 10 }];
    s.combat.effectCounters = { ...emptyCounters(), castCount: 3 };
    s.character.ward = 0;
    tickAttack(s); // 4. Zauber: nichts
    expect(s.combat.log.some((e) => e.hitKind === "fireCollection")).toBe(false);
    s.combat.effectCounters!.fireInterestMs = 0;
    s.character.ward = 0;
    tickAttack(s); // 5. Zauber
    const det = s.combat.log.find((e) => e.hitKind === "fireCollection");
    // Rest nach dem Tick 2800 ms; Rate 10 × Glut 1,1 × Set 1,2; Anteil 0,20 (0 Zinsstufen) ⇒ round(7,392) = 7.
    expect(det?.amount).toBe(7);
    expect(det?.wardRestored).toBe(7);
    expect(s.combat.enemyEffects.find((e) => e.type === "burn")?.remainingMs).toBe(7000); // 5000 + 2000 (Set)
    expect(s.combat.effectCounters?.castCount).toBe(5);
  });
});

describe("Pirschgewand 4/5 Schleichende Seuche und 5/5 Ausbruch", () => {
  function maxPoisonStacks(prefix: string | null, n: number): number {
    const s = fight(prefix, n, W_POISON.id);
    let max = 0;
    for (let i = 0; i < 12; i++) {
      tickAttack(s);
      max = Math.max(max, s.combat.elemental?.enemy.poisonStacks ?? 0);
    }
    return max;
  }

  it("Gift stapelt nur mit 4/5 bis 7, sonst bis 5", () => {
    expect(maxPoisonStacks(null, 0)).toBe(5);
    expect(maxPoisonStacks("tp", 2)).toBe(5);
    expect(maxPoisonStacks("tp", 4)).toBe(7);
  });

  it("je Gift-Stapel 1 % Rüstung ignoriert", () => {
    const s = fight("tp", 4, W_BOW.id);
    s.combat.enemyEffects = [{ type: "poison", remainingMs: 5000, magnitude: 0 }];
    s.combat.elemental = {
      player: { frostStacks: 0, freezeImmunityMs: 0, frozen: false, shockDelayMs: 0, poisonStacks: 0 },
      enemy: { frostStacks: 0, freezeImmunityMs: 0, frozen: false, shockDelayMs: 0, poisonStacks: 5 },
    };
    tickAttack(s);
    const hit = playerHits(s)[0]!;
    const def = 100 * 0.95;
    expect(hit.mitigated! / hit.rawDamage!).toBeCloseTo(def / (def + DEFENSE_MITIGATION_K), 2);
  });

  it("Ausbruch: Treffer bei 7 Stapeln ⇒ 100 % Restgift sofort, Stapel 7 → 3, 8 s Abklingzeit", () => {
    const s = fight("tp", 5, W_BOW.id);
    const setStacks = (n: number) => {
      s.combat.elemental = {
        player: { frostStacks: 0, freezeImmunityMs: 0, frozen: false, shockDelayMs: 0, poisonStacks: 0 },
        enemy: { frostStacks: 0, freezeImmunityMs: 0, frozen: false, shockDelayMs: 0, poisonStacks: n },
      };
    };
    s.combat.enemyEffects = [{ type: "poison", remainingMs: 5000, magnitude: 10 }];
    setStacks(7);
    tickAttack(s);
    const ob = s.combat.log.filter((e) => e.hitKind === "outbreak");
    // Rest 4900 ms × 10 × 7 Stapel × Set 1,2 × 1,0 = 411,6 ⇒ 412.
    expect(ob.map((e) => e.amount)).toEqual([412]);
    expect(s.combat.elemental?.enemy.poisonStacks).toBe(3);
    expect(s.combat.effectCounters?.outbreakCdMs).toBe(8000);
    setStacks(7);
    tickAttack(s); // Abklingzeit läuft
    expect(s.combat.log.filter((e) => e.hitKind === "outbreak")).toHaveLength(1);
  });
});

describe("Blutschwur 4/5 Offene Wunden und 5/5 Blutzoll", () => {
  it("Blutung stapelt nur mit 4/5, bis 3", () => {
    const plain = fight("tb", 2, W_BLEED.id);
    for (let i = 0; i < 5; i++) tickAttack(plain);
    expect(plain.combat.effectCounters?.bleedStacks ?? 0).toBe(0);
    const s = fight("tb", 4, W_BLEED.id);
    const seen: number[] = [];
    for (let i = 0; i < 5; i++) {
      tickAttack(s);
      seen.push(s.combat.effectCounters?.bleedStacks ?? 0);
    }
    expect(seen).toEqual([1, 2, 3, 3, 3]);
  });

  it("jeder weitere Stapel +15 % Blutungsschaden (×1,30 bei drei)", () => {
    const one = dotLoss("tb", 4, "bleed", W_MELEE.id, 1);
    const three = dotLoss("tb", 4, "bleed", W_MELEE.id, 3);
    expect(three / one).toBeCloseTo(1.3, 6);
  });

  it("kritische Treffer +3 % je Stapel, nach dem Krit-Deckel", () => {
    let crits = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const amounts = [3, 0].map((stacks) => {
        const s = fight("tb", 4, W_MELEE.id, seed, { lck: 300 });
        s.combat.enemyEffects = [{ type: "bleed", remainingMs: 5000, magnitude: 0 }];
        s.combat.effectCounters = { ...emptyCounters(), bleedStacks: stacks };
        tickAttack(s);
        return playerHits(s)[0];
      });
      const [a, b] = amounts;
      if (!a || !b) continue;
      expect(a.kind).toBe(b.kind);
      if (b.kind === "crit") {
        crits++;
        expect(a.amount / b.amount).toBeCloseTo(1.09, 1);
      } else {
        expect(a.amount).toBe(b.amount);
      }
    }
    expect(crits).toBeGreaterThan(5);
  });

  it("Blutzoll: Treffer bei 3 Stapeln ⇒ Rest ×1,25 sofort, 20 % Heilung, Blutung erlischt, 8 s Abklingzeit", () => {
    const s = fight("tb", 5, W_MELEE.id);
    s.character.hp = computeStats(s, C).maxHp / 2;
    s.combat.enemyEffects = [{ type: "bleed", remainingMs: 5000, magnitude: 10 }];
    s.combat.effectCounters = { ...emptyCounters(), bleedStacks: 3 };
    tickAttack(s);
    const toll = s.combat.log.find((e) => e.hitKind === "bloodToll");
    // Rest 4900 ms × 10 × Set 1,2 × Wunden 1,3 × 1,25 = 95,55 ⇒ 96; Heilung round(19,2) = 19.
    expect(toll?.amount).toBe(96);
    expect(s.combat.log.some((e) => e.kind === "heal" && e.source === "effect" && e.amount === 19)).toBe(true);
    expect(s.combat.enemyEffects.some((e) => e.type === "bleed")).toBe(false);
    expect(s.combat.effectCounters?.bleedStacks).toBe(0);
    expect(s.combat.effectCounters?.bloodTollCdMs).toBe(8000);
  });
});

describe("Ohne Set und ohne Raid: bitgleich", () => {
  it("Stufen-Sets und ein Raid im Katalog verändern einen normalen Kampf nicht (gleicher Endzustand, gleiche Würfe)", () => {
    const monsterId = "goblin";
    expect(content.monsters[monsterId]).toBeDefined();
    function run(c: ContentDB): string {
      const s = createTestGame({ name: "B" }, c, 77);
      expect(startCombat(s, c, monsterId)).toBe(true);
      for (let i = 0; i < 3000; i++) combatStep(s, c);
      return JSON.stringify({ combat: s.combat, rng: s.rng, hp: s.character.hp, skills: s.skills, inv: s.inventory });
    }
    const withRaidDefs: ContentDB = { ...C, raids: [...(content.raids ?? [])] };
    expect(run(withRaidDefs)).toBe(run({ ...content, monsters: { ...content.monsters } }));
  });
});
