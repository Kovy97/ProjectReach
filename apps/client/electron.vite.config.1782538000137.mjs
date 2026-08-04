// electron.vite.config.ts
import { resolve } from "node:path";
import { defineConfig } from "electron-vite";
import react from "@vitejs/plugin-react";
var __electron_vite_injected_dirname = "G:\\GameDev\\apps\\client";
var electron_vite_config_default = defineConfig({
  main: {
    build: {
      rollupOptions: {
        input: { index: resolve(__electron_vite_injected_dirname, "src/main/index.ts") }
      }
    }
  },
  preload: {
    build: {
      rollupOptions: {
        input: { index: resolve(__electron_vite_injected_dirname, "src/preload/index.ts") }
      }
    }
  },
  renderer: {
    root: resolve(__electron_vite_injected_dirname, "src/renderer"),
    plugins: [react()],
    build: {
      outDir: resolve(__electron_vite_injected_dirname, "out/renderer"),
      rollupOptions: {
        input: { index: resolve(__electron_vite_injected_dirname, "src/renderer/index.html") }
      }
    }
  }
});
export {
  electron_vite_config_default as default
};
