import { getCombatFxLevel, type CombatFxLevel } from "./uiPrefs";

/**
 * Welle PP (Antizipation+Funkel-Momente: Mastery-/Achievement-Kurz-davor-Schimmer, Truhen-
 * Enthüllung, Inventar-„NEU"-Funkel, Bestiarium-/Wiki-Erstfund-Flip): EINE geteilte Gate-Funktion
 * für "spielt der Effekt gerade eine Animation, oder bleibt er statisch?" — derselbe Options-
 * Toggle wie Kampf-Effekte (CombatPage.tsx `fxLevel`) und der Toast-Jackpot-Look (Toasts.tsx
 * `effectiveFxLevel`). Anders als Toasts.tsx (dort bewusst dupliziert, weil dieser einzelne
 * Konsument unabhängig vom Battle-Mount lebt) hier zentral geteilt, weil mehrere unabhängige
 * Komponenten (MasteryPage, AchievementsPage, DungeonClearCeremony, BestiaryPage, ItemCell)
 * exakt denselben Gate-Check brauchen — eine 5-fache Kopie derselben 4 Zeilen wäre reine
 * Redundanz ohne den Unabhängigkeits-Vorteil, den Toasts.tsx für sich in Anspruch nimmt.
 *
 * `prefers-reduced-motion` (OS-Einstellung) übersteuert IMMER zusätzlich auf "off", unabhängig
 * vom gespeicherten Options-Wert.
 */
export function effectiveFxLevel(): CombatFxLevel {
  if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
    return "off";
  }
  return getCombatFxLevel();
}
