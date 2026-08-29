import { describe, expect, it } from "vitest";
import type { ContentDB, ItemDef, MonsterDef } from "@hearthforge/shared";
import {
  FOCUS_STANCE_DMG_CAP,
  FROST_FREEZE_STACKS,
  PET_ABILITY_CAP,
  SHIELD_STANCE_WARDREGEN_CAP,
  SHOCK_DELAY_CAP_MS,
  SHOCK_DELAY_MS,
  SPECIAL_EFFECT_TYPES,
  TICK_MS,
  WARDING_REGEN_CAP,
  WIS_FROST_EXTRA_STACK_RESIST,
  WIS_STATUS_RESIST_CAP,
  effectiveWeaponEffects,
  spellReserveDamageBonus,
  spellReserveWardRegenBonus,
  wisdomStatusResist,
} from "@hearthforge/shared";
import { content } from "@hearthforge/content";
import { createGame } from "./state";
import { computeStats, setMagicStance } from "./character";
import { combatStep, startCombat, tickPlayerRegen } from "./combat";
import { advance } from "./tick";
import { xpForLevel } from "./leveling";

/**
 * Zauberreserve und Weisheit (Chef-GO 28.08.2026, design/zauberreserve-weisheit.md).
 *  §1 Mana wird Zauberreserve: kein Verbrauch, `character.mana` == `maxMana`, Zauber kosten nichts.
 *  §2 Die Magie-Haltungen lesen die Reserve: Fokus (+1 % Zauberschaden je 40, Deckel 30 %),
 *     Schild (+1 % Ward-Regen je 20, Deckel 60 %).
 *  §3 Weisheit = Status-Widerstand für alle Stile (1 %/Punkt, Deckel 40 %): kürzer UND schwächer,
 *     Schock kürzer verzögert, Frost braucht ab 20 % vier statt drei Anwendungen.
 *  §4 Alt-Werte umgedeutet (wardOnKill, wardRestore, spellReserve-Pet, Trank).
 *  §5 Symmetrie: Gegner-Status unterliegen dem Widerstand, Spieler-Status gegen Gegner nicht.
 */

const STAFF: ItemDef = {
  id: "sr_staff",
  name: "Reserve-Stab",
  type: "equipment",
  stackable: false,
  slot: "mainhand",
  weaponStyle: "magic",
  weaponType: "staff",
  twoHanded: true,
  damageMin: 10,
  damageMax: 12,
  attackIntervalMs: 3000,
  bonus: { accuracy: 500 },
  weaponEffect: { type: "burn", chance: 1, magnitude: 5, durationMs: 4000 },
};

const SWORD: ItemDef = {
  id: "sr_sword",
  name: "Reserve-Schwert",
  type: "equipment",
  stackable: false,
  slot: "mainhand",
  weaponStyle: "melee",
  weaponType: "sword",
  damageMin: 10,
  damageMax: 12,
  attackIntervalMs: 3000,
  bonus: { accuracy: 500 },
};

function ring(id: string, maxMana: number): ItemDef {
  return { id, name: id, type: "equipment", stackable: false, slot: "ring1", bonus: { maxMana } };
}
function robe(id: string, wardCapacity: number): ItemDef {
  return { id, name: id, type: "equipment", stackable: false, slot: "body", wardCapacity } as ItemDef;
}

/** Harmloser Trainings-Gegner: riesige HP, trifft nie. */
const DUMMY: MonsterDef = {
  id: "sr_dummy",
  name: { en: "Dummy", de: "Puppe" },
  level: 5,
  maxHp: 5_000_000,
  damage: 0.1,
  accuracy: 0,
  evasion: 0,
  defense: 0,
  attackIntervalMs: 9_999_999,
  xp: 0,
  gold: 0,
  loot: [],
};

