#!/usr/bin/env node
/**
 * Headless verification script for the Chef-GO "Hotkeys für Power-User" task (2026-07-09).
 * Mirrors the sanctioned headless (non-Electron) Vite+Playwright pattern used across ui-audit/
 * (see tooltip-shot-307.mjs's header comment for why this is how a ui-dev agent looks at the
 * rendered UI without ever running `pnpm dev`/Electron). Port bumped to the Chef-requested 5213.
 *
 * Covers:
 *   1. Escape closes a PINNED ItemTooltip (DOM assertion: `.item-tooltip` present → gone).
 *   2. Escape closes the sidebar-footer quit-confirm modal (proves the "modal" registry tier
 *      works too, not just "tooltip"). NOTE: a pinned tooltip + an open modal can't be reproduced
 *      simultaneously via normal UI actions — the tooltip's PRE-EXISTING click-outside handler
 *      (ItemTooltip.tsx, unrelated to this task) already dismisses it the instant you click
 *      anything else (e.g. the quit button), and every modal covered here renders a full-screen
 *      backdrop that captures clicks to whatever is underneath. So "tooltip beats modal" (the
 *      `PRIORITY_ORDER` in util/escStack.ts) is verified by code inspection rather than a DOM
 *      race here — there is no reachable UI state where both are simultaneously open to race.
 *   3. Digit "3" jumps to the 3rd sidebar entry in render order (skills-overview, combat,
 *      woodcutting, ... — see navigation.ts getSidebarPages()), asserted via the active nav button.
 *   4. Digit "3" typed into a focused text input does NOT navigate (guards the documented
 *      "don't collide with the Bank search field" requirement) — proxied here via a temporary
 *      <input> injected into the DOM, since no parallel-agent search field exists at verify time.
 *   5. Arrow-Right / "e" switches the Shop Buy→Sell tab, Arrow-Left / "q" switches back.
 *   6. Screenshot of the new "Steuerung" (Controls) OptSection on the Options page.
 *
 * Run: node ui-audit/hotkeys-shot.mjs   (from apps/client/)
 */
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const SHOTS_DIR = join(__dirname, "shots-hotkeys");
const PORT = 5213;
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

function assert(cond, msg) {
  if (!cond) throw new Error(`ASSERT FAILED: ${msg}`);
  console.log(`[hotkeys] OK: ${msg}`);
}

