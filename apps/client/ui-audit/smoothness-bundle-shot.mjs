#!/usr/bin/env node
/**
 * Geschmeidigkeits-Bundle verification (Chef-GO 2026-07-09): page-transition fade, gold count-up
 * tween, Citadel scrollbar. Headless (non-Electron) Vite+Playwright pattern, mirrors
 * pin-tracker-shot.mjs / combat-fx-shot-296.mjs. Port 5221 per Chef instructions.
 *
 * Run: node ui-audit/smoothness-bundle-shot.mjs   (from apps/client/)
 * Output: PNGs + console proof written to the scratchpad dir below (this is a one-off ui-dev
 * verification script, not part of the CI-relevant ui-audit suite).
 */
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5221;
const BASE_URL = `http://localhost:${PORT}`;
const OUT_DIR = "C:\\Users\\MSchu\\AppData\\Local\\Temp\\claude\\G--GameDev\\553d2095-3a73-4795-9782-0fe746a25f13\\scratchpad\\smoothness-bundle";
const VIEWPORT = { width: 1600, height: 1000 };

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

async function waitForServer(url, timeoutMs = 40_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {
      // not up yet
    }
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

async function loadIntoGame(page) {
  await page.goto(`${BASE_URL}/?fixture=midgame`, { waitUntil: "load" });
  await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15_000 });
  await page.waitForTimeout(4200); // let fixture-load achievement toasts clear
}

// ─── TEST 1: page-transition fade ──────────────────────────────────────────
async function testPageTransition(browser) {
  console.log("\n[smoothness] === TEST 1: page-transition fade (~150ms fade + 6px slide-up) ===");
  const page = await browser.newPage({ viewport: VIEWPORT });
  let failed = false;
  try {
    await loadIntoGame(page);

    // Ephemeral slow-mo: stretches the CSS keyframe animation duration for THIS test page only
    // (never touches the repo) so we can reliably capture distinct mid-animation frames instead of
    // racing Playwright/IPC latency against a real 150ms window (same spirit as the WAAPI slow-mo
    // trick in combat-fx-shot-296.mjs).
    await page.addStyleTag({ content: ".page-transition { animation-duration: 2000ms !important; }" });

    await page.screenshot({ path: join(OUT_DIR, "01-before-nav.png") });

    await clickWithReloadRetry(page, page.locator('[data-guide-id="sidebar.combat"]').first());

    const readFrame = () => page.evaluate(() => {
      const el = document.querySelector(".page-transition");
      if (!el) return null;
      const cs = getComputedStyle(el);
      return { opacity: cs.opacity, transform: cs.transform, animationName: cs.animationName, animationDuration: cs.animationDuration };
    });

    const frameA = await readFrame();
    await page.screenshot({ path: join(OUT_DIR, "02-mid-transition-frameA.png") });
    await page.waitForTimeout(700);
    const frameB = await readFrame();
    await page.screenshot({ path: join(OUT_DIR, "03-mid-transition-frameB.png") });
    await page.waitForTimeout(1500);
    const frameSettled = await readFrame();
    await page.screenshot({ path: join(OUT_DIR, "04-settled.png") });

    console.log(`[smoothness] frame A (~0ms):    opacity=${frameA?.opacity} transform=${frameA?.transform} animation=${frameA?.animationName}/${frameA?.animationDuration}`);
    console.log(`[smoothness] frame B (~700ms):  opacity=${frameB?.opacity} transform=${frameB?.transform}`);
    console.log(`[smoothness] settled (~2200ms): opacity=${frameSettled?.opacity} transform=${frameSettled?.transform}`);

    if (frameA?.animationName !== "page-fade-in") {
      console.error(`[smoothness] FAIL: expected .page-transition animation-name "page-fade-in" right after nav, got "${frameA?.animationName}"`);
      failed = true;
    }
    if (frameSettled?.opacity !== "1") {
      console.error(`[smoothness] FAIL: expected settled opacity 1, got ${frameSettled?.opacity}`);
      failed = true;
    }
    const looksIntermediate = (f) => f && (parseFloat(f.opacity) < 0.98 || (f.transform && f.transform !== "none" && !/matrix\(1, 0, 0, 1, 0, 0\)/.test(f.transform)));
    const sawIntermediateFrame = looksIntermediate(frameA) || looksIntermediate(frameB);
    console.log(`[smoothness] observed a genuine mid-animation (non-final) frame: ${sawIntermediateFrame}`);
    if (!sawIntermediateFrame) {
      console.error("[smoothness] FAIL: never observed an intermediate frame — animation may be instant/broken");
      failed = true;
    }
  } catch (err) {
    console.error("[smoothness] TEST 1 error:", err);
    failed = true;
  }
  await page.close();
  return failed;
}

