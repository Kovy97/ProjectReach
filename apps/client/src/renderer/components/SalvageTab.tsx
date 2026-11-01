// claude:2026-10-31T11:30:30+01:00 — Reiter „Zerlegen“ im Laden (Chef 31.10.2026, Diablo-3-Schmied): Schnell-Zerlegen je Rarität oben,
// darunter Massen-Zerlegen mit Inventar UND Bank nebeneinander, feste Auswahlleiste unten, Ausbeute-Panel nach jedem Zerlegen.
// Alles läuft über die Engine-Sammelverben (salvageCandidates / salvageRarityPlan / salvagePreview / salvagePicks); Auswahl und
// Ergebnis sind reiner Sitzungszustand, nichts davon landet im Save. Die Bestätigungen sind Portale (SalvageModals.tsx).
import { useMemo, useState } from "react";
import { content } from "@hearthforge/content";
import {
  equipmentSellKind,
  salvageCandidates,
  salvagePicks,
  salvagePreview,
  salvageRarityPlan,
  toggleSalvageLock,
} from "@hearthforge/engine";
import type { EquipmentSellFilter, SalvageCandidate, SalvageOutcome, SalvagePick, SalvageSource } from "@hearthforge/engine";
import type { ItemInstance, ItemRarity } from "@hearthforge/shared";
import { ITEM_RARITIES, RARITY_LABEL } from "@hearthforge/shared";
import { useGameState } from "../game/GameContext";
import { useI18n } from "../i18n";
import { effectiveFxLevel } from "../util/fxLevel";
import { ItemCell } from "./ItemCell";
import { SalvageBulkConfirm, SalvageQtyPopup, SalvageSummaryCells, isHighSalvageRarity } from "./SalvageModals";
import "../styles/mass-sell.css";
import "../styles/salvage-tab.css";

type SourceChoice = SalvageSource | "both";
const SOURCE_CHOICES: SourceChoice[] = ["inventory", "bank", "both"];
const KIND_CHOICES: EquipmentSellFilter[] = ["all", "weapons", "armor", "jewelry"];

const keyOf = (c: { source: SalvageSource; itemId: string; instanceId: string | null }): string => `${c.source}:${c.instanceId ?? c.itemId}`;
const rankOf = (r: ItemRarity): number => ITEM_RARITIES.indexOf(r);

interface ConfirmState {
  picks: SalvagePick[];
  highCount: number;
  runeCount: number;
  /** true = Auswahl aus dem Raster (wird nach dem Zerlegen geleert). */
  fromSelection: boolean;
}

function LockIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
      <path d="M4.5 7V5a3.5 3.5 0 0 1 7 0v2h.5A1.5 1.5 0 0 1 13.5 8.5v5A1.5 1.5 0 0 1 12 15H4a1.5 1.5 0 0 1-1.5-1.5v-5A1.5 1.5 0 0 1 4 7zm1.5 0h4V5a2 2 0 0 0-4 0z" fill="currentColor" />
    </svg>
  );
}

/** Eine Zelle des Auswahl-Rasters: Haken-Overlay, Mengenzahl als Knopf, Schloss-Knopf (auch Rechtsklick). */
function SalvageCell({
  cand,
  instance,
  selectedQty,
  onClick,
  onEditQty,
  onToggleLock,
}: {
  cand: SalvageCandidate;
  instance: ItemInstance | undefined;
  selectedQty: number | undefined;
  onClick: (e: React.MouseEvent) => void;
  onEditQty: () => void;
  onToggleLock: () => void;
}): JSX.Element {
  const { t } = useI18n();
  const selected = selectedQty !== undefined && !cand.locked;
  const badge = cand.qty > 1 ? (selected ? `${selectedQty}/${cand.qty}` : String(cand.qty)) : null;
  return (
    <div
      className={`salv-cell${cand.locked ? " locked" : ""}${selected ? " sel" : ""}`}
      onContextMenu={(e) => {
        e.preventDefault();
        onToggleLock();
      }}
    >
      <ItemCell
        itemId={cand.itemId}
        instance={instance}
        className="inv-slot filled"
        keepHoverTip
        selected={selected}
        onCellClick={cand.locked ? () => undefined : onClick}
        overlay={
          <>
            {!cand.locked && (
              <span className={`mshop-checkbox${selected ? " checked" : ""}`} aria-hidden="true">
                {selected ? "✓" : ""}
              </span>
            )}
            {badge &&
              (cand.locked ? (
                <span className="mshop-sel-badge">{badge}</span>
              ) : (
                <button
                  type="button"
                  className="mshop-sel-badge salv-qty-btn"
                  title={t("salvage.tab.qtyEditTitle")}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditQty();
                  }}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  {badge}
                </button>
              ))}
          </>
        }
      />
      <button
        type="button"
        className={`salv-lock${cand.locked ? " on" : ""}`}
        title={cand.locked ? t("salvage.tab.unlockTitle") : t("salvage.tab.lockTitle")}
        aria-label={cand.locked ? t("salvage.tab.unlockTitle") : t("salvage.tab.lockTitle")}
        aria-pressed={cand.locked}
        onClick={onToggleLock}
      >
        <LockIcon />
      </button>
    </div>
  );
}

