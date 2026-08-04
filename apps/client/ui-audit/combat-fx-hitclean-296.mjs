#!/usr/bin/env node
/**
 * Task #296 follow-up: clean hit-flash/recoil capture on a durable target (goblin_felmagician,
 * 34 HP) instead of the instant-killed chicken, so the KillSummaryCard doesn't immediately cover
 * the enemy sprite. 12x WAAPI slow-mo (page-local, ephemeral) + a short settle delay after
 * detecting a fresh hit so the screenshot lands near the flash's peak opacity (30% keyframe
 * offset) instead of frame 0. Port 5203, midgame fixture.
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5203;
const BASE_URL = `http://localhost:${PORT}`;
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

async function clickWithReloadRetry(page, locator, opts = {}) {
  try {
    await locator.click({ timeout: 6000, ...opts });
  } catch {
    await page.waitForTimeout(400);
    await locator.click({ timeout: 6000, ...opts });
  }
}

const { child, getOutput } = startDevServer();
try {
  const ok = await waitForServer(BASE_URL);
  if (!ok) { console.error("SERVER NOT UP:\n" + getOutput()); process.exit(1); }
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });

  await page.addInitScript((f) => {
    const orig = Element.prototype.animate;
    Element.prototype.animate = function (keyframes, options) {
      const opts = typeof options === "number" ? options * f : { ...options, duration: (options?.duration ?? 0) * f };
      return orig.call(this, keyframes, opts);
    };
  }, 12);

  await page.goto(`${BASE_URL}/?fixture=midgame`, { waitUntil: "load" });
  await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
  await page.waitForTimeout(4500);
  await clickWithReloadRetry(page, page.locator('[data-guide-id="sidebar.combat"]').first());
  await page.waitForSelector(".zone-card", { timeout: 10000 });
  await page.waitForTimeout(500);
  await clickWithReloadRetry(page, page.locator(".zone-card", { hasText: /Weiden|Pastures/ }).first());
  await page.waitForSelector(".monster-card", { timeout: 10000 });
  await page.waitForTimeout(500);
  // Wild Boar (23 HP, no ward) — survives the first hit (unlike the 3-HP chicken) and has no
  // ward pool to confuse the floater selector (unlike the warded goblin_felmagician).
  const card = page.locator(".monster-card", { hasText: /Wildschwein|Wild Boar/ }).first();
  await clickWithReloadRetry(page, card.locator(".mc-fight-btn"));
  await page.waitForSelector(".battle", { timeout: 10000 });
  await page.waitForTimeout(500);

  // Wait for a hit where the enemy is still alive (no kill-summary card up) and grab it
  // ~500ms after the WAAPI call starts so we land near the flash's peak (30% of the 12x-scaled
  // duration), not frame 0.
  for (let attempt = 0; attempt < 10; attempt++) {
    // Match ONLY a base red/magic hit number — exclude every other floater flavor (dot/ward/
    // proc/heal/xp/miss) so we don't accidentally screenshot an unrelated concurrent floater.
    const gotHit = await page.waitForFunction(
      () => {
        const els = document.querySelectorAll(".dmg-number");
        for (const el of els) {
          const cl = el.classList;
          if (cl.contains("heal") || cl.contains("xp-drop") || cl.contains("miss") || cl.contains("dot") || cl.contains("proc")) continue;
          return true;
        }
        return false;
      },
      null,
      { timeout: 15000, polling: 20 },
    ).then(() => true).catch(() => false);
    if (!gotHit) continue;
    const stillClean = await page.evaluate(() => !document.querySelector(".kill-summary-card"));
    if (stillClean) {
      await page.screenshot({ path: join(OUT_DIR, "fx296-hit-clean-1920.png") });
      console.log("SHOT SAVED: fx296-hit-clean-1920.png");
      const enemyFighter = page.locator(".fighter.enemy").first();
      await enemyFighter.screenshot({ path: join(OUT_DIR, "fx296-hit-clean-enemy-crop-1920.png") });
      console.log("SHOT SAVED: fx296-hit-clean-enemy-crop-1920.png");
      break;
    }
  }

  await browser.close();
} finally {
  child.kill();
}
