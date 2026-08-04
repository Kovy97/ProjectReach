#!/usr/bin/env node
/**
 * UI-dev verification shots for the item-cell rarity-border + hover/press micro-interaction
 * polish (components.css: `.item-cell.rarity-*`, `.item-cell:hover`/`:active`). Uses the
 * ?fixture=endgame save (has epic/legendary items) so multiple rarity tiers are visible at once.
 * Port 5220 per task (avoid collision with other concurrent ui-audit runs).
 *
 * Run: node item-cell-rarity-shot.mjs
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5220;
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
  try { await locator.click({ timeout: 6000, ...opts }); }
  catch { await page.waitForTimeout(400); await locator.click({ timeout: 6000, ...opts }); }
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

  await page.goto(`${BASE_URL}/?fixture=endgame`, { waitUntil: "load" });
  await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
  await page.waitForTimeout(4300); // let fixture-load toasts clear

  // ── 1. Character/Inventory + Loadout (equipped items) ──────────────────
  await clickWithReloadRetry(page, page.locator('[data-guide-id="topbar.character"]').first());
  await page.waitForSelector(".inv-slot", { timeout: 15000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(OUT_DIR, "rarity-01-inventory.png"), fullPage: false });
  console.log("SHOT: rarity-01-inventory.png");

  // Hover a filled inventory slot to capture the lift/brighten micro-interaction.
  const filledSlot = page.locator(".inv-slot.filled .item-cell, .inv-slot.filled.item-cell").first();
  if (await filledSlot.count()) {
    await filledSlot.hover();
    await page.waitForTimeout(250);
    await page.screenshot({ path: join(OUT_DIR, "rarity-02-inventory-hover.png"), fullPage: false });
    console.log("SHOT: rarity-02-inventory-hover.png");
  } else {
    console.log("WARN: no filled inventory slot found for hover shot");
  }

  // ── 2. Shop — Buy tab (rarity-tinted shopv2-card + item-cell borders) ──
  await clickWithReloadRetry(page, page.locator('[data-guide-id="topbar.shop"]').first());
  await page.waitForSelector(".shopv2-card", { timeout: 15000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(OUT_DIR, "rarity-03-shop-buy.png"), fullPage: false });
  console.log("SHOT: rarity-03-shop-buy.png");

  const buyCard = page.locator(".shopv2-card").first();
  await buyCard.hover();
  await page.waitForTimeout(250);
  await page.screenshot({ path: join(OUT_DIR, "rarity-04-shop-buy-hover.png"), fullPage: false });
  console.log("SHOT: rarity-04-shop-buy-hover.png");

  // ── 3. Shop — Sell tab ──────────────────────────────────────────────────
  const sellTab = page.locator(".shopv2-maintab").nth(1);
  if (await sellTab.count()) {
    await clickWithReloadRetry(page, sellTab);
    await page.waitForTimeout(400);
    await page.screenshot({ path: join(OUT_DIR, "rarity-05-shop-sell.png"), fullPage: false });
    console.log("SHOT: rarity-05-shop-sell.png");
  }

  // ── 4. Token-Shop (Slayer reward shop) ──────────────────────────────────
  const slayerNav = page.locator('[data-guide-id="sidebar.slayer"]').first();
  if (await slayerNav.count()) {
    await clickWithReloadRetry(page, slayerNav);
    await page.waitForTimeout(400);
    const shopToggle = page.locator("text=/shop|Shop|Laden/i").first();
    if (await shopToggle.count()) { await clickWithReloadRetry(page, shopToggle); await page.waitForTimeout(400); }
    await page.screenshot({ path: join(OUT_DIR, "rarity-06-token-shop.png"), fullPage: false });
    console.log("SHOT: rarity-06-token-shop.png");
  }

  // ── 5. Offline stage (harmonized loot grid — no more separate gold outline) ──
  await page.goto(`${BASE_URL}/?fixture=endgame&offlineTest=1`, { waitUntil: "load" });
  await page.waitForSelector(".offline-stage", { timeout: 15000 });
  await page.waitForTimeout(4300);
  await page.screenshot({ path: join(OUT_DIR, "rarity-07-offline-stage.png"), fullPage: false });
  console.log("SHOT: rarity-07-offline-stage.png");

  console.log(errors.length ? "PAGE ERRORS:\n" + errors.slice(0, 20).join("\n") : "no page errors");
  await browser.close();
} finally {
  child.kill();
}
