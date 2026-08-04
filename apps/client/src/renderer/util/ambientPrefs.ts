// Ambient-Cockpit (Task #311, Chef-GO "Effekt-Cockpit"): persistierte Slider-/Schalter-Werte für
// den app-weiten Ambient-Layer (components/AmbientEffects.tsx + components/AmbientCanvas.tsx).
// Reine Anzeige-Vorlieben wie uiPrefs.ts — KEIN Save-State-Feld, KEIN SAVE_VERSION-Bump.
//
// Task #317 (Chef-Korrektur 2026-07-24, "wo ist das Bloom hin? Eigentlich brauchen wir nur das
// Vignette"): der Wetter-Rückbau vom selben Tag ist zu weit gegangen und hat versehentlich auch
// das three.js-Bloom mit rausgerissen. Ziel-Endzustand jetzt: Vignette (CSS) + eine sehr dezente
// warme Licht-Wash-Ebene mit echtem Bloom (three.js, components/AmbientCanvas.tsx) — KEINE
// Partikel, KEINE Blessing-Kopplung, KEIN Vorschau-Dropdown, KEIN Film-Korn/Nebel/Fackellicht (die
// 3 CSS-Zusatzeffekte aus dem Wetter-Rückbau bleiben draußen, nur Vignette kehrt aus der reinen
// CSS-Suite zurück). Übrig bleiben: Master-Schalter + Vignette + Bloom-Stärke + Bloom-Schwelle.
//
// Anders als die meisten uiPrefs.ts-Regler werden diese Werte von Komponenten konsumiert, die NICHT
// über React-Re-Render aktualisiert werden (AmbientEffects setzt CSS-Custom-Properties imperativ,
// AmbientCanvas liest die Bloom-Werte direkt in seinem rAF-Loop) — deshalb gibt es hier (anders als
// in uiPrefs.ts) einen minimalen Pub/Sub (`subscribeAmbientPrefs`, Muster wie util/skillJump.ts):
// jeder Setter feuert `emit()`, Abonnenten synchronisieren ihren Zustand entsprechend.

const listeners = new Set<() => void>();
function emit(): void {
  for (const l of listeners) l();
}

/** AmbientEffects + AmbientCanvas abonnieren JEDE Prefs-Änderung (Master/Slider) — ein einziger
 *  Kanal reicht, da der Aufrufer ohnehin bei jedem Fire seinen vollständigen Zustand neu
 *  synchronisiert. */
export function subscribeAmbientPrefs(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/** Für den Hinweistext neben dem Master-Schalter in den Optionen (nicht der Gate selbst — s.
 *  Modul-JSDoc: reduced-motion bestimmt nur den DEFAULT, kein Dauer-Override). */
export function isReducedMotionPreferred(): boolean {
  return prefersReducedMotion();
}

// ─── Master-Schalter ───
// Default: AN — außer das OS bevorzugt reduzierte Bewegung UND der Spieler hat noch nie explizit
// gewählt (kein localStorage-Key). Eine bereits getroffene explizite Wahl (An ODER Aus) gewinnt
// danach immer, s. Chef-Vorgabe "prefers-reduced-motion → Master DEFAULT Aus" (nicht "immer Aus").
const ENABLED_KEY = "gr.ambient.enabled";

function readEnabled(): boolean {
  const raw = localStorage.getItem(ENABLED_KEY);
  if (raw === "1") return true;
  if (raw === "0") return false;
  return !prefersReducedMotion();
}

let enabled = readEnabled();

export function isAmbientEnabled(): boolean {
  return enabled;
}

export function setAmbientEnabled(value: boolean): void {
  enabled = value;
  localStorage.setItem(ENABLED_KEY, value ? "1" : "0");
  emit();
}

// ─── 0–100-Slider-Regler (Vignette/Bloom-Stärke/Bloom-Schwelle) ───
// Ein generischer Reader/Writer pro benanntem Key statt drei fast identischer Blöcke — die
// öffentliche API bleibt trotzdem benannt (getVignette/setVignette/…), damit Aufrufer
// (OptionControls/AmbientEffects/AmbientCanvas) genauso lesen wie bei den übrigen
// uiPrefs.ts-Reglern.
function clampPct(n: number): number {
  return Math.min(100, Math.max(0, Math.round(n)));
}

function makePctPref(key: string, def: number): [() => number, (v: number) => void] {
  let value = clampPct((() => {
    const raw = localStorage.getItem(key);
    const parsed = raw !== null ? Number(raw) : NaN;
    return Number.isFinite(parsed) ? parsed : def;
  })());
  const get = (): number => value;
  const set = (v: number): void => {
    value = clampPct(v);
    localStorage.setItem(key, String(value));
    emit();
  };
  return [get, set];
}

// Dezenter Default (Chef-Vorgabe: "Ambiente, kein Feuerwerk"). Chef-Endstand 2026-07-24:
// Bloom komplett entfernt ("Bloom können wir komplett als Option entfernen") — der Ambient-Layer
// ist nur noch Master + Vignette. Die alten gr.ambient.bloom*-localStorage-Keys bleiben bei
// Bestands-Nutzern einfach ungelesen liegen (harmlos).
const [getVignette, setVignette] = makePctPref("gr.ambient.vignette", 30);

export { getVignette, setVignette };
