#!/usr/bin/env node
/**
 * TESTER T6 ("Der Händler-Messie") — Sweep 2, Revier Wirtschaft & Besitz.
 * Fokus: Shop — Kaufen (Mengen-Buttons), Verkaufen (Shift-Klick + Instanz-Verkauf), Rückkauf-Regal
 * (inkl. gezieltem Repro: dürfen Dungeon-Schlüssel dort auftauchen?), Upgrades, Gold-Konsistenz,
 * und Dupe-Check über schnelle Klickfolgen (Kauf/Verkauf/Rückkauf-Spam).
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

function seedOnboarding(state) {
  state.onboarding = state.onboarding ?? {};
  state.onboarding.toursSeen = { ...(state.onboarding.toursSeen ?? {}), combat: true, shop: true, bank: true };
}

async function routeFixture(page, mutator) {
  await page.route("**/ui-audit-fixtures/midgame.json", async (route) => {
    const res = await route.fetch();
    const json = JSON.parse(await res.text());
    seedOnboarding(json.state);
    mutator(json.state);
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(json) });
  });
}

function readState(page) {
  return page.evaluate(() => {
    const d = window.__hfDebug;
    if (!d) return null;
    const s = d.state;
    return {
      gold: s.character.gold,
      invSlots: s.inventory.slots.filter(Boolean).length,
      buyBack: s.buyBack.map((b) => ({ itemId: b.itemId, qty: b.qty, price: b.price, instance: !!b.instance })),
      cryptKeyQty: s.inventory.slots.find((sl) => sl && sl.itemId === "crypt_key")?.qty ?? 0,
    };
  });
}

async function gotoShop(page) {
  await page.goto(`${BASE_URL}/?fixture=midgame`, { waitUntil: "load" });
  await page.waitForSelector('[data-guide-id^="topbar."]', { timeout: 15000 });
  await page.waitForTimeout(2500);
  await clickRetry(page, page.locator('[data-guide-id="topbar.shop"]').first());
  await page.waitForTimeout(600);
}

