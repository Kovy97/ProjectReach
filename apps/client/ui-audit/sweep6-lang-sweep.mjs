#!/usr/bin/env node
/**
 * TESTER 6 ("Der Übersetzer") — Sprach-Sweep über alle 7 Locales (EN/DE/ZH/RU/ES/PT-BR/FR).
 * READ-ONLY: kein pnpm build, kein Electron — headless vite + Playwright, Muster wie
 * loadout-scroll-check.mjs / lang-check-282.mjs. Port 5255.
 *
 * Locale-Wechsel: localStorage["hearthforge:locale"] wird per context.addInitScript VOR jedem
 * Seitenaufruf gesetzt (siehe src/renderer/i18n/index.tsx STORAGE_KEY) — kein UI-Klick nötig.
 *
 * Args: node sweep6-lang-sweep.mjs <locales-csv> <depth>
 *   locales-csv: z.B. "de,en,ru,zh" (default)
 *   depth: "full" (alle 7 Seiten inkl. 2 Tooltips) oder "sample" (combat+character+smithing)
 */
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5255;
const BASE_URL = `http://localhost:${PORT}`;
const OUT_DIR = "C:\\Users\\MSchu\\AppData\\Local\\Temp\\claude\\G--GameDev\\553d2095-3a73-4795-9782-0fe746a25f13\\scratchpad\\sweep6";

const LOCALES = (process.argv[2] || "de,en,ru,zh").split(",").map((s) => s.trim());
const DEPTH = process.argv[3] || "full";

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

async function clickRetry(page, locator, opts = {}) {
  try { await locator.click({ timeout: 6000, ...opts }); }
  catch { await page.waitForTimeout(400); await locator.click({ timeout: 6000, ...opts }); }
}

const RAW_KEY_RE = /\b[a-zA-Z]\w*\.[a-zA-Z]\w*\.[a-zA-Z][\w.]*\b/g;

function findRawKeys(text) {
  const hits = text.match(RAW_KEY_RE) || [];
  return [...new Set(hits)];
}

function hasTofu(text) {
  return text.includes("�") || /□□/.test(text);
}

async function dumpText(page) {
  return page.evaluate(() => document.body.innerText);
}

async function shot(page, name) {
  await page.screenshot({ path: join(OUT_DIR, name), fullPage: true });
  console.log(`SHOT: ${name}`);
}

async function expandAllCategories(page) {
  const headers = page.locator(".category-header");
  const n = await headers.count();
  for (let i = 0; i < n; i++) {
    const caret = await headers.nth(i).locator(".category-caret").innerText().catch(() => "");
    if (caret.trim() === "▸") {
      await clickRetry(page, headers.nth(i));
      await page.waitForTimeout(150);
    }
  }
}

