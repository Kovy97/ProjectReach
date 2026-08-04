import type { GameState } from "@hearthforge/shared";
import { newGameOnboarding } from "@hearthforge/shared";

// ───────────────────────────────────────────────────────────────────────────
// Onboarding-Guide — Zustands-API (Contract für ui-dev).
//
// Der geführte Tutorial-Flow wird komplett von der UI getrieben: die UI hält die Schritt-Registry
// (welches DOM-Element/Erklärtext je Schritt), die Engine hält nur den minimalen Fortschritt in
// `state.onboarding` (`OnboardingState`: { active, step, done, toursSeen }). Die Bereichs-
// Erst-Touren (SAVE 62) schreiben ihre Keys direkt in `toursSeen` — kein eigenes Verb nötig.
//
// Diese drei Verben sind die EINZIGE Art, wie sich der Onboarding-Zustand nach der Charakter-
// erstellung ändert. Sie sind rein & deterministisch (kein RNG, kein Content, kein I/O), mutieren
// `state` in-place und geben ihn zur Verkettung zurück. `createGame` setzt den Startzustand
// (neuer Save → aktiver Guide ab Schritt 0); die Persistenz-Migration setzt Alt-Saves auf
// „erledigt" (siehe `legacyOnboarding`). Die Engine ruft diese Verben NIE selbst im Tick auf.
// ───────────────────────────────────────────────────────────────────────────

/**
 * Schaltet den Guide einen Schritt weiter (`step++`). Ruft die UI auf, sobald der Spieler die
 * geforderte Aktion des aktuellen Schritts erfüllt / „Weiter" drückt. Kein Auto-Ende: das Ende
 * bestimmt die UI anhand ihrer Registry und ruft dann `finishGuide`.
 */
export function advanceGuide(state: GameState): GameState {
  state.onboarding.step += 1;
  return state;
}

/**
 * Beendet den Guide: `active=false`, `done=true`. Für regulären Abschluss am letzten Schritt UND
 * für „Überspringen". `done=true` unterdrückt den erneuten Auto-Start; `step` bleibt stehen und
 * wird beim nächsten `restartGuide` zurückgesetzt.
 */
export function finishGuide(state: GameState): GameState {
  state.onboarding.active = false;
  state.onboarding.done = true;
  return state;
}

/**
 * Startet den Guide neu (Options-Menü-Button): `{ active:true, step:0, done:false, toursSeen:{} }`.
 * Setzt den Fortschritt vollständig zurück — INKLUSIVE der Bereichs-Erst-Touren („Tutorial neu
 * starten" heißt alles nochmal), sodass der Spieler den Flow erneut von vorn durchläuft.
 */
export function restartGuide(state: GameState): GameState {
  state.onboarding = newGameOnboarding();
  return state;
}
