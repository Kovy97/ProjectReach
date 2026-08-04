#!/usr/bin/env node
/**
 * TESTER T6 — Ergänzung: die verbleibenden zwei der vier im Brief genannten Pouch-Modal-Live-
 * Update-Aktionen (Equip + Entnehmen), Verkauf+Einlagern sind bereits in sweep2-t6-variants.mjs
 * abgedeckt. Isoliert, damit die Zahlen-Kette dort nicht angefasst werden muss.
 * READ-ONLY: nur Playwright, kein Produktcode-Edit, kein Electron.
 * Port 5255.
 */
import { spawn } from "node:child_process";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const CLIENT_DIR = "G:\\GameDev\\apps\\client";
const PORT = 5255;
const BASE_URL = `http://localhost:${PORT}`;
const OUT_DIR = "C:\\Users\\MSchu\\AppData\\Local\\Temp\\claude\\G--GameDev\\553d2095-3a73-4795-9782-0fe746a25f13\\scratchpad\\sweep2-t6";

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

function cellLocator(page, root, itemId) {
  return page.locator(`${root} .item-cell`).filter({ has: page.locator(`img[src*="${itemId}"]`) }).first();
}

const problems = [];
const errors = [];
function wirePage(page) {
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error") errors.push(`console: ${m.text()}`); });
}

