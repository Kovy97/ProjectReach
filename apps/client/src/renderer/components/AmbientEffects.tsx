import { useEffect, useRef } from "react";
import { getVignette, isAmbientEnabled, subscribeAmbientPrefs } from "../util/ambientPrefs";
import "../styles/ambient.css";

/**
 * Ambient-Layer-Mount (Task #311 → Wetter-Rückbau 2026-07-24 → Chef-Korrektur Task #317, selber
 * Tag: "wo ist das Bloom hin? Eigentlich brauchen wir nur das Vignette"). Einziger Mount-Punkt
 * (App.tsx) für den kompletten app-weiten Ambient-Layer — zwei Teile, ein Wrapper:
 * - `.amb-vignette`: reine CSS-Vignette (radialer Rand-Abdunkler, styles/ambient.css).
 * - `<AmbientCanvas />`: die three.js-Licht-Wash-Ebene mit echtem Bloom (s. dortige JSDoc für die
 *   Architektur-Details — opaker schwarzer Canvas + `mix-blend-mode:screen`, Stacking-Context,
 *   DPR-Deckel, rAF-Stopp, Priming-Render).
 * Film-Korn/Nebel-Drift/Fackel-Ecklicht (Blessing-Wetter-Ära) sind ENTFERNT und bleiben es —
 * Chef-Entscheidung Task #317: "nur das Vignette" (+ das wiederhergestellte Bloom).
 *
 * Dieser Effect setzt nur die eine `--amb-vignette-opacity`-Variable + die `amb-off`-Klasse
 * (Master) einmalig beim Mount + bei jeder Slider-/Master-Änderung (subscribeAmbientPrefs, s.
 * util/ambientPrefs.ts) auf dem Wrapper. AmbientCanvas liest Bloom-Werte unabhängig selbst.
 *
 * App-weit, VOR <Root/> gemountet (App.tsx) — läuft unabhängig vom Screen (Menü/
 * Charaktererstellung/Hauptspiel) und vom GameState, reine Wanduhr-/localStorage-Vorlieben.
 */
export function AmbientEffects(): JSX.Element {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    function sync(): void {
      root!.classList.toggle("amb-off", !isAmbientEnabled());
      root!.style.setProperty("--amb-vignette-opacity", String((getVignette() / 100) * 0.55));
    }

    sync();
    const unsubscribe = subscribeAmbientPrefs(sync);
    return unsubscribe;
  }, []);

  /* Chef-Endstand 2026-07-24 („Bloom können wir komplett als Option entfernen"): Der three.js-
     Bloom-Canvas ist restlos raus — der Ambient-Layer ist nur noch die CSS-Vignette. three.js
     bleibt als Dependency (2,5D-Arena-Prototyp components/arena25d nutzt es). */
  return (
    <div ref={rootRef} className="ambient-root">
      <div className="amb-vignette" />
    </div>
  );
}
