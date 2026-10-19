import { useState } from "react";
import type { SaveSlot } from "@hearthforge/shared";
import { useI18n } from "../i18n";
import { getPortraitSrc } from "../portraits";
import { formatLastPlayed, formatPlaytime } from "../util/format";
import { SlotThumb } from "../components/SlotThumb";
// claude:2026-10-19T02:45:00+02:00 — Chef 19.10.: gemaltes Logo wie im Hauptmenü.
// claude:2026-10-19T11:30:00+02:00 — Logo folgt dem Oberflächen-Stil (Classic/Reforged).
import { useMenuLogo } from "../components/menuLogo";

/**
 * Load-Game-Screen — eigener Vollbild-Screen statt des früheren Aufklapp-Panels im Hauptmenü
 * (Chef-Auftrag 26.08.2026, Vorlage Mira "Load Game 05 · Ember Reliquary"; Metallrahmen statt
 * Miras Holzrahmen, s. NewGameScreen.tsx-JSDoc für den vollen Kontext).
 *
 * Layout: großes Dossier des gewählten Slots (Porträt + Name/Level/Spielzeit/Zuletzt gespielt +
 * LADEN/LÖSCHEN) + darunter die Leiste aller Slots (reine Auswahl). Löschen läuft über das
 * bestehende Bestätigungs-Modal (MainMenu.tsx `askDelete`/`pendingConfirm`) — niemals direkt.
 */
interface LoadGameScreenProps {
  slots: SaveSlot[];
  onBack: () => void;
  onLoad: (slotId: number) => void;
  onDeleteSlot: (slot: SaveSlot) => void;
  /** Leerer Slot gewählt + "Begin" → bietet ein neues Spiel in diesem Slot an. */
  onBeginNew: (slotId: number) => void;
}

export function LoadGameScreen({ slots, onBack, onLoad, onDeleteSlot, onBeginNew }: LoadGameScreenProps): JSX.Element {
  const menuLogo = useMenuLogo();
  const { t } = useI18n();
  const [selectedId, setSelectedId] = useState<number>(() => {
    const filled = slots.filter((s) => s.summary);
    if (filled.length === 0) return slots[0]?.id ?? 0;
    return filled.reduce((newest, s) => ((s.summary?.savedAt ?? 0) > (newest.summary?.savedAt ?? 0) ? s : newest)).id;
  });
  const selected = slots.find((s) => s.id === selectedId) ?? slots[0] ?? null;

  return (
    <div className="subscreen load-game-screen">
      <div className="subscreen-bg" aria-hidden="true" />
      <div className="subscreen-vignette" aria-hidden="true" />
      <button type="button" className="btn-iron btn-iron--sm subscreen-back" onClick={onBack}>
        {t("creation.back")}
      </button>
      <header className="subscreen-header subscreen-header--compact">
        <img src={menuLogo} alt="Grim Reach" />
        <h1>{t("menu.loadGame")}</h1>
        <span>{t("menu.loadGame.sub")}</span>
      </header>
      <main className="subscreen-main">
        {selected && (
          <LoadDossier
            slot={selected}
            onLoad={() => onLoad(selected.id)}
            onDelete={() => onDeleteSlot(selected)}
            onBeginNew={() => onBeginNew(selected.id)}
          />
        )}
        <div className="slot-rail">
          {slots.map((slot) => (
            <SlotThumb
              key={slot.id}
              slot={slot}
              selected={slot.id === selectedId}
              onClick={() => setSelectedId(slot.id)}
              showPlaytime
            />
          ))}
        </div>
      </main>
    </div>
  );
}

interface LoadDossierProps {
  slot: SaveSlot;
  onLoad: () => void;
  onDelete: () => void;
  onBeginNew: () => void;
}

function LoadDossier({ slot, onLoad, onDelete, onBeginNew }: LoadDossierProps): JSX.Element {
  const { t } = useI18n();
  const summary = slot.summary;
  const portraitSrc = summary ? getPortraitSrc(summary.portraitId ?? null) : null;

  return (
    <section className="active-relic load-dossier-card" aria-live="polite">
      <div className="load-dossier-portrait">
        {portraitSrc ? <img src={portraitSrc} alt="" /> : <div className="load-dossier-portrait-blank" />}
      </div>
      <div className="load-dossier-info">
        {/* "Ort" (Zone) ist kein SaveSummary-Feld — die Slot-Nummer ersetzt ihn (Chef-Vorgabe). */}
        <p className="eyebrow">{t("menu.slotN").replace("{n}", String(slot.id + 1))}</p>
        <h2>{summary ? summary.name : t("menu.empty")}</h2>
        {summary ? (
          <>
            <div className="load-level-block">
              <span>{t("menu.totalLevel")}</span>
              <strong>{summary.totalLevel}</strong>
            </div>
            <dl className="load-metadata">
              <div>
                <dt>{t("menu.playtime")}</dt>
                <dd>{formatPlaytime(summary.activePlayMs ?? summary.elapsedMs)}</dd>
              </div>
              <div>
                <dt>{t("menu.lastPlayed")}</dt>
                <dd>{formatLastPlayed(summary.savedAt, t)}</dd>
              </div>
            </dl>
            <div className="load-dossier-actions">
              <button type="button" className="btn-iron" onClick={onLoad}>
                {t("menu.load")}
              </button>
              <button type="button" className="btn-iron btn-iron--danger" onClick={onDelete}>
                {t("menu.delete")}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="load-empty-note">{t("menu.noOath")}</p>
            <div className="load-dossier-actions">
              <button type="button" className="btn-iron" onClick={onBeginNew}>
                {t("menu.begin")}
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
