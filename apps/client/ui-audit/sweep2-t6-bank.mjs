#!/usr/bin/env node
/**
 * TESTER T6 ("Der Händler-Messie") — Sweep 2, Revier Wirtschaft & Besitz.
 * Fokus: Bank — Ein-/Auslagern (fungibel), Slot-Kauf, Filter/Suche/Sortierung,
 * Kapazitätsanzeige. Plus NpcGreetings auf Bank/Shop bei 1366×768 (Kopf 96px, Text 16px,
 * keine Layout-Kollision mit dem Content darunter).
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

async function routeFixture(page, mutator) {
  await page.route("**/ui-audit-fixtures/midgame.json", async (route) => {
    const res = await route.fetch();
    const json = JSON.parse(await res.text());
    json.state.onboarding = json.state.onboarding ?? {};
    json.state.onboarding.toursSeen = { ...(json.state.onboarding.toursSeen ?? {}), combat: true, shop: true, bank: true };
    mutator(json.state);
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(json) });
  });
}

function readState(page) {
  return page.evaluate(() => {
    const d = window.__hfDebug;
    if (!d) return null;
    const s = d.state;
    return { gold: s.character.gold, bankSlotsUsed: Object.keys(s.bank).length + (s.bankInstances?.length ?? 0) };
  });
}