// ─── TEST 1b: prefers-reduced-motion disables the fade ────────────────────
async function testReducedMotion(browser) {
  console.log("\n[smoothness] === TEST 1b: prefers-reduced-motion disables the page fade ===");
  const ctx = await browser.newContext({ viewport: VIEWPORT, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  let failed = false;
  try {
    await loadIntoGame(page);
    await clickWithReloadRetry(page, page.locator('[data-guide-id="sidebar.combat"]').first());
    const cs = await page.evaluate(() => {
      const el = document.querySelector(".page-transition");
      const c = getComputedStyle(el);
      return { animationName: c.animationName, animationDuration: c.animationDuration };
    });
    console.log(`[smoothness] reduced-motion .page-transition: animation-name=${cs.animationName} duration=${cs.animationDuration}`);
    if (cs.animationName !== "none") {
      console.error(`[smoothness] FAIL: expected animation-name "none" under prefers-reduced-motion, got "${cs.animationName}"`);
      failed = true;
    }
  } catch (err) {
    console.error("[smoothness] TEST 1b error:", err);
    failed = true;
  }
  await page.close();
  await ctx.close();
  return failed;
}

// ─── TEST 2: gold count-up tween ───────────────────────────────────────────
async function testGoldCountUp(browser) {
  console.log("\n[smoothness] === TEST 2: gold count-up tween (~400ms ease-out) ===");
  const page = await browser.newPage({ viewport: VIEWPORT });
  let failed = false;
  try {
    await loadIntoGame(page);

    const goldBefore = (await page.locator(".gold-display").innerText()).trim();
    console.log(`[smoothness] gold before: "${goldBefore}"`);

    await clickWithReloadRetry(page, page.locator('[data-guide-id="topbar.shop"]').first());
    await page.waitForTimeout(400);
    // Locale defaults to "de" (see i18n/index.tsx initialLocale) — Buy/Sell tab order is fixed
    // (index 0/1) regardless of locale, so index the tab instead of matching English text.
    await clickWithReloadRetry(page, page.locator(".shopv2-maintab").nth(1));
    await page.waitForTimeout(300);

    // Find the sellable stack with the LARGEST total value (qty × unit price) — a big jump makes
    // the tween's intermediate steps unambiguous (a 1-gold total delta rounds to only 2 possible
    // displayed integers regardless of how smooth the underlying tween is). Midgame fixture has no
    // item instances, so every .shopv2-sell-cell here is a plain fungible stack.
    const cells = page.locator(".shopv2-sell-cell");
    const cellCount = await cells.count();
    let chosen = -1;
    let bestTotal = 0;
    for (let i = 0; i < cellCount; i++) {
      // ItemCell's own onClick also pins a tooltip card (tooltip.pin) — force the click so the
      // still-open pinned card from the PREVIOUS cell (it stays mounted until dismissed) never
      // blocks Playwright's actionability check on the next cell underneath it.
      await cells.nth(i).click({ force: true });
      await page.waitForTimeout(120);
      if ((await page.locator(".shopv2-sell-all").count()) > 0) {
        const meta = await page.locator(".shopv2-sell-detail-meta").innerText().catch(() => "");
        const m = meta.match(/(\d[\d.,]*)\D+(\d[\d.,]*)/); // "<owned>: <qty> · <unit price> ..."
        const qty = m ? Number(m[1].replace(/[.,]/g, "")) : 0;
        const unitPrice = m ? Number(m[2].replace(/[.,]/g, "")) : 0;
        const total = qty * unitPrice;
        if (total > bestTotal) { bestTotal = total; chosen = i; }
      }
      await page.keyboard.press("Escape"); // dismiss the pinned tooltip before the next cell
      await page.waitForTimeout(60);
    }
    console.log(`[smoothness] chosen sellable stack index: ${chosen} (of ${cellCount} cells), expected total value: ${bestTotal}`);
    if (chosen === -1 || bestTotal < 10) {
      console.error(`[smoothness] FAIL: no sellable stack found with a meaningfully large total value (best=${bestTotal})`);
      failed = true;
    } else {
      await cells.nth(chosen).click({ force: true });
      await page.waitForTimeout(150);
      await page.keyboard.press("Escape"); // dismiss the pinned tooltip so it can't cover the Sell-all button
      await page.waitForTimeout(60);
      await page.screenshot({ path: join(OUT_DIR, "05a-gold-before-sell.png") });

      // Sample .gold-display text every animation frame for ~650ms starting just before the click
      // resolves, so we don't miss the early frames of the 400ms tween.
      const samplePromise = page.evaluate(() => {
        return new Promise((resolve) => {
          const el = document.querySelector(".gold-display");
          const start = performance.now();
          const out = [];
          function tick() {
            out.push({ t: Math.round(performance.now() - start), text: el.textContent.trim() });
            if (performance.now() - start < 650) requestAnimationFrame(tick);
            else resolve(out);
          }
          requestAnimationFrame(tick);
        });
      });
      await page.locator(".shopv2-sell-all").click({ force: true });
      const samples = await samplePromise;

      console.log(`[smoothness] gold-display samples: ${samples.map((s) => `${s.t}ms:${s.text}`).join("  ")}`);
      const uniqueValues = new Set(samples.map((s) => s.text));
      console.log(`[smoothness] distinct gold-display values observed during the tween: ${uniqueValues.size}`);
      if (uniqueValues.size < 3) {
        console.error("[smoothness] FAIL: expected several distinct intermediate values while the counter tweens (saw a hard jump instead)");
        failed = true;
      }
      const goldAfter = samples[samples.length - 1].text;
      console.log(`[smoothness] gold after settle: "${goldAfter}" (before: "${goldBefore}")`);
      if (goldAfter === goldBefore) {
        console.error("[smoothness] FAIL: gold value never changed — sell action had no effect");
        failed = true;
      }
      await page.screenshot({ path: join(OUT_DIR, "05b-gold-after-sell.png") });
    }
  } catch (err) {
    console.error("[smoothness] TEST 2 error:", err);
    failed = true;
  }
  await page.close();
  return failed;
}

// ─── TEST 3a: scrollbar — Bank grid ────────────────────────────────────────
async function testBankScrollbar(browser) {
  console.log("\n[smoothness] === TEST 3a: Citadel scrollbar — Bank grid ===");
  const page = await browser.newPage({ viewport: VIEWPORT });
  let failed = false;
  try {
    await loadIntoGame(page);
    // Force overflow regardless of how many items midgame's fixture inventory happens to hold —
    // this test is about the SCROLLBAR APPEARANCE, not about reproducing a real overflow scenario.
    // Ephemeral (this page only), never touches the repo.
    await page.addStyleTag({ content: ".bank-grid { max-height: 130px !important; }" });
    await clickWithReloadRetry(page, page.locator('[data-guide-id="topbar.bank"]').first());
    await page.waitForTimeout(400);
    // Locale defaults to "de" (see i18n/index.tsx initialLocale) — target the deposit-all button
    // by its unique `--sm` modifier class instead of its (German) label text.
    await clickWithReloadRetry(page, page.locator(".shop-citadel-btn--sm").first());
    await page.waitForTimeout(300);

    const grid = page.locator(".bank-grid").first();
    if ((await grid.count()) === 0) {
      console.error("[smoothness] FAIL: .bank-grid not found after deposit-all");
      failed = true;
    } else {
      const info = await grid.evaluate((el) => {
        const cs = getComputedStyle(el);
        return { overflowing: el.scrollHeight > el.clientHeight, scrollbarWidth: cs.scrollbarWidth, scrollbarColor: cs.scrollbarColor };
      });
      console.log(`[smoothness] .bank-grid overflowing=${info.overflowing} scrollbar-width=${info.scrollbarWidth} scrollbar-color=${info.scrollbarColor}`);
      await grid.screenshot({ path: join(OUT_DIR, "06-bank-grid-scrollbar.png") });
    }
  } catch (err) {
    console.error("[smoothness] TEST 3a error:", err);
    failed = true;
  }
  await page.close();
  return failed;
}

// ─── TEST 3b: scrollbar — Combat log ───────────────────────────────────────
async function testCombatLogScrollbar(browser) {
  console.log("\n[smoothness] === TEST 3b: Citadel scrollbar — Combat log ===");
  // Shorter viewport than the other tests: forces the log panel to overflow with fewer lines
  // instead of waiting a long time for enough combat exchanges to fill a tall 1000px panel.
  const page = await browser.newPage({ viewport: { width: 1600, height: 680 } });
  let failed = false;
  try {
    await loadIntoGame(page);
    // Force a short log panel so it overflows quickly regardless of how many exchanges happen in
    // the wait window below — this test is about the SCROLLBAR APPEARANCE, not fight pacing.
    await page.addStyleTag({ content: ".battle-log { max-height: 150px !important; }" });
    await clickWithReloadRetry(page, page.locator('[data-guide-id="sidebar.combat"]').first());
    await page.waitForTimeout(500);
    const zoneCard = page.locator(".zone-card").first();
    if ((await zoneCard.count()) > 0) {
      await clickWithReloadRetry(page, zoneCard);
      await page.waitForTimeout(1200);
    }
    const monsterCard = page.locator(".monster-card").first();
    await monsterCard.waitFor({ state: "visible", timeout: 8000 });
    await clickWithReloadRetry(page, monsterCard.locator(".mc-fight-btn"));
    await page.waitForSelector(".battle", { timeout: 10_000 });
    await page.waitForTimeout(14_000); // accumulate enough log lines to overflow the shorter panel

    const log = page.locator(".battle-log").first();
    if ((await log.count()) === 0) {
      console.error("[smoothness] FAIL: .battle-log not found during combat");
      failed = true;
    } else {
      const info = await log.evaluate((el) => {
        const cs = getComputedStyle(el);
        return { overflowing: el.scrollHeight > el.clientHeight, lines: el.children.length, scrollbarWidth: cs.scrollbarWidth };
      });
      console.log(`[smoothness] .battle-log lines=${info.lines} overflowing=${info.overflowing} scrollbar-width=${info.scrollbarWidth}`);
      await log.screenshot({ path: join(OUT_DIR, "07-battle-log-scrollbar.png") });
    }
  } catch (err) {
    console.error("[smoothness] TEST 3b error:", err);
    failed = true;
  }
  await page.close();
  return failed;
}

// ─── TEST 3c: scrollbar — Item Wiki modal (checks the scrollbar-color/-width conflict spot) ──
async function testWikiModalScrollbar(browser) {
  console.log("\n[smoothness] === TEST 3c: Citadel scrollbar — Item Wiki modal (.iwk-body) ===");
  const page = await browser.newPage({ viewport: VIEWPORT });
  let failed = false;
  try {
    await loadIntoGame(page);
    // Force overflow so the .iwk-body scrollbar is visible regardless of which item has the
    // longest source/used-for list — this test is about the SCROLLBAR APPEARANCE.
    await page.addStyleTag({ content: ".iwk-body { max-height: 120px !important; }" });
    // "character" is a topbar-placement page, not sidebar (see navigation.ts) — confirmed via the
    // rendered data-guide-id list, not guessed.
    await clickWithReloadRetry(page, page.locator('[data-guide-id="topbar.character"]').first());
    await page.waitForTimeout(500);

    const cells = page.locator(".cs-inv-grid .item-cell");
    const cellCount = await cells.count();
    let opened = false;
    for (let i = 0; i < cellCount && !opened; i++) {
      await cells.nth(i).click();
      await page.waitForTimeout(150);
      const wikiBtn = page.locator(".itip-wiki-btn");
      if ((await wikiBtn.count()) === 0) { await page.keyboard.press("Escape"); continue; }
      await wikiBtn.click();
      await page.waitForTimeout(250);
      if ((await page.locator(".iwk-body").count()) > 0) opened = true;
    }
    console.log(`[smoothness] Item Wiki modal opened: ${opened} (tried up to ${cellCount} cells)`);
    if (!opened) {
      console.error("[smoothness] FAIL: could not open the Item Wiki modal from any inventory cell");
      failed = true;
    } else {
      const body = page.locator(".iwk-body").first();
      const info = await body.evaluate((el) => {
        const cs = getComputedStyle(el);
        return { overflowing: el.scrollHeight > el.clientHeight, scrollbarWidth: cs.scrollbarWidth, scrollbarColor: cs.scrollbarColor };
      });
      console.log(`[smoothness] .iwk-body overflowing=${info.overflowing} scrollbar-width=${info.scrollbarWidth} scrollbar-color=${info.scrollbarColor}`);
      if (info.scrollbarWidth !== "auto") {
        console.warn(`[smoothness] NOTE: .iwk-body declares scrollbar-width:${info.scrollbarWidth}/scrollbar-color (item-wiki.css) — in this Chromium build the standard property wins over the new global ::-webkit-scrollbar Citadel styling for THIS element. That file is outside ui-dev's revier (only App.tsx/base.css/index.css/topbar.css) — flagging for CEO routing rather than editing it.`);
      }
      await body.screenshot({ path: join(OUT_DIR, "08-item-wiki-modal-scrollbar.png") });
      await page.screenshot({ path: join(OUT_DIR, "08b-item-wiki-modal-full.png") });
    }
  } catch (err) {
    console.error("[smoothness] TEST 3c error:", err);
    failed = true;
  }
  await page.close();
  return failed;
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  console.log(`[smoothness] starting dev server on port ${PORT}...`);
  const server = startDevServer();
  const up = await waitForServer(BASE_URL);
  if (!up) {
    console.error("[smoothness] dev server did not come up in time:\n" + server.getOutput());
    server.child.kill();
    process.exitCode = 1;
    return;
  }
  console.log("[smoothness] dev server is up.");

  const browser = await chromium.launch();
  let failed = false;
  try {
    failed = (await testPageTransition(browser)) || failed;
    failed = (await testReducedMotion(browser)) || failed;
    failed = (await testGoldCountUp(browser)) || failed;
    failed = (await testBankScrollbar(browser)) || failed;
    failed = (await testCombatLogScrollbar(browser)) || failed;
    failed = (await testWikiModalScrollbar(browser)) || failed;
  } finally {
    await browser.close();
    server.child.kill();
  }
  console.log(`\n[smoothness] done. Screenshots in ${OUT_DIR}`);
  if (failed) {
    console.error("[smoothness] one or more assertions FAILED — see log above.");
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("[smoothness] fatal:", err);
  process.exitCode = 1;
});