/** Trifft JEDEN Tick sicher (Intervall = 1 Tick, Accuracy riesig), legt seinen Status mit chance 1. */
function inflicter(id: string, inflict: MonsterDef["inflict"]): MonsterDef {
  return {
    id,
    name: { en: id, de: id },
    level: 5,
    maxHp: 5_000_000,
    damage: 0.1,
    accuracy: 100_000,
    evasion: 0,
    defense: 0,
    attackIntervalMs: TICK_MS,
    xp: 0,
    gold: 0,
    loot: [],
    inflict,
  };
}

function withAll(items: ItemDef[], monsters: MonsterDef[]): ContentDB {
  const c: ContentDB = { ...content, items: { ...content.items }, monsters: { ...content.monsters } };
  for (const i of items) c.items[i.id] = i;
  for (const m of monsters) c.monsters[m.id] = m;
  return c;
}

function mage(c: ContentDB, attrs: { int?: number; wis?: number; con?: number }, seed = 1, mainhand = "sr_staff") {
  const s = createGame({ name: "Magier", baseAttributes: { int: 10, wis: 0, con: 400, ...attrs } }, c, seed);
  s.character.equipment.mainhand = mainhand;
  s.character.hp = computeStats(s, c).maxHp;
  return s;
}

const NEVER = -1_000_000_000; // Spieler-Timer weit negativ ⇒ kein eigener Angriff im Messfenster

// ── §2 Helfer/Konstanten ─────────────────────────────────────────────────────

describe("Zauberreserve §2: Haltungs-Boni aus der Reserve (Helfer, Deckel)", () => {
  it("Fokus: +1 % Zauberschaden je 30 Reserve, Deckel 15 % (Chef 29.08.: Reserve aus Weisheit, Teiler 60 → 30)", () => {
    expect(FOCUS_STANCE_DMG_CAP).toBe(0.15);
    expect(spellReserveDamageBonus(300)).toBeCloseTo(0.1, 9);
    expect(spellReserveDamageBonus(450)).toBeCloseTo(FOCUS_STANCE_DMG_CAP, 9);
    expect(spellReserveDamageBonus(5000)).toBe(FOCUS_STANCE_DMG_CAP);
    expect(spellReserveDamageBonus(0)).toBe(0);
    expect(spellReserveDamageBonus(Number.NaN)).toBe(0);
  });
  it("Abwehr (war Schild): +1 % Ward-Regen je 20 Reserve, Deckel 30 % (Chef 29.08.: Teiler 40 → 20)", () => {
    expect(SHIELD_STANCE_WARDREGEN_CAP).toBe(0.3);
    expect(spellReserveWardRegenBonus(200)).toBeCloseTo(0.1, 9);
    expect(spellReserveWardRegenBonus(600)).toBeCloseTo(SHIELD_STANCE_WARDREGEN_CAP, 9);
    expect(spellReserveWardRegenBonus(5000)).toBe(SHIELD_STANCE_WARDREGEN_CAP);
    expect(spellReserveWardRegenBonus(-5)).toBe(0);
  });
  it("Weisheit: 1 % Status-Widerstand je Punkt, Deckel 40 %", () => {
    expect(wisdomStatusResist(10)).toBeCloseTo(0.1, 9);
    expect(wisdomStatusResist(40)).toBeCloseTo(WIS_STATUS_RESIST_CAP, 9);
    expect(wisdomStatusResist(60)).toBe(WIS_STATUS_RESIST_CAP);
    expect(wisdomStatusResist(0)).toBe(0);
  });
});

// ── §1/§2 computeStats ───────────────────────────────────────────────────────

