// claude:2026-10-25T10:00:00+02:00 — Raid „Die Hallen von Gobkha'raz“ (1.4.0 „Feder und Stahl“ Welle 4, Chef 23./24.10.2026).
// Gesamter Raid-Content an einer Stelle: 15 Monster (Spec 1.4.0-balance-raid.md §2.2, Phasen §3), 5 Raum-Dungeons (§2.4),
// 93 Items (31 Basisteile × Normal/Heroisch/Mythisch, §5), 3 Sets (§6), die `RaidDef` (§1/§4/§8) und die internen Erfolge (R10).
// `index.ts` bindet alles vor `applyContentLocales` ein. Texte: raid-text.ts (generiert aus design/lore/raid-gobkharaz*.md).
// Die Varianten entstehen per Funktion aus den Normal-Werten (×1,06 / ×1,12, Rundungsregeln Spec §5.1 Punkt 3), nicht als 93 Literale.
import type {
  AchievementDef,
  AttributeId,
  BossPhase,
  DungeonDef,
  ItemDef,
  LocalizedString,
  MonsterDef,
  RaidDef,
  RaidDifficulty,
  RaidLootRow,
  SetDef,
  SetTierDef,
  SkillId,
  WeaponEffect,
} from "@hearthforge/shared";
import { RAID_DIFFICULTIES, RAID_VARIANT_SUFFIX } from "@hearthforge/shared";
import { RAID_DESC_ENDE, RAID_LOC7, RAID_NAME_ENDE, RAID_PHASE_TEXT } from "./raid-text";

// ───────────────────────────────────────────────────────────────────────────
// Varianten-Mathematik (Spec §5.1)
// ───────────────────────────────────────────────────────────────────────────

/** Faktor je Stufe auf alle Zahlen außer Takt, Effekt-Chancen/-Dauern, Schwellen, n, Stapel, spellFocus, blockChance. */
export const RAID_VARIANT_FACTOR: Readonly<Record<RaidDifficulty, number>> = { normal: 1, heroic: 1.06, mythic: 1.12 };
export const RAID_ITEM_VALUE: Readonly<Record<RaidDifficulty, number>> = { normal: 30_000, heroic: 50_000, mythic: 90_000 };
export const RAID_RARITY: Readonly<Record<RaidDifficulty, "godly" | "heroic" | "mythic">> = { normal: "godly", heroic: "heroic", mythic: "mythic" };
const DIFFS: readonly RaidDifficulty[] = RAID_DIFFICULTIES;

/** Runden auf d Nachkommastellen (mit kleinem Epsilon gegen Gleitkomma-Halbwerte wie 0,265). */
function rnd(x: number, d: number): number {
  const f = 10 ** d;
  return Math.round(x * f + 1e-9) / f;
}

/** Dezimalwert über die drei Stufen: strikt steigend (mindestens ein Rundungsschritt). */
function ladder(n: number, d: number): [number, number, number] {
  const stepv = 1 / 10 ** d;
  const h0 = rnd(n * RAID_VARIANT_FACTOR.heroic, d);
  const h = h0 > n ? h0 : rnd(n + stepv, d);
  const m0 = rnd(n * RAID_VARIANT_FACTOR.mythic, d);
  const m = m0 > h ? m0 : rnd(h + stepv, d);
  return [n, h, m];
}

/**
 * Ganzzahlige Attribute über die drei Stufen: je Wert `round(x · Faktor)`, nie unter der Vorstufe; die Attributsumme steigt
 * strikt (fehlt der Schritt, bekommt das größte Attribut +1, bei Gleichstand das erste). Spec §5.1 Punkt 3.
 */
function attrLadder<K extends string>(n: Record<K, number>): [Record<K, number>, Record<K, number>, Record<K, number>] {
  const sum = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0);
  const out: Record<K, number>[] = [{ ...n }];
  let prev: Record<K, number> = n;
  let prevSum = sum(n);
  for (const f of [RAID_VARIANT_FACTOR.heroic, RAID_VARIANT_FACTOR.mythic]) {
    const cur = {} as Record<K, number>;
    for (const k of Object.keys(n) as K[]) cur[k] = Math.max(prev[k], Math.round(n[k] * f + 1e-9));
    let s = sum(cur);
    while (s <= prevSum) {
      let best = (Object.keys(cur) as K[])[0]!;
      for (const k of Object.keys(cur) as K[]) if (cur[k] > cur[best]) best = k;
      cur[best] += 1;
      s += 1;
    }
    out.push(cur);
    prev = cur;
    prevSum = s;
  }
  return out as [Record<K, number>, Record<K, number>, Record<K, number>];
}

/** Ganzzahl-Zusatzwert (Hauptattribut-Skillboost): round(x·f), monoton, ohne Strikt-Zwang. */
function intLadder(n: number): [number, number, number] {
  const h = Math.max(n, Math.round(n * RAID_VARIANT_FACTOR.heroic + 1e-9));
  const m = Math.max(h, Math.round(n * RAID_VARIANT_FACTOR.mythic + 1e-9));
  return [n, h, m];
}

/** Stellen für eine Effekt-Stärke: unter 0,1 drei Stellen, unter 1 zwei, sonst eine (Spec §5.1 Punkt 3). */
function magDigits(x: number): number {
  return x < 0.1 ? 3 : x < 1 ? 2 : 1;
}

/** Effekt über die Stufen: Stärke skaliert, Chance/Dauer/Schwelle/Stapel bleiben; `catalyst` skaliert seine Dauer (auf 100 ms). */
function effectLadder(e: WeaponEffect): [WeaponEffect, WeaponEffect, WeaponEffect] {
  if (e.type === "catalyst") {
    const d = ladder(e.durationMs / 100, 0);
    return [e, { ...e, durationMs: d[1] * 100 }, { ...e, durationMs: d[2] * 100 }];
  }
  if (e.magnitude === 0) return [e, { ...e }, { ...e }];
  const m = ladder(e.magnitude, magDigits(e.magnitude));
  return [e, { ...e, magnitude: m[1] }, { ...e, magnitude: m[2] }];
}

// ───────────────────────────────────────────────────────────────────────────
// Items
// ───────────────────────────────────────────────────────────────────────────

