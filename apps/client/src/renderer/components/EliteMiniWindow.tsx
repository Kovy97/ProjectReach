import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { content } from "@hearthforge/content";
import { isEliteZoneHuntable } from "@hearthforge/engine";
import type { GameState } from "@hearthforge/shared";
import { useGameSelector, tupleEquals } from "../game/GameContext";
import { useI18n } from "../i18n";
import { getEliteMonsterSrc } from "../monsters";
import { formatMmSs } from "../util/format";
import { jumpToMonster } from "../util/monsterJump";
import {
  getEliteMiniCollapsed,
  getEliteMiniPos,
  setEliteMiniCollapsed,
  setEliteMiniPos,
} from "../util/uiPrefs";
import "../styles/elite-mini-window.css";

/** Muss mit `.emw-panel { width: … }` in elite-mini-window.css übereinstimmen — nur für die
 *  Default-Positionsberechnung (rechtsbündig unter der TopBar) beim allerersten Erscheinen. */
const PANEL_WIDTH = 260;
const EDGE_MARGIN = 8;

const NO_ACTIVE = ["", "", 0] as const;

/**
 * Primitiv-Tupel-Selector (Perf-Welle Block A-Muster, s. GameContext.tsx-JSDoc): iteriert
 * `content.zones` (statisch, keine State-Referenz) und liefert den DRINGENDSTEN aktiven Elite
 * (kleinstes `remainingMs`) über ALLE freigeschalteten Zonen mit Elite-Content — dieselbe
 * Ableitung wie `eliteBoardStatusForZone`/BountyBoard.tsx, hier aber auf EINEN Eintrag verdichtet
 * (das Mini-Fenster zeigt "den aktuellen Elite", nicht eine Liste). Läuft app-weit (das Fenster
 * mountet global in App.tsx, nicht nur auf der Slayer-Seite) — deshalb bewusst NICHT
 * `useGameState()` (voller 10-Hz-Re-Render auf JEDER Seite), sondern dieses schmale Tupel: solange
 * NIRGENDS ein Elite aktiv ist (der weit überwiegende Teil der Spielzeit, s. elites.ts-
 * Cooldown-Bänder), bleibt das Tupel `["", "", 0]` unverändert → keine Re-Renders. Nur während der
 * ~15-Minuten-Fenster EINES gespawnten Champions tickt `remainingMs` (und damit das Tupel) im
 * vollen Takt — exakt dann, wenn der Countdown auch wirklich sichtbar sein muss.
 */
function activeEliteSelector(s: GameState): readonly [string, string, number] {
  let best: readonly [string, string, number] = NO_ACTIVE;
  for (const zone of content.zones) {
    const entry = s.eliteZones?.[zone.id];
    if (!entry || !("variantId" in entry)) continue;
    if (!content.elites?.[entry.variantId]) continue; // Content-Drift-Schutz (Muster eliteBoardStatusForZone)
    // Zugangs-Gate (Fix 1.0.1): freigeschaltet UND jagdbar — `isEliteZoneHuntable` fasst den
    // früheren Doppel-Check (Varianten vorhanden + `isZoneUnlocked`) zusammen und schließt
    // zusätzlich Zonen aus, deren Champions auf dungeonOnly-Basen sitzen (idolhall): dort gibt es
    // keine Zonen-Karte, der „Zum Monster"-Sprung dieses Fensters liefe ins Leere.
    if (!isEliteZoneHuntable(s, content, zone.id)) continue;
    if (best[0] === "" || entry.remainingMs < best[2]) {
      best = [zone.id, entry.variantId, entry.remainingMs];
    }
  }
  return best;
}

function defaultPos(): { x: number; y: number } {
  // Default: oben-rechts unter der TopBar (Chef-Vorgabe) — 190px räumt die TopBar bei ihrer
  // Standardhöhe (TOPBAR_HEIGHT_DEFAULT=168px, uiPrefs.ts) frei; bei stark vergrößerter TopBar
  // (Rand-Handle, bis 256px) kann es einmalig überlappen — das Fenster ist frei verschiebbar,
  // die gewählte Position wird sofort persistiert. right:22px spiegelt .toast-stack (Toasts
  // sitzen unten-rechts, keine Kollision, s. Bericht).
  return { x: Math.max(EDGE_MARGIN, window.innerWidth - PANEL_WIDTH - 22), y: 190 };
}

