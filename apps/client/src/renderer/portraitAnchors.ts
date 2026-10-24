/**
 * Portrait-Ankerpunkte (Chef-Auftrag 28.08.2026): „Jedes Charakterbild braucht einen Ankerpunkt,
 * von dem Magie-Projektile abgefeuert werden."
 *
 * Alle 297 Portraits unter `assets/portraits/*.webp` wurden am 28.08.2026 visuell vermessen
 * (Messbögen mit 10-%-Raster, danach Kontrollbögen mit eingezeichneten Markern). Koordinaten sind
 * Anteile der GESAMTEN Bildfläche (0..1, Ursprung oben links), unabhängig von der Pixelgröße —
 * die Umrechnung auf die tatsächlich gezeichnete Fläche des `<img>` (object-fit: contain) macht
 * `containedImageRect` + `anchorToStagePoint` (Verwendung: CombatPage `playerAnchorPoint`).
 *
 *   staff  — Stab/Zauberstab/Zepter/Orb-Stab im Bild (57 von 297); Speer/Bogen/Schwert = false
 *   magic  — Austrittspunkt eines Zaubers: Stabspitze (Kristall/Knauf) bzw. ohne Stab die führende
 *            Hand oder die nach vorn/oben zeigende Waffenspitze (Bogen: Bogenmitte)
 *   hand   — Waffenhand (für spätere Nahkampf-Anker)
 *   facing — Blickrichtung der Figur im Bild (alle Bestandsportraits schauen nach rechts)
 *
 * Generiert aus scratchpad `anchors/portrait-anchors.json` (gen_ts.py) — bei neuen Portraits
 * NICHT raten, sondern nachmessen; fehlt ein Eintrag, greift `DEFAULT_PORTRAIT_ANCHOR`.
 * NPC-Büsten (npc_*, slayermaster_*) tragen Brust-Mitte als Platzhalter (kämpfen nie).
 */
export interface AnchorPoint {
  x: number;
  y: number;
}

export interface PortraitAnchor {
  staff: boolean;
  facing: "left" | "right";
  magic: AnchorPoint;
  hand: AnchorPoint;
}

export interface AnchorRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Rückfall für unbekannte IDs (eigene Uploads als Data-URL, künftige Portraits ohne Messung):
 *  Brust-/Handhöhe rechts der Bildmitte — nahe am alten Box-Punkt (0.55/0.32 der Figurenbox). */
export const DEFAULT_PORTRAIT_ANCHOR: PortraitAnchor = {
  staff: false,
  facing: "right",
  magic: { x: 0.62, y: 0.42 },
  hand: { x: 0.62, y: 0.55 },
};

