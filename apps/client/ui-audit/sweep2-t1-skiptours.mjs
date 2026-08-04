#!/usr/bin/env node
/**
 * Tester-Sweep 2 (RC 0.1) — T1 "Der Neuling", Lauf B: Skip-Pfad + Erst-Touren. Wegwerf-Skript.
 * Port 5250, Locale de, frisches Spiel Nr. 2.
 *
 *  1. Neues Spiel → Guide erscheint → SOFORT skippen: sofort wirksam? Kommt er nach Navigation
 *     oder Reload (Save laden) wieder?
 *  2. Erst-Touren: erster Besuch Shop → Tour, SKIP → sofort weg + beim zweiten Besuch nicht
 *     wieder. Bank → Tour komplett durchklicken. Combat → Tour, skip.
 *  3. Manuell speichern, Seite neu laden, Spielstand laden → keine der Touren erscheint erneut,
 *     Haupt-Guide bleibt weg.
 */
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5250;
const BASE_URL = `http://localhost:${PORT}`;
const OUT_DIR = "C:\\Users\\MSchu\\AppData\\Local\\Temp\\claude\\G--GameDev\\553d2095-3a73-4795-9782-0fe746a25f13\\scratchpad\\sweep2-t1";
mkdirSync(OUT_DIR, { recursive: true });

const problems = [];
const notes = [];
const errors = [];

setTimeout(() => { console.error("WATCHDOG: 300s überschritten — Abbruch"); process.exit(3); }, 300000);

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

async function shot(page, name) {
  await page.screenshot({ path: join(OUT_DIR, name + ".png") });
  console.log("SHOT: " + name + ".png");
}

async function guideVisible(page) {
  return (await page.locator(".onboarding-guide-root").count()) > 0;
}

