import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { content } from "@hearthforge/content";
import type { CrossSaveTransferSelection } from "@hearthforge/engine";
import { instanceDisplayName } from "@hearthforge/shared";
import { useGameControl, useGameState } from "../game/GameContext";
import { useI18n } from "../i18n";
import { getItemImage, rarityClass } from "../items";
import "../styles/mail-transfer.css";

// codex:2026-08-31T22:38:00+02:00 — produktive Umsetzung der vom Chef gewählten Variante 04
// „Zwei Lager": echtes Inventar links, echte Cross-Save-Fracht rechts, maximal acht Positionen.
const MAX_TRANSFER_ENTRIES = 8;

type TransferStage = "compose" | "review" | "sending" | "success";

interface TransferEntry {
  key: string;
  kind: "stack" | "instance";
  itemId: string;
  name: string;
  available: number;
  firstSlotIndex?: number;
  slotSources?: Array<{ slotIndex: number; available: number }>;
  instanceId?: string;
}

function replaceTokens(text: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce(
    (current, [key, value]) => current.replaceAll(`{${key}}`, String(value)),
    text,
  );
}

function TransferItemArt({ entry }: { entry: TransferEntry }): JSX.Element {
  const image = getItemImage(entry.itemId);
  const item = content.items[entry.itemId];
  return (
    <span className={`cst-item-art ${rarityClass(item?.rarity)}`} aria-hidden="true">
      {image ? <img src={image} alt="" loading="lazy" decoding="async" /> : <span>◆</span>}
    </span>
  );
}

