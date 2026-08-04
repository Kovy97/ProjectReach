import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { ContentDB, EquipBonus, EquipSlot, ItemDef } from "@hearthforge/shared";
import { ATTRIBUTE_IDS, BOOSTABLE_COMBAT_SKILL_IDS } from "@hearthforge/shared";
import { createGame } from "./state";
import { computeStats } from "./character";
import { combatLevel } from "./dungeon";
import { equipItem, meetsRequirements } from "./equipment";
import { addItem } from "./inventory";
import { levelFromXp, xpForLevel } from "./leveling";
import { CHASE_ITEMS } from "./sim-consistency";

// ───────────────────────────────────────────────────────────────────────────
// Itemization-2.0-Guards (design/itemization-2-spec.md §8.3) + Waffen-2.0-Ausweitung
// (design/itemization-parity-fix.md §1.1/§4.1.4/§5.1).
//
// Parametrisierung = Spiegel der Spec (§4.4/§5.4, itemization-parity-fix §1.1/§5.1) — WER die
// Whitelists ändert, ändert sie HIER und in der Spec gemeinsam:
//  - Verbotene Werte (Rüstung/Schmuck): KEINE bonus-Kampf-Flats; einzige Ausnahme sind
//    hpRegenPerSec/lifesteal als Signatur-EFFEKTE (§5.4).
//  - Verbotene Werte (Waffen, itemization-parity-fix §1.1): KEINE bonus-Kampf-Flats mehr —
//    einzige Ausnahme `lifesteal` als Signatur-Effektzeile (WEAPON_LIFESTEAL_WHITELIST).
//  - Weapon-seitige Offhands (Schadensträger wie Waffen) sind vom Rüstungs-Guard ausgenommen.
//  - Signaturen = idol_*/slayer_* bzw. rarity legendary/godly (§4.4-Boost-Träger auf Rüstung).
//  - CHASE_ITEMS (itemization-parity-fix §5.1c/§4.1.4, gepflegt in sim-consistency.ts): dürfen
//    wie Signaturen Boosts abseits der Schmuck-Slots tragen (Chase-Doktrin-Ausnahmeklasse).
// ───────────────────────────────────────────────────────────────────────────

/**
 * §5.4: einzige erlaubte bonus-Felder auf Rüstungs-/Schmuck-SIGNATUREN (reg/ls). Erweitert um
 * `critDamage` für die Meisterweihe (design/master-capes-konzept.md, Chef-GO 2026-07-09):
 * ring_master_power (Warlord's Ring, rarity legendary; bis SAVE 68 cape_master_power) trägt den
 * dokumentierten „+3 % Krit-Schaden"-Perk exakt über dieses bestehende EquipBonus-Feld
 * (Konzept-Notiz §2: „null neue Hooks" für die 7 Kampf-Ringe) — gleiches Muster wie
 * hpRegenPerSec: ein Signatur-Effekt NUR auf legendary/godly-Items (isSignature-Gate unten
 * bleibt unverändert scharf).
 */
const EFFECT_WHITELIST = new Set<keyof EquipBonus>(["hpRegenPerSec", "lifesteal", "critDamage"]);
/** §5.4: weapon-seitige Offhands bleiben unverändert (Schadensträger wie Waffen). */
const WEAPON_SIDE_OFFHANDS = new Set<string>([
  "stormcaller_totem",
  "tidecaller_focus",
  "beastcaller_totem",
]);
/** §4.4: Schmuck-Slots (Kern-Träger der Skill-Boosts). */
const JEWELRY_SLOTS = new Set<EquipSlot>(["ring1", "ring2", "amulet", "cape"]);
/**
 * itemization-parity-fix §1.1: einzige erlaubte bonus-Signatur-Zeile auf WAFFEN ist `lifesteal`,
 * und nur auf diesen beiden namentlich genannten Klingen (nekro_reaperblade-Whitelist laut Spec;
 * doomknight_cinderblade trägt "burn + lifesteal (bleiben)" laut §3.3-Tabelle).
 */
const WEAPON_LIFESTEAL_WHITELIST = new Set<string>(["nekro_reaperblade", "doomknight_cinderblade"]);
/** itemization-parity-fix §5.1c: `thorns` ist NUR auf dieser Rüstungs-Chase-Ausnahme erlaubt. */
const ARMOR_THORNS_WHITELIST = new Set<string>(["thornmail_gauntlets"]);
const CHASE_ITEM_SET = new Set<string>(CHASE_ITEMS);

/** Rüstungs-/Schmuck-Item im Sinne des Guards (kein weaponStyle, keine weapon-side-Offhand). */
function isArmorOrJewelry(item: ItemDef): boolean {
  return (
    item.type === "equipment" &&
    !!item.slot &&
    item.slot !== "mainhand" &&
    !item.weaponStyle &&
    !WEAPON_SIDE_OFFHANDS.has(item.id)
  );
}

