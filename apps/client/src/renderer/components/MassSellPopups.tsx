import { useEffect, useState } from "react";
import { content } from "@hearthforge/content";
import { effectiveSellPrice } from "@hearthforge/engine";
import type { ItemInstance } from "@hearthforge/shared";
import { instanceDisplayName } from "@hearthforge/shared";
import { useGameState } from "../game/GameContext";
import { useI18n } from "../i18n";
import { registerEscCloser } from "../util/escStack";
import { getItemImage, rarityClass } from "../items";
import { formatNum } from "../util/format";
import { sig } from "./VariantPouchModal";
import "../styles/mass-sell.css";

// ─── Task #323 (Chef-Feature "Mass-Sell im Shop") ──────────────────────────
// Drei kleine, wiederverwendete Popups für den Mass-Sell-Auswahlmodus in ShopPage.tsx (SellTab):
//   1. StackQtyPopup — Mengen-Slider (gestapelte Fungibles UND die Grundmenge eines
//      Varianten-Containers im Single-Modus, "gleiche Regel wie Fungibles" per Chef-Vorgabe).
//   2. ContainerModePopup — "Ganzer Stapel" vs. "Einzeln wählen" für Varianten-Container.
//   3. VariantListPopup — Häkchen-Liste aller Varianten (Optik nach VariantPouchModal-Vorbild),
//      × oben rechts übernimmt die aktuellen Häkchen (kein separater Bestätigen-Knopf nötig).
// Alle drei nutzen dieselben globalen `.modal-overlay`/`.modal`-Klassen (modals.css) + die
// escStack-Registry (Esc schließt IMMER nur das oberste Overlay). Preisquelle ist überall
// `effectiveSellPrice` — dieselbe Funktion, die sellItem/sellInstance selbst verwenden (kein
// eigener Preis-Zweitpfad, s. Chef-Vorgabe "dieselbe Preisquelle wie der Einzelverkauf"). Gold-
// Beträge nutzen den bisher ungenutzten `shop.gold`-Textschlüssel ("{n} Gold", schon in allen 7
// Sprachen vorhanden) statt eines GoldIcon-Bildes — dasselbe Text-statt-Icon-Muster wie
// `shop.masterRings.confirmBody` an anderer Stelle in dieser Datei.

function PopupHead({ itemId, subtitle }: { itemId: string; subtitle: string }): JSX.Element {
  const { tr } = useI18n();
  const item = content.items[itemId];
  const img = getItemImage(itemId);
  return (
    <>
      <div className="pouch-head">
        <span className={`pouch-head-icon ${rarityClass(item?.rarity)}`}>
          {img ? (
            <img src={img} alt="" className="pixelart" loading="lazy" decoding="async" />
          ) : item?.icon ? (
            <span className="pouch-head-emoji">{item.icon}</span>
          ) : null}
        </span>
        <div className="pouch-head-text">
          <div className="pouch-head-name">{item ? tr(item.name) : itemId}</div>
        </div>
      </div>
      <p className="mshop-popup-subtitle">{subtitle}</p>
    </>
  );
}

// ─── 1) Mengen-Slider ────────────────────────────────────────────────────────

export interface StackQtyPopupProps {
  itemId: string;
  /** Stapelgröße = Slider-Obergrenze. */
  max: number;
  /** Default-Sliderstand (Chef: "Default = Max" beim Erst-Anhaken; beim Editieren die aktuell
   *  angehakte Menge). */
  initialQty: number;
  /** Zeigt einen zusätzlichen "Entfernen"-Knopf (Editier-Fall: Zelle war schon angehakt). */
  showRemove: boolean;
  onConfirm: (qty: number) => void;
  onRemove: () => void;
  onClose: () => void;
}

