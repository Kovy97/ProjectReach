import { describe, expect, it } from "vitest";
import { writeFileSync } from "node:fs";
import { content } from "@hearthforge/content";
import type { EquipSlot, GameState, ItemInstance, RaidDifficulty } from "@hearthforge/shared";
import { affixAppliesToItem, defaultRaidState, enchantSlotsFor, getItemRarity } from "@hearthforge/shared";
import { buildBisCharacter } from "./balance-envelope-helpers";
import { computeStats } from "./character";
import { affixHasActiveEffect, trinityGatePasses } from "./enchant";
import { itemCount } from "./inventory";
import { equipPet, equipSecondPet } from "./pets";
import { startRaid } from "./raid";
import { advance } from "./tick";

/**
 * claude:2026-10-25T17:40:00+02:00 — Chef-Auftrag: 30 simulierte Magier mit verschiedenen Endgame-Kombinationen (Rüstung,
 * Waffe, Runen, Verzauberungen, Suffixe, Schmuck), je 10 Läufe pro Raid-Stufe, statt eines einzigen Voll-Ägis-Kits.
 * Reine Messung, nur mit `RAID_MAGE=1` aktiv; `RAID_MAGE_DIFF=normal|heroic|mythic` wählt die Stufe (parallel startbar),
 * `RAID_MAGE_N` die Läufe je Magier (Default 10), `RAID_MAGE_IDS` eine Auswahl, `RAID_MAGE_OUT` eine Datei für die Ergebnis-Tabelle.
 *
 * Rahmen wie das Referenz-Harness (raid-measure.test.ts): alle Skills 99, voller Buff-Stapel (obere Schranke, R7),
 * Begleiter Panzerhaut, Essen `cooked_idolscale` (Auto-Essen 3), Auto-Trank `godbloom_infusion` bei 40 %, Wochen-Modifikator
 * „Stille Hallen“, offline mit Auto-Weiter; Normal startet bis zu dreimal gratis neu, Heroisch kauft den Neustart, Mythisch
 * endet beim Tod. Runen: höchste verfügbare Stufe je Rune; was die Engine an einem Teil nicht erlaubt, fällt weg und steht
 * im Bericht. Suffixe mit Max-Roll (wie der BiS-Builder).
 */

const ON = !!process.env.RAID_MAGE;
const FOOD = "cooked_idolscale";
const POTION = "godbloom_infusion";
const ARMOR: EquipSlot[] = ["helmet", "body", "legs", "gloves", "boots"];
type Armor = Record<"helmet" | "body" | "legs" | "gloves" | "boots", string>;
type Jewelry = Record<"amulet" | "cape" | "ring1" | "ring2", string>;

const CLOTH: Armor = { helmet: "voidweave_mitre", body: "voidweave_vestment", legs: "voidweave_skirt", gloves: "voidweave_handwraps", boots: "voidweave_sandals" };
const CLOTH_MIX: Armor = { helmet: "voidweave_mitre", body: "emberheart_robe", legs: "rimebound_leggings", gloves: "tideterror_grip", boots: "voidweave_sandals" };
const STAR: Armor = { helmet: "starweave_coronet", body: "starweave_vestment", legs: "starweave_skirt", gloves: "starweave_handwraps", boots: "starweave_sandals" };
const raidSet = (sfx: "" | "_heroic"): Armor => ({ helmet: `gk_fire_head${sfx}`, body: `gk_fire_chest${sfx}`, legs: `gk_fire_legs${sfx}`, gloves: `gk_fire_hands${sfx}`, boots: `gk_fire_feet${sfx}` });
const RAID_N = raidSet("");
const RAID_H = raidSet("_heroic");
/** Platte: die Rüstung des Tank-BiS (wird pro Seed aus dem Builder genommen). */
const PLATE = "PLATE" as const;

