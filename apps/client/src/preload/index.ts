import { contextBridge, ipcRenderer } from "electron";

/**
 * Sichere Brücke zwischen Renderer und Main. Die Save-Funktionen kapseln die
 * Disk-I/O, die nur im Main-Prozess erlaubt ist.
 */
contextBridge.exposeInMainWorld("hearthforge", {
  platform: process.platform,
  app: {
    quit: (): Promise<void> => ipcRenderer.invoke("app:quit"),
    /** Dev-Modus (ungepackt oder GR_DEVTOOLS=1): schaltet Dev-Werkzeuge wie den Charakter-Export frei. */
    devToolsAllowed: (): Promise<boolean> => ipcRenderer.invoke("app:devToolsAllowed"),
    /** Main fängt Fenster-X/Alt+F4 ab und bittet den Renderer, VOR dem Beenden zu speichern
     *  (Save-on-Close, #281-Bugfund: sonst gehen bis zu 30 s Autosave-Fenster verloren). */
    onSaveThenQuit: (cb: () => void): (() => void) => {
      const listener = (): void => cb();
      ipcRenderer.on("app:save-then-quit", listener);
      return () => ipcRenderer.removeListener("app:save-then-quit", listener);
    },
  },
  saves: {
    readAll: (): Promise<Array<string | null>> => ipcRenderer.invoke("saves:readAll"),
    read: (slotId: number): Promise<string | null> => ipcRenderer.invoke("saves:read", slotId),
    write: (slotId: number, json: string): Promise<void> =>
      ipcRenderer.invoke("saves:write", slotId, json),
    // codex:2026-08-31T22:04:00+02:00 — ein journalgeschützter Commit für Quelle + Ziel.
    writePair: (firstSlotId: number, firstJson: string, secondSlotId: number, secondJson: string): Promise<void> =>
      ipcRenderer.invoke("saves:writePair", firstSlotId, firstJson, secondSlotId, secondJson),
    remove: (slotId: number): Promise<void> => ipcRenderer.invoke("saves:remove", slotId),
    /** Selbstheilung (Task #288 D): Backups eines Slots, neueste zuerst, roher JSON-Inhalt. */
    readBackups: (slotId: number): Promise<SaveBackupEntry[]> =>
      ipcRenderer.invoke("saves:readBackups", slotId),
    /** claude:2026-10-18T14:00:00+02:00 — Sicherung vor dem Prestige-Aufstieg; nur "pre-ascend" erlaubt ihn. */
    backupPreAscend: (slotId: number): Promise<PreAscendBackupResult> =>
      ipcRenderer.invoke("saves:backupPreAscend", slotId),
    /** Optionen → „Backup-Ordner öffnen" (Task #288 E). */
    openBackupsFolder: (): Promise<void> => ipcRenderer.invoke("saves:openBackupsFolder"),
  },
  zonemaps: {
    write: (zoneId: string, json: string): Promise<ZoneMapWriteResult> =>
      ipcRenderer.invoke("zonemaps:write", zoneId, json),
  },
  win: {
    getFullscreen: (): Promise<boolean> => ipcRenderer.invoke("window:get-fullscreen"),
    setFullscreen: (flag: boolean): Promise<boolean> =>
      ipcRenderer.invoke("window:set-fullscreen", flag),
    toggleFullscreen: (): Promise<boolean> => ipcRenderer.invoke("window:toggle-fullscreen"),
    onFullscreenChanged: (cb: (flag: boolean) => void): (() => void) => {
      const listener = (_e: unknown, flag: boolean): void => cb(flag);
      ipcRenderer.on("window:fullscreen-changed", listener);
      return () => ipcRenderer.removeListener("window:fullscreen-changed", listener);
    },
    // Start-Fenstermodus (Chef-Auftrag 2026-07-23): Vollbild/Randlos/Fenster — gilt für den
    // NÄCHSTEN Programmstart (frame ist nach der Fenster-Erstellung nicht mehr änderbar).
    getWindowMode: (): Promise<WindowMode> => ipcRenderer.invoke("window:get-window-mode"),
    setWindowMode: (mode: WindowMode): Promise<boolean> =>
      ipcRenderer.invoke("window:set-window-mode", mode),
  },
  steam: {
    unlockAchievement: (id: string): Promise<void> =>
      ipcRenderer.invoke("steam:achievement-unlock", id),
    syncAchievements: (ids: string[]): Promise<void> =>
      ipcRenderer.invoke("steam:achievement-sync", ids),
  },
  // Report-Bug-Feature (Chef-Auftrag 2026-07-18): mailto-Öffner (Allowlist s. main/shell.ts) +
  // Discord-Webhook-Netzwerkpfad (Allowlist + CSP-Umgehung s. main/bugReport.ts).
  shell: {
    openExternal: (url: string): Promise<boolean> => ipcRenderer.invoke("shell:openExternal", url),
  },
  bugReport: {
    fetchConfig: (url: string): Promise<BugReportConfigResult> =>
      ipcRenderer.invoke("bugreport:fetchConfig", url),
    sendWebhook: (url: string, payload: unknown, images: string[]): Promise<BugReportSendResult> =>
      ipcRenderer.invoke("bugreport:sendWebhook", url, payload, images),
    readClipboardImage: (): Promise<BugReportClipboardImage | null> =>
      ipcRenderer.invoke("bugreport:readClipboardImage"),
  },
  // Prompt-Extractor (Chef-Auftrag 28.08.2026, main/characterExport.ts): Charakterbogen → kit.png/
  // portrait.png/prompt.txt nach Downloads\Grim Reach Exports\<Name>-<Zeitstempel>\, Ordner öffnet
  // sich danach automatisch.
  export: {
    characterKit: (characterName: string, files: CharacterExportFileInput[]): Promise<CharacterExportResult> =>
      ipcRenderer.invoke("export:characterKit", characterName, files),
  },
});
