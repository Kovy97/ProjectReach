#!/usr/bin/env node
/**
 * Tester-Sweep 2 — T1 "Der Neuling", Lauf A2 (Rerun nach Erkenntnis: __hfDebug existiert NUR im
 * Fixture-Pfad, nicht bei "Neues Spiel"). Wegwerf-Skript, Port 5250, Locale de.
 *
 * Black-Box-Ansatz ohne Debug-Hook:
 *  - Kapitel 1 wird ECHT gespielt (25 Items real via Woodcutting, Live-Zähler am Story-Tab).
 *  - Kapitel-2-Rest via Save-Datei-Patch (localStorage hearthforge:save:<slot>) + Reload+Laden —
 *    zugleich ein Save-Roundtrip-Test.
 *  - Guide wird hier GESKIPPT (kompletter Durchlauf bereits in Lauf A verifiziert).
 * Prozess-Hygiene: setDefaultTimeout, Watchdog, expliziter process.exit (Lauf A blieb nur wegen
 * offener Browser-Verbindung am Leben).
 */
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5250;
const BASE_URL = `http://localhost:${PORT}`;
const OUT_DIR = "C:\\Users\\MSchu\\AppData\\Local\\Temp\\claude\\G--GameDev\\553d2095-3a73-4795-9782-0fe746a25f13\\scratchpad\\sweep2-t1";
mkdirSync(OUT_DIR, { recursive: true });

const problems = [];
const notes = [];
const errors = [];

setTimeout(() => { console.error("WATCHDOG: 480s überschritten — Abbruch"); process.exit(3); }, 480000);

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

async function shot(page, name) {
  await page.screenshot({ path: join(OUT_DIR, name + ".png") });
  console.log("SHOT: " + name + ".png");
}
async function shotBoth(page, name) {
  await shot(page, name + "-1920");
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.waitForTimeout(350);
  await shot(page, name + "-1366");
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.waitForTimeout(300);
}

