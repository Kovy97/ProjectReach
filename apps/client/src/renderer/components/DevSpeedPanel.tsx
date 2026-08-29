import { useCallback, useEffect, useSyncExternalStore } from "react";
import {
  DEV_SPEED_STEPS,
  getDevSpeed,
  isDevSpeedAllowed,
  setDevSpeed,
  setDevSpeedAllowed,
  subscribeDevSpeed,
} from "../devSpeed";

/**
 * Zeitraffer-Bedienfeld für Entwickler (Chef 29.08.2026). Rendert `null`, solange der Dev-Modus
 * nicht bestätigt ist — im ausgelieferten Spiel existiert es damit faktisch nicht.
 *
 * Bewusst KEIN Eintrag auf der Optionen-Seite, sondern ein kleines schwebendes Feld: beim Testen
 * wechselt man ständig die Seite, und der Zeitraffer soll ohne Umweg erreichbar bleiben. Position
 * unten links, weil dort keine Spiel-UI liegt (Toasts rechts, Warteschlange rechts, Sidebar links
 * oben). Absichtlich unübersetzt: reines Werkzeug, kein Spielertext.
 */
export function DevSpeedPanel(): JSX.Element | null {
  const speed = useSyncExternalStore(subscribeDevSpeed, getDevSpeed, () => 1);
  const allowed = useSyncExternalStore(subscribeDevSpeed, isDevSpeedAllowed, () => false);

  useEffect(() => {
    let alive = true;
    void window.hearthforge?.app
      ?.devToolsAllowed?.()
      .then((ok) => {
        if (alive) setDevSpeedAllowed(!!ok);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const onChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const idx = Number(e.target.value);
    setDevSpeed(DEV_SPEED_STEPS[idx] ?? 1);
  }, []);

  if (!allowed) return null;

  const idx = Math.max(0, DEV_SPEED_STEPS.indexOf(speed as (typeof DEV_SPEED_STEPS)[number]));
  const active = speed > 1;

  return (
    <div className={`devspeed${active ? " devspeed--on" : ""}`} role="group" aria-label="Developer time factor">
      <div className="devspeed-head">
        <span className="devspeed-title">Zeitraffer</span>
        <span className="devspeed-val">{speed}×</span>
      </div>
      <input
        type="range"
        min={0}
        max={DEV_SPEED_STEPS.length - 1}
        step={1}
        value={idx}
        onChange={onChange}
        aria-label="Time factor"
      />
      <div className="devspeed-foot">
        <button type="button" className="devspeed-reset" onClick={() => setDevSpeed(1)} disabled={!active}>
          Zurück auf 1×
        </button>
        {active && <span className="devspeed-warn">Nur Dev-Build</span>}
      </div>
    </div>
  );
}
