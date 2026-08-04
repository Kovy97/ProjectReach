import { useEffect, useState } from "react";

/** Kandidaten-Schriftarten für Überschriften/Menüs (lokal gehostet, CSP-konform). */
const FONTS: Array<{ stack: string; name: string; note: string }> = [
  { stack: '"Metamorphous", serif', name: "Metamorphous", note: "Verspielt, fantasy" },
  { stack: '"Cinzel", serif', name: "Cinzel", note: "Gemeißelte Versalien, episch (LotR-Stil)" },
  { stack: '"Marcellus SC", serif', name: "Marcellus SC", note: "Elegante Versalien, edel & schlank" },
  // "Cormorant Garamond" entfernt (Task #316/B3): die gebündelte Datei war ein kaputter/stark
  // subgesetzter Dummy (fehlende Glyphen) — kein @font-face mehr dafür, s. base.css-Kommentar.
  { stack: '"IM Fell English SC", serif', name: "IM Fell English SC", note: "Aktuell — alter Buchdruck, rau" },
  { stack: '"MedievalSharp", cursive', name: "MedievalSharp", note: "Mittelalterlich, kantig" },
  { stack: '"Grenze Gotisch", serif', name: "Grenze Gotisch", note: "Moderne Fraktur, dunkel" },
];

/** Aktuell in styles.css gesetzte Überschriften-Schrift (Fallback: IM Fell English SC). */
function currentHead(): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue("--font-head").trim();
  return v || '"IM Fell English SC", serif';
}

export function FontPreview({ onClose }: { onClose: () => void }): JSX.Element {
  const [applied, setApplied] = useState<string>(currentHead);

  // Gewählte Schrift live auf die gesamte App anwenden (--font-head).
  useEffect(() => {
    document.documentElement.style.setProperty("--font-head", applied);
    // Beim Schließen den Inline-Override entfernen → fällt auf den Wert aus styles.css zurück.
    return () => {
      document.documentElement.style.removeProperty("--font-head");
    };
  }, [applied]);

  return (
    <div className="font-preview-overlay">
      <div className="font-preview-head">
        <div>
          <h2 style={{ margin: 0 }}>Schriftart-Vorschau</h2>
          <p className="muted" style={{ margin: "4px 0 0" }}>
            „Übernehmen" wendet die Schrift sofort auf die ganze App an. Sag mir, welche dir gefällt.
          </p>
        </div>
        <button className="primary" onClick={onClose}>
          Schließen
        </button>
      </div>

      <div className="font-preview-list">
        {FONTS.map((f) => (
          <div className={`font-preview-card${applied === f.stack ? " active" : ""}`} key={f.name}>
            <div className="font-preview-meta">
              <span className="font-preview-name">{f.name}</span>
              <span className="muted">{f.note}</span>
              <button className="font-apply-btn" onClick={() => setApplied(f.stack)}>
                {applied === f.stack ? "✓ Aktiv" : "Übernehmen"}
              </button>
            </div>
            <div className="font-preview-sample" style={{ fontFamily: f.stack }}>
              <div className="fp-title">Grim Reach</div>
              <div className="fp-heading">Charakter · Bestiarium · Schmieden</div>
              <div className="fp-menu">Neues Spiel — Spiel laden — Optionen</div>
              <div className="fp-misc">Level 42 · 1.250 Gold · ABCDEFG abcdefg 0123456789</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
