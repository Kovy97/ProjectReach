// claude:2026-10-23T23:10:00+02:00 — Bergung (1.4.0 „Feder und Stahl“ BG, Chef 23.10.2026). Zwei Dialoge:
//  • SalvageConfirmModal: Einzelstück oder Stapel zerlegen, mit Ertrags-Vorschau. Pflicht ab legendär und bei
//    Einzelstücken mit Runen (die gehen verloren, Entzaubern vorher anbieten).
//  • SalvageBatchModal: Sammel-Knopf „Alle Beute bis Rarität X zerlegen“ mit Vorschau-Liste. Kein Auto-Zerlegen.
// Gleiche Modal-Bausteine wie die Bank (modal-overlay/modal, Esc schließt).
import { useEffect, useState } from "react";
import { createPortal } from "react-dom"; // claude:2026-10-31T11:29:00+01:00 — Bestätigungen am body (s. Z-Reihenfolge-Kommentar unten)
import { content } from "@hearthforge/content";
import { salvageBankInstance, salvageBankItem, salvageBatch, salvageInstance, salvageItem, salvagePlan, salvagePreview, salvageYield } from "@hearthforge/engine";
import type { SalvagePick } from "@hearthforge/engine";
import type { ItemRarity } from "@hearthforge/shared";
import { ITEM_RARITIES, RARITY_LABEL, RELIC_DUST_ITEM_ID } from "@hearthforge/shared";
import { useGameState } from "../game/GameContext";
import { useI18n } from "../i18n";
import { registerEscCloser } from "../util/escStack";
import { ItemCell } from "./ItemCell";

// claude:2026-10-31T11:29:00+01:00 — Z-REIHENFOLGE (Chef-Bug 31.10. „Tooltip zum Bestätigen bei Stapeln hinter dem Fenster“): Ursache war die Varianten-
// Tasche (VariantPouchModal). Sie sitzt per Portal am Ende von <body> (z-index 200) und bleibt nach „Stapel zerlegen“ offen; die
// Bestätigung hing dagegen als normales Kind in der Seite (ebenfalls z-index 200, Seitenspalten mit isolation:isolate). Bei
// Gleichstand gewinnt das spätere Element im DOM, also lag die Bestätigung HINTER der Tasche. Jetzt gehen alle Bergungs-Dialoge
// per Portal an <body> und tragen .salvage-overlay (z-index 260: über Modals/Tasche, unter Item-Karten 500 und Zeremonien).

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
  return createPortal(
    <div className="modal-overlay salvage-overlay" onClick={onClose}>
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
    </div>,
    document.body,
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
  return createPortal(
    <div className="modal-overlay salvage-overlay" onClick={onClose}>
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
    </div>,
    document.body,
  );
}

// claude:2026-10-31T11:29:00+01:00 — Massen-Zerlegen (Reiter „Zerlegen“ im Laden, Chef 31.10.): gemeinsame Bestätigung für Raritäts-Knopf und Auswahl.

/** Aggregierte Ertragszeilen (Material + Reliktstaub) als Zellen. */
export function SalvageSummaryCells({ items, dust }: { items: { itemId: string; qty: number }[]; dust: number }): JSX.Element {
  return (
    <div className="salvage-yield">
      {items.map((it) => (
        <ItemCell key={it.itemId} itemId={it.itemId} qty={it.qty} />
      ))}
      {dust > 0 && <ItemCell itemId={RELIC_DUST_ITEM_ID} qty={dust} />}
    </div>
  );
}

const HIGH_RANK = ITEM_RARITIES.indexOf("legendary");

/** Ab legendär gilt die Warnzeile der Bestätigung. */
export function isHighSalvageRarity(r: ItemRarity | undefined): boolean {
  return ITEM_RARITIES.indexOf(r ?? "common") >= HIGH_RANK;
}

