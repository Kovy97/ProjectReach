#!/usr/bin/env node
/**
 * Perf-Messkript "Menüs müssen flüssiger sein" (Chef-Befund, Live-Test): Smithing ruckelt am
 * stärksten (die meisten Aktions-Karten). Misst 10s lang bei LAUFENDER Aktion:
 *   - Long-Tasks (PerformanceObserver, entryType "longtask") — funktioniert immer, browser-nativ.
 *   - Frame-Zeiten (rAF-Deltas, p95) — funktioniert immer, browser-nativ.
 *   - React-Profiler-Commits (actualDuration je Commit) + computeActionRate-Aufrufe/s — lesen
 *     window.__perfCommits / window.__actionRateCalls. Diese wurden für die Baseline-Messung
 *     durch TEMPORÄRE Instrumentierung in App.tsx (<Profiler onRender>) + util/actionRate.ts
 *     (Aufruf-Zähler) befüllt — beide wieder entfernt (Regel: "Messcode restlos entfernen, nur
 *     das Mess-Skript bleibt"). Ohne diese Instrumentierung liefern die beiden Felder einfach
 *     0/leer — die Long-Task/Frame-Metriken (die eigentlichen Erfolgskriterien) bleiben aussagekräftig.
 *     Zum Reproduzieren der Profiler/Zähler-Zahlen: die beiden Blöcke aus dem Task-Verlauf/Diff-
 *     Historie kurzzeitig wieder einfügen, messen, wieder entfernen.
 * Vergleichsläufe auf SkillsOverview + Shop (gleiche Messfunktion, andere Seite).
 *
 * Headless (kein Electron), Muster wie tooltip-shot-304/307/308.mjs: eigener Vite-Dev-Server
 * (vite.tour.config.mjs) + Playwright-Chromium, PORT 5225 (Chef-Vorgabe für diese Messung).
 *
 * Ablauf: fixture=midgame laden → im Shop 100× Bronzebarren kaufen (echter UI-Flow, kein
 * Engine-Hack — Bronzebarren sind direkt im Shop kaufbar) → auf Smithing "Bronze-Dolch schmieden"
 * mit "Alle" starten (läuft ~100 Ticks durch, mehr als genug für die 10s-Messfenster) → messen.
 *
 * Run: node ui-audit/perf-smithing-audit.mjs   (from apps/client/)
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5225;
const BASE_URL = `http://localhost:${PORT}`;
const VIEWPORT = { width: 1600, height: 1000 };
const WINDOW_MS = 10_000;

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
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

function percentile(arr, p) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor(p * (sorted.length - 1)));
  return sorted[idx];
}

function stats(arr) {
  if (arr.length === 0) return { count: 0, avg: 0, p95: 0, max: 0, sum: 0 };
  const sum = arr.reduce((a, b) => a + b, 0);
  return {
    count: arr.length,
    avg: sum / arr.length,
    p95: percentile(arr, 0.95),
    max: Math.max(...arr),
    sum,
  };
}

/** Misst WINDOW_MS lang auf der aktuell sichtbaren Seite: Long-Tasks, Frame-Deltas,
 *  computeActionRate-Aufrufe, React-Profiler-Commits (alle __perfCommits-IDs). */
async function measure(page, durationMs) {
  return page.evaluate((durationMs) => {
    return new Promise((resolve) => {
      window.__actionRateCalls = 0;
      window.__perfCommits = {};
      const longTasks = [];
      let po = null;
      try {
        po = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) longTasks.push(entry.duration);
        });
        po.observe({ entryTypes: ["longtask"] });
      } catch {
        // longtask entryType not supported — leave empty, still have frame deltas
      }
      const frameDeltas = [];
      let last = performance.now();
      let rafId = 0;
      const loop = (now) => {
        frameDeltas.push(now - last);
        last = now;
        rafId = requestAnimationFrame(loop);
      };
      rafId = requestAnimationFrame(loop);
      setTimeout(() => {
        cancelAnimationFrame(rafId);
        if (po) po.disconnect();
        resolve({
          longTasks,
          frameDeltas: frameDeltas.slice(1), // erstes Delta = Zeit bis 1. rAF, kein echtes Frame
          actionRateCalls: window.__actionRateCalls || 0,
          perfCommits: window.__perfCommits || {},
        });
      }, durationMs);
    });
  }, durationMs);
}

function report(label, raw, windowMs) {
  const longTaskStats = stats(raw.longTasks);
  const frameStats = stats(raw.frameDeltas);
  const perCommitStats = {};
  for (const [id, arr] of Object.entries(raw.perfCommits)) {
    perCommitStats[id] = stats(arr);
  }
  console.log(`\n=== ${label} (${(windowMs / 1000).toFixed(0)}s window) ===`);
  console.log(
    `  long-tasks: n=${longTaskStats.count} sum=${longTaskStats.sum.toFixed(1)}ms max=${longTaskStats.max.toFixed(1)}ms`,
  );
  console.log(
    `  frame-delta: n=${frameStats.count} avg=${frameStats.avg.toFixed(2)}ms p95=${frameStats.p95.toFixed(2)}ms max=${frameStats.max.toFixed(2)}ms`,
  );
  console.log(`  computeActionRate calls: ${raw.actionRateCalls} (${(raw.actionRateCalls / (windowMs / 1000)).toFixed(1)}/s)`);
  for (const [id, s] of Object.entries(perCommitStats)) {
    console.log(
      `  profiler[${id}]: commits=${s.count} avgActual=${s.avg.toFixed(2)}ms p95Actual=${s.p95.toFixed(2)}ms maxActual=${s.max.toFixed(2)}ms sumActual=${s.sum.toFixed(1)}ms`,
    );
  }
  return { longTaskStats, frameStats, actionRateCalls: raw.actionRateCalls, perCommitStats };
}

