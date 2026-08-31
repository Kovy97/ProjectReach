/**
 * Schriftwahl (Chef-Auftrag 31.08.2026, 1.2.2) — „Es wurde bemängelt, dass der Font an Stellen
 * schlecht zu lesen ist", dazu Spielerwünsche, die Schrift selbst wählen zu können.
 *
 * MECHANIK: Wie die Sprachwahl (i18n/index.tsx) eine reine Anzeige-Einstellung im `localStorage`,
 * NICHT im Spielstand — kein SAVE_VERSION-Bump, und die Wahl gilt pro Gerät, was richtig ist:
 * Wer am kleinen Laptop eine klarere Schrift braucht, will sie nicht auf dem großen Schirm.
 * Angewandt wird sie als `data-font` am Wurzelelement; `styles/base.css` definiert dazu
 * `--font-head`/`--font-info` neu. Kein einziges anderes Stylesheet muss etwas wissen — beide
 * Variablen werden appweit über 30 Dateien hinweg benutzt.
 *
 * ALLE SPRACHEN (Chef-Vorgabe): Jeder Modus muss in allen sieben Sprachen tragen. Gemessen mit
 * fontTools über die gebündelten Schriften: KEINE davon kann Kyrillisch oder CJK — deshalb gibt es
 * die `:lang(ru)`/`:lang(zh)`-Sonderstacks in base.css. Die wählbaren Schriften sind darum
 * Systemschriften, die Latein UND Kyrillisch abdecken (nachgemessen: Georgia, Palatino Linotype,
 * Segoe UI, Times New Roman — alle „Kyrillisch: ja"), jeweils mit „Microsoft YaHei"/„Noto Serif
 * CJK SC" als CJK-Rückfall (nachgemessen: deckt Latein, Kyrillisch UND CJK ab). So braucht kein
 * Modus eine eigene Sprach-Sonderregel und keine neue Schriftdatei ins Paket.
 */

export const FONT_CHOICES = ["atmosphere", "book", "antiqua", "clear"] as const;
export type FontChoice = (typeof FONT_CHOICES)[number];

export const DEFAULT_FONT: FontChoice = "atmosphere";

const STORAGE_KEY = "hearthforge:font";

/** i18n-Schlüssel je Modus (Label + einzeilige Erklärung) — Texte liegen in den Sprachdateien. */
export const FONT_LABEL_KEY: Record<FontChoice, string> = {
  atmosphere: "options.font.atmosphere",
  book: "options.font.book",
  antiqua: "options.font.antiqua",
  clear: "options.font.clear",
};

export const FONT_NOTE_KEY: Record<FontChoice, string> = {
  atmosphere: "options.font.atmosphere.note",
  book: "options.font.book.note",
  antiqua: "options.font.antiqua.note",
  clear: "options.font.clear.note",
};

/**
 * Beispielstack für die Vorschauzeile in den Optionen. Bewusst dieselbe Reihenfolge wie die
 * CSS-Regeln in base.css — wer hier etwas ändert, muss es dort mitziehen (und umgekehrt).
 */
export const FONT_PREVIEW_STACK: Record<FontChoice, string> = {
  atmosphere: '"Grim Reach Numerals", "IM Fell English SC", Georgia, "Microsoft YaHei", serif',
  book: '"Grim Reach Numerals", Georgia, "Microsoft YaHei", "Noto Serif CJK SC", serif',
  antiqua: '"Grim Reach Numerals", "Palatino Linotype", "Book Antiqua", Palatino, "Microsoft YaHei", serif',
  clear: '"Grim Reach Numerals", "Segoe UI", Tahoma, Verdana, "Microsoft YaHei", sans-serif',
};

function istGueltig(wert: string | null): wert is FontChoice {
  return (FONT_CHOICES as readonly string[]).includes(wert ?? "");
}

/** Gespeicherte Wahl, sonst die Vorgabe. Defensiv gegen gesperrten/privaten Speicher. */
export function ladeFontChoice(): FontChoice {
  try {
    const gespeichert = localStorage.getItem(STORAGE_KEY);
    if (istGueltig(gespeichert)) return gespeichert;
  } catch {
    /* privater Modus o.ä. — dann eben die Vorgabe */
  }
  return DEFAULT_FONT;
}

/**
 * Wahl aufs Dokument anwenden. Die Vorgabe setzt KEIN Attribut, damit die bestehenden
 * `:root`- und `:lang(...)`-Regeln unverändert greifen — „Atmosphäre" ist damit bitgleich
 * zum Stand vor dieser Einstellung.
 */
export function wendeFontChoiceAn(wahl: FontChoice): void {
  const wurzel = document.documentElement;
  if (wahl === DEFAULT_FONT) wurzel.removeAttribute("data-font");
  else wurzel.dataset.font = wahl;
}

/** Wahl speichern und sofort anwenden. */
export function setzeFontChoice(wahl: FontChoice): void {
  try {
    localStorage.setItem(STORAGE_KEY, wahl);
  } catch {
    /* nicht speicherbar — die Wahl gilt dann nur für diese Sitzung */
  }
  wendeFontChoiceAn(wahl);
}

/** Einmal beim Start aufrufen (vor dem ersten Render), damit nichts umspringt. */
export function initFontChoice(): void {
  wendeFontChoiceAn(ladeFontChoice());
}
