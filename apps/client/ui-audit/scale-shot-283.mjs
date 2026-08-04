#!/usr/bin/env node
/**
 * Task #283 self-check: screenshots CharacterPage, CombatPage (live fight), and a skill page
 * (Mining) at 1920x1080 and 1280x720 to verify the sidebar/topbar/title-bar compaction + the
 * CharacterPage/CombatPage layout rework. Modeled on combat-cards-shot-273.mjs. Port 5197 per
 * Chef instructions.
 *
 * Also measures scrollHeight vs clientHeight of key CharacterPage containers to catch clipping
 * without relying purely on visual inspection.
 *
 * Run: node scale-shot-283.mjs
 * Output: PNGs + measurements written to the scratchpad dir below.
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5197;
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

async function measure(page, selector) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    return {
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
      overflowY: el.scrollHeight - el.clientHeight,
    };
  }, selector);
}

async function run(browser, { width, height, suffix }) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", (e) => { errors.push("pageerror: " + e.message); });
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });

  await page.goto(`${BASE_URL}/?fixture=midgame`, { waitUntil: "load" });
  await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
  await page.waitForTimeout(4500); // let load-toasts clear

  // ── 1. CharacterPage ──
  await clickWithReloadRetry(page, page.locator('[data-guide-id="topbar.character"]').first());
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(OUT_DIR, `char-${suffix}.png`), fullPage: false });
  console.log(`SHOT SAVED: char-${suffix}.png`);

  const measurements = {};
  measurements.csLayout = await measure(page, ".cs-layout");
  measurements.csColLeft = await measure(page, ".cs-col-left");
  measurements.csColMidStack = await measure(page, ".cs-col-mid-stack");
  measurements.csColStats = await measure(page, ".cs-col-stats");
  measurements.csAttrGrid = await measure(page, ".cs-attr-grid");
  const companionPanelCount = await page.locator(".cs-companion-panel").count();
  console.log(`[${suffix}] measurements: ${JSON.stringify(measurements)}`);
  console.log(`[${suffix}] companion panel elements found (expect 0): ${companionPanelCount}`);

  // ── 2. Sidebar/Topbar/Title-bar measurements (from Character page, still loaded) ──
  const sidebarBox = await page.locator(".sidebar").boundingBox();
  const topbarBox = await page.locator(".topbar").boundingBox();
  const headerBox = await page.locator(".content-header").boundingBox();
  console.log(`[${suffix}] sidebar width: ${sidebarBox?.width}`);
  console.log(`[${suffix}] topbar height: ${topbarBox?.height}`);
  console.log(`[${suffix}] content-header height: ${headerBox?.height}`);

  // ── 3. A skill page (Mining) — sidebar/topbar/title compactness visible ──
  await clickWithReloadRetry(page, page.locator('[data-guide-id="sidebar.mining"]').first());
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(OUT_DIR, `mining-${suffix}.png`), fullPage: false });
  console.log(`SHOT SAVED: mining-${suffix}.png`);

  // ── 4. CombatPage: Zone -> Monster -> Fight ──
  await clickWithReloadRetry(page, page.locator('[data-guide-id="sidebar.combat"]').first());
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(OUT_DIR, `combat-zones-${suffix}.png`), fullPage: false });
  console.log(`SHOT SAVED: combat-zones-${suffix}.png`);

  // Click first plain zone card (not dungeon, not slayer tower floor).
  const zoneCard = page.locator(".zone-card:not(.dungeon-card):not(.slayer-floor-zone-card)").first();
  await clickWithReloadRetry(page, zoneCard);
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(OUT_DIR, `combat-monsters-${suffix}.png`), fullPage: false });
  console.log(`SHOT SAVED: combat-monsters-${suffix}.png`);

  // Click Fight on the first available monster card.
  const fightBtn = page.locator(".mc-fight-btn:not([disabled])").first();
  await clickWithReloadRetry(page, fightBtn);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: join(OUT_DIR, `combat-fight-${suffix}.png`), fullPage: false });
  console.log(`SHOT SAVED: combat-fight-${suffix}.png`);

  const battleMainBox = await page.locator(".battle-main").boundingBox();
  const killCardCount = await page.locator(".kill-summary-card").count();
  console.log(`[${suffix}] battle-main box: ${JSON.stringify(battleMainBox)}`);
  console.log(`[${suffix}] kill-summary-card present now: ${killCardCount}`);

  // Wait a bit to try to catch a kill + the kill-summary overlay in a screenshot too.
  await page.waitForTimeout(6000);
  const killCardCount2 = await page.locator(".kill-summary-card").count();
  if (killCardCount2 > 0) {
    await page.screenshot({ path: join(OUT_DIR, `combat-fight-kill-${suffix}.png`), fullPage: false });
    console.log(`SHOT SAVED: combat-fight-kill-${suffix}.png (kill-summary-card visible)`);
  } else {
    console.log(`[${suffix}] no kill yet after wait, skipping kill overlay shot`);
  }

  console.log(`[${suffix}] ` + (errors.length ? `${errors.length} page errors seen:\n` + errors.slice(0, 12).join("\n") : "no page errors"));
  await page.close();
}

const { child, getOutput } = startDevServer();
try {
  const ok = await waitForServer(BASE_URL);
  if (!ok) { console.error("SERVER NOT UP:\n" + getOutput()); process.exit(1); }
  const browser = await chromium.launch();
  await run(browser, { width: 1920, height: 1080, suffix: "1920" });
  await run(browser, { width: 1280, height: 720, suffix: "1280" });
  await browser.close();
} finally {
  child.kill();
}
