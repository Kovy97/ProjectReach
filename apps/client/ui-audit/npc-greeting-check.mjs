#!/usr/bin/env node
/**
 * NPC-Begrüßungs-Baustein („Speaking Head", Chef-GO 2026-07-13) — Verifikation:
 *  (1) Alle 4 Seiten (Bank/Shop/Slayer/Quests) zeigen oben die NpcGreeting-Leiste:
 *      Kopf-Medaillon (img geladen, naturalWidth > 0) + Sprechblase mit Name + nicht-leerem Text.
 *  (2) Rotation: pro Mount wird zufällig eine von 3 Zeilen gewählt — über 6 Remounts je NPC
 *      müssen mindestens 2 verschiedene Texte auftauchen.
 *  (3) Screenshots je Seite bei 1920×1080 UND 1366×768 (Rahmen sauber, Text nicht abgeschnitten).
 *  (4) Keine page errors.
 * Port 5245.
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5245;
const BASE_URL = `http://localhost:${PORT}`;
const OUT_DIR = "C:\\Users\\MSchu\\AppData\\Local\\Temp\\claude\\G--GameDev\\553d2095-3a73-4795-9782-0fe746a25f13\\scratchpad";

function startDevServer() {
  const viteBin = join(CLIENT_DIR, "node_modules", "vite", "bin", "vite.js");
  const child = spawn(
    process.execPath,
    [viteBin, "dev", "--config", join(CLIENT_DIR, "ui-audit", "vite.tour.config.mjs"), "--port", String(PORT), "--strictPort"],
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

async function clickRetry(page, locator, opts = {}) {
  try { await locator.click({ timeout: 6000, ...opts }); }
  catch { await page.waitForTimeout(400); await locator.click({ timeout: 6000, ...opts }); }
}

// Die 4 Einbindungs-Seiten: Selektor der Nav-Schaltfläche + erwarteter Seiten-Wrapper.
const PAGES = [
  { id: "bank",   nav: '[data-guide-id="topbar.bank"]',   wrapper: ".bank-page" },
  { id: "shop",   nav: '[data-guide-id="topbar.shop"]',   wrapper: ".shopv2-page" },
  { id: "slayer", nav: '[data-guide-id="sidebar.slayer"]', wrapper: ".slayer-page" },
  { id: "quests", nav: '[data-guide-id="topbar.quests"]', wrapper: ".quests-page" },
];
// Neutrale Zwischenseite für Remounts (Rotation): Charakter (Top Bar, immer da).
const NEUTRAL_NAV = '[data-guide-id="topbar.character"]';

function inspectGreeting() {
  const root = document.querySelector(".npc-greeting");
  if (!root) return { present: false };
  const img = root.querySelector(".npc-greeting-img");
  const name = root.querySelector(".npc-bubble-name");
  const text = root.querySelector(".npc-bubble-text");
  const r = root.getBoundingClientRect();
  const bubble = root.querySelector(".npc-bubble");
  const br = bubble ? bubble.getBoundingClientRect() : null;
  return {
    present: true,
    imgLoaded: img ? img.complete && img.naturalWidth > 0 : false,
    name: name ? name.textContent.trim() : "",
    text: text ? text.textContent.trim() : "",
    height: Math.round(r.height),
    // Text abgeschnitten? (Blase clippt nicht, Seite scrollt nicht horizontal)
    bubbleOverflowX: bubble ? bubble.scrollWidth - bubble.clientWidth : null,
    bubbleRight: br ? Math.round(br.right) : null,
    viewportW: window.innerWidth,
  };
}

const { child, getOutput } = startDevServer();
try {
  const ok = await waitForServer(BASE_URL);
  if (!ok) { console.error("SERVER NOT UP:\n" + getOutput()); process.exit(1); }
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });

  await page.goto(`${BASE_URL}/?fixture=midgame`, { waitUntil: "load" });
  await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
  await page.waitForTimeout(3000);

  const problems = [];

  // (1)+(3) Jede Seite besuchen, DOM prüfen, Screenshot 1920 + 1366.
  for (const p of PAGES) {
    await clickRetry(page, page.locator(p.nav).first());
    await page.waitForSelector(p.wrapper, { timeout: 8000 });
    await page.waitForTimeout(500);
    const info = await page.evaluate(inspectGreeting);
    console.log(`GREETING[${p.id}] @1920:`, JSON.stringify(info));
    if (!info.present) problems.push(`${p.id}: .npc-greeting fehlt`);
    else {
      if (!info.imgLoaded) problems.push(`${p.id}: Kopf-Bild nicht geladen`);
      if (!info.name) problems.push(`${p.id}: NPC-Name leer`);
      if (!info.text) problems.push(`${p.id}: Sprechblasen-Text leer`);
      if ((info.bubbleOverflowX ?? 0) > 1) problems.push(`${p.id}: Blasen-Text horizontal abgeschnitten (${info.bubbleOverflowX}px)`);
    }
    await page.screenshot({ path: join(OUT_DIR, `npc-greeting-${p.id}-1920.png`), fullPage: false });
    console.log(`SHOT SAVED: npc-greeting-${p.id}-1920.png`);

    await page.setViewportSize({ width: 1366, height: 768 });
    await page.waitForTimeout(500);
    const small = await page.evaluate(inspectGreeting);
    console.log(`GREETING[${p.id}] @1366:`, JSON.stringify(small));
    if (small.present && (small.bubbleOverflowX ?? 0) > 1) problems.push(`${p.id}@1366: Blasen-Text abgeschnitten (${small.bubbleOverflowX}px)`);
    if (small.present && small.bubbleRight != null && small.bubbleRight > small.viewportW) problems.push(`${p.id}@1366: Blase ragt aus dem Viewport (${small.bubbleRight}px)`);
    await page.screenshot({ path: join(OUT_DIR, `npc-greeting-${p.id}-1366.png`), fullPage: false });
    console.log(`SHOT SAVED: npc-greeting-${p.id}-1366.png`);
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(300);
  }

  // (2) Rotation: 6 Remounts je Seite (Seite → Charakter → Seite …), Texte sammeln.
  for (const p of PAGES) {
    const seen = new Set();
    for (let i = 0; i < 6; i++) {
      await clickRetry(page, page.locator(NEUTRAL_NAV).first());
      await page.waitForTimeout(250);
      await clickRetry(page, page.locator(p.nav).first());
      await page.waitForSelector(`${p.wrapper} .npc-bubble-text`, { timeout: 8000 });
      const text = (await page.locator(`${p.wrapper} .npc-bubble-text`).first().textContent())?.trim();
      if (text) seen.add(text);
    }
    console.log(`ROTATION[${p.id}]: ${seen.size} verschiedene Texte über 6 Mounts`);
    if (seen.size < 2) problems.push(`${p.id}: Rotation greift nicht (nur ${seen.size} Text über 6 Mounts)`);
  }

  console.log(problems.length ? "PROBLEME:\n- " + problems.join("\n- ") : "ALLE CHECKS GRÜN");
  console.log(errors.length ? `${errors.length} page errors:\n` + errors.slice(0, 8).join("\n") : "no page errors");

  await browser.close();
  if (problems.length || errors.length) process.exitCode = 1;
} finally {
  child.kill();
}
