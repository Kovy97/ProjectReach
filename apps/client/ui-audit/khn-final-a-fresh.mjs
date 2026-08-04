#!/usr/bin/env node
/**
 * khn-final-a-fresh.mjs — Finale NH-Generalprüfung (Kontrolleur, 2026-08-03), Lauf A:
 * Frischer Charakter, komplette New-Haven-Strecke (Prüfstrecke 1-8), EN, 1920×1080, Port 5348.
 *
 * Eigenes Skript statt bot.mjs (Präzedenz nh-bot1-fresh.mjs): braucht page.reload()
 * (Persistenz/Offline), Hover (Tooltips/Labels), Ghost-Platzierung, localStorage-savedAt-Patch.
 * Transparenz: Zentralhaus-Material wird per dokumentiertem State-Patch gestellt (echter Grind
 * dauert Stunden); spätere Gebäude via DEV-Debug-Gratis (laut Auftrag erlaubt). Bau-Abschlüsse
 * laufen über den REGULÄREN Tick (remainingMs minimal gepatcht), NIE über den Debug-Fertig-Button.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { startHarness } from "./sim-harness.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "bot-runs", "khn-final-a-fresh");
mkdirSync(OUT, { recursive: true });

const findings = [];
const log = (msg) => { console.log(msg); findings.push(msg); };

const KEY_LEAK_RE = /(?:^|[\s>(])((?:newhaven|menu|creation|skill|nav|common|queue|offline|char|combat|bank|shop|onboarding)\.[a-z][a-zA-Z0-9]*(?:\.[a-zA-Z0-9]+)+)/g;
async function scanKeyLeaks(page, station) {
  const text = await page.evaluate(() => document.body.innerText);
  const hits = new Set();
  let m;
  while ((m = KEY_LEAK_RE.exec(text)) !== null) hits.add(m[1]);
  if (hits.size > 0) log(`KEYLEAK @${station}: ${[...hits].join(", ")}`);
  else log(`keyleak @${station}: sauber`);
}

async function st(h, fn) {
  return h.page.evaluate((src) => {
    const f = new Function("dbg", `return (${src})(dbg);`);
    return f(window.__hfDebug);
  }, fn.toString());
}

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
  await h.page.evaluate(([fnSrc, its]) => {
    const fn = new Function("dbg", "items", `return (${fnSrc})(dbg, items);`);
    fn(window.__hfDebug, its);
  }, [giveItemsFn.toString(), items]);
}

async function skipGuides(page) {
  for (let i = 0; i < 5; i++) {
    const skip = page.locator(".guide-bubble-skip").first();
    if ((await skip.count()) === 0) break;
    await skip.click({ timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(700);
  }
}

/** Rasterplätze wie shared campLayoutSlots (AREA 0.22..0.7 / 0.26..0.68, 5×3, 4 Dezimalen). */
function layoutSlots() {
  const slots = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) {
    slots.push({ x: Math.round((0.22 + c * 0.12) * 1e4) / 1e4, y: Math.round((0.26 + r * 0.21) * 1e4) / 1e4 });
  }
  return slots;
}
/** Erster freier Slot nach Zellen-Semantik (CLAIM halfW=0.06 halfH=0.105, Punkt-Test). */
function firstFreeSlot(taken) {
  for (const s of layoutSlots()) {
    let free = true;
    for (const t of taken) {
      if (Math.abs(s.x - t.x) < 0.06 - 1e-9 && Math.abs(s.y - t.y) < 0.105 - 1e-9) { free = false; break; }
    }
    if (free) return s;
  }
  return null;
}

async function gotoNH(page) {
  await page.locator('[data-guide-id="sidebar.newhaven"]').first().click();
  await page.waitForSelector(".newhaven-page", { timeout: 8000 });
  await page.waitForTimeout(400);
}
async function toMap(page) {
  await page.locator('[role="tab"]').nth(0).click();
  await page.waitForSelector(".nh-map", { timeout: 8000 });
  await page.waitForTimeout(300);
}
async function toList(page) {
  await page.locator('[role="tab"]').nth(1).click();
  await page.waitForSelector(".nh-grid", { timeout: 8000 });
  await page.waitForTimeout(300);
}

