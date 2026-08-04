#!/usr/bin/env node
/**
 * Verifiziert den Showcase-Save (Chef 2026-07-11): injiziert die ECHTE slot-1.json als
 * localStorage-Save, lädt sie über die neue Karten-UI (Klick auf die Karte = Laden) und
 * screenshottet Charakterbogen + Inventar — Sichtprüfung „keine Platzhalter-Icons". Port 5235.
 */
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5235;
const BASE_URL = `http://localhost:${PORT}`;
const OUT_DIR = "C:\\Users\\MSchu\\AppData\\Local\\Temp\\claude\\G--GameDev\\553d2095-3a73-4795-9782-0fe746a25f13\\scratchpad";
const save = readFileSync(join(process.env.APPDATA, "Grim Reach", "saves", "slot-1.json"), "utf8");

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
  await page.locator(".menu-nav-btn").nth(1).click(); // Spiel laden
  await page.waitForTimeout(700);
  await page.screenshot({ path: join(OUT_DIR, "showcase-menu-card.png") });
  console.log("SHOT SAVED: showcase-menu-card.png");
  await page.locator(".menu-slot.filled").first().click(); // Klick auf die KARTE lädt
  await page.waitForTimeout(3500);
  await page.screenshot({ path: join(OUT_DIR, "showcase-after-load-click.png") });
  console.log("SHOT SAVED: showcase-after-load-click.png");
  console.log("STATE:", await page.evaluate(() => ({
    sidebar: !!document.querySelector('[data-guide-id^="sidebar."]'),
    menu: !!document.querySelector(".menu"),
    modals: Array.from(document.querySelectorAll("[class*='popup'],[class*='modal'],[class*='offline']")).map((e) => e.className.toString().slice(0, 40)).slice(0, 6),
  })));
  // Offline-Popup (savedAt liegt Minuten zurück) + evtl. Toasts wegdrücken
  for (let i = 0; i < 3; i++) { await page.keyboard.press("Escape"); await page.waitForTimeout(400); }
  // Charakterbogen (Topbar-Navigation, nicht Sidebar)
  await page.locator('[data-guide-id="topbar.character"]').first().click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: join(OUT_DIR, "showcase-character.png") });
  console.log("SHOT SAVED: showcase-character.png");
  // Platzhalter-Zählung: Item-Zellen ohne <img> (Emoji-Fallback) im Inventar/Equipment
  const placeholder = await page.evaluate(() => {
    const cells = Array.from(document.querySelectorAll(".item-cell"));
    const noImg = cells.filter((c) => !c.querySelector("img"));
    return { cells: cells.length, withoutImg: noImg.length, sample: noImg.slice(0, 5).map((c) => c.textContent?.slice(0, 20)) };
  });
  console.log("ITEM-ZELLEN:", JSON.stringify(placeholder));
  // Shop nach der Purge: leere Kategorien (Essen) dürfen als Chip nicht mehr auftauchen.
  await page.locator('[data-guide-id="topbar.shop"]').first().click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: join(OUT_DIR, "showcase-shop.png") });
  console.log("SHOT SAVED: showcase-shop.png");
  const chips = await page.evaluate(() =>
    Array.from(document.querySelectorAll(".shopv2-chiprow .shopv2-chip, .shopv2-chiprow button")).map((c) => c.textContent?.trim().slice(0, 24)),
  );
  console.log("SHOP-CHIPS:", JSON.stringify(chips));
  console.log(errors.length ? "PAGE ERRORS:\n" + errors.slice(0, 10).join("\n") : "no page errors");
  await browser.close();
} finally { child.kill(); }
