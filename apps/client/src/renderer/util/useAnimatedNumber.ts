import { useEffect, useRef, useState } from "react";
import { getCombatFxLevel } from "./uiPrefs";

/** Ease-out-Kubik — schneller Start, sanftes Abbremsen zum Zielwert. */
function easeOutCubic(t: number): number {
  const inv = 1 - t;
  return 1 - inv * inv * inv;
}

/**
 * Welle OO (Chef-GO "UI-Juice Stufe 1", Moment 4 "Odometer"): ob der Zahlen-Tween überhaupt
 * laufen soll — `prefers-reduced-motion` (OS) ODER die spielinterne FX-Stufe auf "off" (Options-
 * menü, s. uiPrefs.ts `CombatFxLevel` — derselbe Toggle wie Kampf-/Belohnungs-Effekte, hier
 * wiederverwendet statt dupliziert, da dieser Hook selbst kein "reduced"-Zwischending kennt: ein
 * Zahlen-Tween ist entweder an oder aus, es gibt keine Bewegungs-/Flash-Unterscheidung wie bei
 * Kampf-Effekten). Bei "off" springt der Anzeigewert sofort auf das Ziel (s. `useAnimatedNumber`
 * unten) — betrifft u.a. die Shop-Goldanzeige und die Offline-Bühne-Medaillons.
 */
function shouldAnimateNumbers(): boolean {
  if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
    return false;
  }
  return getCombatFxLevel() !== "off";
}

/**
 * Sanftes Zahlen-Tween für Topbar-Zähler (Gold, ggf. Quest-Tokens) — Geschmeidigkeits-Bundle
 * (Chef-GO 2026-07-09): statt bei jeder State-Änderung hart auf den neuen Wert zu springen,
 * tweent die Anzeige über ~400ms (ease-out) dorthin. Rein visuell — der zurückgegebene Wert dient
 * NUR der Anzeige, niemals als Datenquelle (der echte Wert bleibt z.B. state.character.gold).
 *
 * Läuft eine Animation noch, wenn der Zielwert erneut wechselt (mehrere Gold-Ticks kurz
 * hintereinander), startet die neue Animation NICHT beim alten Ziel, sondern beim zuletzt
 * gerenderten Zwischenstand (`displayRef`) — dadurch bleibt die Bewegung bei schnellen
 * Folge-Änderungen durchgängig glatt statt zu ruckeln. Bei großen Sprüngen bleibt die Dauer FEST
 * (~400ms, Chef-Vorgabe) — die Schrittweite pro Frame skaliert automatisch mit der Sprunggröße.
 *
 * rAF-getrieben (kein Interval), cancelt sauber bei erneutem Zielwechsel UND beim Unmount.
 * Respektiert `prefers-reduced-motion` UND die spielinterne FX-Stufe (s. `shouldAnimateNumbers`
 * oben) wie der Rest der Belohnungs-Juice-Effekte — springt dann direkt auf den Zielwert statt
 * zu tweenen.
 */
export function useAnimatedNumber(target: number, durationMs = 400): number {
  const [display, setDisplay] = useState(target);
  const displayRef = useRef(target);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (target === displayRef.current) return; // kein echter Sprung — nichts zu tweenen.

    if (!shouldAnimateNumbers()) {
      displayRef.current = target;
      setDisplay(target);
      return;
    }

    const from = displayRef.current;
    const delta = target - from;
    const startTime = performance.now();

    const step = (now: number): void => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / durationMs);
      const next = from + delta * easeOutCubic(t);
      displayRef.current = next;
      setDisplay(next);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        rafRef.current = null;
      }
    };
    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, durationMs]);

  return display;
}
