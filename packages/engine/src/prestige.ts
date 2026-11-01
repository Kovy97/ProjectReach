import { storagePredicate } from "./storage"; // claude:2026-10-23T21:50:00+02:00 — Materiallager (1.4.0 ML)
import { resetRaidForPrestige } from "./raid"; // claude:2026-10-25T04:30:00+02:00
import type {
  CharacterState,
  ContentDB,
  EquipSlot,
  GameState,
  ItemDef,
  ItemId,
  ItemInstance,
  MonsterId,
  PetId,
  PrestigePaidLedger,
  PrestigeRecord,
  PrestigeRespec142, // claude:2026-10-31T14:58:54+01:00 — SAVE 102 Rückgabe/Nachzahlung
  PrestigeRunBaseline,
  PrestigeRunTally,
  QuestDef,
  RaidDifficulty,
  SkillId,
  WeaponStyle,
} from "@hearthforge/shared";
import {
  DUNGEON_VARIANT_PREFIX,
  EQUIP_SLOTS,
  PRESTIGE_AP_STEP,
  PRESTIGE_DUNGEON_POINTS_CAP,
  PRESTIGE_DUNGEON_STEP,
  PRESTIGE_GOLD_POINTS_CAP,
  PRESTIGE_GOLD_STEP,
  PRESTIGE_POINTS_PER_AP_STEP,
  PRESTIGE_POINTS_PER_BESTIARY_ENTRY,
  PRESTIGE_POINTS_PER_PET,
  PRESTIGE_POINTS_PER_RAID_CLEAR,
  PRESTIGE_POINTS_RAID_FIRST,
  PRESTIGE_RAID_POINTS_CAP,
  PRESTIGE_SLAYER_POINTS_CAP,
  PRESTIGE_SLAYER_STEP,
  RAID_DIFFICULTIES,
  defaultPrestigePaidLedger,
  emptyPrestigeRespecRetro, // claude:2026-10-31T14:58:54+01:00 — SAVE 102
  PRESTIGE_TALENT_TREE_ID, // claude:2026-10-31T14:58:54+01:00 — SAVE 102: Rückgabe räumt nur diesen Baum
  earnedAP,
  totalAP,
  PRESTIGE_CHRONICLE_BONUS_FROM_CHAPTER,
  PRESTIGE_HEIRLOOM_MIN_REQUIREMENT,
  PRESTIGE_PARAGON_FLOOR_STEP,
  PRESTIGE_PARAGON_POINTS_CAP,
  PRESTIGE_POINTS_BASE,
  PRESTIGE_POINTS_CORE_99,
  PRESTIGE_POINTS_PER_99,
  PRESTIGE_POINTS_PER_EXTRA_99,
  PRESTIGE_POINTS_PER_LATE_CHAPTER,
  PRESTIGE_POINTS_PER_PARAGON_STEP,
  PRESTIGE_POINTS_PER_TOTAL_LEVEL_STEP,
  PRESTIGE_RECALL_GOLD_MULT,
  PRESTIGE_RECALL_MAX_CHAPTER,
  PRESTIGE_REQUIRED_99,
  PRESTIGE_RUN_TALLY_KEYS,
  PRESTIGE_SKILL_LEVEL,
  PRESTIGE_STASH_STACK_CAP,
  PRESTIGE_TOTAL_LEVEL_STEP,
  PRESTIGE_TOTAL_LEVEL_THRESHOLD,
  PRESTIGE_UNLOCK_QUEST_ID,
  chronicleChapterNumber,
  defaultPrestigeRunBaseline,
  defaultPrestigeState,
  isCrossSaveTransferBlocked,
  isToolSlot,
  syncBankOrder,
} from "@hearthforge/shared";
import { levelFromXp } from "./leveling";
import { nextFloat } from "./rng";
import { computeStats, totalLevel } from "./character";
import { createGame } from "./state";
import { carryDailyBoard, questRunBaselines, questStatus, questUnlocked } from "./quests"; // claude:2026-10-31T13:58:31+01:00 — + carryDailyBoard (A1)
import { mintInstanceId } from "./enchant";
import { talentEffect } from "./talents";
import { isDungeonUnlocked } from "./dungeon"; // claude:2026-10-31T15:36:11+01:00 — SAVE 102: Alte-Pfade-Dungeons über die Rückgabe offen halten
import { monsterKills, seenDropCount } from "./drops"; // claude:2026-10-30T18:44:00+01:00 — 1.4.2 Bestiarium-Quelle

// ───────────────────────────────────────────────────────────────────────────
// claude:2026-10-17T23:30:00+02:00 — PRESTIGE-FUNDAMENT (1.3, Welle B1, SAVE 88).
// Konzept: design/1.3-prestige-konzept.md inkl. „Chef-Entscheide 17.10.2026 abends". Interne IDs neutral
// (`prestige`, Währung `prestigePoints`, Baum `prestige`); Spielertexte/UI folgen in Welle D, Knoten-
// Wirkungen in Welle B2. Rein & deterministisch: kein Math.random, kein Date.now, kein I/O.
//
// claude:2026-10-18T12:00:00+02:00 — Welle B2 („Der Aschesturz", Chef-Entscheide 18.10.): kalibrierte
// Punkte-Formel (Balance § 4), Narbenbuch-Knoten im Aufstieg (Grabmünzen, Schwielen, Vergrabene Truhe,
// Erbstück) samt Spielerauswahl + Vorschau, Erinnerung (Kapitel 1–18), Post-Sperre. Laufende Wirkungen
// (XP/Gold/Schaden/Leben) leben in prestige-effects.ts, „Alte Pfade" in dungeon.ts `isDungeonUnlocked`.
// ───────────────────────────────────────────────────────────────────────────

/** Einstufung eines State-Felds beim Aufstieg: bleibt (`keep`) oder zurück auf den Neuzustand (`reset`). */
export type PrestigeFieldClass = "keep" | "reset";

/**
 * WÄCHTERLISTE (Top-Level): JEDES GameState-Feld steht hier genau einmal. Der vollständige Record erzwingt
 * das schon im Typecheck (fehlendes Feld = Fehler); prestige.test.ts prüft zusätzlich die echten Schlüssel
 * eines frischen und eines Vault-Spielstands. Ein neues Feature ohne Einstufung bricht damit den Build.
 *
 * Grundsätze (Konzept-Tabelle + Chef-Entscheid 2): Sammlung/Wissen bleibt (Erfolge, Bestiarium, Wiki,
 * Statistiken, Begleiter, Meisterschaft, Talente, Elite-Codex, Einstellungen, Onboarding, Einmal-Flags);
 * alles, was den Durchgang ausmacht, startet neu. Technische Monoton-Zähler (`*Seq`, `nextInstanceSeq`,
 * Spielzeit-Uhren) bleiben, damit IDs/Breadcrumbs nie kollidieren und Uhren nie rückwärts laufen.
 */
export const PRESTIGE_STATE_FIELDS: Readonly<Record<keyof GameState, PrestigeFieldClass>> = {
  version: "reset", // = SAVE_VERSION in beiden Fällen
  rng: "reset", // neuer Strom, deterministisch aus dem alten abgeleitet (prestigeNextSeed)
  totalTicks: "keep", // Uhren laufen nie rückwärts
  elapsedMs: "keep",
  activePlayMs: "keep", // angezeigte Gesamtspielzeit
  accumulatorMs: "keep", // Sub-Tick-Rest der Uhr
  activeActionId: "reset",
  actionProgressMs: "reset",
  actionTarget: "reset",
  actionQueue: "reset",
  queueFight: "reset",
  queueDungeon: "reset",
  queuePaused: "reset",
  lastQueueSkip: "reset",
  character: "reset", // feldweise, s. PRESTIGE_CHARACTER_FIELDS
  combat: "reset",
  skills: "reset",
  inventory: "reset",
  stats: "keep", // Statistiken (Konzept: bleibt)
  achievements: "keep",
  claimedApMilestones: "keep",
  apMilestoneSeq: "keep",
  lastApMilestone: "keep",
  apCeremonyPending: "keep",
  monsterKills: "keep", // Bestiarium
  dungeonsCleared: "keep", // Lebenszeit-Zähler (Erfolge, „Alte Pfade"); Quests messen per Laufanker ab dem Aufstieg
  dungeonsUnlocked: "reset", // „freigeschaltete Dungeons: zurück"
  lastDungeonUnlock: "reset",
  legacyZoneGrants: "reset", // Bestandsschutz für Alt-Saves; im neuen Durchgang gelten die Chronik-Gates
  paragon: "reset",
  paragonChestSeq: "keep",
  lastParagonChest: "reset",
  lastStop: "reset",
  stunMs: "reset",
  thievingRisk: "keep", // Spieler-Modus (Einstellung)
  mastery: "keep", // Chef-Entscheid 2
  bank: "reset", // Ausnahmen über Narbenbuch-Knoten (Vergrabene Truhe, Erbstück, Schwielen) landen im neuen Lager
  bankOrder: "reset",
  bankSlotsPurchased: "reset", // mit Gold gekauft (Gold zurück)
  lockedItems: "keep", // claude:2026-10-23T22:50:00+02:00 — Bergungs-Schloss ist eine Spieler-Vorliebe (1.4.0 BG)
  eventRng: "keep", // claude:2026-10-24T23:35:00+02:00 — Zufallsstrom läuft weiter (1.4.0 EV), Muster eliteRng
  skillEvents: "reset", // laufendes Ereignis und Abklingzeit beginnen neu
  workOrders: "reset", // Aufträge gelten dem alten Fortschritt (Lohn beim Angebot festgeschrieben)
  raid: "keep", // claude:2026-10-25T03:00:00+02:00 — Freischaltungen/Zähler bleiben; laufender Lauf und Wochentruhen setzt applyPrestige zurück (raid.ts resetRaidForPrestige, R10)
  seenDrops: "keep", // Wiki-Funde
  seenActionDrops: "keep",
  discoveredItems: "keep", // vereinigt mit dem Starterbesitz des Neustands
  masteryCapes: "reset", // Ring geht mit der Ausrüstung, erneute 99 verleiht ihn wieder
  capeGranted: "reset",
  capeCeremonySeen: "reset", // Invariante ⊆ masteryCapes
  settings: "keep",
  quests: "reset", // Neuzustand + Laufanker (questRunBaselines); claude:2026-10-31T13:58:31+01:00 — nur das Tagesbrett wandert mit (carryDailyBoard, A1)
  petDropSeq: "keep",
  lastPetDrop: "keep",
  farmPlots: "reset",
  slayerTask: "reset",
  slayerPoints: "reset",
  slayerTasksCompleted: "keep", // reiner Lebenszeit-Zähler (nur Erfolge)
  slayerStreak: "reset",
  slayerStreakSeq: "keep",
  lastSlayerStreakBonus: "reset",
  slayerFreeSkipDay: "keep", // claude:2026-10-30T18:22:00+01:00 — hängt an der Trophäenwand; New Haven bleibt seit 1.4.2, also bleibt auch der Tages-Stempel (sonst zweiter Gratis-Skip am selben Tag)
  slayerAutoTask: "keep", // claude:2026-10-25T10:32:00+01:00 — Spieler-Vorliebe (1.4.1 S1, Muster thievingRisk)
  talents: "keep", // alle Bäume inkl. Jägerkodex (wirkt erst wieder ab Slayer 85) und Narbenbuch
  petPity: "keep",
  bankInstances: "reset",
  nextInstanceSeq: "keep", // Instanz-IDs im behaltenen Postfach dürfen nie neu vergeben werden
  buyBack: "reset",
  onboarding: "keep",
  mailbox: "keep", // Post mit Inhalt wird beim Aufstieg `prestigeHeld` (gesperrt wie Rabenfracht)
  mailSeq: "keep",
  eliteRng: "reset", // aus dem neuen Seed abgeleitet (createGame)
  eliteZones: "reset",
  eliteSpawnSeq: "keep",
  lastEliteSpawn: "reset",
  firstSuffixGranted: "keep", // Einmal-Flag
  eliteCodex: "keep",
  eliteKillSeq: "keep",
  lastEliteKill: "reset",
  equipKits: "reset",
  activeKit: "reset",
  camp: "keep", // claude:2026-10-30T18:22:00+01:00 — Chef 30.10. (1.4.2): New Haven überlebt den Aschesturz komplett (Gebäude, Karte, Veredelung, Bau-Warteschlange, laufender Bau)
  tavern: "reset",
  huntTraps: "reset",
  huntCatchSeq: "keep",
  prestige: "keep", // fortgeschrieben: count+1, Punkte, Historie
  tokenShopLedger: "keep", // claude:2026-10-30T22:28:00+01:00 — Belohnungsladen 1.4.2 (L2): Grenzen laufen über den Sturz weiter, sonst schenkte ein Sturz frische Tages-/Wochenkäufe
  pinnedRecipes: "keep", // claude:2026-10-31T11:46:28+01:00 — Rezepte anpinnen (1.4.2, SAVE 101): Spieler-Vorliebe wie thievingRisk, überlebt den Aschesturz
  queueTemplates: "keep", // claude:2026-10-31T16:08:21+01:00 — Warteschlangen-Vorlagen (1.4.2, SAVE 103): gespeicherte Planung des Spielers, überlebt den Aschesturz
};

