import { useGameControl } from "../game/GameContext";
import { useI18n } from "../i18n";
import { formatPlaytime } from "../util/format";
import "../styles/catchup-overlay.css";

const CATCHUP_BAR_DELAY_MS = 1500; // claude:2026-11-06T09:25:18+01:00

/**
 * claude:2026-10-31T16:34:28+01:00 — Fortschrittsanzeige der Rückkehr aus dem Hintergrund (1.4.2). Eine schmale Leiste oben
 * in der Mitte: sichtbar, aber ohne die Eingaben zu sperren (`pointer-events: none`). Der Spielloop rechnet den Rückstand in
 * Häppchen (util/catchUp.ts) und meldet Stand und Gesamtmenge; danach öffnet sich die Rückkehr-Karte.
 */
export function CatchUpOverlay(): JSX.Element | null {
  const { t } = useI18n();
  const { catchUp } = useGameControl();
  if (!catchUp) return null;
  // claude:2026-11-06T09:25:18+01:00 — Spieler-Reports nach 1.4.2: kurze Rückkehr soll sich nicht wie „AFK-Abrechnung“ anfühlen. Das Band erscheint nur,
  // wenn das Nachholen länger als CATCHUP_BAR_DELAY_MS dauert (der Spielloop rendert währenddessen alle ~100 ms neu).
  if (performance.now() - catchUp.startedAt < CATCHUP_BAR_DELAY_MS) return null;
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
