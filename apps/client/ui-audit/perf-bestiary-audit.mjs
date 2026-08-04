#!/usr/bin/env node
/**
 * Perf-Messkript "Bestiary Reise durch den Reach" (Konzept-4-Umbau, 2026-08-03): misst 10s lang
 * IDLE auf der neuen Bestiary-Seite (10 Zonen-Bänder mit Vollbild-Backdrops, s. BestiaryPage.tsx
 * `.bjw-band`) — Long-Tasks (PerformanceObserver) + Frame-Zeiten (rAF-Deltas). Läuft über beide
 * Chef-Auflösungen (1920x1080/3440x1440), Muster/Code-Gerüst 1:1 aus perf-combat-audit.mjs
 * übernommen (dieselbe Dev-Server-/Fixture-Route-/Measure-Infrastruktur).
 *
 * NUR gegen den DEV-Server (`vite dev`) — s. perf-combat-audit.mjs-Kopfkommentar für die
 * Begründung (Fixture-Ladepfad ist `import.meta.env.DEV`-gegated).
 *
 * Run: node ui-audit/perf-bestiary-audit.mjs   (from apps/client/)
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5272;
const BASE_URL = `http://localhost:${PORT}`;
const ALL_VIEWPORTS = [
  { label: "1920x1080", width: 1920, height: 1080 },
  { label: "3440x1440", width: 3440, height: 1440 },
];
const VIEWPORTS = process.env.PERF_ONLY_VIEWPORT
  ? ALL_VIEWPORTS.filter((v) => v.label === process.env.PERF_ONLY_VIEWPORT)
  : ALL_VIEWPORTS;
const WINDOW_MS = Number(process.env.PERF_WINDOW_MS) || 10_000;

function percentile(arr, p) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor(p * (sorted.length - 1)));
  return sorted[idx];
}
function stats(arr) {
  if (arr.length === 0) return { count: 0, avg: 0, p95: 0, max: 0, sum: 0 };
  const sum = arr.reduce((a, b) => a + b, 0);
  return { count: arr.length, avg: sum / arr.length, p95: percentile(arr, 0.95), max: Math.max(...arr), sum };
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

function startDevServer(port) {
  const viteBin = join(CLIENT_DIR, "node_modules", "vite", "bin", "vite.js");
  const child = spawn(
    process.execPath,
    [viteBin, "dev", "--config", join(__dirname, "vite.tour.config.mjs"), "--port", String(port), "--strictPort"],
    { cwd: CLIENT_DIR, stdio: ["ignore", "pipe", "pipe"] },
  );
  let out = "";
  child.stdout.on("data", (d) => (out += d.toString()));
  child.stderr.on("data", (d) => (out += d.toString()));
  return { child, getOutput: () => out };
}

/** Misst WINDOW_MS lang auf der aktuell sichtbaren Seite. */
async function measure(page, durationMs) {
  return page.evaluate((durationMs) => {
    return new Promise((resolve) => {
      const longTasks = [];
      let po = null;
      try {
        po = new PerformanceObserver((list) => {
          for (const e of list.getEntries()) longTasks.push(e.duration);
        });
        po.observe({ entryTypes: ["longtask"] });
      } catch {}
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
        resolve({ longTasks, frameDeltas: frameDeltas.slice(1) });
      }, durationMs);
    });
  }, durationMs);
}

function report(label, raw, windowMs) {
  const longTaskStats = stats(raw.longTasks);
  const frameStats = stats(raw.frameDeltas);
  console.log(`\n=== ${label} (${(windowMs / 1000).toFixed(0)}s window) ===`);
  console.log(`  long-tasks: n=${longTaskStats.count} sum=${longTaskStats.sum.toFixed(1)}ms max=${longTaskStats.max.toFixed(1)}ms`);
  console.log(
    `  frame-delta: n=${frameStats.count} avg=${frameStats.avg.toFixed(2)}ms p95=${frameStats.p95.toFixed(2)}ms max=${frameStats.max.toFixed(2)}ms` +
      ` (~${(1000 / frameStats.avg).toFixed(1)} FPS avg)`,
  );
  return { longTaskStats, frameStats };
}

async function main() {
  console.log(`[perf] starting dev server on port ${PORT}...`);
  const server = startDevServer(PORT);
  const up = await waitForServer(BASE_URL);
  if (!up) {
    console.error("DEV SERVER NOT UP:\n" + server.getOutput());
    server.child.kill();
    process.exitCode = 1;
    return;
  }

  const browser = await chromium.launch();
  try {
    const results = [];
    for (const viewport of VIEWPORTS) {
      const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
      page.on("pageerror", (e) => console.error("pageerror:", e.message));
      await page.addInitScript(() => localStorage.setItem("hearthforge:locale", "en"));
      await page.goto(`${BASE_URL}/?fixture=midgame`, { waitUntil: "load" });
      await page.waitForSelector('[data-guide-id^="topbar."]', { timeout: 15000 });
      const skip = page.getByText("Skip").first();
      if ((await skip.count()) > 0) await skip.click({ timeout: 4000 }).catch(() => {});
      await page.locator('[data-guide-id="topbar.bestiary"]').first().click({ timeout: 10000 });
      await page.waitForSelector(".bjw-band", { timeout: 10000 });
      // Settle: alle 10 Bänder liegen im DOM (content-visibility:auto entkoppelt Paint/Decode, aber
      // der erste eager-geladene Band-Hintergrund soll fertig dekodiert sein, bevor gemessen wird —
      // sonst zählt der Decode-Jank des allerersten Frames mit in die "Idle"-Messung hinein).
      await page.waitForTimeout(1000);
      const dpr = await page.evaluate(() => window.devicePixelRatio);
      const label = `Bestiary "Reise durch den Reach" idle @ ${viewport.label} (dpr=${dpr}, ${((viewport.width * viewport.height) / 1e6).toFixed(2)}MP) — midgame, 10 Zonen-Bänder`;
      const result = report(label, await measure(page, WINDOW_MS), WINDOW_MS);
      results.push({ viewport: viewport.label, ...result });
      await page.screenshot({ path: join(__dirname, `perf-bestiary-idle-${viewport.label}.png`) });
      await page.close();
    }
    if (results.length > 1) {
      console.log("\n=== Vergleichstabelle (Bestiary idle) ===");
      for (const r of results) {
        console.log(
          `  ${r.viewport.padEnd(10)} avgFrame=${r.frameStats.avg.toFixed(2)}ms p95Frame=${r.frameStats.p95.toFixed(2)}ms` +
            ` maxFrame=${r.frameStats.max.toFixed(2)}ms longTasks=${r.longTaskStats.count} longTaskSum=${r.longTaskStats.sum.toFixed(1)}ms`,
        );
      }
    }
  } finally {
    await browser.close();
    server.child.kill();
  }
  console.log("\n[perf] done.");
}

main().catch((err) => {
  console.error("[perf] fatal:", err);
  process.exitCode = 1;
});
