#!/usr/bin/env node
/**
 * Quest-basierte Dungeon-Freischaltung — Verifikation (ceo-run-2026-07-13 Welle L, ui-dev).
 *
 * Chef-Direktive: "Gebiet für Gebiet, Dungeon um Dungeon" — KEINE Dungeon-Keys mehr, Dungeons sind
 * jetzt quest-locked wie Zonen (Welle J liefert `isDungeonUnlocked(state, content, dungeonId)` +
 * `DungeonDef.requiresQuest`; Welle K trägt die echten Gates parallel in den Content ein). Dieser
 * Check bleibt DETERMINISTISCH gegenüber Welle K's parallelem Content-Edit: er räumt zuerst ALLE
 * `requiresQuest`-Felder von echten Dungeons (+ chronicle_*-Quests) weg und injiziert eigene,
 * isolierte Test-Dungeons/-Quests über `window.__hfDebug` (Muster: story-tab-check.mjs Welle H).
 * KEIN packages/content-Edit, reiner In-Memory-Patch auf der laufenden Playwright-Seite.
 *
 * Prüft:
 *  (a) Gesperrter Dungeon: `.zone-card-story-locked` + Schloss-Badge + "Erfordert Chronik-Kapitel:
 *      {Quest}"-Hinweis, KEIN "Betreten"-Button, Klick auf die Karte tut nichts.
 *  (b) Quest erfüllt (`state.quests.completed`) → Dungeon offen: Schloss weg, "Betreten" aktiv.
 *  (c) Story-Tab "Schaltet frei:"-Zeile zeigt einen Dungeon-Chip (`--unlock-dungeon` + "Dungeon"-
 *      Kind-Label) am richtigen Kapitel, unterscheidbar vom Zonen-Chip.
 *  (d) Paragonturm-Karte unverändert: behält ihre eigene `.dungeon-locked-hint`/`.dungeon-lock-icon`
 *      Schlüssel-Optik (Paragon bleibt eigenes Einmal-Unlock-System, s. isDungeonUnlocked-JSDoc).
 *  (e) Keine Schlüssel-Optik mehr in regulären Dungeon-Karten: kein `.dungeon-locked-hint`/
 *      `.dungeon-lock-icon` außerhalb `.paragon-card`, kein "sought"-Text.
 *  (f) Übergangsneutralität: ein Dungeon OHNE `requiresQuest` in einer offenen Zone ist offen.
 *
 * Screenshots 1920×1080 + 1366×768. Port 5249 (Task-Vorgabe).
 */
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5249;
const BASE_URL = `http://localhost:${PORT}`;
const OUT_DIR = "C:\\Users\\MSchu\\AppData\\Local\\Temp\\claude\\G--GameDev\\553d2095-3a73-4795-9782-0fe746a25f13\\scratchpad\\dungeon-gate";
mkdirSync(OUT_DIR, { recursive: true });

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

async function routeFixtureNoTours(page) {
  await page.route("**/ui-audit-fixtures/midgame.json", async (route) => {
    const res = await route.fetch();
    const json = JSON.parse(await res.text());
    json.state.onboarding = { active: false, step: 0, done: true, toursSeen: { combat: true, shop: true, bank: true } };
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(json) });
  });
}

