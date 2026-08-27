import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "../i18n";
import { formatEta } from "../util/actionRate";
import "../styles/queue-amount.css";

/**
 * Mengen-Modal der Warteschlangen-Karten (Chef 27.08.2026): das 4er-Raster heißt jetzt 1 / 25 / X / ∞.
 * „X" öffnet dieses kleine Modal im Spielstil (Stahl-9-Slice, `.btn-iron`) mit EINEM Eingabefeld „Menge"
 * und zwei Knöpfen: links „In die Warteschlange" (hinten anhängen), rechts „Jetzt ausführen" (Sofort-Start,
 * dieselbe Semantik wie Shift-Klick — die laufende Aktivität rückt mit Rest an die Queue-Front). So lassen
 * sich große Ziele (z. B. 650 Kupfererz) in einem Schritt einreihen; das Warteschlangen-Panel zeigt dann
 * Dauer und Level-Prognose, was ∞ naturgemäß nicht kann.
 *
 * Modul-Store + Portal-Host (Muster GameAlert): `openQueueAmountModal(...)` von jeder Karte aus, der Host
 * hängt einmal in App.tsx. Enter = einreihen, Shift+Enter = jetzt ausführen, Escape/Overlay = schließen.
 */
export interface QueueAmountRequest {
  /** Überschrift-Zusatz (z. B. Aktions-/Monstername); fehlt → nur „Menge". */
  subject?: string;
  /** Dauer je Durchlauf in ms für die Vorschau „≈ 12 min"; fehlt → keine Zeile. */
  perRunMs?: number;
  /** Obergrenze der Eingabe (Standard: 1 000 000, s. Engine QUEUE_TARGET_CAP). */
  max?: number;
  /** Chef 27.08.2026: Stufen-Vorschau „Stufe 24 → 31“ für die Menge (Skill-Aktionen; gleiche Rechnung wie das
   *  Warteschlangen-Panel, util/queueLevels.ts `effectiveActionXpGain`). Fehlt → keine Zeile. */
  levelPreview?: (qty: number) => { from: number; to: number } | null;
  /** Hinten anhängen. */
  onQueue: (qty: number) => void;
  /** Sofort starten (Shift-Klick-Semantik). Fehlt → Knopf deaktiviert (z. B. ohne Material). */
  onNow?: (qty: number) => void;
}

let current: QueueAmountRequest | null = null;
const listeners = new Set<() => void>();
function emit(): void {
  for (const l of listeners) l();
}
function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}
function getSnapshot(): QueueAmountRequest | null {
  return current;
}

export function openQueueAmountModal(req: QueueAmountRequest): void {
  current = req;
  emit();
}
export function closeQueueAmountModal(): void {
  if (current === null) return;
  current = null;
  emit();
}

const DEFAULT_MAX = 1_000_000;

export function QueueAmountModalHost(): JSX.Element | null {
  const req = useSyncExternalStore(subscribe, getSnapshot);
  const { t } = useI18n();
  const [raw, setRaw] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!req) return;
    setRaw("");
    // Fokus nach dem Portal-Mount, damit die Zahl sofort getippt werden kann.
    const id = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [req]);

  if (!req) return null;
  const max = req.max ?? DEFAULT_MAX;
  const n = Math.floor(Number(raw));
  const valid = Number.isFinite(n) && n >= 1;
  const qty = valid ? Math.min(n, max) : 0;

  const run = (mode: "queue" | "now"): void => {
    if (!valid) return;
    const r = req;
    closeQueueAmountModal();
    if (mode === "now" && r.onNow) r.onNow(qty);
    else r.onQueue(qty);
  };

  return createPortal(
    <div
      className="modal-overlay qam-overlay"
      role="dialog"
      aria-modal="true"
      onClick={closeQueueAmountModal}
      onKeyDown={(e) => {
        if (e.key === "Escape") closeQueueAmountModal();
      }}
    >
      <div className="qam-modal" onClick={(e) => e.stopPropagation()}>
        <div className="qam-head">
          <span className="qam-title">{t("queue.amount.title")}</span>
          {req.subject && <span className="qam-subject">{req.subject}</span>}
          <button type="button" className="qam-close" aria-label={t("common.close")} onClick={closeQueueAmountModal}>
            ×
          </button>
        </div>
        <input
          ref={inputRef}
          type="number"
          inputMode="numeric"
          min={1}
          max={max}
          className="qam-input"
          placeholder={t("qty.customPlaceholder")}
          aria-label={t("queue.amount.title")}
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            run(e.shiftKey && req.onNow ? "now" : "queue");
          }}
        />
        <div className="qam-preview">
          <span className="qam-eta">
            {valid && req.perRunMs && req.perRunMs > 0
              ? t("queue.amount.eta").replace("{time}", formatEta(req.perRunMs * qty, t))
              : " "}
          </span>
          {(() => {
            const lv = valid && req.levelPreview ? req.levelPreview(qty) : null;
            return lv ? (
              <span className={`qam-level${lv.to > lv.from ? " up" : ""}`}>
                {t("queue.amount.level").replace("{from}", String(lv.from)).replace("{to}", String(lv.to))}
              </span>
            ) : null;
          })()}
        </div>
        <div className="qam-actions">
          <button type="button" className="btn-iron btn-iron--sm" disabled={!valid} onClick={() => run("queue")}>
            {t("queue.amount.addToQueue")}
          </button>
          <button
            type="button"
            className="btn-iron btn-iron--sm"
            disabled={!valid || !req.onNow}
            title={req.onNow ? undefined : t("queue.amount.nowUnavailable")}
            onClick={() => run("now")}
          >
            {t("queue.amount.doNow")}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
