#!/usr/bin/env node
/**
 * Chef-Auftrag 2026-07-24 "Backdrop-Fit: Breite-füllend statt contain": Screenshot-Beleg bei
 * 3440×1440 (Ultrawide, wo die `contain`-Logik vom Vortag Ränder links/rechts stehen lässt) UND
 * 1920×1080 (Referenz). Turm-Etage 2 (slayer_tower_2.webp, 1536×1024 Querformat) zeigt den Fix,
 * "Pastures" (Hochformat) dient als Regressionscheck — die Hochformat-Kulissen sind von diesem Fix
 * unberührt (nur `.backdrop-landscape` geändert).
 *
 * Headless (kein Electron), Muster wie backdrop-aspect-shot.mjs.
 *
 * Run: node ui-audit/backdrop-fit-ultrawide-shot.mjs <tag> <width> <height>
 *   z.B.: node ui-audit/backdrop-fit-ultrawide-shot.mjs before 3440 1440
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5262;
const BASE_URL = `http://localhost:${PORT}`;
const tag = process.argv[2] || "after";
const width = Number(process.argv[3]) || 3440;
const height = Number(process.argv[4]) || 1440;

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
  const page = await browser.newPage({ viewport: { width, height } });
  page.on("pageerror", (e) => console.error(`[${label}] pageerror:`, e.message));
  await page.addInitScript(() => localStorage.setItem("gr.combatFxLevel", "full"));
  await routeFixture(page, "midgame", patch);
  await page.goto(`${BASE_URL}/?fixture=midgame`, { waitUntil: "load" });
  await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
  await page.waitForTimeout(4200);
  await page.locator('[data-guide-id="sidebar.combat"]').first().click({ timeout: 8000 });
  await page.waitForSelector(".battle-arena", { timeout: 10000 });
  return page;
}

const { child, getOutput } = startDevServer();
try {
  const ok = await waitForServer(BASE_URL);
  if (!ok) { console.error("SERVER NOT UP:\n" + getOutput()); process.exit(1); }
  const browser = await chromium.launch();
  const resLabel = `${width}x${height}`;

  // ── Turm-Etage 2 "Die Spiegelhallen" — Querformat-Backdrop (slayer_tower_2.webp) ──
  {
    const page = await openCombat(browser, "tower2", (s) => {
      s.combat.monsterId = "gaze_basilisk";
      s.combat.enemyHp = 15;
    });
    const info = await page.evaluate(() => {
      const el = document.querySelector(".fighter-backdrop-drift");
      const r = el?.getBoundingClientRect();
      return el
        ? {
            cls: el.className,
            bgSize: getComputedStyle(el).backgroundSize,
            bgPos: getComputedStyle(el).backgroundPosition,
            rect: r ? { w: r.width, h: r.height } : null,
          }
        : null;
    });
    console.log(`tower2 (${tag} @ ${resLabel}): ${JSON.stringify(info)}`);
    await page.screenshot({ path: join(__dirname, `backdrop-fit-tower2-${resLabel}-${tag}.png`) });
    await page.close();
  }

  // ── Normale Zone "Pastures" — Hochformat-Backdrop (Regressionscheck, sollte unverändert sein) ──
  {
    const page = await openCombat(browser, "pastures", (s) => {
      s.combat.monsterId = "bull_boss";
      s.combat.enemyHp = 60;
    });
    const info = await page.evaluate(() => {
      const el = document.querySelector(".fighter-backdrop-drift");
      return el ? { cls: el.className, bgSize: getComputedStyle(el).backgroundSize, bgPos: getComputedStyle(el).backgroundPosition } : null;
    });
    console.log(`pastures (${tag} @ ${resLabel}): ${JSON.stringify(info)}`);
    await page.screenshot({ path: join(__dirname, `backdrop-fit-pastures-${resLabel}-${tag}.png`) });
    await page.close();
  }

  console.log(`[backdrop-fit-ultrawide-shot] done (${tag} @ ${resLabel}).`);
  await browser.close();
} finally {
  child.kill();
}
