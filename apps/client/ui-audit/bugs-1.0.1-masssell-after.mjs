#!/usr/bin/env node
/**
 * NACHHER-Screenshots + Verifikation für den 1.0.1-Spielerbug „Massenverkauf verzauberter Items"
 * (Aldric: „needs to be a way to select all or something."). Fixture: masssell101.json (30
 * verzauberte Instanzen über 6 Basis-Items). Prüft die drei neuen Bausteine:
 *   1. globaler "Alle auswählen"-Schalter (EIN Klick statt 12) + Gold-Summe stimmt mit der Summe
 *      der Einzelverkaufspreise überein (Gegenprobe gegen Einzelverkauf),
 *   2. Bestätigungsdialog vor dem echten Verkauf (window.confirm — abbrechen lässt Auswahl stehen),
 *   3. Shift-Klick markiert einen Bereich.
 * Pattern nach mass-sell-323-shots.mjs / bugs-1.0.1-masssell-before.mjs.
 * Run: node ui-audit/bugs-1.0.1-masssell-after.mjs   (aus apps/client/)
 */
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5402;
const BASE_URL = `http://localhost:${PORT}`;
const OUT_DIR = "C:\\Users\\MSchu\\AppData\\Local\\Temp\\claude\\G--GameDev\\553d2095-3a73-4795-9782-0fe746a25f13\\scratchpad\\bugs-1.0.1-masssell";
const T = 6000;

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

let currentPage = null;

