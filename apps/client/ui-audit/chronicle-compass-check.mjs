#!/usr/bin/env node
/**
 * Aschechronik Kompass/Panel/Zonen-Gate — Verifikation (ceo-run-2026-07-13 Welle E, ui-dev).
 *
 * Content-dev (Welle D2) landet parallel zu diesem Run die echten 21 `chronicle_*`-Quests +
 * `requiresQuest`-Zonen-Gates — zum Zeitpunkt, an dem dieses Skript geschrieben wurde, existierten
 * sie noch nicht. Damit der Check UNABHÄNGIG vom exakten Landungsstand deterministisch bleibt,
 * räumt der Haupt-Testblock zuerst ALLE `chronicle_*`-Einträge aus `content.quests` (falls
 * vorhanden) und injiziert dann zwei eigene, isolierte Test-Kapitel — genau wie
 * paragon-tower-shot.mjs für den Paragonturm, über `window.__hfDebug.content` (derselbe live
 * Objekt-Zeiger wie `@hearthforge/content`, s. GameContext.tsx). KEIN packages/content-Edit, reiner
 * In-Memory-Patch im Playwright-Prozess; danach läuft alles über die echten Engine-Selektoren
 * (isZoneUnlocked/questStatus/objectiveProgress). Ein ZUSÄTZLICHER Durchlauf ganz am Ende prüft
 * den unveränderten REALEN Content (falls Welle D2 inzwischen gelandet ist).
 *
 * Prüft:
 *  (0) NULLIPOTENZ: Content ohne jedes `chronicle_*` (explizit geleert) → kein Kompass-Pin, kein
 *      Chronik-Band, kein gesperrter Zone-Card irgendwo — CombatPage/QuestsPage exakt wie heute.
 *  (a) Kompass-Pin erscheint mit Kapitel+loreText, sobald chronicle_01 (mit loreText, requires:
 *      [], hohes Kill-Total-Ziel) aktiv ist; Panel öffnet mit Wächter-Kopf + Sprechblase + Text.
 *  (b) Fallback ohne loreText (chronicle_02, kein loreText-Feld): Panel zeigt nur Ziele, kein
 *      leerer/kaputter Kasten.
 *  (c) Zone (`pastures`) mit `requiresQuest: "chronicle_02"` rendert gesperrt (Schloss + Hinweis
 *      mit Kapitelnamen), Klick bleibt wirkungslos (Zonen-Grid bleibt stehen); Bestiary-
 *      "Kämpfen"-Button für ein pastures-Monster ist disabled mit demselben Hinweis.
 *  (d) QuestsPage-Chronik-Band: aktives Kapitel prominent (mit/ohne loreText je nach Kapitel),
 *      abgeschlossene Kapitel als aufklappbare Historie, Zähler "Kapitel X von Y".
 *  (e) Nach Claim BEIDER Test-Kapitel: Kompass verschwindet wieder, Zone entsperrt sich.
 *  (f) REALER Content (falls Welle D2 gelandet ist): Kompass + Panel mit dem echten chronicle_01,
 *      mindestens eine echte gated Zone rendert gesperrt (Legacy-Grant für den Test entfernt).
 *
 * Screenshots 1920×1080 + 1366×768. Port 5247 (Task-Vorgabe).
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5247;
const BASE_URL = `http://localhost:${PORT}`;
const OUT_DIR = "C:\\Users\\MSchu\\AppData\\Local\\Temp\\claude\\G--GameDev\\553d2095-3a73-4795-9782-0fe746a25f13\\scratchpad";

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

/** QuestsPage öffnet standardmäßig auf dem "Daily"-Tab — ChronicleBand lebt im "Story"-Tab
 *  (dieselbe Liste, aus der die chronicle_*-Quests herausgefiltert werden). */
async function goToQuestsStoryTab(page) {
  await page.waitForSelector(".quests-page", { timeout: 8000 });
  await clickRetry(page, page.locator(".quests-tab-btn", { hasText: "Story" }).first());
  await page.waitForTimeout(300);
}

/** Fixture-Patch via route (Muster arena-rework-check.mjs): mutator(fixtureJson.state) läuft
 *  über das midgame-JSON, BEVOR die App es lädt. Hier: Haupt-Guide + alle Bereichs-Erst-Touren
 *  (Kampf/Shop/Bank, AreaTourGuide.tsx) als "schon gesehen" markieren — sonst blockiert die
 *  Spotlight-Tour beim ersten Kampf-/Shop-/Bank-Besuch dieses Skripts jeden weiteren Klick
 *  (hat mit der Aschechronik selbst nichts zu tun, reines Test-Setup-Rauschen). */
