import { useEffect, useState } from "react";
import { content } from "@hearthforge/content";
import {
  masteryBonusChance,
  masteryLevel,
  masteryPoolBonus,
  masteryPoolCapacity,
  masteryPoolPct,
  masteryPoolXp,
  masteryPreserveFor,
  masteryProgress,
  masterySpeedFor,
  xpForLevel,
} from "@hearthforge/engine";
import { MASTERY_MAX_LEVEL, MASTERY_POOL_CHECKPOINTS } from "@hearthforge/shared";
import type { ActionDef, LocalizedString, SkillId } from "@hearthforge/shared";
import { useGameState } from "../game/GameContext";
import { useI18n } from "../i18n";
import { formatNum, formatPct1 } from "../util/format";
import { getSidebarIcon } from "../sidebarIcons";
import { SKILL_EMOJI_FALLBACK } from "../skillIcons";
import { getUiIcon } from "../uiIcons";
import { computeActionRate, formatEta } from "../util/actionRate";
import {
  masteryBonusLineAt,
  masteryRankKey,
  masteryRankTier,
  nextMasteryRank,
  poolCheckpointBonusLine,
} from "../util/masteryRank";
import { effectiveFxLevel } from "../util/fxLevel";
import "../styles/mastery-anticipation.css";

// ── Skill category buckets ────────────────────────────────────────────────────

const GATHERING_SKILLS = new Set([
  "woodcutting", "mining", "fishing", "farming", "foraging", "thieving",
]);
const CRAFTING_SKILLS = new Set([
  "smithing", "cooking", "leatherworking",
  "jewelcrafting", "runecrafting", "herblore",
]);
const COMBAT_SKILLS = new Set([
  "attack", "power", "strength", "defence", "ranged",
  "magic", "warding", "vitality",
]);

type MasteryTab = "all" | "skilling" | "gathering" | "crafting" | "combat" | "completed";

// ── Skill rarity rule (cosmetic only) ────────────────────────────────────────
// Derived from action count per skill:
//   1–2  actions → common
//   3–4  actions → uncommon
//   5–7  actions → rare
//   8–10 actions → epic
//   11+  actions → legendary
function skillRarity(actionCount: number): string {
  if (actionCount <= 2) return "common";
  if (actionCount <= 4) return "uncommon";
  if (actionCount <= 7) return "rare";
  if (actionCount <= 10) return "epic";
  return "legendary";
}

// ── ProgressRing ─────────────────────────────────────────────────────────────

function ProgressRing({ pct }: { pct: number }): JSX.Element {
  const size = 88;
  const strokeW = 7;
  const r = (size - strokeW) / 2;
  const circ = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, pct / 100));
  const filled = clamped * circ;
  return (
    <svg width={size} height={size} className="ms2-ring-svg">
      <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={strokeW} className="ms2-ring-bg" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        strokeWidth={strokeW}
        className="ms2-ring-fill"
        style={{
          strokeDasharray: `${filled} ${circ - filled}`,
          strokeDashoffset: circ / 4,
        }}
      />
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central" className="ms2-ring-text">
        {Math.round(pct)}%
      </text>
    </svg>
  );
}

// ── MasteryAction row ─────────────────────────────────────────────────────────

// Welle QQ (2026-07-17): echtes Stern-Icon statt ★-Unicode-Glyphe im Rang-Badge.
const MASTERY_STAR_ICON_URL = getUiIcon("icon_mastery_star");

