/// <reference types="vite/client" />

/** Injected by Vite define at build time from apps/client/package.json → version. */
declare const __APP_VERSION__: string;

/** Scene-Builder-Standalone-Build (drittes Gate, s. renderer/components/arena25d/builder/flag.ts):
 *  per Vite-`define` in electron.vite.config.ts injiziert — `true` NUR, wenn der Build mit
 *  `SCENE_BUILDER_BUILD=1` läuft (Skript `package:scenebuilder`), sonst literal `false` (wird im
 *  Spieler-Build konstant gefaltet, Tree-Shaking-Vertrag bleibt intakt). Gilt für Main UND Renderer. */
declare const __SCENE_BUILDER_BUILD__: boolean;

/** claude:2026-10-30T20:20:00+01:00 — Asset-Werkstatt-Build (devtools/assetLab.tsx): per Vite-`define` `true` NUR bei `ASSET_LAB=1`, sonst literal
 *  `false` (Hotkey-Modul und Bild-Glob werden dann nicht ins Paket gebaut). Nur Renderer. */
declare const __ASSET_LAB_BUILD__: boolean;

/** claude:2026-10-30T20:58:00+01:00 — Dev-UI-Stil „Synty“ (renderer/synty/): per Vite-`define` `true` NUR bei `SYNTY_UI=1`, sonst literal `false` (Stil, CSS und Bilder
 *  werden dann nicht ins Paket gebaut). Nur Renderer. */
declare const __SYNTY_UI_BUILD__: boolean;

/** electron-vite: `import x from "./y.png?asset"` liefert den aufgelösten Datei-Pfad als String. */
declare module "*?asset" {
  const src: string;
  export default src;
}

interface AppBridge {
  /** Beendet die App sauber (Sidebar „Spiel verlassen"-Button). */
  quit(): Promise<void>;
  devToolsAllowed(): Promise<boolean>;
  /** Save-on-Close (#281): Main bittet den Renderer vor dem Fenster-Schließen zu speichern.
   *  Rückgabe = Unsubscribe. */
  onSaveThenQuit(cb: () => void): () => void;
}

/** Ein Save-Backup aus `%APPDATA%\Grim Reach\backups\slot-N\` (Task #288). */
interface SaveBackupEntry {
  /** Dateiname (Kategorie + Zeitstempel, z. B. `rolling-20260708-184500.json`). */
  name: string;
  /** Datei-Änderungszeit in Epoch-ms (Fallback-Sortierung). */
  mtimeMs: number;
  /** Roher JSON-Inhalt des Backups. */
  json: string;
}

/** claude:2026-10-18T14:00:00+02:00 — Ergebnis von `saves:backupPreAscend` (main/saveBackups.ts PreAscendBackupResult). */
type PreAscendBackupResult = "pre-ascend" | "no-existing" | "skipped-corrupt";

interface SavesBridge {
  readAll(): Promise<Array<string | null>>;
  read(slotId: number): Promise<string | null>;
  write(slotId: number, json: string): Promise<void>;
  /** Schreibt zwei verschiedene Slots als journalgeschützten Cross-Save-Commit. */
  writePair(firstSlotId: number, firstJson: string, secondSlotId: number, secondJson: string): Promise<void>;
  remove(slotId: number): Promise<void>;
  /** Backups eines Slots, neueste zuerst (Selbstheilung bei kaputtem Slot, Task #288 D). */
  readBackups(slotId: number): Promise<SaveBackupEntry[]>;
  /** Öffnet `backups\` im Datei-Explorer (Optionen → Spielstand-Daten, Task #288 E). */
  openBackupsFolder(): Promise<void>;
  /** claude:2026-10-18T14:00:00+02:00 — Sicherung vor dem Prestige-Aufstieg; nur "pre-ascend" erlaubt ihn. */
  backupPreAscend(slotId: number): Promise<PreAscendBackupResult>;
}

interface ZoneMapWriteResult {
  ok: boolean;
  path?: string;
  error?: string;
}

interface ZoneMapsBridge {
  write(zoneId: string, json: string): Promise<ZoneMapWriteResult>;
}

/** Start-Fenstermodus (Chef-Auftrag 2026-07-23): bestimmt das Fenster BEIM NÄCHSTEN Programmstart
 *  ("fullscreen"/"borderless" wirken für den `frame` erst dann — s. main/window.ts-Doku). */
type WindowMode = "fullscreen" | "borderless" | "windowed";

interface WindowBridge {
  getFullscreen(): Promise<boolean>;
  setFullscreen(flag: boolean): Promise<boolean>;
  toggleFullscreen(): Promise<boolean>;
  /** Abonniert externe Vollbild-Wechsel (F11/OS); gibt eine Unsubscribe-Funktion zurück. */
  onFullscreenChanged(cb: (flag: boolean) => void): () => void;
  /** Aktuell gespeicherter Start-Fenstermodus (aus `window-mode.json`, s. main/window.ts). */
  getWindowMode(): Promise<WindowMode>;
  /** Speichert den Fenstermodus fürs nächste Startup; wendet fullscreen/windowed sofort an
   *  (setFullScreen) — "borderless" wirkt erst nach einem Neustart (frame ist danach fix). */
  setWindowMode(mode: WindowMode): Promise<boolean>;
}