async function routeFixtureNoTours(page) {
  await page.route("**/ui-audit-fixtures/midgame.json", async (route) => {
    const res = await route.fetch();
    const json = JSON.parse(await res.text());
    json.state.onboarding = { active: false, step: 0, done: true, toursSeen: { combat: true, shop: true, bank: true } };
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(json) });
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
  wirePage(page, "main");
  // Default-Locale ist "de" (i18n/index.tsx initialLocale()) — für verlässliche String-Asserts
  // (Monsternamen/Zonennamen/NPC-Name/synthetische Test-Quest-Namen) fest auf "en" pinnen.
  await page.addInitScript(() => {
    try { localStorage.setItem("hearthforge:locale", "en"); } catch { /* noop */ }
  });
  await routeFixtureNoTours(page);

  await page.goto(`${BASE_URL}/?fixture=midgame`, { waitUntil: "load" });
  await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
  await page.waitForFunction(() => !!window.__hfDebug, null, { timeout: 8000 });
  await page.waitForTimeout(1200);

  // Content-dev (Welle D2) landet parallel die echten chronicle_*-Quests/-Gates — für den
  // deterministischen Hauptteil dieses Skripts ALLE bestehenden chronicle_*-Quests + Zonen-Gates
  // entfernen, damit Nullipotenz- und Test-Kapitel-Checks unabhängig vom Landungsstand laufen.
  // Der reale Content bleibt dabei unangetastet (kein packages/content-Edit) — nur der In-Memory-
  // Objekt-Zeiger in DIESER Playwright-Seite wird für die Dauer des Laufs bereinigt.
  const realChronicleCount = await page.evaluate(() => {
    const { content } = window.__hfDebug;
    const realIds = content.quests.filter((q) => q.id.startsWith("chronicle_")).map((q) => q.id);
    content.quests = content.quests.filter((q) => !q.id.startsWith("chronicle_"));
    for (const z of content.zones) delete z.requiresQuest;
    return realIds.length;
  });
  console.log(`Real chronicle_*-Quests im Content vor Bereinigung: ${realChronicleCount} (Welle D2 Landungsstand — 0 oder 21 erwartet)`);
  await page.waitForTimeout(400);

  // ── (0) NULLIPOTENZ: Content ohne jedes chronicle_* ───────────────────────────────────────
  const baseline = await page.evaluate(() => ({
    pinPresent: !!document.querySelector(".chronicle-pin"),
  }));
  console.log("NULLIPOTENZ (chronicle_*-frei) — pin present: " + baseline.pinPresent + " (expected false)");
  if (baseline.pinPresent) problems.push("REGRESSION: Kompass-Pin sichtbar ohne chronicle_*-Content");

  await clickRetry(page, page.locator('[data-guide-id="topbar.quests"]').first());
  await goToQuestsStoryTab(page);
  const baselineQuests = await page.evaluate(() => ({
    bandPresent: !!document.querySelector(".chronicle-band"),
    storyListPresent: !!document.querySelector(".quests-list, .placeholder"),
  }));
  console.log("NULLIPOTENZ quests page: " + JSON.stringify(baselineQuests) + " (band expected false)");
  if (baselineQuests.bandPresent) problems.push("REGRESSION: Chronik-Band sichtbar ohne chronicle_*-Content");
  await page.screenshot({ path: join(OUT_DIR, "chronicle-00-baseline-quests-1920.png") });

  await clickRetry(page, page.locator('[data-guide-id="sidebar.combat"]').first());
  await page.waitForSelector(".combat-page", { timeout: 8000 });
  await page.waitForTimeout(400);
  const baselineCombat = await page.evaluate(() => {
    // Slayer-Turm-Etagen tragen ebenfalls die Basisklasse "zone-card" und sind schon HEUTE
    // level-gated (disabled) — das ist bestehendes, unabhängiges Verhalten, keine Chronik-
    // Regression. Nur echte Story-Zonenkarten (kein .slayer-floor-zone-card) zählen hier.
    const cards = [...document.querySelectorAll(".zone-card:not(.slayer-floor-zone-card)")];
    return {
      totalCards: cards.length,
      lockedCards: cards.filter((c) => c.classList.contains("zone-card-story-locked")).length,
      disabledCards: cards.filter((c) => c.disabled).length,
    };
  });
  console.log("NULLIPOTENZ combat zone-cards (excl. slayer-tower floors): " + JSON.stringify(baselineCombat) + " (locked/disabled expected 0)");
  if (baselineCombat.lockedCards > 0 || baselineCombat.disabledCards > 0) {
    problems.push(`REGRESSION: ${baselineCombat.lockedCards} gesperrte / ${baselineCombat.disabledCards} disabled Zone-Cards ohne chronicle_*-Content`);
  }
  await page.screenshot({ path: join(OUT_DIR, "chronicle-00-baseline-combat-1920.png") });
  console.log("SHOT SAVED: chronicle-00-baseline-*.png");

  // ── Content-Patch: 2 synthetische Kapitel + 1 Zonen-Gate (In-Memory, kein packages/content-Edit) ──
  await page.evaluate(() => {
    const { content } = window.__hfDebug;
    content.quests.push({
      id: "chronicle_01",
      name: { en: "Chronicle Test One", de: "Chronik-Test Eins" },
      description: { en: "Test chapter one.", de: "Test-Kapitel eins." },
      loreText: {
        en: "This is a test lore passage for chapter one, written by the Warden.",
        de: "Dies ist ein Test-Erzähltext für Kapitel eins, geschrieben vom Wächter.",
      },
      objectives: [{ type: "kill_total", count: 999999 }],
      rewards: { gold: 1 },
    });
    content.quests.push({
      id: "chronicle_02",
      name: { en: "Chronicle Test Two", de: "Chronik-Test Zwei" },
      description: { en: "Test chapter two.", de: "Test-Kapitel zwei." },
      // Bewusst OHNE loreText — deckt den Fallback (nur Ziele, kein leerer Kasten) ab.
      requires: ["chronicle_01"],
      objectives: [{ type: "kill_total", count: 999999 }],
      rewards: { gold: 1 },
    });
    const pastures = content.zones.find((z) => z.id === "pastures");
    if (pastures) pastures.requiresQuest = "chronicle_02";
    // midgame.json ist ein PRE-v63-Save — beim Laden migriert es und erhält per Bestandsschutz
    // (v62→63-Migration) `legacyZoneGrants` für ALLE v62-Zonen, inkl. "pastures". Neue Saves ab
    // Launch starten mit `legacyZoneGrants: {}` — für den UI-Gate-Test hier den Alt-Save-Grant
    // gezielt entfernen, sonst würde JEDE reale Zone in dieser Fixture immer "unlocked" bleiben.
    window.__hfDebug.state.legacyZoneGrants["pastures"] = false;
    // Bestiary zeigt ein Monster nur mit "Kämpfen"-Button, sobald es ≥1× bezwungen wurde
    // (monsterKills > 0) — die Fixture hat "chicken" (pastures) noch nie getötet, ohne Patch
    // bliebe die Karte "???" (kein Fight-Button zu prüfen). Reiner Test-Setup-Baustein.
    window.__hfDebug.state.monsterKills["chicken"] = 1;
  });
  await page.waitForTimeout(600);
  const patchDiag = await page.evaluate(() => {
    const { content, state } = window.__hfDebug;
    return {
      chronicleQuestIds: content.quests.filter((q) => q.id.startsWith("chronicle_")).map((q) => q.id),
      pasturesGate: content.zones.find((z) => z.id === "pastures")?.requiresQuest,
      pasturesLegacyGrant: state.legacyZoneGrants["pastures"],
      statsKills: state.stats.kills,
      questsClaimed: state.quests.claimed,
    };
  });
  console.log("PATCH DIAG: " + JSON.stringify(patchDiag));

  // ── (a) Kompass-Pin erscheint mit Kapitel 1 + loreText ────────────────────────────────────
  await clickRetry(page, page.locator('[data-guide-id="topbar.character"]').first());
  await page.waitForTimeout(300);
  const pinInfo = await page.evaluate(() => {
    const pin = document.querySelector(".chronicle-pin");
    if (!pin) return { present: false };
    return {
      present: true,
      chapter: pin.querySelector(".chronicle-pin-chapter")?.textContent.trim(),
      name: pin.querySelector(".chronicle-pin-name")?.textContent.trim(),
    };
  });
  console.log("PIN (chapter 1 active): " + JSON.stringify(pinInfo));
  if (!pinInfo.present) problems.push("Kompass-Pin fehlt trotz aktivem chronicle_01");
  else {
    if (!pinInfo.chapter?.includes("1")) problems.push(`Pin-Kapitelnummer falsch: "${pinInfo.chapter}"`);
    if (pinInfo.name !== "Chronicle Test One") problems.push(`Pin-Name falsch: "${pinInfo.name}"`);
  }
  await page.screenshot({ path: join(OUT_DIR, "chronicle-01-pin-1920.png") });
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(OUT_DIR, "chronicle-01-pin-1366.png") });
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.waitForTimeout(200);
  console.log("SHOT SAVED: chronicle-01-pin-*.png");

  // ── Panel öffnen: Wächter-Kopf + Sprechblase + loreText + Ziele + Link-Button ─────────────
  await clickRetry(page, page.locator(".chronicle-pin").first());
  await page.waitForSelector(".chronicle-panel", { timeout: 5000 });
  await page.waitForTimeout(300);
  const panelInfo = await page.evaluate(() => {
    const panel = document.querySelector(".chronicle-panel");
    const img = panel.querySelector(".npc-greeting-img");
    const bubbleName = panel.querySelector(".npc-bubble-name");
    const bubbleText = panel.querySelector(".npc-bubble-text");
    const objBars = panel.querySelectorAll(".quest-obj");
    const linkBtn = panel.querySelector(".chronicle-panel-link");
    return {
      title: panel.querySelector(".chronicle-panel-title")?.textContent.trim(),
      npcImgLoaded: img ? img.complete && img.naturalWidth > 0 : false,
      bubbleName: bubbleName?.textContent.trim(),
      bubbleTextNonEmpty: (bubbleText?.textContent.trim().length ?? 0) > 0,
      objectiveCount: objBars.length,
      linkBtnPresent: !!linkBtn,
    };
  });
  console.log("PANEL (chapter 1, with loreText): " + JSON.stringify(panelInfo));
  if (panelInfo.title !== "Chronicle Test One") problems.push(`Panel-Titel falsch: "${panelInfo.title}"`);
  if (!panelInfo.npcImgLoaded) problems.push("Panel: Wächter-Kopfbild nicht geladen");
  if (panelInfo.bubbleName !== "The Warden") problems.push(`Panel: Sprecher-Name falsch: "${panelInfo.bubbleName}" (erwartet "The Warden")`);
  if (!panelInfo.bubbleTextNonEmpty) problems.push("Panel: loreText-Sprechblase leer");
  if (panelInfo.objectiveCount !== 1) problems.push(`Panel: erwartet 1 Objective-Bar, gefunden ${panelInfo.objectiveCount}`);
  if (!panelInfo.linkBtnPresent) problems.push("Panel: 'View in Quest Log'-Button fehlt");
  await page.screenshot({ path: join(OUT_DIR, "chronicle-02-panel-withlore-1920.png") });
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.waitForTimeout(300);
  const panelClip1366 = await page.evaluate(() => {
    const bubble = document.querySelector(".chronicle-panel .npc-bubble");
    if (!bubble) return null;
    return bubble.scrollWidth - bubble.clientWidth;
  });
  if (panelClip1366 !== null && panelClip1366 > 1) problems.push(`Panel@1366: Sprechblasen-Text horizontal abgeschnitten (${panelClip1366}px)`);
  await page.screenshot({ path: join(OUT_DIR, "chronicle-02-panel-withlore-1366.png") });
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.waitForTimeout(200);
  console.log("SHOT SAVED: chronicle-02-panel-withlore-*.png");

  // ── "View in Quest Log" navigiert + ChronicleBand zeigt dasselbe Kapitel ─────────────────
  await clickRetry(page, page.locator(".chronicle-panel-link").first());
  await goToQuestsStoryTab(page);
  const bandInfo = await page.evaluate(() => {
    const band = document.querySelector(".chronicle-band");
    if (!band) return { present: false };
    return {
      present: true,
      counter: band.querySelector(".chronicle-band-counter")?.textContent.trim(),
      activeNpcBubblePresent: !!band.querySelector(".chronicle-band-active .npc-bubble-text"),
      historyPresent: !!band.querySelector(".chronicle-band-history"),
    };
  });
  console.log("QUESTS PAGE band (chapter 1 active): " + JSON.stringify(bandInfo));
  if (!bandInfo.present) problems.push("ChronicleBand fehlt auf QuestsPage trotz aktivem Kapitel");
  else {
    if (!bandInfo.counter?.includes("1") || !bandInfo.counter?.includes("2")) {
      problems.push(`Band-Zähler falsch (erwartet "1"..."2"): "${bandInfo.counter}"`);
    }
    if (!bandInfo.activeNpcBubblePresent) problems.push("Band: loreText-Sprechblase für aktives Kapitel fehlt");
    if (bandInfo.historyPresent) problems.push("Band: Historie sichtbar, obwohl noch kein Kapitel claimed ist");
  }
  await page.screenshot({ path: join(OUT_DIR, "chronicle-03-band-active-1920.png") });
  console.log("SHOT SAVED: chronicle-03-band-active-1920.png");

  // ── (c) Zonen-Gate: pastures gesperrt (CombatPage) ────────────────────────────────────────
  await clickRetry(page, page.locator('[data-guide-id="sidebar.combat"]').first());
  await page.waitForSelector(".combat-page", { timeout: 8000 });
  await page.waitForTimeout(400);
  const zoneInfo = await page.evaluate(() => {
    const cards = [...document.querySelectorAll(".zone-card")];
    const pastures = cards.find((c) => c.querySelector(".zone-card-name")?.textContent.includes("Pasture") || c.querySelector(".zone-card-name")?.textContent.includes("Weiden"));
    if (!pastures) return { found: false };
    return {
      found: true,
      locked: pastures.classList.contains("zone-card-story-locked"),
      disabled: pastures.disabled,
      hintText: pastures.querySelector(".zone-card-locked-hint")?.textContent.trim(),
      lockBadgePresent: !!pastures.querySelector(".zone-card-story-lock-badge"),
    };
  });
  console.log("PASTURES ZONE CARD: " + JSON.stringify(zoneInfo));
  if (!zoneInfo.found) problems.push("Pastures-Zonenkarte nicht gefunden");
  else {
    if (!zoneInfo.locked) problems.push("Pastures-Karte zeigt nicht als gesperrt (zone-card-story-locked fehlt)");
    if (!zoneInfo.disabled) problems.push("Pastures-Karte ist nicht disabled (klickbar trotz Gate)");
    if (!zoneInfo.lockBadgePresent) problems.push("Pastures-Karte: Schloss-Badge fehlt");
    if (!zoneInfo.hintText?.includes("Chronicle Test Two")) problems.push(`Pastures-Hinweistext nennt nicht den Gate-Quest-Namen: "${zoneInfo.hintText}"`);
  }
  await page.screenshot({ path: join(OUT_DIR, "chronicle-04-zonegate-1920.png") });
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(OUT_DIR, "chronicle-04-zonegate-1366.png") });
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.waitForTimeout(200);
  console.log("SHOT SAVED: chronicle-04-zonegate-*.png");

  // Klick auf die gesperrte Karte bleibt wirkungslos (bleibt auf der Zonen-Grid-Stufe).
  await page.locator(".zone-card.zone-card-story-locked").first().click({ force: true }).catch(() => {});
  await page.waitForTimeout(300);
  const stillOnGrid = await page.evaluate(() => !!document.querySelector(".zone-grid"));
  console.log("Nach Klick auf gesperrte Karte — noch auf Zonen-Grid: " + stillOnGrid + " (erwartet true)");
  if (!stillOnGrid) problems.push("Klick auf gesperrte Zonenkarte hat trotzdem navigiert");

  // ── Bestiary: Fight-Button für ein pastures-Monster disabled ──────────────────────────────
  await clickRetry(page, page.locator('[data-guide-id="topbar.bestiary"]').first());
  await page.waitForSelector(".bestiary-page", { timeout: 8000 });
  await page.waitForTimeout(400);
  // chicken lebt in pastures (zone-gating.test.ts-Fixture-Annahme, engine-seitig verifiziert).
  const chickenCard = page.locator(".bestiary-card", { hasText: "Chicken" }).first();
  const chickenCount = await chickenCard.count();
  if (chickenCount === 0) {
    problems.push("Bestiary: chicken-Karte nicht gefunden (Name evtl. lokalisiert?)");
  } else {
    const btnInfo = await chickenCard.evaluate((card) => {
      const btn = card.querySelector(".bestiary-fight-btn");
      return btn ? { present: true, disabled: btn.disabled, title: btn.title } : { present: false };
    });
    console.log("BESTIARY chicken fight button: " + JSON.stringify(btnInfo));
    if (!btnInfo.present) problems.push("Bestiary: chicken ist unentdeckt (kein Fight-Button) — Fixture-Annahme prüfen");
    else {
      if (!btnInfo.disabled) problems.push("Bestiary: chicken-Fight-Button ist NICHT disabled trotz gesperrter Zone");
      if (!btnInfo.title?.includes("Chronicle Test Two")) problems.push(`Bestiary: Hinweistext nennt nicht den Gate-Quest: "${btnInfo.title}"`);
    }
  }
  await page.screenshot({ path: join(OUT_DIR, "chronicle-05-bestiary-1920.png") });
  console.log("SHOT SAVED: chronicle-05-bestiary-1920.png");

  // ── (d)+(e) chronicle_01 claimen: Kompass springt auf Kapitel 2 (OHNE loreText → Fallback) ──
  await page.evaluate(() => {
    const { state } = window.__hfDebug;
    state.quests.claimed.push("chronicle_01");
  });
  await page.waitForTimeout(600);

  const pin2 = await page.evaluate(() => {
    const pin = document.querySelector(".chronicle-pin");
    if (!pin) return { present: false };
    return { present: true, chapter: pin.querySelector(".chronicle-pin-chapter")?.textContent.trim() };
  });
  console.log("PIN after claiming chapter 1: " + JSON.stringify(pin2) + " (expected chapter 2)");
  if (!pin2.present || !pin2.chapter?.includes("2")) problems.push(`Pin zeigt nach Claim nicht Kapitel 2: ${JSON.stringify(pin2)}`);

  await clickRetry(page, page.locator(".chronicle-pin").first());
  await page.waitForSelector(".chronicle-panel", { timeout: 5000 });
  await page.waitForTimeout(300);
  const panel2 = await page.evaluate(() => {
    const panel = document.querySelector(".chronicle-panel");
    return {
      title: panel.querySelector(".chronicle-panel-title")?.textContent.trim(),
      npcBubblePresent: !!panel.querySelector(".npc-greeting"),
      objectiveCount: panel.querySelectorAll(".quest-obj").length,
    };
  });
  console.log("PANEL (chapter 2, NO loreText — fallback): " + JSON.stringify(panel2));
  if (panel2.title !== "Chronicle Test Two") problems.push(`Panel Kapitel 2: Titel falsch "${panel2.title}"`);
  if (panel2.npcBubblePresent) problems.push("Panel Kapitel 2: NPC-Sprechblase sichtbar, obwohl loreText fehlt (Fallback nicht aktiv)");
  if (panel2.objectiveCount !== 1) problems.push(`Panel Kapitel 2: erwartet 1 Objective-Bar, gefunden ${panel2.objectiveCount}`);
  await page.screenshot({ path: join(OUT_DIR, "chronicle-06-panel-nolore-1920.png") });
  console.log("SHOT SAVED: chronicle-06-panel-nolore-1920.png");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);

  // QuestsPage: Historie mit 1 Eintrag (chronicle_01), aufklappbar zum Nachlesen.
  await clickRetry(page, page.locator('[data-guide-id="topbar.quests"]').first());
  await goToQuestsStoryTab(page);
  const bandInfo2 = await page.evaluate(() => {
    const band = document.querySelector(".chronicle-band");
    if (!band) return { present: false };
    return {
      present: true,
      counter: band.querySelector(".chronicle-band-counter")?.textContent.trim(),
      activeNpcBubblePresent: !!band.querySelector(".chronicle-band-active .npc-bubble-text"),
      historyToggleText: band.querySelector(".chronicle-band-history-toggle")?.textContent.trim(),
    };
  });
  console.log("QUESTS PAGE band (chapter 2 active, chapter 1 in history): " + JSON.stringify(bandInfo2));
  if (bandInfo2.activeNpcBubblePresent) problems.push("Band Kapitel 2: Sprechblase sichtbar, obwohl loreText fehlt");
  if (!bandInfo2.historyToggleText?.includes("1")) problems.push(`Band-Historie zeigt nicht 1 Eintrag: "${bandInfo2.historyToggleText}"`);

  await clickRetry(page, page.locator(".chronicle-band-history-toggle").first());
  await page.waitForTimeout(250);
  const historyExpand = await page.evaluate(() => ({
    rowPresent: !!document.querySelector(".chronicle-band-history-row"),
  }));
  if (historyExpand.rowPresent) {
    await clickRetry(page, page.locator(".chronicle-band-history-row-head").first());
    await page.waitForTimeout(200);
  }
  const historyText = await page.evaluate(() => document.querySelector(".chronicle-band-history-text")?.textContent.trim());
  console.log("History row expanded, loreText visible: " + (!!historyText && historyText.length > 0));
  if (!historyText) problems.push("Band-Historie: aufgeklappter Kapitel-loreText nicht sichtbar");
  await page.screenshot({ path: join(OUT_DIR, "chronicle-07-band-history-1920.png") });
  console.log("SHOT SAVED: chronicle-07-band-history-1920.png");

  // Zone bleibt gesperrt, solange chronicle_02 selbst nicht claimed/completed ist.
  await clickRetry(page, page.locator('[data-guide-id="sidebar.combat"]').first());
  await page.waitForSelector(".combat-page", { timeout: 8000 });
  await page.waitForTimeout(400);
  const stillLocked = await page.evaluate(() => {
    const cards = [...document.querySelectorAll(".zone-card")];
    const pastures = cards.find((c) => c.querySelector(".zone-card-name")?.textContent.includes("Pasture") || c.querySelector(".zone-card-name")?.textContent.includes("Weiden"));
    return pastures ? pastures.classList.contains("zone-card-story-locked") : null;
  });
  console.log("Pastures still locked after claiming ONLY chapter 1: " + stillLocked + " (expected true)");
  if (stillLocked !== true) problems.push("Pastures entsperrte sich fälschlich schon nach Claim von Kapitel 1 (Gate zeigt auf Kapitel 2)");

  // ── (e) Beide Test-Kapitel claimen: Kompass verschwindet, Zone entsperrt sich ─────────────
  await page.evaluate(() => {
    const { state } = window.__hfDebug;
    state.quests.claimed.push("chronicle_02");
  });
  await page.waitForTimeout(600);
  const finalState = await page.evaluate(() => {
    const cards = [...document.querySelectorAll(".zone-card")];
    const pastures = cards.find((c) => c.querySelector(".zone-card-name")?.textContent.includes("Pasture") || c.querySelector(".zone-card-name")?.textContent.includes("Weiden"));
    return {
      pinPresent: !!document.querySelector(".chronicle-pin"),
      pasturesLocked: pastures ? pastures.classList.contains("zone-card-story-locked") : null,
      pasturesDisabled: pastures ? pastures.disabled : null,
    };
  });
  console.log("FINAL (both chapters claimed): " + JSON.stringify(finalState));
  if (finalState.pinPresent) problems.push("Kompass-Pin bleibt sichtbar, obwohl alle Test-Kapitel claimed sind");
  if (finalState.pasturesLocked !== false) problems.push("Pastures bleibt gesperrt, obwohl das Gate-Kapitel claimed ist");
  if (finalState.pasturesDisabled !== false) problems.push("Pastures-Karte bleibt disabled, obwohl entsperrt");
  await page.screenshot({ path: join(OUT_DIR, "chronicle-08-final-unlocked-1920.png") });
  console.log("SHOT SAVED: chronicle-08-final-unlocked-1920.png");

  await browser.close();

  // ── (f) REALER Content, frische Seite, KEIN Patch — nur relevant, falls Welle D2 inzwischen
  //        gelandet ist (realChronicleCount > 0 von oben). Sonst sauberer No-op-Skip. ──────────
  if (realChronicleCount > 0) {
    const browser2 = await chromium.launch();
    const page2 = await browser2.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
    wirePage(page2, "real");
    await page2.addInitScript(() => {
      try { localStorage.setItem("hearthforge:locale", "en"); } catch { /* noop */ }
    });
    await routeFixtureNoTours(page2);
    await page2.goto(`${BASE_URL}/?fixture=midgame`, { waitUntil: "load" });
    await page2.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
    await page2.waitForFunction(() => !!window.__hfDebug, null, { timeout: 8000 });
    await page2.waitForTimeout(1200);

    const realPin = await page2.evaluate(() => {
      const pin = document.querySelector(".chronicle-pin");
      if (!pin) return { present: false };
      return {
        present: true,
        chapter: pin.querySelector(".chronicle-pin-chapter")?.textContent.trim(),
        name: pin.querySelector(".chronicle-pin-name")?.textContent.trim(),
      };
    });
    console.log("REAL CONTENT pin: " + JSON.stringify(realPin));
    if (!realPin.present) problems.push("REAL: Kompass-Pin fehlt trotz gelandeter chronicle_*-Quests (chronicle_01 sollte aktiv sein)");
    else if (!realPin.chapter?.includes("1")) problems.push(`REAL: Pin zeigt nicht Kapitel 1: "${realPin.chapter}"`);
    await page2.screenshot({ path: join(OUT_DIR, "chronicle-09-real-pin-1920.png") });

    await clickRetry(page2, page2.locator(".chronicle-pin").first());
    await page2.waitForSelector(".chronicle-panel", { timeout: 5000 });
    await page2.waitForTimeout(300);
    const realPanel = await page2.evaluate(() => {
      const panel = document.querySelector(".chronicle-panel");
      return {
        title: panel.querySelector(".chronicle-panel-title")?.textContent.trim(),
        npcBubblePresent: !!panel.querySelector(".npc-bubble-text"),
        bubbleTextLen: panel.querySelector(".npc-bubble-text")?.textContent.trim().length ?? 0,
        objectiveCount: panel.querySelectorAll(".quest-obj").length,
      };
    });
    console.log("REAL CONTENT panel: " + JSON.stringify(realPanel));
    if (!realPanel.npcBubblePresent || realPanel.bubbleTextLen < 20) {
      problems.push(`REAL: Panel-loreText fehlt/zu kurz für das echte chronicle_01 (Länge ${realPanel.bubbleTextLen})`);
    }
    if (realPanel.objectiveCount < 1) problems.push("REAL: Panel zeigt keine Objective-Bar für chronicle_01");
    await page2.screenshot({ path: join(OUT_DIR, "chronicle-10-real-panel-1920.png") });
    await page2.setViewportSize({ width: 1366, height: 768 });
    await page2.waitForTimeout(300);
    await page2.screenshot({ path: join(OUT_DIR, "chronicle-10-real-panel-1366.png") });
    await page2.setViewportSize({ width: 1920, height: 1080 });
    await page2.keyboard.press("Escape");
    await page2.waitForTimeout(200);

    // Mindestens eine echte gated Zone (z.B. "borderlands", Gate chronicle_03) rendert gesperrt —
    // Legacy-Grant für DIESEN Test gezielt entfernt (Bestandsschutz-Erklärung s.o.).
    await page2.evaluate(() => {
      const { state } = window.__hfDebug;
      state.legacyZoneGrants["borderlands"] = false;
    });
    await page2.waitForTimeout(500);
    await clickRetry(page2, page2.locator('[data-guide-id="sidebar.combat"]').first());
    await page2.waitForSelector(".combat-page", { timeout: 8000 });
    await page2.waitForTimeout(400);
    const realZoneGate = await page2.evaluate(() => {
      const cards = [...document.querySelectorAll(".zone-card")];
      const bl = cards.find((c) => c.querySelector(".zone-card-name")?.textContent.includes("Borderlands") || c.querySelector(".zone-card-name")?.textContent.includes("Grenzlande"));
      if (!bl) return { found: false };
      return {
        found: true,
        locked: bl.classList.contains("zone-card-story-locked"),
        hintText: bl.querySelector(".zone-card-locked-hint")?.textContent.trim(),
      };
    });
    console.log("REAL CONTENT zone gate (borderlands, gate chronicle_03): " + JSON.stringify(realZoneGate));
    if (!realZoneGate.found) problems.push("REAL: Borderlands-Zonenkarte nicht gefunden");
    else if (!realZoneGate.locked) problems.push("REAL: Borderlands rendert NICHT gesperrt trotz offenem chronicle_03-Gate");
    await page2.screenshot({ path: join(OUT_DIR, "chronicle-11-real-zonegate-1920.png") });
    console.log("SHOT SAVED: chronicle-09..11-real-*.png");

    await browser2.close();
  } else {
    console.log("REAL CONTENT check übersprungen — Welle D2 hat noch keine chronicle_*-Quests im Content (0 gefunden).");
  }

  console.log(problems.length ? "PROBLEME:\n- " + problems.join("\n- ") : "ALLE CHECKS GRÜN");
  console.log(errors.length ? `${errors.length} page errors:\n` + errors.slice(0, 12).join("\n") : "no page errors");

  if (problems.length || errors.length) process.exitCode = 1;
} finally {
  child.kill();
}
