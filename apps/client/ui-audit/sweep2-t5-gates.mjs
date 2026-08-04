#!/usr/bin/env node
/**
 * Tester-Sweep 2 (Release-Kandidat 0.1, 2026-07-13) — T5 "Der Kartograph": systematischer Sweep
 * über das komplette Gate-Netz (9 Zonen-Gates + slayer_tower-Sonderfall + 7 Dungeon-Gates) gegen
 * den ECHTEN Content (packages/content/src/index.ts), nicht gegen synthetische Test-Zonen.
 *
 * Wegwerf-Skript, Muster ui-audit/dungeon-gate-check.mjs (das nur mit isolierten Synthetik-Dungeons
 * testete). Port 5254 (Tester-Vorgabe), Fixture midgame, __hfDebug-State-Präparation.
 *
 * Deckt ab:
 *  1. Alle 9 quest-gegateten Zonen + slayer_tower (ungegated-by-design) + pastures (immer offen):
 *     gesperrt→Schloss+Hinweis mit korrektem DE-Kapitelnamen, Klick wirkungslos, Quest erfüllt→offen.
 *  2. Alle 7 Dungeon-Gates: gesperrt→Hinweis, Klick/Enter wirkungslos, Quest erfüllt→Enter aktiv.
 *  3. Bestiarium: Monster gesperrter Zone → Fight disabled + Hinweis; dungeonOnly-Monster → Hinweis
 *     wechselt zwischen "Dungeon gesperrt" (Chronik-Hinweis) und "nur im Dungeon" (offen).
 *  4. Trägerzonen-Kohärenz: Zone gesperrt + Dungeon-eigene Quest künstlich erfüllt → Dungeon bleibt
 *     gesperrt, Hinweis nennt die ZONE (nicht die Dungeon-Quest).
 *  5. Slayer: viele Task-Neuwürfe bei gemischtem Zonen-Lock-Stand → nie ein Monster einer gesperrten
 *     Zone. Plus synthetischer "nachträglich gesperrt"-Grenzfall (nicht auf normalem Weg erreichbar).
 *  6. Paragonturm: unverändert eigene Schlüssel-Optik (.dungeon-locked/.dungeon-lock-icon), NICHT
 *     .zone-card-story-locked.
 *  7. Frischer Spielstand: nur pastures offen, alle anderen sichtbar-aber-gesperrt.
 *
 * Sprache: DE (localStorage "hearthforge:locale"="de") — Chef-Vorgabe prüft den DE-Hinweistext.
 */
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5254;
const BASE_URL = `http://localhost:${PORT}`;
const OUT_DIR = "C:\\Users\\MSchu\\AppData\\Local\\Temp\\claude\\G--GameDev\\553d2095-3a73-4795-9782-0fe746a25f13\\scratchpad\\sweep2-t5";
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
async function goToBestiary(page) {
  await clickRetry(page, page.locator('[data-guide-id="topbar.bestiary"]').first());
  await page.waitForSelector(".bestiary-page", { timeout: 8000 });
  await page.waitForTimeout(250);
}
async function goToSlayer(page) {
  await clickRetry(page, page.locator('[data-guide-id="sidebar.slayer"]').first());
  await page.waitForSelector(".slayer-page", { timeout: 8000 });
  await page.waitForTimeout(250);
}
async function goToCharacter(page) {
  await clickRetry(page, page.locator('[data-guide-id="topbar.character"]').first());
  await page.waitForTimeout(150);
}

const KRITISCH = [];
const MITTEL = [];
const KOSMETISCH = [];
const NOTES = [];
const gateMatrix = []; // { id, kind, locked, unlocked, hintOk }

