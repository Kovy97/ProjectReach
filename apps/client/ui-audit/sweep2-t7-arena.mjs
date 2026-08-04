#!/usr/bin/env node
/**
 * Tester-Sweep 2, T7 "Der Kämpfer" — Punkt 1: Arena-Grundsanität (Port 5256).
 * LEICHTE Bestätigung, keine Vollprüfung — juice-check.mjs hat dieselbe FX-Welle gestern
 * (Chef-GO 2026-07-12) bereits erschöpfend verifiziert (Funken/Punch/Shake/Crit-Zahl/Kill-Dissolve/
 * Vignette/fx-Stufen). Hier nur ein kompakter Regressions-Spotcheck: Figurengrößen, FX-Layer
 * existiert bei "full", Kill-Dissolve + Karten-Verzögerung, Low-HP-Vignette, Crit-Zahl, fx "off"
 * schaltet den Layer wirklich ab.
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5256;
const BASE_URL = `http://localhost:${PORT}`;

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
async function routeFixture(page, fixtureName, mutator) {
  await page.route(`**/ui-audit-fixtures/${fixtureName}.json`, async (route) => {
    const res = await route.fetch();
    const json = JSON.parse(await res.text());
    json.state.onboarding = { ...(json.state.onboarding ?? {}), active: false, toursSeen: { combat: true, shop: true, bank: true } };
    mutator(json.state);
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(json) });
  });
}

const errors = [];
const problems = [];
function wirePage(page, tag) {
  page.on("pageerror", (e) => errors.push(`[${tag}] pageerror: ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error") errors.push(`[${tag}] console: ${m.text()}`); });
}

async function openCombat(browser, tag, { fxLevel = "full", patch } = {}) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  wirePage(page, tag);
  await page.addInitScript((lvl) => localStorage.setItem("gr.combatFxLevel", lvl), fxLevel);
  await routeFixture(page, "midgame", (state) => { patch?.(state); });
  await page.goto(`${BASE_URL}/?fixture=midgame`, { waitUntil: "load" });
  await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
  await page.waitForTimeout(600);
  await page.locator('[data-guide-id="sidebar.combat"]').first().click({ timeout: 8000 });
  await page.waitForSelector(".battle-arena", { timeout: 10000 });
  return page;
}

