import { memo, useEffect, useState } from "react";
import { content } from "@hearthforge/content";
import { achievementProgress } from "@hearthforge/engine";
import type { AchievementCategory, AchievementDef, AchievementRarity, LocalizedString } from "@hearthforge/shared";
import { apMilestoneTokens, earnedAP, totalAP } from "@hearthforge/shared";
import { useGameState } from "../game/GameContext";
import { useI18n } from "../i18n";
import { formatNum } from "../util/format";
import { getUiIcon } from "../uiIcons";
import { effectiveFxLevel } from "../util/fxLevel";
import "../styles/achievements.css";
// codex:2026-08-03T19:02:00+02:00 — Chef-Abnahme 02: produktive Warden-Ledger-Schicht nach dem Bestandsskin.
import "../styles/warden-ledger-achievements.css";

/** Welle PP (Kurz-davor-Schimmer, Antizipation-Moment 1b): ab diesem Fortschritt trägt eine
 *  gesperrte Karte den statischen Glanz-Zustand + einmaligen Mount-Sweep (zusätzlich zur
 *  bestehenden globalen "Almost there"-Leiste — hier auf der Karte SELBST, s. Chef-Vorgabe). */
const ALMOST_THRESHOLD_PCT = 90;

// ── constants ─────────────────────────────────────────────────────────────────

const CATEGORIES: AchievementCategory[] = [
  "skilling",
  "combat",
  "gathering",
  "crafting",
  "quests",
  "wealth",
  "collection",
  "exploration",
  "meta",
];

const CATEGORY_ICONS: Record<string, string> = {
  all: "🏆",
  skilling: "⚒️",
  combat: "⚔️",
  gathering: "🌿",
  crafting: "🔨",
  quests: "📜",
  wealth: "💰",
  collection: "🎁",
  exploration: "🧭",
  meta: "⭐",
};

const TROPHY_ICON_URL = getUiIcon("icon_achievments");
const UNLOCKED_ICON_URL = getUiIcon("icon_achievement_unlocked");
const LOCKED_ICON_URL = getUiIcon("icon_locked");
const MILESTONE_ICON_URL = getUiIcon("icon_ach_milestone");
const SEARCH_ICON_URL = getUiIcon("icon_ach_search");

/** Geschlossenes Kategorien-Icon-Set (Mira-Set 2026-08-03, Gap-Sweep Priorität A): löst die
 *  vormals gemischte Auswahl (teils andere Themen-Icons, exploration/meta ohne Art → Emoji
 *  sichtbar) durch ein einheitliches monochromes 10er-Set ab — größter Kohäsionsgewinn laut
 *  Sweep. Emoji-Fallback (CATEGORY_ICONS) bleibt als Sicherheitsnetz. */
const CATEGORY_UI: Record<string, string> = {
  all: "icon_ach_trophy",
  skilling: "icon_ach_forge",
  combat: "icon_ach_combat",
  gathering: "icon_ach_nature",
  crafting: "icon_ach_craft",
  quests: "icon_ach_scroll",
  wealth: "icon_ach_gold",
  collection: "icon_ach_gift",
  exploration: "icon_ach_compass",
  meta: "icon_ach_star",
};

/** PNG-Icon wenn vorhanden, sonst Emoji-Fallback. */
function categoryIcon(cat: string): JSX.Element {
  const name = CATEGORY_UI[cat];
  const src = name ? getUiIcon(name) : undefined;
  if (src) {
    return <img loading="lazy" decoding="async" src={src} alt="" />;
  }
  return <>{CATEGORY_ICONS[cat] ?? "🏆"}</>;
}

/**
 * Icon eines einzelnen Achievements: das gestaltete Kategorie-PNG, sonst das eigene Emoji.
 *
 * 1.1.0: Die Reihenfolge war verdreht — `def.icon` (Emoji) gewann, und das Kategorie-Icon kam
 * nur zum Zug, wenn keins gesetzt war. Da alle 59 Erfolge ein Emoji tragen, hat man die zehn
 * monochromen PNGs oben nie zu Gesicht bekommen; in der Liste standen stattdessen flache bunte
 * Rechtecke (Buch-Emoji in Orange, Pink, Blau) neben einem goldenen Ring.
 * Der Kommentar ueber CATEGORY_UI beschreibt die Absicht anders herum: die PNGs sollten das
 * uneinheitliche Emoji-Set abloesen, das Emoji nur das Sicherheitsnetz sein. Genau so ist es
 * jetzt — und wo es kein Kategorie-PNG gibt, faellt `categoryIcon` selbst wieder auf ein
 * Emoji zurueck, es geht also nie ein Symbol verloren.
 */
