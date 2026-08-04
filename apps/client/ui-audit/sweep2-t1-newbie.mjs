#!/usr/bin/env node
/**
 * Tester-Sweep 2 (RC 0.1, 2026-07-13) — T1 "Der Neuling", Lauf A: kompletter Erst-Spieler-Flow.
 * Wegwerf-Skript. Headless vite (Port 5250) + Playwright, Locale de (Default), KEIN Fixture.
 *
 *  1. Hauptmenü frisch → Neues Spiel → Charaktererstellung (Portrait-Wahl) → Start.
 *  2. Onboarding-Guide KOMPLETT durchklicken; pro Schritt: Sprecher-Name (erwartet "Der Wächter"),
 *     Kopf-Medaillon vorhanden, Titel/Body, Spotlight offscreen?, Blase im Viewport?
 *  3. Story-Tab: öffnet automatisch? Kapitel 1 "Die erste Seite" (Ziel-Zeile, loreText).
 *  4. Erste Sammel-Aktion (Woodcutting) real starten → Fortschritt im Story-Tab LIVE?
 *  5. Kapitel 1 erfüllen (Rest injiziert) + einlösen → Kapitel 2 aktiv? "Schaltet frei"-Zeile?
 *  6. Kapitel 2 real anspielen: Combat-Erst-Tour (erscheint genau einmal?), Huhn ECHT töten →
 *     zählt Union (chicken/cow/boar/feral_goat)? Live-Update im Story-Tab bei injizierten Kills?
 *     Bullen-Boss + Claim → Kapitel 3 zeigt "Schaltet frei: Die Grenzlande"?
 *  7. Grenzlande gesperrt: Schloss-Badge, Hinweistext, Klick wirkungslos. 1920 + 1366 Shots.
 */
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5250;
const BASE_URL = `http://localhost:${PORT}`;
const OUT_DIR = "C:\\Users\\MSchu\\AppData\\Local\\Temp\\claude\\G--GameDev\\553d2095-3a73-4795-9782-0fe746a25f13\\scratchpad\\sweep2-t1";
mkdirSync(OUT_DIR, { recursive: true });

const problems = [];
const notes = [];
const errors = [];

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

function slug(s) { return (s || "none").replace(/[^a-z0-9.-]/gi, "_"); }

async function shot(page, name) {
  await page.screenshot({ path: join(OUT_DIR, name + ".png") });
  console.log("SHOT: " + name + ".png");
}

async function shotBoth(page, name) {
  await shot(page, name + "-1920");
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.waitForTimeout(350);
  await shot(page, name + "-1366");
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.waitForTimeout(300);
}