type Mods = Partial<Record<AttributeId, number>>;
interface RaidItemBase {
  id: string;
  slot: ItemDef["slot"];
  icon: string;
  weaponStyle?: ItemDef["weaponStyle"];
  weaponType?: ItemDef["weaponType"];
  twoHanded?: boolean;
  /** Schaden min–max (1 Nachkommastelle) und Takt (unverändert über die Stufen). */
  dmg?: [number, number];
  interval?: number;
  /** Trinity-Kernwert: Plattenrüstung, Leder-Ausweichen, Stoff-Ward. */
  armorRating?: number;
  evasionRating?: number;
  wardCapacity?: number;
  /** Schild: Block bleibt am Deckel 0,5 (keine Skalierung). */
  blockChance?: number;
  mods: Mods;
  /** Hauptattribut + Stil-Skillboost (Schmuck/Umhang, Spec §5.4). */
  primary?: [number, number];
  regen?: number;
  critChance?: number;
  precision?: number;
  armorPen?: number;
  wardBreak?: number;
  spellFocus?: number;
  magicTheme?: ItemDef["magicTheme"];
  effect?: WeaponEffect;
  effects?: WeaponEffect[];
  req: Partial<Record<SkillId, number>>;
}

const fx = (type: WeaponEffect["type"], magnitude: number, durationMs = 0, extra: Partial<WeaponEffect> = {}, chance = 1): WeaponEffect => ({
  type,
  chance,
  magnitude,
  durationMs,
  ...extra,
});

const HP_REGEN = 0.3; // alle 15 Set-Teile (Spec §5.4 „dito“)

/** Die 31 Basisteile (Normal-Werte, Spec §5.2 bis §5.4). Reihenfolge der Attribute = Reihenfolge der Spec (Gleichstand: das erste). */
const RAID_BASES: RaidItemBase[] = [
  // ── Waffen (§5.2). Bögen: Schaden hier = Anhebung auf „bester Bogen des Typs × 1,09“ nach dem Fernkampf-Rework (Spec §5.1 Punkt 9). ──
  {
    id: "gk_tally_dagger", slot: "mainhand", icon: "🗡️", weaponStyle: "melee", weaponType: "dagger",
    dmg: [11.6, 16.9], interval: 2400, precision: 0.3, mods: { dex: 2, lck: 4 },
    effect: fx("bleed", 8, 6000, {}, 0.45), effects: [fx("critBurst", 10)], req: { attack: 99 },
  },
  {
    id: "gk_quarter_maul", slot: "mainhand", icon: "🔨", weaponStyle: "melee", weaponType: "maul", twoHanded: true,
    dmg: [32.8, 76.3], interval: 3700, armorPen: 0.42, mods: { str: 6, con: 2, lck: 3 },
    effect: fx("bleed", 10, 7000, {}, 0.4), effects: [fx("everyNth", 0.8, 0, { stacks: 4 })], req: { attack: 99 },
  },
  {
    id: "gk_pit_scimitar", slot: "mainhand", icon: "⚔️", weaponStyle: "melee", weaponType: "scimitar",
    dmg: [14.8, 28.1], interval: 2900, precision: 0.17, mods: { str: 2, lck: 3 },
    effect: fx("bleed", 9, 6500, {}, 0.5), effects: [fx("momentum", 0.02, 0, { stacks: 10 })], req: { attack: 99 },
  },
  {
    id: "gk_king_greatsword", slot: "mainhand", icon: "⚔️", weaponStyle: "melee", weaponType: "greatsword", twoHanded: true,
    dmg: [39.5, 76.5], interval: 3700, armorPen: 0.42, mods: { str: 3, lck: 7 },
    effect: fx("bleed", 13, 8500, {}, 0.6), effects: [fx("giantSlayer", 0.22)], req: { attack: 99 },
  },
  {
    // Bogen nach FK: bester Langbogen `nameless_longbow` 7,92/s × 1,09 = 8,63/s; hier 20,8–31,1 @3000 = 8,65/s (Spec-Vorwert 16,7–25,0 war vor dem Rework).
    id: "gk_pit_longbow", slot: "mainhand", icon: "🏹", weaponStyle: "ranged", weaponType: "longbow", twoHanded: true,
    dmg: [20.8, 31.1], interval: 3000, precision: 0.27, mods: { dex: 2, lck: 5 },
    effect: fx("poison", 3.5, 7000, {}, 0.6), effects: [fx("eagleEye", 0)], req: { ranged: 99 },
  },
  {
    // Bogen nach FK: bester Kurzbogen `crownless_warbow` 9,28/s × 1,09 = 10,12/s; hier 22,6–31,1 @2650 = 10,13/s (Spec-Vorwert 18,1–25,0).
    id: "gk_king_shortbow", slot: "mainhand", icon: "🏹", weaponStyle: "ranged", weaponType: "shortbow", twoHanded: true,
    dmg: [22.6, 31.1], interval: 2650, precision: 0.17, mods: { dex: 2, lck: 7 },
    effect: fx("poison", 3.5, 7000, {}, 0.55), effects: [fx("giantSlayer", 0.22)], req: { ranged: 99 },
  },
  {
    id: "gk_fel_staff", slot: "mainhand", icon: "🪄", weaponStyle: "magic", weaponType: "staff", twoHanded: true,
    dmg: [18.3, 27.1], interval: 2700, spellFocus: 0.0032, wardBreak: 0.33, magicTheme: "fire", mods: { int: 2, wis: 6, lck: 7 },
    effect: fx("burn", 13, 8500, {}, 0.65), effects: [fx("catalyst", 0, 2000)], req: { magic: 99 },
  },
  {
    id: "gk_fel_wand", slot: "mainhand", icon: "🪄", weaponStyle: "magic", weaponType: "wand",
    dmg: [8.6, 10.8], interval: 2580, spellFocus: 0.0027, wardBreak: 0.22, magicTheme: "fire", mods: { int: 2, wis: 3 },
    effect: fx("burn", 8, 6500, {}, 0.45), effects: [fx("everyNth", 0.5, 0, { stacks: 5 })], req: { magic: 99 },
  },
  {
    id: "gk_king_scepter", slot: "mainhand", icon: "🪄", weaponStyle: "magic", weaponType: "scepter",
    dmg: [12.6, 15.8], interval: 3000, spellFocus: 0.0027, wardBreak: 0.27, magicTheme: "fire", mods: { int: 2, wis: 4, lck: 5 },
    effect: fx("burn", 9, 7000, {}, 0.5), effects: [fx("execute", 0.27, 0, { threshold: 0.2 })], req: { magic: 99 },
  },
  // ── Nebenhand (§5.3) ──
  {
    id: "gk_tally_focus", slot: "offhand", icon: "🔮", weaponStyle: "magic", weaponType: "focus",
    mods: { int: 7, wis: 9, lck: 3 }, effect: fx("vengeance", 0.3), req: { magic: 99 },
  },
  {
    id: "gk_quarter_shield", slot: "offhand", icon: "🛡️", armorRating: 24.0, blockChance: 0.5, regen: 0.25,
    mods: { str: 9, con: 21, lck: 6 }, effect: fx("thorns", 2.5), req: { defence: 99 },
  },
  {
    // Köcher relativ zum Bestand (Spec §5.3): jeder Wert des besten FK-Köchers (`godiron_quiver`: dex 9, lck 3, Krit 0,04, Präzision 0,08) × 1,10.
    // ammoSaver 0,25 laut Spec-Tabelle (der Bestands-Köcher × 1,10 wäre nur 0,165).
    id: "gk_quarter_quiver", slot: "offhand", icon: "🎒", weaponStyle: "ranged", weaponType: "quiver",
    critChance: 0.044, precision: 0.088, mods: { dex: 10, lck: 3 }, effect: fx("ammoSaver", 0.25), req: { ranged: 99 },
  },
  // ── Set Blutschwur (Platte, Nahkampf) ──
  { id: "gk_bleed_head", slot: "helmet", icon: "⛑️", armorRating: 31.0, regen: HP_REGEN, mods: { str: 9, con: 10, lck: 3 }, req: { defence: 99 } },
  { id: "gk_bleed_chest", slot: "body", icon: "🛡️", armorRating: 46.2, regen: HP_REGEN, mods: { str: 18, con: 22, lck: 3 }, req: { defence: 99 } },
  { id: "gk_bleed_legs", slot: "legs", icon: "👖", armorRating: 33.9, regen: HP_REGEN, mods: { str: 11, con: 13, lck: 3 }, req: { defence: 99 } },
  { id: "gk_bleed_hands", slot: "gloves", icon: "🧤", armorRating: 21.6, regen: HP_REGEN, mods: { str: 8, con: 8, lck: 4 }, req: { defence: 99 } },
  { id: "gk_bleed_feet", slot: "boots", icon: "🥾", armorRating: 21.6, regen: HP_REGEN, mods: { str: 8, con: 8, lck: 4 }, req: { defence: 99 } },
  // ── Set Pirschgewand (Leder, Fernkampf) ──
  { id: "gk_poison_head", slot: "helmet", icon: "⛑️", evasionRating: 29.7, regen: HP_REGEN, mods: { dex: 8, con: 10, lck: 4 }, req: { ranged: 99 } },
  { id: "gk_poison_chest", slot: "body", icon: "🛡️", evasionRating: 44.6, regen: HP_REGEN, mods: { dex: 15, con: 24, lck: 4 }, req: { ranged: 99 } },
  { id: "gk_poison_legs", slot: "legs", icon: "👖", evasionRating: 34.1, regen: HP_REGEN, mods: { dex: 9, con: 14, lck: 4 }, req: { ranged: 99 } },
  { id: "gk_poison_hands", slot: "gloves", icon: "🧤", evasionRating: 20.8, regen: HP_REGEN, mods: { dex: 7, con: 9, lck: 4 }, req: { ranged: 99 } },
  { id: "gk_poison_feet", slot: "boots", icon: "🥾", evasionRating: 20.8, regen: HP_REGEN, mods: { dex: 7, con: 9, lck: 4 }, req: { ranged: 99 } },
  // ── Set Ornat (Stoff, Magie) ──
  { id: "gk_fire_head", slot: "helmet", icon: "👑", wardCapacity: 141, regen: HP_REGEN, mods: { int: 9, con: 11, wis: 3 }, req: { magic: 99 } },
  { id: "gk_fire_chest", slot: "body", icon: "👗", wardCapacity: 211, regen: HP_REGEN, mods: { int: 18, con: 25, wis: 3 }, req: { magic: 99 } },
  { id: "gk_fire_legs", slot: "legs", icon: "👖", wardCapacity: 155, regen: HP_REGEN, mods: { int: 11, con: 15, wis: 3 }, req: { magic: 99 } },
  { id: "gk_fire_hands", slot: "gloves", icon: "🧤", wardCapacity: 99, regen: HP_REGEN, mods: { int: 8, con: 8, wis: 4 }, req: { magic: 99 } },
  { id: "gk_fire_feet", slot: "boots", icon: "🥾", wardCapacity: 99, regen: HP_REGEN, mods: { int: 8, con: 8, wis: 4 }, req: { magic: 99 } },
  // ── Schmuck mit Hauptattribut (§5.4, Anforderung Lebenskraft 99) ──
  { id: "gk_tally_ring", slot: "ring1", icon: "💍", primary: [12, 4], regen: 0.15, mods: { con: 9, lck: 5 }, effect: fx("healOnKill", 5), req: { vitality: 99 } },
  { id: "gk_fel_ring", slot: "ring1", icon: "💍", primary: [12, 4], regen: 0.1, mods: { con: 6, wis: 4, lck: 5 }, effect: fx("catalyst", 0, 1500), req: { vitality: 99 } },
  { id: "gk_pit_amulet", slot: "amulet", icon: "📿", primary: [14, 5], regen: 0.35, mods: { con: 16, wis: 3, lck: 5 }, req: { vitality: 99 } },
  { id: "gk_king_cape", slot: "cape", icon: "🧥", primary: [16, 3], regen: 0.25, mods: { con: 8, lck: 7 }, effect: fx("desperation", 0.3, 0, { threshold: 0.3 }), req: { vitality: 99 } },
];

