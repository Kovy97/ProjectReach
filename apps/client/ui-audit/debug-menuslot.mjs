#!/usr/bin/env node
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const CLIENT_DIR = "G:\\GameDev\\apps\\client";
const PORT = 5257;
const BASE_URL = `http://localhost:${PORT}`;
const OUT_DIR = "C:\\Users\\MSchu\\AppData\\Local\\Temp\\claude\\G--GameDev\\553d2095-3a73-4795-9782-0fe746a25f13\\scratchpad\\t8";

const midgame = readFileSync(join(CLIENT_DIR, "ui-audit", "fixtures", "midgame.json"), "utf8");

function startDevServer() {
  const viteBin = join(CLIENT_DIR, "node_modules", "vite", "bin", "vite.js");
  const child = spawn(process.execPath, [viteBin, "dev", "--config", join(CLIENT_DIR, "ui-audit", "vite.tour.config.mjs"), "--port", String(PORT), "--strictPort"], { cwd: CLIENT_DIR, stdio: ["ignore", "pipe", "pipe"] });
  let out = ""; child.stdout.on("data", d => out += d); child.stderr.on("data", d => out += d);
  return { child, getOutput: () => out };
}
async function waitForServer(url, t = 40000) {
  const s = Date.now();
  while (Date.now() - s < t) { try { const r = await fetch(url); if (r.ok) return true; } catch {} await new Promise(r => setTimeout(r, 300)); }
  return false;
}

const { child, getOutput } = startDevServer();
try {
  const ok = await waitForServer(BASE_URL);
  if (!ok) { console.error("SERVER NOT UP:\n" + getOutput()); process.exit(1); }
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on("pageerror", e => console.log("pageerror:", e.message));
  page.on("console", m => { if (m.type() === "error") console.log("console error:", m.text()); });

  await page.addInitScript((mid) => {
    localStorage.setItem("hearthforge:save:0", mid);
    localStorage.setItem("hearthforge:locale", "de");
  }, midgame);
  await page.goto(BASE_URL, { waitUntil: "load" });
  await page.waitForSelector(".menu-lang", { timeout: 15000 });
  await page.waitForTimeout(600);
  await page.locator(".menu-nav-btn").nth(1).click();
  await page.waitForSelector(".menu-slot", { timeout: 8000 });
  await page.waitForTimeout(500);

  const info = await page.evaluate(() => {
    const els = [...document.querySelectorAll(".menu-slot")];
    return els.map(e => {
      const r = e.getBoundingClientRect();
      return { class: e.className, rect: { x: r.x, y: r.y, w: r.width, h: r.height }, visible: r.width > 0 && r.height > 0, computedDisplay: getComputedStyle(e).display, computedVisibility: getComputedStyle(e).visibility, computedPointerEvents: getComputedStyle(e).pointerEvents, computedOpacity: getComputedStyle(e).opacity };
    });
  });
  console.log("menu-slot info:", JSON.stringify(info, null, 2));

  // What's the topmost element at that point?
  if (info[0]) {
    const cx = info[0].rect.x + info[0].rect.w / 2;
    const cy = info[0].rect.y + info[0].rect.h / 2;
    const topEl = await page.evaluate(([x, y]) => {
      const el = document.elementFromPoint(x, y);
      return el ? { tag: el.tagName, class: el.className } : null;
    }, [cx, cy]);
    console.log("element at center of first menu-slot:", JSON.stringify(topEl));
  }

  await page.screenshot({ path: join(OUT_DIR, "debug-loadpanel.png"), fullPage: false });
  console.log("shot saved");

  try {
    await page.locator(".menu-slot").first().click({ timeout: 5000 });
    console.log("CLICK SUCCEEDED");
  } catch (e) {
    console.log("CLICK FAILED:", e.message);
  }
  await page.waitForTimeout(1000);
  console.log("url after click attempt:", page.url());
  const stillMenu = await page.evaluate(() => !!document.querySelector(".menu-slot"));
  console.log("still on menu (menu-slot present):", stillMenu);
  const inGame = await page.evaluate(() => !!document.querySelector('[data-guide-id^="sidebar."]'));
  console.log("in game now:", inGame);

  await browser.close();
} finally {
  child.kill();
}
