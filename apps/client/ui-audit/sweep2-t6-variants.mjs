#!/usr/bin/env node
/**
 * TESTER T6 ("Der Händler-Messie") — Sweep 2, Revier Wirtschaft & Besitz.
 * Fokus: Varianten-Container-Zähler (Chef-Fix 2026-07-13) an allen 3 Orten
 * (Charakter-Inventar, Shop-Sell-Grid, Bank-beide-Spalten) + Pouch-Modal-Konsistenz
 * + Live-Update bei Equip/Verkauf/Einlagern/Entnehmen aus dem Modal + Enchant-Regression
 * (Sweep 1: neue Instanz bleibt nach Verzaubern selektiert).
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

/** Fixture-Patch: fügt Test-Instanzen (Varianten) für rusty_sword + gnarled_staff hinzu,
 *  sowie Bank-Bestand für rusty_sword (fungibel + Instanzen). midgame hat rusty_sword bereits
 *  qty:1 im Inventar (unverändert gelassen) und KEIN gnarled_staff im Inventar (Orphan-Test). */
async function routeFixture(page) {
  await page.route("**/ui-audit-fixtures/midgame.json", async (route) => {
    const res = await route.fetch();
    const json = JSON.parse(await res.text());
    const s = json.state;
    s.character.gold = 999999;
    // AreaTourGuide (Chef-Welle B, 2026-07-13) läuft sonst beim ersten Shop/Bank-Besuch als
    // Spotlight-Overlay und blockt Klicks auf alles außer dem gerade markierten Element — für
    // dieses Wirtschafts-Skript irrelevant, vorab als "gesehen" markieren.
    s.onboarding = s.onboarding ?? {};
    s.onboarding.toursSeen = { ...(s.onboarding.toursSeen ?? {}), combat: true, shop: true, bank: true };
    s.inventory.instances = [
      { instanceId: "t6i1", baseItemId: "rusty_sword", affixes: [{ affixId: "affix_keen", tier: 1 }] },
      { instanceId: "t6i2", baseItemId: "rusty_sword", affixes: [{ affixId: "affix_keen", tier: 1 }] },
      { instanceId: "t6i3", baseItemId: "rusty_sword", affixes: [{ affixId: "affix_flame", tier: 2 }] },
      { instanceId: "t6s1", baseItemId: "gnarled_staff", affixes: [{ affixId: "affix_precise", tier: 1 }] },
      { instanceId: "t6s2", baseItemId: "gnarled_staff", affixes: [{ affixId: "affix_precise", tier: 1 }] },
      { instanceId: "t6s3", baseItemId: "gnarled_staff", affixes: [{ affixId: "affix_precise", tier: 1 }] },
    ];
    s.bank = { ...(s.bank ?? {}), rusty_sword: 2 };
    s.bankInstances = [
      { instanceId: "t6b1", baseItemId: "rusty_sword", affixes: [{ affixId: "affix_precise", tier: 1 }] },
      { instanceId: "t6b2", baseItemId: "rusty_sword", affixes: [{ affixId: "affix_precise", tier: 1 }] },
    ];
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(json) });
  });
}

function readState(page) {
  return page.evaluate(() => {
    const d = window.__hfDebug;
    if (!d) return null;
    const s = d.state;
    const invPlain = s.inventory.slots.find((sl) => sl && sl.itemId === "rusty_sword")?.qty ?? 0;
    const invInst = s.inventory.instances.filter((i) => i.baseItemId === "rusty_sword").length;
    const staffInst = s.inventory.instances.filter((i) => i.baseItemId === "gnarled_staff").length;
    const staffPlain = s.inventory.slots.find((sl) => sl && sl.itemId === "gnarled_staff")?.qty ?? 0;
    const bankPlain = s.bank.rusty_sword ?? 0;
    const bankInst = s.bankInstances.filter((i) => i.baseItemId === "rusty_sword").length;
    return {
      gold: s.character.gold,
      invPlain, invInst, invTotal: invPlain + invInst,
      staffPlain, staffInst,
      bankPlain, bankInst, bankTotal: bankPlain + bankInst,
      equipMainhand: s.character.equipment.mainhand ?? null,
    };
  });
}

