import { app, ipcMain, shell } from "electron";
import { mkdir, readFile, rename, rm } from "node:fs/promises";
import { join } from "node:path";
import { MAX_SAVE_SLOTS, SAVE_VERSION } from "@hearthforge/shared";
import {
  atomicWriteFile,
  backupBeforeWrite,
  backupPreAscend, // claude:2026-10-18T14:00:00+02:00 — Prestige-Aufstieg (Welle D)
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

// codex:2026-08-31T22:04:00+02:00 — journalgeschützter Zwei-Slot-Commit für Cross-Save-Fracht.
interface SavePairJournal {
  version: 1;
  first: { id: number; json: string };
  second: { id: number; json: string };
}

function pairJournalPath(): string {
  // Außerhalb `saves/*.json`: Steam Cloud darf den kurzlebigen Transaktionszustand nie syncen.
  return join(app.getPath("userData"), "save-pair-transaction.dat");
}

function withSlotPairLock<T>(firstId: number, secondId: number, task: () => Promise<T>): Promise<T> {
  if (firstId === secondId) throw new Error("Quell- und Zielslot müssen verschieden sein.");
  const [low, high] = firstId < secondId ? [firstId, secondId] : [secondId, firstId];
  return withSlotLock(low, () => withSlotLock(high, task));
}

async function recoverSavePairJournal(): Promise<void> {
  let raw: string;
  try {
    raw = await readFile(pairJournalPath(), "utf8");
  } catch {
    return;
  }
  // claude:2026-10-17T21:00:00+02:00 Ein defektes/ungueltiges Journal darf nicht jeden Save-Zugriff
  // sperren: beiseite legen (`.broken-<zeit>`), protokollieren, normal weiterarbeiten. Nur ein
  // gueltiges Journal, dessen Commit scheitert (z. B. Platte voll), bleibt ein echter Fehler.
  let parsed: SavePairJournal;
  let firstId: number;
  let secondId: number;
  try {
    const p = JSON.parse(raw) as Partial<SavePairJournal>;
    if (!p || p.version !== 1 || !p.first || !p.second) throw new Error("Ungültiges Save-Paar-Journal.");
    firstId = assertSlotId(p.first.id);
    secondId = assertSlotId(p.second.id);
    if (firstId === secondId || typeof p.first.json !== "string" || typeof p.second.json !== "string") {
      throw new Error("Ungültiger Save-Paar-Inhalt.");
    }
    parsed = p as SavePairJournal;
  } catch (err) {
    const broken = `${pairJournalPath()}.broken-${Date.now()}`;
    console.error(`[saves] Defektes Save-Paar-Journal, verschoben nach ${broken}:`, err);
    try {
      await rename(pairJournalPath(), broken);
    } catch (renameErr) {
      console.error("[saves] Defektes Journal konnte nicht umbenannt werden:", renameErr);
      await rm(pairJournalPath(), { force: true }).catch(() => undefined);
    }
    return;
  }
  await mkdir(savesDir(), { recursive: true });
  // Commit statt Rollback: beide Nachher-Zustände sind vollständig vorbereitet und idempotent.
  await atomicWriteFile(slotPath(firstId), parsed.first.json);
  await atomicWriteFile(slotPath(secondId), parsed.second.json);
  await rm(pairJournalPath(), { force: true });
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
  // Ein Crash zwischen den zwei atomaren Slot-Renames hinterlässt das Journal. Vor JEDEM Save-
  // Zugriff wird der vorbereitete Commit zu Ende geführt; dadurch gibt es weder Duplikat noch Verlust.
  // codex:2026-08-31T22:52:00+02:00 — Recovery-Fehler werden synchron beim nächsten IPC-Aufruf
  // zurückgegeben, statt als unbehandelte Promise-Rejection den Main-Prozess zu belasten.
  let recoveryFailure: unknown = null;
  const recoveryReady = recoverSavePairJournal().catch((error: unknown) => {
    recoveryFailure = error;
  });
  const awaitRecovery = async (): Promise<void> => {
    await recoveryReady;
    if (recoveryFailure) throw recoveryFailure;
  };

  ipcMain.handle("saves:readAll", async () => {
    await awaitRecovery();
    const out: Array<string | null> = [];
    for (let i = 0; i < MAX_SAVE_SLOTS; i++) out.push(await readSlot(i));
    return out;
  });

  ipcMain.handle("saves:read", async (_event, id: number) => {
    await awaitRecovery();
    return readSlot(id);
  });

  ipcMain.handle("saves:write", async (_event, id: number, json: string) => {
    await awaitRecovery();
    return withSlotLock(assertSlotId(id), async () => {
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
    });
  });

  ipcMain.handle(
    "saves:writePair",
    async (_event, firstIdRaw: number, firstJson: string, secondIdRaw: number, secondJson: string) => {
      await awaitRecovery();
      const firstId = assertSlotId(firstIdRaw);
      const secondId = assertSlotId(secondIdRaw);
      if (typeof firstJson !== "string" || typeof secondJson !== "string") throw new Error("Ungültige Save-Daten.");
      return withSlotPairLock(firstId, secondId, async () => {
        await mkdir(savesDir(), { recursive: true });
        try {
          await backupBeforeWrite(backupPaths(), firstId, firstJson);
          await backupBeforeWrite(backupPaths(), secondId, secondJson);
        } catch (err) {
          // Wie beim Einzel-Write bleibt Backup best-effort; der eigentliche sichere Commit hat Vorrang.
          console.error("[saves] Backup vor Save-Paar-Transfer fehlgeschlagen:", err);
        }
        const journal: SavePairJournal = {
          version: 1,
          first: { id: firstId, json: firstJson },
          second: { id: secondId, json: secondJson },
        };
        await atomicWriteFile(pairJournalPath(), JSON.stringify(journal));
        // Ab hier ist Commit garantiert: bei einem Fehler/Crash vollendet recoverSavePairJournal
        // exakt dieselben Nachher-Zustände idempotent.
        try {
          await atomicWriteFile(slotPath(firstId), firstJson);
          await atomicWriteFile(slotPath(secondId), secondJson);
          await rm(pairJournalPath(), { force: true });
        } catch (err) {
          try {
            await recoverSavePairJournal();
          } catch (recoveryError) {
            console.error("[saves] Save-Paar-Recovery fehlgeschlagen:", recoveryError);
            // codex:2026-08-31T22:58:00+02:00 — nach fehlgeschlagener Commit-Recovery werden alle
            // weiteren Save-Verben gesperrt; sonst könnte ein späteres Autosave das Journal überholen.
            recoveryFailure = recoveryError;
            throw err;
          }
        }
      });
    },
  );

  ipcMain.handle("saves:remove", async (_event, id: number) => {
    await awaitRecovery();
    return withSlotLock(assertSlotId(id), async () => {
      // Pre-Delete-Snapshot IMMER (ungedrosselt) — versehentliches Löschen ist rückholbar.
      try {
        await backupPreDelete(backupPaths(), id);
      } catch (err) {
        console.error(`[saves] Pre-Delete-Backup für Slot ${id} fehlgeschlagen:`, err);
      }
      await rm(slotPath(id), { force: true });
    });
  });

  // claude:2026-10-18T14:00:00+02:00 — Prestige „Der Aschesturz" (1.3 Welle D): Snapshot VOR dem Aufstieg.
  // Vertrag (saveBackups.ts backupPreAscend): der Renderer hat den Stand per `saves:write` gespeichert und
  // abgewartet; hier läuft die Kopie unter DEMSELBEN Slot-Lock (kein Autosave kann dazwischen schreiben).
  // Nur das Ergebnis "pre-ascend" erlaubt den Aufstieg; jede andere Antwort (oder ein Fehler) bricht ihn ab.
  ipcMain.handle("saves:backupPreAscend", async (_event, id: number) => {
    await awaitRecovery();
    return withSlotLock(assertSlotId(id), () => backupPreAscend(backupPaths(), id));
  });

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