/** Waffen im Sinne des §1.1-Guards: Mainhand-Ausrüstung mit weaponStyle (Schaden über die Spanne). */
function isWeapon(item: ItemDef): boolean {
  return item.type === "equipment" && !!item.weaponStyle;
}

/** Signatur laut Spec (§4.4/§5.4): Präfix idol_ bzw. slayer_ oder rarity legendary/godly. */
function isSignature(item: ItemDef): boolean {
  return (
    item.id.startsWith("idol_") ||
    item.id.startsWith("slayer_") ||
    item.rarity === "legendary" ||
    item.rarity === "godly"
  );
}

/** Chase-Doktrin-Ausnahmeklasse (itemization-parity-fix §5.1c): behandelt wie eine Signatur. */
function isChase(item: ItemDef): boolean {
  return CHASE_ITEM_SET.has(item.id);
}

describe("Itemization 2.0 — Verbotene Werte (§8.3 Guard 1)", () => {
  it("kein Rüstungs-/Schmuck-Item trägt bonus-Kampf-Flats außer der Effekt-Whitelist auf Signaturen", () => {
    const offenders: string[] = [];
    for (const item of Object.values(content.items)) {
      if (!isArmorOrJewelry(item)) continue;
      const bonusKeys = Object.keys(item.bonus ?? {}) as (keyof EquipBonus)[];
      for (const key of bonusKeys) {
        if (!EFFECT_WHITELIST.has(key)) {
          offenders.push(`${item.id}: verbotenes bonus.${key}`);
        } else if (!isSignature(item)) {
          offenders.push(`${item.id}: ${key} nur auf Signaturen erlaubt (§5.4)`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  // itemization-parity-fix §1.1 (Waffen 2.0): Waffen tragen KEINE bonus-Kampf-Flats mehr — Schaden
  // kommt ausschließlich aus damageMin/damageMax (+modifiers/weaponEffect). Einzige Ausnahme:
  // `lifesteal` als Signatur-Effektzeile auf der namentlich gepinnten Whitelist (§1.1/§3.3).
  it("keine Waffe trägt bonus-Kampf-Flats außer der lifesteal-Whitelist (itemization-parity-fix §1.1)", () => {
    const offenders: string[] = [];
    for (const item of Object.values(content.items)) {
      if (!isWeapon(item)) continue;
      const bonusKeys = Object.keys(item.bonus ?? {}) as (keyof EquipBonus)[];
      for (const key of bonusKeys) {
        if (key !== "lifesteal") {
          offenders.push(`${item.id}: verbotenes Waffen-bonus.${key} (§1.1)`);
        } else if (!WEAPON_LIFESTEAL_WHITELIST.has(item.id)) {
          offenders.push(`${item.id}: lifesteal nur auf der Whitelist erlaubt (§1.1/§3.3)`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  // itemization-parity-fix §5.1c: `thorns` (Rüstungs-Chase-Ausnahme) ist NUR auf der namentlich
  // gepinnten Whitelist (thornmail_gauntlets) erlaubt — sonst bleibt es ein Waffen-/Signatur-Effekt.
  it("`thorns` auf Rüstung nur auf der Chase-Ausnahme-Whitelist (itemization-parity-fix §5.1c)", () => {
    const offenders: string[] = [];
    for (const item of Object.values(content.items)) {
      if (!isArmorOrJewelry(item)) continue;
      const hasThorns =
        item.weaponEffect?.type === "thorns" || (item.weaponEffects ?? []).some((e) => e.type === "thorns");
      if (hasThorns && !ARMOR_THORNS_WHITELIST.has(item.id)) {
        offenders.push(`${item.id}: thorns nur auf ${[...ARMOR_THORNS_WHITELIST].join(", ")} erlaubt (§5.1c)`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("Rüstungs-/Schmuck-modifiers sind ganzzahlig ≥ 1 (§8.3: Attribut-Ganzzahligkeit im Content)", () => {
    const offenders: string[] = [];
    for (const item of Object.values(content.items)) {
      if (!isArmorOrJewelry(item) || !item.modifiers) continue;
      for (const id of ATTRIBUTE_IDS) {
        const v = item.modifiers[id];
        if (v !== undefined && (!Number.isInteger(v) || v < 1)) {
          offenders.push(`${item.id}: modifiers.${id} = ${v}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  // itemization-parity-fix §3.1.4/§3: Waffen tragen jetzt ebenfalls modifiers (LCK-/Attribut-
  // Leitern) — dieselbe Ganzzahligkeits-Pflicht wie Rüstung/Schmuck (§8.3).
  it("Waffen-modifiers sind ganzzahlig ≥ 1 (itemization-parity-fix §3, analog §8.3)", () => {
    const offenders: string[] = [];
    for (const item of Object.values(content.items)) {
      if (!isWeapon(item) || !item.modifiers) continue;
      for (const id of ATTRIBUTE_IDS) {
        const v = item.modifiers[id];
        if (v !== undefined && (!Number.isInteger(v) || v < 1)) {
          offenders.push(`${item.id}: modifiers.${id} = ${v}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("skillBoost nur auf erlaubten Trägern (Schmuck/Signaturen/Chase-Items), ganzzahlig 1–5, genau 1 Boost je Stück", () => {
    const offenders: string[] = [];
    for (const item of Object.values(content.items)) {
      if (!item.skillBoost) continue;
      const keys = Object.keys(item.skillBoost);
      if (item.weaponStyle || item.type !== "equipment" || !item.slot) {
        offenders.push(`${item.id}: Waffen/Nicht-Equipment tragen KEINE Boosts (§4.4)`);
        continue;
      }
      if (!JEWELRY_SLOTS.has(item.slot) && !isSignature(item) && !isChase(item)) {
        offenders.push(`${item.id}: Boost nur auf Schmuck/Capes/Amuletten, Signaturen oder Chase-Items (§4.4/§5.1c)`);
      }
      if (keys.length !== 1) offenders.push(`${item.id}: genau 1 Boost je Stück (§4.4), hat ${keys.length}`);
      for (const key of keys) {
        if (!(BOOSTABLE_COMBAT_SKILL_IDS as string[]).includes(key)) {
          offenders.push(`${item.id}: unbekannter Boost-Skill ${key}`);
          continue;
        }
        const v = item.skillBoost[key as (typeof BOOSTABLE_COMBAT_SKILL_IDS)[number]];
        if (v === undefined || !Number.isInteger(v) || v < 1 || v > 5) {
          offenders.push(`${item.id}: Boost-Wert ${key}=${v} außerhalb 1–5`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("Set-skillBoost (Krönung): höchstens 1 Stil-Boost je Set, ganzzahlig 1–5; Set-modifiers ganzzahlig ≥ 1", () => {
    const offenders: string[] = [];
    for (const set of content.sets) {
      if (set.skillBoost) {
        const keys = Object.keys(set.skillBoost);
        if (keys.length !== 1) offenders.push(`${set.id}: genau 1 Boost-Krönung je Set (§4.4)`);
        for (const key of keys) {
          const v = set.skillBoost[key as (typeof BOOSTABLE_COMBAT_SKILL_IDS)[number]];
          if (
            !(BOOSTABLE_COMBAT_SKILL_IDS as string[]).includes(key) ||
            v === undefined ||
            !Number.isInteger(v) ||
            v < 1 ||
            v > 5
          ) {
            offenders.push(`${set.id}: Boost ${key}=${v} ungültig`);
          }
        }
      }
      if (set.modifiers) {
        for (const id of ATTRIBUTE_IDS) {
          const v = set.modifiers[id];
          if (v !== undefined && (!Number.isInteger(v) || v < 1)) {
            offenders.push(`${set.id}: modifiers.${id} = ${v}`);
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe("Itemization 2.0 — Boost-Isolation (§8.3 Guard 2)", () => {
  /** Test-Content: +5-Power-Ring + ein Power-44-gegatetes Schwert (echter Content bleibt unberührt). */
  function boostContent(): ContentDB {
    const ring: ItemDef = {
      id: "test_boost_ring",
      name: { en: "Ring of Power", de: "Ring der Wucht" },
      type: "equipment",
      slot: "ring1",
      stackable: false,
      skillBoost: { power: 5 },
    };
    const gated: ItemDef = {
      id: "test_gated_sword",
      name: { en: "Gated Sword", de: "Gegatetes Schwert" },
      type: "equipment",
      slot: "mainhand",
      weaponStyle: "melee",
      stackable: false,
      requirements: { power: 44 },
    };
    return { ...content, items: { ...content.items, test_boost_ring: ring, test_gated_sword: gated } };
  }

  it("Ring +5 Power an/aus → identische Requirements/combatLevel/Basis-Level, aber höherer maxHit", () => {
    const c = boostContent();
    const s = createGame({ name: "X" }, c, 1);
    s.character.equipment.mainhand = null; // unbewaffnet → deterministische Melee-Basis
    s.skills.power = { xp: xpForLevel(40) };

    const before = computeStats(s, c);
    const clBefore = combatLevel(s);
    // Basis-Level 40 < Requirement 44 → gesperrt.
    expect(meetsRequirements(s, c.items.test_gated_sword!)).toBe(false);

    addItem(s.inventory, c, "test_boost_ring", 1);
    expect(equipItem(s, c, "test_boost_ring").ok).toBe(true);
    const after = computeStats(s, c);

    // Boost wirkt in den Kampfformeln: effektives Power-Level 45 → mehr Roh-Schaden & maxHit.
    expect(after.skillBoosts.power).toBe(5);
    expect(after.meleeDamage).toBeGreaterThan(before.meleeDamage);
    expect(after.maxHit).toBeGreaterThan(before.maxHit);

    // …aber NICHT in Requirements/CL/XP (Anti-Exploit, §4.2):
    // 1) Ausrüstungs-Gate bleibt zu (Basis 40 < 44, effektiv 45 zählt NICHT).
    expect(meetsRequirements(s, c.items.test_gated_sword!)).toBe(false);
    // 2) combatLevel unverändert (liest Basis-Level aus state.skills).
    expect(combatLevel(s)).toBe(clBefore);
    // 3) XP-Kurve/Gating lesen das Basis-Level: der persistierte Skill-Stand ist unangetastet
    //    (alle XP-Pfade — combatXpLevelMult/overLevelMult/earlyXpMult — lesen levelFromXp aus
    //    state.skills, nie die DerivedStats).
    expect(levelFromXp(s.skills.power!.xp)).toBe(40);
  });

  it("Set-skillBoost und Suffix-Boosts fließen in DerivedStats.skillBoosts (Aggregation)", () => {
    const c = boostContent();
    // Zweiter Träger: Amulett mit +2 Defence → Aggregat {power:5, defence:2}.
    const amulet: ItemDef = {
      id: "test_boost_amulet",
      name: { en: "Amulet of the Bulwark", de: "Amulett des Bollwerks" },
      type: "equipment",
      slot: "amulet",
      stackable: false,
      skillBoost: { defence: 2 },
    };
    c.items = { ...c.items, test_boost_amulet: amulet };
    const s = createGame({ name: "X" }, c, 1);
    addItem(s.inventory, c, "test_boost_ring", 1);
    addItem(s.inventory, c, "test_boost_amulet", 1);
    expect(equipItem(s, c, "test_boost_ring").ok).toBe(true);
    expect(equipItem(s, c, "test_boost_amulet").ok).toBe(true);

    const noBoost = createGame({ name: "Y" }, c, 1);
    const base = computeStats(noBoost, c);
    const stats = computeStats(s, c);
    expect(stats.skillBoosts).toEqual({ power: 5, defence: 2 });
    // Rüstungs-Trinität / Itemization 2.5 (armor-trinity-spec §1.1/§1.3/§3): der Defence-Skill-Boost
    // wird weiterhin aggregiert (skillBoosts oben), speist aber KEINEN Kampfterm mehr — defense kommt
    // nur aus armorRating, evasion nur aus DEX-Kern. Beide bleiben also unverändert zur Basis.
    expect(stats.defense).toBeCloseTo(base.defense, 10);
    expect(stats.evasion).toBeCloseTo(base.evasion, 10);
  });
});

describe("Itemization 2.0 — Attribut-Ganzzahligkeit (§8.3)", () => {
  it("Basis + Creation-Seed + Skill-Training erzeugen ganzzahlige Attribute (ohne Gear)", () => {
    const s = createGame({ name: "X", baseAttributes: { str: 4 } }, content, 1);
    s.character.equipment.mainhand = null; // Starter-Waffe ablegen (isoliert Basis+Training)
    s.skills.woodcutting = { xp: xpForLevel(99) }; // trainiert STR
    s.skills.mining = { xp: xpForLevel(37) }; // trainiert CON

    const before = createGame({ name: "Y" }, content, 1);
    before.character.equipment.mainhand = null;
    const attrsBefore = computeStats(before, content).attributes;
    const attrs = computeStats(s, content).attributes;

    for (const id of ATTRIBUTE_IDS) {
      expect(Number.isInteger(attrs[id])).toBe(true);
    }
    // Referenzpunkte Spec §1.3/§1: Basis 3; Seed zählt 1:1; je Trainer-Skill L99 = floor(99/8)
    // = 12 GANZE Punkte (identische Rate wie früher 24·0.5). Deltas gegen den frischen Char,
    // damit die L1-Beiträge der übrigen Trainer-Skills herausfallen.
    expect(attrsBefore.str).toBe(3); // Basis ohne Seed/Training
    expect(attrs.str - attrsBefore.str - 4).toBe(12); // Seed 4 + Training L99→+12
    expect(attrs.con - attrsBefore.con).toBe(Math.floor((37 + 4) / 8) - 0); // Rungs alle 8 Level
  });
});
