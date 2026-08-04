#!/usr/bin/env node
/**
 * Tester-Sweep 2 (RC 0.1, 2026-07-13), T9 "Der Einsteller" — Rahmen-Systeme.
 * Covers: Hauptmenü (neues Panorama-BG, 1920x1080 + 1366x768, kein Letterbox), Nav/Panels,
 * Sprachleiste, Spielstand-Karten (Laden/Überschreiben/Löschen mit Bestätigung), Slot-Badges,
 * Save-Slot-Trennung, Custom-Portrait-Upload-Persistenz.
 *
 * Pattern per ui-audit/README.md + hotkeys-shot.mjs: standalone vite.tour.config.mjs + Playwright,
 * throwaway script, own port 5258. Web-build localStorage fallback (saves.ts) used to seed slots.
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
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

/** Loading a slot with nonzero elapsed offline time shows the OfflinePopup (`.modal-overlay`,
 *  registered as "modal" priority in escStack.ts) — dismiss it via Escape so it doesn't block
 *  subsequent clicks. Doubles as a live Escape-chain check for that modal. */
async function dismissOfflinePopupIfPresent(page, label) {
  await page.waitForTimeout(200);
  const present = await page.locator(".modal-overlay").count() > 0;
  if (!present) return;
  console.log(`[t9] ${label}: OfflinePopup (.modal-overlay) present after load — dismissing via Escape`);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
  const stillPresent = await page.locator(".modal-overlay").count() > 0;
  if (!stillPresent) ok(`${label}: Escape closed the OfflinePopup modal`);
  else report("MITTEL", `${label}: Escape did NOT close the OfflinePopup modal (.modal-overlay still present)`);
}

const findings = [];
function report(sev, msg) {
  findings.push(`[${sev}] ${msg}`);
  console.log(`[${sev}] ${msg}`);
}
function ok(msg) {
  console.log(`[OK] ${msg}`);
}

const midgame = JSON.parse(readFileSync(join(__dirname, "fixtures", "midgame.json"), "utf8"));
const endgame = JSON.parse(readFileSync(join(__dirname, "fixtures", "endgame.json"), "utf8"));

function makeSlot(base, name, savedAtOffsetMs, activePlayMs) {
  const obj = JSON.parse(JSON.stringify(base));
  obj.state.character.name = name;
  const now = Date.now() - savedAtOffsetMs;
  obj.savedAt = now;
  // The menu card reads `slot.summary.*`, NOT `state.character.*` — this is a separate snapshot
  // written at save-time. Editing only `state` (as an earlier draft of this script did) leaves the
  // menu showing the ORIGINAL fixture name/date for every slot (silent test-script bug, not a
  // product bug) — caught it via a `.hf-btn--danger` locator timeout on "Slot Drei" (0 matches).
  obj.summary = { ...obj.summary, name, savedAt: now, activePlayMs: activePlayMs ?? obj.summary?.activePlayMs ?? 0 };
  return obj;
}

