import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { content } from "@hearthforge/content";
import {
  autoEatUpgradeCost,
  buyAutoEatUpgrade,
  canEnterDungeon,
  combatLevel,
  combinedFloorDodge,
  computeStats,
  contestHitChance,
  dungeonKeyItemId,
  eligibleHealPotions,
  eliteCombatMonster,
  eliteScaledMonster,
  eliteVariantsForZone,
  enemyEffectiveAccuracy,
  enqueueDungeonRuns,
  enqueueDungeonRunsAtFront,
  enqueueFight,
  enqueueFightAtFront,
  equippedPet,
  getActiveTask,
  hasDropSeen,
  isDungeonUnlocked,
  isHealPotion,
  isItemDiscovered,
  isParagonBossFloor,
  isZoneUnlocked,
  itemCount,
  levelFromXp,
  monsterKills,
  paragonCombatMonster,
  paragonFloorPreview,
  paragonStatus,
  seenDropCount,
  selectFood,
  selectHealPotion,
  setAutoPotionThreshold,
  setAutoEatThreshold,
  setAutoRebuffTonics,
  setCombatStyle,
  setRangedStance,
  setMagicStance,
  slayerRequirementMet,
  startEliteCombat,
  startParagonFloor,
  stopCombat,
  unlockAutoRebuffTonics,
  unlockedTowerFloors,
  xpForLevel,
} from "@hearthforge/engine";
import type { ParagonFloorPreview, ParagonStatus } from "@hearthforge/engine";
import type { ActiveBuff, CombatEvent, CombatStyle, RangedStance, DerivedStats, DungeonDef, EliteVariantDef, LootRoll, MagicStance, GameState, ItemDef, LastKillSummary, LocalizedString, MonsterDef, PetAbilityKind, SlayerTowerFloor, StatusEffect, StatusType } from "@hearthforge/shared";
import { autoEatHealMult, effectiveAutoEatThreshold, effectiveWeaponEffects, isStatusEffectType, EQUIP_SLOT_LABELS, AUTO_EAT_MAX_TIER, AUTO_POTION_COOLDOWN_MS, AUTO_REBUFF_UNLOCK_COST, COMBAT_SKILL_IDS, CRAFT_TARGET_PRESETS, CRIT_CHANCE_CAP, DEFENSE_MITIGATION_K, DEFENSE_MITIGATION_MAX, ELITE_UNIQUE_DROP_CHANCE_DEFAULT, combatXpLevelMult, consumableHeal, KILL_COOLDOWN_MS, PARAGON_BOSS_INTERVAL, PARAGON_DUNGEON_ID, PRE_BOSS_BREATHER_MS } from "@hearthforge/shared";
import { getEliteMonsterSrc, getMonsterSrc } from "../monsters";
import { AreaTourGuide } from "../components/AreaTourGuide";
import { ActiveBuffsBar } from "../components/ActiveBuffs";
import { DefenseTypeBadge } from "../components/DefenseTypeBadge";
import { openItemWikiModal } from "../components/ItemWikiModal";
import { QuantityPicker } from "../components/QuantityPicker";
import { openQueueAmountModal } from "../components/QueueAmountModal";
import { getPetSrc } from "../pets";
import {
  bloodVariantFor,
  fxAllUrls,
  fxCritVariant,
  fxSprite,
  fxVariants,
  magicThemeFor,
  petFxImageFor,
  petFxTargetSide,
  slashFamilyFor,
  type BloodVariant,
  type PetFxImage,
  type SlashFamily,
} from "../combatFx";
import { hasRecipe as hasParticleRecipe, ParticleStage, type Rect } from "../fxParticles";
// Seiteneffekt-Import (Chef-Entscheid 28.08.2026 "alle implementieren, für alle Waffen"): hängt
// beim Modul-Laden ALLE Partikel-Rezepte (Feuer/Blitz/Frost/Gift/Arkan/Leere/Aether, Nahkampf,
// Pfeil, Trefferreaktionen, Begleiter, Status-Körpereffekte) in die Registry ein — nichts davon
// wird hier direkt aufgerufen, nur importiert, damit `registerRecipe` läuft.
import "../fxParticleLibrary";
import { getPortrait } from "../portraits";
import { anchorToStagePoint, containedImageRect, getPortraitAnchor, parseObjectPosition } from "../portraitAnchors";
import { COMBAT_TOUR_STEPS } from "../areaTourSteps";
import { getSkillIcon } from "../skillIcons";
import { getSidebarIcon } from "../sidebarIcons";
import { getUiIcon } from "../uiIcons";
import { getBattleScreen, getBattleScreenCard } from "../battleScreens";
import { getZoneBackground, getZoneBackgroundCard } from "../zoneBackgrounds";
import { getDungeonBackground, getDungeonBackgroundCard } from "../dungeonBackgrounds";
import { getItemImage } from "../items";
import { getZoneMap } from "../zoneMaps";
import { consumeMonsterJumpTarget, getMonsterJumpNav, subscribeMonsterJump } from "../util/monsterJump";
import { useItemTooltip } from "../components/ItemTooltip";
import { CitadelTip, HoverTip, useCitadelTip } from "../components/CitadelTip";
import { CombatStatsPanelGrouped, EquipmentDoll } from "../components/EquipmentOverview";
import { ItemCell } from "../components/ItemCell";
import { skillBoostFor, SkillLevelText } from "../components/SkillLevel";
import { StatLine } from "../components/StatLine";
import { tupleEquals, useGameSelector, useGameState, useGetGameState } from "../game/GameContext";
import { useI18n } from "../i18n";
import { inflictHintFor } from "../util/inflictHint";
import { abilityText } from "../util/petText";
import { playCombatSfx, playSfx } from "../util/audio";
import {
  getCombatFxLevel,
  type CombatFxLevel,
  getCombatDockCollapsed,
  setCombatDockCollapsed,
  getCombatRecordCollapsed,
  setCombatRecordCollapsed,
} from "../util/uiPrefs";
// Task #333 (Chef-Feature "Kampf-Screen-Ergonomie"): Loadout-/Log-Panel-Maße + Log-Anzeigefilter —
// s. util/uiPrefs.ts für die volle JSDoc-Begründung (reine Anzeige-Vorlieben, kein Save-State).
import {
  getCombatLoadoutWidth,
  setCombatLoadoutWidth,
  COMBAT_LOADOUT_WIDTH_DEFAULT,
  COMBAT_LOADOUT_WIDTH_MIN,
  COMBAT_LOADOUT_WIDTH_MAX,
  getCombatLogWidth,
  setCombatLogWidth,
  COMBAT_LOG_WIDTH_DEFAULT,
  COMBAT_LOG_WIDTH_MIN,
  COMBAT_LOG_WIDTH_MAX,
  getCombatLogHeight,
  setCombatLogHeight,
  COMBAT_LOG_HEIGHT_MIN,
  COMBAT_LOG_HEIGHT_MAX_VH_FACTOR,
  getCombatLogFilters,
  setCombatLogFilters,
  COMBAT_LOG_CATEGORIES,
  type CombatLogCategory,
} from "../util/uiPrefs";
import { createZoneParticleField, getZoneParticleTheme } from "../util/particles";
import { renderEffectIcon, statIcon } from "../statIcons";
import { formatDamage, formatDropPct, formatMmSs, formatNum, formatSeconds1, formatStat } from "../util/format";
import { hasFreshTracks } from "../util/eliteBoard";
// UI-Brainstorm A8: dasselbe Sucheingabe-Idiom wie SkillPage/Bank/Shop — direkt importiert statt
// über styles/index.css (Kollisions-Schutz-Muster, s. dortiger Kommentar), da parallele Agenten an
// index.css arbeiten können.
import "../styles/inv-filter.css";
// Task #330 (Chef-GO Prototyp 2,5D-Kampfarena "The Pastures") — EINZIGER externer Berührungspunkt
// des komplett isolierten arena25d-Prototyps (s. components/arena25d/README.md). Dev-only + hinter
// zwei Flags (s. isArena25dActive): in Produktions-Builds ist `ARENA25D_SUPPORTED` (in flag.ts)
// statisch `false`, Vite faltet damit auch diesen Import + jeden `arena25dActive`-Zweig unten zu
// totem Code zusammen. Entfernen des Prototyps: Ordner `components/arena25d/` löschen + diese
// Import-Zeile + den einen "ARENA25D MOUNT SWITCH"-Block weiter unten zurückbauen.
import { Arena25DStage, isArena25dActive } from "../components/arena25d";

type TFn = (key: string) => string;

/** Schloss-Icon der gesperrten Dungeon-Karte (Dungeon-Karten v2, §5.6.5) — Emoji-Fallback falls das PNG fehlt. */
const LOCK_ICON_URL = getUiIcon("icon_locked");
// Welle QQ (2026-07-17): echte Icons statt Emoji-Platzhalter (Turm-/Truhen-/Heil-/Regen-Anzeigen).
const TOWER_ICON_URL = getUiIcon("icon_tower");
const KEY_ICON_URL = getUiIcon("icon_key");
const PAW_ICON_URL = getUiIcon("icon_paw");
const POTION_ICON_URL = getUiIcon("icon_potion");
const FOOD_ICON_URL = getUiIcon("icon_food");
// Mira-Set 2026-08-03 (Gap-Sweep Priorität A) — geschlossenes Combat-Status-Micro-Icon-Set, löst
// den Regen ♻-Vorgänger (thematisch passenderes, zur Reihe kohärentes Icon) sowie die bisher
// direkten Heil-/Kill-/Boss-/Immun-Unicode-Glyphen unten ab.
const REGEN_ICON_URL = getUiIcon("icon_combat_status_regen");
const XP_ICON_URL = getUiIcon("icon_xp");
const HEAL_BLOOD_ICON_URL = getUiIcon("icon_combat_status_heal_blood");
const HEAL_DEATH_ICON_URL = getUiIcon("icon_combat_status_heal_death");
const HEAL_SPELL_ICON_URL = getUiIcon("icon_combat_status_heal_spell");
const KILL_ICON_URL = getUiIcon("icon_combat_status_kill");
const BOSS_ICON_URL = getUiIcon("icon_combat_status_boss");
const IMMUNE_ICON_URL = getUiIcon("icon_combat_status_immune");
// Chef-Auftrag 2026-07-23 ("echte Icons statt Emojis"): passive Heil-/Schild-„Effekt"-Quelle
// (Combat-Regen aus Draughts/Tonika/Gear, s. combat.ts tickCombatRegen) zeigt das echte Vitality-
// Skill-Icon statt des ✨-Platzhalters — Vitality ist der thematisch passende Skill (max. HP/Regen).
const VITALITY_ICON_URL = getSkillIcon("vitality");

// Module-level: persists across MonsterSelect remounts so that after a fight
// ends the player lands back in the zone they were fighting in, not the zone grid.
let lastZoneId: string | null = null;

/**
 * Chef-Auftrag 2026-07-23 ("Querformat-Kulissen Turm-Etage 2-5"): fast alle Battlescreens sind
 * Hochformat (1122×1402), aber die 4 neuen Turm-Etagen (`slayer_tower_2..5`) sind QUERFORMAT
 * (1536×1024) — `background-size:cover` + der Ken-Burns-Drift zoomen bei denen in einen
 * gezoomten Mittelstreifen hinein und zerstören die eigentliche Komposition (Spiegelhallen-
 * Symmetrie/zentraler Thron fällt aus dem sichtbaren Ausschnitt). Erkennung läuft über die
 * ECHTEN Bildmaße (`naturalWidth`/`naturalHeight` einer `Image()`-Probe), NICHT über den
 * Dateinamen — greift also automatisch, sobald weitere Kulissen als Querformat nachgeliefert
 * werden, ohne Code-Änderung. `backdropAspectCache` hält das Ergebnis je URL fest (kein erneutes
 * Decodieren bei jedem Zonenwechsel zurück zu einer bereits gesehenen Kulisse).
 */
const backdropAspectCache = new Map<string, "landscape" | "portrait">();
/** Seitenverhältnis-Schwelle für "eindeutig Querformat" (Rundungsrauschen bei ~1:1 ignorieren). */
const BACKDROP_LANDSCAPE_MIN_RATIO = 1.05;
/**
 * Übergangs-Fallback (Chef-Vorgabe: NUR fürs allererste Frame, bevor die Bildmaß-Probe geladen
 * hat — verhindert einen 1-Frame-Flash auf den falschen Zuschnitt bei den 4 bereits bekannten
 * Querformat-Kulissen). Die Probe selbst bleibt die alleinige Quelle der Wahrheit; sobald die
 * restlichen 20 Kulissen als Querformat nachgeliefert werden, greift die Erkennung für sie auch
 * OHNE einen Eintrag hier.
 */
const BACKDROP_LANDSCAPE_HINT_IDS: ReadonlySet<string> = new Set([
  "slayer_tower_2",
  "slayer_tower_3",
  "slayer_tower_4",
  "slayer_tower_5",
]);

/** Misst das Seitenverhältnis einer Kampf-Kulisse (Querformat vs. Hochformat) — s. Kommentar oben. */
function useBackdropAspect(url: string | null, hintId: string | null): "landscape" | "portrait" {
  const [aspect, setAspect] = useState<"landscape" | "portrait">(() => {
    if (url && backdropAspectCache.has(url)) return backdropAspectCache.get(url)!;
    return hintId && BACKDROP_LANDSCAPE_HINT_IDS.has(hintId) ? "landscape" : "portrait";
  });
  useEffect(() => {
    if (!url) return;
    const cached = backdropAspectCache.get(url);
    if (cached) {
      setAspect(cached);
      return;
    }
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled || !img.naturalHeight) return;
      const result: "landscape" | "portrait" =
        img.naturalWidth / img.naturalHeight >= BACKDROP_LANDSCAPE_MIN_RATIO ? "landscape" : "portrait";
      backdropAspectCache.set(url, result);
      setAspect(result);
    };
    img.src = url;
    return () => {
      cancelled = true;
    };
  }, [url]);
  return aspect;
}

/**
 * Zonen-Fortschritt (Chef-GO "Zonen-Fortschritt auf den Zonen-Karten"): pro Zone die Monster-IDs
 * (Bezwungen-Zähler) + die deduplizierten Loot-Item-IDs aller Zonen-Monster (Drop-Entdeckung).
 * Einmal beim Modul-Laden aus `content` gebaut (Katalog ändert sich nie zur Laufzeit) — dieselbe
 * "__other"-Fallback-Regel wie `byZone` in MonsterSelect (Monster ohne bekannte Zone landen dort).
 * Der Live-Teil in `MonsterSelect` iteriert NUR über diese pro-Zone-Listen (klein), nicht über den
 * gesamten Katalog — s. `zoneProgress`-useMemo unten.
 */
interface ZoneProgressIndexEntry {
  monsterIds: string[];
  itemIds: string[];
}
const ZONE_PROGRESS_INDEX: Record<string, ZoneProgressIndexEntry> = (() => {
  const idx: Record<string, ZoneProgressIndexEntry> = {};
  for (const m of Object.values(content.monsters)) {
    // Dungeon-Rework-Spec §5.4/§5.6: dg_<x>-Varianten teilen die Zone ihrer Basis, ihr Kill-Credit
    // läuft aber auf die Basis-Id (killCreditMonsterId, combat.ts) — state.monsterKills["dg_..."]
    // bleibt IMMER 0, ohne Filter würde die Zone dadurch nie "komplett" zeigen (totalMonsters
    // inflated, ein Eintrag ewig unbezwungen). Skip hier deckt Zonen-Karten UND MonsterSelect.
    if (m.id.startsWith("dg_")) continue;
    const zoneKey = m.zone && content.zones.some((z) => z.id === m.zone) ? m.zone : "__other";
    const entry = (idx[zoneKey] ??= { monsterIds: [], itemIds: [] });
    entry.monsterIds.push(m.id);
    for (const roll of m.loot) {
      if (!entry.itemIds.includes(roll.itemId)) entry.itemIds.push(roll.itemId);
    }
  }
  return idx;
})();

interface ZoneProgress {
  killed: number;
  totalMonsters: number;
  dropPct: number;
  complete: boolean;
}

/**
 * Returns the level of the skill that would receive offense XP for the player's
 * current weapon style + melee focus choice. Mirrors combat.ts `activeOffenseSkill`
 * (that function is private to the engine; we re-derive here for display only).
 */
function playerOffenseSkillLevel(state: GameState): number {
  const stats = computeStats(state, content);
  const skillId =
    stats.style === "ranged" ? "ranged" :
    stats.style === "magic" ? "magic" :
    state.character.combatStyle === "power" ? "power" :
    state.character.combatStyle === "defensive" ? "defence" :
    "attack";
  return levelFromXp(state.skills[skillId]?.xp ?? 0);
}

/** Verdict-Bucket der groben Kampf-Prognose (Task #305): "strong" ≥1.5×, "even" 0.7–1.5×, sonst "risky". */
type CombatVerdict = "strong" | "even" | "risky";

/**
 * Vierstufiger Namensfarb-Tier (Chef-Spec 2026-07-23): das STRONG/EVEN/RISKY-Badge und der
 * Karten-Rahmen bleiben bewusst DREI-stufig (`CombatVerdict`/`verdictFrameTier`, unverändert) —
 * NUR die Farbe des Monster-Namens bekommt eine vierte Stufe, weil der Chef „Vorsicht" (Orange)
 * und „Selbstmord" (Rot) optisch trennen wollte. Werte entsprechen exakt den `diffname-*`-CSS-
 * Klassen in combat.css.
 */
type CombatNameTier = "easy" | "close" | "caution" | "danger";

/**
 * Chef-Spec 2026-07-23: Schwelle, die die alte "risky"-Sammelstufe (ratio < 0.7) für die
 * Namensfarbe in Orange ("Vorsicht", noch tragbar) und Rot ("Selbstmord", klar drüber) splittet.
 * Bewusst KEINE frei erfundene Zahl: die 0.7-Grenze zwischen "even" und "risky" trennt bereits
 * "spürbar überlegen" von "im Nachteil" — hier spiegeln wir dieselbe Distanz noch einmal nach
 * unten (die Hälfte von 0.7), symmetrisch zur Verdopplung, die schon zwischen "even" (0.7) und
 * "strong" (1.5) liegt. Unter dieser Ratio stirbt der Spieler rechnerisch, bevor er nicht mal die
 * Hälfte des nötigen Kill-Fortschritts erreicht hätte — das ist die "Selbstmord"-Schwelle.
 */
const RISKY_DANGER_RATIO = 0.35;

/** Kampf-Prognose (Task #305, CEO-freigegebene Spec): Trefferchancen beider Seiten + grober
 *  Zeit-bis-Sieg-Vergleich. Nutzt AUSSCHLIESSLICH die exportierten Engine-Formeln
 *  (contestHitChance/enemyEffectiveAccuracy/combinedFloorDodge, s. combat.ts) — keine Renderer-
 *  seitige Formel-Kopie. Bewusst KEINE Simulation, nur eine grobe DPS-Prognose auf Basis der
 *  mittleren Schadensspanne. `enemyDPS <= 0` (z.B. `monster.damage === 0`) ⇒ "strong" (Division
 *  durch 0 abgefangen, s. Spec). `nameTier` ist die zusätzliche vierstufige Aufteilung NUR für
 *  die Namensfarbe (Chef-Spec 2026-07-23, s. `RISKY_DANGER_RATIO`) — `verdict` bleibt die alleinige
 *  Quelle für Badge + Karten-Rahmen.
 */
function combatPrognosis(stats: DerivedStats, monster: MonsterDef): { playerHit: number; enemyHit: number; verdict: CombatVerdict; nameTier: CombatNameTier } {
  const playerHit = contestHitChance(stats.accuracy, monster.evasion * (1 - stats.precision));
  const enemyContest = contestHitChance(enemyEffectiveAccuracy(monster), stats.evasion);
  const enemyHit = enemyContest * (1 - combinedFloorDodge(stats.dodgeChance, enemyContest));

  const playerDPS = ((stats.attackDamageMin + stats.attackDamageMax) / 2) * playerHit / (stats.attackIntervalMs / 1000);
  const mitigation = Math.min(DEFENSE_MITIGATION_MAX, stats.defense / (stats.defense + DEFENSE_MITIGATION_K));
  const enemyDPS = monster.damage * (1 - mitigation) * enemyHit / (monster.attackIntervalMs / 1000);

  let verdict: CombatVerdict;
  let nameTier: CombatNameTier;
  if (enemyDPS <= 0) {
    verdict = "strong";
    nameTier = "easy";
  } else {
    const ratio = (stats.maxHp / enemyDPS) / (monster.maxHp / playerDPS);
    verdict = ratio >= 1.5 ? "strong" : ratio >= 0.7 ? "even" : "risky";
    nameTier = ratio >= 1.5 ? "easy" : ratio >= 0.7 ? "close" : ratio >= RISKY_DANGER_RATIO ? "caution" : "danger";
  }

  return { playerHit, enemyHit, verdict, nameTier };
}

/** Vollständige Anzeige-Reihenfolge der Namensfarbe: "zero" (kein XP, s. `xpIsZero`) reiht sich VOR
 *  die vier `CombatNameTier`-Stufen ein — zusammen exakt die 5 `diffname-*`-Farben aus combat.css. */
type DiffNameDisplayTier = "zero" | CombatNameTier;
const DIFF_NAME_TIERS: readonly DiffNameDisplayTier[] = ["zero", "easy", "close", "caution", "danger"];

/** i18n-Key je Stufe: eine Zeile „Farbe — Bedeutung" (Chef-Spec 2026-07-23 Namensfarb-Legende). */
const DIFF_LEGEND_KEY: Record<DiffNameDisplayTier, string> = {
  zero: "combat.diffLegend.zero",
  easy: "combat.diffLegend.easy",
  close: "combat.diffLegend.close",
  caution: "combat.diffLegend.caution",
  danger: "combat.diffLegend.danger",
};

/**
 * Hover/Fokus-Tooltip auf dem eingefärbten Monster-Namen (MonsterCard + EliteMonsterCard, Chef-
 * Auftrag „Tooltip-Vereinheitlichung" 2026-07-23): erklärt direkt an der Stelle, wo der Spieler die
 * Farbe sieht, was sie bedeutet — kompakte 5-Zeilen-Legende (Farbe → Bedeutung), die aktuell
 * zutreffende Zeile fett hervorgehoben (`.ct-difflegend-current`, s. components.css). Glowloses
 * `.ct-tip` (der Glow-Ring bleibt exklusiv den Attribut-Karten vorbehalten).
 */
function DiffNameLabel({
  tier,
  className,
  children,
}: {
  tier: DiffNameDisplayTier;
  className: string;
  children: JSX.Element | string;
}): JSX.Element {
  const { t } = useI18n();
  const { tip, open, close } = useCitadelTip<true>();
  return (
    <span
      className={className}
      tabIndex={0}
      onMouseEnter={(e) => open(true, e.currentTarget)}
      onMouseLeave={close}
      onFocus={(e) => open(true, e.currentTarget)}
      onBlur={close}
    >
      {children}
      {tip && (
        <CitadelTip rect={tip.rect}>
          <div className="ct-difflegend">
            {DIFF_NAME_TIERS.map((dt) => (
              <div key={dt} className={`ct-difflegend-row diffname-${dt}${dt === tier ? " ct-difflegend-current" : ""}`}>
                {t(DIFF_LEGEND_KEY[dt])}
              </div>
            ))}
          </div>
        </CitadelTip>
      )}
    </span>
  );
}

interface Floater {
  id: number;
  target: "player" | "enemy";
  amount: number;
  crit: boolean;
  heal: boolean;
  magic: boolean;
  /** DoT-Tick (z.B. Feuer): orange Zahl mit Status-Icon daneben. */
  dot?: boolean;
  /** Lebensraub-Heilung: grüne +Zahl mit Lebensraub-Icon (Platzhalter = Blutungs-Icon). */
  lifesteal?: boolean;
  /**
   * Task #220 — nur bei `heal`: `event.source`/`event.itemId` fürs Quell-Icon im grünen Floater
   * (Trank/Food-Item-Icon via `healSourceIcon`, sonst Emoji-Fallback lifesteal/kill/effect).
   */
  healSource?: CombatEvent["source"];
  healItemId?: string;
  /** Fehlschlag (OSRS-Stil): blaue „0" auf der angegriffenen Seite. */
  miss?: boolean;
  /** XP-Drop: kleine goldene „+N XP"-Zahl beim Spieler (OSRS-XP-Drop-Feeling). */
  xp?: boolean;
  /** Status-Anwendung (NEU, kein Refresh): auffälliger Text-Floater mit Icon + Namen
   *  (z.B. „Bleed!"), damit ein neu angewandter Debuff nicht nur im kleinen Log auftaucht. */
  proc?: boolean;
  /**
   * Gegner-Ward absorbiert einen Treffer (Rüstungs-Trinität Spec §3.2, #219 "optional"): cyan
   * „-N"-Zahl mit Ward-Icon, client-seitig aus dem `enemyWard`-Delta zwischen zwei Renders
   * hergeleitet (kein eigenes CombatEvent — #220 Combat-Log-Feld kommt separat von combat-dev).
   */
  wardAbsorb?: boolean;
  /** Vorformatiertes Label für `proc`-Floater, z.B. "Bleed!" / "Blutung!". */
  label?: string;
  status?: StatusType;
  x: number;
}

/**
 * Task #220: Klartext-Label für `event.source` — bei Trank/Food der lokalisierte Item-Name
 * (analog Loot-Log), sonst (lifesteal/kill/effect/ward) der übersetzte Quell-Name. Geteilt
 * zwischen der Combat-Log-Zeile (heal + shield) — der grüne Floating-Text nutzt nur das Icon
 * (`healSourceIcon`), keinen Text (zu wenig Platz/Lebensdauer für ein Tooltip-Label).
 */
function healSourceLabel(
  e: CombatEvent,
  t: TFn,
  tr: (loc: LocalizedString) => string,
): string | null {
  if (!e.source) return null;
  if (e.source === "potion" || e.source === "food") {
    // Beide Quellen setzen immer itemId (s. combat.ts healPlayer/autoEat/drinkPotion) — defensiv
    // trotzdem kein Label ohne itemId statt eines undefinierten Übersetzungs-Keys.
    if (!e.itemId) return null;
    const item = content.items[e.itemId];
    return item ? tr(item.name) : e.itemId;
  }
  return t(`combat.healSource.${e.source}`);
}

// Emoji-Fallback je Heil-/Absorptions-Quelle ohne eigenes Icon-Asset (Task #220). "effect" ist
// nur noch der Fallback-der-Fallback-Stufe (falls VITALITY_ICON_URL doch mal fehlen sollte, s.
// healSourceIcon) — der Normalfall zeigt jetzt das echte Vitality-Icon (Chef-Auftrag 2026-07-23).
const HEAL_SOURCE_EMOJI: Record<string, string> = {
  lifesteal: "🩸",
  kill: "💀",
  effect: "✨",
};

/**
 * Task #220: Quell-Icon für Heil-/Absorptions-Events — Trank/Food zeigen das echte Item-Icon
 * (`getItemImage`), lifesteal/ward fallen auf die bereits vorhandenen Status-/Stat-Icons zurück
 * (Lebensraub = Blutungs-Icon, Ward = dieselbe Ward-Raute wie die Ward-Leiste), "effect" (passiver
 * Regen/Schild-Tick) auf das echte Vitality-Skill-Icon (Chef-Auftrag 2026-07-23, ersetzt den
 * früheren ✨-Platzhalter), "kill" auf ein Emoji (kein passendes Skill-Icon vorhanden — Lebensraub-
 * bei-Kill ist kein Skill-Effekt). Geteilt zwischen dem grünen Heil-Floater (`Fighter`) und der
 * Log-Zeile.
 */
function healSourceIcon(source: CombatEvent["source"], itemId?: string): JSX.Element | string | null {
  if (!source) return null;
  if ((source === "potion" || source === "food") && itemId) {
    const img = getItemImage(itemId);
    if (img) {
      return <img loading="lazy" decoding="async" src={img} alt="" className="heal-source-icon-img pixelart" />;
    }
    const item = content.items[itemId];
    if (item?.icon) return item.icon;
    // Welle QQ: letzte Fallback-Stufe vor dem nackten Emoji — echtes Trank-/Essen-Icon.
    const fallbackUrl = source === "potion" ? POTION_ICON_URL : FOOD_ICON_URL;
    return fallbackUrl
      ? <img loading="lazy" decoding="async" src={fallbackUrl} alt="" className="heal-source-icon-img pixelart" />
      : (source === "potion" ? "🧪" : "🍖");
  }
  if (source === "ward") return statIcon("ward");
  // "meleeLifesteal" (E+-Paket §E+, Stil-Lebensraub des Nahkampfs) teilt das Lebensraub-Icon.
  if (source === "lifesteal" || source === "meleeLifesteal") {
    // Mira-Set 2026-08-03: dediziertes Blutstropfen-Icon statt des geliehenen Blutungs-Status-
    // Icons — dieselbe Fallback-Stufe (renderEffectIcon("bleed")) bleibt als Sicherheitsnetz.
    return HEAL_BLOOD_ICON_URL
      ? <img loading="lazy" decoding="async" src={HEAL_BLOOD_ICON_URL} alt="" className="heal-source-icon-img pixelart" />
      : renderEffectIcon("bleed");
  }
  if (source === "kill") {
    return HEAL_DEATH_ICON_URL
      ? <img loading="lazy" decoding="async" src={HEAL_DEATH_ICON_URL} alt="" className="heal-source-icon-img pixelart" />
      : (HEAL_SOURCE_EMOJI.kill ?? "💀");
  }
  if (source === "effect" && VITALITY_ICON_URL) {
    return <img loading="lazy" decoding="async" src={VITALITY_ICON_URL} alt="" className="heal-source-icon-img pixelart" />;
  }
  if (HEAL_SPELL_ICON_URL) {
    return <img loading="lazy" decoding="async" src={HEAL_SPELL_ICON_URL} alt="" className="heal-source-icon-img pixelart" />;
  }
  return HEAL_SOURCE_EMOJI[source] ?? "✨";
}

/**
 * Task #333 (Chef-Feature "Log-Settings wie in WoW"): ordnet jedes CombatEvent einer der 8
 * Anzeige-Filter-Kategorien zu (s. CombatLogCategory/COMBAT_LOG_CATEGORIES, uiPrefs.ts) — rein
 * UI-seitige Gruppierung der Engine-`CombatEvent.kind`-Werte, kein Engine-Eingriff. hit/crit/miss/
 * dot laufen in beide Richtungen (`by`), deshalb eigene own-/enemyDamage-Buckets statt 1:1 auf
 * `kind`; `block` gehört thematisch zum ERLITTENEN Schaden (der Spieler wehrt einen gegnerischen
 * Treffer ab — `by` steht dabei technisch auf "player", ist hier aber nur der Verursacher-Flag
 * des Blocks, keine Richtungsangabe). Deckt alle 16 `kind`-Werte ab (TS-Exhaustiveness ohne
 * `default` — ein neuer `kind` in shared/index.ts würde hier einen Compile-Fehler auslösen).
 */
function logEventCategory(e: CombatEvent): CombatLogCategory {
  switch (e.kind) {
    case "hit":
    case "crit":
    case "miss":
    case "dot":
      return e.by === "player" ? "ownDamage" : "enemyDamage";
    case "block":
      return "enemyDamage";
    case "heal":
    case "shield":
    case "lifesteal":
      return "healing";
    case "status":
      return "status";
    case "loot":
    case "gold":
      return "loot";
    case "xp":
      return "xp";
    case "pet":
    case "petAbility":
      return "companion";
    case "kill":
    case "defeat":
      return "deathVictory";
  }
}

function eventText(
  e: CombatEvent,
  monsterName: string,
  t: TFn,
  tr: (loc: LocalizedString) => string,
): string {
  switch (e.kind) {
    case "loot": {
      const item = e.itemId ? content.items[e.itemId] : undefined;
      const name = item ? tr(item.name) : (e.itemId ?? "");
      return t("combat.logLoot")
        .replace("{qty}", String(e.amount))
        .replace("{item}", name);
    }
    case "xp": {
      if (e.amount === 0) {
        return t("combat.logXpZero").replace("{mob}", monsterName);
      }
      const skill = e.skill ? content.skills[e.skill] : undefined;
      const name = skill ? tr(skill.name) : (e.skill ?? "");
      return t("combat.logXp")
        .replace("{xp}", String(e.amount))
        .replace("{skill}", name);
    }
    case "gold":
      return t("combat.logGold").replace("{gold}", String(e.amount));
    case "hit": {
      // Chef-Fix nach Spieler-Report "Hollow Choir: I miss 9/10" (voll absorbierte Treffer sahen
      // wie Misses aus): ein vom Gegner-Ward voll geschluckter Treffer (amount 0) zeigt statt der
      // nackten „0" ein Schild-Ereignis. Der teilweise absorbierte Fall (amount > 0) hängt seinen
      // kleinen blauen Zusatz separat am Render-Ort an (eventText liefert reinen Text, s. Battle).
      if (e.by === "player" && e.amount === 0 && (e.absorbed ?? 0) > 0) {
        return t("combat.log.wardAbsorbed").replace("{amount}", String(e.absorbed));
      }
      // Task #220: Mitigations-Aufschlüsselung nur für Spieler-Angriffe mit tatsächlich
      // geschluckter Rüstung (mitigated > 0) — sonst bliebe „26 (26 − 0 / Gegner-Rüstung)"
      // Log-Spam gegen defense-0-Gegner (Invariante rawDamage − mitigated === amount).
      if (e.by === "player" && e.mitigated !== undefined && e.mitigated > 0 && e.rawDamage !== undefined) {
        return t("combat.youHitMitigated")
          .replace("{amount}", String(e.amount))
          .replace("{raw}", String(e.rawDamage))
          .replace("{mitigated}", String(e.mitigated));
      }
      return e.by === "player"
        ? t("combat.youHit").replace("{amount}", String(e.amount))
        : t("combat.enemyHits").replace("{name}", monsterName).replace("{amount}", String(e.amount));
    }
    case "crit": {
      if (e.by === "player" && e.amount === 0 && (e.absorbed ?? 0) > 0) {
        return t("combat.log.wardAbsorbed").replace("{amount}", String(e.absorbed));
      }
      if (e.by === "player" && e.mitigated !== undefined && e.mitigated > 0 && e.rawDamage !== undefined) {
        return t("combat.critMitigated")
          .replace("{amount}", String(e.amount))
          .replace("{raw}", String(e.rawDamage))
          .replace("{mitigated}", String(e.mitigated));
      }
      return t("combat.crit").replace("{amount}", String(e.amount));
    }
    case "miss":
      // E+-Paket (battle-040-dramaturgie §E+): Schock-Aussetzer und Leder-Dodge sind über
      // `missReason` vom echten Fehlschlag unterscheidbar — NUR der Zeilentext ändert sich;
      // Filter-Kategorie, Floater und SFX behandeln alle drei weiter als "miss".
      if (e.missReason === "shock") {
        return e.by === "player"
          ? t("combat.missShockPlayer")
          : t("combat.missShockEnemy").replace("{name}", monsterName);
      }
      if (e.missReason === "dodge") {
        return t("combat.missDodge").replace("{name}", monsterName);
      }
      return e.by === "player"
        ? t("combat.youMiss")
        : t("combat.enemyMisses").replace("{name}", monsterName);
    case "kill":
      return t("combat.kill").replace("{name}", monsterName);
    case "defeat":
      return t("combat.defeat");
    case "heal": {
      // Task #220: Heil-Quelle als Klartext-Suffix — „(Kleiner Heiltrank)" / „(Lebensraub)" etc.,
      // das Icon davor kommt separat aus `healSourceIcon` (s. battle-log-Render in `Battle`).
      const base = t("combat.heal").replace("{amount}", formatStat(e.amount));
      const label = healSourceLabel(e, t, tr);
      return label ? `${base} (${label})` : base;
    }
    case "shield": {
      const base = t("combat.shield").replace("{amount}", formatStat(e.amount));
      const label = healSourceLabel(e, t, tr);
      return label ? `${base} (${label})` : base;
    }
    case "block":
      // Chef-BUG-Fix: Schild-Block ist jetzt sichtbar — „Blocked! −X" (blau, analog Ward-Absorb).
      return t("combat.log.block").replace("{amount}", formatStat(e.amount));
    case "status": {
      const label = e.status ? t(`status.${e.status}`) : "";
      return e.by === "player"
        ? t("combat.statusEnemy").replace("{name}", monsterName).replace("{status}", label)
        : t("combat.statusPlayer").replace("{status}", label);
    }
    case "dot": {
      // E+-Paket (battle-040-dramaturgie §E+): bleed/poison ticken jetzt mit Log-Zeile (Engine
      // emitDotTick) — status-spezifischer Text. burn behält die bestehenden Keys (Alt-Zeilen
      // byte-gleich); fehlender status (Alt-Save-Logs) fällt ebenfalls auf den burn-Text zurück.
      const dotKey = e.status === "bleed" || e.status === "poison" ? `.${e.status}` : "";
      return e.by === "player"
        ? t(`combat.dotEnemy${dotKey}`).replace("{name}", monsterName).replace("{amount}", formatStat(e.amount))
        : t(`combat.dotPlayer${dotKey}`).replace("{amount}", formatStat(e.amount));
    }
    case "lifesteal": {
      // Welle MM (Fenn R3-Fund, "Lifesteal heals you for 0."): die Engine heilt ein Passiv-
      // Minimum von 0,1 HP (combat.ts) statt echter 0, aber formatStat rundet auf 0 Nachkomma-
      // stellen — jede kleine Heilung log­gte fälschlich „for 0.". formatDamage (1 Dezimale,
      // bereits für Schaden im Einsatz) zeigt „0.1" statt der Lüge; der ===0-Filter (s. weiter
      // unten im Log-Render) bleibt unverändert für echte Nullen.
      const base = t("combat.lifesteal").replace("{amount}", formatDamage(e.amount));
      // E+-Paket (battle-040-dramaturgie §E+): der Melee-STIL-Lebensraub loggt jetzt (source
      // "meleeLifesteal") und trägt sein Quell-Label wie die heal-Zeilen — die bestehende
      // Gear-Lebensraub-Zeile (source "lifesteal") bleibt unverändert.
      return e.source === "meleeLifesteal"
        ? `${base} (${t("combat.healSource.meleeLifesteal")})`
        : base;
    }
    case "pet":
      return t("toast.petDrop"); // „Begleiter erhalten!" — seltener Combat-Pet-Drop
    case "petAbility": {
      const pet = e.petId ? content.pets[e.petId] : undefined;
      const petName = pet ? tr(pet.name) : t("pet.effect.active");
      // #276 Schritt 4: der ANZEIGENAME der Ability (z.B. „Prismatic Lance") — Pflichtfeld im
      // Content, ersetzt/ergänzt den rohen Kind-Schlüssel als Log-Label (Spec-Kommentar
      // shared/index.ts PetCombatAbility.name: „für Combat-Log, Pet-Card/Galerie …").
      const abilityName = pet ? tr(pet.combatAbility.name) : undefined;
      const label = abilityName ?? (e.ability ? t(`pet.effect.combat.${e.ability}`) : t("pet.effect.active"));
      // Welle KK (Fenn-Retest, "Pet-Ability-Logzeile trägt 2 Gedankenstriche"): der Ability-Name
      // wurde bisher mit hartkodiertem " — " vor den Basistext gesetzt — die Flavor-Texte selbst
      // tragen aber schon je einen eigenen Gedankenstrich (z.B. "{pet} mauls the enemy — deep bleed
      // inflicted!"), macht zusammen 2 (Regelverstoß: ≤1 Dash pro spielersichtbarem Text). Eigener
      // i18n-Combiner-Key ("{label}: {text}") statt Template-Literal ersetzt den Bindestrich durch
      // einen Doppelpunkt und bleibt trotzdem übersetzbar.
      if (e.ability === "stealDrop" && e.itemId) {
        const item = content.items[e.itemId];
        const itemName = item ? tr(item.name) : e.itemId;
        const base = t("combat.petLog.stealDrop").replace("{pet}", petName).replace("{item}", itemName);
        return abilityName
          ? t("combat.petLog.abilityLabel").replace("{label}", abilityName).replace("{text}", base)
          : base;
      }
      // Flavor-Text je Pet (keyed by petId), Fallback auf generisches Format.
      if (e.petId) {
        const flavorKey = `pet.flavor.${e.petId}`;
        const flavor = t(flavorKey);
        if (flavor !== flavorKey) {
          // Ersatz-Platzhalter {pet} und {amount} auflösen.
          let text = flavor.replace("{pet}", petName);
          if (e.amount > 0) text = text.replace("{amount}", String(e.amount));
          return abilityName
            ? t("combat.petLog.abilityLabel").replace("{label}", abilityName).replace("{text}", text)
            : text;
        }
      }
      if (e.amount > 0) {
        return t("combat.petLog.withAmount")
          .replace("{pet}", petName)
          .replace("{ability}", label)
          .replace("{amount}", String(e.amount));
      }
      return t("combat.petLog.noAmount").replace("{pet}", petName).replace("{ability}", label);
    }
  }
}

function Bar({
  pct,
  kind,
  label,
  title,
}: {
  pct: number;
  kind: string;
  label?: JSX.Element | string;
  /** Optional Hover-Hinweis auf dem Balken-Wrapper (z.B. Ward-Leer-Hinweis „casten zum Aufladen"). */
  title?: string;
}): JSX.Element {
  // kindBase extracts the first token (e.g. "mana" from "mana depleted") so the
  // wrapper gets a stable single-word class (cbar-hp, cbar-mana, cbar-timer …)
  // that the Citadel CSS reskin can target without :has().
  const kindBase = kind.split(" ")[0];
  const clamped = Math.max(0, Math.min(100, pct));
  // Chef-GO Belohnungs-Juice-Welle #3 — HP-Nachlauf-Leiste: NUR bei hp/enemy-hp ein zweischichtiger
  // Balken (heller "Geist" hinter dem eigentlichen Fill). Beide Ebenen binden an denselben `pct`-
  // Wert; der Nachlauf ist ein reiner CSS-Timing-Trick (`.cbar-hp-trail` transition-delay in
  // combat.css) — bei Schaden bleibt die Geist-Schicht ~0,9s stehen und gleitet dann auf den neuen
  // (kleineren) Wert herab, während `.cbar-fill` sofort fällt. Bei Heilung überdeckt der jetzt
  // breitere `.cbar-fill` (später im DOM, also oben) die schmalere Geist-Schicht komplett — kein
  // Sonderfall in JS nötig. Reine width-Transitions, kein rAF.
  const isHp = kindBase === "hp" || kindBase === "enemy-hp";
  // Perf-Welle (2026-07-22): scaleX statt width — width-Änderungen erzwingen jeden Tick ein
  // Layout+Paint (im Kampf 51 Layouts/s gemessen), transform bleibt auf dem Compositor-Thread.
  // transform-origin:left in combat.css lässt den Balken weiterhin von links wachsen/schrumpfen.
  const scale = clamped / 100;
  const fill = (
    <>
      {isHp && <div className="cbar-hp-trail" style={{ transform: `scaleX(${scale})` }} />}
      <div
        className={`cbar-fill ${kind}`}
        style={{ transform: `scaleX(${scale})` }}
      />
      {/* Chef-Wunsch (2026-07-02): Wert-Text mittig IM Balken statt daneben/darüber. */}
      {label !== undefined && <span className="cbar-label">{label}</span>}
    </>
  );
  // Tooltip-Vereinheitlichung (Chef-Auftrag 2026-07-23): war ein natives `title` — jetzt das
  // glowlose `.ct-tip` (nur wenn ein Hinweis übergeben wurde, z.B. Ward-Leer-Hinweis).
  if (title) {
    return (
      <HoverTip as="div" className={`cbar cbar-${kindBase}`} content={<span className="ct-tip-desc">{title}</span>}>
        {fill}
      </HoverTip>
    );
  }
  return <div className={`cbar cbar-${kindBase}`}>{fill}</div>;
}

/**
 * Enrage-Icon (brüllender Bär, `icon_enrage`) mit fester CSS-Größe — die Quelle ist 128px, OHNE
 * feste width/height würde sie riesig rendern. Ersetzt die rohen 😡-Emojis (Fighter-Badge/
 * Monster-Karte/Modal-Trait), Fallback-Emoji falls das PNG fehlt (AutoEatIcon-Muster, ShopPage.tsx).
 */
function EnrageIcon({ size = 18 }: { size?: number }): JSX.Element {
  const src = getUiIcon("icon_enrage");
  return src
    ? <img loading="lazy" decoding="async" src={src} alt="" className="enrage-icon-img" style={{ width: size, height: size }} />
    : <span>😡</span>;
}

// Zauber-Cast-Keyframes: dezentes arcanes Aufleuchten statt physischer Lunge.
const CAST_KEYFRAMES: Keyframe[] = [
  { transform: "translateX(0) scale(1)", filter: "brightness(1)" },
  { transform: "translateX(0) scale(1.08)", filter: "brightness(1.6) hue-rotate(200deg)", offset: 0.3 },
  { transform: "translateX(22px) scale(1.06)", filter: "brightness(1.8) hue-rotate(220deg)", offset: 0.55 },
  { transform: "translateX(22px) scale(1.06)", filter: "brightness(1.8) hue-rotate(220deg)", offset: 0.65 },
  { transform: "translateX(0) scale(1)", filter: "brightness(1)" },
];

// Angriffs-Lunge als Web-Animations-Keyframes (imperativ ausgelöst → spielt zuverlässig jedes Mal).
const LUNGE_RIGHT: Keyframe[] = [
  { transform: "translateX(0) rotate(0)" },
  { transform: "translateX(55px) scale(1.1) rotate(4deg)", offset: 0.45 },
  { transform: "translateX(55px) scale(1.1) rotate(4deg)", offset: 0.6 },
  { transform: "translateX(0) rotate(0)" },
];
const LUNGE_LEFT: Keyframe[] = [
  { transform: "translateX(0) rotate(0)" },
  { transform: "translateX(-55px) scale(1.1) rotate(-4deg)", offset: 0.45 },
  { transform: "translateX(-55px) scale(1.1) rotate(-4deg)", offset: 0.6 },
  { transform: "translateX(0) rotate(0)" },
];
// Pet companion jumps toward the enemy (right) and returns.
// translateX is in screen space; scaleX(-1) must be repeated in every keyframe to
// preserve the flip that the CSS class sets (Web Animations overrides CSS transform).
const PET_LUNGE_KEYFRAMES: Keyframe[] = [
  { transform: "translateX(0px) scaleX(-1)" },
  { transform: "translateX(70px) scaleX(-1) scaleY(1.15)", offset: 0.38 },
  { transform: "translateX(85px) scaleX(-1) scaleY(1.2)", offset: 0.52 },
  { transform: "translateX(85px) scaleX(-1) scaleY(1.2)", offset: 0.62 },
  { transform: "translateX(0px) scaleX(-1)" },
];

// ─── Kampf-Juice-Welle (Chef-GO „Juice GO" 2026-07-12) ──────────────────────────────────────────
// Alle neuen Wucht-Effekte laufen imperativ (WAAPI auf gepoolten DOM-Elementen im `.arena-fx-layer`
// bzw. direkt auf Stage-/Figur-Refs) — KEIN React-State pro Event. Stufen-Gating: die komplette
// FX-Schicht (Shake/Partikel/Projektile/Runen-Ring/Punch) läuft NUR bei fxLevel "full"; "reduced"
// behält die bestehenden Flashes/Zahlen, "off" nichts Neues (s. fxLevel-Berechnung in `Battle`).

/** §1a — Arena-Shake NUR bei Crits: ~4px Amplitude, 160ms, ease-out — subtil, kein Erdbeben
 *  (10h-Idle-Verträglichkeit: normale Treffer schütteln NICHT). */
const ARENA_SHAKE_KEYFRAMES: Keyframe[] = [
  { transform: "translate(0, 0)" },
  { transform: "translate(-4px, 2px)", offset: 0.25 },
  { transform: "translate(3px, -2px)", offset: 0.55 },
  { transform: "translate(-2px, 1px)", offset: 0.8 },
  { transform: "translate(0, 0)" },
];

/** §1b — Impact-Emphase am GETROFFENEN: Weißblitz + Scale-Punch 1.0→1.04→1.0 mit ~60ms Plateau
 *  auf dem Peak („Hit-Stop-Gefühl": die Figur friert kurz aufgehellt/gestaucht ein). Läuft auf
 *  einem EIGENEN Wrapper (`punchRef`/.fighter-figure-punch) — der Recoil belegt bereits `artRef`
 *  mit translateX, ein zweites Transform auf demselben Element würde sich überschreiben. */
function hitPunchKeyframes(crit: boolean): Keyframe[] {
  const peak = crit ? "brightness(2.1) saturate(0.4)" : "brightness(1.8) saturate(0.55)";
  return [
    { transform: "scale(1)", filter: "brightness(1)" },
    { transform: "scale(1.04)", filter: peak, offset: 0.15 },
    { transform: "scale(1.04)", filter: "brightness(1.5) saturate(0.7)", offset: 0.58 },
    { transform: "scale(1)", filter: "brightness(1)" },
  ];
}

/** Pool-Deckel je FX-Element-Art (Partikel gepoolt, Pflichtteil): weitere Trigger über dem Deckel
 *  recyclen die ältesten Elemente (laufende Animation wird gecancelt) — kein DOM-Wachstum, keine
 *  Allokations-Spikes bei Dauerkampf. */
const FX_POOL_SIZE = { spark: 36, beam: 4, ring: 2, flash: 3 } as const;
type FxKind = keyof typeof FX_POOL_SIZE;
const FX_TAG: Record<FxKind, "span" | "div"> = { spark: "span", beam: "div", ring: "div", flash: "div" };

/**
 * Task #296 P0 §1.4 — Pet-Ability-Blitz: die 16 `PetAbilityKind`-Werte (shared/index.ts) auf 4
 * Farb-Buckets abgebildet (ui-dev-Entscheidung, laut Plan „kann ui-dev selbst entscheiden"):
 * - "damage"  (rot/orange, `--danger`-nah): Sofortschaden am Gegner.
 * - "heal"    (grün, matcht den grünen Heil-Floater): stellt Spieler-HP wieder her.
 * - "support" (blau, matcht Ward/Mana-Töne): Schild/Mana/Block — defensive Ressourcen-Hilfe.
 * - "control" (violett, matcht den Status-Proc-Floater/`.log-line.status`): Stun/Debuff/Steal/
 *   DoT-Auflage/Timing-Sabotage — alles, was den Gegner in seiner Aktion einschränkt.
 * `lifestealBurst` zählt trotz Heil-Nebeneffekt als "damage" (Sofortschaden ist der Haupteffekt);
 * `armorRend` als "control" (senkt effektiv die gegnerische Verteidigung, kein Sofortschaden).
 */
type PetFxBucket = "damage" | "heal" | "support" | "control";
const PET_ABILITY_BUCKET: Record<PetAbilityKind, PetFxBucket> = {
  stun: "control",
  burstDamage: "damage",
  onHitStatus: "control",
  delayedDot: "control",
  accuracyDownEnemy: "control",
  stealDrop: "control",
  heal: "heal",
  shield: "support",
  armorRend: "control",
  guaranteedCrit: "damage",
  manaRestore: "support",
  lifestealBurst: "damage",
  enemyAttackDelay: "control",
  blockNextEnemyHit: "support",
  armorPierceHit: "damage",
  multiHit: "damage",
};

// ─── Kampfeffekte Welle 1 (design/combat-fx/konzept-kampfeffekte.md) ────────────────────────────
// Sprites on top vom bestehenden Kampf-Juice-FX-Layer (derselbe `arena-fx-layer`, ein eigener
// Element-Pool je Rolle — s. Battle: acquireSpriteFx/acquireMissileFx/playStripFx/playMissileFx).
// Themen-/Familien-/Blutvariante-Auflösung sitzt in combatFx.ts (pur, testbar).

/** Gepoolte Streifen-Sprites je SEITE (Konzept §4 "max. drei gleichzeitige Sprites je Seite") —
 *  ein Element deckt Einschlag/Slash/Blut/Pet/Miss/Crit-Overlay gleichermaßen ab (nur URL/Größe/
 *  Rotation unterscheiden sich je Aufruf). */
const SPRITE_FX_POOL_SIZE = 3;
/** Geschosse fliegen nur ~200ms und sind selten gleichzeitig aktiv — ein kleinerer, seitenloser
 *  Pool reicht (Konzept-Deckel bezieht sich auf die LANDENDEN Effekte je Seite). */
const MISSILE_FX_POOL_SIZE = 2;
/** Flugdauer eines Geschoss-Sprites. Chef-Feedback 28.08.2026 ("Projektile sind zu schnell, wir
 *  sehen die Assets nicht"): vorher 200ms (Konzept §2/§4 "~200ms"), jetzt so verlängert, dass ein
 *  Geschoss ~500–600ms sichtbar unterwegs ist (das explizite Ziel aus dem Feedback — reine +60%
 *  hätten nur 320ms ergeben und das Ziel verfehlt). Auch von der SFX-Verzögerung des
 *  Bogen-Impact-Sounds genutzt (s. Battle SFX-Block: „Sound beim Ankommen des Geschosses"). */
const MISSILE_FLIGHT_MS = 560;
/** Dauer des Einschlag-Sprites am Ziel (Familie A/B-Landung, `playImpactFx`). Chef-Feedback
 *  28.08.2026 ("wir sehen die Assets nicht"): vorher 300ms, jetzt +30% — reine Slash-/Blut-/Pet-/
 *  Miss-/Block-Dauern bleiben unverändert (nicht Teil des Feedbacks). */
const IMPACT_FX_MS = 390;

/** Drei überlappende Opacity-Fenster (Beginn/Höhepunkt/Ausklang) für den Zellen-Crossfade eines
 *  768×256-Drei-Felder-Streifens — dieselbe Kurve für alle Rollen, nur `duration` variiert je
 *  Aufruf. Bleibt als Sonderfall in `buildStripKeyframes` erhalten (Anforderung "drei Felder
 *  verhalten sich exakt wie heute", 28.08.2026). */
const STRIP_CELL_KEYFRAMES: Keyframe[][] = [
  [{ opacity: 1, offset: 0 }, { opacity: 1, offset: 0.3 }, { opacity: 0, offset: 0.42 }, { opacity: 0, offset: 1 }],
  [
    { opacity: 0, offset: 0 }, { opacity: 0, offset: 0.3 }, { opacity: 1, offset: 0.4 },
    { opacity: 1, offset: 0.62 }, { opacity: 0, offset: 0.72 }, { opacity: 0, offset: 1 },
  ],
  [{ opacity: 0, offset: 0 }, { opacity: 0, offset: 0.6 }, { opacity: 1, offset: 0.7 }, { opacity: 1, offset: 1 }],
];

/** Zellen-Crossfade-Keyframes für `count` gleich große Felder (N-Felder statt fix drei, Chef-
 *  Feedback 28.08.2026 "mehr Frames pro Effekt"): `count===3` liefert exakt `STRIP_CELL_KEYFRAMES`
 *  (bit-identisch zum bisherigen Verhalten), alle anderen Feldzahlen bekommen ein gleichmäßiges
 *  Crossfade-Raster (Haltefenster ± ein Drittel-Segment-Überlappung pro Seite). `count<=1` zeigt
 *  das einzelne Feld konstant (alte Ein-Feld-Geschosse, unverändert). */
function buildStripKeyframes(count: number): Keyframe[][] {
  if (count <= 1) return [[{ opacity: 1, offset: 0 }, { opacity: 1, offset: 1 }]];
  if (count === 3) return STRIP_CELL_KEYFRAMES;
  const width = 1 / count;
  const fade = width * 0.3;
  const frames: Keyframe[][] = [];
  for (let i = 0; i < count; i++) {
    const holdStart = i * width;
    const holdEnd = (i + 1) * width;
    const kf: Keyframe[] = [];
    if (i === 0) {
      kf.push({ opacity: 1, offset: 0 });
    } else {
      kf.push({ opacity: 0, offset: 0 }, { opacity: 0, offset: holdStart }, { opacity: 1, offset: holdStart + fade });
    }
    if (i === count - 1) {
      kf.push({ opacity: 1, offset: 1 });
    } else {
      kf.push({ opacity: 1, offset: holdEnd - fade }, { opacity: 0, offset: holdEnd }, { opacity: 0, offset: 1 });
    }
    frames.push(kf);
  }
  return frames;
}

/** Größen-Anteil an der Figurenhöhe je Sprite-Rolle (Konzept §4: "Einschlag ≈55 %, Slash ≈70 %,
 *  Geschoss ≈28 %" — Blut/Pet/Wischer sind dort nicht beziffert, eigene UI-Ermessens-Werte). */
const SPRITE_SIZE_RATIO = { impact: 0.55, slash: 0.7, blood: 0.42, pet: 0.45, miss: 0.5 } as const;

/** Ein Drop-Icon im Collection-Log-Stil: `???` bis entdeckt, danach klickbar → Item-Info-Tooltip. */
function DropIcon({
  monsterId,
  roll,
}: {
  monsterId: string;
  roll: { itemId: string; chance: number; min: number; max: number };
}): JSX.Element {
  const state = useGameState();
  const { t, tr } = useI18n();
  const tooltip = useItemTooltip();
  const seen = hasDropSeen(state, monsterId, roll.itemId);
  const img = getItemImage(roll.itemId);
  if (!seen) {
    // Task #248: keine „???"-Textmaske mehr, sondern die echte Item-Form als schwarze
    // Silhouette (brightness(0) auf das echte Bild) — Form erahnbar, Details verborgen.
    // Nicht klickbar, kein Tooltip. Fallback auf „?" nur wenn kein Bild existiert.
    return (
      <span className="drop-icon undiscovered" title={t("combat.undiscovered")}>
        {img ? (
          <img
            loading="lazy"
            decoding="async"
            src={img}
            alt=""
            className="drop-icon-img drop-icon-silhouette pixelart"
          />
        ) : (
          "?"
        )}
      </span>
    );
  }
  const item = content.items[roll.itemId];
  // Sweep-Fund #353 (Drop-Bot): Math.round machte jede Chance <0,5% zu „0%" — 11 der 19 neuen
  // Beikost-Rows lasen sich als „gibt's nicht". formatDropPct wie im Bestiarium/Dungeon-Preview.
  return (
    <span
      className="drop-icon clickable"
      title={`${item ? tr(item.name) : roll.itemId} · ${formatDropPct(roll.chance)}`}
      role="button"
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation();
        tooltip.pin(roll.itemId, e.clientX, e.clientY, []);
      }}
      onKeyDown={(e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        tooltip.pin(roll.itemId, rect.left + rect.width / 2, rect.top + rect.height / 2, []);
      }}
    >
      {img ? <img loading="lazy" decoding="async" src={img} alt="" className="drop-icon-img pixelart" /> : item?.icon ?? "▪"}
    </span>
  );
}

/**
 * Drop-Box im Fighter-Header (Chef-Fix 2026-07-05, Bild #32): EIN DOM-Grid für beide Breakpoints —
 * bei breiten Fighter-Panels bleibt es das gewohnte Label+Icon-Grid inline sichtbar (CSS, s.
 * `.fighter-sub-drops-grid` in combat.css); wird das Panel schmal genug, dass es mit der Name/
 * Level/Status-Zeile konkurrieren würde, schaltet eine `@container`-Regel auf `.fighter` das Grid
 * per CSS zu einem Popover um, das nur bei `.open` sichtbar ist. React steuert ausschließlich die
 * `open`-Klasse (Klick auf den Toggle-Button) — im breiten Modus hat das Umschalten keinen
 * sichtbaren Effekt (Grid ist dort per CSS immer `display:flex`).
 */
function DropsBox({
  monster,
  dropCounts,
}: {
  monster: MonsterDef;
  dropCounts: { seen: number; total: number };
}): JSX.Element {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement | null>(null);

  // Schließen bei Klick außerhalb der Box (nur relevant im collapsed/Popover-Modus — im breiten
  // Modus ist `open` visuell wirkungslos). Im nächsten Tick registriert, damit der öffnende Klick
  // selbst den Listener nicht sofort wieder auslöst.
  useEffect(() => {
    if (!open) return;
    const onOutside = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") setOpen(false);
    };
    const id = window.setTimeout(() => window.addEventListener("mousedown", onOutside), 0);
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("mousedown", onOutside);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span
      ref={ref}
      className={`fighter-sub-drops${open ? " open" : ""}`}
      onMouseLeave={() => setOpen(false)}
    >
      <button type="button" className="fighter-sub-drops-toggle" onClick={() => setOpen((o) => !o)}>
        {t("combat.drops")} {dropCounts.seen}/{dropCounts.total}
      </button>
      <span className="fighter-sub-drops-grid">
        {monster.loot.map((roll) => (
          <DropIcon key={roll.itemId} monsterId={monster.id} roll={roll} />
        ))}
      </span>
    </span>
  );
}

interface FighterProps {
  name: string;
  sub: string;
  /** Kompakter Zusatz rechts neben Name/Sub im `.fighter-header` (z.B. Drop-Anzeige beim Gegner). */
  subExtra?: JSX.Element;
  imgSrc: string | null;
  enemy?: boolean;
  /** Combat level shown in the Citadel level_holder badge. */
  level?: number;
  hpCur: number;
  hpMax: number;
  hpKind: string;
  manaCur?: number;
  manaMax?: number;
  /**
   * Stoff-Ward-Pool (Rüstungs-Trinität Spec §8). Balken nur gerendert wenn `wardMax > 0`
   * (Magier/Stoff-Träger) — Melee/Ranged (Platte/Leder) zeigen KEINE dritte Leiste.
   */
  wardCur?: number;
  wardMax?: number;
  effects?: StatusEffect[];
  enraged?: boolean;
  enrageLabel?: string;
  regen?: number;
  regenLabel?: string;
  timerPct: number;
  /** Verbleibende Sekunden bis zum nächsten Schlag (für den mitlaufenden Countdown-Text IM Timer-Balken). */
  timerRemainingSec: number;
  floaters: Floater[];
  attackNonce?: number;
  /** When true, player attacks use the arcane cast animation instead of the physical lunge. */
  isCasting?: boolean;
  footer?: JSX.Element;
  /** Optional battle-sprite overlay shown next to the fighter figure (used for equipped pet). */
  companionSprite?: JSX.Element;
  /**
   * Arena-Rework (Chef-GO 2026-07-11): Spieler-Buff-Mini-Chips als Overlay unten links AUF der
   * Szene (Icon + Restsekunden, voller Name im title) — ersetzt die frühere `fighter-buffs`-
   * Layout-Zeile (ActiveBuffsBar), die das Porträt kleingedrückt hat. Nur Spieler-Seite gesetzt.
   */
  buffChips?: JSX.Element;
  /**
   * Arena-Rework: die 8-teilige Stat-Zeile (StatLine) lebt nicht mehr im Dauer-Layout, sondern
   * hinter einem kleinen „Details"-Toggle an der Nameplate (Session-State, useState in Fighter).
   */
  details?: JSX.Element;
  /**
   * Arena-Rework: Prognose-Prozent (Task #305 hitChance-Eintrag) als kompakter Chip in der
   * Nameplate-Meta-Zeile statt als StatLine-Eintrag — Spieler ⚔ eigene Treffchance, Gegner 🛡
   * gegnerische Treffchance.
   */
  hitChance?: { icon: React.ReactNode; label: string; pct: number };
  /** Kill-Cooldown aktiv (nur Gegner-Seite): sanft blurren + abdunkeln, der neue Gegner
   *  steht zwar schon da, kämpft aber noch nicht (siehe KillSummaryCard). */
  dimmed?: boolean;
  /**
   * Task #296 P0 §1.1/§1.2 — Treffer-Feedback am GETROFFENEN (nicht am Angreifer): eigener Nonce,
   * hochgezählt bei jedem `hit`/`crit`-Event mit `amount > 0` auf DIESER Seite (analog
   * `attackNonce`, aber für die Gegenrichtung). `hitCrit` sagt, ob der zuletzt gezählte Treffer
   * ein Crit war (kräftigerer Gold-Flash + stärkerer Recoil).
   */
  hitNonce?: number;
  hitCrit?: boolean;
  /** Task #296 P0 §1.3 — Kill-Flourish: kurzes Fenster (vor dem bestehenden `dimmed`/cooldown-blur),
   *  in dem die Gegner-Figur entsättigt + leicht absackt (nur Gegner-Seite gesetzt). */
  dying?: boolean;
  /** Task #296 P0 §1.5 — Status-Rand-Puls: Nonce + Statustyp, hochgezählt bei NEU angewandtem
   *  Status auf dieser Seite (derselbe Zweig, der schon den lila Text-Floater spawnt). */
  statusFxNonce?: number;
  statusFxType?: StatusType | null;
  /** Task #296 P0 §1.6 — Kampf-Effekte-Stufe (Options-Toggle ⊗ `prefers-reduced-motion`), einmal
   *  pro Battle-Mount berechnet und an beide Fighter durchgereicht. "full" = alles, "reduced" =
   *  nur Flash-/Farbeffekte ohne Bewegung, "off" = nichts Neues (Kernfeedback bleibt immer). */
  fxLevel?: CombatFxLevel;
}

/**
 * Zonen-Ambient-Partikel-Layer: ein `<canvas>` über dem Zonen-Hintergrund, rein Vanilla/rAF (s.
 * `createZoneParticleField`) — KEIN React-State pro Frame, also kein Re-Render durch die Partikel-
 * Bewegung selbst. Rendert `null` (kein DOM-Element) wenn die Zone kein Theme hat ODER
 * `fxLevel==="off"` (Options-Toggle bzw. `prefers-reduced-motion`, s. `fxLevel`-Berechnung in
 * `Battle`) — das macht den "aus"-Zustand per DOM-Abwesenheit prüfbar, nicht nur per CSS-Verstecken.
 * Pausiert bei verstecktem Tab (`visibilitychange`, s. util/particles.ts) und räumt beim Unmount
 * (Kampfende/Gegnerwechsel) sauber auf.
 */
function ZoneParticles({
  zoneKey,
  fxLevel,
}: {
  zoneKey: string | null | undefined;
  fxLevel: CombatFxLevel;
}): JSX.Element | null {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const theme = getZoneParticleTheme(zoneKey);
  const active = !!theme && fxLevel !== "off";

  useEffect(() => {
    if (!active || !theme) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const field = createZoneParticleField(canvas, theme, fxLevel);
    return () => field.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, theme, fxLevel]);

  if (!active) return null;
  return <canvas ref={canvasRef} className="zone-particles-canvas" aria-hidden="true" />;
}

/**
 * Arena-Rework (Chef-GO 2026-07-11): Spieler-Buff-Mini-Chips unten links AUF der Arena-Szene —
 * nur Icon + Restsekunden, der volle Item-Name steht im title-Tooltip. Ersetzt die frühere
 * `fighter-buffs`-Zeile (ActiveBuffsBar) im playerFooter, die als Layout-Zeile das Porträt
 * kleingedrückt hat (ActiveBuffsBar selbst bleibt unverändert — CharacterPage nutzt sie weiter).
 */
function BuffChipsOverlay({ buffs }: { buffs: ActiveBuff[] }): JSX.Element | null {
  const { tr } = useI18n();
  if (buffs.length === 0) return null;
  return (
    <div className="fighter-buff-chips">
      {buffs.map((b, i) => {
        const item = content.items[b.itemId];
        const img = item ? getItemImage(item.id) : null;
        const name = item ? tr(item.name) : b.itemId;
        return (
          <span
            key={i}
            className="fighter-buff-chip"
            title={`${name} (${Math.ceil(b.remainingMs / 1000)}s)`}
          >
            <span className="fighter-buff-chip-icon" aria-hidden="true">
              {img ? <img loading="lazy" decoding="async" src={img} alt="" className="pixelart" /> : (item?.icon ?? "✨")}
            </span>
            <span className="fighter-buff-chip-time">{Math.ceil(b.remainingMs / 1000)}s</span>
          </span>
        );
      })}
    </div>
  );
}

function Fighter(props: FighterProps): JSX.Element {
  const { t } = useI18n();
  const showMana = props.manaMax !== undefined && props.manaMax > 0;
  // Mana depleted = pool is empty → hero fights weakly with a staff until it refills
  const manaEmpty = showMana && (props.manaCur ?? 0) === 0;
  // Ward (Stoff-Klassenschicht, Spec §8): dritte Leiste NUR bei maxWard > 0 (Magier/Stoff-Träger).
  // Platte/Leder liefern wardMax===0 → gar keine Leiste (kein leerer Slot, kein Layout-Sprung).
  const showWard = props.wardMax !== undefined && props.wardMax > 0;
  const wardEmpty = showWard && (props.wardCur ?? 0) <= 0;
  const figureRef = useRef<HTMLDivElement | null>(null);
  // Task #296 P0: getrennte Refs für Recoil (nur die Kunst-Ebene, NICHT figureRef — figureRef trägt
  // schon die Angreifer-Lunge/Cast-Transform, s. Plan-Risiko §5 „Überlappende Animationen") und den
  // Treffer-Flash (reiner Opacity-Overlay, komplett transform-frei).
  const artRef = useRef<HTMLDivElement | null>(null);
  const flashRef = useRef<HTMLDivElement | null>(null);
  // Kampf-Juice §1b: dritter Wrapper NUR für den Scale-Punch/Weißblitz am Getroffenen — artRef
  // trägt bereits den Recoil-translateX, figureRef die Lunge (dieselbe Kollisions-Trennung).
  const punchRef = useRef<HTMLDivElement | null>(null);
  // Arena-Rework: Stat-Zeile hinter „Details"-Toggle (Session-Zustand reicht, kein Persistieren).
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Kampf-Effekte-Stufe: "full" erlaubt Bewegung (Lunge/Cast/Recoil/Sacken), "reduced" nur Flash-/
  // Farbeffekte, "off" nichts Neues. Default "full" falls kein Wert durchgereicht wurde.
  const fx = props.fxLevel ?? "full";
  const fxMotion = fx === "full";
  const fxFlash = fx !== "off";

  // Recharge-Feedback: kurzer Aufblitz-Puls, sobald der Ward-Pool steigt (Cast lädt ihn auf).
  // Vergleich gegen den vorherigen Wert per Ref — beim allerersten Render (prev===null) kein
  // Puls, sonst würde jeder Kampfstart/Seitenwechsel fälschlich "aufgeladen" wirken.
  const prevWardRef = useRef<number | null>(null);
  const [wardPulse, setWardPulse] = useState(false);
  useEffect(() => {
    if (props.wardCur === undefined) return;
    const prev = prevWardRef.current;
    prevWardRef.current = props.wardCur;
    if (prev !== null && props.wardCur > prev && fxFlash) {
      setWardPulse(true);
      const timer = window.setTimeout(() => setWardPulse(false), 420);
      return () => window.clearTimeout(timer);
    }
  }, [props.wardCur, fxFlash]);

  // Bei jedem Angriff (Nonce-Wechsel) die Lunge imperativ abspielen — auf der Figur-Box
  // (immer vorhanden, auch wenn ein Monster noch kein Bild hat). Spielt zuverlässig jedes Mal.
  // Magier erhalten statt der physischen Lunge die arcane Cast-Animation.
  // Task #296: reine Bewegung → nur in der "full"-Stufe (Reduziert/Aus behalten nur Flashes).
  useEffect(() => {
    if (!props.attackNonce || !fxMotion) return;
    const el = figureRef.current;
    if (!el || typeof el.animate !== "function") return;
    if (!props.enemy && props.isCasting) {
      el.animate(CAST_KEYFRAMES, { duration: 480, easing: "ease-in-out" });
    } else {
      el.animate(props.enemy ? LUNGE_LEFT : LUNGE_RIGHT, { duration: 400, easing: "ease-out" });
    }
  }, [props.attackNonce, props.enemy, props.isCasting, fxMotion]);

  // Task #296 P0 §1.1/§1.2 — Treffer-Feedback am GETROFFENEN: Flash (Opacity-Overlay, immer
  // transform-frei) + Recoil (Translate auf `artRef`, NICHT `figureRef`, s. Ref-Kommentar oben).
  // Crit bekommt einen kräftigeren/goldenen Flash + etwas stärkeren Recoil (Amplitude/Dauer),
  // aber keinen zusätzlichen Screen-Effekt (Chef-Leitplanke: kein Cartoon-Pop, s. Plan §1.2).
  useEffect(() => {
    if (!props.hitNonce || !fxFlash) return;
    const crit = !!props.hitCrit;
    const flashEl = flashRef.current;
    if (flashEl && typeof flashEl.animate === "function") {
      flashEl.classList.toggle("crit", crit);
      flashEl.animate(
        crit
          ? [{ opacity: 0 }, { opacity: 0.85, offset: 0.3 }, { opacity: 0 }]
          : [{ opacity: 0 }, { opacity: 0.5, offset: 0.3 }, { opacity: 0 }],
        { duration: crit ? 200 : 130, easing: "ease-out" },
      );
    }
    if (fxMotion) {
      const artEl = artRef.current;
      if (artEl && typeof artEl.animate === "function") {
        const amp = crit ? 16 : 10;
        const dir = props.enemy ? amp : -amp; // vom Gegner weg geschleudert
        artEl.animate(
          [
            { transform: "translateX(0)" },
            { transform: `translateX(${dir}px)`, offset: 0.3 },
            { transform: "translateX(0)" },
          ],
          { duration: crit ? 220 : 160, easing: "ease-out" },
        );
      }
      // Kampf-Juice §1b: Hit-Stop-Punch (Scale 1.0→1.04→1.0 + Weißblitz mit ~60ms Plateau) auf
      // dem eigenen Punch-Wrapper — reine Bewegung, daher nur in der "full"-Stufe (der reine
      // Opacity-Flash oben deckt "reduced" bereits ab).
      const punchEl = punchRef.current;
      if (punchEl && typeof punchEl.animate === "function") {
        punchEl.animate(hitPunchKeyframes(crit), { duration: crit ? 180 : 150, easing: "ease-out" });
      }
    }
  }, [props.hitNonce, props.hitCrit, props.enemy, fxFlash, fxMotion]);

  // Task #296 P0 §1.5 — Status-Rand-Puls: kurzer Kartenrand-Puls in der Statusfarbe bei NEU
  // angewandtem Status (nicht bei Refresh — s. Trigger-Stelle in `Battle`). Mirrors das bestehende
  // `wardPulse`-Muster (lokaler Boolean-State + setTimeout-Cleanup, s.o.) statt WAAPI, da Status-
  // Events selten genug sind, dass ein CSS-Klassen-Toggle hier ausreicht.
  const [statusPulse, setStatusPulse] = useState<StatusType | null>(null);
  useEffect(() => {
    if (!props.statusFxNonce || !props.statusFxType || !fxFlash) return;
    setStatusPulse(props.statusFxType);
    const timer = window.setTimeout(() => setStatusPulse(null), 620);
    return () => window.clearTimeout(timer);
  }, [props.statusFxNonce, fxFlash]);

  // Task #296 P0 §1.3 — Kill-Flourish: "dying" ersetzt "cooldown-blur" für die ersten ~650ms des
  // Kill-Cooldowns (Timing-Abstimmung s. `Battle`/`triggerDying`), danach übernimmt der bestehende
  // Blur nahtlos. "reduced" behält Entsättigung, aber ohne das Absacken (fx-no-motion-Variante).
  const dyingActive = !!props.dying && fxFlash;
  const cooldownBlurActive = !!props.dimmed && !dyingActive;

  return (
    <div
      className={`fighter${props.enemy ? " enemy" : ""}${dyingActive ? " dying" : ""}${dyingActive && !fxMotion ? " fx-no-motion" : ""}${cooldownBlurActive ? " cooldown-blur" : ""}${statusPulse ? ` status-pulse status-pulse-${statusPulse}` : ""}`}
    >
      {/* Arena-Rework (Chef-GO 2026-07-11): kein eigenes Panel/Zonenbild mehr pro Kämpfer — die
          Figur steht direkt in der gemeinsamen Arena-Szene (Zonenbild/Drift/Partikel/Holzrahmen
          liegen EINMAL auf `.battle-arena`, s. Battle), darunter eine kompakte Nameplate statt
          des früheren Panel-Stapels. Refs/WAAPI-Anbindung (figureRef/artRef/flashRef) 1:1 erhalten. */}
      <div className="fighter-scene">
        {/* Defense-Badge (Warded/Evasive/Armored) ENTFERNT (Chef 2026-07-11): brauchen wir bei den
            Mobs nicht — NICHT wieder einführen. */}
        {/* Status/Debuffs als Overlay oben rechts an der Figur (Ecken-Disziplin Arena-Rework:
            Debuffs ↗, Spieler-Buffs ↙, Pet ↘) — nimmt keinen Layout-Platz, Bildgröße bleibt stabil. */}
        {props.effects && props.effects.length > 0 && (
          <div className="fighter-effects fighter-effects-overlay">
            {props.effects.map((e, i) => (
              <span
                key={i}
                className="effect-badge"
                title={`${t(`status.${e.type}`)} — ${t(`status.${e.type}.desc`)} (${Math.ceil(e.remainingMs / 1000)}s)`}
              >
                {renderEffectIcon(e.type)} {Math.ceil(e.remainingMs / 1000)}s
              </span>
            ))}
          </div>
        )}
        {props.buffChips}
        {props.companionSprite}
        <div className="fighter-figure" ref={figureRef}>
          {/* Task #296 P0: `fighter-figure-art` trägt NUR die Kunst (Recoil-Ziel), getrennt von
              `figureRef` (Lunge/Cast/Dying-Sacken) — vermeidet Transform-Kollisionen (Plan §5). */}
          <div className="fighter-figure-art" ref={artRef}>
            {/* Kampf-Juice §1b: eigener Punch-Wrapper (Scale-Punch/Weißblitz am Getroffenen) —
                transform-frei ggü. Recoil (artRef) und Lunge (figureRef), s. hitPunchKeyframes. */}
            <div className="fighter-figure-punch" ref={punchRef}>
              {props.imgSrc ? (
                <img src={props.imgSrc} alt={props.name} />
              ) : (
                <span className="portrait-silhouette">👤</span>
              )}
            </div>
          </div>
          {/* Reiner Opacity-Overlay (kein Transform) für den Treffer-Flash — Farbe/Stärke per
              `.crit`-Klasse (Task #296 P0 §1.1/§1.2), imperativ per WAAPI angestoßen. */}
          <div className="hit-flash-overlay" ref={flashRef} />
          <div className="floaters">
            {props.floaters.map((f) => {
              if (f.proc) {
                return (
                  <span
                    key={f.id}
                    className="dmg-number proc"
                    style={{ left: `calc(50% + ${f.x}px)` }}
                  >
                    <span className="dmg-dot-icon">{renderEffectIcon(f.status ?? "bleed")}</span>
                    {f.label}
                  </span>
                );
              }
              if (f.wardAbsorb) {
                // Voll absorbiert (event-genauer Zweig, `f.label` gesetzt): Textlabel „Absorbiert"
                // statt der nackten Zahl (Chef-Fix "Hollow Choir: I miss 9/10"); teilweise absorbiert
                // (Pool-Delta-Fallback ODER event-genau mit amount>0): bleibt die „-N"-Zahl.
                return (
                  <span
                    key={f.id}
                    className={`dmg-number dot ward-absorb${f.label ? " ward-absorb-full" : ""}`}
                    style={{ left: `calc(50% + ${f.x}px)` }}
                  >
                    <span className="dmg-dot-icon">{statIcon("ward")}</span>
                    {f.label ?? `-${formatStat(f.amount)}`}
                  </span>
                );
              }
              if (f.lifesteal) {
                return (
                  <span
                    key={f.id}
                    className="dmg-number dot lifesteal"
                    style={{ left: `calc(50% + ${f.x}px)` }}
                  >
                    <span className="dmg-dot-icon">{renderEffectIcon(f.status ?? "bleed")}</span>
                    +{formatStat(f.amount)}
                  </span>
                );
              }
              if (f.dot) {
                return (
                  <span
                    key={f.id}
                    className={`dmg-number dot dot-${f.status ?? "burn"}`}
                    style={{ left: `calc(50% + ${f.x}px)` }}
                  >
                    <span className="dmg-dot-icon">{renderEffectIcon(f.status ?? "burn")}</span>
                    {formatStat(f.amount)}
                  </span>
                );
              }
              if (f.xp) {
                return (
                  <span
                    key={f.id}
                    className="dmg-number xp-drop"
                    style={{ left: `calc(50% + ${f.x}px)` }}
                  >
                    {XP_ICON_URL && (
                      <span className="dmg-dot-icon">
                        <img loading="lazy" decoding="async" src={XP_ICON_URL} alt="" className="ui-icon" />
                      </span>
                    )}
                    +{f.amount} XP
                  </span>
                );
              }
              if (f.miss) {
                return (
                  <span
                    key={f.id}
                    className="dmg-number miss"
                    style={{ left: `calc(50% + ${f.x}px)` }}
                  >
                    0
                  </span>
                );
              }
              const cls = f.heal
                ? "dmg-number heal"
                : f.crit
                  ? "dmg-number crit"
                  : f.magic
                    ? "dmg-number magic"
                    : "dmg-number";
              // Task #220: Quell-Icon vor der Heilzahl (Trank/Food-Item-Icon, sonst Emoji-Fallback) —
              // auf einen Blick erkennbar, ob die Heilung von Trank/Food/Lebensraub/Kill/Effekt kam.
              const healIcon = f.heal ? healSourceIcon(f.healSource, f.healItemId) : null;
              return (
                <span
                  key={f.id}
                  className={cls}
                  style={{ left: `calc(50% + ${f.x}px)` }}
                >
                  {healIcon && <span className="heal-source-icon">{healIcon}</span>}
                  {f.heal ? `+${formatStat(f.amount)}` : `${f.amount}${f.crit ? "!" : ""}`}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* Arena-Rework: kompakte Nameplate am Fuß der Figur — Name/Level/Sub (+Drops-Box beim
          Gegner), HP/Mana/Ward/Timer-Balken (dieselben Bar-Komponenten/Klassen wie zuvor),
          Prognose-Chip + „Details"-Toggle für die frühere 8-teilige Stat-Zeile. */}
      <div className="fighter-nameplate">
        <div className="fighter-header">
          <div className="fighter-header-main">
            <div className="fighter-name">
              {props.name}
              {props.level !== undefined && (
                <span className="fighter-level-badge">{props.level}</span>
              )}
              {props.regen ? (
                <span className="trait-badge" title={props.regenLabel}>
                  {REGEN_ICON_URL
                    ? <img loading="lazy" decoding="async" src={REGEN_ICON_URL} alt="" className="ui-icon trait-badge-icon" />
                    : "♻"}
                </span>
              ) : null}
              {props.enraged && (
                <span className="enrage-badge" title={props.enrageLabel}>
                  <EnrageIcon size={20} />
                </span>
              )}
            </div>
            <div className="fighter-sub muted">
              <span>{props.sub}</span>
            </div>
          </div>
          {props.subExtra}
        </div>
        <Bar
          pct={(props.hpCur / props.hpMax) * 100}
          kind={props.hpKind}
          label={
            <>
              {statIcon("hp")} {formatNum(Math.max(0, Math.round(props.hpCur)))} / {formatStat(props.hpMax)}
            </>
          }
        />
        {showMana && (
          <Bar
            pct={((props.manaCur ?? 0) / (props.manaMax ?? 1)) * 100}
            kind={manaEmpty ? "mana depleted" : "mana"}
            label={
              <span className={manaEmpty ? "cbar-label-dim" : undefined}>
                ✦ {formatNum(Math.round(props.manaCur ?? 0))} / {formatStat(props.manaMax ?? 0)}
              </span>
            }
          />
        )}
        {showWard && (
          <Bar
            pct={((props.wardCur ?? 0) / (props.wardMax ?? 1)) * 100}
            kind={`ward${wardEmpty ? " depleted" : ""}${wardPulse ? " pulse" : ""}`}
            // Gegner-Ward-Balken (Chef-Fix "Hollow Choir: I miss 9/10"): eigener Leer-Hinweis statt
            // des Spieler-Texts „casten zum Aufladen" — der Gegner castet nicht selbst nach, der
            // Ward-Pool ist für diesen Encounter einfach durchbrochen.
            title={wardEmpty ? t(props.enemy ? "combat.enemyWardEmptyHint" : "combat.wardEmptyHint") : undefined}
            label={
              <span className={wardEmpty ? "cbar-label-dim" : undefined}>
                {statIcon("ward")} {formatNum(Math.round(props.wardCur ?? 0))} / {formatStat(props.wardMax ?? 0)}
              </span>
            }
          />
        )}
        {/* Schwung-Timer: läuft mit ~10Hz-Renderrhythmus glatt runter (0,1s-Schritte passen exakt
            auf die eine Nachkommastelle) — kein zusätzliches rAF-Interpolations-Gerüst nötig. */}
        <Bar
          pct={props.timerPct}
          kind="timer"
          label={`${formatSeconds1(Math.max(0, props.timerRemainingSec))}s`}
        />
        {(props.hitChance || props.details || props.footer) && (
          <div className="fighter-meta-row">
            {props.hitChance && (
              <span className="fighter-prognosis" title={props.hitChance.label}>
                {props.hitChance.icon} {Math.round(props.hitChance.pct * 100)}%
              </span>
            )}
            {props.footer}
            {props.details && (
              <button
                type="button"
                className={`fighter-details-toggle${detailsOpen ? " open" : ""}`}
                onClick={() => setDetailsOpen((o) => !o)}
              >
                {t("combat.details")} <span aria-hidden="true">{detailsOpen ? "▾" : "▸"}</span>
              </button>
            )}
          </div>
        )}
        {detailsOpen && props.details && <div className="fighter-details">{props.details}</div>}
      </div>
    </div>
  );
}

/**
 * Kill-Summary-Karte: erscheint über dem geblurrten Gegner-Bereich während der 3s-Kill-Pause
 * (`KILL_COOLDOWN_MS`) und zeigt, was DIESER Kill an XP/Loot/Gold vergeben hat. Läuft automatisch
 * mit dem Cooldown ab (`lastKill.expiresInMs`, sanftes Fade in den letzten ~350ms) — ein Klick
 * blendet nur die Karte früher aus, der Cooldown selbst läuft unbeeinflusst weiter.
 * Nicht modal: keine Overlay-Sperre, der Rest der Kampfseite (Spieler-Seite, Flucht-Button) bleibt
 * bedienbar. Wird NUR innerhalb von Battle/CombatPage gemountet, taucht also nirgendwo sonst auf.
 */
function KillSummaryCard({ lastKill }: { lastKill: LastKillSummary }): JSX.Element {
  const { t, tr } = useI18n();
  const [dismissed, setDismissed] = useState(false);
  const prevKillRef = useRef<LastKillSummary | null>(null);

  // Neuer Kill (neue Objekt-Referenz) → Karte wieder einblenden, auch wenn die vorherige
  // manuell weggeklickt wurde.
  useEffect(() => {
    if (lastKill !== prevKillRef.current) setDismissed(false);
    prevKillRef.current = lastKill;
  }, [lastKill]);

  const monster = content.monsters[lastKill.monsterId];
  const monsterName = monster ? tr(monster.name) : lastKill.monsterId;
  const xpRows = Object.entries(lastKill.xpBySkill)
    .filter(([, xp]) => xp > 0)
    .sort((a, b) => b[1] - a[1]);
  const seconds = Math.max(1, Math.ceil(lastKill.expiresInMs / 1000));
  const pct = (lastKill.expiresInMs / KILL_COOLDOWN_MS) * 100;

  // Letzte ~350ms vor Ablauf: Karte sanft ausblenden statt hart zu verschwinden, wenn die Engine
  // `lastKill` im nächsten Tick auf undefined setzt.
  const FADE_MS = 350;
  const opacity = dismissed ? 0 : Math.max(0, Math.min(1, lastKill.expiresInMs / FADE_MS));

  return (
    <div
      className={`kill-summary-card${dismissed ? " dismissed" : ""}`}
      style={{ opacity }}
      role="status"
      onClick={() => setDismissed(true)}
    >
      <div className="kill-summary-title">{t("combat.kill").replace("{name}", monsterName)}</div>

      <div className="kill-summary-body">
        {xpRows.length > 0 && (
          <div className="kill-summary-col kill-summary-col-xp">
            <span className="kill-summary-section-label">{t("skill.t.xp")}</span>
            <div className="kill-summary-xp">
              {xpRows.map(([skillId, xp]) => {
                const skill = content.skills[skillId];
                const icon = getSkillIcon(skillId) ?? getSidebarIcon(skillId);
                return (
                  <div key={skillId} className="kill-summary-xp-row">
                    <span className="kill-summary-xp-icon">
                      {icon
                        ? <img loading="lazy" decoding="async" src={icon} alt="" className="ui-icon" />
                        : "✦"}
                    </span>
                    <span className="kill-summary-xp-name">{skill ? tr(skill.name) : skillId}</span>
                    <span className="kill-summary-xp-amount">+{formatStat(xp)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {(lastKill.loot.length > 0 || lastKill.gold > 0) && (
          <div className="kill-summary-col kill-summary-col-rewards">
            {lastKill.loot.length > 0 && (
              <div className="kill-summary-loot">
                <span className="kill-summary-section-label">{t("combat.killSummary.loot")}</span>
                <div className="kill-summary-loot-grid">
                  {lastKill.loot.map((l, i) => (
                    <span key={`${l.itemId}-${i}`} className="kill-summary-loot-item">
                      <ItemCell itemId={l.itemId} qty={l.qty} />
                    </span>
                  ))}
                </div>
              </div>
            )}
            {lastKill.gold > 0 && (
              <div className="kill-summary-gold-row">
                <span className="kill-summary-section-label">{t("stats.gold")}</span>
                <span className="kill-summary-gold">{statIcon("gold")} +{formatNum(lastKill.gold)}</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div
        className="kill-summary-countdown"
        title={t("combat.killSummary.respawn").replace("{s}", String(seconds))}
        aria-label={t("combat.killSummary.respawn").replace("{s}", String(seconds))}
      >
        <div className="kill-summary-countdown-fill" style={{ transform: `scaleX(${Math.max(0, Math.min(100, pct)) / 100})` }} />
      </div>
    </div>
  );
}

function Battle({
  monster,
  dockCollapsed,
  onToggleDock,
  recordCollapsed,
  onToggleRecord,
  onShowEnemyList,
}: {
  monster: MonsterDef;
  dockCollapsed: boolean;
  onToggleDock: () => void;
  recordCollapsed: boolean;
  onToggleRecord: () => void;
  /** Spieler-Report 1.0.2: blendet die Gegnerliste ein, OHNE den Kampf zu beenden. */
  onShowEnemyList: () => void;
}): JSX.Element {
  // Task #318 §3 (Selector-Migration, Backlog-Punkt aus ui-audit/perf-combat-audit.mjs JSDoc "die
  // vollständige Auflösung ... bleibt bewusst ein eigener, größerer Task"): Battle konsumierte
  // bisher `useGameState()` (Plain-Context/LiveContext), während die bereits migrierte Chrome
  // (Sidebar/TopBar/GameStats/EliteMiniWindow) `useGameSelector`/`useSyncExternalStore` auf
  // demselben mutierbaren State-Objekt nutzt — dieser MIX erzeugt laut Audit-Skript einen
  // zusätzlichen, fast kostenlosen "Echo"-Commit GENAU an dieser Context/Selector-Grenze (React
  // 18s Konsistenz-Prüfung zwischen den beiden Subscription-Mechanismen). Fix: Battle hängt sich
  // jetzt selbst über `useGameSelector` an denselben Tick-Puls wie die migrierte Chrome — als Gate
  // bewusst `state.totalTicks` (ein einzelnes Primitive, `Object.is`-Vergleich reicht, kein Tupel
  // nötig): Battle MUSS bei jedem Tick neu rendern (HP-Balken/Timer/Statuseffekt-Countdowns/Log
  // ändern sich laufend während eines laufenden Kampfes) — identischer 10-Hz-Takt wie bisher über
  // LiveContext, nur jetzt über denselben Mechanismus wie der Rest des Baums. Der volle State wird
  // danach NICHT aus dem Selector zurückgegeben (Footgun #1 im GameContext.tsx-JSDoc: eingefrorene
  // Objekt-Referenz) — `useGetGameState()` liefert stattdessen einen nicht-abonnierenden Getter,
  // der hier im Render-Body den vollen, aktuellen State holt (läuft dann nur noch so oft wie dieser
  // jetzt vereinheitlichte Re-Render selbst, s. useGameSelector-JSDoc "GATE nutzen"-Muster,
  // identisch zu App.tsx/Sidebar.tsx). Rein lese-seitig — Kampf-Verhalten/Determinismus unberührt.
  useGameSelector((s) => s.totalTicks);
  const getState = useGetGameState();
  const state = getState()!;
  const { t, tr } = useI18n();
  const c = state.character;
  const cs = state.combat;
  const monsterName = tr(monster.name);
  const stats = computeStats(state, content);
  // Task #305: Trefferchancen-Prognose beider Seiten gegen DIESES Monster, einmal berechnet und
  // in beide Kämpfer-Fußzeilen (playerFooter/enemyFooter) gereicht — dezente Ergänzung der
  // bestehenden Stat-Zeile, kein eigener Kasten.
  const prognosis = combatPrognosis(stats, monster);
  const lvl = (id: string): number => levelFromXp(state.skills[id]?.xp ?? 0);
  const meleeSub = t("combat.meleeSub")
    .replace("{attack}", String(lvl("attack")))
    .replace("{power}", String(lvl("power")))
    .replace("{defence}", String(lvl("defence")));
  const enraged = !!(monster.enrage && cs.enemyHp / monster.maxHp <= monster.enrage.belowHpPct);
  // Verbleibende Zeit bis zum nächsten Schlag je Seite (für den Countdown-Text im Timer-Balken).
  const playerTimerRemainingSec = Math.max(0, (stats.attackIntervalMs - cs.playerTimerMs) / 1000);
  const enemyTimerRemainingSec = Math.max(0, (monster.attackIntervalMs - cs.enemyTimerMs) / 1000);
  // Kill-Cooldown (Engine-vertraglich, siehe combat.ts beginKillCooldown): >0 ⇒ der Gegner steht
  // zwar schon voll geheilt da, aber beide Seiten pausieren. UI: Gegner-Bereich blurren + Summary zeigen.
  const inCooldown = (cs.cooldownRemainingMs ?? 0) > 0;
  // Dungeon-Rework-Spec §5.6: Encounter-Leiste/Wellen-Ansage/Boss-Intro brauchen den Dungeon vor
  // den Hooks unten (JS-const, keine Hook-Reihenfolge-Sorge) — vorher erst kurz vorm `return` gesetzt.
  const dungeon = cs.dungeonId ? content.dungeons.find((d) => d.id === cs.dungeonId) : null;
  // Boss-Intro-Fenster (§5.1.2/§5.1.5): die LETZTE Welle ist bereits im State (cs.monsterId zeigt
  // schon auf den Boss), aber der Wellen-Cooldown läuft die volle Atempause (PRE_BOSS_BREATHER_MS =
  // 8s statt der üblichen 2s KILL_COOLDOWN_MS) — kein neues Engine-Feld, reine Ableitung aus dem
  // vertraglichen cooldownRemainingMs+encounterIndex (kombinierte JSDoc onEnemyDefeated/combat.ts).
  //
  // Fun-Sweep FF (dungeons-grete.md Befund 5 / Top-3 #3, „Thron braucht den größten Auftritt"):
  // 1-Wellen-Dungeons (z.B. Drazhan/behind_the_throne) haben laut `DungeonDef.chest`-JSDoc NIE
  // einen Wellen-Übergang ("bei 1 Welle gibt es keinen Übergang → Truhe rollt nie") — `startDungeon`
  // (engine/dungeon.ts) setzt beim frischen Betreten daher NIE `cooldownRemainingMs`, also griffe
  // die obige Bedingung (die an `inCooldown` hängt) für Wellen-Index 0 nie. UI-only Erweiterung
  // (kein Engine-Eingriff möglich/nötig): bei FRISCHEM Eintritt in einen 1-Wellen-Dungeon (Battle
  // remountet bei jedem neuen Kampf/Dungeon-Eintritt, s. CombatPage `monster`-Gate) einmalig
  // dasselbe große Intro-Fenster zeigen wie bei Mehrwellen-Dungeons vor der Boss-Welle — Dauer
  // spiegelt PRE_BOSS_BREATHER_MS zur dramaturgischen Konsistenz. Lazy-Initializer liest den
  // Mount-Zustand genau einmal; der Timer läuft unabhängig vom (hier nie eintretenden) Engine-
  // Cooldown ab.
  // Sweep-Fix-Welle B, Fix 2f (Dungeon-Bot KLEIN 8): der Lazy-Initializer lief bisher NUR auf
  // "dungeon.encounters.length === 1 && encounterIndex === 0" — das trifft beim frischen Eintritt
  // zu, aber GENAUSO beim Laden eines Saves, der mitten in genau diesem 1-Wellen-Boss-Kampf steht
  // (Battle remountet bei jedem Seitenaufruf/App-Boot neu, s. Komponenten-JSDoc oben). Ergebnis:
  // das Intro spielte beim Laden erneut ab, obwohl der Kampf längst läuft. Zusätzliche Frisch-
  // Prüfung gegen genau die Felder, die `startDungeon` (engine/dungeon.ts) bei einem ECHTEN neuen
  // Eintritt setzt (enemyHp = monster.maxHp voll, beide Timer 0, kills 0) — bei einem geladenen
  // Kampf mitten im Geschehen weicht mindestens eines davon ab, der synthetische Intro-Zweig bleibt
  // dann aus. Kein Engine-Eingriff nötig (rein clientseitige Mount-Heuristik).
  const [singleWaveBossIntro, setSingleWaveBossIntro] = useState(
    () => !!(
      dungeon &&
      dungeon.encounters.length === 1 &&
      cs.encounterIndex === 0 &&
      cs.enemyHp === monster.maxHp &&
      cs.playerTimerMs === 0 &&
      cs.enemyTimerMs === 0 &&
      cs.kills === 0
    ),
  );
  useEffect(() => {
    if (!singleWaveBossIntro) return;
    const timer = window.setTimeout(() => setSingleWaveBossIntro(false), PRE_BOSS_BREATHER_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const inBossIntro = !!(
    (dungeon?.chest && cs.encounterIndex === dungeon.encounters.length - 1 && inCooldown) ||
    singleWaveBossIntro
  );

  // Task #296 P0 §1.6 — Kampf-Effekte-Stufe: OS `prefers-reduced-motion` übersteuert IMMER
  // zusätzlich auf "off", unabhängig vom gespeicherten Options-Wert. Einmal pro Battle-Mount
  // berechnet (Plan-Vorgabe) — spart wiederholte matchMedia/localStorage-Reads auf jedem Tick.
  const prefersReducedMotion = useMemo(
    () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
    [],
  );
  const fxLevel: CombatFxLevel = useMemo(() => {
    if (prefersReducedMotion) return "off";
    return getCombatFxLevel();
  }, [prefersReducedMotion]);
  // Reine Bewegung (Skalier-/Aufstieg-Keyframes der Wellen-Ansage/des Boss-Intros) nur bei "full" —
  // "reduced"/"off" behalten Opacity-Fades, aber keine Transform-Animation (Fighter-Muster oben).
  const fxMotion = fxLevel === "full";

  // Kampfeffekte Welle 1 (Konzept §4) — EIGENE, milde Stufe für die neuen Sprites: "reduziert"
  // (Geschoss + Blut aus, Einschläge/Slashes bleiben) greift auch bei `prefers-reduced-motion`
  // statt komplett zu verschwinden wie das bestehende `fxLevel` (Konzept-Vorgabe, bewusst
  // GROSSZÜGIGER als die App-weite Kampf-Juice-Stufe oben — Arena-Shake/Rune-Ring/Beam/Spark
  // bleiben unverändert an `fxLevel` gebunden und damit bei OS-reduced-motion komplett aus).
  const spriteFxLevel: CombatFxLevel = useMemo(() => {
    const userLevel = getCombatFxLevel();
    if (userLevel === "off") return "off";
    if (prefersReducedMotion || userLevel === "reduced") return "reduced";
    return "full";
  }, [prefersReducedMotion]);

  // Dungeon-Rework-Spec §5.6.2 — Wellen-Ansage: "Welle X/Y — <Name>" beim Wellenwechsel (inkl.
  // dem Auftakt beim Betreten, encounterIndex 0). `cs.dungeonId`/`cs.encounterIndex` sind primitive
  // Werte — ein Effekt, der DIREKT darauf lauscht, feuert exakt bei jeder echten Änderung (kein
  // Snapshot-Ref/totalTicks-Vergleich nötig, anders als die Toast-/Popup-Muster andernorts).
  const [waveAnnounce, setWaveAnnounce] = useState<{ cur: number; total: number; name: string } | null>(null);
  const waveAnnounceTimerRef = useRef<number | null>(null);
  useEffect(() => {
    if (!dungeon) return;
    const meta = dungeon.waveMeta?.[cs.encounterIndex];
    const encMonster = content.monsters[dungeon.encounters[cs.encounterIndex] ?? ""];
    const label = meta?.name ? tr(meta.name) : encMonster ? tr(encMonster.name) : "";
    setWaveAnnounce({ cur: cs.encounterIndex + 1, total: dungeon.encounters.length, name: label });
    if (waveAnnounceTimerRef.current !== null) window.clearTimeout(waveAnnounceTimerRef.current);
    waveAnnounceTimerRef.current = window.setTimeout(() => setWaveAnnounce(null), 3400);
    return () => {
      if (waveAnnounceTimerRef.current !== null) window.clearTimeout(waveAnnounceTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cs.dungeonId, cs.encounterIndex]);

  // Dungeon-Rework-Spec §5.6.3 — Truhen-Flash: einmaliger Loot-Moment beim EINTRITT ins Boss-Intro-
  // Fenster (steigende Flanke von `inBossIntro`, s. Ref-Guard unten) — die Chest-Rows sind server-
  // seitig bereits gerollt (rollDungeonLootTable beim Wellen-Übergang, combat.ts); die Items selbst
  // stehen normal im Log/Inventar, hier nur der kurze visuelle Hinweis "Schatz gefunden!".
  const [chestFlash, setChestFlash] = useState(false);
  const bossIntroSeenRef = useRef(false);
  useEffect(() => {
    if (inBossIntro && !bossIntroSeenRef.current) {
      bossIntroSeenRef.current = true;
      // Nur bei einem ECHTEN Wellen-Übergang flashen (dungeon.chest gesetzt) — die synthetische
      // 1-Wellen-Intro unten (`singleWaveBossIntro`) hat NIE eine Truhe (chest "braucht ≥2 Wellen",
      // s. shared/index.ts DungeonDef.chest-JSDoc), ein Flash dort wäre eine Lüge.
      if (dungeon?.chest) {
        setChestFlash(true);
        const timer = window.setTimeout(() => setChestFlash(false), 1600);
        return () => window.clearTimeout(timer);
      }
    }
    if (!inBossIntro) bossIntroSeenRef.current = false;
  }, [inBossIntro]);

  const [floaters, setFloaters] = useState<Floater[]>([]);
  // Nonce je Seite: jeder Angriff erhöht den Zähler → Fighter spielt die Lunge imperativ ab.
  const [lunge, setLunge] = useState<{ player: number; enemy: number }>({ player: 0, enemy: 0 });
  // Task #296 P0 §1.1/§1.2 — Treffer-Feedback am GETROFFENEN: Nonce + Crit-Flag je Seite (analog
  // `lunge`, aber für die Gegenrichtung — s. Fighter-Kommentar für die Ref-Trennung).
  const [hitFx, setHitFx] = useState<{ player: { n: number; crit: boolean }; enemy: { n: number; crit: boolean } }>({
    player: { n: 0, crit: false },
    enemy: { n: 0, crit: false },
  });
  // Task #296 P0 §1.5 — Status-Rand-Puls: Nonce + zuletzt angewandter Statustyp je Seite.
  const [statusFx, setStatusFx] = useState<{
    player: { n: number; type: StatusType | null };
    enemy: { n: number; type: StatusType | null };
  }>({ player: { n: 0, type: null }, enemy: { n: 0, type: null } });
  // Task #296 P0 §1.3 — Kill-Flourish: kurzes Fenster, in dem die Gegner-Figur entsättigt/absackt,
  // BEVOR der bestehende cooldown-blur übernimmt (s. `triggerDying` + Fighter `dyingActive`).
  const [dying, setDying] = useState(false);
  const dyingTimerRef = useRef<number | null>(null);
  // Task #296 P0 §1.4 — Pet-Ability-Blitz: Nonce + Farb-Bucket (aus `combatAbility.kind`).
  const [petFx, setPetFx] = useState<{ n: number; bucket: PetFxBucket }>({ n: 0, bucket: "control" });
  // Pet-Sprung-Nonce: bei jedem petAbility-Event hochgezählt → Animation wird imperativ ausgelöst.
  const [petLunge, setPetLunge] = useState(0);
  // codex:2026-08-02T12:36:00+02:00 — Adaptive Fortress nutzt rechts den echten Battle Record:
  // voller Kampflog oder ausschließlich echte Loot-/Gold-Ereignisse. Equipment ist bereits im
  // Gear-Tab des Frontline-Docks und wird hier nicht redundant dupliziert.
  const [logTab, setLogTab] = useState<"combat" | "loot">("combat");
  const petSpriteRef = useRef<HTMLDivElement | null>(null);
  // Task #296 P0 §1.4: separater Ref für den Ability-Glow-Overlay (nicht petSpriteRef selbst, das
  // trägt schon den Sprung — dieselbe Trennung wie artRef/flashRef in Fighter, s. dort).
  const petGlowRef = useRef<HTMLDivElement | null>(null);
  const lastSeqRef = useRef<number | null>(null);
  const idRef = useRef(0);

  // ─── Task #333 (Chef-Feature "Kampf-Screen-Ergonomie") ───────────────────────────────────────
  // Loadout-/Log-Panel-Breite + Log-Höhe sind reine Anzeige-Vorlieben (localStorage über
  // util/uiPrefs.ts, kein Save-State) und laufen bewusst NICHT über React-State — während des
  // Drags kein Re-Render-Sturm, der Wert wird per CSS-Custom-Property direkt auf `.battle-main`
  // geschrieben (`--battle-loadout-w`/`--battle-log-w`/`--battle-log-h`, gelesen von
  // `.battle-loadout-col`/`.battle-log-panel` in combat.css) und erst am Drag-Ende persistiert.
  // `panelDimsRef` hält den aktuell GÜLTIGEN Wert (aus localStorage hydriert, dann per Drag
  // fortgeschrieben) — vermeidet localStorage-Reads pro pointermove. Drag-Pattern (dokumentierte
  // EliteMiniWindow-Lektion, s. dortiges JSDoc "Fenster klebt manchmal an der Maus"): Window-
  // Listener (pointermove/pointerup/pointercancel/blur) statt setPointerCapture aufs Element.
  const battleMainRef = useRef<HTMLDivElement | null>(null);
  const logPanelRef = useRef<HTMLDivElement | null>(null);
  const panelDragCleanupRef = useRef<(() => void) | null>(null);
  const panelDimsRef = useRef<{ loadoutW: number; logW: number; logH: number | null }>({
    loadoutW: COMBAT_LOADOUT_WIDTH_DEFAULT,
    logW: COMBAT_LOG_WIDTH_DEFAULT,
    logH: null,
  });

  const applyPanelVars = (): void => {
    const el = battleMainRef.current;
    if (!el) return;
    const { loadoutW, logW, logH } = panelDimsRef.current;
    el.style.setProperty("--battle-loadout-w", `${loadoutW}px`);
    el.style.setProperty("--battle-log-w", `${logW}px`);
    if (logH === null) el.style.removeProperty("--battle-log-h");
    else el.style.setProperty("--battle-log-h", `${logH}px`);
  };

  // Persistierte Maße VOR dem ersten Paint anwenden (useLayoutEffect statt useEffect, Muster
  // Sidebar.tsx) — sonst blitzen die Panels kurz in den CSS-Default-Maßen auf.
  useLayoutEffect(() => {
    panelDimsRef.current = {
      loadoutW: getCombatLoadoutWidth(),
      logW: getCombatLogWidth(),
      logH: getCombatLogHeight(),
    };
    applyPanelVars();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Unmount mitten im Zug (z.B. Kampf endet während des Ziehens): nur Listener abräumen, nichts
  // persistieren (analog EliteMiniWindow.tsx dragCleanupRef-Kommentar).
  useEffect(() => () => panelDragCleanupRef.current?.(), []);

  /** Gemeinsames Drag-Grundgerüst für beide Panel-Handles — s. Kommentar oben für die volle
   *  Begründung des Musters. `onMove` bekommt das Delta zur Startposition (px), `onSettle` läuft
   *  genau einmal am Ende (pointerup/pointercancel/blur) und persistiert. */
  const beginPanelDrag = (
    e: ReactPointerEvent<HTMLDivElement>,
    onMove: (dx: number, dy: number) => void,
    onSettle: () => void,
  ): void => {
    if (e.button !== 0) return;
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const pointerId = e.pointerId;
    const handleEl = e.currentTarget;
    handleEl.classList.add("battle-panel-resize--dragging");

    const removeListeners = (): void => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerEnd);
      window.removeEventListener("pointercancel", onPointerEnd);
      window.removeEventListener("blur", onWindowBlur);
      handleEl.classList.remove("battle-panel-resize--dragging");
      panelDragCleanupRef.current = null;
    };
    const onPointerMove = (ev: PointerEvent): void => {
      if (ev.pointerId !== pointerId) return;
      onMove(ev.clientX - startX, ev.clientY - startY);
    };
    const onPointerEnd = (ev: PointerEvent): void => {
      if (ev.pointerId !== pointerId) return;
      removeListeners();
      onSettle();
    };
    const onWindowBlur = (): void => {
      removeListeners();
      onSettle();
    };
    panelDragCleanupRef.current = removeListeners;
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerEnd);
    window.addEventListener("pointercancel", onPointerEnd);
    window.addEventListener("blur", onWindowBlur);
  };

  /** Rand-Handle rechts am Loadout-Panel — Breite ziehen (Auftrag #2, nur Breite). */
  const handleLoadoutResizeStart = (e: ReactPointerEvent<HTMLDivElement>): void => {
    const startWidth = panelDimsRef.current.loadoutW;
    beginPanelDrag(
      e,
      (dx) => {
        panelDimsRef.current.loadoutW = Math.min(
          COMBAT_LOADOUT_WIDTH_MAX,
          Math.max(COMBAT_LOADOUT_WIDTH_MIN, startWidth + dx),
        );
        applyPanelVars();
      },
      () => setCombatLoadoutWidth(panelDimsRef.current.loadoutW),
    );
  };

  /** Doppelklick auf den Loadout-Handle = Reset auf den Default (250px). */
  const handleLoadoutResizeReset = (): void => {
    panelDimsRef.current.loadoutW = COMBAT_LOADOUT_WIDTH_DEFAULT;
    applyPanelVars();
    setCombatLoadoutWidth(COMBAT_LOADOUT_WIDTH_DEFAULT);
  };

  /** Eck-Handle unten links am Log-Panel — zieht Breite UND Höhe gleichzeitig (Auftrag #1: „wenn
   *  das Layout es sinnvoll hergibt, auch Breite"). Der Handle sitzt an der Ecke, die sich beim
   *  Größenändern tatsächlich bewegt: das Panel ist die letzte Grid-Spalte (rechter Rand bleibt
   *  fix am Container-Rand, mehr Breite wächst nach LINKS) und die einzige Zeile (oberer Rand
   *  bleibt fix, mehr Höhe wächst nach UNTEN) — daher `logW = startWidth − dx` (nach links ziehen
   *  = dx negativ = breiter) und `logH = startHeight + dy` (nach unten ziehen = höher). */
  const handleLogResizeStart = (e: ReactPointerEvent<HTMLDivElement>): void => {
    const startWidth = panelDimsRef.current.logW;
    // Ohne bisherigen Override (logH === null) ist die TATSÄCHLICHE Höhe die volle Zeilenhöhe
    // (CSS-Fallback `height:100%`) — reale Pixelgröße per getBoundingClientRect messen, damit der
    // erste Zug nicht von einem falschen (z.B. 300px-Default-)Startwert aus springt.
    const startHeight = panelDimsRef.current.logH ?? logPanelRef.current?.getBoundingClientRect().height ?? 300;
    const maxHeightPx = window.innerHeight * COMBAT_LOG_HEIGHT_MAX_VH_FACTOR;
    beginPanelDrag(
      e,
      (dx, dy) => {
        panelDimsRef.current.logW = Math.min(COMBAT_LOG_WIDTH_MAX, Math.max(COMBAT_LOG_WIDTH_MIN, startWidth - dx));
        panelDimsRef.current.logH = Math.min(maxHeightPx, Math.max(COMBAT_LOG_HEIGHT_MIN, startHeight + dy));
        applyPanelVars();
      },
      () => {
        setCombatLogWidth(panelDimsRef.current.logW);
        setCombatLogHeight(panelDimsRef.current.logH);
      },
    );
  };

  /** Chef-Nachschlag 24.07. („Log-Fenster ist nicht draggable"): Der 16px-Eck-Griff allein war
   *  zu leicht zu verfehlen — zusätzlich die GANZE linke Kante (nur Breite) und die GANZE untere
   *  Kante (nur Höhe) als Greifzonen, wie man es von WoW-Chatfenstern kennt. Gleiche Achsen-
   *  Logik wie der Eck-Griff (s. dessen JSDoc). */
  const handleLogWidthResizeStart = (e: ReactPointerEvent<HTMLDivElement>): void => {
    const startWidth = panelDimsRef.current.logW;
    beginPanelDrag(
      e,
      (dx) => {
        panelDimsRef.current.logW = Math.min(COMBAT_LOG_WIDTH_MAX, Math.max(COMBAT_LOG_WIDTH_MIN, startWidth - dx));
        applyPanelVars();
      },
      () => setCombatLogWidth(panelDimsRef.current.logW),
    );
  };

  const handleLogHeightResizeStart = (e: ReactPointerEvent<HTMLDivElement>): void => {
    const startHeight = panelDimsRef.current.logH ?? logPanelRef.current?.getBoundingClientRect().height ?? 300;
    const maxHeightPx = window.innerHeight * COMBAT_LOG_HEIGHT_MAX_VH_FACTOR;
    beginPanelDrag(
      e,
      (_dx, dy) => {
        panelDimsRef.current.logH = Math.min(maxHeightPx, Math.max(COMBAT_LOG_HEIGHT_MIN, startHeight + dy));
        applyPanelVars();
      },
      () => setCombatLogHeight(panelDimsRef.current.logH),
    );
  };

  /** Doppelklick auf den Log-Handle = Reset auf Default-Breite (300px) UND volle Zeilenhöhe. */
  const handleLogResizeReset = (): void => {
    panelDimsRef.current.logW = COMBAT_LOG_WIDTH_DEFAULT;
    panelDimsRef.current.logH = null;
    applyPanelVars();
    setCombatLogWidth(COMBAT_LOG_WIDTH_DEFAULT);
    setCombatLogHeight(null);
  };

  // Task #333 (Chef-Feature "Log-Settings wie in WoW"): Zahnrad-Popover mit Kategorie-Checkboxen —
  // reiner Anzeigefilter (s. logEventCategory oben + logLines-Memo unten), die Engine sammelt
  // jedes Event unverändert weiter. Outside-Klick/Escape-Muster identisch zu DropsBox oben.
  const [logSettingsOpen, setLogSettingsOpen] = useState(false);
  const logSettingsWrapRef = useRef<HTMLDivElement | null>(null);
  const [logFilters, setLogFiltersState] = useState<ReadonlySet<CombatLogCategory>>(() => getCombatLogFilters());

  useEffect(() => {
    if (!logSettingsOpen) return;
    const onOutside = (ev: MouseEvent): void => {
      if (logSettingsWrapRef.current && !logSettingsWrapRef.current.contains(ev.target as Node)) {
        setLogSettingsOpen(false);
      }
    };
    const onKey = (ev: KeyboardEvent): void => {
      if (ev.key === "Escape") setLogSettingsOpen(false);
    };
    const id = window.setTimeout(() => window.addEventListener("mousedown", onOutside), 0);
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("mousedown", onOutside);
      window.removeEventListener("keydown", onKey);
    };
  }, [logSettingsOpen]);

  const toggleLogFilter = (cat: CombatLogCategory): void => {
    setLogFiltersState((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      setCombatLogFilters(next);
      return next;
    });
  };

  /** Löst die Angriffs-Lunge der angreifenden Seite aus (Nonce hochzählen). */
  const triggerLunge = (side: "player" | "enemy"): void => {
    setLunge((l) => ({ ...l, [side]: l[side] + 1 }));
  };

  /** Task #296 P0 §1.1/§1.2 — löst Flash+Recoil auf der GETROFFENEN Seite aus (Nonce hochzählen). */
  const triggerHitFx = (side: "player" | "enemy", crit: boolean): void => {
    setHitFx((h) => ({ ...h, [side]: { n: h[side].n + 1, crit } }));
  };

  /** Task #296 P0 §1.3 — startet den Kill-Flourish (~650ms), löst einen evtl. laufenden Timer ab. */
  const triggerDying = (): void => {
    setDying(true);
    if (dyingTimerRef.current !== null) window.clearTimeout(dyingTimerRef.current);
    dyingTimerRef.current = window.setTimeout(() => setDying(false), 650);
  };

  // Ausstehenden Dying-Timer beim Verlassen des Kampfbildschirms aufräumen (Flucht/Encounter-Ende
  // mitten im 650ms-Fenster) — verhindert einen setState-Aufruf nach dem Unmount.
  useEffect(() => {
    return () => {
      if (dyingTimerRef.current !== null) window.clearTimeout(dyingTimerRef.current);
    };
  }, []);

  // ─── Kampf-Juice-Welle (Chef-GO 2026-07-12): imperativer FX-Layer ────────────────────────────
  // Stage-Ref = Shake-Ziel (§1a) + Koordinaten-Anker; FX-Layer (nur bei "full" gerendert) hält die
  // gepoolten Funken/Beams/Ring/Flash-Elemente. Alles WAAPI, kein setState pro Event; die
  // data-*-Zähler auf dem Layer sind reine Assertion-Anker für ui-audit/juice-check.mjs.
  const stageRef = useRef<HTMLDivElement | null>(null);
  const fxLayerRef = useRef<HTMLDivElement | null>(null);
  const fxPoolRef = useRef<Record<FxKind, { els: HTMLElement[]; next: number }>>({
    spark: { els: [], next: 0 },
    beam: { els: [], next: 0 },
    ring: { els: [], next: 0 },
    flash: { els: [], next: 0 },
  });

  // ─── Kampfeffekte — Partikel-Schicht (Chef-Entscheid 28.08.2026, design/combat-fx/konzept-
  // kampfeffekte.md §8) ─────────────────────────────────────────────────────────────────────────
  // Eigenes `<canvas>` direkt auf der Stage (verwaltet von `ParticleStage`, s. fxParticles.ts) —
  // ein Battle-Mount lang, unabhängig vom bedingt gerenderten `.arena-fx-layer` unten (die
  // Partikelschicht bleibt immer gemountet, `setLevel("off")` räumt sie bei Bedarf leer statt sie
  // aus dem DOM zu nehmen). Existiert für einen Effekt-Schlüssel ein Rezept, übernimmt sie den
  // entsprechenden Sprite-Trigger komplett (s. `playParticleMissile`/`playParticleImpact` unten).
  const particleStageRef = useRef<ParticleStage | null>(null);
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const ps = new ParticleStage(stage);
    particleStageRef.current = ps;
    return () => {
      ps.destroy();
      particleStageRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Dieselbe milde Stufe wie die Sprites (`spriteFxLevel`, s. dortiges JSDoc: prefers-reduced-
  // motion → "reduced" statt komplett "off") statt eine dritte, eigene Berechnung — Partikel und
  // Sprite-Rückfall sollen bei denselben Optionen gleich reagieren.
  useEffect(() => {
    particleStageRef.current?.setLevel(spriteFxLevel);
  }, [spriteFxLevel]);

  // Status-Ambient-Loops BEENDEN, wenn ein Status abläuft (Chef-Wunsch 28.08.2026) — das AUFLEGEN
  // eines Status läuft edge-getriggert über den Log-Diff weiter unten (kind==="status"), das
  // ABLAUFEN hat aber KEIN eigenes Log-Ereignis (nur `remainingMs` zählt in der Engine still
  // herunter, s. combat.ts). Battle re-rendert dank `useGameSelector((s)=>s.totalTicks)` oben
  // ohnehin JEDEN Tick — ein Set-Diff je Seite ist billig genug, um hier einfach mitzulaufen.
  const activeStatusRef = useRef<{ player: Set<StatusType>; enemy: Set<StatusType> }>({ player: new Set(), enemy: new Set() });
  const lastEnemyKeyRef = useRef<string>("");
  useEffect(() => {
    const stage = particleStageRef.current;
    if (!stage) return;
    // Chef-Report 28.08.2026: Brand lief ueber den Tod des Gegners hinaus weiter. Beim Tod (hp <= 0) und beim
    // Gegnerwechsel enden ALLE Gegner-Loops sofort, unabhaengig davon, ob die Engine die Effektliste schon geleert hat.
    const enemyKey = `${cs.monsterId ?? ""}#${cs.enemyHp > 0 ? 1 : 0}`;
    if (enemyKey !== lastEnemyKeyRef.current) {
      lastEnemyKeyRef.current = enemyKey;
      if (cs.enemyHp <= 0 || cs.monsterId === null) {
        stage.stopAmbientPrefix("enemy:");
        activeStatusRef.current.enemy = new Set();
      }
    }
    for (const [side, effects] of [
      ["player", cs.playerEffects],
      ["enemy", cs.enemyHp > 0 ? cs.enemyEffects : []],
    ] as const) {
      const now = new Set(effects.map((eff) => eff.type));
      for (const type of activeStatusRef.current[side]) {
        if (!now.has(type)) stage.stopAmbient(`${side}:${type}`);
      }
      activeStatusRef.current[side] = now;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.totalTicks]);

  // §3 — Einschlag-Elementfarbe des Spell-Moments: erster klassischer Status (burn/frost/shock/
  // poison/bleed) der Mainhand-Effektliste, sonst null → Arkan-Violett (CSS-Klasse .s-arcane).
  const weaponStatus: StatusType | null = useMemo(() => {
    const weapon = content.items[c.equipment.mainhand ?? ""];
    for (const fx of effectiveWeaponEffects(weapon)) {
      if (isStatusEffectType(fx.type)) return fx.type;
    }
    return null;
  }, [c.equipment.mainhand]);

  // Kampfeffekte Welle 1 (design/combat-fx/konzept-kampfeffekte.md) — dieselbe Mainhand-Waffe wie
  // `weaponStatus` oben, hier zusätzlich für die Sprite-Themen-/Slash-Familien-Auflösung
  // (combatFx.ts magicThemeFor/slashFamilyFor) gebraucht.
  const mainhandWeapon = useMemo(() => content.items[c.equipment.mainhand ?? ""], [c.equipment.mainhand]);

  /** Rechteck eines Stage-Kindes in FX-Layer-Koordinaten (der Layer liegt inset:0 AUF der Stage).
   *  getBoundingClientRect läuft NUR beim Trigger (kein Layout-Read pro Frame/Tick). */
  const fxRect = (sel: string): { x: number; y: number; w: number; h: number } | null => {
    const stage = stageRef.current;
    const el = stage?.querySelector(sel);
    if (!stage || !el) return null;
    const sb = stage.getBoundingClientRect();
    const b = el.getBoundingClientRect();
    return { x: b.left - sb.left, y: b.top - sb.top, w: b.width, h: b.height };
  };

  /** Chef-Auftrag 28.08.2026 „Magie-Ankerpunkt": Startpunkt eines SPIELER-Geschosses ist der pro
   *  Portrait vermessene Anker (`portraitAnchors.ts`: Stabspitze, sonst führende Hand/Waffenspitze),
   *  umgerechnet auf die tatsächlich gezeichnete Fläche des `<img>` (object-fit: contain,
   *  object-position aus dem Computed Style) in FX-Layer-Koordinaten. Eine Spiegelung (negativer
   *  scaleX irgendwo zwischen `img` und `.arena-side-player`) klappt die x-Achse. `null`, wenn kein
   *  Bild/keine natürliche Größe vorliegt (Silhouette, Bild noch nicht geladen) — Aufrufer fallen
   *  dann auf den alten Box-Punkt zurück. Läuft NUR beim Trigger (kein Layout-Read pro Frame). */
  const playerAnchorPoint = (kind: "magic" | "hand"): { x: number; y: number } | null => {
    const stage = stageRef.current;
    const img = stage?.querySelector<HTMLImageElement>(".arena-side-player .fighter-figure-art img");
    if (!stage || !img || !img.naturalWidth || !img.naturalHeight) return null;
    const sb = stage.getBoundingClientRect();
    const b = img.getBoundingClientRect();
    const pos = parseObjectPosition(getComputedStyle(img).objectPosition);
    const drawn = containedImageRect(
      { x: b.left - sb.left, y: b.top - sb.top, w: b.width, h: b.height },
      img.naturalWidth,
      img.naturalHeight,
      pos.x,
      pos.y,
    );
    let mirrored = false;
    for (let el: Element | null = img; el && el !== stage && !el.classList.contains("arena-side-player"); el = el.parentElement) {
      const m = /matrix(?:3d)?\(\s*([-\d.e]+)/.exec(getComputedStyle(el).transform);
      if (m && Number(m[1]) < 0) mirrored = !mirrored;
    }
    const anchor = getPortraitAnchor(c.portrait);
    return anchorToStagePoint(kind === "magic" ? anchor.magic : anchor.hand, drawn, mirrored);
  };

  /** Geschoss-Startpunkt einer Seite: Spieler = Magie-Anker des Portraits, Gegner (keine Anker,
   *  Monster-Art) und Rückfall = bisheriger Box-Punkt (55 % Breite / 32 % Höhe der Figurenbox). */
  const missileOrigin = (from: "player" | "enemy", box: { x: number; y: number; w: number; h: number }): { x: number; y: number } =>
    (from === "player" && playerAnchorPoint("magic")) || { x: box.x + box.w * 0.55, y: box.y + box.h * 0.32 };

  // Dev-Hilfsschalter `?anchorDebug=1` (nur DEV, Muster wie `?levelTest` in App.tsx): zeichnet den
  // Magie-Anker (rot) und den Hand-Anker (blau) des Spieler-Portraits als Punkt auf die Stage, damit
  // sich die Messung aus portraitAnchors.ts im Harness/Browser gegen das Bild prüfen lässt.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    if (new URLSearchParams(window.location.search).get("anchorDebug") !== "1") return;
    const stage = stageRef.current;
    if (!stage) return;
    const mkDot = (color: string): HTMLDivElement => {
      const d = document.createElement("div");
      d.className = "anchor-debug-dot";
      d.style.cssText =
        `position:absolute;left:0;top:0;width:14px;height:14px;margin:-7px 0 0 -7px;border-radius:50%;` +
        `background:${color};border:2px solid #fff;box-shadow:0 0 0 2px rgba(0,0,0,.65);pointer-events:none;z-index:50;display:none`;
      stage.appendChild(d);
      return d;
    };
    const dots = { magic: mkDot("#ff2020"), hand: mkDot("#2a5cff") };
    const place = (): void => {
      for (const kind of ["magic", "hand"] as const) {
        const p = playerAnchorPoint(kind);
        const d = dots[kind];
        d.style.display = p ? "block" : "none";
        if (p) {
          d.style.left = `${p.x}px`;
          d.style.top = `${p.y}px`;
        }
      }
    };
    place();
    const timer = window.setInterval(place, 400);
    return () => {
      window.clearInterval(timer);
      dots.magic.remove();
      dots.hand.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- playerAnchorPoint liest nur Refs/DOM; Neuaufbau nur bei Portraitwechsel
  }, [c.portrait]);

  /** Zählt einen data-<name>-Zähler auf dem FX-Layer hoch (DOM-Assertion-Anker, s. juice-check). */
  const bumpFx = (name: string, by = 1): void => {
    const layer = fxLayerRef.current;
    if (!layer) return;
    layer.dataset[name] = String((Number(layer.dataset[name]) || 0) + by);
  };

  /** Holt ein gepooltes FX-Element (lazy bis zum Pool-Deckel, danach Round-Robin-Recycling). */
  const acquireFx = (kind: FxKind): HTMLElement | null => {
    const layer = fxLayerRef.current;
    if (!layer) return null;
    const pool = fxPoolRef.current[kind];
    let el: HTMLElement;
    if (pool.els.length < FX_POOL_SIZE[kind]) {
      el = document.createElement(FX_TAG[kind]);
      layer.appendChild(el);
      pool.els.push(el);
    } else {
      el = pool.els[pool.next % pool.els.length]!;
      pool.next += 1;
      if (typeof el.getAnimations === "function") {
        for (const a of el.getAnimations()) a.cancel();
      }
    }
    el.className = `fx-${kind}`;
    return el;
  };

  /** Spielt eine WAAPI-Animation auf einem FX-Element und pflegt die `.active`-Klasse
   *  (erscheint beim Event, verschwindet mit dem Animations-Ende — Assertion-Kontrakt). */
  const playFx = (
    el: HTMLElement,
    keyframes: Keyframe[],
    options: KeyframeAnimationOptions,
    onDone?: () => void,
  ): void => {
    if (typeof el.animate !== "function") return;
    el.classList.add("active");
    const anim = el.animate(keyframes, options);
    anim.onfinish = () => {
      el.classList.remove("active");
      onDone?.();
    };
    anim.oncancel = () => el.classList.remove("active");
  };

  /** §1a — dezenter Arena-Shake NUR bei Crits (~4px/160ms auf der Stage, s. Keyframes oben). */
  const triggerArenaShake = (): void => {
    const el = stageRef.current;
    if (fxLevel !== "full" || !el || typeof el.animate !== "function") return;
    bumpFx("shake");
    el.animate(ARENA_SHAKE_KEYFRAMES, { duration: 160, easing: "ease-out" });
  };

  /** §1c/§5 — kurzlebige Funken am Einschlagpunkt (gepoolte Spans + WAAPI). `gold` = der
   *  Loot-Aufblitz des Kill-Moments (steigt höher auf, goldene Färbung). */
  const spawnSparks = (side: "player" | "enemy", count: number, gold: boolean): void => {
    if (fxLevel !== "full") return;
    const box = fxRect(`.arena-side-${side} .fighter-figure-art`);
    if (!box) return;
    bumpFx(gold ? "goldSparks" : "sparks", count);
    const cx = box.x + box.w / 2;
    const cy = box.y + box.h * (gold ? 0.55 : 0.45);
    for (let i = 0; i < count; i++) {
      const el = acquireFx("spark");
      if (!el) return;
      if (gold) el.classList.add("gold");
      const ang = Math.random() * Math.PI * 2;
      const dist = 26 + Math.random() * 44;
      el.style.left = `${Math.round(cx + (Math.random() - 0.5) * 20)}px`;
      el.style.top = `${Math.round(cy + (Math.random() - 0.5) * 20)}px`;
      playFx(
        el,
        [
          { transform: "translate(0, 0) scale(1)", opacity: 1 },
          {
            transform: `translate(${Math.round(Math.cos(ang) * dist)}px, ${Math.round(Math.sin(ang) * dist - (gold ? 46 : 14))}px) scale(0.15)`,
            opacity: 0,
          },
        ],
        // Gold-Funken (Kill-Loot-Aufblitz) leben länger und steigen höher — kleine Beute-Motes
        // statt Einschlags-Splitter; Treffer-Funken bleiben kurz und knackig.
        { duration: gold ? 500 + Math.random() * 220 : 300 + Math.random() * 160, easing: "cubic-bezier(0.1, 0.65, 0.3, 1)" },
      );
    }
  };

  /** §3-Einschlag — kurzer elementfarbener Flash an der Gegner-Figur (Statusfarbe der Waffe
   *  via `weaponStatus`, sonst Arkan-Violett). */
  const spawnImpactFlash = (status: StatusType | null): void => {
    if (fxLevel !== "full") return;
    const box = fxRect(".arena-side-enemy .fighter-figure-art");
    if (!box) return;
    const el = acquireFx("flash");
    if (!el) return;
    bumpFx("impacts");
    el.classList.add(status ? `s-${status}` : "s-arcane");
    const size = Math.round(Math.min(box.w, box.h) * 0.7);
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    el.style.left = `${Math.round(box.x + box.w / 2 - size / 2)}px`;
    el.style.top = `${Math.round(box.y + box.h * 0.45 - size / 2)}px`;
    playFx(el, [{ opacity: 0 }, { opacity: 0.9, offset: 0.3 }, { opacity: 0 }], { duration: 260, easing: "ease-out" });
  };

  /** §3/§4 — Projektil-Streif von der Spieler- zur Gegner-Figur (Koordinaten beider Figuren via
   *  getBoundingClientRect NUR beim Trigger). "arcane" = Spell-Bolt (~200ms), "tracer" =
   *  Bogen-Tracer (2px, ~130ms). Der Kopf des Streifs endet AM Ziel (Restlänge abgezogen). */
  const spawnBeam = (variant: "arcane" | "tracer", onArrive?: () => void): void => {
    if (fxLevel !== "full") return;
    const from = fxRect(".arena-side-player .fighter-figure-art");
    const to = fxRect(".arena-side-enemy .fighter-figure-art");
    if (!from || !to) return;
    const origin = playerAnchorPoint("magic") ?? { x: from.x + from.w * 0.6, y: from.y + from.h * (variant === "arcane" ? 0.35 : 0.42) };
    const x1 = origin.x;
    const y1 = origin.y;
    const dx = to.x + to.w / 2 - x1;
    const dy = to.y + to.h * 0.45 - y1;
    const len = Math.hypot(dx, dy);
    if (len < 40) return;
    const el = acquireFx("beam");
    if (!el) return;
    bumpFx(variant === "arcane" ? "bolts" : "tracers");
    el.classList.add(variant);
    const beamLen = Math.round(variant === "arcane" ? Math.min(90, len * 0.3) : Math.min(120, len * 0.4));
    const travel = (len - beamLen) / len;
    const rot = `rotate(${Math.round(Math.atan2(dy, dx) * (180 / Math.PI))}deg)`;
    el.style.left = `${Math.round(x1)}px`;
    el.style.top = `${Math.round(y1)}px`;
    el.style.width = `${beamLen}px`;
    playFx(
      el,
      [
        { transform: `translate(0, 0) ${rot}`, opacity: 0 },
        { opacity: 1, offset: 0.2 },
        { transform: `translate(${Math.round(dx * travel)}px, ${Math.round(dy * travel)}px) ${rot}`, opacity: 1 },
      ],
      { duration: variant === "arcane" ? 200 : 130, easing: variant === "arcane" ? "ease-in" : "linear" },
      onArrive,
    );
  };

  /** §3 — arkaner Runen-Ring unter der Spieler-Figur beim Cast: rotierender Conic-Ring in
   *  Boden-Perspektive (rotateX in den Keyframes, ~400ms, dezentes Violett, keine Assets). */
  const spawnRuneRing = (): void => {
    if (fxLevel !== "full") return;
    const box = fxRect(".arena-side-player .fighter-figure-art");
    if (!box) return;
    const el = acquireFx("ring");
    if (!el) return;
    bumpFx("rings");
    const size = Math.round(Math.min(box.w * 0.85, 210));
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    el.style.left = `${Math.round(box.x + box.w / 2 - size / 2)}px`;
    // Ring-Mitte ~44px ÜBER der Szenen-Unterkante: die Nameplate überlappt die Szene unten
    // (~52px, s. .fighter-nameplate-Block) und läge sonst über der halben Ring-Ellipse.
    el.style.top = `${Math.round(box.y + box.h - size / 2 - 44)}px`;
    playFx(
      el,
      [
        { transform: "rotateX(64deg) rotate(0deg)", opacity: 0 },
        { opacity: 0.95, offset: 0.22 },
        { opacity: 0.8, offset: 0.72 },
        { transform: "rotateX(64deg) rotate(200deg)", opacity: 0 },
      ],
      { duration: 500, easing: "ease-out" },
    );
  };

  // ─── Kampfeffekte Welle 1: Sprite-Wiedergabe (design/combat-fx/konzept-kampfeffekte.md §4) ────
  // Eigener Pool neben `fxPoolRef` oben — dieselben Anker (`fxRect`), derselbe Layer
  // (`fxLayerRef`), derselbe `bumpFx`-Assertion-Anker (Zähler "sprites"). Rückfall-Regel: fehlt
  // ein Sprite (fxSprite → null), ruft der jeweilige play*Fx-Aufrufer den ALTEN Form-Effekt
  // (spawnBeam/spawnSparks/spawnImpactFlash) — praktisch tot, solange alle 33 Welle-1-Dateien
  // vorliegen, bleibt aber für künftige Nachlieferungen als Degradations-Kette bestehen.
  const spriteFxPoolRef = useRef<Record<"player" | "enemy", { els: HTMLDivElement[]; next: number }>>({
    player: { els: [], next: 0 },
    enemy: { els: [], next: 0 },
  });
  const missileFxPoolRef = useRef<{ els: HTMLDivElement[]; next: number }>({ els: [], next: 0 });
  // Sequenzen/Varianten/Crit (28.08.2026): zuletzt gespielte Variante je Effekt-Schlüssel
  // (`missile_fire`, `impact_fire`, `slash_cut`, …) — verhindert dieselbe Variante zweimal
  // hintereinander (s. `pickFxVariant`). Reine Battle-Instanz-Ref, kein Speicherstand-Bezug.
  const lastFxVariantRef = useRef<Map<string, string>>(new Map());
  // Bild-Maße je fx-URL, für die Feldzahl-Ableitung (N-Felder statt fix drei, s. `fieldCountFor`).
  // Einmaliger Preload beim Battle-Mount unten; bis ein Bild geladen ist, greift dessen Fallback.
  const fxDimsRef = useRef<Map<string, { w: number; h: number }>>(new Map());

  useEffect(() => {
    let cancelled = false;
    for (const url of fxAllUrls()) {
      if (fxDimsRef.current.has(url)) continue;
      const img = new Image();
      img.onload = () => {
        if (!cancelled) fxDimsRef.current.set(url, { w: img.naturalWidth, h: img.naturalHeight });
      };
      img.src = url;
    }
    return () => {
      cancelled = true;
    };
  }, []);

  /** Feldzahl eines Sprites aus der Bilddatei (Breite ÷ Feldbreite, Konzept „Sequenzen, Varianten,
   *  Crit" 28.08.2026): quadratische Felder (Einschlag/Slash/Blut/Pet/Miss/Block/Crit-Overlay) —
   *  Feldbreite = Bildhöhe. Geschoss-Felder sind 256×128 (2:1, `wide=true`) — Feldbreite = 2×
   *  Bildhöhe. Ohne geladene Maße (Preload noch nicht durch) der alte Fixwert: drei Felder für
   *  Streifen, ein Feld für Geschosse — verhält sich dadurch exakt wie heute (Anforderung 1). */
  const fieldCountFor = (url: string, wide: boolean): number => {
    const dims = fxDimsRef.current.get(url);
    if (!dims || dims.h <= 0) return wide ? 1 : 3;
    const fieldWidth = wide ? dims.h * 2 : dims.h;
    return Math.max(1, Math.round(dims.w / fieldWidth));
  };

  /** Wählt die Sprite-URL für einen Effekt-Schlüssel (z.B. `missile_fire`, `impact_fire`,
   *  `slash_cut`, `blood_red`, `pet_bite`, `miss_whiff`, `impact_block`) — bei `crit` zuerst
   *  `fx_<key>_crit` (falls vorhanden), sonst zufällig aus dem Varianten-Pool (Basisdatei +
   *  `_v1`…`_v9`), nie zweimal hintereinander dieselbe, wenn mehr als eine Variante existiert.
   *  `null`, wenn gar keine Datei vorliegt (Aufrufer fällt wie bisher auf den alten Form-Effekt
   *  zurück). Gilt generisch für jeden Schlüssel — Themen ohne Varianten/Crit (noch alles außer
   *  Feuer) liefern einfach die eine Basisdatei, unverändert zum bisherigen Verhalten. */
  const pickFxVariant = (key: string, crit: boolean): string | null => {
    if (crit) {
      const critUrl = fxCritVariant(key);
      if (critUrl) return critUrl;
    }
    const pool = fxVariants(key);
    if (pool.length === 0) return null;
    if (pool.length === 1) return pool[0]!;
    const last = lastFxVariantRef.current.get(key);
    let pick = pool[Math.floor(Math.random() * pool.length)]!;
    if (pick === last) {
      const rest = pool.filter((u) => u !== last);
      pick = rest[Math.floor(Math.random() * rest.length)]!;
    }
    lastFxVariantRef.current.set(key, pick);
    return pick;
  };

  /** Streifen-Element (s. `.fx-sprite`/`.fx-sprite-cell` in combat.css) holen — gepoolt je Seite,
   *  Deckel `SPRITE_FX_POOL_SIZE` (Round-Robin-Recycling darüber, wie `acquireFx`). Zellen-Kinder
   *  legt `setStripCells` je Aufruf an (Feldzahl wechselt je Sprite, s. Anforderung 1). */
  const acquireSpriteFx = (side: "player" | "enemy"): HTMLDivElement | null => {
    const layer = fxLayerRef.current;
    if (!layer) return null;
    const pool = spriteFxPoolRef.current[side];
    let el: HTMLDivElement;
    if (pool.els.length < SPRITE_FX_POOL_SIZE) {
      el = document.createElement("div");
      layer.appendChild(el);
      pool.els.push(el);
    } else {
      el = pool.els[pool.next % pool.els.length]!;
      pool.next += 1;
      if (typeof el.getAnimations === "function") for (const a of el.getAnimations()) a.cancel();
      for (const cell of Array.from(el.children)) {
        if (typeof (cell as HTMLElement).getAnimations === "function") {
          for (const a of (cell as HTMLElement).getAnimations()) a.cancel();
        }
      }
    }
    el.className = "fx-sprite";
    return el;
  };

  /** Geschoss-Element holen — gepoolt, Deckel `MISSILE_FX_POOL_SIZE`. Seit 28.08.2026 ein
   *  Zellen-Streifen wie `.fx-sprite` (statt eines einzelnen `<img>`): Geschosse liefern jetzt
   *  ebenfalls mehrere Felder (Mira-Lieferung 5 Felder je Feuer-Variante), die über die Flugzeit
   *  durchlaufen (s. `playMissileFx`). */
  const acquireMissileFx = (): HTMLDivElement | null => {
    const layer = fxLayerRef.current;
    if (!layer) return null;
    const pool = missileFxPoolRef.current;
    let el: HTMLDivElement;
    if (pool.els.length < MISSILE_FX_POOL_SIZE) {
      el = document.createElement("div");
      el.setAttribute("aria-hidden", "true");
      layer.appendChild(el);
      pool.els.push(el);
    } else {
      el = pool.els[pool.next % pool.els.length]!;
      pool.next += 1;
      if (typeof el.getAnimations === "function") for (const a of el.getAnimations()) a.cancel();
      for (const cell of Array.from(el.children)) {
        if (typeof (cell as HTMLElement).getAnimations === "function") {
          for (const a of (cell as HTMLElement).getAnimations()) a.cancel();
        }
      }
    }
    el.className = "fx-missile";
    return el;
  };

  /** Synchronisiert die `.fx-sprite-cell`-Kinder eines Streifen-Elements auf `count` (N-Felder
   *  statt fix drei, 28.08.2026): legt fehlende Zellen an bzw. entfernt überzählige (der Pool wird
   *  über wechselnde Feldzahlen hinweg wiederverwendet), setzt Hintergrundbild + Ausschnitt je
   *  Zelle per Inline-Style (ersetzt die alte feste Drittel-`nth-child`-Regel aus combat.css, die
   *  nur für genau drei Felder stimmte). */
  const setStripCells = (el: HTMLElement, url: string, count: number): void => {
    while (el.children.length < count) {
      const cell = document.createElement("span");
      cell.className = "fx-sprite-cell";
      el.appendChild(cell);
    }
    while (el.children.length > count) el.removeChild(el.lastElementChild!);
    const size = `${count * 100}% 100%`;
    Array.from(el.children).forEach((cell, i) => {
      const c = cell as HTMLElement;
      c.style.backgroundImage = `url("${url}")`;
      c.style.backgroundSize = size;
      c.style.backgroundPosition = count > 1 ? `${(i / (count - 1)) * 100}% 0%` : "0% 0%";
    });
  };

  /** Spielt einen N-Zellen-Streifen als gepooltes Element auf `side` ab (Anker
   *  `.arena-side-<side> .fighter-figure-art`, mittig auf ~45 % Figurenhöhe — Brust-Höhe wie die
   *  alten Einschlag-/Funken-Effekte). `mirror` spiegelt horizontal (Gegner-Angriffe laufen
   *  rechts→links, D5), `rotateDeg` ist der zufällige Slash-Dreh, `driftPx` der leichte Blut-
   *  Fall nach unten. Feldzahl kommt aus `fieldCountFor` (quadratische Felder) — drei Felder
   *  spielen bit-identisch zum bisherigen Verhalten (`buildStripKeyframes`). Rückgabe `false` =
   *  Anker fehlt (Aufrufer fällt selbst zurück). */
  const playStripFx = (
    side: "player" | "enemy",
    url: string,
    ratio: number,
    opts: { mirror?: boolean; rotateDeg?: number; scale?: number; durationMs?: number; yFrac?: number; driftPx?: number } = {},
  ): boolean => {
    const box = fxRect(`.arena-side-${side} .fighter-figure-art`);
    if (!box) return false;
    const el = acquireSpriteFx(side);
    if (!el) return false;
    bumpFx("sprites");
    const size = Math.round(box.h * ratio * (opts.scale ?? 1));
    const yFrac = opts.yFrac ?? 0.45;
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    el.style.left = `${Math.round(box.x + box.w / 2 - size / 2)}px`;
    el.style.top = `${Math.round(box.y + box.h * yFrac - size / 2)}px`;
    const count = fieldCountFor(url, false);
    setStripCells(el, url, count);
    const flip = opts.mirror ? -1 : 1;
    const rot = opts.rotateDeg ?? 0;
    const drift = opts.driftPx ?? 0;
    const base = `scaleX(${flip}) rotate(${rot}deg)`;
    el.style.transform = `${base} scale(1)`;
    const duration = opts.durationMs ?? 300;
    if (typeof el.animate === "function") {
      el.classList.add("active");
      const wrapAnim = el.animate(
        [
          { transform: `${base} translateY(0px) scale(1)` },
          { transform: `${base} translateY(${Math.round(drift * 0.5)}px) scale(1.08)`, offset: 0.4 },
          { transform: `${base} translateY(${drift}px) scale(1)` },
        ],
        { duration, easing: "ease-out" },
      );
      wrapAnim.onfinish = () => el.classList.remove("active");
      wrapAnim.oncancel = () => el.classList.remove("active");
    }
    const cellFrames = buildStripKeyframes(count);
    Array.from(el.children).forEach((cell, i) => {
      if (typeof (cell as HTMLElement).animate !== "function") return;
      (cell as HTMLElement).animate(cellFrames[i]!, { duration, easing: "linear" });
    });
    return true;
  };

  /** Geschoss-Flug (Konzept §2 A + Pfeil): Hand des Angreifers (oberes Drittel) → Brust des Ziels,
   *  `MISSILE_FLIGHT_MS`, leicht gebogen; spiegelt bei Flug von rechts (Gegner-Cast/-Schuss). Die
   *  Frame-Sequenz des Geschosses (Feldzahl aus `fieldCountFor`, `wide=true` für 256×128-Felder)
   *  läuft über dieselbe Dauer wie der Flug, damit eine Mehr-Felder-Sequenz sichtbar „lebt"
   *  (Anforderung 4). Ruft `onArrive` beim Landen — der Aufrufer spielt dort den Einschlag +
   *  retimten Sound. */
  const playMissileFx = (from: "player" | "enemy", url: string, onArrive: () => void): boolean => {
    const to = from === "player" ? "enemy" : "player";
    const fromBox = fxRect(`.arena-side-${from} .fighter-figure-art`);
    const toBox = fxRect(`.arena-side-${to} .fighter-figure-art`);
    if (!fromBox || !toBox) return false;
    const el = acquireMissileFx();
    if (!el) return false;
    bumpFx("sprites");
    const h = Math.round(fromBox.h * 0.28);
    const w = h * 2; // Geschoss-Feld ist 256×128 (Konzept §3, 2:1)
    const origin = missileOrigin(from, fromBox);
    const x1 = origin.x - w / 2;
    const y1 = origin.y - h / 2;
    const x2 = toBox.x + toBox.w / 2 - w / 2;
    const y2 = toBox.y + toBox.h * 0.45 - h / 2;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const mirror = from === "enemy"; // Kunst fliegt nach rechts (Dateikonvention); Gegner-Wurf läuft rechts→links
    const count = fieldCountFor(url, true);
    setStripCells(el, url, count);
    el.style.width = `${w}px`;
    el.style.height = `${h}px`;
    el.style.left = `${Math.round(x1)}px`;
    el.style.top = `${Math.round(y1)}px`;
    const flipPrefix = mirror ? "scaleX(-1) " : "";
    const dist = Math.hypot(dx, dy);
    const bow = Math.min(36, dist * 0.12) * (Math.random() < 0.5 ? -1 : 1); // leichte Bogen-Kurve
    const midX = dx * 0.5;
    const midY = dy * 0.5 - Math.abs(bow);
    if (typeof el.animate !== "function") {
      onArrive();
      return true;
    }
    el.classList.add("active");
    const anim = el.animate(
      [
        { transform: `${flipPrefix}translate(0px, 0px)`, opacity: 0 },
        { opacity: 1, offset: 0.15 },
        { transform: `${flipPrefix}translate(${Math.round(midX)}px, ${Math.round(midY)}px)`, offset: 0.55 },
        { transform: `${flipPrefix}translate(${Math.round(dx)}px, ${Math.round(dy)}px)`, opacity: 1 },
      ],
      { duration: MISSILE_FLIGHT_MS, easing: "ease-in" },
    );
    anim.onfinish = () => {
      el.classList.remove("active");
      onArrive();
    };
    anim.oncancel = () => el.classList.remove("active");
    const cellFrames = buildStripKeyframes(count);
    Array.from(el.children).forEach((cell, i) => {
      if (typeof (cell as HTMLElement).animate !== "function") return;
      (cell as HTMLElement).animate(cellFrames[i]!, { duration: MISSILE_FLIGHT_MS, easing: "linear" });
    });
    return true;
  };

  /** Anker-Bündel einer Kämpfer-Seite für die Partikelschicht (Chef-Entscheid 28.08.2026,
   *  `fxParticles.ts` §8): Mittelpunkt (Brust-/Trefferhöhe wie die Sprites), volle Bounding-Box
   *  (Status-Ambient am Körper, Leere-Riss/-Nachbild, Begleiter-Schutzschild-Kuppel) und ein
   *  Boden-Punkt darunter (Nahkampf-Bodenriss/-Stoßwelle, Blitzregen-Bodenentladung). `null`, wenn
   *  der Anker (noch) nicht im DOM steht. */
  const particleAnchor = (side: "player" | "enemy"): { center: { x: number; y: number }; box: Rect; feet: { x: number; y: number } } | null => {
    const b = fxRect(`.arena-side-${side} .fighter-figure-art`);
    if (!b) return null;
    return {
      center: { x: b.x + b.w / 2, y: b.y + b.h * 0.45 },
      box: { x: b.x, y: b.y, w: b.w, h: b.h },
      feet: { x: b.x + b.w / 2, y: b.y + b.h },
    };
  };

  /** Geschoss-Gegenstück zu `playMissileFx`, dieselben Anker (`fxRect` auf `.fighter-figure-art`),
   *  dieselbe Flugzeit `MISSILE_FLIGHT_MS`, dieselbe Spiegelung (`from` bestimmt Start-/Zielseite
   *  wie bei Sprites). `theme` ist bewusst `string` (nicht `MagicTheme`) — dieselbe Funktion trägt
   *  auch den Pfeil (`"arrow"`, kein Magie-Thema). `false` = kein Rezept für `missile_<schlüssel>`
   *  registriert (oder Anker fehlt/Level "off") — der Aufrufer fällt dann auf `playMissileFx`
   *  (Sprite) zurück; existiert ein Rezept, übernimmt die Partikelschicht den kompletten Flug UND
   *  ruft `onArrive` selbst auf. */
  const playParticleMissile = (from: "player" | "enemy", theme: string, crit: boolean, onArrive: () => void): boolean => {
    const stage = particleStageRef.current;
    if (!stage || !hasParticleRecipe(`missile_${theme}`)) return false;
    const to = from === "player" ? "enemy" : "player";
    const fromBox = fxRect(`.arena-side-${from} .fighter-figure-art`);
    const toAnchor = particleAnchor(to);
    if (!fromBox || !toAnchor) return false;
    return stage.play(`missile_${theme}`, {
      from: missileOrigin(from, fromBox),
      to: toAnchor.center,
      crit,
      durationMs: MISSILE_FLIGHT_MS,
      onArrive,
      box: toAnchor.box,
      feet: toAnchor.feet,
    });
  };

  /** Einschlag-Gegenstück zu `playParticleMissile` — `side` ist die GETROFFENE Seite (wie bei
   *  `playImpactFx`). `dir` wird explizit übergeben statt aus `from`/`to` abgeleitet (beide Punkte
   *  liegen am selben Anker): Spieler→Gegner-Angriffe laufen rechts (`+1`), ein gespiegelter
   *  Gegner→Spieler-Angriff liefe links (`-1`, Chef-D5 — heute mangels Monster-Magiedaten noch
   *  ungenutzt, s. combatFx.ts `slashFamilyFor`-JSDoc). `false` = kein Rezept/Anker/Level "off",
   *  Aufrufer fällt auf `playImpactFx` (Sprite) zurück. */
  const playParticleImpact = (side: "player" | "enemy", theme: string, crit: boolean): boolean => {
    const stage = particleStageRef.current;
    if (!stage || !hasParticleRecipe(`impact_${theme}`)) return false;
    const anchor = particleAnchor(side);
    if (!anchor) return false;
    const dir: 1 | -1 = side === "enemy" ? 1 : -1;
    return stage.play(`impact_${theme}`, { from: anchor.center, to: anchor.center, dir, crit, box: anchor.box, feet: anchor.feet });
  };

  /** Nahkampf-Gegenstück zu `playSlashFx` — kein Geschoss, Wirkung sitzt direkt am Ziel; `attacker`
   *  bestimmt den Start-Anker (Hand-Höhe) für den Luftzug/die Richtung, `target` den Trefferpunkt.
   *  `false` = kein Rezept für `slash_<familie>`/Anker fehlt, Aufrufer fällt auf `playSlashFx`
   *  zurück. */
  const playParticleSlash = (attacker: "player" | "enemy", target: "player" | "enemy", family: SlashFamily, crit: boolean): boolean => {
    const stage = particleStageRef.current;
    if (!stage || !hasParticleRecipe(`slash_${family}`)) return false;
    const fromBox = fxRect(`.arena-side-${attacker} .fighter-figure-art`);
    const toAnchor = particleAnchor(target);
    if (!fromBox || !toAnchor) return false;
    return stage.play(`slash_${family}`, {
      from: { x: fromBox.x + fromBox.w * 0.55, y: fromBox.y + fromBox.h * 0.32 },
      to: toAnchor.center,
      crit,
      box: toAnchor.box,
      feet: toAnchor.feet,
    });
  };

  /** Blut-/Ichor-/Knochenstaub-Gegenstück zu `playBloodFx`. */
  const playParticleBlood = (side: "player" | "enemy", variant: BloodVariant, crit: boolean): boolean => {
    const stage = particleStageRef.current;
    if (!stage || !hasParticleRecipe(`blood_${variant}`)) return false;
    const anchor = particleAnchor(side);
    if (!anchor) return false;
    const dir: 1 | -1 = side === "enemy" ? 1 : -1;
    return stage.play(`blood_${variant}`, { from: anchor.center, to: anchor.center, dir, crit });
  };

  /** Fehlschlag-Wischer-Gegenstück zu `playMissFx`. */
  const playParticleMiss = (side: "player" | "enemy"): boolean => {
    const stage = particleStageRef.current;
    if (!stage || !hasParticleRecipe("miss_whiff")) return false;
    const anchor = particleAnchor(side);
    if (!anchor) return false;
    const dir: 1 | -1 = side === "enemy" ? 1 : -1;
    return stage.play("miss_whiff", { from: anchor.center, to: anchor.center, dir, feet: anchor.feet });
  };

  /** Block-Funken-Gegenstück zu `playBlockFx`. */
  const playParticleBlockHit = (side: "player" | "enemy"): boolean => {
    const stage = particleStageRef.current;
    if (!stage || !hasParticleRecipe("impact_block")) return false;
    const anchor = particleAnchor(side);
    if (!anchor) return false;
    const dir: 1 | -1 = side === "enemy" ? 1 : -1;
    return stage.play("impact_block", { from: anchor.center, to: anchor.center, dir });
  };

  /** Begleiter-Gegenstück zu `playPetFx` — `petPos`/`from` kommen vom Begleiter-Portrait-Anker
   *  (`.battle-pet-sprite`, fehlt er, fällt der Startpunkt auf den Zielanker zurück). */
  const playParticlePet = (image: PetFxImage): boolean => {
    const stage = particleStageRef.current;
    if (!stage || !hasParticleRecipe(`pet_${image}`)) return false;
    const side = petFxTargetSide(image);
    const anchor = particleAnchor(side);
    if (!anchor) return false;
    const dir: 1 | -1 = side === "enemy" ? 1 : -1;
    const petBox = fxRect(".battle-pet-sprite");
    const petPos = petBox ? { x: petBox.x + petBox.w / 2, y: petBox.y + petBox.h / 2 } : undefined;
    return stage.play(`pet_${image}`, { from: petPos ?? anchor.center, to: anchor.center, dir, box: anchor.box, petPos });
  };

  /** Einschlag-Sprite am Ziel (Familie A/B-Landung). `crit` skaliert 1,4× und legt zusätzlich das
   *  Crit-Overlay darüber (Konzept "Crit: Einschlag 1,4× plus Crit-Overlay"); wählt außerdem per
   *  `pickFxVariant` eine Crit-Sonderdatei `fx_impact_<thema>_crit`, falls vorhanden (28.08.2026).
   *  Rückfall: fehlt jede Datei zu `impact_<thema>`, spielt der alte elementfarbene Flash (zielt
   *  wie bisher nur auf den Gegner — der alte Effekt kennt keine Spieler-Seite). */
  const playImpactFx = (
    side: "player" | "enemy",
    theme: string,
    crit: boolean,
    critFamily: "magic" | "weapon",
    fallbackStatus: StatusType | null,
  ): void => {
    const url = pickFxVariant(`impact_${theme}`, crit);
    if (!url) {
      if (side === "enemy") spawnImpactFlash(fallbackStatus);
      return;
    }
    playStripFx(side, url, SPRITE_SIZE_RATIO.impact, { scale: crit ? 1.4 : 1, durationMs: IMPACT_FX_MS });
    if (crit) {
      const critUrl = fxSprite(`fx_crit_${critFamily}`);
      if (critUrl) playStripFx(side, critUrl, SPRITE_SIZE_RATIO.impact, { scale: 1.3, durationMs: IMPACT_FX_MS });
    }
  };

  /** Waffen-Slash über der Trefferzone (Familie B), leicht zufällig rotiert (±12°), gespiegelt
   *  bei Gegner-Angriffen. Varianten-Pool + Crit-Sonderdatei über `pickFxVariant` (28.08.2026).
   *  Rückfall: fehlt jede Datei zu `slash_<familie>`, die alten Einschlags-Funken. */
  const playSlashFx = (side: "player" | "enemy", family: SlashFamily, crit: boolean, mirror: boolean): void => {
    const url = pickFxVariant(`slash_${family}`, crit);
    if (!url) {
      spawnSparks(side, crit ? 10 : 6, false);
      return;
    }
    const rotateDeg = Math.round((Math.random() - 0.5) * 24); // ±12°
    playStripFx(side, url, SPRITE_SIZE_RATIO.slash, { mirror, rotateDeg, scale: crit ? 1.4 : 1, durationMs: 280 });
    if (crit) {
      const critUrl = fxSprite("fx_crit_weapon");
      if (critUrl) playStripFx(side, critUrl, SPRITE_SIZE_RATIO.impact, { scale: 1.3, durationMs: 280 });
    }
  };

  /** Blut-/Ichor-/Knochenstaub-Spritzer am Einschlagpunkt, driftet leicht nach unten (Familie C).
   *  Varianten-Pool + Crit-Sonderdatei über `pickFxVariant` (28.08.2026, generisch — bislang hat
   *  keine Blut-Datei Varianten, der Pool liefert dann einfach die eine Basisdatei). Kein Rückfall
   *  nötig — die alten Funken decken den „harten Treffer" bereits über spawnSparks/playSlashFx ab,
   *  ein fehlendes Blut-Sprite lässt den Treffer einfach ohne Spritzer. */
  const playBloodFx = (side: "player" | "enemy", variant: BloodVariant, crit: boolean): void => {
    const url = pickFxVariant(`blood_${variant}`, crit);
    if (!url) return;
    playStripFx(side, url, SPRITE_SIZE_RATIO.blood, { durationMs: 320, yFrac: 0.5, driftPx: 14 });
  };

  /** Begleiter-Effekt-Sprite am Ziel (Familie D) — ergänzt den bestehenden Portrait-Puls
   *  (`pet-ability-glow`), ersetzt ihn NICHT (zwei unterschiedliche Orte: Portrait vs. Ziel-
   *  Figur, kein Konflikt mit der Rückfall-Regel). Varianten-Pool über `pickFxVariant`
   *  (28.08.2026, generisch); Begleiter-Treffer kennen kein Crit, darum `crit=false`. */
  const playPetFx = (image: PetFxImage): void => {
    const url = pickFxVariant(`pet_${image}`, false);
    if (!url) return;
    playStripFx(petFxTargetSide(image), url, SPRITE_SIZE_RATIO.pet, { durationMs: 300 });
  };

  /** Fehlschlag-Wischer (Familie C) — heute ohne Alt-Entsprechung (miss hatte bislang keinen FX),
   *  darum kein Fallback-Zweig nötig. */
  const playMissFx = (side: "player" | "enemy"): void => {
    const url = pickFxVariant("miss_whiff", false);
    if (!url) return;
    playStripFx(side, url, SPRITE_SIZE_RATIO.miss, { durationMs: 260 });
  };

  /** Block-Funken auf dem Schild-Anker (Familie C) — ebenfalls ohne Alt-Entsprechung. */
  const playBlockFx = (side: "player" | "enemy"): void => {
    const url = pickFxVariant("impact_block", false);
    if (!url) return;
    playStripFx(side, url, SPRITE_SIZE_RATIO.impact, { durationMs: 260 });
  };

  // Neue Treffer (seq > zuletzt gesehen) als Schadenszahlen einblenden.
  useEffect(() => {
    if (lastSeqRef.current === null) {
      lastSeqRef.current = cs.eventCount;
      return;
    }
    const last = lastSeqRef.current;
    lastSeqRef.current = cs.eventCount;

    const spawned: Floater[] = [];
    for (const e of cs.log) {
      // seq des ersten neuen Events == vorheriger eventCount → mit "<" einschließen (sonst wird jedes Einzel-Event verworfen).
      if (e.seq < last) continue;
      // Angriffsbewegung der angreifenden Seite (auch bei Fehlschlag).
      if (e.kind === "hit" || e.kind === "crit" || e.kind === "miss") {
        triggerLunge(e.by === "player" ? "player" : "enemy");
        // Task #296 P0 §1.1/§1.2: Treffer-Feedback am GETROFFENEN — bewusst NICHT bei miss (das
        // Ziel wurde ja nicht getroffen, s. Plan §1.1).
        if ((e.kind === "hit" || e.kind === "crit") && e.amount > 0) {
          triggerHitFx(e.by === "player" ? "enemy" : "player", e.kind === "crit");
        }
      }
      // Kampfeffekte Welle 1 (Konzept §2 Familien A–C) am GELANDETEN Treffer: Sprite-FX über den
      // neuen Pool, die alten Form-Effekte (spawnBeam/spawnSparks/spawnImpactFlash/spawnRuneRing
      // aus der Kampf-Juice-Welle, Chef-GO 2026-07-12) laufen nur noch als Rückfall in den
      // play*Fx-Wrappern (fehlendes Sprite) bzw. wenn `spriteFxLevel` "off" ist (praktisch
      // deckungsgleich mit `fxLevel` "off" — s. spriteFxLevel-JSDoc). `spriteFxLevel==="reduced"`
      // spielt nur Einschläge/Slashes, KEIN Geschoss, KEIN Blut (Konzept §4).
      if ((e.kind === "hit" || e.kind === "crit") && e.amount > 0) {
        const attacker = e.by;
        const target: "player" | "enemy" = attacker === "player" ? "enemy" : "player";
        const crit = e.kind === "crit";
        // §1a: Arena-Shake NUR bei Crits (beide Seiten) — bleibt an der strikten `fxLevel`
        // gebunden (OS prefers-reduced-motion schaltet echte Bewegung wie Shake weiter ganz ab,
        // anders als die sanftere `spriteFxLevel` unten).
        if (crit) triggerArenaShake();

        if (spriteFxLevel !== "off") {
          const allowMissileAndBlood = spriteFxLevel === "full";
          const bloodVariant = bloodVariantFor(target === "enemy" ? monster : undefined);

          if (attacker === "player" && stats.style === "magic") {
            spawnRuneRing(); // kein Sprite-/Partikel-Äquivalent — bleibt an der alten fxLevel-Gate hängen
            const theme = magicThemeFor(mainhandWeapon);
            // Kampfeffekte Partikel-Schicht (Chef-Entscheid 28.08.2026): existiert ein
            // Partikel-Rezept für `impact_<thema>`, ersetzt es playImpactFx (Sprite) komplett —
            // Blut bleibt unabhängig davon der Sprite-Pfad (kein Partikel-Rezept dafür, s.
            // fxParticles.ts §8-Doku).
            const doImpact = (): void => {
              if (!playParticleImpact(target, theme, crit)) {
                playImpactFx(target, theme, crit, "magic", weaponStatus);
              }
              if (allowMissileAndBlood) playBloodFx(target, bloodVariant, crit);
            };
            // Dieselbe Ersetzung für den Geschoss-Flug: ein Partikel-Rezept für `missile_<thema>`
            // übernimmt Flug UND ruft `doImpact` selbst bei Ankunft (s. playParticleMissile-JSDoc)
            // — der Sprite-/Beam-Zweig läuft dann für dieses Ereignis gar nicht erst an.
            const particleMissilePlayed = allowMissileAndBlood && playParticleMissile("player", theme, crit, doImpact);
            if (!particleMissilePlayed) {
              const missileUrl = allowMissileAndBlood ? pickFxVariant(`missile_${theme}`, crit) : null;
              if (missileUrl) {
                if (!playMissileFx("player", missileUrl, doImpact)) doImpact();
              } else if (allowMissileAndBlood) {
                spawnBeam("arcane", () => spawnImpactFlash(weaponStatus)); // Geschoss-Sprite fehlt
              } else {
                doImpact(); // "reduziert": sofort Einschlag ohne Flug
              }
            }
          } else if (attacker === "player" && stats.style === "ranged") {
            const doImpact = (): void => {
              if (!playParticleImpact(target, "arrow", crit)) {
                playImpactFx(target, "arrow", crit, "weapon", null);
              }
              if (allowMissileAndBlood && !playParticleBlood(target, bloodVariant, crit)) playBloodFx(target, bloodVariant, crit);
            };
            const particleMissilePlayed = allowMissileAndBlood && playParticleMissile("player", "arrow", crit, doImpact);
            if (!particleMissilePlayed) {
              const missileUrl = allowMissileAndBlood ? pickFxVariant("missile_arrow", crit) : null;
              if (missileUrl) {
                if (!playMissileFx("player", missileUrl, doImpact)) doImpact();
              } else if (allowMissileAndBlood) {
                spawnBeam("tracer"); // Pfeil-Sprite fehlt
              } else {
                doImpact();
              }
            }
          } else if (attacker === "player") {
            // Nahkampf: Slash direkt am Ziel, kein Geschoss. Existiert ein Partikel-Rezept für
            // `slash_<familie>`, ersetzt es playSlashFx komplett (Chef-Entscheid 28.08.2026).
            const family = slashFamilyFor(mainhandWeapon?.weaponType);
            if (!playParticleSlash("player", target, family, crit)) {
              playSlashFx(target, family, crit, false);
            }
            if (allowMissileAndBlood && !playParticleBlood(target, bloodVariant, crit)) playBloodFx(target, bloodVariant, crit);
          } else {
            // Gegner-Angriff, gespiegelt (Chef-D5) — Monster tragen keine Waffendaten, darum der
            // feste Standard-Slash "cut" (s. slashFamilyFor-JSDoc); ein monster-eigenes
            // Magie-Thema ist mangels Datenfeld noch offen (Bericht an den Chef).
            if (!playParticleSlash("enemy", target, "cut", crit)) {
              playSlashFx(target, "cut", crit, true);
            }
            if (allowMissileAndBlood && !playParticleBlood(target, bloodVariant, crit)) playBloodFx(target, bloodVariant, crit);
          }
        } else {
          // Sicherheitsnetz: sollte laut spriteFxLevel-JSDoc mit fxLevel "off" zusammenfallen.
          if (attacker === "player" && stats.style === "magic") {
            spawnRuneRing();
            spawnBeam("arcane", () => spawnImpactFlash(weaponStatus));
          } else if (attacker === "player" && stats.style === "ranged") {
            spawnBeam("tracer");
          } else {
            spawnSparks(target, crit ? 10 : 6, false);
          }
        }
      }
      // Fehlschlag-Wischer (Familie C) — dieselbe Zielseite wie der bestehende Miss-Floater.
      // Existiert ein Partikel-Rezept (`miss_whiff`), ersetzt es playMissFx komplett.
      if (e.kind === "miss" && spriteFxLevel !== "off") {
        const side = e.by === "player" ? "enemy" : "player";
        if (!playParticleMiss(side)) playMissFx(side);
      }
      // Block-Funken auf dem Schild-Anker (Familie C). `by` ist hier bereits die BLOCKENDE Seite
      // (anders als bei hit/crit/miss — s. combat.ts pushLog kind:"block"). Existiert ein
      // Partikel-Rezept (`impact_block`), ersetzt es playBlockFx komplett.
      if (e.kind === "block" && e.amount > 0 && spriteFxLevel !== "off") {
        if (!playParticleBlockHit(e.by)) playBlockFx(e.by);
      }
      // Pet-Ability: Sprite-Animation + Farb-Blitz (Bucket aus combatAbility.kind) auslösen, PLUS
      // (Kampfeffekte Welle 1, Familie D) den neuen Bild-Sprite am Ziel (Gegner, bzw. Spieler bei
      // Schutz/Heilung) — ergänzt den bestehenden Portrait-Puls, ersetzt ihn nicht (zwei
      // unterschiedliche Orte, s. playPetFx-JSDoc). Existiert ein Partikel-Rezept (`pet_<bild>`),
      // ersetzt es playPetFx komplett.
      if (e.kind === "petAbility") {
        setPetLunge((l) => l + 1);
        const pet = e.petId ? content.pets[e.petId] : undefined;
        const kind = pet?.combatAbility.kind;
        if (kind) {
          const bucket = PET_ABILITY_BUCKET[kind];
          setPetFx((p) => ({ n: p.n + 1, bucket }));
          if (spriteFxLevel !== "off") {
            const image = petFxImageFor(kind);
            if (!playParticlePet(image)) playPetFx(image);
          }
        }
      }
      // Status-Körpereffekte (Chef-Wunsch 28.08.2026, fxParticleLibrary.ts): "Huhn erleidet
      // Brand!" — dieselbe Log-Kante wie oben, `e.status` ist nur bei NEU aufgelegten Status-
      // effekten gesetzt (Refresh eines bereits aktiven Status pusht KEIN neues Log-Ereignis, s.
      // combat.ts applyEnemyStatus/inflictPlayerStatus). `by==="player"` heißt: der SPIELER hat
      // den Status auf den GEGNER gelegt (nicht umgekehrt!). Kurzes Aufflammen (`status_<typ>`)
      // PLUS Start des Ambient-Loops (`statusAmbient_<typ>`, s. activeStatusRef-Effekt unten für
      // das Beenden bei Ablauf) — beide laufen nur, wenn ein Rezept existiert (kein Sprite-
      // Rückfall für Status-Effekte, die gab es bislang nicht).
      if (e.kind === "status" && e.status && particleStageRef.current) {
        const target: "player" | "enemy" = e.by === "player" ? "enemy" : "player";
        const anchor = particleAnchor(target);
        if (anchor) {
          const dir: 1 | -1 = target === "enemy" ? 1 : -1;
          particleStageRef.current.play(`status_${e.status}`, { from: anchor.center, to: anchor.center, dir, box: anchor.box });
          particleStageRef.current.startAmbient(`statusAmbient_${e.status}`, `${target}:${e.status}`, { at: anchor.center, dir, box: anchor.box });
        }
      }
      // SFX an die Events knüpfen (gedrosselt im Audio-Modul).
      // Bei Magie-Stil: Cast-SFX statt Melee-Hit, bei leerem Mana: gedämpfter Ton.
      const isPlayerAttack = (e.kind === "hit" || e.kind === "crit") && e.by === "player" && e.amount > 0;
      // Waffen-Sound-Sets (Chef-Schema 2026-07-11, echte Aufnahmen mit 3 Zufalls-Variationen):
      // Spieler-Schwung mit Schwert/Bogen → <set>_attack, danach das ERGEBNIS mit ~140 ms Delay —
      // Treffer → <set>_impact, Miss/Block → <set>_blocked. Auto-Discovery in util/audio.ts:
      // solange eine Gruppe keine Dateien hat, degradiert sie stumm bzw. auf den Synth-Fallback.
      const isPlayerSwing =
        e.by === "player" && (e.kind === "hit" || e.kind === "crit" || e.kind === "miss" || e.kind === "block");
      if (isPlayerAttack && stats.style === "magic") {
        playSfx(manaEmpty ? "castWeak" : "cast");
      } else if (isPlayerSwing && stats.style !== "magic") {
        const set = stats.style === "ranged" ? "bow" : "sword";
        const attackPlayed = playCombatSfx(`${set}_attack`);
        const isHitResult = e.kind === "hit" || e.kind === "crit";
        const resultGroup = isHitResult ? `${set}_impact` : `${set}_blocked`;
        // Kampfeffekte Welle 1 (Konzept §4 "Sound: <set>_impact beim Ankommen des Geschosses statt
        // sofort"): beim Bogen fliegt jetzt ein echtes Pfeil-Sprite (~200ms) zum Ziel — der Impact-
        // Sound folgt dessen Landung statt des alten pauschalen 140ms-Schwung-Delays. Melee hat kein
        // Geschoss und bleibt unverändert beim Chef-Schema (140ms). Miss/Block hat ebenfalls kein
        // Geschoss (playMissFx/playBlockFx sind Landungs-Effekte ohne Flug) und bleibt bei 140ms.
        const resultDelayMs = isHitResult && set === "bow" && e.amount > 0 ? MISSILE_FLIGHT_MS : 140;
        const resultPlayed = playCombatSfx(resultGroup, resultDelayMs);
        // Sweep2-T7 (2026-07-13): Fallback hängt am RESULT, nicht am Attack-Whoosh — vorher
        // unterdrückte ein vorhandenes sword_attack den Synth-Treffer, obwohl die
        // impact/blocked-Dateien noch fehlen → gelandete Treffer waren komplett stumm.
        // Miss/Block blieb schon immer stumm; der Synth sitzt zeitlich hinter dem Whoosh.
        if (!resultPlayed && e.amount > 0 && (e.kind === "hit" || e.kind === "crit")) {
          const synthKind = e.kind === "crit" ? "crit" : "hit";
          if (attackPlayed) window.setTimeout(() => playSfx(synthKind), 140);
          else playSfx(synthKind);
        }
      } else if (e.kind === "crit" && e.amount > 0) {
        playSfx("crit");
      } else if (e.kind === "hit" && e.amount > 0) {
        playSfx("hit");
      }
      if (e.kind === "kill") {
        playSfx("death");
        // Task #296 P0 §1.3: Kill-Flourish VOR dem bestehenden cooldown-blur (s. triggerDying).
        triggerDying();
        // Kampf-Juice §5: goldene Funken als Loot-Aufblitz über der zerfallenden Figur.
        spawnSparks("enemy", 5, true);
      } else if (e.kind === "heal" && e.amount > 0) {
        playSfx("heal");
      }
      // Status-Effekt NEU angewandt (Bleed/Poison/Burn/Frost/Shock, kein Refresh): auffälliger
      // Text-Floater direkt über der Figur, damit man das nicht nur am winzigen Debuff-Badge
      // oder in der Log-Zeile ablesen muss (Chef-Feedback: Bleed am Gegner blieb unbemerkt).
      if (e.kind === "status" && e.status) {
        const statusTarget = e.by === "player" ? "enemy" : "player";
        const id = idRef.current++;
        spawned.push({
          id,
          target: statusTarget,
          amount: 0,
          crit: false,
          heal: false,
          magic: false,
          proc: true,
          status: e.status,
          label: `${t(`status.${e.status}`)}!`,
          x: Math.round((Math.random() - 0.5) * 60),
        });
        window.setTimeout(() => setFloaters((f) => f.filter((x) => x.id !== id)), 2600);
        // Task #296 P0 §1.5: Status-Rand-Puls auf derselben Seite, einmalig bei Neuanwendung.
        setStatusFx((s) => ({ ...s, [statusTarget]: { n: s[statusTarget].n + 1, type: e.status! } }));
      }
      // DoT-Tick (Feuer): eigene orange Schadenszahl mit Status-Icon, ~1×/Sekunde.
      if (e.kind === "dot" && e.amount > 0) {
        const id = idRef.current++;
        spawned.push({
          id,
          target: e.by === "player" ? "enemy" : "player",
          amount: e.amount,
          crit: false,
          heal: false,
          magic: false,
          dot: true,
          status: e.status,
          x: Math.round((Math.random() - 0.5) * 60),
        });
        window.setTimeout(() => setFloaters((f) => f.filter((x) => x.id !== id)), 2600);
      }
      // Lebensraub: grüne Heil-Zahl beim Spieler (Anwender) mit Lebensraub-Icon.
      if (e.kind === "lifesteal" && e.amount > 0) {
        const id = idRef.current++;
        spawned.push({
          id,
          target: "player",
          amount: e.amount,
          crit: false,
          heal: true,
          magic: false,
          lifesteal: true,
          status: "bleed", // Platzhalter-Icon für Lebensraub
          x: Math.round((Math.random() - 0.5) * 60),
        });
        window.setTimeout(() => setFloaters((f) => f.filter((x) => x.id !== id)), 2600);
      }
      // Fehlschlag (OSRS-Hit-Splat): blaue „0" auf der angegriffenen Seite.
      if (e.kind === "miss") {
        const id = idRef.current++;
        spawned.push({
          id,
          target: e.by === "player" ? "enemy" : "player",
          amount: 0,
          crit: false,
          heal: false,
          magic: false,
          miss: true,
          x: Math.round((Math.random() - 0.5) * 60),
        });
        window.setTimeout(() => setFloaters((f) => f.filter((x) => x.id !== id)), 2000);
      }
      // XP-Drop (OSRS-Feeling): kleine goldene „+N XP" beim Spieler bei Kill-XP.
      if (e.kind === "xp" && e.amount > 0) {
        const id = idRef.current++;
        spawned.push({
          id,
          target: "player",
          amount: e.amount,
          crit: false,
          heal: false,
          magic: false,
          xp: true,
          x: Math.round((Math.random() - 0.5) * 50),
        });
        window.setTimeout(() => setFloaters((f) => f.filter((x) => x.id !== id)), 2200);
      }
      const isHit = (e.kind === "hit" || e.kind === "crit") && e.amount > 0;
      const isHeal = e.kind === "heal" && e.amount > 0;
      if (isHit || isHeal) {
        const isMagicHit = !isHeal && e.by === "player" && stats.style === "magic";
        const id = idRef.current++;
        spawned.push({
          id,
          target: isHeal ? "player" : e.by === "player" ? "enemy" : "player",
          amount: e.amount,
          crit: e.kind === "crit",
          heal: isHeal,
          magic: isMagicHit,
          healSource: isHeal ? e.source : undefined,
          healItemId: isHeal ? e.itemId : undefined,
          x: Math.round((Math.random() - 0.5) * 60),
        });
        window.setTimeout(() => setFloaters((f) => f.filter((x) => x.id !== id)), 2600);
      }
      // Gegner-Ward-Absorb (Chef-Fix "Hollow Choir: I miss 9/10"): event-genau über `e.absorbed`
      // (Contract-Feld, s. shared/index.ts CombatEvent) sobald combat-dev es in der Engine befüllt
      // — bis dahin ist `e.absorbed` immer undefined und dieser Zweig bleibt inert (der Pool-Delta-
      // Fallback unten übernimmt weiterhin). Voll absorbiert (amount 0) zeigt ein Textlabel statt der
      // stummen „0", teilweise absorbiert (amount > 0) einen kleinen Zusatz neben der Schadenszahl.
      if ((e.kind === "hit" || e.kind === "crit") && e.by === "player" && (e.absorbed ?? 0) > 0) {
        const id = idRef.current++;
        const fullAbsorb = e.amount === 0;
        spawned.push({
          id,
          target: "enemy",
          amount: e.absorbed!,
          crit: false,
          heal: false,
          magic: false,
          wardAbsorb: true,
          label: fullAbsorb ? t("combat.floater.wardAbsorbed") : undefined,
          x: Math.round((Math.random() - 0.5) * (fullAbsorb ? 60 : 40)),
        });
        window.setTimeout(() => setFloaters((f) => f.filter((x) => x.id !== id)), 2600);
      }
    }
    if (spawned.length) setFloaters((f) => [...f, ...spawned]);
  }, [cs.eventCount, cs.log, t]);

  // Gegner-Ward-Absorb-Floater — POOL-DELTA-FALLBACK (Rüstungs-Trinität Spec §3.2, #219 "optional"):
  // solange combat-dev `absorbed` noch nicht pro Treffer in der Engine befüllt (s. event-genauer
  // Zweig oben), wird der geschluckte Betrag client-seitig aus dem enemyWard-Delta zwischen zwei
  // Renders hergeleitet, analog dem Ward-Pulse-Effekt in `Fighter` (umgekehrte Richtung, Recharge).
  // Der `hasAbsorbedField`-Ref schaltet diesen Fallback stumm, sobald der erste Log-Eintrag mit
  // gesetztem `absorbed` auftaucht — sonst würde der neue event-genaue Floater UND dieser Delta-
  // Floater gleichzeitig feuern (Dopplung). Vor dem Contract-Rollout ist das ein reiner No-op.
  const hasAbsorbedFieldRef = useRef(false);
  const prevEnemyWardRef = useRef<number | null>(null);
  useEffect(() => {
    if (cs.log.some((e) => e.absorbed !== undefined)) hasAbsorbedFieldRef.current = true;
    const cur = cs.enemyWard;
    if (cur === undefined) {
      prevEnemyWardRef.current = null;
      return;
    }
    const prev = prevEnemyWardRef.current;
    prevEnemyWardRef.current = cur;
    if (prev !== null && cur < prev && !hasAbsorbedFieldRef.current) {
      const id = idRef.current++;
      setFloaters((f) => [
        ...f,
        {
          id,
          target: "enemy",
          amount: Math.round(prev - cur),
          crit: false,
          heal: false,
          magic: false,
          wardAbsorb: true,
          x: Math.round((Math.random() - 0.5) * 60),
        },
      ]);
      window.setTimeout(() => setFloaters((f) => f.filter((x) => x.id !== id)), 2600);
    }
  }, [cs.enemyWard, cs.log]);

  // Pet-Sprung-Animation: imperativ ausgelöst (analog Figur-Lunge), spielt zuverlässig jedes Mal.
  // Task #296: reine Bewegung → nur in der "full"-Stufe.
  useEffect(() => {
    if (!petLunge || fxLevel !== "full") return;
    const el = petSpriteRef.current;
    if (!el || typeof el.animate !== "function") return;
    el.animate(PET_LUNGE_KEYFRAMES, { duration: 700, easing: "ease-in-out" });
  }, [petLunge, fxLevel]);

  // Task #296 P0 §1.4 — Pet-Ability-Blitz: radialer Opacity-Puls auf dem separaten Glow-Overlay
  // (petGlowRef, NICHT petSpriteRef — vermeidet Transform-Kollision mit dem Sprung), Farbe per
  // `.k-<bucket>`-Klasse (s. combat.css). Reiner Opacity-Effekt → zählt als "Flash", läuft also
  // auch in "reduced" (nur "off" unterdrückt ihn).
  useEffect(() => {
    if (!petFx.n || fxLevel === "off") return;
    const el = petGlowRef.current;
    if (!el || typeof el.animate !== "function") return;
    el.classList.remove("k-damage", "k-heal", "k-support", "k-control");
    el.classList.add(`k-${petFx.bucket}`);
    el.animate(
      [{ opacity: 0 }, { opacity: 0.9, offset: 0.3 }, { opacity: 0 }],
      { duration: 480, easing: "ease-out" },
    );
  }, [petFx.n, fxLevel]);

  const activePet = equippedPet(state, content);
  const activePetSrc = activePet ? getPetSrc(activePet.id) : null;

  // Mana-Leiste nur zeigen, wenn der Held Magie-Stil führt ODER ein Item (Focus) Mana-Bonus gibt.
  // Basiswert ohne Ausrüstung: 10 + int*5 + wis*2 (aus computeStats).
  const baseMana = 10 + stats.attributes.int * 5 + stats.attributes.wis * 2;
  const showManaBar = stats.style === "magic" || stats.maxMana > baseMana;
  const manaEmpty = showManaBar && c.mana === 0;
  // Kampf-Juice §6 — Low-HP-Spannung: pulsierende dunkelrote Vignette am Arena-Rand ab < 25%
  // Spieler-HP (Klasse hier, ::after + Puls in combat.css). Dauerzustands-tauglich: langsamer
  // 1.6s-Puls, Vignette liegt UNTER der Stage (verdeckt keine Figuren/Plaketten/Chips). Bei
  // fxLevel "off" (inkl. prefers-reduced-motion-Override) gar nicht erst gesetzt.
  const lowHp = fxLevel !== "off" && c.hp > 0 && c.hp < stats.maxHp * 0.25;
  // Task #330 (Chef-GO Prototyp 2,5D-Kampfarena): NUR ein normaler Zonen-Kampf (kein Dungeon) in
  // "The Pastures" + Dev-Build + Chef-Flag an (s. components/arena25d/flag.ts). Reine Lese-Prüfung,
  // keine Engine-Logik — Kampf-Werte selbst bleiben exakt dieselben, die auch die beiden <Fighter/>
  // weiter unten bekommen (s. "ARENA25D MOUNT SWITCH" JSX-Block).
  const arena25dActive = isArena25dActive(monster.zone ?? null, cs.dungeonId ?? null);
  // Arena-Rework (Chef-GO 2026-07-11): die 8-teilige Stat-Zeile lebt jetzt hinter dem „Details"-
  // Toggle der Nameplate (Fighter `details`-Prop) statt im Dauer-Layout; der hitChance-Eintrag
  // wandert als Prognose-Chip fest in die Nameplate (Fighter `hitChance`-Prop).
  const playerDetails = (
    <StatLine
      className="fighter-stats"
      entries={[
        { key: "atk", icon: statIcon("atk"), label: t("stat.meleeDamage"), value: formatStat(stats.meleeDamage) },
        { key: "def", icon: statIcon("def"), label: t("stat.defense"), value: formatStat(stats.defense) },
        { key: "acc", icon: statIcon("acc"), label: t("stat.accuracy"), value: formatStat(stats.accuracy) },
        { key: "eva", icon: statIcon("eva"), label: t("stat.evasion"), value: formatStat(stats.evasion) },
        {
          key: "critChance",
          icon: "✦",
          label: t("stat.critChance"),
          value: `${(stats.critChance * 100).toFixed(0)}%${stats.critChance >= CRIT_CHANCE_CAP ? ` ${t("stat.atCap")}` : ""}`,
        },
        { key: "critDamage", icon: "✦✦", label: t("stat.critDamage"), value: `${Math.round(stats.critDamage * 100)}%` },
        { key: "spd", icon: statIcon("spd"), label: t("stat.speed"), value: `${formatSeconds1(stats.attackIntervalMs / 1000)}s` },
        {
          key: "hitRange",
          icon: statIcon("atk"),
          label: t("stat.hitRange"),
          value: `${formatStat(stats.minHit)}–${formatStat(stats.maxHit)}`,
          className: "fighter-hitrange",
        },
      ]}
    />
  );
  // Food/Potion-Quickbar in der Nameplate ENTFERNT (Chef Bild #68): redundant zur Loadout-Spalte
  // links („Dass sehen wir ja eh links in der Leiste") — die Nameplate bleibt schlank.
  const playerFooter = undefined;
  const dropCounts = seenDropCount(state, monster);
  // Fix #260c: eigener 2-zeiliger Citadel-Kasten (Label-Zeile + Icon-Grid-Zeile) statt einer
  // freien Inline-Reihe — konsistent zur Drop-Box auf der Monster-Auswahl-Karte. Chef-Fix
  // 2026-07-05 (Bild #32): jetzt `DropsBox` — derselbe Kasten, aber responsive (Popover statt
  // Inline-Grid bei schmalem Fighter-Panel, s. DropsBox-Kommentar oben).
  const enemyDropsSub = monster.loot.length > 0 ? (
    <DropsBox monster={monster} dropCounts={dropCounts} />
  ) : undefined;
  const enemyDetails = (
    <StatLine
      className="fighter-stats"
      entries={[
        { key: "atk", icon: statIcon("atk"), label: t("combat.dmg"), value: formatStat(monster.damage) },
        { key: "def", icon: statIcon("def"), label: t("stat.defense"), value: formatStat(monster.defense) },
        { key: "acc", icon: statIcon("acc"), label: t("stat.accuracy"), value: formatStat(monster.accuracy) },
        { key: "eva", icon: statIcon("eva"), label: t("stat.evasion"), value: formatStat(monster.evasion) },
        { key: "spd", icon: statIcon("spd"), label: t("stat.speed"), value: `${formatSeconds1(monster.attackIntervalMs / 1000)}s` },
      ]}
    />
  );

  // Battlescreen hat Vorrang; Fallback auf Zone-/Dungeon-Map-Hintergrundbild.
  // Slayer-Turm: pro Etage eigenes Battlescreen (slayer_tower_1..5).
  const towerFloor = (content.slayerTower ?? []).find((f) => f.monsters.includes(monster.id))?.floor;
  // codex:2026-08-02T12:38:00+02:00 — echter Ortskontext für den Adaptive-Fortress-Kopf;
  // ausschließlich vorhandene Dungeon-/Turm-/Zonen-Daten, keine Mockup-Dossiers oder Fake-Werte.
  const zoneDef = content.zones.find((zone) => zone.id === monster.zone);
  const battleLocation = dungeon
    ? tr(dungeon.name)
    : cs.paragonFloor
      ? t("paragon.floorBadge").replace("{n}", String(cs.paragonFloor))
      : towerFloor !== undefined
        ? `${t("slayer.tower.title")} · ${t("slayer.tower.floor").replace("{n}", String(towerFloor))}`
        : zoneDef
          ? tr(zoneDef.name)
          : t("combat.reachZones");
  // Zonen-Ambient-Partikel (Chef-GO "Zonen-Ambient-Partikel"): effektiver Theme-Schlüssel, dieselbe
  // Priorität wie `backdropBg` unten — Dungeon > Turm-Etage > Zonen-ID (s. util/particles.ts).
  const particleZoneKey: string | null =
    cs.dungeonId ?? (towerFloor !== undefined ? `slayer_tower_${towerFloor}` : monster.zone ?? null);
  const backdropBg =
    getBattleScreen(cs.dungeonId) ??
    (towerFloor !== undefined ? getBattleScreen(`slayer_tower_${towerFloor}`) : null) ??
    getBattleScreen(monster.zone) ??
    getDungeonBackground(cs.dungeonId) ??
    getZoneBackground(monster.zone);
  // Querformat-Kulissen (Turm-Etage 2-5, s. useBackdropAspect-JSDoc oben): eigener Zuschnitt/kein
  // Drift statt cover+Ken-Burns — die 20 Hochformat-Bestandskulissen bleiben unverändert.
  const backdropAspect = useBackdropAspect(backdropBg, particleZoneKey);

  // Perf-Welle (2026-07-23, Chef-Auftrag "Kampf-Performance messen"): das Kampf-Log baute bisher
  // JEDEN 10-Hz-Render alle (bis zu 40) Zeilen neu auf — auch in den meisten Ticks OHNE neues
  // Event (Waffentempo meist 1-4s, also 10-40× mehr Rebuilds als nötig). `cs.eventCount` ist ein
  // monoton steigendes Primitive (s. combat.ts pushLog) und damit der korrekte Memo-Schlüssel für
  // ein IN-PLACE mutiertes Array (`cs.log`s Referenz ändert sich nie — ein Dep direkt auf `cs.log`
  // würde laut GameContext.tsx `useGameSelector`-Footgun-JSDoc niemals neu rechnen). `t`/`tr`
  // bleiben referenzstabil zwischen Ticks (I18nProvider re-rendert nur bei Sprachwechsel, s.
  // i18n/index.tsx) — als Deps also unschädlich, aber korrekt bei einem Sprachwechsel während des
  // Kampfes. Reines Render-Memoizing, keine Verhaltensänderung (identisches JSX-Ergebnis).
  const logLines = useMemo(() => {
    return [...cs.log].reverse().map((e) => {
      // Welle KK (Fenn-Retest, "Lifesteal heals you for 0."-Spam): ein Passiv, das nach fast
      // jedem Treffer verkündet, dass es NICHTS getan hat, entwertet den eigenen Auftritt mehr
      // als es informiert — Zeile unterdrücken statt anzeigen. Die Engine loggt das Event
      // weiterhin (kein packages/**-Eingriff), reiner Renderer-Filter.
      if (e.kind === "lifesteal" && e.amount === 0) return null;
      // Task #333: reiner Anzeigefilter (s. logEventCategory/logFilters oben) — die Engine hat das
      // Event bereits gesammelt (cs.log/eventCount unverändert), nur die Zeile wird unterdrückt.
      // Ab-/Anwählen einer Kategorie wirkt dadurch sofort rückwirkend auf vorhandene Einträge, weil
      // dieses Memo bei jedem Filter-Toggle komplett neu läuft (logFilters in den Deps unten).
      if (!logFilters.has(logEventCategory(e))) return null;
      if (logTab === "loot" && logEventCategory(e) !== "loot") return null;
      // Status-DoT / Lebensraub / neu angewandter Status: echtes Status-Icon-PNG vor dem Text
      // (statt Emoji im String), damit ein neuer Debuff (z.B. Bleed) auch im Log auffällt. Voll
      // vom Gegner-Ward absorbiert (Chef-Fix "Hollow Choir: I miss 9/10"): dieselbe Ward-Raute
      // wie der Balken/Floater vor der „Absorbiert!"-Zeile, analog zum def-Icon vor „Blocked! −X".
      const isFullWardAbsorb =
        (e.kind === "hit" || e.kind === "crit") && e.by === "player" && e.amount === 0 && (e.absorbed ?? 0) > 0;
      const logIcon =
        e.kind === "dot" ? renderEffectIcon(e.status ?? "burn")
        : e.kind === "lifesteal" ? renderEffectIcon("bleed")
        : e.kind === "status" ? renderEffectIcon(e.status ?? "bleed")
        // Task #220: Heil-/Absorptions-Quell-Icon (Trank/Food-Item-Icon oder Emoji-Fallback).
        : e.kind === "heal" || e.kind === "shield" ? healSourceIcon(e.source, e.itemId)
        // Schild-Block: def-Schild-Icon vor der blauen „Blocked! −X"-Zeile.
        : e.kind === "block" ? statIcon("def")
        : isFullWardAbsorb ? statIcon("ward")
        : null;
      // Fix #259c: Modifier-Klassen für die CSS-Farbcodierung — "zero" markiert einen Hit/Crit,
      // den die Gegner-Rüstung auf 0 gedrückt hat (blau statt rot, Block-Feeling), "status-<typ>"
      // färbt Status-/DoT-Zeilen je Effekt (burn/frost/shock/poison/bleed).
      const zeroCls = (e.kind === "hit" || e.kind === "crit") && e.amount === 0 ? " zero" : "";
      const statusCls = (e.kind === "status" || e.kind === "dot") && e.status ? ` status-${e.status}` : "";
      // Teil-Absorption (amount > 0 UND absorbed > 0): normale Schadenszahl bleibt, dazu ein
      // kleiner blauer Zusatz „(+N absorbiert)" — separat gerendert, damit er seine eigene
      // Ward-Farbe tragen kann (eventText liefert reinen Text ohne Markup).
      const wardAbsorbedSuffix =
        (e.kind === "hit" || e.kind === "crit") && e.by === "player" && e.amount > 0 && (e.absorbed ?? 0) > 0
          ? t("combat.log.wardAbsorbedSuffix").replace("{amount}", String(e.absorbed))
          : null;
      return (
        <div key={e.seq} className={`log-line ${e.kind} ${e.by}${zeroCls}${statusCls}`}>
          {logIcon && <span className="log-line-icon">{logIcon}</span>}
          {eventText(e, monsterName, t, tr)}
          {wardAbsorbedSuffix && <span className="log-line-ward-absorbed"> {wardAbsorbedSuffix}</span>}
        </div>
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cs.eventCount, monsterName, t, tr, logFilters, logTab]);

  return (
    <div className="battle">
      {/* Dungeon-Rework-Spec §5.6.1 — Encounter-Leiste: Totenkopf-Reihe statt der alten kontextlosen
          Balkenanzeige. Bezwungene Wellen erleuchtet, die aktuelle pulsiert dezent, Boss-Welle trägt
          ein eigenes Icon. Tooltip je Kopf = waveMeta.name + Monster-Name ("???" bis entdeckt, s.
          Collection-Log-Regel monsterKills — dg_-Varianten fragen ihre Basis-Id ab, Kill-Credit-
          Alias combat.ts). */}
      {dungeon && (
        <div className="dungeon-progress">
          <div className="dungeon-progress-head">
            <span className="dungeon-progress-name">
              {KEY_ICON_URL ? <img loading="lazy" decoding="async" src={KEY_ICON_URL} alt="" className="ui-icon dungeon-progress-key-icon" /> : "🗝️"} {tr(dungeon.name)}
            </span>
            <span className="dungeon-progress-wave">
              {t("combat.dungeonWave")
                .replace("{cur}", String(cs.encounterIndex + 1))
                .replace("{total}", String(dungeon.encounters.length))}
            </span>
          </div>
          <div className="dungeon-encounter-bar">
            {dungeon.encounters.map((encId, i) => {
              const wave = dungeon.waveMeta?.[i];
              const kind = wave?.kind ?? (i === dungeon.encounters.length - 1 ? "boss" : "trash");
              const encMonster = content.monsters[encId];
              const knownId = encId.startsWith("dg_") ? encId.slice(3) : encId;
              const known = monsterKills(state, knownId) > 0;
              const waveName = wave?.name ? tr(wave.name) : null;
              const monsterLabel = known && encMonster ? tr(encMonster.name) : "???";
              // Welle MM (Grete R3-Fund #7, "Badge fehlt genau dort, wo die Ward-Wand wohnt"):
              // dungeonOnly-Wellen-Monster tauchen NIE auf der normalen Zonen-Auswahlkarte auf (wo
              // das DefenseTypeBadge lebt) — die einzige Vorwarnung vor dem Ward-/Evasion-/Armor-
              // Konter ist diese Leiste selbst. Volles Badge-Markup passt nicht in den 26px-Kopf,
              // daher dieselbe Übersetzung + Konter-Beschreibung im Tooltip, plus eine Farbmarkierung
              // (`dungeon-skull-defense-*`, s. combat.css) in derselben Farbfamilie wie das Badge.
              const defenseType = encMonster?.defenseType ?? "armor";
              const defenseLabel = t(`combat.defenseType.${defenseType}`);
              const defenseDesc = t(`combat.defenseType.${defenseType}.desc`);
              const progressState = i < cs.encounterIndex ? "done" : i === cs.encounterIndex ? "current" : "pending";
              return (
                <HoverTip
                  key={i}
                  className={`dungeon-skull dungeon-skull-${progressState} dungeon-skull-${kind} dungeon-skull-defense-${defenseType}`}
                  content={
                    <>
                      <span className="ct-tip-title">{waveName ?? monsterLabel}</span>
                      {waveName && <span className="ct-tip-desc">{monsterLabel}</span>}
                      <span className="ct-tip-desc">{t(`dungeon.waveKind.${kind}`)} · {defenseLabel}</span>
                      <span className="ct-tip-desc">{defenseDesc}</span>
                    </>
                  }
                >
                  {kind === "boss" ? (
                    BOSS_ICON_URL ? <img loading="lazy" decoding="async" src={BOSS_ICON_URL} alt="" className="ui-icon" /> : "💀"
                  ) : kind === "elite" ? (
                    "☠"
                  ) : KILL_ICON_URL ? (
                    <img loading="lazy" decoding="async" src={KILL_ICON_URL} alt="" className="ui-icon" />
                  ) : (
                    "⚔"
                  )}
                </HoverTip>
              );
            })}
          </div>
        </div>
      )}

      {/* Paragonturm (§7, Welle P2) — Etagen-Badge NEBEN/statt der Dungeon-Encounter-Leiste (der
          Turm hat keine Wellen-Liste, 1 Etage = 1 Encounter): dieselbe Holzrahmen-Optik wie
          `.dungeon-progress` (Wiederverwendung der CSS-Klassen), nur Name+Etage(+Boss-Marker). */}
      {!dungeon && cs.paragonFloor && (
        <div className="dungeon-progress paragon-battle-badge">
          <div className="dungeon-progress-head">
            <span className="dungeon-progress-name">
              {TOWER_ICON_URL ? <img loading="lazy" decoding="async" src={TOWER_ICON_URL} alt="" className="ui-icon dungeon-progress-key-icon" /> : "🗼"} {t("paragon.floorBadge").replace("{n}", String(cs.paragonFloor))}
            </span>
            {isParagonBossFloor(cs.paragonFloor) && (
              <span className="dungeon-progress-wave paragon-boss-tag">
                {BOSS_ICON_URL ? <img loading="lazy" decoding="async" src={BOSS_ICON_URL} alt="" className="ui-icon" /> : "💀"}{" "}
                {t("dungeon.waveKind.boss")}
              </span>
            )}
          </div>
        </div>
      )}

      {/* §5.6.2 — Wellen-Ansage: kurzer Einblend-Moment bei jedem Wellenwechsel (inkl. Auftakt beim
          Betreten). Während des Boss-Intros (unten) unterdrückt — der deckt dieselbe Info größer ab. */}
      {waveAnnounce && !inBossIntro && (
        <div
          key={`${waveAnnounce.cur}-${waveAnnounce.name}`}
          className={`dungeon-wave-announce${fxMotion ? "" : " fx-no-motion"}`}
        >
          {t("dungeon.waveAnnounce")
            .replace("{cur}", String(waveAnnounce.cur))
            .replace("{total}", String(waveAnnounce.total))
            .replace("{name}", waveAnnounce.name)}
        </div>
      )}

      {/* §5.6.3 — Boss-Intro: die 8s-Atempause vor der letzten Welle (PRE_BOSS_BREATHER_MS) als
          Inszenierung — abdunkeln, Boss-Name groß, Truhen-Flash, "macht euch bereit", dann normaler
          Kampfstart (kein Engine-Eingriff, reine Ableitung aus cooldownRemainingMs+encounterIndex). */}
      {inBossIntro && dungeon && (
        <div className={`dungeon-boss-intro${fxMotion ? "" : " fx-no-motion"}`} aria-live="polite">
          <div className="dungeon-boss-intro-content">
            {chestFlash && (
              <div className="dungeon-chest-flash">
                <span className="dungeon-chest-flash-icon" aria-hidden="true">
                  {KEY_ICON_URL ? <img loading="lazy" decoding="async" src={KEY_ICON_URL} alt="" className="ui-icon" /> : "🗝️"}
                </span>
                <span>{t("dungeon.chestFound")}</span>
              </div>
            )}
            <div className="dungeon-boss-intro-eyebrow">{t("dungeon.bossIntro.eyebrow")}</div>
            <div className="dungeon-boss-intro-name">
              {(() => {
                const bossMeta = dungeon.waveMeta?.[dungeon.encounters.length - 1];
                return bossMeta?.name ? tr(bossMeta.name) : monsterName;
              })()}
            </div>
            <div className="dungeon-boss-intro-ready">{t("dungeon.bossIntro.ready")}</div>
          </div>
        </div>
      )}

      {/* Kopfzeile des Kampfes: links zurueck zu den Zonen, rechts der Abbruch (Chef 25.08.2026,
          "oben rechts wo End Fight ist, sollte oben links Zones stehen als gleicher Button").
          Der Zonen-Knopf beendet NICHTS — er blendet nur die Auswahl ein, der Kampf laeuft
          weiter (Spieler-Report 1.0.2: "Would like to be able to queue up more battles if I'm
          currently in combat"). Deshalb steht er hier als Gegenpol zum Abbruch und nicht als
          leise Nebenschaltflaeche.
          codex:2026-08-02T17:30:00+02:00 — eigener aktueller Ashen-Iron-Vertrag statt des
          veralteten universellen ButtonNew/Flee-Layers. */}
      <div className="battle-topbar">
        <button className="btn-iron combat-stop-btn combat-zones-btn" onClick={onShowEnemyList}>
          {t("combat.zones")}
        </button>
        <button className="btn-iron btn-iron--danger combat-stop-btn" onClick={() => stopCombat(state)}>
          {t("combat.flee")}
        </button>
      </div>

      {/* (Kampfstil-Wahl steht jetzt dauerhaft in der linken Combat-Loadout-Sidebar — Melee Focus —
          daher hier keine redundante Leiste über den Portraits mehr.) */}

      <div
        className={`battle-main${dockCollapsed ? " dock-collapsed" : ""}${recordCollapsed ? " record-collapsed" : ""}`}
        ref={battleMainRef}
      >
        {/* data-guide-id="combat.loadout": geteiltes Tour-Ziel mit der Auswahl-Sidebar unten
            (CombatPage-Rückgabe ohne aktiven Kampf) — je nachdem, welcher Sub-View beim ersten
            Seitenbesuch gerade steht, findet der Spotlight das tatsächlich gerenderte Element. */}
        <div className="battle-loadout-col" data-guide-id="combat.loadout">
          {/* codex:2026-08-02T12:48:00+02:00 — derselbe Frontline-Dock wie in der Zonenauswahl;
              Gear liegt links, rechts bleibt der Battle Record vollständig für Combat/Loot frei. */}
          <CombatLoadoutBar collapsed={dockCollapsed} onToggleCollapsed={onToggleDock} />
          {/* Task #333 (Chef-Feature): Rand-Handle rechts — Breite stufenlos ziehbar (200-480px),
              Doppelklick setzt sie zurück (Muster Sidebar.tsx .sb-resize-handle). Kollabiert macht
              ein Breiten-Zieher an einer 44px-Leiste keinen Sinn (Chef-Auftrag 2026-08-03) — ausgeblendet. */}
          {!dockCollapsed && (
          <div
            className="battle-loadout-resize"
            onPointerDown={handleLoadoutResizeStart}
            onDoubleClick={handleLoadoutResizeReset}
            role="separator"
            aria-orientation="vertical"
            title={t("combat.resizeHint")}
          />
          )}
        </div>

        {/* Arena-Rework (Chef-GO 2026-07-11, „komplettes Layout Rework"): EINE gemeinsame Szene
            statt zweier Einzel-Panels — Zonenbild/Ken-Burns-Drift/Partikel liegen genau EINMAL
            hier auf Arena-Ebene, ein Holzrahmen um das ganze Duell. Spieler links, Monster rechts
            (Monster-Art unverändert, nicht gespiegelt), dezente „VS"-Mitte. Der Kill-Cooldown-Blur
            trifft nur noch die Monster-Hälfte (`.enemy-cooldown-wrap` um Figur+Nameplate). */}
        {/* Kampf-Juice: `fx-<Stufe>`-Klasse als CSS-Gating-Anker (Crit-Zahlen-Pop/Vignette),
            `low-hp` = §6-Vignette (::after). Der FX-Layer (Funken/Beams/Ring/Flash) existiert
            NUR bei Stufe "full" — Abwesenheit im DOM ist der prüfbare reduziert/aus-Zustand. */}
        <div className={`battle-arena${backdropBg ? " has-backdrop" : ""} fx-${fxLevel}${lowHp ? " low-hp" : ""}`}>
          <header className="battle-fortress-context">
            <span className="battle-fortress-location">{battleLocation}</span>
            <span className="battle-fortress-target">
              {monsterName} · {t("combat.level").replace("{n}", String(monster.level))}
            </span>
          </header>
          {/* ── ARENA25D MOUNT SWITCH (Task #330) — der EINE Umschaltpunkt außerhalb von
              components/arena25d/. `arena25dActive` false (Flag aus/anderer Zone/Dungeon/Prod-
              Build) ⇒ der komplette else-Zweig ist byte-identisch zur bisherigen 2D-Darstellung
              (Regression-Risiko null). Entfernen: diesen Block durch seinen else-Zweig ersetzen,
              dann den Import oben löschen, dann den Ordner löschen. */}
          {arena25dActive ? (
            <Arena25DStage
              fxLevel={fxLevel}
              // 0.4.0-Arena Welle 1 (Chef-Entscheid 2026-08-03): welches Zonen-Manifest (Boden/
              // Kulisse/Licht/Props) geladen wird — s. components/arena25d/manifest.ts. Fallback
              // "" ist nur ein Typ-Nicht-Optional-Krückstock: `arena25dActive` (s.o.) hat
              // `monster.zone` bereits über `isArena25dActive` gegen ein gültiges, auflösbares
              // Manifest geprüft, bevor dieser Zweig überhaupt gerendert wird.
              zoneId={monster.zone ?? ""}
              // 0.4.0-Arena Welle 2 (design/battle-040-arena-produktion.md §5 Punkt 2 + Punkt 6):
              // dasselbe rohe Kampf-Log wie der 2D-Zweig (dessen "Neue Treffer..."-Effekt weiter
              // oben `cs.log` unverändert für Floater/SFX/2D-FX konsumiert) — Arena25DStage macht
              // seine EIGENE `seq`-Diff daraus (s. dortiges Modul-JSDoc "Choreografie-Architektur"),
              // komplett unabhängig von `lunge`/`hitFx` unten (die bleiben ausschließlich der
              // 2D-Zweig-Fütterung vorbehalten, s. deren Nachbar-Kommentare). Ersetzt die alten
              // `attackNonce`/`hitNonce`/`hitCrit`-Felder auf den Fighter-Objekten unten — die trägt
              // `Arena25DFighter` seit Welle 2 nicht mehr (s. dortiges Interface-JSDoc).
              log={cs.log}
              playerStyle={stats.style}
              player={{
                imgSrc: getPortrait(c.portrait),
                name: c.name,
                level: combatLevel(state),
                hpCur: c.hp,
                hpMax: stats.maxHp,
                // Chef-Nachtrag 2026-07-24 ("Manabalken fehlt"): dieselbe `showManaBar`-Ableitung
                // wie der 2D-Zweig weiter unten (Style==magic ODER Gear-Mana über dem Basiswert) —
                // `manaMax` bleibt undefined, wenn die 2D-Ansicht auch keine Leiste zeigen würde
                // (Arena25DStage rendert die Mana-Leiste nur bei `manaMax > 0`, s. dortiges JSDoc).
                manaCur: c.mana,
                manaMax: showManaBar ? stats.maxMana : undefined,
                wardCur: c.ward,
                wardMax: stats.maxWard,
                // Chef-Nachtrag ("Angriffsbalken fehlt"): identische Berechnung wie die 2D-
                // Nameplate weiter unten (`timerPct`/`playerTimerRemainingSec`).
                timerPct: (cs.playerTimerMs / stats.attackIntervalMs) * 100,
                timerRemainingSec: playerTimerRemainingSec,
                // Chef-Nachtrag ("Status-Effekte ... fehlt auch"): dieselbe Quelle wie der 2D-
                // `Fighter`s `effects`-Prop weiter unten, unverändert durchgereicht.
                effects: cs.playerEffects,
                floaters: floaters.filter((f) => f.target === "player"),
              }}
              monster={{
                imgSrc: cs.eliteVariantId ? getEliteMonsterSrc(cs.eliteVariantId, monster.id) : getMonsterSrc(monster.id),
                name: monsterName,
                level: monster.level,
                hpCur: cs.enemyHp,
                hpMax: monster.maxHp,
                wardCur: cs.enemyWard ?? monster.wardCapacity ?? 0,
                wardMax: monster.wardCapacity ?? 0,
                timerPct: (cs.enemyTimerMs / monster.attackIntervalMs) * 100,
                timerRemainingSec: enemyTimerRemainingSec,
                effects: cs.enemyEffects,
                dimmed: inCooldown,
                floaters: floaters.filter((f) => f.target === "enemy"),
              }}
              // Chef-Nachtrag ("End-Combat-Screen ... MUSS kommen ... gleiche Komponente/gleicher
              // State wie 2D, kein Duplikat der Logik"): dieselbe `KillSummaryCard`-Funktion/
              // derselbe `cs.lastKill`-State wie der 2D-Zweig (s. `enemy-cooldown-wrap` weiter
              // unten) — Arena25DStage platziert das fertige Element nur zentriert über dem Canvas.
              killSummary={cs.lastKill ? <KillSummaryCard lastKill={cs.lastKill} /> : null}
            />
          ) : (
            <>
          {backdropBg && (
            <div
              className={`fighter-backdrop-drift${backdropAspect === "landscape" ? " backdrop-landscape" : ""}${
                fxLevel === "full" && backdropAspect !== "landscape" ? "" : " static"
              }`}
              style={{ backgroundImage: `url("${backdropBg}")` }}
              aria-hidden="true"
            />
          )}
          {backdropBg && <ZoneParticles zoneKey={particleZoneKey} fxLevel={fxLevel} />}
          <div className="battle-arena-stage" ref={stageRef}>
            <div className="arena-side arena-side-player">
              <Fighter
                name={c.name}
                sub={meleeSub}
                imgSrc={getPortrait(c.portrait)}
                level={combatLevel(state)}
                hpCur={c.hp}
                hpMax={stats.maxHp}
                hpKind="hp"
                manaCur={c.mana}
                manaMax={showManaBar ? stats.maxMana : undefined}
                wardCur={c.ward}
                wardMax={stats.maxWard}
                effects={cs.playerEffects}
                timerPct={(cs.playerTimerMs / stats.attackIntervalMs) * 100}
                timerRemainingSec={playerTimerRemainingSec}
                floaters={floaters.filter((f) => f.target === "player")}
                attackNonce={lunge.player}
                isCasting={stats.style === "magic"}
                footer={playerFooter}
                details={playerDetails}
                hitChance={{ icon: statIcon("atk"), label: t("combat.prognosis.hitYou"), pct: prognosis.playerHit }}
                buffChips={<BuffChipsOverlay buffs={c.buffs} />}
                hitNonce={hitFx.player.n}
                hitCrit={hitFx.player.crit}
                statusFxNonce={statusFx.player.n}
                statusFxType={statusFx.player.type}
                fxLevel={fxLevel}
                companionSprite={
                  activePet
                    ? (
                      // Chef-Auftrag 27.08.2026 „mehr Kontext": das rohe `title=` (Name + Kind-Label +
                      // Takt) ersetzt durch denselben vollen Fähigkeitstext (petText.ts abilityText),
                      // den auch die Begleiter-Seite zeigt — als echte HoverTip statt Browser-Tooltip.
                      <HoverTip
                        as="div"
                        elementRef={(el) => { petSpriteRef.current = el; }}
                        className="battle-pet-sprite"
                        content={
                          <>
                            <span className="ct-tip-title">{tr(activePet.name)}</span>
                            <span className="ct-tip-desc">{abilityText(activePet, t, tr)}</span>
                          </>
                        }
                      >
                        {activePetSrc
                          ? <img loading="lazy" decoding="async" src={activePetSrc} alt={tr(activePet.name)} className="pixelart" />
                          : (
                            <span className="battle-pet-sprite-emoji">
                              {activePet.icon ?? (PAW_ICON_URL ? <img loading="lazy" decoding="async" src={PAW_ICON_URL} alt="" className="ui-icon" /> : "🐾")}
                            </span>
                          )}
                        {/* Task #296 P0 §1.4: separater Glow-Overlay, Farbe je combatAbility.kind-Bucket. */}
                        <div ref={petGlowRef} className="pet-ability-glow" />
                      </HoverTip>
                    )
                    : undefined
                }
              />
            </div>

            <div className="arena-vs" aria-hidden="true">{t("combat.vs")}</div>

            <div className="arena-side arena-side-enemy enemy-cooldown-wrap">
              <Fighter
                name={monsterName}
                sub={`${t("combat.level").replace("{n}", String(monster.level))} · ${t("combat.kills").replace("{n}", String(cs.kills))}`}
                subExtra={enemyDropsSub}
                // Task #325 Vhazrak-Art-Fix: `monster` ist im Elite-Fall `eliteDisplayMonster`s
                // Kopie mit der Basis-Mob-`id` (Kill-Credit-Konsistenz, s. dortiges JSDoc) — ein
                // reines `getMonsterSrc(monster.id)` konnte sich also NIE auf eigene Elite-Kunst
                // auflösen (z.B. `elite_border_warlock.webp`) und zeigte immer die Basis-Art
                // (`goblin_warlock.webp`), obwohl die Auswahl-Karte (EliteMonsterCard, s. dort)
                // korrekt `getEliteMonsterSrc(variant.id, m.id)` nutzt — derselbe Champion sah in
                // der Auswahl anders aus als im Kampf. `cs.eliteVariantId` bleibt für die volle
                // Kampfdauer gesetzt (erst der Kill räumt es, s. ChampionDefeatCeremony-JSDoc), ist
                // also ein sicherer Gate hier; `getEliteMonsterSrc` fällt selbst auf die Basis-Art
                // zurück, falls die Varianten-Grafik (noch) fehlt.
                imgSrc={cs.eliteVariantId ? getEliteMonsterSrc(cs.eliteVariantId, monster.id) : getMonsterSrc(monster.id)}
                enemy
                level={monster.level}
                hpCur={cs.enemyHp}
                hpMax={monster.maxHp}
                hpKind="enemy-hp"
                wardCur={cs.enemyWard ?? monster.wardCapacity ?? 0}
                wardMax={monster.wardCapacity ?? 0}
                effects={cs.enemyEffects}
                enraged={enraged}
                enrageLabel={t("combat.enrageActive")}
                regen={monster.regen}
                regenLabel={t("combat.regenHint")}
                timerPct={(cs.enemyTimerMs / monster.attackIntervalMs) * 100}
                timerRemainingSec={enemyTimerRemainingSec}
                floaters={floaters.filter((f) => f.target === "enemy")}
                attackNonce={lunge.enemy}
                details={enemyDetails}
                hitChance={{ icon: statIcon("def"), label: t("combat.prognosis.hitEnemy"), pct: prognosis.enemyHit }}
                dimmed={inCooldown}
                hitNonce={hitFx.enemy.n}
                hitCrit={hitFx.enemy.crit}
                statusFxNonce={statusFx.enemy.n}
                statusFxType={statusFx.enemy.type}
                dying={dying}
                fxLevel={fxLevel}
              />
              {cs.lastKill && <KillSummaryCard lastKill={cs.lastKill} />}
            </div>
            {/* Kampf-Juice: FX-Layer für gepoolte Funken/Projektile/Runen-Ring/Einschlag-Flash UND
                (Kampfeffekte Welle 1) die neuen Sprite-/Geschoss-Elemente — z-index 3 (über den
                Figuren, UNTER Buff-/Debuff-Chips z:4 und Nameplates z:5). Gerendert bei `fxLevel`
                "full" (alte Effekte) ODER `spriteFxLevel` !== "off" (neue Sprites, auch bei OS
                prefers-reduced-motion — s. spriteFxLevel-JSDoc). */}
            {(fxLevel === "full" || spriteFxLevel !== "off") && (
              <div className="arena-fx-layer" ref={fxLayerRef} aria-hidden="true" />
            )}
          </div>
            </>
          )}
        </div>

        <div
          className={`battle-log-panel${recordCollapsed ? " cl-dock--collapsed" : ""}`}
          ref={logPanelRef}
        >
          {/* Chef-Auftrag 2026-08-03: derselbe Kollaps-Griff wie am Ausrüstungs-Dock (side="left"
              dort, hier gespiegelt), s. CombatDockToggle-JSDoc weiter oben. */}
          <CombatDockToggle
            side="right"
            collapsed={recordCollapsed}
            onToggle={onToggleRecord}
            hint={t("combat.record.toggleHint")}
            label={t("combat.battleRecord")}
          />
          {!recordCollapsed && (
          <>
          {/* codex:2026-08-02T12:36:00+02:00 — echter Battle Record statt Mockup-Dossier:
              Combat zeigt alle aktiven Filter; Loot isoliert nur echte Loot-/Gold-Events. */}
          <div className="battle-record-title">{t("combat.battleRecord")}</div>
          <div className="battle-log-tabs">
            <button
              className={`battle-log-tab${logTab === "combat" ? " active" : ""}`}
              onClick={() => setLogTab("combat")}
            >
              {t("combat.logTab.combat")}
            </button>
            <button
              className={`battle-log-tab${logTab === "loot" ? " active" : ""}`}
              onClick={() => setLogTab("loot")}
            >
              {t("combat.logTab.loot")}
            </button>
            {/* Task #333 (Chef-Feature "Log-Settings wie in WoW"): Zahnrad öffnet ein Popover mit
                einer Checkbox je Log-Kategorie — reiner Anzeigefilter, s. logEventCategory/
                logLines-Memo oben (die Engine sammelt jedes Event unverändert weiter). */}
            <div className="battle-log-settings-wrap" ref={logSettingsWrapRef}>
              <button
                type="button"
                className={`battle-log-settings-btn${logSettingsOpen ? " open" : ""}`}
                onClick={() => setLogSettingsOpen((o) => !o)}
                title={t("combat.log.settingsBtn")}
                aria-label={t("combat.log.settingsBtn")}
                aria-expanded={logSettingsOpen}
              >
                ⚙️
              </button>
              {logSettingsOpen && (
                <div className="battle-log-settings-pop">
                  <span className="battle-log-settings-title">{t("combat.log.settingsTitle")}</span>
                  {COMBAT_LOG_CATEGORIES.map((cat) => (
                    <label key={cat} className="battle-log-settings-row">
                      <input
                        type="checkbox"
                        checked={logFilters.has(cat)}
                        onChange={() => toggleLogFilter(cat)}
                      />
                      {t(`combat.log.cat.${cat}`)}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="battle-log">{logLines}</div>
          {/* codex:2026-08-02T16:20:00+02:00 — Adaptive-Fortress-Abschluss: Die laufende
              Sitzungsbilanz gehört zum Battle Record, nicht in den Gear-Tab. */}
          <div className="battle-record-session"><SessionTallyRow /></div>
          {/* Task #333: Eck-Handle unten links — zieht Breite UND Höhe gleichzeitig (120px-85vh),
              Doppelklick setzt beides zurück (Muster Sidebar.tsx .sb-resize-handle).
              Chef-Nachschlag 24.07.: dazu volle Kanten-Griffe links (Breite) + unten (Höhe). */}
          <div
            className="battle-log-resize-w"
            onPointerDown={handleLogWidthResizeStart}
            onDoubleClick={handleLogResizeReset}
            role="separator"
            aria-orientation="vertical"
            title={t("combat.resizeHint")}
          />
          <div
            className="battle-log-resize-h"
            onPointerDown={handleLogHeightResizeStart}
            onDoubleClick={handleLogResizeReset}
            role="separator"
            aria-orientation="horizontal"
            title={t("combat.resizeHint")}
          />
          <div
            className="battle-log-resize"
            onPointerDown={handleLogResizeStart}
            onDoubleClick={handleLogResizeReset}
            role="separator"
            aria-orientation="vertical"
            title={t("combat.resizeHint")}
          />
          </>
          )}
        </div>
      </div>

    </div>
  );
}

/** Detail-Modal das beim Klick auf einen Map-Token erscheint. */
function ZoneMapTokenModal({
  monster,
  onClose,
  onFight,
}: {
  monster: MonsterDef;
  onClose: () => void;
  onFight: () => void;
}): JSX.Element {
  const { t, tr } = useI18n();
  const src = getMonsterSrc(monster.id);
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="zonemap-token-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close ds-close-button" onClick={onClose} aria-label={t("combat.close")} />
        <div className="zonemap-token-modal-img">
          {src ? (
            <img loading="lazy" decoding="async" src={src} alt={tr(monster.name)} />
          ) : (
            <span className="zonemap-token-modal-ph">⚔</span>
          )}
        </div>
        <div className="zonemap-token-modal-name">{tr(monster.name)}</div>
        <div className="zonemap-token-modal-meta muted">
          {t("combat.level").replace("{n}", String(monster.level))}
          {" · "}{statIcon("hp")} {formatStat(monster.maxHp)}
          {" · "}{statIcon("atk")} {formatStat(monster.damage)}
          {" · "}{statIcon("def")} {formatStat(monster.defense)}
        </div>
        <div className="zonemap-token-modal-actions">
          <button className="shop-citadel-btn" onClick={onClose}>
            {t("combat.close")}
          </button>
          <button className="btn-iron" onClick={onFight}>
            {t("combat.fight")}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Berechnet Auto-Grid-Positionen für N Tokens über eine 100×100-Prozent-Fläche.
 *  Columns/Rows werden so gewählt, dass Tokens möglichst groß sind und sich nicht überlappen.
 *  Gibt für jeden Monster-Index { x, y, size } zurück (Mittelpunkte in %). */
function computeGridPositions(
  count: number,
): Array<{ x: number; y: number; size: number }> {
  if (count === 0) return [];
  // Aspect ratio ca. 16:9 → Spalten breiter als Zeilen.
  const aspectRatio = 16 / 9;
  const cols = Math.ceil(Math.sqrt(count * aspectRatio));
  const rows = Math.ceil(count / cols);
  // Zellgröße in Prozent (bezogen auf die Map-Dimensionen).
  const cellW = 100 / cols;
  const cellH = 100 / rows;
  // Token-Durchmesser: kleinere Zellseite abzüglich 20 % Padding.
  // Da cellW/cellH in unterschiedlichen Einheiten (px-Verhältnis) stehen,
  // nutzen wir einfach den kleineren der beiden Prozentwerte als Basisgröße.
  const minCell = Math.min(cellW, cellH);
  // Skalierungsfaktor: Default-Ring ist 54 px bei scale=1.
  // Wir schätzen: 1 % der Map-Höhe ≈ (viewport-Höhe / 100).
  // Statt absoluter Pixel rechnen wir relativ: minCell % der kleineren Achse.
  // Für eine vernünftige Größe: size = minCell / 10 (heuristisch, ergibt 1.0–2.5 für typische Grids).
  const size = Math.max(0.5, Math.min(3.0, minCell / 10));

  return Array.from({ length: count }, (_, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    return {
      x: (col + 0.5) * cellW,
      y: (row + 0.5) * cellH,
      size,
    };
  });
}

/** Immersive Map-Ansicht einer Zone: Hintergrundbild + klickbare Mob-Tokens.
 *  Klick auf einen Token öffnet ein Detail-Modal statt sofort den Kampf zu starten.
 *  Wenn alle Monster der Zone hand-platziert sind, werden gespeicherte Positionen genutzt;
 *  sonst Auto-Grid für alle Mobs der Zone. */
function ZoneMapView({
  zoneId,
  monsters,
  onFight,
}: {
  zoneId: string;
  monsters: MonsterDef[];
  onFight: (m: MonsterDef) => void;
}): JSX.Element {
  const { tr } = useI18n();
  const [detailMonster, setDetailMonster] = useState<MonsterDef | null>(null);

  const bg = getZoneBackground(zoneId);
  const zoneMap = getZoneMap(zoneId);
  const hotspots = zoneMap?.hotspots ?? [];

  // Vorrang gespeicherter Positionen: nur wenn ALLE Monster der Zone einen Hotspot haben.
  const allMonstersPlaced =
    monsters.length > 0 &&
    monsters.every((m) => hotspots.some((h) => h.monsterId === m.id));

  // Token-Daten: entweder gespeicherte Hotspots oder Auto-Grid für alle Monster.
  const tokens: Array<{ monster: MonsterDef; x: number; y: number; size: number }> =
    allMonstersPlaced
      ? hotspots.flatMap((spot) => {
          const monster = monsters.find((m) => m.id === spot.monsterId);
          return monster
            ? [{ monster, x: spot.x, y: spot.y, size: spot.size ?? 1 }]
            : [];
        })
      : (() => {
          const gridPos = computeGridPositions(monsters.length);
          return monsters.map((monster, i) => {
            // gridPos hat exakt monsters.length Einträge (garantiert durch computeGridPositions)
            const pos = gridPos[i]!;
            return { monster, x: pos.x, y: pos.y, size: pos.size };
          });
        })();

  return (
    <div className="zonemap-wrap">
      <div
        className="zonemap-stage"
        style={bg ? { backgroundImage: `url("${bg}")` } : undefined}
      >
        {tokens.map(({ monster, x, y, size }) => {
          const src = getMonsterSrc(monster.id);
          return (
            <div
              key={monster.id}
              className="zonemap-token"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                transform: `translate(-50%, -50%) scale(${size})`,
              }}
              role="button"
              tabIndex={0}
              onClick={() => setDetailMonster(monster)}
              onKeyDown={(e) => {
                if (e.key !== "Enter" && e.key !== " ") return;
                e.preventDefault();
                setDetailMonster(monster);
              }}
            >
              <div className="zonemap-token-ring">
                {src ? (
                  <img loading="lazy" decoding="async" src={src} alt={tr(monster.name)} />
                ) : (
                  <span className="zonemap-token-emoji">⚔</span>
                )}
              </div>
              <span className="zonemap-token-label">{tr(monster.name)}</span>
            </div>
          );
        })}
      </div>

      {detailMonster && (
        <ZoneMapTokenModal
          monster={detailMonster}
          onClose={() => setDetailMonster(null)}
          onFight={() => {
            onFight(detailMonster);
            setDetailMonster(null);
          }}
        />
      )}
    </div>
  );
}

/**
 * Verdikt-Vereinheitlichung (Chef-GO 2026-07-09): Der Karten-Rahmen/Chip folgt dem gear-bewussten
 * Prognose-Verdikt (#305) statt der alten rein level-basierten Einstufung — EINE Wahrheit pro
 * Karte. Mapping auf die bestehenden diff-CSS-Klassen (Farben passen semantisch 1:1).
 */
function verdictFrameTier(verdict: "strong" | "even" | "risky"): "easy" | "close" | "danger" {
  return verdict === "strong" ? "easy" : verdict === "even" ? "close" : "danger";
}

/**
 * Gemeinsame Monster-Auswahl-Karte (Zone + Slayer-Turm — vorher dupliziert).
 * Task #273 Chef-Rework: Porträt oben — Level/Risiko oben rechts, Mechanik-Badges (Enrage/Regen/
 * Inflict/Resist) oben links (unter dem optionalen Slayer-Ziel-Ribbon), XP-Wert unten rechts als
 * Overlay. Kein Gold mehr (Monster droppen kein Raw-Gold, content: gold=0 überall). Darunter der
 * texturierte Stat-Block: Name, die 6 Kampfwerte im 2×3-Raster (Optik wie CombatStatsPanel im
 * Charakter-Bildschirm, s. components/EquipmentOverview.tsx), Drops einzeilig ohne Label-Text,
 * und EIN voller Fight-Button (Details-Button + Detail-Modal entfernt — alle Werte stehen jetzt
 * direkt im Frame).
 */
function MonsterCard({
  m,
  cardBg,
  isTaskTarget,
  playerCombatLevel,
  offenseLevel,
  stats,
  reqItem,
  reqMet = true,
  onQueue,
}: {
  m: MonsterDef;
  cardBg: string | null;
  isTaskTarget: boolean;
  playerCombatLevel: number;
  offenseLevel: number;
  /** Task #305: einmal pro Render (MonsterSelect/TowerFloorView) memoized computeStats-Ergebnis
   *  — NICHT hier pro Karte neu berechnet, s. combatPrognosis-Aufruf unten. */
  stats: DerivedStats;
  reqItem?: ItemDef;
  reqMet?: boolean;
  /**
   * Task #315 (Kampf-Queue-UI): ersetzt das frühere `onFight: () => void` (direkter `startCombat`-
   * Aufruf) — JEDER Klick reiht jetzt über `enqueueFight` ein (Muster identisch zu den Skill-
   * Karten, s. SkillPage.tsx `skillcard-craft-cta`-JSDoc "JEDER Klick queued jetzt"). `target`:
   * endliche Kill-Zahl (1/25/50/…) oder `null` = ∞ (läuft bis zum manuellen Stopp). `atFront`
   * (Task #327, Priority-UI): true bei Shift-Klick — der Aufrufer wählt dann `enqueueFightAtFront`
   * statt `enqueueFight` (sofort losschlagen statt hinten anstellen, s. QuantityPicker `onPick`-JSDoc).
   */
  onQueue: (target: number | null, atFront: boolean) => void;
}): JSX.Element {
  const { t, tr } = useI18n();
  const monsterSrc = getMonsterSrc(m.id);
  const xpIsZero = combatXpLevelMult(offenseLevel, m.level) === 0;
  const prognosis = combatPrognosis(stats, m);
  const diffTier = verdictFrameTier(prognosis.verdict);
  const hasResist = !!(m.resist && m.resist.length > 0);
  const hasTraits = !!(m.enrage || m.regen || m.inflict || hasResist);
  return (
    <div
      id={`monstercard-${m.id}`}
      className={`monster-card diff-${diffTier}${cardBg ? " has-bg" : ""}${isTaskTarget ? " slayer-target" : ""}`}
    >
      {/* Chef-Fix 25.07. (Screenshot 49, „Hintergründe kaputt"): das Zonen-BG hängt jetzt am
          ARTWORK-FENSTER statt an der ganzen Karte — auf der Karte wanderte es mit
          `background-position: bottom` unsichtbar hinter den Footer; hier zeigt es im sichtbaren
          Fenster volle Breite mit Boden-Anker (Formel s. combat.css .monster-card-artwork). */}
      <div
        className="monster-card-artwork"
        style={cardBg ? { backgroundImage: `url("${cardBg}")` } : undefined}
      >
        {monsterSrc
          ? <img loading="lazy" decoding="async" src={monsterSrc} alt={tr(m.name)} />
          : <span className="monster-card-ph">⚔</span>}

        {/* Oben links: Slayer-Ziel-Ribbon (falls aktiv) + XP-Wert. Chef 25.07.: die Mechanik-
            Badges (Enrage/Regen/Inflict/Resist) zogen von hier nach UNTEN LINKS
            (.monster-card-bl-stack) — oben links steht seit #335 die XP, das drängelte sich. */}
        <div className="monster-card-tl-stack">
          {isTaskTarget && (
            <span className="slayer-target-badge">{t("slayer.task.targetBadge")}</span>
          )}
          <div
            className={`monster-card-xp-badge${xpIsZero ? " xp-zero" : ""}`}
            title={xpIsZero ? t("combat.xpNone") : undefined}
          >
            {xpIsZero ? t("combat.xpNone") : `${m.xp} XP`}
          </div>
        </div>

        {/* Unten links: Mechanik-Badges (Chef 25.07., „genau so wie die anderen Faktoren wie
            Immunitäten" — die ganze Trait-Reihe als Gruppe am unteren Fensterrand). */}
        {hasTraits && (
          <div className="monster-card-bl-stack">
            <div className="mc-trait-badges">
              {m.enrage && (
                <span className="mc-trait-badge mc-trait-enrage" title={t("combat.enrageHint")}>
                  <EnrageIcon size={16} />
                </span>
              )}
              {m.regen && (
                <span className="mc-trait-badge" title={t("combat.regenHint")}>
                  {REGEN_ICON_URL
                    ? <img loading="lazy" decoding="async" src={REGEN_ICON_URL} alt="" className="ui-icon trait-badge-icon" />
                    : "♻"}
                </span>
              )}
              {m.inflict && (
                <span className="mc-trait-badge mc-trait-warn" title={inflictHintFor(t, m.inflict.type)}>
                  {renderEffectIcon(m.inflict.type)}
                </span>
              )}
              {hasResist && (
                <span className="mc-trait-badge" title={t("combat.immuneHint")}>
                  {IMMUNE_ICON_URL
                    ? <img loading="lazy" decoding="async" src={IMMUNE_ICON_URL} alt="" className="ui-icon trait-badge-icon" />
                    : "🚫"}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Oben rechts: Level + Prognose-Verdikt (vereinheitlicht 2026-07-09 — der alte level-basierte
            Schwierigkeits-Text ist ersetzt; combat.diff.*-Keys bleiben vorerst ungenutzt liegen). */}
        <div className="monster-card-level-badge">
          <span className="mc-level-num">{t("combat.levelShort").replace("{n}", String(m.level))}</span>
          <span className={`mc-level-diff diff-${diffTier}`}>{t(`combat.prognosis.${prognosis.verdict}`)}</span>
        </div>
      </div>
      <div className="monster-card-footer">
        <DiffNameLabel tier={xpIsZero ? "zero" : prognosis.nameTier} className={`monster-card-name diffname-${xpIsZero ? "zero" : prognosis.nameTier}`}>
          {tr(m.name)}
        </DiffNameLabel>
        <DefenseTypeBadge type={m.defenseType} />

        <StatLine
          className="monster-card-stats"
          showLabels
          entries={[
            { key: "hp", icon: statIcon("hp"), label: t("combat.hp"), value: formatStat(m.maxHp) },
            { key: "atk", icon: statIcon("atk"), label: t("combat.dmg"), value: formatStat(m.damage) },
            { key: "def", icon: statIcon("def"), label: t("stat.defense"), value: formatStat(m.defense) },
            { key: "acc", icon: statIcon("acc"), label: t("stat.accuracy"), value: formatStat(m.accuracy) },
            { key: "eva", icon: statIcon("eva"), label: t("stat.evasion"), value: formatStat(m.evasion) },
            { key: "spd", icon: statIcon("spd"), label: t("stat.speed"), value: `${formatSeconds1(m.attackIntervalMs / 1000)}s` },
          ]}
        />

        {/* Task #305 — Kampf-Transparenz: deine Chance · seine Chance + Verdikt-Badge, EINE
            kompakte Zeile (kein eigener Kasten, sprengt die Karte nicht höher). */}
        <div className="monster-card-prognosis">
          <span className="mc-prognosis-chance" title={t("combat.prognosis.hitYou")}>
            {statIcon("atk")} {Math.round(prognosis.playerHit * 100)}%
          </span>
          <span className="mc-prognosis-sep">·</span>
          <span className="mc-prognosis-chance" title={t("combat.prognosis.hitEnemy")}>
            {statIcon("def")} {Math.round(prognosis.enemyHit * 100)}%
          </span>
          {/* Verdikt-Wort lebt seit der Vereinheitlichung oben im Level-Chip — hier nur die zwei Chancen. */}
        </div>

        {reqItem && (
          <div className={`monster-card-slayer-req${reqMet ? "" : " missing"}`}>
            {t("combat.slayerRequires").replace("{item}", tr(reqItem.name))}
          </div>
        )}

        {m.loot.length > 0 && (
          <div className="monster-card-drops">
            {m.loot.map((roll) => (
              <DropIcon key={roll.itemId} monsterId={m.id} roll={roll} />
            ))}
          </div>
        )}

        {/* Task #315 — Kampf-Queue-Mengen-Grid: dasselbe 1×/25×/50×/∞-Preset-Set wie die Sammel-/
            Craft-Karten (CRAFT_TARGET_PRESETS), plus die freie Mengeneingabe des geteilten
            QuantityPicker (UI-Brainstorm 2026-07-24 §3 "Ein gemeinsamer Mengen-Baustein"). Jeder
            Klick reiht via `enqueueFight` ein (Gate-Prüfung erst beim Queue-Start, s. Engine-
            JSDoc) — kein direkter `startCombat` mehr, s. `onQueue`-Kommentar oben. Task #327
            (Priority-UI): Shift-Klick auf einen der Mengen-/∞-/Frei-Knöpfe reicht `atFront=true`
            durch (QuantityPicker `onPick`/`onInfinite`-JSDoc) — `onQueue` wählt dann
            `enqueueFightAtFront` statt `enqueueFight`. Der ⇧-Hinweis-Chip daneben trägt den Shift-
            Tipp als eigene HoverTip (statt ins `title` der Karte gequetscht — der bleibt exklusiv
            dem Slayer-Gate-Hinweis vorbehalten, sonst würde einer der beiden je nach reqMet
            unsichtbar).
            data-guide-id: Ziel des Kampf-Bereichs-Tour-Schritts "combat.autoBattleCore"
            (areaTourSteps.ts) — sitzt auf jeder Karte, der Spotlight greift die erste im DOM. */}
        <div
          className="monster-card-actions mc-queue-actions"
          data-guide-id="combat.autoBattleCore"
          title={!reqMet && reqItem ? t("combat.slayerRequires").replace("{item}", tr(reqItem.name)) : undefined}
        >
          {/* Task #348 (Spieler-Feedback 93h): der alte Sofort-Kämpfen-Button ist zurück, als
              auffälliger Primär-CTA ÜBER dem Mengen-Grid. Seit #315 queued jeder Klick
              (enqueueFight) und seit #327 gibt es die Priorität (enqueueFightAtFront) bereits —
              nur eben unsichtbar hinter Shift-Klick versteckt. `onQueue(null, true)`: ∞-Ziel,
              `atFront=true` → derselbe `enqueueFightAtFront`-Pfad wie ein Shift-Klick auf einen
              Mengen-Knopf (s. onQueue-JSDoc oben) — kämpft SOFORT, die zuvor laufende Aktivität
              rückt mit ihrem Rest-Ziel an die Queue-Front zurück statt verworfen zu werden.
              Mengen-Knöpfe + Shift-Klick-Priorität bleiben unverändert fürs Vorausplanen. */}
          <button
            type="button"
            className="btn-iron mc-fight-now-btn"
            disabled={!reqMet}
            title={t("combat.fightNowHint")}
            onClick={() => onQueue(null, true)}
            // Task #351 (Bot-Toolkit, ui-dev): additiver Hook fürs `ui-audit/bot.mjs`
            // `fight-now:<monsterId>`-Kommando — s. `data-bot-zone`-Kommentar oben, gleiches Muster.
            data-bot-fight-now={m.id}
          >
            ⚔ {t("combat.fight")}
          </button>
          <QuantityPicker
            className="mc-queue-picker"
            presets={CRAFT_TARGET_PRESETS}
            onPick={(qty, atFront) => onQueue(qty, atFront)}
            onCustom={() =>
              openQueueAmountModal({
                subject: tr(m.name),
                onQueue: (qty) => onQueue(qty, false),
                onNow: (qty) => onQueue(qty, true),
              })
            }
            infiniteLabel="∞"
            onInfinite={(atFront) => onQueue(null, atFront)}
            disabled={!reqMet}
          />
          {reqMet && (
            <HoverTip
              as="span"
              className="mc-shift-hint"
              focusable={false}
              content={<span className="ct-tip-desc">{t("queue.shiftStartHint")}</span>}
            >
              ⇧
            </HoverTip>
          )}
        </div>
      </div>
    </div>
  );
}

/** mm:ss-Countdown fürs Elite-Verfügbarkeitsfenster (`ELITE_WINDOW_MS` = 15 Min — nie Stunden).
 *  Dünner Alias auf die geteilte `formatMmSs` (util/format.ts, Jagd-Paket-Extraktion) — Name
 *  bleibt hier stehen, da er an vielen Stellen dieser Datei referenziert wird. */
function formatEliteCountdown(ms: number): string {
  return formatMmSs(ms);
}

/**
 * Elite-/World-Spawn-Karte (design/elite-spawns-concept.md §2.3, Phase 3 UI): dieselbe visuelle
 * Sprache wie MonsterCard (Artwork/Stat-Block/Drops), aber IMMER ganz oben im Grid, mit episch
 * gerahmtem Rand (`--rar-legendary`, Muster paragon-preview-boss/dungeon-skull-boss). Zeigt den
 * Varianten-TITEL statt des bloßen Basis-Mob-Namens — `m` (die formel-skalierte Instanz aus
 * `eliteScaledMonster`) behält bewusst den Basis-Namen für die Kill-Credit-Konsistenz (s. dortiges
 * JSDoc), `variant.name` trägt den eigentlichen Titel. Countdown „Verschwindet in {m:ss}" tickt
 * automatisch mit (der Aufrufer re-rendert diese Seite jeden Tick, `remainingMs` kommt frisch aus
 * `state.eliteZones`). Drop-Vorschau (Chef-Fix 2026-07-22, Teil 2): KEINE hervorgehobene Unique-
 * Vorschau mehr — stattdessen dieselbe `.monster-card-drops`-Leiste + `DropIcon`-Silhouetten-
 * Discovery wie bei einer normalen `MonsterCard`, gespeist aus `variant.uniqueItemId` +
 * `variant.extraLoot`. Discovery-Quelle ist `m.id` (die Basis-Monster-Id): `onEliteKilled`
 * (engine/elites.ts) markiert beide Drop-Kategorien exakt darüber via `markDropSeen(state,
 * monster.id, …)`, wobei `monster` dort dieselbe formel-skalierte Instanz mit Basis-Id ist wie `m`
 * hier — ein gefundener Unique erscheint also sofort aufgedeckt.
 */
function EliteMonsterCard({
  m,
  variant,
  cardBg,
  remainingMs,
  offenseLevel,
  stats,
  busy,
  onFight,
}: {
  m: MonsterDef;
  variant: EliteVariantDef;
  cardBg: string | null;
  remainingMs: number;
  offenseLevel: number;
  stats: DerivedStats;
  busy: boolean;
  onFight: () => void;
}): JSX.Element {
  const { t, tr } = useI18n();
  const eliteSrc = getEliteMonsterSrc(variant.id, m.id);
  const xpIsZero = combatXpLevelMult(offenseLevel, m.level) === 0;
  const prognosis = combatPrognosis(stats, m);
  const diffTier = verdictFrameTier(prognosis.verdict);
  const uniqueItem = content.items[variant.uniqueItemId];
  const countdownLabel = t("combat.elite.countdown").replace("{time}", formatEliteCountdown(remainingMs));
  const extraLoot = variant.extraLoot ?? [];

  return (
    <div
      className={`monster-card elite-monster-card diff-${diffTier}${cardBg ? " has-bg" : ""}`}
    >
      {/* Chef-Fix 25.07.: BG am Artwork-Fenster statt an der Karte — s. MonsterCard-Kommentar. */}
      <div
        className="monster-card-artwork"
        style={cardBg ? { backgroundImage: `url("${cardBg}")` } : undefined}
      >
        {eliteSrc
          ? <img loading="lazy" decoding="async" src={eliteSrc} alt={tr(variant.name)} />
          : <span className="monster-card-ph">⚔</span>}

        <span className="elite-card-chip">⚔ {t("combat.elite.badge")}</span>

        <div className="monster-card-level-badge">
          <span className="mc-level-num">{t("combat.levelShort").replace("{n}", String(m.level))}</span>
          <span className={`mc-level-diff diff-${diffTier}`}>{t(`combat.prognosis.${prognosis.verdict}`)}</span>
        </div>

        <div className="elite-card-countdown" title={countdownLabel}>
          {countdownLabel}
        </div>
      </div>
      <div className="monster-card-footer">
        <DiffNameLabel tier={xpIsZero ? "zero" : prognosis.nameTier} className={`monster-card-name elite-card-name diffname-${xpIsZero ? "zero" : prognosis.nameTier}`}>
          {tr(variant.name)}
        </DiffNameLabel>
        <DefenseTypeBadge type={m.defenseType} />

        <StatLine
          className="monster-card-stats"
          showLabels
          entries={[
            { key: "hp", icon: statIcon("hp"), label: t("combat.hp"), value: formatStat(m.maxHp) },
            { key: "atk", icon: statIcon("atk"), label: t("combat.dmg"), value: formatStat(m.damage) },
            { key: "def", icon: statIcon("def"), label: t("stat.defense"), value: formatStat(m.defense) },
            { key: "acc", icon: statIcon("acc"), label: t("stat.accuracy"), value: formatStat(m.accuracy) },
            { key: "eva", icon: statIcon("eva"), label: t("stat.evasion"), value: formatStat(m.evasion) },
            { key: "spd", icon: statIcon("spd"), label: t("stat.speed"), value: `${formatSeconds1(m.attackIntervalMs / 1000)}s` },
          ]}
        />

        <div className="monster-card-prognosis">
          <span className="mc-prognosis-chance" title={t("combat.prognosis.hitYou")}>
            {statIcon("atk")} {Math.round(prognosis.playerHit * 100)}%
          </span>
          <span className="mc-prognosis-sep">·</span>
          <span className="mc-prognosis-chance" title={t("combat.prognosis.hitEnemy")}>
            {statIcon("def")} {Math.round(prognosis.enemyHit * 100)}%
          </span>
        </div>

        {(uniqueItem || extraLoot.length > 0) && (
          <div className="monster-card-drops">
            {uniqueItem && (
              <DropIcon
                monsterId={m.id}
                roll={{
                  itemId: variant.uniqueItemId,
                  chance: variant.uniqueDropChance ?? ELITE_UNIQUE_DROP_CHANCE_DEFAULT,
                  min: 1,
                  max: 1,
                }}
              />
            )}
            {extraLoot.map((roll) => (
              <DropIcon key={roll.itemId} monsterId={m.id} roll={roll} />
            ))}
          </div>
        )}

        {/* 1.1.0 (Chef-Fund): Dieser Knopf hiess "mc-fight-btn" — eine Klasse, fuer die es
            NIRGENDS eine Regel gibt. Er fiel damit auf den nackten Grundknopf zurueck und sah
            neben der normalen Monsterkarte veraltet aus, deren Kampf-Knopf "mc-fight-now-btn"
            heisst und von gravewood-fighter-cards.css gestaltet wird. Ein Buchstabendreher im
            Klassennamen, zwei Jahre unbemerkt. Jetzt dieselbe Klasse, dieselbe Optik. */}
        <div className="monster-card-actions">
          <button
            className="btn-iron mc-fight-now-btn"
            disabled={busy}
            title={busy ? t("combat.elite.fightBusy") : undefined}
            onClick={onFight}
          >
            {t("combat.fight")}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Slayer-Turm — Anzeige der Monster einer freigeschalteten Etage (gleicher Stil wie normale Zone). */
function TowerFloorView({
  floor,
  onBack,
}: {
  floor: SlayerTowerFloor;
  onBack: () => void;
}): JSX.Element {
  const state = useGameState();
  const { t, tr } = useI18n();
  const offenseLevel = playerOffenseSkillLevel(state);
  const playerCombatLevel = combatLevel(state);
  // Task #305: einmal je Render, nicht pro Karte neu (s. combatPrognosis-Kommentar in MonsterCard).
  const stats = useMemo(() => computeStats(state, content), [state]);

  const task = getActiveTask(state);
  const taskMonsterId = task ? task.monsterId : null;

  const floorMonsters = floor.monsters
    .map((id) => content.monsters[id])
    .filter((m): m is MonsterDef => m !== undefined);

  return (
    <div className="combat-select">
      <div className="zone-detail-head">
        <button className="zone-back" onClick={onBack}>
          ← {t("combat.allZones")}
        </button>
        <h2 className="block-heading">{tr(floor.name)}</h2>
      </div>
      <div className="monster-grid">
        {floorMonsters.map((m) => {
          const cardBg = getBattleScreenCard(`slayer_tower_${floor.floor}`) ?? getZoneBackgroundCard(`slayer_tower_${floor.floor}`) ?? getBattleScreenCard(m.zone) ?? getZoneBackgroundCard(m.zone);
          const reqItem = m.slayerRequirement ? content.items[m.slayerRequirement] : undefined;
          return (
            <MonsterCard
              key={m.id}
              m={m}
              cardBg={cardBg}
              isTaskTarget={m.id === taskMonsterId}
              playerCombatLevel={playerCombatLevel}
              offenseLevel={offenseLevel}
              stats={stats}
              reqItem={reqItem}
              reqMet={slayerRequirementMet(state, content, m.id)}
              onQueue={(target, atFront) =>
                (atFront ? enqueueFightAtFront : enqueueFight)(state, content, m.id, target)
              }
            />
          );
        })}
      </div>
    </div>
  );
}

/**
 * Paragonturm-Vorschaukarte (dungeon-rework-spec §7, Welle P2): dieselbe visuelle Sprache wie
 * eine normale Monster-Karte (`.monster-card`-Klassen, s. MonsterCard oben) — Artwork + gelabelte
 * Kern-Stats (HP/DMG/ACC, die drei per Formel skalierten Werte) —, aber standalone (keine
 * Fight-Aktion; der große "Aufstieg"-Button daneben startet die Etage) und mit Boss-/Truhen-
 * Kennzeichnung statt Prognose/XP (die Etage hat weder XP-Grauung noch eine Loot-Tabelle).
 */
function ParagonPreviewCard({ preview }: { preview: ParagonFloorPreview }): JSX.Element {
  const { t, tr } = useI18n();
  const m = preview.monster;
  const src = getMonsterSrc(m.id);
  const hasWard = (m.wardCapacity ?? 0) > 0;
  return (
    <div className={`monster-card paragon-preview-card${preview.isBoss ? " paragon-preview-boss" : ""}`}>
      <div className="monster-card-artwork">
        {src
          ? <img loading="lazy" decoding="async" src={src} alt={tr(m.name)} />
          : <span className="monster-card-ph">⚔</span>}
        {preview.isBoss && (
          <span className="paragon-boss-chip" title={t("dungeon.waveKind.boss")}>
            {BOSS_ICON_URL ? <img loading="lazy" decoding="async" src={BOSS_ICON_URL} alt="" className="ui-icon" /> : "💀"}{" "}
            {t("dungeon.waveKind.boss")}
          </span>
        )}
      </div>
      <div className="monster-card-footer">
        <div className="monster-card-name">{tr(m.name)}</div>
        {/* Fix-Welle CC (Aldric, Befund 1): die Karte war auf 190px fixiert (viel schmaler als
            der ~420px-Rahmen, für den .monster-card-name/.monster-card-stats ausgelegt sind) —
            Name+Stat-Zahlen liefen in die Ellipsis ("LE…"/"1…"). CSS-Breite angehoben (s.
            combat.css .paragon-preview-card). Zusätzlich DEF/EVA/SPD ergänzt (matcht die 6-Stat-
            MonsterCard) + Ward NUR wenn die Etage tatsächlich einen Ward-Pool trägt (Feld ist
            optional — paragonScaledMonster lässt es bei ward=0 komplett weg). */}
        <StatLine
          className="monster-card-stats"
          showLabels
          entries={[
            { key: "hp", icon: statIcon("hp"), label: t("combat.hp"), value: formatStat(m.maxHp) },
            ...(hasWard
              ? [{ key: "ward", icon: statIcon("ward"), label: t("char.ward"), value: formatStat(m.wardCapacity ?? 0) }]
              : []),
            { key: "atk", icon: statIcon("atk"), label: t("combat.dmg"), value: formatStat(m.damage) },
            { key: "def", icon: statIcon("def"), label: t("stat.defense"), value: formatStat(m.defense) },
            { key: "acc", icon: statIcon("acc"), label: t("stat.accuracy"), value: formatStat(m.accuracy) },
            { key: "eva", icon: statIcon("eva"), label: t("stat.evasion"), value: formatStat(m.evasion) },
            { key: "spd", icon: statIcon("spd"), label: t("stat.speed"), value: `${formatSeconds1(m.attackIntervalMs / 1000)}s` },
          ]}
        />
        {preview.hasChest && (
          <div className="paragon-chest-hint">
            {KEY_ICON_URL ? <img loading="lazy" decoding="async" src={KEY_ICON_URL} alt="" className="ui-icon dungeon-progress-key-icon" /> : "🗝️"} {t("paragon.preview.chest")}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Entsperrtes Turm-Panel (Welle P2): große Etagen-/Rekord-Anzeige, Vorschau der nächsten Etage
 * (Kern-Stats via `paragonFloorPreview` — reine Formel-Ableitung, kein neuer Content-Draw) und der
 * Aufstiegs-Button (`startParagonFloor`). Gate „anderer Kampf läuft" spiegelt die Engine-Bedingung
 * (`state.combat.monsterId !== null`) — in der Praxis unerreichbar, solange dieses Panel nur in
 * `MonsterSelect` (der Zonen-Auswahl OHNE aktiven Kampf) gerendert wird, aber die Engine-Gate-
 * Semantik bleibt 1:1 in der UI sichtbar statt eines stillen No-op-Klicks (Robustheits-Vorgabe P2).
 * Tod-Regel EHRLICH kommuniziert (Chef-Vorgabe): eine stehende, unauffällige Hinweiszeile.
 */
function ParagonPanel({ status }: { status: ParagonStatus }): JSX.Element {
  const state = useGameState();
  const { t } = useI18n();
  const preview = paragonFloorPreview(content, status.currentFloor);
  const busy = state.combat.monsterId !== null;
  const disabledReason = busy ? t("paragon.busy") : !preview ? t("paragon.noContent") : "";
  // Fun-Sweep FF (paragon-aldric.md Top-3 #2, A2-UI): currentFloor > 1 heißt "mindestens Etage 1
  // ist bereits bezwungen" (currentFloor = checkpoint+1) — genau der Nach-Sieg-Zustand, in dem der
  // Aufstieg der mit Abstand naheliegendste Klick ist. Die Engine-Logik (startParagonFloor) bleibt
  // unverändert; nur die VISUELLE Prominenz des immer schon vorhandenen Buttons ändert sich.
  const isContinuing = status.currentFloor > 1;
  const label = status.currentFloor <= 1
    ? t("paragon.start")
    : t("paragon.continue").replace("{n}", String(status.currentFloor));

  return (
    <div className="dungeon-progress paragon-panel">
      <div className="paragon-panel-head">
        <span className="paragon-floor-display">{t("paragon.floor").replace("{n}", String(status.currentFloor))}</span>
        <span className="paragon-best-display">{t("paragon.best").replace("{n}", String(status.bestFloor))}</span>
      </div>

      <div className="paragon-body">
        {preview && <ParagonPreviewCard preview={preview} />}
        <div className="paragon-actions">
          <button
            type="button"
            className={`btn-iron dungeon-enter paragon-start-btn${isContinuing ? " paragon-continue-cta" : ""}`}
            disabled={busy || !preview}
            title={disabledReason || undefined}
            onClick={() => startParagonFloor(state, content)}
          >
            {label}
          </button>
          {/* Sekundäraktionen/-hinweise bewusst klein (Fun-Sweep FF A2-UI „Sekundäraktionen
              kleiner") — der Aufstiegs-Button oben bleibt der einzige große, dominante Klick. */}
          <p className="paragon-hint muted">{t("paragon.milestoneHint")}</p>
          <p className="paragon-hint muted paragon-death-hint">{t("paragon.deathRuleHint")}</p>

          {/* Auto-Aufstieg-Toggle (Welle JJ → UI, SAVE 67, Fun-Sweep Programm Welle II §4):
              Opt-in-Komfort, direkte Settings-Mutation (Muster settings.autoBank, OptionsPage.tsx) —
              die Kette endet von selbst bei Tod/Verlassen/Max-Etage (paragon.ts startet dann keinen
              weiteren Aufstieg mehr). */}
          <label className="paragon-auto-ascend-row">
            <input
              type="checkbox"
              checked={state.settings.autoParagonAscend}
              onChange={(e) => { state.settings.autoParagonAscend = e.target.checked; }}
            />
            <span className="paragon-auto-ascend-label">{t("paragon.autoAscend.label")}</span>
          </label>
          <p className="paragon-hint muted">{t("paragon.autoAscend.hint")}</p>
        </div>
      </div>

      <ParagonChestTierStrip status={status} />
    </div>
  );
}

/**
 * Truhen-Staffelung sichtbar (Fun-Sweep FF, Aldric A3-UI — paragon-aldric.md Top-3 #3):
 * „die Staffelung existiert, aber kein Spieler kann sie im Spiel sehen". Liest die WAHRE
 * Staffelung aus `content.paragon.chest` (kein erfundener Wert) — jede Truhen-Stufe rollt ab
 * ihrer `minFloor` auf jeder BOSS-Etage (jede 5.) mit, ihr erstes tatsächliches Erscheinen ist
 * also die nächste Boss-Etage ≥ minFloor (PARAGON_BOSS_INTERVAL-Aufrundung — Spiegel der
 * Engine-Bedingung `(tier.minFloor ?? 1) <= floor` in `rollParagonChest`, paragon.ts). „Erreicht"
 * = `bestFloor` (Rekord, monoton, überlebt Tod) hat diese Etage schon mal erreicht — der Spieler
 * hatte also schon mindestens eine Chance auf diese Stufe.
 */
function ParagonChestTierStrip({ status }: { status: ParagonStatus }): JSX.Element | null {
  const { t } = useI18n();
  const tiers = content.paragon?.chest ?? [];
  if (tiers.length === 0) return null;
  const milestoneFloors = tiers
    .map((tier) => Math.ceil((tier.minFloor ?? 1) / PARAGON_BOSS_INTERVAL) * PARAGON_BOSS_INTERVAL)
    .sort((a, b) => a - b);
  return (
    <div className="paragon-chest-tiers">
      <span className="paragon-chest-tiers-label muted">{t("paragon.chestTier.sectionLabel")}</span>
      <div className="paragon-chest-tiers-row">
        {milestoneFloors.map((floor, i) => {
          const reached = status.bestFloor >= floor;
          return (
            <span key={floor} className={`paragon-chest-tier${reached ? " reached" : ""}`}>
              {t("paragon.chestTier.label").replace("{floor}", String(floor)).replace("{n}", String(i + 1))}
              {reached && <span className="paragon-chest-tier-check" aria-hidden="true">✓</span>}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Paragonturm-Sektion der Zonen-Auswahl (dungeon-rework-spec §7, Welle P2 — CHEF-GO): eigene
 * kleine Sektion UNTER den Dungeons. Vor dem Fund des Turm-Schlüssels eine geheimnisvolle
 * gesperrte Karte (Muster Dungeon-Karten v2 — Schloss-Icon + "<Schlüssel> gesucht", klickbar
 * ins Item-Wiki); danach das volle Turm-Panel.
 *
 * Robustheit (P2-Auftrag Punkt 5): der Paragon-CONTENT (`content.paragon`-Pool + die
 * `content.dungeons`-Def mit `id: PARAGON_DUNGEON_ID`) landet PARALLEL durch content-dev — fehlt
 * eines von beiden, blendet diese Funktion die GESAMTE Sektion aus (kein halb-kaputtes UI-Fragment,
 * kein toter Link). `paragonFloorPreview(content, 1)` ist der günstigste Signalgeber, ob der Pool
 * tatsächlich nutzbare Einträge hat (spiegelt die Engine-eigene Defensivprüfung in paragon.ts).
 */
function ParagonTowerSection(): JSX.Element | null {
  const state = useGameState();
  const { t, tr } = useI18n();
  const towerDef = content.dungeons.find((d) => d.id === PARAGON_DUNGEON_ID);
  const firstFloorPreview = paragonFloorPreview(content, 1);
  if (!towerDef || !firstFloorPreview) return null;

  const status = paragonStatus(state);
  const bg = getDungeonBackgroundCard(PARAGON_DUNGEON_ID) ?? getZoneBackgroundCard(towerDef.zone);
  const keyItemId = dungeonKeyItemId(content, PARAGON_DUNGEON_ID);
  const keyItem = keyItemId ? content.items[keyItemId] : null;
  const keySoughtLabel = t("dungeon.keySought").replace("{name}", keyItem ? tr(keyItem.name) : keyItemId ?? "");

  return (
    <>
      <h2 className="block-heading dungeon-heading">
        {TOWER_ICON_URL ? <img loading="lazy" decoding="async" src={TOWER_ICON_URL} alt="" className="ui-icon dungeon-progress-key-icon" /> : "🗼"} {t("paragon.sectionTitle")}
      </h2>
      {status.unlocked ? (
        <ParagonPanel status={status} />
      ) : (
        <div className="zone-grid">
          <div
            className={`zone-card dungeon-card paragon-card dungeon-locked${bg ? " has-bg" : ""}`}
            style={bg ? { backgroundImage: `url("${bg}")` } : undefined}
            title={keySoughtLabel}
          >
            <div className="zone-card-name">{tr(towerDef.name)}</div>
            <button
              type="button"
              className="dungeon-locked-hint"
              title={t("dungeon.keySoughtHint")}
              onClick={(e) => {
                e.stopPropagation();
                if (keyItemId) openItemWikiModal(keyItemId);
              }}
            >
              <span className="dungeon-lock-icon" aria-hidden="true">
                {LOCK_ICON_URL
                  ? <img loading="lazy" decoding="async" src={LOCK_ICON_URL} alt="" className="ui-icon" />
                  : "🔒"}
              </span>
              {keySoughtLabel}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Dungeon-Beute-Vorschau auf der Dungeon-Karte (Fun-Sweep FF, Grete G1 — dungeons-grete.md
 * Top-3 #1): kompakte Icon-Reihe der Dungeon-Clear-Loot-Tabelle (`DungeonDef.loot`, NICHT die
 * kleinere Zwischen-Truhe `chest.loot` — das ist die Boss-/Chase-Tabelle, um die es Grete geht).
 * Entdeckte Items (isItemDiscovered — GLOBALE "je besessen"-Wahrheit, dieselbe Quelle wie das
 * Bestiarium/Item-Wiki, s. dortige JSDoc) zeigen ihr echtes Icon + ✓; unentdeckte dieselbe
 * Silhouetten-Technik wie `DropIcon`/BestiaryPage (brightness(0) aufs echte Bild, "?"-Marke).
 * ANDERS als das Bestiarium zeigt diese Vorschau die %-Chance IMMER (CHEF-REGEL „immer %, nie
 * Brüche") — auch für unentdeckte Items: genau das war Gretes Kernbefund ("Grete muss WISSEN,
 * was sie jagen kann und wie wahrscheinlich"; die sevenfold_crown_chain existierte für sie
 * nirgends). Klick auf ein entdecktes Item öffnet das Item-Wiki (Muster BestiaryPage).
 */
/**
 * Chef-Entscheidung E3 (25.08.2026): Boss-Beute des Dungeons (Ausrüstung aus den Loot-Tabellen der
 * Boss-Begegnungen). Ein Spieler suchte die Crownless Blade auf der Karte von „Hinter dem Thron",
 * sah dort aber nur die Truhen-Beute (Kette der Sieben Kronen, 0,10 %) und hielt die Kette für das
 * Schwert. Das Schwert fällt von Drazhan selbst und stand bisher nur im Bestiarium. Reine
 * Content-Ableitung, deshalb ohne State; dedupliziert nach Item.
 */
function bossLootFor(d: DungeonDef): LootRoll[] {
  const out: LootRoll[] = [];
  const seen = new Set<string>();
  d.encounters.forEach((monsterId, idx) => {
    if (d.waveMeta?.[idx]?.kind !== "boss") return;
    const m = content.monsters[monsterId];
    if (!m) return;
    for (const roll of m.loot ?? []) {
      if (content.items[roll.itemId]?.type !== "equipment") continue;
      if (seen.has(roll.itemId)) continue;
      seen.add(roll.itemId);
      out.push(roll);
    }
  });
  return out;
}

/** Item-Typ als Kurztext am Beute-Eintrag (E3): Waffenart, sonst Ausrüstungs-Slot. */
function dropTypeLabel(item: ItemDef | undefined, t: (k: string) => string, tr: (s: LocalizedString) => string): string {
  if (!item || item.type !== "equipment") return "";
  if (item.weaponType) return t(`item.weaponType.${item.weaponType}`);
  if (item.slot && EQUIP_SLOT_LABELS[item.slot]) return tr(EQUIP_SLOT_LABELS[item.slot]);
  return "";
}

function DungeonLootPreview({ loot, bossLoot = [] }: { loot: LootRoll[]; bossLoot?: LootRoll[] }): JSX.Element {
  const state = useGameState();
  const { t, tr } = useI18n();
  const chip = (roll: LootRoll): JSX.Element => {
    const discovered = isItemDiscovered(state, roll.itemId);
    const item = content.items[roll.itemId];
    const img = getItemImage(roll.itemId);
    const pct = formatDropPct(roll.chance);
    const typ = discovered ? dropTypeLabel(item, t, tr) : "";
    return (
      <span
        key={roll.itemId}
        className={`dungeon-loot-chip${discovered ? "" : " undiscovered"}`}
        title={discovered ? (item ? tr(item.name) : roll.itemId) : t("dungeon.lootPreview.undiscovered")}
        role={discovered ? "button" : undefined}
        tabIndex={discovered ? 0 : undefined}
        onClick={
          discovered
            ? (e) => {
                e.stopPropagation();
                openItemWikiModal(roll.itemId);
              }
            : undefined
        }
        onKeyDown={
          discovered
            ? (e) => {
                if (e.key !== "Enter" && e.key !== " ") return;
                e.preventDefault();
                e.stopPropagation();
                openItemWikiModal(roll.itemId);
              }
            : undefined
        }
      >
        <span className={`drop-icon${discovered ? " clickable" : " undiscovered"}`}>
          {img ? (
            <img
              loading="lazy"
              decoding="async"
              src={img}
              alt=""
              className={`drop-icon-img pixelart${discovered ? "" : " drop-icon-silhouette"}`}
            />
          ) : discovered ? (
            item?.icon ?? "▪"
          ) : (
            "?"
          )}
          {discovered && (
            <span className="dungeon-loot-check" aria-hidden="true">✓</span>
          )}
        </span>
        <span className="dungeon-loot-pct">{pct}</span>
        {typ && <span className="dungeon-loot-type muted">{typ}</span>}
      </span>
    );
  };
  return (
    <div className="dungeon-loot-preview">
      {loot.length > 0 && (
        <>
          <span className="dungeon-loot-preview-label muted">{t("combat.drops")}</span>
          <div className="dungeon-loot-preview-grid">{loot.map(chip)}</div>
        </>
      )}
      {bossLoot.length > 0 && (
        <>
          <span className="dungeon-loot-preview-label dungeon-loot-preview-label--boss muted">{t("combat.bossDrops")}</span>
          <div className="dungeon-loot-preview-grid">{bossLoot.map(chip)}</div>
        </>
      )}
    </div>
  );
}
// Task #318 §2 (MonsterSelect-Leerlauf-Kosten, ~2,8ms/Commit, Perf-Backlog): `monsters`/
// `regularDungeons`/die Zonen-Gruppierung hingen NIE von `state` ab (reine Ableitung aus dem
// statischen `content`-Katalog), wurden aber trotzdem bei JEDEM 10-Hz-Tick innerhalb von
// MonsterSelect neu berechnet (Object.values/.filter/.sort über den kompletten Monster-Katalog +
// eine Zonen×Monster-Gruppierung) — reine Verschwendung, `content` ändert sich zur Laufzeit NIE.
// Einmalig beim Modul-Laden berechnet statt bei jedem Render/Tick; identisches Ergebnis, kein
// Verhaltensunterschied.
const MONSTER_SELECT_MONSTERS: MonsterDef[] = Object.values(content.monsters)
  .filter((m) => !m.id.startsWith("dg_") && !m.dungeonOnly)
  .sort((a, b) => a.level - b.level);

const MONSTER_SELECT_REGULAR_DUNGEONS = [...content.dungeons]
  .filter((d) => d.id !== PARAGON_DUNGEON_ID)
  .sort((a, b) => (a.requiredLevel ?? 0) - (b.requiredLevel ?? 0));

const MONSTER_SELECT_ZONE_ORDER = [
  ...content.zones,
  { id: "__other", name: { en: "Other", de: "Sonstige" } as LocalizedString },
];
// codex:2026-08-02T11:43:36+02:00 — Frontline Ribbon ordnet jede Gebietsfamilie nach ihrem
// niedrigsten Gegnerlevel. Content-Reihenfolge und Gates bleiben unangetastet; nur die visuelle
// Jagdroute läuft nun nachvollziehbar von leicht nach schwer.
const MONSTER_SELECT_BY_ZONE = MONSTER_SELECT_ZONE_ORDER.map((z) => ({
  zone: z,
  monsters: MONSTER_SELECT_MONSTERS.filter((m) =>
    z.id === "__other" ? !m.zone || !content.zones.some((cz) => cz.id === m.zone) : m.zone === z.id,
  ),
}))
  .filter((g) => g.monsters.length > 0 && g.zone.id !== "slayer_tower")
  .sort((a, b) => Math.min(...a.monsters.map((m) => m.level)) - Math.min(...b.monsters.map((m) => m.level)));

/** Primitiv-Tupel-Gate für MonsterSelect (Task #318 §2/§3, `useGameSelector`-Muster): das Zonen-/
 *  Dungeon-Raster ist NUR sichtbar, wenn KEIN Kampf läuft — `state.totalTicks` als Gate (wie bei
 *  Battle) würde also 10×/s neu rendern, OBWOHL sich außerhalb eines laufenden Kampfes fast nie
 *  etwas ändert, das dieses Raster überhaupt zeigt (keine HP-Balken/Timer hier). Stattdessen NUR
 *  auf die drei Primitives gaten, die `zoneProgress`/die Elite-Badges tatsächlich beeinflussen:
 *  `stats.kills`/`stats.itemsGathered` (Bestiarium-Fortschritt — ändert sich zwar nicht durch
 *  dieses Raster selbst, wohl aber durch eine im Hintergrund weiterlaufende Sammel-Aktion, die
 *  zufällig denselben Item-Pool trifft) und `eliteSpawnSeq` (neuer Champion-Spawn → Zonen-Karten-
 *  Badge). Ergebnis: echte Null-Arbeit im Leerlauf (kein Kill/Fund/Spawn ⇒ kein Re-Render), s.
 *  GameContext.tsx-JSDoc "DIE EINE FOOTGUN" — reine Primitives, kein Tupel-Objekt aus dem State. */
function monsterSelectGate(s: GameState): readonly [number, number, number] {
  return [s.stats.kills, s.stats.itemsGathered, s.eliteSpawnSeq] as const;
}

function MonsterSelectImpl(): JSX.Element {
  useGameSelector(monsterSelectGate, tupleEquals);
  const getState = useGetGameState();
  const state = getState()!;
  const { t, tr } = useI18n();
  const [zoneId, setZoneId] = useState<string | null>(() => lastZoneId);
  const [towerFloor, setTowerFloor] = useState<number | null>(null);
  // UI-Brainstorm A8 (2026-07-24, -ergonomie.md §4.2): dasselbe `invf-search`-Sucheingabe-Idiom wie
  // SkillPage/Bank/Shop, hier über der Zonen-/Dungeon-/Turm-Übersicht — die Liste (~10 Zonen +
  // ~8 Dungeons + 5 Turm-Etagen) wächst mit der laufenden Content-Erweiterung nur weiter und hatte
  // bisher gar kein Filter. Nur auf "Stufe 1" (Zonen-Auswahl) relevant, s. u.
  const [zoneSearch, setZoneSearch] = useState("");
  // Pre-compute the player's offense skill level for XP-greying on monster cards.
  const offenseLevel = playerOffenseSkillLevel(state);
  // Player combat level for difficulty badges.
  const playerCombatLevel = combatLevel(state);
  // Task #305: einmal je Render, nicht pro Karte neu (s. combatPrognosis-Kommentar in MonsterCard).
  const stats = useMemo(() => computeStats(state, content), [state]);
  // Map-Ansicht deaktiviert — ausschliesslich List-Ansicht der Monster wird gezeigt.
  // Dungeon-Rework-Spec §5.4/§5.6: dg_<x>-Dungeon-Varianten teilen die Zone ihrer Basis (Kill-Credit
  // läuft auf die Basis, s. ZONE_PROGRESS_INDEX-Kommentar oben) — sie tauchen hier nicht doppelt auf.
  // §5.3: dungeonOnly-Monster (idol_warden/aether_wraith/scale_skarn/last_idol) existieren nur noch
  // als idol_sanctum-Wellen; startCombat verweigert den Direktstart bereits (engine-seitig), die
  // Zonen-Auswahl blendet sie zusätzlich aus — sonst bliebe ein toter "Kämpfen"-Button übrig.
  // Task #318 §2: jetzt module-level (MONSTER_SELECT_MONSTERS, s. dort) statt pro Render neu gebaut.
  const monsters = MONSTER_SELECT_MONSTERS;

  // Paragonturm (§7, Welle P2): die `content.dungeons`-Def des Turms (`id: PARAGON_DUNGEON_ID`,
  // leere `encounters`) hält NUR canEnterDungeon/startDungeon inert — sie ist keine normale
  // Dungeon-Karte (0 Wellen, "Betreten" würde ins Leere laufen). Aus der regulären Liste raus;
  // die Karte/das Panel rendert stattdessen ParagonTowerSection weiter unten.
  // Task #318 §2: jetzt module-level (MONSTER_SELECT_REGULAR_DUNGEONS, s. dort).
  const regularDungeons = MONSTER_SELECT_REGULAR_DUNGEONS;

  // Zonen-Fortschritt für die Zonen-Karten (Chef-GO): nur über die kleinen, vorgebauten
  // ZONE_PROGRESS_INDEX-Listen pro Zone iterieren (nicht über den gesamten Monster-Katalog).
  // Task #318 §2: Memo-Dep von `state.totalTicks` (rechnete bisher bei JEDEM Tick neu, obwohl sich
  // Kills/Funde außerhalb eines laufenden Kampfes praktisch nie ändern) auf die zwei Primitives
  // umgestellt, die diese Karte tatsächlich beeinflussen — identisch zum `monsterSelectGate`-Tupel
  // oben (dasselbe Signal, hier als Memo-Dep statt als Selector-Gate).
  const zoneProgress = useMemo(() => {
    const map: Record<string, ZoneProgress> = {};
    for (const [zoneId_, idx] of Object.entries(ZONE_PROGRESS_INDEX)) {
      let killed = 0;
      for (const id of idx.monsterIds) if (monsterKills(state, id) > 0) killed++;
      let discovered = 0;
      for (const id of idx.itemIds) if (isItemDiscovered(state, id)) discovered++;
      const dropPct = idx.itemIds.length > 0 ? Math.round((discovered / idx.itemIds.length) * 100) : 100;
      map[zoneId_] = {
        killed,
        totalMonsters: idx.monsterIds.length,
        dropPct,
        complete: killed === idx.monsterIds.length && discovered === idx.itemIds.length,
      };
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.stats.kills, state.stats.itemsGathered]);

  // Nach Zone gruppieren (Reihenfolge aus content.zones; Rest → "Sonstige").
  // slayer_tower wird hier ausgeblendet — die Etagen erscheinen stattdessen in der Tower-Sektion.
  // Task #318 §2: jetzt module-level (MONSTER_SELECT_BY_ZONE, s. dort).
  const byZone = MONSTER_SELECT_BY_ZONE;

  // Slayer-Tower-Daten für die Tower-Sektion.
  const allTowerFloors = content.slayerTower ?? [];
  const openFloors = unlockedTowerFloors(state, content);

  // Aktiver Slayer-Task → Ziel-Monster hervorheben.
  const activeTask = getActiveTask(state);
  const taskMonsterId = activeTask ? activeTask.monsterId : null;

  // Wiki→Kampfgebiet-Sprung (util/monsterJump.ts): ein Ziel-Monster, das ItemWikiModal hinterlassen
  // hat (Klick auf eine Monster-Quelle-Zeile) — spiegelt den Wiki→Rezept-Sprung in SkillPage.tsx
  // (dortiges JSDoc erklärt den Root-Cause-Fix ausführlich): diese Seite abonniert den Store direkt
  // (`useSyncExternalStore`), nicht nur beim Mount, damit ein Sprung auch greift, während man SCHON
  // auf der Kampf-Seite steht (setActivePageId in App.tsx wäre dann ein No-op, MonsterSelect würde
  // nicht neu mounten). Läuft immer VOR den frühen Returns unten (Hook-Reihenfolge).
  const monsterJumpNav = useSyncExternalStore(subscribeMonsterJump, getMonsterJumpNav);
  const [jumpTargetMonsterId, setJumpTargetMonsterId] = useState<string | null>(null);
  useEffect(() => {
    const targetId = consumeMonsterJumpTarget();
    if (!targetId) return;
    // Zone finden, in der das Ziel-Monster als Karte auftaucht (byZone schließt dg_-/dungeonOnly-
    // Monster und den Slayer-Turm bereits aus — taucht das Monster dort nicht auf, lebt es nur in
    // einem Dungeon/Turm: best-effort, die Navigation zur Kampf-Seite ist bereits passiert (App.tsx),
    // hier bleibt es dann bewusst beim reinen Seitenwechsel ohne Highlight — kein Absturz).
    const targetGroup = byZone.find((g) => g.monsters.some((m) => m.id === targetId));
    if (!targetGroup) return;
    // Story-Zonen-Gate, zweite Verteidigungslinie (Task #350, Chef-Fund "Wiki-Links führen in
    // gesperrte Zonen"): die Aufrufer (ItemWikiModal SourceRow) blocken den Sprung schon an der
    // Quelle (kein `jumpToMonster`-Aufruf für ein Monster einer gesperrten Zone), dieser Check
    // hier ist der Konsumenten-seitige Rückhalt — falls ein künftiger Aufrufer den Quellen-Check
    // vergisst, öffnet der Sprung die gesperrte Zone trotzdem NICHT (kein Highlight, kein
    // Zonenwechsel). Der Spieler landet einfach auf der normalen Kampf-Seite (Zonen-Grid), exakt
    // wie ein Seitenwechsel ohne aktiven Sprung.
    if (!isZoneUnlocked(state, content, targetGroup.zone.id)) return;
    setTowerFloor(null); // ein evtl. offener Turm-Etagen-Drill-down würde sonst die Zonen-Ansicht verdecken
    lastZoneId = targetGroup.zone.id;
    setZoneId(targetGroup.zone.id);
    setJumpTargetMonsterId(targetId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monsterJumpNav?.nonce]);

  // Scrollt zur Ziel-Monster-Karte + kurzer Hervorhebungs-Puls, sobald sie im DOM sichtbar ist (die
  // Zone wurde ggf. gerade erst gewechselt, s. Effect oben — zwei rAF-Schritte wie SkillPage.tsx,
  // damit Layout/Paint sicher abgeschlossen sind, bevor gescrollt wird). `jumpTargetMonsterId` wird
  // danach zurückgesetzt (einmaliger Sprung, kein Re-Trigger bei späteren Re-Renders). Findet sich
  // die Karte nicht im DOM (z.B. noch im Turm-Etagen-Drill-down, s. Effect oben), passiert nichts
  // weiter außer dem Reset — kein Absturz.
  useEffect(() => {
    if (!jumpTargetMonsterId) return;
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        const el = document.getElementById(`monstercard-${jumpTargetMonsterId}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.classList.add("monster-card-jump-highlight");
          setTimeout(() => el.classList.remove("monster-card-jump-highlight"), 1800);
        }
        setJumpTargetMonsterId(null);
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jumpTargetMonsterId]);

  // Perf-Welle (2026-07-22): Kampf-Backdrop VORDEKODIEREN, sobald die Monster-Auswahl einer Zone
  // angezeigt wird — `Battle` (weiter unten) berechnet beim tatsächlichen Kampfstart denselben
  // Hintergrund erneut (backdropBg, dieselbe Prioritätskette); ohne Vorwärmung fiel der gemessene
  // 55-85ms-Decode in genau den Kampfstart-Frame. `new Image()` + `.decode()` HIER lässt den
  // Browser das Bild im Hintergrund dekodieren, während der Spieler noch die Karten anschaut.
  useEffect(() => {
    if (!zoneId) return;
    const url = getBattleScreen(zoneId) ?? getDungeonBackground(zoneId) ?? getZoneBackground(zoneId);
    if (!url) return;
    const img = new Image();
    img.src = url;
    void img.decode?.().catch(() => {});
  }, [zoneId]);

  // ── Stufe 0: Turm-Etagen-Drill-down ──
  if (towerFloor !== null) {
    const floor = allTowerFloors.find((f) => f.floor === towerFloor);
    if (!floor) return <div className="combat-select" />;
    return <TowerFloorView floor={floor} onBack={() => setTowerFloor(null)} />;
  }

  // ── Stufe 1: Zonen-Auswahl ──
  if (zoneId === null) {
    // UI-Brainstorm A8: über die gesamte scrollende Übersicht (Zonen + Dungeons + Turm-Etagen)
    // gleichzeitig — filtert nach Zonen-/Dungeon-/Etagen-Namen UND nach den Monster-Namen darin.
    const zq = zoneSearch.trim().toLowerCase();
    const filteredByZone = zq
      ? byZone.filter((g) =>
          tr(g.zone.name).toLowerCase().includes(zq) || g.monsters.some((m) => tr(m.name).toLowerCase().includes(zq)),
        )
      : byZone;
    const filteredDungeons = zq
      ? regularDungeons.filter((d) => tr(d.name).toLowerCase().includes(zq))
      : regularDungeons;
    const filteredTowerFloors = zq
      ? allTowerFloors.filter((f) =>
          tr(f.name).toLowerCase().includes(zq) ||
          f.monsters.some((id) => {
            const m = content.monsters[id];
            return !!m && tr(m.name).toLowerCase().includes(zq);
          }),
        )
      : allTowerFloors;
    const hasZoneSearchResults =
      filteredByZone.length > 0 || filteredDungeons.length > 0 || filteredTowerFloors.length > 0;
    return (
      <div className="combat-select">
        <h2 className="block-heading">{t("combat.chooseZone")}</h2>
        {/* UI-Brainstorm A8 (2026-07-24, -ergonomie.md §4.2): dasselbe `invf-search`-Sucheingabe-
            Idiom wie SkillPage/Bank/Shop — die Übersicht (~10 Zonen + ~8 Dungeons + 5 Turm-Etagen +
            Paragon) hatte bisher gar kein Filter, obwohl sie mit der laufenden Content-Erweiterung
            (Aschechronik) nur wächst. */}
        <div className="invf-bar zone-search-bar">
          <input
            className="invf-search"
            type="search"
            value={zoneSearch}
            onChange={(e) => setZoneSearch(e.target.value)}
            placeholder={t("combat.zoneSearch.placeholder")}
            aria-label={t("combat.zoneSearch.placeholder")}
          />
        </div>
        {zq && !hasZoneSearchResults && (
          <p className="muted zone-search-empty">{t("combat.zoneSearch.noResults")}</p>
        )}
        {filteredByZone.length > 0 && <h2 className="block-heading combat-family-heading">{t("combat.reachZones")}</h2>}
        <div className="zone-grid">
          {filteredByZone.map((g) => {
            const levels = g.monsters.map((m) => m.level);
            const min = Math.min(...levels);
            const max = Math.max(...levels);
            const thumbId = g.monsters.find((m) => getMonsterSrc(m.id))?.id;
            const bg = getZoneBackgroundCard(g.zone.id);
            const isTaskZone = taskMonsterId !== null && g.monsters.some((m) => m.id === taskMonsterId);
            const progress = zoneProgress[g.zone.id];
            // Story-Zonen-Gate (Aschechronik, ceo-run-2026-07-13 Welle E): `isZoneUnlocked` ist die
            // EINZIGE Wahrheit fürs Gate (berücksichtigt Bestandsschutz-Grants) — hier nur die
            // sichtbare Schicht. `zoneDef` separat aus `content.zones` (statt `g.zone`, das auch den
            // synthetischen "__other"-Eintrag ohne `requiresQuest`-Feld enthält) für den Gate-Namen.
            const zoneDef = content.zones.find((z) => z.id === g.zone.id);
            const storyLocked = !!zoneDef && !isZoneUnlocked(state, content, g.zone.id);
            const gateQuest = zoneDef?.requiresQuest
              ? content.quests.find((q) => q.id === zoneDef.requiresQuest)
              : undefined;
            const gateHint = storyLocked
              ? t("combat.zoneGate.requires").replace("{name}", gateQuest ? tr(gateQuest.name) : t("app.unknown"))
              : undefined;
            // Elite-/World-Spawns (design/elite-spawns-concept.md §2.2, Phase 3 UI): `eliteZones[id]`
            // im „Aktiv"-Zustand (`variantId` gesetzt) — graceful gegen leeren `content.elites`
            // (Phase 2 parallel von content-dev befüllt: solange kein Content existiert, spawnt der
            // Zyklus laut engine/elites.ts nie, dieser Zweig bleibt dann einfach ungenutzt).
            const zoneEliteEntry = state.eliteZones?.[g.zone.id];
            const zoneEliteActive =
              zoneEliteEntry && "variantId" in zoneEliteEntry ? zoneEliteEntry : null;
            const eliteVariant = zoneEliteActive ? content.elites?.[zoneEliteActive.variantId] : undefined;
            const eliteBadgeTitle = eliteVariant && zoneEliteActive
              ? t("combat.elite.badgeTooltip")
                  .replace("{name}", tr(eliteVariant.name))
                  .replace("{time}", formatEliteCountdown(zoneEliteActive.remainingMs))
              : undefined;
            // Spuren-/Vorzeichen-Badge (Jagd-Paket Task 2, Chef-GO): rein ABGELEITET aus dem
            // ruhenden `eliteZones`-Cooldown (< ELITE_TRACKS_THRESHOLD_MS, util/eliteBoard.ts) —
            // kein neuer State, kein Toast (die Spawn-Überraschung bleibt). Nur wenn die Zone
            // überhaupt Elite-Varianten hat (Content-Drift-Schutz, Muster oben) UND gerade KEIN
            // Champion aktiv ist (die zwei Badges schließen sich gegenseitig aus, s.
            // `EliteZoneState`-Union) — bewusst DEZENTER als das ⚔-Badge: kein Pulsieren.
            const zoneHasFreshTracks =
              !zoneEliteActive
              && hasFreshTracks(zoneEliteEntry)
              && eliteVariantsForZone(content, g.zone.id).length > 0;
            return (
              <button
                key={g.zone.id}
                className={`zone-card${bg ? " has-bg" : ""}${isTaskZone ? " slayer-target-zone" : ""}${progress?.complete ? " zone-card-complete" : ""}${storyLocked ? " zone-card-story-locked" : ""}`}
                style={bg ? { backgroundImage: `url("${bg}")` } : undefined}
                onClick={storyLocked ? undefined : () => { lastZoneId = g.zone.id; setZoneId(g.zone.id); }}
                disabled={storyLocked}
                title={gateHint}
                // Task #351 (Bot-Toolkit, ui-dev): rein additiver Hook fürs `ui-audit/bot.mjs`
                // `zone:<zoneId>`-Kommando — Zonen-Karten hatten sonst keine stabile Selektor-
                // Identität (nur `key`, das nicht ins DOM rendert). Keine Logik, keine Layout-
                // Änderung, s. BOT-GUIDE.md.
                data-bot-zone={g.zone.id}
              >
                {!bg && (
                  <div className="zone-card-img">
                    {thumbId ? <img loading="lazy" decoding="async" src={getMonsterSrc(thumbId)!} alt="" /> : <span className="zone-card-ph">⚔</span>}
                  </div>
                )}
                {isTaskZone && !storyLocked && (
                  <span className="slayer-target-badge">{t("slayer.task.targetZone")}</span>
                )}
                {progress?.complete && !storyLocked && (
                  <span className="zone-card-complete-badge" title={t("zone.progress.completeTitle")}>✓</span>
                )}
                {storyLocked && (
                  <span className="zone-card-story-lock-badge" aria-hidden="true">
                    {LOCK_ICON_URL
                      ? <img loading="lazy" decoding="async" src={LOCK_ICON_URL} alt="" />
                      : "🔒"}
                  </span>
                )}
                {eliteVariant && !storyLocked && (
                  <HoverTip
                    as="span"
                    focusable={false}
                    className="zone-card-elite-badge"
                    content={<span className="ct-tip-desc">{eliteBadgeTitle}</span>}
                  >
                    ⚔ {t("combat.elite.badge")}
                  </HoverTip>
                )}
                {zoneHasFreshTracks && !storyLocked && (
                  <HoverTip
                    as="span"
                    focusable={false}
                    className="zone-card-tracks-badge"
                    content={<span className="ct-tip-desc">{t("combat.zone.freshTracks.tooltip")}</span>}
                  >
                    {PAW_ICON_URL
                      ? <img loading="lazy" decoding="async" src={PAW_ICON_URL} alt="" className="ui-icon" />
                      : "🐾"} {t("combat.zone.freshTracks.badge")}
                  </HoverTip>
                )}
                <div className="zone-card-name">{tr(g.zone.name)}</div>
                <div className="zone-card-meta">
                  {t("combat.zoneLevels").replace("{min}", String(min)).replace("{max}", String(max))} · {g.monsters.length} {t("combat.enemies")}
                </div>
                {storyLocked ? (
                  <div className="zone-card-meta zone-card-locked-hint">
                    <span className="lock-icon-inline" aria-hidden="true">
                      {LOCK_ICON_URL
                        ? <img loading="lazy" decoding="async" src={LOCK_ICON_URL} alt="" className="ui-icon" />
                        : "🔒"}
                    </span>
                    {gateHint}
                  </div>
                ) : progress && (
                  <div className={`zone-card-progress${progress.complete ? " complete" : ""}`}>
                    <span className="zone-card-progress-kills">
                      {statIcon("atk")} {t("zone.progress.kills").replace("{cur}", String(progress.killed)).replace("{total}", String(progress.totalMonsters))}
                    </span>
                    <span className="zone-card-progress-sep">·</span>
                    <span className="zone-card-progress-drops">
                      {/* Chef 2026-07-11: echtes Achievement-Icon statt 💎-Emoji. */}
                      <img loading="lazy" decoding="async" src={getSidebarIcon("achievements") ?? undefined} alt="" className="zone-card-progress-icon" />
                      {t("zone.progress.drops").replace("{pct}", String(progress.dropPct))}
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {filteredDungeons.length > 0 && (
          <>
            <h2 className="block-heading dungeon-heading">
              {BOSS_ICON_URL ? <img loading="lazy" decoding="async" src={BOSS_ICON_URL} alt="" className="ui-icon" /> : "🏰"}{" "}
              {t("combat.dungeons")}
            </h2>
            <div className="zone-grid">
              {/* Chef 2026-07-10 (Screenshot): nach Einstiegs-Level sortiert, niedrigste zuerst. */}
              {filteredDungeons.map((d) => {
                // Dungeon-Karten v3 (Chef-Direktive 2026-07-13 „Gebiet für Gebiet, Dungeon um
                // Dungeon", ceo-run-2026-07-13 Welle L): KEINE Dungeon-Keys mehr — das einzige Gate
                // ist `isDungeonUnlocked` (DungeonDef.requiresQuest + Trägerzonen-Kohärenz, engine/
                // dungeon.ts). Gesperrte Karten rendern jetzt wie gesperrte Zonen-Karten (Welle E,
                // s. `zone-card-story-locked`/`zone-card-story-lock-badge`/`zone-card-locked-hint`
                // weiter oben): ausgegraut + Schloss-Badge + sichtbarer Hinweistext "Erfordert
                // Chronik-Kapitel: {Quest}" — ersetzt die alte Schlüssel-Optik/Item-Wiki-Verlinkung
                // komplett (Schlüssel-Items sind mechanisch tot, s. isDungeonUnlocked-JSDoc). Der
                // Hinweis zeigt die WIRKLICHE Sperr-Ursache: eine gesperrte Trägerzone sticht das
                // eigene Quest-Gate des Dungeons (Kohärenzregel, s. isDungeonUnlocked (c)).
                // Perf-Welle (2026-07-22, Nachzügler-Block D1): Dungeon-Hintergründe haben jetzt
                // ebenfalls `<id>.card.webp`-Varianten (s. dungeonBackgrounds.ts) — kleine Karte
                // nutzt die kleine Variante statt des vollen 2172px-Bilds.
                const bg = getDungeonBackgroundCard(d.id) ?? getZoneBackgroundCard(d.zone);
                const unlocked = isDungeonUnlocked(state, content, d.id);
                const zoneDef = d.zone ? content.zones.find((z) => z.id === d.zone) : undefined;
                const zoneLocked = !!zoneDef && !isZoneUnlocked(state, content, d.zone!);
                const gateQuestId = zoneLocked ? zoneDef?.requiresQuest : d.requiresQuest;
                const gateQuest = gateQuestId ? content.quests.find((q) => q.id === gateQuestId) : undefined;
                const gateHint = !unlocked
                  ? t("combat.zoneGate.requires").replace("{name}", gateQuest ? tr(gateQuest.name) : t("app.unknown"))
                  : undefined;
                const lvl = combatLevel(state);
                const levelOk = lvl >= d.requiredLevel;
                const canEnter = canEnterDungeon(state, content, d.id);
                const clears = state.dungeonsCleared[d.id] ?? 0;
                // Task #345 (Chef-Entscheid 25.07.): die Kampfstufe sperrt NICHT mehr — nur noch
                // Quest-/Zonen-Gates ("Dungeons sollten nur durch Quests gelocked sein!"). Bei
                // Unterlevel wird aus der alten Sperr-Zeile eine WARNUNG (Karte + Tooltip); der
                // Button hängt allein am Quest-Gate (canEnterDungeon prüft kein Level mehr).
                const levelWarn = !levelOk
                  ? t("combat.dungeonLevelWarn")
                      .replace("{n}", String(d.requiredLevel))
                      .replace("{lvl}", String(lvl))
                  : "";
                const reason = !unlocked ? gateHint : levelWarn;
                // Task #342 (Leiter-Analyse #338, Chef-GO): Dungeon-Karten zeigten bisher NUR "Lv
                // {requiredLevel}" — gleiche Beschriftung wie die Zonenkarten-Monsterspanne, aber
                // eine andere Skala (Kampfstufe des Charakters statt Monster-Level), UND die
                // Trägerzone fehlte komplett. Das ließ z.B. die Wildwald-Jagd wie einen
                // Blackthorn-Dungeon aussehen (s. design/dungeon-level-ladder-analyse.md §0/§A1/A2).
                // Kreaturen-Band wird zur Laufzeit aus `encounters` abgeleitet (nicht hardcoden) —
                // dasselbe Muster wie der Slayer-Turm-Etagen-Level weiter unten.
                const encounterMonsters = d.encounters
                  .map((id) => content.monsters[id])
                  .filter((m): m is MonsterDef => m !== undefined);
                const encounterLevels = encounterMonsters.map((m) => m.level);
                const minEncLvl = encounterLevels.length ? Math.min(...encounterLevels) : 0;
                const maxEncLvl = encounterLevels.length ? Math.max(...encounterLevels) : 0;
                return (
                  <div
                    key={d.id}
                    className={`zone-card dungeon-card${bg ? " has-bg" : ""}${unlocked ? "" : " zone-card-story-locked"}${
                      // Sweep-Fix-Welle B, Fix 2e (Dungeon-Bot KLEIN 7): der Hochland-Horst-Kartenhintergrund
                      // (assets/dungeons/highland_aerie.card.webp) ist ein sehr helles Wolkenmotiv bis fast
                      // ganz zum unteren Rand — der geteilte `.zone-card.has-bg::before`-Scrim (dunkelt nur
                      // bis 92% ab) reicht hier nicht für lesbaren Namen/Meta-Text. Gezielte Zusatzklasse
                      // statt Änderung am geteilten Scrim (der auf allen anderen Dungeon-Karten passt).
                      d.id === "highland_aerie" ? " dungeon-card-bright-bg" : ""
                    }`}
                    style={bg ? { backgroundImage: `url("${bg}")` } : undefined}
                    title={reason || undefined}
                  >
                    {!unlocked && (
                      <span className="zone-card-story-lock-badge" aria-hidden="true">
                        {LOCK_ICON_URL
                          ? <img loading="lazy" decoding="async" src={LOCK_ICON_URL} alt="" />
                          : "🔒"}
                      </span>
                    )}
                    <div className="zone-card-name">
                      {tr(d.name)}
                      {clears > 0 && (
                        <span
                          className="dungeon-clear-check"
                          title={t("dungeon.clearedCount").replace("{n}", String(clears))}
                        >
                          ✓ {clears}
                        </span>
                      )}
                    </div>
                    {/* Task #342 U1: Trägerzone der Karte — beerdigt die Blackthorn-/Wildwald-
                        Verwechslung (Analyse §A2), die Dungeon-Karte nannte ihre Zone nirgends. */}
                    {zoneDef && (
                      <div className="zone-card-meta dungeon-card-zone" title={tr(zoneDef.name)}>
                        {t("combat.dungeonZone").replace("{zone}", tr(zoneDef.name))}
                      </div>
                    )}
                    <div className="zone-card-meta">
                      {/* Task #342 U3: "Kampfstufe {n}" statt "Lv {n}" — auf der Zonenkarte meint
                          "Lv" das Monster-Level, hier die Charakter-Kampfstufe; gleiche
                          Beschriftung für zwei Skalen war die Wurzel der "willkürlich"-Verwechslung
                          (Analyse §A1). Task #345: seit dem Chef-Entscheid 25.07. ist der Wert eine
                          EMPFEHLUNG ("Empfohlen: Kampfstufe {n}"), kein Zutritts-Gate mehr.
                          Sweep-Fix-Welle B, Fix 2a (Dungeon-Bot KLEIN 3): stand bei Unterlevel
                          DOPPELT auf der Karte — dieselbe Empfehlung nochmal in der Warnzeile
                          darunter (die zusätzlich "· Deine: {lvl}" trägt, also die Meta-Zeile
                          komplett subsumiert). Ruhigere Variante statt zwei "Empfohlen"-Zeilen:
                          hier nur zeigen, wenn KEINE Warnzeile aktiv ist (levelOk) — bei Unterlevel
                          übernimmt die Warnzeile unten die komplette Aussage allein. */}
                      {levelOk && (
                        <>{t("combat.dungeonLevel").replace("{n}", String(d.requiredLevel))} · </>
                      )}
                      {/* Task #342 U2: Kreaturen-Band der Wellen, zur Laufzeit aus `encounters`
                          abgeleitet — macht z.B. die goblin_warband-Wand lesbar ("Kampfstufe 45 ·
                          Kreaturen Lv 50–60" statt einer stillen Überraschung).
                          Sweep-Fix-Welle B, Fix 2b (Dungeon-Bot KLEIN 4): 1-Wellen-Dungeons haben
                          min===max — "Kreaturen Lv 310–310" liest sich wie ein Zahlendreher, darum
                          bei Gleichstand die Singular-Variante ohne Spanne. */}
                      {encounterLevels.length > 0 && (
                        <>
                          {minEncLvl === maxEncLvl
                            ? t("combat.dungeonCreatureLevel").replace("{n}", String(minEncLvl))
                            : t("combat.dungeonCreatureLevels")
                                .replace("{min}", String(minEncLvl))
                                .replace("{max}", String(maxEncLvl))}
                          {" · "}
                        </>
                      )}
                      {/* Welle KK (Grete-Retest, Polish "Lv 95 · 1 Wellen"): Singular für Ein-Wellen-
                          Dungeons (Thron/Drazhan) statt starrem Plural. */}
                      {d.encounters.length}{" "}
                      {d.encounters.length === 1 ? t("combat.dungeonWaveSingular") : t("combat.dungeonWaves")}
                    </div>
                    {/* Fun-Sweep FF (dungeons-grete.md Top-3 #1, größter Einzelhebel): die Karte zeigte
                        bisher NUR "Name · Lv · Wellen" — null Beute-Info, obwohl die Silhouetten-/%-
                        Infrastruktur im Bestiarium bereits komplett existiert. Zeigt auch auf gesperrten
                        Karten (kein Spoiler-Risiko — die Chase-Existenz selbst zu verschweigen war
                        genau Gretes Kernbefund; "sevenfold_crown_chain existiert für die Spielerin
                        schlicht nicht"). */}
                    {(d.loot.length > 0 || bossLootFor(d).length > 0) && <DungeonLootPreview loot={d.loot} bossLoot={bossLootFor(d)} />}
                    {unlocked ? (
                      <>
                        {/* Task #345 (war Chef-Fund 25.07. „Enter ausgegraut — warum?"): aus der
                            Sperr-Grund-Zeile wurde eine WARNUNG — der Button bleibt aktiv, die Zeile
                            sagt in Warn-Orange „du darfst rein, aber es wird weh tun" (Empfehlung +
                            eigener Stand in einem Blick). */}
                        {!levelOk && (
                          <div className="zone-card-meta" style={{ color: "#e06c3a", fontWeight: 600 }}>
                            {levelWarn}
                          </div>
                        )}
                        {/* Chef-Auftrag 26.08.2026 ("Dungeons sollen nun queuebar sein, wie Kämpfe
                            mit 1×/25×/50×/∞"): "Betreten" läuft jetzt über den Queue-Sofort-Start-
                            Pfad (`enqueueDungeonRunsAtFront`, Ziel 1) statt direkt `startDungeon` —
                            verhält sich für einen einzelnen Lauf IDENTISCH zu heute (sofort rein,
                            eine laufende Aktivität wandert mit Rest-Ziel an die Queue-Front), reiht
                            sich aber sauber in denselben Mechanismus wie der Mengen-Picker darunter
                            ein. Der Picker selbst (derselbe geteilte Baustein wie auf der
                            Monsterkarte, s. MonsterCard `mc-queue-actions`-JSDoc) reicht Klicks über
                            `onQueue`-Muster durch: normaler Klick → `enqueueDungeonRuns` (hinten
                            anstellen), Shift-Klick → `enqueueDungeonRunsAtFront` (sofort, Muster
                            `atFront` bei MonsterCard). Nur sichtbar, wenn der Dungeon WIRKLICH
                            betretbar ist (`canEnter`) — ein gesperrter Dungeon (Quest-Gate) zeigt
                            keinen Picker, nur den (deaktivierten) Betreten-Knopf mit Sperr-Grund. */}
                        <button
                          className="btn-iron dungeon-enter"
                          disabled={!canEnter}
                          title={reason || undefined}
                          onClick={() => enqueueDungeonRunsAtFront(state, content, d.id, 1)}
                        >
                          {t("combat.dungeonEnter")}
                        </button>
                        {canEnter && (
                          <div className="dungeon-queue-actions">
                            <QuantityPicker
                              className="dungeon-queue-picker"
                              presets={CRAFT_TARGET_PRESETS}
                              onPick={(qty, atFront) =>
                                (atFront ? enqueueDungeonRunsAtFront : enqueueDungeonRuns)(state, content, d.id, qty)
                              }
                              onCustom={() =>
                                openQueueAmountModal({
                                  subject: tr(d.name),
                                  onQueue: (qty) => enqueueDungeonRuns(state, content, d.id, qty),
                                  onNow: (qty) => enqueueDungeonRunsAtFront(state, content, d.id, qty),
                                })
                              }
                              infiniteLabel="∞"
                              onInfinite={(atFront) =>
                                (atFront ? enqueueDungeonRunsAtFront : enqueueDungeonRuns)(state, content, d.id, null)
                              }
                            />
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="zone-card-meta zone-card-locked-hint">
                        <span className="lock-icon-inline" aria-hidden="true">
                          {LOCK_ICON_URL
                            ? <img loading="lazy" decoding="async" src={LOCK_ICON_URL} alt="" className="ui-icon" />
                            : "🔒"}
                        </span>
                        {gateHint}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ── Slayer-Turm ─────────────────────────────────────────────── */}
        {filteredTowerFloors.length > 0 && (
          <>
            <h2 className="block-heading dungeon-heading slayer-tower-heading">
              {t("slayer.tower.title")}
            </h2>
            <div className="zone-grid">
              {filteredTowerFloors
                .slice()
                .sort((a, b) => a.floor - b.floor)
                .map((floor) => {
                  const isUnlocked = openFloors.some((f) => f.floor === floor.floor);
                  const floorMonsters = floor.monsters
                    .map((id) => content.monsters[id])
                    .filter((m): m is MonsterDef => m !== undefined);
                  const levels = floorMonsters.map((m) => m.level);
                  const minLvl = levels.length ? Math.min(...levels) : 0;
                  const maxLvl = levels.length ? Math.max(...levels) : 0;
                  const floorBg = getBattleScreenCard(`slayer_tower_${floor.floor}`) ?? getZoneBackgroundCard(`slayer_tower_${floor.floor}`);
                  const isTaskFloor = taskMonsterId !== null && floor.monsters.includes(taskMonsterId);
                  return (
                    <button
                      key={floor.floor}
                      className={`zone-card slayer-floor-zone-card${isUnlocked ? "" : " locked-floor"}${floorBg ? " has-bg" : ""}${isTaskFloor ? " slayer-target-zone" : ""}`}
                      style={floorBg ? { backgroundImage: `url("${floorBg}")` } : undefined}
                      disabled={!isUnlocked}
                      title={isUnlocked ? undefined : t("slayer.tower.locked").replace("{n}", String(floor.slayerLevelRequired))}
                      onClick={isUnlocked ? () => setTowerFloor(floor.floor) : undefined}
                    >
                      {!floorBg && (
                        <div className="zone-card-img">
                          <span className="zone-card-ph">⚔</span>
                        </div>
                      )}
                      {isTaskFloor && (
                        <span className="slayer-target-badge">{t("slayer.task.targetZone")}</span>
                      )}
                      <div className="zone-card-name">{tr(floor.name)}</div>
                      <div className="zone-card-meta">
                        {t("slayer.tower.floor").replace("{n}", String(floor.floor))}
                        {levels.length > 0 && (
                          <> · {t("combat.zoneLevels").replace("{min}", String(minLvl)).replace("{max}", String(maxLvl))}</>
                        )}
                      </div>
                      {isUnlocked ? (
                        <div className="zone-card-meta muted">
                          {floorMonsters.length} {t("combat.enemies")}
                        </div>
                      ) : (
                        <div className="zone-card-meta muted">
                          {t("slayer.tower.locked").replace("{n}", String(floor.slayerLevelRequired))}
                        </div>
                      )}
                    </button>
                  );
                })}
            </div>
          </>
        )}
        {/* codex:2026-08-02T12:18:00+02:00 — Frontline-Ribbon-Reihenfolge:
            The Reach → Dungeons → Slayer Tower → Paragon Tower. */}
        <ParagonTowerSection />
      </div>
    );
  }

  // ── Stufe 2: Gegner der gewählten Zone ──
  const group = byZone.find((g) => g.zone.id === zoneId);
  if (!group) return <div className="combat-select" />;

  // Elite-/World-Spawns (design/elite-spawns-concept.md §2.3, Phase 3 UI): ist diese Zone GERADE
  // aktiv, oben eine hervorgehobene EliteMonsterCard voranstellen — graceful gegen leeren
  // `content.elites` (Phase 2 parallel von content-dev befüllt) UND gegen Content-Drift
  // (Variante/Basis-Monster nachträglich aus dem Katalog entfernt, `eliteScaledMonster` liefert
  // dann `null` — der Zweig bleibt einfach ungenutzt, kein Crash).
  const zoneEliteEntry2 = state.eliteZones?.[zoneId];
  const zoneEliteActive2 = zoneEliteEntry2 && "variantId" in zoneEliteEntry2 ? zoneEliteEntry2 : null;
  const eliteVariant2 = zoneEliteActive2 ? content.elites?.[zoneEliteActive2.variantId] : undefined;
  const eliteScaled = eliteVariant2 ? eliteScaledMonster(content, zoneEliteActive2!.variantId) : null;

  return (
    <div className="combat-select">
      <div className="zone-detail-head">
        <button className="zone-back" onClick={() => { lastZoneId = null; setZoneId(null); }}>
          ← {t("combat.allZones")}
        </button>
        <h2 className="block-heading">{tr(group.zone.name)}</h2>
      </div>

      <div className="monster-grid">
          {eliteVariant2 && eliteScaled && zoneEliteActive2 && (
            <EliteMonsterCard
              m={eliteScaled}
              variant={eliteVariant2}
              cardBg={getBattleScreenCard(zoneId) ?? getZoneBackgroundCard(zoneId)}
              remainingMs={zoneEliteActive2.remainingMs}
              offenseLevel={offenseLevel}
              stats={stats}
              busy={!!state.combat.eliteVariantId}
              onFight={() => startEliteCombat(state, content, zoneId)}
            />
          )}
          {group.monsters.map((m) => {
            const cardBg = getBattleScreenCard(m.zone) ?? getZoneBackgroundCard(m.zone);
            return (
              <MonsterCard
                key={m.id}
                m={m}
                cardBg={cardBg}
                isTaskTarget={m.id === taskMonsterId}
                playerCombatLevel={playerCombatLevel}
                offenseLevel={offenseLevel}
                stats={stats}
                onQueue={(target, atFront) =>
                  (atFront ? enqueueFightAtFront : enqueueFight)(state, content, m.id, target)
                }
              />
            );
          })}
        </div>
    </div>
  );
}

// Task #318 §2 (MonsterSelect-Leerlauf-Kosten): `React.memo` OHNE Props ist hier bewusst korrekt —
// MonsterSelect nimmt keine Props entgegen, ein Parent-Re-Render (CombatPage hängt selbst am
// 10-Hz-`totalTicks`-Gate, s. dortiges JSDoc, weil <Battle> die volle Kadenz braucht) würde
// MonsterSelect sonst trotz seines EIGENEN, stabilen `useGameSelector`-Gates bei JEDEM Tick
// mitrendern (`useSyncExternalStore`s Bail-out verhindert nur extern über die eigene Subscription
// getriggerte Re-Renders, NICHT das normale Re-Rendern als Kind eines re-rendernden Elternteils).
// `memo` entkoppelt MonsterSelect von CombatPages Kadenz — es rendert danach NUR noch, wenn sein
// eigener `monsterSelectGate`-Selector oder eigener lokaler State (zoneId/zoneSearch/…) sich
// ändert. Verifiziert per Playwright-Messkript (Vorher/Nachher, s. Bericht an den Chef).
const MonsterSelect = memo(MonsterSelectImpl);

/** Food- & Auto-Eat-Steuerung (Melvor-Stil): welches Essen, Auto-Eat-Stufe + Upgrade. */
function CombatFoodAutoEat(): JSX.Element {
  const state = useGameState();
  const { t, tr } = useI18n();
  const tooltip = useItemTooltip();
  const c = state.character;
  const maxHp = computeStats(state, content).maxHp;

  // Nur echtes Cooking-Food — Herblore-Heiltränke (isHealPotion) gehören in den separaten
  // Auto-Trank-Slot (CombatAutoPotion) und werden hier bewusst ausgeschlossen (Task #243 Chef).
  const foods = Object.values(content.items).filter(
    (it) =>
      it.type === "consumable" &&
      (it.healAmount ?? 0) > 0 &&
      itemCount(state.inventory, it.id) > 0 &&
      !isHealPotion(content, it.id),
  );
  const tier = c.autoEatTier ?? 0;
  const atMaxTier = tier >= AUTO_EAT_MAX_TIER;
  const threshold = effectiveAutoEatThreshold(c);
  const eatPct = Math.round(threshold * 100);
  const healMult = autoEatHealMult(tier);
  const upgradeCost = autoEatUpgradeCost(state);

  const selFood = c.food ? content.items[c.food] : null;
  const selImg = c.food ? getItemImage(c.food) : null;
  const selCount = c.food ? itemCount(state.inventory, c.food) : 0;
  // Task #243 Chef: echter Heilwert (healPct·maxHp via consumableHeal) statt flachem healAmount —
  // gleiches Muster wie ItemTooltip.tsx.
  const effHeal = selFood ? Math.round(consumableHeal(selFood, maxHp) * healMult) : 0;

  return (
    <div className="cl-food-body">
      {/* Aktuell gewähltes Essen */}
      <div className="cl-food-current">
        <div
          className={`cl-food-slot${selFood ? " filled" : ""}`}
          onMouseEnter={selFood && c.food ? (e) => tooltip.show(c.food!, e.clientX, e.clientY, []) : undefined}
          onMouseLeave={selFood ? () => tooltip.hide() : undefined}
        >
          {selImg ? (
            <img loading="lazy" decoding="async" src={selImg} alt="" />
          ) : (
            <span className="cl-food-empty">{selFood?.icon ?? (FOOD_ICON_URL ? <img loading="lazy" decoding="async" src={FOOD_ICON_URL} alt="" className="ui-icon" /> : "🍖")}</span>
          )}
          {selFood && selCount > 0 && <span className="cl-food-qty">{selCount}</span>}
        </div>
        <div className="cl-food-meta">
          <span className="cl-food-name">{selFood ? tr(selFood.name) : t("combat.foodNone")}</span>
          {selFood ? (
            <span className="cl-food-heal">{statIcon("hp")} +{effHeal}</span>
          ) : (
            <span className="cl-food-hint muted">{t("combat.foodPick")}</span>
          )}
        </div>
      </div>

      {/* Essens-Auswahl */}
      <div className="cl-food-choices">
        <button
          className={`cl-food-btn${!c.food ? " active" : ""}`}
          onClick={() => selectFood(state, content, null)}
          title={t("combat.healOff")}
        >
          ✕
        </button>
        {foods.map((f) => {
          const img = getItemImage(f.id);
          return (
            <button
              key={f.id}
              className={`cl-food-btn${c.food === f.id ? " active" : ""}`}
              onClick={() => selectFood(state, content, f.id)}
              onMouseEnter={(e) => tooltip.show(f.id, e.clientX, e.clientY, [])}
              onMouseLeave={() => tooltip.hide()}
            >
              {img ? <img loading="lazy" decoding="async" src={img} alt="" /> : <span>{f.icon ?? (FOOD_ICON_URL ? <img loading="lazy" decoding="async" src={FOOD_ICON_URL} alt="" className="ui-icon" /> : "🍖")}</span>}
              <span className="cl-food-btn-qty">{itemCount(state.inventory, f.id)}</span>
            </button>
          );
        })}
        {foods.length === 0 && <span className="cl-food-hint muted">{t("combat.noFood")}</span>}
      </div>

      {/* Auto-Eat-Stufe + Upgrade */}
      <div className="cl-autoeat">
        <div className="cl-autoeat-info">
          <span className="cl-autoeat-tier">{t("combat.autoEatTier").replace("{n}", String(tier))}</span>
          <span className="cl-autoeat-detail muted">
            {t("combat.autoEatEatsAt").replace("{p}", String(eatPct))} · ×{healMult}
          </span>
        </div>
        {/* Max-Tier (Chef): konfigurierbare Ess-Schwelle per Slider — wie beim Auto-Potion. Darunter
            zeigt die Detail-Zeile oben die feste Tier-Schwelle; hier gibt's dann keinen Slider. */}
        {atMaxTier && (
          <div className="cl-potion-threshold cl-autoeat-threshold">
            <span className="cl-potion-threshold-label">
              {t("combat.autoEat.threshold").replace("{p}", String(eatPct))}
            </span>
            <div className="opt-slider">
              <input
                type="range"
                className="opt-range"
                min={5}
                max={95}
                step={5}
                value={eatPct}
                onChange={(e) => setAutoEatThreshold(state, Number(e.target.value) / 100)}
              />
              <span className="opt-slider-val">{eatPct}%</span>
            </div>
          </div>
        )}
        {upgradeCost !== null ? (
          <button
            className="cl-autoeat-upgrade"
            disabled={c.gold < upgradeCost}
            title={t("combat.autoEatUpgradeHint")}
            onClick={() => buyAutoEatUpgrade(state)}
          >
            {t("combat.autoEatUpgrade")} · {statIcon("gold")} {formatNum(upgradeCost)}
          </button>
        ) : (
          <span className="cl-autoeat-max">{t("combat.autoEatMax")}</span>
        )}
      </div>
    </div>
  );
}

/**
 * Auto-Trank-Steuerung (Chef-Feature 2026-07-02): welchen Heiltrank automatisch trinken, bei
 * welcher HP-Schwelle, und ob ablaufende Buff-Tonika automatisch nachgetrunken werden. Das
 * Gegenstück zu Auto-Eat (natürliche HP-Regen ist weg — Vorbereitung ist überlebenswichtig),
 * daher bewusst dieselben `cl-food-*`-Klassen für Slot/Auswahlzeile (identischer Sektions-Stil).
 * Mutiert ausschließlich über die Engine-API (combat.ts): selectHealPotion/setAutoPotionThreshold/
 * setAutoRebuffTonics.
 */
function CombatAutoPotion(): JSX.Element {
  const state = useGameState();
  const { t, tr } = useI18n();
  const tooltip = useItemTooltip();
  const ap = state.character.autoPotion;
  const maxHp = computeStats(state, content).maxHp;

  const potions = eligibleHealPotions(state, content);
  const selPotion = ap.healPotionId ? content.items[ap.healPotionId] : null;
  const selImg = ap.healPotionId ? getItemImage(ap.healPotionId) : null;
  const selCount = ap.healPotionId ? itemCount(state.inventory, ap.healPotionId) : 0;
  const thresholdPct = Math.round(ap.healThreshold * 100);
  // Task #243 Chef: echter Heilwert (healPct·maxHp via consumableHeal) statt flachem healAmount.
  const selHeal = selPotion ? consumableHeal(selPotion, maxHp) : 0;

  return (
    <div className="cl-food-body cl-potion-body">
      {/* Aktuell gewählter Heiltrank */}
      <div className="cl-food-current">
        <div
          className={`cl-food-slot${selPotion ? " filled" : ""}`}
          onMouseEnter={selPotion && ap.healPotionId ? (e) => tooltip.show(ap.healPotionId!, e.clientX, e.clientY, []) : undefined}
          onMouseLeave={selPotion ? () => tooltip.hide() : undefined}
        >
          {selImg ? (
            <img loading="lazy" decoding="async" src={selImg} alt="" />
          ) : (
            <span className="cl-food-empty">{selPotion?.icon ?? (POTION_ICON_URL ? <img loading="lazy" decoding="async" src={POTION_ICON_URL} alt="" className="ui-icon" /> : "🧪")}</span>
          )}
          {selPotion && selCount > 0 && <span className="cl-food-qty">{selCount}</span>}
        </div>
        <div className="cl-food-meta">
          <span className="cl-food-name">{selPotion ? tr(selPotion.name) : t("combat.autoPotion.none")}</span>
          {selPotion ? (
            <span className="cl-food-heal">{statIcon("hp")} +{selHeal}</span>
          ) : (
            <span className="cl-food-hint muted">{t("combat.autoPotion.choose")}</span>
          )}
        </div>
      </div>

      {/* Trank-Auswahl */}
      <div className="cl-food-choices">
        <button
          className={`cl-food-btn${!ap.healPotionId ? " active" : ""}`}
          onClick={() => selectHealPotion(state, content, null)}
          title={t("combat.autoPotion.none")}
        >
          ✕
        </button>
        {potions.map((id) => {
          const item = content.items[id];
          const img = getItemImage(id);
          return (
            <button
              key={id}
              className={`cl-food-btn${ap.healPotionId === id ? " active" : ""}`}
              onClick={() => selectHealPotion(state, content, id)}
              onMouseEnter={(e) => tooltip.show(id, e.clientX, e.clientY, [])}
              onMouseLeave={() => tooltip.hide()}
            >
              {img ? <img loading="lazy" decoding="async" src={img} alt="" /> : <span>{item?.icon ?? (POTION_ICON_URL ? <img loading="lazy" decoding="async" src={POTION_ICON_URL} alt="" className="ui-icon" /> : "🧪")}</span>}
              <span className="cl-food-btn-qty">{itemCount(state.inventory, id)}</span>
            </button>
          );
        })}
        {potions.length === 0 && <span className="cl-food-hint muted">{t("combat.autoPotion.noPotions")}</span>}
      </div>

      {/* HP-Schwelle: „Trinken unter X % HP" (Citadel-Slider wie in den Optionen) */}
      <div className="cl-potion-threshold">
        <span className="cl-potion-threshold-label">
          {t("combat.autoPotion.threshold").replace("{p}", String(thresholdPct))}
        </span>
        <div className="opt-slider">
          <input
            type="range"
            className="opt-range"
            min={10}
            max={90}
            step={5}
            value={thresholdPct}
            onChange={(e) => setAutoPotionThreshold(state, Number(e.target.value) / 100)}
          />
          <span className="opt-slider-val">{thresholdPct}%</span>
        </div>
      </div>

      {/* codex:2026-08-02T16:20:00+02:00 — Prep-Vertrag: Auto-Buff ist eine einmalige
          50.000-Gold-Freischaltung. Erst danach erscheint der eigentliche Ein/Aus-Schalter. */}
      {ap.autoRebuffUnlocked ? (
        <label className="cl-potion-rebuff-label">
          <input
            type="checkbox"
            checked={ap.autoRebuffTonics}
            onChange={(e) => setAutoRebuffTonics(state, e.target.checked)}
          />
          <span>{t("combat.autoPotion.rebuff")}</span>
        </label>
      ) : (
        <div className="cl-potion-rebuff-locked">
          <span className="cl-potion-rebuff-copy">{t("combat.autoPotion.rebuffUnlockHint")}</span>
          <button
            type="button"
            className="cl-autoeat-upgrade cl-potion-rebuff-unlock"
            disabled={state.character.gold < AUTO_REBUFF_UNLOCK_COST}
            onClick={() => unlockAutoRebuffTonics(state)}
          >
            {t("combat.autoPotion.rebuffUnlock")} · {statIcon("gold")} {formatNum(AUTO_REBUFF_UNLOCK_COST)}
          </button>
        </div>
      )}

      {/* Sekunden aus der Konstante gespeist — der Hint sagte hardcoded „5s", real sind 8s (Drift-Fix). */}
      <span className="cl-potion-cooldown-hint muted">{t("combat.autoPotion.cooldownHint").replace("{n}", String(AUTO_POTION_COOLDOWN_MS / 1000))}</span>
    </div>
  );
}

// ── Feature: Session-Ertrags-Zeile ───────────────────────────────────────────────────────────
// Kompakte "Diese Sitzung"-Zeile im Kampf-Loadout: Gold/XP/Kills/seltene Drops seit Sitzungsbeginn.
// RENDERER-ONLY (Toasts.tsx-Tally-Muster): reiner Snapshot-Vergleich pro Tick, KEIN Engine-/
// Save-Eingriff. Modul-Level statt useRef (wie `lastZoneId` oben) — der Snapshot übersteht damit
// Zonen-/Kampf-Wechsel UND CombatPage-Remounts (das Modul bleibt für die App-Laufzeit geladen,
// statischer Import in App.tsx). Der Startpunkt ist das erste Mounten der Loadout-Leiste, nicht
// exakt der App-Start — eine praxisnahe Näherung, da Kampf i.d.R. die zuerst besuchte Seite ist.
interface SessionSnapshot {
  gold: number;
  goldSpent: number;
  xp: number;
  kills: number;
  rares: number;
}
let sessionSnapshot: SessionSnapshot | null = null;

const SESSION_RARE_RARITIES = new Set(["rare", "epic", "legendary"]);

/** Summe aller aktuell GEHALTENEN seltenen (rare/epic/legendary) Items über alle Aufbewahrungsorte
 *  (Inventar + Instanz-Tasche + Ausrüstung + Bank) — dieselbe Aggregation wie Toasts.tsx `rares`,
 *  hier als EINE Gesamtzahl statt je Item-ID (die Session-Zeile zeigt nur den Gesamtzuwachs). */
function totalRareItemCount(state: GameState): number {
  const isRare = (id: string | null | undefined): boolean =>
    !!id && SESSION_RARE_RARITIES.has(content.items[id]?.rarity ?? "");
  let total = 0;
  for (const slot of state.inventory.slots) if (slot && isRare(slot.itemId)) total += slot.qty;
  for (const inst of state.inventory.instances) if (isRare(inst.baseItemId)) total += 1;
  for (const id of Object.values(state.character.equipment)) if (isRare(id)) total += 1;
  for (const inst of Object.values(state.character.equippedInstances ?? {})) {
    if (inst && isRare(inst.baseItemId)) total += 1;
  }
  for (const [id, q] of Object.entries(state.bank)) if (isRare(id)) total += q;
  for (const inst of state.bankInstances ?? []) if (isRare(inst.baseItemId)) total += 1;
  return total;
}

interface SessionTotals {
  gold: number;
  xp: number;
  kills: number;
  rares: number;
}

/**
 * Liest/aktualisiert den Modul-Snapshot und liefert die Session-Deltas. Gold wird über
 * `stats.goldSpent` (kumulativ, nur steigend) zum tatsächlich VERDIENTEN Gold zurückgerechnet:
 * `aktuellesGold − Start + (ausgegebenJetzt − ausgegebenStart)` — reines Ausgeben (Shop-Kauf)
 * soll die angezeigte Sitzungs-Summe nicht schrumpfen lassen. XP (Summe aller Skill-XP) und Kills
 * sind bereits kumulativ (nie sinkend) → dort reicht die einfache Differenz. Seltene Drops: reine
 * Bestands-Differenz (kein Renner-Zähler) — ein Verkauf einer in dieser Sitzung gefundenen Rarität
 * senkt die angezeigte Zahl entsprechend; akzeptabler Trade-off für ein reines Renderer-Feature
 * ohne eigenen kumulativen Engine-Zähler.
 */
function computeSessionTotals(state: GameState): SessionTotals {
  let xp = 0;
  for (const id of Object.keys(content.skills)) xp += state.skills[id]?.xp ?? 0;
  const rares = totalRareItemCount(state);
  const snap = sessionSnapshot;
  if (!snap) {
    sessionSnapshot = { gold: state.character.gold, goldSpent: state.stats.goldSpent, xp, kills: state.stats.kills, rares };
    return { gold: 0, xp: 0, kills: 0, rares: 0 };
  }
  return {
    gold: Math.max(0, state.character.gold - snap.gold + (state.stats.goldSpent - snap.goldSpent)),
    xp: Math.max(0, xp - snap.xp),
    kills: Math.max(0, state.stats.kills - snap.kills),
    rares: Math.max(0, rares - snap.rares),
  };
}

function useSessionTotals(): SessionTotals {
  const state = useGameState();
  const [totals, setTotals] = useState<SessionTotals>({ gold: 0, xp: 0, kills: 0, rares: 0 });
  useEffect(() => {
    setTotals(computeSessionTotals(state));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.totalTicks]);
  return totals;
}

/** Kompakte "Diese Sitzung"-Zeile (Chef-Feature): Gold/XP/Kills/seltene Drops seit Session-Start;
 *  der Tooltip liefert dieselben Zahlen ausgeschrieben. Lebt als eigene cl-section im Loadout —
 *  dadurch sichtbar sowohl in der Zonen-Auswahl-Sidebar als auch in der aktiven Kampf-Spalte. */
function SessionTallyRow(): JSX.Element {
  const { t } = useI18n();
  const totals = useSessionTotals();
  const tooltip = [
    `${t("stats.gold")}: +${formatNum(totals.gold)}`,
    `${t("skill.t.xp")}: +${formatNum(totals.xp)}`,
    `${t("combat.session.killsShort")}: ${formatNum(totals.kills)}`,
    `${t("combat.session.raresShort")}: ${formatNum(totals.rares)}`,
  ].join("\n");
  return (
    <div className="cl-section cl-section-session">
      <span className="cl-title">{t("combat.session.label")}</span>
      <div className="cl-session-row" title={tooltip}>
        <span className="cl-session-stat">{statIcon("gold")} +{formatNum(totals.gold)}</span>
        <span className="cl-session-stat">+{formatNum(totals.xp)} {t("skill.t.xp")}</span>
        <span className="cl-session-stat">{formatNum(totals.kills)} {t("combat.session.killsShort")}</span>
        <span className="cl-session-stat cl-session-rare">{formatNum(totals.rares)} ✦</span>
      </div>
    </div>
  );
}

/**
 * Chef-Auftrag 2026-08-03 ("Frontline-Dock wirkt in der Zonen-Übersicht out of place, mehr Platz
 * für die Zonen" + Erweiterung "Battle Record genauso einklappbar"): EIN gemeinsamer Griff-Baustein
 * für beide Kampf-Seitenpanels — das linke Ausrüstungs-Dock (`side="left"`, CombatLoadoutBar) UND
 * den rechten Battle Record (`side="right"`, Battle) — statt zweier separater Implementierungen.
 * Ausgeklappt: schmale Kopfleiste mit Chevron (zeigt zur eigenen Außenkante — Klick kollabiert
 * dorthin). Eingeklappt: der Griff wird zur GESAMTEN sichtbaren Panel-Fläche (ganzer Klickbereich,
 * nicht nur der Chevron) mit rotiertem Label + Chevron, der jetzt in den Inhalt hinein zeigt (Klick
 * klappt wieder aus). Persistenz s. util/uiPrefs.ts get/setCombatDockCollapsed / -RecordCollapsed
 * (ein globaler Zustand je Panel, geteilt zwischen Zonen-Übersicht und laufendem Kampf).
 */
function CombatDockToggle({
  side,
  collapsed,
  onToggle,
  hint,
  label,
}: {
  side: "left" | "right";
  collapsed: boolean;
  onToggle: () => void;
  hint: string;
  label: string;
}): JSX.Element {
  const collapseGlyph = side === "left" ? "◂" : "▸";
  const expandGlyph = side === "left" ? "▸" : "◂";
  if (collapsed) {
    return (
      <button
        type="button"
        className={`cl-dock-rail cl-dock-rail--${side}`}
        onClick={onToggle}
        title={hint}
        aria-label={hint}
        aria-expanded={false}
      >
        <span className="cl-dock-toggle-chevron" aria-hidden="true">{expandGlyph}</span>
        <span className="cl-dock-rail-label">{label}</span>
      </button>
    );
  }
  return (
    <button
      type="button"
      className={`cl-dock-toggle cl-dock-toggle--${side}`}
      onClick={onToggle}
      title={hint}
      aria-label={hint}
      aria-expanded={true}
    >
      <span className="cl-dock-toggle-chevron" aria-hidden="true">{collapseGlyph}</span>
    </button>
  );
}

/** Frontline-Ribbon-Dock: dieselben vier Funktionsseiten in Zonenwahl und laufendem Kampf. */
type CombatDockTab = "gear" | "skills" | "style" | "prep";

// codex:2026-08-02T11:43:36+02:00 — Frontline-Ribbon-Dock: vier stabile Funktionsseiten statt
// einer langen, layoutabhängigen Sektionen-Kette. Die Inhalte bleiben dieselben Engine-Verträge;
// nur Gear verwendet bewusst die bereits mit der Character-Seite geteilte EquipmentOverview.
function CombatLoadoutBar({
  collapsed,
  onToggleCollapsed,
}: {
  collapsed: boolean;
  onToggleCollapsed: () => void;
}): JSX.Element {
  const state = useGameState();
  const { t, tr } = useI18n();
  const c = state.character;
  const stats = computeStats(state, content);
  const [activeTab, setActiveTab] = useState<CombatDockTab>("gear");

  return (
    <div className={`combat-loadout combat-frontline-dock${collapsed ? " cl-dock--collapsed" : ""}`}>
      {/* Chef-Auftrag 2026-08-03: derselbe Kollaps-Griff wie am Battle Record (s. dortiger Aufruf
          mit side="right") — Ashen-Iron-Leiste, eingeklappt der volle sichtbare Inhalt der Spalte. */}
      <CombatDockToggle
        side="left"
        collapsed={collapsed}
        onToggle={onToggleCollapsed}
        hint={t("combat.dock.toggleHint")}
        label={t("combat.dock.gear")}
      />
      {!collapsed && (
      <>
      <div className="cl-dock-tabs" role="tablist" aria-label={t("combat.dock.ariaLabel")}>
        {(["gear", "skills", "style", "prep"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            className={`cl-dock-tab${activeTab === tab ? " active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {t(`combat.dock.${tab}`)}
          </button>
        ))}
      </div>

      <div className="cl-dock-body">
        {activeTab === "gear" && (
          <div className="cl-dock-pane cl-dock-pane-gear" role="tabpanel">
            <div className="cl-gear-doll"><EquipmentDoll /></div>
            <CombatStatsPanelGrouped />
            <div className="cl-section cl-section-buffs">
              <span className="cl-title">{t("combat.dock.activeBuffs")}</span>
              {c.buffs.length > 0 ? <ActiveBuffsBar buffs={c.buffs} /> : <span className="muted">{t("combat.dock.noBuffs")}</span>}
            </div>
          </div>
        )}

        {activeTab === "skills" && <div className="cl-dock-pane" role="tabpanel"><div className="cl-section cl-section-skills">
        <span className="cl-title">{t("char.combatSkills")}</span>
        <div className="cl-skills">
          {COMBAT_SKILL_IDS.map((id) => {
            const skill = content.skills[id];
            const lvl = levelFromXp(state.skills[id]?.xp ?? 0);
            const xp = state.skills[id]?.xp ?? 0;
            const curXp = xpForLevel(lvl);
            const nextXp = xpForLevel(lvl + 1);
            const pct = nextXp > curXp ? Math.min(100, Math.max(0, ((xp - curXp) / (nextXp - curXp)) * 100)) : 100;
            const boost = skillBoostFor(stats.skillBoosts, id);
            const icon = getSkillIcon(id);
            return (
              <div key={id} className="cl-skill" title={t(`skilldesc.${id}`)}>
                {icon && <img loading="lazy" decoding="async" className="cl-skill-icon" src={icon} alt="" />}
                <span className="cl-skill-name">{skill ? tr(skill.name) : id}</span>
                <span className="cl-skill-lvl">
                  <SkillLevelText base={lvl} boost={boost} />
                </span>
                <span className="cl-skill-xptext">{formatNum(Math.max(0, xp - curXp))} / {formatNum(Math.max(0, nextXp - curXp))}</span>
                <span className="cl-skill-xpbar" aria-hidden="true"><span style={{ width: `${pct}%` }} /></span>
              </div>
            );
          })}
        </div>
        </div>
      </div>}

      {/* Kampf-Haltung: bestimmt im Nahkampf, welcher Melee-Skill XP/Schaden bekommt
         (Angriff=Genauigkeit/attack, Wucht=Schaden/power→str, Defensiv=Block/defence).
         Nur im Nahkampf wählbar — Fern/Magie haben je einen festen Offensiv-Skill. */}
      {activeTab === "style" && (() => {
        // Stance-Leiste adaptiv zum Waffenstil: Melee=Angriff/Wucht/Defensiv, Fernkampf=Präzise/
        // Schnell/Defensiv, Magie=Offensiv/Defensiv. Label + Stances + XP-Ziel wechseln mit der Waffe.
        const style = stats.style;
        const focusLabel = t("combat.dock.style");
        const stanceList =
          style === "ranged" ? ["precise", "fast", "defensive"]
          : style === "magic" ? ["offensive", "defensive"]
          : ["attack", "power", "defensive"];
        const current: string =
          style === "ranged" ? c.rangedStance
          : style === "magic" ? c.magicStance
          : c.combatStyle;
        const setStance = (s: string): void => {
          if (style === "ranged") setRangedStance(state, s as RangedStance);
          else if (style === "magic") setMagicStance(state, s as MagicStance);
          else setCombatStyle(state, s as CombatStyle);
        };
        const xpSkillFor = (s: string): string =>
          style === "ranged" ? (s === "defensive" ? "defence" : "ranged")
          : style === "magic" ? (s === "defensive" ? "warding" : "magic")
          : s === "power" ? "power" : s === "defensive" ? "defence" : "attack";
        // Armor-Iteration 2 §9.2: die defensive Magie-Stance blockt nichts (kein Schild/Block bei
        // Magie) — sie gibt stattdessen ×1.5 Ward-Regen (Warding-Skill). Die generische
        // "style.defensive" = "Defensive (Block)"-Beschriftung wäre hier irreführend, darum eigener
        // Label-Key nur für diese Kombination (Melee/Ranged behalten ihr bestehendes "(Block)").
        const stanceLabel = (s: string): string =>
          style === "magic" && s === "defensive" ? t("style.magicDefensive") : t(`style.${s}`);
        // Armor-Iteration 2.1 §4: die defensive Magie-Stance kostet jetzt -15% Cast-Schaden
        // (dmgMult 0.85) gegen die +50% Ward-Regen — Tradeoff im Tooltip sichtbar machen,
        // ohne den (schon knappen) Button-Label-Platz zu sprengen.
        const stanceTooltip = (s: string): string =>
          style === "magic" && s === "defensive" ? t("style.magicDefensiveTooltip") : stanceLabel(s);
        const stanceEffect = (s: string): string => t(`combat.styleEffect.${style}.${s}`);
        return (
          <div className="cl-dock-pane" role="tabpanel"><div className="cl-section cl-section-stance">
            <span className="cl-title">{focusLabel}</span>
            <div className="cl-stances" title={t("combat.styleHint")}>
              {stanceList.map((s) => {
                const xp = state.skills[xpSkillFor(s)]?.xp ?? 0;
                const lvl = levelFromXp(xp);
                const boost = skillBoostFor(stats.skillBoosts, xpSkillFor(s));
                const cur = xpForLevel(lvl);
                const next = xpForLevel(lvl + 1);
                const pct = next > cur ? Math.min(100, Math.max(0, ((xp - cur) / (next - cur)) * 100)) : 100;
                return (
                  <button
                    key={s}
                    className={`cl-stance${current === s ? " active" : ""}`}
                    onClick={() => setStance(s)}
                    title={stanceTooltip(s)}
                  >
                    <span className="cl-stance-head">
                      <span className="cl-stance-name">{stanceLabel(s)}</span>
                      <span className="cl-stance-lvl">
                        Lv <SkillLevelText base={lvl} boost={boost} />
                      </span>
                    </span>
                    <div className="cl-stance-xpbar" aria-hidden="true">
                      <div className="cl-stance-xpfill" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="cl-stance-effect">{stanceEffect(s)}</span>
                  </button>
                );
              })}
            </div>
          </div></div>
        );
      })()}

      {activeTab === "prep" && <div className="cl-dock-pane" role="tabpanel"><div className="cl-section cl-section-food">
        <span className="cl-title">{t("combat.foodAutoEat")}</span>
        <CombatFoodAutoEat />
      </div>

      {/* Tränke: Auto-Trank-Wahl + HP-Schwelle + Auto-Rebuff (Chef-Feature 2026-07-02, das
         Gegenstück zu Auto-Eat — natürliche HP-Regen ist weg). */}
      <div className="cl-section cl-section-potion">
        <span className="cl-title">{t("combat.autoPotion.title")}</span>
        <CombatAutoPotion />
      </div>
      </div>}
      </div>
      </>
      )}
    </div>
  );
}

/**
 * Generischer Scroll-Container-Finder (Welle MM, Aldric+Grete R3 "Scroll-Anker zielt auf den
 * falschen Container"): der alte Anker lauschte hartverdrahtet auf `.content-body` (MainLayout) —
 * das hat auf der Kampfseite aber NIE Overflow (`scrollHeight === clientHeight`), weil die Zonen-/
 * Dungeon-/Paragon-Liste in einem TIEFER verschachtelten `overflow-y: auto`-Kind scrollt
 * (`.combat-main-area`). Statt eine zweite feste Klasse zu verdrahten, sucht dieser Helfer ab
 * `root` abwärts nach dem Nachfahren mit dem GRÖSSTEN tatsächlichen Overflow (scrollHeight -
 * clientHeight, computed overflow-y auto/scroll) — funktioniert unabhängig davon, welche Klasse
 * der echte Scroller gerade trägt, und bleibt auch robust, falls ein Sidebar-Panel zufällig
 * ebenfalls (viel kleiner) überläuft. `root` selbst zählt mit (deckt Seiten ab, auf denen der
 * übergebene Container direkt scrollt). Fällt nichts im Teilbaum auf, `.content-body` selbst als
 * letzter Rückfall (das alte Verhalten, für den Fall, dass eine künftige Seite dort wirklich
 * scrollt).
 */
function findScrollContainer(root: HTMLElement | null): HTMLElement | null {
  if (!root) return null;
  let best: HTMLElement | null = null;
  let bestOverflow = 1; // >1px Toleranz gegen Rundungs-Rauschen
  const visit = (el: HTMLElement): void => {
    const style = window.getComputedStyle(el);
    if (/(auto|scroll)/.test(style.overflowY)) {
      const overflow = el.scrollHeight - el.clientHeight;
      if (overflow > bestOverflow) {
        bestOverflow = overflow;
        best = el;
      }
    }
    for (const child of Array.from(el.children)) visit(child as HTMLElement);
  };
  visit(root);
  return best ?? document.querySelector<HTMLElement>(".content-body");
}

/**
 * Anzeige-Variante des Elite-Gegners eines laufenden Kampfs (Phase 3 UI, Task 3): die Engine-
 * Andockstelle `eliteCombatMonster` (engine/elites.ts) liefert bewusst NUR die formel-skalierten
 * Stats — `name` bleibt dort ABSICHTLICH identisch zum Basis-Mob (Kill-Credit-/Bestiarium-
 * Konsistenz, s. dortiges JSDoc „Identität … bleibt das Basis-Monster"). Die Battle-Nameplate soll
 * aber den eigentlichen Varianten-TITEL zeigen („Grauzahn, der Ausgehungerte" statt „Wolf") — rein
 * UI-seitig überschrieben (KEIN Engine-Eingriff, `id`/Kill-Credit bleiben unangetastet, nur die für
 * die Anzeige gelesene Kopie trägt den Titel). `undefined`, wenn der Kampf verwaist ist (Variante
 * aus dem Content entfernt, während er lief) — der Aufrufer fällt dann auf den normalen
 * Katalog-Eintrag zurück, exakt wie beim Paragon-Fallback direkt daneben.
 */
function eliteDisplayMonster(state: GameState, contentDb: typeof content): MonsterDef | undefined {
  const scaled = eliteCombatMonster(state, contentDb);
  if (!scaled) return undefined;
  const variant = state.combat.eliteVariantId ? contentDb.elites?.[state.combat.eliteVariantId] : undefined;
  return variant ? { ...scaled, name: variant.name } : scaled;
}

export function CombatPage(): JSX.Element {
  // Task #318 §3 (Selector-Migration, s. Battle-JSDoc für die volle Begründung): CombatPage ist die
  // zweite von der Perf-Audit-JSDoc genannte Context-Konsumentin an derselben Echo-Grenze (sie
  // entscheidet JEDEN Tick über `state.combat.monsterId`, ob <Battle> oder <MonsterSelect> steht) —
  // migriert auf denselben `useGameSelector(totalTicks) + useGetGameState()`-Gate wie Battle.
  useGameSelector((s) => s.totalTicks);
  const getState = useGetGameState();
  const state = getState()!;
  const { t, tr } = useI18n();
  // Chef-Auftrag 2026-08-03: Kollaps-Zustand der beiden Kampf-Seitenpanels lebt HIER (dem
  // gemeinsamen Elternteil beider Zweige — Zonen-Übersicht unten UND <Battle> weiter unten teilen
  // sich denselben CombatPage()-Aufruf, kein Remount dazwischen), damit ein Klick in der
  // Zonen-Übersicht beim Betreten des Kampfs sofort denselben Zustand zeigt und umgekehrt. Reine
  // Anzeige-Vorliebe (localStorage, s. util/uiPrefs.ts) — EIN globaler Wert je Panel, kein
  // Save-State. Der Battle Record (rechts) existiert nur im Kampf, bekommt sein Toggle daher erst
  // in <Battle> gereicht; der Zustand selbst wird trotzdem hier gehalten (dieselbe Quelle, falls
  // <Battle> je remounted).
  const [dockCollapsed, setDockCollapsed] = useState<boolean>(getCombatDockCollapsed);
  const toggleDockCollapsed = (): void => {
    setDockCollapsed((prev) => {
      const next = !prev;
      setCombatDockCollapsed(next);
      return next;
    });
  };
  const [recordCollapsed, setRecordCollapsed] = useState<boolean>(getCombatRecordCollapsed);
  const toggleRecordCollapsed = (): void => {
    setRecordCollapsed((prev) => {
      const next = !prev;
      setCombatRecordCollapsed(next);
      return next;
    });
  };
  // Paragonturm (§7, Welle P2): während einer laufenden Etage muss die Battle-Anzeige die
  // FORMEL-SKALIERTE Instanz zeigen (HP-Balken/Stat-Zeile/Truhen-Box), nicht den rohen Katalog-
  // Eintrag — der echte Kampf (combatStep) rechnet bereits mit den skalierten Werten
  // (paragonCombatMonster, dieselbe Andockstelle), sonst zeigt die UI eine falsche HP-Max/Stat-Zeile
  // gegen den tatsächlich laufenden Kampf. Fallback auf den Katalog-Eintrag hält jeden Nicht-Turm-
  // Kampf unverändert UND schützt defensiv, falls `paragonCombatMonster` mal `undefined` liefert
  // (Rotation passt nicht mehr zur persistierten monsterId, s. dortige JSDoc).
  // Elite-/World-Spawns (Phase 3, Task 3): dieselbe Andockstelle für einen laufenden Elite-Kampf
  // (`eliteVariantId` gesetzt) — s. `eliteDisplayMonster`-JSDoc oben für den Titel-Override.
  const monster = state.combat.monsterId
    ? (state.combat.paragonFloor ? paragonCombatMonster(state, content) : undefined)
        ?? (state.combat.eliteVariantId ? eliteDisplayMonster(state, content) : undefined)
        ?? content.monsters[state.combat.monsterId]
    : null;

  // Scroll-Anker (Welle KK #7a/#8c, Fun-Retest Aldric/Grete "Nach-Sieg-Rauswurf"/"Scroll-Reset nach
  // der Weihe-Zeremonie"; Welle MM Aldric+Grete R3 "Anker zielt auf den falschen Container"):
  // <Battle> und <MonsterSelect> sind Geschwister im selben `.combat-page`-Subtree — jeder Etagen-/
  // Dungeon-Kampf tauscht den kompletten Subtree aus (DungeonClearCeremony-JSDoc: "CombatPage
  // schaltet synchron von <Battle> auf <MonsterSelect> um"). Weil die neue Zonen-/Dungeon-/Paragon-
  // Liste eine andere Höhe hat als die Battle-Ansicht, klemmt der Browser `scrollTop` beim
  // Umschalten auf den neuen Max-Wert — meist nahe 0, der Spieler landet am Seitenanfang statt beim
  // gerade betretenen Panel/der Karte. Der ECHTE Scroll-Container ist NICHT `.content-body`
  // (MainLayout) — die hat auf dieser Seite gar keinen Overflow — sondern `.combat-main-area`
  // (`overflow-y: auto`, tiefer im `.combat-page`-Teilbaum verschachtelt); `findScrollContainer`
  // (oben) ermittelt das generisch statt eine zweite feste Klasse zu verdrahten.
  //
  // WICHTIG (Sim-Verifikation, real beobachtet): ein Capture-Versuch IM Übergangs-Layout-Effect
  // (also GENAU wenn `inCombat` von false auf true kippt) ist zu spät — React hat den Subtree in
  // DIESEM Commit bereits auf <Battle> umgeschaltet, der Browser hat `scrollTop` beim Layout schon
  // auf die neue (kürzere) Höhe geklemmt, BEVOR dieser Effect überhaupt läuft. Fix: Position
  // KONTINUIERLICH per Scroll-Listener mitschreiben, SOLANGE kein Kampf läuft — beim Eintritt in
  // den Kampf ist der zuletzt geschriebene Wert dadurch immer schon aktuell (kein Race), beim
  // Verlassen wird er per useLayoutEffect (vor dem Paint) zurückgeschrieben. Dieselbe Restore-Logik
  // bedient auch die Dungeon-Weihe-Zeremonie (DungeonClearCeremony ist ein App-Level-Overlay über
  // dieser bereits umgeschalteten <MonsterSelect> — der Restore hier läuft VOR ihrem Dismiss).
  const inCombat = !!monster;
  // Spieler-Report 1.0.2: Gegnerliste TROTZ laufendem Kampf. Reiner Ansichts-Merker — er darf
  // nicht ueber das Kampfende hinaus stehen bleiben, sonst zeigt die Seite nach dem naechsten
  // Start weiter die Liste statt der Arena.
  const [enemyListInCombat, setEnemyListInCombat] = useState(false);
  useEffect(() => {
    if (!inCombat) setEnemyListInCombat(false);
  }, [inCombat]);
  const wasInCombatRef = useRef(false);
  const savedScrollRef = useRef(0);
  const pageRef = useRef<HTMLDivElement | null>(null);
  const rafCleanupRef = useRef<number | null>(null);
  useEffect(() => {
    if (inCombat) return; // nur auf der Zonen-/Dungeon-/Paragon-Liste mitschreiben
    const scroller = findScrollContainer(pageRef.current);
    if (!scroller) return;
    savedScrollRef.current = scroller.scrollTop; // sofortiger Stand beim Mount dieses Effects
    const onScroll = (): void => { savedScrollRef.current = scroller.scrollTop; };
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => scroller.removeEventListener("scroll", onScroll);
  }, [inCombat]);
  useLayoutEffect(() => {
    if (!inCombat && wasInCombatRef.current) {
      // Kampf endet gerade (Clear/Tod/Verlassen): exakt dorthin zurück statt an den Seitenanfang.
      //
      // Sim-Verifikation (Welle MM, real beobachtet): direkt in DIESEM Layout-Effect hat der frisch
      // wieder eingehängte `.combat-main-area`-Teilbaum (MonsterSelect remountet komplett, s. JSDoc
      // oben) noch NICHT seinen finalen Overflow — `findScrollContainer` griff hier reproduzierbar
      // daneben (wählte `.combat-sidebar` statt `.combat-main-area`, weil dessen stabiler Overflow
      // in diesem einen synchronen Frame größer maß als der des gerade erst gemounteten Haupt-
      // bereichs). Ein zweiter Korrektur-Durchlauf NACH dem Paint (requestAnimationFrame, wenn nötig
      // ein dritter einen Frame später) trifft dagegen zuverlässig den echten, fertig layouteten
      // Container — kostet nur bei diesem einen Übergang zwei zusätzliche Frames.
      const restoreTo = savedScrollRef.current;
      const apply = (): void => {
        const scroller = findScrollContainer(pageRef.current);
        if (scroller) scroller.scrollTop = restoreTo;
      };
      apply();
      const raf1 = requestAnimationFrame(() => {
        apply();
        const raf2 = requestAnimationFrame(apply);
        rafCleanupRef.current = raf2;
      });
      rafCleanupRef.current = raf1;
    }
    wasInCombatRef.current = inCombat;
    return () => {
      if (rafCleanupRef.current !== null) cancelAnimationFrame(rafCleanupRef.current);
    };
  }, [inCombat]);

  // Aktive Kampf-Ansicht: das Loadout (Equipment/Skills/Focus/Food) ist jetzt Teil des großen
  // Kampf-Containers selbst (siehe Battle → .battle-main → .battle-loadout-col), keine separate
  // Sidebar mehr außerhalb davon. Die Gegner-Auswahl (unten) behält ihre eigene Sidebar.
  // Spieler-Report 1.0.2: waehrend eines laufenden Kampfes die Gegnerliste zeigen duerfen, um
  // nachzulegen. Rein lokal — sobald der Kampf endet, faellt die Seite ohnehin auf die Liste
  // zurueck, und der Merker wird zurueckgesetzt (s. Effekt unten).
  if (monster && !enemyListInCombat) {
    return (
      <div className="combat-page" ref={pageRef}>
        {/* Bereichs-Erst-Tour (Chef-Auftrag Welle B, 2026-07-13): läuft nur beim allerersten
            Besuch dieser Seite, danach für immer aus (state.onboarding.toursSeen.combat) — auch
            wenn dieser erste Besuch mitten in einem laufenden Kampf landet (Alt-Save-Fall). */}
        <AreaTourGuide tourKey="combat" steps={COMBAT_TOUR_STEPS} />
        <Battle
          monster={monster}
          dockCollapsed={dockCollapsed}
          onToggleDock={toggleDockCollapsed}
          recordCollapsed={recordCollapsed}
          onToggleRecord={toggleRecordCollapsed}
          onShowEnemyList={() => setEnemyListInCombat(true)}
        />
      </div>
    );
  }

  return (
    <div className="combat-page" ref={pageRef}>
      <AreaTourGuide tourKey="combat" steps={COMBAT_TOUR_STEPS} />
      {/* Der Rueckweg, wenn die Liste WAEHREND eines laufenden Kampfes offen ist (Spieler-Report
          1.0.2). Steht ueber der Liste, damit niemand glaubt, der Kampf sei vorbei. */}
      {monster && (
        <div className="combat-return-bar">
          <span className="combat-return-note">
            {t("combat.stillFighting").replace("{name}", tr(monster.name))}
          </span>
          <button type="button" className="btn-iron combat-return-btn" onClick={() => setEnemyListInCombat(false)}>
            {t("combat.backToFight")}
          </button>
        </div>
      )}
      {/* Chef-Auftrag 2026-08-03: eingeklapptes Dock gibt seine Spaltenbreite an .combat-main-area
          ab (s. combat.css .combat-layout.dock-collapsed) — derselbe Zustand wie im Kampf. */}
      <div className={`combat-layout${dockCollapsed ? " dock-collapsed" : ""}`}>
        {/* data-guide-id="combat.loadout": geteiltes Tour-Ziel mit .battle-loadout-col oben. */}
        <div className="combat-sidebar" data-guide-id="combat.loadout">
          <CombatLoadoutBar collapsed={dockCollapsed} onToggleCollapsed={toggleDockCollapsed} />
        </div>
        <div className="combat-main-area" data-guide-id="combat.enemySelect">
          <MonsterSelect />
        </div>
      </div>
    </div>
  );
}