const { child, getOutput } = startDevServer();
let browser = null;
try {
  if (!(await waitForServer(BASE_URL))) { console.error("SERVER NOT UP:\n" + getOutput()); process.exit(1); }

  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.setDefaultTimeout(15000);
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
  page.on("dialog", (d) => void d.accept());

  // ── Neues Spiel (letzter, garantiert leerer Slot) ──────────────────────────────────────────
  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.locator(".menu-nav-btn").first().click();
  await page.waitForTimeout(400);
  await page.locator(".menu-slot-actions button").last().click();
  await page.waitForSelector(".creation", { timeout: 8000 });
  await page.locator(".creation-input").first().fill("Neuling");
  await page.locator(".creation-style-card").first().click();
  await page.waitForTimeout(150);
  await page.locator(".creation-start").click();
  await page.waitForSelector(".onboarding-guide-root", { timeout: 10000 });
  await page.waitForTimeout(400);
  console.log("STAGE: Spiel erstellt, Guide sichtbar");

  // ── Guide skippen (Komplett-Durchlauf bereits in Lauf A grün) ──────────────────────────────
  await page.locator(".guide-bubble-skip").click();
  await page.waitForTimeout(500);
  const skipGone = (await page.locator(".onboarding-guide-root").count()) === 0;
  console.log("Guide-Skip sofort wirksam: " + skipGone);
  if (!skipGone) problems.push("Guide-Skip nicht sofort wirksam (Overlay nach 500ms noch da)");
  // Navigation → bleibt weg?
  await page.locator('[data-guide-id="topbar.character"]').first().click();
  await page.waitForTimeout(500);
  if ((await page.locator(".onboarding-guide-root").count()) > 0) problems.push("Guide kommt nach Skip + Navigation zurück");

  // ── Kapitel 1 ECHT spielen: Woodcutting starten ────────────────────────────────────────────
  await page.locator('[data-guide-id="sidebar.woodcutting"]').first().click();
  await page.waitForSelector(".skill-page");
  await page.waitForTimeout(400);
  const ctaBefore = (await page.locator(".skillcard-cta").first().textContent()).trim();
  await page.locator(".skillcard-cta").first().click();
  await page.waitForTimeout(800);
  const ctaAfter = (await page.locator(".skillcard-cta").first().textContent()).trim();
  console.log(`Aktions-CTA: "${ctaBefore}" → nach Klick: "${ctaAfter}"`);
  if (ctaAfter === ctaBefore) problems.push(`Sammel-Aktion startet nicht per Klick (CTA bleibt "${ctaAfter}")`);
  await shot(page, "f01-woodcutting-running");

  // Story-Tab: Live-Zähler bis 25/25 beobachten (Aktion läuft im Hintergrund weiter)
  await page.locator('[data-guide-id="topbar.quests"]').first().click();
  await page.waitForSelector(".quests-page");
  await page.waitForTimeout(500);
  const seen = [];
  let done25 = false;
  let midShot = false;
  for (let i = 0; i < 45; i++) {
    const c = await page.evaluate(() => document.querySelector(".chronicle-obj-count")?.textContent.trim() ?? null);
    if (seen[seen.length - 1] !== c) { seen.push(c); console.log(`  [${i * 3}s] Zähler: ${c}`); }
    if (!midShot && c && parseInt(c) >= 8) { await shot(page, "f02-story-ch1-live"); midShot = true; }
    if (c === "25 / 25") { done25 = true; break; }
    await page.waitForTimeout(3000);
  }
  console.log("Zähler-Verlauf (uniq): " + JSON.stringify(seen));
  if (seen.length < 3) problems.push(`Story-Tab-Zähler aktualisiert nicht live (nur ${JSON.stringify(seen)})`);
  if (!done25) { problems.push("25 Items in 135s nicht erreicht — echtes Sammeln zu langsam/gestoppt (Zähler: " + seen[seen.length - 1] + ")"); }

  const ch1done = await page.evaluate(() => {
    const stage = document.querySelector(".chronicle-stage");
    return {
      done: stage?.classList.contains("chronicle-stage--done") ?? false,
      status: stage?.querySelector(".quest-status-badge")?.textContent.trim() ?? null,
      claimText: stage?.querySelector(".chronicle-stage-claim")?.textContent.trim() ?? null,
      objDone: !!stage?.querySelector(".chronicle-obj--done"),
    };
  });
  console.log("KAPITEL 1 FERTIG-ZUSTAND: " + JSON.stringify(ch1done));
  if (!ch1done.done || !ch1done.claimText) problems.push("Kapitel 1: Fertig-Zustand/Claim-Button fehlt nach 25/25 " + JSON.stringify(ch1done));
  await shotBoth(page, "f03-story-ch1-done");

  // Claim → Kapitel 2
  await page.locator(".chronicle-stage-claim").first().click();
  await page.waitForTimeout(800);
  const ch2 = await page.evaluate(() => {
    const stage = document.querySelector(".chronicle-stage");
    const objs = [...(stage?.querySelectorAll(".chronicle-obj") ?? [])].map((o) => ({
      label: o.querySelector(".chronicle-obj-label")?.textContent.trim() ?? null,
      where: o.querySelector(".chronicle-obj-where")?.textContent.trim() ?? null,
      count: o.querySelector(".chronicle-obj-count")?.textContent.trim() ?? null,
    }));
    return {
      counter: document.querySelector(".chronicle-tab-counter")?.textContent.trim() ?? null,
      title: stage?.querySelector(".chronicle-stage-title")?.textContent.trim() ?? null,
      objs,
      unlocks: [...(stage?.querySelectorAll(".quest-reward-chip--unlock") ?? [])].map((c) => c.textContent.trim()),
      history: document.querySelector(".chronicle-history-toggle")?.textContent.trim() ?? null,
      gold: document.body.querySelector(".sidebar")?.textContent.includes("100") ?? null,
    };
  });
  console.log("KAPITEL 2: " + JSON.stringify(ch2, null, 1));
  if (ch2.title !== "Erstes Blut") problems.push(`Nach Kapitel-1-Claim nicht "Erstes Blut" aktiv: "${ch2.title}"`);
  if (ch2.objs.length !== 2) problems.push(`Kapitel 2: ${ch2.objs.length} Ziel-Zeilen statt 2`);
  if (!ch2.counter?.includes("2")) problems.push(`Kapitel-Zähler nach Claim: "${ch2.counter}"`);
  if (!ch2.history?.includes("1")) problems.push(`Historie zeigt nicht (1): "${ch2.history}"`);
  notes.push(`Kapitel-2-Ziel-Labels: ${JSON.stringify(ch2.objs.map((o) => o.label + " @ " + o.where))}`);
  notes.push(`Kapitel-2-Unlock-Chips: ${JSON.stringify(ch2.unlocks)}`);
  await shotBoth(page, "f04-story-ch2");
  // Historie aufklappen
  await page.locator(".chronicle-history-toggle").first().click();
  await page.waitForTimeout(300);
  await page.locator(".chronicle-history-row-head").first().click();
  await page.waitForTimeout(300);
  const histText = await page.evaluate(() => document.querySelector(".chronicle-history-text")?.textContent.trim().slice(0, 60) ?? null);
  console.log("Historie Kapitel 1 nachlesbar: " + (histText ? "ja" : "NEIN") + ` ("${histText}...")`);
  if (!histText) problems.push("Historie: Kapitel-1-loreText nach Claim nicht nachlesbar");
  await shot(page, "f05-story-history");

  // ── Combat: Erst-Tour + Zonen + echter Huhn-Kampf ──────────────────────────────────────────
  await page.locator('[data-guide-id="sidebar.combat"]').first().click();
  await page.waitForSelector(".combat-page");
  await page.waitForTimeout(800);
  let tourSteps = 0;
  const tourTitles = [];
  while (tourSteps < 12) {
    if ((await page.locator(".onboarding-guide-root").count()) === 0) break;
    const ti = await page.evaluate(() => ({
      speaker: document.querySelector(".guide-bubble .npc-bubble-name")?.textContent.trim() ?? null,
      title: document.querySelector(".guide-bubble-title")?.textContent.trim() ?? null,
      cont: document.querySelector(".guide-bubble-footer button.combat-btn")?.textContent.trim() ?? null,
    }));
    tourTitles.push(`${ti.title} [${ti.speaker}]`);
    if (tourSteps === 0) {
      await shot(page, "f06-combat-tour");
      if (ti.speaker !== "Der Wächter") problems.push(`Combat-Tour-Sprecher: "${ti.speaker}" statt "Der Wächter"`);
    }
    if (!ti.cont) { problems.push("Combat-Tour: kein Weiter-Button → Hänger"); break; }
    await page.locator(".guide-bubble-footer button.combat-btn").click();
    await page.waitForTimeout(450);
    tourSteps += 1;
  }
  console.log(`Combat-Erst-Tour: ${tourSteps} Schritte: ${JSON.stringify(tourTitles)}`);
  if (tourSteps === 0) problems.push("Combat-Erst-Tour erschien NICHT beim ersten Besuch");
  // sofortiger Zweitbesuch
  await page.locator('[data-guide-id="topbar.character"]').first().click();
  await page.waitForTimeout(400);
  await page.locator('[data-guide-id="sidebar.combat"]').first().click();
  await page.waitForSelector(".combat-page");
  await page.waitForTimeout(800);
  if ((await page.locator(".onboarding-guide-root").count()) > 0) problems.push("Combat-Erst-Tour erscheint beim zweiten Besuch erneut");
  else console.log("Combat-Tour beim zweiten Besuch: weg (OK)");

  const zones = await page.evaluate(() => [...document.querySelectorAll(".zone-card")].map((c) => ({
    name: c.querySelector(".zone-card-name")?.textContent.trim() ?? "?",
    locked: c.classList.contains("zone-card-story-locked"),
    disabled: c.disabled,
    badge: !!c.querySelector(".zone-card-story-lock-badge"),
    hint: c.querySelector(".zone-card-locked-hint")?.textContent.trim() ?? null,
  })));
  console.log("ZONEN: " + JSON.stringify(zones.map((z) => `${z.name}${z.locked ? " [LOCKED]" : ""}`)));
  await shotBoth(page, "f07-combat-zones");
  const bl = zones.find((z) => /Grenzlande/.test(z.name));
  if (!bl) problems.push("Grenzlande-Karte fehlt");
  else {
    if (!bl.locked || !bl.badge || !bl.disabled) problems.push("Grenzlande nicht korrekt gesperrt: " + JSON.stringify(bl));
    console.log(`Grenzlande-Hinweis: "${bl.hint}"`);
    if (!bl.hint || !/Funke im Korn/.test(bl.hint)) problems.push(`Grenzlande-Hinweis nennt nicht das Gate-Kapitel: "${bl.hint}"`);
  }
  // Klick auf gesperrte Karte → wirkungslos?
  await page.locator(".zone-card", { hasText: "Grenzlande" }).first().click({ force: true }).catch(() => {});
  await page.waitForTimeout(500);
  const stillZones = await page.evaluate(() => document.querySelectorAll(".zone-card").length > 0);
  if (!stillZones) problems.push("Klick auf gesperrte Grenzlande öffnet die Zone");
  else console.log("Klick auf gesperrte Grenzlande: wirkungslos (OK)");

  // Weiden → Monster
  await page.locator(".zone-card", { hasText: "Weide" }).first().click();
  await page.waitForTimeout(800);
  const monsterNames = await page.evaluate(() => [...document.querySelectorAll(".monster-card .monster-card-name")].map((n) => n.textContent.trim()));
  console.log("WEIDEN-MONSTER: " + JSON.stringify(monsterNames));
  if (!monsterNames.some((n) => /Bulle|Bull/i.test(n))) notes.push("Bullen-Boss NICHT in Weiden-Liste sichtbar: " + JSON.stringify(monsterNames));
  await shotBoth(page, "f08-pasture-monsters");
  const firstName = monsterNames[0];
  console.log("Starte echten Kampf gegen: " + firstName);
  await page.locator(".monster-card").first().locator(".mc-fight-btn").click();
  await page.waitForTimeout(1200);
  await shot(page, "f09-first-fight");

  // Story-Tab: Union-Zähler soll durch echte Huhn-Kills live steigen
  await page.locator('[data-guide-id="topbar.quests"]').first().click();
  await page.waitForSelector(".quests-page");
  await page.waitForTimeout(500);
  const unionSeen = [];
  for (let i = 0; i < 30; i++) {
    const counts = await page.evaluate(() => [...document.querySelectorAll(".chronicle-obj")].map((o) => o.querySelector(".chronicle-obj-count")?.textContent.trim()));
    const c = counts[0] ?? null;
    if (unionSeen[unionSeen.length - 1] !== c) { unionSeen.push(c); console.log(`  [${i * 3}s] Union-Zähler: ${JSON.stringify(counts)}`); }
    if (c && parseInt(c) >= 2) break;
    await page.waitForTimeout(3000);
  }
  console.log("Union-Zähler-Verlauf: " + JSON.stringify(unionSeen));
  const unionNow = parseInt(unionSeen[unionSeen.length - 1] ?? "0") || 0;
  if (unionNow < 1) problems.push("Echte Huhn-Kills zählen NICHT im Kapitel-2-Union-Ziel (nach 90s Kampf noch 0)");
  await shot(page, "f10-story-ch2-union-live");

  // ── Save-Patch: Rest von Kapitel 2 via Save-Datei (Black-Box, kein Debug-Hook) ────────────
  await page.locator(".sb-footer-save").click();
  await page.waitForTimeout(1000);
  const patchInfo = await page.evaluate(() => {
    // Belegten Slot finden (wir haben den LETZTEN Slot benutzt; robust: alle scannen)
    for (let i = 9; i >= 0; i--) {
      const raw = localStorage.getItem(`hearthforge:save:${i}`);
      if (!raw) continue;
      const save = JSON.parse(raw);
      const st = save.state ?? save;
      if (!st.monsterKills || st.name === undefined && !st.character) { /* trotzdem versuchen */ }
      if ((st.character?.name ?? st.name) !== "Neuling" && !st.monsterKills) continue;
      st.monsterKills = st.monsterKills ?? {};
      st.monsterKills["cow"] = (st.monsterKills["cow"] ?? 0) + 6;
      st.monsterKills["boar"] = (st.monsterKills["boar"] ?? 0) + 5;
      st.monsterKills["feral_goat"] = (st.monsterKills["feral_goat"] ?? 0) + 4;
      st.monsterKills["bull_boss"] = (st.monsterKills["bull_boss"] ?? 0) + 1;
      localStorage.setItem(`hearthforge:save:${i}`, JSON.stringify(save));
      return { slot: i, keys: Object.keys(save).slice(0, 8), kills: st.monsterKills };
    }
    return null;
  });
  console.log("SAVE-PATCH: " + JSON.stringify(patchInfo));
  if (!patchInfo) { problems.push("Save-Patch fehlgeschlagen: kein Save-Slot in localStorage gefunden"); }

  // Reload → Spiel laden → Story-Tab
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  await page.locator(".menu-nav-btn").nth(1).click();
  await page.waitForTimeout(500);
  const loadBtns = page.locator(".menu-slot-actions button", { hasText: /Laden|Load/i });
  await loadBtns.last().click();
  await page.waitForSelector(".sidebar", { timeout: 10000 });
  await page.waitForTimeout(1500);
  console.log("STAGE: Save nach Patch geladen");
  // Tour-Regression: Combat-Tour darf nach Reload nicht wiederkommen (toursSeen persistiert?)
  await page.locator('[data-guide-id="sidebar.combat"]').first().click();
  await page.waitForSelector(".combat-page");
  await page.waitForTimeout(900);
  if ((await page.locator(".onboarding-guide-root").count()) > 0) problems.push("Combat-Erst-Tour erscheint nach Save/Reload/Laden ERNEUT");
  else console.log("Combat-Tour nach Reload: weg (OK)");

  await page.locator('[data-guide-id="topbar.quests"]').first().click();
  await page.waitForSelector(".quests-page");
  await page.waitForTimeout(600);
  const ch2afterPatch = await page.evaluate(() => {
    const stage = document.querySelector(".chronicle-stage");
    return {
      title: stage?.querySelector(".chronicle-stage-title")?.textContent.trim() ?? null,
      status: stage?.querySelector(".quest-status-badge")?.textContent.trim() ?? null,
      objs: [...(stage?.querySelectorAll(".chronicle-obj") ?? [])].map((o) => ({
        count: o.querySelector(".chronicle-obj-count")?.textContent.trim(),
        done: o.classList.contains("chronicle-obj--done"),
      })),
      claim: stage?.querySelector(".chronicle-stage-claim")?.textContent.trim() ?? null,
    };
  });
  console.log("KAPITEL 2 NACH PATCH (Union soll >=15 wg. 6+5+4+Hühner): " + JSON.stringify(ch2afterPatch));
  if (!ch2afterPatch.objs[0]?.done) problems.push(`Union-Ziel nicht erfüllt nach Patch (Kuh+Eber+Ziege+Huhn): ${JSON.stringify(ch2afterPatch.objs)} — zählt die Union alle Varianten?`);
  if (!ch2afterPatch.objs[1]?.done) problems.push(`Bullen-Ziel nicht erfüllt nach Patch: ${JSON.stringify(ch2afterPatch.objs)}`);
  if (!ch2afterPatch.claim) problems.push("Kapitel 2: kein Claim-Button trotz erfüllter Ziele");
  await shot(page, "f11-story-ch2-done");

  if (ch2afterPatch.claim) {
    await page.locator(".chronicle-stage-claim").first().click();
    await page.waitForTimeout(800);
  }
  const ch3 = await page.evaluate(() => {
    const stage = document.querySelector(".chronicle-stage");
    return {
      title: stage?.querySelector(".chronicle-stage-title")?.textContent.trim() ?? null,
      unlocks: [...(stage?.querySelectorAll(".quest-reward-chip--unlock") ?? [])].map((c) => c.textContent.trim()),
      objs: [...(stage?.querySelectorAll(".chronicle-obj") ?? [])].map((o) => o.textContent.trim().slice(0, 80)),
    };
  });
  console.log("KAPITEL 3: " + JSON.stringify(ch3, null, 1));
  if (ch3.title !== "Der Funke im Korn") problems.push(`Nach Kapitel-2-Claim nicht "Der Funke im Korn": "${ch3.title}"`);
  if (!ch3.unlocks.some((u) => /Grenzlande/.test(u))) problems.push(`Kapitel 3 ohne "Schaltet frei: Grenzlande"-Chip: ${JSON.stringify(ch3.unlocks)}`);
  await shotBoth(page, "f12-story-ch3-unlocks");

  // Grenzlande bleibt gesperrt bis Kapitel 3 geclaimed
  await page.locator('[data-guide-id="sidebar.combat"]').first().click();
  await page.waitForSelector(".combat-page");
  await page.waitForTimeout(600);
  const blFinal = await page.evaluate(() => {
    const cards = [...document.querySelectorAll(".zone-card")];
    const b = cards.find((c) => /Grenzlande/.test(c.querySelector(".zone-card-name")?.textContent ?? ""));
    return b ? { locked: b.classList.contains("zone-card-story-locked") } : null;
  });
  console.log("Grenzlande nach Kapitel-2-Claim noch gesperrt: " + JSON.stringify(blFinal));
  if (blFinal && !blFinal.locked) problems.push("Grenzlande schon nach Kapitel 2 offen (Gate ist chronicle_03!)");
  await shot(page, "f13-borderlands-still-locked");

  await browser.close();
  browser = null;
} catch (e) {
  problems.push("FATAL: " + String(e.stack || e).slice(0, 500));
} finally {
  try { if (browser) await browser.close(); } catch {}
  child.kill();
  console.log("\n==== NOTES ====\n" + (notes.length ? notes.join("\n") : "-"));
  console.log("\n==== PROBLEME ====\n" + (problems.length ? problems.map((p) => "- " + p).join("\n") : "KEINE"));
  const uniqErr = [...new Set(errors)];
  console.log("\n==== KONSOLE (" + uniqErr.length + " uniq) ====\n" + uniqErr.slice(0, 15).join("\n"));
  process.exit(problems.length ? 1 : 0);
}
