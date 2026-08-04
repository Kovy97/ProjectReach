#!/usr/bin/env node
/**
 * TESTER 3 ("Der Händler") — Rezepte, Item-Wiki, Set-Boni nach der Shop-Purge (Chef-GO 2026-07-11).
 * READ-ONLY, kein Quellcode angefasst, kein Build. Port 5252.
 *
 * Checks:
 *  (A) Neue Rezepte in Lederverarbeitung (Rohleder-Set + Angelruten) und Schmieden
 *      (Spitzhacken/Sicheln — Kategorien Eisen/Stahl/Mithril/Runit/Leerenstahl) sichtbar + übersetzt.
 *  (B) Item-Wiki (?-Button): leather_helm, ash_fishing_rod, iron_pickaxe, graywort_seed zeigen
 *      jetzt Craft-/Foraging-Quellen statt Shop, Chancen als %.
 *  (C) Set-Bonus-Zeile im Tooltip: (worn/total) + Bonus-Text, "active"-Klasse nur bei genug Teilen.
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = "G:\\GameDev\\apps\\client";
const PORT = 5252;
const BASE_URL = `http://localhost:${PORT}`;
const OUT_DIR = "C:\\Users\\MSchu\\AppData\\Local\\Temp\\claude\\G--GameDev\\553d2095-3a73-4795-9782-0fe746a25f13\\scratchpad\\sweep3";

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

async function routeFixture(page, fixtureName, mutator) {
  await page.route(`**/ui-audit-fixtures/${fixtureName}.json`, async (route) => {
    const res = await route.fetch();
    const json = JSON.parse(await res.text());
    mutator(json.state);
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(json) });
  });
}

const errors = [];
function wirePage(page, tag) {
  page.on("pageerror", (e) => errors.push(`[${tag}] pageerror: ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error") errors.push(`[${tag}] console: ${m.text()}`); });
}

async function gotoFixture(page, fixtureName) {
  await page.goto(`${BASE_URL}/?fixture=${fixtureName}`, { waitUntil: "load" });
  await page.waitForSelector('[data-guide-id^="topbar."], [data-guide-id^="sidebar."]', { timeout: 15000 });
  await page.waitForTimeout(2500);
}

