#!/usr/bin/env node
/**
 * Chef-GO functional check: does the particle rAF loop actually pause on `visibilitychange`
 * (tab hidden) and resume when visible again? Spoofs `document.hidden` (no real OS tab switch
 * needed under Playwright) and dispatches the event manually, counting canvas draw calls before/
 * during/after to prove the loop really stops, not just visually fades.
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

const { child, getOutput } = startDevServer();
try {
  const ok = await waitForServer(BASE_URL);
  if (!ok) { console.error("SERVER NOT UP:\n" + getOutput()); process.exit(1); }
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });

  await page.addInitScript(() => {
    window.__frameCount = 0;
    const origClear = CanvasRenderingContext2D.prototype.clearRect;
    CanvasRenderingContext2D.prototype.clearRect = function (...args) {
      if (this.canvas?.classList?.contains("zone-particles-canvas")) window.__frameCount++;
      return origClear.apply(this, args);
    };
  });

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
  await page.waitForTimeout(500);

  const before = await page.evaluate(() => window.__frameCount);
  await page.waitForTimeout(600);
  const afterVisible = await page.evaluate(() => window.__frameCount);
  console.log(`Visible window: ${before} -> ${afterVisible} (should have grown a lot)`);

  // Spoof hidden + dispatch visibilitychange.
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { value: true, configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  const hiddenStart = await page.evaluate(() => window.__frameCount);
  await page.waitForTimeout(700);
  const hiddenEnd = await page.evaluate(() => window.__frameCount);
  console.log(`Hidden window: ${hiddenStart} -> ${hiddenEnd} (should NOT have grown — rAF paused)`);

  // Restore visible + dispatch again.
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { value: false, configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  const resumedStart = await page.evaluate(() => window.__frameCount);
  await page.waitForTimeout(600);
  const resumedEnd = await page.evaluate(() => window.__frameCount);
  console.log(`Resumed window: ${resumedStart} -> ${resumedEnd} (should have grown again — rAF resumed)`);

  const paused = hiddenEnd === hiddenStart;
  const resumed = resumedEnd > resumedStart;
  console.log(`VERDICT: pause-on-hidden=${paused ? "OK" : "FAIL"}, resume-on-visible=${resumed ? "OK" : "FAIL"}`);

  await browser.close();
} finally {
  child.kill();
}
