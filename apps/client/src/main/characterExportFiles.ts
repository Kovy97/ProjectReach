import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Reine Dateisystem-Logik des Prompt-Extractors (main/characterExport.ts registriert nur noch den
 * IPC-Handler drumherum) — KEIN `electron`-Import, dadurch headless mit vitest testbar (Muster
 * saveBackups.ts/saveBackups.test.ts: die Electron-Fassade bleibt dünn, die eigentliche Logik lebt
 * in einem plain-Node-Modul).
 */

/** Bereinigt einen (nicht vertrauenswürdigen) Charakternamen zu einem dateisystemsicheren
 *  Ordner-Präfix: NUR `[A-Za-z0-9_-]`, alles andere wird zu `_`; führende/folgende `_` fallen weg;
 *  leer/nur-Sonderzeichen → "Charakter". Auf 60 Zeichen gekappt (keine sinnlos langen Pfade). */
export function sanitizeExportName(name: string): string {
  const cleaned = name
    .replace(/[^A-Za-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
  return cleaned || "Charakter";
}

/** Zeitstempel-Suffix "yyyy-mm-dd-hhmm" (lokale Zeit) für den Export-Ordnernamen. */
export function exportTimestamp(now: Date): string {
  const p = (n: number): string => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}-${p(now.getHours())}${p(now.getMinutes())}`;
}

/** Kompletter Ordnername (ohne Pfad) für einen Export — `<sicherer Name>-<Zeitstempel>`. */
export function exportFolderName(characterName: string, now: Date): string {
  return `${sanitizeExportName(characterName)}-${exportTimestamp(now)}`;
}

export interface CharacterExportFile {
  /** Exakter Dateiname — main/characterExport.ts lässt NUR die drei erwarteten Namen durch. */
  name: string;
  /** PNG als `data:image/png;base64,…` (für kit.png/portrait.png). */
  dataUrl?: string;
  /** Klartext (für prompt.txt). */
  text?: string;
}

function decodePngDataUrl(dataUrl: string): Buffer | null {
  const match = /^data:image\/png;base64,([a-zA-Z0-9+/=]+)$/.exec(dataUrl);
  if (!match) return null;
  try {
    return Buffer.from(match[1]!, "base64");
  } catch {
    return null;
  }
}

/**
 * Schreibt die Export-Dateien nach `dir` (wird bei Bedarf inkl. Eltern-Ordnern angelegt). Gibt die
 * Anzahl tatsächlich geschriebener Dateien zurück — eine einzelne kaputte/leere Datei (z.B. eine
 * defekte PNG-Daten-URL) überspringt NUR sich selbst statt den ganzen Export zu werfen, damit ein
 * Bild-Problem nicht auch noch das (garantiert unabhängige) Prompt-Textfile mitreißt.
 */
export async function writeExportFiles(dir: string, files: CharacterExportFile[]): Promise<number> {
  await mkdir(dir, { recursive: true });
  let written = 0;
  for (const file of files) {
    if (file.text !== undefined) {
      await writeFile(join(dir, file.name), file.text, "utf8");
      written++;
      continue;
    }
    if (file.dataUrl) {
      const buf = decodePngDataUrl(file.dataUrl);
      if (!buf || buf.byteLength === 0) continue;
      await writeFile(join(dir, file.name), buf);
      written++;
    }
  }
  return written;
}
