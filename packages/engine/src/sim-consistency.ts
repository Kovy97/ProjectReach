/**
 * SIM-Agent-Toolkit — statische INKONSISTENZ-Checker über die ContentDB.
 *
 * Reine, deterministische Funktionen (kein GameState, kein RNG, kein I/O): sie lesen NUR den
 * Content-Katalog und liefern `Finding[]` (Kategorie "consistency"). Gedacht für Sweep-Agenten
 * und den Guard-Test (sim-consistency.test.ts), der die AKTUELL akzeptierten Ausnahmen pinnt.
 *
 * ── API ─────────────────────────────────────────────────────────────────────────────────────
 *   runConsistencyChecks(content, opts?)      → alle Checker gebündelt
 *   checkTierLadderMonotony(content, opts?)   → Tier-Leitern (Slot/Waffentyp/Skill): Kern-Score
 *                                               + value müssen mit dem Level-Requirement steigen
 *   checkDropRequirementGap(content, opts?)   → gedroppte Ausrüstung deutlich (default >15 Lvl)
 *                                               UNTER dem Monster-Level (mire_fang_dagger-Muster)
 *   checkNamingConsistency(content, opts?)    → Aktions-ID ↔ Output (fletch_X → X), EN/DE beide
 *                                               vorhanden, keine ASCII-Umlaute (ae/oe/ue) im DE
 *   checkReferenceCompleteness(content, opts?)→ Rezept-Inputs/Keys/Seeds erreichbar, Icon-Fallback
 *                                               (informativ), verwaiste Items ohne jeden Sink
 *
 * Ausnahmen (bewusste Chef-Entscheidungen) werden über `ConsistencyOptions` parametrisiert —
 * der Guard-Test dokumentiert und pinnt sie, damit bekannte Fälle nicht rot schlagen.
 */
import type {
  BoostableCombatSkillId,
  ContentDB,
  EquipBonus,
  ItemDef,
  ItemId,
  LocalizedString,
} from "@hearthforge/shared";
import {
  HUNT_BAIT_TIERS,
  BOOSTABLE_COMBAT_SKILL_IDS,
  PARAGON_DUNGEON_ID,
  effectiveWeaponEffects,
  resolveText, RELIC_DUST_ITEM_ID } from "@hearthforge/shared";
import type { Finding } from "./sim-report";

/**
 * Chase-Doktrin (itemization-parity-fix.md §5 + §3.1.8): sehr rare Drops (≤1/200) schlagen
 * bewusst über ihr Anforderungs-Tier. Diese Liste = ALLE §5.2-Rüstungs-/Schmuck-Chase-Zeilen +
 * ALLE §3.3-„+1 Tier"-Waffen-Uniques — die dokumentierte Ausnahmeklasse für Guards, die sonst
 * strikte Leiter-/Boost-Platzierungs-Regeln erzwingen (§4.1.4/§5.1c): (a) Monotonie-Leitern
 * überspringen sie (s. `ladderExceptions`), (b) der Boost-Platzierungs-Guard erlaubt ihnen Boosts
 * wie Signaturen (idol_-/slayer_-Präfix, rarity legendary/godly), (c) `thorns` ist NUR hier auf Rüstung erlaubt
 * (thornmail_gauntlets). content-dev pflegt diese Liste gemeinsam mit den Spec-Tabellen.
 */