/** WÄCHTERLISTE (Charakter): jedes CharacterState-Feld genau einmal (Muster PRESTIGE_STATE_FIELDS). */
export const PRESTIGE_CHARACTER_FIELDS: Readonly<Record<keyof CharacterState, PrestigeFieldClass>> = {
  name: "keep",
  portraitId: "keep",
  portrait: "keep",
  createdAt: "keep",
  baseAttributes: "keep",
  totalLevel: "reset", // neu berechnet
  combatStyle: "keep", // Vorliebe
  rangedStance: "keep",
  magicStance: "keep",
  hp: "reset", // neu berechnet (maxHp des Neustands)
  equipment: "reset",
  food: "reset",
  meal: "reset", // claude:2026-10-23T16:30:00+02:00 — Mahlzeit-Wahl verweist auf Inventar/Bank (beide zurück)
  quiver: "reset", // claude:2026-10-24T18:45:00+02:00 — geladene Pfeile sind Lagerware (Lager zurück, 1.4.0 FK)
  mealKeep: "keep", // Schalter (kostenlos, Einstellung)
  autoEatTier: "reset", // mit Gold gekauft
  autoEatThreshold: "keep", // Regler, wirkt nur auf Max-Stufe
  autoPotion: "reset", // enthält den gekauften Auto-Rebuff und eine Item-Wahl
  gold: "reset", // Startgold über Narbenbuch „Grabmünzen"
  questTokens: "reset", // „Marken: zurück"
  mana: "reset",
  ward: "reset",
  buffs: "reset",
  companionPetId: "keep",
  companionPetId2: "keep",
  ownedPets: "keep",
  equippedInstances: "reset",
};

function fieldsOf<K extends string>(map: Readonly<Record<K, PrestigeFieldClass>>, cls: PrestigeFieldClass): readonly K[] {
  return (Object.keys(map) as K[]).filter((k) => map[k] === cls);
}

/** Bleibe-Liste (Top-Level), abgeleitet aus der Wächterliste. */
export const PRESTIGE_KEEP_FIELDS: readonly (keyof GameState)[] = fieldsOf(PRESTIGE_STATE_FIELDS, "keep");
/** Reset-Liste (Top-Level), abgeleitet aus der Wächterliste. */
export const PRESTIGE_RESET_FIELDS: readonly (keyof GameState)[] = fieldsOf(PRESTIGE_STATE_FIELDS, "reset");
export const PRESTIGE_CHARACTER_KEEP_FIELDS: readonly (keyof CharacterState)[] = fieldsOf(PRESTIGE_CHARACTER_FIELDS, "keep");
export const PRESTIGE_CHARACTER_RESET_FIELDS: readonly (keyof CharacterState)[] = fieldsOf(PRESTIGE_CHARACTER_FIELDS, "reset");

// ── Lese-Helfer ────────────────────────────────────────────────────────────

/** Zahl der Content-Fertigkeiten auf mindestens `PRESTIGE_SKILL_LEVEL`. */
export function prestigeSkills99(state: GameState, content: ContentDB): number {
  let n = 0;
  for (const skillId of Object.keys(content.skills)) {
    if (levelFromXp(state.skills[skillId]?.xp ?? 0) >= PRESTIGE_SKILL_LEVEL) n++;
  }
  return n;
}

export interface PrestigeUnlockCheck {
  ok: boolean;
  /** Fertigkeiten auf 99 in diesem Durchgang. */
  skills99: number;
  /** Benötigte Zahl (`PRESTIGE_REQUIRED_99`). */
  required: number;
  /** Chronik-Kapitel 21 (`PRESTIGE_UNLOCK_QUEST_ID`) in diesem Durchgang eingelöst. */
  chronicleDone: boolean;
}

/**
 * Freischaltung des Aufstiegs (Chef-Entscheid 1): mindestens `PRESTIGE_REQUIRED_99` Fertigkeiten auf 99 UND
 * `PRESTIGE_UNLOCK_QUEST_ID` eingelöst (Status „claimed" über den Quest-Status-Helfer). Gilt in jedem Durchgang
 * neu, weil Skills und Quests beim Aufstieg zurückgesetzt werden. Fehlt die Quest im Content, ist der Aufstieg
 * gesperrt (konservativ). Rein lesend.
 */
export function prestigeUnlock(state: GameState, content: ContentDB): PrestigeUnlockCheck {
  const skills99 = prestigeSkills99(state, content);
  const quest = content.quests.find((q) => q.id === PRESTIGE_UNLOCK_QUEST_ID);
  const chronicleDone = !!quest && questStatus(state, content, quest) === "claimed";
  return { ok: skills99 >= PRESTIGE_REQUIRED_99 && chronicleDone, skills99, required: PRESTIGE_REQUIRED_99, chronicleDone };
}

// ── Narbenquellen (1.4.2 „Aschesturz 2.0“) ─────────────────────────────────
// claude:2026-10-30T18:44:00+01:00 — design/1.4.2-aschesturz-spec.md § 2: „je Sturz“ (Leistung dieses Durchgangs,
// × (1 + prestigePointsMult)) und „einmalig“ (Sammlung, über das Hauptbuch `prestige.paid`, ohne Faktor, E1: Auszahlung
// beim nächsten Aschesturz, E2: Hauptbuch startet leer). Rein lesend, deterministisch, ganzzahlig.

/** Stabile Ids der Narbenquellen (UI-Altar: `t("prestige.source." + id)`, Welle 2). Reihenfolge = Anzeige-Reihenfolge. */
export type PrestigeSourceId =
  | "base"
  | "skills99"
  | "totalLevel"
  | "chronicle"
  | "paragon"
  | "gold"
  | "dungeons"
  | "slayer"
  | "raid"
  | "pets"
  | "bestiary"
  | "achievements"
  | "raidFirst";

/** `run` = je Sturz (Leistung dieses Durchgangs, mit Faktor), `once` = einmalig über das Hauptbuch (ohne Faktor). */
export type PrestigeSourceKind = "run" | "once";

/**
 * Eine Narbenquelle für die Altar-Anzeige (Spec § 2.4). Mengen-Einheit je Quelle:
 *  - `base` 1 (dieser Sturz) · `skills99` Fertigkeiten auf 99 · `totalLevel` Gesamtstufe · `chronicle` Kapitel ab 22 ·
 *    `paragon` beste Etage · `gold` Gold beim Sturz · `dungeons` Dungeon-Abschlüsse dieses Durchgangs ·
 *    `slayer` Slayer-Aufträge dieses Durchgangs · `raid` Raid-Abschlüsse dieses Durchgangs (alle Stufen);
 *  - `pets` neue (unbezahlte) Begleiter · `bestiary` neue vollständige Einträge · `achievements` Erfolgspunkte über dem
 *    bezahlten Stand · `raidFirst` neue Erst-Abschlüsse (Schwierigkeiten).
 */
export interface PrestigePointsSource {
  id: PrestigeSourceId;
  kind: PrestigeSourceKind;
  /** Gezählte Menge (Einheit s. oben). */
  amount: number;
  /** Narben dieser Quelle (bei `run` vor dem Faktor). */
  scars: number;
  /**
   * Deckel in Narben; null = ohne. Bei `run` je Sturz, bei `once` der Höchstwert der ganzen Sammlung (alle Stürze
   * zusammen, z. B. 92 für 23 Begleiter).
   */
  cap: number | null;
  /** Fehlende Menge (Einheit wie `amount`) bis zur nächsten Narbe dieser Quelle; null = Deckel erreicht bzw. nichts mehr offen. */
  next: number | null;
  /** Nur `once`: schon im Hauptbuch bezahlte Menge (Begleiter, Einträge, AP, Schwierigkeiten). */
  paid?: number;
  /** Nur `once`: größte erreichbare Menge laut Content (Begleiter, Einträge, Gesamt-AP, 3 Schwierigkeiten). */
  total?: number;
}

export interface PrestigePointsBreakdown {
  /** Grundbetrag je Aufstieg (`PRESTIGE_POINTS_BASE`). */
  fromBase: number;
  skills99: number;
  /** 99er-Anteil: die ersten `PRESTIGE_POINTS_CORE_99` voll, jeder weitere mit `PRESTIGE_POINTS_PER_EXTRA_99`. */
  fromSkills: number;
  totalLevel: number;
  fromTotalLevel: number;
  /** Eingelöste Chronik-Kapitel ab `PRESTIGE_CHRONICLE_BONUS_FROM_CHAPTER` in diesem Durchgang. */
  lateChapters: number;
  fromChronicle: number;
  /** Paragon-Bestetagen dieses Durchgangs (`paragon.best`, wird beim Aufstieg zurückgesetzt). */
  paragonBest: number;
  /** Paragon-Anteil, gedeckelt auf `PRESTIGE_PARAGON_POINTS_CAP`. */
  fromParagon: number;
  // claude:2026-10-30T18:44:00+01:00 — 1.4.2: neue Quellen „je Sturz“ (Spec § 2.1).
  /** Gold des Charakters beim Sturz (`character.gold`, ganzzahlig ≥ 0). */
  gold: number;
  fromGold: number;
  /** Dungeon-Abschlüsse dieses Durchgangs (Lebenszeit-Summe − `runStart.dungeons`). */
  runDungeons: number;
  fromDungeons: number;
  /** Slayer-Aufträge dieses Durchgangs (`slayerTasksCompleted` − `runStart.slayerTasks`). */
  runSlayerTasks: number;
  fromSlayer: number;
  /** Raid-Abschlüsse dieses Durchgangs je Schwierigkeit (`raid.clears` − `runStart.raidClears`). */
  runRaidClears: Record<RaidDifficulty, number>;
  fromRaid: number;
  // claude:2026-10-30T18:44:00+01:00 — 1.4.2: einmalige Quellen (Spec § 2.2), nur was noch nicht im Hauptbuch steht.
  /** Besessene Begleiter, die noch nicht bezahlt sind (Content-Reihenfolge). */
  newPets: PetId[];
  fromPets: number;
  /** Vollständige Bestiarium-Einträge, die noch nicht bezahlt sind (Content-Reihenfolge, Basis-Ids). */
  newBestiary: MonsterId[];
  fromBestiary: number;
  /** Erfolgspunkte über dem bezahlten Stand (`earnedAP` − `paid.ap`, ≥ 0). */
  apOverPaid: number;
  fromAchievements: number;
  /** Raid-Schwierigkeiten mit erstem Abschluss, die noch nicht bezahlt sind (Reihenfolge RAID_DIFFICULTIES). */
  newRaidFirsts: RaidDifficulty[];
  fromRaidFirst: number;
  /** Alle Quellen für die Altar-Anzeige (Spec § 2.4), feste Reihenfolge `PRESTIGE_SOURCE_IDS`. */
  sources: PrestigePointsSource[];
  /** Summe „je Sturz“ vor dem Faktor. */
  runSubtotal: number;
  /** „Je Sturz“ mit Faktor: floor(runSubtotal × (1 + pointsMult)). */
  runTotal: number;
  /** Summe der einmaligen Quellen (ohne Faktor). */
  onceTotal: number;
  /** Summe ALLER Quellen vor dem Faktor (= runSubtotal + onceTotal = Σ Zeilen der Aufschlüsselung). */
  subtotal: number;
  /** Anteil aus `prestigePointsMult` („Der tiefere Schnitt"), 0 ohne Rang. */
  pointsMult: number;
  /** Zuschlag durch `pointsMult` (= runTotal − runSubtotal = total − subtotal). */
  fromMult: number;
  /** Gutschrift dieses Aufstiegs: runTotal + onceTotal. */
  total: number;
}

/** Anzeige-Reihenfolge der Narbenquellen (Spec § 2.1 und § 2.2). */
export const PRESTIGE_SOURCE_IDS: readonly PrestigeSourceId[] = [
  "base",
  "skills99",
  "totalLevel",
  "chronicle",
  "paragon",
  "gold",
  "dungeons",
  "slayer",
  "raid",
  "pets",
  "bestiary",
  "achievements",
  "raidFirst",
];

/** Ganzzahl ≥ 0 aus beliebigem Wert (0 bei Müll). */
function nonNegInt(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
}

/** „Je volle `step` eine Narbe, höchstens `cap`“: Narben und fehlende Menge bis zur nächsten. */
function stepped(amount: number, step: number, perStep: number, cap: number): { scars: number; next: number | null } {
  const scars = Math.min(cap, Math.floor(amount / step) * perStep);
  return { scars, next: scars >= cap ? null : step - (amount % step) };
}

/** Bestiarium-Index je Content: zählbare Einträge (ohne `dg_`-Varianten) und die Raid-Bosse. Content ist unveränderlich. */
interface BestiaryIndex {
  ids: MonsterId[];
  raidBosses: ReadonlySet<MonsterId>;
}
const bestiaryIndexCache = new WeakMap<ContentDB, BestiaryIndex>();

