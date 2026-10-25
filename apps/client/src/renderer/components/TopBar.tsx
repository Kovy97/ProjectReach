import { useEffect, useLayoutEffect, useRef } from "react";
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

/**
 * claude:2026-10-17T11:45:00+02:00 — UI-Fundament: Die Reiter stehen IMMER in einer Reihe und
 * brechen nie mitten im Wort. Welche Form passt, hängt an Sprache, Sidebar-/Warteschlangenbreite
 * und dem Höhenregler zugleich — darum wird gemessen statt geraten:
 *   "full"    Großbuchstaben, volle Größe (Chef-Look seit 02.07.: reine Text-Reiter)
 *   "compact" gemischte Schreibung, kleinere Schrift, engere Fassung
 *   "tight"   wie compact, eine Schriftstufe kleiner (z. B. Russisch bei 1366 px + Warteschlange)
 *   "icons"   nur das Sidebar-Symbol; Name bleibt als Tooltip und für Screenreader erhalten
 * Die erste Stufe, deren Reihe nicht überläuft, gewinnt.
 */
const DENSITIES = ["full", "compact", "tight", "icons"] as const;

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

  // claude:2026-10-17T11:45:00+02:00 — Dichte direkt am DOM setzen (kein React-State): die Messung
  // läuft bei jeder Größenänderung, ein Re-Render pro Stufe wäre unnötig.
  const navRef = useRef<HTMLElement>(null);
  const fitFrame = useRef(0);
  const applyDensity = (): void => {
    const nav = navRef.current;
    if (!nav) return;
    for (const density of DENSITIES) {
      nav.dataset.density = density;
      if (nav.scrollWidth <= nav.clientWidth + 1) break;
    }
  };
  const fitDensity = (): void => {
    cancelAnimationFrame(fitFrame.current);
    fitFrame.current = requestAnimationFrame(applyDensity);
  };
  // Nach jedem Render (Sprachwechsel, Claim-Punkt) synchron vor dem Malen messen — kein Bild mit
  // übergelaufener Reihe. Größenänderungen/Schriftladen bündelt fitDensity auf eine Messung je Bild.
  useLayoutEffect(applyDensity);
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    // Breite (Sidebar ziehen, Warteschlange auf/zu, Fenster) und Höhenregler ändern die Nav-Box.
    const resize = new ResizeObserver(fitDensity);
    resize.observe(nav);
    document.fonts.addEventListener("loadingdone", fitDensity);
    // claude:2026-10-25T10:49:00+01:00 — Textgrößen-Regler (1.4.1) setzt --text-scale/data-text-scale am Wurzelelement; ohne Beobachter
    // blieb die Dichte bis zum nächsten Seitenwechsel stehen und „Wiki“ war abgeschnitten (Muster Sidebar.tsx).
    const rootAttrs = new MutationObserver(fitDensity);
    rootAttrs.observe(document.documentElement, { attributes: true, attributeFilter: ["style", "data-text-scale"] });
    return () => {
      resize.disconnect();
      rootAttrs.disconnect();
      document.fonts.removeEventListener("loadingdone", fitDensity);
      cancelAnimationFrame(fitFrame.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <nav className="topbar" aria-label={t("common.topNav")} ref={navRef} data-density="full">
      {topBarPages.map((page) => {
        const iconSrc = getSidebarIcon(page.id);
        return (
          <span key={page.id} className="topbar-entry">
            <button
              type="button"
              className={`topbar-item${page.id === activePageId ? " active" : ""}`}
              onClick={() => onNavigate(page.id)}
              title={t(page.label)}
              // claude:2026-10-17T11:45:00+02:00 — Name bleibt in der Symbol-Stufe zugänglich.
              aria-label={t(page.label)}
              data-guide-id={`topbar.${page.id}`}
              // codex:2026-09-10T10:35:00+02:00 — Auswahl ist neben Farbe/Unterstrich auch semantisch erkennbar.
              aria-current={page.id === activePageId ? "page" : undefined}
            >
              {/* Symbol nur in der Dichte "icons" sichtbar (chrome.css). */}
              <span className="topbar-icon" aria-hidden="true">
                {iconSrc
                  ? <img loading="lazy" decoding="async" src={iconSrc} alt="" className="topbar-icon-img" />
                  : page.icon}
              </span>
              {/* 7-Sprachen-Fundament (Task #252): der Titel-Schriftzug war ein PNG
                  (title_<id>.png) — nicht übersetzbar. Jetzt lokalisierbarer Text. */}
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
          {/* claude:2026-10-17T17:30:00+02:00 — Chef 17.10.: „?“ war zu unscheinbar, der Knopf heißt
              jetzt „Wiki“ und folgt den Dichtestufen der Reiter; nur in der Symbol-Stufe bleibt „?“. */}
          <span className="topbar-label topbar-help-label">{t("topbar.wiki")}</span>
          <span className="topbar-help-glyph" aria-hidden="true">?</span>
        </button>
      </span>
    </nav>
  );
}
