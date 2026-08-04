#!/usr/bin/env node
/**
 * Fix-Welle M — Verifikation (Tester-Sweep 2, 2026-07-13, design/ceo-run-2026-07-13.md).
 * Deckt die 6 Sweep-2-Befunde ab, die ui-dev in dieser Welle fixt:
 *  A) [T9] Import-Feedback: Erfolgs-Toast überlebt den sessionEpoch-Remount; Fehlerfall bleibt
 *     inline sichtbar (KEIN Remount).
 *  B) [T9] Escape schließt SpotlightGuide (OnboardingGuide UND AreaTourGuide — geteilte Komponente).
 *  C) [T8] formatNum statt rohes .toLocaleString() — Stichprobe über die betroffenen Seiten.
 *  D) [T10] Welcome-Back-Doppel-Modal: Save-Checkpoint sofort nach Load UND nach dismissOffline.
 *  E) [T1] window.__hfDebug auch im normalen Spiel-/Load-Pfad (dev-only) — Voraussetzung dafür,
 *     dass dieses Skript A/B/D/F überhaupt per __hfDebug patchen/prüfen kann.
 *  F) [T1] Union-Ziel-Label: title-Tooltip mit der vollen Varianten-Namensliste.
 *
 * Nutzt den echten localStorage-Fallback-Speicherpfad (saves.ts, kein Electron nötig) — echte
 * Slot-Load/-Save-Flows statt nur des ?fixture=-Hooks, weil Test A (Import in einen aktiven Slot)
 * und Test D (Checkpoint-Zeitstempel im gespeicherten JSON) einen ECHTEN Slot brauchen
 * (?fixture= läuft mit activeSlotRef=null, s. ui-audit/README.md).
 *
 * Port 5260 (Task-Vorgabe). Screenshots + Konsole-Log je Abschnitt.
 */
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5260;
const BASE_URL = `http://localhost:${PORT}`;
const OUT_DIR = "C:\\Users\\MSchu\\AppData\\Local\\Temp\\claude\\G--GameDev\\553d2095-3a73-4795-9782-0fe746a25f13\\scratchpad\\fix-wave-m";
mkdirSync(OUT_DIR, { recursive: true });

const FIXTURE_JSON = readFileSync(join(CLIENT_DIR, "ui-audit", "fixtures", "midgame.json"), "utf8");

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

/**
 * Für Klicks, die ihr EIGENES Zielelement per React-Remount aus dem DOM entfernen (Slot laden →
 * screen "playing", Neues Spiel/Charakter-Erstellen-Start, erfolgreicher Import → sessionEpoch-
 * Remount): Playwright's Klick-Aktion prüft Sichtbarkeit/Stabilität VOR UND NACH dem Klick — wenn
 * der Klick-Handler das Element selbst entfernt, wertet Playwright das als "element was detached"
 * und wirft einen Timeout, OBWOHL der Klick funktional angekommen ist. `noWaitAfter` reduziert das
 * Zeitfenster, aber die eigentliche Verifikation ist ohnehin der nachfolgende `waitForSelector` auf
 * dem Zielbildschirm — hier wird daher bewusst jeder Klick-Fehler geschluckt und der Erfolg NUR
 * über die Ziel-Seite bestätigt.
 */
async function clickThenSettle(page, locator) {
  try {
    await locator.click({ timeout: 6000, noWaitAfter: true });
  } catch { /* s. JSDoc oben — Verifikation passiert über den Ziel-Selektor beim Aufrufer */ }
}

const problems = [];
const errors = [];
const passes = [];

function ok(label) { passes.push(label); console.log("PASS: " + label); }
function fail(label) { problems.push(label); console.log("FAIL: " + label); }

