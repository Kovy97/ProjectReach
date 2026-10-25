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
  PrestigeRecord,
  PrestigeRunBaseline,
  PrestigeRunTally,
  QuestDef,
  SkillId,
  WeaponStyle,
} from "@hearthforge/shared";
import {
  EQUIP_SLOTS,
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
import { questRunBaselines, questStatus, questUnlocked } from "./quests";
import { mintInstanceId } from "./enchant";
import { talentEffect } from "./talents";

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
  quests: "reset", // Neuzustand + Laufanker (questRunBaselines)
  petDropSeq: "keep",
  lastPetDrop: "keep",
  farmPlots: "reset",
  slayerTask: "reset",
  slayerPoints: "reset",
  slayerTasksCompleted: "keep", // reiner Lebenszeit-Zähler (nur Erfolge)
  slayerStreak: "reset",
  slayerStreakSeq: "keep",
  lastSlayerStreakBonus: "reset",
  slayerFreeSkipDay: "reset", // hängt am Lager (Trophäenwand), das zurückgesetzt wird
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
  camp: "reset",
  tavern: "reset",
  huntTraps: "reset",
  huntCatchSeq: "keep",
  prestige: "keep", // fortgeschrieben: count+1, Punkte, Historie
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
  /** Summe vor dem Knoten-Multiplikator. */
  subtotal: number;
  /** Anteil aus `prestigePointsMult` („Der tiefere Schnitt"), 0 ohne Rang. */
  pointsMult: number;
  /** Zuschlag durch `pointsMult` (= total − subtotal). */
  fromMult: number;
  /** Gutschrift dieses Aufstiegs: floor(subtotal × (1 + pointsMult)). */
  total: number;
}

/**
 * Punkte-Vorschau für den Altar. claude:2026-10-18T12:00:00+02:00 — kalibrierte Formel (Balance § 4):
 * floor( (BASE + PER_99·min(n99, CORE) + PER_EXTRA_99·max(0, n99 − CORE) + floor(max(0, TL − 1000) / 50)
 *         + 2·Kapitel ≥ 22 + min(10, floor(Paragon-Best / 10))) × (1 + prestigePointsMult) ).
 * Ganzzahlig, rein lesend; alle Zahlen über die PRESTIGE_*-Konstanten in shared.
 */
export function prestigePointsPreview(state: GameState, content: ContentDB): PrestigePointsBreakdown {
  const fromBase = PRESTIGE_POINTS_BASE;
  const skills99 = prestigeSkills99(state, content);
  const core = Math.min(skills99, PRESTIGE_POINTS_CORE_99);
  const fromSkills = core * PRESTIGE_POINTS_PER_99 + Math.max(0, skills99 - PRESTIGE_POINTS_CORE_99) * PRESTIGE_POINTS_PER_EXTRA_99;

  const level = totalLevel(state, content);
  const over = Math.max(0, level - PRESTIGE_TOTAL_LEVEL_THRESHOLD);
  const fromTotalLevel = Math.floor(over / PRESTIGE_TOTAL_LEVEL_STEP) * PRESTIGE_POINTS_PER_TOTAL_LEVEL_STEP;

  const known = new Set(content.quests.map((q) => q.id));
  const counted = new Set<string>();
  for (const id of state.quests?.claimed ?? []) {
    const chapter = chronicleChapterNumber(id);
    if (chapter !== null && chapter >= PRESTIGE_CHRONICLE_BONUS_FROM_CHAPTER && known.has(id)) counted.add(id);
  }
  const lateChapters = counted.size;
  const fromChronicle = lateChapters * PRESTIGE_POINTS_PER_LATE_CHAPTER;

  const best = state.paragon?.best ?? 0;
  const paragonBest = Number.isFinite(best) && best > 0 ? Math.floor(best) : 0;
  const fromParagon = Math.min(
    PRESTIGE_PARAGON_POINTS_CAP,
    Math.floor(paragonBest / PRESTIGE_PARAGON_FLOOR_STEP) * PRESTIGE_POINTS_PER_PARAGON_STEP,
  );

  const subtotal = fromBase + fromSkills + fromTotalLevel + fromChronicle + fromParagon;
  const mult = talentEffect(state, content, "prestigePointsMult");
  const pointsMult = Number.isFinite(mult) && mult > 0 ? mult : 0;
  // Winziger Epsilon gegen Darstellungsfehler (z. B. 0,1-Schritte); bei den Content-Werten (0,25) exakt.
  const total = pointsMult > 0 ? Math.floor(subtotal * (1 + pointsMult) + 1e-9) : subtotal;

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
    subtotal,
    pointsMult,
    fromMult: total - subtotal,
    total,
  };
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
        questTokens: Math.max(0, Math.floor(state.character.questTokens ?? 0)),
        slayerPoints: Math.max(0, Math.floor(state.slayerPoints ?? 0)),
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
 */
export type PrestigePointsLineKey = "base" | "skills99" | "skills99Extra" | "totalLevel" | "chronicle" | "paragon";

/** Feste Reihenfolge der Zeilen (jede Zeile ist IMMER enthalten, auch mit 0 Punkten; die UI darf 0-Zeilen ausblenden). */
export const PRESTIGE_POINTS_LINE_KEYS: readonly PrestigePointsLineKey[] = [
  "base",
  "skills99",
  "skills99Extra",
  "totalLevel",
  "chronicle",
  "paragon",
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
 * Slayer-Aufträge, aktive Spielzeit). `ascend` schreibt genau das als `prestige.runStart` des neuen Durchgangs.
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
  ];
  return { lines, subtotal: b.subtotal, mult: b.pointsMult, fromMult: b.fromMult, total: b.total };
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

  // ── Narbenbuch: Grabmünzen, Schwielen, Erbstück, Vergrabene Truhe → neues Lager ──
  next.character.gold += startingGold;
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
