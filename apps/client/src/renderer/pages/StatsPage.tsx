import { content } from "@hearthforge/content";
import { masteryLevel } from "@hearthforge/engine";
import { MASTERY_MAX_LEVEL } from "@hearthforge/shared";
import { useGameState } from "../game/GameContext";
import { useI18n } from "../i18n";
import { formatNum, formatPlaytime } from "../util/format";
import { getSidebarIcon } from "../sidebarIcons";
import { getUiIcon } from "../uiIcons";
import "../styles/stats.css";

/** Eine Kennzahl-Sektion: Holzrahmen-Panel mit Icon-Medaillon + Titel-Zeile (OptSection-Muster). */
function StxSection({
  icon,
  title,
  wide,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  wide?: boolean;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <section className={`stx-section${wide ? " stx-section--wide" : ""}`}>
      <div className="stx-section-head">
        <span className="stx-section-icon" aria-hidden="true">{icon}</span>
        <h3 className="stx-section-title">{title}</h3>
      </div>
      {children}
    </section>
  );
}

/** Echtes PNG fürs Sektions-Icon (32px-Medaillon), sonst Emoji-Fallback — dieselbe Kette wie
 *  StatMedallion, nur fürs Sektions-Kopf-Icon (Emoji→Icon-Welle: bisher rohe Emojis ohne PNG). */
function sectionIcon(src: string | null, fallback: string): JSX.Element {
  return src
    ? <img loading="lazy" decoding="async" src={src} alt="" className="ui-icon" />
    : <span>{fallback}</span>;
}

/** Eine Kennzahl als Medaillon: echtes UI-Icon (Emoji-Fallback) + große Zahl + Label. */
function StatMedallion({
  iconSrc,
  fallback,
  value,
  label,
}: {
  iconSrc: string | null;
  fallback: string;
  value: string;
  label: string;
}): JSX.Element {
  return (
    <div className="stx-medallion">
      <div className="stx-medallion-icon" aria-hidden="true">
        {iconSrc
          ? <img loading="lazy" decoding="async" src={iconSrc} alt="" className="ui-icon" />
          : <span>{fallback}</span>}
      </div>
      <span className="stx-medallion-value">{value}</span>
      <span className="stx-medallion-label">{label}</span>
    </div>
  );
}

