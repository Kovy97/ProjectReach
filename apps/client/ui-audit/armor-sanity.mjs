#!/usr/bin/env node
/** Regression sanity check: confirms the components.css changes (offense :only-child span,
 * offense-row grid-template-columns, offense-value white-space) didn't break a TYPICAL multi-group
 * tooltip (armor: defense+attributes, not the pure-offense wand case the hotfix targeted). Uses the
 * existing midgame ui-audit fixture (already in the repo, no new fixture needed). */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = "G:\\GameDev\\apps\\client";
const AUDIT_DIR = join(CLIENT_DIR, "ui-audit");
const PORT = 5295;
const BASE_URL = `http://localhost:${PORT}`;
const OUT_DIR = join(AUDIT_DIR);

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

async function run(browser, width, height) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  await page.goto(`${BASE_URL}/?fixture=midgame`, { waitUntil: "load" });
  await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
  await page.waitForTimeout(4500);
  // NOTE: this repo's shared midgame/endgame ui-audit fixtures predate FeatureTourGuide's
  // "featureTourV2" (added 2026-08-03, s. FeatureTourGuide.tsx header) and don't mark it seen —
  // a "what's new" spotlight overlay blocks every click here. Not this hotfix's bug to fix
  // (flagging to the CEO separately); Escape dismisses it so this sanity check can proceed.
  await page.keyboard.press("Escape").catch(() => {});
  await page.waitForTimeout(200);
  await page.locator('[data-guide-id="topbar.character"]').first().click({ timeout: 10000, force: true });
  await page.waitForTimeout(400);

  const bodySlot = page.locator(".cs-slot.body .slot-item").first();
  if ((await bodySlot.count()) === 0) {
    console.log(`[${width}x${height}] no body slot item equipped`);
    await page.close();
    return;
  }
  await bodySlot.hover();
  await page.waitForTimeout(1400);

  const panelCount = await page.locator(".item-tooltip.itip-panel").count();
  if (panelCount === 0) {
    console.log(`[${width}x${height}] NO TOOLTIP PANEL FOUND`);
    await page.close();
    return;
  }

  const data = await page.evaluate(() => {
    const groups = Array.from(document.querySelectorAll(".itip-body > .itip-group"));
    return groups.map((g) => ({
      className: g.className,
      rows: Array.from(g.querySelectorAll(".itip-stat-row")).map((row) => {
        const label = row.querySelector(".itip-stat-label")?.textContent?.trim() ?? "";
        const valueEl = row.querySelector(".itip-stat-value");
        const value = valueEl?.textContent?.trim() ?? "";
        const vr = valueEl?.getBoundingClientRect();
        let clippedBy = null;
        let el = valueEl?.parentElement ?? null;
        while (el && el !== document.body) {
          const cs = getComputedStyle(el);
          if ((cs.overflow === "hidden" || cs.overflowX === "hidden") && vr) {
            const er = el.getBoundingClientRect();
            if (vr.right > er.right + 0.5 || vr.left < er.left - 0.5) {
              clippedBy = el.className;
              break;
            }
          }
          el = el.parentElement;
        }
        return { label, value, clippedBy };
      }),
    }));
  });

  console.log(`\n=== midgame body armor @ ${width}x${height} ===`);
  console.log(JSON.stringify(data, null, 2));
  await page.screenshot({ path: join(OUT_DIR, `armor-sanity-${width}x${height}.png`), fullPage: false });
  await page.close();
}

const { child, getOutput } = startDevServer();
try {
  const ok = await waitForServer(BASE_URL);
  if (!ok) { console.error("SERVER NOT UP:\n" + getOutput()); process.exit(1); }
  const browser = await chromium.launch();
  await run(browser, 1280, 800);
  await run(browser, 1920, 1080);
  await browser.close();
  console.log("ALL DONE");
} finally {
  child.kill();
}