const DMG_JEW: Jewelry = { amulet: "godgem_reliquary", cape: "palemourn_shroud", ring1: "godsight_loop", ring2: "nightwell_loop" };
const MIX_JEW: Jewelry = { amulet: "sevenfold_crown_chain", cape: "last_idol_mantle", ring1: "ring_master_magic", ring2: "ring_master_warding" };
const TANKY_JEW: Jewelry = { amulet: "voidsong_locket", cape: "slayer_predecessor_mantle", ring1: "slayer_turnkey_ring", ring2: "ring_master_completion" };
const raidJew = (sfx: "" | "_heroic"): Jewelry => ({ amulet: `gk_pit_amulet${sfx}`, cape: `gk_king_cape${sfx}`, ring1: `gk_tally_ring${sfx}`, ring2: `gk_fel_ring${sfx}` });

interface MageBuild {
  id: number;
  label: string;
  weapon: string;
  offhand?: string;
  weaponRunes: string[];
  weaponSuffix: string;
  armor: Armor | typeof PLATE;
  /** Runen je Rüstungsteil (Reihenfolge = Platzbelegung, Stat-Runen wiederholen sich). Einzelne Teile per `armorRunesBySlot`. */
  armorRunes: string[];
  armorRunesBySlot?: Partial<Record<EquipSlot, string[]>>;
  armorSuffix: string;
  jewelry: Jewelry;
  jewelrySuffix: string;
}

