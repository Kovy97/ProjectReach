// claude:2026-10-25T10:50:00+02:00 — Raid-Bildschirme (1.4.0 „Feder und Stahl“ Welle 4, R3/R9):
//  - RaidOverlays (App-weit): Beute-Zeremonie nach jedem Boss, Tod-Dialog je Stufe, Lauf-vorbei-Hinweis, Abschluss.
//  - RaidRestScreen (Kampf-Seite, phase "rest"): „Du rastest.“ mit Ausrüstung, Letzter Loot und „Nächster Raum“.
// Reihenfolge der Overlays: erst die Zeremonie, dann Tod/Abschluss. Läuft eine Raid-Warteschlange, entscheidet die
// Engine selbst (Neustart-Grenzen, Auto-Weiter); dann erscheint nur ein leiser Toast statt einer Sperre.
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { content } from "@hearthforge/content";
import {
  abandonRaid,
  closeRaidResult,
  continueRaid,
  playerBusyOutsideRaid,
  raidDefs,
  raidStateOf,
  restartRaidRoom,
} from "@hearthforge/engine";
import { RARITY_LABEL, SLAYER_POINTS_PER_RAID_BOSS, type RaidRun } from "@hearthforge/shared";
import { useGameState } from "../game/GameContext";
import { useI18n } from "../i18n";
import { ItemCell } from "./ItemCell";
import { EquipmentDoll } from "./EquipmentOverview";
import { getUiIcon } from "../uiIcons";
import { rarityRank } from "../items";
import { raidChestArt, raidRoomCard } from "../raidArt";
import { registerEscCloser } from "../util/escStack";
import { effectiveFxLevel } from "../util/fxLevel";
import { pushUiToast } from "../util/toastBus";
import { ConfirmModal, type ConfirmRequest } from "./ConfirmModal"; // claude:2026-10-24T15:30:00+02:00 — „Aufgeben“ nur nach Rückfrage (QA2 Raid B3)
import { formatMmSs, formatNum } from "../util/format";
import "../styles/raid.css";

const GOLD_ICON_URL = getUiIcon("icon_goldcoin");

type Loot = Array<{ itemId: string; qty: number }>;

function sortedLoot(loot: Loot): Loot {
  return [...loot].sort((a, b) => rarityRank(content.items[a.itemId]?.rarity) - rarityRank(content.items[b.itemId]?.rarity));
}

function LootGrid({ loot, empty }: { loot: Loot; empty: string }): JSX.Element {
  if (loot.length === 0) return <p className="raid-note muted">{empty}</p>;
  return (
    <div className="raid-loot-grid">
      {sortedLoot(loot).map((l) => (
        <ItemCell key={l.itemId} itemId={l.itemId} qty={l.qty} />
      ))}
    </div>
  );
}

/** Fallback-Truhe aus Inline-SVG (vorhandene Truhen-Grafik des Dungeon-Abschlusses), bis Gruppe E geliefert ist. */
function RaidChest({ open, tint }: { open: boolean; tint: string }): JSX.Element {
  const art = raidChestArt(open); // claude:2026-10-25T12:50:00+02:00 — Lieferpfad laut Asset-Liste (assets/ui/raid/), nicht der UI-Icon-Ordner
  if (art) return <img src={art} alt="" className={`rlc-chest-img${open ? " open" : ""}`} />;
  return (
    <svg className={`rlc-chest-svg${open ? " open" : ""}`} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" style={{ "--rlc-tint": tint } as CSSProperties}>
      <g className="rlc-lid">
        <path d="M8 30 Q8 14 32 14 Q56 14 56 30 L56 32 L8 32 Z" fill="#a5703a" stroke="#3a2412" strokeWidth="2" />
        <rect x="6" y="28" width="52" height="7" fill="#d8c06a" stroke="#3a2412" strokeWidth="1.5" />
      </g>
      <rect x="8" y="32" width="48" height="22" rx="3" fill="#8a5a2b" stroke="#3a2412" strokeWidth="2" />
      <rect x="29" y="33" width="6" height="9" rx="1.5" fill="#3a2412" />
    </svg>
  );
}

