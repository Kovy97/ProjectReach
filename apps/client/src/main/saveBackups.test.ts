import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  atomicWriteFile,
  backupBeforeWrite,
  backupPreAscend,
  backupPreDelete,
  backupPreMigration,
  cleanupTmpFiles,
  DAILY_KEEP,
  formatDay,
  formatTimestamp,
  listBackups,
  parseEnvelope,
  parseRollingStamp,
  PRE_ASCEND_KEEP,
  PRE_MIGRATION_KEEP,
  ROLLING_KEEP,
  ROLLING_MIN_INTERVAL_MS,
  slotFileName,
} from "./saveBackups";
import type { BackupPaths } from "./saveBackups";

/**
 * Unit-Tests fürs Save-Backup-Modul (Task #288 E / Plan §7 Testplan Punkt 1):
 * Dependency-Injection (savesDir/backupsDir) → headless mit Temp-Verzeichnis testbar.
 * Zeit läuft überall als expliziter `now`-Parameter mit — deterministisch, keine Wanduhr.
 */

let root: string;
let paths: BackupPaths;

/** Minimal-Envelope wie `serialize` ihn schreibt (version/savedAt/state.character.name/elapsedMs). */
function makeSave(opts: { version?: number; name?: string; elapsedMs?: number; savedAt?: number } = {}): string {
  return JSON.stringify({
    version: opts.version ?? 56,
    savedAt: opts.savedAt ?? 1_700_000_000_000,
    summary: { name: opts.name ?? "Testa", totalLevel: 3, elapsedMs: opts.elapsedMs ?? 1000, savedAt: opts.savedAt ?? 1_700_000_000_000 },
    state: { character: { name: opts.name ?? "Testa" }, elapsedMs: opts.elapsedMs ?? 1000 },
  });
}

async function writeSlotFile(slotId: number, json: string): Promise<void> {
  await mkdir(paths.savesDir, { recursive: true });
  await writeFile(join(paths.savesDir, slotFileName(slotId)), json, "utf8");
}

async function backupNames(slotId: number): Promise<string[]> {
  try {
    return (await readdir(join(paths.backupsDir, `slot-${slotId}`))).sort();
  } catch {
    return [];
  }
}

/** Lokale Zeit als fixer Anker (kein UTC-Kippen um Mitternacht im Test). */
const T0 = new Date(2026, 6, 8, 12, 0, 0).getTime(); // 2026-07-08 12:00:00 lokal

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "grim-backups-"));
  paths = { savesDir: join(root, "saves"), backupsDir: join(root, "backups") };
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("atomicWriteFile (Paket A)", () => {
  it("schreibt Inhalt, ersetzt Bestand und hinterlässt keine tmp-Datei", async () => {
    await mkdir(paths.savesDir, { recursive: true });
    const target = join(paths.savesDir, slotFileName(0));
    await atomicWriteFile(target, "eins");
    expect(await readFile(target, "utf8")).toBe("eins");
    await atomicWriteFile(target, "zwei");
    expect(await readFile(target, "utf8")).toBe("zwei");
    const names = await readdir(paths.savesDir);
    expect(names).toEqual([slotFileName(0)]); // kein slot-0.json.tmp übrig
  });

  it("nutzt eine .tmp-Endung (matcht das Cloud-Pattern *.json nie)", async () => {
    // Indirekter Nachweis über cleanupTmpFiles: eine verwaiste tmp-Datei aus einem Crash
    // zwischen write und rename heißt `<ziel>.tmp` und wird beim Start weggeräumt.
    await mkdir(paths.savesDir, { recursive: true });
    await writeFile(join(paths.savesDir, "slot-1.json.tmp"), "halb geschrieben", "utf8");
    await writeFile(join(paths.savesDir, "slot-1.json"), makeSave(), "utf8");
    await cleanupTmpFiles(paths.savesDir);
    expect((await readdir(paths.savesDir)).sort()).toEqual(["slot-1.json"]);
  });

  it("cleanupTmpFiles ist ohne saves-Ordner ein stiller No-op", async () => {
    await expect(cleanupTmpFiles(join(root, "gibt-es-nicht"))).resolves.toBeUndefined();
  });
});

