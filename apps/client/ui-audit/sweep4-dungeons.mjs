#!/usr/bin/env node
/**
 * TESTER 4 ("Der Veteran") — Sweep 4, Brille "Endgame-Systeme", Kapitel 1: DUNGEONS.
 * Read-only Playwright-Sichtprüfung gegen die REALE Dungeon-Engine (kein Content-Patch nötig —
 * crypt_depths ist vollständig im Katalog verdrahtet). Port 5253 (Tester-4-Zuweisung).
 *
 * Prüft: Dungeon-Liste (Level-sortiert, Karten vollständig) → Freischaltung per Fixture-Patch
 * (state.dungeonsUnlocked) → Run starten → Wellen-Ansage → Encounter-Leiste (Elite-Kennzeichnung)
 * → Boss-Atempause + Truhen-Flash → Erst-Clear-Zeremonie (Belohnungen/Loot) → Tod im Dungeon
 * (Reset-Verhalten).
 *
 * Muster: ui-audit/dungeon-dramaturgy-shot.mjs (window.__hfDebug direct-state-patch escape hatch).
 * Run: node ui-audit/sweep4-dungeons.mjs   (from apps/client/)
 */
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5253;
const BASE_URL = `http://localhost:${PORT}`;
const OUT_DIR = "C:\\Users\\MSchu\\AppData\\Local\\Temp\\claude\\G--GameDev\\553d2095-3a73-4795-9782-0fe746a25f13\\scratchpad\\sweep4";
mkdirSync(OUT_DIR, { recursive: true });

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

async function clickRetry(page, locator, opts = {}) {
  try { await locator.click({ timeout: 6000, ...opts }); }
  catch { await page.waitForTimeout(400); await locator.click({ timeout: 6000, ...opts }); }
}

