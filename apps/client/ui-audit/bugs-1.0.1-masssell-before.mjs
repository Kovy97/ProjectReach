#!/usr/bin/env node
/**
 * IST-ZUSTAND-Screenshots für den 1.0.1-Spielerbug „Massenverkauf verzauberter Items"
 * (Aldric, 54h54m, Gesamtlevel 1110: „Selling enchanted items is a real pain right now.
 * needs to be a way to select all or something.").
 * Fixture: masssell101.json (30 verzauberte Instanzen über 6 verschiedene Basis-Items, s.
 * gen-masssell101-fixture.mjs). Zeigt: der bestehende Mass-Sell-Modus (Task #323) hat KEINEN
 * globalen "Alle auswählen"-Schalter — jedes der 6 Basis-Items braucht seinen eigenen
 * Popup-Klickzyklus (Container-Zelle → "Ganzer Stapel"), macht 12 Klicks nur für die Auswahl.
 * Pattern nach mass-sell-323-shots.mjs.
 * Run: node ui-audit/bugs-1.0.1-masssell-before.mjs   (aus apps/client/)
 */
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5401;
const BASE_URL = `http://localhost:${PORT}`;
const OUT_DIR = "C:\\Users\\MSchu\\AppData\\Local\\Temp\\claude\\G--GameDev\\553d2095-3a73-4795-9782-0fe746a25f13\\scratchpad\\bugs-1.0.1-masssell";
const T = 6000;

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

async function waitForServer(url, timeoutMs = 30_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

let currentPage = null;

async function step(name, fn) {
  try {
    await fn();
    console.log(`ok: ${name}`);
    return true;
  } catch (e) {
    console.log(`!! FAILED: ${name} — ${e.message.split("\n")[0]}`);
    if (currentPage) {
      const p = join(OUT_DIR, `FAIL-${name.replace(/[^a-z0-9]+/gi, "_").slice(0, 60)}.png`);
      await currentPage.screenshot({ path: p }).catch(() => {});
      console.log(`  (failure screenshot: ${p})`);
    }
    return false;
  }
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  console.log(`[before] starting dev server on port ${PORT}...`);
  const server = startDevServer();
  if (!(await waitForServer(BASE_URL))) {
    console.error("[before] dev server did not come up:\n" + server.getOutput());
    server.child.kill();
    process.exitCode = 1;
    return;
  }

  const browser = await chromium.launch();
  let failures = 0;
  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
    currentPage = page;
    page.setDefaultTimeout(T);
    page.setDefaultNavigationTimeout(25000);
    const errors = [];
    page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
    page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });

    await page.goto(`${BASE_URL}/?fixture=masssell101`, { waitUntil: "load" });
    await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
    await page.waitForTimeout(5000);

    if (!(await step("open Shop -> Sell tab", async () => {
      await page.locator('[data-guide-id="topbar.shop"]').first().click();
      await page.waitForSelector(".shopv2-maintab", { timeout: T });
      await page.locator(".shopv2-maintab").nth(1).click(); // Sell
      await page.waitForSelector(".shopv2-sell-grid", { timeout: T });
      await page.waitForTimeout(400);
    }))) failures++;

    await step("shot: Sell grid overview (30 enchanted instances across 6 base items, normal mode)", async () => {
      await page.screenshot({ path: join(OUT_DIR, "before-1-sell-grid-overview.png") });
    });

    if (!(await step("enter Mass Sell mode", async () => {
      await page.locator(".mshop-toggle-btn").click();
      await page.waitForSelector(".mshop-bar", { timeout: T });
      await page.waitForTimeout(200);
    }))) failures++;

    await step("shot: Mass Sell mode entered — NO global select-all control anywhere", async () => {
      await page.screenshot({ path: join(OUT_DIR, "before-2-mode-entered-no-select-all.png") });
    });

    // Ist-Zustand: fuer JEDES der 6 Basis-Items einzeln oeffnen + "Ganzer Stapel" klicken.
    const containerCells = page.locator(".shopv2-sell-grid .item-cell[data-has-variants], .shopv2-sell-grid .shopv2-sell-cell .item-cell");
    let clicks = 0;
    const cellCount = await page.locator(".shopv2-sell-grid .shopv2-sell-cell").count();
    console.log(`[before] sell grid cell count: ${cellCount}`);

    if (!(await step("click 1st container cell (leather_helm) -> Stack/Single popup", async () => {
      const cell = page.locator('.shopv2-sell-grid .item-cell:has(img[src*="leather_helm"])').first();
      await cell.click();
      clicks++;
      await page.waitForSelector(".mshop-mode-choices", { timeout: T });
    }))) failures++;

    await step("shot: per-item popup — must be repeated once per base item (6x today)", async () => {
      await page.screenshot({ path: join(OUT_DIR, "before-3-per-item-popup.png") });
    });

    if (!(await step("choose 'Ganzer Stapel' for leather_helm", async () => {
      await page.locator(".mshop-mode-card").first().click();
      clicks++;
      await page.waitForTimeout(150);
    }))) failures++;

    // Die restlichen 5 Basis-Items genauso durchklicken, um die reale Klickzahl zu belegen.
    const restIds = ["leather_body", "leather_legs", "leather_boots", "copper_gauntlets", "rusty_sword"];
    for (const id of restIds) {
      if (!(await step(`click container cell (${id}) -> popup -> Ganzer Stapel`, async () => {
        const cell = page.locator(`.shopv2-sell-grid .item-cell:has(img[src*="${id}"])`).first();
        await cell.click();
        clicks++;
        await page.waitForSelector(".mshop-mode-choices", { timeout: T });
        await page.locator(".mshop-mode-card").first().click();
        clicks++;
        await page.waitForTimeout(120);
      }))) failures++;
    }

    console.log(`[before] clicks needed to select all 30 enchanted items today: ${clicks} (6 base items x 2 clicks each) — plus the mode toggle itself = ${clicks + 1}`);

    await step("shot: all 6 base-item containers selected (full selection reached, no shortcut existed)", async () => {
      await page.screenshot({ path: join(OUT_DIR, "before-4-all-selected-the-hard-way.png") });
    });

    console.log(errors.length ? `${errors.length} page errors:\n` + errors.slice(0, 20).join("\n") : "no page errors");
  } finally {
    await browser.close();
    server.child.kill();
  }
  console.log(failures > 0 ? `[before] ${failures} SANITY-CHECK(S) FAILED` : "[before] alle Sanity-Checks OK");
  process.exitCode = failures > 0 ? 1 : 0;
}

main();
