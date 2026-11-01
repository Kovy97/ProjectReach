// claude:2026-10-31T11:59:22+01:00 — Fenster „Angepinnte Rezepte“ (1.4.2, Chef-Auftrag 25.10. „Rezepte anpinnen“, präzisiert 31.10.:
// „Soll dann so ein Popup sein wie der Counter für Champions, auf- und zuklappbar, verschiebbar“). Muster EliteMiniWindow.tsx
// (gemeinsames Verhalten in util/useFloatingPanel.ts). Die Pins liegen im Spielstand (`GameState.pinnedRecipes`, SAVE 101);
// alle Werte je Zeile kommen aus engine/pins.ts `pinnedRecipeRows`, die Knöpfe nutzen dieselben Engine-Wege wie die Rezeptkarte.
import { useReducer, useState } from "react";
import { content } from "@hearthforge/content";
import {
  enqueueAction,
  enqueueActionAtFront,
  levelFromXp,
  pinnedRecipeIds,
  pinnedRecipeRows,
  setActiveAction,
  unpinRecipe,
} from "@hearthforge/engine";
import type { PinnedRecipeRow } from "@hearthforge/engine";
import type { GameState } from "@hearthforge/shared";
import { useGameSelector, useGetGameState } from "../game/GameContext";
import { useI18n } from "../i18n";
import { getItemImage } from "../items";
import { getActionSrc } from "../actionIcons";
import { getUiIcon } from "../uiIcons";
import { formatCompactK } from "../util/format";
import { computeActionRate } from "../util/actionRate";
import { effectiveActionXpGain } from "../util/queueLevels";
import { jumpToAction } from "../util/skillJump";
import {
  getPinnedRecipesCollapsed,
  getPinnedRecipesPos,
  getSidebarWidth,
  setPinnedRecipesCollapsed,
  setPinnedRecipesPos,
} from "../util/uiPrefs";
import { FLOATING_EDGE_MARGIN, useFloatingPanel } from "../util/useFloatingPanel";
import { openQueueAmountModal } from "./QueueAmountModal";
import { useItemTooltip } from "./ItemTooltip";
import "../styles/pinned-recipes.css";

const PIN_ICON_URL = getUiIcon("icon_pin");
const LOCKED_ICON_URL = getUiIcon("icon_locked");

/**
 * Default-Position beim allerersten Erscheinen: oben rechts, direkt LINKS neben dem Platz des Elite-Fensters (das sitzt bei
 * x = Breite − 260 − 22, y 190), auf derselben Höhe unter der TopBar. So überdeckt das Pin-Fenster weder das Elite-Fenster noch
 * die Toasts (die liegen rechts unten und ohnehin darüber, z-index 1200 > 900), und anders als links neben der Sidebar bleiben
 * Rezeptsuche, Kategorienamen und der gerade geklickte Stern der ersten Karte frei. Bei sehr schmalem Fenster nie links in die
 * Sidebar. Danach gilt die gezogene Position (localStorage).
 * claude:2026-10-31T12:19:00+01:00 — Sichtprüfung: links neben der Sidebar deckte das Fenster Suche und erste Kartenspalte ab.
 */
const ELITE_RIGHT_GAP = 22; // EliteMiniWindow defaultPos (spiegelt .toast-stack right)
// claude:2026-10-31T14:05:00+01:00 — Sichtprüfung 31.10.: Erstes Erscheinen eingeklappt (Abzeichen) am rechten Rand, über dem Elite-Fenster (y 190),
// statt als großes Fenster mitten im Inhalt. Aufgeklappt rutscht die Klemmung (reclampOnSizeChange) es nach links in den Viewport.
const BADGE_WIDTH = 78;
function defaultPos(): { x: number; y: number } {
  const x = window.innerWidth - ELITE_RIGHT_GAP - BADGE_WIDTH;
  return { x: Math.max(FLOATING_EDGE_MARGIN, getSidebarWidth() + 24, Math.round(x)), y: 140 };
}

function statusLetter(status: PinnedRecipeRow["inputs"][number]["status"]): string {
  return status === "have" ? "h" : status === "will_have" ? "w" : "m";
}

/**
 * Primitiv-Selector (Muster EliteMiniWindow/GameContext Perf-Welle Block A): das Fenster mountet app-weit, darf also nicht bei
 * jedem 10-Hz-Tick neu rendern. Ohne Pins ist der Schlüssel `""` (keine Projektion, kein Render). Mit Pins verdichtet er alles,
 * was die Anzeige ändert (Stufe erreicht, läuft, startbar/einreihbar, herstellbar, Bestand und Status je Zutat), zu einem String.
 */
