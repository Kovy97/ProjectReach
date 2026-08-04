#!/usr/bin/env node
/**
 * TESTER 9 ("Der Chaot") — Kategorie 5: Fenster-Extreme (1024x640 unter Minimum, 2560x1440, 900px schmal).
 * READ-ONLY. Port 5258, Fixture midgame.
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

const SIZES = [
  { width: 1024, height: 640, label: "1024x640-under-min" },
  { width: 2560, height: 1440, label: "2560x1440" },
  { width: 900, height: 900, label: "900w-narrow" },
];
const PAGES = ["character", "combat"]; // + topbar shop/bank via data-guide-id

const { child, getOutput } = startDevServer();
const findings = [];
try {
  const ok = await waitForServer(BASE_URL);
  if (!ok) { console.error("SERVER NOT UP:\n" + getOutput()); process.exit(1); }
  const browser = await chromium.launch();

  for (const size of SIZES) {
    console.log(`\n=== FENSTERGRÖSSE ${size.label} (${size.width}x${size.height}) ===`);
    const page = await browser.newPage({ viewport: { width: size.width, height: size.height }, deviceScaleFactor: 1 });
    const errors = [];
    page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
    page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });

    await page.goto(`${BASE_URL}/?fixture=midgame`, { waitUntil: "load" });
    await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
    await page.waitForTimeout(4000);

    await page.screenshot({ path: join(OUT_DIR, `5-${size.label}-character.png`), fullPage: false });
    const hOverflow1 = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    console.log(`Charakter-Seite: horizontaler Seiten-Overflow = ${hOverflow1}px (>0 = Body scrollt seitlich)`);
    if (hOverflow1 > 20) findings.push({ sev: "KOSMETISCH", title: `Horizontaler Body-Scroll bei ${size.label} auf Charakter-Seite (${hOverflow1}px)`, repro: `Fenster ${size.width}x${size.height}, Charakter-Seite` });

    await clickRetry(page, page.locator('[data-guide-id="sidebar.combat"]').first());
    await page.waitForTimeout(800);
    await page.screenshot({ path: join(OUT_DIR, `5-${size.label}-combat-zones.png`), fullPage: false });
    const zoneCard = page.locator(".zone-card").first();
    if (await zoneCard.count() > 0) {
      await zoneCard.click().catch(() => {});
      await page.waitForTimeout(800);
      const fightBtn = page.locator(".mc-fight-btn").first();
      if (await fightBtn.count() > 0) {
        await fightBtn.click().catch(() => {});
        await page.waitForTimeout(1500);
        await page.screenshot({ path: join(OUT_DIR, `5-${size.label}-combat-fighting.png`), fullPage: false });
        const hOverflow2 = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        console.log(`Kampf-Bildschirm: horizontaler Overflow = ${hOverflow2}px`);
        if (hOverflow2 > 20) findings.push({ sev: "KOSMETISCH", title: `Horizontaler Body-Scroll bei ${size.label} im Kampf-Bildschirm (${hOverflow2}px)`, repro: `Fenster ${size.width}x${size.height}, Kampf gestartet` });
        // Sichtbarkeit kritischer Elemente prüfen: Stop-Button erreichbar?
        const stopVisible = await page.locator(".gamestats-stop-btn").first().isVisible().catch(() => false);
        console.log(`Stop-Kampf-Button sichtbar: ${stopVisible}`);
      }
    }
    // Sidebar + TopBar müssen trotzdem bedienbar bleiben (Kernkriterium "nichts darf crashen").
    const sidebarUsable = await page.locator('[data-guide-id="topbar.character"]').first().isVisible().catch(() => false);
    console.log(`Sidebar nach Kampf-Start noch bedienbar (${size.label}): ${sidebarUsable}`);
    if (!sidebarUsable) findings.push({ sev: "KRITISCH", title: `Sidebar bei ${size.label} nicht mehr erreichbar/bedienbar`, repro: `Fenster ${size.width}x${size.height}` });

    console.log(`${size.label}: ${errors.length ? errors.length + " Fehler:\n" + errors.join("\n") : "keine Konsolenfehler"}`);
    if (errors.length > 0) {
      findings.push({ sev: "MITTEL", title: `${errors.length} Konsolenfehler bei ${size.label}`, repro: `Fenster ${size.width}x${size.height}, Charakter+Kampf durchklicken`, detail: errors.slice(0, 6).join(" | ") });
    }
    await page.close();
  }

  await browser.close();

  console.log("\n=== BEFUNDE (Kategorie 5) ===");
  if (findings.length === 0) console.log("Keine Befunde in Kategorie 5.");
  for (const f of findings) console.log(`[${f.sev}] ${f.title} — ${f.repro}${f.detail ? " — " + f.detail : ""}`);
} finally {
  child.kill();
}
