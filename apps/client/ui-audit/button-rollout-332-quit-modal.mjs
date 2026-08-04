#!/usr/bin/env node
/** Task #332 — quit-confirm modal check: .combat-btn (Cancel) + .combat-btn.flee (Quit) side by
 *  side, the cleanest real spot to see both variants at once without needing a live fight. */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5334;
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

async function main() {
  console.log(`[verify] starting dev server on port ${PORT}...`);
  const server = startDevServer();
  const up = await waitForServer(BASE_URL);
  if (!up) { console.error("DEV SERVER NOT UP:\n" + server.getOutput()); server.child.kill(); process.exitCode = 1; return; }

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    page.on("pageerror", (e) => console.error("pageerror:", e.message));

    await page.goto(`${BASE_URL}/?fixture=midgame`, { waitUntil: "load" });
    await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
    await page.waitForTimeout(4200);

    await page.click(".sb-footer-quit");
    await page.waitForTimeout(400);
    await page.screenshot({ path: join(OUT_DIR, "b332-quit-modal-rest.png") });
    console.log("[verify] wrote b332-quit-modal-rest.png");

    const fleeBtn = page.locator(".quit-confirm-actions .combat-btn.flee");
    await fleeBtn.hover();
    await page.waitForTimeout(250);
    await page.screenshot({ path: join(OUT_DIR, "b332-quit-modal-flee-hover.png") });
    console.log("[verify] wrote b332-quit-modal-flee-hover.png");

    const box = await page.locator(".quit-confirm-actions").boundingBox();
    if (box) {
      const clip = { x: Math.max(0, box.x - 20), y: Math.max(0, box.y - 20), width: box.width + 40, height: box.height + 40 };
      await page.screenshot({ path: join(OUT_DIR, "b332-quit-modal-actions-zoom.png"), clip });
      console.log("[verify] wrote b332-quit-modal-actions-zoom.png");
    }

    await page.close();
  } finally {
    await browser.close();
    server.child.kill();
  }
  console.log("\n[verify] done.");
}

main().catch((err) => {
  console.error("[verify] fatal:", err);
  process.exitCode = 1;
});
