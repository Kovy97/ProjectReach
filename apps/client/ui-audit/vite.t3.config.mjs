// Wegwerf-Config für Tester-Sweep 2 / T3 (sweep2-t3-finale.mjs) — Kopie von vite.tour.config.mjs
// mit EINEM Unterschied: server.hmr = false. Grund (real beobachtet, 2026-07-13): parallele
// Sweep-/Dev-Agenten fassen src/renderer massenhaft an (mtime-Stürme ~alle 8 min) → vite pusht
// "invalidate GameContext → full reload" → die Seite lädt das ?fixture= neu und wirft den
// präparierten Endgame-State mitten im 14-min-Bosskampf weg. Ohne HMR-Websocket erreichen weder
// hot-updates noch full-reload-Kommandos die Seite — der Testlauf bleibt stabil.
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
    hmr: false,
  },
});
