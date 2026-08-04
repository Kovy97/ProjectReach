#!/usr/bin/env node
/**
 * Dungeon-Rework Welle 4 (UI) self-check — Encounter-Leiste, Wellen-Ansage, Boss-Intro, Dungeon-
 * Karten v2, Unlock-Toast, Clear-Zeremonie, Bestiarium ohne dg_-Dopplung.
 *
 * Uses the existing `endgame` fixture (CL96, confirmed via combatLevel() — matches the CEO's "endgame
 * ist CL96" note) + the dev-only `window.__hfDebug` hook (GameContext.tsx, "petTest-Präzedenz": same
 * class of dev-only escape hatch as `?petTest=<id>`/`?levelTest=1`, just generalized to arbitrary
 * state patches instead of one bespoke URL param per scenario) to unlock dungeons and seed mid-run
 * combat state directly — no packages/** changes, no new fixture JSON needed.
 *
 * The Clear-Zeremonie shot patches the boss's HP down to 1 and lets the REAL game loop land the
 * killing blow (genuine onEnemyDefeated → grantDungeonRewards → endDungeon transition) instead of
 * faking the ceremony trigger — exercises the actual detection logic end-to-end.
 *
 * Port 5229 per task instructions.
 * Run: node dungeon-dramaturgy-shot.mjs
 * Output: PNGs written to the scratchpad dir below.
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5229;
const BASE_URL = `http://localhost:${PORT}`;
const OUT_DIR = "C:\\Users\\MSchu\\AppData\\Local\\Temp\\claude\\G--GameDev\\553d2095-3a73-4795-9782-0fe746a25f13\\scratchpad";

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

async function clickWithReloadRetry(page, locator, opts = {}) {
  try {
    await locator.click({ timeout: 6000, ...opts });
  } catch {
    await page.waitForTimeout(400);
    await locator.click({ timeout: 6000, ...opts });
  }
}

async function newGamePage(browser) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
  await page.goto(`${BASE_URL}/?fixture=endgame`, { waitUntil: "load" });
  await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
  await page.waitForFunction(() => !!window.__hfDebug, null, { timeout: 5000 });
  return { page, errors };
}

async function goToCombat(page) {
  await clickWithReloadRetry(page, page.locator('[data-guide-id="sidebar.combat"]').first());
  await page.waitForSelector(".combat-page", { timeout: 10000 });
}

async function run(label, fn) {
  try {
    await fn();
  } catch (e) {
    console.log(`!! ${label} FAILED: ${e.message}\n${e.stack ?? ""}`);
  }
}

const { child, getOutput } = startDevServer();
try {
  const ok = await waitForServer(BASE_URL);
  if (!ok) { console.error("SERVER NOT UP:\n" + getOutput()); process.exit(1); }
  const browser = await chromium.launch();

  // ── 1) Dungeon-Karten v2: gesperrt vs. entsperrt, Erst-Clear-Zähler dezent sichtbar ──────────
  await run("dungeon-cards", async () => {
    const { page, errors } = await newGamePage(browser);
    await goToCombat(page);
    await page.evaluate(() => {
      const { state } = window.__hfDebug;
      // Entsperrt: crypt_depths (bereits 3× geclearet — Clear-Zähler-Badge), goblin_warband,
      // wildwood_hunt, highland_aerie. Gesperrt bleiben (bewusst, für den Vergleich): wyvern_lair,
      // idol_sanctum — beide sind bei CL96 ohnehin über Level, zeigen also zusätzlich das Level-Gate.
      state.dungeonsUnlocked = {
        crypt_depths: true,
        goblin_warband: true,
        wildwood_hunt: true,
        highland_aerie: true,
      };
      state.dungeonsCleared = { crypt_depths: 3, goblin_warband: 1 };
    });
    // Das direkte dungeonsCleared-Patch löst nebenbei echte Achievement-Unlocks aus (dungeons_cleared-
    // Bedingungen) → Achievement-Toasts stapeln sich kurz oben rechts. Lange genug warten, bis der
    // TOAST_MS=4000-Automatik-Abbau durch ist, sonst verdecken sie die rechten Dungeon-Karten.
    await page.waitForTimeout(5500);
    // `.dungeon-heading` is shared with the Slayer-Turm section header (margin-top reuse) — pick the
    // actual "Dungeons"-Überschrift specifically (excludes `.slayer-tower-heading`).
    await page.locator(".dungeon-heading:not(.slayer-tower-heading)").scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    await page.screenshot({ path: join(OUT_DIR, "dungeon-cards-v2.png") });
    console.log("SHOT SAVED: dungeon-cards-v2.png");
    const locked = await page.locator(".dungeon-card.dungeon-locked").count();
    const unlocked = await page.locator(".dungeon-card:not(.dungeon-locked)").count();
    console.log(`[dungeon-cards] locked=${locked} unlocked=${unlocked} (expect locked=2 unlocked=4)`);
    console.log(errors.length ? "PAGE ERRORS:\n" + errors.slice(0, 10).join("\n") : "no page errors");
    await page.close();
  });

  // ── 2) Unlock-Toast: state-patch von lastDungeonUnlock (echter Engine-Breadcrumb-Pfad) ────────
  await run("unlock-toast", async () => {
    const { page, errors } = await newGamePage(browser);
    await page.waitForTimeout(1500); // Ladezeit-Toasts (Achievements etc.) zuerst abklingen lassen
    await page.evaluate(() => {
      const { state } = window.__hfDebug;
      state.lastDungeonUnlock = { dungeonIds: ["highland_aerie", "wyvern_lair"], itemId: "highland_key", seq: 1 };
    });
    await page.waitForSelector(".toast-rare", { timeout: 8000 });
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(OUT_DIR, "dungeon-unlock-toast.png") });
    console.log("SHOT SAVED: dungeon-unlock-toast.png");
    const toastText = await page.locator(".toast-rare .toast-detail").first().textContent();
    console.log(`[unlock-toast] detail="${toastText}"`);
    console.log(errors.length ? "PAGE ERRORS:\n" + errors.slice(0, 10).join("\n") : "no page errors");
    await page.close();
  });

  // ── 3) Wellen-Ansage (Auftakt-Banner, kurz nach Wellenwechsel) ────────────────────────────────
  await run("wave-announce", async () => {
    const { page, errors } = await newGamePage(browser);
    await goToCombat(page);
    await page.evaluate(() => {
      const { state, content } = window.__hfDebug;
      const dungeon = content.dungeons.find((d) => d.id === "crypt_depths");
      const idx = 2; // Welle 3/5
      const monsterId = dungeon.encounters[idx];
      const monster = content.monsters[monsterId];
      state.combat.dungeonId = "crypt_depths";
      state.combat.encounterIndex = idx;
      state.combat.monsterId = monsterId;
      state.combat.enemyHp = monster.maxHp;
      state.combat.enemyWard = monster.wardCapacity ?? 0;
      state.combat.kills = 2;
      state.combat.log = [];
      state.combat.eventCount = 0;
      state.combat.enemyEffects = [];
      state.combat.playerTimerMs = 0;
      state.combat.enemyTimerMs = 0;
      state.combat.cooldownRemainingMs = undefined;
      state.combat.lastKill = undefined;
    });
    await page.waitForSelector(".dungeon-wave-announce", { timeout: 5000 });
    await page.waitForTimeout(200);
    await page.screenshot({ path: join(OUT_DIR, "dungeon-wave-announce.png") });
    console.log("SHOT SAVED: dungeon-wave-announce.png");
    const bannerText = await page.locator(".dungeon-wave-announce").first().textContent();
    console.log(`[wave-announce] text="${bannerText}"`);
    console.log(errors.length ? "PAGE ERRORS:\n" + errors.slice(0, 10).join("\n") : "no page errors");
    await page.close();
  });

  // ── 4) Encounter-Leiste mitten im Run — Welle 3/5 pulsierend (Banner mittlerweile ausgeblendet) ─
  await run("encounter-bar", async () => {
    const { page, errors } = await newGamePage(browser);
    await goToCombat(page);
    await page.evaluate(() => {
      const { state, content } = window.__hfDebug;
      const dungeon = content.dungeons.find((d) => d.id === "crypt_depths");
      const idx = 2; // Welle 3/5
      const monsterId = dungeon.encounters[idx];
      const monster = content.monsters[monsterId];
      state.combat.dungeonId = "crypt_depths";
      state.combat.encounterIndex = idx;
      state.combat.monsterId = monsterId;
      state.combat.enemyHp = monster.maxHp;
      state.combat.enemyWard = monster.wardCapacity ?? 0;
      state.combat.kills = 2;
      state.combat.log = [];
      state.combat.eventCount = 0;
      state.combat.enemyEffects = [];
      state.combat.playerTimerMs = 0;
      state.combat.enemyTimerMs = 0;
      state.combat.cooldownRemainingMs = undefined;
      state.combat.lastKill = undefined;
      // Bestiarium-Bezug (Collection-Log-Regel): Wellen 1+2 als "bekannt" markieren, damit die
      // Tooltips echte Monsternamen statt "???" zeigen — die Basis-Ids (Kill-Credit-Alias).
      state.monsterKills["skeleton_warrior"] = 5;
      state.monsterKills["skeleton_archer"] = 4;
    });
    await page.waitForSelector(".battle", { timeout: 10000 });
    await page.waitForTimeout(4000); // Wellen-Ansage-Banner (3.4s) abklingen lassen
    await page.screenshot({ path: join(OUT_DIR, "dungeon-encounter-bar-wave3.png") });
    console.log("SHOT SAVED: dungeon-encounter-bar-wave3.png");
    const bar = page.locator(".dungeon-encounter-bar").first();
    await bar.screenshot({ path: join(OUT_DIR, "dungeon-encounter-bar-crop.png") });
    console.log("SHOT SAVED: dungeon-encounter-bar-crop.png");
    const domProof = await page.evaluate(() => {
      const skulls = [...document.querySelectorAll(".dungeon-skull")].map((el) => el.className);
      return skulls;
    });
    console.log(`[encounter-bar] skull classes: ${JSON.stringify(domProof)}`);
    console.log(errors.length ? "PAGE ERRORS:\n" + errors.slice(0, 10).join("\n") : "no page errors");
    await page.close();
  });

  // ── 5) Boss-Intro — die 8s-Atempause vor der letzten Welle inkl. Truhen-Flash ─────────────────
  await run("boss-intro", async () => {
    const { page, errors } = await newGamePage(browser);
    await goToCombat(page);
    await page.evaluate(() => {
      const { state, content } = window.__hfDebug;
      const dungeon = content.dungeons.find((d) => d.id === "crypt_depths");
      const idx = dungeon.encounters.length - 1; // letzte Welle = Boss
      const monsterId = dungeon.encounters[idx];
      const monster = content.monsters[monsterId];
      state.combat.dungeonId = "crypt_depths";
      state.combat.encounterIndex = idx;
      state.combat.monsterId = monsterId;
      state.combat.enemyHp = monster.maxHp;
      state.combat.enemyWard = monster.wardCapacity ?? 0;
      state.combat.kills = 4;
      state.combat.log = [];
      state.combat.eventCount = 0;
      state.combat.enemyEffects = [];
      state.combat.playerTimerMs = 0;
      state.combat.enemyTimerMs = 0;
      state.combat.cooldownRemainingMs = 6500; // mitten in der 8s-Atempause (PRE_BOSS_BREATHER_MS)
      state.combat.lastKill = undefined;
    });
    await page.waitForSelector(".dungeon-boss-intro", { timeout: 5000 });
    await page.waitForTimeout(150);
    await page.screenshot({ path: join(OUT_DIR, "dungeon-boss-intro.png") });
    console.log("SHOT SAVED: dungeon-boss-intro.png");
    const bossName = await page.locator(".dungeon-boss-intro-name").first().textContent();
    const chestVisible = (await page.locator(".dungeon-chest-flash").count()) > 0;
    console.log(`[boss-intro] name="${bossName}" chestFlashVisible=${chestVisible}`);
    console.log(errors.length ? "PAGE ERRORS:\n" + errors.slice(0, 10).join("\n") : "no page errors");
    await page.close();
  });

  // ── 6) Clear-Zeremonie mit Erst-Clear-Badge — echte Engine-Transition (Boss-HP auf 1) ─────────
  await run("clear-ceremony", async () => {
    const { page, errors } = await newGamePage(browser);
    await goToCombat(page);
    await page.evaluate(() => {
      const { state, content } = window.__hfDebug;
      const dungeon = content.dungeons.find((d) => d.id === "crypt_depths");
      const idx = dungeon.encounters.length - 1; // letzte Welle = Boss
      const monsterId = dungeon.encounters[idx];
      state.combat.dungeonId = "crypt_depths";
      state.combat.encounterIndex = idx;
      state.combat.monsterId = monsterId;
      state.combat.enemyHp = 1; // stirbt am nächsten echten Treffer — echter onEnemyDefeated-Pfad
      state.combat.enemyWard = 0;
      state.combat.kills = 4;
      state.combat.log = [];
      state.combat.eventCount = 0;
      state.combat.enemyEffects = [];
      state.combat.playerTimerMs = 0;
      state.combat.enemyTimerMs = 0;
      state.combat.cooldownRemainingMs = undefined; // normaler Kampf, kein Breather
      state.combat.lastKill = undefined;
      state.dungeonsCleared.crypt_depths = 0; // Erst-Clear (curCount wird nach dem Kill 1)
    });
    await page.waitForSelector(".dcc-card", { timeout: 20000 });
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(OUT_DIR, "dungeon-clear-ceremony.png") });
    console.log("SHOT SAVED: dungeon-clear-ceremony.png");
    const domProof = await page.evaluate(() => ({
      title: document.querySelector(".dcc-title")?.textContent,
      firstClearBadge: document.querySelector(".dcc-first-badge")?.textContent ?? null,
      lootCount: document.querySelectorAll(".dcc-loot-item").length,
      rewardChips: [...document.querySelectorAll(".dcc-reward-chip")].map((el) => el.textContent),
    }));
    console.log(`[clear-ceremony] ${JSON.stringify(domProof)}`);
    console.log(errors.length ? "PAGE ERRORS:\n" + errors.slice(0, 10).join("\n") : "no page errors");
    await page.close();
  });

  // ── 7) Bestiarium ohne dg_-Dopplung (borderlands/crypt Zonen) ─────────────────────────────────
  await run("bestiary-no-dg-dupes", async () => {
    const { page, errors } = await newGamePage(browser);
    await clickWithReloadRetry(page, page.locator('[data-guide-id="topbar.bestiary"]').first());
    await page.waitForSelector(".bestiary-page", { timeout: 10000 });
    // Beide Zonen aufklappen (Default-Collapse: nur Zonen mit ≥1 bekanntem Monster offen).
    const cryptHeader = page.locator(".bestiary-zone-header", { hasText: /Krypta|Crypt/ }).first();
    const borderHeader = page.locator(".bestiary-zone-header", { hasText: /Grenzlande|Borderlands/ }).first();
    await clickWithReloadRetry(page, cryptHeader);
    await clickWithReloadRetry(page, borderHeader);
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(OUT_DIR, "bestiary-no-dg-dupes.png"), fullPage: true });
    console.log("SHOT SAVED: bestiary-no-dg-dupes.png");
    const counts = await page.evaluate(() => {
      const cards = [...document.querySelectorAll(".bestiary-card")];
      const names = cards.map((c) => c.querySelector(".bestiary-name")?.textContent ?? "");
      return { totalCards: cards.length, uniqueNames: new Set(names).size, names };
    });
    console.log(`[bestiary] totalCards=${counts.totalCards} uniqueNames=${counts.uniqueNames}`);
    // Doppelte Namen (gleiche Art, zwei Karten) wären genau das dg_-Dopplungs-Symptom. "???" ist der
    // gemeinsame Platzhalter ALLER unentdeckten Monster — kein Dopplungs-Indiz, ausgeschlossen.
    const dupeNames = counts.names.filter((n, i) => n && n !== "???" && counts.names.indexOf(n) !== i);
    console.log(`[bestiary] duplicate names found: ${JSON.stringify([...new Set(dupeNames)])}`);
    console.log(errors.length ? "PAGE ERRORS:\n" + errors.slice(0, 10).join("\n") : "no page errors");
    await page.close();
  });

  await browser.close();
} finally {
  child.kill();
}
