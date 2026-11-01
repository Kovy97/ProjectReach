import React from "react";
import { GlobalTitleTip } from "./components/GlobalTitleTip";
import ReactDOM from "react-dom/client";
import { App } from "./App";
// Scene-Builder (Chef-Auftrag "Arena-Scene-Builder", reaktiviert 2026-08-04): der EINE externe
// Berührungspunkt des kompletten `components/arena25d/builder/`-Ordners — s. dortiges
// `flag.ts`/`index.ts`-Modul-JSDoc für die volle Isolations-/Bundle-Beweis-Begründung. Exakt
// dasselbe Zwei-Gates-Muster wie das bestehende `ARENA25D MOUNT SWITCH` in CombatPage.tsx: ein
// statischer Import + eine `import.meta.env.DEV`-gegatete Wert-Prüfung, die in Produktions-Builds
// zur literalen Konstante `false` gefaltet wird — der `<SceneBuilderApp/>`-Zweig unten ist dadurch
// in `pnpm build` toter, vom Minifier entfernter Code (s. Abschlussbericht "Bundle-Grep").
import { getSceneBuilderZoneId, SceneBuilderApp } from "./components/arena25d/builder";
import { initFontChoice } from "./fontChoice";
// claude:2026-10-24T18:20:00+02:00 — Textgröße (Normal/Groß/Sehr groß), s. textScale.ts.
import { initTextScale } from "./textScale";
// claude:2026-10-25T10:30:00+01:00 — 1.4.1 A1 „Im Hintergrund stumm“: Fokus-/Sichtbarkeits-Wächter, s. util/backgroundAudio.ts.
import { initBackgroundAudio } from "./util/backgroundAudio";
// claude:2026-10-19T10:05:00+02:00 — Oberflächen-Stil (Reforged/Classic) vor dem ersten Render setzen, s. uiStyle.ts.
import { initUiStyle } from "./uiStyle";
import { initNavSkin } from "./navSkin"; // claude:2026-10-25T18:09:00+01:00 — Knopf-Stile Seitenleiste/Kopfleiste
import { earlyAssetLab } from "./devtools/assetLabEarly"; // claude:2026-11-01T11:59:23+01:00 — Werkstatt-CSS vor dem ersten Bild (nur Dev)
import "./styles/index.css";

// Schriftwahl VOR dem ersten Render anwenden (Chef 31.08.2026), damit die Oberflaeche
// nicht sichtbar von der Vorgabe auf die gewaehlte Schrift umspringt.
initFontChoice();
initTextScale();
initUiStyle();
initNavSkin(); // claude:2026-10-25T18:09:00+01:00
initBackgroundAudio();
// claude:2026-10-30T20:20:00+01:00 — Asset-Werkstatt (Strg+Umschalt+Alt+A) nur im Dev-Server oder im Build mit `ASSET_LAB=1`; sonst fällt der Zweig samt
// dynamischem Import weg (kein assetLab-Chunk, keine Bild-Liste im Spielerpaket).
if (import.meta.env.DEV || __ASSET_LAB_BUILD__) {
  earlyAssetLab(); // claude:2026-11-01T11:59:23+01:00 — gemerktes Werkstatt-CSS sofort setzen (kein Stein-Flackern beim Start)
  void import("./devtools/assetLabHotkey").then((m) => m.initAssetLabHotkey());
}

// claude:2026-10-30T21:00:00+01:00 — Dev-UI-Stil „Synty“: CSS und Bilder hängen NUR an diesem dynamischen Import; ohne `SYNTY_UI=1` (und außerhalb des Dev-Servers) fällt der
// Zweig samt Chunk weg. Der Ausdruck steht wörtlich hier (Konstantenfaltung), s. uiStyle.ts / synty/loader.ts.
if (import.meta.env.DEV || __SYNTY_UI_BUILD__) {
  void import("./synty/loader").then((m) => m.initSynty());
}

const root = document.getElementById("root");
if (!root) throw new Error("#root nicht gefunden");

// SCENE BUILDER MOUNT SWITCH — `null` außerhalb von Dev-Builds oder ohne `?sceneBuilder=`-Parameter,
// dann läuft exakt der bisherige `<App/>`-Zweig unverändert (byte-identisches Verhalten zu vor
// diesem Auftrag). Der Builder-Screen läuft bewusst AUSSERHALB von `<App/>` (kein `I18nProvider`/
// `GameProvider`) — reines Dev-Werkzeug ohne Engine-/GameState-Kontakt, s. `builder/flag.ts`.
const sceneBuilderZoneId = getSceneBuilderZoneId();

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    {sceneBuilderZoneId ? <SceneBuilderApp initialZoneId={sceneBuilderZoneId} /> : <App />}
    {/* claude:2026-10-24T22:57:00+02:00 — native Windows-Tooltips app-weit durch den Citadel-Tooltip ersetzen (Chef 24.10.) */}
    <GlobalTitleTip />
  </React.StrictMode>,
);
