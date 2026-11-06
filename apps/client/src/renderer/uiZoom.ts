/**
 * claude:2026-11-06T11:52:01+01:00 — Interface-Größe (Hotfix 1.4.2.2, Chef 06.11.2026 „Warum patchen wir es nicht?“).
 *
 * Anlass: Spieler-Report „Resolution support (wide)“: 70-Zoll-Fernseher, 3840×2160 mit 250 % Windows-Skalierung.
 * Das Spiel bekommt dort nur 1536×864 CSS-Pixel, also so viel Platz wie ein kleiner Laptop. Die Textgröße
 * (textScale.ts) hilft da nicht, sie macht die Schrift nur noch größer.
 *
 * Diese Option verkleinert die GANZE Oberfläche über den echten Seiten-Zoom von Chromium
 * (`webFrame.setZoomFactor`, Brücke `window.hearthforge.ui.setZoom` im Preload). Das ist kein CSS-`zoom`:
 * Das Fenster bekommt schlicht mehr CSS-Pixel (80 % auf 1536×864 ergibt 1920×1080), Maus, Tooltips,
 * Portale und Canvas bleiben deckungsgleich.
 *
 * Abgrenzung zum alten UI-Scale (Polish-Sprint 07/2026 entfernt, s. App.tsx / main/index.ts): Der war ein
 * AUTOMATISCHER Zoom nach Fenstergröße und machte kleine Fenster noch enger. Hier entscheidet nur der
 * Spieler, und nur nach unten (höchstens 100 %), damit nie weniger Platz als das Fenster entsteht.
 *
 * Reine Anzeige-Einstellung pro Gerät im `localStorage`, nicht im Spielstand: kein SAVE_VERSION-Bump.
 * Im Browser (Dev-Server, Bot) fehlt die Brücke, dann passiert nichts.
 */

export const UI_ZOOM_MIN = 70;
export const UI_ZOOM_MAX = 100;
export const DEFAULT_UI_ZOOM = 100;

/** Schnellwahl-Stufen in den Optionen (Knöpfe statt Regler: Ein Regler würde beim Ziehen unter der Maus wegschrumpfen). */
export const UI_ZOOM_PRESETS: readonly number[] = [70, 80, 90, 100];

const STORAGE_KEY = "hearthforge:uiZoom";

/** Auf 70–100 klemmen und auf ganze 5er runden; Unsinn ergibt 100. */
export function normalizeUiZoom(wert: number): number {
  if (!Number.isFinite(wert)) return DEFAULT_UI_ZOOM;
  const geklemmt = Math.min(UI_ZOOM_MAX, Math.max(UI_ZOOM_MIN, wert));
  return Math.round(geklemmt / 5) * 5;
}

/** Gespeicherten Rohwert lesen; fehlt oder kaputt → 100. */
export function parseStoredUiZoom(roh: string | null): number {
  if (roh === null || roh.trim() === "") return DEFAULT_UI_ZOOM;
  return normalizeUiZoom(Number(roh));
}

/** Gespeicherter Prozentwert, sonst 100. Defensiv gegen gesperrten Speicher. */
export function ladeUiZoom(): number {
  try {
    return parseStoredUiZoom(localStorage.getItem(STORAGE_KEY));
  } catch {
    /* privater Modus o. ä.: Vorgabe */
  }
  return DEFAULT_UI_ZOOM;
}

/** Prozentwert anwenden (über die Preload-Brücke; ohne Brücke still nichts). */
export function wendeUiZoomAn(pct: number): void {
  try {
    window.hearthforge?.ui?.setZoom(normalizeUiZoom(pct) / 100);
  } catch {
    /* ältere Brücke / Browser: kein Zoom, kein Absturz */
  }
}

/** Speichern + sofort anwenden (Optionen). */
export function setzeUiZoom(pct: number): number {
  const wert = normalizeUiZoom(pct);
  try {
    if (wert === DEFAULT_UI_ZOOM) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, String(wert));
  } catch {
    /* Speicher gesperrt: gilt dann nur für diese Sitzung */
  }
  wendeUiZoomAn(wert);
  return wert;
}

/** Beim Start vor dem ersten Render (main.tsx). */
export function initUiZoom(): void {
  wendeUiZoomAn(ladeUiZoom());
}