const problems = [];
const errors = [];
function wirePage(page, tag) {
  page.on("pageerror", (e) => errors.push(`[${tag}] pageerror: ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error") errors.push(`[${tag}] console: ${m.text()}`); });
}

const { child, getOutput } = startDevServer();
try {
  const ok = await waitForServer(BASE_URL);
  if (!ok) { console.error("SERVER NOT UP:\n" + getOutput()); process.exit(1); }
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  wirePage(page, "bank");
  await routeFixture(page, (s) => { s.character.gold = 500000; });

  await page.goto(`${BASE_URL}/?fixture=midgame`, { waitUntil: "load" });
  await page.waitForSelector('[data-guide-id^="topbar."]', { timeout: 15000 });
  await page.waitForTimeout(4300);
  await clickRetry(page, page.locator('[data-guide-id="topbar.bank"]').first());
  await page.waitForTimeout(700);

  // ═══ (Kapazität) Anzeige gegen echten State prüfen ═══════════════════════════════════════
  const headCountText = await page.locator(".bank-head .bank-count").first().textContent();
  const storeCountText = await page.locator(".bank-columns .shop-panel:last-child .bank-count").first().textContent();
  console.log("BANK CAPACITY DISPLAY:", JSON.stringify({ headCountText, storeCountText }));
  const parseXY = (s) => { const m = (s ?? "").match(/(\d+)\s*\/\s*(\d+)/); return m ? { used: Number(m[1]), cap: Number(m[2]) } : null; };
  const headXY = parseXY(headCountText);
  const storeXY = parseXY(storeCountText);
  if (!headXY) problems.push(`(Kapazität) Kopfzeilen-Anzeige hat kein "X / Y"-Format: "${headCountText}"`);
  if (headXY && storeXY && (headXY.used !== storeXY.used || headXY.cap !== storeXY.cap)) {
    problems.push(`(Kapazität) Kopfzeile "${headCountText}" (${JSON.stringify(headXY)}) ≠ Lager-Spalten-Kopf "${storeCountText}" (${JSON.stringify(storeXY)}) — sollten dieselben Zahlen zeigen (nur der Label-Text unterscheidet sich by design)`);
  }

  // ═══ (Slot-Kauf) "Lager erweitern" ═════════════════════════════════════════════════════════
  const capBefore = await page.evaluate(() => {
    const d = window.__hfDebug;
    return d ? { gold: d.state.character.gold } : null;
  });
  const capTextBefore = await page.locator(".bank-head .bank-count").first().textContent();
  const expandBtn = page.locator(".shop-upgrade-card .shop-citadel-btn").first();
  const expandDisabled = await expandBtn.evaluate((b) => b.disabled).catch(() => true);
  if (expandDisabled) {
    problems.push("(Slot-Kauf) 'Lager erweitern'-Button disabled trotz 500000 Gold");
  } else {
    await clickRetry(page, expandBtn);
    await page.waitForTimeout(500);
    const capAfter = await page.evaluate(() => {
      const d = window.__hfDebug;
      return d ? { gold: d.state.character.gold } : null;
    });
    const capTextAfter = await page.locator(".bank-head .bank-count").first().textContent();
    console.log("SLOT-KAUF:", JSON.stringify({ capTextBefore, capTextAfter, goldBefore: capBefore?.gold, goldAfter: capAfter?.gold }));
    if (capBefore && capAfter && capAfter.gold >= capBefore.gold) problems.push("(Slot-Kauf) Lager erweitern hat kein Gold abgezogen");
    if (capTextBefore === capTextAfter) problems.push(`(Slot-Kauf) Kapazitätsanzeige unverändert nach Kauf: "${capTextBefore}"`);
  }
  await page.screenshot({ path: join(OUT_DIR, "bank-slot-purchase.png") });
  console.log("SHOT SAVED: bank-slot-purchase.png");

  // ═══ (Filter/Suche) ════════════════════════════════════════════════════════════════════════
  const allCellsBefore = await page.locator(".bank-columns .bank-grid .item-cell").count();
  await page.locator(".invf-search").first().fill("Glut"); // "Glutasche"/forge_ember-artige Treffer, DE-Suche
  await page.waitForTimeout(400);
  const allCellsAfterSearch = await page.locator(".bank-columns .bank-grid .item-cell").count();
  console.log(`FILTER-SEARCH "Glut": ${allCellsBefore} → ${allCellsAfterSearch} Zellen`);
  if (allCellsAfterSearch >= allCellsBefore) problems.push(`(Filter) Suchtext "Glut" filtert die Zellenzahl nicht (${allCellsBefore} → ${allCellsAfterSearch})`);
  await page.screenshot({ path: join(OUT_DIR, "bank-filter-search.png") });
  console.log("SHOT SAVED: bank-filter-search.png");
  await page.locator(".invf-search").first().fill("");
  await page.waitForTimeout(400);

  // Kategorie-Chip "Materialien".
  const matChip = page.locator(".invf-chip").filter({ hasText: /material/i }).first();
  if (await matChip.count()) {
    const matChipCountText = await matChip.locator(".invf-chip-count").textContent().catch(() => null);
    await clickRetry(page, matChip);
    await page.waitForTimeout(400);
    const cellsAfterChip = await page.locator(".bank-columns .bank-grid .item-cell").count();
    console.log(`FILTER-CHIP Materialien: Chip-Zähler="${matChipCountText}", sichtbare Zellen=${cellsAfterChip}`);
    // Chip-Zähler zählt Item-ARTEN über BEIDE Spalten vereint (s. Code-Kommentar chipCounts) —
    // sichtbare Zellensumme (Inventar+Lager) sollte NICHT größer sein als 2× dieser Zahl.
    const matChipCount = Number((matChipCountText ?? "0").replace(/\D/g, ""));
    if (matChipCount > 0 && cellsAfterChip > matChipCount * 2) {
      problems.push(`(Filter) Materialien-Chip zeigt Zähler ${matChipCount}, aber ${cellsAfterChip} Zellen sichtbar (unplausibel hoch)`);
    }
    if (cellsAfterChip === 0 && matChipCount > 0) problems.push("(Filter) Materialien-Chip aktiv, aber 0 Zellen sichtbar trotz Zähler > 0");
    await page.screenshot({ path: join(OUT_DIR, "bank-filter-materials-chip.png") });
    console.log("SHOT SAVED: bank-filter-materials-chip.png");
    await clickRetry(page, page.locator(".invf-chip").first()); // zurück auf "Alle"
    await page.waitForTimeout(400);
  } else {
    problems.push("(Filter) Materialien-Chip nicht gefunden");
  }

  // ═══ (Sortierung) "Menge" absteigend prüfen (Inventar-Spalte — Lager ist in dieser Fixture leer) ══
  await page.locator(".cs-sort-select").selectOption("qty");
  await page.waitForTimeout(400);
  const qtyTexts = await page.locator(".bank-columns .shop-panel:first-child .bank-grid .item-cell-qty").allTextContents();
  const qtyNums = qtyTexts.map((t) => Number(t.replace(/\D/g, ""))).filter((n) => !Number.isNaN(n));
  console.log("SORT-QTY (Inventar-Spalte):", JSON.stringify(qtyNums));
  let sorted = true;
  for (let i = 1; i < qtyNums.length; i++) if (qtyNums[i] > qtyNums[i - 1]) sorted = false;
  if (qtyNums.length > 1 && !sorted) problems.push(`(Sortierung) "Menge"-Sortierung nicht absteigend: ${JSON.stringify(qtyNums)}`);
  await page.screenshot({ path: join(OUT_DIR, "bank-sort-qty.png") });
  console.log("SHOT SAVED: bank-sort-qty.png");
  await page.locator(".cs-sort-select").selectOption("newest");
  await page.waitForTimeout(300);

  // ═══ (Ein-/Auslagern fungibel) Runden-Trip auf einem plain-Material-Item ═════════════════════
  await page.mouse.move(5, 5);
  await page.keyboard.press("Escape").catch(() => {});
  const invCol = ".bank-columns .shop-panel:first-child .bank-grid";
  const emberCell = page.locator(`${invCol} .item-cell`).filter({ has: page.locator('img[src*="forge_ember"]') }).first();
  if (await emberCell.count()) {
    const beforeQty = await emberCell.locator(".item-cell-qty").first().textContent();
    await clickRetry(page, emberCell);
    await page.waitForTimeout(300);
    const depositStackBtn = page.locator(".it-actions .it-action-btn").last(); // [deposit1, depositStack] → letzte = Stack
    if (await depositStackBtn.count()) {
      await clickRetry(page, depositStackBtn);
      await page.waitForTimeout(400);
    }
    const emberInBankNow = page.locator(".bank-columns .shop-panel:last-child .bank-grid .item-cell").filter({ has: page.locator('img[src*="forge_ember"]') }).first();
    const bankQtyAfterDeposit = await emberInBankNow.locator(".item-cell-qty").first().textContent().catch(() => null);
    console.log(`DEPOSIT-STACK forge_ember: Inventar vorher=${beforeQty}, Lager nachher=${bankQtyAfterDeposit}`);
    if (!bankQtyAfterDeposit) problems.push("(Ein-/Auslagern) forge_ember nach depositStack nicht im Lager gefunden");
    else if (bankQtyAfterDeposit.replace(/\D/g,"") !== (beforeQty ?? "").replace(/\D/g,"")) {
      problems.push(`(Ein-/Auslagern) forge_ember Lager-Menge (${bankQtyAfterDeposit}) ≠ zuvor eingelagerte Inventar-Menge (${beforeQty})`);
    }

    // Jetzt zurück auslagern (withdrawAll).
    await page.mouse.move(5, 5);
    await page.keyboard.press("Escape").catch(() => {});
    await clickRetry(page, emberInBankNow);
    await page.waitForTimeout(300);
    const withdrawAllBtn = page.locator(".it-actions .it-action-btn").last(); // [withdraw1, withdrawAll]
    if (await withdrawAllBtn.count()) {
      await clickRetry(page, withdrawAllBtn);
      await page.waitForTimeout(400);
    }
    const emberBackInInv = page.locator(`${invCol} .item-cell`).filter({ has: page.locator('img[src*="forge_ember"]') }).first();
    const invQtyAfterWithdraw = await emberBackInInv.locator(".item-cell-qty").first().textContent().catch(() => null);
    console.log(`WITHDRAW-ALL forge_ember: Inventar nachher=${invQtyAfterWithdraw} (Original war ${beforeQty})`);
    if (invQtyAfterWithdraw?.replace(/\D/g,"") !== (beforeQty ?? "").replace(/\D/g,"")) {
      problems.push(`(Ein-/Auslagern) Runden-Trip forge_ember: Inventar-Menge nach Einlagern+Auslagern (${invQtyAfterWithdraw}) ≠ ursprünglich (${beforeQty}) — Item-Verlust/-Dupe möglich`);
    }
  } else {
    problems.push("(Ein-/Auslagern) forge_ember-Zelle im Inventar-Spalten nicht gefunden");
  }
  await page.screenshot({ path: join(OUT_DIR, "bank-roundtrip-done.png") });
  console.log("SHOT SAVED: bank-roundtrip-done.png");

  // ═══ NpcGreeting-Größen (Chef-GO 2026-07-13): Kopf 96px, Text 16px, keine Kollision @1366×768 ══
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.waitForTimeout(500);
  for (const [pageId, nav, wrapper] of [
    ["bank", '[data-guide-id="topbar.bank"]', ".bank-page"],
    ["shop", '[data-guide-id="topbar.shop"]', ".shopv2-page"],
  ]) {
    await clickRetry(page, page.locator(nav).first());
    await page.waitForSelector(wrapper, { timeout: 8000 });
    await page.waitForTimeout(500);
    const metrics = await page.evaluate(() => {
      const head = document.querySelector(".npc-greeting-head");
      const bubbleText = document.querySelector(".npc-bubble-text");
      const greeting = document.querySelector(".npc-greeting");
      if (!head || !bubbleText || !greeting) return null;
      const headR = head.getBoundingClientRect();
      const greetR = greeting.getBoundingClientRect();
      const fontSize = getComputedStyle(bubbleText).fontSize;
      // Nächstes Geschwister-Element NACH .npc-greeting im selben Elternteil = "Content darunter".
      const nextEl = greeting.nextElementSibling;
      const nextR = nextEl ? nextEl.getBoundingClientRect() : null;
      return {
        headW: Math.round(headR.width), headH: Math.round(headR.height),
        fontSize,
        greetingBottom: Math.round(greetR.bottom),
        nextTop: nextR ? Math.round(nextR.top) : null,
        nextTag: nextEl ? nextEl.className : null,
      };
    });
    console.log(`NPC-GREETING-METRICS[${pageId}@1366x768]:`, JSON.stringify(metrics));
    if (!metrics) { problems.push(`(NpcGreeting) ${pageId}: .npc-greeting/.npc-greeting-head/.npc-bubble-text nicht gefunden bei 1366×768`); continue; }
    if (metrics.headW !== 96 || metrics.headH !== 96) problems.push(`(NpcGreeting) ${pageId}@1366×768: Kopf-Medaillon ${metrics.headW}×${metrics.headH}px statt 96×96px`);
    if (metrics.fontSize !== "16px") problems.push(`(NpcGreeting) ${pageId}@1366×768: Sprechblasen-Text-Schriftgröße ${metrics.fontSize} statt 16px`);
    if (metrics.nextTop !== null && metrics.nextTop < metrics.greetingBottom) {
      problems.push(`(NpcGreeting) ${pageId}@1366×768: Content darunter (${metrics.nextTag}, top=${metrics.nextTop}) überlappt die Begrüßung (bottom=${metrics.greetingBottom}) — Layout-Kollision`);
    }
    await page.screenshot({ path: join(OUT_DIR, `npc-greeting-t6-${pageId}-1366.png`) });
    console.log(`SHOT SAVED: npc-greeting-t6-${pageId}-1366.png`);
  }

  console.log(problems.length ? "PROBLEME:\n- " + problems.join("\n- ") : "ALLE CHECKS GRÜN");
  console.log(errors.length ? `${errors.length} page errors:\n` + errors.slice(0, 15).join("\n") : "no page errors");
  await browser.close();
  process.exitCode = problems.length || errors.length ? 1 : 0;
} finally {
  child.kill();
}
