import { useState } from "react";
import type { CSSProperties, DragEvent, FocusEvent, KeyboardEvent, MouseEvent, PointerEvent, ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * App-weite Citadel-Tooltip-Grundlage (Chef-Auftrag „Tooltip-Vereinheitlichung", 2026-07-23):
 * Portal an document.body (entkommt jedem `overflow:hidden` seines Panels) + Citadel-Holzrahmen +
 * Flip-Positionierung gegen Verdeckung — dasselbe Muster, das EquipmentOverview.tsx's AttrTooltip
 * als erstes etabliert hat (`.attr-tip`). Der GLOW-Rahmen (innerer farbiger Ring) bleibt exklusiv
 * den Attribut-Karten vorbehalten (Chef-Vorgabe) — alle anderen Aufrufer lassen `glow` weg und
 * bekommen die reine `.ct-tip`-Basis. Siehe styles/components.css für die CSS-Definition.
 */

export interface CitadelTipAnchor<T> {
  data: T;
  rect: DOMRect;
}

/**
 * Hover/Fokus-State für ein an ein DOM-Rect verankertes Tooltip. `open` nimmt eine Nutzlast (oder
 * `true`, wenn der Aufrufer keine braucht, s. `HoverTip`) + das Hover-Element selbst — das Rect
 * wird EINMAL beim Öffnen eingefroren (kein Resize-Tracking nötig, Tooltips sind kurzlebig).
 */
export function useCitadelTip<T = true>(): {
  tip: CitadelTipAnchor<T> | null;
  open: (data: T, el: HTMLElement) => void;
  close: () => void;
} {
  const [tip, setTip] = useState<CitadelTipAnchor<T> | null>(null);
  return {
    tip,
    open: (data: T, el: HTMLElement) => setTip({ data, rect: el.getBoundingClientRect() }),
    close: () => setTip(null),
  };
}

export interface CitadelTipProps {
  rect: DOMRect;
  /**
   * "auto" (Default, Referenz-Verhalten): über dem Hover-Element verankert, kippt bei zu wenig
   * Platz nach unten — horizontal zentriert + an die Ränder geklammert. "right": rechts vom
   * Element (Sidebar-Muster, z.B. BlessingPanel), kippt bei zu wenig Platz nach links.
   */
  placement?: "auto" | "right";
  /** Innerer Glow-Ring — exklusiv den Attribut-Karten vorbehalten. Alle anderen Aufrufer lassen
   *  dies weg (Default false), damit der Glow ein eindeutiges Attribut-Signal bleibt. */
  glow?: boolean;
  /** Nur mit glow=true relevant: Randfarbe des Glow-Rings (fällt sonst auf --gold zurück). Auch
   *  ohne Glow färbt sie den `.ct-tip-title` (falls verwendet) — s. components.css. */
  glowColor?: string;
  className?: string;
  children: ReactNode;
}

const EDGE_MARGIN = 128; // hält die Kartenmitte vom Bildschirmrand fern (Referenzwert aus .attr-tip)
const RIGHT_MIN_SPACE = 260; // grobe Mindestbreite fürs "right"-Placement, sonst Flip nach links

/**
 * Portal-Tooltip im Citadel-Look, verankert an einem DOM-Rect. Kein Ref-basiertes Nachmessen der
 * eigenen Größe (bewusst — dasselbe leichtgewichtige Verfahren wie die Referenz-Implementierung:
 * `max-width` ist bekannt, die Ränder werden mit einem groben, aber sicheren Abstand geklammert).
 */
export function CitadelTip({ rect, placement = "auto", glow = false, glowColor, className, children }: CitadelTipProps): JSX.Element {
  let style: CSSProperties;
  if (placement === "right") {
    const spaceRight = window.innerWidth - rect.right;
    const goRight = spaceRight > RIGHT_MIN_SPACE;
    style = {
      position: "fixed",
      left: goRight ? rect.right + 10 : undefined,
      right: goRight ? undefined : window.innerWidth - rect.left + 10,
      top: Math.min(Math.max(rect.top, 12), window.innerHeight - 200),
    };
  } else {
    const cx = rect.left + rect.width / 2;
    const above = rect.top > 96; // genug Platz oben? sonst nach unten kippen (nie unterm Cursor/Element)
    style = {
      position: "fixed",
      left: Math.min(Math.max(cx, EDGE_MARGIN), window.innerWidth - EDGE_MARGIN),
      top: above ? rect.top - 8 : rect.bottom + 8,
      transform: above ? "translate(-50%, -100%)" : "translate(-50%, 0)",
    };
  }
  if (glow || glowColor) (style as Record<string, string>)["--attr-color"] = glowColor ?? "var(--gold)";
  return createPortal(
    <div className={`ct-tip${glow ? " ct-tip-glow" : ""}${className ? ` ${className}` : ""}`} role="tooltip" style={style}>
      {children}
    </div>,
    document.body,
  );
}

export type HoverTipTag = "span" | "div";

/**
 * Generischer 1:1-Ersatz fürs häufigste Konvertierungsmuster (früher `title="..."`): umschließt
 * einen Hover-Trigger, zeigt bei Hover/Fokus das glowlose `<CitadelTip>` mit `content`. Für die
 * aufwendigeren Sonderfälle (Attribut-Glow, Blessing-Panel-Anker, Diff-Namens-Legende) direkt
 * `useCitadelTip`/`CitadelTip` verwenden — dieser Wrapper deckt nur den einfachen Fall ab.
 */
export function HoverTip({
  as = "span",
  content,
  placement = "auto",
  focusable = true,
  children,
  className,
  role,
  onClick,
  onKeyDown,
  onContextMenu,
  onDragOver,
  onDrop,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  elementRef,
}: {
  as?: HoverTipTag;
  content: ReactNode;
  placement?: "auto" | "right";
  /** false für Badges, die bereits INNERHALB eines fokussierbaren Elements (z.B. `<button>`)
   *  sitzen — vermeidet einen doppelten/verschachtelten Tab-Stopp. */
  focusable?: boolean;
  children: ReactNode;
  className?: string;
  /** ARIA-Rolle des äußeren Elements — z.B. "button" für klickbare Chips (New Haven Fix
   *  27.08.: Baukosten-Materialien öffnen jetzt per Klick das Item-Wiki). */
  role?: string;
  /** Bug-Fix 27.08.2026 (Chef-Meldung „Materialien nicht klickbar"): dieselbe Passthrough-
   *  Konvention wie die Pointer-/Drag-Callbacks unten — der Hover-Tooltip bleibt unverändert,
   *  ein Klick ist rein additiv. */
  onClick?: (e: MouseEvent<HTMLElement>) => void;
  onKeyDown?: (e: KeyboardEvent<HTMLElement>) => void;
  onContextMenu?: (e: MouseEvent<HTMLElement>) => void;
  onDragOver?: (e: DragEvent<HTMLElement>) => void;
  onDrop?: (e: DragEvent<HTMLElement>) => void;
  // Pointer-Event-Durchreichung (Action-Queue-Drag&Drop, ActionQueuePanel.tsx): dieselbe
  // Passthrough-Konvention wie onContextMenu/onDragOver/onDrop oben.
  onPointerDown?: (e: PointerEvent<HTMLElement>) => void;
  onPointerMove?: (e: PointerEvent<HTMLElement>) => void;
  onPointerUp?: (e: PointerEvent<HTMLElement>) => void;
  onPointerCancel?: (e: PointerEvent<HTMLElement>) => void;
  /** Callback-Ref auf das äußere DOM-Element (nur `as="div"` — der einzige bisherige Bedarf,
   *  s. ActionQueuePanel.tsx: braucht `offsetTop`/`setPointerCapture`/direkte Style-Mutation
   *  fürs Drag-Reordering). */
  elementRef?: (el: HTMLDivElement | null) => void;
}): JSX.Element {
  const { tip, open, close } = useCitadelTip<true>();
  const shared = {
    className,
    role,
    onClick,
    onKeyDown,
    onMouseEnter: (e: MouseEvent<HTMLElement>) => open(true, e.currentTarget),
    onMouseLeave: close,
    onContextMenu,
    onDragOver,
    onDrop,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    ...(focusable
      ? {
          tabIndex: 0,
          onFocus: (e: FocusEvent<HTMLElement>) => open(true, e.currentTarget),
          onBlur: close,
        }
      : {}),
  };
  const body = (
    <>
      {children}
      {tip && (
        <CitadelTip rect={tip.rect} placement={placement}>
          {content}
        </CitadelTip>
      )}
    </>
  );
  return as === "div" ? <div ref={elementRef} {...shared}>{body}</div> : <span {...shared}>{body}</span>;
}
