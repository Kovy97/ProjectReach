import { useI18n } from "../i18n";
import { effectiveFxLevel } from "../util/fxLevel";

// claude:2026-10-31T14:58:54+01:00 — 1.4.2 Narben-Rückgabe (SAVE 102, Chef 31.10.2026: „deutlich und unübersehbar über den Button des Menüs“).
// Glut-Band direkt über dem Scherbenaltar-Knopf der Seitenleiste (Reforged und Classic). Sichtbar, solange
// engine `prestigeRespecPending` gilt (Beleg da, unbestätigt, mindestens ein Sturz); „Verstanden“ am Altar nimmt es weg.
// Klebt per CSS an der Kante der scrollenden Liste, damit es auch bei 1366 × 768 ohne Scrollen zu sehen ist; in der
// schmalen Symbolleiste bleibt nur das Glut-Zeichen. Puls nur mit Effekten an (fxLevel, prefers-reduced-motion).
export function PrestigeRespecRibbon({ onNavigate }: { onNavigate: (id: string) => void }): JSX.Element {
  const { t } = useI18n();
  const label = t("prestige.respec.band");
  const full = `${t("nav.prestige")}: ${label}`;
  return (
    <button
      type="button"
      className="sb-respec-ribbon"
      data-fx={effectiveFxLevel()}
      onClick={() => onNavigate("prestige")}
      title={full}
      aria-label={full}
    >
      <span className="sb-respec-ribbon-text">{label}</span>
      <span className="sb-respec-ribbon-mark" aria-hidden="true">!</span>
    </button>
  );
}

/** claude:2026-10-31T14:58:54+01:00 — Glut-Schein im Scherbenaltar-Knopf selbst (eigenes Element, die Knopf-Pseudoelemente gehören den Skins). */
export function PrestigeRespecGlow(): JSX.Element {
  return <span className="sb-respec-glow" data-fx={effectiveFxLevel()} aria-hidden="true" />;
}
