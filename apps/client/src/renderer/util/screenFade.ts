/**
 * Bildschirm-Übergang „Fade zu Schwarz / Fade aus Schwarz" (Chef-Kurswechsel 26.08.2026, im
 * Zuge des Main-Menu-War-Table-Reworks Runde 2): New/Load werden später eigene Screens mit
 * Übergang; diese kleine Singleton-Bus-Utility ist das Fundament dafür — schon JETZT genutzt für
 * FORTSETZEN/Laden im Hauptmenü (s. MainMenu.tsx), später hängen sich die neuen Screens an
 * dieselbe Funktion.
 *
 * Modul-State statt React-Context (gleiches Muster wie util/toastBus.ts, util/skillJump.ts,
 * util/monsterJump.ts): `<ScreenFade/>` muss AUSSERHALB von `Root()` (App.tsx) gemountet sein,
 * damit die Deckschicht den Screen-Wechsel (Menü → Spiel, GameContext `screen`-State) überlebt —
 * ein React-Context, der innerhalb des wechselnden Baums läge, würde beim Remount selbst
 * mitgetauscht und die Animation abreißen.
 */

type Listener = (opacity: number) => void;

let opacity = 0;
const listeners = new Set<Listener>();

function notify(): void {
  for (const listener of listeners) listener(opacity);
}

/** `<ScreenFade/>` abonniert hierüber die aktuelle Deckkraft (0 = unsichtbar, 1 = Schwarzbild). */
export function subscribeScreenFade(listener: Listener): () => void {
  listeners.add(listener);
  listener(opacity);
  return () => listeners.delete(listener);
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false);
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

/** Muss zur CSS-Transition in styles/menu.css (`.screen-fade`) passen. */
export const SCREEN_FADE_MS = 350;
// reduced-motion: kein Blend, aber ein kurzer bewusster Schnitt statt eines unmotivierten
// Schwarzbild-Flashs (dasselbe Prinzip wie IntroSequence.tsx EMBER_LEAD_MS_REDUCED).
const SCREEN_FADE_MS_REDUCED = 120;

/**
 * Blendet auf Schwarz, ruft währenddessen `duringBlack` auf (z. B. `loadGame`/`startNewGame` —
 * darf ein Promise zurückgeben, der Fade-Out wartet darauf) und blendet danach wieder auf.
 */
export async function runWithScreenFade(duringBlack: () => void | Promise<void>): Promise<void> {
  const reduced = prefersReducedMotion();
  const holdMs = reduced ? SCREEN_FADE_MS_REDUCED : SCREEN_FADE_MS;

  opacity = 1;
  notify();
  await wait(holdMs);

  await duringBlack();

  // Ein kurzer Frame, damit der neue Screen (MainLayout/CharacterCreation) bereits gemountet ist,
  // BEVOR die Schwarzblende wieder aufhellt — sonst sähe man einen unfertigen ersten Frame.
  await wait(reduced ? 0 : 30);

  opacity = 0;
  notify();
}