describe("Zauberreserve §1/§2: computeStats (maxMana bleibt der Feldname, Haltungen lesen ihn)", () => {
  const c = withAll([STAFF, SWORD, ring("sr_ring600", 600), ring("sr_ring150", 150), ring("sr_ring_big", 20_000)], [DUMMY]);

  it("maxMana = 30 + 10·WIS + Σ Boni (Chef 29.08.: Reserve aus Weisheit, INT trägt nichts bei); manaRegen existiert nicht mehr", () => {
    const s = mage(c, { int: 10, wis: 5 });
    const st = computeStats(s, c);
    // effektive Attribute = Basis (BASE_ATTRIBUTE_VALUE) + Erstellung + Training + Ausrüstung
    const expected = 30 + 10 * st.attributes.wis;
    expect(st.maxMana).toBe(expected);
    // INT ändert die Reserve nicht mehr (Gegenstück-Vertrag: INT = Schaden, WIS = Reserve)
    expect(computeStats(mage(c, { int: 40, wis: 5 }), c).maxMana).toBe(30 + 10 * computeStats(mage(c, { int: 40, wis: 5 }), c).attributes.wis);
    expect("manaRegen" in st).toBe(false);
    s.character.equipment.ring1 = "sr_ring600";
    expect(computeStats(s, c).maxMana).toBe(expected + 600);
  });

  it("Fokus-Haltung: die ganze Magie-Spanne wächst mit der Reserve (+150 Reserve ⇒ +5 Pp), Bonus immer im Stat sichtbar", () => {
    const s = mage(c, { int: 10, wis: 5 });
    const before = computeStats(s, c);
    s.character.equipment.ring1 = "sr_ring150";
    const after = computeStats(s, c);
    expect(after.spellReserveDamageBonus - before.spellReserveDamageBonus).toBeCloseTo(0.05, 9);
    expect(after.spellReserveDamageBonus).toBeCloseTo(spellReserveDamageBonus(after.maxMana), 9);
    const ratio = (1 + after.spellReserveDamageBonus) / (1 + before.spellReserveDamageBonus);
    expect(after.attackDamageMin / before.attackDamageMin).toBeCloseTo(ratio, 9);
    expect(after.attackDamageMax / before.attackDamageMax).toBeCloseTo(ratio, 9);
  });

  it("Fokus-Deckel: riesige Reserve ⇒ genau +30 % (nicht mehr)", () => {
    const s = mage(c, { int: 10, wis: 5 });
    const base = computeStats(s, c);
    s.character.equipment.ring1 = "sr_ring_big";
    const capped = computeStats(s, c);
    expect(capped.spellReserveDamageBonus).toBe(FOCUS_STANCE_DMG_CAP);
    expect(capped.attackDamageMax / base.attackDamageMax).toBeCloseTo(
      (1 + FOCUS_STANCE_DMG_CAP) / (1 + base.spellReserveDamageBonus),
      9,
    );
  });

  it("Schild-Haltung: KEIN Zauberschaden-Bonus (dmgMult 0.85 bleibt), Nahkampf ebenfalls unberührt", () => {
    const s = mage(c, { int: 10, wis: 5 });
    setMagicStance(s, "defensive");
    const before = computeStats(s, c);
    s.character.equipment.ring1 = "sr_ring_big";
    const after = computeStats(s, c);
    expect(after.spellReserveDamageBonus).toBe(FOCUS_STANCE_DMG_CAP); // im Stat sichtbar (Tooltip) …
    expect(after.attackDamageMax).toBeCloseTo(before.attackDamageMax, 9); // … aber nicht angewandt
    const m = mage(c, { int: 10, wis: 5 }, 1, "sr_sword");
    const mBefore = computeStats(m, c);
    m.character.equipment.ring1 = "sr_ring_big";
    expect(computeStats(m, c).attackDamageMax).toBeCloseTo(mBefore.attackDamageMax, 9);
  });

  it("Schild-Haltung: Ward-Regen × (1 + Bonus) NACH dem Warding-Cap; Deckel +30 %; Fokus-Haltung ohne Bonus", () => {
    const s = mage(c, { int: 10, wis: 5 });
    s.skills.warding = { xp: xpForLevel(99) }; // Warding-Regen am Cap (2.0/s), damit der Bonus messbar über dem Cap liegt
    setMagicStance(s, "defensive");
    const st = computeStats(s, c);
    expect(st.spellReserveWardRegenBonus).toBeCloseTo(spellReserveWardRegenBonus(st.maxMana), 9);
    expect(st.wardRegenPerSec).toBeCloseTo(WARDING_REGEN_CAP * (1 + st.spellReserveWardRegenBonus), 9);
    s.character.equipment.ring1 = "sr_ring_big";
    const capped = computeStats(s, c);
    expect(capped.spellReserveWardRegenBonus).toBe(SHIELD_STANCE_WARDREGEN_CAP);
    expect(capped.wardRegenPerSec).toBeCloseTo(WARDING_REGEN_CAP * (1 + SHIELD_STANCE_WARDREGEN_CAP), 9);
    setMagicStance(s, "offensive");
    const off = computeStats(s, c);
    expect(off.wardRegenPerSec).toBeLessThanOrEqual(WARDING_REGEN_CAP); // kein Reserve-Bonus in der Fokus-Haltung
  });

  it("statusResist = min(0.4, 0.01·WIS) aus den EFFEKTIVEN Attributen (auch für Nahkampf)", () => {
    const st10 = computeStats(mage(c, { wis: 10 }), c);
    expect(st10.statusResist).toBeCloseTo(0.01 * st10.attributes.wis, 9);
    expect(st10.statusResist).toBeCloseTo(wisdomStatusResist(st10.attributes.wis), 9);
    expect(computeStats(mage(c, { wis: 60 }), c).statusResist).toBe(WIS_STATUS_RESIST_CAP);
    const melee = computeStats(mage(c, { wis: 22 }, 1, "sr_sword"), c);
    expect(melee.attributes.wis).toBe(25);
    expect(melee.statusResist).toBeCloseTo(0.25, 9);
  });
});