interface Ceremony {
  seq: number;
  bossId: string;
  roomDungeonId: string;
  difficulty: RaidRun["difficulty"];
  loot: Loot;
}

function bestRarity(loot: Loot): string {
  let best = "common";
  for (const l of loot) {
    const r = content.items[l.itemId]?.rarity ?? "common";
    if (rarityRank(r) > rarityRank(best as never)) best = r;
  }
  return best;
}

function LootCeremony({ c, onClose }: { c: Ceremony; onClose: () => void }): JSX.Element {
  const { t, tr } = useI18n();
  const [skip, setSkip] = useState(() => effectiveFxLevel() === "off");
  const items = sortedLoot(c.loot);
  const top = bestRarity(c.loot);
  const boss = content.monsters[c.bossId];
  const total = 2.3 + items.length * 0.8;
  const [done, setDone] = useState(skip);
  useEffect(() => {
    if (skip) { setDone(true); return undefined; }
    const timer = window.setTimeout(() => setDone(true), total * 1000);
    return () => window.clearTimeout(timer);
  }, [skip, total]);
  useEffect(() => registerEscCloser("modal", onClose), [onClose]);
  return (
    <div className={`rlc-backdrop rlc-top-${top}`} role="dialog" aria-modal="true" aria-label={t("raid.loot.aria")}>
      <div className={`rlc-card${skip ? " rlc-skip" : ""}`}>
        <div className="rlc-eyebrow">{t("raid.loot.eyebrow")}</div>
        <h2 className="rlc-title">{t("raid.loot.title").replace("{boss}", boss ? tr(boss.name) : c.bossId)}</h2>
        <div className="rlc-stage">
          <div className="rlc-chest">
            <RaidChest open={skip || done || false} tint={`var(--rar-${top === "common" ? "godly" : top})`} />
          </div>
          {!skip && <div className="rlc-open-note muted">{t("raid.loot.open")}</div>}
          <div className="rlc-items" style={{ "--n": items.length } as CSSProperties}>
            {items.length === 0 && <p className="raid-note muted">{t("raid.loot.nothing")}</p>}
            {items.map((l, i) => {
              const it = content.items[l.itemId];
              const rar = it?.rarity ?? "common";
              return (
                <div key={l.itemId} className={`rlc-item rlc-rar-${rar}`} style={{ "--i": i } as CSSProperties}>
                  <span className="rlc-beam" aria-hidden="true" />
                  {rar === "mythic" && <span className="rlc-beam rlc-beam-2" aria-hidden="true" />}
                  <ItemCell itemId={l.itemId} qty={l.qty} />
                  <span className={`rlc-item-name rarity-${rar}`}>{it ? tr(it.name) : l.itemId}</span>
                  <span className="rlc-item-rar muted">{RARITY_LABEL[rar] ? tr(RARITY_LABEL[rar]) : ""}</span>
                </div>
              );
            })}
          </div>
        </div>
        {/* claude:2026-10-25T10:59:00+01:00 — 1.4.1 S4: Slayer-Punkte je Hallen-Boss (engine raid.ts onRaidRoomCleared, flach je Stufe) */}
        {(SLAYER_POINTS_PER_RAID_BOSS[c.difficulty] ?? 0) > 0 && (
          <p className="rlc-slayer-points">{t("raid.boss.slayerPoints").replace("{n}", formatNum(SLAYER_POINTS_PER_RAID_BOSS[c.difficulty] ?? 0))}</p>
        )}
        <div className="rlc-footer">
          {!done && !skip && (
            <button type="button" className="shop-citadel-btn" onClick={() => setSkip(true)}>{t("raid.loot.skip")}</button>
          )}
          <button type="button" className="btn-iron" onClick={onClose}>{t("raid.loot.continue")}</button>
        </div>
      </div>
    </div>
  );
}

