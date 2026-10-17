import { MAX_SAVE_SLOTS } from "@hearthforge/shared";

/**
 * Dünner Wrapper um die Electron-Save-Bridge mit localStorage-Fallback, damit
 * der reine Web-Build (ohne Electron) ebenfalls speichern kann.
 */
const bridge = window.hearthforge?.saves;
const lsKey = (id: number): string => `hearthforge:save:${id}`;

export async function readAllSlots(): Promise<Array<string | null>> {
  if (bridge) return bridge.readAll();
  const out: Array<string | null> = [];
  for (let i = 0; i < MAX_SAVE_SLOTS; i++) out.push(localStorage.getItem(lsKey(i)));
  return out;
}

export async function readSlot(id: number): Promise<string | null> {
  if (bridge) return bridge.read(id);
  return localStorage.getItem(lsKey(id));
}

export async function writeSlot(id: number, json: string): Promise<void> {
  if (bridge) return bridge.write(id, json);
  localStorage.setItem(lsKey(id), json);
}

/**
 * codex:2026-08-31T22:04:00+02:00 — persistiert Quell- und Zielsave gemeinsam. Electron nutzt
 * ein Crash-Recovery-Journal; der Web-Fallback stellt bei einem zweiten Schreibfehler beide
 * vorherigen localStorage-Werte wieder her.
 */
export async function writeSlotPair(
  firstId: number,
  firstJson: string,
  secondId: number,
  secondJson: string,
): Promise<void> {
  if (firstId === secondId) throw new Error("Quell- und Zielslot müssen verschieden sein.");
  if (bridge?.writePair) return bridge.writePair(firstId, firstJson, secondId, secondJson);
  const firstKey = lsKey(firstId);
  const secondKey = lsKey(secondId);
  const beforeFirst = localStorage.getItem(firstKey);
  const beforeSecond = localStorage.getItem(secondKey);
  try {
    localStorage.setItem(firstKey, firstJson);
    localStorage.setItem(secondKey, secondJson);
  } catch (error) {
    if (beforeFirst === null) localStorage.removeItem(firstKey);
    else localStorage.setItem(firstKey, beforeFirst);
    if (beforeSecond === null) localStorage.removeItem(secondKey);
    else localStorage.setItem(secondKey, beforeSecond);
    throw error;
  }
}

export async function removeSlot(id: number): Promise<void> {
  if (bridge) return bridge.remove(id);
  localStorage.removeItem(lsKey(id));
}

/**
 * Backups eines Slots (neueste zuerst) für die Selbstheilung bei kaputtem Slot (Task #288 D).
 * Web-Build ohne Electron: bewusst KEINE Backups (Dev-/Audit-Pfad, Plan §3.5) → leere Liste.
 */
export async function readSlotBackups(id: number): Promise<SaveBackupEntry[]> {
  if (bridge?.readBackups) return bridge.readBackups(id);
  return [];
}

/** Öffnet den lokalen Backup-Ordner im Datei-Explorer (nur Electron; Web-Build: no-op). */
export async function openBackupsFolder(): Promise<void> {
  if (bridge?.openBackupsFolder) return bridge.openBackupsFolder();
}
