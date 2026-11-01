import { advance, levelFromXp } from "@hearthforge/engine";
import type { HuntCatchTally } from "@hearthforge/engine";
import type { ContentDB, GameState, OfflineSummary, PetId } from "@hearthforge/shared";
import { TICK_MS } from "@hearthforge/shared";

/**
 * claude:2026-10-31T16:34:28+01:00 — Rückkehr aus dem Hintergrund in Häppchen (1.4.2).
 *
 * Kam das Fenster nach Minimieren oder Ruhezustand mit einem großen Zeitsprung zurück, rechnete der Spielloop das ganze
 * Fenster in EINEM `advance`-Aufruf (bis zu 11 h, knapp 400 000 Ticks) und fror die Oberfläche ein, ohne Bericht. Jetzt
 * schneidet dieser Auftrag den Rückstand in Häppchen von etwa 10 Minuten Spielzeit, eines je Frame.
 *
 * Determinismus: die Tickfolge bleibt dieselbe (`advance` trägt den Rest in `state.accumulatorMs` weiter). Der Kalender-
 * anker `nowMs` wird je Häppchen so gesetzt, dass Tick i genau bei `wallStartMs + i * TICK_MS` liegt wie im Einzelaufruf
 * (Segen, Beete und Ereignisse sehen dieselben Tage).
 */

/** Ab diesem Rückstand wird in Häppchen nachgeholt und der Bericht gezeigt. */
export const CATCHUP_THRESHOLD_MS = 5 * 60_000;
/** Startgröße und Grenzen eines Häppchens in Spielzeit. */
export const CATCHUP_CHUNK_MS = 10 * 60_000;
const CHUNK_MIN_MS = 60_000;
const CHUNK_MAX_MS = 30 * 60_000;
/** Zielzeit je Frame für ein Häppchen (ms Echtzeit); darüber wird das nächste kleiner, darunter größer. */
const FRAME_TARGET_MS = 40;

export interface CatchUpSnapshot {
  gold: number;
  xp: number;
  items: Record<string, number>;
  skillXp: Record<string, number>;
  deaths: number;
  kills: number;
  activeActionId: string | null;
  monsterId: string | null;
  dungeonId: string | null;
  encounterIndex: number;
  pets: Record<string, true>;
  achievements: number;
  stopReason: string | null;
  harvest: Record<string, number>;
}

export interface CatchUpJob {
  state: GameState;
  /** Gesamter Rückstand dieses Auftrags (wächst um die Echtzeit, die das Nachholen selbst braucht). */
  totalMs: number;
  doneMs: number;
  /** Ticks seit Auftragsbeginn (für den Kalenderanker). */
  ticksDone: number;
  /** Kalenderzeit (Epoch ms) am Anfang des Rückstands. */
  wallStartMs: number;
  chunkMs: number;
  before: CatchUpSnapshot;
  huntTally: HuntCatchTally;
}

function totalXp(state: GameState): number {
  let sum = 0;
  for (const skill of Object.values(state.skills)) sum += skill?.xp ?? 0;
  return sum;
}

function itemCounts(state: GameState): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const slot of state.inventory.slots) if (slot) counts[slot.itemId] = (counts[slot.itemId] ?? 0) + slot.qty;
  for (const [id, qty] of Object.entries(state.bank)) if (qty > 0) counts[id] = (counts[id] ?? 0) + qty;
  for (const inst of state.bankInstances) if (inst?.baseItemId) counts[inst.baseItemId] = (counts[inst.baseItemId] ?? 0) + 1;
  for (const inst of state.inventory.instances) if (inst?.baseItemId) counts[inst.baseItemId] = (counts[inst.baseItemId] ?? 0) + 1;
  return counts;
}

export function snapshotForSummary(state: GameState, content: ContentDB): CatchUpSnapshot {
  const skillXp: Record<string, number> = {};
  for (const [id, s] of Object.entries(state.skills)) skillXp[id] = s?.xp ?? 0;
  const harvest: Record<string, number> = {};
  for (const crop of Object.values(content.crops ?? {})) harvest[crop.yieldItem] = state.stats.harvestedById?.[crop.yieldItem] ?? 0;
  return {
    gold: state.character.gold,
    xp: totalXp(state),
    items: itemCounts(state),
    skillXp,
    deaths: state.stats.deaths,
    kills: state.stats.kills,
    activeActionId: state.activeActionId,
    monsterId: state.combat.monsterId,
    dungeonId: state.combat.dungeonId,
    encounterIndex: state.combat.encounterIndex,
    pets: { ...state.character.ownedPets },
    achievements: state.achievements.length,
    stopReason: state.combat.stopReason ?? null,
    harvest,
  };
}

