#!/usr/bin/env node
/**
 * Task #317 verification: Chef-Korrektur zum Ambient-System ("wo ist das Bloom hin? Eigentlich
 * brauchen wir nur das Vignette"). Der vorherige Wetter-Rückbau lief nie durch einen headless
 * Screenshot — genau deshalb fiel nicht auf, dass die three.js-Canvas komplett fehlte (schwarzer
 * Deckel im Feld). Dieses Skript ist die geforderte visuelle PFLICHT-Verifikation: Hauptmenü UND
 * eine Spielseite, jeweils mit aktivem Ambient-Master + sichtbarem Bloom-Schimmer.
 *
 * Modeled on perf-ambient-audit.mjs (GPU-Launch-Args) + combat-fx-shot-296.mjs (Fixture-Navigation,
 * Screenshot-Output in den Scratchpad). Port 5317 (Task-Nummer, kollisionsfrei zu den anderen
 * laufenden Sim-Skripten).
 *
 * WICHTIG — GPU statt SwiftShader: s. perf-ambient-audit.mjs-JSDoc, derselbe Grund gilt hier für
 * ein korrektes Bloom-Compositing-Ergebnis im Screenshot.
 *
 * Zwei Screenshot-Paare:
 * 1) Default-Settings (frisches localStorage → ambientPrefs.ts-Defaults: Vignette 30, Bloom-Stärke
 *    22, Bloom-Schwelle 60, Master AN sofern Chromium `prefers-reduced-motion: no-preference`
 *    meldet) — das ist der reale Ersteindruck eines neuen Spielers.
 * 2) Geboostete Settings (Bloom-Stärke 85, Bloom-Schwelle 25) — macht den Bloom-Effekt im
 *    Screenshot eindeutig sichtbar/unterscheidbar von einem reinen Kompositions-Fehler (schwarzer
 *    Deckel), auch falls die dezenten Defaults auf einem Standbild schwer zu erkennen wären.
 *
 * Run: node ambient-bloom-verify-317.mjs   (from apps/client/)
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5317;
const BASE_URL = `http://localhost:${PORT}`;
const VIEWPORT = { width: 1920, height: 1080 };
const OUT_DIR = "C:\\Users\\MSchu\\AppData\\Local\\Temp\\claude\\G--GameDev\\553d2095-3a73-4795-9782-0fe746a25f13\\scratchpad";

function startDevServer() {
  const viteBin = join(CLIENT_DIR, "node_modules", "vite", "bin", "vite.js");
  const child = spawn(
    process.execPath,
    [viteBin, "dev", "--config", join(__dirname, "vite.tour.config.mjs"), "--port", String(PORT), "--strictPort"],
    { cwd: CLIENT_DIR, stdio: ["ignore", "pipe", "pipe"] },
  );
  let out = "";
  child.stdout.on("data", (d) => (out += d.toString()));
  child.stderr.on("data", (d) => (out += d.toString()));
  return { child, getOutput: () => out };
}

async function waitForServer(url, t = 40000) {
  const s = Date.now();
  while (Date.now() - s < t) {
    try { const r = await fetch(url); if (r.ok) return true; } catch {}
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

/** Setzt ambientPrefs.ts-localStorage-Keys VOR jedem Seiten-Load (Playwright addInitScript läuft
 *  vor allen Page-Skripten) — ambientPrefs.ts liest seine Werte synchron beim Modul-Import. */
async function setAmbientPrefs(page, { vignette, bloomStrength, bloomThreshold }) {
  await page.addInitScript(
    ({ vignette, bloomStrength, bloomThreshold }) => {
      localStorage.setItem("gr.ambient.enabled", "1");
      localStorage.setItem("gr.ambient.vignette", String(vignette));
      localStorage.setItem("gr.ambient.bloomStrength", String(bloomStrength));
      localStorage.setItem("gr.ambient.bloomThreshold", String(bloomThreshold));
    },
    { vignette, bloomStrength, bloomThreshold },
  );
}

async function main() {
  console.log(`[verify] starting dev server on port ${PORT}...`);
  const server = startDevServer();
  const up = await waitForServer(BASE_URL);
  if (!up) { console.error("DEV SERVER NOT UP:\n" + server.getOutput()); server.child.kill(); process.exitCode = 1; return; }

  const browser = await chromium.launch({
    args: ["--use-gl=angle", "--use-angle=d3d11", "--ignore-gpu-blocklist", "--enable-gpu", "--disable-gpu-sandbox"],
  });
  try {
    for (const variant of [
      { label: "default", vignette: 30, bloomStrength: 30, bloomThreshold: 8 },
      { label: "boosted", vignette: 45, bloomStrength: 70, bloomThreshold: 3 },
    ]) {
      const page = await browser.newPage({ viewport: VIEWPORT });
      page.on("pageerror", (e) => console.error(`[${variant.label}] pageerror:`, e.message));
      await setAmbientPrefs(page, variant);

      // ─── 1) Hauptmenü (kein Fixture — reale Save-Slot-Auswahl, GameState nicht geladen) ───
      await page.goto(`${BASE_URL}/`, { waitUntil: "load" });
      await page.waitForSelector("text=/./", { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(3500); // Priming-Render + ein paar rAF-Ticks für den Bloom-Loop
      const [dpr, reducedMotion, ambientOn, canvasPresent] = await page.evaluate(() => [
        window.devicePixelRatio,
        window.matchMedia("(prefers-reduced-motion: reduce)").matches,
        !document.querySelector(".ambient-root")?.classList.contains("amb-off"),
        !!document.querySelector(".amb-canvas"),
      ]);
      console.log(
        `[verify] [${variant.label}/menu] dpr=${dpr} prefersReducedMotion=${reducedMotion} ambientEnabled=${ambientOn} canvasPresent=${canvasPresent}`,
      );
      const menuPath = join(OUT_DIR, `ambient-317-${variant.label}-menu.png`);
      await page.screenshot({ path: menuPath });
      console.log(`[verify] wrote ${menuPath}`);

      // ─── 2) Spielseite (midgame-Fixture, Default-Landing = Charakter-Seite) ───
      await page.goto(`${BASE_URL}/?fixture=midgame`, { waitUntil: "load" });
      await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
      await page.waitForTimeout(4000);
      const gamePath = join(OUT_DIR, `ambient-317-${variant.label}-game.png`);
      await page.screenshot({ path: gamePath });
      console.log(`[verify] wrote ${gamePath}`);

      await page.close();
    }
  } finally {
    await browser.close();
    server.child.kill();
  }
  console.log("\n[verify] done.");
}

main().catch((err) => {
  console.error("[verify] fatal:", err);
  process.exitCode = 1;
});