function bestiaryIndex(content: ContentDB): BestiaryIndex {
  let idx = bestiaryIndexCache.get(content);
  if (!idx) {
    const raidBosses = new Set<MonsterId>();
    for (const raid of content.raids ?? []) for (const room of raid.rooms ?? []) if (room.bossId) raidBosses.add(room.bossId);
    const ids = Object.keys(content.monsters).filter((id) => !id.startsWith(DUNGEON_VARIANT_PREFIX));
    idx = { ids, raidBosses };
    bestiaryIndexCache.set(content, idx);
  }
  return idx;
}

/**
 * Vollständiger Bestiarium-Eintrag (Spec § 2.2 `bestiary`): mindestens ein Kill (Basis-Id) UND jede `itemId` aus
 * `monster.loot` in `seenDrops` dieses Monsters; ohne Loot genügt ein Kill. Raid-Bosse (alle `bossId` aus
 * `content.raids[].rooms`): ein Kill genügt, solange das Bestiarium ihre Raid-Beute nicht zeigt. `dg_`-Varianten sind nie
 * eigene Einträge. Rein lesend.
 */
export function prestigeBestiaryEntryComplete(state: GameState, content: ContentDB, monsterId: MonsterId): boolean {
  if (monsterId.startsWith(DUNGEON_VARIANT_PREFIX)) return false;
  const monster = content.monsters[monsterId];
  if (!monster || monsterKills(state, monsterId) < 1) return false;
  if (bestiaryIndex(content).raidBosses.has(monsterId)) return true;
  const { seen, total } = seenDropCount(state, monster);
  return seen >= total;
}

/** Hauptbuch des Stands, defensiv gegen handgebaute Alt-States ohne `paid`. */
function paidLedgerOf(state: GameState): PrestigePaidLedger {
  return state.prestige?.paid ?? defaultPrestigePaidLedger();
}

/** Raid-Abschlüsse je Schwierigkeit (defensiv 0). */
function raidClearsOf(state: GameState): Record<RaidDifficulty, number> {
  const c = state.raid?.clears;
  return { normal: nonNegInt(c?.normal), heroic: nonNegInt(c?.heroic), mythic: nonNegInt(c?.mythic) };
}

/**
 * Punkte-Vorschau für den Altar. claude:2026-10-18T12:00:00+02:00 — kalibrierte Formel (Balance § 4):
 * floor( (BASE + PER_99·min(n99, CORE) + PER_EXTRA_99·max(0, n99 − CORE) + floor(max(0, TL − 1000) / 50)
 *         + 2·Kapitel ≥ 22 + min(10, floor(Paragon-Best / 10))) × (1 + prestigePointsMult) ).
 * claude:2026-10-30T18:44:00+01:00 — 1.4.2 (Spec § 2): plus Gold, Dungeons, Slayer, Raid (je Sturz, mit Faktor) und die
 * einmaligen Quellen Begleiter, Bestiarium, Erfolge, Raid-Erstabschluss (ohne Faktor, nur was nicht im Hauptbuch steht).
 * `total` = floor(runSubtotal × (1 + mult)) + onceTotal = exakt die Gutschrift von `ascend`.
 * Ganzzahlig, rein lesend; alle Zahlen über die PRESTIGE_*-Konstanten in shared.
 */
export function prestigePointsPreview(state: GameState, content: ContentDB): PrestigePointsBreakdown {
  const fromBase = PRESTIGE_POINTS_BASE;
  const skillCount = Object.keys(content.skills).length;
  const skills99 = prestigeSkills99(state, content);
  const skillScars = (n: number): number =>
    Math.min(n, PRESTIGE_POINTS_CORE_99) * PRESTIGE_POINTS_PER_99 + Math.max(0, n - PRESTIGE_POINTS_CORE_99) * PRESTIGE_POINTS_PER_EXTRA_99;
  const fromSkills = skillScars(skills99);

  const level = totalLevel(state, content);
  const over = Math.max(0, level - PRESTIGE_TOTAL_LEVEL_THRESHOLD);
  const fromTotalLevel = Math.floor(over / PRESTIGE_TOTAL_LEVEL_STEP) * PRESTIGE_POINTS_PER_TOTAL_LEVEL_STEP;
  const totalLevelCap =
    Math.floor(Math.max(0, skillCount * PRESTIGE_SKILL_LEVEL - PRESTIGE_TOTAL_LEVEL_THRESHOLD) / PRESTIGE_TOTAL_LEVEL_STEP) *
    PRESTIGE_POINTS_PER_TOTAL_LEVEL_STEP;

  const known = new Set(content.quests.map((q) => q.id));
  const counted = new Set<string>();
  for (const id of state.quests?.claimed ?? []) {
    const chapter = chronicleChapterNumber(id);
    if (chapter !== null && chapter >= PRESTIGE_CHRONICLE_BONUS_FROM_CHAPTER && known.has(id)) counted.add(id);
  }
  const lateChapters = counted.size;
  const fromChronicle = lateChapters * PRESTIGE_POINTS_PER_LATE_CHAPTER;
  let lateChapterCount = 0;
  for (const q of content.quests) {
    const chapter = chronicleChapterNumber(q.id);
    if (chapter !== null && chapter >= PRESTIGE_CHRONICLE_BONUS_FROM_CHAPTER) lateChapterCount++;
  }

  const best = state.paragon?.best ?? 0;
  const paragonBest = Number.isFinite(best) && best > 0 ? Math.floor(best) : 0;
  const fromParagon = Math.min(
    PRESTIGE_PARAGON_POINTS_CAP,
    Math.floor(paragonBest / PRESTIGE_PARAGON_FLOOR_STEP) * PRESTIGE_POINTS_PER_PARAGON_STEP,
  );

  // ── 1.4.2: neue Quellen „je Sturz“ ──
  const runStart = state.prestige?.runStart ?? defaultPrestigeRunBaseline();
  const now = prestigeRunCounters(state);
  const gold = nonNegInt(state.character?.gold);
  const goldStep = stepped(gold, PRESTIGE_GOLD_STEP, 1, PRESTIGE_GOLD_POINTS_CAP);
  const runDungeons = Math.max(0, now.dungeons - nonNegInt(runStart.dungeons));
  const dungeonStep = stepped(runDungeons, PRESTIGE_DUNGEON_STEP, 1, PRESTIGE_DUNGEON_POINTS_CAP);
  const runSlayerTasks = Math.max(0, now.slayerTasks - nonNegInt(runStart.slayerTasks));
  const slayerStep = stepped(runSlayerTasks, PRESTIGE_SLAYER_STEP, 1, PRESTIGE_SLAYER_POINTS_CAP);
  const runRaidClears = { normal: 0, heroic: 0, mythic: 0 } as Record<RaidDifficulty, number>;
  let raidRaw = 0;
  let raidCount = 0;
  for (const d of RAID_DIFFICULTIES) {
    runRaidClears[d] = Math.max(0, now.raidClears[d] - nonNegInt(runStart.raidClears?.[d]));
    raidRaw += runRaidClears[d] * PRESTIGE_POINTS_PER_RAID_CLEAR[d];
    raidCount += runRaidClears[d];
  }
  const fromRaid = Math.min(PRESTIGE_RAID_POINTS_CAP, raidRaw);

  // ── 1.4.2: einmalige Quellen (Hauptbuch) ──
  const paid = paidLedgerOf(state);
  const petIds = Object.keys(content.pets ?? {});
  const paidPets = new Set(paid.pets);
  const owned = state.character?.ownedPets ?? {};
  const newPets = petIds.filter((id) => owned[id] === true && !paidPets.has(id));
  const fromPets = newPets.length * PRESTIGE_POINTS_PER_PET;
  const petsPaidKnown = petIds.filter((id) => paidPets.has(id)).length;
  const petsOpen = petIds.some((id) => owned[id] !== true && !paidPets.has(id));

  const bIdx = bestiaryIndex(content);
  const paidBestiary = new Set(paid.bestiary);
  const newBestiary: MonsterId[] = [];
  let bestiaryOpen = false;
  for (const id of bIdx.ids) {
    if (paidBestiary.has(id)) continue;
    if (prestigeBestiaryEntryComplete(state, content, id)) newBestiary.push(id);
    else bestiaryOpen = true;
  }
  const fromBestiary = newBestiary.length * PRESTIGE_POINTS_PER_BESTIARY_ENTRY;
  const bestiaryPaidKnown = bIdx.ids.filter((id) => paidBestiary.has(id)).length;

  const apEarned = earnedAP(state, content);
  const apTotal = totalAP(content);
  const apPaid = nonNegInt(paid.ap);
  const apOverPaid = Math.max(0, apEarned - apPaid);
  const apSteps = Math.floor(apOverPaid / PRESTIGE_AP_STEP);
  const fromAchievements = apSteps * PRESTIGE_POINTS_PER_AP_STEP;
  const apCap = Math.floor(apTotal / PRESTIGE_AP_STEP) * PRESTIGE_POINTS_PER_AP_STEP;
  const apNext = apPaid + (apSteps + 1) * PRESTIGE_AP_STEP <= apTotal ? PRESTIGE_AP_STEP - (apOverPaid % PRESTIGE_AP_STEP) : null;

  const clearsNow = now.raidClears;
  const paidRaids = new Set(paid.raids);
  const newRaidFirsts = RAID_DIFFICULTIES.filter((d) => clearsNow[d] >= 1 && !paidRaids.has(d));
  const fromRaidFirst = newRaidFirsts.reduce((sum, d) => sum + PRESTIGE_POINTS_RAID_FIRST[d], 0);
  const raidFirstCap = RAID_DIFFICULTIES.reduce((sum, d) => sum + PRESTIGE_POINTS_RAID_FIRST[d], 0);
  const raidFirstOpen = RAID_DIFFICULTIES.some((d) => clearsNow[d] < 1 && !paidRaids.has(d));

  const runSubtotal =
    fromBase + fromSkills + fromTotalLevel + fromChronicle + fromParagon + goldStep.scars + dungeonStep.scars + slayerStep.scars + fromRaid;
  const onceTotal = fromPets + fromBestiary + fromAchievements + fromRaidFirst;
  const mult = talentEffect(state, content, "prestigePointsMult");
  const pointsMult = Number.isFinite(mult) && mult > 0 ? mult : 0;
  // Winziger Epsilon gegen Darstellungsfehler (z. B. 0,1-Schritte); bei den Content-Werten (0,25/0,5) exakt.
  const runTotal = pointsMult > 0 ? Math.floor(runSubtotal * (1 + pointsMult) + 1e-9) : runSubtotal;
  const subtotal = runSubtotal + onceTotal;
  const total = runTotal + onceTotal;

  const totalLevelNext =
    fromTotalLevel >= totalLevelCap
      ? null
      : level < PRESTIGE_TOTAL_LEVEL_THRESHOLD
        ? PRESTIGE_TOTAL_LEVEL_THRESHOLD + PRESTIGE_TOTAL_LEVEL_STEP - level
        : PRESTIGE_TOTAL_LEVEL_STEP - (over % PRESTIGE_TOTAL_LEVEL_STEP);
  const sources: PrestigePointsSource[] = [
    { id: "base", kind: "run", amount: 1, scars: fromBase, cap: fromBase, next: null },
    { id: "skills99", kind: "run", amount: skills99, scars: fromSkills, cap: skillScars(skillCount), next: skills99 < skillCount ? 1 : null },
    { id: "totalLevel", kind: "run", amount: level, scars: fromTotalLevel, cap: totalLevelCap, next: totalLevelNext },
    {
      id: "chronicle",
      kind: "run",
      amount: lateChapters,
      scars: fromChronicle,
      cap: lateChapterCount * PRESTIGE_POINTS_PER_LATE_CHAPTER,
      next: lateChapters < lateChapterCount ? 1 : null,
    },
    {
      id: "paragon",
      kind: "run",
      amount: paragonBest,
      scars: fromParagon,
      cap: PRESTIGE_PARAGON_POINTS_CAP,
      next: fromParagon >= PRESTIGE_PARAGON_POINTS_CAP ? null : PRESTIGE_PARAGON_FLOOR_STEP - (paragonBest % PRESTIGE_PARAGON_FLOOR_STEP),
    },
    { id: "gold", kind: "run", amount: gold, scars: goldStep.scars, cap: PRESTIGE_GOLD_POINTS_CAP, next: goldStep.next },
    { id: "dungeons", kind: "run", amount: runDungeons, scars: dungeonStep.scars, cap: PRESTIGE_DUNGEON_POINTS_CAP, next: dungeonStep.next },
    { id: "slayer", kind: "run", amount: runSlayerTasks, scars: slayerStep.scars, cap: PRESTIGE_SLAYER_POINTS_CAP, next: slayerStep.next },
    { id: "raid", kind: "run", amount: raidCount, scars: fromRaid, cap: PRESTIGE_RAID_POINTS_CAP, next: fromRaid >= PRESTIGE_RAID_POINTS_CAP ? null : 1 },
    {
      id: "pets",
      kind: "once",
      amount: newPets.length,
      scars: fromPets,
      cap: petIds.length * PRESTIGE_POINTS_PER_PET,
      next: petsOpen ? 1 : null,
      paid: petsPaidKnown,
      total: petIds.length,
    },
    {
      id: "bestiary",
      kind: "once",
      amount: newBestiary.length,
      scars: fromBestiary,
      cap: bIdx.ids.length * PRESTIGE_POINTS_PER_BESTIARY_ENTRY,
      next: bestiaryOpen ? 1 : null,
      paid: bestiaryPaidKnown,
      total: bIdx.ids.length,
    },
    {
      id: "achievements",
      kind: "once",
      amount: apOverPaid,
      scars: fromAchievements,
      cap: apCap,
      next: apNext,
      paid: apPaid,
      total: apTotal,
    },
    {
      id: "raidFirst",
      kind: "once",
      amount: newRaidFirsts.length,
      scars: fromRaidFirst,
      cap: raidFirstCap,
      next: raidFirstOpen ? 1 : null,
      paid: RAID_DIFFICULTIES.filter((d) => paidRaids.has(d)).length,
      total: RAID_DIFFICULTIES.length,
    },
  ];

  return {
    fromBase,
    skills99,
    fromSkills,
    totalLevel: level,
    fromTotalLevel,
    lateChapters,
    fromChronicle,
    paragonBest,
    fromParagon,
    gold,
    fromGold: goldStep.scars,
    runDungeons,
    fromDungeons: dungeonStep.scars,
    runSlayerTasks,
    fromSlayer: slayerStep.scars,
    runRaidClears,
    fromRaid,
    newPets,
    fromPets,
    newBestiary,
    fromBestiary,
    apOverPaid,
    fromAchievements,
    newRaidFirsts,
    fromRaidFirst,
    sources,
    runSubtotal,
    runTotal,
    onceTotal,
    subtotal,
    pointsMult,
    fromMult: runTotal - runSubtotal,
    total,
  };
}