describe("parseEnvelope", () => {
  it("liest version/name/elapsedMs aus einem gültigen Envelope", () => {
    const env = parseEnvelope(makeSave({ version: 55, name: "Mara", elapsedMs: 42 }));
    expect(env).toEqual({ version: 55, name: "Mara", elapsedMs: 42 });
  });

  it("liefert null für kaputtes/fremdes JSON", () => {
    expect(parseEnvelope("{ abgeschnitten")).toBeNull();
    expect(parseEnvelope('"nur ein string"')).toBeNull();
    expect(parseEnvelope('{"kein":"save"}')).toBeNull();
  });

  it("parseRollingStamp round-trippt mit formatTimestamp", () => {
    const name = `rolling-${formatTimestamp(T0)}.json`;
    expect(parseRollingStamp(name)).toBe(T0);
    expect(parseRollingStamp("daily-20260708.json")).toBeNull();
  });
});

describe("backupBeforeWrite: rolling + daily (Paket B)", () => {
  it("leerer Slot → kein Backup", async () => {
    expect(await backupBeforeWrite(paths, 0, makeSave(), T0)).toBe("no-existing");
    expect(await backupNames(0)).toEqual([]);
  });

  it("erstes Write sichert rolling + daily; direkt folgendes Write ist gedrosselt", async () => {
    await writeSlotFile(0, makeSave({ elapsedMs: 1000 }));
    expect(await backupBeforeWrite(paths, 0, makeSave({ elapsedMs: 2000 }), T0)).toBe("rolling");
    const first = await backupNames(0);
    expect(first).toContain(`rolling-${formatTimestamp(T0)}.json`);
    expect(first).toContain(`daily-${formatDay(T0)}.json`);

    // 30 s später (Autosave-Takt): Drossel greift, kein zweites Rolling, kein zweites Daily.
    expect(await backupBeforeWrite(paths, 0, makeSave({ elapsedMs: 3000 }), T0 + 30_000)).toBe("throttled");
    expect(await backupNames(0)).toEqual(first);

    // Nach Ablauf der Drossel: neues Rolling.
    expect(
      await backupBeforeWrite(paths, 0, makeSave({ elapsedMs: 4000 }), T0 + ROLLING_MIN_INTERVAL_MS),
    ).toBe("rolling");
    expect((await backupNames(0)).filter((n) => n.startsWith("rolling-"))).toHaveLength(2);
  });

  it("Rolling-Retention behält exakt die neuesten 5", async () => {
    await writeSlotFile(0, makeSave({ elapsedMs: 1 }));
    for (let i = 0; i < ROLLING_KEEP + 2; i++) {
      await backupBeforeWrite(paths, 0, makeSave({ elapsedMs: (i + 2) * 1000 }), T0 + i * ROLLING_MIN_INTERVAL_MS);
      // Slot wächst mit (sonst griffe die Overwrite-Erkennung):
      await writeSlotFile(0, makeSave({ elapsedMs: (i + 2) * 1000 }));
    }
    const rolling = (await backupNames(0)).filter((n) => n.startsWith("rolling-"));
    expect(rolling).toHaveLength(ROLLING_KEEP);
    // Die ältesten beiden (T0, T0+15min) sind wegrotiert:
    expect(rolling).not.toContain(`rolling-${formatTimestamp(T0)}.json`);
    expect(rolling).not.toContain(`rolling-${formatTimestamp(T0 + ROLLING_MIN_INTERVAL_MS)}.json`);
  });

  it("Daily: 1 pro Kalendertag, Retention 3", async () => {
    await writeSlotFile(0, makeSave({ elapsedMs: 1 }));
    const day = 24 * 60 * 60 * 1000;
    for (let d = 0; d < DAILY_KEEP + 2; d++) {
      await backupBeforeWrite(paths, 0, makeSave({ elapsedMs: (d + 2) * 1000 }), T0 + d * day);
      await writeSlotFile(0, makeSave({ elapsedMs: (d + 2) * 1000 }));
    }
    const daily = (await backupNames(0)).filter((n) => n.startsWith("daily-"));
    expect(daily).toHaveLength(DAILY_KEEP);
    expect(daily).not.toContain(`daily-${formatDay(T0)}.json`);
  });

  it("korrupter Bestand wird NICHT in die Rotation aufgenommen", async () => {
    await writeSlotFile(0, makeSave().slice(0, 40)); // Torn-Write-Simulation
    expect(await backupBeforeWrite(paths, 0, makeSave(), T0)).toBe("skipped-corrupt");
    expect(await backupNames(0)).toEqual([]);
  });
});