function buildItem(b: RaidItemBase, diff: RaidDifficulty): ItemDef {
  const t = DIFFS.indexOf(diff);
  const pick = <T,>(arr: readonly [T, T, T]): T => arr[t]!;
  // Hauptattribut zählt in die Attributsumme (strikt steigend), darum in dieselbe Leiter; vorne einsortiert (Gleichstand: zuerst).
  const ordered: Record<string, number> = b.primary ? { __primary: b.primary[0], ...b.mods } : { ...b.mods };
  const mods = pick(attrLadder(ordered));
  const out: ItemDef = {
    id: b.id + RAID_VARIANT_SUFFIX[diff],
    name: RAID_NAME_ENDE[b.id]!,
    type: "equipment",
    stackable: false,
    icon: b.icon,
    slot: b.slot,
    requirements: { ...b.req },
    value: RAID_ITEM_VALUE[diff],
    rarity: RAID_RARITY[diff],
    tier: 13,
    description: RAID_DESC_ENDE[b.id]!,
  };
  if (diff !== "normal") out.variantOf = b.id;
  const modifiers: Mods = {};
  for (const [k, v] of Object.entries(mods)) {
    if (k === "__primary") out.primaryAttribute = v;
    else modifiers[k as AttributeId] = v;
  }
  if (Object.keys(modifiers).length > 0) out.modifiers = modifiers;
  if (b.primary) out.primarySkillBoost = pick(intLadder(b.primary[1]));
  if (b.weaponStyle) out.weaponStyle = b.weaponStyle;
  if (b.weaponType) out.weaponType = b.weaponType;
  if (b.twoHanded) out.twoHanded = true;
  if (b.dmg && b.interval) {
    out.damageMin = pick(ladder(b.dmg[0], 1));
    out.damageMax = pick(ladder(b.dmg[1], 1));
    out.attackIntervalMs = b.interval;
  }
  if (b.armorRating !== undefined) out.armorRating = pick(ladder(b.armorRating, 1));
  if (b.evasionRating !== undefined) out.evasionRating = pick(ladder(b.evasionRating, 1));
  if (b.wardCapacity !== undefined) out.wardCapacity = pick(ladder(b.wardCapacity, 0));
  if (b.blockChance !== undefined) out.blockChance = b.blockChance;
  const bonus: NonNullable<ItemDef["bonus"]> = {};
  if (b.regen !== undefined) bonus.hpRegenPerSec = pick(ladder(b.regen, 2));
  if (b.critChance !== undefined) bonus.critChance = pick(ladder(b.critChance, 3));
  if (Object.keys(bonus).length > 0) out.bonus = bonus;
  if (b.precision !== undefined) out.precision = pick(ladder(b.precision, 2 + (b.precision < 0.1 ? 1 : 0)));
  if (b.armorPen !== undefined) out.armorPen = pick(ladder(b.armorPen, 2));
  if (b.wardBreak !== undefined) out.wardBreak = pick(ladder(b.wardBreak, 2));
  if (b.spellFocus !== undefined) out.spellFocus = b.spellFocus; // Deckel-Guard: nie skaliert
  if (b.magicTheme) out.magicTheme = b.magicTheme;
  if (b.effect) out.weaponEffect = pick(effectLadder(b.effect));
  if (b.effects) out.weaponEffects = b.effects.map((e) => pick(effectLadder(e)));
  return out;
}