/**
 * claude:2026-10-30T18:44:00+01:00 — 1.4.2 (Spec § 2.2): Hauptbuch NACH einem Aufstieg mit dieser Vorschau. Nimmt genau das
 * auf, was die Vorschau bezahlt hat (neue Begleiter/Einträge/Erst-Abschlüsse, AP in vollen 100er-Schritten; der Rest bleibt
 * für später). Vereinigung, nie Verlust: bereits Bezahltes bleibt stehen. Neues Objekt, der alte Stand bleibt unberührt.
 */
export function prestigeLedgerAfterAscend(paid: PrestigePaidLedger | undefined, b: PrestigePointsBreakdown): PrestigePaidLedger {
  const base = paid ?? defaultPrestigePaidLedger();
  const pets = [...base.pets];
  for (const id of b.newPets) if (!pets.includes(id)) pets.push(id);
  const bestiary = [...base.bestiary];
  const seen = new Set(bestiary);
  for (const id of b.newBestiary) if (!seen.has(id)) {
    bestiary.push(id);
    seen.add(id);
  }
  const raids = [...base.raids];
  for (const d of b.newRaidFirsts) if (!raids.includes(d)) raids.push(d);
  const ap = nonNegInt(base.ap) + Math.floor(b.apOverPaid / PRESTIGE_AP_STEP) * PRESTIGE_AP_STEP;
  return { pets, bestiary, ap, raids };
}

// ── Narben-Rückgabe und Nachzahlung zu 1.4.2 (SAVE 102) ────────────────────
// claude:2026-10-31T14:58:54+01:00 — Chef-Auftrag 31.10.2026: (1) „falls Leute vorher Aschesturz gemacht haben, dass sie rückwirkend
// Punkte kriegen“, (2) „bei 1.4.2 für alle die Punkte resetten … damit sie ihre Punkte wieder verteilen“. Einmalig beim ersten
// Laden eines Stands < 102 (persistence `deserialize`, nach dem Offline-Nachholen). Rein, deterministisch, ganzzahlig.

/** Nachzahlung der Quellen „je Sturz“, die sich aus einer Bilanz rekonstruieren lassen (gold, dungeons, slayer). */
export interface PrestigeRetroRunScars {
  gold: number;
  dungeons: number;
  slayer: number;
  /** Zahl der Historien-Einträge mit Bilanz (nur diese zählen). */
  runs: number;
}

/**
 * claude:2026-10-31T14:58:54+01:00 — Nachzahlung für frühere Stürze nach den 1.4.2-Regeln (Spec § 2.1), je Historien-Eintrag mit
 * `tally` und je Quelle mit ihrem Deckel: `gold` 1 je 250.000 Gold beim Sturz (≤ 20), `dungeons` 1 je 20 Abschlüsse (≤ 10),
 * `slayer` 1 je 10 Aufträge (≤ 10). Bewusst OHNE „Der tiefere Schnitt“ (einfach und nachvollziehbar, Chef-Auftrag) und ohne
 * `raid` (je früherem Durchgang nicht rekonstruierbar; ältere Raids deckt einmalig `raidFirst`). Einträge ohne Bilanz zählen 0.
 */
export function prestigeRetroRunScars(history: readonly PrestigeRecord[] | undefined): PrestigeRetroRunScars {
  const out: PrestigeRetroRunScars = { gold: 0, dungeons: 0, slayer: 0, runs: 0 };
  for (const rec of history ?? []) {
    const tally = rec?.tally;
    if (!tally) continue;
    out.runs++;
    out.gold += stepped(nonNegInt(tally.gold), PRESTIGE_GOLD_STEP, 1, PRESTIGE_GOLD_POINTS_CAP).scars;
    out.dungeons += stepped(nonNegInt(tally.dungeons), PRESTIGE_DUNGEON_STEP, 1, PRESTIGE_DUNGEON_POINTS_CAP).scars;
    out.slayer += stepped(nonNegInt(tally.slayerTasks), PRESTIGE_SLAYER_STEP, 1, PRESTIGE_SLAYER_POINTS_CAP).scars;
  }
  return out;
}

/** Optionen der Rückgabe: `retro` = Stand von vor 1.4.2 (Original-Version < 99), nur dann gibt es die Nachzahlung. */
export interface PrestigeRespecOptions {
  retro: boolean;
}

/**
 * claude:2026-10-31T14:58:54+01:00 — Einmalige Rückgabe des Narbenbuchs zu 1.4.2 (SAVE 102), IN PLACE:
 *  A. Alle Ränge im Baum `prestige` (nur dieser, der Jägerkodex bleibt) fallen weg; `points += pointsSpent`, `pointsSpent = 0`.
 *     Erstattet wird genau das tatsächlich Bezahlte (die Preise 1.4.1 → 1.4.2 sind gleich oder höher, niemand hat überzahlt).
 *  B. Nur mit `retro` und mindestens einem Sturz: Nachzahlung `prestigeRetroRunScars` für die früheren Stürze plus die Sammlung
 *     (Begleiter, Bestiarium, Erfolge, Raid-Erstabschluss) JETZT, gerechnet mit derselben `prestigePointsPreview` wie ein Sturz
 *     und eingetragen über `prestigeLedgerAfterAscend` (der nächste Sturz zahlt nur, was danach dazukommt; nie doppelt).
 * Danach Leben/Schutz auf das neue Maximum geklemmt (Narbengewebe kann wegfallen). Schreibt `prestige.respec142` (null, wenn weder
 * zurückgegeben noch nachgezahlt wurde) und liefert ihn. Idempotent: trägt der Stand schon einen Beleg, passiert nichts. Folgen
 * eines Rang-Verlusts bis zum Neukauf sind verlustfrei (Zusatzbeete/-fallen ruhen samt Inhalt, nichts wird gelöscht; s. Bericht).
 * claude:2026-10-31T15:36:11+01:00 — Dungeons, die nur über „Alte Pfade“ offen waren, bleiben für den laufenden Durchgang offen (`dungeonsUnlocked`).
 */
export function applyPrestigeRespec142(state: GameState, content: ContentDB, opts: PrestigeRespecOptions): PrestigeRespec142 | null {
  const p = (state.prestige ??= defaultPrestigeState());
  if (p.respec142) return p.respec142;
  const refunded = nonNegInt(p.pointsSpent);
  // claude:2026-10-31T15:36:11+01:00 — Coordinator-Entscheid 31.10.: Dungeons, die gerade nur über „Alte Pfade“ offen sind, bleiben für den laufenden
  // Durchgang offen (`dungeonsUnlocked`, wird beim nächsten Sturz ohnehin zurückgesetzt). Sonst übersprängen vorgeplante Läufe mit `dungeon_locked`,
  // bis der Rang neu gekauft ist. Nur was vorher offen und nach der Rückgabe zu wäre; Raid-Räume und der Paragonturm nie.
  const openBefore =
    talentEffect(state, content, "prestigeDungeonRecall") > 0
      ? content.dungeons.filter((d) => !d.raidOnly && isDungeonUnlocked(state, content, d.id)).map((d) => d.id)
      : [];
  if (state.talents && PRESTIGE_TALENT_TREE_ID in state.talents) delete state.talents[PRESTIGE_TALENT_TREE_ID];
  for (const id of openBefore) {
    if (!isDungeonUnlocked(state, content, id)) (state.dungeonsUnlocked ??= {})[id] = true;
  }
  p.points = nonNegInt(p.points) + refunded;
  p.pointsSpent = 0;

  const retro = emptyPrestigeRespecRetro();
  if (opts.retro && nonNegInt(p.count) >= 1) {
    const run = prestigeRetroRunScars(p.history);
    const b = prestigePointsPreview(state, content);
    retro.gold = run.gold;
    retro.dungeons = run.dungeons;
    retro.slayer = run.slayer;
    retro.pets = b.fromPets;
    retro.bestiary = b.fromBestiary;
    retro.achievements = b.fromAchievements;
    retro.raidFirst = b.fromRaidFirst;
    retro.total = run.gold + run.dungeons + run.slayer + b.onceTotal;
    p.paid = prestigeLedgerAfterAscend(p.paid, b);
    p.points += retro.total;
  }

  // Narbengewebe/Narbenfaust können wegfallen: Werte auf das neue Maximum (die Engine klemmt im Tick ohnehin, so passt schon die erste Anzeige).
  const stats = computeStats(state, content);
  if (Number.isFinite(stats.maxHp) && state.character.hp > stats.maxHp) state.character.hp = stats.maxHp;
  if (Number.isFinite(stats.maxWard) && state.character.ward > stats.maxWard) state.character.ward = stats.maxWard;

  p.respec142 = refunded > 0 || retro.total > 0 ? { refunded, retro, acknowledged: false } : null;
  return p.respec142;
}

/**
 * claude:2026-10-31T14:58:54+01:00 — „Verstanden“ am Altar-Hinweis (SAVE 102): setzt `respec142.acknowledged`. false ohne Beleg oder
 * wenn schon bestätigt (dann bleibt alles unverändert).
 */
export function acknowledgePrestigeRespec(state: GameState): boolean {
  const r = state.prestige?.respec142;
  if (!r || r.acknowledged) return false;
  r.acknowledged = true;
  return true;
}

/** claude:2026-10-31T14:58:54+01:00 — Zeigt die UI den 1.4.2-Hinweis? Nur mit Beleg, unbestätigt und nach mindestens einem Sturz. Rein lesend. */
export function prestigeRespecPending(state: GameState): boolean {
  const r = state.prestige?.respec142;
  return !!r && !r.acknowledged && (state.prestige?.count ?? 0) >= 1;
}

/**
 * Rabenfracht-Sperre (Chef-Entscheid 3): im Durchgang nach einem Aufstieg darf der Spielstand keine Fracht
 * EMPFANGEN oder einlösen, bis wieder `PRESTIGE_REQUIRED_99` Fertigkeiten auf 99 stehen. Versand bleibt
 * erlaubt. Kein eigenes Flag: abgeleitet aus `prestige.count` und den Skills (XP sinkt nie, also öffnet die
 * Sperre einmal und bleibt offen bis zum nächsten Aufstieg). Gelesen von engine/mail.ts — dort seit Welle B2
 * auch für jede beim Aufstieg gehaltene Post (`MailMessage.prestigeHeld`, Chef 18.10.).
 */
export function prestigeFreightLocked(state: GameState, content: ContentDB): boolean {
  return (state.prestige?.count ?? 0) > 0 && prestigeSkills99(state, content) < PRESTIGE_REQUIRED_99;
}

// ── Narbenbuch: was über den Aufstieg kommt (Welle B2) ─────────────────────
// claude:2026-10-18T12:00:00+02:00 — Besitz-Ledger, Kandidaten, Vorgaben und Prüfung der Spielerauswahl.

/** Wo ein Stück gerade liegt (Anzeige + Sortierung der Vorgabe: getragen zuerst). */
export type PrestigeItemLocation = "equipped" | "kit" | "inventory" | "bank";

/** Verweis auf ein Stück: Basis-Item, bei verzauberten/gesuffixten Teilen zusätzlich die Instanz-ID. */
export interface PrestigeItemRef {
  itemId: ItemId;
  instanceId?: string;
}

