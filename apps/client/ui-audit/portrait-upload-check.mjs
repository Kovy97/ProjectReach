#!/usr/bin/env node
/**
 * Chef 2026-07-11 — verifiziert (1) Custom-Portrait-Upload (Character-Screen + Erstellung,
 * Button oben rechts; echter Upload via Playwright-filechooser → character.portrait wird
 * Data-URL) und (2) den Tooltip-Hover-Schärfe-Fix (Downscale-Trick: itip-img in Zielgröße
 * gelayoutet). Port 5236.
 */
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5236;
const BASE_URL = `http://localhost:${PORT}`;
const OUT_DIR = "C:\\Users\\MSchu\\AppData\\Local\\Temp\\claude\\G--GameDev\\553d2095-3a73-4795-9782-0fe746a25f13\\scratchpad";
const save = readFileSync(join(process.env.APPDATA, "Grim Reach", "saves", "slot-1.json"), "utf8");
// Irgendein echtes Bild als Upload-Testdatei: ein vorhandenes Portrait-PNG.
const TEST_IMAGE = join(CLIENT_DIR, "src", "renderer", "assets", "portraits", "char_1.png");

const viteBin = join(CLIENT_DIR, "node_modules", "vite", "bin", "vite.js");
const child = spawn(process.execPath, [viteBin, "dev", "--config", join(__dirname, "vite.tour.config.mjs"), "--port", String(PORT), "--strictPort"], { cwd: CLIENT_DIR, stdio: ["ignore", "ignore", "ignore"] });
try {
  const s = Date.now();
  while (Date.now() - s < 40000) { try { const r = await fetch(BASE_URL); if (r.ok) break; } catch {} await new Promise((r) => setTimeout(r, 300)); }
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });

  await page.addInitScript((json) => localStorage.setItem("hearthforge:save:0", json), save);
  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(1800);

  // ── (a) Erstellung: Upload-Button oben rechts im Porträt-Rahmen ──
  await page.locator(".menu-nav-btn").nth(0).click(); // Neues Spiel
  await page.waitForTimeout(600);
  await page.locator(".menu-slot--empty .hf-btn--primary").first().click(); // leerer Slot → Neu
  await page.waitForTimeout(1200);
  const creationBtn = await page.locator(".creation-portrait-upload-btn").count();
  console.log("CREATION-UPLOAD-BTN:", creationBtn);
  // Upload durchspielen: verstecktes input direkt befüllen (löst Reacts onChange aus)
  await page.locator('.creation-portrait-frame input[type="file"]').setInputFiles(TEST_IMAGE);
  await page.waitForTimeout(1500);
  const creationPreview = await page.evaluate(() => document.querySelector(".showcase-img")?.getAttribute("src")?.slice(0, 22));
  console.log("CREATION-PREVIEW-SRC:", creationPreview);
  await page.locator(".creation-portrait-frame").screenshot({ path: join(OUT_DIR, "portrait-upload-creation.png") });
  console.log("SHOT SAVED: portrait-upload-creation.png");
  await page.locator(".creation-back").click(); // zurück ins Menü
  await page.waitForTimeout(800);

  // ── (b) Character-Screen: Button + Upload + (c) Tooltip-Schärfe ──
  await page.locator(".menu-nav-btn").nth(1).click(); // Spiel laden
  await page.waitForTimeout(600);
  await page.locator(".menu-slot.filled").first().click();
  await page.waitForTimeout(3000);
  // Offline-/Welcome-Back-Popup (savedAt liegt inzwischen Stunden zurück) wegdrücken.
  for (let i = 0; i < 2; i++) { await page.keyboard.press("Escape"); await page.waitForTimeout(400); }
  await page.locator('[data-guide-id="topbar.character"]').first().click();
  await page.waitForTimeout(1000);
  await page.locator('.cs-portrait-wrap input[type="file"]').setInputFiles(TEST_IMAGE);
  await page.waitForTimeout(1500);
  const charSrc = await page.evaluate(() => document.querySelector(".cs-portrait-img")?.getAttribute("src")?.slice(0, 22));
  console.log("CHAR-PORTRAIT-SRC:", charSrc);
  await page.locator(".cs-portrait-wrap").screenshot({ path: join(OUT_DIR, "portrait-upload-char.png") });
  console.log("SHOT SAVED: portrait-upload-char.png");

  // (c) Tooltip-Hover-Zoom: Equipment-Zelle hovern → Tooltip; dann aufs Bild → Zoom-Zustand.
  const cellCount = await page.locator(".item-cell").count();
  const equipCell = page.locator(".item-cell").first();
  await equipCell.hover();
  await page.waitForTimeout(1400);
  console.log("TOOLTIP-DEBUG:", JSON.stringify(await page.evaluate(() => ({
    cells: document.querySelectorAll(".item-cell").length,
    tooltip: !!document.querySelector(".item-tooltip"),
    itipImg: document.querySelectorAll(".itip-img").length,
    tiltWrap: document.querySelectorAll(".itip-tilt-wrap").length,
  }))), "cellCount:", cellCount);
  const img = page.locator(".itip-img").first();
  if (await img.count()) {
    // Ruhe-Metriken: Layout-Größe muss ~2.1× der sichtbaren sein (Downscale-Trick aktiv).
    const rest = await page.evaluate(() => {
      const el = document.querySelector(".itip-img");
      const r = el.getBoundingClientRect();
      return { layoutW: el.offsetWidth, visW: Math.round(r.width), natural: el.naturalWidth + "x" + el.naturalHeight };
    });
    console.log("REST-METRICS:", JSON.stringify(rest));
    // Linksklick PINNT das Tooltip (ItemTooltip-Mechanik) → es überlebt das Verlassen der Zelle.
    await equipCell.click();
    await page.waitForTimeout(400);
    const box = await img.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 10 });
    await page.waitForTimeout(500);
    const zoom = await page.evaluate(() => {
      const el = document.querySelector(".itip-img");
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { visW: Math.round(r.width), transform: el.style.transform.slice(0, 70) };
    });
    console.log("ZOOM-METRICS:", JSON.stringify(zoom));
    await page.screenshot({ path: join(OUT_DIR, "tooltip-zoom-sharp.png"), clip: { x: 300, y: 100, width: 1100, height: 900 } });
    console.log("SHOT SAVED: tooltip-zoom-sharp.png");
    // Set-Bonus-Sektion (WoW-Stil, Chef Bild #68): direkt aus dem noch gepinnten Tooltip lesen.
    const setInfo = await page.evaluate(() => {
      const el = document.querySelector(".itip-set");
      return el ? { text: el.textContent?.slice(0, 120), active: el.className.includes("active") } : null;
    });
    console.log("SET-SECTION:", JSON.stringify(setInfo));
    const tipEl = page.locator(".item-tooltip").first();
    if (await tipEl.count()) {
      await tipEl.screenshot({ path: join(OUT_DIR, "tooltip-set-bonus.png") });
      console.log("SHOT SAVED: tooltip-set-bonus.png");
    }
  } else {
    console.log("!! kein .itip-img gefunden (Tooltip nicht offen?)");
  }

  console.log(errors.length ? "PAGE ERRORS:\n" + errors.slice(0, 10).join("\n") : "no page errors");
  await browser.close();
} finally { child.kill(); }
