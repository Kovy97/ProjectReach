// claude:2026-10-23T18:45:00+02:00 — Ländereien (1.4.0 „Feder und Stahl“ LA, Chef 23.10.2026).
//
// Farming und Jagen laufen schon immer von selbst (Felder ernten und säen nach, Fallen legen neuen Köder aus),
// neben der Hauptaktion und offline. Diese reine Lese-Zusammenfassung speist die neue Seitenleisten-Gruppe
// „Ländereien“ und die Kopfzeile („Nebenbei: 6 Felder, 4 Fallen“), damit das auch sichtbar wird.
// Kein Spielstand, kein RNG, keine Mutation.
import type { ContentDB, GameState } from "@hearthforge/shared";
import { farmPlotsUnlocked, plotProgress } from "./farming"; // claude:2026-10-30T18:42:00+01:00 — 1.4.2: Beete/Fallen samt Narbenbuch
import { huntTrapSlots, huntTrapWaiting } from "./hunting";

export interface EstateStatus {
  /** Freigeschaltete Beete. */
  plotsUnlocked: number;
  /** Beete mit wachsender Saat. */
  plotsGrowing: number;
  /** Beete mit fertiger, nicht eingelagerter Ernte (Inventar/Lager blockiert). */
  plotsWaiting: number;
  /** Freigeschaltete, aber leere Beete (keine Saat oder nie bepflanzt). */
  plotsEmpty: number;
  /** Kürzeste Restzeit bis zur nächsten Ernte in ms, null ohne wachsendes Beet. */
  nextHarvestMs: number | null;
  /** Freigeschaltete Fallen. */
  trapsUnlocked: number;
  /** Laufende Fallen. */
  trapsRunning: number;
  /** Gestellte Fallen, die auf Köder warten. */
  trapsWaiting: number;
  /** Kürzeste Restzeit bis zum nächsten Fang in ms, null ohne laufende Falle. */
  nextCatchMs: number | null;
}

export function estateStatus(state: GameState, content: ContentDB): EstateStatus {
  const unlocked = farmPlotsUnlocked(state, content); // claude:2026-10-30T18:42:00+01:00 — 1.4.2 Saatkammer
  let growing = 0;
  let waiting = 0;
  let empty = 0;
  let nextHarvest: number | null = null;
  const plots = state.farmPlots ?? [];
  for (let i = 0; i < unlocked; i++) {
    const plot = plots[i];
    if (!plot) continue;
    const p = plotProgress(state, content, i);
    if (plot.readyYield > 0) waiting++;
    if (p.growing) {
      growing++;
      if (nextHarvest === null || p.remainingMs < nextHarvest) nextHarvest = p.remainingMs;
    } else if (plot.cropId === null && plot.readyYield <= 0) {
      empty++;
    }
  }
  const trapsUnlocked = huntTrapSlots(state, content); // claude:2026-10-30T18:42:00+01:00 — 1.4.2 Fallensteller
  let running = 0;
  let trapsWaiting = 0;
  let nextCatch: number | null = null;
  const traps = state.huntTraps ?? [];
  for (let i = 0; i < Math.min(trapsUnlocked, traps.length); i++) {
    const tr = traps[i]!;
    if (tr.zoneId === null) continue;
    if (huntTrapWaiting(tr)) {
      trapsWaiting++;
    } else {
      running++;
      if (nextCatch === null || tr.remainingMs < nextCatch) nextCatch = tr.remainingMs;
    }
  }
  return {
    plotsUnlocked: unlocked,
    plotsGrowing: growing,
    plotsWaiting: waiting,
    plotsEmpty: empty,
    nextHarvestMs: nextHarvest,
    trapsUnlocked,
    trapsRunning: running,
    trapsWaiting,
    nextCatchMs: nextCatch,
  };
}

/** Arbeiten Ländereien gerade (mindestens ein wachsendes Beet oder eine laufende Falle)? */
export function estatesActive(s: EstateStatus): boolean {
  return s.plotsGrowing > 0 || s.trapsRunning > 0;
}
