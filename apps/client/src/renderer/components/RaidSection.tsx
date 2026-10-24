// claude:2026-10-25T10:20:00+02:00 — Raid-Abschnitt der Zonenwahl (1.4.0 „Feder und Stahl“ Welle 4, R1/R2/R3/R8).
// Muster ParagonTowerSection: Überschrift + Panel. Karte mit Raum-Kulisse, Schwierigkeitswahl mit Schlössern,
// Gebühr, Wochen-Modifikator, Truhen-Status je Boss, Abschlüsse, Start und Warteschlange.
import { useState } from "react";
import { content } from "@hearthforge/content";
import {
  abandonRaid,
  enqueueRaid,
  raidChestAvailable,
  raidDefs,
  raidDifficultyUnlocked,
  raidFee,
  raidStateOf,
  raidWeeklyModifier,
  startRaid,
} from "@hearthforge/engine";
import { CRAFT_TARGET_PRESETS, RAID_DIFFICULTIES, type RaidDifficulty } from "@hearthforge/shared";
import { useGameState } from "../game/GameContext";
import { useI18n } from "../i18n";
import { getUiIcon } from "../uiIcons";
import { raidCardArt } from "../raidArt";
import { QuantityPicker } from "./QuantityPicker";
import { openQueueAmountModal } from "./QueueAmountModal";
import { ConfirmModal, type ConfirmRequest } from "./ConfirmModal";
import { formatNum, formatMmSs } from "../util/format";
import "../styles/raid.css";

const LOCK_ICON_URL = getUiIcon("icon_locked");
const GOLD_ICON_URL = getUiIcon("icon_goldcoin");
const BOSS_ICON_URL = getUiIcon("icon_combat_status_boss");