export function SalvageTab(): JSX.Element {
  const state = useGameState();
  const { t, tr } = useI18n();
  const [src, setSrc] = useState<SourceChoice>("both");
  const [kind, setKind] = useState<EquipmentSellFilter>("all");
  const [sel, setSel] = useState<Map<string, number>>(new Map());
  const [bump, setBump] = useState(0); // Schloss/Zerlegen ändern den Spielstand an Ort und Stelle: sofort neu zeichnen
  const [keepSuffix, setKeepSuffix] = useState(true); // claude:2026-10-31T15:05:00+01:00
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [qtyFor, setQtyFor] = useState<SalvageCandidate | null>(null);
  const [result, setResult] = useState<SalvageOutcome | null>(null);
  const [lastClick, setLastClick] = useState<{ source: SalvageSource; index: number } | null>(null);

  const lists = useMemo(() => {
    const pick = (source: SalvageSource): SalvageCandidate[] =>
      salvageCandidates(state, content, source)
        .filter((c) => kind === "all" || equipmentSellKind(content.items[c.itemId]) === kind)
        .map((c, i) => ({ c, i }))
        .sort((a, b) => rankOf(a.c.rarity) - rankOf(b.c.rarity) || a.i - b.i)
        .map((e) => e.c);
    return { inventory: pick("inventory"), bank: pick("bank") };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, state.totalTicks, bump, kind]);

  const instanceById = useMemo(() => {
    const m = new Map<string, ItemInstance>();
    for (const i of state.inventory.instances) m.set(i.instanceId, i);
    for (const i of state.bankInstances) m.set(i.instanceId, i);
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, state.totalTicks, bump]);

  const sources: SalvageSource[] = src === "both" ? ["inventory", "bank"] : [src];
  // claude:2026-10-31T15:05:00+01:00 — Fixwelle: Pläne aller Seltenheiten EINMAL pro Render-Eingabe berechnen (vorher ~16 Aufrufe: je Seltenheit zweimal),
  // dazu der Schalter „Teile mit Suffix behalten“ (Standard an, reiner Sitzungszustand, geht als keepSuffix an die Engine).
  const { quick, protectedTotal } = useMemo(() => {
    const plans = ITEM_RARITIES.map((rarity) => ({ rarity, plan: salvageRarityPlan(state, content, { sources, rarity, kind, keepSuffix }) }));
    return {
      quick: plans.filter((e) => e.plan.pieces > 0),
      protectedTotal: plans.reduce((a, e) => a + e.plan.protectedCount, 0),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, state.totalTicks, bump, src, kind, keepSuffix]);

  // Auswahl gegen den aktuellen Bestand abgleichen: Verschwundenes und neu Gesperrtes zählt nie mit.
  const byKey = new Map<string, SalvageCandidate>();
  for (const c of [...lists.inventory, ...lists.bank]) byKey.set(keyOf(c), c);
  const picks: SalvagePick[] = [];
  let highCount = 0;
  let runeCount = 0;
  for (const [k, q] of sel) {
    const c = byKey.get(k);
    if (!c || c.locked) continue;
    const qty = Math.min(q, c.qty);
    if (qty <= 0) continue;
    picks.push({ source: c.source, itemId: c.itemId, instanceId: c.instanceId, qty });
    if (isHighSalvageRarity(c.rarity)) highCount += qty;
    if (c.hasRunes) runeCount += 1;
  }
  const preview = salvagePreview(content, picks);

  const toggleLock = (c: SalvageCandidate): void => {
    // claude:2026-10-31T15:05:00+01:00 — E12: Sperren hebt die Markierung auf, damit Entsperren nicht still neu markiert.
    if (!c.locked) setSel((prev) => {
      if (!prev.has(keyOf(c))) return prev;
      const next = new Map(prev);
      next.delete(keyOf(c));
      return next;
    });
    toggleSalvageLock(state, c.instanceId ?? c.itemId);
    setBump((n) => n + 1);
  };

  const setOne = (c: SalvageCandidate, qty: number | null): void =>
    setSel((prev) => {
      const next = new Map(prev);
      if (qty === null || qty <= 0) next.delete(keyOf(c));
      else next.set(keyOf(c), qty);
      return next;
    });

  const onCellClick = (c: SalvageCandidate, index: number, e: React.MouseEvent): void => {
    if (c.locked) return;
    const list = lists[c.source];
    if (e.shiftKey && lastClick && lastClick.source === c.source) {
      const from = Math.min(lastClick.index, index);
      const to = Math.max(lastClick.index, index);
      setSel((prev) => {
        const next = new Map(prev);
        for (let i = from; i <= to; i++) {
          const x = list[i];
          if (x && !x.locked) next.set(keyOf(x), x.qty);
        }
        return next;
      });
    } else setOne(c, sel.has(keyOf(c)) ? null : c.qty);
    setLastClick({ source: c.source, index });
  };

  const paneAllSelected = (list: SalvageCandidate[]): boolean => {
    const open = list.filter((c) => !c.locked);
    return open.length > 0 && open.every((c) => sel.has(keyOf(c)));
  };
  const togglePane = (list: SalvageCandidate[]): void => {
    const all = paneAllSelected(list);
    setSel((prev) => {
      const next = new Map(prev);
      for (const c of list) {
        if (c.locked) continue;
        if (all) next.delete(keyOf(c));
        else next.set(keyOf(c), c.qty);
      }
      return next;
    });
  };

  const run = (): void => {
    if (!confirm) return;
    const out = salvagePicks(state, content, confirm.picks);
    setResult(out);
    if (confirm.fromSelection) setSel(new Map());
    setConfirm(null);
    setBump((n) => n + 1);
  };

  const fx = effectiveFxLevel();
  const paneTitle = (s: SalvageSource): string => t(s === "inventory" ? "salvage.tab.paneInventory" : "salvage.tab.paneBank");

  return (
    <div className="shopv2-pane">
      <div className="salv-tab" data-fx={fx}>
        <section className="salv-quick" aria-label={t("salvage.tab.quickTitle")}>
          <div className="salv-quick-head">
            <h3 className="salv-quick-title">{t("salvage.tab.quickTitle")}</h3>
            <div className="salv-seg-group">
              <div className="salv-seg" role="radiogroup" aria-label={t("salvage.tab.source")}>
                <span className="salv-seg-label muted">{t("salvage.tab.source")}</span>
                {SOURCE_CHOICES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    role="radio"
                    aria-checked={src === s}
                    className={`salvage-rarity-btn salv-seg-btn${src === s ? " active" : ""}`}
                    onClick={() => setSrc(s)}
                  >
                    {t(`salvage.tab.src.${s}`)}
                  </button>
                ))}
              </div>
              <div className="salv-seg" role="radiogroup" aria-label={t("salvage.tab.kind")}>
                <span className="salv-seg-label muted">{t("salvage.tab.kind")}</span>
                {KIND_CHOICES.map((k) => (
                  <button
                    key={k}
                    type="button"
                    role="radio"
                    aria-checked={kind === k}
                    className={`salvage-rarity-btn salv-seg-btn${kind === k ? " active" : ""}`}
                    onClick={() => setKind(k)}
                  >
                    {t(`salvage.tab.kind.${k}`)}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="salv-rarities">
            {quick.length === 0 ? (
              <p className="muted salv-none">{t("salvage.tab.quickNone")}</p>
            ) : (
              quick.map(({ rarity, plan }) => (
                <button
                  key={rarity}
                  type="button"
                  className="shop-citadel-btn salv-rar-btn"
                  style={{ ["--salv-rar" as string]: `var(--rar-${rarity})` }}
                  onClick={() =>
                    setConfirm({
                      picks: plan.picks,
                      highCount: isHighSalvageRarity(rarity) ? plan.pieces : 0,
                      runeCount: 0,
                      fromSelection: false,
                    })
                  }
                >
                  <span className="salv-rar-name">{tr(RARITY_LABEL[rarity])}</span>
                  <span className="salv-rar-act">{t("salvage.tab.rarityAct").replace("{n}", String(plan.pieces))}</span>
                </button>
              ))
            )}
          </div>
          <label className="salv-keep">
            <input type="checkbox" checked={keepSuffix} onChange={(e) => setKeepSuffix(e.target.checked)} />
            <span>{t("salvage.tab.keepSuffix")}</span>
          </label>
          <p className="salv-lead muted">
            {protectedTotal > 0 && <strong className="salv-protected">{t("salvage.tab.protected").replace("{n}", String(protectedTotal))}</strong>}
            {t("salvage.tab.quickLead")}
          </p>
        </section>

        <div className="salv-panes">
          {(["inventory", "bank"] as SalvageSource[]).map((source) => {
            const list = lists[source];
            const open = list.filter((c) => !c.locked).length;
            return (
              <section key={source} className="salv-pane">
                <header className="salv-pane-head">
                  <h3 className="salv-pane-title">{paneTitle(source)}</h3>
                  <span className="salv-pane-count muted">{t("salvage.tab.paneCount").replace("{n}", String(open))}</span>
                  <button type="button" className="mshop-select-all-btn" disabled={open === 0} onClick={() => togglePane(list)}>
                    {t(paneAllSelected(list) ? "salvage.tab.selectNone" : "salvage.tab.selectAll")}
                  </button>
                </header>
                {list.length === 0 ? (
                  <p className="muted salv-empty">{t("salvage.tab.paneEmpty")}</p>
                ) : (
                  <div className="salv-grid cs-inv-grid">
                    {list.map((c, i) => (
                      <SalvageCell
                        key={keyOf(c)}
                        cand={c}
                        instance={c.instanceId ? instanceById.get(c.instanceId) : undefined}
                        selectedQty={sel.get(keyOf(c))}
                        onClick={(e) => onCellClick(c, i, e)}
                        onEditQty={() => setQtyFor(c)}
                        onToggleLock={() => toggleLock(c)}
                      />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>

        <div className="salv-foot">
        {result && (
          <div className="salv-result" role="status">
            <button type="button" className="modal-close ds-close-button salv-result-close" onClick={() => setResult(null)} aria-label={t("common.close")} />
            <h3 className="salv-result-title">{t("salvage.tab.resultTitle")}</h3>
            {result.pieces === 0 ? (
              <p className="muted">{t("salvage.tab.resultNone")}</p>
            ) : (
              <>
                <p className="salv-result-pieces">{t("salvage.tab.resultPieces").replace("{n}", String(result.pieces))}</p>
                <div className="salv-result-cells">
                  <SalvageSummaryCells items={result.items} dust={result.dust} />
                </div>
                {result.toStorage > 0 && <p className="salv-result-note salv-result-note--info">{t("salvage.tab.resultStorage").replace("{n}", String(result.toStorage))}</p>}
                {result.toBank > 0 && <p className="salv-result-note">{t("salvage.tab.resultBank").replace("{n}", String(result.toBank))}</p>}
                {result.toMail > 0 && <p className="salv-result-note">{t("salvage.tab.resultMail").replace("{n}", String(result.toMail))}</p>}
              </>
            )}
          </div>
        )}

        <div className="salv-bar">
          <div className="salv-bar-info">
            <strong className="salv-bar-count">
              {picks.length === 0 ? t("salvage.tab.selectedNone") : t("salvage.tab.selected").replace("{n}", String(preview.pieces))}
            </strong>
            {picks.length > 0 && <SalvageSummaryCells items={preview.items} dust={preview.dust} />}
          </div>
          <div className="salv-bar-actions">
            <button type="button" className="shop-citadel-btn" disabled={picks.length === 0} onClick={() => setSel(new Map())}>
              {t("salvage.tab.clear")}
            </button>
            <button
              type="button"
              className="btn-iron"
              disabled={picks.length === 0}
              onClick={() => setConfirm({ picks, highCount, runeCount, fromSelection: true })}
            >
              {t("salvage.batchConfirm").replace("{n}", String(preview.pieces))}
            </button>
          </div>
          <p className="salv-hint muted" title={t("salvage.tab.hint")}>{t("salvage.tab.hint")}</p>
        </div>
        </div>
      </div>

      {confirm && (
        <SalvageBulkConfirm
          picks={confirm.picks}
          highCount={confirm.highCount}
          runeCount={confirm.runeCount}
          onConfirm={run}
          onClose={() => setConfirm(null)}
        />
      )}
      {qtyFor && (
        <SalvageQtyPopup
          itemId={qtyFor.itemId}
          max={qtyFor.qty}
          initialQty={sel.get(keyOf(qtyFor)) ?? qtyFor.qty}
          showRemove={sel.has(keyOf(qtyFor))}
          onConfirm={(q) => {
            setOne(qtyFor, q);
            setQtyFor(null);
          }}
          onRemove={() => {
            setOne(qtyFor, null);
            setQtyFor(null);
          }}
          onClose={() => setQtyFor(null)}
        />
      )}
    </div>
  );
}
