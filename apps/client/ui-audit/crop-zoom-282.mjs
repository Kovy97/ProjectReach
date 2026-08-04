import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5196;
const BASE_URL = `http://localhost:${PORT}`;
const SELECTOR = process.argv[2] || ".menu-nav";
const OUT = process.argv[3] || join(__dirname, "shots", "task282", "zoom.png");
const OPEN_NAV_INDEX = process.argv[4] !== undefined ? Number(process.argv[4]) : null;

function startDevServer() {
  const viteBin = join(CLIENT_DIR, "node_modules", "vite", "bin", "vite.js");
  const child = spawn(
    process.execPath,
    [viteBin, "dev", "--config", join(__dirname, "vite.tour.config.mjs"), "--port", String(PORT), "--strictPort"],
    { cwd: CLIENT_DIR, stdio: ["ignore", "pipe", "pipe"] },
  );
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
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 });
  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  if (OPEN_NAV_INDEX !== null) {
    await page.locator(".menu-nav-btn").nth(OPEN_NAV_INDEX).click();
    await page.waitForTimeout(500);
  }
  await page.locator(SELECTOR).first().screenshot({ path: OUT });
  console.log("ZOOM SAVED: " + OUT);
  await browser.close();
} finally { child.kill(); }