function pinsKeySelector(s: GameState): string {
  if (pinnedRecipeIds(s).length === 0) return "";
  let key = "";
  for (const r of pinnedRecipeRows(s, content)) {
    key += `${r.actionId}:${r.levelOk ? 1 : 0}${r.active ? 1 : 0}${r.startable ? 1 : 0}${r.queueable ? 1 : 0}:${r.craftable}`;
    for (const i of r.inputs) key += `,${i.have}${statusLetter(i.status)}`;
    key += "|";
  }
  return key;
}

export function PinnedRecipesWindow(): JSX.Element | null {
  const { t, tr } = useI18n();
  const pinsKey = useGameSelector(pinsKeySelector);
  const getState = useGetGameState();
  const tooltip = useItemTooltip();
  const [collapsed, setCollapsed] = useState(getPinnedRecipesCollapsed);
  // Klick-Effekte (Lösen, Starten, Anhalten) sofort zeigen statt erst beim nächsten Tick.
  const [, bump] = useReducer((x: number) => x + 1, 0);
  const { panelRef, handleDragStart } = useFloatingPanel({
    readPos: getPinnedRecipesPos,
    writePos: setPinnedRecipesPos,
    defaultPos,
    draggingClass: "prw-panel--dragging",
    reclampOnSizeChange: true,
  });

  const handleToggleCollapsed = (): void => {
    setCollapsed((prev) => {
      const next = !prev;
      setPinnedRecipesCollapsed(next);
      return next;
    });
  };

  if (pinsKey === "") return null; // keine Pins → Fenster unsichtbar
  const state = getState();
  if (!state) return null;
  const rows = pinnedRecipeRows(state, content);
  if (rows.length === 0) return null;

  const pinIcon = PIN_ICON_URL ? <img src={PIN_ICON_URL} alt="" className="prw-pin-icon" /> : <span className="prw-pin-glyph">★</span>;

  return (
    <div ref={panelRef} className={`prw-panel${collapsed ? " prw-panel--collapsed" : ""}`} data-bot="pinned-recipes">
      {collapsed ? (
        <button
          type="button"
          className="prw-badge"
          onClick={handleToggleCollapsed}
          title={`${t("pins.expand")} (${rows.length})`}
          aria-label={`${t("pins.expand")} (${rows.length})`}
        >
          <span className="prw-badge-icon" aria-hidden="true">{pinIcon}</span>
          <span className="prw-badge-count">{rows.length}</span>
        </button>
      ) : (
        <>
          <div className="prw-header" onPointerDown={handleDragStart}>
            <span className="prw-header-icon" aria-hidden="true">{pinIcon}</span>
            <span className="prw-header-title">{t("pins.title")}</span>
            <span className="prw-header-count">{rows.length}</span>
            <button
              type="button"
              className="prw-collapse-btn"
              onClick={handleToggleCollapsed}
              title={t("pins.collapse")}
              aria-label={t("pins.collapse")}
            >
              –
            </button>
          </div>
          <ul className="prw-list">
            {rows.map((row) => {
              const action = content.actions[row.actionId]!;
              const outItem = row.outputItemId ? content.items[row.outputItemId] : undefined;
              const img = getActionSrc(row.actionId) ?? (row.outputItemId ? getItemImage(row.outputItemId) : null);
              const skillName = tr(content.skills[row.skillId]?.name ?? { en: row.skillId });
              const levelLabel = t("skill.levelShort").replace("{n}", String(row.levelRequired));
              const lockedTip = t("skill.requiresLevel").replace("{n}", String(row.levelRequired));
              // claude:2026-10-31T14:05:00+01:00 — läuft das Rezept schon endlos, wäre Einreihen eine Scheinwirkung (Engine nimmt es still an): sperren + Hinweis.
              const alreadyEndless = row.active && state.actionTarget === null;
              const startTip = !row.levelOk ? lockedTip : !row.startable ? t("pins.needMats") : t("pins.startTip");
              return (
                <li
                  key={row.actionId}
                  className={`prw-row${row.levelOk ? "" : " is-locked"}${row.active ? " is-active" : ""}`}
                >
                  <div className="prw-row-head">
                    <span
                      className="prw-icon"
                      onMouseEnter={(e) => { if (row.outputItemId) tooltip.show(row.outputItemId, e.clientX, e.clientY, []); }}
                      onMouseLeave={() => tooltip.hide()}
                    >
                      {img ? (
                        <img loading="lazy" decoding="async" src={img} alt="" className="pixelart" />
                      ) : (
                        <span className="prw-icon-emoji">{outItem?.icon ?? "▪"}</span>
                      )}
                    </span>
                    <div className="prw-title">
                      <span className="prw-name" title={tr(action.name)}>{tr(action.name)}</span>
                      <span className={`prw-meta${row.levelOk ? "" : " is-locked"}`} title={row.levelOk ? undefined : lockedTip}>
                        {skillName} ·{" "}
                        {row.levelOk ? (
                          levelLabel
                        ) : (
                          <>
                            {LOCKED_ICON_URL ? <img src={LOCKED_ICON_URL} alt="" className="prw-lock-icon" /> : "🔒"} {levelLabel}
                          </>
                        )}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="prw-unpin"
                      title={t("pins.unpin")}
                      aria-label={`${t("pins.unpin")}: ${tr(action.name)}`}
                      onClick={() => {
                        unpinRecipe(state, row.actionId);
                        bump();
                      }}
                    >
                      ×
                    </button>
                  </div>

                  <div className="prw-mats">
                    {row.inputs.map((inp) => {
                      const item = content.items[inp.itemId];
                      const matImg = getItemImage(inp.itemId);
                      const name = item ? tr(item.name) : inp.itemId;
                      const statusNote =
                        inp.status === "will_have" ? ` · ${t("queue.row.materialExpected")}` : inp.status === "missing" ? ` · ${t("queue.row.materialMissing")}` : "";
                      return (
                        <span
                          key={inp.itemId}
                          className={`prw-mat is-${inp.status === "will_have" ? "expected" : inp.status === "missing" ? "missing" : "have"}`}
                          title={`${name}: ${inp.have}/${inp.need}${statusNote}`}
                          onMouseEnter={(e) => tooltip.show(inp.itemId, e.clientX, e.clientY, [])}
                          onMouseLeave={() => tooltip.hide()}
                        >
                          {matImg ? (
                            <img loading="lazy" decoding="async" src={matImg} alt="" className="prw-mat-img pixelart" />
                          ) : (
                            <span className="prw-mat-emoji">{item?.icon ?? "▪"}</span>
                          )}
                          <span className="prw-mat-count">
                            <b>{formatCompactK(inp.have)}</b>/{formatCompactK(inp.need)}
                          </span>
                        </span>
                      );
                    })}
                  </div>

                  <div className="prw-foot">
                    {/* claude:2026-10-31T14:05:00+01:00 — gesperrtes Rezept zeigt kein „Herstellbar: n“ (Stufe reicht nicht, Zahl wäre irreführend) */}
                    {row.levelOk ? (
                      <span className={`prw-craftable${row.craftable > 0 ? "" : " is-none"}`}>
                        {t("skill.craftable").replace("{n}", String(row.craftable))}
                      </span>
                    ) : (
                      <span className="prw-craftable is-none">{t("pins.locked")}</span>
                    )}
                    <div className="prw-actions">
                      {row.active ? (
                        <button
                          type="button"
                          className="shop-citadel-btn shop-citadel-btn--sm prw-btn prw-btn--stop"
                          onClick={() => {
                            setActiveAction(state, content, null);
                            bump();
                          }}
                        >
                          {t("skill.stop")}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="shop-citadel-btn shop-citadel-btn--sm prw-btn prw-btn--start"
                          disabled={!row.startable}
                          title={startTip}
                          onClick={() => {
                            // Sofort-Start der Rezeptkarte (Shift-Klick auf ∞): läuft, bis das Material reicht; was gerade lief,
                            // rückt mit Rest-Ziel an die Spitze der Warteschlange (engine/actions.ts `enqueueActionAtFront`).
                            enqueueActionAtFront(state, content, row.actionId, null);
                            bump();
                          }}
                        >
                          {t("pins.start")}
                        </button>
                      )}
                      <button
                        type="button"
                        className="shop-citadel-btn shop-citadel-btn--sm prw-btn"
                        disabled={!row.queueable || alreadyEndless}
                        title={alreadyEndless ? t("pins.alreadyEndless") : row.levelOk ? t("skill.queue.hint") : lockedTip}
                        onClick={() =>
                          // Derselbe Weg wie der X-Knopf der Rezeptkarte (Mengen-Fenster: einreihen oder jetzt ausführen).
                          openQueueAmountModal({
                            subject: tr(action.name),
                            perRunMs: computeActionRate(state, content, action).avgDurationMs,
                            levelPreview: (n) => {
                              const cur = state.skills[action.skill]?.xp ?? 0;
                              const gain = effectiveActionXpGain(state, content, action, Date.now());
                              return { from: levelFromXp(cur), to: levelFromXp(cur + gain * n) };
                            },
                            onQueue: (n) => enqueueAction(state, content, row.actionId, n),
                            onNow: row.startable ? (n) => enqueueActionAtFront(state, content, row.actionId, n) : undefined,
                          })
                        }
                      >
                        {t("pins.queue")}
                      </button>
                      <button
                        type="button"
                        className="shop-citadel-btn shop-citadel-btn--sm prw-btn"
                        title={t("pins.gotoTip")}
                        onClick={() => jumpToAction(row.actionId)}
                      >
                        {t("pins.goto")}
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
