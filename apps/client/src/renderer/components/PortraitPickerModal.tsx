import { useEffect, useState } from "react";
import { listPortraits } from "../portraits";
import { useI18n } from "../i18n";
import { registerEscCloser } from "../util/escStack";

const PORTRAITS = listPortraits();

export interface PortraitPickerModalProps {
  currentId: string;
  /** Modal-Überschrift — Aufrufer entscheidet den Wortlaut (Erstellung vs. späteres Ändern). */
  title: string;
  onConfirm: (id: string) => void;
  onCancel: () => void;
}

/**
 * Portrait-Galerie-Modal (Task #240): aus `CharacterCreation` ausgelagert, damit sowohl die
 * initiale Charaktererstellung als auch der spätere Zahnrad-Button auf `CharacterPage` dieselbe
 * Auswahl-Logik/Assets teilen (Grid aller `assets/portraits/*.png`, lokal getempt bis „Übernehmen").
 */
export function PortraitPickerModal({ currentId, title, onConfirm, onCancel }: PortraitPickerModalProps): JSX.Element {
  const { t } = useI18n();
  const [tempId, setTempId] = useState<string>(currentId);

  // Chef-GO Hotkeys: Escape schließt dieses Modal wie ein Klick auf den Backdrop/Abbrechen-Button
  // (util/escStack.ts, Priorität "modal") — die Komponente ist stets "offen", solange sie gemountet
  // ist (der Aufrufer rendert sie nur bedingt), daher genügt Registrierung beim Mount/Unmount.
  useEffect(() => {
    return registerEscCloser("modal", onCancel);
  }, [onCancel]);

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal portrait-gallery-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close ds-close-button" onClick={onCancel} aria-label={t("creation.portrait.cancel")} />

        <h2 className="portrait-gallery-title">{title}</h2>
        <div className="portrait-gallery-scroll">
          <div className="portrait-gallery-grid">
            {PORTRAITS.map((p) => {
              const isActive = p.id === tempId;
              return (
                <button
                  key={p.id}
                  className={`portrait-thumb${isActive ? " active" : ""}`}
                  onClick={() => setTempId(p.id)}
                  aria-pressed={isActive}
                >
                  {p.url ? (
                    <img loading="lazy" decoding="async" src={p.url} alt={p.id} />
                  ) : (
                    <span className="portrait-silhouette" style={{ fontSize: 40 }}>👤</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        <div className="portrait-gallery-actions">
          <button className="shop-citadel-btn" onClick={onCancel}>
            {t("creation.portrait.cancel")}
          </button>
          <button className="btn-iron" onClick={() => onConfirm(tempId)}>
            {t("creation.portrait.confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
