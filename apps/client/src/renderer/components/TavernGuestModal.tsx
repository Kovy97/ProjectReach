import { useEffect } from "react";
import { createPortal } from "react-dom";
import { content } from "@hearthforge/content";
import { levelFromXp } from "@hearthforge/engine";
import type { LocalizedString, TavernTask } from "@hearthforge/shared";
import { useGameState } from "../game/GameContext";
import { useI18n } from "../i18n";
import { todayStamp } from "../util/dayStamp";
import { registerEscCloser } from "../util/escStack";
import { getItemImage } from "../items";
import { gameAlert } from "./GameAlert";
import {
  acceptTavernTask,
  deliverTavernTask,
  enqueueAction,
  swapTavernGuest,
  tavernSeatSummary,
} from "../tavernApi";
import { resolveTavernGuestFaceImage } from "../tavernArt";
import "../styles/tavern.css";

/**
 * Gäste-Karte (Modal, Stahl-9-Slice — Spec §6, Muster BuildingPopup + `.iwk-panel` aus
 * item-wiki.css): Gesichtskarte, Name/Rolle/Volk, die Tagesansprache (`template.line` mit
 * {count}/{target}/{zone} aufgelöst), Fortschritt „have / need", Belohnung, drei Knöpfe.
 */

/** Ziel-Name der Aufgabe, lokalisiert nach Aufgaben-Art (Item/Aktion/Monster/Dungeon/Champion). */
function targetName(tr: (v: LocalizedString) => string, task: TavernTask): string {
  switch (task.kind) {
    case "deliver":
    case "produce":
      return content.items[task.targetId] ? tr(content.items[task.targetId]!.name) : task.targetId;
    case "assortment": {
      const ids = task.targetIds && task.targetIds.length > 0 ? task.targetIds : [task.targetId];
      return ids.map((id) => (content.items[id] ? tr(content.items[id]!.name) : id)).join(", ");
    }
    case "run":
      return content.actions[task.targetId] ? tr(content.actions[task.targetId]!.name) : task.targetId;
    case "kill":
      return content.monsters[task.targetId] ? tr(content.monsters[task.targetId]!.name) : task.targetId;
    case "dungeon": {
      const d = content.dungeons.find((dd) => dd.id === task.targetId);
      return d ? tr(d.name) : task.targetId;
    }
    case "champion": {
      const v = content.elites?.[task.targetId];
      return v ? tr(v.name) : task.targetId;
    }
    default:
      return task.targetId;
  }
}

/** Zonen-Name — nur für "kill"-Aufgaben (`{zone}`-Platzhalter), sonst null. */
function zoneName(tr: (v: LocalizedString) => string, task: TavernTask): string | null {
  if (task.kind !== "kill") return null;
  const monster = content.monsters[task.targetId];
  const zone = monster?.zone ? content.zones.find((z) => z.id === monster.zone) : undefined;
  return zone ? tr(zone.name) : null;
}

function resolveLine(
  t: (k: string) => string,
  tr: (v: LocalizedString) => string,
  line: LocalizedString | undefined,
  task: TavernTask,
): string {
  if (!line) return t("tavern.card.noLine");
  let text = tr(line);
  text = text.replace("{count}", String(task.count));
  text = text.replace("{target}", targetName(tr, task));
  text = text.replace("{zone}", zoneName(tr, task) ?? "");
  return text;
}