interface SteamBridge {
  /** Meldet ein im Spiel neu freigeschaltetes Achievement an Steam (No-Op ohne Steam). */
  unlockAchievement(id: string): Promise<void>;
  /** Synchronisiert alle bereits freigeschalteten Achievements einmalig (z. B. beim Laden). */
  syncAchievements(ids: string[]): Promise<void>;
}

/** Report-Bug-Feature (Chef-Auftrag 2026-07-18): öffnet eine URL im System-Standardprogramm. Nur
 *  `mailto:`-URLs werden vom Main-Prozess akzeptiert (s. main/shell.ts) — die Bug-Report-„Per
 *  E-Mail senden"-Aktion. Gibt zurück, ob die URL akzeptiert wurde. */
interface ShellBridge {
  openExternal(url: string): Promise<boolean>;
}

/** Ergebnis der Bug-Report-Remote-Config (s. renderer/util/bugReportConfig.ts). `webhook: null` =
 *  keine/kaputte Config oder nicht erreichbar — KEIN Fehlerfall, der Renderer fällt dann auf den
 *  eingebauten Default-Webhook zurück. */
interface BugReportConfigResult {
  webhook: string | null;
}

/** Ergebnis eines Discord-Webhook-Sendeversuchs (s. main/bugReport.ts). */
interface BugReportSendResult {
  ok: boolean;
  status?: number;
  /** Anzahl tatsächlich angehängter Bilder (0–3). */
  attachedImages: number;
  /** Angehängte Bilder, die wegen Format/Größe übersprungen wurden (defensives zweites Netz —
   *  der Renderer skaliert schon vorher herunter, s. util/bugReportImages.ts). */
  skippedImages: number;
}

/** Ein aus der System-Zwischenablage gelesenes Bild (Bug-Report „Aus Zwischenablage einfügen"). */
interface BugReportClipboardImage {
  dataUrl: string;
  width: number;
  height: number;
}

interface BugReportBridge {
  /** Lädt die Remote-Bug-Report-Config über den Main-Prozess (Renderer-CSP erlaubt keine
   *  Cross-Origin-Fetches, s. main/bugReport.ts). */
  fetchConfig(url: string): Promise<BugReportConfigResult>;
  /** Postet den Bug-Report-Payload (+ bis zu 3 Bild-Anhänge) an eine Discord-Webhook-URL. */
  sendWebhook(url: string, payload: unknown, images: string[]): Promise<BugReportSendResult>;
  /** Liest ein Bild aus der System-Zwischenablage, `null` wenn keins vorhanden ist. */
  readClipboardImage(): Promise<BugReportClipboardImage | null>;
}

/** Eine Export-Datei für den Prompt-Extractor (s. main/characterExportFiles.ts) — genau EINS von
 *  `dataUrl` (PNG, `data:image/png;base64,…`) oder `text` (Klartext) ist gesetzt. `name` muss exakt
 *  "kit.png"/"portrait.png"/"prompt.txt" sein (main-seitige Allowlist, s. main/characterExport.ts). */
interface CharacterExportFileInput {
  name: string;
  dataUrl?: string;
  text?: string;
}

/** Ergebnis eines Prompt-Extractor-Exports (main/characterExport.ts). `path` nur bei `ok`. */
interface CharacterExportResult {
  ok: boolean;
  path?: string;
  error?: "no_files" | "write_failed" | "disabled";
}

interface CharacterExportBridge {
  /** Schreibt kit.png/portrait.png/prompt.txt nach Downloads\Grim Reach Exports\<Name>-<Zeitstempel>\
   *  und öffnet den Ordner (Prompt-Extractor, Chef-Auftrag 28.08.2026). */
  characterKit(characterName: string, files: CharacterExportFileInput[]): Promise<CharacterExportResult>;
}

/** claude:2026-10-31T16:34:28+01:00 — Desktop-Benachrichtigungen (main/notify.ts). */
interface NotifyBridge {
  show(title: string, body: string): Promise<boolean>;
  supported(): Promise<boolean>;
}

interface HearthforgeBridge {
  platform: NodeJS.Platform;
  app: AppBridge;
  saves: SavesBridge;
  zonemaps: ZoneMapsBridge;
  win: WindowBridge;
  steam: SteamBridge;
  shell: ShellBridge;
  bugReport: BugReportBridge;
  export: CharacterExportBridge;
  notify?: NotifyBridge;
}

interface Window {
  hearthforge?: HearthforgeBridge;
}
