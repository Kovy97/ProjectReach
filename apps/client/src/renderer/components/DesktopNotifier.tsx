import { useEffect, useRef } from "react";
import type { GameState } from "@hearthforge/shared";
import { useGameControl, useGameStateMaybe } from "../game/GameContext";
import { useI18n } from "../i18n";
import { diffNotifications, takeSnapshot, throttleKinds } from "../util/desktopNotify";
import type { NotifyKind, NotifySnapshot } from "../util/desktopNotify";
import { isDesktopNotifyEnabled } from "../util/uiPrefs";

/**
 * claude:2026-10-31T16:34:28+01:00 — Desktop-Benachrichtigungen (1.4.2). Rendert nichts; sieht je Tick auf den Zustand
 * (Muster `Toasts.tsx`, `state.totalTicks` als Dep) und meldet über die Electron-Brücke: Held gefallen, Warteschlange leer
 * gelaufen, Slayer-Auftrag erfüllt, Großauftrag abgabebereit. Nur bei eingeschaltetem Opt-in und nicht fokussiertem
 * Fenster (zusätzlich prüft Main). Während der Rückkehr-Nachholung ruht die Diff und setzt danach neu an.
 */
export function DesktopNotifier(): null {
  const { t } = useI18n();
  const state = useGameStateMaybe();
  const { catchUp } = useGameControl();
  const stateRef = useRef<GameState | null>(null);
  const prevRef = useRef<NotifySnapshot | null>(null);
  const lastRef = useRef<Partial<Record<NotifyKind, number>>>({});
  const totalTicks = state?.totalTicks ?? 0;

  useEffect(() => {
    if (!state) {
      stateRef.current = null;
      prevRef.current = null;
      return;
    }
    // Neuer Spielstand (Laden, Neues Spiel, Aufstieg): Basis neu setzen, nichts melden.
    if (stateRef.current !== state || catchUp !== null || prevRef.current === null) {
      stateRef.current = state;
      prevRef.current = takeSnapshot(state);
      return;
    }
    const { kinds, next } = diffNotifications(prevRef.current, state);
    prevRef.current = next;
    if (kinds.length === 0) return;
    if (!isDesktopNotifyEnabled()) return;
    const bridge = window.hearthforge?.notify;
    if (!bridge || document.hasFocus()) return;
    for (const kind of throttleKinds(kinds, lastRef.current, Date.now())) {
      const body = t(`notify.${kind}.body`).replace("{name}", state.character.name);
      void bridge.show(t(`notify.${kind}.title`), body).catch(() => undefined);
    }
  }, [state, totalTicks, catchUp, t]);

  return null;
}