export function SalvageBulkConfirm({
  picks,
  highCount,
  runeCount,
  onConfirm,
  onClose,
}: {
  picks: SalvagePick[];
  /** Teile ab legendär in der Auswahl. */
  highCount: number;
  /** Einzelstücke mit Runen in der Auswahl. */
  runeCount: number;
  onConfirm: () => void;
  onClose: () => void;
}): JSX.Element {
  const { t } = useI18n();
  useEffect(() => registerEscCloser("modal", onClose), [onClose]);
  const preview = salvagePreview(content, picks);
  const inv = picks.filter((p) => p.source === "inventory").reduce((a, p) => a + p.qty, 0);
  const bank = picks.filter((p) => p.source === "bank").reduce((a, p) => a + p.qty, 0);
  return createPortal(
    <div className="modal-overlay salvage-overlay" onClick={onClose}>
      <div className="modal salvage-modal salvage-modal--bulk" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close ds-close-button" onClick={onClose} aria-label={t("common.close")} />
        <h3 className="salvage-title">{t("salvage.tab.confirmTitle").replace("{n}", String(preview.pieces))}</h3>
        {inv > 0 && bank > 0 && (
          <p className="salvage-lead muted">{t("salvage.tab.confirmSplit").replace("{inv}", String(inv)).replace("{bank}", String(bank))}</p>
        )}
        {highCount > 0 && (
          <p className="salvage-warn salvage-warn--high" role="alert">{t("salvage.tab.warnHigh").replace("{n}", String(highCount))}</p>
        )}
        {runeCount > 0 && <p className="salvage-warn" role="alert">{t("salvage.tab.warnRunes").replace("{n}", String(runeCount))}</p>}
        <p className="salvage-lead muted">{t("salvage.yieldLead")}</p>
        <SalvageSummaryCells items={preview.items} dust={preview.dust} />
        <div className="salvage-actions">
          <button type="button" className="shop-citadel-btn" onClick={onClose}>
            {t("salvage.cancel")}
          </button>
          <button type="button" className="btn-iron" autoFocus onClick={onConfirm}>
            {t("salvage.batchConfirm").replace("{n}", String(preview.pieces))}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** Mengenwahl für einen Stapel (Schieber), mit Ertragsvorschau statt Verkaufspreis. */
export function SalvageQtyPopup({
  itemId,
  max,
  initialQty,
  showRemove,
  onConfirm,
  onRemove,
  onClose,
}: {
  itemId: string;
  max: number;
  initialQty: number;
  showRemove: boolean;
  onConfirm: (qty: number) => void;
  onRemove: () => void;
  onClose: () => void;
}): JSX.Element {
  const { t, tr } = useI18n();
  const item = content.items[itemId];
  const [qty, setQty] = useState(() => Math.min(Math.max(1, initialQty), Math.max(1, max)));
  useEffect(() => registerEscCloser("modal", onClose), [onClose]);
  const preview = salvagePreview(content, [{ source: "inventory", itemId, instanceId: null, qty }]);
  return createPortal(
    <div className="modal-overlay salvage-overlay" onClick={onClose}>
      <div className="modal mshop-popup salvage-qty-popup" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close ds-close-button" onClick={onClose} aria-label={t("common.close")} />
        <h3 className="salvage-title">{t("salvage.tab.qtyTitle").replace("{name}", item ? tr(item.name) : itemId)}</h3>
        <div className="mshop-qty-row">
          <input
            type="range"
            className="mshop-range"
            aria-label={t("shop.qtyLabel")}
            min={1}
            max={Math.max(1, max)}
            step={1}
            value={qty}
            onChange={(e) => setQty(Number(e.target.value))}
          />
          <span className="mshop-qty-value">{qty}/{max}</span>
        </div>
        <SalvageSummaryCells items={preview.items} dust={preview.dust} />
        <div className="mshop-popup-actions">
          {showRemove && (
            <button type="button" className="shop-citadel-btn" onClick={onRemove}>{t("salvage.tab.qtyRemove")}</button>
          )}
          <button type="button" className="btn-iron" autoFocus onClick={() => onConfirm(qty)}>{t("salvage.tab.qtyApply")}</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
