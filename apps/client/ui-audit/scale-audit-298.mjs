#!/usr/bin/env node
/**
 * Task #298 (Chef-Audit): full 1920x1080 scaling/readability sweep across the whole app —
 * main menu, character creation, character page (incl. tooltips), skills overview, mastery,
 * a gathering + a crafting skill page, combat (zone select / monster cards / active fight /
 * kill overlay), shop (buy+sell), bank, quests (incl. token shop), achievements, pet gallery,
 * enchanting altar, options, and the sidebar at default width vs dragged-narrow.
 *
 * Complements the automated `pnpm ui-audit` tour (which does full-PAGE, i.e. full-scroll-height,
 * screenshots for clipping/overflow detection) with EXACT-VIEWPORT (1920x1080, no scroll)
 * screenshots — what the Chef's readability/click-target/whitespace judgment actually needs to see.
 *
 * Port 5205 per Chef instructions (5196/5203/5204 already used by other scripts).
 * Run: node scale-audit-298.mjs
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = "G:\\GameDev\\apps\\client";
const AUDIT_DIR = join(CLIENT_DIR, "ui-audit");
const PORT = 5205;
const BASE_URL = `http://localhost:${PORT}`;
const OUT_DIR = join(__dirname, "shots-298");
mkdirSync(OUT_DIR, { recursive: true });

function startDevServer() {
  const viteBin = join(CLIENT_DIR, "node_modules", "vite", "bin", "vite.js");
  const child = spawn(
    process.execPath,
    [viteBin, "dev", "--config", join(AUDIT_DIR, "vite.tour.config.mjs"), "--port", String(PORT), "--strictPort"],
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

async function shot(page, name) {
  const path = join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path, fullPage: false });
  console.log(`SHOT: ${name}.png`);
}

/** Real mouse drag on .sb-resize-handle (not a style hack). */
async function dragSidebarTo(page, targetWidth) {
  const handle = page.locator(".sb-resize-handle");
  const handleBox = await handle.boundingBox();
  const sidebarBox = await page.locator(".sidebar").boundingBox();
  if (!handleBox || !sidebarBox) return;
  const startX = handleBox.x + handleBox.width / 2;
  const startY = handleBox.y + handleBox.height / 2;
  const delta = targetWidth - sidebarBox.width;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  const steps = 12;
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(startX + (delta * i) / steps, startY, { steps: 2 });
  }
  await page.mouse.up();
  await page.waitForTimeout(300);
}

async function runMainMenuAndCreation(browser) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });

  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await shot(page, "01-mainmenu-default");

  await clickWithReloadRetry(page, page.locator(".menu-nav-btn").nth(1)); // load
  await page.waitForTimeout(500);
  await shot(page, "02-mainmenu-load");

  await clickWithReloadRetry(page, page.locator(".menu-nav-btn").nth(2)); // options
  await page.waitForTimeout(500);
  await shot(page, "03-mainmenu-options");

  await clickWithReloadRetry(page, page.locator(".menu-nav-btn").nth(0)); // new -> character creation
  await page.waitForTimeout(500);
  await shot(page, "04-character-creation");

  // Try to open a portrait-picker modal if the "more" button exists (overlay check).
  const moreBtn = page.locator(".creation-portrait-more-btn");
  if (await moreBtn.count()) {
    await clickWithReloadRetry(page, moreBtn.first());
    await page.waitForTimeout(400);
    await shot(page, "05-character-creation-portrait-modal");
  }

  console.log("[mainmenu/creation] " + (errors.length ? `${errors.length} errors:\n` + errors.slice(0, 10).join("\n") : "no errors"));
  await page.close();
}

