import { workOrderProgress } from "@hearthforge/engine";
import type { GameState } from "@hearthforge/shared";

/**
 * claude:2026-10-31T16:34:28+01:00 — Desktop-Benachrichtigungen (1.4.2): reine Zustands-Diff-Logik, ohne React und ohne Electron,
 * damit sie sich mit gefälschten Zuständen testen lässt. Die Komponente `DesktopNotifier` ruft `diffNotifications` je Tick und
 * schickt die Treffer über die Brücke `window.hearthforge.notify`.
 */
export type NotifyKind = "died" | "queueDone" | "slayerDone" | "orderDone";

export interface NotifySnapshot {
  deaths: number;
  slayerDone: number;
  /** Lief in der Sitzung eine Warteschlange, die noch nicht leer gelaufen ist? */
  queueTouched: boolean;
  wasBusy: boolean;
  /** Großaufträge (Stufe 3), die schon abgabebereit waren. */
  readyBigOrders: number[];
}

/** Mindestabstand je Art, damit dasselbe nie mehrfach pro Minute gemeldet wird. */
export const NOTIFY_MIN_GAP_MS = 60_000;

function isBusy(state: GameState): boolean {
  return state.activeActionId !== null || state.combat.monsterId !== null || !!state.combat.dungeonId;
}

export function takeSnapshot(state: GameState, prev?: NotifySnapshot): NotifySnapshot {
  const busy = isBusy(state);
  const queueLen = state.actionQueue?.length ?? 0;
  const ready: number[] = [];
  for (const order of state.workOrders?.open ?? []) {
    if (order.tier === 3 && workOrderProgress(state, order).ready) ready.push(order.id);
  }
  return {
    deaths: state.stats.deaths,
    slayerDone: (state.slayerTasksCompleted as number | undefined) ?? 0,
    // Eine Warteschlange gilt als "im Lauf", sobald ein Eintrag wartet; sie bleibt es, bis wieder Stillstand herrscht.
    queueTouched: queueLen > 0 || (!!prev?.queueTouched && busy),
    wasBusy: busy,
    readyBigOrders: ready,
  };
}

/** Welche Ereignisse sind seit `prev` eingetreten? (Tod schluckt "Warteschlange leer": der Stillstand kommt vom Tod.) */
export function diffNotifications(prev: NotifySnapshot, state: GameState): { kinds: NotifyKind[]; next: NotifySnapshot } {
  const next = takeSnapshot(state, prev);
  const kinds: NotifyKind[] = [];
  const died = next.deaths > prev.deaths;
  if (died) kinds.push("died");
  if (next.slayerDone > prev.slayerDone) kinds.push("slayerDone");
  if (!died && prev.queueTouched && prev.wasBusy && !next.wasBusy && (state.actionQueue?.length ?? 0) === 0) kinds.push("queueDone");
  if (next.readyBigOrders.some((id) => !prev.readyBigOrders.includes(id))) kinds.push("orderDone");
  // Nach einem Stillstand ist die Warteschlange abgearbeitet (oder bewusst gestoppt): Markierung zurücksetzen.
  if (!next.wasBusy) next.queueTouched = false;
  return { kinds, next };
}

/** Drosselung je Art. `last` wird mutiert. */
export function throttleKinds(kinds: NotifyKind[], last: Partial<Record<NotifyKind, number>>, nowMs: number): NotifyKind[] {
  const out: NotifyKind[] = [];
  for (const k of kinds) {
    const at = last[k];
    if (at !== undefined && nowMs - at < NOTIFY_MIN_GAP_MS) continue;
    last[k] = nowMs;
    out.push(k);
  }
  return out;
}
