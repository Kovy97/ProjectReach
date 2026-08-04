#!/usr/bin/env node
/**
 * TESTER 2 ("Der Kämpfer") — Death-Popup + Verifikation, dass die entfernten Defense-Badges
 * (Warded/Evasive/Armored) und die Food-Anzeige in der Nameplate NIRGENDS mehr auftauchen.
 * Ansatz: stärkstes freies Zonen-Monster ("Das Hochland", Stufe 200-242) gegen den
 * Level-30-Midgame-Charakter — garantiert schnellen Tod ohne HP-Patch. (Ein erster Versuch mit
 * state.character.hp=1 per Fixture-Patch schlug fehl: das Gear/die Buffs des Charakters geben
 * hpRegenPerSec, das die 1 HP noch im allerersten Tick zurückregeneriert, bevor der Gegner
 * überhaupt treffen kann — kein Bug, nur ein ungeeigneter Testansatz.)
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

async function routeFixture(page, mutator) {
  await page.route("**/ui-audit-fixtures/midgame.json", async (route) => {
    const res = await route.fetch();
    const json = JSON.parse(await res.text());
    mutator(json.state);
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(json) });
  });
}

const errors = [];
function wirePage(page) {
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
}

const problems = [];
const { child, getOutput } = startDevServer();
try {
  const ok = await waitForServer(BASE_URL);
  if (!ok) { console.error("SERVER NOT UP:\n" + getOutput()); process.exit(1); }
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  wirePage(page);

  await routeFixture(page, (state) => {
    state.character.food = []; // sicherstellen, dass kein Auto-Eat den Tod verhindert.
    state.character.autoEatTier = 0;
  });

  await page.goto(`${BASE_URL}/?fixture=midgame`, { waitUntil: "load" });
  await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
  await page.waitForTimeout(2500);
  await clickRetry(page, page.locator('[data-guide-id="sidebar.combat"]').first());
  await page.waitForTimeout(600);

  // Stärkste FREIE Biom-Zone wählen ("Das Hochland", Stufe 200-242) — deutlich über dem
  // Level-30-Charakter, damit der Tod ohne HP-Patch garantiert schnell eintritt. Direkt über den
  // Zonennamen-Text greifen statt über Klassen-Ausschluss (es gibt neben .dungeon-card auch
  // gesperrte .slayer-floor-zone-card-Karten mit derselben .zone-card-Basis-Klasse).
  const toughZone = page.locator(".zone-card", { hasText: "Das Hochland" });
  const toughZoneFound = await toughZone.count();
  console.log('"Das Hochland"-Zonen-Karte gefunden:', toughZoneFound);
  if (toughZoneFound === 0) problems.push('"Das Hochland"-Zone nicht gefunden — Fallback auf letzte unlocked Zone nötig');
  await clickRetry(page, toughZoneFound > 0 ? toughZone.first() : page.locator(".zone-card:not(.dungeon-card):not(.locked-floor)").last());
  await page.waitForTimeout(1000);
  await clickRetry(page, page.locator(".mc-fight-btn").first());
  await page.waitForSelector(".battle-arena", { timeout: 8000 });
  await page.waitForTimeout(500);
  const hpCheck = await page.evaluate(() => {
    const hpText = document.querySelector(".arena-side-player .fighter-nameplate .cbar-label, .arena-side-player .fighter-nameplate .cbar")?.textContent ?? "";
    return hpText;
  });
  console.log("Spieler-HP-Anzeige direkt nach Kampfstart:", hpCheck);

  // Auf Death-Modal warten.
  let died = false;
  try {
    await page.waitForSelector(".death-modal", { timeout: 30000 });
    died = true;
  } catch {
    problems.push("Kein Death-Popup innerhalb 30s ausgelöst (stärkste freie Zone gegen Lv30-Charakter)");
  }

  if (died) {
    await page.waitForTimeout(400);
    await page.screenshot({ path: join(OUT_DIR, "10-death-popup.png") });
    console.log("SHOT SAVED: 10-death-popup.png");
    const modalText = await page.locator(".death-modal").innerText();
    console.log("Death-Modal-Text:", modalText.replace(/\n/g, " | "));
  }

  // ── Defense-Badges & Food-Anzeige dürfen NIRGENDS mehr auftauchen ───────────────────────────
  const badgeScan = await page.evaluate(() => {
    const bodyText = document.body.innerText;
    const hasWarded = /Warded|Umwardet|Geward(e|é)t/.test(bodyText);
    const hasEvasive = /Evasive|Ausweichend/.test(bodyText);
    const hasArmored = /Armored|Gepanzert/.test(bodyText);
    const nameplateFoodEls = Array.from(document.querySelectorAll(".fighter-nameplate [class*='food']"));
    return {
      hasWarded, hasEvasive, hasArmored,
      nameplateFoodCount: nameplateFoodEls.length,
      nameplateFoodClasses: nameplateFoodEls.map((e) => e.className),
    };
  });
  console.log("BADGE-SCAN:", JSON.stringify(badgeScan));
  if (badgeScan.hasWarded) problems.push('Text "Warded" noch im DOM gefunden — Defense-Badge sollte entfernt sein');
  if (badgeScan.hasEvasive) problems.push('Text "Evasive" noch im DOM gefunden — Defense-Badge sollte entfernt sein');
  if (badgeScan.hasArmored) problems.push('Text "Armored" noch im DOM gefunden — Defense-Badge sollte entfernt sein');
  if (badgeScan.nameplateFoodCount > 0) problems.push(`Food-Anzeige in Nameplate gefunden (${badgeScan.nameplateFoodCount}x: ${badgeScan.nameplateFoodClasses.join(", ")})`);

  console.log(problems.length ? "PROBLEME:\n- " + problems.join("\n- ") : "ALLE CHECKS GRÜN");
  console.log(errors.length ? `${errors.length} page errors:\n` + errors.slice(0, 15).join("\n") : "no page errors");
  await browser.close();
  process.exitCode = problems.length || errors.length ? 1 : 0;
} finally {
  child.kill();
}
