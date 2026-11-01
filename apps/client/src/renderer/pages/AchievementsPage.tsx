// claude:2026-10-31T09:45:00+01:00 — Erfolge-Seite neu (Chef-Entscheid 31.10.): Kacheln als Trophäenregal (Mockup 2, gleich große
// Kacheln, Fächer nach Seltenheit mit Fortschritt je Fach), links die Navigationsleiste aus Mockup 1 (Summe + Meilensteine, Filter
// Alle/Offen/Fertig/Versteckt mit Zählern, Suche, Kategorien mit Balken). Details erscheinen in einer Leiste unten (Hover/Klick),
// damit nichts abgeschnitten wird. Hidden-Flag, Bedingungen und Fortschritt kommen generisch aus Content und Engine.
import { memo, useCallback, useMemo, useRef, useState } from "react";
import { content } from "@hearthforge/content";
import { achievementProgress } from "@hearthforge/engine";
import type { AchievementCategory, AchievementDef, AchievementRarity, LocalizedString } from "@hearthforge/shared";
import { achievementPoints, apMilestoneTokens, earnedAP, totalAP } from "@hearthforge/shared";
import { useGameState } from "../game/GameContext";
import { useI18n } from "../i18n";
import { formatNum } from "../util/format";
import { getUiIcon } from "../uiIcons";
// Reine Tabelle ohne electron-Import (Wächter-Test steamAchievements.test.ts): welche Erfolge es auch auf Steam gibt.
import { STEAM_ACHIEVEMENTS } from "../../main/steamAchievements";
import "../styles/achievements.css";

// ── Konstanten ───────────────────────────────────────────────────────────────

const CATEGORIES: AchievementCategory[] = [
  "skilling", "combat", "gathering", "crafting", "quests", "wealth", "collection", "exploration", "meta",
];

/** Fächer von oben nach unten: das Seltenste zuerst (Mockup 2). */
const RARITIES: AchievementRarity[] = ["legendary", "epic", "rare", "uncommon", "common"];

/** Kacheln pro Fach, bevor „+ n weitere“ den Rest aufklappt (teilbar durch 4, 6 und 8 Spalten). */
const SHELF_CAP = 24;
/** Ab diesem Fortschritt färbt sich der Balken einer offenen Kachel „heiß“ (vormals Kurz-davor-Glanz). */
const ALMOST_THRESHOLD_PCT = 90;
const MILESTONE_STEPS = Array.from({ length: 20 }, (_, i) => (i + 1) * 5);

const CATEGORY_ICONS: Record<string, string> = {
  all: "🏆", skilling: "⚒️", combat: "⚔️", gathering: "🌿", crafting: "🔨",
  quests: "📜", wealth: "💰", collection: "🎁", exploration: "🧭", meta: "⭐",
};

/** Geschlossenes Kategorien-Icon-Set (`icon_ach_*`); Emoji nur als Sicherheitsnetz. */
const CATEGORY_UI: Record<string, string> = {
  all: "icon_ach_trophy", skilling: "icon_ach_forge", combat: "icon_ach_combat", gathering: "icon_ach_nature",
  crafting: "icon_ach_craft", quests: "icon_ach_scroll", wealth: "icon_ach_gold", collection: "icon_ach_gift",
  exploration: "icon_ach_compass", meta: "icon_ach_star",
};

const LOCKED_ICON_URL = getUiIcon("icon_locked");
const SEARCH_ICON_URL = getUiIcon("icon_ach_search");
const MILESTONE_ICON_URL = getUiIcon("icon_ach_milestone");

type FilterMode = "all" | "open" | "done" | "hidden";
const FILTERS: FilterMode[] = ["all", "open", "done", "hidden"];

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function categoryIcon(cat: string): JSX.Element {
  const name = CATEGORY_UI[cat];
  const src = name ? getUiIcon(name) : undefined;
  if (src) return <img loading="lazy" decoding="async" src={src} alt="" />;
  return <>{CATEGORY_ICONS[cat] ?? "🏆"}</>;
}

/** Icon eines Erfolgs: das gestaltete Kategorie-PNG, sonst sein Emoji. */
function achievementIcon(def: AchievementDef): JSX.Element {
  const name = CATEGORY_UI[def.category];
  const src = name ? getUiIcon(name) : undefined;
  if (src) return <img loading="lazy" decoding="async" src={src} alt="" />;
  if (def.icon) return <>{def.icon}</>;
  return categoryIcon(def.category);
}

function lockIcon(): JSX.Element {
  return LOCKED_ICON_URL ? <img loading="lazy" decoding="async" src={LOCKED_ICON_URL} alt="" /> : <>🔒</>;
}

