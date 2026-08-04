#!/usr/bin/env node
/**
 * nh-bot1-fresh.mjs — Release-Checkpoint 0.3.0, Bot 1/5 (Kontrolleur):
 * Frischer Spielstart + New-Haven-Lager-Flow als Spieler, headless (NIE Electron).
 *
 * Eigenes Skript statt bot.mjs, weil die Prüfstrecke Dinge braucht, die dessen Vokabular
 * nicht hat: page.reload() (Offline-/Persistenz-Test), Hover-Tooltips (CampBoostNote),
 * Maus-Ghost-Platzierung auf der Dorfkarte, Intervall-Messung realer Aktionsdauern.
 * Nutzt dieselbe Harness-Infra (sim-harness.mjs), Port 5348 (laut BOT-GUIDE stabil).
 *
 * Transparenz-Prinzip: Die ERSTEN Spielminuten laufen komplett ehrlich (echte Klicks,
 * echtes Holzfällen). Materialien/Level fuer die spaeteren Stationen werden per State-Patch
 * gestellt (dokumentiert in den Findings), weil der echte Grind Stunden dauert — genau DAS
 * ist ein eigener Befund, kein verstecktes Schummeln. Der Debug-Sofortabschluss-Button wird
 * NIE benutzt; Bau-Restzeiten werden nach bestandener Tick-/Reload-Pruefung minimal gepatcht.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { startHarness } from "./sim-harness.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "bot-runs", "nh-bot1-fresh");
mkdirSync(OUT, { recursive: true });

const findings = [];
const log = (msg) => {
  console.log(msg);
  findings.push(msg);
};

const KEY_LEAK_RE = /(?:^|[\s>(])((?:newhaven|menu|creation|skill|nav|common|queue|offline|char|combat|bank|shop)\.[a-z][a-zA-Z0-9]*(?:\.[a-zA-Z0-9]+)+)/g;

async function scanKeyLeaks(page, station) {
  const text = await page.evaluate(() => document.body.innerText);
  const hits = new Set();
  let m;
  while ((m = KEY_LEAK_RE.exec(text)) !== null) hits.add(m[1]);
  if (hits.size > 0) log(`KEYLEAK @${station}: ${[...hits].join(", ")}`);
  else log(`keyleak-scan @${station}: sauber`);
}

/** In-Page-Item-Geber (stackables only) — mutiert state.inventory.slots direkt. */
const giveItemsFn = (dbg, items) => {
  const inv = dbg.state.inventory;
  for (const [itemId, qty] of items) {
    const slot = inv.slots.find((s) => s && s.itemId === itemId);
    if (slot) slot.qty += qty;
    else {
      const idx = inv.slots.findIndex((s) => s === null);
      if (idx === -1) throw new Error("Inventar voll: " + itemId);
      inv.slots[idx] = { itemId, qty };
    }
  }
};

async function give(h, items) {
  await h.page.evaluate(
    ([fnSrc, its]) => {
      const fn = new Function("dbg", "items", `return (${fnSrc})(dbg, items);`);
      fn(window.__hfDebug, its);
    },
    [giveItemsFn.toString(), items],
  );
}

async function st(h, fn) {
  return h.page.evaluate((src) => {
    const f = new Function("dbg", `return (${src})(dbg);`);
    return f(window.__hfDebug);
  }, fn.toString());
}

async function shot(h, name) {
  const file = await h.shot(name);
  return file;
}

/** Warden-Onboarding-Guide (frischer Char) wegklicken — bis zu 4 Skip-Versuche. */
async function skipGuides(page, log) {
  for (let i = 0; i < 4; i++) {
    const skip = page.locator(".guide-bubble-skip").first();
    if ((await skip.count()) === 0) break;
    await skip.click({ timeout: 4000 }).catch(() => {});
    log(`onboarding: skip-klick #${i + 1}`);
    await page.waitForTimeout(700);
  }
}

