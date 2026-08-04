#!/usr/bin/env node
/**
 * Self-check for two features: (1) zone-card progress row + complete badge (CombatPage.tsx),
 * (2) autosave/manual-save "Gespeichert ✓" sidebar confirmation (Sidebar.tsx + GameContext.tsx).
 * Port 5226 per Chef instructions. Modeled on combat-cards-shot-273.mjs.
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5226;
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

async function clickWithReloadRetry(page, locator, opts = {}) {
  try {
    await locator.click({ timeout: 6000, ...opts });
  } catch {
    await page.waitForTimeout(400);
    await locator.click({ timeout: 6000, ...opts });
  }
}

async function run(browser) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", (e) => { errors.push("pageerror: " + e.message); });
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });

  // ── Zone progress: custom fixture with "pastures" fully cleared + "borderlands" untouched ──
  await page.goto(`${BASE_URL}/?fixture=zoneprogress`, { waitUntil: "load" });
  await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
  await page.waitForTimeout(3500); // let load-toasts clear

  await clickWithReloadRetry(page, page.locator('[data-guide-id="sidebar.combat"]').first());
  await page.waitForTimeout(500);
  await page.waitForSelector(".zone-grid .zone-card");

  await page.screenshot({ path: join(OUT_DIR, "zone-progress-grid.png"), fullPage: false });
  console.log("SHOT SAVED: zone-progress-grid.png");

  // Extract the rendered progress text + complete-badge presence per zone card (DOM proof, not
  // just a screenshot) — matches the task's "DOM-Klassen-Nachweis" ask.
  const cardData = await page.evaluate(() => {
    return Array.from(document.querySelectorAll(".zone-grid .zone-card")).map((el) => ({
      name: el.querySelector(".zone-card-name")?.textContent ?? null,
      progress: el.querySelector(".zone-card-progress")?.textContent ?? null,
      complete: el.classList.contains("zone-card-complete"),
      hasBadge: !!el.querySelector(".zone-card-complete-badge"),
    }));
  });
  console.log("ZONE CARD DATA:\n" + JSON.stringify(cardData, null, 2));

  // Close-up of the completed zone card (should show the gold badge + "complete" progress row).
  try {
    const completeCard = page.locator(".zone-card.zone-card-complete").first();
    await completeCard.scrollIntoViewIfNeeded();
    await completeCard.screenshot({ path: join(OUT_DIR, "zone-progress-complete-card.png") });
    console.log("SHOT SAVED: zone-progress-complete-card.png");
  } catch (e) {
    console.log("!! complete-card closeup failed: " + e.message);
  }

  // Close-up of the untouched "borderlands" zone card (fresh: 0/N kills, 0% drops).
  try {
    const freshCard = page.locator(".zone-grid .zone-card", { hasText: /Borderlands|Grenzland/ }).first();
    await freshCard.scrollIntoViewIfNeeded();
    await freshCard.screenshot({ path: join(OUT_DIR, "zone-progress-fresh-card.png") });
    console.log("SHOT SAVED: zone-progress-fresh-card.png");
  } catch (e) {
    console.log("!! fresh-card closeup failed: " + e.message);
  }

  // ── Autosave/manual-save confirmation: click the sidebar Save button, catch the fade-in state ──
  const saveBtn = page.locator(".sb-footer-save").first();
  await saveBtn.scrollIntoViewIfNeeded();
  await clickWithReloadRetry(page, saveBtn);
  await page.waitForTimeout(150); // catch it while "just-saved" is active (1.5s window)

  const saveState = await page.evaluate(() => {
    const btn = document.querySelector(".sb-footer-save");
    return {
      className: btn?.className ?? null,
      label: btn?.querySelector(".sb-footer-label")?.textContent ?? null,
    };
  });
  console.log("SAVE BUTTON STATE (just after click):\n" + JSON.stringify(saveState, null, 2));

  await saveBtn.screenshot({ path: join(OUT_DIR, "save-confirm-button.png") });
  console.log("SHOT SAVED: save-confirm-button.png");

  // Wider sidebar-footer crop for context.
  try {
    const footer = page.locator(".sb-footer").first();
    await footer.screenshot({ path: join(OUT_DIR, "save-confirm-footer.png") });
    console.log("SHOT SAVED: save-confirm-footer.png");
  } catch (e) {
    console.log("!! footer closeup failed: " + e.message);
  }

  console.log(errors.length ? `${errors.length} page errors seen:\n` + errors.slice(0, 20).join("\n") : "no page errors");
  await page.close();
}

const { child, getOutput } = startDevServer();
try {
  const ok = await waitForServer(BASE_URL);
  if (!ok) { console.error("SERVER NOT UP:\n" + getOutput()); process.exit(1); }
  const browser = await chromium.launch();
  await run(browser);
  await browser.close();
} finally {
  child.kill();
}
