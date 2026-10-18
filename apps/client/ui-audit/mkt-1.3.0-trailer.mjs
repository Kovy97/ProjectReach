#!/usr/bin/env node
/**
 * claude:2026-10-19T05:40:00+02:00 — Trailer 1.3.0 (Chef 19.10.: „1-minütiger Trailer, wo ich nur noch Musik
 * hinterlegen muss“). KEIN Produktivcode, kein Electron, keine echten Spielstände.
 *
 * Aufnahme Bild für Bild statt Live-Mitschnitt: Playwrights Uhr (context.clock) hält die Spielzeit an, pro Frame
 * läuft sie um genau 1/FPS s weiter (Spiel-Tick, Partikel, Timer), CSS-Animationen/-Übergänge werden über die
 * Web-Animations-API auf dieselbe virtuelle Zeit gesetzt. Ergebnis: ruckelfreie Clips unabhängig von der
 * Rechenlast des Headless-Browsers.
 *
 * Ausgabe: G:\GameDev\marketing\1.3.0-media\trailer\clips\<clip>.mp4 (+ frames/ als Zwischenstand)
 *
 * Run (aus apps/client/):
 *   node ui-audit/mkt-1.3.0-trailer.mjs list
 *   node ui-audit/mkt-1.3.0-trailer.mjs <clip> [<clip> ...]
 */
import { spawn } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";
import { BASE_URL, PARK, startDevServer, waitForServer, evalDebug, openGame, fightNow, gotoPage, clearOverlays, continueFromMenu } from "./mkt-1.3.0-media.mjs";

const FPS = 30;
const OUT = "G:\\GameDev\\marketing\\1.3.0-media\\trailer";
const CLIPS = join(OUT, "clips");
mkdirSync(CLIPS, { recursive: true });

/** Hält die Uhr an und richtet den Animations-Abgleich ein. Ab hier läuft Zeit nur noch über `step`. */
async function freeze(page) {
  await page.clock.pauseAt(Date.now() + 50);
  await page.evaluate(() => {
    const seen = new WeakMap();
    window.__mktSync = (vt) => {
      for (const a of document.getAnimations()) {
        let rec = seen.get(a);
        if (!rec) {
          a.pause();
          rec = { start: vt, base: Number(a.currentTime) || 0 };
          seen.set(a, rec);
        }
        a.currentTime = rec.base + (vt - rec.start);
      }
    };
    window.__mktFlush = () =>
      new Promise((r) => {
        const ch = new MessageChannel();
        ch.port1.onmessage = () => r();
        ch.port2.postMessage(0);
      });
  });
}

/**
 * Nimmt `seconds` auf. `cues` = { [sekunde]: async (page) => … } für Ereignisse mitten im Clip (Fund, Klick …).
 * Gibt den Pfad der fertigen MP4 zurück.
 */
/** `opts.clip`: nur diesen Ausschnitt aufnehmen (CSS-px, z. B. die Lagerkarte); `opts.zoom`: [von, bis] als
 *  langsame Kamerafahrt, vom Browser selbst gerendert (subpixelgenau); `opts.origin`: Fluchtpunkt in px. */
async function record(page, name, seconds, cues = {}, opts = {}) {
  const dir = join(OUT, "frames", name);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const frames = Math.round(seconds * FPS);
  const cueAt = new Map();
  for (const [sec, fn] of Object.entries(cues)) {
    const f = Math.round(Number(sec) * FPS);
    cueAt.set(f, [...(cueAt.get(f) ?? []), fn]);
  }
  const t0 = Date.now();
  let vt = 0;
  for (let i = 0; i < frames; i++) {
    for (const cue of cueAt.get(i) ?? []) await cue(page);
    await page.clock.runFor(1000 / FPS);
    vt += 1000 / FPS;
    await page.evaluate((t) => window.__mktSync(t), vt);
    if (opts.zoom) {
      const z = opts.zoom[0] + ((opts.zoom[1] - opts.zoom[0]) * i) / Math.max(1, frames - 1);
      await page.evaluate(([zz, o]) => {
        const el = document.documentElement;
        el.style.transformOrigin = o;
        el.style.transform = `scale(${zz})`;
      }, [z, opts.origin ?? "50% 50%"]);
    }
    await page.evaluate(() => window.__mktFlush());
    await page.screenshot({ path: join(dir, `f${String(i).padStart(5, "0")}.jpg`), type: "jpeg", quality: 94, ...(opts.clip ? { clip: opts.clip } : {}) });
  }
  console.log(`  ${name}: ${frames} Frames in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  const mp4 = join(CLIPS, `${name}.mp4`);
  await ffmpeg(["-y", "-framerate", String(FPS), "-i", join(dir, "f%05d.jpg"), "-vf", "scale=1920:1080:force_original_aspect_ratio=increase:flags=lanczos,crop=1920:1080", "-c:v", "libx264", "-preset", "slow", "-crf", "14", "-pix_fmt", "yuv420p", mp4]);
  return mp4;
}

function ffmpeg(args) {
  return new Promise((resolve, reject) => {
    const ff = spawn("ffmpeg", args, { stdio: ["ignore", "pipe", "pipe"] });
    let err = "";
    ff.stderr.on("data", (d) => (err += d.toString()));
    ff.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exit ${code}: ${err.slice(-800)}`))));
  });
}

