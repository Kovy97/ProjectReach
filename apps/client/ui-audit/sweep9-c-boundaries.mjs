#!/usr/bin/env node
/**
 * TESTER 9 ("Der Chaot") — Kategorie 4: Grenzwerte via ?fixture=sweep9chaos
 * (Gold=0, Inventar randvoll, 5 Buffs, 24-Zeichen-Name — s. gen-fixture-sweep9.mjs).
 * READ-ONLY. Port 5258.
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5258;
const BASE_URL = `http://localhost:${PORT}`;
const OUT_DIR = "C:\\Users\\MSchu\\AppData\\Local\\Temp\\claude\\G--GameDev\\553d2095-3a73-4795-9782-0fe746a25f13\\scratchpad\\sweep9";

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
const findings = [];
try {
  const ok = await waitForServer(BASE_URL);
  if (!ok) { console.error("SERVER NOT UP:\n" + getOutput()); process.exit(1); }
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });

  await page.goto(`${BASE_URL}/?fixture=sweep9chaos`, { waitUntil: "load" });
  await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
  await page.waitForTimeout(4500);

  console.log("=== KATEGORIE 4: GRENZWERTE ===");

  // --- 4a. Charakter-Seite: 24-Zeichen-Name in Nameplate + Charakterbogen. ---
  await clickRetry(page, page.locator('[data-guide-id="topbar.character"]').first());
  await page.waitForTimeout(800);
  const headerName = await page.locator(".header-charinfo-name").first().innerText().catch(() => "?");
  console.log(`Header-Nameplate zeigt: "${headerName}" (Länge ${headerName.length})`);
  const headerNameBox = await page.locator(".header-charinfo-name").first().evaluate((el) => ({
    scrollW: el.scrollWidth, clientW: el.clientWidth, overflow: getComputedStyle(el).overflow,
  })).catch(() => null);
  console.log(`Header-Nameplate Layout: ${JSON.stringify(headerNameBox)}`);
  if (headerNameBox && headerNameBox.scrollW > headerNameBox.clientW + 4 && headerNameBox.overflow === "visible") {
    findings.push({ sev: "KOSMETISCH", title: "24-Zeichen-Name läuft in der Kopfzeile über (overflow:visible, kein Ellipsis)", repro: "Fixture sweep9chaos, Header-Charinfo" });
  }
  await page.screenshot({ path: join(OUT_DIR, "4a-longname-header.png") });
  const csNameEl = page.locator(".cs-name, .char-name, [class*='char-name']").first();
  if (await csNameEl.count() > 0) {
    await csNameEl.screenshot({ path: join(OUT_DIR, "4a-longname-charsheet.png") }).catch(() => {});
  }
  await page.screenshot({ path: join(OUT_DIR, "4a-longname-fullpage.png"), fullPage: false });

  // --- 4b. Inventar randvoll: Beute versuchen aufzunehmen (Kampf starten, sammeln). ---
  const usedSlotsText = await page.locator(".cs-slot-count").first().innerText().catch(() => "?");
  console.log(`Slot-Anzeige: "${usedSlotsText}"`);
  const invFullBadge = await page.locator(".slots-display.full").count();
  console.log(`Header zeigt Inventar-voll-Badge: ${invFullBadge > 0}`);
  await page.screenshot({ path: join(OUT_DIR, "4b-inventory-full.png") });
  // Aktion starten (Mining lief laut Fixture schon) und prüfen, ob App bei vollem Inventar sauber stoppt.
  await clickRetry(page, page.locator('[data-guide-id="sidebar.mining"]').first());
  await page.waitForTimeout(800);
  const startBtn = page.locator("button:has-text('Start'), .sk-action-start, [class*='start-btn']").first();
  if (await startBtn.count() > 0) {
    await startBtn.click().catch(() => {});
    await page.waitForTimeout(3000); // eine Aktions-Runde abwarten
    const stoppedHint = await page.locator(".activity-stopped").count();
    const errCountBefore = errors.length;
    console.log(`Nach Aktions-Start bei vollem Inventar: 'gestoppt'-Hinweis sichtbar=${stoppedHint > 0}, Konsolenfehler seither=${errors.length - errCountBefore}`);
    await page.screenshot({ path: join(OUT_DIR, "4b-mining-fullinv-result.png") });
  } else {
    console.log("Kein Start-Button auf Mining-Seite gefunden (Selektor evtl. anders).");
  }

  // --- 4c. Gold=0: überall einkaufen versuchen. ---
  await clickRetry(page, page.locator('[data-guide-id="topbar.shop"]').first());
  await page.waitForTimeout(800);
  const goldDisplay = await page.locator(".shopv2-balance-amount").first().innerText().catch(() => "?");
  console.log(`Shop-Gold-Anzeige bei Gold=0: "${goldDisplay}"`);
  const buyBtns = page.locator(".shopv2-buyqty-btn");
  const buyBtnCount = await buyBtns.count();
  console.log(`Kauf-Buttons im Shop: ${buyBtnCount}`);
  let boughtSomethingAt0Gold = false;
  for (let i = 0; i < Math.min(buyBtnCount, 20); i++) {
    const btn = buyBtns.nth(i);
    const disabledBefore = await btn.isDisabled().catch(() => false);
    if (!disabledBefore) {
      const goldBeforeClick = await page.locator(".shopv2-balance-amount").first().innerText().catch(() => "0");
      await btn.click({ force: true }).catch(() => {});
      await page.waitForTimeout(200);
      const goldAfterClick = await page.locator(".shopv2-balance-amount").first().innerText().catch(() => "0");
      if (goldAfterClick !== goldBeforeClick) {
        boughtSomethingAt0Gold = true;
        console.log(`  ACHTUNG: Kauf #${i} bei 0 Gold ausgeführt trotz nicht-disabled Button! ${goldBeforeClick} -> ${goldAfterClick}`);
      }
    }
  }
  console.log(`Kauf-Buttons alle korrekt disabled bei Gold=0: ${!boughtSomethingAt0Gold}`);
  if (boughtSomethingAt0Gold) {
    findings.push({ sev: "KRITISCH", title: "Kauf im Shop trotz Gold=0 möglich (Buy-Button nicht disabled)", repro: "Fixture sweep9chaos (Gold=0) -> Shop -> Buy-Button anklicken" });
  }
  await page.screenshot({ path: join(OUT_DIR, "4c-shop-zero-gold.png") });
  // Slot-Upgrade im Bank/Shop-Kontext (falls vorhanden) ebenfalls bei 0 Gold prüfen.
  await clickRetry(page, page.locator('[data-guide-id="topbar.bank"]').first());
  await page.waitForTimeout(600);
  const upgradeBtn = page.locator("button:has-text('Upgrade'), [class*='upgrade-btn'], [class*='slot-upgrade']").first();
  if (await upgradeBtn.count() > 0) {
    const disabled = await upgradeBtn.isDisabled().catch(() => null);
    console.log(`Slot-Upgrade-Button bei Gold=0 disabled: ${disabled}`);
  }
  await page.screenshot({ path: join(OUT_DIR, "4c-bank-zero-gold.png") });

  // --- 4d. 5 Buffs gleichzeitig: Anzeige/Layout prüfen. ---
  await clickRetry(page, page.locator('[data-guide-id="topbar.character"]').first());
  await page.waitForTimeout(800);
  const buffChips = await page.locator("[class*='buff-chip'], [class*='buff-icon'], [class*='cs-buff']").count();
  console.log(`Sichtbare Buff-Elemente auf Charakter-Seite: ${buffChips}`);
  await page.screenshot({ path: join(OUT_DIR, "4d-five-buffs-character.png") });
  await clickRetry(page, page.locator('[data-guide-id="sidebar.combat"]').first());
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(OUT_DIR, "4d-five-buffs-combat.png") });

  console.log("\n=== FEHLER-SAMMLUNG (gesamte Session) ===");
  console.log(errors.length ? `${errors.length} Konsolen-/Page-Errors:\n` + errors.join("\n") : "Keine Konsolenfehler in der gesamten Session.");

  console.log("\n=== BEFUNDE ===");
  if (findings.length === 0) console.log("Keine Befunde in Kategorie 4.");
  for (const f of findings) console.log(`[${f.sev}] ${f.title} — ${f.repro}${f.detail ? " — " + f.detail : ""}`);

  await browser.close();
} finally {
  child.kill();
}