/** Alle 93 Raid-Items (31 Basisteile × 3 Stufen), nach ID. */
export const RAID_ITEMS: Record<string, ItemDef> = (() => {
  const items: Record<string, ItemDef> = {};
  for (const b of RAID_BASES) for (const d of DIFFS) items[b.id + RAID_VARIANT_SUFFIX[d]] = buildItem(b, d);
  return items;
})();
/** Die 31 Basis-IDs (Normal) in Spec-Reihenfolge. */
export const RAID_BASE_IDS: readonly string[] = RAID_BASES.map((b) => b.id);

// ───────────────────────────────────────────────────────────────────────────
// Monster (§2.2) und Bossphasen (§3)
// ───────────────────────────────────────────────────────────────────────────

type Infl = NonNullable<MonsterDef["inflict"]>;
const infl = (type: Infl["type"], chance: number, magnitude: number, durationMs: number): Infl => ({ type, chance, magnitude, durationMs });

interface RaidMonsterRow {
  id: string;
  family: NonNullable<MonsterDef["family"]>;
  level: number;
  hp: number;
  ward?: number;
  damage: number;
  interval: number;
  accuracy: number;
  evasion: number;
  defense: number;
  regen?: number;
  inflict?: Infl;
  resist?: MonsterDef["resist"];
  xp: number;
}

const RAID_MONSTER_ROWS: RaidMonsterRow[] = [
  { id: "gk_toll_thug", family: "humanoid", level: 305, hp: 2050, damage: 205, interval: 3400, accuracy: 28, evasion: 5, defense: 150, xp: 9250 },
  { id: "gk_gate_pikeman", family: "humanoid", level: 308, hp: 1800, damage: 160, interval: 2800, accuracy: 29, evasion: 4, defense: 180, inflict: infl("bleed", 0.25, 1.4, 5000), xp: 8100 },
  { id: "gk_tallymistress", family: "humanoid", level: 318, hp: 10450, damage: 270, interval: 3400, accuracy: 29, evasion: 8, defense: 165, regen: 1.0, xp: 109750 },
  { id: "gk_armory_breaker", family: "humanoid", level: 310, hp: 2300, damage: 215, interval: 3600, accuracy: 28, evasion: 3, defense: 210, xp: 10350 },
  { id: "gk_ballista_gunner", family: "humanoid", level: 312, hp: 1700, damage: 170, interval: 3000, accuracy: 31, evasion: 30, defense: 130, xp: 7650 },
  { id: "gk_quartermaster", family: "humanoid", level: 322, hp: 11600, damage: 280, interval: 3600, accuracy: 29, evasion: 6, defense: 185, regen: 1.0, xp: 121800 },
  { id: "gk_pit_hound", family: "beast", level: 314, hp: 1600, damage: 125, interval: 2100, accuracy: 29, evasion: 55, defense: 115, inflict: infl("bleed", 0.3, 1.5, 5000), xp: 7200 },
  { id: "gk_beastkeeper", family: "humanoid", level: 316, hp: 2200, damage: 180, interval: 3200, accuracy: 29, evasion: 6, defense: 160, inflict: infl("poison", 0.3, 1.2, 6000), xp: 9900 },
  { id: "gk_pitmother", family: "humanoid", level: 326, hp: 12200, damage: 285, interval: 3400, accuracy: 30, evasion: 10, defense: 170, regen: 1.2, xp: 128100 },
  { id: "gk_fel_acolyte", family: "demon", level: 318, hp: 850, ward: 1300, damage: 175, interval: 3000, accuracy: 30, evasion: 6, defense: 125, inflict: infl("burn", 0.3, 1.5, 6000), resist: ["burn"], xp: 9700 },
  { id: "gk_ember_warden", family: "humanoid", level: 320, hp: 2500, damage: 190, interval: 3400, accuracy: 30, evasion: 4, defense: 195, inflict: infl("burn", 0.25, 1.2, 6000), resist: ["frost"], xp: 11250 },
  { id: "gk_felmagus", family: "demon", level: 330, hp: 9300, ward: 3050, damage: 290, interval: 3200, accuracy: 30, evasion: 8, defense: 150, regen: 1.0, xp: 129700 },
  { id: "gk_crownguard", family: "humanoid", level: 322, hp: 3050, damage: 215, interval: 3400, accuracy: 30, evasion: 5, defense: 220, inflict: infl("bleed", 0.25, 1.5, 5000), xp: 13750 },
  { id: "gk_bannerman", family: "humanoid", level: 320, hp: 2300, damage: 185, interval: 3000, accuracy: 30, evasion: 6, defense: 170, regen: 3.0, xp: 10350 },
  { id: "gk_warking", family: "humanoid", level: 340, hp: 18050, damage: 310, interval: 3400, accuracy: 31, evasion: 10, defense: 190, regen: 1.5, xp: 189550 },
];

