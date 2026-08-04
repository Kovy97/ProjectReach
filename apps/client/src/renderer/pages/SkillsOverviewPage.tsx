import { useState } from "react";
import { content } from "@hearthforge/content";
import { computeStats, levelFromXp, xpForLevel } from "@hearthforge/engine";
import { COMBAT_SKILL_IDS } from "@hearthforge/shared";
import type { SkillId } from "@hearthforge/shared";
import { useGameState } from "../game/GameContext";
import { useI18n } from "../i18n";
import { getSkillIcon, SKILL_EMOJI_FALLBACK } from "../skillIcons";
import { getSidebarIcon } from "../sidebarIcons";
import { getUiIcon } from "../uiIcons";
import { ItemCell } from "../components/ItemCell";
import { skillBoostFor, SkillLevelText } from "../components/SkillLevel";

const LOCKED_ICON_URL = getUiIcon("icon_locked");
const COMBAT_SKILL_SET = new Set<string>(COMBAT_SKILL_IDS);

/** Rendert das Icon für einen Skill: PNG aus skillIcons > Sidebar-PNG > Emoji. */
function SkillIconImg({ skillId, size = 36 }: { skillId: string; size?: number }): JSX.Element {
  const combatPng = getSkillIcon(skillId);
  if (combatPng) {
    return (
      <img loading="lazy" decoding="async"
        src={combatPng}
        alt={skillId}
        width={size}
        height={size}
        className="skilloverview-icon-img"
      />
    );
  }
  const sidebarPng = getSidebarIcon(skillId);
  if (sidebarPng) {
    return (
      <img loading="lazy" decoding="async"
        src={sidebarPng}
        alt={skillId}
        width={size}
        height={size}
        className="skilloverview-icon-img"
      />
    );
  }
  return <span className="skilloverview-icon">{SKILL_EMOJI_FALLBACK[skillId] ?? "•"}</span>;
}

function SkillCard({
  skillId,
  boost = 0,
  onOpen,
}: {
  skillId: SkillId;
  /** Σ Skill-Level-Boost aus Ausrüstung/Sets/Suffixen (Itemization 2.0 §4.5); 0 für Nicht-Kampf-Skills. */
  boost?: number;
  onOpen?: () => void;
}): JSX.Element {
  const state = useGameState();
  const { t, tr, locale } = useI18n();
  const skill = content.skills[skillId];
  const xp = state.skills[skillId]?.xp ?? 0;
  const level = levelFromXp(xp);
  const xpStart = xpForLevel(level);
  const xpEnd = xpForLevel(level + 1);

  // xpEnd === xpStart only at the level cap (xpForLevel is clamped there)
  const isMax = xpEnd <= xpStart;
  const xpInLevel = xp - xpStart;
  const xpSpan = xpEnd - xpStart;
  const progress = isMax ? 1 : xpSpan > 0 ? xpInLevel / xpSpan : 0;
  const pct = isMax ? 100 : Math.round(progress * 100);

  const guideText = t(`skillguide.${skillId}`);

  // XP label: reuse existing "skill.toNext" pattern ({cur} / {next} XP)
  const xpLabel = isMax
    ? t("skills.xpMax")
    : t("skill.toNext")
        .replace("{cur}", xpInLevel.toLocaleString(locale))
        .replace("{next}", xpSpan.toLocaleString(locale));

  const cardClass = `skilloverview-card${onOpen ? " clickable" : ""}`;
  const inner = (
    <>
      <div className="skilloverview-icon-wrap">
        <SkillIconImg skillId={skillId} size={40} />
      </div>
      <div className="skilloverview-body">
        {/* Row 1: name (left) + level badge (right) */}
        <div className="skilloverview-top">
          <span className="skilloverview-name">
            {skill ? tr(skill.name) : skillId}
            {/* Meisterweihe (design/master-capes-konzept.md §3, "Goldene Insignien"): kleiner
                Gold-Stern am Titel, sobald der Skill Level 99 erreicht hat. Kein Glow — nur der
                Stern selbst ist golden. */}
            {isMax && (
              <span className="skilloverview-mastery-star" title={t("mastery.ceremony.title")} aria-hidden="true">
                {" "}★
              </span>
            )}
          </span>
          <span className="skilloverview-level">
            Lv <SkillLevelText base={level} boost={boost} />
          </span>
        </div>
        {/* Row 2: progress bar */}
        <div className="bar skilloverview-bar">
          {/* Textur-Fill (xp_bar_fill.webp repeat-x) — clip-path statt scaleX, sonst würde die
              Kachel-Textur horizontal gestaucht statt weniger Kacheln zu zeigen (skills.css
              .skilloverview-bar .bar-fill). */}
          <div className="bar-fill" style={{ clipPath: `inset(0 ${100 - Math.min(1, progress) * 100}% 0 0)` }} />
        </div>
        {/* Row 3: XP numbers + percentage (or MAX badge) */}
        <div className="skilloverview-xp-row">
          {isMax ? (
            <span className="skilloverview-xp-max">{xpLabel}</span>
          ) : (
            <>
              <span className="skilloverview-xp-nums">{xpLabel}</span>
              <span className="skilloverview-xp-pct">{pct}%</span>
            </>
          )}
        </div>
        {/* Row 4: one-liner guide description */}
        <div className="skilloverview-guide">{guideText}</div>
      </div>
    </>
  );

  if (onOpen) {
    return (
      <button
        type="button"
        className={cardClass}
        title={skill ? tr(skill.name) : skillId}
        onClick={onOpen}
      >
        {inner}
      </button>
    );
  }
  return (
    <div className={cardClass} title={skill ? tr(skill.name) : skillId}>
      {inner}
    </div>
  );
}

