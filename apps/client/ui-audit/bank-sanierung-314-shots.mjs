#!/usr/bin/env node
/**
 * Verification shots for Task #314 ("Bank-Sanierung", Chef-GO 2026-07-24): pointer-DnD ghost +
 * drop-zone highlight (best effort per Chef), variant-container group deposit/withdraw before/
 * after, the bank-full GameAlert case, and the shared QuantityPicker widget in Shop + Bank.
 * Pattern copied from a-welle-shots-313.mjs (vite dev + Playwright, NOT `pnpm dev`/Electron —
 * headless-only per UI-Dev hard rule). Fixtures: bank314 / bank314full (gen-bank314-fixture.mjs).
 *
 * v2: every interaction uses a SHORT explicit timeout + try/catch so one bad selector can't stall
 * the whole run for minutes (v1 chained several 30s-default-timeout retries back to back).
 * Run: node ui-audit/bank-sanierung-314-shots.mjs   (from apps/client/)
 */
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5315;
const BASE_URL = `http://localhost:${PORT}`;
const OUT_DIR = "C:\\Users\\MSchu\\AppData\\Local\\Temp\\claude\\G--GameDev\\553d2095-3a73-4795-9782-0fe746a25f13\\scratchpad\\bank314-shots";
const T = 6000; // short explicit timeout per action — nothing in this script should ever need 30s

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

