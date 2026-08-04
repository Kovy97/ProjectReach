#!/usr/bin/env node
/**
 * Screenshots the restyled OfflinePopup ("Beute-Bühne") at 1920x1080 and 1280x720. Drives the
 * dev-only `?offlineTest=<variant>` hook added to fixtureLoader.ts/GameContext.tsx (gated on
 * import.meta.env.DEV, stripped from prod builds) combined with `?fixture=endgame` (a real
 * GameState is required — OfflinePopup only mounts inside MainLayout). Port 5209 per task.
 *
 * Run: node offline-stage-shot.mjs
 * Output: PNGs written to the scratchpad dir.
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5209;
const BASE_URL = `http://localhost:${PORT}`;
const OUT_DIR = "C:\\Users\\MSchu\\AppData\\Local\\Temp\\claude\\G--GameDev\\553d2095-3a73-4795-9782-0fe746a25f13\\scratchpad";

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

async function shot(page, out, w, h) {
  await page.setViewportSize({ width: w, height: h });
  await page.waitForTimeout(400);
  await page.screenshot({ path: out });
  console.log("SHOT SAVED: " + out + " @ " + w + "x" + h);
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

  // Main scenario: rich loot (incl. 2 rares), several skills, 6h away, combat-stopped stalemate hint.
  await page.goto(`${BASE_URL}/?fixture=endgame&offlineTest=1`, { waitUntil: "load" });
  await page.waitForSelector(".offline-stage", { timeout: 15000 });
  await page.waitForTimeout(4300); // let achievement-unlock toasts from the fixture load clear first

  await shot(page, join(OUT_DIR, "offline-stage-1920x1080.png"), 1920, 1080);
  await shot(page, join(OUT_DIR, "offline-stage-1280x720.png"), 1280, 720);

  // Secondary scenario: offline-death block instead of the stalemate hint.
  await page.goto(`${BASE_URL}/?fixture=endgame&offlineTest=death`, { waitUntil: "load" });
  await page.waitForSelector(".offline-stage", { timeout: 15000 });
  await page.waitForTimeout(4300);
  await shot(page, join(OUT_DIR, "offline-stage-death-1920x1080.png"), 1920, 1080);

  console.log(errors.length ? "PAGE ERRORS:\n" + errors.slice(0, 20).join("\n") : "no page errors");
  await browser.close();
} finally {
  child.kill();
}
