#!/usr/bin/env node
/**
 * TESTER 4 ("Der Veteran") — Sweep 4, Brille "Endgame-Systeme", Kapitel 4: SLAYER-TURM & BESTIARIUM
 * (kurzer Gegencheck: Ansicht, keine Crashes). Port 5253 (Tester-4-Zuweisung).
 * Run: node ui-audit/sweep4-towers.mjs   (from apps/client/)
 */
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5253;
const BASE_URL = `http://localhost:${PORT}`;
const OUT_DIR = "C:\\Users\\MSchu\\AppData\\Local\\Temp\\claude\\G--GameDev\\553d2095-3a73-4795-9782-0fe746a25f13\\scratchpad\\sweep4";
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

const allErrors = [];
const findings = [];

const { child, getOutput } = startDevServer();
try {
  const ok = await waitForServer(BASE_URL);
  if (!ok) { console.error("SERVER NOT UP:\n" + getOutput()); process.exit(1); }
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on("pageerror", (e) => allErrors.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") allErrors.push("console: " + m.text()); });

  await page.goto(`${BASE_URL}/?fixture=endgame`, { waitUntil: "load" });
  try {
    await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
  } catch (e) {
    console.log("SIDEBAR NOT FOUND — DEBUG DUMP:");
    console.log("page errors so far:", JSON.stringify(allErrors));
    console.log("body text (first 500):", (await page.locator("body").textContent()).slice(0, 500));
    await page.screenshot({ path: join(OUT_DIR, "tw-debug-load-fail.png") });
    throw e;
  }
  await page.waitForTimeout(4200);

  // ── Slayer-Turm-Sektion auf der Kampf-Seite ────────────────────────────────────────────────────
  await clickRetry(page, page.locator('[data-guide-id="sidebar.combat"]').first());
  await page.waitForSelector(".combat-page", { timeout: 10000 });
  const towerHeading = page.locator(".slayer-tower-heading");
  const hasTower = (await towerHeading.count()) > 0;
  console.log(`[slayer-tower] Sektion vorhanden: ${hasTower}`);
  if (!hasTower) {
    findings.push("MITTEL: Slayer-Turm-Sektion auf der Kampf-Seite nicht gefunden");
  } else {
    await towerHeading.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    await page.screenshot({ path: join(OUT_DIR, "tw1-slayer-tower-list.png") });
    console.log("SHOT SAVED: tw1-slayer-tower-list.png");
    const floors = await page.evaluate(() => [...document.querySelectorAll(".slayer-floor-zone-card")].map((el) => ({
      locked: el.classList.contains("locked-floor"),
      name: el.querySelector(".zone-card-name")?.textContent?.trim(),
    })));
    console.log(`[slayer-tower] Etagen: ${JSON.stringify(floors)}`);
    const unlockedFloors = floors.filter((f) => !f.locked);
    if (floors.length === 0) findings.push("MITTEL: Keine Slayer-Turm-Etagen-Karten gerendert");
    if (unlockedFloors.length === 0) findings.push("KOSMETISCH: Bei CL96/Slayer 97 (endgame-Fixture) ist keine Slayer-Turm-Etage entsperrt — evtl. Erwartungswert prüfen");

    if (unlockedFloors.length > 0) {
      await clickRetry(page, page.locator(".slayer-floor-zone-card:not(.locked-floor)").first());
      await page.waitForTimeout(500);
      await page.screenshot({ path: join(OUT_DIR, "tw2-slayer-tower-floor-open.png") });
      console.log("SHOT SAVED: tw2-slayer-tower-floor-open.png");
      const monsterCards = await page.locator(".monster-card, .mc-fight-btn").count();
      console.log(`[slayer-tower] Monster-Karten nach Etagen-Klick: ${monsterCards}`);
      if (monsterCards === 0) findings.push("MITTEL: Slayer-Turm-Etage öffnet, zeigt aber keine Monster-Kampfkarten");
    }
  }

  // ── Bestiarium ──────────────────────────────────────────────────────────────────────────────────
  await clickRetry(page, page.locator('[data-guide-id="topbar.bestiary"]').first());
  const bestiaryOk = await page.waitForSelector(".bestiary-page", { timeout: 10000 }).then(() => true).catch(() => false);
  if (!bestiaryOk) {
    findings.push("KRITISCH: Bestiarium-Seite lädt nicht (.bestiary-page fehlt)");
  } else {
    await page.waitForTimeout(400);
    await page.screenshot({ path: join(OUT_DIR, "tw3-bestiary-overview.png"), fullPage: true });
    console.log("SHOT SAVED: tw3-bestiary-overview.png");
    const headerText = await page.locator(".bestiary-count").first().textContent().catch(() => null);
    console.log(`[bestiary] Fortschritts-Header: "${headerText}"`);
    if (!headerText || !/\d+\/\d+/.test(headerText)) findings.push("KOSMETISCH: Bestiarium-Fortschritts-Header zeigt kein n/n-Format");
    // Slayer-Turm-Zone im Bestiarium (dg_-Dopplungs-Regression aus dungeon-dramaturgy-shot.mjs
    // betraf borderlands/crypt — hier nur ein genereller Crash-/Dopplungs-Streufang).
    const dupeCheck = await page.evaluate(() => {
      const names = [...document.querySelectorAll(".bestiary-name")].map((el) => el.textContent);
      const dupes = names.filter((n, i) => n && n !== "???" && names.indexOf(n) !== i);
      return { total: names.length, dupes: [...new Set(dupes)] };
    });
    console.log(`[bestiary] Karten gesamt: ${dupeCheck.total}, Dopplungen: ${JSON.stringify(dupeCheck.dupes)}`);
    if (dupeCheck.dupes.length > 0) findings.push(`MITTEL: Bestiarium zeigt doppelte Monster-Namen: ${dupeCheck.dupes.join(", ")}`);
  }

  await browser.close();
  console.log("\n=== FINDINGS ===");
  console.log(findings.length ? findings.map((f) => "- " + f).join("\n") : "keine (alle Checks grün)");
  console.log(`\n=== PAGE ERRORS (${allErrors.length}) ===`);
  console.log(allErrors.length ? allErrors.slice(0, 30).join("\n") : "keine Konsolenfehler");
} finally {
  child.kill();
}
