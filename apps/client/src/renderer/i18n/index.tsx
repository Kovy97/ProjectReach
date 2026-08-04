import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { Locale, LocalizedString } from "@hearthforge/shared";
import { LOCALES, resolveText } from "@hearthforge/shared";
import { setFormatLocale } from "../util/format";
import { UI_TEXT } from "./translations";

interface I18nValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  /** UI-Text per Schlüssel. */
  t: (key: string) => string;
  /** Lokalisierten Content-Text (Item/Skill/Monster-Name) auflösen. */
  tr: (value: LocalizedString) => string;
}

const I18nContext = createContext<I18nValue | null>(null);
const STORAGE_KEY = "hearthforge:locale";

/** Chef-Entscheid 26.07.: Default-Sprache ist ENGLISCH, nicht mehr Deutsch. Ohne gespeicherte
 *  Wahl wird die OS-Sprache erkannt, sofern wir sie unterstützen (de-Windows → de, ru → ru …) —
 *  alles andere landet auf "en". Vorher fiel JEDER Erststart hart auf "de" zurück, auch für
 *  internationale Käufer. */
function initialLocale(): Locale {
  const saved = localStorage.getItem(STORAGE_KEY);
  if ((LOCALES as string[]).includes(saved ?? "")) return saved as Locale;
  const sys = (navigator.language ?? "en").toLowerCase();
  const detected = (LOCALES as string[]).find(
    (l) => sys === l || sys.startsWith(`${l}-`) || (l === "ptBR" && sys.startsWith("pt")),
  );
  return (detected as Locale) ?? "en";
}

/** Spielsprache auf Dokument-Ebene anwenden: html[lang] (CSS-Silbentrennung, Screenreader) +
 *  Intl-Locale der Zahlen-/Datumsformate (util/format.ts — Sweep-Fund T6). */
function applyDocumentLocale(locale: Locale): void {
  const tag = LOCALE_BCP47[locale] ?? "en-US";
  document.documentElement.lang = tag;
  setFormatLocale(tag);
}

/** locale → BCP-47-Tag: fürs <html lang>-Attribut (CSS-Silbentrennung `hyphens:auto`,
 *  Screenreader) UND als Intl-Locale der Zahlen-/Datumsformate (util/format.ts). */
export const LOCALE_BCP47: Record<string, string> = {
  en: "en-US",
  de: "de-DE",
  zh: "zh-CN",
  ru: "ru-RU",
  es: "es-ES",
  // Sweep2-T8 K1 (2026-07-13): der Locale-Typ heißt "pt-BR" MIT Bindestrich — der frühere
  // ptBR-Key lief beim Lookup ins Leere und PT-BR fiel still auf en-US-Formate zurück.
  "pt-BR": "pt-BR",
  fr: "fr-FR",
};

export function I18nProvider({ children }: { children: ReactNode }): JSX.Element {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const setLocale = (next: Locale): void => {
    setLocaleState(next);
    localStorage.setItem(STORAGE_KEY, next);
    applyDocumentLocale(next);
  };

  // Beim ersten Mount die gespeicherte Sprache auch auf html[lang] + Zahlenformat anwenden
  // (Sweep-Fund T6: Zahlen folgten der OS-Locale statt der Spielsprache).
  useEffect(() => applyDocumentLocale(locale), []); // eslint-disable-line react-hooks/exhaustive-deps

  // UI_TEXT[locale] kann fehlen (zh/ru/es/pt-BR/fr haben noch keine UI-Chrome-Übersetzung,
  // s. translations.ts) — Fallback auf en, dann den rohen Key.
  const t = (key: string): string => UI_TEXT[locale]?.[key] ?? UI_TEXT.en[key] ?? key;
  const tr = (value: LocalizedString): string => resolveText(value, locale);

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, tr }}>{children}</I18nContext.Provider>
  );
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n muss innerhalb von <I18nProvider> verwendet werden");
  return ctx;
}
