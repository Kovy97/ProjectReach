// Task #337 (Blutmond-Umbau, Endverifikation): BlessingPanel-Runtime-Check headless.
// Hintergrund: Während des Umbaus wurde ein TRANSIENTER React-Crash im BlessingPanel gesehen
// ("Cannot read properties of undefined (reading 'replace')") — vermutlich ein halber
// i18n-Zwischenstand (EFFECT_KEY["doubleLootChance"] fehlte → t(undefined).replace crashte).
// Dieses Skript beweist am echten Renderer (Vite + Playwright-Chromium, KEIN Electron):
//  1. Kein pageerror/console.error beim Rendern mit aktivem Samstags-Segen (Fake-Datum via
//     Playwright-Clock `setFixedTime` — fälscht NUR Date, alle Timer laufen echt weiter).
//  2. Panel-Text beschreibt das NEUE Verhalten ("15% Chance auf doppelte Beute" / Chance-Semantik,
//     NICHT das alte "+15%..." und NICHT den (mult-1)-Unfall "-85%").
//  3. Tooltip (Hover) rendert Name/Flavor/Effekt/Countdown.
// Screenshots: bloodmoon-panel-337-{full,tip}.png (per Read begutachten).
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5247;
const BASE = `http://localhost:${PORT}`;

// Samstag, 25.07.2026, 12:00 LOKAL → blessingForTime ⇒ bloodmoon (getDay()===6).
const SATURDAY = new Date(2026, 6, 25, 12, 0, 0, 0);

const viteBin = join(CLIENT_DIR, "node_modules", "vite", "bin", "vite.js");
const child = spawn(
  process.execPath,
  [viteBin, "dev", "--config", join(__dirname, "vite.tour.config.mjs"), "--port", String(PORT), "--strictPort"],
  { cwd: CLIENT_DIR, stdio: ["ignore", "pipe", "pipe"] },
);
const up = async () => {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(BASE)).ok) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
};

let failed = false;
try {
  if (!(await up())) throw new Error("vite down");
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  const errors = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console.error: ${m.text()}`);
  });

  // Clock VOR der Navigation fixieren — gilt kontextweit über die Navigation hinweg.
  await page.clock.setFixedTime(SATURDAY);
  await page.goto(`${BASE}/?fixture=midgame`, { waitUntil: "load" });
  await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
  await page.waitForTimeout(2500);

  const panel = await page.evaluate(() => {
    const name = document.querySelector(".sb-blessing-name")?.textContent ?? null;
    const effect = document.querySelector(".sb-blessing-effect")?.textContent ?? null;
    return { name, effect, dayCheck: new Date().getDay() };
  });
  console.log("=== PANEL ===");
  console.log(JSON.stringify(panel, null, 1));

  // Tooltip öffnen (Hover auf die Segen-Karte) und Inhalte einsammeln.
  await page.locator(".sb-blessing").hover();
  await page.waitForSelector(".blessing-tip", { timeout: 5000 });
  await page.waitForTimeout(300);
  const tip = await page.evaluate(() => {
    const q = (sel) => document.querySelector(sel)?.textContent ?? null;
    return {
      title: q(".blessing-tip .ct-tip-title"),
      flavor: q(".blessing-tip .ct-tip-desc"),
      effect: q(".blessing-tip .blessing-tip-effect"),
      countdown: q(".blessing-tip .blessing-tip-countdown"),
    };
  });
  console.log("=== TOOLTIP ===");
  console.log(JSON.stringify(tip, null, 1));

  await page.screenshot({ path: join(__dirname, "bloodmoon-panel-337-full.png") });
  // Ausschnitt: Sidebar-Kopf + Tooltip (rechts daneben verankert) — engerer Blick für die Abnahme.
  await page.screenshot({
    path: join(__dirname, "bloodmoon-panel-337-tip.png"),
    clip: { x: 0, y: 0, width: 900, height: 500 },
  });

  // ── Bewertung ────────────────────────────────────────────────────────────
  const problems = [];
  if (panel.dayCheck !== 6) problems.push(`Fake-Datum wirkt nicht (getDay()=${panel.dayCheck}, erwartet 6)`);
  if (!panel.name) problems.push("Panel-Name fehlt (.sb-blessing-name leer)");
  if (!panel.effect) problems.push("Effekt-Zeile fehlt (.sb-blessing-effect leer)");
  if (panel.effect) {
    if (!/15\s?%/.test(panel.effect)) problems.push(`Effekt-Zeile ohne '15%': "${panel.effect}"`);
    if (/-85/.test(panel.effect)) problems.push(`(mult-1)-Unfall sichtbar: "${panel.effect}"`);
    if (/\+15\s?%/.test(panel.effect)) problems.push(`ALTES Verhalten (+15% Menge) sichtbar: "${panel.effect}"`);
    if (!/chance/i.test(panel.effect)) problems.push(`Effekt-Zeile ohne Chance-Wording: "${panel.effect}"`);
  }
  if (!tip.title || !tip.flavor || !tip.effect || !tip.countdown) {
    problems.push(`Tooltip unvollständig: ${JSON.stringify(tip)}`);
  }
  if (errors.length) problems.push(...errors);

  if (problems.length) {
    failed = true;
    console.log("\n=== PROBLEME ===");
    for (const p of problems) console.log("  ✗ " + p);
  } else {
    console.log("\n✓ BlessingPanel rendert crash-frei, Chance-Wording korrekt, Tooltip vollständig.");
  }

  await browser.close();
} finally {
  child.kill();
}
process.exit(failed ? 1 : 0);