export const CHASE_ITEMS: ItemId[] = [
  // §5.2 Rüstung/Schmuck (Nicht-Leiter-Equipment, Chase- + 0-Attribut-Fix-Zeilen)
  "wooden_shield",
  "leather_cape",
  "wattle_shield",
  "cowhide_cap",
  "cowhide_jerkin",
  "hide_leggings",
  "worn_workgloves",
  "muckboots",
  "field_cape",
  "boartusk_ring",
  "drovers_charm",
  "bulls_heart_pendant",
  "goblin_buckler",
  "bonepatch_helm",
  "warband_hauberk",
  "goblin_warkilt",
  "rivetfist_gloves",
  "scavenger_boots",
  "warbanner_cape",
  "cutpurse_ring",
  "felmagician_eye",
  "chitin_helm",
  "ashplate_cuirass",
  "sootscale_greaves",
  "ashen_gauntlets",
  "dustwalker_boots",
  "smokeweave_cape",
  "cinderloop_ring",
  "ash_tyrant_crown",
  "bark_bulwark",
  "mossweave_leggings",
  "thornmail_gauntlets",
  "wildwood_treads",
  "soulopal_band",
  "soulthorn_pendant",
  "warden_greatcloak",
  "cryptguard_helm",
  "gravesteel_cuirass",
  "tombplate_greaves",
  "boneknuckle_gauntlets",
  "gravetread_sabatons",
  "shroud_of_the_dead",
  "bonecharm_amulet",
  "gravewarden_greatshield",
  "necrosignet_ring",
  "reefscale_helm",
  "tidewoven_leggings",
  "barnacle_gauntlets",
  "tidewalker_boots",
  "mariner_cloak",
  "krakenhide_cuirass",
  "abyssal_signet",
  "crabshell_bulwark",
  "pearl_of_the_deep",
  "wolfpelt_hood",
  "stagleather_chaps",
  "clawguard_gloves",
  "padfoot_boots",
  "pelt_mantle",
  "fang_pendant",
  "direhide_jerkin",
  "bearhide_cuirass",
  "alphas_heart_ring",
  "stormhide_helm",
  "skygrip_gauntlets",
  "storm_mantle",
  "aetherscale_cuirass",
  "wyvernscale_greaves",
  "cloudwalker_boots",
  "stormcore_pendant",
  "aetherband_ring",
  "wyvernscale_aegis",
  "revenant_greatshield",
  "emberforge_helm",
  "frostplate_greaves",
  "moltengrip_gauntlets",
  "frostward_treads",
  "slagweave_cape",
  "emberheart_amulet",
  "slagcarapace_plate",
  "plaguebone_buckler",
  "marrow_cap",
  "basilisk_scale_shield",
  "shadestalker_hood",
  "slagheart_cuirass",
  "forgeplate_greaves",
  "voidstalker_cloak",
  "soulflayer_amulet",
  // §3.3 Waffen-Uniques mit "+1 Tier"-Chase-Spalte
  "pitchfork_spear",
  "sickle_shiv",
  "farmhand_sling",
  "hedgewitch_twig",
  "gorehorn_cleaver",
  "goblin_shank",
  "crude_waraxe",
  "stolen_shortbow",
  "goblin_cleaver",
  "warlock_felstaff",
  "dustblade",
  "cinder_spike",
  "ashwood_longbow",
  "mire_hexstaff",
  "ashfall_recurve",
  "rootling_club",
  "thornvine_whip",
  "spectral_hunter_bow",
  "witchroot_wand",
  "boneblade",
  "bonewrought_spear",
  "skeletal_longbow",
  "pyre_staff",
  "frostbone_scepter",
  "nekro_reaperblade",
  "coral_shiv",
  "driftwood_bow",
  "drowned_cutlass",
  "siren_shockstaff",
  "abyssal_tide_bow",
  "kraken_maw",
  "hunting_knife",
  "wolffang_spear",
  "antler_warbow",
  "stagstride_longbow",
  "direfang_maul",
  "talon_dagger",
  "skybreaker_greatsword",
  "skytalon_recurve",
  "stormcrest_staff",
  "slagforged_sword",
  "cinderfang_dagger",
  "frostcaverns_bow",
  "emberforge_hammer",
  "frosthex_wand",
  "rotfang_dagger",
  "mirrorglass_bow",
  "wailing_wand",
  "cinderwretch_maul",
  "dreadfang_glaive",
  "sorrow_staff",
  "abyssal_devourer_fang",
];

export interface ConsistencyOptions {
  /** Item-IDs, die von der Tier-Leiter-Monotonie ausgenommen sind (bewusste Seitgrades/Nischen). */
  ladderExceptions?: ItemId[];
  /** Akzeptierte Drop-Level-Gaps als "monsterId:itemId" (bewusst schwacher Flavor-Drop). */
  dropGapExceptions?: string[];
  /** Ab wie vielen Leveln Monster-über-Requirement ein Drop als „zu schwach" gilt. Default 15. */
  maxDropGapLevels?: number;
  /** Zusätzliche Whitelist-Wörter mit legitimen ae/oe/ue-Sequenzen (klein geschrieben). */
  umlautWhitelist?: string[];
  /** Item-IDs, die bewusst keine Verwendung haben (reine Verkaufs-/Flavor-Items). */
  orphanExceptions?: ItemId[];
}

function finding(
  severity: Finding["severity"],
  title: string,
  expected: string,
  actual: string,
  repro: string[],
  evidence?: Record<string, unknown>,
): Finding {
  return { severity, category: "consistency", title, expected, actual, repro, ...(evidence ? { evidence } : {}) };
}

/** Höchstes Skill-Level-Requirement eines Items (1, wenn keines gesetzt ist). */
function reqLevel(item: ItemDef): number {
  let max = 1;
  for (const v of Object.values(item.requirements ?? {})) {
    if (typeof v === "number" && v > max) max = v;
  }
  return max;
}

/** Skill mit dem höchsten Requirement (Leiter-Gruppierung), "none" ohne Requirements. */
function reqSkill(item: ItemDef): string {
  let best = "none";
  let bestLvl = -1;
  for (const [skill, v] of Object.entries(item.requirements ?? {})) {
    if (typeof v === "number" && v > bestLvl) {
      bestLvl = v;
      best = skill;
    }
  }
  return best;
}

