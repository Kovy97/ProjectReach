#!/usr/bin/env node
/**
 * Finales Abnahme-Render-Paket (2026-08-04) — CEO-Auftrag "Alle drei Pilot-Zonen live aus dem
 * Prototyp rendern" nach Miras Runde-1-Asset-Lieferung (assets/arena/ 17 Dateien + crypt.json/
 * slagpit.json/getauschtes pastures.json). KEIN Produktivcode — Wegwerf-Skript nach dem etablierten
 * ui-audit-Muster (eigener Vite-Dev-Server + echtes GPU-Chromium via ANGLE/D3D11, NIEMALS Electron
 * — Pattern 1:1 aus arena25d-manifest-verify.mjs / mkt-0.3.0-media.mjs übernommen).
 *
 * Bypass der Zonen-Auswahl-UI: `state.combat.monsterId` wird direkt über den `window.__hfDebug`-
 * Bridge-Hook gepatcht (GameContext.tsx, dev-only) — CombatPage.tsx rendert bei gesetztem
 * `monsterId` sofort <Battle> statt <MonsterSelect>, isZoneUnlocked() gated NUR die Auswahl-Karten,
 * nicht Battle() selbst (verifiziert per grep). `monster.zone` (aus dem Content-Katalog) IST die
 * Arena-zoneId (CombatPage.tsx `isArena25dActive(monster.zone, ...)`), also reicht die Monsterwahl,
 * um die passende Zonen-Manifest-Szene zu laden — kein manisches Zonen-Klicken nötig.
 *
 * Ausgabe: candidates-Ordner (Burst-Screenshots zur Sichtprüfung) unter
 *   apps/client/ui-audit/_shots-arena-abnahme-runde1/<zone>-<res>/
 * Video: apps/client/ui-audit/_shots-arena-abnahme-runde1/clip-raw.webm
 *
 * Run (aus apps/client/):  node ui-audit/arena-abnahme-runde1-shots.mjs
 */
