import { describe, expect, it } from "vitest";
import { writeFileSync } from "node:fs";
import { content as liveContent } from "@hearthforge/content";
import type { CombatStyle, ContentDB, EquipSlot, GameState, ItemInstance, RaidDifficulty, RangedStance } from "@hearthforge/shared";
import { affixAppliesToItem, defaultRaidState, enchantSlotsFor, getItemRarity, quiverAcceptsAffix } from "@hearthforge/shared";
import { buildBisCharacter } from "./balance-envelope-helpers";
import { computeStats } from "./character";
import { affixHasActiveEffect, trinityGatePasses } from "./enchant";
import { itemCount } from "./inventory";
import { equipPet, equipSecondPet } from "./pets";
import { startRaid } from "./raid";
import { advance } from "./tick";

/**
 * claude:2026-10-23T23:55:00+02:00 — Gegenstück zum Magier-Harness (raid-mage-builds.test.ts) für Nah- und Fernkampf:
 * 15 Nahkämpfer (1–15) und 15 Schützen (16–30) mit verschiedenen Endgame-Kombinationen, je 10 Läufe pro Raid-Stufe.
 * Reine Messung, nur mit `RAID_STYLE=1` aktiv; `RAID_STYLE_DIFF=normal|heroic|mythic` wählt die Stufe(n),
 * `RAID_STYLE_N` die Läufe je Build (Default 10), `RAID_STYLE_IDS` eine Auswahl (z. B. 1-15 oder 1,5,9),
 * `RAID_STYLE_OUT` eine Datei für die Ergebnis-Tabelle, `RAID_STYLE_DOC=1` druckt die Kits (Runen/Suffixe/Stats).
 *
 * Messlogik wie beim Magier-Harness: alle Skills 99, voller Buff-Stapel des Schadens-Builders (obere Schranke), Essen
 * `cooked_idolscale` (Auto-Essen 3), Auto-Trank `godbloom_infusion` bei 40 %, Wochen-Modifikator „Stille Hallen“, offline
 * mit Auto-Weiter; Normal startet bis zu dreimal gratis neu, Heroisch kauft den Neustart, Mythisch endet beim Tod. Seeds
 * 2000 + i. Begleiter je Stil wie raid-measure.test.ts: Panzerhaut, Nahkampf zusätzlich Eisenkiefer. Runen: höchste
 * verfügbare Stufe, nur legale (Trinity-Gate, Köcher nur Stat-Runen); Verworfenes steht in der Spalte „verworfen“.
 * Fernkampf: Pfeilart je Build im Köcher (100.000 Stück), `null` = leerer Köcher (einfache Pfeile, Bogenspanne).
 * Zusätzlich zur Magier-Tabelle: Orte der Neustarts (Normal/Heroisch) und verbrauchte Pfeile.
 *
 * claude:2026-10-24T00:02:00+02:00 — Gegenprobe `RAID_STYLE_DMG_SCALE=1.0`: Schaden der 15 Raid-Gegner als Content-Ableger
 * im Test von `RAID_DAMAGE_SCALE` 1,3 auf den angegebenen Faktor umgerechnet (Koordinator: nur für Builds mit Raid-Ausrüstung,
 * die bei ×1,3 auf Heroisch unter 5/10 liegen). Nichts im Katalog geändert; ohne die Variable gilt der Live-Content.
 */

/** Live-Wert von `RAID_DAMAGE_SCALE` (packages/content/src/raid.ts, nicht aus dem Paket exportiert); unten gegen Vrikka geprüft. */
const LIVE_RAID_DAMAGE_SCALE = 1.3;
const DMG_SCALE = process.env.RAID_STYLE_DMG_SCALE ? Number(process.env.RAID_STYLE_DMG_SCALE) : null;
const content: ContentDB =
  DMG_SCALE === null
    ? liveContent
    : {
        ...liveContent,
        monsters: Object.fromEntries(
          Object.entries(liveContent.monsters).map(([id, m]) => [id, id.startsWith("gk_") ? { ...m, damage: Math.round((m.damage / LIVE_RAID_DAMAGE_SCALE) * DMG_SCALE) } : m]),
        ),
      };

const ON = !!process.env.RAID_STYLE;
const FOOD = "cooked_idolscale";
const POTION = "godbloom_infusion";
const ARROWS = 100_000;
const ARMOR: EquipSlot[] = ["helmet", "body", "legs", "gloves", "boots"];
type Armor = Record<"helmet" | "body" | "legs" | "gloves" | "boots", string>;
type Jewelry = Record<"amulet" | "cape" | "ring1" | "ring2", string>;
type Style = "melee" | "ranged";