async function goToCombat(page) {
  await clickRetry(page, page.locator('[data-guide-id="sidebar.combat"]').first());
  await page.waitForSelector(".combat-page", { timeout: 8000 });
  await page.waitForTimeout(300);
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
  await page.addInitScript(() => {
    try { localStorage.setItem("hearthforge:locale", "en"); } catch { /* noop */ }
  });
  await routeFixtureNoTours(page);

  await page.goto(`${BASE_URL}/?fixture=midgame`, { waitUntil: "load" });
  await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
  await page.waitForFunction(() => !!window.__hfDebug, null, { timeout: 8000 });
  await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(2000);

  // ── Neutralisieren: alle echten chronicle_*-Quests + Dungeon-/Zonen-requiresQuest weg, retry-
  // bis-stabil gegen die Fixture-Lade-Kette (Muster story-tab-check.mjs) — Welle K ändert parallel
  // echten Content, dieser Check darf davon nicht abhängen.
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
      return !content.quests.some((q) => q.id.startsWith("chronicle_"))
        && content.dungeons.every((d) => !d.requiresQuest);
    });
    if (stable) break;
    console.log(`Clear-Versuch ${attempt + 1} wurde überschrieben — erneuter Versuch...`);
  }
  console.log("Content neutralisiert (keine chronicle_*-Quests, keine Zonen-/Dungeon-Gates): " + stable);
  if (!stable) problems.push("Content-Neutralisierung nicht stabil geblieben (Race mit Fixture-Load?)");

  // ── Test-Content injizieren: 1 Chronik-Kapitel (chronicle_01, kill_monster chicken 1) + 3
  // Test-Dungeons (gesperrt/frei/übergangs-neutral) über eine schon-offene synthetische Zone. ──
  await page.evaluate(() => {
    const { content, state } = window.__hfDebug;
    content.quests.push({
      id: "chronicle_01",
      name: { en: "Chronicle Test One", de: "Chronik-Test Eins" },
      description: { en: "Test chapter one.", de: "Test-Kapitel eins." },
      objectives: [{ type: "kill_monster", target: "chicken", count: 1 }],
      rewards: { gold: 5 },
    });
    // "test_zone_open" existiert bewusst NICHT in content.zones — isZoneUnlocked() behandelt eine
    // unbekannte Zonen-ID als offen (defensiv, s. zones.ts JSDoc) — hält die Träger-Zone hier immer
    // offen, ohne ein zusätzliches ZoneDef pflegen zu müssen.
    content.dungeons.push({
      id: "test_dungeon_locked",
      name: { en: "Test Locked Dungeon", de: "Test Gesperrter Dungeon" },
      zone: "test_zone_open",
      requiredLevel: 1,
      requiresQuest: "chronicle_01",
      encounters: ["chicken"],
      loot: [],
      xp: 0,
      gold: 0,
    });
    content.dungeons.push({
      id: "test_dungeon_free_transition",
      name: { en: "Test Transition-Free Dungeon", de: "Test Übergangs-Dungeon" },
      zone: "test_zone_open",
      requiredLevel: 1,
      // Bewusst OHNE requiresQuest — (f) Übergangsneutralität: offene Trägerzone ⇒ Dungeon offen.
      encounters: ["chicken"],
      loot: [],
      xp: 0,
      gold: 0,
    });
    delete state.dungeonsUnlocked["test_dungeon_locked"];
    delete state.dungeonsUnlocked["test_dungeon_free_transition"];
    state.monsterKills["chicken"] = 0;
    state.quests.completed = state.quests.completed.filter((id) => id !== "chronicle_01");
    state.quests.claimed = state.quests.claimed.filter((id) => id !== "chronicle_01");
  });
  await page.waitForTimeout(400);

  // ── (a)+(e)+(f) CombatPage: gesperrte/freie Test-Dungeon-Karten + Paragon-Karte unangetastet ──
  await goToCombat(page);
  await page.waitForTimeout(300);

  const cards = await page.evaluate(() => {
    function cardInfo(id) {
      const el = [...document.querySelectorAll(".dungeon-card")].find(
        (c) => c.querySelector(".zone-card-name")?.textContent.includes(id),
      );
      if (!el) return null;
      return {
        found: true,
        storyLocked: el.classList.contains("zone-card-story-locked"),
        hasLockBadge: !!el.querySelector(".zone-card-story-lock-badge"),
        hasEnterBtn: !!el.querySelector(".dungeon-enter"),
        enterDisabled: el.querySelector(".dungeon-enter")?.disabled ?? null,
        hasOldKeyHint: !!el.querySelector(".dungeon-locked-hint"),
        hasOldKeyIcon: !!el.querySelector(".dungeon-lock-icon"),
        lockedHintText: el.querySelector(".zone-card-locked-hint")?.textContent.trim() ?? null,
        fullText: el.textContent,
      };
    }
    const paragonEl = document.querySelector(".paragon-card");
    return {
      lockedDungeon: cardInfo("Test Locked Dungeon"),
      freeDungeon: cardInfo("Test Transition-Free Dungeon"),
      paragon: paragonEl
        ? {
            found: true,
            hasStoryLockedClass: paragonEl.classList.contains("zone-card-story-locked"),
            hasOldKeyHint: !!paragonEl.querySelector(".dungeon-locked-hint"),
            hasOldKeyIcon: !!paragonEl.querySelector(".dungeon-lock-icon"),
            text: paragonEl.textContent.trim(),
          }
        : { found: false },
      anyRegularCardHasOldKeyOptics: [...document.querySelectorAll(".dungeon-card:not(.paragon-card)")]
        .some((c) => c.querySelector(".dungeon-locked-hint") || c.querySelector(".dungeon-lock-icon")),
      anyRegularCardMentionsSought: [...document.querySelectorAll(".dungeon-card:not(.paragon-card)")]
        .some((c) => /sought/i.test(c.textContent)),
    };
  });
  console.log("Locked test dungeon card: " + JSON.stringify(cards.lockedDungeon));
  console.log("Free/transition test dungeon card: " + JSON.stringify(cards.freeDungeon));
  console.log("Paragon card: " + JSON.stringify({ ...cards.paragon, text: undefined }));
  console.log("Any regular card has old key optics: " + cards.anyRegularCardHasOldKeyOptics);
  console.log("Any regular card mentions 'sought': " + cards.anyRegularCardMentionsSought);

  if (!cards.lockedDungeon?.found) problems.push("(a) Test-Dungeon 'locked' nicht im DOM gefunden");
  else {
    if (!cards.lockedDungeon.storyLocked) problems.push("(a) Gesperrter Dungeon hat keine .zone-card-story-locked-Klasse");
    if (!cards.lockedDungeon.hasLockBadge) problems.push("(a) Gesperrter Dungeon zeigt kein Schloss-Badge (.zone-card-story-lock-badge)");
    if (cards.lockedDungeon.hasEnterBtn) problems.push("(a) Gesperrter Dungeon zeigt trotzdem einen 'Betreten'-Button");
    if (!cards.lockedDungeon.lockedHintText?.includes("Chronicle Test One")) {
      problems.push(`(a) Sperr-Hinweis nennt nicht die Gate-Quest: "${cards.lockedDungeon.lockedHintText}"`);
    }
    if (cards.lockedDungeon.hasOldKeyHint || cards.lockedDungeon.hasOldKeyIcon) {
      problems.push("(e) Gesperrter Test-Dungeon trägt noch alte Schlüssel-Optik (.dungeon-locked-hint/.dungeon-lock-icon)");
    }
  }
  if (!cards.freeDungeon?.found) problems.push("(f) Transition-Test-Dungeon nicht im DOM gefunden");
  else {
    if (cards.freeDungeon.storyLocked) problems.push("(f) Dungeon ohne requiresQuest in offener Zone ist fälschlich gesperrt");
    if (!cards.freeDungeon.hasEnterBtn) problems.push("(f) Dungeon ohne requiresQuest zeigt keinen 'Betreten'-Button");
    if (cards.freeDungeon.enterDisabled) problems.push("(f) 'Betreten'-Button des offenen Dungeons ist disabled");
  }
  if (!cards.paragon?.found) {
    console.log("(d) Kein .paragon-card im DOM (Paragon-Content evtl. nicht im midgame-Fixture) — übersprungen.");
  } else {
    if (cards.paragon.hasStoryLockedClass) problems.push("(d) Paragon-Karte hat fälschlich .zone-card-story-locked (sollte ihre eigene Optik behalten)");
    if (!cards.paragon.hasOldKeyHint || !cards.paragon.hasOldKeyIcon) {
      problems.push("(d) Paragon-Karte hat ihre Schlüssel-Optik (.dungeon-locked-hint/.dungeon-lock-icon) verloren");
    }
  }
  if (cards.anyRegularCardHasOldKeyOptics) problems.push("(e) Mindestens eine reguläre Dungeon-Karte trägt noch alte Schlüssel-Optik-Klassen");
  if (cards.anyRegularCardMentionsSought) problems.push("(e) Mindestens eine reguläre Dungeon-Karte erwähnt noch 'sought' (alter Schlüssel-Text)");

  await page.screenshot({ path: join(OUT_DIR, "dungeon-01-locked-1920.png") });
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.waitForTimeout(250);
  await page.screenshot({ path: join(OUT_DIR, "dungeon-01-locked-1366.png") });
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.waitForTimeout(200);
  console.log("SHOT SAVED: dungeon-01-locked-*.png");

  // Klick auf die gesperrte Karte tut nichts (keine Navigation, kein Dungeon-Start).
  const urlBefore = page.url();
  await page.evaluate(() => {
    const el = [...document.querySelectorAll(".dungeon-card")].find(
      (c) => c.querySelector(".zone-card-name")?.textContent.includes("Test Locked Dungeon"),
    );
    el?.click();
  });
  await page.waitForTimeout(300);
  const combatUnchanged = await page.evaluate(() => !window.__hfDebug.state.combat?.dungeonId);
  console.log("Klick auf gesperrte Karte startet keinen Dungeon-Run: " + combatUnchanged);
  if (!combatUnchanged) problems.push("(a) Klick auf gesperrte Dungeon-Karte hat trotzdem einen Run gestartet");
  if (page.url() !== urlBefore) problems.push("(a) Klick auf gesperrte Dungeon-Karte hat navigiert");

  // ── (c) Story-Tab: "Schaltet frei:"-Zeile zeigt den Dungeon-Chip an chronicle_01 ────────────
  await goToQuests(page);
  await clickRetry(page, page.locator(".quests-tab-btn", { hasText: "Story" }).first());
  await page.waitForTimeout(400);
  const unlockLine = await page.evaluate(() => {
    const stage = document.querySelector(".chronicle-stage");
    if (!stage) return { stagePresent: false };
    const dungeonChip = stage.querySelector(".quest-reward-chip--unlock-dungeon");
    const anyUnlockChip = stage.querySelectorAll(".quest-reward-chip--unlock");
    return {
      stagePresent: true,
      title: stage.querySelector(".chronicle-stage-title")?.textContent.trim() ?? null,
      dungeonChipText: dungeonChip?.textContent.trim() ?? null,
      dungeonChipHasKindLabel: !!dungeonChip?.querySelector(".quest-reward-chip-kind"),
      totalUnlockChips: anyUnlockChip.length,
    };
  });
  console.log("Story-Tab Unlock-Zeile: " + JSON.stringify(unlockLine));
  if (!unlockLine.stagePresent) problems.push("(c) chronicle_01 zeigt keine aktive Stage");
  else {
    if (unlockLine.title !== "Chronicle Test One") problems.push(`(c) Falsches aktives Kapitel: "${unlockLine.title}"`);
    if (!unlockLine.dungeonChipText?.includes("Test Locked Dungeon")) {
      problems.push(`(c) Dungeon-Unlock-Chip fehlt/zeigt falschen Namen: "${unlockLine.dungeonChipText}"`);
    }
    if (!unlockLine.dungeonChipHasKindLabel) problems.push("(c) Dungeon-Chip hat kein unterscheidbares Kind-Label (.quest-reward-chip-kind)");
  }
  await page.screenshot({ path: join(OUT_DIR, "dungeon-02-storytab-1920.png") });
  console.log("SHOT SAVED: dungeon-02-storytab-1920.png");

  // ── (b) Quest erfüllen (nicht mal claimen — "completed" reicht, s. isDungeonUnlocked-JSDoc) ──
  await page.evaluate(() => { window.__hfDebug.state.monsterKills["chicken"] = 1; });
  await page.waitForTimeout(600);
  const questCompleted = await page.evaluate(() => window.__hfDebug.state.quests.completed.includes("chronicle_01"));
  console.log("chronicle_01 completed (Objective erfüllt): " + questCompleted);
  if (!questCompleted) problems.push("(b) Test-Setup: chronicle_01 wurde nach Kill nicht 'completed' — Testvoraussetzung nicht erfüllt");

  await goToCombat(page);
  await page.waitForTimeout(300);
  const unlockedNow = await page.evaluate(() => {
    const el = [...document.querySelectorAll(".dungeon-card")].find(
      (c) => c.querySelector(".zone-card-name")?.textContent.includes("Test Locked Dungeon"),
    );
    if (!el) return { found: false };
    const enterBtn = el.querySelector(".dungeon-enter");
    return {
      found: true,
      storyLocked: el.classList.contains("zone-card-story-locked"),
      hasLockBadge: !!el.querySelector(".zone-card-story-lock-badge"),
      hasEnterBtn: !!enterBtn,
      enterDisabled: enterBtn?.disabled ?? null,
    };
  });
  console.log("Vormals gesperrter Dungeon nach Quest-Erfüllung: " + JSON.stringify(unlockedNow));
  if (!unlockedNow.found) problems.push("(b) Test-Dungeon nach Unlock nicht mehr im DOM gefunden");
  else {
    if (unlockedNow.storyLocked) problems.push("(b) Dungeon bleibt .zone-card-story-locked, obwohl die Gate-Quest erfüllt ist");
    if (unlockedNow.hasLockBadge) problems.push("(b) Schloss-Badge bleibt sichtbar, obwohl die Gate-Quest erfüllt ist");
    if (!unlockedNow.hasEnterBtn) problems.push("(b) Kein 'Betreten'-Button, obwohl die Gate-Quest erfüllt ist");
    if (unlockedNow.enterDisabled) problems.push("(b) 'Betreten'-Button bleibt disabled, obwohl Level + Gate erfüllt sind");
  }
  await page.screenshot({ path: join(OUT_DIR, "dungeon-03-unlocked-1920.png") });
  console.log("SHOT SAVED: dungeon-03-unlocked-1920.png");

  // ── (3) BestiaryPage: dungeonOnly-Monster-Fight-Button gate-aware (isDungeonUnlocked) ────────
  // Synthetisches dungeonOnly-Monster in "test_dungeon_locked" (aktuell wieder gesperrt machen, um
  // beide Zweige zu prüfen: gesperrter Dungeon → Chronik-Hinweis, offener Dungeon → dungeonOnly-Hinweis).
  await page.evaluate(() => {
    const { content, state } = window.__hfDebug;
    content.monsters["test_mob_dungeonly"] = {
      id: "test_mob_dungeonly",
      name: { en: "Test Dungeon Boss", de: "Test-Dungeon-Boss" },
      zone: "test_zone_open",
      dungeonOnly: true,
      level: 1,
      maxHp: 10,
      damage: 1,
      accuracy: 0.5,
      evasion: 0,
      defense: 0,
      attackIntervalMs: 2000,
      xp: 0,
      gold: 0,
      loot: [],
    };
    const d = content.dungeons.find((dd) => dd.id === "test_dungeon_locked");
    if (d) d.encounters = ["test_mob_dungeonly"];
    state.monsterKills["test_mob_dungeonly"] = 1; // "known" → Karte zeigt Stats + Fight-Button
    // Dungeon wieder sperren (Quest wurde oben erfüllt) — deckt den "noch gesperrt"-Zweig ab.
    state.quests.completed = state.quests.completed.filter((id) => id !== "chronicle_01");
    state.quests.claimed = state.quests.claimed.filter((id) => id !== "chronicle_01");
    state.monsterKills["chicken"] = 0;
  });
  await page.waitForTimeout(500);

  await clickRetry(page, page.locator('[data-guide-id="topbar.bestiary"]').first());
  await page.waitForSelector(".bestiary-page", { timeout: 8000 });
  await page.waitForTimeout(300);
  const bestiaryLocked = await page.evaluate(() => {
    const card = [...document.querySelectorAll(".bestiary-card")].find((c) => c.textContent.includes("Test Dungeon Boss"));
    if (!card) return { found: false };
    const btn = card.querySelector(".bestiary-fight-btn");
    return { found: true, disabled: btn?.disabled ?? null, title: btn?.getAttribute("title") ?? null };
  });
  console.log("Bestiary dungeonOnly-Monster (Dungeon noch gesperrt): " + JSON.stringify(bestiaryLocked));
  if (!bestiaryLocked.found) problems.push("(3) Test-dungeonOnly-Monster nicht in der Bestiary gefunden");
  else {
    if (bestiaryLocked.disabled !== true) problems.push("(3) Fight-Button für dungeonOnly-Monster nicht disabled (Dungeon gesperrt)");
    if (!bestiaryLocked.title?.includes("Chronicle Test One")) {
      problems.push(`(3) Fight-Button-Hinweis nennt nicht die Gate-Quest: "${bestiaryLocked.title}"`);
    }
  }

  // Dungeon jetzt entsperren (SPA-intern, kein Reload — __hfDebug bleibt derselbe Objekt-Zeiger) →
  // Fight-Button bleibt disabled (dungeonOnly ist IMMER nicht direkt startbar), aber der Hinweistext
  // wechselt auf den "nur im Dungeon"-Text statt der Chronik-Zeile.
  await page.evaluate(() => { window.__hfDebug.state.monsterKills["chicken"] = 1; });
  await page.waitForTimeout(600);
  await clickRetry(page, page.locator('[data-guide-id="topbar.character"]').first());
  await page.waitForTimeout(150);
  await clickRetry(page, page.locator('[data-guide-id="topbar.bestiary"]').first());
  await page.waitForSelector(".bestiary-page", { timeout: 8000 });
  await page.waitForTimeout(300);
  const bestiaryUnlocked = await page.evaluate(() => {
    const card = [...document.querySelectorAll(".bestiary-card")].find((c) => c.textContent.includes("Test Dungeon Boss"));
    if (!card) return { found: false };
    const btn = card.querySelector(".bestiary-fight-btn");
    return { found: true, disabled: btn?.disabled ?? null, title: btn?.getAttribute("title") ?? null };
  });
  console.log("Bestiary dungeonOnly-Monster (Dungeon entsperrt): " + JSON.stringify(bestiaryUnlocked));
  if (!bestiaryUnlocked.found) problems.push("(3b) Test-dungeonOnly-Monster nach Unlock nicht mehr gefunden");
  else {
    if (bestiaryUnlocked.disabled !== true) problems.push("(3b) Fight-Button für dungeonOnly-Monster ist NICHT disabled, obwohl es nie direkt startbar ist");
    if (!bestiaryUnlocked.title || bestiaryUnlocked.title.includes("Chronicle Test One")) {
      problems.push(`(3b) Hinweistext wechselt nach Unlock nicht auf den dungeonOnly-Hinweis: "${bestiaryUnlocked.title}"`);
    }
  }
  await page.screenshot({ path: join(OUT_DIR, "dungeon-04-bestiary-1920.png") });
  console.log("SHOT SAVED: dungeon-04-bestiary-1920.png");

  await browser.close();

  console.log(problems.length ? "PROBLEME:\n- " + problems.join("\n- ") : "ALLE CHECKS GRÜN");
  console.log(errors.length ? `${errors.length} page errors:\n` + errors.slice(0, 12).join("\n") : "no page errors");

  if (problems.length || errors.length) process.exitCode = 1;
} finally {
  child.kill();
}
