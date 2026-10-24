#!/usr/bin/env node
/**
 * claude:2026-10-24T22:19:00+02:00 — Bilder für die Patchnotes 1.4.0 (Chef 24.10.: „ein paar Screens zu dem neuen Update“).
 * KEIN Produktivcode: Wegwerf-Skript nach dem Muster von mkt-1.3.0-media.mjs (dessen Helfer es nutzt: eigener Vite-Dev-Server,
 * Chromium, NIE Electron, keine echten Spielstände). Fixture `endgame` + Schaustück-Zustand, Sprache EN (Steam ist EN), DSF 2,
 * danach Lanczos auf 1920×1080. Raid, Aufträge und Ereignisse werden wie in raid-w4-shots.mjs / w140-welle3-shots.mjs über
 * `window.__hfDebug` in den Browser-Zustand gelegt.
 *
 * Ausgabe: G:\GameDev\marketing\1.4.0-media\screenshots\
 * Run (aus apps/client/): node ui-audit/mkt-1.4.0-media.mjs <motiv> [...] | all | list
 */
import { spawn } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";
import { BASE_URL, PARK, evalDebug, gotoPage, openGame, startDevServer, waitForServer } from "./mkt-1.3.0-media.mjs";

const SHOT_DIR = "G:\\GameDev\\marketing\\1.4.0-media\\screenshots";
mkdirSync(SHOT_DIR, { recursive: true });

