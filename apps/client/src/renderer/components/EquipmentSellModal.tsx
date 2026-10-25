// claude:2026-10-25T10:32:00+01:00 — Sammelverkauf von Ausrüstung (1.4.1 K1, Steam-Wunsch „sell-all button for weapon selling“).
// Ein Dialog für Laden (Quelle Inventar) und Bank (Quelle Bank): Art + Seltenheit „bis einschließlich“ wählen, Vorschau mit
// Stückzahl und Gold je Art, dann bestätigen. Muster, Optik und Bedienung vom Bergungs-Sammeldialog (SalvageModals.tsx
// `SalvageBatchModal`): dieselben salvage-*-Bausteine, Esc schließt über escStack. Preisquelle und Ausschlüsse liegen
// vollständig in der Engine (`equipmentSellPlan`/`sellEquipmentBatch`, shop.ts); hier wird nur angezeigt.
import { useEffect, useState } from "react";
import { content } from "@hearthforge/content";
import { EQUIPMENT_SELL_KINDS, equipmentSellPlan, sellEquipmentBatch } from "@hearthforge/engine";
import type { EquipmentSellFilter, EquipmentSellKind, EquipmentSellResult, EquipmentSellSource } from "@hearthforge/engine";
import type { ItemRarity } from "@hearthforge/shared";
import { RARITY_LABEL } from "@hearthforge/shared";
import { useGameState } from "../game/GameContext";
import { useI18n } from "../i18n";
import { registerEscCloser } from "../util/escStack";
import { formatNum } from "../util/format";
import { ItemCell } from "./ItemCell";
import "../styles/equipment-sell.css";

/** Seltenheitsstufen wie beim Bergungs-Sammelknopf; alles darüber bleibt eine bewusste Einzel-Entscheidung. */
const SELL_RARITIES: ItemRarity[] = ["common", "rare", "superRare", "epic"];
const KIND_FILTERS: EquipmentSellFilter[] = ["weapons", "armor", "jewelry", "all"];
/** Vorhandene Schlüssel wiederverwendet (Laden-Kategorien, Runen-Ziel „Schmuck“ steht in allen Sprachen im Plural). */
const KIND_LABEL_KEY: Record<EquipmentSellFilter, string> = {
  weapons: "shop.cat.weapons",
  armor: "shop.cat.armor",
  jewelry: "rune.target.jewelry",
  all: "shop.cat.all",
};
/** Höchstens so viele Zeilen in der Vorschau-Liste; der Rest steht als „+ N weitere“ darunter (Summen bleiben vollständig). */
const MAX_ROWS = 40;

