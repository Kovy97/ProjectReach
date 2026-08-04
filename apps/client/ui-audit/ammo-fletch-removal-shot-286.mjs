#!/usr/bin/env node
/**
 * Task #286 Stage C self-check: verifies the UI has no leftover ammo/quiver or Fletching-skill
 * remnants after Stage C removed all renderer references (nav entry, mastery/skill-overview
 * lists, onboarding guide step, paperdoll quiver slot, combat loadout, shop category, tooltips,
 * toasts). Port 5204 per Chef instructions.
 *
 * Shots: character paperdoll (fixture=midgame), combat loadout bar, shop buy tab (no Ammunition
 * chip). Then a fresh-game onboarding guide walk (light — logs each step's guideId/target
 * existence so a hang shows up immediately as `targetExists:false` while the guide is still
 * open, or as the loop never reaching "interlude").
 *
 * Run: node ui-audit/ammo-fletch-removal-shot-286.mjs
 * Output: PNGs + log written to the scratchpad dir below.
 */
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5204;
const BASE_URL = `http://localhost:${PORT}`;
const OUT_DIR = "C:\\Users\\MSchu\\AppData\\Local\\Temp\\claude\\G--GameDev\\553d2095-3a73-4795-9782-0fe746a25f13\\scratchpad\\shots-286";
mkdirSync(OUT_DIR, { recursive: true });

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

const { child, getOutput } = startDevServer();
try {
  const ok = await waitForServer(BASE_URL);
  if (!ok) { console.error("SERVER NOT UP:\n" + getOutput()); process.exit(1); }

  const browser = await chromium.launch();

  // ── Part 1: fixture-based screenshots (midgame) ──────────────────────────────
  {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
    const errors = [];
    page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
    page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });

    await page.goto(`${BASE_URL}/?fixture=midgame`, { waitUntil: "load" });
    await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
    await page.waitForTimeout(3000); // let load-toasts clear

    // Character page — paperdoll (no quiver hole).
    await page.locator('[data-guide-id="topbar.character"]').first().click({ timeout: 6000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: join(OUT_DIR, "01-character-paperdoll.png") });
    console.log("SHOT: 01-character-paperdoll.png");

    // Combat page — loadout bar (13 slots).
    await page.locator('[data-guide-id="sidebar.combat"]').first().click({ timeout: 6000 });
    await page.waitForTimeout(500);
    const slotCount = await page.locator(".cl-equip .cl-slot").count();
    console.log(`COMBAT LOADOUT SLOT COUNT: ${slotCount}`);
    await page.screenshot({ path: join(OUT_DIR, "02-combat-loadout.png") });
    console.log("SHOT: 02-combat-loadout.png");

    // Shop page — Buy tab (no Ammunition category chip).
    await page.locator('[data-guide-id="topbar.shop"]').first().click({ timeout: 6000 });
    await page.waitForTimeout(500);
    const chipLabels = await page.locator(".shopv2-chip-label").allInnerTexts();
    console.log("SHOP CATEGORY CHIPS: " + JSON.stringify(chipLabels));
    await page.screenshot({ path: join(OUT_DIR, "03-shop-buy.png") });
    console.log("SHOT: 03-shop-buy.png");

    console.log(errors.length ? `${errors.length} page errors (fixture pass):\n` + errors.join("\n") : "no page errors (fixture pass)");
    await page.close();
  }

  // ── Part 2: fresh-game onboarding guide walk (hang check) ────────────────────
  {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
    const log = { steps: [], consoleErrors: [], fatal: null };
    page.on("pageerror", (e) => log.consoleErrors.push("pageerror: " + e.message));
    page.on("console", (m) => { if (m.type() === "error") log.consoleErrors.push("console: " + m.text()); });

    await page.goto(BASE_URL, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);

    await page.locator(".menu-nav-btn").first().click();
    await page.waitForTimeout(300);
    await page.locator(".menu-slot-actions button").first().click();
    await page.waitForSelector(".creation", { timeout: 8000 });
    await page.waitForTimeout(600);

    await page.locator(".creation-input").first().fill("Testling");
    await page.waitForTimeout(150);
    await page.locator(".creation-style-card").nth(1).click(); // ranged (the style whose old
    // fletching-flavored onboarding text we just reworded)
    await page.waitForTimeout(150);

    await page.locator(".creation-start").click();
    await page.waitForSelector(".sidebar, .onboarding-guide-root", { timeout: 10000 });
    await page.waitForTimeout(600);
    await page.screenshot({ path: join(OUT_DIR, "04-guide-start.png") });
    console.log("SHOT: 04-guide-start.png");

    let i = 0;
    const MAX_STEPS = 30;
    while (i < MAX_STEPS) {
      const guideRoot = page.locator(".onboarding-guide-root");
      const visible = await guideRoot.count().then((c) => c > 0).catch(() => false);
      if (!visible) {
        log.steps.push({ i, note: "guide-root not found -> guide ended" });
        break;
      }
      const info = await page.evaluate(() => {
        const target = document.querySelector(".guide-target");
        const title = document.querySelector(".guide-bubble-title")?.textContent ?? null;
        const continueBtn = document.querySelector(".guide-bubble-footer button.combat-btn");
        return {
          guideId: target ? target.getAttribute("data-guide-id") : null,
          targetExists: !!target,
          title,
          hasContinueBtn: !!continueBtn,
        };
      });
      log.steps.push({ i, ...info });
      if (i < 6 || (i >= 13 && i <= 16) || i > 19) {
        // only screenshot the boundary-relevant steps (intro/topbar + the thieving<->
        // leatherworking seam where fletching used to sit) to keep this light.
        await page.screenshot({ path: join(OUT_DIR, `05-guide-step-${String(i).padStart(2, "0")}-${(info.guideId ?? "none").replace(/\./g, "_")}.png`) });
      }
      if (info.hasContinueBtn) {
        await page.locator(".guide-bubble-footer button.combat-btn").first().click({ timeout: 5000 }).catch(() => {});
      } else if (info.targetExists) {
        await page.locator(".guide-target").first().click({ timeout: 5000 }).catch(() => {});
      } else {
        log.fatal = `step ${i}: guide open but no target and no continue button (HANG)`;
        break;
      }
      await page.waitForTimeout(350);
      i++;
    }
    if (i >= MAX_STEPS) log.fatal = `hit MAX_STEPS (${MAX_STEPS}) without the guide ending`;
    writeFileSync(join(OUT_DIR, "guide-log.json"), JSON.stringify(log, null, 2), "utf8");
    console.log("GUIDE STEPS: " + log.steps.map((s) => s.guideId ?? s.note).join(" -> "));
    console.log(log.fatal ? "GUIDE RESULT: FATAL — " + log.fatal : "GUIDE RESULT: OK (ended cleanly)");
    console.log(log.consoleErrors.length ? `${log.consoleErrors.length} console errors:\n` + log.consoleErrors.join("\n") : "no console errors (guide pass)");
    await page.close();
  }

  await browser.close();
} finally {
  child.kill();
}
