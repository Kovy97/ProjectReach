#!/usr/bin/env node
/**
 * Chef-Auftrag 2026-07-23 "Querformat-Kulissen (Turm-Etage 2-5)": Screenshot-Beleg für die
 * Backdrop-Zuschnitt-Anpassung — Turm-Etage 2 (slayer_tower_2.webp, 1536×1024 Querformat, "Die
 * Spiegelhallen") und eine normale Zone (pastures.webp, 1122×1402 Hochformat) im laufenden Kampf.
 * Läuft zweimal hintereinander: einmal VOR dem Fix (Datei-Suffix -before) — dafür dieses Skript
 * VOR dem Backdrop-Code-Edit einmal ausführen — einmal DANACH (-after).
 *
 * Headless (kein Electron), Muster wie sweep2-t7-arena.mjs (routeFixture + eigener Vite-Dev-
 * Server, vite.tour.config.mjs), PORT 5261.
 *
 * Run: node ui-audit/backdrop-aspect-shot.mjs [before|after]   (from apps/client/)
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5261;
const BASE_URL = `http://localhost:${PORT}`;
const tag = process.argv[2] === "after" ? "after" : "before";

function startDevServer() {
  const viteBin = join(CLIENT_DIR, "node_modules", "vite", "bin", "vite.js");
  const child = spawn(
    process.execPath,
    [viteBin, "dev", "--config", join(CLIENT_DIR, "ui-audit", "vite.tour.config.mjs"), "--port", String(PORT), "--strictPort"],
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
async function routeFixture(page, fixtureName, mutator) {
  await page.route(`**/ui-audit-fixtures/${fixtureName}.json`, async (route) => {
    const res = await route.fetch();
    const json = JSON.parse(await res.text());
    json.state.onboarding = {
      ...(json.state.onboarding ?? {}),
      active: false,
      toursSeen: { combat: true, shop: true, bank: true, featureTourV1: true },
    };
    mutator(json.state);
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(json) });
  });
}

async function openCombat(browser, label, patch) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on("pageerror", (e) => console.error(`[${label}] pageerror:`, e.message));
  await page.addInitScript(() => localStorage.setItem("gr.combatFxLevel", "full"));
  await routeFixture(page, "midgame", patch);
  await page.goto(`${BASE_URL}/?fixture=midgame`, { waitUntil: "load" });
  await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
  await page.waitForTimeout(4200); // Fixture-Load-Achievement-Toasts abklingen lassen (perf-smithing-audit.mjs-Muster)
  await page.locator('[data-guide-id="sidebar.combat"]').first().click({ timeout: 8000 });
  await page.waitForSelector(".battle-arena", { timeout: 10000 });
  return page;
}

const { child, getOutput } = startDevServer();
try {
  const ok = await waitForServer(BASE_URL);
  if (!ok) { console.error("SERVER NOT UP:\n" + getOutput()); process.exit(1); }
  const browser = await chromium.launch();

  // ── Turm-Etage 2 "Die Spiegelhallen" — Querformat-Backdrop (slayer_tower_2.webp) ──
  {
    const page = await openCombat(browser, "tower2", (s) => {
      s.combat.monsterId = "gaze_basilisk";
      s.combat.enemyHp = 15;
    });
    await page.waitForTimeout(1800); // Ken-Burns-Drift ein Stück einlaufen lassen (Crop sichtbar machen)
    const bg = await page.evaluate(() => {
      const el = document.querySelector(".fighter-backdrop-drift");
      return el ? { cls: el.className, bgImage: getComputedStyle(el).backgroundImage, bgSize: getComputedStyle(el).backgroundSize } : null;
    });
    const probe = await page.evaluate(() => new Promise((res) => {
      const img = new Image();
      img.onload = () => res({ w: img.naturalWidth, h: img.naturalHeight, ratio: img.naturalWidth / img.naturalHeight });
      img.onerror = () => res("ERR");
      img.src = "/assets/battlescreens/slayer_tower_2.webp";
    }));
    console.log(`tower2 (${tag}): backdrop=${JSON.stringify(bg)} probe=${JSON.stringify(probe)}`);
    await page.screenshot({ path: join(__dirname, `backdrop-aspect-tower2-${tag}.png`) });
    await page.close();
  }

  // ── Normale Zone "Pastures" — Hochformat-Backdrop (pastures.webp), Referenz/Regression ──
  {
    const page = await openCombat(browser, "pastures", (s) => {
      s.combat.monsterId = "bull_boss";
      s.combat.enemyHp = 60;
    });
    await page.waitForTimeout(1800);
    const bg = await page.evaluate(() => {
      const el = document.querySelector(".fighter-backdrop-drift");
      return el ? { cls: el.className, bgImage: getComputedStyle(el).backgroundImage, bgSize: getComputedStyle(el).backgroundSize } : null;
    });
    const probe = await page.evaluate(() => new Promise((res) => {
      const img = new Image();
      img.onload = () => res({ w: img.naturalWidth, h: img.naturalHeight, ratio: img.naturalWidth / img.naturalHeight });
      img.onerror = () => res("ERR");
      img.src = "/assets/battlescreens/pastures.webp";
    }));
    console.log(`pastures (${tag}): backdrop=${JSON.stringify(bg)} probe=${JSON.stringify(probe)}`);
    await page.screenshot({ path: join(__dirname, `backdrop-aspect-pastures-${tag}.png`) });
    await page.close();
  }

  console.log(`[backdrop-aspect-shot] done (${tag}). Screenshots in ui-audit/backdrop-aspect-*-${tag}.png`);
  await browser.close();
} finally {
  child.kill();
}