export function SkillsOverviewPage({
  onNavigate,
}: {
  onNavigate?: (id: string) => void;
}): JSX.Element {
  const state = useGameState();
  const { t } = useI18n();
  // OSRS-Skill-Guide (#205): Kartenklick öffnet jetzt ein Modal statt direkt zu navigieren —
  // Navigation zur eigentlichen Skill-Seite bleibt über den CTA-Button IM Modal erreichbar.
  const [guideSkillId, setGuideSkillId] = useState<SkillId | null>(null);

  const allIds = Object.keys(content.skills) as SkillId[];
  const generalSkills = allIds.filter((id) => !COMBAT_SKILL_SET.has(id));
  const combatSkills = allIds.filter((id) => COMBAT_SKILL_SET.has(id));
  // Einmal berechnet, statt in jeder SkillCard neu (Itemization 2.0 §4.5, "42/99 (+2)"-Anzeige).
  const stats = computeStats(state, content);

  return (
    <div className="skilloverview-page">
      {/* Summary header */}
      <section className="panel">
        <header className="skilloverview-head">
          <h2 className="skilloverview-title">{t("skills.overview")}</h2>
          <div className="skilloverview-total">
            <strong className="skilloverview-total-num">{state.character.totalLevel}</strong>
            <span className="skilloverview-total-label">{t("skills.totalLevel")}</span>
          </div>
        </header>
      </section>

      {/* General Skills */}
      <section className="panel">
        <h3 className="skilloverview-group">{t("skills.group.general")}</h3>
        <div className="skilloverview-grid">
          {generalSkills.map((id) => (
            <SkillCard key={id} skillId={id} onOpen={() => setGuideSkillId(id)} />
          ))}
        </div>
      </section>

      {/* Combat Skills */}
      <section className="panel">
        <h3 className="skilloverview-group">{t("skills.group.combat")}</h3>
        <div className="skilloverview-grid">
          {combatSkills.map((id) => (
            <SkillCard
              key={id}
              skillId={id}
              boost={skillBoostFor(stats.skillBoosts, id)}
              onOpen={() => setGuideSkillId(id)}
            />
          ))}
        </div>
      </section>

      {guideSkillId && (
        <SkillGuideModal
          skillId={guideSkillId}
          onClose={() => setGuideSkillId(null)}
          onNavigate={onNavigate}
        />
      )}
    </div>
  );
}

