import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type {
  AffixDef,
  ContentDB,
  GameState,
  ItemDef,
  MonsterDef,
  WeaponEffect,
} from "@hearthforge/shared";
import {
  BLOCK_RESTORE_CAP_ABS,
  BLOCK_RESTORE_CAP_PCT,
  COMBAT_XP_BONUS_CAP,
  LOOT_CHANCE_BONUS_CAP,
  SPECIAL_EFFECT_TYPES,
  affixAppliesToItem,
  enchantSlotsFor,
  getItemRarity,
  itemTypeTags,
} from "@hearthforge/shared";
import { createGame } from "./state";
import { computeStats } from "./character";
import { startCombat } from "./combat";
import { advance } from "./tick";
import { xpForLevel } from "./leveling";
import { addItem, itemCount } from "./inventory";
import { equipItem } from "./equipment";
import { affixHasActiveEffect, applyEnchant, enchantPreview, trinityGatePasses } from "./enchant";

/**
 * Engine-Fundament der Runen Tier IV (Chef-Entscheid 25.08.2026, design/runen-tier-iv.html).
 * Content-UNABHÄNGIG mit synthetischen Affixen/Items, damit content-dev die 14 Runen danach rein als
 * Daten anlegen kann. Geprüft wird:
 *  (a) die drei neuen Spezial-Kinds: blockRestore (§4.2 Ungebrochene Mauer), combatXp (§4.3 Chronik),
 *      lootChance (§4.3 Nachlese) — Wirkung, Deckel, Determinismus offline==online;
 *  (b) das `requiresTrinity`-Gate (§4.2): eine Rüstungsrune OHNE Trinity-Wert haftet nicht auf
 *      Schmuck, wohl aber auf der passenden Rüstungsklasse;
 *  (c) die Schmuck-Linie (§4.3): `appliesTo: ["jewelry"]` greift über itemTypeTags auf Ringe/Amulett/
 *      Umhang, legendäre Meister-Ringe tragen 4 Slots, Aktiv-Effekte bleiben je Item einmalig.
 * Setup wie weapon-effects-2.test.ts: min==max-Waffe + Anti-Krit-Offhand ⇒ deterministische
 * NON-Crit-Treffer; Kampf-Skills auf L60 eingefroren.
 */

const FROZEN_SKILLS = ["attack", "power", "defence", "vitality", "ranged", "magic", "warding"];

function eff(type: WeaponEffect["type"], over: Partial<WeaponEffect> = {}): WeaponEffect {
  return { type, chance: 1, magnitude: 0, durationMs: 0, ...over };
}

/** T4-Affix nach Design §2 Prinzip 4: nur Index 3 belegt, Indizes 0..2 leer. */
function t4Affix(id: string, effect: WeaponEffect, over: Partial<AffixDef> = {}): AffixDef {
  return {
    id,
    prefix: { en: id, de: id },
    bonusByTier: [{}, {}, {}, {}],
    weaponEffectByTier: [undefined, undefined, undefined, effect],
    ...over,
  };
}

function rune(id: string, affixId: string): ItemDef {
  return { id, name: { en: id, de: id }, type: "material", stackable: true, rune: { affixId, tier: 4 } };
}