export function RaidSection(): JSX.Element | null {
  const state = useGameState();
  const { t, tr } = useI18n();
  const def = raidDefs(content)[0];
  const [pick, setPick] = useState<RaidDifficulty>("normal");
  const [msg, setMsg] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  if (!def) return null;

  const rs = raidStateOf(state);
  const now = Date.now();
  const unlockDungeon = content.dungeons.find((d) => d.id === def.unlockDungeonId);
  const open = (state.dungeonsCleared?.[def.unlockDungeonId] ?? 0) >= 1;
  const bg = raidCardArt(def.id, def.rooms[0]?.dungeonId); // claude:2026-10-25T12:50:00+02:00 — eigene Raid-Karte `gobkharaz` (Asset-Liste Gruppe A), sonst Raum 1
  const heading = (
    <h2 className="block-heading dungeon-heading">
      {BOSS_ICON_URL ? <img loading="lazy" decoding="async" src={BOSS_ICON_URL} alt="" className="ui-icon" /> : "💀"} {t("raid.sectionTitle")}
    </h2>
  );

  if (!open) {
    return (
      <>
        {heading}
        <div className="zone-grid">
          <div
            className={`zone-card dungeon-card raid-card-locked dungeon-locked${bg ? " has-bg" : ""}`}
            style={bg ? { backgroundImage: `url("${bg}")` } : undefined}
          >
            <div className="zone-card-name">{tr(def.name)}</div>
            <div className="dungeon-locked-hint">
              <span className="dungeon-lock-icon" aria-hidden="true">
                {LOCK_ICON_URL ? <img loading="lazy" decoding="async" src={LOCK_ICON_URL} alt="" className="ui-icon" /> : "🔒"}
              </span>
              {t("raid.lockedHint").replace("{dungeon}", unlockDungeon ? tr(unlockDungeon.name) : def.unlockDungeonId)}
            </div>
          </div>
        </div>
      </>
    );
  }

  const modifier = raidWeeklyModifier(now);
  const diff = raidDifficultyUnlocked(state, content, def.id, pick) ? pick : "normal";
  const fee = raidFee(content, def.id, diff, modifier);
  const baseFee = def.fees[diff];
  const run = rs.run;
  const busy = !!run;
  const poor = state.character.gold < fee;
  const startReasonText = (r: string): string =>
    r === "gold" ? t("raid.start.needGold").replace("{gold}", formatNum(fee))
    : r === "busy" ? t("raid.start.busy")
    : t("raid.start.locked");
  const deathRule =
    diff === "normal" ? t("raid.deathRule.normal")
    : diff === "heroic" ? t("raid.deathRule.heroic").replace("{gold}", formatNum(def.heroicRestartCost))
    : t("raid.deathRule.mythic").replace("{pct}", String(Math.round((1 - def.mythicRefundPct) * 100)));

  const onStart = (): void => {
    const r = startRaid(state, content, def.id, diff, Date.now());
    setMsg(r === "ok" ? null : startReasonText(r));
  };
  const onQueue = (qty: number | null): void => {
    enqueueRaid(state, content, def.id, diff, qty);
    setMsg(null);
  };

  return (
    <>
      {heading}
      <div className="dungeon-progress raid-panel">
        <div className="raid-top">
          <div
            className={`raid-art${bg ? " has-bg" : ""}`}
            style={bg ? { backgroundImage: `url("${bg}")` } : undefined}
            aria-hidden="true"
          />
          <div className="raid-top-text">
            <div className="raid-name">{tr(def.name)}</div>
            <p className="raid-intro">{t("raid.intro")}</p>
            {rs.clears.normal === 0 && <p className="raid-invite muted">{t("raid.invite")}</p>}
          </div>
        </div>

        <div className="raid-diff-row" role="tablist">
          {RAID_DIFFICULTIES.map((d) => {
            const ok = raidDifficultyUnlocked(state, content, def.id, d);
            return (
              <button
                key={d}
                type="button"
                role="tab"
                aria-selected={diff === d}
                disabled={!ok}
                className={`raid-diff-btn raid-diff-${d}${diff === d ? " active" : ""}${ok ? "" : " locked"}`}
                title={ok ? undefined : t(d === "heroic" ? "raid.diff.lockedHeroic" : "raid.diff.lockedMythic")}
                onClick={() => setPick(d)}
              >
                {!ok && (LOCK_ICON_URL ? <img loading="lazy" decoding="async" src={LOCK_ICON_URL} alt="" className="ui-icon" /> : "🔒")}{" "}
                {t(`raid.diff.${d}`)}
                {(rs.clears[d] ?? 0) > 0 && <span className="raid-diff-clears"> ✓ {rs.clears[d]}</span>}
              </button>
            );
          })}
        </div>
        {RAID_DIFFICULTIES.some((d) => !raidDifficultyUnlocked(state, content, def.id, d)) && (
          <p className="raid-lock-hint muted">
            {t(raidDifficultyUnlocked(state, content, def.id, "heroic") ? "raid.diff.lockedMythic" : "raid.diff.lockedHeroic")}
          </p>
        )}

        <div className="raid-grid">
          <div className="raid-col">
            <div className="raid-line">
              <span className="raid-label">{t("raid.recLabel")}</span>
              <span>{t(`raid.rec.${diff}`)}</span>
            </div>
            <div className="raid-line raid-fee-line">
              <span className="raid-label">{t("raid.fee.label")}</span>
              <span className="raid-fee">
                {modifier === "payday" && <s className="raid-fee-old">{formatNum(baseFee)}</s>}
                {formatNum(fee)}
                {GOLD_ICON_URL ? <img loading="lazy" decoding="async" src={GOLD_ICON_URL} alt="" className="ui-icon" /> : null}
              </span>
            </div>
            <p className="raid-note muted">{deathRule}</p>
            <p className="raid-note muted">{t("raid.feeLine")}</p>
            <div className="raid-stats">
              <span>{t("raid.stats.clears").replace("{n}", String(rs.clears[diff] ?? 0))}</span>
              {rs.fastestMs[diff] !== undefined && (
                <span>{t("raid.stats.fastest").replace("{time}", formatMmSs(rs.fastestMs[diff]!))}</span>
              )}
            </div>
          </div>

          <div className="raid-col">
            <div className="raid-mod">
              <div className="raid-label">{t("raid.weekly.title")}</div>
              <div className="raid-mod-name">{t(`raid.mod.${modifier}.name`)}</div>
              <div className="raid-mod-desc muted">{t(`raid.mod.${modifier}.desc`)}</div>
            </div>
            <div className="raid-chests">
              <div className="raid-label" title={t("raid.chests.hint")}>{t("raid.chests.title")}</div>
              {def.rooms.map((room) => {
                const boss = content.monsters[room.bossId];
                const ready = raidChestAvailable(state, room.bossId, diff, now);
                return (
                  <div key={room.id} className={`raid-chest-row${ready ? " ready" : " claimed"}`}>
                    <span className="raid-chest-boss">{boss ? tr(boss.name) : room.bossId}</span>
                    <span className="raid-chest-state">{t(ready ? "raid.chest.ready" : "raid.chest.claimed")}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="raid-actions">
          {run ? (
            <>
              <p className="raid-note">
                {t("raid.running")
                  .replace("{diff}", t(`raid.diff.${run.difficulty}`))
                  .replace("{room}", String(run.room + 1))
                  .replace("{rooms}", String(def.rooms.length))}
              </p>
              <button
                type="button"
                className="shop-citadel-btn"
                onClick={() =>
                  setConfirm({
                    title: t("raid.abandon.confirmTitle"),
                    body: run.difficulty === "mythic" ? t("raid.abandon.confirmBodyMythic").replace("{pct}", String(Math.round(def.mythicRefundPct * 100))) : t("raid.abandon.confirmBody"), // claude:2026-10-24T16:10:00+02:00 — Mythisch erstattet teilweise
                    confirmLabel: t("raid.abandon"),
                    danger: true,
                    onConfirm: () => abandonRaid(state, content),
                  })
                }
              >
                {t("raid.abandon")}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="btn-iron dungeon-enter raid-start-btn"
                disabled={busy || poor}
                title={poor ? t("raid.start.needGold").replace("{gold}", formatNum(fee)) : undefined}
                onClick={onStart}
              >
                {t("raid.start")}
              </button>
              <div className="raid-queue">
                <span className="raid-label">{t("raid.queue")}</span>
                <QuantityPicker
                  className="dungeon-queue-picker"
                  presets={CRAFT_TARGET_PRESETS}
                  onPick={(qty) => onQueue(qty)}
                  onCustom={() => openQueueAmountModal({ subject: tr(def.name), onQueue: (qty) => onQueue(qty) })}
                  infiniteLabel="∞"
                  onInfinite={() => onQueue(null)}
                />
                <span className="raid-note muted">{t("raid.queueHint")}</span>
              </div>
            </>
          )}
          {msg && <p className="raid-msg">{msg}</p>}
        </div>
      </div>
      <ConfirmModal request={confirm} onClose={() => setConfirm(null)} />
    </>
  );
}
