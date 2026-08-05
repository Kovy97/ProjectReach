#!/usr/bin/env node
/**
 * 0.4.0-Arena, Posen-Pilot (Chef-GO 2026-08-05, s. design/battle-040-pose-pilot.md) — Verifikation
 * des Posen-Wechsel-Systems am Chicken-Pilot (Pastures).
 *
 * Zwei Läufe, JEDER mit einem eigenen frischen Dev-Server (keine HMR-Glob-Timing-Unsicherheit):
 *   A) MIT Test-Posen — `chicken_pose_{windup,strike,hit}.webp` müssen bereits unter
 *      `src/renderer/assets/monsters/` liegen, BEVOR dieses Skript startet (temporäre
 *      Verifikations-Fixtures, s. Auftrag — NICHT von diesem Skript selbst kopiert/gelöscht).
 *      Beweist über die `a25Pose{Player,Monster}`-QA-Anker-Attribute: idle → windup → strike
 *      (Angreifer) / hit (Verteidiger, kausal am Kontakt) → zurück zu idle, plus Schatten folgt Pose.
 *   B) OHNE Test-Posen (Dateien müssen VOR diesem Lauf bereits entfernt sein) — beweist
 *      byte-identisches Fallback-Verhalten (kein Fehler, Einzel-Sprite, `a25PoseMonster` bleibt
 *      dauerhaft "idle").
 *
 * Muster 1:1 aus arena25d-manifest-verify.mjs übernommen (Dev-Server-Spawn, GPU-Headless-Chromium
 * via ANGLE/D3D11, Fixture-Routing, Chicken/Pastures via `combat.monsterId`/`combat.enemyHp`).
 *
 * Run (from apps/client/):
 *   node ui-audit/arena25d-pose-pilot-verify.mjs with     # Szenario A — Posen-Dateien müssen liegen
 *   node ui-audit/arena25d-pose-pilot-verify.mjs without  # Szenario B — Posen-Dateien müssen fehlen
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const MODE = process.argv[2] === "without" ? "without" : "with";
const PORT = MODE === "with" ? 5332 : 5333;
const BASE_URL = `http://localhost:${PORT}`;
const OUT_DIR = join(__dirname, `_shots-arena-pose-pilot-${MODE}`);

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
      toursSeen: { combat: true, shop: true, bank: true, featureTourV1: true, featureTourV2: true },
    };
    mutator(json.state);
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(json) });
  });
}

async function openChickenCombat(browser, { enemyHp, video }) {
  const contextOpts = { viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 };
  if (video) contextOpts.recordVideo = { dir: OUT_DIR, size: { width: 1920, height: 1080 } };
  const context = await browser.newContext(contextOpts);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push("console: " + m.text());
  });
  await page.addInitScript(() => {
    localStorage.setItem("gr.combatFxLevel", "full");
    localStorage.setItem("gr.arena25d", "1");
  });
  await routeFixture(page, "midgame", (s) => {
    s.combat.monsterId = "chicken";
    s.combat.enemyHp = enemyHp;
  });
  await page.goto(`${BASE_URL}/?fixture=midgame`, { waitUntil: "load" });
  await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
  await page.waitForTimeout(4200); // Fixture-Load-Achievement-Toasts abklingen lassen
  await page.locator('[data-guide-id="sidebar.combat"]').first().click({ timeout: 8000 });
  await page.waitForSelector(".battle-arena", { timeout: 10000 });
  page.hfErrors = errors;
  return page;
}

async function waitForPose(page, side, pose, timeout) {
  return page
    .waitForFunction(
      ({ side, pose }) => {
        const el = document.querySelector(".a25-root");
        return !!el && el.dataset[side] === pose;
      },
      { side, pose },
      { timeout },
    )
    .then(() => true)
    .catch(() => false);
}

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

  if (MODE === "with") {
    console.log("\n### Szenario A: Chicken MIT Test-Posen (windup/strike/hit) ###");
    const page = await openChickenCombat(browser, { enemyHp: 220, video: true });
    console.log(`.a25-root mounted: ${await page.locator(".a25-root").count()}`);

    // 1) Idle-Baseline (Einlauf abgeklungen).
    await page.waitForTimeout(1200);
    await page.screenshot({ path: join(OUT_DIR, "1-idle.png") });
    const idlePlayer = await page.locator(".a25-root").getAttribute("data-a25-pose-player");
    const idleMonster = await page.locator(".a25-root").getAttribute("data-a25-pose-monster");
    console.log(`[1] idle baseline — player=${idlePlayer} monster=${idleMonster}`);

    // 2) Monster als ANGREIFER: windup (predictiv aus timerRemainingSec, s. maybeStartPredictiveCycle).
    const gotWindup = await waitForPose(page, "a25PoseMonster", "windup", 9000);
    if (gotWindup) await page.screenshot({ path: join(OUT_DIR, "2-monster-windup.png") });
    console.log(`[2] monster windup beobachtet: ${gotWindup}`);

    // 3) Monster: strike (ab Kontakt-Event, ~200ms) — direkt im Anschluss an den Windup.
    const gotStrike = await waitForPose(page, "a25PoseMonster", "strike", 3000);
    if (gotStrike) await page.screenshot({ path: join(OUT_DIR, "3-monster-strike.png") });
    console.log(`[3] monster strike beobachtet: ${gotStrike}`);

    // 4) Rückkehr zu idle nach dem Strike-Fenster.
    const backToIdle = await waitForPose(page, "a25PoseMonster", "idle", 3000);
    if (backToIdle) await page.screenshot({ path: join(OUT_DIR, "4-monster-back-to-idle.png") });
    console.log(`[4] monster zurück zu idle: ${backToIdle}`);

    // 5) Monster als VERTEIDIGER: hit (Spieler trifft, kausal am Kontakt, ~250ms).
    const gotHit = await waitForPose(page, "a25PoseMonster", "hit", 9000);
    if (gotHit) {
      await page.screenshot({ path: join(OUT_DIR, "5-monster-hit.png") });
      // Schatten-Crop: enge Aufnahme um den Gegner (rechte Bildhälfte) — beweist "Schatten folgt
      // Pose" per Augenschein (die "hit"-Testpose hat eine SICHTBAR andere Fußspanne/Rotation als
      // "idle", s. Testpose-Erzeugung — Schatten-Ellipse MUSS entsprechend anders sitzen als in [1]).
      const arenaBox = await page.locator(".battle-arena").first().boundingBox();
      if (arenaBox) {
        const clip = {
          x: Math.round(arenaBox.x + arenaBox.width * 0.5),
          y: Math.round(arenaBox.y + arenaBox.height * 0.35),
          width: Math.round(arenaBox.width * 0.5),
          height: Math.round(arenaBox.height * 0.65),
        };
        await page.screenshot({ path: join(OUT_DIR, "5b-monster-hit-shadow-crop.png"), clip });
      }
    }
    console.log(`[5] monster hit (Verteidiger) beobachtet: ${gotHit}`);

    // Idle-Crop derselben Region wie [5b] zum direkten Vergleich (Schatten-Formveränderung).
    await waitForPose(page, "a25PoseMonster", "idle", 5000);
    const arenaBox2 = await page.locator(".battle-arena").first().boundingBox();
    if (arenaBox2) {
      const clip = {
        x: Math.round(arenaBox2.x + arenaBox2.width * 0.5),
        y: Math.round(arenaBox2.y + arenaBox2.height * 0.35),
        width: Math.round(arenaBox2.width * 0.5),
        height: Math.round(arenaBox2.height * 0.65),
      };
      await page.screenshot({ path: join(OUT_DIR, "6-monster-idle-shadow-crop.png"), clip });
    }
    console.log("[6] idle shadow crop (Vergleichsbild zu 5b) gespeichert");

    console.log(`[with] ${page.hfErrors.length ? page.hfErrors.length + " page errors:\n" + page.hfErrors.slice(0, 10).join("\n") : "no page errors"}`);
    await page.waitForTimeout(3000); // etwas Video-Nachlauf
    const video = page.video();
    await page.close();
    if (video) {
      const videoPath = await video.path();
      console.log(`webm gespeichert: ${videoPath}`);
    }
  } else {
    console.log("\n### Szenario B: Chicken OHNE Posen-Dateien (Fallback-Gesetz) ###");
    const page = await openChickenCombat(browser, { enemyHp: 60, video: false });
    console.log(`.a25-root mounted: ${await page.locator(".a25-root").count()}`);
    const monsterSpriteVisible = await page
      .waitForFunction(() => {
        const el = document.querySelector(".a25-root");
        return !!el; // Sprite-Sichtbarkeit selbst prüfen wir per Screenshot, hier nur Mount-Beweis.
      }, { timeout: 8000 })
      .then(() => true)
      .catch(() => false);
    console.log(`arena mounted ok: ${monsterSpriteVisible}`);
    await page.waitForTimeout(5200); // > 1x chicken attackIntervalMs (3000ms) — mind. ein Zyklus muss durch sein
    await page.screenshot({ path: join(OUT_DIR, "1-fallback-baseline.png") });
    const monsterPose = await page.locator(".a25-root").getAttribute("data-a25-pose-monster");
    console.log(`[fallback] a25PoseMonster (erwartet: idle, IMMER — keine Posen-Dateien vorhanden): ${monsterPose}`);
    await page.waitForTimeout(4000);
    const monsterPoseAgain = await page.locator(".a25-root").getAttribute("data-a25-pose-monster");
    console.log(`[fallback] a25PoseMonster nach weiteren 4s (erwartet weiterhin: idle): ${monsterPoseAgain}`);
    await page.screenshot({ path: join(OUT_DIR, "2-fallback-after-cycle.png") });
    console.log(`[without] ${page.hfErrors.length ? page.hfErrors.length + " page errors:\n" + page.hfErrors.slice(0, 10).join("\n") : "no page errors"}`);
    await page.close();
  }

  await browser.close();
  console.log(`\n[arena25d-pose-pilot-verify:${MODE}] done. Shots: ${OUT_DIR}`);
} finally {
  child.kill();
}
