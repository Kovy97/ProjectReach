#!/usr/bin/env node
/**
 * Tester-Sweep 2, T8 "Der internationale Spieler" — Teil 2: Content-Sweep ZH/RU/PT-BR ueber
 * Story-Tab, Zonen-/Dungeon-Gates, Onboarding+Touren, NpcGreetings, Bestiarium, Quests-Tabs,
 * Shop-Rueckkauf, Hauptmenue-Chrome. Muster: story-tab-check.mjs / dungeon-gate-check.mjs /
 * onboarding-brenna-tours-check.mjs / npc-greeting-check.mjs (alle ceo-run-2026-07-13).
 * Port 5257. Read-only: kein Produktcode-Edit.
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
const RAW_KEY_RE = /\b[a-zA-Z]\w*\.[a-zA-Z]\w*\.[a-zA-Z][\w.]*\b/g;
function findRawKeys(text) { return [...new Set((text.match(RAW_KEY_RE) || []))]; }
function hasTofu(text) { return text.includes("�") || /□□/.test(text); }

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
  catch { await page.waitForTimeout(400); await locator.click({ timeout: 7000, ...opts }).catch(() => locator.click({ timeout: 7000, force: true, ...opts })); }
}

// Deterministisches Test-Kapitel je Locale mit ABSICHTLICH unterschiedlichen ZH/RU/PT-BR-Texten,
// um zu pruefen, ob resolveText() wirklich die AKTIVE Locale zieht (statt still auf en zu fallen).
const CHAPTER_NAME = { en: "Chronicle Test Chapter", de: "Chronik-Testkapitel", zh: "编年史测试章节", ru: "Тестовая глава хроники", "pt-BR": "Capítulo de Teste da Crônica" };
const CHAPTER_LORE = {
  en: "A short lore passage for layout testing purposes only, nothing narrative here.",
  de: "Ein kurzer Lore-Text nur fuer Layout-Tests, nichts Erzaehlerisches hier.",
  // Lang genug fuer RU-Laengen-Check + genug Satzzeichen/Umbruch-Gelegenheit fuer ZH.
  zh: "这是一段用于版式测试的编年史文字，包含足够多的标点符号、逗号和句号，用来检查中文自动换行是否正常工作，不应该出现文字溢出或被裁切的情况，这段话本身没有任何叙事意义。",
  ru: "Это тестовый фрагмент хроники, написанный специально длинными русскими словами и составными предложениями, чтобы проверить перенос строк и убедиться, что текст не обрезается и не выходит за пределы рамки повествовательного окна интерфейса.",
  "pt-BR": "Este é um trecho de teste da crônica, escrito propositalmente com frases longas em português para verificar a quebra de linha e garantir que o texto não seja cortado nem ultrapasse os limites da caixa de diálogo.",
};

const problems = [];
const errors = [];
function wirePage(page, tag) {
  page.on("pageerror", (e) => errors.push(`[${tag}] pageerror: ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error") errors.push(`[${tag}] console: ${m.text()}`); });
}

async function routeFixture(page, opts = {}) {
  await page.route("**/ui-audit-fixtures/midgame.json", async (route) => {
    const res = await route.fetch();
    const json = JSON.parse(await res.text());
    json.state.onboarding = { active: false, step: 0, done: true, toursSeen: opts.toursSeen ?? { combat: true, shop: true, bank: true } };
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(json) });
  });
}

async function goTo(page, navSel, wrapperSel) {
  await clickRetry(page, page.locator(navSel).first());
  await page.waitForSelector(wrapperSel, { timeout: 8000 });
  await page.waitForTimeout(400);
}