/** Ein wählbares Erbstück (Ausrüstung mit Anforderung ≥ `PRESTIGE_HEIRLOOM_MIN_REQUIREMENT`). */
export interface PrestigeHeirloomCandidate extends PrestigeItemRef {
  /** Höchste Fertigkeits-Anforderung des Teils. */
  requirement: number;
  /** Bester Fundort (getragen > anderes Kit > Inventar > Lager). */
  location: PrestigeItemLocation;
  /** Besessene Stücke: Instanz immer 1; ein einfaches Item darf so oft gewählt werden. */
  count: number;
}

/** Ein wählbarer Stapel der Vergrabenen Truhe (Material/Verbrauchsgut aus Inventar + Lager). */
export interface PrestigeStashCandidate {
  itemId: ItemId;
  /** Besessene Menge (Inventar + Lager). */
  owned: number;
  /** Was mitkäme: min(owned, PRESTIGE_STASH_STACK_CAP). */
  keep: number;
}

/** Spielerauswahl für den Aufstieg. Fehlt ein Feld, gilt die deterministische Vorgabe der Vorschau. */
export interface PrestigeAscendChoice {
  /** Erbstücke (höchstens `prestigeKeepEquipment` Stück; ein einfaches Item mehrfach = mehrere Stücke). */
  heirlooms?: PrestigeItemRef[];
  /** Stapel der Vergrabenen Truhe (höchstens `prestigeKeepBankStacks` verschiedene Item-IDs). */
  stash?: ItemId[];
}

/**
 * Stabile Fehlschlag-Codes von `prestigeAscendCheck` (UI: `t("prestige.reason." + code)`, Welle D):
 *  - `locked`             Freischaltung (4×99 + Kapitel 21) fehlt.
 *  - `heirloom_too_many`  mehr Erbstücke gewählt als Rang erlaubt.
 *  - `heirloom_invalid`   ein gewähltes Erbstück ist nicht (mehr) wählbar oder öfter gewählt als besessen.
 *  - `stash_too_many`     mehr Stapel gewählt als Rang erlaubt.
 *  - `stash_invalid`      ein gewählter Stapel ist nicht wählbar oder doppelt.
 */
export type PrestigeAscendReason = "locked" | "heirloom_too_many" | "heirloom_invalid" | "stash_too_many" | "stash_invalid";

export interface PrestigeAscendCheck {
  ok: boolean;
  reason?: PrestigeAscendReason;
}

interface LedgerInstance {
  inst: ItemInstance;
  location: PrestigeItemLocation;
}

/** Alles, was der Spielstand an Gegenständen besitzt (ohne Postfach), in deterministischer Reihenfolge. */
interface Ledger {
  /** Einfache Stücke je Item-ID (getragen, andere Kits, Inventar, Lager). */
  plain: Map<ItemId, number>;
  /** Bester Fundort je einfacher Item-ID. */
  plainLocation: Map<ItemId, PrestigeItemLocation>;
  /** Einfache Stücke nur aus Inventar + Lager (Quelle der Vergrabenen Truhe). */
  stackable: Map<ItemId, number>;
  instances: LedgerInstance[];
}

const LOCATION_RANK: Readonly<Record<PrestigeItemLocation, number>> = { equipped: 0, kit: 1, inventory: 2, bank: 3 };

function positiveInt(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
}

function buildLedger(state: GameState, content: ContentDB): Ledger {
  const plain = new Map<ItemId, number>();
  const plainLocation = new Map<ItemId, PrestigeItemLocation>();
  const stackable = new Map<ItemId, number>();
  const instances: LedgerInstance[] = [];
  const addPlain = (id: ItemId | null | undefined, qty: number, location: PrestigeItemLocation): void => {
    if (!id || !content.items[id] || qty <= 0) return;
    plain.set(id, (plain.get(id) ?? 0) + qty);
    const prev = plainLocation.get(id);
    if (prev === undefined || LOCATION_RANK[location] < LOCATION_RANK[prev]) plainLocation.set(id, location);
    if (location === "inventory" || location === "bank") stackable.set(id, (stackable.get(id) ?? 0) + qty);
  };
  const addInstance = (inst: ItemInstance | undefined, location: PrestigeItemLocation): void => {
    if (!inst || typeof inst.instanceId !== "string" || !content.items[inst.baseItemId]) return;
    instances.push({ inst, location });
  };
  const addKit = (
    equipment: Partial<Record<EquipSlot, ItemId | null>> | undefined,
    equipped: Partial<Record<EquipSlot, ItemInstance>> | undefined,
    location: PrestigeItemLocation,
  ): void => {
    for (const slot of EQUIP_SLOTS) {
      const id = equipment?.[slot];
      if (!id) continue;
      const inst = equipped?.[slot];
      if (inst && inst.baseItemId === id) addInstance(inst, location);
      else addPlain(id, 1, location);
    }
  };

  // Getragen (Wahrheit des aktiven Kits), dann die inaktiven Kits (besitzen eigene Teile).
  addKit(state.character.equipment, state.character.equippedInstances, "equipped");
  (state.equipKits ?? []).forEach((kit, i) => {
    if (i !== state.activeKit && kit) addKit(kit.equipment, kit.equippedInstances, "kit");
  });
  for (const slot of state.inventory?.slots ?? []) {
    if (!slot) continue;
    if (slot.instance) addInstance(slot.instance, "inventory");
    else addPlain(slot.itemId, positiveInt(slot.qty), "inventory");
  }
  for (const inst of state.inventory?.instances ?? []) addInstance(inst, "inventory");
  for (const [id, qty] of Object.entries(state.bank ?? {})) addPlain(id, positiveInt(qty), "bank");
  // claude:2026-10-26T03:45:00+02:00 — geladene Pfeile sind Lagerware: als Truhen-Kandidat wie ein Lagerstapel (QA-Fernkampf P3).
  // claude:2026-10-24T15:21:04+02:00 — geprüft gegen den CEO-Entscheid zur QA-Runde 2 (Fernkampf B2: „Köcher = ausgerüstete Munition
  // wie angelegte Ausrüstung, kein Auftragsbestand“): konsistent. Getragene Ausrüstung ist beim Aufstieg Kandidat (Erbstück, Ort
  // „equipped“); Pfeile können keine Erbstücke sein, ihr Mitnahme-Weg ist die Truhe. Der Köcher wird also auch hier wie Getragenes
  // behandelt (darf mit), nicht wie Auftragsbestand (orders.ts liest ihn nicht). Ohne diese Zeile gingen geladene Pfeile ersatzlos
  // verloren (`quiver: "reset"`). Der Ort bleibt "bank", weil nur Inventar/Lager in `stackable` zählen; `plainLocation` wirkt nur
  // auf Erbstück-Kandidaten.
  const q = state.character.quiver;
  if (q) addPlain(q.itemId, positiveInt(q.qty), "bank");
  for (const inst of state.bankInstances ?? []) addInstance(inst, "bank");
  return { plain, plainLocation, stackable, instances };
}

/** Höchste Fertigkeits-Anforderung eines Items (0 ohne Anforderung). */
export function itemMaxRequirement(item: ItemDef | undefined): number {
  let max = 0;
  for (const v of Object.values(item?.requirements ?? {})) {
    if (typeof v === "number" && Number.isFinite(v) && v > max) max = v;
  }
  return max;
}

/**
 * Darf dieses Item ein Erbstück werden? Ausrüstung mit Nicht-Werkzeug-Slot, Anforderung ≥ 80 (Chef 18.10.,
 * Chase-Teile ohne Anforderung bleiben außen vor), nicht spielstand-gebunden (Meisterringe/Schlüssel:
 * isCrossSaveTransferBlocked — ein Meisterring kommt bei erneutem 99 ohnehin wieder).
 */
export function prestigeHeirloomEligible(item: ItemDef | undefined): boolean {
  if (!item || item.type !== "equipment" || !item.slot || isToolSlot(item.slot)) return false;
  if (isCrossSaveTransferBlocked(item.id)) return false;
  return itemMaxRequirement(item) >= PRESTIGE_HEIRLOOM_MIN_REQUIREMENT;
}

/**
 * Darf dieses Item in die Vergrabene Truhe? Nur Materialien und Verbrauchsgüter; Ausrüstung und Werkzeuge
 * haben eigene Knoten, Schlüssel/Meisterringe (isCrossSaveTransferBlocked) bleiben gesperrt. Marken sind
 * keine Items (`character.questTokens`) und gehen ohnehin zurück.
 */
export function prestigeStashEligible(item: ItemDef | undefined): boolean {
  if (!item || item.tool || item.slot) return false;
  if (item.type !== "material" && item.type !== "consumable") return false;
  return !isCrossSaveTransferBlocked(item.id);
}

function heirloomCandidates(ledger: Ledger, content: ContentDB): PrestigeHeirloomCandidate[] {
  const out: PrestigeHeirloomCandidate[] = [];
  for (const { inst, location } of ledger.instances) {
    const item = content.items[inst.baseItemId];
    if (!prestigeHeirloomEligible(item)) continue;
    out.push({ itemId: inst.baseItemId, instanceId: inst.instanceId, requirement: itemMaxRequirement(item), location, count: 1 });
  }
  for (const [itemId, count] of ledger.plain) {
    const item = content.items[itemId];
    if (!prestigeHeirloomEligible(item)) continue;
    out.push({ itemId, requirement: itemMaxRequirement(item), location: ledger.plainLocation.get(itemId) ?? "bank", count });
  }
  // Vorgabe-Reihenfolge: höchste Anforderung, getragen zuerst, Instanz (verzaubert) vor einfachem Stück, dann IDs.
  out.sort(
    (a, b) =>
      b.requirement - a.requirement ||
      LOCATION_RANK[a.location] - LOCATION_RANK[b.location] ||
      (a.instanceId ? 0 : 1) - (b.instanceId ? 0 : 1) ||
      (a.itemId < b.itemId ? -1 : a.itemId > b.itemId ? 1 : 0) ||
      ((a.instanceId ?? "") < (b.instanceId ?? "") ? -1 : (a.instanceId ?? "") > (b.instanceId ?? "") ? 1 : 0),
  );
  return out;
}

function stashCandidates(ledger: Ledger, content: ContentDB): PrestigeStashCandidate[] {
  const out: PrestigeStashCandidate[] = [];
  for (const [itemId, owned] of ledger.stackable) {
    if (!prestigeStashEligible(content.items[itemId])) continue;
    out.push({ itemId, owned, keep: Math.min(owned, PRESTIGE_STASH_STACK_CAP) });
  }
  // Vorgabe-Reihenfolge: Wert der mitkommenden Menge (Itemwert × keep), dann Item-ID.
  const worth = (c: PrestigeStashCandidate): number => (content.items[c.itemId]?.value ?? 0) * c.keep;
  out.sort((a, b) => worth(b) - worth(a) || (a.itemId < b.itemId ? -1 : a.itemId > b.itemId ? 1 : 0));
  return out;
}

function rankCount(state: GameState, content: ContentDB, kind: "prestigeKeepEquipment" | "prestigeKeepBankStacks"): number {
  return positiveInt(talentEffect(state, content, kind));
}

function defaultHeirlooms(candidates: readonly PrestigeHeirloomCandidate[], slots: number): PrestigeItemRef[] {
  return candidates.slice(0, slots).map((c) => (c.instanceId ? { itemId: c.itemId, instanceId: c.instanceId } : { itemId: c.itemId }));
}

function defaultStash(candidates: readonly PrestigeStashCandidate[], slots: number): ItemId[] {
  return candidates.slice(0, slots).map((c) => c.itemId);
}

function validateHeirlooms(
  picks: readonly PrestigeItemRef[],
  candidates: readonly PrestigeHeirloomCandidate[],
  slots: number,
): PrestigeAscendReason | null {
  if (picks.length > slots) return "heirloom_too_many";
  const usedPlain = new Map<ItemId, number>();
  const usedInst = new Set<string>();
  for (const pick of picks) {
    if (!pick || typeof pick.itemId !== "string") return "heirloom_invalid";
    if (pick.instanceId !== undefined) {
      if (usedInst.has(pick.instanceId)) return "heirloom_invalid";
      const hit = candidates.find((c) => c.instanceId === pick.instanceId && c.itemId === pick.itemId);
      if (!hit) return "heirloom_invalid";
      usedInst.add(pick.instanceId);
    } else {
      const hit = candidates.find((c) => !c.instanceId && c.itemId === pick.itemId);
      const used = (usedPlain.get(pick.itemId) ?? 0) + 1;
      if (!hit || used > hit.count) return "heirloom_invalid";
      usedPlain.set(pick.itemId, used);
    }
  }
  return null;
}

function validateStash(picks: readonly ItemId[], candidates: readonly PrestigeStashCandidate[], slots: number): PrestigeAscendReason | null {
  if (picks.length > slots) return "stash_too_many";
  const seen = new Set<ItemId>();
  for (const id of picks) {
    if (typeof id !== "string" || seen.has(id) || !candidates.some((c) => c.itemId === id)) return "stash_invalid";
    seen.add(id);
  }
  return null;
}

