#!/usr/bin/env node
/**
 * Task #274 self-check: screenshots the nav rework (Quests → Top Bar, Skills-Overview → Sidebar
 * top, over Combat) + the rebuilt QuestsPage (token balance header, story/daily/shop tabs, Rewards
 * Shop scaffold). Modeled on shop-shot-269.mjs. Port 5190 per Chef instructions — dedicated to this
 * script, avoids colliding with menu-shot.mjs (5184) / tour.mjs (5183) / shop-shot-269.mjs (5187).
 *
 * Run: node quests-shot-274.mjs
 * Output: PNGs written to the scratchpad dir below.
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5190;
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

// Concurrent agents in this shared repo may save translations.ts/content files mid-run, which
// makes Vite's dev server broadcast a full-reload to the connected page (observed as a spurious
// mid-test navigation). Wrap each step in a short retry that just re-does the click once.
async function clickWithReloadRetry(page, locator, opts = {}) {
  try {
    await locator.click({ timeout: 6000, ...opts });
  } catch {
    await page.waitForTimeout(400);
    await locator.click({ timeout: 6000, ...opts });
  }
}

async function shootQuests(browser, { width, height, suffix }) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", (e) => { const s = "pageerror: " + e.message; errors.push(s); });
  page.on("console", (m) => { if (m.type() === "error") { errors.push("console: " + m.text()); } });

  await page.goto(`${BASE_URL}/?fixture=midgame`, { waitUntil: "load" });
  await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
  await page.waitForTimeout(4500); // let load-toasts (TOAST_MS=4000) clear before shooting

  // Landing view: Topbar (Quests button + possible claim-dot) + Sidebar (Skills-Overview atop Combat).
  await page.screenshot({ path: join(OUT_DIR, `quests-nav-landing-${suffix}.png`) });
  console.log(`SHOT SAVED: quests-nav-landing-${suffix}.png`);

  // Quests page (Top Bar nav) — default tab is "daily".
  await clickWithReloadRetry(page, page.locator('[data-guide-id="topbar.quests"]').first());
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(OUT_DIR, `quests-daily-${suffix}.png`) });
  console.log(`SHOT SAVED: quests-daily-${suffix}.png`);

  try {
    await clickWithReloadRetry(page, page.locator(".quests-tab-btn").nth(0));
    await page.waitForTimeout(200);
    await page.screenshot({ path: join(OUT_DIR, `quests-story-${suffix}.png`) });
    console.log(`SHOT SAVED: quests-story-${suffix}.png`);
  } catch (e) {
    console.log("!! story tab step failed: " + e.message);
  }

  try {
    await clickWithReloadRetry(page, page.locator(".quests-tab-btn").nth(2));
    await page.waitForTimeout(200);
    await page.screenshot({ path: join(OUT_DIR, `quests-shop-${suffix}.png`) });
    console.log(`SHOT SAVED: quests-shop-${suffix}.png`);
  } catch (e) {
    console.log("!! shop tab step failed: " + e.message);
  }

  // Sidebar close-up: Skills-Overview button should now sit above Combat.
  if (width >= 1920) {
    try {
      const sidebar = page.locator(".sidebar");
      await sidebar.screenshot({ path: join(OUT_DIR, `quests-sidebar-closeup-${suffix}.png`) });
      console.log(`SHOT SAVED: quests-sidebar-closeup-${suffix}.png`);
    } catch (e) {
      console.log("!! sidebar closeup step failed: " + e.message);
    }
  }

  console.log(`[${suffix}] ` + (errors.length ? `${errors.length} page errors seen (see above)` : "no page errors"));
  await page.close();
}

const { child, getOutput } = startDevServer();
try {
  const ok = await waitForServer(BASE_URL);
  if (!ok) { console.error("SERVER NOT UP:\n" + getOutput()); process.exit(1); }
  const browser = await chromium.launch();
  await shootQuests(browser, { width: 1920, height: 1080, suffix: "1920" });
  await shootQuests(browser, { width: 1280, height: 720, suffix: "1280" });
  await browser.close();
} finally {
  child.kill();
}