describe("backupBeforeWrite: Overwrite-Erkennung (Paket B, gewählte Main-seitige Variante)", () => {
  it("Neues Spiel auf belegtem Slot (elapsedMs rückläufig) → pre-overwrite, ungedrosselt", async () => {
    await writeSlotFile(0, makeSave({ name: "Alt", elapsedMs: 999_999 }));
    // Direkt vorher ein Rolling (Drossel wäre aktiv) — pre-overwrite muss trotzdem greifen:
    await backupBeforeWrite(paths, 0, makeSave({ name: "Alt", elapsedMs: 1_000_000 }), T0);
    const res = await backupBeforeWrite(paths, 0, makeSave({ name: "Neu", elapsedMs: 0 }), T0 + 1000);
    expect(res).toBe("pre-overwrite");
    const names = await backupNames(0);
    expect(names).toContain(`pre-overwrite-${formatTimestamp(T0 + 1000)}.json`);
    // Das Backup trägt die ROHEN alten Bytes:
    const backed = await readFile(
      join(paths.backupsDir, "slot-0", `pre-overwrite-${formatTimestamp(T0 + 1000)}.json`),
      "utf8",
    );
    expect(parseEnvelope(backed)?.name).toBe("Alt");
  });

  it("Import eines älteren Stands desselben Charakters (Zeit rückläufig) → pre-overwrite", async () => {
    await writeSlotFile(0, makeSave({ name: "Mara", elapsedMs: 50_000 }));
    expect(await backupBeforeWrite(paths, 0, makeSave({ name: "Mara", elapsedMs: 10_000 }), T0)).toBe(
      "pre-overwrite",
    );
  });

  it("normales Autosave (gleicher Name, Zeit wächst) → KEIN pre-overwrite", async () => {
    await writeSlotFile(0, makeSave({ name: "Mara", elapsedMs: 1000 }));
    expect(await backupBeforeWrite(paths, 0, makeSave({ name: "Mara", elapsedMs: 2000 }), T0)).toBe("rolling");
    expect((await backupNames(0)).some((n) => n.startsWith("pre-overwrite-"))).toBe(false);
  });

  it("pre-overwrite-Retention behält 3", async () => {
    for (let i = 0; i < 5; i++) {
      await writeSlotFile(0, makeSave({ name: `Alt${i}`, elapsedMs: 9_999 }));
      await backupBeforeWrite(paths, 0, makeSave({ name: `Neu${i}`, elapsedMs: 0 }), T0 + i * 60_000);
    }
    expect((await backupNames(0)).filter((n) => n.startsWith("pre-overwrite-"))).toHaveLength(3);
  });
});

describe("backupPreDelete (Paket B)", () => {
  it("sichert vor dem Löschen — auch korrupte Bestände (Forensik-Anker)", async () => {
    await writeSlotFile(0, "{ kaputt");
    expect(await backupPreDelete(paths, 0, T0)).toBe(true);
    expect(await backupNames(0)).toContain(`pre-delete-${formatTimestamp(T0)}.json`);
  });

  it("leerer Slot → false, kein Backup", async () => {
    expect(await backupPreDelete(paths, 3, T0)).toBe(false);
    expect(await backupNames(3)).toEqual([]);
  });
});

// claude:2026-10-17T23:30:00+02:00 — Prestige-Aufstieg (SAVE 88, Welle B1): Sicherung vor dem Aufstieg.
describe("backupPreAscend (Prestige, SAVE 88)", () => {
  it("sichert den Bestand byte-genau, ungedrosselt, Retention 3", async () => {
    const json = makeSave({ version: 88, name: "Asche", elapsedMs: 5_000 });
    await writeSlotFile(1, json);
    expect(await backupPreAscend(paths, 1, T0)).toBe("pre-ascend");
    const name = `pre-ascend-${formatTimestamp(T0)}.json`;
    expect(await backupNames(1)).toContain(name);
    expect(await readFile(join(paths.backupsDir, "slot-1", name), "utf8")).toBe(json);
    // Ungedrosselt: jede Sekunde ein eigener Stand; nur die jüngsten PRE_ASCEND_KEEP bleiben.
    for (let i = 1; i <= 4; i++) expect(await backupPreAscend(paths, 1, T0 + i * 1_000)).toBe("pre-ascend");
    const kept = (await backupNames(1)).filter((n) => n.startsWith("pre-ascend-"));
    expect(kept).toHaveLength(PRE_ASCEND_KEEP);
    expect(kept).not.toContain(name);
    expect(kept).toContain(`pre-ascend-${formatTimestamp(T0 + 4_000)}.json`);
  });

  it("leerer Slot → no-existing; korrupter Bestand → skipped-corrupt, ohne Datei", async () => {
    expect(await backupPreAscend(paths, 2, T0)).toBe("no-existing");
    await writeSlotFile(2, "{ kaputt");
    expect(await backupPreAscend(paths, 2, T0)).toBe("skipped-corrupt");
    expect((await backupNames(2)).filter((n) => n.startsWith("pre-ascend-"))).toEqual([]);
  });
});

