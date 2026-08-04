#!/usr/bin/env node
/**
 * Story-Tab (Aschechronik) — Verifikation (ceo-run-2026-07-13 Welle H, ui-dev).
 *
 * Chef-Feedback: der Kapitel-Kompass war "stuck in der Sidebar" und zu klein. Welle E's
 * Sidebar-Kompass-Pin (components/ChronicleCompass.tsx) + das schmale ChronicleBand über der
 * normalen Quest-Liste sind komplett entfernt — die Aschechronik lebt jetzt in einem eigenen,
 * prominenten "Story"-Tab auf der QuestsPage (ChronicleStoryTab), der die volle Content-Fläche
 * nutzt. Zusatz-Feedback (frisch): "was ist zu tun, wann ist man fertig" — glasklare Ziel-Zeilen
 * (WAS/WO/Fortschritt), ein unübersehbarer Fertig-Zustand und eine "Schaltet frei"-Vorschau.
 *
 * Content-dev hat die echten 21 chronicle_*-Quests bereits gelandet (Welle D2) — damit dieser
 * Check trotzdem deterministisch bleibt, räumt der Hauptteil zuerst ALLE chronicle_*-Einträge aus
 * content.quests und injiziert zwei eigene, isolierte Test-Kapitel — Muster wie
 * chronicle-compass-check.mjs (Welle E), über `window.__hfDebug.content` (derselbe live
 * Objekt-Zeiger wie `@hearthforge/content`). KEIN packages/content-Edit, reiner In-Memory-Patch.
 *
 * Prüft:
 *  (0) NULLIPOTENZ: kein chronicle_*-Content → Story-Tab zeigt einen dezenten Leerzustand (kein
 *      Crash), Default-Tab bleibt "Daily", Contracts/Daily/Shop-Tabs unverändert funktional.
 *  (a) Sidebar enthält auf JEDER Seite KEINEN Kompass-Pin mehr (`.chronicle-pin` nirgends im DOM).
 *  (b) Story-Tab öffnet nach dem Patch automatisch (Remount der Seite), zeigt Kapitel-Zähler,
 *      großen Titel, Wächter-Medaillon+Sprechblase, eine glasklare Ziel-Zeile (WAS+WO+Fortschritt,
 *      WHERE = Zonen-Name des Ziel-Monsters), kein Claim-Button (Objective offen).
 *  (c) Fertig-Zustand: Ziel erfüllt → Status "Ready to Claim", Bühne bekommt den Done-Glow, die
 *      Ziel-Zeile zeigt ein Häkchen, der Claim-Button ("Complete Chapter") pulsiert.
 *  (d) Claim wechselt zum nächsten Kapitel (Fallback ohne loreText), zeigt eine reach_paragon_floor
 *      Ziel-Zeile (WHERE = "The Paragon Tower") UND eine "Unlocks"-Zeile für die gate'te Zone.
 *  (e) Historie: nach dem ersten Claim 1 Eintrag, aufklappbar, loreText nachlesbar.
 *  (f) Nach Claim BEIDER Test-Kapitel: kein aktives Kapitel mehr → "alle Kapitel geschrieben"-Text,
 *      die gate'te Zone (pastures) entsperrt sich auf der CombatPage.
 *  (g) Nullipotenz-Wiederholung: Sidebar bleibt über den gesamten Lauf hinweg ohne Kompass-Pin.
 *
 * Screenshots 1920×1080 + 1366×768. Port 5248 (Task-Vorgabe, kollisionsfrei zu Welle E's 5247).
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5248;
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

/** Onboarding-Touren als "schon gesehen" markieren (reines Test-Setup-Rauschen, hat mit der
 *  Aschechronik selbst nichts zu tun — Muster aus chronicle-compass-check.mjs). */
async function routeFixtureNoTours(page) {
  await page.route("**/ui-audit-fixtures/midgame.json", async (route) => {
    const res = await route.fetch();
    const json = JSON.parse(await res.text());
    json.state.onboarding = { active: false, step: 0, done: true, toursSeen: { combat: true, shop: true, bank: true } };
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(json) });
  });
}