const B: MageBuild[] = [
  // ── 1–10: Endgame ohne Raid-Teile ──
  { id: 1, label: "Voidweave, Ward-Runen, Schildkröte", weapon: "crownless_stave", weaponRunes: ["affix_arcane"], weaponSuffix: "suffix_magus", armor: CLOTH, armorRunes: ["affix_warding"], armorSuffix: "suffix_tortoise", jewelry: DMG_JEW, jewelrySuffix: "suffix_sage" },
  { id: 2, label: "Voidweave Glaskanone (Flamme/Schock/Frost)", weapon: "crownless_stave", weaponRunes: ["affix_arcane", "affix_flame", "affix_shock", "affix_frost"], weaponSuffix: "suffix_warlock", armor: CLOTH, armorRunes: ["affix_warding"], armorSuffix: "suffix_sage", jewelry: DMG_JEW, jewelrySuffix: "suffix_archon" },
  { id: 3, label: "Voidweave Schleiertrinker", weapon: "crownless_stave", weaponRunes: ["affix_arcane"], weaponSuffix: "suffix_magus", armor: CLOTH, armorRunes: ["affix_veil_drinker", "affix_warding"], armorSuffix: "suffix_oracle", jewelry: DMG_JEW, jewelrySuffix: "suffix_sage" },
  { id: 4, label: "Voidweave Phönix, Tempo", weapon: "last_condemnation", weaponRunes: ["affix_arcane", "affix_swift"], weaponSuffix: "suffix_zephyr", armor: CLOTH, armorRunes: ["affix_warding"], armorSuffix: "suffix_phoenix", jewelry: MIX_JEW, jewelrySuffix: "suffix_owl" },
  { id: 5, label: "Stoff-Mix Koloss, zäher Schmuck", weapon: "crownless_stave", weaponRunes: ["affix_precise", "affix_arcane"], weaponSuffix: "suffix_magus", armor: CLOTH_MIX, armorRunes: ["affix_warding"], armorSuffix: "suffix_colossus", jewelry: TANKY_JEW, jewelrySuffix: "suffix_bulwark" },
  { id: 6, label: "Götzeneisen-Stab + Fokus", weapon: "godiron_wand", offhand: "godiron_focus", weaponRunes: ["affix_arcane"], weaponSuffix: "suffix_magus", armor: CLOTH, armorRunes: ["affix_warding"], armorSuffix: "suffix_sage", jewelry: DMG_JEW, jewelrySuffix: "suffix_sage" },
  { id: 7, label: "Meißel des Tilgers + Fokus, Urteil", weapon: "expunger_chisel", offhand: "emptied_shrine_focus", weaponRunes: ["affix_judgement", "affix_arcane"], weaponSuffix: "suffix_executioner", armor: CLOTH, armorRunes: ["affix_warding"], armorSuffix: "suffix_tortoise", jewelry: MIX_JEW, jewelrySuffix: "suffix_oracle" },
  { id: 8, label: "Platten-Magier (Tank-Platte, Ägis)", weapon: "crownless_stave", weaponRunes: ["affix_arcane"], weaponSuffix: "suffix_magus", armor: PLATE, armorRunes: ["affix_aegis"], armorSuffix: "suffix_tortoise", jewelry: DMG_JEW, jewelrySuffix: "suffix_sage" },
  { id: 9, label: "Sternengewebe (92er), Götzeneisen-Stab", weapon: "godiron_staff", weaponRunes: ["affix_arcane"], weaponSuffix: "suffix_magus", armor: STAR, armorRunes: ["affix_warding"], armorSuffix: "suffix_sage", jewelry: MIX_JEW, jewelrySuffix: "suffix_owl" },
  { id: 10, label: "Skarn-Götzenstab, Frost, Eber", weapon: "skarn_idol_staff", weaponRunes: ["affix_frost", "affix_arcane"], weaponSuffix: "suffix_oracle", armor: CLOTH, armorRunes: ["affix_warding"], armorSuffix: "suffix_boar", jewelry: DMG_JEW, jewelrySuffix: "suffix_archon" },
  // ── 11–20: mit Normal-Raid-Teilen ──
  { id: 11, label: "Raid-N Ornat, Ward-Runen", weapon: "gk_fel_staff", weaponRunes: ["affix_arcane"], weaponSuffix: "suffix_magus", armor: RAID_N, armorRunes: ["affix_warding"], armorSuffix: "suffix_sage", jewelry: raidJew(""), jewelrySuffix: "suffix_sage" },
  { id: 12, label: "Raid-N Ornat, Ägis-Runen (Spec-Kit)", weapon: "gk_fel_staff", weaponRunes: ["affix_arcane"], weaponSuffix: "suffix_magus", armor: RAID_N, armorRunes: ["affix_aegis"], armorSuffix: "suffix_tortoise", jewelry: raidJew(""), jewelrySuffix: "suffix_sage" },
  { id: 13, label: "Raid-N Ornat, je 2 Ägis + 2 Ward", weapon: "gk_fel_staff", weaponRunes: ["affix_arcane"], weaponSuffix: "suffix_magus", armor: RAID_N, armorRunes: ["affix_aegis", "affix_warding"], armorSuffix: "suffix_sage", jewelry: raidJew(""), jewelrySuffix: "suffix_sage" },
  { id: 14, label: "Raid-N Glaskanone (Flamme/Schock/Dünner Schleier)", weapon: "gk_fel_staff", weaponRunes: ["affix_arcane", "affix_flame", "affix_shock", "affix_thin_veil"], weaponSuffix: "suffix_warlock", armor: RAID_N, armorRunes: ["affix_warding"], armorSuffix: "suffix_oracle", jewelry: raidJew(""), jewelrySuffix: "suffix_archon" },
  { id: 15, label: "Raid-N Schleiertrinker, Phönix", weapon: "gk_fel_staff", weaponRunes: ["affix_arcane"], weaponSuffix: "suffix_magus", armor: RAID_N, armorRunes: ["affix_veil_drinker", "affix_warding"], armorSuffix: "suffix_phoenix", jewelry: raidJew(""), jewelrySuffix: "suffix_owl" },
  { id: 16, label: "Raid-N 4/5 + Voidweave-Robe", weapon: "gk_fel_staff", weaponRunes: ["affix_arcane"], weaponSuffix: "suffix_magus", armor: { ...RAID_N, body: "voidweave_vestment" }, armorRunes: ["affix_warding"], armorSuffix: "suffix_sage", jewelry: DMG_JEW, jewelrySuffix: "suffix_sage" },
  { id: 17, label: "Raid-N 2/5 + Voidweave, Götterstab", weapon: "crownless_stave", weaponRunes: ["affix_arcane"], weaponSuffix: "suffix_magus", armor: { ...CLOTH, body: "gk_fire_chest", legs: "gk_fire_legs" }, armorRunes: ["affix_warding"], armorSuffix: "suffix_sage", jewelry: DMG_JEW, jewelrySuffix: "suffix_sage" },
  { id: 18, label: "Raid-N Glutzunge + Schuldbuch, Tempo", weapon: "gk_fel_wand", offhand: "gk_tally_focus", weaponRunes: ["affix_arcane", "affix_swift"], weaponSuffix: "suffix_zephyr", armor: RAID_N, armorRunes: ["affix_warding"], armorSuffix: "suffix_sage", jewelry: raidJew(""), jewelrySuffix: "suffix_sage" },
  { id: 19, label: "Raid-N Thronszepter + Fokus, Ägis, Koloss", weapon: "gk_king_scepter", offhand: "godiron_focus", weaponRunes: ["affix_precise", "affix_arcane"], weaponSuffix: "suffix_magus", armor: RAID_N, armorRunes: ["affix_aegis"], armorSuffix: "suffix_colossus", jewelry: MIX_JEW, jewelrySuffix: "suffix_bulwark" },
  { id: 20, label: "Voidweave + Raid-N-Schmuck", weapon: "crownless_stave", weaponRunes: ["affix_arcane"], weaponSuffix: "suffix_magus", armor: CLOTH, armorRunes: ["affix_warding"], armorSuffix: "suffix_sage", jewelry: raidJew(""), jewelrySuffix: "suffix_sage" },
  // ── 21–30: mit Heroisch-Raid-Teilen ──
  { id: 21, label: "Raid-H Ornat, Ward-Runen", weapon: "gk_fel_staff_heroic", weaponRunes: ["affix_arcane"], weaponSuffix: "suffix_magus", armor: RAID_H, armorRunes: ["affix_warding"], armorSuffix: "suffix_sage", jewelry: raidJew("_heroic"), jewelrySuffix: "suffix_sage" },
  { id: 22, label: "Raid-H Ornat, Ägis-Runen (Spec-Kit)", weapon: "gk_fel_staff_heroic", weaponRunes: ["affix_arcane"], weaponSuffix: "suffix_magus", armor: RAID_H, armorRunes: ["affix_aegis"], armorSuffix: "suffix_tortoise", jewelry: raidJew("_heroic"), jewelrySuffix: "suffix_sage" },
  { id: 23, label: "Raid-H Ornat, je 2 Ägis + 2 Ward", weapon: "gk_fel_staff_heroic", weaponRunes: ["affix_arcane"], weaponSuffix: "suffix_magus", armor: RAID_H, armorRunes: ["affix_aegis", "affix_warding"], armorSuffix: "suffix_sage", jewelry: raidJew("_heroic"), jewelrySuffix: "suffix_sage" },
  { id: 24, label: "Raid-H Glaskanone (Flamme/Schock/Dünner Schleier)", weapon: "gk_fel_staff_heroic", weaponRunes: ["affix_arcane", "affix_flame", "affix_shock", "affix_thin_veil"], weaponSuffix: "suffix_warlock", armor: RAID_H, armorRunes: ["affix_warding"], armorSuffix: "suffix_oracle", jewelry: raidJew("_heroic"), jewelrySuffix: "suffix_archon" },
  { id: 25, label: "Raid-H Schleiertrinker, Phönix", weapon: "gk_fel_staff_heroic", weaponRunes: ["affix_arcane"], weaponSuffix: "suffix_magus", armor: RAID_H, armorRunes: ["affix_veil_drinker", "affix_warding"], armorSuffix: "suffix_phoenix", jewelry: raidJew("_heroic"), jewelrySuffix: "suffix_owl" },
  { id: 26, label: "Raid-H 4/5 + Voidweave-Robe", weapon: "gk_fel_staff_heroic", weaponRunes: ["affix_arcane"], weaponSuffix: "suffix_magus", armor: { ...RAID_H, body: "voidweave_vestment" }, armorRunes: ["affix_warding"], armorSuffix: "suffix_sage", jewelry: DMG_JEW, jewelrySuffix: "suffix_sage" },
  { id: 27, label: "Raid-H Glutzunge + Schuldbuch, Tempo", weapon: "gk_fel_wand_heroic", offhand: "gk_tally_focus_heroic", weaponRunes: ["affix_arcane", "affix_swift"], weaponSuffix: "suffix_zephyr", armor: RAID_H, armorRunes: ["affix_warding"], armorSuffix: "suffix_sage", jewelry: raidJew("_heroic"), jewelrySuffix: "suffix_sage" },
  { id: 28, label: "Raid-H Thronszepter + Fokus, Ägis, Koloss", weapon: "gk_king_scepter_heroic", offhand: "godiron_focus", weaponRunes: ["affix_precise", "affix_arcane"], weaponSuffix: "suffix_magus", armor: RAID_H, armorRunes: ["affix_aegis"], armorSuffix: "suffix_colossus", jewelry: MIX_JEW, jewelrySuffix: "suffix_bulwark" },
  { id: 29, label: "Raid gemischt (H-Brust/-Beine, N-Rest), Ward", weapon: "gk_fel_staff", weaponRunes: ["affix_arcane"], weaponSuffix: "suffix_magus", armor: { ...RAID_N, body: "gk_fire_chest_heroic", legs: "gk_fire_legs_heroic" }, armorRunes: ["affix_warding"], armorSuffix: "suffix_sage", jewelry: raidJew("_heroic"), jewelrySuffix: "suffix_sage" },
  { id: 30, label: "Raid-H Ward + Schleiertrinker gemischt, Bollwerk-Schmuck", weapon: "gk_fel_staff_heroic", weaponRunes: ["affix_arcane", "affix_frost"], weaponSuffix: "suffix_oracle", armor: RAID_H, armorRunes: ["affix_warding"], armorRunesBySlot: { body: ["affix_veil_drinker", "affix_aegis"], legs: ["affix_aegis"] }, armorSuffix: "suffix_colossus", jewelry: raidJew("_heroic"), jewelrySuffix: "suffix_bulwark" },
  // claude:2026-10-25T21:30:00+02:00 — Diagnose F1 (Frost gegen Bosse): Build 2 mit einzeln entfernten Proc-Runen.
  { id: 31, label: "Diagnose: Build 2 ohne Frost (Arkan/Flamme/Schock)", weapon: "crownless_stave", weaponRunes: ["affix_arcane", "affix_flame", "affix_shock"], weaponSuffix: "suffix_warlock", armor: CLOTH, armorRunes: ["affix_warding"], armorSuffix: "suffix_sage", jewelry: DMG_JEW, jewelrySuffix: "suffix_archon" },
  { id: 32, label: "Diagnose: Build 2 ohne Schock (Arkan/Flamme/Frost)", weapon: "crownless_stave", weaponRunes: ["affix_arcane", "affix_flame", "affix_frost"], weaponSuffix: "suffix_warlock", armor: CLOTH, armorRunes: ["affix_warding"], armorSuffix: "suffix_sage", jewelry: DMG_JEW, jewelrySuffix: "suffix_archon" },
  { id: 33, label: "Diagnose: Build 2 nur Arkan", weapon: "crownless_stave", weaponRunes: ["affix_arcane"], weaponSuffix: "suffix_warlock", armor: CLOTH, armorRunes: ["affix_warding"], armorSuffix: "suffix_sage", jewelry: DMG_JEW, jewelrySuffix: "suffix_archon" },
  { id: 34, label: "Diagnose: Build 2 nur Frost + Arkan", weapon: "crownless_stave", weaponRunes: ["affix_frost", "affix_arcane"], weaponSuffix: "suffix_warlock", armor: CLOTH, armorRunes: ["affix_warding"], armorSuffix: "suffix_sage", jewelry: DMG_JEW, jewelrySuffix: "suffix_archon" },
];