async function runLocale(browser, locale) {
  const result = { locale, pages: {} };
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await context.addInitScript((l) => { localStorage.setItem("hearthforge:locale", l); }, locale);
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") pageErrors.push("console: " + m.text()); });

  await page.goto(`${BASE_URL}/?fixture=midgame`, { waitUntil: "load" });
  await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
  await page.waitForTimeout(4200); // Achievement-Toasts vom Fixture-Load abklingen lassen

  // ── Combat: aktiver Kampf mit Nameplates ──
  await clickRetry(page, page.locator('[data-guide-id="sidebar.combat"]').first());
  await page.waitForTimeout(700);
  await clickRetry(page, page.locator(".zone-card").first());
  await page.waitForTimeout(1200);
  await clickRetry(page, page.locator(".mc-fight-btn").first());
  await page.waitForTimeout(2200);
  const nameplateCount = await page.locator(".fighter-nameplate").count();
  const combatText = await dumpText(page);
  result.pages.combat = { rawKeys: findRawKeys(combatText), tofu: hasTofu(combatText), nameplateCount };
  await page.screenshot({ path: join(OUT_DIR, `${locale}-combat.png`), fullPage: false });
  console.log(`SHOT: ${locale}-combat.png (nameplates: ${nameplateCount})`);

  // ── Character + Equip-Tooltip ──
  await clickRetry(page, page.locator('[data-guide-id="topbar.character"]').first());
  await page.waitForTimeout(600);
  const charText = await dumpText(page);
  result.pages.character = { rawKeys: findRawKeys(charText), tofu: hasTofu(charText) };
  await shot(page, `${locale}-character.png`);

  // Tooltip 1: ring1 (necrosignet_ring) — modifiers + skillBoost
  await clickRetry(page, page.locator(".cs-slot.ring1 .item-cell").first());
  await page.waitForTimeout(350);
  const tip1 = await page.locator(".item-tooltip").first().innerText().catch(() => "");
  result.pages.tooltipRing = { text: tip1, rawKeys: findRawKeys(tip1) };
  await page.screenshot({ path: join(OUT_DIR, `${locale}-tooltip-ring.png`) });
  console.log(`SHOT: ${locale}-tooltip-ring.png`);
  await page.keyboard.press("Escape").catch(() => {});
  await page.waitForTimeout(150);

  if (DEPTH === "full") {
    // Tooltip 2: offhand (steel_towershield) — Set-Zeile (1/9 steel_set, inaktiv)
    await clickRetry(page, page.locator(".cs-slot.offhand .item-cell").first());
    await page.waitForTimeout(350);
    const tip2 = await page.locator(".item-tooltip").first().innerText().catch(() => "");
    result.pages.tooltipOffhand = { text: tip2, rawKeys: findRawKeys(tip2) };
    await page.screenshot({ path: join(OUT_DIR, `${locale}-tooltip-offhand.png`) });
    console.log(`SHOT: ${locale}-tooltip-offhand.png`);
    await page.keyboard.press("Escape").catch(() => {});
    await page.waitForTimeout(150);
  }

  // ── Shop ──
  if (DEPTH === "full") {
    await clickRetry(page, page.locator('[data-guide-id="topbar.shop"]').first());
    await page.waitForTimeout(600);
    const shopText = await dumpText(page);
    result.pages.shop = { rawKeys: findRawKeys(shopText), tofu: hasTofu(shopText) };
    await shot(page, `${locale}-shop.png`);
  }

  // ── Smithing (Spitzhacken/Sicheln/Voidsteel) ──
  await clickRetry(page, page.locator('[data-guide-id="sidebar.smithing"]').first());
  await page.waitForTimeout(600);
  await expandAllCategories(page);
  const smithText = await dumpText(page);
  result.pages.smithing = { rawKeys: findRawKeys(smithText), tofu: hasTofu(smithText) };
  await shot(page, `${locale}-smithing.png`);

  // ── Leatherworking (Rohleder + Angelruten) ──
  if (DEPTH === "full") {
    await clickRetry(page, page.locator('[data-guide-id="sidebar.leatherworking"]').first());
    await page.waitForTimeout(600);
    await expandAllCategories(page);
    const leatherText = await dumpText(page);
    result.pages.leatherworking = { rawKeys: findRawKeys(leatherText), tofu: hasTofu(leatherText) };
    await shot(page, `${locale}-leatherworking.png`);

    // ── Mastery ──
    await clickRetry(page, page.locator('[data-guide-id="topbar.mastery"]').first());
    await page.waitForTimeout(600);
    const masteryText = await dumpText(page);
    result.pages.mastery = { rawKeys: findRawKeys(masteryText), tofu: hasTofu(masteryText) };
    await shot(page, `${locale}-mastery.png`);

    // ── Achievements ──
    await clickRetry(page, page.locator('[data-guide-id="topbar.achievements"]').first());
    await page.waitForTimeout(600);
    const achText = await dumpText(page);
    result.pages.achievements = { rawKeys: findRawKeys(achText), tofu: hasTofu(achText) };
    await shot(page, `${locale}-achievements.png`);
  }

  result.pageErrors = pageErrors.slice(0, 15);
  await context.close();
  return result;
}

const { child, getOutput } = startDevServer();
try {
  const ok = await waitForServer(BASE_URL);
  if (!ok) { console.error("SERVER NOT UP:\n" + getOutput()); process.exit(1); }
  const browser = await chromium.launch();

  const allResults = [];
  for (const locale of LOCALES) {
    console.log(`\n===== LOCALE: ${locale} (depth=${DEPTH}) =====`);
    try {
      const r = await runLocale(browser, locale);
      allResults.push(r);
    } catch (e) {
      console.error(`LOCALE ${locale} FAILED: ${e.message}`);
      allResults.push({ locale, error: e.message });
    }
  }

  await browser.close();

  console.log("\n\n===== SUMMARY JSON =====");
  console.log(JSON.stringify(allResults, null, 2));
} finally {
  child.kill();
}
