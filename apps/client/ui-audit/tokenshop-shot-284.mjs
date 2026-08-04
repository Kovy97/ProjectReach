#!/usr/bin/env node
/**
 * Task #284 self-check: screenshots the Quest-Token Rewards Shop with its first wares.
 * Fixture `tokenshop-284` = midgame + 60 questTokens (gen: see task notes; migration keeps a
 * numeric questTokens from the save). Flow: open shop tab (buyable state visible) → click the
 * first Buy button → shoot again (balance must drop by the offer's tokenCost — real vertical
 * slice through engine buyTokenShopOffer). Port 5198 per Chef instructions (dedicated, avoids
 * quests-shot-274.mjs on 5190 and the other tour scripts).
 *
 * Run: node tokenshop-shot-284.mjs
 * Output: PNGs written to the scratchpad dir below.
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
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });

  await page.goto(`${BASE_URL}/?fixture=tokenshop-284`, { waitUntil: "load" });
  await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
  await page.waitForTimeout(4500); // let load-toasts clear

  // Quests page → Rewards Shop tab (index 2).
  await page.locator('[data-guide-id="topbar.quests"]').first().click({ timeout: 6000 });
  await page.waitForTimeout(400);
  await page.locator(".quests-tab-btn").nth(2).click({ timeout: 6000 });
  await page.waitForTimeout(400);

  const balanceBefore = await page.locator(".quest-shop-panel .quest-token-badge-count").innerText();
  const offerCount = await page.locator(".quest-shop-offer").count();
  console.log(`SHOP STATE: balance=${balanceBefore}, offers=${offerCount}`);
  await page.screenshot({ path: join(OUT_DIR, "tokenshop-284-shop.png") });
  console.log("SHOT SAVED: tokenshop-284-shop.png");

  // Buy the first offer (cooked trout bundle, 4 tokens) — real engine purchase.
  await page.locator(".quest-shop-buy-btn").first().click({ timeout: 6000 });
  await page.waitForTimeout(400);
  const balanceAfter = await page.locator(".quest-shop-panel .quest-token-badge-count").innerText();
  console.log(`AFTER BUY: balance=${balanceAfter} (before=${balanceBefore})`);
  await page.screenshot({ path: join(OUT_DIR, "tokenshop-284-after-buy.png") });
  console.log("SHOT SAVED: tokenshop-284-after-buy.png");

  console.log(errors.length ? `${errors.length} page errors:\n` + errors.join("\n") : "no page errors");
  await browser.close();
} finally {
  child.kill();
}