/**
 * Prüft einen Aufstieg samt Spielerauswahl ohne State-Änderung. Reihenfolge der Gründe: locked →
 * Erbstücke → Truhe. Eine fehlende Auswahl (undefined) ist immer gültig (dann gilt die Vorgabe).
 */
export function prestigeAscendCheck(state: GameState, content: ContentDB, choice?: PrestigeAscendChoice): PrestigeAscendCheck {
  if (!prestigeUnlock(state, content).ok) return { ok: false, reason: "locked" };
  if (choice?.heirlooms === undefined && choice?.stash === undefined) return { ok: true };
  const ledger = buildLedger(state, content);
  if (choice.heirlooms !== undefined) {
    const bad = validateHeirlooms(choice.heirlooms, heirloomCandidates(ledger, content), rankCount(state, content, "prestigeKeepEquipment"));
    if (bad) return { ok: false, reason: bad };
  }
  if (choice.stash !== undefined) {
    const bad = validateStash(choice.stash, stashCandidates(ledger, content), rankCount(state, content, "prestigeKeepBankStacks"));
    if (bad) return { ok: false, reason: bad };
  }
  return { ok: true };
}

/** Geht/Bleibt-Zahlen für die Altar-Liste (Welle D rendert daraus Zeilen; Felder: PRESTIGE_*_FIELDS). */
export interface PrestigeAscendSummary {
  goes: {
    gold: number;
    questTokens: number;
    slayerPoints: number;
    totalLevel: number;
    /** Getragene Teile (aktives Kit, ohne Werkzeuge). */
    equippedPieces: number;
    /** Verschiedene Item-Arten in Inventar + Lager. */
    itemKinds: number;
    /** Verzauberte/gesuffixte Stücke (alle Orte außer Post). */
    instances: number;
    /** Eingelöste Chronik-Kapitel und andere Quests dieses Durchgangs. */
    questsClaimed: number;
  };
  stays: {
    pets: number;
    masteryActions: number;
    achievements: number;
    /** Gekaufte Talentränge aller Bäume (Jägerkodex wirkt erst wieder ab Slayer 85). */
    talentRanks: number;
    /** Post mit Inhalt, die beim Aufstieg gesperrt mitgeht (`prestigeHeld`). */
    heldMail: number;
  };
}

/** Alles, was der Altar vor der Bestätigung braucht (rein lesend, deterministisch). */
export interface PrestigeAscendPreview {
  unlock: PrestigeUnlockCheck;
  points: PrestigePointsBreakdown;
  /** Startgold des neuen Durchgangs (Grabmünzen, `prestigeStartingGold`). */
  startingGold: number;
  /** Schwielen (`prestigeKeepTools`): alle Werkzeuge gehen mit ins neue Lager. */
  keepTools: boolean;
  /** Werkzeuge, die mitgingen (Menge je Item-ID; leer ohne `keepTools`). Erbstücke zählen nicht doppelt. */
  tools: Array<{ itemId: ItemId; qty: number }>;
  /** Erbstück-Plätze (`prestigeKeepEquipment`). */
  heirloomSlots: number;
  heirloomCandidates: PrestigeHeirloomCandidate[];
  /** Vorgabe, wenn der Spieler nichts wählt (die ersten Kandidaten, je eines). */
  heirloomDefault: PrestigeItemRef[];
  /** Truhen-Plätze (`prestigeKeepBankStacks`). */
  stashSlots: number;
  /** Deckel je Stapel (`PRESTIGE_STASH_STACK_CAP`). */
  stashStackCap: number;
  stashCandidates: PrestigeStashCandidate[];
  stashDefault: ItemId[];
  summary: PrestigeAscendSummary;
  /** claude:2026-10-30T18:44:00+01:00 — 1.4.2 Bezahlte Rechnung / Ungebrochene Fährte: was davon mitkommt. */
  kept: PrestigeKeptValues;
}

/** claude:2026-10-30T18:44:00+01:00 — 1.4.2 (Spec § 3): Werte, die Schutz-Talente über den Aufstieg tragen (Vorschau == `ascend`). */
export interface PrestigeKeptValues {
  /** Bezahlte Rechnung (`prestigeKeepPurchases`): Auto-Essen-Stufe, Auto-Buff-Freischaltung, gekaufte Bankplätze bleiben. */
  keepPurchases: boolean;
  /** Ungebrochene Fährte (`prestigeKeepSlayerPoints`): Anteil 0..1, abgerundet je Währung. */
  slayerShare: number;
  /** Slayer-Punkte, die bleiben. */
  slayerPoints: number;
  /** Marken (`character.questTokens`), die bleiben. */
  questTokens: number;
}

/** Schutz-Talente aus dem ALTEN Stand ausgewertet (rein lesend). */
export function prestigeKeptValues(state: GameState, content: ContentDB): PrestigeKeptValues {
  const keepPurchases = talentEffect(state, content, "prestigeKeepPurchases") > 0;
  const raw = talentEffect(state, content, "prestigeKeepSlayerPoints");
  const slayerShare = Number.isFinite(raw) && raw > 0 ? Math.min(1, raw) : 0;
  const keep = (v: unknown): number => (slayerShare > 0 ? Math.floor(positiveInt(v) * slayerShare + 1e-9) : 0);
  return { keepPurchases, slayerShare, slayerPoints: keep(state.slayerPoints), questTokens: keep(state.character?.questTokens) };
}

function countTalentRanks(state: GameState): number {
  let n = 0;
  for (const tree of Object.values(state.talents ?? {})) {
    for (const r of Object.values(tree ?? {})) n += positiveInt(r);
  }
  return n;
}

function questsClaimedCount(state: GameState): number {
  return new Set(state.quests?.claimed ?? []).size;
}

function mailHasContent(m: { items: unknown[]; instances: unknown[] }): boolean {
  return (m.items?.length ?? 0) > 0 || (m.instances?.length ?? 0) > 0;
}

/**
 * Altar-Vorschau (Welle D baut darauf): Freischaltung, Punkte-Aufschlüsselung, Startgold, Werkzeuge,
 * wählbare Erbstücke/Stapel samt Maxima und Vorgabe, Geht/Bleibt-Zahlen. Rein lesend.
 */
export function prestigeAscendPreview(state: GameState, content: ContentDB): PrestigeAscendPreview {
  const ledger = buildLedger(state, content);
  const heirloomSlots = rankCount(state, content, "prestigeKeepEquipment");
  const stashSlots = rankCount(state, content, "prestigeKeepBankStacks");
  const hc = heirloomCandidates(ledger, content);
  const sc = stashCandidates(ledger, content);
  const heirloomDefault = defaultHeirlooms(hc, heirloomSlots);
  const keepTools = talentEffect(state, content, "prestigeKeepTools") > 0;
  const tools = keepTools ? keptTools(ledger, content, heirloomDefault).plain : [];
  const kept = prestigeKeptValues(state, content); // claude:2026-10-30T18:44:00+01:00 — 1.4.2
  let equippedPieces = 0;
  for (const slot of EQUIP_SLOTS) if (!isToolSlot(slot) && state.character.equipment?.[slot]) equippedPieces++;
  const itemKinds = new Set<ItemId>(ledger.stackable.keys());
  return {
    unlock: prestigeUnlock(state, content),
    points: prestigePointsPreview(state, content),
    startingGold: positiveInt(talentEffect(state, content, "prestigeStartingGold")),
    keepTools,
    tools,
    heirloomSlots,
    heirloomCandidates: hc,
    heirloomDefault,
    stashSlots,
    stashStackCap: PRESTIGE_STASH_STACK_CAP,
    stashCandidates: sc,
    stashDefault: defaultStash(sc, stashSlots),
    summary: {
      goes: {
        gold: Math.max(0, Math.floor(state.character.gold ?? 0)),
        // claude:2026-10-30T18:44:00+01:00 — 1.4.2: was die Ungebrochene Fährte trägt, geht nicht.
        questTokens: Math.max(0, Math.floor(state.character.questTokens ?? 0) - kept.questTokens),
        slayerPoints: Math.max(0, Math.floor(state.slayerPoints ?? 0) - kept.slayerPoints),
        totalLevel: totalLevel(state, content),
        equippedPieces,
        itemKinds: itemKinds.size,
        instances: ledger.instances.length,
        questsClaimed: questsClaimedCount(state),
      },
      stays: {
        pets: Object.keys(state.character.ownedPets ?? {}).length,
        masteryActions: Object.keys(state.mastery ?? {}).length,
        achievements: (state.achievements ?? []).length,
        talentRanks: countTalentRanks(state),
        heldMail: (state.mailbox ?? []).filter(mailHasContent).length,
      },
    },
    kept,
  };
}

/**
 * Werkzeuge, die Schwielen mitnimmt: jedes Stück mit `ItemDef.tool` im Besitz, abzüglich der als Erbstück
 * gewählten (kein Doppel-Behalten eines Doppelnutzen-Teils). Einfache Stücke je ID summiert, Instanzen einzeln.
 */
function keptTools(
  ledger: Ledger,
  content: ContentDB,
  heirlooms: readonly PrestigeItemRef[],
): { plain: Array<{ itemId: ItemId; qty: number }>; instances: ItemInstance[] } {
  const takenPlain = new Map<ItemId, number>();
  const takenInst = new Set<string>();
  for (const h of heirlooms) {
    if (h.instanceId !== undefined) takenInst.add(h.instanceId);
    else takenPlain.set(h.itemId, (takenPlain.get(h.itemId) ?? 0) + 1);
  }
  const plain: Array<{ itemId: ItemId; qty: number }> = [];
  for (const [itemId, qty] of ledger.plain) {
    if (!content.items[itemId]?.tool) continue;
    const rest = qty - (takenPlain.get(itemId) ?? 0);
    if (rest > 0) plain.push({ itemId, qty: rest });
  }
  const instances: ItemInstance[] = [];
  for (const { inst } of ledger.instances) {
    if (content.items[inst.baseItemId]?.tool && !takenInst.has(inst.instanceId)) instances.push(inst);
  }
  return { plain, instances };
}

// ── Bilanz des Durchgangs (Welle E1) ───────────────────────────────────────
// claude:2026-10-18T19:40:00+02:00 — Chef-Wunsch 18.10.: animiertes Aufstiegs-Fenster mit den Errungenschaften
// des Durchgangs und der Narben-Zusammensetzung. „Dieser Durchgang" = Lebenszeit-Zähler − `prestige.runStart`
// (von `ascend` geschrieben; ohne Baseline = seit Spielbeginn). Rein lesend, deterministisch, kein RNG.

/**
 * Stabile Zeilen-Schlüssel der Narben-Aufschlüsselung, in Anzeige-Reihenfolge (UI: `t("prestige.points." + key)`):
 *  - `base`           Grundbetrag je Aufstieg (`PRESTIGE_POINTS_BASE`), ohne `amount`.
 *  - `skills99`       die ersten `PRESTIGE_POINTS_CORE_99` Fertigkeiten auf 99; amount = Zahl, je `PRESTIGE_POINTS_PER_99`.
 *  - `skills99Extra`  jede weitere Fertigkeit auf 99; amount = Zahl, je `PRESTIGE_POINTS_PER_EXTRA_99`.
 *  - `totalLevel`     amount = Gesamtstufe; Punkte je volle `PRESTIGE_TOTAL_LEVEL_STEP` über `PRESTIGE_TOTAL_LEVEL_THRESHOLD`.
 *  - `chronicle`      amount = eingelöste Kapitel ab `PRESTIGE_CHRONICLE_BONUS_FROM_CHAPTER`; je `PRESTIGE_POINTS_PER_LATE_CHAPTER`.
 *  - `paragon`        amount = beste Paragon-Etage; Punkte je volle `PRESTIGE_PARAGON_FLOOR_STEP`, gedeckelt `PRESTIGE_PARAGON_POINTS_CAP`.
 * claude:2026-10-30T18:44:00+01:00 — 1.4.2 (Spec § 2), Einheiten wie `PrestigePointsSource.amount`:
 *  - `gold` / `dungeons` / `slayer` / `raid`             je Sturz (mit Faktor).
 *  - `pets` / `bestiary` / `achievements` / `raidFirst`  einmalig über das Hauptbuch (ohne Faktor).
 */
export type PrestigePointsLineKey =
  | "base"
  | "skills99"
  | "skills99Extra"
  | "totalLevel"
  | "chronicle"
  | "paragon"
  | "gold"
  | "dungeons"
  | "slayer"
  | "raid"
  | "pets"
  | "bestiary"
  | "achievements"
  | "raidFirst";

/** Feste Reihenfolge der Zeilen (jede Zeile ist IMMER enthalten, auch mit 0 Punkten; die UI darf 0-Zeilen ausblenden). */
export const PRESTIGE_POINTS_LINE_KEYS: readonly PrestigePointsLineKey[] = [
  "base",
  "skills99",
  "skills99Extra",
  "totalLevel",
  "chronicle",
  "paragon",
  // claude:2026-10-30T18:44:00+01:00 — 1.4.2
  "gold",
  "dungeons",
  "slayer",
  "raid",
  "pets",
  "bestiary",
  "achievements",
  "raidFirst",
];

