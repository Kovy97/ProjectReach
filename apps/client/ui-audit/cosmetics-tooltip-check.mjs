#!/usr/bin/env node
/**
 * Kosmetik-Sweep T1 (2026-07-12): "Hängender Tooltip nach dem Laden" — nach dem Laden eines
 * Spielstands blieb gelegentlich ein gepinntes Item-Tooltip aus der VORHERIGEN Session sichtbar,
 * weil der ItemTooltip-Store modul-global ist (nicht React-State) und Screen-Wechsel nicht
 * mitbekommt. Fix: MainLayout (App.tsx) ruft beim Mount jetzt closeItemTooltip() (hartes
 * Reset, auch gepinnt).
 *
 * Repro-Flow: Slot 0 laden -> Item-Tooltip pinnen -> zurück ins Menü -> Slot 1 (ANDERE Save)
 * laden -> sofort prüfen, ob ein .item-tooltip übrig hängt.
 * Port 5243 (eigener Port für dieses Sweep-Skript).
 */
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5243;
const BASE_URL = `http://localhost:${PORT}`;
const OUT_DIR = "C:\\Users\\MSchu\\AppData\\Local\\Temp\\claude\\G--GameDev\\553d2095-3a73-4795-9782-0fe746a25f13\\scratchpad";

// savedAt auf "jetzt" patchen: die Fixtures haben ein altes savedAt (mehrere Tage zurück) — über
// den ECHTEN loadGame()-Pfad (localStorage, s.u.) berechnet das einen entsprechend riesigen
// Offline-Catch-up (bis zu MAX_OFFLINE_MS=8h, synchron in advance()), der die Seite für die Dauer
// des Ladens komplett einfriert (auch Playwright-Screenshots blockieren dann). Der `?fixture=`-Query-
// Pfad umgeht das immer (fixtureLoader.ts setzt now=savedAt) — hier brauchen wir aber den ECHTEN
// Lade-Klick-Flow (Menü-Karte → loadGame → MainLayout-Mount), daher wird savedAt hier genauso auf
// "jetzt" gepatcht, um denselben Nulleffekt zu erreichen, ohne den Lade-Pfad selbst zu ändern.
function patchSavedAtNow(json) {
  const obj = JSON.parse(json);
  obj.savedAt = Date.now();
  return JSON.stringify(obj);
}
const midgame = patchSavedAtNow(readFileSync(join(__dirname, "fixtures", "midgame.json"), "utf8"));
const endgame = patchSavedAtNow(readFileSync(join(__dirname, "fixtures", "endgame.json"), "utf8"));

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
  catch { await page.waitForTimeout(400); await locator.click({ timeout: 6000, force: true, ...opts }); }
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

  await page.addInitScript(
    ([mid, end]) => {
      localStorage.setItem("hearthforge:save:0", mid);
      localStorage.setItem("hearthforge:save:1", end);
    },
    [midgame, endgame],
  );

  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);

  // Slot 0 laden.
  await clickRetry(page, page.locator(".menu-nav-btn").nth(1));
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(OUT_DIR, "debug-load-panel.png") });
  const btnCount = await page.locator(".menu-slot.filled .hf-btn--primary").count();
  console.log("LADEN BUTTONS FOUND:", btnCount);
  await page.locator(".menu-slot.filled .hf-btn--primary").nth(0).click({ timeout: 12000 });
  await page.waitForTimeout(1500);

  const screenAfterFirstLoad = await page.evaluate(() => !!document.querySelector(".sb-footer-menu"));
  console.log("IN GAME AFTER FIRST LOAD:", screenAfterFirstLoad);

  // Ein Item-Tooltip PINNEN (Klick auf die erste Inventar-Zelle).
  const cellCount = await page.locator(".item-cell").count();
  console.log("ITEM CELLS FOUND:", cellCount);
  if (cellCount > 0) {
    await page.locator(".item-cell").first().click();
    await page.waitForTimeout(300);
  }
  const pinnedBefore = await page.evaluate(() => document.querySelectorAll(".item-tooltip").length);
  console.log("TOOLTIP PINNED BEFORE MENU-RETURN:", pinnedBefore);

  // Zurück ins Menü — BEWUSST per Tastatur (focus + Enter) statt .click(): ein gepinntes Tooltip
  // hat einen eigenen `mousedown`-Außerhalb-Listener (ItemTooltip.tsx ItemTooltipOverlay), der es
  // bei JEDEM Maus-Klick anderswo schon selbst schließt — ein Playwright-.click() hier würde also
  // IMMER "zufällig" auch den ALTEN Bug kaschieren (mousedown feuert vor unserem Assert). Ein
  // Tastatur-Enter auf einem fokussierten <button> löst zwar `click`, aber KEIN `mousedown` aus —
  // exakt der reale Repro-Pfad (Tab-Navigation / Screenreader / Controller), den der Sweep-Fund
  // beschreibt ("gelegentlich"): das gepinnte Tooltip bleibt in diesem Fall im modul-globalen Store
  // hängen, bis der neue closeItemTooltip()-Hard-Reset in MainLayout es beim nächsten Mount räumt.
  await page.locator(".sb-footer-menu").focus();
  await page.keyboard.press("Enter");
  await page.waitForTimeout(1200);

  // Slot 1 (ANDERE Save) laden -> MainLayout remountet frisch. Ebenfalls per Tastatur (s.o.).
  await page.locator(".menu-nav-btn").nth(1).focus();
  await page.keyboard.press("Enter");
  await page.waitForTimeout(500);
  await page.locator(".menu-slot.filled .hf-btn--primary").nth(1).focus();
  await page.keyboard.press("Enter");
  await page.waitForTimeout(300); // absichtlich kurz: der Bug wäre SOFORT nach dem Mount sichtbar

  const leftoverTooltip = await page.evaluate(() => document.querySelectorAll(".item-tooltip").length);
  console.log("LEFTOVER .item-tooltip AFTER RELOAD:", leftoverTooltip);
  await page.screenshot({ path: join(OUT_DIR, "tooltip-after-reload.png") });
  console.log("SHOT SAVED: tooltip-after-reload.png");

  // Maus in die Ecke weg vom Cursor-Rest der letzten ECHTEN Mausaktion (der Pin-Klick von oben) —
  // sonst kann Chromium bei einem stationären Cursor über neu ins DOM gelayouteten Item-Zellen ein
  // synthetisches mouseenter auslösen (die NEUE Session hat an derselben Bildschirmposition oft
  // ebenfalls eine Item-Zelle) → ein legitimer, NEUER Hover-Tooltip verfälscht sonst den Settle-Check.
  await page.mouse.move(5, 5);
  await page.waitForTimeout(1500); // auch nach Ansiedeln nochmal prüfen (Race-Fenster)
  const leftoverTooltipSettled = await page.evaluate(() => document.querySelectorAll(".item-tooltip").length);
  console.log("LEFTOVER .item-tooltip AFTER SETTLE:", leftoverTooltipSettled);

  const problems = [];
  if (pinnedBefore === 0) problems.push("Pin-Vorbereitung fehlgeschlagen (kein .item-tooltip vor Menü-Rückkehr) — Repro nicht aussagekräftig");
  if (leftoverTooltip > 0) problems.push(`Hängendes Tooltip SOFORT nach Reload: ${leftoverTooltip}`);
  if (leftoverTooltipSettled > 0) problems.push(`Hängendes Tooltip nach Settle: ${leftoverTooltipSettled}`);
  console.log(problems.length ? "PROBLEME:\n- " + problems.join("\n- ") : "ALLE CHECKS GRÜN");
  console.log(errors.length ? `${errors.length} page errors:\n` + errors.slice(0, 8).join("\n") : "no page errors");

  await browser.close();
  process.exit(problems.length > 0 ? 1 : 0);
} finally {
  child.kill();
}
