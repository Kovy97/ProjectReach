#!/usr/bin/env node
/**
 * One-off screenshot script for Task #307 (item-tooltip ▲/▼-compare-deltas, Chef-GO). Mirrors
 * tour.mjs's headless (non-Electron) Vite+Playwright pattern (see tooltip-shot-304.mjs / that
 * file's header comment for why this is the sanctioned way for an agent to look at the rendered
 * UI) — cloned from tooltip-shot-304.mjs, port bumped to the Chef-requested 5210.
 *
 * Loads the "endgame" fixture (BiS gear, both ring slots + offhand already occupied) with a tiny
 * in-memory patch to the fetched fixture JSON (route interception, nothing written to disk) so
 * four extra items sit in inventory slots 0-3 — chosen so each of the four required cases is a
 * clean, unambiguous comparison against what's already equipped:
 *   slot 0: godspark_staff  — clearly BETTER mainhand than the equipped voidcaller_staff
 *            (higher damage range/DPS, +int/+lck) → all-green deltas.
 *   slot 1: gnarled_staff   — clearly WORSE mainhand (starter-tier damage) → red deltas.
 *   slot 2: godgem_ring     — a third ring; both ring1 (idolbound_signet) AND ring2
 *            (doomforged_band) are occupied → exercises the "compare against the worse of the
 *            two equipped rings" rule (dualSlotWeight picks idolbound_signet here).
 *   slot 3: steel_greatsword — a two-handed mainhand weapon while the offhand (aetherium_focus)
 *            is still occupied → exercises the "also replaces your off-hand" footnote.
 *
 * Run: node ui-audit/tooltip-shot-307.mjs   (from apps/client/)
 */
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const SHOTS_DIR = join(__dirname, "shots-307");
const PORT = 5210;
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

  console.log(`[shot307] starting dev server on port ${PORT}...`);
  const server = startDevServer();
  const up = await waitForServer(BASE_URL, 30_000);
  if (!up) {
    console.error("[shot307] dev server did not come up in time:\n" + server.getOutput());
    server.child.kill();
    process.exitCode = 1;
    return;
  }
  console.log("[shot307] dev server is up.");

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: VIEWPORT });
    page.on("pageerror", (err) => console.error("[shot307] pageerror:", err.message));

    // Patch the served fixture JSON in-flight — see file header for why these four items/slots.
    await page.route("**/ui-audit-fixtures/endgame.json", async (route) => {
      const res = await route.fetch();
      const json = await res.json();
      const slots = json.state.inventory.slots;
      slots[0] = { itemId: "godspark_staff", qty: 1 };
      slots[1] = { itemId: "gnarled_staff", qty: 1 };
      slots[2] = { itemId: "godgem_ring", qty: 1 };
      slots[3] = { itemId: "steel_greatsword", qty: 1 };
      await route.fulfill({ response: res, json });
    });

    await page.goto(`${BASE_URL}/?fixture=endgame`, { waitUntil: "load" });
    await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15_000 });
    // Let the fixture-load achievement toasts clear (same wait as tour.mjs/shot-304).
    await page.waitForTimeout(4200);

    await page.locator('[data-guide-id="topbar.character"]').first().click();
    await page.waitForLoadState("networkidle", { timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(400);

    const invSlot = (i) => page.locator(".cs-inv-grid .cs-inv-slot-wrap").nth(i).locator(".item-cell").first();

    // Case 1: BETTER mainhand (godspark_staff) vs equipped voidcaller_staff — all-green deltas.
    await invSlot(0).click();
    await page.waitForTimeout(250);
    await page.screenshot({ path: join(SHOTS_DIR, "01-better-mainhand-green.png"), fullPage: true });
    console.log("[shot307] 01-better-mainhand-green.png (godspark_staff vs voidcaller_staff, ▲ green)");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(150);

    // Case 2: WORSE mainhand (gnarled_staff) vs equipped voidcaller_staff — red deltas.
    await invSlot(1).click();
    await page.waitForTimeout(250);
    await page.screenshot({ path: join(SHOTS_DIR, "02-worse-mainhand-red.png"), fullPage: true });
    console.log("[shot307] 02-worse-mainhand-red.png (gnarled_staff vs voidcaller_staff, ▼ red)");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(150);

    // Case 3: ring with BOTH ring1+ring2 occupied — compares against the worse of the two.
    await invSlot(2).click();
    await page.waitForTimeout(250);
    await page.screenshot({ path: join(SHOTS_DIR, "03-ring-both-slots.png"), fullPage: true });
    console.log("[shot307] 03-ring-both-slots.png (godgem_ring vs worse-of-idolbound/doomforged)");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(150);

    // Case 4: 2H weapon while the offhand is occupied — "also replaces your off-hand" footnote.
    await invSlot(3).click();
    await page.waitForTimeout(250);
    await page.screenshot({ path: join(SHOTS_DIR, "04-twohand-footnote.png"), fullPage: true });
    console.log("[shot307] 04-twohand-footnote.png (steel_greatsword, offhand still occupied)");

    console.log(`[shot307] done. Screenshots in ${SHOTS_DIR}`);
  } finally {
    await browser.close();
    server.child.kill();
  }
}

main().catch((err) => {
  console.error("[shot307] fatal:", err);
  process.exitCode = 1;
});