// ── §1 Kampf: Cast ohne Kosten, mana == maxMana ──────────────────────────────

describe("Zauberreserve §1: Zauber kosten nichts, mana wird auf maxMana gehalten", () => {
  const c = withAll([STAFF, ring("sr_ring600", 600)], [DUMMY]);

  it("im Kampf: jeder Angriff ist ein Zauber (Spell-Status kommt), mana bleibt in jedem Tick == maxMana", () => {
    const s = mage(c, { int: 10, wis: 5 });
    startCombat(s, c, "sr_dummy");
    let casts = 0;
    for (let i = 0; i < 120; i++) {
      combatStep(s, c);
      const st = computeStats(s, c);
      expect(s.character.mana).toBe(st.maxMana);
      if (s.combat.log.some((e) => e.by === "player" && (e.kind === "hit" || e.kind === "crit"))) casts++;
    }
    expect(casts).toBeGreaterThan(0);
    expect(s.combat.enemyEffects.some((e) => e.type === "burn")).toBe(true); // echter Zauber, kein Weak-Melee
  });

  it("tickPlayerRegen setzt mana = maxMana (Alt-Save mit 0 ODER Überschuss aus abgelaufenem Buff)", () => {
    const s = mage(c, { int: 10, wis: 5 });
    const st = computeStats(s, c);
    s.character.mana = 0;
    tickPlayerRegen(s, st);
    expect(s.character.mana).toBe(st.maxMana);
    s.character.mana = 99_999;
    tickPlayerRegen(s, st);
    expect(s.character.mana).toBe(st.maxMana);
  });

  it("außerhalb des Kampfes (Idle-Tick) folgt mana dem aktuellen maxMana — auch nach einem Ausrüstungswechsel", () => {
    const s = mage(c, { int: 10, wis: 5 });
    s.character.mana = 0;
    advance(s, c, TICK_MS);
    expect(s.character.mana).toBe(computeStats(s, c).maxMana);
    s.character.equipment.ring1 = "sr_ring600";
    advance(s, c, TICK_MS);
    expect(s.character.mana).toBe(computeStats(s, c).maxMana);
  });
});

// ── §3/§5 Weisheits-Widerstand ───────────────────────────────────────────────

