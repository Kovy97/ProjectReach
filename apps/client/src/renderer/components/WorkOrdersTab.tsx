// claude:2026-10-25T01:20:00+02:00 — Reiter „Arbeitsaufträge“ (1.4.0 „Feder und Stahl“ AU, Chef 23.10.2026). Oben das
// wartende Angebot mit Annehmen/Ablehnen, darunter die offenen Aufträge (höchstens drei) mit Fortschritt ab Annahme,
// „In Warteschlange legen“ und „Abgeben“. Gleiche Bausteine wie die Quest-Karten (Eisenrahmen-Knöpfe, ItemCell).
import { useState } from "react";
import { content } from "@hearthforge/content";
import {
  abandonWorkOrder,
  acceptWorkOrder,
  declineWorkOrder,
  deliverWorkOrder,
  enqueueAction,
  eventRngOf,
  workOrderProgress,
} from "@hearthforge/engine";
import type { WorkOrder } from "@hearthforge/shared";
import { ORDER_MAX_OPEN } from "@hearthforge/shared";
import { useGameState } from "../game/GameContext";
import { useI18n } from "../i18n";
import { ItemCell } from "./ItemCell";
import { formatNum } from "../util/format";
import { fillEventText, orderCustomer } from "../ordersApi";

function mmss(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function OrderHead({ order }: { order: WorkOrder }): JSX.Element {
  const { t, tr } = useI18n();
  const c = orderCustomer(content, order);
  const item = content.items[order.itemId];
  const target = item ? tr(item.name) : order.itemId;
  const line = c.line ? tr(c.line) : t(order.kind === "produce" ? "orders.guild.produce" : "orders.guild.deliver");
  return (
    <div className="work-order-head">
      <ItemCell itemId={order.itemId} qty={order.count} />
      <div className="work-order-text">
        <span className="work-order-customer">
          {c.name ? tr(c.name) : t("orders.guild.name")}
          {c.role && <span className="muted"> · {tr(c.role)}</span>}
        </span>
        <span className="work-order-line">„{fillEventText(line, { count: formatNum(order.count), target, zone: "" })}“</span>
        <span className="work-order-meta muted">
          {t(order.kind === "produce" ? "orders.kind.produce" : "orders.kind.deliver")} · {tr(content.skills[order.skill]!.name)} ·{" "}
          {t("orders.minutes").replace("{n}", String(order.minutes))}
        </span>
      </div>
      <div className="work-order-reward">
        <span>{t("orders.reward.gold").replace("{n}", formatNum(order.gold))}</span>
        <span>{t("orders.reward.xp").replace("{n}", formatNum(order.xp))}</span>
      </div>
    </div>
  );
}

export function WorkOrdersTab(): JSX.Element {
  const state = useGameState();
  const { t, tr } = useI18n();
  const [msg, setMsg] = useState<string | null>(null);
  const o = state.workOrders;
  const offer = o?.offer ?? null;
  const open = o?.open ?? [];
  return (
    <div className="work-orders">
      <p className="muted work-orders-lead">{t("orders.lead")}</p>
      {offer && (
        <div className="work-order work-order--offer">
          <div className="work-order-badge">
            {t("orders.offer.title")} <span className="muted">· {t("orders.offer.expires").replace("{time}", mmss(o?.offerMsLeft ?? 0))}</span>
          </div>
          <OrderHead order={offer} />
          <div className="work-order-actions">
            <button type="button" className="shop-citadel-btn" onClick={() => declineWorkOrder(state)}>
              {t("orders.decline")}
            </button>
            <button type="button" className="btn-iron" disabled={open.length >= ORDER_MAX_OPEN} onClick={() => acceptWorkOrder(state)}>
              {t("orders.accept")}
            </button>
          </div>
          {open.length >= ORDER_MAX_OPEN && <p className="muted">{t("orders.full")}</p>}
        </div>
      )}
      {open.length === 0 && !offer && <p className="muted work-orders-empty">{t("orders.empty")}</p>}
      {open.map((order) => {
        const p = workOrderProgress(state, order);
        const pct = Math.round((p.done / Math.max(1, p.count)) * 100);
        const canDeliver = p.ready && p.stock >= order.count;
        return (
          <div key={order.id} className={`work-order${p.ready ? " work-order--ready" : ""}`}>
            <OrderHead order={order} />
            <div className="work-order-progress" aria-label={t("orders.progress")}>
              <div className="work-order-bar">
                <div className="work-order-fill" style={{ width: `${pct}%` }} />
              </div>
              <span className="work-order-count">
                {formatNum(p.done)} / {formatNum(p.count)}
                {p.ready && p.stock < order.count && (
                  <span className="work-order-warn"> · {t("orders.missingStock").replace("{n}", formatNum(order.count - p.stock))}</span>
                )}
              </span>
            </div>
            <div className="work-order-actions">
              <button type="button" className="shop-citadel-btn work-order-abandon" onClick={() => abandonWorkOrder(state, order.id)}>
                {t("orders.abandon")}
              </button>
              {!p.ready && (
                <button
                  type="button"
                  className="shop-citadel-btn"
                  onClick={() => {
                    const main = content.actions[order.actionId]?.loot[0];
                    const perRun = main ? Math.max(1e-9, ((main.min + main.max) / 2) * Math.min(1, main.chance)) : 1;
                    if (enqueueAction(state, content, order.actionId, Math.max(1, Math.ceil((p.count - p.done) / perRun)))) setMsg(t("orders.queued"));
                  }}
                >
                  {t("orders.queue")}
                </button>
              )}
              <button
                type="button"
                className="btn-iron"
                disabled={!canDeliver}
                onClick={() => {
                  const r = deliverWorkOrder(state, content, order.id, eventRngOf(state));
                  if (r.reason !== "ok") return;
                  const crate = r.crateItemId ? content.items[r.crateItemId] : undefined;
                  setMsg(
                    t("orders.delivered").replace("{gold}", formatNum(r.gold)).replace("{xp}", formatNum(r.xp))
                      + (crate ? ` · ${t("orders.crate").replace("{item}", tr(crate.name))}` : ""),
                  );
                }}
              >
                {t("orders.deliver")}
              </button>
            </div>
          </div>
        );
      })}
      {msg && <p className="work-orders-msg">{msg}</p>}
    </div>
  );
}
