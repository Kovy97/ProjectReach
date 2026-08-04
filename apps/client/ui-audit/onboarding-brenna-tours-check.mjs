#!/usr/bin/env node
/**
 * Onboarding-Guide Welle B (Chef-Auftrag „Onboarding fertig machen", 2026-07-13) — Verifikation:
 *  (A) Haupt-Guide (OnboardingGuide.tsx, via Options „Tutorial erneut anzeigen" neu gestartet)
 *      zeigt jetzt Brenna: Kopf-Medaillon (img geladen) + NpcSpeechBubble mit Namen "Brenna
 *      Ashwick" um Titel/Text des ersten Schritts — Spotlight-Ring auf dem ersten Ziel intakt.
 *  (B) Bereichs-Erst-Touren (AreaTourGuide.tsx) für Kampf/Shop/Bank:
 *      - Erster Seitenbesuch (Fixture-Patch: toursSeen leer, Haupt-Guide "done") → Tour erscheint.
 *      - Kampf: bis zum Ende durchklicken ("Weiter" × N) → toursSeen.combat gesetzt.
 *      - Shop: sofortiger Skip → toursSeen.shop gesetzt.
 *      - Bank: bis zum Ende durchklicken → toursSeen.bank gesetzt.
 *      - Erneuter Seitenbesuch je Bereich danach → KEINE Tour mehr.
 *  (C) Screenshots bei 1920×1080 UND 1366×768 je Tour-Einstieg + Brenna-Medaillon-Closeup;
 *      keine horizontale Blasen-Textüberlappung, Blase bleibt im Viewport.
 *  (D) Keine page errors.
 * Port 5246.
 */
import { spawn } from "node:child_process";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const CLIENT_DIR = "G:\\GameDev\\apps\\client";
const PORT = 5246;
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

/** Route-Patch (Muster arena-rework-check.mjs): erzwingt einen deterministischen
 *  onboarding-Zustand auf dem midgame-Fixture — Haupt-Guide "done" (feuert nicht automatisch),
 *  toursSeen komplett leer (alle drei Bereichs-Touren feuern beim jeweils ersten Besuch). */
async function routeFixture(page) {
  await page.route("**/ui-audit-fixtures/midgame.json", async (route) => {
    const res = await route.fetch();
    const json = JSON.parse(await res.text());
    json.state.onboarding = { active: false, step: 0, done: true, toursSeen: {} };
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(json) });
  });
}

