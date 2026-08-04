#!/usr/bin/env node
/**
 * TESTER 8 ("Der Archivar") — Save-Flow-Deep-Dive in EINER Session:
 *  (1) Offline-Popup über den ECHTEN loadGame()-Pfad (nicht den ?offlineTest=-Hook): eine echte
 *      Save-Datei mit `savedAt` -3h gepatcht, per Klick auf die Menü-Karte geladen — Welcome-Back-
 *      Bühne muss organisch aus dem realen Offline-Catchup entstehen (Beute-Grid, XP-Aufschlüsselung).
 *  (2) Export/Import: Export aus Slot A (Zwischenablage-Kopie), Import in Slot B (anderer Charakter);
 *      danach kaputter String-Import (muss sauber ablehnen, kein Crash).
 *  (3) Portrait-Upload-Persistenz: Upload im Charakter-Screen → Speichern → Hauptmenü → Karte zeigt
 *      hochgeladenes Bild → erneut laden → Bild im Spiel noch da.
 *  (4) Autosave-Häkchen: manueller Speichern-Klick löst "Gespeichert ✓" (.just-saved) aus.
 * Read-only: nur localStorage des headless-vite betroffen. Port 5257.
 */
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5257;
const BASE_URL = `http://localhost:${PORT}`;
const OUT_DIR = "C:\\Users\\MSchu\\AppData\\Local\\Temp\\claude\\G--GameDev\\553d2095-3a73-4795-9782-0fe746a25f13\\scratchpad\\sweep8";
const SAVES_DIR = join(process.env.APPDATA, "Grim Reach", "saves");
const TEST_IMAGE = join(CLIENT_DIR, "src", "renderer", "assets", "portraits", "char_1.png");

// ── Save A (Offline-Popup + Export-Quelle): savedAt -3h, viel potenzielle Beute (hoher Char). ──
const saveAObj = JSON.parse(readFileSync(join(SAVES_DIR, "slot-1.json"), "utf8")); // "Aldric Thornwald"
const THREE_HOURS = 3 * 60 * 60 * 1000;
const originalSavedAt = saveAObj.savedAt;
saveAObj.savedAt = originalSavedAt - THREE_HOURS;
saveAObj.summary.savedAt = saveAObj.savedAt;
const saveA = JSON.stringify(saveAObj);
const SAVE_A_NAME = saveAObj.state.character.name;

// ── Save B (Import-Ziel, anderer Charakter): normales savedAt, kein Offline-Popup nötig. ──
const saveBObj = JSON.parse(readFileSync(join(SAVES_DIR, "slot-0.json"), "utf8")); // "Adhavar"
saveBObj.savedAt = Date.now() - 5000; // fast "jetzt" → kein Offline-Popup beim Laden
saveBObj.summary.savedAt = saveBObj.savedAt;
const saveB = JSON.stringify(saveBObj);
const SAVE_B_NAME = saveBObj.state.character.name;

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

