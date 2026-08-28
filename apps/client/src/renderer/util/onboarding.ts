/** Onboarding-Status (nur localStorage, kein Save-State). */
const KEY = "hf.onboardingDone";
const KEY_RANGED = "hf.seenRangedHint";
const KEY_MAGIC = "hf.seenMagicHint";
const KEY_KIT = "hf.seenKitHint";

/** Event, mit dem die Optionen das Tutorial erneut öffnen. */
export const ONBOARDING_OPEN_EVENT = "hf:onboarding-open";

export function isOnboardingDone(): boolean {
  return localStorage.getItem(KEY) === "1";
}

export function setOnboardingDone(): void {
  localStorage.setItem(KEY, "1");
}

/**
 * Setzt den Tutorial-Status zurück, sodass der New-Player-Guide erneut erscheint.
 * Wird bei der Erstellung eines NEUEN Charakters aufgerufen — sonst würde der einmal
 * gesetzte localStorage-Flag verhindern, dass ein frischer Spieler den Guide sieht.
 */
export function resetOnboarding(): void {
  localStorage.removeItem(KEY);
}

/** Öffnet das Tutorial erneut (vom Optionen-Button ausgelöst). */
export function reopenOnboarding(): void {
  window.dispatchEvent(new Event(ONBOARDING_OPEN_EVENT));
}

// ─── Waffen-Stil-Onboarding (einmalig pro Save-Slot in localStorage) ──────────

export function hasSeenRangedHint(): boolean {
  return localStorage.getItem(KEY_RANGED) === "1";
}
export function setSeenRangedHint(): void {
  localStorage.setItem(KEY_RANGED, "1");
}

export function hasSeenMagicHint(): boolean {
  return localStorage.getItem(KEY_MAGIC) === "1";
}
export function setSeenMagicHint(): void {
  localStorage.setItem(KEY_MAGIC, "1");
}

// ─── Ausrüstungs-Kits-Hinweis (Chef-Entscheid 28.08.2026, einmalig pro Save-Slot) ──────────

export function hasSeenKitHint(): boolean {
  return localStorage.getItem(KEY_KIT) === "1";
}
export function setSeenKitHint(): void {
  localStorage.setItem(KEY_KIT, "1");
}
