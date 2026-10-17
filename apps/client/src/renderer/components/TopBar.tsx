import { topBarPages } from "../navigation";
import { getSidebarIcon } from "../sidebarIcons";
import { useI18n } from "../i18n";
import { useGameSelector } from "../game/GameContext";
import { hasClaimableQuest } from "../pages/QuestsPage";
import { openEncyclopediaModal } from "./EncyclopediaModal";

interface TopBarProps {
  activePageId: string;
  onNavigate: (id: string) => void;
}

export function TopBar({ activePageId, onNavigate }: TopBarProps): JSX.Element {
  const { t } = useI18n();
  // Task #274: dezenter Claim-Punkt am Quests-Button, sobald mind. eine Quest einlösbar ist.
  // Perf-Welle Block A (2026-07-22): TopBar rendert auf JEDER Seite — `useGameSelector` liefert
  // hier direkt das fertige Primitive (boolean), kein State-Objekt-Zugriff nötig. Die Komponente
  // re-rendert jetzt NUR noch, wenn dieser boolean tatsächlich kippt (statt bisher 10×/s auf
  // jeder Seite), der ehemalige 1-Hz-Cache (Welle 2) ist damit hinfällig und entfernt — der
  // Selector selbst darf ruhig jeden Tick laufen (billige `content.quests.some(...)`-Prüfung),
  // nur der teure DOM-Re-Render entfällt bei unverändertem Ergebnis.
  const questsClaimable = useGameSelector((s) => hasClaimableQuest(s));

  return (
    <nav className="topbar" aria-label={t("common.topNav")}>
      {topBarPages.map((page, index) => {
        const iconSrc = getSidebarIcon(page.id);
        return (
          <span key={page.id} className="topbar-entry">
            {index > 0 && <span className="topbar-divider" aria-hidden="true" />}
            <button
              type="button"
              className={`topbar-item${page.id === activePageId ? " active" : ""}`}
              onClick={() => onNavigate(page.id)}
              title={t(page.label)}
              data-guide-id={`topbar.${page.id}`}
              // codex:2026-09-10T10:35:00+02:00 — Auswahl ist neben Farbe/Unterstrich auch semantisch erkennbar.
              aria-current={page.id === activePageId ? "page" : undefined}
            >
              <span className="topbar-icon" aria-hidden="true">
                {iconSrc
                  ? <img loading="lazy" decoding="async" src={iconSrc} alt="" className="topbar-icon-img" />
                  : page.icon}
              </span>
              {/* 7-Sprachen-Fundament (Task #252): der Titel-Schriftzug war ein PNG
                  (title_<id>.png) — nicht übersetzbar. Jetzt lokalisierbarer Text, per CSS
                  (.topbar-label) auf dieselbe Optik getrimmt (Cinzel, uppercase, Gold). */}
              <span className="topbar-label">{t(page.label)}</span>
              {page.id === "quests" && questsClaimable && (
                <span
                  className="topbar-claim-dot"
                  aria-hidden="true"
                  title={t("quests.claimAvailable")}
                />
              )}
            </button>
          </span>
        );
      })}
      {/* Enzyklopaedie (Chef-Auftrag 31.08.2026): grosses Fragezeichen ganz rechts, direkt neben
          den Erfolgen. Bewusst gross und an der auffaelligsten Stelle des Fensters — der kleine
          „?" im Item-Tooltip wurde laut Spieler-Rueckmeldung kaum gefunden.

          Aufbau exakt wie jeder andere Reiter (`.topbar-entry` + `.topbar-item`), damit er
          dieselbe Rahmen-, Hover- und Druck-Optik erbt statt sie nachzubauen. Er steht bewusst IN der
          Reihe: ein eigener Knopf ausserhalb sass sichtbar neben dem Holzrahmen der Leiste und
          wirkte wie hineingerutscht. */}
      <span className="topbar-entry topbar-entry--help">
        <button
          type="button"
          className="topbar-item topbar-help-btn"
          onClick={openEncyclopediaModal}
          title={t("encyclopedia.openAria")}
          aria-label={t("encyclopedia.openAria")}
          data-guide-id="topbar.encyclopedia"
        >
          <span className="topbar-help-glyph" aria-hidden="true">?</span>
        </button>
      </span>
    </nav>
  );
}
