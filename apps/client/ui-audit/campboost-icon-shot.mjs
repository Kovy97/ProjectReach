#!/usr/bin/env node
/**
 * Einmal-Verifikation für das New-Haven-Emblem in den "Aus New Haven"-Boost-Zeilen
 * (CampBoostNote.tsx, 03.08.). Muster aus newhaven-audit-335.mjs übernommen (eigener Vite-Dev-
 * Server gegen vite.tour.config.mjs, Playwright-Chromium, NIEMALS Electron).
 *
 * Fixture: campboost_icon_check.json — chirurgisch aus nh_map_audit.json abgeleitet (dieselben
 * 7 Gebäude + laufender camp_fence_tent-Bau), PLUS camp_scrivener_tent Stufe I ergänzt, weil
 * NUR dieses Gebäude einen `buildSpeed`-Boost gibt (packages/content/src/index.ts) — ohne es
 * bleibt `campBoost(state, content, "buildSpeed")` in nh_map_audit exakt 0 und die Bautempo-
 * Note rendert gar nicht. nh_map_audit selbst bleibt unangetastet.
 *
 * Screenshots: bank-tooltip.png (Bank-Kapazitäts-Tooltip, Hover), newhaven-speednote.png
 * (Gebäude-Karte camp_fence_tent im Bau, Bautempo-Note sichtbar). Ändert nichts an Produktivcode.
 *
 * Run: node ui-audit/campboost-icon-shot.mjs   (from apps/client/)
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5501;
const BASE_URL = `http://localhost:${PORT}`;
const FIXTURE = "campboost_icon_check";

async function waitForServer(url, t = 40000) {
  const s = Date.now();
  while (Date.now() - s < t) {
    try { const r = await fetch(url); if (r.ok) return true; } catch {}
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

function startDevServer(port) {
  const viteBin = join(CLIENT_DIR, "node_modules", "vite", "bin", "vite.js");
  const child = spawn(
    process.execPath,
    [viteBin, "dev", "--config", join(__dirname, "vite.tour.config.mjs"), "--port", String(port), "--strictPort"],
    { cwd: CLIENT_DIR, stdio: ["ignore", "pipe", "pipe"] },
  );
  let out = "";
  child.stdout.on("data", (d) => (out += d.toString()));
  child.stderr.on("data", (d) => (out += d.toString()));
  return { child, getOutput: () => out };
}

async function main() {
  const server = startDevServer(PORT);
  const up = await waitForServer(BASE_URL);
  if (!up) {
    console.error("Dev server did not come up:\n" + server.getOutput());
    process.exit(1);
  }

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on("pageerror", (e) => console.log("[page-error]", e.message));
  page.on("console", (msg) => { if (msg.type() === "error") console.log("[console-error]", msg.text()); });

  try {
    await page.goto(`${BASE_URL}/?fixture=${FIXTURE}`, { waitUntil: "load" });
    await page.waitForSelector('[data-guide-id^="topbar."], [data-guide-id^="sidebar."]', { timeout: 15000 });
    await page.waitForTimeout(500);

    // ── Bank: Kapazitäts-Tooltip (Hover) ─────────────────────────────────────────
    await page.locator('[data-guide-id="topbar.bank"]').first().click({ timeout: 8000 });
    await page.waitForSelector(".bank-count", { timeout: 10000 });
    await page.waitForTimeout(300);
    await page.locator(".bank-count").first().hover();
    await page.waitForSelector(".camp-boost-note", { timeout: 5000 });
    await page.waitForTimeout(200);
    await page.screenshot({ path: join(__dirname, "campboost-icon-bank-tooltip.png") });
    console.log("[INFO] bank tooltip screenshot taken");

    // ── New Haven: Bautempo-Note auf der Gebäude-Karte im Bau ───────────────────
    await page.locator('[data-guide-id="sidebar.newhaven"]').first().click({ timeout: 8000 });
    await page.waitForSelector(".nh-map, .nh-view-tab", { timeout: 10000 });
    await page.waitForTimeout(300);
    // Die Bautempo-Note lebt in der Gebäude-Karte (nh-card-action-slot) — die ist im "Liste"-Tab
    // sichtbar (Kartenraster), im "Karte"-Tab nur nach Klick auf die Kachel (BuildingPopup).
    await page.locator(".nh-view-tab", { hasText: /Liste|List/i }).first().click({ timeout: 8000 });
    await page.waitForSelector(".nh-progress-speednote", { timeout: 10000 });
    await page.waitForTimeout(300);
    const card = page.locator(".nh-card.is-building").first();
    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    await card.screenshot({ path: join(__dirname, "campboost-icon-newhaven-speednote.png") });
    console.log("[INFO] newhaven speednote screenshot taken");
  } finally {
    await browser.close();
    server.child.kill();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
