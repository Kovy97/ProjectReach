import { useEffect, useRef, useState } from "react";
import { MainMenu } from "./MainMenu";
import { startMusic } from "../util/music";

/**
 * Asset-Contract (Muster util/audio.ts `ELITE_HORN_FILES`): der Studio-Trailer kommt vom Chef und
 * lag beim Anlegen dieser Sequenz noch nicht zwingend vor. `import.meta.glob` macht ein leeres
 * Match-Objekt zu einem stillen No-op statt einem Build-Fehler — fehlt die Datei, bleibt
 * `studioIntroUrl` `null` und die GESAMTE Intro-Phase wird übersprungen (s. `useState`-Init unten):
 * kein schwarzer Blitz, kein Timing-Rest, der Start verhält sich exakt wie vor dieser Sequenz.
 */
const STUDIO_INTRO_FILES = import.meta.glob<string>("../assets/video/studio_intro.mp4", {
  eager: true,
  query: "?url",
  import: "default",
});
const studioIntroUrl: string | null = Object.values(STUDIO_INTRO_FILES)[0] ?? null;

type Phase = "trailer" | "black" | "embers" | "revealed";

const BLACK_HOLD_MS = 800; // Schwarz-Phase nach Video-Ende (Chef-Choreografie Schritt 2)
const EMBER_LEAD_MS = 1000; // Funken-only-Vorlauf vor dem Fade-in (Schritt 3 → 4)
const EMBER_LEAD_MS_REDUCED = 150; // reduced-motion: nichts zu sehen (Funken selbst sind dann per
// menu.css bereits `display:none`) — kurz halten statt eine leere Wartezeit erzwingen.

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false);
}

/**
 * Modul-Flag statt React-State (Chef-Vorgabe: „Dev-HMR darf die Sequenz nicht bei jedem
 * Hot-Reload neu abspielen — einmal pro echtem App-Start"): überlebt sowohl Dev-HMR anderer Module
 * als auch jeden Re-Mount INNERHALB derselben Session (Menü → Spiel → „Zurück zum Menü" mountet
 * `IntroSequence` erneut, s. App.tsx `Root()`). Nur ein echter Prozess-Neustart (frischer
 * Modul-Kontext) setzt es zurück. Wird SOFORT beim Entschluss "die Sequenz läuft jetzt" gesetzt
 * (nicht erst am Ende) — ein sehr kurzlebiger Re-Mount mitten in Trailer/Schwarz soll die
 * Choreografie beim nächsten Mount nicht ein zweites Mal von vorn zeigen.
 */
let introConsumedThisRun = false;

/**
 * Studio-Intro-Sequenz (Chef-Choreografie, wörtlich umgesetzt): Vollbild-Trailer auf Schwarz →
 * Schwarz hält kurz (~0,8s) → Menü-Ambient-Funken beginnen (noch auf Schwarz; Menü-Musik startet
 * zeitgleich) → nach ~1s faded der Rest des Hauptmenüs (Hero-Art/Logo/Buttons/Save-Slots) sanft
 * ein. Jeder Klick/Tastendruck während Trailer ODER Schwarz springt sofort zur Funken-Phase (s.
 * `skip`). Fehlt das Video-Asset — oder lief die Sequenz in dieser Session schon einmal — startet
 * direkt in "revealed": exakt das heutige Verhalten, kein Overhead. Rein lokaler Zustand, kein
 * Save-Touch.
 */
export function IntroSequence(): JSX.Element {
  // StrictMode-Falle (Chef-Report „kein Trailer gesehen", 2026-07-22): React ruft useState-
  // Initialisierer im Dev doppelt auf — ein Seiteneffekt darin (Flag setzen) ließ den ZWEITEN
  // Aufruf „schon verbraucht" sehen und die Sequenz überspringen. Deshalb: Initialisierer PUR
  // (nur lesen), das Flag wird erst im Mount-Effekt gesetzt (doppeltes Setzen dort ist harmlos,
  // der State bleibt über StrictModes simulierten Remount erhalten).
  const [phase, setPhase] = useState<Phase>(() =>
    studioIntroUrl && !introConsumedThisRun ? "trailer" : "revealed",
  );
  useEffect(() => {
    introConsumedThisRun = true;
  }, []);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Funken-Phase: Menü-Musik startet zeitgleich (Schritt 3); nach dem Vorlauf faded der Rest ein.
  useEffect(() => {
    if (phase !== "embers") return;
    startMusic();
    const leadMs = prefersReducedMotion() ? EMBER_LEAD_MS_REDUCED : EMBER_LEAD_MS;
    const id = window.setTimeout(() => setPhase("revealed"), leadMs);
    return () => window.clearTimeout(id);
  }, [phase]);

  // Schwarz-Phase: ~0,8s halten, dann Funken.
  useEffect(() => {
    if (phase !== "black") return;
    const id = window.setTimeout(() => setPhase("embers"), BLACK_HOLD_MS);
    return () => window.clearTimeout(id);
  }, [phase]);

  // Trailer-Phase: abspielen, bei Ende → Schwarz. Verweigertes Autoplay/kaputte Datei blockiert
  // die Sequenz nicht — direkt zur Funken-Phase (dieselbe Großzügigkeit wie der fehlende Asset-Fall).
  useEffect(() => {
    if (phase !== "trailer") return;
    const v = videoRef.current;
    if (!v) return;
    const toBlack = (): void => setPhase("black");
    const toEmbers = (): void => setPhase("embers");
    v.addEventListener("ended", toBlack);
    v.addEventListener("error", toEmbers);
    void v.play().catch(toEmbers);
    return () => {
      v.removeEventListener("ended", toBlack);
      v.removeEventListener("error", toEmbers);
    };
  }, [phase]);

  // Skip (Schritt 5): jeder Klick/Tastendruck während Trailer ODER Schwarz springt SOFORT zur
  // Funken-Phase — kein Settings-Toggle, das ist die Standard-Erwartung ab dem 2. echten Start.
  useEffect(() => {
    if (phase !== "trailer" && phase !== "black") return;
    const skip = (): void => setPhase("embers");
    window.addEventListener("pointerdown", skip);
    window.addEventListener("keydown", skip);
    return () => {
      window.removeEventListener("pointerdown", skip);
      window.removeEventListener("keydown", skip);
    };
  }, [phase]);

  const showOverlay = phase === "trailer" || phase === "black";
  const showMenu = phase === "embers" || phase === "revealed";

  return (
    <>
      {showOverlay && (
        <div className="intro-overlay" aria-hidden="true">
          {phase === "trailer" && studioIntroUrl && (
            <video ref={videoRef} className="intro-video" src={studioIntroUrl} autoPlay playsInline />
          )}
        </div>
      )}
      {/* `revealed` steuert nur Hero-Art/Logo/Nav/Panel/Fußzeile — die Ambient-Funken darin steigen
          ab dem allerersten Mount dieser Instanz (Funken-Phase) sofort auf, s. MainMenu-JSDoc. */}
      {showMenu && <MainMenu revealed={phase === "revealed"} />}
    </>
  );
}
