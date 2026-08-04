#!/usr/bin/env node
/**
 * Task #291 self-check: verifies the sidebar drag-to-resize feature (Chef-Feature) with a REAL
 * mouse drag (page.mouse down/move/up on .sb-resize-handle, not a style hack) — default width,
 * dragged to max (~420px, font/icon visibly larger), dragged to the icon-rail collapse (~80px,
 * icons only, full opacity), a reload to confirm the localStorage persistence, and a 1280x720
 * counter-check of the rail mode. Modeled on scale-shot-283.mjs. Port 5201 per Chef instructions.
 *
 * Run: node resize-shot-291.mjs
 * Output: PNGs + console measurements written to the scratchpad dir below.
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5201;
const BASE_URL = `http://localhost:${PORT}`;
const OUT_DIR = "C:\\Users\\MSchu\\AppData\\Local\\Temp\\claude\\G--GameDev\\553d2095-3a73-4795-9782-0fe746a25f13\\scratchpad";

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

/** Echter Drag via page.mouse: mousedown auf dem Handle -> mehrere mousemove-Schritte (Chef-
 *  Vorgabe: kein direktes Setzen der Breite) -> mouseup. targetWidth ist die gewünschte Ziel-
 *  Sidebar-Breite in px; die Funktion liest die aktuelle Breite/Handle-Position selbst aus. */
async function dragSidebarTo(page, targetWidth) {
  const handle = page.locator(".sb-resize-handle");
  const handleBox = await handle.boundingBox();
  const sidebarBox = await page.locator(".sidebar").boundingBox();
  if (!handleBox || !sidebarBox) throw new Error("sidebar/handle not found");

  const startX = handleBox.x + handleBox.width / 2;
  const startY = handleBox.y + handleBox.height / 2;
  const delta = targetWidth - sidebarBox.width;
  const endX = startX + delta;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  // mehrere Zwischenschritte statt eines Sprungs — realistischeres Drag, testet dass mousemove
  // wiederholt greift (nicht nur der finale Wert).
  const steps = 8;
  for (let i = 1; i <= steps; i++) {
    const x = startX + (delta * i) / steps;
    await page.mouse.move(x, startY, { steps: 3 });
    await page.waitForTimeout(20);
  }
  await page.mouse.up();
  await page.waitForTimeout(150);

  const newBox = await page.locator(".sidebar").boundingBox();
  return newBox?.width ?? null;
}

async function run(browser, { width, height, suffix }) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", (e) => { errors.push("pageerror: " + e.message); });
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });

  await page.goto(`${BASE_URL}/?fixture=midgame`, { waitUntil: "load" });
  await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
  await page.waitForTimeout(4500); // let load-toasts clear

  // ── 1. Default width (240px) ──
  const defaultBox = await page.locator(".sidebar").boundingBox();
  console.log(`[${suffix}] default sidebar width: ${defaultBox?.width}`);
  await page.screenshot({ path: join(OUT_DIR, `sb-default-${suffix}.png`), fullPage: false });
  console.log(`SHOT SAVED: sb-default-${suffix}.png`);

  // ── 2. Drag to max (~420px) — real mouse drag ──
  const maxWidth = await dragSidebarTo(page, 420);
  console.log(`[${suffix}] after drag-to-max, sidebar width: ${maxWidth}`);
  const scaleAtMax = await page.locator(".sidebar").evaluate((el) => getComputedStyle(el).getPropertyValue("--sb-scale"));
  console.log(`[${suffix}] --sb-scale at max: ${scaleAtMax}`);
  await page.screenshot({ path: join(OUT_DIR, `sb-max-${suffix}.png`), fullPage: false });
  console.log(`SHOT SAVED: sb-max-${suffix}.png`);

  // ── 3. Drag to icon-rail (~80px) — real mouse drag ──
  const railWidth = await dragSidebarTo(page, 80);
  console.log(`[${suffix}] after drag-to-rail, sidebar width: ${railWidth}`);
  await page.waitForTimeout(200);
  await page.screenshot({ path: join(OUT_DIR, `sb-rail-${suffix}.png`), fullPage: false });
  console.log(`SHOT SAVED: sb-rail-${suffix}.png`);

  // Icon opacity check in rail mode (spec: full opacity, not the normal 0.6 dim).
  const iconOpacity = await page.locator(".sb-skill-icon-wrap").first().evaluate((el) => getComputedStyle(el).opacity);
  console.log(`[${suffix}] icon-wrap opacity in rail mode (expect 1): ${iconOpacity}`);
  const nameVisible = await page.locator(".sb-skill-name").first().evaluate((el) => getComputedStyle(el).display);
  console.log(`[${suffix}] skill-name display in rail mode (expect none): ${nameVisible}`);

  if (suffix === "1920") {
    // ── 4. Reload -> persisted width should come back (only need to verify once, at 1920). ──
    await page.reload({ waitUntil: "load" });
    await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
    await page.waitForTimeout(2500);
    const afterReloadBox = await page.locator(".sidebar").boundingBox();
    console.log(`[${suffix}] sidebar width after reload (expect ~${railWidth}): ${afterReloadBox?.width}`);
    await page.screenshot({ path: join(OUT_DIR, `sb-after-reload-${suffix}.png`), fullPage: false });
    console.log(`SHOT SAVED: sb-after-reload-${suffix}.png`);

    // ── 5. Double-click handle -> reset to default (240px). ──
    const handle = page.locator(".sb-resize-handle");
    await handle.dblclick();
    await page.waitForTimeout(200);
    const afterResetBox = await page.locator(".sidebar").boundingBox();
    console.log(`[${suffix}] sidebar width after double-click reset (expect 240): ${afterResetBox?.width}`);
    await page.screenshot({ path: join(OUT_DIR, `sb-after-reset-${suffix}.png`), fullPage: false });
    console.log(`SHOT SAVED: sb-after-reset-${suffix}.png`);
  }

  console.log(`[${suffix}] ` + (errors.length ? `${errors.length} page errors seen:\n` + errors.slice(0, 12).join("\n") : "no page errors"));
  await page.close();
}

const { child, getOutput } = startDevServer();
try {
  const ok = await waitForServer(BASE_URL);
  if (!ok) { console.error("SERVER NOT UP:\n" + getOutput()); process.exit(1); }
  const browser = await chromium.launch();
  await run(browser, { width: 1920, height: 1080, suffix: "1920" });
  await run(browser, { width: 1280, height: 720, suffix: "1280" });
  await browser.close();
} finally {
  child.kill();
}
