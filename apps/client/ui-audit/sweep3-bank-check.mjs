#!/usr/bin/env node
/**
 * TESTER 3 ("Der Händler") — Bank-Verifikation. READ-ONLY, kein Quellcode angefasst, kein Build.
 * Port 5252.
 *
 * Checks:
 *  (1) Ein-/Auslagern normaler Stacks, "Alles einlagern".
 *  (2) Bank-Slots kaufen (Gold-Sink).
 *  (3) Instanzen (verzauberte Items) einlagern/entnehmen/direkt ausrüsten.
 *  (4) Suche + Kategorie-Filter.
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

async function gotoBank(page) {
  await page.goto(`${BASE_URL}/?fixture=midgame`, { waitUntil: "load" });
  await page.waitForSelector('[data-guide-id^="topbar."]', { timeout: 15000 });
  await page.waitForTimeout(2500);
  await clickRetry(page, page.locator('[data-guide-id="topbar.bank"]').first());
  await page.waitForTimeout(600);
}

function readState(page) {
  return page.evaluate(() => {
    const d = window.__hfDebug;
    if (!d) return null;
    const s = d.state;
    return {
      gold: s.character.gold,
      bankSlotsPurchased: s.bankSlotsPurchased,
      bank: s.bank,
      bankInstanceIds: s.bankInstances.map((i) => i.instanceId),
      invInstanceIds: s.inventory.instances.map((i) => i.instanceId),
      mainhand: s.character.equipment.mainhand,
      equippedInstMainhand: s.character.equippedInstances?.mainhand?.instanceId ?? s.character.equippedInstances?.mainhand ?? null,
    };
  });
}

/** Findet die Item-Cell im gegebenen Grid-Container, deren <img> auf <itemId>.png zeigt. */
function cellLocatorByItemId(page, gridSelector, itemId) {
  return page.locator(`${gridSelector} .item-cell`).filter({ has: page.locator(`img[src*="${itemId}"]`) }).first();
}

