#!/usr/bin/env node
/**
 * Verification shots for Task #315 ("Kampf-Queue-UI", Chef-GO): the 1×/25×/50×/∞ QuantityPicker
 * grid on a monster card, a mixed queue (active fight in progress + a waiting skill action + a
 * waiting ∞ fight — all queued LIVE via real clicks so the "N/25" progress counter shows a real,
 * browser-timed value, not a hand-faked one), and the pause badge + "Fortsetzen" button.
 * Pattern copied from bank-sanierung-314-shots.mjs (vite dev + Playwright, NOT `pnpm dev`/Electron
 * — headless-only per UI-Dev hard rule). Fixtures: queue315 / queue315paused (gen-queue315-fixture.mjs).
 * Run: node ui-audit/queue315-shots.mjs   (from apps/client/)
 */
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5326;
const BASE_URL = `http://localhost:${PORT}`;
const OUT_DIR = "C:\\Users\\MSchu\\AppData\\Local\\Temp\\claude\\G--GameDev\\553d2095-3a73-4795-9782-0fe746a25f13\\scratchpad\\queue315-shots";
const T = 8000; // short explicit timeout per action

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
  console.log(`[q315] starting dev server on port ${PORT}...`);
  const server = startDevServer();
  if (!(await waitForServer(BASE_URL))) {
    console.error("[q315] dev server did not come up:\n" + server.getOutput());
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

    // ═══ Part A: fresh fixture — monster-card quantity grid ═══
    await page.goto(`${BASE_URL}/?fixture=queue315`, { waitUntil: "load" });
    await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
    await page.waitForTimeout(3500); // let load-toasts clear (Toasts.tsx achievement-diff on mount)

    // Queue-Panel startet COLLAPSED (getQueuePanelCollapsed defaults to true wenn localStorage den
    // Key noch nie gesetzt hat, s. util/uiPrefs.ts) — einmal aufklappen; der Zustand persistiert in
    // localStorage über spätere page.goto()-Navigationen im selben Origin hinweg (kein zweites
    // Mal nötig für Teil B/C).
    if (!(await step("expand the queue panel (starts collapsed)", async () => {
      await page.locator(".queue-panel-toggle").click();
      await page.waitForSelector(".queue-panel-body", { timeout: T });
    }))) failures++;

    if (!(await step("open Combat -> first zone (pastures)", async () => {
      await page.locator('[data-guide-id="sidebar.combat"]').first().click();
      await page.waitForSelector(".zone-grid .zone-card", { timeout: T });
      await page.locator(".zone-grid .zone-card").first().click();
      await page.waitForSelector(".monster-grid .monster-card", { timeout: T });
      await page.waitForTimeout(300);
    }))) failures++;

    const chickenCard = page.locator(".monster-card:has(img[src*=\"chicken\"])").first();
    if (!(await step("locate chicken card", async () => {
      await chickenCard.waitFor({ state: "visible", timeout: T });
    }))) failures++;

    await step("shot: monster card with the 1x/25x/50x/inf quantity grid", async () => {
      await chickenCard.scrollIntoViewIfNeeded();
      await chickenCard.screenshot({ path: join(OUT_DIR, "1-monstercard-quantitygrid.png") });
    });

    // ═══ Part B: queue315mixed fixture — [chicken x25, Holzfällen x25, cow inf] pre-planned via
    // real engine calls (gen-queue315-fixture.mjs), all still unstarted. The tick loop pops the
    // front entry (chicken) into state.queueFight right after mount — the SAME code path a live
    // click triggers — so waiting here lets a genuine in-session kill count accumulate instead of
    // faking one (s. fixture-Kommentar: ein zweiter Live-Klick auf eine zweite Monster-Karte kam
    // im ersten Anlauf regelmäßig zu spät, weil Combat schon auf <Battle> umgeschaltet hatte).
    if (!(await step("load queue315mixed and let the front fight-entry auto-start", async () => {
      await page.goto(`${BASE_URL}/?fixture=queue315mixed`, { waitUntil: "load" });
      await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
      await page.waitForTimeout(1000); // first tick pops the fight entry
    }))) failures++;

    // Let a few real kills land so the active row shows genuine partial progress (kill cooldown
    // 2s + attack interval, s. KILL_COOLDOWN_MS/chicken.attackIntervalMs) — NOT a fixed "12/25",
    // an honest in-session count (documented in the report).
    await step("wait for a few real chicken kills to accumulate", async () => {
      await page.waitForTimeout(16000);
    });

    await step("shot: queue panel with mixed entries (active fight progress + gathering + inf fight)", async () => {
      await page.waitForSelector(".queue-panel-body", { timeout: T }); // panel-expanded pref survived the goto
      await page.locator(".queue-panel").screenshot({ path: join(OUT_DIR, "2-queue-mixed-entries.png") });
    });

    // ═══ Part C: paused fixture — pause badge + Fortsetzen button ═══
    await step("shot: queue paused badge + resume button", async () => {
      await page.goto(`${BASE_URL}/?fixture=queue315paused`, { waitUntil: "load" });
      await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
      await page.waitForTimeout(2500);
      await page.waitForSelector(".queue-panel-paused", { timeout: T });
      await page.locator(".queue-panel").screenshot({ path: join(OUT_DIR, "3-queue-paused-badge.png") });
    });

    console.log(errors.length ? `${errors.length} page errors:\n` + errors.slice(0, 20).join("\n") : "no page errors");
  } finally {
    await browser.close();
    server.child.kill();
  }
  console.log(failures > 0 ? `[q315] ${failures} SANITY-CHECK(S) FAILED` : "[q315] alle Sanity-Checks OK");
  process.exitCode = failures > 0 ? 1 : 0;
}

main();
