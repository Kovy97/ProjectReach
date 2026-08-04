#!/usr/bin/env node
/**
 * TESTER 1 ("Der Frischling") — Sweep 2026-07-11. READ-ONLY: kein Fix, kein Build.
 * Simuliert die erste Stunde eines neuen Spielers headless per Playwright gegen einen
 * eigenständigen Vite-Devserver (Muster: loadout-scroll-check.mjs). Port 5250.
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = "G:\\GameDev\\apps\\client";
const PORT = 5250;
const BASE_URL = `http://localhost:${PORT}`;
const OUT_DIR = "C:\\Users\\MSchu\\AppData\\Local\\Temp\\claude\\G--GameDev\\553d2095-3a73-4795-9782-0fe746a25f13\\scratchpad\\sweep1";
const PORTRAIT_UPLOAD_FILE = join(CLIENT_DIR, "src", "renderer", "assets", "portraits", "char_5.png");

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

function log(...args) { console.log(...args); }

const { child, getOutput } = startDevServer();
const errors = [];
const findings = [];

try {
  const ok = await waitForServer(BASE_URL);
  if (!ok) { console.error("SERVER NOT UP:\n" + getOutput()); process.exit(1); }

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on("pageerror", (e) => errors.push({ phase: "?", msg: "pageerror: " + e.message }));
  page.on("console", (m) => { if (m.type() === "error") errors.push({ phase: "?", msg: "console: " + m.text() }); });

  let phase = "boot";
  const tagPhase = (p) => { phase = p; };
  // Retag the last N untagged errors with current phase (simple approach: just track index).
  let errIdx = 0;
  const flushPhaseTag = () => { while (errIdx < errors.length) { errors[errIdx].phase = phase; errIdx++; } };

  const shot = async (name) => {
    await page.screenshot({ path: join(OUT_DIR, name), fullPage: false });
    log("SHOT:", name);
  };

  // ── 1. Hauptmenü ──────────────────────────────────────────────────────
  tagPhase("hauptmenue");
  await page.goto(BASE_URL, { waitUntil: "load" });
  await page.waitForSelector(".menu-nav", { timeout: 15000 });
  await page.waitForTimeout(1500);
  await shot("01-hauptmenue.png");
  flushPhaseTag();

  await clickRetry(page, page.locator(".menu-nav-btn").first()); // "Neues Spiel"
  await page.waitForTimeout(500);
  await shot("02-neues-spiel-panel.png");
  flushPhaseTag();

  // ── 2. Charaktererstellung ────────────────────────────────────────────
  tagPhase("chargen");
  await clickRetry(page, page.locator(".menu-slot--empty .hf-btn--primary").first());
  await page.waitForSelector(".creation-panel", { timeout: 10000 });
  await page.waitForTimeout(500);
  await shot("03-chargen-blank.png");

  await page.locator(".creation-input").fill("Frischling Elara");
  const chipCount = await page.locator(".creation-portrait-chip").count();
  log("Portrait-Chips im Streifen:", chipCount);
  if (chipCount > 2) await clickRetry(page, page.locator(".creation-portrait-chip").nth(2));
  await page.waitForTimeout(300);
  await shot("04-chargen-name-portrait.png");

  // "Alle anzeigen"-Galerie öffnen + schließen
  await clickRetry(page, page.locator(".creation-portrait-more-btn"));
  await page.waitForSelector(".portrait-gallery-modal", { timeout: 5000 });
  await page.waitForTimeout(300);
  const galleryThumbCount = await page.locator(".portrait-thumb").count();
  log("Galerie-Thumbnails:", galleryThumbCount);
  await shot("05-portrait-galerie.png");
  await clickRetry(page, page.locator(".modal-close"));
  await page.waitForTimeout(300);

  // Upload-Button: eigenes PNG hochladen, Vorschau muss wechseln.
  const beforeUploadSrc = await page.locator(".showcase-img").getAttribute("src").catch(() => null);
  const fileInput = page.locator('.creation-portrait-frame input[type="file"]');
  await fileInput.setInputFiles(PORTRAIT_UPLOAD_FILE);
  await page.waitForTimeout(800);
  const afterUploadSrc = await page.locator(".showcase-img").getAttribute("src").catch(() => null);
  const uploadOk = !!afterUploadSrc && afterUploadSrc.startsWith("data:") && afterUploadSrc !== beforeUploadSrc;
  log("UPLOAD-CHECK: before=", (beforeUploadSrc ?? "").slice(0, 40), "after=", (afterUploadSrc ?? "").slice(0, 40), "ok=", uploadOk);
  if (!uploadOk) findings.push("[KRITISCH] Portrait-Upload-Button aendert die Vorschau nicht (oder Preview-Element fehlt) — src vorher/nachher: " + JSON.stringify({ beforeUploadSrc, afterUploadSrc }));
  await shot("06-chargen-upload-preview.png");

  // Stil wählen (ranged statt default melee)
  await clickRetry(page, page.locator(".creation-style-card").nth(1));
  await page.waitForTimeout(300);
  await shot("07-chargen-stil-ranged.png");
  flushPhaseTag();

  tagPhase("chargen-start");
  await clickRetry(page, page.locator(".creation-start"));
  await page.waitForTimeout(1200);
  flushPhaseTag();

  // ── 3. Onboarding-Tour: KOMPLETT durchklicken ────────────────────────
  tagPhase("onboarding-full");
  await page.waitForSelector(".onboarding-guide-root", { timeout: 8000 }).catch(() => {
    findings.push("[KRITISCH] Onboarding-Guide startet nach Charaktererstellung nicht automatisch");
  });
  await shot("08-onboarding-intro.png");

  let steps = 0;
  let guideStuck = false;
  for (let i = 0; i < 40; i++) {
    const hasGuide = await page.locator(".onboarding-guide-root").count();
    if (!hasGuide) break;
    const contBtn = page.locator(".guide-bubble-footer .combat-btn");
    const hasContBtn = await contBtn.count();
    if (hasContBtn) {
      await clickRetry(page, contBtn.first());
    } else {
      const target = page.locator(".guide-target").first();
      const hasTarget = await target.count();
      if (!hasTarget) { guideStuck = true; break; }
      await clickRetry(page, target);
    }
    steps++;
    await page.waitForTimeout(450);
    if (steps === 5 || steps === 15 || steps === 25) await shot(`09-onboarding-step${steps}.png`);
  }
  const guideStillOpen = await page.locator(".onboarding-guide-root").count();
  log("ONBOARDING-FULL: steps=", steps, "stillOpen=", guideStillOpen, "stuck=", guideStuck);
  if (guideStillOpen || guideStuck) findings.push(`[KRITISCH] Onboarding-Tour (voller Durchlauf) haengt fest nach ${steps} Schritten (stuck=${guideStuck}, stillOpen=${!!guideStillOpen})`);
  await shot("10-onboarding-ende.png");
  flushPhaseTag();

  // ── 4. Erste Schritte: Holzfaellen ───────────────────────────────────
  tagPhase("erste-schritte-holzfaellen");
  await clickRetry(page, page.locator('[data-guide-id="sidebar.woodcutting"]').first());
  await page.waitForSelector(".skillcard", { timeout: 8000 });
  await page.waitForTimeout(400);
  const wcCardCount = await page.locator(".skillcard").count();
  log("Woodcutting-Karten:", wcCardCount);
  await clickRetry(page, page.locator(".skillcard-cta").first());
  await page.waitForTimeout(4000);
  await shot("11-holzfaellen-laeuft.png");
  const wcActive = await page.locator(".skillcard.active").count();
  if (wcActive === 0) findings.push("[MITTEL] Nach Klick auf Holzfaellen-Karte zeigt keine Karte den 'active'-Status");
  flushPhaseTag();

  // ── 5. Shop-Bootstrap-Check ───────────────────────────────────────────
  tagPhase("shop-check");
  await clickRetry(page, page.locator('[data-guide-id="topbar.shop"]').first());
  await page.waitForTimeout(600);
  await shot("12-shop.png");
  const shopNames = await page.locator(".shopv2-card-name").allTextContents();
  log("Shop-Item-Namen:", JSON.stringify(shopNames));
  const hasBronzePickaxe = shopNames.some((n) => /spitzhacke|pickaxe/i.test(n));
  const hasFishingRod = shopNames.some((n) => /angel|rod/i.test(n));
  const hasSickle = shopNames.some((n) => /sichel|sickle/i.test(n));
  const seedCount = shopNames.filter((n) => /samen|seed/i.test(n)).length;
  const hasLeatherArmor = shopNames.some((n) => /leder(rüstung|helm|wams|hose|stiefel)|leather (armor|helm|body|legs|boots)/i.test(n));
  log("SHOP-CHECK:", JSON.stringify({ hasBronzePickaxe, hasFishingRod, hasSickle, seedCount, hasLeatherArmor }));
  if (!hasBronzePickaxe || !hasFishingRod || !hasSickle) findings.push(`[KRITISCH] Shop-Bootstrap unvollstaendig: T0-Tools fehlen (Spitzhacke=${hasBronzePickaxe} Angel=${hasFishingRod} Sichel=${hasSickle})`);
  if (seedCount < 3) findings.push(`[MITTEL] Shop zeigt nur ${seedCount} Samen-Eintraege (erwartet 3 Basis-Samen)`);
  if (hasLeatherArmor) findings.push("[KRITISCH] Lederruestung ist weiterhin im Shop kaufbar (sollte laut Shop-Purge entfernt sein)");
  flushPhaseTag();

  // ── 6. Lederverarbeitung-Rezepte ─────────────────────────────────────
  tagPhase("leatherworking-check");
  await clickRetry(page, page.locator('[data-guide-id="sidebar.leatherworking"]').first());
  await page.waitForSelector(".skillcard", { timeout: 8000 });
  await page.waitForTimeout(500);
  await shot("13-lederverarbeitung.png");
  const lwCards = await page.evaluate(() => {
    return Array.from(document.querySelectorAll(".skillcard")).map((el) => ({
      title: el.querySelector(".skillcard-title")?.textContent ?? "",
      locked: el.classList.contains("locked"),
    }));
  });
  const rawhideCards = lwCards.filter((c) => /rohleder/i.test(c.title));
  log("Rohleder-Rezept-Karten:", JSON.stringify(rawhideCards));
  const missingOrLocked = rawhideCards.filter((c) => c.locked);
  if (rawhideCards.length < 4) findings.push(`[KRITISCH] Nur ${rawhideCards.length}/4 Rohleder-Rezepte in Lederverarbeitung sichtbar`);
  if (missingOrLocked.length > 0) findings.push(`[KRITISCH] Rohleder-Rezepte sind ab Level 1 gesperrt: ${missingOrLocked.map((c) => c.title).join(", ")}`);
  flushPhaseTag();

  // ── 7. Erster Kampf ───────────────────────────────────────────────────
  tagPhase("erster-kampf");
  await clickRetry(page, page.locator('[data-guide-id="sidebar.combat"]').first());
  await page.waitForSelector(".zone-card", { timeout: 8000 });
  await page.waitForTimeout(500);
  const zoneNames = await page.locator(".zone-card-name").allTextContents();
  log("Zonen-Namen:", JSON.stringify(zoneNames));
  await shot("14-kampf-zonenauswahl.png");
  await clickRetry(page, page.locator(".zone-card").first());
  await page.waitForTimeout(800);
  const monsterNames = await page.locator(".monster-card-name").allTextContents();
  log("Monster in Zone[0]:", JSON.stringify(monsterNames));
  await shot("15-kampf-monsterauswahl.png");
  await clickRetry(page, page.locator(".mc-fight-btn").first());
  await page.waitForTimeout(2500);
  await shot("16-kampf-laeuft.png");
  await page.waitForTimeout(6000);
  await shot("17-kampf-nach-einigen-sekunden.png");
  flushPhaseTag();

  // ── 8. Speichern → Hauptmenü → Laden über Karte ──────────────────────
  tagPhase("save-load");
  await clickRetry(page, page.locator(".sb-footer-save"));
  await page.waitForTimeout(600);
  const savedClass = await page.locator(".sb-footer-save").getAttribute("class");
  log("Save-Button-Klasse nach Klick:", savedClass);
  if (!savedClass?.includes("just-saved")) findings.push("[KOSMETISCH] Save-Button zeigt keinen sichtbaren 'Gespeichert'-Zustand nach Klick");
  await shot("18-gespeichert.png");

  await clickRetry(page, page.locator(".sb-footer-menu"));
  await page.waitForSelector(".menu-nav", { timeout: 10000 });
  await page.waitForTimeout(500);
  await shot("19-zurueck-im-hauptmenue.png");

  await clickRetry(page, page.locator(".menu-nav-btn").nth(1)); // "Spiel laden"
  await page.waitForTimeout(500);
  const loadSlotCount = await page.locator(".menu-slot.filled").count();
  log("Belegte Spielstand-Karten:", loadSlotCount);
  await shot("20-spielstand-karten.png");
  if (loadSlotCount === 0) {
    findings.push("[KRITISCH] Nach Speichern+Hauptmenue zeigt 'Spiel laden' keine belegte Spielstand-Karte");
  } else {
    await clickRetry(page, page.locator(".menu-slot.filled").first());
    await page.waitForSelector(".menu-nav", { state: "detached", timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1200);
    const loadedOk = await page.locator(".sb-footer-save").count();
    log("Nach Klick auf Karte geladen (Sidebar sichtbar):", !!loadedOk);
    if (!loadedOk) findings.push("[KRITISCH] Klick auf Spielstand-Karte laedt das Spiel nicht (Sidebar erscheint nicht)");
    await shot("21-nach-laden-ueber-karte.png");
  }
  flushPhaseTag();

  // ── 9. Layout-Check bei 1280×720 ──────────────────────────────────────
  tagPhase("layout-1280x720");
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.waitForTimeout(600);
  await shot("22-1280x720-combat-oder-sidebar.png");
  await clickRetry(page, page.locator('[data-guide-id="sidebar.woodcutting"]').first());
  await page.waitForTimeout(500);
  await shot("23-1280x720-skillpage.png");
  await clickRetry(page, page.locator('[data-guide-id="sidebar.leatherworking"]').first());
  await page.waitForTimeout(500);
  await clickRetry(page, page.locator('[data-guide-id="topbar.shop"]').first()).catch(() => {});
  await page.waitForTimeout(500);
  await shot("24-1280x720-shop.png");
  flushPhaseTag();

  // ── 10. Zweiter Charakter: Onboarding "Ueberspringen" ────────────────
  tagPhase("onboarding-skip");
  await page.setViewportSize({ width: 1920, height: 1080 });
  await clickRetry(page, page.locator(".sb-footer-menu"));
  await page.waitForSelector(".menu-nav", { timeout: 10000 });
  await page.waitForTimeout(400);
  await clickRetry(page, page.locator(".menu-nav-btn").first()); // Neues Spiel
  await page.waitForTimeout(400);
  const emptySlotBtns = page.locator(".menu-slot--empty .hf-btn--primary");
  const emptyCount = await emptySlotBtns.count();
  log("Freie Slots fuer zweiten Charakter:", emptyCount);
  if (emptyCount === 0) {
    findings.push("[MITTEL] Kein freier Slot mehr fuer zweiten Testcharakter (Skip-Onboarding-Lauf uebersprungen)");
  } else {
    await clickRetry(page, emptySlotBtns.first());
    await page.waitForSelector(".creation-panel", { timeout: 10000 });
    await page.locator(".creation-input").fill("Skip Test");
    await clickRetry(page, page.locator(".creation-start"));
    await page.waitForSelector(".onboarding-guide-root", { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(500);
    await shot("25-skiplauf-intro.png");
    await clickRetry(page, page.locator(".guide-bubble-skip"));
    await page.waitForTimeout(500);
    const guideGoneAfterSkip = await page.locator(".onboarding-guide-root").count();
    log("Guide nach Ueberspringen weg:", guideGoneAfterSkip === 0);
    if (guideGoneAfterSkip !== 0) findings.push("[KRITISCH] 'Ueberspringen'-Button im Onboarding-Guide beendet die Tour nicht");
    await shot("26-skiplauf-nach-skip.png");
  }
  flushPhaseTag();

  // ── Ausgabe ────────────────────────────────────────────────────────────
  log("\n=== BEFUND-KANDIDATEN (Skript-Heuristik) ===");
  findings.forEach((f) => log("- " + f));
  log("\n=== KONSOLEN/PAGE-ERRORS (" + errors.length + ") ===");
  const byPhase = {};
  for (const e of errors) { (byPhase[e.phase] ??= []).push(e.msg); }
  for (const [p, msgs] of Object.entries(byPhase)) {
    log(`-- Phase "${p}" (${msgs.length}) --`);
    for (const m of msgs.slice(0, 15)) log("   " + m);
  }

  await browser.close();
} finally {
  child.kill();
}
