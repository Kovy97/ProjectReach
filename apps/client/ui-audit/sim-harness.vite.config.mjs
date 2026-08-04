// Shared, parameterized Vite dev-server config for sim-harness.mjs.
//
// Generalizes vite.tour.config.mjs / vite.t3.config.mjs (which existed as one-off, per-script
// copies) into ONE reusable config every sim-harness.mjs caller shares. Deliberately NOT
// electron.vite.config.ts: that file wraps three separate build targets (main/preload/renderer)
// for `electron-vite`, which launches the actual Electron app — sim/tester agents in this repo
// never run Electron interactively (see SIM-AGENT-GUIDE.md rule: no Electron/app instances). The
// renderer itself is a normal React/Vite SPA (every `window.hearthforge?.*` bridge call is
// optional-chained with a browser fallback — see src/renderer/saves.ts), so it runs fine as a
// plain page in Playwright's headless Chromium.
//
// HMR is controlled by the SIM_HARNESS_HMR env var ("1" = on, anything else/unset = OFF).
// sim-harness.mjs sets this before spawning the dev-server child process, defaulting to OFF.
// Why default OFF (SIM-AGENT-GUIDE.md lesson 1, "vite-HMR-Falle"): parallel code edits by other
// agents touching src/renderer trigger a full reload, which resets an in-progress `?fixture=`
// session mid-run (observed: a 14-minute boss-fight test lost its whole prepared endgame state).
// Without the HMR websocket, neither hot-updates nor full-reload commands reach the page — the
// test session stays stable regardless of what other agents do to the source tree concurrently.
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
    hmr: process.env.SIM_HARNESS_HMR === "1",
  },
});
