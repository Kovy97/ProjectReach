import { access, copyFile, mkdir, open, readdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Save-Backups + atomares Schreiben (Task #288, Plan „save-backups-plan.md" Pakete A+B).
 *
 * BEWUSST OHNE Electron-Import und mit Dependency-Injection (savesDir/backupsDir als Parameter):
 * so ist das Modul headless mit einem Temp-Verzeichnis unit-testbar (Plan §7 Testplan Punkt 1).
 * Die IPC-Anbindung (app.getPath, Handler, Write-Mutex) lebt in ./saves.ts.
 *
 * HARTE CHEF-AUFLAGE (Steam Cloud, eingereichte Store-Konfig): Der echte Save-Ort/-Name
 * `%APPDATA%\Grim Reach\saves\slot-N.json` darf sich NICHT ändern. Deshalb:
 *  - Die Temp-Datei des atomaren Schreibens endet auf `.tmp` (slot-N.json.tmp) → matcht das
 *    Auto-Cloud-Pattern `saves/*.json` NIE; ein Torn-Write kann nicht in die Cloud gelangen.
 *  - ALLE Backups liegen im Geschwister-Ordner `backups\` NEBEN `saves\` — außerhalb des
 *    Cloud-Pfads (Plan §5: Datei-Quota, Sync-Churn, Unabhängigkeit vom Cloud-Mechanismus).
 *
 * Ordnerlayout (Plan §1.2):
 *   %APPDATA%\Grim Reach\
 *   ├── saves\slot-N.json            ← Cloud-Pfad, unverändert
 *   └── backups\
 *       ├── README.txt               ← Wiederherstellungs-Anleitung (EN/DE, statisch)
 *       └── slot-N\
 *           ├── rolling-YYYYMMDD-HHMMSS.json   (max. 1/15 min, letzte 5)
 *           ├── daily-YYYYMMDD.json            (1/Tag, letzte 3)
 *           ├── pre-migration-vNN.json         (1 je Versionssprung, letzte 3)
 *           ├── pre-overwrite-YYYYMMDD-HHMMSS.json (immer, letzte 3)
 *           └── pre-delete-YYYYMMDD-HHMMSS.json    (immer, letzte 3)
 *
 * Speicherbedarf worst case: 17 Dateien × ~12 KB × 5 Slots ≈ 1 MB (Plan §1.4, Auflage < 1,5 MB).
 */

export interface BackupPaths {
  /** Ordner der echten Slots (Steam-Cloud-Pfad) — wird nur GELESEN/kopiert, nie umbenannt. */
  savesDir: string;
  /** Backup-Wurzel (Geschwister von saves, NICHT in der Cloud). */
  backupsDir: string;
}

// Aufbewahrung je Kategorie (Plan §1.3).
export const ROLLING_KEEP = 5;
export const DAILY_KEEP = 3;
export const PRE_MIGRATION_KEEP = 3;
export const PRE_OVERWRITE_KEEP = 3;
export const PRE_DELETE_KEEP = 3;
/** Rolling-Drossel: sonst rotiert der 30-s-Autosave die Historie in 2,5 Minuten weg. */
export const ROLLING_MIN_INTERVAL_MS = 15 * 60_000;

/** Dateiname eines Slots — Single Source für saves.ts und die Backups (Cloud-Auflage: fix). */
export function slotFileName(id: number): string {
  return `slot-${id}.json`;
}

function slotBackupDir(paths: BackupPaths, slotId: number): string {
  return join(paths.backupsDir, `slot-${slotId}`);
}

const pad = (n: number, width = 2): string => String(n).padStart(width, "0");

/** Dateisystem-sicherer lokaler Zeitstempel `YYYYMMDD-HHMMSS` (Plan: menschliche Lesbarkeit). */
export function formatTimestamp(nowMs: number): string {
  const d = new Date(nowMs);
  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
    `-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  );
}

