#!/usr/bin/env node
/**
 * Chef-GO functional check: does fxLevel="reduced" actually halve the particle count (not just
 * cosmetically)? Hooks CanvasRenderingContext2D.arc/clearRect to count how many particles get
 * drawn per frame on `.zone-particles-canvas` elements, for fxLevel unset (full) vs "reduced".
 * Port 5219, fixture=endgame, ashfields (ember zone).
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5219;
const BASE_URL = `http://localhost:${PORT}`;

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

async function clickWithReloadRetry(page, locator, opts = {}) {
  try {
    await locator.click({ timeout: 6000, ...opts });
  } catch {
    await page.waitForTimeout(400);
    await locator.click({ timeout: 6000, ...opts });
  }
}

async function countParticles(browser, fxLevel) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });

  await page.addInitScript((lvl) => {
    if (lvl) localStorage.setItem("gr.combatFxLevel", lvl);
    window.__perFrameCounts = [];
    let current = 0;
    const origClear = CanvasRenderingContext2D.prototype.clearRect;
    const origArc = CanvasRenderingContext2D.prototype.arc;
    CanvasRenderingContext2D.prototype.clearRect = function (...args) {
      if (this.canvas?.classList?.contains("zone-particles-canvas")) {
        if (current > 0) window.__perFrameCounts.push(current);
        current = 0;
      }
      return origClear.apply(this, args);
    };
    CanvasRenderingContext2D.prototype.arc = function (...args) {
      if (this.canvas?.classList?.contains("zone-particles-canvas")) current++;
      return origArc.apply(this, args);
    };
  }, fxLevel);

  await page.goto(`${BASE_URL}/?fixture=endgame`, { waitUntil: "load" });
  await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
  await page.waitForTimeout(4500);
  await clickWithReloadRetry(page, page.locator('[data-guide-id="sidebar.combat"]').first());
  await page.waitForTimeout(500);
  await clickWithReloadRetry(page, page.locator(".zone-card", { hasText: /Aschfelder|Ashfields/ }).first());
  await page.waitForTimeout(1000);
  const card = page.locator(".monster-card").first();
  await clickWithReloadRetry(page, card.locator(".mc-fight-btn"));
  await page.waitForSelector(".battle", { timeout: 10000 });
  await page.waitForTimeout(800);

  const counts = await page.evaluate(() => window.__perFrameCounts.slice(-20));
  await page.close();
  // Average per-canvas-per-frame particle count (two canvases run: player+enemy).
  const avg = counts.length ? counts.reduce((a, b) => a + b, 0) / counts.length : 0;
  return { fxLevel: fxLevel ?? "full(default)", avgPerCanvasFrame: avg, sample: counts.slice(0, 6) };
}

const { child, getOutput } = startDevServer();
try {
  const ok = await waitForServer(BASE_URL);
  if (!ok) { console.error("SERVER NOT UP:\n" + getOutput()); process.exit(1); }
  const browser = await chromium.launch();
  const full = await countParticles(browser, null);
  const reduced = await countParticles(browser, "reduced");
  await browser.close();
  console.log("FULL:", JSON.stringify(full));
  console.log("REDUCED:", JSON.stringify(reduced));
  console.log(`Ratio reduced/full: ${(reduced.avgPerCanvasFrame / full.avgPerCanvasFrame).toFixed(2)} (expect ~0.5)`);
} finally {
  child.kill();
}
