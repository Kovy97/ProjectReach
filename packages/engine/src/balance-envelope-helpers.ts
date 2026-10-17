import type {
  AffixDef,
  AttributeId,
  ContentDB,
  EquipBonus,
  EquipSlot,
  GameState,
  ItemDef,
  ItemId,
  ItemInstance,
  MonsterDef,
  PetDef,
  PetId,
  SuffixDef,
  TrinityStats,
  WeaponStyle,
} from "@hearthforge/shared";
import {
  ATTRIBUTE_IDS,
  EQUIP_SLOTS,
  affixAppliesToItem,
  enchantSlotsFor,
  getItemRarity,
  instanceBonusDelta,
} from "@hearthforge/shared";
import { createGame } from "./state";
import { grantAllZones } from "./test-helpers";
import { xpForLevel } from "./leveling";
import { affixHasActiveEffect, trinityGatePasses } from "./enchant";
import { grantPet, equipPet, equipSecondPet } from "./pets";

/**
 * Balance-Envelope-Helfer (BiS-Red-Team-Suite, Chef-GO 2026-07-09).
 *
 * `buildBisCharacter` baut den STAT-MAXIMALEN LEGALEN Worst-Case-Build für einen Kampfstil und
 * eine Ziel-Stat, rein per Content-Scan (kein Id-Pinning): bestes Gear je Slot, maximale
 * Suffix-Rolls (ilvl 100, roll 1 — die Skala clamps bei ilvl 100, Drops von L100+-Monstern sind
 * jederzeit legal erreichbar), Verzauberungs-Maxima (Tier-III-Runen, alle Rarity-Slots), die
 * stärksten Trank-/Brew-Buffs und das beste Pet-Passiv der Ziel-Stat. Verallgemeinerung des
 * Voll-Stack-Guards aus crit-taming.test.ts (#294).
 *
 * LEGALITÄT (jeder Baustein ist über echte Spielpfade erreichbar):
 *  - Gear: `requirements` ≤ targetLevel (und ≤ 99 = levelFromXp-Hard-Cap) — Spiegel von
 *    `meetsRequirements` (equipment.ts). 2H-Mainhand ⇒ offhand leer (Spiegel der Verdrängung).
 *  - Suffixe: Pool-Filter wie `suffixPool` (appliesTo ∩ itemTypeTags, ilvl ≥ minIlvl).
 *  - Verzauberungen: appliesTo + Trinity-Klassen-Gate (`trinityGatePasses`) + es MUSS eine
 *    Tier-III-Rune im Item-Katalog existieren (`item.rune`) — sonst ist der Affix nicht anbringbar.
 *    Seit dem Chef-Entscheid vom 25.08.2026 duerfen STAT-Runen GESTAPELT werden, AKTIV-EFFEKT-
 *    Runen (Flamme/Frost/Schock) dagegen nicht ⇒ der Worst Case fuellt jeden Rarity-Slot greedy
 *    mit dem hoechstbewerteten noch ERLAUBTEN Affix (Score > 0, Max-Rune-Tier). Ein Stat-Affix
 *    bleibt erlaubt und wiederholt sich dadurch; ein Proc-Affix scheidet nach seiner ersten
 *    Verwendung aus. Das ist die groesste LEGALE Belegung — und nur eine legale taugt als
 *    obere Schranke.
 *  - Buffs: seit red-team #303 L3 verdrängt `applyConsumableBuff` pro `buff.category` (max. 1 aktiv
 *    je Kategorie) ⇒ `allBuffs: true` aktiviert den BESTEN Ziel-Stat-Buff JE KATEGORIE plus alle
 *    kategorielosen Buff-Items (die stapeln weiter frei — heute nur die 2–4-s-HoT-Heiltränke);
 *    default nur der stärkste einzelne (das „ein Trank"-Szenario).
 *
 * DETERMINISTISCH: kein RNG-Draw (Suffix-Instanzen werden direkt konstruiert, roll fix = 1.0);
 * alle argmax-Sortierungen brechen Gleichstände über die Item-Id (stabil ggü. Content-Reihenfolge).
 * Set-Boni werden NICHT aktiv optimiert (nur wenn die per-Slot-argmax-Teile zufällig ein Set
 * bilden) — für die Cap-Envelopes irrelevant (Clamps), für Pins dokumentierte Vereinfachung.
 *
 * MEISTERRINGE / `ItemDef.masterPerk` (Meisterweihe-Fundament, master-capes-konzept.md; seit
 * SAVE 69 Ringe statt Capes — sie konkurrieren damit im ring1-Top-2-Pfad statt im Cape-Slot):
 * masterPerk-Träger laufen als NORMALE Kandidaten durch den Content-Scan — der Builder schließt
 * sie NICHT aus, ihre STAT-BLÖCKE (modifiers/bonus/skillBoost der Ring-Archetypen) konkurrieren
 * regulär im per-Slot-argmax. Der masterPerk SELBST trägt bewusst KEINE scoreContribution-Zeile:
 * die 8 Perk-Kinds sind reine ÖKONOMIE-Effekte (Doppelertrag/Input-Sparer/Buff-Dauer/…), die
 * keinen computeStats-Term speisen — die KAMPF-Envelope dieser Suite können sie per Konstruktion
 * nicht verschieben. Ihre Ökonomie-Decke misst/pinnt die Envelope-Suite separat (§8-Inventur,
 * balance-envelope.test.ts). Zu beachten: die Ringe tragen `requirements: { <skill>: 99 }` — auf
 * den heutigen Mess-Tiers (CL 30/60/90 < 99) sind sie via requirementsOk ohnehin nie legal; erst
 * ein targetLevel-99-Build kann sie tragen (dann ehrlich neu messen & pinnen). Der vormals
 * geparkte ring_master_enchanting ist ENTFERNT (Welle TT, Chef-Entscheid 2026-07-18: Enchanting
 * in Runecrafting integriert — kein Enchanting-Skill, kein 22. Ring).
 */

