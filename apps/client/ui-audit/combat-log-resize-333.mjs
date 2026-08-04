#!/usr/bin/env node
/**
 * Task #333 self-check: Kampf-Screen-Ergonomie (Loadout-/Log-Panel resizable + Log-Settings-
 * Popover). Modeled on resize-shot-291.mjs (real mouse drag, not a style hack) + combat-fx-shot-
 * 296.mjs (enterBattle helper). Port 5333 per repo convention (task-numbered ports).
 *
 * Verifies:
 *  1. Loadout-panel width handle (.battle-loadout-resize) — drag wider, reload persists, dblclick resets.
 *  2. Log-panel corner handle (.battle-log-resize) — drag wider+taller (both axes), reload persists,
 *     dblclick resets width AND height.
 *  3. Log-Settings gear (.battle-log-settings-btn) — popover with 8 category checkboxes, default all
 *     checked; unchecking "Your damage"/"Eigener Schaden" retroactively hides existing player-hit
 *     lines already in the log (pure display filter, not an engine change).
 *  4. 1280x720 viewport counter-check (grip visible, battle backdrop fills full height).
 *
 * Run: node combat-log-resize-333.mjs
 * Output: PNGs + console measurements written to the scratchpad dir below.
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5333;
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

async function enterBattle(page, { fixture, zoneMatch, monsterMatch }) {
  await page.goto(`${BASE_URL}/?fixture=${fixture}`, { waitUntil: "load" });
  await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
  await page.waitForTimeout(4500); // let load-toasts clear

  await clickWithReloadRetry(page, page.locator('[data-guide-id="sidebar.combat"]').first());
  await page.waitForTimeout(500);

  await clickWithReloadRetry(page, page.locator(".zone-card", { hasText: zoneMatch }).first());
  await page.waitForTimeout(1500);

  // Task #315 (Kampf-Queue-UI, s. CombatPage.tsx MonsterCard onQueue-JSDoc): ein normaler Klick
  // auf den "∞"-Button reiht nur hinten ein (enqueueFight) — SHIFT-Klick springt an den
  // Warteschlangen-Anfang UND startet sofort (enqueueFightAtFront, "sofort losschlagen").
  const card = monsterMatch
    ? page.locator(".monster-card", { hasText: monsterMatch }).first()
    : page.locator(".monster-card").first();
  await clickWithReloadRetry(page, card.locator(".qty-picker-btn--infinite"), { modifiers: ["Shift"] });
  await page.waitForSelector(".battle", { timeout: 10000 });
  await page.waitForTimeout(600);
}

/** Real drag via page.mouse: mousedown on the handle -> several mousemove steps -> mouseup
 *  (Chef-Vorgabe: kein direktes Setzen der Größe). `dx`/`dy` are the desired pointer travel. */
async function dragHandle(page, handleSelector, dx, dy) {
  const handle = page.locator(handleSelector);
  const box = await handle.boundingBox();
  if (!box) throw new Error(`${handleSelector} not found`);
  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  const steps = 8;
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(startX + (dx * i) / steps, startY + (dy * i) / steps, { steps: 3 });
    await page.waitForTimeout(20);
  }
  await page.mouse.up();
  await page.waitForTimeout(150);
}

