#!/usr/bin/env node
/**
 * Headless Smoke-Test für den Lokalisierungs-Pass der 36 fehlenden newhaven.* Keys
 * (view.*, move.select-Gruppe (scale, flip, normal, reset), debug.light-Gruppe, reason.* (die 6
 * neuen Gründe), map.empty, map.buildMenu.*, map.placing.*, demolish.*, toast.demolished.*) in RU
 * und ZH.
 * Muster aus ui-audit/newhaven-audit-335.mjs (sectionI18n) übernommen, um Fixture nh_map_audit +
 * Dev-Server-Setup wiederzuverwenden. KEINE Fixes, nur Befund + Screenshots.
 *
 * Prüft:
 *  1) Toolbar (View-Tabs, Move-Umschalter, Debug-Tag/Nacht-Umschalter) — rohe i18n-Keys/Überlauf.
 *  2) Move-Modus (Auswahl-Werkzeugleiste mit move.selected/scale/flip/normal/reset).
 *  3) Abriss-Flow: Popup öffnen → Abreißen-Knopf (demolish.button) → Bestätigungsdialog
 *     (demolish.title/body/refundTitle/refundNone/yes/no) → bestätigen → Toast
 *     (toast.demolished.title/detail).
 *
 * Run: node ui-audit/i18n-newhaven-missing36-smoke.mjs   (from apps/client/)
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5346;
const BASE_URL = `http://localhost:${PORT}`;
const FIXTURE = "nh_map_audit";

const findings = [];
function log(section, level, msg) {
  console.log(`[${level}] ${section}: ${msg}`);
  findings.push({ section, level, msg });
}
const pass = (s, m) => log(s, "PASS", m);
const fail = (s, m) => log(s, "FAIL", m);
const info = (s, m) => log(s, "INFO", m);

async function waitForServer(url, t = 40000) {
  const s = Date.now();
  while (Date.now() - s < t) {
    try { const r = await fetch(url); if (r.ok) return true; } catch {}
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

function startDevServer(port) {
  const viteBin = join(CLIENT_DIR, "node_modules", "vite", "bin", "vite.js");
  const child = spawn(
    process.execPath,
    [viteBin, "dev", "--config", join(__dirname, "vite.tour.config.mjs"), "--port", String(port), "--strictPort"],
    { cwd: CLIENT_DIR, stdio: ["ignore", "pipe", "pipe"] },
  );
  let out = "";
  child.stdout.on("data", (d) => (out += d.toString()));
  child.stderr.on("data", (d) => (out += d.toString()));
  return { child, getOutput: () => out };
}

async function openNewHaven(page, locale) {
  const pageErrors = [];
  page.on("pageerror", (e) => { pageErrors.push(e.message); console.log("[page-error]", e.message); });
  page.on("console", (msg) => { if (msg.type() === "error") { pageErrors.push(msg.text()); console.log("[console-error]", msg.text()); } });
  await page.addInitScript((loc) => localStorage.setItem("hearthforge:locale", loc), locale);
  await page.goto(`${BASE_URL}/?fixture=${FIXTURE}`, { waitUntil: "load" });
  await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
  await page.waitForTimeout(600);
  await page.locator('[data-guide-id="sidebar.newhaven"]').first().click({ timeout: 8000 });
  await page.waitForSelector(".nh-map", { timeout: 10000 });
  await page.waitForTimeout(300);
  return pageErrors;
}

async function mapRect(page) {
  return page.locator(".nh-map-bg").boundingBox();
}
function expectedCenterPx(rect, frac) {
  return { x: rect.x + frac.x * rect.width, y: rect.y + frac.y * rect.height };
}
async function tileCenterPx(page, buildingId, POS) {
  const rect = await mapRect(page);
  const expected = expectedCenterPx(rect, POS[buildingId]);
  const tiles = await page.locator(".nh-map-tile").all();
  let best = null;
  let bestDist = Infinity;
  for (const t of tiles) {
    const box = await t.boundingBox();
    if (!box) continue;
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    const d = Math.hypot(cx - expected.x, cy - expected.y);
    if (d < bestDist) { bestDist = d; best = { el: t, cx, cy, box }; }
  }
  return { expected, best, distPx: bestDist };
}

const POS = {
  camp_townhall: { x: 0.50, y: 0.20 },
  camp_watchtower: { x: 0.15, y: 0.20 },
  camp_smelter: { x: 0.85, y: 0.20 },
  camp_sawpit: { x: 0.15, y: 0.75 },
  camp_storehouse: { x: 0.50, y: 0.55 },
  camp_trophy_wall: { x: 0.54, y: 0.60 },
  camp_fence_tent: { x: 0.85, y: 0.75 },
};

function findRawKeys(page) {
  return page.evaluate(() => {
    const root = document.querySelector(".newhaven-page");
    if (!root) return [];
    const out = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode())) {
      const t = n.textContent.trim();
      if (/^newhaven(\.[a-zA-Z0-9_]+){2,}$/.test(t)) out.push(t);
    }
    return out;
  });
}
function findOverflow(page, sel) {
  return page.evaluate((sel) => {
    const out = [];
    for (const el of document.querySelectorAll(sel)) {
      if (el.scrollWidth > el.clientWidth + 2) out.push({ cls: el.className, text: el.textContent.trim().slice(0, 80), scrollW: el.scrollWidth, clientW: el.clientWidth });
    }
    return out;
  }, sel);
}

async function runLocale(browser, locale) {
  const S = `i18n-Smoke 36 fehlende Keys (${locale})`;
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const errs = await openNewHaven(page, locale);

  // 1) Toolbar (View-Tabs, Move-Umschalter, Debug-Tag/Nacht) im Kartenmodus.
  await page.waitForTimeout(200);
  await page.screenshot({ path: join(__dirname, `nh-missing36-${locale}-01-toolbar.png`) });
  let raw = await findRawKeys(page);
  if (raw.length === 0) pass(S, "Toolbar: keine rohen i18n-Keys sichtbar.");
  else fail(S, `Toolbar: rohe i18n-Keys sichtbar: ${raw.join(", ")}`);
  let overflow = await findOverflow(page, ".nh-view-tab, .nh-capacity");
  if (overflow.length === 0) pass(S, "Toolbar: kein Textüberlauf in den View-/Debug-Tabs.");
  else for (const o of overflow) fail(S, `Toolbar-Überlauf: "${o.text}" (${o.cls}) scrollW=${o.scrollW} > clientW=${o.clientW}.`);

  // 2) Move-Modus: Werkzeugleiste (move.selected/scale/flip/normal/reset).
  await page.click(".nh-move-toggle");
  await page.waitForTimeout(150);
  const wt = await tileCenterPx(page, "camp_watchtower", POS);
  if (wt.best) {
    await wt.best.el.click();
    await page.waitForTimeout(200);
  } else {
    fail(S, "Move-Modus: camp_watchtower-Kachel nicht gefunden, Werkzeugleiste nicht geprüft.");
  }
  await page.screenshot({ path: join(__dirname, `nh-missing36-${locale}-02-movemode.png`) });
  raw = await findRawKeys(page);
  if (raw.length === 0) pass(S, "Move-Modus: keine rohen i18n-Keys sichtbar.");
  else fail(S, `Move-Modus: rohe i18n-Keys sichtbar: ${raw.join(", ")}`);
  overflow = await findOverflow(page, ".nh-map-object-tools-head label, .nh-map-object-tools output, .nh-map-calibration-empty");
  if (overflow.length === 0) pass(S, "Move-Modus: kein Textüberlauf in der Werkzeugleiste.");
  else for (const o of overflow) fail(S, `Move-Werkzeugleisten-Überlauf: "${o.text}" (${o.cls}) scrollW=${o.scrollW} > clientW=${o.clientW}.`);
  // Move-Modus wieder verlassen.
  await page.click(".nh-move-toggle");
  await page.waitForTimeout(150);

  // 3) Abriss-Flow: Popup -> demolish.button -> Confirm -> Toast (toast.demolished.*).
  const wt2 = await tileCenterPx(page, "camp_watchtower", POS);
  if (!wt2.best) { fail(S, "Abriss-Flow: camp_watchtower-Kachel für Popup nicht gefunden."); await page.close(); return; }
  await wt2.best.el.click();
  await page.waitForSelector(".nh-popup", { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(400);
  const demolishBtn = page.locator(".nh-demolish-btn");
  if (await demolishBtn.count() === 0) {
    fail(S, "Abriss-Flow: kein Abreißen-Knopf im Popup sichtbar (demolishReason evtl. != ok) — Flow übersprungen.");
    await page.close();
    return;
  }
  await demolishBtn.click();
  await page.waitForTimeout(250);
  const confirmVisible = await page.locator(".nh-confirm-title").count();
  if (confirmVisible > 0) pass(S, "Abriss-Flow: Bestätigungsdialog (demolish.title/body/refund*) öffnet.");
  else fail(S, "Abriss-Flow: Bestätigungsdialog öffnete nicht nach Klick auf Abreißen.");
  await page.screenshot({ path: join(__dirname, `nh-missing36-${locale}-03-demolish-confirm.png`) });
  raw = await findRawKeys(page);
  if (raw.length === 0) pass(S, "Abriss-Bestätigung: keine rohen i18n-Keys sichtbar.");
  else fail(S, `Abriss-Bestätigung: rohe i18n-Keys sichtbar: ${raw.join(", ")}`);

  // Bestätigen -> Toast.
  const yesBtn = page.locator(".nh-confirm-actions button, .modal button", { hasText: /./ }).last();
  // Robuster: alle Buttons im Confirm-Overlay, letzter ist "yes" laut DemolishConfirm-JSX-Reihenfolge (no, yes).
  const confirmButtons = page.locator(".modal-overlay .modal button");
  const btnCount = await confirmButtons.count();
  if (btnCount >= 1) {
    await confirmButtons.last().click();
  } else {
    fail(S, "Abriss-Flow: keine Bestätigungs-Buttons gefunden, Toast-Test übersprungen.");
    await page.close();
    return;
  }
  await page.waitForTimeout(300);
  const toastTitle = await page.locator(".toast-title").first().textContent().catch(() => null);
  const toastDetail = await page.locator(".toast-detail").first().textContent().catch(() => null);
  if (toastTitle && toastTitle.trim().length > 0 && !/^newhaven\./.test(toastTitle.trim())) {
    pass(S, `Abriss-Toast erscheint mit Titel "${toastTitle.trim()}" und Detail "${toastDetail?.trim()}".`);
  } else {
    fail(S, `Abriss-Toast fehlt oder zeigt einen rohen Key (Titel: "${toastTitle}").`);
  }
  await page.screenshot({ path: join(__dirname, `nh-missing36-${locale}-04-demolish-toast.png`) });

  if (errs.length > 0) fail(S, `Browser-Konsolenfehler: ${errs.slice(0, 5).join(" | ")}`);
  await page.close();
}

async function main() {
  console.log(`[smoke] starting dev server on port ${PORT}...`);
  const server = startDevServer(PORT);
  const up = await waitForServer(BASE_URL);
  if (!up) { console.error("DEV SERVER NOT UP:\n" + server.getOutput()); server.child.kill(); process.exitCode = 1; return; }

  const browser = await chromium.launch();
  try {
    for (const locale of ["ru", "zh"]) {
      console.log(`\n===== Locale ${locale} =====`);
      try {
        await runLocale(browser, locale);
      } catch (err) {
        fail(`Locale ${locale}`, `Abgebrochen mit Ausnahme: ${err.message}`);
      }
    }
  } finally {
    await browser.close();
    server.child.kill();
  }

  const failCount = findings.filter((f) => f.level === "FAIL").length;
  const passCount = findings.filter((f) => f.level === "PASS").length;
  console.log(`\n[smoke] done. PASS=${passCount} FAIL=${failCount} INFO=${findings.filter((f) => f.level === "INFO").length}`);
  if (failCount > 0) {
    console.log("\n=== FAIL-Zusammenfassung ===");
    for (const f of findings.filter((x) => x.level === "FAIL")) console.log(`  - [${f.section}] ${f.msg}`);
  }
}

main().catch((err) => {
  console.error("[smoke] fatal:", err);
  process.exitCode = 1;
});
