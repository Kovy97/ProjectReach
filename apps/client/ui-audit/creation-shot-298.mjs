#!/usr/bin/env node
/**
 * Task #298 follow-up: the main scale-audit-298.mjs run only clicked the "NEUES SPIEL" NAV button,
 * which opens the slot-select panel (menu-slots) — not the actual CharacterCreation.tsx form.
 * This drills one level deeper: click "NEUES SPIEL" on an empty slot to reach the real creation
 * page (name input, style picker, portrait strip). Port 5207 (5205/5206 used by sibling scripts).
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5207;
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
  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  await clickWithReloadRetry(page, page.locator(".menu-nav-btn").nth(0)); // "Neues Spiel" nav
  await page.waitForTimeout(500);
  // Click "NEUES SPIEL" on the first empty slot.
  await clickWithReloadRetry(page, page.locator(".menu-slot-actions button").first());
  await page.waitForTimeout(600);
  await page.screenshot({ path: join(OUT_DIR, "04b-character-creation-real.png"), fullPage: false });
  console.log("SHOT: 04b-character-creation-real.png");

  const moreBtn = page.locator(".creation-portrait-more-btn");
  if (await moreBtn.count()) {
    await clickWithReloadRetry(page, moreBtn.first());
    await page.waitForTimeout(400);
    await page.screenshot({ path: join(OUT_DIR, "05-character-creation-portrait-modal.png"), fullPage: false });
    console.log("SHOT: 05-character-creation-portrait-modal.png");
  } else {
    console.log("no portrait-more-btn found");
  }

  await browser.close();
} finally {
  child.kill();
}
