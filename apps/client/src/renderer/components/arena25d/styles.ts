import { ARENA25D_SUPPORTED } from "./flag";

/**
 * Task #330 — Styles NUR für den 2,5D-Arena-Prototyp, bewusst als JS-String statt einer statisch
 * importierten `.css`-Datei.
 *
 * Grund (Bundle-Beweis-Anforderung des Chef-Auftrags): ein `import "./x.css"` ist ein
 * unbedingter Seiteneffekt-Import — Rollup/Vite sammelt CSS-Importe während der Modul-Graph-
 * Traversierung EIN, unabhängig davon, ob das JS des importierenden Moduls später von der
 * Tree-Shaking-Stufe als toter Code erkannt wird (empirisch verifiziert: ein früherer Anlauf mit
 * `import "./arena25d.css"` in Arena25DStage.tsx ließ 0 Byte arena25d-JS im Produktions-Bundle
 * zurück, aber alle `.a25-*`-Selektoren tauchten trotzdem im finalen CSS-Bundle auf — inert, nie
 * von echtem DOM getroffen, aber eben doch vorhanden). Als JS-String hinter genau demselben
 * `ARENA25D_SUPPORTED`-Gate wie der Dev-Hotkey in `flag.ts` gefaltet, eliminiert derselbe
 * Konstanten-Falt-/Dead-Code-Pass, der dort bereits nachweislich funktioniert (s. README.md
 * "Bundle-Beweis"), auch diesen String + den `<style>`-Injection-Code vollständig aus
 * Produktions-Builds — NULL Bytes arena25d-Code (JS UND CSS) im Player-Bundle.
 */
const ARENA25D_CSS = `
.a25-root {
  position: absolute;
  inset: 0;
  z-index: 2; /* dieselbe Ebene wie .battle-arena-stage im Klassik-Zweig */
  overflow: hidden;
}
.a25-canvas {
  display: block;
  width: 100%;
  height: 100%;
}
/* Anker-Element: Position wird IMPERATIV per rAF gesetzt (transform, s. Arena25DStage.tsx) —
   React rührt "transform" hier nie an (steht nicht im JSX-style-Objekt), daher kein Kampf
   zwischen den beiden Schreibern. */
.a25-bar-anchor {
  position: absolute;
  left: 0;
  top: 0;
  width: 0;
  height: 0;
  pointer-events: none;
  will-change: transform;
}
/* Die eigentliche Plakette hängt am Anker und zentriert sich selbst darüber (reines CSS,
   ändert sich nie zur Laufzeit — der Anker-Transform macht die ganze Bewegungsarbeit). */
.a25-bar-card {
  position: absolute;
  transform: translate(-50%, -100%);
  width: 168px;
  padding-bottom: 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  pointer-events: none;
}
.a25-bar-name {
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-head);
  font-size: 13px;
  color: #f5ecd6;
  text-shadow: 0 1px 2px #000, 0 0 5px rgba(0, 0, 0, 0.9);
  white-space: nowrap;
  margin-bottom: 2px;
}
/* .fighter-level-badge ist bereits global (combat.css) — hier nur größenneutral eingebunden. */
.a25-bar-name .fighter-level-badge {
  font-size: 11px;
}
.a25-bar-card .cbar {
  width: 100%;
}
.a25-dimmed .a25-bar-card {
  opacity: 0.55;
  filter: grayscale(0.4) blur(0.5px);
}
/* Task #330d Punkt 7 ("Status-Effekte auf Gegnern fehlt") — schlanker Ersatz für den 2D-
   .fighter-effects-overlay-Positionierungs-Wrapper (der ist auf ein absolut positioniertes
   Eck-Overlay AN der Figur zugeschnitten, s. Arena25DStage.tsx StatusEffectRow-JSDoc): reiner
   Flow-Wrapper, reiht sich zwischen Name und HP-Balken in dieselbe schwebende Karte ein. Die
   .effect-badge-Chips selbst bleiben die unveränderte globale Klasse aus combat.css, hier nur
   kompakter (die Karte ist 168px breit, das 2D-Original steht frei neben der vollen Figur). */
.a25-status-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 4px;
  margin-bottom: 3px;
  pointer-events: none;
}
.a25-status-row .effect-badge {
  font-size: 14px;
  padding: 2px 7px;
  border-radius: 6px;
  white-space: nowrap;
}
/* Task #330b: sichtbarer Aktivierungs-Beweis — Chef stand vor der 2D-Ansicht und hielt das
   getauschte Hintergrundbild für den Prototyp. Bewusst grell/unübersehbar (Dev-Instrumentierung,
   kein Spieler-UI-Polish nötig). */
.a25-badge {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 5;
  padding: 4px 10px;
  background: rgba(20, 14, 8, 0.85);
  border: 1px solid #ffb347;
  border-radius: 4px;
  color: #ffcf87;
  font-family: monospace;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-shadow: 0 1px 2px #000;
  pointer-events: none;
}
`;

let injected = false;

/** Hängt die arena25d-Styles genau einmal als `<style>`-Tag an `<head>` — no-op außerhalb von
 *  Dev-Builds (s. Modul-JSDoc) und beim zweiten Aufruf (Guard gegen doppeltes Mounting/HMR). */
export function injectArena25dStyles(): void {
  if (!ARENA25D_SUPPORTED || injected || typeof document === "undefined") return;
  injected = true;
  const style = document.createElement("style");
  style.setAttribute("data-arena25d-styles", "");
  style.textContent = ARENA25D_CSS;
  document.head.appendChild(style);
}
