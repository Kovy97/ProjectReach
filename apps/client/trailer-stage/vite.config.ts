// claude:2026-10-24T09:00:00+02:00 — Trailer-Bühne (Trailer v3): eigener Vite-Einstieg außerhalb von src/, nie Teil des Spiel-Builds.
// Start: npx vite --config trailer-stage/vite.config.ts (aus apps/client). Aufnahme: node trailer-stage/render.mjs <szene>.
import { resolve, sep } from "node:path";
import { defineConfig } from "vite";

const client = resolve(__dirname, "..");
export default defineConfig({
  root: __dirname,
  publicDir: resolve(client, "src/renderer/assets"),
  define: {
    __CINZEL_URL__: JSON.stringify(`/@fs/${resolve(client, "src/renderer/fonts/Cinzel-Regular.ttf").split(sep).join("/")}`),
    // claude:2026-10-24T20:16:00+02:00 — chinesische Fassung v4 (Teilmenge von Noto Serif SC, OFL)
    __NOTO_SC_URL__: JSON.stringify(`/@fs/${resolve(__dirname, "fonts/NotoSerifSC-trailer.woff2").split(sep).join("/")}`),
  },
  server: { port: 5420, strictPort: true, fs: { allow: [client] } },
  logLevel: "warn",
});
