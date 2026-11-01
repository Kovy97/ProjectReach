import type { ActionId, ContentDB, GameState, SkillId } from "@hearthforge/shared";
import {
  MASTERY_MAX_LEVEL,
  MASTERY_POOL_REFERENCE_LEVEL,
  masteryDoubleChance,
  masteryPreserveChance,
  masterySpeedMult,
  masteryXpPerCompletion,
  poolCheckpointBonus,
} from "@hearthforge/shared";
import { levelFromXp, xpForLevel } from "./leveling";

/**
 * claude:2026-10-30T22:28:00+01:00 — Belohnungsladen 1.4.2 „Meisterlehre“: Meisterschafts-XP, die `minutes` Minuten der Aktion
 * `actionId` brächten. Abschlüsse = ⌊Minuten ÷ `effDurMs`⌋ (mindestens 1), je Abschluss `masteryXpPerCompletion` beim Level VOR
 * dem Abschluss (wie tick.ts, inkl. Untergrenze ab Meisterschaft 50) × `mult` (Talent Meisterglut, ohne Rang 1). Gekappt auf die
 * XP für `MASTERY_MAX_LEVEL`; am Deckel 0. Rein, kein RNG; rechnet stufenweise statt je Abschluss (höchstens ~99 Schritte).
 */
export function masteryLessonXp(
  state: GameState,
  content: ContentDB,
  actionId: ActionId,
  minutes: number,
  effDurMs: number,
  mult = 1,
): number {
  const action = content.actions[actionId];
  if (!action || !(action.durationMs > 0) || !(minutes > 0)) return 0;
  const start = Math.max(0, state.mastery[actionId]?.xp ?? 0);
  const cap = xpForLevel(MASTERY_MAX_LEVEL);
  if (start >= cap) return 0;
  const m = Number.isFinite(mult) && mult > 0 ? mult : 1;
  let runs = Math.max(1, Math.floor((minutes * 60_000) / Math.max(1, Number.isFinite(effDurMs) ? effDurMs : action.durationMs)));
  let xp = start;
  while (runs > 0 && xp < cap) {
    const level = levelFromXp(xp);
    const per = masteryXpPerCompletion(action, level) * m;
    if (!(per > 0)) break;
    // So viele Abschlüsse auf diesem Level, bis das nächste erreicht ist (der letzte zählt noch zum alten Level, wie im Tick).
    const next = level >= MASTERY_MAX_LEVEL ? cap : xpForLevel(level + 1);
    const n = Math.min(runs, Math.max(1, Math.ceil((next - xp) / per)));
    xp += n * per;
    runs -= n;
  }
  return Math.max(0, Math.min(cap, xp) - start);
}

/** claude:2026-10-30T22:28:00+01:00 — Schreibt `masteryLessonXp` gut. Gibt die gutgeschriebene Meisterschafts-XP zurück (0 = nichts). */
export function grantMasteryLesson(
  state: GameState,
  content: ContentDB,
  actionId: ActionId,
  minutes: number,
  effDurMs: number,
  mult = 1,
): number {
  const gain = masteryLessonXp(state, content, actionId, minutes, effDurMs, mult);
  if (!(gain > 0)) return 0;
  const entry = (state.mastery[actionId] ??= { xp: 0 });
  entry.xp += gain;
  return gain;
}

/** Aktuelles Mastery-Level einer Aktion (0 XP → Level 1). */
export function masteryLevel(state: GameState, actionId: ActionId): number {
  return levelFromXp(state.mastery[actionId]?.xp ?? 0);
}

/** Fortschritt innerhalb des aktuellen Mastery-Levels (0..1) für UI-Balken. */
export function masteryProgress(state: GameState, actionId: ActionId): number {
  const xp = state.mastery[actionId]?.xp ?? 0;
  const lvl = levelFromXp(xp);
  const start = xpForLevel(lvl);
  const end = xpForLevel(lvl + 1);
  return end > start ? (xp - start) / (end - start) : 0;
}

/** Doppel-Ertrag-Chance der Aktion beim aktuellen Mastery-Level. */
export function masteryBonusChance(state: GameState, actionId: ActionId): number {
  return masteryDoubleChance(masteryLevel(state, actionId));
}

/** Dauer-Multiplikator (≤1 = schneller) der Aktion beim aktuellen Mastery-Level. */
export function masterySpeedFor(state: GameState, actionId: ActionId): number {
  return masterySpeedMult(masteryLevel(state, actionId));
}