/**
 * Bossphasen (Spec §3). `atHpPct` als Anteil 0..1 (wie `enrage.belowHpPct`); Prozentwerte der Spec sind Anteile
 * (`healPerHitPct: 0.0015` = 0,15 % maxHp je Treffer). Texte (Name, Ansage) aus der Lore in 7 Sprachen.
 */
function phasesOf(bossId: string, defs: Array<Omit<BossPhase, "logKey" | "name" | "announce">>): BossPhase[] {
  const text = RAID_PHASE_TEXT[bossId]!;
  return defs.map((d, i) => ({ ...d, logKey: `${bossId}.phase${i + 1}`, name: text[i]!.name, announce: text[i]!.announce }));
}

const RAID_PHASES: Record<string, BossPhase[]> = {
  // Vrikka §3.1: Schuldbuch-Ward · Zinseszins (Takt-Rampe) · Eintreibung (Wut + Blutung)
  gk_tallymistress: phasesOf("gk_tallymistress", [
    { atHpPct: 0.75, wardShieldPct: 0.12 },
    { atHpPct: 0.5, intervalRamp: { everyMs: 10_000, mult: 0.94, maxStacks: 5 } },
    { atHpPct: 0.25, attackIntervalMult: 0.8, damageMult: 1.3, inflict: infl("bleed", 0.4, 2.5, 6000) },
  ]),
  // Krogg §3.2: Mark-Panzer (Rüstung 290) · Ballistensalve (jeder 4. Angriff ×3) · Letzte Ausgabe (Rüstung 80, Tempo +40 %)
  gk_quartermaster: phasesOf("gk_quartermaster", [
    { atHpPct: 0.75, defense: 290 },
    { atHpPct: 0.5, defense: 290, everyNth: { n: 4, mult: 3 } },
    { atHpPct: 0.25, defense: 80, attackIntervalMult: 0.714 },
  ]),
  // Ushka §3.3: Rudelruf (Gift) · Kette fällt (Doppelangriffe + Blutung) · Mutterwut (Wut + Heilung je Treffer 0,15 % maxHp)
  gk_pitmother: phasesOf("gk_pitmother", [
    { atHpPct: 0.75, inflict: infl("poison", 0.4, 1.8, 6000) },
    { atHpPct: 0.5, attackIntervalMult: 0.5, damageMult: 0.55, inflict: infl("bleed", 0.3, 2.0, 6000) }, // claude:2026-10-25T16:45:00+02:00 — 0,60 → 0,55 (§13 V3)
    { atHpPct: 0.25, attackIntervalMult: 0.5, damageMult: 0.65, healPerHitPct: 0.0015, inflict: infl("poison", 0.4, 1.8, 6000) }, // claude:2026-10-25T16:45:00+02:00 — 0,75 → 0,65 (§13 V4, Ushka P3 war der Mythisch-Killer)
  ]),
  // Zil'gath §3.4: Felschild (Ward 20 %) · Brandopfer (Brand auf dich, Feuerresistenz) · Der Gläubiger blickt her (Schaden ×1,25, stärkerer Brand)
  gk_felmagus: phasesOf("gk_felmagus", [
    { atHpPct: 0.75, wardShieldPct: 0.2 },
    { atHpPct: 0.5, inflict: infl("burn", 0.45, 2.5, 6000), resist: ["burn"] },
    { atHpPct: 0.25, damageMult: 1.25, inflict: infl("burn", 0.6, 4.0, 7000) },
  ]),
  // Rakkzul §3.5: je eine Mechanik der vier Vorgänger, zuletzt Erbe des Krieges (Wut + Brand)
  gk_warking: phasesOf("gk_warking", [
    { atHpPct: 0.75, wardShieldPct: 0.1 },
    { atHpPct: 0.5, everyNth: { n: 4, mult: 2 } },
    { atHpPct: 0.25, everyNth: { n: 4, mult: 2 }, inflict: infl("poison", 0.4, 1.8, 6000) },
    { atHpPct: 0.1, everyNth: { n: 4, mult: 2 }, damageMult: 1.25, inflict: infl("burn", 0.5, 3.0, 6000) },
  ]),
};

/** Die 15 Raid-Monster (Normal-Werte; Stufen-Faktoren und die verstärkte Welle 4 skaliert die Engine, keine eigene ID). */
export const RAID_MONSTERS: Record<string, MonsterDef> = (() => {
  const out: Record<string, MonsterDef> = {};
  for (const r of RAID_MONSTER_ROWS) {
    const m: MonsterDef = {
      id: r.id,
      family: r.family,
      zone: "idolhall", // Bestand: alle Götzenhallen-Dungeon-Monster tragen die Zone `idolhall` (Bestiarium-Gruppierung)
      name: RAID_NAME_ENDE[r.id]!,
      dungeonOnly: true,
      level: r.level,
      maxHp: r.hp,
      damage: r.damage,
      accuracy: r.accuracy,
      evasion: r.evasion,
      defense: r.defense,
      attackIntervalMs: r.interval,
      xp: r.xp,
      gold: 0,
      loot: [], // die Raid-Beute (Boss-Tabellen, Trash, Nebenbeute) kommt aus `content.raids`, nicht aus Monster-Loot
    };
    // defenseType ist Pflicht (content-integrity); nur Tag, die Engine liest es nicht: Caster ward, Grubenhund evasion, Rest armor.
    m.defenseType = r.ward ? "ward" : r.id === "gk_pit_hound" ? "evasion" : "armor";
    if (r.ward) m.wardCapacity = r.ward;
    if (r.regen) m.regen = r.regen;
    if (r.inflict) m.inflict = r.inflict;
    if (r.resist) m.resist = r.resist;
    const phases = RAID_PHASES[r.id];
    if (phases) m.phases = phases;
    out[r.id] = m;
  }
  return out;
})();

// ───────────────────────────────────────────────────────────────────────────
// Räume als Dungeons (§2.4)
// ───────────────────────────────────────────────────────────────────────────

/** [Welle 1, Welle 2, Boss]; Welle 3 = Welle 1, Welle 4 = Welle 2 (verstärkt). */
const ROOM_ENCOUNTERS: Array<[string, string, string]> = [
  ["gk_toll_thug", "gk_gate_pikeman", "gk_tallymistress"],
  ["gk_armory_breaker", "gk_ballista_gunner", "gk_quartermaster"],
  ["gk_pit_hound", "gk_beastkeeper", "gk_pitmother"],
  ["gk_fel_acolyte", "gk_ember_warden", "gk_felmagus"],
  ["gk_crownguard", "gk_bannerman", "gk_warking"],
];
const ROOM_IDS = ["gk_room_1", "gk_room_2", "gk_room_3", "gk_room_4", "gk_room_5"] as const;

