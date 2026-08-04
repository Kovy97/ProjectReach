#!/usr/bin/env node
/**
 * Perf-Messkript "Kampf-Screen immer noch sehr schlecht" (Chef-Auftrag 2026-07-23): misst 10s lang
 * bei LAUFENDEM Kampf (Spieler vs. zähen Gegner, keine Kills im Messfenster — isoliert die reine
 * Steady-State-Tick-Render-Last vom Kill-Cooldown-Blur-Sondereffekt):
 *   - Long-Tasks (PerformanceObserver, entryType "longtask").
 *   - Frame-Zeiten (rAF-Deltas, p95/avg).
 *   - React-Profiler-Commits je Profiler-`id` (`window.__perfCommits`) + Tick-Loop-Render-Zähler
 *     (`window.__hfTickRenders`) — TEMPORÄRE Instrumentierung (Profiler-Wraps in CombatPage.tsx um
 *     <Battle>/<MonsterSelect>/beide <Fighter>/das Log + ein Zähler im rAF-Loop in GameContext.tsx),
 *     Muster/Regel wie perf-smithing-audit.mjs: "Messcode restlos entfernen, nur das Mess-Skript
 *     bleibt" — bereits wieder ausgebaut, diese beiden Felder liefern jetzt 0/leer. Zum
 *     Reproduzieren: die Blöcke aus der Diff-Historie dieses Tasks (Perf-Nacht 23.07.) kurzzeitig
 *     wieder einfügen.
 *
 * Auflösungs-Parametrisierung (Chef-Auftrag 2026-07-24, "3440×1440 langsam, 1920×1080 flüssig"):
 * Section A (Steady-State-Kampf) läuft jetzt über `VIEWPORTS` — genau die beiden vom Chef
 * genannten Auflösungen, damit ein einziger Lauf sofort eine Vorher/Nachher-Vergleichstabelle
 * zwischen ihnen liefert. `deviceScaleFactor` bleibt 1 (Playwright-Default), s. `devicePixelRatio`
 * im Report (Kontroll-Ausgabe, damit ein Messwert nicht fälschlich auf DPR-Skalierung statt echter
 * Auflösung zurückgeführt wird). `PERF_WINDOW_MS` (env, Default 10000) erlaubt ein verkürztes
 * Messfenster für schnelle CSS-Ablation-Iterationen (Kandidaten einzeln per Source-Edit
 * stummschalten, Skript neu laufen lassen, Diff beobachten) — der finale Beweis-Lauf nutzt wieder
 * den vollen 10s-Default. Section B (Monster-Select, idle) bleibt unverändert bei der Default-
 * Auflösung — der gemeldete Ruckler betrifft ausdrücklich den laufenden Kampf, nicht das Grid.
 *
 * NUR gegen den DEV-Server (`vite dev`) — ein echter PRODUCTION-Build wurde geprüft und verworfen:
 * `?fixture=<name>` (GameContext.tsx) ist bewusst `import.meta.env.DEV`-gegated (kein Testcode im
 * Auslieferungs-Build) — ein `vite build`-Bundle zeigt bei `?fixture=midgame` schlicht das
 * Hauptmenü, der komplette Fixture-Lade-Pfad läuft nicht. Ohne Fixtures bräuchte ein Prod-Test
 * einen echten Speicherstand + Charaktererstellungs-Flow (deutlich größerer Umbau der Test-
 * Infrastruktur) — außerhalb des Scopes dieses Perf-Passes. Alle bestehenden `ui-audit/perf-*.mjs`
 * in diesem Repo (z.B. perf-smithing-audit.mjs) haben dieselbe Einschränkung und messen ebenfalls
 * nur gegen `vite dev`.
 *
 * Bekannte Einschränkung dieser Methodik (React.StrictMode ist NUR in Dev aktiv, No-Op in Prod):
 * StrictMode doppelt NICHT die Render-Rate der throttled Tick-Loop selbst (belegt: der
 * `__hfTickRenders`-Zähler unten liegt konsistent bei ~10/s, exakt am RENDER_INTERVAL_MS-Soll) —
 * ABER der äußerste `combat.battle`-Profiler zeigt konsistent ~20 Commits/s, während seine Kinder
 * (`combat.fighter.*`, `combat.log`) bei den korrekten ~10-11/s bleiben. Zeitstempel-Analyse
 * (`perf-debug-deltas.mjs`, Wegwerf-Skript) zeigt ein festes Muster: <1ms-Commit, dann ~100ms-
 * Commit, wiederholt — ein zusätzlicher, na­hezu kostenloser Commit GENAU an der Grenze, wo
 * CombatPage/Battle (LiveContext/Context-Consumer) auf denselben mutierbaren State zugreifen wie
 * die bereits auf `useGameSelector`/`useSyncExternalStore` migrierte Chrome (Sidebar/TopBar/
 * GameStats, gemeinsamer React-Baum unter MainLayout) — passend zu React 18s dokumentierter
 * Konsistenz-Prüfung, wenn Context- und `useSyncExternalStore`-Konsumenten denselben externen,
 * mutierbaren Store lesen. Gemessene Kosten sind klein (~1ms/Tick extra, keine Long-Tasks, sauber
 * 60 FPS in JEDEM hier gemessenen Szenario) — die vollständige Auflösung (Battle/Fighter/Log/
 * Monster-Grid auf `useGameSelector` migrieren, s. Backlog "Selector-Store-Architektur") bleibt
 * bewusst ein eigener, größerer Task.
 *
 * Headless (kein Electron), Muster wie perf-smithing-audit.mjs/sweep2-t7-arena.mjs.
 *
 * Run: node ui-audit/perf-combat-audit.mjs   (from apps/client/)
 * Schneller Ablation-Lauf (nur zur Ursachensuche, s. `ABLATIONS` unten):
 *   PERF_ABLATE=frame-overlay PERF_WINDOW_MS=4000 node ui-audit/perf-combat-audit.mjs
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5271;
const BASE_URL = `http://localhost:${PORT}`;
const VIEWPORT = { width: 1920, height: 1080 };
// Section A (Kampf-Steady-State) läuft über beide Chef-Auflösungen — die Ultrawide-Ruckel-Meldung
// betrifft NUR 3440×1440, 1920×1080 dient als "flüssig"-Referenz im selben Lauf.
const ALL_VIEWPORTS = [
  { label: "1920x1080", width: 1920, height: 1080 },
  { label: "3440x1440", width: 3440, height: 1440 },
];
// PERF_ONLY_VIEWPORT (env, z.B. "3440x1440") beschränkt Section A auf eine Auflösung — spart Zeit
// bei den Ablation-Iterationen (Section B läuft davon unberührt, s. dort).
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
      window.__perfCommits = {};
      window.__hfTickRenders = 0; // s. GameContext.tsx temp. Zähler
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
        resolve({
          longTasks,
          frameDeltas: frameDeltas.slice(1),
          perfCommits: window.__perfCommits || {},
          hfTickRenders: window.__hfTickRenders || 0,
        });
      }, durationMs);
    });
  }, durationMs);
}

// CSS-Ablation für die Ursachensuche (nur Diagnose, kein permanenter Code-Pfad): `PERF_ABLATE`
// (env, kommagetrennte Keys) injiziert vor dem Messen ein <style>-Overwrite, das genau EINEN der
// Chef-Verdächtigen stummschaltet — Skript unverändert lassen, nur mit z.B.
// `PERF_ABLATE=frame-overlay PERF_WINDOW_MS=4000 node ui-audit/perf-combat-audit.mjs` erneut
// laufen lassen und die 3440×1440-Zahlen gegen den Baseline-Lauf vergleichen.
const ABLATIONS = {
  "frame-overlay": `.content-body-frame::after { content: none !important; }`,
  "backdrop-anim": `.fighter-backdrop-drift { animation: none !important; }`,
  "backdrop-none": `.fighter-backdrop-drift { display: none !important; }`,
  "backdrop-willchange": `.fighter-backdrop-drift { will-change: auto !important; }`,
  "arena-shadows": `.battle-arena, .battle-arena * { box-shadow: none !important; filter: none !important; }`,
  "particles-none": `.zone-particles-canvas { display: none !important; }`,
};
async function applyAblation(page) {
  const keys = (process.env.PERF_ABLATE || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (keys.length === 0) return;
  const css = keys.map((k) => {
    if (!ABLATIONS[k]) throw new Error(`unknown PERF_ABLATE key: ${k} (known: ${Object.keys(ABLATIONS).join(", ")})`);
    return ABLATIONS[k];
  }).join("\n");
  await page.addStyleTag({ content: css });
  console.log(`[perf] PERF_ABLATE active: ${keys.join(", ")}`);
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
  console.log(`  tick-loop renders (setTick/notifyTick branch): ${raw.hfTickRenders} (${(raw.hfTickRenders / (windowMs / 1000)).toFixed(2)}/s)`);
  for (const [id, arr] of Object.entries(raw.perfCommits)) {
    const s = stats(arr);
    console.log(
      `  profiler[${id}]: commits=${s.count} (${(s.count / (windowMs / 1000)).toFixed(2)}/s) avgActual=${s.avg.toFixed(3)}ms` +
        ` p95Actual=${s.p95.toFixed(3)}ms sumActual=${s.sum.toFixed(1)}ms`,
    );
  }
  return { longTaskStats, frameStats, perfCommits: raw.perfCommits, hfTickRenders: raw.hfTickRenders };
}

async function main() {
  console.log(`[perf] starting dev server on port ${PORT}...`);
  const server = startDevServer(PORT);
  const up = await waitForServer(BASE_URL);
  if (!up) { console.error("DEV SERVER NOT UP:\n" + server.getOutput()); server.child.kill(); process.exitCode = 1; return; }

  const browser = await chromium.launch();
  try {
    // ── A) Steady-State-Kampf: zäher Gegner (bull_boss, viel HP), KEIN Kill im Messfenster,
    //      Log vorbelegt auf COMBAT_LOG_MAX (40) — realistischer "gereifter" Kampf statt Fight-Start.
    //      Läuft über VIEWPORTS (Chef-Auftrag 2026-07-24): 1920×1080 (Referenz "flüssig") UND
    //      3440×1440 (gemeldet "ruckelt") im selben Durchlauf. ──
    const sectionAResults = [];
    for (const viewport of VIEWPORTS) {
      const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
      page.on("pageerror", (e) => console.error("pageerror:", e.message));
      await page.addInitScript(() => localStorage.setItem("gr.combatFxLevel", "full"));
      await routeFixture(page, "midgame", (s) => {
        s.combat.monsterId = "bull_boss";
        s.combat.enemyHp = 5000;
        const log = [];
        for (let i = 0; i < 40; i++) {
          const byPlayer = i % 2 === 0;
          log.push({ seq: i, kind: "hit", by: byPlayer ? "player" : "enemy", amount: 5 + (i % 9), rawDamage: 6 + (i % 9), mitigated: byPlayer ? 1 : 0 });
        }
        s.combat.log = log;
        s.combat.eventCount = 40;
      });
      await page.goto(`${BASE_URL}/?fixture=midgame`, { waitUntil: "load" });
      await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
      await page.waitForTimeout(4200);
      await page.locator('[data-guide-id="sidebar.combat"]').first().click({ timeout: 8000 });
      await page.waitForSelector(".battle-arena", { timeout: 10000 });
      await applyAblation(page);
      await page.waitForTimeout(1000);
      const dpr = await page.evaluate(() => window.devicePixelRatio);
      const label = `Kampf steady-state @ ${viewport.label} (dpr=${dpr}, ${((viewport.width * viewport.height) / 1e6).toFixed(2)}MP) — bull_boss, 5000hp, Log am 40er-Deckel, keine Kills`;
      const result = report(label, await measure(page, WINDOW_MS), WINDOW_MS);
      sectionAResults.push({ viewport: viewport.label, ...result });
      await page.screenshot({ path: join(__dirname, `perf-combat-steadyfight-${viewport.label}.png`) });
      await page.close();
    }
    if (sectionAResults.length > 1) {
      console.log("\n=== Vergleichstabelle (Section A, Kampf steady-state) ===");
      for (const r of sectionAResults) {
        console.log(
          `  ${r.viewport.padEnd(10)} avgFrame=${r.frameStats.avg.toFixed(2)}ms p95Frame=${r.frameStats.p95.toFixed(2)}ms` +
            ` maxFrame=${r.frameStats.max.toFixed(2)}ms longTasks=${r.longTaskStats.count} longTaskSum=${r.longTaskStats.sum.toFixed(1)}ms`,
        );
      }
    }
    // ── B) Monster-Select-Zonenraster (Vergleich, "combat" abseits vom aktiven Kampf) ──
    {
      const page = await browser.newPage({ viewport: VIEWPORT });
      page.on("pageerror", (e) => console.error("pageerror:", e.message));
      await routeFixture(page, "midgame", () => {});
      await page.goto(`${BASE_URL}/?fixture=midgame`, { waitUntil: "load" });
      await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
      await page.waitForTimeout(4200);
      await page.locator('[data-guide-id="sidebar.combat"]').first().click({ timeout: 8000 });
      await page.waitForSelector(".combat-main-area", { timeout: 10000 });
      await page.waitForTimeout(500);
      report("MonsterSelect (Zonen-/Dungeon-Raster, idle)", await measure(page, WINDOW_MS), WINDOW_MS);
      await page.close();
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