describe("backupPreMigration (Paket B)", () => {
  it("sichert genau EINMAL pro Alt-Version (Existenz-Check)", async () => {
    await writeSlotFile(0, makeSave({ version: 55 }));
    expect(await backupPreMigration(paths, 0, 55)).toBe(true);
    expect(await backupPreMigration(paths, 0, 55)).toBe(false); // idempotent
    expect((await backupNames(0)).filter((n) => n.startsWith("pre-migration-"))).toEqual([
      "pre-migration-v55.json",
    ]);
  });

  it("Retention: behält die 3 höchsten Versionen (numerisch, v9 < v55)", async () => {
    await writeSlotFile(0, makeSave());
    for (const v of [9, 40, 41, 55]) await backupPreMigration(paths, 0, v);
    const names = (await backupNames(0)).filter((n) => n.startsWith("pre-migration-"));
    expect(names).toHaveLength(PRE_MIGRATION_KEEP);
    expect(names).not.toContain("pre-migration-v9.json");
  });
});

describe("listBackups (Paket D-Zulieferung)", () => {
  it("liefert alle Backups mit Inhalt, neueste (mtime) zuerst; ohne Ordner leere Liste", async () => {
    expect(await listBackups(paths, 0)).toEqual([]);

    await writeSlotFile(0, makeSave({ name: "Mara", elapsedMs: 100 }));
    await backupPreMigration(paths, 0, 55);
    await backupBeforeWrite(paths, 0, makeSave({ name: "Mara", elapsedMs: 200 }), T0);

    const list = await listBackups(paths, 0);
    const names = list.map((e) => e.name).sort();
    expect(names).toEqual([`daily-${formatDay(T0)}.json`, "pre-migration-v55.json", `rolling-${formatTimestamp(T0)}.json`]);
    for (const entry of list) {
      expect(parseEnvelope(entry.json)?.name).toBe("Mara");
      expect(entry.mtimeMs).toBeGreaterThan(0);
    }
    // Sortierung: mtime absteigend.
    for (let i = 1; i < list.length; i++) {
      expect(list[i - 1]!.mtimeMs).toBeGreaterThanOrEqual(list[i]!.mtimeMs);
    }
  });
});

describe("README + Selbstheilungs-Fallback-Auswahl", () => {
  it("legt beim ersten Backup eine README.txt in der Backup-Wurzel an", async () => {
    await writeSlotFile(0, makeSave());
    await backupBeforeWrite(paths, 0, makeSave({ elapsedMs: 2000 }), T0);
    const readme = await readFile(join(paths.backupsDir, "README.txt"), "utf8");
    expect(readme).toContain("slot-N.json");
  });

  it("Crash-mid-write-Kette: kaputter Slot, gültiges Backup → Backup ist als einziges parsebar", async () => {
    // Deckt die pure Auswahl-Logik der Selbstheilung ab (Plan §7 Punkt 2b): aus der Liste
    // gewinnt der neueste PARSEBARE Kandidat; der kaputte Slot selbst scheidet aus.
    await writeSlotFile(0, makeSave({ name: "Mara", elapsedMs: 5000 }));
    await backupBeforeWrite(paths, 0, makeSave({ name: "Mara", elapsedMs: 6000 }), T0);
    // Torn-Write über den Slot legen:
    await writeSlotFile(0, makeSave({ name: "Mara", elapsedMs: 6000 }).slice(0, 64));
    expect(parseEnvelope(await readFile(join(paths.savesDir, slotFileName(0)), "utf8"))).toBeNull();
    const candidates = await listBackups(paths, 0);
    const winner = candidates.find((c) => parseEnvelope(c.json) !== null);
    expect(winner).toBeDefined();
    expect(parseEnvelope(winner!.json)?.name).toBe("Mara");
  });
});