const problems = [];
const { child, getOutput } = startDevServer();
try {
  const ok = await waitForServer(BASE_URL);
  if (!ok) { console.error("SERVER NOT UP:\n" + getOutput()); process.exit(1); }
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  wirePage(page, "bank");

  await routeFixture(page, (state) => {
    state.character.gold = 999999;
    state.bank = { iron_ore: 50, birchwood_log: 20, garnet: 5 };
    state.bankSlotsPurchased = 0;
    state.nextInstanceSeq = 500;
    // Instanz #1: liegt im INVENTAR (Einlagern-Test) — verzaubertes Eisenschwert, kein Plain-Stack.
    state.inventory.instances.push({
      instanceId: "sweep3-inv-inst-1",
      baseItemId: "iron_sword",
      affixes: [{ affixId: "affix_keen", tier: 1 }],
    });
    // Instanz #2: liegt schon in der BANK (Entnehmen+Ausrüsten-Test) — verzauberter Eisendolch.
    state.bankInstances.push({
      instanceId: "sweep3-bank-inst-1",
      baseItemId: "iron_dagger",
      affixes: [],
      suffix: { suffixId: "suffix_bear", ilvl: 20, roll: 0.5 },
    });
  });
  await gotoBank(page);
  await page.screenshot({ path: join(OUT_DIR, "bank-initial.png") });
  console.log("SHOT SAVED: bank-initial.png");

  const before = await readState(page);
  console.log("INITIAL STATE:", JSON.stringify(before));

  // ── (4) Suche ────────────────────────────────────────────────────────────────────────────
  await page.fill(".invf-search", "iron");
  await page.waitForTimeout(400);
  const searchMatchCount = await page.locator(".bank-grid .item-cell").count();
  console.log("SUCHE 'iron' — sichtbare Zellen:", searchMatchCount);
  await page.screenshot({ path: join(OUT_DIR, "bank-search-iron.png") });
  console.log("SHOT SAVED: bank-search-iron.png");
  if (searchMatchCount === 0) problems.push("(4) Suche nach 'iron' zeigt 0 Treffer, obwohl iron_ore/iron_sword/iron_dagger vorhanden sein sollten");
  await page.fill(".invf-search", "");
  await page.waitForTimeout(300);

  // ── (4) Kategorie-Filter: "Waffen" sollte iron_sword/iron_dagger-Instanzen zeigen ──────────
  await clickRetry(page, page.locator(".invf-chip").filter({ hasText: /weapon|waffen/i }).first());
  await page.waitForTimeout(400);
  const weaponFilterCount = await page.locator(".bank-grid .item-cell, .bank-page .cs-inv-grid .item-cell").count();
  console.log("FILTER 'Waffen' — Zellen (beide Spalten):", weaponFilterCount);
  await page.screenshot({ path: join(OUT_DIR, "bank-filter-weapons.png") });
  console.log("SHOT SAVED: bank-filter-weapons.png");
  await clickRetry(page, page.locator(".invf-chip").first()); // zurück auf "Alle"
  await page.waitForTimeout(400);

  // ── (1) Alles einlagern ──────────────────────────────────────────────────────────────────
  const depositAllBtn = page.locator(".bank-col-head button", { hasText: /deposit all|alles einlagern/i }).first();
  const depositAllDisabled = await depositAllBtn.evaluate((b) => b.disabled).catch(() => true);
  if (depositAllDisabled) {
    problems.push("(1) 'Alles einlagern'-Button ist disabled, obwohl Inventar Items enthält");
  } else {
    await clickRetry(page, depositAllBtn);
    await page.waitForTimeout(400);
    const afterDepositAll = await readState(page);
    console.log("NACH ALLES-EINLAGERN:", JSON.stringify(afterDepositAll));
    if (before && afterDepositAll) {
      const beforeCount = Object.keys(before.bank).length;
      const afterCount = Object.keys(afterDepositAll.bank).length;
      if (afterCount <= beforeCount) problems.push(`(1) 'Alles einlagern' hat die Bank nicht vergrößert (${beforeCount} -> ${afterCount} Item-Arten)`);
    }
    await page.screenshot({ path: join(OUT_DIR, "bank-after-deposit-all.png") });
    console.log("SHOT SAVED: bank-after-deposit-all.png");
  }

  // ── (2) Bank-Slots kaufen ────────────────────────────────────────────────────────────────
  const buySlotsBtn = page.locator(".shop-upgrade-card button").first();
  const buySlotsDisabled = await buySlotsBtn.evaluate((b) => b.disabled).catch(() => true);
  if (buySlotsDisabled) {
    problems.push("(2) Bank-Slot-Kauf-Button ist disabled trotz 999999 Gold (max. Slots schon erreicht?)");
  } else {
    const beforeSlots = await readState(page);
    await clickRetry(page, buySlotsBtn);
    await page.waitForTimeout(400);
    const afterSlots = await readState(page);
    console.log("NACH SLOT-KAUF:", JSON.stringify({ beforeSlots, afterSlots }));
    if (beforeSlots && afterSlots) {
      if (afterSlots.bankSlotsPurchased <= beforeSlots.bankSlotsPurchased) problems.push("(2) bankSlotsPurchased hat sich nach Kauf nicht erhöht");
      if (afterSlots.gold >= beforeSlots.gold) problems.push("(2) Bank-Slot-Kauf hat kein Gold abgezogen");
    }
  }

  // ── (3) Instanz einlagern (Inventar → Bank) ─────────────────────────────────────────────
  const invInstCell = cellLocatorByItemId(page, ".bank-columns section:first-child .bank-grid", "iron_sword");
  const invInstFound = await invInstCell.count();
  console.log("Inventar-Instanz-Zelle (iron_sword) gefunden:", invInstFound);
  if (invInstFound === 0) {
    problems.push("(3) Synthetische Inventar-Instanz (iron_sword, verzaubert) nicht im Inventar-Grid gefunden");
  } else {
    await clickRetry(page, invInstCell);
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(OUT_DIR, "bank-inv-instance-tooltip.png") });
    console.log("SHOT SAVED: bank-inv-instance-tooltip.png");
    const depositInstBtn = page.locator(".it-action-btn", { hasText: /deposit|einlagern/i }).first();
    const depositInstFound = await depositInstBtn.count();
    if (depositInstFound === 0) {
      problems.push("(3) Kein 'Instanz einlagern'-Aktionsknopf im gepinnten Tooltip der Inventar-Instanz");
    } else {
      await clickRetry(page, depositInstBtn);
      await page.waitForTimeout(400);
      const afterDepositInst = await readState(page);
      console.log("NACH INSTANZ-EINLAGERN:", JSON.stringify(afterDepositInst));
      if (afterDepositInst && !afterDepositInst.bankInstanceIds.includes("sweep3-inv-inst-1")) {
        problems.push("(3) Instanz sweep3-inv-inst-1 ist nach 'Einlagern' nicht in bankInstances gelandet");
      }
      if (afterDepositInst && afterDepositInst.invInstanceIds.includes("sweep3-inv-inst-1")) {
        problems.push("(3) Instanz sweep3-inv-inst-1 ist NACH dem Einlagern immer noch im Inventar (nicht entfernt)");
      }
    }
  }

  // ── (3) Instanz entnehmen + direkt ausrüsten (Bank → Inventar → Equip) ─────────────────
  const bankInstCell = cellLocatorByItemId(page, ".bank-columns section:last-child .bank-grid", "iron_dagger");
  const bankInstFound = await bankInstCell.count();
  console.log("Bank-Instanz-Zelle (iron_dagger) gefunden:", bankInstFound);
  if (bankInstFound === 0) {
    problems.push("(3) Synthetische Bank-Instanz (iron_dagger, verzaubert) nicht im Bank-Grid gefunden");
  } else {
    await clickRetry(page, bankInstCell);
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(OUT_DIR, "bank-instance-tooltip.png") });
    console.log("SHOT SAVED: bank-instance-tooltip.png");
    const equipBtn = page.locator(".it-action-btn", { hasText: /equip|ausrüsten/i }).first();
    const equipFound = await equipBtn.count();
    if (equipFound === 0) {
      problems.push("(3) Kein 'Ausrüsten'-Aktionsknopf im gepinnten Tooltip der Bank-Instanz (equip-from-bank fehlt)");
    } else {
      const beforeEquip = await readState(page);
      await clickRetry(page, equipBtn);
      await page.waitForTimeout(400);
      const afterEquip = await readState(page);
      console.log("NACH ENTNEHMEN+AUSRÜSTEN:", JSON.stringify({ beforeEquip, afterEquip }));
      if (afterEquip && afterEquip.mainhand !== "iron_dagger") {
        problems.push(`(3) Nach 'Ausrüsten' ist mainhand nicht iron_dagger (war: ${afterEquip.mainhand})`);
      }
      if (afterEquip && afterEquip.equippedInstMainhand !== "sweep3-bank-inst-1") {
        problems.push(`(3) equippedInstances.mainhand zeigt nicht auf die verzauberte Instanz (war: ${afterEquip.equippedInstMainhand})`);
      }
      if (afterEquip && afterEquip.bankInstanceIds.includes("sweep3-bank-inst-1")) {
        problems.push("(3) Instanz sweep3-bank-inst-1 ist NACH dem Ausrüsten immer noch in der Bank");
      }
    }
  }

  await page.screenshot({ path: join(OUT_DIR, "bank-final.png") });
  console.log("SHOT SAVED: bank-final.png");
  await page.close();

  console.log(problems.length ? "PROBLEME:\n- " + problems.join("\n- ") : "ALLE CHECKS GRÜN");
  console.log(errors.length ? `${errors.length} page errors:\n` + errors.slice(0, 15).join("\n") : "no page errors");
  await browser.close();
  process.exitCode = problems.length || errors.length ? 1 : 0;
} finally {
  child.kill();
}
