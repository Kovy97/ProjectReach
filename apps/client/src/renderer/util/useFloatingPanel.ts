import { useEffect, useLayoutEffect, useRef } from "react";
import type { PointerEvent as ReactPointerEvent, RefObject } from "react";

/**
 * claude:2026-10-31T11:57:41+01:00 — Gemeinsames Verhalten der schwebenden, verschiebbaren Fenster (1.4.2): unverändert aus
 * EliteMiniWindow.tsx herausgezogen, damit das Fenster „Angepinnte Rezepte“ genau dasselbe Muster nutzt (Chef 31.10.: „wie der
 * Counter für Champions“). Enthält: Position vor dem ersten Paint setzen, Drag am Kopf über Window-Listener (move/up/cancel +
 * blur gegen Alt-Tab, Chef-Bugfix 2026-07-24 „Fenster klebt an der Maus“), Klemmung in den Viewport bei Drag-Ende und
 * Fenstergröße-Änderung, Persistenz erst am Drag-Ende, Unmount mitten im Zug räumt nur die Listener ab.
 */

export interface FloatingPos {
  x: number;
  y: number;
}

/** Mindestabstand zum Viewport-Rand (wie bisher im Elite-Fenster). */
export const FLOATING_EDGE_MARGIN = 8;

/** Klemmt eine Fensterposition so, dass ein Fenster der Größe w×h ganz im Viewport bleibt (Rand `FLOATING_EDGE_MARGIN`). */
export function clampFloatingPos(pos: FloatingPos, w: number, h: number): FloatingPos {
  return {
    x: Math.min(Math.max(FLOATING_EDGE_MARGIN, pos.x), Math.max(FLOATING_EDGE_MARGIN, window.innerWidth - w - FLOATING_EDGE_MARGIN)),
    y: Math.min(Math.max(FLOATING_EDGE_MARGIN, pos.y), Math.max(FLOATING_EDGE_MARGIN, window.innerHeight - h - FLOATING_EDGE_MARGIN)),
  };
}

export interface FloatingPanelOptions {
  /** Gespeicherte Position (localStorage) oder `null`, wenn noch nie verschoben. */
  readPos: () => FloatingPos | null;
  /** Speichert die Position (nur am Drag-Ende). */
  writePos: (pos: FloatingPos) => void;
  /** Startposition beim allerersten Erscheinen. */
  defaultPos: () => FloatingPos;
  /** CSS-Klasse, die während des Ziehens am Fenster hängt. */
  draggingClass: string;
  /**
   * Zusätzlich neu klemmen, wenn sich die Fenstergröße selbst ändert (ResizeObserver, nicht persistiert). Das Elite-Fenster
   * braucht das nicht (fester Inhalt); das Pin-Fenster wächst mit seinen Zeilen und beim Aufklappen.
   */
  reclampOnSizeChange?: boolean;
}

export interface FloatingPanel {
  panelRef: RefObject<HTMLDivElement>;
  /** An den Kopf hängen (`onPointerDown`). Klicks auf Knöpfe im Kopf zählen nicht als Drag. */
  handleDragStart: (e: ReactPointerEvent<HTMLElement>) => void;
}

