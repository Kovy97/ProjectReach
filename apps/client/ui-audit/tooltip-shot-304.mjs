#!/usr/bin/env node
/**
 * One-off screenshot script for Task #304 (item-tooltip polish: hpRegen decimals, effective
 * attack tempo, dodge (max), honest evasionRating, buff-category replace hint). Mirrors
 * tour.mjs's headless (non-Electron) Vite+Playwright pattern — see that file's header comment
 * for why this is the sanctioned way for an agent to look at the rendered UI.
 *
 * Loads the "endgame" fixture (BiS gear) with a tiny in-memory patch to the fetched fixture JSON
 * (route interception, nothing written to disk) so a couple of regeneration/defense tonics with
 * a buffCategory sit in inventory slot 0/1 (the stock endgame fixture doesn't carry any).
 *
 * Run: node ui-audit/tooltip-shot-304.mjs   (from apps/client/)
 */
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const SHOTS_DIR = join(__dirname, "shots-304");
const PORT = 5207;
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

  console.log(`[shot304] starting dev server on port ${PORT}...`);
  const server = startDevServer();
  const up = await waitForServer(BASE_URL, 30_000);
  if (!up) {
    console.error("[shot304] dev server did not come up in time:\n" + server.getOutput());
    server.child.kill();
    process.exitCode = 1;
    return;
  }
  console.log("[shot304] dev server is up.");

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: VIEWPORT });
    page.on("pageerror", (err) => console.error("[shot304] pageerror:", err.message));

    // Patch the served fixture JSON in-flight: put two buffCategory tonics (one "regeneration"
    // with a fractional hpRegenPerSec, one "defense") into inventory slots 0/1. Nothing on disk
    // changes — this only affects THIS Playwright session's fetch.
    await page.route("**/ui-audit-fixtures/endgame.json", async (route) => {
      const res = await route.fetch();
      const json = await res.json();
      const slots = json.state.inventory.slots;
      slots[0] = { itemId: "emberroot_tonic", qty: 5 };
      slots[1] = { itemId: "tonic_stoneskin", qty: 3 };
      await route.fulfill({ response: res, json });
    });

    await page.goto(`${BASE_URL}/?fixture=endgame`, { waitUntil: "load" });
    await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15_000 });
    // Let the fixture-load achievement toasts clear (same wait as tour.mjs).
    await page.waitForTimeout(4200);

    await page.locator('[data-guide-id="topbar.character"]').first().click();
    await page.waitForLoadState("networkidle", { timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(400);

    await page.screenshot({ path: join(SHOTS_DIR, "01-character-overview.png"), fullPage: true });
    console.log("[shot304] 01-character-overview.png (stat panel: dodge, speed)");

    // Mainhand weapon (voidcaller_staff, range-form magic staff) — pin tooltip → "Effektiv" tempo row.
    await page.locator(".cs-slot.mainhand .item-cell").first().click();
    await page.waitForTimeout(250);
    await page.screenshot({ path: join(SHOTS_DIR, "02-weapon-tooltip.png"), fullPage: true });
    console.log("[shot304] 02-weapon-tooltip.png (effective tempo row)");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(150);

    // Legs (wraithhide_legs, leather → evasionRating) — pin tooltip → raw rating + hint.
    await page.locator(".cs-slot.legs .item-cell").first().click();
    await page.waitForTimeout(250);
    await page.screenshot({ path: join(SHOTS_DIR, "03-legs-evasion-tooltip.png"), fullPage: true });
    console.log("[shot304] 03-legs-evasion-tooltip.png (evasionRating raw value + hint)");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(150);

    // Injected inventory slot 0 (emberroot_tonic, category "regeneration", hpRegenPerSec 0.3).
    await page.locator(".cs-inv-grid .cs-inv-slot-wrap").first().locator(".item-cell").first().click();
    await page.waitForTimeout(250);
    await page.screenshot({ path: join(SHOTS_DIR, "04-emberroot-tooltip.png"), fullPage: true });
    console.log("[shot304] 04-emberroot-tooltip.png (hpRegen decimal + buff-category hint)");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(150);

    // Injected inventory slot 1 (tonic_stoneskin, category "defense", no hpRegen — different wording).
    await page.locator(".cs-inv-grid .cs-inv-slot-wrap").nth(1).locator(".item-cell").first().click();
    await page.waitForTimeout(250);
    await page.screenshot({ path: join(SHOTS_DIR, "05-stoneskin-tooltip.png"), fullPage: true });
    console.log("[shot304] 05-stoneskin-tooltip.png (defense buff-category hint)");

    console.log(`[shot304] done. Screenshots in ${SHOTS_DIR}`);
  } finally {
    await browser.close();
    server.child.kill();
  }
}

main().catch((err) => {
  console.error("[shot304] fatal:", err);
  process.exitCode = 1;
});