/** Eine Zeile der Aufschlüsselung: Menge/Basiswert (fehlt bei `base`) und die daraus entstehenden Narben. */
export interface PrestigePointsLine {
  key: PrestigePointsLineKey;
  amount?: number;
  points: number;
}

/**
 * Zeilenweise Narben-Aufschlüsselung für die Animation. Invariante: Σ lines.points = subtotal,
 * subtotal + fromMult = total, total = Gutschrift von `ascend` (beides aus `prestigePointsPreview`).
 * claude:2026-10-30T18:44:00+01:00 — 1.4.2: `fromMult` stammt nur aus den „je Sturz“-Zeilen (`runSubtotal`), die einmaligen Zeilen tragen keinen Faktor.
 */
export interface PrestigePointsLedger {
  lines: PrestigePointsLine[];
  /** Summe der Zeilen vor dem Knoten-Multiplikator. */
  subtotal: number;
  /** Anteil „Der tiefere Schnitt" (`prestigePointsMult`, z. B. 0.25), 0 ohne Rang. */
  mult: number;
  /** Zuschlag durch `mult` (ganzzahlig, = total − subtotal). */
  fromMult: number;
  /** Gutschrift dieses Aufstiegs. */
  total: number;
  /** claude:2026-10-30T18:44:00+01:00 — 1.4.2: Summe der „je Sturz“-Zeilen vor dem Faktor (nur sie trägt `mult`). */
  runSubtotal: number;
  /** claude:2026-10-30T18:44:00+01:00 — 1.4.2: Summe der einmaligen Zeilen (Hauptbuch, ohne Faktor). total = floor(runSubtotal × (1 + mult)) + onceTotal. */
  onceTotal: number;
}

/**
 * Bilanz des laufenden Durchgangs (vor dem Aufstieg aufzurufen). Die Felder von `PrestigeRunTally` (shared)
 * gelten für DIESEN Durchgang; `ascend` legt genau diese Teilmenge als `PrestigeRecord.tally` ab.
 */
export interface PrestigeRunSummary extends PrestigeRunTally {
  /** Nummer dieses Durchgangs (= prestige.count + 1). */
  run: number;
  /** Gesamtstufe. */
  totalLevel: number;
  /** Alle Fertigkeiten in `content.skills`-Reihenfolge mit Stufe. */
  skills: Array<{ id: SkillId; level: number }>;
  /** Fertigkeiten auf `PRESTIGE_SKILL_LEVEL` (gleiche Reihenfolge). */
  skills99: SkillId[];
  /** Narben-Aufschlüsselung (identisch zur Gutschrift von `ascend`). */
  points: PrestigePointsLedger;
}

function sumCounts(rec: Readonly<Record<string, number>> | undefined): number {
  let n = 0;
  for (const v of Object.values(rec ?? {})) n += positiveInt(v);
  return n;
}

/**
 * Aktuelle Lebenszeit-Zähler in Baseline-Form (Summe Kills, Summe Dungeon-Abschlüsse, Erfolge, Begleiter,
 * Slayer-Aufträge, aktive Spielzeit, seit SAVE 99 Raid-Abschlüsse je Schwierigkeit). `ascend` schreibt genau das als
 * `prestige.runStart` des neuen Durchgangs.
 */
export function prestigeRunCounters(state: GameState): PrestigeRunBaseline {
  let pets = 0;
  for (const v of Object.values(state.character?.ownedPets ?? {})) if (v === true) pets++;
  return {
    kills: sumCounts(state.monsterKills),
    dungeons: sumCounts(state.dungeonsCleared),
    achievements: new Set(state.achievements ?? []).size,
    pets,
    slayerTasks: positiveInt(state.slayerTasksCompleted),
    activePlayMs: positiveInt(state.activePlayMs),
    raidClears: raidClearsOf(state), // claude:2026-10-30T18:44:00+01:00 — SAVE 99: Laufanker der Raid-Quelle
  };
}

/** Aus der Vorschau-Aufschlüsselung die Zeilen für die Animation (gleiche Zahlen, nur zeilenweise). */
export function prestigePointsLedger(b: PrestigePointsBreakdown): PrestigePointsLedger {
  const core = Math.min(b.skills99, PRESTIGE_POINTS_CORE_99);
  const extra = Math.max(0, b.skills99 - PRESTIGE_POINTS_CORE_99);
  const lines: PrestigePointsLine[] = [
    { key: "base", points: b.fromBase },
    { key: "skills99", amount: core, points: core * PRESTIGE_POINTS_PER_99 },
    { key: "skills99Extra", amount: extra, points: extra * PRESTIGE_POINTS_PER_EXTRA_99 },
    { key: "totalLevel", amount: b.totalLevel, points: b.fromTotalLevel },
    { key: "chronicle", amount: b.lateChapters, points: b.fromChronicle },
    { key: "paragon", amount: b.paragonBest, points: b.fromParagon },
    // claude:2026-10-30T18:44:00+01:00 — 1.4.2 (Spec § 2)
    { key: "gold", amount: b.gold, points: b.fromGold },
    { key: "dungeons", amount: b.runDungeons, points: b.fromDungeons },
    { key: "slayer", amount: b.runSlayerTasks, points: b.fromSlayer },
    { key: "raid", amount: b.runRaidClears.normal + b.runRaidClears.heroic + b.runRaidClears.mythic, points: b.fromRaid },
    { key: "pets", amount: b.newPets.length, points: b.fromPets },
    { key: "bestiary", amount: b.newBestiary.length, points: b.fromBestiary },
    { key: "achievements", amount: b.apOverPaid, points: b.fromAchievements },
    { key: "raidFirst", amount: b.newRaidFirsts.length, points: b.fromRaidFirst },
  ];
  return { lines, subtotal: b.subtotal, mult: b.pointsMult, fromMult: b.fromMult, total: b.total, runSubtotal: b.runSubtotal, onceTotal: b.onceTotal }; // claude:2026-10-30T18:44:00+01:00 — 1.4.2
}

function buildRunSummary(state: GameState, content: ContentDB, breakdown: PrestigePointsBreakdown): PrestigeRunSummary {
  const now = prestigeRunCounters(state);
  const base = state.prestige?.runStart ?? defaultPrestigeRunBaseline();
  const since = (cur: number, start: unknown): number => Math.max(0, cur - positiveInt(start));

  const skills = Object.keys(content.skills).map((id) => ({ id, level: levelFromXp(state.skills[id]?.xp ?? 0) }));
  const skills99 = skills.filter((s) => s.level >= PRESTIGE_SKILL_LEVEL).map((s) => s.id);

  // Höchstes Chronik-Kapitel: nur Quests, die der Content kennt (wie der Chronik-Bonus der Punkte).
  const known = new Set(content.quests.map((q) => q.id));
  let chronicleChapter = 0;
  for (const id of state.quests?.claimed ?? []) {
    const chapter = chronicleChapterNumber(id);
    if (chapter !== null && known.has(id) && chapter > chronicleChapter) chronicleChapter = chapter;
  }

  return {
    run: positiveInt(state.prestige?.count) + 1,
    playMs: since(now.activePlayMs, base.activePlayMs),
    totalLevel: breakdown.totalLevel,
    skills,
    skills99,
    chronicleChapter,
    questsClaimed: questsClaimedCount(state),
    kills: since(now.kills, base.kills),
    dungeons: since(now.dungeons, base.dungeons),
    achievements: since(now.achievements, base.achievements),
    petsFound: since(now.pets, base.pets),
    slayerTasks: since(now.slayerTasks, base.slayerTasks),
    paragonBest: breakdown.paragonBest,
    gold: positiveInt(state.character?.gold),
    points: prestigePointsLedger(breakdown),
  };
}

/**
 * Bilanz des AKTUELLEN Durchgangs für das Aufstiegs-Fenster (vor `ascend` aufrufen; danach beschreibt sie den
 * neuen, leeren Durchgang). Rein lesend, deterministisch. `points.total` ist exakt die Gutschrift von `ascend`.
 */
export function prestigeRunSummary(state: GameState, content: ContentDB): PrestigeRunSummary {
  return buildRunSummary(state, content, prestigePointsPreview(state, content));
}

/** Kompakte Teilmenge der Bilanz für den Historien-Eintrag (feste Schlüssel-Reihenfolge = Save-Form). */
function runTallyOf(s: PrestigeRunSummary): PrestigeRunTally {
  const tally = {} as PrestigeRunTally;
  for (const k of PRESTIGE_RUN_TALLY_KEYS) tally[k] = s[k];
  return tally;
}

// ── Erinnerung („Bekannte Seiten", prestigeChronicleRecall) ───────────────
// claude:2026-10-18T12:00:00+02:00 — Chef 18.10. Punkt 6: nur Kapitel 1–18, halbes Gold, keine Marken und
// keine Gegenstände; nie 19 (`last_idol`), 20 (`drazhan`), 21 (Paragon 5) oder Band 2 („Kampf ist fundamental").
// „Erlebt": jeder Aufstieg verlangt eingelöstes Kapitel 21, und die Chronik ist eine lineare `requires`-Kette;
// mit `prestige.count ≥ 1` hat der Spielstand also jedes Kapitel ≤ 21 schon einmal abgeschlossen.

/**
 * Stabile Fehlschlag-Codes der Erinnerung (UI: `t("prestige.recall." + code)`):
 *  - `no_talent`        Knoten „Bekannte Seiten" nicht gekauft (oder noch kein Aufstieg).
 *  - `not_recallable`   keine Chronik-Quest oder Kapitel > PRESTIGE_RECALL_MAX_CHAPTER.
 *  - `claimed`          Kapitel in diesem Durchgang schon eingelöst.
 *  - `locked`           Vorgänger-Kapitel noch offen (Reihenfolge der Chronik).
 */
export type PrestigeRecallReason = "no_talent" | "not_recallable" | "claimed" | "locked";

export interface PrestigeRecallResult {
  ok: boolean;
  reason?: PrestigeRecallReason;
  /** Gutgeschriebenes Gold (floor(Kapitel-Gold × PRESTIGE_RECALL_GOLD_MULT)). */
  gold?: number;
}

function recallableQuest(content: ContentDB, questId: string): QuestDef | null {
  const chapter = chronicleChapterNumber(questId);
  if (chapter === null || chapter < 1 || chapter > PRESTIGE_RECALL_MAX_CHAPTER) return null;
  const quest = content.quests.find((q) => q.id === questId);
  if (!quest || quest.repeatable || quest.daily) return null;
  return quest;
}

/** Hat der Spielstand die Erinnerung (Knoten gekauft UND mindestens ein Aufstieg)? */
export function prestigeRecallAvailable(state: GameState, content: ContentDB): boolean {
  return (state.prestige?.count ?? 0) > 0 && talentEffect(state, content, "prestigeChronicleRecall") > 0;
}

/** Prüft die Erinnerung eines Kapitels ohne State-Änderung (Gold = Vorschau der Gutschrift). */
export function prestigeRecallCheck(state: GameState, content: ContentDB, questId: string): PrestigeRecallResult {
  if (!prestigeRecallAvailable(state, content)) return { ok: false, reason: "no_talent" };
  const quest = recallableQuest(content, questId);
  if (!quest) return { ok: false, reason: "not_recallable" };
  if (state.quests.claimed.includes(questId)) return { ok: false, reason: "claimed" };
  if (!questUnlocked(state, quest)) return { ok: false, reason: "locked" };
  return { ok: true, gold: Math.floor(Math.max(0, quest.rewards.gold ?? 0) * PRESTIGE_RECALL_GOLD_MULT) };
}

/**
 * Schließt ein erlebtes Chronik-Kapitel per Klick ab: als eingelöst markiert (öffnet Zonen-/Dungeon-Gates
 * und das nächste Kapitel wie ein normaler Claim), zahlt halbes Gold, KEINE Marken, KEINE Gegenstände, keine
 * XP und keinen Gold-Einnahmen-Bonus. Bei Fehlschlag bleibt der State unverändert. Kein RNG.
 */
export function prestigeRecallChapter(state: GameState, content: ContentDB, questId: string): PrestigeRecallResult {
  const check = prestigeRecallCheck(state, content, questId);
  if (!check.ok) return check;
  state.quests.claimed.push(questId);
  const i = state.quests.completed.indexOf(questId);
  if (i >= 0) state.quests.completed.splice(i, 1);
  state.character.gold += check.gold ?? 0;
  return check;
}

/**
 * Kapitel, die sich JETZT der Reihe nach per Erinnerung abschließen ließen (Chronik-Reihenfolge; das erste
 * ist sofort wählbar, jedes weitere nach seinem Vorgänger). Leer ohne Knoten. Rein lesend.
 */
export function prestigeRecallableChapters(state: GameState, content: ContentDB): string[] {
  if (!prestigeRecallAvailable(state, content)) return [];
  const chapters = content.quests
    .filter((q) => recallableQuest(content, q.id) && !state.quests.claimed.includes(q.id))
    .sort((a, b) => (chronicleChapterNumber(a.id) ?? 0) - (chronicleChapterNumber(b.id) ?? 0));
  const reachable = new Set(state.quests.claimed);
  const out: string[] = [];
  for (const q of chapters) {
    if (!(q.requires ?? []).every((id) => reachable.has(id))) break;
    out.push(q.id);
    reachable.add(q.id);
  }
  return out;
}