const { child, getOutput } = startDevServer();
let browser = null;
try {
  if (!(await waitForServer(BASE_URL))) { console.error("SERVER NOT UP:\n" + getOutput()); process.exit(1); }

  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.setDefaultTimeout(15000);
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });

  // ── Neues Spiel ────────────────────────────────────────────────────────────────────────────
  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.locator(".menu-nav-btn").first().click();
  await page.waitForTimeout(400);
  await page.locator(".menu-slot-actions button").first().click();
  await page.waitForSelector(".creation", { timeout: 8000 });
  await page.locator(".creation-input").first().fill("Skippy");
  await page.locator(".creation-style-card").first().click();
  await page.waitForTimeout(150);
  await page.locator(".creation-start").click();
  await page.waitForSelector(".onboarding-guide-root", { timeout: 10000 });
  await page.waitForTimeout(500);

  // ── 1) Guide sofort skippen ────────────────────────────────────────────────────────────────
  const skipLabel = await page.locator(".guide-bubble-skip").textContent();
  console.log(`Skip-Button-Label: "${skipLabel.trim()}"`);
  await shot(page, "e01-guide-before-skip");
  await page.locator(".guide-bubble-skip").click();
  await page.waitForTimeout(400); // Mutation greift beim nächsten Loop-Tick (~100ms)
  if (await guideVisible(page)) {
    await page.waitForTimeout(1000);
    if (await guideVisible(page)) problems.push("Guide-Skip NICHT sofort wirksam (Overlay nach 1.4s noch da)");
    else notes.push("Guide-Skip brauchte >400ms bis das Overlay verschwand");
  } else console.log("Skip sofort wirksam (Overlay weg nach <=400ms)");
  await shot(page, "e02-after-skip");

  // Navigation → Guide darf nicht wiederkommen
  for (const target of ['[data-guide-id="topbar.character"]', '[data-guide-id="sidebar.woodcutting"]', '[data-guide-id="topbar.bestiary"]']) {
    await page.locator(target).first().click();
    await page.waitForTimeout(500);
    if (await guideVisible(page)) { problems.push(`Haupt-Guide erscheint nach Skip wieder (bei ${target})`); break; }
  }
  console.log("Guide nach Skip + Navigation: weg (sofern kein Problem gemeldet)");

  // ── 2) Erst-Touren ─────────────────────────────────────────────────────────────────────────
  // SHOP: Tour erwartet → sofort skippen
  await page.locator('[data-guide-id="topbar.shop"]').first().click();
  await page.waitForTimeout(900);
  const shopTour = await guideVisible(page);
  console.log("Shop-Erst-Tour erschienen: " + shopTour);
  if (!shopTour) problems.push("Shop-Erst-Tour erscheint NICHT beim ersten Besuch");
  else {
    const info = await page.evaluate(() => ({
      speaker: document.querySelector(".guide-bubble .npc-bubble-name")?.textContent.trim() ?? null,
      title: document.querySelector(".guide-bubble-title")?.textContent.trim() ?? null,
    }));
    console.log("Shop-Tour Schritt 1: " + JSON.stringify(info));
    await shot(page, "e03-shop-tour");
    await page.locator(".guide-bubble-skip").click();
    await page.waitForTimeout(400);
    if (await guideVisible(page)) problems.push("Shop-Tour-Skip nicht sofort wirksam");
    else console.log("Shop-Tour-Skip sofort wirksam");
  }
  // weg + zurück → nicht wieder
  await page.locator('[data-guide-id="topbar.character"]').first().click();
  await page.waitForTimeout(400);
  await page.locator('[data-guide-id="topbar.shop"]').first().click();
  await page.waitForTimeout(900);
  if (await guideVisible(page)) problems.push("Shop-Erst-Tour erscheint nach Skip beim ZWEITEN Besuch erneut");
  else console.log("Shop-Tour beim zweiten Besuch: weg (OK)");

  // BANK: Tour komplett durchklicken
  await page.locator('[data-guide-id="topbar.bank"]').first().click();
  await page.waitForTimeout(900);
  let bankSteps = 0;
  const bankLog = [];
  while (bankSteps < 12) {
    if (!(await guideVisible(page))) break;
    const info = await page.evaluate(() => ({
      speaker: document.querySelector(".guide-bubble .npc-bubble-name")?.textContent.trim() ?? null,
      title: document.querySelector(".guide-bubble-title")?.textContent.trim() ?? null,
      body: (document.querySelector(".guide-bubble-body")?.textContent.trim() ?? "").slice(0, 90),
      cont: document.querySelector(".guide-bubble-footer button.combat-btn")?.textContent.trim() ?? null,
    }));
    bankLog.push(info);
    console.log(`[bank-tour ${bankSteps}] "${info.title}" (${info.cont})`);
    if (bankSteps === 0) await shot(page, "e04-bank-tour");
    if (!info.cont) { problems.push("Bank-Tour: kein Weiter-Button → Hänger"); break; }
    await page.locator(".guide-bubble-footer button.combat-btn").click();
    await page.waitForTimeout(450);
    bankSteps += 1;
  }
  console.log(`Bank-Tour: ${bankSteps} Schritte`);
  if (bankSteps === 0) problems.push("Bank-Erst-Tour erscheint NICHT beim ersten Besuch");
  writeFileSync(join(OUT_DIR, "bank-tour-log.json"), JSON.stringify(bankLog, null, 2));
  // zurück → nicht wieder
  await page.locator('[data-guide-id="topbar.character"]').first().click();
  await page.waitForTimeout(400);
  await page.locator('[data-guide-id="topbar.bank"]').first().click();
  await page.waitForTimeout(900);
  if (await guideVisible(page)) problems.push("Bank-Erst-Tour erscheint nach komplettem Durchklicken erneut");
  else console.log("Bank-Tour nach Abschluss: weg (OK)");

  // COMBAT: Tour → skip
  await page.locator('[data-guide-id="sidebar.combat"]').first().click();
  await page.waitForTimeout(900);
  const combatTour = await guideVisible(page);
  console.log("Combat-Erst-Tour erschienen: " + combatTour);
  if (!combatTour) problems.push("Combat-Erst-Tour erscheint NICHT beim ersten Besuch (Lauf B)");
  else {
    await shot(page, "e05-combat-tour");
    await page.locator(".guide-bubble-skip").click();
    await page.waitForTimeout(400);
    if (await guideVisible(page)) problems.push("Combat-Tour-Skip nicht sofort wirksam");
  }

  // ── 3) Speichern → Reload → Laden → nichts kommt wieder ───────────────────────────────────
  await page.locator(".sb-footer-save").click();
  await page.waitForTimeout(800);
  console.log("Manuell gespeichert. Reload...");
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  // Hauptmenü → Spiel laden
  await page.locator(".menu-nav-btn").nth(1).click();
  await page.waitForTimeout(500);
  await shot(page, "e06-load-panel");
  const loadBtn = page.locator(".menu-slot-actions button", { hasText: /Laden|Load/i }).first();
  if (await loadBtn.count()) await loadBtn.click();
  else await page.locator(".menu-slot-actions button").first().click();
  await page.waitForSelector(".sidebar", { timeout: 10000 });
  await page.waitForTimeout(1200);
  if (await guideVisible(page)) problems.push("Nach Reload+Laden: Haupt-Guide/Tour erscheint sofort wieder");

  for (const [name, sel, wait] of [
    ["Shop", '[data-guide-id="topbar.shop"]', 900],
    ["Bank", '[data-guide-id="topbar.bank"]', 900],
    ["Combat", '[data-guide-id="sidebar.combat"]', 900],
  ]) {
    await page.locator(sel).first().click();
    await page.waitForTimeout(wait);
    if (await guideVisible(page)) problems.push(`${name}-Erst-Tour erscheint nach Reload ERNEUT (toursSeen nicht persistiert?)`);
    else console.log(`${name}-Tour nach Reload: weg (OK)`);
  }
  await shot(page, "e07-after-reload");

  await browser.close();
  browser = null;
} catch (e) {
  problems.push("FATAL: " + String(e.stack || e).slice(0, 400));
} finally {
  try { if (browser) await browser.close(); } catch {}
  child.kill();
  console.log("\n==== NOTES ====\n" + (notes.length ? notes.join("\n") : "-"));
  console.log("\n==== PROBLEME ====\n" + (problems.length ? problems.map((p) => "- " + p).join("\n") : "KEINE"));
  const uniqErr = [...new Set(errors)];
  console.log("\n==== KONSOLE (" + uniqErr.length + " uniq) ====\n" + uniqErr.slice(0, 15).join("\n"));
  process.exit(problems.length ? 1 : 0);
}