async function main() {
  mkdirSync(SHOTS_DIR, { recursive: true });

  console.log(`[hotkeys] starting dev server on port ${PORT}...`);
  const server = startDevServer();
  const up = await waitForServer(BASE_URL, 30_000);
  if (!up) {
    console.error("[hotkeys] dev server did not come up in time:\n" + server.getOutput());
    server.child.kill();
    process.exitCode = 1;
    return;
  }
  console.log("[hotkeys] dev server is up.");

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: VIEWPORT });
    page.on("pageerror", (err) => console.error("[hotkeys] pageerror:", err.message));

    await page.goto(`${BASE_URL}/?fixture=midgame`, { waitUntil: "load" });
    await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15_000 });
    // Let fixture-load achievement toasts clear (same wait as tour.mjs/shot-30x scripts).
    await page.waitForTimeout(4200);

    // ─── Test 1: Escape closes a pinned ItemTooltip ─────────────────────────────────────────
    await page.locator('[data-guide-id="topbar.character"]').first().click();
    await page.waitForTimeout(400);
    const invSlot = page.locator(".cs-inv-grid .cs-inv-slot-wrap").first().locator(".item-cell").first();
    await invSlot.click();
    await page.waitForTimeout(250);
    assert(await page.locator(".item-tooltip").count() > 0, "pinned ItemTooltip is present after click");
    await page.screenshot({ path: join(SHOTS_DIR, "01a-tooltip-pinned.png"), fullPage: false });

    await page.keyboard.press("Escape");
    await page.waitForTimeout(150);
    assert(await page.locator(".item-tooltip").count() === 0, "Escape closed the pinned tooltip");
    await page.screenshot({ path: join(SHOTS_DIR, "01b-tooltip-closed-after-esc.png"), fullPage: false });

    // ─── Test 2: Escape closes the sidebar-footer quit-confirm modal (registry tier "modal") ──
    await page.locator(".sb-footer-quit").click();
    await page.waitForTimeout(150);
    assert(await page.locator(".quit-confirm-modal").count() > 0, "quit-confirm modal is present");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(150);
    assert(await page.locator(".quit-confirm-modal").count() === 0, "Escape closed the quit-confirm modal");

    // ─── Test 3: digit "3" jumps to the 3rd sidebar entry (woodcutting) ────────────────────
    await page.locator("body").click({ position: { x: 5, y: 5 } }); // ensure no stray focus
    await page.keyboard.press("3");
    await page.waitForTimeout(300);
    const activeGuideId = await page.locator(".sb-skill-btn.active").first().getAttribute("data-guide-id");
    assert(activeGuideId === "sidebar.woodcutting", `digit "3" navigated to sidebar.woodcutting (got ${activeGuideId})`);
    await page.screenshot({ path: join(SHOTS_DIR, "02-digit3-woodcutting.png"), fullPage: false });

    // ─── Test 4: digit "3" typed into a focused input must NOT navigate ────────────────────
    // No live search input exists on this page at verify time (a parallel agent owns the Bank
    // search field) — inject a throwaway <input> to prove the document.activeElement guard works
    // for ANY focused text field, not just a specific one.
    await page.evaluate(() => {
      const el = document.createElement("input");
      el.type = "text";
      el.id = "hotkeys-test-probe-input";
      document.body.appendChild(el);
      el.focus();
    });
    await page.locator("#hotkeys-test-probe-input").pressSequentially("3");
    await page.waitForTimeout(200);
    const guideIdAfterTyping = await page.locator(".sb-skill-btn.active").first().getAttribute("data-guide-id");
    assert(guideIdAfterTyping === "sidebar.woodcutting", `digit typed into a focused <input> did NOT change page (still ${guideIdAfterTyping})`);
    const probeValue = await page.locator("#hotkeys-test-probe-input").inputValue();
    assert(probeValue === "3", `the "3" reached the input's own value ("${probeValue}") instead of being hijacked`);
    await page.evaluate(() => document.getElementById("hotkeys-test-probe-input")?.remove());

    // ─── Test 5: Shop Buy/Sell tab via Arrow keys / Q-E ─────────────────────────────────────
    await page.locator('[data-guide-id="topbar.shop"]').first().click();
    await page.waitForTimeout(300);
    assert(await page.locator(".shopv2-tab-hotkey-hint").count() === 1, "shop hint span (◂ ▸) is rendered under the tabs");
    assert((await page.locator(".shopv2-tab-hotkey-hint").innerText()).includes("▸"), "shop hint span contains the arrow glyphs");
    const activeTabText = async () => page.locator(".shopv2-maintab.active").innerText();
    assert((await activeTabText()).toLowerCase().includes("kauf") || (await activeTabText()).toLowerCase().includes("buy"), `Shop opens on Buy tab (got "${await activeTabText()}")`);

    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(200);
    assert((await activeTabText()).toLowerCase().includes("verkauf") || (await activeTabText()).toLowerCase().includes("sell"), `ArrowRight switched to Sell tab (got "${await activeTabText()}")`);
    await page.screenshot({ path: join(SHOTS_DIR, "03-shop-sell-via-arrowright.png"), fullPage: false });

    await page.keyboard.press("ArrowLeft");
    await page.waitForTimeout(200);
    assert((await activeTabText()).toLowerCase().includes("kauf") || (await activeTabText()).toLowerCase().includes("buy"), `ArrowLeft switched back to Buy tab (got "${await activeTabText()}")`);

    await page.keyboard.press("e");
    await page.waitForTimeout(200);
    assert((await activeTabText()).toLowerCase().includes("verkauf") || (await activeTabText()).toLowerCase().includes("sell"), `"e" switched to Sell tab (got "${await activeTabText()}")`);
    await page.keyboard.press("q");
    await page.waitForTimeout(200);
    assert((await activeTabText()).toLowerCase().includes("kauf") || (await activeTabText()).toLowerCase().includes("buy"), `"q" switched back to Buy tab (got "${await activeTabText()}")`);

    // ─── Test 6: screenshot the new "Steuerung" OptSection on the Options page ─────────────
    await page.locator(".sb-footer-options").click();
    await page.waitForTimeout(300);
    const hotkeysSection = page.locator(".opz-section", { has: page.locator(".opz-section-title", { hasText: "Steuerung" }) });
    assert(await hotkeysSection.count() === 1, 'Options page has exactly one "Steuerung" OptSection');
    await hotkeysSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(150);
    await hotkeysSection.screenshot({ path: join(SHOTS_DIR, "04-options-steuerung-section.png") });
    await page.screenshot({ path: join(SHOTS_DIR, "05-options-full-page.png"), fullPage: true });

    console.log(`[hotkeys] all assertions passed. Screenshots in ${SHOTS_DIR}`);
  } finally {
    await browser.close();
    server.child.kill();
  }
}

main().catch((err) => {
  console.error("[hotkeys] fatal:", err);
  process.exitCode = 1;
});