/** Höchste vorhandene Runenstufe je Affix (aus den Runen-Items des Katalogs). */
const RUNE_TIER = new Map<string, number>();
for (const it of Object.values(content.items)) {
  if (!it.rune) continue;
  RUNE_TIER.set(it.rune.affixId, Math.max(RUNE_TIER.get(it.rune.affixId) ?? 0, it.rune.tier));
}

/** Instanz mit den gewünschten Runen (nur legale; Proc-Runen einmal, Stat-Runen füllen auf) und Max-Roll-Suffix. */
function inst(slot: EquipSlot, itemId: string, runes: string[], suffixId: string, dropped: string[]): ItemInstance {
  const base = content.items[itemId];
  if (!base) throw new Error(`Item fehlt: ${itemId}`);
  const legal = runes.filter((id) => {
    const def = content.affixes?.[id];
    const tier = RUNE_TIER.get(id) ?? 0;
    const ok = !!def && tier > 0 && affixAppliesToItem(def.appliesTo, base) && trinityGatePasses(def, tier, base);
    if (!ok) dropped.push(`${slot}:${id.replace("affix_", "")}`);
    return ok;
  });
  const max = enchantSlotsFor(getItemRarity(base));
  const affixes: ItemInstance["affixes"] = [];
  const stat = legal.filter((id) => !affixHasActiveEffect(content.affixes![id]!));
  for (const id of legal) {
    if (affixes.length >= max) break;
    if (affixHasActiveEffect(content.affixes![id]!) && affixes.some((a) => a.affixId === id)) continue;
    affixes.push({ affixId: id, tier: RUNE_TIER.get(id)! });
  }
  for (let i = 0; affixes.length < max && stat.length > 0; i++) affixes.push({ affixId: stat[i % stat.length]!, tier: RUNE_TIER.get(stat[i % stat.length]!)! });
  const out: ItemInstance = { instanceId: `mage-${slot}`, baseItemId: itemId, affixes };
  const sdef = content.suffixes?.[suffixId];
  if (sdef && affixAppliesToItem(sdef.appliesTo, base)) out.suffix = { suffixId, ilvl: 100, roll: 1 };
  else dropped.push(`${slot}:${suffixId.replace("suffix_", "")}`);
  return out;
}