async function newGamePage(browser, tag) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(`[${tag}] pageerror: ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error") errors.push(`[${tag}] console: ${m.text()}`); });
  await page.goto(`${BASE_URL}/?fixture=endgame`, { waitUntil: "load" });
  await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
  await page.waitForFunction(() => !!window.__hfDebug, null, { timeout: 5000 });
  await page.waitForTimeout(4200); // Achievement-Toast-Batch (endgame-Fixture) abklingen lassen
  return { page, errors };
}

async function goToCombat(page) {
  await clickRetry(page, page.locator('[data-guide-id="sidebar.combat"]').first());
  await page.waitForSelector(".combat-page", { timeout: 10000 });
}

async function run(label, fn) {
  try { await fn(); }
  catch (e) { console.log(`!! ${label} FAILED: ${e.message}\n${e.stack ?? ""}`); }
}

const allErrors = [];
const findings = [];

const { child, getOutput } = startDevServer();
try {
  const ok = await waitForServer(BASE_URL);
  if (!ok) { console.error("SERVER NOT UP:\n" + getOutput()); process.exit(1); }
  const browser = await chromium.launch();

  // ── 1) Dungeon-Liste: alle gesperrt (frisches endgame-Fixture), Level-sortiert, Karten voll ──
  await run("list-locked-sorted", async () => {
    const { page, errors } = await newGamePage(browser, "list");
    await goToCombat(page);
    await page.locator(".dungeon-heading").filter({ hasText: "🗝️" }).scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    await page.screenshot({ path: join(OUT_DIR, "dg1-list-all-locked.png") });
    console.log("SHOT SAVED: dg1-list-all-locked.png");

    const cards = await page.evaluate(() => {
      const els = [...document.querySelectorAll(".dungeon-card:not(.paragon-card)")];
      return els.map((el) => ({
        name: el.querySelector(".zone-card-name")?.textContent?.trim(),
        meta: el.querySelector(".zone-card-meta")?.textContent?.trim(),
        locked: el.classList.contains("dungeon-locked"),
      }));
    });
    console.log("DUNGEON CARDS:", JSON.stringify(cards));
    const levels = cards.map((c) => Number((c.meta ?? "").match(/\d+/)?.[0] ?? -1));
    const sorted = levels.every((v, i) => i === 0 || v >= levels[i - 1]);
    console.log(`[list] count=${cards.length} sortedAscending=${sorted} allLocked=${cards.every((c) => c.locked)}`);
    if (cards.length < 5) findings.push(`MITTEL: Nur ${cards.length} Dungeon-Karten sichtbar (erwartet ~6)`);
    if (!sorted) findings.push(`MITTEL: Dungeon-Liste nicht Level-sortiert: ${JSON.stringify(levels)}`);
    for (const c of cards) {
      if (!c.name || !c.meta) findings.push(`MITTEL: Dungeon-Karte unvollständig: ${JSON.stringify(c)}`);
    }
    allErrors.push(...errors);
    await page.close();
  });

  // ── 2) Freischaltung per Fixture-Patch + Wellen-Ansage (Welle 1) ──────────────────────────────
  await run("unlock-and-wave1", async () => {
    const { page, errors } = await newGamePage(browser, "unlock");
    await page.evaluate(() => {
      window.__hfDebug.state.dungeonsUnlocked = { crypt_depths: true };
    });
    await goToCombat(page);
    await page.locator(".dungeon-heading").filter({ hasText: "🗝️" }).scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    const unlockedCount = await page.locator(".dungeon-card:not(.paragon-card):not(.dungeon-locked)").count();
    console.log(`[unlock] unlocked dungeon cards after patch: ${unlockedCount} (expect 1)`);
    await page.screenshot({ path: join(OUT_DIR, "dg2-unlocked-card.png") });
    console.log("SHOT SAVED: dg2-unlocked-card.png");
    if (unlockedCount !== 1) findings.push(`KRITISCH: Nach Unlock-Patch ${unlockedCount} entsperrte Karten statt 1`);

    await clickRetry(page, page.locator(".dungeon-card:not(.paragon-card):not(.dungeon-locked) .dungeon-enter").first());
    const bannerVisible = await page.waitForSelector(".dungeon-wave-announce", { timeout: 5000 }).then(() => true).catch(() => false);
    if (bannerVisible) {
      await page.waitForTimeout(200);
      await page.screenshot({ path: join(OUT_DIR, "dg3-wave-announce.png") });
      console.log("SHOT SAVED: dg3-wave-announce.png");
      const bannerText = await page.locator(".dungeon-wave-announce").first().textContent();
      console.log(`[wave-announce] text="${bannerText}"`);
    } else {
      findings.push("MITTEL: Wellen-Ansage-Banner beim Dungeon-Start nicht erschienen (crypt_depths Welle 1)");
    }
    allErrors.push(...errors);
    await page.close();
  });

  // ── 3) Encounter-Leiste mitten im Run — Welle 3/5 (Elite) ─────────────────────────────────────
  await run("encounter-bar-elite", async () => {
    const { page, errors } = await newGamePage(browser, "bar");
    await page.evaluate(() => { window.__hfDebug.state.dungeonsUnlocked = { crypt_depths: true }; });
    await goToCombat(page);
    await page.evaluate(() => {
      const { state, content } = window.__hfDebug;
      const dungeon = content.dungeons.find((d) => d.id === "crypt_depths");
      const idx = 2; // Welle 3/5 — "Die Knochenwache" (elite)
      const monsterId = dungeon.encounters[idx];
      const monster = content.monsters[monsterId];
      state.combat = {
        monsterId, enemyHp: monster.maxHp, enemyWard: monster.wardCapacity ?? 0,
        playerTimerMs: 0, enemyTimerMs: 0, kills: 2, eventCount: 0, log: [],
        enemyEffects: [], playerEffects: [], dungeonId: "crypt_depths", encounterIndex: idx,
        petAbility: state.combat.petAbility,
      };
      state.monsterKills["skeleton_warrior"] = 5;
      state.monsterKills["skeleton_archer"] = 4;
    });
    await page.waitForSelector(".battle", { timeout: 10000 });
    await page.waitForTimeout(4000); // Wellen-Ansage-Banner (3.4s) abklingen lassen
    await page.screenshot({ path: join(OUT_DIR, "dg4-encounter-bar-wave3-elite.png") });
    console.log("SHOT SAVED: dg4-encounter-bar-wave3-elite.png");
    const skulls = await page.evaluate(() => [...document.querySelectorAll(".dungeon-skull")].map((el) => el.className));
    console.log(`[encounter-bar] skulls: ${JSON.stringify(skulls)}`);
    const hasElite = skulls.some((c) => c.includes("elite"));
    if (!hasElite) findings.push("MITTEL: Encounter-Leiste zeigt keine Elite-Kennzeichnung für Welle 3");
    allErrors.push(...errors);
    await page.close();
  });

  // ── 4) Boss-Atempause + Truhen-Flash vor der letzten Welle ────────────────────────────────────
  await run("boss-breather-chest", async () => {
    const { page, errors } = await newGamePage(browser, "boss");
    await page.evaluate(() => { window.__hfDebug.state.dungeonsUnlocked = { crypt_depths: true }; });
    await goToCombat(page);
    await page.evaluate(() => {
      const { state, content } = window.__hfDebug;
      const dungeon = content.dungeons.find((d) => d.id === "crypt_depths");
      const idx = dungeon.encounters.length - 1; // Boss-Welle
      const monsterId = dungeon.encounters[idx];
      const monster = content.monsters[monsterId];
      state.combat = {
        monsterId, enemyHp: monster.maxHp, enemyWard: monster.wardCapacity ?? 0,
        playerTimerMs: 0, enemyTimerMs: 0, kills: 4, eventCount: 0, log: [],
        enemyEffects: [], playerEffects: [], dungeonId: "crypt_depths", encounterIndex: idx,
        cooldownRemainingMs: 6500, // mitten in der 8s-Atempause
        petAbility: state.combat.petAbility,
      };
    });
    const gotIntro = await page.waitForSelector(".dungeon-boss-intro", { timeout: 5000 }).then(() => true).catch(() => false);
    if (!gotIntro) { findings.push("KRITISCH: Boss-Atempause (.dungeon-boss-intro) erscheint nicht vor der letzten Welle"); allErrors.push(...errors); await page.close(); return; }
    await page.waitForTimeout(150);
    await page.screenshot({ path: join(OUT_DIR, "dg5-boss-intro.png") });
    console.log("SHOT SAVED: dg5-boss-intro.png");
    const bossName = await page.locator(".dungeon-boss-intro-name").first().textContent();
    const chestVisible = (await page.locator(".dungeon-chest-flash").count()) > 0;
    console.log(`[boss-intro] name="${bossName}" chestFlashVisible=${chestVisible}`);
    if (!chestVisible) findings.push("KOSMETISCH: Truhen-Flash im Boss-Intro fehlt (crypt_depths hat eine definierte Truhe)");
    allErrors.push(...errors);
    await page.close();
  });

  // ── 5) Erst-Clear-Zeremonie: echter Kill (enemyHp=1), Belohnungen + Loot ──────────────────────
  await run("clear-ceremony", async () => {
    const { page, errors } = await newGamePage(browser, "clear");
    await page.evaluate(() => { window.__hfDebug.state.dungeonsUnlocked = { crypt_depths: true }; });
    await goToCombat(page);
    await page.evaluate(() => {
      const { state, content } = window.__hfDebug;
      const dungeon = content.dungeons.find((d) => d.id === "crypt_depths");
      const idx = dungeon.encounters.length - 1;
      const monsterId = dungeon.encounters[idx];
      state.combat = {
        monsterId, enemyHp: 1, enemyWard: 0,
        playerTimerMs: 0, enemyTimerMs: 0, kills: 4, eventCount: 0, log: [],
        enemyEffects: [], playerEffects: [], dungeonId: "crypt_depths", encounterIndex: idx,
        petAbility: state.combat.petAbility,
      };
      state.dungeonsCleared.crypt_depths = 0; // Erst-Clear
    });
    const gotCeremony = await page.waitForSelector(".dcc-card", { timeout: 20000 }).then(() => true).catch(() => false);
    if (!gotCeremony) { findings.push("KRITISCH: Clear-Zeremonie (.dcc-card) erscheint nach echtem Boss-Kill nicht"); allErrors.push(...errors); await page.close(); return; }
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(OUT_DIR, "dg6-clear-ceremony.png") });
    console.log("SHOT SAVED: dg6-clear-ceremony.png");
    const domProof = await page.evaluate(() => ({
      title: document.querySelector(".dcc-title")?.textContent,
      firstClearBadge: document.querySelector(".dcc-first-badge")?.textContent ?? null,
      lootCount: document.querySelectorAll(".dcc-loot-item").length,
      rewardChips: [...document.querySelectorAll(".dcc-reward-chip")].map((el) => el.textContent),
    }));
    console.log(`[clear-ceremony] ${JSON.stringify(domProof)}`);
    if (!domProof.firstClearBadge) findings.push("MITTEL: Erst-Clear-Badge fehlt bei tatsächlichem Erst-Clear");
    if (domProof.rewardChips.length === 0) findings.push("MITTEL: Keine Belohnungs-Chips (Gold/XP) in der Clear-Zeremonie");
    allErrors.push(...errors);
    await page.close();
  });

  // ── 6) Tod im Dungeon: Reset-Verhalten (Run-Abbruch, kein Fortschritts-Save) ──────────────────
  await run("death-reset", async () => {
    const { page, errors } = await newGamePage(browser, "death");
    await page.evaluate(() => { window.__hfDebug.state.dungeonsUnlocked = { crypt_depths: true }; });
    await goToCombat(page);
    await page.evaluate(() => {
      const { state, content } = window.__hfDebug;
      const dungeon = content.dungeons.find((d) => d.id === "crypt_depths");
      const idx = 1; // Welle 2/5, mitten im Run
      const monsterId = dungeon.encounters[idx];
      const monster = content.monsters[monsterId];
      state.combat = {
        monsterId, enemyHp: monster.maxHp, enemyWard: monster.wardCapacity ?? 0,
        playerTimerMs: 0, enemyTimerMs: 0, kills: 1, eventCount: 0, log: [],
        enemyEffects: [], playerEffects: [], dungeonId: "crypt_depths", encounterIndex: idx,
        petAbility: state.combat.petAbility,
      };
      state.character.hp = 1; // stirbt am nächsten echten Gegnertreffer
      state.character.food = null; // Auto-Eat AUS (sonst hält Essen den Charakter beliebig lange am Leben)
    });
    const gotDeath = await page.waitForSelector(".death-modal", { timeout: 20000 }).then(() => true).catch(() => false);
    if (!gotDeath) { findings.push("KRITISCH: Todes-Popup erscheint bei Dungeon-Tod nicht"); allErrors.push(...errors); await page.close(); return; }
    await page.waitForTimeout(200);
    await page.screenshot({ path: join(OUT_DIR, "dg7-death-popup.png") });
    console.log("SHOT SAVED: dg7-death-popup.png");
    const domProof = await page.evaluate(() => ({
      title: document.querySelector(".death-modal-title")?.textContent,
      body: document.querySelector(".death-modal-body")?.textContent,
      paragonHintPresent: !!document.querySelector(".death-modal-paragon-hint"),
      dungeonIdAfter: window.__hfDebug.state.combat.dungeonId,
      encounterIndexAfter: window.__hfDebug.state.combat.encounterIndex,
    }));
    console.log(`[death-reset] ${JSON.stringify(domProof)} (expect dungeonIdAfter=null, encounterIndexAfter=0)`);
    if (domProof.dungeonIdAfter !== null || domProof.encounterIndexAfter !== 0) {
      findings.push(`KRITISCH: Dungeon-Run nach Tod nicht sauber zurückgesetzt (dungeonId=${domProof.dungeonIdAfter}, encounterIndex=${domProof.encounterIndexAfter})`);
    }
    if (!domProof.body || !/crypt|krypta|welle 2|wave 2/i.test(domProof.body)) {
      findings.push("KOSMETISCH: Todes-Popup kommuniziert bei Dungeon-Tod nicht explizit den Run-Abbruch (nur generischer 'gestorben gegen X'-Text, Paragonturm hat dagegen eine eigene Reset-Hinweiszeile)");
    }
    // Bestätigen: Karte wieder frisch betretbar (kein "Fortsetzen ab Welle 2").
    await clickRetry(page, page.locator(".death-modal button, .modal.death-modal button").first());
    await page.waitForTimeout(300);
    await page.locator(".dungeon-heading").filter({ hasText: "🗝️" }).scrollIntoViewIfNeeded();
    const enterBtnText = await page.locator(".dungeon-card:not(.paragon-card):not(.dungeon-locked) .dungeon-enter").first().textContent();
    console.log(`[death-reset] Enter-Button-Text nach Tod: "${enterBtnText}" (erwartet normaler "Betreten"-Text, kein "Fortsetzen")`);
    await page.screenshot({ path: join(OUT_DIR, "dg8-after-death-fresh-card.png") });
    console.log("SHOT SAVED: dg8-after-death-fresh-card.png");
    allErrors.push(...errors);
    await page.close();
  });

  await browser.close();
  console.log("\n=== FINDINGS ===");
  console.log(findings.length ? findings.map((f) => "- " + f).join("\n") : "keine (alle Checks grün)");
  console.log(`\n=== PAGE ERRORS (${allErrors.length}) ===`);
  console.log(allErrors.length ? allErrors.slice(0, 30).join("\n") : "keine Konsolenfehler");
} finally {
  child.kill();
}
