import { resolve } from "node:path";
import { defineConfig } from "electron-vite";
import react from "@vitejs/plugin-react";
import pkg from "./package.json";

// Scene-Builder-Standalone-Build (Chef-Auftrag 2026-08-05, s. src/renderer/components/arena25d/
// README.md "Standalone-EXE"): `SCENE_BUILDER_BUILD=1 electron-vite build` erzeugt eine Fassung,
// in der der Arena-Scene-Builder AUCH im Produktions-Build erreichbar ist (drittes Gate in
// builder/flag.ts `SCENE_BUILDER_SUPPORTED`). Diese Fassung landet in einem KOMPLETT SEPARATEN
// Ausgabe-Root `out-scenebuilder/` (main+preload+renderer) — `out/` enthält dadurch NIE eine
// Builder-aktivierte Fassung, ein späteres Spieler-Packaging (`electron-builder` liest `out/**`)
// kann sie nicht versehentlich einsacken. Ohne die Env-Var ist dieser Build byte-identisch zum
// bisherigen Spieler-Build (`__SCENE_BUILDER_BUILD__` wird zur literalen Konstante `false`
// gefaltet, s. README.md "Bundle-Beweis").
const isSceneBuilderBuild = process.env.SCENE_BUILDER_BUILD === "1";
// claude:2026-10-30T20:20:00+01:00 — Asset-Werkstatt (Dev-Overlay): nur mit `ASSET_LAB=1` im Paket (sonst literal `false`, Modul samt Bild-Glob
// entfällt per Dead-Code-Elimination). Im Vite-Dev-Server ist sie immer an (main.tsx prüft zusätzlich `import.meta.env.DEV`).
const isAssetLabBuild = process.env.ASSET_LAB === "1";
// claude:2026-10-30T20:58:00+01:00 — Dev-UI-Stil „Synty“: nur mit `SYNTY_UI=1` im Paket (sonst literal `false`; Stil, CSS und Bilder entfallen per Dead-Code-Elimination,
// weil sie ausschließlich über den dynamischen Import in main.tsx erreichbar sind). Im Vite-Dev-Server immer an (`import.meta.env.DEV`).
const isSyntyUiBuild = process.env.SYNTY_UI === "1";
const outRoot = isSceneBuilderBuild ? "out-scenebuilder" : "out";

export default defineConfig({
  main: {
    define: {
      // Typdeklaration in src/vite-env.d.ts (tsconfig-Include "src" deckt Main UND Renderer ab).
      __SCENE_BUILDER_BUILD__: JSON.stringify(isSceneBuilderBuild),
    },
    build: {
      outDir: resolve(__dirname, `${outRoot}/main`),
      rollupOptions: {
        input: { index: resolve(__dirname, "src/main/index.ts") },
      },
    },
  },
  preload: {
    build: {
      outDir: resolve(__dirname, `${outRoot}/preload`),
      rollupOptions: {
        input: { index: resolve(__dirname, "src/preload/index.ts") },
      },
    },
  },
  renderer: {
    root: resolve(__dirname, "src/renderer"),
    plugins: [react()],
    define: {
      // Injected at build time from package.json; typed in src/vite-env.d.ts.
      __APP_VERSION__: JSON.stringify(pkg.version),
      __SCENE_BUILDER_BUILD__: JSON.stringify(isSceneBuilderBuild),
      __ASSET_LAB_BUILD__: JSON.stringify(isAssetLabBuild), // claude:2026-10-30T20:20:00+01:00
      __SYNTY_UI_BUILD__: JSON.stringify(isSyntyUiBuild), // claude:2026-10-30T20:58:00+01:00
    },
    build: {
      outDir: resolve(__dirname, `${outRoot}/renderer`),
      // 0 = nichts als data:-URI inline einbetten. Sonst bettet Vite Assets <4 KB als
      // base64-data:-URIs ein, die im gepackten Build (file://) von der CSP `default-src 'self'`
      // blockiert würden ⇒ fehlende Icons/Rahmen. So bleiben alle Assets echte Dateien.
      assetsInlineLimit: 0,
      rollupOptions: {
        input: { index: resolve(__dirname, "src/renderer/index.html") },
      },
    },
  },
});