/** Welche Stat der Build maximiert (Score-Profile unten). */
export type BisTarget = "crit" | "haste" | "dodge" | "tank" | "lifesteal" | "ward" | "damage";

/** Normalisierte Beitragsform einer Quelle (Item/Suffix/Affix/Buff) fürs Scoring. */
interface Contribution {
  attrs: Partial<Record<AttributeId, number>>;
  bonus: EquipBonus;
  trinity: TrinityStats;
}

function emptyContribution(): Contribution {
  return {
    attrs: {},
    bonus: {},
    trinity: { armorRating: 0, evasionRating: 0, wardCapacity: 0, blockChance: 0 },
  };
}

function addAttrs(
  into: Partial<Record<AttributeId, number>>,
  from: Partial<Record<AttributeId, number>> | undefined,
): void {
  if (!from) return;
  for (const id of ATTRIBUTE_IDS) {
    if (from[id]) into[id] = (into[id] ?? 0) + (from[id] ?? 0);
  }
}

function addBonus(into: EquipBonus, from: EquipBonus | undefined): void {
  if (!from) return;
  for (const key of Object.keys(from) as (keyof EquipBonus)[]) {
    const v = from[key];
    if (typeof v === "number") into[key] = (into[key] ?? 0) + v;
  }
}

/**
 * Ranking-Score einer Beitragsform für die Ziel-Stat. NUR fürs argmax (relative Ordnung) —
 * die ECHTEN Werte kommen ausschließlich aus computeStats. Gewichte ~ marginale Wirkung der
 * jeweiligen computeStats-Terme (Attribut-Sättigungskurven grob linearisiert).
 */