function buildMage(b: MageBuild, seed: number): { state: GameState; dropped: string[] } {
  const dmg = buildBisCharacter(content, "magic", 99, "damage", { allBuffs: true, excludeRaid: true, seed });
  const s = dmg.state;
  const dropped: string[] = [];
  const eq = s.character.equipment;
  for (const k of Object.keys(eq) as EquipSlot[]) eq[k] = null;
  const eqi: NonNullable<GameState["character"]["equippedInstances"]> = {};
  const put = (slot: EquipSlot, itemId: string, runes: string[], suffix: string) => {
    eq[slot] = itemId;
    eqi[slot] = inst(slot, itemId, runes, suffix, dropped);
  };
  put("mainhand", b.weapon, b.weaponRunes, b.weaponSuffix);
  if (b.offhand) put("offhand", b.offhand, b.weaponRunes.filter((r) => r === "affix_arcane" || r === "affix_swift" || r === "affix_precise"), b.weaponSuffix);
  if (b.armor === PLATE) {
    const tank = buildBisCharacter(content, "magic", 99, "tank", { allBuffs: true, excludeRaid: true, seed });
    for (const slot of ARMOR) put(slot, tank.state.character.equipment[slot]!, b.armorRunesBySlot?.[slot] ?? b.armorRunes, b.armorSuffix);
  } else {
    for (const slot of ARMOR) put(slot, b.armor[slot as keyof Armor], b.armorRunesBySlot?.[slot] ?? b.armorRunes, b.armorSuffix);
  }
  for (const slot of ["amulet", "cape", "ring1", "ring2"] as const) put(slot, b.jewelry[slot], [], b.jewelrySuffix);
  s.character.equippedInstances = eqi;
  equipPet(s, "carapace");
  equipSecondPet(s, content, null);
  s.inventory.slots[0] = { itemId: FOOD, qty: 5000 };
  s.inventory.slots[1] = { itemId: POTION, qty: 1000 };
  s.character.food = FOOD;
  s.character.autoEatTier = 3;
  s.character.autoPotion = { ...s.character.autoPotion, healPotionId: POTION, healThreshold: 0.4 };
  s.dungeonsCleared.behind_the_throne = 1;
  s.character.gold = 9_000_000;
  s.settings.raidAutoBuyRestart = true;
  s.raid = { ...defaultRaidState(), clears: { normal: 1, heroic: 1, mythic: 0 } };
  s.character.hp = computeStats(s, content).maxHp;
  return { state: s, dropped };
}