function MasteryActionRow({ action }: { action: ActionDef }): JSX.Element {
  const state = useGameState();
  const { t, tr } = useI18n();
  const lvl = masteryLevel(state, action.id);
  const prog = masteryProgress(state, action.id);
  const bonus = masteryBonusChance(state, action.id);
  const speed = masterySpeedFor(state, action.id);
  // Preservation only applies to actions with material inputs
  const preserve = action.inputs?.length ? masteryPreserveFor(state, action.id) : 0;
  const maxed = lvl >= MASTERY_MAX_LEVEL;
  const fillPct = Math.min(100, (maxed ? 1 : prog) * 100);
  // Fix-Welle CC (Mona, Befund 1): erst runden, DANN auf > 0 prüfen — vorher gatete `speed < 1`
  // auf dem rohen Float, also zeigte ein winziger (< 0.5 %) Speed-Bonus einen sinnlosen "−0% ⏱"-
  // Chip. Dieselbe Falle gilt symmetrisch für die beiden Nachbar-Chips (bonus/preserve), daher
  // hier gleich mitgehärtet. Welle KK (Mona-Retest, "★2-Chip zeigt +1% bei real 0,5%"): Gate UND
  // Anzeige jetzt auf 1-Dezimal-Genauigkeit (statt Ganzzahl-Rundung, die 0,5% auf "1%" verdoppelte)
  // — `formatPct1` für die Anzeige, dieselbe Rundung für das Gate, damit beide konsistent bleiben.
  const bonusVisible = Math.round(bonus * 1000) > 0;
  const speedVisible = Math.round((1 - speed) * 1000) > 0;
  const preserveVisible = Math.round(preserve * 1000) > 0;
  const bonusPct = formatPct1(bonus);
  const speedPct = formatPct1(1 - speed);
  const preservePct = formatPct1(preserve);

  // Welle EE (Mona M3): Rang-Stern der bereits erreichten Stufe — reine Optik (CSS-Farbklasse auf
  // dem bestehenden "★ {lvl}"-Badge), KEIN neuer Zahlen-Bonus.
  const rankTier = masteryRankTier(lvl);

  // Welle EE (Mona M2): nächstes Ziel benannt + Fortschritt (Bar oben) + grobe ETA — nur wenn diese
  // Aktion aktiv läuft (dann ist eine Rate ableitbar), sonst nur die reine XP-Restzahl.
  const nextRank = maxed ? null : nextMasteryRank(lvl);
  let etaLine: string | null = null;
  if (nextRank !== null) {
    const targetXp = xpForLevel(nextRank);
    const currentXp = state.mastery[action.id]?.xp ?? 0;
    // Welle KK (Mona-Retest, "Dezimal-XP in Ziel-Zeilen"): gerundet — `formatNum` zeigt sonst bis zu
    // 3 Nachkommastellen ("3,799.5 XP"), reine Rechen-Artefakte einer Teil-Aktion, kein echter Wert.
    const remainingXp = Math.round(Math.max(0, targetXp - currentXp));
    if (state.activeActionId === action.id) {
      const rate = computeActionRate(state, content, action);
      const masteryXpPerHour = rate.successChance > 0 && rate.avgDurationMs > 0
        ? rate.successChance * (3_600_000 / rate.avgDurationMs) * action.xp
        : 0;
      etaLine = masteryXpPerHour > 0
        ? t("skill.eta.levelIn")
            .replace("{n}", String(nextRank))
            .replace("{time}", formatEta((remainingXp / masteryXpPerHour) * 3_600_000, t))
        : t("mastery.eta.remaining").replace("{xp}", formatNum(remainingXp)).replace("{lvl}", String(nextRank));
    } else {
      etaLine = t("mastery.eta.remaining").replace("{xp}", formatNum(remainingXp)).replace("{lvl}", String(nextRank));
    }
  }

  // Welle PP (Kurz-davor-Schimmer, Antizipation): "fast erreicht" = genau EIN Level unter dem
  // nächsten Rang-Stern UND <5% Rest innerhalb dieses letzten Levels (`prog` ist bereits der
  // Fortschritt 0..1 innerhalb des AKTUELLEN Levels, s. `masteryProgress` oben — bei `nextRank ===
  // lvl + 1` deckt dieses eine Level exakt die letzte Etappe bis zum Stern ab, kein separater
  // "Start des letzten Levels"-Grenzwert nötig). Rein aus bereits vorhandenen Werten abgeleitet,
  // keine neue Berechnung.
  const almostRank = !maxed && nextRank !== null && nextRank === lvl + 1 && prog >= 0.95;
  // Einmaliger Sweep beim SEITEN-/Zeilen-Mount (Chef-Vorgabe: kein Dauer-Glitzern) — der Glanz-
  // Zustand selbst (Klasse unten) bleibt statisch, unabhängig von diesem Timer. `almostRank` wird
  // NUR beim ersten Render dieser Zeile ausgewertet (leeres Dep-Array) — überschreitet der
  // Spieler die Schwelle live WÄHREND die Zeile schon offen ist, bleibt es beim statischen Glanz
  // ohne erneuten Sweep (spart einen zweiten Trigger-Pfad für einen rein kosmetischen Effekt).
  const [sweep, setSweep] = useState(false);
  useEffect(() => {
    if (!almostRank || effectiveFxLevel() === "off") return;
    setSweep(true);
    const timer = window.setTimeout(() => setSweep(false), 900);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`ms2-action-row${maxed ? " ms2-maxed" : ""}${almostRank ? " ms2-action-row--almost" : ""}`}>
      {sweep && <span className="ms2-almost-sweep" aria-hidden="true" />}
      <span className="ms2-action-name">{tr(action.name)}</span>
      <span className={`ms2-action-lvl${rankTier ? ` ms2-action-lvl--${rankTier}` : ""}`}>
        {MASTERY_STAR_ICON_URL
          ? <img loading="lazy" decoding="async" src={MASTERY_STAR_ICON_URL} alt="" className="ui-icon ms2-action-lvl-icon" />
          : "★"} {lvl}
      </span>
      <div className="ms2-action-bar">
        <div className="ms2-action-fill" style={{ width: `${fillPct}%` }} />
      </div>
      <span className="ms2-action-perks">
        {bonusVisible && <span>+{bonusPct}% ×2</span>}
        {speedVisible && <span>−{speedPct}% ⏱</span>}
        {preserveVisible && <span>{preservePct}% ♻</span>}
      </span>
      {nextRank !== null && (
        <span className="ms2-action-next">
          <span className="ms2-action-next-rank">
            {t("mastery.nextRank")
              .replace("{tier}", t(masteryRankKey(masteryRankTier(nextRank)!)))
              .replace("{lvl}", String(nextRank))}
            {(() => {
              const preview = masteryBonusLineAt(nextRank, !!action.inputs?.length, t);
              return preview ? ` — ${preview}` : "";
            })()}
          </span>
          {etaLine && <span className="ms2-action-next-eta muted">{etaLine}</span>}
        </span>
      )}
    </div>
  );
}

