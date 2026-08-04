/**
 * Zentrale ESC-Prioritäts-Registry (Chef-GO „Hotkeys für Power-User", 2026-07-09).
 *
 * Mehrere Overlays können gleichzeitig offen sein (gepinntes ItemTooltip, Modals wie
 * PortraitPicker/Death/PetCelebration/Offline) — jedes meldet sich hier an, solange es sichtbar
 * ist (`registerEscCloser` in einem `useEffect`, Abmeldung über den zurückgegebenen Cleanup).
 *
 * EIN globaler `keydown`-Handler (App.tsx) ruft bei Escape `closeTopEscTarget()` auf. Das
 * schließt GENAU EIN Overlay pro Tastendruck: höchste Priorität zuerst (Guide vor gepinntem
 * Tooltip vor Modals — Chef-Vorgabe „gepinnter ItemTooltip → Modals/Popups", Guide-Priorität kam
 * per Tester-Sweep 2, T9, oben drauf: der Spotlight-Guide dimmt fast den ganzen Screen ab, Escape
 * soll IHN treffen statt ein zufällig darunter registriertes Overlay), innerhalb einer Priorität
 * das zuletzt registrierte (= zuletzt geöffnete) zuerst. Ist nichts registriert, passiert nichts.
 *
 * Ersetzt die vorherigen VERSTREUTEN lokalen `window.addEventListener("keydown", …)`-Escape-
 * Handler in einzelnen Komponenten (s. ItemTooltip.tsx `ItemTooltipOverlay`, jetzt hier
 * angeschlossen) — dadurch feuert Escape nie doppelt (kein zweiter, unabhängiger Listener, der
 * dieselbe Taste separat auswertet). Andere, unabhängige lokale Escape-Handler außerhalb dieser
 * Chef-Liste (z.B. CombatPage's kleines Drops-Popover) bleiben bewusst unangetastet — sie sind
 * reine Mikro-Popover ohne Modal-Charakter und kollidieren nicht (Escape schließt dort zusätzlich
 * ihr eigenes Popover, unabhängig von dieser Registry).
 */
export type EscPriority = "guide" | "tooltip" | "modal";

interface EscEntry {
  priority: EscPriority;
  close: () => void;
}

/** Reihenfolge, in der Prioritäten geprüft werden — erste Priorität mit offenen Einträgen gewinnt. */
const PRIORITY_ORDER: EscPriority[] = ["guide", "tooltip", "modal"];

const entries: EscEntry[] = [];

/**
 * Registriert einen Escape-Schließer für die Dauer, in der ein Overlay offen ist. Aufrufer ruft
 * dies in einem `useEffect` (Abhängigkeit: die eigene "offen"-Bedingung) und ruft die
 * zurückgegebene Funktion im Cleanup auf.
 */
export function registerEscCloser(priority: EscPriority, close: () => void): () => void {
  const entry: EscEntry = { priority, close };
  entries.push(entry);
  return () => {
    const idx = entries.indexOf(entry);
    if (idx !== -1) entries.splice(idx, 1);
  };
}

/**
 * Ist gerade IRGENDEIN "modal"-Overlay registriert (offen)? Reine Lesefunktion, kein Escape-
 * Trigger. Genutzt von MasteryCeremony.tsx (Meisterweihe-Zeremonie, design/master-capes-konzept.md
 * §3): die Zeremonie soll sich NICHT zwischen bestehende Modal-Momente drängen (PetCelebration/
 * DeathPopup/PortraitPicker haben Vorrang) — ihr Trigger-Effekt prüft dies bei JEDEM Tick, bevor
 * er eine neue Zeremonie öffnet, und wartet einfach den nächsten Tick ab, falls gerade etwas
 * offen ist (kein Timing-Wettlauf nötig, der Trigger läuft ohnehin pro Tick erneut).
 */
export function hasOpenModal(): boolean {
  return entries.some((e) => e.priority === "modal");
}

/**
 * Vom einzigen globalen App.tsx-Escape-Handler aufgerufen. Schließt höchstens EIN Overlay
 * (höchste Priorität, dann zuletzt registriert zuerst) und gibt zurück, ob etwas geschlossen wurde.
 */
export function closeTopEscTarget(): boolean {
  for (const p of PRIORITY_ORDER) {
    for (let i = entries.length - 1; i >= 0; i--) {
      const entry = entries[i];
      if (entry && entry.priority === p) {
        entry.close();
        return true;
      }
    }
  }
  return false;
}
