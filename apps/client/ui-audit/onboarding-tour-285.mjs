import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

// Task #285 — full fresh-player walkthrough of the Spotlight Onboarding Guide.
// Starts a brand-new game (Main Menu -> New Game -> empty slot -> Character Creation -> Start),
// then follows the OnboardingGuide step by step EXACTLY like a first-time player would: screenshot
// every step, read its title/body text, and click whatever it highlights (or the continue button
// for targetless steps) until the guide ends or hangs.
const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5199;
const BASE_URL = `http://localhost:${PORT}`;
const OUT_DIR = process.argv[2] || join(__dirname, "shots", "onboarding-285");
const LOCALE = process.argv[3] || "de";
const LOG_PATH = join(OUT_DIR, "log.json");
const W = 1920;
const H = 1080;
const MAX_STEPS = 40; // safety cap, registry currently has 23

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
    try {
      const r = await fetch(url);
      if (r.ok) return true;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

function slug(s) {
  return (s || "none").replace(/[^a-z0-9.-]/gi, "_");
}

async function main() {
  const { child, getOutput } = startDevServer();
  const log = { steps: [], consoleErrors: [], fatal: null };
  try {
    if (!(await waitForServer(BASE_URL))) {
      console.error("SERVER NOT UP:\n" + getOutput());
      process.exit(1);
    }
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
    await page.addInitScript((loc) => {
      window.localStorage.setItem("hearthforge:locale", loc);
    }, LOCALE);
    page.on("pageerror", (e) => log.consoleErrors.push("pageerror: " + e.message));
    page.on("console", (m) => {
      if (m.type() === "error") log.consoleErrors.push("console: " + m.text());
    });

    await page.goto(BASE_URL, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);

    // ── Main Menu -> New Game -> empty slot -> Character Creation ──
    await page.locator(".menu-nav-btn").first().click();
    await page.waitForTimeout(300);
    await page.locator(".menu-slot-actions button").first().click();
    await page.waitForSelector(".creation", { timeout: 8000 });
    await page.waitForTimeout(600);
    await page.screenshot({ path: join(OUT_DIR, "00-creation.png"), fullPage: false });

    // Fill it out like a real player: name, pick a non-default portrait, pick a non-default style.
    await page.locator(".creation-input").first().fill("Testling");
    await page.waitForTimeout(150);
    const portraitChips = page.locator(".creation-portrait-chip");
    if ((await portraitChips.count()) > 1) await portraitChips.nth(1).click();
    await page.waitForTimeout(150);
    await page.locator(".creation-style-card").nth(1).click(); // ranged
    await page.waitForTimeout(150);
    await page.screenshot({ path: join(OUT_DIR, "01-creation-filled.png"), fullPage: false });

    await page.locator(".creation-start").click();
    await page.waitForSelector(".sidebar, .onboarding-guide-root", { timeout: 10000 });
    await page.waitForTimeout(600);

    // ── Onboarding Guide loop ──
    let i = 0;
    while (i < MAX_STEPS) {
      const guideRoot = page.locator(".onboarding-guide-root");
      const visible = await guideRoot.count().then((c) => c > 0).catch(() => false);
      if (!visible) {
        log.steps.push({ i, note: "guide-root not found -> guide ended (or never started)" });
        break;
      }

      const info = await page.evaluate(() => {
        const target = document.querySelector(".guide-target");
        const spotlight = document.querySelector(".guide-spotlight");
        const title = document.querySelector(".guide-bubble-title")?.textContent ?? null;
        const body = document.querySelector(".guide-bubble-body")?.textContent ?? null;
        const hasHint = !!document.querySelector(".guide-bubble-hint");
        const continueBtn = document.querySelector(".guide-bubble-footer button.combat-btn");
        const rect = spotlight ? spotlight.getBoundingClientRect() : null;
        return {
          guideId: target ? target.getAttribute("data-guide-id") : null,
          targetExists: !!target,
          spotlightExists: !!spotlight,
          title,
          body,
          hasHint,
          hasContinueBtn: !!continueBtn,
          continueLabel: continueBtn ? continueBtn.textContent : null,
          rect: rect ? { top: rect.top, left: rect.left, width: rect.width, height: rect.height } : null,
          viewport: { w: window.innerWidth, h: window.innerHeight },
        };
      });

      const fname = `${String(i + 2).padStart(2, "0")}-${slug(info.guideId)}.png`;
      await page.screenshot({ path: join(OUT_DIR, fname), fullPage: false });

      const offscreen =
        info.rect &&
        (info.rect.top < 0 ||
          info.rect.left < 0 ||
          info.rect.top > info.viewport.h ||
          info.rect.left > info.viewport.w);

      const stepLog = { i, shot: fname, ...info, offscreen: !!offscreen };
      log.steps.push(stepLog);
      console.log(
        `[${i}] guideId=${info.guideId} title="${info.title}" hint=${info.hasHint} contBtn=${info.hasContinueBtn} offscreen=${!!offscreen}`,
      );

      // Decide action: requireAction steps -> click the real target. Targetless / continue steps
      // -> click the continue button. If a requireAction step has NO target and NO continue button,
      // that's a hang - log it and stop (nothing left to click).
      if (info.targetExists) {
        try {
          await page.locator(".guide-target").first().click({ timeout: 5000 });
        } catch (err) {
          stepLog.clickError = String(err.message || err);
          log.fatal = `click failed at step ${i} (guideId=${info.guideId}): ${stepLog.clickError}`;
          break;
        }
      } else if (info.hasContinueBtn) {
        await page.locator(".guide-bubble-footer button.combat-btn").click({ timeout: 5000 });
      } else {
        log.fatal = `HANG at step ${i} (guideId=${info.guideId}): no target element and no continue button`;
        break;
      }

      await page.waitForTimeout(450);
      i += 1;
    }

    await page.waitForTimeout(500);
    await page.screenshot({ path: join(OUT_DIR, "99-after-guide.png"), fullPage: false });

    await browser.close();
  } catch (err) {
    log.fatal = String(err.stack || err);
  } finally {
    child.kill();
    writeFileSync(LOG_PATH, JSON.stringify(log, null, 2), "utf8");
    console.log("LOG WRITTEN: " + LOG_PATH);
    console.log("total steps logged: " + log.steps.length);
    if (log.fatal) console.error("FATAL: " + log.fatal);
    if (log.consoleErrors.length) console.error("CONSOLE ERRORS:\n" + log.consoleErrors.join("\n"));
  }
}

main();
