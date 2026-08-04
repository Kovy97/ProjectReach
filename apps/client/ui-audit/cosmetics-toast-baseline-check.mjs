#!/usr/bin/env node
/**
 * Kosmetik-Sweep T3 (2026-07-12): "Erfolgs-Toast-Stapel beim Spielstand-Load" — `checkAchievements`
 * (engine/tick.ts) läuft nur, wenn `advance()` mindestens einen vollen TICK_MS-Schritt ausführt.
 * Wird ein Save mit LEEREM `state.achievements`, aber bereits qualifizierenden Stats geladen (savedAt
 * ≈ jetzt → deserialize's Offline-Catch-up macht NULL Schritte), bleibt der Rückstand beim Mount
 * unverliehen — erst der ERSTE echte Live-Tick (rAF-Loop, GameContext.tsx) holt ihn synchron nach und
 * hätte OHNE den Fix (Toasts.tsx `settledRef`) alle betroffenen Achievements als gestapelte
 * "Meilenstein erreicht!"-Toasts gefeuert. Fix: die erste Diff-Runde MIT vorhandenem `prev` wird
 * still als Baseline übernommen (kein Toast).
 *
 * Repro: midgame.json mit GELEERTEM achievements-Array + savedAt=jetzt injizieren, laden, ~1.5s wie
 * einen echten Live-Tick abwarten, dann `.toast-achievement` zählen (erwartet: 0 trotz Backlog-Grant).
 * Port 5243 (geteilt mit cosmetics-tooltip-check.mjs, sequenziell ausgeführt).
 */
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5243;
const BASE_URL = `http://localhost:${PORT}`;
const OUT_DIR = "C:\\Users\\MSchu\\AppData\\Local\\Temp\\claude\\G--GameDev\\553d2095-3a73-4795-9782-0fe746a25f13\\scratchpad";

function buildBacklogFixture() {
  const raw = readFileSync(join(__dirname, "fixtures", "midgame.json"), "utf8");
  const obj = JSON.parse(raw);
  const before = obj.state.achievements.length;
  obj.state.achievements = []; // Rückstand erzwingen — die Stats (totalLevel 510 etc.) qualifizieren
  // bereits für mehrere Achievements (ach_total_level_25/100/250/500 …), die jetzt "fehlen".
  obj.savedAt = Date.now(); // kein Offline-Catch-up beim deserialize (s. Kommentar oben).
  return { json: JSON.stringify(obj), strippedCount: before };
}

function buildWarmupFixture() {
  const raw = readFileSync(join(__dirname, "fixtures", "endgame.json"), "utf8");
  const obj = JSON.parse(raw);
  obj.savedAt = Date.now();
  return JSON.stringify(obj);
}

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
    try { const r = await fetch(url); if (r.ok) return true; } catch {}
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

const { json: backlogFixture, strippedCount } = buildBacklogFixture();
console.log("STRIPPED ACHIEVEMENTS FROM FIXTURE:", strippedCount);

