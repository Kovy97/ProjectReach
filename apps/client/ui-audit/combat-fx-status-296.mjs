#!/usr/bin/env node
/**
 * Task #296 follow-up: targeted capture of the status-ring-pulse (P0 §1.5), which the main
 * combat-fx-shot-296.mjs run didn't catch in its 8s opportunistic budget (Pastures/Chicken
 * doesn't inflict anything). Borderlands' goblin_felmagician (level 27, close to the midgame
 * char's ~30) has a 25% poison-inflict chance per monster hit — good odds within this budget.
 * Port 5203, midgame fixture, same slow-mo/poll technique as the main script.
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5203;
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

const { child, getOutput } = startDevServer();
try {
  const ok = await waitForServer(BASE_URL);
  if (!ok) { console.error("SERVER NOT UP:\n" + getOutput()); process.exit(1); }
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });

  await page.goto(`${BASE_URL}/?fixture=midgame`, { waitUntil: "load" });
  await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
  await page.waitForTimeout(4500);
  await clickWithReloadRetry(page, page.locator('[data-guide-id="sidebar.combat"]').first());
  await page.waitForTimeout(500);
  await clickWithReloadRetry(page, page.locator(".zone-card", { hasText: /Grenzland|Borderlands/ }).first());
  await page.waitForTimeout(1500);
  const card = page.locator(".monster-card", { hasText: /Felmagier|Fel Magician/ }).first();
  await clickWithReloadRetry(page, card.locator(".mc-fight-btn"));
  await page.waitForSelector(".battle", { timeout: 10000 });
  await page.waitForTimeout(600);

  try {
    await page.waitForFunction(
      () => !!document.querySelector(".fighter.status-pulse"),
      null,
      { timeout: 90000, polling: 25 },
    );
    await page.screenshot({ path: join(OUT_DIR, "fx296-status-pulse-1920.png") });
    console.log("SHOT SAVED: fx296-status-pulse-1920.png");
    const playerFighter = page.locator(".fighter.status-pulse").first();
    await playerFighter.screenshot({ path: join(OUT_DIR, "fx296-status-pulse-crop-1920.png") });
    console.log("SHOT SAVED: fx296-status-pulse-crop-1920.png");
  } catch (e) {
    console.log("!! status-pulse capture failed: " + e.message);
  }

  await browser.close();
} finally {
  child.kill();
}