// ── Rüstung ──
/** Götzeneisen-Platte (Stufe XII, epic, 3 Runenplätze). */
const GODIRON: Armor = { helmet: "godiron_fullhelm", body: "godiron_platebody", legs: "godiron_platelegs", gloves: "godiron_gauntlets", boots: "godiron_sabatons" };
/** Legendäre Götzen-Platte (Tank-BiS des Builders, 4 Runenplätze). */
const IDOL: Armor = { helmet: "idol_crown", body: "idol_shroud", legs: "aetherweave_leggings", gloves: "voidtouched_gauntlets", boots: "idolstep_sabatons" };
/** Leerenleder (Stufe XII Leder, Fernkampf 99). */
const VOIDHIDE: Armor = { helmet: "voidhide_helm", body: "voidhide_body", legs: "voidhide_legs", gloves: "voidhide_vambraces", boots: "voidhide_boots" };
/** Schadens-BiS des Builders für Fernkampf (Slayer-Platte + Schattenleder + Wolkengänger). */
const RANGED_DMG_MIX: Armor = { helmet: "slayer_helm", body: "shadowhide_body", legs: "slayer_greaves", gloves: "shadowhide_vambraces", boots: "cloudwalker_boots" };
const raidSet = (set: "gk_bleed" | "gk_poison", sfx: "" | "_heroic"): Armor => ({
  helmet: `${set}_head${sfx}`,
  body: `${set}_chest${sfx}`,
  legs: `${set}_legs${sfx}`,
  gloves: `${set}_hands${sfx}`,
  boots: `${set}_feet${sfx}`,
});
const BLEED_N = raidSet("gk_bleed", "");
const BLEED_H = raidSet("gk_bleed", "_heroic");
const POISON_N = raidSet("gk_poison", "");
const POISON_H = raidSet("gk_poison", "_heroic");

// ── Schmuck ──
const MELEE_DMG_JEW: Jewelry = { amulet: "soulflayer_amulet", cape: "slagweave_cape", ring1: "doomforged_band", ring2: "godgem_ring" };
const MELEE_MIX_JEW: Jewelry = { amulet: "sevenfold_crown_chain", cape: "last_idol_mantle", ring1: "ring_master_attack", ring2: "ring_master_power" };
const TANKY_JEW: Jewelry = { amulet: "sevenfold_crown_chain", cape: "pelt_mantle", ring1: "ring_master_defence", ring2: "ninth_wardens_signet" };
const SLAYER_JEW: Jewelry = { amulet: "slayer_guest_right", cape: "slayer_predecessor_mantle", ring1: "slayer_turnkey_ring", ring2: "ring_master_completion" };
const RANGED_DMG_JEW: Jewelry = { amulet: "deadeye_reliquary", cape: "mariner_cloak", ring1: "worldpiercer_barb", ring2: "ghostquiver_notch" };
const RANGED_MIX_JEW: Jewelry = { amulet: "sevenfold_crown_chain", cape: "last_idol_mantle", ring1: "ring_master_ranged", ring2: "worldpiercer_barb" };
const raidJew = (sfx: "" | "_heroic"): Jewelry => ({ amulet: `gk_pit_amulet${sfx}`, cape: `gk_king_cape${sfx}`, ring1: `gk_tally_ring${sfx}`, ring2: `gk_fel_ring${sfx}` });

interface StyleBuild {
  id: number;
  style: Style;
  label: string;
  weapon: string;
  weaponRunes: string[];
  weaponSuffix: string;
  /** Schild (Nahkampf, nur zu Einhand) oder Köcher (Bogen). */
  offhand?: string;
  offhandRunes?: string[];
  offhandSuffix?: string;
  armor: Armor;
  /** Runen je Rüstungsteil (Reihenfolge = Platzbelegung, Stat-Runen wiederholen sich; illegale fallen je Teil weg). */
  armorRunes: string[];
  armorRunesBySlot?: Partial<Record<EquipSlot, string[]>>;
  armorSuffix: string;
  jewelry: Jewelry;
  jewelrySuffix: string;
  /** Fernkampf: geladene Pfeilart; `null` = leerer Köcher. */
  arrow?: string | null;
  meleeStance?: CombatStyle;
  rangedStance?: RangedStance;
}