/** Findet die item-cell des gegebenen Basis-Items innerhalb eines Containers (per img[src]-Match). */
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
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  wirePage(page);
  await routeFixture(page);

  await page.goto(`${BASE_URL}/?fixture=midgame`, { waitUntil: "load" });
  await page.waitForSelector('[data-guide-id^="topbar."]', { timeout: 15000 });
  await page.waitForTimeout(4300); // Achievement-Toasts abklingen lassen (README-Gotcha)

  const state0 = await readState(page);
  console.log("STATE0:", JSON.stringify(state0));
  if (!state0) { problems.push("__hfDebug nicht verfügbar — Fixture-Load fehlgeschlagen"); }

  // ═══ (1a) Charakter-Inventar: rusty_sword-Container-Zahl ═══════════════════════════════
  // Sollte bereits auf CHARAKTER stehen (Fixture landet dort laut README).
  await page.waitForSelector(".cs-inv-grid, .char-page, [data-guide-id='sidebar.character']", { timeout: 8000 }).catch(() => {});
  await clickRetry(page, page.locator('[data-guide-id="topbar.character"]').first());
  await page.waitForTimeout(600);

  const swordCellChar = cellLocator(page, ".cs-inv-grid", "rusty_sword");
  const swordQtyChar = await swordCellChar.locator(".item-cell-qty").first().textContent().catch(() => null);
  const swordStarChar = await swordCellChar.locator(".item-cell-inst-badge").count();
  console.log(`CHAR rusty_sword qty="${swordQtyChar}" star=${swordStarChar}`);
  if (swordQtyChar !== "4") problems.push(`(1) Charakter-Inventar: rusty_sword zeigt "${swordQtyChar}" statt "4" (1 Grundmenge + 3 Instanzen)`);
  if (swordStarChar === 0) problems.push("(1) Charakter-Inventar: rusty_sword-Container zeigt keinen Varianten-Stern");
  await swordCellChar.screenshot({ path: join(OUT_DIR, "char-inv-rusty-cell.png") }).catch(() => {});

  // Orphan gnarled_staff (nur EINE Signatur, keine Grundmenge) → plain-Zelle mit qty=3, KEIN Modal.
  const staffCellChar = cellLocator(page, ".cs-inv-grid", "gnarled_staff");
  const staffQtyChar = await staffCellChar.locator(".item-cell-qty").first().textContent().catch(() => null);
  const staffStarChar = await staffCellChar.locator(".item-cell-inst-badge").count();
  console.log(`CHAR gnarled_staff (single-variant, no base qty) qty="${staffQtyChar}" star=${staffStarChar}`);
  if (staffQtyChar !== "3") problems.push(`(1) Charakter-Inventar: gnarled_staff (1 Signatur, keine Grundmenge) zeigt "${staffQtyChar}" statt "3"`);
  await clickRetry(page, staffCellChar);
  await page.waitForTimeout(300);
  const pouchOpenedForSingle = await page.locator(".pouch-modal").count();
  if (pouchOpenedForSingle > 0) problems.push("(1) gnarled_staff (Einzel-Variante ohne Grundmenge) öffnet fälschlich das Pouch-Modal — sollte sich wie eine plain ItemCell verhalten");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
  await page.mouse.move(10, 10); // Tooltip wegbewegen

  // ═══ (1b) Pouch-Modal öffnen (rusty_sword) — Zeilen gegen Summe prüfen ═══════════════════
  await clickRetry(page, swordCellChar);
  await page.waitForTimeout(400);
  const pouchInfo = await page.evaluate(() => {
    const modal = document.querySelector(".pouch-modal");
    if (!modal) return null;
    const headCount = modal.querySelector(".pouch-head-count")?.textContent ?? "";
    const rows = Array.from(modal.querySelectorAll(".pouch-row")).map((r) => ({
      full: r.classList.contains("pouch-row-full"),
      qtyText: r.querySelector(".pouch-row-qty")?.textContent ?? null,
    }));
    return { headCount, rows };
  });
  console.log("POUCH:", JSON.stringify(pouchInfo));
  if (!pouchInfo) {
    problems.push("(1) Pouch-Modal öffnet nicht beim Klick auf den rusty_sword-Container");
  } else {
    // Kopfzeile zählt instances.length (3, NICHT +Grundmenge) laut Code (pouch.variantCount).
    if (!/3/.test(pouchInfo.headCount)) problems.push(`(1) Pouch-Kopf zeigt "${pouchInfo.headCount}" — erwartet Varianten-Anzahl 3`);
    // Erwartet: 1 Grundversions-Zeile (voll, keine qty-Anzeige da qty=1<=1) + 2 Varianten-Zeilen
    // (keen-Stack ×2 zeigt "×2", flame-Stack Einzel zeigt keine qty-Span da count=1).
    if (pouchInfo.rows.length !== 3) problems.push(`(1) Pouch zeigt ${pouchInfo.rows.length} Zeilen — erwartet 3 (1 Grundversion + 2 Varianten-Stacks)`);
    const baseRow = pouchInfo.rows.find((r) => r.full);
    if (!baseRow) problems.push("(1) Pouch: keine Grundversions-Zeile (pouch-row-full) gefunden");
    const keenRow = pouchInfo.rows.find((r) => !r.full && r.qtyText === "×2");
    if (!keenRow) problems.push('(1) Pouch: keine Varianten-Zeile mit "×2" (keen-Stack) gefunden');
  }
  await page.screenshot({ path: join(OUT_DIR, "char-inv-pouch-open.png") });
  console.log("SHOT SAVED: char-inv-pouch-open.png");

  // ═══ (1c) Live-Update: Verkauf der flame-Variante (Einzelzeile) aus dem Modal ═══════════
  const beforeSellVariant = await readState(page);
  const flameRow = page.locator(".pouch-row").filter({ hasNot: page.locator(".pouch-row-qty") }).filter({ hasNotText: "" }).first();
  // Robusterer Weg: die Nicht-Grund-Zeile OHNE "×2"-Badge anklicken (das ist die flame-Einzelinstanz).
  const variantRows = page.locator(".pouch-modal .pouch-row:not(.pouch-row-full)");
  const variantRowCount = await variantRows.count();
  let flameClicked = false;
  for (let i = 0; i < variantRowCount; i++) {
    const txt = await variantRows.nth(i).locator(".pouch-row-qty").count();
    if (txt === 0) { await clickRetry(page, variantRows.nth(i)); flameClicked = true; break; }
  }
  if (!flameClicked) problems.push("(1c) Konnte die flame-Einzelvarianten-Zeile im Pouch nicht finden");
  await page.waitForTimeout(300);
  // Tooltip gepinnt: Aktionen [equip, sell] laut CharacterPage pouchVariantActions-Reihenfolge.
  const actionBtns = page.locator(".it-actions .it-action-btn");
  const actionCount = await actionBtns.count();
  console.log("PINNED TOOLTIP ACTIONS:", actionCount);
  if (actionCount < 2) {
    problems.push(`(1c) Gepinntes Tooltip nach Klick auf Varianten-Zeile hat nur ${actionCount} Aktionen (erwartet Equip+Verkaufen)`);
  } else {
    await clickRetry(page, actionBtns.last()); // "Verkaufen" ist die letzte Aktion
    await page.waitForTimeout(400);
  }
  const afterSellVariant = await readState(page);
  console.log("SELL-VARIANT delta:", JSON.stringify({ before: beforeSellVariant, after: afterSellVariant }));
  if (beforeSellVariant && afterSellVariant) {
    if (afterSellVariant.invInst !== beforeSellVariant.invInst - 1) problems.push(`(1c) Verkauf der flame-Variante aus dem Modal: invInst ${beforeSellVariant.invInst} → ${afterSellVariant.invInst} (erwartet -1)`);
    if (afterSellVariant.gold <= beforeSellVariant.gold) problems.push("(1c) Verkauf aus dem Modal hat kein Gold gutgeschrieben");
  }
  // Live-Zahl am Hauptcontainer außerhalb des Modals prüfen (Modal bleibt offen, Grid dahinter aktualisiert sich).
  const swordQtyAfterSell = await swordCellChar.locator(".item-cell-qty").first().textContent().catch(() => null);
  console.log(`CHAR rusty_sword qty nach Modal-Verkauf: "${swordQtyAfterSell}"`);
  if (swordQtyAfterSell !== "3") problems.push(`(1c) rusty_sword-Container-Zahl aktualisiert sich nicht live nach Modal-Verkauf: "${swordQtyAfterSell}" statt "3"`);
  await page.screenshot({ path: join(OUT_DIR, "char-inv-pouch-after-sell.png") });
  console.log("SHOT SAVED: char-inv-pouch-after-sell.png");

  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);

  // ═══ (2) Shop Sell-Grid: gleiche Session, gleiches Inventar → gleiche Zahl (jetzt 3) ═════
  await clickRetry(page, page.locator('[data-guide-id="topbar.shop"]').first());
  await page.waitForTimeout(600);
  await clickRetry(page, page.locator(".shopv2-maintab").filter({ hasText: /sell|verkauf/i }).first());
  await page.waitForTimeout(500);
  const swordCellShop = cellLocator(page, ".shopv2-sell-grid", "rusty_sword");
  const swordQtyShop = await swordCellShop.locator(".item-cell-qty").first().textContent().catch(() => null);
  console.log(`SHOP-SELL rusty_sword qty="${swordQtyShop}"`);
  if (swordQtyShop !== "3") problems.push(`(2) Shop-Sell-Grid: rusty_sword zeigt "${swordQtyShop}" statt "3" (nach vorherigem Modal-Verkauf, sollte identisch zum Inventar sein)`);
  const staffCellShop = cellLocator(page, ".shopv2-sell-grid", "gnarled_staff");
  const staffQtyShop = await staffCellShop.locator(".item-cell-qty").first().textContent().catch(() => null);
  if (staffQtyShop !== "3") problems.push(`(2) Shop-Sell-Grid: gnarled_staff (Orphan-Gruppe) zeigt "${staffQtyShop}" statt "3"`);
  await page.screenshot({ path: join(OUT_DIR, "shop-sell-variant-cells.png"), fullPage: false });
  console.log("SHOT SAVED: shop-sell-variant-cells.png");

  // ═══ (3) Bank — beide Spalten ═══════════════════════════════════════════════════════════
  await clickRetry(page, page.locator('[data-guide-id="topbar.bank"]').first());
  await page.waitForTimeout(600);
  const swordCellBankInv = cellLocator(page, ".bank-columns .shop-panel:first-child .bank-grid", "rusty_sword");
  const swordQtyBankInv = await swordCellBankInv.locator(".item-cell-qty").first().textContent().catch(() => null);
  const swordCellBankStore = cellLocator(page, ".bank-columns .shop-panel:last-child .bank-grid", "rusty_sword");
  const swordQtyBankStore = await swordCellBankStore.locator(".item-cell-qty").first().textContent().catch(() => null);
  console.log(`BANK rusty_sword: Inventar-Spalte="${swordQtyBankInv}" Bank-Spalte="${swordQtyBankStore}"`);
  // Inventar-Spalte spiegelt das Charakter-Inventar (nach dem Verkauf: 3).
  if (swordQtyBankInv !== "3") problems.push(`(3) Bank/Inventar-Spalte: rusty_sword zeigt "${swordQtyBankInv}" statt "3"`);
  // Bank-Spalte: 2 fungibel + 2 Instanzen = 4.
  if (swordQtyBankStore !== "4") problems.push(`(3) Bank/Lager-Spalte: rusty_sword zeigt "${swordQtyBankStore}" statt "4" (2 fungibel + 2 Instanzen)`);
  await page.screenshot({ path: join(OUT_DIR, "bank-both-columns.png") });
  console.log("SHOT SAVED: bank-both-columns.png");

  // ═══ (3b) Live-Update Bank: aus dem Inventar-Spalten-Pouch eine Instanz einlagern ═══════
  const beforeDeposit = await readState(page);
  await clickRetry(page, swordCellBankInv);
  await page.waitForTimeout(300);
  const bankVariantRows = page.locator(".pouch-modal .pouch-row:not(.pouch-row-full)");
  const bankVariantCount = await bankVariantRows.count();
  if (bankVariantCount === 0) {
    problems.push("(3b) Kein Varianten-Row im Inventar-Spalten-Pouch zum Einlagern gefunden");
  } else {
    await clickRetry(page, bankVariantRows.first());
    await page.waitForTimeout(300);
    const depositBtns = page.locator(".it-actions .it-action-btn");
    if (await depositBtns.count() < 1) problems.push("(3b) Kein 'Einlagern'-Aktions-Button im gepinnten Tooltip");
    else { await clickRetry(page, depositBtns.first()); await page.waitForTimeout(400); }
  }
  const afterDeposit = await readState(page);
  console.log("DEPOSIT-FROM-POUCH delta:", JSON.stringify({ before: beforeDeposit, after: afterDeposit }));
  if (beforeDeposit && afterDeposit) {
    if (afterDeposit.invInst !== beforeDeposit.invInst - 1) problems.push(`(3b) Einlagern aus Inventar-Pouch: invInst ${beforeDeposit.invInst} → ${afterDeposit.invInst} (erwartet -1)`);
    if (afterDeposit.bankInst !== beforeDeposit.bankInst + 1) problems.push(`(3b) Einlagern aus Inventar-Pouch: bankInst ${beforeDeposit.bankInst} → ${afterDeposit.bankInst} (erwartet +1)`);
  }
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
  const swordQtyBankInvAfter = await swordCellBankInv.locator(".item-cell-qty").first().textContent().catch(() => null);
  const swordQtyBankStoreAfter = await swordCellBankStore.locator(".item-cell-qty").first().textContent().catch(() => null);
  console.log(`BANK nach Einlagern: Inventar-Spalte="${swordQtyBankInvAfter}" Bank-Spalte="${swordQtyBankStoreAfter}"`);
  if (swordQtyBankInvAfter !== "2") problems.push(`(3b) Bank/Inventar-Spalte aktualisiert sich nicht live: "${swordQtyBankInvAfter}" statt "2"`);
  if (swordQtyBankStoreAfter !== "5") problems.push(`(3b) Bank/Lager-Spalte aktualisiert sich nicht live: "${swordQtyBankStoreAfter}" statt "5"`);
  await page.screenshot({ path: join(OUT_DIR, "bank-both-columns-after-deposit.png") });
  console.log("SHOT SAVED: bank-both-columns-after-deposit.png");

  // ═══ (5) Enchant-Regression: Verzaubern der PLAIN rusty_sword-Einheit ═════════════════════
  // rusty_sword's Grundmenge (1) sollte noch unverändert existieren (wir haben nur Instanzen bewegt).
  await clickRetry(page, page.locator('[data-guide-id="sidebar.enchanting"]').first());
  await page.waitForTimeout(700);
  const invPlainRow = page.locator(".ench-item-row").filter({ has: page.locator('img[src*="rusty_sword"]') }).first();
  const invPlainRowVisible = await invPlainRow.count();
  if (invPlainRowVisible === 0) {
    problems.push("(5) Plain rusty_sword nicht in der Enchanting-'Inventar'-Liste gefunden — Enchant-Regressionstest übersprungen");
  } else {
    await clickRetry(page, invPlainRow);
    await page.waitForTimeout(300);
    // Erste verfügbare Waffen-Rune im Grimoire wählen (irgendeine .ench-rune-card, die nicht incompatible ist).
    const runeCards = page.locator(".ench-rune-card:not(.incompatible)");
    const runeCount = await runeCards.count();
    if (runeCount === 0) {
      problems.push("(5) Keine kompatible Rune im Grimoire für rusty_sword gefunden");
    } else {
      await clickRetry(page, runeCards.first());
      await page.waitForTimeout(300);
      const enchantBtn = page.locator(".ench-btn");
      const disabled = await enchantBtn.evaluate((b) => b.disabled).catch(() => true);
      if (disabled) {
        problems.push("(5) Enchant-Button bleibt disabled trotz 999999 Gold + gewählter Rune — Regressionstest übersprungen");
      } else {
        const beforeEnchant = await readState(page);
        await clickRetry(page, enchantBtn);
        await page.waitForTimeout(500);
        // Regression Sweep 1: die neue Instanz sollte in der "Varianten"-Liste selektiert bleiben.
        const selectedAfterEnchant = await page.locator(".ench-item-row.selected").count();
        const selectedInVariantsSection = await page.evaluate(() => {
          const sections = Array.from(document.querySelectorAll(".ench-select-list .ench-section-label"));
          const variantsLabel = sections.find((s) => s.nextElementSibling); // best-effort
          const sel = document.querySelector(".ench-item-row.selected");
          if (!sel) return null;
          // Ist diese Zeile innerhalb des DRITTEN Abschnitts (Varianten)? Prüfe Nachbarschaft zu einem Label.
          let prevLabel = null;
          let node = sel.previousElementSibling;
          while (node) {
            if (node.classList.contains("ench-section-label")) { prevLabel = node.textContent; break; }
            node = node.previousElementSibling;
          }
          return prevLabel;
        });
        console.log("ENCHANT selected row count:", selectedAfterEnchant, "prevLabel:", selectedInVariantsSection);
        if (selectedAfterEnchant !== 1) problems.push(`(5) Nach dem Verzaubern ist keine (oder >1) Zeile selektiert (${selectedAfterEnchant}) — Regression Sweep 1`);
        const afterEnchant = await readState(page);
        console.log("ENCHANT delta:", JSON.stringify({ before: beforeEnchant, after: afterEnchant }));
        // Gesamtzahl (plain+instances) für rusty_sword sollte INVARIANT bleiben (2 vorher → 2 nachher,
        // nur Zusammensetzung ändert sich: 1 plain+1 instance → 0 plain+2 instances).
        if (beforeEnchant && afterEnchant) {
          const totalBefore = beforeEnchant.invPlain + beforeEnchant.invInst;
          const totalAfter = afterEnchant.invPlain + afterEnchant.invInst;
          if (totalBefore !== totalAfter) problems.push(`(5) Gesamtzahl rusty_sword (Inventar) ändert sich durchs Verzaubern: ${totalBefore} → ${totalAfter} (sollte gleich bleiben, nur promotet)`);
          if (afterEnchant.invPlain !== 0) problems.push(`(5) Plain-Grundmenge von rusty_sword ist nach dem Verzaubern nicht 0 (${afterEnchant.invPlain}) — Slot wurde nicht genullt`);
        }
        await page.screenshot({ path: join(OUT_DIR, "enchant-after-selection.png") });
        console.log("SHOT SAVED: enchant-after-selection.png");

        // (1-Folgecheck) Zurück zum Charakter-Inventar: Container-Zahl sollte weiterhin stimmen
        // (jetzt 0 plain + 4 Instanzen [2 keen minus 0, 1 flame verkauft, 1 precise deposited... wait]).
        await clickRetry(page, page.locator('[data-guide-id="topbar.character"]').first());
        await page.waitForTimeout(500);
        const swordQtyCharFinal = await swordCellChar.locator(".item-cell-qty").first().textContent().catch(() => null);
        console.log(`CHAR rusty_sword qty nach Enchant-Promotion: "${swordQtyCharFinal}"`);
        // Erwartung: nach allen Schritten (verkauft 1× flame, 1× keen eingelagert aus dem Inventar,
        // jetzt +1 neue Instanz durch Promotion) = 1 verbleibendes keen + 1 neu = 2 Instanzen, 0 plain.
        if (swordQtyCharFinal !== "2") problems.push(`(5) rusty_sword-Container-Zahl nach Enchant-Promotion inkonsistent: "${swordQtyCharFinal}" statt "2"`);
      }
    }
  }

  await page.close();

  // ═══ (2b) Instanz-Verkauf AUS DEM SHOP-EIGENEN Pouch — isolierte, frische Session (eigener
  // Fixture-Load), damit die sorgfältig durchgerechnete Zahlen-Kette oben unberührt bleibt.
  // Brief verlangt explizit "Instanz-Verkauf" im Shop-Kontext (eigener Code-Pfad ggü.
  // CharacterPage's pouchVariantActions: ShopPage.sellVariantActions hat NUR [sell], kein [equip]). ══
  const page2 = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  wirePage(page2);
  await routeFixture(page2);
  await page2.goto(`${BASE_URL}/?fixture=midgame`, { waitUntil: "load" });
  await page2.waitForSelector('[data-guide-id^="topbar."]', { timeout: 15000 });
  await page2.waitForTimeout(4300);
  await clickRetry(page2, page2.locator('[data-guide-id="topbar.shop"]').first());
  await page2.waitForTimeout(600);
  await clickRetry(page2, page2.locator(".shopv2-maintab").filter({ hasText: /sell|verkauf/i }).first());
  await page2.waitForTimeout(500);

  const swordCellShop2 = cellLocator(page2, ".shopv2-sell-grid", "rusty_sword");
  const beforeShopInstSell = await readState(page2);
  await clickRetry(page2, swordCellShop2); // öffnet das Pouch-Modal im Shop-Kontext (1 plain + 3 Instanzen frisch aus der Fixture)
  await page2.waitForTimeout(300);
  const shopVariantRows = page2.locator(".pouch-modal .pouch-row:not(.pouch-row-full)");
  const shopVariantRowCount = await shopVariantRows.count();
  if (shopVariantRowCount === 0) {
    problems.push("(2b) Kein Varianten-Row im Shop-Pouch für Instanz-Verkauf gefunden");
  } else {
    await clickRetry(page2, shopVariantRows.first());
    await page2.waitForTimeout(250);
    const shopSellBtn = page2.locator(".it-actions .it-action-btn").first(); // ShopPage sellVariantActions: nur [sell]
    if (await shopSellBtn.count() === 0) {
      problems.push("(2b) Kein Verkaufs-Aktions-Button im gepinnten Tooltip (Shop-Pouch-Instanz)");
    } else {
      await clickRetry(page2, shopSellBtn);
      await page2.waitForTimeout(400);
    }
  }
  const afterShopInstSell = await readState(page2);
  console.log("SHOP-INSTANCE-SELL:", JSON.stringify({ before: beforeShopInstSell, after: afterShopInstSell }));
  if (beforeShopInstSell && afterShopInstSell) {
    if (afterShopInstSell.invInst !== beforeShopInstSell.invInst - 1) problems.push(`(2b) Instanz-Verkauf aus dem Shop-Pouch: invInst ${beforeShopInstSell.invInst} → ${afterShopInstSell.invInst} (erwartet -1)`);
    if (afterShopInstSell.gold <= beforeShopInstSell.gold) problems.push("(2b) Instanz-Verkauf aus dem Shop-Pouch hat kein Gold gutgeschrieben");
    const instanceInBuyback = await page2.evaluate(() => {
      const d = window.__hfDebug;
      return d ? d.state.buyBack.some((b) => b.itemId === "rusty_sword" && b.instance) : null;
    });
    if (!instanceInBuyback) problems.push("(2b) Verkaufte Instanz landet nicht als Instanz-Eintrag im Rückkauf-Regal (state.buyBack)");
    console.log("(2b) Instanz-Eintrag im Buyback vorhanden:", instanceInBuyback);
  }
  await page2.keyboard.press("Escape").catch(() => {});
  await page2.mouse.move(5, 5);
  await page2.waitForTimeout(200);
  await page2.screenshot({ path: join(OUT_DIR, "shop-instance-sell-done.png") });
  console.log("SHOT SAVED: shop-instance-sell-done.png");
  await page2.close();

  console.log(errors.length ? `${errors.length} page errors:\n` + errors.slice(0, 20).join("\n") : "no page errors");
  console.log(problems.length ? "PROBLEME:\n- " + problems.join("\n- ") : "ALLE CHECKS GRÜN");
  await browser.close();
  process.exitCode = problems.length || errors.length ? 1 : 0;
} finally {
  child.kill();
}