interface Run { done: boolean; minutes: number; restarts: number; where: string; food: number; pots: number }

function runRaid(s: GameState, d: RaidDifficulty): Run {
  const food0 = itemCount(s.inventory, FOOD);
  const pot0 = itemCount(s.inventory, POTION);
  expect(startRaid(s, content, "gobkharaz", d)).toBe("ok");
  let last = "R1";
  let restarts = 0;
  for (let t = 0; t < 5 * 3_600_000; t += 10_000) {
    advance(s, content, 10_000, { offline: true });
    const run = s.raid!.run;
    if (run) restarts = Math.max(restarts, run.restarts);
    if (run?.phase === "fight" && s.combat.monsterId) {
      const enc = s.combat.encounterIndex;
      last = `R${run.room + 1}·${enc === 4 ? `Boss·P${s.combat.bossPhase ?? 0}` : `W${enc + 1}`}`;
    }
    const res = s.raid!.lastResult;
    if (res) {
      return { done: res.outcome === "complete", minutes: res.durationMs / 60_000, restarts, where: res.outcome === "complete" ? "" : last, food: food0 - itemCount(s.inventory, FOOD), pots: pot0 - itemCount(s.inventory, POTION) };
    }
  }
  return { done: false, minutes: 300, restarts, where: `${last} (Zeit)`, food: food0 - itemCount(s.inventory, FOOD), pots: pot0 - itemCount(s.inventory, POTION) };
}

