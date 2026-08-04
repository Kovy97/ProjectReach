import { resolve } from "node:path";
import { defineConfig } from "electron-vite";
import react from "@vitejs/plugin-react";
import pkg from "./package.json";

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        input: { index: resolve(__dirname, "src/main/index.ts") },
      },
    },
  },
  preload: {
    build: {
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
    },
    build: {
      outDir: resolve(__dirname, "out/renderer"),
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
