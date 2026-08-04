/**
 * Minimaler Toast-Bus für UI-INITIIERTE Meldungen ohne Engine-Breadcrumb (Fix #368-7,
 * Bot-Sweep #367: „Bau abbrechen und erstatten" gab sichtbar KEINE Rückmeldung — bei vollem
 * Inventar landete das erstattete Material sogar still in Bank/Post, ohne dass der Spieler es
 * bemerkte).
 *
 * Toasts.tsx besitzt den einzigen Toast-Stack der App und hängt tief im Baum (App.tsx); alle
 * bestehenden Toasts entstehen dort aus einem Tick-Diff gegen `state` (Breadcrumbs wie
 * `camp.lastCompletedBuild`, s. dortiges JSDoc). Ein SOFORTIGER Klick-Effekt wie "Bau
 * abgebrochen" braucht aber keinen neuen Breadcrumb im shared-State (das wäre packages/shared,
 * außerhalb des UI-Reviers) — die Seite weiß im Moment des Klicks bereits genau, was passiert
 * ist. Muster wie util/escStack.ts: eine registrierende Senke (Toasts.tsx meldet ihre
 * Push-Funktion einmalig beim Mount an), beliebig viele Aufrufer (Seiten rufen `pushUiToast`
 * direkt aus einem onClick/onConfirm-Handler).
 */
export interface UiToastPayload {
  icon: string;
  /** PNG-URL, hat Vorrang vor dem emoji `icon` — s. Toasts.tsx-Rendering (`toast.iconUrl ?? toast.icon`). */
  iconUrl?: string | null;
  title: string;
  detail: string;
  durationMs?: number;
}

type ToastSink = (toast: UiToastPayload) => void;

let sink: ToastSink | null = null;

/** Toasts.tsx registriert sich hier EINMAL beim Mount (`useEffect`, leeres Dep-Array). */
export function registerUiToastSink(fn: ToastSink): () => void {
  sink = fn;
  return () => {
    if (sink === fn) sink = null;
  };
}

/**
 * Von jeder Seite aus direkt aufrufbar. No-op, falls Toasts.tsx (noch) nicht gemountet ist —
 * kommt in der echten App nie vor (App.tsx montiert sie immer), macht die Funktion aber auch aus
 * Tests/Sonderfällen heraus sicher aufrufbar.
 */
export function pushUiToast(toast: UiToastPayload): void {
  sink?.(toast);
}
