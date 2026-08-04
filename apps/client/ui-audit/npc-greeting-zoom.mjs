#!/usr/bin/env node
// Einmaliger Close-up-Shot des NpcGreeting-Bausteins (2x-Skalierung) — Rahmen/Zeiger-Qualität
// mit bloßem Auge prüfen. Wegwerf-Begleiter zu npc-greeting-check.mjs, gleicher Server-Ansatz.
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5246;
const BASE_URL = `http://localhost:${PORT}`;
const OUT_DIR = "C:\\Users\\MSchu\\AppData\\Local\\Temp\\claude\\G--GameDev\\553d2095-3a73-4795-9782-0fe746a25f13\\scratchpad";

const viteBin = join(CLIENT_DIR, "node_modules", "vite", "bin", "vite.js");
const child = spawn(process.execPath, [viteBin, "dev", "--config", join(CLIENT_DIR, "ui-audit", "vite.tour.config.mjs"), "--port", String(PORT), "--strictPort"], { cwd: CLIENT_DIR, stdio: ["ignore", "pipe", "pipe"] });
try {
  const s = Date.now();
  let up = false;
  while (Date.now() - s < 40000) {
    try { const r = await fetch(BASE_URL); if (r.ok) { up = true; break; } } catch {}
    await new Promise((r) => setTimeout(r, 300));
  }
  if (!up) { console.error("SERVER NOT UP"); process.exit(1); }
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 });
  await page.goto(`${BASE_URL}/?fixture=midgame`, { waitUntil: "load" });
  await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
  await page.waitForTimeout(3000);
  await page.locator('[data-guide-id="topbar.bank"]').first().click();
  await page.waitForSelector(".npc-greeting", { timeout: 8000 });
  await page.waitForTimeout(400);
  await page.locator(".npc-greeting").screenshot({ path: join(OUT_DIR, "npc-greeting-zoom-bank.png") });
  console.log("SHOT SAVED: npc-greeting-zoom-bank.png");
  await browser.close();
} finally {
  child.kill();
}
