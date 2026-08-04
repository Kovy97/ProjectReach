#!/usr/bin/env node
/**
 * Arena-Rework-Verifikation (Chef-GO 2026-07-11 „komplettes Layout Rework" des Kampf-Screens):
 *  (1) 1920×1080: Kampf starten — kein Seiten-Scroll (.content-body overflow 0), EINE Arena
 *      (1× battle-arena, 1× Drift-Ebene, ≤1× Partikel-Canvas), Figuren messbar größer als die
 *      alte ~430px-Panel-Referenz.
 *  (2) Buff+Pet-Härtetest (Fixture-Patch): 2 Buffs à 300s + companionPet → Mini-Chips unten
 *      links AUF der Szene, Pet unten rechts, Figur-Größe unverändert vs. Lauf ohne Buffs.
 *  (3) Debuff-Check (Fixture-Patch, laufender Kampf mit Status-Effekten): Chips oben RECHTS an
 *      der jeweiligen Figur, keine Kollision mit den Buff-Chips unten links.
 *  (4) 1280×900 Kollaps-Modus: Loadout-Zeile > Arena > Log untereinander, nichts kollabiert auf 0.
 *  (5) Kill-Cooldown: Blur NUR auf der Monster-Hälfte (Spieler-Fighter ungefiltert), Karte im
 *      Gegner-Bereich sichtbar.
 * Port 5237.
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = "G:\\GameDev\\apps\\client";
const PORT = 5237;
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

/** Fixture-Patch via route: mutator(fixtureJson.state) läuft über das midgame-JSON. */
async function routeFixture(page, mutator) {
  await page.route("**/ui-audit-fixtures/midgame.json", async (route) => {
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

async function gotoCombat(page) {
  await page.goto(`${BASE_URL}/?fixture=midgame`, { waitUntil: "load" });
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
  await page.waitForTimeout(1500);
}

function measureArena() {
  const r = (el) => (el ? {
    x: Math.round(el.getBoundingClientRect().x), y: Math.round(el.getBoundingClientRect().y),
    w: Math.round(el.getBoundingClientRect().width), h: Math.round(el.getBoundingClientRect().height),
  } : null);
  const cb = document.querySelector(".content-body");
  const playerImg = document.querySelector(".arena-side-player .fighter-figure-art img");
  const enemyImg = document.querySelector(".arena-side-enemy .fighter-figure-art img");
  const playerScene = document.querySelector(".arena-side-player .fighter-scene");
  const enemyScene = document.querySelector(".arena-side-enemy .fighter-scene");
  return {
    contentBodyOverflow: cb ? cb.scrollHeight - cb.clientHeight : null,
    arenaCount: document.querySelectorAll(".battle-arena").length,
    driftCount: document.querySelectorAll(".fighter-backdrop-drift").length,
    particleCanvasCount: document.querySelectorAll(".zone-particles-canvas").length,
    arena: r(document.querySelector(".battle-arena")),
    playerScene: r(playerScene),
    enemyScene: r(enemyScene),
    playerImg: r(playerImg),
    enemyImg: r(enemyImg),
    playerPlate: r(document.querySelector(".arena-side-player .fighter-nameplate")),
    enemyPlate: r(document.querySelector(".arena-side-enemy .fighter-nameplate")),
    buffChips: r(document.querySelector(".fighter-buff-chips")),
    buffChipCount: document.querySelectorAll(".fighter-buff-chip").length,
    pet: r(document.querySelector(".battle-pet-sprite")),
    effectOverlays: Array.from(document.querySelectorAll(".fighter-effects-overlay")).map((el) => ({
      side: el.closest(".arena-side-enemy") ? "enemy" : "player",
      ...{ x: Math.round(el.getBoundingClientRect().x), y: Math.round(el.getBoundingClientRect().y), w: Math.round(el.getBoundingClientRect().width), h: Math.round(el.getBoundingClientRect().height) },
    })),
    loadoutCol: r(document.querySelector(".battle-loadout-col")),
    logPanel: r(document.querySelector(".battle-log-panel")),
    vs: r(document.querySelector(".arena-vs")),
  };
}

const problems = [];
const { child, getOutput } = startDevServer();
try {
  const ok = await waitForServer(BASE_URL);
  if (!ok) { console.error("SERVER NOT UP:\n" + getOutput()); process.exit(1); }
  const browser = await chromium.launch();

  // ── (1) Baseline 1920×1080 OHNE Buffs (für den Größenvergleich in (2)) ──────────────────────
  const pageA = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  wirePage(pageA, "A");
  await routeFixture(pageA, (state) => { state.character.buffs = []; });
  await gotoCombat(pageA);
  await startFirstFight(pageA);
  const base = await pageA.evaluate(measureArena);
  console.log("BASELINE(1920, keine Buffs):", JSON.stringify(base));
  await pageA.screenshot({ path: join(OUT_DIR, "arena-1920-baseline.png") });
  console.log("SHOT SAVED: arena-1920-baseline.png");

  if ((base.contentBodyOverflow ?? 99) > 1) problems.push(`(1) Seite scrollt bei 1920 (overflow ${base.contentBodyOverflow}px)`);
  if (base.arenaCount !== 1) problems.push(`(1) battle-arena-Anzahl ${base.arenaCount} ≠ 1`);
  if (base.driftCount > 1) problems.push(`(1) Drift-Ebene ${base.driftCount}× statt max 1×`);
  if (base.particleCanvasCount > 1) problems.push(`(1) Partikel-Canvas ${base.particleCanvasCount}× statt max 1×`);
  // Alte Referenz: fighter-figure ~430px breit (und via 42vh-Deckel ~450px hoch). „Messbar größer":
  // Fläche des Bild-Containers (Szene) je Seite deutlich über 430×450.
  const oldArea = 430 * 454;
  for (const [label, s] of [["player", base.playerScene], ["enemy", base.enemyScene]]) {
    if (!s) { problems.push(`(1) ${label}-Szene fehlt`); continue; }
    const ratio = (s.w * s.h) / oldArea;
    console.log(`(1) ${label}-Szene ${s.w}×${s.h} → ${ratio.toFixed(2)}× alte Panel-Fläche (430×454)`);
    if (ratio < 1.3) problems.push(`(1) ${label}-Szene nur ${ratio.toFixed(2)}× der alten Fläche (<1.3)`);
  }

  // ── (5) Kill-Cooldown am Baseline-Kampf (Zone 1, Monster 1 = schwach) ───────────────────────
  try {
    await pageA.waitForSelector(".battle-main .fighter.enemy.cooldown-blur", { timeout: 60000 });
    await pageA.waitForTimeout(350);
    const cd = await pageA.evaluate(() => {
      const enemy = document.querySelector(".battle-main .fighter.enemy");
      const player = document.querySelector(".arena-side-player .fighter");
      const card = document.querySelector(".kill-summary-card");
      const wrap = document.querySelector(".enemy-cooldown-wrap");
      const r = (el) => (el ? el.getBoundingClientRect() : null);
      return {
        enemyFilter: enemy ? getComputedStyle(enemy).filter : null,
        playerFilter: player ? getComputedStyle(player).filter : null,
        cardBox: card ? { x: Math.round(r(card).x), w: Math.round(r(card).width), visible: r(card).width > 100 } : null,
        wrapBox: wrap ? { x: Math.round(r(wrap).x), w: Math.round(r(wrap).width) } : null,
      };
    });
    console.log("KILL-COOLDOWN:", JSON.stringify(cd));
    await pageA.screenshot({ path: join(OUT_DIR, "arena-kill-cooldown.png") });
    console.log("SHOT SAVED: arena-kill-cooldown.png");
    if (!cd.enemyFilter || !cd.enemyFilter.includes("blur")) problems.push("(5) Gegner-Hälfte nicht geblurrt");
    if (cd.playerFilter && cd.playerFilter !== "none") problems.push(`(5) Spieler-Hälfte mitgeblurrt (filter: ${cd.playerFilter})`);
    if (!cd.cardBox || !cd.cardBox.visible) problems.push("(5) Kill-Summary-Karte fehlt/unsichtbar");
    else if (cd.wrapBox && (cd.cardBox.x < cd.wrapBox.x - 8 || cd.cardBox.x + cd.cardBox.w > cd.wrapBox.x + cd.wrapBox.w + 8)) {
      problems.push("(5) Kill-Karte ragt aus der Gegner-Hälfte");
    }
  } catch {
    problems.push("(5) Kein Kill innerhalb 60s — Kill-Cooldown nicht verifizierbar");
  }
  await pageA.close();

  // ── (2)+(3) Buff+Pet+Debuff-Härtetest: Fixture mitten im Kampf gegen goblin_warchief ────────
  const pageB = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  wirePage(pageB, "B");
  await routeFixture(pageB, (state) => {
    state.character.buffs = [
      { itemId: "marshroot_chowder", remainingMs: 300000 },
      { itemId: "duskfin_rangers_stew", remainingMs: 300000 },
    ];
    state.character.companionPetId = "rotbark";
    state.character.ownedPets = { rotbark: true };
    // Laufender Kampf mit aktiven Status-Effekten auf BEIDEN Seiten (Debuff-Ecken-Check ↗).
    state.combat.monsterId = "goblin_warchief";
    state.combat.enemyHp = 187;
    state.combat.playerEffects = [{ type: "poison", remainingMs: 90000, magnitude: 1 }];
    state.combat.enemyEffects = [
      { type: "bleed", remainingMs: 90000, magnitude: 2 },
      { type: "burn", remainingMs: 90000, magnitude: 2 },
    ];
  });
  await gotoCombat(pageB);
  await pageB.waitForSelector(".battle-arena", { timeout: 8000 });
  await pageB.waitForTimeout(1200);
  const hard = await pageB.evaluate(measureArena);
  console.log("HÄRTETEST(Buffs+Pet+Debuffs):", JSON.stringify(hard));
  await pageB.screenshot({ path: join(OUT_DIR, "arena-1920-buffs-pet-debuffs.png") });
  console.log("SHOT SAVED: arena-1920-buffs-pet-debuffs.png");

  // (2) Buff-Chips unten links AUF der Spieler-Szene, Pet unten rechts, Figur unverändert groß.
  if (hard.buffChipCount < 2) problems.push(`(2) Buff-Chips fehlen (${hard.buffChipCount} < 2)`);
  if (hard.buffChips && hard.playerScene) {
    const insideLeft = hard.buffChips.x >= hard.playerScene.x - 2 && hard.buffChips.x < hard.playerScene.x + hard.playerScene.w * 0.4;
    const nearBottom = hard.buffChips.y + hard.buffChips.h > hard.playerScene.y + hard.playerScene.h * 0.6;
    if (!insideLeft || !nearBottom) problems.push("(2) Buff-Chips nicht unten links auf der Szene");
  }
  if (!hard.pet) problems.push("(2) Pet-Sprite fehlt");
  else if (hard.playerScene) {
    const petRight = hard.pet.x + hard.pet.w / 2 > hard.playerScene.x + hard.playerScene.w * 0.5;
    const petBottom = hard.pet.y + hard.pet.h > hard.playerScene.y + hard.playerScene.h * 0.6;
    if (!petRight || !petBottom) problems.push("(2) Pet-Sprite nicht unten rechts");
  }
  if (base.playerScene && hard.playerScene) {
    const dW = Math.abs(base.playerScene.w - hard.playerScene.w);
    const dH = Math.abs(base.playerScene.h - hard.playerScene.h);
    console.log(`(2) Szene-Δ mit vs. ohne Buffs: ${dW}px breit / ${dH}px hoch`);
    if (dW > 6 || dH > 6) problems.push(`(2) Figur-Szene ändert Größe durch Buffs (Δ ${dW}×${dH}px)`);
  }
  // (3) Debuff-Overlays oben rechts an der jeweiligen Szene, keine Kollision mit Buff-Chips.
  if (hard.effectOverlays.length < 2) problems.push(`(3) Status-Overlays fehlen (${hard.effectOverlays.length} < 2)`);
  for (const ov of hard.effectOverlays) {
    const scene = ov.side === "enemy" ? hard.enemyScene : hard.playerScene;
    if (!scene) continue;
    const rightAligned = ov.x + ov.w > scene.x + scene.w * 0.6;
    const topAligned = ov.y < scene.y + scene.h * 0.3;
    if (!rightAligned || !topAligned) problems.push(`(3) ${ov.side}-Debuff-Chips nicht oben rechts (bei ${ov.x},${ov.y})`);
    if (hard.buffChips && ov.side === "player") {
      const overlap = !(ov.y + ov.h < hard.buffChips.y || hard.buffChips.y + hard.buffChips.h < ov.y || ov.x + ov.w < hard.buffChips.x || hard.buffChips.x + hard.buffChips.w < ov.x);
      if (overlap) problems.push("(3) Debuff-Chips kollidieren mit Buff-Chips");
    }
  }

  // ── (4) Kollaps-Modus 1280×900 ──────────────────────────────────────────────────────────────
  await pageB.setViewportSize({ width: 1280, height: 900 });
  await pageB.waitForTimeout(800);
  const narrow = await pageB.evaluate(measureArena);
  console.log("KOLLAPS(1280×900):", JSON.stringify(narrow));
  await pageB.screenshot({ path: join(OUT_DIR, "arena-1280-collapse.png") });
  console.log("SHOT SAVED: arena-1280-collapse.png");
  if (!narrow.loadoutCol || narrow.loadoutCol.h < 60) problems.push(`(4) Loadout-Zeile kollabiert (${narrow.loadoutCol?.h}px)`);
  if (!narrow.arena || narrow.arena.h < 300) problems.push(`(4) Arena kollabiert (${narrow.arena?.h}px)`);
  if (!narrow.logPanel || narrow.logPanel.h < 100) problems.push(`(4) Log kollabiert (${narrow.logPanel?.h}px)`);
  if (narrow.arena && narrow.logPanel && narrow.logPanel.y < narrow.arena.y + narrow.arena.h - 8) {
    problems.push("(4) Log liegt nicht unter der Arena");
  }
  if (narrow.arena && narrow.loadoutCol && narrow.arena.y < narrow.loadoutCol.y + narrow.loadoutCol.h - 8) {
    problems.push("(4) Arena liegt nicht unter der Loadout-Zeile");
  }
  await pageB.close();

  console.log(problems.length ? "PROBLEME:\n- " + problems.join("\n- ") : "ALLE CHECKS GRÜN");
  console.log(errors.length ? `${errors.length} page errors:\n` + errors.slice(0, 10).join("\n") : "no page errors");
  await browser.close();
  process.exitCode = problems.length || errors.length ? 1 : 0;
} finally {
  child.kill();
}