async function runFixtureFlow(browser, fixture) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });

  await page.goto(`${BASE_URL}/?fixture=${fixture}`, { waitUntil: "load" });
  await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });

  // Toasts-visible shot BEFORE they clear (achievement-unlock toasts fire on fixture load).
  await page.waitForTimeout(900);
  await shot(page, `${fixture}-06-toasts-visible`);
  await page.waitForTimeout(4200); // let remaining toasts clear like the main tour does

  // ── CharacterPage ──
  await clickWithReloadRetry(page, page.locator('[data-guide-id="topbar.character"]').first());
  await page.waitForTimeout(500);
  await shot(page, `${fixture}-07-character`);

  // Tooltip: weapon (mainhand) slot.
  const weaponSlot = page.locator(".cs-slot.mainhand .slot-item");
  if (await weaponSlot.count()) {
    await weaponSlot.first().hover();
    await page.waitForTimeout(1300);
    await shot(page, `${fixture}-08-tooltip-weapon`);
    await page.mouse.move(10, 10);
    await page.waitForTimeout(200);
  }
  // Tooltip: armor (body) slot.
  const bodySlot = page.locator(".cs-slot.body .slot-item");
  if (await bodySlot.count()) {
    await bodySlot.first().hover();
    await page.waitForTimeout(1300);
    await shot(page, `${fixture}-09-tooltip-armor`);
    await page.mouse.move(10, 10);
    await page.waitForTimeout(200);
  }

  // ── SkillsOverview ──
  await clickWithReloadRetry(page, page.locator('[data-guide-id="sidebar.skills-overview"]').first());
  await page.waitForTimeout(500);
  await shot(page, `${fixture}-10-skills-overview`);

  // ── Mastery ──
  await clickWithReloadRetry(page, page.locator('[data-guide-id="topbar.mastery"]').first());
  await page.waitForTimeout(500);
  await shot(page, `${fixture}-11-mastery`);

  // ── Gathering skill: Mining ──
  await clickWithReloadRetry(page, page.locator('[data-guide-id="sidebar.mining"]').first());
  await page.waitForTimeout(500);
  await shot(page, `${fixture}-12-mining`);

  // ── Crafting skill: Smithing ──
  await clickWithReloadRetry(page, page.locator('[data-guide-id="sidebar.smithing"]').first());
  await page.waitForTimeout(500);
  await shot(page, `${fixture}-13-smithing`);

  // ── Combat: zones -> monsters -> fight -> kill overlay ──
  await clickWithReloadRetry(page, page.locator('[data-guide-id="sidebar.combat"]').first());
  await page.waitForTimeout(500);
  await shot(page, `${fixture}-14-combat-zones`);

  const zoneCard = page.locator(".zone-card:not(.dungeon-card):not(.slayer-floor-zone-card)").first();
  if (await zoneCard.count()) {
    await clickWithReloadRetry(page, zoneCard);
    await page.waitForTimeout(500);
    await shot(page, `${fixture}-15-combat-monsters`);

    const gridCols = await page.evaluate(() => {
      const grid = document.querySelector(".monster-card-grid, .mc-grid, .zone-monster-grid");
      if (!grid) return null;
      const cs = getComputedStyle(grid);
      return cs.gridTemplateColumns;
    });
    console.log(`[${fixture}] monster grid-template-columns: ${gridCols}`);

    const fightBtn = page.locator(".mc-fight-btn:not([disabled])").first();
    if (await fightBtn.count()) {
      await clickWithReloadRetry(page, fightBtn);
      await page.waitForTimeout(1200);
      await shot(page, `${fixture}-16-combat-fight`);

      const loadoutSlots = await page.locator(".cl-slot").count();
      console.log(`[${fixture}] combat loadout .cl-slot count (expect 13): ${loadoutSlots}`);

      await page.waitForTimeout(7000);
      const killCount = await page.locator(".kill-summary-card").count();
      if (killCount > 0) {
        await shot(page, `${fixture}-17-combat-kill-overlay`);
      } else {
        console.log(`[${fixture}] no kill overlay captured after wait`);
      }
    }
  }

  // ── Shop: Buy + Sell ──
  await clickWithReloadRetry(page, page.locator('[data-guide-id="topbar.shop"]').first());
  await page.waitForTimeout(500);
  await shot(page, `${fixture}-18-shop-buy`);
  const sellTab = page.locator(".shopv2-maintab").nth(1);
  if (await sellTab.count()) {
    await clickWithReloadRetry(page, sellTab);
    await page.waitForTimeout(500);
    await shot(page, `${fixture}-19-shop-sell`);
  }

  // ── Bank ──
  await clickWithReloadRetry(page, page.locator('[data-guide-id="topbar.bank"]').first());
  await page.waitForTimeout(500);
  await shot(page, `${fixture}-20-bank`);

  // ── Quests: story / daily / token shop ──
  await clickWithReloadRetry(page, page.locator('[data-guide-id="topbar.quests"]').first());
  await page.waitForTimeout(500);
  await shot(page, `${fixture}-21-quests-daily`);
  const storyTabBtns = page.locator("button", { hasText: "" });
  // Click by known tab structure: buttons with onClick setTab("story"/"shop") — use text-based fallback via nth order seen in source (story, daily, shop).
  const questTabs = page.locator(".q-tabs button, .quest-tabs button, [class*='quest'][class*='tab'] button");
  if (await questTabs.count() >= 3) {
    await clickWithReloadRetry(page, questTabs.nth(2)); // shop/token-shop tab
    await page.waitForTimeout(500);
    await shot(page, `${fixture}-22-quests-tokenshop`);
  } else {
    console.log(`[${fixture}] quest tab buttons not found via .q-tabs/.quest-tabs selector (count=${await questTabs.count()}), trying text fallback`);
  }

  // ── Achievements ──
  await clickWithReloadRetry(page, page.locator('[data-guide-id="topbar.achievements"]').first());
  await page.waitForTimeout(500);
  await shot(page, `${fixture}-23-achievements`);

  // ── Pet Gallery (companions) ──
  await clickWithReloadRetry(page, page.locator('[data-guide-id="topbar.companions"]').first());
  await page.waitForTimeout(500);
  await shot(page, `${fixture}-24-companions`);

  // ── Enchanting ──
  await clickWithReloadRetry(page, page.locator('[data-guide-id="sidebar.enchanting"]').first());
  await page.waitForTimeout(500);
  await shot(page, `${fixture}-25-enchanting`);

  // ── Options (footer button) ──
  await clickWithReloadRetry(page, page.locator('[data-guide-id="sidebar.options"]').first());
  await page.waitForTimeout(500);
  await shot(page, `${fixture}-26-options`);

  console.log(`[${fixture}] ` + (errors.length ? `${errors.length} errors:\n` + errors.slice(0, 15).join("\n") : "no page errors"));
  await page.close();
}

