#!/usr/bin/env node
/**
 * TESTER 9 ("Der Chaot") — Kategorie 3: Drag&Drop-Chaos.
 * READ-ONLY. Port 5258, Fixture midgame.
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5258;
const BASE_URL = `http://localhost:${PORT}`;
const OUT_DIR = "C:\\Users\\MSchu\\AppData\\Local\\Temp\\claude\\G--GameDev\\553d2095-3a73-4795-9782-0fe746a25f13\\scratchpad\\sweep9";

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
async function clickRetry(page, locator, opts = {}) {
  try { await locator.click({ timeout: 6000, ...opts }); }
  catch { await page.waitForTimeout(400); await locator.click({ timeout: 6000, ...opts }); }
}

/** Echter HTML5-Drag via dispatchEvent (Playwright hat kein natives HTML5-DnD-Mouse-Sim — dieselbe
 *  Technik wird üblich für draggable=true-Elemente verwendet: dragstart -> dragenter -> dragover ->
 *  drop -> dragend, jeweils mit einem geteilten DataTransfer-Objekt).
 *  WICHTIG: React 18 batcht setState-Updates asynchron (Microtask) — wenn dragstart (löst
 *  setDragItem/setDragInvIdx aus) und drop (dessen onDrop-Handler-Prop von genau diesem State
 *  abhängt: `onDrop={dragItem ? ... : undefined}`) im SELBEN synchronen page.evaluate-Aufruf
 *  feuern, hat React zwischen den beiden Events noch NICHT neu gerendert — der DOM-Knoten trägt
 *  dann beim drop-Event noch den alten (undefined) Handler. Jeder Schritt läuft daher als EIGENER
 *  page.evaluate-Aufruf mit einer kurzen Pause dazwischen, damit React zwischen den Schritten
 *  flushen kann (dieselbe Klasse Bug, die auch echte User treffen könnte, falls ihr Drag schneller
 *  ist als der Render — separat unten als eigener Befund geprüft). */
async function fireDragEvent(page, sel, type, dt) {
  return page.evaluate(({ sel, type }) => {
    const el = document.querySelector(sel);
    if (!el) return { ok: false, reason: `selector not found: ${sel}` };
    const rect = el.getBoundingClientRect();
    const ev = new DragEvent(type, {
      bubbles: true, cancelable: true, dataTransfer: window.__hfDragDt,
      clientX: rect.x + rect.width / 2, clientY: rect.y + rect.height / 2,
    });
    el.dispatchEvent(ev);
    return { ok: true };
  }, { sel, type });
}

async function htmlDragDrop(page, sourceSel, targetSel, { settleMs = 120 } = {}) {
  await page.evaluate(() => { window.__hfDragDt = new DataTransfer(); });
  const r1 = await fireDragEvent(page, sourceSel, "dragstart");
  if (!r1.ok) return r1;
  await page.waitForTimeout(settleMs); // React flush zwischen dragstart (setState) und dragover/drop
  await fireDragEvent(page, targetSel, "dragenter");
  await fireDragEvent(page, targetSel, "dragover");
  await page.waitForTimeout(60);
  const r2 = await fireDragEvent(page, targetSel, "drop");
  await fireDragEvent(page, sourceSel, "dragend");
  await page.evaluate(() => { delete window.__hfDragDt; });
  return r2;
}

