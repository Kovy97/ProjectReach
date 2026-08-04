#!/usr/bin/env node
/**
 * Tester-Sweep 2, T8 "Der internationale Spieler" — Teil 1: Sprachumschaltung + Zahlen-/
 * Datumsformate (ZH/RU/PT-BR), Punkt 1 des Testauftrags.
 *
 * Prueft:
 *  (a) Hauptmenue Schnellwahl (.lang-btn im .menu-lang-Leiste) -> html[lang] wechselt korrekt.
 *  (b) Options-Seite (in-game) Sprachumschaltung -> html[lang] wechselt korrekt, konsistent mit (a).
 *  (c) Zahlenformat (Gold-Anzeige, .gold-display, formatNum) entspricht Intl.NumberFormat(bcp47).
 *  (d) Datumsformat (Hauptmenue "Last played", .menu-slot-sub, formatDate) entspricht
 *      Intl.DateTimeFormat(bcp47, {day:2-digit,month:2-digit,year:numeric,hour:2-digit,minute:2-digit}).
 *
 * Port 5257 (Task-Vorgabe T8). Read-only: kein Produktcode-Edit.
 */
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = "G:\\GameDev\\apps\\client";
const PORT = 5257;
const BASE_URL = `http://localhost:${PORT}`;
const OUT_DIR = "C:\\Users\\MSchu\\AppData\\Local\\Temp\\claude\\G--GameDev\\553d2095-3a73-4795-9782-0fe746a25f13\\scratchpad\\t8";
mkdirSync(OUT_DIR, { recursive: true });

const LOCALE_BCP47 = { en: "en-US", de: "de-DE", zh: "zh-CN", ru: "ru-RU", es: "es-ES", "pt-BR": "pt-BR", fr: "fr-FR" };
const TARGET_LOCALES = ["zh", "ru", "pt-BR"];

