#!/usr/bin/env node
/**
 * Chef-Audit 2026-07-09 („Emberforge Hammer 0.0% — kontrolliere diese ganzen Details!"):
 * Verifiziert die drei Wiki-Detail-Fixes am gerenderten Modal —
 *   1. emberforge_hammer: Chase-Drop 1/3125 zeigt Bruch-Format statt „0.0%"
 *   2. gravetato:         Farming-Ertrag zeigt eine Quelle (Beet, 100%) statt leerer Sektion
 *   3. slayer_war_brew:   Slayer-Shop-Quelle mit Punkte-Preis statt leerer Sektion
 * Muster: tooltip-shot-308.mjs (headless Vite+Playwright) + In-Memory-Fixture-Patch via
 * page.route (invfilter-shot-309-Idiom) — die drei Items werden in Inventar-Slots 0-2 gelegt.
 * Run: node ui-audit/wiki-audit-shot-309.mjs   (from apps/client/)
 */
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const SHOTS_DIR = join(__dirname, "shots-309");
const PORT = 5215;
const BASE_URL = `http://localhost:${PORT}`;

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

const CASES = [
  // Chef-Entscheid 2026-07-09: IMMER Prozent — 1/3125 ⇒ „0.03%" (nie „0.0%").
  { slot: 0, id: "emberforge_hammer", expectVal: /^0[.,]03\s?%$/, label: "Chase-Drop als Prozent mit Dezimalen" },
  { slot: 1, id: "gravetato", expectVal: /^100%$/, label: "Farming-Quelle 100%" },
  { slot: 2, id: "slayer_war_brew", expectVal: /Punkte|Points|puntos|points|pontos|очк|点/i, label: "Slayer-Shop-Preis" },
];

async function main() {
  mkdirSync(SHOTS_DIR, { recursive: true });
  console.log(`[wiki309] starting dev server on port ${PORT}...`);
  const server = startDevServer();
  if (!(await waitForServer(BASE_URL, 30_000))) {
    console.error("[wiki309] dev server did not come up:\n" + server.getOutput());
    server.child.kill();
    process.exitCode = 1;
    return;
  }

  const fixtureRaw = readFileSync(join(CLIENT_DIR, "src/renderer/public/ui-audit-fixtures/endgame.json"), "utf-8");
  const fixture = JSON.parse(fixtureRaw);
  for (const c of CASES) fixture.state.inventory.slots[c.slot] = { itemId: c.id, qty: 1 };

  const browser = await chromium.launch();
  let failed = false;
  try {
    const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
    page.on("pageerror", (err) => console.error("[wiki309] pageerror:", err.message));
    await page.route("**/ui-audit-fixtures/endgame.json", (route) =>
      route.fulfill({ contentType: "application/json", body: JSON.stringify(fixture) }),
    );

    await page.goto(`${BASE_URL}/?fixture=endgame`, { waitUntil: "load" });
    await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15_000 });
    await page.waitForTimeout(4200);
    await page.locator('[data-guide-id="topbar.character"]').first().click();
    await page.waitForTimeout(400);

    for (const c of CASES) {
      const cell = page.locator(".cs-inv-grid .cs-inv-slot-wrap").nth(c.slot).locator(".item-cell").first();
      await cell.click();
      await page.waitForTimeout(300);
      await page.locator(".itip-wiki-btn").first().click();
      await page.waitForTimeout(300);
      const rows = await page.locator(".iwk-section").nth(0).locator(".iwk-row").count();
      const vals = await page.locator(".iwk-section").nth(0).locator(".iwk-row-val").allInnerTexts();
      const hit = vals.some((v) => c.expectVal.test(v.trim()));
      console.log(`[wiki309] ${c.id}: ${rows} Quelle(n), Werte=[${vals.join(" | ")}] → ${c.label}: ${hit ? "OK" : "FAIL"}`);
      if (rows === 0 || !hit) failed = true;
      await page.screenshot({ path: join(SHOTS_DIR, `${c.id}.png`), fullPage: true });
      await page.keyboard.press("Escape");
      await page.waitForTimeout(200);
    }
  } finally {
    await browser.close();
    server.child.kill();
  }
  console.log(failed ? "[wiki309] MINDESTENS EIN FAIL" : "[wiki309] alle 3 Fälle OK");
  process.exitCode = failed ? 1 : 0;
}

main();
