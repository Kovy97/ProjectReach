#!/usr/bin/env node
/**
 * Task #284 add-on: disabled-state check — fixture with only 5 tokens, so most offers
 * (cost > 5) must render disabled with the "Nicht genug Marken" hint. Port 5198 (same as
 * tokenshop-shot-284.mjs, runs are sequential).
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5198;
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

const { child, getOutput } = startDevServer();
try {
  const ok = await waitForServer(BASE_URL);
  if (!ok) { console.error("SERVER NOT UP:\n" + getOutput()); process.exit(1); }
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await page.goto(`${BASE_URL}/?fixture=tokenshop-284-low`, { waitUntil: "load" });
  await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
  await page.waitForTimeout(4500);
  await page.locator('[data-guide-id="topbar.quests"]').first().click({ timeout: 6000 });
  await page.waitForTimeout(400);
  await page.locator(".quests-tab-btn").nth(2).click({ timeout: 6000 });
  await page.waitForTimeout(400);
  const disabled = await page.locator(".quest-shop-buy-btn:disabled").count();
  const enabled = await page.locator(".quest-shop-buy-btn:enabled").count();
  console.log(`LOW-TOKEN STATE: enabled=${enabled}, disabled=${disabled}`);
  await page.screenshot({ path: join(OUT_DIR, "tokenshop-284-low.png") });
  console.log("SHOT SAVED: tokenshop-284-low.png");
  await browser.close();
} finally {
  child.kill();
}