function scoreContribution(target: BisTarget, c: Contribution, style: WeaponStyle): number {
  const a = (id: AttributeId): number => c.attrs[id] ?? 0;
  const b = c.bonus;
  switch (target) {
    case "crit":
      // S-Punkte (dex·0.4+lck·0.6) + Flat-Zeilen; Flats zählen stark (Attribut-Kurve saturiert).
      return a("dex") * 0.4 + a("lck") * 0.6 + (b.critChance ?? 0) * 200 + (b.critDamage ?? 0) * 60;
    case "haste":
      // Gespartes Intervall in ms: dex·40 + negative attackIntervalMs-Deltas.
      return a("dex") * 40 - (b.attackIntervalMs ?? 0);
    case "dodge":
      // Leder-Voll-Vermeidung primär; DEX/eq.evasion (Accuracy-Contest) sekundär.
      return c.trinity.evasionRating * 100 + (a("dex") * 0.3 + (b.evasion ?? 0)) * 10;
    case "tank":
      return c.trinity.armorRating * 100 + c.trinity.blockChance * 2000 + a("con") * 2 + (b.maxHp ?? 0);
    case "lifesteal":
      return (b.lifesteal ?? 0) * 1000;
    case "ward":
      return c.trinity.wardCapacity * 10 + a("wis");
    case "damage": {
      const attrDmg =
        style === "ranged" ? a("dex") * 0.24 : style === "magic" ? a("int") * 0.34 : a("str") * 0.3;
      const flat =
        style === "ranged"
          ? (b.rangedDamage ?? 0)
          : style === "magic"
            ? (b.magicDamage ?? 0)
            : (b.meleeDamage ?? 0);
      // Krit/Tempo als DPS-Nebenwährung leicht mitgewichten.
      return attrDmg + flat + (b.critChance ?? 0) * 3 + (b.critDamage ?? 0) * 1 - (b.attackIntervalMs ?? 0) * 0.002;
    }
  }
}

/** Spiegel von meetsRequirements: alle Skill-Anforderungen ≤ targetLevel (und ≤ 99, Level-Hard-Cap). */
function requirementsOk(item: ItemDef, targetLevel: number): boolean {
  const cap = Math.min(targetLevel, 99);
  return Object.values(item.requirements ?? {}).every((lvl) => typeof lvl !== "number" || lvl <= cap);
}

/**
 * Beitragsform eines getragenen Items (Spiegel der computeStats-Aggregation):
 *  - Range-Form-Mainhand: Offensiv-Flats (damage/accuracy/attackIntervalMs) werden IGNORIERT
 *    (Doppelzähl-Schutz in computeStats) — nur die Whitelist-Zeilen zählen.
 *  - armorRating der Mainhand zählt NICHT (computeStats lässt die Waffe aus, #221).
 */
function itemContribution(item: ItemDef, slot: EquipSlot): Contribution {
  const c = emptyContribution();
  addAttrs(c.attrs, item.modifiers);
  const isRangeForm =
    typeof item.damageMin === "number" &&
    typeof item.damageMax === "number" &&
    Number.isFinite(item.damageMin) &&
    Number.isFinite(item.damageMax);
  if (item.bonus) {
    if (isRangeForm && slot === "mainhand") {
      const {
        meleeDamage: _md,
        rangedDamage: _rd,
        magicDamage: _gd,
        accuracy: _acc,
        attackIntervalMs: _spd,
        ...whitelisted
      } = item.bonus;
      addBonus(c.bonus, whitelisted);
    } else {
      addBonus(c.bonus, item.bonus);
    }
  }
  if (slot !== "mainhand") c.trinity.armorRating += item.armorRating ?? 0;
  c.trinity.evasionRating += item.evasionRating ?? 0;
  c.trinity.wardCapacity += item.wardCapacity ?? 0;
  c.trinity.blockChance = Math.max(c.trinity.blockChance, item.blockChance ?? 0);
  return c;
}

/** Beitragsform eines Suffix bei ilvl/roll-Maximum — über den ECHTEN Resolver (instanceBonusDelta). */
function suffixContribution(content: ContentDB, suffixId: string, ilvl: number): Contribution {
  const inst: ItemInstance = {
    instanceId: "bis-score",
    baseItemId: "bis-score",
    affixes: [],
    suffix: { suffixId, ilvl, roll: 1 },
  };
  const delta = instanceBonusDelta(inst, content);
  const c = emptyContribution();
  addAttrs(c.attrs, delta.modifiers);
  addBonus(c.bonus, delta.bonus);
  return c;
}

