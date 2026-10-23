// claude:2026-10-25T01:15:00+02:00 — Ereignis-Chip im Kopf (1.4.0 „Feder und Stahl“ EV/AU, beide UI-Stile): zeigt das
// laufende Ereignis mit Restzeit bzw. Restaktionen und ein wartendes Auftragsangebot. Klick auf das Angebot öffnet den
// Reiter „Arbeitsaufträge“. Primitiv-Selektor (String), damit der Kopf nur bei sichtbaren Änderungen rendert.
import { useGameSelector } from "../game/GameContext";
import { useI18n } from "../i18n";
import { requestQuestsTab } from "../navigation";
import { jumpToPage } from "../util/monsterJump";
import { EVENT_ICON } from "../eventArt";
import type { SkillEventId } from "@hearthforge/shared";

function mmss(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function SkillEventChip(): JSX.Element | null {
  const { t } = useI18n();
  const key = useGameSelector((s) => {
    const a = s.skillEvents?.active;
    const offer = s.workOrders?.offer ? 1 : 0;
    return a ? `${a.id}|${a.actionsLeft}|${Math.ceil(a.msLeft / 1000)}|${offer}` : `||0|${offer}`;
  });
  const [id, left, secs, offer] = key.split("|");
  const active = id ? (id as SkillEventId) : null;
  if (!active && offer !== "1") return null;
  const actions = Number(left);
  const rest = actions > 0
    ? t("events.chip.actions").replace("{n}", String(actions))
    : mmss(Number(secs) * 1000);
  return (
    <span className="skill-event-chips">
      {active && (
        <span className="skill-event-chip" title={t(`events.${active}.card`)}>
          <span aria-hidden="true">{EVENT_ICON[active]}</span> {t(`events.${active}.name`)} · {rest}
        </span>
      )}
      {offer === "1" && (
        <button
          type="button"
          className="skill-event-chip skill-event-chip--offer"
          onClick={() => {
            requestQuestsTab("orders");
            jumpToPage("quests");
          }}
        >
          <span aria-hidden="true">{EVENT_ICON.customer}</span> {t("orders.chip.offer")}
        </button>
      )}
    </span>
  );
}