describe("Zauberreserve §3: Weisheit = Status-Widerstand auf Gegner-Status gegen den Spieler", () => {
  const POISON = inflicter("sr_poisoner", { type: "poison", chance: 1, magnitude: 10, durationMs: 5000 });
  const SHOCK = inflicter("sr_shocker", { type: "shock", chance: 1, magnitude: 0, durationMs: 5000 });
  const FROST = inflicter("sr_froster", { type: "frost", chance: 1, magnitude: 0, durationMs: 5000 });
  const c = withAll([STAFF, SWORD], [DUMMY, POISON, SHOCK, FROST]);

  /** Genau EIN Gegner-Treffer im ersten Tick; der Spieler greift nicht an. */
  /** Genau EIN Gegner-Treffer im ersten Tick; der Spieler greift nicht an. `wis` = Erstellungswert (effektiv +3 Basis). */
  function oneHit(monster: MonsterDef, wis: number, mainhand = "sr_staff") {
    const s = mage(c, { wis }, 3, mainhand);
    const st = computeStats(s, c);
    startCombat(s, c, monster.id);
    s.combat.playerTimerMs = NEVER;
    s.combat.enemyTimerMs = 0; // += TICK_MS ⇒ ≥ Intervall (TICK_MS) ⇒ Angriff in diesem Tick
    combatStep(s, c);
    expect(s.combat.log.filter((e) => e.by === "enemy" && (e.kind === "hit" || e.kind === "crit"))).toHaveLength(1);
    return { s, st };
  }

  it("Dauer × (1 − r) UND Magnitude × (1 − r): effektiv WIS 10 ⇒ 10 % kürzer und schwächer; Basis-WIS 3 ⇒ 3 %", () => {
    const base = oneHit(POISON, 0);
    expect(base.st.statusResist).toBeCloseTo(0.03, 9); // Basis-Attribut 3 ⇒ 3 % — auch der Neuling hat etwas Widerstand
    const plain = base.s.combat.playerEffects.find((e) => e.type === "poison")!;
    expect(plain.magnitude).toBeCloseTo(10 * (1 - base.st.statusResist), 9);
    expect(plain.remainingMs).toBeCloseTo(5000 * (1 - base.st.statusResist), 9);
    const ten = oneHit(POISON, 7); // effektiv 10
    expect(ten.st.attributes.wis).toBe(10);
    const resisted = ten.s.combat.playerEffects.find((e) => e.type === "poison")!;
    expect(resisted.magnitude).toBeCloseTo(9, 9);
    expect(resisted.remainingMs).toBeCloseTo(4500, 9);
  });

  it("Deckel 40 %: effektiv WIS 63 wirkt wie WIS 40 — Magnitude 6, Dauer 3000 ms; gilt auch für den Nahkämpfer (alle Stile)", () => {
    const capped = oneHit(POISON, 60);
    expect(capped.st.statusResist).toBe(WIS_STATUS_RESIST_CAP);
    const eff = capped.s.combat.playerEffects.find((e) => e.type === "poison")!;
    expect(eff.magnitude).toBeCloseTo(6, 9);
    expect(eff.remainingMs).toBeCloseTo(3000, 9);
    const melee = oneHit(POISON, 40, "sr_sword").s.combat.playerEffects.find((e) => e.type === "poison")!;
    expect(melee.magnitude).toBeCloseTo(6, 9);
  });

  it("Schock: Verzögerung × (1 − r) je Anwendung UND am Ketten-Deckel (effektiv WIS 25 ⇒ 300 ms statt 400, Kette 900 statt 1200)", () => {
    const { s, st } = oneHit(SHOCK, 22); // effektiv 25 ⇒ r = 0.25
    expect(st.statusResist).toBeCloseTo(0.25, 9);
    const delay = Math.round(SHOCK_DELAY_MS * 0.75);
    expect(delay).toBe(300);
    expect(s.combat.playerTimerMs).toBe(NEVER + TICK_MS - delay);
    const ev = s.combat.log.find((e) => e.kind === "status" && e.status === "shock");
    expect(ev?.by).toBe("enemy");
    expect(ev?.amount).toBe(delay);
    // Kette: der Gegner trifft jeden weiteren Tick — der Deckel liegt bei SHOCK_DELAY_CAP_MS × 0.75.
    for (let i = 0; i < 6; i++) {
      s.combat.playerTimerMs = NEVER;
      combatStep(s, c);
    }
    expect(s.combat.elemental?.player.shockDelayMs).toBe(Math.round(SHOCK_DELAY_CAP_MS * 0.75));
    expect(s.combat.elemental?.player.shockDelayMs).toBeLessThan(SHOCK_DELAY_CAP_MS);
  });

  it("Frost: unter 20 % Widerstand friert die dritte Anwendung ein, ab 20 % erst die vierte", () => {
    function frozenAfter(wis: number, hits: number): boolean {
      const s = mage(c, { wis }, 5);
      startCombat(s, c, FROST.id);
      s.combat.enemyTimerMs = 0;
      for (let i = 0; i < hits; i++) {
        s.combat.playerTimerMs = NEVER; // eigener Angriff würde das Einfrieren verbrauchen
        combatStep(s, c);
      }
      expect(s.combat.log.filter((e) => e.by === "enemy" && (e.kind === "hit" || e.kind === "crit"))).toHaveLength(hits);
      return s.combat.elemental?.player.frozen === true;
    }
    expect(computeStats(mage(c, { wis: 10 }), c).statusResist).toBeLessThan(WIS_FROST_EXTRA_STACK_RESIST); // 13 %
    expect(frozenAfter(10, FROST_FREEZE_STACKS - 1)).toBe(false);
    expect(frozenAfter(10, FROST_FREEZE_STACKS)).toBe(true);
    expect(computeStats(mage(c, { wis: 22 }), c).statusResist).toBeGreaterThanOrEqual(WIS_FROST_EXTRA_STACK_RESIST); // 25 %
    expect(frozenAfter(22, FROST_FREEZE_STACKS)).toBe(false);
    expect(frozenAfter(22, FROST_FREEZE_STACKS + 1)).toBe(true);
  });

  it("§5 Symmetrie: Gegner haben keine Weisheit — der Spieler-Brand auf dem Gegner bleibt bei voller Magnitude/Dauer (WIS 60)", () => {
    const s = mage(c, { wis: 60 }, 7);
    startCombat(s, c, "sr_dummy");
    const st = computeStats(s, c);
    expect(st.statusResist).toBe(WIS_STATUS_RESIST_CAP);
    s.combat.playerTimerMs = st.attackIntervalMs; // castet in diesem Tick
    for (let i = 0; i < 5 && !s.combat.enemyEffects.some((e) => e.type === "burn"); i++) combatStep(s, c);
    const burn = s.combat.enemyEffects.find((e) => e.type === "burn")!;
    expect(burn.magnitude).toBe(5);
    expect(burn.remainingMs).toBeGreaterThanOrEqual(4000 - TICK_MS);
  });
});

