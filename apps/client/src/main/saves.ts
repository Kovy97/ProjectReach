import { app, ipcMain, shell } from "electron";
import { mkdir, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { MAX_SAVE_SLOTS, SAVE_VERSION } from "@hearthforge/shared";
import {
  atomicWriteFile,
  backupBeforeWrite,
  backupPreDelete,
  backupPreMigration,
  cleanupTmpFiles,
  ensureBackupsReadme,
  listBackups,
  parseEnvelope,
  slotFileName,
} from "./saveBackups";
import type { BackupPaths } from "./saveBackups";

// HARTE CHEF-AUFLAGE (Task #288): `%APPDATA%\Grim Reach\saves\slot-N.json` ist der eingereichte
// Steam-Auto-Cloud-Pfad (Pattern `saves/*.json`) und darf sich NICHT ändern. Alles Neue
// (atomare tmp-Datei mit `.tmp`-Endung, Backups in `backups\`) bleibt außerhalb des Patterns.
function savesDir(): string {
  return join(app.getPath("userData"), "saves");
}

/** Backup-Wurzel: Geschwister-Ordner von `saves` — bewusst NICHT im Cloud-Pfad (Plan §5). */
function backupsDir(): string {
  return join(app.getPath("userData"), "backups");
}

function backupPaths(): BackupPaths {
  return { savesDir: savesDir(), backupsDir: backupsDir() };
}

/** Validiert die Slot-ID streng → kein Path-Traversal über den Dateinamen. */
function assertSlotId(id: unknown): number {
  if (typeof id !== "number" || !Number.isInteger(id) || id < 0 || id >= MAX_SAVE_SLOTS) {
    throw new Error(`Ungültige Slot-ID: ${String(id)}`);
  }
  return id;
}

function slotPath(id: unknown): string {
  return join(savesDir(), slotFileName(assertSlotId(id)));
}

/**
 * Write-Mutex pro Slot (Plan §2): Autosave (30 s), manuelles Speichern, returnToMenu und
 * Save-on-Close können sich überlappen — pro Slot läuft immer nur EIN write/remove, sonst
 * kollidierten zwei Writes auf demselben tmp-Namen. Fehler erreichen den jeweiligen Aufrufer,
 * vergiften aber nie die Kette (das gespeicherte Ketten-Promise ist immer resolved).
 */
const slotChains = new Map<number, Promise<unknown>>();
function withSlotLock<T>(id: number, task: () => Promise<T>): Promise<T> {
  const prev = slotChains.get(id) ?? Promise.resolve();
  const run = prev.then(task, task);
  slotChains.set(id, run.then(() => undefined, () => undefined));
  return run;
}

async function readSlot(id: number): Promise<string | null> {
  let json: string;
  try {
    json = await readFile(slotPath(id), "utf8");
  } catch {
    return null; // Datei existiert (noch) nicht
  }
  // Pre-Migration-Snapshot (Plan §3.3): Alt-Versions-Save entdeckt (auch von Steam Cloud
  // angespült) → Bestand sichern, BEVOR Load/Autosave die Migration festschreibt. Der
  // Menü-Besuch (readAll) sichert so bereits alle Alt-Slots. Best-effort: darf das Lesen
  // nie blockieren.
  try {
    const version = parseEnvelope(json)?.version;
    if (typeof version === "number" && version < SAVE_VERSION) {
      await backupPreMigration(backupPaths(), id, version);
    }
  } catch (err) {
    console.error(`[saves] Pre-Migration-Backup für Slot ${id} fehlgeschlagen:`, err);
  }
  return json;
}

/** Registriert die Save-IPC-Handler. Vor dem Erstellen des Fensters aufrufen. */
export function registerSaveHandlers(): void {
  // Verwaiste tmp-Dateien eines Crashs zwischen write und rename aufräumen (Plan §2).
  void cleanupTmpFiles(savesDir());

  ipcMain.handle("saves:readAll", async () => {
    const out: Array<string | null> = [];
    for (let i = 0; i < MAX_SAVE_SLOTS; i++) out.push(await readSlot(i));
    return out;
  });

  ipcMain.handle("saves:read", (_event, id: number) => readSlot(id));

  ipcMain.handle("saves:write", (_event, id: number, json: string) =>
    withSlotLock(assertSlotId(id), async () => {
      const target = slotPath(id);
      await mkdir(savesDir(), { recursive: true });
      // Backup der ALTEN Datei (rolling/daily gedrosselt bzw. pre-overwrite ungedrosselt) —
      // Best-effort: schlägt das Backup fehl (Disk voll, Virenscanner-Lock), hat das
      // Speichern selbst trotzdem Vorrang (Plan §2/§7).
      try {
        await backupBeforeWrite(backupPaths(), id, json);
      } catch (err) {
        console.error(`[saves] Backup vor dem Schreiben von Slot ${id} fehlgeschlagen:`, err);
      }
      // Paket A — atomar: tmp (`slot-N.json.tmp`, matcht das Cloud-Pattern nie) + fsync + rename.
      await atomicWriteFile(target, json);
    }),
  );

  ipcMain.handle("saves:remove", (_event, id: number) =>
    withSlotLock(assertSlotId(id), async () => {
      // Pre-Delete-Snapshot IMMER (ungedrosselt) — versehentliches Löschen ist rückholbar.
      try {
        await backupPreDelete(backupPaths(), id);
      } catch (err) {
        console.error(`[saves] Pre-Delete-Backup für Slot ${id} fehlgeschlagen:`, err);
      }
      await rm(slotPath(id), { force: true });
    }),
  );

  // Paket D — Selbstheilung: Backup-Liste eines Slots (neueste zuerst, roher Inhalt). Der
  // Renderer probiert sie bei kaputtem Slot der Reihe nach mit deserialize (GameContext).
  ipcMain.handle("saves:readBackups", (_event, id: number) =>
    listBackups(backupPaths(), assertSlotId(id)),
  );

  // Paket E — „Backup-Ordner öffnen" (Optionen → Spielstand-Daten): Ordner (samt README)
  // sicherstellen und im Explorer öffnen.
  ipcMain.handle("saves:openBackupsFolder", async () => {
    await mkdir(backupsDir(), { recursive: true });
    await ensureBackupsReadme(backupsDir());
    await shell.openPath(backupsDir());
  });
}