let currentPage = null; // set once in main() — lets step() grab a failure screenshot without
// threading `page` through every call site.

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
  console.log(`[b314] starting dev server on port ${PORT}...`);
  const server = startDevServer();
  if (!(await waitForServer(BASE_URL))) {
    console.error("[b314] dev server did not come up:\n" + server.getOutput());
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
    page.setDefaultNavigationTimeout(25000); // cold Vite compile on first navigation can be slow
    const errors = [];
    page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
    page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });

    // ═══ Part A: roomy fixture — bank overview, shift hint, variant group transfer, drag ghost ═══
    await page.goto(`${BASE_URL}/?fixture=bank314`, { waitUntil: "load" });
    await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
    await page.waitForTimeout(5000); // let HMR/dep-optimize settle on a cold server + load-toasts clear

    if (!(await step("open Bank", async () => {
      await page.locator('[data-guide-id="topbar.bank"]').first().click();
      await page.waitForSelector(".bank-columns", { timeout: T });
      await page.waitForTimeout(500);
    }))) failures++;

    await step("shot: bank overview + shift hint", async () => {
      await page.screenshot({ path: join(OUT_DIR, "1-bank-overview-shifthint.png") });
    });

    // Weapon has 4 distinct versions here (plain stack + 3 differently-enchanted instances) ->
    // VariantContainerCell renders it as a STAR-badge container that OPENS THE POUCH MODAL on a
    // plain click (by design, s. VariantContainerCell.tsx). Shift+click bypasses the modal and
    // fires `onShiftClick` (= depositItemGroup) directly — the same shortcut the new bank.shiftHint
    // text advertises, and the cleanest way to demonstrate the atomic group-op in one step.
    const varCell = page.locator(".bank-columns .bank-grid").first().locator('.item-cell:has(img[src*="rusty_sword"])').first();
    if (!(await step("locate variant-container cell (rusty_sword, inventory)", async () => {
      await varCell.waitFor({ state: "visible", timeout: T });
    }))) failures++;

    await step("shot: variant cell BEFORE group deposit", async () => {
      await varCell.screenshot({ path: join(OUT_DIR, "2a-variant-cell-before.png") });
    });

    if (!(await step("shift-click variant cell -> depositItemGroup (whole stack+instances, one move)", async () => {
      const box = await varCell.boundingBox({ timeout: T });
      if (!box) throw new Error("variant cell has no bounding box");
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.keyboard.down("Shift");
      await page.mouse.down();
      await page.mouse.up();
      await page.keyboard.up("Shift");
      await page.waitForTimeout(400);
    }))) failures++;

    await step("shot: after group deposit (inventory side)", async () => {
      await page.screenshot({ path: join(OUT_DIR, "2b-after-group-deposit.png") });
    });

    const bankVarCell = page.locator(".bank-columns .bank-grid").nth(1).locator('.item-cell:has(img[src*="rusty_sword"])').first();
    if (!(await step("locate the same group now in the bank column", async () => {
      await bankVarCell.waitFor({ state: "visible", timeout: T });
    }))) failures++;

    await step("shot: variant cell landed as ONE container in bank", async () => {
      await bankVarCell.screenshot({ path: join(OUT_DIR, "2c-variant-cell-in-bank.png") });
    });

    // ── Pointer-drag: bank column material stack -> inventory column (best effort per Chef) ──
    await step("pointer-drag ghost + gold highlight, bank -> inventory", async () => {
      const invGrid = page.locator(".bank-columns .bank-grid").first();
      const bankGrid = page.locator(".bank-columns .bank-grid").nth(1);
      // Explicit plain-material target (not the rusty_sword variant group) — unambiguous regardless
      // of grid ordering/HMR churn.
      const dragSource = bankGrid.locator('.item-cell:has(img[src*="oak_log"])').first();
      const srcBox = await dragSource.boundingBox({ timeout: T });
      const invBox = await invGrid.boundingBox({ timeout: T });
      if (!srcBox || !invBox) throw new Error("bounding boxes unavailable");
      await page.mouse.move(srcBox.x + srcBox.width / 2, srcBox.y + srcBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(srcBox.x + 30, srcBox.y - 20, { steps: 3 });
      await page.mouse.move(invBox.x + invBox.width / 2, invBox.y + invBox.height / 2, { steps: 6 });
      await page.waitForTimeout(80);
      await page.screenshot({ path: join(OUT_DIR, "3-drag-ghost-and-highlight.png") });
      await page.mouse.up();
      await page.waitForTimeout(250);
      await page.screenshot({ path: join(OUT_DIR, "3b-after-drop.png") });
    });

    // ── Bank-Teilmengen modal (QuantityPicker inside BankQtyModal) ──
    await step("open Bank-Teilmengen (withdrawQty) modal", async () => {
      const bankGrid = page.locator(".bank-columns .bank-grid").nth(1);
      const cell = bankGrid.locator('.item-cell:has(img[src*="ashbark_log"])').first();
      await cell.click();
      const actions = page.locator(".it-actions .it-action-btn");
      await actions.first().waitFor({ state: "visible", timeout: T });
      const n = await actions.count();
      if (n < 2) throw new Error(`expected >=2 withdraw actions, got ${n}`);
      await actions.nth(1).click(); // withdraw1, withdrawQty, withdrawAll -> index 1 = withdrawQty
      await page.waitForSelector(".qty-modal", { timeout: T });
      await page.waitForTimeout(200);
      await page.screenshot({ path: join(OUT_DIR, "4-bank-qty-modal.png") });
      await page.keyboard.press("Escape");
      await page.waitForSelector(".qty-modal", { state: "detached", timeout: T });
    });

    // ═══ Part B: shop QuantityPicker (Buy tab) ═══
    // Defensive: force-close any leftover overlay (a stray pinned tooltip/wiki-modal was observed
    // once to survive the qty-modal's Escape-close and block the topbar click) before navigating.
    await page.keyboard.press("Escape").catch(() => {});
    await page.mouse.click(10, 10).catch(() => {}); // click a neutral corner, closes hover tooltips
    await page.waitForTimeout(200);

    await step("shot: shop Buy tab QuantityPicker", async () => {
      await page.locator('[data-guide-id="topbar.shop"]').first().click();
      await page.waitForSelector(".shopv2-card", { timeout: T });
      await page.waitForTimeout(400);
      const card = page.locator(".shopv2-card").first();
      await card.screenshot({ path: join(OUT_DIR, "5a-shop-buy-quantitypicker.png") });
    });

    await step("shot: shop Sell tab QuantityPicker", async () => {
      await page.locator(".shopv2-maintab", { hasText: /./ }).nth(1).click(); // Sell tab (2nd main tab)
      await page.waitForTimeout(400);
      const sellCell = page.locator(".shopv2-sell-grid .item-cell, .shopv2-sell-grid .pouch-row").first();
      if (await sellCell.count()) {
        await sellCell.click();
        await page.waitForTimeout(250);
      }
      await page.screenshot({ path: join(OUT_DIR, "5b-shop-sell-quantitypicker.png") });
    });

    // ═══ Part C: bank314full fixture — withdraw into a full inventory -> GameAlert ═══
    await step("shot: GameAlert on withdraw-into-full-inventory", async () => {
      await page.goto(`${BASE_URL}/?fixture=bank314full`, { waitUntil: "load" });
      await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
      await page.waitForTimeout(4000);
      await page.locator('[data-guide-id="topbar.bank"]').first().click();
      await page.waitForSelector(".bank-columns", { timeout: T });
      await page.waitForTimeout(500);
      const invFullSlots = await page.locator(".bank-columns .bank-grid").first().locator(".inv-slot:not(.filled)").count();
      console.log(`  free inventory slots in bank314full: ${invFullSlots} (expect 0)`);
      const bankGrid = page.locator(".bank-columns .bank-grid").nth(1);
      // ironbark_log is deliberately bank-only in this fixture (gen-bank314-fixture.mjs) — zero
      // inventory presence, so `canHold` genuinely has nowhere to put it (unlike the other bank
      // materials, which the fixture ALSO stocks a little of in the inventory).
      const cell = bankGrid.locator('.item-cell:has(img[src*="ironbark_log"])').first();
      await cell.click();
      const actions = page.locator(".it-actions .it-action-btn");
      await actions.first().waitFor({ state: "visible", timeout: T });
      await actions.first().click(); // "Withdraw 1" — must fail (no room) + GameAlert
      await page.waitForTimeout(250);
      const alertVisible = await page.locator(".game-alert").count();
      console.log(`  GameAlert visible: ${alertVisible > 0}`);
      await page.screenshot({ path: join(OUT_DIR, "6-withdraw-full-gamealert.png") });
      if (invFullSlots !== 0 || alertVisible === 0) throw new Error("expected a full inventory + a visible GameAlert");
    });

    console.log(errors.length ? `${errors.length} page errors:\n` + errors.slice(0, 20).join("\n") : "no page errors");
  } finally {
    await browser.close();
    server.child.kill();
  }
  console.log(failures > 0 ? `[b314] ${failures} SANITY-CHECK(S) FAILED` : "[b314] alle Sanity-Checks OK");
  process.exitCode = failures > 0 ? 1 : 0;
}

main();
