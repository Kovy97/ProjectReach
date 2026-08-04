#!/usr/bin/env node
/**
 * Task #273 self-check: screenshots the reworked Monster-Card layout in the Combat zone-select
 * grid (2x3 combat-stat grid, trait badges top-left in portrait, XP badge bottom-right, no gold,
 * Details button removed, single wider Fight button). Modeled on quests-shot-274.mjs.
 * Port 5191 per Chef instructions.
 *
 * Run: node combat-cards-shot-273.mjs
 * Output: PNGs written to the scratchpad dir below.
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5191;
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

async function clickWithReloadRetry(page, locator, opts = {}) {
  try {
    await locator.click({ timeout: 6000, ...opts });
  } catch {
    await page.waitForTimeout(400);
    await locator.click({ timeout: 6000, ...opts });
  }
}

async function shootCombat(browser, { width, height, suffix }) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", (e) => { errors.push("pageerror: " + e.message); });
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });

  await page.goto(`${BASE_URL}/?fixture=midgame`, { waitUntil: "load" });
  await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
  await page.waitForTimeout(4500); // let load-toasts clear

  await clickWithReloadRetry(page, page.locator('[data-guide-id="sidebar.combat"]').first());
  await page.waitForTimeout(500);

  // Zone select grid → open "Die Weiden"/"The Pastures" (has bull_boss with enrage, feral_goat, sheep etc.)
  // Fixture defaults to DE locale — match either language.
  await clickWithReloadRetry(page, page.locator(".zone-card", { hasText: /Weiden|Pastures/ }).first());
  await page.waitForTimeout(3500); // let achievement/milestone toasts triggered by the zone visit clear
  await page.screenshot({ path: join(OUT_DIR, `combat-cards-pastures-${suffix}.png`), fullPage: false });
  console.log(`SHOT SAVED: combat-cards-pastures-${suffix}.png`);

  // Close-up of the monster grid only (crop out the loadout sidebar).
  try {
    const grid = page.locator(".monster-grid").first();
    await grid.screenshot({ path: join(OUT_DIR, `combat-cards-pastures-grid-${suffix}.png`) });
    console.log(`SHOT SAVED: combat-cards-pastures-grid-${suffix}.png`);
  } catch (e) {
    console.log("!! grid closeup step failed: " + e.message);
  }

  // Close-up of just the bull_boss card (has `enrage`) to verify the trait badge overlay.
  try {
    const bullCard = page.locator(".monster-card", { hasText: /Rasender Bulle|Maddened Bull/ }).first();
    await bullCard.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    await bullCard.screenshot({ path: join(OUT_DIR, `combat-cards-bull-${suffix}.png`) });
    console.log(`SHOT SAVED: combat-cards-bull-${suffix}.png`);
    // Extra-tight crop of just the artwork top-left corner (trait badge legibility check).
    const box = await bullCard.locator(".monster-card-artwork").boundingBox();
    if (box) {
      await page.screenshot({
        path: join(OUT_DIR, `combat-cards-bull-tl-${suffix}.png`),
        clip: { x: box.x, y: box.y, width: Math.min(160, box.width), height: Math.min(100, box.height) },
      });
      console.log(`SHOT SAVED: combat-cards-bull-tl-${suffix}.png`);
    }
  } catch (e) {
    console.log("!! bull closeup step failed: " + e.message);
  }

  console.log(`[${suffix}] ` + (errors.length ? `${errors.length} page errors seen:\n` + errors.slice(0, 12).join("\n") : "no page errors"));
  await page.close();
}

const { child, getOutput } = startDevServer();
try {
  const ok = await waitForServer(BASE_URL);
  if (!ok) { console.error("SERVER NOT UP:\n" + getOutput()); process.exit(1); }
  const browser = await chromium.launch();
  await shootCombat(browser, { width: 1920, height: 1080, suffix: "1920" });
  await shootCombat(browser, { width: 1280, height: 720, suffix: "1280" });
  await browser.close();
} finally {
  child.kill();
}
