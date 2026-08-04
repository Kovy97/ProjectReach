import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

// Task #282 (MainMenu + CharacterCreation redesign) — screenshot helper for the Creation screen.
// Adapted from portrait-shot.mjs: default menu panel is now CLOSED (Chef overwrite-safety fix), so
// we must click the "New Game" nav button first, THEN a slot's "New" button, before Creation mounts.
const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5196;
const BASE_URL = `http://localhost:${PORT}`;
const OUT = process.argv[2] || join(__dirname, "creation-shot.png");
const W = Number(process.argv[3] || 1920);
const H = Number(process.argv[4] || 1080);
// Optional 5th arg: "gallery" opens the full portrait gallery modal on top of Creation.
const MODE = process.argv[5] || "";

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

const { child, getOutput } = startDevServer();
try {
  if (!(await waitForServer(BASE_URL))) { console.error("SERVER NOT UP:\n" + getOutput()); process.exit(1); }
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  // Default panel is closed → open "New Game" (first nav button), then click an empty slot's "New".
  await page.locator(".menu-nav-btn").first().click();
  await page.waitForTimeout(300);
  await page.locator(".menu-right .menu-slot-actions button").first().click();
  await page.waitForSelector(".creation", { timeout: 8000 });
  await page.waitForTimeout(1000);
  if (MODE === "gallery") {
    await page.locator(".portrait-show-all-btn, .creation-portrait-more-btn").first().click();
    await page.waitForTimeout(600);
  } else if (MODE === "name") {
    await page.locator(".creation-input").first().fill("Aldric");
    await page.waitForTimeout(300);
  }
  await page.screenshot({ path: OUT, fullPage: false });
  console.log("SHOT SAVED: " + OUT + " @ " + W + "x" + H);
  console.log(errors.length ? "PAGE ERRORS:\n" + errors.slice(0, 10).join("\n") : "no page errors");
  await browser.close();
} finally {
  child.kill();
}
