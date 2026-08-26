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
    // 1.0-Fixrunde FIX 1: das Ziel kann in einem EIGENEN Scroll-Container sitzen (z.B. die
    // Sidebar-Nav, .sb-nav overflow-y:auto) und dort außerhalb des sichtbaren Bereichs liegen —
    // `.guide-target` macht es per CSS zwar klickbar (pointer-events:auto !important, s.
    // onboarding-guide.css), bleibt aber UNSICHTBAR (New-Haven-Bug: FEATURE_TOUR_STEPS_V2
    // spotlightet einen Sidebar-Eintrag, der bei 1920×1080 unterm Footer verschwindet, kein
    // sichtbarer Scroll-Hinweis). `scrollIntoView` holt das Ziel zuverlässig in den sichtbaren
    // Bereich — bei jedem Zielwechsel UND erneut bei Fenstergrößenänderung (`scrollTarget`),
    // NIE bei einem simplen Scroll-Event (sonst kämpft das gegen manuelles Scrollen des
    // Spielers). Kein "smooth" — die Rect-Messung direkt danach braucht die Endposition SOFORT,
    // nicht erst nach der Scroll-Animation.
    // 1.0.2 (Tester-Befund „Der Gründliche"): Scrollen hilft nur bei Zielen, die AUSSERHALB des
    // sichtbaren Bereichs liegen — nicht bei Zielen in einem ZUGEKLAPPTEN Behälter. Der
    // Optionen-Schritt zeigt auf einen Knopf in der Fußleisten-Schublade der Seitenleiste, die
    // im Normalzustand geschlossen ist: Die Blase sagte „klicke auf die hervorgehobene Stelle",
    // und es war keine zu sehen. Der Rundgang war an dieser Stelle für jeden neuen Spieler
    // nicht abschliessbar, ausser er erriet die Schublade. Bewusst allgemein gehalten: jedes
    // Ziel ohne Ausdehnung, das in der Fußleiste steckt, klappt sie selbst auf.
    // Geprüft wird SICHTBARKEIT, nicht Größe: die geschlossene Schublade lässt ihre Knöpfe
    // vollständig ausgemessen (239x37), schiebt sie aber unter den Fensterrand. Eine
    // Null-Größen-Prüfung greift deshalb nicht.
    const revealIfCollapsed = (el: HTMLElement | null): boolean => {
      if (!el) return false;
      const r = el.getBoundingClientRect();
      const imBild = r.width > 1 && r.height > 1 && r.bottom <= window.innerHeight && r.top >= 0;
      if (imBild) return false;
      const footer = el.closest(".sb-footer");
      if (!footer || footer.classList.contains("is-open")) return false;
      footer.querySelector<HTMLElement>(".sb-footer-drawer-tab")?.click();
      return true;
    };

    const recompute = (scrollTarget: boolean): void => {
      const found = findSpotlightTarget(guideId);
      if (revealIfCollapsed(found.el)) {
        // Das Aufklappen ist eine React-Zustandsänderung: Direkt nach dem Klick steht das alte
        // Layout noch. Deshalb NICHT sofort nachmessen, sondern im nächsten Frame neu rechnen,
        // wenn die Schublade wirklich offen ist.
        requestAnimationFrame(() => recompute(true));
        return;
      }
      const targetChanged = found.el !== currentEl;
      if (targetChanged) {
        currentEl?.classList.remove("guide-target");
        currentEl = found.el;
        currentEl?.classList.add("guide-target");
      }
      if (currentEl && (targetChanged || scrollTarget)) {
        currentEl.scrollIntoView({ block: "center", inline: "nearest", behavior: "auto" });
      }
      // Nach einem evtl. scrollIntoView neu messen — die vorher gefundene rect ist sonst stale.
      setRect(findSpotlightTarget(guideId).rect);
      if (bubbleRef.current) {
        setBubbleHeight(bubbleRef.current.offsetHeight);
        setBubbleWidth(bubbleRef.current.offsetWidth);
      }
    };
    recompute(true);
    const onResize = (): void => recompute(true);
    const onScroll = (): void => recompute(false);
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll, true);
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

  // Blasen-Position: prüft alle VIER Seiten des Ziels (unten/oben/rechts/links) und wählt die
  // erste, die die Blase WIRKLICH vollständig aufnimmt — nicht nur "unten, außer zu wenig Platz"
  // wie zuvor. 1.0.1-Fix (Spieler-Bugreport „Farming-Button im Tutorial fast komplett verdeckt"):
  // ein schmales Ziel weit unten im Bildschirm (z.B. ein Sidebar-Eintrag) hatte oft weder oben
  // noch unten genug Platz für die volle Blasenhöhe — die alte Logik wich trotzdem nur vertikal
  // aus und die anschließende Viewport-Klammerung zog die Blase dann zurück ÜBER das Ziel selbst.
  // Jetzt weicht ein schmales Randziel stattdessen zur freien Seite (rechts/links) aus, wo meist
  // reichlich Platz ist. Passt KEINE Seite vollständig (extrem seltener Fall, z.B. ein riesiges
  // Ziel auf einem sehr kleinen Fenster), fällt es best-effort auf die Seite mit dem meisten Platz
  // zurück — echte Überschneidung ist dann geometrisch nicht mehr zu vermeiden.
  let bubbleStyle: CSSProperties;
  if (!rect) {
    bubbleStyle = { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
  } else {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const bubbleH = bubbleHeight ?? FALLBACK_BUBBLE_HEIGHT;
    const bubbleW = bubbleWidth ?? FALLBACK_BUBBLE_WIDTH;
    const gap = SPOTLIGHT_PAD + 14; // Abstand Spotlight-Ring ↔ Blase

    const space = {
      below: vh - (rect.top + rect.height) - gap,
      above: rect.top - gap,
      right: vw - (rect.left + rect.width) - gap,
      left: rect.left - gap,
    };
    const need = { below: bubbleH, above: bubbleH, right: bubbleW, left: bubbleW };
    const order: Array<keyof typeof space> = ["below", "above", "right", "left"];
    const side = order.find((s) => space[s] >= need[s]) ?? order.reduce((a, b) => (space[b] > space[a] ? b : a));

    let top: number;
    let left: number;
    let transform: string;
    if (side === "below" || side === "above") {
      top = side === "below" ? rect.top + rect.height + gap : rect.top - gap - bubbleH;
      top = Math.min(Math.max(top, VIEWPORT_MARGIN), vh - bubbleH - VIEWPORT_MARGIN);
      left = Math.min(
        Math.max(rect.left + rect.width / 2, bubbleW / 2 + VIEWPORT_MARGIN),
        vw - bubbleW / 2 - VIEWPORT_MARGIN,
      );
      transform = "translateX(-50%)";
    } else {
      left = side === "right" ? rect.left + rect.width + gap : rect.left - gap - bubbleW;
      left = Math.min(Math.max(left, VIEWPORT_MARGIN), vw - bubbleW - VIEWPORT_MARGIN);
      top = Math.min(
        Math.max(rect.top + rect.height / 2, bubbleH / 2 + VIEWPORT_MARGIN),
        vh - bubbleH / 2 - VIEWPORT_MARGIN,
      );
      transform = "translateY(-50%)";
    }
    bubbleStyle = { top, left, transform };
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
            <button type="button" className="btn-iron" onClick={onAdvance}>
              {continueLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
