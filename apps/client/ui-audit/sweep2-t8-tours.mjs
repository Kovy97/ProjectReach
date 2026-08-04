#!/usr/bin/env node
/**
 * Tester-Sweep 2, T8 — Teil 3 (Nachzuegler): Bereichs-Erst-Touren (Kampf/Shop/Bank) in ZH/RU/PT-BR.
 * Der Content-Sweep (Teil 2) scheiterte hier an einem Sequencing-Problem (Shop-Tour poppte auf der
 * aktuellen Seite auf und blockte die Navigation) — dieser Lauf nutzt das saubere Muster aus
 * onboarding-brenna-tours-check.mjs: Fixture-Route-Patch (Haupt-Guide done, toursSeen leer),
 * dann Seite fuer Seite besuchen. Port 5257.
 */
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const CLIENT_DIR = "G:\\GameDev\\apps\\client";
const PORT = 5257;
const BASE_URL = `http://localhost:${PORT}`;
const OUT_DIR = "C:\\Users\\MSchu\\AppData\\Local\\Temp\\claude\\G--GameDev\\553d2095-3a73-4795-9782-0fe746a25f13\\scratchpad\\t8";
mkdirSync(OUT_DIR, { recursive: true });

const TARGET_LOCALES = ["zh", "ru", "pt-BR"];
const EXPECTED_GUIDE_NAME = { zh: "守望者", ru: "Страж", "pt-BR": "O Guardião" };

function startDevServer() {
  const viteBin = join(CLIENT_DIR, "node_modules", "vite", "bin", "vite.js");
  const child = spawn(process.execPath, [viteBin, "dev", "--config", join(CLIENT_DIR, "ui-audit", "vite.tour.config.mjs"), "--port", String(PORT), "--strictPort"], { cwd: CLIENT_DIR, stdio: ["ignore", "pipe", "pipe"] });
  let out = ""; child.stdout.on("data", d => out += d); child.stderr.on("data", d => out += d);
  return { child, getOutput: () => out };
}
async function waitForServer(url, t = 40000) {
  const s = Date.now();
  while (Date.now() - s < t) { try { const r = await fetch(url); if (r.ok) return true; } catch {} await new Promise(r => setTimeout(r, 300)); }
  return false;
}
async function clickRetry(page, locator, opts = {}) {
  try { await locator.click({ timeout: 7000, ...opts }); }
  catch { await page.waitForTimeout(400); await locator.click({ timeout: 7000, ...opts }); }
}

function inspectBubble() {
  const root = document.querySelector(".onboarding-guide-root");
  if (!root) return { present: false };
  const bubble = root.querySelector(".guide-bubble");
  const npcBubble = root.querySelector(".guide-bubble-speaker .npc-bubble");
  const br = bubble ? bubble.getBoundingClientRect() : null;
  return {
    present: true,
    speakerName: root.querySelector(".guide-bubble-speaker .npc-bubble-name")?.textContent.trim() ?? "",
    title: root.querySelector(".guide-bubble-title")?.textContent.trim() ?? "",
    body: root.querySelector(".guide-bubble-body")?.textContent.trim() ?? "",
    skipLabel: root.querySelector(".guide-bubble-skip")?.textContent.trim() ?? "",
    continueLabel: root.querySelector(".guide-bubble-footer button.combat-btn")?.textContent.trim() ?? "",
    overflowX: npcBubble ? npcBubble.scrollWidth - npcBubble.clientWidth : null,
    bubbleRect: br ? { l: Math.round(br.left), t: Math.round(br.top), r: Math.round(br.right), b: Math.round(br.bottom) } : null,
    viewport: { w: window.innerWidth, h: window.innerHeight },
  };
}

const problems = [];
const errors = [];

