#!/usr/bin/env node
/**
 * One-off screenshot script for the Meisterumhang-Perk-Effektzeile fix (Chef-Bugreport: "Beim
 * Voidangler's Cape sollte die Double-Fish-Chance oben im Text stehen wie so ein Waffen-Effekt,
 * nicht unten in grau als Flavor-Text!"). Mirrors tooltip-shot-304.mjs / -307.mjs / -308.mjs's
 * headless (non-Electron) Vite+Playwright pattern — see tooltip-shot-304.mjs's header comment for
 * why this is the sanctioned way for an agent to look at the rendered UI. Port 5231 (Chef-assigned).
 *
 * Loads the "endgame" fixture with a route-interception patch (in-memory JSON patch, nothing
 * written to disk — same pattern as tooltip-shot-307.mjs) so three cape items sit in inventory
 * slots 0-2:
 *   slot 0: cape_master_fishing  — Voidangler's Cape, masterPerk.doubleYield (fishing, 5%) — the
 *           EXACT item from the Chef's bugreport.
 *   slot 1: cape_master_cooking  — Soulchef's Cape, masterPerk.alwaysSucceed (cooking) — the
 *           "ignores {n}" template case (no percentage in the line).
 *   slot 2: cape_master_defence  — Bulwark Cape, a COMBAT cape with only bonus/blockChance fields
 *           and NO masterPerk — verifies the golden effect-block does NOT appear (no false
 *           positive) and the block-chance stat row is NOT duplicated.
 *
 * Run: node ui-audit/tooltip-shot-masterperk.mjs   (from apps/client/)
 */
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const SHOTS_DIR = join(__dirname, "shots-masterperk");
const PORT = 5231;
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

  console.log(`[shot-masterperk] starting dev server on port ${PORT}...`);
  const server = startDevServer();
  const up = await waitForServer(BASE_URL, 30_000);
  if (!up) {
    console.error("[shot-masterperk] dev server did not come up in time:\n" + server.getOutput());
    server.child.kill();
    process.exitCode = 1;
    return;
  }
  console.log("[shot-masterperk] dev server is up.");

  const browser = await chromium.launch();
  let failed = false;
  try {
    const page = await browser.newPage({ viewport: VIEWPORT });
    page.on("pageerror", (err) => console.error("[shot-masterperk] pageerror:", err.message));

    // i18n/index.tsx defaults to "de" without a saved preference — force English so the DOM text
    // assertions below (and the screenshots) are deterministic/legible for this report.
    await page.addInitScript(() => {
      localStorage.setItem("hearthforge:locale", "en");
    });

    // Patch the served fixture JSON in-flight — see file header for why these three items/slots.
    await page.route("**/ui-audit-fixtures/endgame.json", async (route) => {
      const res = await route.fetch();
      const json = await res.json();
      const slots = json.state.inventory.slots;
      slots[0] = { itemId: "cape_master_fishing", qty: 1 };
      slots[1] = { itemId: "cape_master_cooking", qty: 1 };
      slots[2] = { itemId: "cape_master_defence", qty: 1 };
      await route.fulfill({ response: res, json });
    });

    await page.goto(`${BASE_URL}/?fixture=endgame`, { waitUntil: "load" });
    await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15_000 });
    // Let the fixture-load achievement toasts clear (same wait as tour.mjs/shot-304/307/308).
    await page.waitForTimeout(4200);

    await page.locator('[data-guide-id="topbar.character"]').first().click();
    await page.waitForLoadState("networkidle", { timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(400);

    const invSlot = (i) => page.locator(".cs-inv-grid .cs-inv-slot-wrap").nth(i).locator(".item-cell").first();

    // ── Case 1: Voidangler's Cape — masterPerk.doubleYield, the Chef's exact bugreport item ──
    await invSlot(0).click();
    await page.waitForTimeout(300);
    const effectBlock1 = page.locator(".itip-effect-block").first();
    const effectBlockCount1 = await effectBlock1.count();
    const effectLine1 = await effectBlock1.locator(".itip-effect-line").first().innerText().catch(() => "");
    console.log(`[shot-masterperk] Voidangler's Cape: .itip-effect-block present=${effectBlockCount1 > 0}, first line="${effectLine1}"`);
    if (effectBlockCount1 === 0 || !effectLine1.includes("5%") || !effectLine1.toLowerCase().includes("fishing")) {
      console.error("[shot-masterperk] FAIL: expected a golden effect line with '5%' and 'Fishing' for cape_master_fishing");
      failed = true;
    }
    await page.screenshot({ path: join(SHOTS_DIR, "01-voidangler-cape-doubleyield.png"), fullPage: true });
    console.log("[shot-masterperk] 01-voidangler-cape-doubleyield.png (Voidangler's Cape, gold effect line up top)");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(150);

    // ── Case 2: Soulchef's Cape — masterPerk.alwaysSucceed (ignores {n}, "always succeed") ──
    await invSlot(1).click();
    await page.waitForTimeout(300);
    const effectBlock2 = page.locator(".itip-effect-block").first();
    const effectBlockCount2 = await effectBlock2.count();
    const effectLine2 = await effectBlock2.locator(".itip-effect-line").first().innerText().catch(() => "");
    console.log(`[shot-masterperk] Soulchef's Cape: .itip-effect-block present=${effectBlockCount2 > 0}, first line="${effectLine2}"`);
    if (effectBlockCount2 === 0 || !effectLine2.toLowerCase().includes("always succeed")) {
      console.error("[shot-masterperk] FAIL: expected a golden effect line 'Actions always succeed (Cooking)' for cape_master_cooking");
      failed = true;
    }
    await page.screenshot({ path: join(SHOTS_DIR, "02-soulchef-cape-alwayssucceed.png"), fullPage: true });
    console.log("[shot-masterperk] 02-soulchef-cape-alwayssucceed.png (Soulchef's Cape, gold effect line up top)");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(150);

    // ── Case 3: Bulwark Cape — a COMBAT cape, only stat fields, no masterPerk ──
    await invSlot(2).click();
    await page.waitForTimeout(300);
    const effectBlockCount3 = await page.locator(".itip-effect-block").count();
    const blockRowCount3 = await page.locator(".itip-stat-row", { hasText: "Block" }).count();
    console.log(`[shot-masterperk] Bulwark Cape: .itip-effect-block present=${effectBlockCount3 > 0} (expect false), Block stat rows=${blockRowCount3} (expect 1)`);
    if (effectBlockCount3 > 0) {
      console.error("[shot-masterperk] FAIL: Bulwark Cape (no masterPerk) unexpectedly shows a golden effect block");
      failed = true;
    }
    if (blockRowCount3 !== 1) {
      console.error(`[shot-masterperk] FAIL: expected exactly 1 Block stat row (no duplication), got ${blockRowCount3}`);
      failed = true;
    }
    await page.screenshot({ path: join(SHOTS_DIR, "03-bulwark-cape-combat-statonly.png"), fullPage: true });
    console.log("[shot-masterperk] 03-bulwark-cape-combat-statonly.png (Bulwark Cape, stat rows only, no gold block)");

    console.log(`[shot-masterperk] done. Screenshots in ${SHOTS_DIR}`);
  } finally {
    await browser.close();
    server.child.kill();
  }
  if (failed) {
    console.error("[shot-masterperk] one or more DOM assertions FAILED — see log above.");
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("[shot-masterperk] fatal:", err);
  process.exitCode = 1;
});
