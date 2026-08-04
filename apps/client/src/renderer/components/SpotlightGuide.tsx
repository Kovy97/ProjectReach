import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { NpcSpeechBubble } from "./NpcGreeting";
import { registerEscCloser } from "../util/escStack";

/** Zusätzlicher Rand um das Zielelement, damit der Spotlight-Ring nicht direkt auf der Kante sitzt. */
const SPOTLIGHT_PAD = 6;
/** Mindestabstand zum Viewport-Rand (oben/unten/seitlich), damit die Blase nie an der Kante klebt. */
const VIEWPORT_MARGIN = 12;
/**
 * Geschätzte Blasenbreite/-höhe, bevor die erste echte Messung vorliegt (verhindert einen
 * Layout-Sprung beim allerersten Frame). Die Box-Größe ist seit dem Größen-Update
 * (Chef-Auftrag 2026-07-22, „Wächter deutlich größer") vw-gekoppelt und variiert daher mit der
 * Fenstergröße (s. styles/onboarding-guide.css .guide-bubble, clamp(620px,34vw,780px)) — statt
 * einen zweiten Satz Zahlen von Hand synchron zur CSS-Clamp-Formel zu halten, misst
 * `useLayoutEffect` unten die TATSÄCHLICHE gerenderte Breite/Höhe (bubbleRef.offsetWidth/-Height)
 * und diese Fallbacks greifen nur exakt einmal, vor dem allerersten Layout-Pass.
 */
const FALLBACK_BUBBLE_WIDTH = 660;
const FALLBACK_BUBBLE_HEIGHT = 380;

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** Sucht das aktuelle Ziel-Element + dessen Bounding-Rect. `null` guideId → kein Ziel (zentrierter Screen). */
function findSpotlightTarget(guideId: string | null): { el: HTMLElement | null; rect: Rect | null } {
  if (!guideId) return { el: null, rect: null };
  const el = document.querySelector<HTMLElement>(`[data-guide-id="${guideId}"]`);
  if (!el) return { el: null, rect: null };
  const r = el.getBoundingClientRect();
  return { el, rect: { top: r.top, left: r.left, width: r.width, height: r.height } };
}

export interface SpotlightGuideProps {
  /** `data-guide-id` des hervorzuhebenden DOM-Knotens, oder `null` für einen zentrierten, voll
   *  abgedunkelten Screen (Intro-/Abschluss-Schritte ohne konkretes Ziel). Wird das Element nicht
   *  gefunden (z.B. Ziel gerade nicht im aktuellen Sub-View gerendert), fällt die Anzeige
   *  automatisch auf denselben zentrierten Screen zurück — kein Fehlerzustand. */
  guideId: string | null;
  title: string;
  body: string;
  /** true: kein „Weiter"-Button — nur der Klick auf das echte Ziel (`onRequireActionClick`)
   *  schaltet weiter (erzwingt das tatsächliche Folgen). */
  requireAction: boolean;
  /** „Weiter"/„Los"-Button-Handler (nur sichtbar wenn `!requireAction`). */
  onAdvance: () => void;
  /** Klick auf das echte Spotlight-Ziel (nur verdrahtet wenn `requireAction`). */
  onRequireActionClick?: () => void;
  onSkip: () => void;
  skipLabel: string;
  continueLabel: string;
  hintLabel: string;
  speakerName: string;
  speakerPortraitSrc: string | null;
  /** Optionaler dritter Footer-Button neben Skip/Weiter (Report-Bug-Feature, Chef-Auftrag
   *  2026-07-18: kleiner Direktknopf im Abschluss-Schritt, öffnet den Bug-Report-Dialog). Rein
   *  additiv — `undefined` (der Normalfall, auch bei AreaTourGuide) rendert nichts Neues. */
  secondaryAction?: { label: string; onClick: () => void };
}