const { child, getOutput } = startDevServer();
try {
  const ok = await waitForServer(BASE_URL);
  if (!ok) { console.error("SERVER NOT UP:\n" + getOutput()); process.exit(1); }
  const browser = await chromium.launch();

  for (const locale of TARGET_LOCALES) {
    console.log(`\n===== LOCALE: ${locale} =====`);
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
    page.on("pageerror", (e) => errors.push(`[${locale}] pageerror: ${e.message}`));
    page.on("console", (m) => { if (m.type() === "error") errors.push(`[${locale}] console: ${m.text()}`); });
    try {
      await page.addInitScript((l) => { try { localStorage.setItem("hearthforge:locale", l); } catch {} }, locale);
      await page.route("**/ui-audit-fixtures/midgame.json", async (route) => {
        const res = await route.fetch();
        const json = JSON.parse(await res.text());
        json.state.onboarding = { active: false, step: 0, done: true, toursSeen: {} };
        await route.fulfill({ contentType: "application/json", body: JSON.stringify(json) });
      });
      await page.goto(`${BASE_URL}/?fixture=midgame`, { waitUntil: "load" });
      await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
      await page.waitForTimeout(2500);

      const AREAS = [
        { key: "combat", nav: '[data-guide-id="sidebar.combat"]', wrapper: ".combat-page" },
        { key: "shop", nav: '[data-guide-id="topbar.shop"]', wrapper: ".shopv2-page" },
        { key: "bank", nav: '[data-guide-id="topbar.bank"]', wrapper: ".bank-page" },
      ];
      for (const area of AREAS) {
        await clickRetry(page, page.locator(area.nav).first());
        await page.waitForSelector(area.wrapper, { timeout: 8000 });
        await page.waitForTimeout(700);
        const t = await page.evaluate(inspectBubble);
        console.log(`(4) [${locale}] Tour[${area.key}]: ${JSON.stringify(t)}`);
        if (!t.present) problems.push(`(4) [${locale}] Bereichs-Tour[${area.key}] erscheint nicht beim ersten Besuch`);
        else {
          if (t.speakerName !== EXPECTED_GUIDE_NAME[locale]) problems.push(`(4) [${locale}] Tour[${area.key}] Sprecher "${t.speakerName}" != erwartet "${EXPECTED_GUIDE_NAME[locale]}"`);
          if (!t.title || !t.body) problems.push(`(4) [${locale}] Tour[${area.key}] Titel/Text leer`);
          if (!t.skipLabel || !t.continueLabel) problems.push(`(4) [${locale}] Tour[${area.key}] Button-Label leer (skip="${t.skipLabel}", weiter="${t.continueLabel}")`);
          if (/undefined|\bonboarding\.\w+|\btour\.\w+/.test(t.title + " " + t.body + " " + t.skipLabel + " " + t.continueLabel)) {
            problems.push(`(4) [${locale}] Tour[${area.key}] roher Key/undefined in Texten`);
          }
          if ((t.overflowX ?? 0) > 1) problems.push(`(4) [${locale}] Tour[${area.key}] Blasen-Text abgeschnitten (${t.overflowX}px)`);
        }
        await page.screenshot({ path: join(OUT_DIR, `${locale}-tour-${area.key}-1920.png`) });
        // 1366-Check desselben Schritts.
        await page.setViewportSize({ width: 1366, height: 768 });
        await page.waitForTimeout(400);
        const tSmall = await page.evaluate(inspectBubble);
        if (tSmall.present && tSmall.bubbleRect) {
          const r = tSmall.bubbleRect;
          if (r.l < 0 || r.t < 0 || r.r > tSmall.viewport.w || r.b > tSmall.viewport.h) {
            problems.push(`(4) [${locale}] Tour[${area.key}]@1366 Blase ragt aus Viewport (${JSON.stringify(r)})`);
          }
          if ((tSmall.overflowX ?? 0) > 1) problems.push(`(4) [${locale}] Tour[${area.key}]@1366 Text abgeschnitten (${tSmall.overflowX}px)`);
        }
        await page.screenshot({ path: join(OUT_DIR, `${locale}-tour-${area.key}-1366.png`) });
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.waitForTimeout(300);
        console.log(`SHOT: ${locale}-tour-${area.key}-1920/1366.png`);
        // Skip beendet die Tour, toursSeen[key] wird gesetzt -> naechste Area ungestoert.
        await clickRetry(page, page.locator(".guide-bubble-skip").first());
        await page.waitForTimeout(500);
      }
    } catch (e) {
      console.error(`LOCALE ${locale} FAILED: ${e.message}`);
      problems.push(`[${locale}] Skript-Fehler: ${e.message}`);
    }
    await page.close();
  }

  await browser.close();
  console.log(problems.length ? "\nPROBLEME:\n- " + problems.join("\n- ") : "\nALLE CHECKS GRUEN");
  console.log(errors.length ? `${errors.length} page errors:\n` + errors.slice(0, 15).join("\n") : "no page errors");
  if (problems.length || errors.length) process.exitCode = 1;
} finally {
  child.kill();
}
