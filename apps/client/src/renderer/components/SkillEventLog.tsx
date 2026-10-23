// claude:2026-10-25T01:30:00+02:00 — Logbuch der letzten zehn Ereignisse (1.4.0 „Feder und Stahl“ EV) in der
// Fertigkeiten-Übersicht. Zeit relativ zur Spiel-Uhr (`elapsedMs`), weil Ereignisse nur online passieren.
import { content } from "@hearthforge/content";
import { useGameState } from "../game/GameContext";
import { useI18n } from "../i18n";
import { EVENT_ICON, getEventImage } from "../eventArt";
import { formatNum } from "../util/format";

function ago(ms: number, t: (k: string) => string): string {
  const min = Math.floor(Math.max(0, ms) / 60_000);
  if (min < 1) return t("events.log.now");
  if (min < 60) return t("events.log.minutes").replace("{n}", String(min));
  return t("events.log.hours").replace("{n}", String(Math.floor(min / 60)));
}

export function SkillEventLog(): JSX.Element | null {
  const state = useGameState();
  const { t, tr } = useI18n();
  const log = state.skillEvents?.log ?? [];
  if (log.length === 0) return null;
  return (
    <section className="panel skill-event-log">
      <h3 className="skilloverview-group">{t("events.log.title")}</h3>
      <ul className="skill-event-log-list">
        {log.map((e) => {
          const img = getEventImage(e.id);
          const item = e.itemId ? content.items[e.itemId] : undefined;
          return (
            <li key={e.seq} className="skill-event-log-row">
              {img ? <img src={img} alt="" className="skill-event-log-img" loading="lazy" decoding="async" /> : <span className="skill-event-log-icon" aria-hidden="true">{EVENT_ICON[e.id]}</span>}
              <span className="skill-event-log-name">{t(`events.${e.id}.name`)}</span>
              <span className="muted">
                {content.skills[e.skill] ? tr(content.skills[e.skill]!.name) : e.skill}
                {item && e.qty ? ` · ${formatNum(e.qty)} × ${tr(item.name)}` : ""}
              </span>
              <span className="muted skill-event-log-ago">{ago(state.elapsedMs - e.atMs, t)}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
