#!/usr/bin/env node
/**
 * 0.4.0-Arena, Logik-Welle 1 (Chef-Entscheid 2026-08-03) — Verifikation des Zonen-Manifest-Systems
 * (Boden/Kulisse/Licht/Fog/Grade/Props aus manifests/<zoneId>.json statt Task-#330-Hartcodierung).
 *
 * Vier Nachweise (Auftrag "Verifikation (Vordergrund)"):
 *   a) Pastures-Arena mit Licht/Fog/Grade aus dem Manifest (Baseline-Übersicht).
 *   b) Props gegroundet mit Schatten, Tiefensortierung bewiesen (ein Prop vor dem Spieler-Billboard).
 *   c) Manifest-Hotswap: Werte auf der Festplatte ändern (echter Dateizugriff, kein Mock) → Vite
 *      liefert die neue JSON aus → sichtbar andere Szene, DANACH Original wiederhergestellt.
 *   d) Zone OHNE Manifest (borderlands/goblin_rogue) + Arena-Flag AN → bleibt klassische 2D-Ansicht.
 * Danach 10s-Steady-State-Perf @ 3440×1440 (Chef-Vorgabe 60fps).
 *
 * Muster/Werkzeuge 1:1 aus arena25d-verify-330.mjs übernommen (Dev-Server-Spawn, GPU-Headless-
 * Chromium via ANGLE/D3D11, Fixture-Routing) — s. dortige Kommentare für die volle Begründung
 * (SwiftShader-Software-Rasterizer-Falle, warum NUR der Dev-Server infrage kommt).
 *
 * Run: node ui-audit/arena25d-manifest-verify.mjs   (from apps/client/)
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync, writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5331;
const BASE_URL = `http://localhost:${PORT}`;
const OUT_DIR = join(__dirname, "_shots-arena-manifest");
const MANIFEST_PATH = join(
  CLIENT_DIR,
  "src/renderer/components/arena25d/manifests/pastures.json",
);
const WINDOW_MS = Number(process.env.PERF_WINDOW_MS) || 10_000;

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

async function routeFixture(page, fixtureName, mutator) {
  await page.route(`**/ui-audit-fixtures/${fixtureName}.json`, async (route) => {
    const res = await route.fetch();
    const json = JSON.parse(await res.text());
    json.state.onboarding = {
      ...(json.state.onboarding ?? {}),
      active: false,
      // featureTourV2 (App.tsx) ist neuer als der arena25d-verify-330.mjs-Vorlage-Stand (dortiges
      // Fixture-Setup kennt es noch nicht) — ohne diesen Key blockiert der "Neu: New Haven"-
      // Spotlight jeden Klick (SpotlightGuide dimmt/deckt den ganzen Screen ab), gefunden beim
      // ersten Lauf dieses Skripts per Diagnose-Screenshot.
      toursSeen: { combat: true, shop: true, bank: true, featureTourV1: true, featureTourV2: true },
    };
    mutator(json.state);
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(json) });
  });
}

async function openCombat(browser, { arenaOn, viewport, monsterId, enemyHp, questsCompleted }) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push("console: " + m.text());
  });
  await page.addInitScript((on) => {
    localStorage.setItem("gr.combatFxLevel", "full");
    if (on) localStorage.setItem("gr.arena25d", "1");
  }, arenaOn);
  await routeFixture(page, "midgame", (s) => {
    s.combat.monsterId = monsterId;
    s.combat.enemyHp = enemyHp;
    // d)-Fall: borderlands ist per `requiresQuest: "chronicle_03"` gated (s. content.zones) — ohne
    // das freizuschalten würde schon die Zonen-/Encounter-Auflösung selbst scheitern, unabhängig
    // vom arena25d-Manifest-Test, den dieser Screenshot eigentlich beweisen soll.
    if (questsCompleted) s.quests.completed = [...new Set([...(s.quests.completed ?? []), ...questsCompleted])];
  });
  await page.goto(`${BASE_URL}/?fixture=midgame`, { waitUntil: "load" });
  await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
  await page.waitForTimeout(4200); // Fixture-Load-Achievement-Toasts abklingen lassen
  await page.locator('[data-guide-id="sidebar.combat"]').first().click({ timeout: 8000 });
  await page.waitForSelector(".battle-arena", { timeout: 10000 });
  page.hfErrors = errors;
  return page;
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
  return { count: arr.length, avg: sum / arr.length, p95: percentile(arr, 0.95), max: Math.max(...arr), sum };
}
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

const originalManifestText = readFileSync(MANIFEST_PATH, "utf8");
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

  // ═══ a) Pastures-Baseline: Licht/Fog/Grade aus dem Manifest ════════════════════════════════
  console.log("\n### a) Pastures-Baseline (Manifest-getriebenes Licht/Grade) ###");
  const pageA = await openCombat(browser, { arenaOn: true, viewport: { width: 1920, height: 1080 }, monsterId: "bull_boss", enemyHp: 400 });
  const mounted = await pageA
    .waitForSelector(".a25-root", { timeout: 10000 })
    .then(() => true)
    .catch(() => false);
  console.log(`.a25-root mounted (arena on, Pastures): ${mounted}`);
  await pageA.waitForTimeout(9000);
  await pageA.screenshot({ path: join(OUT_DIR, "a-pastures-baseline.png") });
  console.log("SHOT SAVED: a-pastures-baseline.png");
  console.log(`[a] ${pageA.hfErrors.length ? pageA.hfErrors.length + " page errors:\n" + pageA.hfErrors.slice(0, 10).join("\n") : "no page errors"}`);

  // ═══ b) Props gegroundet + Tiefensortierung (Prop vor/hinter Kämpfer) ══════════════════════
  console.log("\n### b) Props + Tiefensortierung ###");
  await pageA.waitForTimeout(500);
  await pageA.screenshot({ path: join(OUT_DIR, "b-props-depth-sort-full.png") });
  console.log("SHOT SAVED: b-props-depth-sort-full.png (volle Szene — Rand-Bäume + Vordergrund-Busch)");
  // Nahaufnahme um den Spieler (links) herum — der "mid"-Busch aus pastures.json sitzt NÄHER an
  // der Kamera als der Spieler (größeres Z) und links von ihm (x=-1.6 vs. PLAYER_X=-2.4) — der
  // Screenshot muss zeigen, dass der Busch den unteren Teil des Spielers korrekt VERDECKT (Z-Buffer),
  // nicht dass er "durchscheint" oder hinter der Figur landet. BoundingBox der echten Arena-Fläche
  // gelesen statt geratener Pixel-Offsets (Layout kann sich ändern) — untere linke Hälfte der
  // Arena ist genau die Region, in der Spieler+Busch/Bäume stehen (s. PLAYER_X<0 in Arena25DStage.tsx).
  const arenaBox = await pageA.locator(".battle-arena").first().boundingBox();
  if (arenaBox) {
    const clip = {
      x: Math.round(arenaBox.x),
      y: Math.round(arenaBox.y + arenaBox.height * 0.35),
      width: Math.round(arenaBox.width * 0.55),
      height: Math.round(arenaBox.height * 0.65),
    };
    await pageA.screenshot({ path: join(OUT_DIR, "b-props-depth-sort-player-crop.png"), clip });
    console.log("SHOT SAVED: b-props-depth-sort-player-crop.png (Spieler-Region, Busch sollte Figur teilweise verdecken)");
  } else {
    console.log("!! b-props-depth-sort-player-crop skipped: keine .battle-arena boundingBox");
  }
  await pageA.close();

  // ═══ c) Manifest-Hotswap: Datei auf der Platte ändern → sichtbar andere Szene ══════════════
  console.log("\n### c) Manifest-Hotswap ###");
  const pageC = await openCombat(browser, { arenaOn: true, viewport: { width: 1920, height: 1080 }, monsterId: "bull_boss", enemyHp: 400 });
  await pageC.waitForSelector(".a25-root", { timeout: 10000 }).catch(() => {});
  await pageC.waitForTimeout(9000);
  await pageC.screenshot({ path: join(OUT_DIR, "c1-before-hotswap.png") });
  console.log("SHOT SAVED: c1-before-hotswap.png (Original-Pastures-Manifest)");

  const original = JSON.parse(originalManifestText);
  const swapped = JSON.parse(originalManifestText);
  // Dramatisch andere Stimmung: glutrote, tief stehende Sonne von der Seite, dichter kühler Nebel,
  // stark entsättigt+abgedunkelt — maximal unterscheidbar vom warmen Pastures-Nachmittag.
  swapped.lighting = {
    sunColor: "#ff3b1a",
    sunIntensity: 4.5,
    sunAngleDeg: 12,
    sunAzimuthDeg: 70,
    ambientColor: "#301018",
    ambientIntensity: 0.6,
    fogColor: "#1a0e0e",
    fogDensity: 0.09,
    grade: { saturation: 0.35, temperature: -0.8, lift: -0.35 },
  };
  writeFileSync(MANIFEST_PATH, JSON.stringify(swapped, null, 2) + "\n", "utf8");
  console.log("Manifest auf der Platte umgeschrieben (dramatische Alternativ-Stimmung) — warte auf Vite-HMR/Reload ...");
  await pageC.waitForTimeout(1500); // Vite-HMR-Propagation
  await pageC.reload({ waitUntil: "load" });
  await pageC.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
  await pageC.waitForTimeout(1500);
  await pageC.locator('[data-guide-id="sidebar.combat"]').first().click({ timeout: 8000 });
  await pageC.waitForSelector(".a25-root", { timeout: 10000 }).catch(() => {});
  await pageC.waitForTimeout(9000);
  await pageC.screenshot({ path: join(OUT_DIR, "c2-after-hotswap.png") });
  console.log("SHOT SAVED: c2-after-hotswap.png (SOLLTE deutlich anders aussehen als c1)");

  // Original wiederherstellen — NICHT erst am Skript-Ende (falls ein späterer Schritt wirft, bleibt
  // sonst eine geänderte Datei im Arbeitsbaum liegen).
  writeFileSync(MANIFEST_PATH, originalManifestText, "utf8");
  console.log("Manifest zurückgeschrieben (Original wiederhergestellt).");
  await pageC.waitForTimeout(1500);
  await pageC.reload({ waitUntil: "load" });
  await pageC.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
  await pageC.waitForTimeout(1500);
  await pageC.locator('[data-guide-id="sidebar.combat"]').first().click({ timeout: 8000 });
  await pageC.waitForSelector(".a25-root", { timeout: 10000 }).catch(() => {});
  await pageC.waitForTimeout(9000);
  await pageC.screenshot({ path: join(OUT_DIR, "c3-after-revert.png") });
  console.log("SHOT SAVED: c3-after-revert.png (SOLLTE wieder wie c1 aussehen)");
  console.log(`[c] ${pageC.hfErrors.length ? pageC.hfErrors.length + " page errors:\n" + pageC.hfErrors.slice(0, 10).join("\n") : "no page errors"}`);
  await pageC.close();

  // ═══ d) Zone OHNE Manifest (borderlands/goblin_rogue) + Arena-Flag AN ⇒ klassische Ansicht ══
  console.log("\n### d) Zone ohne Manifest -> 2D-Fallback (Gegenprobe) ###");
  const pageD = await openCombat(browser, {
    arenaOn: true,
    viewport: { width: 1920, height: 1080 },
    monsterId: "goblin_rogue",
    enemyHp: 200,
    questsCompleted: ["chronicle_03"],
  });
  const a25CountD = await pageD.locator(".a25-root").count();
  const classicCountD = await pageD.locator(".battle-arena-stage").count();
  console.log(`borderlands (kein Manifest) + Arena-Flag AN — .a25-root count (expect 0): ${a25CountD}; .battle-arena-stage count (expect 1): ${classicCountD}`);
  await pageD.waitForTimeout(700);
  await pageD.screenshot({ path: join(OUT_DIR, "d-no-manifest-zone-classic.png") });
  console.log("SHOT SAVED: d-no-manifest-zone-classic.png");
  console.log(`[d] ${pageD.hfErrors.length ? pageD.hfErrors.length + " page errors:\n" + pageD.hfErrors.slice(0, 10).join("\n") : "no page errors"}`);
  await pageD.close();

  // ═══ Perf @ 3440×1440, 10s Steady-State, Arena AN (Pastures, Manifest+Props aktiv) ═════════
  console.log(`\n### Perf (3440x1440, ${(WINDOW_MS / 1000).toFixed(0)}s Steady-State, Arena AN) ###`);
  const pagePerf = await openCombat(browser, { arenaOn: true, viewport: { width: 3440, height: 1440 }, monsterId: "bull_boss", enemyHp: 5000 });
  await pagePerf.waitForSelector(".a25-root", { timeout: 10000 });
  await pagePerf.waitForTimeout(1000);
  const dpr = await pagePerf.evaluate(() => window.devicePixelRatio);
  const label = `Arena25D+Manifest+Props @ 3440x1440 (dpr=${dpr}) — bull_boss/Pastures, 5000hp, keine Kills`;
  const perfResult = report(label, await measure(pagePerf, WINDOW_MS), WINDOW_MS);
  await pagePerf.screenshot({ path: join(OUT_DIR, "perf-3440-arena-manifest.png") });
  console.log(`[perf] ${pagePerf.hfErrors.length ? pagePerf.hfErrors.length + " page errors:\n" + pagePerf.hfErrors.slice(0, 10).join("\n") : "no page errors"}`);
  await pagePerf.close();
  console.log(
    `\nPerf-Urteil: avgFrame=${perfResult.frameStats.avg.toFixed(2)}ms (~${(1000 / perfResult.frameStats.avg).toFixed(1)} FPS) ` +
      `p95=${perfResult.frameStats.p95.toFixed(2)}ms longTasks=${perfResult.longTaskStats.count}`,
  );

  await browser.close();
  console.log("\n[arena25d-manifest-verify] done.");
} finally {
  // Sicherheitsnetz: falls irgendwo oben geworfen wurde, NIE eine geänderte pastures.json liegen
  // lassen — Original-Text ist zu Skriptbeginn eingelesen, hier ohne Bedingung nochmal geschrieben.
  writeFileSync(MANIFEST_PATH, originalManifestText, "utf8");
  child.kill();
}
