#!/usr/bin/env node
/**
 * TESTER 4 ("Der Veteran") — Sweep 4, Brille "Endgame-Systeme", Kapitel 2: PARAGONTURM.
 * Read-only Playwright-Sichtprüfung gegen die REALE Turm-Engine (content.paragon + der
 * paragon_tower-Dungeon-Def sind vollständig im Katalog verdrahtet — kein Content-Patch nötig).
 * Port 5253 (Tester-4-Zuweisung).
 *
 * Prüft: Sektion/Freischaltung → Etagen-Panel → Etagen-Aufstieg per echtem Kill (inkl. Boss- +
 * Meilenstein-Etage 10, Truhen-Loot) → Pause-Verhalten (kein Auto-Weiter) → Rekord-Toast →
 * Tod → Checkpoint-Reset (Etage 1, Rekord bleibt) → Statistik-Medaillon.
 *
 * Muster: ui-audit/paragon-tower-shot.mjs (kein Synthetic-Content mehr nötig, der ist real gelandet).
 * Run: node ui-audit/sweep4-paragon.mjs   (from apps/client/)
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

  // ── 1) Gesperrte Turm-Karte (frisches endgame-Fixture, kein Unlock-Patch) ─────────────────────
  await run("locked-card", async () => {
    const { page, errors } = await newGamePage(browser, "locked");
    await goToCombat(page);
    await page.locator(".paragon-card").scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    await page.screenshot({ path: join(OUT_DIR, "pg1-locked-card.png") });
    console.log("SHOT SAVED: pg1-locked-card.png");
    const domProof = await page.evaluate(() => ({
      lockedCard: !!document.querySelector(".paragon-card.dungeon-locked"),
      panelAbsent: !document.querySelector(".paragon-panel"),
      hintText: document.querySelector(".paragon-card .dungeon-locked-hint")?.textContent?.trim(),
    }));
    console.log(`[locked] ${JSON.stringify(domProof)}`);
    if (!domProof.lockedCard || !domProof.panelAbsent) findings.push("KRITISCH: Paragonturm-Karte zeigt sich nicht korrekt gesperrt vor Unlock");
    allErrors.push(...errors);
    await page.close();
  });

  // ── 2) Freischaltung (Fixture-Patch dungeonsUnlocked.paragon_tower) + Panel, nicht-Boss-Etage ──
  await run("unlock-panel", async () => {
    const { page, errors } = await newGamePage(browser, "panel");
    await page.evaluate(() => {
      window.__hfDebug.state.dungeonsUnlocked = { paragon_tower: true };
      window.__hfDebug.state.paragon = { checkpoint: 6, best: 23 }; // currentFloor = 7 (kein Boss)
    });
    await goToCombat(page);
    await page.waitForTimeout(9000); // spurious record-toast des direkten State-Sprungs (0→23) abklingen lassen
    await page.locator(".paragon-panel").scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    await page.screenshot({ path: join(OUT_DIR, "pg2-panel-floor7.png") });
    console.log("SHOT SAVED: pg2-panel-floor7.png");
    const domProof = await page.evaluate(() => ({
      floorText: document.querySelector(".paragon-floor-display")?.textContent,
      bestText: document.querySelector(".paragon-best-display")?.textContent,
      previewIsBoss: !!document.querySelector(".paragon-preview-card.paragon-preview-boss"),
      startBtnLabel: document.querySelector(".paragon-start-btn")?.textContent,
    }));
    console.log(`[panel] ${JSON.stringify(domProof)} (expect floor=7, boss=false)`);
    if (domProof.previewIsBoss) findings.push("MITTEL: Etage 7 fälschlich als Boss-Etage markiert (7%5!=0)");
    allErrors.push(...errors);
    await page.close();
  });

  // ── 3) Aufstieg zu Etage 10 per ECHTEM Kill (Boss + Meilenstein-Truhe) + Pause-Verhalten ───────
  await run("floor10-boss-milestone-chest", async () => {
    const { page, errors } = await newGamePage(browser, "climb");
    await page.evaluate(() => {
      window.__hfDebug.state.dungeonsUnlocked = { paragon_tower: true };
      window.__hfDebug.state.paragon = { checkpoint: 9, best: 9 }; // currentFloor = 10 (Boss + Meilenstein)
    });
    await goToCombat(page);
    await page.waitForTimeout(9000);
    await clickRetry(page, page.locator(".paragon-start-btn").first());
    await page.waitForSelector(".paragon-battle-badge .paragon-boss-tag", { timeout: 10000 });
    await page.locator(".paragon-battle-badge").scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(OUT_DIR, "pg3-floor10-boss-badge.png") });
    console.log("SHOT SAVED: pg3-floor10-boss-badge.png");
    const badgeText = await page.locator(".paragon-battle-badge .dungeon-progress-name").textContent();
    console.log(`[floor10] badge="${badgeText}"`);

    // Echter Kill (kein Bypass): HP auf 1, dann auf den nächsten echten Treffer warten.
    await page.evaluate(() => { window.__hfDebug.state.combat.enemyHp = 1; });
    await page.waitForFunction(() => window.__hfDebug.state.combat.monsterId === null, null, { timeout: 15000 })
      .catch(() => {});
    await page.waitForTimeout(500);
    const afterClear = await page.evaluate(() => {
      const { state } = window.__hfDebug;
      return {
        checkpoint: state.paragon.checkpoint,
        best: state.paragon.best,
        combatMonsterId: state.combat.monsterId,
        combatParagonFloor: state.combat.paragonFloor,
        lootEvents: state.combat.log.filter((e) => e.kind === "loot").map((e) => ({ itemId: e.itemId, amount: e.amount })),
      };
    });
    console.log(`[floor10-clear] ${JSON.stringify(afterClear)} (expect checkpoint=10, monsterId=null, paragonFloor=undefined)`);
    if (afterClear.checkpoint !== 10) findings.push(`KRITISCH: Checkpoint nach Etage-10-Kill = ${afterClear.checkpoint} statt 10`);
    if (afterClear.combatMonsterId !== null) {
      findings.push("KRITISCH: Turm setzt nach Etagen-Kill automatisch fort (kein Pause-Verhalten — Leitplanke 'kein Auto-Weiter' verletzt)");
    }
    if (afterClear.lootEvents.length === 0) {
      findings.push("MITTEL: Keine Meilenstein-Truhen-Loot-Events im Kampf-Log nach Etage-10-Boss-Kill (minFloor:10-Tier sollte rollen)");
    } else {
      console.log(`[floor10-chest] Loot: ${JSON.stringify(afterClear.lootEvents)}`);
    }
    await page.screenshot({ path: join(OUT_DIR, "pg4-floor10-after-clear-paused.png") });
    console.log("SHOT SAVED: pg4-floor10-after-clear-paused.png");
    const startBtnLabel = await page.locator(".paragon-start-btn").textContent();
    console.log(`[floor10-clear] Start-Button danach: "${startBtnLabel}" (erwartet "Etage 11" o.ä. — manueller Neustart nötig)`);
    allErrors.push(...errors);
    await page.close();
  });

  // ── 4) Rekord-Moment (goldener Jackpot-Toast) — checkpoint 22→23 schlägt Rekord 22 ─────────────
  await run("record-toast", async () => {
    const { page, errors } = await newGamePage(browser, "record");
    await page.evaluate(() => {
      window.__hfDebug.state.dungeonsUnlocked = { paragon_tower: true };
      window.__hfDebug.state.paragon = { checkpoint: 22, best: 22 }; // currentFloor = 23, bereits am Rekord
    });
    await goToCombat(page);
    await page.waitForTimeout(9000);
    await clickRetry(page, page.locator(".paragon-start-btn").first());
    await page.waitForSelector(".paragon-battle-badge", { timeout: 10000 });
    await page.locator(".paragon-battle-badge").scrollIntoViewIfNeeded();
    await page.evaluate(() => { window.__hfDebug.state.combat.enemyHp = 1; });
    const gotToast = await page.waitForFunction(
      () => [...document.querySelectorAll(".toast-rare-legendary .toast-detail")].some((el) => el.textContent?.includes("23")),
      null, { timeout: 15000 },
    ).then(() => true).catch(() => false);
    if (!gotToast) { findings.push("KRITISCH: Kein Rekord-Toast beim Überbieten des bisherigen Turm-Rekords"); allErrors.push(...errors); await page.close(); return; }
    await page.waitForTimeout(150);
    await page.screenshot({ path: join(OUT_DIR, "pg5-record-toast.png") });
    console.log("SHOT SAVED: pg5-record-toast.png");
    const domProof = await page.evaluate(() => ({
      toastTitle: document.querySelector(".toast-rare-legendary .toast-title")?.textContent,
      toastDetail: document.querySelector(".toast-rare-legendary .toast-detail")?.textContent,
      best: window.__hfDebug.state.paragon.best,
    }));
    console.log(`[record-toast] ${JSON.stringify(domProof)} (expect best=23)`);
    allErrors.push(...errors);
    await page.close();
  });

  // ── 5) Tod im Turm: Checkpoint-Reset auf Etage 1, Rekord bleibt unangetastet ───────────────────
  await run("death-checkpoint-reset", async () => {
    const { page, errors } = await newGamePage(browser, "death");
    await page.evaluate(() => {
      window.__hfDebug.state.dungeonsUnlocked = { paragon_tower: true };
      window.__hfDebug.state.paragon = { checkpoint: 14, best: 20 }; // currentFloor = 15
    });
    await goToCombat(page);
    await page.waitForTimeout(9000);
    await clickRetry(page, page.locator(".paragon-start-btn").first());
    await page.waitForSelector(".paragon-battle-badge", { timeout: 10000 });
    await page.evaluate(() => {
      window.__hfDebug.state.character.hp = 1;
      window.__hfDebug.state.character.food = null; // Auto-Eat AUS — sonst hält Essen beliebig lange am Leben
    });
    const gotDeath = await page.waitForSelector(".death-modal", { timeout: 20000 }).then(() => true).catch(() => false);
    if (!gotDeath) { findings.push("KRITISCH: Todes-Popup erscheint bei Turm-Tod nicht"); allErrors.push(...errors); await page.close(); return; }
    await page.waitForTimeout(200);
    await page.screenshot({ path: join(OUT_DIR, "pg6-death-checkpoint-reset.png") });
    console.log("SHOT SAVED: pg6-death-checkpoint-reset.png");
    const domProof = await page.evaluate(() => ({
      title: document.querySelector(".death-modal-title")?.textContent,
      paragonHint: document.querySelector(".death-modal-paragon-hint")?.textContent,
      checkpointAfter: window.__hfDebug.state.paragon.checkpoint,
      bestAfter: window.__hfDebug.state.paragon.best,
    }));
    console.log(`[death-reset] ${JSON.stringify(domProof)} (expect checkpointAfter=0, bestAfter=20, hint present)`);
    if (domProof.checkpointAfter !== 0) findings.push(`KRITISCH: Checkpoint nach Turm-Tod = ${domProof.checkpointAfter} statt 0`);
    if (domProof.bestAfter !== 20) findings.push(`KRITISCH: Rekord nach Turm-Tod verändert (${domProof.bestAfter} statt unangetastet 20)`);
    if (!domProof.paragonHint) findings.push("MITTEL: Turm-Tod zeigt keine 'Zurück auf Etage 1'-Hinweiszeile im Todes-Popup");
    allErrors.push(...errors);
    await page.close();
  });

  // ── 6) Statistik-Seite: Rekord-Medaillon ────────────────────────────────────────────────────────
  await run("stats-medallion", async () => {
    const { page, errors } = await newGamePage(browser, "stats");
    await page.evaluate(() => { window.__hfDebug.state.paragon = { checkpoint: 16, best: 17 }; });
    await clickRetry(page, page.locator('[data-guide-id="sidebar.stats"]').first());
    await page.waitForSelector(".stx-page", { timeout: 10000 });
    await page.waitForTimeout(300);
    const domProof = await page.evaluate(() => {
      const labels = [...document.querySelectorAll(".stx-medallion-label")].map((el) => el.textContent);
      const values = [...document.querySelectorAll(".stx-medallion-value")].map((el) => el.textContent);
      return { labels, values };
    });
    const hasSeventeen = domProof.values.some((v) => v?.includes("17"));
    console.log(`[stats-medallion] ${JSON.stringify(domProof)} (expect a 17-value medallion)`);
    if (!hasSeventeen) findings.push("MITTEL: Kein Statistik-Medaillon für die höchste Paragonetage (best=17) sichtbar");
    await page.locator(".stx-page").scrollIntoViewIfNeeded();
    await page.screenshot({ path: join(OUT_DIR, "pg7-stats-medallion.png") });
    console.log("SHOT SAVED: pg7-stats-medallion.png");
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
