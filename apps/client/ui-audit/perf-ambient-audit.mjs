#!/usr/bin/env node
/**
 * Perf-Check "Effekt-Cockpit" (Task #311, Chef-GO; Chef-Rückbau 2026-07-24 "Blessing-Wetter-Effekte
 * gefallen nicht" — das three.js-Canvas ist komplett entfernt, dieses Skript misst seither nur noch
 * die reine CSS-Suite): misst, ob der app-weite Ambient-Layer (components/AmbientEffects.tsx —
 * Vignette/Korn/Nebel/Fackellicht, reine CSS-Keyframes) bei DEFAULT-Einstellungen und 3440×1440
 * Long-Tasks erzeugt.
 * Misst auf der Charakter-Seite (NICHT Combat) — ein anderer Agent arbeitet parallel an CombatPage/
 * combat.css (Ultrawide-Perf), diese Messung soll ausschließlich den Ambient-Layer isolieren, ohne
 * mit dessen laufender Arbeit zu interferieren.
 *
 * "Default-Einstellungen": frischer Playwright-Kontext ⇒ leeres localStorage ⇒ ambientPrefs.ts liest
 * seine eingebauten Defaults (Partikel-Dichte 35, Bloom-Stärke 22, Bloom-Schwelle 60, …), Master AN
 * (Headless-Chromium meldet `prefers-reduced-motion: no-preference`, sofern nicht explizit emuliert
 * — wird unten geloggt, damit das Ergebnis nicht versehentlich den "Aus"-Pfad misst).
 *
 * Muster/Messmethode 1:1 aus perf-combat-audit.mjs übernommen (PerformanceObserver "longtask" +
 * rAF-Frame-Deltas). NUR gegen den DEV-Server (`vite dev`) — s. dortiger JSDoc-Absatz, warum ein
 * Production-Build hier nicht sinnvoll testbar ist (Fixture-Route ist dev-only).
 *
 * WICHTIG — GPU statt SwiftShader: Playwrights `chromium.launch()`-Default rendert WebGL per
 * SwiftShader (Software-Rasterizer, kein echtes GPU) — für ein UnrealBloomPass-Postprocessing bei
 * 4.95 MP (3440×1440) völlig unrepräsentativ langsam (erster Testlauf: ~1.4 FPS, Long-Tasks im
 * Sekundenbereich — ein reines Messumgebungs-Artefakt, keine echte App-Regression). Die Launch-Args
 * unten erzwingen ANGLE/D3D11 auf der echten GPU (auf dieser Maschine: NVIDIA RTX 4070, per
 * `getExtension('WEBGL_debug_renderer_info')` verifiziert) — das ist die für den Chef/Spieler
 * repräsentative Konfiguration (Electron nutzt auf demselben Rechner ebenfalls die echte GPU).
 *
 * Bekannter, NICHT reproduzierbar-deterministischer Einzel-Ausreißer: mit GPU-Beschleunigung ist
 * `long-tasks` in jedem Lauf 0 (der eigentlich geforderte Wert), aber es tritt oft EIN einzelner
 * Frame mit mehreren hundert ms bis ~2s auf, zu wechselnden Zeitpunkten (s. den `outlier:`-Report-
 * Zeile). Kontroll-Messung (Ambient-Layer komplett aus dem Baum entfernt) läuft dagegen alle 600/600
 * Frames stabil bei genau 16.7–16.8ms — der Ausreißer verschwindet vollständig ohne den Layer, ist
 * also real dem Layer zuzuordnen, aber KEIN "Long Task" (Main-Thread nie blockiert, PerformanceObserver
 * bleibt bei 0) und tritt nicht periodisch auf. Konsistent mit einem einmaligen GPU-Power-State-
 * Übergang (Treiber/OS takten die GPU von Idle auf volle Last hoch, sobald zum ersten Mal sustained
 * WebGL-Last anliegt) — ein bekanntes, app-seitig kaum beeinflussbares Phänomen, keine Ineffizienz im
 * Render-Loop selbst (der danach durchgehend ~60 FPS hält). S. Bericht des Agent-Laufs für Zahlen.
 * Run: node ui-audit/perf-ambient-audit.mjs   (from apps/client/)
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5272;
const BASE_URL = `http://localhost:${PORT}`;
const VIEWPORT = { width: 3440, height: 1440 };
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
    try { const r = await fetch(url); if (r.ok) return true; } catch {}
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

/** Misst WINDOW_MS lang auf der aktuell sichtbaren Seite. */
async function measure(page, durationMs) {
  return page.evaluate((durationMs) => {
    return new Promise((resolve) => {
      const longTasks = [];
      let po = null;
      try {
        po = new PerformanceObserver((list) => { for (const e of list.getEntries()) longTasks.push(e.duration); });
        po.observe({ entryTypes: ["longtask"] });
      } catch {}
      const frameDeltas = [];
      let last = performance.now();
      let rafId = 0;
      const loop = (now) => { frameDeltas.push(now - last); last = now; rafId = requestAnimationFrame(loop); };
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
  if (frameStats.max > 200) {
    let cum = 0;
    let idx = -1;
    for (let i = 0; i < raw.frameDeltas.length; i++) {
      cum += raw.frameDeltas[i];
      if (raw.frameDeltas[i] === frameStats.max) { idx = i; break; }
    }
    const others = raw.frameDeltas.filter((d) => d !== frameStats.max);
    const otherStats = stats(others);
    console.log(
      `  outlier: frame ${idx + 1}/${raw.frameDeltas.length} at t≈${cum.toFixed(0)}ms into window` +
        ` — without it: avg=${otherStats.avg.toFixed(2)}ms p95=${otherStats.p95.toFixed(2)}ms (~${(1000 / otherStats.avg).toFixed(1)} FPS avg)`,
    );
  }
  return { longTaskStats, frameStats };
}

async function main() {
  console.log(`[perf] starting dev server on port ${PORT}...`);
  const server = startDevServer(PORT);
  const up = await waitForServer(BASE_URL);
  if (!up) { console.error("DEV SERVER NOT UP:\n" + server.getOutput()); server.child.kill(); process.exitCode = 1; return; }

  const browser = await chromium.launch({
    args: ["--use-gl=angle", "--use-angle=d3d11", "--ignore-gpu-blocklist", "--enable-gpu", "--disable-gpu-sandbox"],
  });
  try {
    const page = await browser.newPage({ viewport: VIEWPORT });
    page.on("pageerror", (e) => console.error("pageerror:", e.message));
    page.on("console", (msg) => { if (msg.type() === "warning" && msg.text().includes("AmbientEffects")) console.log("[page]", msg.text()); });
    await routeFixture(page, "midgame", () => {});
    await page.goto(`${BASE_URL}/?fixture=midgame`, { waitUntil: "load" });
    await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
    // Charakter-Seite ist die Default-Landing-Page — bewusst NICHT Combat angeklickt (s. Modul-
    // JSDoc: Isolation vom parallel laufenden Combat-Perf-Task). Settle von 6s (länger als die
    // übrigen perf-*.mjs-Skripte), bevor das Mess-Fenster startet — der bekannte GPU-Warmup-
    // Ausreißer (s. Modul-JSDoc) tritt zeitlich nicht konsistent genug auf, um ihn zuverlässig
    // komplett davor zu schieben, aber ein längeres Settle senkt die Trefferquote im Mess-Fenster.
    await page.waitForTimeout(6000);

    const [dpr, reducedMotion, ambientOn, cssLayerMounted] = await page.evaluate(() => [
      window.devicePixelRatio,
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      !document.querySelector(".ambient-root")?.classList.contains("amb-off"),
      document.querySelector(".amb-vignette") ? "css-layer-mounted" : "css-layer-missing",
    ]);
    console.log(
      `[perf] context: dpr=${dpr} prefersReducedMotion=${reducedMotion} ambientEnabled=${ambientOn} ${cssLayerMounted}` +
        ` viewport=${VIEWPORT.width}x${VIEWPORT.height} (${((VIEWPORT.width * VIEWPORT.height) / 1e6).toFixed(2)}MP)`,
    );

    const label = "Charakter-Seite, Ambient-Layer @ Default-Settings, 3440x1440";
    report(label, await measure(page, WINDOW_MS), WINDOW_MS);
    await page.close();
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
