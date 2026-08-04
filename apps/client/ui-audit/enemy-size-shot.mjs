#!/usr/bin/env node
/** Chef Bild #70: Gegner-Größe in der Arena — Vorher/Nachher-Shot (Skeleton Archer + Bulle). Port 5244. */
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5244;
const OUT_DIR = "C:\\Users\\MSchu\\AppData\\Local\\Temp\\claude\\G--GameDev\\553d2095-3a73-4795-9782-0fe746a25f13\\scratchpad";
const fixture = JSON.parse(readFileSync(join(__dirname, "fixtures", "midgame.json"), "utf8"));
const viteBin = join(CLIENT_DIR, "node_modules", "vite", "bin", "vite.js");
const child = spawn(process.execPath, [viteBin, "dev", "--config", join(__dirname, "vite.tour.config.mjs"), "--port", String(PORT), "--strictPort"], { cwd: CLIENT_DIR, stdio: ["ignore", "ignore", "ignore"] });
try {
  const s = Date.now();
  while (Date.now() - s < 40000) { try { const r = await fetch(`http://localhost:${PORT}`); if (r.ok) break; } catch {} await new Promise((r) => setTimeout(r, 300)); }
  const browser = await chromium.launch();
  for (const [tag, monsterId] of [["skeleton", "skeleton_archer"], ["bull", "bull_boss"]]) {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    await page.route("**/ui-audit-fixtures/midgame.json", (route) => {
      const f = JSON.parse(JSON.stringify(fixture));
      f.state.combat.monsterId = monsterId;
      f.state.combat.enemyHp = 60;
      route.fulfill({ json: f });
    });
    await page.goto(`http://localhost:${PORT}/?fixture=midgame`, { waitUntil: "load" });
    await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
    await page.waitForTimeout(3500);
    await page.locator('[data-guide-id="sidebar.combat"]').first().click();
    await page.waitForTimeout(1500);
    const m = await page.evaluate(() => {
      const p = document.querySelector(".arena-side-player .fighter-figure-art img")?.getBoundingClientRect();
      const e = document.querySelector(".arena-side-enemy .fighter-figure-art img")?.getBoundingClientRect();
      const r = (b) => (b ? Math.round(b.height) : 0);
      return { player: r(p), enemy: r(e) };
    });
    console.log(`${tag}: Spieler-Bild ${m.player}px hoch · Gegner-Bild ${m.enemy}px hoch`);
    await page.locator(".battle-arena").screenshot({ path: join(OUT_DIR, `enemy-size-${tag}.png`) });
    console.log(`SHOT SAVED: enemy-size-${tag}.png`);
    await page.close();
  }
  await browser.close();
} finally { child.kill(); }