export function startCatchUp(state: GameState, content: ContentDB, totalMs: number, nowMs: number): CatchUpJob {
  return {
    state,
    totalMs,
    doneMs: 0,
    ticksDone: 0,
    wallStartMs: nowMs - totalMs,
    chunkMs: CATCHUP_CHUNK_MS,
    before: snapshotForSummary(state, content),
    huntTally: {},
  };
}

/** Echtzeit, die während des Nachholens verstreicht, hängt hinten an (sonst bliebe immer ein neuer Rest). */
export function extendCatchUp(job: CatchUpJob, ms: number): void {
  if (Number.isFinite(ms) && ms > 0) job.totalMs += ms;
}

export function catchUpDone(job: CatchUpJob): boolean {
  return job.doneMs >= job.totalMs;
}

/** Kalenderzeit, bis zu der der State bisher nachgerechnet ist: sie gehört als `savedAt` in jedes Zwischen-Save. */
export function catchUpSavedAt(job: CatchUpJob): number {
  return job.wallStartMs + job.doneMs;
}

/** Rechnet EIN Häppchen und gibt true zurück, wenn der Rückstand damit aufgeholt ist. `clock` liefert Echtzeit-ms (testbar). */
export function stepCatchUp(job: CatchUpJob, content: ContentDB, clock: () => number = () => performance.now()): boolean {
  const remaining = job.totalMs - job.doneMs;
  if (remaining <= 0) return true;
  const dt = Math.min(job.chunkMs, remaining);
  const t0 = clock();
  // Tick i liegt bei wallStart + i * TICK_MS wie im Einzelaufruf: der Anker ist der Häppchen-ANFANG plus dessen Länge.
  const chunkStart = job.wallStartMs + job.ticksDone * TICK_MS;
  const ticks = advance(job.state, content, dt, { nowMs: chunkStart + dt, huntTally: job.huntTally });
  job.ticksDone += ticks;
  job.doneMs += dt;
  const spent = Math.max(1, clock() - t0);
  const scaled = Math.round(job.chunkMs * Math.min(2, Math.max(0.5, FRAME_TARGET_MS / spent)));
  job.chunkMs = Math.min(CHUNK_MAX_MS, Math.max(CHUNK_MIN_MS, scaled));
  return job.doneMs >= job.totalMs;
}

/** Bericht für die Rückkehr-Karte, gleiche Form wie die Lade-Zusammenfassung (ohne Lager-Sonderfelder). */
export function buildCatchUpSummary(job: CatchUpJob, content: ContentDB): OfflineSummary {
  const { state, before } = job;
  const after = itemCounts(state);
  const items: Record<string, number> = {};
  for (const [id, qty] of Object.entries(after)) {
    const gained = qty - (before.items[id] ?? 0);
    if (gained > 0) items[id] = gained;
  }
  const skillXp: Record<string, { xp: number; levels: number }> = {};
  for (const [id, s] of Object.entries(state.skills)) {
    const was = before.skillXp[id] ?? 0;
    const now = s?.xp ?? 0;
    if (now - was > 0) skillXp[id] = { xp: now - was, levels: levelFromXp(now) - levelFromXp(was) };
  }
  const summary: OfflineSummary = {
    ms: job.totalMs,
    gold: state.character.gold - before.gold,
    xp: totalXp(state) - before.xp,
    items,
    skillXp,
  };
  const kills = Math.max(0, state.stats.kills - before.kills);
  if (kills > 0) summary.kills = kills;
  const deaths = Math.max(0, state.stats.deaths - before.deaths);
  if (deaths > 0) {
    let diedAgainst = before.monsterId;
    if (before.dungeonId) {
      const dungeon = content.dungeons.find((d) => d.id === before.dungeonId);
      diedAgainst = dungeon?.encounters[before.encounterIndex + kills] ?? before.monsterId;
    }
    summary.deaths = deaths;
    summary.diedAgainst = diedAgainst;
  }
  const stop = state.combat.stopReason ?? null;
  if (stop && stop !== before.stopReason) {
    summary.combatStopped = true;
    summary.combatStopReason = stop;
  }
  const petDrops = Object.keys(state.character.ownedPets).filter((id) => !before.pets[id]);
  if (petDrops.length > 0) summary.petDrops = petDrops as PetId[];
  const achievementIds = state.achievements.slice(before.achievements);
  if (achievementIds.length > 0) {
    summary.achievementsEarned = achievementIds.length;
    summary.achievementIds = achievementIds;
  }
  const huntCatches = Object.entries(job.huntTally)
    .filter(([, n]) => n > 0)
    .map(([monsterId, count]) => ({ monsterId, count }));
  if (huntCatches.length > 0) summary.huntCatches = huntCatches;
  const farmHarvests = Object.entries(before.harvest)
    .map(([itemId, was]) => ({ itemId, qty: (state.stats.harvestedById?.[itemId] ?? 0) - was }))
    .filter((h) => h.qty > 0);
  if (farmHarvests.length > 0) summary.farmHarvests = farmHarvests;
  return summary;
}
