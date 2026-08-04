#!/usr/bin/env node
/**
 * TESTER 8 ("Der Archivar") — Sprach-/Options-Prefs-Persistenz über Reload + Statistik-Seite +
 * "This Session"-Zeile im Kampf-Loadout.
 *  (1) Sprache (FR) + Sound-Mute + Musik-Aus + Tooltip-Bild-Popup-Aus im Hauptmenü setzen (alles
 *      läuft rein über localStorage, kein Spielstand nötig) → page.reload() → müssen erhalten
 *      bleiben.
 *  (2) Danach: läuft die persistierte Sprache auch INS laufende Spiel durch (Fixture-Load)?
 *  (3) Statistik-Seite: Sektions-Icons laden (kein Emoji-Fallback wo ein echtes Icon erwartet wird),
 *      Vervollständigungs-Balken, Konsolen-Fehler.
 *  (4) "This Session"-Zeile im Kampf-Loadout sichtbar (Sanity, ausführlicher bereits in
 *      session-tally-shot.mjs geprüft).
 * Port 5257.
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5257;
const BASE_URL = `http://localhost:${PORT}`;
const OUT_DIR = "C:\\Users\\MSchu\\AppData\\Local\\Temp\\claude\\G--GameDev\\553d2095-3a73-4795-9782-0fe746a25f13\\scratchpad\\sweep8";

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

const { child, getOutput } = startDevServer();
try {
  const ok = await waitForServer(BASE_URL);
  if (!ok) { console.error("SERVER NOT UP:\n" + getOutput()); process.exit(1); }
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });

  // ═══ (1) Prefs im Hauptmenü setzen ═══
  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);

  await page.locator(".menu-lang .lang-btn", { hasText: /^FR$/ }).click();
  await page.waitForTimeout(300);
  await page.locator(".menu-nav-btn").nth(2).click(); // Optionen-Panel
  await page.waitForTimeout(500);
  const before = await page.evaluate(() => ({
    localeStorage: localStorage.getItem("hearthforge:locale"),
    rows: Array.from(document.querySelectorAll(".menu-opt-row")).slice(0, 3).map((r) => ({
      label: r.querySelector(".menu-opt-label")?.textContent,
      active: r.querySelector("button")?.className.includes("active"),
    })),
  }));
  console.log("VOR TOGGLE:", JSON.stringify(before));
  // Sound stummschalten, Musik aus, Tooltip-Popup aus — Klick auf jede der ersten 3 Zeilen.
  const rows = page.locator(".menu-opt-row button");
  await rows.nth(0).click(); // Sound → stumm
  await page.waitForTimeout(150);
  await rows.nth(1).click(); // Musik → aus
  await page.waitForTimeout(150);
  await rows.nth(2).click(); // Tooltip-Popup → aus
  await page.waitForTimeout(300);
  const after = await page.evaluate(() => ({
    rows: Array.from(document.querySelectorAll(".menu-opt-row")).slice(0, 3).map((r) => ({
      label: r.querySelector(".menu-opt-label")?.textContent,
      active: r.querySelector("button")?.className.includes("active"),
    })),
  }));
  console.log("NACH TOGGLE (vor Reload):", JSON.stringify(after));
  await page.screenshot({ path: join(OUT_DIR, "20-menu-options-toggled.png") });
  console.log("SHOT SAVED: 20-menu-options-toggled.png");

  // ═══ Reload — alles muss erhalten bleiben ═══
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  const localeAfterReload = await page.evaluate(() =>
    document.querySelector(".menu-lang .lang-btn.active")?.textContent ?? null,
  );
  console.log("SPRACHE NACH RELOAD (soll FR sein):", localeAfterReload);
  await page.locator(".menu-nav-btn").nth(2).click();
  await page.waitForTimeout(500);
  const afterReload = await page.evaluate(() => ({
    rows: Array.from(document.querySelectorAll(".menu-opt-row")).slice(0, 3).map((r) => ({
      label: r.querySelector(".menu-opt-label")?.textContent,
      active: r.querySelector("button")?.className.includes("active"),
    })),
  }));
  console.log("PREFS NACH RELOAD (sollen alle wie 'NACH TOGGLE' sein):", JSON.stringify(afterReload));
  await page.screenshot({ path: join(OUT_DIR, "21-menu-options-after-reload.png") });
  console.log("SHOT SAVED: 21-menu-options-after-reload.png");

  // ═══ (2) Persistierte Sprache läuft ins Spiel durch (Fixture-Load) ═══
  await page.goto(`${BASE_URL}/?fixture=midgame`, { waitUntil: "load" });
  await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
  await page.waitForTimeout(4300); // Achievement-Toasts abklingen lassen
  const ingameLocale = await page.evaluate(() => localStorage.getItem("hearthforge:locale"));
  console.log("SPRACHE IM LAUFENDEN SPIEL NACH FIXTURE-LOAD (soll fr sein):", ingameLocale);
  await page.screenshot({ path: join(OUT_DIR, "22-ingame-locale-fr.png") });
  console.log("SHOT SAVED: 22-ingame-locale-fr.png");

  // ═══ (3) Statistik-Seite ═══
  await clickRetry(page, page.locator('[data-guide-id="sidebar.stats"]').first());
  await page.waitForTimeout(700);
  await page.screenshot({ path: join(OUT_DIR, "23-stats-page.png") });
  console.log("SHOT SAVED: 23-stats-page.png");
  const statsInfo = await page.evaluate(() => {
    const sections = Array.from(document.querySelectorAll(".stx-section")).map((s) => s.querySelector(".stx-section-title")?.textContent);
    const sectionIcons = Array.from(document.querySelectorAll(".stx-section-icon img"));
    const brokenSectionIcons = sectionIcons.filter((i) => !(i.complete && i.naturalWidth > 0));
    const medallionIcons = Array.from(document.querySelectorAll(".stx-medallion-icon img"));
    const brokenMedallionIcons = medallionIcons.filter((i) => !(i.complete && i.naturalWidth > 0));
    const emojiFallbacks = document.querySelectorAll(".stx-section-icon span, .stx-medallion-icon span").length;
    const bars = Array.from(document.querySelectorAll(".stx-completion-fill")).map((b) => b.style.width);
    return {
      sectionCount: sections.length,
      sections,
      sectionIconsTotal: sectionIcons.length,
      brokenSectionIcons: brokenSectionIcons.length,
      medallionIconsTotal: medallionIcons.length,
      brokenMedallionIcons: brokenMedallionIcons.length,
      emojiFallbacks,
      completionBars: bars,
    };
  });
  console.log("STATS-PAGE-INFO:", JSON.stringify(statsInfo, null, 1));

  // ═══ (4) "This Session"-Zeile im Kampf-Loadout (Sanity) ═══
  await clickRetry(page, page.locator('[data-guide-id="sidebar.combat"]').first());
  await page.waitForTimeout(600);
  await clickRetry(page, page.locator(".zone-card").first());
  await page.waitForTimeout(1200);
  const sessionRowPresent = await page.evaluate(() => !!document.querySelector(".combat-sidebar .cl-section-session, .cl-section-session"));
  console.log("'THIS SESSION'-ZEILE SICHTBAR:", sessionRowPresent);
  try {
    await page.locator(".cl-section-session").first().screenshot({ path: join(OUT_DIR, "24-session-row.png") });
    console.log("SHOT SAVED: 24-session-row.png");
  } catch (e) {
    console.log("!! Session-Zeile-Screenshot fehlgeschlagen: " + e.message);
  }

  console.log(errors.length ? `${errors.length} PAGE ERRORS:\n` + errors.slice(0, 25).join("\n") : "no page errors");
  await browser.close();
} finally {
  child.kill();
}
