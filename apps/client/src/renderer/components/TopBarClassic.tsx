/**
 * claude:2026-10-19T10:40:00+02:00 — Chef 19.10.: Oberflächen-Stil „Classic“ = Look von 1.2.3. Diese Datei ist die
 * Reiterleiste aus 1.2.3 (Commit ec86af5); skaliert mit dem Höhenregler (--tb-scale). Ergänzt: Wiki-Reiter. Styles: styles/classic-chrome.css (.layout--classic).
 */
import { topBarPages } from "../navigation";
import { getSidebarIcon } from "../sidebarIcons";
import { useI18n } from "../i18n";
import { useGameSelector } from "../game/GameContext";
import { hasClaimableQuest } from "../pages/QuestsPage";
import { openEncyclopediaModal } from "./EncyclopediaModal";
import iconWiki from "../assets/icons/icon_collection.webp";

interface TopBarClassicProps {
  activePageId: string;
  onNavigate: (id: string) => void;
}

export function TopBarClassic({ activePageId, onNavigate }: TopBarClassicProps): JSX.Element {
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
      {/* claude:2026-10-19T10:40:00+02:00 — Das Wiki kam nach 1.2.3; im Classic-Stil als letzter Reiter. */}
      <span className="topbar-entry">
        <span className="topbar-divider" aria-hidden="true" />
        <button type="button" className="topbar-item" onClick={openEncyclopediaModal} title={t("topbar.wiki")}>
          <span className="topbar-icon" aria-hidden="true">
            <img loading="lazy" decoding="async" src={iconWiki} alt="" className="topbar-icon-img" />
          </span>
          <span className="topbar-label">{t("topbar.wiki")}</span>
        </button>
      </span>
    </nav>
  );
}