// ── Clips ────────────────────────────────────────────────────────────────────────────────────
// Dauern enthalten je 0,4 s Überlappung für die Überblendung im Schnitt (assemble).
const CARDS_URL = "file:///G:/GameDev/marketing/1.3.0-media/trailer/cards.html";

async function cardClip(browser, name, seconds, params) {
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await context.clock.install({ time: Date.now() });
  const page = await context.newPage();
  await page.goto(`${CARDS_URL}?${new URLSearchParams(params)}`, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  await freeze(page);
  await record(page, name, seconds, { 0: (p) => p.evaluate(() => document.body.classList.add("go")) });
  await context.close();
}

async function clipOpening(browser) {
  const { context, page } = await openGame(browser, { slot: true, dsf: 1, clock: true, skipIntro: false });
  await page.waitForTimeout(400);
  await freeze(page);
  // Frame 0: Studio-Video überspringen → 1 s nur Funken → Highlands + Logo blenden in 2,6 s ein.
  await record(page, "01-opening", 4.4, { 0: (p) => p.mouse.click(960, 540) });
  await context.close();
}

async function clipCombat(browser) {
  const { context, page } = await openGame(browser, { dsf: 1, clock: true });
  await fightNow(page, "idolhall", "wreath_bearer");
  await page.waitForTimeout(200);
  await freeze(page);
  await record(page, "03-combat", 5.9);
  await context.close();
}

async function clipBoss(browser) {
  const { context, page } = await openGame(browser, { dsf: 1, clock: true });
  await gotoPage(page, "combat");
  const card = page.locator(".zone-card, .dungeon-card, [class*='dungeon']").filter({ hasText: "Expunged Chapel" }).first();
  await card.scrollIntoViewIfNeeded().catch(() => {});
  await card.locator(".dungeon-enter").first().click({ timeout: 8000 });
  await page.waitForSelector(".battle-arena", { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(500);
  await evalDebug(page, (state, content) => {
    const c = state.combat;
    if (!c) return;
    c.encounterIndex = 2;
    c.monsterId = "the_expunger";
    c.enemyHp = Math.round(content.monsters.the_expunger.maxHp * 0.74);
    c.enemyTimerMs = 0;
    c.playerTimerMs = 0;
    c.enemyEffects = [];
  });
  await page.mouse.move(PARK.x, PARK.y);
  await page.waitForTimeout(200);
  await freeze(page);
  await record(page, "05-boss", 4.9);
  await context.close();
}

async function clipMythic(browser) {
  const { context, page } = await openGame(browser, { dsf: 1, clock: true });
  await fightNow(page, "idolhall", "siege_idol");
  await page.waitForTimeout(200);
  await freeze(page);
  await record(page, "06-mythic-find", 4.4, {
    0.8: (p) =>
      evalDebug(p, (state) => {
        const free = state.inventory.slots.findIndex((s) => !s || !s.itemId);
        if (free >= 0) state.inventory.slots[free] = { itemId: "idol_aegis", qty: 1 };
        else state.inventory.slots.push({ itemId: "idol_aegis", qty: 1 });
      }),
  });
  await context.close();
}

async function clipPet(browser) {
  const { context, page } = await openGame(browser, { dsf: 1, clock: true });
  await evalDebug(page, (state) => {
    delete state.character.ownedPets.pyreling;
  });
  await fightNow(page, "idolhall", "prayer_eater");
  await page.waitForTimeout(200);
  await freeze(page);
  await record(page, "07-pet-drop", 4.9, {
    0.7: (p) =>
      evalDebug(p, (state) => {
        state.petDropSeq = (state.petDropSeq || 0) + 1;
        state.character.ownedPets.pyreling = true;
        state.lastPetDrop = { petId: "pyreling", seq: state.petDropSeq };
      }),
  });
  await context.close();
}

async function clipCharacter(browser) {
  const { context, page } = await openGame(browser, { dsf: 1, clock: true });
  await gotoPage(page, "character");
  await page.locator("#cs-tab-equipment").click({ timeout: 4000 }).catch(() => {});
  await page.mouse.move(PARK.x, PARK.y);
  await page.waitForTimeout(500);
  const box = await page.locator(".cs-slot.mainhand").first().boundingBox();
  await freeze(page);
  await record(page, "09-character", 3.4, {
    1.0: (p) => (box ? p.mouse.move(box.x + box.width / 2, box.y + box.height / 2) : null),
  });
  await context.close();
}

async function clipSkill(browser) {
  const { context, page } = await openGame(browser, { dsf: 1, clock: true });
  await gotoPage(page, "woodcutting");
  await page.waitForSelector(".skillcard", { timeout: 10000 });
  const cards = page.locator(".skillcard");
  const target = cards.nth(Math.max(0, (await cards.count()) - 3));
  await target.evaluate((el) => {
    el.scrollIntoView({ block: "start" });
    let p = el.parentElement;
    while (p && !(p.scrollHeight > p.clientHeight && /auto|scroll/.test(getComputedStyle(p).overflowY))) p = p.parentElement;
    (p ?? document.scrollingElement)?.scrollBy(0, -10);
  });
  const start = target.locator(".skillcard-cta").first();
  if (await start.count()) await start.click({ timeout: 4000 }).catch(() => {});
  await page.mouse.move(PARK.x, PARK.y);
  await page.waitForTimeout(300);
  await freeze(page);
  await record(page, "10-woodcutting", 2.9);
  await context.close();
}

async function clipBank(browser) {
  const { context, page } = await openGame(browser, { dsf: 1, clock: true });
  await evalDebug(page, (state, content) => {
    const pool = Object.values(content.items).filter((it) => it.icon !== undefined && ["legendary", "godly", "superRare", "epic", "rare", "uncommon", "common"].includes(it.rarity));
    const byType = {};
    for (const it of pool) (byType[it.type ?? it.slot ?? "misc"] ??= []).push(it);
    const picks = [];
    for (let round = 0; picks.length < 130 && round < 40; round++) {
      for (const k of Object.keys(byType)) {
        const it = byType[k][byType[k].length - 1 - round];
        if (it && !picks.includes(it.id)) picks.push(it.id);
      }
    }
    state.bank = {};
    state.bankOrder = [];
    for (const id of picks) {
      state.bank[id] = content.items[id].slot ? 1 : 40 + ((id.length * 37) % 900);
      state.bankOrder.push(id);
    }
    state.bankSlotsPurchased = Math.max(state.bankSlotsPurchased || 0, 80);
  });
  await page.waitForTimeout(1500);
  await clearOverlays(page);
  await gotoPage(page, "bank");
  await page.mouse.move(PARK.x, PARK.y);
  await page.waitForTimeout(400);
  await freeze(page);
  // Ruhige Kamerafahrt durch die Bankfächer (ca. 90 px/s).
  const scrollStep = (p) =>
    p.evaluate(() => {
      const grids = document.querySelectorAll(".bank-grid");
      let el = grids[grids.length - 1];
      while (el && !(el.scrollHeight > el.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(el).overflowY))) el = el.parentElement;
      el?.scrollBy(0, 3);
    });
  const cues = {};
  for (let i = 0; i < Math.round(2.9 * FPS); i++) cues[(i / FPS).toFixed(4)] = scrollStep;
  await record(page, "11-bank", 2.9, cues);
  await context.close();
}

async function clipCinderfall(browser) {
  const { context, page } = await openGame(browser, { slot: true, dsf: 1, clock: true });
  await continueFromMenu(page);
  await gotoPage(page, "prestige");
  await page.waitForTimeout(500);
  const input = page.locator(".prestige-confirm-input");
  await input.scrollIntoViewIfNeeded();
  await input.fill("Korveth Grimhollow");
  await page.mouse.move(PARK.x, PARK.y);
  await page.waitForTimeout(300);
  await freeze(page);
  await record(page, "13-cinderfall", 10.4, {
    0.3: (p) => p.evaluate(() => document.querySelector(".prestige-ascend-btn")?.click()),
  });
  await context.close();
}

// claude:2026-10-19T06:45:00+02:00 — Chef: Trailer allgemein zum ganzen Spiel → Lager und Idle-Kern dazu.
async function clipCamp(browser) {
  const { context, page } = await openGame(browser, { fixture: "mkt_camp", dsf: 2, clock: true });
  await page.addStyleTag({ content: ".nh-debug-toggle, .nh-debug-complete, .nh-debug-free-note, .nh-debug-light { visibility: hidden !important; }" });
  await gotoPage(page, "newhaven");
  await page.locator(".nh-view-tab[aria-selected]").first().click({ timeout: 6000 }).catch(() => {});
  await page.waitForSelector(".nh-map", { timeout: 10000 });
  const setPhase = async (ph) => {
    for (let i = 0; i < 3; i++) {
      if ((await page.locator(".nh-map").getAttribute("data-light-phase")) === ph) return;
      await page.evaluate(() => document.querySelector(".nh-debug-light")?.click());
      await page.waitForTimeout(250);
    }
  };
  await setPhase("day");
  await page.mouse.move(PARK.x, PARK.y);
  await page.waitForTimeout(600);
  const box = await page.locator(".nh-map-bg").first().boundingBox();
  const origin = `${box.x + box.width / 2}px ${box.y + box.height / 2}px`;
  await freeze(page);
  await record(page, "11a-camp-day", 2.2, {}, { clip: box, zoom: [1.0, 1.025], origin });
  await page.evaluate(() => document.querySelector(".nh-debug-light")?.click());
  await page.evaluate(() => window.__mktFlush());
  // Nacht-Sprites laden erst beim Umschalten: echte Zeit warten (die Spieluhr bleibt stehen), bis alle Bilder da sind.
  for (let i = 0; i < 40; i++) {
    const ready = await page.evaluate(() => [...document.querySelectorAll(".nh-map img")].every((im) => im.complete && im.naturalWidth > 0));
    if (ready) break;
    await page.waitForTimeout(150);
  }
  await page.waitForTimeout(400);
  await record(page, "11b-camp-night", 2.2, {}, { clip: box, zoom: [1.02, 1.045], origin });
  await context.close();
}

async function clipOffline(browser) {
  const { context, page } = await openGame(browser, { dsf: 1, clock: true, query: "&offlineTest=1", clear: false });
  // Lade-Toasts (Erfolge aus dem Schaustück-Patch) gehören nicht in diese Szene.
  await page.addStyleTag({ content: ".toast-stack { display: none !important; }" });
  await page.mouse.move(PARK.x, PARK.y);
  await page.waitForTimeout(300);
  await freeze(page);
  await record(page, "12-offline", 3.4, {}, { zoom: [1.0, 1.035] });
  await context.close();
}

const CLIP_FNS = {
  camp: clipCamp,
  offline: clipOffline,
  opening: clipOpening,
  card1: (b) => cardClip(b, "02-card-reach", 2.9, { t: "THE REACH IS BROKEN.", s: "A DARK FANTASY IDLE RPG" }),
  combat: clipCombat,
  card2: (b) => cardClip(b, "04-card-hunt", 2.9, { t: "HUNT WHAT LURKS IN THE DARK.", s: "ZONES · DUNGEONS · CHAMPIONS · BOSSES" }),
  boss: clipBoss,
  mythic: clipMythic,
  pet: clipPet,
  card3: (b) => cardClip(b, "08-card-legend", 2.9, { t: "FORGE YOUR LEGEND.", s: "GODLY GEAR · RARE COMPANIONS · 22 SKILLS" }),
  character: clipCharacter,
  skill: clipSkill,
  bank: clipBank,
  card4: (b) => cardClip(b, "12-card-ash", 2.9, { t: "FALL INTO THE ASH.", s: "RISE STRONGER WITH EVERY RUN" }),
  cinderfall: clipCinderfall,
  end: (b) => cardClip(b, "14-end", 9.5, { mode: "end" }),
};

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args[0] === "list") {
    console.log("Clips:\n" + Object.keys(CLIP_FNS).map((k) => `  ${k}`).join("\n"));
    return;
  }
  for (const n of args) if (!CLIP_FNS[n]) throw new Error(`Unbekannter Clip "${n}"`);
  const { child, getOutput } = startDevServer();
  try {
    if (!(await waitForServer(BASE_URL))) throw new Error(`Dev-Server kam nicht hoch:\n${getOutput()}`);
    const browser = await chromium.launch();
    try {
      for (const n of args) {
        const t0 = Date.now();
        await CLIP_FNS[n](browser);
        console.log(`=== ${n} ${((Date.now() - t0) / 1000).toFixed(1)} s`);
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

export { freeze, record, ffmpeg, PARK, evalDebug, gotoPage, clearOverlays };