const { child, getOutput } = startDevServer();
const findings = [];
try {
  const ok = await waitForServer(BASE_URL);
  if (!ok) { console.error("SERVER NOT UP:\n" + getOutput()); process.exit(1); }
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });

  await page.goto(`${BASE_URL}/?fixture=midgame`, { waitUntil: "load" });
  await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
  await page.waitForTimeout(4500);

  await clickRetry(page, page.locator('[data-guide-id="topbar.character"]').first());
  await page.waitForTimeout(800);

  console.log("=== KATEGORIE 3: DRAG&DROP-CHAOS ===");

  // Sortiermodus sicherstellen: "newest" ist Voraussetzung für Slot-Umsortierung laut Code.
  const sortSelect = page.locator(".cs-sort-select");
  if (await sortSelect.count() > 0) await sortSelect.selectOption("newest").catch(() => {});
  await page.waitForTimeout(300);

  const invWraps = await page.locator(".cs-inv-slot-wrap").count();
  const emptySlots = await page.locator(".cs-inv-grid .inv-slot:not(.filled)").count();
  console.log(`Belegte Inventarslots: ${invWraps}, leere Slots: ${emptySlots}`);

  // --- 3a. Wildes Umsortieren: jeden befüllten Slot auf einen anderen befüllten Slot ziehen. ---
  const filledSelectors = [];
  for (let i = 0; i < Math.min(invWraps, 10); i++) {
    filledSelectors.push(`.cs-inv-slot-wrap:nth-of-type(${i + 1})`);
  }
  let dndErrCountBefore = errors.length;
  for (let i = 0; i < filledSelectors.length - 1; i++) {
    const res = await htmlDragDrop(page, filledSelectors[i] + " .item-cell", filledSelectors[i + 1]).catch((e) => ({ ok: false, reason: e.message }));
    if (!res.ok) console.log(`  Drag ${i}->${i + 1}: ${res.reason}`);
    await page.waitForTimeout(80);
  }
  console.log(`Wildes Umsortieren (${filledSelectors.length} Paare) fertig. Neue Fehler: ${errors.length - dndErrCountBefore}`);
  await page.screenshot({ path: join(OUT_DIR, "3a-after-wild-resort.png") });

  // --- 3b. Auf ungültiges Ziel ziehen (z.B. auf die Sidebar / auf den Titel). ---
  dndErrCountBefore = errors.length;
  const res2 = await htmlDragDrop(page, ".cs-inv-slot-wrap:nth-of-type(1) .item-cell", ".sidebar").catch((e) => ({ ok: false, reason: e.message }));
  console.log(`Drag auf Sidebar (ungültiges Ziel): ${JSON.stringify(res2)}`);
  await page.waitForTimeout(200);
  const res3 = await htmlDragDrop(page, ".cs-inv-slot-wrap:nth-of-type(1) .item-cell", ".content-header h1").catch((e) => ({ ok: false, reason: e.message }));
  console.log(`Drag auf Seitentitel (ungültiges Ziel): ${JSON.stringify(res3)}`);
  await page.waitForTimeout(300);
  console.log(`Ungültige Drop-Ziele: neue Fehler = ${errors.length - dndErrCountBefore}`);
  if (errors.length - dndErrCountBefore > 0) {
    findings.push({ sev: "MITTEL", title: "Konsolenfehler beim Droppen auf ungültiges Ziel", repro: "Inventar-Item auf Sidebar/Seitentitel ziehen", detail: errors.slice(dndErrCountBefore).join(" | ") });
  }
  await page.screenshot({ path: join(OUT_DIR, "3b-after-invalid-drop.png") });

  // --- 3c. Während des Ziehens Seite wechseln (dragstart auf Slot 1, KEIN drop, dann Nav-Klick). ---
  dndErrCountBefore = errors.length;
  await page.evaluate(() => {
    const source = document.querySelector(".cs-inv-slot-wrap:nth-of-type(1) .item-cell");
    if (!source) return;
    const dt = new DataTransfer();
    const rect = source.getBoundingClientRect();
    source.dispatchEvent(new DragEvent("dragstart", { bubbles: true, cancelable: true, dataTransfer: dt, clientX: rect.x, clientY: rect.y }));
    // KEIN dragend/drop — simuliert einen "hängengebliebenen" Drag-State.
  });
  await page.waitForTimeout(150);
  await clickRetry(page, page.locator('[data-guide-id="sidebar.combat"]').first());
  await page.waitForTimeout(600);
  const navSucceeded = await page.locator(".content-header h1 span").first().innerText().catch(() => "?");
  console.log(`Seitenwechsel während offenem Drag (kein dragend gefeuert): gelandet auf "${navSucceeded}". Neue Fehler: ${errors.length - dndErrCountBefore}`);
  await page.screenshot({ path: join(OUT_DIR, "3c-nav-during-drag.png") });
  // zurück und prüfen ob der dragItem/dragInvIdx-State picture hängt (z.B. quicksell-Zone "armed" obwohl kein Drag mehr läuft)
  await clickRetry(page, page.locator('[data-guide-id="topbar.character"]').first());
  await page.waitForTimeout(600);
  const quicksellArmedStuck = await page.locator(".cs-quicksell.armed").count();
  console.log(`Quick-Sell-Zone nach Seitenwechsel während Drag noch "armed" (State-Leck?): ${quicksellArmedStuck > 0}`);
  if (quicksellArmedStuck > 0) {
    findings.push({ sev: "MITTEL", title: "Quick-Sell-Zone bleibt 'armed' nach Seitenwechsel während laufendem Drag (dragItem-State-Leck)", repro: "Inventar-Item dragstart, dann OHNE Drop Seite wechseln und zurück zur Charakter-Seite" });
    await page.screenshot({ path: join(OUT_DIR, "3c-quicksell-stuck-armed.png") });
  }
  if (errors.length - dndErrCountBefore > 0) {
    findings.push({ sev: "MITTEL", title: "Konsolenfehler bei Seitenwechsel während offenem Drag", repro: "dragstart auf Inventar-Slot, dann Sidebar-Navigation OHNE dragend/drop", detail: errors.slice(dndErrCountBefore).join(" | ") });
  }

  // --- 3d. Quick-Sell-Zone: Item hineinziehen. ---
  dndErrCountBefore = errors.length;
  const goldBefore = await page.locator(".gold-display").first().innerText().catch(() => "?");
  const res4 = await htmlDragDrop(page, ".cs-inv-slot-wrap:nth-of-type(2) .item-cell", ".cs-quicksell").catch((e) => ({ ok: false, reason: e.message }));
  await page.waitForTimeout(400);
  const goldAfter = await page.locator(".gold-display").first().innerText().catch(() => "?");
  console.log(`Quick-Sell-Drop: ${JSON.stringify(res4)}, Gold vorher=${goldBefore} nachher=${goldAfter}`);
  await page.screenshot({ path: join(OUT_DIR, "3d-after-quicksell-drop.png") });
  console.log(`Quick-Sell: neue Fehler = ${errors.length - dndErrCountBefore}`);

  // --- 3d-bis. Doppel-Drop auf Quick-Sell OHNE Pause dazwischen (Race-Check: Doppel-Verkauf?). ---
  // Bewusst KEIN await zwischen den beiden dragstart/dragover/drop-Sequenzen — beide DataTransfer-
  // Objekte laufen parallel, um zu prüfen ob zwei rasch aufeinanderfolgende Drops denselben Slot
  // doppelt verkaufen (bzw. ob der zweite Drop auf einen inzwischen geleerten/verschobenen Slot
  // einen Fehler wirft statt still zu verpuffen).
  dndErrCountBefore = errors.length;
  const goldBeforeDbl = await page.locator(".gold-display").first().innerText().catch(() => "?");
  const dbl1 = htmlDragDrop(page, ".cs-inv-slot-wrap:nth-of-type(3) .item-cell", ".cs-quicksell", { settleMs: 20 });
  const dbl2 = htmlDragDrop(page, ".cs-inv-slot-wrap:nth-of-type(3) .item-cell", ".cs-quicksell", { settleMs: 20 });
  await Promise.allSettled([dbl1, dbl2]);
  await page.waitForTimeout(400);
  const goldAfterDbl = await page.locator(".gold-display").first().innerText().catch(() => "?");
  console.log(`Doppel-Quick-Sell (gleicher Slot, ohne Pause parallel): Gold vorher=${goldBeforeDbl} nachher=${goldAfterDbl}. Neue Fehler: ${errors.length - dndErrCountBefore}`);
  await page.screenshot({ path: join(OUT_DIR, "3d2-after-double-quicksell.png") });
  if (errors.length - dndErrCountBefore > 0) {
    findings.push({ sev: "MITTEL", title: "Konsolenfehler bei parallelem Doppel-Drop auf Quick-Sell (gleicher Slot)", repro: "Zwei überlappende dragstart/drop-Sequenzen auf denselben Inventar-Slot -> Quick-Sell-Zone", detail: errors.slice(dndErrCountBefore).join(" | ") });
  }

  console.log("\n=== FEHLER-SAMMLUNG (gesamte Session) ===");
  console.log(errors.length ? `${errors.length} Konsolen-/Page-Errors:\n` + errors.join("\n") : "Keine Konsolenfehler in der gesamten Session.");

  console.log("\n=== BEFUNDE ===");
  if (findings.length === 0) console.log("Keine Befunde in Kategorie 3.");
  for (const f of findings) console.log(`[${f.sev}] ${f.title} — ${f.repro}${f.detail ? " — " + f.detail : ""}`);

  await browser.close();
} finally {
  child.kill();
}