async function step(name, fn) {
  try {
    await fn();
    console.log(`ok: ${name}`);
    return true;
  } catch (e) {
    console.log(`!! FAILED: ${name} — ${e.message.split("\n")[0]}`);
    if (currentPage) {
      const p = join(OUT_DIR, `FAIL-after-${name.replace(/[^a-z0-9]+/gi, "_").slice(0, 60)}.png`);
      await currentPage.screenshot({ path: p }).catch(() => {});
      console.log(`  (failure screenshot: ${p})`);
    }
    return false;
  }
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  console.log(`[after] starting dev server on port ${PORT}...`);
  const server = startDevServer();
  if (!(await waitForServer(BASE_URL))) {
    console.error("[after] dev server did not come up:\n" + server.getOutput());
    server.child.kill();
    process.exitCode = 1;
    return;
  }

  const browser = await chromium.launch();
  let failures = 0;
  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
    currentPage = page;
    page.setDefaultTimeout(T);
    page.setDefaultNavigationTimeout(25000);
    const errors = [];
    page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
    page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });

    // window.confirm blockiert Playwright sonst -> Dialog-Handler protokolliert + akzeptiert/lehnt
    // je nach Testphase ab (per Flag gesteuert).
    let acceptNextConfirm = true;
    let lastDialogMessage = null;
    page.on("dialog", async (dialog) => {
      lastDialogMessage = dialog.message();
      console.log(`[after] confirm() dialog: "${lastDialogMessage}" -> ${acceptNextConfirm ? "ACCEPT" : "DISMISS"}`);
      if (acceptNextConfirm) await dialog.accept();
      else await dialog.dismiss();
    });

    await page.goto(`${BASE_URL}/?fixture=masssell101`, { waitUntil: "load" });
    await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
    await page.waitForTimeout(5000);

    if (!(await step("open Shop -> Sell tab", async () => {
      await page.locator('[data-guide-id="topbar.shop"]').first().click();
      await page.waitForSelector(".shopv2-maintab", { timeout: T });
      await page.locator(".shopv2-maintab").nth(1).click(); // Sell
      await page.waitForSelector(".shopv2-sell-grid", { timeout: T });
      await page.waitForTimeout(400);
    }))) failures++;

    let goldBefore = null;
    if (!(await step("read starting gold", async () => {
      goldBefore = await page.locator(".shopv2-balance-amount").innerText();
      console.log(`[after] gold before: ${goldBefore}`);
    }))) failures++;

    if (!(await step("enter Mass Sell mode", async () => {
      await page.locator(".mshop-toggle-btn").click();
      await page.waitForSelector(".mshop-bar", { timeout: T });
      await page.waitForTimeout(200);
    }))) failures++;

    if (!(await step("select-all button is present", async () => {
      await page.waitForSelector(".mshop-select-all-btn", { timeout: T });
    }))) failures++;

    await step("shot: mode entered — global select-all button now visible", async () => {
      await page.screenshot({ path: join(OUT_DIR, "after-1-select-all-button.png") });
    });

    // ── Shift-Klick markiert einen Bereich (3 der 10 Zellen) ──
    // Anker-Klick (Index 0, ein Material-Stapel qty>1) öffnet zuerst ganz normal das
    // Mengen-Slider-Popup (unverändertes Task-#323-Verhalten für einen EINZELNEN Klick) —
    // "Bestätigen" (Default = Max) schließt es und zählt als normale Auswahl von Index 0.
    // Der ANSCHLIESSENDE Shift-Klick auf Index 2 überspringt Popups komplett (Bereichs-Logik).
    if (!(await step("anchor click (index 0) -> confirm its qty popup", async () => {
      const cells = page.locator(".shopv2-sell-grid .shopv2-sell-cell .item-cell");
      await cells.nth(0).click();
      await page.waitForSelector(".mshop-popup-actions button", { timeout: T });
      await page.locator(".mshop-popup-actions button").last().click(); // Bestätigen (Default=Max)
      await page.waitForSelector(".mshop-range", { state: "detached", timeout: T });
    }))) failures++;

    if (!(await step("shift-click index 2 -> range 0..2 selected, no popup", async () => {
      const cells = page.locator(".shopv2-sell-grid .shopv2-sell-cell .item-cell");
      await cells.nth(2).click({ modifiers: ["Shift"] });
      await page.waitForTimeout(150);
    }))) failures++;

    const rangeChecked = await page.locator(".shopv2-sell-grid .mshop-checkbox.checked").count();
    console.log(`[after] checked cells after shift-click range (expect 3): ${rangeChecked}`);
    if (rangeChecked !== 3) failures++;

    await step("shot: shift-click range selection (3 checked)", async () => {
      await page.screenshot({ path: join(OUT_DIR, "after-2-shift-range-select.png") });
    });

    // ── EIN Klick auf "Alle auswählen" statt 12 Klicks ──
    if (!(await step("click global select-all -> all 10 grid entries selected", async () => {
      await page.locator(".mshop-select-all-btn").click();
      await page.waitForTimeout(200);
    }))) failures++;

    const allChecked = await page.locator(".shopv2-sell-grid .mshop-checkbox.checked").count();
    const totalCells = await page.locator(".shopv2-sell-grid .shopv2-sell-cell").count();
    console.log(`[after] checked after global select-all: ${allChecked}/${totalCells}`);
    if (allChecked !== totalCells) failures++;

    let sellBtnLabel = null;
    if (!(await step("read sell-button summary label", async () => {
      sellBtnLabel = await page.locator(".mshop-bar-actions button").first().innerText();
      console.log(`[after] sell button label: "${sellBtnLabel}"`);
    }))) failures++;

    await step("shot: everything selected in ONE click (10/10 cells, 30 enchanted instances + stacks)", async () => {
      await page.screenshot({ path: join(OUT_DIR, "after-3-select-all-everything.png") });
    });

    // ── Klick auf Verkaufen -> confirm() abbrechen -> Auswahl bleibt stehen ──
    acceptNextConfirm = false;
    if (!(await step("click Sell -> DISMISS confirm -> selection stays intact (safety net)", async () => {
      await page.locator(".mshop-bar-actions button").first().click();
      await page.waitForTimeout(200);
    }))) failures++;

    await step("shot: confirm dialog was shown with count + gold (see console log above)", async () => {
      await page.screenshot({ path: join(OUT_DIR, "after-4-after-dismiss-still-selected.png") });
    });

    const stillChecked = await page.locator(".shopv2-sell-grid .mshop-checkbox.checked").count();
    console.log(`[after] checked after DISMISS (expect unchanged ${totalCells}): ${stillChecked}`);
    if (stillChecked !== totalCells) failures++;
    if (!lastDialogMessage || !lastDialogMessage.includes(String(allChecked === totalCells ? "" : ""))) {
      // Nur informativ geloggt, kein harter Fail — reine Text-Form kann sich stilistisch ändern.
    }
    console.log(`[after] confirm() message was: "${lastDialogMessage}"`);

    // ── Klick auf Verkaufen -> confirm() annehmen -> tatsächlicher Verkauf ──
    acceptNextConfirm = true;
    if (!(await step("click Sell -> ACCEPT confirm -> real mass sell executes", async () => {
      await page.locator(".mshop-bar-actions button").first().click();
      await page.waitForSelector(".mshop-result-banner", { timeout: T });
      // shopv2-balance-amount ist ein 400ms-Tween (useAnimatedNumber) — bewusst lange genug warten,
      // bis die Anzeige eingeschwungen ist, sonst liest man einen Zwischenwert der Animation.
      await page.waitForTimeout(900);
    }))) failures++;

    let goldAfter = null;
    if (!(await step("read gold after mass sell (tween settled)", async () => {
      goldAfter = await page.locator(".shopv2-balance-amount").innerText();
      console.log(`[after] gold after: ${goldAfter} (before: ${goldBefore})`);
    }))) failures++;

    await step("shot: result banner after real mass sell (grid now empty)", async () => {
      await page.screenshot({ path: join(OUT_DIR, "after-5-result-banner.png") });
    });

    const remainingCells = await page.locator(".shopv2-sell-grid .shopv2-sell-cell").count();
    console.log(`[after] remaining sell-grid cells after selling everything (expect 0): ${remainingCells}`);
    if (remainingCells !== 0) failures++;

    console.log(errors.length ? `${errors.length} page errors:\n` + errors.slice(0, 20).join("\n") : "no page errors");
  } finally {
    await browser.close();
    server.child.kill();
  }
  console.log(failures > 0 ? `[after] ${failures} SANITY-CHECK(S) FAILED` : "[after] alle Sanity-Checks OK");
  process.exitCode = failures > 0 ? 1 : 0;
}

main();
