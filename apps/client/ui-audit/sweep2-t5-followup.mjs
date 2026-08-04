#!/usr/bin/env node
/**
 * T5 Sweep — Follow-up: (A) Slayer-Reroll mit korrektem Warte-Polling (Haupt-Skript hatte nur
 * 3/40 Samples wegen Render-Lag), (B) idolhall-Zonen-Karten-Abwesenheit gegenprüfen (0 Welt-
 * Monster, dungeonOnly-only per Design §5.3 — nur verifizieren, kein erneuter Vollsweep).
 */
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5254;
const BASE_URL = `http://localhost:${PORT}`;

function startDevServer() {
  const viteBin = join(CLIENT_DIR, "node_modules", "vite", "bin", "vite.js");
  const child = spawn(process.execPath, [viteBin, "dev", "--config", join(CLIENT_DIR, "ui-audit", "vite.tour.config.mjs"), "--port", String(PORT), "--strictPort"], { cwd: CLIENT_DIR, stdio: ["ignore", "pipe", "pipe"] });
  let out = "";
  child.stdout.on("data", (d) => (out += d.toString()));
  child.stderr.on("data", (d) => (out += d.toString()));
  return { child, getOutput: () => out };
}
async function waitForServer(url, t = 40000) {
  const s = Date.now();
  while (Date.now() - s < t) { try { const r = await fetch(url); if (r.ok) return true; } catch {} await new Promise((r) => setTimeout(r, 300)); }
  return false;
}
async function clickRetry(page, locator, opts = {}) {
  try { await locator.click({ timeout: 6000, ...opts }); } catch { await page.waitForTimeout(400); await locator.click({ timeout: 6000, ...opts }); }
}
async function routeFixtureNoTours(page) {
  await page.route("**/ui-audit-fixtures/midgame.json", async (route) => {
    const res = await route.fetch();
    const json = JSON.parse(await res.text());
    json.state.onboarding = { active: false, step: 0, done: true, toursSeen: { combat: true, shop: true, bank: true } };
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(json) });
  });
}

const { child, getOutput } = startDevServer();
try {
  const ok = await waitForServer(BASE_URL);
  if (!ok) { console.error("SERVER NOT UP:\n" + getOutput()); process.exit(1); }
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.addInitScript(() => { try { localStorage.setItem("hearthforge:locale", "de"); } catch {} });
  await routeFixtureNoTours(page);
  await page.goto(`${BASE_URL}/?fixture=midgame`, { waitUntil: "load" });
  await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
  await page.waitForFunction(() => !!window.__hfDebug, null, { timeout: 8000 });
  await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(1000);

  await page.evaluate(() => {
    const { state } = window.__hfDebug;
    state.quests.completed = []; state.quests.claimed = []; state.dungeonsUnlocked = {}; state.legacyZoneGrants = {}; state.slayerTask = null;
    for (const id of ["attack", "power", "ranged", "magic", "defence", "warding", "vitality", "slayer"]) {
      (state.skills[id] ??= { xp: 0 }).xp = 999_999_999;
      (state.capeCeremonySeen ??= {})[id] = true;
    }
  });

  // ── (B) idolhall: bestätigen, dass ALLE Monster der Zone dungeonOnly sind (Design §5.3) ──
  const idolhallCheck = await page.evaluate(() => {
    const { content } = window.__hfDebug;
    const mons = Object.values(content.monsters).filter((m) => m.zone === "idolhall");
    return { count: mons.length, allDungeonOnly: mons.every((m) => m.dungeonOnly === true), ids: mons.map((m) => m.id) };
  });
  console.log("IDOLHALL Monster-Check: " + JSON.stringify(idolhallCheck));

  // ── (A) Slayer-Reroll mit Polling statt festem Timeout ──
  const partialChapters = Array.from({ length: 8 }, (_, i) => `chronicle_${String(i + 1).padStart(2, "0")}`);
  await page.evaluate((chapters) => {
    const s = window.__hfDebug.state;
    s.quests.completed = [...chapters]; s.quests.claimed = [...chapters]; s.dungeonsUnlocked = {}; s.slayerTask = null;
  }, partialChapters);
  await page.waitForTimeout(200);
  const lockedZoneIds = await page.evaluate(() => {
    const { state, content } = window.__hfDebug;
    return content.zones.filter((z) => z.requiresQuest && !(state.quests.claimed.includes(z.requiresQuest) || state.quests.completed.includes(z.requiresQuest))).map((z) => z.id);
  });
  console.log("Gesperrte Zonen für Slayer-Test: " + JSON.stringify(lockedZoneIds));

  await clickRetry(page, page.locator('[data-guide-id="sidebar.slayer"]').first());
  await page.waitForSelector(".slayer-page", { timeout: 8000 });
  await page.waitForTimeout(300);

  const N = 50;
  let violations = 0, assigned = 0, towerCount = 0, worldCount = 0;
  const worldZoneTally = {};
  for (let i = 0; i < N; i++) {
    await page.evaluate(() => { window.__hfDebug.state.slayerTask = null; });
    // Poll bis der "Get Task"-Button wieder im DOM UND enabled ist (Render-Lag nach direkter State-Mutation).
    let btn = page.locator(".slayer-get-task-btn").first();
    let ready = false;
    for (let tries = 0; tries < 20; tries++) {
      const count = await btn.count();
      if (count > 0 && !(await btn.isDisabled().catch(() => true))) { ready = true; break; }
      await page.waitForTimeout(100);
    }
    if (!ready) { console.log(`  [${i}] Get-Task-Button nie bereit (echtes 'kein Master'?)`); continue; }
    await btn.click({ timeout: 4000 }).catch((e) => console.log(`  [${i}] click failed: ${e.message}`));
    let task = null;
    for (let tries = 0; tries < 20; tries++) {
      task = await page.evaluate(() => window.__hfDebug.state.slayerTask);
      if (task) break;
      await page.waitForTimeout(100);
    }
    if (!task) { console.log(`  [${i}] kein Task nach Klick zugewiesen`); continue; }
    assigned++;
    if (task.isTower) towerCount++; else worldCount++;
    const zone = await page.evaluate((mid) => window.__hfDebug.content.monsters[mid]?.zone ?? null, task.monsterId);
    if (zone) worldZoneTally[zone] = (worldZoneTally[zone] ?? 0) + 1;
    if (zone && lockedZoneIds.includes(zone)) {
      violations++;
      console.log(`  [${i}] VERSTOSS: Monster "${task.monsterId}" aus gesperrter Zone "${zone}" (isTower=${task.isTower})`);
    }
  }
  console.log(`\nSLAYER Follow-up: ${N} Versuche, ${assigned} Tasks (${towerCount} Tower / ${worldCount} Welt), ${violations} Verstöße.`);
  console.log("Welt-Task Zonen-Verteilung: " + JSON.stringify(worldZoneTally));

  await browser.close();
} finally {
  child.kill();
}
