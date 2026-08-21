import { app, BrowserWindow, ipcMain, Menu } from "electron";
import { join } from "node:path";
import appIcon from "../../resources/icon.png?asset";
import { registerSaveHandlers } from "./saves";
import { registerZoneMapHandlers } from "./zonemaps";
import { borderlessBounds, readWindowModeSync, registerWindowHandlers } from "./window";
import type { WindowMode } from "./window";
import { initSteam, registerSteamHandlers } from "./steam";
import { registerShellHandlers } from "./shell";
import { registerBugReportHandlers } from "./bugReport";

// App-Identität MUSS vor `app.whenReady()` gesetzt werden: Electron leitet den `userData`-Pfad aus
// `app.getName()` ab und friert ihn beim App-Init ein. Stand das setName wie zuvor IN whenReady, war
// es zu spät → userData landete unter dem package.json-Namen (`@hearthforge/client` → Ordner „client").
// Auf Modul-Ebene (vor whenReady) ausgeführt bekommt der Speicherordner den sauberen Namen „Grim Reach"
// (…\AppData\Roaming\Grim Reach\saves\) — der auch mit der Steam-Cloud-Auto-Cloud-Config übereinstimmt.
// Scene-Builder-Standalone-EXE (Chef-Auftrag 2026-08-05, s. renderer/components/arena25d/README.md
// "Standalone-EXE"): eigener App-Name ⇒ eigener userData-Pfad — die Builder-EXE berührt NIE die
// Spiel-Saves unter …\Grim Reach\. `__SCENE_BUILDER_BUILD__` ist eine Vite-define-Konstante
// (electron.vite.config.ts): im Spieler-Build literal `false`, jeder Builder-Zweig hier wird dort
// zu totem Code gefaltet (per Bundle-Grep gegen out/main/index.js verifiziert).
app.setName(__SCENE_BUILDER_BUILD__ ? "Grim Reach Scene Builder" : "Grim Reach");

