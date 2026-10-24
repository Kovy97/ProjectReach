/**
 * Textgröße (Chef 24.10.2026, UI-Überarbeitung 1.4 Welle 1) — Normal / Groß / Sehr groß.
 *
 * Reine Anzeige-Einstellung pro Gerät im `localStorage`, NICHT im Spielstand (wie fontChoice.ts):
 * kein SAVE_VERSION-Bump. Angewandt als `data-text-scale` am Wurzelelement; `styles/base.css` setzt dazu
 * `--text-scale` (1 / 1,12 / 1,25), das jede `--fs-*`-Stufe multipliziert. Es skaliert NUR Schrift, kein Zoom
 * (das alte UI-Scale wurde verworfen). Normal setzt kein Attribut.
 */

export const TEXT_SCALES = ["normal", "large", "xlarge"] as const;
export type TextScale = (typeof TEXT_SCALES)[number];

export const DEFAULT_TEXT_SCALE: TextScale = "normal";

const STORAGE_KEY = "hearthforge:textscale";

/** i18n-Schlüssel je Stufe (Texte liegen in den Sprachdateien). */
export const TEXT_SCALE_LABEL_KEY: Record<TextScale, string> = {
  normal: "options.textSize.normal",
  large: "options.textSize.large",
  xlarge: "options.textSize.xlarge",
};

function istGueltig(wert: string | null): wert is TextScale {
  return (TEXT_SCALES as readonly string[]).includes(wert ?? "");
}

/** Gespeicherte Stufe, sonst Normal. Defensiv gegen gesperrten/privaten Speicher. */
export function ladeTextScale(): TextScale {
  try {
    const gespeichert = localStorage.getItem(STORAGE_KEY);
    if (istGueltig(gespeichert)) return gespeichert;
  } catch {
    /* privater Modus o.ä. — dann eben die Vorgabe */
  }
  return DEFAULT_TEXT_SCALE;
}

/** Stufe aufs Dokument anwenden (Normal = kein Attribut, bitgleich zum Stand ohne Option). */
export function wendeTextScaleAn(stufe: TextScale): void {
  const wurzel = document.documentElement;
  if (stufe === DEFAULT_TEXT_SCALE) wurzel.removeAttribute("data-text-scale");
  else wurzel.dataset.textScale = stufe;
}

/** Stufe speichern und sofort anwenden. */
export function setzeTextScale(stufe: TextScale): void {
  try {
    localStorage.setItem(STORAGE_KEY, stufe);
  } catch {
    /* nicht speicherbar — die Wahl gilt dann nur für diese Sitzung */
  }
  wendeTextScaleAn(stufe);
}

/** Einmal beim Start aufrufen (vor dem ersten Render), damit nichts umspringt. */
export function initTextScale(): void {
  wendeTextScaleAn(ladeTextScale());
}
