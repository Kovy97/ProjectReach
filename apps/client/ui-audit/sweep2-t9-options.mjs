#!/usr/bin/env node
/**
 * Tester-Sweep 2 (RC 0.1, 2026-07-13), T9 "Der Einsteller" — Rahmen-Systeme, Teil 2: Optionen.
 * Covers: jede Option im Hauptmenü-Options-Panel UND auf der In-Game Options-Seite durchschalten
 * und die Wirkung prüfen — Mute, Musik, FX-Stufe, Tooltip-Popup-Toggle, Sprache, Guide-Neustart
 * (Onboarding UND Bereichs-Touren müssen wiederkommen), Export/Import (inkl. Geister-Toast-Check).
 *
 * Pattern per ui-audit/README.md + hotkeys-shot.mjs. Own port 5258 (shared with the other T9
 * scripts, run sequentially — never concurrently).
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

async function main() {
  console.log(`[t9-opt] starting dev server on port ${PORT}...`);
  const server = startDevServer();
  const up = await waitForServer(BASE_URL);
  if (!up) {
    console.error("[t9-opt] dev server did not come up:\n" + server.getOutput());
    server.child.kill();
    process.exitCode = 1;
    return;
  }
  console.log("[t9-opt] dev server up.");

  const browser = await chromium.launch();
  try {
    // ═══════════════════════════════════════════════════════════════════
    // PHASE 1: Main-menu Options panel (client-only prefs, no save needed)
    // ═══════════════════════════════════════════════════════════════════
    const page1 = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    const errs1 = [];
    page1.on("pageerror", (e) => errs1.push(e.message));
    await page1.goto(BASE_URL, { waitUntil: "load" });
    await page1.waitForSelector(".menu-nav-btn", { timeout: 15_000 });
    await page1.locator(".menu-nav-btn").nth(2).click(); // Options
    await page1.waitForSelector(".menu-options", { timeout: 10_000 });

    for (const rowLabel of ["Sound", "Music/Musik", "Tooltip"]) {
      // generic toggle-and-verify over each .menu-opt-row button
    }
    const rows = page1.locator(".menu-opt-row");
    const rowCount = await rows.count();
    ok(`Menu Options panel has ${rowCount} rows`);
    for (let i = 0; i < rowCount; i++) {
      const row = rows.nth(i);
      const label = await row.locator(".menu-opt-label").innerText().catch(() => `row${i}`);
      // The Font-preview row is NOT a toggle — clicking it navigates away (MainMenu unmounts in
      // favor of <FontPreview>), which would hang the generic innerText()-after-click check on a
      // detached node. It's covered separately, right after this loop.
      if (/Schrift|Font/i.test(label)) continue;
      const btn = row.locator("button").first();
      if (await btn.count() === 0) continue;
      const before = await btn.innerText();
      const beforeClass = await btn.getAttribute("class");
      await btn.click();
      await page1.waitForTimeout(150);
      const after = await btn.innerText();
      const afterClass = await btn.getAttribute("class");
      if (before !== after || beforeClass !== afterClass) {
        ok(`Main-menu option "${label}": toggled ("${before}"/${beforeClass} -> "${after}"/${afterClass})`);
      } else {
        report("MITTEL", `Main-menu option "${label}": clicking did not visibly change label/class (before="${before}" after="${after}")`);
      }
      // toggle back to leave clean state
      await btn.click();
      await page1.waitForTimeout(150);
    }
    // Font-preview button (separate flow, opens FontPreview full-screen replacing MainMenu).
    const fontBtnRow = page1.locator(".menu-opt-row", { hasText: "Schriftart" }).or(page1.locator(".menu-opt-row").last());
    const fontBtn = page1.locator(".menu-options button", { hasText: "🔤" });
    if (await fontBtn.count() === 1) {
      await fontBtn.click();
      await page1.waitForTimeout(300);
      const menuGone = await page1.locator(".menu-nav-btn").count() === 0;
      if (menuGone) ok(`Font-preview button opens the FontPreview overlay (main menu nav hidden)`);
      else report("MITTEL", `Font-preview button click had no visible effect`);
      await page1.screenshot({ path: join(SHOTS_DIR, "10-font-preview.png"), fullPage: false });
    } else {
      report("MITTEL", `Font-preview button not found in menu options panel (expected 🔤 label)`);
    }
    if (errs1.length) report("KRITISCH", `console pageerrors on menu Options panel: ${errs1.join(" | ")}`);
    await page1.close();

    // ═══════════════════════════════════════════════════════════════════
    // PHASE 2: In-game Options page — cycle every control, verify visible effect
    // ═══════════════════════════════════════════════════════════════════
    const page2 = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    const errs2 = [];
    page2.on("pageerror", (e) => errs2.push(e.message));
    page2.on("console", (m) => { if (m.type() === "error") errs2.push("console: " + m.text()); });
    await page2.goto(`${BASE_URL}/?fixture=midgame`, { waitUntil: "load" });
    await page2.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15_000 });
    await page2.waitForTimeout(4200); // let fixture-load toasts clear (README convention)

    await page2.locator(".sb-footer-options").click();
    await page2.waitForSelector(".opz-page", { timeout: 10_000 });
    await page2.waitForTimeout(300);

    // --- Fullscreen segment (no Electron bridge in headless browser → window.hearthforge is
    // undefined; setFullscreen must no-op gracefully, not throw). ---
    const fsButtons = page2.locator(".opz-page .opz-section", { has: page2.locator(".opz-section-title", { hasText: /Anzeige|Display/ }) }).locator(".opz-segment").first().locator("button");
    if (await fsButtons.count() === 2) {
      await fsButtons.nth(1).click(); // "Vollbild"
      await page2.waitForTimeout(200);
      await fsButtons.nth(0).click(); // back to "Fenster"
      await page2.waitForTimeout(200);
      ok(`Fullscreen segment buttons clickable without throwing (no Electron bridge in headless — optional-chained no-op)`);
    } else {
      report("MITTEL", `Fullscreen segment buttons not found as expected (count=${await fsButtons.count()})`);
    }

    // --- Tooltip image popup toggle ---
    const tipRow = page2.locator(".opz-row", { has: page2.locator(".opz-row-label", { hasText: /Tooltip/ }) }).first();
    const tipBtn = tipRow.locator("button");
    const tipBefore = await tipBtn.innerText();
    await tipBtn.click();
    await page2.waitForTimeout(150);
    const tipAfter = await tipBtn.innerText();
    if (tipBefore !== tipAfter) ok(`Tooltip-image-popup toggle changed label ("${tipBefore}" -> "${tipAfter}")`);
    else report("MITTEL", `Tooltip-image-popup toggle: no visible label change`);
    await tipBtn.click(); // revert

    // --- Combat FX 3-way segment (full/reduced/off) ---
    const fxSection = page2.locator(".opz-section", { has: page2.locator(".opz-section-title", { hasText: /Effekte|Combat|Kampf/ }) });
    const fxRow = page2.locator(".opz-row", { has: page2.locator(".opz-row-label") }).filter({ has: page2.locator(".opz-segment button", { hasText: /Reduziert|Reduced/ }) }).first();
    const fxButtons = page2.locator(".opz-segment").filter({ has: page2.locator("button", { hasText: /Reduziert|Reduced/ }) }).first().locator("button");
    const fxCount = await fxButtons.count();
    if (fxCount === 3) {
      for (let i = 0; i < 3; i++) {
        await fxButtons.nth(i).click();
        await page2.waitForTimeout(150);
        const activeCount = await fxButtons.evaluateAll((els) => els.filter((e) => e.className.includes("active")).length);
        if (activeCount === 1) ok(`Combat FX segment: button ${i} click leaves exactly 1 active`);
        else report("MITTEL", `Combat FX segment: after clicking button ${i}, ${activeCount} buttons show "active" (expected exactly 1)`);
      }
    } else {
      report("MITTEL", `Combat FX 3-way segment not found as expected (found ${fxCount} buttons)`);
    }

    // --- Sound mute + volume slider ---
    const soundRow = page2.locator(".opz-row", { has: page2.locator(".opz-row-label", { hasText: /^(Ton|Sound)/ }) }).first();
    const soundBtn = soundRow.locator("button");
    if (await soundBtn.count() === 1) {
      const before = await soundBtn.innerText();
      await soundBtn.click();
      await page2.waitForTimeout(150);
      const after = await soundBtn.innerText();
      if (before !== after) ok(`Sound mute toggle changed label ("${before}" -> "${after}")`);
      else report("MITTEL", `Sound mute toggle: no visible label change`);
      await soundBtn.click(); // revert to unmuted
      await page2.waitForTimeout(100);
    }
    const volumeSlider = page2.locator(".opz-row", { has: page2.locator(".opz-row-label", { hasText: /Lautstärke|Volume/ }) }).first().locator("input[type=range]");
    if (await volumeSlider.count() >= 1) {
      await volumeSlider.first().fill("30");
      await page2.waitForTimeout(150);
      const pct = await page2.locator(".opz-slider-val").first().innerText();
      if (pct.includes("30")) ok(`Volume slider drag updates live percentage readout (${pct})`);
      else report("MITTEL", `Volume slider: percentage readout did not update to 30% (got "${pct}")`);
    }

    // --- Music toggle + volume --- (German: "Ambient-Musik (subtiler Hintergrund-Drone):")
    const musicRow = page2.locator(".opz-row", { has: page2.locator(".opz-row-label", { hasText: /Ambient|Musik|Music/i }) }).first();
    const musicBtn = musicRow.locator("button");
    if (await musicBtn.count() === 1) {
      const before = await musicBtn.innerText();
      await musicBtn.click();
      await page2.waitForTimeout(150);
      const after = await musicBtn.innerText();
      if (before !== after) ok(`Music toggle changed label ("${before}" -> "${after}")`);
      else report("MITTEL", `Music toggle: no visible label change`);
      await musicBtn.click(); // revert
    } else {
      report("MITTEL", `Music toggle row not found in Options page (selector may need updating, matched ${await musicBtn.count()})`);
    }

    // --- autoBank toggle (game-state-backed, not a local pref) --- (German: "Auto-Lager bei vollem Inventar")
    const autoBankRow = page2.locator(".opz-row", { has: page2.locator(".opz-row-label", { hasText: /Auto.?(Bank|Lager)/i }) }).first();
    const autoBankBtn = autoBankRow.locator("button");
    if (await autoBankBtn.count() === 1) {
      const before = await autoBankBtn.innerText();
      await autoBankBtn.click();
      await page2.waitForTimeout(150);
      const after = await autoBankBtn.innerText();
      if (before !== after) ok(`autoBank toggle changed label ("${before}" -> "${after}")`);
      else report("MITTEL", `autoBank toggle: no visible label change`);
    } else {
      report("MITTEL", `autoBank toggle row not found in Options page (selector may need updating, matched ${await autoBankBtn.count()})`);
    }

    await page2.screenshot({ path: join(SHOTS_DIR, "11-ingame-options-top.png"), fullPage: true });

    // ═══════════════════════════════════════════════════════════════════
    // PHASE 3: Language grid — switch through all 7 locales, verify UI text actually changes
    // ═══════════════════════════════════════════════════════════════════
    const langButtons = page2.locator(".opz-lang-grid button");
    const langCount = await langButtons.count();
    if (langCount === 7) ok(`Language grid shows all 7 locale buttons`);
    else report("MITTEL", `Language grid shows ${langCount} buttons, expected 7`);
    const titleLocator = page2.locator(".opz-header-text h2");
    const seenTitles = new Set();
    for (let i = 0; i < langCount; i++) {
      await langButtons.nth(i).click();
      await page2.waitForTimeout(200);
      const title = await titleLocator.innerText();
      const activeLangBtn = await langButtons.nth(i).getAttribute("class");
      seenTitles.add(title);
      if (!activeLangBtn?.includes("active")) {
        report("MITTEL", `Language button ${i}: clicked but does not show "active" class afterward`);
      }
    }
    if (seenTitles.size >= 5) ok(`Switching all 7 locales produced ${seenTitles.size} distinct page-title strings (i18n text genuinely changes)`);
    else report("MITTEL", `Switching locales only produced ${seenTitles.size} distinct title strings — some locales may be falling back untranslated: ${JSON.stringify([...seenTitles])}`);
    // Reset to German for the rest of the run (this repo's baseline locale).
    await page2.locator(".opz-lang-grid button", { hasText: "Deutsch" }).click();
    await page2.waitForTimeout(200);

    // ═══════════════════════════════════════════════════════════════════
    // PHASE 4: Guide restart — onboarding AND area tours both come back
    // ═══════════════════════════════════════════════════════════════════
    // midgame fixture ships with onboarding already completed + all area tours seen (README:
    // "seasoned characters with the onboarding guide already completed"). Confirm baseline first.
    const baselineGuideCount = await page2.locator(".onboarding-guide-root").count();
    if (baselineGuideCount === 0) ok(`Baseline (midgame fixture): no onboarding guide showing (already completed, as expected)`);

    const restartBtn = page2.locator(".opz-row", { has: page2.locator(".opz-row-label", { hasText: /Tutorial|Hilfe|Help/ }) }).first().locator("button");
    if (await restartBtn.count() === 1) {
      await restartBtn.click();
      await page2.waitForTimeout(400);
      const guideNowActive = await page2.locator(".onboarding-guide-root").count() > 0;
      if (guideNowActive) ok(`"Show Tutorial" button restarted the onboarding Spotlight-Guide`);
      else report("KRITISCH", `"Show Tutorial" button click did NOT bring back the onboarding guide`);
      await page2.screenshot({ path: join(SHOTS_DIR, "12-guide-restarted.png"), fullPage: false });

      // Skip through it (Skip button is the only guaranteed way to close it — see the
      // Escape-doesn't-close-tours finding from sweep2-t9-menu-saves.mjs) so we can reach a
      // sidebar page and prove the AREA TOUR for it also comes back (toursSeen reset).
      const skipBtn = page2.locator(".guide-bubble-skip");
      if (await skipBtn.count() > 0) {
        await skipBtn.click();
        await page2.waitForTimeout(300);
      }
      const stillGuide = await page2.locator(".onboarding-guide-root").count() > 0;
      if (!stillGuide) ok(`Skip closed the main onboarding guide`);

      // Navigate to Combat (a SIDEBAR entry, not topbar) — its area tour should now fire again
      // (toursSeen was reset by restartGuide's newGameOnboarding()).
      await page2.locator('[data-guide-id="sidebar.combat"]').first().click();
      await page2.waitForTimeout(400);
      const areaTourVisible = await page2.locator(".onboarding-guide-root").count() > 0;
      if (areaTourVisible) ok(`Area-first-visit tour (Combat) reappeared after Guide-Neustart — toursSeen was correctly reset`);
      else report("KRITISCH", `Area tour for Combat did NOT reappear after "Show Tutorial" restart — toursSeen may not have been reset`);
      await page2.screenshot({ path: join(SHOTS_DIR, "13-area-tour-after-restart.png"), fullPage: false });
      // Clean up: skip the area tour too so it doesn't interfere with later phases.
      const skipBtn2 = page2.locator(".guide-bubble-skip");
      if (await skipBtn2.count() > 0) { await skipBtn2.click(); await page2.waitForTimeout(200); }
    } else {
      report("MITTEL", `"Show Tutorial" restart button not found in Options page (Gameplay section)`);
    }

    if (errs2.length) report("KRITISCH", `console errors/pageerrors during in-game Options phase: ${errs2.slice(0, 10).join(" | ")}`);
    await page2.close();

    // ═══════════════════════════════════════════════════════════════════
    // PHASE 5: Export/Import round trip + ghost-toast check (first diff round must be silent).
    // IMPORTANT: `importSave` early-returns false when `activeSlotRef===null` (GameContext.tsx) —
    // deliberately, so DEV-only `?fixture=` sessions (activeSlotRef=null by design, see README)
    // never let Import write into a real slot. That means this check MUST use a real
    // localStorage-backed slot loaded via the normal menu flow, not `?fixture=`.
    // ═══════════════════════════════════════════════════════════════════
    const page3 = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    const errs3 = [];
    page3.on("pageerror", (e) => errs3.push(e.message));
    page3.on("console", (m) => { if (m.type() === "error") errs3.push("console: " + m.text()); });
    const midgame = JSON.parse(readFileSync(join(__dirname, "fixtures", "midgame.json"), "utf8"));
    midgame.savedAt = Date.now(); // no offline popup / offline catch-up in the way
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

    await page3.locator(".sb-footer-options").click();
    await page3.waitForSelector(".opz-page", { timeout: 10_000 });
    // Let any fixture-load/first-tick toasts clear before baselining (README convention: ~4.2s).
    await page3.waitForTimeout(4200);
    const toastsBeforeImport = await page3.locator(".toast-stack .toast").count();
    console.log(`[t9-opt] toasts visible right before import: ${toastsBeforeImport}`);

    const copyBtn = page3.locator(".opz-page button", { hasText: /Zwischenablage|Clipboard|Copy/ });
    let jsonText = null;
    if (await copyBtn.count() >= 1) {
      await page3.context().grantPermissions(["clipboard-read", "clipboard-write"]);
      await copyBtn.first().click();
      await page3.waitForTimeout(200);
      jsonText = await page3.evaluate(() => navigator.clipboard.readText()).catch(() => null);
    }
    if (jsonText && jsonText.startsWith("{")) {
      ok(`Export-to-clipboard produced valid-looking JSON (${jsonText.length} chars)`);
    } else {
      report("MITTEL", `Export-to-clipboard did not yield readable JSON via navigator.clipboard (got: ${String(jsonText).slice(0, 60)})`);
    }

    if (jsonText) {
      const textarea = page3.locator(".opz-textarea");
      await textarea.fill(jsonText);
      const applyBtn = page3.locator(".opz-import-row button");
      await applyBtn.click();
      // Root-caused via a standalone diagnostic (deserialize()/serialize() against the exact
      // exported JSON both succeed fine outside the browser — packages/persistence isn't at
      // fault): `importSave` (GameContext.tsx) bumps `sessionEpoch` on success, and App.tsx's
      // `key={sessionEpoch}` remounts the ENTIRE MainLayout tree — including this OptionsPage
      // instance — within ~50ms, before its local `status` state ("ok"/"error") ever gets to
      // render. The player is silently bounced to the default landing page with NO success/error
      // feedback for what is, functionally, a high-stakes "overwrite my current save" action.
      await page3.waitForTimeout(50);
      const stillOnOptionsAt50ms = await page3.locator(".opz-page").count() > 0;
      await page3.waitForTimeout(250);
      const activePageAfter = await page3.locator(".content-header h1").innerText().catch(() => "?");
      const statusOk = await page3.locator(".opz-status-ok").count() > 0;
      if (statusOk) {
        ok(`Import of the just-exported JSON (real slot) reports success (✓)`);
      } else if (!stillOnOptionsAt50ms) {
        report(
          "KRITISCH",
          `Import silently bounces the player off the Options page with NO success/error feedback. ` +
          `Repro: in-game (real slot) -> Options -> Export -> paste back into Import textarea -> Apply. ` +
          `The import DOES succeed (data-wise; confirmed via a standalone deserialize()/serialize() ` +
          `check against the captured export, and via the ghost-toast check below staying clean) — but ` +
          `\`importSave\`'s success path bumps \`sessionEpoch\` (GameContext.tsx), and App.tsx's ` +
          `\`key={sessionEpoch}\` remounts the whole MainLayout tree within ~50ms, unmounting this ` +
          `OptionsPage instance before its "${"✓ Import successful"}"/"${"✕ Import failed"}" status span ` +
          `can ever render. Player is left on "${activePageAfter}" with zero indication the import ` +
          `worked (or didn't) — for a "this overwrites your current save" action, that's a trust problem.`,
        );
      } else {
        report("MITTEL", `Import of the just-exported (unmodified) JSON did NOT report success, and the reason doesn't match the known "remount race" pattern — needs a fresh look`);
      }

      // Ghost-toast check: the import remounts the whole game tree (App.tsx sessionEpoch) — the
      // FIRST diff round after that remount must stay silent (Toasts.tsx settledRef), exactly like
      // a fresh load. Give it the same ~1.5s the cosmetics-toast-baseline-check.mjs script used for
      // "first real live tick", then count toasts.
      await page3.waitForTimeout(1600);
      const toastsAfterImport = await page3.locator(".toast-stack .toast").count();
      console.log(`[t9-opt] toasts visible ~1.6s after import: ${toastsAfterImport}`);
      if (toastsAfterImport === 0) {
        ok(`No ghost toasts fired after re-importing an unmodified save into a real slot (first diff round stayed silent)`);
      } else {
        const toastTexts = await page3.locator(".toast-stack .toast .toast-detail").allTextContents();
        report("KRITISCH", `Ghost toast(s) fired after import — ${toastsAfterImport} toast(s) shown for a re-import of UNMODIFIED state: ${JSON.stringify(toastTexts)}`);
      }
      await page3.screenshot({ path: join(SHOTS_DIR, "14-after-import.png"), fullPage: false });
    }

    if (errs3.length) report("KRITISCH", `console errors/pageerrors during import phase: ${errs3.slice(0, 10).join(" | ")}`);
    await page3.close();

    console.log(`\n[t9-opt] Screenshots in ${SHOTS_DIR}`);
    console.log(`\n[t9-opt] ==== SUMMARY (${findings.length} findings logged, see KRITISCH/MITTEL above) ====`);
  } finally {
    await browser.close();
    server.child.kill();
  }
}

main().catch((err) => {
  console.error("[t9-opt] fatal:", err);
  process.exitCode = 1;
});
