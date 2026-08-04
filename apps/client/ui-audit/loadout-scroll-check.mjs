#!/usr/bin/env node
/**
 * Chef 2026-07-11 — Kampf-Screen-Verifikation:
 *  (1) Die linke Loadout-Spalte (Food/Potions/Session) darf die Seite nicht mehr strecken:
 *      der Seiten-Scroller (.content-body) hat auf der aktiven Kampf-Ansicht overflow 0,
 *      die Grid-Zeilenhöhe kommt von den Fighter-/Log-Spalten, die Loadout-Spalte scrollt
 *      in ihrem EIGENEN Container (position:absolute + overflow-y:auto).
 *  (2) Kollaps-Modus (<=1400px): Loadout-Reihe behält intrinsische Höhe (nicht 0 kollabiert).
 *  (3) Zonen-Karten: 💎 wurde durch das Achievement-Sidebar-Icon ersetzt (.zone-card-progress-icon).
 * Port 5233.
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = "G:\\GameDev\\apps\\client";
const PORT = 5233;
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

function measureLayout() {
  const cb = document.querySelector(".content-body");
  const col = document.querySelector(".battle-loadout-col");
  const load = document.querySelector(".battle-loadout-col .combat-loadout");
  const fighter = document.querySelector(".fighter");
  const main = document.querySelector(".battle-main");
  const r = (el) => (el ? { h: Math.round(el.getBoundingClientRect().height), sh: el.scrollHeight, ch: el.clientHeight } : null);
  return {
    contentBody: r(cb),
    contentBodyOverflow: cb ? cb.scrollHeight - cb.clientHeight : null,
    battleMain: r(main),
    loadoutCol: r(col),
    loadout: load
      ? { ...r(load), position: getComputedStyle(load).position, overflowY: getComputedStyle(load).overflowY, internalScroll: load.scrollHeight - load.clientHeight }
      : null,
    fighter: r(fighter),
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
  await page.waitForTimeout(4000);
  await clickRetry(page, page.locator('[data-guide-id="sidebar.combat"]').first());
  await page.waitForTimeout(600);

  // (3) Zonen-Karten-Icon prüfen (Zonen-Grid ist die Standard-Ansicht).
  const iconCheck = await page.evaluate(() => {
    const icons = Array.from(document.querySelectorAll(".zone-card-progress-icon"));
    const first = icons[0];
    return {
      count: icons.length,
      loaded: first ? first.complete && first.naturalWidth > 0 : false,
      size: first ? { w: Math.round(first.getBoundingClientRect().width), h: Math.round(first.getBoundingClientRect().height) } : null,
      diamondLeft: Array.from(document.querySelectorAll(".zone-card-progress")).some((el) => el.textContent.includes("💎")),
    };
  });
  console.log("ZONE-ICON:", JSON.stringify(iconCheck));
  await page.locator(".zone-card").first().screenshot({ path: join(OUT_DIR, "zonecard-achievement-icon.png") });
  console.log("SHOT SAVED: zonecard-achievement-icon.png");

  // Kampf starten: erste Zone, erstes Monster.
  await clickRetry(page, page.locator(".zone-card").first());
  await page.waitForTimeout(1200);
  await clickRetry(page, page.locator(".mc-fight-btn").first());
  await page.waitForTimeout(2000);

  // (1) Breit (1920): Seite darf nicht scrollen, Loadout absolut + eigener Scroll.
  const wide = await page.evaluate(measureLayout);
  console.log("WIDE(1920):", JSON.stringify(wide));
  await page.screenshot({ path: join(OUT_DIR, "battle-loadout-scroll-1920.png"), fullPage: false });
  console.log("SHOT SAVED: battle-loadout-scroll-1920.png");

  // (2) Kollaps-Modus: 1280 breit — Loadout-Reihe muss intrinsische Höhe behalten.
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.waitForTimeout(800);
  const narrow = await page.evaluate(measureLayout);
  console.log("NARROW(1280):", JSON.stringify(narrow));
  await page.screenshot({ path: join(OUT_DIR, "battle-loadout-scroll-1280.png"), fullPage: false });
  console.log("SHOT SAVED: battle-loadout-scroll-1280.png");

  // Verdikt.
  const problems = [];
  if (!wide.loadout || wide.loadout.position !== "absolute") problems.push("Loadout ist bei 1920 nicht absolut positioniert");
  if ((wide.contentBodyOverflow ?? 99) > 1) problems.push(`Seite scrollt noch bei 1920 (overflow ${wide.contentBodyOverflow}px)`);
  // Arena-Rework: die Zeilenhöhe definiert jetzt .battle-arena (der einzelne Fighter ist nur noch
  // Figur+Nameplate IN der Arena und darf kleiner sein als die Spalte).
  const arenaH = await page.evaluate(() => Math.round(document.querySelector(".battle-arena")?.getBoundingClientRect().height ?? 0));
  if (wide.loadoutCol && arenaH > 0 && wide.loadoutCol.h > arenaH + 4) problems.push(`Loadout-Spalte (${wide.loadoutCol.h}px) höher als Arena (${arenaH}px) — streckt noch`);
  if (!narrow.loadout || narrow.loadout.position !== "static") problems.push("Kollaps-Modus: Loadout nicht static");
  if (narrow.loadoutCol && narrow.loadoutCol.h < 60) problems.push(`Kollaps-Modus: Loadout-Zeile kollabiert (${narrow.loadoutCol.h}px)`);
  if (iconCheck.count === 0 || !iconCheck.loaded) problems.push("Achievement-Icon auf Zonen-Karten fehlt/lädt nicht");
  if (iconCheck.diamondLeft) problems.push("💎-Emoji noch vorhanden");
  console.log(problems.length ? "PROBLEME:\n- " + problems.join("\n- ") : "ALLE CHECKS GRÜN");
  console.log(errors.length ? `${errors.length} page errors:\n` + errors.slice(0, 8).join("\n") : "no page errors");

  await browser.close();
} finally {
  child.kill();
}