const main = async () => {
  const h = await startHarness({
    port: 5350,
    fixture: null,
    locale: "en",
    requireDebugHook: false,
    outDir: OUT,
    viewport: { width: 1920, height: 1080 },
  });
  const { page } = h;
  const t0 = Date.now();

  try {
    // ── 1. Intro/Menü ────────────────────────────────────────────────────────
    await page.waitForTimeout(1500);
    await page.keyboard.press("Escape"); // Trailer-Skip
    await page.mouse.click(960, 900); // Fallback-Skip (Klick zählt auch)
    await page.getByText("New Game", { exact: true }).first().waitFor({ timeout: 20000 });
    await page.waitForTimeout(1300); // Reveal-Fade
    await shot(h, "01-menu");
    await scanKeyLeaks(page, "menu-en");

    // ── 2. Neues Spiel → Slot → Charaktererstellung ─────────────────────────
    await page.getByText("New Game", { exact: true }).first().click();
    await page.waitForSelector(".menu-slot", { timeout: 8000 });
    await shot(h, "02-newgame-panel");
    const emptySlotBtn = page.locator(".menu-slot--empty .hf-btn--primary").first();
    if ((await emptySlotBtn.count()) === 0) throw new Error("Kein leerer Save-Slot gefunden");
    await emptySlotBtn.click();
    await page.waitForSelector(".creation-input", { timeout: 8000 });
    await shot(h, "03-creation");
    await scanKeyLeaks(page, "creation-en");
    const startDisabledBefore = await page.locator(".creation-start").isDisabled();
    log(`creation: Start-Button ohne Namen disabled = ${startDisabledBefore} (erwartet true)`);
    await page.locator(".creation-input").fill("Bot Eins");
    await page.locator(".creation-style-card").nth(0).click(); // melee explizit
    await page.locator(".creation-start").click();
    await h.waitForDebugHook(15000);
    await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
    await page.waitForTimeout(1500);
    await shot(h, "04-ingame-first-view");
    await scanKeyLeaks(page, "ingame-first-en");
    // Warden-Menü-Guide (frischer Char) blockiert als Modal alle Klicks — Skip.
    await skipGuides(page, log);
    await shot(h, "04b-after-guide-skip");

    // ── 3. Frisch-Zustand + Sidebar / New-Haven-Icon ────────────────────────
    const fresh = await st(h, (dbg) => ({
      gold: dbg.state.character.gold,
      totalLevel: dbg.state.character.totalLevel,
      inv: dbg.state.inventory.slots.filter(Boolean).map((s) => `${s.itemId}x${s.qty}`),
      camp: dbg.state.camp ?? null,
    }));
    log(`frisch: gold=${fresh.gold} totalLevel=${fresh.totalLevel} inv=[${fresh.inv.join(", ")}] camp=${JSON.stringify(fresh.camp)}`);

    const nhNav = page.locator('[data-guide-id="sidebar.newhaven"]');
    log(`sidebar.newhaven vorhanden: ${(await nhNav.count()) > 0}`);
    const iconInfo = await page.evaluate(() => {
      const el = document.querySelector('[data-guide-id="sidebar.newhaven"]');
      if (!el) return null;
      const img = el.querySelector("img");
      return {
        text: el.textContent?.trim(),
        hasImg: !!img,
        imgLoaded: img ? img.complete && img.naturalWidth > 0 : false,
        src: img?.getAttribute("src") ?? null,
      };
    });
    log(`newhaven-sidebar-icon: ${JSON.stringify(iconInfo)}`);

    // ── 4. New Haven ab Start: Karte + Liste, Zentralhaus-Kosten ────────────
    await nhNav.first().click();
    await page.waitForSelector(".newhaven-page", { timeout: 8000 });
    await page.waitForTimeout(800);
    await shot(h, "05-newhaven-map-fresh");
    await scanKeyLeaks(page, "newhaven-map-en");
    const emptyHint = await page.locator(".nh-map-empty-hint").count();
    log(`karte leer-hinweis sichtbar: ${emptyHint > 0}`);
    // BuildMenu: Zentralhaus-Eintrag — Zustand bei 0 Gold
    const bmenu = await page.evaluate(() => {
      const items = [...document.querySelectorAll(".nh-buildmenu-item")];
      return items.slice(0, 4).map((el) => ({
        name: el.querySelector(".nh-buildmenu-name")?.textContent?.trim(),
        disabled: el.disabled,
        reason: el.querySelector(".nh-buildmenu-reason")?.textContent?.trim() ?? null,
        costs: [...el.querySelectorAll(".nh-buildmenu-cost")].map((c) => c.textContent?.trim()),
      }));
    });
    log(`buildmenu@frisch (top4): ${JSON.stringify(bmenu)}`);

    await page.locator(".nh-view-tab", { hasText: "List" }).first().click().catch(() => {});
    // Fallback über Rolle tab index 1
    if ((await page.locator(".nh-grid").count()) === 0) {
      await page.locator('[role="tab"]').nth(1).click();
    }
    await page.waitForSelector(".nh-grid", { timeout: 8000 });
    await page.waitForTimeout(500);
    await shot(h, "06-newhaven-list-fresh");
    await scanKeyLeaks(page, "newhaven-list-en");
    const hallCard = await page.evaluate(() => {
      const card = [...document.querySelectorAll(".nh-card")][0];
      if (!card) return null;
      return {
        name: card.querySelector(".nh-card-name")?.textContent?.trim(),
        gold: card.querySelector(".nh-cost-gold")?.textContent?.trim(),
        mats: [...card.querySelectorAll(".nh-mats .mat-chip")].map((c) => c.textContent?.trim()),
        time: card.querySelector(".nh-cost-time")?.textContent?.trim(),
        buildBtnDisabled: card.querySelector(".nh-build-btn")?.disabled ?? null,
        blocked: card.querySelector(".nh-blocked")?.textContent?.trim() ?? null,
      };
    });
    log(`zentralhaus-karte@frisch: ${JSON.stringify(hallCard)}`);

    // ── 5. Ehrlicher Holzfäller-Loop (erste-15-Minuten-Gefühl) ──────────────
    await page.locator('[data-guide-id="sidebar.woodcutting"]').first().click();
    await page.waitForSelector("#skillcard-cut_normal_tree", { timeout: 8000 });
    await page.waitForTimeout(600);
    await shot(h, "07-woodcutting-fresh");
    await scanKeyLeaks(page, "woodcutting-en");
    const wcCards = await page.evaluate(() => {
      const ids = ["cut_normal_tree", "cut_oak_tree", "craft_timber_beam"];
      return ids.map((id) => {
        const el = document.getElementById(`skillcard-${id}`);
        if (!el) return { id, present: false };
        return {
          id,
          present: true,
          locked: el.className.includes("locked"),
          lvl: el.querySelector(".skillcard-lvl")?.textContent?.trim(),
          tiles: [...el.querySelectorAll(".skillcard-tile")].map((t) => t.textContent?.trim()),
        };
      });
    });
    log(`wc-karten@frisch: ${JSON.stringify(wcCards)}`);

    // ∞-Queue auf Normaler Baum, 45 s ehrlich messen
    await page.locator("#skillcard-cut_normal_tree .skillcard-cta.qty.all").click();
    await page.waitForTimeout(500);
    const wcBefore = await st(h, (dbg) => ({
      logs: dbg.state.inventory.slots.filter((s) => s && s.itemId === "normal_log").reduce((a, s) => a + s.qty, 0),
      xp: dbg.state.skills.woodcutting?.xp ?? 0,
      active: dbg.state.activeActionId,
    }));
    log(`wc-loop gestartet: active=${wcBefore.active}`);
    await page.waitForTimeout(20000);
    const wcAfter = await st(h, (dbg) => ({
      logs: dbg.state.inventory.slots.filter((s) => s && s.itemId === "normal_log").reduce((a, s) => a + s.qty, 0),
      xp: dbg.state.skills.woodcutting?.xp ?? 0,
    }));
    const dLogs = wcAfter.logs - wcBefore.logs;
    const dXp = wcAfter.xp - wcBefore.xp;
    log(`wc-20s: +${dLogs} logs, +${dXp} xp (≈${Math.round((dXp / 20) * 3600)} xp/h; Soll ~5143 xp/h bei 2.8s/4xp)`);
    await shot(h, "08-woodcutting-running");

    // ── 6. Material-Patch (dokumentiert) + Balken REAL zimmern ──────────────
    await st(h, (dbg) => {
      dbg.state.character.gold = 5000;
      dbg.state.skills.woodcutting = { xp: 2500 }; // Level 15 (xpForLevel(15)=~2411)
    });
    await give(h, [
      ["oak_log", 40],
      ["raw_hide", 10],
      ["blackwood_log", 200],
      ["bronze_bar", 30],
      ["raw_ironscale_bass", 60],
    ]);
    log("PATCH: gold=5000, WC-xp=2500 (Lvl 15), +40 oak, +10 raw_hide, +200 blackwood, +30 bronze_bar, +60 bass");
    // Seite neu betreten, damit Karten den Levelstand sehen
    await page.locator('[data-guide-id="sidebar.newhaven"]').first().click();
    await page.waitForTimeout(300);
    await page.locator('[data-guide-id="sidebar.woodcutting"]').first().click();
    await page.waitForSelector("#skillcard-craft_timber_beam", { timeout: 8000 });
    // laufende ∞-Queue stoppen
    const stopBtn = page.locator(".skillcard-cta.stop").first();
    if ((await stopBtn.count()) > 0) await stopBtn.click();
    await page.waitForTimeout(300);
    // 2 Balken real zimmern: Preset "1" zweimal? Presets sind [1,25,50]? -> nimm ersten Preset 2x
    const beamCard = page.locator("#skillcard-craft_timber_beam");
    await beamCard.locator(".skillcard-cta.qty").first().click();
    await page.waitForTimeout(6800);
    await beamCard.locator(".skillcard-cta.qty").first().click();
    await page.waitForTimeout(6800);
    const beams = await st(h, (dbg) =>
      dbg.state.inventory.slots.filter((s) => s && s.itemId === "timber_beam").reduce((a, s) => a + s.qty, 0),
    );
    log(`timber_beam nach 2 echten Zimmer-Aktionen: ${beams} (erwartet 2)`);
    await shot(h, "09-craft-beam");

    // ── 7. Zentralhaus über die KARTE bauen (Erstkontakt-Zeremonie) ─────────
    await page.locator('[data-guide-id="sidebar.newhaven"]').first().click();
    await page.waitForSelector(".newhaven-page", { timeout: 8000 });
    // sicherstellen: Kartenansicht
    await page.locator('[role="tab"]').nth(0).click();
    await page.waitForSelector(".nh-map", { timeout: 8000 });
    await page.waitForTimeout(500);
    await shot(h, "10-newhaven-affordable");
    const hallItem = page.locator(".nh-buildmenu-item").first();
    const hallDisabled = await hallItem.isDisabled();
    log(`buildmenu zentralhaus jetzt disabled=${hallDisabled} (erwartet false)`);
    await hallItem.click();
    await page.waitForTimeout(400);
    const mapBox = await page.locator(".nh-map").boundingBox();
    if (!mapBox) throw new Error("Karte nicht gefunden");
    const cx = mapBox.x + mapBox.width * 0.5;
    const cy = mapBox.y + mapBox.height * 0.55;
    await page.mouse.move(cx, cy, { steps: 8 });
    await page.waitForTimeout(400);
    await shot(h, "11-ghost-valid");
    // Gate-Probe: Rand (out_of_bounds)
    await page.mouse.move(mapBox.x + 4, mapBox.y + 4, { steps: 5 });
    await page.waitForTimeout(400);
    const edgeReason = await page.evaluate(() => document.querySelector(".nh-place-reason")?.textContent?.trim() ?? null);
    log(`ghost@rand reason: ${JSON.stringify(edgeReason)}`);
    await shot(h, "12-ghost-edge");
    await page.mouse.move(cx, cy, { steps: 8 });
    await page.waitForTimeout(300);
    await page.mouse.click(cx, cy);
    await page.waitForTimeout(600);
    const jobAfterPlace = await st(h, (dbg) => dbg.state.camp?.buildJob ?? null);
    log(`buildJob nach Karten-Platzierung: ${JSON.stringify(jobAfterPlace)}`);
    if (!jobAfterPlace) throw new Error("Zentralhaus-Bau wurde nicht gestartet");
    await shot(h, "13-hall-building");

    // ── 8. Tick-Messung (15 s) ──────────────────────────────────────────────
    const r1 = await st(h, (dbg) => dbg.state.camp.buildJob?.remainingMs ?? -1);
    const w1 = Date.now();
    await page.waitForTimeout(15000);
    const r2 = await st(h, (dbg) => dbg.state.camp.buildJob?.remainingMs ?? -1);
    const elapsed = Date.now() - w1;
    log(`tick-messung: remaining ${r1} -> ${r2} in ${elapsed}ms (delta=${r1 - r2}, soll≈${elapsed})`);

    // UI-Countdown sichtbar? (Karten-Kachel Fortschrittsbalken)
    const tileProg = await page.locator(".nh-map-tile-progress").count();
    log(`karten-kachel fortschrittsbalken vorhanden: ${tileProg > 0}`);

    // ── 9. Bautrupp-Sperre (Liste + Karte) während Bau läuft ───────────────
    await page.locator('[role="tab"]').nth(1).click();
    await page.waitForSelector(".nh-grid", { timeout: 8000 });
    await page.waitForTimeout(400);
    const busyProbe = await page.evaluate(() => {
      const cards = [...document.querySelectorAll(".nh-card")];
      const sawpit = cards.find((c) => c.querySelector(".nh-card-name")?.textContent?.includes("Sawpit"));
      if (!sawpit) return null;
      return {
        btnDisabled: sawpit.querySelector(".nh-build-btn")?.disabled ?? null,
        blocked: sawpit.querySelector(".nh-blocked")?.textContent?.trim() ?? null,
      };
    });
    log(`sperre@liste (Sawpit, während Zentralhaus baut): ${JSON.stringify(busyProbe)}`);
    await shot(h, "14-crew-busy-list");
    await scanKeyLeaks(page, "newhaven-busy-list-en");

    // ── 10. Reload-/Offline-Test (Autosave 15s ist durch) ───────────────────
    const beforeReload = await st(h, (dbg) => dbg.state.camp.buildJob?.remainingMs ?? -1);
    const wallBefore = Date.now();
    await page.reload();
    await page.waitForTimeout(2500);
    await page.keyboard.press("Escape"); // Intro erneut skippen
    await page.mouse.click(960, 900);
    await page.getByText("Load Game", { exact: true }).first().waitFor({ timeout: 20000 });
    await page.waitForTimeout(1200);
    await page.getByText("Load Game", { exact: true }).first().click();
    await page.waitForSelector(".menu-slot.filled", { timeout: 8000 });
    await shot(h, "15-menu-after-reload");
    await page.locator(".menu-slot.filled").first().click();
    await h.waitForDebugHook(15000);
    await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
    await page.waitForTimeout(1500);
    // Offline-Popup schließen falls da
    const ofs = page.locator(".ofs-collect");
    if ((await ofs.count()) > 0) {
      await shot(h, "16-offline-popup");
      await ofs.click();
    }
    await skipGuides(page, log); // falls der Guide nach Load erneut aufgeht
    const afterReload = await st(h, (dbg) => dbg.state.camp?.buildJob?.remainingMs ?? -999);
    const wallDelta = Date.now() - wallBefore;
    log(`reload-test: remaining vor=${beforeReload} nach=${afterReload} (wall=${wallDelta}ms; erwartet: nach ≈ vor − wall ± Autosave-Fenster)`);
    if (afterReload === -999) log("BEFUND: camp.buildJob nach Reload VERSCHWUNDEN!");
    else if (afterReload > beforeReload) log("BEFUND: remainingMs nach Reload GRÖSSER als vorher (Offline zählt nicht)");

    // ── 11. Zentralhaus fertigstellen (remaining minimal patchen, KEIN Debug-Button) ──
    await st(h, (dbg) => { dbg.state.camp.buildJob.remainingMs = 2000; });
    await page.waitForTimeout(4500);
    const hallLevel = await st(h, (dbg) => ({ level: dbg.state.camp.buildings?.camp_townhall ?? dbg.state.camp.levels?.camp_townhall ?? JSON.stringify(dbg.state.camp), job: dbg.state.camp.buildJob }));
    log(`zentralhaus nach abschluss: ${JSON.stringify(hallLevel).slice(0, 400)}`);
    await page.locator('[data-guide-id="sidebar.newhaven"]').first().click();
    await page.waitForSelector(".newhaven-page", { timeout: 8000 });
    await page.waitForTimeout(800);
    await shot(h, "17-hall-done-map");
    // Toast?
    const toastText = await page.evaluate(() => document.querySelector(".toast-stack")?.textContent?.trim() ?? null);
    log(`toasts nach bau-abschluss (evtl. schon verflogen): ${JSON.stringify(toastText)}`);

    // ── 12. Zweites Gebäude aus der LISTE (Sägegrube) ───────────────────────
    await page.locator('[role="tab"]').nth(1).click();
    await page.waitForSelector(".nh-grid", { timeout: 8000 });
    await page.waitForTimeout(400);
    const sawBtn = await page.evaluate(() => {
      const cards = [...document.querySelectorAll(".nh-card")];
      const sawpit = cards.find((c) => c.querySelector(".nh-card-name")?.textContent?.includes("Sawpit"));
      if (!sawpit) return { found: false };
      return { found: true, disabled: sawpit.querySelector(".nh-build-btn")?.disabled, blocked: sawpit.querySelector(".nh-blocked")?.textContent?.trim() ?? null };
    });
    log(`sawpit@liste nach zentralhaus: ${JSON.stringify(sawBtn)}`);
    // Balken für Sägegrube (2) real? Wir haben genug Material gepatcht — aber beams sind verbraucht: +2 nachzimmern wäre Zeit; patchen:
    await give(h, [["timber_beam", 6]]);
    log("PATCH: +6 timber_beam (für Sägegrube/Fischerhütte)");
    // Bot-Stolperfalle (Befund im ersten Lauf): das newHavenGate re-rendert im Idle nicht bei
    // reinen Inventar-Patches (Material-Frische-Marke tickt nur bei laufender Aktion/Kampf) —
    // Seitenwechsel erzwingt den Remount; ein echter Spieler bekommt Items nur über Aktionen.
    await page.locator('[data-guide-id="sidebar.woodcutting"]').first().click();
    await page.waitForTimeout(400);
    await page.locator('[data-guide-id="sidebar.newhaven"]').first().click();
    await page.waitForSelector(".newhaven-page", { timeout: 8000 });
    await page.locator('[role="tab"]').nth(1).click();
    await page.waitForSelector(".nh-grid", { timeout: 8000 });
    await page.waitForTimeout(400);
    const sawCard = page.locator(".nh-card", { hasText: "Sawpit" }).first();
    await sawCard.locator(".nh-build-btn").click();
    await page.waitForTimeout(600);
    const sawJob = await st(h, (dbg) => ({ job: dbg.state.camp.buildJob, positions: dbg.state.camp.positions ?? dbg.state.camp.mapPositions ?? null }));
    log(`nach listen-bau sägegrube: ${JSON.stringify(sawJob).slice(0, 500)}`);
    await page.locator('[role="tab"]').nth(0).click();
    await page.waitForSelector(".nh-map", { timeout: 8000 });
    await page.waitForTimeout(500);
    await shot(h, "18-sawpit-from-list-on-map");

    // ── 13. Parallel-Versuch über KARTE (BuildMenu, während Sägegrube baut) ──
    const fishItem = page.locator(".nh-buildmenu-item", { hasText: "Fisher" }).first();
    const fishState = {
      disabled: await fishItem.isDisabled().catch(() => null),
      reason: await fishItem.locator(".nh-buildmenu-reason").textContent().catch(() => null),
    };
    log(`parallel-versuch fischerhütte@karte während bau: ${JSON.stringify(fishState)}`);
    await shot(h, "19-crew-busy-map");

    // Sägegrube fertigstellen
    await st(h, (dbg) => { dbg.state.camp.buildJob.remainingMs = 1500; });
    await page.waitForTimeout(3500);

    // ── 14. Drittes Gebäude über die KARTE (Fischerhütte): Ghost + Gates ────
    await page.waitForTimeout(500);
    const fishItem2 = page.locator(".nh-buildmenu-item", { hasText: "Fisher" }).first();
    await fishItem2.click();
    await page.waitForTimeout(400);
    // Gate: über dem Zentralhaus (overlap)
    const hallPos = await st(h, (dbg) => {
      const p = dbg.state.camp.positions ?? {};
      return p.camp_townhall ?? Object.values(p)[0] ?? null;
    });
    if (hallPos) {
      const hx = mapBox.x + mapBox.width * hallPos.x;
      const hy = mapBox.y + mapBox.height * hallPos.y;
      await page.mouse.move(hx, hy, { steps: 6 });
      await page.waitForTimeout(400);
      const overlapReason = await page.evaluate(() => document.querySelector(".nh-place-reason")?.textContent?.trim() ?? null);
      log(`ghost@überm-zentralhaus reason: ${JSON.stringify(overlapReason)}`);
      await shot(h, "20-ghost-overlap");
    }
    // frei platzieren (links)
    const fx = mapBox.x + mapBox.width * 0.28;
    const fy = mapBox.y + mapBox.height * 0.62;
    await page.mouse.move(fx, fy, { steps: 6 });
    await page.waitForTimeout(300);
    await page.mouse.click(fx, fy);
    await page.waitForTimeout(600);
    const fishJob = await st(h, (dbg) => dbg.state.camp.buildJob);
    log(`fischerhütte über karte platziert: ${JSON.stringify(fishJob)}`);
    await shot(h, "21-fisher-building");
    await st(h, (dbg) => { if (dbg.state.camp.buildJob) dbg.state.camp.buildJob.remainingMs = 1500; });
    await page.waitForTimeout(3500);
    await shot(h, "22-three-buildings");

    // ── 15. Boost fühlbar: Sägegrube → Woodcutting-Zeitkachel + Tooltip + Messung ──
    await page.locator('[data-guide-id="sidebar.woodcutting"]').first().click();
    await page.waitForSelector("#skillcard-cut_normal_tree", { timeout: 8000 });
    await page.waitForTimeout(600);
    const timeTile = await page.evaluate(() => {
      const el = document.getElementById("skillcard-cut_normal_tree");
      const tiles = [...el.querySelectorAll(".skillcard-tile")].map((t) => t.textContent?.trim());
      return tiles;
    });
    log(`wc zeit-kachel mit sägegrube: ${JSON.stringify(timeTile)} (soll: 2.8s → ~2.7s)`);
    // Hover auf Zeit-Kachel (3. Kachel im Gather-Zweig) → CampBoostNote-Tooltip
    const tileLoc = page.locator("#skillcard-cut_normal_tree .skillcard-tile").nth(2);
    await tileLoc.hover();
    await page.waitForTimeout(700);
    const tipInfo = await page.evaluate(() => {
      const note = document.querySelector(".camp-boost-note");
      if (!note) return { present: false };
      const img = note.querySelector("img.camp-boost-note-ico");
      return {
        present: true,
        text: note.textContent?.trim(),
        emblem: img ? img.complete && img.naturalWidth > 0 : false,
      };
    });
    log(`"Aus New Haven"-tooltip@wc-zeitkachel: ${JSON.stringify(tipInfo)}`);
    await shot(h, "23-boost-tooltip");
    // Reale Dauer messen: ∞ Normalbaum, Intervalle über 35s pollen
    await page.locator("#skillcard-cut_normal_tree .skillcard-cta.qty.all").click();
    const intervals = [];
    let lastCount = await st(h, (dbg) =>
      dbg.state.inventory.slots.filter((s) => s && s.itemId === "normal_log").reduce((a, s) => a + s.qty, 0),
    );
    let lastTs = Date.now();
    const measureEnd = Date.now() + 35000;
    while (Date.now() < measureEnd) {
      await page.waitForTimeout(180);
      const c = await st(h, (dbg) =>
        dbg.state.inventory.slots.filter((s) => s && s.itemId === "normal_log").reduce((a, s) => a + s.qty, 0),
      );
      if (c > lastCount) {
        const now = Date.now();
        intervals.push((now - lastTs) / (c - lastCount));
        lastCount = c;
        lastTs = now;
      }
    }
    intervals.sort((a, b) => a - b);
    const median = intervals[Math.floor(intervals.length / 2)] ?? -1;
    log(`reale aktionsdauer normalbaum mit sägegrube-I: median=${Math.round(median)}ms über ${intervals.length} aktionen (soll 2800×0.95=2660ms)`);
    const stopBtn2 = page.locator(".skillcard-cta.stop").first();
    if ((await stopBtn2.count()) > 0) await stopBtn2.click();

    // Fischerei-Zeitkachel (Fischerhütte-Boost)
    await page.locator('[data-guide-id="sidebar.fishing"]').first().click();
    await page.waitForTimeout(800);
    const fishTiles = await page.evaluate(() => {
      const el = document.querySelector('[id^="skillcard-"]');
      return el ? [...el.querySelectorAll(".skillcard-tile")].map((t) => t.textContent?.trim()) : null;
    });
    log(`fishing erste karte kacheln (fischerhütte-boost): ${JSON.stringify(fishTiles)}`);
    await shot(h, "24-fishing-boost");

    // ── 16. Popup, Move-Modus, Tag/Nacht-Debug ──────────────────────────────
    await page.locator('[data-guide-id="sidebar.newhaven"]').first().click();
    await page.waitForSelector(".nh-map", { timeout: 8000 });
    await page.waitForTimeout(600);
    // Popup: Zentralhaus-Kachel klicken
    await page.locator(".nh-map-tile").first().click();
    await page.waitForSelector(".nh-popup", { timeout: 6000 });
    await page.waitForTimeout(400);
    await shot(h, "25-building-popup");
    await scanKeyLeaks(page, "popup-en");
    const popupInfo = await page.evaluate(() => ({
      move: !!document.querySelector(".nh-move-btn"),
      demolish: !!document.querySelector(".nh-demolish-btn"),
      name: document.querySelector(".nh-popup .nh-card-name")?.textContent?.trim(),
    }));
    log(`popup: ${JSON.stringify(popupInfo)}`);
    await page.locator(".nh-popup-close").click();
    await page.waitForTimeout(300);

    // Move-Modus
    await page.locator(".nh-move-toggle").click();
    await page.waitForTimeout(400);
    const posBefore = await st(h, (dbg) => JSON.parse(JSON.stringify(dbg.state.camp.positions ?? {})));
    const tile = page.locator(".nh-map-tile").first();
    const tb = await tile.boundingBox();
    await page.mouse.move(tb.x + tb.width / 2, tb.y + tb.height / 2);
    await page.mouse.down();
    await page.mouse.move(tb.x + tb.width / 2 + 150, tb.y + tb.height / 2 - 60, { steps: 10 });
    await page.waitForTimeout(300);
    await shot(h, "26-move-drag");
    await page.mouse.up();
    await page.waitForTimeout(500);
    const posAfter = await st(h, (dbg) => JSON.parse(JSON.stringify(dbg.state.camp.positions ?? {})));
    log(`move: positionen vorher=${JSON.stringify(posBefore)} nachher=${JSON.stringify(posAfter)}`);
    await shot(h, "27-move-tools");
    await page.locator(".nh-move-toggle").click(); // Move aus
    await page.waitForTimeout(300);

    // Tag/Nacht-Debug
    const phaseBefore = await page.evaluate(() => document.querySelector(".nh-map")?.getAttribute("data-light-phase"));
    await page.locator(".nh-debug-light").click();
    await page.waitForTimeout(600);
    const phaseAfter = await page.evaluate(() => document.querySelector(".nh-map")?.getAttribute("data-light-phase"));
    log(`tag/nacht-debug: ${phaseBefore} -> ${phaseAfter}`);
    await shot(h, "28-light-toggled");
    await page.locator(".nh-debug-light").click();
    await page.waitForTimeout(400);

    log(`pageErrors gesamt: ${h.errors.length}`);
    if (h.errors.length) log("PAGEERRORS:\n" + h.errors.slice(0, 20).join("\n---\n"));
  } catch (err) {
    log(`ABBRUCH: ${err.message}`);
    await shot(h, "99-crash").catch(() => {});
    log(`pageErrors: ${h.errors.length}: ${h.errors.slice(0, 10).join(" | ")}`);
    log(`SERVER-OUTPUT (letzte 2000 Zeichen):\n${(h.getServerOutput?.() ?? "").slice(-2000)}`);
  } finally {
    writeFileSync(join(OUT, "findings.txt"), findings.join("\n"), "utf8");
    console.log(`\nDURATION: ${Math.round((Date.now() - t0) / 1000)}s`);
    console.log(`FINDINGS: ${join(OUT, "findings.txt")}`);
    await h.stop();
  }
};

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