export function StackQtyPopup({ itemId, max, initialQty, showRemove, onConfirm, onRemove, onClose }: StackQtyPopupProps): JSX.Element {
  const state = useGameState();
  const { t, tr } = useI18n();
  const item = content.items[itemId];
  const name = item ? tr(item.name) : itemId;
  const [qty, setQty] = useState(() => Math.min(Math.max(1, initialQty), Math.max(1, max)));
  const unit = effectiveSellPrice(state, content, itemId);

  useEffect(() => registerEscCloser("modal", onClose), [onClose]);

  return (
    // stopPropagation: dieses Popup kann VERSCHACHTELT in der VariantListPopup-Häkchenliste
    // sitzen (Basis-Zeile mit Stapelgröße >1) — ohne den Stopp würde ein Backdrop-Klick hier auch
    // das äußere Overlay treffen und die ganze Varianten-Liste mit-schließen.
    <div className="modal-overlay" onClick={(e) => { e.stopPropagation(); onClose(); }}>
      <div className="modal mshop-popup" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close ds-close-button" onClick={onClose} aria-label={t("common.close")} />
        <PopupHead itemId={itemId} subtitle={t("shop.massSell.qtyTitle").replace("{name}", name)} />
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
        <p className="mshop-qty-preview">
          {t("shop.gold").replace("{n}", formatNum(unit))} {t("shop.each")} · <strong>{t("shop.gold").replace("{n}", formatNum(unit * qty))}</strong>
        </p>
        <div className="mshop-popup-actions">
          {showRemove && (
            <button className="ds-button ds-button--sm" onClick={onRemove}>{t("shop.massSell.remove")}</button>
          )}
          <button className="ds-button ds-button--sm" onClick={() => onConfirm(qty)}>{t("shop.massSell.confirm")}</button>
        </div>
      </div>
    </div>
  );
}

// ─── 2) Stack/Single-Auswahl ─────────────────────────────────────────────────

export interface ContainerModePopupProps {
  itemId: string;
  onStack: () => void;
  onSingle: () => void;
  onClose: () => void;
}