function achievementIcon(def: AchievementDef): JSX.Element {
  const kategorieName = CATEGORY_UI[def.category];
  const kategorieBild = kategorieName ? getUiIcon(kategorieName) : undefined;
  if (kategorieBild) return <img loading="lazy" decoding="async" src={kategorieBild} alt="" />;
  if (def.icon) return <>{def.icon}</>;
  return categoryIcon(def.category);
}

/** CSS rarity modifier class. */
const RARITY_CLASS: Record<AchievementRarity, string> = {
  common: "achv-rarity--common",
  uncommon: "achv-rarity--uncommon",
  rare: "achv-rarity--rare",
  epic: "achv-rarity--epic",
  legendary: "achv-rarity--legendary",
};

type FilterMode = "all" | "unlocked" | "locked";

// ── helpers ──────────────────────────────────────────────────────────────────

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function rarityAP(rarity: AchievementRarity): number {
  if (rarity === "common") return 5;
  if (rarity === "uncommon") return 10;
  if (rarity === "rare") return 25;
  if (rarity === "epic") return 50;
  return 100;
}

// ── ProgressRing ─────────────────────────────────────────────────────────────

function ProgressRing({ pct, size = 90 }: { pct: number; size?: number }): JSX.Element {
  const strokeW = Math.round(size * 0.078);
  const r = (size - strokeW) / 2;
  const circ = 2 * Math.PI * r;
  const filled = clamp(pct / 100, 0, 1) * circ;
  // Rotate so arc starts at top: offset = circ/4
  return (
    <svg width={size} height={size} className="achv-ring-svg">
      <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={strokeW} className="achv-ring-bg" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        strokeWidth={strokeW}
        className="achv-ring-fill"
        style={{
          strokeDasharray: `${filled} ${circ - filled}`,
          strokeDashoffset: circ / 4,
        }}
      />
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central" className="achv-ring-text">
        {pct}%
      </text>
    </svg>
  );
}

// ── AchievementCard ───────────────────────────────────────────────────────────

