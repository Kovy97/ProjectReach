#!/usr/bin/env node
/**
 * Chef-GO "Citadel-Konsistenz-Welle": before/after screenshots for StatsPage, MasteryPage,
 * BankPage. Port 5222 per Chef instructions. Modeled on quests-shot-274.mjs.
 *
 * Run: node ui-audit/citadel-consistency-shots.mjs [suffix]
 *   suffix defaults to "before" — pass "after" for the post-redesign shots.
 * Output: PNGs written to the scratchpad dir below.
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5222;
const BASE_URL = `http://localhost:${PORT}`;
const OUT_DIR = "C:\\Users\\MSchu\\AppData\\Local\\Temp\\claude\\G--GameDev\\553d2095-3a73-4795-9782-0fe746a25f13\\scratchpad";
const SUFFIX = process.argv[2] || "before";

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

async function run() {
  const { child, getOutput } = startDevServer();
  try {
    const ok = await waitForServer(BASE_URL);
    if (!ok) {
      console.error("Dev server did not start:\n" + getOutput());
      process.exit(1);
    }

    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
    const errors = [];
    page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
    page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });

    await page.goto(`${BASE_URL}/?fixture=endgame`, { waitUntil: "load" });
    await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
    await page.waitForTimeout(4500); // let load-toasts clear

    // Statistik (sidebar)
    await clickWithReloadRetry(page, page.locator('[data-guide-id="sidebar.stats"]').first());
    await page.waitForTimeout(400);
    await page.screenshot({ path: join(OUT_DIR, `citadel-stats-${SUFFIX}.png`), fullPage: true });
    console.log(`SHOT SAVED: citadel-stats-${SUFFIX}.png`);

    // Meisterschaft (topbar)
    await clickWithReloadRetry(page, page.locator('[data-guide-id="topbar.mastery"]').first());
    await page.waitForTimeout(400);
    await page.screenshot({ path: join(OUT_DIR, `citadel-mastery-${SUFFIX}.png`), fullPage: true });
    console.log(`SHOT SAVED: citadel-mastery-${SUFFIX}.png`);
    // Expand first skill block for a close-up of the action rows
    try {
      await clickWithReloadRetry(page, page.locator(".ms2-skill-hdr").first());
      await page.waitForTimeout(300);
      await page.screenshot({ path: join(OUT_DIR, `citadel-mastery-expanded-${SUFFIX}.png`), fullPage: true });
      console.log(`SHOT SAVED: citadel-mastery-expanded-${SUFFIX}.png`);
    } catch (e) {
      console.log("!! mastery expand step failed: " + e.message);
    }

    // Options (sidebar) — style reference only, not part of the redesign.
    if (SUFFIX === "ref") {
      await clickWithReloadRetry(page, page.locator('[data-guide-id="sidebar.options"]').first());
      await page.waitForTimeout(400);
      await page.screenshot({ path: join(OUT_DIR, `citadel-options-ref.png`), fullPage: true });
      console.log(`SHOT SAVED: citadel-options-ref.png`);
    }

    // Bank (topbar)
    await clickWithReloadRetry(page, page.locator('[data-guide-id="topbar.bank"]').first());
    await page.waitForTimeout(400);
    await page.screenshot({ path: join(OUT_DIR, `citadel-bank-${SUFFIX}.png`), fullPage: true });
    console.log(`SHOT SAVED: citadel-bank-${SUFFIX}.png`);

    console.log(errors.length ? `Console/page errors:\n${errors.join("\n")}` : "No console/page errors.");

    await browser.close();
  } finally {
    child.kill();
  }
}

run().catch((e) => { console.error(e); process.exit(1); });
