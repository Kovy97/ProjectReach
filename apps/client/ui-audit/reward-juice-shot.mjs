#!/usr/bin/env node
/**
 * Chef-GO "Belohnungs-Juice-Welle" verification: Level-Up-Burst (LevelXpBar, App.tsx), Rare-Drop-
 * Jackpot-Toast (Toasts.tsx), HP-Nachlauf-Leiste (CombatPage.tsx Bar() + App.tsx mini-bars).
 * Modeled on combat-fx-shot-296.mjs. Port 5216 per Chef instructions.
 *
 * Level-up and rare-toast are one-shot dev hooks (`?levelTest=1` / `?toastTest=<rarity>`, gated on
 * import.meta.env.DEV, analog PetCelebration.tsx `getPetTestParam`) so we don't have to grind real
 * XP/loot in a headless run. The HP-trail is real combat (midgame fixture) — its ~0.9s hold + 0.7s
 * glide is comfortably screenshot-able without any slow-mo patch (CSS transition-delay, not WAAPI).
 *
 * The level-up burst DOES need the slow-mo patch (installSlowMo, lifted from combat-fx-shot-296.mjs):
 * it's a WAAPI one-shot fired on mount (before `waitForSelector` even resolves on a cold dev-server
 * compile), so a naive fixed-delay screenshot lands AFTER the ~600ms animation has already finished
 * decaying — confirmed via a throwaway per-50ms opacity trace before adding this.
 *
 * Run: node reward-juice-shot.mjs
 * Output: PNGs written to the scratchpad dir below.
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5216;
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

/** Sets the CombatFxLevel option directly in localStorage BEFORE the app boots — same key the real
 *  Options page writes (uiPrefs.ts `gr.combatFxLevel`), so this exercises the real gating code path
 *  (effectiveRewardFxLevel/effectiveFxLevel), not a JS override. */
async function setFxLevel(page, level) {
  await page.addInitScript((lvl) => {
    localStorage.setItem("gr.combatFxLevel", lvl);
  }, level);
}

/** Scales every WAAPI `.animate()` call on the page by `factor` — screenshot-friendly slow-mo,
 *  ephemeral (this-page-only), never touches the repo. Lifted from combat-fx-shot-296.mjs. */
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

// ── 1) Level-Up-Burst on the title-bar Level-XP-Leiste (App.tsx LevelXpBar) ───────────────────
async function shootLevelUp(browser, { fxLevel, suffix }) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await setFxLevel(page, fxLevel);
  await installSlowMo(page, 12); // 600ms flash / 560ms particles → ~7.2s/6.7s, comfortably capturable
  await page.goto(`${BASE_URL}/?fixture=midgame&levelTest=1`, { waitUntil: "load" });
  await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
  await page.waitForTimeout(1500); // mid-flight in the now ~7s slow-mo window
  await page.screenshot({ path: join(OUT_DIR, `juice-levelup-${suffix}.png`) });
  console.log(`SHOT SAVED: juice-levelup-${suffix}.png`);
  // .levelup-burst bleeds -16px above/below its parent (.tb-bar-wrap is only the bar's own 13px-tall
  // box — absolutely-positioned children never expand an ancestor's own layout box, regardless of
  // overflow-visible) — crop THAT element when present so the bleed area isn't clipped out; "off"
  // never renders it, so fall back to the plain bar (correctly shows nothing extra).
  const burstEl = page.locator(".levelup-burst");
  const cropTarget = (await burstEl.count()) > 0 ? burstEl : page.locator(".tb-bar-wrap").last();
  await cropTarget.screenshot({ path: join(OUT_DIR, `juice-levelup-crop-${suffix}.png`) });
  console.log(`SHOT SAVED: juice-levelup-crop-${suffix}.png`);
  // DOM-Nachweis für die FX-Gating-Stufe (motion vs. flash-only vs. nichts).
  const domProof = await page.evaluate(() => ({
    burstPresent: !!document.querySelector(".levelup-burst"),
    particlesPresent: !!document.querySelector(".levelup-burst-particles"),
  }));
  console.log(`[levelup ${suffix}] fx=${fxLevel} DOM: ${JSON.stringify(domProof)}`);
  await page.close();
}

