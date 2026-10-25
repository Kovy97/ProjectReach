/**
 * claude:2026-10-25T18:09:00+01:00 — Chef 25.10.: Knopf-Stile für Seitenleiste und Kopfleiste als wählbare Profile („Mache für jeden dieser
 * Buttons ein Button-Profil und mach in den Settings die Möglichkeit, selbst auszusuchen“). Die Profile stammen aus dem
 * Knopf-Editor (design/ui-fundament/button-editor.html); Flächen sind gebacken (design/ui-fundament/bake-nav-texture.py).
 *
 * Reine Anzeige-Einstellung im localStorage wie der Oberflächen-Stil (uiStyle.ts), kein SAVE-Bump. `data-nav-skin` am <html>
 * wählt die CSS-Variablen `--nav-skin-*` (styles/chrome.css); wirkt nur im Reforged-Stil.
 */
import { useSyncExternalStore } from "react";

export const NAV_SKINS = ["wood", "moss", "basalt", "leather"] as const;
export type NavSkin = (typeof NAV_SKINS)[number];

/** Vorgabe = zuletzt vom Chef ausprobiertes Profil (Leder mit Slot-Rahmen, 25.10.). */
export const DEFAULT_NAV_SKIN: NavSkin = "leather";

const STORAGE_KEY = "hearthforge:navSkin";

export const NAV_SKIN_LABEL_KEY: Record<NavSkin, string> = {
  wood: "options.navSkin.wood",
  moss: "options.navSkin.moss",
  basalt: "options.navSkin.basalt",
  leather: "options.navSkin.leather",
};

function istGueltig(wert: string | null): wert is NavSkin {
  return (NAV_SKINS as readonly string[]).includes(wert ?? "");
}

export function ladeNavSkin(): NavSkin {
  try {
    const gespeichert = localStorage.getItem(STORAGE_KEY);
    if (istGueltig(gespeichert)) return gespeichert;
  } catch {
    /* privater Modus o.ä. — dann eben die Vorgabe */
  }
  return DEFAULT_NAV_SKIN;
}

let aktuell: NavSkin = ladeNavSkin();
const hoerer = new Set<() => void>();

export function wendeNavSkinAn(skin: NavSkin): void {
  document.documentElement.dataset.navSkin = skin;
}

export function setzeNavSkin(skin: NavSkin): void {
  try {
    localStorage.setItem(STORAGE_KEY, skin);
  } catch {
    /* nicht speicherbar — die Wahl gilt dann nur für diese Sitzung */
  }
  aktuell = skin;
  wendeNavSkinAn(skin);
  for (const h of hoerer) h();
}

export function initNavSkin(): void {
  wendeNavSkinAn(aktuell);
}

function abonniere(h: () => void): () => void {
  hoerer.add(h);
  return () => hoerer.delete(h);
}

/** Aktuelles Profil als React-Zustand; wirkt sofort beim Umschalten. */
export function useNavSkin(): NavSkin {
  return useSyncExternalStore(abonniere, () => aktuell);
}