/**
 * Attribut-Gegenwert je Skill-Boost-LEVEL (Itemization 2.0 §4.3/§5.1) — exakt die Raten, mit
 * denen die §5.3-Budget-Konversion den Boost VOR der Rundung aus dem Attribut-Budget abgezogen
 * hat. Der Score kreditiert sie hier zurück: ein Item, dessen Kraft laut §6-Tabellen teils in
 * einen Boost statt in `modifiers` gewandert ist, scort damit wieder budget-neutral wie sein
 * reines Attribut-Äquivalent (Gewichtung konsistent zu den modifiers: 1 Attributpunkt = 1 Score).
 * warding steht nicht in §4.3 (Flavor/Nische) → halber defence-Satz.
 * Exportiert: sim-realistic.ts (gearScore des RealisticPlayer) nutzt DIESELBEN Raten — konsistente
 * Gewichte zwischen neutraler Katalog-Prüfung und Honest-Player-Heuristik.
 * Armor-Iteration 2 §9.1: `magic`/`warding` sind die einzigen IDs — content-dev hat die deprecated
 * `magic_off`/`magic_def`-Übergangs-Zeilen in Phase C mit dem Union-Aufräumen entfernt.
 */
export const SKILL_BOOST_ATTR_EQUIV: Record<BoostableCombatSkillId, number> = {
  attack: 0.1, // +0.2 acc (Melee) ≈ 0.1 dex
  power: 0.27, // +0.08 mel-Roh ≈ 0.27 str
  defence: 0.33, // +0.1 def · +0.05 eva ≈ 0.33 con
  ranged: 0.15, // +0.1 rng-Roh · +0.2 acc ≈ 0.15 dex
  magic: 0.35, // +0.12 mag-Roh · +0.2 acc ≈ 0.35 int
  warding: 0.17, // stil-gegatete Mini-def, nicht in §4.3 → defence/2
};

/**
 * Neutraler Kern-Stat-Score eines Ausrüstungsteils: Stil-Schaden (max der drei, PLUS Waffen-2.0-
 * Range-Form-Mittel) + Verteidigung + anteilige Sekundärwerte + Attribut-modifiers + Skill-Boosts
 * (zum §4.3-Attribut-Gegenwert) + Waffeneffekt-Pseudo-DPS (burn/bleed/… tragen echte Kampfkraft —
 * ohne diesen Term wären Effekt-Waffen systematisch „zu schwach"). Genau die Zahlen, die ein
 * Spieler beim Tier-Vergleich überschlägt.
 */
export function coreStatScore(item: ItemDef): number {
  const b: EquipBonus = item.bonus ?? {};
  // itemization-parity-fix §1.1/§3: Waffen tragen ihre Spanne jetzt in damageMin/damageMax (Range-
  // Form) statt bonus.*Damage-Flats — das Spannen-MITTEL ist ihr Roh-Schadens-Score-Beitrag.
  // Alt-Content (falls je wieder vorhanden) fällt auf die Flats zurück (Legacy-Pfad, computeStats).
  const rangeMid =
    item.damageMin !== undefined && item.damageMax !== undefined ? (item.damageMin + item.damageMax) / 2 : 0;
  const dmg = Math.max(b.meleeDamage ?? 0, b.rangedDamage ?? 0, b.magicDamage ?? 0, rangeMid);
  // Stat-Squish ÷10: die GESQUISHTEN Inputs (dmg/def/maxHp/acc/eva sowie DoT-Magnituden) sind ×0.1
  // — ihre Gewichte hier ×10, damit der Score (und damit die gepinnte Ladder-Baseline) identisch
  // zur Vor-Squish-Wertung bleibt. UNgesquishte Inputs (crit/mana/lifesteal/Intervall/Attribut-
  // modifiers/frost-shock-Potency) behalten ihre Gewichte — sonst kippte die relative Gewichtung.
  // Waffen-2.0-Tempo (§1.4) ist jetzt ABSOLUT auf `item.attackIntervalMs` (statt bonus-Delta) —
  // schneller als die 3000ms-Basis erhöht den Score symmetrisch zum alten Delta-Term.
  const tempoTerm =
    item.attackIntervalMs !== undefined ? (3000 - item.attackIntervalMs) * 0.01 : -(b.attackIntervalMs ?? 0) * 0.01;
  let score =
    dmg * 30 +
    (b.defense ?? 0) * 15 +
    (b.maxHp ?? 0) * 5 +
    (b.accuracy ?? 0) * 2.5 +
    (b.evasion ?? 0) * 2.5 +
    (b.critChance ?? 0) * 100 +
    (b.critDamage ?? 0) * 20 +
    (b.maxMana ?? 0) * 0.2 + // Zauberreserve 28.08.2026: manaRegen-Term entfallen (in maxMana ×10 eingefaltet)
    (b.lifesteal ?? 0) * 100 +
    tempoTerm;
  if (item.modifiers) for (const v of Object.values(item.modifiers)) score += (v ?? 0) * 1;
  // Skill-Boosts (§4, OSRS-Stil): Level × Attribut-Gegenwert — sonst scoren Boost-Träger zu niedrig.
  if (item.skillBoost) {
    for (const id of BOOSTABLE_COMBAT_SKILL_IDS) {
      score += (item.skillBoost[id] ?? 0) * SKILL_BOOST_ATTR_EQUIV[id];
    }
  }
  // Waffeneffekte (burn/bleed/poison DoT; frost/shock Kontrolle): chance × magnitude × Dauer/s.
  for (const e of effectiveWeaponEffects(item)) {
    const potency =
      e.type === "frost" || e.type === "shock" ? 4 : e.magnitude * 10 * (e.durationMs / 1000);
    score += e.chance * potency * 1.5;
  }
  return Math.round(score * 100) / 100;
}

