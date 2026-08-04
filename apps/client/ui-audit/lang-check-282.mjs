import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5196;
const BASE_URL = `http://localhost:${PORT}`;
const LOCALE = process.argv[2] || "ru";
const OUT = process.argv[3] || join(__dirname, "shots", "task282", `lang-${LOCALE}.png`);

function startDevServer() {
  const viteBin = join(CLIENT_DIR, "node_modules", "vite", "bin", "vite.js");
  const child = spawn(process.execPath, [viteBin, "dev", "--config", join(__dirname, "vite.tour.config.mjs"), "--port", String(PORT), "--strictPort"], { cwd: CLIENT_DIR, stdio: ["ignore", "pipe", "pipe"] });
  return child;
}
async function waitForServer(url, t = 40000) {
  const s = Date.now();
  while (Date.now() - s < t) { try { const r = await fetch(url); if (r.ok) return true; } catch {} await new Promise((r) => setTimeout(r, 300)); }
  return false;
}
const child = startDevServer();
try {
  await waitForServer(BASE_URL);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  await page.evaluate((l) => localStorage.setItem("hearthforge:locale", l), LOCALE);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: OUT.replace(".png", "-menu.png") });
  await page.locator(".menu-nav-btn").first().click();
  await page.waitForTimeout(300);
  await page.locator(".menu-right .menu-slot-actions button").first().click();
  await page.waitForSelector(".creation", { timeout: 8000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: OUT.replace(".png", "-creation.png") });
  await browser.close();
  console.log("done", LOCALE);
} finally { child.kill(); }