/** Die fünf Raum-Dungeons (`raidOnly`, ohne chest: Gebühr, Beute und Rast steuert der Raid-Lauf). */
export const RAID_DUNGEONS: DungeonDef[] = ROOM_IDS.map((id, i) => {
  const [w1, w2, boss] = ROOM_ENCOUNTERS[i]!;
  return {
    id,
    name: RAID_NAME_ENDE[id]!,
    zone: "idolhall",
    requiredLevel: 99, // Empfehlung (Chef 25.07.: kein Kampfstufen-Gate)
    requiresQuest: "chronicle_20", // Kapitel 20 (Drazhan) = Raid-Freischaltung A7; hält die Kapitel-Kette der Dungeon-Empfehlungen monoton (progression-band.test.ts)
    raidOnly: true,
    encounters: [w1, w2, w1, w2, boss],
    waveMeta: [{}, {}, {}, { kind: "elite" }, { kind: "boss" }],
    // claude:2026-10-25T05:15:00+02:00 — leere Truhe: liefert die 8-s-Atempause vor dem Boss (Boss-Intro, Spec §2.4), keine Beute.
    chest: { loot: [] },
    loot: [],
    xp: 0,
    gold: 0,
  } satisfies DungeonDef;
});

// ───────────────────────────────────────────────────────────────────────────
// Sets (§6)
// ───────────────────────────────────────────────────────────────────────────

const setPieces = (prefix: string): string[] => ["head", "chest", "legs", "hands", "feet"].map((s) => `${prefix}_${s}`);

const tier = (pieces: number, modifiers: Mods, rest: Partial<SetTierDef> = {}): SetTierDef => ({ pieces, modifiers, ...rest });

export const RAID_SETS: SetDef[] = [
  {
    // Ornat des geliehenen Feuers (Magie, Stoff): Brand-Zins, dann Eintreibung mit Ward-Rückfluss
    id: "gk_fire",
    name: RAID_NAME_ENDE.gk_fire!,
    pieces: setPieces("gk_fire"),
    minPieces: 2,
    bonus: {},
    tiers: [
      tier(2, { int: 6, con: 6 }, { effects: [{ kind: "burnDamagePct", value: 0.2 }, { kind: "burnDurationMs", value: 2000 }] }),
      tier(4, { int: 6, con: 6, lck: 4 }, { effects: [{ kind: "fireInterest", perStack: 0.015, maxStacks: 8 }] }),
      tier(5, { int: 6, con: 6, lck: 4 }, {
        skillBoost: { magic: 6 },
        effects: [{ kind: "fireCollection", every: 5, value: 0.2, perStack: 0.02, wardPct: 1 }],
      }),
    ],
  },
  {
    // Pirschgewand der Grubenmeute (Fernkampf, Leder): Seuche (7 Stapel, Rüstung ignorieren), dann Ausbruch
    id: "gk_poison",
    name: RAID_NAME_ENDE.gk_poison!,
    pieces: setPieces("gk_poison"),
    minPieces: 2,
    bonus: {},
    tiers: [
      tier(2, { dex: 6, con: 6 }, { effects: [{ kind: "poisonDamagePct", value: 0.2 }] }),
      tier(4, { dex: 6, con: 6, lck: 4 }, { effects: [{ kind: "creepingPlague", maxStacks: 7, perStack: 0.01 }] }),
      tier(5, { dex: 6, con: 6, lck: 4 }, {
        skillBoost: { ranged: 6 },
        effects: [{ kind: "outbreak", value: 1, cooldownMs: 8000 }],
      }),
    ],
  },
  {
    // Blutschwur der Kronwache (Nahkampf, Platte): offene Wunden (3 Stapel, Krit nach Deckel), dann Blutzoll
    id: "gk_bleed",
    name: RAID_NAME_ENDE.gk_bleed!,
    pieces: setPieces("gk_bleed"),
    minPieces: 2,
    bonus: {},
    tiers: [
      tier(2, { str: 6, con: 6 }, { effects: [{ kind: "bleedDamagePct", value: 0.2 }] }),
      tier(4, { str: 6, con: 6, lck: 4 }, { effects: [{ kind: "openWounds", maxStacks: 3, value: 0.15, perStack: 0.03 }] }),
      tier(5, { str: 6, con: 6, lck: 4 }, {
        skillBoost: { power: 6 },
        effects: [{ kind: "bloodToll", value: 1.25, healPct: 0.2, cooldownMs: 8000 }],
      }),
    ],
  },
];

// ───────────────────────────────────────────────────────────────────────────
// Raid-Definition (§1, §4, §8)
// ───────────────────────────────────────────────────────────────────────────

/** Boss-Tabellen §4.1: Set-Teil-Slot je Raum für alle drei Stile (Gewicht 3), Unikate (Gewicht 2). */
const BOSS_TABLES: Array<{ slot: string; uniques: string[]; draws: number }> = [
  { slot: "hands", uniques: ["gk_tally_dagger", "gk_tally_focus", "gk_tally_ring"], draws: 1 },
  { slot: "feet", uniques: ["gk_quarter_maul", "gk_quarter_shield", "gk_quarter_quiver"], draws: 1 },
  { slot: "legs", uniques: ["gk_pit_longbow", "gk_pit_scimitar", "gk_pit_amulet"], draws: 1 },
  { slot: "head", uniques: ["gk_fel_staff", "gk_fel_wand", "gk_fel_ring"], draws: 1 },
  { slot: "chest", uniques: ["gk_king_greatsword", "gk_king_shortbow", "gk_king_scepter", "gk_king_cape"], draws: 2 },
];

const row = (
  itemId: string,
  chance: number,
  normal: [number, number],
  heroic: [number, number] = normal,
  mythic: [number, number] = normal,
): RaidLootRow => ({ itemId, chance, qty: { normal, heroic, mythic } });