export function ContainerModePopup({ itemId, onStack, onSingle, onClose }: ContainerModePopupProps): JSX.Element {
  const { t, tr } = useI18n();
  const item = content.items[itemId];
  const name = item ? tr(item.name) : itemId;

  useEffect(() => registerEscCloser("modal", onClose), [onClose]);

  return (
    <div className="modal-overlay" onClick={(e) => { e.stopPropagation(); onClose(); }}>
      <div className="modal mshop-popup" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close ds-close-button" onClick={onClose} aria-label={t("common.close")} />
        <PopupHead itemId={itemId} subtitle={t("shop.massSell.modeTitle").replace("{name}", name)} />
        <div className="mshop-mode-choices">
          <button className="mshop-mode-card" onClick={onStack}>
            <span className="mshop-mode-card-title">{t("shop.massSell.modeStack")}</span>
            <span className="mshop-mode-card-hint">{t("shop.massSell.modeStackHint")}</span>
          </button>
          <button className="mshop-mode-card" onClick={onSingle}>
            <span className="mshop-mode-card-title">{t("shop.massSell.modeSingle")}</span>
            <span className="mshop-mode-card-hint">{t("shop.massSell.modeSingleHint")}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 3) Varianten-Liste (Single-Modus) ───────────────────────────────────────

interface VariantRowGroup {
  key: string;
  representative: ItemInstance;
  ids: string[];
}

/** Wie `groupBySig` (VariantPouchModal.tsx), behält aber ALLE instanceIds je Signatur statt nur
 *  eines Repräsentanten + Zähler — Mass-Sell muss jede einzelne Instanz gezielt verkaufen können. */
function groupInstancesFull(instances: ItemInstance[]): VariantRowGroup[] {
  const map = new Map<string, VariantRowGroup>();
  for (const inst of instances) {
    const key = sig(inst);
    const existing = map.get(key);
    if (existing) existing.ids.push(inst.instanceId);
    else map.set(key, { key, representative: inst, ids: [inst.instanceId] });
  }
  return [...map.values()];
}

export interface VariantListPopupProps {
  itemId: string;
  /** Aktuelle Grundmenge (0 = keine im Besitz). */
  plainQty: number;
  /** Aktuelle Varianten-Instanzen dieses Basis-Items. */
  instances: ItemInstance[];
  initialBaseQty: number;
  initialInstanceIds: Set<string>;
  /** Wird bei JEDEM Schließen aufgerufen (× / Overlay-Klick / Esc) — übernimmt IMMER den aktuellen
   *  Häkchen-Stand (Chef: "oben rechts × schließen" ist hier zugleich die Bestätigung). */
  onClose: (baseQty: number, instanceIds: Set<string>) => void;
}

export function VariantListPopup({
  itemId,
  plainQty,
  instances,
  initialBaseQty,
  initialInstanceIds,
  onClose,
}: VariantListPopupProps): JSX.Element {
  const state = useGameState();
  const { t, tr, locale } = useI18n();
  const item = content.items[itemId];
  const unit = effectiveSellPrice(state, content, itemId);
  const [baseQty, setBaseQty] = useState(initialBaseQty);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set(initialInstanceIds));
  const [baseQtyPopupOpen, setBaseQtyPopupOpen] = useState(false);

  const groups = groupInstancesFull(instances);
  const totalAvailable = plainQty + instances.length;
  const totalSelected = baseQty + checkedIds.size;
  const allSelected = totalAvailable > 0 && totalSelected === totalAvailable;

  const commitAndClose = (): void => onClose(baseQty, checkedIds);
  // Ohne festes Dependency-Array WÄRE der registrierte Closer stets die aktuelle Closure nötig
  // (fängt den frischen baseQty/checkedIds-Stand ein) — explizite Deps statt "jeden Render neu"
  // vermeiden unnötige Registry-Churn bei Renders, die diese beiden Werte nicht betreffen.
  useEffect(() => registerEscCloser("modal", commitAndClose), [baseQty, checkedIds, onClose]);

  const toggleGroup = (ids: string[]): void => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      const allIn = ids.every((id) => next.has(id));
      for (const id of ids) {
        if (allIn) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  };

  const onBaseRowClick = (): void => {
    if (plainQty <= 1) {
      setBaseQty((q) => (q > 0 ? 0 : plainQty));
      return;
    }
    setBaseQtyPopupOpen(true);
  };

  const selectAll = (): void => {
    setBaseQty(plainQty);
    setCheckedIds(new Set(instances.map((i) => i.instanceId)));
  };
  const selectNone = (): void => {
    setBaseQty(0);
    setCheckedIds(new Set());
  };

  return (
    <div className="modal-overlay" onClick={(e) => { e.stopPropagation(); commitAndClose(); }}>
      <div className="modal pouch-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close ds-close-button" onClick={commitAndClose} aria-label={t("common.close")} />
        <div className="pouch-head">
          <span className={`pouch-head-icon ${rarityClass(item?.rarity)}`}>
            {getItemImage(itemId) ? (
              <img src={getItemImage(itemId)!} alt="" className="pixelart" loading="lazy" decoding="async" />
            ) : item?.icon ? (
              <span className="pouch-head-emoji">{item.icon}</span>
            ) : null}
          </span>
          <div className="pouch-head-text">
            <div className="pouch-head-name">{item ? tr(item.name) : itemId}</div>
            <div className="pouch-head-count muted">{t("pouch.variantCount").replace("{n}", String(instances.length))}</div>
          </div>
        </div>

        <div className="mshop-variant-toolbar">
          <button className="mshop-select-all-btn" onClick={allSelected ? selectNone : selectAll}>
            {t(allSelected ? "shop.massSell.selectNone" : "shop.massSell.selectAll")}
          </button>
        </div>

        <div className="pouch-list">
          {plainQty > 0 && (
            <>
              <div className="pouch-section-title">{t("pouch.baseVersion")}</div>
              <div
                className="mshop-variant-row"
                role="checkbox"
                aria-checked={baseQty > 0}
                tabIndex={0}
                onClick={onBaseRowClick}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onBaseRowClick(); } }}
              >
                <input type="checkbox" className="mshop-row-checkbox" readOnly checked={baseQty > 0} tabIndex={-1} />
                <span className="mshop-row-icon">
                  {getItemImage(itemId) ? (
                    <img src={getItemImage(itemId)!} alt="" className="mshop-row-img pixelart" loading="lazy" decoding="async" />
                  ) : item?.icon ? (
                    <span className="mshop-row-emoji">{item.icon}</span>
                  ) : null}
                </span>
                <span className={`mshop-row-name ${rarityClass(item?.rarity)}`}>{item ? tr(item.name) : itemId}</span>
                <span className="mshop-row-qty">{baseQty > 0 ? `${baseQty}/${plainQty}` : `×${plainQty}`}</span>
                <span className="mshop-row-price">{t("shop.gold").replace("{n}", formatNum(unit * (baseQty > 0 ? baseQty : plainQty)))}</span>
              </div>
            </>
          )}

          <div className="pouch-section-title">{t("pouch.variantsHeading")}</div>
          {groups.map((g) => {
            const checked = g.ids.every((id) => checkedIds.has(id));
            const name = instanceDisplayName(g.representative, content, locale);
            const img = getItemImage(itemId);
            return (
              <div
                key={g.key}
                className="mshop-variant-row"
                role="checkbox"
                aria-checked={checked}
                tabIndex={0}
                onClick={() => toggleGroup(g.ids)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleGroup(g.ids); } }}
              >
                <input type="checkbox" className="mshop-row-checkbox" readOnly checked={checked} tabIndex={-1} />
                <span className="mshop-row-icon">
                  {img ? (
                    <img src={img} alt="" className="mshop-row-img pixelart" loading="lazy" decoding="async" />
                  ) : item?.icon ? (
                    <span className="mshop-row-emoji">{item.icon}</span>
                  ) : null}
                </span>
                <span className={`mshop-row-name ${rarityClass(item?.rarity)}`}>{name}</span>
                {g.ids.length > 1 && <span className="mshop-row-qty">×{g.ids.length}</span>}
                <span className="mshop-row-price">{t("shop.gold").replace("{n}", formatNum(unit * g.ids.length))}</span>
              </div>
            );
          })}
        </div>
      </div>

      {baseQtyPopupOpen && (
        <StackQtyPopup
          itemId={itemId}
          max={plainQty}
          initialQty={baseQty > 0 ? baseQty : plainQty}
          showRemove={baseQty > 0}
          onConfirm={(q) => { setBaseQty(q); setBaseQtyPopupOpen(false); }}
          onRemove={() => { setBaseQty(0); setBaseQtyPopupOpen(false); }}
          onClose={() => setBaseQtyPopupOpen(false)}
        />
      )}
    </div>
  );
}