/** Familien-Suffix aus der Item-ID (letztes `_`-Token): trennt medhelm/fullhelm/jerkin/…-Linien. */
function idSuffix(id: string): string {
  const idx = id.lastIndexOf("_");
  return idx >= 0 ? id.slice(idx + 1) : id;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────
// 1) Tier-Leiter-Monotonie
// ─────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Gruppiert Ausrüstung in Familien (Slot + Waffentyp + Requirement-Skill + ID-Suffix) und prüft,
 * dass mit steigendem Level-Requirement Kern-Score UND `value` nicht FALLEN (gleiche Level =
 * Seitgrades, erlaubt). Das ID-Suffix trennt echte Material-Tier-Linien (bronze_medhelm →
 * iron_medhelm …) von thematischen Einzeldrops (Kreative-Item-Lizenz) und Sub-Linien
 * (medhelm ≠ fullhelm). Ausreißer = Finding; akzeptierte Ausnahmen via `opts.ladderExceptions`.
 */
export function checkTierLadderMonotony(content: ContentDB, opts: ConsistencyOptions = {}): Finding[] {
  const skip = new Set(opts.ladderExceptions ?? []);
  const families = new Map<string, ItemDef[]>();
  for (const item of Object.values(content.items)) {
    if (item.type !== "equipment" || !item.slot) continue;
    const key = `${item.slot}|${item.weaponType ?? "-"}|${reqSkill(item)}|${idSuffix(item.id)}`;
    (families.get(key) ?? families.set(key, []).get(key)!).push(item);
  }
  const out: Finding[] = [];
  for (const [key, items] of families) {
    if (items.length < 2) continue;
    const ladder = items
      .slice()
      .sort((a, b) => reqLevel(a) - reqLevel(b) || (a.value ?? 0) - (b.value ?? 0) || a.id.localeCompare(b.id));
    for (let i = 1; i < ladder.length; i++) {
      const prev = ladder[i - 1]!;
      const cur = ladder[i]!;
      if (reqLevel(cur) <= reqLevel(prev)) continue; // gleiche Stufe = Seitgrade, keine Leiter-Aussage
      if (skip.has(cur.id) || skip.has(prev.id)) continue;
      const prevScore = coreStatScore(prev);
      const curScore = coreStatScore(cur);
      const prevValue = prev.value ?? 0;
      const curValue = cur.value ?? 0;
      if (curScore < prevScore) {
        out.push(
          finding(
            "P2",
            `Tier-Leiter bricht: ${cur.id} (Lv${reqLevel(cur)}) schwächer als ${prev.id} (Lv${reqLevel(prev)})`,
            "Innerhalb einer Item-Familie steigen die Kern-Stats mit dem Level-Requirement",
            `Kern-Score fällt von ${prevScore} auf ${curScore} — das höhere Tier ist ein Downgrade`,
            [`Familie ${key} nach Requirement sortieren`, `${prev.id} und ${cur.id} vergleichen`],
            { family: key, prev: { id: prev.id, level: reqLevel(prev), score: prevScore }, cur: { id: cur.id, level: reqLevel(cur), score: curScore } },
          ),
        );
      } else if (curValue < prevValue) {
        out.push(
          finding(
            "P3",
            `Tier-Leiter value bricht: ${cur.id} (Lv${reqLevel(cur)}) billiger als ${prev.id} (Lv${reqLevel(prev)})`,
            "Innerhalb einer Item-Familie steigt der Gold-Wert mit dem Level-Requirement",
            `value fällt von ${prevValue} auf ${curValue} — das höhere Tier verkauft sich schlechter`,
            [`Familie ${key} nach Requirement sortieren`, `${prev.id} und ${cur.id} vergleichen`],
            { family: key, prev: { id: prev.id, value: prevValue }, cur: { id: cur.id, value: curValue } },
          ),
        );
      }
    }
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────
// 2) Requirement-vs-Drop-Level
// ─────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Findet Ausrüstungs-Drops, deren Level-Requirement DEUTLICH (default >15 Lvl) unter der
 * BEUTE-KLASSE des Monsters liegt — das mire_fang_dagger-Muster: ein Monster droppt neben seinem
 * standesgemäßen Gear ein enttäuschendes Frühgame-Stück.
 *
 * Normalisierung & Eingrenzung (sonst rauscht der Check strukturell):
 *  - Monster-Level und Requirement-Level leben auf VERSCHIEDENEN Skalen (Monster bis ~295,
 *    Requirements bis 99). Referenz ist deshalb die eigene Beute-Klasse des Monsters:
 *    `monsterTier` = höchstes Requirement über seine Ausrüstungs-Drops.
 *  - Nur UNIQUE-Drops werden geflaggt (bei ≥2 Quellen ist es generisches Shared-Loot).
 *  - Nur Items MIT Requirements (Schmuck/Capes sind by design requirement-frei → kein Gap-Urteil).
 * Ausnahmen via `opts.dropGapExceptions` ("monster:item").
 */
export function checkDropRequirementGap(content: ContentDB, opts: ConsistencyOptions = {}): Finding[] {
  const maxGap = opts.maxDropGapLevels ?? 15;
  const skip = new Set(opts.dropGapExceptions ?? []);
  // Drop-Quellen je Item zählen (Unique-Filter).
  const sources = new Map<ItemId, number>();
  for (const monster of Object.values(content.monsters)) {
    for (const roll of monster.loot) sources.set(roll.itemId, (sources.get(roll.itemId) ?? 0) + 1);
  }
  const out: Finding[] = [];
  for (const monster of Object.values(content.monsters)) {
    // Beute-Klasse des Monsters: höchstes Requirement über seine Equipment-Drops (mit Requirements).
    let monsterTier = 0;
    for (const roll of monster.loot) {
      const item = content.items[roll.itemId];
      if (!item || item.type !== "equipment" || !item.slot) continue;
      if (!item.requirements || Object.keys(item.requirements).length === 0) continue;
      monsterTier = Math.max(monsterTier, reqLevel(item));
    }
    if (monsterTier === 0) continue; // droppt kein gegatetes Gear → keine Referenz
    for (const roll of monster.loot) {
      const item = content.items[roll.itemId];
      if (!item || item.type !== "equipment" || !item.slot) continue;
      if ((sources.get(roll.itemId) ?? 0) !== 1) continue; // generisches Mehr-Quellen-Loot
      if (!item.requirements || Object.keys(item.requirements).length === 0) continue;
      const lvl = reqLevel(item);
      const gap = monsterTier - lvl;
      if (gap <= maxGap) continue;
      if (skip.has(`${monster.id}:${item.id}`)) continue;
      out.push(
        finding(
          "P3",
          `Drop-Level-Gap: ${monster.id} (Beute-Klasse Lv${monsterTier}) droppt ${item.id} (Req Lv${lvl})`,
          `Ein Unique-Drop liegt höchstens ${maxGap} Level unter der Beute-Klasse seines Monsters`,
          `Gap = ${gap} Level — der einzigartige Drop ist gegen die übrige Beute des Monsters wertloses Alt-Gear`,
          [`Loot-Tabelle von ${monster.id} prüfen`, `Requirement von ${item.id} vergleichen`],
          { monster: monster.id, monsterLevel: monster.level, monsterTier, item: item.id, requirementLevel: lvl, gap },
        ),
      );
    }
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────
// 3) Namens-Konventionen (Aktion↔Output, EN/DE, ASCII-Umlaute)
// ─────────────────────────────────────────────────────────────────────────────────────────────

/** Craft-Verben, deren Aktions-ID `<verb>_<itemId>` den Output benennen SOLL, wenn `<itemId>` existiert. */
const CRAFT_VERB = /^(fletch|smith|cook|smelt|craft|brew|mix|forge|string|carve|cut|grind|tan|weave|polish|enchant)_(.+)$/;

/** Legitime deutsche Diphthong-Kontexte: ae/oe/ue nach Vokal (Feuer, brauen, Boue …) sind ok. */
const ASCII_UMLAUT = /(?:^|[^aeiouäöüAEIOUÄÖÜ])(ae|oe|ue|Ae|Oe|Ue)/;

/**
 * Whitelist als PRÄFIXE (klein): Fantasy-Eigennamen wie „Aetherium/Aetheressenz" tragen ein
 * bewusstes ae (kein vertipptes ä) — Präfix-Matching deckt alle Komposita ab.
 */
const DEFAULT_UMLAUT_WHITELIST = [
  "aether", // Aetherium/Aetherit/Aetheressenz … (bewusster Material-Eigenname, EN wie DE)
  "aegis", // Schild-Eigenname
  "bisque", // Gericht (franz. Lehnwort)
  "aktuell",
  "manuell",
  "duell",
  "poet",
  "michael",
  "samuel",
  "manuel",
];

function deStringsOf(name: LocalizedString | undefined): string | null {
  if (!name) return null;
  if (typeof name === "string") return null; // einsprachig → separater Check
  return name.de ?? null;
}

/** Prüft einen DE-String auf ASCII-Umlaut-Verdacht (Wort-weise; Whitelist matcht als Präfix). */
function asciiUmlautSuspects(text: string, whitelist: readonly string[]): string[] {
  const bad: string[] = [];
  for (const word of text.split(/[^A-Za-zÄÖÜäöüß]+/)) {
    if (!word) continue;
    const lower = word.toLowerCase();
    if (whitelist.some((w) => lower.startsWith(w))) continue;
    if (ASCII_UMLAUT.test(word)) bad.push(word);
  }
  return bad;
}

/**
 * Namens-Konventionen:
 *  (a) Craft-Aktions-IDs `<verb>_<itemId>`: existiert das Item `<itemId>`, muss die Aktion es
 *      auch ausgeben (sonst führt der Name in die Irre).
 *  (b) EN/DE beide vorhanden (Objekt-Form mit leerem/fehlendem Eintrag = Finding; reine
 *      Fallback-Strings werden als EIN aggregiertes P3 gemeldet).
 *  (c) Keine ASCII-Umlaute (ae/oe/ue) in DE-Strings — Heuristik: nur NICHT-Diphthong-Kontexte
 *      zählen (nach Konsonant), plus Whitelist echter Wörter.
 */
export function checkNamingConsistency(content: ContentDB, opts: ConsistencyOptions = {}): Finding[] {
  const out: Finding[] = [];
  const whitelist = [...DEFAULT_UMLAUT_WHITELIST, ...(opts.umlautWhitelist ?? []).map((w) => w.toLowerCase())];

  // (a) Aktions-ID ↔ Output.
  for (const action of Object.values(content.actions)) {
    const m = CRAFT_VERB.exec(action.id);
    if (!m) continue;
    const impliedItem = m[2]!;
    if (!content.items[impliedItem]) continue; // ID benennt kein konkretes Item → keine Aussage
    if (action.loot.some((l) => l.itemId === impliedItem)) continue;
    // Verb benennt den INPUT (tan_wyvern_scale = die Schuppe gerben) → legitimes Muster, kein Finding.
    if (action.inputs?.some((i) => i.itemId === impliedItem)) continue;
    out.push(
      finding(
        "P3",
        `Aktions-ID verspricht anderen Output: ${action.id} erzeugt kein '${impliedItem}'`,
        "Eine Aktion '<verb>_<item>' gibt das benannte Item aus",
        `Loot: ${action.loot.map((l) => l.itemId).join(", ") || "—"}`,
        [`Aktion ${action.id} im Content ansehen`],
        { action: action.id, implied: impliedItem, loot: action.loot.map((l) => l.itemId) },
      ),
    );
  }

  // (b) + (c) über alle benannten Kataloge.
  const singleLanguage: string[] = [];
  const scan = (kind: string, id: string, name: LocalizedString | undefined): void => {
    if (name === undefined) return;
    if (typeof name === "string") {
      singleLanguage.push(`${kind}:${id}`);
      return;
    }
    if (!name.en || !name.de) {
      out.push(
        finding(
          "P2",
          `Fehlende Lokalisierung: ${kind} '${id}'`,
          "Namen liegen in EN und DE vor",
          `en='${name.en ?? ""}' de='${name.de ?? ""}'`,
          [`${kind} ${id} im Content ansehen`],
          { kind, id },
        ),
      );
    }
    const de = deStringsOf(name);
    if (de) {
      const suspects = asciiUmlautSuspects(de, whitelist);
      if (suspects.length > 0) {
        out.push(
          finding(
            "P3",
            `ASCII-Umlaut-Verdacht in DE: ${kind} '${id}' → ${suspects.join(", ")}`,
            "DE-Strings nutzen echte Umlaute (ä/ö/ü) statt ae/oe/ue",
            `de='${de}'`,
            [`${kind} ${id} im Content ansehen`],
            { kind, id, suspects },
          ),
        );
      }
    }
  };
  for (const s of Object.values(content.skills)) scan("skill", s.id, s.name);
  for (const i of Object.values(content.items)) scan("item", i.id, i.name);
  for (const a of Object.values(content.actions)) scan("action", a.id, a.name);
  for (const m of Object.values(content.monsters)) scan("monster", m.id, m.name);
  for (const z of content.zones) scan("zone", z.id, z.name);
  for (const c of content.categories) scan("category", c.id, c.name);
  if (singleLanguage.length > 0) {
    out.push(
      finding(
        "P3",
        `Einsprachige Namen (nur Fallback-String): ${singleLanguage.length} Einträge`,
        "Alle Namen liegen als {en, de} vor (EA-Store ist EN, In-Game aber zweisprachig)",
        `Beispiele: ${singleLanguage.slice(0, 10).join(", ")}${singleLanguage.length > 10 ? ", …" : ""}`,
        ["Content nach string-Namen ohne Locale-Objekt durchsuchen"],
        { count: singleLanguage.length, samples: singleLanguage.slice(0, 20) },
      ),
    );
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────
// 4) Referenz-Vollständigkeit (Quellen, Icon-Fallback, verwaiste Items)
// ─────────────────────────────────────────────────────────────────────────────────────────────

/** Items, die `createGame` einem frischen Charakter direkt gibt (Startquellen).
 *  #286: crude_arrow raus (keine Start-Munition mehr); Starter-Rüstungs-Sets rein (state.ts). */
const STARTER_ITEMS: ItemId[] = [
  "rusty_sword", "cracked_bow", "cracked_staff", "cooked_shrimp", "graywort_seed",
  // Starter-Rüstung je Stil (#286, starterKit-Pfad):
  "copper_platebody", "copper_platelegs", "copper_sabatons",
  "leather_body", "leather_helm",
  "apprentice_robe_body", "apprentice_robe_legs", "apprentice_slippers",
];

/** Alle Item-IDs, die IRGENDEINE Quelle im Content hat (Aktion/Monster/Shop/Dungeon/Quest/Crop/…). */
export function obtainableItemIds(content: ContentDB): Set<ItemId> {
  const out = new Set<ItemId>();
  for (const a of Object.values(content.actions)) for (const l of a.loot) out.add(l.itemId);
  for (const m of Object.values(content.monsters)) for (const l of m.loot) out.add(l.itemId);
  for (const e of content.shop) out.add(e.itemId);
  for (const d of content.dungeons) for (const l of d.loot) out.add(l.itemId);
  for (const q of content.quests) for (const r of q.rewards.items ?? []) out.add(r.id);
  for (const c of Object.values(content.crops ?? {})) out.add(c.yieldItem);
  for (const e of content.slayerShop ?? []) out.add(e.itemId);
  for (const id of STARTER_ITEMS) if (content.items[id]) out.add(id);
  // claude:2026-10-23T23:35:00+02:00 — Bergung (1.4.0 BG): Reliktstaub entsteht beim Zerlegen gedroppter Ausrüstung (engine/salvage.ts),
  // nicht über Loot/Shop. Eigener, benannter Erhältlichkeits-Pfad, sobald es zerlegbare Beute gibt.
  if (content.items[RELIC_DUST_ITEM_ID]) out.add(RELIC_DUST_ITEM_ID);
  return out;
}

/**
 * Referenz-Vollständigkeit:
 *  (a) Jeder Rezept-Input, Dungeon-Schlüssel, Crop-Seed, jede Slayer-Anforderung und jede
 *      Lager-Baukosten-Zeile (`campBuildings[].levels[].items`, Task #366) ist über irgendeine
 *      Quelle erreichbar (P1 — sonst ist ein Rezept/Gate/Bauauftrag tot). Encampment-balance.md
 *      §7 Guard 12 nennt diesen Checker ausdrücklich als Durchsetzungsstelle für „alle 45
 *      Stücklisten-IDs sind erreichbar".
 *  (b) Icon-Fallback: Items ohne `icon` als EIN aggregiertes, informatives P3 (Pixelart-Backlog).
 *  (c) Verwaiste Items: MATERIAL-Items mit Quelle, aber ohne jeden Sink (kein Rezept-Input, nicht
 *      ausrüst-/essbar, kein Key/Seed/Rune/Slayer-Item, keine Munition, keine Lager-Baukosten) —
 *      duskcap-Muster.
 */
export function checkReferenceCompleteness(content: ContentDB, opts: ConsistencyOptions = {}): Finding[] {
  const out: Finding[] = [];
  const obtainable = obtainableItemIds(content);

  // (a) Erreichbarkeit aller referenzierten Beschaffungs-Pflichten.
  const requireObtainable = (itemId: ItemId, where: string): void => {
    if (!content.items[itemId]) {
      out.push(
        finding(
          "P1",
          `Referenz auf unbekanntes Item: '${itemId}' (${where})`,
          "Jede Item-Referenz zeigt auf eine existierende ItemDef",
          `'${itemId}' existiert nicht in content.items`,
          [`${where} prüfen`],
          { itemId, where },
        ),
      );
      return;
    }
    if (!obtainable.has(itemId)) {
      out.push(
        finding(
          "P1",
          `Unerreichbares Item: '${itemId}' wird gebraucht (${where}), hat aber keine Quelle`,
          "Jedes benötigte Item ist über Aktion/Monster/Shop/Dungeon/Quest/Crop/Start erreichbar",
          "Keine Loot-Tabelle, kein Shop-Eintrag, keine Aktion gibt es aus",
          [`${where} prüfen`, "Quellen des Items suchen"],
          { itemId, where },
        ),
      );
    }
  };
  for (const a of Object.values(content.actions)) {
    for (const inp of a.inputs ?? []) requireObtainable(inp.itemId, `Rezept-Input von ${a.id}`);
  }
  // Dungeon-Schlüssel: seit Welle J (2026-07-13, quest-based unlock) sind `keyItem`s deprecated
  // und funktionslos — ihre ERREICHBARKEIT ist kein Gate mehr (Welle K darf Key-Drops streichen,
  // ohne hier P1 auszulösen). Einzige Ausnahme: der Paragonturm bleibt eigenes Einmal-Unlock-
  // System — SEIN Schlüssel muss erreichbar bleiben, sonst ist der Turm tot.
  for (const d of content.dungeons) {
    if (d.id === PARAGON_DUNGEON_ID && d.keyItem) requireObtainable(d.keyItem, `Paragonturm-Schlüssel (${d.id})`);
  }
  for (const c of Object.values(content.crops ?? {})) requireObtainable(c.seedItem, `Crop-Seed von ${c.id}`);
  for (const m of Object.values(content.monsters)) {
    if (m.slayerRequirement) requireObtainable(m.slayerRequirement, `Slayer-Anforderung von ${m.id}`);
  }
  // Lager-Baukosten (encampment-balance.md §7 Guard 12: „alle 45 Stücklisten-IDs sind erreichbar" —
  // dieser Checker ist die genannte Durchsetzungsstelle, war aber blind für campBuildings, bis
  // Task #366 das aufdeckte). Ein Baukosten-Item ohne jede Quelle wäre ein totes Gate — dieselbe
  // Schwere wie ein unerreichbarer Rezept-Input.
  for (const b of content.campBuildings ?? []) {
    b.levels.forEach((lvl, i) => {
      for (const c of lvl.items) requireObtainable(c.itemId, `Lager-Baukosten von ${b.id} Stufe ${i + 1}`);
    });
  }

  // (b) Icon-Fallback (informativ, aggregiert — Pixelart bindet über die ID, Emoji ist der Fallback).
  const noIcon = Object.values(content.items).filter((i) => !i.icon).map((i) => i.id);
  if (noIcon.length > 0) {
    out.push(
      finding(
        "P3",
        `Items ohne icon-Fallback: ${noIcon.length}`,
        "Jedes Item trägt ein Emoji-Icon als Fallback bis Pixelart da ist",
        `Beispiele: ${noIcon.slice(0, 12).join(", ")}${noIcon.length > 12 ? ", …" : ""}`,
        ["Items ohne icon-Feld auflisten"],
        { count: noIcon.length, samples: noIcon.slice(0, 25) },
      ),
    );
  }

  // (c) Verwaiste Materialien (Quelle ja, Verwendung nein) — duskcap-Muster.
  const skip = new Set(opts.orphanExceptions ?? []);
  const used = new Set<ItemId>();
  for (const a of Object.values(content.actions)) for (const inp of a.inputs ?? []) used.add(inp.itemId);
  // Deprecated Alt-Schlüssel zählen weiter als „verwendet" (kein Orphan-P2 für Übergangs-Drops,
  // bis Welle K die Key-Rows aus dem Content nimmt).
  for (const d of content.dungeons) if (d.keyItem) used.add(d.keyItem);
  for (const c of Object.values(content.crops ?? {})) used.add(c.seedItem);
  // Jagd-Köder (1.2.0 „Fasern und Fallen", engine/hunting.ts): die Köder-Stufen (HUNT_BAIT_TIERS) werden von KEINEM Rezept
  // verbraucht, sondern beim Stellen/Erneuern einer Falle — ein Konsum-Sink wie die Crop-Saat.
  // Zählt nur, solange der Jagd-Katalog existiert (ohne `huntingZones` ist die Jagd inert).
  if (Array.isArray(content.huntingZones) && content.huntingZones.length > 0) for (const t of HUNT_BAIT_TIERS) used.add(t.itemId);
  for (const m of Object.values(content.monsters)) if (m.slayerRequirement) used.add(m.slayerRequirement);
  // Lager-Baukosten zählen als Verwendung (Task #366): ein Item, das AUSSCHLIESSLICH als
  // New-Haven-Baumaterial dient, ist genauso wenig „verwaist" wie eines, das nur als Rezept-Input
  // dient — beide sind ein legitimer Konsum-Sink, kein reines Verkaufs-Item.
  for (const b of content.campBuildings ?? []) {
    for (const lvl of b.levels) for (const c of lvl.items) used.add(c.itemId);
  }
  // Quest-Objectives defensiv scannen (targets können Item-IDs sein, z.B. craft_items/collect).
  for (const q of content.quests) {
    for (const o of q.objectives as unknown as Array<Record<string, unknown>>) {
      const target = o["target"];
      if (typeof target === "string" && content.items[target]) used.add(target);
    }
  }
  for (const item of Object.values(content.items)) {
    if (item.type !== "material") continue; // Gear/Consumable/Tool/Bag SIND ihre eigene Verwendung
    if (!obtainable.has(item.id)) continue; // ohne Quelle greift Check (a)/anderes Muster
    if (used.has(item.id)) continue;
    if (item.rune) continue; // Runen werden am Verzauberungstisch verbraucht
    if (skip.has(item.id)) continue;
    out.push(
      finding(
        "P2",
        `Verwaistes Item: '${item.id}' hat Quellen, aber keinerlei Verwendung`,
        "Jedes Material ist Input eines Rezepts, Schlüssel, Saat, Munition o.ä. (mehr als nur Verkaufswert)",
        `'${resolveText(item.name, "en")}' lässt sich nur verkaufen — Spieler fragen sich, wofür es gut ist`,
        [`Quellen/Verwendungen von ${item.id} im Content suchen`],
        { itemId: item.id, value: item.value ?? 0 },
      ),
    );
  }
  return out;
}

/** Führt alle Konsistenz-Checker aus (Reihenfolge = Report-Reihenfolge). */
export function runConsistencyChecks(content: ContentDB, opts: ConsistencyOptions = {}): Finding[] {
  return [
    ...checkReferenceCompleteness(content, opts),
    ...checkTierLadderMonotony(content, opts),
    ...checkDropRequirementGap(content, opts),
    ...checkNamingConsistency(content, opts),
  ];
}
