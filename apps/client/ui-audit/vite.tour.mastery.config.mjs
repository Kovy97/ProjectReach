// Variant of vite.tour.config.mjs for the Meisterweihe "cape exists" screenshot (mastery-ceremony-
// shot.mjs): identical dev server, except `@hearthforge/content` resolves to mastery-content-
// shim.ts (real catalog + one fake cape_master_woodcutting item) instead of the real package —
// packages/content has no real cape items yet (content-dev lands those separately), and this repo's
// ui-dev revier forbids touching packages/** even temporarily. Only this throwaway dev server sees
// the shim; the normal app (vite.tour.config.mjs / electron.vite.config.ts) is untouched.
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import pkg from "../package.json";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: resolve(__dirname, "..", "src", "renderer"),
  plugins: [react()],
  resolve: {
    alias: {
      "@hearthforge/content": resolve(__dirname, "mastery-content-shim.ts"),
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  server: {
    strictPort: true,
  },
});