/** Nach Menü-Reload: Slot laden, Offline-Popup-Infos einsammeln, Guides skippen. */
async function reloadAndLoadSlot(h, page, tag, patchSavedAtMs) {
  await page.reload();
  await page.waitForTimeout(2200);
  if (patchSavedAtMs) {
    const patched = await page.evaluate((deltaMs) => {
      const key = "hearthforge:save:0";
      const raw = localStorage.getItem(key);
      if (!raw) return { ok: false, why: "kein hearthforge:save:0" };
      const save = JSON.parse(raw);
      const before = save.savedAt;
      save.savedAt = before - deltaMs;
      if (save.summary && typeof save.summary.savedAt === "number") save.summary.savedAt -= deltaMs;
      localStorage.setItem(key, JSON.stringify(save));
      return { ok: true, before, after: save.savedAt };
    }, patchSavedAtMs);
    log(`savedAt-patch @${tag}: ${JSON.stringify(patched)}`);
  }
  await page.keyboard.press("Escape");
  await page.mouse.click(960, 900);
  await page.getByText("Load Game", { exact: true }).first().waitFor({ timeout: 20000 });
  await page.waitForTimeout(1200);
  await page.getByText("Load Game", { exact: true }).first().click();
  await page.waitForSelector(".menu-slot.filled", { timeout: 8000 });
  await page.locator(".menu-slot.filled").first().click();
  await h.waitForDebugHook(15000);
  await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
  await page.waitForTimeout(1200);
  const ofs = page.locator(".ofs-collect");
  let offline = null;
  if ((await ofs.count()) > 0) {
    offline = await page.evaluate(() => document.querySelector(".ofs-panel, .offline-popup, [class*='ofs']")?.textContent?.trim()?.slice(0, 600) ?? null);
    await h.shot(`${tag}-offline-popup`);
    await ofs.click();
    await page.waitForTimeout(500);
  }
  await skipGuides(page);
  return offline;
}

