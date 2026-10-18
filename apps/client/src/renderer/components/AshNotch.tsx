import { useI18n } from "../i18n";
import { getAshNotchArt } from "../prestigeArt";
import "../styles/prestige.css";

/**
 * claude:2026-10-18T14:00:00+02:00 — Aschekerbe (Prestige „Der Aschesturz"): eine Kerbe im Eisenrahmen des
 * Porträts je Aufstieg, ab vier Aufstiegen die Zahl daneben (lore/prestige-namen-1.3.md § 7). Bild:
 * `assets/ui/prestige/ash_notch.webp` (prestigeArt.ts); ohne Bild zeichnet CSS bis zu drei Kerben aus Eisen und
 * Rost (`.ash-notch-cut`). Kein Stern, kein Leuchten. Rendert nichts ohne Aufstieg.
 */
export function AshNotch({ count, className = "" }: { count: number; className?: string }): JSX.Element | null {
  const { t } = useI18n();
  if (count <= 0) return null;
  const art = getAshNotchArt();
  const label = t("prestige.notch.title").replace("{n}", String(count));
  const showNumber = count > 3;
  return (
    <span className={`ash-notch ${className}`.trim()} title={label} aria-label={label} role="img">
      {art ? (
        <img loading="lazy" decoding="async" src={art} alt="" className="ash-notch-art" />
      ) : (
        <span className="ash-notch-cuts" aria-hidden="true">
          {Array.from({ length: Math.min(3, count) }, (_, i) => (
            <span key={i} className="ash-notch-cut" />
          ))}
        </span>
      )}
      {showNumber && <span className="ash-notch-num">{count}</span>}
    </span>
  );
}
