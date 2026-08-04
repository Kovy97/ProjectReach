#!/usr/bin/env node
/**
 * Verification shots for Task #323 ("Mass-Sell im Shop", Chef-Feature): toggle mode with a mixed
 * selection (simple item checked + stack with a qty badge + variant container "All x N"), the
 * quantity-slider popup (default = max), the Stack/Single choice popup, the variant checklist with
 * checkboxes + close (x), and the action bar with the live gold summary.
 * Pattern copied from bank-sanierung-314-shots.mjs (vite dev + Playwright, headless-only per
 * UI-Dev hard rule — never `pnpm dev`/Electron).
 * Run: node ui-audit/mass-sell-323-shots.mjs   (from apps/client/)
 */
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5323;
const BASE_URL = `http://localhost:${PORT}`;
const OUT_DIR = "C:\\Users\\MSchu\\AppData\\Local\\Temp\\claude\\G--GameDev\\553d2095-3a73-4795-9782-0fe746a25f13\\scratchpad\\masssell323-shots";
const T = 6000;

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

async function waitForServer(url, timeoutMs = 30_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

let currentPage = null;

async function step(name, fn) {
  try {
    await fn();
    console.log(`ok: ${name}`);
    return true;
  } catch (e) {
    console.log(`!! FAILED: ${name} — ${e.message.split("\n")[0]}`);
    if (currentPage) {
      const p = join(OUT_DIR, `FAIL-${name.replace(/[^a-z0-9]+/gi, "_").slice(0, 60)}.png`);
      await currentPage.screenshot({ path: p }).catch(() => {});
      console.log(`  (failure screenshot: ${p})`);
    }
    return false;
  }
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  console.log(`[ms323] starting dev server on port ${PORT}...`);
  const server = startDevServer();
  if (!(await waitForServer(BASE_URL))) {
    console.error("[ms323] dev server did not come up:\n" + server.getOutput());
    server.child.kill();
    process.exitCode = 1;
    return;
  }

  const browser = await chromium.launch();
  let failures = 0;
  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
    currentPage = page;
    page.setDefaultTimeout(T);
    page.setDefaultNavigationTimeout(25000);
    const errors = [];
    page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
    page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });

    await page.goto(`${BASE_URL}/?fixture=masssell323`, { waitUntil: "load" });
    await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
    await page.waitForTimeout(5000);

    if (!(await step("open Shop -> Sell tab", async () => {
      await page.locator('[data-guide-id="topbar.shop"]').first().click();
      await page.waitForSelector(".shopv2-maintab", { timeout: T });
      await page.locator(".shopv2-maintab").nth(1).click(); // Sell
      await page.waitForSelector(".shopv2-sell-grid", { timeout: T });
      await page.waitForTimeout(400);
    }))) failures++;

    if (!(await step("enter Mass Sell mode", async () => {
      await page.locator(".mshop-toggle-btn").click();
      await page.waitForSelector(".mshop-bar", { timeout: T });
      await page.waitForTimeout(200);
    }))) failures++;

    await step("shot: Mass Sell mode just entered (empty selection)", async () => {
      await page.screenshot({ path: join(OUT_DIR, "1-mode-entered.png") });
    });

    // ── (a) simple item: direct toggle ──
    if (!(await step("toggle simple item (normal_log, qty 1)", async () => {
      const cell = page.locator('.shopv2-sell-grid .item-cell:has(img[src*="normal_log"])').first();
      await cell.click();
      await page.waitForTimeout(150);
    }))) failures++;

    // ── (b) stacked fungible: qty slider popup, default = max ──
    if (!(await step("open qty slider popup (oak_log stack)", async () => {
      const cell = page.locator('.shopv2-sell-grid .item-cell:has(img[src*="oak_log"])').first();
      await cell.click();
      await page.waitForSelector(".mshop-range", { timeout: T });
      await page.waitForTimeout(150);
    }))) failures++;

    await step("shot: qty slider popup (default = max)", async () => {
      await page.screenshot({ path: join(OUT_DIR, "2-qty-slider-popup.png") });
    });

    if (!(await step("confirm qty slider", async () => {
      await page.locator(".mshop-popup-actions button").last().click(); // Confirm
      await page.waitForSelector(".mshop-range", { state: "detached", timeout: T });
      await page.waitForTimeout(150);
    }))) failures++;

    // ── (c) variant container: Stack/Single choice popup ──
    if (!(await step("open Stack/Single choice popup (rusty_sword container)", async () => {
      const cell = page.locator('.shopv2-sell-grid .item-cell:has(img[src*="rusty_sword"])').first();
      await cell.click();
      await page.waitForSelector(".mshop-mode-choices", { timeout: T });
      await page.waitForTimeout(150);
    }))) failures++;

    await step("shot: Stack/Single choice popup", async () => {
      await page.screenshot({ path: join(OUT_DIR, "3-stack-single-popup.png") });
    });

    if (!(await step("choose Single -> variant checklist opens", async () => {
      await page.locator(".mshop-mode-card").nth(1).click(); // "Choose Individually"
      await page.waitForSelector(".mshop-variant-row", { timeout: T });
      await page.waitForTimeout(150);
    }))) failures++;

    // Row index 0 is the base/"Grundversion" row (plainQty=2 here -> opens a NESTED qty-slider
    // popup on click, same slider as the top-level fungible case) — the checklist demo below
    // targets the plain enchanted-VARIANT rows (index 1+) which toggle directly, no nested popup.
    if (!(await step("check two variant rows", async () => {
      const rows = page.locator(".mshop-variant-row");
      const n = await rows.count();
      if (n > 1) await rows.nth(1).click();
      if (n > 2) await rows.nth(2).click();
      await page.waitForTimeout(150);
    }))) failures++;

    await step("shot: variant checklist with checkboxes + close (x)", async () => {
      await page.screenshot({ path: join(OUT_DIR, "4-variant-checklist.png") });
    });

    if (!(await step("close variant checklist via x", async () => {
      await page.locator(".modal.pouch-modal .modal-close").click();
      await page.waitForSelector(".mshop-variant-row", { state: "detached", timeout: T });
      await page.waitForTimeout(200);
    }))) failures++;

    await step("shot: action bar with mixed selection (simple + stack badge + container 'All x N' or selection badge)", async () => {
      await page.screenshot({ path: join(OUT_DIR, "5-mixed-selection-bar.png") });
    });

    // ── Execute the sale -> result banner ──
    if (!(await step("click Sell -> result banner", async () => {
      const sellBtn = page.locator(".mshop-bar-actions button").first();
      await sellBtn.click();
      await page.waitForSelector(".mshop-result-banner", { timeout: T });
      await page.waitForTimeout(150);
    }))) failures++;

    await step("shot: result banner (one summary, mode stays on)", async () => {
      await page.screenshot({ path: join(OUT_DIR, "6-result-banner.png") });
    });

    // ── Esc leaves the mode (Chef-Vorgabe) — mode is confirmed still ON after the sale above ──
    if (!(await step("Escape exits Mass Sell mode (no popup open)", async () => {
      const before = await page.locator(".mshop-bar").count();
      if (before !== 1) throw new Error(`expected mode still active before Escape, .mshop-bar count=${before}`);
      await page.keyboard.press("Escape");
      await page.waitForSelector(".mshop-bar", { state: "detached", timeout: T });
    }))) failures++;

    await step("shot: mode exited via Escape", async () => {
      await page.screenshot({ path: join(OUT_DIR, "7-escape-exit.png") });
    });

    console.log(errors.length ? `${errors.length} page errors:\n` + errors.slice(0, 20).join("\n") : "no page errors");
  } finally {
    await browser.close();
    server.child.kill();
  }
  console.log(failures > 0 ? `[ms323] ${failures} SANITY-CHECK(S) FAILED` : "[ms323] alle Sanity-Checks OK");
  process.exitCode = failures > 0 ? 1 : 0;
}

main();