// ── SkillBlock ────────────────────────────────────────────────────────────────

function SkillBlock({
  skillId,
  collapsed,
  onToggle,
  t,
  tr,
}: {
  skillId: SkillId;
  collapsed: boolean;
  onToggle: () => void;
  t: (k: string) => string;
  tr: (v: LocalizedString) => string;
}): JSX.Element {
  const state = useGameState();
  const skill = content.skills[skillId];

  const actions = Object.values(content.actions)
    .filter((a) => a.skill === skillId)
    .map((a) => ({ a, lvl: masteryLevel(state, a.id) }))
    .sort((x, y) => y.lvl - x.lvl);

  const sumLvl = actions.reduce((n, x) => n + x.lvl, 0);
  const maxLvl = actions.length * MASTERY_MAX_LEVEL;
  const pct = maxLvl > 0 ? Math.round((sumLvl / maxLvl) * 100) : 0;
  const poolPct = masteryPoolPct(state, content, skillId);
  const poolBonus = masteryPoolBonus(state, content, skillId);

  const rarity = skillRarity(actions.length);
  const rarityClass = `ms2-rarity--${rarity}`;
  const iconSrc = getSidebarIcon(skillId);

  // Welle EE (Mona M2, Fund #2 "Der Pool-Checkpoint kam ebenso stumm"): nächster Pool-Checkpoint
  // benannt + Fortschritt (Bar oben zeigt ihn bereits) + grobe ETA — nur wenn die AKTIVE Aktion zu
  // diesem Skill gehört (dann ist eine Rate ableitbar), sonst die reine XP-Restzahl.
  const nextCp = MASTERY_POOL_CHECKPOINTS.find((cp) => cp > poolPct) ?? null;
  let poolNextLine: string | null = null;
  if (nextCp !== null) {
    const poolXp = masteryPoolXp(state, content, skillId);
    const capacity = masteryPoolCapacity(content, skillId);
    // Welle KK (Mona-Retest, "Dezimal-XP"): s. Kommentar bei der Aktions-ETA oben — gerundet.
    const remainingXp = Math.round(Math.max(0, nextCp * capacity - poolXp));
    const bonusLine = poolCheckpointBonusLine(nextCp, t);
    const activeAction = state.activeActionId ? content.actions[state.activeActionId] : null;
    let etaText: string | null = null;
    if (activeAction && activeAction.skill === skillId) {
      const rate = computeActionRate(state, content, activeAction);
      const masteryXpPerHour = rate.successChance > 0 && rate.avgDurationMs > 0
        ? rate.successChance * (3_600_000 / rate.avgDurationMs) * activeAction.xp
        : 0;
      if (masteryXpPerHour > 0) etaText = formatEta((remainingXp / masteryXpPerHour) * 3_600_000, t);
    }
    poolNextLine = etaText
      ? t("mastery.pool.nextCheckpointEta")
          .replace("{bonus}", bonusLine)
          .replace("{xp}", formatNum(remainingXp))
          .replace("{eta}", etaText)
      : t("mastery.pool.nextCheckpointNoEta")
          .replace("{bonus}", bonusLine)
          .replace("{xp}", formatNum(remainingXp));
  } else {
    poolNextLine = t("mastery.pool.maxed");
  }

  return (
    <div className="ms2-skill-block">
      <button className="ms2-skill-hdr" onClick={onToggle} aria-expanded={!collapsed}>
        {/* Round rarity-framed emblem — real skill icon (assets/sidebar), emoji fallback */}
        <div className={`ms2-skill-emblem ${rarityClass}`} aria-hidden="true">
          {iconSrc ? (
            <img loading="lazy" decoding="async" src={iconSrc} alt="" className="ms2-skill-emblem-img" />
          ) : (
            SKILL_EMOJI_FALLBACK[skillId] ?? "•"
          )}
        </div>

        {/* Skill name */}
        <span className="ms2-skill-name">{skill ? tr(skill.name) : skillId}</span>

        {/* Cosmetic rarity badge */}
        <span className={`ms2-skill-badge ${rarityClass}`}>
          {t(`achievements.rarity.${rarity}`)}
        </span>

        {/* Pool bar with checkpoints */}
        <div className="ms2-skill-pool">
          <div className="ms2-skill-pool-row">
            <span className="ms2-skill-pool-label">{t("mastery.pool")}</span>
            <div className="ms2-pool-bar" title={t("mastery.poolHint")}>
              <div className="ms2-pool-fill" style={{ width: `${poolPct * 100}%` }} />
              {MASTERY_POOL_CHECKPOINTS.map((cp) => {
                // Mona M2: Hover nennt jetzt den TATSÄCHLICHEN Bonus dieses Checkpoints statt nur
                // der nackten Prozentzahl ("An jeden Checkpoint-Marker seinen Bonus schreiben").
                const bonusLine = poolCheckpointBonusLine(cp, t);
                return (
                  <span
                    key={cp}
                    className={`ms2-pool-cp${poolPct >= cp ? " reached" : ""}`}
                    style={{ left: `${cp * 100}%` }}
                    title={t("mastery.checkpoint.hoverBonus")
                      .replace("{pct}", String(Math.round(cp * 100)))
                      .replace("{bonus}", bonusLine)}
                  />
                );
              })}
            </div>
            <span className="ms2-pool-perks">
              {poolBonus.double > 0 && <span>+{Math.round(poolBonus.double * 100)}% ×2</span>}
              {poolBonus.speed > 0 && <span>+{Math.round(poolBonus.speed * 100)}% ⏱</span>}
              {poolBonus.preserve > 0 && <span>+{Math.round(poolBonus.preserve * 100)}% ♻</span>}
            </span>
          </div>
          {/* Mona M2 (Fund #2): "Der Pool-Checkpoint kam ebenso stumm" — Ziel benannt + ETA. */}
          {poolNextLine && <span className="ms2-pool-next muted">{poolNextLine}</span>}
        </div>

        {/* Level summary */}
        <span className="ms2-skill-lvl-text">
          {sumLvl} / {maxLvl} ({pct}%)
        </span>

        {/* Collapse chevron */}
        <span className={`ms2-chevron${collapsed ? "" : " open"}`}>▸</span>
      </button>

      {/* Action rows */}
      {!collapsed && (
        <div className="ms2-actions">
          {actions.map(({ a }) => (
            <MasteryActionRow key={a.id} action={a} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── MasteryPage ───────────────────────────────────────────────────────────────

export function MasteryPage(): JSX.Element {
  const state = useGameState();
  const { t, tr } = useI18n();
  const [activeTab, setActiveTab] = useState<MasteryTab>("all");
  // collapsed Set: skill IDs that are folded. Default: ALLE Kategorien eingeklappt
  // (saubere Kategorien-Liste; Spieler klappt gezielt auf — passt zur größeren Schrift).
  const [collapsed, setCollapsed] = useState<Set<string>>(() => {
    const ids = Object.keys(content.skills).filter((id) =>
      Object.values(content.actions).some((a) => a.skill === id),
    );
    return new Set(ids);
  });

  function toggleSkill(skillId: string): void {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(skillId)) next.delete(skillId);
      else next.add(skillId);
      return next;
    });
  }

  // All skill IDs that have at least one action
  const allSkillIds = Object.keys(content.skills).filter((id) =>
    Object.values(content.actions).some((a) => a.skill === id),
  ) as SkillId[];

  // Global aggregates
  let totalMasteryLevel = 0;
  let masteredCount = 0;
  let actionCount = 0;
  for (const a of Object.values(content.actions)) {
    const lvl = masteryLevel(state, a.id);
    totalMasteryLevel += lvl;
    if (lvl >= MASTERY_MAX_LEVEL) masteredCount++;
    actionCount++;
  }
  const totalPct =
    allSkillIds.length > 0
      ? Math.round(
          (totalMasteryLevel /
            (Object.values(content.actions).length * MASTERY_MAX_LEVEL)) *
            100,
        )
      : 0;

  // Filter skill IDs by active tab
  const visibleSkillIds = allSkillIds.filter((id) => {
    if (activeTab === "all") return true;
    if (activeTab === "gathering") return GATHERING_SKILLS.has(id);
    if (activeTab === "crafting") return CRAFTING_SKILLS.has(id);
    if (activeTab === "combat") return COMBAT_SKILLS.has(id);
    if (activeTab === "skilling")
      return !COMBAT_SKILLS.has(id); // all non-combat = skilling
    if (activeTab === "completed") {
      // Show skills that have at least one maxed action
      return Object.values(content.actions).some(
        (a) => a.skill === id && masteryLevel(state, a.id) >= MASTERY_MAX_LEVEL,
      );
    }
    return true;
  });

  // Determine which tabs to show (only show combat tab if combat skills have actions)
  const hasCombatActions = allSkillIds.some((id) => COMBAT_SKILLS.has(id));

  const masteryIconSrc = getSidebarIcon("mastery");

  return (
    <div className="ms2-page">
      {/* ── Tabs + summary ring ── */}
      <div className="ms2-tabs">
        {/* Citadel-Konsistenz-Welle (Chef-GO 2026-07-09): Überschriften-Hierarchie — vorher
            sprang die Seite direkt in Ring+Tabs, ohne Titel-Zeile (anders als OptSection/
            Achievements-Hero). Reaktiviert zwei bis dahin ungenutzte i18n-Keys (panelTitle/
            panelDesc), die genau dafür angelegt waren. */}
        <div className="ms2-tabs-head">
          <span className="ms2-tabs-head-icon" aria-hidden="true">
            {masteryIconSrc
              ? <img loading="lazy" decoding="async" src={masteryIconSrc} alt="" className="ms2-tabs-head-icon-img" />
              : "🏅"}
          </span>
          <div className="ms2-tabs-head-text">
            <h2 className="ms2-tabs-head-title">{t("mastery.panelTitle")}</h2>
            <p className="ms2-tabs-head-desc">{t("mastery.panelDesc")}</p>
          </div>
        </div>
        <div className="ms2-tabs-summary">
          <ProgressRing pct={totalPct} />
          <div className="ms2-agg-stats">
            <div className="ms2-agg-stat">
              <span className="ms2-agg-stat-label">{t("mastery.totalMasteryLabel").toUpperCase()}</span>
              <span className="ms2-agg-stat-val">{formatNum(totalMasteryLevel)}</span>
            </div>
            <div className="ms2-agg-stat">
              <span className="ms2-agg-stat-label">{t("mastery.masteredActionsLabel").toUpperCase()}</span>
              <span className="ms2-agg-stat-val">{masteredCount} / {actionCount}</span>
            </div>
          </div>
        </div>
        <div className="ms2-tab-btns">
          {(
            [
              "all",
              "skilling",
              "gathering",
              "crafting",
              ...(hasCombatActions ? (["combat"] as MasteryTab[]) : []),
              "completed",
            ] as MasteryTab[]
          ).map((tab) => (
            <button
              key={tab}
              className={`ms2-tab${activeTab === tab ? " ms2-tab--active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {t(`mastery.tab.${tab}`)}
            </button>
          ))}
        </div>
      </div>

      {/* ── Skill blocks ── */}
      <div className="ms2-skills">
        {visibleSkillIds.length === 0 ? (
          <div className="placeholder">
            <div className="placeholder-icon">🧭</div>
            <p className="muted">{t("mastery.emptyFiltered")}</p>
          </div>
        ) : (
          visibleSkillIds.map((skillId) => (
            <SkillBlock
              key={skillId}
              skillId={skillId}
              collapsed={collapsed.has(skillId)}
              onToggle={() => toggleSkill(skillId)}
              t={t}
              tr={tr}
            />
          ))
        )}
      </div>
    </div>
  );
}
