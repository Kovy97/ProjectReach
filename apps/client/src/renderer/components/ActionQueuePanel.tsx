import { useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { content } from "@hearthforge/content";
import { actionLevelMet, clearActionQueue, dequeueAction, moveQueueItem, prioritizeQueueEntry, queueBlockReason, resumeActionQueue, setActiveAction, stopCombat } from "@hearthforge/engine";
import { isFightQueueEntry } from "@hearthforge/shared";
import type { ActionDef, GameState, LocalizedString, QueuedAction } from "@hearthforge/shared";
// Direkt importiert statt über styles/index.css eingehängt — Kollisions-Schutz, gleiches Muster
// wie components/ItemFilterBar.tsx + styles/inv-filter.css (index.css ist eine gemeinsame Datei,
// an der parallel andere Agenten arbeiten können).
import "../styles/action-queue.css";
import { useGameState } from "../game/GameContext";
import { useI18n } from "../i18n";
import { getActionSrc } from "../actionIcons";
import { getItemImage } from "../items";
import { getMonsterSrc } from "../monsters";
import { getUiIcon } from "../uiIcons";
import { getQueuePanelCollapsed, setQueuePanelCollapsed } from "../util/uiPrefs";
import { formatClockTime, formatPlaytime } from "../util/format";
import { computeQueueTiming, type QueueTimingEntry } from "../util/queueTiming";
import { HoverTip } from "./CitadelTip";

// Mira-Set 2026-08-03 (Gap-Sweep Priorität A) — geschlossenes Action-Queue-Micro-Icon-Set löst
// die bisherigen direkten Unicode-Glyphen (Clipboard-Kopf, Warnung, Blockiert, Priorität, Pfeile)
// ab. Emoji-Fallback bleibt überall als Sicherheitsnetz erhalten, falls ein Asset je fehlt.
const QUEUE_ICON_URL = getUiIcon("icon_queue_list");
const WARNING_ICON_URL = getUiIcon("icon_queue_warning");
const BLOCKED_ICON_URL = getUiIcon("icon_queue_blocked");
const PRIORITY_ICON_URL = getUiIcon("icon_queue_priority");
const ARROW_UP_ICON_URL = getUiIcon("icon_queue_arrow_up");
const ARROW_DOWN_ICON_URL = getUiIcon("icon_queue_arrow_down");

function actionIconSrc(action: ActionDef): string | null {
  const out = action.loot[0]?.itemId;
  return getActionSrc(action.id) ?? (out ? getItemImage(out) : null);
}

function QueueIcon({ action }: { action: ActionDef }): JSX.Element {
  const outItem = action.loot[0]?.itemId ? content.items[action.loot[0].itemId] : undefined;
  const img = actionIconSrc(action);
  return img ? (
    <img loading="lazy" decoding="async" src={img} alt="" className="queue-row-icon-img pixelart" />
  ) : (
    <span className="queue-row-icon-emoji">{outItem?.icon ?? "▪"}</span>
  );
}

/**
 * Task #315 (Kampf-Queue-UI) — Monster-Icon einer Kampf-Queue-Zeile: dieselbe Sprite-Auflösung
 * wie im MonsterSelect (`getMonsterSrc`, pages/CombatPage.tsx), Schwert-Emoji als Platzhalter
 * (matcht `.monster-card-ph` dort), falls kein Sprite existiert.
 */
function FightQueueIcon({ monsterId }: { monsterId: string }): JSX.Element {
  const src = getMonsterSrc(monsterId);
  return src ? (
    <img loading="lazy" decoding="async" src={src} alt="" className="queue-row-icon-img pixelart" />
  ) : (
    <span className="queue-row-icon-emoji">⚔</span>
  );
}

/** Lokalisierter Anzeigename eines Kampf-Queue-Ziels — Content-Drift-fest (unbekannte/entfernte
 *  Monster-Id fällt auf die rohe Id zurück statt zu crashen, Muster wie überall sonst im Projekt). */
function fightMonsterName(monsterId: string, tr: (loc: LocalizedString) => string): string {
  const monster = content.monsters[monsterId];
  return monster ? tr(monster.name) : monsterId;
}

/**
 * Warteschlangen-Timer (1.0.1, Steam-Forum-Wunsch — s. util/queueTiming.ts): baut aus EINER
 * `QueueTimingEntry` den Anzeige-Text für eine Zeile. `warn` steuert nur die Farbe (Muster
 * `.queue-panel-blocked-text`/Amber) — kein neuer Zustand, rein kosmetisch.
 */
function formatEntryDuration(entry: QueueTimingEntry, t: (key: string) => string): { text: string; warn: boolean } {
  if (entry.infinite) return { text: t("queue.duration.infinite"), warn: false };
  if (entry.unknown) return { text: t("queue.duration.unknown"), warn: false };
  const time = formatPlaytime(entry.remainingMs ?? 0);
  // Kampf-Einträge sind eine grobe DPS-Schätzung, keine Simulation (s. estimateFightKillMs) —
  // die Tilde macht das auf den ersten Blick sichtbar, ohne einen eigenen i18n-Text zu brauchen.
  const timeText = entry.isEstimate ? `~${time}` : time;
  if (entry.materialLimited) {
    const short = t("queue.duration.materialShort")
      .replace("{have}", String(entry.reachableCount ?? 0))
      .replace("{want}", String(entry.requestedTarget ?? 0));
    return { text: `${short} · ${timeText}`, warn: true };
  }
  return { text: timeText, warn: false };
}

/**
 * Fasst mehrere Timing-Zeilen DERSELBEN Aktion zu EINER zusammen — Pendant zur bestehenden
 * `combinedTarget`-Mengen-Faltung unten (die "läuft ×250"-Zeile fasst 5×50 optisch zu einem
 * Eintrag zusammen; die Dauer muss dieselbe Summe zeigen, sonst widerspricht sich die Anzeige
 * selbst). NUR für gleichartige Einträge sinnvoll (`reachableCount`/`requestedTarget` werden
 * aufaddiert) — die aufrufende Faltung deckt das bereits ab (dieselbe actionId, angrenzend).
 */
function combineQueueTimingEntries(entries: QueueTimingEntry[]): QueueTimingEntry {
  let infinite = false;
  let unknown = false;
  let isEstimate = false;
  let materialLimited = false;
  let remainingMs = 0;
  let reachableCount = 0;
  let requestedTarget = 0;
  for (const e of entries) {
    if (e.infinite) infinite = true;
    if (e.unknown) unknown = true;
    if (e.isEstimate) isEstimate = true;
    remainingMs += e.remainingMs ?? 0;
    requestedTarget += e.requestedTarget ?? 0;
    reachableCount += e.materialLimited ? (e.reachableCount ?? 0) : (e.requestedTarget ?? 0);
    if (e.materialLimited) materialLimited = true;
  }
  return {
    infinite,
    unknown,
    isEstimate,
    materialLimited,
    reachableCount: materialLimited ? reachableCount : null,
    requestedTarget,
    remainingMs: infinite || unknown ? undefined : remainingMs,
  };
}

/**
 * Action-Queue-Panel (Phase 2, "Zur Queue hinzufügen"): fest angedockte Spalte am rechten
 * Bildschirmrand (Chef-Wunsch: "rechts"), spiegelbildlich zur Sidebar links — anders als das
 * frühere `PinnedTracker`-Widget (localStorage-Lesezeichen ohne Fortsetzung, jetzt entfernt) ist
 * das hier eine ECHTE Warteschlange: `state.actionQueue` (Engine, SAVE_VERSION 70) läuft von
 * selbst weiter, sobald die aktuell aktive Aktion fertig ist oder ihr Material ausgeht (s.
 * `advanceActionQueue` in packages/engine). Dieses Panel zeigt nur an + mutiert per Klick — kein
 * eigenes Tick-Signal nötig, der laufende Game-Loop (GameContext) rendert ohnehin ~10×/s neu.
 *
 * Ein-/ausklappbar (schmaler Rand-Tab bei "collapsed") — reine Anzeige-Vorliebe, s.
 * util/uiPrefs.ts getQueuePanelCollapsed/setQueuePanelCollapsed.
 */
export function ActionQueuePanel(): JSX.Element {
  const state = useGameState();
  const { t, tr } = useI18n();
  const [collapsed, setCollapsed] = useState<boolean>(getQueuePanelCollapsed);

  const toggleCollapsed = (): void => {
    setCollapsed((prev) => {
      const next = !prev;
      setQueuePanelCollapsed(next);
      return next;
    });
  };

  const activeAction = state.activeActionId ? content.actions[state.activeActionId] : undefined;
  const queue = state.actionQueue ?? [];

  // ── Warteschlangen-Timer (1.0.1, Steam-Forum-Wunsch Rose Noel Thorne + Lobster Jason) ─────────
  // `Date.now()` (statt kein `nowMs`): dieselben Segens-Boni (Blessings of the Reach), die der
  // laufende Game-Loop GERADE anwendet, fließen auch in die Anzeige ein (s. queueTiming.ts-JSDoc
  // „ein Segenswert für die GESAMTE Schätzung"). Reine Berechnung, kein State — läuft bei jedem
  // Render (Panel rendert ohnehin ~10×/s mit dem Game-Loop mit, s. Klassen-JSDoc oben).
  const now = Date.now();
  const timing = computeQueueTiming(state, content, now);

  // ── Task #315 (Kampf-Queue-UI) — Kill-Fortschritt des AKTIVEN Queue-Kampfs ("12/25") ─────────
  // `state.queueFight.remaining` ist ein reiner Countdown, kein Gesamt-Ziel (s. QueueFightRuntime-
  // JSDoc in shared/index.ts) — die Engine hält das ursprüngliche Ziel nirgends fest. Die Objekt-
  // IDENTITÄT von `state.queueFight` ist innerhalb EINES Laufs stabil (tick.ts mutiert `remaining`
  // in-place; ein NEUER Lauf bekommt immer ein frisches Objekt-Literal, s. advanceActionQueue/
  // requeueFightFront) — darüber lässt sich das Ziel rein clientseitig festhalten, ohne die Engine
  // anzufassen. Einschränkung (bewusst, kein Engine-Feld verfügbar): ein Lauf, der schon VOR dem
  // ersten Mount dieses Panels lief (z.B. Save mit bereits laufendem Queue-Kampf geladen), startet
  // den sichtbaren Zähler bei 0 relativ zum damals verbleibenden Rest, nicht beim echten Ur-Ziel.
  const fightSessionRef = useRef<{ ref: NonNullable<GameState["queueFight"]>; total: number | null } | null>(null);
  const queueFight = state.queueFight;
  if (queueFight === null) {
    fightSessionRef.current = null;
  } else if (fightSessionRef.current === null || fightSessionRef.current.ref !== queueFight) {
    fightSessionRef.current = { ref: queueFight, total: queueFight.remaining };
  }
  const fightProgressLabel = queueFight
    ? queueFight.remaining === null
      ? "∞"
      : `${Math.max(0, (fightSessionRef.current?.total ?? queueFight.remaining) - queueFight.remaining)}/${fightSessionRef.current?.total ?? queueFight.remaining}`
    : null;

  // Skip-Hinweis (`state.lastQueueSkip`): die Engine leert das Feld bewusst NICHT selbst (JSDoc
  // "die UI-Welle entscheidet über die Anzeige-Dauer") — dieses Panel ist der Melder und quittiert
  // deshalb per ×-Button mit `null` im STATE (Regel „wer meldet, quittiert", Vorbild Toasts.tsx ↔
  // `camp.lastCompletedBuild`; Re-Render kommt wie beim Fortsetzen-Button mit dem nächsten Tick).
  // Spieler-Report 1.0.2: vorher merkte sich das Panel die Weg-Klickung nur in lokalem React-
  // State, das persistierte Feld blieb gefüllt — und bei jedem Spielstart stand „Voraussetzung
  // nicht erfüllt" wieder da, längst nachdem der Spieler die Voraussetzung erfüllt hatte. Die
  // Persistenz prüft den Grund beim Laden zusätzlich neu und verwirft einen Breadcrumb, dessen
  // Gate heute nicht mehr greift (packages/persistence sanitize, Kampf-Queue-Block).
  const skip = state.lastQueueSkip;

  // 4er-Queue-Grid-Rework (Chef): jeder Grid-Klick reiht jetzt IMMER über enqueueAction ein
  // (auch während dieselbe Aktion schon läuft) — Engine-seitig stapelt dabei nur der jeweils
  // LETZTE Queue-Eintrag (s. `enqueueAction`-JSDoc), die laufende Aktion selbst lebt separat in
  // `activeActionId`/`actionTarget`, nicht im Array. Ohne diese Faltung würde 5× "50" klicken
  // als "läuft: ×50" + "Warteschlange: ×200" auseinanderfallen — der Chef will das kombinierte
  // Gesamtvolumen sehen ("5×50 Tin = 250 in der Que"). Faltet deshalb die vorderen, an die
  // laufende Aktion ANGRENZENDEN Queue-Einträge derselben actionId in EINE angezeigte Zahl auf
  // der "läuft"-Zeile und blendet sie aus der Liste darunter aus (der rohe `state.actionQueue`
  // bleibt unangetastet — reine Anzeige-Faltung).
  // Task #369 (Endlos-Sperre): NUR endlich-in-endlich falten. Vorher faltete die Schleife auch
  // dann, wenn die laufende Aktion ODER ein Eintrag ∞ war — die Summe wurde damit wieder ∞ und
  // die gefalteten Zeilen verschwanden aus der Liste, obwohl sie NICHT mitliefen. Ausgerechnet im
  // Endlos-Fall (wo sie am längsten warten) machte die Anzeige-Faltung echte Einträge unsichtbar.
  // Der vom Chef gewünschte Fall ("5×50 Tin = 250 in der Que") ist rein endlich und bleibt gefaltet.
  let combinedTarget: number | null = state.activeActionId ? state.actionTarget : null;
  let foldedCount = 0;
  if (state.activeActionId !== null && combinedTarget !== null) {
    for (const entry of queue) {
      if (entry.kind !== "action" || entry.actionId !== state.activeActionId) break;
      if (entry.target === null) break; // ∞-Eintrag bleibt sichtbar statt in eine Summe zu fallen
      foldedCount++;
      combinedTarget += entry.target;
    }
  }
  const visibleQueue = queue.slice(foldedCount);

  // Dauer der "läuft"-Zeile: dieselbe Faltung wie `combinedTarget` oben — die Mengen-Anzeige
  // "×250" und die Dauer-Anzeige müssen dieselbe Summe meinen, sonst widerspricht sich das Panel
  // selbst (s. `combineQueueTimingEntries`-JSDoc).
  const activeRowTiming = timing.active
    ? foldedCount > 0
      ? combineQueueTimingEntries([timing.active, ...timing.queue.slice(0, foldedCount)])
      : timing.active
    : null;
  const activeRowDuration = activeRowTiming ? formatEntryDuration(activeRowTiming, t) : null;

  // ── Task #369 — die stille Endlos-Sperre sichtbar machen ────────────────────────────────────
  // Bot-Sweep-Befund 0.3.0: lief eine Aktivität mit dem ∞-Preset, rückte die Warteschlange NIE
  // vor (die Engine schaltet nur weiter, wenn die laufende Aktivität endet) — und es gab dafür
  // keinerlei Hinweis. Chef-Variante A: die ∞-Semantik bleibt, aber der Zustand wird benannt.
  // `queueBlockReason` ist eine reine Ableitung aus dem Engine-State (kein neues Save-Feld).
  // "paused" hat oben bereits seinen eigenen, deutlicheren Block — hier nicht doppelt melden.
  const blockReason = queueBlockReason(state, content);
  const showBlocked = blockReason !== null && blockReason !== "paused" && visibleQueue.length > 0;

  /**
   * Spiegelt `prioritizeQueueEntry`s eigene No-op-Checks (Engine-JSDoc): dieselbe Aktivität läuft
   * schon, oder eine Aktion ist (noch) nicht startbar (Level fehlt). Der ⚡-Knopf greyed dann aus
   * statt einen toten Klick zu verpuffen — Kampf-Einträge laufen dagegen bewusst IMMER an
   * (Gate-Check erst beim Start, ein gesperrter Kampf wird übersprungen statt abgelehnt).
   */
  function startNowDisabled(entry: QueuedAction): boolean {
    const fightEntry = isFightQueueEntry(entry) ? entry : null;
    return fightEntry
      ? state.queueFight !== null && state.queueFight.monsterId === fightEntry.monsterId
      : state.activeActionId === entry.actionId || !actionLevelMet(state, content, entry.actionId);
  }

  // Ziel des „jetzt starten"-Knopfes im Sperr-Hinweis: der erste WIRKLICH startbare Eintrag —
  // ein direkt folgender Eintrag derselben laufenden Aktion wäre ein toter Klick (s.o.).
  const unblockVi = visibleQueue.findIndex((entry) => !startNowDisabled(entry));

  // ── Spieler-Feedback 0.2.2 Punkt 2: Drag & Drop-Umsortierung ────────────────────────────
  // Ganze Zeilen greifen und frei umsortieren (20+ Einträge, Chef-Wunsch, statt reinem
  // Move-Up-Klicken). Pointer-Events (Maus + Touch einheitlich) + reine DOM-Ref-Mutation
  // während des Ziehens (KEIN React-State pro Pixel/Tick) — dasselbe Perf-Muster wie der
  // Sidebar-/TopBar-Rand-Handle (direkte `el.style`-Schreibzugriffe statt Re-Render). Die
  // Engine hat bereits einen generischen `moveQueueItem(state, from, to)` (beliebige Distanz,
  // nicht nur benachbart — die bestehenden ▲/▼-Buttons rufen ihn nur mit i∓1 auf) MIT
  // Bounds-/No-op-Tests (action-queue.test.ts) — kein neuer Engine-Helper nötig, s. Bericht.
  // `to` wird hier IMMER aus einem geklemmten Slot-Index gebaut (s. `updateDragVisual`), das
  // deckt die vom Chef gewünschte "Grenzen geklemmt"-Eigenschaft bereits vor dem Aufruf ab.
  interface DragMeta {
    fromVi: number;
    overVi: number;
    startClientY: number;
    startScrollTop: number;
    rowHeight: number;
    rowTops: number[];
    rowHeights: number[];
    pointerId: number;
    lastClientY: number;
  }
  const listRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const indicatorRef = useRef<HTMLDivElement>(null);
  const dragMeta = useRef<DragMeta | null>(null);
  const rafId = useRef<number | null>(null);

  const setRowRef = (vi: number) => (el: HTMLDivElement | null): void => {
    if (el) rowRefs.current.set(vi, el);
    else rowRefs.current.delete(vi);
  };

  /** Schiebt alle Zeilen ZWISCHEN Start- und aktuellem Ziel-Slot per `transform` beiseite (öffnet
   *  die Lücke am Ziel), rein imperativ — keine Layout-Thrash-Orgie bei 20+ Einträgen, da JEDER
   *  Frame nur Style-Schreibzugriffe macht (Compositor-Only), kein einziger Read/Reflow dazwischen. */
  function applyRowShifts(meta: DragMeta): void {
    for (let vi = 0; vi < meta.rowTops.length; vi++) {
      if (vi === meta.fromVi) continue;
      const el = rowRefs.current.get(vi);
      if (!el) continue;
      let shift = 0;
      if (meta.fromVi < meta.overVi && vi > meta.fromVi && vi <= meta.overVi) shift = -meta.rowHeight;
      else if (meta.fromVi > meta.overVi && vi >= meta.overVi && vi < meta.fromVi) shift = meta.rowHeight;
      el.style.transform = shift !== 0 ? `translateY(${shift}px)` : "";
    }
    const indicator = indicatorRef.current;
    if (indicator) {
      if (meta.overVi === meta.fromVi) {
        indicator.style.opacity = "0";
      } else {
        indicator.style.opacity = "1";
        indicator.style.transform = `translateY(${meta.rowTops[meta.overVi]}px)`;
      }
    }
  }

  /** Läuft während des gesamten Drags per rAF (gebündelt mit Auto-Scroll unten) — liest nur
   *  `meta.lastClientY` (von pointermove billig aktualisiert), rechnet höchstens 60×/s statt bei
   *  JEDEM pointermove-Event (das feuert bei Touch/hochauflösenden Mäusen deutlich öfter). */
  function updateDragVisual(meta: DragMeta): void {
    const container = listRef.current;
    const draggedEl = rowRefs.current.get(meta.fromVi);
    if (!container || !draggedEl) return;
    const scrollDelta = container.scrollTop - meta.startScrollTop;
    draggedEl.style.transform = `translateY(${meta.lastClientY - meta.startClientY + scrollDelta}px)`;

    const contentY = meta.lastClientY - container.getBoundingClientRect().top + container.scrollTop;
    let overVi = 0;
    for (let i = 0; i < meta.rowTops.length; i++) {
      const mid = meta.rowTops[i]! + meta.rowHeights[i]! / 2;
      if (contentY >= mid) overVi = i;
    }
    overVi = Math.max(0, Math.min(meta.rowTops.length - 1, overVi)); // Grenzen geklemmt
    if (overVi !== meta.overVi) {
      meta.overVi = overVi;
    }
    applyRowShifts(meta);
  }

  const AUTOSCROLL_EDGE_PX = 36;
  const AUTOSCROLL_MAX_PX = 14;

  function dragFrame(): void {
    const meta = dragMeta.current;
    const container = listRef.current;
    if (!meta || !container) { rafId.current = null; return; }
    const rect = container.getBoundingClientRect();
    if (meta.lastClientY - rect.top < AUTOSCROLL_EDGE_PX) {
      const depth = AUTOSCROLL_EDGE_PX - (meta.lastClientY - rect.top);
      container.scrollTop = Math.max(0, container.scrollTop - (depth / AUTOSCROLL_EDGE_PX) * AUTOSCROLL_MAX_PX);
    } else if (rect.bottom - meta.lastClientY < AUTOSCROLL_EDGE_PX) {
      const depth = AUTOSCROLL_EDGE_PX - (rect.bottom - meta.lastClientY);
      const maxScroll = container.scrollHeight - container.clientHeight;
      container.scrollTop = Math.min(maxScroll, container.scrollTop + (depth / AUTOSCROLL_EDGE_PX) * AUTOSCROLL_MAX_PX);
    }
    updateDragVisual(meta);
    rafId.current = requestAnimationFrame(dragFrame);
  }

  function resetAllRowStyles(): void {
    for (const el of rowRefs.current.values()) {
      el.style.transform = "";
      el.style.transition = "";
    }
    if (indicatorRef.current) indicatorRef.current.style.opacity = "0";
  }

  function beginDrag(vi: number, e: ReactPointerEvent<HTMLElement>): void {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest(".queue-row-actions")) return; // ▲▼✕ behalten ihr Klick-Verhalten
    const container = listRef.current;
    const rowEl = rowRefs.current.get(vi);
    if (!container || !rowEl) return;
    e.preventDefault();
    const rowTops: number[] = [];
    const rowHeights: number[] = [];
    for (let i = 0; i < visibleQueue.length; i++) {
      const el = rowRefs.current.get(i);
      rowTops.push(el ? el.offsetTop : 0);
      rowHeights.push(el ? el.offsetHeight : rowEl.offsetHeight);
    }
    dragMeta.current = {
      fromVi: vi,
      overVi: vi,
      startClientY: e.clientY,
      startScrollTop: container.scrollTop,
      rowHeight: rowEl.offsetHeight,
      rowTops,
      rowHeights,
      pointerId: e.pointerId,
      lastClientY: e.clientY,
    };
    rowEl.setPointerCapture(e.pointerId);
    rowEl.classList.add("queue-row--dragging");
    if (rafId.current === null) rafId.current = requestAnimationFrame(dragFrame);
  }

  function onRowPointerMove(vi: number, e: ReactPointerEvent<HTMLElement>): void {
    const meta = dragMeta.current;
    if (!meta || meta.fromVi !== vi) return;
    meta.lastClientY = e.clientY;
  }

  function endDrag(vi: number, commit: boolean): void {
    const meta = dragMeta.current;
    if (!meta || meta.fromVi !== vi) return;
    const rowEl = rowRefs.current.get(vi);
    if (rowEl?.hasPointerCapture(meta.pointerId)) rowEl.releasePointerCapture(meta.pointerId);
    rowEl?.classList.remove("queue-row--dragging");
    if (rafId.current !== null) { cancelAnimationFrame(rafId.current); rafId.current = null; }
    dragMeta.current = null;

    const changed = commit && meta.overVi !== meta.fromVi;
    if (changed && rowEl) {
      // Zeile exakt auf den Ziel-Slot einrasten — der nächste Game-Tick rendert die ECHTE neue
      // Reihenfolge (frische Elemente ohne transform); das Timeout unten ist nur ein
      // Sicherheitsnetz, falls aus irgendeinem Grund kein Tick nachrendert (z.B. Pause im Hintergrund).
      rowEl.style.transition = "transform 0.12s ease";
      rowEl.style.transform = `translateY(${meta.rowTops[meta.overVi]! - meta.rowTops[meta.fromVi]!}px)`;
      const fromReal = meta.fromVi + foldedCount;
      const toReal = meta.overVi + foldedCount;
      // Guard: nur zurücksetzen, wenn bis dahin NICHT längst ein neuer Drag begonnen hat (sonst
      // würde dieses verspätete Sicherheitsnetz eine gerade laufende neue Ziehbewegung kappen).
      window.setTimeout(() => { if (dragMeta.current === null) resetAllRowStyles(); }, 220);
      moveQueueItem(state, fromReal, toReal);
    } else {
      resetAllRowStyles();
    }
  }

  return (
    <aside className={`queue-panel${collapsed ? " queue-panel--collapsed" : ""}`}>
      {/* Chef 25.08.2026: natives `title=` löste den Cursor-Bug (Tooltip verschwand/klebte am
          Zeiger, konnte vom Panel überdeckt werden) — Custom-Tooltip wie bei den Charakter-Stats
          (HoverTip/CitadelTip, s. EquipmentOverview.tsx StatLine „Task #343"-Vorbild): Portal an
          document.body, Flip-Positionierung, nie unter dem Cursor. `focusable={false}`, weil der
          Button selbst schon der Tab-Stopp ist (kein doppelter). */}
      <HoverTip
        as="div"
        focusable={false}
        className="queue-btn-tip"
        content={<span className="ct-tip-desc">{t(collapsed ? "queue.expand" : "queue.collapse")}</span>}
      >
        <button
          type="button"
          /* Task #369: eingeklappt bleibt nur der 40px-Rand-Tab übrig — die Endlos-Sperre bekommt
             dort denselben Glow-Kanal wie die Tod-Pause (Bernstein statt Rot), sonst wäre der
             Zustand für jeden Spieler mit eingeklapptem Panel wieder unsichtbar. */
          className={`queue-panel-toggle${state.queuePaused ? " queue-panel-toggle--paused" : ""}${
            showBlocked ? " queue-panel-toggle--blocked" : ""
          }`}
          onClick={toggleCollapsed}
          aria-label={t(collapsed ? "queue.expand" : "queue.collapse")}
          aria-expanded={!collapsed}
          /* Versions-Tour-Ziel (Chef-Auftrag 2026-07-21, FeatureTourGuide.tsx): eigener
             "feature." Namespace, kollidiert nicht mit dem Haupt-Guide (topbar./sidebar.). */
          data-guide-id="feature.queueExpand"
        >
          {/* Task #369: eingeklappt sind das die einzigen 40 px, die der Spieler sieht — der Glow
              allein (Muster `--paused`) ist gegen die ornamentierte Textur zu leise. Im Sperr-Fall
              ERSETZT die Sanduhr den Pfeil (kein drittes Element in einen 40-px-Tab quetschen): aus
              „da warten 2" wird „da warten 2, und von allein geht nichts weiter". Der Tab bleibt als
              Ganzes der Aufklapp-Knopf, samt Tooltip/aria-label — die Affordanz geht nicht verloren. */}
          <span className="queue-panel-toggle-caret">
            {collapsed ? (
              showBlocked ? (
                BLOCKED_ICON_URL ? <img loading="lazy" decoding="async" src={BLOCKED_ICON_URL} alt="" className="ui-icon" /> : "⏳"
              ) : (
                "◂"
              )
            ) : (
              "▸"
            )}
          </span>
          {collapsed && queue.length > 0 && <span className="queue-panel-toggle-count">{queue.length}</span>}
        </button>
      </HoverTip>

      {/* Eingeklappter Zustand (Chef-Vorgabe): die Queue bleibt sichtbar, nur auf Icon + Restzahl
          verdichtet — pro Eintrag EIN kleiner Slot (Icon + "×N"-Badge) statt Name/Buttons/Index.
          Nutzt dieselbe combinedTarget-Faltung wie oben (laufende Aktion + direkt angrenzende
          gleiche Queue-Einträge in EINER Zahl), damit "läuft" und "wartet" nicht auseinanderfallen. */}
      {collapsed && (queueFight || activeAction || visibleQueue.length > 0) && (
        <div className="queue-rail">
          {queueFight && (
            <HoverTip
              as="div"
              className="queue-rail-item queue-rail-item--active"
              content={
                <span className="ct-tip-desc">
                  {fightMonsterName(queueFight.monsterId, tr)} {fightProgressLabel}
                  {activeRowDuration ? ` · ${activeRowDuration.text}` : ""} · {t("queue.rightClickEject")}
                </span>
              }
              onContextMenu={(e) => { e.preventDefault(); stopCombat(state); }}
            >
              <div className="queue-rail-icon-box">
                <FightQueueIcon monsterId={queueFight.monsterId} />
              </div>
              <span className="queue-rail-badge">{fightProgressLabel}</span>
            </HoverTip>
          )}
          {activeAction && (
            <HoverTip
              as="div"
              className="queue-rail-item queue-rail-item--active"
              content={
                <span className="ct-tip-desc">
                  {tr(activeAction.name)} {combinedTarget === null ? t("skill.qty.all") : `×${combinedTarget}`}
                  {activeRowDuration ? ` · ${activeRowDuration.text}` : ""} · {t("queue.rightClickEject")}
                </span>
              }
              onContextMenu={(e) => { e.preventDefault(); setActiveAction(state, content, null); }}
            >
              <div className="queue-rail-icon-box">
                <QueueIcon action={activeAction} />
              </div>
              <span className="queue-rail-badge">{combinedTarget === null ? "∞" : `×${combinedTarget}`}</span>
            </HoverTip>
          )}
          {visibleQueue.map((entry, vi) => {
            // isFightQueueEntry ist ein Type-Guard (entry is QueuedAction & {monsterId: MonsterId})
            // — nur über eine EIGENE narrowed Variable (nicht ein separates Boolean-Flag) bleibt
            // `entry.monsterId` (auf QueuedAction nur optional getippt) für TS non-null bekannt.
            const fightEntry = isFightQueueEntry(entry) ? entry : null;
            const action = fightEntry ? null : content.actions[entry.actionId];
            if (!fightEntry && !action) return null;
            const i = vi + foldedCount; // echter Index ins rohe state.actionQueue (Rail-Faltung, s.o.)
            const label = fightEntry ? fightMonsterName(fightEntry.monsterId, tr) : tr(action!.name);
            const qtyLabel = fightEntry
              ? entry.target === null ? "∞" : `×${entry.target}`
              : entry.target === null ? t("skill.qty.all") : `×${entry.target}`;
            const rowTiming = timing.queue[i];
            return (
              <HoverTip
                as="div"
                key={`rail-${fightEntry ? fightEntry.monsterId : entry.actionId}-${vi}`}
                className="queue-rail-item"
                content={
                  <span className="ct-tip-desc">
                    {label} {qtyLabel}
                    {rowTiming ? ` · ${formatEntryDuration(rowTiming, t).text}` : ""} · {t("queue.rightClickEject")}
                  </span>
                }
                onContextMenu={(e) => { e.preventDefault(); dequeueAction(state, i); }}
              >
                <div className="queue-rail-icon-box">
                  {fightEntry ? <FightQueueIcon monsterId={fightEntry.monsterId} /> : <QueueIcon action={action!} />}
                </div>
                <span className="queue-rail-badge">{qtyLabel}</span>
              </HoverTip>
            );
          })}
        </div>
      )}

      {!collapsed && (
        <div className="queue-panel-body">
          <div className="queue-panel-header">
            {QUEUE_ICON_URL ? (
              <img loading="lazy" decoding="async" src={QUEUE_ICON_URL} alt="" className="queue-panel-header-icon" />
            ) : (
              <span className="queue-panel-header-emoji">📋</span>
            )}
            <span className="queue-panel-title">{t("queue.title")}</span>
          </div>

          {/* Warteschlangen-Timer (1.0.1, Steam-Forum-Wunsch): die GESAMTDAUER gleich unter dem
              Titel — "gut sichtbar", noch vor Pause-/Sperr-Bannern (Aufgaben-Vorgabe). Läuft ein
              ∞-Eintrag irgendwo drin, gibt es real KEINE Gesamtdauer mehr (s. queueTiming.ts) —
              dann zeigt die Zeile stattdessen "läuft weiter" (+ die endliche Summe DAVOR, falls
              welche vorausgeht) statt einer erfundenen Zahl. Nur sichtbar, wenn überhaupt etwas
              läuft/wartet — ein leeres Panel bekommt keine "Gesamt: 0m"-Zeile. */}
          {(activeRowTiming || visibleQueue.length > 0) && (
            <div className="queue-panel-total">
              <span className="queue-panel-total-label muted">{t("queue.duration.totalLabel")}</span>
              <span className={`queue-panel-total-value${timing.hasInfinite ? " queue-panel-total-value--infinite" : ""}`}>
                {timing.hasInfinite
                  ? timing.finiteMs > 0
                    ? t("queue.duration.thenInfinite").replace("{time}", formatPlaytime(timing.finiteMs))
                    : t("queue.duration.infinite")
                  : formatPlaytime(timing.totalMs ?? 0)}
              </span>
              {!timing.hasInfinite && (timing.totalMs ?? 0) > 0 && (
                <span className="queue-panel-total-eta">
                  {t("queue.duration.eta").replace("{time}", formatClockTime(now + (timing.totalMs ?? 0)))}
                </span>
              )}
            </div>
          )}

          {/* Task #315 — Queue-Pause-Badge: "Tod pausiert die Queue" (Chef-GO #312) ist ein
              härterer Zustand als der dezente Material-Stop unten (NICHTS läuft mehr automatisch
              weiter, bis der Spieler manuell fortsetzt) — eigener, deutlich sichtbarer Block mit
              direktem Handlungsaufruf statt nur einer Textzeile. */}
          {state.queuePaused && (
            <div className="queue-panel-paused">
              <span className="queue-panel-paused-badge">
                {WARNING_ICON_URL ? <img loading="lazy" decoding="async" src={WARNING_ICON_URL} alt="" className="ui-icon" /> : "⚠"} {t("queue.paused")}
              </span>
              <button
                type="button"
                className="queue-panel-resume-btn"
                onClick={() => resumeActionQueue(state, content)}
              >
                {t("queue.resume")}
              </button>
            </div>
          )}

          {/* Skip-Hinweis (`state.lastQueueSkip`) — dezente Einzeilerzeile, der ×-Button quittiert
              den Breadcrumb im State (s. Kommentar bei `skip` oben, Spieler-Report 1.0.2). */}
          {skip && (
            <div className="queue-panel-skip">
              <span>
                {WARNING_ICON_URL ? <img loading="lazy" decoding="async" src={WARNING_ICON_URL} alt="" className="ui-icon" /> : "⚠"}{" "}
                {t(`queue.skip.${skip.reason}`).replace("{monster}", fightMonsterName(skip.monsterId, tr))}
              </span>
              {/* Chef 25.08.2026: Custom-Tooltip statt native `title=` (Vorbild Charakter-Stats). */}
              <HoverTip
                as="div"
                focusable={false}
                className="queue-btn-tip"
                content={<span className="ct-tip-desc">{t("common.close")}</span>}
              >
                <button
                  type="button"
                  className="queue-panel-skip-dismiss"
                  onClick={() => { state.lastQueueSkip = null; }}
                  aria-label={t("common.close")}
                >
                  ✕
                </button>
              </HoverTip>
            </div>
          )}

          <div className="queue-panel-active">
            <span className="queue-panel-section-label muted">{t("queue.nowRunning")}</span>
            {queueFight ? (
              <HoverTip
                as="div"
                className="queue-row queue-row--active"
                content={<span className="ct-tip-desc">{t("queue.rightClickEject")}</span>}
                onContextMenu={(e) => { e.preventDefault(); stopCombat(state); }}
              >
                <FightQueueIcon monsterId={queueFight.monsterId} />
                <div className="queue-row-text">
                  <span className="queue-row-name">{fightMonsterName(queueFight.monsterId, tr)}</span>
                  {activeRowTiming && (
                    <span className={`queue-row-duration${activeRowDuration!.warn ? " queue-row-duration--warn" : ""}`}>
                      {activeRowDuration!.text}
                    </span>
                  )}
                </div>
                <span className="queue-row-target">{fightProgressLabel}</span>
              </HoverTip>
            ) : activeAction ? (
              <HoverTip
                as="div"
                className="queue-row queue-row--active"
                content={<span className="ct-tip-desc">{t("queue.rightClickEject")}</span>}
                onContextMenu={(e) => { e.preventDefault(); setActiveAction(state, content, null); }}
              >
                <QueueIcon action={activeAction} />
                <div className="queue-row-text">
                  <span className="queue-row-name">{tr(activeAction.name)}</span>
                  {activeRowTiming && (
                    <span className={`queue-row-duration${activeRowDuration!.warn ? " queue-row-duration--warn" : ""}`}>
                      {activeRowDuration!.text}
                    </span>
                  )}
                </div>
                <span className="queue-row-target">
                  {combinedTarget === null ? t("skill.qty.all") : `×${combinedTarget}`}
                </span>
              </HoverTip>
            ) : state.lastStop ? (
              // UI-Brainstorm A4 (2026-07-24, -ergonomie.md §6.1): das Panel zeigte bei gestoppter
              // Aktion (Inventar voll/Material leer) bisher nur "Nichts im Gange" — der Grund lebte
              // ausschließlich als Hover-only-Tooltip in der TopBar, einem komplett anderen
              // UI-Bereich. Jetzt liest dieses Panel denselben `state.lastStop`-Wert direkt (kein
              // neuer State, s. SkillPage.tsx `stopKey`/OfflinePopup.tsx für dasselbe Muster).
              <div className="queue-panel-active-empty queue-panel-stopped">
                {WARNING_ICON_URL ? <img loading="lazy" decoding="async" src={WARNING_ICON_URL} alt="" className="ui-icon" /> : "⚠"}{" "}
                {(() => {
                  const stoppedAction = content.actions[state.lastStop.actionId];
                  const reasonKey =
                    state.lastStop.reason === "inventory_full" ? "skill.stoppedInventoryFull" : "skill.stoppedNoMaterials";
                  return `${stoppedAction ? `${tr(stoppedAction.name)}: ` : ""}${t(reasonKey)}`;
                })()}
              </div>
            ) : (
              <div className="queue-panel-active-empty muted">{t("queue.nothingRunning")}</div>
            )}
          </div>

          <div className="queue-panel-list-wrap">
            <div className="queue-panel-list-head">
              <span className="queue-panel-section-label muted">{t("queue.queueLabel")}</span>
              {queue.length > 0 && (
                // Chef 25.08.2026: Custom-Tooltip statt native `title=` (Vorbild Charakter-Stats).
                // Der Knopftext zeigt denselben Schlüssel schon sichtbar — der Tooltip bleibt hier
                // trotzdem konsequent mit den übrigen Umbauten, s. Bericht.
                <HoverTip
                  as="div"
                  focusable={false}
                  className="queue-btn-tip"
                  content={<span className="ct-tip-desc">{t("queue.clearAll")}</span>}
                >
                  <button
                    type="button"
                    className="queue-panel-clear"
                    onClick={() => clearActionQueue(state)}
                  >
                    {t("queue.clearAll")}
                  </button>
                </HoverTip>
              )}
            </div>

            {/* Task #369 — Endlos-Sperre: der Kern des Befunds war die STILLE, nicht das Warten.
                Steht direkt über den wartenden Zeilen (erklärt genau das, was der Spieler dort
                sieht) und trägt den Ein-Klick-Ausweg gleich mit — derselbe Prioritäts-Pfad wie
                der ⚡-Knopf pro Zeile (`prioritizeQueueEntry`, #326/#327). */}
            {showBlocked && blockReason && (
              <div className="queue-panel-blocked">
                <span className="queue-panel-blocked-text">
                  {BLOCKED_ICON_URL ? <img loading="lazy" decoding="async" src={BLOCKED_ICON_URL} alt="" className="ui-icon" /> : "⏳"}{" "}
                  {t(`queue.blocked.${blockReason}`)}
                </span>
                {unblockVi >= 0 && (
                  // Chef 25.08.2026: Custom-Tooltip statt native `title=` — der Hint-Text ("wieso
                  // jetzt starten?") ist eine ANDERE Info als das Knopf-Label, bleibt also erhalten.
                  <HoverTip
                    as="div"
                    focusable={false}
                    className="queue-btn-tip queue-blocked-btn-tip"
                    content={<span className="ct-tip-desc">{t("queue.blocked.hint")}</span>}
                  >
                    <button
                      type="button"
                      className="queue-panel-blocked-btn"
                      onClick={() => prioritizeQueueEntry(state, content, unblockVi + foldedCount)}
                    >
                      {PRIORITY_ICON_URL ? <img loading="lazy" decoding="async" src={PRIORITY_ICON_URL} alt="" className="ui-icon" /> : "⚡"}{" "}
                      {t("queue.blocked.startFirst")}
                    </button>
                  </HoverTip>
                )}
              </div>
            )}

            {visibleQueue.length === 0 ? (
              <div className="queue-panel-empty muted">{t("queue.emptyHint")}</div>
            ) : (
              <div className="queue-panel-list" ref={listRef}>
                {/* Drop-Ziel-Linie (Drag&Drop-Umsortierung, Punkt 2) — ein einziges Element,
                    per `transform` an den aktuellen Ziel-Slot verschoben (s. applyRowShifts
                    oben), sonst unsichtbar (opacity:0). */}
                <div ref={indicatorRef} className="queue-drop-indicator" aria-hidden="true" />
                {visibleQueue.map((entry, vi) => {
                  // Echter Index ins ungefaltete `state.actionQueue` — die vorderen `foldedCount`
                  // Einträge sind oben in die "läuft"-Zeile eingefaltet (s. combinedTarget) und
                  // hier absichtlich nicht mehr gerendert; move/remove müssen trotzdem den
                  // richtigen Index im ROHEN Array treffen.
                  const i = vi + foldedCount;
                  // s. Kommentar in der Collapsed-Rail oben — narrowed Variable statt Boolean-Flag.
                  const fightEntry = isFightQueueEntry(entry) ? entry : null;
                  const action = fightEntry ? null : content.actions[entry.actionId];
                  if (!fightEntry && !action) return null;
                  // Task #327 (Priority-UI): ⚡-Knopf ausgrauen, wenn `prioritizeQueueEntry` ein
                  // No-op wäre — s. `startNowDisabled` oben (seit #369 geteilt mit dem Sperr-Hinweis).
                  const rowStartDisabled = startNowDisabled(entry);
                  // Warteschlangen-Timer (1.0.1): `timing.queue` ist 1:1 zum ROHEN `state.actionQueue`
                  // ausgerichtet (auch Content-Drift-Zeilen bekommen dort eine Zeile, s.
                  // queueTiming.ts) — derselbe Index `i` trifft also immer den richtigen Eintrag.
                  const rowTiming = timing.queue[i];
                  const rowDuration = rowTiming ? formatEntryDuration(rowTiming, t) : null;
                  return (
                    // Chef 25.08.2026: die Zeile selbst ist ab jetzt ein PLAIN div (kein HoverTip
                    // mehr über die GANZE Zeile) — Drag-Handler unverändert, aber der Zeilen-
                    // Tooltip ("Ziehen zum Umsortieren …") sitzt jetzt NUR noch auf dem linken
                    // Namensblock (.queue-row-body). Grund: die vier 20px-Knöpfe brauchen JEDER
                    // seinen EIGENEN Tooltip-Text (Jetzt starten/Hoch/Runter/Entfernen) — wäre die
                    // ganze Zeile weiter EIN HoverTip, würde ein Hover über einem Knopf den
                    // (irreführenden) Zeilen-Hint UND den Knopf-Tooltip gleichzeitig zeigen, weil
                    // `mouseenter` auf dem äußeren div nie schließt, solange der Zeiger irgendwo in
                    // der Zeile bleibt. Aufgeteilt vermeiden beide Tooltips sich sauber.
                    <div
                      key={`${fightEntry ? fightEntry.monsterId : entry.actionId}-${i}`}
                      className="queue-row"
                      ref={setRowRef(vi)}
                      onContextMenu={(e) => { e.preventDefault(); dequeueAction(state, i); }}
                      onPointerDown={(e) => beginDrag(vi, e)}
                      onPointerMove={(e) => onRowPointerMove(vi, e)}
                      onPointerUp={() => endDrag(vi, true)}
                      onPointerCancel={() => endDrag(vi, false)}
                    >
                      <span className="queue-row-index">{vi + 1}</span>
                      <HoverTip
                        as="div"
                        className="queue-row-body"
                        content={
                          <span className="ct-tip-desc">
                            {t("queue.dragHandle")} · {t("queue.rightClickEject")}
                            {rowTiming?.isEstimate ? ` · ${t("queue.duration.estimateHint")}` : ""}
                            {rowTiming?.unknown ? ` · ${t("queue.duration.unknownHint")}` : ""}
                          </span>
                        }
                      >
                        {fightEntry ? <FightQueueIcon monsterId={fightEntry.monsterId} /> : <QueueIcon action={action!} />}
                        <div className="queue-row-text">
                          <span className="queue-row-name">
                            {fightEntry ? fightMonsterName(fightEntry.monsterId, tr) : tr(action!.name)}
                          </span>
                          {/* 1.0.2 (Spieler-Report): Menge und Dauer teilen sich eine Zeile UNTER
                              dem Namen. Vorher war die Menge eine eigene Spalte rechts und nahm
                              dem Namen Breite — gemessen blieben ihm 31 px, und er brach
                              buchstabenweise um. */}
                          <span className="queue-row-meta">
                            <span className="queue-row-target">
                              {fightEntry
                                ? entry.target === null ? "∞" : `×${entry.target}`
                                : entry.target === null ? t("skill.qty.all") : `×${entry.target}`}
                            </span>
                            {rowDuration && (
                              <span className={`queue-row-duration${rowDuration.warn ? " queue-row-duration--warn" : ""}`}>
                                {rowDuration.text}
                              </span>
                            )}
                          </span>
                        </div>
                      </HoverTip>
                      <div className="queue-row-actions">
                        {/* Chef 25.08.2026: je Knopf ein eigener Custom-Tooltip statt native
                            `title=` (Vorbild Charakter-Stats, s. Kommentar am Panel-Toggle oben).
                            `focusable={false}` — der `<button>` selbst bleibt der Tab-Stopp. */}
                        <HoverTip
                          as="div"
                          focusable={false}
                          className="queue-btn-tip"
                          content={<span className="ct-tip-desc">{t("queue.startNow")}</span>}
                        >
                          <button
                            type="button"
                            className="queue-row-btn queue-row-btn--start"
                            disabled={rowStartDisabled}
                            onClick={() => prioritizeQueueEntry(state, content, i)}
                            aria-label={t("queue.startNow")}
                          >
                            {PRIORITY_ICON_URL ? <img loading="lazy" decoding="async" src={PRIORITY_ICON_URL} alt="" className="queue-row-btn-icon" /> : "⚡"}
                          </button>
                        </HoverTip>
                        <HoverTip
                          as="div"
                          focusable={false}
                          className="queue-btn-tip"
                          content={<span className="ct-tip-desc">{t("queue.moveUp")}</span>}
                        >
                          <button
                            type="button"
                            className="queue-row-btn"
                            disabled={i <= foldedCount}
                            onClick={() => moveQueueItem(state, i, i - 1)}
                            aria-label={t("queue.moveUp")}
                          >
                            {ARROW_UP_ICON_URL ? <img loading="lazy" decoding="async" src={ARROW_UP_ICON_URL} alt="" className="queue-row-btn-icon" /> : "▲"}
                          </button>
                        </HoverTip>
                        <HoverTip
                          as="div"
                          focusable={false}
                          className="queue-btn-tip"
                          content={<span className="ct-tip-desc">{t("queue.moveDown")}</span>}
                        >
                          <button
                            type="button"
                            className="queue-row-btn"
                            disabled={i === queue.length - 1}
                            onClick={() => moveQueueItem(state, i, i + 1)}
                            aria-label={t("queue.moveDown")}
                          >
                            {ARROW_DOWN_ICON_URL ? <img loading="lazy" decoding="async" src={ARROW_DOWN_ICON_URL} alt="" className="queue-row-btn-icon" /> : "▼"}
                          </button>
                        </HoverTip>
                        <HoverTip
                          as="div"
                          focusable={false}
                          className="queue-btn-tip"
                          content={<span className="ct-tip-desc">{t("queue.remove")}</span>}
                        >
                          <button
                            type="button"
                            className="queue-row-btn queue-row-remove"
                            onClick={() => dequeueAction(state, i)}
                            aria-label={t("queue.remove")}
                          >
                            ✕
                          </button>
                        </HoverTip>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