const B: StyleBuild[] = [
  // ══ Nahkampf 1–7: Endgame ohne Raid-Teile ══
  { id: 1, style: "melee", label: "Götzeneisen-Platte + Götzeneisen-Hammer (2H), Scharf, Ägis", weapon: "godiron_maul", weaponRunes: ["affix_keen"], weaponSuffix: "suffix_bull", armor: GODIRON, armorRunes: ["affix_aegis"], armorSuffix: "suffix_bear", jewelry: MELEE_DMG_JEW, jewelrySuffix: "suffix_bear" },
  { id: 2, style: "melee", label: "Götzeneisen-Platte + Klinge des Kronenlosen, Kriegspfad, Gemetzel", weapon: "crownless_blade", weaponRunes: ["affix_warpath", "affix_keen"], weaponSuffix: "suffix_carnage", armor: GODIRON, armorRunes: ["affix_aegis"], armorSuffix: "suffix_bear", jewelry: MELEE_DMG_JEW, jewelrySuffix: "suffix_brute" },
  { id: 3, style: "melee", label: "Götzeneisen-Schwert + Turmschild, Ägis, Schildkröte, zäher Schmuck", weapon: "godiron_sword", weaponRunes: ["affix_keen"], weaponSuffix: "suffix_bull", offhand: "godiron_towershield", offhandRunes: ["affix_aegis"], offhandSuffix: "suffix_tortoise", armor: GODIRON, armorRunes: ["affix_aegis"], armorSuffix: "suffix_tortoise", jewelry: TANKY_JEW, jewelrySuffix: "suffix_bulwark" },
  { id: 4, style: "melee", label: "Götzeneisen-Streitkolben + Aegis des Götzen, Urteil/Flamme, Henker", weapon: "godiron_mace", weaponRunes: ["affix_judgement", "affix_flame", "affix_keen"], weaponSuffix: "suffix_executioner", offhand: "idol_aegis", offhandRunes: ["affix_unbroken_wall", "affix_aegis"], offhandSuffix: "suffix_colossus", armor: GODIRON, armorRunes: ["affix_aegis"], armorSuffix: "suffix_bear", jewelry: MELEE_MIX_JEW, jewelrySuffix: "suffix_bear" },
  { id: 5, style: "melee", label: "Götzen-Platte (legendär) + Das Letzte Urteil, Tempo, Wolf, Phönix", weapon: "last_judgement", weaponRunes: ["affix_swift", "affix_keen"], weaponSuffix: "suffix_wolf", armor: IDOL, armorRunes: ["affix_aegis"], armorSuffix: "suffix_phoenix", jewelry: MELEE_MIX_JEW, jewelrySuffix: "suffix_duelist" },
  { id: 6, style: "melee", label: "Götzeneisen-Platte + Großaxt, Dornen + Ägis, Koloss, Slayer-Schmuck", weapon: "godiron_greataxe", weaponRunes: ["affix_keen", "affix_precise"], weaponSuffix: "suffix_berserker", armor: GODIRON, armorRunes: ["affix_iron_answer", "affix_aegis"], armorSuffix: "suffix_colossus", jewelry: SLAYER_JEW, jewelrySuffix: "suffix_bear" },
  { id: 7, style: "melee", label: "Glaskanone: Kronenlosen-Klinge, Flamme/Schock/Auszehrung, Rüstung ohne Runen, Wucht", weapon: "crownless_blade", weaponRunes: ["affix_keen", "affix_flame", "affix_shock", "affix_wasting"], weaponSuffix: "suffix_berserker", armor: GODIRON, armorRunes: [], armorSuffix: "suffix_bear", jewelry: MELEE_DMG_JEW, jewelrySuffix: "suffix_brute", meleeStance: "power" },
  // ══ Nahkampf 8–11: Normal-Raid-Teile ══
  { id: 8, style: "melee", label: "Raid-N Blutschwur + Erbklinge, Ägis (Spec-Kit)", weapon: "gk_king_greatsword", weaponRunes: ["affix_keen"], weaponSuffix: "suffix_bull", armor: BLEED_N, armorRunes: ["affix_aegis"], armorSuffix: "suffix_bear", jewelry: raidJew(""), jewelrySuffix: "suffix_bear" },
  { id: 9, style: "melee", label: "Raid-N Blutschwur + Belagerungshammer, Glaskanone (nur Dornen auf der Rüstung)", weapon: "gk_quarter_maul", weaponRunes: ["affix_keen", "affix_warpath", "affix_flame", "affix_shock"], weaponSuffix: "suffix_carnage", armor: BLEED_N, armorRunes: ["affix_iron_answer"], armorSuffix: "suffix_bear", jewelry: raidJew(""), jewelrySuffix: "suffix_brute" },
  { id: 10, style: "melee", label: "Raid-N Blutschwur + Grubenzahn + Turmschild der Mark, Ägis", weapon: "gk_pit_scimitar", weaponRunes: ["affix_keen", "affix_judgement"], weaponSuffix: "suffix_bull", offhand: "gk_quarter_shield", offhandRunes: ["affix_unbroken_wall", "affix_aegis"], offhandSuffix: "suffix_tortoise", armor: BLEED_N, armorRunes: ["affix_aegis"], armorSuffix: "suffix_tortoise", jewelry: raidJew(""), jewelrySuffix: "suffix_bear" },
  { id: 11, style: "melee", label: "Raid-N 2/5 (Brust/Beine) + Götzeneisen, Kronenlosen-Klinge", weapon: "crownless_blade", weaponRunes: ["affix_keen"], weaponSuffix: "suffix_bull", armor: { ...GODIRON, body: "gk_bleed_chest", legs: "gk_bleed_legs" }, armorRunes: ["affix_aegis"], armorSuffix: "suffix_bear", jewelry: MELEE_DMG_JEW, jewelrySuffix: "suffix_bear" },
  // ══ Nahkampf 12–15: Heroisch-Raid-Teile ══
  { id: 12, style: "melee", label: "Raid-H Blutschwur + Erbklinge, Ägis (Spec-Kit)", weapon: "gk_king_greatsword_heroic", weaponRunes: ["affix_keen"], weaponSuffix: "suffix_bull", armor: BLEED_H, armorRunes: ["affix_aegis"], armorSuffix: "suffix_bear", jewelry: raidJew("_heroic"), jewelrySuffix: "suffix_bear" },
  { id: 13, style: "melee", label: "Raid-H Blutschwur + Pfandmesser + Turmschild, Tempo, Henker", weapon: "gk_tally_dagger_heroic", weaponRunes: ["affix_swift", "affix_keen"], weaponSuffix: "suffix_executioner", offhand: "gk_quarter_shield_heroic", offhandRunes: ["affix_unbroken_wall", "affix_aegis"], offhandSuffix: "suffix_tortoise", armor: BLEED_H, armorRunes: ["affix_aegis"], armorSuffix: "suffix_tortoise", jewelry: raidJew("_heroic"), jewelrySuffix: "suffix_duelist" },
  { id: 14, style: "melee", label: "Raid-H Blutschwur + Erbklinge, Glaskanone (Urteil/Flamme/Schock, nur Dornen)", weapon: "gk_king_greatsword_heroic", weaponRunes: ["affix_keen", "affix_judgement", "affix_flame", "affix_shock"], weaponSuffix: "suffix_carnage", armor: BLEED_H, armorRunes: ["affix_iron_answer"], armorSuffix: "suffix_bear", jewelry: raidJew("_heroic"), jewelrySuffix: "suffix_brute" },
  { id: 15, style: "melee", label: "Raid gemischt (H-Brust/-Beine, N-Rest) + Belagerungshammer H, Dornen + Ägis, Koloss", weapon: "gk_quarter_maul_heroic", weaponRunes: ["affix_keen", "affix_warpath"], weaponSuffix: "suffix_bull", armor: { ...BLEED_N, body: "gk_bleed_chest_heroic", legs: "gk_bleed_legs_heroic" }, armorRunes: ["affix_iron_answer", "affix_aegis"], armorSuffix: "suffix_colossus", jewelry: raidJew("_heroic"), jewelrySuffix: "suffix_bulwark" },
  // ══ Fernkampf 16–22: Endgame ohne Raid-Teile ══
  { id: 16, style: "ranged", label: "Leerenleder + Kriegsbogen des Kronenlosen (kurz), Jäger, Ausweichen, Götzeneisen-Pfeile", weapon: "crownless_warbow", weaponRunes: ["affix_hunter"], weaponSuffix: "suffix_lynx", offhand: "godiron_quiver", offhandRunes: ["affix_hunter"], offhandSuffix: "suffix_lynx", armor: VOIDHIDE, armorRunes: ["affix_evasion"], armorSuffix: "suffix_lynx", jewelry: RANGED_DMG_JEW, jewelrySuffix: "suffix_tiger", arrow: "godiron_arrow" },
  { id: 17, style: "ranged", label: "Schadens-BiS (Slayer-Platte + Schattenleder), Kriegsbogen, Ausweichen/Ägis je Teil", weapon: "crownless_warbow", weaponRunes: ["affix_hunter"], weaponSuffix: "suffix_lynx", offhand: "godiron_quiver", offhandRunes: ["affix_hunter"], offhandSuffix: "suffix_lynx", armor: RANGED_DMG_MIX, armorRunes: ["affix_evasion", "affix_aegis"], armorSuffix: "suffix_tortoise", jewelry: RANGED_DMG_JEW, jewelrySuffix: "suffix_tiger", arrow: "godiron_arrow" },
  { id: 18, style: "ranged", label: "Leerenleder + Bogen der Namenlosen (lang), Zweiter Pfeil, Giftpfeile, Phantom", weapon: "nameless_longbow", weaponRunes: ["affix_second_arrow", "affix_hunter"], weaponSuffix: "suffix_phantom", offhand: "godiron_quiver", offhandRunes: ["affix_hunter"], offhandSuffix: "suffix_phantom", armor: VOIDHIDE, armorRunes: ["affix_evasion"], armorSuffix: "suffix_phantom", jewelry: RANGED_DMG_JEW, jewelrySuffix: "suffix_sniper", arrow: "godiron_arrow_poison" },
  { id: 19, style: "ranged", label: "wie 16, aber leerer Köcher (einfache Pfeile)", weapon: "crownless_warbow", weaponRunes: ["affix_hunter"], weaponSuffix: "suffix_lynx", offhand: "godiron_quiver", offhandRunes: ["affix_hunter"], offhandSuffix: "suffix_lynx", armor: VOIDHIDE, armorRunes: ["affix_evasion"], armorSuffix: "suffix_lynx", jewelry: RANGED_DMG_JEW, jewelrySuffix: "suffix_tiger", arrow: null },
  { id: 20, style: "ranged", label: "Götzenholz-Kurzbogen, Tempo, Viper, Haltung Schnell, Widerhakenpfeile", weapon: "godiron_shortbow", weaponRunes: ["affix_swift", "affix_hunter"], weaponSuffix: "suffix_viper", offhand: "godiron_quiver", offhandRunes: ["affix_swift", "affix_hunter"], offhandSuffix: "suffix_viper", armor: VOIDHIDE, armorRunes: ["affix_evasion"], armorSuffix: "suffix_sentinel", jewelry: RANGED_MIX_JEW, jewelrySuffix: "suffix_tiger", arrow: "godiron_arrow_bleed", rangedStance: "fast" },
  { id: 21, style: "ranged", label: "Platten-Schütze: Götzen-Platte (legendär) + Kriegsbogen, Ägis, Schildkröte", weapon: "crownless_warbow", weaponRunes: ["affix_hunter"], weaponSuffix: "suffix_lynx", offhand: "godiron_quiver", offhandRunes: ["affix_hunter"], offhandSuffix: "suffix_lynx", armor: IDOL, armorRunes: ["affix_aegis"], armorSuffix: "suffix_tortoise", jewelry: RANGED_DMG_JEW, jewelrySuffix: "suffix_tiger", arrow: "godiron_arrow" },
  { id: 22, style: "ranged", label: "Leerenleder + Die Letzte Vergeltung (lang), Flamme/Schock/Frost, Brandpfeile, zäher Schmuck", weapon: "last_vengeance", weaponRunes: ["affix_flame", "affix_shock", "affix_frost", "affix_hunter"], weaponSuffix: "suffix_executioner", offhand: "godiron_quiver", offhandRunes: ["affix_precise", "affix_hunter"], offhandSuffix: "suffix_tiger", armor: VOIDHIDE, armorRunes: ["affix_evasion"], armorSuffix: "suffix_colossus", jewelry: TANKY_JEW, jewelrySuffix: "suffix_bulwark", arrow: "godiron_arrow_fire" },
  // ══ Fernkampf 23–26: Normal-Raid-Teile ══
  { id: 23, style: "ranged", label: "Raid-N Pirschgewand + Kronbogen + Zeugmeister-Köcher, Ägis (Spec-Kit)", weapon: "gk_king_shortbow", weaponRunes: ["affix_hunter"], weaponSuffix: "suffix_lynx", offhand: "gk_quarter_quiver", offhandRunes: ["affix_hunter"], offhandSuffix: "suffix_lynx", armor: POISON_N, armorRunes: ["affix_aegis"], armorSuffix: "suffix_tortoise", jewelry: raidJew(""), jewelrySuffix: "suffix_tiger", arrow: "godiron_arrow" },
  { id: 24, style: "ranged", label: "Raid-N Pirschgewand + Rudelruf (lang), Ausweich-Runen (Klasse), Giftpfeile", weapon: "gk_pit_longbow", weaponRunes: ["affix_hunter", "affix_second_arrow"], weaponSuffix: "suffix_lynx", offhand: "gk_quarter_quiver", offhandRunes: ["affix_hunter"], offhandSuffix: "suffix_lynx", armor: POISON_N, armorRunes: ["affix_evasion"], armorSuffix: "suffix_lynx", jewelry: raidJew(""), jewelrySuffix: "suffix_tiger", arrow: "godiron_arrow_poison" },
  { id: 25, style: "ranged", label: "Raid-N Pirschgewand + Kronbogen, je 2 Ägis + 2 Ausweichen, Widerhakenpfeile, Phönix", weapon: "gk_king_shortbow", weaponRunes: ["affix_hunter", "affix_judgement"], weaponSuffix: "suffix_lynx", offhand: "gk_quarter_quiver", offhandRunes: ["affix_hunter"], offhandSuffix: "suffix_lynx", armor: POISON_N, armorRunes: ["affix_aegis", "affix_evasion"], armorSuffix: "suffix_phoenix", jewelry: raidJew(""), jewelrySuffix: "suffix_tiger", arrow: "godiron_arrow_bleed" },
  { id: 26, style: "ranged", label: "Raid-N 2/5 (Brust/Beine) + Leerenleder, Kriegsbogen, Ausweichen, Schadens-Schmuck", weapon: "crownless_warbow", weaponRunes: ["affix_hunter"], weaponSuffix: "suffix_lynx", offhand: "godiron_quiver", offhandRunes: ["affix_hunter"], offhandSuffix: "suffix_lynx", armor: { ...VOIDHIDE, body: "gk_poison_chest", legs: "gk_poison_legs" }, armorRunes: ["affix_evasion"], armorSuffix: "suffix_lynx", jewelry: RANGED_DMG_JEW, jewelrySuffix: "suffix_tiger", arrow: "godiron_arrow" },
  // ══ Fernkampf 27–30: Heroisch-Raid-Teile ══
  { id: 27, style: "ranged", label: "Raid-H Pirschgewand + Kronbogen + Zeugmeister-Köcher, Ägis (Spec-Kit)", weapon: "gk_king_shortbow_heroic", weaponRunes: ["affix_hunter"], weaponSuffix: "suffix_lynx", offhand: "gk_quarter_quiver_heroic", offhandRunes: ["affix_hunter"], offhandSuffix: "suffix_lynx", armor: POISON_H, armorRunes: ["affix_aegis"], armorSuffix: "suffix_tortoise", jewelry: raidJew("_heroic"), jewelrySuffix: "suffix_tiger", arrow: "godiron_arrow" },
  { id: 28, style: "ranged", label: "Raid-H Pirschgewand + Rudelruf (lang), Ausweichen, Zweiter Pfeil, Giftpfeile", weapon: "gk_pit_longbow_heroic", weaponRunes: ["affix_second_arrow", "affix_hunter"], weaponSuffix: "suffix_phantom", offhand: "gk_quarter_quiver_heroic", offhandRunes: ["affix_hunter"], offhandSuffix: "suffix_phantom", armor: POISON_H, armorRunes: ["affix_evasion"], armorSuffix: "suffix_lynx", jewelry: raidJew("_heroic"), jewelrySuffix: "suffix_sniper", arrow: "godiron_arrow_poison" },
  { id: 29, style: "ranged", label: "Raid-H Pirschgewand + Kronbogen, Glaskanone (Flamme/Schock, Hinterhalt), Schnell, Brandpfeile", weapon: "gk_king_shortbow_heroic", weaponRunes: ["affix_hunter", "affix_flame", "affix_shock", "affix_second_arrow"], weaponSuffix: "suffix_executioner", offhand: "gk_quarter_quiver_heroic", offhandRunes: ["affix_swift", "affix_hunter"], offhandSuffix: "suffix_viper", armor: POISON_H, armorRunes: ["affix_ambush"], armorSuffix: "suffix_lynx", jewelry: raidJew("_heroic"), jewelrySuffix: "suffix_sniper", arrow: "godiron_arrow_fire", rangedStance: "fast" },
  { id: 30, style: "ranged", label: "Raid gemischt (H-Brust/-Beine, N-Rest) + Kronbogen H, Ägis/Ausweichen, Widerhakenpfeile, Bollwerk-Schmuck", weapon: "gk_king_shortbow_heroic", weaponRunes: ["affix_hunter"], weaponSuffix: "suffix_lynx", offhand: "gk_quarter_quiver", offhandRunes: ["affix_hunter"], offhandSuffix: "suffix_lynx", armor: { ...POISON_N, body: "gk_poison_chest_heroic", legs: "gk_poison_legs_heroic" }, armorRunes: ["affix_evasion"], armorRunesBySlot: { body: ["affix_aegis"], legs: ["affix_aegis"] }, armorSuffix: "suffix_colossus", jewelry: raidJew("_heroic"), jewelrySuffix: "suffix_bulwark", arrow: "godiron_arrow_bleed" },
];