export function CrossSaveTransferModal({ onClose }: { onClose: () => void }): JSX.Element {
  const state = useGameState();
  const { slots, activeSlotId, sendItemsToSlot } = useGameControl();
  const { locale, t, tr } = useI18n();
  const targets = useMemo(
    () => slots.filter((slot) => slot.id !== activeSlotId && slot.summary !== null),
    [activeSlotId, slots],
  );
  const [targetSlotId, setTargetSlotId] = useState<number | null>(targets[0]?.id ?? null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Map<string, number>>(() => new Map());
  const [stage, setStage] = useState<TransferStage>("compose");
  const [error, setError] = useState<string | null>(null);
  const [successSummary, setSuccessSummary] = useState<{ units: number; targetName: string } | null>(null);

  const entries = useMemo<TransferEntry[]>(() => {
    // codex:2026-08-31T23:58:00+02:00 — Das Transferlager zeigt fungible Plain-Items nach
    // Item-ID zusammengefasst. Physische Teilstapel (z. B. aus alten Saves oder manueller
    // Slot-Anordnung) sind kein eigenes Paketobjekt; echte Item-Instanzen bleiben einzeln.
    const stackEntries: TransferEntry[] = [];
    const stackEntriesByItemId = new Map<string, TransferEntry>();
    state.inventory.slots.forEach((slot, slotIndex) => {
      if (!slot || slot.instance || !content.items[slot.itemId]) return;
      const existing = stackEntriesByItemId.get(slot.itemId);
      if (existing) {
        existing.available += slot.qty;
        existing.slotSources!.push({ slotIndex, available: slot.qty });
        return;
      }
      const entry: TransferEntry = {
        key: `stack:${slot.itemId}`,
        kind: "stack",
        itemId: slot.itemId,
        name: tr(content.items[slot.itemId]!.name),
        available: slot.qty,
        firstSlotIndex: slotIndex,
        slotSources: [{ slotIndex, available: slot.qty }],
      };
      stackEntriesByItemId.set(slot.itemId, entry);
      stackEntries.push(entry);
    });
    const instanceEntries = state.inventory.instances.flatMap((instance) => {
      if (!content.items[instance.baseItemId]) return [];
      return [{
        key: `instance:${instance.instanceId}`,
        kind: "instance" as const,
        itemId: instance.baseItemId,
        name: instanceDisplayName(instance, content, locale),
        available: 1,
        instanceId: instance.instanceId,
      }];
    });
    return [...stackEntries, ...instanceEntries];
  }, [locale, state.inventory.instances, state.inventory.slots, tr]);

  const entriesByKey = useMemo(() => new Map(entries.map((entry) => [entry.key, entry])), [entries]);
  const stackEntriesByDisplaySlot = useMemo(() => new Map(
    entries.flatMap((entry) => entry.kind === "stack" && entry.firstSlotIndex !== undefined
      ? [[entry.firstSlotIndex, entry] as const]
      : []),
  ), [entries]);
  const packageEntries = useMemo(
    () => [...selected.entries()].flatMap(([key, qty]) => {
      const entry = entriesByKey.get(key);
      return entry ? [{ entry, qty: Math.min(Math.max(1, qty), entry.available) }] : [];
    }),
    [entriesByKey, selected],
  );
  const normalizedQuery = query.trim().toLocaleLowerCase(locale);
  const visibleEntryKeys = useMemo(
    () => new Set(entries.filter((entry) => (
      normalizedQuery.length === 0
      || entry.name.toLocaleLowerCase(locale).includes(normalizedQuery)
      || entry.itemId.toLocaleLowerCase(locale).includes(normalizedQuery)
    )).map((entry) => entry.key)),
    [entries, locale, normalizedQuery],
  );
  const selectedTarget = targets.find((slot) => slot.id === targetSlotId) ?? null;
  const unitCount = packageEntries.reduce((sum, selection) => sum + selection.qty, 0);

  useEffect(() => {
    if (targetSlotId !== null && targets.some((slot) => slot.id === targetSlotId)) return;
    setTargetSlotId(targets[0]?.id ?? null);
  }, [targetSlotId, targets]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape" && stage !== "sending") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, stage]);

  const toggleEntry = (entry: TransferEntry): void => {
    setError(null);
    setSelected((previous) => {
      const next = new Map(previous);
      if (next.has(entry.key)) next.delete(entry.key);
      else if (next.size < MAX_TRANSFER_ENTRIES) next.set(entry.key, entry.available);
      else setError(t("mail.transfer.maxReached"));
      return next;
    });
  };

  const setEntryQty = (entry: TransferEntry, qty: number): void => {
    setSelected((previous) => {
      const next = new Map(previous);
      next.set(entry.key, Math.min(entry.available, Math.max(1, Math.floor(qty || 1))));
      return next;
    });
  };

  const submitTransfer = async (): Promise<void> => {
    if (targetSlotId === null || !selectedTarget || packageEntries.length === 0) return;
    setError(null);
    setStage("sending");
    // codex:2026-08-31T23:58:00+02:00 — Eine sichtbare Plain-Item-Zeile kann aus mehreren
    // physischen Teilstapeln stammen. Die gewünschte Menge wird deterministisch ab dem ersten
    // Quellslot verteilt; die Engine validiert weiterhin jeden betroffenen Slot vor Mutation.
    const selection: CrossSaveTransferSelection = {
      slots: packageEntries.flatMap(({ entry, qty }) => {
        if (entry.kind !== "stack") return [];
        let remaining = qty;
        return (entry.slotSources ?? []).flatMap((source) => {
          if (remaining <= 0) return [];
          const taken = Math.min(source.available, remaining);
          remaining -= taken;
          return [{ slotIndex: source.slotIndex, itemId: entry.itemId, qty: taken }];
        });
      }),
      instanceIds: packageEntries.flatMap(({ entry }) => entry.kind === "instance" && entry.instanceId
        ? [entry.instanceId]
        : []),
    };
    const result = await sendItemsToSlot(targetSlotId, selection);
    if (result.ok) {
      // codex:2026-08-31T22:52:00+02:00 — nach erfolgreichem Commit verschwinden die gewählten
      // Einträge sofort aus dem Live-Inventar; deshalb Ergebnisdaten vor dem Re-Render festhalten.
      setSuccessSummary({ units: result.units, targetName: selectedTarget.summary?.name ?? "" });
      setStage("success");
      return;
    }
    setStage("compose");
    setError(t(`mail.transfer.error.${result.reason}`));
  };

  const modal = (
    <div className="cst-overlay" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && stage !== "sending") onClose();
    }}>
      <section className="cst-modal" role="dialog" aria-modal="true" aria-labelledby="cst-title">
        <header className="cst-head">
          <div>
            <span className="cst-kicker">{t("mail.transfer.kicker")}</span>
            <h2 id="cst-title">{t("mail.transfer.title")}</h2>
          </div>
          <button type="button" className="cst-close" onClick={onClose} disabled={stage === "sending"} aria-label={t("common.close")}>×</button>
        </header>

        {targets.length === 0 ? (
          <div className="cst-state-card">
            <span className="cst-state-rune" aria-hidden="true">◇</span>
            <h3>{t("mail.transfer.noTargetsTitle")}</h3>
            <p>{t("mail.transfer.noTargets")}</p>
            <button type="button" className="shop-citadel-btn" onClick={onClose}>{t("common.close")}</button>
          </div>
        ) : stage === "success" ? (
          <div className="cst-state-card cst-state-card--success">
            <span className="cst-state-rune" aria-hidden="true">✓</span>
            <h3>{t("mail.transfer.successTitle")}</h3>
            <p>{replaceTokens(t("mail.transfer.successBody"), {
              units: successSummary?.units ?? 0,
              name: successSummary?.targetName ?? selectedTarget?.summary?.name ?? "",
            })}</p>
            <button type="button" className="shop-citadel-btn" onClick={onClose}>{t("common.close")}</button>
          </div>
        ) : (
          <>
            <div className="cst-route" aria-label={t("mail.transfer.route") }>
              <div className="cst-save-card">
                <span>{t("mail.transfer.source")}</span>
                <strong>{state.character.name}</strong>
              </div>
              <span className="cst-route-arrow" aria-hidden="true">➜</span>
              <label className="cst-target-card">
                <span>{t("mail.transfer.target")}</span>
                <select value={targetSlotId ?? ""} onChange={(event) => setTargetSlotId(Number(event.target.value))} disabled={stage === "sending"}>
                  {targets.map((slot) => (
                    <option key={slot.id} value={slot.id}>
                      {replaceTokens(t("mail.transfer.targetOption"), {
                        name: slot.summary!.name,
                        level: slot.summary!.totalLevel,
                      })}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="cst-ledgers">
              <section className="cst-ledger cst-ledger--inventory">
                <div className="cst-ledger-head">
                  <div>
                    <span>{t("mail.transfer.source")}</span>
                    <h3>{t("mail.transfer.inventory")}</h3>
                  </div>
                  <strong>{replaceTokens(t("mail.transfer.inventoryCount"), {
                    used: entries.length,
                    total: state.inventory.slots.length,
                  })}</strong>
                </div>
                <label className="cst-search">
                  <span aria-hidden="true">⌕</span>
                  <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("mail.transfer.search")} />
                </label>
                <div className="cst-inventory-scroll">
                  <div className="cst-inventory-grid">
                    {state.inventory.slots.map((slot, slotIndex) => {
                      const entry = stackEntriesByDisplaySlot.get(slotIndex);
                      if (!entry || !visibleEntryKeys.has(entry.key)) {
                        return normalizedQuery.length === 0
                          ? <span key={`empty:${slotIndex}`} className="cst-inventory-slot cst-inventory-slot--empty" aria-hidden="true" />
                          : null;
                      }
                      const isSelected = selected.has(entry.key);
                      return (
                        <button
                          type="button"
                          key={entry.key}
                          className={`cst-inventory-slot${isSelected ? " is-selected" : ""}`}
                          onClick={() => toggleEntry(entry)}
                          title={entry.name}
                          aria-pressed={isSelected}
                        >
                          <TransferItemArt entry={entry} />
                          <span className="cst-slot-qty">{entry.available.toLocaleString()}</span>
                          {isSelected && <span className="cst-slot-check" aria-hidden="true">✓</span>}
                        </button>
                      );
                    })}
                    {entries.filter((entry) => entry.kind === "instance" && visibleEntryKeys.has(entry.key)).map((entry) => {
                      const isSelected = selected.has(entry.key);
                      return (
                        <button
                          type="button"
                          key={entry.key}
                          className={`cst-inventory-slot cst-inventory-slot--instance${isSelected ? " is-selected" : ""}`}
                          onClick={() => toggleEntry(entry)}
                          title={entry.name}
                          aria-pressed={isSelected}
                        >
                          <TransferItemArt entry={entry} />
                          <span className="cst-slot-mark" aria-hidden="true">✦</span>
                          {isSelected && <span className="cst-slot-check" aria-hidden="true">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </section>

              <section className="cst-ledger cst-ledger--package">
                <div className="cst-ledger-head">
                  <div>
                    <span>{t("mail.transfer.target")}</span>
                    <h3>{t("mail.transfer.package")}</h3>
                  </div>
                  <strong>{replaceTokens(t("mail.transfer.packageCount"), {
                    n: packageEntries.length,
                    max: MAX_TRANSFER_ENTRIES,
                  })}</strong>
                </div>
                <div className="cst-package-scroll">
                  {packageEntries.length === 0 ? (
                    <div className="cst-package-empty">
                      <span aria-hidden="true">⇥</span>
                      <p>{t("mail.transfer.emptyPackage")}</p>
                    </div>
                  ) : (
                    <div className="cst-package-list">
                      {packageEntries.map(({ entry, qty }) => (
                        <article key={entry.key} className="cst-package-row">
                          <TransferItemArt entry={entry} />
                          <div className="cst-package-copy">
                            <strong>{entry.name}</strong>
                            <span>{entry.kind === "instance" ? t("mail.transfer.uniqueItem") : entry.itemId}</span>
                          </div>
                          {entry.kind === "stack" ? (
                            <label className="cst-qty-field">
                              <span>{t("mail.transfer.quantity")}</span>
                              <input
                                type="number"
                                min={1}
                                max={entry.available}
                                value={qty}
                                onChange={(event) => setEntryQty(entry, Number(event.target.value))}
                              />
                            </label>
                          ) : <span className="cst-qty-one">×1</span>}
                          <button type="button" className="cst-remove" onClick={() => toggleEntry(entry)} aria-label={t("mail.transfer.remove")}>×</button>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
                <div className="cst-manifest">
                  <span>{t("mail.transfer.manifest")}</span>
                  <strong>{replaceTokens(t("mail.transfer.summary"), {
                    stacks: packageEntries.length,
                    units: unitCount,
                  })}</strong>
                </div>
              </section>
            </div>

            {error && <div className="cst-error" role="alert">{error}</div>}

            {stage === "review" ? (
              <div className="cst-review" role="alertdialog" aria-labelledby="cst-review-title">
                <div className="cst-review-card">
                  <span>{t("mail.transfer.confirmKicker")}</span>
                  <h3 id="cst-review-title">{t("mail.transfer.confirmTitle")}</h3>
                  <p>{replaceTokens(t("mail.transfer.confirmBody"), {
                    stacks: packageEntries.length,
                    units: unitCount,
                    name: selectedTarget?.summary?.name ?? "",
                  })}</p>
                  <div className="cst-review-actions">
                    <button type="button" className="shop-citadel-btn shop-citadel-btn--alt" onClick={() => setStage("compose")}>{t("mail.transfer.cancel")}</button>
                    <button type="button" className="shop-citadel-btn" onClick={() => void submitTransfer()}>{t("mail.transfer.confirm")}</button>
                  </div>
                </div>
              </div>
            ) : null}

            <footer className="cst-footer">
              <p>{t("mail.transfer.deliveryNote")}</p>
              <div>
                <button type="button" className="shop-citadel-btn shop-citadel-btn--alt" onClick={onClose} disabled={stage === "sending"}>{t("mail.transfer.cancel")}</button>
                <button
                  type="button"
                  className="shop-citadel-btn"
                  disabled={packageEntries.length === 0 || targetSlotId === null || stage === "sending"}
                  onClick={() => setStage("review")}
                >
                  {stage === "sending" ? t("mail.transfer.sending") : t("mail.transfer.review")}
                </button>
              </div>
            </footer>
          </>
        )}
      </section>
    </div>
  );

  return createPortal(modal, document.body);
}
