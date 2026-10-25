/**
 * claude:2026-10-25T10:30:00+01:00 — 1.4.1 A1 „Im Hintergrund stumm“ (Spieler-Wunsch).
 *
 * Option (Vorgabe AUS): Verliert das Fenster den Fokus oder wird es minimiert (Alt-Tab), schweigen
 * Musik und Effekte; beim Zurückkehren läuft die Musik weiter, sofern sie vorher lief und der Spieler
 * sie nicht selbst ausgeschaltet hat. Reine Renderer-Logik über `window` blur/focus und
 * `document.visibilitychange`, kein Eingriff in den Electron-Main-Prozess.
 *
 * Diese Datei kennt weder music.ts noch audio.ts (keine Zirkel): sie hält nur Vorliebe + Fensterzustand
 * und meldet Wechsel des Ergebnisses „jetzt still?“ an Abonnenten. music.ts pausiert/setzt fort,
 * audio.ts unterdrückt neue Effekte und stoppt laufende.
 *
 * Gespeichert im `localStorage` nach dem Muster von audio.ts (`hf.audio.*`, "1"/"0").
 */

const PREF_KEY = "hf.audio.muteInBackground";

function readPref(): boolean {
  try {
    return localStorage.getItem(PREF_KEY) === "1";
  } catch {
    return false;
  }
}

let pref = readPref();
let backgrounded = false;
let installed = false;
let lastSilenced = false;
const listeners = new Set<(silenced: boolean) => void>();

/** Ist die Option „Im Hintergrund stumm“ eingeschaltet? */
export function isMuteInBackground(): boolean {
  return pref;
}

/** Option setzen und speichern; wirkt sofort (auch falls das Fenster gerade im Hintergrund ist). */
export function setMuteInBackground(on: boolean): void {
  pref = on;
  try {
    localStorage.setItem(PREF_KEY, on ? "1" : "0");
  } catch {
    /* nicht speicherbar — gilt dann nur für diese Sitzung */
  }
  emit();
}

/** Sollen Musik und Effekte gerade schweigen (Option an UND Fenster im Hintergrund)? */
export function isBackgroundSilenced(): boolean {
  return pref && backgrounded;
}

/** Abonniert Wechsel von `isBackgroundSilenced()`. Gibt die Abmeldung zurück. */
export function onBackgroundSilenceChange(fn: (silenced: boolean) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function emit(): void {
  const now = isBackgroundSilenced();
  if (now === lastSilenced) return;
  lastSilenced = now;
  for (const fn of listeners) fn(now);
}

function setBackgrounded(bg: boolean): void {
  backgrounded = bg;
  emit();
}

/**
 * Einmal beim Start (main.tsx). Startzustand nur aus `visibilityState`, NICHT aus `hasFocus()`:
 * ein Fenster, das beim Skriptstart noch nicht fokussiert ist, bekäme sonst nie Musik, falls kein
 * `focus`-Ereignis mehr folgt. Jede Eingabe (Zeiger/Taste) gilt zusätzlich als „im Vordergrund“.
 */
export function initBackgroundAudio(): void {
  if (installed || typeof window === "undefined" || typeof document === "undefined") return;
  installed = true;
  backgrounded = document.visibilityState === "hidden";
  lastSilenced = isBackgroundSilenced();
  window.addEventListener("blur", () => setBackgrounded(true));
  window.addEventListener("focus", () => setBackgrounded(document.visibilityState === "hidden"));
  document.addEventListener("visibilitychange", () =>
    setBackgrounded(document.visibilityState === "hidden" || !document.hasFocus()),
  );
  const foreground = (): void => {
    if (backgrounded && document.visibilityState !== "hidden") setBackgrounded(false);
  };
  window.addEventListener("pointerdown", foreground, { capture: true });
  window.addEventListener("keydown", foreground, { capture: true });
}
