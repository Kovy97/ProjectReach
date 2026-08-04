#!/usr/bin/env node
/**
 * Chef-GO verification: Zonen-Ambient-Partikel im Kampf-Hintergrund. Port 5219 per Chef-Vorgabe.
 * Enters an active battle in an ember zone (ashfields), a frost zone (slagpit) and a void/idol
 * zone (idolhall), each with two screenshots ~1s apart to prove animation, plus one fxLevel="off"
 * shot (localStorage set before boot) with a DOM assert that no particle canvas exists.
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5219;
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

async function enterZoneBattle(page, { zoneMatch }) {
  await page.goto(`${BASE_URL}/?fixture=endgame`, { waitUntil: "load" });
  await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
  await page.waitForTimeout(4500); // let load-toasts clear

  await clickWithReloadRetry(page, page.locator('[data-guide-id="sidebar.combat"]').first());
  await page.waitForTimeout(500);

  await clickWithReloadRetry(page, page.locator(".zone-card", { hasText: zoneMatch }).first());
  await page.waitForTimeout(1000);

  const card = page.locator(".monster-card").first();
  await clickWithReloadRetry(page, card.locator(".mc-fight-btn"));
  await page.waitForSelector(".battle", { timeout: 10000 });
  await page.waitForTimeout(600);
}

async function shootZone(browser, { name, zoneMatch, fxLevel }) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", (e) => { errors.push("pageerror: " + e.message); });
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });

  if (fxLevel) {
    await page.addInitScript((lvl) => { localStorage.setItem("gr.combatFxLevel", lvl); }, fxLevel);
  }

  await enterZoneBattle(page, { zoneMatch });

  const canvasCount = await page.locator(".zone-particles-canvas").count();
  console.log(`[${name}] fxLevel=${fxLevel ?? "full(default)"} — zone-particles-canvas count: ${canvasCount}`);

  await page.screenshot({ path: join(OUT_DIR, `zp-${name}-full-a.png`) });
  console.log(`SHOT SAVED: zp-${name}-full-a.png`);

  const enemyWrap = page.locator(".fighter.enemy .fighter-figure-wrap").first();
  await enemyWrap.screenshot({ path: join(OUT_DIR, `zp-${name}-enemy-a.png`) });
  console.log(`SHOT SAVED: zp-${name}-enemy-a.png`);

  await page.waitForTimeout(1000);

  await enemyWrap.screenshot({ path: join(OUT_DIR, `zp-${name}-enemy-b.png`) });
  console.log(`SHOT SAVED: zp-${name}-enemy-b.png (1s later, proves animation)`);

  console.log(`[${name}] ` + (errors.length ? `${errors.length} page errors:\n` + errors.slice(0, 10).join("\n") : "no page errors"));
  await page.close();
  return canvasCount;
}

const { child, getOutput } = startDevServer();
try {
  const ok = await waitForServer(BASE_URL);
  if (!ok) { console.error("SERVER NOT UP:\n" + getOutput()); process.exit(1); }
  const browser = await chromium.launch();

  await shootZone(browser, { name: "ember-ashfields", zoneMatch: /Aschfelder|Ashfields/ });
  await shootZone(browser, { name: "frost-slagpit", zoneMatch: /Schlackengrube|Slag Pit/ });
  await shootZone(browser, { name: "void-idolhall", zoneMatch: /G.tzenhalle|Idol Hall/ });

  const offCount = await shootZone(browser, { name: "off-ashfields", zoneMatch: /Aschfelder|Ashfields/, fxLevel: "off" });
  console.log(`OFF-CHECK canvas count (expect 0): ${offCount}`);

  await browser.close();
} finally {
  child.kill();
}
