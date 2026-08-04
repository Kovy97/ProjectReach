#!/usr/bin/env node
/**
 * Verification shots for the Mira micro-icon integration wave (2026-08-03, Gap-Sweep Priorität A):
 * ActionQueuePanel, QuestsPage, AchievementsPage, CombatPage (heal-source icons in the log),
 * OptionsPage (checkbox state art), OfflinePopup. Pattern copied from queue327-shots.mjs /
 * offline-stage-shot.mjs / combat-fx-shot-296.mjs (headless vite+Playwright, NOT `pnpm dev`/Electron).
 *
 * Run: node icon-swap-verify.mjs   (from apps/client/ui-audit/, or full path from anywhere)
 */
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const CLIENT_DIR = "G:\\GameDev\\apps\\client";
const UI_AUDIT_DIR = join(CLIENT_DIR, "ui-audit");
const PORT = 5544;
const BASE_URL = `http://localhost:${PORT}`;
const OUT_DIR = "C:\\Users\\MSchu\\AppData\\Local\\Temp\\claude\\G--GameDev\\553d2095-3a73-4795-9782-0fe746a25f13\\scratchpad\\icon-swap-shots";

function startDevServer() {
  const viteBin = join(CLIENT_DIR, "node_modules", "vite", "bin", "vite.js");
  const child = spawn(
    process.execPath,
    [viteBin, "dev", "--config", join(UI_AUDIT_DIR, "vite.tour.config.mjs"), "--port", String(PORT), "--strictPort"],
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

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const { child, getOutput } = startDevServer();
  try {
    const ok = await waitForServer(BASE_URL);
    if (!ok) { console.error("SERVER NOT UP:\n" + getOutput()); process.exitCode = 1; return; }

    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
    const errors = [];
    page.on("pageerror", (e) => { errors.push("pageerror: " + e.message); console.log("PAGEERROR: " + e.message); });
    page.on("console", (m) => { if (m.type() === "error") { errors.push("console: " + m.text()); console.log("CONSOLE ERROR: " + m.text()); } });

    // ── 1) Action Queue Panel (queue327 fixture: pre-populated waiting rows) ──────────────
    await page.goto(`${BASE_URL}/?fixture=queue327`, { waitUntil: "load" });
    await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
    await page.waitForTimeout(3500);
    await clickWithReloadRetry(page, page.locator(".queue-panel-toggle"));
    await page.waitForSelector(".queue-panel-body", { timeout: 8000 });
    await page.locator(".queue-panel").screenshot({ path: join(OUT_DIR, "1-action-queue-panel.png") });
    console.log("SHOT SAVED: 1-action-queue-panel.png");

    // ── 2) Quests page (midgame): daily / chronicle / shop tabs ───────────────────────────
    await page.goto(`${BASE_URL}/?fixture=midgame`, { waitUntil: "load" });
    await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
    await page.waitForTimeout(4200);
    await clickWithReloadRetry(page, page.locator('[data-guide-id="topbar.quests"]').first());
    await page.waitForTimeout(500);
    await page.screenshot({ path: join(OUT_DIR, "2a-quests-daily.png"), fullPage: true });
    console.log("SHOT SAVED: 2a-quests-daily.png");

    await clickWithReloadRetry(page, page.locator(".quests-tab-btn").nth(0)); // chronicle
    await page.waitForTimeout(400);
    await page.screenshot({ path: join(OUT_DIR, "2b-quests-chronicle.png"), fullPage: true });
    console.log("SHOT SAVED: 2b-quests-chronicle.png");

    await clickWithReloadRetry(page, page.locator(".quests-tab-btn").nth(3)); // shop
    await page.waitForTimeout(400);
    await page.screenshot({ path: join(OUT_DIR, "2c-quests-shop.png"), fullPage: true });
    console.log("SHOT SAVED: 2c-quests-shop.png");

    // ── 3) Achievements category bar ───────────────────────────────────────────────────────
    await clickWithReloadRetry(page, page.locator('[data-guide-id="topbar.achievements"]').first());
    await page.waitForTimeout(500);
    await page.screenshot({ path: join(OUT_DIR, "3a-achievements-full.png"), fullPage: true });
    console.log("SHOT SAVED: 3a-achievements-full.png");
    const catGroup = page.locator(".achv-cat-group").first();
    if (await catGroup.count()) {
      await catGroup.scrollIntoViewIfNeeded();
      await catGroup.screenshot({ path: join(OUT_DIR, "3b-achievements-catbar.png") });
      console.log("SHOT SAVED: 3b-achievements-catbar.png");
    }

    // ── 4) Options: autoBank checkbox in both states ───────────────────────────────────────
    const drawerTab = page.locator(".sb-footer-drawer-tab").first();
    if (await drawerTab.count()) {
      const expanded = await drawerTab.getAttribute("aria-expanded");
      if (expanded !== "true") {
        await clickWithReloadRetry(page, drawerTab);
        await page.waitForTimeout(300);
      }
    }
    const optionsBtn = page.locator('[data-guide-id="sidebar.options"]').first();
    await optionsBtn.scrollIntoViewIfNeeded();
    await clickWithReloadRetry(page, optionsBtn);
    await page.waitForSelector(".opz-grid", { timeout: 10000 });
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(OUT_DIR, "4z-options-fullpage-debug.png"), fullPage: true });
    const autoBankRow = page.locator(".opz-row", { hasText: /Auto-Lager|Auto-Bank/ }).first();
    await autoBankRow.scrollIntoViewIfNeeded();
    await autoBankRow.screenshot({ path: join(OUT_DIR, "4a-options-checkbox-state1.png") });
    console.log("SHOT SAVED: 4a-options-checkbox-state1.png");
    await clickWithReloadRetry(page, autoBankRow.locator("button"));
    await page.waitForTimeout(150);
    await autoBankRow.screenshot({ path: join(OUT_DIR, "4b-options-checkbox-state2.png") });
    console.log("SHOT SAVED: 4b-options-checkbox-state2.png");
    // flip back so state doesn't linger changed for a later manual check
    await clickWithReloadRetry(page, autoBankRow.locator("button"));

    const backupsRow = page.locator(".opz-row", { hasText: /Backup/i }).first();
    if (await backupsRow.count()) {
      await backupsRow.scrollIntoViewIfNeeded();
      await backupsRow.screenshot({ path: join(OUT_DIR, "4c-options-folder-btn.png") });
      console.log("SHOT SAVED: 4c-options-folder-btn.png");
    }

    // ── 5) Combat: dungeon header (boss icon reuse) + monster-card trait badges ───────────
    await clickWithReloadRetry(page, page.locator('[data-guide-id="sidebar.combat"]').first());
    await page.waitForTimeout(600);
    const dungeonHeading = page.locator(".dungeon-heading").first();
    if (await dungeonHeading.count()) {
      await dungeonHeading.scrollIntoViewIfNeeded();
      await dungeonHeading.screenshot({ path: join(OUT_DIR, "5a-dungeon-heading.png") });
      console.log("SHOT SAVED: 5a-dungeon-heading.png");
    }

    // ── 6) Combat: fight until a heal-source icon appears in the log ──────────────────────
    await page.screenshot({ path: join(OUT_DIR, "6z-zonegrid-debug.png"), fullPage: true });
    const zoneCard = page.locator(".zone-card").first();
    await zoneCard.scrollIntoViewIfNeeded();
    await clickWithReloadRetry(page, zoneCard);
    await page.waitForTimeout(1200);
    await page.screenshot({ path: join(OUT_DIR, "6z2-monstergrid-debug.png"), fullPage: true });
    const fightBtn = page.locator(".monster-card").nth(2).locator(".mc-fight-now-btn");
    await fightBtn.scrollIntoViewIfNeeded();
    await clickWithReloadRetry(page, fightBtn);
    await page.waitForSelector(".battle", { timeout: 10000 });
    await page.waitForTimeout(600);
    await page.screenshot({ path: join(OUT_DIR, "6a-battle-start.png") });
    console.log("SHOT SAVED: 6a-battle-start.png");

    try {
      await page.waitForFunction(
        () => !!document.querySelector(".heal-source-icon-img"),
        null,
        { timeout: 75000, polling: 100 },
      );
      const logEl = page.locator(".combat-log, .log-panel").first();
      if (await logEl.count()) {
        await logEl.screenshot({ path: join(OUT_DIR, "6b-heal-source-icon-log.png") });
      } else {
        await page.screenshot({ path: join(OUT_DIR, "6b-heal-source-icon-fullpage.png") });
      }
      console.log("SHOT SAVED: 6b heal-source icon captured");
    } catch (e) {
      await page.screenshot({ path: join(OUT_DIR, "6b-NO-heal-event-within-budget.png") });
      console.log("!! no heal-source icon observed within budget: " + e.message);
    }

    // Monster trait badges (regen/immune) — opportunistic across a couple of zones.
    for (const zoneMatch of [/Weiden|Pastures/, /Wald|Forest/, /Sumpf|Swamp/]) {
      await page.goto(`${BASE_URL}/?fixture=midgame`, { waitUntil: "load" });
      await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
      await page.waitForTimeout(2500);
      await clickWithReloadRetry(page, page.locator('[data-guide-id="sidebar.combat"]').first());
      await page.waitForTimeout(400);
      const zc = page.locator(".zone-card", { hasText: zoneMatch }).first();
      if (!(await zc.count())) continue;
      await clickWithReloadRetry(page, zc);
      await page.waitForTimeout(800);
      const badge = page.locator(".mc-trait-badge").first();
      if (await badge.count()) {
        const card = page.locator(".monster-card", { has: page.locator(".mc-trait-badge") }).first();
        await card.scrollIntoViewIfNeeded();
        await card.screenshot({ path: join(OUT_DIR, "7-monster-trait-badges.png") });
        console.log("SHOT SAVED: 7-monster-trait-badges.png (zone match found)");
        break;
      }
    }

    // ── 8) Offline popup ────────────────────────────────────────────────────────────────
    await page.goto(`${BASE_URL}/?fixture=endgame&offlineTest=1`, { waitUntil: "load" });
    await page.waitForSelector(".offline-stage", { timeout: 15000 });
    await page.waitForTimeout(4300);
    await page.screenshot({ path: join(OUT_DIR, "8a-offline-popup.png") });
    console.log("SHOT SAVED: 8a-offline-popup.png");

    await page.goto(`${BASE_URL}/?fixture=endgame&offlineTest=death`, { waitUntil: "load" });
    await page.waitForSelector(".offline-stage", { timeout: 15000 });
    await page.waitForTimeout(4300);
    await page.screenshot({ path: join(OUT_DIR, "8b-offline-popup-death.png") });
    console.log("SHOT SAVED: 8b-offline-popup-death.png");

    console.log(errors.length ? `${errors.length} page errors:\n` + errors.slice(0, 30).join("\n") : "no page errors");
    await browser.close();
  } finally {
    child.kill();
  }
}

main();
