// Aufhübschung D: prüft am gerenderten DOM, dass die Drift-Ebene existiert, animiert (transform
// ändert sich über 3s) und die Stapel-Ordnung hält (Vignette z:1 > Drift z:0).
// Klont die Navigations-Helfer aus zone-particles-shot.mjs (Port 5223).
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5223;
const BASE = `http://localhost:${PORT}`;

const viteBin = join(CLIENT_DIR, "node_modules", "vite", "bin", "vite.js");
const child = spawn(process.execPath, [viteBin, "dev", "--config", join(__dirname, "vite.tour.config.mjs"), "--port", String(PORT), "--strictPort"], { cwd: CLIENT_DIR, stdio: ["ignore", "pipe", "pipe"] });
const up = async () => { for (let i = 0; i < 100; i++) { try { if ((await fetch(BASE)).ok) return true; } catch {} await new Promise(r => setTimeout(r, 300)); } return false; };

let failed = false;
try {
  if (!(await up())) throw new Error("vite kam nicht hoch");
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  await page.goto(`${BASE}/?fixture=endgame`, { waitUntil: "load" });
  await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
  await page.waitForTimeout(4200);
  await page.locator('[data-guide-id="sidebar.combat"]').first().click();
  await page.waitForTimeout(600);
  await page.locator(".zone-card", { hasText: /Aschfelder|Ashfields/i }).first().click();
  await page.waitForTimeout(600);
  await page.locator(".monster-card .mc-fight-btn").first().click();
  await page.waitForTimeout(1500);

  const drift = page.locator(".fighter-backdrop-drift").first();
  const count = await page.locator(".fighter-backdrop-drift").count();
  const t1 = await drift.evaluate((el) => getComputedStyle(el).transform);
  await page.waitForTimeout(3000);
  const t2 = await drift.evaluate((el) => getComputedStyle(el).transform);
  const anim = await drift.evaluate((el) => getComputedStyle(el).animationName);
  const vignetteZ = await page.locator(".fighter-figure-wrap.has-backdrop").first()
    .evaluate((el) => getComputedStyle(el, "::before").zIndex);
  console.log(`Drift-Ebenen: ${count} | animation: ${anim} | transform ändert sich: ${t1 !== t2} | Vignette z: ${vignetteZ}`);
  console.log(`  t1=${t1}\n  t2=${t2}`);
  if (count < 1 || anim === "none" || t1 === t2 || vignetteZ !== "1") failed = true;
  await page.screenshot({ path: join(__dirname, "shots-drift", "drift-ashfields.png") }).catch(() => {});
  await browser.close();
} catch (e) { console.error(e); failed = true; }
finally { child.kill(); }
console.log(failed ? "DRIFT-CHECK: FAIL" : "DRIFT-CHECK: OK");
process.exitCode = failed ? 1 : 0;