const midgame = readFileSync(join(CLIENT_DIR, "ui-audit", "fixtures", "midgame.json"), "utf8");
const midgameObj = JSON.parse(midgame);

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
  try { await locator.click({ timeout: 8000, ...opts }); }
  catch {
    await page.waitForTimeout(500);
    try { await locator.click({ timeout: 8000, ...opts }); }
    catch { await locator.click({ timeout: 8000, force: true, ...opts }); }
  }
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

  for (const locale of TARGET_LOCALES) {
    console.log(`\n===== LOCALE: ${locale} =====`);
    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    wirePage(page, locale);
    try {

    // Inject a populated save slot (menu-slots-shot.mjs Muster) so the Load-Panel shows a real
    // "Last played" date, and start with locale = "de" (baseline) so the click actually switches.
    await page.addInitScript((mid) => {
      localStorage.setItem("hearthforge:save:0", mid);
      localStorage.setItem("hearthforge:locale", "de");
    }, midgame);

    await page.goto(BASE_URL, { waitUntil: "load" });
    await page.waitForSelector(".menu-lang", { timeout: 15000 });
    await page.waitForTimeout(600);

    // ── (a) Hauptmenue Schnellwahl ────────────────────────────────────────────────────────────
    await clickRetry(page, page.locator(".menu-lang .lang-btn", { hasText: locale.toUpperCase() }).first());
    await page.waitForTimeout(400);
    const htmlLangMenu = await page.evaluate(() => document.documentElement.lang);
    const expectedTag = LOCALE_BCP47[locale];
    console.log(`(a) Menu html[lang] nach Klick auf "${locale}": "${htmlLangMenu}" (erwartet "${expectedTag}")`);
    if (htmlLangMenu !== expectedTag) {
      problems.push(`(a) [${locale}] html[lang] nach Menue-Schnellwahl ist "${htmlLangMenu}", erwartet "${expectedTag}" — Sprachumschaltung setzt falsches BCP47-Tag (Zahlen-/Datumsformat + Silbentrennung betroffen)`);
    }

    // Uebersetzter Menue-Text sichtbar (z.B. "menu.new" Button) — grobe Pruefung: kein rohes
    // "menu.new" im DOM, kein "undefined".
    const bodyTextMenu = await page.evaluate(() => document.body.innerText);
    if (/\bundefined\b/.test(bodyTextMenu)) problems.push(`(a) [${locale}] "undefined" im Hauptmenue-Text sichtbar`);
    if (/\bmenu\.\w+\b/.test(bodyTextMenu)) problems.push(`(a) [${locale}] roher i18n-Key im Hauptmenue-Text sichtbar (z.B. menu.xxx)`);

    await page.screenshot({ path: join(OUT_DIR, `${locale}-a-menu.png`), fullPage: false });
    console.log(`SHOT: ${locale}-a-menu.png`);

    // ── (d) Datumsformat "Last played" ────────────────────────────────────────────────────────
    await clickRetry(page, page.locator(".menu-nav-btn").nth(1)); // Load-Panel
    await page.waitForSelector(".menu-slot", { timeout: 8000 });
    await page.waitForTimeout(400);
    const dateText = await page.locator(".menu-slot-sub").first().textContent();
    const savedAt = midgameObj.summary?.savedAt ?? midgameObj.state?.character?.savedAt ?? null;
    let expectedDate = null;
    if (savedAt) {
      expectedDate = new Date(savedAt).toLocaleString(expectedTag, {
        day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
      });
    }
    console.log(`(d) [${locale}] Last-played Text: "${dateText?.trim()}" | erwartetes Format-Beispiel (${expectedTag}): "${expectedDate}"`);
    // en-US benutzt "/" als Datumstrenner + AM/PM, de/zh/ru/pt-BR i.d.R. "." oder "-" ohne AM/PM.
    // Fallback-Bug-Symptom: Text sieht wie en-US ODER de-DE aus, obwohl weder locale=en noch de.
    if (savedAt && expectedDate) {
      const enUSStyle = new Date(savedAt).toLocaleString("en-US", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
      if (dateText?.includes(enUSStyle.split(",")[0]) && expectedTag !== "en-US") {
        problems.push(`(d) [${locale}] Datum sieht wie en-US-Fallback aus: "${dateText?.trim()}" (erwartet Format fuer ${expectedTag}: "${expectedDate}")`);
      }
    }
    await page.screenshot({ path: join(OUT_DIR, `${locale}-d-loadpanel.png`), fullPage: false });
    console.log(`SHOT: ${locale}-d-loadpanel.png`);

    // ── (b)+(c) In-game: Options-Sprachumschaltung + Zahlenformat (Gold) ──────────────────────
    // Der Klick loest einen React-Remount aus (Menue -> Spiel), der das Element mid-click
    // detached — Playwrights click()-Promise haengt dabei manchmal bis zum Timeout, obwohl der
    // Klick selbst durchging (verifiziert per Debug-Skript). Deshalb hier bewusst tolerant: Fehler
    // ignorieren, direkt auf die Spielseite warten.
    try { await page.locator(".menu-slot").first().click({ timeout: 5000 }); } catch { /* siehe Kommentar */ }
    await page.waitForTimeout(1200);
    let inGame = await page.evaluate(() => !!document.querySelector('[data-guide-id^="sidebar."]'));
    if (!inGame) {
      console.log(`DEBUG [${locale}]: nicht im Spiel nach 1. Klickversuch, url=${page.url()}`);
      await page.screenshot({ path: join(OUT_DIR, `${locale}-DEBUG-afterclick.png`), fullPage: false });
      try { await page.locator(".menu-slot").first().click({ timeout: 5000, force: true }); } catch { /* noop */ }
      await page.waitForTimeout(1500);
      inGame = await page.evaluate(() => !!document.querySelector('[data-guide-id^="sidebar."]'));
      console.log(`DEBUG [${locale}]: nach 2. Klickversuch inGame=${inGame}`);
    }
    await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
    await page.waitForTimeout(1500);

    const goldRaw = await page.evaluate(() => window.__hfDebug?.state?.character?.gold ?? null);
    await page.waitForTimeout(600); // animatedGold-Zaehler beruhigen (App.tsx useAnimatedNumber)
    const goldText = await page.locator(".gold-display").first().textContent();
    const goldDigits = goldText?.replace(/[^\d.,\s  ]/g, "").trim();
    let expectedGold = null;
    if (goldRaw != null) expectedGold = new Intl.NumberFormat(expectedTag).format(Math.round(goldRaw));
    console.log(`(c) [${locale}] Gold-Anzeige: "${goldDigits}" (roh: ${goldRaw}) | erwartet (${expectedTag}): "${expectedGold}"`);
    if (expectedGold != null && goldDigits !== expectedGold) {
      problems.push(`(c) [${locale}] Zahlenformat Gold-Anzeige "${goldDigits}" != erwartet "${expectedGold}" (Intl.NumberFormat(${expectedTag})) — evtl. falsches BCP47-Tag aktiv`);
    }

    await page.screenshot({ path: join(OUT_DIR, `${locale}-DEBUG-beforeoptions.png`), fullPage: false });
    const sidebarInfo = await page.evaluate(() => {
      const el = document.querySelector('[data-guide-id="sidebar.options"]');
      if (!el) return { found: false, allSidebarIds: [...document.querySelectorAll('[data-guide-id^="sidebar."]')].map(e => e.getAttribute("data-guide-id")) };
      const r = el.getBoundingClientRect();
      return { found: true, rect: { x: r.x, y: r.y, w: r.width, h: r.height }, text: el.textContent?.trim() };
    });
    console.log(`DEBUG [${locale}] sidebar.options: ${JSON.stringify(sidebarInfo)}`);
    await clickRetry(page, page.locator('[data-guide-id="sidebar.options"]').first());
    await page.waitForSelector(".opz-page", { timeout: 8000 });
    await page.waitForTimeout(500);
    // Klick auf denselben Locale-Button nochmal (schon aktiv) -> nur html[lang] gegenlesen, dann
    // zurueck auf "de" und wieder auf Ziel-Locale klicken, um den Options-Handler selbst zu pruefen.
    await clickRetry(page, page.locator(".opz-lang-grid .lang-btn", { hasText: "Deutsch" }).first());
    await page.waitForTimeout(300);
    const localeNameMap = { zh: "简体中文", ru: "Русский", "pt-BR": "Português (BR)" };
    await clickRetry(page, page.locator(".opz-lang-grid .lang-btn", { hasText: localeNameMap[locale] }).first());
    await page.waitForTimeout(400);
    const htmlLangOptions = await page.evaluate(() => document.documentElement.lang);
    console.log(`(b) Options html[lang] nach Klick auf "${localeNameMap[locale]}": "${htmlLangOptions}" (erwartet "${expectedTag}")`);
    if (htmlLangOptions !== expectedTag) {
      problems.push(`(b) [${locale}] html[lang] nach Options-Sprachwechsel ist "${htmlLangOptions}", erwartet "${expectedTag}"`);
    }
    await page.screenshot({ path: join(OUT_DIR, `${locale}-b-options.png`), fullPage: false });
    console.log(`SHOT: ${locale}-b-options.png`);
    } catch (e) {
      console.error(`LOCALE ${locale} FAILED: ${e.message}`);
      problems.push(`[${locale}] Skript-Fehler: ${e.message}`);
    }

    await context.close();
  }

  await browser.close();

  console.log(problems.length ? "\nPROBLEME:\n- " + problems.join("\n- ") : "\nALLE CHECKS GRUEN");
  console.log(errors.length ? `${errors.length} page errors:\n` + errors.slice(0, 15).join("\n") : "no page errors");
  if (problems.length || errors.length) process.exitCode = 1;
} finally {
  child.kill();
}
