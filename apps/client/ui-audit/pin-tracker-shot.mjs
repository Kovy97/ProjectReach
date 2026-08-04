#!/usr/bin/env node
/**
 * One-off screenshot script for the Rezept-Pin / Ziel-Tracker (Chef-GO 2026-07-09). Mirrors the
 * tooltip-shot-308.mjs headless (non-Electron) Vite+Playwright pattern. Port 5217 per Chef request.
 *
 * PinnedTracker.tsx is temporarily mounted in App.tsx for this screenshot pass only (ui-dev reverts
 * that mount before reporting done — the CEO mounts it for real with a single line elsewhere).
 *
 * Covers:
 *   1. a crafting card with its pin button visible (unpinned state)
 *   2. the tracker widget with 2 pins — one fully craftable (gold ready-border), one missing mats
 *   3. the pinned card's pin button in the "pinned" (active) visual state
 *   4. the tracker collapsed
 *
 * Run: node ui-audit/pin-tracker-shot.mjs   (from apps/client/)
 */
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const SHOTS_DIR = join(__dirname, "shots-pin-tracker");
const PORT = 5217;
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

  console.log(`[pintracker] starting dev server on port ${PORT}...`);
  const server = startDevServer();
  const up = await waitForServer(BASE_URL, 30_000);
  if (!up) {
    console.error("[pintracker] dev server did not come up in time:\n" + server.getOutput());
    server.child.kill();
    process.exitCode = 1;
    return;
  }
  console.log("[pintracker] dev server is up.");

  const browser = await chromium.launch();
  let failed = false;
  try {
    const page = await browser.newPage({ viewport: VIEWPORT });
    page.on("pageerror", (err) => console.error("[pintracker] pageerror:", err.message));

    await page.goto(`${BASE_URL}/?fixture=midgame`, { waitUntil: "load" });
    await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15_000 });
    // Let fixture-load achievement toasts clear (same wait as other one-off shot scripts).
    await page.waitForTimeout(4200);

    // Leatherworking: midgame fixture's inventory has 11x hardened_leather (cheap recipes are
    // craftable) but no frost_essence (pricier recipes are blocked) — mixed availability on one page.
    await page.locator('[data-guide-id="sidebar.leatherworking"]').first().click();
    await page.waitForTimeout(400);

    // ── Case 1: pin button visible (unpinned) on a crafting card ──
    const pinButtons = page.locator(".skillcard-pin");
    const pinCount = await pinButtons.count();
    console.log(`[pintracker] crafting cards with a pin button: ${pinCount}`);
    if (pinCount === 0) {
      console.error("[pintracker] FAIL: expected at least one .skillcard-pin on the smithing page");
      failed = true;
    }
    await page.screenshot({ path: join(SHOTS_DIR, "01-card-pin-button.png"), fullPage: false });
    console.log("[pintracker] 01-card-pin-button.png");

    // Find one card that IS craftable right now (mats present) and one that is NOT, by reading
    // each card's .craftable badge — pin one of each so the tracker shows both a ready (gold) and
    // a blocked (missing-mats) row.
    const cards = page.locator(".skillcard");
    const cardCount = await cards.count();
    let pinnedReady = false;
    let pinnedBlocked = false;
    for (let i = 0; i < cardCount && (!pinnedReady || !pinnedBlocked); i++) {
      const card = cards.nth(i);
      const pinBtn = card.locator(".skillcard-pin");
      if ((await pinBtn.count()) === 0) continue;
      const craftableEl = card.locator(".craftable");
      if ((await craftableEl.count()) === 0) continue;
      const cls = (await craftableEl.getAttribute("class")) ?? "";
      const isReady = !cls.includes("none");
      if (isReady && !pinnedReady) {
        await pinBtn.first().click();
        pinnedReady = true;
        console.log(`[pintracker] pinned READY card at index ${i}`);
      } else if (!isReady && !pinnedBlocked) {
        await pinBtn.first().click();
        pinnedBlocked = true;
        console.log(`[pintracker] pinned BLOCKED card at index ${i}`);
      }
    }
    if (!pinnedReady || !pinnedBlocked) {
      console.error(`[pintracker] FAIL: could not find both a ready and a blocked craftable card (ready=${pinnedReady}, blocked=${pinnedBlocked})`);
      failed = true;
    }
    await page.waitForTimeout(300);

    // ── Case 3: the pinned card shows the "pinned" active visual state ──
    const pinnedBtnCount = await page.locator(".skillcard-pin.pinned").count();
    console.log(`[pintracker] cards showing .skillcard-pin.pinned: ${pinnedBtnCount} (expect 2)`);
    if (pinnedBtnCount !== 2) {
      console.error("[pintracker] FAIL: expected exactly 2 cards with .skillcard-pin.pinned");
      failed = true;
    }
    await page.screenshot({ path: join(SHOTS_DIR, "02-card-pinned-state.png"), fullPage: false });
    console.log("[pintracker] 02-card-pinned-state.png");

    // ── Case 2: tracker widget with 2 pins — one ready (gold border), one blocked ──
    const widget = page.locator(".ptr-widget");
    const widgetCount = await widget.count();
    console.log(`[pintracker] .ptr-widget present: ${widgetCount > 0}`);
    if (widgetCount === 0) {
      console.error("[pintracker] FAIL: .ptr-widget not found after pinning 2 recipes");
      failed = true;
    }
    const rowCount = await page.locator(".ptr-row").count();
    const readyRowCount = await page.locator(".ptr-row.ptr-ready").count();
    console.log(`[pintracker] tracker rows: ${rowCount} (expect 2), ready rows: ${readyRowCount} (expect 1)`);
    if (rowCount !== 2 || readyRowCount !== 1) {
      console.error("[pintracker] FAIL: expected 2 rows, 1 of them ready");
      failed = true;
    }
    await page.screenshot({ path: join(SHOTS_DIR, "03-tracker-two-pins.png"), fullPage: false });
    console.log("[pintracker] 03-tracker-two-pins.png (widget, 2 pins, 1 ready/gold + 1 blocked)");

    // ── Case 4: collapsed tracker ──
    await page.locator(".ptr-header").click();
    await page.waitForTimeout(250);
    const bodyVisibleAfterCollapse = await page.locator(".ptr-body").count();
    console.log(`[pintracker] .ptr-body present after collapse click: ${bodyVisibleAfterCollapse} (expect 0)`);
    if (bodyVisibleAfterCollapse !== 0) {
      console.error("[pintracker] FAIL: expected .ptr-body gone after collapsing");
      failed = true;
    }
    await page.screenshot({ path: join(SHOTS_DIR, "04-tracker-collapsed.png"), fullPage: false });
    console.log("[pintracker] 04-tracker-collapsed.png");

    // Re-expand + verify persistence: reload the page, collapsed state + pins should survive
    // (localStorage-backed, no save-state dependency).
    // Reload: pins AND the collapsed state should both survive (localStorage-backed). The widget
    // was just collapsed above, so its body is expected to stay hidden — persistence is checked via
    // the header count badge instead of the (intentionally hidden) rows.
    await page.reload({ waitUntil: "load" });
    await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15_000 });
    await page.waitForTimeout(600);
    const collapsedAfterReload = await page.locator(".ptr-body").count();
    const countTextAfterReload = await page.locator(".ptr-header-count").innerText().catch(() => "");
    console.log(`[pintracker] after reload — body present: ${collapsedAfterReload} (expect 0, still collapsed), header count: "${countTextAfterReload}" (expect 2/3)`);
    if (collapsedAfterReload !== 0 || countTextAfterReload !== "2/3") {
      console.error("[pintracker] FAIL: pin/collapse localStorage persistence did not survive reload");
      failed = true;
    }
    await page.screenshot({ path: join(SHOTS_DIR, "05-after-reload-persisted.png"), fullPage: false });
    console.log("[pintracker] 05-after-reload-persisted.png");

    // Re-expand for one final full view (header + 2 rows together).
    await page.locator(".ptr-header").click();
    await page.waitForTimeout(250);
    await page.screenshot({ path: join(SHOTS_DIR, "06-expanded-after-reload.png"), fullPage: false });
    console.log("[pintracker] 06-expanded-after-reload.png");

    console.log(`[pintracker] done. Screenshots in ${SHOTS_DIR}`);
  } finally {
    await browser.close();
    server.child.kill();
  }
  if (failed) {
    console.error("[pintracker] one or more DOM assertions FAILED — see log above.");
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("[pintracker] fatal:", err);
  process.exitCode = 1;
});
