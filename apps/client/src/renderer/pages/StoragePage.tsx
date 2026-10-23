// claude:2026-10-23T21:00:00+02:00 — Materiallager (1.4.0 „Feder und Stahl“ ML, Chef 23.10.2026).
//
// Jedes Handwerksmaterial hat einen festen Platz in einem Regal (Familie, darin nach Stufe sortiert). Die Bank
// bleibt frei für Ausrüstung, Essen und Tränke. Technisch liegt der Bestand weiter in `state.bank` (Engine
// `storage.ts`), deshalb lesen Rezepte, Gebäude und Warteschlangen unverändert daraus. Alle Regale sind sofort
// frei, ohne Obergrenze (Chef ML-1/ML-4). Unentdeckte Materialien stehen als namenloser Schatten im Regal.
import { useMemo, useState } from "react";
import { content } from "@hearthforge/content";
import {
  depositStorageMaterials,
  isItemDiscovered,
  itemTier,
  sellFromStorage,
  storageShelves,
  withdrawItem,
} from "@hearthforge/engine";
import type { StorageShelfId } from "@hearthforge/shared";
import { useGameState } from "../game/GameContext";
import { useI18n } from "../i18n";
import { ItemCell } from "../components/ItemCell";
import { gameAlert } from "../components/GameAlert";
import { formatNum } from "../util/format";
import { itemMatchesSearch } from "../items";

export function StoragePage(): JSX.Element {
  const state = useGameState();
  const { t, tr } = useI18n();
  const [query, setQuery] = useState("");

  const shelves = useMemo(
    () =>
      storageShelves(content).map(({ shelf, items }) => ({
        shelf,
        items: [...items].sort((a, b) => {
          const d = (itemTier(content, a) ?? 0) - (itemTier(content, b) ?? 0);
          if (d !== 0) return d;
          return (content.items[a]?.value ?? 0) - (content.items[b]?.value ?? 0);
        }),
      })),
    [],
  );

  const q = query.trim().toLowerCase();
  let kinds = 0;
  let pieces = 0;
  for (const s of shelves) for (const id of s.items) {
    const n = state.bank[id] ?? 0;
    if (n > 0) {
      kinds++;
      pieces += n;
    }
  }

  const depositAllMats = (): void => {
    const moved = depositStorageMaterials(state, content);
    if (moved === 0) gameAlert("storage.nothingToDeposit");
  };

  return (
    <div className="page storage-page">
      <div className="storage-head">
        <div className="storage-head-text">
          <h2 className="storage-title">{t("storage.title")}</h2>
          <span className="storage-summary muted">
            {t("storage.summary").replace("{kinds}", formatNum(kinds)).replace("{pieces}", formatNum(pieces))}
          </span>
        </div>
        <input
          className="storage-search"
          type="search"
          value={query}
          placeholder={t("storage.search")}
          aria-label={t("storage.search")}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="button" className="btn-iron storage-deposit-all" onClick={depositAllMats}>
          {t("storage.depositAll")}
        </button>
      </div>
      <p className="storage-lead muted">{t("storage.lead")}</p>

      <div className="storage-shelves">
        {shelves.map(({ shelf, items }) => {
          const visible = q ? items.filter((id) => isItemDiscovered(state, id) && itemMatchesSearch(id, q, tr)) : items;
          if (visible.length === 0) return null;
          const owned = visible.filter((id) => (state.bank[id] ?? 0) > 0).length;
          return (
            <section key={shelf} className={`storage-shelf storage-shelf--${shelf}`}>
              <h3 className="storage-shelf-title">
                {t(`storage.shelf.${shelf as StorageShelfId}`)}
                <span className="storage-shelf-count muted">
                  {owned}/{visible.length}
                </span>
              </h3>
              <div className="storage-grid">
                {visible.map((id) => {
                  const qty = state.bank[id] ?? 0;
                  const known = isItemDiscovered(state, id) || qty > 0;
                  if (!known) {
                    return (
                      <div key={id} className="inv-slot storage-slot storage-slot--unknown" title={t("storage.unknown")}>
                        <span className="storage-unknown-mark" aria-hidden="true">?</span>
                      </div>
                    );
                  }
                  return (
                    <div key={id} className={`inv-slot storage-slot${qty > 0 ? " filled" : " storage-slot--empty"}`}>
                      <ItemCell
                        itemId={id}
                        qty={qty > 0 ? qty : undefined}
                        actions={
                          qty > 0
                            ? [
                                {
                                  key: "withdraw1",
                                  label: t("bank.withdraw1"),
                                  onClick: () => {
                                    if (withdrawItem(state, content, id, 1) === 0) gameAlert("alert.noBagSpace");
                                  },
                                },
                                {
                                  key: "withdrawAll",
                                  label: t("bank.withdrawAll"),
                                  onClick: () => {
                                    if (withdrawItem(state, content, id, qty) === 0) gameAlert("alert.noBagSpace");
                                  },
                                },
                                {
                                  key: "sellAll",
                                  label: t("storage.sellAll"),
                                  onClick: () => {
                                    sellFromStorage(state, content, id, qty);
                                  },
                                },
                              ]
                            : []
                        }
                      />
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
