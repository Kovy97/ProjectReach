#!/usr/bin/env node
/**
 * One-off screenshot script for Task #308 (Item-Wiki-?-Modal, Chef-Feature). Mirrors
 * tooltip-shot-304.mjs / tooltip-shot-307.mjs's headless (non-Electron) Vite+Playwright pattern —
 * see tooltip-shot-304.mjs's header comment for why this is the sanctioned way for an agent to
 * look at the rendered UI. Port bumped to the Chef-requested 5214.
 *
 * Uses the stock "endgame" fixture as-is (no JSON patch needed — both example items already sit
 * in inventory slots):
 *   slot 2 (iron_ore)          — multi-source + multi-use material ("ein Erz", per Chef-Auftrag):
 *                                 mining action (100%) + 3 monster drops + used in a smithing recipe.
 *   slot 6 (void_herald_shard) — pure monster-drop item (Void Herald 10% / Abyssal Devourer 5%,
 *                                 no action/shop source), also consumed by a jewelcrafting recipe.
 *
 * Covers all 4 required cases from the task brief:
 *   1. pinned tooltip with the "?" button visible
 *   2. opened wiki modal for a multi-source/multi-use material (iron_ore)
 *   3. wiki modal for a monster-drop item (void_herald_shard)
 *   4. Escape closes the modal (DOM assertion, not just a screenshot)
 *
 * Run: node ui-audit/tooltip-shot-308.mjs   (from apps/client/)
 */
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const SHOTS_DIR = join(__dirname, "shots-308");
const PORT = 5214;
const BASE_URL = `http://localhost:${PORT}`;
const VIEWPORT = { width: 1600, height: 1000 };

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
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

async function main() {
  mkdirSync(SHOTS_DIR, { recursive: true });

  console.log(`[shot308] starting dev server on port ${PORT}...`);
  const server = startDevServer();
  const up = await waitForServer(BASE_URL, 30_000);
  if (!up) {
    console.error("[shot308] dev server did not come up in time:\n" + server.getOutput());
    server.child.kill();
    process.exitCode = 1;
    return;
  }
  console.log("[shot308] dev server is up.");

  const browser = await chromium.launch();
  let failed = false;
  try {
    const page = await browser.newPage({ viewport: VIEWPORT });
    page.on("pageerror", (err) => console.error("[shot308] pageerror:", err.message));

    await page.goto(`${BASE_URL}/?fixture=endgame`, { waitUntil: "load" });
    await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15_000 });
    // Let the fixture-load achievement toasts clear (same wait as tour.mjs/shot-304/307).
    await page.waitForTimeout(4200);

    await page.locator('[data-guide-id="topbar.character"]').first().click();
    await page.waitForLoadState("networkidle", { timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(400);

    const invSlot = (i) => page.locator(".cs-inv-grid .cs-inv-slot-wrap").nth(i).locator(".item-cell").first();

    // ── Case 1: pinned tooltip with the "?" button visible (iron_ore, slot 2) ──
    await invSlot(2).click();
    await page.waitForTimeout(300);
    const wikiBtn = page.locator(".itip-wiki-btn").first();
    const wikiBtnCount = await wikiBtn.count();
    console.log(`[shot308] wiki button present on pinned tooltip: ${wikiBtnCount > 0}`);
    if (wikiBtnCount === 0) {
      console.error("[shot308] FAIL: .itip-wiki-btn not found on pinned tooltip");
      failed = true;
    }
    await page.screenshot({ path: join(SHOTS_DIR, "01-pinned-tooltip-wiki-btn.png"), fullPage: true });
    console.log("[shot308] 01-pinned-tooltip-wiki-btn.png (iron_ore, pinned tooltip, \"?\" visible top-right)");

    // ── Case 2: open the wiki modal for iron_ore — multi-source + multi-use material ──
    await wikiBtn.click();
    await page.waitForTimeout(300);
    const modalAfterOpen = await page.locator(".iwk-modal").count();
    const tooltipAfterOpen = await page.locator(".item-tooltip").count();
    console.log(`[shot308] modal open: ${modalAfterOpen > 0}, tooltip closed on open: ${tooltipAfterOpen === 0}`);
    if (modalAfterOpen === 0 || tooltipAfterOpen !== 0) {
      console.error("[shot308] FAIL: expected modal open + tooltip closed after clicking \"?\"");
      failed = true;
    }
    const sourceRows = await page.locator(".iwk-section").nth(0).locator(".iwk-row").count();
    const useRows = await page.locator(".iwk-section").nth(1).locator(".iwk-row").count();
    console.log(`[shot308] iron_ore: ${sourceRows} source row(s), ${useRows} used-for row(s)`);
    if (sourceRows < 2 || useRows < 1) {
      console.error("[shot308] FAIL: expected iron_ore to show >=2 sources and >=1 used-for entry");
      failed = true;
    }
    await page.screenshot({ path: join(SHOTS_DIR, "02-wiki-modal-iron-ore.png"), fullPage: true });
    console.log("[shot308] 02-wiki-modal-iron-ore.png (multi-source + multi-use material)");

    // ── Case 4 (checked here while a modal is open): Escape closes it, DOM-asserted ──
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
    const modalAfterEsc = await page.locator(".iwk-modal").count();
    console.log(`[shot308] modal count after Escape: ${modalAfterEsc} (expected 0)`);
    if (modalAfterEsc !== 0) {
      console.error("[shot308] FAIL: .iwk-modal still present after Escape");
      failed = true;
    }
    await page.screenshot({ path: join(SHOTS_DIR, "03-after-escape-closed.png"), fullPage: true });
    console.log("[shot308] 03-after-escape-closed.png (modal gone after Escape)");

    // ── Case 3: wiki modal for a pure monster-drop item (void_herald_shard, slot 6) ──
    await invSlot(6).click();
    await page.waitForTimeout(300);
    await page.locator(".itip-wiki-btn").first().click();
    await page.waitForTimeout(300);
    const modalAfterOpen2 = await page.locator(".iwk-modal").count();
    if (modalAfterOpen2 === 0) {
      console.error("[shot308] FAIL: expected wiki modal open for void_herald_shard");
      failed = true;
    }
    const monsterSourceCount = await page.locator(".iwk-section").nth(0).locator(".iwk-row").count();
    console.log(`[shot308] void_herald_shard: ${monsterSourceCount} source row(s) (expect 2 monsters, no shop/action)`);
    await page.screenshot({ path: join(SHOTS_DIR, "04-wiki-modal-monster-drop.png"), fullPage: true });
    console.log("[shot308] 04-wiki-modal-monster-drop.png (void_herald_shard, monster-only source)");

    console.log(`[shot308] done. Screenshots in ${SHOTS_DIR}`);
  } finally {
    await browser.close();
    server.child.kill();
  }
  if (failed) {
    console.error("[shot308] one or more DOM assertions FAILED — see log above.");
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("[shot308] fatal:", err);
  process.exitCode = 1;
});