function clamp(pos: { x: number; y: number }, w: number, h: number): { x: number; y: number } {
  return {
    x: Math.min(Math.max(EDGE_MARGIN, pos.x), Math.max(EDGE_MARGIN, window.innerWidth - w - EDGE_MARGIN)),
    y: Math.min(Math.max(EDGE_MARGIN, pos.y), Math.max(EDGE_MARGIN, window.innerHeight - h - EDGE_MARGIN)),
  };
}

/**
 * Schwebendes, verschiebbares + einklappbares Elite-/Kopfgeld-Mini-Fenster (Spieler-Feedback
 * 0.2.2 Punkt 3): ersetzt das frühere Inline-Kopfgeld-Brett (BountyBoard.tsx, saß fest auf der
 * Slayer-Seite und belegte dort Platz) — zeigt app-weit den dringendsten aktiven Champion (Name,
 * Zone, Countdown, Sprung-Button), ohne im Hauptinterface Platz zu belegen. Mountet global
 * (App.tsx, neben Toasts/ActionQueuePanel) und rendert `null`, solange NIRGENDS ein Elite aktiv
 * ist — dieselbe Sichtbarkeits-Bedingung wie der eingeklappte Badge-Zustand unten (ein Countdown
 * ohne aktiven Elite ergäbe keinen Sinn).
 *
 * Die Elite-Karte in der Zonen-Übersicht (CombatPage.tsx `zone-card-elite-badge`) UND die volle
 * Elite-Kampfkarte in der Monster-Liste einer Zone (`EliteMonsterCard`) bleiben UNBERÜHRT — beide
 * sind Teil des eigentlichen Kampf-Flows (Fight-Button), nicht der reinen Sichtungs-Anzeige, die
 * dieses Fenster ersetzt.
 */