const main = async () => {
  const h = await startHarness({
    port: 5348, fixture: null, locale: "en", requireDebugHook: false,
    outDir: OUT, viewport: { width: 1920, height: 1080 },
  });
  const { page } = h;
  const t0 = Date.now();

  try {
    // ═══ Strecke 1: Frischer Charakter ═══════════════════════════════════════
    await page.waitForTimeout(1500);
    await page.keyboard.press("Escape");
    await page.mouse.click(960, 900);
    await page.getByText("New Game", { exact: true }).first().waitFor({ timeout: 20000 });
    await page.waitForTimeout(1300);
    await page.getByText("New Game", { exact: true }).first().click();
    await page.waitForSelector(".menu-slot", { timeout: 8000 });
    await page.locator(".menu-slot--empty .hf-btn--primary").first().click();
    await page.waitForSelector(".creation-input", { timeout: 8000 });
    await page.locator(".creation-input").fill("Kontrolleur");
    await page.locator(".creation-style-card").nth(0).click();
    await page.locator(".creation-start").click();
    await h.waitForDebugHook(15000);
    await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
    await page.waitForTimeout(1500);
    await skipGuides(page);

    const nhNav = page.locator('[data-guide-id="sidebar.newhaven"]');
    const iconInfo = await page.evaluate(() => {
      const el = document.querySelector('[data-guide-id="sidebar.newhaven"]');
      if (!el) return null;
      const img = el.querySelector("img");
      return { text: el.textContent?.trim(), hasImg: !!img, imgLoaded: img ? img.complete && img.naturalWidth > 0 : false };
    });
    log(`S1 sidebar-eintrag: ${JSON.stringify(iconInfo)}`);

    await gotoNH(page);
    await h.shot("s1-fresh-map");
    await scanKeyLeaks(page, "s1-map");
    log(`S1 karte-leer-hinweis: ${(await page.locator(".nh-map-empty-hint").count()) > 0}`);
    log(`S1 kapazitätspille: ${JSON.stringify(await page.locator(".nh-capacity").textContent().catch(() => null))}`);
    // Debug-Buttons im Vite-Dev sichtbar = erwartet (Bundle-Beweis liegt separat)
    log(`S1 debug-buttons (DEV, erwartet 3): gratis=${await page.locator(".nh-debug-toggle").count()} fertig=${await page.locator(".nh-debug-complete").count()} licht=${await page.locator(".nh-debug-light").count()}`);

    // BuildMenu: Zustände + Kosten-Chips + Reason-Zeilen
    const bmenu = await page.evaluate(() => {
      const items = [...document.querySelectorAll(".nh-buildmenu-item")];
      return items.map((el) => ({
        name: el.querySelector(".nh-buildmenu-name")?.textContent?.trim(),
        disabled: el.disabled,
        reason: el.querySelector(".nh-buildmenu-reason")?.textContent?.trim() ?? null,
        costs: [...el.querySelectorAll(".nh-buildmenu-cost")].map((c) => c.textContent?.trim()),
      }));
    });
    log(`S1 buildmenu (${bmenu.length} einträge): ${JSON.stringify(bmenu.slice(0, 5))}`);
    const badReasons = bmenu.slice(1).filter((b) => !b.reason);
    log(`S1 nicht-zentralhaus ohne reason-zeile: ${badReasons.length === 0 ? "keine (gut)" : JSON.stringify(badReasons.map((b) => b.name))}`);
    // Tooltip-Probe an BuildMenu-Chip (Erstkontakt Kartenansicht!)
    const bmChip = page.locator(".nh-buildmenu-item").first().locator(".nh-buildmenu-cost").nth(1);
    if ((await bmChip.count()) > 0) {
      await bmChip.hover().catch(() => {});
      await page.waitForTimeout(700);
      const tipCount = await page.locator(".ct-tip").count();
      const tipText = tipCount ? await page.locator(".ct-tip").first().textContent() : null;
      log(`S1 tooltip@buildmenu-chip (Kartenansicht): count=${tipCount} text=${JSON.stringify(tipText)}`);
      await h.shot("s1-buildmenu-chip-hover");
    }
    // Tooltip-Probe an Listen-Karten-Chip (Release-Fix 2)
    await toList(page);
    await h.shot("s1-fresh-list");
    await scanKeyLeaks(page, "s1-list");
    const hallCard = await page.evaluate(() => {
      const card = [...document.querySelectorAll(".nh-card")][0];
      if (!card) return null;
      return {
        name: card.querySelector(".nh-card-name")?.textContent?.trim(),
        gold: card.querySelector(".nh-cost-gold")?.textContent?.trim(),
        mats: [...card.querySelectorAll(".nh-mats .mat-chip")].map((c) => c.textContent?.trim()),
        btnDisabled: card.querySelector(".nh-build-btn")?.disabled ?? null,
        blocked: card.querySelector(".nh-blocked")?.textContent?.trim() ?? null,
      };
    });
    log(`S1 zentralhaus-listenkarte: ${JSON.stringify(hallCard)}`);
    const otherBlocked = await page.evaluate(() => {
      const cards = [...document.querySelectorAll(".nh-card")].slice(1, 4);
      return cards.map((c) => ({ name: c.querySelector(".nh-card-name")?.textContent?.trim(), blocked: c.querySelector(".nh-blocked")?.textContent?.trim() ?? null }));
    });
    log(`S1 andere karten reason (soll townhall_first): ${JSON.stringify(otherBlocked)}`);
    const listChip = page.locator(".nh-card").first().locator(".nh-mats .mat-chip").first();
    await listChip.hover();
    await page.waitForTimeout(700);
    const listTip = await page.evaluate(() => {
      const tip = document.querySelector(".ct-tip");
      if (!tip) return { present: false };
      return { present: true, title: tip.querySelector(".ct-tip-title")?.textContent?.trim() ?? null, desc: tip.querySelector(".ct-tip-desc")?.textContent?.trim() ?? null };
    });
    log(`S1 tooltip@listen-chip (soll Titel+Beschreibung): ${JSON.stringify(listTip)}`);
    await h.shot("s1-list-chip-tooltip");

    // ═══ Strecke 2: Bau-Loop Zentralhaus über Karte ═══════════════════════════
    // Material-Patch (dokumentiert): Stufe-I-Kosten des Zentralhauses aus dem Katalog decken.
    const hallCost = await st(h, (dbg) => {
      const hall = (dbg.content.campBuildings ?? []).find((b) => b.id === "camp_townhall");
      return hall ? { gold: hall.levels[0].gold, items: hall.levels[0].items } : null;
    });
    log(`S2 zentralhaus-I-kosten lt. katalog: ${JSON.stringify(hallCost)}`);
    await st(h, (dbg) => { dbg.state.character.gold += 100000; });
    await give(h, hallCost.items.map((c) => [c.itemId, c.qty + 5]));
    log(`PATCH: +100000 gold, zentralhaus-material (+5 reserve je item)`);
    // Remount für frische Bestandsanzeige
    await page.locator('[data-guide-id="sidebar.character"], [data-guide-id="sidebar.woodcutting"]').first().click();
    await page.waitForTimeout(300);
    await gotoNH(page);
    await toMap(page);

    const hallItem = page.locator(".nh-buildmenu-item").first();
    log(`S2 buildmenu zentralhaus disabled=${await hallItem.isDisabled()} (soll false)`);
    await hallItem.click();
    await page.waitForTimeout(400);
    const mapBox = await page.locator(".nh-map").boundingBox();
    const cx = mapBox.x + mapBox.width * 0.5, cy = mapBox.y + mapBox.height * 0.55;
    await page.mouse.move(cx, cy, { steps: 8 });
    await page.waitForTimeout(400);
    const ghostMid = await page.evaluate(() => ({
      valid: !!document.querySelector(".nh-map-ghost--valid"),
      reason: document.querySelector(".nh-place-reason")?.textContent?.trim() ?? null,
    }));
    log(`S2 ghost@mitte: ${JSON.stringify(ghostMid)} (soll valid, keine reason)`);
    await h.shot("s2-ghost-mid");
    await page.mouse.move(mapBox.x + 4, mapBox.y + 4, { steps: 5 });
    await page.waitForTimeout(400);
    const ghostEdge = await page.evaluate(() => ({
      invalid: !!document.querySelector(".nh-map-ghost--invalid"),
      reason: document.querySelector(".nh-place-reason")?.textContent?.trim() ?? null,
    }));
    log(`S2 ghost@rand: ${JSON.stringify(ghostEdge)} (soll invalid + out_of_bounds-text)`);
    await h.shot("s2-ghost-edge");
    await page.mouse.move(cx, cy, { steps: 8 });
    await page.waitForTimeout(300);
    await page.mouse.click(cx, cy);
    await page.waitForTimeout(600);
    const job1 = await st(h, (dbg) => dbg.state.camp?.buildJob ?? null);
    log(`S2 job nach platzierung: ${JSON.stringify(job1)}`);
    if (!job1) throw new Error("Zentralhaus-Bau nicht gestartet");
    await h.shot("s2-hall-building");

    // Tick-Messung 10 s vs Wanduhr
    const r1 = await st(h, (dbg) => dbg.state.camp.buildJob?.remainingMs ?? -1);
    const w1 = Date.now();
    await page.waitForTimeout(10000);
    const r2 = await st(h, (dbg) => dbg.state.camp.buildJob?.remainingMs ?? -1);
    const wall = Date.now() - w1;
    log(`S2 tick-messung: remaining ${r1}→${r2}, delta=${r1 - r2}ms bei wall=${wall}ms (soll ≈ wall)`);

    // Reload mitten im Bau (Autosave-Fenster abwarten)
    await page.waitForTimeout(9000);
    const beforeReload = await st(h, (dbg) => dbg.state.camp.buildJob?.remainingMs ?? -1);
    const wallBefore = Date.now();
    await reloadAndLoadSlot(h, page, "s2-midbuild");
    const afterReload = await st(h, (dbg) => dbg.state.camp?.buildJob?.remainingMs ?? -999);
    const wallDelta = Date.now() - wallBefore;
    log(`S2 reload@midbuild: vor=${beforeReload} nach=${afterReload} wall=${wallDelta}ms (soll: nach ≈ vor − wall ± autosave-fenster)`);
    if (afterReload === -999) log("BEFUND S2: buildJob nach Reload WEG");
    if (afterReload > beforeReload) log("BEFUND S2: remainingMs nach Reload GRÖSSER (Offline zählt nicht)");

    // Abschluss über REGULÄREN Tick + Toast (Debug-Fertig bewusst NICHT benutzt)
    await gotoNH(page);
    await st(h, (dbg) => { dbg.state.camp.buildJob.remainingMs = 2500; });
    let toastSeen = null;
    for (let i = 0; i < 16; i++) {
      await page.waitForTimeout(500);
      const t = await page.evaluate(() => document.querySelector(".toast-stack")?.textContent?.trim() || null);
      if (t) { toastSeen = t; break; }
    }
    log(`S2 bau-fertig-toast: ${JSON.stringify(toastSeen)} (soll "The work crew reports … complete")`);
    await h.shot("s2-hall-done-toast");
    const s2state = await st(h, (dbg) => ({ hall: dbg.state.camp.buildings?.camp_townhall, job: dbg.state.camp.buildJob }));
    log(`S2 nach abschluss: ${JSON.stringify(s2state)}`);
    log(`S2 kapazitätspille: ${JSON.stringify(await page.locator(".nh-capacity").textContent().catch(() => null))}`);

    // ═══ Strecke 3: Listen-Bau → Rasterplatz Lichtungsmitte ═══════════════════
    // Debug-Gratis für Tempo (DEV, laut Auftrag erlaubt)
    await page.locator(".nh-debug-toggle").click();
    await page.waitForTimeout(300);
    await toList(page);
    const sawCard = page.locator(".nh-card", { hasText: "Sawpit" }).first();
    await sawCard.locator(".nh-build-btn").click();
    await page.waitForTimeout(600);
    const sawInfo = await st(h, (dbg) => ({ job: dbg.state.camp.buildJob, pos: dbg.state.camp.positions?.camp_sawpit ?? null, positions: dbg.state.camp.positions }));
    log(`S3 sawpit aus liste: ${JSON.stringify(sawInfo)}`);
    const taken = Object.entries(sawInfo.positions || {}).filter(([id]) => id !== "camp_sawpit").map(([, p]) => p);
    const expected = firstFreeSlot(taken);
    const slotOk = sawInfo.pos && expected && Math.abs(sawInfo.pos.x - expected.x) < 1e-6 && Math.abs(sawInfo.pos.y - expected.y) < 1e-6;
    log(`S3 rasterplatz-soll=${JSON.stringify(expected)} ist=${JSON.stringify(sawInfo.pos)} → ${slotOk ? "EXAKT (Lichtungsmitte)" : "ABWEICHUNG!"}`);
    const inClearing = sawInfo.pos && sawInfo.pos.x >= 0.22 - 1e-6 && sawInfo.pos.x <= 0.7 + 1e-6 && sawInfo.pos.y >= 0.26 - 1e-6 && sawInfo.pos.y <= 0.68 + 1e-6;
    log(`S3 in lichtungs-area (0.22..0.7 / 0.26..0.68): ${inClearing}`);
    await toMap(page);
    await h.shot("s3-sawpit-autoslot-map");
    await st(h, (dbg) => { if (dbg.state.camp.buildJob) dbg.state.camp.buildJob.remainingMs = 1200; });
    await page.waitForTimeout(3000);

    // Drittes per Karte daneben (Fischerhütte)
    const fishItem = page.locator(".nh-buildmenu-item", { hasText: "Fisher" }).first();
    await fishItem.click();
    await page.waitForTimeout(400);
    const fx = mapBox.x + mapBox.width * 0.34, fy = mapBox.y + mapBox.height * 0.62;
    await page.mouse.move(fx, fy, { steps: 6 });
    await page.waitForTimeout(300);
    await page.mouse.click(fx, fy);
    await page.waitForTimeout(600);
    const fishJob = await st(h, (dbg) => dbg.state.camp.buildJob);
    log(`S3 fischerhütte per karte: ${JSON.stringify(fishJob)}`);
    await st(h, (dbg) => { if (dbg.state.camp.buildJob) dbg.state.camp.buildJob.remainingMs = 1200; });
    await page.waitForTimeout(3000);
    await h.shot("s3-three-buildings");

    // ═══ Strecke 8a: Schreibzelt bauen → Speednote am nächsten Bau ════════════
    await toList(page);
    const scrivCard = page.locator(".nh-card", { hasText: "Scrivener" }).first();
    await scrivCard.locator(".nh-build-btn").click();
    await page.waitForTimeout(500);
    await st(h, (dbg) => { if (dbg.state.camp.buildJob) dbg.state.camp.buildJob.remainingMs = 1200; });
    await page.waitForTimeout(3000);
    log(`S8 schreibzelt: ${JSON.stringify(await st(h, (dbg) => dbg.state.camp.buildings?.camp_scrivener_tent))}`);
    // Smelter als 4. Gebäude — Bau läuft → speednote muss sichtbar sein
    const smeltCard = page.locator(".nh-card", { hasText: "Smelter" }).first();
    await smeltCard.locator(".nh-build-btn").click();
    await page.waitForTimeout(800);
    const speednote = await page.evaluate(() => {
      const note = document.querySelector(".nh-progress-speednote .camp-boost-note");
      if (!note) return { present: false };
      const img = note.querySelector("img.camp-boost-note-ico");
      return { present: true, text: note.textContent?.trim(), emblem: img ? img.complete && img.naturalWidth > 0 : false };
    });
    log(`S8 bautrupp-speednote@smelter-bau (schreibzelt I): ${JSON.stringify(speednote)}`);
    await h.shot("s8-speednote");
    await st(h, (dbg) => { if (dbg.state.camp.buildJob) dbg.state.camp.buildJob.remainingMs = 1200; });
    await page.waitForTimeout(3000);

    // ═══ Strecke 5: Kapazität voll → 5. Gebäude reason mit Zahlen ═════════════
    const cap = await st(h, (dbg) => ({ buildings: dbg.state.camp.buildings, job: dbg.state.camp.buildJob }));
    log(`S5 bestand: ${JSON.stringify(cap)}`);
    log(`S5 kapazitätspille: ${JSON.stringify(await page.locator(".nh-capacity").textContent().catch(() => null))}`);
    const fifth = await page.evaluate(() => {
      const cards = [...document.querySelectorAll(".nh-card")];
      const c = cards.find((x) => x.querySelector(".nh-build-btn") && x.querySelector(".nh-build-btn").disabled && x.querySelector(".nh-blocked"));
      if (!c) return null;
      return { name: c.querySelector(".nh-card-name")?.textContent?.trim(), blocked: c.querySelector(".nh-blocked")?.textContent?.trim() };
    });
    log(`S5 fünftes gebäude reason: ${JSON.stringify(fifth)} (soll kapazitäts-text mit {used}/{total}-Zahlen)`);
    await h.shot("s5-capacity-full");
    await scanKeyLeaks(page, "s5-list");

    // ═══ Strecke 6: Veredelung ════════════════════════════════════════════════
    await st(h, (dbg) => { dbg.state.skills.smithing = { xp: 500000 }; });
    await give(h, [["iron_ore", 300], ["coal", 300]]);
    log("PATCH: smithing-xp=500000, +300 iron_ore, +300 coal");
    await page.locator('[data-guide-id="sidebar.character"], [data-guide-id="sidebar.woodcutting"]').first().click();
    await page.waitForTimeout(300);
    await gotoNH(page);
    await toList(page);
    const smCard = page.locator(".nh-card", { hasText: "Smelter" }).first();
    await smCard.locator(".nh-refine-btn").first().click();
    await page.waitForTimeout(500);
    const recipes = await page.evaluate(() => [...document.querySelectorAll(".nh-recipe-row .nh-recipe-name")].map((e) => e.textContent?.trim()));
    log(`S6 rezeptliste: ${JSON.stringify(recipes)}`);
    const ironRow = page.locator(".nh-recipe-row", { hasText: "Smelt Iron" }).first();
    await ironRow.click();
    await page.waitForTimeout(500);
    const slot0 = await st(h, (dbg) => dbg.state.camp.refine?.camp_smelter ?? null);
    log(`S6 refine-slot nach wahl: ${JSON.stringify(slot0)}`);
    await h.shot("s6-recipe-set");
    // Tickt pro Tick: accMs 5 s beobachten
    const a1 = await st(h, (dbg) => dbg.state.camp.refine.camp_smelter.accMs);
    const aw1 = Date.now();
    await page.waitForTimeout(5000);
    const a2 = await st(h, (dbg) => dbg.state.camp.refine.camp_smelter.accMs);
    log(`S6 accMs-tick: ${a1}→${a2} delta=${a2 - a1}ms bei wall=${Date.now() - aw1}ms (soll ≈ wall)`);
    const rateI = await st(h, (dbg) => {
      const d = (dbg.content.campBuildings ?? []).find((b) => b.id === "camp_smelter");
      return d?.levels[0]?.boost ?? null;
    });
    log(`S6 smelter-I-rate lt. katalog: ${JSON.stringify(rateI)}`);

    // Offline-Sprung: Autosave abwarten, reload mit savedAt −2h
    await page.waitForTimeout(17000);
    const beforeOff = await st(h, (dbg) => ({ produced: dbg.state.camp.refine.camp_smelter.produced, accMs: dbg.state.camp.refine.camp_smelter.accMs, bars: dbg.state.inventory.slots.filter((s) => s && s.itemId === "iron_bar").reduce((a, s) => a + s.qty, 0), ore: dbg.state.inventory.slots.filter((s) => s && s.itemId === "iron_ore").reduce((a, s) => a + s.qty, 0) }));
    log(`S6 vor offline: ${JSON.stringify(beforeOff)}`);
    const offlineText = await reloadAndLoadSlot(h, page, "s6-offline", 2 * 3600 * 1000);
    log(`S6 offline-popup: ${JSON.stringify(offlineText)}`);
    const afterOff = await st(h, (dbg) => ({ produced: dbg.state.camp.refine.camp_smelter.produced, accMs: dbg.state.camp.refine.camp_smelter.accMs, bars: dbg.state.inventory.slots.filter((s) => s && s.itemId === "iron_bar").reduce((a, s) => a + s.qty, 0), ore: dbg.state.inventory.slots.filter((s) => s && s.itemId === "iron_ore").reduce((a, s) => a + s.qty, 0), bankBars: (dbg.state.bank?.slots ?? []).filter((s) => s && s.itemId === "iron_bar").reduce((a, s) => a + s.qty, 0) }));
    log(`S6 nach offline (2h, rate ${JSON.stringify(rateI?.value)}/h → soll +${Math.floor(2 * (rateI?.value ?? 0))} produziert): ${JSON.stringify(afterOff)}`);

    // waitingForInput-Zeile: Inputs entziehen
    await st(h, (dbg) => {
      for (const s of dbg.state.inventory.slots) { if (s && (s.itemId === "iron_ore" || s.itemId === "coal")) s.qty = 0; }
      if (dbg.state.bank?.slots) for (const s of dbg.state.bank.slots) { if (s && (s.itemId === "iron_ore" || s.itemId === "coal")) s.qty = 0; }
    });
    await gotoNH(page);
    await toList(page);
    await page.waitForTimeout(500);
    const stalled = await page.evaluate(() => document.querySelector(".nh-refine-stalled")?.textContent?.trim() ?? null);
    log(`S6 waitingForInput-zeile ohne zutaten: ${JSON.stringify(stalled)}`);
    await h.shot("s6-refine-stalled");

    // ═══ Strecke 4: Move/Scale/Flip/Reset + Label-Sichtbarkeit + Persistenz ═══
    await toMap(page);
    // Labels: default unsichtbar, bei Hover sichtbar
    const labelDefault = await page.evaluate(() => {
      const l = document.querySelector(".nh-map-tile-label");
      return l ? getComputedStyle(l).opacity : null;
    });
    const tile0 = page.locator(".nh-map-tile").first();
    await tile0.hover();
    await page.waitForTimeout(400);
    const labelHover = await page.evaluate(() => {
      const tiles = [...document.querySelectorAll(".nh-map-tile")];
      const hovered = tiles.find((t) => t.matches(":hover"));
      return hovered ? getComputedStyle(hovered.querySelector(".nh-map-tile-label")).opacity : null;
    });
    log(`S4 label opacity: default=${labelDefault} (soll 0), hover=${labelHover} (soll 1)`);
    await h.shot("s4-label-hover");
    // Move-Modus: alle Labels an
    await page.mouse.move(mapBox.x - 50, mapBox.y + 200).catch(() => {});
    await page.locator(".nh-move-toggle").click();
    await page.waitForTimeout(400);
    const labelsMove = await page.evaluate(() => [...document.querySelectorAll(".nh-map-tile-label")].map((l) => getComputedStyle(l).opacity));
    log(`S4 labels im move-modus: ${JSON.stringify(labelsMove)} (alle 1)`);
    await h.shot("s4-move-mode-labels");
    // Drag Sawpit
    const posBefore = await st(h, (dbg) => JSON.parse(JSON.stringify(dbg.state.camp.positions)));
    const sawTile = page.locator(".nh-map-tile").nth(1);
    const tb = await sawTile.boundingBox();
    await page.mouse.move(tb.x + tb.width / 2, tb.y + tb.height / 2);
    await page.mouse.down();
    await page.mouse.move(tb.x + tb.width / 2 + 140, tb.y + tb.height / 2 + 40, { steps: 10 });
    await page.waitForTimeout(300);
    await page.mouse.up();
    await page.waitForTimeout(500);
    const posAfter = await st(h, (dbg) => JSON.parse(JSON.stringify(dbg.state.camp.positions)));
    log(`S4 drag: vorher=${JSON.stringify(posBefore)} nachher=${JSON.stringify(posAfter)}`);
    // Auswahl + Scale 250 % + Flip
    await sawTile.click().catch(() => {});
    await page.waitForTimeout(400);
    let toolsOpen = (await page.locator(".nh-map-object-tools").count()) > 0;
    if (!toolsOpen) { await page.locator(".nh-map-tile").nth(1).click(); await page.waitForTimeout(400); toolsOpen = (await page.locator(".nh-map-object-tools").count()) > 0; }
    log(`S4 objekt-tools offen: ${toolsOpen}`);
    if (toolsOpen) {
      await page.locator(".nh-map-object-tools-slider").fill("250");
      await page.waitForTimeout(300);
      const flipBtn = page.locator(".nh-map-object-tools-foot button").first();
      await flipBtn.click();
      await page.waitForTimeout(300);
      const vis1 = await st(h, (dbg) => dbg.state.camp.mapVisuals ?? null);
      log(`S4 nach scale250+flip: ${JSON.stringify(vis1)}`);
      await h.shot("s4-scale250-flip");
      // Reset
      const resetBtn = page.locator(".nh-map-object-tools-foot button").nth(1);
      await resetBtn.click();
      await page.waitForTimeout(300);
      const vis2 = await st(h, (dbg) => dbg.state.camp.mapVisuals ?? null);
      log(`S4 nach reset: ${JSON.stringify(vis2)} (eintrag soll weg/default sein)`);
      // Wieder 250+flip setzen für den Persistenz-Test
      await page.locator(".nh-map-object-tools-slider").fill("250");
      await flipBtn.click();
      await page.waitForTimeout(300);
    }
    await page.locator(".nh-move-toggle").click();
    await page.waitForTimeout(300);
    // Persistenz über Reload (Autosave abwarten)
    await page.waitForTimeout(17000);
    const visBefore = await st(h, (dbg) => ({ visuals: dbg.state.camp.mapVisuals ?? null, positions: dbg.state.camp.positions }));
    await reloadAndLoadSlot(h, page, "s4-persist");
    const visAfter = await st(h, (dbg) => ({ visuals: dbg.state.camp.mapVisuals ?? null, positions: dbg.state.camp.positions }));
    const persistOk = JSON.stringify(visBefore) === JSON.stringify(visAfter);
    log(`S4 persistenz reload: ${persistOk ? "IDENTISCH" : `ABWEICHUNG vor=${JSON.stringify(visBefore)} nach=${JSON.stringify(visAfter)}`}`);
    await gotoNH(page);
    await toMap(page);
    await h.shot("s4-after-reload");

    // ═══ Strecke 8b: Fischerhütte-Boost am Skill-Karten-Tooltip ═══════════════
    await page.locator('[data-guide-id="sidebar.fishing"]').first().click();
    await page.waitForSelector('[id^="skillcard-"]', { timeout: 8000 });
    await page.waitForTimeout(600);
    const timeTile = page.locator('[id^="skillcard-"]').first().locator(".skillcard-tile").nth(2);
    await timeTile.hover();
    await page.waitForTimeout(700);
    const boostTip = await page.evaluate(() => {
      const note = document.querySelector(".ct-tip .camp-boost-note") || document.querySelector(".camp-boost-note");
      if (!note) return { present: false };
      const img = note.querySelector("img.camp-boost-note-ico");
      return { present: true, text: note.textContent?.trim(), emblem: img ? img.complete && img.naturalWidth > 0 : false };
    });
    log(`S8 fischerei-tooltip "Aus New Haven"+emblem: ${JSON.stringify(boostTip)}`);
    await h.shot("s8-fishing-boost-tip");

    // ═══ Strecke 7: Abriss (Fischerhütte) ═════════════════════════════════════
    await gotoNH(page);
    await toMap(page);
    const goldBefore = await st(h, (dbg) => dbg.state.character.gold);
    const fishTileIdx = await page.evaluate(() => {
      const tiles = [...document.querySelectorAll(".nh-map-tile")];
      return tiles.findIndex((t) => (t.getAttribute("title") || "").includes("Fisher"));
    });
    log(`S7 fischerhütten-kachel index: ${fishTileIdx}`);
    await page.locator(".nh-map-tile").nth(Math.max(0, fishTileIdx)).click();
    await page.waitForSelector(".nh-popup", { timeout: 6000 });
    await page.locator(".nh-demolish-btn").click();
    await page.waitForSelector(".nh-confirm", { timeout: 6000 });
    const refundPreview = await page.evaluate(() => ({
      title: document.querySelector(".nh-confirm-title")?.textContent?.trim(),
      chips: [...document.querySelectorAll(".nh-demolish-refund-list .mat-chip")].map((c) => c.textContent?.trim()),
    }));
    log(`S7 abriss-vorschau: ${JSON.stringify(refundPreview)}`);
    await h.shot("s7-demolish-confirm");
    await page.locator(".nh-confirm .combat-btn.flee").click();
    await page.waitForTimeout(800);
    const s7after = await st(h, (dbg) => ({
      gold: dbg.state.character.gold,
      fishLevel: dbg.state.camp.buildings?.camp_fishing_hut ?? 0,
      fishPos: dbg.state.camp.positions?.camp_fishing_hut ?? null,
      fishVisual: dbg.state.camp.mapVisuals?.camp_fishing_hut ?? null,
    }));
    log(`S7 nach abriss: goldDelta=${s7after.gold - goldBefore} level=${s7after.fishLevel} pos=${JSON.stringify(s7after.fishPos)} visual=${JSON.stringify(s7after.fishVisual)}`);
    const toast7 = await page.evaluate(() => document.querySelector(".toast-stack")?.textContent?.trim() || null);
    log(`S7 abriss-toast: ${JSON.stringify(toast7)}`);
    const tilesLeft = await page.evaluate(() => [...document.querySelectorAll(".nh-map-tile")].map((t) => t.getAttribute("title")));
    log(`S7 kacheln nach abriss: ${JSON.stringify(tilesLeft)}`);
    await h.shot("s7-after-demolish");
    log(`S5b kapazitätspille nach abriss: ${JSON.stringify(await page.locator(".nh-capacity").textContent().catch(() => null))}`);

    log(`pageErrors gesamt: ${h.errors.length}`);
    if (h.errors.length) log("PAGEERRORS:\n" + h.errors.slice(0, 20).join("\n---\n"));
  } catch (err) {
    log(`ABBRUCH: ${err.message}`);
    await h.shot("99-crash").catch(() => {});
    log(`pageErrors: ${h.errors.length}: ${h.errors.slice(0, 10).join(" | ")}`);
  } finally {
    writeFileSync(join(OUT, "findings.txt"), findings.join("\n"), "utf8");
    console.log(`\nDURATION: ${Math.round((Date.now() - t0) / 1000)}s`);
    console.log(`FINDINGS: ${join(OUT, "findings.txt")}`);
    await h.stop();
  }
};

main().catch((err) => { console.error("FATAL:", err); process.exit(1); });
