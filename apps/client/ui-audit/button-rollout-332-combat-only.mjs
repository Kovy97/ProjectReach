#!/usr/bin/env node
/** Task #332 — focused follow-up: reach an actual fight to screenshot .combat-btn.flee
 *  (End-Fight button) at real size. Run: node button-rollout-332-combat-only.mjs */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5333;
const BASE_URL = `http://localhost:${PORT}`;
const VIEWPORT = { width: 1920, height: 1080 };
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
    const page = await browser.newPage({ viewport: VIEWPORT });
    page.on("pageerror", (e) => console.error("pageerror:", e.message));

    await page.goto(`${BASE_URL}/?fixture=midgame`, { waitUntil: "load" });
    await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
    await page.waitForTimeout(4200);

    await page.click('[data-guide-id="sidebar.combat"]');
    await page.waitForTimeout(600);
    await page.locator(".zone-card").first().click();
    await page.waitForTimeout(600);

    // click the "1x" preset on the first monster card to start a fight
    const preset1x = page.locator(".qty-picker-btn").filter({ hasNotText: /max|∞|MAX/i }).first();
    await preset1x.click({ timeout: 5000 }).catch(async () => {
      // fallback: first qty-picker-btn regardless of label
      await page.locator(".qty-picker-btn").first().click();
    });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: join(OUT_DIR, "b332-combat-fighting.png") });
    console.log("[verify] wrote b332-combat-fighting.png");

    const flee = page.locator(".combat-btn.flee").first();
    if (await flee.count()) {
      const box = await flee.boundingBox();
      if (box) {
        const clip = { x: Math.max(0, box.x - 50), y: Math.max(0, box.y - 50), width: box.width + 100, height: box.height + 100 };
        await page.screenshot({ path: join(OUT_DIR, "b332-combat-flee-zoom-rest.png"), clip });
        await flee.hover();
        await page.waitForTimeout(250);
        await page.screenshot({ path: join(OUT_DIR, "b332-combat-flee-zoom-hover.png"), clip });
      }
      console.log("[verify] wrote flee zoom crops");
    } else {
      console.log("[verify] WARN: .combat-btn.flee not found — fight may not have started");
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