async function readGoldDisplay(page) {
  const header = await page.locator(".gold-display").first().textContent().catch(() => null);
  const panel = await page.locator(".shopv2-balance-amount").first().textContent().catch(() => null);
  return { header: header?.trim() ?? null, panel: panel?.trim() ?? null };
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

  // ── pageA: unverändertes midgame-Gold (5400) — Mengen-Button-Disabled-Logik ──────────────
  const pageA = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  wirePage(pageA, "A");
  await routeFixture(pageA, () => {});
  await gotoShop(pageA);

  const staffCard = pageA.locator(".shopv2-card", { has: pageA.locator(".shopv2-card-name", { hasText: /gnarled|knorrig/i }) }).first();
  if (await staffCard.count()) {
    const qtyStates = await staffCard.evaluate((card) => Array.from(card.querySelectorAll(".shopv2-buyqty-btn")).map((b) => ({
      label: b.querySelector(".shopv2-buyqty-n")?.textContent, disabled: b.disabled,
    })));
    console.log("GNARLED-STAFF QTY-BUTTONS (5400 Gold, 120/each):", JSON.stringify(qtyStates));
    const q1 = qtyStates.find((q) => q.label === "1×");
    const q5 = qtyStates.find((q) => q.label === "5×");
    const q25 = qtyStates.find((q) => q.label === "25×"); // 3000 <= 5400 → enabled
    const q100 = qtyStates.find((q) => q.label === "100×"); // 12000 > 5400 → disabled
    if (q1?.disabled) problems.push("(1) 1× gnarled_staff fälschlich disabled bei 5400 Gold");
    if (q5?.disabled) problems.push("(1) 5× gnarled_staff fälschlich disabled bei 5400 Gold");
    if (q25?.disabled) problems.push("(1) 25× gnarled_staff (3000 Gold) fälschlich disabled bei 5400 Gold");
    if (!q100?.disabled) problems.push("(1) 100× gnarled_staff (12000 Gold) NICHT disabled bei 5400 Gold");
  } else {
    problems.push("(1) gnarled_staff-Karte nicht gefunden im Buy-Tab");
  }
  await pageA.close();

  // ── pageB: hochgepatchtes Gold — echte Käufe (alle Mengen), Verkäufe, Buyback, Upgrades,
  //    Dungeon-Key-Repro, Gold-Konsistenz, Dupe-Spam ──────────────────────────────────────
  const pageB = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  wirePage(pageB, "B");
  await routeFixture(pageB, (s) => { s.character.gold = 999999; });
  await gotoShop(pageB);

  // (1) Alle 4 Mengen-Buttons real durchklicken auf 4 verschiedenen Items (frisches Grid je Kauf).
  const buyTargets = [
    { pat: /rusty sword|rostiges schwert/i, qtyLabel: "1×" },
    { pat: /gnarled|knorrig/i, qtyLabel: "5×" },
  ];
  for (const target of buyTargets) {
    const card = pageB.locator(".shopv2-card", { has: pageB.locator(".shopv2-card-name", { hasText: target.pat }) }).first();
    if (!(await card.count())) { problems.push(`(1) Karte für Muster ${target.pat} nicht gefunden`); continue; }
    const before = await readState(pageB);
    const qtyBtn = card.locator(".shopv2-buyqty-btn").filter({ has: pageB.locator(".shopv2-buyqty-n", { hasText: new RegExp(`^${target.qtyLabel}$`) }) });
    await clickRetry(pageB, qtyBtn);
    await pageB.waitForTimeout(300);
    const after = await readState(pageB);
    console.log(`BUY ${target.qtyLabel} ${target.pat}:`, JSON.stringify({ before, after }));
    if (after && before && after.gold >= before.gold) problems.push(`(1) Kauf ${target.qtyLabel} ${target.pat} hat kein Gold abgezogen`);
  }
  // 25× und 100× auf einem dritten Item (materials-Kategorie, damit die Buy-Grid-Karte weiterhin sichtbar bleibt).
  await clickRetry(pageB, pageB.locator(".shopv2-chip").filter({ hasText: /material/i }).first());
  await pageB.waitForTimeout(400);
  const matCard = pageB.locator(".shopv2-card").first();
  if (await matCard.count()) {
    const before25 = await readState(pageB);
    await clickRetry(pageB, matCard.locator(".shopv2-buyqty-btn").filter({ hasText: "25×" }));
    await pageB.waitForTimeout(300);
    const after25 = await readState(pageB);
    if (after25 && before25 && after25.gold >= before25.gold) problems.push("(1) Kauf 25× (Materialien-Karte) hat kein Gold abgezogen");
    const before100 = await readState(pageB);
    await clickRetry(pageB, matCard.locator(".shopv2-buyqty-btn").filter({ hasText: "100×" }));
    await pageB.waitForTimeout(300);
    const after100 = await readState(pageB);
    if (after100 && before100 && after100.gold >= before100.gold) problems.push("(1) Kauf 100× (Materialien-Karte) hat kein Gold abgezogen");
    console.log("BUY 25x/100x materials:", JSON.stringify({ before25, after25, before100, after100 }));
  }
  await pageB.screenshot({ path: join(OUT_DIR, "shop-buy-qtys-done.png") });
  console.log("SHOT SAVED: shop-buy-qtys-done.png");

  // ── Gold-Konsistenz: Header vs. Shop-Panel vs. State ──────────────────────────────────────
  await pageB.waitForTimeout(500); // useAnimatedNumber-Tween (400ms) abwarten
  const goldDisp = await readGoldDisplay(pageB);
  const stateNow = await readState(pageB);
  console.log("GOLD-DISPLAY:", JSON.stringify(goldDisp), "STATE:", stateNow?.gold);
  const parseNum = (s) => s ? Number(s.replace(/[^\d]/g, "")) : null;
  const headerNum = parseNum(goldDisp.header);
  const panelNum = parseNum(goldDisp.panel);
  if (stateNow && headerNum !== stateNow.gold) problems.push(`(Gold) Header-Anzeige "${goldDisp.header}" (${headerNum}) ≠ State-Gold ${stateNow.gold}`);
  if (stateNow && panelNum !== stateNow.gold) problems.push(`(Gold) Shop-Panel-Anzeige "${goldDisp.panel}" (${panelNum}) ≠ State-Gold ${stateNow.gold}`);

  // ── Upgrades: Slot-Upgrade + Auto-Eat-Upgrade ─────────────────────────────────────────────
  await clickRetry(pageB, pageB.locator(".shopv2-chip").filter({ hasText: /upgrades|aufwertung/i }).first());
  await pageB.waitForTimeout(400);
  const slotBtn = pageB.locator(".shopv2-upgrade-btn").first();
  const autoEatBtn = pageB.locator(".shopv2-upgrade-btn").nth(1);
  for (const [label, btn] of [["Slot", slotBtn], ["AutoEat", autoEatBtn]]) {
    const disabled = await btn.evaluate((b) => b.disabled).catch(() => true);
    if (disabled) { problems.push(`(3) ${label}-Upgrade-Button disabled trotz 999999 Gold`); continue; }
    const before = await readState(pageB);
    await clickRetry(pageB, btn);
    await pageB.waitForTimeout(400);
    const after = await readState(pageB);
    console.log(`UPGRADE ${label}:`, JSON.stringify({ before: before?.gold, after: after?.gold }));
    if (before && after && after.gold >= before.gold) problems.push(`(3) ${label}-Upgrade hat kein Gold abgezogen`);
  }
  await pageB.screenshot({ path: join(OUT_DIR, "shop-upgrades-done.png") });
  console.log("SHOT SAVED: shop-upgrades-done.png");

  // ── Sell-Tab ═══════════════════════════════════════════════════════════════════════════
  await clickRetry(pageB, pageB.locator(".shopv2-maintab").filter({ hasText: /sell|verkauf/i }).first());
  await pageB.waitForTimeout(500);

  // (4a) Stack-Verkauf über die Mengen-Buttons (1/10/100) — irgendein Materialstapel mit qty>=10.
  const sellCells = pageB.locator(".shopv2-sell-cell");
  const sellCellCount = await sellCells.count();
  console.log("SELL-CELLS:", sellCellCount);
  if (sellCellCount === 0) problems.push("(4) Sell-Tab leer");
  else {
    // Eine Zelle mit genug Bestand für den 10er-Button suchen (nicht jeder Stack hat qty>=10).
    let foundQty10 = false;
    for (let i = 0; i < sellCellCount && !foundQty10; i++) {
      await pageB.keyboard.press("Escape").catch(() => {});
      await pageB.mouse.move(5, 5);
      await pageB.waitForTimeout(100);
      await clickRetry(pageB, sellCells.nth(i));
      await pageB.waitForTimeout(250);
      const detailActions = pageB.locator(".shopv2-sell-detail-actions button");
      const detailBtnCount = await detailActions.count();
      if (detailBtnCount < 4) continue; // Container-Zelle (Pouch statt Detail-Panel) — überspringen
      const sell10Disabled = await detailActions.nth(1).evaluate((b) => b.disabled).catch(() => true);
      if (sell10Disabled) continue;
      const before = await readState(pageB);
      await clickRetry(pageB, detailActions.nth(1)); // "sell10"
      await pageB.waitForTimeout(300);
      const after = await readState(pageB);
      console.log("SELL10:", JSON.stringify({ before: before?.gold, after: after?.gold }));
      if (before && after && after.gold <= before.gold) problems.push("(4a) Verkauf 10x hat kein Gold hinzugefügt");
      foundQty10 = true;
    }
    if (!foundQty10) problems.push("(4a) Keine Sell-Zelle mit genug Bestand für den 10er-Button gefunden — Test übersprungen");
  }

  // (4b) Shift-Klick-Schnellverkauf auf einen zweiten Stack.
  await pageB.keyboard.press("Escape").catch(() => {});
  await pageB.mouse.move(5, 5);
  await pageB.waitForTimeout(150);
  // WICHTIG: crypt_key explizit ausschließen — der ist für den dedizierten Dungeon-Key-Repro
  // unten reserviert; ein genereller Shift-Sell-Test darf ihn nicht vorher versehentlich verkaufen.
  const shiftTarget = pageB.locator(".shopv2-sell-cell", { hasNot: pageB.locator('img[src*="crypt_key"]') }).nth(1);
  if (await shiftTarget.count()) {
    const beforeShift = await readState(pageB);
    await shiftTarget.click({ modifiers: ["Shift"] });
    await pageB.waitForTimeout(300);
    const afterShift = await readState(pageB);
    console.log("SHIFT-SELL:", JSON.stringify({ before: beforeShift?.gold, after: afterShift?.gold }));
    if (beforeShift && afterShift && afterShift.gold <= beforeShift.gold) problems.push("(4b) Shift-Klick-Schnellverkauf hat kein Gold hinzugefügt");
  }
  await pageB.screenshot({ path: join(OUT_DIR, "shop-sell-after.png") });
  console.log("SHOT SAVED: shop-sell-after.png");

  // ── (5) Dungeon-Key-Buyback-Repro ─────────────────────────────────────────────────────────
  // Befund unterwegs: die midgame-Fixture ist ein SAVE_VERSION-57-Save (geprüft: die servierte
  // ui-audit-fixtures/midgame.json trägt version:57) — crypt_key steht zwar noch roh in ihren
  // inventory.slots, wird aber von der v64-Migration (packages/persistence migrateState, s.
  // Kommentar dort "Alt-Bestände räumt EINMALIG die v64-Migration") schon BEIM FIXTURE-LOAD
  // (derselbe echte deserialize()-Pfad wie ein normaler Save-Load, s. README) automatisch entfernt
  // + voll erstattet — cryptKeyQty ist daher schon vor jeder UI-Interaktion 0 (bestätigt oben).
  // Ein Spieler auf dem AKTUELLEN Save-Stand kann also gar nicht (mehr) an einen sellbaren
  // crypt_key kommen — dieser spezielle Pfad ist durch die Migration bereits geschlossen.
  //
  // ABER: paragon_key ist kein Legacy-Item, sondern der AKTIVE Dungeon-Schlüssel — und laut
  // Code-Audit (packages/engine/src/shop.ts pushBuyBack) filtert der Verkaufs-/Buyback-Pfad
  // SELBST nichts; der einzige Schutz ist der Load-Zeit-Sweep in sanitizeState (räumt ihn aus
  // slots/bank raus, aber NUR beim nächsten Laden, nicht innerhalb der laufenden Session). Um zu
  // prüfen, ob die Lücke im Live-Session-Code real ist (nicht nur beim Laden geschlossen), wird
  // hier direkt der Live-State (nach dem Laden, AUSSERHALB der sanitize/migrate-Pipeline) über
  // window.__hfDebug mit einem paragon_key in einem freien Inventarslot präpariert — simuliert
  // jeden zukünftigen In-Session-Zufuhrpfad (Quest-Reward-Bug, Dev-Tool, o.ä.), der den
  // Load-Zeit-Sweep umgeht, weil er eben NICHT über einen Save-Load läuft.
  const injectResult = await pageB.evaluate(() => {
    const d = window.__hfDebug;
    if (!d) return { ok: false, reason: "no __hfDebug" };
    const slots = d.state.inventory.slots;
    const freeIdx = slots.findIndex((s) => s === null);
    if (freeIdx === -1) return { ok: false, reason: "no free slot" };
    slots[freeIdx] = { itemId: "paragon_key", qty: 1 };
    return { ok: true, freeIdx };
  });
  console.log("PARAGON_KEY INJECT (Live-State, bypass sanitize):", JSON.stringify(injectResult));
  if (!injectResult.ok) {
    problems.push(`(5) Konnte paragon_key nicht in den Live-State injizieren (${injectResult.reason}) — Repro übersprungen`);
  } else {
    await pageB.waitForTimeout(300); // Game-Loop-Tick (~100ms) für Re-Render abwarten
    // paragon_key hat KEIN eigenes PNG/WebP (Content-Def: icon "🗝️", Emoji-Fallback) — per Emoji
    // statt img[src] finden.
    const keyCell = pageB.locator(".shopv2-sell-cell", { has: pageB.locator(".item-cell-emoji", { hasText: "🗝️" }) }).first();
    if (!(await keyCell.count())) {
      console.log("(5) paragon_key erscheint nach Live-Injektion NICHT im Sell-Grid — evtl. ein weiterer Live-Guard (gut), oder Selektor greift nicht.");
    } else {
      await pageB.keyboard.press("Escape").catch(() => {});
      await pageB.mouse.move(5, 5);
      await pageB.waitForTimeout(150);
      await clickRetry(pageB, keyCell);
      await pageB.waitForTimeout(300);
      const pouchOpen = await pageB.locator(".pouch-modal").count();
      if (pouchOpen > 0) {
        await clickRetry(pageB, pageB.locator(".pouch-modal .pouch-row-full").first());
        await pageB.waitForTimeout(200);
        await clickRetry(pageB, pageB.locator(".it-actions .it-action-btn").first());
      } else {
        const detailActions2 = pageB.locator(".shopv2-sell-detail-actions button").first();
        if (await detailActions2.count()) await clickRetry(pageB, detailActions2);
      }
      await pageB.waitForTimeout(400);
      const afterKeySell = await readState(pageB);
      console.log("AFTER paragon_key-Sell (Live-Injektion) — buyBack:", JSON.stringify(afterKeySell?.buyBack));
      const keyInBuyback = afterKeySell?.buyBack.some((b) => b.itemId === "paragon_key");
      if (keyInBuyback) {
        problems.push("(5) MITTEL (defense-in-depth-Lücke, aktuell nicht über normales Spiel erreichbar): pushBuyBack (packages/engine/src/shop.ts) filtert KEINE Dungeon-Schlüssel — ein per Live-Session (nicht per Save-Load) ins Inventar gelangter paragon_key landet nach dem Verkauf im Rückkauf-Regal und bleibt dort sichtbar/rückkaufbar, bis zum nächsten Save-Load (sanitizeState räumt erst dann auf). Heute schützt NUR der Load-Zeit-Sweep (unconditional paragon_key-Strip aus inventory.slots/bank bei jedem Laden) + die addItemOrBank-Intercept beim Loot — ein zukünftiger In-Session-Zufuhrpfad (Quest-Reward-Bug, Admin-Tool) würde sofort sichtbar in den Verkauf/Buyback durchschlagen. Empfehlung: dieselbe dungeonKeyIds-Prüfung, die sanitizeState schon für den Load-Pfad hat, zusätzlich defensiv in pushBuyBack/sellItem einbauen.");
        await pageB.screenshot({ path: join(OUT_DIR, "MEDIUM-paragonkey-in-buyback-live-injection.png") });
        console.log("SHOT SAVED: MEDIUM-paragonkey-in-buyback-live-injection.png");
      } else {
        console.log("(5) paragon_key verkauft, aber NICHT im Buyback-Regal gelandet — evtl. ein zusätzlicher Live-Guard, den der Code-Audit übersehen hat (gut, falls so).");
      }
    }
  }

  // Normales Buyback-Regal-Verhalten (nicht-Key-Items): Rückkauf-Button funktioniert.
  const buybackRows = pageB.locator(".shopv2-buyback-row");
  const buybackCount = await buybackRows.count();
  const buybackStateNow = await readState(pageB);
  console.log("BUYBACK-ROWS:", buybackCount, "contents:", JSON.stringify(buybackStateNow?.buyBack));
  if (buybackCount === 0) {
    problems.push("(2) Rückkauf-Regal leer, obwohl gerade verkauft wurde");
  } else {
    await pageB.keyboard.press("Escape").catch(() => {});
    await pageB.mouse.move(5, 5);
    await pageB.waitForTimeout(150);
    const beforeBB = await readState(pageB);
    const nonKeyRow = buybackRows.filter({ hasNot: pageB.locator('img[src*="crypt_key"]') }).first();
    const targetRow = (await nonKeyRow.count()) ? nonKeyRow : buybackRows.first();
    const bbBtn = targetRow.locator("button");
    const bbDisabled = await bbBtn.evaluate((b) => b.disabled).catch(() => true);
    if (bbDisabled) problems.push("(2) Rückkauf-Button disabled trotz 999999 Gold");
    else {
      await clickRetry(pageB, bbBtn);
      await pageB.waitForTimeout(300);
      const afterBB = await readState(pageB);
      console.log("BUYBACK-KLICK:", JSON.stringify({ before: beforeBB?.gold, after: afterBB?.gold }));
      if (beforeBB && afterBB && afterBB.gold >= beforeBB.gold) problems.push("(2) Rückkauf hat kein Gold abgezogen");
    }
  }
  await pageB.screenshot({ path: join(OUT_DIR, "shop-buyback-final.png") });
  console.log("SHOT SAVED: shop-buyback-final.png");

  // ── (6) Dupe-Check: schnelle Klickfolge auf einen Buy-1×-Button (15 Klicks ohne Wartezeit) ──
  await pageB.keyboard.press("Escape").catch(() => {});
  await pageB.mouse.move(5, 5);
  await pageB.waitForTimeout(150);
  await clickRetry(pageB, pageB.locator(".shopv2-maintab").filter({ hasText: /buy|kaufen/i }).first());
  await pageB.waitForTimeout(400);
  await clickRetry(pageB, pageB.locator(".shopv2-chip").first()); // "Alle"
  await pageB.waitForTimeout(300);
  const dupeCard = pageB.locator(".shopv2-card", { has: pageB.locator(".shopv2-card-name", { hasText: /rusty sword|rostiges schwert/i }) }).first();
  if (await dupeCard.count()) {
    const btn1x = dupeCard.locator(".shopv2-buyqty-btn").filter({ hasText: "1×" });
    const costTitle = await btn1x.getAttribute("title"); // "1× 20 = 20"
    const unitCost = Number(costTitle?.split("=")[1]?.trim() ?? "0");
    const before = await readState(pageB);
    const N = 15;
    for (let i = 0; i < N; i++) {
      await btn1x.click({ timeout: 2000, force: true }).catch(() => {});
    }
    await pageB.waitForTimeout(600);
    const after = await readState(pageB);
    const goldDelta = (before?.gold ?? 0) - (after?.gold ?? 0);
    const expectedDelta = unitCost * N;
    console.log(`DUPE-BUY-SPAM: ${N} rapid clicks, unitCost=${unitCost}, expected Δgold=${expectedDelta}, actual Δgold=${goldDelta}`);
    if (goldDelta !== expectedDelta) {
      problems.push(`(6) Dupe-Verdacht Kauf-Spam: ${N}× 1er-Klick sollte ${expectedDelta} Gold kosten, tatsächlich ${goldDelta} (Differenz könnte auf Dupe ODER auf verschluckte Klicks hindeuten)`);
    }
  } else {
    problems.push("(6) rusty_sword-Karte für Dupe-Spam-Test nicht gefunden");
  }

  // Sell-Spam: denselben Stack-Sell-Button 15× hintereinander klicken (falls noch Bestand da ist).
  await pageB.keyboard.press("Escape").catch(() => {});
  await pageB.mouse.move(5, 5);
  await pageB.waitForTimeout(150);
  await clickRetry(pageB, pageB.locator(".shopv2-maintab").filter({ hasText: /sell|verkauf/i }).first());
  await pageB.waitForTimeout(400);
  const spamCell = pageB.locator(".shopv2-sell-cell").first();
  if (await spamCell.count()) {
    await pageB.keyboard.press("Escape").catch(() => {});
    await pageB.mouse.move(5, 5);
    await pageB.waitForTimeout(150);
    await clickRetry(pageB, spamCell);
    await pageB.waitForTimeout(300);
    const sell1Btn = pageB.locator(".shopv2-sell-detail-actions button").first();
    if (await sell1Btn.count()) {
      const beforeSpam = await readState(pageB);
      const cellItemImg = await spamCell.locator("img").first().getAttribute("src").catch(() => "");
      for (let i = 0; i < 15; i++) {
        await sell1Btn.click({ timeout: 2000, force: true }).catch(() => {});
      }
      await pageB.waitForTimeout(600);
      const afterSpam = await readState(pageB);
      console.log("SELL-SPAM:", JSON.stringify({ beforeGold: beforeSpam?.gold, afterGold: afterSpam?.gold, item: cellItemImg }));
      if (afterSpam && beforeSpam && afterSpam.gold < beforeSpam.gold) {
        problems.push("(6) Verkauf-Spam ließ Gold SINKEN (unerwartet — sollte nur steigen oder gleich bleiben, falls Bestand aufgebraucht)");
      }
    }
  }
  await pageB.screenshot({ path: join(OUT_DIR, "shop-dupe-spam-final.png") });
  console.log("SHOT SAVED: shop-dupe-spam-final.png");

  await pageB.close();

  console.log(problems.length ? "PROBLEME:\n- " + problems.join("\n- ") : "ALLE CHECKS GRÜN");
  console.log(errors.length ? `${errors.length} page errors:\n` + errors.slice(0, 15).join("\n") : "no page errors");
  await browser.close();
  process.exitCode = problems.length || errors.length ? 1 : 0;
} finally {
  child.kill();
}