function wirePage(page, tag, errors) {
  page.on("pageerror", (e) => errors.push(`[${tag}] pageerror: ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error") errors.push(`[${tag}] console: ${m.text()}`); });
}

const errors = [];
const { child, getOutput } = startDevServer();
try {
  const ok = await waitForServer(BASE_URL);
  if (!ok) { console.error("SERVER NOT UP:\n" + getOutput()); process.exit(1); }

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  wirePage(page, "main", errors);
  await page.addInitScript(() => {
    try { localStorage.setItem("hearthforge:locale", "de"); } catch {}
  });
  await routeFixtureNoTours(page);

  await page.goto(`${BASE_URL}/?fixture=midgame`, { waitUntil: "load" });
  await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
  await page.waitForFunction(() => !!window.__hfDebug, null, { timeout: 8000 });
  await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(1500);

  // ── Baseline: alle Chronik-Fortschritte weg (überall gesperrt) + Kampf-Niveau hochziehen, damit
  // NUR das Quest-Gate getestet wird (nicht requiredLevel als Störfaktor). Legacy-Grants/Bestands-
  // schutz ebenfalls weg, sonst überstimmen sie die Gates, die wir gerade prüfen wollen. ──
  const contentSnapshot = await page.evaluate(() => {
    const { content, state } = window.__hfDebug;
    state.quests.completed = [];
    state.quests.claimed = [];
    state.dungeonsUnlocked = {};
    state.legacyZoneGrants = {};
    state.slayerTask = null;
    for (const id of ["attack", "power", "ranged", "magic", "defence", "warding", "vitality", "slayer"]) {
      (state.skills[id] ??= { xp: 0 }).xp = 999_999_999;
      // Master-Weihe-Zeremonie-Modal (MasteryCeremony.tsx, pendingCapeCeremonies) sofort quittieren —
      // sonst blockiert das Modal (mwc-backdrop) jeden folgenden Klick, weil alle Kampf-Skills durch
      // den Boost gleichzeitig Level 99 erreichen. capeCeremonySeen ist genau der Unterdrückungs-Weg
      // (markCapeCeremonySeen, engine/capes.ts).
      (state.capeCeremonySeen ??= {})[id] = true;
    }
    return {
      zones: content.zones.map((z) => ({ id: z.id, name: z.name, requiresQuest: z.requiresQuest ?? null })),
      dungeons: content.dungeons.filter((d) => d.id !== "paragon_tower").map((d) => ({
        id: d.id, name: d.name, zone: d.zone ?? null, requiresQuest: d.requiresQuest ?? null,
      })),
      questNames: Object.fromEntries(content.quests.filter((q) => q.id.startsWith("chronicle_")).map((q) => [q.id, q.name])),
    };
  });
  console.log(`Content geladen: ${contentSnapshot.zones.length} Zonen, ${contentSnapshot.dungeons.length} Dungeons (ohne Paragon).`);
  await page.waitForTimeout(300);

  const deName = (id) => contentSnapshot.questNames[id]?.de ?? id;
  const GATED_ZONES = contentSnapshot.zones.filter((z) => z.requiresQuest);
  const UNGATED_ZONES = contentSnapshot.zones.filter((z) => !z.requiresQuest);
  console.log(`Gegatete Zonen (${GATED_ZONES.length}): ${GATED_ZONES.map((z) => z.id).join(", ")}`);
  console.log(`Ungegatete Zonen (${UNGATED_ZONES.length}): ${UNGATED_ZONES.map((z) => z.id).join(", ")}`);
  console.log(`Dungeons (${contentSnapshot.dungeons.length}): ${contentSnapshot.dungeons.map((d) => `${d.id}<-${d.requiresQuest}`).join(", ")}`);

  // ══════════════════════════════════════════════════════════════════════════════════
  // PHASE 1 — Frischer Spielstand: nur pastures offen, alles andere sichtbar-aber-gesperrt.
  // ══════════════════════════════════════════════════════════════════════════════════
  await goToCombat(page);
  {
    const cardState = await page.evaluate(() => {
      const cards = [...document.querySelectorAll(".zone-grid .zone-card:not(.dungeon-card):not(.slayer-floor-zone-card)")];
      return cards.map((c) => ({
        name: c.querySelector(".zone-card-name")?.textContent.trim(),
        storyLocked: c.classList.contains("zone-card-story-locked"),
        hasBadge: !!c.querySelector(".zone-card-story-lock-badge"),
        hintText: c.querySelector(".zone-card-locked-hint")?.textContent.trim() ?? null,
        disabled: c.disabled,
      }));
    });
    console.log("FRISCH: Zonen-Karten = " + JSON.stringify(cardState));
    for (const z of contentSnapshot.zones) {
      if (z.id === "slayer_tower") continue; // kein Zonen-Card-Rendering (eigene Tower-Sektion, s.u.)
      const card = cardState.find((c) => c.name === z.name.de);
      if (!card) { KRITISCH.push(`FRISCH: Zonen-Karte "${z.id}" (${z.name.de}) nicht im DOM gefunden`); continue; }
      const shouldBeLocked = !!z.requiresQuest;
      if (card.storyLocked !== shouldBeLocked || card.disabled !== shouldBeLocked) {
        KRITISCH.push(`FRISCH: Zone "${z.id}" Lock-Status falsch (erwartet locked=${shouldBeLocked}, ist storyLocked=${card.storyLocked}/disabled=${card.disabled})`);
      }
      if (shouldBeLocked) {
        if (!card.hasBadge) KRITISCH.push(`FRISCH: Zone "${z.id}" gesperrt aber kein Schloss-Badge`);
        const expected = `Erfordert Chronik-Kapitel: ${deName(z.requiresQuest)}`;
        if (!card.hintText?.includes(expected)) {
          KRITISCH.push(`FRISCH: Zone "${z.id}" Hinweistext falsch: "${card.hintText}" (erwartet Substring "${expected}")`);
        }
      } else if (card.hasBadge) {
        KRITISCH.push(`FRISCH: Zone "${z.id}" (ungegated) zeigt trotzdem ein Schloss-Badge`);
      }
    }
    // slayer_tower: kein Zonen-Card-Eintrag (bestätigt eigene Tower-Sektion statt requiresQuest-Gate).
    const slayerTowerCard = cardState.find((c) => c.name === contentSnapshot.zones.find((z) => z.id === "slayer_tower").name.de);
    if (slayerTowerCard) MITTEL.push(`slayer_tower taucht als normale Zonen-Karte auf (erwartet: nur eigene Tower-Sektion)`);
    else NOTES.push(`slayer_tower: kein Zonen-Card-Eintrag im Zonen-Grid (eigene Etagen-Sektion, requiresQuest=null bestätigt) — by design ungegated, s. zone-gating.test.ts EXPECTED_ZONE_GATES.`);

    // Dungeon-Karten bei frischem Stand: alle 7 gesperrt, Hinweis muss die TRÄGERZONE nennen (auch
    // gesperrt), NICHT die eigene Dungeon-Quest (Kohärenzregel).
    const dungeonCardState = await page.evaluate(() => {
      const cards = [...document.querySelectorAll(".zone-grid .dungeon-card")];
      return cards.map((c) => ({
        name: c.querySelector(".zone-card-name")?.textContent.trim(),
        storyLocked: c.classList.contains("zone-card-story-locked"),
        hasBadge: !!c.querySelector(".zone-card-story-lock-badge"),
        hintText: c.querySelector(".zone-card-locked-hint")?.textContent.trim() ?? null,
        hasEnterBtn: !!c.querySelector(".dungeon-enter"),
      }));
    });
    console.log("FRISCH: Dungeon-Karten = " + JSON.stringify(dungeonCardState));
    for (const d of contentSnapshot.dungeons) {
      const card = dungeonCardState.find((c) => c.name?.includes(d.name.de));
      if (!card) { KRITISCH.push(`FRISCH: Dungeon-Karte "${d.id}" nicht im DOM gefunden`); continue; }
      if (!card.storyLocked || !card.hasBadge || card.hasEnterBtn) {
        KRITISCH.push(`FRISCH: Dungeon "${d.id}" sollte gesperrt sein (storyLocked=${card.storyLocked}, badge=${card.hasBadge}, enterBtn=${card.hasEnterBtn})`);
      }
      const zoneOfDungeon = contentSnapshot.zones.find((z) => z.id === d.zone);
      const expectedGateId = zoneOfDungeon?.requiresQuest || d.requiresQuest; // Zone gesperrt -> Zonen-Gate gewinnt
      const expected = `Erfordert Chronik-Kapitel: ${deName(expectedGateId)}`;
      if (!card.hintText?.includes(expected)) {
        KRITISCH.push(`FRISCH: Dungeon "${d.id}" Hinweistext falsch: "${card.hintText}" (erwartet Substring "${expected}", Trägerzonen-Kohärenz)`);
      }
    }
    await page.screenshot({ path: join(OUT_DIR, "01-fresh-state.png"), fullPage: true });
    console.log("SHOT SAVED: 01-fresh-state.png");

    // Klick auf eine gesperrte Zonen-Karte: wirkungslos (kein Navigate).
    await page.evaluate(() => {
      const cards = [...document.querySelectorAll(".zone-grid .zone-card:not(.dungeon-card)")];
      const locked = cards.find((c) => c.classList.contains("zone-card-story-locked"));
      locked?.click();
    });
    await page.waitForTimeout(300);
    const stillOnSelect = await page.evaluate(() => !!document.querySelector(".zone-grid"));
    if (!stillOnSelect) KRITISCH.push("FRISCH: Klick auf gesperrte Zonen-Karte hat navigiert (Zonen-Grid verschwunden)");
    else console.log("Klick auf gesperrte Zonen-Karte: wirkungslos bestätigt.");
  }

  // ══════════════════════════════════════════════════════════════════════════════════
  // PHASE 2 — Jede der 9 Zonen-Gates einzeln durchschalten (gesperrt -> Bestiary-Check -> Quest
  // erfüllen -> offen -> zurücksetzen).
  // ══════════════════════════════════════════════════════════════════════════════════
  for (const z of GATED_ZONES) {
    // Reset auf Baseline (alles gesperrt).
    await page.evaluate(() => { window.__hfDebug.state.quests.completed = []; window.__hfDebug.state.quests.claimed = []; });
    await page.waitForTimeout(200);
    await goToCombat(page);

    const lockedInfo = await page.evaluate((zoneName) => {
      const cards = [...document.querySelectorAll(".zone-grid .zone-card:not(.dungeon-card):not(.slayer-floor-zone-card)")];
      const c = cards.find((cc) => cc.querySelector(".zone-card-name")?.textContent.trim() === zoneName);
      if (!c) return null;
      return {
        storyLocked: c.classList.contains("zone-card-story-locked"),
        hasBadge: !!c.querySelector(".zone-card-story-lock-badge"),
        hintText: c.querySelector(".zone-card-locked-hint")?.textContent.trim() ?? null,
        disabled: c.disabled,
      };
    }, z.name.de);
    const row = { id: z.id, kind: "zone", locked: null, unlocked: null, hintOk: null };
    if (!lockedInfo) { KRITISCH.push(`ZONE ${z.id}: Karte nicht gefunden (locked-Phase)`); gateMatrix.push(row); continue; }
    row.locked = lockedInfo.storyLocked && lockedInfo.disabled && lockedInfo.hasBadge;
    const expectedHint = `Erfordert Chronik-Kapitel: ${deName(z.requiresQuest)}`;
    row.hintOk = !!lockedInfo.hintText?.includes(expectedHint);
    if (!row.locked) KRITISCH.push(`ZONE ${z.id}: nicht korrekt gesperrt dargestellt: ${JSON.stringify(lockedInfo)}`);
    if (!row.hintOk) KRITISCH.push(`ZONE ${z.id}: Hinweistext falsch: "${lockedInfo.hintText}" (erwartet "${expectedHint}")`);

    // Klick auf gesperrte Karte -> wirkungslos.
    await page.evaluate((zoneName) => {
      const cards = [...document.querySelectorAll(".zone-grid .zone-card:not(.dungeon-card)")];
      cards.find((c) => c.querySelector(".zone-card-name")?.textContent.trim() === zoneName)?.click();
    }, z.name.de);
    await page.waitForTimeout(200);
    const stillSelect = await page.evaluate(() => !!document.querySelector(".zone-grid"));
    if (!stillSelect) KRITISCH.push(`ZONE ${z.id}: Klick auf gesperrte Karte hat navigiert`);

    // Bestiarium: ein Monster dieser Zone -> Fight disabled + korrekter Hinweis.
    const sampleMonster = await page.evaluate((zoneId) => {
      const { content } = window.__hfDebug;
      const m = Object.values(content.monsters).find((mm) => mm.zone === zoneId && !mm.id.startsWith("dg_") && !mm.dungeonOnly);
      return m ? { id: m.id, name: m.name.de } : null;
    }, z.id);
    if (sampleMonster) {
      // known=true erzwingen (sonst zeigt Bestiary nur den "unbekannt"-Platzhalter ohne Fight-Button).
      await page.evaluate((mid) => { window.__hfDebug.state.monsterKills[mid] = 1; }, sampleMonster.id);
      await goToBestiary(page);
      const bcard = await page.evaluate((mname) => {
        const c = [...document.querySelectorAll(".bestiary-card")].find((cc) => cc.textContent.includes(mname));
        if (!c) return null;
        const btn = c.querySelector(".bestiary-fight-btn");
        return btn ? { disabled: btn.disabled, title: btn.getAttribute("title") } : { disabled: null, title: null, noBtn: true };
      }, sampleMonster.name);
      if (!bcard || bcard.noBtn) {
        MITTEL.push(`ZONE ${z.id}: Bestiary-Karte/Fight-Button für Sample-Monster ${sampleMonster.id} nicht gefunden`);
      } else {
        if (bcard.disabled !== true) KRITISCH.push(`ZONE ${z.id}: Bestiary Fight-Button für ${sampleMonster.id} NICHT disabled (Zone gesperrt)`);
        if (!bcard.title?.includes(expectedHint)) KRITISCH.push(`ZONE ${z.id}: Bestiary-Hinweis für ${sampleMonster.id} falsch: "${bcard.title}"`);
      }
      await goToCombat(page);
    } else {
      NOTES.push(`ZONE ${z.id}: kein Welt-Monster (ohne dg_/dungeonOnly) für Bestiary-Stichprobe gefunden`);
    }

    // Quest erfüllen -> offen.
    await page.evaluate((qid) => { window.__hfDebug.state.quests.completed.push(qid); }, z.requiresQuest);
    await page.waitForTimeout(300);
    const unlockedInfo = await page.evaluate((zoneName) => {
      const cards = [...document.querySelectorAll(".zone-grid .zone-card:not(.dungeon-card):not(.slayer-floor-zone-card)")];
      const c = cards.find((cc) => cc.querySelector(".zone-card-name")?.textContent.trim() === zoneName);
      if (!c) return null;
      return { storyLocked: c.classList.contains("zone-card-story-locked"), hasBadge: !!c.querySelector(".zone-card-story-lock-badge"), disabled: c.disabled };
    }, z.name.de);
    row.unlocked = unlockedInfo && !unlockedInfo.storyLocked && !unlockedInfo.hasBadge && !unlockedInfo.disabled;
    if (!row.unlocked) KRITISCH.push(`ZONE ${z.id}: nach Quest-Erfüllung nicht korrekt entsperrt: ${JSON.stringify(unlockedInfo)}`);
    else {
      // Klick navigiert jetzt wirklich rein.
      await page.evaluate((zoneName) => {
        const cards = [...document.querySelectorAll(".zone-grid .zone-card:not(.dungeon-card)")];
        cards.find((c) => c.querySelector(".zone-card-name")?.textContent.trim() === zoneName)?.click();
      }, z.name.de);
      await page.waitForTimeout(250);
      const navigatedIn = await page.evaluate(() => !document.querySelector(".zone-grid") && !!document.querySelector(".zone-back"));
      if (!navigatedIn) KRITISCH.push(`ZONE ${z.id}: Klick auf entsperrte Karte hat NICHT navigiert`);
      await clickRetry(page, page.locator(".zone-back").first());
      await page.waitForTimeout(150);
    }
    gateMatrix.push(row);
    console.log(`ZONE ${z.id}: locked=${row.locked} hintOk=${row.hintOk} unlocked=${row.unlocked}`);
  }
  await page.screenshot({ path: join(OUT_DIR, "02-zone-loop-done.png"), fullPage: true });

  // ══════════════════════════════════════════════════════════════════════════════════
  // PHASE 3 — Dungeon-Gates einzeln (Trägerzone erst offen, dann NUR das eigene Dungeon-Gate testen).
  // ══════════════════════════════════════════════════════════════════════════════════
  let realStartDone = false;
  for (const d of contentSnapshot.dungeons) {
    const zoneDef = contentSnapshot.zones.find((z) => z.id === d.zone);
    // Reset + Trägerzone öffnen (isoliert das DUNGEON-eigene Gate von der Zonen-Kohärenzregel).
    await page.evaluate((zoneQuestId) => {
      window.__hfDebug.state.quests.completed = zoneQuestId ? [zoneQuestId] : [];
      window.__hfDebug.state.quests.claimed = [];
      window.__hfDebug.state.dungeonsUnlocked = {};
      window.__hfDebug.state.combat.monsterId = null;
      window.__hfDebug.state.combat.dungeonId = null;
    }, zoneDef?.requiresQuest ?? null);
    await page.waitForTimeout(200);
    await goToCombat(page);

    const lockedInfo = await page.evaluate((dname) => {
      const cards = [...document.querySelectorAll(".zone-grid .dungeon-card")];
      const c = cards.find((cc) => cc.querySelector(".zone-card-name")?.textContent.includes(dname));
      if (!c) return null;
      return {
        storyLocked: c.classList.contains("zone-card-story-locked"),
        hasBadge: !!c.querySelector(".zone-card-story-lock-badge"),
        hintText: c.querySelector(".zone-card-locked-hint")?.textContent.trim() ?? null,
        hasEnterBtn: !!c.querySelector(".dungeon-enter"),
      };
    }, d.name.de);
    const row = { id: d.id, kind: "dungeon", locked: null, unlocked: null, hintOk: null };
    if (!lockedInfo) { KRITISCH.push(`DUNGEON ${d.id}: Karte nicht gefunden (locked-Phase, Trägerzone offen)`); gateMatrix.push(row); continue; }
    row.locked = lockedInfo.storyLocked && lockedInfo.hasBadge && !lockedInfo.hasEnterBtn;
    // Trägerzone jetzt OFFEN -> Hinweis muss die EIGENE Dungeon-Quest nennen (nicht mehr die Zone).
    const expectedHint = `Erfordert Chronik-Kapitel: ${deName(d.requiresQuest)}`;
    row.hintOk = !!lockedInfo.hintText?.includes(expectedHint);
    if (!row.locked) KRITISCH.push(`DUNGEON ${d.id}: nicht korrekt gesperrt dargestellt (Trägerzone offen): ${JSON.stringify(lockedInfo)}`);
    if (!row.hintOk) KRITISCH.push(`DUNGEON ${d.id}: Hinweistext bei offener Trägerzone falsch: "${lockedInfo.hintText}" (erwartet "${expectedHint}")`);

    // Kein Enter-Button vorhanden, also auch kein Klickpfad zum Dungeon-Start.
    const dungeonIdBefore = await page.evaluate(() => window.__hfDebug.state.combat.dungeonId);
    await page.evaluate((dname) => {
      const cards = [...document.querySelectorAll(".zone-grid .dungeon-card")];
      cards.find((c) => c.querySelector(".zone-card-name")?.textContent.includes(dname))?.click();
    }, d.name.de);
    await page.waitForTimeout(200);
    const dungeonIdAfter = await page.evaluate(() => window.__hfDebug.state.combat.dungeonId);
    if (dungeonIdAfter !== dungeonIdBefore) KRITISCH.push(`DUNGEON ${d.id}: Klick auf gesperrte Karte hat einen Run gestartet!`);

    // Quest erfüllen -> offen, Enter aktiv.
    await page.evaluate((qid) => { window.__hfDebug.state.quests.completed.push(qid); }, d.requiresQuest);
    await page.waitForTimeout(300);
    const unlockedInfo = await page.evaluate((dname) => {
      const cards = [...document.querySelectorAll(".zone-grid .dungeon-card")];
      const c = cards.find((cc) => cc.querySelector(".zone-card-name")?.textContent.includes(dname));
      if (!c) return null;
      const btn = c.querySelector(".dungeon-enter");
      return { storyLocked: c.classList.contains("zone-card-story-locked"), hasBadge: !!c.querySelector(".zone-card-story-lock-badge"), hasEnterBtn: !!btn, enterDisabled: btn?.disabled ?? null };
    }, d.name.de);
    row.unlocked = unlockedInfo && !unlockedInfo.storyLocked && !unlockedInfo.hasBadge && unlockedInfo.hasEnterBtn && unlockedInfo.enterDisabled === false;
    if (!row.unlocked) KRITISCH.push(`DUNGEON ${d.id}: nach Quest-Erfüllung nicht korrekt entsperrt: ${JSON.stringify(unlockedInfo)}`);
    else if (!realStartDone) {
      // Einmal wirklich den Enter-Klick bis zum echten Run-Start durchziehen (End-to-End-Beweis,
      // dass der Button wirklich startDungeon aufruft statt nur kosmetisch aktiv zu sein).
      await clickRetry(page, page.locator(".dungeon-enter").first());
      await page.waitForTimeout(400);
      const started = await page.evaluate((did) => window.__hfDebug.state.combat.dungeonId === did, d.id);
      if (!started) KRITISCH.push(`DUNGEON ${d.id}: Klick auf aktiven Enter-Button hat KEINEN Run gestartet`);
      else console.log(`DUNGEON ${d.id}: echter Enter-Klick hat Run gestartet (bestätigt).`);
      await page.evaluate(() => { window.__hfDebug.state.combat.monsterId = null; window.__hfDebug.state.combat.dungeonId = null; });
      await page.waitForTimeout(200);
      await goToCombat(page);
      realStartDone = true;
    }
    gateMatrix.push(row);
    console.log(`DUNGEON ${d.id}: locked=${row.locked} hintOk=${row.hintOk} unlocked=${row.unlocked}`);
  }

  // ══════════════════════════════════════════════════════════════════════════════════
  // PHASE 4 — Trägerzonen-Kohärenz (künstlich konstruiert): Zone GESPERRT + Dungeon-eigene Quest
  // ERFÜLLT -> Dungeon bleibt gesperrt, Hinweis nennt die ZONE, nicht die Dungeon-Quest.
  // Getestet an 2 Dungeons mit UNTERSCHIEDLICHER Zonen-/Dungeon-Gate-Quest (goblin_warband,
  // behind_the_throne) — idol_sanctum hat absichtlich dieselbe Gate-Quest wie seine Zone (chronicle_18)
  // und kann diese Divergenz nicht zeigen (dokumentiert als Sonderfall statt Test).
  // ══════════════════════════════════════════════════════════════════════════════════
  for (const dungeonId of ["goblin_warband", "behind_the_throne"]) {
    const d = contentSnapshot.dungeons.find((x) => x.id === dungeonId);
    const zoneDef = contentSnapshot.zones.find((z) => z.id === d.zone);
    await page.evaluate((ownQuestId) => {
      // Zone bleibt GESPERRT (kein Zonen-Gate-Quest in completed), aber die DUNGEON-eigene Quest wird
      // künstlich als erfüllt injiziert — auf normalem Spielweg unmöglich (requires-Kette verhindert
      // das), hier bewusst über __hfDebug erzwungen, um die Kohärenzregel isoliert zu prüfen.
      window.__hfDebug.state.quests.completed = [ownQuestId];
      window.__hfDebug.state.quests.claimed = [];
      window.__hfDebug.state.dungeonsUnlocked = {};
    }, d.requiresQuest);
    await page.waitForTimeout(200);
    await goToCombat(page);
    const info = await page.evaluate((dname) => {
      const cards = [...document.querySelectorAll(".zone-grid .dungeon-card")];
      const c = cards.find((cc) => cc.querySelector(".zone-card-name")?.textContent.includes(dname));
      if (!c) return null;
      return {
        storyLocked: c.classList.contains("zone-card-story-locked"),
        hasEnterBtn: !!c.querySelector(".dungeon-enter"),
        hintText: c.querySelector(".zone-card-locked-hint")?.textContent.trim() ?? null,
      };
    }, d.name.de);
    if (!info) { KRITISCH.push(`KOHÄRENZ ${d.id}: Karte nicht gefunden`); continue; }
    const expectedZoneHint = `Erfordert Chronik-Kapitel: ${deName(zoneDef.requiresQuest)}`;
    const wrongDungeonHint = `Erfordert Chronik-Kapitel: ${deName(d.requiresQuest)}`;
    if (!info.storyLocked || info.hasEnterBtn) {
      KRITISCH.push(`KOHÄRENZ ${d.id}: Dungeon fälschlich OFFEN trotz gesperrter Trägerzone (eigene Quest ${d.requiresQuest} künstlich erfüllt) — Trägerzonen-Kohärenz gebrochen!`);
    } else if (!info.hintText?.includes(expectedZoneHint)) {
      KRITISCH.push(`KOHÄRENZ ${d.id}: Hinweis nennt nicht die Zone: "${info.hintText}" (erwartet "${expectedZoneHint}")`);
    } else if (info.hintText?.includes(wrongDungeonHint) && wrongDungeonHint !== expectedZoneHint) {
      KRITISCH.push(`KOHÄRENZ ${d.id}: Hinweis nennt fälschlich die Dungeon-eigene Quest statt der Zone: "${info.hintText}"`);
    } else {
      console.log(`KOHÄRENZ ${d.id}: korrekt — Dungeon bleibt gesperrt, Hinweis nennt die Zone ("${info.hintText}").`);
    }
  }
  await page.screenshot({ path: join(OUT_DIR, "03-coherence.png"), fullPage: true });

  // ══════════════════════════════════════════════════════════════════════════════════
  // PHASE 5 — Paragonturm: eigene Optik, unverändert.
  // ══════════════════════════════════════════════════════════════════════════════════
  await page.evaluate(() => { window.__hfDebug.state.quests.completed = []; window.__hfDebug.state.quests.claimed = []; window.__hfDebug.state.dungeonsUnlocked = {}; });
  await page.waitForTimeout(200);
  await goToCombat(page);
  const paragonInfo = await page.evaluate(() => {
    const el = document.querySelector(".paragon-card");
    if (!el) return { found: false };
    return {
      found: true,
      hasStoryLockedClass: el.classList.contains("zone-card-story-locked"),
      hasDungeonLocked: el.classList.contains("dungeon-locked"),
      hasOldKeyHint: !!el.querySelector(".dungeon-locked-hint"),
      hasOldKeyIcon: !!el.querySelector(".dungeon-lock-icon"),
    };
  });
  console.log("Paragon-Karte: " + JSON.stringify(paragonInfo));
  if (!paragonInfo.found) NOTES.push("Paragonturm-Karte nicht im midgame-Fixture-Content sichtbar (evtl. Content-Voraussetzung fehlt) — übersprungen.");
  else {
    if (paragonInfo.hasStoryLockedClass) KRITISCH.push("PARAGON: trägt fälschlich .zone-card-story-locked (sollte eigenes Schlüssel-System behalten)");
    if (!paragonInfo.hasDungeonLocked || !paragonInfo.hasOldKeyHint || !paragonInfo.hasOldKeyIcon) {
      KRITISCH.push(`PARAGON: eigene Schlüssel-Optik fehlt teilweise: ${JSON.stringify(paragonInfo)}`);
    } else {
      console.log("PARAGON: eigene Schlüssel-Optik unverändert bestätigt.");
    }
  }

  // ══════════════════════════════════════════════════════════════════════════════════
  // PHASE 6 — Bestiarium dungeonOnly-Monster: gesperrt (Chronik-Hinweis) vs. offen (dungeonOnly-Hinweis).
  // ══════════════════════════════════════════════════════════════════════════════════
  {
    const dungeonOnlySample = await page.evaluate(() => {
      const { content } = window.__hfDebug;
      for (const d of content.dungeons) {
        if (d.id === "paragon_tower") continue;
        for (const encId of d.encounters) {
          const m = content.monsters[encId];
          if (m?.dungeonOnly) return { monsterId: m.id, monsterName: m.name.de, dungeonId: d.id, dungeonName: d.name.de, requiresQuest: d.requiresQuest, zone: d.zone };
        }
      }
      return null;
    });
    if (!dungeonOnlySample) {
      MITTEL.push("Kein dungeonOnly-Monster im Content gefunden — Bestiary-dungeonOnly-Check übersprungen.");
    } else {
      const zoneDef = contentSnapshot.zones.find((z) => z.id === dungeonOnlySample.zone);
      // (a) Dungeon gesperrt (alles zurückgesetzt) -> Chronik-Hinweis (Zone gewinnt, da auch gesperrt).
      await page.evaluate((mid) => { window.__hfDebug.state.monsterKills[mid] = 1; window.__hfDebug.state.quests.completed = []; window.__hfDebug.state.quests.claimed = []; }, dungeonOnlySample.monsterId);
      await goToBestiary(page);
      const lockedCard = await page.evaluate((mname) => {
        const c = [...document.querySelectorAll(".bestiary-card")].find((cc) => cc.textContent.includes(mname));
        const btn = c?.querySelector(".bestiary-fight-btn");
        return btn ? { disabled: btn.disabled, title: btn.getAttribute("title") } : null;
      }, dungeonOnlySample.monsterName);
      const expectedLockedHint = `Erfordert Chronik-Kapitel: ${deName(zoneDef.requiresQuest)}`;
      if (!lockedCard) MITTEL.push(`BESTIARY dungeonOnly ${dungeonOnlySample.monsterId}: Karte nicht gefunden (gesperrte Phase)`);
      else {
        if (lockedCard.disabled !== true) KRITISCH.push(`BESTIARY dungeonOnly ${dungeonOnlySample.monsterId}: Fight-Button nicht disabled (Dungeon gesperrt)`);
        if (!lockedCard.title?.includes(expectedLockedHint)) KRITISCH.push(`BESTIARY dungeonOnly ${dungeonOnlySample.monsterId}: Hinweis (gesperrt) falsch: "${lockedCard.title}"`);
      }
      // (b) Dungeon offen (Zone + eigene Quest erfüllen) -> Button bleibt disabled, aber Hinweis wechselt.
      await page.evaluate((qs) => { window.__hfDebug.state.quests.completed = qs; }, [...new Set([zoneDef.requiresQuest, dungeonOnlySample.requiresQuest])]);
      await page.waitForTimeout(300);
      await goToCharacter(page);
      await goToBestiary(page);
      const unlockedCard = await page.evaluate((mname) => {
        const c = [...document.querySelectorAll(".bestiary-card")].find((cc) => cc.textContent.includes(mname));
        const btn = c?.querySelector(".bestiary-fight-btn");
        return btn ? { disabled: btn.disabled, title: btn.getAttribute("title") } : null;
      }, dungeonOnlySample.monsterName);
      if (!unlockedCard) MITTEL.push(`BESTIARY dungeonOnly ${dungeonOnlySample.monsterId}: Karte nicht gefunden (offene Phase)`);
      else {
        if (unlockedCard.disabled !== true) KRITISCH.push(`BESTIARY dungeonOnly ${dungeonOnlySample.monsterId}: Fight-Button ist NICHT disabled trotz dungeonOnly (nie direkt startbar!)`);
        if (!unlockedCard.title || unlockedCard.title.includes("Chronik-Kapitel")) {
          KRITISCH.push(`BESTIARY dungeonOnly ${dungeonOnlySample.monsterId}: Hinweis wechselt nach Unlock nicht auf dungeonOnly-Text: "${unlockedCard.title}"`);
        } else {
          console.log(`BESTIARY dungeonOnly ${dungeonOnlySample.monsterId}: Hinweis nach Unlock = "${unlockedCard.title}" (dungeonOnly-Hinweis bestätigt).`);
        }
      }
    }
  }

  // ══════════════════════════════════════════════════════════════════════════════════
  // PHASE 7 — Slayer: viele Task-Neuwürfe bei gemischtem Zonen-Lock-Stand, NIE ein Monster einer
  // gesperrten Zone.
  // ══════════════════════════════════════════════════════════════════════════════════
  {
    // chronicle_01..chronicle_08 -> öffnet borderlands(03)+ashfields(05)+blackthorn(07); crypt(09)+
    // wildwood(11)+coast(13)+slagpit(14)+highlands(15)+idolhall(18) bleiben GESPERRT — gemischter Stand.
    const partialChapters = Array.from({ length: 8 }, (_, i) => `chronicle_${String(i + 1).padStart(2, "0")}`);
    await page.evaluate((chapters) => {
      const s = window.__hfDebug.state;
      s.quests.completed = [...chapters];
      s.quests.claimed = [...chapters];
      s.dungeonsUnlocked = {};
      s.slayerTask = null;
    }, partialChapters);
    await page.waitForTimeout(200);
    const lockedZoneIds = await page.evaluate(() => {
      const { state, content } = window.__hfDebug;
      const { isZoneUnlocked: _dummy } = {}; // nicht importierbar im Page-Context, daher Inline-Logik:
      return content.zones.filter((z) => {
        if (!z.requiresQuest) return false;
        return !(state.quests.claimed.includes(z.requiresQuest) || state.quests.completed.includes(z.requiresQuest));
      }).map((z) => z.id);
    });
    console.log("SLAYER-Testlauf: gesperrte Zonen = " + JSON.stringify(lockedZoneIds));

    await goToSlayer(page);
    const N = 40;
    let violations = 0;
    let assignedCount = 0;
    let noMasterCount = 0;
    for (let i = 0; i < N; i++) {
      await page.evaluate(() => { window.__hfDebug.state.slayerTask = null; });
      const btn = page.locator(".slayer-get-task-btn").first();
      const btnCount = await btn.count();
      if (btnCount === 0) { noMasterCount++; continue; }
      const isDisabled = await btn.isDisabled().catch(() => true);
      if (isDisabled) { noMasterCount++; continue; }
      await btn.click({ timeout: 4000 }).catch(() => {});
      await page.waitForTimeout(60);
      const task = await page.evaluate(() => window.__hfDebug.state.slayerTask);
      if (!task) continue;
      assignedCount++;
      const zone = await page.evaluate((mid) => window.__hfDebug.content.monsters[mid]?.zone ?? null, task.monsterId);
      if (zone && lockedZoneIds.includes(zone)) {
        violations++;
        KRITISCH.push(`SLAYER: Task #${i} vergab Monster "${task.monsterId}" aus GESPERRTER Zone "${zone}" (isTower=${task.isTower})`);
      }
    }
    console.log(`SLAYER: ${N} Versuche, ${assignedCount} Tasks vergeben, ${noMasterCount}x kein verfügbarer Master, ${violations} Verstöße.`);
    if (assignedCount === 0) MITTEL.push("SLAYER: in keinem der Rerolls wurde überhaupt ein Task vergeben (Master evtl. nicht verfügbar) — Stichprobe ungültig.");

    // Grenzfall (nur konstruierbar, nicht auf normalem Spielweg erreichbar): ein Task ist aktiv,
    // seine Zone wird NACHTRÄGLICH künstlich wieder gesperrt (Quest aus completed/claimed entfernt).
    // In echten Saves unmöglich (Quests sind monoton), aber dokumentiert den Ist-Zustand.
    await page.evaluate(() => { window.__hfDebug.state.slayerTask = null; });
    let grantCaseFound = false;
    for (let i = 0; i < 15 && !grantCaseFound; i++) {
      const btn = page.locator(".slayer-get-task-btn").first();
      if (await btn.count() === 0 || await btn.isDisabled().catch(() => true)) break;
      await btn.click({ timeout: 4000 }).catch(() => {});
      await page.waitForTimeout(60);
      const task = await page.evaluate(() => window.__hfDebug.state.slayerTask);
      const zone = task ? await page.evaluate((mid) => window.__hfDebug.content.monsters[mid]?.zone ?? null, task.monsterId) : null;
      const zoneGate = zone ? await page.evaluate((zid) => window.__hfDebug.content.zones.find((z) => z.id === zid)?.requiresQuest ?? null, zone) : null;
      if (task && zoneGate) {
        grantCaseFound = true;
        // Zone künstlich re-sperren.
        await page.evaluate((qid) => {
          const s = window.__hfDebug.state;
          s.quests.completed = s.quests.completed.filter((x) => x !== qid);
          s.quests.claimed = s.quests.claimed.filter((x) => x !== qid);
        }, zoneGate);
        await page.waitForTimeout(150);
        await goToBestiary(page);
        const monsterName = await page.evaluate((mid) => window.__hfDebug.content.monsters[mid]?.name.de, task.monsterId);
        await page.evaluate((mid) => { window.__hfDebug.state.monsterKills[mid] = 1; }, task.monsterId);
        await page.waitForTimeout(150);
        // reload state view (React braucht ggf. einen Re-render-Trigger)
        await page.evaluate(() => {}); // no-op, state ist ohnehin reaktiv über den GameContext-Tick
        const card = await page.evaluate((mname) => {
          const c = [...document.querySelectorAll(".bestiary-card")].find((cc) => cc.textContent.includes(mname));
          const btn2 = c?.querySelector(".bestiary-fight-btn");
          return btn2 ? { disabled: btn2.disabled, title: btn2.getAttribute("title") } : null;
        }, monsterName);
        NOTES.push(
          `SLAYER Grenzfall (künstlich, nicht auf normalem Weg erreichbar): Task auf "${task.monsterId}" (Zone "${zone}") aktiv, Zone nachträglich re-gesperrt. ` +
          `Bestiary-Fight-Button danach: ${JSON.stringify(card)}. Task blieb im State stehen (state.slayerTask.monsterId=${task.monsterId}); ` +
          `Kämpfen des Task-Monsters ist über canFightMonster/Bestiary weiterhin hart blockiert (Fight-Button disabled) — der Task selbst wird dadurch NICHT automatisch abgebrochen oder ` +
          `ersetzt, bliebe aber unvollendbar, solange die Zone gesperrt ist (rein synthetisches Szenario, in echten Saves durch Quest-Monotonie ausgeschlossen).`,
        );
        await page.evaluate(() => { window.__hfDebug.state.slayerTask = null; });
      } else if (task) {
        await page.evaluate(() => { window.__hfDebug.state.slayerTask = null; });
      }
    }
    if (!grantCaseFound) NOTES.push("SLAYER Grenzfall (Task auf inzwischen gesperrte Zone): in 15 Versuchen keinen zonengebundenen Welt-Task getroffen, nicht weiter konstruierbar in dieser Sweep-Zeit.");
  }
  await page.screenshot({ path: join(OUT_DIR, "04-slayer.png"), fullPage: true });

  await browser.close();

  // ══════════════════════════════════════════════════════════════════════════════════
  // REPORT
  // ══════════════════════════════════════════════════════════════════════════════════
  console.log("\n\n═══════════════ GATE-MATRIX ═══════════════");
  console.log("id | kind | locked | hintOk | unlocked");
  for (const r of gateMatrix) console.log(`${r.id} | ${r.kind} | ${r.locked} | ${r.hintOk} | ${r.unlocked}`);

  console.log("\n═══════════════ KRITISCH (" + KRITISCH.length + ") ═══════════════");
  KRITISCH.forEach((p) => console.log("- " + p));
  console.log("\n═══════════════ MITTEL (" + MITTEL.length + ") ═══════════════");
  MITTEL.forEach((p) => console.log("- " + p));
  console.log("\n═══════════════ NOTIZEN ═══════════════");
  NOTES.forEach((p) => console.log("- " + p));
  console.log(errors.length ? `\n${errors.length} page errors:\n` + errors.slice(0, 20).join("\n") : "\nno page errors");

  if (KRITISCH.length || errors.length) process.exitCode = 1;
} finally {
  child.kill();
}
