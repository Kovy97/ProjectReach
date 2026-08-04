#!/usr/bin/env node
/**
 * Task #342 (Leiter-Analyse #338, Chef-GO) self-check: Dungeon-Karten eindeutig beschriften.
 *
 * Verifiziert die drei neuen/geänderten Meta-Zeilen auf `.dungeon-card` (CombatPage.tsx ~Z.4267):
 *  U1 Trägerzone ("Zone: {name}", `.dungeon-card-zone`) — auch auf GESPERRTEN Karten sichtbar.
 *  U2 Kreaturen-Band ("Kreaturen Lv {min}-{max}"), zur Laufzeit aus `encounters` abgeleitet.
 *  U3 "Kampfstufe {n}" statt "Lv {n}" (combat.dungeonLevel) — Skalen-Kollision mit der
 *      Zonenkarten-Monsterspanne (auch "Lv {min}-{max}") beendet.
 *  Plus: die bestehende Sperr-Grund-Zeile (combat.dungeonNeedLevel/dungeonYourLevel, Chef-Fund
 *  25.07.) muss weiter korrekt erscheinen, jetzt mit "Benötigt Kampfstufe {n}" (DE).
 *
 * Zwei Szenarien über `window.__hfDebug` (Muster dungeon-gate-check.mjs) — echter Content, keine
 * Synthetik, damit die reale Warband-Wand (Analyse §A5, Gate 45 / Kreaturen 50-60) sichtbar wird:
 *  (A) endgame-Fixture (CL~92) + chronicle_03/04/09/10 completed -> goblin_warband UND
 *      crypt_depths (Gate 75, seit #338 70->75) voll offen; wildwood/highlands/idolhall-Zonen
 *      bleiben gesperrt (zeigt die Trägerzone AUCH auf gesperrten Karten, u.a. die längste reale
 *      Zone "Wildwald-Jagdgründe" als Overflow-Stresstest).
 *  (B) midgame-Fixture (CL~30) + nur chronicle_03/04 completed -> goblin_warband offen, aber
 *      unterlevelt (CL 30 < Gate 45) -> die Sperr-Grund-Zeile über dem Button.
 * Beide Male EN + DE, 1920x1080. Port 5342.
 */
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5342;
const BASE_URL = `http://localhost:${PORT}`;
const OUT_DIR = "C:\\Users\\MSchu\\AppData\\Local\\Temp\\claude\\G--GameDev\\85edb3a2-2fd2-41b3-a534-53012ba5a3bd\\scratchpad\\dungeon-labels-342";
mkdirSync(OUT_DIR, { recursive: true });

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

async function goToCombat(page) {
  await clickRetry(page, page.locator('[data-guide-id="sidebar.combat"]').first());
  await page.waitForSelector(".combat-page", { timeout: 8000 });
  await page.waitForTimeout(400);
}

const problems = [];
const errors = [];

