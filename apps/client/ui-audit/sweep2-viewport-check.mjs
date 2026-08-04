#!/usr/bin/env node
/**
 * TESTER 2 ("Der Kämpfer") — Fenstergrößen-Check am neuen Arena-Kampf-Screen:
 * 1920×1080, 1600×900, 1280×720. Bei den kleineren Größen greift der Kollaps-Modus
 * (Loadout-Zeile oben, Arena Mitte, Log unten) — nichts darf auf 0 kollabieren oder
 * überlappen. READ-ONLY. Port 5251.
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const CLIENT_DIR = "G:\\GameDev\\apps\\client";
const PORT = 5251;
const BASE_URL = `http://localhost:${PORT}`;
const OUT_DIR = "C:\\Users\\MSchu\\AppData\\Local\\Temp\\claude\\G--GameDev\\553d2095-3a73-4795-9782-0fe746a25f13\\scratchpad\\sweep2";

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

const errors = [];
function wirePage(page) {
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
}

function measure() {
  const r = (el) => (el ? { x: Math.round(el.getBoundingClientRect().x), y: Math.round(el.getBoundingClientRect().y), w: Math.round(el.getBoundingClientRect().width), h: Math.round(el.getBoundingClientRect().height) } : null);
  const cb = document.querySelector(".content-body");
  return {
    contentBodyOverflow: cb ? cb.scrollHeight - cb.clientHeight : null,
    loadoutCol: r(document.querySelector(".battle-loadout-col")),
    arena: r(document.querySelector(".battle-arena")),
    logPanel: r(document.querySelector(".battle-log-panel")),
    playerScene: r(document.querySelector(".arena-side-player .fighter-scene")),
    enemyScene: r(document.querySelector(".arena-side-enemy .fighter-scene")),
  };
}

const problems = [];
const { child, getOutput } = startDevServer();
try {
  const ok = await waitForServer(BASE_URL);
  if (!ok) { console.error("SERVER NOT UP:\n" + getOutput()); process.exit(1); }
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  wirePage(page);

  await page.goto(`${BASE_URL}/?fixture=midgame`, { waitUntil: "load" });
  await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
  await page.waitForTimeout(2500);
  await clickRetry(page, page.locator('[data-guide-id="sidebar.combat"]').first());
  await page.waitForTimeout(600);
  await clickRetry(page, page.locator(".zone-card").first());
  await page.waitForTimeout(1000);
  await clickRetry(page, page.locator(".mc-fight-btn").first());
  await page.waitForSelector(".battle-arena", { timeout: 8000 });
  await page.waitForTimeout(1200);

  const sizes = [
    { w: 1920, h: 1080, name: "1920x1080", shot: "15-viewport-1920.png" },
    { w: 1600, h: 900, name: "1600x900", shot: "16-viewport-1600.png" },
    { w: 1280, h: 720, name: "1280x720", shot: "17-viewport-1280.png" },
  ];

  for (const size of sizes) {
    await page.setViewportSize({ width: size.w, height: size.h });
    await page.waitForTimeout(700);
    const m = await page.evaluate(measure);
    console.log(`MEASURE(${size.name}):`, JSON.stringify(m));
    await page.screenshot({ path: join(OUT_DIR, size.shot) });
    console.log("SHOT SAVED:", size.shot);

    // Seiten-Scroll ist NUR im Breitbild-Modus (>1400px, einreihiges Layout, Zeilenhöhe kommt von
    // der Arena) verboten. Im Kollaps-Modus (<=1400px) stapeln sich Loadout/Arena/Log — dass die
    // Summe der drei Blöcke die Fensterhöhe übersteigt und die Seite scrollt, ist erwartet/ok,
    // solange nichts auf 0 kollabiert oder überlappt (separat geprüft unten).
    if (size.w > 1400 && (m.contentBodyOverflow ?? 0) > 4) problems.push(`(${size.name}) Seite scrollt (overflow ${m.contentBodyOverflow}px)`);
    if (!m.loadoutCol || m.loadoutCol.h < 40) problems.push(`(${size.name}) Loadout-Zeile kollabiert (${m.loadoutCol?.h}px)`);
    if (!m.arena || m.arena.h < 200) problems.push(`(${size.name}) Arena kollabiert (${m.arena?.h}px)`);
    if (!m.logPanel || m.logPanel.h < 60) problems.push(`(${size.name}) Log kollabiert (${m.logPanel?.h}px)`);
    if (!m.playerScene || m.playerScene.w < 60) problems.push(`(${size.name}) Spieler-Porträt kollabiert (${m.playerScene?.w}px breit)`);
    if (!m.enemyScene || m.enemyScene.w < 60) problems.push(`(${size.name}) Gegner-Porträt kollabiert (${m.enemyScene?.w}px breit)`);

    // Bei <=1400px (Kollaps-Modus): Reihenfolge Loadout > Arena > Log, keine Überlappung.
    if (size.w <= 1400 && m.loadoutCol && m.arena && m.logPanel) {
      if (m.arena.y < m.loadoutCol.y + m.loadoutCol.h - 8) problems.push(`(${size.name}) Arena liegt nicht unter der Loadout-Zeile`);
      if (m.logPanel.y < m.arena.y + m.arena.h - 8) problems.push(`(${size.name}) Log liegt nicht unter der Arena`);
    }
    // Überlappung Spieler-/Gegner-Szene (dürfen sich nie horizontal überschneiden).
    if (m.playerScene && m.enemyScene) {
      const overlap = !(m.playerScene.x + m.playerScene.w <= m.enemyScene.x || m.enemyScene.x + m.enemyScene.w <= m.playerScene.x);
      if (overlap && Math.abs(m.playerScene.y - m.enemyScene.y) < Math.min(m.playerScene.h, m.enemyScene.h) * 0.5) {
        problems.push(`(${size.name}) Spieler- und Gegner-Porträt überlappen sich horizontal`);
      }
    }
  }

  console.log(problems.length ? "PROBLEME:\n- " + problems.join("\n- ") : "ALLE CHECKS GRÜN");
  console.log(errors.length ? `${errors.length} page errors:\n` + errors.slice(0, 15).join("\n") : "no page errors");
  await browser.close();
  process.exitCode = problems.length || errors.length ? 1 : 0;
} finally {
  child.kill();
}
