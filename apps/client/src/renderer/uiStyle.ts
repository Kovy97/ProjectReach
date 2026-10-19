/**
 * claude:2026-10-19T10:00:00+02:00 — Chef 19.10.: zwei umschaltbare Oberflächen-Stile.
 *  - "reforged": die 1.3-Oberfläche (Reforged-Seitenleiste/-Reiterleiste, Statusleiste, gemalte Texturen).
 *  - "classic":  der Look von 1.2.3 (alte Seitenleiste, Reiterleiste, Kopfzeile „Quiet Citadel“, alte Texturen).
 * Beide skalieren mit dem Seitenleisten-Griff und dem Höhenregler der Kopfleiste.
 *
 * Reine Anzeige-Einstellung im localStorage wie die Schriftwahl (fontChoice.ts), kein SAVE-Bump.
 * `data-ui-style` am <html> steuert die globale Classic-Haut (styles/classic-skin.css), das Layout
 * wählt per `useUiStyle()` zwischen `layout--reforged` und `layout--classic` samt passender Chrome.
 */
import { useSyncExternalStore } from "react";

export const UI_STYLES = ["reforged", "classic"] as const;
export type UiStyle = (typeof UI_STYLES)[number];

export const DEFAULT_UI_STYLE: UiStyle = "reforged";

const STORAGE_KEY = "hearthforge:uiStyle";

export const UI_STYLE_LABEL_KEY: Record<UiStyle, string> = {
  reforged: "options.uiStyle.reforged",
  classic: "options.uiStyle.classic",
};

function istGueltig(wert: string | null): wert is UiStyle {
  return (UI_STYLES as readonly string[]).includes(wert ?? "");
}

export function ladeUiStyle(): UiStyle {
  try {
    const gespeichert = localStorage.getItem(STORAGE_KEY);
    if (istGueltig(gespeichert)) return gespeichert;
  } catch {
    /* privater Modus o.ä. — dann eben die Vorgabe */
  }
  return DEFAULT_UI_STYLE;
}

let aktuell: UiStyle = ladeUiStyle();
const hoerer = new Set<() => void>();

export function wendeUiStyleAn(stil: UiStyle): void {
  document.documentElement.dataset.uiStyle = stil;
}

export function setzeUiStyle(stil: UiStyle): void {
  try {
    localStorage.setItem(STORAGE_KEY, stil);
  } catch {
    /* nicht speicherbar — die Wahl gilt dann nur für diese Sitzung */
  }
  aktuell = stil;
  wendeUiStyleAn(stil);
  for (const h of hoerer) h();
}

export function initUiStyle(): void {
  wendeUiStyleAn(aktuell);
}

function abonniere(h: () => void): () => void {
  hoerer.add(h);
  return () => hoerer.delete(h);
}

/** Aktueller Stil als React-Zustand; ändert sich sofort beim Umschalten (kein Neustart nötig). */
export function useUiStyle(): UiStyle {
  return useSyncExternalStore(abonniere, () => aktuell);
}
