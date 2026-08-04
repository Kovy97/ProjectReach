#!/usr/bin/env node
/**
 * Task #345 (Chef-Entscheid 25.07.) self-check: Dungeon-Zutritt nur noch über Quest-Gates —
 * die Kampfstufe ist Empfehlung + Warnung, keine Sperre mehr.
 *
 * Szenario (Muster dungeon-labels-342-shot.mjs): midgame-Fixture (CL~30) + chronicle_03/04
 * completed -> goblin_warband ist quest-offen, der Charakter aber klar UNTER der Empfehlung 45.
 * Erwartung (EN+DE, 1920x1080):
 *  - Karten-Meta: "Empfohlen: Kampfstufe 45" / "Recommended: Combat Lv 45" (combat.dungeonLevel).
 *  - Warnzeile statt Sperr-Grund: combat.dungeonLevelWarn ("Empfohlen: Kampfstufe 45 · Deine: 30").
 *  - Der Betreten-Button ist AKTIV (enterDisabled === false) — das war vorher die Sperre.
 *  - Gegenprobe: ein quest-GESPERRTER Dungeon (wildwood_hunt) bleibt gesperrt (kein Button).
 * Port 5345.
 */
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5345;
const BASE_URL = `http://localhost:${PORT}`;
const OUT_DIR = "C:\\Users\\MSchu\\AppData\\Local\\Temp\\claude\\G--GameDev\\85edb3a2-2fd2-41b3-a534-53012ba5a3bd\\scratchpad\\dungeon-gates-345";
mkdirSync(OUT_DIR, { recursive: true });

function startDevServer() {
  const viteBin = join(CLIENT_DIR, "node_modules", "vite", "bin", "vite.js");
  const child = spawn(
    process.execPath,
    [viteBin, "dev", "--config", join(CLIENT_DIR, "ui-audit", "vite.tour.config.mjs"), "--port", String(PORT), "--strictPort"],
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

const problems = [];
const errors = [];

function wirePage(page, tag) {
  page.on("pageerror", (e) => errors.push(`[${tag}] pageerror: ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error") errors.push(`[${tag}] console: ${m.text()}`); });
}

/** Liest Meta-Zeilen + Button-Zustand einer Dungeon-Karte anhand ihres (lokalisierten) Namens. */
async function readCard(page, nameMatch) {
  return page.evaluate((needle) => {
    const el = [...document.querySelectorAll(".dungeon-card")].find(
      (c) => c.querySelector(".zone-card-name")?.textContent.includes(needle),
    );
    if (!el) return { found: false };
    const otherMeta = [...el.querySelectorAll(".zone-card-meta:not(.dungeon-card-zone)")].map((n) => n.textContent.trim());
    return {
      found: true,
      storyLocked: el.classList.contains("zone-card-story-locked"),
      otherMeta,
      hasEnterBtn: !!el.querySelector(".dungeon-enter"),
      enterDisabled: el.querySelector(".dungeon-enter")?.disabled ?? null,
      enterTitle: el.querySelector(".dungeon-enter")?.getAttribute("title") ?? null,
    };
  }, nameMatch);
}

async function runScenario(page, locale) {
  await page.goto(`${BASE_URL}/?fixture=midgame`, { waitUntil: "load" });
  await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
  await page.waitForFunction(() => !!window.__hfDebug, null, { timeout: 8000 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    const { state } = window.__hfDebug;
    for (const id of ["chronicle_03", "chronicle_04"]) {
      if (!state.quests.completed.includes(id)) state.quests.completed.push(id);
    }
  });
  await page.waitForTimeout(1000);

  await clickRetry(page, page.locator('[data-guide-id="sidebar.combat"]').first());
  await page.waitForSelector(".combat-page", { timeout: 8000 });
  await page.waitForTimeout(400);
  const dungeonsHeading = page.locator("h2.dungeon-heading", { hasText: "Dungeons" }).first();
  await dungeonsHeading.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(OUT_DIR, `underleveled-${locale}.png`), fullPage: false });
  console.log(`SHOT SAVED: underleveled-${locale}.png`);
  const grid = dungeonsHeading.locator("xpath=following-sibling::div[contains(@class,'zone-grid')][1]");
  await grid.screenshot({ path: join(OUT_DIR, `underleveled-grid-${locale}.png`) }).catch(() => {});

  const warbandName = locale === "en" ? "The Goblin Warband" : "Die Goblin-Kriegsbande";
  const wildwoodName = locale === "en" ? "The Wildwood Hunt" : "Die Wildwald-Jagd";
  const recommended = locale === "en" ? "Recommended: Combat Lv 45" : "Empfohlen: Kampfstufe 45";
  const warnRec = locale === "en" ? "Recommended: combat level 45" : "Empfohlen: Kampfstufe 45";
  const warnYours = locale === "en" ? "Yours:" : "Deine:";

  const warband = await readCard(page, warbandName);
  console.log(`[${locale} warband] ${JSON.stringify(warband)}`);
  if (!warband.found) problems.push(`${locale}: Warband-Karte nicht gefunden`);
  else {
    const main = warband.otherMeta[0] ?? "";
    if (!main.includes(recommended)) problems.push(`${locale}: Hauptzeile "${main}" ohne "${recommended}"`);
    const warn = warband.otherMeta[1] ?? "";
    if (!warn.includes(warnRec) || !warn.includes(warnYours)) {
      problems.push(`${locale}: Warnzeile "${warn}" ohne "${warnRec}" + "${warnYours}"`);
    }
    if (warband.storyLocked) problems.push(`${locale}: Warband unerwartet story-locked`);
    // DER Kern von #345: Button aktiv trotz Unterlevel.
    if (warband.enterDisabled !== false) problems.push(`${locale}: Enter-Button disabled=${warband.enterDisabled}, erwartet false (kein Level-Gate mehr)`);
    if (!warband.enterTitle || !warband.enterTitle.includes(warnRec)) {
      problems.push(`${locale}: Button-Tooltip "${warband.enterTitle}" trägt die Empfehlungs-Warnung nicht`);
    }
  }

  // Gegenprobe: Quest-Gate sperrt weiterhin hart (wildwood_hunt hinter späterer Chronik).
  const wildwood = await readCard(page, wildwoodName);
  console.log(`[${locale} wildwood] ${JSON.stringify(wildwood)}`);
  if (!wildwood.found) problems.push(`${locale}: Wildwood-Karte nicht gefunden`);
  else {
    if (!wildwood.storyLocked) problems.push(`${locale}: Wildwood muesste quest-gesperrt sein`);
    if (wildwood.hasEnterBtn) problems.push(`${locale}: Wildwood zeigt trotz Sperre einen Enter-Button`);
  }
}

const { child, getOutput } = startDevServer();
try {
  const ok = await waitForServer(BASE_URL);
  if (!ok) { console.error("SERVER NOT UP:\n" + getOutput()); process.exit(1); }
  const browser = await chromium.launch();

  for (const locale of ["en", "de"]) {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
    wirePage(page, locale);
    if (locale === "en") {
      await page.addInitScript(() => { try { localStorage.setItem("hearthforge:locale", "en"); } catch {} });
    }
    await runScenario(page, locale);
    await page.close();
  }

  await browser.close();

  console.log(problems.length ? "PROBLEME:\n- " + problems.join("\n- ") : "ALLE CHECKS GRÜN");
  console.log(errors.length ? `${errors.length} page errors:\n` + errors.slice(0, 12).join("\n") : "no page errors");
  if (problems.length || errors.length) process.exitCode = 1;
} finally {
  child.kill();
}
