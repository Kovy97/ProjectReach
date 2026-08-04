import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5196;
const BASE_URL = `http://localhost:${PORT}`;
function startDevServer() {
  const viteBin = join(CLIENT_DIR, "node_modules", "vite", "bin", "vite.js");
  return spawn(process.execPath, [viteBin, "dev", "--config", join(__dirname, "vite.tour.config.mjs"), "--port", String(PORT), "--strictPort"], { cwd: CLIENT_DIR, stdio: ["ignore", "pipe", "pipe"] });
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
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.locator(".menu-nav-btn").nth(2).click();
  await page.waitForTimeout(400);
  await page.locator(".menu-opt-row button", { hasText: /Font|Schrift/ }).click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: "ui-audit/shots/task282/font-preview.png" });
  console.log(errors.length ? "ERRORS:\n" + errors.join("\n") : "no errors");
  await browser.close();
} finally { child.kill(); }
