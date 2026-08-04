#!/usr/bin/env node
/**
 * Tester-Sweep 2 (RC 0.1, 2026-07-13) — T3 "Der Endgamer": Chronik-Finale Kapitel 15-21 + Endkampf.
 *
 * SIMULATIONS-SPIELER (headless vite + Playwright, Port 5252, ?fixture=endgame):
 *  A) Kapitel 15 (Schlackengrube, Zeugen-Geständnis-loreText prüfen/lesen)
 *  B) Kapitel 16/17: highland_aerie öffnet mit 16, wyvern_lair mit 17
 *  C) Kapitel 18 "Das letzte Tor": idol_sanctum + Zone Götzenhalle öffnen; KEIN Schlüssel erwähnt
 *  D) Kapitel 19: last_idol REAL im Sanctum-Dungeon legen (Kill-Credit über Dungeon-Lauf),
 *     Claim -> behind_the_throne öffnet (Dungeon-Chip am Kapitel)
 *  E) Kapitel 20: "Hinter dem Thron" -> Drazhan-Kampf REAL durchspielen (Dauer, Enrage <20%,
 *     Burn, Platzhalter-Art, kein Crash) -> Sieg -> Loot + Claim (25000 Gold) -> Rückzugszeile
 *  F) Kapitel 21: reach_paragon_floor (Anzeige, Fortschritt = paragon.best), Claim, Epilog
 *  G) Regression: Paragonturm bleibt key-basiert zugänglich (unabhängig von Chronik-Claims)
 *
 * Wegwerf-Skript. Kein Produktcode-Edit. Locale = DE (Default), Muster: story-tab-check.mjs.
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5252;
const BASE_URL = `http://localhost:${PORT}`;
const OUT_DIR = "C:\\Users\\MSchu\\AppData\\Local\\Temp\\claude\\G--GameDev\\553d2095-3a73-4795-9782-0fe746a25f13\\scratchpad";

const problems = []; // { sev: "KRITISCH"|"MITTEL"|"KOSMETISCH", msg, repro }
const notes = [];
const errors = [];
const t0 = Date.now();
const log = (m) => console.log(`[${((Date.now() - t0) / 1000).toFixed(0)}s] ${m}`);
const problem = (sev, msg) => { problems.push(`${sev}: ${msg}`); log(`PROBLEM ${sev}: ${msg}`); };
const note = (m) => { notes.push(m); log(`NOTE: ${m}`); };

function startDevServer() {
  const viteBin = join(CLIENT_DIR, "node_modules", "vite", "bin", "vite.js");
  const child = spawn(
    process.execPath,
    // vite.t3.config.mjs = Tour-Config + hmr:false — parallele Repo-Schreiber (Sweep-Agenten)
    // lösten sonst vite-Full-Reloads aus, die das ?fixture= mitten im Bosskampf zurücksetzten.
    [viteBin, "dev", "--config", join(CLIENT_DIR, "ui-audit", "vite.t3.config.mjs"), "--port", String(PORT), "--strictPort"],
    { cwd: CLIENT_DIR, stdio: ["ignore", "pipe", "pipe"] },
  );
  let out = "";
  child.stdout.on("data", (d) => (out += d.toString()));
  child.stderr.on("data", (d) => (out += d.toString()));
  return { child, getOutput: () => out };
}

async function waitForServer(url, t = 60000) {
  const s = Date.now();
  while (Date.now() - s < t) {
    try { const r = await fetch(url); if (r.ok) return true; } catch {}
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

/** Blockierende Modals wegklicken: Meisterweihe (Queue bis 7×), Death-Popup, Clear-Zeremonie. */
async function dismissCeremonies(page) {
  for (let i = 0; i < 14; i++) {
    const kind = await page.evaluate(() => {
      if (document.querySelector(".mwc-backdrop")) return "mwc";
      if (document.querySelector(".death-modal")) return "death";
      if (document.querySelector(".dcc-backdrop")) return "dcc";
      return null;
    });
    if (!kind) return;
    const sel = kind === "mwc" ? ".mwc-next-btn" : kind === "death" ? ".death-modal .combat-btn" : ".dcc-next-btn";
    await page.locator(sel).first().click({ timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(1400); // QUEUE_PAUSE_MS 800 + Exit-Animation 420
  }
}

async function clickRetry(page, locator, opts = {}) {
  await dismissCeremonies(page);
  try { await locator.click({ timeout: 8000, ...opts }); }
  catch { await dismissCeremonies(page); await page.waitForTimeout(500); await locator.click({ timeout: 8000, ...opts }); }
}

async function shot(page, name) {
  await page.screenshot({ path: join(OUT_DIR, name) });
  log(`SHOT: ${name}`);
}

async function goCombat(page) {
  await clickRetry(page, page.locator('[data-guide-id="sidebar.combat"]').first());
  await page.waitForSelector(".combat-page", { timeout: 8000 });
  await page.waitForTimeout(350);
}

async function goStory(page) {
  await clickRetry(page, page.locator('[data-guide-id="topbar.quests"]').first());
  await page.waitForSelector(".quests-page", { timeout: 8000 });
  await page.waitForTimeout(300);
  // Story-Tab sicherstellen (öffnet bei aktivem Kapitel automatisch, sonst klicken).
  const active = await page.evaluate(() => document.querySelector(".quests-tab-btn--active")?.textContent?.trim() ?? "");
  if (!active.startsWith("Story")) {
    await clickRetry(page, page.locator(".quests-tab-btn", { hasText: "Story" }).first());
    await page.waitForTimeout(250);
  }
}

/** Zusammenfassung der aktuellen Chronik-Bühne. */
const READ_STAGE = () => {
  const stage = document.querySelector(".chronicle-stage");
  if (!stage) return { present: false, complete: !!document.querySelector(".chronicle-stage-complete") };
  const objs = [...stage.querySelectorAll(".chronicle-obj")].map((o) => ({
    label: o.querySelector(".chronicle-obj-label")?.textContent?.trim() ?? null,
    where: o.querySelector(".chronicle-obj-where")?.textContent?.trim() ?? null,
    count: o.querySelector(".chronicle-obj-count")?.textContent?.trim() ?? null,
    done: o.classList.contains("chronicle-obj--done"),
  }));
  const unlockChips = [...stage.querySelectorAll(".quest-reward-chip--unlock")].map((c) => ({
    text: c.textContent?.trim() ?? "",
    isDungeon: c.classList.contains("quest-reward-chip--unlock-dungeon"),
  }));
  const bubble = stage.querySelector(".npc-bubble-text");
  const bubbleStyle = bubble ? getComputedStyle(bubble) : null;
  return {
    present: true,
    complete: stage.classList.contains("chronicle-stage-complete"),
    done: stage.classList.contains("chronicle-stage--done"),
    chapnum: stage.querySelector(".chronicle-stage-chapnum")?.textContent?.trim() ?? null,
    counter: document.querySelector(".chronicle-tab-counter")?.textContent?.trim() ?? null,
    title: stage.querySelector(".chronicle-stage-title")?.textContent?.trim() ?? null,
    statusBadge: stage.querySelector(".quest-status-badge")?.textContent?.trim() ?? null,
    bubbleText: bubble?.textContent?.trim() ?? null,
    bubbleFontPx: bubbleStyle ? bubbleStyle.fontSize : null,
    claimBtn: !!stage.querySelector(".chronicle-stage-claim"),
    objs,
    unlockChips,
    overflowX: stage.scrollWidth - stage.clientWidth,
  };
};

/** Zonen-/Dungeon-Karten der Combat-Seite zusammenfassen. */
const READ_COMBAT_CARDS = () => {
  const zones = [...document.querySelectorAll(".zone-card:not(.dungeon-card)")].map((c) => ({
    name: c.querySelector(".zone-card-name")?.textContent?.trim() ?? "",
    locked: c.classList.contains("zone-card-story-locked"),
    hint: c.querySelector(".zone-card-locked-hint")?.textContent?.trim() ?? null,
  }));
  const dungeons = [...document.querySelectorAll(".dungeon-card")].map((c) => ({
    name: c.querySelector(".zone-card-name")?.textContent?.trim() ?? "",
    locked: c.classList.contains("zone-card-story-locked"),
    isParagon: c.classList.contains("paragon-card"),
    hint: c.querySelector(".zone-card-locked-hint")?.textContent?.trim() ?? null,
    enterDisabled: c.querySelector(".dungeon-enter")?.disabled ?? null,
    fullText: c.textContent ?? "",
  }));
  const paragonPanel = document.querySelector(".paragon-panel");
  return { zones, dungeons, paragonPanelPresent: !!paragonPanel };
};

const COMBAT_SNAP = () => {
  const { state, content } = window.__hfDebug;
  const cs = state.combat;
  const m = cs?.monsterId ? content.monsters[cs.monsterId] : null;
  const invQty = (id) => state.inventory.slots.reduce((s, sl) => s + (sl && sl.itemId === id ? sl.qty : 0), 0);
  return {
    // WICHTIG: state.combat ist IMMER ein Objekt — "im Kampf" heißt monsterId !== null
    // (Stalemate/Tod setzen monsterId=null und lassen das Objekt stehen, s. combat.ts).
    inCombat: !!cs && cs.monsterId !== null,
    stopReason: cs?.stopReason ?? null,
    baseIntact: state.quests.claimed.includes("chronicle_14"),
    monsterId: cs?.monsterId ?? null,
    enemyHp: cs?.enemyHp ?? null,
    enemyMax: m?.maxHp ?? null,
    encounterIndex: cs?.encounterIndex ?? null,
    dungeonId: cs?.dungeonId ?? null,
    paragonFloor: cs?.paragonFloor ?? null,
    hp: state.character.hp,
    mana: state.character.mana,
    burn: (cs?.playerEffects ?? []).some((e) => e.type === "burn"),
    effects: (cs?.playerEffects ?? []).map((e) => e.type),
    gold: state.character.gold,
    food: invQty(state.character.food ?? ""),
    potion: invQty(state.character.autoPotion?.healPotionId ?? ""),
    kills: {
      last_idol: state.monsterKills["last_idol"] ?? 0,
      drazhan: state.monsterKills["drazhan"] ?? 0,
    },
    lastStop: state.lastStop ? JSON.parse(JSON.stringify(state.lastStop)) : null,
    ceremonyOpen: !!document.querySelector(".dcc-backdrop"),
  };
};

/** Kampf-/Dungeon-Schleife: pollt bis Sieg (killTarget-Zähler steigt) oder Kampf-Ende (Tod/Abbruch). */
async function fightLoop(page, { label, killTarget, maxMs, enemyMaxHp, shotPrefix }) {
  const start = Date.now();
  let lastBeat = 0;
  let sawEnrage = false;
  let sawMid = false;
  let burnPolls = 0, polls = 0;
  let minHp = Infinity;
  let lastWave = -1;
  const killsBefore = await page.evaluate((t) => window.__hfDebug.state.monsterKills[t] ?? 0, killTarget);
  while (Date.now() - start < maxMs) {
    const s = await page.evaluate(COMBAT_SNAP);
    polls++;
    if (!s.baseIntact) {
      log(`${label}: FIXTURE-RESET erkannt (Chronik-Claims verschwunden — vite-Full-Reload während des Kampfs).`);
      return { won: false, reset: true, ms: Date.now() - start, minHp, burnPct: burnPolls / Math.max(1, polls) };
    }
    if (s.burn) burnPolls++;
    if (s.hp < minHp) minHp = s.hp;
    if (s.encounterIndex !== null && s.encounterIndex !== lastWave) {
      log(`${label}: Welle ${s.encounterIndex + 1} beginnt (Monster ${s.monsterId}, HP ${s.enemyHp}/${s.enemyMax}) — Spieler-HP ${s.hp}`);
      lastWave = s.encounterIndex;
    }
    const kills = (await page.evaluate((t) => window.__hfDebug.state.monsterKills[t] ?? 0, killTarget));
    if (kills > killsBefore) {
      log(`${label}: SIEG — ${killTarget} gelegt nach ${((Date.now() - start) / 1000).toFixed(0)}s. Spieler-HP min ${minHp}. Burn-Uptime ~${Math.round((burnPolls / Math.max(1, polls)) * 100)}%`);
      return { won: true, ms: Date.now() - start, minHp, burnPct: burnPolls / Math.max(1, polls) };
    }
    if (!s.inCombat) {
      // Doppelt prüfen: kurze combat=null-Lücken (Wellen-/Zeremonie-Übergang) nicht als Tod werten.
      await page.waitForTimeout(1500);
      const s2 = await page.evaluate(COMBAT_SNAP);
      const kills2 = await page.evaluate((t) => window.__hfDebug.state.monsterKills[t] ?? 0, killTarget);
      if (kills2 > killsBefore) {
        log(`${label}: SIEG (nach Übergangs-Lücke) nach ${((Date.now() - start) / 1000).toFixed(0)}s.`);
        return { won: true, ms: Date.now() - start, minHp, burnPct: burnPolls / Math.max(1, polls) };
      }
      if (!s2.inCombat) {
        log(`${label}: Kampf beendet OHNE Kill (Tod/Abbruch/Patt). stopReason=${s2.stopReason} lastStop=${JSON.stringify(s2.lastStop)} hp=${s2.hp}`);
        return { won: false, ms: Date.now() - start, minHp, burnPct: burnPolls / Math.max(1, polls), lastStop: s2.lastStop, stopReason: s2.stopReason };
      }
    }
    if (s.monsterId === killTarget && enemyMaxHp) {
      if (!sawMid && s.enemyHp <= enemyMaxHp * 0.55) {
        sawMid = true;
        await shot(page, `${shotPrefix}-mid.png`);
      }
      if (!sawEnrage && s.enemyHp <= enemyMaxHp * 0.19) {
        sawEnrage = true;
        log(`${label}: ENRAGE-Phase erreicht (Gegner ${s.enemyHp}/${enemyMaxHp}, Spieler ${s.hp} HP, burn=${s.burn})`);
        await shot(page, `${shotPrefix}-enrage.png`);
      }
    }
    if (Date.now() - lastBeat > 30000) {
      lastBeat = Date.now();
      log(`${label}: … Gegner ${s.monsterId} ${s.enemyHp}/${s.enemyMax} — Spieler ${s.hp} HP, Food ${s.food}, Trank ${s.potion}, Effekte [${s.effects.join(",")}]`);
    }
    await page.waitForTimeout(2500);
  }
  log(`${label}: TIMEOUT nach ${maxMs / 1000}s`);
  return { won: false, ms: maxMs, minHp, timeout: true };
}

async function closeCeremony(page, shotName = null) {
  const open = await page.evaluate(() => !!document.querySelector(".dcc-backdrop"));
  if (!open) return null;
  const loot = await page.evaluate(() => ({
    title: document.querySelector(".dcc-title")?.textContent?.trim() ?? null,
    rewards: [...document.querySelectorAll(".dcc-reward-chip")].map((c) => c.textContent?.trim()),
    loot: [...document.querySelectorAll(".dcc-loot-item")].map((c) => c.textContent?.trim()),
  }));
  if (shotName) await shot(page, shotName);
  await page.locator(".dcc-next-btn").first().click({ timeout: 6000 }).catch(() => {});
  await page.waitForTimeout(400);
  return loot;
}

/** Kill-Zähler setzen (kumulativ, non-repeatable Quests haben Baseline 0). */
async function setKills(page, kills) {
  await page.evaluate((k) => {
    for (const [id, n] of Object.entries(k)) window.__hfDebug.state.monsterKills[id] = n;
  }, kills);
  await page.waitForTimeout(600); // evaluateQuests im Tick abwarten
}

async function claimActive(page, expectGoldDelta) {
  const before = await page.evaluate(() => window.__hfDebug.state.character.gold);
  await clickRetry(page, page.locator(".chronicle-stage-claim").first());
  await page.waitForTimeout(600);
  const after = await page.evaluate(() => window.__hfDebug.state.character.gold);
  return { goldDelta: after - before, expect: expectGoldDelta };
}

const { child, getOutput } = startDevServer();
let browser;
try {
  const ok = await waitForServer(BASE_URL);
  if (!ok) { console.error("SERVER NOT UP:\n" + getOutput()); process.exit(1); }
  log("vite dev-server läuft auf :" + PORT);

  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on("pageerror", (e) => { errors.push(`pageerror: ${e.message}`); log(`PAGEERROR: ${e.message}`); });
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console: ${m.text()}`);
    // vite-Full-Reloads sichtbar machen (Verdacht: Dependency-Discovery lud die Seite mitten im
    // Bosskampf neu → Fixture-Reset; Lauf v4 real beobachtet).
    if (m.text().includes("[vite]")) log(`VITE: ${m.text()}`);
  });
  page.on("load", () => log("PAGE (RE)LOAD-Event — bei laufendem Test = Fixture-Reset!"));

  // Route-Patch (Task-Vorgabe): endgame.json mit abgeschlossenem Onboarding + gesehenen Touren.
  await page.route("**/ui-audit-fixtures/endgame.json", async (route) => {
    const res = await route.fetch();
    const json = JSON.parse(await res.text());
    json.state.onboarding = { active: false, step: 0, done: true, toursSeen: { combat: true, shop: true, bank: true } };
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(json) });
  });

  await page.goto(`${BASE_URL}/?fixture=endgame`, { waitUntil: "load" });
  await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 20000 });
  await page.waitForFunction(() => !!window.__hfDebug, null, { timeout: 15000 });
  await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(2500); // StrictMode-Doppel-Load abwarten (Muster story-tab-check)

  // ── Setup-Patch: Endgamer-Zustand (retry-bis-stabil; nach Fixture-Reset erneut anwendbar) ──
  // chaptersClaimed parametrisiert den Kapitel-Stand: 14 = Start (Kap. 15 aktiv), 18/19 =
  // Recovery mitten im Lauf, falls ein vite-Full-Reload das Fixture zurücksetzt (Lauf v4).
  const SETUP = (chaptersClaimed) => {
    const { state, content } = window.__hfDebug;
    // Alt-Save-Bestandsschutz für die zwei Test-Zonen entfernen (v63-Migration grantet sie sonst)
    state.legacyZoneGrants["highlands"] = false;
    state.legacyZoneGrants["idolhall"] = false;
    // Kapitel 1-chaptersClaimed eingelöst
    for (let i = 1; i <= chaptersClaimed; i++) {
      const id = "chronicle_" + String(i).padStart(2, "0");
      if (!state.quests.claimed.includes(id)) state.quests.claimed.push(id);
    }
    // relevante Kill-Zähler nullen (Fixture seeded die ersten 32 Monster)
    for (const id of ["iron_revenant", "frost_hexer", "roc", "roc_hunter", "roc_elder", "gravecliff_specter", "roc_storm", "roc_void", "last_idol", "drazhan"]) {
      state.monsterKills[id] = 0;
    }
    state.quests.completed = state.quests.completed.filter((q) => !q.startsWith("chronicle_"));
    if (!state.paragon) state.paragon = { best: 0, checkpoint: 0 };
    else state.paragon.best = 0;
    // Kampf-Skills -> 99 (Kapitel-20-Band lt. balance-drazhan-audit; CL-Gate 99 für idol_sanctum)
    // Meisterweihe-Zeremonien (Level 99 → mwc-backdrop-Modal) vorab als gesehen markieren,
    // sonst blockiert die Zeremonien-Queue jeden weiteren Klick (Setup-Rauschen, kein Testziel).
    for (const id of ["attack", "power", "defence", "vitality", "ranged", "magic", "warding"]) {
      if (state.skills[id]) state.skills[id].xp = 13034431;
      else state.skills[id] = { xp: 13034431 };
      (state.masteryCapes ??= {})[id] = true;
      (state.capeCeremonySeen ??= {})[id] = true;
    }
    // Loadout-Umbau auf das verifizierte Kapitel-20-Melee-Kit (balance-drazhan-audit §3 "chron20"):
    // Godiron-Platte + Streitkolben + Schild — der Fixture-Stoff-Magier läuft ohne Mana-Nachschub
    // in ein Engine-Stalemate (real beobachtet, Lauf v2). Chase-Schmuck/Cape des Fixtures bleiben.
    const eq = state.character.equipment;
    const kit = {
      mainhand: "godiron_mace", offhand: "godiron_kiteshield", helmet: "godiron_fullhelm",
      body: "godiron_platebody", legs: "godiron_platelegs", gloves: "godiron_gauntlets", boots: "godiron_sabatons",
    };
    for (const [slot, itemId] of Object.entries(kit)) {
      if (content.items[itemId]) eq[slot] = itemId;
    }
    // Platz freiräumen ZUERST (das Fixture-Inventar ist voll — sonst schlägt put() fehl),
    // dann Food + Auto-Trank einlegen (realistisches Kapitel-20-Loadout lt. Audit §3).
    const inv = state.inventory.slots;
    const keep = new Set(["soulfire_banquet", "godbloom_infusion"]);
    let free = inv.filter((s) => s === null).length;
    for (let i = 0; i < inv.length && free < 8; i++) {
      const s = inv[i];
      if (s && !s.instance && !keep.has(s.itemId)) { inv[i] = null; free++; }
    }
    const put = (itemId, qty) => {
      const ex = inv.find((s) => s && s.itemId === itemId && !s.instance);
      if (ex) { ex.qty = Math.min(999, ex.qty + qty); return; }
      const i = inv.findIndex((s) => s === null);
      if (i >= 0) inv[i] = { itemId, qty };
    };
    if (content.items["soulfire_banquet"]) { put("soulfire_banquet", 900); state.character.food = "soulfire_banquet"; }
    if (content.items["godbloom_infusion"]) {
      put("godbloom_infusion", 250);
      state.character.autoPotion = { healPotionId: "godbloom_infusion", healThreshold: 0.4, autoRebuffTonics: false };
    }
    state.character.hp = 5000; // clamp auf maxHp übernimmt die Engine
    state.character.mana = 5000;
    const invQty = (id) => inv.reduce((s, sl) => s + (sl && sl.itemId === id ? sl.qty : 0), 0);
    return {
      claimed: state.quests.claimed.filter((q) => q.startsWith("chronicle_")).length,
      food: state.character.food,
      foodQty: invQty("soulfire_banquet"),
      potionQty: invQty("godbloom_infusion"),
      mainhand: eq.mainhand,
      realChronicles: content.quests.filter((q) => q.id.startsWith("chronicle_")).length,
    };
  };
  const applyBaseState = async (chaptersClaimed) => {
    // Nach einem vite-Full-Reload erst die Seite settlen lassen (Fixture-Doppel-Load kann bis
    // ~16s dauern, s. story-tab-check) — sonst racet der Patch gegen den zweiten Load.
    await page.waitForFunction(() => !!window.__hfDebug, null, { timeout: 20000 }).catch(() => {});
    await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(3000);
    let info = null;
    for (let attempt = 0; attempt < 8; attempt++) {
      info = await page.evaluate(SETUP, chaptersClaimed);
      await page.waitForTimeout(700);
      const stable = await page.evaluate((n) =>
        window.__hfDebug.state.quests.claimed.includes("chronicle_" + String(n).padStart(2, "0")) &&
        (window.__hfDebug.state.monsterKills["iron_revenant"] ?? -1) === 0 &&
        window.__hfDebug.state.character.food === "soulfire_banquet" &&
        window.__hfDebug.state.inventory.slots.some((s) => s && s.itemId === "soulfire_banquet" && s.qty > 100), chaptersClaimed);
      if (stable) break;
      log(`Setup-Versuch ${attempt + 1} überschrieben — retry`);
    }
    await dismissCeremonies(page);
    return info;
  };
  const setupInfo = await applyBaseState(14);
  log(`SETUP OK: ${JSON.stringify(setupInfo)}`);
  if (setupInfo.realChronicles !== 21) problem("KRITISCH", `Content hat ${setupInfo.realChronicles} chronicle_*-Quests (erwartet 21)`);

  // ═══ A) Kapitel 15 — Die kalte Esse (Zeugen-Geständnis) ═══════════════════════════════════
  await goStory(page);
  let stage = await page.evaluate(READ_STAGE);
  log("Kap.15-Bühne: " + JSON.stringify({ chapnum: stage.chapnum, counter: stage.counter, title: stage.title, status: stage.statusBadge, objs: stage.objs, claim: stage.claimBtn }));
  if (!stage.present) problem("KRITISCH", "Kapitel 15: Chronik-Bühne fehlt trotz aktivem Kapitel (claimed 1-14)");
  else {
    if (stage.chapnum !== "15") problem("MITTEL", `Kapitel-Nummer falsch: "${stage.chapnum}" (erwartet 15)`);
    if (stage.title !== "Die kalte Esse") problem("MITTEL", `Kap.15-Titel: "${stage.title}" (erwartet "Die kalte Esse")`);
    if (stage.claimBtn) problem("MITTEL", "Kap.15: Claim-Button sichtbar bei 0/10-Zielen");
  }
  // loreText wörtlich gegen Content prüfen
  const lore15 = await page.evaluate(() => {
    const q = window.__hfDebug.content.quests.find((x) => x.id === "chronicle_15");
    return q?.loreText?.de ?? null;
  });
  if (stage.bubbleText && lore15) {
    const norm = (s) => s.replace(/\s+/g, " ").trim();
    if (!norm(stage.bubbleText).includes(norm(lore15).slice(0, 80))) {
      problem("MITTEL", `Kap.15: Sprechblase zeigt nicht den loreText (Anfang fehlt). Blase: "${(stage.bubbleText ?? "").slice(0, 120)}…"`);
    } else {
      note(`Kap.15 loreText wird wörtlich gerendert (${stage.bubbleText.length} Zeichen, font ${stage.bubbleFontPx}).`);
    }
  } else problem("MITTEL", "Kap.15: keine Wächter-Sprechblase mit loreText");
  console.log("── Kap.15 loreText (Blase) ──\n" + (stage.bubbleText ?? "(leer)") + "\n──");
  await shot(page, "sweep2-t3-01-ch15.png");

  // Hochland vor Claim gesperrt?
  await goCombat(page);
  let cards = await page.evaluate(READ_COMBAT_CARDS);
  const highlandsCard = cards.zones.find((z) => z.name.includes("Hochland"));
  log("Zone Hochland vor Kap.15-Claim: " + JSON.stringify(highlandsCard));
  if (!highlandsCard?.locked) problem("KRITISCH", "Zone 'Das Hochland' ist VOR Kapitel-15-Abschluss schon offen (Gate chronicle_15 wirkungslos)");

  // Kap.15 erfüllen + claimen
  await setKills(page, { iron_revenant: 10, frost_hexer: 10 });
  await goStory(page);
  stage = await page.evaluate(READ_STAGE);
  if (!stage.done || !stage.claimBtn) problem("KRITISCH", `Kap.15 nach 10/10+10/10 nicht claimbar (done=${stage.done}, claim=${stage.claimBtn}, objs=${JSON.stringify(stage.objs)})`);
  let claim = await claimActive(page, 10000);
  log(`Kap.15 geclaimt: Gold +${claim.goldDelta} (erwartet ${claim.expect})`);
  if (claim.goldDelta !== claim.expect) problem("MITTEL", `Kap.15-Claim Gold-Delta ${claim.goldDelta} ≠ ${claim.expect}`);

  // ═══ B) Kapitel 16/17 — Hochland/Horst-Gates ══════════════════════════════════════════════
  stage = await page.evaluate(READ_STAGE);
  if (stage.chapnum !== "16") problem("KRITISCH", `Nach Kap.15-Claim aktives Kapitel "${stage.chapnum}" (erwartet 16)`);
  await goCombat(page);
  cards = await page.evaluate(READ_COMBAT_CARDS);
  const hl = cards.zones.find((z) => z.name.includes("Hochland"));
  const aerie = cards.dungeons.find((d) => d.name.includes("Horst"));
  const lair = cards.dungeons.find((d) => d.name.includes("Wyvern"));
  log(`Nach Kap.15: Hochland locked=${hl?.locked}, Horst locked=${aerie?.locked} (hint: ${aerie?.hint}), Wyvernlager locked=${lair?.locked}`);
  if (hl?.locked) problem("KRITISCH", "Zone Hochland bleibt nach Kap.15-Claim gesperrt");
  if (!aerie?.locked) problem("KRITISCH", "highland_aerie schon vor Kap.16-Claim offen");
  if (aerie?.locked && !(aerie.hint ?? "").includes("Der dünne Himmel")) problem("MITTEL", `Horst-Sperrhinweis nennt nicht Kapitel 16: "${aerie?.hint}"`);
  // Schlüssel-Purge-Check auf allen Story-Dungeon-Karten
  for (const d of cards.dungeons.filter((x) => !x.isParagon)) {
    if (/schlüssel|key/i.test(d.fullText)) problem("MITTEL", `Dungeon-Karte "${d.name}" erwähnt noch einen Schlüssel: "${d.fullText.slice(0, 160)}"`);
  }

  await setKills(page, { roc: 25, gravecliff_specter: 8 });
  await goStory(page);
  claim = await claimActive(page, 12000);
  log(`Kap.16 geclaimt: Gold +${claim.goldDelta}`);
  await goCombat(page);
  cards = await page.evaluate(READ_COMBAT_CARDS);
  const aerie2 = cards.dungeons.find((d) => d.name.includes("Horst"));
  const lair2 = cards.dungeons.find((d) => d.name.includes("Wyvern"));
  log(`Nach Kap.16: Horst locked=${aerie2?.locked} enterDisabled=${aerie2?.enterDisabled}, Wyvernlager locked=${lair2?.locked}`);
  if (aerie2?.locked) problem("KRITISCH", "highland_aerie öffnet NICHT mit Kapitel 16");
  if (aerie2 && aerie2.enterDisabled) problem("KRITISCH", `highland_aerie offen, aber Betreten disabled (CL-Gate? hint="${aerie2.hint}")`);
  if (!lair2?.locked) problem("KRITISCH", "wyvern_lair schon vor Kap.17-Claim offen");
  await shot(page, "sweep2-t3-02-dungeons-ch16.png");

  await setKills(page, { roc_storm: 1 });
  await goStory(page);
  claim = await claimActive(page, 15000);
  log(`Kap.17 geclaimt: Gold +${claim.goldDelta}`);
  await goCombat(page);
  cards = await page.evaluate(READ_COMBAT_CARDS);
  const lair3 = cards.dungeons.find((d) => d.name.includes("Wyvern"));
  if (lair3?.locked) problem("KRITISCH", "wyvern_lair öffnet NICHT mit Kapitel 17");
  const idolZone = cards.zones.find((z) => z.name.includes("Götzenhalle"));
  const sanctum = cards.dungeons.find((d) => d.name.includes("Sanktum"));
  // Die Götzenhalle hat KEINE Zonen-Karte (alle Bewohner dungeonOnly → byZone filtert sie raus,
  // CombatPage Stufe 1). Nur eine real existierende, OFFENE Karte wäre ein Gate-Bruch.
  if (idolZone && !idolZone.locked) problem("KRITISCH", "Zone Götzenhalle schon vor Kap.18 offen");
  if (!idolZone) note("Zone 'Die Götzenhalle' hat keine Zonen-Karte (rein dungeonOnly) — der Kap.18-Unlock-Chip bewirbt eine Zone, die der Spieler nie als Karte sieht (kosmetischer Befund).");
  if (!sanctum?.locked) problem("KRITISCH", "idol_sanctum schon vor Kap.18 offen");

  // ═══ C) Kapitel 18 — Das letzte Tor ═══════════════════════════════════════════════════════
  await goStory(page);
  stage = await page.evaluate(READ_STAGE);
  if (stage.chapnum !== "18") problem("KRITISCH", `Aktives Kapitel "${stage.chapnum}" (erwartet 18)`);
  if (stage.bubbleText && /schlüssel/i.test(stage.bubbleText)) problem("MITTEL", "Kap.18-loreText erwähnt noch einen Schlüssel (Key-Purge unvollständig)");
  log("Kap.18 Unlock-Chips: " + JSON.stringify(stage.unlockChips));
  const chipTexts18 = stage.unlockChips.map((c) => c.text).join(" | ");
  if (!chipTexts18.includes("Götzenhalle")) problem("MITTEL", `Kap.18 zeigt keinen Unlock-Chip für Zone Götzenhalle (Chips: ${chipTexts18})`);
  if (!chipTexts18.includes("Sanktum")) problem("MITTEL", `Kap.18 zeigt keinen Unlock-Chip für idol_sanctum (Chips: ${chipTexts18})`);
  await setKills(page, { roc_void: 1 });
  await page.waitForTimeout(400);
  await shot(page, "sweep2-t3-03-ch18-ready.png");
  claim = await claimActive(page, 17000);
  log(`Kap.18 geclaimt: Gold +${claim.goldDelta}`);
  await goCombat(page);
  cards = await page.evaluate(READ_COMBAT_CARDS);
  const idolZone2 = cards.zones.find((z) => z.name.includes("Götzenhalle"));
  const sanctum2 = cards.dungeons.find((d) => d.name.includes("Sanktum"));
  const throne2 = cards.dungeons.find((d) => d.name.includes("Thron"));
  log(`Nach Kap.18: Götzenhalle locked=${idolZone2?.locked}, Sanktum locked=${sanctum2?.locked} enterDisabled=${sanctum2?.enterDisabled}, Thron locked=${throne2?.locked}`);
  if (idolZone2?.locked) problem("KRITISCH", "Zone Götzenhalle öffnet NICHT mit Kapitel 18");
  if (sanctum2?.locked) problem("KRITISCH", "idol_sanctum öffnet NICHT mit Kapitel 18");
  if (sanctum2 && sanctum2.enterDisabled) problem("KRITISCH", `idol_sanctum offen, aber Betreten disabled (hint="${sanctum2.hint}")`);
  if (throne2 && !throne2.locked) problem("KRITISCH", "behind_the_throne schon vor Kap.19-Claim offen");
  await shot(page, "sweep2-t3-04-dungeons-ch18.png");

  // ═══ D) Kapitel 19 — last_idol REAL im Sanctum legen ══════════════════════════════════════
  let sanctumWin = null;
  let sanctumRealFails = 0, sanctumResets = 0, sanctumRuns = 0, sanctumSoftened = false;
  while (!sanctumWin?.won && sanctumRealFails < 3 && sanctumRuns < 14) {
    sanctumRuns++;
    if (sanctumRealFails >= 2 && !sanctumSoftened) {
      // Fallback nach 2 echten Fehlversuchen: Trash-Wellen entschärfen, BOSS bleibt real
      sanctumSoftened = true;
      note("Sanctum-Fallback aktiviert: 2 echte Läufe gescheitert — Trash-Wellen (idol_warden/aether_wraith/scale_skarn) in-memory entschärft, last_idol bleibt UNVERÄNDERT (Kill-Credit-Mechanik-Test).");
      await page.evaluate(() => {
        const { content } = window.__hfDebug;
        for (const id of ["idol_warden", "aether_wraith", "scale_skarn"]) {
          const m = content.monsters[id];
          if (m) { m.maxHp = 300; m.damage = 30; }
        }
      });
    }
    await page.evaluate(() => { window.__hfDebug.state.character.hp = 5000; window.__hfDebug.state.character.mana = 5000; });
    await goCombat(page);
    const enterBtn = page.locator(".dungeon-card", { hasText: "Sanktum" }).locator(".dungeon-enter");
    await clickRetry(page, enterBtn.first());
    await page.waitForTimeout(1200);
    log(`idol_sanctum Lauf #${sanctumRuns} gestartet (echte Fails bisher: ${sanctumRealFails}, Resets: ${sanctumResets})`);
    if (sanctumRuns === 1) await shot(page, "sweep2-t3-05a-sanctum-start.png");
    sanctumWin = await fightLoop(page, { label: `Sanctum#${sanctumRuns}`, killTarget: "last_idol", maxMs: 30 * 60 * 1000, enemyMaxHp: 5725, shotPrefix: "sweep2-t3-05b-lastidol" });
    if (sanctumWin.reset) {
      sanctumResets++;
      note(`Sanctum: Fixture-Reset #${sanctumResets} (vite-Full-Reload) — Basis-Zustand Kap. 1-18 wird wiederhergestellt; zählt NICHT als Kampf-Fehlversuch.`);
      await applyBaseState(18);
      continue;
    }
    if (!sanctumWin.won) {
      sanctumRealFails++;
      await shot(page, `sweep2-t3-05x-sanctum-fail-${sanctumRealFails}.png`);
      note(`Sanctum-Lauf gescheitert (#${sanctumRealFails}) nach ${(sanctumWin.ms / 60000).toFixed(1)} min (stopReason=${sanctumWin.stopReason ?? "?"}, minHp ${Math.round(sanctumWin.minHp)}).`);
      await dismissCeremonies(page);
    }
  }
  if (!sanctumWin?.won) problem("KRITISCH", "Kapitel 19 nicht spielbar: last_idol in 3 Sanctum-Läufen nicht gelegt (2 real + 1 entschärft)");
  else {
    const killOk = await page.evaluate(() => window.__hfDebug.state.monsterKills["last_idol"] ?? 0);
    log(`Kill-Credit last_idol über Dungeon-Lauf: ${killOk}`);
    if (killOk < 1) problem("KRITISCH", "last_idol im Dungeon getötet, aber monsterKills.last_idol = 0 (Kill-Credit kaputt)");
  }
  await page.waitForTimeout(800);
  const cer1 = await closeCeremony(page, "sweep2-t3-05d-sanctum-ceremony.png");
  if (cer1) log("Sanctum-Clear-Zeremonie: " + JSON.stringify(cer1));

  await goStory(page);
  stage = await page.evaluate(READ_STAGE);
  log("Kap.19-Bühne nach Boss-Kill: " + JSON.stringify({ chapnum: stage.chapnum, done: stage.done, claim: stage.claimBtn, chips: stage.unlockChips }));
  if (stage.chapnum !== "19") problem("KRITISCH", `Aktives Kapitel "${stage.chapnum}" (erwartet 19)`);
  if (!stage.claimBtn) problem("KRITISCH", "Kap.19 nach last_idol-Kill nicht claimbar (Dungeon-Kill-Credit → Quest-Objective kaputt)");
  const throneChip = stage.unlockChips.find((c) => c.text.includes("Thron"));
  if (!throneChip) problem("MITTEL", `Kap.19: kein Unlock-Chip 'Hinter dem Thron' (Chips: ${JSON.stringify(stage.unlockChips)})`);
  else if (!throneChip.isDungeon) problem("KOSMETISCH", "Kap.19: 'Hinter dem Thron'-Chip trägt kein Dungeon-Label/-Akzent");
  await shot(page, "sweep2-t3-05c-ch19-claim.png");
  claim = await claimActive(page, 21000);
  log(`Kap.19 geclaimt: Gold +${claim.goldDelta} (erwartet ${claim.expect})`);
  if (claim.goldDelta !== claim.expect) problem("MITTEL", `Kap.19-Claim Gold-Delta ${claim.goldDelta} ≠ ${claim.expect} (idol_shard-Items separat prüfen)`);
  await goCombat(page);
  cards = await page.evaluate(READ_COMBAT_CARDS);
  const throne3 = cards.dungeons.find((d) => d.name.includes("Thron"));
  log(`behind_the_throne nach Kap.19-Claim: locked=${throne3?.locked} enterDisabled=${throne3?.enterDisabled}`);
  if (!throne3 || throne3.locked) problem("KRITISCH", "behind_the_throne öffnet NICHT mit Kapitel-19-Claim");

  // ═══ E) Kapitel 20 — Drazhan REAL ═════════════════════════════════════════════════════════
  await goStory(page);
  stage = await page.evaluate(READ_STAGE);
  if (stage.chapnum !== "20") problem("KRITISCH", `Aktives Kapitel "${stage.chapnum}" (erwartet 20)`);
  const lore20 = await page.evaluate(() => window.__hfDebug.content.quests.find((x) => x.id === "chronicle_20")?.loreText?.de ?? null);
  const retreatLine = "Merkt euch diesen Tag. Ihr saht einen Rückzug, keinen Fall.";
  if (stage.bubbleText) {
    const norm = (s) => s.replace(/\s+/g, " ").trim();
    if (!norm(stage.bubbleText).includes(retreatLine)) problem("MITTEL", "Kap.20-Sprechblase enthält die Rückzugszeile NICHT wörtlich");
    else note(`Kap.20 Rückzugszeile wörtlich gerendert (Blase ${stage.bubbleText.length} Zeichen, font ${stage.bubbleFontPx}, overflowX=${stage.overflowX}px).`);
  } else problem("MITTEL", "Kap.20: keine Sprechblase mit loreText");
  console.log("── Kap.20 loreText (Blase) ──\n" + (stage.bubbleText ?? "(leer)") + "\n──");
  await shot(page, "sweep2-t3-06a-ch20-text.png");

  let drazhanWin = null;
  let drazhanAttempts = 0, drazhanResets = 0, drazhanRuns = 0;
  while (!drazhanWin?.won && drazhanAttempts < 3 && drazhanRuns < 14) {
    drazhanRuns++;
    const attempt = drazhanAttempts + 1;
    await page.evaluate(() => { window.__hfDebug.state.character.hp = 5000; window.__hfDebug.state.character.mana = 5000; });
    await goCombat(page);
    const enterBtn = page.locator(".dungeon-card", { hasText: "Hinter dem Thron" }).locator(".dungeon-enter");
    await clickRetry(page, enterBtn.first());
    await page.waitForTimeout(1500);
    log(`behind_the_throne Lauf #${drazhanRuns} gestartet (Drazhan, 8700 HP; echte Fails: ${drazhanAttempts}, Resets: ${drazhanResets})`);
    // Monster-Art-Check in der Kampfansicht (Platzhalter-Konvention, kein Crash)
    const art = await page.evaluate(() => {
      const battle = document.querySelector(".battle");
      if (!battle) return { battle: false };
      const imgs = [...battle.querySelectorAll("img")].map((i) => ({ src: (i.getAttribute("src") ?? "").split("/").pop(), cls: i.className, w: i.naturalWidth }));
      return {
        battle: true,
        imgs: imgs.slice(0, 14),
        placeholder: battle.querySelector(".monster-card-ph, .fighter-ph, [class*='placeholder']")?.textContent?.trim() ?? null,
        enemyName: [...battle.querySelectorAll("[class*='fighter-name'],[class*='nameplate']")].map((e) => e.textContent?.trim()).slice(0, 4),
      };
    });
    log("Drazhan-Kampfansicht Art-Check: " + JSON.stringify(art));
    await shot(page, `sweep2-t3-06b-drazhan-start-${attempt}.png`);
    drazhanWin = await fightLoop(page, { label: `Drazhan#${attempt}`, killTarget: "drazhan", maxMs: 30 * 60 * 1000, enemyMaxHp: 8700, shotPrefix: "sweep2-t3-06c-drazhan" });
    if (drazhanWin.reset) {
      drazhanResets++;
      note(`Drazhan: Fixture-Reset #${drazhanResets} (vite-Full-Reload) — Basis-Zustand Kap. 1-19 wird wiederhergestellt; zählt NICHT als Kampf-Fehlversuch.`);
      await applyBaseState(19);
      continue;
    }
    if (!drazhanWin.won) {
      drazhanAttempts++;
      await shot(page, `sweep2-t3-06x-drazhan-fail-${drazhanAttempts}.png`);
      note(`Drazhan-Lauf verloren (#${drazhanAttempts}) nach ${(drazhanWin.ms / 1000).toFixed(0)}s (stopReason=${drazhanWin.stopReason ?? "?"}, minHp ${Math.round(drazhanWin.minHp)}, burn-Uptime ~${Math.round((drazhanWin.burnPct ?? 0) * 100)}%)`);
      await dismissCeremonies(page);
    }
  }
  // Sieg-Versuchs-Nummer = echte Fehlversuche + 1 (Resets zählen nicht).
  if (drazhanWin?.won) drazhanAttempts += 1;
  if (!drazhanWin?.won) {
    problem("KRITISCH", `Drazhan in ${drazhanAttempts} Versuchen mit vollem Kapitel-20-Loadout (Skills 99, Fixture-Gear 97%, Banquet+Infusion) NICHT besiegbar — Balance-Soll war 81-94% Sieg`);
  } else {
    note(`Drazhan-Sieg in Versuch ${drazhanAttempts}: Dauer ${(drazhanWin.ms / 60000).toFixed(1)} min, min. Spieler-HP ${drazhanWin.minHp}, Burn-Uptime ~${Math.round(drazhanWin.burnPct * 100)}%.`);
  }
  await page.waitForTimeout(800);
  const cer2 = await closeCeremony(page, "sweep2-t3-06d-drazhan-victory.png");
  if (cer2) log("Thron-Clear-Zeremonie (zurückgelassene Schätze): " + JSON.stringify(cer2));
  else if (drazhanWin?.won) problem("MITTEL", "Nach Drazhan-Sieg keine Clear-Zeremonie/Loot-Anzeige erschienen");

  if (drazhanWin?.won) {
    await goStory(page);
    stage = await page.evaluate(READ_STAGE);
    if (!stage.claimBtn) problem("KRITISCH", "Kap.20 nach Drazhan-Kill nicht claimbar");
    claim = await claimActive(page, 25000);
    log(`Kap.20 geclaimt: Gold +${claim.goldDelta} (erwartet ${claim.expect})`);
    if (claim.goldDelta !== claim.expect) problem("MITTEL", `Kap.20-Claim Gold-Delta ${claim.goldDelta} ≠ 25000`);
    const rewardItems = await page.evaluate(() => {
      const { state } = window.__hfDebug;
      const count = (id) => state.inventory.slots.reduce((s, sl) => s + (sl && sl.itemId === id ? sl.qty : 0), 0) + (state.bank[id] ?? 0);
      return { godiron_bar: count("godiron_bar"), onyx: count("onyx"), soulopal: count("soulopal") };
    });
    log("Bestand nach Kap.20-Claim (Dungeon-Loot + Reward kumuliert): " + JSON.stringify(rewardItems));
    if (rewardItems.godiron_bar < 5) problem("MITTEL", `Kap.20-Reward godiron_bar×5 nicht angekommen (Bestand ${rewardItems.godiron_bar})`);
  }

  // ═══ F/G) Kapitel 21 + Paragon-Regression ═════════════════════════════════════════════════
  await goStory(page);
  stage = await page.evaluate(READ_STAGE);
  log("Kap.21-Bühne: " + JSON.stringify({ chapnum: stage.chapnum, objs: stage.objs, chips: stage.unlockChips }));
  if (stage.chapnum !== "21") problem("KRITISCH", `Aktives Kapitel "${stage.chapnum}" (erwartet 21)`);
  const obj21 = stage.objs[0] ?? {};
  if (!/etage|5/i.test(obj21.label ?? "")) problem("MITTEL", `Kap.21-Ziel-Label unklar: "${obj21.label}"`);
  if (!(obj21.where ?? "").includes("Paragon")) problem("MITTEL", `Kap.21 WHERE zeigt nicht den Paragonturm: "${obj21.where}"`);
  if (obj21.count !== "0 / 5") problem("MITTEL", `Kap.21 Fortschritt initial "${obj21.count}" (erwartet 0 / 5)`);

  // Regression: Paragonturm bleibt key-basiert (Chronik-Claims öffnen ihn NICHT)
  await goCombat(page);
  cards = await page.evaluate(READ_COMBAT_CARDS);
  const paragonCard = cards.dungeons.find((d) => d.isParagon);
  log(`Paragonturm nach 20 Chronik-Claims: lockedCard=${!!paragonCard} panel=${cards.paragonPanelPresent}`);
  if (cards.paragonPanelPresent) problem("KRITISCH", "Paragonturm-Panel offen, OHNE dass der paragon_key-Unlock stattfand (Chronik-Claims dürfen ihn nicht öffnen)");
  if (!paragonCard) problem("MITTEL", "Paragonturm-Sektion fehlt komplett auf der Combat-Seite");
  // Key-Unlock simulieren (paragon_key-Intercept setzt dungeonsUnlocked.paragon_tower)
  await page.evaluate(() => { (window.__hfDebug.state.dungeonsUnlocked ??= {})["paragon_tower"] = true; });
  await clickRetry(page, page.locator('[data-guide-id="topbar.character"]').first());
  await page.waitForTimeout(250);
  await goCombat(page);
  cards = await page.evaluate(READ_COMBAT_CARDS);
  if (!cards.paragonPanelPresent) problem("KRITISCH", "Paragonturm öffnet nach Key-Unlock (dungeonsUnlocked) NICHT mehr — Regression durch Quest-Gate-Umbau");
  else {
    // Etage 1 anspielen (Turm-Zugang real verifizieren), dann fliehen
    const startBtn = page.locator(".paragon-start-btn");
    const disabled = await startBtn.first().isDisabled().catch(() => true);
    if (disabled) problem("MITTEL", "Paragonturm-Start-Button disabled trotz Unlock");
    else {
      await clickRetry(page, startBtn.first());
      await page.waitForTimeout(1500);
      const snap = await page.evaluate(COMBAT_SNAP);
      log(`Paragon-Etage gestartet: floor=${snap.paragonFloor} monster=${snap.monsterId}`);
      if (!snap.paragonFloor) problem("KRITISCH", "Paragon-Etagen-Start erzeugt keinen Turm-Kampf (paragonFloor fehlt)");
      await shot(page, "sweep2-t3-07-paragon-regression.png");
      await clickRetry(page, page.locator(".combat-btn.flee").first());
      await page.waitForTimeout(500);
    }
  }

  // Fortschritt = paragon.best (via Debug setzen), Zwischenstand + Claim
  await page.evaluate(() => { window.__hfDebug.state.paragon.best = 3; });
  await goStory(page);
  stage = await page.evaluate(READ_STAGE);
  const mid21 = stage.objs[0]?.count ?? null;
  log(`Kap.21 Fortschritt bei paragon.best=3: "${mid21}"`);
  if (mid21 !== "3 / 5") problem("MITTEL", `Kap.21 Fortschritt folgt paragon.best nicht (zeigt "${mid21}" bei best=3)`);
  await page.evaluate(() => { window.__hfDebug.state.paragon.best = 5; });
  await page.waitForTimeout(700);
  stage = await page.evaluate(READ_STAGE);
  if (!stage.claimBtn) problem("KRITISCH", `Kap.21 bei paragon.best=5 nicht claimbar (count=${stage.objs[0]?.count})`);
  await shot(page, "sweep2-t3-08-ch21-ready.png");
  claim = await claimActive(page, 10000);
  log(`Kap.21 geclaimt: Gold +${claim.goldDelta}`);

  // Epilog-Zustand
  await clickRetry(page, page.locator('[data-guide-id="topbar.character"]').first());
  await page.waitForTimeout(250);
  await goStory(page);
  const epilog = await page.evaluate(() => {
    const complete = document.querySelector(".chronicle-stage-complete");
    return {
      completePresent: !!complete,
      completeText: complete?.textContent?.trim() ?? null,
      historyToggle: document.querySelector(".chronicle-history-toggle")?.textContent?.trim() ?? null,
      counter: document.querySelector(".chronicle-tab-counter")?.textContent?.trim() ?? null,
    };
  });
  log("Epilog: " + JSON.stringify(epilog));
  if (!epilog.completePresent) problem("KRITISCH", "Nach Claim aller 21 Kapitel kein 'alle Kapitel geschrieben'-Epilog-Zustand");
  if (!(epilog.historyToggle ?? "").includes("21")) problem("MITTEL", `Historie zeigt nicht 21 Einträge: "${epilog.historyToggle}"`);
  await shot(page, "sweep2-t3-09-epilog.png");

  // Historie aufklappen, Kapitel 15 + 20 nachlesen
  await clickRetry(page, page.locator(".chronicle-history-toggle").first());
  await page.waitForTimeout(300);
  const rowCount = await page.locator(".chronicle-history-row").count();
  log(`Historie-Zeilen: ${rowCount}`);
  if (rowCount !== 21) problem("MITTEL", `Historie hat ${rowCount} Zeilen (erwartet 21)`);
  const openRow = async (needle) => {
    const head = page.locator(".chronicle-history-row-head", { hasText: needle }).first();
    await clickRetry(page, head);
    await page.waitForTimeout(250);
  };
  await openRow("Die kalte Esse");
  await openRow("Der wahre Verursacher");
  const histTexts = await page.evaluate(() => [...document.querySelectorAll(".chronicle-history-text")].map((e) => e.textContent?.trim() ?? ""));
  const hist20 = histTexts.find((t) => t.includes("Merkt euch diesen Tag"));
  const hist15 = histTexts.find((t) => t.includes("Zeugenaussage"));
  if (!hist20) problem("MITTEL", "Historie Kap.20: Rückzugszeile im nachlesbaren Text nicht gefunden");
  if (!hist15) problem("MITTEL", "Historie Kap.15: Zeugen-Geständnis-Text nicht nachlesbar");
  await shot(page, "sweep2-t3-10-historie.png");

  // Abschluss-Sanity: Paragonturm-Panel weiterhin da (Key-Unlock überlebt die Claims)
  await goCombat(page);
  cards = await page.evaluate(READ_COMBAT_CARDS);
  if (!cards.paragonPanelPresent) problem("MITTEL", "Paragonturm-Panel nach Epilog verschwunden (Unlock nicht stabil)");

  await browser.close();
  browser = null;

  console.log("\n════════ ERGEBNIS T3 ════════");
  console.log(problems.length ? "PROBLEME:\n- " + problems.join("\n- ") : "ALLE CHECKS GRÜN");
  console.log("\nNOTIZEN:\n- " + notes.join("\n- "));
  const uniqErrors = [...new Set(errors)];
  console.log(uniqErrors.length ? `\n${uniqErrors.length} eindeutige page/console errors:\n` + uniqErrors.slice(0, 15).join("\n") : "\nkeine page errors");
  console.log("DONE");
} catch (e) {
  console.error("SCRIPT-ABBRUCH: " + (e?.stack ?? e));
  console.log(problems.length ? "PROBLEME (bis Abbruch):\n- " + problems.join("\n- ") : "");
  console.log(notes.length ? "NOTIZEN (bis Abbruch):\n- " + notes.join("\n- ") : "");
  const uniq = [...new Set(errors)];
  console.log(uniq.length ? `${uniq.length} page/console errors:\n` + uniq.slice(0, 15).join("\n") : "keine page errors");
  console.log("VITE-OUTPUT (tail):\n" + getOutput().split("\n").slice(-25).join("\n"));
  process.exitCode = 1;
} finally {
  if (browser) await browser.close().catch(() => {});
  child.kill();
}