async function goToQuests(page) {
  await clickRetry(page, page.locator('[data-guide-id="topbar.quests"]').first());
  await page.waitForSelector(".quests-page", { timeout: 8000 });
  await page.waitForTimeout(300);
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
  // Default-Locale ist "de" — für verlässliche String-Asserts (Zonen-/Monsternamen, synthetische
  // Test-Quest-Namen, "Story"/"Contracts"-Tab-Label) fest auf "en" pinnen.
  await page.addInitScript(() => {
    try { localStorage.setItem("hearthforge:locale", "en"); } catch { /* noop */ }
  });
  await routeFixtureNoTours(page);

  await page.goto(`${BASE_URL}/?fixture=midgame`, { waitUntil: "load" });
  await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
  await page.waitForFunction(() => !!window.__hfDebug, null, { timeout: 8000 });
  // React.StrictMode (dev) doppelt den Fixture-Lade-Effekt (mount→cleanup→remount) — auf einem
  // kalten Vite-Devserver kann die überlebende Invocation abhängig von Dependency-Optimierung
  // spürbar länger brauchen, bis `window.__hfDebug` final steht (in der Praxis beobachtet: bis zu
  // ~16s beim allerersten Request). `networkidle` + großzügiger Puffer, BEVOR irgendetwas mutiert
  // wird — sonst mutiert dieses Skript ein Content-Objekt, das kurz danach von der noch
  // laufenden Fixture-Load-Kette überschrieben wird (flaky: mal 0, mal wieder 21 Kapitel).
  await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(2000);

  // Content-dev (Welle D2) hat die echten chronicle_*-Quests bereits gelandet — für den
  // deterministischen Teil dieses Skripts ALLE bestehenden chronicle_*-Quests + Zonen-Gates aus
  // dieser Playwright-Seite entfernen (reiner In-Memory-Patch, kein packages/content-Edit).
  // Retry-bis-stabil (s. Kommentar oben): verifiziert nach der Mutation, dass sie nicht doch noch
  // von der Fixture-Load-Kette überschrieben wurde, statt sich auf einen einzelnen festen Wait zu
  // verlassen.
  let realChronicleCount = -1;
  for (let attempt = 0; attempt < 6; attempt++) {
    realChronicleCount = await page.evaluate(() => {
      const { content } = window.__hfDebug;
      const realIds = content.quests.filter((q) => q.id.startsWith("chronicle_")).map((q) => q.id);
      content.quests = content.quests.filter((q) => !q.id.startsWith("chronicle_"));
      for (const z of content.zones) delete z.requiresQuest;
      return realIds.length;
    });
    await page.waitForTimeout(500);
    const stillDirty = await page.evaluate(() => window.__hfDebug.content.quests.some((q) => q.id.startsWith("chronicle_")));
    if (!stillDirty) break;
    console.log(`Clear-Versuch ${attempt + 1} wurde überschrieben — erneuter Versuch...`);
  }
  console.log(`Real chronicle_*-Quests im Content: ${realChronicleCount} (0 oder 21 erwartet)`);
  await page.waitForTimeout(400);

  // ── (0) NULLIPOTENZ: kein chronicle_*-Content ─────────────────────────────────────────────
  const sidebarNoPin = await page.evaluate(() => !document.querySelector(".chronicle-pin"));
  console.log("Sidebar ohne Kompass-Pin (Baseline): " + sidebarNoPin + " (erwartet true)");
  if (!sidebarNoPin) problems.push("REGRESSION: .chronicle-pin irgendwo im DOM gefunden (Kompass sollte komplett entfernt sein)");

  await goToQuests(page);
  const baselineTab = await page.evaluate(() => {
    const active = document.querySelector(".quests-tab-btn--active");
    return { activeLabel: active?.textContent.trim() ?? null };
  });
  console.log("Default-Tab ohne aktives Kapitel: " + JSON.stringify(baselineTab) + " (erwartet 'Daily...')");
  if (!baselineTab.activeLabel?.startsWith("Daily")) {
    problems.push(`Default-Tab ohne Chronik-Content ist nicht Daily: "${baselineTab.activeLabel}"`);
  }

  // Story-Tab manuell öffnen → Leerzustand, kein Crash.
  await clickRetry(page, page.locator(".quests-tab-btn", { hasText: "Story" }).first());
  await page.waitForTimeout(300);
  const emptyState = await page.evaluate(() => {
    const stage = document.querySelector(".chronicle-stage");
    const placeholder = document.querySelector(".quests-page > .placeholder, .chronicle-tab .placeholder");
    return {
      stagePresent: !!stage,
      placeholderPresent: !!placeholder,
      placeholderText: placeholder?.querySelector("p")?.textContent.trim() ?? null,
    };
  });
  console.log("Story-Tab Leerzustand: " + JSON.stringify(emptyState));
  if (emptyState.stagePresent) problems.push("Leerzustand: .chronicle-stage sichtbar, obwohl kein chronicle_*-Content existiert");
  if (!emptyState.placeholderPresent) problems.push("Leerzustand: kein Placeholder gerendert (Crash-Gefahr statt dezentem Hinweis)");
  await page.screenshot({ path: join(OUT_DIR, "story-00-empty-1920.png") });
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.waitForTimeout(250);
  await page.screenshot({ path: join(OUT_DIR, "story-00-empty-1366.png") });
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.waitForTimeout(200);
  console.log("SHOT SAVED: story-00-empty-*.png");

  // Contracts/Daily/Shop-Tabs weiterhin funktional.
  await clickRetry(page, page.locator(".quests-tab-btn", { hasText: "Contracts" }).first());
  await page.waitForTimeout(250);
  const contractsOk = await page.evaluate(() => !!document.querySelector(".quests-list, .placeholder"));
  console.log("Contracts-Tab rendert Liste/Placeholder: " + contractsOk);
  if (!contractsOk) problems.push("Contracts-Tab (frühere Story-Liste) rendert weder Liste noch Placeholder");

  await clickRetry(page, page.locator(".quests-tab-btn", { hasText: "Shop" }).first());
  await page.waitForTimeout(250);
  const shopOk = await page.evaluate(() => !!document.querySelector(".quest-shop-panel"));
  console.log("Shop-Tab rendert Panel: " + shopOk);
  if (!shopOk) problems.push("Shop-Tab rendert kein .quest-shop-panel");

  // ── Content-Patch: 2 synthetische Kapitel + 1 Zonen-Gate ──────────────────────────────────
  await page.evaluate(() => {
    const { content, state } = window.__hfDebug;
    content.quests.push({
      id: "chronicle_01",
      name: { en: "Chronicle Test One", de: "Chronik-Test Eins" },
      description: { en: "Test chapter one.", de: "Test-Kapitel eins." },
      loreText: {
        en: "This is a test lore passage for chapter one, written by the Warden.",
        de: "Dies ist ein Test-Erzähltext für Kapitel eins, geschrieben vom Wächter.",
      },
      objectives: [{ type: "kill_monster", target: "chicken", count: 3 }],
      rewards: { gold: 5 },
    });
    content.quests.push({
      id: "chronicle_02",
      name: { en: "Chronicle Test Two", de: "Chronik-Test Zwei" },
      description: { en: "Test chapter two.", de: "Test-Kapitel zwei." },
      // Bewusst OHNE loreText — deckt den Fallback (nur Ziele, kein leerer Kasten) ab.
      requires: ["chronicle_01"],
      objectives: [{ type: "reach_paragon_floor", count: 5 }],
      rewards: { gold: 5 },
    });
    const pastures = content.zones.find((z) => z.id === "pastures");
    if (pastures) pastures.requiresQuest = "chronicle_02";
    // Alt-Save-Bestandsschutz (v62→63-Migration) würde "pastures" sonst permanent freischalten —
    // für den Gate-/Unlocks-Test hier gezielt entfernen (Muster aus chronicle-compass-check.mjs).
    state.legacyZoneGrants["pastures"] = false;
    state.monsterKills["chicken"] = 0;
    if (!state.paragon) state.paragon = { best: 0, checkpoint: 0 };
    else state.paragon.best = 0;
  });
  await page.waitForTimeout(400);

  // Seite neu betreten (Remount) → der Lazy-Tab-Initializer soll jetzt automatisch auf "Story"
  // öffnen, weil ein aktives Kapitel existiert (Chef-Vorgabe: "die Chronik bekommt die Bühne").
  await clickRetry(page, page.locator('[data-guide-id="topbar.character"]').first());
  await page.waitForTimeout(200);
  await goToQuests(page);
  const autoTab = await page.evaluate(() => document.querySelector(".quests-tab-btn--active")?.textContent.trim() ?? null);
  console.log("Auto-geöffneter Tab mit aktivem Kapitel: " + autoTab + " (erwartet 'Story...')");
  if (!autoTab?.startsWith("Story")) problems.push(`Story-Tab öffnet nicht automatisch trotz aktivem Kapitel (Tab: "${autoTab}")`);

  // ── (b) Aktives Kapitel 1, Objective offen (0/3) ──────────────────────────────────────────
  const stage1 = await page.evaluate(() => {
    const stage = document.querySelector(".chronicle-stage");
    if (!stage) return { present: false };
    const obj = stage.querySelector(".chronicle-obj");
    return {
      present: true,
      done: stage.classList.contains("chronicle-stage--done"),
      counter: document.querySelector(".chronicle-tab-counter")?.textContent.trim(),
      title: stage.querySelector(".chronicle-stage-title")?.textContent.trim(),
      statusBadge: stage.querySelector(".quest-status-badge")?.textContent.trim(),
      npcBubbleText: stage.querySelector(".npc-bubble-text")?.textContent.trim() ?? null,
      objWhere: obj?.querySelector(".chronicle-obj-where")?.textContent.trim() ?? null,
      objCount: obj?.querySelector(".chronicle-obj-count")?.textContent.trim() ?? null,
      objDone: obj?.classList.contains("chronicle-obj--done") ?? null,
      claimBtnPresent: !!stage.querySelector(".chronicle-stage-claim"),
      unlocksPresent: !!stage.querySelector(".quest-reward-chip--unlock"),
    };
  });
  console.log("STAGE (chapter 1, objective open): " + JSON.stringify(stage1));
  if (!stage1.present) problems.push("Chronicle-Stage fehlt trotz aktivem chronicle_01");
  else {
    if (stage1.done) problems.push("Stage zeigt Done-Zustand, obwohl Objective noch offen (0/3)");
    if (!stage1.counter?.includes("1") || !stage1.counter?.includes("2")) problems.push(`Kapitel-Zähler falsch: "${stage1.counter}"`);
    if (stage1.title !== "Chronicle Test One") problems.push(`Stage-Titel falsch: "${stage1.title}"`);
    if (!stage1.statusBadge?.toLowerCase().includes("progress")) problems.push(`Status-Badge nicht "In Progress": "${stage1.statusBadge}"`);
    if (!stage1.npcBubbleText || stage1.npcBubbleText.length < 10) problems.push("Wächter-Sprechblase fehlt/leer für Kapitel 1 (hat loreText)");
    if (!stage1.objWhere?.includes("Pastures")) problems.push(`Ziel-Zeile WHERE zeigt nicht "Pastures": "${stage1.objWhere}"`);
    if (stage1.objCount !== "0 / 3") problems.push(`Ziel-Zeile Fortschritt falsch: "${stage1.objCount}"`);
    if (stage1.objDone) problems.push("Ziel-Zeile zeigt Häkchen/done, obwohl 0/3");
    if (stage1.claimBtnPresent) problems.push("Claim-Button sichtbar, obwohl Objective noch nicht erfüllt");
    if (stage1.unlocksPresent) problems.push("Unlocks-Zeile sichtbar für chronicle_01 (das Gate hängt an chronicle_02)");
  }
  await page.screenshot({ path: join(OUT_DIR, "story-01-open-1920.png") });
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.waitForTimeout(250);
  const overflow1366 = await page.evaluate(() => {
    const el = document.querySelector(".chronicle-stage");
    return el ? el.scrollWidth - el.clientWidth : 0;
  });
  if (overflow1366 > 1) problems.push(`Stage@1366: horizontaler Überlauf (${overflow1366}px) — "gequetscht"`);
  await page.screenshot({ path: join(OUT_DIR, "story-01-open-1366.png") });
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.waitForTimeout(200);
  console.log("SHOT SAVED: story-01-open-*.png");

  // ── (c) Fertig-Zustand: Objective erfüllt (3/3) ───────────────────────────────────────────
  await page.evaluate(() => { window.__hfDebug.state.monsterKills["chicken"] = 3; });
  await page.waitForTimeout(500);
  const stage1done = await page.evaluate(() => {
    const stage = document.querySelector(".chronicle-stage");
    const obj = stage?.querySelector(".chronicle-obj");
    const claimBtn = stage?.querySelector(".chronicle-stage-claim");
    const anim = claimBtn ? getComputedStyle(claimBtn).animationName : null;
    return {
      done: stage?.classList.contains("chronicle-stage--done") ?? false,
      statusBadge: stage?.querySelector(".quest-status-badge")?.textContent.trim(),
      objCount: obj?.querySelector(".chronicle-obj-count")?.textContent.trim(),
      objDone: obj?.classList.contains("chronicle-obj--done"),
      objCheck: obj?.querySelector(".chronicle-obj-check")?.textContent.trim(),
      claimBtnText: claimBtn?.textContent.trim() ?? null,
      claimBtnAnimated: !!anim && anim !== "none",
    };
  });
  console.log("STAGE (chapter 1, DONE 3/3): " + JSON.stringify(stage1done));
  if (!stage1done.done) problems.push("Stage bekommt keinen Done-Glow (chronicle-stage--done fehlt), obwohl Objective erfüllt");
  if (!stage1done.statusBadge?.toLowerCase().includes("claim")) problems.push(`Status-Badge nicht "Ready to Claim": "${stage1done.statusBadge}"`);
  if (stage1done.objCount !== "3 / 3") problems.push(`Ziel-Zeile Fortschritt nach Erfüllung falsch: "${stage1done.objCount}"`);
  if (!stage1done.objDone) problems.push("Ziel-Zeile fehlt done-Modifier trotz 3/3");
  if (stage1done.objCheck !== "✓") problems.push(`Ziel-Zeile zeigt kein Häkchen: "${stage1done.objCheck}"`);
  if (stage1done.claimBtnText !== "Complete Chapter") problems.push(`Claim-Button-Text falsch: "${stage1done.claimBtnText}"`);
  if (!stage1done.claimBtnAnimated) problems.push("Claim-Button pulsiert nicht (kein CSS-Animationsname gesetzt)");
  await page.screenshot({ path: join(OUT_DIR, "story-02-done-1920.png") });
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.waitForTimeout(250);
  await page.screenshot({ path: join(OUT_DIR, "story-02-done-1366.png") });
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.waitForTimeout(200);
  console.log("SHOT SAVED: story-02-done-*.png");

  // ── Claim → Kapitel 2 aktiv (Fallback ohne loreText, reach_paragon_floor + Unlocks) ───────
  await clickRetry(page, page.locator(".chronicle-stage-claim").first());
  await page.waitForTimeout(500);
  const stage2 = await page.evaluate(() => {
    const stage = document.querySelector(".chronicle-stage");
    if (!stage) return { present: false };
    const obj = stage.querySelector(".chronicle-obj");
    const unlockChip = stage.querySelector(".quest-reward-chip--unlock");
    return {
      present: true,
      counter: document.querySelector(".chronicle-tab-counter")?.textContent.trim(),
      title: stage.querySelector(".chronicle-stage-title")?.textContent.trim(),
      npcBubblePresent: !!stage.querySelector(".npc-greeting"),
      objWhere: obj?.querySelector(".chronicle-obj-where")?.textContent.trim() ?? null,
      objCount: obj?.querySelector(".chronicle-obj-count")?.textContent.trim() ?? null,
      unlocksLabelPresent: !!stage.querySelector(".quest-rewards-label"),
      unlockChipText: unlockChip?.textContent.trim() ?? null,
    };
  });
  console.log("STAGE (chapter 2, after claiming 1): " + JSON.stringify(stage2));
  if (!stage2.present) problems.push("Stage fehlt nach Claim von Kapitel 1 (sollte auf Kapitel 2 springen)");
  else {
    if (!stage2.counter?.includes("2")) problems.push(`Kapitel-Zähler zeigt nicht Kapitel 2: "${stage2.counter}"`);
    if (stage2.title !== "Chronicle Test Two") problems.push(`Stage-Titel Kapitel 2 falsch: "${stage2.title}"`);
    if (stage2.npcBubblePresent) problems.push("Kapitel 2: Wächter-Sprechblase sichtbar, obwohl loreText fehlt (Fallback nicht aktiv)");
    if (!stage2.objWhere?.includes("Paragon")) problems.push(`Ziel-Zeile WHERE für reach_paragon_floor falsch: "${stage2.objWhere}"`);
    if (stage2.objCount !== "0 / 5") problems.push(`Ziel-Zeile Fortschritt Kapitel 2 falsch: "${stage2.objCount}"`);
    if (!stage2.unlockChipText?.includes("Pastures")) problems.push(`Unlocks-Chip zeigt nicht "Pastures": "${stage2.unlockChipText}"`);
  }
  await page.screenshot({ path: join(OUT_DIR, "story-03-chapter2-1920.png") });
  console.log("SHOT SAVED: story-03-chapter2-1920.png");

  // ── Historie: 1 Eintrag (chronicle_01), aufklappbar, loreText nachlesbar ─────────────────
  const historyBefore = await page.evaluate(() => document.querySelector(".chronicle-history-toggle")?.textContent.trim() ?? null);
  console.log("Historie-Toggle-Text: " + historyBefore + " (erwartet '...(1)')");
  if (!historyBefore?.includes("1")) problems.push(`Historie zeigt nicht 1 Eintrag: "${historyBefore}"`);

  await clickRetry(page, page.locator(".chronicle-history-toggle").first());
  await page.waitForTimeout(250);
  await clickRetry(page, page.locator(".chronicle-history-row-head").first());
  await page.waitForTimeout(200);
  const historyText = await page.evaluate(() => document.querySelector(".chronicle-history-text")?.textContent.trim() ?? null);
  console.log("Historie aufgeklappt, loreText sichtbar: " + (!!historyText && historyText.length > 0));
  if (!historyText) problems.push("Historie: aufgeklappter Kapitel-loreText nicht sichtbar");
  await page.screenshot({ path: join(OUT_DIR, "story-04-history-1920.png") });
  console.log("SHOT SAVED: story-04-history-1920.png");

  // Zone bleibt gesperrt, solange chronicle_02 (das eigentliche Gate) noch nicht claimed ist.
  await clickRetry(page, page.locator('[data-guide-id="sidebar.combat"]').first());
  await page.waitForSelector(".combat-page", { timeout: 8000 });
  await page.waitForTimeout(400);
  const stillLocked = await page.evaluate(() => {
    const cards = [...document.querySelectorAll(".zone-card")];
    const pastures = cards.find((c) => c.querySelector(".zone-card-name")?.textContent.includes("Pasture"));
    return pastures ? pastures.classList.contains("zone-card-story-locked") : null;
  });
  console.log("Pastures noch gesperrt (nur Kapitel 1 claimed): " + stillLocked + " (erwartet true)");
  if (stillLocked !== true) problems.push("Pastures entsperrte sich fälschlich schon nach Claim von Kapitel 1");

  // ── (f) Kapitel 2 fertig stellen + claimen: kein aktives Kapitel mehr, Zone entsperrt ─────
  await goToQuests(page);
  await clickRetry(page, page.locator(".quests-tab-btn", { hasText: "Story" }).first());
  await page.waitForTimeout(300);
  await page.evaluate(() => { window.__hfDebug.state.paragon.best = 5; });
  await page.waitForTimeout(400);
  await clickRetry(page, page.locator(".chronicle-stage-claim").first());
  await page.waitForTimeout(500);

  const finalTab = await page.evaluate(() => {
    const stage = document.querySelector(".chronicle-stage");
    const complete = document.querySelector(".chronicle-stage-complete");
    return {
      activeStagePresent: !!stage && !complete,
      completeMsgPresent: !!complete,
      completeText: complete?.querySelector("p")?.textContent.trim() ?? null,
      historyToggleText: document.querySelector(".chronicle-history-toggle")?.textContent.trim() ?? null,
    };
  });
  console.log("FINAL (both chapters claimed): " + JSON.stringify(finalTab));
  if (finalTab.activeStagePresent) problems.push("Aktives Kapitel noch sichtbar, obwohl beide Test-Kapitel claimed sind");
  if (!finalTab.completeMsgPresent || !finalTab.completeText) problems.push("Kein 'alle Kapitel geschrieben'-Hinweis nach Claim beider Test-Kapitel");
  if (!finalTab.historyToggleText?.includes("2")) problems.push(`Historie zeigt nicht 2 Einträge: "${finalTab.historyToggleText}"`);
  await page.screenshot({ path: join(OUT_DIR, "story-05-allclaimed-1920.png") });
  console.log("SHOT SAVED: story-05-allclaimed-1920.png");

  await clickRetry(page, page.locator('[data-guide-id="sidebar.combat"]').first());
  await page.waitForSelector(".combat-page", { timeout: 8000 });
  await page.waitForTimeout(400);
  const finalUnlocked = await page.evaluate(() => {
    const cards = [...document.querySelectorAll(".zone-card")];
    const pastures = cards.find((c) => c.querySelector(".zone-card-name")?.textContent.includes("Pasture"));
    return pastures ? pastures.classList.contains("zone-card-story-locked") : null;
  });
  console.log("Pastures entsperrt nach Claim beider Test-Kapitel: " + (finalUnlocked === false) + " (erwartet true)");
  if (finalUnlocked !== false) problems.push("Pastures bleibt gesperrt, obwohl das Gate-Kapitel (chronicle_02) claimed ist");

  // ── (g) Sidebar bleibt über den GESAMTEN Lauf hinweg ohne Kompass-Pin ─────────────────────
  const finalSidebarNoPin = await page.evaluate(() => !document.querySelector(".chronicle-pin"));
  console.log("Sidebar ohne Kompass-Pin (final, mit aktivem/erledigtem Chronik-Content): " + finalSidebarNoPin);
  if (!finalSidebarNoPin) problems.push("REGRESSION: .chronicle-pin im DOM gefunden, obwohl Chronik-Content vorhanden war");

  await browser.close();

  console.log(problems.length ? "PROBLEME:\n- " + problems.join("\n- ") : "ALLE CHECKS GRÜN");
  console.log(errors.length ? `${errors.length} page errors:\n` + errors.slice(0, 12).join("\n") : "no page errors");

  if (problems.length || errors.length) process.exitCode = 1;
} finally {
  child.kill();
}