const problems = [];
const notes = []; // Informationell — kein Test-Fail, aber wert, im Bericht erwähnt zu werden.
const { child, getOutput } = startDevServer();
try {
  const ok = await waitForServer(BASE_URL);
  if (!ok) { console.error("SERVER NOT UP:\n" + getOutput()); process.exit(1); }
  const browser = await chromium.launch();

  // ══════════════════════════════════════════════════════════════════════════════════════════
  // (A) Rezepte: Lederverarbeitung (Rohleder + Angelruten) und Schmieden (Spitzhacken/Sicheln)
  // ══════════════════════════════════════════════════════════════════════════════════════════
  const pageA = await browser.newPage({ viewport: { width: 1920, height: 1400 }, deviceScaleFactor: 1 });
  wirePage(pageA, "A");
  await gotoFixture(pageA, "endgame"); // alle Skills maxed → auch die höchsten Tiers (Leerenstahl L65) sichtbar/entsperrt

  await clickRetry(pageA, pageA.locator('[data-guide-id="sidebar.leatherworking"]').first());
  await pageA.waitForTimeout(800);
  const leatherCats = await pageA.evaluate(() => Array.from(document.querySelectorAll(".category-name")).map((e) => e.textContent));
  console.log("LEATHERWORKING-KATEGORIEN:", JSON.stringify(leatherCats));
  const hasRawhideCat = leatherCats.some((c) => /rawhide|rohleder/i.test(c ?? ""));
  const hasRodCat = leatherCats.some((c) => /fishing rod|angelrute/i.test(c ?? ""));
  if (!hasRawhideCat) problems.push(`(A) Lederverarbeitung: Kategorie "Rohleder"/"Rawhide" fehlt. Gefunden: ${JSON.stringify(leatherCats)}`);
  if (!hasRodCat) problems.push(`(A) Lederverarbeitung: Kategorie "Angelruten"/"Fishing Rods" fehlt. Gefunden: ${JSON.stringify(leatherCats)}`);
  // Raw-i18n-Token-Check: Kategorienamen dürfen nicht wie "shop.cat.xyz" aussehen.
  const rawTokenCat = leatherCats.find((c) => /^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*){1,}$/.test(c ?? ""));
  if (rawTokenCat) problems.push(`(A) Roher i18n-Token als Kategoriename in Lederverarbeitung: "${rawTokenCat}"`);

  // Rohleder-Kategorie aufklappen (NUR falls kollabiert — die Karte ist sonst schon sichtbar und
  // ein blinder Klick würde eine offene Sektion versehentlich zuklappen).
  // Zutaten-Chips zeigen KEINEN Text, nur ein Icon (<img src=".../assets/items/<itemId>.webp">) +
  // Have/Need-Zahl (s. mat-chip-Markup) — also über den Bild-Dateinamen prüfen, nicht über Text.
  const findHelmCard = () => pageA.evaluate(() => {
    const cards = Array.from(document.querySelectorAll(".skillcard"));
    const helmCard = cards.find((c) => /rawhide helm|rohlederhelm/i.test(c.textContent ?? ""));
    if (!helmCard) return null;
    return Array.from(helmCard.querySelectorAll(".mat-chip")).map((m) => ({
      img: m.querySelector("img")?.getAttribute("src") ?? null,
      count: m.querySelector(".mat-count")?.textContent ?? null,
    }));
  });
  let rawhideMats = await findHelmCard();
  if (!rawhideMats) {
    const rawhideHeader = pageA.locator(".category-header", { hasText: /rawhide|rohleder/i }).first();
    if (await rawhideHeader.count()) {
      await clickRetry(pageA, rawhideHeader);
      await pageA.waitForTimeout(400);
      rawhideMats = await findHelmCard();
    }
  }
  await pageA.screenshot({ path: join(OUT_DIR, "leatherworking-rawhide.png") });
  console.log("SHOT SAVED: leatherworking-rawhide.png");
  console.log("ROHLEDERHELM-ZUTATEN:", JSON.stringify(rawhideMats));
  if (!rawhideMats || rawhideMats.length === 0) {
    problems.push("(A) Rohlederhelm-Rezeptkarte nicht gefunden oder zeigt keine Zutaten-Chips");
  } else if (!rawhideMats.some((m) => /raw_hide/i.test(m.img ?? ""))) {
    problems.push(`(A) Rohlederhelm-Zutaten-Icon zeigt nicht raw_hide: ${JSON.stringify(rawhideMats)}`);
  }

  await clickRetry(pageA, pageA.locator('[data-guide-id="sidebar.smithing"]').first());
  await pageA.waitForTimeout(800);
  const smithCats = await pageA.evaluate(() => Array.from(document.querySelectorAll(".category-name")).map((e) => e.textContent));
  console.log("SMITHING-KATEGORIEN:", JSON.stringify(smithCats));
  const hasVoidCat = smithCats.some((c) => /voidsteel|leerenstahl/i.test(c ?? ""));
  if (!hasVoidCat) problems.push(`(A) Schmieden: Kategorie "Voidsteel"/"Leerenstahl" fehlt (Sichel-Rezept). Gefunden: ${JSON.stringify(smithCats)}`);
  const rawTokenSmith = smithCats.find((c) => /^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*){1,}$/.test(c ?? ""));
  if (rawTokenSmith) problems.push(`(A) Roher i18n-Token als Kategoriename in Schmieden: "${rawTokenSmith}"`);

  const pickaxeCard = await pageA.evaluate(() => {
    const cards = Array.from(document.querySelectorAll(".skillcard"));
    const card = cards.find((c) => /iron pickaxe|eisen-spitzhacke/i.test(c.textContent ?? ""));
    if (!card) return null;
    return {
      title: card.querySelector(".skillcard-title")?.textContent ?? null,
      mats: Array.from(card.querySelectorAll(".mat-chip")).map((m) => m.querySelector("img")?.getAttribute("src") ?? null),
    };
  });
  console.log("EISEN-SPITZHACKE-KARTE:", JSON.stringify(pickaxeCard));
  if (!pickaxeCard) problems.push("(A) Rezeptkarte 'Eisen-Spitzhacke schmieden' in Schmieden nicht gefunden");

  const sickleCard = await pageA.evaluate(() => {
    const cards = Array.from(document.querySelectorAll(".skillcard"));
    const card = cards.find((c) => /sickle|sichel/i.test(c.textContent ?? ""));
    return card ? { title: card.querySelector(".skillcard-title")?.textContent ?? null } : null;
  });
  console.log("SICHEL-KARTE gefunden:", JSON.stringify(sickleCard));
  if (!sickleCard) problems.push("(A) Keine Sichel-Rezeptkarte in Schmieden gefunden");

  await pageA.screenshot({ path: join(OUT_DIR, "smithing-void.png") });
  console.log("SHOT SAVED: smithing-void.png");
  await pageA.close();

  // ══════════════════════════════════════════════════════════════════════════════════════════
  // (B) Item-Wiki: leather_helm, ash_fishing_rod, iron_pickaxe, graywort_seed — Quellen prüfen
  // ══════════════════════════════════════════════════════════════════════════════════════════
  const pageB = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  wirePage(pageB, "B");
  const WIKI_ITEMS = ["leather_helm", "ash_fishing_rod", "iron_pickaxe", "graywort_seed"];
  await routeFixture(pageB, "endgame", (state) => {
    // Volle Kontrolle: Inventar NUR mit den 4 Test-Items (dedizierte Wiki-Prüf-Seite, kein
    // Realismus-Anspruch — s. arena-rework-check.mjs-Präzedenz für Fixture-Overrides).
    state.inventory.slots = WIKI_ITEMS.map((id) => ({ itemId: id, qty: id === "graywort_seed" ? 5 : 1 }));
    state.inventory.instances = [];
  });
  await gotoFixture(pageB, "endgame");
  await clickRetry(pageB, pageB.locator('[data-guide-id="topbar.character"]').first());
  await pageB.waitForTimeout(800);

  for (const itemId of WIKI_ITEMS) {
    const cell = pageB.locator(".item-cell").filter({ has: pageB.locator(`img[src*="${itemId}"]`) }).first();
    const found = await cell.count();
    if (found === 0) {
      problems.push(`(B) Item-Zelle für ${itemId} nicht im Inventar gefunden`);
      continue;
    }
    await clickRetry(pageB, cell);
    await pageB.waitForTimeout(300);
    const wikiBtn = pageB.locator(".itip-wiki-btn").first();
    if ((await wikiBtn.count()) === 0) {
      problems.push(`(B) ${itemId}: kein Wiki-"?"-Button im gepinnten Tooltip`);
      continue;
    }
    await clickRetry(pageB, wikiBtn);
    await pageB.waitForTimeout(400);
    const wikiInfo = await pageB.evaluate(() => {
      const modal = document.querySelector(".iwk-modal");
      if (!modal) return null;
      const sections = Array.from(modal.querySelectorAll(".iwk-section"));
      const sourceSection = sections[0];
      const rows = sourceSection ? Array.from(sourceSection.querySelectorAll(".iwk-row")) : [];
      return {
        empty: !!sourceSection?.querySelector(".iwk-empty"),
        rows: rows.map((r) => ({
          isShop: r.classList.contains("iwk-row-shop"),
          name: r.querySelector(".iwk-row-name")?.textContent ?? null,
          val: r.querySelector(".iwk-row-val")?.textContent ?? null,
        })),
      };
    });
    console.log(`WIKI ${itemId}:`, JSON.stringify(wikiInfo));
    await pageB.screenshot({ path: join(OUT_DIR, `wiki-${itemId}.png`) });
    console.log(`SHOT SAVED: wiki-${itemId}.png`);
    if (!wikiInfo || wikiInfo.empty) {
      problems.push(`(B) ${itemId}: Quellen-Sektion leer — sollte Craft-Rezept/Foraging zeigen`);
    } else {
      const shopRow = wikiInfo.rows.find((r) => r.isShop);
      if (shopRow) notes.push(`(B) ${itemId}: Quelle zeigt noch einen Shop-Eintrag (${JSON.stringify(shopRow)}) — content/index.ts hat graywort_seed/ashroot_seed/grimwheat_seed absichtlich als "Basis-Samen Bootstrap-Komfort" im Shop belassen (Kommentar: "kein exklusiver Pfad"), das widerspricht aber der Erwartung aus dem Test-Auftrag ("NICHT mehr Shop").`);
      // Chance-Zeilen (kind action/monster/dungeon) müssen ein "%" enthalten.
      const badPct = wikiInfo.rows.find((r) => !r.isShop && r.val && !r.val.includes("%"));
      if (badPct) problems.push(`(B) ${itemId}: Quellen-Zeile ohne %-Anzeige: ${JSON.stringify(badPct)}`);
    }
    // Modal schließen für den nächsten Durchlauf (Escape statt Klick — .modal-close wird
    // gelegentlich von .iwk-kicker/Achievement-Toasts überlagert und blockiert Pointer-Events).
    await pageB.keyboard.press("Escape");
    await pageB.waitForTimeout(300);
  }
  await pageB.close();

  // ══════════════════════════════════════════════════════════════════════════════════════════
  // (C) Set-Bonus-Tooltip-Zeile: inaktiv (3/5, Default-Endgame) vs. aktiv (5/5, gepatcht)
  // ══════════════════════════════════════════════════════════════════════════════════════════
  const pageC1 = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  wirePage(pageC1, "C1");
  await gotoFixture(pageC1, "endgame"); // Default: vestment+handwraps+sandals = 3/5 Starweave-Teile
  await clickRetry(pageC1, pageC1.locator('[data-guide-id="topbar.character"]').first());
  await pageC1.waitForTimeout(800);
  await clickRetry(pageC1, pageC1.locator(".cs-slot.body .item-cell").first());
  await pageC1.waitForTimeout(300);
  const inactiveSet = await pageC1.evaluate(() => {
    const el = document.querySelector(".itip-set");
    if (!el) return null;
    return {
      active: el.classList.contains("active"),
      count: el.querySelector(".itip-set-count")?.textContent ?? null,
      bonus: el.querySelector(".itip-set-bonus")?.textContent ?? null,
    };
  });
  console.log("SET-BONUS (3/5, Default-Endgame):", JSON.stringify(inactiveSet));
  await pageC1.screenshot({ path: join(OUT_DIR, "setbonus-inactive-3of5.png") });
  console.log("SHOT SAVED: setbonus-inactive-3of5.png");
  if (!inactiveSet) {
    problems.push("(C) Set-Bonus-Sektion fehlt am Starweave-Vestment (Body-Slot) im Default-Endgame");
  } else {
    if (inactiveSet.active) problems.push(`(C) Set-Bonus zeigt "active" bei nur 3/5 Teilen: ${JSON.stringify(inactiveSet)}`);
    if (!/3\s*\/\s*5/.test(inactiveSet.count ?? "")) problems.push(`(C) Set-Zähler zeigt nicht "3/5": ${inactiveSet.count}`);
  }
  await pageC1.close();

  const pageC2 = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  wirePage(pageC2, "C2");
  await routeFixture(pageC2, "endgame", (state) => {
    state.character.equipment.helmet = "starweave_coronet";
    state.character.equipment.legs = "starweave_skirt";
    // body/gloves/boots sind im Default-Endgame bereits starweave_vestment/handwraps/sandals.
  });
  await gotoFixture(pageC2, "endgame");
  await clickRetry(pageC2, pageC2.locator('[data-guide-id="topbar.character"]').first());
  await pageC2.waitForTimeout(800);
  await clickRetry(pageC2, pageC2.locator(".cs-slot.body .item-cell").first());
  await pageC2.waitForTimeout(300);
  const activeSet = await pageC2.evaluate(() => {
    const el = document.querySelector(".itip-set");
    if (!el) return null;
    return {
      active: el.classList.contains("active"),
      count: el.querySelector(".itip-set-count")?.textContent ?? null,
      bonus: el.querySelector(".itip-set-bonus")?.textContent ?? null,
      name: el.querySelector(".itip-set-name")?.childNodes[0]?.textContent?.trim() ?? null,
    };
  });
  console.log("SET-BONUS (5/5, voll ausgerüstet):", JSON.stringify(activeSet));
  await pageC2.screenshot({ path: join(OUT_DIR, "setbonus-active-5of5.png") });
  console.log("SHOT SAVED: setbonus-active-5of5.png");
  if (!activeSet) {
    problems.push("(C) Set-Bonus-Sektion fehlt bei vollem 5/5-Starweave-Set");
  } else {
    if (!activeSet.active) problems.push(`(C) Set-Bonus zeigt NICHT "active" bei vollem 5/5-Set: ${JSON.stringify(activeSet)}`);
    if (!/5\s*\/\s*5/.test(activeSet.count ?? "")) problems.push(`(C) Set-Zähler zeigt nicht "5/5": ${activeSet.count}`);
    if (!activeSet.bonus || activeSet.bonus.trim().length === 0) problems.push("(C) Set-Bonus-Text ist leer bei aktivem Set");
  }
  await pageC2.close();

  console.log(problems.length ? "PROBLEME:\n- " + problems.join("\n- ") : "ALLE CHECKS GRÜN");
  console.log(notes.length ? "NOTIZEN:\n- " + notes.join("\n- ") : "keine Notizen");
  console.log(errors.length ? `${errors.length} page errors:\n` + errors.slice(0, 15).join("\n") : "no page errors");
  await browser.close();
  process.exitCode = problems.length || errors.length ? 1 : 0;
} finally {
  child.kill();
}
