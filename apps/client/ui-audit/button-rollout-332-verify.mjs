#!/usr/bin/env node
/**
 * Task #332 verification: 9-Slice-Button-Set app-weit ausgerollt (Options/.combat-btn/
 * .it-action-btn/.bestiary-fight-btn/Mass-Sell). Headless-Screenshot-Verifikation nach dem
 * etablierten ui-audit-Muster (Vite-Devserver + Playwright-Chromium, kein Electron).
 *
 * Run: node button-rollout-332-verify.mjs   (from apps/client/ui-audit/)
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5332;
const BASE_URL = `http://localhost:${PORT}`;
const VIEWPORT = { width: 1920, height: 1080 };
const OUT_DIR = "C:\\Users\\MSchu\\AppData\\Local\\Temp\\claude\\G--GameDev\\553d2095-3a73-4795-9782-0fe746a25f13\\scratchpad";

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

async function waitForServer(url, t = 40000) {
  const s = Date.now();
  while (Date.now() - s < t) {
    try { const r = await fetch(url); if (r.ok) return true; } catch {}
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

async function main() {
  console.log(`[verify] starting dev server on port ${PORT}...`);
  const server = startDevServer();
  const up = await waitForServer(BASE_URL);
  if (!up) { console.error("DEV SERVER NOT UP:\n" + server.getOutput()); server.child.kill(); process.exitCode = 1; return; }

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: VIEWPORT });
    page.on("pageerror", (e) => console.error("pageerror:", e.message));

    await page.goto(`${BASE_URL}/?fixture=midgame`, { waitUntil: "load" });
    await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
    await page.waitForTimeout(4000); // achievement toasts on fixture load clear first

    // ─── 1) Options page ───
    await page.click('[data-guide-id="sidebar.options"]');
    await page.waitForTimeout(500);
    await page.screenshot({ path: join(OUT_DIR, "b332-options-rest.png") });
    console.log("[verify] wrote b332-options-rest.png");

    // hover a segment button (window mode) + the language grid to see hover state
    const segBtn = page.locator(".opz-segment .combat-btn").first();
    if (await segBtn.count()) {
      await segBtn.hover();
      await page.waitForTimeout(200);
      await page.screenshot({ path: join(OUT_DIR, "b332-options-hover.png") });
      console.log("[verify] wrote b332-options-hover.png");
    }

    // scroll to Save Data section (Import/Export/Backup = plain .combat-btn, flee = destructive import confirm)
    const saveSection = page.locator("text=/./").first();
    await page.evaluate(() => {
      const el = document.querySelector(".opz-section--wide, .opz-page");
      el?.scrollIntoView?.({ block: "start" });
    });
    await page.mouse.wheel(0, 900);
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(OUT_DIR, "b332-options-savedata.png") });
    console.log("[verify] wrote b332-options-savedata.png");

    // ─── 2) Shop page (mass-sell toggle button) ───
    await page.click('[data-guide-id="topbar.shop"]');
    await page.waitForTimeout(500);
    // switch to Sell tab if a tab control exists
    const sellTab = page.locator("text=/Sell|Verkaufen/i").first();
    if (await sellTab.count()) {
      await sellTab.click().catch(() => {});
      await page.waitForTimeout(300);
    }
    await page.screenshot({ path: join(OUT_DIR, "b332-shop-rest.png") });
    console.log("[verify] wrote b332-shop-rest.png");

    const massSellBtn = page.locator(".mshop-toggle-btn").first();
    if (await massSellBtn.count()) {
      await massSellBtn.hover();
      await page.waitForTimeout(200);
      await page.screenshot({ path: join(OUT_DIR, "b332-shop-masssell-hover.png") });
      console.log("[verify] wrote b332-shop-masssell-hover.png");
      await massSellBtn.click();
      await page.waitForTimeout(300);
      await page.screenshot({ path: join(OUT_DIR, "b332-shop-masssell-active.png") });
      console.log("[verify] wrote b332-shop-masssell-active.png");
    } else {
      console.log("[verify] WARN: .mshop-toggle-btn not found on Shop page");
    }

    // ─── 3) Combat page (monster card Fight button = .combat-btn.mc-fight-btn) ───
    await page.click('[data-guide-id="sidebar.combat"]');
    await page.waitForTimeout(600);
    // click into the first zone card to reach the monster-select grid with real Fight buttons
    const zoneCard = page.locator(".zone-card").first();
    if (await zoneCard.count()) {
      await zoneCard.click();
      await page.waitForTimeout(600);
    }
    await page.screenshot({ path: join(OUT_DIR, "b332-combat-rest.png") });
    console.log("[verify] wrote b332-combat-rest.png");

    const fightBtn = page.locator(".combat-btn").first();
    if (await fightBtn.count()) {
      const box = await fightBtn.boundingBox();
      if (box) {
        const clip = { x: Math.max(0, box.x - 40), y: Math.max(0, box.y - 40), width: box.width + 80, height: box.height + 80 };
        await page.screenshot({ path: join(OUT_DIR, "b332-combat-fightbtn-zoom-rest.png"), clip });
      }
      await fightBtn.hover();
      await page.waitForTimeout(200);
      await page.screenshot({ path: join(OUT_DIR, "b332-combat-hover.png") });
      if (box) {
        const clip = { x: Math.max(0, box.x - 40), y: Math.max(0, box.y - 40), width: box.width + 80, height: box.height + 80 };
        await page.screenshot({ path: join(OUT_DIR, "b332-combat-fightbtn-zoom-hover.png"), clip });
      }
      console.log("[verify] wrote b332-combat-hover.png + zoom crops");
    } else {
      console.log("[verify] WARN: no .combat-btn found on Combat page");
    }

    // ─── zoom crop of an Options segment button (smallest border-image-width context, 38px) ───
    await page.click('[data-guide-id="sidebar.options"]');
    await page.waitForTimeout(500);
    const segBtn2 = page.locator(".opz-segment .combat-btn").first();
    if (await segBtn2.count()) {
      const box = await segBtn2.boundingBox();
      if (box) {
        const clip = { x: Math.max(0, box.x - 30), y: Math.max(0, box.y - 30), width: box.width + 60, height: box.height + 60 };
        await page.screenshot({ path: join(OUT_DIR, "b332-options-segbtn-zoom-rest.png"), clip });
        await segBtn2.hover();
        await page.waitForTimeout(200);
        await page.screenshot({ path: join(OUT_DIR, "b332-options-segbtn-zoom-hover.png"), clip });
      }
      console.log("[verify] wrote options seg-button zoom crops");
    }

    await page.close();
  } finally {
    await browser.close();
    server.child.kill();
  }
  console.log("\n[verify] done.");
}

main().catch((err) => {
  console.error("[verify] fatal:", err);
  process.exitCode = 1;
});
