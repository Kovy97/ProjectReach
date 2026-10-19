import React from "react";
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
// claude:2026-10-19T10:05:00+02:00 — Oberflächen-Stil (Reforged/Classic) vor dem ersten Render setzen, s. uiStyle.ts.
import { initUiStyle } from "./uiStyle";
import "./styles/index.css";

// Schriftwahl VOR dem ersten Render anwenden (Chef 31.08.2026), damit die Oberflaeche
// nicht sichtbar von der Vorgabe auf die gewaehlte Schrift umspringt.
initFontChoice();
initUiStyle();

const root = document.getElementById("root");
if (!root) throw new Error("#root nicht gefunden");

// SCENE BUILDER MOUNT SWITCH — `null` außerhalb von Dev-Builds oder ohne `?sceneBuilder=`-Parameter,
// dann läuft exakt der bisherige `<App/>`-Zweig unverändert (byte-identisches Verhalten zu vor
// diesem Auftrag). Der Builder-Screen läuft bewusst AUSSERHALB von `<App/>` (kein `I18nProvider`/
// `GameProvider`) — reines Dev-Werkzeug ohne Engine-/GameState-Kontakt, s. `builder/flag.ts`.
const sceneBuilderZoneId = getSceneBuilderZoneId();

ReactDOM.createRoot(root).render(
  <React.StrictMode>{sceneBuilderZoneId ? <SceneBuilderApp initialZoneId={sceneBuilderZoneId} /> : <App />}</React.StrictMode>,
);