async function main() {
  console.log(`[t9] starting dev server on port ${PORT}...`);
  const server = startDevServer();
  const up = await waitForServer(BASE_URL);
  if (!up) {
    console.error("[t9] dev server did not come up:\n" + server.getOutput());
    server.child.kill();
    process.exitCode = 1;
    return;
  }
  console.log("[t9] dev server up.");

  const browser = await chromium.launch();
  try {
    // ═══════════════════════════════════════════════════════════════════
    // PHASE 1: Main Menu visuals — fresh (no saves), two resolutions
    // ═══════════════════════════════════════════════════════════════════
    for (const [label, viewport] of [
      ["1920x1080", { width: 1920, height: 1080 }],
      ["1366x768", { width: 1366, height: 768 }],
    ]) {
      const page = await browser.newPage({ viewport });
      const pageErrors = [];
      page.on("pageerror", (e) => pageErrors.push(e.message));
      await page.goto(BASE_URL, { waitUntil: "load" });
      await page.waitForSelector(".menu-nav-btn", { timeout: 15_000 });
      await page.waitForTimeout(400);

      // Letterbox check: .menu-bg should cover the full viewport with no visible gap.
      const bgBox = await page.locator(".menu-bg").boundingBox();
      const bgCoversViewport =
        bgBox && Math.abs(bgBox.x) < 1 && Math.abs(bgBox.y) < 1 &&
        Math.abs(bgBox.width - viewport.width) < 2 && Math.abs(bgBox.height - viewport.height) < 2;
      if (bgCoversViewport) ok(`[${label}] .menu-bg fills viewport (no letterbox): ${JSON.stringify(bgBox)}`);
      else report("KRITISCH", `[${label}] .menu-bg does NOT fill viewport — possible letterbox/gap. box=${JSON.stringify(bgBox)} viewport=${JSON.stringify(viewport)}`);

      const bgSize = await page.locator(".menu-bg").evaluate((el) => getComputedStyle(el).backgroundSize);
      if (bgSize === "cover") ok(`[${label}] background-size: cover confirmed`);
      else report("MITTEL", `[${label}] .menu-bg background-size is "${bgSize}", expected "cover"`);

      // Logo readable / not broken image.
      const logoOk = await page.locator(".menu-logo").evaluate((el) => el instanceof HTMLImageElement && el.naturalWidth > 0);
      if (logoOk) ok(`[${label}] menu logo image loaded (naturalWidth>0)`);
      else report("KRITISCH", `[${label}] menu logo image failed to load (naturalWidth==0)`);

      // Nav buttons present + functional (click each panel, verify it opens).
      const navCount = await page.locator(".menu-nav-btn").count();
      if (navCount >= 4) ok(`[${label}] ${navCount} nav buttons present`);
      else report("KRITISCH", `[${label}] only ${navCount} nav buttons found, expected >=4 (New/Load/Options/Quit)`);

      await page.locator(".menu-nav-btn").nth(0).click();
      await page.waitForTimeout(200);
      const newPanelOpen = await page.locator(".menu-panel").count() > 0;
      if (newPanelOpen) ok(`[${label}] "New Game" nav opens right panel`);
      else report("KRITISCH", `[${label}] "New Game" nav click did not open a panel`);

      // Language bar.
      const langCount = await page.locator(".menu-lang .lang-btn").count();
      if (langCount === 7) ok(`[${label}] language bar shows all 7 locales`);
      else report("MITTEL", `[${label}] language bar shows ${langCount} locale buttons, expected 7`);

      // Horizontal overflow check (no letterbox AND no overflow-driven scrollbar).
      const hasHScroll = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
      if (!hasHScroll) ok(`[${label}] no horizontal overflow on menu`);
      else report("MITTEL", `[${label}] horizontal overflow detected on main menu (scrollWidth > clientWidth)`);

      await page.screenshot({ path: join(SHOTS_DIR, `01-mainmenu-${label}.png`), fullPage: false });

      if (pageErrors.length) report("KRITISCH", `[${label}] console pageerrors on main menu: ${pageErrors.join(" | ")}`);
      await page.close();
    }

    // ═══════════════════════════════════════════════════════════════════
    // PHASE 2: Seed 5 save slots, verify Load-panel cards + badges + confirm dialogs
    // ═══════════════════════════════════════════════════════════════════
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    const pageErrors2 = [];
    page.on("pageerror", (e) => pageErrors2.push(e.message));

    const slot0 = makeSlot(midgame, "Mira Ashfall", 5 * 60_000, 42 * 60_000);
    const slot1 = makeSlot(endgame, "Korveth Grimhollow", 2 * 60 * 60_000, 5 * 3_600_000 + 17 * 60_000);
    const slot2 = makeSlot(midgame, "Slot Drei", 24 * 60 * 60_000, 90 * 60_000);
    const slot3 = makeSlot(endgame, "Slot Vier", 3 * 24 * 60 * 60_000, 12 * 3_600_000);
    const slot4 = makeSlot(midgame, "Slot Fünf", 10 * 60_000, 3 * 60_000);

    await page.addInitScript(
      ([s0, s1, s2, s3, s4]) => {
        localStorage.setItem("hearthforge:save:0", s0);
        localStorage.setItem("hearthforge:save:1", s1);
        localStorage.setItem("hearthforge:save:2", s2);
        localStorage.setItem("hearthforge:save:3", s3);
        localStorage.setItem("hearthforge:save:4", s4);
      },
      [JSON.stringify(slot0), JSON.stringify(slot1), JSON.stringify(slot2), JSON.stringify(slot3), JSON.stringify(slot4)],
    );

    await page.goto(BASE_URL, { waitUntil: "load" });
    await page.waitForSelector(".menu-nav-btn", { timeout: 15_000 });
    await page.locator(".menu-nav-btn").nth(1).click(); // "Load Game"
    await page.waitForSelector(".menu-slot.filled", { timeout: 10_000 });
    await page.waitForTimeout(300);

    const filledCount = await page.locator(".menu-slot.filled").count();
    if (filledCount === 5) ok(`Load panel shows all 5 filled slots`);
    else report("KRITISCH", `Load panel shows ${filledCount} filled slots, expected 5`);

    // Slot index badges 1-5, in order.
    const badges = await page.locator(".menu-slot.filled .menu-slot-index").allTextContents();
    const badgesOk = badges.every((b, i) => Number(b) >= 1 && Number(b) <= 5);
    if (badgesOk && new Set(badges).size === badges.length) ok(`Slot badges present and unique: [${badges.join(",")}]`);
    else report("MITTEL", `Slot badges look wrong: [${badges.join(",")}]`);

    // Playtime / last-played plausibility.
    const metas = await page.locator(".menu-slot.filled .menu-slot-info .menu-slot-meta").allTextContents();
    console.log(`[t9] playtime strings: ${JSON.stringify(metas)}`);
    // Expect distinct, non-zero playtimes matching the activePlayMs given to each seeded slot
    // (order matches slot ids 0..4, since deletion happens later): 42m, 5h17m, 90m(=1h30m), 12h0m, 3m.
    const expectedSubstrings = ["42m", "5h 17m", "1h 30m", "12h 0m", "3m"];
    const metasOk = expectedSubstrings.every((exp, i) => metas[i]?.includes(exp));
    if (metasOk) ok(`Playtime strings match expected values per slot: ${JSON.stringify(metas)}`);
    else report("MITTEL", `Playtime strings don't match expected [${expectedSubstrings.join(", ")}]: got ${JSON.stringify(metas)}`);

    const subs = await page.locator(".menu-slot.filled .menu-slot-sub").allTextContents();
    console.log(`[t9] "last played" strings: ${JSON.stringify(subs)}`);
    const datesDistinct = new Set(subs).size === subs.length;
    if (datesDistinct) ok(`"Last played" dates are distinct per slot (reflect each slot's own savedAt)`);
    else report("MITTEL", `"Last played" dates are NOT distinct per slot — possible summary.savedAt bug: ${JSON.stringify(subs)}`);

    await page.screenshot({ path: join(SHOTS_DIR, "02-load-panel-5slots.png"), fullPage: false });

    // Delete confirmation: click delete on slot index 2 (Slot Drei), dismiss dialog first (Cancel),
    // verify slot NOT removed, then accept and verify it IS removed.
    page.once("dialog", (d) => { console.log(`[t9] delete-dialog (dismiss): "${d.message()}"`); void d.dismiss(); });
    await page.locator(".menu-slot.filled", { hasText: "Slot Drei" }).locator(".hf-btn--danger").click();
    await page.waitForTimeout(300);
    let stillThere = await page.locator(".menu-slot.filled", { hasText: "Slot Drei" }).count();
    if (stillThere === 1) ok(`Delete confirm dialog: Cancel/Dismiss correctly KEPT the slot`);
    else report("KRITISCH", `Delete confirm: dismissing the dialog still deleted the slot!`);

    page.once("dialog", (d) => { console.log(`[t9] delete-dialog (accept): "${d.message()}"`); void d.accept(); });
    await page.locator(".menu-slot.filled", { hasText: "Slot Drei" }).locator(".hf-btn--danger").click();
    await page.waitForTimeout(300);
    stillThere = await page.locator(".menu-slot.filled", { hasText: "Slot Drei" }).count();
    if (stillThere === 0) ok(`Delete confirm dialog: Accept correctly REMOVED the slot`);
    else report("KRITISCH", `Delete confirm: accepting the dialog did NOT delete the slot`);

    const afterDeleteCount = await page.locator(".menu-slot.filled").count();
    if (afterDeleteCount === 4) ok(`4 slots remain after delete`);
    else report("MITTEL", `Expected 4 remaining slots after delete, got ${afterDeleteCount}`);

    // Overwrite confirmation on "New Game" panel: switch to New-panel, click overwrite on a filled slot.
    await page.locator(".menu-nav-btn").nth(0).click(); // "New Game" panel
    await page.waitForTimeout(200);
    page.once("dialog", (d) => { console.log(`[t9] overwrite-dialog (dismiss): "${d.message()}"`); void d.dismiss(); });
    const overwriteBtn = page.locator(".menu-slot.filled", { hasText: "Mira Ashfall" }).locator(".hf-btn--danger");
    if (await overwriteBtn.count() === 1) {
      await overwriteBtn.click();
      await page.waitForTimeout(300);
      const stillOnMenu = await page.locator(".menu-nav-btn").count() > 0;
      if (stillOnMenu) ok(`Overwrite confirm dialog: Dismiss correctly did NOT start a new game`);
      else report("KRITISCH", `Overwrite confirm: dismissing still navigated away from the menu!`);
    } else {
      report("MITTEL", `Could not find overwrite button on filled slot in "New" panel — layout may have changed`);
    }

    if (pageErrors2.length) report("KRITISCH", `console pageerrors during save-slot phase: ${pageErrors2.join(" | ")}`);
    await page.close();

    // ═══════════════════════════════════════════════════════════════════
    // PHASE 3: Slot switch separates state cleanly (Load slot0 vs slot1, compare gold/name)
    // ═══════════════════════════════════════════════════════════════════
    const page3 = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    await page3.addInitScript(
      ([s0, s1]) => {
        localStorage.setItem("hearthforge:save:0", s0);
        localStorage.setItem("hearthforge:save:1", s1);
      },
      [JSON.stringify(slot0), JSON.stringify(slot1)],
    );
    await page3.goto(BASE_URL, { waitUntil: "load" });
    await page3.waitForSelector(".menu-nav-btn", { timeout: 15_000 });
    await page3.locator(".menu-nav-btn").nth(1).click();
    await page3.waitForSelector(".menu-slot.filled", { timeout: 10_000 });
    await page3.locator(".menu-slot.filled", { hasText: "Mira Ashfall" }).locator(".hf-btn--primary").click();
    await page3.waitForSelector(".sb-footer-menu", { timeout: 15_000 });
    await dismissOfflinePopupIfPresent(page3, "slot0 load");
    await page3.waitForTimeout(500);
    const nameA = await page3.locator(".hdr-char-name, .content-header-row").first().innerText().catch(() => "");
    console.log(`[t9] loaded slot0 header snippet: ${JSON.stringify(nameA.slice(0, 120))}`);

    await page3.locator(".sb-footer-menu").click();
    await page3.waitForSelector(".menu-nav-btn", { timeout: 15_000 });
    await page3.waitForTimeout(300);
    await page3.locator(".menu-nav-btn").nth(1).click();
    await page3.waitForSelector(".menu-slot.filled", { timeout: 10_000 });
    await page3.locator(".menu-slot.filled", { hasText: "Korveth Grimhollow" }).locator(".hf-btn--primary").click();
    await page3.waitForSelector(".sb-footer-menu", { timeout: 15_000 });
    await dismissOfflinePopupIfPresent(page3, "slot1 load");
    await page3.waitForTimeout(500);
    const nameB = await page3.locator(".hdr-char-name, .content-header-row").first().innerText().catch(() => "");
    console.log(`[t9] loaded slot1 header snippet: ${JSON.stringify(nameB.slice(0, 120))}`);

    if (nameA !== nameB && nameA.length > 0 && nameB.length > 0) ok(`Slot switch shows distinct header content between slot0/slot1 (state not bled over)`);
    else report("KRITISCH", `Slot switch: header content identical/empty between slot0 and slot1 — possible state bleed. A="${nameA}" B="${nameB}"`);

    await page3.screenshot({ path: join(SHOTS_DIR, "03-slot-switch-korveth.png"), fullPage: false });
    await page3.close();

    // ═══════════════════════════════════════════════════════════════════
    // PHASE 4: Custom portrait upload (CharacterPage) survives save/load.
    // NOTE: `?fixture=` loads have `activeSlotRef=null` (README "Gotchas") — Save is a no-op there,
    // so that path can't prove real persistence. Uses a REAL localStorage slot + the actual
    // Load-Game menu flow instead, then a hard page reload to simulate an app restart.
    // ═══════════════════════════════════════════════════════════════════
    const page4 = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    const pageErrors4 = [];
    page4.on("pageerror", (e) => pageErrors4.push(e.message));
    const portraitSlot = makeSlot(midgame, "Portrait Test", 0, 0);
    // Deliberately NOT addInitScript here: addInitScript re-fires on EVERY subsequent navigation
    // on this page, including the "simulate app restart" reload below — that would silently
    // re-seed the pristine fixture over the real save right before the persistence check, masking
    // a real bug behind a false positive. Seed once via evaluate() after the first navigation
    // instead, which only runs once.
    await page4.goto(BASE_URL, { waitUntil: "load" });
    await page4.evaluate((s) => localStorage.setItem("hearthforge:save:0", s), JSON.stringify(portraitSlot));
    await page4.goto(BASE_URL, { waitUntil: "load" });
    await page4.waitForSelector(".menu-nav-btn", { timeout: 15_000 });
    await page4.locator(".menu-nav-btn").nth(1).click();
    await page4.waitForSelector(".menu-slot.filled", { timeout: 10_000 });
    await page4.locator(".menu-slot.filled").first().locator(".hf-btn--primary").click();
    await page4.waitForSelector(".sb-footer-menu", { timeout: 15_000 });
    await dismissOfflinePopupIfPresent(page4, "portrait-test load");
    await page4.waitForTimeout(400);

    await page4.locator('[data-guide-id="topbar.character"]').first().click();
    await page4.waitForTimeout(400);

    // 1x1 red pixel PNG as a throwaway upload payload.
    const tinyPngBase64 =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
    const uploadInput = page4.locator(".cs-portrait-wrap input[type=file]");
    if (await uploadInput.count() === 1) {
      await uploadInput.setInputFiles({ name: "test-portrait.png", mimeType: "image/png", buffer: Buffer.from(tinyPngBase64, "base64") });
      await page4.waitForTimeout(600);
      const portraitSrcAfterUpload = await page4.locator(".cs-portrait-img").getAttribute("src");
      const isDataUrl = !!portraitSrcAfterUpload && portraitSrcAfterUpload.startsWith("data:image/webp");
      if (isDataUrl) ok(`Custom portrait upload produced a data:image/webp src on CharacterPage`);
      else report("KRITISCH", `Custom portrait upload did NOT produce expected data:image/webp src (got: ${String(portraitSrcAfterUpload).slice(0, 60)})`);
      await page4.screenshot({ path: join(SHOTS_DIR, "04-portrait-uploaded.png"), fullPage: false });

      // Save via footer (real slot this time), verify localStorage actually contains the new
      // portrait data URL, THEN hard-reload + reload the same slot fresh to prove round-trip.
      await page4.locator(".sb-footer-save").click({ timeout: 8000 }).catch(() => {});
      await page4.waitForTimeout(500);
      const savedPortrait = await page4.evaluate(() => {
        try {
          const raw = localStorage.getItem("hearthforge:save:0");
          return raw ? JSON.parse(raw).state.character.portrait : null;
        } catch { return "PARSE_ERROR"; }
      });
      if (typeof savedPortrait === "string" && savedPortrait.startsWith("data:image/webp")) {
        ok(`Uploaded portrait was persisted into localStorage save (state.character.portrait)`);
      } else {
        report("KRITISCH", `Uploaded portrait NOT found in saved localStorage slot after clicking Save (got: ${String(savedPortrait).slice(0, 60)})`);
      }

      // Hard reload (fresh page load, simulates app restart) + reload the same slot from scratch.
      await page4.goto(BASE_URL, { waitUntil: "load" });
      await page4.waitForSelector(".menu-nav-btn", { timeout: 15_000 });
      await page4.locator(".menu-nav-btn").nth(1).click();
      await page4.waitForSelector(".menu-slot.filled", { timeout: 10_000 });
      await page4.locator(".menu-slot.filled").first().locator(".hf-btn--primary").click();
      await page4.waitForSelector(".sb-footer-menu", { timeout: 15_000 });
      await dismissOfflinePopupIfPresent(page4, "portrait-test reload");
      await page4.locator('[data-guide-id="topbar.character"]').first().click();
      await page4.waitForTimeout(500);
      const portraitSrcAfterReload = await page4.locator(".cs-portrait-img").getAttribute("src");
      if (portraitSrcAfterReload && portraitSrcAfterReload.startsWith("data:image/webp")) {
        ok(`Custom portrait SURVIVED a full app-restart-style reload + slot reload`);
      } else {
        report("KRITISCH", `Custom portrait LOST after reload — CharacterPage shows "${String(portraitSrcAfterReload).slice(0, 60)}" instead of the uploaded data URL`);
      }
      await page4.screenshot({ path: join(SHOTS_DIR, "05-portrait-after-reload.png"), fullPage: false });
    } else {
      report("MITTEL", `Portrait upload <input type=file> not found on CharacterPage (.cs-portrait-wrap) — selector may have changed`);
    }
    if (pageErrors4.length) report("KRITISCH", `console pageerrors during portrait-upload phase: ${pageErrors4.join(" | ")}`);
    await page4.close();

    // ═══════════════════════════════════════════════════════════════════
    // PHASE 5: Custom portrait upload from CHARACTER CREATION (empty slot → "New") survives
    // the subsequent save/load round trip too (brief explicitly names both entry points).
    // ═══════════════════════════════════════════════════════════════════
    const page5 = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    const pageErrors5 = [];
    page5.on("pageerror", (e) => pageErrors5.push(e.message));
    await page5.goto(BASE_URL, { waitUntil: "load" });
    await page5.waitForSelector(".menu-nav-btn", { timeout: 15_000 });
    await page5.locator(".menu-nav-btn").nth(0).click(); // "New Game" panel (no slots seeded → all empty)
    await page5.waitForSelector(".menu-slot--empty .hf-btn--primary", { timeout: 10_000 });
    await page5.locator(".menu-slot--empty .hf-btn--primary").first().click();
    await page5.waitForSelector(".creation-input", { timeout: 10_000 });

    const creationUploadInput = page5.locator(".creation-portrait-frame input[type=file]");
    if (await creationUploadInput.count() === 1) {
      await creationUploadInput.setInputFiles({
        name: "test-creation-portrait.png",
        mimeType: "image/png",
        buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64"),
      });
      await page5.waitForTimeout(500);
      const showcaseSrc = await page5.locator(".creation-showcase-img, .showcase-img").getAttribute("src").catch(() => null);
      if (showcaseSrc && showcaseSrc.startsWith("data:image/webp")) ok(`Character Creation portrait upload updates the showcase preview (data:image/webp)`);
      else report("MITTEL", `Character Creation portrait upload did not update showcase preview as expected (got: ${String(showcaseSrc).slice(0, 60)})`);

      await page5.locator(".creation-input").fill("Portrait Creation Test");
      await page5.screenshot({ path: join(SHOTS_DIR, "06-creation-portrait-upload.png"), fullPage: false });
      await page5.locator(".creation-start").click();
      await page5.waitForSelector(".sb-footer-menu", { timeout: 15_000 });
      await page5.waitForTimeout(600);

      // A brand-new character always starts with the onboarding Spotlight-Guide active
      // (`state.onboarding.active=true` by default) — `.guide-active` body class makes the whole
      // app except the spotlighted element unclickable. Test whether Escape closes it (matches the
      // Escape-chain behavior of every other modal/tooltip in this app, per escStack.ts) before
      // falling back to the Skip button to unblock the rest of this test.
      const guidePresent = await page5.locator(".onboarding-guide-root").count() > 0;
      if (guidePresent) {
        await page5.keyboard.press("Escape");
        await page5.waitForTimeout(250);
        const stillPresentAfterEsc = await page5.locator(".onboarding-guide-root").count() > 0;
        if (stillPresentAfterEsc) {
          report("MITTEL", `Escape does NOT close the onboarding Spotlight-Guide (still open after a fresh "New Game") — inconsistent with every other modal/tooltip in the app (Pouch/Death/PortraitPicker/OfflinePopup all close on Escape via escStack.ts). Only "Skip"/clicking the real target advances it. Repro: New Game → onboarding guide appears → press Escape → guide stays open.`);
        } else {
          ok(`Escape closed the onboarding Spotlight-Guide`);
        }
        // Whichever the outcome, unblock the rest of this test via the guaranteed Skip button.
        const skipBtn = page5.locator(".guide-bubble-skip");
        if (await skipBtn.count() > 0) {
          await skipBtn.click();
          await page5.waitForTimeout(300);
        }
      }

      await page5.locator('[data-guide-id="topbar.character"]').first().click();
      await page5.waitForTimeout(400);
      const charPagePortraitSrc = await page5.locator(".cs-portrait-img").getAttribute("src").catch(() => null);
      const carriedThrough = !!charPagePortraitSrc && charPagePortraitSrc.startsWith("data:image/webp");
      if (carriedThrough) ok(`Creation-uploaded portrait carried through into the live character (CharacterPage)`);
      else report("KRITISCH", `Creation-uploaded portrait did NOT carry through to CharacterPage after createCharacter (got: ${String(charPagePortraitSrc).slice(0, 60)})`);

      // Save, then verify via a fresh navigation + load (same addInitScript gotcha avoided: use
      // evaluate-seeded read, not a re-seeding init script).
      await page5.locator(".sb-footer-save").click({ timeout: 8000 }).catch(() => {});
      await page5.waitForTimeout(500);
      await page5.goto(BASE_URL, { waitUntil: "load" });
      await page5.waitForSelector(".menu-nav-btn", { timeout: 15_000 });
      await page5.locator(".menu-nav-btn").nth(1).click();
      await page5.waitForSelector(".menu-slot.filled", { timeout: 10_000 });
      await page5.locator(".menu-slot.filled", { hasText: "Portrait Creation Test" }).locator(".hf-btn--primary").click();
      await page5.waitForSelector(".sb-footer-menu", { timeout: 15_000 });
      await dismissOfflinePopupIfPresent(page5, "creation-portrait reload");
      await page5.locator('[data-guide-id="topbar.character"]').first().click();
      await page5.waitForTimeout(500);
      const afterReloadSrc = await page5.locator(".cs-portrait-img").getAttribute("src").catch(() => null);
      if (afterReloadSrc && afterReloadSrc.startsWith("data:image/webp")) ok(`Creation-uploaded portrait SURVIVED save + reload + slot reload`);
      else report("KRITISCH", `Creation-uploaded portrait LOST after save/reload (got: ${String(afterReloadSrc).slice(0, 60)})`);
    } else {
      report("MITTEL", `Portrait upload <input type=file> not found on CharacterCreation (.creation-portrait-frame) — selector may have changed`);
    }
    if (pageErrors5.length) report("KRITISCH", `console pageerrors during creation-portrait phase: ${pageErrors5.join(" | ")}`);
    await page5.close();

    console.log(`\n[t9] Screenshots in ${SHOTS_DIR}`);
    console.log(`\n[t9] ==== SUMMARY (${findings.length} findings logged, see KRITISCH/MITTEL above) ====`);
  } finally {
    await browser.close();
    server.child.kill();
  }
}

main().catch((err) => {
  console.error("[t9] fatal:", err);
  process.exitCode = 1;
});
