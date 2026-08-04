import { app, BrowserWindow, ipcMain, screen } from "electron";
import type { IpcMainInvokeEvent } from "electron";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Start-Fenstermodus (Chef-Auftrag 2026-07-23): bestimmt, WIE das Fenster beim nächsten
 * Programmstart erzeugt wird (echtes Vollbild / randloses Fenster / klassisches 1920×1080-
 * Fenster). Muss VOR `new BrowserWindow(...)` bekannt sein — `frame` lässt sich nach der
 * Fenster-Erstellung nicht mehr nachträglich ändern (Electron-Limitierung).
 */
export type WindowMode = "fullscreen" | "borderless" | "windowed";

const WINDOW_MODE_FILENAME = "window-mode.json";

function windowModeFilePath(): string {
  return join(app.getPath("userData"), WINDOW_MODE_FILENAME);
}

/**
 * Liest den gespeicherten Fenstermodus SYNCHRON — `main/index.ts` braucht das Ergebnis, bevor
 * das Fenster erzeugt wird, ein async fs-Read würde die App-Init-Reihenfolge unnötig verkomplizieren
 * für eine einzelne winzige Config-Datei. Fehlt/kaputt die Datei → Default "fullscreen" (Chef-Vorgabe
 * 2026-07-23: Vollbild-Start für maximale Trailer-/Intro-Wirkung). Im Dev (`isDev`) ist der Default
 * stattdessen "windowed" (Chef testet parallel in 1080p-Fenstern) — eine ECHTE, vorhandene
 * Config-Datei gewinnt aber AUCH im Dev, damit eine bewusst gewählte Einstellung nicht überschrieben wird.
 */
export function readWindowModeSync(isDev: boolean): WindowMode {
  try {
    const raw = readFileSync(windowModeFilePath(), "utf-8");
    const parsed = JSON.parse(raw) as { mode?: unknown };
    if (parsed.mode === "fullscreen" || parsed.mode === "borderless" || parsed.mode === "windowed") {
      return parsed.mode;
    }
  } catch {
    // Datei fehlt (Erststart) oder ist kaputt → Default unten.
  }
  return isDev ? "windowed" : "fullscreen";
}

function writeWindowModeSync(mode: WindowMode): void {
  try {
    writeFileSync(windowModeFilePath(), JSON.stringify({ mode }), "utf-8");
  } catch (err) {
    // Best effort — z.B. Datenträger voll/schreibgeschützt. Kein Blocker: die Wahl wirkt dann
    // nur für die laufende Session (fullscreen/windowed), nicht für den nächsten Start.
    console.error("[window] Fenstermodus konnte nicht gespeichert werden:", err);
  }
}

/** Bounds, die das PRIMÄRE Display exakt ausfüllen — für den randlosen Fenstermodus (frame:false). */
export function borderlessBounds(): { x: number; y: number; width: number; height: number } {
  return screen.getPrimaryDisplay().bounds;
}

/**
 * Fenster-IPC: Vollbild-Steuerung (bestehend, F11 + Optionen) + der neue Start-Fenstermodus.
 * Die Handler operieren immer auf dem Fenster des aufrufenden WebContents,
 * damit sie auch bei mehreren Fenstern korrekt zielen.
 */
export function registerWindowHandlers(): void {
  const winOf = (event: IpcMainInvokeEvent): BrowserWindow | null =>
    BrowserWindow.fromWebContents(event.sender);

  ipcMain.handle("window:get-fullscreen", (event) => winOf(event)?.isFullScreen() ?? false);

  ipcMain.handle("window:set-fullscreen", (event, flag: unknown) => {
    const win = winOf(event);
    if (!win) return false;
    win.setFullScreen(!!flag);
    return win.isFullScreen();
  });

  ipcMain.handle("window:toggle-fullscreen", (event) => {
    const win = winOf(event);
    if (!win) return false;
    win.setFullScreen(!win.isFullScreen());
    return win.isFullScreen();
  });

  ipcMain.handle("window:get-window-mode", () =>
    readWindowModeSync(!!process.env["ELECTRON_RENDERER_URL"]),
  );

  // Schreibt den Modus fürs NÄCHSTE Startup und wendet an, was zur Laufzeit sicher anwendbar ist:
  // fullscreen↔windowed lassen sich sofort über setFullScreen umschalten. "borderless" ändert
  // `frame`, das ist nach der Fenster-Erstellung nicht mehr live änderbar → wirkt erst ab dem
  // nächsten Start (die Renderer-Seite kommuniziert das entsprechend, s. util/display.ts).
  ipcMain.handle("window:set-window-mode", (event, mode: unknown) => {
    if (mode !== "fullscreen" && mode !== "borderless" && mode !== "windowed") return false;
    writeWindowModeSync(mode);
    const win = winOf(event);
    if (win && mode === "fullscreen") win.setFullScreen(true);
    if (win && mode === "windowed") win.setFullScreen(false);
    return true;
  });
}