const { child, getOutput } = startDevServer();
try {
  const ok = await waitForServer(BASE_URL);
  if (!ok) { console.error("SERVER NOT UP:\n" + getOutput()); process.exit(1); }
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: BASE_URL });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
  page.on("dialog", (d) => void d.accept());

  await page.addInitScript(
    ([a, b]) => {
      localStorage.setItem("hearthforge:save:0", a); // Slot 0 = Aldric (savedAt -3h)
      localStorage.setItem("hearthforge:save:1", b); // Slot 1 = Adhavar (savedAt ~jetzt)
    },
    [saveA, saveB],
  );
  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  // ═══ (1) OFFLINE-POPUP über den echten loadGame()-Pfad ═══
  await page.locator(".menu-nav-btn").nth(1).click(); // "Spiel laden"
  await page.waitForTimeout(600);
  await clickRetry(page, page.locator(".menu-slot.filled").first()); // Slot 0 = Aldric, -3h
  await page.waitForTimeout(2500);
  const offlineVisible = await page.locator(".offline-stage").count();
  console.log("OFFLINE-STAGE SICHTBAR (nach echtem Laden mit savedAt-3h):", offlineVisible > 0);
  if (offlineVisible > 0) {
    await page.waitForTimeout(4200); // Achievement-Toasts vom Fixture/Load abklingen lassen
    await page.screenshot({ path: join(OUT_DIR, "10-offline-stage-real.png") });
    console.log("SHOT SAVED: 10-offline-stage-real.png");
    const offlineInfo = await page.evaluate(() => {
      const dur = document.querySelector(".offline-stage-duration")?.textContent ?? null;
      const medallions = Array.from(document.querySelectorAll(".ofs-medallion")).map((m) => m.textContent?.trim());
      const skillRows = document.querySelectorAll(".ofs-skill-row").length;
      const lootCells = document.querySelectorAll(".ofs-loot-cell").length;
      const rareCells = document.querySelectorAll(".ofs-loot-cell.is-rare").length;
      const stage = document.querySelector(".offline-stage");
      return {
        duration: dur,
        medallions,
        skillRows,
        lootCells,
        rareCells,
        stageScrollH: stage?.scrollHeight,
        stageClientH: stage?.clientHeight,
        scaledOk: stage ? stage.scrollHeight - stage.clientHeight < 4000 : null, // grobe Sanity, kein Layout-Overflow-Wahnsinn
      };
    });
    console.log("OFFLINE-INFO:", JSON.stringify(offlineInfo, null, 1));
    // Escape schließt die Bühne (Chef-GO Hotkey).
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
    const stillOpen = await page.locator(".offline-stage").count();
    console.log("OFFLINE-STAGE NACH ESCAPE NOCH OFFEN (soll false sein):", stillOpen > 0);
    await page.screenshot({ path: join(OUT_DIR, "11-offline-stage-after-escape.png") });
    console.log("SHOT SAVED: 11-offline-stage-after-escape.png");
  } else {
    console.log("!! Kein Offline-Popup erschienen trotz savedAt-3h — moeglicher Bug oder combat war bereits gestoppt/kein Ertrag.");
    await page.screenshot({ path: join(OUT_DIR, "10b-no-offline-popup.png") });
  }

  // ═══ (4) AUTOSAVE-Häkchen: manueller Speichern-Klick ═══
  const savedLabelBefore = await page.locator(".sb-footer-save").getAttribute("title");
  await page.locator(".sb-footer-save").click();
  await page.waitForTimeout(200);
  const justSavedClass = await page.evaluate(() => document.querySelector(".sb-footer-save")?.className ?? "");
  console.log("AUTOSAVE-CHECKMARK sofort nach Klick (soll 'just-saved' enthalten):", justSavedClass);
  await page.locator(".sb-footer").screenshot({ path: join(OUT_DIR, "12-autosave-checkmark.png") });
  console.log("SHOT SAVED: 12-autosave-checkmark.png");
  await page.waitForTimeout(1700); // > 1.5s Fade-Fenster
  const justSavedClassAfter = await page.evaluate(() => document.querySelector(".sb-footer-save")?.className ?? "");
  console.log("AUTOSAVE-CHECKMARK nach 1.7s (soll wieder weg sein):", justSavedClassAfter);

  // ═══ (3) PORTRAIT-UPLOAD-PERSISTENZ ═══
  await page.locator('[data-guide-id="topbar.character"]').first().click();
  await page.waitForTimeout(1000);
  await page.locator('.cs-portrait-wrap input[type="file"]').setInputFiles(TEST_IMAGE);
  await page.waitForTimeout(1200);
  const uploadedSrc = await page.evaluate(() => document.querySelector(".cs-portrait-img")?.getAttribute("src")?.slice(0, 30));
  console.log("PORTRAIT NACH UPLOAD (soll data:image/... sein):", uploadedSrc);
  await page.locator(".cs-portrait-wrap").screenshot({ path: join(OUT_DIR, "13-portrait-uploaded.png") });
  console.log("SHOT SAVED: 13-portrait-uploaded.png");

  // Speichern + zurück ins Hauptmenü (SidebarFooter: saveGame() läuft ohnehin vor returnToMenu()).
  await page.locator(".sb-footer-menu").click();
  await page.waitForTimeout(1000);
  await page.locator(".menu-nav-btn").nth(1).click(); // "Spiel laden"
  await page.waitForTimeout(700);
  await page.screenshot({ path: join(OUT_DIR, "14-menu-card-with-uploaded-portrait.png") });
  console.log("SHOT SAVED: 14-menu-card-with-uploaded-portrait.png");
  const menuCardSrc = await page.evaluate(() => document.querySelector(".menu-slot.filled .menu-slot-portrait img")?.getAttribute("src")?.slice(0, 30));
  console.log("MENÜ-KARTE PORTRAIT NACH SPEICHERN+RÜCKKEHR (soll data:image/... sein):", menuCardSrc);

  // Erneut laden → Bild muss im Spiel selbst auch noch da sein.
  await clickRetry(page, page.locator(".menu-slot.filled").first());
  await page.waitForTimeout(2500);
  for (let i = 0; i < 2; i++) { await page.keyboard.press("Escape"); await page.waitForTimeout(400); } // evtl. Offline-Popup wegdrücken
  await page.locator('[data-guide-id="topbar.character"]').first().click();
  await page.waitForTimeout(1000);
  const reloadedSrc = await page.evaluate(() => document.querySelector(".cs-portrait-img")?.getAttribute("src")?.slice(0, 30));
  console.log("PORTRAIT NACH ERNEUTEM LADEN (soll data:image/... sein):", reloadedSrc);
  await page.locator(".cs-portrait-wrap").screenshot({ path: join(OUT_DIR, "15-portrait-after-reload.png") });
  console.log("SHOT SAVED: 15-portrait-after-reload.png");

  // ═══ (2) EXPORT/IMPORT ═══
  await page.locator(".sb-footer-menu").click(); // zurück ins Menü (speichert erneut)
  await page.waitForTimeout(1000);
  // In Slot 1 (Adhavar) laden, damit wir NICHT den geänderten Aldric-Slot exportieren, sondern
  // sauber "Export aus A, Import in B" testen — also erst Aldric (Slot 0) laden für den Export-Text.
  await page.locator(".menu-nav-btn").nth(1).click();
  await page.waitForTimeout(600);
  await clickRetry(page, page.locator(".menu-slot.filled").first()); // Slot 0 = Aldric (jetzt mit Portrait)
  await page.waitForTimeout(2500);
  for (let i = 0; i < 2; i++) { await page.keyboard.press("Escape"); await page.waitForTimeout(400); }
  await page.locator('[data-guide-id="sidebar.options"]').first().click();
  await page.waitForTimeout(800);
  // "In Zwischenablage kopieren" — zweiter Button im Save-Data-Segment.
  const exportButtons = page.locator(".opz-section--wide .opz-segment .lang-btn");
  await exportButtons.nth(1).click(); // Kopieren
  await page.waitForTimeout(400);
  const exportedJson = await page.evaluate(() => navigator.clipboard.readText());
  console.log("EXPORT-JSON LÄNGE:", exportedJson.length, "| enthält Name:", exportedJson.includes(SAVE_A_NAME));

  // Zurück ins Menü, Slot 1 (Adhavar) laden — Import-Ziel.
  await page.locator(".sb-footer-menu").click();
  await page.waitForTimeout(1000);
  await page.locator(".menu-nav-btn").nth(1).click();
  await page.waitForTimeout(600);
  await clickRetry(page, page.locator(".menu-slot.filled").nth(1)); // Slot 1 = Adhavar
  await page.waitForTimeout(2000);
  for (let i = 0; i < 2; i++) { await page.keyboard.press("Escape"); await page.waitForTimeout(400); }
  const nameBeforeImport = await page.evaluate(() => document.querySelector(".cs-portrait-img")?.getAttribute("alt") ?? null);
  console.log("CHARAKTER VOR IMPORT (Slot 1, soll Adhavar sein) — check via Options-Name unten.");
  await page.locator('[data-guide-id="sidebar.options"]').first().click();
  await page.waitForTimeout(800);
  await page.locator(".opz-textarea").fill(exportedJson);
  await page.locator(".opz-import-row .lang-btn").click(); // "Anwenden"
  await page.waitForTimeout(1000);
  const importStatus = await page.evaluate(() => ({
    ok: !!document.querySelector(".opz-status-ok"),
    error: !!document.querySelector(".opz-status-error"),
  }));
  console.log("IMPORT-STATUS (Aldric-Export → Slot 1/Adhavar):", JSON.stringify(importStatus));
  await page.screenshot({ path: join(OUT_DIR, "16-import-ok.png") });
  console.log("SHOT SAVED: 16-import-ok.png");
  // FUND (Tester 8): direkt nach dem Import feuert oft ein FALSCHES Todes-Popup + alte "Seltener
  // Fund"-Toasts (DeathPopup/Toasts.tsx diffen state.stats.deaths/Items per useRef-Snapshot vs.
  // VORHERIGEM Tick, aber importSave tauscht den State im laufenden "playing"-Screen aus OHNE
  // Remount — der Ref vergleicht also den alten Charakter gegen den frisch importierten). Robust
  // wegklicken, damit der restliche Test weiterlaufen kann; Screenshot als Beleg VOR dem Wegklicken.
  const deathModalCount = await page.locator(".death-modal").count();
  console.log("FALSCHES TODES-POPUP NACH IMPORT SICHTBAR:", deathModalCount > 0);
  if (deathModalCount > 0) {
    const deathText = await page.locator(".death-modal-body").first().textContent();
    console.log("TODES-POPUP-TEXT:", deathText);
    await page.screenshot({ path: join(OUT_DIR, "16b-FUND-false-death-after-import.png") });
    console.log("SHOT SAVED: 16b-FUND-false-death-after-import.png");
    await page.locator(".death-modal button", { hasText: /./ }).first().click();
    await page.waitForTimeout(400);
  }
  // Verifikation: Charakterseite sollte jetzt Aldric zeigen (Slot 1 wurde überschrieben).
  await clickRetry(page, page.locator('[data-guide-id="topbar.character"]').first());
  await page.waitForTimeout(800);
  const nameAfterImport = await page.evaluate(() => document.querySelector(".cs-portrait-img")?.getAttribute("alt") ?? null);
  console.log(`NAME NACH IMPORT (soll "${SAVE_A_NAME}" sein, war vorher "${SAVE_B_NAME}"):`, nameAfterImport);

  // Kaputter String-Import — muss sauber ablehnen, kein Crash.
  await page.locator('[data-guide-id="sidebar.options"]').first().click();
  await page.waitForTimeout(600);
  await page.locator(".opz-textarea").fill("{ this is not valid json at all !!! ###");
  await page.locator(".opz-import-row .lang-btn").click();
  await page.waitForTimeout(600);
  const brokenStatus = await page.evaluate(() => ({
    ok: !!document.querySelector(".opz-status-ok"),
    error: !!document.querySelector(".opz-status-error"),
  }));
  console.log("IMPORT-STATUS (kaputter String, soll error:true sein):", JSON.stringify(brokenStatus));
  await page.screenshot({ path: join(OUT_DIR, "17-import-broken-rejected.png") });
  console.log("SHOT SAVED: 17-import-broken-rejected.png");
  // App muss danach noch funktionsfähig sein (kein White-Screen).
  const stillAlive = await page.evaluate(() => !!document.querySelector(".opz-page"));
  console.log("APP NACH KAPUTTEM IMPORT NOCH FUNKTIONSFÄHIG:", stillAlive);

  console.log(errors.length ? `${errors.length} PAGE ERRORS:\n` + errors.slice(0, 25).join("\n") : "no page errors");
  await browser.close();
} finally {
  child.kill();
}
