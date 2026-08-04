#!/usr/bin/env node
/**
 * TESTER 2 ("Der Kämpfer") — Härtefälle am neuen Arena-Kampf-Screen:
 *  (A) BEIDE Seiten gleichzeitig: 2+ Buffs (Spieler) + Pet + Debuffs auf Spieler UND Gegner →
 *      Ecken (Debuff ↗, Buff-Mini-Chips ↙, Pet ↘) kollisionsfrei? Porträts unverändert groß
 *      ggü. einem Lauf ohne Effekte?
 *  (B) Magie-Charakter (endgame-Fixture, voidcaller_staff): Mana-/Ward-Bars sichtbar, Cast-
 *      Verhalten (keine harten Layout-Brüche durch die zusätzliche Bar).
 * READ-ONLY. Port 5251.
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const CLIENT_DIR = "G:\\GameDev\\apps\\client";
const PORT = 5251;
const BASE_URL = `http://localhost:${PORT}`;
const OUT_DIR = "C:\\Users\\MSchu\\AppData\\Local\\Temp\\claude\\G--GameDev\\553d2095-3a73-4795-9782-0fe746a25f13\\scratchpad\\sweep2";

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

async function routeFixture(page, fixtureName, mutator) {
  await page.route(`**/ui-audit-fixtures/${fixtureName}.json`, async (route) => {
    const res = await route.fetch();
    const json = JSON.parse(await res.text());
    mutator(json.state);
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(json) });
  });
}

const errors = [];
function wirePage(page, tag) {
  page.on("pageerror", (e) => errors.push(`[${tag}] pageerror: ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error") errors.push(`[${tag}] console: ${m.text()}`); });
}

async function gotoCombat(page, fixtureName) {
  await page.goto(`${BASE_URL}/?fixture=${fixtureName}`, { waitUntil: "load" });
  await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
  await page.waitForTimeout(2500);
  await clickRetry(page, page.locator('[data-guide-id="sidebar.combat"]').first());
  await page.waitForTimeout(600);
}

async function startFirstFight(page) {
  await clickRetry(page, page.locator(".zone-card").first());
  await page.waitForTimeout(1000);
  await clickRetry(page, page.locator(".mc-fight-btn").first());
  await page.waitForSelector(".battle-arena", { timeout: 8000 });
  await page.waitForTimeout(1200);
}

function measure() {
  const r = (el) => (el ? { x: Math.round(el.getBoundingClientRect().x), y: Math.round(el.getBoundingClientRect().y), w: Math.round(el.getBoundingClientRect().width), h: Math.round(el.getBoundingClientRect().height) } : null);
  const playerScene = document.querySelector(".arena-side-player .fighter-scene");
  const enemyScene = document.querySelector(".arena-side-enemy .fighter-scene");
  return {
    playerScene: r(playerScene),
    enemyScene: r(enemyScene),
    buffChips: r(document.querySelector(".fighter-buff-chips")),
    buffChipCount: document.querySelectorAll(".fighter-buff-chip").length,
    pet: r(document.querySelector(".battle-pet-sprite")),
    effectOverlays: Array.from(document.querySelectorAll(".fighter-effects-overlay")).map((el) => ({
      side: el.closest(".arena-side-enemy") ? "enemy" : "player",
      ...r(el),
      chipCount: el.querySelectorAll("*").length,
    })),
    manaBar: r(document.querySelector(".arena-side-player .cbar.mana, .arena-side-player .cbar-mana")),
    wardBar: r(document.querySelector(".arena-side-player .cbar.ward, .arena-side-player .cbar-ward")),
  };
}

