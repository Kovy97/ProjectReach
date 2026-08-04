#!/usr/bin/env node
/**
 * Task #305 self-check — Kampf-Transparenz-UI: verifies the new hit-chance prognosis on the
 * monster-select cards (compact "⚔ X% · 🛡 Y%" + verdict badge) and the active-battle fighter
 * stat lines (same two percentages folded into the existing StatLine rows).
 * Port 5208 per Chef instructions. Visits several zones per fixture so all three verdict colors
 * (strong/even/risky) get exercised, and logs the extracted badge text/percentages per card so the
 * distribution can be confirmed without eyeballing pixels.
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = "G:\\GameDev\\apps\\client";
const PORT = 5208;
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

async function clickWithReloadRetry(page, locator, opts = {}) {
  try {
    await locator.click({ timeout: 6000, ...opts });
  } catch {
    await page.waitForTimeout(400);
    await locator.click({ timeout: 6000, ...opts });
  }
}

/** Extracts { name, chances, verdict } for every monster card currently in the grid. */
async function readCards(page) {
  return page.evaluate(() => {
    return Array.from(document.querySelectorAll(".monster-card")).map((card) => {
      const name = card.querySelector(".monster-card-name")?.textContent?.trim() ?? "?";
      const chanceEls = Array.from(card.querySelectorAll(".mc-prognosis-chance"));
      const chances = chanceEls.map((el) => el.textContent?.trim());
      const verdictEl = card.querySelector(".mc-verdict");
      const verdict = verdictEl ? verdictEl.className.replace("mc-verdict ", "") + " (" + verdictEl.textContent?.trim() + ")" : "MISSING";
      return { name, chances, verdict };
    });
  });
}

async function gotoZone(page, nameRegex) {
  // Back to zone grid if we're inside a zone detail already.
  const backBtn = page.locator(".zone-back").first();
  if (await backBtn.isVisible().catch(() => false)) {
    await clickWithReloadRetry(page, backBtn);
    await page.waitForTimeout(400);
  }
  await clickWithReloadRetry(page, page.locator(".zone-card", { hasText: nameRegex }).first());
  await page.waitForTimeout(1200);
}

async function run(browser, fixture) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", (e) => { errors.push("pageerror: " + e.message); });
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });

  await page.goto(`${BASE_URL}/?fixture=${fixture}`, { waitUntil: "load" });
  await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
  await page.waitForTimeout(4500); // let load-toasts clear

  await clickWithReloadRetry(page, page.locator('[data-guide-id="sidebar.combat"]').first());
  await page.waitForTimeout(500);

  // Scan pass (SCAN_ONLY=1) established the verdict distribution per zone/fixture (see script
  // history/report): endgame/pastures = all "strong" (Frühzone), endgame/wildwood = mixed
  // strong+even+risky in ONE grid, endgame/idolhall = all "risky" (matches the task's own example
  // "endgame-Char vs. Frühzone = Stark, vs. Idol-Halle = Riskant"). midgame/blackthorn independently
  // shows all three verdicts in one grid too. Final shot list picks the zones that actually
  // demonstrate all three colors, per fixture.
  const zonesByFixture = {
    midgame: [
      { label: "pastures", regex: /Weiden|Pastures/ },
      { label: "blackthorn", regex: /Schwarzdornwald|Blackthorn/ }, // mixed strong/even/risky
      { label: "idolhall", regex: /Götzenhalle|Idol Hall/ },
    ],
    endgame: [
      { label: "pastures", regex: /Weiden|Pastures/ }, // Frühzone = Stark
      { label: "wildwood", regex: /Wildwald|Wildwood/ }, // mixed strong/even/risky in one grid
      { label: "idolhall", regex: /Götzenhalle|Idol Hall/ }, // Idol-Halle = Riskant
    ],
  };
  const zonesToCheck = zonesByFixture[fixture] ?? zonesByFixture.midgame;

  const SCAN_ONLY = process.env.SCAN_ONLY === "1";

  for (const zone of zonesToCheck) {
    try {
      await gotoZone(page, zone.regex);
      await page.waitForTimeout(SCAN_ONLY ? 500 : 1500); // let any zone-visit toasts clear
      const cards = await readCards(page);
      console.log(`\n[${fixture}/${zone.label}] cards:`);
      for (const c of cards) console.log(`  ${c.name}: ${c.chances.join(" · ")} → ${c.verdict}`);
      if (!SCAN_ONLY) {
        await page.screenshot({ path: join(OUT_DIR, `prognosis-${fixture}-${zone.label}.png`), fullPage: false });
        console.log(`SHOT SAVED: prognosis-${fixture}-${zone.label}.png`);
        const grid = page.locator(".monster-grid").first();
        await grid.screenshot({ path: join(OUT_DIR, `prognosis-${fixture}-${zone.label}-grid.png`) });
        console.log(`SHOT SAVED: prognosis-${fixture}-${zone.label}-grid.png`);
      }
    } catch (e) {
      console.log(`!! zone step failed (${fixture}/${zone.label}): ` + e.message);
    }
  }

  // Active battle: fight the first monster in whichever zone we're currently in (idolhall — last
  // visited above) so the fighter stat-line hit-chance percentages are visible for both sides.
  if (!SCAN_ONLY) {
    try {
      const fightBtn = page.locator(".mc-fight-btn").first();
      await clickWithReloadRetry(page, fightBtn);
      await page.waitForTimeout(2000);
      await page.screenshot({ path: join(OUT_DIR, `prognosis-${fixture}-battle.png`), fullPage: false });
      console.log(`SHOT SAVED: prognosis-${fixture}-battle.png`);
      // Close-ups of both fighter stat lines (the new hitChance entry lives in `.fighter-stats`).
      const statLines = page.locator(".fighter-stats");
      const count = await statLines.count();
      for (let i = 0; i < count; i++) {
        await statLines.nth(i).screenshot({ path: join(OUT_DIR, `prognosis-${fixture}-battle-statline-${i}.png`) });
        console.log(`SHOT SAVED: prognosis-${fixture}-battle-statline-${i}.png`);
      }
    } catch (e) {
      console.log(`!! battle step failed (${fixture}): ` + e.message);
    }
  }

  console.log(`[${fixture}] ` + (errors.length ? `${errors.length} page errors seen:\n` + errors.slice(0, 12).join("\n") : "no page errors"));
  await page.close();
}

const { child, getOutput } = startDevServer();
try {
  const ok = await waitForServer(BASE_URL);
  if (!ok) { console.error("SERVER NOT UP:\n" + getOutput()); process.exit(1); }
  const browser = await chromium.launch();
  await run(browser, "midgame");
  await run(browser, "endgame");
  await browser.close();
} finally {
  child.kill();
}