export const PORTRAIT_ANCHORS: Record<string, PortraitAnchor> = {
  "archer_f": { staff: false, facing: "right", magic: { x: 0.68, y: 0.44 }, hand: { x: 0.65, y: 0.45 } },
  "archer_m": { staff: false, facing: "right", magic: { x: 0.70, y: 0.43 }, hand: { x: 0.68, y: 0.44 } },
  "char--6": { staff: false, facing: "left", magic: { x: 0.18, y: 0.35 }, hand: { x: 0.57, y: 0.50 } },
  "char-27": { staff: false, facing: "right", magic: { x: 0.36, y: 0.46 }, hand: { x: 0.36, y: 0.46 } },
  "char-30": { staff: false, facing: "right", magic: { x: 0.23, y: 0.48 }, hand: { x: 0.23, y: 0.48 } },
  "char_1": { staff: false, facing: "right", magic: { x: 0.37, y: 0.59 }, hand: { x: 0.37, y: 0.59 } },
  "char_10": { staff: false, facing: "right", magic: { x: 0.29, y: 0.49 }, hand: { x: 0.29, y: 0.49 } },
  "char_11": { staff: false, facing: "right", magic: { x: 0.30, y: 0.48 }, hand: { x: 0.30, y: 0.48 } },
  "char_12": { staff: false, facing: "right", magic: { x: 0.68, y: 0.49 }, hand: { x: 0.62, y: 0.51 } },
  "char_13": { staff: false, facing: "right", magic: { x: 0.74, y: 0.49 }, hand: { x: 0.68, y: 0.51 } },
  "char_14": { staff: false, facing: "right", magic: { x: 0.24, y: 0.53 }, hand: { x: 0.24, y: 0.53 } },
  "char_15_f": { staff: false, facing: "right", magic: { x: 0.21, y: 0.53 }, hand: { x: 0.21, y: 0.53 } },
  "char_16_m": { staff: true, facing: "right", magic: { x: 0.25, y: 0.13 }, hand: { x: 0.29, y: 0.40 } },
  "char_17_f": { staff: true, facing: "right", magic: { x: 0.23, y: 0.10 }, hand: { x: 0.29, y: 0.38 } },
  "char_18_m": { staff: false, facing: "right", magic: { x: 0.21, y: 0.07 }, hand: { x: 0.26, y: 0.40 } },
  "char_19_f": { staff: false, facing: "right", magic: { x: 0.44, y: 0.51 }, hand: { x: 0.44, y: 0.51 } },
  "char_2": { staff: false, facing: "right", magic: { x: 0.35, y: 0.53 }, hand: { x: 0.35, y: 0.53 } },
  "char_20_f": { staff: false, facing: "right", magic: { x: 0.15, y: 0.11 }, hand: { x: 0.33, y: 0.42 } },
  "char_20_m": { staff: false, facing: "right", magic: { x: 0.25, y: 0.40 }, hand: { x: 0.25, y: 0.40 } },
  "char_21_m": { staff: true, facing: "right", magic: { x: 0.21, y: 0.19 }, hand: { x: 0.24, y: 0.38 } },
  "char_22_f": { staff: false, facing: "right", magic: { x: 0.31, y: 0.49 }, hand: { x: 0.31, y: 0.49 } },
  "char_23_m": { staff: false, facing: "right", magic: { x: 0.72, y: 0.50 }, hand: { x: 0.70, y: 0.53 } },
  "char_24": { staff: false, facing: "right", magic: { x: 0.28, y: 0.50 }, hand: { x: 0.28, y: 0.50 } },
  "char_25": { staff: false, facing: "right", magic: { x: 0.33, y: 0.49 }, hand: { x: 0.33, y: 0.49 } },
  "char_26": { staff: false, facing: "right", magic: { x: 0.25, y: 0.53 }, hand: { x: 0.25, y: 0.53 } },
  "char_28": { staff: true, facing: "right", magic: { x: 0.24, y: 0.12 }, hand: { x: 0.29, y: 0.40 } },
  "char_3": { staff: false, facing: "right", magic: { x: 0.37, y: 0.53 }, hand: { x: 0.37, y: 0.53 } },
  "char_31": { staff: true, facing: "right", magic: { x: 0.21, y: 0.06 }, hand: { x: 0.28, y: 0.38 } },
  "char_33": { staff: false, facing: "right", magic: { x: 0.21, y: 0.48 }, hand: { x: 0.21, y: 0.48 } },
  "char_34": { staff: false, facing: "right", magic: { x: 0.28, y: 0.55 }, hand: { x: 0.28, y: 0.55 } },
  "char_35": { staff: false, facing: "right", magic: { x: 0.66, y: 0.07 }, hand: { x: 0.33, y: 0.24 } },
  "char_36": { staff: false, facing: "right", magic: { x: 0.27, y: 0.45 }, hand: { x: 0.27, y: 0.45 } },
  "char_37": { staff: false, facing: "right", magic: { x: 0.35, y: 0.23 }, hand: { x: 0.35, y: 0.23 } },
  "char_38": { staff: false, facing: "right", magic: { x: 0.26, y: 0.51 }, hand: { x: 0.26, y: 0.51 } },
  "char_39": { staff: false, facing: "right", magic: { x: 0.30, y: 0.50 }, hand: { x: 0.30, y: 0.50 } },
  "char_4": { staff: false, facing: "right", magic: { x: 0.69, y: 0.51 }, hand: { x: 0.69, y: 0.51 } },
  "char_40": { staff: false, facing: "right", magic: { x: 0.25, y: 0.23 }, hand: { x: 0.25, y: 0.23 } },
  "char_5": { staff: false, facing: "right", magic: { x: 0.38, y: 0.46 }, hand: { x: 0.38, y: 0.46 } },
  "char_6": { staff: false, facing: "right", magic: { x: 0.78, y: 0.42 }, hand: { x: 0.75, y: 0.43 } },
  "char_7": { staff: false, facing: "right", magic: { x: 0.74, y: 0.50 }, hand: { x: 0.71, y: 0.52 } },
  "char_8": { staff: true, facing: "right", magic: { x: 0.13, y: 0.15 }, hand: { x: 0.23, y: 0.45 } },
  "char_9": { staff: true, facing: "right", magic: { x: 0.14, y: 0.06 }, hand: { x: 0.23, y: 0.36 } },
  "elf_berserker_f": { staff: false, facing: "right", magic: { x: 0.19, y: 0.19 }, hand: { x: 0.55, y: 0.42 } },
  "elf_berserker_m": { staff: false, facing: "right", magic: { x: 0.23, y: 0.18 }, hand: { x: 0.52, y: 0.37 } },
  "elf_blacksmith_f": { staff: false, facing: "right", magic: { x: 0.24, y: 0.51 }, hand: { x: 0.24, y: 0.51 } },
  "elf_blacksmith_m": { staff: false, facing: "right", magic: { x: 0.26, y: 0.51 }, hand: { x: 0.26, y: 0.51 } },
  "elf_builder_f": { staff: false, facing: "right", magic: { x: 0.29, y: 0.51 }, hand: { x: 0.29, y: 0.51 } },
  "elf_builder_m": { staff: false, facing: "right", magic: { x: 0.33, y: 0.53 }, hand: { x: 0.33, y: 0.53 } },
  "elf_cook_f": { staff: false, facing: "right", magic: { x: 0.26, y: 0.26 }, hand: { x: 0.26, y: 0.26 } },
  "elf_cook_m": { staff: false, facing: "right", magic: { x: 0.34, y: 0.45 }, hand: { x: 0.34, y: 0.45 } },
  "elf_death_knight_f": { staff: false, facing: "right", magic: { x: 0.33, y: 0.46 }, hand: { x: 0.33, y: 0.46 } },
  "elf_death_knight_m": { staff: false, facing: "right", magic: { x: 0.35, y: 0.45 }, hand: { x: 0.35, y: 0.45 } },
  "elf_duelist_f": { staff: false, facing: "right", magic: { x: 0.67, y: 0.25 }, hand: { x: 0.29, y: 0.30 } },
  "elf_duelist_m": { staff: false, facing: "right", magic: { x: 0.76, y: 0.27 }, hand: { x: 0.34, y: 0.36 } },
  "elf_enchanter_f": { staff: true, facing: "right", magic: { x: 0.67, y: 0.19 }, hand: { x: 0.55, y: 0.25 } }, // kleiner Zauberstab/Stichel, unsicher
  "elf_enchanter_m": { staff: true, facing: "right", magic: { x: 0.72, y: 0.22 }, hand: { x: 0.56, y: 0.25 } }, // kleiner Zauberstab/Stichel, unsicher
  "elf_farmer_f": { staff: false, facing: "right", magic: { x: 0.33, y: 0.49 }, hand: { x: 0.33, y: 0.49 } },
  "elf_farmer_m": { staff: false, facing: "right", magic: { x: 0.30, y: 0.51 }, hand: { x: 0.30, y: 0.51 } },
  "elf_fire_mage_f": { staff: true, facing: "right", magic: { x: 0.85, y: 0.15 }, hand: { x: 0.56, y: 0.36 } },
  "elf_fire_mage_m": { staff: true, facing: "right", magic: { x: 0.82, y: 0.21 }, hand: { x: 0.53, y: 0.29 } },
  "elf_fisher_f": { staff: false, facing: "right", magic: { x: 0.22, y: 0.28 }, hand: { x: 0.35, y: 0.42 } },
  "elf_fisher_m": { staff: false, facing: "right", magic: { x: 0.38, y: 0.45 }, hand: { x: 0.38, y: 0.45 } },
  "elf_forager_f": { staff: false, facing: "right", magic: { x: 0.33, y: 0.46 }, hand: { x: 0.33, y: 0.46 } },
  "elf_forager_m": { staff: false, facing: "right", magic: { x: 0.30, y: 0.49 }, hand: { x: 0.30, y: 0.49 } },
  "elf_frost_mage_f": { staff: true, facing: "right", magic: { x: 0.20, y: 0.12 }, hand: { x: 0.49, y: 0.36 } },
  "elf_frost_mage_m": { staff: true, facing: "right", magic: { x: 0.82, y: 0.15 }, hand: { x: 0.50, y: 0.32 } },
  "elf_herbalist_f": { staff: false, facing: "right", magic: { x: 0.62, y: 0.32 }, hand: { x: 0.62, y: 0.32 } },
  "elf_herbalist_m": { staff: false, facing: "right", magic: { x: 0.63, y: 0.30 }, hand: { x: 0.63, y: 0.30 } },
  "elf_jeweler_f": { staff: false, facing: "right", magic: { x: 0.56, y: 0.23 }, hand: { x: 0.56, y: 0.23 } },
  "elf_jeweler_m": { staff: false, facing: "right", magic: { x: 0.57, y: 0.22 }, hand: { x: 0.57, y: 0.22 } },
  "elf_leatherworker_f": { staff: false, facing: "right", magic: { x: 0.65, y: 0.25 }, hand: { x: 0.65, y: 0.25 } },
  "elf_leatherworker_m": { staff: false, facing: "right", magic: { x: 0.72, y: 0.49 }, hand: { x: 0.72, y: 0.49 } },
  "elf_miner_f": { staff: false, facing: "right", magic: { x: 0.73, y: 0.23 }, hand: { x: 0.59, y: 0.33 } },
  "elf_miner_m": { staff: false, facing: "right", magic: { x: 0.74, y: 0.23 }, hand: { x: 0.58, y: 0.36 } },
  "elf_paladin_f": { staff: false, facing: "right", magic: { x: 0.25, y: 0.41 }, hand: { x: 0.25, y: 0.41 } },
  "elf_paladin_m": { staff: false, facing: "right", magic: { x: 0.26, y: 0.41 }, hand: { x: 0.26, y: 0.41 } },
  "elf_ranger_f": { staff: false, facing: "right", magic: { x: 0.76, y: 0.36 }, hand: { x: 0.76, y: 0.36 } },
  "elf_ranger_m": { staff: false, facing: "right", magic: { x: 0.74, y: 0.36 }, hand: { x: 0.74, y: 0.36 } },
  "elf_rogue_f": { staff: false, facing: "right", magic: { x: 0.74, y: 0.48 }, hand: { x: 0.74, y: 0.48 } },
  "elf_rogue_m": { staff: false, facing: "right", magic: { x: 0.79, y: 0.46 }, hand: { x: 0.79, y: 0.46 } },
  "elf_rune_knight_f": { staff: false, facing: "right", magic: { x: 0.85, y: 0.22 }, hand: { x: 0.27, y: 0.37 } },
  "elf_rune_knight_m": { staff: false, facing: "right", magic: { x: 0.84, y: 0.22 }, hand: { x: 0.33, y: 0.36 } },
  "elf_runecrafter_f": { staff: false, facing: "right", magic: { x: 0.45, y: 0.30 }, hand: { x: 0.45, y: 0.30 } },
  "elf_runecrafter_m": { staff: false, facing: "right", magic: { x: 0.40, y: 0.30 }, hand: { x: 0.40, y: 0.30 } },
  "elf_shadow_mage_f": { staff: true, facing: "right", magic: { x: 0.84, y: 0.11 }, hand: { x: 0.77, y: 0.36 } },
  "elf_shadow_mage_m": { staff: true, facing: "right", magic: { x: 0.18, y: 0.12 }, hand: { x: 0.21, y: 0.37 } },
  "elf_shaman_f": { staff: true, facing: "right", magic: { x: 0.24, y: 0.10 }, hand: { x: 0.31, y: 0.40 } },
  "elf_shaman_m": { staff: true, facing: "right", magic: { x: 0.22, y: 0.08 }, hand: { x: 0.30, y: 0.40 } },
  "elf_slayer_f": { staff: false, facing: "right", magic: { x: 0.34, y: 0.45 }, hand: { x: 0.34, y: 0.45 } },
  "elf_slayer_m": { staff: false, facing: "right", magic: { x: 0.27, y: 0.48 }, hand: { x: 0.27, y: 0.48 } },
  "elf_spear_warden_f": { staff: false, facing: "right", magic: { x: 0.88, y: 0.07 }, hand: { x: 0.66, y: 0.25 } },
  "elf_spear_warden_m": { staff: false, facing: "right", magic: { x: 0.87, y: 0.11 }, hand: { x: 0.61, y: 0.27 } },
  "elf_thief_f": { staff: false, facing: "right", magic: { x: 0.63, y: 0.33 }, hand: { x: 0.63, y: 0.33 } },
  "elf_thief_m": { staff: false, facing: "right", magic: { x: 0.60, y: 0.36 }, hand: { x: 0.60, y: 0.36 } },
  "elf_warlock_f": { staff: true, facing: "right", magic: { x: 0.18, y: 0.10 }, hand: { x: 0.29, y: 0.40 } },
  "elf_warlock_m": { staff: true, facing: "right", magic: { x: 0.18, y: 0.10 }, hand: { x: 0.25, y: 0.41 } },
  "elf_warrior_f": { staff: false, facing: "right", magic: { x: 0.21, y: 0.42 }, hand: { x: 0.21, y: 0.42 } },
  "elf_warrior_m": { staff: false, facing: "right", magic: { x: 0.29, y: 0.46 }, hand: { x: 0.29, y: 0.46 } },
  "elf_weaponsmith_f": { staff: false, facing: "right", magic: { x: 0.78, y: 0.10 }, hand: { x: 0.62, y: 0.22 } },
  "elf_weaponsmith_m": { staff: false, facing: "right", magic: { x: 0.75, y: 0.18 }, hand: { x: 0.60, y: 0.33 } },
  "elf_woodcutter_f": { staff: false, facing: "right", magic: { x: 0.78, y: 0.42 }, hand: { x: 0.49, y: 0.45 } },
  "elf_woodcutter_m": { staff: false, facing: "right", magic: { x: 0.74, y: 0.44 }, hand: { x: 0.47, y: 0.46 } },
  "goblin_berserker_f": { staff: false, facing: "right", magic: { x: 0.21, y: 0.17 }, hand: { x: 0.33, y: 0.33 } },
  "goblin_berserker_m": { staff: false, facing: "right", magic: { x: 0.78, y: 0.34 }, hand: { x: 0.54, y: 0.41 } },
  "goblin_blacksmith_f": { staff: false, facing: "right", magic: { x: 0.31, y: 0.49 }, hand: { x: 0.31, y: 0.49 } },
  "goblin_blacksmith_m": { staff: false, facing: "right", magic: { x: 0.22, y: 0.49 }, hand: { x: 0.22, y: 0.49 } },
  "goblin_builder_f": { staff: false, facing: "right", magic: { x: 0.29, y: 0.51 }, hand: { x: 0.29, y: 0.51 } },
  "goblin_builder_m": { staff: false, facing: "right", magic: { x: 0.29, y: 0.53 }, hand: { x: 0.29, y: 0.53 } },
  "goblin_cook_f": { staff: false, facing: "right", magic: { x: 0.24, y: 0.15 }, hand: { x: 0.32, y: 0.30 } },
  "goblin_cook_m": { staff: false, facing: "right", magic: { x: 0.68, y: 0.42 }, hand: { x: 0.79, y: 0.23 } },
  "goblin_death_knight_f": { staff: false, facing: "right", magic: { x: 0.85, y: 0.07 }, hand: { x: 0.47, y: 0.40 } },
  "goblin_death_knight_m": { staff: false, facing: "right", magic: { x: 0.88, y: 0.07 }, hand: { x: 0.46, y: 0.40 } },
  "goblin_duelist_f": { staff: false, facing: "right", magic: { x: 0.81, y: 0.27 }, hand: { x: 0.30, y: 0.36 } },
  "goblin_duelist_m": { staff: false, facing: "right", magic: { x: 0.85, y: 0.32 }, hand: { x: 0.29, y: 0.40 } },
  "goblin_enchanter_f": { staff: true, facing: "right", magic: { x: 0.66, y: 0.26 }, hand: { x: 0.51, y: 0.30 } }, // kleiner Zauberstab/Stichel, unsicher
  "goblin_enchanter_m": { staff: true, facing: "right", magic: { x: 0.63, y: 0.29 }, hand: { x: 0.49, y: 0.33 } }, // kleiner Zauberstab/Stichel, unsicher
  "goblin_farmer_f": { staff: false, facing: "right", magic: { x: 0.33, y: 0.49 }, hand: { x: 0.33, y: 0.49 } },
  "goblin_farmer_m": { staff: false, facing: "right", magic: { x: 0.32, y: 0.52 }, hand: { x: 0.32, y: 0.52 } },
  "goblin_fire_mage_f": { staff: true, facing: "right", magic: { x: 0.18, y: 0.11 }, hand: { x: 0.27, y: 0.38 } },
  "goblin_fire_mage_m": { staff: true, facing: "right", magic: { x: 0.22, y: 0.11 }, hand: { x: 0.29, y: 0.41 } },
  "goblin_fisher_f": { staff: false, facing: "right", magic: { x: 0.70, y: 0.48 }, hand: { x: 0.70, y: 0.48 } },
  "goblin_fisher_m": { staff: false, facing: "right", magic: { x: 0.70, y: 0.48 }, hand: { x: 0.70, y: 0.48 } },
  "goblin_forager_f": { staff: false, facing: "right", magic: { x: 0.22, y: 0.53 }, hand: { x: 0.22, y: 0.53 } },
  "goblin_forager_m": { staff: false, facing: "right", magic: { x: 0.80, y: 0.53 }, hand: { x: 0.80, y: 0.53 } },
  "goblin_frost_mage_f": { staff: true, facing: "right", magic: { x: 0.81, y: 0.10 }, hand: { x: 0.74, y: 0.36 } },
  "goblin_frost_mage_m": { staff: true, facing: "right", magic: { x: 0.18, y: 0.10 }, hand: { x: 0.25, y: 0.40 } },
  "goblin_herbalist_f": { staff: false, facing: "right", magic: { x: 0.66, y: 0.33 }, hand: { x: 0.66, y: 0.33 } },
  "goblin_herbalist_m": { staff: false, facing: "right", magic: { x: 0.67, y: 0.30 }, hand: { x: 0.67, y: 0.30 } },
  "goblin_jeweler_f": { staff: false, facing: "right", magic: { x: 0.69, y: 0.33 }, hand: { x: 0.69, y: 0.33 } },
  "goblin_jeweler_m": { staff: false, facing: "right", magic: { x: 0.55, y: 0.36 }, hand: { x: 0.55, y: 0.36 } },
  "goblin_leatherworker_f": { staff: false, facing: "right", magic: { x: 0.27, y: 0.36 }, hand: { x: 0.27, y: 0.36 } },
  "goblin_leatherworker_m": { staff: false, facing: "right", magic: { x: 0.72, y: 0.40 }, hand: { x: 0.72, y: 0.40 } },
  "goblin_miner_f": { staff: false, facing: "right", magic: { x: 0.73, y: 0.23 }, hand: { x: 0.53, y: 0.38 } },
  "goblin_miner_m": { staff: false, facing: "right", magic: { x: 0.72, y: 0.29 }, hand: { x: 0.54, y: 0.42 } },
  "goblin_paladin_f": { staff: false, facing: "right", magic: { x: 0.31, y: 0.51 }, hand: { x: 0.31, y: 0.51 } },
  "goblin_paladin_m": { staff: false, facing: "right", magic: { x: 0.26, y: 0.48 }, hand: { x: 0.26, y: 0.48 } },
  "goblin_ranger_f": { staff: false, facing: "right", magic: { x: 0.73, y: 0.44 }, hand: { x: 0.68, y: 0.45 } },
  "goblin_ranger_m": { staff: false, facing: "right", magic: { x: 0.77, y: 0.44 }, hand: { x: 0.71, y: 0.45 } },
  "goblin_rogue_f": { staff: false, facing: "right", magic: { x: 0.77, y: 0.51 }, hand: { x: 0.77, y: 0.51 } },
  "goblin_rogue_m": { staff: false, facing: "right", magic: { x: 0.87, y: 0.26 }, hand: { x: 0.79, y: 0.40 } },
  "goblin_rune_knight_f": { staff: false, facing: "right", magic: { x: 0.29, y: 0.48 }, hand: { x: 0.29, y: 0.48 } },
  "goblin_rune_knight_m": { staff: false, facing: "right", magic: { x: 0.86, y: 0.30 }, hand: { x: 0.32, y: 0.45 } },
  "goblin_runecrafter_f": { staff: false, facing: "right", magic: { x: 0.41, y: 0.37 }, hand: { x: 0.41, y: 0.37 } },
  "goblin_runecrafter_m": { staff: false, facing: "right", magic: { x: 0.43, y: 0.34 }, hand: { x: 0.43, y: 0.34 } },
  "goblin_shadow_mage_f": { staff: true, facing: "right", magic: { x: 0.82, y: 0.12 }, hand: { x: 0.75, y: 0.38 } },
  "goblin_shadow_mage_m": { staff: true, facing: "right", magic: { x: 0.79, y: 0.12 }, hand: { x: 0.72, y: 0.40 } },
  "goblin_shaman_f": { staff: true, facing: "right", magic: { x: 0.74, y: 0.11 }, hand: { x: 0.67, y: 0.42 } },
  "goblin_shaman_m": { staff: true, facing: "right", magic: { x: 0.22, y: 0.10 }, hand: { x: 0.30, y: 0.42 } },
  "goblin_slayer_f": { staff: false, facing: "right", magic: { x: 0.27, y: 0.45 }, hand: { x: 0.27, y: 0.45 } },
  "goblin_slayer_m": { staff: false, facing: "right", magic: { x: 0.27, y: 0.45 }, hand: { x: 0.27, y: 0.45 } },
  "goblin_spear_warden_f": { staff: false, facing: "right", magic: { x: 0.17, y: 0.07 }, hand: { x: 0.26, y: 0.40 } },
  "goblin_spear_warden_m": { staff: false, facing: "right", magic: { x: 0.16, y: 0.08 }, hand: { x: 0.25, y: 0.41 } },
  "goblin_thief_f": { staff: false, facing: "right", magic: { x: 0.25, y: 0.22 }, hand: { x: 0.25, y: 0.22 } },
  "goblin_thief_m": { staff: false, facing: "right", magic: { x: 0.33, y: 0.27 }, hand: { x: 0.33, y: 0.27 } },
  "goblin_warlock_f": { staff: true, facing: "right", magic: { x: 0.20, y: 0.11 }, hand: { x: 0.27, y: 0.40 } },
  "goblin_warlock_m": { staff: true, facing: "right", magic: { x: 0.22, y: 0.10 }, hand: { x: 0.29, y: 0.40 } },
  "goblin_warrior_f": { staff: false, facing: "right", magic: { x: 0.22, y: 0.45 }, hand: { x: 0.22, y: 0.45 } },
  "goblin_warrior_m": { staff: false, facing: "right", magic: { x: 0.23, y: 0.46 }, hand: { x: 0.23, y: 0.46 } },
  "goblin_weaponsmith_f": { staff: false, facing: "right", magic: { x: 0.80, y: 0.08 }, hand: { x: 0.63, y: 0.30 } },
  "goblin_weaponsmith_m": { staff: false, facing: "right", magic: { x: 0.84, y: 0.23 }, hand: { x: 0.46, y: 0.36 } },
  "goblin_woodcutter_f": { staff: false, facing: "right", magic: { x: 0.79, y: 0.29 }, hand: { x: 0.52, y: 0.42 } },
  "goblin_woodcutter_m": { staff: false, facing: "right", magic: { x: 0.80, y: 0.32 }, hand: { x: 0.51, y: 0.44 } },
  "human_berserker_f": { staff: false, facing: "right", magic: { x: 0.79, y: 0.40 }, hand: { x: 0.37, y: 0.45 } },
  "human_berserker_m": { staff: false, facing: "right", magic: { x: 0.20, y: 0.19 }, hand: { x: 0.39, y: 0.34 } },
  "human_blacksmith_f": { staff: false, facing: "right", magic: { x: 0.34, y: 0.49 }, hand: { x: 0.34, y: 0.49 } },
  "human_blacksmith_m": { staff: false, facing: "right", magic: { x: 0.30, y: 0.51 }, hand: { x: 0.30, y: 0.51 } },
  "human_builder_f": { staff: false, facing: "right", magic: { x: 0.38, y: 0.53 }, hand: { x: 0.38, y: 0.53 } },
  "human_builder_m": { staff: false, facing: "right", magic: { x: 0.33, y: 0.53 }, hand: { x: 0.33, y: 0.53 } },
  "human_cook_f": { staff: false, facing: "right", magic: { x: 0.30, y: 0.48 }, hand: { x: 0.30, y: 0.48 } },
  "human_cook_m": { staff: false, facing: "right", magic: { x: 0.29, y: 0.14 }, hand: { x: 0.32, y: 0.27 } },
  "human_death_knight_f": { staff: false, facing: "right", magic: { x: 0.09, y: 0.07 }, hand: { x: 0.36, y: 0.40 } },
  "human_death_knight_m": { staff: false, facing: "right", magic: { x: 0.08, y: 0.07 }, hand: { x: 0.39, y: 0.42 } },
  "human_duelist_f": { staff: false, facing: "right", magic: { x: 0.27, y: 0.48 }, hand: { x: 0.27, y: 0.48 } },
  "human_duelist_m": { staff: false, facing: "right", magic: { x: 0.27, y: 0.45 }, hand: { x: 0.27, y: 0.45 } },
  "human_enchanter_f": { staff: true, facing: "right", magic: { x: 0.68, y: 0.21 }, hand: { x: 0.64, y: 0.25 } }, // kleiner Zauberstab/Stichel, unsicher
  "human_enchanter_m": { staff: true, facing: "right", magic: { x: 0.50, y: 0.33 }, hand: { x: 0.43, y: 0.36 } }, // kleiner Zauberstab/Stichel, unsicher
  "human_farmer_f": { staff: false, facing: "right", magic: { x: 0.33, y: 0.51 }, hand: { x: 0.33, y: 0.51 } },
  "human_farmer_m": { staff: false, facing: "right", magic: { x: 0.35, y: 0.51 }, hand: { x: 0.35, y: 0.51 } },
  "human_fire_mage_f": { staff: true, facing: "right", magic: { x: 0.27, y: 0.12 }, hand: { x: 0.32, y: 0.40 } },
  "human_fire_mage_m": { staff: true, facing: "right", magic: { x: 0.25, y: 0.14 }, hand: { x: 0.31, y: 0.40 } },
  "human_fisher_f": { staff: false, facing: "right", magic: { x: 0.32, y: 0.45 }, hand: { x: 0.32, y: 0.45 } },
  "human_fisher_m": { staff: false, facing: "right", magic: { x: 0.32, y: 0.51 }, hand: { x: 0.32, y: 0.51 } },
  "human_forager_f": { staff: false, facing: "right", magic: { x: 0.31, y: 0.53 }, hand: { x: 0.31, y: 0.53 } },
  "human_forager_m": { staff: false, facing: "right", magic: { x: 0.33, y: 0.53 }, hand: { x: 0.33, y: 0.53 } },
  "human_frost_mage_f": { staff: true, facing: "right", magic: { x: 0.81, y: 0.11 }, hand: { x: 0.63, y: 0.29 } },
  "human_frost_mage_m": { staff: true, facing: "right", magic: { x: 0.18, y: 0.10 }, hand: { x: 0.47, y: 0.34 } },
  "human_herbalist_f": { staff: false, facing: "right", magic: { x: 0.70, y: 0.33 }, hand: { x: 0.70, y: 0.33 } },
  "human_herbalist_m": { staff: false, facing: "right", magic: { x: 0.70, y: 0.32 }, hand: { x: 0.70, y: 0.32 } },
  "human_jeweler_f": { staff: false, facing: "right", magic: { x: 0.47, y: 0.34 }, hand: { x: 0.47, y: 0.34 } },
  "human_jeweler_m": { staff: false, facing: "right", magic: { x: 0.48, y: 0.36 }, hand: { x: 0.48, y: 0.36 } },
  "human_leatherworker_f": { staff: false, facing: "right", magic: { x: 0.38, y: 0.51 }, hand: { x: 0.38, y: 0.51 } },
  "human_leatherworker_m": { staff: false, facing: "right", magic: { x: 0.33, y: 0.52 }, hand: { x: 0.33, y: 0.52 } },
  "human_miner_f": { staff: false, facing: "right", magic: { x: 0.77, y: 0.33 }, hand: { x: 0.55, y: 0.38 } },
  "human_miner_m": { staff: false, facing: "right", magic: { x: 0.78, y: 0.29 }, hand: { x: 0.58, y: 0.41 } },
  "human_paladin_f": { staff: false, facing: "right", magic: { x: 0.29, y: 0.48 }, hand: { x: 0.29, y: 0.48 } },
  "human_paladin_m": { staff: false, facing: "right", magic: { x: 0.26, y: 0.46 }, hand: { x: 0.26, y: 0.46 } },
  "human_ranger_f": { staff: false, facing: "right", magic: { x: 0.78, y: 0.40 }, hand: { x: 0.76, y: 0.40 } },
  "human_ranger_m": { staff: false, facing: "right", magic: { x: 0.78, y: 0.41 }, hand: { x: 0.76, y: 0.41 } },
  "human_rogue_f": { staff: false, facing: "right", magic: { x: 0.75, y: 0.48 }, hand: { x: 0.75, y: 0.48 } },
  "human_rogue_m": { staff: false, facing: "right", magic: { x: 0.72, y: 0.51 }, hand: { x: 0.72, y: 0.51 } },
  "human_rune_knight_f": { staff: false, facing: "right", magic: { x: 0.29, y: 0.48 }, hand: { x: 0.29, y: 0.48 } },
  "human_rune_knight_m": { staff: false, facing: "right", magic: { x: 0.26, y: 0.48 }, hand: { x: 0.26, y: 0.48 } },
  "human_runecrafter_f": { staff: false, facing: "right", magic: { x: 0.36, y: 0.51 }, hand: { x: 0.36, y: 0.51 } },
  "human_runecrafter_m": { staff: false, facing: "right", magic: { x: 0.33, y: 0.53 }, hand: { x: 0.33, y: 0.53 } },
  "human_shadow_mage_f": { staff: true, facing: "right", magic: { x: 0.86, y: 0.14 }, hand: { x: 0.66, y: 0.30 } },
  "human_shadow_mage_m": { staff: true, facing: "right", magic: { x: 0.87, y: 0.15 }, hand: { x: 0.65, y: 0.33 } },
  "human_shaman_f": { staff: true, facing: "right", magic: { x: 0.80, y: 0.11 }, hand: { x: 0.71, y: 0.38 } },
  "human_shaman_m": { staff: true, facing: "right", magic: { x: 0.26, y: 0.11 }, hand: { x: 0.39, y: 0.36 } },
  "human_slayer_f": { staff: false, facing: "right", magic: { x: 0.27, y: 0.45 }, hand: { x: 0.27, y: 0.45 } },
  "human_slayer_m": { staff: false, facing: "right", magic: { x: 0.27, y: 0.48 }, hand: { x: 0.27, y: 0.48 } },
  "human_spear_warden_f": { staff: false, facing: "right", magic: { x: 0.17, y: 0.07 }, hand: { x: 0.26, y: 0.41 } },
  "human_spear_warden_m": { staff: false, facing: "right", magic: { x: 0.18, y: 0.07 }, hand: { x: 0.27, y: 0.41 } },
  "human_thief_f": { staff: false, facing: "right", magic: { x: 0.69, y: 0.19 }, hand: { x: 0.69, y: 0.19 } },
  "human_thief_m": { staff: false, facing: "right", magic: { x: 0.30, y: 0.23 }, hand: { x: 0.30, y: 0.23 } },
  "human_warlock_f": { staff: true, facing: "right", magic: { x: 0.81, y: 0.10 }, hand: { x: 0.58, y: 0.30 } },
  "human_warlock_m": { staff: true, facing: "right", magic: { x: 0.82, y: 0.12 }, hand: { x: 0.65, y: 0.32 } },
  "human_warrior_f": { staff: false, facing: "right", magic: { x: 0.24, y: 0.45 }, hand: { x: 0.24, y: 0.45 } },
  "human_warrior_m": { staff: false, facing: "right", magic: { x: 0.27, y: 0.48 }, hand: { x: 0.27, y: 0.48 } },
  "human_weaponsmith_f": { staff: false, facing: "right", magic: { x: 0.83, y: 0.14 }, hand: { x: 0.67, y: 0.34 } },
  "human_weaponsmith_m": { staff: false, facing: "right", magic: { x: 0.86, y: 0.14 }, hand: { x: 0.68, y: 0.33 } },
  "human_woodcutter_f": { staff: false, facing: "right", magic: { x: 0.78, y: 0.33 }, hand: { x: 0.52, y: 0.42 } },
  "human_woodcutter_m": { staff: false, facing: "right", magic: { x: 0.80, y: 0.42 }, hand: { x: 0.47, y: 0.44 } },
  "knight_f": { staff: false, facing: "right", magic: { x: 0.28, y: 0.49 }, hand: { x: 0.28, y: 0.49 } },
  "knight_m": { staff: false, facing: "right", magic: { x: 0.29, y: 0.49 }, hand: { x: 0.29, y: 0.49 } },
  "mage_f": { staff: true, facing: "right", magic: { x: 0.24, y: 0.12 }, hand: { x: 0.27, y: 0.36 } },
  "mage_m": { staff: true, facing: "right", magic: { x: 0.21, y: 0.08 }, hand: { x: 0.26, y: 0.36 } },
  "npc_drazhan": { staff: false, facing: "right", magic: { x: 0.55, y: 0.60 }, hand: { x: 0.55, y: 0.60 } }, // NPC-Bueste, keine Hand sichtbar
  "npc_eske": { staff: false, facing: "right", magic: { x: 0.55, y: 0.60 }, hand: { x: 0.55, y: 0.60 } }, // NPC-Bueste, keine Hand sichtbar
  "npc_mux": { staff: false, facing: "right", magic: { x: 0.50, y: 0.65 }, hand: { x: 0.50, y: 0.65 } }, // NPC-Bueste, keine Hand sichtbar
  "npc_shairi": { staff: false, facing: "right", magic: { x: 0.50, y: 0.65 }, hand: { x: 0.50, y: 0.65 } }, // NPC-Bueste, keine Hand sichtbar
  // claude:2026-10-18T19:30:00+02:00 — 1.3.0-Lieferung: Porträt des Tilgers (NPC-Büste, kämpft als Porträt nie).
  "npc_the_expunger": { staff: false, facing: "right", magic: { x: 0.50, y: 0.65 }, hand: { x: 0.50, y: 0.65 } }, // NPC-Bueste, keine Hand sichtbar
  "npc_urga": { staff: false, facing: "right", magic: { x: 0.50, y: 0.65 }, hand: { x: 0.50, y: 0.65 } }, // NPC-Bueste, keine Hand sichtbar
  "npc_voss": { staff: false, facing: "right", magic: { x: 0.31, y: 0.76 }, hand: { x: 0.31, y: 0.76 } }, // NPC-Bueste
  // claude:2026-10-24T17:30:00+02:00 — 15 Kunden-Büsten der Aufträge (Codex-Lieferung 1.4.0, Gruppe P): Brust-Mitte als Platzhalter (kämpfen nie)
  "npc_brakka": { staff: false, facing: "right", magic: { x: 0.50, y: 0.65 }, hand: { x: 0.50, y: 0.65 } }, // NPC-Bueste (Kunde)
  "npc_caedren": { staff: false, facing: "right", magic: { x: 0.50, y: 0.65 }, hand: { x: 0.50, y: 0.65 } }, // NPC-Bueste (Kunde)
  "npc_dashk": { staff: false, facing: "right", magic: { x: 0.50, y: 0.65 }, hand: { x: 0.50, y: 0.65 } }, // NPC-Bueste (Kunde)
  "npc_grumm": { staff: false, facing: "right", magic: { x: 0.50, y: 0.65 }, hand: { x: 0.50, y: 0.65 } }, // NPC-Bueste (Kunde)
  "npc_ilvara": { staff: false, facing: "right", magic: { x: 0.50, y: 0.65 }, hand: { x: 0.50, y: 0.65 } }, // NPC-Bueste (Kunde)
  "npc_jorun": { staff: false, facing: "right", magic: { x: 0.50, y: 0.65 }, hand: { x: 0.50, y: 0.65 } }, // NPC-Bueste (Kunde)
  "npc_kell": { staff: false, facing: "right", magic: { x: 0.50, y: 0.65 }, hand: { x: 0.50, y: 0.65 } }, // NPC-Bueste (Kunde)
  "npc_merrit": { staff: false, facing: "right", magic: { x: 0.50, y: 0.65 }, hand: { x: 0.50, y: 0.65 } }, // NPC-Bueste (Kunde)
  "npc_nessa": { staff: false, facing: "right", magic: { x: 0.50, y: 0.65 }, hand: { x: 0.50, y: 0.65 } }, // NPC-Bueste (Kunde)
  "npc_odo": { staff: false, facing: "right", magic: { x: 0.50, y: 0.65 }, hand: { x: 0.50, y: 0.65 } }, // NPC-Bueste (Kunde)
  "npc_orin": { staff: false, facing: "right", magic: { x: 0.50, y: 0.65 }, hand: { x: 0.50, y: 0.65 } }, // NPC-Bueste (Kunde)
  "npc_sefra": { staff: false, facing: "right", magic: { x: 0.50, y: 0.65 }, hand: { x: 0.50, y: 0.65 } }, // NPC-Bueste (Kunde)
  "npc_tamsin": { staff: false, facing: "right", magic: { x: 0.50, y: 0.65 }, hand: { x: 0.50, y: 0.65 } }, // NPC-Bueste (Kunde)
  "npc_torvald": { staff: false, facing: "right", magic: { x: 0.50, y: 0.65 }, hand: { x: 0.50, y: 0.65 } }, // NPC-Bueste (Kunde)
  "npc_wenna": { staff: false, facing: "right", magic: { x: 0.50, y: 0.65 }, hand: { x: 0.50, y: 0.65 } }, // NPC-Bueste (Kunde)
  "npc_warden": { staff: false, facing: "right", magic: { x: 0.50, y: 0.65 }, hand: { x: 0.50, y: 0.65 } }, // NPC-Bueste, keine Hand sichtbar
  "orc_berserker_f": { staff: false, facing: "right", magic: { x: 0.18, y: 0.11 }, hand: { x: 0.33, y: 0.27 } },
  "orc_berserker_m": { staff: false, facing: "right", magic: { x: 0.79, y: 0.23 }, hand: { x: 0.55, y: 0.41 } },
  "orc_blacksmith_f": { staff: false, facing: "right", magic: { x: 0.32, y: 0.51 }, hand: { x: 0.32, y: 0.51 } },
  "orc_blacksmith_m": { staff: false, facing: "right", magic: { x: 0.33, y: 0.52 }, hand: { x: 0.33, y: 0.52 } },
  "orc_builder_f": { staff: false, facing: "right", magic: { x: 0.32, y: 0.53 }, hand: { x: 0.32, y: 0.53 } },
  "orc_builder_m": { staff: false, facing: "right", magic: { x: 0.30, y: 0.53 }, hand: { x: 0.30, y: 0.53 } },
  "orc_cook_f": { staff: false, facing: "right", magic: { x: 0.74, y: 0.22 }, hand: { x: 0.69, y: 0.37 } },
  "orc_cook_m": { staff: false, facing: "right", magic: { x: 0.75, y: 0.25 }, hand: { x: 0.66, y: 0.36 } },
  "orc_death_knight_f": { staff: false, facing: "right", magic: { x: 0.30, y: 0.41 }, hand: { x: 0.30, y: 0.41 } },
  "orc_death_knight_m": { staff: false, facing: "right", magic: { x: 0.89, y: 0.07 }, hand: { x: 0.54, y: 0.40 } },
  "orc_duelist_f": { staff: false, facing: "right", magic: { x: 0.84, y: 0.53 }, hand: { x: 0.30, y: 0.40 } },
  "orc_duelist_m": { staff: false, facing: "right", magic: { x: 0.29, y: 0.42 }, hand: { x: 0.29, y: 0.42 } },
  "orc_enchanter_f": { staff: true, facing: "right", magic: { x: 0.45, y: 0.34 }, hand: { x: 0.33, y: 0.37 } }, // kleiner Zauberstab/Stichel, unsicher
  "orc_enchanter_m": { staff: true, facing: "right", magic: { x: 0.48, y: 0.29 }, hand: { x: 0.35, y: 0.32 } }, // kleiner Zauberstab/Stichel, unsicher
  "orc_farmer_f": { staff: false, facing: "right", magic: { x: 0.30, y: 0.51 }, hand: { x: 0.30, y: 0.51 } },
  "orc_farmer_m": { staff: false, facing: "right", magic: { x: 0.31, y: 0.51 }, hand: { x: 0.31, y: 0.51 } },
  "orc_fire_mage_f": { staff: true, facing: "right", magic: { x: 0.17, y: 0.11 }, hand: { x: 0.24, y: 0.40 } },
  "orc_fire_mage_m": { staff: true, facing: "right", magic: { x: 0.20, y: 0.11 }, hand: { x: 0.27, y: 0.40 } },
  "orc_fisher_f": { staff: false, facing: "right", magic: { x: 0.74, y: 0.51 }, hand: { x: 0.74, y: 0.51 } },
  "orc_fisher_m": { staff: false, facing: "right", magic: { x: 0.80, y: 0.14 }, hand: { x: 0.75, y: 0.40 } },
  "orc_forager_f": { staff: false, facing: "right", magic: { x: 0.32, y: 0.51 }, hand: { x: 0.32, y: 0.51 } },
  "orc_forager_m": { staff: false, facing: "right", magic: { x: 0.31, y: 0.51 }, hand: { x: 0.31, y: 0.51 } },
  "orc_frost_mage_f": { staff: true, facing: "right", magic: { x: 0.19, y: 0.10 }, hand: { x: 0.26, y: 0.38 } },
  "orc_frost_mage_m": { staff: true, facing: "right", magic: { x: 0.20, y: 0.10 }, hand: { x: 0.27, y: 0.40 } },
  "orc_herbalist_f": { staff: false, facing: "right", magic: { x: 0.72, y: 0.36 }, hand: { x: 0.72, y: 0.36 } },
  "orc_herbalist_m": { staff: false, facing: "right", magic: { x: 0.41, y: 0.33 }, hand: { x: 0.41, y: 0.33 } },
  "orc_jeweler_f": { staff: false, facing: "right", magic: { x: 0.68, y: 0.34 }, hand: { x: 0.68, y: 0.34 } },
  "orc_jeweler_m": { staff: false, facing: "right", magic: { x: 0.47, y: 0.30 }, hand: { x: 0.47, y: 0.30 } },
  "orc_leatherworker_f": { staff: false, facing: "right", magic: { x: 0.73, y: 0.38 }, hand: { x: 0.73, y: 0.38 } },
  "orc_leatherworker_m": { staff: false, facing: "right", magic: { x: 0.38, y: 0.40 }, hand: { x: 0.38, y: 0.40 } },
  "orc_miner_f": { staff: false, facing: "right", magic: { x: 0.22, y: 0.19 }, hand: { x: 0.40, y: 0.40 } },
  "orc_miner_m": { staff: false, facing: "right", magic: { x: 0.80, y: 0.26 }, hand: { x: 0.59, y: 0.38 } },
  "orc_paladin_f": { staff: false, facing: "right", magic: { x: 0.27, y: 0.42 }, hand: { x: 0.27, y: 0.42 } },
  "orc_paladin_m": { staff: false, facing: "right", magic: { x: 0.27, y: 0.42 }, hand: { x: 0.27, y: 0.42 } },
  "orc_ranger_f": { staff: false, facing: "right", magic: { x: 0.79, y: 0.42 }, hand: { x: 0.75, y: 0.42 } },
  "orc_ranger_m": { staff: false, facing: "right", magic: { x: 0.80, y: 0.41 }, hand: { x: 0.76, y: 0.42 } },
  "orc_rogue_f": { staff: false, facing: "right", magic: { x: 0.72, y: 0.45 }, hand: { x: 0.72, y: 0.45 } },
  "orc_rogue_m": { staff: false, facing: "right", magic: { x: 0.75, y: 0.48 }, hand: { x: 0.75, y: 0.48 } },
  "orc_rune_knight_f": { staff: false, facing: "right", magic: { x: 0.85, y: 0.11 }, hand: { x: 0.45, y: 0.40 } },
  "orc_rune_knight_m": { staff: false, facing: "right", magic: { x: 0.89, y: 0.52 }, hand: { x: 0.42, y: 0.44 } },
  "orc_runecrafter_f": { staff: false, facing: "right", magic: { x: 0.50, y: 0.33 }, hand: { x: 0.50, y: 0.33 } },
  "orc_runecrafter_m": { staff: false, facing: "right", magic: { x: 0.50, y: 0.34 }, hand: { x: 0.50, y: 0.34 } },
  "orc_shadow_mage_f": { staff: true, facing: "right", magic: { x: 0.20, y: 0.11 }, hand: { x: 0.27, y: 0.36 } },
  "orc_shadow_mage_m": { staff: true, facing: "right", magic: { x: 0.19, y: 0.12 }, hand: { x: 0.24, y: 0.36 } },
  "orc_shaman_f": { staff: true, facing: "right", magic: { x: 0.23, y: 0.10 }, hand: { x: 0.32, y: 0.36 } },
  "orc_shaman_m": { staff: true, facing: "right", magic: { x: 0.22, y: 0.10 }, hand: { x: 0.31, y: 0.37 } },
  "orc_slayer_f": { staff: false, facing: "right", magic: { x: 0.26, y: 0.45 }, hand: { x: 0.26, y: 0.45 } },
  "orc_slayer_m": { staff: false, facing: "right", magic: { x: 0.27, y: 0.45 }, hand: { x: 0.27, y: 0.45 } },
  "orc_spear_warden_f": { staff: false, facing: "right", magic: { x: 0.18, y: 0.07 }, hand: { x: 0.25, y: 0.42 } },
  "orc_spear_warden_m": { staff: false, facing: "right", magic: { x: 0.17, y: 0.08 }, hand: { x: 0.24, y: 0.41 } },
  "orc_thief_f": { staff: false, facing: "right", magic: { x: 0.32, y: 0.36 }, hand: { x: 0.32, y: 0.36 } },
  "orc_thief_m": { staff: false, facing: "right", magic: { x: 0.33, y: 0.34 }, hand: { x: 0.33, y: 0.34 } },
  "orc_warlock_f": { staff: true, facing: "right", magic: { x: 0.19, y: 0.11 }, hand: { x: 0.26, y: 0.37 } },
  "orc_warlock_m": { staff: true, facing: "right", magic: { x: 0.20, y: 0.11 }, hand: { x: 0.27, y: 0.38 } },
  "orc_warrior_f": { staff: false, facing: "right", magic: { x: 0.22, y: 0.44 }, hand: { x: 0.22, y: 0.44 } },
  "orc_warrior_m": { staff: false, facing: "right", magic: { x: 0.22, y: 0.45 }, hand: { x: 0.22, y: 0.45 } },
  "orc_weaponsmith_f": { staff: false, facing: "right", magic: { x: 0.79, y: 0.10 }, hand: { x: 0.63, y: 0.30 } },
  "orc_weaponsmith_m": { staff: false, facing: "right", magic: { x: 0.83, y: 0.11 }, hand: { x: 0.67, y: 0.33 } },
  "orc_woodcutter_f": { staff: false, facing: "right", magic: { x: 0.77, y: 0.59 }, hand: { x: 0.48, y: 0.48 } },
  "orc_woodcutter_m": { staff: false, facing: "right", magic: { x: 0.79, y: 0.32 }, hand: { x: 0.49, y: 0.42 } },
  "slayermaster_brenna_ashwick": { staff: false, facing: "right", magic: { x: 0.50, y: 0.75 }, hand: { x: 0.50, y: 0.75 } }, // NPC-Bueste, keine Hand sichtbar
  "slayermaster_davorin_coldgrasp": { staff: false, facing: "right", magic: { x: 0.50, y: 0.75 }, hand: { x: 0.50, y: 0.75 } }, // NPC-Bueste, keine Hand sichtbar
  "slayermaster_seraphel_mournbane": { staff: false, facing: "right", magic: { x: 0.50, y: 0.75 }, hand: { x: 0.50, y: 0.75 } }, // NPC-Bueste, keine Hand sichtbar
  "slayermaster_varek_nameless": { staff: false, facing: "right", magic: { x: 0.50, y: 0.75 }, hand: { x: 0.50, y: 0.75 } }, // NPC-Bueste, keine Hand sichtbar
};