/** Versteckter Erfolg, der noch nicht freigeschaltet ist: Name, Text und Fortschritt bleiben maskiert („???“ + Schloss). */
function isMasked(def: AchievementDef, unlocked: boolean): boolean {
  return def.hidden === true && !unlocked;
}

function pctOf(progress: number, def: AchievementDef): number {
  return clamp(def.condition.count > 0 ? (progress / def.condition.count) * 100 : 0, 0, 100);
}

function Check(): JSX.Element {
  return (
    <svg className="ach3-check" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 12.5 9.5 18 20 6.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square" />
    </svg>
  );
}

// ── Kachel ───────────────────────────────────────────────────────────────────
// Perf: die Kachel hängt an keinem Context; Fortschritt kommt als Prop, memo() verhindert Neuzeichnen pro Tick.

const Tile = memo(function Tile({
  def, unlocked, progress, selected, onHover, onSelect, t, tr,
}: {
  def: AchievementDef;
  unlocked: boolean;
  progress: number;
  selected: boolean;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  t: (k: string) => string;
  tr: (v: LocalizedString) => string;
}): JSX.Element {
  const masked = isMasked(def, unlocked);
  const pct = pctOf(progress, def);
  const hot = !unlocked && !masked && pct >= ALMOST_THRESHOLD_PCT;
  const state = unlocked ? "u" : masked ? "h" : "o";
  const steam = STEAM_ACHIEVEMENTS[def.id] !== undefined;
  const ap = t("achievements.ap").replace("{n}", String(achievementPoints(def)));
  return (
    <li
      id={`ach3-tile-${def.id}`}
      className={`ach3-tile ach3-r-${def.rarity} ach3-tile--${state}${selected ? " ach3-tile--sel" : ""}`}
      tabIndex={0}
      aria-pressed={selected}
      onMouseEnter={() => onHover(def.id)}
      onFocus={() => onHover(def.id)}
      onBlur={() => onHover(null)}
      onClick={() => onSelect(def.id)}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        onSelect(def.id);
      }}
    >
      <span className={`ach3-med ach3-med--${state}`} aria-hidden="true">{masked ? lockIcon() : achievementIcon(def)}</span>
      <b className="ach3-name">{masked ? t("achievements.hidden.name") : tr(def.name)}</b>
      <span className="ach3-meta">
        {unlocked ? (
          <><Check /> {t("achievements.unlocked")}</>
        ) : masked ? (
          <>{lockIcon()} {t("achievements.hidden.badge")}</>
        ) : (
          <>{formatNum(Math.min(progress, def.condition.count))} / {formatNum(def.condition.count)}</>
        )}
      </span>
      <span className={`ach3-bar${unlocked ? " ach3-bar--full" : hot ? " ach3-bar--hot" : ""}`}>
        <s style={{ width: `${unlocked ? 100 : masked ? 0 : pct}%` }} />
      </span>
      <span className="ach3-foot">
        <span className="ach3-ap">{ap}</span>
        {steam && <span className="ach3-steam" title={t("achievements.steam.title")}>{t("achievements.steam")}</span>}
      </span>
    </li>
  );
});

// ── Seite ────────────────────────────────────────────────────────────────────

