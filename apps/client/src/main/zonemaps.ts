import { app, ipcMain } from "electron";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

/**
 * Schreibt eine ZoneMap-JSON in den Quell-Ordner des Renderers, damit sie
 * committed werden kann und Vite-HMR sie sofort neu lädt.
 *
 * Pfad-Auflösung:
 *   In electron-vite-dev ist process.cwd() typisch `apps/client`.
 *   Wir suchen daher relativ zu `__dirname` (= out/main/) und traversieren
 *   zurück zur Monorepo-Wurzel, um dann `apps/client/src/renderer/assets/zonemaps/`
 *   aufzulösen. Als Fallback wird process.cwd() genutzt.
 *
 *   __dirname ist im gebauten Main: <root>/apps/client/out/main/
 *   __dirname im dev (ts-node / electron-vite): <root>/apps/client/src/main/
 */

function resolveZoneMapsDir(): string {
  // Navigiere von out/main/ oder src/main/ zurück zu apps/client/,
  // dann weiter zum Renderer-Assets-Ordner.
  // join(__dirname, "../../..") liefert apps/client/ (bei dist) oder sogar tiefer —
  // daher suchen wir nach dem Marker "apps/client" im Pfad.
  const cwd = process.cwd(); // i.d.R. apps/client in electron-vite

  // Primär: relativ zu process.cwd() (electron-vite-dev setzt cwd auf apps/client)
  const fromCwd = resolve(cwd, "src/renderer/assets/zonemaps");

  // Sekundär: relativ zu __dirname (robust wenn cwd abweicht)
  // __dirname = .../apps/client/out/main  → viermal hoch = apps/client
  // __dirname = .../apps/client/src/main  → dreimal hoch  = apps/client
  // Wähle den längeren Pfad, der "apps/client" enthält — both produce same result.
  const fromDir = resolve(__dirname, "../../../../src/renderer/assets/zonemaps");

  // Bevorzuge fromCwd wenn er "apps/client" enthält (zuverlässig in dev).
  if (cwd.includes("apps") || cwd.includes("client")) {
    return fromCwd;
  }
  return fromDir;
}

/** Sanitizes zoneId: only lowercase letters, digits, hyphens, underscores allowed. */
function sanitizeZoneId(id: unknown): string | null {
  if (typeof id !== "string") return null;
  if (!/^[a-z0-9_-]+$/.test(id)) return null;
  return id;
}

/** Registriert den zonemaps:write IPC-Handler. Nur im Dev-Modus aktiv. */
export function registerZoneMapHandlers(): void {
  ipcMain.handle(
    "zonemaps:write",
    async (
      _event,
      rawZoneId: unknown,
      json: unknown,
    ): Promise<{ ok: boolean; path?: string; error?: string }> => {
      // Dev-only guard
      if (app.isPackaged) {
        return { ok: false, error: "Zone map writing is only available in dev mode." };
      }

      const zoneId = sanitizeZoneId(rawZoneId);
      if (!zoneId) {
        return { ok: false, error: `Invalid zoneId: ${String(rawZoneId)}` };
      }
      if (typeof json !== "string") {
        return { ok: false, error: "json must be a string" };
      }

      const dir = resolveZoneMapsDir();
      const filePath = join(dir, `${zoneId}.json`);

      console.log(`[zonemaps] Writing zone map to: ${filePath}`);

      try {
        await mkdir(dir, { recursive: true });
        await writeFile(filePath, json, "utf8");
        console.log(`[zonemaps] Written successfully: ${filePath}`);
        return { ok: true, path: filePath };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[zonemaps] Write failed: ${message}`);
        return { ok: false, error: message };
      }
    },
  );
}
