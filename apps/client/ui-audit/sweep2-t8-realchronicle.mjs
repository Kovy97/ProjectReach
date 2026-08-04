#!/usr/bin/env node
/**
 * Tester-Sweep 2, T8 — Teil 4: REALER Chronik-Content (kein synthetischer Patch) in ZH/RU/PT-BR.
 * Prueft am echten chronicle_01..21-Content: Story-Tab (Titel/Lore/Ziele/Chips lokalisiert,
 * ZH-Umbruch, RU-Laengen), CombatPage Gate-Hinweise mit ECHTEN Kapitelnamen, 1920+1366.
 * Port 5257.
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
// CJK/Kyrillisch-Erkennung: englische Reste in nicht-lateinischen Sprachen aufspueren.
const LATIN_WORD = /[A-Za-z]{3,}/;

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

const problems = [];
const errors = [];

const { child, getOutput } = startDevServer();
try {
  const ok = await waitForServer(BASE_URL);
  if (!ok) { console.error("SERVER NOT UP:\n" + getOutput()); process.exit(1); }
  const browser = await chromium.launch();

  for (const locale of TARGET_LOCALES) {
    console.log(`\n===== LOCALE: ${locale} (REAL CONTENT) =====`);
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
    page.on("pageerror", (e) => errors.push(`[${locale}] pageerror: ${e.message}`));
    page.on("console", (m) => { if (m.type() === "error") errors.push(`[${locale}] console: ${m.text()}`); });
    try {
      await page.addInitScript((l) => { try { localStorage.setItem("hearthforge:locale", l); } catch {} }, locale);
      await page.route("**/ui-audit-fixtures/midgame.json", async (route) => {
        const res = await route.fetch();
        const json = JSON.parse(await res.text());
        json.state.onboarding = { active: false, step: 0, done: true, toursSeen: { combat: true, shop: true, bank: true } };
        await route.fulfill({ contentType: "application/json", body: JSON.stringify(json) });
      });
      await page.goto(`${BASE_URL}/?fixture=midgame`, { waitUntil: "load" });
      await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
      await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
      await page.waitForTimeout(2500);

      // ── Story-Tab mit echtem aktivem Kapitel ──
      await clickRetry(page, page.locator('[data-guide-id="topbar.quests"]').first());
      await page.waitForSelector(".quests-page", { timeout: 8000 });
      await page.waitForTimeout(500);
      await clickRetry(page, page.locator(".quests-tab-btn").nth(0));
      await page.waitForTimeout(500);
      const info = await page.evaluate(() => {
        const s = document.querySelector(".chronicle-stage");
        if (!s) return { present: false };
        const objs = [...s.querySelectorAll(".chronicle-obj")].map(o => ({
          what: o.querySelector(".chronicle-obj-what")?.textContent.trim() ?? o.textContent.trim().slice(0, 80),
          where: o.querySelector(".chronicle-obj-where")?.textContent.trim() ?? null,
          count: o.querySelector(".chronicle-obj-count")?.textContent.trim() ?? null,
        }));
        return {
          present: true,
          counter: document.querySelector(".chronicle-tab-counter")?.textContent.trim() ?? null,
          chapNum: s.querySelector(".chronicle-stage-chapnum")?.textContent.trim() ?? null,
          title: s.querySelector(".chronicle-stage-title")?.textContent.trim() ?? null,
          lore: s.querySelector(".npc-bubble-text")?.textContent.trim() ?? null,
          objs,
          unlockChips: [...s.querySelectorAll(".quest-reward-chip--unlock")].map(c => c.textContent.trim()),
          overflowX: s.scrollWidth - s.clientWidth,
        };
      });
      console.log(`[${locale}] REAL Story-Stage: ${JSON.stringify(info)}`);
      if (!info.present) { problems.push(`[${locale}] REAL: keine aktive Chronik-Stage (Content fehlt?)`); }
      else {
        if (info.overflowX > 1) problems.push(`[${locale}] REAL Story-Stage Overflow 1920: ${info.overflowX}px`);
        if (locale !== "pt-BR") {
          // ZH/RU: Titel+Lore sollten praktisch keine langen lateinischen Woerter enthalten.
          if (info.title && LATIN_WORD.test(info.title)) problems.push(`[${locale}] REAL Kapitel-Titel enthaelt lateinische Woerter (EN-Rest?): "${info.title}"`);
          if (info.lore && LATIN_WORD.test(info.lore)) problems.push(`[${locale}] REAL loreText enthaelt lateinische Woerter (EN-Rest?): "${(info.lore||"").slice(0,120)}..."`);
          for (const o of info.objs) {
            if (o.where && LATIN_WORD.test(o.where)) problems.push(`[${locale}] REAL Ziel-WHERE mit EN-Rest: "${o.where}"`);
          }
          for (const c of info.unlockChips) {
            if (LATIN_WORD.test(c)) problems.push(`[${locale}] REAL Unlock-Chip mit EN-Rest: "${c}"`);
          }
        }
      }
      await page.screenshot({ path: join(OUT_DIR, `${locale}-REAL-story-1920.png`) });
      await page.setViewportSize({ width: 1366, height: 768 });
      await page.waitForTimeout(300);
      const of1366 = await page.evaluate(() => { const el = document.querySelector(".chronicle-stage"); return el ? el.scrollWidth - el.clientWidth : 0; });
      if (of1366 > 1) problems.push(`[${locale}] REAL Story-Stage Overflow 1366: ${of1366}px`);
      await page.screenshot({ path: join(OUT_DIR, `${locale}-REAL-story-1366.png`) });
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.waitForTimeout(200);
      console.log(`SHOT: ${locale}-REAL-story-1920/1366.png`);

      // ── CombatPage: echte gesperrte Zonen-/Dungeon-Karten mit echten Kapitelnamen ──
      await clickRetry(page, page.locator('[data-guide-id="sidebar.combat"]').first());
      await page.waitForSelector(".combat-page", { timeout: 8000 });
      await page.waitForTimeout(500);
      const gates = await page.evaluate(() => {
        return [...document.querySelectorAll(".zone-card-locked-hint")].map(h => ({
          text: h.textContent.trim(),
          cardName: h.closest(".zone-card")?.querySelector(".zone-card-name")?.textContent.trim() ?? null,
        }));
      });
      console.log(`[${locale}] REAL Gate-Hinweise (${gates.length}): ${JSON.stringify(gates.slice(0, 6))}`);
      if (gates.length === 0) console.log(`[${locale}] (kein gesperrtes Gebiet sichtbar — Fixture evtl. weit fortgeschritten)`);
      for (const g of gates) {
        if (locale !== "pt-BR" && LATIN_WORD.test(g.text)) problems.push(`[${locale}] REAL Gate-Hinweis mit EN-Rest: "${g.text}" (Karte: ${g.cardName})`);
        if (/undefined/.test(g.text)) problems.push(`[${locale}] REAL Gate-Hinweis mit undefined: "${g.text}"`);
      }
      await page.screenshot({ path: join(OUT_DIR, `${locale}-REAL-zones-1920.png`) });
      await page.setViewportSize({ width: 1366, height: 768 });
      await page.waitForTimeout(300);
      await page.screenshot({ path: join(OUT_DIR, `${locale}-REAL-zones-1366.png`) });
      await page.setViewportSize({ width: 1920, height: 1080 });
      console.log(`SHOT: ${locale}-REAL-zones-1920/1366.png`);
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
