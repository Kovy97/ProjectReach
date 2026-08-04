#!/usr/bin/env node
/**
 * UI-Dev self-check: Skill-ETA + laufende-Aktion-Raten + Mastery-Mini-Anzeige (Chef-Auftrag
 * "Skill-Seiten bekommen ETA + lebende Zahlen"). Port 5211 per Chef-Vorgabe.
 *
 * Prüft:
 *  1. Skill-XP-Leiste (Titelzeile, LevelXpBar) zeigt eine ETA ("Level N in …"), solange eine
 *     Aktion GENAU dieses Skills läuft (midgame-Fixture hat `mine_gravesteel` aktiv → Mining-Seite).
 *  2. Die gelbe Aktions-Leiste (ActionProgressBar) zeigt XP/h · Ertrag/h für die laufende Aktion.
 *  3. Jede Skillkarte zeigt XP/h + Ertrag/h (Vorschau-Kacheln) UND eine Mastery-Mini-Anzeige.
 *  4. Smithing (Crafting-Skill) zeigt dieselben Kacheln + Mastery-Badges auf NICHT-aktiven Karten.
 */
import { spawn } from "node:child_process";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const CLIENT_DIR = "G:\\GameDev\\apps\\client";
const PORT = 5211;
const BASE_URL = `http://localhost:${PORT}`;
const OUT_DIR = "C:\\Users\\MSchu\\AppData\\Local\\Temp\\claude\\G--GameDev\\553d2095-3a73-4795-9782-0fe746a25f13\\scratchpad";

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

async function clickWithReloadRetry(page, locator, opts = {}) {
  try {
    await locator.click({ timeout: 6000, ...opts });
  } catch {
    await page.waitForTimeout(400);
    await locator.click({ timeout: 6000, ...opts });
  }
}

async function readTitleBar(page) {
  return page.evaluate(() => {
    const levelBar = document.querySelector(".tb-bar--level");
    const actionBar = document.querySelector(".tb-bar--action");
    return {
      levelCenter: levelBar?.querySelector(".tb-bar-label-center")?.textContent?.trim() ?? null,
      levelEta: levelBar?.querySelector(".tb-bar-label-right")?.textContent?.trim() ?? null,
      actionCenter: actionBar?.querySelector(".tb-bar-label-center")?.textContent?.trim() ?? null,
      actionRate: actionBar?.querySelector(".tb-bar-label-right")?.textContent?.trim() ?? null,
    };
  });
}

async function readCards(page) {
  return page.evaluate(() => {
    return Array.from(document.querySelectorAll(".skillcard")).slice(0, 8).map((card) => {
      const title = card.querySelector(".skillcard-title")?.textContent?.trim() ?? "?";
      const tiles = Array.from(card.querySelectorAll(".skillcard-tile")).map((tile) => {
        const label = tile.querySelector("small")?.textContent?.trim();
        const value = tile.querySelector("b")?.textContent?.trim();
        return `${label}=${value}`;
      });
      const mastery = card.querySelector(".skillcard-mastery")?.textContent?.replace(/\s+/g, " ").trim() ?? "MISSING";
      const active = card.classList.contains("active");
      return { title, active, tiles, mastery };
    });
  });
}

async function run(browser) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", (e) => { errors.push("pageerror: " + e.message); });
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });

  await page.goto(`${BASE_URL}/?fixture=midgame`, { waitUntil: "load" });
  await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
  await page.waitForTimeout(3500); // load-toasts abklingen lassen

  // ── Mining (aktive Aktion aus der Fixture: mine_gravesteel) — ETA + Raten sichtbar ──
  await clickWithReloadRetry(page, page.locator('[data-guide-id="sidebar.mining"]').first());
  await page.waitForTimeout(1200);

  const miningBar = await readTitleBar(page);
  console.log("\n[mining] title bar:", JSON.stringify(miningBar, null, 2));

  await page.screenshot({ path: join(OUT_DIR, "skill-eta-mining-full.png"), fullPage: false });
  console.log("SHOT SAVED: skill-eta-mining-full.png");

  const header = page.locator(".content-header").first();
  await header.screenshot({ path: join(OUT_DIR, "skill-eta-mining-titlebar.png") });
  console.log("SHOT SAVED: skill-eta-mining-titlebar.png");

  const miningCards = await readCards(page);
  console.log("[mining] cards:", JSON.stringify(miningCards, null, 2));

  const activeCard = page.locator(".skillcard.active").first();
  if (await activeCard.isVisible().catch(() => false)) {
    await activeCard.screenshot({ path: join(OUT_DIR, "skill-eta-mining-activecard.png") });
    console.log("SHOT SAVED: skill-eta-mining-activecard.png");
  }

  // ── Smithing (Crafting-Skill) — Mastery-Mini-Anzeige + Raten auf jeder Karte ──
  await clickWithReloadRetry(page, page.locator('[data-guide-id="sidebar.smithing"]').first());
  await page.waitForTimeout(1200);

  const smithingCards = await readCards(page);
  console.log("\n[smithing] cards:", JSON.stringify(smithingCards, null, 2));

  await page.screenshot({ path: join(OUT_DIR, "skill-eta-smithing-full.png"), fullPage: false });
  console.log("SHOT SAVED: skill-eta-smithing-full.png");

  const firstUnlocked = page.locator(".skillcard:not(.locked)").first();
  if (await firstUnlocked.isVisible().catch(() => false)) {
    await firstUnlocked.screenshot({ path: join(OUT_DIR, "skill-eta-smithing-card.png") });
    console.log("SHOT SAVED: skill-eta-smithing-card.png");
  }

  // ── Thieving — Erfolg/Gold/XP-Kacheln + (kein Ertrag-Feld, aber ETA falls Thieving aktiv) ──
  await clickWithReloadRetry(page, page.locator('[data-guide-id="sidebar.thieving"]').first());
  await page.waitForTimeout(1200);
  const thievingCards = await readCards(page);
  console.log("\n[thieving] cards (sample):", JSON.stringify(thievingCards.slice(0, 3), null, 2));

  console.log("\n" + (errors.length ? `${errors.length} page errors seen:\n` + errors.slice(0, 12).join("\n") : "no page errors"));
  await page.close();
}

const { child, getOutput } = startDevServer();
try {
  const ok = await waitForServer(BASE_URL);
  if (!ok) { console.error("SERVER NOT UP:\n" + getOutput()); process.exit(1); }
  const browser = await chromium.launch();
  await run(browser);
  await browser.close();
} finally {
  child.kill();
}
