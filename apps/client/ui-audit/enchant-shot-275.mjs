#!/usr/bin/env node
/**
 * Task #275 self-check: screenshots the reworked Enchanting page (Altar layout — item selection /
 * altar / rune grimoire) at 1920x1080, plus a 1280x720 pass for the minimum supported resolution.
 * Modeled on menu-shot.mjs but drives in-page navigation (sidebar.enchanting click) via the
 * ui-audit tour-server's `?fixture=` support to load a midgame save (equipped gear + a rune stack).
 * Port 5189 — dedicated to this script, avoids colliding with menu-shot.mjs (5184) / tour.mjs (5183)
 * / shop-shot-269.mjs (5187) / other agents' dev servers.
 *
 * Run: node enchant-shot-275.mjs
 * Output: PNGs written next to OUT_DIR (scratchpad).
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5189;
const BASE_URL = `http://localhost:${PORT}`;
const OUT_DIR = "C:\\Users\\MSchu\\AppData\\Local\\Temp\\claude\\G--GameDev\\553d2095-3a73-4795-9782-0fe746a25f13\\scratchpad";
const FIXTURE = "midgame";

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

async function shot(page, out, w, h) {
  await page.setViewportSize({ width: w, height: h });
  await page.waitForTimeout(300);
  await page.screenshot({ path: out });
  console.log("SHOT SAVED: " + out + " @ " + w + "x" + h);
}

const { child, getOutput } = startDevServer();
try {
  const ok = await waitForServer(BASE_URL);
  if (!ok) { console.error("SERVER NOT UP:\n" + getOutput()); process.exit(1); }
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });

  await page.goto(`${BASE_URL}/?fixture=${FIXTURE}`, { waitUntil: "load" });
  await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
  // Let the achievement-unlock toasts (fixture "arrives" with unlocks already true) clear first,
  // same wait tour.mjs uses, so they don't cover the page in the screenshot.
  await page.waitForTimeout(4200);

  await page.click('[data-guide-id="sidebar.enchanting"]');
  await page.waitForTimeout(700);

  await shot(page, join(OUT_DIR, "enchant-1920x1080.png"), 1920, 1080);
  await shot(page, join(OUT_DIR, "enchant-1280x720.png"), 1280, 720);

  // Populated altar: select the first equipped item + the first rune card, so the screenshot
  // shows the full "spectacular" centerpiece (item in socket, current-affix/candidate preview,
  // glowing rune card) instead of just the empty-altar state.
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.locator(".ench-item-row").first().click();
  await page.waitForTimeout(200);
  await page.locator(".ench-rune-card").first().click();
  await page.waitForTimeout(400);
  await shot(page, join(OUT_DIR, "enchant-populated-1920x1080.png"), 1920, 1080);
  const altarScrollInfo = await page.locator(".ench-col-altar").evaluate((el) => ({
    scrollHeight: el.scrollHeight, clientHeight: el.clientHeight,
  }));
  console.log("altar column (blocked state) scrollHeight/clientHeight:", JSON.stringify(altarScrollInfo));

  // Same, but pick the equipped WEAPON (3rd row: Stahl-Scimitar) so the Storm rune (weapon-only)
  // is COMPATIBLE — shows the ready/glowing Enchant-button state instead of the blocked banner.
  // Rune selection persists across item switches (real UX), so do NOT re-click the rune card here
  // — a second click would just toggle it back off.
  await page.locator(".ench-item-row").nth(2).click();
  await page.waitForTimeout(400);
  await shot(page, join(OUT_DIR, "enchant-ready-1920x1080.png"), 1920, 1080);

  // Close-up crops for glow/detail inspection (altar socket + rune card).
  const socketBox = await page.locator(".ench-altar-socket").boundingBox();
  if (socketBox) {
    await page.screenshot({
      path: join(OUT_DIR, "enchant-crop-socket.png"),
      clip: { x: socketBox.x - 60, y: socketBox.y - 60, width: socketBox.width + 120, height: socketBox.height + 120 },
    });
  }
  const runeBox = await page.locator(".ench-rune-card").first().boundingBox();
  if (runeBox) {
    await page.screenshot({
      path: join(OUT_DIR, "enchant-crop-rune.png"),
      clip: { x: runeBox.x - 20, y: runeBox.y - 20, width: runeBox.width + 40, height: runeBox.height + 40 },
    });
  }

  // Ready state at the minimum supported resolution too.
  await shot(page, join(OUT_DIR, "enchant-ready-1280x720.png"), 1280, 720);
  const readyScrollInfo = await page.locator(".ench-col-altar").evaluate((el) => ({
    scrollHeight: el.scrollHeight, clientHeight: el.clientHeight,
  }));
  console.log("altar column (ready state, 1280x720) scrollHeight/clientHeight:", JSON.stringify(readyScrollInfo));

  // Confirm the altar column's internal scroll actually reaches the Enchant button at 1280x720
  // (same per-column-scroll pattern as the other two columns / .shopv2-buy-scroll elsewhere).
  await page.locator(".ench-col-altar").evaluate((el) => el.scrollTo(0, el.scrollHeight));
  await page.waitForTimeout(200);
  await shot(page, join(OUT_DIR, "enchant-ready-1280x720-scrolled.png"), 1280, 720);

  console.log(errors.length ? "PAGE ERRORS:\n" + errors.slice(0, 20).join("\n") : "no page errors");
  await browser.close();
} finally {
  child.kill();
}
