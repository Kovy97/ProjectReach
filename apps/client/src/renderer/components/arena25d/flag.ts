// 0.4.0-Arena Welle 1: Zonen-Fähigkeits-Prüfung kommt aus dem Manifest-/Asset-System statt eines
// hartkodierten Zonen-Vergleichs (s. `isArena25dActive` unten).
import { isZoneArenaCapable } from "./assets";

/**
 * Task #330 (Chef-GO "Prototyp einer 2,5D-Kampfarena für 'The Pastures'") — Feature-Flag-Gate.
 *
 * Isolations-Vertrag (Chef-Vorgabe, nicht verhandelbar): der komplette 2,5D-Prototyp lebt in
 * diesem Ordner (`components/arena25d/`). Außerhalb existiert GENAU EIN Mount-Punkt in
 * `pages/CombatPage.tsx` (s. Kommentar dort "ARENA25D MOUNT SWITCH") — Entfernen dieses Features
 * bedeutet: Ordner löschen + die paar Zeilen an dieser einen Stelle zurückbauen. Kein anderer
 * Renderer-Code weiß von arena25d.
 *
 * Zwei Gates müssen beide zutreffen, bevor CombatPage die 3D-Szene überhaupt in Erwägung zieht:
 *   1. `ARENA25D_SUPPORTED` — NUR in Dev-Builds `true` (`import.meta.env.DEV`), exakt dasselbe
 *      Muster wie `devtools.ts`/`game/fixtureLoader.ts`. Vite faltet das in Produktions-Builds zur
 *      literalen Konstante `false` zusammen — jeder davon abhängige Code-Pfad (inkl. des
 *      `import("./Arena25DStage")`-Zugriffs im Mount-Switch) wird vom Minifier als toter Code
 *      erkannt und aus dem Spieler-Bundle entfernt. Das ist der Kern des "im Produktions-Build ist
 *      der Pfad tot"-Vertrags — siehe README.md "Bundle-Beweis" für die Verifikation.
 *   2. Der localStorage-Schalter `gr.arena25d` (session-persistent, siehe `isArena25dEnabled`) —
 *      selbst in einem Dev-Build ist der Prototyp standardmäßig AUS, bis der Chef ihn aktiv anwirft.
 *
 * Chef-Bedienung (s. README.md "Wie testen" für die volle Anleitung):
 *   - Tastenkürzel Strg+Umschalt+A (irgendwo im Spiel, auch außerhalb des Kampfes) schaltet um.
 *   - Task #330b-Nachtrag: zusätzlich Strg+Umschalt+Y als gleichwertiger Zweit-Hotkey (Chef-
 *     Vorgabe "falls unsicher [ob A durch OS/Fenstermanager belegt ist], zusätzlichen Hotkey
 *     registrieren") — beide lösen exakt denselben Toggle aus, keiner hat Vorrang.
 *   - Alternativ DevTools-Konsole: `localStorage.setItem('gr.arena25d','1')` (bzw. `removeItem`).
 * Beide Wege wirken SOFORT auf einen laufenden Kampf — `Battle()` liest die Combat-Werte 10×/s neu
 * (bestehender Tick-Puls), der Mount-Switch prüft das Flag also bei jedem dieser Re-Renders frisch
 * (kein Reload/Kampf-Neustart nötig, um rein/raus zu schalten).
 */

/**
 * Chef-Entscheid 2026-07-25 („Wir pausieren das 2.5D-Zeug jetzt erstmal ... wir wollen uns jetzt
 * auf das 0.2.2-Update konzentrieren!"): harter Pause-Schalter, WIEDER AUFGEHOBEN per Chef-Entscheid
 * 2026-08-03 ("0.4.0-Arena, Logik-Welle 1 ... die 2.5D-Arena wird produktiv ausgebaut", s.
 * design/battle-040-arena-produktion.md) — die Pause war laut ursprünglichem Kommentar ohnehin
 * ausdrücklich als "Wiederaufnahme = diesen einen Wert auf `false` drehen" angelegt. Bleibt trotzdem
 * hinter `ARENA25D_SUPPORTED` (NUR Dev-Builds, s.o.) — Options-Toggle für einen echten Produktions-
 * Rollout kommt laut Spec erst zum Ship dieser Welle, dieser Schalter ist weiterhin reine
 * Chef-Testinstrumentierung.
 */
const ARENA25D_PAUSED = true; // Chef 26.08.2026: Debug-Zugang (Hotkey + gr.arena25d) gekappt, bis das Feature wieder aufgegriffen wird.

const STORAGE_KEY = "gr.arena25d";