/** Preservation-Chance (Materialien sparen) der Aktion beim aktuellen Mastery-Level. */
export function masteryPreserveFor(state: GameState, actionId: ActionId): number {
  return masteryPreserveChance(masteryLevel(state, actionId));
}

/**
 * TRANSIENTER Content-Index (PERF, Offline-Catch-up 2026-07-22): Aktions-IDs je Skill.
 * `masteryPoolXp`/`masteryPoolCapacity` liefen vorher pro Aufruf über ALLE content.actions
 * (~760) — und `masteryPoolBonus` läuft mindestens 1× PRO TICK (effectiveActionDurationMs)
 * plus je Aktions-Abschluss. Das war mit ~20 µs/Aufruf der größte Einzel-Kostentreiber der
 * 8-h-Offline-Aufholung (288k Ticks).
 *
 * Der Index ist eine reine CONTENT-Funktion (kein State, NIE im Save): ContentDB wird nach dem
 * Build nur noch in Locale-Textfeldern angefasst (applyContentLocales, einmalig) — die
 * `action.skill`-Zuordnung ist zur Laufzeit unveränderlich. WeakMap auf die ContentDB-Identität:
 * ein (theoretisch) anderer Content-DB-Wert bekommt automatisch seinen eigenen Index.
 *
 * DETERMINISMUS/ERGEBNIS-IDENTITÄT: die Liste wird in exakt der `Object.values(content.actions)`-
 * Reihenfolge aufgebaut (filter erhält die Ordnung) → die Float-Summation in `masteryPoolXp`
 * läuft in identischer Reihenfolge über identische Summanden = bit-identisches Ergebnis.
 */
const actionIdsBySkillCache = new WeakMap<ContentDB, Map<SkillId, ActionId[]>>();

function actionIdsForSkill(content: ContentDB, skill: SkillId): ActionId[] {
  let bySkill = actionIdsBySkillCache.get(content);
  if (!bySkill) {
    bySkill = new Map();
    actionIdsBySkillCache.set(content, bySkill);
  }
  let list = bySkill.get(skill);
  if (list === undefined) {
    list = [];
    for (const action of Object.values(content.actions)) {
      if (action.skill === skill) list.push(action.id);
    }
    bySkill.set(skill, list);
  }
  return list;
}

/**
 * Maximale aggregierte Mastery-XP eines Skills: Σ über alle seine Aktionen von der XP
 * für das Referenz-Mastery-Level (MASTERY_POOL_REFERENCE_LEVEL). „Durchschnittlich dieses
 * Level über alle Aktionen" = voller Pool. Bewusst NICHT an L99 gehängt, sonst ist schon der
 * 1. Checkpoint im Frühgame faktisch unerreichbar (s. shared-Kommentar). Aus Content — kein State.
 * PERF: `n × perAction` statt n-facher Addition — `perAction` ist ganzzahlig (Math.floor in
 * xpForLevel-Tabelle), Integer-Multiplikation ist exakt ⇒ bit-identisch zur früheren Schleife.
 */
export function masteryPoolCapacity(content: ContentDB, skill: SkillId): number {
  const perAction = xpForLevel(MASTERY_POOL_REFERENCE_LEVEL);
  return actionIdsForSkill(content, skill).length * perAction;
}

/** Aktuell im Pool eines Skills aggregierte Mastery-XP (Σ über alle seine Aktionen). */
export function masteryPoolXp(state: GameState, content: ContentDB, skill: SkillId): number {
  let sum = 0;
  for (const id of actionIdsForSkill(content, skill)) {
    sum += state.mastery[id]?.xp ?? 0;
  }
  return sum;
}

/** Füllstand des Mastery-Pools eines Skills (0..1). */
export function masteryPoolPct(state: GameState, content: ContentDB, skill: SkillId): number {
  const cap = masteryPoolCapacity(content, skill);
  if (cap <= 0) return 0;
  return Math.min(1, masteryPoolXp(state, content, skill) / cap);
}

/** Skillweite Checkpoint-Boni aus dem aktuellen Pool-Füllstand. */
export function masteryPoolBonus(
  state: GameState,
  content: ContentDB,
  skill: SkillId,
): { double: number; speed: number; preserve: number } {
  return poolCheckpointBonus(masteryPoolPct(state, content, skill));
}