/**
 * Gemeinsames Spotlight-Overlay + Sprechblase — extrahiert aus dem früheren monolithischen
 * OnboardingGuide.tsx (Chef-Auftrag „Onboarding fertig machen" Welle B, 2026-07-13). Trägt sowohl
 * den Haupt-Guide (OnboardingGuide.tsx, Registry onboarding-steps.ts) als auch die drei
 * Bereichs-Erst-Touren (AreaTourGuide.tsx, Registry areaTourSteps.ts) — „auf demselben
 * Spotlight-System" (Chef-Vorgabe) heißt hier wörtlich: derselbe React-Baum, keine zweite
 * Implementierung der Rect-/Positionierungs-Mathematik.
 *
 * Rein präsentational: der Aufrufer hält den Schritt-Fortschritt (Engine-State beim Haupt-Guide,
 * lokaler `useState` bei den Bereichs-Touren) und übergibt bereits aufgelöste (lokalisierte)
 * Strings. Die Speaking-Head-Präsentation (Kopf-Medaillon + NpcSpeechBubble, Chef-GO 2026-07-13)
 * rahmt Titel+Text — ersetzt die frühere anonyme Textbox, Skip-/Weiter-Footer unverändert.
 */
export function SpotlightGuide({
  guideId,
  title,
  body,
  requireAction,
  onAdvance,
  onRequireActionClick,
  onSkip,
  skipLabel,
  continueLabel,
  hintLabel,
  speakerName,
  speakerPortraitSrc,
  secondaryAction,
}: SpotlightGuideProps): JSX.Element {
  const [rect, setRect] = useState<Rect | null>(null);
  const [bubbleHeight, setBubbleHeight] = useState<number | null>(null);
  const [bubbleWidth, setBubbleWidth] = useState<number | null>(null);
  const bubbleRef = useRef<HTMLDivElement | null>(null);

  // Globales Gating: body-Klasse setzt (via CSS, styles/onboarding-guide.css) pointer-events:none
  // auf die gesamte App außer dem aktiven Spotlight-Ziel + der Guide-Oberfläche selbst.
  // Mount/Unmount-getrieben — dieser Component wird nur gerendert, solange ein Guide/eine Tour
  // sichtbar ist (der Aufrufer entscheidet das VOR dem Render, s. OnboardingGuide/AreaTourGuide).
  useEffect(() => {
    document.body.classList.add("guide-active");
    return () => document.body.classList.remove("guide-active");
  }, []);

  // Escape schließt den Guide (Tester-Sweep 2, T9): SpotlightGuide registrierte bisher KEINEN
  // Escape-Closer — Escape tat hier schlicht nichts, obwohl jedes andere Overlay der App über
  // util/escStack.ts reagiert. Escape = exakt dieselbe Aktion wie der „Überspringen"-Button
  // (`onSkip`), auf der höchsten Priorität ("guide", s. escStack.ts PRIORITY_ORDER) — der Guide
  // blendet ohnehin fast den ganzen Screen ab (`.guide-active` oben), Escape soll IHN treffen,
  // nicht ein zufällig darunter registriertes Overlay. `onSkipRef` hält die jeweils neueste
  // Closure, ohne bei jedem Tick neu zu (de)registrieren — der Aufrufer (`useGameState()` in
  // OnboardingGuide/AreaTourGuide) re-rendert ~10×/s, `onSkip` wäre sonst bei jedem Render eine
  // neue Funktionsreferenz.
  const onSkipRef = useRef(onSkip);
  useEffect(() => {
    onSkipRef.current = onSkip;
  }, [onSkip]);
  useEffect(() => {
    return registerEscCloser("guide", () => onSkipRef.current());
  }, []);

  // Ziel-Element markieren (.guide-target → per CSS wieder klickbar) + dessen Rect für die
  // Spotlight-Aussparung messen. Reagiert auf Zielwechsel sowie Resize/Scroll (auch in
  // verschachtelten Scroll-Containern wie der Sidebar-Nav, dank capture:true auf "scroll").
  // Misst zugleich die ECHTE Höhe der Sprechblase (bubbleRef) — s. FALLBACK_BUBBLE_HEIGHT-Doc.
  useLayoutEffect(() => {
    let currentEl: HTMLElement | null = null;
    const recompute = (): void => {
      const found = findSpotlightTarget(guideId);
      if (found.el !== currentEl) {
        currentEl?.classList.remove("guide-target");
        currentEl = found.el;
        currentEl?.classList.add("guide-target");
      }
      setRect(found.rect);
      if (bubbleRef.current) {
        setBubbleHeight(bubbleRef.current.offsetHeight);
        setBubbleWidth(bubbleRef.current.offsetWidth);
      }
    };
    recompute();
    window.addEventListener("resize", recompute);
    window.addEventListener("scroll", recompute, true);
    return () => {
      window.removeEventListener("resize", recompute);
      window.removeEventListener("scroll", recompute, true);
      currentEl?.classList.remove("guide-target");
    };
  }, [guideId]);

  // requireAction-Schritte: der Klick auf das echte Ziel-Element ist die einzige Art
  // weiterzukommen (kein "Weiter"-Button) — das erzwingt das tatsächliche Folgen. Der Listener
  // greift nur ein, führt aber die eigentliche Aktion des Ziels (Navigation etc.) NICHT selbst
  // aus — der Klick läuft normal weiter zum echten onClick des Elements.
  useEffect(() => {
    if (!requireAction || !guideId || !onRequireActionClick) return;
    const onDocClick = (e: MouseEvent): void => {
      const target = e.target as HTMLElement | null;
      if (target?.closest(`[data-guide-id="${guideId}"]`)) onRequireActionClick();
    };
    document.addEventListener("click", onDocClick, true);
    return () => document.removeEventListener("click", onDocClick, true);
  }, [requireAction, guideId, onRequireActionClick]);

  // Blasen-Position: unter dem Ziel, außer darunter ist zu wenig Platz für die ECHTE (gemessene)
  // Blasenhöhe → dann darüber. Das Ergebnis wird zusätzlich hart auf den Viewport geklammert
  // (VIEWPORT_MARGIN), damit die Blase (inkl. "Weiter klicken"-Hinweis am unteren Rand) niemals
  // abgeschnitten wird, egal wie lang der Text oder wie tief/hoch das Ziel sitzt.
  let bubbleStyle: CSSProperties;
  if (!rect) {
    bubbleStyle = { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
  } else {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const bubbleH = bubbleHeight ?? FALLBACK_BUBBLE_HEIGHT;
    const bubbleHalfW = (bubbleWidth ?? FALLBACK_BUBBLE_WIDTH) / 2;
    const spaceBelow = vh - (rect.top + rect.height);
    const spaceAbove = rect.top;
    const below = spaceBelow >= bubbleH + SPOTLIGHT_PAD + 14 || spaceBelow >= spaceAbove;
    let top = below
      ? rect.top + rect.height + SPOTLIGHT_PAD + 14
      : rect.top - SPOTLIGHT_PAD - 14 - bubbleH;
    top = Math.min(Math.max(top, VIEWPORT_MARGIN), vh - bubbleH - VIEWPORT_MARGIN);
    const left = Math.min(
      Math.max(rect.left + rect.width / 2, bubbleHalfW + VIEWPORT_MARGIN),
      vw - bubbleHalfW - VIEWPORT_MARGIN,
    );
    bubbleStyle = { top, left, transform: "translateX(-50%)" };
  }

  return (
    <div className="onboarding-guide-root">
      {rect ? (
        <div
          className="guide-spotlight"
          style={{
            top: rect.top - SPOTLIGHT_PAD,
            left: rect.left - SPOTLIGHT_PAD,
            width: rect.width + SPOTLIGHT_PAD * 2,
            height: rect.height + SPOTLIGHT_PAD * 2,
          }}
        />
      ) : (
        <div className="guide-dim-full" />
      )}

      <div className="guide-bubble" style={bubbleStyle} ref={bubbleRef}>
        {/* Speaking-Head-Präsentation (Chef-GO 2026-07-13): Kopf-Medaillon + NpcSpeechBubble
            rahmen jetzt den Schritt-Text, statt einer anonymen Textbox. */}
        <div className="guide-bubble-speaker">
          <div className="npc-greeting-head" aria-hidden="true">
            {speakerPortraitSrc ? (
              <img loading="lazy" decoding="async" src={speakerPortraitSrc} alt="" className="npc-greeting-img" />
            ) : (
              <span className="npc-greeting-fallback">🗨</span>
            )}
          </div>
          <NpcSpeechBubble name={speakerName}>
            <h3 className="guide-bubble-title">{title}</h3>
            <p className="guide-bubble-body">{body}</p>
          </NpcSpeechBubble>
        </div>
        <div className="guide-bubble-footer">
          <button type="button" className="guide-bubble-skip" onClick={onSkip}>
            {skipLabel}
          </button>
          {secondaryAction && (
            <button type="button" className="guide-bubble-secondary" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </button>
          )}
          {requireAction ? (
            <span className="guide-bubble-hint">{hintLabel}</span>
          ) : (
            <button type="button" className="combat-btn" onClick={onAdvance}>
              {continueLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
