#!/usr/bin/env node
/** Arena-Rework Nachtest: „Details"-Toggle öffnet die Stat-Zeile in der Nameplate (beide Seiten),
 *  ohne Seiten-Scroll auszulösen. Port 5238. */
import { spawn } from "node:child_process";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const CLIENT_DIR = "G:\\GameDev\\apps\\client";
const PORT = 5238;
const BASE_URL = `http://localhost:${PORT}`;
const OUT_DIR = "C:\\Users\\MSchu\\AppData\\Local\\Temp\\claude\\G--GameDev\\553d2095-3a73-4795-9782-0fe746a25f13\\scratchpad";

const viteBin = join(CLIENT_DIR, "node_modules", "vite", "bin", "vite.js");
const child = spawn(process.execPath, [viteBin, "dev", "--config", join(CLIENT_DIR, "ui-audit", "vite.tour.config.mjs"), "--port", String(PORT), "--strictPort"], { cwd: CLIENT_DIR, stdio: ["ignore", "pipe", "pipe"] });
try {
  const s = Date.now();
  let up = false;
  while (Date.now() - s < 40000) { try { if ((await fetch(BASE_URL)).ok) { up = true; break; } } catch {} await new Promise((r) => setTimeout(r, 300)); }
  if (!up) { console.error("SERVER NOT UP"); process.exit(1); }
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${BASE_URL}/?fixture=midgame`, { waitUntil: "load" });
  await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
  await page.waitForTimeout(2500);
  await page.locator('[data-guide-id="sidebar.combat"]').first().click();
  await page.waitForTimeout(600);
  await page.locator(".zone-card").first().click();
  await page.waitForTimeout(1000);
  await page.locator(".mc-fight-btn").first().click();
  await page.waitForSelector(".battle-arena", { timeout: 8000 });
  await page.waitForTimeout(800);
  // Beide Details-Toggles öffnen.
  for (const btn of await page.locator(".fighter-details-toggle").all()) await btn.click();
  await page.waitForTimeout(400);
  const m = await page.evaluate(() => {
    const cb = document.querySelector(".content-body");
    return {
      overflow: cb ? cb.scrollHeight - cb.clientHeight : null,
      openDetails: document.querySelectorAll(".fighter-details .stat-line").length,
      statItems: document.querySelectorAll(".fighter-details .stat-line-item").length,
    };
  });
  console.log("DETAILS-TOGGLE:", JSON.stringify(m));
  await page.screenshot({ path: join(OUT_DIR, "arena-details-open.png") });
  console.log("SHOT SAVED: arena-details-open.png");
  console.log(m.openDetails === 2 && (m.overflow ?? 99) <= 1 ? "OK" : "PROBLEM");
  console.log(errors.length ? "page errors:\n" + errors.join("\n") : "no page errors");
  await browser.close();
} finally {
  child.kill();
}