import { spawn } from "node:child_process";
import { mkdirSync, renameSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5401; // frei — außerhalb bot.mjs-Reservat 5340-5359, ungleich 5331 (manifest-verify) / 5391 (mkt-0.3.0)
const BASE_URL = `http://localhost:${PORT}`;
const OUT_DIR = join(__dirname, "_shots-arena-abnahme-runde1");
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

async function dismissAnyTour(page, maxTries = 5) {
  for (let i = 0; i < maxTries; i++) {
    const skip = page.locator(".guide-bubble-skip");
    if ((await skip.count()) === 0) return;
    await skip.first().click({ timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(250);
  }
}

/** Zone-Kampf-Konfiguration — Monster der jeweiligen Zone (Content-Katalog). `enemyHp` bewusst
 * NICHT immer nah an real-maxHp: `feral_goat` (real maxHp 41) stirbt gegen das midgame-Loadout
 * (steel_battleaxe) in 1-2 Treffern — für ein Abnahme-Video/Burst, das Idle+Windup+Sprint+Clash
 * zeigen soll, reicht das nicht. Skaliert deshalb dokumentiert über real-maxHp hinaus (Präzedenz:
 * mkt-0.3.0-media.mjs' `bull_boss enemyHp:400`/`drazhan enemyHp:6200` gegen real kleinere Werte) —
 * Bar zeigt dadurch die ganze Session über satt-grün statt sichtbar zu sinken; das ist ein reines
 * Skript-Artefakt für die Aufnahme-Dauer, KEIN Manifest-/Balance-Befund (im INDEX dokumentiert).
 * crypt/slagpit haben genug natürliche maxHp-Reserve (89/342) und bleiben nah an einem plausiblen
 * Bruchteil. */
const ZONES = {
  pastures: { monsterId: "feral_goat", enemyHp: 140, questsCompleted: [] },
  crypt: { monsterId: "skeleton_warrior", enemyHp: 75, questsCompleted: ["chronicle_09"] },
  slagpit: { monsterId: "ember_elemental", enemyHp: 260, questsCompleted: ["chronicle_14"] },
};

async function openArenaCombat(browser, { zone, viewport, record = null }) {
  const cfg = ZONES[zone];
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    recordVideo: record ? { dir: record.dir, size: viewport } : undefined,
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push("console: " + m.text());
  });
  await page.addInitScript(() => {
    localStorage.setItem("gr.arena25d", "1");
    localStorage.setItem("gr.combatFxLevel", "full");
  });
  await page.goto(`${BASE_URL}/?fixture=midgame`, { waitUntil: "load" });
  await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
  await page.waitForFunction(() => !!window.__hfDebug, null, { timeout: 8000 });
  await page.waitForTimeout(1500); // StrictMode-Doppelmount + Fixture-Achievement-Toasts absorbieren
  // NICHT über evalDebug()s toString()-Closure-Trick — `cfg` ist eine Node-seitige Variable, die
  // beim Re-Eval IM Browser-Kontext (kein echter Closure-Transport über page.evaluate hinweg)
  // verlorenginge (empirisch gefunden: "ReferenceError: cfg is not defined"). Stattdessen `cfg`
  // als echtes page.evaluate-Argument durchreichen.
  await page.evaluate(
    ({ monsterId, enemyHp, questsCompleted }) => {
      const state = window.__hfDebug.state;
      state.onboarding = {
        ...(state.onboarding ?? {}),
        active: false,
        toursSeen: { combat: true, shop: true, bank: true, featureTourV1: true, featureTourV2: true },
      };
      state.quests = state.quests || { completed: [], claimed: [] };
      for (const q of questsCompleted) {
        if (!state.quests.completed.includes(q)) state.quests.completed.push(q);
      }
      state.combat = {
        monsterId,
        enemyHp,
        playerTimerMs: 0,
        enemyTimerMs: 0,
        kills: 0,
        eventCount: 0,
        enemyEffects: [],
        playerEffects: [],
        log: [],
        dungeonId: null,
        encounterIndex: 0,
        petAbility: { timerMs: 0, shieldHp: 0, blockNextHit: false, enemyStunMs: 0, enemyAccDownMs: 0, enemyAccDownPct: 0, enemyVulnMs: 0, enemyVulnPct: 0 },
      };
    },
    { monsterId: cfg.monsterId, enemyHp: cfg.enemyHp, questsCompleted: cfg.questsCompleted },
  );
  await page.waitForTimeout(300);
  await dismissAnyTour(page);
  await page.locator('[data-guide-id="sidebar.combat"]').first().click({ timeout: 8000 });
  await page.waitForSelector(".a25-root", { timeout: 10000 });
  const toggle = page.locator(".cl-dock-toggle.cl-dock-toggle--left");
  if (await toggle.count()) await toggle.click({ timeout: 3000 }).catch(() => {});
  page.hfErrors = errors;
  return { context, page };
}

async function burstCapture(page, dir, { count, intervalMs, prefix }) {
  mkdirSync(dir, { recursive: true });
  for (let i = 0; i < count; i++) {
    await page.screenshot({ path: join(dir, `${prefix}-${String(i).padStart(2, "0")}.png`) });
    await page.waitForTimeout(intervalMs);
  }
}

/** Timer-getriebene Clash-Erfassung statt blindem Sampling: pollt `combat.playerTimerMs`/
 * `enemyTimerMs` (Countdown bis zum nächsten Angriff, s. `state.combat`-Schema) — sobald einer der
 * beiden unter `preWindowMs` fällt, ist ein Windup/Sprint/Clash dieser Seite unmittelbar bevor
 * (choreography.ts: windupMs 260-430 je Gewichtsklasse), also startet HIER ein dichter Burst, der
 * Windup+Sprint+Kontakt+Rückzug mit hoher Wahrscheinlichkeit einfängt (statt blind auf gut Glück
 * alle 450ms zu schießen und die ~1s-Bewegung meist zu verpassen). */
async function captureNextAttack(page, dir, prefix, opts = {}) {
  const { pollMs = 80, preWindowMs = 480, burstCount = 10, burstIntervalMs = 110, timeoutMs = 9000 } = opts;
  mkdirSync(dir, { recursive: true });
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const t = await page.evaluate(() => {
      const c = window.__hfDebug?.state?.combat;
      return c ? { p: c.playerTimerMs, e: c.enemyTimerMs } : { p: 9999, e: 9999 };
    });
    if (t.p <= preWindowMs || t.e <= preWindowMs) {
      for (let i = 0; i < burstCount; i++) {
        await page.screenshot({ path: join(dir, `${prefix}-${String(i).padStart(2, "0")}.png`) });
        await page.waitForTimeout(burstIntervalMs);
      }
      return true;
    }
    await page.waitForTimeout(pollMs);
  }
  return false;
}

