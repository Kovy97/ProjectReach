#!/usr/bin/env node
/**
 * Task #269 self-check: screenshots the reworked Shop page (Buy tab incl. category filter + Sell
 * tab incl. detail panel) at 1920x1080, plus a 1280x720 pass for the minimum supported resolution.
 * Modeled on menu-shot.mjs but drives in-page navigation (topbar.shop click) and the new Buy/Sell
 * tab + category-chip buttons inside ShopPage itself. Uses the ui-audit tour-server's `?fixture=`
 * support to load a midgame save (realistic gold/inventory). Port 5187 — dedicated to this script,
 * avoids colliding with menu-shot.mjs (5184) / tour.mjs (5183) / other agents' dev servers.
 *
 * Run: node shop-shot-269.mjs
 * Output: PNGs written next to this script's OUT_DIR (scratchpad).
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5187;
const BASE_URL = `http://localhost:${PORT}`;
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

async function shootShop(browser, { width, height, suffix }) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });

  await page.goto(`${BASE_URL}/?fixture=midgame`, { waitUntil: "load" });
  await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
  await page.waitForTimeout(4500); // let load-toasts (TOAST_MS=4000) clear before shooting

  await page.locator('[data-guide-id="topbar.shop"]').first().click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(OUT_DIR, `shop-buy-${suffix}.png`) });
  console.log(`SHOT SAVED: shop-buy-${suffix}.png`);
  await page.evaluate(() => { const b = document.querySelector(".shopv2-body"); if (b) b.scrollTop = 320; });
  await page.waitForTimeout(300);
  const cardClose = page.locator(".shopv2-card").first();
  if (await cardClose.count()) await cardClose.screenshot({ path: join(OUT_DIR, `shop-card-close-${suffix}.png`) });
  await page.screenshot({ path: join(OUT_DIR, `shop-buy-scrolled-${suffix}.png`) });
  console.log(`SHOT SAVED: shop-buy-scrolled-${suffix}.png`);

  if (width >= 1920) {
    // Category filter: Seeds chip (index 7 = All, Upgrades, Weapons, Armor, Tools, Ammo, Food, Seeds, Materials) — densest category, good grid stress test.
    await page.locator(".shopv2-chip").nth(7).click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(OUT_DIR, `shop-buy-seeds-${suffix}.png`) });
    console.log(`SHOT SAVED: shop-buy-seeds-${suffix}.png`);
    await page.locator(".shopv2-chip").nth(0).click(); // back to "All"
    await page.waitForTimeout(200);
  }

  await page.locator(".shopv2-maintab").nth(1).click(); // Sell tab
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(OUT_DIR, `shop-sell-${suffix}.png`) });
  console.log(`SHOT SAVED: shop-sell-${suffix}.png`);

  if (width >= 1920) {
    const sellCells = page.locator(".shopv2-sell-cell");
    if ((await sellCells.count()) > 0) {
      await sellCells.first().click();
      await page.waitForTimeout(300);
      await page.screenshot({ path: join(OUT_DIR, `shop-sell-detail-${suffix}.png`) });
      console.log(`SHOT SAVED: shop-sell-detail-${suffix}.png`);
    }
  }

  console.log(`[${suffix}] ` + (errors.length ? "PAGE ERRORS:\n" + errors.slice(0, 20).join("\n") : "no page errors"));
  await page.close();
}

const { child, getOutput } = startDevServer();
try {
  const ok = await waitForServer(BASE_URL);
  if (!ok) { console.error("SERVER NOT UP:\n" + getOutput()); process.exit(1); }
  const browser = await chromium.launch();
  await shootShop(browser, { width: 1920, height: 1080, suffix: "1920" });
  await shootShop(browser, { width: 1280, height: 720, suffix: "1280" });
  await browser.close();
} finally {
  child.kill();
}
