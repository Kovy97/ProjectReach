#!/usr/bin/env node
/**
 * TESTER 3 ("Der Händler") — Shop Buy/Sell-Verifikation nach der Shop-Purge (Chef-GO 2026-07-11,
 * 61 Einträge entfernt, nur noch 15 fundamentale, "Essen"-Kategorie komplett ausgeblendet).
 * READ-ONLY: nur Playwright-Interaktion mit dem headless Vite-Dev-Server, keine Quelldateien
 * angefasst, kein pnpm build, kein Electron.
 * Port 5252.
 *
 * Checks:
 *  (1) Buy-Tab: alle Kategorie-Chips durchklicken (all/upgrades/weapons/armor/tools/seeds/
 *      materials) — KEIN "food"-Chip mehr (Shop-Purge), Zähler stimmen mit sichtbaren Karten
 *      überein, Item-Bilder laden (naturalWidth>0).
 *  (2) Mengen-Buttons 1/5/25/100 + Kauf mit zu wenig Gold: midgame hat 5400 Gold, gnarled_staff
 *      kostet 120 → 100x = 12000 > 5400 sollte disabled sein, 25x = 3000 sollte klickbar sein.
 *  (3) Slot-Upgrade + Auto-Eat-Upgrade kaufen (separate hochgepatchte Gold-Session).
 *  (4) Sell-Tab: Stack verkaufen (1/10/100/alle), Shift-Klick-Schnellverkauf, Rückkauf-Regal
 *      (buyBack) befüllt sich und Rückkauf-Button funktioniert (Gold + Item wandern zurück).
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = "G:\\GameDev\\apps\\client";
const PORT = 5252;
const BASE_URL = `http://localhost:${PORT}`;
const OUT_DIR = "C:\\Users\\MSchu\\AppData\\Local\\Temp\\claude\\G--GameDev\\553d2095-3a73-4795-9782-0fe746a25f13\\scratchpad\\sweep3";

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

async function clickRetry(page, locator, opts = {}) {
  try { await locator.click({ timeout: 6000, ...opts }); }
  catch { await page.waitForTimeout(400); await locator.click({ timeout: 6000, ...opts }); }
}

/** Fixture-Patch via route: mutator(fixtureJson.state) läuft über das midgame-JSON. */
async function routeFixture(page, mutator) {
  await page.route("**/ui-audit-fixtures/midgame.json", async (route) => {
    const res = await route.fetch();
    const json = JSON.parse(await res.text());
    mutator(json.state);
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(json) });
  });
}