interface GuideEntry {
  key: string;
  level: number;
  itemId: string | null;
  label: string;
}

/** OSRS-Style Skill-Guide: nach Level sortierte Freischalt-Liste, generiert aus dem Content —
 *  Skilling-Fertigkeiten zeigen Aktionen (content.actions), Kampf-Fertigkeiten zeigen stattdessen
 *  Ausrüstung, die diese Fertigkeit als `requirements` voraussetzt (Kampf-Skills haben keine
 *  eigenen Aktionen — man trainiert sie durchs Kämpfen). */
function SkillGuideModal({
  skillId,
  onClose,
  onNavigate,
}: {
  skillId: SkillId;
  onClose: () => void;
  onNavigate?: (id: string) => void;
}): JSX.Element {
  const state = useGameState();
  const { t, tr } = useI18n();
  const skill = content.skills[skillId];
  const xp = state.skills[skillId]?.xp ?? 0;
  const level = levelFromXp(xp);
  const isCombat = COMBAT_SKILL_SET.has(skillId);

  const entries: GuideEntry[] = isCombat
    ? Object.values(content.items)
        .filter((item) => item.requirements?.[skillId] !== undefined)
        .map((item) => ({
          key: item.id,
          level: item.requirements![skillId]!,
          itemId: item.id,
          label: tr(item.name),
        }))
        .sort((a, b) => a.level - b.level || a.key.localeCompare(b.key))
    : Object.values(content.actions)
        .filter((a) => a.skill === skillId)
        .map((a) => {
          const out = a.loot[0];
          return {
            key: a.id,
            level: a.levelRequired ?? 1,
            itemId: out ? out.itemId : null,
            label: tr(a.name),
          };
        })
        .sort((a, b) => a.level - b.level || a.key.localeCompare(b.key));

  const goToSkill = (): void => {
    onNavigate?.(isCombat ? "combat" : skillId);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal skillguide-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close ds-close-button" onClick={onClose} aria-label={t("common.close")} />
        <header className="skillguide-head">
          <div className="skillguide-head-icon">
            <SkillIconImg skillId={skillId} size={48} />
          </div>
          <div className="skillguide-head-text">
            <h3 className="skillguide-title">{skill ? tr(skill.name) : skillId}</h3>
            <span className="skillguide-level-badge">
              {t("skill.level").replace("{n}", String(level))}
            </span>
          </div>
        </header>
        <p className="skillguide-desc muted">{t(`skillguide.${skillId}`)}</p>
        <h4 className="skillguide-section-title">
          {isCombat ? t("skillguide.modal.gearHeading") : t("skillguide.modal.actionsHeading")}
        </h4>
        <div className="skillguide-list">
          {entries.length === 0 ? (
            <p className="muted">{t("skillguide.modal.empty")}</p>
          ) : (
            entries.map((e) => {
              const reached = level >= e.level;
              return (
                <div key={e.key} className={`skillguide-row${reached ? " reached" : " locked"}`}>
                  <span className="skillguide-row-level">
                    {t("skill.levelShort").replace("{n}", String(e.level))}
                  </span>
                  {e.itemId ? (
                    <ItemCell itemId={e.itemId} className="skillguide-row-icon" />
                  ) : (
                    <span className="skillguide-row-icon-ph">▪</span>
                  )}
                  <span className="skillguide-row-label">{e.label}</span>
                  <span className="skillguide-row-status" aria-hidden="true">
                    {reached
                      ? "✓"
                      : LOCKED_ICON_URL
                        ? <img loading="lazy" decoding="async" src={LOCKED_ICON_URL} alt="" className="locked-icon-img" />
                        : "🔒"}
                  </span>
                </div>
              );
            })
          )}
        </div>
        {onNavigate && (
          <div className="skillguide-footer">
            <button className="skillcard-cta" onClick={goToSkill}>
              {t("skillguide.modal.goTo")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