async function runSidebarWidths(browser) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await page.goto(`${BASE_URL}/?fixture=midgame`, { waitUntil: "load" });
  await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
  await page.waitForTimeout(5200);

  await clickWithReloadRetry(page, page.locator('[data-guide-id="sidebar.combat"]').first());
  await page.waitForTimeout(500);
  await shot(page, "27-sidebar-default");
  const defaultBox = await page.locator(".sidebar").boundingBox();
  console.log(`sidebar default width: ${defaultBox?.width}`);

  await dragSidebarTo(page, 90); // drag to icon-rail collapse
  await shot(page, "28-sidebar-narrow");
  const narrowBox = await page.locator(".sidebar").boundingBox();
  console.log(`sidebar narrow width: ${narrowBox?.width}`);

  // Verify nav buttons still clickable/visible at narrow width.
  await clickWithReloadRetry(page, page.locator('[data-guide-id="sidebar.mining"]').first());
  await page.waitForTimeout(500);
  await shot(page, "29-sidebar-narrow-mining");

  await page.close();
}

const { child, getOutput } = startDevServer();
try {
  const ok = await waitForServer(BASE_URL);
  if (!ok) { console.error("SERVER NOT UP:\n" + getOutput()); process.exit(1); }
  const browser = await chromium.launch();
  await runMainMenuAndCreation(browser);
  await runFixtureFlow(browser, "midgame");
  await runFixtureFlow(browser, "endgame");
  await runSidebarWidths(browser);
  await browser.close();
  console.log("ALL DONE");
} finally {
  child.kill();
}