// ─── Ergebnis-Banner ──────────────────────────────────────────────────────────

export function MassSellResultBanner({ count, gold }: { count: number; gold: number }): JSX.Element {
  const { t } = useI18n();
  return (
    <div className="mshop-result-banner">
      <span className="mshop-result-title">{t("shop.massSell.resultTitle")}</span>
      <span className="mshop-result-detail">
        {t("shop.massSell.resultDetail").replace("{n}", String(count)).replace("{gold}", formatNum(gold))}
      </span>
    </div>
  );
}

// ─── Feste Aktions-Leiste ─────────────────────────────────────────────────────

export function MassSellBar({
  count,
  gold,
  onSell,
  onCancel,
}: {
  count: number;
  gold: number;
  onSell: () => void;
  onCancel: () => void;
}): JSX.Element {
  const { t } = useI18n();
  return (
    <div className="mshop-bar">
      <span className="mshop-bar-actions">
        <button className="ds-button ds-button--sm" disabled={count === 0} onClick={onSell}>
          {t("shop.massSell.sellBtn").replace("{n}", String(count)).replace("{gold}", formatNum(gold))}
        </button>
        <button className="ds-button ds-button--sm" onClick={onCancel}>{t("shop.massSell.cancel")}</button>
      </span>
    </div>
  );
}