const errors = [];
function wirePage(page, tag) {
  page.on("pageerror", (e) => errors.push(`[${tag}] pageerror: ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error") errors.push(`[${tag}] console: ${m.text()}`); });
}

async function loadGame(page) {
  await page.addInitScript(() => window.localStorage.setItem("hearthforge:locale", "en"));
  await routeFixture(page);
  await page.goto(`${BASE_URL}/?fixture=midgame`, { waitUntil: "load" });
  await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
  await page.waitForTimeout(1200);
}

function inspectBubble() {
  const root = document.querySelector(".onboarding-guide-root");
  if (!root) return { present: false };
  const bubble = root.querySelector(".guide-bubble");
  const head = root.querySelector(".guide-bubble-speaker .npc-greeting-head img");
  const name = root.querySelector(".guide-bubble-speaker .npc-bubble-name");
  const title = root.querySelector(".guide-bubble-title");
  const body = root.querySelector(".guide-bubble-body");
  const npcBubble = root.querySelector(".guide-bubble-speaker .npc-bubble");
  const br = bubble ? bubble.getBoundingClientRect() : null;
  const hasSkip = !!root.querySelector(".guide-bubble-skip");
  const hasContinue = !!root.querySelector(".guide-bubble-footer button.combat-btn");
  const continueLabel = hasContinue ? root.querySelector(".guide-bubble-footer button.combat-btn").textContent : null;
  return {
    present: true,
    headImgLoaded: head ? head.complete && head.naturalWidth > 0 : false,
    speakerName: name ? name.textContent.trim() : "",
    title: title ? title.textContent.trim() : "",
    body: body ? body.textContent.trim() : "",
    hasSkip,
    hasContinue,
    continueLabel,
    bubbleRect: br ? { top: Math.round(br.top), left: Math.round(br.left), right: Math.round(br.right), bottom: Math.round(br.bottom) } : null,
    bubbleOverflowX: npcBubble ? npcBubble.scrollWidth - npcBubble.clientWidth : null,
    viewport: { w: window.innerWidth, h: window.innerHeight },
    docScrollWidth: document.documentElement.scrollWidth,
  };
}

/** Klickt "Weiter"/"Los" bis die Tour verschwindet (Sicherheitsdeckel gegen Endlosschleife). */
async function clickThroughToEnd(page, maxSteps = 8) {
  const seenTitles = [];
  for (let i = 0; i < maxSteps; i++) {
    const present = await page.locator(".onboarding-guide-root").count();
    if (present === 0) break;
    const info = await page.evaluate(inspectBubble);
    if (!info.present) break;
    seenTitles.push(info.title);
    if (!info.hasContinue) { seenTitles.push("NO-CONTINUE-BTN"); break; }
    await clickRetry(page, page.locator(".guide-bubble-footer button.combat-btn").first());
    await page.waitForTimeout(350);
  }
  return seenTitles;
}

const problems = [];
const { child, getOutput } = startDevServer();
try {
  const ok = await waitForServer(BASE_URL);
  if (!ok) { console.error("SERVER NOT UP:\n" + getOutput()); process.exit(1); }
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  wirePage(page, "main");
  await loadGame(page);

  // ── (A) Haupt-Guide neu starten (Options → "Tutorial erneut anzeigen") — Brenna-Präsentation ──
  await clickRetry(page, page.locator('[data-guide-id="sidebar.options"]').first());
  await page.waitForSelector(".opz-page", { timeout: 8000 });
  await page.waitForTimeout(500);
  await clickRetry(page, page.getByText("Show tutorial again", { exact: false }).first());
  await page.waitForSelector(".onboarding-guide-root", { timeout: 8000 });
  await page.waitForTimeout(500);
  const mainGuideInfo = await page.evaluate(inspectBubble);
  console.log("MAIN GUIDE (Brenna):", JSON.stringify(mainGuideInfo));
  if (!mainGuideInfo.present) problems.push("(A) Haupt-Guide erscheint nicht nach restartGuide");
  else {
    if (!mainGuideInfo.headImgLoaded) problems.push("(A) Haupt-Guide: Brenna-Kopfbild nicht geladen");
    if (mainGuideInfo.speakerName !== "Brenna Ashwick") problems.push(`(A) Haupt-Guide: Sprecher-Name "${mainGuideInfo.speakerName}" ≠ "Brenna Ashwick"`);
    if (!mainGuideInfo.title) problems.push("(A) Haupt-Guide: Schritt-Titel leer");
    if (!mainGuideInfo.body) problems.push("(A) Haupt-Guide: Schritt-Text leer");
    if ((mainGuideInfo.bubbleOverflowX ?? 0) > 1) problems.push(`(A) Haupt-Guide: Text horizontal abgeschnitten (${mainGuideInfo.bubbleOverflowX}px)`);
  }
  await page.screenshot({ path: join(OUT_DIR, "brenna-main-guide-1920.png"), fullPage: false });
  console.log("SHOT SAVED: brenna-main-guide-1920.png");
  // Close-up vom Medaillon (Chef-Zusatzauftrag: Größe ansehen).
  const headBox = await page.locator(".guide-bubble-speaker .npc-greeting-head").first().boundingBox();
  if (headBox) {
    await page.screenshot({
      path: join(OUT_DIR, "brenna-medallion-closeup-1920.png"),
      clip: { x: Math.max(0, headBox.x - 20), y: Math.max(0, headBox.y - 20), width: headBox.width + 340, height: headBox.height + 40 },
    });
    console.log("SHOT SAVED: brenna-medallion-closeup-1920.png (medallion", Math.round(headBox.width), "x", Math.round(headBox.height), "px)");
  }
  // Skip schließt den Haupt-Guide sofort (kein Interferieren mit den folgenden Bereichs-Touren).
  await clickRetry(page, page.locator(".guide-bubble-skip").first());
  await page.waitForTimeout(400);
  const mainGuideGone = (await page.locator(".onboarding-guide-root").count()) === 0;
  if (!mainGuideGone) problems.push("(A) Haupt-Guide verschwindet nicht nach Skip");
  console.log("Haupt-Guide nach Skip weg:", mainGuideGone);

  // 1366×768-Fassung des Haupt-Guides (neu starten, Screenshot, wieder skippen).
  await clickRetry(page, page.getByText("Show tutorial again", { exact: false }).first());
  await page.waitForSelector(".onboarding-guide-root", { timeout: 8000 });
  await page.waitForTimeout(400);
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.waitForTimeout(400);
  const mainGuideSmall = await page.evaluate(inspectBubble);
  console.log("MAIN GUIDE @1366:", JSON.stringify(mainGuideSmall));
  if (mainGuideSmall.present && mainGuideSmall.bubbleRect) {
    const r = mainGuideSmall.bubbleRect;
    if (r.left < 0 || r.top < 0 || r.right > mainGuideSmall.viewport.w || r.bottom > mainGuideSmall.viewport.h) {
      problems.push(`(A)@1366: Guide-Blase ragt aus dem Viewport (${JSON.stringify(r)} vs ${JSON.stringify(mainGuideSmall.viewport)})`);
    }
    if ((mainGuideSmall.bubbleOverflowX ?? 0) > 1) problems.push(`(A)@1366: Text horizontal abgeschnitten (${mainGuideSmall.bubbleOverflowX}px)`);
  }
  await page.screenshot({ path: join(OUT_DIR, "brenna-main-guide-1366.png"), fullPage: false });
  console.log("SHOT SAVED: brenna-main-guide-1366.png");
  await clickRetry(page, page.locator(".guide-bubble-skip").first());
  await page.waitForTimeout(400);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.waitForTimeout(300);

  // ── (B) Bereichs-Erst-Touren ─────────────────────────────────────────────────────────────────
  const AREAS = [
    { key: "combat", nav: '[data-guide-id="sidebar.combat"]', wrapper: ".combat-page", mode: "click-through" },
    { key: "shop", nav: '[data-guide-id="topbar.shop"]', wrapper: ".shopv2-page", mode: "skip" },
    { key: "bank", nav: '[data-guide-id="topbar.bank"]', wrapper: ".bank-page", mode: "click-through" },
  ];

  for (const area of AREAS) {
    await clickRetry(page, page.locator(area.nav).first());
    await page.waitForSelector(area.wrapper, { timeout: 8000 });
    await page.waitForTimeout(600);

    const first = await page.evaluate(inspectBubble);
    console.log(`TOUR[${area.key}] step0:`, JSON.stringify(first));
    if (!first.present) problems.push(`(B) ${area.key}: Tour erscheint NICHT beim ersten Besuch`);
    else {
      if (!first.headImgLoaded) problems.push(`(B) ${area.key}: Brenna-Kopfbild nicht geladen`);
      if (first.speakerName !== "Brenna Ashwick") problems.push(`(B) ${area.key}: Sprecher-Name "${first.speakerName}" ≠ "Brenna Ashwick"`);
      if (!first.hasSkip) problems.push(`(B) ${area.key}: kein Skip-Button sichtbar`);
      if ((first.bubbleOverflowX ?? 0) > 1) problems.push(`(B) ${area.key}: Text horizontal abgeschnitten (${first.bubbleOverflowX}px)`);
    }
    await page.screenshot({ path: join(OUT_DIR, `tour-${area.key}-step0-1920.png`), fullPage: false });
    console.log(`SHOT SAVED: tour-${area.key}-step0-1920.png`);

    // 1366×768 desselben ersten Schritts (frisches Reload, damit der Schritt wieder bei 0 steht).
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.waitForTimeout(400);
    const firstSmall = await page.evaluate(inspectBubble);
    if (firstSmall.present && firstSmall.bubbleRect) {
      const r = firstSmall.bubbleRect;
      if (r.left < 0 || r.top < 0 || r.right > firstSmall.viewport.w || r.bottom > firstSmall.viewport.h) {
        problems.push(`(B) ${area.key}@1366: Tour-Blase ragt aus dem Viewport (${JSON.stringify(r)} vs ${JSON.stringify(firstSmall.viewport)})`);
      }
      if ((firstSmall.bubbleOverflowX ?? 0) > 1) problems.push(`(B) ${area.key}@1366: Text horizontal abgeschnitten (${firstSmall.bubbleOverflowX}px)`);
    }
    await page.screenshot({ path: join(OUT_DIR, `tour-${area.key}-step0-1366.png`), fullPage: false });
    console.log(`SHOT SAVED: tour-${area.key}-step0-1366.png`);
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(300);

    if (area.mode === "click-through") {
      const titles = await clickThroughToEnd(page);
      console.log(`TOUR[${area.key}] Schritte durchgeklickt:`, JSON.stringify(titles));
      if (titles.includes("NO-CONTINUE-BTN")) problems.push(`(B) ${area.key}: ein Schritt hatte weder Weiter-Button noch Ziel-Klickzwang (Sackgasse)`);
      const stillThere = (await page.locator(".onboarding-guide-root").count()) > 0;
      if (stillThere) problems.push(`(B) ${area.key}: Tour endet nicht nach Durchklicken (max 8 Schritte erreicht)`);
    } else {
      await clickRetry(page, page.locator(".guide-bubble-skip").first());
      await page.waitForTimeout(400);
      const stillThere = (await page.locator(".onboarding-guide-root").count()) > 0;
      if (stillThere) problems.push(`(B) ${area.key}: Tour verschwindet nicht sofort nach Skip`);
      else console.log(`TOUR[${area.key}] Skip beendet sofort: OK`);
    }

    // Erneuter Besuch derselben Seite (über eine Nachbarseite, damit die Page wirklich remountet) →
    // KEINE Tour mehr.
    await clickRetry(page, page.locator('[data-guide-id="topbar.character"]').first());
    await page.waitForTimeout(300);
    await clickRetry(page, page.locator(area.nav).first());
    await page.waitForSelector(area.wrapper, { timeout: 8000 });
    await page.waitForTimeout(500);
    const revisit = (await page.locator(".onboarding-guide-root").count()) > 0;
    if (revisit) problems.push(`(B) ${area.key}: Tour erscheint bei ERNEUTEM Besuch wieder (toursSeen nicht persistiert?)`);
    else console.log(`TOUR[${area.key}] erneuter Besuch: keine Tour mehr — OK`);
  }

  console.log(problems.length ? "PROBLEME:\n- " + problems.join("\n- ") : "ALLE CHECKS GRÜN");
  console.log(errors.length ? `${errors.length} page errors:\n` + errors.slice(0, 12).join("\n") : "no page errors");

  await browser.close();
  if (problems.length || errors.length) process.exitCode = 1;
} finally {
  child.kill();
}