export function AchievementsPage(): JSX.Element {
  const state = useGameState();
  const { t, tr } = useI18n();
  const [activeCategory, setActiveCategory] = useState<AchievementCategory | "all">("all");
  const [filter, setFilter] = useState<FilterMode>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<ReadonlySet<AchievementRarity>>(new Set());
  const shelfRef = useRef<HTMLDivElement | null>(null);

  const allDefs = content.achievements;
  const unlockedIds = new Set(state.achievements);
  const earned = earnedAP(state, content);
  const total = totalAP(content);
  const earnedCount = allDefs.filter((a) => unlockedIds.has(a.id)).length;
  const totalCount = allDefs.length;
  const donePct = totalCount > 0 ? Math.floor((earnedCount / totalCount) * 100) : 0;
  const apFillPct = total > 0 ? clamp((earned / total) * 100, 0, 100) : 0;

  // Nächster noch nicht vergebener Meilenstein: autoritativ aus `state.claimedApMilestones` (die Engine löst automatisch ein,
  // Toast + Zeremonie kommen von dort); die Leiste zeigt nur den Stand.
  const claimedSteps = new Set(state.claimedApMilestones);
  const nextClaimStep = MILESTONE_STEPS.find((s) => !claimedSteps.has(s)) ?? null;

  // Fortschritt aller offenen, nicht maskierten Erfolge: nur alle 10 Ticks neu (Sortierung + Kacheln), nicht pro Tick.
  const progressKey = Math.floor(state.totalTicks / 10);
  const progressMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const def of allDefs) {
      if (unlockedIds.has(def.id)) map.set(def.id, def.condition.count);
      else if (!def.hidden) map.set(def.id, achievementProgress(state, def.condition, content));
      else map.set(def.id, 0);
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progressKey, state.achievements.length]);

  // Pro Kategorie (ohne Filter/Suche): Basis für Zähler, Balken und Seltenheits-Pillen.
  const inCategory = (def: AchievementDef): boolean => activeCategory === "all" || def.category === activeCategory;
  const catDefs = allDefs.filter(inCategory);
  const filterCounts: Record<FilterMode, number> = {
    all: catDefs.length,
    open: catDefs.filter((d) => !unlockedIds.has(d.id)).length,
    done: catDefs.filter((d) => unlockedIds.has(d.id)).length,
    hidden: catDefs.filter((d) => d.hidden === true).length,
  };

  const needle = search.trim().toLocaleLowerCase();
  const matches = (def: AchievementDef): boolean => {
    const unlocked = unlockedIds.has(def.id);
    if (filter === "open" && unlocked) return false;
    if (filter === "done" && !unlocked) return false;
    if (filter === "hidden" && def.hidden !== true) return false;
    if (!needle) return true;
    // Maskierte Erfolge sind nicht durchsuchbar (auch nicht über die ID, die den Inhalt verrät).
    if (isMasked(def, unlocked)) return false;
    return def.id.toLocaleLowerCase().includes(needle)
      || tr(def.name).toLocaleLowerCase().includes(needle)
      || tr(def.description).toLocaleLowerCase().includes(needle);
  };

  // Fächer: je Seltenheit zuerst offene nach Fortschritt (das Nächste vorn), dann maskierte, zuletzt Freigeschaltete.
  const shelves = RARITIES.map((rarity) => {
    const all = catDefs.filter((d) => d.rarity === rarity);
    const shown = all.filter(matches);
    const rank = (d: AchievementDef): number => (unlockedIds.has(d.id) ? 2 : isMasked(d, false) ? 1 : 0);
    shown.sort((a, b) => rank(a) - rank(b)
      || (rank(a) === 0 ? pctOf(progressMap.get(b.id) ?? 0, b) - pctOf(progressMap.get(a.id) ?? 0, a) : 0));
    return { rarity, all, shown, done: all.filter((d) => unlockedIds.has(d.id)).length };
  });
  const shownTotal = shelves.reduce((n, s) => n + s.shown.length, 0);

  const focusId = hoverId ?? selectedId;
  const focusDef = focusId ? allDefs.find((d) => d.id === focusId) ?? null : null;
  const focusUnlocked = focusDef ? unlockedIds.has(focusDef.id) : false;
  const focusProgress = !focusDef ? 0
    : focusUnlocked ? focusDef.condition.count
      : isMasked(focusDef, false) ? 0
        : achievementProgress(state, focusDef.condition, content);

  // claude:2026-10-31T15:12:00+01:00 — C4: stabile Referenz, damit die memoisierten Kacheln nicht bei jedem Tick neu rendern.
  const onSelectTile = useCallback((id: string) => setSelectedId((cur) => (cur === id ? null : id)), []);

  function pickCategory(cat: AchievementCategory | "all"): void {
    setActiveCategory(cat);
    shelfRef.current?.scrollTo({ top: 0 });
  }

  function jumpToShelf(rarity: AchievementRarity): void {
    const el = shelfRef.current?.querySelector<HTMLElement>(`[data-shelf="${rarity}"]`);
    // claude:2026-10-31T15:12:00+01:00 — C5: Position relativ zum Scroll-Container über Rechtecke statt offsetTop (offsetParent war nicht der Container → Sprung zu weit).
    if (el && shelfRef.current) {
      const box = shelfRef.current;
      const top = el.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop - 4;
      box.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    }
  }

  function toggleShelf(rarity: AchievementRarity): void {
    const next = new Set(expanded);
    if (next.has(rarity)) next.delete(rarity);
    else next.add(rarity);
    setExpanded(next);
  }

  return (
    <div className="ach3-page">
      {/* ── Navigationsleiste (Mockup 1) ─────────────────────────────────── */}
      <aside className="ach3-rail">
        <section className="ach3-panel ach3-sum">
          <span className="ach3-hd">{t("achievements.apScore")}</span>
          <span className="ach3-big">{formatNum(earned)} <small>/ {formatNum(total)}</small></span>
          <span className="ach3-bar ach3-bar--lg"><s style={{ width: `${apFillPct}%` }} /></span>
          <span className="ach3-sum-line">
            {t("achievements.summary")
              .replace("{done}", formatNum(earnedCount))
              .replace("{total}", formatNum(totalCount))
              .replace("{pct}", String(donePct))}
          </span>
          <span className="ach3-ms">
            {MILESTONE_ICON_URL && <img src={MILESTONE_ICON_URL} alt="" />}
            <span>
              {nextClaimStep === null
                ? t("achievements.milestonesComplete")
                : t("achievements.milestoneStrip.next")
                  .replace("{pct}", String(nextClaimStep))
                  .replace("{tokens}", String(apMilestoneTokens(nextClaimStep)))}
            </span>
          </span>
          <span className="ach3-ticks" role="list" aria-label={t("achievements.apScore")}>
            {MILESTONE_STEPS.map((step) => {
              const got = claimedSteps.has(step);
              const label = t("achievements.milestone.step")
                .replace("{pct}", String(step))
                .replace("{tokens}", String(apMilestoneTokens(step)));
              return (
                <i
                  key={step}
                  role="listitem"
                  className={`${got ? "ach3-tick--got" : ""}${step === nextClaimStep ? " ach3-tick--next" : ""}`}
                  title={got ? `${label} · ${t("achievements.milestone.claimed")}` : label}
                />
              );
            })}
          </span>
        </section>

        <section className="ach3-panel ach3-tools">
          <label className="ach3-search">
            {SEARCH_ICON_URL && <img loading="lazy" decoding="async" src={SEARCH_ICON_URL} alt="" />}
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("inv.filter.searchPlaceholder")}
              aria-label={t("inv.filter.searchPlaceholder")}
            />
          </label>
          <div className="ach3-seg" role="group">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                className={filter === f ? "ach3-on" : ""}
                aria-pressed={filter === f}
                onClick={() => setFilter(f)}
              >
                {t(`achievements.filter.${f}`)} <em>{formatNum(filterCounts[f])}</em>
              </button>
            ))}
          </div>
        </section>

        <nav className="ach3-panel ach3-cats" aria-label={t("achievements.title")}>
          {(["all", ...CATEGORIES] as const).map((cat) => {
            const defs = cat === "all" ? allDefs : allDefs.filter((d) => d.category === cat);
            if (defs.length === 0) return null;
            const done = defs.filter((d) => unlockedIds.has(d.id)).length;
            return (
              <button
                key={cat}
                type="button"
                className={`ach3-cat${activeCategory === cat ? " ach3-on" : ""}`}
                aria-pressed={activeCategory === cat}
                onClick={() => pickCategory(cat)}
              >
                <span className="ach3-cat-ico" aria-hidden="true">{categoryIcon(cat)}</span>
                <span className="ach3-cat-name">{t(`achievements.cat.${cat}`)}</span>
                <span className="ach3-cat-n">{done}/{defs.length}</span>
                <span className="ach3-bar"><s style={{ width: `${(done / defs.length) * 100}%` }} /></span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* ── Trophäenregal (Mockup 2) ─────────────────────────────────────── */}
      <section className="ach3-main">
        <header className="ach3-panel ach3-head">
          <div className="ach3-title">
            <h1>{t("achievements.title")}</h1>
            {/* claude:2026-10-31T15:12:00+01:00 — E9: ohne Filter „138 von 363 freigeschaltet“, mit Filter „94 Einträge“ (vorher „363 von 363“, missverständlich) */}
            <span>
              {shownTotal === totalCount
                ? t("achievements.count").replace("{n}", formatNum(earnedCount)).replace("{total}", formatNum(totalCount))
                : t("achievements.countFiltered").replace("{n}", formatNum(shownTotal))}
            </span>
          </div>
          <div className="ach3-pills">
            {shelves.filter((s) => s.all.length > 0).map((s) => (
              <button key={s.rarity} type="button" className={`ach3-pill ach3-r-${s.rarity}`} onClick={() => jumpToShelf(s.rarity)}>
                <i aria-hidden="true" />
                <b>{t(`achievements.rarity.${s.rarity}`)}</b>
                <span>{s.done}/{s.all.length}</span>
              </button>
            ))}
          </div>
        </header>

        <div className="ach3-shelf" ref={shelfRef} onMouseLeave={() => setHoverId(null)}>
          {allDefs.length === 0 ? (
            <p className="ach3-empty">{t("achievements.empty")}</p>
          ) : shownTotal === 0 ? (
            <p className="ach3-empty">{t("achievements.emptyFiltered")}</p>
          ) : shelves.filter((s) => s.shown.length > 0).map((s) => {
            const open = expanded.has(s.rarity) || needle !== "";
            const visible = open ? s.shown : s.shown.slice(0, SHELF_CAP);
            const rest = s.shown.length - visible.length;
            const canCollapse = open && needle === "" && s.shown.length > SHELF_CAP;
            return (
              <section key={s.rarity} className={`ach3-sec ach3-r-${s.rarity}`} data-shelf={s.rarity}>
                <header>
                  <h2>{t(`achievements.rarity.${s.rarity}`)}</h2>
                  <span className="ach3-sc">{s.done} / {s.all.length}</span>
                  <span className="ach3-spa">
                    {t("achievements.shelf.each").replace("{ap}", t("achievements.ap").replace("{n}", String(achievementPoints(s.all[0]!))))}
                  </span>
                  <span className="ach3-bar ach3-bar--shelf"><s style={{ width: `${(s.done / s.all.length) * 100}%` }} /></span>
                  {(rest > 0 || canCollapse) && (
                    <button type="button" className="ach3-more" onClick={() => toggleShelf(s.rarity)}>
                      {rest > 0 ? t("achievements.shelf.more").replace("{n}", formatNum(rest)) : t("achievements.shelf.less")}
                    </button>
                  )}
                </header>
                <ul className="ach3-grid">
                  {visible.map((def) => (
                    <Tile
                      key={def.id}
                      def={def}
                      unlocked={unlockedIds.has(def.id)}
                      progress={progressMap.get(def.id) ?? 0}
                      selected={selectedId === def.id}
                      onHover={setHoverId}
                      onSelect={onSelectTile}
                      t={t}
                      tr={tr}
                    />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>

        <DetailBar def={focusDef} unlocked={focusUnlocked} progress={focusProgress} t={t} tr={tr} />
      </section>
    </div>
  );
}

/** Detailleiste: volle Beschreibung, Fortschritt, AP, Seltenheit, Steam; nichts wird abgeschnitten. */
function DetailBar({ def, unlocked, progress, t, tr }: {
  def: AchievementDef | null;
  unlocked: boolean;
  progress: number;
  t: (k: string) => string;
  tr: (v: LocalizedString) => string;
}): JSX.Element {
  if (!def) {
    return <footer className="ach3-panel ach3-detail ach3-detail--empty">{t("achievements.detail.hint")}</footer>;
  }
  const masked = isMasked(def, unlocked);
  const pct = pctOf(progress, def);
  const steam = STEAM_ACHIEVEMENTS[def.id] !== undefined;
  return (
    <footer className={`ach3-panel ach3-detail ach3-r-${def.rarity}`} aria-live="polite">
      <span className={`ach3-med ach3-med--big ach3-med--${unlocked ? "u" : masked ? "h" : "o"}`} aria-hidden="true">
        {masked ? lockIcon() : achievementIcon(def)}
      </span>
      <div className="ach3-detail-text">
        <div className="ach3-detail-top">
          <h3>{masked ? t("achievements.hidden.name") : tr(def.name)}</h3>
          <span className="ach3-badge">{t(`achievements.rarity.${def.rarity}`)}</span>
          {steam && <span className="ach3-steam" title={t("achievements.steam.title")}>{t("achievements.steam")}</span>}
          <span className="ach3-detail-cat">{t(`achievements.cat.${def.category}`)}</span>
        </div>
        <p>{masked ? t("achievements.hidden.desc") : tr(def.description)}</p>
      </div>
      <div className="ach3-detail-prog">
        <span className="ach3-hd">{t("achievements.detail.progress")}</span>
        {masked ? (
          <span className="ach3-detail-val">{t("achievements.hidden.badge")}</span>
        ) : unlocked ? (
          <span className="ach3-detail-val ach3-detail-val--done"><Check /> {t("achievements.unlocked")}</span>
        ) : (
          <span className="ach3-detail-val">{formatNum(Math.min(progress, def.condition.count))} / {formatNum(def.condition.count)}</span>
        )}
        <span className={`ach3-bar${unlocked ? " ach3-bar--full" : ""}`}><s style={{ width: `${unlocked ? 100 : masked ? 0 : pct}%` }} /></span>
      </div>
      <div className="ach3-detail-ap">{t("achievements.ap").replace("{n}", String(achievementPoints(def)))}</div>
    </footer>
  );
}
