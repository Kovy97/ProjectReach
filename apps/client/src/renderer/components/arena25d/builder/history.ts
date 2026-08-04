/**
 * Scene-Builder — generischer Undo/Redo-Stack (Chef-Auftrag Punkt 4: "Undo/Redo ≥20 Schritte").
 * Bewusst reine Snapshot-Historie (kein Command-Pattern/Diffing) — die Zustandsgröße pro Snapshot
 * (ein Array aus `BuilderElement`, s. `elements.ts`) ist klein genug (auch bei 200+ Props im
 * niedrigen KB-Bereich), dass ein voller Klon pro Schritt einfacher UND weniger fehleranfällig ist
 * als ein Undo-fähiges Diff-Format — jede Aktion (Platzieren/Verschieben/Skalieren/Rotieren/
 * Flach-Toggle/Spiegeln/Löschen/Duplizieren) drückt einfach den VORHERIGEN Zustand auf den
 * Undo-Stack, bevor sie den neuen React-State setzt.
 */

const HISTORY_LIMIT = 50; // deutlich über der geforderten Mindesttiefe von 20

export interface HistoryStack<T> {
  undo: T[];
  redo: T[];
}

export function emptyHistory<T>(): HistoryStack<T> {
  return { undo: [], redo: [] };
}

/** Legt `prevState` auf den Undo-Stack (VOR dem Anwenden einer neuen Änderung aufzurufen) und leert
 *  den Redo-Stack (jede frische Aktion verwirft eine evtl. offene Redo-Kette — Standard-Editor-Verhalten). */
export function pushHistory<T>(stack: HistoryStack<T>, prevState: T): HistoryStack<T> {
  const undo = stack.undo.length >= HISTORY_LIMIT ? [...stack.undo.slice(1), prevState] : [...stack.undo, prevState];
  return { undo, redo: [] };
}

/** Pop vom Undo-Stack; `currentState` wandert auf den Redo-Stack. `null` wenn nichts rückgängig zu machen ist. */
export function undoStep<T>(stack: HistoryStack<T>, currentState: T): { next: HistoryStack<T>; state: T } | null {
  if (stack.undo.length === 0) return null;
  const state = stack.undo[stack.undo.length - 1]!;
  return { next: { undo: stack.undo.slice(0, -1), redo: [...stack.redo, currentState] }, state };
}

/** Pop vom Redo-Stack; `currentState` wandert zurück auf den Undo-Stack. `null` wenn nichts zu wiederholen ist. */
export function redoStep<T>(stack: HistoryStack<T>, currentState: T): { next: HistoryStack<T>; state: T } | null {
  if (stack.redo.length === 0) return null;
  const state = stack.redo[stack.redo.length - 1]!;
  return { next: { undo: [...stack.undo, currentState], redo: stack.redo.slice(0, -1) }, state };
}
