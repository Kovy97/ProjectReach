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