/** Beitragsform eines Affix auf `tier` (1-basiert). */
function affixContribution(def: AffixDef, tier: number): Contribution {
  const c = emptyContribution();
  addBonus(c.bonus, def.bonusByTier?.[tier - 1]);
  addAttrs(c.attrs, def.modifiersByTier?.[tier - 1]);
  const tri = def.trinityByTier?.[tier - 1];
  if (tri) {
    c.trinity.armorRating += tri.armorRating ?? 0;
    c.trinity.evasionRating += tri.evasionRating ?? 0;
    c.trinity.wardCapacity += tri.wardCapacity ?? 0;
    c.trinity.blockChance = Math.max(c.trinity.blockChance, tri.blockChance ?? 0);
  }
  return c;
}

/** Beitragsform eines Consumable-Buffs (bonus + modifiers + trinity). */
function buffContribution(item: ItemDef): Contribution | null {
  const buff = item.buff;
  if (!buff) return null;
  const c = emptyContribution();
  addBonus(c.bonus, buff.bonus);
  addAttrs(c.attrs, buff.modifiers);
  if (buff.trinity) {
    c.trinity.armorRating += buff.trinity.armorRating ?? 0;
    c.trinity.evasionRating += buff.trinity.evasionRating ?? 0;
    c.trinity.wardCapacity += buff.trinity.wardCapacity ?? 0;
    c.trinity.blockChance = Math.max(c.trinity.blockChance, buff.trinity.blockChance ?? 0);
  }
  return c;
}

/** Pet-Score je Ziel-Stat (die wenigen globalen Kampf-Passiva; 0 = kein Pet lohnt sich). */
function petScore(target: BisTarget, pet: PetDef, style: WeaponStyle): number {
  const eff = pet.skillEffect;
  if (!eff) return 0;
  if (target === "lifesteal" && eff.kind === "lifesteal") return (eff.value ?? 0) * 1000;
  if (target === "tank" && eff.kind === "damageReduction") return (eff.value ?? 0) * 1000;
  // claude:2026-10-18T02:00:00+02:00 — 1.3.0: Eisenschlund „Eisenkiefer" (styleDamage, +3 % Schaden des Stils) ersetzt den
  // früheren skillBoost +2 Power; nur der passende Stil zahlt auf den Schaden ein.
  if (target === "damage" && eff.kind === "styleDamage") return eff.style === style ? (eff.value ?? 0) * 100 : 0;
  if (target === "damage" && eff.kind === "skillBoost") {
    // Nur der Boost des STIL-Offense-/Damage-Skills zahlt auf den Schaden ein.
    const relevant =
      style === "melee"
        ? eff.skill === "power" || eff.skill === "attack"
        : style === "ranged"
          ? eff.skill === "ranged"
          : eff.skill === "magic";
    return relevant ? (eff.value ?? 0) : 0;
  }
  return 0;
}

/** Deterministisches argmax: höchster Score gewinnt, Gleichstand → kleinste Id (Content-reihenfolge-stabil). */
function argmax<T>(items: T[], score: (t: T) => number, id: (t: T) => string): T | null {
  let best: T | null = null;
  let bestScore = -Infinity;
  for (const it of items) {
    const s = score(it);
    if (s > bestScore || (s === bestScore && best !== null && id(it) < id(best))) {
      best = it;
      bestScore = s;
    }
  }
  return best;
}