async function main() {
  console.log(`[perf] starting dev server on port ${PORT}...`);
  const server = startDevServer();
  const up = await waitForServer(BASE_URL, 30_000);
  if (!up) {
    console.error("[perf] dev server did not come up in time:\n" + server.getOutput());
    server.child.kill();
    process.exitCode = 1;
    return;
  }
  console.log("[perf] dev server is up.");

  const browser = await chromium.launch();
  const results = {};
  try {
    const page = await browser.newPage({ viewport: VIEWPORT });
    page.on("pageerror", (err) => console.error("[perf] pageerror:", err.message));

    await page.goto(`${BASE_URL}/?fixture=midgame`, { waitUntil: "load" });
    await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15_000 });
    await page.waitForTimeout(4200); // Fixture-Load-Achievement-Toasts abklingen lassen

    // ── Shop: 100x Bronzebarren kaufen (echter UI-Flow — Bronzebarren sind direkt kaufbar) ──
    await page.locator('[data-guide-id="topbar.shop"]').first().click();
    await page.waitForTimeout(400);
    // Locale defaults to "de" (I18nProvider initialLocale) — item/action names render German.
    const bronzeBarCard = page.locator(".shopv2-card", { has: page.locator(".shopv2-card-name", { hasText: "Bronzebarren" }) }).first();
    await bronzeBarCard.waitFor({ timeout: 10_000 });
    const buy100 = bronzeBarCard.locator(".shopv2-buyqty-btn").nth(3); // BUY_QTYS = [1,5,25,100]
    await buy100.click();
    await page.waitForTimeout(200);
    console.log("[perf] bought 100x Bronze Bar");

    // ── Smithing: "Forge Bronze Dagger" mit Menge "Alle" starten (läuft durch alle 100 Barren) ──
    await page.locator('[data-guide-id="sidebar.smithing"]').first().click();
    await page.waitForTimeout(500);
    const daggerCard = page.locator(".skillcard", { has: page.locator(".skillcard-title", { hasText: "Bronze-Dolch schmieden" }) }).first();
    await daggerCard.waitFor({ timeout: 10_000 });
    await daggerCard.locator(".skillcard-cta.qty.all").click();
    await page.waitForTimeout(1500); // paar Ticks anlaufen lassen, bevor gemessen wird

    const activeCheck = await page.locator(".skillcard.active").count();
    console.log(`[perf] active smithing card present: ${activeCheck > 0} (expect true — action must stay running)`);

    // ── Behavior-Beleg: Craftbar-Zähler/Inv-Count aktualisieren sich weiter (Screenshot-Paar) ──
    await page.screenshot({ path: join(__dirname, "perf-smithing-t0.png") });
    const invCountBefore = await page.locator(".skillcard.active .skillcard-invcount").first().textContent();

    // ── Messung 1: Smithing (aktive Crafting-Aktion, ~60-80 Karten sichtbar) ──
    results.smithing = report("Smithing (action running)", await measure(page, WINDOW_MS), WINDOW_MS);

    await page.screenshot({ path: join(__dirname, "perf-smithing-t10.png") });
    const invCountAfter = await page.locator(".skillcard.active .skillcard-invcount").first().textContent();
    console.log(`[perf] inv-count label before=${invCountBefore?.trim()} after=${invCountAfter?.trim()} (should differ — proves UI kept updating)`);
    const stillActive = await page.locator(".skillcard.active").count();
    console.log(`[perf] still active after 10s measure: ${stillActive > 0}`);

    // ── Messung 2: SkillsOverview (Vergleich — nur ~19 Skill-Karten) ──
    await page.locator('[data-guide-id="sidebar.skills-overview"]').first().click();
    await page.waitForTimeout(500);
    results.skillsOverview = report("SkillsOverview (comparison)", await measure(page, WINDOW_MS), WINDOW_MS);

    // ── Messung 3: Shop (Vergleich — Buy-Grid, ~73 Einträge, aber keine computeActionRate) ──
    await page.locator('[data-guide-id="topbar.shop"]').first().click();
    await page.waitForTimeout(500);
    results.shop = report("Shop (comparison)", await measure(page, WINDOW_MS), WINDOW_MS);

    console.log("\n[perf] done. Screenshots: perf-smithing-t0.png / perf-smithing-t10.png in ui-audit/");
  } finally {
    await browser.close();
    server.child.kill();
  }
}

main().catch((err) => {
  console.error("[perf] fatal:", err);
  process.exitCode = 1;
});
