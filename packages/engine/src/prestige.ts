import type { CharacterState, ContentDB, GameState, PrestigeRecord, WeaponStyle } from "@hearthforge/shared";
import {
  PRESTIGE_CHRONICLE_BONUS_FROM_CHAPTER,
  PRESTIGE_PARAGON_FLOOR_STEP,
  PRESTIGE_POINTS_PER_99,
  PRESTIGE_POINTS_PER_LATE_CHAPTER,
  PRESTIGE_POINTS_PER_PARAGON_STEP,
  PRESTIGE_POINTS_PER_TOTAL_LEVEL_STEP,
  PRESTIGE_REQUIRED_99,
  PRESTIGE_SKILL_LEVEL,
  PRESTIGE_TOTAL_LEVEL_STEP,
  PRESTIGE_TOTAL_LEVEL_THRESHOLD,
  PRESTIGE_UNLOCK_QUEST_ID,
  chronicleChapterNumber,
  defaultPrestigeState,
} from "@hearthforge/shared";
import { levelFromXp } from "./leveling";
import { nextFloat } from "./rng";
import { computeStats, totalLevel } from "./character";
import { createGame } from "./state";
import { questRunBaselines, questStatus } from "./quests";

// ───────────────────────────────────────────────────────────────────────────
// claude:2026-10-17T23:30:00+02:00 — PRESTIGE-FUNDAMENT (1.3, Welle B1, SAVE 88).
// Konzept: design/1.3-prestige-konzept.md inkl. „Chef-Entscheide 17.10.2026 abends". Interne IDs neutral
// (`prestige`, Währung `prestigePoints`, Baum `prestige`); Spielertexte/UI folgen in Welle D, Knoten-
// Wirkungen in Welle B2. Rein & deterministisch: kein Math.random, kein Date.now, kein I/O.
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
  dungeonsCleared: "keep", // Lebenszeit-Zähler (Erfolge); Quests messen per Laufanker ab dem Aufstieg
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
  bank: "reset",
  bankOrder: "reset",
  bankSlotsPurchased: "reset", // mit Gold gekauft (Gold zurück)
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
  talents: "keep", // alle Bäume inkl. Jägerkodex und Prestige-Baum
  petPity: "keep",
  bankInstances: "reset",
  nextInstanceSeq: "keep", // Instanz-IDs im behaltenen Postfach dürfen nie neu vergeben werden
  buyBack: "reset",
  onboarding: "keep",
  mailbox: "keep", // Rabenfracht darin bleibt gesperrt (prestigeFreightLocked)
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
  autoEatTier: "reset", // mit Gold gekauft
  autoEatThreshold: "keep", // Regler, wirkt nur auf Max-Stufe
  autoPotion: "reset", // enthält den gekauften Auto-Rebuff und eine Item-Wahl
  gold: "reset",
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
  skills99: number;
  fromSkills: number;
  totalLevel: number;
  fromTotalLevel: number;
  /** Eingelöste Chronik-Kapitel ab `PRESTIGE_CHRONICLE_BONUS_FROM_CHAPTER` in diesem Durchgang. */
  lateChapters: number;
  fromChronicle: number;
  /** Paragon-Bestetage dieses Durchgangs (`paragon.best`, wird beim Aufstieg zurückgesetzt). */
  paragonBest: number;
  fromParagon: number;
  total: number;
}

/**
 * Punkte-Vorschau für den Altar (Konzept „Aschesiegel", Werte kalibriert der balance-designer über die
 * PRESTIGE_*-Konstanten in shared): je 99er; je volle Stufen-Schritte über der Gesamtstufen-Schwelle; je
 * eingelöstem Band-2-Kapitel; je volle Paragon-Etagen-Schritte. Ganzzahlig, rein lesend. Multiplikatoren aus
 * Baum-Knoten (z. B. „Zweiter Funke") kommen in Welle B2 hinzu.
 */
export function prestigePointsPreview(state: GameState, content: ContentDB): PrestigePointsBreakdown {
  const skills99 = prestigeSkills99(state, content);
  const fromSkills = skills99 * PRESTIGE_POINTS_PER_99;

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
  const fromParagon = Math.floor(paragonBest / PRESTIGE_PARAGON_FLOOR_STEP) * PRESTIGE_POINTS_PER_PARAGON_STEP;

  return {
    skills99,
    fromSkills,
    totalLevel: level,
    fromTotalLevel,
    lateChapters,
    fromChronicle,
    paragonBest,
    fromParagon,
    total: fromSkills + fromTotalLevel + fromChronicle + fromParagon,
  };
}

/**
 * Rabenfracht-Sperre (Chef-Entscheid 3): im Durchgang nach einem Aufstieg darf der Spielstand keine Fracht
 * EMPFANGEN oder einlösen, bis wieder `PRESTIGE_REQUIRED_99` Fertigkeiten auf 99 stehen. Versand bleibt
 * erlaubt. Kein eigenes Flag: abgeleitet aus `prestige.count` und den Skills (XP sinkt nie, also öffnet die
 * Sperre einmal und bleibt offen bis zum nächsten Aufstieg). Gelesen von engine/mail.ts.
 */
export function prestigeFreightLocked(state: GameState, content: ContentDB): boolean {
  return (state.prestige?.count ?? 0) > 0 && prestigeSkills99(state, content) < PRESTIGE_REQUIRED_99;
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
 * Aufstieg: nur wenn `prestigeUnlock(...).ok`, sonst `false` und der State bleibt unangetastet. Baut den
 * Neustand über `createGame` (Startausrüstung des Stils der getragenen Haupthand, Starter-Paket wie bei der
 * echten Charaktererstellung, Name/Porträt/Erstellungszeit übernommen), kopiert die Bleibe-Felder laut
 * Wächterliste, setzt die Quest-Laufanker, schreibt `prestige` fort (count+1, Punkte laut Vorschau,
 * Historien-Eintrag) und rechnet die abgeleiteten Charakterwerte neu. Der übergebene State wird IN PLACE
 * ersetzt (Referenz bleibt gültig, Muster aller Engine-Verben). Deterministisch: gleicher Eingangs-State ⇒
 * byte-gleicher Neustand.
 *
 * Aufrufer (Welle D): VOR dem Aufruf den Spielstand speichern und die Sicherung auslösen (IPC-Kanal, z. B.
 * `saves:backupPreAscend`, legt Welle D an; Main-Funktion apps/client/src/main/saveBackups.ts
 * `backupPreAscend`), nur bei Ergebnis `"pre-ascend"` aufsteigen und danach sofort speichern.
 */
export function ascend(state: GameState, content: ContentDB): boolean {
  const unlock = prestigeUnlock(state, content);
  if (!unlock.ok) return false;

  const preview = prestigePointsPreview(state, content);
  const old = state;
  const oldPrestige = old.prestige ?? defaultPrestigeState();

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

  const record: PrestigeRecord = {
    count: oldPrestige.count + 1,
    points: preview.total,
    totalLevel: preview.totalLevel,
    skills99: preview.skills99,
    activePlayMs: Math.max(0, Math.floor(old.activePlayMs ?? 0)),
  };
  next.prestige = {
    count: oldPrestige.count + 1,
    points: oldPrestige.points + preview.total,
    pointsSpent: oldPrestige.pointsSpent,
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
