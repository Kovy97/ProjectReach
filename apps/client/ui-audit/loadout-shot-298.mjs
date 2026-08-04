#!/usr/bin/env node
/**
 * Task #298 follow-up: the combat "AUSRÜSTUNG" tab (battle-log-tab, logTab==="equipment") shows
 * the 13-slot loadout grid (.cl-slot) — the main scale-audit-298.mjs run screenshotted the fight
 * while the default "LOG" tab was active, so .cl-slot count was 0. This isolates just that one
 * extra state. Port 5206 (5205 was scale-audit-298.mjs, avoid collision if run back-to-back).
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5206;
const BASE_URL = `http://localhost:${PORT}`;
const OUT_DIR = join(__dirname, "shots-298");

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
  try { await locator.click({ timeout: 6000, ...opts }); }
  catch { await page.waitForTimeout(400); await locator.click({ timeout: 6000, ...opts }); }
}

const { child, getOutput } = startDevServer();
try {
  const ok = await waitForServer(BASE_URL);
  if (!ok) { console.error("SERVER NOT UP:\n" + getOutput()); process.exit(1); }
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });

  await page.goto(`${BASE_URL}/?fixture=endgame`, { waitUntil: "load" });
  await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
  await page.waitForTimeout(5200);

  await clickWithReloadRetry(page, page.locator('[data-guide-id="sidebar.combat"]').first());
  await page.waitForTimeout(400);
  const zoneCard = page.locator(".zone-card:not(.dungeon-card):not(.slayer-floor-zone-card)").first();
  await clickWithReloadRetry(page, zoneCard);
  await page.waitForTimeout(400);
  const fightBtn = page.locator(".mc-fight-btn:not([disabled])").first();
  await clickWithReloadRetry(page, fightBtn);
  await page.waitForTimeout(800);

  // Switch to the "AUSRÜSTUNG" (equipment/loadout) tab.
  const eqTab = page.locator(".battle-log-tab").nth(1);
  await clickWithReloadRetry(page, eqTab);
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(OUT_DIR, "endgame-16b-combat-loadout-tab.png"), fullPage: false });
  console.log("SHOT: endgame-16b-combat-loadout-tab.png");

  const slotCount = await page.locator(".cl-slot").count();
  console.log(`cl-slot count (expect 13): ${slotCount}`);
  const slotsBox = await page.locator(".combat-loadout").boundingBox();
  console.log(`combat-loadout box: ${JSON.stringify(slotsBox)}`);

  await browser.close();
} finally {
  child.kill();
}