function dummy(over: Partial<MonsterDef> = {}): MonsterDef {
  return {
    id: "t4_dummy",
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
  id: "t4_nocrit",
  name: "Anti-Krit-Buckler",
  type: "equipment",
  stackable: false,
  slot: "offhand",
  bonus: { critChance: -1 },
};

/** Schild mit Block-Basis (Klassen-Gate blockChance>0) + Anti-Krit, damit Treffer deterministisch bleiben. */
const SHIELD: ItemDef = {
  id: "t4_shield",
  name: "Testschild",
  type: "equipment",
  stackable: false,
  slot: "offhand",
  blockChance: 1, // computeStats klemmt auf BLOCK_CAP (0.5)
  bonus: { critChance: -1 },
};

const AMULET: ItemDef = { id: "t4_amulet", name: "Testamulett", type: "equipment", stackable: false, slot: "amulet" };
const PLATE_HELM: ItemDef = {
  id: "t4_plate_helm",
  name: "Plattenhelm",
  type: "equipment",
  stackable: false,
  slot: "helmet",
  armorRating: 50,
};
const LEATHER_HELM: ItemDef = {
  id: "t4_leather_helm",
  name: "Lederkappe",
  type: "equipment",
  stackable: false,
  slot: "helmet",
  evasionRating: 20,
};

function meleeWeapon(effects: WeaponEffect[] = []): ItemDef {
  return {
    id: "t4_weapon",
    name: "T4-Klinge",
    type: "equipment",
    stackable: false,
    slot: "mainhand",
    weaponStyle: "melee",
    weaponType: "sword",
    damageMin: 99,
    damageMax: 99,
    attackIntervalMs: 1000,
    weaponEffects: effects,
  };
}

const LOOT_ITEM: ItemDef = { id: "t4_loot", name: "Beute", type: "material", stackable: true, value: 1 };

function withContent(
  items: ItemDef[],
  monsters: MonsterDef[] = [dummy()],
  affixes: AffixDef[] = [],
): ContentDB {
  const c: ContentDB = {
    ...content,
    items: { ...content.items },
    monsters: { ...content.monsters },
    affixes: { ...(content.affixes ?? {}) },
  };
  for (const i of [...items, NOCRIT, SHIELD, AMULET, PLATE_HELM, LEATHER_HELM, LOOT_ITEM]) c.items[i.id] = i;
  for (const m of monsters) c.monsters[m.id] = m;
  for (const a of affixes) c.affixes![a.id] = a;
  return c;
}

/** Frischer Kampf: Skills eingefroren, Waffe/Offhand gesetzt, HP voll, Kampf gestartet. */
function newFight(
  c: ContentDB,
  weaponId: string | null,
  opts: { monsterId?: string; seed?: number; offhand?: string; start?: boolean } = {},
): GameState {
  const s = createGame({ name: "T4" }, c, opts.seed ?? 7);
  for (const id of FROZEN_SKILLS) s.skills[id] = { xp: xpForLevel(60) };
  s.character.gold = 1_000_000;
  s.character.equipment.mainhand = weaponId;
  s.character.equipment.offhand = opts.offhand ?? "t4_nocrit";
  s.character.hp = computeStats(s, c).maxHp;
  if (opts.start !== false) startCombat(s, c, opts.monsterId ?? "t4_dummy");
  return s;
}

const KILLABLE = (over: Partial<MonsterDef> = {}): MonsterDef => dummy({ maxHp: 40, ...over });

// ── Registrierung der Kinds ──────────────────────────────────────────────────

describe("Runen Tier IV: neue Spezial-Kinds sind registriert", () => {
  it("blockRestore/combatXp/lootChance stehen in SPECIAL_EFFECT_TYPES (status-coverage-Guard-Quelle)", () => {
    for (const kind of ["blockRestore", "combatXp", "lootChance"]) expect(SPECIAL_EFFECT_TYPES).toContain(kind);
  });

  it("ein T4-Affix (nur Index 3 belegt) zählt als Aktiv-Effekt ⇒ einmalig pro Item", () => {
    const def = t4Affix("affix_t4_probe", eff("combatXp", { magnitude: 0.1 }));
    expect(affixHasActiveEffect(def)).toBe(true);
    // Leere Lücken allein sind KEIN Effekt.
    expect(affixHasActiveEffect({ ...def, weaponEffectByTier: [undefined, undefined, undefined] })).toBe(false);
  });
});

// ── (a1) blockRestore ────────────────────────────────────────────────────────

describe("Runen Tier IV: blockRestore (Rune der Ungebrochenen Mauer, §4.2)", () => {
  const WALL = t4Affix("affix_unbroken_wall", eff("blockRestore", { magnitude: 0.02 }), {
    appliesTo: ["shield"],
    requiresTrinity: "blockChance",
  });
  const WALL_OVERCAP = t4Affix("affix_wall_overcap", eff("blockRestore", { magnitude: 0.5 }), {
    appliesTo: ["shield"],
    requiresTrinity: "blockChance",
  });
  // Treffsicherer Gegner mit 1-s-Takt: 8 Angriffe in 8 s, Schaden 4 (ungeblockt −4, geblockt −1).
  const HITTER = dummy({ id: "t4_hitter", accuracy: 1000, attackIntervalMs: 1000, damage: 4 });

  /** Schild ausrüsten, per Verzauberungstisch die Rune anbringen (echter Instanz-Pfad), Kampf starten. */
  function shieldFight(c: ContentDB, runeId: string | null, seed = 7): GameState {
    const s = newFight(c, null, { offhand: "t4_shield", monsterId: "t4_hitter", seed, start: false });
    if (runeId) {
      addItem(s.inventory, c, runeId, 1);
      const r = applyEnchant(s, c, { kind: "equipment", slot: "offhand" }, runeId);
      expect(r.ok).toBe(true);
    }
    // Leicht vorgeschädigt: eine Heilung bei voller Leiste wäre ein No-op (healPlayer), und 8 Blocks à
    // netto +1 reichen nie zurück auf Max ⇒ JEDER Block muss genau eine Heilung erzeugen.
    s.character.hp = computeStats(s, c).maxHp - 10;
    startCombat(s, c, "t4_hitter");
    return s;
  }

  const blocks = (s: GameState): number => s.combat.log.filter((e) => e.by === "player" && e.kind === "block").length;
  const heals = (s: GameState): number[] =>
    s.combat.log.filter((e) => e.by === "player" && e.kind === "heal" && e.source === "effect").map((e) => e.amount);

  it("jeder erfolgreiche Block heilt genau einmal um min(2 % maxHp, BLOCK_RESTORE_CAP_ABS) — ohne Rune keine Heilung", () => {
    const c = withContent([], [HITTER], [WALL]);
    c.items["rune_unbroken_wall_iv"] = rune("rune_unbroken_wall_iv", WALL.id);
    const s = shieldFight(c, "rune_unbroken_wall_iv");
    const maxHp = computeStats(s, c).maxHp;
    advance(s, c, 8_000);
    expect(s.character.hp).toBeGreaterThan(0);
    const b = blocks(s);
    expect(b).toBeGreaterThanOrEqual(1);
    expect(b).toBeLessThan(8); // mindestens ein ungeblockter Treffer (Block-Cap 0.5)
    const h = heals(s);
    expect(h).toHaveLength(b);
    const expected = Math.round(Math.min(maxHp * BLOCK_RESTORE_CAP_PCT, BLOCK_RESTORE_CAP_ABS));
    expect(expected).toBeGreaterThanOrEqual(1);
    for (const amount of h) expect(amount).toBe(expected);

    const bare = shieldFight(c, null);
    advance(bare, c, 8_000);
    expect(blocks(bare)).toBe(b); // gleiche RNG-Sequenz: die Rune zieht keinen zusätzlichen Wurf
    expect(heals(bare)).toHaveLength(0);
  });

  it("Deckel: magnitude 0.5 heilt nicht mehr als die Klemme (BLOCK_RESTORE_CAP_PCT/ABS)", () => {
    const c = withContent([], [HITTER], [WALL_OVERCAP]);
    c.items["rune_wall_overcap"] = rune("rune_wall_overcap", WALL_OVERCAP.id);
    const s = shieldFight(c, "rune_wall_overcap");
    const maxHp = computeStats(s, c).maxHp;
    advance(s, c, 8_000);
    const expected = Math.round(Math.min(maxHp * BLOCK_RESTORE_CAP_PCT, BLOCK_RESTORE_CAP_ABS));
    const h = heals(s);
    expect(h.length).toBeGreaterThanOrEqual(1);
    for (const amount of h) expect(amount).toBe(expected);
    expect(BLOCK_RESTORE_CAP_ABS).toBeLessThan(maxHp * 0.5); // die Klemme hat wirklich gegriffen
  });

  it("Determinismus: Offline-Catch-up in einem Stück == Live-Ticks (HP, RNG, Log bit-identisch)", () => {
    const c = withContent([], [HITTER], [WALL]);
    c.items["rune_unbroken_wall_iv"] = rune("rune_unbroken_wall_iv", WALL.id);
    const live = shieldFight(c, "rune_unbroken_wall_iv", 11);
    const offline = shieldFight(c, "rune_unbroken_wall_iv", 11);
    for (let i = 0; i < 80; i++) advance(live, c, 100);
    advance(offline, c, 8_000, { offline: true });
    expect(offline.character.hp).toBe(live.character.hp);
    expect(offline.rng).toEqual(live.rng);
    expect(offline.combat.log).toEqual(live.combat.log);
  });
});

// ── (a2) combatXp ────────────────────────────────────────────────────────────

describe("Runen Tier IV: combatXp (Rune der Chronik, §4.3)", () => {
  const CHRONICLE = t4Affix("affix_chronicle", eff("combatXp", { magnitude: 0.1 }), { appliesTo: ["jewelry"] });
  const CHRONICLE_OVERCAP = t4Affix("affix_chronicle_overcap", eff("combatXp", { magnitude: 5 }), {
    appliesTo: ["jewelry"],
  });
  // Level-60-Gegner ⇒ combatXpLevelMult 1 für die eingefrorenen L60-Skills; tötbar im ersten Schlag
  // (99 Schaden vs 40 HP) ⇒ Treffer-XP UND Kill-XP im selben Tick.
  const TARGET = KILLABLE({ id: "t4_target", level: 60, xp: 100 });

  /** Amulett ausrüsten und die Rune per Verzauberungstisch anbringen (Schmuck-INSTANZ-Pfad). */
  function amuletFight(c: ContentDB, runeId: string | null, seed = 7): GameState {
    const s = newFight(c, "t4_weapon", { monsterId: "t4_target", seed, start: false });
    addItem(s.inventory, c, "t4_amulet", 1);
    expect(equipItem(s, c, "t4_amulet").ok).toBe(true);
    if (runeId) {
      addItem(s.inventory, c, runeId, 1);
      const r = applyEnchant(s, c, { kind: "equipment", slot: "amulet" }, runeId);
      expect(r.ok).toBe(true);
    }
    startCombat(s, c, "t4_target");
    return s;
  }

  const gained = (s: GameState, skill: string): number => (s.skills[skill]?.xp ?? 0) - xpForLevel(60);

  it("+10 % auf Stil-XP, Vitality-XP und Kill-XP — aus einem Schmuck-Instanz-Affix gelesen", () => {
    const c = withContent([meleeWeapon()], [TARGET], [CHRONICLE]);
    c.items["rune_chronicle"] = rune("rune_chronicle", CHRONICLE.id);
    const base = amuletFight(c, null);
    const withRune = amuletFight(c, "rune_chronicle");
    advance(base, c, 1_000);
    advance(withRune, c, 1_000);
    expect(base.combat.kills).toBe(1);
    expect(withRune.combat.kills).toBe(1);
    for (const skill of ["attack", "power", "vitality"]) {
      expect(gained(base, skill)).toBeGreaterThan(0);
      expect(gained(withRune, skill) / gained(base, skill)).toBeCloseTo(1.1, 9);
    }
    // Slayer-XP läuft über einen eigenen Pfad und bleibt unberührt (hier: gar nicht vergeben).
    expect(withRune.skills.slayer?.xp ?? 0).toBe(base.skills.slayer?.xp ?? 0);
    // Kein zusätzlicher RNG-Draw: identische Sequenz.
    expect(withRune.rng).toEqual(base.rng);
  });

  it("Deckel: magnitude 5 wird auf COMBAT_XP_BONUS_CAP geklemmt", () => {
    const c = withContent([meleeWeapon()], [TARGET], [CHRONICLE_OVERCAP]);
    c.items["rune_chronicle_overcap"] = rune("rune_chronicle_overcap", CHRONICLE_OVERCAP.id);
    const base = amuletFight(c, null);
    const capped = amuletFight(c, "rune_chronicle_overcap");
    advance(base, c, 1_000);
    advance(capped, c, 1_000);
    expect(gained(capped, "attack") / gained(base, "attack")).toBeCloseTo(1 + COMBAT_XP_BONUS_CAP, 9);
  });

  it("Determinismus: Offline-Catch-up == Live-Ticks (Skills, Gold, RNG bit-identisch)", () => {
    const c = withContent([meleeWeapon()], [TARGET], [CHRONICLE]);
    c.items["rune_chronicle"] = rune("rune_chronicle", CHRONICLE.id);
    const live = amuletFight(c, "rune_chronicle", 13);
    const offline = amuletFight(c, "rune_chronicle", 13);
    for (let i = 0; i < 100; i++) advance(live, c, 100);
    advance(offline, c, 10_000, { offline: true });
    expect(offline.skills).toEqual(live.skills);
    expect(offline.character.gold).toBe(live.character.gold);
    expect(offline.rng).toEqual(live.rng);
    expect(offline.combat.kills).toBe(live.combat.kills);
  });
});

// ── (a3) lootChance ──────────────────────────────────────────────────────────

describe("Runen Tier IV: lootChance (Rune der Nachlese, §4.3)", () => {
  const GLEANING = t4Affix("affix_gleaning", eff("lootChance", { magnitude: 0.1 }), { appliesTo: ["jewelry"] });
  const GLEANING_OVERCAP = t4Affix("affix_gleaning_overcap", eff("lootChance", { magnitude: 5 }), {
    appliesTo: ["jewelry"],
  });

  /** Ein Kill gegen ein Ziel mit genau einem Loot-Eintrag der Chance `chance`; liefert die Beutemenge. */
  function drops(chance: number, affix: AffixDef | null, seed = 7): { qty: number; rng: unknown } {
    const target = KILLABLE({
      id: "t4_lootbag",
      loot: [{ itemId: "t4_loot", chance, min: 1, max: 1 }],
    });
    const c = withContent([meleeWeapon()], [target], affix ? [affix] : []);
    if (affix) c.items[`rune_${affix.id}`] = rune(`rune_${affix.id}`, affix.id);
    const s = newFight(c, "t4_weapon", { monsterId: "t4_lootbag", seed, start: false });
    addItem(s.inventory, c, "t4_amulet", 1);
    expect(equipItem(s, c, "t4_amulet").ok).toBe(true);
    if (affix) {
      addItem(s.inventory, c, `rune_${affix.id}`, 1);
      expect(applyEnchant(s, c, { kind: "equipment", slot: "amulet" }, `rune_${affix.id}`).ok).toBe(true);
    }
    startCombat(s, c, "t4_lootbag");
    advance(s, c, 1_000);
    expect(s.combat.kills).toBe(1);
    return { qty: itemCount(s.inventory, "t4_loot") + (s.bank["t4_loot"] ?? 0), rng: s.rng };
  }

  /** Kleinste Chance im 0,01-Raster, bei der der Loot-Wurf dieses Seeds OHNE Rune fällt (⇒ Wurfwert v ∈ (c*−0,01, c*]). */
  function baselineThreshold(): number {
    for (let i = 1; i <= 100; i++) {
      const c = i / 100;
      if (drops(c, null).qty === 1) return c;
    }
    throw new Error("Loot-Wurf fällt nie — Fixture defekt");
  }

  it("+10 % auf die Chance regulärer Loot-Tabellen: derselbe Wurf fällt bei 1/1,1 der Basischance", () => {
    const cStar = baselineThreshold();
    expect(cStar).toBeGreaterThan(0.02); // sonst ist der Grenzfall unten nicht unterscheidbar
    expect(drops(cStar - 0.01, null).qty).toBe(0); // Rasterkante ohne Rune: darunter kein Drop
    // Mit Rune reicht c*/1,1 (1,1·c ≥ c* ≥ v), knapp darunter nicht (1,1·c = c*−0,01 < v).
    expect(drops(cStar / 1.1 + 1e-6, GLEANING).qty).toBe(1);
    expect(drops((cStar - 0.01) / 1.1, GLEANING).qty).toBe(0);
  });

  it("Deckel: magnitude 5 wirkt wie LOOT_CHANCE_BONUS_CAP, nicht wie ×6", () => {
    const cStar = baselineThreshold();
    expect(cStar).toBeGreaterThan(0.02);
    expect(drops(cStar / (1 + LOOT_CHANCE_BONUS_CAP) + 1e-6, GLEANING_OVERCAP).qty).toBe(1);
    expect(drops(cStar / 6 + 1e-6, GLEANING_OVERCAP).qty).toBe(0); // ×6 wäre ein Drop gewesen
  });

  it("RNG-Disziplin: die Rune ändert nur den Vergleichswert, nie die Zahl der Würfe (Sequenz identisch)", () => {
    // Chance 1: in beiden Läufen fällt der Drop, die Folge-Draws (Menge, Suffix) sind identisch.
    expect(drops(1, GLEANING).rng).toEqual(drops(1, null).rng);
    // Chance 0: in beiden Läufen kein Drop, ebenfalls identisch (0·1,1 bleibt 0).
    expect(drops(0, GLEANING).qty).toBe(0);
    expect(drops(0, GLEANING).rng).toEqual(drops(0, null).rng);
  });
});

// ── (b) requiresTrinity-Gate ─────────────────────────────────────────────────

describe("Runen Tier IV: requiresTrinity-Gate (§4.2, Rüstungsrune ohne Trinity-Wert)", () => {
  const IRON_ANSWER = t4Affix("affix_iron_answer", eff("thorns", { magnitude: 2.5 }), {
    appliesTo: ["armor"],
    requiresTrinity: "armorRating",
  });
  const RING = "ring_master_attack"; // legendärer Meister-Ring aus dem echten Content (Tags any/jewelry/armor)

  function gateContent(): ContentDB {
    const c = withContent([], [dummy()], [IRON_ANSWER]);
    c.items["rune_iron_answer_iv"] = rune("rune_iron_answer_iv", IRON_ANSWER.id);
    return c;
  }

  it("haftet NICHT auf einem Meister-Ring (class_mismatch), obwohl Schmuck das armor-Tag trägt", () => {
    const c = gateContent();
    const ring = c.items[RING]!;
    expect(itemTypeTags(ring)).toContain("armor");
    expect(affixAppliesToItem(IRON_ANSWER.appliesTo, ring)).toBe(true); // der Tag-Filter allein ließe sie durch
    expect(trinityGatePasses(IRON_ANSWER, 4, ring)).toBe(false);

    const s = newFight(c, null, { start: false });
    addItem(s.inventory, c, RING, 1); // Slot 0
    addItem(s.inventory, c, "rune_iron_answer_iv", 1);
    const r = applyEnchant(s, c, { kind: "inventory", index: 0 }, "rune_iron_answer_iv");
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("class_mismatch");
    expect(s.inventory.instances).toHaveLength(0); // Promotion zurückgenommen
    expect(itemCount(s.inventory, RING)).toBe(1);
    expect(itemCount(s.inventory, "rune_iron_answer_iv")).toBe(1); // nichts verbraucht
    expect(enchantPreview(c, ring, "rune_iron_answer_iv").blockedReason).toBe("class_mismatch");
  });

  it("haftet auf Platte (armorRating>0), nicht auf Leder — und liefert den thorns-Proc in der Vorschau", () => {
    const c = gateContent();
    expect(trinityGatePasses(IRON_ANSWER, 4, c.items["t4_plate_helm"]!)).toBe(true);
    expect(trinityGatePasses(IRON_ANSWER, 4, c.items["t4_leather_helm"]!)).toBe(false);

    const s = newFight(c, null, { start: false });
    addItem(s.inventory, c, "t4_plate_helm", 1);
    addItem(s.inventory, c, "rune_iron_answer_iv", 1);
    equipItem(s, c, "t4_plate_helm");
    const r = applyEnchant(s, c, { kind: "equipment", slot: "helmet" }, "rune_iron_answer_iv");
    expect(r.ok).toBe(true);
    expect(r.instance?.affixes).toEqual([{ affixId: IRON_ANSWER.id, tier: 4 }]);

    const preview = enchantPreview(c, c.items["t4_plate_helm"]!, "rune_iron_answer_iv");
    expect(preview.canApply).toBe(true);
    expect(preview.addedProcs.map((p) => p.type)).toEqual(["thorns"]);
    expect(preview.changedKeys).toEqual([]); // reiner Aktiv-Effekt, kein Stat-Delta
    expect(enchantPreview(c, c.items["t4_leather_helm"]!, "rune_iron_answer_iv").blockedReason).toBe("class_mismatch");
  });

  it("Alt-Content unverändert: ohne requiresTrinity und ohne trinityByTier passiert das Gate überall", () => {
    const legacy = t4Affix("affix_legacy_armor_fx", eff("thorns", { magnitude: 1 }), { appliesTo: ["armor"] });
    const c = gateContent();
    expect(trinityGatePasses(legacy, 4, c.items[RING]!)).toBe(true);
    expect(trinityGatePasses(legacy, 4, c.items["t4_leather_helm"]!)).toBe(true);
    // Das Feld gated auch ohne Tier-Bezug: Schild-Bindung per blockChance.
    const wall = { ...legacy, requiresTrinity: "blockChance" as const };
    expect(trinityGatePasses(wall, 4, c.items["t4_shield"]!)).toBe(true);
    expect(trinityGatePasses(wall, 4, c.items["t4_plate_helm"]!)).toBe(false);
  });
});

// ── (c) Schmuck-Linie ────────────────────────────────────────────────────────

describe("Runen Tier IV: Schmuck-Linie (§4.3, appliesTo jewelry)", () => {
  const JEWELRY = [
    t4Affix("affix_bounty_t4", eff("bounty", { magnitude: 0.2 }), { appliesTo: ["jewelry"] }),
    t4Affix("affix_tallyman", eff("luckyStrike", { magnitude: 0.15 }), { appliesTo: ["jewelry"] }),
    t4Affix("affix_chronicle", eff("combatXp", { magnitude: 0.1 }), { appliesTo: ["jewelry"] }),
    t4Affix("affix_gleaning", eff("lootChance", { magnitude: 0.1 }), { appliesTo: ["jewelry"] }),
    t4Affix("affix_restless", eff("cooldownOnKill", { durationMs: 1000 }), { appliesTo: ["jewelry"] }),
  ];
  const RING = "ring_master_attack";

  function jewelryContent(): ContentDB {
    const c = withContent([meleeWeapon()], [dummy()], JEWELRY);
    for (const a of JEWELRY) c.items[`rune_${a.id}`] = rune(`rune_${a.id}`, a.id);
    return c;
  }

  it("jewelry-Tag greift auf Ring, Amulett und Umhang — nicht auf Rüstung oder Waffe", () => {
    const c = jewelryContent();
    const eq = Object.values(c.items).filter((i) => i.type === "equipment");
    const amulet = eq.find((i) => i.slot === "amulet")!;
    const cape = eq.find((i) => i.slot === "cape")!;
    const ring2 = eq.find((i) => i.slot === "ring2") ?? c.items[RING]!;
    for (const item of [c.items[RING]!, amulet, cape, ring2]) {
      expect(itemTypeTags(item)).toContain("jewelry");
      expect(affixAppliesToItem(["jewelry"], item)).toBe(true);
      expect(trinityGatePasses(JEWELRY[0]!, 4, item)).toBe(true); // kein Trinity-Gate auf der Schmuck-Linie
    }
    expect(affixAppliesToItem(["jewelry"], c.items["t4_plate_helm"]!)).toBe(false);
    expect(affixAppliesToItem(["jewelry"], c.items["t4_weapon"]!)).toBe(false);
    expect(affixAppliesToItem(["jewelry"], c.items["t4_shield"]!)).toBe(false);
  });

  it("alle 22 Meister-Ringe sind legendär ⇒ 4 Slots (enchantSlotsFor legendary/godly = 4)", () => {
    expect(enchantSlotsFor("legendary")).toBe(4);
    expect(enchantSlotsFor("godly")).toBe(4);
    // 21 Skill-Ringe (1.2.0 „Fasern und Fallen": +ring_master_hunting) + ring_master_completion.
    const masterRings = Object.values(content.items).filter((i) => i.id.startsWith("ring_master_"));
    expect(masterRings).toHaveLength(22);
    for (const r of masterRings) {
      expect(getItemRarity(r)).toBe("legendary");
      expect(enchantSlotsFor(getItemRarity(r))).toBe(4);
    }
  });

  it("vier VERSCHIEDENE Schmuck-Runen passen auf einen Meister-Ring, die fünfte scheitert am Slot-Limit", () => {
    const c = jewelryContent();
    const s = newFight(c, null, { start: false });
    addItem(s.inventory, c, RING, 1); // Slot 0
    for (const a of JEWELRY) addItem(s.inventory, c, `rune_${a.id}`, 1);
    const first = applyEnchant(s, c, { kind: "inventory", index: 0 }, `rune_${JEWELRY[0]!.id}`);
    expect(first.ok).toBe(true);
    const instanceId = first.instance!.instanceId;
    const ref = { kind: "inventory_instance" as const, instanceId };
    for (const a of JEWELRY.slice(1, 4)) expect(applyEnchant(s, c, ref, `rune_${a.id}`).ok).toBe(true);
    expect(first.instance!.affixes).toHaveLength(4);
    const fifth = applyEnchant(s, c, ref, `rune_${JEWELRY[4]!.id}`);
    expect(fifth.ok).toBe(false);
    expect(fifth.reason).toBe("no_affix_slots");
  });

  it("dieselbe Schmuck-Rune ist pro Item einmalig (duplicate_effect), Rune und Gold bleiben erhalten", () => {
    const c = jewelryContent();
    const s = newFight(c, null, { start: false });
    addItem(s.inventory, c, RING, 1); // Slot 0
    addItem(s.inventory, c, "rune_affix_chronicle", 2);
    const first = applyEnchant(s, c, { kind: "inventory", index: 0 }, "rune_affix_chronicle");
    expect(first.ok).toBe(true);
    const gold = s.character.gold;
    const again = applyEnchant(
      s,
      c,
      { kind: "inventory_instance", instanceId: first.instance!.instanceId },
      "rune_affix_chronicle",
    );
    expect(again.ok).toBe(false);
    expect(again.reason).toBe("duplicate_effect");
    expect(itemCount(s.inventory, "rune_affix_chronicle")).toBe(1);
    expect(s.character.gold).toBe(gold);
    expect(enchantPreview(c, first.instance!, "rune_affix_chronicle").blockedReason).toBe("duplicate_effect");
  });
});
