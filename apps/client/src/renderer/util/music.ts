/**
 * Hintergrundmusik: echter Loop-Track „Crown of Ashes" über ein HTMLAudioElement.
 * Steuerung (An/Aus + Lautstärke) persistent in localStorage, geregelt über die Optionen.
 * Standardmäßig AN; startet wegen Autoplay-Policy spätestens bei der ersten User-Geste.
 */
// Chef-Wechsel 2026-07-22: „The Knight Quiet Forest" ersetzt „Crown of Ashes" als Titelmusik.
// Quelle war ein 68-Min-Longplay (56 MB) — hier als 10-Min-Loop-Schnitt mit 4-s-Fade-out, 128 kbit
// (9,2 MB; Installer-Diät). Volle Länge liegt beim Chef in Downloads, falls je gewünscht.
import trackUrl from "../assets/audio/the_knight_quiet_forest.mp3?url";
import { isBackgroundSilenced, onBackgroundSilenceChange } from "./backgroundAudio";

const ENABLED_KEY = "hf.music.enabled";
const VOL_KEY = "hf.music.volume";

let audio: HTMLAudioElement | null = null;
let gestureHooked = false;
// claude:2026-10-25T10:30:00+01:00 — 1.4.1 A1: lief die Musik, als das Fenster in den Hintergrund ging
// (oder wollte sie dort starten)? Nur dann setzt die Rückkehr sie fort.
let resumeOnFocus = false;

// Default AN (nur explizit "0" = aus), damit neue Spieler die Musik direkt hören.
let enabled = localStorage.getItem(ENABLED_KEY) !== "0";
let volume = readVolume();

function readVolume(): number {
  // 1.0-Fix: Ohne gespeicherten Wert liefert getItem null, und Number(null) ist 0 —
  // der 0.5-Default war damit unerreichbar und jede frische Installation lief stumm.
  const stored = localStorage.getItem(VOL_KEY);
  if (stored === null) return 0.5;
  const raw = Number(stored);
  return Number.isFinite(raw) && raw >= 0 && raw <= 1 ? raw : 0.5;
}

function getAudio(): HTMLAudioElement {
  if (!audio) {
    audio = new Audio(trackUrl);
    audio.loop = true;
    audio.preload = "auto";
    audio.volume = volume;
  }
  return audio;
}

/**
 * Versucht abzuspielen; bei blockiertem Autoplay wird einmalig auf die erste User-Geste
 * gewartet (Klick/Taste) und dann erneut gestartet.
 */
function ensurePlay(): void {
  if (!enabled) return;
  // claude:2026-10-25T10:30:00+01:00 — 1.4.1 A1: im Hintergrund (Option an) nicht starten, sondern vormerken.
  if (isBackgroundSilenced()) {
    resumeOnFocus = true;
    return;
  }
  const a = getAudio();
  a.volume = volume;
  void a.play().catch(() => {
    if (gestureHooked) return;
    gestureHooked = true;
    const retry = (): void => {
      gestureHooked = false;
      window.removeEventListener("pointerdown", retry);
      window.removeEventListener("keydown", retry);
      if (!enabled) return;
      // claude:2026-10-25T10:30:00+01:00 — 1.4.1 A1: auch der Nachstart nach der Geste prüft den Hintergrund.
      if (isBackgroundSilenced()) {
        resumeOnFocus = true;
        return;
      }
      void getAudio().play().catch(() => undefined);
    };
    window.addEventListener("pointerdown", retry, { once: true });
    window.addEventListener("keydown", retry, { once: true });
  });
}

/** Startet/setzt die Musik fort (nur wenn aktiviert). */
export function startMusic(): void {
  if (!enabled) return;
  ensurePlay();
}

/** Pausiert die Musik (Position bleibt erhalten). */
export function stopMusic(): void {
  resumeOnFocus = false; // claude:2026-10-25T10:30:00+01:00 — A1: bewusst gestoppt, nicht beim Zurückkehren fortsetzen
  if (audio) audio.pause();
}

// claude:2026-10-25T10:30:00+01:00 — 1.4.1 A1: Fenster weg → pausieren (Position bleibt), Fenster zurück →
// nur fortsetzen, wenn sie vorher lief und der Spieler sie nicht ausgeschaltet hat.
onBackgroundSilenceChange((silenced) => {
  if (silenced) {
    if (audio && !audio.paused) {
      resumeOnFocus = true;
      audio.pause();
    }
    return;
  }
  if (!resumeOnFocus) return;
  resumeOnFocus = false;
  if (enabled) ensurePlay();
});

export function isMusicEnabled(): boolean {
  return enabled;
}

export function setMusicEnabled(value: boolean): void {
  enabled = value;
  localStorage.setItem(ENABLED_KEY, value ? "1" : "0");
  if (value) ensurePlay();
  else stopMusic();
}

export function getMusicVolume(): number {
  return volume;
}

export function setMusicVolume(value: number): void {
  volume = Math.max(0, Math.min(1, value));
  localStorage.setItem(VOL_KEY, String(volume));
  if (audio) audio.volume = volume;
  // Bei Lautstärke > 0 sicherstellen, dass die Musik (falls aktiviert) auch läuft.
  if (enabled && volume > 0) ensurePlay();
}
