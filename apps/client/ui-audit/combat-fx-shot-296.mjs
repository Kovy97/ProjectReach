#!/usr/bin/env node
/**
 * Task #296 verification: Kampf-FX P0 "Launch-Juice" (Treffer-Flash+Recoil, Crit-Gold, Kill-
 * Flourish, Pet-Ability-Blitz, Status-Rand-Puls, Options-3-Wege-Toggle). Modeled on
 * combat-cards-shot-273.mjs. Port 5203 per Chef instructions.
 *
 * Since the new hit-flash/recoil/pet-glow effects are one-shot WAAPI `element.animate()` calls
 * (~130-480ms), this script injects a page-level `Element.prototype.animate` patch that scales
 * every animation duration by 12x BEFORE the app loads — purely in the ephemeral Playwright page
 * context, no source file is touched, so there's nothing to "reset" afterwards. That turns a
 * 130ms flash into a comfortably screenshot-able ~1.5s window. Kill-flourish/status-pulse are
 * plain React-state + setTimeout (not WAAPI), so instead we poll fast (raf) for the CSS class and
 * screenshot the instant it appears.
 *
 * Run: node combat-fx-shot-296.mjs
 * Output: PNGs written to the scratchpad dir below.
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

/** Scales every WAAPI `.animate()` call on the page by `factor` — screenshot-friendly slow-mo,
 *  ephemeral (this-page-only), never touches the repo. */
async function installSlowMo(page, factor) {
  await page.addInitScript((f) => {
    const orig = Element.prototype.animate;
    Element.prototype.animate = function (keyframes, options) {
      const opts = typeof options === "number"
        ? options * f
        : { ...options, duration: (options?.duration ?? 0) * f };
      return orig.call(this, keyframes, opts);
    };
  }, factor);
}

async function enterBattle(page, { fixture, zoneMatch, monsterMatch }) {
  await page.goto(`${BASE_URL}/?fixture=${fixture}`, { waitUntil: "load" });
  await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
  await page.waitForTimeout(4500); // let load-toasts clear

  await clickWithReloadRetry(page, page.locator('[data-guide-id="sidebar.combat"]').first());
  await page.waitForTimeout(500);

  await clickWithReloadRetry(page, page.locator(".zone-card", { hasText: zoneMatch }).first());
  await page.waitForTimeout(1500);

  const card = monsterMatch
    ? page.locator(".monster-card", { hasText: monsterMatch }).first()
    : page.locator(".monster-card").first();
  await clickWithReloadRetry(page, card.locator(".mc-fight-btn"));
  await page.waitForSelector(".battle", { timeout: 10000 });
  await page.waitForTimeout(600);
}

async function shootCombatFx(browser, { width, height, suffix }) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", (e) => { errors.push("pageerror: " + e.message); });
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });

  await installSlowMo(page, 12);
  await enterBattle(page, { fixture: "midgame", zoneMatch: /Weiden|Pastures/, monsterMatch: /Huhn|Chicken/ });

  await page.screenshot({ path: join(OUT_DIR, `fx296-battle-start-${suffix}.png`) });
  console.log(`SHOT SAVED: fx296-battle-start-${suffix}.png`);

  // ── Hit-flash + recoil (any hit, non-crit-or-crit) ──────────────────────
  try {
    await page.waitForFunction(
      () => !!document.querySelector(".dmg-number:not(.heal):not(.xp-drop):not(.miss)"),
      null,
      { timeout: 20000, polling: 30 },
    );
    await page.screenshot({ path: join(OUT_DIR, `fx296-hit-${suffix}.png`) });
    console.log(`SHOT SAVED: fx296-hit-${suffix}.png`);
    const enemyFighter = page.locator(".fighter.enemy").first();
    await enemyFighter.screenshot({ path: join(OUT_DIR, `fx296-hit-enemy-crop-${suffix}.png`) });
    console.log(`SHOT SAVED: fx296-hit-enemy-crop-${suffix}.png`);
  } catch (e) {
    console.log("!! hit-flash capture failed: " + e.message);
  }

  // ── Crit (gold flash + gold number) — probabilistic, generous budget ───
  try {
    await page.waitForFunction(
      () => !!document.querySelector(".dmg-number.crit"),
      null,
      { timeout: 25000, polling: 30 },
    );
    await page.screenshot({ path: join(OUT_DIR, `fx296-crit-${suffix}.png`) });
    console.log(`SHOT SAVED: fx296-crit-${suffix}.png`);
    const enemyFighter = page.locator(".fighter.enemy").first();
    await enemyFighter.screenshot({ path: join(OUT_DIR, `fx296-crit-enemy-crop-${suffix}.png`) });
    console.log(`SHOT SAVED: fx296-crit-enemy-crop-${suffix}.png`);
  } catch (e) {
    console.log("!! crit capture failed (probabilistic, may just not have rolled): " + e.message);
  }

  // ── Status-ring-pulse (opportunistic — depends on fixture gear inflicting a status) ──
  try {
    await page.waitForFunction(
      () => !!document.querySelector(".fighter.status-pulse"),
      null,
      { timeout: 8000, polling: 20 },
    );
    await page.screenshot({ path: join(OUT_DIR, `fx296-status-pulse-${suffix}.png`) });
    console.log(`SHOT SAVED: fx296-status-pulse-${suffix}.png`);
  } catch (e) {
    console.log("!! status-pulse capture skipped (no status proc observed in budget): " + e.message);
  }

  // ── Kill-flourish (dying) — wait for the weak target to die ─────────────
  try {
    await page.waitForFunction(
      () => !!document.querySelector(".fighter.enemy.dying"),
      null,
      { timeout: 60000, polling: 30 },
    );
    await page.screenshot({ path: join(OUT_DIR, `fx296-dying-${suffix}.png`) });
    console.log(`SHOT SAVED: fx296-dying-${suffix}.png`);
    const enemyWrap = page.locator(".enemy-cooldown-wrap").first();
    await enemyWrap.screenshot({ path: join(OUT_DIR, `fx296-dying-crop-${suffix}.png`) });
    console.log(`SHOT SAVED: fx296-dying-crop-${suffix}.png`);
    // Immediately after: confirm the hand-off to the existing cooldown-blur (no double-effect).
    await page.waitForFunction(
      () => !!document.querySelector(".fighter.enemy.cooldown-blur") && !document.querySelector(".fighter.enemy.dying"),
      null,
      { timeout: 5000, polling: 30 },
    );
    await page.screenshot({ path: join(OUT_DIR, `fx296-cooldown-blur-handoff-${suffix}.png`) });
    console.log(`SHOT SAVED: fx296-cooldown-blur-handoff-${suffix}.png`);
  } catch (e) {
    console.log("!! kill-flourish capture failed: " + e.message);
  }

  console.log(`[${suffix}] ` + (errors.length ? `${errors.length} page errors seen:\n` + errors.slice(0, 12).join("\n") : "no page errors"));
  await page.close();
}