// ── 2) Rare-Drop-Jackpot toast (Toasts.tsx) ────────────────────────────────────────────────────
async function shootRareToast(browser, { fxLevel, rarity, suffix }) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await setFxLevel(page, fxLevel);
  await page.goto(`${BASE_URL}/?fixture=midgame&toastTest=${rarity}`, { waitUntil: "load" });
  await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
  // Toasts.tsx delays the test-push by 4.5s (lets load-time achievement toasts clear the FIFO
  // MAX_TOASTS cap first, same rule as combat-fx-shot-296.mjs) — generous budget past that.
  await page.waitForFunction(() => !!document.querySelector(".toast-rare"), null, { timeout: 12000, polling: 30 });
  // toast-jackpot-pulse peaks at the 50% keyframe of its 1.5s/1.3s cycle — target that instead of
  // an early frame so the glow is actually near its brightest in the screenshot.
  await page.waitForTimeout(700);
  await page.screenshot({ path: join(OUT_DIR, `juice-toast-${rarity}-${suffix}.png`) });
  console.log(`SHOT SAVED: juice-toast-${rarity}-${suffix}.png`);
  const toast = page.locator(".toast-rare").first();
  await toast.screenshot({ path: join(OUT_DIR, `juice-toast-${rarity}-crop-${suffix}.png`) });
  console.log(`SHOT SAVED: juice-toast-${rarity}-crop-${suffix}.png`);
  const domProof = await page.evaluate(() => {
    const el = document.querySelector(".toast-rare");
    return el ? { className: el.className } : null;
  });
  console.log(`[toast ${rarity} ${suffix}] fx=${fxLevel} DOM: ${JSON.stringify(domProof)}`);
  await page.close();
}

