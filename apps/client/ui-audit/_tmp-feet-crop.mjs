#!/usr/bin/env node
// Ad-hoc: clipped closeups of both fighters' feet/shadow contact (Chef-Anordnung Baseline-Messung).
// TEMPORARY debug script — deleted after use, not part of the permanent ui-audit suite.
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5331;
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

const { child, getOutput } = startDevServer();
try {
  const ok = await waitForServer(BASE_URL);
  if (!ok) { console.error("SERVER NOT UP:\n" + getOutput()); process.exit(1); }
  const browser = await chromium.launch({
    args: ["--headless=new", "--use-gl=angle", "--use-angle=d3d11", "--ignore-gpu-blocklist", "--enable-gpu"],
  });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on("console", (m) => console.log("[console." + m.type() + "]", m.text()));
  page.on("pageerror", (e) => console.log("[pageerror]", e.message));
  await page.addInitScript(() => { localStorage.setItem("gr.combatFxLevel", "full"); localStorage.setItem("gr.arena25d", "1"); });
  await page.route(`**/ui-audit-fixtures/midgame.json`, async (route) => {
    const res = await route.fetch();
    const json = JSON.parse(await res.text());
    json.state.onboarding = { ...(json.state.onboarding ?? {}), active: false, toursSeen: { combat: true, shop: true, bank: true, featureTourV1: true } };
    json.state.combat.monsterId = "bull_boss";
    json.state.combat.enemyHp = 400;
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(json) });
  });
  await page.goto(`${BASE_URL}/?fixture=midgame`, { waitUntil: "load" });
  await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
  await page.waitForTimeout(4200);
  await page.locator('[data-guide-id="sidebar.combat"]').first().click({ timeout: 8000 });
  await page.waitForSelector(".a25-root", { timeout: 10000 });
  await page.waitForTimeout(900);

  await page.screenshot({ path: join(OUT_DIR, "arena25d-full.png") });
  await page.screenshot({ path: join(OUT_DIR, "arena25d-feet-player.png"), clip: { x: 550, y: 600, width: 500, height: 480 } });
  await page.screenshot({ path: join(OUT_DIR, "arena25d-feet-monster.png"), clip: { x: 950, y: 450, width: 550, height: 480 } });
  console.log("SAVED feet closeups");
  await browser.close();
} finally {
  child.kill();
}
