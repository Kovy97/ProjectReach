/**
 * Steam-Achievement-Mapping (Chef-Entscheid 27.08.2026, design/achievements-1.2.0/steam-set.csv —
 * 67 Erfolge, eingefroren): interne Achievement-ID (content.achievements[].id) → Steam-„API Name"
 * (im Steamworks-Partner-Backend, App 4915450, exakt so anzulegen). Reihenfolge = Backend-
 * Anlage-Reihenfolge der CSV (frühe zuerst, versteckte am Ende).
 *
 * Eigener Modul OHNE electron-Import, damit der Wächter-Test (steamAchievements.test.ts) die Tabelle
 * gegen den Content prüfen kann: jede interne ID existiert, API-Namen eindeutig, ≤ 32 Zeichen,
 * und die Tabelle ist 1:1 die CSV (Spalten api_name/trigger_internal_id).
 *
 * NUR gemappte IDs werden an Steam gemeldet (steam.ts `steamApiName` → null für alles andere);
 * die ~245 In-Game-only-Erfolge bleiben still. Das 1:1-Namensfallback ist abgeschaltet (Audit § 4.1).
 */
export const STEAM_ACHIEVEMENTS: Readonly<Record<string, string>> = {
  "ach_chapter_01": "CH01_THE_FIRST_PAGE",
  "ach_kills_100": "BLOODED",
  "ach_chapter_02": "CH02_FIRST_BLOOD",
  "ach_gather_1000": "FIRST_HARVEST",
  "ach_gold_1000": "COIN_PURSE",
  "ach_chapter_03": "CH03_SPARK_IN_THE_GRAIN",
  "ach_craft_100": "ARTISAN",
  "ach_chapter_04": "CH04_THE_EMPTY_MARCH",
  "ach_elite_first": "CHAMPIONS_BANE",
  "ach_chapter_05": "CH05_THE_WAR_BANNER",
  "ach_dungeons_distinct_1": "FIRST_CLEAR",
  "ach_total_level_250": "MASTER_OF_TRADES",
  "ach_chapter_06": "CH06_THE_ASH_LESSON",
  "ach_pets_1": "FRIEND_IN_THE_ASH",
  "ach_chapter_07": "CH07_THE_CARRION_KING",
  "ach_chapter_08": "CH08_THORNS",
  "ach_chapter_09": "CH09_CHOIR_BENEATH_BARROWS",
  "ach_chapter_10": "CH10_THE_BROKEN_SEAL",
  "ach_chapter_11": "CH11_LORD_OF_THE_DEPTHS",
  "ach_gold_1000000": "MERCHANT_PRINCE",
  "ach_chapter_12": "CH12_THE_GIANTS",
  "ach_kills_10000": "ANNIHILATOR",
  "ach_chapter_13": "CH13_THE_OLD_HUNT",
  "ach_daily_streak_30": "OBSESSED",
  "ach_chapter_14": "CH14_WHAT_THE_SEA_GIVES",
  "ach_slayer_tasks_100": "CONTRACT_KILLER",
  "ach_chapter_15": "CH15_THE_COLD_FORGE",
  "ach_camp_levels_45": "NEW_HAVEN_RISES",
  "ach_chapter_16": "CH16_THE_THIN_SKY",
  "ach_dungeons_total_100": "DUNGEON_LEGEND",
  "ach_chapter_17": "CH17_THE_AERIE",
  "ach_chapter_18": "CH18_THE_LAST_GATE",
  "ach_chapter_19": "CH19_THE_JUDGEMENT",
  "ach_dungeons_distinct_all": "DELVER_OF_EVERY_DEPTH",
  "ach_chapter_20": "CH20_THE_TRUE_CULPRIT", // versteckt
  "ach_chapter_21": "CH21_THE_SECOND_VOLUME", // versteckt
  "ach_discovered_500": "ENCYCLOPEDIST",
  "ach_slayer_floor_5": "THE_ABYSSAL_THRONE",
  "ach_paragon_floor_20": "PEAK_CONTENDER",
  "ach_total_level_1000": "ASCENDANT",
  "ach_skill_woodcutting_99": "MASTER_WOODCUTTING",
  "ach_skill_mining_99": "MASTER_MINING",
  "ach_skill_fishing_99": "MASTER_FISHING",
  "ach_skill_foraging_99": "MASTER_FORAGING",
  "ach_skill_cooking_99": "MASTER_COOKING",
  "ach_skill_smithing_99": "MASTER_SMITHING",
  "ach_skill_leatherworking_99": "MASTER_LEATHERWORKING",
  "ach_skill_tailoring_99": "MASTER_TAILORING", // 1.2.0 Skill-Split (Chef 29.08.2026)
  "ach_skill_hunting_99": "MASTER_HUNTING", // 1.2.0 neuer Skill Jagen
  "ach_skill_farming_99": "MASTER_FARMING",
  "ach_skill_thieving_99": "MASTER_THIEVING",
  "ach_skill_jewelcrafting_99": "MASTER_JEWELCRAFTING",
  "ach_skill_runecrafting_99": "MASTER_RUNECRAFTING",
  "ach_skill_herblore_99": "MASTER_HERBLORE",
  "ach_skill_attack_99": "MASTER_ATTACK",
  "ach_skill_power_99": "MASTER_POWER",
  "ach_skill_defence_99": "MASTER_DEFENCE",
  "ach_skill_ranged_99": "MASTER_RANGED",
  "ach_skill_magic_99": "MASTER_MAGIC",
  "ach_skill_vitality_99": "MASTER_VITALITY",
  "ach_skill_warding_99": "MASTER_WARDING",
  "ach_skill_slayer_99": "MASTER_SLAYER",
  "ach_pets_all": "BEASTMASTER",
  "ach_bestiary_all": "THE_WHOLE_BESTIARY",
  "ach_elite_uniques_all": "TROPHY_HALL",
  "ach_total_level_1980": "TRUE_COMPLETIONIST",
  "ach_deaths_1": "ASH_TO_ASH", // versteckt
  "ach_elite_idol_warden": "THE_NINTH_WARDEN", // versteckt
  "ach_play_hours_100": "A_HUNDRED_HOURS", // versteckt
};

/** Steam-API-Name einer internen Achievement-ID — null, wenn der Erfolg nicht im Steam-Set liegt. */
export function steamApiName(internalId: string): string | null {
  return STEAM_ACHIEVEMENTS[internalId] ?? null;
}