const { child, getOutput } = startDevServer();
try {
  const ok = await waitForServer(BASE_URL);
  if (!ok) { console.error("SERVER NOT UP:\n" + getOutput()); process.exit(1); }
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push("console: " + m.text());
    if (m.text().startsWith("TOASTDBG")) console.log(m.text());
  });

  await page.addInitScript(([bl, wu]) => {
    localStorage.setItem("hearthforge:save:0", bl);
    localStorage.setItem("hearthforge:save:1", wu);
  }, [backlogFixture, buildWarmupFixture()]);

  await page.goto(BASE_URL, { waitUntil: "load" });
  await page.waitForSelector(".menu-nav-btn", { timeout: 20000 });

  // Aufwärm-Runde (Diagnose-Fund): ein kalter Vite-Dev-Server kompiliert CharacterPage/Content/
  // Engine-Chunks erst bei der ERSTEN Anforderung — das kann mehrere Sekunden dauern, WÄHREND derer
  // GameContexts rAF-Loop (bereits ab GameProvider-Mount aktiv) normal weiterläuft und Ticks
  // akkumuliert, sobald `stateRef.current` gesetzt ist. Ergebnis: der komplette Rückstand landet
  // schon in Runde 0 (Mount-Baseline), der Runde-0/Runde-1-Split lässt sich so nicht beobachten.
  // Ein Wegwerf-Load VOR dem eigentlichen Test wärmt alle Chunks vor (Vite cached sie danach), damit
  // der ZWEITE Load-Klick (der eigentliche Backlog-Fixture) nah an Echtzeit mountet.
  await page.locator(".menu-nav-btn").nth(1).click();
  await page.waitForSelector(".menu-slot.filled .hf-btn--primary", { timeout: 15000 });
  await page.locator(".menu-slot.filled .hf-btn--primary").nth(1).click({ timeout: 15000 });
  await page.waitForSelector(".sb-footer-menu", { timeout: 15000 });
  await page.waitForTimeout(600);
  await page.locator(".sb-footer-menu").click();
  await page.waitForSelector(".menu-nav-btn", { timeout: 15000 });
  await page.waitForTimeout(300);

  await page.mouse.move(100, 100);
  await page.locator(".menu-nav-btn").nth(1).click();
  await page.mouse.move(200, 200);
  await page.waitForSelector(".menu-slot.filled .hf-btn--primary", { timeout: 15000 });
  const t0 = Date.now();
  await page.locator(".menu-slot.filled .hf-btn--primary").nth(0).click({ timeout: 15000 });
  console.log("CLICK RESOLVED AFTER ms:", Date.now() - t0);

  // Direkt nach dem Mount (Runde 0, Baseline) — sollte ohnehin 0 sein, auch ohne den neuen Fix.
  await page.waitForTimeout(20);
  console.log("CHECK 'IMMEDIATELY' AT ms SINCE CLICK:", Date.now() - t0);
  const immediately = await page.evaluate(() => document.querySelectorAll(".toast-achievement").length);

  // Nach genug Zeit für mind. einen echten Live-Tick (TICK_MS=100ms, rAF-Loop) UND den React-Render-
  // Throttle (~100ms) — der Backlog-Grant + die Diff-Runde 1 sind hier sicher durchgelaufen.
  await page.waitForTimeout(1500);
  const afterFirstLiveTick = await page.evaluate(() => document.querySelectorAll(".toast-achievement").length);
  const toastTitles = await page.evaluate(() =>
    Array.from(document.querySelectorAll(".toast .toast-detail")).map((el) => el.textContent),
  );
  await page.screenshot({ path: join(OUT_DIR, "toast-baseline-after-load.png") });
  console.log("SHOT SAVED: toast-baseline-after-load.png");

  // Verifiziert, dass die Achievements TATSÄCHLICH nachgereicht wurden (sonst wäre der Test ein
  // Blindgänger — 0 Toasts könnte auch bedeuten "gar nichts wurde je gewährt"). Der laufende State
  // lebt nur in GameContexts stateRef (kein window-Hook) — ein manueller Speichern-Klick schreibt
  // ihn nach localStorage, das wir danach auslesen.
  await page.locator(".sb-footer-save").click({ timeout: 8000 });
  await page.waitForTimeout(400);
  const grantedCount = await page.evaluate(() => {
    try {
      const raw = localStorage.getItem("hearthforge:save:0");
      return raw ? JSON.parse(raw).state.achievements.length : -1;
    } catch { return -2; }
  });

  console.log("TOASTS IMMEDIATELY AFTER MOUNT:", immediately);
  console.log("TOASTS AFTER FIRST LIVE TICK (~1.5s):", afterFirstLiveTick);
  console.log("TOAST DETAIL TEXTS:", JSON.stringify(toastTitles));
  console.log("ACHIEVEMENTS PERSISTED IN SAVE AFTER TICK:", grantedCount);

  const problems = [];
  if (grantedCount <= 0) problems.push(`Repro nicht aussagekräftig: Backlog wurde nicht nachgereicht (achievements=${grantedCount})`);
  if (immediately > 0) problems.push(`Toast(s) SOFORT beim Mount (Runde 0): ${immediately}`);
  if (afterFirstLiveTick > 0) problems.push(`Toast(s) nach dem ersten Live-Tick (Rückstand gestapelt): ${afterFirstLiveTick}`);
  console.log(problems.length ? "PROBLEME:\n- " + problems.join("\n- ") : "ALLE CHECKS GRÜN");
  console.log(errors.length ? `${errors.length} page errors:\n` + errors.slice(0, 8).join("\n") : "no page errors");

  await browser.close();
  process.exit(problems.length > 0 ? 1 : 0);
} finally {
  child.kill();
}
