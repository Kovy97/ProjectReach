#!/usr/bin/env node
/**
 * Verifiziert zwei SAVE-58-Sweeps headless (Playwright, kein Electron):
 *   1. BestiaryPage: Kill-Zähler (monsterKills-Selektor, dezentes Badge, dim „—" bei 0 Kills),
 *      Drop-Sammlung (isItemDiscovered statt hasDropSeen — ???-Silhouette + „?"-Overlay bei
 *      unentdeckt, klickbarer discovered Drop → openItemWikiModal), Sammel-Fortschritts-Zeile
 *      ("Entdeckt: n/total Items · Bezwungen: n/total Monster").
 *   2. SlayerPage: Shop-Kauf über buySlayerShopItem statt spendSlayerPoints+addItem — Disabled-
 *      Zustände (level_locked/not_enough_points) UND ein erzwungener no_space-Fehlschlag zeigen
 *      die neuen `slayer.shop.reason.*`-Texte inline (kein Punkte-Verlust bei vollem Inventar).
 * Muster: wiki-audit-shot-309.mjs (headless Vite+Playwright, In-Memory-Fixture-Patch via page.route).
 * Run: node ui-audit/bestiary-slayer-verify.mjs   (from apps/client/)
 */
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const SHOTS_DIR = join(__dirname, "shots-bestiary-slayer");
const PORT = 5218;
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

function loadFixture(name) {
  const raw = readFileSync(join(CLIENT_DIR, `src/renderer/public/ui-audit-fixtures/${name}.json`), "utf-8");
  return JSON.parse(raw);
}

// goblin (borderlands, killed in both fixtures) drops these — mark a SUBSET discovered so the
// bestiary drop row renders a genuine mix of real icons + ???-silhouettes, instead of relying on
// the fixtures' empty discoveredItems (which would render every drop as undiscovered).
const DISCOVER_SUBSET = ["goblin_ear", "crude_bone", "feather"];

async function routeFixture(page, name, patch) {
  const fixture = loadFixture(name);
  patch(fixture);
  await page.route(`**/ui-audit-fixtures/${name}.json`, (route) =>
    route.fulfill({ contentType: "application/json", body: JSON.stringify(fixture) }),
  );
}

