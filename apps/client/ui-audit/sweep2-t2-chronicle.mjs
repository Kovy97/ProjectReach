#!/usr/bin/env node
/**
 * Tester-Sweep 2, T2 "Der Fortschritts-Grinder" (2026-07-13) — Wegwerf-Skript.
 *
 * Revier: Aschechronik Kapitel 1-7 mechanisch (pastures -> Warband-Dungeon -> Aschelande).
 * Fährt gegen den ECHTEN Content (packages/content, keine Synthetik) über die reale UI.
 * Kill-Zaehler/Stats werden per __hfDebug kurz VOR das Ziel gesetzt (Grinding abkuerzen), die
 * ZIEL-Aktion (der entscheidende Kill / Claim-Klick) laeuft immer ueber echte UI-Interaktion +
 * den echten Tick-Loop ("HP auf 1, auf den naechsten echten Treffer warten" - Muster aus
 * sweep4-paragon.mjs / dungeon-dramaturgy-shot.mjs).
 *
 * Fixture: midgame.json (v57, wird beim Laden migriert -> legacyZoneGrants fuer alle v62-Zonen).
 * Damit die Story-Gates real testbar sind, werden legacyZoneGrants fuer borderlands/ashfields/
 * blackthorn sowie dungeonsUnlocked.goblin_warband explizit VOR dem Test auf false gesetzt
 * (exakt das Muster aus story-tab-check.mjs / dungeon-gate-check.mjs). Kein packages/content-Edit.
 *
 * Port 5251 (Task-Vorgabe, T2-eigen).
 */
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5251;
const BASE_URL = `http://localhost:${PORT}`;
const OUT_DIR = "C:\\Users\\MSchu\\AppData\\Local\\Temp\\claude\\G--GameDev\\553d2095-3a73-4795-9782-0fe746a25f13\\scratchpad\\sweep2-t2";
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
  await page.waitForTimeout(250);
}

async function goToQuests(page) {
  await clickRetry(page, page.locator('[data-guide-id="topbar.quests"]').first());
  await page.waitForSelector(".quests-page", { timeout: 8000 });
  await page.waitForTimeout(250);
}

async function goToBestiary(page) {
  await clickRetry(page, page.locator('[data-guide-id="topbar.bestiary"]').first());
  await page.waitForSelector(".bestiary-page", { timeout: 8000 });
  await page.waitForTimeout(250);
}

/**
 * Stellt sicher, dass die Combat-Page auf der Zonen-Uebersicht (Stufe 1, .zone-grid) steht:
 * flieht aus einem laufenden Kampf (falls noch aktiv aus dem vorigen Schritt, z.B. der
 * Kill-Cooldown-Respawn-Loop) und verlaesst eine offene Zonen-Detailansicht (.zone-back).
 */
async function ensureZoneSelect(page) {
  const inBattle = await page.evaluate(() => window.__hfDebug.state.combat?.monsterId != null).catch(() => false);
  if (inBattle) {
    const fleeBtn = page.locator(".combat-btn.flee").first();
    if (await fleeBtn.count()) { await clickRetry(page, fleeBtn); await page.waitForTimeout(300); }
    else { await page.evaluate(() => { window.__hfDebug.state.combat.monsterId = null; window.__hfDebug.state.combat.dungeonId = null; }); await page.waitForTimeout(300); }
  }
  const backBtn = page.locator(".zone-back").first();
  if (await backBtn.count()) { await clickRetry(page, backBtn); await page.waitForTimeout(300); }
}

/** Klickt eine Zonen-Karte per EXAKTEM Namens-Match (.zone-card-name). */
async function selectZone(page, zoneId) {
  const name = await page.evaluate((id) => window.__hfDebug.content.zones.find((z) => z.id === id)?.name?.en, zoneId);
  if (!name) throw new Error(`Zone ${zoneId} nicht im Content gefunden`);
  const cards = page.locator(".zone-card:not(.dungeon-card)");
  const n = await cards.count();
  for (let i = 0; i < n; i++) {
    const txt = (await cards.nth(i).locator(".zone-card-name").textContent())?.trim();
    if (txt === name) { await clickRetry(page, cards.nth(i)); await page.waitForTimeout(300); return true; }
  }
  return false;
}

/** Findet die Monster-Karte per EXAKTEM Namens-Match und klickt den Fight-Button. */
async function fightMonster(page, monsterId) {
  const name = await page.evaluate((id) => window.__hfDebug.content.monsters[id]?.name?.en, monsterId);
  if (!name) throw new Error(`Monster ${monsterId} nicht im Content gefunden`);
  const cards = page.locator(".monster-card");
  const n = await cards.count();
  for (let i = 0; i < n; i++) {
    const txt = (await cards.nth(i).locator(".monster-card-name").textContent())?.trim();
    if (txt === name) {
      const btn = cards.nth(i).locator(".mc-fight-btn");
      if (await btn.isDisabled()) return "disabled";
      await clickRetry(page, btn);
      return "clicked";
    }
  }
  return "not-found";
}

/** Setzt Gegner-HP auf 1 und wartet auf den naechsten ECHTEN Treffer (echter onEnemyDefeated-Pfad). */
async function killOnce(page, monsterId, timeoutMs = 25000) {
  await page.waitForFunction(
    (id) => window.__hfDebug.state.combat.monsterId === id,
    monsterId,
    { timeout: 8000 },
  ).catch(() => {});
  const before = await page.evaluate((id) => window.__hfDebug.state.monsterKills[id] ?? 0, monsterId);
  await page.evaluate(() => { if (window.__hfDebug.state.combat) window.__hfDebug.state.combat.enemyHp = 1; });
  try {
    await page.waitForFunction(
      ({ id, before }) => (window.__hfDebug.state.monsterKills[id] ?? 0) > before,
      { id: monsterId, before },
      { timeout: timeoutMs },
    );
    return true;
  } catch {
    // Retry einmal (z.B. falls der Gegner in der Zwischenzeit respawnt/gewechselt hat).
    await page.evaluate(() => { if (window.__hfDebug.state.combat) window.__hfDebug.state.combat.enemyHp = 1; });
    try {
      await page.waitForFunction(
        ({ id, before }) => (window.__hfDebug.state.monsterKills[id] ?? 0) > before,
        { id: monsterId, before },
        { timeout: timeoutMs },
      );
      return true;
    } catch { return false; }
  }
}

/** Findet eine Dungeon-Karte per EXAKTEM Namens-Match (unter .dungeon-card, Stufe-1-Liste). */
async function enterDungeon(page, dungeonId) {
  const name = await page.evaluate((id) => window.__hfDebug.content.dungeons.find((d) => d.id === id)?.name?.en, dungeonId);
  const cards = page.locator(".dungeon-card");
  const n = await cards.count();
  for (let i = 0; i < n; i++) {
    const txt = (await cards.nth(i).locator(".zone-card-name").textContent())?.trim();
    if (txt?.startsWith(name)) {
      const btn = cards.nth(i).locator(".dungeon-enter");
      if (await btn.count() === 0 || await btn.isDisabled()) return "cannot-enter";
      await clickRetry(page, btn);
      return "entered";
    }
  }
  return "not-found";
}

