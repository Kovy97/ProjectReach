#!/usr/bin/env node
/**
 * Task #296 functional check: does `gr.combatFxLevel` actually gate the effects in CombatPage.tsx
 * (not just cosmetic in Options)? Sets localStorage BEFORE the app boots, fights the low-HP
 * chicken, and inspects via page.evaluate whether hit-flash/recoil animations ever fire.
 * Port 5203, midgame fixture.
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5203;
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

/** Counts how many times `Element.prototype.animate` fires on `.fighter-figure-art` /
 *  `.hit-flash-overlay` elements (recoil / flash) over the observation window. */
async function countFxAnimations(browser, { level, width = 1920, height = 1080 }) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });

  await page.addInitScript((lvl) => {
    if (lvl) localStorage.setItem("gr.combatFxLevel", lvl);
    window.__fxCalls = { art: 0, flash: 0, lungeFigure: 0 };
    const orig = Element.prototype.animate;
    Element.prototype.animate = function (keyframes, options) {
      if (this.classList.contains("fighter-figure-art")) window.__fxCalls.art++;
      else if (this.classList.contains("hit-flash-overlay")) window.__fxCalls.flash++;
      else if (this.classList.contains("fighter-figure")) window.__fxCalls.lungeFigure++;
      return orig.call(this, keyframes, options);
    };
  }, level);

  await page.goto(`${BASE_URL}/?fixture=midgame`, { waitUntil: "load" });
  await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
  await page.waitForTimeout(4500);
  await clickWithReloadRetry(page, page.locator('[data-guide-id="sidebar.combat"]').first());
  await page.waitForSelector(".zone-card", { timeout: 10000 });
  await page.waitForTimeout(500);
  await clickWithReloadRetry(page, page.locator(".zone-card", { hasText: /Weiden|Pastures/ }).first());
  await page.waitForSelector(".monster-card", { timeout: 10000 });
  await page.waitForTimeout(1000);
  const card = page.locator(".monster-card", { hasText: /Huhn|Chicken/ }).first();
  await clickWithReloadRetry(page, card.locator(".mc-fight-btn"));
  await page.waitForSelector(".battle", { timeout: 10000 });

  let sawDmgNumber = false;
  try {
    await page.waitForFunction(() => !!document.querySelector(".dmg-number"), null, { timeout: 12000, polling: 50 });
    sawDmgNumber = true;
  } catch {
    sawDmgNumber = false;
  }

  // Let the fight run a bit longer (several chicken kills/respawns → several hit events).
  await page.waitForTimeout(8000);

  const calls = await page.evaluate(() => window.__fxCalls);
  const logLines = await page.locator(".battle-log .log-line").count();
  console.log(`fxLevel=${level ?? "(default full)"} → art(recoil)=${calls.art} flash=${calls.flash} lungeFigure=${calls.lungeFigure} sawDmgNumber=${sawDmgNumber} logLines=${logLines}`);
  await page.close();
  return calls;
}

const { child, getOutput } = startDevServer();
try {
  const ok = await waitForServer(BASE_URL);
  if (!ok) { console.error("SERVER NOT UP:\n" + getOutput()); process.exit(1); }
  const browser = await chromium.launch();
  for (const level of ["full", "reduced", "off"]) {
    try {
      await countFxAnimations(browser, { level });
    } catch (e) {
      console.log(`!! run for level=${level} failed: ${e.message}`);
    }
  }
  await browser.close();
} finally {
  child.kill();
}
