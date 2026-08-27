import { ipcMain } from "electron";
import { steamApiName } from "./steamAchievements";

/**
 * Steam-Integration (steamworks.js) — VOLLSTÄNDIG VERDRAHTET, aber INERT bis der Chef die echte
 * Steam-AppID registriert. Ohne installiertes `steamworks.js` ODER mit STEAM_APP_ID = 0 ist alles
 * ein No-Op: das Spiel läuft normal weiter, auch außerhalb von Steam (Itch/Direkt-Download).
 *
 * SCHARFSCHALTEN, sobald die AppID da ist (siehe design/release-readiness.md → „Steam scharf schalten"):
 *   1. pnpm add steamworks.js --filter @hearthforge/client
 *   2. STEAM_APP_ID unten auf die echte, im Steamworks-Backend registrierte AppID setzen
 *      (oder die Umgebungsvariable GRIMREACH_STEAM_APPID beim Start setzen).
 *   3. steam_appid.txt (nur die AppID als Zahl) für die Dev-Ausführung neben die Executable legen.
 *   4. Im Steamworks-Partner-Backend die 67 Achievements aus design/achievements-1.2.0/steam-set.csv
 *      anlegen (API-Namen exakt wie in steamAchievements.ts) und die Konfiguration VERÖFFENTLICHEN.
 *
 * Achievements 1.2.0 (27.08.2026): das Mapping ist gefüllt (steamAchievements.ts, 67 Paare, Wächter-
 * Test gegen den Content). Nur gemappte IDs werden gemeldet; das frühere 1:1-Namensfallback ist aus.
 * steamworks.js und die AppID setzt der Chef zusammen mit logic-dev (bewusst NICHT hier).
 */

/**
 * CHEF-ENTSCHEID 2026-07-13: KEINE Steam-Achievements zum EA-Start — Integration bleibt bewusst
 * INERT (Default 0, steamworks.js nicht installiert). Die echte AppID ist dokumentiert: 4915450
 * (Partner-Backend „Grim Reach"). Falls Achievements später gewünscht: Scharfschalt-Schritte im
 * Kopfkommentar + kuratierte Backend-Liste in design/steam-achievements-export.md.
 * Steam-CLOUD braucht diesen Code NICHT (Auto-Cloud synct %APPDATA%\Grim Reach\saves\ selbst).
 */
const STEAM_APP_ID = Number(process.env["GRIMREACH_STEAM_APPID"] ?? 0);


/** Minimale Teil-Signatur der steamworks.js-Client-API, die wir tatsächlich nutzen. */
type SteamClient = {
  achievement: {
    activate(name: string): boolean;
    isActivated(name: string): boolean;
  };
  localplayer: { getName(): string };
};

let steam: SteamClient | null = null;

/**
 * Runtime-`require`, das der Bundler NICHT statisch auflöst. steamworks.js ist eine OPTIONALE
 * native Abhängigkeit, die (noch) nicht installiert ist — ein normaler `import`/`require`-Literal
 * würde beim Build hart fehlschlagen. `eval("require")` liefert das echte CJS-require zur Laufzeit,
 * und der aus einer Variablen gelesene Modulname bleibt für Rollup unsichtbar. Fehlt das Paket,
 * fällt der try/catch sauber auf `null` zurück.
 */
function loadSteamworks(): { init(appId: number): SteamClient } | null {
  try {
    const moduleName = "steamworks.js";
    // eslint-disable-next-line no-eval
    const req = eval("require") as NodeRequire;
    return req(moduleName) as { init(appId: number): SteamClient };
  } catch {
    return null;
  }
}

/**
 * Initialisiert Steam, falls eine AppID gesetzt UND steamworks.js installiert ist. Andernfalls
 * No-Op (Spiel läuft ohne Steam weiter). Vor dem Erstellen des Fensters aufrufen.
 */
export function initSteam(): void {
  if (!Number.isInteger(STEAM_APP_ID) || STEAM_APP_ID <= 0) {
    console.log("[steam] deaktiviert (keine AppID gesetzt) — läuft ohne Steam.");
    return;
  }
  const sw = loadSteamworks();
  if (!sw) {
    console.warn("[steam] steamworks.js nicht installiert — Steam-Features aus.");
    return;
  }
  try {
    steam = sw.init(STEAM_APP_ID);
    console.log("[steam] initialisiert, Spieler:", steam.localplayer.getName());
  } catch (err) {
    console.warn("[steam] nicht unter Steam gestartet — Overlay/Achievements aus.", err);
    steam = null;
  }
}

/**
 * Schaltet EIN Steam-Achievement frei (idempotent). No-Op ohne aktive Steam-Verbindung und für
 * In-Game-only-Erfolge ohne Steam-Mapping (steamApiName → null; kein Backend-Fehlversuch, kein Log-Rauschen).
 * Der Sync beim Start (steam:achievement-sync) läuft über dieselbe Funktion und zieht Alt-Fortschritt
 * nach — auch die neuen 1.2.0-Erfolge, die die Engine beim ersten Tick rückwirkend freischaltet.
 */
export function unlockAchievement(internalId: string): void {
  if (!steam) return;
  try {
    const name = steamApiName(internalId);
    if (name === null) return;
    if (!steam.achievement.isActivated(name)) steam.achievement.activate(name);
  } catch (err) {
    console.warn("[steam] Achievement konnte nicht gesetzt werden:", internalId, err);
  }
}

/**
 * Registriert die IPC-Handler, über die der Renderer freigeschaltete Achievements meldet:
 *   • steam:achievement-unlock — eine neu freigeschaltete ID (im Spiel erworben)
 *   • steam:achievement-sync   — die komplette Menge bereits freigeschalteter IDs (einmalig beim
 *                                Laden eines Spielstands, damit Alt-Fortschritt zu Steam nachzieht)
 * Vor dem Erstellen des Fensters aufrufen. Ohne aktive Steam-Verbindung sind beide No-Ops.
 */
export function registerSteamHandlers(): void {
  ipcMain.handle("steam:achievement-unlock", (_e, id: unknown) => {
    if (typeof id === "string") unlockAchievement(id);
  });
  ipcMain.handle("steam:achievement-sync", (_e, ids: unknown) => {
    if (Array.isArray(ids)) {
      for (const id of ids) if (typeof id === "string") unlockAchievement(id);
    }
  });
}