export interface BisBuild {
  state: GameState;
  target: BisTarget;
  style: WeaponStyle;
  /** Gewähltes Gear je Slot (nur belegte Slots). */
  kit: Partial<Record<EquipSlot, ItemId>>;
  /** Gewählter Suffix je Slot (nur wo einer gerollt „wäre"). */
  suffixBySlot: Partial<Record<EquipSlot, string>>;
  /** Bester gewählter Affix je Slot (die Instanz trägt die Top-N DISTINCT-Affixe, L4-Duplikat-Sperre). */
  affixBySlot: Partial<Record<EquipSlot, string>>;
  /** Aktive Buff-Item-Ids. */
  buffIds: ItemId[];
  /** Aktives Pet (null = keins zahlt auf die Ziel-Stat ein). */
  petId: PetId | null;
  /** claude:2026-10-17T20:45:00+02:00 — Zweiter Platz (nur wenn das Talent bei diesem Level wirkt). */
  petId2: PetId | null;
  /**
   * Basis-Intervall der gewählten Waffe in ms: Range-Form = absolutes `attackIntervalMs`
   * (Default 3000), Legacy = 3000 + bonus-Delta — Bezugsgröße für die Haste-Ratio-Pins.
   */
  weaponBaseIntervalMs: number;
}

export interface BisBuildOptions {
  /** Maximal legaler Buff-Stack (bester Ziel-Stat-Buff JE Kategorie + kategorielose, L3-Exklusivität) statt nur des stärksten Einzel-Buffs. */
  allBuffs?: boolean;
  /** Suffix-ilvl (Default 100 = Skalen-Cap; Rolls immer 1.0 = Max-Roll). */
  suffixIlvl?: number;
  /** RNG-Seed des Fixtures (rein kosmetisch — der Builder zieht kein RNG). */
  seed?: number;
}

/** Slots, die der Builder bestückt (Werkzeug-Slots tragen keine Kampf-Stats). */
const GEAR_SLOTS: EquipSlot[] = [
  "helmet",
  "amulet",
  "body",
  "legs",
  "gloves",
  "boots",
  "cape",
];

/**
 * Baut den stat-maximalen legalen Worst-Case-Charakter (siehe Kopfkommentar).
 * Wirft bei degeneriertem Content (keine legale Waffe des Stils) — Existenz-Guard,
 * damit die Suite bei Content-Renames laut reißt statt still zu degradieren.
 */
