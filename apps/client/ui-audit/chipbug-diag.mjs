#!/usr/bin/env node
/**
 * Diagnostic pass for the "material rack chip numbers clip" bug (Smelt Steel card).
 * For each digit-tier fixture: load, go to Smithing, search "Smelt Steel", screenshot the card,
 * and dump computed geometry for every .mat-count (text vs its .mat-chip container) so we can see
 * exactly where/why it clips, and at what viewport width the clip starts for a fixed 3-digit case.
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = "G:\\GameDev\\apps\\client";
const AUDIT_DIR = join(CLIENT_DIR, "ui-audit");
const PORT = 5297;
const BASE_URL = `http://localhost:${PORT}`;
const OUT_DIR = __dirname;

function startDevServer() {
  const viteBin = join(CLIENT_DIR, "node_modules", "vite", "bin", "vite.js");
  const child = spawn(
    process.execPath,
    [viteBin, "dev", "--config", join(AUDIT_DIR, "vite.tour.config.mjs"), "--port", String(PORT), "--strictPort"],
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

async function gotoSmeltSteel(page, fixture) {
  await page.goto(`${BASE_URL}/?fixture=${fixture}`, { waitUntil: "load" });
  await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
  await page.waitForTimeout(4500); // let toasts / feature-tour-guide settle
  await page.locator('[data-guide-id="sidebar.smithing"]').first().click({ timeout: 10000, force: true });
  await page.waitForTimeout(500);
  const search = page.locator(".skill-search-bar .invf-search");
  await search.fill("Stahl schmelzen"); // fixtures default to the German locale (Discord report was DE)
  await page.waitForTimeout(400);
}

async function dumpCard(page, label) {
  const card = page.locator(".skillcard-resource-rack").first();
  if ((await card.count()) === 0) {
    console.log(`  [${label}] NO resource-rack found`);
    return;
  }
  const data = await page.evaluate(() => {
    const rack = document.querySelector(".skillcard-resource-rack");
    if (!rack) return null;
    const chips = Array.from(rack.querySelectorAll(".mat-chip"));
    return chips.map((chip) => {
      const countEl = chip.querySelector(".mat-count");
      const cr = chip.getBoundingClientRect();
      const tr = countEl.getBoundingClientRect();
      const cs = getComputedStyle(chip);
      return {
        text: countEl.textContent,
        chipWidth: cr.width.toFixed(1),
        chipOverflow: cs.overflow,
        countScrollWidth: countEl.scrollWidth,
        countClientWidth: countEl.clientWidth,
        clipped: countEl.scrollWidth > countEl.clientWidth + 1,
        countRight: tr.right.toFixed(1),
        chipRight: cr.right.toFixed(1),
        visuallyClipped: tr.right > cr.right + 0.5,
      };
    });
  });
  console.log(`  [${label}] ${JSON.stringify(data)}`);
}

async function runFixtureShots(browser) {
  for (const fixture of ["chipbug_1d", "chipbug_3d", "chipbug_4d", "chipbug_5d"]) {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
    await gotoSmeltSteel(page, fixture);
    await dumpCard(page, `${fixture}@1920`);
    const card = page.locator(".skillcard-resource-rack").first();
    await card.scrollIntoViewIfNeeded().catch(() => {});
    const cardWrap = page.locator(".skillcard-output-zone").first().locator("xpath=ancestor::*[contains(@class,'skillcard')][1]");
    await page.screenshot({ path: join(OUT_DIR, `chip-${fixture}-1920-full.png`), fullPage: false });
    await page.close();
  }
}

async function runWidthSweep(browser) {
  for (const width of [1920, 1600, 1366, 1280, 1100, 1000, 900, 800]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
    await gotoSmeltSteel(page, "chipbug_3d");
    await dumpCard(page, `3d@${width}`);
    await page.screenshot({ path: join(OUT_DIR, `chip-sweep-${width}.png`), fullPage: false });
    await page.close();
  }
}

const { child, getOutput } = startDevServer();
try {
  const ok = await waitForServer(BASE_URL);
  if (!ok) { console.error("SERVER NOT UP:\n" + getOutput()); process.exit(1); }
  const browser = await chromium.launch();
  await runFixtureShots(browser);
  await runWidthSweep(browser);
  await browser.close();
  console.log("ALL DONE");
} finally {
  child.kill();
}