/** Lokaler Kalendertag `YYYYMMDD` (für daily-Backups). */
export function formatDay(nowMs: number): string {
  const d = new Date(nowMs);
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

/** Liest den Zeitstempel aus `rolling-YYYYMMDD-HHMMSS.json` zurück (lokale Zeit); null = kein Match. */
export function parseRollingStamp(name: string): number | null {
  const m = /^rolling-(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})\.json$/.exec(name);
  if (!m) return null;
  const [, y, mo, da, h, mi, s] = m;
  return new Date(
    Number(y), Number(mo) - 1, Number(da), Number(h), Number(mi), Number(s),
  ).getTime();
}

/**
 * Billiger Envelope-Blick in ein rohes Save-JSON — OHNE deserialize/Content (Plan §3.3/§3.4):
 * `version` für den Pre-Migration-Snapshot, `name`/`elapsedMs` für die Overwrite-Erkennung.
 * null = kein parsebares Save (kaputt/abgeschnitten/fremdes JSON).
 */
export function parseEnvelope(
  json: string,
): { version: number | null; name: string | null; elapsedMs: number | null } | null {
  try {
    const raw = JSON.parse(json) as {
      version?: unknown;
      state?: { character?: { name?: unknown }; elapsedMs?: unknown };
    };
    if (!raw || typeof raw !== "object" || !raw.state || typeof raw.state !== "object") return null;
    const version =
      typeof raw.version === "number" && Number.isFinite(raw.version) ? raw.version : null;
    const nameRaw = raw.state.character?.name;
    const name = typeof nameRaw === "string" ? nameRaw : null;
    const elapsedRaw = raw.state.elapsedMs;
    const elapsedMs =
      typeof elapsedRaw === "number" && Number.isFinite(elapsedRaw) ? elapsedRaw : null;
    return { version, name, elapsedMs };
  } catch {
    return null;
  }
}

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Rename mit 2 kurzen Retries: Antivirus/OneDrive-Locks auf %APPDATA% lassen `rename` auf
 * Windows sporadisch mit EPERM scheitern (Plan §7 „bewährtes Windows-Muster").
 */
async function renameWithRetry(from: string, to: string): Promise<void> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await rename(from, to);
      return;
    } catch (err) {
      lastErr = err;
      await delay(50 * (attempt + 1));
    }
  }
  throw lastErr;
}

/**
 * Paket A — Atomares Schreiben: tmp-Datei (`<ziel>.tmp`) → write → fsync → rename aufs Ziel.
 * fsync VOR dem Rename ist Pflicht: `writeFile` allein garantiert bei Stromausfall nicht, dass
 * die Bytes auf der Platte sind — sonst kann nach dem Rename eine leere/halbe Zieldatei stehen.
 * Node nutzt auf Windows MoveFileEx(REPLACE_EXISTING) → der Tausch ist atomar.
 */
export async function atomicWriteFile(filePath: string, data: string): Promise<void> {
  const tmp = `${filePath}.tmp`; // Endung .tmp → matcht das Cloud-Pattern *.json NIE
  const fh = await open(tmp, "w");
  try {
    await fh.writeFile(data, "utf8");
    await fh.sync();
  } finally {
    await fh.close();
  }
  await renameWithRetry(tmp, filePath);
}

/**
 * Beim App-Start verwaiste `*.tmp` im saves-Ordner löschen (Crash zwischen write und rename).
 * Best-effort: Fehler werden geschluckt (fehlender Ordner beim Erststart ist der Normalfall).
 */
