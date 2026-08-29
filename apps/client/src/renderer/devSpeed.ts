/**
 * Zeitraffer für Entwickler (Chef-Wunsch 29.08.2026: „einen Knopf/Slider, der die Tick-Geschwindigkeit
 * erhöht, um schneller zu progressen — das würde Testen vereinfachen").
 *
 * BEWUSST als winziges Modul mit Modul-State statt als React-Context: der Faktor wird im
 * Animations-Loop (`GameContext.tsx`) bei JEDEM Frame gelesen, ein Context-Update pro Frame wäre
 * unnötige Render-Last. Der Loop liest, das Bedienfeld schreibt — mehr braucht es nicht.
 *
 * SICHERHEIT: Der Faktor wirkt NUR, wenn der Dev-Modus aktiv ist (ungepackte App oder
 * `GR_DEVTOOLS=1`, s. main/characterExport.ts `devToolsAllowed`). Das Gate wird an ZWEI Stellen
 * geprüft — beim Freischalten hier und beim Anwenden im Loop —, damit ein ausgeliefertes Spiel den
 * Zeitraffer selbst dann nicht ausführt, wenn jemand über die Konsole an das Modul käme.
 * Ohne Freischaltung liefert `getDevSpeed()` immer exakt 1.
 */

/** Erlaubte Stufen. Bewusst diskret statt stufenlos: reproduzierbare Testläufe, klare Anzeige. */
export const DEV_SPEED_STEPS = [1, 2, 5, 10, 25, 50, 100] as const;

let allowed = false;
let factor = 1;
const listeners = new Set<() => void>();

/** Vom Bedienfeld aufgerufen, sobald `app:devToolsAllowed` geantwortet hat. */
export function setDevSpeedAllowed(value: boolean): void {
  allowed = value;
  if (!allowed && factor !== 1) {
    factor = 1;
    for (const l of listeners) l();
  }
}

export function isDevSpeedAllowed(): boolean {
  return allowed;
}

/**
 * Faktor für den Simulations-Zeitschritt. Ohne Dev-Modus IMMER 1 — das ist die zweite Sperre.
 * Der Loop multipliziert damit sein `simulationDt`; die Engine sieht schlicht ein größeres
 * Zeitfenster, exakt wie beim Offline-Aufholen (derselbe Pfad, dieselben Determinismus-Garantien).
 */
export function getDevSpeed(): number {
  return allowed ? factor : 1;
}

export function setDevSpeed(value: number): void {
  if (!allowed) return;
  const next = DEV_SPEED_STEPS.includes(value as (typeof DEV_SPEED_STEPS)[number]) ? value : 1;
  if (next === factor) return;
  factor = next;
  for (const l of listeners) l();
}

/** Abonnement für das Bedienfeld (useSyncExternalStore-tauglich). */
export function subscribeDevSpeed(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
