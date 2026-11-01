import { useGameControl } from "../game/GameContext";
import { useI18n } from "../i18n";
import { formatPlaytime } from "../util/format";
import "../styles/catchup-overlay.css";

/**
 * claude:2026-10-31T16:34:28+01:00 — Fortschrittsanzeige der Rückkehr aus dem Hintergrund (1.4.2). Eine schmale Leiste oben
 * in der Mitte: sichtbar, aber ohne die Eingaben zu sperren (`pointer-events: none`). Der Spielloop rechnet den Rückstand in
 * Häppchen (util/catchUp.ts) und meldet Stand und Gesamtmenge; danach öffnet sich die Rückkehr-Karte.
 */
export function CatchUpOverlay(): JSX.Element | null {
  const { t } = useI18n();
  const { catchUp } = useGameControl();
  if (!catchUp) return null;
  const pct = catchUp.totalMs > 0 ? Math.min(100, Math.floor((catchUp.doneMs / catchUp.totalMs) * 100)) : 0;
  return (
    <div className="catchup-overlay" role="status" aria-live="polite">
      <div className="catchup-title">{t("catchup.title")}</div>
      <div className="catchup-sub">
        {t("catchup.progress")
          .replace("{done}", formatPlaytime(catchUp.doneMs, t))
          .replace("{total}", formatPlaytime(catchUp.totalMs, t))}
      </div>
      <div className="catchup-bar" aria-hidden="true">
        <div className="catchup-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="catchup-pct">{pct}%</div>
    </div>
  );
}