export function getPortraitAnchor(portraitId: string | null | undefined): PortraitAnchor {
  if (!portraitId) return DEFAULT_PORTRAIT_ANCHOR;
  return PORTRAIT_ANCHORS[portraitId] ?? DEFAULT_PORTRAIT_ANCHOR;
}

/** Gezeichnete Fläche eines `object-fit: contain`-Bildes innerhalb seiner Layout-Box. `posX`/`posY`
 *  sind die object-position-Anteile (0..1; Spieler-Portrait: `bottom center` = 0.5/1). */
export function containedImageRect(box: AnchorRect, naturalW: number, naturalH: number, posX = 0.5, posY = 1): AnchorRect {
  if (naturalW <= 0 || naturalH <= 0 || box.w <= 0 || box.h <= 0) return { ...box };
  const scale = Math.min(box.w / naturalW, box.h / naturalH);
  const w = naturalW * scale;
  const h = naturalH * scale;
  return { x: box.x + (box.w - w) * posX, y: box.y + (box.h - h) * posY, w, h };
}

/** Anker (Bildanteile) → Punkt in der gezeichneten Fläche; `mirrored` (CSS scaleX(-1) o. ä.) klappt x. */
export function anchorToStagePoint(anchor: AnchorPoint, drawn: AnchorRect, mirrored = false): AnchorPoint {
  const ax = mirrored ? 1 - anchor.x : anchor.x;
  return { x: drawn.x + drawn.w * ax, y: drawn.y + drawn.h * anchor.y };
}

/** `object-position` aus getComputedStyle ("50% 100%", "center bottom", …) → Anteile 0..1.
 *  Pixel-Angaben lassen sich ohne Box nicht auflösen → Rückfall auf bottom center. */
export function parseObjectPosition(value: string | null | undefined): { x: number; y: number } {
  const fallback = { x: 0.5, y: 1 };
  if (!value) return fallback;
  const kw: Record<string, number> = { left: 0, center: 0.5, right: 1, top: 0, bottom: 1 };
  const parts = value.trim().split(/\s+/);
  const one = (p: string | undefined, def: number): number => {
    if (!p) return def;
    if (p in kw) return kw[p]!;
    if (p.endsWith("%")) {
      const n = Number(p.slice(0, -1));
      return Number.isFinite(n) ? Math.min(1, Math.max(0, n / 100)) : def;
    }
    return def;
  };
  return { x: one(parts[0], fallback.x), y: one(parts[1], fallback.y) };
}
