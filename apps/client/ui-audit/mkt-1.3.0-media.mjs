#!/usr/bin/env node
/**
 * claude:2026-10-19T04:15:00+02:00 — Store-Medien 1.3.0 (Chef 19.10.: „neue Screenshots in 1920x1080 für die
 * Steam-Store-Seite, jetzt sieht ja alles anders aus“). KEIN Produktivcode: Wegwerf-Playwright-Skript nach dem
 * Muster von mkt-0.3.0-media.mjs (eigener Vite-Dev-Server + Chromium, NIEMALS Electron, keine echten Spielstände).
 *
 * Fixture `endgame` (Korveth Grimhollow) + Laufzeit-Patches über `window.__hfDebug` (Schaustück-Ausrüstung,
 * Kapitel, 99er, Begleiter, Bank). Sprache EN (Store ist EN-only). Aufnahme mit DSF 2, danach Lanczos auf exakt
 * 1920×1080 (Chef-Vorgabe aus der 0.3.0-Runde).
 *
 * Ausgabe: G:\GameDev\marketing\1.3.0-media\screenshots\
 *
 * Run (aus apps/client/):
 *   node ui-audit/mkt-1.3.0-media.mjs list
 *   node ui-audit/mkt-1.3.0-media.mjs <motiv> [<motiv> ...]
 *   node ui-audit/mkt-1.3.0-media.mjs all
 */
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const CONFIG_PATH = join(__dirname, "sim-harness.vite.config.mjs");
const PORT = 5394;
const BASE_URL = `http://localhost:${PORT}`;
const OUT_ROOT = "G:\\GameDev\\marketing\\1.3.0-media";
const SHOT_DIR = join(OUT_ROOT, "screenshots");
mkdirSync(SHOT_DIR, { recursive: true });

const STD = { width: 1920, height: 1080 };
const XP99 = 13034431;
/** Mausparkplatz ohne Hover-Ziel (0.3.0-Lehre: ein loser Tooltip ruiniert den Shot). */
const PARK = { x: 1915, y: 1075 };
let lastPage = null;

// ── Dev-Server ───────────────────────────────────────────────────────────────────────────────
function startDevServer() {
  const viteBin = join(CLIENT_DIR, "node_modules", "vite", "bin", "vite.js");
  const child = spawn(process.execPath, [viteBin, "dev", "--config", CONFIG_PATH, "--port", String(PORT), "--strictPort"], {
    cwd: CLIENT_DIR,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, SIM_HARNESS_HMR: "0" },
  });
  let out = "";
  child.stdout.on("data", (d) => (out += d.toString()));
  child.stderr.on("data", (d) => (out += d.toString()));
  return { child, getOutput: () => out };
}

