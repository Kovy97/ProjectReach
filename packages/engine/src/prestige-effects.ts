import type { ContentDB, GameState, SkillId } from "@hearthforge/shared";
import {
  PRESTIGE_EARLY_XP_LEVEL_CAP,
  PRESTIGE_MASTERED_XP_LEVEL_CAP,
  prestigeMasteredAchievementId,
} from "@hearthforge/shared";
import { levelFromXp } from "./leveling";
import { talentEffect } from "./talents";

// ───────────────────────────────────────────────────────────────────────────
// claude:2026-10-18T12:00:00+02:00 — Laufende Wirkungen des Narbenbuchs (Prestige Welle B2,
// design/1.3-prestige-balance.md § 5). Eigenes kleines Modul (nur talents + leveling), damit tick/combat/
// slayer/farming/hunting/quests/tavern/character die Faktoren ohne Import-Zyklus über prestige.ts lesen.
// Jeder Faktor ist EXAKT 1 ohne passende Ränge ⇒ alle Aufrufer bleiben bit-identisch (x · 1 === x).
// Rein & deterministisch: kein RNG, keine Uhr. Werte NUR über `talentEffect` (nie über Knoten-Ids).
// ───────────────────────────────────────────────────────────────────────────

// Memo der Erfolgs-Menge (state.achievements ist eine reine Anhänge-Liste): neu gebaut, sobald sich die
// Array-Referenz oder ihre Länge ändert. Reiner Lese-Cache, ändert nie ein Ergebnis.
let achRef: readonly string[] | null = null;
let achLen = -1;
let achSet: ReadonlySet<string> = new Set();
const masteredIdCache = new Map<string, string>();

function achievementUnlocked(state: GameState, id: string): boolean {
  const list = state.achievements;
  if (!Array.isArray(list) || list.length === 0) return false;
  if (list !== achRef || list.length !== achLen) {
    achRef = list;
    achLen = list.length;
    achSet = new Set(list);
  }
  return achSet.has(id);
}

/**
 * Hat der Spielstand diese Fertigkeit schon einmal gemeistert (Erfolg `ach_skill_<id>_99`, bleibt beim
 * Aufstieg)? Quelle von Handgedächtnis; auch für die UI (Altar/Narbenbuch-Hinweis „wirkt auf …").
 */
export function prestigeSkillMastered(state: GameState, skillId: SkillId): boolean {
  let id = masteredIdCache.get(skillId);
  if (id === undefined) {
    id = prestigeMasteredAchievementId(skillId);
    masteredIdCache.set(skillId, id);
  }
  return achievementUnlocked(state, id);
}

/**
 * XP-Faktor der Narbenbuch-Knoten für EINE Fertigkeits-XP-Vergabe (Lehrjahre + Handgedächtnis, additiv
 * untereinander, multiplikativ zu allen übrigen Faktoren). `xpBefore` = XP der Fertigkeit VOR der Vergabe;
 * maßgeblich ist die Stufe davor (Lehrjahre bis unter PRESTIGE_EARLY_XP_LEVEL_CAP, Handgedächtnis bis unter
 * PRESTIGE_MASTERED_XP_LEVEL_CAP, darüber — 200-Mio.-Erfolge — nie). Ohne Ränge exakt 1.
 * Leser: tick.ts (Skilling), combat.ts addXp, slayer.ts, farming.ts, hunting.ts, tavern.ts.
 */
export function prestigeSkillXpMult(state: GameState, content: ContentDB, skillId: SkillId, xpBefore: number): number {
  if (!state.talents) return 1;
  const early = talentEffect(state, content, "prestigeEarlyXp");
  const mastered = talentEffect(state, content, "prestigeMasteredXp");
  if (!(early > 0) && !(mastered > 0)) return 1;
  const level = levelFromXp(xpBefore);
  let bonus = 0;
  if (early > 0 && level < PRESTIGE_EARLY_XP_LEVEL_CAP) bonus += early;
  if (mastered > 0 && level < PRESTIGE_MASTERED_XP_LEVEL_CAP && prestigeSkillMastered(state, skillId)) bonus += mastered;
  return bonus > 0 ? 1 + bonus : 1;
}

/**
 * Gold-Einnahmen-Faktor (`goldFindPct`, Elsternauge): Aktionen, Kills, Dungeons, Quests, Jagd, Taverne.
 * NIE auf Verkaufspreise, Erstattungen oder die Erinnerung (Balance § 7/§ 8). Ohne Ränge exakt 1.
 */
export function goldFindMult(state: GameState, content: ContentDB): number {
  if (!state.talents) return 1;
  const g = talentEffect(state, content, "goldFindPct");
  return g > 0 ? 1 + g : 1;
}

/** Gold-Gutschrift mit Gold-Einnahmen-Faktor: ohne Ränge exakt `amount` (keine Rundung), sonst gerundet. */
export function applyGoldFind(state: GameState, content: ContentDB, amount: number): number {
  const mult = goldFindMult(state, content);
  return mult === 1 ? amount : Math.round(amount * mult);
}

/** Spielerschaden-Faktor (`damagePct`, Narbenfaust). computeStats + eigene DoT-Ticks/Dornen. Ohne Ränge 1. */
export function talentDamageMult(state: GameState, content: ContentDB): number {
  if (!state.talents) return 1;
  const d = talentEffect(state, content, "damagePct");
  return d > 0 ? 1 + d : 1;
}

/** Faktor auf maximales Leben (`maxHpPct`, Narbengewebe). Nur computeStats. Ohne Ränge 1. */
export function talentMaxHpMult(state: GameState, content: ContentDB): number {
  if (!state.talents) return 1;
  const h = talentEffect(state, content, "maxHpPct");
  return h > 0 ? 1 + h : 1;
}
