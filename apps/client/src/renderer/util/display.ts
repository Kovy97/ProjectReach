/**
 * Vollbild-/Fenster-Steuerung. Spricht die Electron-Bridge (main/window.ts) an und
 * merkt sich die Präferenz in localStorage (für die Optionen-Anzeige).
 * Chef 2026-07-12: Das Spiel LAUNCHT IMMER als Fenster mit exakt 1920×1080 Renderfläche
 * (main/index.ts) — es gibt KEINEN Vollbild-Autostart mehr; Vollbild ist eine manuelle
 * Session-Wahl (F11/Optionen).
 */
const bridge = window.hearthforge?.win;
const KEY = "hf.fullscreen";

/** true = Vollbild bevorzugt (Default: false — Launch ist das exakte 1080p-Fenster). */
export function isFullscreenPref(): boolean {
  return localStorage.getItem(KEY) === "1";
}

/** Tatsächlicher Vollbild-Zustand des Fensters (oder die Präferenz im Web-Build). */
export async function getFullscreen(): Promise<boolean> {
  if (bridge) return bridge.getFullscreen();
  return isFullscreenPref();
}

/** Persistiert nur die Präferenz (ohne das Fenster zu schalten) — für externe Wechsel via F11/OS. */
export function persistFullscreen(flag: boolean): void {
  localStorage.setItem(KEY, flag ? "1" : "0");
}

/** Setzt Vollbild an/aus, persistiert die Wahl und gibt den neuen Zustand zurück. */
export async function setFullscreen(flag: boolean): Promise<boolean> {
  localStorage.setItem(KEY, flag ? "1" : "0");
  if (bridge) return bridge.setFullscreen(flag);
  return flag;
}

/**
 * ENTFERNT (Chef 2026-07-12): kein Vollbild-Autostart mehr — der Launch ist immer das exakte
 * 1920×1080-Fenster aus main/index.ts. Bewusst als No-op belassen, falls alte Aufrufer
 * auftauchen; der App.tsx-Start-Aufruf wurde entfernt.
 */
export function applyFullscreenPref(): void {
  /* no-op — Launch bleibt exakt 1920×1080 (s. Doku oben) */
}

/**
 * Start-Fenstermodus (Chef-Auftrag 2026-07-23): eigenständig vom Live-Vollbild-Toggle oben —
 * bestimmt, WIE das Fenster beim NÄCHSTEN Programmstart erzeugt wird (Vollbild / randloses
 * Fenster / klassisches 1920×1080-Fenster). Persistiert in `%APPDATA%\Grim Reach\window-mode.json`
 * (main/window.ts) statt localStorage, weil Main das synchron VOR der Fenster-Erstellung lesen
 * muss. `MODE_KEY` hier ist nur ein Anzeige-Cache, damit die Options-Seite sofort einen Wert
 * zeigen kann, bevor die IPC-Antwort da ist (und ein Fallback für den Web-Build ohne Bridge).
 */
const MODE_KEY = "hf.windowMode";

/** Zwischengespeicherter/Web-Fallback-Wert (Default "fullscreen" — spiegelt den neuen Main-Default). */
export function windowModePref(): WindowMode {
  const raw = localStorage.getItem(MODE_KEY);
  return raw === "fullscreen" || raw === "borderless" || raw === "windowed" ? raw : "fullscreen";
}

/** Tatsächlich gespeicherter Fenstermodus (fürs nächste Startup) — oder der Cache im Web-Build. */
export async function getWindowMode(): Promise<WindowMode> {
  if (bridge) return bridge.getWindowMode();
  return windowModePref();
}

/** Speichert den Fenstermodus. fullscreen/windowed wirken sofort (Main schaltet live um);
 *  borderless erst nach einem Neustart (frame ist danach nicht mehr änderbar). */
export async function setWindowMode(mode: WindowMode): Promise<boolean> {
  localStorage.setItem(MODE_KEY, mode);
  if (bridge) return bridge.setWindowMode(mode);
  return true;
}
