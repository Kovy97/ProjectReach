#!/usr/bin/env node
/**
 * Session-Ertrags-Zeile (Feature 2) self-check: loads midgame/endgame fixtures, enters an active
 * fight, waits for a few kills so gold/XP/kills/rares actually accumulate, then screenshots the
 * combat screen + a close-up of the new ".cl-section-session" row in the loadout sidebar.
 * Port 5208 per Chef instructions.
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = "G:\\GameDev\\apps\\client";
const PORT = 5208;
const BASE_URL = `http://localhost:${PORT}`;
const OUT_DIR = "C:\\Users\\MSchu\\AppData\\Local\\Temp\\claude\\G--GameDev\\553d2095-3a73-4795-9782-0fe746a25f13\\scratchpad";

function startDevServer() {
  const viteBin = join(CLIENT_DIR, "node_modules", "vite", "bin", "vite.js");
  const child = spawn(
    process.execPath,
    [viteBin, "dev", "--config", join(CLIENT_DIR, "ui-audit", "vite.tour.config.mjs"), "--port", String(PORT), "--strictPort"],
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

async function shoot(browser, fixture) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", (e) => { errors.push("pageerror: " + e.message); });
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });

  await page.goto(`${BASE_URL}/?fixture=${fixture}`, { waitUntil: "load" });
  await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
  await page.waitForTimeout(4500); // let load-toasts clear

  await clickWithReloadRetry(page, page.locator('[data-guide-id="sidebar.combat"]').first());
  await page.waitForTimeout(500);

  // Zone select → monster select grid. Screenshot the loadout sidebar (has the session row) +
  // a close-up of the session row itself, BEFORE any kills (should read 0/idle).
  const zoneCard = page.locator(".zone-card").first();
  await clickWithReloadRetry(page, zoneCard);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: join(OUT_DIR, `session-${fixture}-monsterselect.png`), fullPage: false });
  console.log(`SHOT SAVED: session-${fixture}-monsterselect.png`);

  try {
    const sidebar = page.locator(".combat-sidebar .cl-section-session").first();
    await sidebar.scrollIntoViewIfNeeded();
    await sidebar.screenshot({ path: join(OUT_DIR, `session-${fixture}-row-idle.png`) });
    console.log(`SHOT SAVED: session-${fixture}-row-idle.png`);
  } catch (e) {
    console.log(`!! idle session-row closeup failed (${fixture}): ` + e.message);
  }

  // Start a fight against the first monster card, let it run for a while so kills/gold/xp/rares
  // actually accumulate (fixtures start at 0 combat progress this "session").
  try {
    const fightBtn = page.locator(".mc-fight-btn").first();
    await clickWithReloadRetry(page, fightBtn);
    await page.waitForTimeout(15000); // several kills at normal attack speed
    await page.screenshot({ path: join(OUT_DIR, `session-${fixture}-battle.png`), fullPage: false });
    console.log(`SHOT SAVED: session-${fixture}-battle.png`);

    const battleSidebar = page.locator(".battle-loadout-col .cl-section-session").first();
    await battleSidebar.scrollIntoViewIfNeeded();
    await battleSidebar.screenshot({ path: join(OUT_DIR, `session-${fixture}-row-filled.png`) });
    console.log(`SHOT SAVED: session-${fixture}-row-filled.png`);
  } catch (e) {
    console.log(`!! battle step failed (${fixture}): ` + e.message);
  }

  console.log(`[${fixture}] ` + (errors.length ? `${errors.length} page errors seen:\n` + errors.slice(0, 12).join("\n") : "no page errors"));
  await page.close();
}

const { child, getOutput } = startDevServer();
try {
  const ok = await waitForServer(BASE_URL);
  if (!ok) { console.error("SERVER NOT UP:\n" + getOutput()); process.exit(1); }
  const browser = await chromium.launch();
  await shoot(browser, "midgame");
  await shoot(browser, "endgame");
  await browser.close();
} finally {
  child.kill();
}