// ── 3) HP-Nachlauf-Leiste — real combat, both fighters + the title-bar mini-bars ──────────────
async function shootHpTrail(browser, { suffix }) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", (e) => { errors.push("pageerror: " + e.message); });
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });

  await page.goto(`${BASE_URL}/?fixture=midgame`, { waitUntil: "load" });
  await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
  await page.waitForTimeout(4500); // let load-toasts clear

  await clickWithReloadRetry(page, page.locator('[data-guide-id="sidebar.combat"]').first());
  await page.waitForTimeout(500);
  // Borderlands/Goblin (armor defenseType, low maxHp=15) — NOT Pastures (chicken/cow/boar/goat are
  // ALL evasion-type there, so the player's attacks would whiff 100% of the time and enemy HP would
  // never move; confirmed via a throwaway debug run before picking this target).
  await clickWithReloadRetry(page, page.locator(".zone-card", { hasText: /Grenzlande|Borderlands/ }).first());
  await page.waitForTimeout(1500);
  const card = page.locator(".monster-card", { has: page.locator(".monster-card-name", { hasText: /^Goblin$/ }) }).first();
  await clickWithReloadRetry(page, card.locator(".mc-fight-btn"));
  await page.waitForSelector(".battle", { timeout: 10000 });

  // Wait for a hit that actually lowers enemy HP — that's the moment the trail (still at the old
  // wider RENDERED width, held by transition-delay) and the fill (already narrower) visibly
  // diverge. NOTE: `.style.width` is the react-set TARGET (both layers get the same target value
  // every render — the divergence is purely visual) — must read `getComputedStyle(...).width`
  // (actual interpolated pixel box) to see the in-progress transition gap.
  await page.waitForFunction(
    () => {
      const fill = document.querySelector(".fighter.enemy .cbar-enemy-hp .cbar-fill");
      const trail = document.querySelector(".fighter.enemy .cbar-hp-trail");
      if (!fill || !trail) return false;
      const fw = parseFloat(getComputedStyle(fill).width);
      const tw = parseFloat(getComputedStyle(trail).width);
      return tw - fw > 6; // px gap, meaningfully visible
    },
    null,
    { timeout: 30000, polling: 50 },
  );
  await page.screenshot({ path: join(OUT_DIR, `juice-hptrail-battle-${suffix}.png`) });
  console.log(`SHOT SAVED: juice-hptrail-battle-${suffix}.png`);
  const enemyFighter = page.locator(".fighter.enemy").first();
  await enemyFighter.screenshot({ path: join(OUT_DIR, `juice-hptrail-enemy-crop-${suffix}.png`) });
  console.log(`SHOT SAVED: juice-hptrail-enemy-crop-${suffix}.png`);
  const gsHp = page.locator(".gamestats-hp-inline").first();
  await gsHp.screenshot({ path: join(OUT_DIR, `juice-hptrail-titlebar-crop-${suffix}.png`) });
  console.log(`SHOT SAVED: juice-hptrail-titlebar-crop-${suffix}.png`);

  const domProof = await page.evaluate(() => {
    const fill = document.querySelector(".fighter.enemy .cbar-fill.enemy-hp");
    const trail = document.querySelector(".fighter.enemy .cbar-hp-trail");
    const gsFill = document.querySelector(".gamestats-hpbar-fill--enemy");
    // Both mini-bars (player + enemy) share the SAME .gamestats-hpbar-trail class — a plain global
    // selector would grab the player's (first in DOM), not the enemy's. Walk the sibling instead
    // (trail is fill's immediately-preceding sibling within the same .gamestats-hpbar wrapper).
    const gsTrail = gsFill ? gsFill.previousElementSibling : null;
    return {
      fighterFillTargetPct: fill?.style.width,
      fighterTrailTargetPct: trail?.style.width,
      fighterFillComputedPx: fill ? getComputedStyle(fill).width : null,
      fighterTrailComputedPx: trail ? getComputedStyle(trail).width : null,
      gsFillTargetPct: gsFill?.style.width,
      gsTrailTargetPct: gsTrail?.style.width,
      gsFillComputedPx: gsFill ? getComputedStyle(gsFill).width : null,
      gsTrailComputedPx: gsTrail ? getComputedStyle(gsTrail).width : null,
    };
  });
  console.log(`[hptrail ${suffix}] DOM: ${JSON.stringify(domProof)}`);
  console.log(`[hptrail ${suffix}] ` + (errors.length ? `${errors.length} page errors:\n` + errors.slice(0, 12).join("\n") : "no page errors"));
  await page.close();
}

async function run(label, fn) {
  try {
    await fn();
  } catch (e) {
    console.log(`!! ${label} FAILED: ${e.message}`);
  }
}

const { child, getOutput } = startDevServer();
try {
  const ok = await waitForServer(BASE_URL);
  if (!ok) { console.error("SERVER NOT UP:\n" + getOutput()); process.exit(1); }
  const browser = await chromium.launch();

  await run("levelup-full", () => shootLevelUp(browser, { fxLevel: "full", suffix: "full" }));
  await run("levelup-reduced", () => shootLevelUp(browser, { fxLevel: "reduced", suffix: "reduced" }));
  await run("levelup-off", () => shootLevelUp(browser, { fxLevel: "off", suffix: "off" }));

  await run("toast-legendary-full", () => shootRareToast(browser, { fxLevel: "full", rarity: "legendary", suffix: "full" }));
  await run("toast-rare-reduced", () => shootRareToast(browser, { fxLevel: "reduced", rarity: "rare", suffix: "reduced" }));
  await run("toast-epic-off", () => shootRareToast(browser, { fxLevel: "off", rarity: "epic", suffix: "off" }));

  await run("hptrail", () => shootHpTrail(browser, { suffix: "1920" }));

  await browser.close();
} finally {
  child.kill();
}
