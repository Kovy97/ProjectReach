import { useEffect, useState } from "react";
import "../styles/flip-reveal.css";

/**
 * Welle PP (Erstfund-Flip, Antizipation-Moment 4): dünner Wrapper, der eine "Silhouette → echter
 * Inhalt"-Karte (Bestiarium-Monster beim ersten Kill, Beute-Chip beim Erstfund) sichtbar aufflippen
 * lässt — 3D-Flip, ~500ms, EINMALIG beim Live-Übergang. Der Aufrufer entscheidet über `flipping`
 * (true nur für das kurze Zeitfenster direkt nach dem erkannten Übergang, s. BestiaryPage.tsx
 * `flippingMonsters`/`flippingItems`) — außerhalb dieses Fensters rendert diese Komponente NUR
 * `backContent` direkt, ganz ohne Flip-Wrapper-Overhead (der Normalfall: die überwiegende Mehrheit
 * der Karten ist entweder schon lange bekannt oder noch nie entdeckt, beides braucht keinen Flip).
 *
 * `frontContent` ist die Silhouette-Darstellung, die der Spieler bis eben sah (auch wenn die
 * zugrunde liegende Wahrheit — Kill-Zähler/`discoveredItems` — zum Render-Zeitpunkt bereits
 * "bekannt" ist); `backContent` die frisch enthüllte Darstellung.
 */
export function FlipReveal({
  flipping,
  frontContent,
  backContent,
  className,
}: {
  flipping: boolean;
  frontContent: JSX.Element;
  backContent: JSX.Element;
  className?: string;
}): JSX.Element {
  const [rotated, setRotated] = useState(false);

  useEffect(() => {
    if (!flipping) {
      setRotated(false);
      return;
    }
    // Erst NACH dem ersten Paint (still zeigt die Vorderseite) die Klasse setzen, die den
    // eigentlichen CSS-`transition`-Flip auslöst — sonst gäbe es nichts zu transitionieren.
    const raf = window.requestAnimationFrame(() => setRotated(true));
    return () => window.cancelAnimationFrame(raf);
  }, [flipping]);

  if (!flipping) return backContent;

  return (
    <div className={`flip-reveal${className ? ` ${className}` : ""}`}>
      <div className={`flip-reveal-inner${rotated ? " flipped" : ""}`}>
        <div className="flip-reveal-face flip-reveal-face--front">{frontContent}</div>
        <div className="flip-reveal-face flip-reveal-face--back">{backContent}</div>
      </div>
    </div>
  );
}