function wirePage(page, tag) {
  page.on("pageerror", (e) => errors.push(`[${tag}] pageerror: ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error") errors.push(`[${tag}] console: ${m.text()}`); });
}

/** Liest die drei Meta-Zeilen + Sperr-Hinweis einer Dungeon-Karte anhand ihres (lokalisierten) Namens. */
async function readCard(page, nameMatch) {
  return page.evaluate((needle) => {
    const el = [...document.querySelectorAll(".dungeon-card")].find(
      (c) => c.querySelector(".zone-card-name")?.textContent.includes(needle),
    );
    if (!el) return { found: false };
    const zoneLine = el.querySelector(".dungeon-card-zone")?.textContent.trim() ?? null;
    const otherMeta = [...el.querySelectorAll(".zone-card-meta:not(.dungeon-card-zone)")].map((n) => n.textContent.trim());
    const lockedHint = el.querySelector(".zone-card-locked-hint")?.textContent.trim() ?? null;
    return {
      found: true,
      storyLocked: el.classList.contains("zone-card-story-locked"),
      zoneLine,
      otherMeta,
      lockedHint,
      hasEnterBtn: !!el.querySelector(".dungeon-enter"),
      enterDisabled: el.querySelector(".dungeon-enter")?.disabled ?? null,
    };
  }, nameMatch);
}

function checkCard(label, card, expect) {
  console.log(`[${label}] ${JSON.stringify(card)}`);
  if (!card.found) { problems.push(`${label}: Karte nicht gefunden`); return; }
  if (expect.zoneLineIncludes && !card.zoneLine?.includes(expect.zoneLineIncludes)) {
    problems.push(`${label}: Zonen-Zeile fehlt/falsch: "${card.zoneLine}" (erwartet Substring "${expect.zoneLineIncludes}")`);
  }
  if (expect.mainLineIncludesAll) {
    const main = card.otherMeta[0] ?? "";
    for (const needle of expect.mainLineIncludesAll) {
      if (!main.includes(needle)) problems.push(`${label}: Hauptzeile "${main}" enthält nicht "${needle}"`);
    }
  }
  if (expect.needLevelIncludesAll) {
    const needLine = card.otherMeta[1] ?? "";
    for (const needle of expect.needLevelIncludesAll) {
      if (!needLine.includes(needle)) problems.push(`${label}: Sperr-Grund-Zeile "${needLine}" enthält nicht "${needle}"`);
    }
  }
  if (expect.storyLocked !== undefined && card.storyLocked !== expect.storyLocked) {
    problems.push(`${label}: storyLocked=${card.storyLocked}, erwartet ${expect.storyLocked}`);
  }
  if (expect.enterDisabled !== undefined && card.enterDisabled !== expect.enterDisabled) {
    problems.push(`${label}: enterDisabled=${card.enterDisabled}, erwartet ${expect.enterDisabled}`);
  }
}

async function runScenarioA(page, locale) {
  // (A) endgame, chronicle_03/04/09/10 completed -> warband + crypt_depths voll offen,
  // wildwood/highlands/idolhall bleiben gesperrt (Trägerzone muss TROTZDEM auf der Karte stehen).
  await page.goto(`${BASE_URL}/?fixture=endgame`, { waitUntil: "load" });
  await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
  await page.waitForFunction(() => !!window.__hfDebug, null, { timeout: 8000 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    const { state } = window.__hfDebug;
    for (const id of ["chronicle_03", "chronicle_04", "chronicle_09", "chronicle_10"]) {
      if (!state.quests.completed.includes(id)) state.quests.completed.push(id);
    }
  });
  await page.waitForTimeout(1000);

  await goToCombat(page);
  // Die "Dungeons"-H2 selbst hat KEIN eindeutiges Klassen-Merkmal (Paragon/Slayer-Turm teilen
  // .dungeon-heading) — über den Textinhalt greifen, dann das direkt folgende .zone-grid (die
  // Dungeon-Karten selbst, nicht Zonen- oder Slayer-Turm-Grid).
  const dungeonsHeading = page.locator("h2.dungeon-heading", { hasText: "Dungeons" }).first();
  await dungeonsHeading.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(OUT_DIR, `A-open-${locale}.png`), fullPage: false });
  console.log(`SHOT SAVED: A-open-${locale}.png`);
  // Volle Höhe der Dungeon-Sektion für die Lesbarkeitsprüfung ohne Scroll-Cutoff.
  const dungeonsGrid = dungeonsHeading.locator("xpath=following-sibling::div[contains(@class,'zone-grid')][1]");
  await dungeonsGrid.screenshot({ path: join(OUT_DIR, `A-open-grid-${locale}.png`) }).catch(() => {});

  const warbandName = locale === "en" ? "The Goblin Warband" : "Die Goblin-Kriegsbande";
  const cryptName = locale === "en" ? "Depths of the Crypt" : "Tiefen der Krypta";
  const wildwoodName = locale === "en" ? "The Wildwood Hunt" : "Die Wildwald-Jagd";
  const wyvernName = locale === "en" ? "The Wyvern Lair" : "Das Wyvernlager";
  const sanctumName = locale === "en" ? "Sanctum of the Last Idol" : "Sanktum des Letzten Götzen";

  const kampfstufe = locale === "en" ? "Combat Lv 45" : "Kampfstufe 45";
  checkCard(`A/${locale} warband (offen, on-level)`, await readCard(page, warbandName), {
    zoneLineIncludes: locale === "en" ? "Borderlands" : "Grenzlande",
    mainLineIncludesAll: [kampfstufe, locale === "en" ? "Creatures Lv 50" : "Kreaturen Lv 50"],
    storyLocked: false,
    enterDisabled: false,
  });
  checkCard(`A/${locale} crypt_depths (offen, on-level, Gate 75)`, await readCard(page, cryptName), {
    zoneLineIncludes: locale === "en" ? "Crypt" : "Krypta",
    mainLineIncludesAll: [locale === "en" ? "Combat Lv 75" : "Kampfstufe 75"],
    storyLocked: false,
    enterDisabled: false,
  });
  checkCard(`A/${locale} wildwood_hunt (gesperrt, Zone MUSS trotzdem stehen)`, await readCard(page, wildwoodName), {
    zoneLineIncludes: locale === "en" ? "Wildwood" : "Wildwald-Jagdgründe",
    storyLocked: true,
  });
  checkCard(`A/${locale} wyvern_lair (gesperrt)`, await readCard(page, wyvernName), {
    zoneLineIncludes: locale === "en" ? "Highlands" : "Hochland",
    storyLocked: true,
  });
  checkCard(`A/${locale} idol_sanctum (gesperrt)`, await readCard(page, sanctumName), {
    zoneLineIncludes: locale === "en" ? "Idol Hall" : "Götzenhalle",
    storyLocked: true,
  });
}

async function runScenarioB(page, locale) {
  // (B) midgame (CL~30), nur chronicle_03/04 completed -> warband offen, aber unterlevelt.
  await page.goto(`${BASE_URL}/?fixture=midgame`, { waitUntil: "load" });
  await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
  await page.waitForFunction(() => !!window.__hfDebug, null, { timeout: 8000 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    const { state } = window.__hfDebug;
    for (const id of ["chronicle_03", "chronicle_04"]) {
      if (!state.quests.completed.includes(id)) state.quests.completed.push(id);
    }
  });
  await page.waitForTimeout(1000);

  await goToCombat(page);
  const dungeonsHeadingB = page.locator("h2.dungeon-heading", { hasText: "Dungeons" }).first();
  await dungeonsHeadingB.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(OUT_DIR, `B-underleveled-${locale}.png`), fullPage: false });
  console.log(`SHOT SAVED: B-underleveled-${locale}.png`);
  const dungeonsGridB = dungeonsHeadingB.locator("xpath=following-sibling::div[contains(@class,'zone-grid')][1]");
  await dungeonsGridB.screenshot({ path: join(OUT_DIR, `B-underleveled-grid-${locale}.png`) }).catch(() => {});

  const warbandName = locale === "en" ? "The Goblin Warband" : "Die Goblin-Kriegsbande";
  // Task #345 (Chef-Entscheid 25.07., dungeon-gates-345-shot.mjs): die Kampfstufe SPERRT nicht
  // mehr — Warnzeile (combat.dungeonLevelWarn) statt Sperr-Grund, Button bleibt AKTIV.
  const needLevel = locale === "en" ? "Recommended: combat level 45" : "Empfohlen: Kampfstufe 45";
  const yourLevel = locale === "en" ? "Yours:" : "Deine:";
  checkCard(`B/${locale} warband (offen, UNTERLEVELT — Kernbeispiel Design-Doc)`, await readCard(page, warbandName), {
    zoneLineIncludes: locale === "en" ? "Borderlands" : "Grenzlande",
    mainLineIncludesAll: [locale === "en" ? "Combat Lv 45" : "Kampfstufe 45", locale === "en" ? "Creatures Lv 50" : "Kreaturen Lv 50"],
    needLevelIncludesAll: [needLevel, yourLevel],
    storyLocked: false,
    enterDisabled: false,
  });
}

const { child, getOutput } = startDevServer();
try {
  const ok = await waitForServer(BASE_URL);
  if (!ok) { console.error("SERVER NOT UP:\n" + getOutput()); process.exit(1); }
  const browser = await chromium.launch();

  for (const locale of ["en", "de"]) {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
    wirePage(page, locale);
    if (locale === "en") {
      await page.addInitScript(() => { try { localStorage.setItem("hearthforge:locale", "en"); } catch {} });
    }
    await runScenarioA(page, locale);
    await runScenarioB(page, locale);
    await page.close();
  }

  await browser.close();

  console.log(problems.length ? "PROBLEME:\n- " + problems.join("\n- ") : "ALLE CHECKS GRÜN");
  console.log(errors.length ? `${errors.length} page errors:\n` + errors.slice(0, 12).join("\n") : "no page errors");
  if (problems.length || errors.length) process.exitCode = 1;
} finally {
  child.kill();
}
