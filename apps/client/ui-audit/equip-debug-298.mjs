#!/usr/bin/env node
/**
 * Debug: the endgame fixture's raw JSON has all 13 equipment slots filled (verified by reading
 * fixtures/endgame.json directly: helmet/amulet/mainhand/offhand/body/legs/gloves/boots/cape/
 * ring1/ring2/tool1/tool2 all non-null). But the CharacterPage paperdoll screenshot shows most
 * cells visually blank (no icon, no emoji, no text) — only amulet/offhand/body/legs appeared
 * filled. This script queries the live DOM directly (both on CharacterPage and on the Combat
 * "Ausrüstung" tab, which renders the identical <EquipmentOverview/> component) to get ground
 * truth on which .cs-slot elements have .filled and what's actually inside them, instead of
 * eyeballing screenshots. Port 5209.
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5209;
const BASE_URL = `http://localhost:${PORT}`;

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
  try { await locator.click({ timeout: 6000, ...opts }); }
  catch { await page.waitForTimeout(400); await locator.click({ timeout: 6000, ...opts }); }
}

async function dumpSlots(page, label) {
  const info = await page.evaluate(() => {
    const slots = [...document.querySelectorAll(".cs-slot")];
    return slots.map((el) => {
      const cls = [...el.classList].filter((c) => c !== "cs-slot");
      const img = el.querySelector("img");
      const emptyLabel = el.querySelector(".cs-slot-empty-label");
      return {
        cls,
        filled: el.classList.contains("filled"),
        hasImg: !!img,
        imgSrc: img ? img.getAttribute("src") : null,
        emptyLabel: emptyLabel ? emptyLabel.textContent : null,
        title: el.getAttribute("title"),
        innerText: el.textContent?.trim(),
      };
    });
  });
  console.log(`\n=== ${label} (${info.length} .cs-slot elements) ===`);
  for (const s of info) console.log(JSON.stringify(s));
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

  await page.goto(`${BASE_URL}/?fixture=endgame`, { waitUntil: "load" });
  await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
  await page.waitForTimeout(5200);

  await clickWithReloadRetry(page, page.locator('[data-guide-id="topbar.character"]').first());
  await page.waitForTimeout(600);
  await dumpSlots(page, "CharacterPage");

  await clickWithReloadRetry(page, page.locator('[data-guide-id="sidebar.combat"]').first());
  await page.waitForTimeout(400);
  const zoneCard = page.locator(".zone-card:not(.dungeon-card):not(.slayer-floor-zone-card)").first();
  await clickWithReloadRetry(page, zoneCard);
  await page.waitForTimeout(400);
  const fightBtn = page.locator(".mc-fight-btn:not([disabled])").first();
  await clickWithReloadRetry(page, fightBtn);
  await page.waitForTimeout(600);
  const eqTab = page.locator(".battle-log-tab").nth(1);
  await clickWithReloadRetry(page, eqTab);
  await page.waitForTimeout(500);
  await dumpSlots(page, "Combat Ausruestung tab");

  console.log("\nerrors: " + (errors.length ? errors.slice(0, 20).join("\n") : "none"));
  await browser.close();
} finally {
  child.kill();
}