async function run(browser, { width, height, suffix }) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", (e) => { errors.push("pageerror: " + e.message); });
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });

  await enterBattle(page, { fixture: "midgame", zoneMatch: /Weiden|Pastures/, monsterMatch: null });

  // ── 0. Default battle view (grip handles + gear visible, backdrop full-height sanity) ──
  await page.screenshot({ path: join(OUT_DIR, `log333-battle-default-${suffix}.png`), fullPage: false });
  console.log(`SHOT SAVED: log333-battle-default-${suffix}.png`);

  const loadoutBoxDefault = await page.locator(".battle-loadout-col").boundingBox();
  const logBoxDefault = await page.locator(".battle-log-panel").boundingBox();
  console.log(`[${suffix}] default loadout width: ${loadoutBoxDefault?.width}, log panel: ${logBoxDefault?.width}x${logBoxDefault?.height}`);

  // ── 1. Drag the loadout-panel handle wider (+130px) ──
  await dragHandle(page, ".battle-loadout-resize", 130, 0);
  const loadoutBoxWide = await page.locator(".battle-loadout-col").boundingBox();
  console.log(`[${suffix}] after loadout drag (+130px), width: ${loadoutBoxWide?.width} (expect ~${(loadoutBoxDefault?.width ?? 250) + 130})`);
  await page.screenshot({ path: join(OUT_DIR, `log333-loadout-wide-${suffix}.png`), fullPage: false });
  console.log(`SHOT SAVED: log333-loadout-wide-${suffix}.png`);

  // ── 2. Drag the log-panel corner handle: left+down (wider AND taller in one drag) ──
  await dragHandle(page, ".battle-log-resize", -90, 100);
  const logBoxBig = await page.locator(".battle-log-panel").boundingBox();
  console.log(`[${suffix}] after log corner drag (-90,+100), size: ${logBoxBig?.width}x${logBoxBig?.height} (expect wider AND taller than ${logBoxDefault?.width}x${logBoxDefault?.height})`);
  await page.screenshot({ path: join(OUT_DIR, `log333-log-resized-${suffix}.png`), fullPage: false });
  console.log(`SHOT SAVED: log333-log-resized-${suffix}.png`);

  if (suffix === "1920") {
    // ── 3. Persistence check: read localStorage directly (the fixture=... URL param re-seeds a
    //      fresh save on every full page.reload(), which would just mask what we're testing here)
    //      + leave/re-enter combat to exercise the REAL hydration codepath (Battle unmounts on
    //      flee, remounts on re-entry -> useLayoutEffect re-reads uiPrefs, same as a real reload). ──
    const persisted = await page.evaluate(() => ({
      loadoutW: localStorage.getItem("gr.combat.loadoutWidth"),
      logW: localStorage.getItem("gr.combat.logWidth"),
      logH: localStorage.getItem("gr.combat.logHeight"),
    }));
    console.log(`[${suffix}] localStorage after drag: ${JSON.stringify(persisted)} (expect loadoutW~380, logW~390, logH set)`);

    await page.locator(".combat-btn.flee").click();
    await page.waitForTimeout(500);
    await clickWithReloadRetry(page, page.locator(".monster-card").first().locator(".qty-picker-btn--infinite"), { modifiers: ["Shift"] });
    await page.waitForSelector(".battle", { timeout: 10000 });
    await page.waitForTimeout(400);
    const loadoutAfterReenter = await page.locator(".battle-loadout-col").boundingBox();
    const logAfterReenter = await page.locator(".battle-log-panel").boundingBox();
    console.log(`[${suffix}] after leave+re-enter combat — loadout: ${loadoutAfterReenter?.width} (expect ~${loadoutBoxWide?.width}), log: ${logAfterReenter?.width}x${logAfterReenter?.height} (expect ~${logBoxBig?.width}x${logBoxBig?.height})`);
    await page.screenshot({ path: join(OUT_DIR, `log333-after-reenter-${suffix}.png`), fullPage: false });
    console.log(`SHOT SAVED: log333-after-reenter-${suffix}.png`);

    // ── 4. Double-click both handles -> reset to defaults ──
    await page.locator(".battle-loadout-resize").dblclick();
    await page.locator(".battle-log-resize").dblclick();
    await page.waitForTimeout(200);
    const loadoutAfterReset = await page.locator(".battle-loadout-col").boundingBox();
    const logAfterReset = await page.locator(".battle-log-panel").boundingBox();
    console.log(`[${suffix}] after dblclick reset — loadout: ${loadoutAfterReset?.width} (expect ~250), log: ${logAfterReset?.width}x${logAfterReset?.height} (expect ~${logBoxDefault?.width}x${logBoxDefault?.height})`);
    await page.screenshot({ path: join(OUT_DIR, `log333-after-reset-${suffix}.png`), fullPage: false });
    console.log(`SHOT SAVED: log333-after-reset-${suffix}.png`);

    // ── 5. Log-Settings popover: open, screenshot checkboxes (default all-on) ──
    await page.locator(".battle-log-settings-btn").click();
    await page.waitForSelector(".battle-log-settings-pop", { timeout: 3000 });
    const rowCount = await page.locator(".battle-log-settings-row").count();
    console.log(`[${suffix}] log-settings popover rows (expect 8): ${rowCount}`);
    const allChecked = await page.locator(".battle-log-settings-row input[type=checkbox]").evaluateAll(
      (els) => els.every((el) => el.checked),
    );
    console.log(`[${suffix}] all filter checkboxes checked by default: ${allChecked}`);
    await page.locator(".battle-log-settings-wrap").screenshot({ path: join(OUT_DIR, `log333-settings-popover-${suffix}.png`) });
    console.log(`SHOT SAVED: log333-settings-popover-${suffix}.png`);
    await page.screenshot({ path: join(OUT_DIR, `log333-settings-popover-full-${suffix}.png`), fullPage: false });
    console.log(`SHOT SAVED: log333-settings-popover-full-${suffix}.png`);

    // ── 6. Wait for at least one player-hit log line, then uncheck "own damage" -> it must
    //      retroactively disappear from the already-collected log (pure display filter). ──
    try {
      await page.waitForFunction(
        () => !!document.querySelector(".log-line.hit.player, .log-line.crit.player"),
        null,
        { timeout: 15000, polling: 30 },
      );
      const beforeCount = await page.locator(".log-line.hit.player, .log-line.crit.player").count();
      console.log(`[${suffix}] player-hit log lines before unchecking "own damage": ${beforeCount}`);

      const ownDamageRow = page.locator(".battle-log-settings-row", { hasText: /Eigener Schaden|Your damage/ }).first();
      await ownDamageRow.locator("input[type=checkbox]").uncheck();
      await page.waitForTimeout(150);
      const afterCount = await page.locator(".log-line.hit.player, .log-line.crit.player").count();
      console.log(`[${suffix}] player-hit log lines AFTER unchecking (expect 0, retroactive filter): ${afterCount}`);
      await page.screenshot({ path: join(OUT_DIR, `log333-filtered-log-${suffix}.png`), fullPage: false });
      console.log(`SHOT SAVED: log333-filtered-log-${suffix}.png`);

      // Re-check to restore full log for visual sanity.
      await ownDamageRow.locator("input[type=checkbox]").check();
      await page.waitForTimeout(150);
      const restoredCount = await page.locator(".log-line.hit.player, .log-line.crit.player").count();
      console.log(`[${suffix}] player-hit log lines after re-checking (expect back to ~${beforeCount}+): ${restoredCount}`);
    } catch (e) {
      console.log("!! own-damage filter check failed: " + e.message);
    }

    // Close popover, click elsewhere -> should close (outside-click).
    await page.mouse.click(20, 20);
    await page.waitForTimeout(150);
    const popStillOpen = await page.locator(".battle-log-settings-pop").count();
    console.log(`[${suffix}] popover open after outside click (expect 0): ${popStillOpen}`);
  }

  console.log(`[${suffix}] ` + (errors.length ? `${errors.length} page errors seen:\n` + errors.slice(0, 12).join("\n") : "no page errors"));
  await page.close();
}

const { child, getOutput } = startDevServer();
try {
  const ok = await waitForServer(BASE_URL);
  if (!ok) { console.error("SERVER NOT UP:\n" + getOutput()); process.exit(1); }
  const browser = await chromium.launch();
  await run(browser, { width: 1920, height: 1080, suffix: "1920" });
  await run(browser, { width: 1280, height: 720, suffix: "1280" });
  await browser.close();
} finally {
  child.kill();
}
