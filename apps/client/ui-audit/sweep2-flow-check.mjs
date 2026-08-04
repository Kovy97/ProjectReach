#!/usr/bin/env node
/**
 * TESTER 2 ("Der Kämpfer") — Sweep über den neu umgebauten Arena-Kampf-Screen (2026-07-11).
 * Deckt die Grund-Flows ab:
 *  (1) Zonen-Grid (Standardansicht) + Monster-Karten (Prognose-Verdikte, Fight-Buttons).
 *  (2) Kampf starten, Kill abwarten (Kill-Cooldown-Blur NUR auf Monster-Hälfte, Beute-Karte).
 *  (3) Details-Klapper beider Nameplates auf/zu.
 *  (4) Log-Tabs (Log/Ausrüstung) wechseln.
 *  (5) "Kampf beenden" (combat-btn flee) — zurück zur Zonen-Auswahl.
 *  (6) Dungeons-Sektion ansehen, Level-Sortierung prüfen (nur ansehen, nicht betreten).
 * READ-ONLY: keine Quelldateien geändert. Port 5251.
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = "G:\\GameDev\\apps\\client";
const PORT = 5251;
const BASE_URL = `http://localhost:${PORT}`;
const OUT_DIR = "C:\\Users\\MSchu\\AppData\\Local\\Temp\\claude\\G--GameDev\\553d2095-3a73-4795-9782-0fe746a25f13\\scratchpad\\sweep2";

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

const errors = [];
function wirePage(page) {
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
}

const problems = [];
const { child, getOutput } = startDevServer();
try {
  const ok = await waitForServer(BASE_URL);
  if (!ok) { console.error("SERVER NOT UP:\n" + getOutput()); process.exit(1); }
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  wirePage(page);

  await page.goto(`${BASE_URL}/?fixture=midgame`, { waitUntil: "load" });
  await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
  await page.waitForTimeout(2500);
  await clickRetry(page, page.locator('[data-guide-id="sidebar.combat"]').first());
  await page.waitForTimeout(800);

  // ── (1) Zonen-Grid Standardansicht ──────────────────────────────────────────────────────────
  const zoneCount = await page.locator(".zone-card").count();
  console.log("Zonen-Karten:", zoneCount);
  if (zoneCount === 0) problems.push("(1) Keine Zonen-Karten sichtbar");
  await page.screenshot({ path: join(OUT_DIR, "01-zone-grid.png") });
  console.log("SHOT SAVED: 01-zone-grid.png");

  // In erste Zone rein → Monster-Karten mit Prognose + Fight-Buttons.
  await clickRetry(page, page.locator(".zone-card").first());
  await page.waitForTimeout(1000);
  const mcCount = await page.locator(".monster-card").count();
  const prognosisCount = await page.locator(".monster-card-prognosis").count();
  console.log("Monster-Karten:", mcCount, "| mit Prognose:", prognosisCount);
  if (mcCount === 0) problems.push("(1) Keine Monster-Karten in Zone sichtbar");
  if (mcCount > 0 && prognosisCount === 0) problems.push("(1) Prognose-Verdikte fehlen auf Monster-Karten");
  await page.screenshot({ path: join(OUT_DIR, "02-monster-cards.png") });
  console.log("SHOT SAVED: 02-monster-cards.png");

  // ── (2) Kampf starten (erstes Monster) ──────────────────────────────────────────────────────
  await clickRetry(page, page.locator(".mc-fight-btn").first());
  await page.waitForSelector(".battle-arena", { timeout: 8000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: join(OUT_DIR, "03-fight-started.png") });
  console.log("SHOT SAVED: 03-fight-started.png");

  // Kill abwarten (schwaches erstes Monster sollte schnell fallen).
  try {
    await page.waitForSelector(".battle-main .fighter.enemy.cooldown-blur", { timeout: 45000 });
    await page.waitForTimeout(300);
    const cd = await page.evaluate(() => {
      const enemy = document.querySelector(".battle-main .fighter.enemy");
      const player = document.querySelector(".arena-side-player .fighter");
      const card = document.querySelector(".kill-summary-card");
      return {
        enemyFilter: enemy ? getComputedStyle(enemy).filter : null,
        playerFilter: player ? getComputedStyle(player).filter : null,
        cardVisible: card ? card.getBoundingClientRect().width > 100 : false,
      };
    });
    console.log("KILL-COOLDOWN:", JSON.stringify(cd));
    await page.screenshot({ path: join(OUT_DIR, "04-kill-cooldown.png") });
    console.log("SHOT SAVED: 04-kill-cooldown.png");
    if (!cd.enemyFilter || !cd.enemyFilter.includes("blur")) problems.push("(2) Gegner-Hälfte beim Kill nicht geblurrt");
    if (cd.playerFilter && cd.playerFilter !== "none") problems.push(`(2) Spieler-Hälfte mitgeblurrt (${cd.playerFilter})`);
    if (!cd.cardVisible) problems.push("(2) Beute-/Kill-Summary-Karte fehlt/unsichtbar");
    await page.waitForTimeout(3500); // Cooldown ablaufen lassen.
  } catch {
    problems.push("(2) Kein Kill innerhalb 45s beobachtet");
  }

  // ── (3) Details-Klapper beider Nameplates ───────────────────────────────────────────────────
  const toggles = page.locator(".fighter-details-toggle");
  const toggleCount = await toggles.count();
  console.log("Details-Toggles gefunden:", toggleCount);
  if (toggleCount < 2) problems.push(`(3) Erwartet 2 Details-Toggles (Spieler+Gegner), gefunden ${toggleCount}`);
  for (let i = 0; i < toggleCount; i++) {
    await clickRetry(page, toggles.nth(i));
    await page.waitForTimeout(300);
  }
  const openDetails = await page.locator(".fighter-details").count();
  console.log("Offene Details-Panels:", openDetails);
  if (openDetails < toggleCount) problems.push(`(3) Nicht alle Details-Panels öffneten sich (${openDetails}/${toggleCount})`);
  await page.screenshot({ path: join(OUT_DIR, "05-details-open.png") });
  console.log("SHOT SAVED: 05-details-open.png");
  // wieder zuklappen
  for (let i = 0; i < toggleCount; i++) {
    await clickRetry(page, toggles.nth(i));
    await page.waitForTimeout(200);
  }
  const closedDetails = await page.locator(".fighter-details").count();
  if (closedDetails > 0) problems.push(`(3) Details-Panels klappen nicht wieder zu (${closedDetails} noch offen)`);

  // ── (4) Log-Tabs wechseln ───────────────────────────────────────────────────────────────────
  const logTabs = page.locator(".battle-log-tab");
  const logTabCount = await logTabs.count();
  console.log("Log-Tabs:", logTabCount);
  if (logTabCount < 2) problems.push(`(4) Erwartet 2 Log-Tabs (Log/Ausrüstung), gefunden ${logTabCount}`);
  await page.screenshot({ path: join(OUT_DIR, "06-log-tab-log.png") });
  console.log("SHOT SAVED: 06-log-tab-log.png");
  if (logTabCount >= 2) {
    await clickRetry(page, logTabs.nth(1));
    await page.waitForTimeout(400);
    const activeIsEquip = await logTabs.nth(1).evaluate((el) => el.classList.contains("active"));
    if (!activeIsEquip) problems.push("(4) Ausrüstungs-Tab wird nach Klick nicht aktiv");
    await page.screenshot({ path: join(OUT_DIR, "07-log-tab-equipment.png") });
    console.log("SHOT SAVED: 07-log-tab-equipment.png");
    await clickRetry(page, logTabs.nth(0));
    await page.waitForTimeout(300);
  }

  // ── (5) "Kampf beenden" ─────────────────────────────────────────────────────────────────────
  const fleeBtn = page.locator(".combat-btn.flee");
  const fleeVisible = await fleeBtn.count();
  if (fleeVisible === 0) problems.push('(5) "Kampf beenden"-Button nicht gefunden');
  else {
    await clickRetry(page, fleeBtn.first());
    await page.waitForTimeout(800);
    // Kampf beenden führt zurück zur Monster-Liste DIESER Zone (nicht zum Top-Level-Zonen-Grid) —
    // dort erwarten wir Monster-Karten, kein .zone-card.
    const backToMonsterList = await page.locator(".monster-card").count();
    console.log("Nach Kampf-beenden: Monster-Karten sichtbar:", backToMonsterList);
    if (backToMonsterList === 0) problems.push('(5) Nach "Kampf beenden" keine Monster-Auswahl sichtbar');
    await page.screenshot({ path: join(OUT_DIR, "08-after-flee.png") });
    console.log("SHOT SAVED: 08-after-flee.png");
    // Einen Schritt weiter zurück zum Top-Level-Zonen-Grid (für den Dungeon-Check unten).
    const zoneBackBtn = page.locator(".zone-back");
    if (await zoneBackBtn.count() > 0) {
      await clickRetry(page, zoneBackBtn.first());
      await page.waitForTimeout(600);
    }
  }

  // ── (6) Dungeons-Sektion ansehen, Level-Sortierung prüfen ───────────────────────────────────
  const dungeonHeading = page.locator(".dungeon-heading");
  if (await dungeonHeading.count() > 0) {
    await dungeonHeading.first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await page.screenshot({ path: join(OUT_DIR, "09-dungeons-section.png") });
    console.log("SHOT SAVED: 09-dungeons-section.png");
    const levels = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll(".dungeon-card"));
      return cards.map((c) => {
        const txt = c.querySelector(".monster-card-level-badge, .mc-level-num, [class*='level']")?.textContent ?? "";
        return txt;
      });
    });
    console.log("Dungeon-Karten-Reihenfolge (Level-Labels):", JSON.stringify(levels));
    // Reine visuelle Sortierprüfung überlassen wir dem Screenshot (Label-Text ist nicht rein numerisch parsebar
    // über verschiedene Sprachen hinweg) — wir prüfen nur, dass mind. 1 Karte da ist.
    if (levels.length === 0) problems.push("(6) Keine Dungeon-Karten gefunden");
  } else {
    problems.push("(6) Dungeons-Sektions-Überschrift nicht gefunden");
  }

  console.log(problems.length ? "PROBLEME:\n- " + problems.join("\n- ") : "ALLE CHECKS GRÜN");
  console.log(errors.length ? `${errors.length} page errors:\n` + errors.slice(0, 15).join("\n") : "no page errors");
  await browser.close();
  process.exitCode = problems.length || errors.length ? 1 : 0;
} finally {
  child.kill();
}
