import { useEffect, useState } from "react";
import { subscribeScreenFade } from "../util/screenFade";
import type { ScreenFadeTone } from "../util/screenFade";

/**
 * Wiederverwendbare Bildschirm-Überblendung (Chef-Kurswechsel 26.08.2026) — ein schwarzes
 * Vollbild-Overlay, dessen Deckkraft über util/screenFade.ts (`runWithScreenFade`) gesteuert wird.
 * MUSS außerhalb von `Root()` gemountet sein (s. App.tsx), damit es einen Screen-Wechsel (Menü →
 * Spiel/Charaktererstellung) unbeschadet übersteht statt selbst mit zu remounten.
 *
 * Bleibt bei Deckkraft 0 dauerhaft im DOM (nur `opacity`+`pointer-events` wechseln) statt bedingt
 * gerendert zu werden — sonst gäbe es beim Ausblenden keinen CSS-Übergang, weil das Element im
 * selben Render verschwände, in dem `opacity` auf 0 gesetzt wird.
 */
export function ScreenFade(): JSX.Element {
  const [opacity, setOpacity] = useState(0);
  // claude:2026-10-18T14:00:00+02:00 — Ton "ash" für den Prestige-Aufstieg (screen-fade.css `.screen-fade--ash`).
  const [tone, setTone] = useState<ScreenFadeTone>("black");
  useEffect(() => subscribeScreenFade((o, t) => { setOpacity(o); setTone(t); }), []);
  return (
    <div
      className={`screen-fade${tone === "ash" ? " screen-fade--ash" : ""}`}
      style={{ opacity, pointerEvents: opacity > 0 ? "auto" : "none" }}
      aria-hidden="true"
    />
  );
}