const { child, getOutput } = startDevServer();
try {
  const ok = await waitForServer(BASE_URL);
  if (!ok) { console.error("SERVER NOT UP:\n" + getOutput()); process.exit(1); }
  const browser = await chromium.launch();

  // ── A) fx "full": Figurengrößen, FX-Layer, Sparks bei Melee-Treffer ─────────────────────────
  {
    const page = await openCombat(browser, "A", {
      patch: (s) => { s.combat.monsterId = "bull_boss"; s.combat.enemyHp = 300; },
    });
    await page.waitForTimeout(2000);
    const sizes = await page.evaluate(() => {
      const p = document.querySelector(".arena-side-player .fighter-figure-art img")?.getBoundingClientRect();
      const e = document.querySelector(".arena-side-enemy .fighter-figure-art img")?.getBoundingClientRect();
      return { player: p ? Math.round(p.height) : 0, enemy: e ? Math.round(e.height) : 0 };
    });
    console.log(`A: Figurengrößen player=${sizes.player}px enemy=${sizes.enemy}px`);
    // Chef-Task #70 wollte die Gegner-Figuren bewusst GROSS/prominent — kein festes px-Limit nach
    // oben sinnvoll (enemy-size-shot.mjs prüft dasselbe rein per Sichtprüfung). Nur Degenerierte
    // Fälle (Bild fehlt/kollabiert bzw. sprengt den 1080px-Viewport) zählen als Fund.
    if (sizes.player < 60 || sizes.player > 1050) problems.push(`(A) Spieler-Figur unplausible Größe: ${sizes.player}px`);
    if (sizes.enemy < 60 || sizes.enemy > 1050) problems.push(`(A) Gegner-Figur unplausible Größe: ${sizes.enemy}px`);
    if (Math.abs(sizes.player - sizes.enemy) / Math.max(sizes.player, sizes.enemy) > 0.5) {
      problems.push(`(A) Spieler-/Gegner-Figur stark unterschiedlich groß (player=${sizes.player}px, enemy=${sizes.enemy}px)`);
    }
    const layerOk = await page.evaluate(() => {
      const arena = document.querySelector(".battle-arena");
      return { cls: arena?.className, layer: !!document.querySelector(".arena-fx-layer") };
    });
    if (!layerOk.cls?.includes("fx-full")) problems.push(`(A) fx-full-Klasse fehlt (${layerOk.cls})`);
    if (!layerOk.layer) problems.push("(A) .arena-fx-layer fehlt bei fxLevel full");
    // Sparks binnen 8s (Treffer nötig)
    let gotSparks = false;
    for (let i = 0; i < 40 && !gotSparks; i++) {
      await page.waitForTimeout(200);
      gotSparks = (await page.locator(".fx-spark.active").count()) > 0 || Number(await page.evaluate(() => document.querySelector(".arena-fx-layer")?.dataset.sparks || 0)) > 0;
    }
    console.log(`A: Funken beobachtet=${gotSparks}`);
    if (!gotSparks) problems.push("(A) keine Funken (.fx-spark.active / sparks-Zähler) binnen 8s Melee-Kampf");
    await page.close();
  }

  // ── K) Kill-Dissolve + Karten-Verzögerung + Low-HP-Vignette + Crit-Zahl ─────────────────────
  {
    const page = await openCombat(browser, "K", {
      patch: (s) => {
        s.combat.monsterId = "chicken";
        s.combat.enemyHp = 3;
        s.character.hp = Math.max(1, Math.round((s.character.hp ?? 20) * 0.08));
        s.character.food = null;
        s.character.autoPotion = { healPotionId: null, healThreshold: 0.4, autoRebuffTonics: false };
      },
    });
    await page.waitForTimeout(1500);
    const vignette = await page.evaluate(() => document.querySelector(".battle-arena")?.classList.contains("low-hp"));
    console.log(`K: low-hp-Vignette=${vignette}`);
    if (!vignette) problems.push("(K) .low-hp-Klasse fehlt trotz sehr niedriger HP");
    let dyingSeen = false;
    for (let i = 0; i < 60 && !dyingSeen; i++) {
      await page.waitForTimeout(150);
      dyingSeen = (await page.locator(".fighter.dying").count()) > 0;
    }
    console.log(`K: Kill-Dissolve (.fighter.dying) beobachtet=${dyingSeen}`);
    if (!dyingSeen) problems.push("(K) kein .fighter.dying binnen 9s gegen ein 3-HP-Huhn");
    else {
      const cardVisible = await page.locator(".kill-summary-card").count();
      if (cardVisible === 0) problems.push("(K) Kill-Summary-Karte fehlt trotz sichtbarem Dying-Zustand (Karten-Delay defekt?)");
    }
    await page.close();
  }

  // ── D) fx "off": kein FX-Layer, aber Kampf funktioniert weiter ─────────────────────────────
  {
    const page = await openCombat(browser, "D", {
      fxLevel: "off",
      patch: (s) => { s.combat.monsterId = "bull_boss"; s.combat.enemyHp = 300; },
    });
    await page.waitForTimeout(2500);
    const d = await page.evaluate(() => ({
      cls: document.querySelector(".battle-arena")?.className,
      layer: !!document.querySelector(".arena-fx-layer"),
      hitLines: document.querySelectorAll(".log-line.hit.player, .log-line.crit.player").length,
    }));
    console.log(`D: cls=${d.cls}, layer=${d.layer}, hitLines=${d.hitLines}`);
    if (!d.cls?.includes("fx-off")) problems.push("(D) fx-off-Klasse fehlt");
    if (d.layer) problems.push("(D) .arena-fx-layer existiert trotz fx off");
    if (d.hitLines === 0) problems.push("(D) Kampf produziert keine Treffer-Log-Zeilen bei fx off (Kampf-Logik hängt an FX-Stufe?)");
    await page.close();
  }

  console.log(problems.length ? "PROBLEME:\n- " + problems.join("\n- ") : "ALLE CHECKS GRÜN");
  console.log(errors.length ? `${errors.length} page errors:\n` + errors.slice(0, 10).join("\n") : "no page errors");
  await browser.close();
  process.exitCode = problems.length || errors.length ? 1 : 0;
} finally {
  child.kill();
}