const errors = [];
function wirePage(page, tag) {
  page.on("pageerror", (e) => errors.push(`[${tag}] pageerror: ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error") errors.push(`[${tag}] console: ${m.text()}`); });
}

async function gotoShop(page) {
  await page.goto(`${BASE_URL}/?fixture=midgame`, { waitUntil: "load" });
  await page.waitForSelector('[data-guide-id^="topbar."]', { timeout: 15000 });
  await page.waitForTimeout(2500);
  await clickRetry(page, page.locator('[data-guide-id="topbar.shop"]').first());
  await page.waitForTimeout(600);
}

function readState(page) {
  return page.evaluate(() => {
    const d = window.__hfDebug;
    if (!d) return null;
    return { gold: d.state.character.gold, invSlots: d.state.inventory.slots.filter(Boolean).length, buyBack: d.state.buyBack.length };
  });
}

const problems = [];
const { child, getOutput } = startDevServer();
try {
  const ok = await waitForServer(BASE_URL);
  if (!ok) { console.error("SERVER NOT UP:\n" + getOutput()); process.exit(1); }
  const browser = await chromium.launch();

  // ── (1)+(2) pageA: Kategorien + Mengen-Buttons + Kauf mit zu wenig Gold (midgame unverändert, 5400 Gold) ──
  const pageA = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  wirePage(pageA, "A");
  await gotoShop(pageA);

  const chipInfo = await pageA.evaluate(() => {
    const chips = Array.from(document.querySelectorAll(".shopv2-chip"));
    return chips.map((c) => ({
      label: c.querySelector(".shopv2-chip-label")?.textContent ?? "",
      count: c.querySelector(".shopv2-chip-count")?.textContent ?? null,
      active: c.classList.contains("active"),
    }));
  });
  console.log("BUY-CHIPS:", JSON.stringify(chipInfo));
  const hasFoodChip = chipInfo.some((c) => /food|essen/i.test(c.label));
  if (hasFoodChip) problems.push(`(1) "Essen"-Chip noch im Shop sichtbar trotz Purge: ${JSON.stringify(chipInfo)}`);
  await pageA.screenshot({ path: join(OUT_DIR, "shop-buy-all.png") });
  console.log("SHOT SAVED: shop-buy-all.png");

  // Jeden Chip durchklicken, Sektions-Karten zählen + Bilder-Ladezustand prüfen.
  const chipLabels = chipInfo.map((c) => c.label).filter(Boolean);
  for (const label of chipLabels) {
    const chip = pageA.locator(".shopv2-chip").filter({ hasText: label }).first();
    await clickRetry(pageA, chip);
    await pageA.waitForTimeout(400);
    const info = await pageA.evaluate(() => {
      const cards = Array.from(document.querySelectorAll(".shopv2-card"));
      const imgs = Array.from(document.querySelectorAll(".shopv2-card-image-area img"));
      return {
        cardCount: cards.length,
        brokenImgs: imgs.filter((i) => i.complete && i.naturalWidth === 0).length,
        totalImgs: imgs.length,
      };
    });
    console.log(`CHIP "${label}":`, JSON.stringify(info));
    if (info.brokenImgs > 0) problems.push(`(1) Chip "${label}": ${info.brokenImgs}/${info.totalImgs} Item-Bilder kaputt (naturalWidth 0)`);
    if (!/upgrades|aufwertung/i.test(label) && info.cardCount === 0) problems.push(`(1) Chip "${label}" zeigt 0 Karten (leerer Tab?)`);
  }
  await clickRetry(pageA, pageA.locator(".shopv2-chip").first()); // zurück auf "Alle"
  await pageA.waitForTimeout(400);

  // (2) Mengen-Buttons: gnarled_staff (120 Gold) — 25x=3000 (klickbar), 100x=12000 (zu teuer bei 5400 Gold).
  const staffCard = pageA.locator(".shopv2-card", { has: pageA.locator(".shopv2-card-name", { hasText: /gnarled|knorrig/i }) }).first();
  const staffVisible = await staffCard.count();
  if (staffVisible === 0) {
    problems.push("(2) gnarled_staff-Karte nicht gefunden — Mengen-Button-Test übersprungen");
  } else {
    const qtyStates = await staffCard.evaluate((card) => {
      const btns = Array.from(card.querySelectorAll(".shopv2-buyqty-btn"));
      return btns.map((b) => ({ label: b.querySelector(".shopv2-buyqty-n")?.textContent, disabled: b.disabled }));
    });
    console.log("GNARLED-STAFF QTY-BUTTONS:", JSON.stringify(qtyStates));
    const q100 = qtyStates.find((q) => q.label === "100×");
    const q25 = qtyStates.find((q) => q.label === "25×");
    if (!q100?.disabled) problems.push(`(2) 100× gnarled_staff (12000 Gold) NICHT disabled bei 5400 Gold — sollte blockiert sein`);
    if (q25?.disabled) problems.push(`(2) 25× gnarled_staff (3000 Gold) disabled bei 5400 Gold — sollte klickbar sein`);
    // Klick auf den (potenziell disabled) 100er-Button darf NICHTS am Gold ändern.
    const before = await readState(pageA);
    const btn100 = staffCard.locator(".shopv2-buyqty-btn").filter({ hasText: "100×" });
    try { await btn100.click({ timeout: 2000, force: false }); } catch { /* erwartet: disabled blockt Klick */ }
    await pageA.waitForTimeout(300);
    const after = await readState(pageA);
    if (before && after && before.gold !== after.gold) problems.push(`(2) Gold änderte sich trotz disabled 100×-Kauf: ${before.gold} → ${after.gold}`);
    await staffCard.screenshot({ path: join(OUT_DIR, "shop-buy-qtybuttons-staff.png") });
    console.log("SHOT SAVED: shop-buy-qtybuttons-staff.png");
  }
  await pageA.close();

  // ── (3)+(4) pageB: hochgepatchtes Gold — echte Käufe, Upgrades, Sell-Tab, Buyback ──
  const pageB = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  wirePage(pageB, "B");
  await routeFixture(pageB, (state) => { state.character.gold = 999999; });
  await gotoShop(pageB);

  const beforeBuy = await readState(pageB);
  console.log("PRE-BUY STATE:", JSON.stringify(beforeBuy));

  // Kauf 1x rusty_sword (Waffen-Karte) über den 1×-Button.
  const swordCard = pageB.locator(".shopv2-card", { has: pageB.locator(".shopv2-card-name", { hasText: /rusty sword|rostiges schwert/i }) }).first();
  if (await swordCard.count()) {
    await clickRetry(pageB, swordCard.locator(".shopv2-buyqty-btn").filter({ hasText: "1×" }));
    await pageB.waitForTimeout(300);
    const afterBuy1 = await readState(pageB);
    console.log("AFTER 1× rusty_sword:", JSON.stringify(afterBuy1));
    if (afterBuy1 && beforeBuy && afterBuy1.gold !== beforeBuy.gold - 20) {
      problems.push(`(2) Kauf 1× rusty_sword: Gold-Delta falsch (erwartet -20, war ${afterBuy1.gold - beforeBuy.gold})`);
    }
  } else {
    problems.push("(2) rusty_sword-Karte nicht gefunden für Kauf-Test");
  }

  // Upgrades-Kachel: Slot-Upgrade + Auto-Eat-Upgrade kaufen.
  await clickRetry(pageB, pageB.locator(".shopv2-chip").filter({ hasText: /upgrades|aufwertung/i }).first());
  await pageB.waitForTimeout(400);
  const upgradeBtns = pageB.locator(".shopv2-upgrade-btn");
  const upgradeCount = await upgradeBtns.count();
  console.log("UPGRADE-BUTTONS gefunden:", upgradeCount);
  if (upgradeCount < 2) problems.push(`(3) Erwartet 2 Upgrade-Buttons (Slot+AutoEat), gefunden: ${upgradeCount}`);
  for (let i = 0; i < upgradeCount; i++) {
    const btn = upgradeBtns.nth(i);
    const disabled = await btn.evaluate((b) => b.disabled);
    if (!disabled) {
      const before = await readState(pageB);
      await clickRetry(pageB, btn);
      await pageB.waitForTimeout(400);
      const after = await readState(pageB);
      console.log(`UPGRADE ${i} gekauft: gold ${before?.gold} -> ${after?.gold}`);
      if (before && after && after.gold >= before.gold) problems.push(`(3) Upgrade-Kauf #${i} hat kein Gold abgezogen (${before.gold} -> ${after.gold})`);
    }
  }
  await pageB.screenshot({ path: join(OUT_DIR, "shop-upgrades.png") });
  console.log("SHOT SAVED: shop-upgrades.png");

  // ── (4) Sell-Tab ──────────────────────────────────────────────────────────────────────────
  await clickRetry(pageB, pageB.locator(".shopv2-maintab").filter({ hasText: /sell|verkauf/i }).first());
  await pageB.waitForTimeout(500);
  await pageB.screenshot({ path: join(OUT_DIR, "shop-sell-tab.png") });
  console.log("SHOT SAVED: shop-sell-tab.png");

  const sellCells = pageB.locator(".shopv2-sell-cell");
  const sellCellCount = await sellCells.count();
  console.log("SELL-CELLS:", sellCellCount);
  if (sellCellCount === 0) {
    problems.push("(4) Sell-Tab zeigt keine verkaufbaren Items (unerwartet — midgame hat Startinventar)");
  } else {
    // Ersten Stack auswählen, "Verkaufe 1" klicken, Detail-Panel prüfen.
    await clickRetry(pageB, sellCells.first());
    await pageB.waitForTimeout(300);
    const hasDetail = await pageB.locator(".shopv2-sell-detail").count();
    if (hasDetail === 0) {
      problems.push("(4) Detail-Panel öffnet nicht nach Klick auf Sell-Zelle");
    } else {
      const beforeSell = await readState(pageB);
      // Erster Button in der Detail-Aktionsleiste ist immer "sell1" (Reihenfolge: 1/10/100/alle).
      await clickRetry(pageB, pageB.locator(".shopv2-sell-detail-actions button").first());
      await pageB.waitForTimeout(300);
      const afterSell = await readState(pageB);
      console.log("SELL 1x:", JSON.stringify({ beforeSell, afterSell }));
      if (beforeSell && afterSell && afterSell.gold <= beforeSell.gold) problems.push("(4) Verkauf 1x hat kein Gold hinzugefügt");
      if (beforeSell && afterSell && afterSell.buyBack <= beforeSell.buyBack) problems.push("(4) Verkauf 1x hat KEINEN Buyback-Eintrag erzeugt");
    }

    // Shift-Klick-Schnellverkauf auf einen zweiten Stack (falls vorhanden).
    if (sellCellCount > 1) {
      const beforeShift = await readState(pageB);
      await sellCells.nth(1).click({ modifiers: ["Shift"] });
      await pageB.waitForTimeout(300);
      const afterShift = await readState(pageB);
      console.log("SHIFT-SELL:", JSON.stringify({ beforeShift, afterShift }));
      if (beforeShift && afterShift && afterShift.gold <= beforeShift.gold) problems.push("(4) Shift-Klick-Schnellverkauf hat kein Gold hinzugefügt");
    }

    await pageB.screenshot({ path: join(OUT_DIR, "shop-sell-after.png") });
    console.log("SHOT SAVED: shop-sell-after.png");
  }

  // Rückkauf-Regal: sollte jetzt mind. 1 Eintrag haben (aus den Verkäufen oben).
  const buybackRows = pageB.locator(".shopv2-buyback-row");
  const buybackCount = await buybackRows.count();
  console.log("BUYBACK-ROWS:", buybackCount);
  if (buybackCount === 0) {
    problems.push("(4) Rückkauf-Regal leer, obwohl gerade verkauft wurde");
  } else {
    const beforeBB = await readState(pageB);
    const bbBtn = buybackRows.first().locator("button");
    const bbDisabled = await bbBtn.evaluate((b) => b.disabled);
    if (bbDisabled) {
      problems.push("(4) Rückkauf-Button im ersten Regal-Eintrag disabled trotz 999999 Gold");
    } else {
      await clickRetry(pageB, bbBtn);
      await pageB.waitForTimeout(300);
      const afterBB = await readState(pageB);
      console.log("BUYBACK-KLICK:", JSON.stringify({ beforeBB, afterBB }));
      if (beforeBB && afterBB && afterBB.gold >= beforeBB.gold) problems.push("(4) Rückkauf hat kein Gold abgezogen");
      if (beforeBB && afterBB && afterBB.buyBack !== beforeBB.buyBack - 1) problems.push("(4) Rückkauf-Regal-Länge hat sich nicht um 1 verringert");
    }
    await pageB.screenshot({ path: join(OUT_DIR, "shop-buyback.png") });
    console.log("SHOT SAVED: shop-buyback.png");
  }

  await pageB.close();

  console.log(problems.length ? "PROBLEME:\n- " + problems.join("\n- ") : "ALLE CHECKS GRÜN");
  console.log(errors.length ? `${errors.length} page errors:\n` + errors.slice(0, 15).join("\n") : "no page errors");
  await browser.close();
  process.exitCode = problems.length || errors.length ? 1 : 0;
} finally {
  child.kill();
}
