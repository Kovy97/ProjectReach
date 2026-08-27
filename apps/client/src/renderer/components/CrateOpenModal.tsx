import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { content } from "@hearthforge/content";
import { bankCount, itemCount } from "@hearthforge/engine";
import { useGameState } from "../game/GameContext";
import { useI18n } from "../i18n";
import { registerEscCloser } from "../util/escStack";
import { getItemImage, rarityClass } from "../items";
import { openBlackMarketCrate, tavernCrateItemId } from "../tavernApi";
import "../styles/tavern.css";

/**
 * Behälter-Dialog (Spec §6/§7): Sack des Fremden UND ein Klick auf ein Behälter-Item im Inventar
 * teilen sich dieses Modal. `initialItemId` (optional) wählt den Tier vor, wenn der Aufruf von
 * einem konkreten Item-Klick kommt — der Sack selbst öffnet ohne Vorwahl (erster besessener Tier).
 * Zwei Schritte: (1) Tier + Menge wählen, „Öffnen"; (2) Zeremonie — Inhalt als Item-Karten.
 */
export function CrateOpenModal({
  initialItemId,
  onClose,
  onDirty,
}: {
  initialItemId?: string | null;
  onClose: () => void;
  onDirty: () => void;
}): JSX.Element | null {
  const state = useGameState();
  const { t, tr } = useI18n();
  useEffect(() => registerEscCloser("modal", onClose), [onClose]);

  const tiers = [1, 2, 3, 4, 5]
    .map((band) => {
      const itemId = tavernCrateItemId(band);
      const owned = itemCount(state.inventory, itemId) + bankCount(state, itemId);
      return { band, itemId, owned };
    })
    .filter((tParam) => tParam.owned > 0 || tParam.itemId === initialItemId);

  const [selectedTier, setSelectedTier] = useState<number>(() => {
    const preselected = initialItemId ? tiers.find((tt) => tt.itemId === initialItemId) : undefined;
    return preselected?.band ?? tiers[0]?.band ?? 1;
  });
  const [qty, setQty] = useState(1);
  const [results, setResults] = useState<{ id: string; qty: number }[] | null>(null);

  const active = tiers.find((tt) => tt.band === selectedTier) ?? null;
  const maxQty = Math.max(1, active?.owned ?? 1);

  const doOpen = (): void => {
    if (!active || active.owned <= 0) return;
    const aggregate = new Map<string, number>();
    let opened = 0;
    for (let i = 0; i < qty; i++) {
      const result = openBlackMarketCrate(state, content, active.itemId);
      if (!result) break;
      opened++;
      for (const it of result.items) aggregate.set(it.id, (aggregate.get(it.id) ?? 0) + it.qty);
    }
    if (opened > 0) {
      onDirty();
      setResults([...aggregate.entries()].map(([id, q]) => ({ id, qty: q })));
    }
  };

  if (tiers.length === 0 && !results) {
    return createPortal(
      <div className="modal-overlay tvn-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
        <div className="modal tvn-crate-modal" onClick={(e) => e.stopPropagation()}>
          <button className="modal-close ds-close-button" onClick={onClose} aria-label={t("common.close")} />
          <div className="tvn-crate-title">{t("tavern.crate.title")}</div>
          <p className="tvn-crate-empty muted">{t("tavern.crate.none")}</p>
        </div>
      </div>,
      document.body,
    );
  }

  return createPortal(
    <div className="modal-overlay tvn-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal tvn-crate-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close ds-close-button" onClick={onClose} aria-label={t("common.close")} />
        <div className="tvn-crate-title">{t("tavern.crate.title")}</div>

        {results ? (
          <div className="tvn-crate-reveal">
            <div className="tvn-crate-reveal-head">{t("tavern.crate.resultTitle")}</div>
            <div className="tvn-crate-reveal-grid">
              {results.length === 0 && <p className="muted">{t("tavern.crate.empty")}</p>}
              {results.map((it) => {
                const def = content.items[it.id];
                const img = getItemImage(it.id);
                return (
                  <div key={it.id} className={`tvn-crate-card ${rarityClass(def?.rarity)}`}>
                    <span className="tvn-crate-card-icon">
                      {img ? (
                        <img src={img} alt="" className="pixelart" loading="lazy" decoding="async" />
                      ) : (
                        <span aria-hidden="true">{def?.icon ?? "▪"}</span>
                      )}
                    </span>
                    <span className="tvn-crate-card-name">{def ? tr(def.name) : it.id}</span>
                    <span className="tvn-crate-card-qty">×{it.qty}</span>
                  </div>
                );
              })}
            </div>
            <button type="button" className="btn-iron" onClick={onClose}>
              {t("common.close")}
            </button>
          </div>
        ) : (
          <>
            <div className="tvn-crate-tiers">
              {tiers.map((tt) => {
                const item = content.items[tt.itemId];
                const img = getItemImage(tt.itemId);
                return (
                  <button
                    key={tt.itemId}
                    type="button"
                    className={`tvn-crate-tier${tt.band === selectedTier ? " is-active" : ""}`}
                    disabled={tt.owned <= 0}
                    onClick={() => {
                      setSelectedTier(tt.band);
                      setQty(1);
                    }}
                  >
                    {img ? (
                      <img src={img} alt="" className="tvn-crate-tier-img pixelart" />
                    ) : (
                      <span className="tvn-crate-tier-emoji" aria-hidden="true">🎁</span>
                    )}
                    <span className="tvn-crate-tier-name">{item ? tr(item.name) : tt.itemId}</span>
                    <span className="tvn-crate-tier-owned muted">×{tt.owned}</span>
                  </button>
                );
              })}
            </div>

            <div className="tvn-crate-qty-row">
              <span className="muted">{t("tavern.crate.qty")}</span>
              <input
                type="number"
                min={1}
                max={maxQty}
                value={Math.min(qty, maxQty)}
                onChange={(e) => setQty(Math.max(1, Math.min(maxQty, Number(e.target.value) || 1)))}
                className="tvn-crate-qty-input"
              />
            </div>

            <button type="button" className="btn-iron" disabled={!active || active.owned <= 0} onClick={doOpen}>
              {t("tavern.crate.open")}
            </button>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
