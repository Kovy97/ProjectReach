/**
 * claude:2026-10-30T21:00:00+01:00 — Dev-UI-Stil „Synty“ (Chef 30.10.): Laufzeit-Teil. Wird ausschließlich über den dynamischen Import in main.tsx
 * geladen (nur Dev-Server oder Build mit `SYNTY_UI=1`). Er zieht die Stil-CSS (data-ui-style="synty") und löst die Bild-URLs über
 * `import.meta.glob` auf; die CSS enthält KEIN statisches url() auf Synty-Bilder, sondern nur `var(--synty-<name>)`. Die Variablen setzt
 * initSynty() am <html>. Bausteine entstehen mit ui-audit/synty/build-synty-assets.py.
 */
import "../styles/synty-frames.css";
import "../styles/synty-skin.css";
import { setUiIconOverride } from "../uiIcons";

const BILDER = import.meta.glob("../assets/ui/synty/*.{webp,png}", { eager: true, query: "?url", import: "default" }) as Record<string, string>;

const SYMBOLE = import.meta.glob("../assets/ui/synty/icons/*.webp", { eager: true, query: "?url", import: "default" }) as Record<string, string>;
const SYMBOL_BY_NAME: Record<string, string> = {};
for (const [pfad, url] of Object.entries(SYMBOLE)) SYMBOL_BY_NAME[pfad.slice(pfad.lastIndexOf("/") + 1).replace(/\.webp$/, "")] = url;

export function initSynty(): void {
  // Symbole nur im Synty-Stil umleiten (Zuordnung: ui-audit/synty/build-synty-assets.py ICONS; Unklares bleibt beim Bestand).
  setUiIconOverride((name) => (document.documentElement.dataset.uiStyle === "synty" ? (SYMBOL_BY_NAME[name] ?? null) : null));
  const root = document.documentElement;
  for (const [pfad, url] of Object.entries(BILDER)) {
    const name = pfad.slice(pfad.lastIndexOf("/") + 1).replace(/\.(webp|png)$/, "");
    root.style.setProperty(`--synty-${name}`, `url("${url}")`);
  }
}