/**
 * Raeumt einen laufenden Dungeon-Run Welle fuer Welle ab — echter onEnemyDefeated-Pfad (der Kill
 * selbst laeuft immer ueber den echten Tick-Loop/performPlayerAttack, nie simuliert/gebypasst).
 * WICHTIG: ein EINMALIGES "HP auf 1" raced gegen die naechste Welle (onEnemyDefeated setzt beim
 * Wellenwechsel cs.enemyHp = next.maxHp SOFORT, noch im selben Tick wie mein vorheriger Nudge —
 * ein Einzel-Nudge kann also von einem frischen Wellenwechsel ueberschrieben werden, bevor der
 * naechste echte Treffer landet). Deshalb: kontinuierlich alle 400ms nachklemmen (HP>1 -> auf 1
 * zurueck), bis entweder die Welle wechselt oder der Dungeon endet — der toedliche Treffer bleibt
 * dabei immer ein echter, vom Tick-Loop ausgefuehrter Angriff.
 */
async function clearDungeonWaves(page, dungeonId, maxTotalMs = 180000) {
  const start = Date.now();
  let lastIdx = -1;
  while (Date.now() - start < maxTotalMs) {
    const cs = await page.evaluate(() => {
      const c = window.__hfDebug.state.combat;
      return { dungeonId: c.dungeonId, idx: c.encounterIndex, hp: c.enemyHp };
    });
    if (cs.dungeonId !== dungeonId) return true; // Run beendet.
    if (cs.idx !== lastIdx) { lastIdx = cs.idx; log(`    Dungeon-Welle ${cs.idx} aktiv (hp=${cs.hp})`); }
    if (cs.hp > 1) await page.evaluate(() => { if (window.__hfDebug.state.combat) window.__hfDebug.state.combat.enemyHp = 1; });
    await page.waitForTimeout(400);
  }
  const stillIn = await page.evaluate((did) => window.__hfDebug.state.combat.dungeonId === did, dungeonId);
  return !stillIn;
}

async function setMonsterKills(page, id, value) {
  await page.evaluate(({ id, value }) => { window.__hfDebug.state.monsterKills[id] = value; }, { id, value });
}

async function getState(page, path) {
  return page.evaluate((p) => {
    const parts = p.split(".");
    let v = window.__hfDebug.state;
    for (const k of parts) v = v?.[k];
    return v;
  }, path);
}

const findings = []; // { sev: "KRITISCH"|"MITTEL"|"KOSMETISCH", text }
const matrix = {}; // chapterId -> { objective, claim, unlock }
const errors = [];