const { child, getOutput } = startDevServer();
try {
  const ok = await waitForServer(BASE_URL);
  if (!ok) { console.error("SERVER NOT UP:\n" + getOutput()); process.exit(1); }
  const browser = await chromium.launch();

  // ═══ (Equip aus dem Modal) — Charakter-Inventar ═══════════════════════════════════════════
  const pageA = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  wirePage(pageA);
  await pageA.route("**/ui-audit-fixtures/midgame.json", async (route) => {
    const res = await route.fetch();
    const json = JSON.parse(await res.text());
    const s = json.state;
    s.character.gold = 999999;
    s.onboarding = s.onboarding ?? {};
    s.onboarding.toursSeen = { ...(s.onboarding.toursSeen ?? {}), combat: true, shop: true, bank: true };
    // rusty_sword: plain qty 1 (aus Fixture) + 2 Varianten-Instanzen → Container-Modus.
    s.inventory.instances = [
      { instanceId: "eq1", baseItemId: "rusty_sword", affixes: [{ affixId: "affix_keen", tier: 1 }] },
      { instanceId: "eq2", baseItemId: "rusty_sword", affixes: [{ affixId: "affix_flame", tier: 2 }] },
    ];
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(json) });
  });
  await pageA.goto(`${BASE_URL}/?fixture=midgame`, { waitUntil: "load" });
  await pageA.waitForSelector('[data-guide-id^="topbar."]', { timeout: 15000 });
  await pageA.waitForTimeout(4300);

  const swordCell = cellLocator(pageA, ".cs-inv-grid", "rusty_sword");
  const qtyBefore = await swordCell.locator(".item-cell-qty").first().textContent().catch(() => null);
  console.log("EQUIP-TEST: rusty_sword container qty vorher =", qtyBefore); // erwartet "3" (1 plain + 2 inst)
  if (qtyBefore !== "3") problems.push(`(Equip) Vorbedingung falsch: rusty_sword zeigt "${qtyBefore}" statt "3" vor dem Equip-Test`);

  const equippedBefore = await pageA.evaluate(() => window.__hfDebug?.state.character.equipment.mainhand ?? null);
  await clickRetry(pageA, swordCell); // Pouch öffnen
  await pageA.waitForTimeout(300);
  const variantRows = pageA.locator(".pouch-modal .pouch-row:not(.pouch-row-full)");
  const rowCount = await variantRows.count();
  if (rowCount === 0) {
    problems.push("(Equip) Keine Varianten-Zeile im Pouch gefunden");
  } else {
    await clickRetry(pageA, variantRows.first());
    await pageA.waitForTimeout(250);
    const actionBtns = pageA.locator(".it-actions .it-action-btn");
    const actionCount = await actionBtns.count();
    if (actionCount < 2) {
      problems.push(`(Equip) Nur ${actionCount} Aktion(en) im gepinnten Tooltip — erwartet Equip+Verkaufen`);
    } else {
      await clickRetry(pageA, actionBtns.first()); // "Ausrüsten" ist die erste Aktion (pouchVariantActions-Reihenfolge)
      await pageA.waitForTimeout(400);
    }
  }
  const equippedAfter = await pageA.evaluate(() => window.__hfDebug?.state.character.equipment.mainhand ?? null);
  console.log("EQUIP delta:", JSON.stringify({ equippedBefore, equippedAfter }));
  if (equippedAfter !== "rusty_sword") problems.push(`(Equip) character.equipment.mainhand nach Equip-Klick = "${equippedAfter}" statt "rusty_sword"`);

  const qtyAfter = await swordCell.locator(".item-cell-qty").first().textContent().catch(() => null);
  console.log("EQUIP-TEST: rusty_sword container qty nachher (live, Modal noch offen) =", qtyAfter);
  // 1 plain + 1 verbleibende Instanz = 2 (die equippte Instanz zählt nicht mehr im Inventar-Container).
  if (qtyAfter !== "2") problems.push(`(Equip) Container-Zahl aktualisiert sich nicht live nach Equip aus dem Modal: "${qtyAfter}" statt "2"`);
  await pageA.screenshot({ path: join(OUT_DIR, "pouch-equip-live-update.png") });
  console.log("SHOT SAVED: pouch-equip-live-update.png");
  await pageA.close();

  // ═══ (Entnehmen aus dem Modal) — Bank-Lager-Spalte ═════════════════════════════════════════
  const pageB = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  wirePage(pageB);
  await pageB.route("**/ui-audit-fixtures/midgame.json", async (route) => {
    const res = await route.fetch();
    const json = JSON.parse(await res.text());
    const s = json.state;
    s.character.gold = 999999;
    s.onboarding = s.onboarding ?? {};
    s.onboarding.toursSeen = { ...(s.onboarding.toursSeen ?? {}), combat: true, shop: true, bank: true };
    // gnarled_staff im LAGER: fungibel 2 + 2 Instanzen → Container-Modus in der Bank-Spalte.
    s.bank = { ...(s.bank ?? {}), gnarled_staff: 2 };
    s.bankInstances = [
      { instanceId: "w1", baseItemId: "gnarled_staff", affixes: [{ affixId: "affix_precise", tier: 1 }] },
      { instanceId: "w2", baseItemId: "gnarled_staff", affixes: [{ affixId: "affix_precise", tier: 2 }] },
    ];
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(json) });
  });
  await pageB.goto(`${BASE_URL}/?fixture=midgame`, { waitUntil: "load" });
  await pageB.waitForSelector('[data-guide-id^="topbar."]', { timeout: 15000 });
  await pageB.waitForTimeout(4300);
  await clickRetry(pageB, pageB.locator('[data-guide-id="topbar.bank"]').first());
  await pageB.waitForTimeout(700);

  const staffCellBank = cellLocator(pageB, ".bank-columns .shop-panel:last-child .bank-grid", "gnarled_staff");
  const bankQtyBefore = await staffCellBank.locator(".item-cell-qty").first().textContent().catch(() => null);
  console.log("WITHDRAW-TEST: gnarled_staff Bank-Spalte vorher =", bankQtyBefore); // erwartet "4" (2 fungibel + 2 inst)
  if (bankQtyBefore !== "4") problems.push(`(Entnehmen) Vorbedingung falsch: gnarled_staff Bank-Spalte zeigt "${bankQtyBefore}" statt "4"`);

  await clickRetry(pageB, staffCellBank);
  await pageB.waitForTimeout(300);
  const bankVariantRows = pageB.locator(".pouch-modal .pouch-row:not(.pouch-row-full)");
  const bankRowCount = await bankVariantRows.count();
  if (bankRowCount === 0) {
    problems.push("(Entnehmen) Keine Varianten-Zeile im Bank-Pouch gefunden");
  } else {
    await clickRetry(pageB, bankVariantRows.first());
    await pageB.waitForTimeout(250);
    // BankPage variantActionsFor(Lager-Spalte): [withdrawInstance, equip?] — erste Aktion = Entnehmen.
    const withdrawBtn = pageB.locator(".it-actions .it-action-btn").first();
    if (await withdrawBtn.count() === 0) problems.push("(Entnehmen) Kein Aktions-Button im gepinnten Tooltip (Bank-Pouch-Instanz)");
    else { await clickRetry(pageB, withdrawBtn); await pageB.waitForTimeout(400); }
  }
  const bankQtyAfter = await staffCellBank.locator(".item-cell-qty").first().textContent().catch(() => null);
  console.log("WITHDRAW-TEST: gnarled_staff Bank-Spalte nachher (live, Modal noch offen) =", bankQtyAfter);
  if (bankQtyAfter !== "3") problems.push(`(Entnehmen) Bank-Spalten-Container-Zahl aktualisiert sich nicht live nach Entnehmen aus dem Modal: "${bankQtyAfter}" statt "3"`);

  await pageB.keyboard.press("Escape").catch(() => {});
  await pageB.mouse.move(5, 5);
  await pageB.waitForTimeout(200);
  // WICHTIG: bei genau 1 entnommener Instanz (keine Grundmenge) greift dieselbe "Einzel-Variante
  // ohne Grundmenge"-Regel wie in sweep2-t6-variants.mjs — die Zelle zeigt DANN KEINE .item-cell-qty
  // (nur qty>1 rendert die Zahl, s. ItemCell.tsx). Also über den State prüfen statt über die DOM-Zahl.
  const staffCellInv = cellLocator(pageB, ".bank-columns .shop-panel:first-child .bank-grid", "gnarled_staff");
  const invCellVisible = await staffCellInv.count();
  const invInstancesState = await pageB.evaluate(() => window.__hfDebug?.state.inventory.instances.filter((i) => i.baseItemId === "gnarled_staff").length ?? -1);
  console.log("WITHDRAW-TEST: gnarled_staff Inventar-Spalte sichtbar =", invCellVisible > 0, "| inventory.instances-Anzahl =", invInstancesState);
  if (invCellVisible === 0) problems.push("(Entnehmen) gnarled_staff erscheint nach dem Entnehmen NICHT in der Inventar-Spalte (Zelle fehlt)");
  if (invInstancesState !== 1) problems.push(`(Entnehmen) inventory.instances enthält ${invInstancesState} gnarled_staff-Instanzen statt 1 — Item nicht korrekt im Inventar angekommen`);
  await pageB.screenshot({ path: join(OUT_DIR, "pouch-withdraw-live-update.png") });
  console.log("SHOT SAVED: pouch-withdraw-live-update.png");
  await pageB.close();

  console.log(errors.length ? `${errors.length} page errors:\n` + errors.slice(0, 15).join("\n") : "no page errors");
  console.log(problems.length ? "PROBLEME:\n- " + problems.join("\n- ") : "ALLE CHECKS GRÜN");
  await browser.close();
  process.exitCode = problems.length || errors.length ? 1 : 0;
} finally {
  child.kill();
}
