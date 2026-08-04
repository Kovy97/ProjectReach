import { useSyncExternalStore } from "react";
import { useI18n } from "../i18n";

/**
 * WoW-Stil-Fehlermeldung ("Game Alert", Chef-Bugfix 22.07.): rote Fehlertext-Einblendung
 * oben-mittig über dem Content — kurzes Fade-in, ~2s stehen, Fade-out (CSS: `.game-alert`,
 * pages.css). Modul-globaler Mini-Store (Muster ItemTooltip.tsx) + `useSyncExternalStore`, damit
 * JEDE Stelle im Code — z.B. ein Equip-onClick tief in einer Seite — einfach `gameAlert(key)`
 * rufen kann, ganz ohne Engine-State/Context zu berühren. Mehrere Meldungen stapeln sich kurz
 * untereinander; jede trägt ihren eigenen Timer.
 */

interface AlertEntry {
  id: number;
  /** i18n-Schlüssel, KEIN Fließtext — übersetzt wird erst beim Rendern (s. GameAlerts unten),
   *  damit `gameAlert()` auch außerhalb von React-Komponenten ohne `t()`-Zugriff aufrufbar ist. */
  textKey: string;
  /** Optionale {platzhalter}-Ersetzungen — erst NACH t() angewandt (Task #349, Loadout-Toast
   *  „{x} von {y} angelegt"; dasselbe .replace-Muster wie überall bei t()-Aufrufern). */
  params?: Record<string, string | number>;
  /** Optik: "error" (rot, Default — bisheriges Verhalten) oder "success" (gold, z.B. „Loadout
   *  gespeichert"). CSS: `.game-alert-success` (character.css, Task-#349-Block). */
  tone?: "error" | "success";
}

/** Gesamtlebensdauer einer Meldung (Fade-in + Stehzeit + Fade-out) — MUSS zur CSS-Keyframe-
 *  Animation `game-alert-life` in pages.css passen (dort als Prozentsatz derselben Gesamtdauer). */
const ALERT_LIFETIME_MS = 2450;

let alerts: AlertEntry[] = [];
const listeners = new Set<() => void>();
let nextId = 1;

function emit(): void {
  for (const l of listeners) l();
}
function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
function getSnapshot(): AlertEntry[] {
  return alerts;
}

/**
 * Zeigt eine WoW-Stil-Meldung oben-mittig — z.B. bei einem fehlgeschlagenen Equip-Versuch
 * (volles Inventar). Von überall aufrufbar (Klick-Handler, Drag&Drop-Callbacks …).
 * Optional (Task #349): `params` für {platzhalter}-Ersetzungen, `tone: "success"` für die
 * goldene Bestätigungs-Optik (Default bleibt die rote Fehler-Optik — alle Alt-Aufrufer unverändert).
 */
export function gameAlert(
  textKey: string,
  params?: Record<string, string | number>,
  tone: "error" | "success" = "error",
): void {
  const id = nextId++;
  alerts = [...alerts, { id, textKey, params, tone }];
  emit();
  window.setTimeout(() => {
    alerts = alerts.filter((a) => a.id !== id);
    emit();
  }, ALERT_LIFETIME_MS);
}

/** Global einmal gemountet (MainLayout, neben `<Toasts />`) — rendert den aktuellen Alert-Stapel. */
export function GameAlerts(): JSX.Element | null {
  const list = useSyncExternalStore(subscribe, getSnapshot);
  const { t } = useI18n();
  if (list.length === 0) return null;
  return (
    <div className="game-alert-stack" aria-live="assertive" role="alert">
      {list.map((a) => {
        let text = t(a.textKey);
        if (a.params) {
          for (const [k, v] of Object.entries(a.params)) text = text.replace(`{${k}}`, String(v));
        }
        return (
          <div key={a.id} className={`game-alert${a.tone === "success" ? " game-alert-success" : ""}`}>
            {text}
          </div>
        );
      })}
    </div>
  );
}