export const RAID_GOBKHARAZ: RaidDef = {
  id: "gobkharaz",
  name: RAID_LOC7["raid:gobkharaz"]!,
  unlockDungeonId: "behind_the_throne", // A7: nach dem ersten Sieg über Drazhan
  rooms: ROOM_IDS.map((id, i) => {
    const t = BOSS_TABLES[i]!;
    const bossId = ROOM_ENCOUNTERS[i]![2];
    return {
      id,
      name: RAID_LOC7[`room:${id}`]!,
      dungeonId: id,
      bossId,
      table: {
        draws: t.draws,
        extraChance: 0.15,
        entries: [
          ...["fire", "poison", "bleed"].map((s) => ({ itemId: `gk_${s}_${t.slot}`, weight: 3 })),
          ...t.uniques.map((itemId) => ({ itemId, weight: 2 })),
        ],
      },
      intro: RAID_LOC7[`intro:${bossId}`]!,
    };
  }),
  fees: { normal: 300_000, heroic: 900_000, mythic: 2_500_000 },
  heroicRestartCost: 100_000,
  mythicRefundPct: 0.25,
  scaling: {
    normal: { hpMult: 1, damageMult: 1, levelAdd: 0, defenseMult: 1 },
    heroic: { hpMult: 2.0, damageMult: 1.6, levelAdd: 10, defenseMult: 1.1 },
    mythic: { hpMult: 2.4, damageMult: 1.7, levelAdd: 20, defenseMult: 1.2 }, // claude:2026-10-25T16:45:00+02:00 — 1,85 → 1,70 (Nachmessung §13 V2: Mythisch-Todesrisiko)
  },
  reinforcedWave: { index: 3, hpMult: 1.5, damageMult: 1.15 },
  // §4.2 Trash-Beute je Kill (Reliktstaub, Götzeneisen, Götzensplitter, Seelenopal, Onyx, Götzenherz; kein Gold)
  trashLoot: [
    row("relic_dust", 1.0, [1, 1], [1, 2], [2, 3]),
    row("godiron_bar", 0.2, [1, 2], [1, 3], [2, 3]),
    row("idol_shard", 0.25, [1, 3], [2, 3], [2, 4]),
    row("soulopal", 0.15, [1, 2]),
    row("onyx", 0.05, [1, 1]),
    row("idol_heart", 0.01, [1, 1]),
  ],
  trashPieceChance: { normal: 0.004, heroic: 0.005, mythic: 0.006 },
  // §4.3 Boss-Nebenbeute zusätzlich zur Item-Ziehung
  bossSideLoot: [
    { itemId: "relic_dust", chance: 1.0, qty: { normal: [6, 6], heroic: [10, 10], mythic: [15, 15] } },
    row("godiron_bar", 1.0, [2, 4]),
    row("onyx", 0.5, [1, 2]),
    row("idol_heart", 0.25, [1, 1]),
  ],
  suffixChance: { normal: 0.3, heroic: 0.4, mythic: 0.5 },
  // §4.4 Wöchentliche Erstkill-Truhe: +1 Teil aus der Boss-Tabelle (Engine), dazu Staub und Götzeneisen
  weeklyChest: { extraItems: [{ itemId: "godiron_bar", qty: 5 }], dust: { normal: 15, heroic: 25, mythic: 40 } },
  maxAutoRestarts: 3,
};

// ───────────────────────────────────────────────────────────────────────────
// Interne Erfolge (R10; nicht in der Steam-Liste). Texte 7-sprachig inline, ohne Gedankenstriche.
// ───────────────────────────────────────────────────────────────────────────

type L7 = Record<"en" | "de" | "es" | "fr" | "pt-BR" | "ru" | "zh", string>;
const loc7 = (f: (l: keyof L7) => string): LocalizedString => ({
  en: f("en"), de: f("de"), es: f("es"), fr: f("fr"), "pt-BR": f("pt-BR"), ru: f("ru"), zh: f("zh"),
});
const DIFF_LABEL: Record<RaidDifficulty, L7> = {
  normal: { en: "Normal", de: "Normal", es: "Normal", fr: "Normal", "pt-BR": "Normal", ru: "Обычный", zh: "普通" },
  heroic: { en: "Heroic", de: "Heroisch", es: "Heroico", fr: "Héroïque", "pt-BR": "Heroico", ru: "Героический", zh: "英雄" },
  mythic: { en: "Mythic", de: "Mythisch", es: "Mítico", fr: "Mythique", "pt-BR": "Mítico", ru: "Мифический", zh: "神话" },
};
const VICTORY: L7 = { en: "Victory", de: "Sieg", es: "Victoria", fr: "Victoire", "pt-BR": "Vitória", ru: "Победа", zh: "击败" };
const CONQUEST: L7 = { en: "Conquest", de: "Eroberung", es: "Conquista", fr: "Conquête", "pt-BR": "Conquista", ru: "Покорение", zh: "通关" };
const RAID_BOSS_IDS = ["gk_tallymistress", "gk_quartermaster", "gk_pitmother", "gk_felmagus", "gk_warking"] as const;
const KILL_RARITY: Record<RaidDifficulty, AchievementDef["rarity"]> = { normal: "rare", heroic: "epic", mythic: "legendary" };
const CLEAR_RARITY: Record<RaidDifficulty, AchievementDef["rarity"]> = { normal: "epic", heroic: "legendary", mythic: "legendary" };

const killDesc: Record<keyof L7, (boss: string, diff: string) => string> = {
  en: (b, d) => `Defeat ${b} in the Halls of Gobkha'raz. Difficulty: ${d}.`,
  de: (b, d) => `Besiege ${b} in den Hallen von Gobkha'raz. Schwierigkeit: ${d}.`,
  es: (b, d) => `Derrota a ${b} en Las Salas de Gobkha'raz. Dificultad: ${d}.`,
  fr: (b, d) => `Vaincs ${b} dans les Salles de Gobkha'raz. Difficulté : ${d}.`,
  "pt-BR": (b, d) => `Derrote ${b} nos Salões de Gobkha'raz. Dificuldade: ${d}.`,
  ru: (b, d) => `Победите босса в Залах Гобкха'раза: ${b}. Сложность: ${d}.`,
  zh: (b, d) => `在戈布卡拉兹大厅击败${b}。难度：${d}。`,
};
const clearDesc: Record<keyof L7, (d: string) => string> = {
  en: (d) => `Clear the Halls of Gobkha'raz by defeating the War-King. Difficulty: ${d}.`,
  de: (d) => `Schließe die Hallen von Gobkha'raz ab, indem du den Kriegskönig besiegst. Schwierigkeit: ${d}.`,
  es: (d) => `Completa Las Salas de Gobkha'raz derrotando al Rey de Guerra. Dificultad: ${d}.`,
  fr: (d) => `Termine les Salles de Gobkha'raz en vainquant le Roi de guerre. Difficulté : ${d}.`,
  "pt-BR": (d) => `Conclua os Salões de Gobkha'raz derrotando o Rei de Guerra. Dificuldade: ${d}.`,
  ru: (d) => `Пройдите Залы Гобкха'раза, победив Военного короля. Сложность: ${d}.`,
  zh: (d) => `击败战王，通关戈布卡拉兹大厅。难度：${d}。`,
};