async function stillsForZone(browser, zone) {
  console.log(`\n### Stills: ${zone} @ 1920x1080 ###`);
  {
    const { context, page } = await openArenaCombat(browser, { zone, viewport: { width: 1920, height: 1080 } });
    await page.waitForTimeout(400);
    await page.screenshot({ path: join(OUT_DIR, `${zone}-1920x1080-00-mount.png`) });
    console.log("SHOT: mount (t=0, sollte 'weite Zonen-Stimmung' zeigen)");
    const got = await captureNextAttack(page, join(OUT_DIR, `${zone}-clash-1920`), "c");
    console.log(`clash-burst caught: ${got}`);
    await burstCapture(page, join(OUT_DIR, `${zone}-burst-1920`), { count: 10, intervalMs: 500, prefix: "f" });
    console.log(`errors: ${page.hfErrors.length ? page.hfErrors.slice(0, 5).join(" | ") : "none"}`);
    await context.close();
  }
  console.log(`### Stills: ${zone} @ 3440x1440 ###`);
  {
    const { context, page } = await openArenaCombat(browser, { zone, viewport: { width: 3440, height: 1440 } });
    await page.waitForTimeout(400);
    await page.screenshot({ path: join(OUT_DIR, `${zone}-3440x1440-00-mount.png`) });
    console.log("SHOT: mount ultrawide");
    const got = await captureNextAttack(page, join(OUT_DIR, `${zone}-clash-3440`), "c");
    console.log(`clash-burst caught (ultrawide): ${got}`);
    console.log(`errors: ${page.hfErrors.length ? page.hfErrors.slice(0, 5).join(" | ") : "none"}`);
    await context.close();
  }
}

async function recordVideoForZone(browser, zone, durationMs = 20000) {
  console.log(`\n### Video: ${zone} (${durationMs / 1000}s) ###`);
  const dir = join(OUT_DIR, "_raw-video");
  mkdirSync(dir, { recursive: true });
  const t0 = Date.now();
  const { context, page } = await openArenaCombat(browser, { zone, viewport: { width: 1920, height: 1080 }, record: { dir } });
  const setupSec = (Date.now() - t0) / 1000;
  await page.waitForTimeout(durationMs);
  await page.close();
  const video = page.video();
  await context.close();
  const tmpPath = await video.path();
  const targetPath = join(OUT_DIR, `clip-${zone}-raw.webm`);
  renameSync(tmpPath, targetPath);
  console.log("CLIP SAVED:", targetPath, `(Setup vor Kampfstart ~${setupSec.toFixed(1)}s, im Video enthalten)`);
  return targetPath;
}

async function main() {
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

    const targets = process.argv.slice(2);
    const zonesToRun = targets.filter((t) => ZONES[t]);
    const doVideo = targets.includes("video");
    const videoZone = targets.find((t) => t.startsWith("video:"))?.split(":")[1];

    if (zonesToRun.length === 0 && !doVideo && !videoZone) {
      for (const zone of Object.keys(ZONES)) await stillsForZone(browser, zone);
    } else {
      for (const zone of zonesToRun) await stillsForZone(browser, zone);
      if (videoZone) await recordVideoForZone(browser, videoZone);
      else if (doVideo) await recordVideoForZone(browser, "crypt");
    }

    await browser.close();
    console.log("\n[arena-abnahme-runde1-shots] done.");
  } finally {
    child.kill();
  }
}

main();