async function waitForServer(url, timeoutMs = 40000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      if ((await fetch(url)).ok) return true;
    } catch {
      /* noch nicht oben */
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

// ── Seiten-Helfer ────────────────────────────────────────────────────────────────────────────
export function evalDebug(page, fn, arg = null) {
  return page.evaluate(
    ({ src, arg }) => {
      const dbg = window.__hfDebug;
      if (!dbg) throw new Error("window.__hfDebug fehlt");
      // eslint-disable-next-line no-eval
      return (0, eval)(`(${src})`)(dbg.state, dbg.content, arg);
    },
    { src: fn.toString(), arg },
  );
}

async function dismissAnyTour(page, maxTries = 5) {
  for (let i = 0; i < maxTries; i++) {
    const skip = page.locator(".guide-bubble-skip");
    if ((await skip.count()) === 0) return;
    await skip.first().click({ timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(250);
  }
}

/** Schaustück-Zustand: Idol-Ausrüstung (Nahkampf-Ritter passend zum Porträt), Kapitel 1–27 eingelöst,
 *  Kampf-/Sammel-99er, alle Begleiter, Jägerkodex teilweise gelernt. Nur im Browser-State, nie gespeichert. */
const LISTS = {
  chron: Array.from({ length: 27 }, (_, i) => `chronicle_${String(i + 1).padStart(2, "0")}`),
  pets: ["rotbark", "cragmaw", "gillrot", "witherling", "sporewretch", "gloomrat", "slagfiend", "ashgut", "quillshrike", "flayling", "gemwraith", "glyphmaw", "hemlock", "vellumoth", "gorehound", "ironmaw", "carapace", "carrionwing", "pyreling", "hoarspite", "charnel", "booted_tomcat", "silkweaver"],
};

/** Läuft zweimal: in Node auf dem Roh-JSON der Fixture (vor dem Laden, damit Ausrüstung/99er nicht als
 *  „neuer Fund“ toasten) und im Browser nach der Migration (idempotent, Felder, die die Migration neu anlegt). */
function showcase(state, _content, lists) {
  if (state.onboarding) {
    state.onboarding.active = false;
    state.onboarding.toursSeen = { ...state.onboarding.toursSeen, featureTourV1: true, featureTourV2: true, combat: true, shop: true, bank: true };
  }
  for (const k of ["attack", "power", "defence", "vitality", "woodcutting", "fishing", "mining", "smithing", "slayer"]) {
    if (state.skills[k]) state.skills[k].xp = Math.max(state.skills[k].xp, 13034431);
  }
  for (const id of lists.chron) {
    if (!state.quests.completed.includes(id)) state.quests.completed.push(id);
    if (!state.quests.claimed.includes(id)) state.quests.claimed.push(id);
  }
  state.dungeonsUnlocked = { ...(state.dungeonsUnlocked || {}), expunged_chapel: true };
  Object.assign(state.character.equipment, {
    mainhand: "last_judgement",
    offhand: "idol_aegis",
    cape: "last_idol_mantle",
    amulet: "eye_of_the_idol",
    helmet: "idol_crown",
    boots: "idolstep_sabatons",
    gloves: "voidtouched_gauntlets",
    legs: "ridgetyrant_greaves",
    ring1: "ninth_wardens_signet",
    ring2: "idolbound_signet",
  });
  state.character.equippedInstances = {};
  state.masteryCapes = state.masteryCapes || {};
  state.capeGranted = state.capeGranted || {};
  state.capeCeremonySeen = state.capeCeremonySeen || {};
  state.character.combatStyle = "attack";
  state.character.ownedPets = state.character.ownedPets || {};
  for (const id of lists.pets) state.character.ownedPets[id] = true;
  state.character.companionPetId = "gorehound";
  state.talents = { ...(state.talents || {}), slayer: { tracking: 3, trail: 1, pace: 2, spoils: 2 } };
  state.slayerPoints = Math.max(state.slayerPoints || 0, 1840);
  // Glaubwürdiger Durchgang für Bilanz/Menü (Fixture hat 0 Spielzeit, 0 Dungeons).
  state.activePlayMs = Math.max(state.activePlayMs || 0, 312 * 3600 * 1000);
  state.dungeonsCleared = { goblin_warband: 14, wildwood_hunt: 11, highland_aerie: 8, wyvern_lair: 5, expunged_chapel: 3, ...(state.dungeonsCleared || {}) };
  if (state.paragon) state.paragon.best = Math.max(state.paragon.best || 0, 12);
  // 99er-Zeremonien als gesehen markieren, sonst blockiert ihre Warteschlange jeden Klick.
  for (const k of Object.keys(state.skills)) {
    if (state.skills[k].xp >= 13034431) {
      state.masteryCapes[k] = true;
      state.capeGranted[k] = true;
      state.capeCeremonySeen[k] = true;
    }
  }
  state.apCeremonyPending = false;
}

function patchedFixtureJson(name, fresh) {
  const raw = JSON.parse(readFileSync(join(__dirname, "fixtures", `${name}.json`), "utf8"));
  showcase(raw.state, null, LISTS);
  if (raw.summary) raw.summary.activePlayMs = raw.state.activePlayMs;
  if (fresh) {
    raw.savedAt = Date.now();
    if (raw.summary) raw.summary.savedAt = raw.savedAt;
  }
  return JSON.stringify(raw);
}

/** Schließt Zeremonien/Offline-Bilanz und blendet bis hierher aufgelaufene Toasts aus (Lade-/Patch-Folgen,
 *  z. B. frisch erreichte Erfolge). Spätere, absichtlich ausgelöste Toasts bleiben sichtbar. */
async function clearOverlays(page) {
  for (let i = 0; i < 12; i++) {
    const btn = page.locator(".mwc-next-btn, .dcc-next-btn, .chdef-close, .ofs-collect, [class*='ceremony'] button.ds-button").first();
    if ((await btn.count()) === 0 || !(await btn.isVisible().catch(() => false))) break;
    await btn.click({ timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(350);
  }
  await page.evaluate(() => document.querySelectorAll(".toast").forEach((el) => el.setAttribute("data-mkt-old", "1")));
}

async function openGame(browser, { fixture = "endgame", slot = false, dsf = 2 } = {}) {
  const context = await browser.newContext({ viewport: STD, deviceScaleFactor: dsf });
  const saveJson = slot ? patchedFixtureJson(fixture, true) : null;
  if (!slot) {
    const body = patchedFixtureJson(fixture, false);
    await context.route(`**/ui-audit-fixtures/${fixture}.json`, (route) => route.fulfill({ status: 200, contentType: "application/json", body }));
  }
  await context.addInitScript((save) => {
    try {
      localStorage.setItem("hearthforge:locale", "en");
      localStorage.setItem("gr.updateNotice.suppress", "1");
      if (save) localStorage.setItem("hearthforge:save:0", save);
    } catch {
      /* noop */
    }
  }, saveJson);
  const page = await context.newPage();
  lastPage = page;
  const errors = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  await page.addInitScript(() => {
    const css = ".toast[data-mkt-old]{display:none!important}";
    const add = () => { const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st); };
    if (document.head) add(); else document.addEventListener("DOMContentLoaded", add);
  });
  await page.goto(slot ? BASE_URL : `${BASE_URL}/?fixture=${encodeURIComponent(fixture)}`, { waitUntil: "load" });
  if (slot) {
    await page.waitForSelector(".menu", { timeout: 15000 });
    await page.mouse.click(5, 5).catch(() => {}); // Intro überspringen
    await page.waitForTimeout(3500); // Menü-Einblendung (2,6 s) abwarten
    return { context, page, errors, menu: true };
  }
  await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
  await page.waitForFunction(() => !!window.__hfDebug, null, { timeout: 8000 });
  await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(2000);
  await evalDebug(page, showcase, LISTS);
  await page.waitForTimeout(2200); // Erfolge/Meilensteine aus dem Patch aufschlagen lassen …
  await clearOverlays(page); // … und wegräumen
  await dismissAnyTour(page);
  return { context, page, errors };
}

/** Aus dem Menü per „Continue“ in den Slot-Spielstand (nötig für den echten Aufstieg: Sicherung über localStorage). */
async function continueFromMenu(page) {
  await page.locator(".continue-card").last().click({ timeout: 8000 });
  await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 20000 });
  await page.waitForFunction(() => !!window.__hfDebug, null, { timeout: 8000 });
  await page.waitForTimeout(2500);
  await clearOverlays(page);
  await evalDebug(page, showcase, LISTS);
  await page.waitForTimeout(2200);
  await clearOverlays(page);
  await dismissAnyTour(page);
}

async function gotoPage(page, id) {
  const sidebarSel = `[data-guide-id="sidebar.${id}"]`;
  const topbarSel = `[data-guide-id="topbar.${id}"]`;
  const sel = (await page.locator(sidebarSel).count()) > 0 ? sidebarSel : topbarSel;
  await page.locator(sel).first().click({ timeout: 8000 });
  await page.waitForTimeout(500);
  await dismissAnyTour(page);
}

async function fightNow(page, zoneId, monsterId) {
  await gotoPage(page, "combat");
  const zone = page.locator(`[data-bot-zone="${zoneId}"]`).first();
  if ((await zone.count()) === 0) {
    const back = page.locator(".zone-back").first();
    if (await back.count()) await back.click({ timeout: 4000 }).catch(() => {});
  }
  await zone.scrollIntoViewIfNeeded();
  await zone.click({ timeout: 8000 });
  await page.waitForTimeout(300);
  const btn = page.locator(`[data-bot-fight-now="${monsterId}"]`).first();
  await btn.scrollIntoViewIfNeeded();
  await btn.click({ timeout: 8000 });
  await page.waitForSelector(".battle-arena", { timeout: 10000 }).catch(() => {});
  await page.mouse.move(PARK.x, PARK.y);
}

async function finalizeTo1080p(rawPath, finalPath) {
  await new Promise((resolve, reject) => {
    const ff = spawn("ffmpeg", ["-y", "-i", rawPath, "-vf", "scale=1920:1080:force_original_aspect_ratio=increase:flags=lanczos,crop=1920:1080", "-frames:v", "1", finalPath], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let err = "";
    ff.stderr.on("data", (d) => (err += d.toString()));
    ff.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exit ${code}: ${err.slice(-600)}`))));
  });
  rmSync(rawPath, { force: true });
}

async function shot(page, name) {
  const finalPath = join(SHOT_DIR, `${name}.png`);
  const rawPath = join(SHOT_DIR, `_raw-${name}.png`);
  await page.screenshot({ path: rawPath, fullPage: false });
  await finalizeTo1080p(rawPath, finalPath);
  console.log("SHOT (1920x1080):", finalPath);
}

// ── Motive ───────────────────────────────────────────────────────────────────────────────────
async function motifCombat(browser) {
  const { context, page } = await openGame(browser);
  await fightNow(page, "idolhall", "wreath_bearer");
  await page.waitForTimeout(2700); // eigene Treffer im Bild, erster Gegenschlag (3,2 s) noch nicht fällig
  await shot(page, "01-combat-wreath-bearer");
  await context.close();
}

async function motifRareDrop(browser) {
  const { context, page } = await openGame(browser);
  await fightNow(page, "idolhall", "siege_idol");
  await page.waitForTimeout(1500);
  // Echter Fund-Pfad der UI: Besitz eines godly-Items steigt außerhalb der Werkbank → „Mythic Find“ mit Droprate
  // des gerade bekämpften Monsters (Aegis of the Last Idol fällt beim Siege Idol).
  await evalDebug(page, (state) => {
    const free = state.inventory.slots.findIndex((s) => !s || !s.itemId);
    if (free >= 0) state.inventory.slots[free] = { itemId: "idol_aegis", qty: 1 };
    else state.inventory.slots.push({ itemId: "idol_aegis", qty: 1 });
  });
  await page.waitForTimeout(2600);
  await shot(page, "02-mythic-find-aegis");
  await context.close();
}

async function motifPetDrop(browser) {
  const { context, page } = await openGame(browser);
  await evalDebug(page, (state) => {
    delete state.character.ownedPets.pyreling;
  });
  await fightNow(page, "idolhall", "prayer_eater");
  await page.waitForTimeout(1600);
  await evalDebug(page, (state) => {
    state.petDropSeq = (state.petDropSeq || 0) + 1;
    state.character.ownedPets.pyreling = true;
    state.lastPetDrop = { petId: "pyreling", seq: state.petDropSeq };
  });
  await page.waitForTimeout(2200);
  await shot(page, "03-pet-drop-pyreling");
  await context.close();
}

async function motifChapelBoss(browser) {
  const { context, page } = await openGame(browser);
  await gotoPage(page, "combat");
  const card = page.locator(".zone-card, .dungeon-card, [class*='dungeon']").filter({ hasText: "Expunged Chapel" }).first();
  await card.scrollIntoViewIfNeeded().catch(() => {});
  await card.locator(".dungeon-enter").first().click({ timeout: 8000 });
  await page.waitForSelector(".battle-arena", { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(800);
  // Direkt zum Boss (Welle 3): nur Gegner/Index tauschen, übrige Kampffelder bleiben die echten.
  await evalDebug(page, (state, content) => {
    const c = state.combat;
    if (!c) return;
    c.encounterIndex = 2;
    c.monsterId = "the_expunger";
    c.enemyHp = Math.round(content.monsters.the_expunger.maxHp * 0.71);
    c.enemyTimerMs = 0;
    c.playerTimerMs = 0;
    c.enemyEffects = [];
  });
  await page.mouse.move(PARK.x, PARK.y);
  await page.waitForTimeout(2600);
  await shot(page, "04-dungeon-the-expunger");
  await context.close();
}

async function motifCharacter(browser) {
  const { context, page } = await openGame(browser);
  await gotoPage(page, "character");
  await page.locator("#cs-tab-equipment").click({ timeout: 4000 }).catch(() => {});
  await page.mouse.move(PARK.x, PARK.y);
  await page.waitForTimeout(1200);
  await shot(page, "05-character-idol-set");
  await context.close();
}

async function motifItemCard(browser) {
  const { context, page } = await openGame(browser);
  await gotoPage(page, "character");
  await page.locator("#cs-tab-equipment").click({ timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(800);
  const slot = page.locator(".cs-slot.mainhand").first();
  if (await slot.count()) await slot.hover({ timeout: 4000 });
  else console.log("  [item-card] mainhand-Slot nicht gefunden");
  await page.waitForTimeout(900);
  await shot(page, "06-item-card-last-judgement");
  await context.close();
}

async function motifSkill(browser) {
  const { context, page } = await openGame(browser);
  await gotoPage(page, "woodcutting");
  await page.waitForSelector(".skillcard", { timeout: 10000 });
  const cards = page.locator(".skillcard");
  const n = await cards.count();
  const target = cards.nth(Math.max(0, n - 3));
  // Reihe bündig oben statt mittig (sonst hängt die halbe Vorgängerreihe im Bild).
  await target.evaluate((el) => {
    el.scrollIntoView({ block: "start" });
    let p = el.parentElement;
    while (p && !(p.scrollHeight > p.clientHeight && /auto|scroll/.test(getComputedStyle(p).overflowY))) p = p.parentElement;
    (p ?? document.scrollingElement)?.scrollBy(0, -10);
  });
  const start = target.locator(".skillcard-cta").first();
  if (await start.count()) await start.click({ timeout: 4000 }).catch(() => {});
  await page.mouse.move(PARK.x, PARK.y);
  await page.waitForTimeout(2400);
  await shot(page, "07-skill-woodcutting");
  await context.close();
}

async function motifBank(browser) {
  const { context, page } = await openGame(browser);
  await evalDebug(page, (state, content) => {
    const want = (it) => it.icon !== undefined && ["legendary", "godly", "superRare", "epic", "rare", "uncommon", "common"].includes(it.rarity);
    const pool = Object.values(content.items).filter(want);
    const byType = {};
    for (const it of pool) (byType[it.type ?? it.slot ?? "misc"] ??= []).push(it);
    const picks = [];
    const keys = Object.keys(byType);
    for (let round = 0; picks.length < 110 && round < 40; round++) {
      for (const k of keys) {
        const list = byType[k];
        const it = list[list.length - 1 - round];
        if (it && !picks.includes(it.id)) picks.push(it.id);
      }
    }
    state.bank = {};
    state.bankOrder = [];
    for (const id of picks) {
      const it = content.items[id];
      state.bank[id] = it.slot ? 1 : 40 + ((id.length * 37) % 900);
      state.bankOrder.push(id);
    }
    state.bankSlotsPurchased = Math.max(state.bankSlotsPurchased || 0, 80);
  });
  await page.waitForTimeout(1500); // Besitz-Audit der Toasts (max. 1×/s) die Bankfüllung sehen lassen …
  await clearOverlays(page); // … und die Fund-Toasts daraus ausblenden
  await gotoPage(page, "bank");
  await page.mouse.move(PARK.x, PARK.y);
  await page.waitForTimeout(1500);
  await shot(page, "08-bank");
  await context.close();
}

async function motifSlayerBook(browser) {
  const { context, page } = await openGame(browser);
  await gotoPage(page, "slayer");
  const tab = page.locator(".slayer-lower-tab").nth(1);
  await tab.scrollIntoViewIfNeeded().catch(() => {});
  await tab.click({ timeout: 6000 }).catch(() => console.log("  [slayer] Kodex-Tab nicht klickbar"));
  await page.waitForTimeout(600);
  await tab.evaluate((el) => el.closest(".slayer-shop-panel")?.scrollIntoView({ block: "start" })).catch(() => {});
  await page.mouse.move(PARK.x, PARK.y);
  await page.waitForTimeout(900);
  await shot(page, "09-slayers-book");
  await context.close();
}

async function motifCinderfall(browser) {
  const { context, page } = await openGame(browser, { slot: true });
  await continueFromMenu(page);
  await gotoPage(page, "prestige");
  await page.waitForTimeout(600);
  const input = page.locator(".prestige-confirm-input");
  await input.scrollIntoViewIfNeeded();
  await input.fill("Korveth Grimhollow");
  await page.locator(".prestige-ascend-btn").click({ timeout: 6000 });
  // Asche-Überblendung + Bilanz-Fenster (Phase 1: Zeilen laufen nacheinander ein).
  await page.waitForTimeout(13000); // Zeilen + Narben-Zähler laufen vollständig ein
  await page.mouse.move(PARK.x, PARK.y);
  await shot(page, "10-cinderfall-run-chronicle");
  await context.close();
}

async function motifMenu(browser) {
  const { context, page } = await openGame(browser, { slot: true });
  await page.mouse.move(PARK.x, PARK.y);
  await page.waitForTimeout(800);
  await shot(page, "11-main-menu");
  await context.close();
}

async function motifAltar(browser) {
  const { context, page } = await openGame(browser);
  await gotoPage(page, "prestige");
  await page.mouse.move(PARK.x, PARK.y);
  await page.waitForTimeout(1200);
  await shot(page, "12-shard-altar");
  await context.close();
}

const MOTIFS = {
  combat: motifCombat,
  "rare-drop": motifRareDrop,
  "pet-drop": motifPetDrop,
  chapel: motifChapelBoss,
  character: motifCharacter,
  "item-card": motifItemCard,
  skill: motifSkill,
  bank: motifBank,
  slayer: motifSlayerBook,
  cinderfall: motifCinderfall,
  menu: motifMenu,
  altar: motifAltar,
};

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args[0] === "list") {
    console.log("Motive:\n" + Object.keys(MOTIFS).map((k) => `  ${k}`).join("\n"));
    return;
  }
  const names = args[0] === "all" ? Object.keys(MOTIFS) : args;
  for (const n of names) if (!MOTIFS[n]) throw new Error(`Unbekanntes Motiv "${n}"`);
  const { child, getOutput } = startDevServer();
  try {
    if (!(await waitForServer(BASE_URL))) throw new Error(`Dev-Server kam nicht hoch:\n${getOutput()}`);
    const browser = await chromium.launch();
    try {
      for (const n of names) {
        const t0 = Date.now();
        try {
          await MOTIFS[n](browser);
        } catch (err) {
          console.log(`  [${n}] FEHLER: ${err.message.split("\n")[0]}`);
          if (lastPage) await lastPage.screenshot({ path: join(SHOT_DIR, `_debug-${n}.png`) }).catch(() => {});
        }
        console.log(`=== ${n} ${Date.now() - t0} ms`);
      }
    } finally {
      await browser.close();
    }
  } finally {
    try {
      child.kill();
    } catch {
      /* schon weg */
    }
  }
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