/** True NUR in Dev-Builds — s. Modul-JSDoc Punkt 1. */
export const ARENA25D_SUPPORTED: boolean = import.meta.env.DEV;

function readStoredFlag(): boolean {
  if (ARENA25D_PAUSED || !ARENA25D_SUPPORTED) return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    // localStorage nicht verfügbar (z.B. privater Modus) — Prototyp bleibt stumm aus.
    return false;
  }
}

/** Ob der Chef den Prototyp diese Session eingeschaltet hat. Immer `false` in Produktions-Builds,
 *  unabhängig vom gespeicherten Wert (s. `ARENA25D_SUPPORTED`). */
export function isArena25dEnabled(): boolean {
  return readStoredFlag();
}

export function setArena25dEnabled(on: boolean): void {
  if (ARENA25D_PAUSED || !ARENA25D_SUPPORTED) return;
  try {
    if (on) localStorage.setItem(STORAGE_KEY, "1");
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* privater Modus o.ä. — stiller Verzicht, kein Crash */
  }
}

function toggleArena25d(): void {
  const next = !isArena25dEnabled();
  setArena25dEnabled(next);
  // Bewusst NUR ein Konsolen-Log (kein Toast/UI-Text nötig — der Ordner darf komplett
  // rückstandslos entfernbar bleiben, ein Toast bräuchte einen i18n-Key außerhalb dieses Ordners).
  // eslint-disable-next-line no-console
  console.info(`[arena25d] ${next ? "ON" : "OFF"} — gr.arena25d = ${next ? "1" : "(removed)"}`);
}

/**
 * Modul-Level-Seiteneffekt (bewusst NICHT in CombatPage angebunden — s. Isolations-Vertrag oben):
 * sobald irgendein Renderer-Code dieses Modul importiert (das passiert genau einmal, über den
 * Mount-Switch in CombatPage.tsx), registriert sich HIER der globale Dev-Hotkey. Dadurch bleibt
 * CombatPage.tsx bei genau einer Berührung (Import + Mount-Switch) — der Hotkey ist ein
 * Implementierungsdetail von arena25d, keine zweite externe Integrationsstelle.
 *
 * `installedRef`-Guard schützt gegen Doppel-Registrierung bei Vite-HMR (Modul wird beim
 * Hot-Reload erneut ausgeführt, der alte `window`-Listener bliebe sonst als Leiche hängen).
 */
let hotkeyInstalled = false;
function installDevHotkeyOnce(): void {
  if (ARENA25D_PAUSED || !ARENA25D_SUPPORTED || hotkeyInstalled || typeof window === "undefined") return;
  hotkeyInstalled = true;
  window.addEventListener("keydown", (e: KeyboardEvent) => {
    if (!e.ctrlKey || !e.shiftKey || e.altKey || e.metaKey) return;
    // Zwei gleichwertige Tasten (Task #330b-Nachtrag) — "a" ist die dokumentierte Primärtaste,
    // "y" ein Zweit-Hotkey für den Fall, dass Strg+Umschalt+A auf der Chef-Maschine irgendwo
    // (OS/Fenstermanager/Eingabemethode) anders belegt ist.
    const key = e.key.toLowerCase();
    if (key !== "a" && key !== "y") return;
    // Nicht auslösen, während der Chef in einem Textfeld tippt (Notizen/Suche/Chat o.ä.).
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement | null)?.isContentEditable) return;
    e.preventDefault();
    toggleArena25d();
  });
}
installDevHotkeyOnce();

/**
 * Die eigentliche Aktivierungs-Prüfung für den Mount-Switch: Dev-Build + Chef-Flag AN + gerade ein
 * NORMALER Zonen-Kampf (kein Dungeon/Turm/Paragon-Lauf, s. `dungeonId`-Parameter) in einer Zone,
 * für die ein gültiges Manifest MIT auflösbaren Boden-/Kulissen-Assets existiert (s.
 * `isZoneArenaCapable` in assets.ts — 0.4.0-Arena-Welle 1, Chef-Entscheid 2026-08-03, ersetzt den
 * alten hartkodierten `zoneId === "pastures"`-Vergleich aus Task #330). `zoneId` kommt 1:1 aus
 * `monster.zone` (Content-Katalog, CombatPage kennt das bereits) — reiner Lesezugriff, keine
 * Engine-Logik.
 */
export function isArena25dActive(zoneId: string | null | undefined, dungeonId: string | null | undefined): boolean {
  return ARENA25D_SUPPORTED && !dungeonId && isZoneArenaCapable(zoneId) && isArena25dEnabled();
}
