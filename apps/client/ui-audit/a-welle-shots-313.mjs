#!/usr/bin/env node
/**
 * UI-Brainstorm A-Welle (Task #313, Chef-GO 2026-07-24) — headless verification shots for the
 * visually-checkable fixes: A2 (.ds-close-button on ItemWikiModal), A3 (modal fade+scale-in, burst
 * of frames right after trigger), A5 (.zone-card 9-slice wooden frame), A8 (zone/monster search).
 * Pattern copied from combat-cards-shot-273.mjs / wiki-audit-shot-309.mjs (vite dev + Playwright,
 * NOT `pnpm dev`/Electron — headless-only per UI-Dev hard rule).
 * Run: node ui-audit/a-welle-shots-313.mjs   (from apps/client/)
 */
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5301;
const BASE_URL = `http://localhost:${PORT}`;
const OUT_DIR = "C:\\Users\\MSchu\\AppData\\Local\\Temp\\claude\\G--GameDev\\553d2095-3a73-4795-9782-0fe746a25f13\\scratchpad\\a-welle-shots";

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

async function waitForServer(url, timeoutMs = 30_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  console.log(`[a313] starting dev server on port ${PORT}...`);
  const server = startDevServer();
  if (!(await waitForServer(BASE_URL))) {
    console.error("[a313] dev server did not come up:\n" + server.getOutput());
    server.child.kill();
    process.exitCode = 1;
    return;
  }

  const browser = await chromium.launch();
  let failed = false;
  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
    const errors = [];
    page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
    page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });

    await page.goto(`${BASE_URL}/?fixture=midgame`, { waitUntil: "load" });
    await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
    await page.waitForTimeout(4500); // let load-toasts clear

    // ── A5 + A8: Combat zone select ──────────────────────────────────────────
    await page.locator('[data-guide-id="sidebar.combat"]').first().click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: join(OUT_DIR, "a5-zonecard-overview.png"), fullPage: false });
    console.log("SHOT SAVED: a5-zonecard-overview.png");

    const zoneGrid = page.locator(".zone-grid").first();
    await zoneGrid.screenshot({ path: join(OUT_DIR, "a5-zonecard-grid-closeup.png") });
    console.log("SHOT SAVED: a5-zonecard-grid-closeup.png");

    const searchInput = page.locator(".zone-search-bar input").first();
    await searchInput.waitFor({ state: "visible", timeout: 5000 });
    const totalCardsBefore = await page.locator(".zone-grid .zone-card").count();

    // A common vowel — near-guaranteed partial match against SOME zone/monster name in any locale,
    // demonstrates the filter narrowing the list without needing to know exact content strings.
    await searchInput.fill("a");
    await page.waitForTimeout(250);
    const totalCardsFiltered = await page.locator(".zone-grid .zone-card").count();
    await page.screenshot({ path: join(OUT_DIR, "a8-zonesearch-filtered.png"), fullPage: false });
    console.log(`SHOT SAVED: a8-zonesearch-filtered.png (cards: ${totalCardsBefore} → ${totalCardsFiltered})`);

    // Garbage query — demonstrates the "no results" empty state.
    await searchInput.fill("zzzqqqxxx999");
    await page.waitForTimeout(250);
    await page.screenshot({ path: join(OUT_DIR, "a8-zonesearch-noresults.png"), fullPage: false });
    console.log("SHOT SAVED: a8-zonesearch-noresults.png");
    await searchInput.fill("");
    await page.waitForTimeout(200);

    if (totalCardsFiltered >= totalCardsBefore || totalCardsFiltered === 0) {
      console.log(`!! A8 sanity check unexpected: before=${totalCardsBefore} filtered=${totalCardsFiltered}`);
      failed = true;
    }

    // ── A2 + A3: ItemWikiModal close button + entrance animation burst ──────
    await page.locator('[data-guide-id="topbar.character"]').first().click();
    await page.waitForTimeout(500);
    const invCell = page.locator(".cs-inv-grid .cs-inv-slot-wrap .item-cell").first();
    await invCell.click();
    await page.waitForTimeout(300);
    const wikiBtn = page.locator(".itip-wiki-btn").first();
    if (await wikiBtn.count()) {
      const clickPromise = wikiBtn.click();
      // Burst right after the click resolves — approximates a frame series across the ~200ms
      // fade+scale-in (headless timing is best-effort, not vsync-locked, but shows the progression).
      await clickPromise;
      await page.screenshot({ path: join(OUT_DIR, "a3-modal-frame1-immediate.png"), fullPage: false });
      await page.waitForTimeout(80);
      await page.screenshot({ path: join(OUT_DIR, "a3-modal-frame2-mid.png"), fullPage: false });
      await page.waitForTimeout(300);
      await page.screenshot({ path: join(OUT_DIR, "a3-modal-frame3-settled.png"), fullPage: false });
      console.log("SHOT SAVED: a3-modal-frame1/2/3 (fade+scale-in burst)");

      // A2 close-up on the close button itself (top-right of the modal).
      const modal = page.locator(".modal.iwk-modal").first();
      if (await modal.count()) {
        const box = await modal.boundingBox();
        if (box) {
          await page.screenshot({
            path: join(OUT_DIR, "a2-closebutton-closeup.png"),
            clip: { x: box.x + box.width - 90, y: box.y, width: 90, height: 70 },
          });
          console.log("SHOT SAVED: a2-closebutton-closeup.png");
        }
      }
      await page.keyboard.press("Escape");
    } else {
      console.log("!! no .itip-wiki-btn found — inventory slot 0 may be empty in this fixture");
      failed = true;
    }

    console.log(errors.length ? `${errors.length} page errors:\n` + errors.slice(0, 12).join("\n") : "no page errors");
  } finally {
    await browser.close();
    server.child.kill();
  }
  console.log(failed ? "[a313] MINDESTENS EIN SANITY-CHECK FAIL" : "[a313] alle Sanity-Checks OK");
  process.exitCode = failed ? 1 : 0;
}

main();
