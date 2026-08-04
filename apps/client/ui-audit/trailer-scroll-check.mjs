#!/usr/bin/env node
/**
 * Trailer-Autoscroll-Verifikation (Chef 2026-07-12): F1 startet stetiges Scrollen der
 * .content-body, F1 stoppt, Shift+F1 ist schneller, Ende-Stopp. Port 5241.
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5241;
const BASE_URL = `http://localhost:${PORT}`;

const viteBin = join(CLIENT_DIR, "node_modules", "vite", "bin", "vite.js");
const child = spawn(process.execPath, [viteBin, "dev", "--config", join(__dirname, "vite.tour.config.mjs"), "--port", String(PORT), "--strictPort"], { cwd: CLIENT_DIR, stdio: ["ignore", "ignore", "ignore"] });
try {
  const s = Date.now();
  while (Date.now() - s < 40000) { try { const r = await fetch(BASE_URL); if (r.ok) break; } catch {} await new Promise((r) => setTimeout(r, 300)); }
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${BASE_URL}/?fixture=midgame`, { waitUntil: "load" });
  await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
  await page.waitForTimeout(3500);
  // Lange Seite: Schmieden (viele Rezepte)
  await page.locator('[data-guide-id="sidebar.smithing"]').first().click();
  await page.waitForTimeout(1000);
  const st = () => page.evaluate(() => Math.round(document.querySelector(".content-body").scrollTop));
  const s0 = await st();
  await page.keyboard.press("F1");
  await page.waitForTimeout(2000);
  const s1 = await st();
  await page.waitForTimeout(2000);
  const s2 = await st();
  await page.keyboard.press("F1"); // Stopp
  await page.waitForTimeout(600);
  const s3 = await st();
  await page.waitForTimeout(1500);
  const s4 = await st();
  console.log(`SLOW: start=${s0} nach2s=${s1} nach4s=${s2} | Stopp: ${s3} → ${s4} (muss gleich sein)`);
  const rate1 = (s1 - s0) / 2, rate2 = (s2 - s1) / 2;
  // Shift+F1 = schnell
  await page.keyboard.down("Shift");
  await page.keyboard.press("F1");
  await page.keyboard.up("Shift");
  await page.waitForTimeout(2000);
  const f1 = await st();
  console.log(`FAST: ${s4} → ${f1} in 2s (≈${Math.round((f1 - s4) / 2)} px/s)`);
  const problems = [];
  if (rate1 < 160 || rate1 > 200) problems.push(`SLOW-Rate ${rate1} px/s außerhalb 180±20`);
  if (Math.abs(rate1 - rate2) > 8) problems.push(`ungleichmäßig: ${rate1} vs ${rate2}`);
  if (s3 !== s4) problems.push(`Stopp hält nicht (${s3}→${s4})`);
  const fastRate = (f1 - s4) / 2;
  if (fastRate < 320 || fastRate > 400) problems.push(`FAST-Rate ${fastRate} px/s außerhalb 360±40`);
  console.log(problems.length ? "PROBLEME:\n- " + problems.join("\n- ") : "ALLE CHECKS GRÜN");
  console.log(errors.length ? "page errors: " + errors.join("; ") : "no page errors");
  await browser.close();
} finally { child.kill(); }
