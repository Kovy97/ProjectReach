#!/usr/bin/env node
/**
 * Chef 2026-07-11 — „Load Game Übersicht: man sieht den Charakter kaum":
 * Verifiziert die neuen Charakter-Auswahl-Karten (Porträt füllt die Karte, Name als
 * Gradient-Plakette, Klick-aufs-Bild = Laden). Injiziert die ui-audit-Fixtures als
 * localStorage-Saves (Web-Fallback von saves.ts), damit belegte Slots ohne Electron sichtbar
 * sind. Shots: Load-Panel (2 belegte Karten) + New-Panel (belegt & leer gemischt). Port 5234.
 */
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5234;
const BASE_URL = `http://localhost:${PORT}`;
const OUT_DIR = "C:\\Users\\MSchu\\AppData\\Local\\Temp\\claude\\G--GameDev\\553d2095-3a73-4795-9782-0fe746a25f13\\scratchpad";

const midgame = readFileSync(join(__dirname, "fixtures", "midgame.json"), "utf8");
const endgame = readFileSync(join(__dirname, "fixtures", "endgame.json"), "utf8");

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

const { child, getOutput } = startDevServer();
try {
  const ok = await waitForServer(BASE_URL);
  if (!ok) { console.error("SERVER NOT UP:\n" + getOutput()); process.exit(1); }
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });

  await page.addInitScript(
    ([mid, end]) => {
      localStorage.setItem("hearthforge:save:0", mid);
      localStorage.setItem("hearthforge:save:1", end);
    },
    [midgame, endgame],
  );

  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(1800);

  // Load-Panel (Nav-Index 1)
  await page.locator(".menu-nav-btn").nth(1).click();
  await page.waitForTimeout(700);
  await page.screenshot({ path: join(OUT_DIR, "menu-load-cards.png") });
  console.log("SHOT SAVED: menu-load-cards.png");
  const cardInfo = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll(".menu-slot"));
    return cards.map((c) => ({
      cls: c.className,
      w: Math.round(c.getBoundingClientRect().width),
      h: Math.round(c.getBoundingClientRect().height),
      portraitH: Math.round(c.querySelector(".menu-slot-portrait")?.getBoundingClientRect().height ?? 0),
      name: c.querySelector(".menu-slot-name")?.textContent ?? null,
      imgLoaded: (() => { const i = c.querySelector(".menu-slot-portrait img"); return i ? i.complete && i.naturalWidth > 0 : null; })(),
    }));
  });
  console.log("LOAD CARDS:", JSON.stringify(cardInfo));

  // New-Panel (Nav-Index 0): belegte (Overwrite) + leere Karten gemischt
  await page.locator(".menu-nav-btn").nth(0).click();
  await page.waitForTimeout(700);
  await page.screenshot({ path: join(OUT_DIR, "menu-new-cards.png") });
  console.log("SHOT SAVED: menu-new-cards.png");

  console.log(errors.length ? "PAGE ERRORS:\n" + errors.slice(0, 12).join("\n") : "no page errors");
  await browser.close();
} finally {
  child.kill();
}
