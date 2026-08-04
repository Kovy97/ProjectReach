#!/usr/bin/env node
/**
 * Verification shots for Task #348 ("Sofort-kämpfen-Button zurück auf die Monster-Karten"):
 * screenshots the new ⚔ `.mc-fight-now-btn` CTA above the quantity grid on a regular MonsterCard,
 * in EN + DE, plus a functional smoke test of the click flow (`onQueue(null, true)` →
 * `enqueueFightAtFront`) against the live GameState via `window.__hfDebug`.
 *
 * Reuses the existing `queue327` fixture (gen-queue327-fixture.mjs): cook_shrimp ACTIVE (target
 * 25) + a 3-entry queue behind it — perfect for proving "current activity survives with its
 * remaining target, pushed to the queue front" without writing a new fixture.
 *
 * Pattern copied from queue327-shots.mjs (vite dev + Playwright, NOT `pnpm dev`/Electron —
 * headless-only per UI-Dev hard rule). Run: node ui-audit/fight348-shots.mjs (from apps/client/)
 */
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5348;
const BASE_URL = `http://localhost:${PORT}`;
const OUT_DIR = "C:\\Users\\MSchu\\AppData\\Local\\Temp\\claude\\G--GameDev\\85edb3a2-2fd2-41b3-a534-53012ba5a3bd\\scratchpad\\fight348-shots";
const T = 8000;

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

async function shotForLocale(browser, locale, failuresRef) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  currentPage = page;
  page.setDefaultTimeout(T);
  page.setDefaultNavigationTimeout(25000);
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });

  await page.addInitScript((loc) => localStorage.setItem("hearthforge:locale", loc), locale);
  await page.goto(`${BASE_URL}/?fixture=queue327`, { waitUntil: "load" });
  await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
  await page.waitForTimeout(3500); // toasts (Toasts.tsx achievement-diff on mount) clear first

  if (!(await step(`[${locale}] open Combat -> first zone (pastures)`, async () => {
    await page.locator('[data-guide-id="sidebar.combat"]').first().click();
    await page.waitForSelector(".zone-grid .zone-card", { timeout: T });
    await page.locator(".zone-grid .zone-card").first().click();
    await page.waitForSelector(".monster-grid .monster-card", { timeout: T });
    await page.waitForTimeout(300);
  }))) failuresRef.n++;

  const firstCard = page.locator(".monster-grid .monster-card:not(.elite-monster-card)").first();
  const fightNowBtn = firstCard.locator(".mc-fight-now-btn");

  if (!(await step(`[${locale}] locate the new ⚔ fight-now button on the first monster card`, async () => {
    await firstCard.scrollIntoViewIfNeeded();
    await fightNowBtn.waitFor({ state: "visible", timeout: T });
  }))) failuresRef.n++;

  await step(`[${locale}] shot: full card (fight-now CTA above the quantity grid)`, async () => {
    await firstCard.screenshot({ path: join(OUT_DIR, `1-card-${locale}.png`) });
  });

  await step(`[${locale}] shot: close-up on the action block (CTA + qty grid + shift hint)`, async () => {
    await firstCard.locator(".mc-queue-actions").screenshot({ path: join(OUT_DIR, `2-actions-${locale}.png`) });
  });

  // ── Functional smoke test: click flow proof via window.__hfDebug ──────────────────────────
  const before = await page.evaluate(() => {
    const s = window.__hfDebug.state;
    return {
      activeActionId: s.activeActionId,
      actionTarget: s.actionTarget,
      combatMonsterId: s.combat.monsterId,
      queueFront: s.actionQueue[0] ?? null,
      queueLen: s.actionQueue.length,
    };
  });
  console.log(`[${locale}] BEFORE click:`, JSON.stringify(before));

  const clickedMonsterId = await firstCard.getAttribute("id").then((v) => (v ?? "").replace(/^monstercard-/, ""));

  if (!(await step(`[${locale}] click the fight-now button (functional smoke test)`, async () => {
    await fightNowBtn.click();
    await page.waitForTimeout(200); // one tick's worth of margin for the state mutation to land
  }))) failuresRef.n++;

  const after = await page.evaluate(() => {
    const s = window.__hfDebug.state;
    return {
      activeActionId: s.activeActionId,
      actionTarget: s.actionTarget,
      combatMonsterId: s.combat.monsterId,
      queueFront: s.actionQueue[0] ?? null,
      queueLen: s.actionQueue.length,
    };
  });
  console.log(`[${locale}] AFTER click:`, JSON.stringify(after));

  const combatStartedNow = after.combatMonsterId === clickedMonsterId;
  const cookingRequeuedAtFront =
    after.queueFront &&
    after.queueFront.kind === "action" &&
    after.queueFront.actionId === "cook_shrimp" &&
    after.activeActionId === null;

  if (!combatStartedNow) {
    console.log(`!! FAILED: [${locale}] combat did not start on the clicked monster (expected combat.monsterId="${clickedMonsterId}", got "${after.combatMonsterId}")`);
    failuresRef.n++;
  } else {
    console.log(`ok: [${locale}] combat.monsterId === clicked card's monster ("${clickedMonsterId}") — fight started immediately`);
  }
  if (!cookingRequeuedAtFront) {
    console.log(`!! FAILED: [${locale}] cook_shrimp was not requeued at the front with its remaining target — queueFront=${JSON.stringify(after.queueFront)}, activeActionId=${after.activeActionId}`);
    failuresRef.n++;
  } else {
    console.log(`ok: [${locale}] cook_shrimp (was active, target ${before.actionTarget}) is back at the queue front as {actionId:"cook_shrimp", target:${after.queueFront.target}} — nothing lost`);
  }

  // Visual confirmation: open the queue panel, screenshot it showing cook_shrimp back at the front.
  if (!(await step(`[${locale}] expand the queue panel`, async () => {
    await page.locator(".queue-panel-toggle").click();
    await page.waitForSelector(".queue-panel-body", { timeout: T });
  }))) failuresRef.n++;

  await step(`[${locale}] shot: queue panel after fight-now click (cooking back at front w/ remaining target)`, async () => {
    await page.locator(".queue-panel").screenshot({ path: join(OUT_DIR, `3-queue-after-${locale}.png`) });
  });

  console.log(errors.length ? `[${locale}] ${errors.length} page errors:\n` + errors.slice(0, 20).join("\n") : `[${locale}] no page errors`);
  await page.close();
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  console.log(`[f348] starting dev server on port ${PORT}...`);
  const server = startDevServer();
  if (!(await waitForServer(BASE_URL))) {
    console.error("[f348] dev server did not come up:\n" + server.getOutput());
    server.child.kill();
    process.exitCode = 1;
    return;
  }

  const browser = await chromium.launch();
  const failuresRef = { n: 0 };
  try {
    await shotForLocale(browser, "en", failuresRef);
    await shotForLocale(browser, "de", failuresRef);
  } finally {
    await browser.close();
    server.child.kill();
  }
  console.log(failuresRef.n > 0 ? `[f348] ${failuresRef.n} SANITY-CHECK(S) FAILED` : "[f348] alle Sanity-Checks OK");
  process.exitCode = failuresRef.n > 0 ? 1 : 0;
}

main();