/** Höchste vorhandene Runenstufe je Affix (aus den Runen-Items des Katalogs). */
const RUNE_TIER = new Map<string, number>();
for (const it of Object.values(content.items)) {
  if (!it.rune) continue;
  RUNE_TIER.set(it.rune.affixId, Math.max(RUNE_TIER.get(it.rune.affixId) ?? 0, it.rune.tier));
}

/** Instanz mit den gewünschten Runen (nur legale; Proc-Runen einmal, Stat-Runen füllen auf) und Max-Roll-Suffix. Wie im Magier-Harness, plus Köcher-Regel. */
function inst(slot: EquipSlot, itemId: string, runes: string[], suffixId: string, dropped: string[]): ItemInstance {
  const base = content.items[itemId];
  if (!base) throw new Error(`Item fehlt: ${itemId}`);
  const legal = runes.filter((id) => {
    const def = content.affixes?.[id];
    const tier = RUNE_TIER.get(id) ?? 0;
    const ok = !!def && tier > 0 && affixAppliesToItem(def.appliesTo, base) && quiverAcceptsAffix(id, base) && trinityGatePasses(def, tier, base);
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
  const out: ItemInstance = { instanceId: `style-${slot}`, baseItemId: itemId, affixes };
  const sdef = content.suffixes?.[suffixId];
  if (sdef && affixAppliesToItem(sdef.appliesTo, base)) out.suffix = { suffixId, ilvl: 100, roll: 1 };
  else dropped.push(`${slot}:${suffixId.replace("suffix_", "")}`);
  return out;
}

function buildStyle(b: StyleBuild, seed: number): { state: GameState; dropped: string[] } {
  const s = buildBisCharacter(content, b.style, 99, "damage", { allBuffs: true, excludeRaid: true, seed }).state;
  const dropped: string[] = [];
  const eq = s.character.equipment;
  for (const k of Object.keys(eq) as EquipSlot[]) eq[k] = null;
  const eqi: NonNullable<GameState["character"]["equippedInstances"]> = {};
  const put = (slot: EquipSlot, itemId: string, runes: string[], suffix: string) => {
    eq[slot] = itemId;
    eqi[slot] = inst(slot, itemId, runes, suffix, dropped);
  };
  put("mainhand", b.weapon, b.weaponRunes, b.weaponSuffix);
  if (b.offhand) put("offhand", b.offhand, b.offhandRunes ?? [], b.offhandSuffix ?? b.weaponSuffix);
  for (const slot of ARMOR) put(slot, b.armor[slot as keyof Armor], b.armorRunesBySlot?.[slot] ?? b.armorRunes, b.armorSuffix);
  for (const slot of ["amulet", "cape", "ring1", "ring2"] as const) put(slot, b.jewelry[slot], [], b.jewelrySuffix);
  s.character.equippedInstances = eqi;
  // Köcher-Ladung: der Builder lädt Götzeneisen-Pfeile; hier je Build überschrieben (null = leer).
  s.character.quiver = b.style === "ranged" && b.arrow ? { itemId: b.arrow, qty: ARROWS } : null;
  if (b.meleeStance) s.character.combatStyle = b.meleeStance;
  if (b.rangedStance) s.character.rangedStance = b.rangedStance;
  equipPet(s, "carapace");
  equipSecondPet(s, content, b.style === "melee" ? "ironmaw" : null);
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

interface Run { done: boolean; minutes: number; restarts: number; where: string; restartAt: string[]; food: number; pots: number; arrows: number }

/** Wie runRaid im Magier-Harness (10-s-Raster, Ort = zuletzt gesehene Begegnung); zusätzlich Neustart-Orte und Pfeilverbrauch. */
function runRaid(s: GameState, d: RaidDifficulty): Run {
  const food0 = itemCount(s.inventory, FOOD);
  const pot0 = itemCount(s.inventory, POTION);
  const arrows0 = s.character.quiver?.qty ?? 0;
  expect(startRaid(s, content, "gobkharaz", d)).toBe("ok");
  let last = "R1";
  let restarts = 0;
  const restartAt: string[] = [];
  const used = () => ({ food: food0 - itemCount(s.inventory, FOOD), pots: pot0 - itemCount(s.inventory, POTION), arrows: arrows0 - (s.character.quiver?.qty ?? 0) });
  for (let t = 0; t < 5 * 3_600_000; t += 10_000) {
    advance(s, content, 10_000, { offline: true });
    const run = s.raid!.run;
    if (run) {
      if (run.restarts > restarts) {
        for (let k = restarts; k < run.restarts; k++) restartAt.push(last);
        restarts = run.restarts;
      }
      if (run.phase === "fight" && s.combat.monsterId) {
        const enc = s.combat.encounterIndex;
        last = `R${run.room + 1}·${enc === 4 ? `Boss·P${s.combat.bossPhase ?? 0}` : `W${enc + 1}`}`;
      }
    }
    const res = s.raid!.lastResult;
    if (res) {
      return { done: res.outcome === "complete", minutes: res.durationMs / 60_000, restarts, where: res.outcome === "complete" ? "" : last, restartAt, ...used() };
    }
  }
  return { done: false, minutes: 300, restarts, where: `${last} (Zeit)`, restartAt, ...used() };
}

const median = (xs: number[]): number => {
  if (!xs.length) return NaN;
  const a = [...xs].sort((x, y) => x - y);
  return a.length % 2 ? a[a.length >> 1]! : (a[(a.length >> 1) - 1]! + a[a.length >> 1]!) / 2;
};
const tally = (xs: string[]): string => {
  const m = new Map<string, number>();
  for (const x of xs) m.set(x, (m.get(x) ?? 0) + 1);
  return [...m].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}×${v}`).join(", ") || "–";
};

/** `1-15,20,22` → Menge der Build-IDs. */
function parseIds(raw: string | undefined): Set<number> | null {
  if (!raw) return null;
  const out = new Set<number>();
  for (const part of raw.split(",")) {
    const [a, b] = part.split("-").map(Number);
    if (b === undefined) out.add(a!);
    else for (let i = a!; i <= b; i++) out.add(i);
  }
  return out;
}

describe.skipIf(!ON)("Raid: 15 Nahkampf- und 15 Fernkampf-Builds", () => {
  const diffs = (process.env.RAID_STYLE_DIFF ?? "normal,heroic,mythic").split(",") as RaidDifficulty[];
  const N = Number(process.env.RAID_STYLE_N ?? 10);
  const ids = parseIds(process.env.RAID_STYLE_IDS);
  const pick = B.filter((b) => !ids || ids.has(b.id));
  const rows: string[] = [];

  it.skipIf(!process.env.RAID_STYLE_DOC)("Kits (Dokumentation)", () => {
    for (const b of pick) {
      const { state, dropped } = buildStyle(b, 2000);
      const eqi = state.character.equippedInstances ?? {};
      const parts = (Object.keys(state.character.equipment) as EquipSlot[])
        .filter((slot) => state.character.equipment[slot])
        .map((slot) => {
          const i = eqi[slot];
          const runes = i?.affixes.map((a) => `${a.affixId.replace("affix_", "")}${a.tier}`).join("+") || "–";
          return `${slot}: ${state.character.equipment[slot]} [${runes} / ${i?.suffix?.suffixId.replace("suffix_", "") ?? "–"}]`;
        });
      const st = computeStats(state, content);
      console.log(
        `#${b.id} ${b.label}\n  ${parts.join("\n  ")}\n  Köcher ${state.character.quiver?.itemId ?? "leer"} · Haltung ${b.style === "melee" ? state.character.combatStyle : state.character.rangedStance} · ` +
          `Begleiter ${state.character.companionPetId}+${state.character.companionPetId2 ?? "-"} · Buffs ${state.character.buffs.map((x) => x.itemId).join(",")}\n` +
          `  HP ${st.maxHp} · Rüstung ${st.armorRating.toFixed(0)} · Ausweichen ${(st.dodgeChance * 100).toFixed(1)} % · Block ${(st.blockChance * 100).toFixed(0)} % · Ward ${st.maxWard.toFixed(0)} · ` +
          `Schaden ${st.attackDamageMin.toFixed(0)}–${st.attackDamageMax.toFixed(0)} @${st.attackIntervalMs.toFixed(0)} · Krit ${(st.critChance * 100).toFixed(0)} %/${st.critDamage.toFixed(2)} · Regen ${st.hpRegenPerSec.toFixed(2)}/s · verworfen ${dropped.join(" ") || "–"}`,
      );
    }
    expect(pick.length).toBeGreaterThan(0);
  });

  for (const d of diffs) {
    it(`Stufe ${d}: ${pick.length} Builds × ${N} Läufe`, () => {
      // claude:2026-10-24T00:02:00+02:00 — Gegenprobe nur, wenn der Live-Faktor noch 1,3 ist (Vrikka Basis 270 → 351).
      expect(liveContent.monsters.gk_tallymistress!.damage).toBe(Math.round(270 * LIVE_RAID_DAMAGE_SCALE));
      if (DMG_SCALE !== null) rows.push(`Gegenprobe: Raid-Gegnerschaden ×${DMG_SCALE} statt ×${LIVE_RAID_DAMAGE_SCALE} (Test-Ableger, Vrikka ${content.monsters.gk_tallymistress!.damage})`);
      rows.push(`| Build | Stufe | Abschlüsse | Median min | Neustarts | Niederlagen-Ort | Neustart-Orte | HP | Ward | Rüstung | Ausweichen | Block | Schaden | Krit | Essen | Tränke | Pfeile | verworfen |`);
      for (const b of pick) {
        const runs: Run[] = [];
        let doc = { hp: 0, ward: 0, ar: 0, dodge: "", block: "", dmg: "", crit: "", dropped: [] as string[] };
        for (let i = 0; i < N; i++) {
          const { state, dropped } = buildStyle(b, 2000 + i);
          if (i === 0) {
            const st = computeStats(state, content);
            doc = {
              hp: st.maxHp,
              ward: Math.round(st.maxWard),
              ar: Math.round(st.armorRating),
              dodge: `${(st.dodgeChance * 100).toFixed(0)}%`,
              block: `${(st.blockChance * 100).toFixed(0)}%`,
              dmg: `${st.attackDamageMin.toFixed(0)}–${st.attackDamageMax.toFixed(0)}@${Math.round(st.attackIntervalMs)}`,
              crit: `${Math.round(st.critChance * 100)}%`,
              dropped,
            };
          }
          runs.push(runRaid(state, d));
        }
        const done = runs.filter((r) => r.done);
        const line =
          `| ${b.id} ${b.label} | ${d} | ${done.length}/${N} | ${done.length ? median(done.map((r) => r.minutes)).toFixed(1) : "–"} | ${runs.reduce((a, r) => a + r.restarts, 0)} | ` +
          `${tally(runs.map((r) => r.where).filter(Boolean))} | ${tally(runs.flatMap((r) => r.restartAt))} | ${doc.hp} | ${doc.ward} | ${doc.ar} | ${doc.dodge} | ${doc.block} | ${doc.dmg} | ${doc.crit} | ` +
          `${Math.round(median(runs.map((r) => r.food)))} | ${Math.round(median(runs.map((r) => r.pots)))} | ${b.style === "ranged" ? Math.round(median(runs.map((r) => r.arrows))) : "–"} | ${doc.dropped.join(" ") || "–"} |`;
        rows.push(line);
        console.log(line);
      }
      if (process.env.RAID_STYLE_OUT) writeFileSync(process.env.RAID_STYLE_OUT, rows.join("\n") + "\n");
    }, 3_600_000);
  }
});
