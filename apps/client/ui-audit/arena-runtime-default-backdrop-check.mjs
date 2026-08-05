#!/usr/bin/env node
/**
 * Scene-Builder-Upgrade-Welle 05.08., Nachweis E: Arena-LAUFZEIT ohne `backdropLayout`-Block
 * verhält sich wie vorher — pastures.json trägt KEINEN Block, `resolveBackdropLayout(undefined)`
 * liefert exakt die Code-Konstanten (BACKDROP_Z/BACKDROP_HEIGHT, widthScale 1, yOffset 0).
 * Dieser Screenshot ist der empirische Beleg dazu (Pastures-Kampf, Arena an, 1920×1080).
 *
 * openCombat/Fixture-Routing 1:1 aus arena25d-manifest-verify.mjs (s. dort für Begründungen).
 * Run: node ui-audit/arena-runtime-default-backdrop-check.mjs   (from apps/client/)
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5342;
const BASE_URL = `http://localhost:${PORT}`;
const OUT_DIR = process.env.SHOT_DIR || join(__dirname, "_shots-scenebuilder-welle");
mkdirSync(OUT_DIR, { recursive: true });

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
    try {
      const r = await fetch(url);
      if (r.ok) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

const { child, getOutput } = startDevServer();
try {
  const ok = await waitForServer(BASE_URL);
  if (!ok) {
    console.error("SERVER NOT UP:\n" + getOutput());
    process.exit(1);
  }
  const browser = await chromium.launch({
    args: ["--headless=new", "--use-gl=angle", "--use-angle=d3d11", "--ignore-gpu-blocklist", "--enable-gpu"],
  });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push("console: " + m.text());
  });
  await page.addInitScript(() => {
    localStorage.setItem("gr.combatFxLevel", "full");
    localStorage.setItem("gr.arena25d", "1");
  });
  await page.route(`**/ui-audit-fixtures/midgame.json`, async (route) => {
    const res = await route.fetch();
    const json = JSON.parse(await res.text());
    json.state.onboarding = {
      ...(json.state.onboarding ?? {}),
      active: false,
      toursSeen: { combat: true, shop: true, bank: true, featureTourV1: true, featureTourV2: true },
    };
    json.state.combat.monsterId = "bull_boss";
    json.state.combat.enemyHp = 400;
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(json) });
  });
  await page.goto(`${BASE_URL}/?fixture=midgame`, { waitUntil: "load" });
  await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
  await page.waitForTimeout(4200);
  await page.locator('[data-guide-id="sidebar.combat"]').first().click({ timeout: 8000 });
  await page.waitForSelector(".battle-arena", { timeout: 10000 });
  const mounted = await page
    .waitForSelector(".a25-root", { timeout: 10000 })
    .then(() => true)
    .catch(() => false);
  console.log(`.a25-root mounted (Arena an, Pastures, KEIN backdropLayout im Manifest): ${mounted}`);
  await page.waitForTimeout(7000);
  await page.screenshot({ path: join(OUT_DIR, "arena-runtime-default-backdrop.png") });
  console.log("SHOT SAVED: arena-runtime-default-backdrop.png");
  console.log(`[errors] ${errors.length ? errors.length + ":\n" + errors.slice(0, 10).join("\n") : "keine"}`);
  await browser.close();
  process.exitCode = mounted && errors.length === 0 ? 0 : 1;
} finally {
  child.kill();
}