export const RAID_ACHIEVEMENTS: AchievementDef[] = [
  ...RAID_BOSS_IDS.flatMap((bossId) =>
    DIFFS.map((d): AchievementDef => ({
      id: `ach_raid_${bossId}_${d}`,
      name: loc7((l) => `${(RAID_LOC7[`boss:${bossId}`] as Record<string, string>)[l]}: ${VICTORY[l]} (${DIFF_LABEL[d][l]})`),
      description: loc7((l) => killDesc[l]((RAID_LOC7[`boss:${bossId}`] as Record<string, string>)[l]!, DIFF_LABEL[d][l])),
      category: "combat",
      rarity: KILL_RARITY[d],
      condition: { type: "raid_boss_kills", target: `${bossId}:${d}`, count: 1 },
    })),
  ),
  ...DIFFS.map((d): AchievementDef => ({
    id: `ach_raid_clear_${d}`,
    name: loc7((l) => `${(RAID_LOC7["raid:gobkharaz"] as Record<string, string>)[l]}: ${CONQUEST[l]} (${DIFF_LABEL[d][l]})`),
    description: loc7((l) => clearDesc[l](DIFF_LABEL[d][l])),
    category: "combat",
    rarity: CLEAR_RARITY[d],
    condition: { type: "raid_clears", target: d, count: 1 },
  })),
  {
    id: "ach_raid_mythic_uniques",
    name: { en: "Mythic Armory", de: "Mythische Rüstkammer", es: "Arsenal mítico", fr: "Arsenal mythique", "pt-BR": "Arsenal Mítico", ru: "Мифический арсенал", zh: "神话武库" },
    description: {
      en: "Find all 16 mythic unique pieces of the Halls of Gobkha'raz.",
      de: "Finde alle 16 mythischen Unikate der Hallen von Gobkha'raz.",
      es: "Encuentra las 16 piezas únicas míticas de Las Salas de Gobkha'raz.",
      fr: "Trouve les 16 pièces uniques mythiques des Salles de Gobkha'raz.",
      "pt-BR": "Encontre as 16 peças únicas míticas dos Salões de Gobkha'raz.",
      ru: "Найдите все 16 уникальных мифических предметов Залов Гобкха'раза.",
      zh: "找齐戈布卡拉兹大厅的16件神话独特装备。",
    },
    category: "combat",
    rarity: "legendary",
    condition: { type: "raid_mythic_uniques", count: 16 },
  },
  // claude:2026-10-25T05:25:00+02:00 — Set komplett (R10): je Raid-Set, Varianten zählen mit (engine sets_completed mit target).
  {
    id: "ach_raid_set_fire",
    name: { en: "Regalia of the Borrowed Fire", de: "Ornat des geliehenen Feuers", es: "Ornamentos del Fuego Prestado", fr: "Ornements du Feu emprunté", "pt-BR": "Ornamentos do Fogo Emprestado", ru: "Облачение заёмного огня", zh: "借火法衣" },
    description: { en: "Own all five pieces of Regalia of the Borrowed Fire. Heroic and mythic pieces count too.", de: "Besitze alle fünf Teile von „Ornat des geliehenen Feuers“. Heroische und mythische Teile zählen mit.", es: "Consigue las cinco piezas de Ornamentos del Fuego Prestado. Las piezas heroicas y míticas también cuentan.", fr: "Possède les cinq pièces de Ornements du Feu emprunté. Les pièces héroïques et mythiques comptent aussi.", "pt-BR": "Tenha as cinco peças de Ornamentos do Fogo Emprestado. Peças heroicas e míticas também contam.", ru: "Соберите все пять предметов комплекта «Облачение заёмного огня». Героические и мифические тоже считаются.", zh: "集齐“借火法衣”的全部五件。英雄和神话部件同样计入。" },
    category: "combat",
    rarity: "epic",
    condition: { type: "sets_completed", target: "gk_fire", count: 1 },
  },
  {
    id: "ach_raid_set_poison",
    name: { en: "Pitpack Stalker's Garb", de: "Pirschgewand der Grubenmeute", es: "Atuendo de Acechador de la Jauría", fr: "Tenue du rôdeur de la Meute", "pt-BR": "Traje do Espreitador da Matilha", ru: "Облачение ловчего Ямной своры", zh: "兽坑猎群潜行装" },
    description: { en: "Own all five pieces of Pitpack Stalker's Garb. Heroic and mythic pieces count too.", de: "Besitze alle fünf Teile von „Pirschgewand der Grubenmeute“. Heroische und mythische Teile zählen mit.", es: "Consigue las cinco piezas de Atuendo de Acechador de la Jauría. Las piezas heroicas y míticas también cuentan.", fr: "Possède les cinq pièces de Tenue du rôdeur de la Meute. Les pièces héroïques et mythiques comptent aussi.", "pt-BR": "Tenha as cinco peças de Traje do Espreitador da Matilha. Peças heroicas e míticas também contam.", ru: "Соберите все пять предметов комплекта «Облачение ловчего Ямной своры». Героические и мифические тоже считаются.", zh: "集齐“兽坑猎群潜行装”的全部五件。英雄和神话部件同样计入。" },
    category: "combat",
    rarity: "epic",
    condition: { type: "sets_completed", target: "gk_poison", count: 1 },
  },
  {
    id: "ach_raid_set_bleed",
    name: { en: "Bloodoath of the Crownguard", de: "Blutschwur der Kronwache", es: "Juramento de Sangre de la Guardia de la Corona", fr: "Serment de sang de la Garde de la Couronne", "pt-BR": "Juramento de Sangue da Guarda da Coroa", ru: "Кровавая клятва Коронной стражи", zh: "王冠卫队血誓" },
    description: { en: "Own all five pieces of Bloodoath of the Crownguard. Heroic and mythic pieces count too.", de: "Besitze alle fünf Teile von „Blutschwur der Kronwache“. Heroische und mythische Teile zählen mit.", es: "Consigue las cinco piezas de Juramento de Sangre de la Guardia de la Corona. Las piezas heroicas y míticas también cuentan.", fr: "Possède les cinq pièces de Serment de sang de la Garde de la Couronne. Les pièces héroïques et mythiques comptent aussi.", "pt-BR": "Tenha as cinco peças de Juramento de Sangue da Guarda da Coroa. Peças heroicas e míticas também contam.", ru: "Соберите все пять предметов комплекта «Кровавая клятва Коронной стражи». Героические и мифические тоже считаются.", zh: "集齐“王冠卫队血誓”的全部五件。英雄和神话部件同样计入。" },
    category: "combat",
    rarity: "epic",
    condition: { type: "sets_completed", target: "gk_bleed", count: 1 },
  },
];
