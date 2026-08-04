#!/usr/bin/env node
/**
 * Tester-Sweep 2 (RC 0.1, 2026-07-13), T9 "Der Einsteller" — Rahmen-Systeme, Teil 3.
 * Covers: Hotkeys (Ziffern-Navigation inkl. Modal-Block + Input-Guard, F11-Hinweis, F1-Autoscroll
 * 180/360px/s + Stop bei Wheel/Ende), Escape-Ketten in verschachtelten Modals (Tooltip/Quit-Confirm/
 * Pouch/PortraitPicker), Fenster-Layout bei 1366×768 (kein UI-Scale mehr — CSS muss halten).
 *
 * Pattern per ui-audit/README.md + hotkeys-shot.mjs. Own port 5258.
 */
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const SHOTS_DIR = join(__dirname, "shots-sweep2-t9");
const PORT = 5258;
const BASE_URL = `http://localhost:${PORT}`;

mkdirSync(SHOTS_DIR, { recursive: true });

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

async function waitForServer(url, timeoutMs = 30_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try { const res = await fetch(url); if (res.ok) return true; } catch {}
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

const findings = [];
function report(sev, msg) { findings.push(`[${sev}] ${msg}`); console.log(`[${sev}] ${msg}`); }
function ok(msg) { console.log(`[OK] ${msg}`); }

/** Legacy/fixture saves ship with `toursSeen: {}` (legacyOnboarding, shared/index.ts) — so the
 *  FIRST visit to Combat/Shop/Bank in a fresh session triggers that area's first-visit Spotlight
 *  tour, which sets `.guide-active` (pointer-events:none on the whole app except its target) and
 *  would otherwise block every subsequent click in a test that walks multiple pages. Skip it if
 *  present so page-to-page navigation isn't incidentally blocked by an unrelated (expected) guide. */
async function dismissAnyGuideIfPresent(page, label) {
  await page.waitForTimeout(150);
  if (await page.locator(".onboarding-guide-root").count() === 0) return;
  console.log(`[t9-hk] ${label}: an onboarding/area-tour guide is open — skipping it to unblock navigation`);
  const skipBtn = page.locator(".guide-bubble-skip");
  if (await skipBtn.count() > 0) { await skipBtn.click(); await page.waitForTimeout(200); }
}

async function main() {
  console.log(`[t9-hk] starting dev server on port ${PORT}...`);
  const server = startDevServer();
  const up = await waitForServer(BASE_URL);
  if (!up) {
    console.error("[t9-hk] dev server did not come up:\n" + server.getOutput());
    server.child.kill();
    process.exitCode = 1;
    return;
  }
  console.log("[t9-hk] dev server up.");

  const browser = await chromium.launch();
  try {
    // ═══════════════════════════════════════════════════════════════════
    // PHASE 1: Digit navigation 1-9, blocked by open modal, blocked by focused input
    // ═══════════════════════════════════════════════════════════════════
    const page1 = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    const errs1 = [];
    page1.on("pageerror", (e) => errs1.push(e.message));
    await page1.goto(`${BASE_URL}/?fixture=midgame`, { waitUntil: "load" });
    await page1.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15_000 });
    await page1.waitForTimeout(4200);

    await page1.locator("body").click({ position: { x: 5, y: 5 } });
    await page1.keyboard.press("3");
    await page1.waitForTimeout(300);
    const active3 = await page1.locator(".sb-skill-btn.active").first().getAttribute("data-guide-id");
    if (active3) ok(`Digit "3" navigated to ${active3}`);
    else report("MITTEL", `Digit "3" did not navigate to any sidebar page`);

    // Blocked by open modal: open the quit-confirm modal, press a digit, verify page unchanged.
    await page1.locator(".sb-footer-quit").click();
    await page1.waitForTimeout(200);
    const modalOpen = await page1.locator(".quit-confirm-modal").count() > 0;
    if (modalOpen) {
      await page1.keyboard.press("5");
      await page1.waitForTimeout(250);
      const activeAfterDigitWithModal = await page1.locator(".sb-skill-btn.active").first().getAttribute("data-guide-id");
      if (activeAfterDigitWithModal === active3) ok(`Digit hotkey correctly BLOCKED while quit-confirm modal is open (page stayed on ${active3})`);
      else report("KRITISCH", `Digit hotkey fired THROUGH an open modal — page changed from ${active3} to ${activeAfterDigitWithModal} while quit-confirm modal was open`);
      // Close it via Escape (also exercises the Escape chain for this modal).
      await page1.keyboard.press("Escape");
      await page1.waitForTimeout(200);
      const modalGoneAfterEsc = await page1.locator(".quit-confirm-modal").count() === 0;
      if (modalGoneAfterEsc) ok(`Escape closed the quit-confirm modal`);
      else report("KRITISCH", `Escape did NOT close the quit-confirm modal`);
    } else {
      report("MITTEL", `Could not open quit-confirm modal via .sb-footer-quit — skipping modal-block digit-nav check`);
    }

    // Blocked while a text input has focus.
    await page1.evaluate(() => {
      const el = document.createElement("input");
      el.type = "text";
      el.id = "t9-probe-input";
      document.body.appendChild(el);
      el.focus();
    });
    await page1.locator("#t9-probe-input").pressSequentially("7");
    await page1.waitForTimeout(200);
    const activeAfterTypingInInput = await page1.locator(".sb-skill-btn.active").first().getAttribute("data-guide-id");
    if (activeAfterTypingInInput === active3) ok(`Digit typed into a focused <input> did NOT navigate (page stayed on ${active3})`);
    else report("KRITISCH", `Digit typed into a focused <input> navigated the page anyway (${active3} -> ${activeAfterTypingInInput})`);
    const probeVal = await page1.locator("#t9-probe-input").inputValue();
    if (probeVal === "7") ok(`The "7" correctly reached the input's own value instead of being hijacked`);
    await page1.evaluate(() => document.getElementById("t9-probe-input")?.remove());

    // F11 hint badge on Options "Steuerung" section.
    await page1.locator(".sb-footer-options").click();
    await page1.waitForSelector(".opz-page", { timeout: 10_000 });
    const f11Badge = page1.locator(".opz-key", { hasText: "F11" });
    if (await f11Badge.count() === 1) ok(`F11 hint badge present in Options "Steuerung" section`);
    else report("MITTEL", `F11 hint badge NOT found in Options "Steuerung" section (count=${await f11Badge.count()})`);

    if (errs1.length) report("KRITISCH", `console pageerrors during digit-nav phase: ${errs1.join(" | ")}`);
    await page1.close();

    // ═══════════════════════════════════════════════════════════════════
    // PHASE 2: F1 autoscroll — 180px/s, Shift+F1 = 360px/s, stops on wheel, stops at page end
    // ═══════════════════════════════════════════════════════════════════
    const page2 = await browser.newPage({ viewport: { width: 1920, height: 500 } });
    const errs2 = [];
    page2.on("pageerror", (e) => errs2.push(e.message));
    await page2.goto(`${BASE_URL}/?fixture=endgame`, { waitUntil: "load" }); // endgame = fuller lists, more to scroll
    await page2.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15_000 });
    await page2.waitForTimeout(4200);

    // Options page: a stack of ~7 fixed-content sections (Display/Audio/Gameplay/Language/
    // Hotkeys/Save-Data/About) that doesn't reflow into columns like the Character/Achievements
    // grids do (those adapted to viewport height instead of overflowing — good UI, bad test
    // surface). A squeezed 500px-tall viewport reliably forces real overflow here.
    await page2.locator(".sb-footer-options").click().catch(() => {});
    await page2.waitForTimeout(400);
    await dismissAnyGuideIfPresent(page2, "F1-autoscroll setup");
    const scrollHeight = await page2.evaluate(() => document.querySelector(".content-body")?.scrollHeight ?? 0);
    const clientHeight = await page2.evaluate(() => document.querySelector(".content-body")?.clientHeight ?? 0);
    console.log(`[t9-hk] .content-body scrollHeight=${scrollHeight} clientHeight=${clientHeight}`);
    if (scrollHeight - clientHeight < 400) {
      report("MITTEL", `Character page doesn't have enough scrollable content (${scrollHeight - clientHeight}px) to reliably measure F1 autoscroll speed — trying anyway`);
    }

    await page2.locator("body").click({ position: { x: 5, y: 5 } });
    await page2.evaluate(() => { const el = document.querySelector(".content-body"); if (el) el.scrollTop = 0; });
    await page2.keyboard.press("F1");
    const t0 = Date.now();
    await page2.waitForTimeout(1000);
    const posAfter1sSlow = await page2.evaluate(() => document.querySelector(".content-body")?.scrollTop ?? 0);
    const elapsed1 = Date.now() - t0;
    const impliedSpeedSlow = (posAfter1sSlow / elapsed1) * 1000;
    console.log(`[t9-hk] SLOW F1: scrollTop after ${elapsed1}ms = ${posAfter1sSlow}px -> implied ${impliedSpeedSlow.toFixed(0)}px/s (expect ~180)`);
    if (Math.abs(impliedSpeedSlow - 180) < 40) ok(`F1 autoscroll (slow) speed matches ~180px/s (measured ${impliedSpeedSlow.toFixed(0)}px/s)`);
    else report("MITTEL", `F1 autoscroll (slow) speed off — measured ${impliedSpeedSlow.toFixed(0)}px/s, expected ~180px/s (may be capped by short content)`);

    // Toggle off (F1 again).
    await page2.keyboard.press("F1");
    await page2.waitForTimeout(150);
    const posAfterStop = await page2.evaluate(() => document.querySelector(".content-body")?.scrollTop ?? 0);
    await page2.waitForTimeout(400);
    const posWellAfterStop = await page2.evaluate(() => document.querySelector(".content-body")?.scrollTop ?? 0);
    if (Math.abs(posWellAfterStop - posAfterStop) < 3) ok(`F1 pressed again correctly STOPS the autoscroll (position held: ${posAfterStop} -> ${posWellAfterStop})`);
    else report("MITTEL", `F1 toggle-off did not stop autoscroll (position kept changing: ${posAfterStop} -> ${posWellAfterStop})`);

    // Shift+F1 = FAST (360px/s).
    await page2.evaluate(() => { const el = document.querySelector(".content-body"); if (el) el.scrollTop = 0; });
    await page2.waitForTimeout(100);
    await page2.keyboard.press("Shift+F1");
    const t1 = Date.now();
    await page2.waitForTimeout(1000);
    const posAfter1sFast = await page2.evaluate(() => document.querySelector(".content-body")?.scrollTop ?? 0);
    const elapsed2 = Date.now() - t1;
    const impliedSpeedFast = (posAfter1sFast / elapsed2) * 1000;
    console.log(`[t9-hk] FAST Shift+F1: scrollTop after ${elapsed2}ms = ${posAfter1sFast}px -> implied ${impliedSpeedFast.toFixed(0)}px/s (expect ~360)`);
    if (Math.abs(impliedSpeedFast - 360) < 70) ok(`Shift+F1 autoscroll (fast) speed matches ~360px/s (measured ${impliedSpeedFast.toFixed(0)}px/s)`);
    else report("MITTEL", `Shift+F1 autoscroll (fast) speed off — measured ${impliedSpeedFast.toFixed(0)}px/s, expected ~360px/s (may be capped by short content / already near page end)`);

    // Mouse wheel stops it.
    await page2.mouse.wheel(0, 10);
    await page2.waitForTimeout(150);
    const posAfterWheel = await page2.evaluate(() => document.querySelector(".content-body")?.scrollTop ?? 0);
    await page2.waitForTimeout(400);
    const posWellAfterWheel = await page2.evaluate(() => document.querySelector(".content-body")?.scrollTop ?? 0);
    if (Math.abs(posWellAfterWheel - posAfterWheel) < 15) ok(`Mouse wheel correctly stopped the autoscroll (${posAfterWheel} -> ${posWellAfterWheel})`);
    else report("MITTEL", `Mouse wheel did not stop autoscroll (${posAfterWheel} -> ${posWellAfterWheel})`);

    // Stops at end: force-scroll near the bottom, start autoscroll, verify it halts at max and
    // doesn't throw/keep growing scrollTop past scrollHeight.
    await page2.evaluate(() => {
      const el = document.querySelector(".content-body");
      if (el) el.scrollTop = el.scrollHeight - el.clientHeight - 30; // 30px from the very end
    });
    await page2.waitForTimeout(100);
    await page2.keyboard.press("F1");
    await page2.waitForTimeout(1200); // plenty of time to reach + stop at the end
    const posNearEnd = await page2.evaluate(() => {
      const el = document.querySelector(".content-body");
      return el ? { top: el.scrollTop, max: el.scrollHeight - el.clientHeight } : null;
    });
    console.log(`[t9-hk] near-end autoscroll result: ${JSON.stringify(posNearEnd)}`);
    if (posNearEnd && Math.abs(posNearEnd.top - posNearEnd.max) < 2) ok(`F1 autoscroll correctly stops right at the scroll end (${posNearEnd.top}/${posNearEnd.max})`);
    else report("MITTEL", `F1 autoscroll near the end did not settle exactly at max: ${JSON.stringify(posNearEnd)}`);
    // Confirm it actually auto-stopped (pressing F1 again should START it, not stop an already-running one).
    await page2.waitForTimeout(300);
    const posStill = await page2.evaluate(() => document.querySelector(".content-body")?.scrollTop ?? 0);
    if (posNearEnd && Math.abs(posStill - posNearEnd.top) < 2) ok(`Autoscroll stayed stopped at the end (no runaway loop)`);

    if (errs2.length) report("KRITISCH", `console pageerrors during F1-autoscroll phase: ${errs2.join(" | ")}`);
    await page2.close();

    // ═══════════════════════════════════════════════════════════════════
    // PHASE 3: Escape chains — pinned tooltip, Pouch modal, PortraitPicker modal
    // ═══════════════════════════════════════════════════════════════════
    const page3 = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    const errs3 = [];
    page3.on("pageerror", (e) => errs3.push(e.message));
    // Craft a save with a base item (qty>0) PLUS one enchanted-instance of the SAME base item —
    // the exact condition VariantContainerCell needs to show the pouch star (versionCount > 1).
    // NOTE: persistence's sanitizeInstance (index.ts ~line 364) deliberately DROPS any instance
    // with zero affixes AND no suffix ("plain" instances degrade back to a stack, by design) — a
    // first attempt at this fixture used `affixes: []` and got silently pruned on load. A real
    // affix is required for the instance to survive deserialize().
    const midgame = JSON.parse(readFileSync(join(__dirname, "fixtures", "midgame.json"), "utf8"));
    const baseSlot = midgame.state.inventory.slots.find((s) => s && s.qty > 0);
    midgame.state.inventory.instances.push({
      instanceId: "t9_pouch_test_instance",
      baseItemId: baseSlot.itemId,
      affixes: [{ affixId: "t9_test_affix", tier: 1 }],
    });
    midgame.savedAt = Date.now();
    midgame.summary = { ...midgame.summary, savedAt: midgame.savedAt };
    await page3.goto(BASE_URL, { waitUntil: "load" });
    await page3.evaluate((s) => localStorage.setItem("hearthforge:save:0", s), JSON.stringify(midgame));
    await page3.goto(BASE_URL, { waitUntil: "load" });
    await page3.waitForSelector(".menu-nav-btn", { timeout: 15_000 });
    await page3.locator(".menu-nav-btn").nth(1).click();
    await page3.waitForSelector(".menu-slot.filled", { timeout: 10_000 });
    await page3.locator(".menu-slot.filled").first().locator(".hf-btn--primary").click();
    await page3.waitForSelector(".sb-footer-menu", { timeout: 15_000 });
    await page3.waitForTimeout(300);
    if (await page3.locator(".modal-overlay").count() > 0) { await page3.keyboard.press("Escape"); await page3.waitForTimeout(200); }

    // --- 3a: pinned ItemTooltip closes on Escape ---
    // NOTE: `.first()` alone would grab the crafted variant item (it's the fixture's first slot,
    // see Phase 3 setup) — clicking THAT opens the Pouch, not a tooltip (ItemCell.tsx: onOpenPouch
    // takes priority over pin). Explicitly pick a cell WITHOUT the variant star for this check.
    await page3.locator('[data-guide-id="topbar.character"]').first().click();
    await page3.waitForTimeout(400);
    const invSlot = page3.locator(".cs-inv-grid .cs-inv-slot-wrap .item-cell").filter({ hasNot: page3.locator(".item-cell-inst-badge") }).first();
    await invSlot.click();
    await page3.waitForTimeout(250);
    const tooltipPresent = await page3.locator(".item-tooltip").count() > 0;
    if (tooltipPresent) {
      await page3.keyboard.press("Escape");
      await page3.waitForTimeout(150);
      const tooltipGone = await page3.locator(".item-tooltip").count() === 0;
      if (tooltipGone) ok(`Escape closed a pinned ItemTooltip`);
      else report("KRITISCH", `Escape did NOT close a pinned ItemTooltip`);
    } else {
      report("MITTEL", `Could not pin an ItemTooltip via inventory click — skipping tooltip Escape check`);
    }

    // --- 3b: Pouch modal (crafted duplicate variant) closes on Escape ---
    // ItemCell renders a `.item-cell-inst-badge` star exactly when `hasVariants` is true (see
    // ItemCell.tsx) — target that directly instead of blind-clicking every cell.
    // Safety net: close whatever 3a may have left open (pinned tooltip has its own click-outside
    // dismiss, but be defensive) before attempting to open the Pouch.
    if (await page3.locator(".item-tooltip, .pouch-modal, .portrait-gallery-modal").count() > 0) {
      await page3.keyboard.press("Escape");
      await page3.waitForTimeout(150);
    }
    const starBadgeCount = await page3.locator(".item-cell-inst-badge").count();
    console.log(`[t9-hk] .item-cell-inst-badge (variant star) count: ${starBadgeCount}`);
    let pouchOpened = false;
    if (starBadgeCount > 0) {
      await page3.locator(".item-cell-inst-badge").first().locator("xpath=ancestor::div[contains(@class,'item-cell')]").first().click();
      await page3.waitForTimeout(200);
      pouchOpened = await page3.locator(".pouch-modal").count() > 0;
    } else {
      // Fallback: blind-click every inventory cell (in case the badge selector above is stale).
      const candidateCells = page3.locator(".cs-inv-grid .cs-inv-slot-wrap .item-cell");
      const cellCount = await candidateCells.count();
      for (let i = 0; i < cellCount && !pouchOpened; i++) {
        await candidateCells.nth(i).click();
        await page3.waitForTimeout(150);
        if (await page3.locator(".pouch-modal").count() > 0) { pouchOpened = true; break; }
        if (await page3.locator(".item-tooltip").count() > 0) await page3.keyboard.press("Escape");
        await page3.waitForTimeout(80);
      }
    }
    if (pouchOpened) {
      ok(`Pouch modal (VariantPouchModal) opened via the crafted duplicate-variant item`);
      await page3.screenshot({ path: join(SHOTS_DIR, "20-pouch-modal-open.png"), fullPage: false });
      await page3.keyboard.press("Escape");
      await page3.waitForTimeout(200);
      const pouchGone = await page3.locator(".pouch-modal").count() === 0;
      if (pouchGone) ok(`Escape closed the Pouch modal`);
      else report("KRITISCH", `Escape did NOT close the Pouch modal`);
    } else {
      report("MITTEL", `Could not trigger the Pouch modal via the crafted duplicate-variant inventory item — skipping Pouch Escape check (fixture-crafting limitation, not necessarily a product bug)`);
    }

    // --- 3c: PortraitPicker modal closes on Escape ---
    const pickerBtn = page3.locator(".cs-portrait-settings-btn").first();
    if (await pickerBtn.count() > 0) {
      await pickerBtn.click();
      await page3.waitForTimeout(250);
      const pickerOpen = await page3.locator(".portrait-gallery-modal").count() > 0;
      if (pickerOpen) {
        await page3.keyboard.press("Escape");
        await page3.waitForTimeout(200);
        const pickerGone = await page3.locator(".portrait-gallery-modal").count() === 0;
        if (pickerGone) ok(`Escape closed the PortraitPicker modal`);
        else report("KRITISCH", `Escape did NOT close the PortraitPicker modal`);
      } else {
        report("MITTEL", `PortraitPicker modal did not open via .cs-portrait-settings-btn`);
      }
    }

    if (errs3.length) report("KRITISCH", `console pageerrors during Escape-chain phase: ${errs3.join(" | ")}`);
    await page3.close();

    // ═══════════════════════════════════════════════════════════════════
    // PHASE 4: 1366x768 layout check across key pages — no horizontal overflow, no clipped header
    // ═══════════════════════════════════════════════════════════════════
    const page4 = await browser.newPage({ viewport: { width: 1366, height: 768 } });
    const errs4 = [];
    page4.on("pageerror", (e) => errs4.push(e.message));
    await page4.goto(`${BASE_URL}/?fixture=endgame`, { waitUntil: "load" });
    await page4.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15_000 });
    await page4.waitForTimeout(4200);

    const pagesToCheck = [
      { guideId: "topbar.character", name: "character" },
      { guideId: "sidebar.combat", name: "combat" },
      { guideId: "topbar.achievements", name: "achievements" },
      { guideId: "topbar.shop", name: "shop" },
    ];
    for (const p of pagesToCheck) {
      await dismissAnyGuideIfPresent(page4, `1366x768 before ${p.name}`);
      const loc = page4.locator(`[data-guide-id="${p.guideId}"]`).first();
      if (await loc.count() === 0) { report("MITTEL", `1366x768: nav target [data-guide-id="${p.guideId}"] not found`); continue; }
      await loc.click();
      await page4.waitForTimeout(400);
      await dismissAnyGuideIfPresent(page4, `1366x768 after ${p.name} nav`);
      const hasHScroll = await page4.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
      const sidebarVisible = await page4.locator(".sidebar, .sb-root").first().isVisible().catch(() => false);
      if (!hasHScroll) ok(`1366x768 [${p.name}]: no horizontal overflow`);
      else report("MITTEL", `1366x768 [${p.name}]: horizontal overflow detected (scrollWidth > clientWidth)`);
      await page4.screenshot({ path: join(SHOTS_DIR, `30-1366x768-${p.name}.png`), fullPage: false });
    }
    if (errs4.length) report("KRITISCH", `console pageerrors during 1366x768 layout phase: ${errs4.join(" | ")}`);
    await page4.close();

    console.log(`\n[t9-hk] Screenshots in ${SHOTS_DIR}`);
    console.log(`\n[t9-hk] ==== SUMMARY (${findings.length} findings logged, see KRITISCH/MITTEL above) ====`);
  } finally {
    await browser.close();
    server.child.kill();
  }
}

main().catch((err) => {
  console.error("[t9-hk] fatal:", err);
  process.exitCode = 1;
});