export function buildBisCharacter(
  content: ContentDB,
  style: WeaponStyle,
  targetLevel: number,
  target: BisTarget,
  opts: BisBuildOptions = {},
): BisBuild {
  const ilvl = opts.suffixIlvl ?? 100;
  const state = createGame({ name: `BIS-${style}-${target}` }, content, opts.seed ?? 424242);
  // Story-Zonen-Gates (Welle D2, ZoneDef.requiresQuest): der BiS-Held ist per Definition am Ende
  // der Progression — ein L99-Worst-Case-Build hat die Chronik hinter sich. Ohne Grant verweigerte
  // startCombat quest-gegatete Sonden-Mobs (z.B. den aether_wraith-Direktstart der Stalemate-Sonde)
  // und die Envelope-Suite mäße Zugangs-Gates statt Balance. Gates testet zone-gating.test.ts.
  grantAllZones(state, content);
  for (const skillId of Object.keys(content.skills)) {
    state.skills[skillId] = { xp: xpForLevel(targetLevel) };
  }
  // createGame rüstet eine Stil-Startwaffe aus — der Builder überschreibt gleich alle Slots;
  // defensiv leeren, damit kein Starter-Teil in einem unbesetzten Slot zurückbleibt.
  for (const slot of EQUIP_SLOTS) state.character.equipment[slot] = null;
  state.character.equippedInstances = {};

  const kit: Partial<Record<EquipSlot, ItemId>> = {};
  const suffixBySlot: Partial<Record<EquipSlot, string>> = {};
  const affixBySlot: Partial<Record<EquipSlot, string>> = {};

  const allItems = Object.values(content.items);
  const legalEquipment = allItems.filter(
    (it) => it.type === "equipment" && !!it.slot && requirementsOk(it, targetLevel),
  );

  // ── 1) Waffe (bestimmt den Stil) ─────────────────────────────────────────
  const weapons = legalEquipment.filter((it) => it.slot === "mainhand" && it.weaponStyle === style);
  const weaponScore = (it: ItemDef): number => {
    let base = scoreContribution(target, itemContribution(it, "mainhand"), style);
    // Tank-Worst-Case braucht die Schild-Hand: eine 2H-Waffe verdrängt den Offhand-Slot und
    // damit Schild-armorRating UND blockChance — für die Defensiv-Envelope zählt 1H immer mehr,
    // als jede Waffen-Eigenzeile beitragen könnte.
    if (target === "tank" && it.twoHanded) base -= 1_000_000;
    if (target === "haste") {
      // Waffentempo ist ABSOLUT (Range-Form) — schnellere Waffe = weniger Basis-ms.
      const abs =
        typeof it.damageMin === "number" && typeof it.damageMax === "number"
          ? (it.attackIntervalMs ?? 3000)
          : 3000 + (it.bonus?.attackIntervalMs ?? 0);
      return base + (5000 - abs);
    }
    if (target === "damage") {
      // DPS-Schätzer: mittlere Waffenspanne pro Sekunde (Range-Form); Legacy über Flats (oben).
      if (typeof it.damageMin === "number" && typeof it.damageMax === "number") {
        const abs = it.attackIntervalMs ?? 3000;
        return base + ((it.damageMin + it.damageMax) / 2) / (abs / 1000);
      }
    }
    return base;
  };
  const weapon = argmax(weapons, weaponScore, (it) => it.id);
  if (!weapon) throw new Error(`Keine legale ${style}-Waffe bei Level ${targetLevel} im Content`);
  kit.mainhand = weapon.id;
  const isRangeForm = typeof weapon.damageMin === "number" && typeof weapon.damageMax === "number";
  const weaponBaseIntervalMs = isRangeForm
    ? (weapon.attackIntervalMs ?? 3000)
    : 3000 + (weapon.bonus?.attackIntervalMs ?? 0);

  // ── 2) Rüstung/Schmuck je Slot (argmax nach Ziel-Score) ──────────────────
  for (const slot of GEAR_SLOTS) {
    const candidates = legalEquipment.filter((it) => it.slot === slot);
    const best = argmax(candidates, (it) => scoreContribution(target, itemContribution(it, slot), style), (it) => it.id);
    if (best) kit[slot] = best.id;
  }
  // Ringe: Top 2 (beide Ring-Slots), kanonischer Slot ist "ring1".
  const rings = legalEquipment
    .filter((it) => it.slot === "ring1")
    .sort((x, y) => {
      const d =
        scoreContribution(target, itemContribution(y, "ring1"), style) -
        scoreContribution(target, itemContribution(x, "ring1"), style);
      return d !== 0 ? d : x.id < y.id ? -1 : 1;
    });
  if (rings[0]) kit.ring1 = rings[0].id;
  if (rings[1]) kit.ring2 = rings[1].id;
  // Offhand nur ohne 2H-Waffe (Spiegel der Verdrängungsregel in equipItem).
  if (!weapon.twoHanded) {
    const offhands = legalEquipment.filter((it) => it.slot === "offhand");
    const best = argmax(
      offhands,
      (it) => scoreContribution(target, itemContribution(it, "offhand"), style),
      (it) => it.id,
    );
    if (best) kit.offhand = best.id;
  }

  for (const [slot, id] of Object.entries(kit) as Array<[EquipSlot, ItemId]>) {
    state.character.equipment[slot] = id;
  }

  // ── 3) Suffix + Verzauberungs-Maxima je getragenem Teil (Instanz-Overlay) ─
  const suffixDefs = Object.values(content.suffixes ?? {});
  const affixDefs = Object.values(content.affixes ?? {});
  // Legalität einer Verzauberung: es muss eine Tier-III-Rune im Katalog geben (item.rune).
  const runeTierByAffix = new Map<string, number>();
  for (const it of allItems) {
    if (!it.rune) continue;
    const prev = runeTierByAffix.get(it.rune.affixId) ?? 0;
    if (it.rune.tier > prev) runeTierByAffix.set(it.rune.affixId, it.rune.tier);
  }

  const eqi: NonNullable<GameState["character"]["equippedInstances"]> = {};
  for (const [slot, itemId] of Object.entries(kit) as Array<[EquipSlot, ItemId]>) {
    const base = content.items[itemId];
    if (!base) continue;
    // Suffix: Pool-Filter wie suffixPool (appliesTo + minIlvl), Score bei Max-Roll.
    const pool = suffixDefs.filter(
      (d) => (d.minIlvl === undefined || ilvl >= d.minIlvl) && affixAppliesToItem(d.appliesTo, base),
    );
    const bestSuffix = argmax(
      pool,
      (d: SuffixDef) => scoreContribution(target, suffixContribution(content, d.id, ilvl), style),
      (d) => d.id,
    );
    const suffixOk =
      bestSuffix &&
      scoreContribution(target, suffixContribution(content, bestSuffix.id, ilvl), style) > 0;

    // Verzauberung: jeden Rarity-Slot greedy mit dem hoechstbewerteten noch ERLAUBTEN Affix
    // (Score > 0, Max-Rune-Tier). Seit dem Chef-Entscheid vom 25.08.2026 stapeln Stat-Runen
    // (die duplicate_affix-Sperre aus red-team #303 L4 ist gefallen), Aktiv-Effekt-Runen aber
    // nicht (Chef-Nachentscheid, s. `affixHasActiveEffect` in enchant.ts): ihr Proc wird ohnehin
    // entdoppelt, eine zweite braechte nichts. Ein Stat-Affix bleibt also im Rennen und
    // wiederholt sich, ein Proc-Affix scheidet nach seiner ersten Verwendung aus.
    const legalAffixes = affixDefs.filter((d) => {
      const tier = runeTierByAffix.get(d.id) ?? 0;
      return tier > 0 && affixAppliesToItem(d.appliesTo, base) && trinityGatePasses(d, tier, base);
    });
    const bestenliste = legalAffixes
      .map((d) => ({
        d,
        tier: runeTierByAffix.get(d.id) ?? 1,
        score: scoreContribution(target, affixContribution(d, runeTierByAffix.get(d.id) ?? 1), style),
      }))
      .filter((x) => x.score > 0)
      .sort((x, y) => (y.score !== x.score ? y.score - x.score : x.d.id < y.d.id ? -1 : 1));
    const rankedAffixes: typeof bestenliste = [];
    const procVerbraucht = new Set<string>();
    for (let frei = enchantSlotsFor(getItemRarity(base)); frei > 0; frei--) {
      const naechster = bestenliste.find(
        (k) => !affixHasActiveEffect(k.d) || !procVerbraucht.has(k.d.id),
      );
      if (!naechster) break; // nichts Erlaubtes mehr uebrig
      if (affixHasActiveEffect(naechster.d)) procVerbraucht.add(naechster.d.id);
      rankedAffixes.push(naechster);
    }
    const affixOk = rankedAffixes.length > 0;

    if (!suffixOk && !affixOk) continue;
    const inst: ItemInstance = {
      instanceId: `bis-${slot}`,
      baseItemId: itemId,
      affixes: rankedAffixes.map((x) => ({ affixId: x.d.id, tier: x.tier })),
      ...(suffixOk ? { suffix: { suffixId: bestSuffix!.id, ilvl, roll: 1 } } : {}),
    };
    eqi[slot] = inst;
    if (suffixOk) suffixBySlot[slot] = bestSuffix!.id;
    if (affixOk) affixBySlot[slot] = rankedAffixes[0]!.d.id;
  }
  state.character.equippedInstances = eqi;

  // ── 4) Buffs: stärkster Einzel-Buff bzw. bester Buff JE KATEGORIE (Exklusivitäts-Worst-Case) ─
  // red-team #303 L3: `applyConsumableBuff` verdrängt pro `buff.category` — der maximal legale
  // Stack ist der beste Ziel-Stat-Buff je Kategorie plus alle kategorielosen Items (stapeln frei).
  const buffItems = allItems
    .filter((it) => it.type === "consumable" && !!it.buff)
    .map((it) => ({ it, c: buffContribution(it)! }))
    .filter(({ c }) => scoreContribution(target, c, style) > 0)
    .sort((x, y) => {
      const d = scoreContribution(target, y.c, style) - scoreContribution(target, x.c, style);
      return d !== 0 ? d : x.it.id < y.it.id ? -1 : 1;
    });
  const seenCategories = new Set<string>();
  const stackable = buffItems.filter(({ it }) => {
    const cat = it.buff?.category;
    if (!cat) return true; // kategorielos: stapelt weiter frei (Alt-/Sonderfälle)
    if (seenCategories.has(cat)) return false;
    seenCategories.add(cat); // Liste ist score-sortiert ⇒ der erste je Kategorie ist der beste
    return true;
  });
  const buffIds: ItemId[] = (opts.allBuffs ? stackable : stackable.slice(0, 1)).map((b) => b.it.id);
  for (const itemId of buffIds) {
    state.character.buffs.push({ itemId, remainingMs: 3_600_000 });
  }

  // ── 5) Pet: bestes Passiv der Ziel-Stat (0-Score ⇒ kein Pet) ─────────────
  // claude:2026-10-17T20:45:00+02:00 — Begleiter-Rework Apply 6 (design/1.3.0-begleiter-werte.md): BiS besitzt
  // ALLE Begleiter (Echo 25 % ist legal und gehört zur Theorie-Obergrenze) und belegt den zweiten Platz
  // (Jagdbuch „Zweites Halsband“) mit dem zweitbesten Passiv. Der Platz wirkt nur, wenn der Baum bei
  // diesem Level offen ist (Slayer 85) — also erst auf den CL-90/99-Zeilen, wie im echten Spiel.
  const pets = Object.values(content.pets ?? {});
  for (const p of pets) grantPet(state, p.id);
  state.talents = { ...(state.talents ?? {}), slayer: { ...(state.talents?.slayer ?? {}), collar: 1 } };
  const bestPet = argmax(pets, (p: PetDef) => petScore(target, p, style), (p) => p.id);
  let petId: PetId | null = null;
  let petId2: PetId | null = null;
  if (bestPet && petScore(target, bestPet, style) > 0) {
    equipPet(state, bestPet.id);
    petId = bestPet.id;
    const rest = pets.filter((p) => p.id !== bestPet.id);
    const second = argmax(rest, (p: PetDef) => petScore(target, p, style), (p) => p.id);
    if (second && petScore(target, second, style) > 0 && equipSecondPet(state, content, second.id)) petId2 = second.id;
  }

  // Haste-Worst-Case: Fernkampf hat als einziger Stil eine Tempo-Stance (<1). Andere Stile
  // bleiben auf der Default-Stance (kein speedMult < 1 verfügbar).
  if (target === "haste" && style === "ranged") state.character.rangedStance = "fast";

  return {
    state,
    target,
    style,
    kit,
    suffixBySlot,
    affixBySlot,
    buffIds,
    petId,
    petId2,
    weaponBaseIntervalMs,
  };
}

/** Monster mit Level am nächsten an `level` (deterministisch, Gleichstand → kleinste Id).
 *  dungeonOnly-Monster UND dg_-Alias-Varianten sind ausgeschlossen (Welle 3: nicht frei anwählbar
 *  bzw. reine Dungeon-Wellen-Kopien — die
 *  Envelope-TTK-Zeilen adressieren die Dungeon-Finale ohnehin explizit per ID). */
export function monsterClosestTo(content: ContentDB, level: number): MonsterDef {
  const all = Object.values(content.monsters).filter((m) => !m.dungeonOnly && !m.id.startsWith("dg_"));
  if (all.length === 0) throw new Error("Kein Monster im Content");
  return all.reduce((best, m) => {
    const db = Math.abs(best.level - level);
    const dm = Math.abs(m.level - level);
    if (dm < db || (dm === db && m.id < best.id)) return m;
    return best;
  });
}
