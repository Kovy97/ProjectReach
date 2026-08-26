import type { SaveSlot } from "@hearthforge/shared";
import { useI18n } from "../i18n";
import { getPortraitSrc } from "../portraits";
import { formatPlaytime } from "../util/format";

interface SlotThumbProps {
  slot: SaveSlot;
  selected: boolean;
  onClick: () => void;
  /** Load-Game-Leiste zeigt zusätzlich die Spielzeit (Chef-Vorgabe, Vorlage Mira "Ember
   *  Reliquary"); die New-Game-Leiste beschränkt sich auf Porträt/Name/Level. */
  showPlaytime?: boolean;
}

/**
 * Klickbare Miniatur-Karte der Slot-Leiste unten in NewGameScreen/LoadGameScreen (Chef-Auftrag
 * 26.08.2026, Vorlage Mira "Ember Reliquary") — reine Auswahl, KEINE eingebetteten Aktionen mehr
 * (Laden/Löschen/Überschreiben leben jetzt zentral im aktiven Reliquien-/Dossier-Rahmen darüber,
 * s. NewGameScreen.tsx/LoadGameScreen.tsx). Ersetzt die alte `SlotRow` (MainMenu.tsx), die mit den
 * eingeklappten New/Load-Panels entfallen ist.
 */
export function SlotThumb({ slot, selected, onClick, showPlaytime }: SlotThumbProps): JSX.Element {
  const { t } = useI18n();

  if (slot.summary) {
    const portraitSrc = getPortraitSrc(slot.summary.portraitId ?? null);
    return (
      <button
        type="button"
        className={`slot-thumb slot-thumb--filled${selected ? " is-active" : ""}`}
        onClick={onClick}
      >
        <div className="slot-thumb-index">{String(slot.id + 1).padStart(2, "0")}</div>
        <div className="slot-thumb-portrait">
          {portraitSrc ? <img src={portraitSrc} alt="" /> : <div className="slot-thumb-portrait-blank" />}
        </div>
        <div className="slot-thumb-nameplate">
          <div className="slot-thumb-name">{slot.summary.name}</div>
          <div className="slot-thumb-meta">
            {t("menu.totalLevel")} {slot.summary.totalLevel}
          </div>
          {showPlaytime && (
            <div className="slot-thumb-sub">
              {formatPlaytime(slot.summary.activePlayMs ?? slot.summary.elapsedMs)}
            </div>
          )}
        </div>
      </button>
    );
  }

  return (
    <button
      type="button"
      className={`slot-thumb slot-thumb--empty${selected ? " is-active" : ""}`}
      onClick={onClick}
    >
      <div className="slot-thumb-index">{String(slot.id + 1).padStart(2, "0")}</div>
      <div className="slot-thumb-empty-mark" aria-hidden="true">✦</div>
      <div className="slot-thumb-empty-label">{t("menu.empty")}</div>
      <div className="slot-thumb-begin">{t("menu.begin")}</div>
    </button>
  );
}
