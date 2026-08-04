#!/usr/bin/env node
/** Task #332 — verify .it-action-btn (ItemTooltip Equip/Sell actions). */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5336;
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
  const server = startDevServer();
  const up = await waitForServer(BASE_URL);
  if (!up) { console.error("DEV SERVER NOT UP:\n" + server.getOutput()); server.child.kill(); process.exitCode = 1; return; }
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    await page.goto(`${BASE_URL}/?fixture=midgame`, { waitUntil: "load" });
    await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
    await page.waitForTimeout(4200);
    await page.click('[data-guide-id="topbar.character"]').catch(() => {});
    await page.waitForTimeout(500);
    // click an inventory item cell to open its tooltip popup (pinned)
    const cell = page.locator(".inv-slot, .item-cell").first();
    await cell.click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(400);
    const actionBtn = page.locator(".it-action-btn").first();
    if (await actionBtn.count()) {
      const box = await actionBtn.boundingBox();
      await page.screenshot({ path: join(OUT_DIR, "b332-itaction-full.png") });
      if (box) {
        const clip = { x: Math.max(0, box.x - 60), y: Math.max(0, box.y - 60), width: box.width + 120, height: box.height + 120 };
        await page.screenshot({ path: join(OUT_DIR, "b332-itaction-zoom.png"), clip });
        await actionBtn.hover();
        await page.waitForTimeout(200);
        await page.screenshot({ path: join(OUT_DIR, "b332-itaction-zoom-hover.png"), clip });
      }
      console.log("[verify] wrote it-action-btn shots");
    } else {
      console.log("[verify] WARN: .it-action-btn not found — item tooltip may not have opened");
      await page.screenshot({ path: join(OUT_DIR, "b332-itaction-debug.png") });
    }
    await page.close();
  } finally {
    await browser.close();
    server.child.kill();
  }
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