export function StatsPage(): JSX.Element {
  const state = useGameState();
  const { t } = useI18n();

  let totalXp = 0;
  for (const skill of Object.values(state.skills)) totalXp += skill.xp;

  // Mastery-Aggregate über alle Skilling-Aktionen.
  let totalMastery = 0;
  let masteredActions = 0;
  const actionList = Object.values(content.actions);
  for (const a of actionList) {
    const lvl = masteryLevel(state, a.id);
    totalMastery += lvl;
    if (lvl >= MASTERY_MAX_LEVEL) masteredActions++;
  }
  const bankKinds = Object.values(state.bank).filter((n) => n > 0).length;

  const unlocked = new Set(state.achievements);
  const achievements = content.achievements;
  const unlockedCount = achievements.filter((a) => unlocked.has(a.id)).length;

  const monsterTotal = Object.keys(content.monsters).length;
  const monsterDiscovered = Object.values(content.monsters).filter(
    (m) => (state.monsterKills[m.id] ?? 0) > 0,
  ).length;

  // `state.discoveredItems` ist bereits die zentrale Erst-Besitz-Markierung (markItemDiscovered,
  // engine/inventory.ts) — direkt gelesen wie bankKinds/monsterDiscovered oben, kein neuer Selektor nötig.
  const itemsDiscovered = Object.keys(state.discoveredItems ?? {}).length;
  const itemsTotal = Object.keys(content.items).length;

  const completion: Array<[string, number, number]> = [
    [t("completion.achievements"), unlockedCount, achievements.length],
    [t("completion.items"), itemsDiscovered, itemsTotal],
    [t("completion.bestiary"), monsterDiscovered, monsterTotal],
    [t("completion.mastery"), masteredActions, actionList.length],
  ];

  return (
    <div className="stx-page">
      <div className="stx-grid">
        <StxSection icon="⚔" title={t("stats.section.combat")}>
          <div className="stx-medallion-row">
            <StatMedallion
              iconSrc={getSidebarIcon("combat")}
              fallback="⚔"
              value={formatNum(state.stats.kills)}
              label={t("stats.kills")}
            />
            <StatMedallion
              iconSrc={null}
              fallback="💀"
              value={String(state.stats.deaths)}
              label={t("stats.deaths")}
            />
            {/* Paragonturm (§7, Welle P2): nur sichtbar, sobald überhaupt eine Etage bezwungen wurde
                (Chef-Vorgabe „nur wenn > 0") — vor dem ersten Turm-Aufstieg bleibt die Kennzahl leer. */}
            {(state.paragon?.best ?? 0) > 0 && (
              <StatMedallion
                iconSrc={null}
                fallback="🗼"
                value={String(state.paragon.best)}
                label={t("paragon.statsLabel")}
              />
            )}
          </div>
        </StxSection>

        <StxSection icon={sectionIcon(getUiIcon("icon_gathering"), "🌾")} title={t("stats.section.gathering")}>
          <div className="stx-medallion-row">
            <StatMedallion
              iconSrc={getSidebarIcon("mastery")}
              fallback="★"
              value={formatNum(totalMastery)}
              label={t("stats.totalMastery")}
            />
            <StatMedallion
              iconSrc={getUiIcon("icon_gathering")}
              fallback="🌿"
              value={formatNum(state.stats.itemsGathered)}
              label={t("stats.itemsGathered")}
            />
            <StatMedallion
              iconSrc={getUiIcon("icon_crafting")}
              fallback="🔨"
              value={formatNum(state.stats.itemsCrafted)}
              label={t("stats.itemsCrafted")}
            />
          </div>
        </StxSection>

        <StxSection icon={sectionIcon(getUiIcon("icon_goldcoin"), "💰")} title={t("stats.section.economy")}>
          <div className="stx-medallion-row">
            <StatMedallion
              iconSrc={getUiIcon("icon_goldcoin")}
              fallback="🪙"
              value={formatNum(state.character.gold)}
              label={t("stats.gold")}
            />
            <StatMedallion
              iconSrc={getUiIcon("icon_wealth")}
              fallback="💸"
              value={formatNum(state.stats.goldSpent)}
              label={t("stats.goldSpent")}
            />
            <StatMedallion
              iconSrc={getSidebarIcon("bank")}
              fallback="🏦"
              value={String(bankKinds)}
              label={t("stats.bankKinds")}
            />
          </div>
        </StxSection>

        <StxSection icon={sectionIcon(getUiIcon("icon_quests"), "📜")} title={t("stats.section.general")}>
          <div className="stx-medallion-row">
            <StatMedallion
              iconSrc={getSidebarIcon("overall")}
              fallback="⭐"
              value={formatNum(state.character.totalLevel)}
              label={t("stats.totalLevel")}
            />
            <StatMedallion
              iconSrc={getUiIcon("icon_skilling")}
              fallback="✨"
              value={formatNum(Math.floor(totalXp))}
              label={t("stats.totalXp")}
            />
            <StatMedallion
              iconSrc={null}
              fallback="⏳"
              value={formatPlaytime(state.activePlayMs)}
              label={t("stats.playtime")}
            />
          </div>
        </StxSection>

        <StxSection icon={sectionIcon(getSidebarIcon("achievements"), "🏆")} title={t("completion.title")} wide>
          {completion.map(([label, cur, max]) => {
            const pct = max > 0 ? Math.round((cur / max) * 100) : 0;
            return (
              <div key={label} className="stx-completion-row">
                <div className="stx-completion-head">
                  <span className="stx-completion-label">{label}</span>
                  <span className="stx-completion-val">
                    {cur} / {max} · {pct}%
                  </span>
                </div>
                <div className="stx-completion-bar">
                  <div className="stx-completion-fill" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </StxSection>
      </div>
    </div>
  );
}
