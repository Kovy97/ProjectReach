// claude:2026-10-23T23:10:00+02:00 — Bergung (1.4.0 „Feder und Stahl“ BG, Chef 23.10.2026). Zwei Dialoge:
//  • SalvageConfirmModal: Einzelstück oder Stapel zerlegen, mit Ertrags-Vorschau. Pflicht ab legendär und bei
//    Einzelstücken mit Runen (die gehen verloren, Entzaubern vorher anbieten).
//  • SalvageBatchModal: Sammel-Knopf „Alle Beute bis Rarität X zerlegen“ mit Vorschau-Liste. Kein Auto-Zerlegen.
// Gleiche Modal-Bausteine wie die Bank (modal-overlay/modal, Esc schließt).
import { useEffect, useState } from "react";
import { content } from "@hearthforge/content";
import { salvageBankInstance, salvageBankItem, salvageBatch, salvageInstance, salvageItem, salvagePlan, salvageYield } from "@hearthforge/engine";
import type { ItemRarity } from "@hearthforge/shared";
import { RARITY_LABEL, RELIC_DUST_ITEM_ID } from "@hearthforge/shared";
import { useGameState } from "../game/GameContext";
import { useI18n } from "../i18n";
import { registerEscCloser } from "../util/escStack";
import { ItemCell } from "./ItemCell";

/** Ertrag als Zellen-Reihe (Material + Reliktstaub), `times` = Stückzahl. */
function YieldRow({ itemId, times }: { itemId: string; times: number }): JSX.Element | null {
  const y = salvageYield(content, itemId);
  if (!y) return null;
  return (
    <div className="salvage-yield">
      {y.items.map((it) => (
        <ItemCell key={it.itemId} itemId={it.itemId} qty={it.qty * times} />
      ))}
      {y.dust > 0 && <ItemCell itemId={RELIC_DUST_ITEM_ID} qty={y.dust * times} />}
    </div>
  );
}

export function SalvageConfirmModal({
  itemId,
  instanceId,
  qty,
  hasRunes,
  fromBank = false,
  onClose,
}: {
  itemId: string;
  instanceId: string | null;
  qty: number;
  hasRunes: boolean;
  /** claude:2026-10-26T07:05:00+02:00 — Quelle Bank statt Inventar (Chef BG1). */
  fromBank?: boolean;
  onClose: () => void;
}): JSX.Element {
  const state = useGameState();
  const { t, tr } = useI18n();
  const item = content.items[itemId];
  useEffect(() => registerEscCloser("modal", onClose), [onClose]);
  const confirm = (): void => {
    if (fromBank) {
      if (instanceId) salvageBankInstance(state, content, instanceId);
      else salvageBankItem(state, content, itemId, qty);
    } else if (instanceId) salvageInstance(state, content, instanceId);
    else salvageItem(state, content, itemId, qty);
    onClose();
  };
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal salvage-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close ds-close-button" onClick={onClose} aria-label={t("common.close")} />
        <h3 className="salvage-title">{t("salvage.confirmTitle")}</h3>
        <div className="salvage-subject">
          <ItemCell itemId={itemId} qty={qty > 1 ? qty : undefined} />
          <span className="salvage-subject-name">{item ? tr(item.name) : itemId}</span>
        </div>
        {hasRunes && <p className="salvage-warn">{t("salvage.runesLost")}</p>}
        <p className="salvage-lead muted">{t("salvage.yieldLead")}</p>
        <YieldRow itemId={itemId} times={qty} />
        <div className="salvage-actions">
          <button type="button" className="shop-citadel-btn" onClick={onClose}>
            {t("salvage.cancel")}
          </button>
          <button type="button" className="btn-iron" onClick={confirm}>
            {t("salvage.confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}

const BATCH_RARITIES: ItemRarity[] = ["common", "rare", "superRare", "epic"];

export function SalvageBatchModal({ onClose }: { onClose: () => void }): JSX.Element {
  const state = useGameState();
  const { t, tr } = useI18n();
  const [max, setMax] = useState<ItemRarity>("rare");
  useEffect(() => registerEscCloser("modal", onClose), [onClose]);
  const plan = salvagePlan(state, content, max);
  const pieces = plan.reduce((a, e) => a + e.qty, 0);
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal salvage-modal salvage-modal--batch" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close ds-close-button" onClick={onClose} aria-label={t("common.close")} />
        <h3 className="salvage-title">{t("salvage.batchTitle")}</h3>
        <p className="salvage-lead muted">{t("salvage.batchLead")}</p>
        <div className="salvage-rarity-row" role="radiogroup" aria-label={t("salvage.batchUpTo")}>
          <span className="muted">{t("salvage.batchUpTo")}</span>
          {BATCH_RARITIES.map((r) => (
            <button
              key={r}
              type="button"
              role="radio"
              aria-checked={max === r}
              className={`salvage-rarity-btn${max === r ? " active" : ""}`}
              style={{ color: `var(--rar-${r})` }}
              onClick={() => setMax(r)}
            >
              {tr(RARITY_LABEL[r])}
            </button>
          ))}
        </div>
        {plan.length === 0 ? (
          <p className="muted">{t("salvage.batchNothing")}</p>
        ) : (
          <div className="salvage-plan">
            {plan.map((e) => (
              <div key={e.instanceId ?? e.itemId} className="salvage-plan-row">
                <ItemCell itemId={e.itemId} qty={e.qty > 1 ? e.qty : undefined} />
                <span className="salvage-plan-arrow" aria-hidden="true">→</span>
                <YieldRow itemId={e.itemId} times={e.qty} />
              </div>
            ))}
          </div>
        )}
        <div className="salvage-actions">
          <button type="button" className="shop-citadel-btn" onClick={onClose}>
            {t("salvage.cancel")}
          </button>
          <button
            type="button"
            className="btn-iron"
            disabled={plan.length === 0}
            onClick={() => {
              salvageBatch(state, content, max);
              onClose();
            }}
          >
            {t("salvage.batchConfirm").replace("{n}", String(pieces))}
          </button>
        </div>
      </div>
    </div>
  );
}