function DialogShell({ title, tone, children, footer }: { title: string; tone?: string; children: ReactNode; footer: ReactNode }): JSX.Element {
  return (
    <div className="modal-overlay raid-dialog-overlay" role="dialog" aria-modal="true">
      <div className={`modal raid-dialog${tone ? ` raid-dialog-${tone}` : ""}`}>
        <h2 className="raid-dialog-title">{title}</h2>
        {children}
        <div className="raid-dialog-footer">{footer}</div>
      </div>
    </div>
  );
}

function GoldAmount({ n }: { n: number }): JSX.Element {
  return (
    <span className="raid-gold">
      {formatNum(n)} {GOLD_ICON_URL ? <img loading="lazy" decoding="async" src={GOLD_ICON_URL} alt="" className="ui-icon" /> : null}
    </span>
  );
}

export function RaidOverlays(): JSX.Element {
  const state = useGameState();
  const { t, tr } = useI18n();
  const rs = raidStateOf(state);
  const run = rs.run;
  const def = run ? raidDefs(content).find((d) => d.id === run.raidId) : undefined;

  const [ceremony, setCeremony] = useState<Ceremony | null>(null);
  const seenSeq = useRef<number>(run?.bossSeq ?? 0);
  const seenResult = useRef<number>(rs.resultSeq);
  const [result, setResult] = useState<NonNullable<typeof rs.lastResult> | null>(null);
  const [restartMsg, setRestartMsg] = useState<string | null>(null);
  // claude:2026-10-24T15:30:00+02:00 — Rückfrage vor „Aufgeben“ im Tod-Dialog (QA2 Raid B3)
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  // claude:2026-10-24T15:30:00+02:00 — Laufzeit/Bestzeit beim ersten Abschluss-Render festschreiben, die Spieluhr läuft im Dialog weiter (QA2 Raid B4)
  const frozenComplete = useRef<{ dur: number; isBest: boolean } | null>(null);
  if (run?.phase !== "complete") frozenComplete.current = null;

  useEffect(() => {
    const r = state.raid?.run ?? null;
    if (!r) { seenSeq.current = 0; }
    else if (r.bossSeq < seenSeq.current) seenSeq.current = r.bossSeq;
    else if (r.bossSeq > seenSeq.current) {
      seenSeq.current = r.bossSeq;
      const d = raidDefs(content).find((x) => x.id === r.raidId);
      const room = d?.rooms[r.room];
      if (room) {
        const boss = content.monsters[room.bossId];
        if (state.raid?.queue) {
          // Warteschlange: nichts blockieren, nur ein leiser Hinweis.
          // claude:2026-10-25T13:11:00+01:00 — 1.4.1 S4: auch in der Warteschlange (kein Beutedialog) die Slayer-Punkte des Bosses nennen.
          const slayerPts = SLAYER_POINTS_PER_RAID_BOSS[r.difficulty] ?? 0;
          const detail = [d ? tr(d.name) : "", slayerPts > 0 ? t("raid.boss.slayerPoints").replace("{n}", formatNum(slayerPts)) : ""]
            .filter(Boolean)
            .join(" · ");
          pushUiToast({ icon: "⚔", title: t("raid.loot.title").replace("{boss}", boss ? tr(boss.name) : room.bossId), detail });
        } else {
          setCeremony({ seq: r.bossSeq, bossId: room.bossId, roomDungeonId: room.dungeonId, difficulty: r.difficulty, loot: r.lastLoot.map((l) => ({ ...l })) });
        }
      }
    }
    const lr = state.raid?.lastResult ?? null;
    if (lr && lr.seq > seenResult.current) {
      seenResult.current = lr.seq;
      if (lr.outcome === "defeated") setResult(lr);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.totalTicks]);

  if (ceremony) return <LootCeremony key={ceremony.seq} c={ceremony} onClose={() => setCeremony(null)} />;

  if (result) {
    return (
      <DialogShell
        title={t("raid.over.title")}
        tone="over"
        footer={<button type="button" className="btn-iron" onClick={() => setResult(null)}>{t("common.close")}</button>}
      >
        <p className="raid-dialog-body">{result.refund > 0 ? t("raid.over.refund").replace("{gold}", formatNum(result.refund)) : t("raid.over.noRefund")}</p>
        <p className="raid-note muted">{t(`raid.diff.${result.difficulty}`)} · {formatMmSs(result.durationMs)}</p>
      </DialogShell>
    );
  }

  if (!run || !def || rs.queue) return <></>;

  if (run.phase === "defeated") {
    const cost = run.difficulty === "heroic" ? def.heroicRestartCost : 0;
    const room = def.rooms[run.room];
    return (
      <DialogShell
        title={t("raid.defeat.title")}
        tone={run.difficulty}
        footer={
          <>
            <button
              type="button"
              className="btn-iron"
              onClick={() => {
                const r = restartRaidRoom(state, content);
                setRestartMsg(r === "gold" ? t("raid.defeat.needGold") : null);
              }}
            >
              {cost > 0 ? t("raid.defeat.restartPaid").replace("{gold}", formatNum(cost)) : t("raid.defeat.restartFree")}
            </button>
            <button
              type="button"
              className="shop-citadel-btn"
              onClick={() =>
                setConfirm({
                  title: t("raid.abandon.confirmTitle"),
                  body: run.difficulty === "mythic" && def ? t("raid.abandon.confirmBodyMythic").replace("{pct}", String(Math.round(def.mythicRefundPct * 100))) : t("raid.abandon.confirmBody"), // claude:2026-10-24T16:10:00+02:00
                  confirmLabel: t("raid.defeat.giveUp"),
                  danger: true,
                  onConfirm: () => abandonRaid(state, content),
                })
              }
            >
              {t("raid.defeat.giveUp")}
            </button>
          </>
        }
      >
        <p className="raid-dialog-room">{room ? tr(room.name) : ""} · {t(`raid.diff.${run.difficulty}`)}</p>
        <p className="raid-dialog-body">
          {run.difficulty === "heroic" ? t("raid.defeat.heroicBody").replace("{gold}", formatNum(def.heroicRestartCost)) : t("raid.defeat.normalBody")}
        </p>
        {run.difficulty === "heroic" && (
          <label className="raid-check">
            <input
              type="checkbox"
              checked={state.settings.raidAutoBuyRestart === true}
              onChange={(e) => { state.settings.raidAutoBuyRestart = e.target.checked; }}
            />
            <span>{t("raid.defeat.autoBuy")}</span>
            <span className="muted">{t("raid.defeat.autoBuyHint")}</span>{/* claude:2026-10-25T12:30:00+02:00 — Hinweis bricht in eigene Zeile um, kein Trennpunkt davor */}
          </label>
        )}
        {restartMsg && <p className="raid-msg">{restartMsg}</p>}
        <ConfirmModal request={confirm} onClose={() => setConfirm(null)} overlayClass="raid-confirm-overlay" />
      </DialogShell>
    );
  }

  if (run.phase === "complete") {
    if (!frozenComplete.current) {
      const now = state.elapsedMs - run.startedAtMs;
      const best = rs.fastestMs[run.difficulty];
      // Die Bestzeit wurde beim Abschluss gesetzt; bis zum ersten Render liegt höchstens ein Tick dazwischen.
      const isBest = best !== undefined && best <= now && now - best < 1000;
      frozenComplete.current = { dur: isBest ? best : now, isBest };
    }
    const { dur, isBest } = frozenComplete.current;
    return (
      <DialogShell
        title={`${tr(def.name)} · ${t(`raid.diff.${run.difficulty}`)}`}
        tone={run.difficulty}
        footer={<button type="button" className="btn-iron" onClick={() => closeRaidResult(state, content, Date.now())}>{t("common.close")}</button>}
      >
        <div className="rlc-eyebrow">{t("raid.complete.eyebrow")}</div>
        <div className="raid-complete-stats">
          <span>{t("raid.complete.time")}: <strong>{formatMmSs(dur)}</strong></span>
          <span>{t("raid.complete.fee")}: <strong><GoldAmount n={run.feePaid} /></strong></span>
        </div>
        {isBest && <p className="raid-newbest">{t("raid.complete.newBest")}</p>}
        <div className="raid-label">{t("raid.rest.runLoot")}</div>
        <LootGrid loot={run.loot} empty={t("raid.rest.noLoot")} />
      </DialogShell>
    );
  }
  return <></>;
}

/** „Du rastest.“ (Kampf-Seite, phase "rest"). `loadout` ist das Vorbereitungs-Dock der Kampf-Seite (Essen, Tränke, Ausrüstung). */
export function RaidRestScreen({ loadout }: { loadout: ReactNode }): JSX.Element {
  const state = useGameState();
  const { t, tr } = useI18n();
  const rs = raidStateOf(state);
  const run = rs.run!;
  const def = raidDefs(content).find((d) => d.id === run.raidId);
  const next = def?.rooms[run.room + 1];
  const nextBg = raidRoomCard(next?.dungeonId);
  const auto = state.settings.raidAutoContinue === true || !!rs.queue;
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null); // claude:2026-10-24T15:30:00+02:00 — Rückfrage vor „Aufgeben“ (QA2 Raid B3)
  return (
    <div className="combat-layout">
      <div className="combat-sidebar">{loadout}</div>
      <div className="combat-main-area">
        <div className="raid-rest dungeon-progress">
          <h2 className="raid-rest-title">{t("raid.rest.title")}</h2>
          <p className="raid-rest-line">{t(`raid.rest.line.${run.room + 1}`)}</p>
          <p className="raid-note muted">{t("raid.rest.healed")}</p>

          <div className="raid-rest-actions">
            <button type="button" className="btn-iron raid-start-btn" onClick={() => continueRaid(state, content)}>
              {t("raid.rest.next")}
            </button>
            <label className="raid-check">
              <input
                type="checkbox"
                checked={state.settings.raidAutoContinue === true}
                onChange={(e) => { state.settings.raidAutoContinue = e.target.checked; }}
              />
              <span>{t("raid.rest.auto")}</span>
            </label>
            {/* claude:2026-10-24T16:10:00+02:00 — eigene Aktion/eigener Kampf pausiert den Countdown: Hinweis statt stehender Zahl */}
            {auto && run.restMs > 0 && (
              <span className="raid-note muted">
                {playerBusyOutsideRaid(state, content) ? t("raid.rest.paused") : t("raid.rest.autoIn").replace("{s}", String(Math.ceil(run.restMs / 1000)))}
              </span>
            )}
            <button
              type="button"
              className="shop-citadel-btn"
              onClick={() =>
                setConfirm({
                  title: t("raid.abandon.confirmTitle"),
                  body: run.difficulty === "mythic" && def ? t("raid.abandon.confirmBodyMythic").replace("{pct}", String(Math.round(def.mythicRefundPct * 100))) : t("raid.abandon.confirmBody"), // claude:2026-10-24T16:10:00+02:00
                  confirmLabel: t("raid.abandon"),
                  danger: true,
                  onConfirm: () => abandonRaid(state, content),
                })
              }
            >
              {t("raid.abandon")}
            </button>
          </div>
          <ConfirmModal request={confirm} onClose={() => setConfirm(null)} />

          <div className="raid-rest-grid">
            <div className="raid-rest-col">
              <div className="raid-label">{t("raid.rest.gear")}</div>
              <div className="raid-rest-doll"><EquipmentDoll /></div>
              <p className="raid-note muted">{t("raid.rest.prepHint")}</p>
            </div>
            <div className="raid-rest-col">
              {next && (
                <div className={`raid-rest-next${nextBg ? " has-bg" : ""}`} style={nextBg ? { backgroundImage: `url("${nextBg}")` } : undefined}>
                  <div className="raid-label">{t("raid.rest.nextRoom").replace("{room}", tr(next.name))}</div>
                  <p className="raid-rest-desc">{t(`raid.room.${run.room + 2}.desc`)}</p>
                </div>
              )}
              <div className="raid-label">{t("raid.rest.lastLoot")}</div>
              <LootGrid loot={run.lastLoot} empty={t("raid.rest.noLoot")} />
              <div className="raid-label">{t("raid.rest.runLoot")}</div>
              <LootGrid loot={run.loot} empty={t("raid.rest.noLoot")} />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