export function TavernGuestModal({
  seatIndex,
  onClose,
  onDirty,
}: {
  seatIndex: number;
  onClose: () => void;
  onDirty: () => void;
}): JSX.Element | null {
  const state = useGameState();
  const { t, tr } = useI18n();
  useEffect(() => registerEscCloser("modal", onClose), [onClose]);

  const summary = tavernSeatSummary(state, content, seatIndex);
  const guest = summary?.guest ?? null;
  const task = summary?.seat.task ?? null;
  if (!summary || !guest || !task) return null;

  const faceImg = resolveTavernGuestFaceImage(guest.id);
  const requiredLevel = task.requiredLevel;
  const currentSkillLevel = levelFromXp(state.skills[task.rewardSkill]?.xp ?? 0);
  // Deckt sich exakt mit der Engine (`levelBlocked`, tavern.ts): NUR produce/run sperren die
  // Abgabe über die Skill-Stufe der Zielaktion — deliver/assortment zählen ausschließlich den
  // Bestand, ihr `requiredLevel` (vom gewählten Kandidaten mitgeführt) ist dort nie ein Blocker.
  const levelGate =
    (task.kind === "produce" || task.kind === "run") &&
    requiredLevel > 0 &&
    currentSkillLevel < requiredLevel;
  const progress = summary.progress;
  const have = progress?.have ?? 0;
  const need = progress?.need ?? Math.max(1, task.count);
  const deliverable = !!progress?.deliverable;

  const crateItem = task.paysCrate ? content.items[summary.crateItemId ?? ""] : undefined;
  const rewardSkillDef = content.skills[task.rewardSkill];

  const swapCost = summary.swapCost;

  const doAccept = (): void => {
    if (acceptTavernTask(state, content, seatIndex)) onDirty();
  };
  const doDeliver = (): void => {
    const reason = deliverTavernTask(state, content, seatIndex, todayStamp());
    if (reason === "ok") {
      onDirty();
      return;
    }
    onDirty();
    if (reason === "incomplete") gameAlert("tavern.alert.incomplete");
    else if (reason === "level") gameAlert("tavern.alert.level");
  };
  const doSwap = (): void => {
    const reason = swapTavernGuest(state, content, seatIndex, todayStamp());
    onDirty();
    if (reason === "no_gold") gameAlert("tavern.alert.noGold");
    else if (reason === "no_guest") gameAlert("tavern.alert.noGuest");
    else if (reason === "accepted") gameAlert("tavern.alert.accepted");
  };
  const doQueue = (): void => {
    if (task.actionId && enqueueAction(state, content, task.actionId, task.count)) onDirty();
  };

  return createPortal(
    <div className="modal-overlay tvn-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal tvn-guest-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close ds-close-button" onClick={onClose} aria-label={t("common.close")} />

        <div className="tvn-gm-head">
          <span className="tvn-gm-face">
            {faceImg ? (
              <img src={faceImg} alt="" className="tvn-gm-face-img" loading="lazy" decoding="async" />
            ) : (
              <span className="tvn-gm-face-fallback" aria-hidden="true">🍺</span>
            )}
          </span>
          <div className="tvn-gm-head-text">
            <div className="tvn-gm-name">{tr(guest.name)}</div>
            <div className="tvn-gm-role muted">
              {tr(guest.role)} · {t(`tavern.race.${guest.race}`)}
            </div>
            <div className="tvn-gm-greeting">{tr(guest.greeting)}</div>
          </div>
        </div>

        <div className="tvn-gm-panel iwk-panel">
          <div className="tvn-gm-line">{resolveLine(t, tr, summary.template?.line, task)}</div>

          <div className="tvn-gm-progress">
            <div className="bar tall tvn-gm-progress-bar">
              <div
                className="bar-fill"
                style={{ transform: `scaleX(${Math.min(1, need > 0 ? have / need : 0)})` }}
              />
            </div>
            <span className="tvn-gm-progress-label">{have} / {need}</span>
          </div>

          {levelGate && (
            <div className="tvn-gm-levelgate">
              {t("tavern.card.requiredLevel")
                .replace("{level}", String(requiredLevel))
                .replace("{skill}", rewardSkillDef ? tr(rewardSkillDef.name) : task.rewardSkill)}
            </div>
          )}

          <div className="tvn-gm-reward-head muted">{t("tavern.card.reward")}</div>
          <div className="tvn-gm-rewards">
            {task.paysCrate ? (
              crateItem ? (
                <span className="tvn-gm-reward-chip">
                  {getItemImage(crateItem.id) ? (
                    <img src={getItemImage(crateItem.id)!} alt="" className="tvn-gm-reward-icon pixelart" />
                  ) : (
                    <span className="tvn-gm-reward-icon-emoji" aria-hidden="true">🎁</span>
                  )}
                  <span>{tr(crateItem.name)}</span>
                </span>
              ) : null
            ) : (
              <span className="tvn-gm-reward-chip">
                <span className="tvn-gm-reward-icon-emoji" aria-hidden="true">🪙</span>
                <span>{task.rewardGold}</span>
              </span>
            )}
            {task.rewardXp > 0 && (
              <span className="tvn-gm-reward-chip">
                <span className="tvn-gm-reward-icon-emoji" aria-hidden="true">✦</span>
                <span>
                  {task.rewardXp} {t("tavern.reward.xp")} ({rewardSkillDef ? tr(rewardSkillDef.name) : task.rewardSkill})
                </span>
              </span>
            )}
            {!task.paysCrate && task.rewardItems.map((it) => {
              const def = content.items[it.id];
              const img = getItemImage(it.id);
              return (
                <span key={it.id} className="tvn-gm-reward-chip">
                  {img ? (
                    <img src={img} alt="" className="tvn-gm-reward-icon pixelart" />
                  ) : (
                    <span className="tvn-gm-reward-icon-emoji" aria-hidden="true">{def?.icon ?? "▪"}</span>
                  )}
                  <span>×{it.qty} {def ? tr(def.name) : it.id}</span>
                </span>
              );
            })}
          </div>
        </div>

        <div className="tvn-gm-actions">
          {!task.accepted ? (
            <button type="button" className="btn-iron" onClick={doAccept}>
              {t("tavern.card.accept")}
            </button>
          ) : (
            <button type="button" className="btn-iron" disabled={!deliverable} onClick={doDeliver}>
              {t("tavern.card.deliver")}
            </button>
          )}
          <button type="button" className="btn-iron" disabled={task.accepted} onClick={doSwap}>
            {t("tavern.card.decline")} · {swapCost > 0 ? t("tavern.card.declineCost").replace("{gold}", String(swapCost)) : t("tavern.card.declineFree")}
          </button>
          {(task.kind === "produce" || task.kind === "run") && task.actionId && (
            <button type="button" className="shop-citadel-btn" onClick={doQueue}>
              {t("tavern.card.queue")}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
