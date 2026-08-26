import { useState } from "react";
import type { Locale, SaveSlot } from "@hearthforge/shared";
import { LOCALES } from "@hearthforge/shared";
import { useI18n } from "../i18n";
import { getPortraitSrc } from "../portraits";
import { optBtnCls } from "../components/OptionControls";
import { SlotThumb } from "../components/SlotThumb";
import menuLogo from "../assets/ui/mainmenu_logo.webp";

/**
 * New-Game-Screen — eigener Vollbild-Screen statt des früheren Aufklapp-Panels im Hauptmenü
 * (Chef-Auftrag 26.08.2026, wörtlich: "New Game und Load Game sind keine Aufklapp-Menüs mehr,
 * sondern eigene Screens mit Transition"; Vorlage Mira "New Game 05 · Ember Reliquary"). Mira
 * hatte dafür Holz-/Gravewood-Rahmen verwendet — per Chef-Nachtrag bleibt das Spiel beim
 * Metall-/Stahlrahmen (`.btn-iron`, `nav-bronze-lipped-iron-9slice.webp`), s. styles/
 * menu-submenu.css.
 *
 * Layout: zentrale "aktive Reliquie" (gewählter Slot, groß) + darunter die Leiste ALLER Slots
 * (Klick wählt nur aus, Aktionen leben zentral). Übergänge (rein/raus, Charaktererstellung
 * starten) übernimmt der Aufrufer (MainMenu.tsx) über `runWithScreenFade`.
 */
interface NewGameScreenProps {
  slots: SaveSlot[];
  onBack: () => void;
  /** Leerer Slot gewählt + bestätigt → direkt in die Charaktererstellung, kein Bestätigungsdialog. */
  onBeginNew: (slotId: number) => void;
  /** Belegter Slot gewählt + bestätigt → Chef-Bestätigungsdialog (MainMenu.tsx `askOverwrite`). */
  onOverwrite: (slot: SaveSlot) => void;
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

export function NewGameScreen({ slots, onBack, onBeginNew, onOverwrite, locale, setLocale }: NewGameScreenProps): JSX.Element {
  const { t } = useI18n();
  const [selectedId, setSelectedId] = useState<number>(
    () => slots.find((s) => !s.summary)?.id ?? slots[0]?.id ?? 0,
  );
  const selected = slots.find((s) => s.id === selectedId) ?? slots[0] ?? null;

  return (
    <div className="subscreen new-game-screen">
      <div className="subscreen-bg" aria-hidden="true" />
      <div className="subscreen-vignette" aria-hidden="true" />
      <button type="button" className="btn-iron btn-iron--sm subscreen-back" onClick={onBack}>
        {t("creation.back")}
      </button>
      <div className="subscreen-lang">
        {LOCALES.map((l) => (
          <button key={l} className={optBtnCls(l === locale)} onClick={() => setLocale(l)}>
            {l.toUpperCase()}
          </button>
        ))}
      </div>
      <header className="subscreen-header">
        <img src={menuLogo} alt="Grim Reach" />
        <h1>{t("menu.new")}</h1>
        <span>{t("menu.newGame.sub")}</span>
      </header>
      <main className="subscreen-main">
        {selected && (
          <NewActiveRelic
            slot={selected}
            onBeginNew={() => onBeginNew(selected.id)}
            onOverwrite={() => onOverwrite(selected)}
          />
        )}
        <div className="slot-rail">
          {slots.map((slot) => (
            <SlotThumb
              key={slot.id}
              slot={slot}
              selected={slot.id === selectedId}
              onClick={() => setSelectedId(slot.id)}
            />
          ))}
        </div>
      </main>
    </div>
  );
}

interface NewActiveRelicProps {
  slot: SaveSlot;
  onBeginNew: () => void;
  onOverwrite: () => void;
}

/** Zentrale Karte: leerer Slot bietet NEW GAME, belegter Slot zeigt den bestehenden Helden und
 *  bietet stattdessen ÜBERSCHREIBEN (mit der bestehenden Chef-Bestätigung, s. MainMenu.tsx). */
function NewActiveRelic({ slot, onBeginNew, onOverwrite }: NewActiveRelicProps): JSX.Element {
  const { t } = useI18n();
  const summary = slot.summary;
  const portraitSrc = summary ? getPortraitSrc(summary.portraitId ?? null) : null;

  return (
    <section className="active-relic new-relic" aria-live="polite">
      <div className="new-relic-badge">{slot.id + 1}</div>
      <div className="new-relic-window">
        {portraitSrc ? (
          <img src={portraitSrc} alt="" />
        ) : (
          <div className="new-relic-arch" aria-hidden="true" />
        )}
      </div>
      <div className="new-relic-copy">
        {/* "Ort" (Zone) ist kein SaveSummary-Feld — belegte Slots zeigen die Slot-Nummer statt
            eines erfundenen Orts (Chef-Vorgabe). */}
        <p className="eyebrow">
          {summary ? t("menu.slotN").replace("{n}", String(slot.id + 1)) : t("menu.unwrittenChronicle")}
        </p>
        <h2>{summary ? summary.name : t("menu.empty")}</h2>
        <p>{summary ? `${t("menu.totalLevel")} ${summary.totalLevel}` : t("menu.noOath")}</p>
        <button
          type="button"
          className={`btn-iron new-relic-cta${summary ? " btn-iron--danger" : ""}`}
          onClick={summary ? onOverwrite : onBeginNew}
        >
          {summary ? t("menu.overwrite") : t("menu.new")}
        </button>
      </div>
    </section>
  );
}