/** „Alle erlebten Kapitel abschließen" in einem Klick: ruft `prestigeRecallChapter` der Reihe nach. */
export function prestigeRecallChronicle(state: GameState, content: ContentDB): { chapters: string[]; gold: number } {
  const chapters: string[] = [];
  let gold = 0;
  for (const id of prestigeRecallableChapters(state, content)) {
    const r = prestigeRecallChapter(state, content, id);
    if (!r.ok) break;
    chapters.push(id);
    gold += r.gold ?? 0;
  }
  return { chapters, gold };
}

// ── Aufstieg ───────────────────────────────────────────────────────────────

/** Seed des neuen Durchgangs: ein Wurf aus einer KOPIE des alten Haupt-RNG (deterministisch, Alt-RNG unberührt). */
export function prestigeNextSeed(state: GameState): number {
  const fork = { state: (state.rng?.state ?? 0) >>> 0 };
  return Math.floor(nextFloat(fork) * 0x100000000) >>> 0;
}

/** Startstil des Neustands: Stil der getragenen Haupthand, sonst Nahkampf (Default von createGame). */
function startingStyleOf(state: GameState, content: ContentDB): WeaponStyle {
  const mainhand = state.character.equipment?.mainhand;
  return (mainhand ? content.items[mainhand]?.weaponStyle : undefined) || "melee";
}

/**
 * Aufstieg: nur wenn `prestigeAscendCheck(...).ok`, sonst `false` und der State bleibt unangetastet. Baut den
 * Neustand über `createGame` (Startausrüstung des Stils der getragenen Haupthand, Starter-Paket wie bei der
 * echten Charaktererstellung, Name/Porträt/Erstellungszeit übernommen), kopiert die Bleibe-Felder laut
 * Wächterliste, setzt die Quest-Laufanker, schreibt `prestige` fort (count+1, Punkte laut Vorschau,
 * Historien-Eintrag) und rechnet die abgeleiteten Charakterwerte neu. Der übergebene State wird IN PLACE
 * ersetzt (Referenz bleibt gültig, Muster aller Engine-Verben). Deterministisch: gleicher Eingangs-State und
 * gleiche Auswahl ⇒ byte-gleicher Neustand.
 *
 * claude:2026-10-18T12:00:00+02:00 — Welle B2, Narbenbuch: Startgold (Grabmünzen), Werkzeuge (Schwielen),
 * Erbstücke und Truhen-Stapel landen im NEUEN Lager (Erbstücke verlangen Stufe ≥ 80, können also nicht
 * getragen starten); verzauberte/gesuffixte Stücke behalten Affixe, Suffix und ihre Instanz-ID (eindeutig im
 * alten Stand, `nextInstanceSeq` bleibt; bei einer Kollision mit dem Neustand würde neu geprägt). `choice`
 * fehlt ⇒ Vorgabe der Vorschau (`heirloomDefault`/`stashDefault`). Post mit Inhalt wird `prestigeHeld`.
 *
 * claude:2026-10-18T19:40:00+02:00 — Welle E1: schreibt `prestige.runStart` (Zählerstände beim Aufstieg) und
 * hängt die kompakte Bilanz (`prestigeRunSummary` → `PrestigeRecord.tally`) an den Historien-Eintrag. Das
 * Aufstiegs-Fenster ruft `prestigeRunSummary` VOR diesem Aufruf.
 *
 * Aufrufer (Welle D): VOR dem Aufruf den Spielstand speichern und die Sicherung auslösen (IPC-Kanal, z. B.
 * `saves:backupPreAscend`, legt Welle D an; Main-Funktion apps/client/src/main/saveBackups.ts
 * `backupPreAscend`), nur bei Ergebnis `"pre-ascend"` aufsteigen und danach sofort speichern.
 */
export function ascend(state: GameState, content: ContentDB, choice?: PrestigeAscendChoice): boolean {
  if (!prestigeAscendCheck(state, content, choice).ok) return false;

  const preview = prestigePointsPreview(state, content);
  const old = state;
  const oldPrestige = old.prestige ?? defaultPrestigeState();
  // claude:2026-10-18T19:40:00+02:00 — Welle E1: Bilanz aus derselben Vorschau (Gutschrift == Aufschlüsselung)
  // und die Zählerstände beim Aufstieg (= Baseline des neuen Durchgangs), beides aus dem ALTEN Stand.
  const runSummary = buildRunSummary(old, content, preview);
  const runStart = prestigeRunCounters(old);

  // Narbenbuch-Auswahl aus dem ALTEN Stand (Ränge bleiben ohnehin, gelesen wird vor dem Umbau).
  const ledger = buildLedger(old, content);
  const heirloomSlots = rankCount(old, content, "prestigeKeepEquipment");
  const stashSlots = rankCount(old, content, "prestigeKeepBankStacks");
  const hc = heirloomCandidates(ledger, content);
  const sc = stashCandidates(ledger, content);
  const heirlooms = choice?.heirlooms ?? defaultHeirlooms(hc, heirloomSlots);
  const stash = choice?.stash ?? defaultStash(sc, stashSlots);
  const startingGold = positiveInt(talentEffect(old, content, "prestigeStartingGold"));
  const tools = talentEffect(old, content, "prestigeKeepTools") > 0 ? keptTools(ledger, content, heirlooms) : { plain: [], instances: [] };
  const kept = prestigeKeptValues(old, content); // claude:2026-10-30T18:44:00+01:00 — 1.4.2 Bezahlte Rechnung / Ungebrochene Fährte

  const next = createGame(
    {
      name: old.character.name,
      portraitId: old.character.portraitId,
      portrait: old.character.portrait,
      createdAt: old.character.createdAt,
      startingStyle: startingStyleOf(old, content),
      starterKit: true,
    },
    content,
    prestigeNextSeed(old),
  );
  const freshDiscovered = next.discoveredItems;

  // Bleibe-Felder: Referenzen wandern in den Neustand (der alte Container wird unten geleert).
  const target = next as unknown as Record<string, unknown>;
  const source = old as unknown as Record<string, unknown>;
  for (const key of PRESTIGE_KEEP_FIELDS) {
    if (key in source) target[key] = source[key];
  }
  // claude:2026-10-25T04:30:00+02:00 — Raid (R10): Freischaltungen/Zähler bleiben (keep), laufender Lauf, Warteschlange und Wochentruhen nicht.
  if (next.raid) next.raid = structuredClone(next.raid);
  resetRaidForPrestige(next);
  const nextChar = next.character as unknown as Record<string, unknown>;
  const oldChar = old.character as unknown as Record<string, unknown>;
  for (const key of PRESTIGE_CHARACTER_KEEP_FIELDS) {
    if (key in oldChar) nextChar[key] = oldChar[key];
    else delete nextChar[key];
  }

  // Wiki: der Starterbesitz des Neustands gilt (wieder) als entdeckt — Vereinigung, nie Verlust.
  next.discoveredItems = { ...(old.discoveredItems ?? {}), ...freshDiscovered };

  // Quests: Neuzustand, aber einmalige wie wiederholbare Quests messen ab dem Zählerstand beim Aufstieg.
  next.quests.repeatBaseline = questRunBaselines(next, content);
  // claude:2026-10-31T13:58:31+01:00 — Befund A1: das Tagesbrett (Karten, eingelöst, Tag) überlebt den Sturz, die Serie damit auch;
  // offene Karten messen ab hier (quests.ts carryDailyBoard). Sonst zog refreshDailyQuests am selben Tag ein zweites Brett.
  carryDailyBoard(next, content, old.quests.daily);

  // ── Narbenbuch: Grabmünzen, Schwielen, Erbstück, Vergrabene Truhe → neues Lager ──
  next.character.gold += startingGold;
  // claude:2026-10-30T18:44:00+01:00 — 1.4.2 Bezahlte Rechnung (Spec § 3): gekaufte Komfort-Stufen bleiben. Beim Auto-Trank bleiben Schwelle,
  // Auto-Buff-Schalter und -Freischaltung; die Trank-Wahl verweist auf das alte Lager und startet leer.
  if (kept.keepPurchases) {
    next.character.autoEatTier = old.character.autoEatTier;
    next.character.autoPotion = { ...old.character.autoPotion, healPotionId: null };
    next.bankSlotsPurchased = old.bankSlotsPurchased;
  }
  // claude:2026-10-30T18:44:00+01:00 — 1.4.2 Ungebrochene Fährte: 25/50/100 % der Slayer-Punkte und Marken (abgerundet).
  if (kept.slayerPoints > 0) next.slayerPoints = (next.slayerPoints ?? 0) + kept.slayerPoints;
  if (kept.questTokens > 0) next.character.questTokens = (next.character.questTokens ?? 0) + kept.questTokens;
  const usedIds = new Set<string>();
  for (const m of next.mailbox ?? []) for (const inst of m.instances) usedIds.add(inst.instanceId);
  for (const inst of next.inventory.instances) usedIds.add(inst.instanceId);
  for (const inst of next.bankInstances) usedIds.add(inst.instanceId);
  const keepInstance = (inst: ItemInstance): void => {
    // Die Instanz wandert als Referenz (ihre alten Behälter verschwinden mit dem Altstand); nur bei einer
    // ID-Kollision mit dem Neustand bekommt eine flache Kopie eine frisch geprägte ID.
    const moved = usedIds.has(inst.instanceId) ? { ...inst, instanceId: mintInstanceId(next) } : inst;
    usedIds.add(moved.instanceId);
    next.bankInstances.push(moved);
  };
  const keepPlain = (itemId: ItemId, qty: number): void => {
    if (qty <= 0 || !content.items[itemId]) return;
    next.bank[itemId] = (next.bank[itemId] ?? 0) + qty;
  };
  const instById = new Map(ledger.instances.map((e) => [e.inst.instanceId, e.inst] as const));
  for (const h of heirlooms) {
    if (h.instanceId !== undefined) {
      const inst = instById.get(h.instanceId);
      if (inst) keepInstance(inst);
    } else keepPlain(h.itemId, 1);
  }
  for (const t of tools.plain) keepPlain(t.itemId, t.qty);
  for (const inst of tools.instances) keepInstance(inst);
  for (const itemId of stash) {
    const c = sc.find((x) => x.itemId === itemId);
    if (c) keepPlain(itemId, c.keep);
  }
  syncBankOrder(next, undefined, storagePredicate(content)); // claude:2026-10-23T21:50:00+02:00 — ohne Lagerware

  // Post-Sperre (Chef 18.10.): jede Mail mit Inhalt, die jetzt im Postfach liegt, bleibt bis zu den nächsten
  // 4×99 gesperrt (`mailCollectBlocked`); gelöscht wird nichts. Briefe ohne Geschenk bleiben lesbar.
  for (const m of next.mailbox ?? []) {
    if (mailHasContent(m)) m.prestigeHeld = true;
  }

  const record: PrestigeRecord = {
    count: oldPrestige.count + 1,
    points: preview.total,
    totalLevel: preview.totalLevel,
    skills99: preview.skills99,
    activePlayMs: Math.max(0, Math.floor(old.activePlayMs ?? 0)),
    tally: runTallyOf(runSummary), // claude:2026-10-18T19:40:00+02:00 — Welle E1, ohne Echtzeit-Stempel
  };
  next.prestige = {
    count: oldPrestige.count + 1,
    points: oldPrestige.points + preview.total,
    pointsSpent: oldPrestige.pointsSpent,
    runStart, // claude:2026-10-18T19:40:00+02:00 — Welle E1: „dieser Durchgang" zählt ab hier
    history: [...oldPrestige.history, record],
    // claude:2026-10-30T18:44:00+01:00 — SAVE 99 Hauptbuch: genau das, was diese Gutschrift an einmaligen Quellen bezahlt hat (nie doppelt).
    paid: prestigeLedgerAfterAscend(oldPrestige.paid, preview),
    // claude:2026-10-31T14:58:54+01:00 — SAVE 102: der Rückgabe-Beleg bleibt unverändert (auch ein noch unbestätigter Hinweis; die
    // zurückgegebenen Narben stecken ohnehin im Guthaben, das der Sturz fortschreibt).
    respec142: oldPrestige.respec142 ?? null,
  };

  // Abgeleitete Werte nach dem Kopieren neu (Begleiter, Talente, Meisterschaft können maxHp & Co. heben).
  next.character.totalLevel = totalLevel(next, content);
  const stats = computeStats(next, content);
  next.character.hp = stats.maxHp;
  next.character.mana = stats.maxMana;
  next.character.ward = stats.maxWard;

  // In-place-Tausch: Schlüsselreihenfolge = createGame-Reihenfolge (Save-Form wie ein frischer Stand).
  for (const key of Object.keys(state)) delete (state as unknown as Record<string, unknown>)[key];
  Object.assign(state, next);
  return true;
}