const { child, getOutput } = startDevServer();
try {
  if (!(await waitForServer(BASE_URL))) { console.error("SERVER NOT UP:\n" + getOutput()); process.exit(1); }

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });

  // ── 1) Hauptmenü frisch ────────────────────────────────────────────────────────────────────
  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  const menuInfo = await page.evaluate(() => ({
    navBtns: [...document.querySelectorAll(".menu-nav-btn")].map((b) => b.textContent.trim()),
    lang: localStorage.getItem("hearthforge:locale"),
  }));
  console.log("MENU nav buttons: " + JSON.stringify(menuInfo));
  await shotBoth(page, "a01-menu");

  await page.locator(".menu-nav-btn").first().click();
  await page.waitForTimeout(400);
  const slotPanel = await page.evaluate(() => ({
    slotBtns: [...document.querySelectorAll(".menu-slot-actions button")].map((b) => b.textContent.trim()).slice(0, 4),
  }));
  console.log("SLOT panel: " + JSON.stringify(slotPanel));
  await shot(page, "a02-newgame-slots");
  await page.locator(".menu-slot-actions button").first().click();
  await page.waitForSelector(".creation", { timeout: 8000 });
  await page.waitForTimeout(600);

  // ── Charaktererstellung ────────────────────────────────────────────────────────────────────
  const creationInfo = await page.evaluate(() => ({
    portraitChips: document.querySelectorAll(".creation-portrait-chip").length,
    styleCards: [...document.querySelectorAll(".creation-style-card")].map((c) => c.textContent.trim().slice(0, 60)),
    headings: [...document.querySelectorAll(".creation h1, .creation h2, .creation h3, .creation label")].map((h) => h.textContent.trim()).slice(0, 12),
  }));
  console.log("CREATION: " + JSON.stringify(creationInfo, null, 1));
  await shotBoth(page, "a03-creation-empty");
  await page.locator(".creation-input").first().fill("Neuling");
  const chips = page.locator(".creation-portrait-chip");
  if ((await chips.count()) > 2) await chips.nth(2).click();
  await page.waitForTimeout(200);
  // Stil: bewusst Default/melee (erste Karte) wie ein unbedarfter Neuling.
  await page.locator(".creation-style-card").first().click();
  await page.waitForTimeout(200);
  await shotBoth(page, "a04-creation-filled");
  await page.locator(".creation-start").click();
  await page.waitForSelector(".sidebar, .onboarding-guide-root", { timeout: 10000 });
  await page.waitForTimeout(800);

  // ── 2) Onboarding-Guide komplett ───────────────────────────────────────────────────────────
  const guideLog = [];
  let step = 0;
  const MAX_STEPS = 35;
  while (step < MAX_STEPS) {
    const rootCount = await page.locator(".onboarding-guide-root").count();
    if (rootCount === 0) { console.log(`[guide] beendet nach ${step} Schritten`); break; }

    const info = await page.evaluate(() => {
      const target = document.querySelector(".guide-target");
      const spotlight = document.querySelector(".guide-spotlight");
      const bubble = document.querySelector(".guide-bubble");
      const br = bubble ? bubble.getBoundingClientRect() : null;
      const rect = spotlight ? spotlight.getBoundingClientRect() : null;
      const img = document.querySelector(".guide-bubble .npc-greeting-head img");
      return {
        guideId: target ? target.getAttribute("data-guide-id") : null,
        speaker: document.querySelector(".guide-bubble .npc-bubble-name")?.textContent.trim() ?? null,
        medallionImg: img ? { src: img.getAttribute("src"), loaded: img.complete && img.naturalWidth > 0 } : null,
        title: document.querySelector(".guide-bubble-title")?.textContent.trim() ?? null,
        body: document.querySelector(".guide-bubble-body")?.textContent.trim() ?? null,
        hasHint: !!document.querySelector(".guide-bubble-hint"),
        hasContinueBtn: !!document.querySelector(".guide-bubble-footer button.combat-btn"),
        skipLabel: document.querySelector(".guide-bubble-skip")?.textContent.trim() ?? null,
        spotRect: rect ? { t: Math.round(rect.top), l: Math.round(rect.left), w: Math.round(rect.width), h: Math.round(rect.height) } : null,
        bubbleRect: br ? { t: Math.round(br.top), l: Math.round(br.left), b: Math.round(br.bottom), r: Math.round(br.right) } : null,
        vp: { w: window.innerWidth, h: window.innerHeight },
      };
    });

    const offscreen = info.spotRect && (info.spotRect.t < -2 || info.spotRect.l < -2 || info.spotRect.t > info.vp.h || info.spotRect.l > info.vp.w);
    const bubbleClipped = info.bubbleRect && (info.bubbleRect.t < 0 || info.bubbleRect.l < 0 || info.bubbleRect.b > info.vp.h || info.bubbleRect.r > info.vp.w);
    guideLog.push({ step, ...info, offscreen: !!offscreen, bubbleClipped: !!bubbleClipped });
    console.log(`[guide ${step}] id=${info.guideId} speaker="${info.speaker}" title="${info.title}" medallion=${info.medallionImg ? (info.medallionImg.loaded ? "ok" : "BROKEN") : "FEHLT"} offscreen=${!!offscreen} clipped=${!!bubbleClipped}`);
    if (info.speaker !== "Der Wächter") problems.push(`Guide Schritt ${step} (${info.guideId}): Sprecher ist "${info.speaker}" statt "Der Wächter"`);
    if (!info.medallionImg) problems.push(`Guide Schritt ${step} (${info.guideId}): Kopf-Medaillon-Bild fehlt`);
    else if (!info.medallionImg.loaded) problems.push(`Guide Schritt ${step} (${info.guideId}): Medaillon-Bild lädt nicht (${info.medallionImg.src})`);
    if (offscreen) problems.push(`Guide Schritt ${step} (${info.guideId}): Spotlight offscreen`);
    if (bubbleClipped) problems.push(`Guide Schritt ${step} (${info.guideId}): Sprechblase ragt aus dem Viewport (${JSON.stringify(info.bubbleRect)})`);
    if (!info.title || !info.body) problems.push(`Guide Schritt ${step} (${info.guideId}): Titel/Body leer`);

    await shot(page, `b${String(step).padStart(2, "0")}-guide-${slug(info.guideId)}`);
    // 1366er-Querschnitt an zwei Stellen
    if (step === 0 || step === 8) {
      await page.setViewportSize({ width: 1366, height: 768 });
      await page.waitForTimeout(350);
      await shot(page, `b${String(step).padStart(2, "0")}-guide-${slug(info.guideId)}-1366`);
      const clipped1366 = await page.evaluate(() => {
        const b = document.querySelector(".guide-bubble")?.getBoundingClientRect();
        return b ? b.top < 0 || b.left < 0 || b.bottom > window.innerHeight || b.right > window.innerWidth : false;
      });
      if (clipped1366) problems.push(`Guide Schritt ${step}: Sprechblase @1366×768 abgeschnitten`);
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.waitForTimeout(300);
    }

    if (info.guideId && info.hasHint) {
      try { await page.locator(".guide-target").first().click({ timeout: 5000 }); }
      catch (e) { problems.push(`Guide Schritt ${step} (${info.guideId}): Ziel-Klick fehlgeschlagen → HÄNGER (${String(e).slice(0, 120)})`); break; }
    } else if (info.hasContinueBtn) {
      await page.locator(".guide-bubble-footer button.combat-btn").click({ timeout: 5000 });
    } else {
      problems.push(`Guide Schritt ${step} (${info.guideId}): weder Ziel noch Weiter-Button → HÄNGER`);
      break;
    }
    await page.waitForTimeout(500);
    step += 1;
  }
  if (step >= MAX_STEPS) problems.push("Guide endete nicht innerhalb von 35 Schritten (Schleife?)");
  writeFileSync(join(OUT_DIR, "guide-log.json"), JSON.stringify(guideLog, null, 2));
  await shot(page, "b99-after-guide");

  // ── 3) Story-Tab ───────────────────────────────────────────────────────────────────────────
  await page.locator('[data-guide-id="topbar.quests"]').first().click();
  await page.waitForSelector(".quests-page", { timeout: 8000 });
  await page.waitForTimeout(600);
  const storyOpen = await page.evaluate(() => ({
    activeTab: document.querySelector(".quests-tab-btn--active")?.textContent.trim() ?? null,
    tabs: [...document.querySelectorAll(".quests-tab-btn")].map((b) => b.textContent.trim()),
  }));
  console.log("QUESTS Tabs: " + JSON.stringify(storyOpen));
  if (!storyOpen.activeTab || !/story/i.test(storyOpen.activeTab)) {
    problems.push(`Story-Tab öffnet NICHT automatisch beim ersten Quest-Besuch (aktiv: "${storyOpen.activeTab}")`);
    const st = page.locator(".quests-tab-btn", { hasText: /Story/i }).first();
    if (await st.count()) await st.click();
    await page.waitForTimeout(400);
  }
  const ch1 = await page.evaluate(() => {
    const stage = document.querySelector(".chronicle-stage");
    const obj = stage?.querySelector(".chronicle-obj");
    return {
      present: !!stage,
      counter: document.querySelector(".chronicle-tab-counter")?.textContent.trim() ?? null,
      title: stage?.querySelector(".chronicle-stage-title")?.textContent.trim() ?? null,
      status: stage?.querySelector(".quest-status-badge")?.textContent.trim() ?? null,
      bubbleName: stage?.querySelector(".npc-bubble-name")?.textContent.trim() ?? null,
      bubbleText: (stage?.querySelector(".npc-bubble-text")?.textContent.trim() ?? "").slice(0, 120),
      objText: obj?.textContent.trim() ?? null,
      objWhere: obj?.querySelector(".chronicle-obj-where")?.textContent.trim() ?? null,
      objCount: obj?.querySelector(".chronicle-obj-count")?.textContent.trim() ?? null,
      claimBtn: !!stage?.querySelector(".chronicle-stage-claim"),
      description: stage?.querySelector(".chronicle-stage-desc, .chronicle-stage-description")?.textContent.trim() ?? null,
    };
  });
  console.log("KAPITEL 1: " + JSON.stringify(ch1, null, 1));
  if (!ch1.present) problems.push("Kapitel-1-Bühne fehlt auf dem Story-Tab (frisches Spiel)");
  if (ch1.present && ch1.title !== "Die erste Seite") problems.push(`Kapitel-1-Titel: "${ch1.title}" (erwartet "Die erste Seite")`);
  if (ch1.present && (!ch1.bubbleText || ch1.bubbleText.length < 20)) problems.push("Kapitel 1: loreText/Wächter-Sprechblase fehlt oder leer");
  if (ch1.present && ch1.objCount !== "0 / 25") notes.push(`Kapitel 1 Ziel-Zähler: "${ch1.objCount}" (erwartet "0 / 25")`);
  if (ch1.claimBtn) problems.push("Kapitel 1: Claim-Button sichtbar obwohl 0/25");
  await shotBoth(page, "c01-story-ch1");

  // ── 4) Erste Sammel-Aktion (Woodcutting) ──────────────────────────────────────────────────
  await page.locator('[data-guide-id="sidebar.woodcutting"]').first().click();
  await page.waitForSelector(".skill-page", { timeout: 8000 });
  await page.waitForTimeout(400);
  await shot(page, "c02-woodcutting");
  const firstCta = page.locator(".skillcard-cta").first();
  const ctaLabel = await firstCta.textContent();
  console.log("Erste Aktions-CTA: " + ctaLabel.trim());
  await firstCta.click();
  await page.waitForTimeout(500);
  const actionRunning = await page.evaluate(() => window.__hfDebug?.state?.activeActionId ?? null);
  console.log("Aktive Aktion: " + actionRunning);
  if (!actionRunning) problems.push("Erste Sammel-Aktion startet nicht (activeActionId null nach Klick auf Start)");
  // ~12s sammeln lassen
  await page.waitForTimeout(12000);
  const gathered1 = await page.evaluate(() => window.__hfDebug.state.stats.itemsGathered);
  console.log("itemsGathered nach ~12s: " + gathered1);
  if (gathered1 < 1) problems.push("Nach 12s Holzfällen: itemsGathered noch 0 (zählt die erste Sammel-Aktion nicht?)");

  // Live-Fortschritt im Story-Tab beobachten (Aktion läuft weiter)
  await page.locator('[data-guide-id="topbar.quests"]').first().click();
  await page.waitForSelector(".quests-page", { timeout: 8000 });
  await page.waitForTimeout(500);
  const liveA = await page.evaluate(() => document.querySelector(".chronicle-obj-count")?.textContent.trim() ?? null);
  await page.waitForTimeout(9000);
  const liveB = await page.evaluate(() => document.querySelector(".chronicle-obj-count")?.textContent.trim() ?? null);
  console.log(`Story-Tab live: "${liveA}" → nach 9s: "${liveB}"`);
  if (liveA === liveB) problems.push(`Story-Tab-Fortschritt aktualisiert NICHT live während des Sammelns ("${liveA}" → "${liveB}")`);
  await shot(page, "c03-story-ch1-progress");

  // ── 5) Kapitel 1 erfüllen + einlösen ──────────────────────────────────────────────────────
  await page.evaluate(() => {
    const st = window.__hfDebug.state;
    st.stats.itemsGathered = 25;
    st.activeActionId = null; // Aktion stoppen, Neuling geht zur Quest
  });
  await page.waitForTimeout(600);
  const ch1done = await page.evaluate(() => {
    const stage = document.querySelector(".chronicle-stage");
    return {
      done: stage?.classList.contains("chronicle-stage--done") ?? false,
      status: stage?.querySelector(".quest-status-badge")?.textContent.trim() ?? null,
      objCount: document.querySelector(".chronicle-obj-count")?.textContent.trim() ?? null,
      claimText: stage?.querySelector(".chronicle-stage-claim")?.textContent.trim() ?? null,
      rewards: [...(stage?.querySelectorAll(".quest-reward-chip") ?? [])].map((c) => c.textContent.trim()),
    };
  });
  console.log("KAPITEL 1 FERTIG: " + JSON.stringify(ch1done));
  if (!ch1done.claimText) problems.push("Kapitel 1: kein Claim-Button trotz 25/25");
  await shot(page, "c04-story-ch1-done");
  await page.locator(".chronicle-stage-claim").first().click();
  await page.waitForTimeout(800);
  const ch2 = await page.evaluate(() => {
    const stage = document.querySelector(".chronicle-stage");
    const objs = [...(stage?.querySelectorAll(".chronicle-obj") ?? [])].map((o) => ({
      text: o.textContent.trim().slice(0, 100),
      where: o.querySelector(".chronicle-obj-where")?.textContent.trim() ?? null,
      count: o.querySelector(".chronicle-obj-count")?.textContent.trim() ?? null,
    }));
    return {
      counter: document.querySelector(".chronicle-tab-counter")?.textContent.trim() ?? null,
      title: stage?.querySelector(".chronicle-stage-title")?.textContent.trim() ?? null,
      objs,
      unlocks: [...(stage?.querySelectorAll(".quest-reward-chip--unlock") ?? [])].map((c) => c.textContent.trim()),
      rewardChips: [...(stage?.querySelectorAll(".quest-reward-chip") ?? [])].map((c) => c.textContent.trim()),
      history: document.querySelector(".chronicle-history-toggle")?.textContent.trim() ?? null,
    };
  });
  console.log("KAPITEL 2 AKTIV: " + JSON.stringify(ch2, null, 1));
  if (ch2.title !== "Erstes Blut") problems.push(`Nach Claim von Kapitel 1 ist nicht "Erstes Blut" aktiv, sondern "${ch2.title}"`);
  if (ch2.objs.length !== 2) problems.push(`Kapitel 2 zeigt ${ch2.objs.length} Ziel-Zeilen (erwartet 2: Weidentiere + Bulle)`);
  notes.push(`Kapitel-2-"Schaltet frei"-Chips: ${JSON.stringify(ch2.unlocks)} (Content gated nichts an chronicle_02 → leer wäre korrekt)`);
  await shotBoth(page, "c05-story-ch2");

  // ── 6) Kapitel 2 real anspielen: Combat-Erst-Tour + echter Kill ───────────────────────────
  await page.locator('[data-guide-id="sidebar.combat"]').first().click();
  await page.waitForSelector(".combat-page", { timeout: 8000 });
  await page.waitForTimeout(700);
  // Erst-Tour?
  let tourSteps = 0;
  const tourLog = [];
  while (tourSteps < 12) {
    const root = await page.locator(".onboarding-guide-root").count();
    if (root === 0) break;
    const tInfo = await page.evaluate(() => ({
      speaker: document.querySelector(".guide-bubble .npc-bubble-name")?.textContent.trim() ?? null,
      title: document.querySelector(".guide-bubble-title")?.textContent.trim() ?? null,
      body: (document.querySelector(".guide-bubble-body")?.textContent.trim() ?? "").slice(0, 100),
      cont: document.querySelector(".guide-bubble-footer button.combat-btn")?.textContent.trim() ?? null,
    }));
    tourLog.push(tInfo);
    console.log(`[combat-tour ${tourSteps}] speaker="${tInfo.speaker}" title="${tInfo.title}"`);
    if (tourSteps === 0) await shot(page, "d01-combat-tour-first");
    if (!tInfo.cont) { problems.push("Combat-Erst-Tour: kein Weiter-Button → Hänger"); break; }
    await page.locator(".guide-bubble-footer button.combat-btn").click();
    await page.waitForTimeout(450);
    tourSteps += 1;
  }
  console.log(`Combat-Erst-Tour: ${tourSteps} Schritte durchgeklickt`);
  if (tourSteps === 0) problems.push("Combat-Erst-Tour erschien NICHT beim ersten Besuch der Kampf-Seite");
  writeFileSync(join(OUT_DIR, "combat-tour-log.json"), JSON.stringify(tourLog, null, 2));
  // Sofort-Wiederkehr-Check: wegnavigieren + zurück
  await page.locator('[data-guide-id="topbar.character"]').first().click();
  await page.waitForTimeout(400);
  await page.locator('[data-guide-id="sidebar.combat"]').first().click();
  await page.waitForSelector(".combat-page", { timeout: 8000 });
  await page.waitForTimeout(700);
  const tourAgain = await page.locator(".onboarding-guide-root").count();
  if (tourAgain > 0) problems.push("Combat-Erst-Tour erscheint beim ZWEITEN Besuch erneut (soll genau einmal)");
  else console.log("Combat-Tour beim zweiten Besuch: nicht wieder da (OK)");

  // Zonen-Übersicht: Weiden offen? Grenzlande gesperrt?
  const zones = await page.evaluate(() => [...document.querySelectorAll(".zone-card")].map((c) => ({
    name: c.querySelector(".zone-card-name")?.textContent.trim() ?? "?",
    locked: c.classList.contains("zone-card-story-locked"),
    disabled: c.disabled,
    lockBadge: !!c.querySelector(".zone-card-story-lock-badge"),
    hint: c.querySelector(".zone-card-locked-hint")?.textContent.trim() ?? null,
  })));
  console.log("ZONEN: " + JSON.stringify(zones, null, 1));
  await shotBoth(page, "d02-combat-zones");
  const pastures = zones.find((z) => /Weide/i.test(z.name));
  const borderlands = zones.find((z) => /Grenzlande/i.test(z.name));
  if (!pastures || pastures.locked) problems.push("Weiden (Startzone) fehlt oder ist gesperrt");
  if (!borderlands) problems.push("Grenzlande-Karte fehlt komplett in der Zonen-Liste");
  else {
    if (!borderlands.locked || !borderlands.lockBadge) problems.push("Grenzlande NICHT als gesperrt markiert (Schloss-Badge fehlt)");
    if (!borderlands.hint) problems.push("Grenzlande: kein sichtbarer Hinweistext, was zum Entsperren nötig ist");
    else console.log(`Grenzlande-Hinweis: "${borderlands.hint}"`);
  }
  // Klick auf gesperrte Grenzlande → wirkungslos?
  const beforeClick = await page.evaluate(() => !!document.querySelector(".zone-card"));
  const blCard = page.locator(".zone-card", { hasText: "Grenzlande" }).first();
  if (await blCard.count()) {
    await blCard.click({ force: true }).catch(() => {});
    await page.waitForTimeout(500);
    const stillOnZones = await page.evaluate(() => !!document.querySelector(".zone-card"));
    if (beforeClick && !stillOnZones) problems.push("Klick auf gesperrte Grenzlande öffnet die Zone TROTZDEM");
    else console.log("Klick auf gesperrte Grenzlande: wirkungslos (OK)");
  }

  // Weiden öffnen → Monster-Liste
  await page.locator(".zone-card", { hasText: "Weide" }).first().click();
  await page.waitForTimeout(700);
  const monsters = await page.evaluate(() => [...document.querySelectorAll(".monster-card")].map((c) => ({
    name: c.querySelector(".monster-card-name")?.textContent.trim() ?? "?",
  })));
  console.log("WEIDEN-MONSTER: " + JSON.stringify(monsters.map((m) => m.name)));
  await shotBoth(page, "d03-pasture-monsters");
  const bullCard = monsters.find((m) => /Bulle|Bull/i.test(m.name));
  if (!bullCard) notes.push("Bullen-Boss NICHT in der Weiden-Monster-Liste sichtbar (wo findet der Neuling ihn?)");

  // Echten Kampf gegen das erste/schwächste Tier starten (Huhn)
  const firstMonsterCard = page.locator(".monster-card").first();
  const firstName = await firstMonsterCard.locator(".monster-card-name").textContent();
  console.log("Kämpfe gegen: " + firstName.trim());
  await firstMonsterCard.locator(".mc-fight-btn").click();
  await page.waitForTimeout(1000);
  await shot(page, "d04-first-fight");
  // Auf ersten echten Kill warten (bis 60s)
  let kills = null;
  for (let i = 0; i < 60; i++) {
    kills = await page.evaluate(() => {
      const mk = window.__hfDebug.state.monsterKills;
      return Object.entries(mk).filter(([, v]) => v > 0);
    });
    if (kills.length > 0) break;
    await page.waitForTimeout(1000);
  }
  console.log("Echte Kills nach Wartezeit: " + JSON.stringify(kills));
  if (!kills || kills.length === 0) problems.push("60s Auto-Kampf gegen das erste Weidentier: KEIN Kill registriert");
  await shot(page, "d05-fight-running");

  // Story-Tab: zählt der echte Kill in der Union? Und Live-Update bei weiteren Kills?
  await page.locator('[data-guide-id="topbar.quests"]').first().click();
  await page.waitForSelector(".quests-page", { timeout: 8000 });
  await page.waitForTimeout(600);
  const unionA = await page.evaluate(() => [...document.querySelectorAll(".chronicle-obj")].map((o) => o.querySelector(".chronicle-obj-count")?.textContent.trim()));
  console.log("Kapitel-2-Zähler nach echtem Kill: " + JSON.stringify(unionA));
  const killTotal = (kills ?? []).reduce((s, [, v]) => s + v, 0);
  if (unionA[0] && !unionA[0].startsWith(String(killTotal))) {
    problems.push(`Union-Zähler zeigt "${unionA[0]}", aber echte Kills = ${killTotal} (${JSON.stringify(kills)})`);
  }
  // Injizierte cow/boar/goat-Kills → Live-Union-Check am offenen Tab
  await page.evaluate(() => {
    const mk = window.__hfDebug.state.monsterKills;
    mk["cow"] = (mk["cow"] ?? 0) + 5;
    mk["boar"] = (mk["boar"] ?? 0) + 4;
    mk["feral_goat"] = (mk["feral_goat"] ?? 0) + 3;
  });
  await page.waitForTimeout(700);
  const unionB = await page.evaluate(() => [...document.querySelectorAll(".chronicle-obj")].map((o) => o.querySelector(".chronicle-obj-count")?.textContent.trim()));
  console.log("Union-Zähler nach +5 Kuh +4 Eber +3 Ziege (live am offenen Tab): " + JSON.stringify(unionB));
  const expected = killTotal + 12;
  if (!unionB[0]?.startsWith(String(Math.min(expected, 15)))) {
    problems.push(`Varianten-Union zählt falsch/nicht live: Zähler "${unionB[0]}", erwartet ${Math.min(expected, 15)} / 15`);
  }
  await shot(page, "d06-story-ch2-union");

  // Kapitel 2 komplett: Union auf 15 + Bulle
  await page.evaluate(() => {
    const mk = window.__hfDebug.state.monsterKills;
    mk["chicken"] = (mk["chicken"] ?? 0) + 15;
    mk["bull_boss"] = (mk["bull_boss"] ?? 0) + 1;
    window.__hfDebug.state.activeCombat = null; // Kampf beenden
  });
  await page.waitForTimeout(700);
  const ch2done = await page.evaluate(() => ({
    status: document.querySelector(".chronicle-stage .quest-status-badge")?.textContent.trim() ?? null,
    claim: !!document.querySelector(".chronicle-stage-claim"),
    objs: [...document.querySelectorAll(".chronicle-obj")].map((o) => ({
      count: o.querySelector(".chronicle-obj-count")?.textContent.trim(),
      done: o.classList.contains("chronicle-obj--done"),
    })),
  }));
  console.log("KAPITEL 2 FERTIG: " + JSON.stringify(ch2done));
  if (!ch2done.claim) problems.push("Kapitel 2: kein Claim-Button trotz erfüllter Ziele (15 Union + Bulle)");
  await shot(page, "d07-story-ch2-done");
  if (ch2done.claim) {
    await page.locator(".chronicle-stage-claim").first().click();
    await page.waitForTimeout(800);
  }
  const ch3 = await page.evaluate(() => {
    const stage = document.querySelector(".chronicle-stage");
    return {
      title: stage?.querySelector(".chronicle-stage-title")?.textContent.trim() ?? null,
      unlocks: [...(stage?.querySelectorAll(".quest-reward-chip--unlock") ?? [])].map((c) => c.textContent.trim()),
      unlocksLabel: stage?.querySelector(".quest-rewards-label")?.textContent.trim() ?? null,
    };
  });
  console.log("KAPITEL 3: " + JSON.stringify(ch3));
  if (ch3.title !== "Der Funke im Korn") problems.push(`Nach Claim Kapitel 2 nicht "Der Funke im Korn" aktiv: "${ch3.title}"`);
  if (!ch3.unlocks.some((u) => /Grenzlande/i.test(u))) problems.push(`Kapitel 3 zeigt KEINE "Schaltet frei: Grenzlande"-Zeile (Chips: ${JSON.stringify(ch3.unlocks)})`);
  await shotBoth(page, "d08-story-ch3-unlocks");

  // Grenzlande weiterhin gesperrt (chronicle_03 noch offen)
  await page.locator('[data-guide-id="sidebar.combat"]').first().click();
  await page.waitForSelector(".combat-page", { timeout: 8000 });
  await page.waitForTimeout(500);
  // Falls wir noch in der Weiden-Detailansicht sind: zurück zur Zonen-Übersicht
  const backBtn = page.locator(".combat-page button", { hasText: /Zurück|zurück/ }).first();
  if (await backBtn.count()) { await backBtn.click().catch(() => {}); await page.waitForTimeout(400); }
  const blFinal = await page.evaluate(() => {
    const cards = [...document.querySelectorAll(".zone-card")];
    const bl = cards.find((c) => /Grenzlande/.test(c.querySelector(".zone-card-name")?.textContent ?? ""));
    return bl ? { locked: bl.classList.contains("zone-card-story-locked"), hint: bl.querySelector(".zone-card-locked-hint")?.textContent.trim() } : null;
  });
  console.log("Grenzlande nach Kapitel-2-Claim: " + JSON.stringify(blFinal));
  if (blFinal && !blFinal.locked) problems.push("Grenzlande bereits VOR Abschluss von Kapitel 3 entsperrt");
  await shot(page, "d09-borderlands-still-locked");

  await browser.close();
} catch (e) {
  problems.push("FATAL: " + String(e.stack || e).slice(0, 400));
} finally {
  child.kill();
  console.log("\n==== NOTES ====\n" + (notes.length ? notes.join("\n") : "-"));
  console.log("\n==== PROBLEME ====\n" + (problems.length ? problems.map((p) => "- " + p).join("\n") : "KEINE"));
  const uniqErr = [...new Set(errors)];
  console.log("\n==== KONSOLE (" + uniqErr.length + " uniq) ====\n" + uniqErr.slice(0, 15).join("\n"));
}