// Perf-Audit 2026-07-22: die Karte holte sich bisher SELBST `useGameState()` und rechnete ihren
// Fortschritt bei jedem 10-Hz-Tick neu aus — bei 537 Karten macht das jede Karte zu einem eigenen
// Context-Abonnenten, der bei JEDEM Tick neu rendert (9.372 DOM-Knoten Reconciliation dauerhaft im
// Idle). Fix: `progress` kommt jetzt vorberechnet als Prop von AchievementsPage (die ohnehin schon
// EINMAL pro Render `state` liest), die Karte selbst hängt an keinem Context mehr — kombiniert mit
// `memo()` rendert sie dadurch nur noch neu, wenn sich IHR eigener Fortschritt/Zustand tatsächlich
// ändert, statt bei jedem Tick unabhängig vom Inhalt.
const AchievementCard = memo(function AchievementCard({
  def,
  unlocked,
  progress,
  selected,
  onSelect,
  t,
  tr,
}: {
  def: AchievementDef;
  unlocked: boolean;
  progress: number;
  selected: boolean;
  onSelect: () => void;
  t: (k: string) => string;
  tr: (v: LocalizedString) => string;
}): JSX.Element {
  const pct = clamp(def.condition.count > 0 ? (progress / def.condition.count) * 100 : 0, 0, 100);
  const rc = RARITY_CLASS[def.rarity];
  const ap = rarityAP(def.rarity);
  const cornerIconUrl = unlocked ? UNLOCKED_ICON_URL : LOCKED_ICON_URL;

  // Welle PP (Antizipation-Moment 1b): derselbe statische Glanz + einmaliger Mount-Sweep wie die
  // Mastery-Aktionszeile (s. MasteryPage.tsx `almostRank` für die volle Begründung) — hier an den
  // vorhandenen `pct`-Wert dieser Karte gekoppelt statt an ein Mastery-Level.
  const almost = !unlocked && pct >= ALMOST_THRESHOLD_PCT;
  const [sweep, setSweep] = useState(false);
  useEffect(() => {
    if (!almost || effectiveFxLevel() === "off") return;
    setSweep(true);
    const timer = window.setTimeout(() => setSweep(false), 900);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // codex:2026-08-03T19:18:00+02:00 — Die memoized Karte ist nun eine tastaturbedienbare Ledger-Zeile mit lokaler Auswahl.
  return (
    <div
      role="button"
      tabIndex={0}
      id={`achv-card-${def.id}`}
      className={`achv-card${unlocked ? " achv-card--unlocked" : ""}${almost ? " achv-card--almost" : ""}${selected ? " achv-card--selected" : ""}`}
      aria-pressed={selected}
      onClick={onSelect}
      onKeyDown={(event) => {
        // codex:2026-08-03T19:18:00+02:00 — Enter und Leertaste entsprechen dem Mausklick ohne Scroll-Nebeneffekt.
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        onSelect();
      }}
    >
      {sweep && <span className="achv-card-almost-sweep" aria-hidden="true" />}
      <div className="achv-card-corner" aria-hidden="true">
        {cornerIconUrl
          ? <img loading="lazy" decoding="async" src={cornerIconUrl} alt="" />
          : unlocked ? "✓" : "🔒"}
      </div>

      {/* Round rarity-framed medallion — per-achievement icon if set, else category icon. */}
      <div className={`achv-emblem ${rc}`} aria-hidden="true">
        {achievementIcon(def)}
      </div>

      {/* Card body */}
      <div className="achv-body">
        {/* Header: name + rarity badge */}
        <div className="achv-head">
          <span className="achv-name">{tr(def.name)}</span>
          <span className={`achv-badge ${rc}`}>{t(`achievements.rarity.${def.rarity}`)}</span>
        </div>

        {/* AP value */}
        <div className="achv-ap">
          <span aria-hidden="true">
            {TROPHY_ICON_URL
              ? <img loading="lazy" decoding="async" src={TROPHY_ICON_URL} alt="" className="ui-icon" />
              : "🏆"}
          </span>
          <span>{ap} AP</span>
        </div>

        {/* Description */}
        <p className="achv-desc">{tr(def.description)}</p>

        {/* Progress or unlocked mark */}
        {unlocked ? (
          <div className="achv-status">✓ {t("achievements.unlocked")}</div>
        ) : (
          <div className="achv-progress">
            <div className="achv-progress-bar">
              <div className={`achv-progress-fill ${rc}`} style={{ width: `${pct}%` }} />
            </div>
            <span className="achv-progress-count">
              {formatNum(Math.min(progress, def.condition.count))} / {formatNum(def.condition.count)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
});

// ── AchievementsPage ──────────────────────────────────────────────────────────

export function AchievementsPage(): JSX.Element {
  const state = useGameState();
  const { t, tr } = useI18n();
  const [activeCategory, setActiveCategory] = useState<AchievementCategory | "all">("all");
  const [filter, setFilter] = useState<FilterMode>("all");
  // codex:2026-08-03T19:02:00+02:00 — Rein lokale Ledger-Navigation; weder Suche noch Auswahl werden persistiert.
  const [search, setSearch] = useState("");
  const [selectedAchievementId, setSelectedAchievementId] = useState<string | null>(null);

  const allDefs = content.achievements;
  const unlockedIds = new Set(state.achievements);
  const earned = earnedAP(state, content);
  const total = totalAP(content);
  const earnedCount = allDefs.filter((a) => unlockedIds.has(a.id)).length;
  const totalCount = allDefs.length;
  const completionPct = totalCount > 0 ? Math.floor((earnedCount / totalCount) * 100) : 0;
  const apPct = total > 0 ? Math.floor((earned / total) * 100) : 0;
  // Next milestone: next multiple of 5 above apPct, capped at 100. Fix-Welle CC (Pip, Befund 1):
  // bei apPct >= 100 gibt es keinen "nächsten" Meilenstein mehr — der Ring-Label-Rendersatz unten
  // zweigt in diesem Fall auf eine eigene "Vollendet"-Zeile ab, statt widersprüchlich "Next
  // milestone: 100%" bei bereits 100% zu zeigen.
  const nextMilestone = Math.min(100, Math.ceil((apPct + 1) / 5) * 5);

  // AP-Meilenstein-Leiste (Welle GG → UI, Fun-Sweep Programm Welle II §1): anders als `nextMilestone`
  // oben (rein aus dem client-seitigen `apPct` hergeleitet, nur für das Ring-Label) liest dies die
  // AUTORITATIVE Engine-Quelle `state.claimedApMilestones` — der kleinste noch nicht vergebene
  // 5-%-Schritt plus sein Token-Wert (`apMilestoneTokens`, shared). `null` = alle 20 Schritte
  // bereits geclaimt (100 % erreicht, Zeremonie bereits gefeiert oder läuft gerade).
  const claimedMilestones = new Set(state.claimedApMilestones);
  let nextClaimStep: number | null = null;
  for (let step = 5; step <= 100; step += 5) {
    if (!claimedMilestones.has(step)) {
      nextClaimStep = step;
      break;
    }
  }
  const milestoneBandPct = nextClaimStep === null
    ? 100
    : clamp(((apPct - (nextClaimStep - 5)) / 5) * 100, 0, 100);

  // Group by category (unfiltered — used both for the "All" trophy-room grouping and the tabs).
  const byCategory = new Map<AchievementCategory, AchievementDef[]>(
    CATEGORIES.map((c) => [c, []]),
  );
  for (const def of allDefs) {
    byCategory.get(def.category)?.push(def);
  }

  const matchesFilter = (def: AchievementDef): boolean =>
    filter === "unlocked"
      ? unlockedIds.has(def.id)
      : filter === "locked"
        ? !unlockedIds.has(def.id)
        : true;

  // codex:2026-08-03T19:02:00+02:00 — 537 Einträge bleiben mit Name, Beschreibung und stabiler ID durchsuchbar.
  const searchNeedle = search.trim().toLocaleLowerCase();
  const visibleDefs = allDefs.filter(
    (def) => {
      if (activeCategory !== "all" && def.category !== activeCategory) return false;
      if (!matchesFilter(def)) return false;
      if (!searchNeedle) return true;
      return def.id.toLocaleLowerCase().includes(searchNeedle)
        || tr(def.name).toLocaleLowerCase().includes(searchNeedle)
        || tr(def.description).toLocaleLowerCase().includes(searchNeedle);
    },
  );

  const selectedDef = visibleDefs.find((def) => def.id === selectedAchievementId)
    ?? visibleDefs[0]
    ?? null;

  // Welle EE (Pip P2, "Kurz davor"-Leiste): die 3–5 unerledigten Achievements mit dem höchsten
  // Fortschritt (>50 %), global über alle Kategorien — Daten kommen 1:1 aus `achievementProgress`
  // (dieselbe Quelle wie jede Karte selbst zeigt), keine neue Berechnung. Pip-Fund: "291 der 474
  // gesperrten Karten stehen bei 0 % [...] es fehlt eine globale 'fast fertig'-Sicht".
  // Welle KK (Pip-Retest, "Zielgerade ohne Kompass"): bei 535/537 standen die beiden letzten offenen
  // Erfolge bei 48 % bzw. 5 % — beide unter der 50-%-Schwelle, die Leiste war leer, ausgerechnet im
  // Endspurt. Fallback: wenn NICHTS über 50 % steht, die höchsten Kandidaten trotzdem zeigen — die
  // Leiste bleibt nur leer, wenn wirklich alles erledigt ist.
  const almostThereCandidates = allDefs
    .filter((d) => !unlockedIds.has(d.id) && d.condition.count > 0)
    .map((d) => ({
      def: d,
      pct: clamp((achievementProgress(state, d.condition, content) / d.condition.count) * 100, 0, 100),
    }))
    .filter((x) => x.pct < 100)
    .sort((a, b) => b.pct - a.pct);
  const almostThereAbove50 = almostThereCandidates.filter((x) => x.pct > 50);
  const almostThere = (almostThereAbove50.length > 0 ? almostThereAbove50 : almostThereCandidates).slice(0, 5);

  /** Springt zur Karte: schaltet Kategorie-Tab + Filter passend um (die Karte könnte hinter einem
   *  anderen Tab/Filter versteckt sein), dann scrollt + hebt kurz hervor. */
  function jumpToAchievement(def: AchievementDef): void {
    setActiveCategory(def.category);
    setFilter("all");
    setSearch("");
    setSelectedAchievementId(def.id);
    window.setTimeout(() => {
      const el = document.getElementById(`achv-card-${def.id}`);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("achv-card--flash");
      window.setTimeout(() => el.classList.remove("achv-card--flash"), 1600);
    }, 60);
  }

  // codex:2026-08-03T19:02:00+02:00 — Das Detailblatt verwendet exakt dieselbe Engine-Fortschrittsquelle wie die Liste.
  const selectedUnlocked = selectedDef ? unlockedIds.has(selectedDef.id) : false;
  const selectedProgress = selectedDef
    ? (selectedUnlocked ? selectedDef.condition.count : achievementProgress(state, selectedDef.condition, content))
    : 0;
  const selectedPct = selectedDef
    ? clamp(selectedDef.condition.count > 0 ? (selectedProgress / selectedDef.condition.count) * 100 : 0, 0, 100)
    : 0;

  return (
    <div className="achv-page achv-page--warden">
      {/* codex:2026-08-03T19:02:00+02:00 — Kompakte Bilanzleiste statt hoher Trophy-Room-Hero. */}
      <section className="achv-hero">
        <div className="achv-hero-emblem" aria-hidden="true">
          {TROPHY_ICON_URL ? <img loading="lazy" decoding="async" src={TROPHY_ICON_URL} alt="" /> : "🏆"}
        </div>

        <div className="achv-hero-title">
          <h1>{t("achievements.title")}</h1>
          <p className="achv-hero-sub">{t("achievements.subtitle")}</p>
          <div className="achv-hero-bar-row">
            <span className="achv-hero-bar-label">{t("achievements.unlockedStat")}</span>
            <div className="achv-hero-bar-track">
              <div className="achv-hero-bar-fill" style={{ width: `${completionPct}%` }} />
            </div>
            <span className="achv-hero-bar-pct">{formatNum(earnedCount)} / {formatNum(totalCount)}</span>
          </div>
        </div>

        <div className="achv-hero-stats">
          <div className="achv-hero-ap">
            <span className="achv-hero-ap-val">{formatNum(earned)}</span>
            <span className="achv-hero-ap-label">{t("achievements.apTotal")}</span>
          </div>
          <div className="achv-hero-ring">
            <ProgressRing pct={apPct} size={72} />
            <span className="achv-hero-ring-label">
              {apPct >= 100
                ? t("achievements.milestonesComplete")
                : t("achievements.nextMilestone").replace("{pct}", String(nextMilestone))}
            </span>
          </div>
        </div>
      </section>

      {/* codex:2026-08-03T19:02:00+02:00 — Dreispaltiger Warden Ledger: Register, Liste, Detailblatt. */}
      <div className="achv-ledger-shell">
        <aside className="achv-ledger-rail">
          <div className="achv-ledger-filter-group">
            {(["all", "unlocked", "locked"] as FilterMode[]).map((f) => (
              <button
                type="button"
                key={f}
                className={`achv-filter-btn${filter === f ? " achv-filter-btn--active" : ""}`}
                aria-pressed={filter === f}
                onClick={() => setFilter(f)}
              >
                {t(`achievements.filter.${f}`)}
              </button>
            ))}
          </div>

          <nav className="achv-ledger-categories" aria-label={t("achievements.title")}>
            <button
              type="button"
              className={`achv-ledger-cat${activeCategory === "all" ? " achv-ledger-cat--active" : ""}`}
              aria-pressed={activeCategory === "all"}
              onClick={() => setActiveCategory("all")}
            >
              <span className="achv-ledger-cat-icon" aria-hidden="true">{categoryIcon("all")}</span>
              <span>{t("achievements.cat.all")}</span>
              <strong>{earnedCount} / {totalCount}</strong>
            </button>
            {CATEGORIES.map((cat) => {
              const defs = byCategory.get(cat) ?? [];
              if (defs.length === 0) return null;
              const catUnlocked = defs.filter((def) => unlockedIds.has(def.id)).length;
              return (
                <button
                  type="button"
                  key={cat}
                  className={`achv-ledger-cat${activeCategory === cat ? " achv-ledger-cat--active" : ""}`}
                  aria-pressed={activeCategory === cat}
                  onClick={() => setActiveCategory(cat)}
                >
                  <span className="achv-ledger-cat-icon" aria-hidden="true">{categoryIcon(cat)}</span>
                  <span>{t(`achievements.cat.${cat}`)}</span>
                  <strong>{catUnlocked} / {defs.length}</strong>
                </button>
              );
            })}
          </nav>

          {nextClaimStep !== null && (
            <section className="achv-milestone-strip">
              <span className="achv-milestone-icon" aria-hidden="true">
                {MILESTONE_ICON_URL ? <img loading="lazy" decoding="async" src={MILESTONE_ICON_URL} alt="" className="ui-icon" /> : "🏆"}
              </span>
              <div className="achv-milestone-body">
                <div className="achv-milestone-track">
                  <div className="achv-milestone-fill" style={{ width: `${milestoneBandPct}%` }} />
                </div>
                <span className="achv-milestone-text">
                  {t("achievements.milestoneStrip.next")
                    .replace("{pct}", String(nextClaimStep))
                    .replace("{tokens}", String(apMilestoneTokens(nextClaimStep)))}
                </span>
              </div>
            </section>
          )}
        </aside>

        <main className="achv-ledger-main">
          <div className="achv-ledger-search">
            {SEARCH_ICON_URL && <img loading="lazy" decoding="async" src={SEARCH_ICON_URL} alt="" />}
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("inv.filter.searchPlaceholder")}
              aria-label={t("inv.filter.searchPlaceholder")}
            />
            <span>{formatNum(visibleDefs.length)} / {formatNum(totalCount)}</span>
          </div>

          {almostThere.length > 0 && (
            <section className="achv-almost">
              <h3 className="achv-almost-title">{t("achievements.almostThere.title")}</h3>
              <div className="achv-almost-row">
                {almostThere.slice(0, 3).map(({ def, pct }) => {
                  const rc = RARITY_CLASS[def.rarity];
                  return (
                    <button
                      key={def.id}
                      type="button"
                      className={`achv-almost-card ${rc}`}
                      title={t("achievements.almostThere.jumpHint")}
                      onClick={() => jumpToAchievement(def)}
                    >
                      <span className="achv-almost-emblem" aria-hidden="true">{achievementIcon(def)}</span>
                      <span className="achv-almost-body">
                        <span className="achv-almost-name">{tr(def.name)}</span>
                        <span className="achv-almost-bar-track">
                          <span className={`achv-almost-bar-fill ${rc}`} style={{ width: `${pct}%` }} />
                        </span>
                      </span>
                      <span className="achv-almost-pct">{Math.round(pct)}%</span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          <div className="achv-ledger-list">
            {allDefs.length === 0 ? (
              <div className="placeholder">
                <div className="placeholder-icon">
                  {TROPHY_ICON_URL ? <img loading="lazy" decoding="async" src={TROPHY_ICON_URL} alt="" className="ui-icon" /> : "🏆"}
                </div>
                <p className="muted">{t("achievements.empty")}</p>
              </div>
            ) : visibleDefs.length === 0 ? (
              <div className="placeholder">
                <div className="placeholder-icon">
                  {SEARCH_ICON_URL ? <img loading="lazy" decoding="async" src={SEARCH_ICON_URL} alt="" className="ui-icon" /> : "🔍"}
                </div>
                <p className="muted">{t("achievements.emptyFiltered")}</p>
              </div>
            ) : visibleDefs.map((def) => {
              const unlocked = unlockedIds.has(def.id);
              const progress = unlocked ? def.condition.count : achievementProgress(state, def.condition, content);
              return (
                <AchievementCard
                  key={def.id}
                  def={def}
                  unlocked={unlocked}
                  progress={progress}
                  selected={selectedDef?.id === def.id}
                  onSelect={() => setSelectedAchievementId(def.id)}
                  t={t}
                  tr={tr}
                />
              );
            })}
          </div>
        </main>

        <aside className="achv-ledger-detail">
          {selectedDef ? (
            <div className="achv-ledger-detail-plaque">
              <div className={`achv-ledger-detail-emblem ${RARITY_CLASS[selectedDef.rarity]}`} aria-hidden="true">
                {achievementIcon(selectedDef)}
              </div>
              <h2>{tr(selectedDef.name)}</h2>
              <span className={`achv-badge ${RARITY_CLASS[selectedDef.rarity]}`}>
                {t(`achievements.rarity.${selectedDef.rarity}`)}
              </span>
              <p>{tr(selectedDef.description)}</p>

              <div className="achv-ledger-detail-row">
                <span>{t(`achievements.cat.${selectedDef.category}`)}</span>
                <strong>{rarityAP(selectedDef.rarity)} AP</strong>
              </div>
              <div className="achv-ledger-detail-row">
                <span>{t("achievements.unlockedStat")}</span>
                <strong>{formatNum(Math.min(selectedProgress, selectedDef.condition.count))} / {formatNum(selectedDef.condition.count)}</strong>
              </div>
              <div className="achv-progress-bar">
                <div className={`achv-progress-fill ${RARITY_CLASS[selectedDef.rarity]}`} style={{ width: `${selectedPct}%` }} />
              </div>
              <div className={`achv-ledger-detail-status${selectedUnlocked ? " achv-ledger-detail-status--done" : ""}`}>
                {selectedUnlocked ? `✓ ${t("achievements.unlocked")}` : `${Math.round(selectedPct)}%`}
              </div>
            </div>
          ) : (
            <footer className="achv-footer">{t("achievements.footer")}</footer>
          )}
        </aside>
      </div>
    </div>
  );
}
