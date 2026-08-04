#!/usr/bin/env node
/**
 * Release-Fix-Welle 0.3.0, Agent B, Befund B4-2/B4-3 — Verifikationsskript (KEIN Dauer-Tool,
 * einmaliger Beleg-Lauf). Fährt den ECHTEN Lade-Pfad (Hauptmenü -> Slot laden, NICHT den
 * `?fixture=`-Query-Trick, der laut fixtureLoader.ts `now=savedAt` setzt und damit IMMER 0
 * Offline-Zeit ergibt): `sim-harness.mjs`s `slotSaves`-Injection legt den Save `b4_v72` (SAVE_VERSION
 * 72, `savedAt` 2026-07-13 — echte Lücke von >20 Tagen zum realen `Date.now()`) in Slot 1, dann
 * klickt das Skript den Menü-Load-Flow wie ein echter Spieler.
 *
 * Prüft:
 *  1. Offline-Report (`.offline-stage`) öffnet OHNE gleichzeitiges Tour-Overlay
 *     (`.onboarding-guide-root` darf währenddessen NICHT existieren).
 *  2. "Einsammeln" (`.ofs-collect`) ist normal klickbar (kein Tour-Overlay blockiert per CSS
 *     `pointer-events`).
 *  3. NACH dem Schließen erscheint zuerst die v1-Tour (dieser Save kennt `toursSeen.featureTourV1`
 *     noch nicht) -> "Überspringen" setzt den Marker.
 *  4. Direkt danach (verkettet über `requiresTourKey`) erscheint die v2-Tour mit dem New-Haven-
 *     Schritt, spotlightet `[data-guide-id="sidebar.newhaven"]`.
 *  5. Klick auf das echte Ziel (requireAction) navigiert UND schließt die v2-Tour.
 *  6. Manueller Save (`.sb-footer-save`) + `page.reload()` + denselben Slot erneut laden: weder
 *     Offline-Report (Lücke jetzt ~0) noch irgendeine Tour erscheinen erneut.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { startHarness } from "./sim-harness.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = 5252;
const OUT_DIR = join(__dirname, "bot-runs", "b4-tour-verify");
mkdirSync(OUT_DIR, { recursive: true });

const log = { steps: [], fatal: null };
function step(name, data = {}) {
  log.steps.push({ name, ...data });
  console.log(`[step] ${name}`, JSON.stringify(data));
}

async function main() {
  const h = await startHarness({
    port: PORT,
    slotSaves: { 1: "b4_v72" },
    fixture: null,
    locale: "de",
    requireDebugHook: false,
    outDir: OUT_DIR,
  });
  const { page } = h;
  let h2 = null;
  try {
    // ── Hauptmenü -> Load-Panel -> Slot 1 laden (echter Lade-Pfad, echtes deserialize(now=Date.now())) ──
    await page.locator(".menu-nav-btn").nth(1).click();
    await page.waitForTimeout(400);
    await h.shot("00-menu-load-panel.png");
    await page.locator(".menu-slot.filled").first().click();

    // ── Offline-Report muss OHNE gleichzeitige Tour aufgehen ──
    await page.waitForSelector(".offline-stage", { timeout: 15000 });
    await page.waitForTimeout(400); // React-Settle, s. BOT-GUIDE.md "Vor-Render-Frame"-Lektion
    await h.shot("01-offline-report-open.png");
    const duringOffline = await page.evaluate(() => ({
      offlineStageVisible: !!document.querySelector(".offline-stage"),
      guideRootExists: !!document.querySelector(".onboarding-guide-root"),
    }));
    step("offline-report-state", duringOffline);
    if (duringOffline.guideRootExists) {
      log.fatal = "B4-2 REGRESSION: .onboarding-guide-root existiert WÄHREND der Offline-Report offen ist.";
      throw new Error(log.fatal);
    }

    // Dieser Save-Fixture hat aus dem reichen Offline-Catchup noch ANDERE, von B4-2/B4-3 UNABHÄNGIGE
    // Einmal-Zeremonien im Gepäck (Pet-Celebration, Mastery-Ceremony) — die legen sich ihrerseits über
    // den Offline-Report (bekannte, separate Befunde, NICHT Teil dieses Auftrags). Weg-klicken, um an
    // den eigentlichen Beleg (".ofs-collect" ist normal erreichbar) zu kommen.
    for (let i = 0; i < 15; i++) {
      const blocker = await page.evaluate(() => {
        if (document.querySelector(".pet-celebration-close")) return ".pet-celebration-close";
        if (document.querySelector(".mwc-next-btn")) return ".mwc-next-btn";
        return null;
      });
      if (!blocker) break;
      step("dismiss-unrelated-ceremony", { blocker });
      // JS-Klick statt Playwright-Locator-Klick: diese Karten haben eine CSS-Exit-Transition, die
      // Playwrights Stabilitäts-Check ("element is not stable") ins Timeout laufen lässt — für diese
      // NEBENSÄCHLICHEN, aus dem Scope liegenden Zeremonien reicht ein echtes DOM-Click-Event.
      await page.evaluate((sel) => document.querySelector(sel)?.click(), blocker);
      await page.waitForTimeout(500);
    }
    await h.shot("01b-offline-report-after-ceremony-dismiss.png");

    // ── "Einsammeln" klicken -> Offline-Report schließt (der eigentliche Beleg: normal klickbar) ──
    await page.locator(".ofs-collect").click({ timeout: 8000 });
    await page.waitForSelector(".offline-stage", { state: "detached", timeout: 5000 });

    // Evtl. weitere, von B4-2/B4-3 unabhängige Zeremonien (s.o.) können NACH dem Offline-Report noch
    // in der Warteschlange stehen (z.B. eine 2. Meisterweihe) — dieselbe Wegräum-Schleife.
    for (let i = 0; i < 15; i++) {
      const blocker = await page.evaluate(() => {
        if (document.querySelector(".pet-celebration-close")) return ".pet-celebration-close";
        if (document.querySelector(".mwc-next-btn")) return ".mwc-next-btn";
        return null;
      });
      if (!blocker) break;
      step("dismiss-unrelated-ceremony-post-offline", { blocker });
      await page.evaluate((sel) => document.querySelector(sel)?.click(), blocker);
      await page.waitForTimeout(500);
    }

    // ── v1-Tour muss jetzt auftauchen (dieser Save kennt featureTourV1 noch nicht) ──
    await page.waitForSelector(".guide-bubble-title", { timeout: 8000 });
    await page.waitForTimeout(300);
    const v1Info = await page.evaluate(() => ({
      title: document.querySelector(".guide-bubble-title")?.textContent ?? null,
      body: document.querySelector(".guide-bubble-body")?.textContent ?? null,
    }));
    step("v1-tour-intro", v1Info);
    await h.shot("02-v1-tour-intro.png");

    // Überspringen (Skip) -> setzt toursSeen.featureTourV1 = true, schließt v1 komplett.
    await page.locator(".guide-bubble-skip").click();
    await page.waitForTimeout(500);

    // Dieser reiche Fixture-Save hat MEHRERE 99er-Skills (Angeln UND Kochen) -> mehrere unabhängige
    // Meisterweihen können genau in diesem Fenster nachrücken. Dieselbe Wegräum-Schleife, damit der
    // v2-Beleg unten sauber (ohne die aus-dem-Scope-liegende Überlappung) aussieht.
    for (let i = 0; i < 15; i++) {
      const blocker = await page.evaluate(() => {
        if (document.querySelector(".pet-celebration-close")) return ".pet-celebration-close";
        if (document.querySelector(".mwc-next-btn")) return ".mwc-next-btn";
        return null;
      });
      if (!blocker) break;
      step("dismiss-unrelated-ceremony-pre-v2", { blocker });
      await page.evaluate((sel) => document.querySelector(sel)?.click(), blocker);
      await page.waitForTimeout(500);
    }

    // ── v2-Tour (New Haven) muss direkt danach erscheinen (verkettet über requiresTourKey) ──
    await page.waitForSelector(".guide-bubble-title", { timeout: 8000 });
    await page.waitForTimeout(300);
    const v2Info = await page.evaluate(() => {
      const target = document.querySelector(".guide-target");
      return {
        title: document.querySelector(".guide-bubble-title")?.textContent ?? null,
        body: document.querySelector(".guide-bubble-body")?.textContent ?? null,
        guideId: target ? target.getAttribute("data-guide-id") : null,
        hasHint: !!document.querySelector(".guide-bubble-hint"),
        hasSkip: !!document.querySelector(".guide-bubble-skip"),
      };
    });
    step("v2-tour-newhaven", v2Info);
    await h.shot("03-v2-tour-newhaven.png");
    if (v2Info.guideId !== "sidebar.newhaven") {
      log.fatal = `v2-Tour spotlightet "${v2Info.guideId}" statt "sidebar.newhaven".`;
      throw new Error(log.fatal);
    }

    // ── Klick auf das ECHTE Ziel: navigiert zu New Haven UND schließt die v2-Tour (requireAction) ──
    await page.locator(".guide-target").click();
    await page.waitForTimeout(600);
    await h.shot("04-after-newhaven-click.png");
    const afterClick = await page.evaluate(() => ({
      guideRootExists: !!document.querySelector(".onboarding-guide-root"),
      toursSeen: window.__hfDebug?.state?.onboarding?.toursSeen ?? null,
      onNewHavenPage: !!document.querySelector(".newhaven-page, [data-page='newhaven']") || location.href.includes("newhaven"),
    }));
    step("after-newhaven-click", afterClick);
    if (afterClick.guideRootExists) {
      log.fatal = "v2-Tour schließt nicht nach Klick auf das Spotlight-Ziel.";
      throw new Error(log.fatal);
    }
    if (!afterClick.toursSeen?.featureTourV1 || !afterClick.toursSeen?.featureTourV2) {
      log.fatal = `toursSeen nach Abschluss unvollständig: ${JSON.stringify(afterClick.toursSeen)}`;
      throw new Error(log.fatal);
    }

    // Dieser reiche Fixture-Save hat noch weitere unabhängige Meisterweihen in der Warteschlange
    // (mehrere 99er-Skills) — jede neue Seitenansicht kann die nächste auslösen. Dieselbe Wegräum-
    // Schleife, bevor der Speichern-Knopf angefasst wird.
    for (let i = 0; i < 15; i++) {
      const blocker = await page.evaluate(() => {
        if (document.querySelector(".pet-celebration-close")) return ".pet-celebration-close";
        if (document.querySelector(".mwc-next-btn")) return ".mwc-next-btn";
        return null;
      });
      if (!blocker) break;
      step("dismiss-unrelated-ceremony-pre-save", { blocker });
      await page.evaluate((sel) => document.querySelector(sel)?.click(), blocker);
      await page.waitForTimeout(500);
    }

    // ── Persistenz-Beweis Teil 1: manuell speichern, den ECHTEN geschriebenen Save auslesen ──
    // JS-Klick (Muster oben): der Sidebar-Footer kann je nach Sidebar-Scrollzustand/-Kollaps
    // außerhalb des Playwright-"visible"-Checks liegen, ohne dass das App-seitig ein Bug ist —
    // das Save-Verb selbst braucht keine echte Pointer-Geometrie, nur den Klick-Handler.
    await page.evaluate(() => document.querySelector(".sb-footer-save")?.click());
    await page.waitForTimeout(800);
    const savedJson = await page.evaluate(() => localStorage.getItem("hearthforge:save:1"));
    if (!savedJson) {
      log.fatal = "Manueller Save hat nichts unter hearthforge:save:1 geschrieben.";
      throw new Error(log.fatal);
    }
    const savedToursSeen = JSON.parse(savedJson)?.state?.onboarding?.toursSeen ?? null;
    step("manual-save-written", { savedToursSeen });
    if (!savedToursSeen?.featureTourV1 || !savedToursSeen?.featureTourV2) {
      log.fatal = `Gespeicherter Save trägt toursSeen nicht korrekt: ${JSON.stringify(savedToursSeen)}`;
      throw new Error(log.fatal);
    }

    // ── Persistenz-Beweis Teil 2: NEUE, unabhängige Browser-/Server-Instanz mit GENAU diesem
    // frisch geschriebenen Save laden (nicht page.reload() — das würde über addInitScript erneut
    // die PRISTINE b4_v72-Fixture injizieren und damit den Test verfälschen; eine zweite
    // startHarness-Instanz mit dem echten savedJson simuliert die nächste reale Spielsitzung). Die
    // Save-Zeit liegt nun Sekunden zurück (< 60s-Schwelle) -> kein Offline-Report, keine Tour.
    await h.stop();
    h2 = await startHarness({
      port: PORT,
      slotSaves: { 1: savedJson },
      fixture: null,
      locale: "de",
      requireDebugHook: false,
      outDir: OUT_DIR,
    });
    try {
      await h2.page.locator(".menu-nav-btn").nth(1).click();
      await h2.page.waitForTimeout(400);
      await h2.page.locator(".menu-slot.filled").first().click();
      await h2.page.waitForFunction(() => !!window.__hfDebug, null, { timeout: 10000 });
      await h2.page.waitForTimeout(1200); // Settle: Offline-Berechnung + evtl. Tour-Gate, s. Lesson 2
      await h2.shot("05-second-load-no-repeat.png");
      const secondLoad = await h2.page.evaluate(() => ({
        offlineStageVisible: !!document.querySelector(".offline-stage"),
        guideRootExists: !!document.querySelector(".onboarding-guide-root"),
        toursSeen: window.__hfDebug?.state?.onboarding?.toursSeen ?? null,
      }));
      step("second-load-state", secondLoad);
      if (secondLoad.guideRootExists) {
        log.fatal = "Tour erscheint erneut beim zweiten Laden (Persistenz-Bug).";
        throw new Error(log.fatal);
      }
      if (secondLoad.offlineStageVisible) {
        log.fatal = "Offline-Report erscheint erneut trotz Sekunden-Lücke (unerwartet).";
        throw new Error(log.fatal);
      }
      if (!secondLoad.toursSeen?.featureTourV1 || !secondLoad.toursSeen?.featureTourV2) {
        log.fatal = `toursSeen beim zweiten Laden nicht mehr korrekt: ${JSON.stringify(secondLoad.toursSeen)}`;
        throw new Error(log.fatal);
      }
    } finally {
      await h2.stop();
    }

    console.log("ALL CHECKS PASSED");
  } catch (err) {
    log.fatal = log.fatal || String(err.stack || err);
    console.error("FATAL:", log.fatal);
    try {
      await (h2 ?? h).shot("ERROR.png");
    } catch {
      /* noop */
    }
  } finally {
    await h.stop();
    if (h2) await h2.stop();
    writeFileSync(join(OUT_DIR, "log.json"), JSON.stringify(log, null, 2), "utf8");
    console.log("LOG WRITTEN:", join(OUT_DIR, "log.json"));
    if (log.fatal) process.exit(1);
  }
}

main();