const median = (xs: number[]): number => {
  if (!xs.length) return NaN;
  const a = [...xs].sort((x, y) => x - y);
  return a.length % 2 ? a[a.length >> 1]! : (a[(a.length >> 1) - 1]! + a[a.length >> 1]!) / 2;
};

describe.skipIf(!ON)("Raid: 30 Magier-Builds (+ Diagnose 31–34, nur per RAID_MAGE_IDS)", () => {
  const diffs = ((process.env.RAID_MAGE_DIFF ?? "normal,heroic,mythic").split(",") as RaidDifficulty[]);
  const N = Number(process.env.RAID_MAGE_N ?? 10);
  // claude:2026-10-25T19:40:00+02:00 — RAID_MAGE_IDS=1,11,21 misst nur diese Builds (Stellschrauben-Experimente).
  const ids = process.env.RAID_MAGE_IDS ? new Set(process.env.RAID_MAGE_IDS.split(",").map(Number)) : null;
  const rows: string[] = [];
  for (const d of diffs) {
    it(`Stufe ${d}: 30 Builds × ${N} Läufe`, () => {
      rows.push(`| Build | Stufe | Abschlüsse | Median min | Neustarts | Niederlagen-Ort | HP | Ward | Rüstung | Schaden | Krit | Essen | Tränke | verworfen |`);
      for (const b of B) {
        if (ids ? !ids.has(b.id) : b.id > 30) continue;
        const runs: Run[] = [];
        let doc = { hp: 0, ward: 0, ar: 0, dmg: "", crit: "", dropped: [] as string[] };
        for (let i = 0; i < N; i++) {
          const { state, dropped } = buildMage(b, 2000 + i);
          if (i === 0) {
            const st = computeStats(state, content);
            doc = { hp: st.maxHp, ward: Math.round(st.maxWard), ar: Math.round(st.armorRating), dmg: `${st.attackDamageMin.toFixed(0)}–${st.attackDamageMax.toFixed(0)}@${st.attackIntervalMs}`, crit: `${Math.round(st.critChance * 100)}%`, dropped };
          }
          runs.push(runRaid(state, d));
        }
        const done = runs.filter((r) => r.done);
        const where = new Map<string, number>();
        for (const r of runs) if (r.where) where.set(r.where, (where.get(r.where) ?? 0) + 1);
        const line = `| ${b.id} ${b.label} | ${d} | ${done.length}/${N} | ${done.length ? median(done.map((r) => r.minutes)).toFixed(1) : "–"} | ${runs.reduce((a, r) => a + r.restarts, 0)} | ${[...where].map(([k, v]) => `${k}×${v}`).join(", ") || "–"} | ${doc.hp} | ${doc.ward} | ${doc.ar} | ${doc.dmg} | ${doc.crit} | ${Math.round(median(runs.map((r) => r.food)))} | ${Math.round(median(runs.map((r) => r.pots)))} | ${doc.dropped.join(" ") || "–"} |`;
        rows.push(line);
        console.log(line);
      }
      if (process.env.RAID_MAGE_OUT) writeFileSync(process.env.RAID_MAGE_OUT, rows.join("\n") + "\n");
    }, 3_600_000);
  }
});
