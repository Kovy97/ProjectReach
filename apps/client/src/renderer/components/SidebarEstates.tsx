// claude:2026-10-23T19:00:00+02:00 — Ländereien (1.4.0 „Feder und Stahl“ LA, Chef 23.10.2026: eigene Gruppe in der
// Seitenleiste, zwei Seiten wie heute). Farming und Jagen laufen von selbst, neben der Hauptaktion und offline; die
// Gruppe zeigt das mit eigenem Rahmen und einem Live-Status statt des Laufpunkts. Warnfarbe, wenn etwas steht.
// Für BEIDE Seitenleisten (Reforged und Classic) dieselbe Komponente. Der Selektor liefert einen Primitiv-String
// (Minutentakt), damit die Seitenleiste nicht mit jedem 10-Hz-Tick neu rendert (Perf-Welle-Muster).
import { content } from "@hearthforge/content";
import { estateStatus, levelFromXp } from "@hearthforge/engine";
import { useGameSelector } from "../game/GameContext";
import { useI18n } from "../i18n";
import type { NavPage } from "../navigation";
import { getSidebarIcon } from "../sidebarIcons";

function minutes(ms: number | null): number {
  return ms === null ? -1 : Math.max(1, Math.ceil(ms / 60_000));
}

export function SidebarEstates({
  pages,
  activePageId,
  onNavigate,
}: {
  pages: NavPage[];
  activePageId: string;
  onNavigate: (id: string) => void;
}): JSX.Element | null {
  const { t } = useI18n();
  const key = useGameSelector((s) => {
    const e = estateStatus(s, content);
    return [
      levelFromXp(s.skills.farming?.xp ?? 0),
      levelFromXp(s.skills.hunting?.xp ?? 0),
      e.plotsGrowing,
      e.plotsUnlocked,
      minutes(e.nextHarvestMs),
      e.plotsEmpty,
      e.plotsWaiting,
      e.trapsRunning,
      e.trapsUnlocked,
      minutes(e.nextCatchMs),
      e.trapsWaiting,
    ].join("|");
  });
  if (pages.length === 0) return null;
  const [farmLvl = 1, huntLvl = 1, grow = 0, plots = 0, nextH = -1, empty = 0, waitPlots = 0, run = 0, traps = 0, nextC = -1, waitTraps = 0] =
    key.split("|").map(Number);

  const status = (id: string): { text: string; warn: boolean } => {
    if (id === "farming") {
      if (waitPlots > 0) return { text: t("estates.farm.blocked").replace("{n}", String(waitPlots)), warn: true };
      if (grow === 0) return { text: t("estates.farm.idle"), warn: empty > 0 && plots > 0 };
      let text = t("estates.farm.status").replace("{n}", String(grow)).replace("{m}", String(plots));
      if (nextH > 0) text += ` · ${t("estates.farm.next").replace("{min}", String(nextH))}`;
      return { text, warn: false };
    }
    if (run === 0 && waitTraps === 0) return { text: t("estates.hunt.idle"), warn: false };
    let text = t("estates.hunt.status").replace("{n}", String(run)).replace("{m}", String(traps));
    if (nextC > 0) text += ` · ${t("estates.hunt.next").replace("{min}", String(nextC))}`;
    if (waitTraps > 0) return { text: `${text} · ${t("estates.hunt.waiting").replace("{n}", String(waitTraps))}`, warn: true };
    return { text, warn: false };
  };

  return (
    <div className="sb-estates" role="group" aria-label={t("nav.section.estates")}>
      <div className="sb-estates-head" title={t("estates.hint")}>
        {t("nav.section.estates")}
      </div>
      {pages.map((page) => {
        const iconSrc = getSidebarIcon(page.id);
        const isActive = page.id === activePageId;
        const lvl = page.id === "farming" ? farmLvl : huntLvl;
        const st = status(page.id);
        return (
          <button
            key={page.id}
            className={`sb-skill-btn ds-button sb-skill-btn--has-level sb-estate-btn${isActive ? " active" : ""}`}
            onClick={() => onNavigate(page.id)}
            aria-current={isActive ? "page" : undefined}
            aria-label={`${t(page.label)}. ${t("sidebar.level")} ${lvl}/99. ${st.text}`}
            data-guide-id={`sidebar.${page.id}`}
            title={`${t(page.label)} · ${st.text}`}
          >
            <span className="sb-skill-icon-wrap">
              {iconSrc ? (
                <img loading="lazy" decoding="async" src={iconSrc} alt="" className="sb-skill-icon-img" />
              ) : (
                <span className="sb-skill-icon-fallback" aria-hidden="true">
                  {page.icon}
                </span>
              )}
            </span>
            <span className="sb-skill-name">{t(page.label)}</span>
            <span className={`sb-estate-status${st.warn ? " sb-estate-status--warn" : ""}`}>{st.text}</span>
            <span className={`sb-skill-level${lvl >= 99 ? " sb-skill-mastered" : ""}`}>{lvl}/99</span>
          </button>
        );
      })}
    </div>
  );
}