export function useFloatingPanel(opts: FloatingPanelOptions): FloatingPanel {
  const panelRef = useRef<HTMLDivElement>(null);
  const posRef = useRef<FloatingPos | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; startLeft: number; startTop: number; pointerId: number } | null>(null);
  if (posRef.current === null) posRef.current = opts.readPos() ?? opts.defaultPos();
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const applyPos = (pos: FloatingPos): void => {
    const el = panelRef.current;
    if (!el) return;
    el.style.left = `${pos.x}px`;
    el.style.top = `${pos.y}px`;
  };

  // Position VOR dem ersten Paint anwenden (useLayoutEffect statt useEffect, Muster Sidebar-/TopBar-Rand-Handle) — sonst blitzt
  // das Fenster kurz an der falschen Stelle auf. Läuft während eines aktiven Drags NICHT (der Drag-Handler bestimmt die Position
  // dann selbst), sonst risse ein Re-Render (z. B. der 10-Hz-Countdown) das Fenster mitten im Ziehen zurück.
  useLayoutEffect(() => {
    if (dragRef.current) return;
    applyPos(posRef.current!);
  });

  // Defensive Re-Klemmung bei Fenstergröße-Änderung (Fenster kann seit dem letzten Speichern kleiner geworden sein).
  useEffect(() => {
    const onResize = (): void => {
      if (dragRef.current || !panelRef.current) return;
      const rect = panelRef.current.getBoundingClientRect();
      const next = clampFloatingPos({ x: rect.left, y: rect.top }, rect.width, rect.height);
      posRef.current = next;
      applyPos(next);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Optional: neu klemmen, wenn das Fenster selbst wächst/schrumpft (nur für Fenster mit variablem Inhalt, s. Option).
  // Läuft nach jedem Render erneut an, weil das Fenster bei „nichts anzuzeigen“ unmountet und später neu erscheint.
  const observedRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<ResizeObserver | null>(null);
  useEffect(() => {
    if (!optsRef.current.reclampOnSizeChange || typeof ResizeObserver === "undefined") return;
    const el = panelRef.current;
    if (el === observedRef.current) return;
    observerRef.current?.disconnect();
    observedRef.current = el;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      if (dragRef.current || !panelRef.current) return;
      const rect = panelRef.current.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return;
      const next = clampFloatingPos({ x: rect.left, y: rect.top }, rect.width, rect.height);
      if (next.x === rect.left && next.y === rect.top) return;
      posRef.current = next;
      applyPos(next);
    });
    ro.observe(el);
    observerRef.current = ro;
  });
  useEffect(() => () => observerRef.current?.disconnect(), []);

  const dragCleanupRef = useRef<(() => void) | null>(null);

  const handleDragStart = (e: ReactPointerEvent<HTMLElement>): void => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest("button")) return; // Einklapp-Button nicht als Drag werten
    const el = panelRef.current;
    if (!el || dragRef.current) return;
    e.preventDefault();
    const rect = el.getBoundingClientRect();
    const drag = { startX: e.clientX, startY: e.clientY, startLeft: rect.left, startTop: rect.top, pointerId: e.pointerId };
    dragRef.current = drag;
    const draggingClass = optsRef.current.draggingClass;

    const removeListeners = (): void => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onEnd);
      window.removeEventListener("pointercancel", onEnd);
      window.removeEventListener("blur", onBlur);
      el.classList.remove(draggingClass);
      dragRef.current = null;
      dragCleanupRef.current = null;
    };

    const finish = (): void => {
      removeListeners();
      const r = el.getBoundingClientRect();
      const next = clampFloatingPos({ x: r.left, y: r.top }, r.width, r.height);
      posRef.current = next;
      applyPos(next);
      optsRef.current.writePos(next);
    };

    const onMove = (ev: PointerEvent): void => {
      if (ev.pointerId !== drag.pointerId) return;
      el.style.left = `${drag.startLeft + (ev.clientX - drag.startX)}px`;
      el.style.top = `${drag.startTop + (ev.clientY - drag.startY)}px`;
    };

    const onEnd = (ev: PointerEvent): void => {
      if (ev.pointerId !== drag.pointerId) return;
      finish();
    };

    // Alt-Tab/Fokusverlust mitten im Zug: Drag sauber beenden und letzte Position übernehmen.
    const onBlur = (): void => {
      finish();
    };

    dragCleanupRef.current = removeListeners;
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onEnd);
    window.addEventListener("pointercancel", onEnd);
    window.addEventListener("blur", onBlur);
    el.classList.add(draggingClass);
  };

  // Unmount mitten im Zug (Fenster verschwindet): nur Listener abräumen, KEINE Position persistieren — das Element ist dann ggf.
  // schon aus dem DOM und würde (0,0) speichern.
  useEffect(() => () => dragCleanupRef.current?.(), []);

  return { panelRef, handleDragStart };
}
