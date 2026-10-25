/**
 * Textgröße (Chef 24.10.2026, UI-Überarbeitung 1.4 Welle 1; seit 1.4.1 als Prozent-Regler).
 *
 * Reine Anzeige-Einstellung pro Gerät im `localStorage`, NICHT im Spielstand (wie fontChoice.ts):
 * kein SAVE_VERSION-Bump. Es skaliert NUR Schrift, kein Zoom (das alte UI-Scale wurde verworfen).
 *
 * claude:2026-10-25T10:30:00+01:00 — 1.4.1 K4 (Steam-Rezension „Schieberegler mit Prozent“):
 * - Wert ist eine Prozentzahl 90–140 in 5er-Schritten, gespeichert als Zahl ("110").
 * - Angewandt als Inline-Variable `--text-scale` (1,1) am Wurzelelement; jede `--fs-*`-Stufe in
 *   styles/base.css multipliziert damit. 100 % setzt nichts (bitgleich zum Stand ohne Option).
 * - `data-text-scale` bleibt als ABGELEITETE Stufe gesetzt (ab 110 % "large", ab 120 % "xlarge"),
 *   weil Layout-Regeln daran hängen (z. B. styles/chronicle.css, Chronik-Bühne auf niedrigen Fenstern).
 * - Schnellwahl 100 / 110 / 125: Die alte Stufe „Groß“ (112 %) liegt nicht im 5er-Raster des Reglers;
 *   110 ist der nächste Rasterpunkt und bleibt so per Regler erreichbar (der Knopf leuchtet dann auch).
 *   „Sehr groß“ (125 %) liegt bereits im Raster.
 * - Migration: alte gespeicherte Stufen werden übersetzt (normal → 100, large → 110, xlarge → 125)
 *   und beim Start einmal als Zahl zurückgeschrieben. Niemand verliert seine Einstellung.
 */

export const TEXT_SCALE_MIN = 90;
export const TEXT_SCALE_MAX = 140;
export const TEXT_SCALE_STEP = 5;
export const DEFAULT_TEXT_SCALE = 100;

/** Schnellwahl-Knöpfe neben dem Regler (i18n-Schlüssel der alten drei Stufen bleiben). */
export const TEXT_SCALE_PRESETS: ReadonlyArray<{ pct: number; labelKey: string }> = [
  { pct: 100, labelKey: "options.textSize.normal" },
  { pct: 110, labelKey: "options.textSize.large" },
  { pct: 125, labelKey: "options.textSize.xlarge" },
];

/** Alte Stufen-Werte (1.4.0) → Prozent. */
const LEGACY_STUFEN: Readonly<Record<string, number>> = { normal: 100, large: 110, xlarge: 125 };

/** Abgeleitete Stufe für `data-text-scale` (Layout-Regeln in CSS); unter 110 % kein Attribut. */
export type TextScaleTier = "large" | "xlarge";

const STORAGE_KEY = "hearthforge:textscale";

/** Auf den erlaubten Bereich klemmen und aufs 5er-Raster runden; Unsinn ergibt 100. */
export function normalizeTextScale(wert: number): number {
  if (!Number.isFinite(wert)) return DEFAULT_TEXT_SCALE;
  const geklemmt = Math.min(TEXT_SCALE_MAX, Math.max(TEXT_SCALE_MIN, wert));
  return Math.round(geklemmt / TEXT_SCALE_STEP) * TEXT_SCALE_STEP;
}

/** Gespeicherten Rohwert lesen: alte Stufe (normal/large/xlarge) oder Zahl. Fehlt/kaputt → 100. */
export function parseStoredTextScale(roh: string | null): number {
  if (roh === null || roh.trim() === "") return DEFAULT_TEXT_SCALE;
  const alt = LEGACY_STUFEN[roh];
  if (alt !== undefined) return alt;
  return normalizeTextScale(Number(roh));
}

/** Stufe für die bestehenden `:root[data-text-scale=…]`-Regeln (≥ 120 xlarge, ≥ 110 large). */
export function textScaleTier(pct: number): TextScaleTier | null {
  if (pct >= 120) return "xlarge";
  if (pct >= 110) return "large";
  return null;
}

/** Gespeicherter Prozentwert, sonst 100. Defensiv gegen gesperrten/privaten Speicher. */
export function ladeTextScale(): number {
  try {
    return parseStoredTextScale(localStorage.getItem(STORAGE_KEY));
  } catch {
    /* privater Modus o.ä. — dann eben die Vorgabe */
  }
  return DEFAULT_TEXT_SCALE;
}

/** Prozentwert aufs Dokument anwenden (100 % = keine Variable, kein Attribut). */
export function wendeTextScaleAn(pct: number): void {
  const wurzel = document.documentElement;
  const wert = normalizeTextScale(pct);
  if (wert === DEFAULT_TEXT_SCALE) wurzel.style.removeProperty("--text-scale");
  else wurzel.style.setProperty("--text-scale", String(wert / 100));
  const stufe = textScaleTier(wert);
  if (stufe) wurzel.dataset.textScale = stufe;
  else wurzel.removeAttribute("data-text-scale");
}

/** Prozentwert speichern und sofort anwenden. Gibt den tatsächlich gesetzten (gerasterten) Wert zurück. */
export function setzeTextScale(pct: number): number {
  const wert = normalizeTextScale(pct);
  try {
    localStorage.setItem(STORAGE_KEY, String(wert));
  } catch {
    /* nicht speicherbar — die Wahl gilt dann nur für diese Sitzung */
  }
  wendeTextScaleAn(wert);
  return wert;
}

/** Einmal beim Start aufrufen (vor dem ersten Render), damit nichts umspringt. Schreibt alte Stufen als Zahl zurück. */
export function initTextScale(): void {
  const wert = ladeTextScale();
  try {
    const roh = localStorage.getItem(STORAGE_KEY);
    if (roh !== null && roh !== String(wert)) localStorage.setItem(STORAGE_KEY, String(wert));
  } catch {
    /* Migration nur best effort — gelesen wird die alte Stufe ohnehin weiter richtig */
  }
  wendeTextScaleAn(wert);
}