async function main() {
  mkdirSync(SHOTS_DIR, { recursive: true });
  console.log(`[bsv] starting dev server on port ${PORT}...`);
  const server = startDevServer();
  if (!(await waitForServer(BASE_URL, 30_000))) {
    console.error("[bsv] dev server did not come up:\n" + server.getOutput());
    server.child.kill();
    process.exitCode = 1;
    return;
  }

  const browser = await chromium.launch();
  let failed = false;
  const check = (label, cond) => {
    console.log(`[bsv] ${cond ? "OK  " : "FAIL"} ${label}`);
    if (!cond) failed = true;
  };

  try {
    // ── 1. Bestiary — midgame & endgame ─────────────────────────────────
    for (const fixtureName of ["midgame", "endgame"]) {
      const page = await browser.newPage({ viewport: { width: 1700, height: 1100 } });
      page.on("pageerror", (err) => console.error(`[bsv] pageerror (${fixtureName}):`, err.message));
      await routeFixture(page, fixtureName, (fixture) => {
        fixture.state.discoveredItems ??= {};
        for (const id of DISCOVER_SUBSET) fixture.state.discoveredItems[id] = true;
      });

      await page.goto(`${BASE_URL}/?fixture=${fixtureName}`, { waitUntil: "load" });
      await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15_000 });
      await page.waitForTimeout(4200); // initial tick/toast batch settles (Muster wiki309)
      await page.locator('[data-guide-id="topbar.bestiary"]').first().click();
      await page.waitForTimeout(600);

      const headerText = (await page.locator(".bestiary-count").first().innerText()).trim();
      console.log(`[bsv] (${fixtureName}) header: "${headerText}"`);
      check(`(${fixtureName}) progress header shows Items + Monster counts`, /\d+\/\d+/.test(headerText) && headerText.includes("·"));

      const killBadgeKnown = await page.locator(".bestiary-kill-badge:not(.dim)").count();
      const killBadgeDim = await page.locator(".bestiary-kill-badge.dim").count();
      check(`(${fixtureName}) known kill badge (⚔ N) present`, killBadgeKnown > 0);
      check(`(${fixtureName}) dimmed 0-kill badge (—) present`, killBadgeDim > 0);

      const mysteryMarks = await page.locator(".bestiary-drop-mystery-mark").count();
      const discoveredDrops = await page.locator(".bestiary-drop:not(.undiscovered)").count();
      check(`(${fixtureName}) undiscovered drop shows "?" overlay`, mysteryMarks > 0);
      check(`(${fixtureName}) discovered drop renders (mix present)`, discoveredDrops > 0);

      await page.screenshot({ path: join(SHOTS_DIR, `bestiary-${fixtureName}.png`), fullPage: true });

      // `.content-body` scrollt INTERN (overflow-y:auto) — fullPage erfasst nur den äußeren
      // Dokument-Umriss, nicht den Scroll-Rest darin. Zusätzlicher Scroll-Schnappschuss zeigt den
      // Rest des Zonen-Grids (u.a. das letzte, noch unbezwungene Monster einer sonst offenen Zone).
      await page.locator(".content-body").evaluate((el) => { el.scrollTop = 900; });
      await page.waitForTimeout(200);
      await page.screenshot({ path: join(SHOTS_DIR, `bestiary-${fixtureName}-scrolled.png`) });
      // Weiter runter: letztes (noch unbezwungenes) Monster der offenen Grenzlande-Zone.
      await page.locator(".content-body").evaluate((el) => { el.scrollTop = 1750; });
      await page.waitForTimeout(200);
      await page.screenshot({ path: join(SHOTS_DIR, `bestiary-${fixtureName}-scrolled2.png`) });
      await page.locator(".content-body").evaluate((el) => { el.scrollTop = 0; });

      // Click a discovered drop → must open the Item Wiki modal directly (openItemWikiModal),
      // not just pin a tooltip (the old ItemChip behaviour this replaces).
      if (discoveredDrops > 0) {
        await page.locator(".bestiary-drop:not(.undiscovered)").first().click();
        await page.waitForTimeout(300);
        const wikiOpen = await page.locator(".iwk-modal").count();
        check(`(${fixtureName}) clicking a discovered drop opens the Item Wiki modal`, wikiOpen > 0);
        await page.screenshot({ path: join(SHOTS_DIR, `bestiary-${fixtureName}-wiki.png`) });
        await page.keyboard.press("Escape");
        await page.waitForTimeout(200);
      }

      await page.close();
    }

    // ── 2. Slayer shop — buySlayerShopItem + reason-driven feedback ─────
    {
      const page = await browser.newPage({ viewport: { width: 1700, height: 1100 } });
      page.on("pageerror", (err) => console.error("[bsv] pageerror (slayer):", err.message));
      await routeFixture(page, "midgame", (fixture) => {
        const s = fixture.state;
        // Enough points for the two cost-12/level-1 entries (plague_mask, slayer_combat_draught),
        // but short of everything else — a realistic "mostly can't afford it yet" shop view.
        s.slayerPoints = 12;
        // Force a genuine no_space failure on click: inventory full (20/20) + autoBank off, so
        // buySlayerShopItem's addItemOrBank has nowhere to put the item (must refund, not lose it).
        s.inventory.slots = Array.from({ length: 20 }, () => ({ itemId: "rusty_sword", qty: 1 }));
        s.settings = { ...(s.settings ?? {}), autoBank: false };
      });

      await page.goto(`${BASE_URL}/?fixture=midgame`, { waitUntil: "load" });
      await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15_000 });
      await page.waitForTimeout(4200);
      await page.locator('[data-guide-id="sidebar.slayer"]').first().click();
      await page.waitForTimeout(600);

      const disabledCount = await page.locator(".slayer-shop-grid .shop-citadel-btn--sm[disabled]").count();
      const enabledBtns = page.locator(".slayer-shop-grid .shop-citadel-btn--sm:not([disabled])");
      const enabledCount = await enabledBtns.count();
      console.log(`[bsv] (slayer) shop buttons: ${enabledCount} enabled / ${disabledCount} disabled`);
      check("(slayer) some entries disabled (level_locked / not_enough_points)", disabledCount > 0);
      check("(slayer) at least one affordable entry (12 pts) enabled", enabledCount > 0);

      await page.screenshot({ path: join(SHOTS_DIR, "slayer-shop-before.png"), fullPage: true });

      const pointsBefore = Number((await page.locator(".slayer-balance-amount").innerText()).trim());
      await enabledBtns.first().click();
      await page.waitForTimeout(400);

      const errorEls = await page.locator(".slayer-shop-error").count();
      check("(slayer) failed no_space purchase shows an inline reason error", errorEls > 0);
      if (errorEls > 0) {
        const errorText = (await page.locator(".slayer-shop-error").first().innerText()).trim();
        console.log(`[bsv] (slayer) error text: "${errorText}"`);
      }
      const pointsAfter = Number((await page.locator(".slayer-balance-amount").innerText()).trim());
      check(`(slayer) points refunded on no_space failure (${pointsBefore} → ${pointsAfter})`, pointsAfter === pointsBefore);

      await page.screenshot({ path: join(SHOTS_DIR, "slayer-shop-error.png"), fullPage: true });
      await page.close();
    }
  } finally {
    await browser.close();
    server.child.kill();
  }

  console.log(failed ? "[bsv] MINDESTENS EIN FAIL" : "[bsv] alle Checks OK");
  process.exitCode = failed ? 1 : 0;
}

main();
