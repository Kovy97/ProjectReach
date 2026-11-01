/**
 * Asset-Werkstatt, Zuendschnur (Chef-Auftrag 30.10.2026). NUR Deutsch, bewusst ohne i18n:
 * reines Entwickler-Werkzeug fuer den Chef, kein Spielerfeature (s. assetLab.tsx).
 *
 * Das ist die EINZIGE Stelle, die ausserhalb des Werkzeugs geladen wird: ein einziger keydown-Listener
 * (Strg+Umschalt+Alt+A) plus ein winziger localStorage-Check. Das eigentliche Modul assetLab.tsx
 * (React, Asset-Liste, Stil) wird erst beim ersten Oeffnen per dynamischem import() nachgeladen.
 * Ausgeschaltet kostet die Werkstatt nichts: kein Render, keine weiteren Listener.
 * Ausnahme: liegen gespeicherte Overrides vor, wird das Modul beim Start einmal (ohne Panel) geladen,
 * damit der Chef seine Versuche nach einem Neustart weiter sieht.
 */

const LS_KEY = "hearthforge:assetLab";

// claude:2026-10-30T18:07:00+01:00
export function initAssetLabHotkey(): void {
  let mod: Promise<typeof import("./assetLab")> | null = null;
  const load = (): Promise<typeof import("./assetLab")> => (mod ??= import("./assetLab"));

  // Kollisionspruefung 30.10.: App.tsx/ShopPage werten Ziffern nur ohne Strg/Alt, arena25d/flag.ts
  // nutzt Strg+Umschalt (ohne Alt); Strg+Umschalt+Alt+A ist frei.
  window.addEventListener("keydown", (e) => {
    if (!e.ctrlKey || !e.shiftKey || !e.altKey || e.metaKey || e.code !== "KeyA") return;
    e.preventDefault();
    load()
      .then((m) => m.toggleAssetLab())
      .catch((err) => {
        mod = null;
        console.error("[asset-werkstatt] Laden fehlgeschlagen", err);
      });
  });

  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw && /"overrides"\s*:\s*\[\s*\{/.test(raw)) {
      window.setTimeout(() => {
        load()
          .then((m) => m.bootAssetLab())
          .catch(() => {
            mod = null;
          });
      }, 0);
    }
  } catch {
    /* localStorage gesperrt: keine gespeicherten Overrides */
  }
}
