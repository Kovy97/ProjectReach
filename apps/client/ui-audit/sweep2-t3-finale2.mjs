#!/usr/bin/env node
/**
 * Tester-Sweep 2 / T3 "Der Endgamer" — TEIL 2: Drazhan-Endkampf + Kapitel 20/21 + Epilog.
 *
 * Teil 1 (sweep2-t3-finale.mjs, Lauf v6) hat Kapitel 15-19 vollständig verifiziert (Gates,
 * Claims, Kill-Credit über idol_sanctum-Lauf, Thron-Chip). Der Drazhan-Kampf scheiterte dort
 * mit dem runen-losen Godiron-Kit in ~64s — deckungsgleich mit design/balance-drazhan-audit.md
 * ("Runen-Schicht ist DAS Gate", ohne Runen TTD ø65s). Ein echter Kapitel-20-Spieler hat die
 * craft-garantierten Tier-III-Runen (RC 62-79; Fixture-RC 97) — dieses Skript rüstet sie als
 * equippedInstances nach (Muster engine/bulwark-rune.test.ts) und spielt den Endkampf REAL:
 *   - aegis T3 (+20 Rüstung) auf Helm/Brust/Beine/Hände/Füße
 *   - bulwark T3 (+8% Block) auf dem Schild
 *   - keen T3 (+10 STR) auf dem Streitkolben
 *
 * Prüft: Drazhan-Kampf (Dauer/Enrage <20%/Burn/Platzhalter-Art/kein Crash) → Sieg → Zeremonie
 * ("zurückgelassene Schätze") → Kap.20-Claim (25000 Gold + Items) → Rückzugszeile → Kap.21
 * (reach_paragon_floor: Anzeige, Fortschritt=paragon.best, Claim) → Epilog (alle 21 in Historie,
 * Texte nachlesbar) → Regression Paragonturm bleibt key-basiert.
 *
 * Wegwerf-Skript, Port 5252, vite.t3.config.mjs (hmr:false — Reload-Stürme paralleler Agenten).
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

const problems = [];
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
    await page.waitForTimeout(1400);
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
  const active = await page.evaluate(() => document.querySelector(".quests-tab-btn--active")?.textContent?.trim() ?? "");
  if (!active.startsWith("Story")) {
    await clickRetry(page, page.locator(".quests-tab-btn", { hasText: "Story" }).first());
    await page.waitForTimeout(250);
  }
}

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
  return {
    present: true,
    complete: stage.classList.contains("chronicle-stage-complete"),
    done: stage.classList.contains("chronicle-stage--done"),
    chapnum: stage.querySelector(".chronicle-stage-chapnum")?.textContent?.trim() ?? null,
    counter: document.querySelector(".chronicle-tab-counter")?.textContent?.trim() ?? null,
    title: stage.querySelector(".chronicle-stage-title")?.textContent?.trim() ?? null,
    statusBadge: stage.querySelector(".quest-status-badge")?.textContent?.trim() ?? null,
    bubbleText: bubble?.textContent?.trim() ?? null,
    claimBtn: !!stage.querySelector(".chronicle-stage-claim"),
    objs,
    unlockChips,
  };
};

const COMBAT_SNAP = () => {
  const { state, content } = window.__hfDebug;
  const cs = state.combat;
  const m = cs?.monsterId ? content.monsters[cs.monsterId] : null;
  const invQty = (id) => state.inventory.slots.reduce((s, sl) => s + (sl && sl.itemId === id ? sl.qty : 0), 0);
  return {
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
    kills: { drazhan: state.monsterKills["drazhan"] ?? 0 },
    ceremonyOpen: !!document.querySelector(".dcc-backdrop"),
  };
};

async function fightLoop(page, { label, killTarget, maxMs, enemyMaxHp, shotPrefix }) {
  const start = Date.now();
  let lastBeat = 0;
  let sawEnrage = false, sawMid = false;
  let burnPolls = 0, polls = 0, burnEverList = [];
  let minHp = Infinity;
  let lastWave = -1;
  let enrageTs = null;
  const killsBefore = await page.evaluate((t) => window.__hfDebug.state.monsterKills[t] ?? 0, killTarget);
  while (Date.now() - start < maxMs) {
    const s = await page.evaluate(COMBAT_SNAP);
    polls++;
    if (!s.baseIntact) {
      log(`${label}: FIXTURE-RESET erkannt.`);
      return { won: false, reset: true, ms: Date.now() - start, minHp };
    }
    if (s.burn) burnPolls++;
    if (s.hp < minHp) minHp = s.hp;
    if (s.encounterIndex !== null && s.encounterIndex !== lastWave) {
      log(`${label}: Welle ${s.encounterIndex + 1} (Monster ${s.monsterId}, HP ${s.enemyHp}/${s.enemyMax}) — Spieler ${Math.round(s.hp)}`);
      lastWave = s.encounterIndex;
    }
    const kills = await page.evaluate((t) => window.__hfDebug.state.monsterKills[t] ?? 0, killTarget);
    if (kills > killsBefore) {
      const ms = Date.now() - start;
      log(`${label}: SIEG nach ${(ms / 1000).toFixed(0)}s. minHp ${Math.round(minHp)}, Burn-Uptime ~${Math.round((burnPolls / Math.max(1, polls)) * 100)}%, Enrage ab ${enrageTs ? ((enrageTs - start) / 1000).toFixed(0) + "s" : "-"}`);
      return { won: true, ms, minHp, burnPct: burnPolls / Math.max(1, polls), enrageMs: enrageTs ? enrageTs - start : null };
    }
    if (!s.inCombat) {
      await page.waitForTimeout(1500);
      const kills2 = await page.evaluate((t) => window.__hfDebug.state.monsterKills[t] ?? 0, killTarget);
      if (kills2 > killsBefore) {
        return { won: true, ms: Date.now() - start, minHp, burnPct: burnPolls / Math.max(1, polls), enrageMs: enrageTs ? enrageTs - start : null };
      }
      const s2 = await page.evaluate(COMBAT_SNAP);
      if (!s2.inCombat) {
        log(`${label}: Kampf beendet OHNE Kill. stopReason=${s2.stopReason} hp=${Math.round(s2.hp)}`);
        return { won: false, ms: Date.now() - start, minHp, burnPct: burnPolls / Math.max(1, polls), stopReason: s2.stopReason };
      }
    }
    if (s.monsterId === killTarget && enemyMaxHp) {
      if (!sawMid && s.enemyHp <= enemyMaxHp * 0.55) { sawMid = true; await shot(page, `${shotPrefix}-mid.png`); }
      if (!sawEnrage && s.enemyHp <= enemyMaxHp * 0.19) {
        sawEnrage = true;
        enrageTs = Date.now();
        log(`${label}: ENRAGE (Gegner ${Math.round(s.enemyHp)}/${enemyMaxHp}, Spieler ${Math.round(s.hp)}, burn=${s.burn})`);
        await shot(page, `${shotPrefix}-enrage.png`);
      }
    }
    if (Date.now() - lastBeat > 30000) {
      lastBeat = Date.now();
      log(`${label}: … ${s.monsterId} ${Math.round(s.enemyHp)}/${s.enemyMax} — Spieler ${Math.round(s.hp)} HP, Food ${s.food}, Trank ${s.potion}, Effekte [${s.effects.join(",")}]`);
    }
    await page.waitForTimeout(2500);
  }
  return { won: false, ms: maxMs, minHp, timeout: true };
}

async function closeCeremony(page, shotName = null) {
  const open = await page.evaluate(() => !!document.querySelector(".dcc-backdrop"));
  if (!open) return null;
  const loot = await page.evaluate(() => ({
    title: document.querySelector(".dcc-title")?.textContent?.trim() ?? null,
    firstClear: !!document.querySelector(".dcc-first-badge"),
    rewards: [...document.querySelectorAll(".dcc-reward-chip")].map((c) => c.textContent?.trim()),
    lootCells: [...document.querySelectorAll(".dcc-loot-item")].map((c) => ({
      title: c.querySelector("[title]")?.getAttribute("title") ?? null,
      img: (c.querySelector("img")?.getAttribute("src") ?? "").split("/").pop() || null,
      qty: c.textContent?.trim() ?? "",
    })),
  }));
  if (shotName) await shot(page, shotName);
  await page.locator(".dcc-next-btn").first().click({ timeout: 6000 }).catch(() => {});
  await page.waitForTimeout(400);
  return loot;
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
  log("vite (hmr:false) läuft auf :" + PORT);

  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on("pageerror", (e) => { errors.push(`pageerror: ${e.message}`); log(`PAGEERROR: ${e.message}`); });
  page.on("console", (m) => { if (m.type() === "error") errors.push(`console: ${m.text()}`); });
  page.on("load", () => log("PAGE (RE)LOAD-Event"));

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
  await page.waitForTimeout(2500);

  // ── Setup: Kapitel 19 frisch geclaimt + VOLLES Kapitel-20-Loadout inkl. Tier-III-Runen ─────
  const SETUP = () => {
    const { state, content } = window.__hfDebug;
    state.legacyZoneGrants["highlands"] = false;
    state.legacyZoneGrants["idolhall"] = false;
    for (let i = 1; i <= 19; i++) {
      const id = "chronicle_" + String(i).padStart(2, "0");
      if (!state.quests.claimed.includes(id)) state.quests.claimed.push(id);
    }
    state.monsterKills["last_idol"] = 1; // Teil 1: real über den Sanctum-Lauf erspielt
    state.monsterKills["drazhan"] = 0;
    state.quests.completed = state.quests.completed.filter((q) => !q.startsWith("chronicle_"));
    if (!state.paragon) state.paragon = { best: 0, checkpoint: 0 };
    else state.paragon.best = 0;
    for (const id of ["attack", "power", "defence", "vitality", "ranged", "magic", "warding"]) {
      if (state.skills[id]) state.skills[id].xp = 13034431;
      else state.skills[id] = { xp: 13034431 };
      (state.masteryCapes ??= {})[id] = true;
      (state.capeCeremonySeen ??= {})[id] = true;
    }
    const eq = state.character.equipment;
    const kit = {
      mainhand: "godiron_mace", offhand: "godiron_kiteshield", helmet: "godiron_fullhelm",
      body: "godiron_platebody", legs: "godiron_platelegs", gloves: "godiron_gauntlets", boots: "godiron_sabatons",
    };
    for (const [slot, itemId] of Object.entries(kit)) {
      if (content.items[itemId]) eq[slot] = itemId;
    }
    // Tier-III-Runen als equippedInstances (Muster engine/bulwark-rune.test.ts; Invariante
    // equipment[slot] === instance.baseItemId eingehalten). Craft-garantiert lt. Audit §3.
    const inst = (slot, affixId) => ({
      instanceId: "inst_t3sweep_" + slot,
      baseItemId: kit[slot],
      affixes: [{ affixId, tier: 3 }],
    });
    state.character.equippedInstances = {
      mainhand: inst("mainhand", "affix_keen"),
      offhand: inst("offhand", "affix_bulwark"),
      helmet: inst("helmet", "affix_aegis"),
      body: inst("body", "affix_aegis"),
      legs: inst("legs", "affix_aegis"),
      gloves: inst("gloves", "affix_aegis"),
      boots: inst("boots", "affix_aegis"),
    };
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
    state.character.hp = 5000;
    state.character.mana = 5000;
    return {
      claimed: state.quests.claimed.filter((q) => q.startsWith("chronicle_")).length,
      instances: Object.keys(state.character.equippedInstances).length,
    };
  };
  const applyBaseState = async () => {
    await page.waitForFunction(() => !!window.__hfDebug, null, { timeout: 20000 }).catch(() => {});
    await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(3000);
    let info = null;
    for (let attempt = 0; attempt < 8; attempt++) {
      info = await page.evaluate(SETUP);
      await page.waitForTimeout(700);
      const stable = await page.evaluate(() =>
        window.__hfDebug.state.quests.claimed.includes("chronicle_19") &&
        window.__hfDebug.state.character.equippedInstances?.body?.affixes?.[0]?.affixId === "affix_aegis" &&
        window.__hfDebug.state.character.food === "soulfire_banquet");
      if (stable) break;
      log(`Setup-Versuch ${attempt + 1} überschrieben — retry`);
    }
    await dismissCeremonies(page);
    return info;
  };
  const setupInfo = await applyBaseState();
  log(`SETUP OK: ${JSON.stringify(setupInfo)}`);

  // Rüstungs-Kontrolle: Mitigation muss durch die Aegis-Runen deutlich über dem runen-losen Kit
  // liegen (Teil-1-Lauf: Tod nach 64s). Ablesen aus der Kampf-Statszeile der Charakterseite wäre
  // teuer — wir verlassen uns auf den Kampfverlauf selbst und loggen nur die Instanzen.

  // ── Kapitel 20 aktiv? Rückzugszeile? ────────────────────────────────────────────────────────
  await goStory(page);
  let stage = await page.evaluate(READ_STAGE);
  log("Kap.20-Bühne: " + JSON.stringify({ chapnum: stage.chapnum, title: stage.title, objs: stage.objs, chips: stage.unlockChips }));
  if (stage.chapnum !== "20") problem("KRITISCH", `Aktives Kapitel "${stage.chapnum}" (erwartet 20 nach Claim 1-19)`);
  const retreatLine = "Merkt euch diesen Tag. Ihr saht einen Rückzug, keinen Fall.";
  if (!stage.bubbleText || !stage.bubbleText.replace(/\s+/g, " ").includes(retreatLine)) {
    problem("MITTEL", "Kap.20-Sprechblase enthält die Rückzugszeile nicht wörtlich");
  }
  await shot(page, "sweep2-t3-06a-ch20-text.png");

  // ── Drazhan REAL (volles Loadout inkl. Runen) ───────────────────────────────────────────────
  let drazhanWin = null;
  let fails = 0, resets = 0, runs = 0;
  while (!drazhanWin?.won && fails < 4 && runs < 14) {
    runs++;
    await page.evaluate(() => { window.__hfDebug.state.character.hp = 5000; window.__hfDebug.state.character.mana = 5000; });
    await goCombat(page);
    const enterBtn = page.locator(".dungeon-card", { hasText: "Hinter dem Thron" }).locator(".dungeon-enter");
    await clickRetry(page, enterBtn.first());
    await page.waitForTimeout(1500);
    log(`behind_the_throne Lauf #${runs} (echte Fails: ${fails}, Resets: ${resets})`);
    if (runs === 1) {
      const art = await page.evaluate(() => {
        const battle = document.querySelector(".battle");
        if (!battle) return { battle: false };
        return {
          battle: true,
          enemyImgs: [...battle.querySelectorAll("img")].map((i) => (i.getAttribute("src") ?? "").split("/").pop()).filter((s) => s && !s.includes("icon") && !s.includes(".png?")),
          placeholder: battle.querySelector(".monster-card-ph")?.textContent?.trim() ?? null,
        };
      });
      log("Art-Check Kampfansicht: " + JSON.stringify(art));
      await shot(page, "sweep2-t3-06b-drazhan-start.png");
    }
    drazhanWin = await fightLoop(page, { label: `Drazhan#${runs}`, killTarget: "drazhan", maxMs: 30 * 60 * 1000, enemyMaxHp: 8700, shotPrefix: "sweep2-t3-06c-drazhan" });
    if (drazhanWin.reset) { resets++; note(`Drazhan: Fixture-Reset #${resets} — Wiederherstellung.`); await applyBaseState(); continue; }
    if (!drazhanWin.won) {
      fails++;
      await shot(page, `sweep2-t3-06x-drazhan-fail-${fails}.png`);
      note(`Drazhan-Lauf verloren (#${fails}) nach ${(drazhanWin.ms / 1000).toFixed(0)}s (stopReason=${drazhanWin.stopReason ?? "?"}, minHp ${Math.round(drazhanWin.minHp)}, Burn ~${Math.round((drazhanWin.burnPct ?? 0) * 100)}%)`);
      await dismissCeremonies(page);
    }
  }
  if (!drazhanWin?.won) {
    problem("KRITISCH", `Drazhan auch MIT vollem Audit-Loadout (Godiron-Platte + Tier-III-Runen + Banquet/Infusion, Skills 99) in ${fails} Versuchen nicht besiegbar — Balance-Soll 81-94% Sieg verfehlt`);
  } else {
    note(`Drazhan-SIEG in Versuch ${fails + 1}: Dauer ${(drazhanWin.ms / 60000).toFixed(1)} min, minHp ${Math.round(drazhanWin.minHp)}, Burn-Uptime ~${Math.round((drazhanWin.burnPct ?? 0) * 100)}%, Enrage-Phase ab ${drazhanWin.enrageMs ? (drazhanWin.enrageMs / 60000).toFixed(1) + " min" : "-"}.`);
  }
  await page.waitForTimeout(800);
  const cer = await closeCeremony(page, "sweep2-t3-06d-drazhan-victory.png");
  if (cer) log("Thron-Zeremonie (zurückgelassene Schätze): " + JSON.stringify(cer));
  else if (drazhanWin?.won) problem("MITTEL", "Nach Drazhan-Sieg keine Clear-Zeremonie erschienen");

  // ── Kapitel 20 claimen (+25000 Gold + Schätze) ─────────────────────────────────────────────
  if (drazhanWin?.won) {
    await goStory(page);
    stage = await page.evaluate(READ_STAGE);
    if (!stage.claimBtn) problem("KRITISCH", "Kap.20 nach Drazhan-Kill nicht claimbar");
    const claim = await claimActive(page, 25000);
    log(`Kap.20 geclaimt: Gold +${claim.goldDelta} (erwartet 25000)`);
    if (claim.goldDelta !== 25000) problem("MITTEL", `Kap.20-Claim Gold-Delta ${claim.goldDelta} ≠ 25000`);
    const items = await page.evaluate(() => {
      const { state } = window.__hfDebug;
      const count = (id) => state.inventory.slots.reduce((s, sl) => s + (sl && sl.itemId === id ? sl.qty : 0), 0) + (state.bank[id] ?? 0);
      return { godiron_bar: count("godiron_bar"), onyx: count("onyx"), soulopal: count("soulopal") };
    });
    log("Bestand nach Kap.20-Claim: " + JSON.stringify(items));
    if (items.godiron_bar < 5) problem("MITTEL", `Kap.20-Reward godiron_bar×5 fehlt (Bestand ${items.godiron_bar})`);
  }

  // ── Kapitel 21: reach_paragon_floor ────────────────────────────────────────────────────────
  await goStory(page);
  stage = await page.evaluate(READ_STAGE);
  log("Kap.21-Bühne: " + JSON.stringify({ chapnum: stage.chapnum, title: stage.title, objs: stage.objs }));
  if (stage.chapnum !== "21") problem("KRITISCH", `Aktives Kapitel "${stage.chapnum}" (erwartet 21)`);
  const obj21 = stage.objs[0] ?? {};
  log(`Kap.21 Ziel-Zeile: label="${obj21.label}" where="${obj21.where}" count="${obj21.count}"`);
  if (!/etage/i.test(obj21.label ?? "") || !(obj21.label ?? "").includes("5")) problem("MITTEL", `Kap.21-Ziel-Label: "${obj21.label}" (erwartet 'Erreiche Etage 5'-Form)`);
  if (!(obj21.where ?? "").includes("Paragon")) problem("MITTEL", `Kap.21 WHERE: "${obj21.where}" (erwartet Paragonturm)`);
  if (obj21.count !== "0 / 5") problem("MITTEL", `Kap.21 Fortschritt initial "${obj21.count}" (erwartet 0 / 5)`);

  // Regression: Paragonturm bleibt key-basiert
  await goCombat(page);
  let pcards = await page.evaluate(() => ({
    lockedCard: !!document.querySelector(".paragon-card"),
    panel: !!document.querySelector(".paragon-panel"),
  }));
  log(`Paragonturm nach 20 Kapitel-Claims: lockedCard=${pcards.lockedCard} panel=${pcards.panel}`);
  if (pcards.panel) problem("KRITISCH", "Paragonturm-Panel offen OHNE paragon_key-Unlock (Chronik darf ihn nicht öffnen)");
  if (!pcards.lockedCard && !pcards.panel) problem("MITTEL", "Paragonturm-Sektion fehlt komplett");
  await page.evaluate(() => { (window.__hfDebug.state.dungeonsUnlocked ??= {})["paragon_tower"] = true; });
  await clickRetry(page, page.locator('[data-guide-id="topbar.character"]').first());
  await page.waitForTimeout(250);
  await goCombat(page);
  pcards = await page.evaluate(() => ({
    lockedCard: !!document.querySelector(".paragon-card"),
    panel: !!document.querySelector(".paragon-panel"),
    startDisabled: document.querySelector(".paragon-start-btn")?.disabled ?? null,
  }));
  log(`Paragonturm nach Key-Unlock: panel=${pcards.panel} startDisabled=${pcards.startDisabled}`);
  if (!pcards.panel) problem("KRITISCH", "Paragonturm öffnet nach dungeonsUnlocked-Key-Unlock NICHT (Regression)");
  else if (pcards.startDisabled === false) {
    await clickRetry(page, page.locator(".paragon-start-btn").first());
    await page.waitForTimeout(1500);
    const snap = await page.evaluate(COMBAT_SNAP);
    log(`Paragon-Etage gestartet: floor=${snap.paragonFloor} monster=${snap.monsterId}`);
    if (!snap.paragonFloor) problem("KRITISCH", "Paragon-Etagen-Start erzeugt keinen Turm-Kampf");
    await shot(page, "sweep2-t3-07-paragon-regression.png");
    await clickRetry(page, page.locator(".combat-btn.flee").first());
    await page.waitForTimeout(500);
  } else problem("MITTEL", "Paragonturm-Start-Button disabled trotz Unlock");

  // Fortschritt = paragon.best
  await page.evaluate(() => { window.__hfDebug.state.paragon.best = 3; });
  await goStory(page);
  stage = await page.evaluate(READ_STAGE);
  const mid21 = stage.objs[0]?.count ?? null;
  log(`Kap.21 Fortschritt bei paragon.best=3: "${mid21}"`);
  if (mid21 !== "3 / 5") problem("MITTEL", `Kap.21 folgt paragon.best nicht ("${mid21}" bei best=3)`);
  await page.evaluate(() => { window.__hfDebug.state.paragon.best = 5; });
  await page.waitForTimeout(700);
  stage = await page.evaluate(READ_STAGE);
  if (!stage.claimBtn) problem("KRITISCH", `Kap.21 bei paragon.best=5 nicht claimbar (count=${stage.objs[0]?.count})`);
  await shot(page, "sweep2-t3-08-ch21-ready.png");
  const claim21 = await claimActive(page, 10000);
  log(`Kap.21 geclaimt: Gold +${claim21.goldDelta} (erwartet 10000)`);

  // ── Epilog + Historie ──────────────────────────────────────────────────────────────────────
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
  if (!epilog.completePresent) problem("KRITISCH", "Kein Epilog-Zustand ('alle Kapitel geschrieben') nach Claim aller 21 Kapitel");
  if (!(epilog.historyToggle ?? "").includes("21")) problem("MITTEL", `Historie zeigt nicht 21: "${epilog.historyToggle}"`);
  await shot(page, "sweep2-t3-09-epilog.png");

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
  if (!histTexts.some((t) => t.includes("Merkt euch diesen Tag"))) problem("MITTEL", "Historie Kap.20: Rückzugszeile nicht nachlesbar");
  if (!histTexts.some((t) => t.includes("Zeugenaussage"))) problem("MITTEL", "Historie Kap.15: Zeugen-Geständnis nicht nachlesbar");
  await shot(page, "sweep2-t3-10-historie.png");

  // Paragonturm-Panel überlebt den Epilog
  await goCombat(page);
  const finalPanel = await page.evaluate(() => !!document.querySelector(".paragon-panel"));
  if (!finalPanel) problem("MITTEL", "Paragonturm-Panel nach Epilog verschwunden");

  await browser.close();
  browser = null;

  console.log("\n════════ ERGEBNIS T3 TEIL 2 ════════");
  console.log(problems.length ? "PROBLEME:\n- " + problems.join("\n- ") : "ALLE CHECKS GRÜN");
  console.log("\nNOTIZEN:\n- " + notes.join("\n- "));
  const uniqErrors = [...new Set(errors)];
  console.log(uniqErrors.length ? `\n${uniqErrors.length} eindeutige page/console errors:\n` + uniqErrors.slice(0, 15).join("\n") : "\nkeine page errors");
  console.log("DONE");
} catch (e) {
  console.error("SCRIPT-ABBRUCH: " + (e?.stack ?? e));
  console.log(problems.length ? "PROBLEME (bis Abbruch):\n- " + problems.join("\n- ") : "");
  console.log(notes.length ? "NOTIZEN (bis Abbruch):\n- " + notes.join("\n- ") : "");
  process.exitCode = 1;
} finally {
  if (browser) await browser.close().catch(() => {});
  child.kill();
}