/** Pet-ability-blitz needs an equipped pet — midgame has none, endgame does. */
async function shootPetFx(browser, { width, height, suffix }) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  await installSlowMo(page, 12);
  await enterBattle(page, { fixture: "endgame", zoneMatch: /./, monsterMatch: null });

  try {
    await page.waitForFunction(
      () => Array.from(document.querySelectorAll(".pet-ability-glow")).some(
        (el) => typeof el.getAnimations === "function" && el.getAnimations().length > 0,
      ),
      null,
      { timeout: 30000, polling: 30 },
    );
    await page.screenshot({ path: join(OUT_DIR, `fx296-pet-glow-${suffix}.png`) });
    console.log(`SHOT SAVED: fx296-pet-glow-${suffix}.png`);
    const playerFighter = page.locator(".fighter:not(.enemy)").first();
    await playerFighter.screenshot({ path: join(OUT_DIR, `fx296-pet-glow-crop-${suffix}.png`) });
    console.log(`SHOT SAVED: fx296-pet-glow-crop-${suffix}.png`);
  } catch (e) {
    console.log("!! pet-glow capture failed: " + e.message);
  }
  await page.close();
}

async function shootOptions(browser, { width, height, suffix }) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  await page.goto(`${BASE_URL}/?fixture=midgame`, { waitUntil: "load" });
  await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
  await page.waitForTimeout(4500);
  await clickWithReloadRetry(page, page.locator('[data-guide-id="sidebar.options"]').first());
  await page.waitForTimeout(500);

  const row = page.locator(".opz-row", { hasText: /Kampf-Effekte|Combat effects/ }).first();
  await row.scrollIntoViewIfNeeded();

  for (const label of ["Voll", "Full"]) {
    const btn = row.locator("button", { hasText: label });
    if (await btn.count()) { await btn.click(); break; }
  }
  await page.waitForTimeout(150);
  await row.screenshot({ path: join(OUT_DIR, `fx296-opt-full-${suffix}.png`) });
  console.log(`SHOT SAVED: fx296-opt-full-${suffix}.png`);

  for (const label of ["Reduziert", "Reduced"]) {
    const btn = row.locator("button", { hasText: label });
    if (await btn.count()) { await btn.click(); break; }
  }
  await page.waitForTimeout(150);
  await row.screenshot({ path: join(OUT_DIR, `fx296-opt-reduced-${suffix}.png`) });
  console.log(`SHOT SAVED: fx296-opt-reduced-${suffix}.png`);

  for (const label of ["Aus", "Off"]) {
    const btn = row.locator("button", { hasText: label });
    if (await btn.count()) { await btn.click(); break; }
  }
  await page.waitForTimeout(150);
  await row.screenshot({ path: join(OUT_DIR, `fx296-opt-off-${suffix}.png`) });
  console.log(`SHOT SAVED: fx296-opt-off-${suffix}.png`);

  // Reset back to "Voll" so it doesn't linger in localStorage as "off" for any later manual check.
  for (const label of ["Voll", "Full"]) {
    const btn = row.locator("button", { hasText: label });
    if (await btn.count()) { await btn.click(); break; }
  }

  await page.close();
}

const { child, getOutput } = startDevServer();
try {
  const ok = await waitForServer(BASE_URL);
  if (!ok) { console.error("SERVER NOT UP:\n" + getOutput()); process.exit(1); }
  const browser = await chromium.launch();
  await shootOptions(browser, { width: 1920, height: 1080, suffix: "1920" });
  await shootCombatFx(browser, { width: 1920, height: 1080, suffix: "1920" });
  await shootPetFx(browser, { width: 1920, height: 1080, suffix: "1920" });
  await shootCombatFx(browser, { width: 1280, height: 720, suffix: "1280" });
  await browser.close();
} finally {
  child.kill();
}
