// Minimal, standalone Vite dev-server config for the UI-Audit screenshot tour (tour.mjs).
//
// Deliberately NOT electron.vite.config.ts: that file wraps three separate build targets
// (main/preload/renderer) for `electron-vite`, which launches the actual Electron app — this repo's
// UI-dev workflow explicitly avoids running Electron interactively from an agent. The renderer itself
// is a normal React/Vite SPA (every `window.hearthforge?.*` bridge call is optional-chained with a
// browser fallback — see src/renderer/saves.ts), so it runs fine as a plain page in Playwright's
// headless Chromium. This config mirrors the `renderer` block of electron.vite.config.ts (root +
// react plugin + the same version `define`) just enough to serve it standalone.
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import pkg from "../package.json";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: resolve(__dirname, "..", "src", "renderer"),
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  server: {
    strictPort: true,
  },
});