const problems = [];
const { child, getOutput } = startDevServer();
try {
  const ok = await waitForServer(BASE_URL);
  if (!ok) { console.error("SERVER NOT UP:\n" + getOutput()); process.exit(1); }
  const browser = await chromium.launch();

  // ── (A) Baseline ohne Effekte (Referenzgröße Porträts) ──────────────────────────────────────
  const pageBase = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  wirePage(pageBase, "base");
  await routeFixture(pageBase, "midgame", (state) => { state.character.buffs = []; });
  await gotoCombat(pageBase, "midgame");
  await startFirstFight(pageBase);
  const base = await pageBase.evaluate(measure);
  console.log("BASELINE(ohne Effekte):", JSON.stringify(base));
  await pageBase.close();

  // ── (A) Härtetest: BEIDE Seiten mit Buffs+Debuffs+Pet gleichzeitig ──────────────────────────
  const pageA = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  wirePage(pageA, "hard");
  await routeFixture(pageA, "midgame", (state) => {
    state.character.buffs = [
      { itemId: "marshroot_chowder", remainingMs: 300000 },
      { itemId: "duskfin_rangers_stew", remainingMs: 280000 },
      { itemId: "spellwarden_bisque", remainingMs: 260000 },
    ];
    state.character.companionPetId = "rotbark";
    state.character.ownedPets = { rotbark: true };
    state.combat.monsterId = "goblin_warchief";
    state.combat.enemyHp = 187;
    state.combat.playerEffects = [
      { type: "poison", remainingMs: 90000, magnitude: 1 },
      { type: "frost", remainingMs: 90000, magnitude: 1 },
    ];
    state.combat.enemyEffects = [
      { type: "bleed", remainingMs: 90000, magnitude: 2 },
      { type: "burn", remainingMs: 90000, magnitude: 2 },
      { type: "shock", remainingMs: 90000, magnitude: 1 },
    ];
  });
  await gotoCombat(pageA, "midgame");
  await pageA.waitForSelector(".battle-arena", { timeout: 8000 });
  await pageA.waitForTimeout(1200);
  const hard = await pageA.evaluate(measure);
  console.log("HÄRTETEST(beide Seiten, 3 Buffs + Pet + 2/3 Debuffs):", JSON.stringify(hard));
  await pageA.screenshot({ path: join(OUT_DIR, "11-hardcase-both-sides.png") });
  console.log("SHOT SAVED: 11-hardcase-both-sides.png");
  // Nahaufnahme Spieler-Ecke (Buff-Chips + Pet + Debuffs überlappend?).
  const playerSceneHandle = pageA.locator(".arena-side-player .fighter-scene").first();
  if (await playerSceneHandle.count() > 0) {
    await playerSceneHandle.screenshot({ path: join(OUT_DIR, "12-hardcase-player-corners.png") });
    console.log("SHOT SAVED: 12-hardcase-player-corners.png");
  }
  const enemySceneHandle = pageA.locator(".arena-side-enemy .fighter-scene").first();
  if (await enemySceneHandle.count() > 0) {
    await enemySceneHandle.screenshot({ path: join(OUT_DIR, "13-hardcase-enemy-corners.png") });
    console.log("SHOT SAVED: 13-hardcase-enemy-corners.png");
  }
  // Gezielte Nahaufnahmen der Buff-Chips + Pet — Verdacht: evtl. von der Nameplate verdeckt/abgeschnitten.
  const buffChipsHandle = pageA.locator(".fighter-buff-chips").first();
  if (await buffChipsHandle.count() > 0) {
    await buffChipsHandle.screenshot({ path: join(OUT_DIR, "12b-buff-chips-zoom.png") });
    console.log("SHOT SAVED: 12b-buff-chips-zoom.png");
  }
  const petHandle = pageA.locator(".battle-pet-sprite").first();
  if (await petHandle.count() > 0) {
    await petHandle.screenshot({ path: join(OUT_DIR, "12c-pet-zoom.png") });
    console.log("SHOT SAVED: 12c-pet-zoom.png");
  }
  // Z-Index/Überlappungs-Check: ragt die Nameplate-Box in den Buff-Chip-Bereich hinein?
  const overlapCheck = await pageA.evaluate(() => {
    const chips = document.querySelector(".fighter-buff-chips");
    const plate = document.querySelector(".arena-side-player .fighter-nameplate");
    const pet = document.querySelector(".battle-pet-sprite");
    const r = (el) => (el ? el.getBoundingClientRect() : null);
    const c = r(chips), p = r(plate), pt = r(pet);
    return {
      chipsBox: c ? { x: Math.round(c.x), y: Math.round(c.y), w: Math.round(c.width), h: Math.round(c.height) } : null,
      plateBox: p ? { x: Math.round(p.x), y: Math.round(p.y), w: Math.round(p.width), h: Math.round(p.height) } : null,
      petBox: pt ? { x: Math.round(pt.x), y: Math.round(pt.y), w: Math.round(pt.width), h: Math.round(pt.height) } : null,
      chipsOpacity: chips ? getComputedStyle(chips).opacity : null,
      petOpacity: pet ? getComputedStyle(pet).opacity : null,
      chipsZ: chips ? getComputedStyle(chips).zIndex : null,
      plateZ: plate ? getComputedStyle(plate).zIndex : null,
    };
  });
  console.log("OVERLAP-CHECK:", JSON.stringify(overlapCheck));
  if (overlapCheck.chipsBox && overlapCheck.plateBox) {
    const chipsBottom = overlapCheck.chipsBox.y + overlapCheck.chipsBox.h;
    const plateTop = overlapCheck.plateBox.y;
    if (chipsBottom > plateTop) {
      problems.push(`(A) Buff-Chips (unten bei y=${chipsBottom}) werden von der Nameplate (beginnt bei y=${plateTop}) überdeckt/abgeschnitten`);
    }
  }

  if (hard.buffChipCount < 3) problems.push(`(A) Buff-Chips fehlen (${hard.buffChipCount} < 3)`);
  if (!hard.pet) problems.push("(A) Pet-Sprite fehlt im Härtetest");
  if (hard.effectOverlays.length < 2) problems.push(`(A) Debuff-Overlays fehlen (${hard.effectOverlays.length} < 2, Spieler+Gegner erwartet)`);
  // Kollision buffChips vs Pet (beide unten, Chips links/Pet rechts erwartet).
  if (hard.buffChips && hard.pet) {
    const overlap = !(hard.buffChips.x + hard.buffChips.w < hard.pet.x || hard.pet.x + hard.pet.w < hard.buffChips.x || hard.buffChips.y + hard.buffChips.h < hard.pet.y || hard.pet.y + hard.pet.h < hard.buffChips.y);
    if (overlap) problems.push("(A) Buff-Chips und Pet-Sprite überlappen (unten links/rechts sollten getrennt sein)");
  }
  // Kollision Debuff-Overlay (Spieler, oben rechts) vs Buff-Chips (unten links) — sollte nie kollidieren,
  // aber prüfen wir trotzdem explizit, da jetzt 2 Debuffs + 3 Buffs gleichzeitig aktiv sind.
  const playerOverlay = hard.effectOverlays.find((o) => o.side === "player");
  if (playerOverlay && hard.buffChips) {
    const overlap = !(playerOverlay.x + playerOverlay.w < hard.buffChips.x || hard.buffChips.x + hard.buffChips.w < playerOverlay.x || playerOverlay.y + playerOverlay.h < hard.buffChips.y || hard.buffChips.y + hard.buffChips.h < playerOverlay.y);
    if (overlap) problems.push("(A) Spieler-Debuff-Chips kollidieren mit Buff-Chips");
  }
  // Porträt-Größe unverändert.
  if (base.playerScene && hard.playerScene) {
    const dW = Math.abs(base.playerScene.w - hard.playerScene.w);
    const dH = Math.abs(base.playerScene.h - hard.playerScene.h);
    console.log(`(A) Spieler-Szene-Δ: ${dW}px breit / ${dH}px hoch`);
    if (dW > 6 || dH > 6) problems.push(`(A) Spieler-Porträt ändert Größe durch Effekte (Δ ${dW}×${dH}px)`);
  }
  if (base.enemyScene && hard.enemyScene) {
    const dW = Math.abs(base.enemyScene.w - hard.enemyScene.w);
    const dH = Math.abs(base.enemyScene.h - hard.enemyScene.h);
    console.log(`(A) Gegner-Szene-Δ: ${dW}px breit / ${dH}px hoch`);
    if (dW > 6 || dH > 6) problems.push(`(A) Gegner-Porträt ändert Größe durch Effekte (Δ ${dW}×${dH}px)`);
  }
  await pageA.close();

  // ── (B) Magie-Charakter (endgame, voidcaller_staff) ─────────────────────────────────────────
  const pageB = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  wirePage(pageB, "magic");
  await gotoCombat(pageB, "endgame");
  await startFirstFight(pageB);
  await pageB.waitForTimeout(1500); // ein paar Cast-Zyklen abwarten.
  const magic = await pageB.evaluate(measure);
  console.log("MAGIE-CHARAKTER(endgame):", JSON.stringify(magic));
  await pageB.screenshot({ path: join(OUT_DIR, "14-magic-character.png") });
  console.log("SHOT SAVED: 14-magic-character.png");
  const manaWardScan = await pageB.evaluate(() => {
    const plate = document.querySelector(".arena-side-player .fighter-nameplate");
    const bars = plate ? Array.from(plate.querySelectorAll(".cbar")).map((b) => b.className) : [];
    return { barClasses: bars };
  });
  console.log("MANA/WARD-BAR-KLASSEN:", JSON.stringify(manaWardScan.barClasses));
  const hasManaBar = manaWardScan.barClasses.some((c) => c.includes("mana"));
  if (!hasManaBar) problems.push("(B) Mana-Bar bei Magie-Charakter (endgame) nicht gefunden");
  await pageB.close();

  console.log(problems.length ? "PROBLEME:\n- " + problems.join("\n- ") : "ALLE CHECKS GRÜN");
  console.log(errors.length ? `${errors.length} page errors:\n` + errors.slice(0, 15).join("\n") : "no page errors");
  await browser.close();
  process.exitCode = problems.length || errors.length ? 1 : 0;
} finally {
  child.kill();
}
