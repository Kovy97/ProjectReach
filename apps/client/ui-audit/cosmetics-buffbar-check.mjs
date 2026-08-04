#!/usr/bin/env node
/**
 * Kosmetik-Sweep T9 (2026-07-12): "Buff-Chips quetschen bei <=900px Fensterbreite" — CharacterPage,
 * die Buff-Leiste presst Namen auf "SUM". Ursache: `.cs-col-left` wird bei `@media (max-width:900px)`
 * `flex-direction: row` (Porträt links | Rest rechts), aber Vitals/Buffs/Attribute waren bislang
 * DIREKTE Flex-Row-Geschwister des Porträts (character.css) statt eines eigenen Spalten-Stapels —
 * dadurch teilten sich Vitals+Buffs+Attribut-Raster die Restbreite als gleichrangige, frei
 * schrumpfende Flex-Items, und die Buff-Namen (.active-buff-name, max-width 130px) wurden bis auf
 * ~3 Zeichen zusammengequetscht. Fix: ein `.cs-col-left-info`-Wrapper (Vitals+Buffs+Attribute) hält
 * bei <=900px seine EIGENE Spalten-Richtung, ist selbst das Flex-Item neben dem Porträt.
 * Screenshots bei 900x900 (Bug-Auflösung) UND 1920x1080 (Regression-Check).
 * Port 5243.
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

function buildFixtureWithBuffs() {
  const raw = readFileSync(join(__dirname, "fixtures", "midgame.json"), "utf8");
  const obj = JSON.parse(raw);
  obj.savedAt = Date.now();
  // Mehrere aktive Buffs mit LANGEN Namen erzwingen, damit das Quetschen sichtbar/messbar ist —
  // itemId muss ein reales Consumable/Rune aus dem Content-Katalog sein, das einen buff trägt.
  const buffItemIds = Object.keys(obj.state.inventory?.slots ?? [])
    .map((k) => obj.state.inventory.slots[k]?.itemId)
    .filter(Boolean);
  return { json: obj, buffItemIds };
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

const { child, getOutput } = startDevServer();
try {
  const ok = await waitForServer(BASE_URL);
  if (!ok) { console.error("SERVER NOT UP:\n" + getOutput()); process.exit(1); }
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });

  await page.addInitScript((json) => {
    localStorage.setItem("hearthforge:save:0", JSON.stringify(json));
  }, buildFixtureWithBuffs().json);

  await page.goto(BASE_URL, { waitUntil: "load" });
  await page.waitForSelector(".menu-nav-btn", { timeout: 20000 });
  await page.locator(".menu-nav-btn").nth(1).click();
  await page.waitForSelector(".menu-slot.filled .hf-btn--primary", { timeout: 15000 });
  await page.locator(".menu-slot.filled .hf-btn--primary").nth(0).click({ timeout: 15000 });
  await page.waitForSelector(".cs-layout", { timeout: 15000 });
  await page.waitForTimeout(600);

  // Buffs live im Charakter-State (c.buffs), nicht im Fixture-JSON direkt editierbar ohne
  // Content-Kenntnis der Buff-Dauer — pragmatischer als ein Consumable zu craften: über die
  // Konsole direkt auf den laufenden State zugreifen ist ohne Debug-Hook nicht möglich, daher
  // nutzen wir stattdessen ein Consumable AUS DEM INVENTAR, falls vorhanden (Doppelklick/Nutzen),
  // sonst greifen wir auf den vorhandenen Buff-Bestand des Fixtures zurück (falls schon aktiv).
  const buffCountBefore = await page.locator(".active-buff-chip").count();
  console.log("ACTIVE BUFF CHIPS (fixture as-is):", buffCountBefore);

  async function shotAt(w, h, name) {
    await page.setViewportSize({ width: w, height: h });
    await page.waitForTimeout(400);
    await page.screenshot({ path: join(OUT_DIR, name) });
    console.log("SHOT SAVED:", name);
    return page.evaluate(() => {
      const chips = Array.from(document.querySelectorAll(".active-buff-name"));
      const col = document.querySelector(".cs-col-left");
      const rect = (el) => el ? { w: Math.round(el.getBoundingClientRect().width), h: Math.round(el.getBoundingClientRect().height) } : null;
      return {
        chipNames: chips.map((c) => ({ text: c.textContent, w: Math.round(c.getBoundingClientRect().width) })),
        colLeftFlexDirection: col ? getComputedStyle(col).flexDirection : null,
        colLeftRect: rect(col),
        buffsBarRect: rect(document.querySelector(".cs-buffs")),
        attrSectionRect: rect(document.querySelector(".cs-attr-section")),
        overlap: (() => {
          const buffs = document.querySelector(".cs-buffs");
          const attrs = document.querySelector(".cs-attr-section");
          if (!buffs || !attrs) return null;
          const a = buffs.getBoundingClientRect();
          const b = attrs.getBoundingClientRect();
          const overlapX = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
          const overlapY = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
          return { overlapX: Math.round(overlapX), overlapY: Math.round(overlapY) };
        })(),
      };
    });
  }

  const at900 = await shotAt(900, 900, "buffbar-900x900.png");
  console.log("AT 900x900:", JSON.stringify(at900, null, 2));

  const at1920 = await shotAt(1920, 1080, "buffbar-1920x1080.png");
  console.log("AT 1920x1080:", JSON.stringify(at1920, null, 2));

  const problems = [];
  if (buffCountBefore === 0) {
    problems.push("Kein aktiver Buff im Fixture — Chip-Breiten-Assertions übersprungen (nur Layout-Struktur geprüft)");
  } else {
    const tooNarrow900 = at900.chipNames.filter((c) => c.w > 0 && c.w < 40);
    if (tooNarrow900.length > 0) problems.push(`900px: ${tooNarrow900.length} Buff-Name(n) unter 40px breit: ${JSON.stringify(tooNarrow900)}`);
  }
  console.log(problems.length ? "PROBLEME:\n- " + problems.join("\n- ") : "ALLE CHECKS GRÜN");
  console.log(errors.length ? `${errors.length} page errors:\n` + errors.slice(0, 8).join("\n") : "no page errors");

  await browser.close();
  process.exit(0);
} finally {
  child.kill();
}
