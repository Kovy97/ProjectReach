import { createPortal } from "react-dom";
import { useI18n } from "../i18n";
import emblSkull from "../assets/ui/emblem_skull.svg";

/**
 * Gemeinsames Bestätigungs-Modal — der Ersatz für `window.confirm()` im SPIEL.
 *
 * Warum überhaupt: Grim Reach startet default im echten Vollbild (`main/index.ts`). Ein nativer
 * JS-Dialog über einem exklusiv-fullscreen Electron-Fenster ist ein bekanntes Stolperfeld
 * (Fokus-/Reihenfolge-Probleme) — für den Spieler sieht es aus, als würde der Button einfach
 * nichts tun. Genau das kam als Spieler-Report zur 1.0.0 herein („Unable to overwrite character
 * with new one"), und dieselbe Ursache steckte hinter „Spiel verlassen reagiert nicht".
 * `window.confirm()` ist damit in der Spiel-UI verbrannt; Bestätigungen laufen ab 1.0.1 über
 * dieses Modal. (Der separate Szenen-Editor `arena25d/builder` ist ein Devtool im Fenstermodus
 * und darf den nativen Dialog behalten.)
 *
 * Optik: exakt die schon vorhandene `.quit-confirm-modal`-Rezeptur (Sidebar „Spiel verlassen") —
 * keine neue CSS.
 *
 * `createPortal` nach `document.body` ist Absicht und nicht optional: mehrere Panels tragen
 * `isolation: isolate` (z. B. `.shop-panel`) oder `pointer-events: none` (`.sb-footer`) und
 * schlucken sonst genau so ein Overlay — derselbe Fehler, der das Varianten-Popup hinter der
 * Bank-Spalte begraben hat. Vom Body aus kann kein Eltern-Container mehr dazwischenfunken.
 */
export interface ConfirmRequest {
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
}

export function ConfirmModal({
  request,
  onClose,
}: {
  request: ConfirmRequest | null;
  onClose: () => void;
}): JSX.Element | null {
  const { t } = useI18n();
  if (!request) return null;
  return createPortal(
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal quit-confirm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="quit-confirm-icon">
          <img loading="lazy" decoding="async" src={emblSkull} alt="" className="pixelart" />
        </div>
        <h2 className="quit-confirm-title">{request.title}</h2>
        <p className="quit-confirm-body">{request.body}</p>
        <div className="quit-confirm-actions">
          <button className="combat-btn ghost" onClick={onClose}>
            {t("sidebar.quitCancel")}
          </button>
          <button
            className="combat-btn flee"
            onClick={() => {
              const run = request.onConfirm;
              onClose();
              run();
            }}
          >
            {request.confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
