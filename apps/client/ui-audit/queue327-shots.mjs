#!/usr/bin/env node
/**
 * Verification shots for Task #327 ("Priority-UI für die Queue", Engine #326 GO): the ⚡
 * "start now" button per waiting queue row + a live before/after of `prioritizeQueueEntry`
 * (Kochen läuft, Waffe priorisiert → Kochen mit Rest vorn — genau das Spieler-Beispiel aus dem
 * Auftrag), plus the Shift-click hint chip on a skill card and a monster card.
 * Pattern copied from queue315-shots.mjs (vite dev + Playwright, NOT `pnpm dev`/Electron —
 * headless-only per UI-Dev hard rule). Fixture: queue327 (gen-queue327-fixture.mjs).
 * Run: node ui-audit/queue327-shots.mjs   (from apps/client/)
 */
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5327;
const BASE_URL = `http://localhost:${PORT}`;
const OUT_DIR = "C:\\Users\\MSchu\\AppData\\Local\\Temp\\claude\\G--GameDev\\553d2095-3a73-4795-9782-0fe746a25f13\\scratchpad\\queue327-shots";
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

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  console.log(`[q327] starting dev server on port ${PORT}...`);
  const server = startDevServer();
  if (!(await waitForServer(BASE_URL))) {
    console.error("[q327] dev server did not come up:\n" + server.getOutput());
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

    await page.goto(`${BASE_URL}/?fixture=queue327`, { waitUntil: "load" });
    await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
    await page.waitForTimeout(3500); // let load-toasts clear (Toasts.tsx achievement-diff on mount)

    // Queue-Panel startet collapsed (localStorage-Default) — einmal aufklappen.
    if (!(await step("expand the queue panel (starts collapsed)", async () => {
      await page.locator(".queue-panel-toggle").click();
      await page.waitForSelector(".queue-panel-body", { timeout: T });
    }))) failures++;

    await step("shot: queue BEFORE priority (Kochen aktiv, 3 wartende Zeilen mit ⚡-Buttons)", async () => {
      await page.locator(".queue-panel").screenshot({ path: join(OUT_DIR, "1-queue-before.png") });
    });

    // Die dritte wartende Zeile ist "Stahl-Schwert schmieden" (forge_steel_sword) — das
    // Spieler-Beispiel aus dem Auftrag ("Waffe priorisiert").
    const swordRow = page.locator(".queue-panel-list .queue-row", { hasText: "Stahl-Schwert schmieden" }).first();
    if (!(await step("locate the 'Stahl-Schwert schmieden' waiting row", async () => {
      await swordRow.waitFor({ state: "visible", timeout: T });
    }))) failures++;

    await step("shot: close-up on the ⚡ start-now button before the click", async () => {
      await swordRow.scrollIntoViewIfNeeded();
      await swordRow.screenshot({ path: join(OUT_DIR, "2-sword-row-closeup.png") });
    });

    // Funktionaler Smoke-Test: der echte ⚡-Klick MUSS die wartende Zeile verschwinden lassen
    // (egal wie schnell die Schmiede-Craft-Dauer danach durchläuft) — das beweist, dass der Button
    // tatsächlich `prioritizeQueueEntry` auslöst, unabhängig vom exakten Zeitpunkt des Screenshots.
    if (!(await step("click the ⚡ start-now button on the weapon row (functional smoke test)", async () => {
      await swordRow.locator(".queue-row-btn--start").click();
      await page.waitForSelector(".queue-panel-list .queue-row:has-text('Stahl-Schwert schmieden')", { state: "detached", timeout: T });
    }))) failures++;

    // Illustrations-Screenshot "nachher": eigenes deterministisches Fixture (queue327-after.json,
    // `prioritizeQueueEntry` direkt über die Engine angewendet statt per Live-Klick nachgestellt) —
    // selbst kleine reale Wartezeiten (Klick + Screenshot-Roundtrip) reichten in diesem headless-
    // Setup (Software-GL) aus, damit der Live-Loop genug Wand-Zeit "nachholt", um eine kurze Craft-
    // Dauer schon wieder fertig zu haben, bevor der Screenshot entsteht (s. gen-queue327-fixture.mjs
    // JSDoc) — das deterministische Fixture umgeht die Race komplett.
    if (!(await step("load queue327-after (deterministic post-priority state)", async () => {
      await page.goto(`${BASE_URL}/?fixture=queue327-after`, { waitUntil: "load" });
      await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
      await page.waitForSelector(".queue-panel-body", { timeout: T }); // Panel-aufgeklappt-Präferenz überlebt den goto
      await page.waitForTimeout(400); // ein Tick, weit innerhalb des 11s-Schmiede-Fensters (forge_steel_sword)
      // Der Maus-Cursor bleibt nach einem `page.goto()` an seiner letzten Bildschirmposition stehen
      // (kein echter Reset) — ohne diesen Move würde er über der ersten Warteschlangen-Zeile
      // "landen" und deren eigene HoverTip (Ziehen/Rechtsklick-Hinweis) den Namen verdecken.
      await page.mouse.move(10, 10);
    }))) failures++;

    await step("shot: queue AFTER priority (Schwert aktiv, Kochen mit Restziel vorn in der Warteschlange)", async () => {
      await page.locator(".queue-panel").screenshot({ path: join(OUT_DIR, "3-queue-after.png") });
    });

    // ═══ Shift-Klick-Hinweis: Skill-Karte (Kochen) ═══
    if (!(await step("open Cooking skill page and search for shrimp (expands its category)", async () => {
      await page.locator('[data-guide-id="sidebar.cooking"]').first().click();
      await page.waitForSelector(".invf-search", { timeout: T });
      await page.locator(".invf-search").fill("shrimp");
      await page.waitForSelector(".skillcard-craft-cta", { timeout: T });
    }))) failures++;

    const cookCta = page.locator(".skillcard-craft-cta").first();
    if (!(await step("hover the quantity-grid to open the shift-click HoverTip", async () => {
      await cookCta.scrollIntoViewIfNeeded();
      await cookCta.hover();
      await page.waitForSelector(".ct-tip", { timeout: T });
    }))) failures++;

    await step("shot: skill card shift-click hint tooltip visible", async () => {
      await page.screenshot({ path: join(OUT_DIR, "4-skillcard-shift-hint.png"), clip: await cookCta.boundingBox().then((b) => ({ x: Math.max(0, b.x - 20), y: Math.max(0, b.y - 90), width: Math.min(700, b.width + 200), height: 220 })) });
    });

    // ═══ Shift-Klick-Hinweis: Monster-Karte ═══
    if (!(await step("open Combat -> first zone (pastures)", async () => {
      await page.locator('[data-guide-id="sidebar.combat"]').first().click();
      await page.waitForSelector(".zone-grid .zone-card", { timeout: T });
      await page.locator(".zone-grid .zone-card").first().click();
      await page.waitForSelector(".monster-grid .monster-card", { timeout: T });
      await page.waitForTimeout(300);
    }))) failures++;

    const shiftHintChip = page.locator(".mc-shift-hint").first();
    if (!(await step("hover the monster-card ⇧ chip to open its HoverTip", async () => {
      await shiftHintChip.scrollIntoViewIfNeeded();
      await shiftHintChip.hover();
      await page.waitForSelector(".ct-tip", { timeout: T });
    }))) failures++;

    await step("shot: monster card shift-click hint tooltip visible", async () => {
      const box = await shiftHintChip.boundingBox();
      await page.screenshot({ path: join(OUT_DIR, "5-monstercard-shift-hint.png"), clip: { x: Math.max(0, box.x - 220), y: Math.max(0, box.y - 90), width: 420, height: 220 } });
    });

    console.log(errors.length ? `${errors.length} page errors:\n` + errors.slice(0, 20).join("\n") : "no page errors");
  } finally {
    await browser.close();
    server.child.kill();
  }
  console.log(failures > 0 ? `[q327] ${failures} SANITY-CHECK(S) FAILED` : "[q327] alle Sanity-Checks OK");
  process.exitCode = failures > 0 ? 1 : 0;
}

main();