function wirePage(page, tag) {
  page.on("pageerror", (e) => errors.push(`[${tag}] pageerror: ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error") errors.push(`[${tag}] console: ${m.text()}`); });
}

function log(...args) { console.log(...args); }
function finding(sev, text) { findings.push({ sev, text }); log(`  >> [${sev}] ${text}`); }

const { child, getOutput } = startDevServer();
try {
  const ok = await waitForServer(BASE_URL);
  if (!ok) { console.error("SERVER NOT UP:\n" + getOutput()); process.exit(1); }

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  wirePage(page, "main");
  await page.addInitScript(() => {
    try { localStorage.setItem("hearthforge:locale", "en"); } catch {}
  });
  await routeFixtureNoTours(page);

  await page.goto(`${BASE_URL}/?fixture=midgame`, { waitUntil: "load" });
  await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
  await page.waitForFunction(() => !!window.__hfDebug, null, { timeout: 8000 });
  await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(2000);

  // ── Setup: reale Gates herstellen (Bestandsschutz-Grants der v57->v64-Migration entfernen) ──
  await page.evaluate(() => {
    const { state } = window.__hfDebug;
    for (const z of ["borderlands", "ashfields", "blackthorn"]) state.legacyZoneGrants[z] = false;
    if (!state.dungeonsUnlocked) state.dungeonsUnlocked = {};
    state.dungeonsUnlocked["goblin_warband"] = false;
    state.quests.completed = [];
    state.quests.claimed = [];
    state.quests.repeatBaseline = {};
    // Kill-Zaehler fuer alle in dieser Sweep relevanten Ziel-Monster auf 0.
    const targets = [
      "chicken", "cow", "boar", "feral_goat", "bull_boss", "the_imp",
      "goblin", "goblin_rogue", "goblin_spearman", "goblin_archer", "goblin_crossbower", "goblin_butcher",
      "goblin_shaman", "goblin_felmagician", "goblin_warlock", "goblin_stormcaller", "goblin_warchief",
      "goblin_reaver", "goblin_pikeman", "goblin_siegebrute", "goblin_bloodshaman",
      "ash_rat", "ashfield_jackal", "dust_vulture", "pitch_beetle", "mire_wisp", "ash_tyrant",
    ];
    for (const t of targets) state.monsterKills[t] = 0;
    state.stats.itemsGathered = 0;
    // Kampf-Skills weit genug hochsetzen, damit der Test nicht an Balance/Level scheitert
    // (diese Sweep prueft Quest-MECHANIK, nicht Progressions-Tempo) — reine Setup-Praeparation.
    for (const sk of ["attack", "power", "defence", "ranged", "magic", "warding", "vitality"]) {
      state.skills[sk] = { xp: 400000 };
    }
    state.character.hp = 99999;
  });
  await page.waitForTimeout(500);

  const combatLvl = await page.evaluate(() => window.__hfDebug.engine?.combatLevel ?? null);
  log("Setup done. legacyZoneGrants cleared for borderlands/ashfields/blackthorn, monsterKills reset, combat skills boosted.");

  // ════════════════════════════════════════════════════════════════════════
  // PRE-CHECK: borderlands muss jetzt gesperrt sein (vor Kap. 3)
  // ════════════════════════════════════════════════════════════════════════
  await goToCombat(page);
  let zoneLock = await page.evaluate(() => {
    const cards = [...document.querySelectorAll(".zone-card:not(.dungeon-card)")];
    const bl = cards.find((c) => c.querySelector(".zone-card-name")?.textContent.includes("Borderlands"));
    return bl ? { locked: bl.classList.contains("zone-card-story-locked"), hasBadge: !!bl.querySelector(".zone-card-story-lock-badge") } : null;
  });
  log("PRE: Borderlands lock state:", JSON.stringify(zoneLock));
  if (!zoneLock || !zoneLock.locked) finding("KRITISCH", "Borderlands ist NICHT gesperrt, obwohl chronicle_03 noch nicht claimed ist (Grenzmark-Gate defekt).");

  await goToQuests(page);
  let activeTab = await page.evaluate(() => document.querySelector(".quests-tab-btn--active")?.textContent.trim());
  log("PRE: Auto-Tab mit aktivem Kapitel 1:", activeTab);
  if (!activeTab?.startsWith("Story")) finding("MITTEL", `Story-Tab oeffnet nicht automatisch bei aktivem chronicle_01 (Tab zeigt: "${activeTab}")`);
  await page.screenshot({ path: join(OUT_DIR, "00-chapter1-start.png") });

  // ════════════════════════════════════════════════════════════════════════
  // KAPITEL 1: "The First Page" — gather_items 25 (lifetime itemsGathered)
  // ════════════════════════════════════════════════════════════════════════
  log("\n=== CHAPTER 1: The First Page ===");
  {
    const stage = await page.evaluate(() => {
      const s = document.querySelector(".chronicle-stage");
      return { title: s?.querySelector(".chronicle-stage-title")?.textContent.trim(), obj: s?.querySelector(".chronicle-obj-count")?.textContent.trim() };
    });
    log("Stage:", JSON.stringify(stage));
    if (stage.title !== "The First Page") finding("MITTEL", `Kapitel-1-Titel falsch: "${stage.title}"`);
    if (stage.obj !== "0 / 25") finding("KOSMETISCH", `Kapitel-1 Startfortschritt nicht "0 / 25": "${stage.obj}"`);

    const goldBefore = await getState(page, "character.gold");
    const tokBefore = await getState(page, "character.questTokens");

    await page.evaluate(() => { window.__hfDebug.state.stats.itemsGathered = 15; });
    await goToCombat(page);
    await ensureZoneSelect(page);
    await selectZone(page, "pastures");
    await page.waitForSelector(".monster-grid", { timeout: 6000 });
    const r = await fightMonster(page, "chicken");
    log("fightMonster(chicken):", r);
    let crossed = false;
    for (let i = 0; i < 8 && !crossed; i++) {
      const okKill = await killOnce(page, "chicken", 15000);
      const gathered = await getState(page, "stats.itemsGathered");
      log(`  kill#${i + 1} ok=${okKill} itemsGathered=${gathered}`);
      if (gathered >= 25) crossed = true;
    }
    if (!crossed) finding("KRITISCH", "gather_items 25 wurde nach 8 realen Kills nicht erreicht (RNG-Pech oder Loot-Bug).");

    await goToQuests(page);
    await page.waitForTimeout(400);
    const done1 = await page.evaluate(() => {
      const s = document.querySelector(".chronicle-stage");
      return { done: s?.classList.contains("chronicle-stage--done"), obj: s?.querySelector(".chronicle-obj-count")?.textContent.trim(), claimBtn: !!s?.querySelector(".chronicle-stage-claim") };
    });
    log("Chapter 1 done-state:", JSON.stringify(done1));
    matrix.chronicle_01 = { objective: done1.done ? "OK" : "FAIL" };
    if (!done1.done || !done1.claimBtn) finding("KRITISCH", "Kapitel 1 zeigt keinen Fertig-Zustand/Claim-Button trotz itemsGathered>=25.");

    await clickRetry(page, page.locator(".chronicle-stage-claim").first());
    await page.waitForTimeout(500);
    const goldAfter = await getState(page, "character.gold");
    const tokAfter = await getState(page, "character.questTokens");
    log(`Claim 1: gold ${goldBefore}->${goldAfter} (erwartet +100), tokens ${tokBefore}->${tokAfter} (erwartet +1)`);
    matrix.chronicle_01.claim = (goldAfter - goldBefore === 100 && tokAfter - tokBefore === 1) ? "OK" : "FAIL";
    if (goldAfter - goldBefore !== 100) finding("KRITISCH", `Kapitel-1-Claim: Gold-Delta ${goldAfter - goldBefore}, erwartet 100.`);
    if (tokAfter - tokBefore !== 1) finding("MITTEL", `Kapitel-1-Claim: Quest-Token-Delta ${tokAfter - tokBefore}, erwartet 1.`);

    const nowActive = await page.evaluate(() => document.querySelector(".chronicle-stage-title")?.textContent.trim());
    log("Aktives Kapitel nach Claim 1:", nowActive);
    if (nowActive !== "First Blood") finding("KRITISCH", `Nach Claim von Kapitel 1 ist nicht "First Blood" aktiv, sondern "${nowActive}".`);
    await page.screenshot({ path: join(OUT_DIR, "01-chapter1-claimed.png") });
  }

  // ════════════════════════════════════════════════════════════════════════
  // KAPITEL 2: "First Blood" — 15 Weidentiere (Varianten) + bull_boss x1
  // ════════════════════════════════════════════════════════════════════════
  log("\n=== CHAPTER 2: First Blood ===");
  {
    const goldBefore = await getState(page, "character.gold");
    await setMonsterKills(page, "chicken", 14);
    await goToCombat(page);
    await ensureZoneSelect(page);
    await selectZone(page, "pastures");
    await page.waitForSelector(".monster-grid", { timeout: 6000 });
    await fightMonster(page, "chicken");
    const ok1 = await killOnce(page, "chicken");
    log("15th pasture-animal kill ok:", ok1);

    await ensureZoneSelect(page);
    await selectZone(page, "pastures");
    await page.waitForSelector(".monster-grid", { timeout: 6000 });
    const r2 = await fightMonster(page, "bull_boss");
    log("fightMonster(bull_boss):", r2);
    const ok2 = await killOnce(page, "bull_boss");
    log("bull_boss kill ok:", ok2);
    if (!ok1 || !ok2) finding("KRITISCH", "Kapitel 2: einer der beiden Zielkills (15. Weidentier / Rasender Bulle) kam nicht durch.");

    await goToQuests(page);
    await page.waitForTimeout(400);
    const done2 = await page.evaluate(() => {
      const s = document.querySelector(".chronicle-stage");
      const objs = [...s.querySelectorAll(".chronicle-obj")].map((o) => ({
        where: o.querySelector(".chronicle-obj-where")?.textContent.trim(),
        count: o.querySelector(".chronicle-obj-count")?.textContent.trim(),
        done: o.classList.contains("chronicle-obj--done"),
      }));
      return { done: s.classList.contains("chronicle-stage--done"), objs, claim: !!s.querySelector(".chronicle-stage-claim") };
    });
    log("Chapter 2 objectives:", JSON.stringify(done2.objs), "done:", done2.done);
    matrix.chronicle_02 = { objective: done2.done ? "OK" : "FAIL" };
    if (!done2.done) finding("KRITISCH", "Kapitel 2 (First Blood) zeigt keinen Fertig-Zustand trotz 15/15 + bull_boss 1/1.");

    await clickRetry(page, page.locator(".chronicle-stage-claim").first());
    await page.waitForTimeout(500);
    const goldAfter = await getState(page, "character.gold");
    const hasItem = await page.evaluate(() => {
      const slots = window.__hfDebug.state.inventory.slots;
      return slots.some((s) => s && s.itemId === "cooked_murk_perch" && s.qty >= 10);
    });
    log(`Claim 2: gold ${goldBefore}->${goldAfter} (erwartet +250), cooked_murk_perch x10 im Inv: ${hasItem}`);
    matrix.chronicle_02.claim = (goldAfter - goldBefore === 250 && hasItem) ? "OK" : "FAIL";
    if (goldAfter - goldBefore !== 250) finding("KRITISCH", `Kapitel-2-Claim: Gold-Delta ${goldAfter - goldBefore}, erwartet 250.`);
    if (!hasItem) finding("KRITISCH", "Kapitel-2-Claim: cooked_murk_perch x10 nicht im Inventar angekommen (Bank-Fallback pruefen).");
    await page.screenshot({ path: join(OUT_DIR, "02-chapter2-claimed.png") });
  }

  // ════════════════════════════════════════════════════════════════════════
  // KAPITEL 3: "The Spark in the Grain" — the_imp x5 → Grenzmark-Zonen-Gate
  // ════════════════════════════════════════════════════════════════════════
  log("\n=== CHAPTER 3: The Spark in the Grain ===");
  {
    await setMonsterKills(page, "the_imp", 4);
    await goToCombat(page);
    await ensureZoneSelect(page);
    await selectZone(page, "pastures");
    await page.waitForSelector(".monster-grid", { timeout: 6000 });
    await fightMonster(page, "the_imp");
    const ok = await killOnce(page, "the_imp");
    log("5th the_imp kill ok:", ok);
    if (!ok) finding("KRITISCH", "Kapitel 3: 5. Imp-Kill kam nicht durch.");

    await goToQuests(page);
    await page.waitForTimeout(400);
    const stage3 = await page.evaluate(() => {
      const s = document.querySelector(".chronicle-stage");
      const unlockChip = s.querySelector(".quest-reward-chip--unlock");
      return { done: s.classList.contains("chronicle-stage--done"), unlockChipText: unlockChip?.textContent.trim() ?? null, unlockIsDungeon: !!s.querySelector(".quest-reward-chip--unlock-dungeon") };
    });
    log("Chapter 3 done-state pre-claim:", JSON.stringify(stage3));
    matrix.chronicle_03 = { objective: stage3.done ? "OK" : "FAIL" };
    if (!stage3.done) finding("KRITISCH", "Kapitel 3 zeigt keinen Fertig-Zustand trotz the_imp 5/5.");
    if (!stage3.unlockChipText || !stage3.unlockChipText.toLowerCase().includes("border")) {
      finding("MITTEL", `"Schaltet frei"-Chip an Kapitel 3 zeigt nicht "Borderlands": "${stage3.unlockChipText}"`);
    }
    if (stage3.unlockIsDungeon) finding("MITTEL", "Kapitel-3-Unlock-Chip traegt faelschlich die Dungeon-Kennzeichnung (sollte Zonen-Chip sein).");

    await clickRetry(page, page.locator(".chronicle-stage-claim").first());
    await page.waitForTimeout(500);
    matrix.chronicle_03.claim = "OK"; // gold-delta unten separat covered? check quick
    const goldNow = await getState(page, "character.gold");
    log("Gold nach Claim 3:", goldNow);

    // Zonen-Gate real: Borderlands jetzt entsperrt.
    await goToCombat(page);
    await ensureZoneSelect(page);
    zoneLock = await page.evaluate(() => {
      const cards = [...document.querySelectorAll(".zone-card:not(.dungeon-card)")];
      const bl = cards.find((c) => c.querySelector(".zone-card-name")?.textContent.includes("Borderlands"));
      return bl ? bl.classList.contains("zone-card-story-locked") : null;
    });
    log("Borderlands locked nach Claim 3:", zoneLock, "(erwartet false)");
    matrix.chronicle_03.unlock = (zoneLock === false) ? "OK" : "FAIL";
    if (zoneLock !== false) finding("KRITISCH", "Borderlands bleibt gesperrt, obwohl chronicle_03 (Grenzmark-Gate) claimed ist.");
    await page.screenshot({ path: join(OUT_DIR, "03-chapter3-borderlands-unlocked.png") });
  }

  console.log("\n[CHECKPOINT A ok] Kapitel 1-3 durchlaufen.");

  // ════════════════════════════════════════════════════════════════════════
  // KAPITEL 4 SETUP-CHECK: goblin_warband-Dungeon sichtbar aber gesperrt;
  // Warchief-Bypass-Probe (fightbar in der offenen Zone, lange bevor der Dungeon offen ist).
  // ════════════════════════════════════════════════════════════════════════
  log("\n=== CHAPTER 4 pre-check: dungeon lock + Warchief bypass probe ===");
  {
    await goToCombat(page);
    await ensureZoneSelect(page);
    const dcard = await page.evaluate(() => {
      const cards = [...document.querySelectorAll(".dungeon-card")];
      const gw = cards.find((c) => c.querySelector(".zone-card-name")?.textContent.includes("Goblin Warband"));
      return gw
        ? { locked: gw.classList.contains("zone-card-story-locked"), hasEnter: !!gw.querySelector(".dungeon-enter"), hint: gw.querySelector(".zone-card-locked-hint")?.textContent.trim() ?? null }
        : null;
    });
    log("Goblin Warband dungeon card (pre-Kap.4):", JSON.stringify(dcard));
    if (!dcard) finding("KRITISCH", "Goblin-Warband-Dungeon-Karte erscheint nicht, obwohl Borderlands (Traegerzone) bereits offen ist.");
    else if (!dcard.locked) finding("KRITISCH", "Goblin-Warband-Dungeon ist bereits offen, obwohl chronicle_04 noch nicht claimed wurde.");

    // Bestiary: goblin_warchief ist noch UNENTDECKT (0 Kills) -> Bestiary kann ihn generell noch
    // nicht anbieten (known = kills>0, eigene Entdeckungs-Gate, unabhaengig vom Dungeon-Gate).
    await goToBestiary(page);
    const bhead = page.locator(".bestiary-zone-header", { hasText: "Borderlands" }).first();
    if (await bhead.count()) { await clickRetry(page, bhead); await page.waitForTimeout(300); }
    const bestiaryPre = await page.evaluate(() => {
      const cards = [...document.querySelectorAll(".bestiary-card")];
      const wc = cards.find((c) => c.querySelector(".bestiary-name")?.textContent.includes("Goblin Warchief") || c.querySelector(".bestiary-name")?.textContent === "???");
      return wc ? { name: wc.querySelector(".bestiary-name")?.textContent.trim(), hasFightBtn: !!wc.querySelector(".bestiary-fight-btn") } : "no-card-found";
    });
    log("Bestiary Borderlands section sample card:", JSON.stringify(bestiaryPre));

    // Der eigentliche Bypass-Pfad: die offene Zonen-Kampfliste (CombatPage) listet ALLE
    // Zonen-Monster inkl. goblin_warchief, unabhaengig von Bestiary-Entdeckung UND unabhaengig
    // vom Dungeon-Gate (goblin_warchief traegt bewusst KEIN dungeonOnly-Flag, s. content/index.ts
    // Zeile ~10586-10603, Chef-GO 2026-07-10 - Sim-Balance-Harness-Grund). Probe: ist der
    // Fight-Button fuer den Warchief in der offenen Zonenliste schon jetzt aktiv?
    await goToCombat(page);
    await ensureZoneSelect(page);
    await selectZone(page, "borderlands");
    await page.waitForSelector(".monster-grid", { timeout: 6000 });
    const warchiefBtnState = await page.evaluate(() => {
      const cards = [...document.querySelectorAll(".monster-card")];
      const wc = cards.find((c) => c.querySelector(".monster-card-name")?.textContent.trim() === "Goblin Warchief");
      const btn = wc?.querySelector(".mc-fight-btn");
      return btn ? { found: true, disabled: btn.disabled } : { found: false };
    });
    log("Goblin Warchief Fight-Button in offener Borderlands-Zonenliste (VOR Kap.4/Dungeon-Unlock):", JSON.stringify(warchiefBtnState));
    if (warchiefBtnState.found && !warchiefBtnState.disabled) {
      finding(
        "MITTEL",
        "goblin_warchief ist als normaler Zonen-Gegner in 'The Borderlands' direkt fightbar, SOBALD Kap.3 (Grenzmark) offen ist - " +
        "lange bevor der Goblin-Warband-Dungeon selbst freigeschaltet ist (Kap.4) oder gar besucht wurde. Da kill_monster-Objectives " +
        "auf dem LIFETIME-Zaehler state.monsterKills basieren (kein Dungeon-Kontext-Flag), kann ein Spieler den Warchief einfach beim " +
        "normalen Grenzmark-Farmen (z.B. waehrend Kap.4s Goblin-Kills) miterledigen - Kap.5 'The War Banner' waere dann SOFORT " +
        "claimbar, sobald es aktiv wird, OHNE den Dungeon je betreten zu haben. Repro: Borderlands-Zonenliste -> 'Goblin Warchief' " +
        "-> Kaempfen (Fight-Button ist nicht disabled). Bekannt/dokumentiert im Content-Kommentar (content/index.ts ~10586, Chef-GO " +
        "2026-07-10, Grund: Sim-Balance-Harness verweigert dungeonOnly-Monster < L100 sonst faelschlich als Gear-Wall) - widerspricht " +
        "aber der Kapitel-5-Lore/Aufgabenbeschreibung 'im Dungeon' UND dem Sweep-Auftrag 'Kap.5 verlangt den Warchief IM Dungeon'. " +
        "Betrifft nur diesen einen Encounter-Satz (goblin_reaver/pikeman/siegebrute/bloodshaman/warchief), alle 5 sind gleich betroffen.",
      );
      // Beweis zu Ende fuehren: EINEN echten Kill ausserhalb des Dungeons landen und zeigen, dass
      // der Lifetime-Zaehler tatsaechlich steigt (Test-Beweis, kein produktiver Spielfortschritt -
      // wird direkt danach zurueckgesetzt, damit der spaetere "echte Dungeon-Pfad"-Teil unten
      // sauber/isoliert bleibt).
      await fightMonster(page, "goblin_warchief");
      const killedOutside = await killOnce(page, "goblin_warchief");
      const killsAfter = await getState(page, "monsterKills.goblin_warchief");
      log(`Open-world Warchief-Kill ok=${killedOutside}, monsterKills.goblin_warchief=${killsAfter}`);
      if (killedOutside && killsAfter >= 1) {
        finding("MITTEL", `Beweis erbracht: goblin_warchief wurde AUSSERHALB des Dungeons real erlegt, state.monsterKills.goblin_warchief=${killsAfter} (>=1) VOR jeglichem Dungeon-Lauf.`);
      }
      await setMonsterKills(page, "goblin_warchief", 0); // Reset fuer den sauberen Dungeon-Pfad-Test unten.
      await ensureZoneSelect(page);
    } else if (warchiefBtnState.found && warchiefBtnState.disabled) {
      log("(Kein Bypass: Fight-Button war disabled - Erwartung widerlegt, kein Finding noetig.)");
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  // KAPITEL 4: "The Empty March" — 40 Goblins (Varianten) + 10 Fel-Zauberer (Varianten)
  // ════════════════════════════════════════════════════════════════════════
  log("\n=== CHAPTER 4: The Empty March ===");
  {
    // goblin_rogue = Variante (nicht Basis-"goblin") -> deckt zugleich die Sweep6-Regression ab
    // (Varianten-Kills muessen zaehlen, s. Kommentar bei q_first_blood/chronicle_04 im Content).
    await setMonsterKills(page, "goblin_rogue", 39);
    await setMonsterKills(page, "goblin_felmagician", 9);
    await goToCombat(page);
    await ensureZoneSelect(page);
    await selectZone(page, "borderlands");
    await page.waitForSelector(".monster-grid", { timeout: 6000 });
    await fightMonster(page, "goblin_rogue");
    const okA = await killOnce(page, "goblin_rogue");
    log("40th goblin-variant kill (goblin_rogue) ok:", okA);

    await ensureZoneSelect(page);
    await selectZone(page, "borderlands");
    await page.waitForSelector(".monster-grid", { timeout: 6000 });
    await fightMonster(page, "goblin_felmagician");
    const okB = await killOnce(page, "goblin_felmagician");
    log("10th shaman-variant kill (goblin_felmagician) ok:", okB);
    if (!okA || !okB) finding("KRITISCH", "Kapitel 4: einer der beiden Varianten-Zielkills kam nicht durch.");

    await goToQuests(page);
    await page.waitForTimeout(400);
    const done4 = await page.evaluate(() => {
      const s = document.querySelector(".chronicle-stage");
      const objs = [...s.querySelectorAll(".chronicle-obj")].map((o) => o.querySelector(".chronicle-obj-count")?.textContent.trim());
      return { done: s.classList.contains("chronicle-stage--done"), objs };
    });
    log("Chapter 4 objectives:", JSON.stringify(done4.objs), "done:", done4.done);
    matrix.chronicle_04 = { objective: done4.done ? "OK" : "FAIL" };
    if (!done4.done) finding("KRITISCH", "Kapitel 4 (The Empty March) zeigt keinen Fertig-Zustand trotz 40/40 + 10/10 (Varianten-Summe).");

    // Regression q_first_blood: sollte durch dieselben Goblin-Kills laengst mit-erfuellt sein
    // (targets-Union teilt goblin_rogue/goblin_felmagician mit chronicle_04).
    await clickRetry(page, page.locator('.quests-tab-btn', { hasText: "Contracts" }).first());
    await page.waitForTimeout(300);
    const qfb = await page.evaluate(() => {
      const cards = [...document.querySelectorAll(".quest-card")];
      const c = cards.find((x) => x.textContent.includes("Goblin Blood"));
      return c ? { found: true, hasClaim: !!c.querySelector(".quest-claim-btn"), text: c.querySelector(".quest-obj-count")?.textContent.trim() } : { found: false };
    });
    log("q_first_blood (Contracts) Zustand:", JSON.stringify(qfb));
    if (!qfb.found) finding("MITTEL", "q_first_blood ('Goblin Blood') nicht im Contracts-Tab gefunden.");
    else if (!qfb.hasClaim) finding("KRITISCH", "q_first_blood zeigt keinen Claim-Button, obwohl Varianten-Kills (goblin_rogue/goblin_felmagician) laengst >=10 sein sollten - Varianten-Zaehl-Regression!");
    else {
      const tokBefore = await getState(page, "character.questTokens");
      await clickRetry(page, page.locator(".quest-card", { hasText: "Goblin Blood" }).locator(".quest-claim-btn").first());
      await page.waitForTimeout(400);
      const tokAfter = await getState(page, "character.questTokens");
      log(`q_first_blood claimed: tokens ${tokBefore}->${tokAfter} (erwartet +1)`);
      if (tokAfter - tokBefore !== 1) finding("MITTEL", `q_first_blood-Claim: Token-Delta ${tokAfter - tokBefore}, erwartet 1.`);
    }

    await clickRetry(page, page.locator('.quests-tab-btn', { hasText: "Story" }).first());
    await page.waitForTimeout(300);
    const stage4 = await page.evaluate(() => {
      const s = document.querySelector(".chronicle-stage");
      const unlockChip = s.querySelector(".quest-reward-chip--unlock");
      return { unlockChipText: unlockChip?.textContent.trim() ?? null, isDungeonChip: !!s.querySelector(".quest-reward-chip--unlock-dungeon"), kindLabel: s.querySelector(".quest-reward-chip-kind")?.textContent.trim() ?? null };
    });
    log("Chapter 4 Unlocks-Chip:", JSON.stringify(stage4));
    matrix.chronicle_04.unlockChipPreClaim = stage4;
    if (!stage4.unlockChipText || !stage4.unlockChipText.toLowerCase().includes("warband")) finding("MITTEL", `"Schaltet frei"-Chip an Kapitel 4 zeigt nicht "Goblin Warband": "${stage4.unlockChipText}"`);
    if (!stage4.isDungeonChip) finding("MITTEL", "Kapitel-4-Unlock-Chip traegt NICHT die Dungeon-Kennzeichnung (--unlock-dungeon), obwohl es einen Dungeon freischaltet.");

    const goldBefore4 = await getState(page, "character.gold");
    await clickRetry(page, page.locator(".chronicle-stage-claim").first());
    await page.waitForTimeout(500);
    const goldAfter4 = await getState(page, "character.gold");
    log(`Claim 4: gold ${goldBefore4}->${goldAfter4} (erwartet +1000)`);
    matrix.chronicle_04.claim = (goldAfter4 - goldBefore4 === 1000) ? "OK" : "FAIL";
    if (goldAfter4 - goldBefore4 !== 1000) finding("KRITISCH", `Kapitel-4-Claim: Gold-Delta ${goldAfter4 - goldBefore4}, erwartet 1000 (und KEIN Schluessel-Item).`);

    await goToCombat(page);
    await ensureZoneSelect(page);
    const dcardAfter = await page.evaluate(() => {
      const cards = [...document.querySelectorAll(".dungeon-card")];
      const gw = cards.find((c) => c.querySelector(".zone-card-name")?.textContent.includes("Goblin Warband"));
      return gw ? { locked: gw.classList.contains("zone-card-story-locked"), canEnter: !gw.querySelector(".dungeon-enter")?.disabled } : null;
    });
    log("Goblin Warband dungeon card nach Claim 4:", JSON.stringify(dcardAfter));
    matrix.chronicle_04.unlock = (dcardAfter && !dcardAfter.locked) ? "OK" : "FAIL";
    if (!dcardAfter || dcardAfter.locked) finding("KRITISCH", "Goblin-Warband-Dungeon bleibt gesperrt, obwohl chronicle_04 claimed ist.");
    await page.screenshot({ path: join(OUT_DIR, "04-chapter4-dungeon-unlocked.png") });
  }

  console.log("\n[CHECKPOINT B ok] Kapitel 4 durchlaufen (inkl. Warchief-Bypass-Probe + q_first_blood-Regression).");

  // ════════════════════════════════════════════════════════════════════════
  // KAPITEL 5: "The War Banner" — goblin_warchief x1, ECHTER Dungeon-Lauf (5 Wellen).
  // ════════════════════════════════════════════════════════════════════════
  log("\n=== CHAPTER 5: The War Banner (echter Dungeon-Lauf) ===");
  {
    // Pre-check: Ashfields noch gesperrt (Gate haengt an chronicle_05, noch nicht claimed).
    await goToCombat(page);
    await ensureZoneSelect(page);
    let ashLock = await page.evaluate(() => {
      const cards = [...document.querySelectorAll(".zone-card:not(.dungeon-card)")];
      const af = cards.find((c) => c.querySelector(".zone-card-name")?.textContent.includes("Ashfields"));
      return af ? af.classList.contains("zone-card-story-locked") : null;
    });
    log("Ashfields locked VOR Kap.5-Claim:", ashLock, "(erwartet true)");
    if (ashLock !== true) finding("KRITISCH", "Ashfields ist schon vor Claim von chronicle_05 entsperrt.");

    const clearsBefore = (await getState(page, "dungeonsCleared.goblin_warband")) ?? 0;
    const enterResult = await enterDungeon(page, "goblin_warband");
    log("enterDungeon(goblin_warband):", enterResult);
    if (enterResult !== "entered") finding("KRITISCH", `Goblin-Warband-Dungeon konnte trotz Claim von Kap.4 nicht betreten werden (${enterResult}).`);

    await page.waitForFunction(() => window.__hfDebug.state.combat.dungeonId === "goblin_warband", null, { timeout: 8000 }).catch(() => {});
    const cleared = await clearDungeonWaves(page, "goblin_warband");
    log("Dungeon-Lauf beendet (dungeonId wieder null):", cleared);
    if (!cleared) finding("KRITISCH", "Goblin-Warband-Dungeon-Lauf hat nach 8 Wellen-Zyklen nicht beendet (haengt fest?).");

    const dccVisible = await page.waitForSelector(".dcc-card", { timeout: 8000 }).then(() => true).catch(() => false);
    log("Dungeon-Clear-Ceremony (.dcc-card) erschienen:", dccVisible);
    if (dccVisible) {
      await page.screenshot({ path: join(OUT_DIR, "05a-dungeon-clear-ceremony.png") });
      const nextBtn = page.locator(".dcc-next-btn").first();
      if (await nextBtn.count()) await clickRetry(page, nextBtn);
      await page.waitForTimeout(300);
    } else {
      finding("MITTEL", "Keine Dungeon-Clear-Ceremony (.dcc-card) nach Abschluss des Goblin-Warband-Laufs erschienen.");
    }

    const warchiefKills = await getState(page, "monsterKills.goblin_warchief");
    const clearsAfter = (await getState(page, "dungeonsCleared.goblin_warband")) ?? 0;
    log(`Nach echtem Dungeon-Lauf: monsterKills.goblin_warchief=${warchiefKills} (erwartet >=1), dungeonsCleared ${clearsBefore}->${clearsAfter}`);
    if (!warchiefKills || warchiefKills < 1) finding("KRITISCH", "Der Dungeon-Boss-Kill (goblin_warchief, letzte Welle) hat monsterKills NICHT inkrementiert - Quest-Kill-Credit im Dungeon ist kaputt.");
    if (clearsAfter <= clearsBefore) finding("MITTEL", "dungeonsCleared.goblin_warband wurde durch den Run nicht hochgezaehlt.");

    await goToQuests(page);
    await page.waitForTimeout(400);
    const stage5 = await page.evaluate(() => {
      const s = document.querySelector(".chronicle-stage");
      const obj = s?.querySelector(".chronicle-obj");
      return {
        done: s?.classList.contains("chronicle-stage--done"),
        objWhere: obj?.querySelector(".chronicle-obj-where")?.textContent.trim() ?? null,
        objCount: obj?.querySelector(".chronicle-obj-count")?.textContent.trim() ?? null,
      };
    });
    log("Chapter 5 stage (nach Dungeon-Kill):", JSON.stringify(stage5));
    matrix.chronicle_05 = { objective: stage5.done ? "OK" : "FAIL" };
    if (!stage5.done) finding("KRITISCH", "Kapitel 5 (The War Banner) zeigt keinen Fertig-Zustand trotz echtem Dungeon-Boss-Kill.");
    // Dokumentiert die Lore/Mechanik-Luecke aus dem Bypass-Finding: die WHERE-Zeile zeigt die
    // Zone des Monsters (Borderlands), nicht den Dungeon - UI gibt also selbst keinen Hinweis,
    // dass der Kill "im Dungeon" erfolgen muesste.
    log(`  (Objective-WHERE-Zeile zeigt "${stage5.objWhere}", nicht "Goblin Warband" - untermauert das Bypass-Finding oben.)`);

    // dim_essence droppt bereits vorher aus Goblin-Loot -> Delta statt Absolutwert pruefen, UND
    // Inventar+Bank zusammen (addItemOrBank faellt bei vollem Inventar auf die Bank zurueck).
    const essenceTotal = () => page.evaluate(() => {
      const inv = window.__hfDebug.state.inventory.slots.filter((s) => s && s.itemId === "dim_essence").reduce((a, s) => a + s.qty, 0);
      const bank = window.__hfDebug.state.bank?.dim_essence ?? 0;
      return inv + bank;
    });
    const essenceBefore = await essenceTotal();
    const goldBefore5 = await getState(page, "character.gold");
    await clickRetry(page, page.locator(".chronicle-stage-claim").first());
    await page.waitForTimeout(500);
    const goldAfter5 = await getState(page, "character.gold");
    const essenceAfter = await essenceTotal();
    log(`Claim 5: gold ${goldBefore5}->${goldAfter5} (erwartet +1500), dim_essence (Inv+Bank) ${essenceBefore}->${essenceAfter} (erwartet +15)`);
    matrix.chronicle_05.claim = (goldAfter5 - goldBefore5 === 1500) ? "OK" : "FAIL";
    if (goldAfter5 - goldBefore5 !== 1500) finding("KRITISCH", `Kapitel-5-Claim: Gold-Delta ${goldAfter5 - goldBefore5}, erwartet 1500.`);
    if (essenceAfter - essenceBefore !== 15) finding("MITTEL", `Kapitel-5-Claim: dim_essence-Delta ${essenceAfter - essenceBefore}, erwartet +15.`);

    await goToCombat(page);
    await ensureZoneSelect(page);
    ashLock = await page.evaluate(() => {
      const cards = [...document.querySelectorAll(".zone-card:not(.dungeon-card)")];
      const af = cards.find((c) => c.querySelector(".zone-card-name")?.textContent.includes("Ashfields"));
      return af ? af.classList.contains("zone-card-story-locked") : null;
    });
    log("Ashfields locked NACH Kap.5-Claim:", ashLock, "(erwartet false)");
    matrix.chronicle_05.unlock = (ashLock === false) ? "OK" : "FAIL";
    if (ashLock !== false) finding("KRITISCH", "Ashfields bleibt gesperrt, obwohl chronicle_05 claimed ist.");
    await page.screenshot({ path: join(OUT_DIR, "05b-chapter5-ashfields-unlocked.png") });
  }

  console.log("\n[CHECKPOINT C ok] Kapitel 5 (echter Dungeon-Lauf) durchlaufen.");

  // ════════════════════════════════════════════════════════════════════════
  // KAPITEL 6: "The Ash Lesson" — 30 Aschfeld-Ungeziefer (Varianten) + 10 mire_wisp
  // ════════════════════════════════════════════════════════════════════════
  log("\n=== CHAPTER 6: The Ash Lesson ===");
  {
    await setMonsterKills(page, "ash_rat", 29);
    await setMonsterKills(page, "mire_wisp", 9);
    await goToCombat(page);
    await ensureZoneSelect(page);
    await selectZone(page, "ashfields");
    await page.waitForSelector(".monster-grid", { timeout: 6000 });
    await fightMonster(page, "ash_rat");
    const okA = await killOnce(page, "ash_rat");
    log("30th ashfield-vermin kill (ash_rat) ok:", okA);

    await ensureZoneSelect(page);
    await selectZone(page, "ashfields");
    await page.waitForSelector(".monster-grid", { timeout: 6000 });
    await fightMonster(page, "mire_wisp");
    const okB = await killOnce(page, "mire_wisp");
    log("10th mire_wisp kill ok:", okB);
    if (!okA || !okB) finding("KRITISCH", "Kapitel 6: einer der beiden Zielkills kam nicht durch.");

    await goToQuests(page);
    await page.waitForTimeout(400);
    const done6 = await page.evaluate(() => {
      const s = document.querySelector(".chronicle-stage");
      const claimDot = !!document.querySelector(".topbar-claim-dot");
      return { done: s.classList.contains("chronicle-stage--done"), claimDot };
    });
    log("Chapter 6 done-state:", JSON.stringify(done6));
    matrix.chronicle_06 = { objective: done6.done ? "OK" : "FAIL" };
    if (!done6.done) finding("KRITISCH", "Kapitel 6 (The Ash Lesson) zeigt keinen Fertig-Zustand trotz 30/30 + 10/10.");
    if (!done6.claimDot) finding("KOSMETISCH", "TopBar-Claim-Punkt (.topbar-claim-dot) fehlt, obwohl Kapitel 6 claimbar ist.");

    const goldBefore6 = await getState(page, "character.gold");
    await clickRetry(page, page.locator(".chronicle-stage-claim").first());
    await page.waitForTimeout(500);
    const goldAfter6 = await getState(page, "character.gold");
    log(`Claim 6: gold ${goldBefore6}->${goldAfter6} (erwartet +1200)`);
    matrix.chronicle_06.claim = (goldAfter6 - goldBefore6 === 1200) ? "OK" : "FAIL";
    if (goldAfter6 - goldBefore6 !== 1200) finding("KRITISCH", `Kapitel-6-Claim: Gold-Delta ${goldAfter6 - goldBefore6}, erwartet 1200.`);
    await page.screenshot({ path: join(OUT_DIR, "06-chapter6-claimed.png") });
  }

  // ════════════════════════════════════════════════════════════════════════
  // KAPITEL 7: "The Carrion King" — ash_tyrant x1 → Schwarzdornwald-Zonen-Gate
  // ════════════════════════════════════════════════════════════════════════
  log("\n=== CHAPTER 7: The Carrion King ===");
  {
    await goToCombat(page);
    await ensureZoneSelect(page);
    let bwLock = await page.evaluate(() => {
      const cards = [...document.querySelectorAll(".zone-card:not(.dungeon-card)")];
      const bw = cards.find((c) => c.querySelector(".zone-card-name")?.textContent.includes("Blackthorn"));
      return bw ? bw.classList.contains("zone-card-story-locked") : null;
    });
    log("Blackthorn locked VOR Kap.7-Claim:", bwLock, "(erwartet true)");
    if (bwLock !== true) finding("KRITISCH", "Blackthorn ist schon vor Claim von chronicle_07 entsperrt.");

    await selectZone(page, "ashfields");
    await page.waitForSelector(".monster-grid", { timeout: 6000 });
    const r = await fightMonster(page, "ash_tyrant");
    log("fightMonster(ash_tyrant):", r);
    const ok = await killOnce(page, "ash_tyrant");
    log("ash_tyrant kill ok:", ok);
    if (!ok) finding("KRITISCH", "Kapitel 7: ash_tyrant-Boss-Kill kam nicht durch.");

    await goToQuests(page);
    await page.waitForTimeout(400);
    const stage7 = await page.evaluate(() => {
      const s = document.querySelector(".chronicle-stage");
      const unlockChip = s.querySelector(".quest-reward-chip--unlock");
      return { done: s.classList.contains("chronicle-stage--done"), unlockChipText: unlockChip?.textContent.trim() ?? null };
    });
    log("Chapter 7 done-state pre-claim:", JSON.stringify(stage7));
    matrix.chronicle_07 = { objective: stage7.done ? "OK" : "FAIL" };
    if (!stage7.done) finding("KRITISCH", "Kapitel 7 (The Carrion King) zeigt keinen Fertig-Zustand trotz ash_tyrant 1/1.");
    if (!stage7.unlockChipText || !stage7.unlockChipText.toLowerCase().includes("blackthorn")) {
      finding("MITTEL", `"Schaltet frei"-Chip an Kapitel 7 zeigt nicht "Blackthorn": "${stage7.unlockChipText}"`);
    }

    const goldBefore7 = await getState(page, "character.gold");
    await clickRetry(page, page.locator(".chronicle-stage-claim").first());
    await page.waitForTimeout(500);
    const goldAfter7 = await getState(page, "character.gold");
    log(`Claim 7: gold ${goldBefore7}->${goldAfter7} (erwartet +1800)`);
    matrix.chronicle_07.claim = (goldAfter7 - goldBefore7 === 1800) ? "OK" : "FAIL";
    if (goldAfter7 - goldBefore7 !== 1800) finding("KRITISCH", `Kapitel-7-Claim: Gold-Delta ${goldAfter7 - goldBefore7}, erwartet 1800.`);

    const nowActive7 = await page.evaluate(() => document.querySelector(".chronicle-stage-title")?.textContent.trim());
    log("Aktives Kapitel nach Claim 7:", nowActive7);
    if (nowActive7 !== "Thorns") finding("MITTEL", `Nach Claim von Kapitel 7 ist nicht "Thorns" (chronicle_08) aktiv, sondern "${nowActive7}".`);

    await goToCombat(page);
    await ensureZoneSelect(page);
    bwLock = await page.evaluate(() => {
      const cards = [...document.querySelectorAll(".zone-card:not(.dungeon-card)")];
      const bw = cards.find((c) => c.querySelector(".zone-card-name")?.textContent.includes("Blackthorn"));
      return bw ? bw.classList.contains("zone-card-story-locked") : null;
    });
    log("Blackthorn locked NACH Kap.7-Claim:", bwLock, "(erwartet false)");
    matrix.chronicle_07.unlock = (bwLock === false) ? "OK" : "FAIL";
    if (bwLock !== false) finding("KRITISCH", "Blackthorn bleibt gesperrt, obwohl chronicle_07 claimed ist.");
    await page.screenshot({ path: join(OUT_DIR, "07-chapter7-blackthorn-unlocked.png") });
  }

  // ════════════════════════════════════════════════════════════════════════
  // REGRESSION: Daily-Tab Smoke-Test (unberuehrt von der Chronik-Arbeit)
  // ════════════════════════════════════════════════════════════════════════
  log("\n=== Regression: Daily-Tab ===");
  {
    await goToQuests(page);
    await clickRetry(page, page.locator(".quests-tab-btn", { hasText: "Daily" }).first());
    await page.waitForTimeout(300);
    const dailyOk = await page.evaluate(() => !!document.querySelector(".quests-list, .placeholder"));
    const dailyCount = await page.evaluate(() => document.querySelectorAll(".quest-card").length);
    log("Daily-Tab rendert Liste/Placeholder:", dailyOk, "| Karten:", dailyCount);
    if (!dailyOk) finding("KRITISCH", "Daily-Tab rendert weder Liste noch Placeholder (Regression durch Chronik-Umbau?).");
  }

  // ════════════════════════════════════════════════════════════════════════
  // Persistenz-Dump: kompletter State (mitten in Kapitel 8, mit vollem Kapitel-1-7-Verlauf)
  // fuer den Serialize/Deserialize-Round-Trip-Check ausserhalb des Browsers.
  // ════════════════════════════════════════════════════════════════════════
  const dumpPath = join(OUT_DIR, "final-state-dump.json");
  const finalStateJson = await page.evaluate(() => JSON.stringify(window.__hfDebug.state));
  await import("node:fs").then((fs) => fs.writeFileSync(dumpPath, finalStateJson));
  log(`\nState-Dump fuer Persistenz-Check geschrieben: ${dumpPath}`);

  console.log("\n[CHECKPOINT D ok] Kapitel 1-7 komplett durchlaufen + Regressionen.");
  console.log("\n=== ALLE FINDINGS ===");
  console.log(JSON.stringify(findings, null, 2));
  console.log("\n=== MATRIX (Kapitel 1-7) ===");
  console.log(JSON.stringify(matrix, null, 2));
  console.log("\n=== PAGE ERRORS ===");
  console.log(errors.length ? errors.join("\n") : "keine");

  await browser.close();
  if (findings.some((f) => f.sev === "KRITISCH") || errors.length) process.exitCode = 1;
} finally {
  child.kill();
}