async function shot(page, name, { toasts = false } = {}) {
  const finalPath = join(SHOT_DIR, `${name}.png`);
  const rawPath = join(SHOT_DIR, `_raw-${name}.png`);
  await page.mouse.move(PARK.x, PARK.y);
  // Meldungen aus dem Aufbau (Erfolge, Funde) gehören nicht ins Bild, außer das Motiv will sie
  if (!toasts) await page.evaluate(() => document.querySelectorAll(".toast").forEach((el) => (el.style.display = "none")));
  await page.screenshot({ path: rawPath, fullPage: false });
  await new Promise((resolve, reject) => {
    const ff = spawn("ffmpeg", ["-y", "-v", "error", "-i", rawPath, "-vf", "scale=1920:1080:flags=lanczos", "-frames:v", "1", finalPath]);
    ff.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg ${code}`))));
  });
  rmSync(rawPath, { force: true });
  console.log("SHOT:", finalPath);
}

const click = (page, sel) => page.locator(sel).first().evaluate((el) => el.click());

/** Raid freischalten (Drazhan besiegt) und Gold für die Gebühr. */
function raidReady(state) {
  // 99 ohne Zeremonie: wie showcase() in mkt-1.3.0-media.mjs als gesehen markieren, sonst liegt sie über dem Bild
  for (const k of ["attack", "power", "defence", "vitality", "ranged", "magic", "warding"]) {
    if (!state.skills[k]) continue;
    state.skills[k].xp = Math.max(state.skills[k].xp, 13034431);
    state.masteryCapes[k] = true; state.capeGranted[k] = true; state.capeCeremonySeen[k] = true;
  }
  state.dungeonsCleared = { ...(state.dungeonsCleared || {}), behind_the_throne: 1 };
  state.character.gold = 9_000_000;
  state.raid = state.raid ?? {};
  state.raid.clears = { normal: 3, heroic: 1, mythic: 0 };
}

async function startRaid(page) {
  await evalDebug(page, raidReady);
  await gotoPage(page, "combat");
  if (await page.locator(".combat-zones-btn").count()) await click(page, ".combat-zones-btn");
  await page.waitForTimeout(400);
  await page.locator(".raid-panel").first().scrollIntoViewIfNeeded();
  await click(page, ".raid-start-btn");
  await page.waitForTimeout(900);
}

const MOTIFS = {
  async raid(browser) {
    const { context, page } = await openGame(browser);
    await startRaid(page);
    await evalDebug(page, (s) => {
      s.character.hp = 9_999_999;
      s.combat.encounterIndex = 4;
      s.combat.monsterId = "gk_tallymistress";
      s.combat.bossPhase = 1;
    });
    await page.waitForTimeout(2600);
    await shot(page, "1.4.0-raid-boss");
    await context.close();
  },
  async raidloot(browser) {
    const { context, page } = await openGame(browser);
    await startRaid(page);
    await evalDebug(page, (s) => {
      s.combat.monsterId = null;
      s.combat.dungeonId = null;
      const r = s.raid.run;
      r.phase = "rest"; r.room = 1; r.restMs = 60000;
      r.lastLoot = [{ itemId: "relic_dust", qty: 12 }, { itemId: "gk_fire_hands_heroic", qty: 1 }, { itemId: "gk_king_greatsword_mythic", qty: 1 }];
      r.loot = [...r.lastLoot];
      r.bossSeq += 1;
    });
    await page.waitForTimeout(5800);
    await shot(page, "1.4.0-raid-loot");
    await context.close();
  },
  async fletching(browser) {
    const { context, page } = await openGame(browser);
    await evalDebug(page, (s) => {
      s.skills.bowcraft = { xp: Math.max(s.skills.bowcraft?.xp ?? 0, 13034431) };
      s.masteryCapes.bowcraft = true; s.capeGranted.bowcraft = true; s.capeCeremonySeen.bowcraft = true;
    });
    await page.waitForTimeout(800);
    await page.keyboard.press("Escape");
    await gotoPage(page, "bowcraft");
    await page.waitForTimeout(800);
    await evalDebug(page, (s, c) => {
      for (const it of Object.values(c.items)) if (it.type === "material") s.bank[it.id] = Math.max(s.bank[it.id] ?? 0, 900);
    });
    const heads = page.locator(".category-header");
    const n = await heads.count();
    const texts = await heads.allInnerTexts();
    console.log("Bognerei-Kategorien:", texts.map((t) => t.replace(/\s+/g, " ").trim()).join(" | "));
    const want = texts.findIndex((t) => /Effect Arrows/i.test(t));
    const cat = heads.nth(want >= 0 ? want : Math.min(5, n - 1));
    if (await cat.count()) { await cat.evaluate((el) => el.click()); await page.waitForTimeout(600); await cat.evaluate((el) => el.scrollIntoView({ block: "start" })); }
    await page.waitForTimeout(600);
    await shot(page, "1.4.0-fletching");
    await context.close();
  },
  async storage(browser) {
    const { context, page } = await openGame(browser);
    // Ein gut gefülltes Lager: drei von vier Materialien vorhanden, gesehen, mit glaubwürdigen Mengen
    await evalDebug(page, (s, c) => {
      const mats = Object.values(c.items).filter((it) => it.type === "material" && !/(_key|_sigil|_seal)$|^masters_mark$/.test(it.id));
      s.discoveredItems = s.discoveredItems ?? {};
      mats.forEach((it, i) => {
        if (i % 4 === 3) return;
        s.bank[it.id] = Math.max(s.bank[it.id] ?? 0, [37, 412, 1280, 96, 2750, 18, 640][i % 7]);
        s.discoveredItems[it.id] = true;
      });
    });
    await gotoPage(page, "storage");
    await page.waitForTimeout(1200);
    await shot(page, "1.4.0-storage");
    await context.close();
  },
  async orders(browser) {
    const { context, page } = await openGame(browser);
    await evalDebug(page, (s) => {
      const o = s.workOrders;
      o.offer = { id: 3, kind: "produce", skill: "smithing", actionId: "smelt_runite", itemId: "runite_bar", count: 140, minutes: 30, band: 4, gold: 9800, xp: 85000, customerId: "dashk", baseline: 0 };
      o.offerMsLeft = 600000;
      o.open = [
        { id: 2, kind: "deliver", skill: "mining", actionId: "mine_runite", itemId: "runite_ore", count: 220, minutes: 25, band: 4, gold: 12400, xp: 64000, customerId: "grumm", baseline: (s.stats.producedById?.runite_ore ?? 0) - 130 },
        { id: 1, kind: "produce", skill: "bowcraft", actionId: "fletch_titanium_arrow", itemId: "titanium_arrow", count: 600, minutes: 35, band: 5, gold: 15600, xp: 410000, customerId: "caedren", baseline: (s.stats.producedById?.titanium_arrow ?? 0) - 410 },
      ];
      o.seq = 3;
    });
    await gotoPage(page, "quests");
    const tab = page.locator(".quests-tab-btn").filter({ hasText: /Orders|Work/i }).first();
    if (await tab.count()) await tab.evaluate((el) => el.click());
    await page.waitForTimeout(6000);
    await shot(page, "1.4.0-work-orders");
    await context.close();
  },
  async companions(browser) {
    const { context, page } = await openGame(browser);
    await gotoPage(page, "companions");
    await page.waitForTimeout(1200);
    await shot(page, "1.4.0-companions-readable");
    await context.close();
  },
  async events(browser) {
    const { context, page } = await openGame(browser);
    await gotoPage(page, "mining");
    await page.waitForTimeout(600);
    await evalDebug(page, (s) => {
      const ev = s.skillEvents;
      ev.active = { id: "rich_vein", skill: "mining", actionsLeft: 14, msLeft: 420000 };
      ev.log.unshift({ seq: (ev.seq ?? 0) + 1, id: "rich_vein", skill: "mining", atMs: s.elapsedMs });
      ev.seq = (ev.seq ?? 0) + 1;
    });
    await page.waitForTimeout(1400);
    await shot(page, "1.4.0-events", { toasts: true });
    await context.close();
  },
};

async function main() {
  const args = process.argv.slice(2);
  if (args[0] === "list" || args.length === 0) return console.log(Object.keys(MOTIFS).join(" "));
  const names = args[0] === "all" ? Object.keys(MOTIFS) : args;
  const srv = startDevServer();
  try {
    if (!(await waitForServer(BASE_URL))) throw new Error("Dev-Server kam nicht hoch:\n" + srv.getOutput());
    const browser = await chromium.launch();
    try {
      for (const n of names) {
        if (!MOTIFS[n]) { console.log("unbekannt:", n); continue; }
        await MOTIFS[n](browser).catch((e) => console.log("FEHLER", n, e.message));
      }
    } finally {
      await browser.close();
    }
  } finally {
    srv.child.kill();
  }
}
main();