// ── §4 Umdeutungen ───────────────────────────────────────────────────────────

describe("Zauberreserve §4: Alt-Werte umgedeutet (Content + Kinds)", () => {
  it("Kinds: wardOnKill implementiert, manaOnKill/manaDrain entfernt; kein Item trägt mehr manaCost/manaRegen", () => {
    expect(SPECIAL_EFFECT_TYPES).toContain("wardOnKill");
    expect(SPECIAL_EFFECT_TYPES as string[]).not.toContain("manaOnKill");
    expect(SPECIAL_EFFECT_TYPES as string[]).not.toContain("manaDrain");
    for (const it of Object.values(content.items)) {
      expect("manaCost" in it, `${it.id} trägt noch manaCost`).toBe(false);
      expect(it.bonus && "manaRegen" in it.bonus, `${it.id} trägt noch manaRegen`).toBeFalsy();
      expect(it.buff?.bonus && "manaRegen" in it.buff.bonus, `${it.id} Buff trägt noch manaRegen`).toBeFalsy();
      for (const e of effectiveWeaponEffects(it)) expect(["manaOnKill", "manaDrain"]).not.toContain(e.type);
    }
  });

  it("manaOnKill → wardOnKill mit gleicher Magnitude; last_condemnation (hatte surplus als Zweit-Effekt) ohne Kill-Rückfluss", () => {
    const expectWardOnKill = (id: string, magnitude: number) => {
      const fx = effectiveWeaponEffects(content.items[id]!).filter((e) => e.type === "wardOnKill");
      expect(fx, id).toHaveLength(1);
      expect(fx[0]!.magnitude, id).toBe(magnitude);
    };
    expectWardOnKill("hedgewitch_twig", 3);
    expectWardOnKill("felmagician_eye", 3);
    expectWardOnKill("soulopal_band", 4);
    expectWardOnKill("tidecaller_focus", 6);
    expectWardOnKill("siren_shockstaff", 4);
    expectWardOnKill("aetherband_ring", 5);
    expectWardOnKill("soulflayer_amulet", 5);
    expectWardOnKill("impbone_wand", 2);
    expectWardOnKill("shamans_cowl", 2);
    const lc = effectiveWeaponEffects(content.items["last_condemnation"]!).map((e) => e.type);
    expect(lc).not.toContain("wardOnKill");
    expect(lc).toContain("surplus");
    // manaDrain-Träger: tideterror_grip → wardSiphon, warlock_felstaff nur noch der Brand.
    expect(effectiveWeaponEffects(content.items["tideterror_grip"]!).map((e) => e.type)).toEqual(["wardSiphon"]);
    expect(effectiveWeaponEffects(content.items["warlock_felstaff"]!).map((e) => e.type)).toEqual(["burn"]);
  });

  it("Trank: tonic_arcane_surge gibt +100 Zauberreserve (60 + 4·10) für 90 s; Pets: spellReserve statt manaRegen", () => {
    const tonic = content.items["tonic_arcane_surge"]!;
    expect(tonic.buff?.bonus).toEqual({ maxMana: 100 });
    expect(tonic.buff?.durationMs).toBe(90_000);
    expect(content.pets["pyreling"]!.skillEffect).toEqual({ kind: "spellReserve", value: 0.05 });
    expect(content.pets["hoarspite"]!.skillEffect).toEqual({ kind: "spellReserve", value: 0.04 });
  });

  it("glyphmaw: Runenfraß füllt jetzt den Ward (wardRestore 10 % maxWard alle 5 s, unter dem Cap) — und feuert im Kampf", () => {
    const glyph = content.pets["glyphmaw"]!;
    expect(glyph.combatAbility.kind).toBe("wardRestore");
    expect(glyph.combatAbility.value).toBe(0.1);
    expect(glyph.combatAbility.value).toBeLessThanOrEqual(PET_ABILITY_CAP.wardRestore);
    const c = withAll([STAFF, robe("sr_robe", 1000)], [DUMMY]);
    const s = mage(c, { int: 10, wis: 5 }, 9);
    s.character.equipment.body = "sr_robe";
    s.character.ownedPets["glyphmaw"] = true;
    s.character.companionPetId = "glyphmaw";
    startCombat(s, c, "sr_dummy");
    const st = computeStats(s, c);
    expect(st.maxWard).toBe(1000);
    s.character.ward = 0;
    for (let i = 0; i < 52; i++) {
      s.combat.playerTimerMs = NEVER; // kein Cast-Recharge im Fenster: der Zufluss ist die Pet-Fähigkeit (+ Warding-Regen)
      combatStep(s, c);
    }
    const fired = s.combat.log.filter((e) => e.kind === "petAbility" && e.ability === "wardRestore");
    expect(fired.length).toBeGreaterThanOrEqual(1);
    expect(fired[0]!.amount).toBe(Math.round(0.1 * st.maxWard));
    expect(s.character.ward).toBeGreaterThanOrEqual(0.1 * st.maxWard);
    expect(s.character.ward).toBeLessThan(0.1 * st.maxWard * fired.length + 2 + st.wardRegenPerSec * 5.2);
  });
});
