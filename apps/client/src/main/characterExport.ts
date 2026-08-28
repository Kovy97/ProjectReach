import { app, ipcMain, shell } from "electron";
import { join } from "node:path";
import { exportFolderName, writeExportFiles } from "./characterExportFiles";
import type { CharacterExportFile } from "./characterExportFiles";

/**
 * Prompt-Extractor (Chef-Auftrag 28.08.2026, design/prompt-extractor.md): schreibt `kit.png`,
 * `portrait.png` und `prompt.txt` aus dem Charakterbogen nach
 * `<Downloads>\Grim Reach Exports\<sicherer Charaktername>-<yyyy-mm-dd-hhmm>\` und öffnet den
 * Ordner danach im Explorer — Muster main/saves.ts (`saves:*`) + main/bugReport.ts (Allowlist-
 * Disziplin, nie roh vom Renderer vertrauen). Die eigentliche Dateisystem-Logik (Namens-Bereinigung
 * + Schreiben) lebt Electron-frei in characterExportFiles.ts (headless testbar, s. dortiges Test-
 * File) — dieses Modul ist nur die dünne IPC-Fassade drumherum.
 */

/** NUR diese drei Dateinamen sind erlaubt — der Renderer liefert `files[].name` mit, das ist
 *  Eingabe von der ANDEREN Seite der Context-Bridge und wird daher nie ungeprüft als Pfad-Teil
 *  benutzt (dieselbe Disziplin wie `isDiscordWebhookUrl` in bugReport.ts). */
const ALLOWED_EXPORT_FILENAMES = new Set(["kit.png", "portrait.png", "prompt.txt"]);

function isCharacterExportFile(value: unknown): value is CharacterExportFile {
  if (!value || typeof value !== "object") return false;
  const f = value as Partial<CharacterExportFile>;
  if (typeof f.name !== "string" || !ALLOWED_EXPORT_FILENAMES.has(f.name)) return false;
  return typeof f.dataUrl === "string" || typeof f.text === "string";
}

/** Export-Wurzelordner. `GR_EXPORT_DIR` überschreibt ihn (Sim-Harness/Tests laufen ohne echtes
 *  Downloads-Verzeichnis eines Spielers und dürfen keinen echten Explorer-Ordner öffnen). */
function exportsRoot(): string {
  const override = process.env.GR_EXPORT_DIR;
  if (override && override.trim()) return override;
  return join(app.getPath("downloads"), "Grim Reach Exports");
}

export interface CharacterExportResult {
  ok: boolean;
  path?: string;
  error?: "no_files" | "write_failed";
}

export function registerCharacterExportHandlers(): void {
  ipcMain.handle(
    "export:characterKit",
    async (_event, characterName: unknown, files: unknown): Promise<CharacterExportResult> => {
      const name = typeof characterName === "string" && characterName.trim() ? characterName : "Charakter";
      const list = (Array.isArray(files) ? files : []).filter(isCharacterExportFile);
      if (list.length === 0) return { ok: false, error: "no_files" };

      const dir = join(exportsRoot(), exportFolderName(name, new Date()));
      try {
        const written = await writeExportFiles(dir, list);
        if (written === 0) return { ok: false, error: "write_failed" };
        await shell.openPath(dir);
        return { ok: true, path: dir };
      } catch (err) {
        console.error("[characterExport] Export fehlgeschlagen:", err);
        return { ok: false, error: "write_failed" };
      }
    },
  );
}