function wirePage(page, tag) {
  page.on("pageerror", (e) => errors.push(`[${tag}] pageerror: ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error") errors.push(`[${tag}] console: ${m.text()}`); });
}

const { child, getOutput } = startDevServer();
try {
  const upOk = await waitForServer(BASE_URL);
  if (!upOk) { console.error("SERVER NOT UP:\n" + getOutput()); process.exit(1); }

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  wirePage(page, "main");
  await page.addInitScript(() => {
    try { localStorage.setItem("hearthforge:locale", "de"); } catch { /* noop */ }
  });

  // ── Seed: Slot 0 = Test A (Import), Slot 1 = Test D+C+F (Welcome-Back-Checkpoint, Format, Union) ──
  // WICHTIG: die rohe Fixture-Datei hat ein Jahre-altes `savedAt` (ui-audit/fixtures/midgame.json
  // wird seltener regeneriert als dieser Check läuft) — ein normaler loadGame() (im Gegensatz zu
  // importSave, das `summary.savedAt` als "now" nimmt) simuliert die ECHTE Offline-Lücke via
  // advance() in 100ms-Schritten (gedeckelt auf MAX_OFFLINE_MS=8h). Eine mehrtägige Lücke bedeutet
  // ~288 000 synchrone Ticks — blockiert den Renderer-Thread so lange, dass Playwright-Klicks im
  // Menü als "element was detached"/Timeout fehlschlagen. Slot 0 bekommt daher ein FRISCHES
  // `savedAt` (Test A testet Import-Feedback, keine Offline-Mechanik), Slot 1 ein kontrolliertes
  // 10-Minuten-Fenster (> 60s-Popup-Schwelle, aber nur ~6 000 Ticks — schnell genug für den Test).
  await page.goto(BASE_URL, { waitUntil: "load" });
  await page.evaluate((fixtureText) => {
    const slot0 = JSON.parse(fixtureText);
    slot0.savedAt = Date.now() - 5000;
    if (slot0.summary) slot0.summary.savedAt = slot0.savedAt;
    localStorage.setItem("hearthforge:save:0", JSON.stringify(slot0));

    const slot1 = JSON.parse(fixtureText);
    slot1.savedAt = Date.now() - 10 * 60 * 1000;
    if (slot1.summary) slot1.summary.savedAt = slot1.savedAt;
    localStorage.setItem("hearthforge:save:1", JSON.stringify(slot1));
  }, FIXTURE_JSON);

  // ═══════════════════════════════════════════════════════════════════════════════
  // TEST A — Import-Feedback (Fix 1): Erfolg → Toast überlebt Remount; Fehler → inline sichtbar
  // ═══════════════════════════════════════════════════════════════════════════════
  try {
    await page.reload({ waitUntil: "load" });
    await clickRetry(page, page.locator(".menu-nav .menu-nav-btn").nth(1)); // "Spiel laden"
    await page.waitForSelector(".menu-slot.filled", { timeout: 8000 });
    await clickThenSettle(page, page.locator(".menu-slot.filled").first());
    await page.waitForSelector('[data-guide-id="sidebar.options"]', { timeout: 15000 });
    await page.waitForTimeout(300);

    const hasDebugHookOnLoad = await page.evaluate(() => typeof window.__hfDebug === "object" && !!window.__hfDebug?.state);
    if (hasDebugHookOnLoad) ok("E: window.__hfDebug gesetzt nach normalem loadGame()");
    else fail("E: window.__hfDebug FEHLT nach normalem loadGame() (Fix 5)");

    await clickRetry(page, page.locator('[data-guide-id="sidebar.options"]').first());
    await page.waitForSelector(".opz-page", { timeout: 8000 });
    await page.waitForTimeout(300);

    // ── Erfolgsfall: dieselbe gültige Fixture-JSON re-importieren (mit demselben frischen savedAt,
    // das die Seed-Stelle oben gesetzt hat — sonst würde dieser Import wieder alte Offline-Reste
    // reinziehen; importSave nimmt zwar `summary.savedAt` als "now" und simuliert nie nach, aber der
    // GESPEICHERTE Wert soll für die spätere Prüfung sauber "frisch" bleiben). ──
    const importJson = await page.evaluate(() => localStorage.getItem("hearthforge:save:0"));
    await page.locator(".opz-textarea").fill(importJson);
    await clickThenSettle(page, page.locator(".opz-import-row .lang-btn").first());
    await page.waitForTimeout(900);

    const toastVisible = await page.evaluate(() => {
      const titles = [...document.querySelectorAll(".toast-title")].map((e) => e.textContent?.trim());
      return titles.includes("Spielstand importiert");
    });
    const optionsGoneAfterSuccess = (await page.locator(".opz-page").count()) === 0;
    if (toastVisible) ok('A: Erfolgs-Toast "Spielstand importiert" erscheint nach dem Remount');
    else fail('A: Erfolgs-Toast "Spielstand importiert" fehlt nach erfolgreichem Import');
    if (optionsGoneAfterSuccess) ok("A: OptionsPage remountet nach erfolgreichem Import (bestätigt das Remount-Timing-Problem existiert weiterhin, aber der Toast fängt es jetzt ab)");
    else fail("A: OptionsPage sollte nach erfolgreichem Import remounten (sessionEpoch) — tat es nicht, Testannahme verletzt");
    await page.screenshot({ path: join(OUT_DIR, "a1-import-success-toast.png") });

    // ── Fehlerfall: ungültiger Text → KEIN Remount, Inline-Fehler sichtbar ──
    // (Erfolgsfall hat gerade remountet, activePageId ist wieder "character" — erneut navigieren.)
    await clickRetry(page, page.locator('[data-guide-id="sidebar.options"]').first());
    await page.waitForSelector(".opz-page", { timeout: 8000 });
    await page.locator(".opz-textarea").fill("not a valid save {{{");
    await clickRetry(page, page.locator(".opz-import-row .lang-btn").first());
    await page.waitForTimeout(400);

    const errorSpanVisible = (await page.locator(".opz-status-error").count()) > 0;
    const optionsStillMountedAfterError = (await page.locator(".opz-page").count()) > 0;
    if (errorSpanVisible) ok("A: Inline-Fehleranzeige (.opz-status-error) erscheint bei ungültigem Import");
    else fail("A: Inline-Fehleranzeige fehlt bei ungültigem Import");
    if (optionsStillMountedAfterError) ok("A: KEIN Remount im Fehlerfall — OptionsPage bleibt gemountet");
    else fail("A: OptionsPage verschwand im Fehlerfall — Remount hätte NICHT passieren dürfen");
    await page.screenshot({ path: join(OUT_DIR, "a2-import-error-inline.png") });
  } catch (e) {
    fail("A: Test warf eine Exception: " + e.message);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // TEST B — Escape schließt SpotlightGuide (Fix 2): OnboardingGuide + AreaTourGuide
  // ═══════════════════════════════════════════════════════════════════════════════
  try {
    await page.reload({ waitUntil: "load" });
    await clickRetry(page, page.locator(".menu-nav .menu-nav-btn").nth(0)); // "Neues Spiel"
    await page.waitForSelector(".menu-slot--empty .hf-btn", { timeout: 8000 });
    await clickThenSettle(page, page.locator(".menu-slot--empty .hf-btn").first());
    await page.waitForSelector(".creation-input", { timeout: 10000 });
    await page.locator(".creation-input").fill("Sweep2 TestB");
    await clickThenSettle(page, page.locator(".creation-start"));
    await page.waitForSelector(".onboarding-guide-root", { timeout: 15000 });
    await page.waitForTimeout(300);

    const hasDebugHookOnCreate = await page.evaluate(() => typeof window.__hfDebug === "object" && !!window.__hfDebug?.state);
    if (hasDebugHookOnCreate) ok("E: window.__hfDebug gesetzt nach normalem createCharacter()");
    else fail("E: window.__hfDebug FEHLT nach normalem createCharacter() (Fix 5)");

    const guideActiveBefore = await page.evaluate(() => window.__hfDebug.state.onboarding.active === true);
    if (guideActiveBefore) ok("B: Haupt-Guide (OnboardingGuide) ist beim neuen Charakter aktiv");
    else fail("B: Haupt-Guide war nicht aktiv — Testvoraussetzung nicht erfüllt");
    await page.screenshot({ path: join(OUT_DIR, "b1-onboarding-guide-open.png") });

    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
    const guideGoneAfterEsc = (await page.locator(".onboarding-guide-root").count()) === 0;
    const guideActiveAfterEsc = await page.evaluate(() => window.__hfDebug.state.onboarding.active);
    if (guideGoneAfterEsc) ok("B: Escape entfernt .onboarding-guide-root (Haupt-Guide)");
    else fail("B: .onboarding-guide-root bleibt nach Escape im DOM (Haupt-Guide)");
    if (guideActiveAfterEsc === false) ok("B: Escape setzt state.onboarding.active=false (identisch zu 'Überspringen')");
    else fail("B: state.onboarding.active blieb nach Escape true");
    await page.screenshot({ path: join(OUT_DIR, "b2-onboarding-guide-closed-by-esc.png") });

    // ── AreaTourGuide: erster Kampf-Seiten-Besuch triggert die Bereichs-Tour ──
    await clickRetry(page, page.locator('[data-guide-id="sidebar.combat"]').first());
    await page.waitForSelector(".onboarding-guide-root", { timeout: 8000 });
    await page.waitForTimeout(300);
    const tourSeenBefore = await page.evaluate(() => window.__hfDebug.state.onboarding.toursSeen?.combat === true);
    if (!tourSeenBefore) ok("B: AreaTourGuide (Kampf) öffnet sich beim ersten Besuch");
    else fail("B: AreaTourGuide war schon vor dem Escape-Test als gesehen markiert — Testvoraussetzung verletzt");

    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
    const tourGoneAfterEsc = (await page.locator(".onboarding-guide-root").count()) === 0;
    const tourSeenAfterEsc = await page.evaluate(() => window.__hfDebug.state.onboarding.toursSeen?.combat === true);
    if (tourGoneAfterEsc) ok("B: Escape entfernt .onboarding-guide-root (AreaTourGuide/Kampf)");
    else fail("B: .onboarding-guide-root bleibt nach Escape im DOM (AreaTourGuide/Kampf)");
    if (tourSeenAfterEsc) ok("B: Escape markiert toursSeen.combat=true (identisch zu 'Überspringen')");
    else fail("B: toursSeen.combat blieb nach Escape false");
    await page.screenshot({ path: join(OUT_DIR, "b3-area-tour-closed-by-esc.png") });
  } catch (e) {
    fail("B: Test warf eine Exception: " + e.message);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // TEST D — Welcome-Back-Doppel-Modal: Save-Checkpoint nach Load + nach dismissOffline (Fix 4)
  // ═══════════════════════════════════════════════════════════════════════════════
  try {
    await page.reload({ waitUntil: "load" });
    await clickRetry(page, page.locator(".menu-nav .menu-nav-btn").nth(1)); // "Spiel laden"
    await page.waitForSelector(".menu-slot.filled", { timeout: 8000 });
    // Slot-Reihenfolge folgt der Slot-ID (0,1,...) — Slot 1 ist der 2. Eintrag.
    await clickThenSettle(page, page.locator(".menu-slot.filled").nth(1));
    await page.waitForSelector(".offline-stage", { timeout: 15000 });
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(OUT_DIR, "d1-offline-stage-first-open.png") });

    // (1) Checkpoint SOFORT nach erfolgreichem Load — VOR jedem Klick auf "Collect".
    const savedAtRightAfterLoad = await page.evaluate(() => {
      const raw = localStorage.getItem("hearthforge:save:1");
      return raw ? JSON.parse(raw).savedAt : null;
    });
    const ageAfterLoadMs = savedAtRightAfterLoad ? Date.now() - savedAtRightAfterLoad : Infinity;
    if (savedAtRightAfterLoad !== null && ageAfterLoadMs < 15000) {
      ok(`D: Save-Checkpoint sofort nach Load geschrieben (savedAt vor ${Math.round(ageAfterLoadMs / 1000)}s, war 2h in der Vergangenheit)`);
    } else {
      fail(`D: Kein frischer Save-Checkpoint sofort nach Load (savedAt-Alter ${ageAfterLoadMs}ms)`);
    }

    // (2) Checkpoint nach dismissOffline (Collect-Klick).
    await clickRetry(page, page.locator(".ofs-collect"));
    await page.waitForTimeout(600);
    const savedAtAfterDismiss = await page.evaluate(() => {
      const raw = localStorage.getItem("hearthforge:save:1");
      return raw ? JSON.parse(raw).savedAt : null;
    });
    const ageAfterDismissMs = savedAtAfterDismiss ? Date.now() - savedAtAfterDismiss : Infinity;
    if (savedAtAfterDismiss !== null && ageAfterDismissMs < 15000) {
      ok(`D: Save-Checkpoint nach dismissOffline geschrieben (savedAt vor ${Math.round(ageAfterDismissMs / 1000)}s)`);
    } else {
      fail(`D: Kein frischer Save-Checkpoint nach dismissOffline (savedAt-Alter ${ageAfterDismissMs}ms)`);
    }

    // (3) End-to-End: schneller "Hard-Kill"-Reload direkt danach darf die Karte NICHT erneut zeigen.
    await page.reload({ waitUntil: "load" });
    await clickRetry(page, page.locator(".menu-nav .menu-nav-btn").nth(1));
    await page.waitForSelector(".menu-slot.filled", { timeout: 8000 });
    await clickThenSettle(page, page.locator(".menu-slot.filled").nth(1));
    await page.waitForSelector('[data-guide-id="sidebar.options"]', { timeout: 15000 });
    await page.waitForTimeout(800);
    const offlineStageReappeared = (await page.locator(".offline-stage").count()) > 0;
    if (!offlineStageReappeared) ok("D: Welcome-Back-Karte erscheint NICHT erneut bei schnellem Reload (Doppel-Modal behoben)");
    else fail("D: Welcome-Back-Karte erschien beim schnellen Reload erneut (Doppel-Modal-Bug weiterhin vorhanden)");
    await page.screenshot({ path: join(OUT_DIR, "d2-no-double-modal-after-reload.png") });
  } catch (e) {
    fail("D: Test warf eine Exception: " + e.message);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // TEST C — formatNum statt rohes .toLocaleString() (Fix 3): Laufzeit-Stichprobe (de-DE)
  // ═══════════════════════════════════════════════════════════════════════════════
  // Läuft in derselben Slot-1-Session weiter (schon "playing" nach Test D).
  try {
    // Die Fixture-Figur hat toursSeen.{combat,shop,bank} nicht gesetzt (anders als die frisch in
    // Test B erstellte Figur) — der erste Besuch von Shop/Bank würde sonst mitten in der
    // Navigations-Kette hier die AreaTourGuide-Spotlight-Overlay auslösen (`.guide-active` sperrt
    // per CSS pointer-events auf dem ganzen Rest der App), was den NÄCHSTEN Klick (Bank/Quests)
    // mit "element intercepts pointer events" blockiert. Für diese reine Formatierungs-/Tooltip-
    // Stichprobe irrelevant → vorsorglich als "schon gesehen" markieren.
    await page.evaluate(() => {
      const { state } = window.__hfDebug;
      state.onboarding.active = false;
      state.onboarding.toursSeen = { ...state.onboarding.toursSeen, combat: true, shop: true, bank: true };
    });
    await page.waitForTimeout(200);

    // Fixture-Rohwerte (kills=0, gold~5400) reichen nicht IMMER für eine aussagekräftige
    // Tausendertrennzeichen-Probe — auf klar 7-stellige Werte patchen, damit de-DE ("1.234.567")
    // sich sichtbar von einem rohen OS-/Browser-Default (z.B. "1,234,567") unterscheidet.
    await page.evaluate(() => {
      const { state } = window.__hfDebug;
      state.stats.kills = 1234567;
      state.character.gold = 7654321;
    });
    await page.waitForTimeout(200);

    await clickRetry(page, page.locator('[data-guide-id="topbar.stats"], [data-guide-id="sidebar.stats"]').first());
    await page.waitForSelector(".stx-page", { timeout: 8000 });
    await page.waitForTimeout(300);
    const statsCheck = await page.evaluate(() => {
      const state = window.__hfDebug.state;
      const cells = [...document.querySelectorAll(".stx-medallion")];
      const findVal = (label) => cells.find((c) => c.querySelector(".stx-medallion-label")?.textContent.trim() === label)
        ?.querySelector(".stx-medallion-value")?.textContent.trim() ?? null;
      const killsExpected = state.stats.kills.toLocaleString("de-DE");
      const killsShown = findVal("Besiegte Monster");
      const goldExpected = state.character.gold.toLocaleString("de-DE");
      const goldShown = findVal("Gold");
      return { killsExpected, killsShown, goldExpected, goldShown };
    });
    console.log("StatsPage: " + JSON.stringify(statsCheck));
    if (statsCheck.killsShown === statsCheck.killsExpected) ok(`C: StatsPage kills formatiert als de-DE (${statsCheck.killsShown})`);
    else fail(`C: StatsPage kills falsch formatiert: zeigt "${statsCheck.killsShown}", erwartet "${statsCheck.killsExpected}"`);
    if (statsCheck.goldShown === statsCheck.goldExpected) ok(`C: StatsPage gold formatiert als de-DE (${statsCheck.goldShown})`);
    else fail(`C: StatsPage gold falsch formatiert: zeigt "${statsCheck.goldShown}", erwartet "${statsCheck.goldExpected}"`);
    await page.screenshot({ path: join(OUT_DIR, "c1-stats-formatnum.png") });

    await clickRetry(page, page.locator('[data-guide-id="topbar.achievements"], [data-guide-id="sidebar.achievements"]').first());
    await page.waitForSelector(".achv-page", { timeout: 8000 });
    await page.waitForTimeout(300);
    const achvCheck = await page.evaluate(() => {
      const pctEl = document.querySelector(".achv-hero-bar-pct");
      const apEl = document.querySelector(".achv-hero-ap-val");
      return { pctText: pctEl?.textContent.trim() ?? null, apText: apEl?.textContent.trim() ?? null };
    });
    console.log("AchievementsPage: " + JSON.stringify(achvCheck));
    // Reine Existenz-/Muster-Prüfung (die exakten Zahlen hängen vom Achievement-Fortschritt der
    // Fixture ab) — Ziffern + evtl. "." Gruppierung, kein rohes Komma (US-Locale-Fallback-Symptom).
    const deGroupedPattern = /^\d{1,3}(\.\d{3})*$/;
    if (achvCheck.pctText && achvCheck.pctText.split(" / ").every((n) => deGroupedPattern.test(n))) {
      ok(`C: AchievementsPage Fortschritt de-DE-formatiert (${achvCheck.pctText})`);
    } else {
      fail(`C: AchievementsPage Fortschritt sieht nicht de-DE-formatiert aus: "${achvCheck.pctText}"`);
    }
    await page.screenshot({ path: join(OUT_DIR, "c2-achievements-formatnum.png") });

    await clickRetry(page, page.locator('[data-guide-id="topbar.mastery"], [data-guide-id="sidebar.mastery"]').first());
    await page.waitForSelector(".ms2-tabs-summary", { timeout: 8000 });
    await page.waitForTimeout(300);
    const masteryCheck = await page.evaluate(() => {
      const el = document.querySelector(".ms2-agg-stat:nth-of-type(1) .ms2-agg-stat-val");
      return el?.textContent.trim() ?? null;
    });
    console.log("MasteryPage totalMasteryLevel: " + masteryCheck);
    if (masteryCheck && deGroupedPattern.test(masteryCheck)) ok(`C: MasteryPage totalMasteryLevel de-DE-formatiert (${masteryCheck})`);
    else fail(`C: MasteryPage totalMasteryLevel sieht nicht de-DE-formatiert aus: "${masteryCheck}"`);
    await page.screenshot({ path: join(OUT_DIR, "c3-mastery-formatnum.png") });

    await clickRetry(page, page.locator('[data-guide-id="topbar.shop"], [data-guide-id="sidebar.shop"]').first());
    await page.waitForSelector(".shopv2-balance-amount", { timeout: 8000 });
    await page.waitForTimeout(300);
    const shopCheck = await page.evaluate(() => {
      const state = window.__hfDebug.state;
      return {
        shown: document.querySelector(".shopv2-balance-amount")?.textContent.trim() ?? null,
        expected: state.character.gold.toLocaleString("de-DE"),
      };
    });
    console.log("ShopPage: " + JSON.stringify(shopCheck));
    if (shopCheck.shown === shopCheck.expected) ok(`C: ShopPage gold de-DE-formatiert (${shopCheck.shown})`);
    else fail(`C: ShopPage gold falsch formatiert: zeigt "${shopCheck.shown}", erwartet "${shopCheck.expected}"`);
    await page.screenshot({ path: join(OUT_DIR, "c4-shop-formatnum.png") });

    // Bank/Combat/PetGallery: Screenshot zur visuellen Kontrolle (exakte Zahl schwerer isoliert zu
    // fassen, s. Bericht) — statischer Grep (0 rohe .toLocaleString()-Aufrufe) + tsc bereits grün.
    await clickRetry(page, page.locator('[data-guide-id="topbar.bank"], [data-guide-id="sidebar.bank"]').first());
    await page.waitForSelector(".bank-columns", { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(OUT_DIR, "c5-bank-visual.png") });

    await clickRetry(page, page.locator('[data-guide-id="topbar.companions"], [data-guide-id="sidebar.companions"]').first());
    await page.waitForSelector(".pet-gallery-page", { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(OUT_DIR, "c6-petgallery-visual.png") });
  } catch (e) {
    fail("C: Test warf eine Exception: " + e.message);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // TEST F — Union-Ziel-Label: title-Tooltip mit voller Namensliste (Fix 6)
  // ═══════════════════════════════════════════════════════════════════════════════
  try {
    await page.evaluate(() => {
      const { content, state } = window.__hfDebug;
      const ids = Object.keys(content.monsters).slice(0, 3);
      content.quests.push({
        id: "test_union_quest",
        name: { en: "Sweep2 Union Test", de: "Sweep2 Union Test" },
        description: { en: "Test.", de: "Test." },
        objectives: [{ type: "kill_monster", targets: ids, count: 999999 }],
        rewards: { gold: 1 },
      });
      window.__testUnionMonsterIds = ids;
    });
    await page.waitForTimeout(300);

    await clickRetry(page, page.locator('[data-guide-id="topbar.quests"], [data-guide-id="sidebar.quests"]').first());
    await page.waitForSelector(".quests-page", { timeout: 8000 });
    await clickRetry(page, page.locator(".quests-tab-btn").nth(1)); // "Aufträge" (contracts)
    await page.waitForTimeout(400);

    const unionCheck = await page.evaluate(() => {
      const { content } = window.__hfDebug;
      const ids = window.__testUnionMonsterIds;
      // Spiegelt resolveText() (shared/index.ts): LocalizedString ist entweder ein roher String
      // oder ein { en, de?, ... }-Objekt mit en-Fallback.
      const resolveDe = (v) => (typeof v === "string" ? v : v?.de ?? v?.en ?? "");
      const fullNames = ids.map((id) => resolveDe(content.monsters[id]?.name) || id).join(", ");
      const card = [...document.querySelectorAll(".quest-card")].find((c) => c.textContent.includes("Sweep2 Union Test"));
      const label = card?.querySelector(".quest-obj-label");
      return {
        found: !!label,
        text: label?.textContent.trim() ?? null,
        title: label?.getAttribute("title") ?? null,
        fullNames,
      };
    });
    console.log("Union-Label: " + JSON.stringify(unionCheck));
    if (!unionCheck.found) {
      fail("F: Test-Quest-Karte/Ziel-Label nicht im DOM gefunden");
    } else {
      if (unionCheck.text?.includes("…")) ok(`F: Kurzform bleibt gekürzt ("${unionCheck.text}")`);
      else fail(`F: Kurzform sieht nicht wie eine 3+-Ziel-Ellipse aus: "${unionCheck.text}"`);
      if (unionCheck.title === unionCheck.fullNames) {
        ok(`F: title-Tooltip enthält die volle Varianten-Namensliste ("${unionCheck.title}")`);
      } else {
        fail(`F: title-Tooltip fehlt/falsch — zeigt "${unionCheck.title}", erwartet "${unionCheck.fullNames}"`);
      }
    }
    await page.screenshot({ path: join(OUT_DIR, "f1-union-label-tooltip.png") });
  } catch (e) {
    fail("F: Test warf eine Exception: " + e.message);
  }

  await browser.close();

  console.log("\n══════════════════════════════════════════");
  console.log(`${passes.length} PASS, ${problems.length} FAIL`);
  console.log(problems.length ? "PROBLEME:\n- " + problems.join("\n- ") : "ALLE CHECKS GRÜN");
  console.log(errors.length ? `${errors.length} page errors:\n` + errors.slice(0, 20).join("\n") : "no page errors");

  if (problems.length) process.exitCode = 1;
} finally {
  child.kill();
}