function createWindow(): void {
  // Im Dev liefert electron-vite die URL des Vite-Dev-Servers, im Build die Datei.
  const devUrl = process.env["ELECTRON_RENDERER_URL"];
  const isDev = !!devUrl;

  // Chef-Auftrag 2026-07-23 (Vollbild-Start als Default): der Fenstermodus MUSS vor der
  // Fenster-Erstellung feststehen — `frame` ist danach nicht mehr änderbar. Default ohne
  // gespeicherte Wahl: "fullscreen" (Prod) bzw. "windowed" im Dev (s. window.ts-Doku).
  // Scene-Builder-EXE: IMMER klassisch windowed 1920×1080 (Werkzeug-Fenster, keine gespeicherte
  // Fullscreen-Präferenz lesen/anwenden).
  const windowMode: WindowMode = __SCENE_BUILDER_BUILD__ ? "windowed" : readWindowModeSync(isDev);

  // Basis-Optionen gelten für ALLE Modi — inkl. der 1920×1080-Renderfläche als Fallback-Größe:
  // in "fullscreen" sind das die Bounds, zu denen man beim Verlassen von Vollbild zurückkehrt
  // (statt Electrons 800×600-Default); in "borderless" werden sie unten von den Display-Bounds
  // überschrieben; in "windowed" sind es exakt die heutigen Optionen (unverändert, Chef 2026-07-12).
  const windowOptions: ConstructorParameters<typeof BrowserWindow>[0] = {
    width: 1920,
    height: 1080,
    // 1.0-Fixrunde FIX 4 (Chef-Sweep): kein Mindestfenster gesetzt — bei 1280×800 lag der
    // Gold-Zähler außerhalb des Bildes, „Kampf beenden" war zu 38 % beschnitten und der
    // Speichern-Knopf von Ausrüstungsvorlage 3 nachweislich nicht klickbar. Untergrenze knapp
    // über dem kleinsten in den UI-Fixes getesteten Layout (1366×768), damit windowed/borderless
    // nicht mehr unter die UI-Mindestgröße gezogen werden kann.
    minWidth: 1360,
    minHeight: 720,
    useContentSize: true,
    title: __SCENE_BUILDER_BUILD__ ? "Grim Reach — Scene Builder" : "Grim Reach",
    icon: appIcon, // Fenster-/Taskleisten-Icon (dev + Build) = unser Grim-Reach-Icon
    backgroundColor: "#1a1410",
    autoHideMenuBar: true, // Keine Debug-/Standardmenüleiste oben für den Spieler.
    // Start-Polish (Perf-Audit 2026-07-22): Fenster erst zeigen, wenn der Renderer den ersten
    // Frame hat — kein leeres Fenster beim Aufgehen (ready-to-show unten). Gilt unverändert für
    // alle drei Fenstermodi.
    show: false,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false,
    },
  };

  if (windowMode === "fullscreen") {
    windowOptions.fullscreen = true;
  } else if (windowMode === "borderless") {
    windowOptions.frame = false;
    Object.assign(windowOptions, borderlessBounds());
  }
  // "windowed": keine weiteren Overrides — windowOptions ist bereits exakt das heutige Fenster.

  const win = new BrowserWindow(windowOptions);

  if (devUrl) {
    win.loadURL(devUrl);
    // Dev: DevTools abgedockt offen → per Device-Toolbar lassen sich Auflösungen
    // (z.B. 1920×1080) emulieren. Das 1920×1080-Fenster selbst ist bereits exakt.
    win.webContents.openDevTools({ mode: "detach" });
  } else if (__SCENE_BUILDER_BUILD__) {
    // Scene-Builder-EXE: der Mount-Switch in renderer/main.tsx liest `?sceneBuilder=<zoneId>` —
    // im file://-Build kommt der Parameter über die loadFile-`query`-Option an. Start-Zone
    // "pastures" ist nur der Einstieg, danach wechselt man im Zonen-Dropdown des Builders.
    win.loadFile(join(__dirname, "../renderer/index.html"), { query: { sceneBuilder: "pastures" } });
    // index.html trägt <title>Grim Reach</title> — im Builder den Fenstertitel von oben behalten.
    // WICHTIG: das preventDefault-fähige Event hängt am BrowserWindow, NICHT an webContents
    // (per Playwright gegen die echte EXE verifiziert — die webContents-Variante ließ den Titel
    // trotzdem auf "Grim Reach" umspringen).
    win.on("page-title-updated", (e) => e.preventDefault());
  } else {
    win.loadFile(join(__dirname, "../renderer/index.html"));
  }

  // Start-Polish (Perf-Audit 2026-07-22): erst beim ersten gerenderten Frame zeigen.
  win.once("ready-to-show", () => win.show());

  // [DIAG] Renderer-Konsole + fehlgeschlagene Ressourcen in die Main-Konsole spiegeln —
  // NUR im Dev (Perf-Audit 2026-07-22: im Prod ist das ein IPC pro Log-Zeile, reines Rauschen).
  if (isDev) {
    win.webContents.on("console-message", (_e, _level, message) => {
      console.log("[renderer]", message);
    });
  }
  win.webContents.on("did-fail-load", (_e, code, desc, url) => {
    console.error("[did-fail-load]", code, desc, url);
  });

  // Release-Hardening (Audit 2026-07-19, defense-in-depth): Das Spiel ist eine lokale SPA — sie
  // öffnet nie Kindfenster und navigiert nie weg von der eigenen Origin. Externe Links laufen
  // ausschließlich über die mailto-only `shell.openExternal`-Bridge (main/shell.ts). Daher:
  // window.open() hart verweigern und jede Navigation auf eine FREMDE Origin blocken.
  win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  win.webContents.on("will-navigate", (event, url) => {
    try {
      if (new URL(url).origin !== new URL(win.webContents.getURL()).origin) event.preventDefault();
    } catch {
      event.preventDefault();
    }
  });

  // UI-Scale komplett entfernt (Chef, Polish-Sprint 2026-07: „Wir wollen immer bei 100 % bleiben"):
  // kein auflösungsabhängiger Auto-Zoom mehr (war 0.72–1.0 nach Fenstergröße) — Zoom-Faktor bleibt
  // auf dem Electron-Default 1.0. Layout-Probleme auf kleinen Fenstern lösen wir im CSS, nicht per Zoom.

  // Manuelle Tastenkürzel als Notausgang: F11 = Vollbild umschalten, F12 = DevTools umschalten.
  win.webContents.on("before-input-event", (_event, input) => {
    if (input.type !== "keyDown") return;
    if (input.key === "F11") win.setFullScreen(!win.isFullScreen());
    if (input.key === "F12") win.webContents.toggleDevTools();
  });

  // Vollbild-Wechsel (egal ob via F11, Optionen oder OS) an den Renderer melden, damit dieser die
  // Präferenz persistiert (sonst überschreibt applyFullscreenPref beim nächsten Start die F11-Wahl).
  win.on("enter-full-screen", () => win.webContents.send("window:fullscreen-changed", true));
  win.on("leave-full-screen", () => win.webContents.send("window:fullscreen-changed", false));

  // Save-on-Close (#281-Bugfund): Fenster-X/Alt+F4 beendete OHNE zu speichern — bis zu 30 s
  // Autosave-Fenster an Fortschritt gingen verloren (z.B. eine frisch gestartete Aktion). Der erste
  // Close wird abgefangen, der Renderer speichert (GameContext) und ruft dann app:quit; ein
  // Fallback-Timer erzwingt das Schließen, falls der Renderer hängt oder nicht antwortet.
  let saveOnCloseRequested = false;
  win.on("close", (e) => {
    // Scene-Builder-EXE: Abfangen ÜBERSPRINGEN — der Builder-Renderer (SceneBuilderApp, kein
    // GameContext) beantwortet app:save-then-quit nie, das Abfangen würde jedes Schließen um die
    // vollen 2 s Fallback-Timeout verzögern. Fenster-X beendet den Builder sofort (Export ist
    // explizit). Als Guard IM Handler statt als `if (!…)` um die Registrierung: `if (false) return`
    // faltet Rollup im Spieler-Build restlos weg (byte-identisches out/main/index.js), ein
    // Block-Wrapper hinterließe eine inerte `{}`-Hülle.
    if (__SCENE_BUILDER_BUILD__) return;
    if (saveOnCloseRequested) return; // zweiter Durchlauf nach dem Speichern → wirklich schließen
    saveOnCloseRequested = true;
    e.preventDefault();
    win.webContents.send("app:save-then-quit");
    setTimeout(() => {
      if (!win.isDestroyed()) win.destroy();
    }, 2_000);
  });
}

app.whenReady().then(() => {
  // (App-Name wird bereits auf Modul-Ebene gesetzt — muss vor whenReady passieren, s. oben.)
  // Obere Electron-Standardmenüleiste („File/Edit/View…") komplett entfernen.
  Menu.setApplicationMenu(null);
  // Steam initialisieren (No-Op bis AppID + steamworks.js gesetzt sind, siehe steam.ts).
  initSteam();
  registerSaveHandlers();
  registerZoneMapHandlers();
  registerWindowHandlers();
  registerSteamHandlers();
  // Report-Bug-Feature (Chef-Auftrag 2026-07-18): mailto-Öffner + Discord-Webhook-Netzwerkpfad.
  registerShellHandlers();
  registerBugReportHandlers();
  // Sidebar „Spiel verlassen"-Button (Chef-Wunsch): sauberer App-Exit aus dem Renderer.
  ipcMain.handle("app:quit", () => app.quit());
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
