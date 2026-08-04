#!/usr/bin/env node
// Kurzcheck: Details-Toggle-Zustand (Pfeil-Richtung + Panel-Inhalt) exakt verifizieren — Zoom-Screenshot
// der Nameplate vor/nach Klick. READ-ONLY. Port 5251.
import { spawn } from "node:child_process";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const CLIENT_DIR = "G:\\GameDev\\apps\\client";
const PORT = 5251;
const BASE_URL = `http://localhost:${PORT}`;
const OUT_DIR = "C:\\Users\\MSchu\\AppData\\Local\\Temp\\claude\\G--GameDev\\553d2095-3a73-4795-9782-0fe746a25f13\\scratchpad\\sweep2";

function startDevServer() {
  const viteBin = join(CLIENT_DIR, "node_modules", "vite", "bin", "vite.js");
  const child = spawn(process.execPath, [viteBin, "dev", "--config", join(CLIENT_DIR, "ui-audit", "vite.tour.config.mjs"), "--port", String(PORT), "--strictPort"], { cwd: CLIENT_DIR, stdio: ["ignore", "pipe", "pipe"] });
  let out = "";
  child.stdout.on("data", (d) => (out += d.toString()));
  child.stderr.on("data", (d) => (out += d.toString()));
  return { child, getOutput: () => out };
}
async function waitForServer(url, t = 40000) {
  const s = Date.now();
  while (Date.now() - s < t) { try { const r = await fetch(url); if (r.ok) return true; } catch {} await new Promise((r) => setTimeout(r, 300)); }
  return false;
}
async function clickRetry(page, locator) {
  try { await locator.click({ timeout: 6000 }); } catch { await page.waitForTimeout(400); await locator.click({ timeout: 6000 }); }
}

const { child, getOutput } = startDevServer();
try {
  const ok = await waitForServer(BASE_URL);
  if (!ok) { console.error("SERVER NOT UP:\n" + getOutput()); process.exit(1); }
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto(`${BASE_URL}/?fixture=midgame`, { waitUntil: "load" });
  await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
  await page.waitForTimeout(2500);
  await clickRetry(page, page.locator('[data-guide-id="sidebar.combat"]').first());
  await page.waitForTimeout(600);
  await clickRetry(page, page.locator(".zone-card").first());
  await page.waitForTimeout(1000);
  await clickRetry(page, page.locator(".mc-fight-btn").first());
  await page.waitForSelector(".battle-arena", { timeout: 8000 });
  await page.waitForTimeout(1500);

  const before = await page.evaluate(() => Array.from(document.querySelectorAll(".fighter-details-toggle")).map((b) => ({ text: b.textContent, cls: b.className })));
  console.log("VOR Klick:", JSON.stringify(before));
  await page.locator(".arena-side-player .fighter-nameplate").screenshot({ path: join(OUT_DIR, "zoom-player-before.png") });

  const toggles = page.locator(".fighter-details-toggle");
  const n = await toggles.count();
  for (let i = 0; i < n; i++) { await clickRetry(page, toggles.nth(i)); await page.waitForTimeout(300); }

  const after = await page.evaluate(() => Array.from(document.querySelectorAll(".fighter-details-toggle")).map((b) => ({ text: b.textContent, cls: b.className })));
  console.log("NACH Klick:", JSON.stringify(after));
  const detailsContent = await page.evaluate(() => Array.from(document.querySelectorAll(".fighter-details")).map((d) => ({ html: d.innerHTML.slice(0, 300), visible: d.getBoundingClientRect().height > 0 })));
  console.log("DETAILS-PANELS:", JSON.stringify(detailsContent));
  await page.locator(".arena-side-player .fighter-nameplate").screenshot({ path: join(OUT_DIR, "zoom-player-after.png") });
  await page.locator(".arena-side-enemy .fighter-nameplate").screenshot({ path: join(OUT_DIR, "zoom-enemy-after.png") });
  console.log("SHOTS SAVED: zoom-player-before.png, zoom-player-after.png, zoom-enemy-after.png");

  await browser.close();
} finally {
  child.kill();
}