export async function cleanupTmpFiles(savesDir: string): Promise<void> {
  let names: string[];
  try {
    names = await readdir(savesDir);
  } catch {
    return;
  }
  for (const name of names) {
    if (!name.endsWith(".tmp")) continue;
    try {
      await rm(join(savesDir, name), { force: true });
    } catch {
      /* best-effort */
    }
  }
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/** Retention: alle Dateien einer Kategorie über `keep` hinaus löschen — Namens-Sortierung ist
 *  dank nullgepolsterter Zeitstempel chronologisch (Plan §1.4). */
async function pruneByName(dir: string, prefix: string, keep: number): Promise<void> {
  let names: string[];
  try {
    names = await readdir(dir);
  } catch {
    return;
  }
  const matching = names.filter((n) => n.startsWith(prefix) && n.endsWith(".json")).sort();
  const excess = matching.slice(0, Math.max(0, matching.length - keep));
  for (const name of excess) {
    try {
      await rm(join(dir, name), { force: true });
    } catch {
      /* best-effort */
    }
  }
}

/** Retention für pre-migration: numerisch nach Version sortieren (v9 < v55 trotz Namens-Sortierung). */
async function prunePreMigration(dir: string, keep: number): Promise<void> {
  let names: string[];
  try {
    names = await readdir(dir);
  } catch {
    return;
  }
  const entries = names
    .map((n) => ({ name: n, m: /^pre-migration-v(\d+)\.json$/.exec(n) }))
    .filter((e): e is { name: string; m: RegExpExecArray } => e.m !== null)
    .map((e) => ({ name: e.name, version: Number(e.m[1]) }))
    .sort((a, b) => a.version - b.version);
  const excess = entries.slice(0, Math.max(0, entries.length - keep));
  for (const e of excess) {
    try {
      await rm(join(dir, e.name), { force: true });
    } catch {
      /* best-effort */
    }
  }
}

const README_TEXT = `Grim Reach - Save Backups / Spielstand-Backups
===============================================

[EN]
This folder holds automatic LOCAL backups of your save slots. They are kept
outside the Steam Cloud folder on purpose - they are your safety net even if
a cloud sync ever goes wrong.

Categories per slot folder (backups\\slot-N\\):
  rolling-YYYYMMDD-HHMMSS.json  rotating snapshot (max. 1 per 15 min, last 5 kept)
  daily-YYYYMMDD.json           first save of a calendar day (last 3 kept)
  pre-migration-vNN.json        taken before the save was migrated to a newer game version
  pre-overwrite-....json        taken before a slot was overwritten (new game / import)
  pre-delete-....json           taken before a slot was deleted

How to restore a backup:
  1. Close the game completely.
  2. Pick the backup file you want from backups\\slot-N\\.
  3. Copy it into the neighbouring saves\\ folder and rename it to slot-N.json
     (replacing the file that is there).
  4. Start the game and load the slot.

[DE]
Dieser Ordner enthaelt automatische LOKALE Backups deiner Spielstaende. Sie
liegen absichtlich AUSSERHALB des Steam-Cloud-Ordners - so bleiben sie dein
Rettungsanker, selbst wenn ein Cloud-Sync einmal schiefgeht.

Kategorien je Slot-Ordner (backups\\slot-N\\):
  rolling-JJJJMMTT-HHMMSS.json  rollierender Schnappschuss (max. 1 pro 15 Min, letzte 5)
  daily-JJJJMMTT.json           erstes Speichern eines Kalendertages (letzte 3)
  pre-migration-vNN.json        vor der Migration auf eine neuere Spielversion
  pre-overwrite-....json        vor dem Ueberschreiben eines Slots (Neues Spiel / Import)
  pre-delete-....json           vor dem Loeschen eines Slots

Backup wiederherstellen:
  1. Spiel komplett schliessen.
  2. Gewuenschte Backup-Datei aus backups\\slot-N\\ auswaehlen.
  3. In den benachbarten saves\\-Ordner kopieren und in slot-N.json umbenennen
     (vorhandene Datei ersetzen).
  4. Spiel starten und den Slot laden.
`;

/** Legt die README.txt im Backup-Wurzelordner an (einmalig, Existenz-Check via wx-Flag). */
export async function ensureBackupsReadme(backupsDir: string): Promise<void> {
  try {
    await mkdir(backupsDir, { recursive: true });
    await writeFile(join(backupsDir, "README.txt"), README_TEXT, { encoding: "utf8", flag: "wx" });
  } catch {
    /* existiert bereits oder nicht anlegbar — best-effort */
  }
}

/** Ergebnis von backupBeforeWrite — primär für Tests/Logging. */
export type PreWriteBackupResult =
  | "no-existing" // Slot war leer → nichts zu sichern
  | "skipped-corrupt" // Bestand nicht parsebar → NICHT sichern (würde gute Backups wegrotieren)
  | "pre-overwrite" // Charakter-Identität wechselt/Zeit rückläufig → ungedrosseltes Backup
  | "rolling" // normales Rolling- (und ggf. Daily-)Backup
  | "throttled"; // Rolling gedrosselt (< 15 min); ggf. lief trotzdem ein Daily

/**
 * Paket B — Backup der ALTEN Slot-Datei unmittelbar VOR einem `saves:write` (Plan §3.1/§3.4).
 * Immer `copyFile` der rohen Bytes, nie Neu-Serialisieren: das Backup ist garantiert der letzte
 * bekannte gute Zustand.
 *
 * Overwrite-Erkennung (gewählte Variante, Task #288 B): rein Main-seitig über die
 * Charakter-Identität — ein Write gilt als Überschreiben, wenn der Charaktername des neuen
 * Payloads vom Bestand abweicht ODER die Simulationszeit (`state.elapsedMs`) rückläufig ist
 * (Neues Spiel auf belegtem Slot: elapsedMs ≈ 0; Options-Import eines älteren/fremden Stands:
 * Name anders oder Zeit rückläufig). Im normalen Spielbetrieb wächst elapsedMs monoton
 * (Autosave/Offline-Catch-up), es gibt also keine False-Positives; ein False-Negative
 * (Import desselben Charakters mit MEHR Spielzeit) ist semantisch kein Verlustfall.
 * Vorteil gegenüber dem `reason`-IPC-Parameter aus dem Plan: deckt automatisch auch jeden
 * künftigen Overwrite-Pfad ab und braucht keinen Renderer-Vertragszusatz.
 *
 * Korrupter Bestand (JSON nicht parsebar, z. B. Torn-Write vor Einführung des atomaren
 * Schreibens): KEIN rolling/daily/pre-overwrite — kaputte Bytes dürfen die guten Backups
 * nicht aus der Retention drängen. (Beim Löschen sichert backupPreDelete dagegen bewusst
 * IMMER roh, als Forensik-Anker.)
 */
export async function backupBeforeWrite(
  paths: BackupPaths,
  slotId: number,
  incomingJson: string,
  now: number = Date.now(),
): Promise<PreWriteBackupResult> {
  const src = join(paths.savesDir, slotFileName(slotId));
  let existing: string;
  try {
    existing = await readFile(src, "utf8");
  } catch {
    return "no-existing";
  }
  const oldEnv = parseEnvelope(existing);
  if (!oldEnv) return "skipped-corrupt";

  const dir = slotBackupDir(paths, slotId);
  await mkdir(dir, { recursive: true });
  await ensureBackupsReadme(paths.backupsDir);

  // Overwrite-Erkennung (siehe Funktions-Doku): Name wechselt oder Sim-Zeit rückläufig.
  const newEnv = parseEnvelope(incomingJson);
  const isOverwrite =
    !!newEnv &&
    ((oldEnv.name !== null && newEnv.name !== null && newEnv.name !== oldEnv.name) ||
      (oldEnv.elapsedMs !== null && newEnv.elapsedMs !== null && newEnv.elapsedMs < oldEnv.elapsedMs));
  if (isOverwrite) {
    await copyFile(src, join(dir, `pre-overwrite-${formatTimestamp(now)}.json`));
    await pruneByName(dir, "pre-overwrite-", PRE_OVERWRITE_KEEP);
    return "pre-overwrite";
  }

  const names = await readdir(dir);

  // Daily: erstes Write des Kalendertages sichert den Vortags-Stand (Existenz-Check, letzte 3).
  const dailyName = `daily-${formatDay(now)}.json`;
  if (!names.includes(dailyName)) {
    await copyFile(src, join(dir, dailyName));
    await pruneByName(dir, "daily-", DAILY_KEEP);
  }

  // Rolling: max. 1 pro 15 Minuten (Drossel über den Zeitstempel im Dateinamen), letzte 5.
  let newestRolling: number | null = null;
  for (const name of names) {
    const stamp = parseRollingStamp(name);
    if (stamp !== null && (newestRolling === null || stamp > newestRolling)) newestRolling = stamp;
  }
  if (newestRolling !== null && now - newestRolling < ROLLING_MIN_INTERVAL_MS) {
    return "throttled";
  }
  await copyFile(src, join(dir, `rolling-${formatTimestamp(now)}.json`));
  await pruneByName(dir, "rolling-", ROLLING_KEEP);
  return "rolling";
}

/**
 * Paket B — Snapshot VOR dem Löschen (`saves:remove`), immer und ungedrosselt (Plan §3.2).
 * Bewusst auch bei korruptem Bestand (rohe Bytes): Löschen ist endgültig, jede Spur zählt.
 */
export async function backupPreDelete(
  paths: BackupPaths,
  slotId: number,
  now: number = Date.now(),
): Promise<boolean> {
  const src = join(paths.savesDir, slotFileName(slotId));
  if (!(await fileExists(src))) return false;
  const dir = slotBackupDir(paths, slotId);
  await mkdir(dir, { recursive: true });
  await ensureBackupsReadme(paths.backupsDir);
  await copyFile(src, join(dir, `pre-delete-${formatTimestamp(now)}.json`));
  await pruneByName(dir, "pre-delete-", PRE_DELETE_KEEP);
  return true;
}

/**
 * Paket B — Snapshot VOR der Migration (Plan §3.3): wird von saves.ts beim Slot-READ ausgelöst,
 * wenn der Envelope `version < SAVE_VERSION` trägt. 1 Datei je Versionssprung (Existenz-Check),
 * letzte 3 Versionen. Direkt nach einem Spiel-Update sichert so schon der Menü-Besuch (readAll)
 * alle Alt-Slots — bevor irgendein Load/Autosave die Migration festschreibt.
 */
export async function backupPreMigration(
  paths: BackupPaths,
  slotId: number,
  oldVersion: number,
): Promise<boolean> {
  const src = join(paths.savesDir, slotFileName(slotId));
  const dir = slotBackupDir(paths, slotId);
  const dest = join(dir, `pre-migration-v${oldVersion}.json`);
  if (await fileExists(dest)) return false;
  if (!(await fileExists(src))) return false;
  await mkdir(dir, { recursive: true });
  await ensureBackupsReadme(paths.backupsDir);
  await copyFile(src, dest);
  await prunePreMigration(dir, PRE_MIGRATION_KEEP);
  return true;
}

export interface BackupFileEntry {
  /** Dateiname (z. B. `rolling-20260708-184500.json`) — trägt Kategorie + Zeitstempel. */
  name: string;
  /** Datei-Änderungszeit (Fallback-Sortierung, wenn das JSON kein savedAt hergibt). */
  mtimeMs: number;
  /** Roher JSON-Inhalt des Backups. */
  json: string;
}

/**
 * Paket D-Zulieferung — alle Backups eines Slots (neueste zuerst nach mtime), roher Inhalt.
 * Der Renderer probiert sie der Reihe nach mit `deserialize` (Selbstheilung, Plan §4.1).
 * Datenmenge unkritisch: ≤ 17 Dateien × ~12 KB.
 */
export async function listBackups(paths: BackupPaths, slotId: number): Promise<BackupFileEntry[]> {
  const dir = slotBackupDir(paths, slotId);
  let names: string[];
  try {
    names = await readdir(dir);
  } catch {
    return [];
  }
  const out: BackupFileEntry[] = [];
  for (const name of names) {
    if (!name.endsWith(".json")) continue;
    try {
      const full = join(dir, name);
      const st = await stat(full);
      out.push({ name, mtimeMs: st.mtimeMs, json: await readFile(full, "utf8") });
    } catch {
      /* Datei zwischenzeitlich weg/gesperrt → überspringen */
    }
  }
  out.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return out;
}