const { child, getOutput } = startDevServer();
try {
  const ok = await waitForServer(BASE_URL);
  if (!ok) { console.error("SERVER NOT UP:\n" + getOutput()); process.exit(1); }
  const browser = await chromium.launch();

  for (const locale of TARGET_LOCALES) {
    console.log(`\n===== LOCALE: ${locale} =====`);
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
    wirePage(page, locale);
    try {
      await page.addInitScript((l) => { try { localStorage.setItem("hearthforge:locale", l); } catch {} }, locale);
      await routeFixture(page, { toursSeen: { combat: true, shop: true, bank: true } });
      await page.goto(`${BASE_URL}/?fixture=midgame`, { waitUntil: "load" });
      await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
      await page.waitForFunction(() => !!window.__hfDebug, null, { timeout: 8000 });
      await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
      await page.waitForTimeout(2000);

      // ── Content neutralisieren + Test-Content injizieren (Muster story-tab-check.mjs / dungeon-gate-check.mjs) ──
      let stable = false;
      for (let attempt = 0; attempt < 6; attempt++) {
        await page.evaluate(() => {
          const { content } = window.__hfDebug;
          content.quests = content.quests.filter((q) => !q.id.startsWith("chronicle_"));
          for (const z of content.zones) delete z.requiresQuest;
          for (const d of content.dungeons) delete d.requiresQuest;
        });
        await page.waitForTimeout(500);
        stable = await page.evaluate(() => {
          const { content } = window.__hfDebug;
          return !content.quests.some((q) => q.id.startsWith("chronicle_")) && content.dungeons.every((d) => !d.requiresQuest);
        });
        if (stable) break;
      }
      if (!stable) problems.push(`[${locale}] Content-Neutralisierung nicht stabil (Race mit Fixture-Load)`);

      await page.evaluate(({ name, lore }) => {
        const { content, state } = window.__hfDebug;
        content.quests.push({
          id: "chronicle_t8",
          name,
          description: name,
          loreText: lore,
          objectives: [{ type: "kill_monster", target: "chicken", count: 3 }],
          rewards: { gold: 5 },
        });
        const pastures = content.zones.find((z) => z.id === "pastures");
        if (pastures) pastures.requiresQuest = "chronicle_t8";
        content.dungeons.push({
          id: "test_dungeon_t8", name, zone: "test_zone_open_t8", requiredLevel: 1,
          requiresQuest: "chronicle_t8", encounters: ["chicken"], loot: [], xp: 0, gold: 0,
        });
        state.legacyZoneGrants["pastures"] = false;
        state.monsterKills["chicken"] = 0;
        state.quests.completed = state.quests.completed.filter((id) => id !== "chronicle_t8");
        state.quests.claimed = state.quests.claimed.filter((id) => id !== "chronicle_t8");
        if (!state.paragon) state.paragon = { best: 0, checkpoint: 0 }; else state.paragon.best = 0;
      }, { name: CHAPTER_NAME, lore: CHAPTER_LORE });
      await page.waitForTimeout(500);

      // ── (2) Story-Tab: Tab-Name, Titel, loreText, Ziel-Zeile, Chips, Claim, Historie, Epilog ──
      await goTo(page, '[data-guide-id="topbar.quests"]', ".quests-page");
      const tabLabels = await page.evaluate(() => [...document.querySelectorAll(".quests-tab-btn")].map(b => b.textContent.trim()));
      console.log(`[${locale}] Quest-Tab-Labels: ${JSON.stringify(tabLabels)}`);
      if (tabLabels.some(t => /undefined|\bquests\.\w+/.test(t))) problems.push(`(6) [${locale}] Quest-Tab-Label kaputt: ${JSON.stringify(tabLabels)}`);

      // Tab-Reihenfolge im Code (QuestsPage.tsx ~L938): chronicle("Story") ist IMMER der erste Button,
      // unabhaengig von der Locale (idx0) — Text-Matching waere locale-abhaengig und daher fragil.
      await clickRetry(page, page.locator(".quests-tab-btn").nth(0));
      await page.waitForTimeout(400);
      // Sicherstellen, dass wir wirklich auf dem Chronik-Tab sind (aktives Kapitel vorhanden -> autoTab).
      let stage = await page.evaluate(() => !!document.querySelector(".chronicle-stage"));
      if (!stage) {
        // Fallback: Tab explizit per Text-Unabhaengigkeit ueber Klassenindex probieren (2. Button).
        await clickRetry(page, page.locator(".quests-tab-btn").nth(1));
        await page.waitForTimeout(400);
        stage = await page.evaluate(() => !!document.querySelector(".chronicle-stage"));
      }
      const stageInfo = await page.evaluate(() => {
        const s = document.querySelector(".chronicle-stage");
        if (!s) return { present: false };
        const obj = s.querySelector(".chronicle-obj");
        return {
          present: true,
          counter: document.querySelector(".chronicle-tab-counter")?.textContent.trim() ?? null,
          title: s.querySelector(".chronicle-stage-title")?.textContent.trim() ?? null,
          loreBubble: s.querySelector(".npc-bubble-text")?.textContent.trim() ?? null,
          objWhere: obj?.querySelector(".chronicle-obj-where")?.textContent.trim() ?? null,
          objCount: obj?.querySelector(".chronicle-obj-count")?.textContent.trim() ?? null,
          unlocksLabel: s.querySelector(".quest-rewards-label")?.textContent.trim() ?? null,
          dungeonChipText: s.querySelector(".quest-reward-chip--unlock-dungeon")?.textContent.trim() ?? null,
          dungeonBadge: s.querySelector(".quest-reward-chip--unlock-dungeon .quest-reward-chip-kind")?.textContent.trim() ?? null,
          claimBtnPresent: !!s.querySelector(".chronicle-stage-claim"),
          overflowX: s.scrollWidth - s.clientWidth,
        };
      });
      console.log(`(2) [${locale}] Story-Stage: ${JSON.stringify(stageInfo)}`);
      if (!stageInfo.present) problems.push(`(2) [${locale}] Chronicle-Stage nicht sichtbar nach Story-Tab-Klick`);
      else {
        if (stageInfo.title !== CHAPTER_NAME[locale]) problems.push(`(2) [${locale}] Kapitel-Titel nicht in aktiver Locale: "${stageInfo.title}" (erwartet "${CHAPTER_NAME[locale]}")`);
        if (stageInfo.loreBubble !== CHAPTER_LORE[locale]) problems.push(`(2) [${locale}] loreText-Blase nicht in aktiver Locale oder abweichend: "${stageInfo.loreBubble}"`);
        if (stageInfo.overflowX > 1) problems.push(`(2) [${locale}] Story-Stage horizontaler Overflow bei 1920: ${stageInfo.overflowX}px`);
        if (!stageInfo.dungeonChipText?.includes(CHAPTER_NAME[locale])) problems.push(`(2)+(3) [${locale}] Dungeon-Unlock-Chip zeigt nicht den lokalisierten Namen: "${stageInfo.dungeonChipText}"`);
      }
      await page.screenshot({ path: join(OUT_DIR, `${locale}-story-1920.png`) });
      await page.setViewportSize({ width: 1366, height: 768 });
      await page.waitForTimeout(300);
      const overflow1366 = await page.evaluate(() => { const el = document.querySelector(".chronicle-stage"); return el ? el.scrollWidth - el.clientWidth : 0; });
      if (overflow1366 > 1) problems.push(`(2) [${locale}] Story-Stage horizontaler Overflow bei 1366: ${overflow1366}px`);
      await page.screenshot({ path: join(OUT_DIR, `${locale}-story-1366.png`) });
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.waitForTimeout(200);
      console.log(`SHOT: ${locale}-story-1920/1366.png`);

      // ── (3) Zonen-/Dungeon-Gate-Hinweis auf CombatPage — MUSS vor dem Claim laufen, sonst
      // entsperrt der Claim die Gate-Zone/den Gate-Dungeon und die "locked"-Karte verschwindet. ──
      await goTo(page, '[data-guide-id="sidebar.combat"]', ".combat-page");
      const gateInfo = await page.evaluate((chapterName) => {
        const cards = [...document.querySelectorAll(".zone-card")];
        const pasturesCard = cards.find(c => c.classList.contains("zone-card-story-locked") && c.querySelector(".zone-card-locked-hint"));
        return pasturesCard ? {
          found: true,
          locked: pasturesCard.classList.contains("zone-card-story-locked"),
          hintText: pasturesCard.querySelector(".zone-card-locked-hint")?.textContent.trim() ?? null,
          containsChapterName: pasturesCard.querySelector(".zone-card-locked-hint")?.textContent.includes(chapterName) ?? false,
        } : { found: false };
      }, CHAPTER_NAME[locale]);
      console.log(`(3) [${locale}] Zonen-Gate-Hinweis: ${JSON.stringify(gateInfo)}`);
      if (!gateInfo.found) problems.push(`(3) [${locale}] Kein gesperrtes Zonen-Karte mit Hinweistext gefunden`);
      else if (!gateInfo.containsChapterName) problems.push(`(3) [${locale}] Zonen-Gate-Hinweis enthaelt nicht den lokalisierten Kapitelnamen: "${gateInfo.hintText}"`);
      await page.screenshot({ path: join(OUT_DIR, `${locale}-zonegate-1920.png`) });
      await page.setViewportSize({ width: 1366, height: 768 });
      await page.waitForTimeout(300);
      await page.screenshot({ path: join(OUT_DIR, `${locale}-zonegate-1366.png`) });
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.waitForTimeout(200);
      console.log(`SHOT: ${locale}-zonegate-1920/1366.png`);

      // Zurueck zum Story-Tab fuer den Claim (Combat-Seitenbesuch hat die Quests-Seite verlassen).
      await goTo(page, '[data-guide-id="topbar.quests"]', ".quests-page");
      await clickRetry(page, page.locator(".quests-tab-btn").nth(0));
      await page.waitForTimeout(400);

      // Claim -> kein aktives Kapitel mehr -> Epilog-Text (chronicle.allClaimed)
      await page.evaluate(() => { window.__hfDebug.state.monsterKills["chicken"] = 3; });
      await page.waitForTimeout(500);
      await clickRetry(page, page.locator(".chronicle-stage-claim").first());
      await page.waitForTimeout(500);
      const epilogue = await page.evaluate(() => document.querySelector(".chronicle-stage-complete p")?.textContent.trim() ?? null);
      console.log(`(2) [${locale}] Epilog-Text: "${epilogue}"`);
      if (!epilogue) problems.push(`(2) [${locale}] Kein Epilog-Text nach Claim des einzigen Test-Kapitels`);
      const historyToggle = await page.evaluate(() => document.querySelector(".chronicle-history-toggle")?.textContent.trim() ?? null);
      await clickRetry(page, page.locator(".chronicle-history-toggle").first());
      await page.waitForTimeout(250);
      await clickRetry(page, page.locator(".chronicle-history-row-head").first());
      await page.waitForTimeout(200);
      const historyText = await page.evaluate(() => document.querySelector(".chronicle-history-text")?.textContent.trim() ?? null);
      console.log(`(2) [${locale}] Historie-Toggle: "${historyToggle}", aufgeklappter Text vorhanden: ${!!historyText}`);
      if (!historyToggle || !historyText) problems.push(`(2) [${locale}] Historie defekt (Toggle="${historyToggle}", Text vorhanden=${!!historyText})`);
      await page.screenshot({ path: join(OUT_DIR, `${locale}-story-epilogue.png`) });
      console.log(`SHOT: ${locale}-story-epilogue.png`);

      // ── (5) NpcGreetings: Bank/Shop/Slayer/Quests ─────────────────────────────────────────────
      const NPC_PAGES = [
        { id: "bank", nav: '[data-guide-id="topbar.bank"]', wrapper: ".bank-page" },
        { id: "shop", nav: '[data-guide-id="topbar.shop"]', wrapper: ".shopv2-page" },
        { id: "slayer", nav: '[data-guide-id="sidebar.slayer"]', wrapper: ".slayer-page" },
        { id: "quests", nav: '[data-guide-id="topbar.quests"]', wrapper: ".quests-page" },
      ];
      for (const np of NPC_PAGES) {
        await goTo(page, np.nav, np.wrapper);
        const g = await page.evaluate(() => {
          const root = document.querySelector(".npc-greeting");
          if (!root) return { present: false };
          const bubble = root.querySelector(".npc-bubble");
          return {
            present: true,
            name: root.querySelector(".npc-bubble-name")?.textContent.trim() ?? "",
            text: root.querySelector(".npc-bubble-text")?.textContent.trim() ?? "",
            overflowX: bubble ? bubble.scrollWidth - bubble.clientWidth : null,
          };
        });
        console.log(`(5) [${locale}] NpcGreeting[${np.id}]: ${JSON.stringify(g)}`);
        if (!g.present) problems.push(`(5) [${locale}] NpcGreeting fehlt auf ${np.id}`);
        else {
          if (!g.name || !g.text) problems.push(`(5) [${locale}] NpcGreeting[${np.id}] Name/Text leer`);
          if (/undefined|\bnpc\.\w+/.test(g.name + g.text)) problems.push(`(5) [${locale}] NpcGreeting[${np.id}] roher Key oder undefined: "${g.name}" / "${g.text}"`);
          if ((g.overflowX ?? 0) > 1) problems.push(`(5) [${locale}] NpcGreeting[${np.id}] Blasen-Text abgeschnitten (${g.overflowX}px)`);
        }
        await page.screenshot({ path: join(OUT_DIR, `${locale}-npc-${np.id}-1920.png`) });
      }
      console.log(`SHOT: ${locale}-npc-*-1920.png (4 Seiten)`);
      // 1366 Stichprobe: Quests-Seite (dichteste NPC-Bubble-Umgebung).
      await goTo(page, '[data-guide-id="topbar.quests"]', ".quests-page");
      await page.setViewportSize({ width: 1366, height: 768 });
      await page.waitForTimeout(300);
      const g1366 = await page.evaluate(() => {
        const bubble = document.querySelector(".npc-greeting .npc-bubble");
        return bubble ? { overflowX: bubble.scrollWidth - bubble.clientWidth, right: bubble.getBoundingClientRect().right } : null;
      });
      if (g1366 && g1366.overflowX > 1) problems.push(`(5) [${locale}] NpcGreeting[quests]@1366 Text abgeschnitten (${g1366.overflowX}px)`);
      if (g1366 && g1366.right > 1366) problems.push(`(5) [${locale}] NpcGreeting[quests]@1366 Blase ragt aus Viewport (right=${g1366.right})`);
      await page.screenshot({ path: join(OUT_DIR, `${locale}-npc-quests-1366.png`) });
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.waitForTimeout(200);
      console.log(`SHOT: ${locale}-npc-quests-1366.png`);

      // ── (6) Bestiarium dungeonOnly-Hinweis + allgemeine Bestiarium-Texte ─────────────────────
      await page.evaluate(() => {
        const { content, state } = window.__hfDebug;
        content.monsters["test_mob_t8"] = {
          id: "test_mob_t8", name: { en: "Test Dungeon Boss", de: "Test-Dungeon-Boss", zh: "测试地下城首领", ru: "Тестовый босс подземелья", "pt-BR": "Chefe de Teste da Masmorra" },
          zone: "test_zone_open_t8", dungeonOnly: true, level: 1, maxHp: 10, damage: 1, accuracy: 0.5, evasion: 0, defense: 0, attackIntervalMs: 2000, xp: 0, gold: 0, loot: [],
        };
        const d = content.dungeons.find((dd) => dd.id === "test_dungeon_t8");
        if (d) d.encounters = ["test_mob_t8"];
        state.monsterKills["test_mob_t8"] = 1;
        state.quests.completed = state.quests.completed.filter((id) => id !== "chronicle_t8");
      });
      await page.waitForTimeout(500);
      await goTo(page, '[data-guide-id="topbar.bestiary"]', ".bestiary-page");
      const bestInfo = await page.evaluate(() => {
        const card = [...document.querySelectorAll(".bestiary-card")].find(c => c.textContent.includes("Chefe de Teste") || c.textContent.includes("测试地下城首领") || c.textContent.includes("Тестовый босс"));
        if (!card) return { found: false };
        const btn = card.querySelector(".bestiary-fight-btn");
        return { found: true, title: btn?.getAttribute("title") ?? null, disabled: btn?.disabled ?? null };
      });
      console.log(`(6) [${locale}] Bestiary dungeonOnly-Hinweis: ${JSON.stringify(bestInfo)}`);
      if (!bestInfo.found) problems.push(`(6) [${locale}] Test-dungeonOnly-Monster nicht im Bestiarium gefunden (Monstername evtl. nicht lokalisiert gerendert)`);
      else if (!bestInfo.title || /undefined|\bcombat\.\w+|\bbestiary\.\w+/.test(bestInfo.title)) problems.push(`(6) [${locale}] Bestiarium-Hinweistext kaputt/roher Key: "${bestInfo.title}"`);
      await page.screenshot({ path: join(OUT_DIR, `${locale}-bestiary-1920.png`) });
      console.log(`SHOT: ${locale}-bestiary-1920.png`);

      // ── (6) Shop-Rueckkauf ("Buy-Back", Unterabschnitt im Sell-Tab, ShopPage.tsx ~L468) ───────
      await goTo(page, '[data-guide-id="topbar.shop"]', ".shopv2-page");
      await clickRetry(page, page.locator(".shopv2-maintab").nth(1)); // Sell-Tab (Buy ist idx0)
      await page.waitForTimeout(400);
      const buyBackInfo = await page.evaluate(() => {
        const heads = [...document.querySelectorAll(".shopv2-body h2, .shopv2-body .section-head, .shopv2-body [class*='section']")];
        const bodyText = document.querySelector(".shopv2-body")?.textContent ?? "";
        return {
          bodyTextSnippet: bodyText.slice(0, 400),
          hasUndefined: /undefined/.test(bodyText),
          hasRawKey: /\bshop\.\w+/.test(bodyText),
        };
      });
      console.log(`(6) [${locale}] Shop Sell-Tab (Buy-Back Bereich) Snapshot: ${JSON.stringify(buyBackInfo)}`);
      if (buyBackInfo.hasUndefined) problems.push(`(6) [${locale}] Shop Sell/Buy-Back-Bereich zeigt "undefined"`);
      if (buyBackInfo.hasRawKey) problems.push(`(6) [${locale}] Shop Sell/Buy-Back-Bereich zeigt rohen i18n-Key`);
      await page.screenshot({ path: join(OUT_DIR, `${locale}-shop-sell-1920.png`) });
      console.log(`SHOT: ${locale}-shop-sell-1920.png`);

      // ── (4) Onboarding Haupt-Guide + 3 Bereichs-Touren (direkte State-Injektion statt Klick) ──
      await page.evaluate(() => { window.__hfDebug.state.onboarding = { active: true, step: 0, done: false, toursSeen: {} }; });
      await page.waitForTimeout(600);
      const guideInfo = await page.evaluate(() => {
        const root = document.querySelector(".onboarding-guide-root");
        if (!root) return { present: false };
        const bubble = root.querySelector(".npc-bubble");
        return {
          present: true,
          speakerName: root.querySelector(".guide-bubble-speaker .npc-bubble-name")?.textContent.trim() ?? "",
          title: root.querySelector(".guide-bubble-title")?.textContent.trim() ?? "",
          body: root.querySelector(".guide-bubble-body")?.textContent.trim() ?? "",
          skipLabel: root.querySelector(".guide-bubble-skip")?.textContent.trim() ?? "",
          continueLabel: root.querySelector(".guide-bubble-footer button.combat-btn")?.textContent.trim() ?? "",
          overflowX: bubble ? bubble.scrollWidth - bubble.clientWidth : null,
        };
      });
      console.log(`(4) [${locale}] Haupt-Guide: ${JSON.stringify(guideInfo)}`);
      const expectedGuideName = { zh: "守望者", ru: "Страж", "pt-BR": "O Guardião" }[locale];
      if (!guideInfo.present) problems.push(`(4) [${locale}] Haupt-Guide erscheint nicht`);
      else {
        if (guideInfo.speakerName !== expectedGuideName) problems.push(`(4) [${locale}] Haupt-Guide Sprecher-Name "${guideInfo.speakerName}" != erwartet "${expectedGuideName}"`);
        if (!guideInfo.title || !guideInfo.body) problems.push(`(4) [${locale}] Haupt-Guide Titel/Text leer`);
        if (!guideInfo.skipLabel || !guideInfo.continueLabel) problems.push(`(4) [${locale}] Haupt-Guide Skip/Weiter-Button-Label leer`);
        if ((guideInfo.overflowX ?? 0) > 1) problems.push(`(4) [${locale}] Haupt-Guide Blasen-Text abgeschnitten (${guideInfo.overflowX}px)`);
      }
      await page.screenshot({ path: join(OUT_DIR, `${locale}-onboarding-main-1920.png`) });
      await page.setViewportSize({ width: 1366, height: 768 });
      await page.waitForTimeout(300);
      await page.screenshot({ path: join(OUT_DIR, `${locale}-onboarding-main-1366.png`) });
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.waitForTimeout(200);
      console.log(`SHOT: ${locale}-onboarding-main-1920/1366.png`);
      await clickRetry(page, page.locator(".guide-bubble-skip").first());
      await page.waitForTimeout(400);

      // Bereichs-Touren: Combat/Shop/Bank
      await page.evaluate(() => { window.__hfDebug.state.onboarding.toursSeen = {}; });
      await page.waitForTimeout(300);
      const AREAS = [
        { key: "combat", nav: '[data-guide-id="sidebar.combat"]', wrapper: ".combat-page" },
        { key: "shop", nav: '[data-guide-id="topbar.shop"]', wrapper: ".shopv2-page" },
        { key: "bank", nav: '[data-guide-id="topbar.bank"]', wrapper: ".bank-page" },
      ];
      for (const area of AREAS) {
        await clickRetry(page, page.locator(area.nav).first());
        await page.waitForSelector(area.wrapper, { timeout: 8000 });
        await page.waitForTimeout(600);
        const t = await page.evaluate(() => {
          const root = document.querySelector(".onboarding-guide-root");
          if (!root) return { present: false };
          const bubble = root.querySelector(".npc-bubble");
          return {
            present: true,
            speakerName: root.querySelector(".guide-bubble-speaker .npc-bubble-name")?.textContent.trim() ?? "",
            title: root.querySelector(".guide-bubble-title")?.textContent.trim() ?? "",
            body: root.querySelector(".guide-bubble-body")?.textContent.trim() ?? "",
            overflowX: bubble ? bubble.scrollWidth - bubble.clientWidth : null,
          };
        });
        console.log(`(4) [${locale}] Tour[${area.key}]: ${JSON.stringify(t)}`);
        if (!t.present) problems.push(`(4) [${locale}] Bereichs-Tour[${area.key}] erscheint nicht beim ersten Besuch`);
        else {
          if (t.speakerName !== expectedGuideName) problems.push(`(4) [${locale}] Tour[${area.key}] Sprecher-Name "${t.speakerName}" != erwartet "${expectedGuideName}"`);
          if (!t.title || !t.body) problems.push(`(4) [${locale}] Tour[${area.key}] Titel/Text leer`);
          if ((t.overflowX ?? 0) > 1) problems.push(`(4) [${locale}] Tour[${area.key}] Blasen-Text abgeschnitten (${t.overflowX}px)`);
        }
        await page.screenshot({ path: join(OUT_DIR, `${locale}-tour-${area.key}-1920.png`) });
        await clickRetry(page, page.locator(".guide-bubble-skip").first());
        await page.waitForTimeout(300);
      }
      console.log(`SHOT: ${locale}-tour-*-1920.png (3 Bereiche)`);

      // ── (7) Raw-Key / undefined / Tofu-Scan ueber alle bisher besuchten Seiten (Gesamt-Dump) ──
      const fullDump = await page.evaluate(() => document.body.innerText);
      const rawKeys = findRawKeys(fullDump);
      const tofu = hasTofu(fullDump);
      const undef = /\bundefined\b/.test(fullDump);
      console.log(`(7) [${locale}] Rest-Scan letzte Seite — rawKeys: ${JSON.stringify(rawKeys.slice(0, 10))}, tofu: ${tofu}, undefined: ${undef}`);
      if (undef) problems.push(`(7) [${locale}] "undefined" im sichtbaren Text (letzte Seite: Bereichs-Touren)`);
      if (tofu) problems.push(`(7) [${locale}] Tofu/Replacement-Char im sichtbaren Text`);

    } catch (e) {
      console.error(`LOCALE ${locale} FAILED: ${e.stack || e.message}`);
      problems.push(`[${locale}] Skript-Fehler: ${e.message}`);
    }
    await page.close();
  }

  await browser.close();
  console.log(problems.length ? "\nPROBLEME:\n- " + problems.join("\n- ") : "\nALLE CHECKS GRUEN");
  console.log(errors.length ? `${errors.length} page errors:\n` + errors.slice(0, 20).join("\n") : "no page errors");
  if (problems.length || errors.length) process.exitCode = 1;
} finally {
  child.kill();
}
