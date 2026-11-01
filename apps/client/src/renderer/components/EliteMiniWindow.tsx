import { useState } from "react";
import { content } from "@hearthforge/content";
import { isEliteZoneHuntable } from "@hearthforge/engine";
import type { GameState } from "@hearthforge/shared";
import { useGameSelector, tupleEquals } from "../game/GameContext";
import { useI18n } from "../i18n";
import { getEliteMonsterSrc } from "../monsters";
import { formatMmSs } from "../util/format";
import { jumpToElite } from "../util/monsterJump";
import {
  getEliteMiniCollapsed,
  getEliteMiniPos,
  setEliteMiniCollapsed,
  setEliteMiniPos,
} from "../util/uiPrefs";
import { FLOATING_EDGE_MARGIN, useFloatingPanel } from "../util/useFloatingPanel"; // claude:2026-10-31T11:57:41+01:00 — gemeinsames Fenster-Verhalten (1.4.2)
import "../styles/elite-mini-window.css";

/** Muss mit `.emw-panel { width: … }` in elite-mini-window.css übereinstimmen — nur für die
 *  Default-Positionsberechnung (rechtsbündig unter der TopBar) beim allerersten Erscheinen. */
const PANEL_WIDTH = 260;

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
  return { x: Math.max(FLOATING_EDGE_MARGIN, window.innerWidth - PANEL_WIDTH - 22), y: 190 };
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

  // claude:2026-10-31T11:57:41+01:00 — Positionierung, Drag (Window-Listener + blur), Klemmung und Persistenz liegen jetzt in
  // util/useFloatingPanel.ts (unverändert herausgezogen, das Pin-Fenster nutzt dasselbe Muster). Verhalten wie bisher.
  const { panelRef, handleDragStart } = useFloatingPanel({
    readPos: getEliteMiniPos,
    writePos: setEliteMiniPos,
    defaultPos,
    draggingClass: "emw-panel--dragging",
  });

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
                // claude:2026-10-25T10:32:00+01:00 — B1 (1.4.1): zur Champion-Karte der Zone springen, nicht
                // zur normalen Karte des Grundmonsters (Spieler kämpfte sonst gegen den falschen Gegner).
                onClick={() => jumpToElite(zone.id, variant.baseMonsterId)} // claude:2026-10-25T13:11:00+01:00 — Grundmonster als Rückfall
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