export function EliteMiniWindow(): JSX.Element | null {
  const { t, tr } = useI18n();
  const [activeZoneId, activeVariantId, remainingMs] = useGameSelector(activeEliteSelector, tupleEquals);
  const [collapsed, setCollapsed] = useState(getEliteMiniCollapsed);

  const panelRef = useRef<HTMLDivElement>(null);
  const posRef = useRef<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; startLeft: number; startTop: number; pointerId: number } | null>(null);
  if (posRef.current === null) posRef.current = getEliteMiniPos() ?? defaultPos();

  const applyPos = (pos: { x: number; y: number }): void => {
    const el = panelRef.current;
    if (!el) return;
    el.style.left = `${pos.x}px`;
    el.style.top = `${pos.y}px`;
  };

  // Position VOR dem ersten Paint anwenden (useLayoutEffect statt useEffect, Muster Sidebar-/
  // TopBar-Rand-Handle) — sonst blitzt das Fenster kurz an der falschen Stelle auf. Läuft
  // während eines aktiven Drags NICHT (der Drag-Handler bestimmt die Position dann selbst) —
  // sonst würde der 10-Hz-Countdown-Re-Render (activeZoneId-Tupel ändert sich jeden Tick) die
  // Zeile mitten im Ziehen auf die alte Position zurückreißen.
  useLayoutEffect(() => {
    if (dragRef.current) return;
    applyPos(posRef.current!);
  });

  // Defensive Re-Klemmung bei Fenstergröße-Änderung (Fenster kann seit dem letzten Speichern
  // kleiner geworden sein).
  useEffect(() => {
    const onResize = (): void => {
      if (dragRef.current || !panelRef.current) return;
      const rect = panelRef.current.getBoundingClientRect();
      const next = clamp({ x: rect.left, y: rect.top }, rect.width, rect.height);
      posRef.current = next;
      applyPos(next);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  /* Chef-Bugfix 2026-07-24 („Fenster klebt manchmal an der Maus"): Vorher wurde die Pointer-
     Capture auf dem PANEL gesetzt, während Move/Up-Handler auf dem HEADER lagen — nach der
     Capture werden Events aufs Panel retargetet, wo kein Up-Handler lauscht: Loslassen außerhalb
     des Headers ging verloren, der Drag blieb aktiv. Jetzt das robuste Muster der Sidebar-/
     TopBar-Griffe: beim Start Window-Listener registrieren (move/up/cancel + blur für Alt-Tab),
     beim Ende alle entfernen. Kein setPointerCapture nötig. */
  const dragCleanupRef = useRef<(() => void) | null>(null);

  const handleDragStart = (e: ReactPointerEvent<HTMLDivElement>): void => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest("button")) return; // Einklapp-Button nicht als Drag werten
    const el = panelRef.current;
    if (!el || dragRef.current) return;
    e.preventDefault();
    const rect = el.getBoundingClientRect();
    const drag = { startX: e.clientX, startY: e.clientY, startLeft: rect.left, startTop: rect.top, pointerId: e.pointerId };
    dragRef.current = drag;

    const removeListeners = (): void => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onEnd);
      window.removeEventListener("pointercancel", onEnd);
      window.removeEventListener("blur", onBlur);
      el.classList.remove("emw-panel--dragging");
      dragRef.current = null;
      dragCleanupRef.current = null;
    };

    const onMove = (ev: PointerEvent): void => {
      if (ev.pointerId !== drag.pointerId) return;
      el.style.left = `${drag.startLeft + (ev.clientX - drag.startX)}px`;
      el.style.top = `${drag.startTop + (ev.clientY - drag.startY)}px`;
    };

    const onEnd = (ev: PointerEvent): void => {
      if (ev.pointerId !== drag.pointerId) return;
      removeListeners();
      const r = el.getBoundingClientRect();
      const next = clamp({ x: r.left, y: r.top }, r.width, r.height);
      posRef.current = next;
      applyPos(next);
      setEliteMiniPos(next);
    };

    // Alt-Tab/Fokusverlust mitten im Zug: Drag sauber beenden und letzte Position übernehmen.
    const onBlur = (): void => {
      removeListeners();
      const r = el.getBoundingClientRect();
      const next = clamp({ x: r.left, y: r.top }, r.width, r.height);
      posRef.current = next;
      applyPos(next);
      setEliteMiniPos(next);
    };

    dragCleanupRef.current = removeListeners;
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onEnd);
    window.addEventListener("pointercancel", onEnd);
    window.addEventListener("blur", onBlur);
    el.classList.add("emw-panel--dragging");
  };

  // Unmount mitten im Zug (Champion-Fenster läuft ab): nur Listener abräumen, KEINE Position
  // persistieren — das Element ist dann ggf. schon aus dem DOM und würde (0,0) speichern.
  useEffect(() => () => dragCleanupRef.current?.(), []);

  const handleToggleCollapsed = (): void => {
    setCollapsed((prev) => {
      const next = !prev;
      setEliteMiniCollapsed(next);
      return next;
    });
  };

  if (activeZoneId === "") return null; // kein Elite irgendwo aktiv → Fenster komplett unsichtbar

  const zone = content.zones.find((z) => z.id === activeZoneId);
  const variant = content.elites?.[activeVariantId];
  if (!zone || !variant) return null; // Content-Drift-Schutz (sollte der Selector schon ausschließen)

  const countdown = formatMmSs(remainingMs);
  const art = getEliteMonsterSrc(variant.id, variant.baseMonsterId);

  return (
    <div ref={panelRef} className={`emw-panel${collapsed ? " emw-panel--collapsed" : ""}`}>
      {collapsed ? (
        <button
          type="button"
          className="emw-badge"
          onClick={handleToggleCollapsed}
          title={`${t("elite.mini.expand")} · ${tr(variant.name)} (${countdown})`}
        >
          <span className="emw-badge-icon" aria-hidden="true">⚔</span>
          <span className="emw-badge-countdown">{countdown}</span>
        </button>
      ) : (
        <>
          <div
            className="emw-header"
            onPointerDown={handleDragStart}
          >
            <span className="emw-header-icon" aria-hidden="true">⚔</span>
            <span className="emw-header-title">{t("elite.mini.title")}</span>
            <button
              type="button"
              className="emw-collapse-btn"
              onClick={handleToggleCollapsed}
              title={t("elite.mini.collapse")}
              aria-label={t("elite.mini.collapse")}
            >
              –
            </button>
          </div>
          <div className="emw-body">
            <div className="emw-art" aria-hidden="true">
              {art ? <img loading="lazy" decoding="async" src={art} alt="" className="pixelart" /> : <span className="emw-art-ph">⚔</span>}
            </div>
            <div className="emw-info">
              <div className="emw-name">{tr(variant.name)}</div>
              <div className="emw-zone muted">{tr(zone.name)}</div>
              <div className="emw-countdown">{t("combat.elite.countdown").replace("{time}", countdown)}</div>
              <button
                type="button"
                className="shop-citadel-btn shop-citadel-btn--sm emw-jump"
                onClick={() => jumpToMonster(variant.baseMonsterId)}
              >
                {t("slayer.task.goToMonster")}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