export function EquipmentSellModal({
  source,
  onClose,
  onSold,
}: {
  source: EquipmentSellSource;
  onClose: () => void;
  /** Ergebnis für das Mass-Sell-Banner der aufrufenden Seite. */
  onSold: (result: EquipmentSellResult) => void;
}): JSX.Element {
  const state = useGameState();
  const { t, tr } = useI18n();
  const [kind, setKind] = useState<EquipmentSellFilter>("weapons");
  const [max, setMax] = useState<ItemRarity>("rare");
  useEffect(() => registerEscCloser("modal", onClose), [onClose]);

  // Jeder Render (auch je Tick) rechnet frisch: was hier steht, ist genau das, was der Knopf verkauft.
  const plan = equipmentSellPlan(state, content, { kind, maxRarity: max, source });
  const rows = [...plan.entries].sort((a, b) => b.gold - a.gold || a.itemId.localeCompare(b.itemId));
  const shown = rows.slice(0, MAX_ROWS);
  const more = rows.length - shown.length;
  const summaryKinds: readonly EquipmentSellKind[] = kind === "all" ? EQUIPMENT_SELL_KINDS : [kind];
  const skipped = plan.skipped.locked + plan.skipped.runes + plan.skipped.tools + plan.skipped.masterRings + plan.skipped.orders + plan.skipped.pointShop; // claude:2026-10-25T11:42:00+01:00 — Slayer-Shop-Teile
  const gold = (n: number): string => t("shop.gold").replace("{n}", formatNum(n));
  const count = (n: number): string => t("equipSell.count").replace("{n}", formatNum(n));

  const confirm = (): void => {
    const result = sellEquipmentBatch(state, content, { kind, maxRarity: max, source });
    onSold(result);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal salvage-modal salvage-modal--batch equip-sell-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close ds-close-button" onClick={onClose} aria-label={t("common.close")} />
        <h3 className="salvage-title">{t("equipSell.title")}</h3>
        <p className="salvage-lead muted">{t(source === "bank" ? "equipSell.leadBank" : "equipSell.leadInventory")}</p>

        <div className="salvage-rarity-row" role="radiogroup" aria-label={t("equipSell.kindLabel")}>
          <span className="muted equip-sell-label">{t("equipSell.kindLabel")}</span>
          {KIND_FILTERS.map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={kind === k}
              className={`salvage-rarity-btn equip-sell-kind-btn${kind === k ? " active" : ""}`}
              onClick={() => setKind(k)}
            >
              {t(KIND_LABEL_KEY[k])}
            </button>
          ))}
        </div>
        <div className="salvage-rarity-row" role="radiogroup" aria-label={t("equipSell.upTo")}>
          <span className="muted equip-sell-label">{t("equipSell.upTo")}</span>
          {SELL_RARITIES.map((r) => (
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

        {/* Vorschau je Art: Stückzahl und Gold, darunter die Summe (die Zahl auf dem Knopf). */}
        <div className="equip-sell-summary">
          {summaryKinds.map((k) => (
            <div key={k} className="equip-sell-summary-row">
              <span className="equip-sell-summary-kind">{t(KIND_LABEL_KEY[k])}</span>
              <span className="equip-sell-summary-count">{count(plan.byKind[k].pieces)}</span>
              <span className="equip-sell-summary-gold">{gold(plan.byKind[k].gold)}</span>
            </div>
          ))}
          {summaryKinds.length > 1 && (
            <div className="equip-sell-summary-row equip-sell-summary-row--total">
              <span className="equip-sell-summary-kind">{t("equipSell.total")}</span>
              <span className="equip-sell-summary-count">{count(plan.pieces)}</span>
              <span className="equip-sell-summary-gold">{gold(plan.gold)}</span>
            </div>
          )}
        </div>
        {skipped > 0 && <p className="equip-sell-skipped muted">{t("equipSell.skipped").replace("{n}", formatNum(skipped))}</p>}

        {plan.entries.length === 0 ? (
          <p className="muted equip-sell-empty">{t("equipSell.nothing")}</p>
        ) : (
          <div className="salvage-plan equip-sell-plan">
            {shown.map((e) => {
              const item = content.items[e.itemId];
              const rarity = item?.rarity ?? "common";
              return (
                <div key={e.itemId} className="salvage-plan-row equip-sell-row">
                  {/* claude:2026-10-25T10:47:00+01:00 — Stückzahl neben dem Namen statt in der Zelle: vierstellige Mengen und die 2H-Marke teilen sich
                      in der kleinen Zelle sonst die untere Kante. */}
                  <ItemCell itemId={e.itemId} />
                  <span className="equip-sell-row-name" style={{ color: `var(--rar-${rarity})` }}>
                    {item ? tr(item.name) : e.itemId}
                  </span>
                  <span className="equip-sell-row-qty">×{formatNum(e.pieces)}</span>
                  <span className="equip-sell-row-gold">{gold(e.gold)}</span>
                </div>
              );
            })}
            {more > 0 && <p className="muted equip-sell-more">{t("equipSell.moreKinds").replace("{n}", formatNum(more))}</p>}
          </div>
        )}

        <p className="equip-sell-note muted">
          {t("equipSell.protected")} {t("equipSell.noBuyBack")}
        </p>
        <div className="salvage-actions">
          <button type="button" className="shop-citadel-btn" onClick={onClose}>
            {t("shop.massSell.cancel")}
          </button>
          <button type="button" className="btn-iron" disabled={plan.pieces === 0} onClick={confirm}>
            {t("equipSell.confirm").replace("{n}", formatNum(plan.pieces)).replace("{gold}", formatNum(plan.gold))}
          </button>
        </div>
      </div>
    </div>
  );
}
