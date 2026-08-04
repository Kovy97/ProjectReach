#!/usr/bin/env node
/**
 * Headless Prüfauftrag "New Haven als Spieler durchspielen" (Task #335-Prüfrunde, ui-dev-Audit,
 * KEINE Fixes — nur Befunde). Eigener Vite-Dev-Server + Playwright-Chromium, NIEMALS Electron.
 * Muster 1:1 aus perf-combat-audit.mjs/perf-ambient-audit.mjs übernommen (spawn vite dev gegen
 * vite.tour.config.mjs, `?fixture=<name>` ist import.meta.env.DEV-gegated → nur der Dev-Server
 * kann Fixtures laden, ein `vite preview`-Bundle würde nur das Hauptmenü zeigen).
 *
 * Fixture: ui-audit/fixtures/nh_map_audit.json (+ Kopie in src/renderer/public/ui-audit-fixtures/,
 * BEIDE Orte nötig, s. BOT-GUIDE.md) — chirurgisch aus nh_busy.json abgeleitet (großes Gold-/Bank-
 * Polster übernommen), camp-Feld komplett ersetzt:
 *   - camp_townhall Stufe II (Kapazität 9)
 *   - camp_watchtower(1), camp_storehouse(1), camp_smelter(2, Veredelung smelt_iron LÄUFT),
 *     camp_sawpit(1), camp_trophy_wall(3, MAX-Stufe) — 5 fertige Nicht-Zentralhaus-Gebäude
 *   - camp_fence_tent(1) im AUSBAU auf Stufe II (buildJob, remainingMs 15120000) — der laufende Bau
 *   - camp.positions für alle 7: camp_storehouse (0.50,0.55) und camp_trophy_wall (0.54,0.60)
 *     ÜBERLAPPEN absichtlich (Fußabdruck ist bei jedem Gebäude identisch: halfW 0.08/halfH 0.1422,
 *     s. packages/shared campFootprint) — trophy_wall liegt weiter unten (größeres y) und muss laut
 *     Tiefensortierung (Fußkante) VORNE liegen.
 *   - camp.mapVisuals.camp_watchtower = {scalePercent:250, flipped:true} — die Skalierungs-/
 *     Spiegelungs-Kalibrierung aus dem Move-Werkzeug.
 * `version`/`state.version` auf 80 (aktueller SAVE_VERSION) gesetzt, damit campRepairPositions die
 * handgesetzten Positionen NICHT überschreibt (gültige Positionen bleiben laut shared/index.ts
 * campRepairPositions exakt erhalten, auch wenn sie überlappen — verifiziert vor dem Bau dieses
 * Skripts per Code-Lesung, s. Audit-Chat).
 *
 * Ausgabe: Screenshots neben diesem Skript (newhaven-335-*.png) + eine Konsolen-Befundliste
 * (SECTION-Überschriften, PASS/FAIL/INFO-Zeilen). Dieses Skript ändert NICHTS an Produktionscode.
 *
 * Run: node ui-audit/newhaven-audit-335.mjs   (from apps/client/)
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5335;
const BASE_URL = `http://localhost:${PORT}`;
const FIXTURE = "nh_map_audit";
const VIEWPORTS = [
  { label: "1920x1080", width: 1920, height: 1080 },
  { label: "3440x1440", width: 3440, height: 1440 },
];

// Erwartete Fraktions-Positionen aus der Fixture (s. Modul-Kopf) — die Wahrheitsquelle für alle
// Projektions-/Tiefensortierungs-Prüfungen unten.
const POS = {
  camp_townhall: { x: 0.50, y: 0.20 },
  camp_watchtower: { x: 0.15, y: 0.20 },
  camp_smelter: { x: 0.85, y: 0.20 },
  camp_sawpit: { x: 0.15, y: 0.75 },
  camp_storehouse: { x: 0.50, y: 0.55 },
  camp_trophy_wall: { x: 0.54, y: 0.60 },
  camp_fence_tent: { x: 0.85, y: 0.75 },
};
const FOOTPRINT = { halfW: 0.08, halfH: 0.1422 };

const findings = [];
function log(section, level, msg) {
  const line = `[${level}] ${section}: ${msg}`;
  console.log(line);
  findings.push({ section, level, msg });
}
const pass = (s, m) => log(s, "PASS", m);
const fail = (s, m) => log(s, "FAIL", m);
const info = (s, m) => log(s, "INFO", m);

async function waitForServer(url, t = 40000) {
  const s = Date.now();
  while (Date.now() - s < t) {
    try { const r = await fetch(url); if (r.ok) return true; } catch {}
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

function startDevServer(port) {
  const viteBin = join(CLIENT_DIR, "node_modules", "vite", "bin", "vite.js");
  const child = spawn(
    process.execPath,
    [viteBin, "dev", "--config", join(__dirname, "vite.tour.config.mjs"), "--port", String(port), "--strictPort"],
    { cwd: CLIENT_DIR, stdio: ["ignore", "pipe", "pipe"] },
  );
  let out = "";
  child.stdout.on("data", (d) => (out += d.toString()));
  child.stderr.on("data", (d) => (out += d.toString()));
  return { child, getOutput: () => out };
}

async function safeClick(locator, timeoutMs = 5000) {
  try { await locator.click({ timeout: timeoutMs }); return true; } catch { return false; }
}

async function openNewHaven(page, { locale, toastTest } = {}) {
  const pageErrors = [];
  page.on("pageerror", (e) => { pageErrors.push(e.message); console.log("[page-error]", e.message); });
  page.on("console", (msg) => { if (msg.type() === "error") { pageErrors.push(msg.text()); console.log("[console-error]", msg.text()); } });
  if (locale) {
    await page.addInitScript((loc) => localStorage.setItem("hearthforge:locale", loc), locale);
  }
  // `toastTest` (Fix-Welle New Haven #3): hängt den bestehenden Dev-only-Query-Param
  // (`?toastTest=rare|epic|legendary`, Toasts.tsx) an den INITIALEN Ladepfad an — MainLayout/Toasts
  // mounten genau einmal beim ersten "playing"-Bildschirm; die spätere Sidebar-Navigation zu New
  // Haven ist nur ein interner Seitenwechsel (kein Reload), der Query-Param muss also schon hier
  // sitzen, nicht erst beim Sidebar-Klick.
  const qs = `fixture=${FIXTURE}${toastTest ? `&toastTest=${toastTest}` : ""}`;
  await page.goto(`${BASE_URL}/?${qs}`, { waitUntil: "load" });
  await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
  await page.waitForTimeout(600);
  await page.locator('[data-guide-id="sidebar.newhaven"]').first().click({ timeout: 8000 });
  await page.waitForSelector(".nh-map", { timeout: 10000 });
  await page.waitForTimeout(300);
  return pageErrors;
}

async function setLightPhase(page, target) {
  for (let i = 0; i < 3; i++) {
    const cur = await page.locator(".nh-map").getAttribute("data-light-phase");
    if (cur === target) return true;
    await page.click(".nh-debug-light");
    await page.waitForTimeout(120);
  }
  return (await page.locator(".nh-map").getAttribute("data-light-phase")) === target;
}

async function mapRect(page) {
  // WICHTIG: `.nh-map` selbst hat einen ~5-9px 9-Slice-Rahmen (border-width: clamp(5px,0.5vw,9px)),
  // Prozentpositionen der Kacheln beziehen sich aber auf die Content-Box DAHINTER. `.nh-map-bg`
  // (`position:absolute; inset:0`) füllt exakt diese Content-Box — als Referenzrechteck nehmen,
  // sonst wächst der Mess-Fehler mit dem Abstand vom Zentrum (bis zu ~8px bei randnahen Kacheln).
  return page.locator(".nh-map-bg").boundingBox();
}

function expectedCenterPx(rect, frac) {
  return { x: rect.x + frac.x * rect.width, y: rect.y + frac.y * rect.height };
}

async function tileCenterPx(page, buildingId, allTileTitles) {
  // Kein data-building-id am Tile (nur title="<Name> · Stufe X") — wir identifizieren daher über
  // die ERWARTETE Pixel-Position (aus POS) und suchen das Tile, dessen tatsächlicher Mittelpunkt am
  // nächsten liegt. Deckt zugleich verdeckte/überlappende Tiles ab (DOM-Reihenfolge ist Katalog-
  // Reihenfolge, nicht Tiefe).
  const rect = await mapRect(page);
  const expected = expectedCenterPx(rect, POS[buildingId]);
  const tiles = await page.locator(".nh-map-tile").all();
  let best = null;
  let bestDist = Infinity;
  for (const t of tiles) {
    const box = await t.boundingBox();
    if (!box) continue;
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    const d = Math.hypot(cx - expected.x, cy - expected.y);
    if (d < bestDist) { bestDist = d; best = { el: t, cx, cy, box }; }
  }
  return { expected, best, distPx: bestDist };
}

async function measurePerf(page, durationMs) {
  return page.evaluate((durationMs) => new Promise((resolve) => {
    const longTasks = [];
    let po = null;
    try {
      po = new PerformanceObserver((list) => { for (const e of list.getEntries()) longTasks.push(e.duration); });
      po.observe({ entryTypes: ["longtask"] });
    } catch {}
    const frameDeltas = [];
    let last = performance.now();
    let rafId = 0;
    const loop = (now) => { frameDeltas.push(now - last); last = now; rafId = requestAnimationFrame(loop); };
    rafId = requestAnimationFrame(loop);
    setTimeout(() => {
      cancelAnimationFrame(rafId);
      if (po) po.disconnect();
      resolve({ longTasks, frameDeltas: frameDeltas.slice(1) });
    }, durationMs);
  }), durationMs);
}
function stats(arr) {
  if (arr.length === 0) return { count: 0, avg: 0, max: 0, sum: 0 };
  const sum = arr.reduce((a, b) => a + b, 0);
  return { count: arr.length, avg: sum / arr.length, max: Math.max(...arr), sum };
}

async function sectionProjectionAndDepth(browser, viewport) {
  const S = `Projektion/Tiefe @ ${viewport.label}`;
  const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
  const errs = await openNewHaven(page);
  await setLightPhase(page, "day");
  await page.waitForTimeout(200);

  const rect = await mapRect(page);
  const ratio = rect.width / rect.height;
  const expectedRatio = 1672 / 941;
  if (Math.abs(ratio - expectedRatio) / expectedRatio < 0.01) {
    pass(S, `Kartenverhältnis ${ratio.toFixed(4)} passt zu 1672:941 (${expectedRatio.toFixed(4)}) — keine Verzerrung.`);
  } else {
    fail(S, `Kartenverhältnis ${ratio.toFixed(4)} weicht von 1672:941 (${expectedRatio.toFixed(4)}) ab (Abweichung ${(((ratio - expectedRatio) / expectedRatio) * 100).toFixed(2)}%). Das Kartenhintergrundbild camp_map_day.webp ist real 3344×1882 (exakt 1672:941) — es wird also spürbar horizontal gestreckt gerendert.`);
    // Diagnose der Box-Kette für die Ursachensuche (nur INFO, keine eigene Bewertung).
    const chain = await page.evaluate(() => {
      const ids = [".nh-map-layout", ".nh-map-stage", ".nh-map", ".nh-map-bg"];
      return ids.map((sel) => {
        const el = document.querySelector(sel);
        if (!el) return { sel, missing: true };
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return { sel, w: Math.round(r.width), h: Math.round(r.height), ratio: +(r.width / r.height).toFixed(4), containerType: cs.containerType, boxSizing: cs.boxSizing, borderW: cs.borderTopWidth };
      });
    });
    info(S, `Box-Kette: ${chain.map((c) => c.missing ? `${c.sel}=fehlt` : `${c.sel} ${c.w}x${c.h} (${c.ratio}) box-sizing=${c.boxSizing} border=${c.borderW} container-type=${c.containerType}`).join(" | ")}`);
  }

  await page.screenshot({ path: join(__dirname, `newhaven-335-map-day-${viewport.label}.png`) });

  for (const id of Object.keys(POS)) {
    const { expected, best, distPx } = await tileCenterPx(page, id);
    const tolPx = Math.max(4, rect.width * 0.004);
    if (best && distPx <= tolPx) {
      pass(S, `${id}: Tile-Mittelpunkt bei (${best.cx.toFixed(1)},${best.cy.toFixed(1)})px trifft erwartete Position (Abweichung ${distPx.toFixed(2)}px, Toleranz ${tolPx.toFixed(1)}px).`);
    } else {
      fail(S, `${id}: kein Tile nahe der erwarteten Position (${expected.x.toFixed(1)},${expected.y.toFixed(1)})px gefunden — nächstes ${distPx.toFixed(1)}px entfernt.`);
    }
  }

  // Tiefensortierung: trophy_wall (größeres y) muss vor storehouse liegen.
  const store = await tileCenterPx(page, "camp_storehouse");
  const trophy = await tileCenterPx(page, "camp_trophy_wall");
  if (store.best && trophy.best) {
    const zStore = await store.best.el.evaluate((el) => Number(getComputedStyle(el).zIndex) || 0);
    const zTrophy = await trophy.best.el.evaluate((el) => Number(getComputedStyle(el).zIndex) || 0);
    if (zTrophy > zStore) {
      pass(S, `Tiefensortierung: camp_trophy_wall z-index=${zTrophy} > camp_storehouse z-index=${zStore} (weiter unten = vorn, wie erwartet).`);
    } else {
      fail(S, `Tiefensortierung: camp_trophy_wall z-index=${zTrophy} NICHT größer als camp_storehouse z-index=${zStore} — vorderes Gebäude verdeckt hinteres evtl. falsch.`);
    }
    // Elementprobe im Überlappungsbereich: dort muss trophy_wall (oder ein Kind davon) das
    // oberste Element sein.
    const overlapPx = expectedCenterPx(rect, { x: 0.52, y: 0.55 });
    const topAtOverlap = await page.evaluate(({ x, y }) => {
      const el = document.elementFromPoint(x, y);
      return el ? el.closest(".nh-map-tile")?.getAttribute("title") ?? el.className : null;
    }, overlapPx);
    info(S, `elementFromPoint im Überlappungsbereich → title/class: "${topAtOverlap}" (sollte zu camp_trophy_wall gehören).`);
  } else {
    fail(S, "Tiefensortierung: storehouse oder trophy_wall Tile nicht gefunden.");
  }

  // Skalierung/Spiegelung watchtower (250%, geflippt).
  const wt = await tileCenterPx(page, "camp_watchtower");
  if (wt.best) {
    const [scaleVar, flipVar] = await wt.best.el.evaluate((el) => {
      const cs = getComputedStyle(el);
      return [cs.getPropertyValue("--nh-map-sprite-scale").trim(), cs.getPropertyValue("--nh-map-sprite-flip").trim()];
    });
    const scaleNum = Number(scaleVar);
    if (flipVar === "-1") pass(S, `camp_watchtower --nh-map-sprite-flip = -1 (gespiegelt, wie im Fixture gesetzt).`);
    else fail(S, `camp_watchtower --nh-map-sprite-flip = "${flipVar}" (erwartet -1).`);
    // Basis-Skala watchtower Stufe1 laut campArt.ts-Familientabelle [0.64,0.8,0.95]*2 = 1.28; ×250% = 3.2.
    const expectedScale = 0.64 * 2 * 2.5;
    if (Math.abs(scaleNum - expectedScale) < 0.05) pass(S, `camp_watchtower --nh-map-sprite-scale = ${scaleNum} ≈ erwartet ${expectedScale} (Rang-Skala × 250%).`);
    else info(S, `camp_watchtower --nh-map-sprite-scale = ${scaleNum} (erwartet ≈${expectedScale} nach Formel Rang×Kalibrierung — ggf. andere Rangwerte).`);
  } else {
    fail(S, "camp_watchtower Tile für Skalierungs-Check nicht gefunden.");
  }

  await setLightPhase(page, "night");
  await page.waitForTimeout(250);
  await page.screenshot({ path: join(__dirname, `newhaven-335-map-night-${viewport.label}.png`) });
  const nightPhaseAttr = await page.locator(".nh-map").getAttribute("data-light-phase");
  if (nightPhaseAttr === "night") pass(S, "Tag/Nacht-Debugschalter setzt data-light-phase=night konsequent.");
  else fail(S, `data-light-phase nach Nacht-Umschaltung ist "${nightPhaseAttr}" statt "night".`);
  // Klick-Test bei Nacht: Popup muss trotz Nebel-Overlay öffnen (pointer-events:none am Nebel).
  if (wt.best) {
    await wt.best.el.click();
    const popupVisible = await page.locator(".nh-popup").count();
    if (popupVisible > 0) pass(S, "Klick auf ein Gebäude bei Nacht öffnet trotzdem das Popup (Nebel blockiert keine Klicks).");
    else fail(S, "Klick auf ein Gebäude bei Nacht öffnete KEIN Popup — Nebel-Overlay könnte Klicks blockieren.");
    if (popupVisible > 0) {
      await page.waitForTimeout(400); // Fade+Scale-in abwarten (s. sectionSmelterPopupScroll).
      await page.screenshot({ path: join(__dirname, `newhaven-335-popup-night-${viewport.label}.png`) });
      const closed = await safeClick(page.locator(".nh-popup-close"), 6000);
      if (!closed) {
        fail(S, "Klick auf den Popup-X-Button (Nacht) hing/schlug fehl (Element wurde laut Playwright wiederholt aus dem DOM entfernt) — versuche Escape als Fallback.");
        await page.keyboard.press("Escape").catch(() => {});
      }
      await page.waitForTimeout(150);
      const stillOpenAfter = await page.locator(".nh-popup").count();
      if (stillOpenAfter > 0) {
        fail(S, "Popup (Nacht) bleibt nach X-Klick UND Escape offen.");
        await page.reload({ waitUntil: "load" }).catch(() => {});
        await page.waitForSelector(".nh-map", { timeout: 10000 }).catch(() => {});
      }
    }
  }

  // Baumenü-Screenshot (Kosten-Lesbarkeit).
  await setLightPhase(page, "day");
  const listView = page.locator(".nh-view-tabbar .nh-view-tab").nth(1);
  await listView.click();
  await page.waitForTimeout(200);
  await page.screenshot({ path: join(__dirname, `newhaven-335-list-${viewport.label}.png`) });
  // Zurück zur Karte für den nächsten Schritt.
  const mapView = page.locator(".nh-view-tabbar .nh-view-tab").nth(0);
  await mapView.click();
  await page.waitForTimeout(200);
  await page.locator(".nh-buildmenu").screenshot({ path: join(__dirname, `newhaven-335-buildmenu-${viewport.label}.png`) }).catch(() => {});

  // Overflow-Stichprobe im Baumenü (Namen/Kosten dürfen nicht abgeschnitten sein).
  const overflowing = await page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll(".nh-buildmenu-name, .nh-buildmenu-cost, .nh-capacity")) {
      if (el.scrollWidth > el.clientWidth + 1) out.push({ cls: el.className, text: el.textContent, scrollW: el.scrollWidth, clientW: el.clientWidth });
    }
    return out;
  });
  if (overflowing.length === 0) pass(S, "Kein horizontaler Textüberlauf in Baumenü-Namen/-Kosten/Kapazitätsanzeige gefunden.");
  else for (const o of overflowing) fail(S, `Textüberlauf: "${o.text}" (${o.cls}) scrollWidth=${o.scrollW} > clientWidth=${o.clientW}.`);

  if (errs.length > 0) fail(S, `Browser-Konsolenfehler während dieses Durchlaufs: ${errs.slice(0, 5).join(" | ")}`);
  await page.close();
}

async function sectionSmelterPopupScroll(browser) {
  const S = "Popup Now/Next + interner Scroll (Schmelzofen)";
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await openNewHaven(page);
  await setLightPhase(page, "day");
  const smelter = await tileCenterPx(page, "camp_smelter");
  if (!smelter.best) { fail(S, "camp_smelter Tile nicht gefunden."); await page.close(); return; }
  await smelter.best.el.click();
  await page.waitForSelector(".nh-popup", { timeout: 5000 }).catch(() => {});
  const popupCount = await page.locator(".nh-popup").count();
  if (popupCount === 0) { fail(S, "Schmelzofen-Popup öffnet nicht."); await page.close(); return; }
  pass(S, "Schmelzofen-Popup öffnet per Klick.");
  // 400ms warten: .modal-overlay/.modal haben eine 0.16-0.2s Fade+Scale-in-Animation (modals.css)
  // — ein Screenshot direkt nach dem Klick erwischt sonst einen Zwischenframe (durchscheinend,
  // Gebäudebild ggf. noch nicht lazy-geladen) und würde fälschlich wie ein kaputtes Popup aussehen.
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(__dirname, "newhaven-335-popup-smelter.png") });

  const outerFrameCount = await page.locator(".nh-popup").evaluate((el) => getComputedStyle(el).borderImageSource !== "none" ? 1 : 0);
  info(S, `Popup-Rahmen (border-image) gesetzt: ${outerFrameCount === 1 ? "ja" : "nein"}.`);

  // Z-Index-Probe: `.nh-map-tile` bekommt sein z-index inline aus der Tiefensortierungs-Formel
  // (bis ~15000, +20000 bei Auswahl) — `.nh-map` selbst hat keine `isolation:isolate`, isoliert
  // seine Kacheln also NICHT von der übrigen Seite. `.modal-overlay` sitzt bei z-index:200. Prüfen,
  // ob EIN Gebäude-Tile (hier: camp_townhall, das laut Fixture geometrisch unter dem geöffneten
  // Popup liegt) das Popup an genau dieser Bildschirmstelle überdeckt.
  const rectForZ = await mapRect(page);
  const townhallPt = expectedCenterPx(rectForZ, POS.camp_townhall);
  const topAtTownhall = await page.evaluate(({ x, y }) => {
    const el = document.elementFromPoint(x, y);
    if (!el) return null;
    return {
      insidePopup: !!el.closest(".nh-popup"),
      isMapTile: !!el.closest(".nh-map-tile"),
      tag: el.tagName,
      cls: el.className,
    };
  }, townhallPt);
  if (topAtTownhall?.insidePopup) {
    pass(S, "Z-Index-Probe: an der Bildschirmstelle von camp_townhall (unter dem offenen Popup) gewinnt das Popup — keine Kartenkachel scheint durch.");
  } else if (topAtTownhall?.isMapTile) {
    fail(S, `Z-Index-Probe: an der Bildschirmstelle von camp_townhall gewinnt eine KARTENKACHEL (${topAtTownhall.cls}) über das geöffnete Popup — .nh-map-tile hat kein isolierendes Vorfahren-Element, sein inline z-index (Tiefensortierungs-Formel, hier mehrere Tausend) konkurriert direkt gegen .modal-overlay (z-index:200) und gewinnt. Das Popup kann dadurch von Gebäude-Sprites/-Labels überdeckt werden.`);
  } else {
    info(S, `Z-Index-Probe an camp_townhall-Position ergab ein unerwartetes Element: ${JSON.stringify(topAtTownhall)}.`);
  }

  // Rezeptliste öffnen (RefinePanel „ändern"-Button — erster .nh-refine-btn).
  const changeBtn = page.locator(".nh-refine-btn").first();
  if (await changeBtn.count() > 0) {
    await changeBtn.click();
    await page.waitForTimeout(150);
    const listBox = page.locator(".nh-recipe-list");
    if (await listBox.count() > 0) {
      const [scrollH, clientH] = await listBox.evaluate((el) => [el.scrollHeight, el.clientHeight]);
      if (scrollH > clientH + 2) {
        pass(S, `Rezeptliste hat internen Scrollbereich (scrollHeight ${scrollH} > clientHeight ${clientH}).`);
        const before = await page.evaluate(() => document.querySelector(".nh-popup").scrollTop);
        await listBox.evaluate((el) => { el.scrollTop = el.scrollHeight; });
        const afterInner = await listBox.evaluate((el) => el.scrollTop);
        const outerAfter = await page.evaluate(() => document.querySelector(".nh-popup").scrollTop);
        if (afterInner > 0) pass(S, "Rezeptliste lässt sich intern scrollen (scrollTop änderbar).");
        else fail(S, "Rezeptliste ließ sich nicht scrollen trotz Overflow.");
        info(S, `Äußerer Popup-scrollTop vor/nach innerem Scroll: ${before} → ${outerAfter} (sollte stabil bleiben, kein Mitreißen).`);
      } else {
        info(S, `Rezeptliste zeigt aktuell keinen Overflow (scrollHeight ${scrollH} ≤ clientHeight ${clientH}) — evtl. zu wenige Rezepte für diesen Content-Stand.`);
      }
    } else {
      fail(S, "Klick auf den Rezept-ändern-Button öffnete keine Rezeptliste.");
    }
  } else {
    fail(S, "Kein Rezept-Auswahl-Button im Schmelzofen-Popup gefunden.");
  }

  // X schließt.
  await page.locator(".nh-popup-close").click();
  await page.waitForTimeout(150);
  const stillOpen = await page.locator(".nh-popup").count();
  if (stillOpen === 0) pass(S, "X-Button schließt das Popup zuverlässig.");
  else fail(S, "Popup bleibt nach Klick auf X offen.");

  await page.close();
}

async function sectionBuildingGate(browser) {
  const S = "Bauen: Kartenrand-Gate + zweiter Baustart gesperrt";
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await openNewHaven(page);
  await setLightPhase(page, "day");
  const rect = await mapRect(page);

  // Die Fixture startet MIT einem laufenden Bau (camp_fence_tent-Ausbau) — das Baumenü zeigt daher
  // von Anfang an ALLE Einträge deaktiviert (campBuildStartReason liefert überall crew_busy, der
  // Bautrupp ist ein globales Unikat). Das ist bereits die einfachste Form von "zweiter Baustart
  // gesperrt" — hier zuerst als Ist-Zustand feststellen, dann den Bau per Debug-Knopf abschließen,
  // um den Platzierungs-/Kartenrand-Test auf einem FREIEN Bautrupp fortzusetzen, und danach erneut
  // (diesmal per echter Spielaktion) einen zweiten Baustart provozieren.
  const itemCount = await page.locator(".nh-buildmenu-item").count();
  const disabledCount = await page.locator(".nh-buildmenu-item:disabled").count();
  const reasonTexts = await page.locator(".nh-buildmenu-reason").allTextContents();
  info(S, `${itemCount} unbebaute Gebäude im Baumenü, davon ${disabledCount} deaktiviert (laufender Bau camp_fence_tent).`);
  if (itemCount > 0 && disabledCount === itemCount) {
    pass(S, `Bei laufendem Bau sind ALLE Baumenü-Einträge deaktiviert (Bautrupp ist ein globales Unikat) — Grund-Beispiel: "${reasonTexts.find((t) => t.trim()) ?? "(kein Text sichtbar)"}".`);
  } else {
    fail(S, `Bei laufendem Bau sind nur ${disabledCount}/${itemCount} Baumenü-Einträge deaktiviert — mind. einer wäre trotz beschäftigtem Bautrupp anklickbar.`);
  }
  if (!reasonTexts.some((t) => t.trim().length > 0)) {
    fail(S, "Kein Sperr-Grund-Text im Baumenü sichtbar, obwohl alle Einträge wegen crew_busy deaktiviert sind — Spieler sieht nicht, WARUM.");
  }

  // Bautrupp per Debug-Knopf sofort freimachen, um den Platzierungs-Fluss testen zu können.
  let debugFreeOn = false;
  async function setDebugFree(target) {
    if (target === debugFreeOn) return;
    await page.click(".nh-debug-toggle");
    await page.waitForTimeout(150);
    debugFreeOn = target;
  }

  await page.click(".nh-debug-complete");
  await page.waitForTimeout(250);
  let enabledAfter = await page.locator(".nh-buildmenu-item:not(:disabled)").count();
  if (enabledAfter > 0) {
    pass(S, `Nach Bau-Abschluss (Debug) sind wieder ${enabledAfter} Baumenü-Einträge anklickbar — Bautrupp korrekt freigegeben.`);
  } else {
    // Die Fixture ist von nh_busy.json geerbt und deckt nicht zwangsläufig die Materialkosten JEDER
    // der 8 verbleibenden Gebäudearten — wenn nach Bau-Abschluss weiterhin alles deaktiviert ist,
    // ist das wahrscheinlich cannot_afford (zeigt bewusst KEINEN Grund-Text, s. BuildMenu-JSX), kein
    // erneutes crew_busy. Debug-Kostenlos isoliert das Kartenrand-/Platzierungs-Gate sauber davon.
    info(S, "Nach Bau-Abschluss weiterhin alles deaktiviert (vermutlich cannot_afford, kein Grund-Text sichtbar) — Debug-Kostenlos aktivieren, um den Platzierungsfluss unabhängig von Fixture-Materialien zu testen.");
    await setDebugFree(true);
    enabledAfter = await page.locator(".nh-buildmenu-item:not(:disabled)").count();
    if (enabledAfter > 0) pass(S, `Mit Debug-Kostenlos sind ${enabledAfter} Baumenü-Einträge anklickbar — Bautrupp war tatsächlich frei, nur Materialien fehlten.`);
    else { fail(S, "Selbst mit freiem Bautrupp UND Debug-Kostenlos ist kein Baumenü-Eintrag anklickbar — echtes Blockade-Problem, nicht nur Fixture-Material."); await page.close(); return; }
  }

  const item = page.locator(".nh-buildmenu-item:not(:disabled)").first();
  const placedName = (await item.locator(".nh-buildmenu-name").textContent())?.trim();
  await item.click();
  const isPlacing = await page.locator(".nh-map.is-placing").count();
  if (isPlacing > 0) pass(S, "Klick auf einen freien Baumenü-Eintrag versetzt die Karte in Platzierungs-Modus (.is-placing).");
  else fail(S, "Platzierungs-Modus wurde nach Baumenü-Klick nicht sichtbar (.nh-map.is-placing fehlt).");

  // Geist außerhalb der Karte bewegen (weit außerhalb des Elements → pointFromClient klemmt auf
  // 0..1, landet damit unweigerlich zu nah am Rand für die volle Gebäude-Bühne).
  await page.mouse.move(rect.x - 40, rect.y - 40);
  await page.waitForTimeout(150);
  const ghost = page.locator(".nh-map-ghost");
  const invalidOutside = await ghost.evaluate((el) => el.classList.contains("nh-map-ghost--invalid"));
  const reasonOutside = (await page.locator(".nh-place-reason").textContent().catch(() => null))?.trim();
  if (invalidOutside) pass(S, `Geist außerhalb der Karte ist als ungültig markiert (rot). Grund-Text: "${reasonOutside}".`);
  else fail(S, "Geist außerhalb der Kartenfläche wurde NICHT als ungültig markiert.");

  // Geist auf eine freie, unbelegte Stelle INNERHALB der Karte → sollte jetzt (Bautrupp frei,
  // Fixture hat reichlich Gold/Material) gültig sein.
  const freeSpot = expectedCenterPx(rect, { x: 0.30, y: 0.45 });
  await page.mouse.move(freeSpot.x, freeSpot.y);
  await page.waitForTimeout(150);
  const validFree = await ghost.evaluate((el) => el.classList.contains("nh-map-ghost--valid"));
  if (validFree) pass(S, "Geist an freier, gültiger Kartenposition mit freiem Bautrupp ist als gültig markiert (grün).");
  else info(S, "Geist an der gewählten freien Position ist NICHT gültig — evtl. Kosten/Quest-Gate für dieses konkrete Gebäude, keine harte Aussage über das Kartenrand-Gate.");
  await page.screenshot({ path: join(__dirname, "newhaven-335-place-valid.png") });

  // Platzieren (startet einen NEUEN Bau → Bautrupp wieder belegt).
  await page.mouse.click(freeSpot.x, freeSpot.y);
  await page.waitForTimeout(250);
  const stillPlacingAfterClick = await page.locator(".nh-map.is-placing").count();
  if (stillPlacingAfterClick === 0) pass(S, `Platzierung von "${placedName}" erfolgreich — Platzierungs-Modus verlassen.`);
  else info(S, `Platzierungs-Modus nach Klick weiterhin aktiv (Grund evtl.: "${(await page.locator(".nh-place-reason").textContent().catch(() => null))?.trim()}") — Platzierung nicht angenommen.`);

  // Jetzt ist der Bautrupp durch DIESEN neuen Bau erneut belegt — ein zweiter Baustart muss wieder
  // gesperrt sein. Debug-Kostenlos zusätzlich AN: das Gate darf davon NICHT aufgehoben werden.
  await setDebugFree(true);
  const secondItem = page.locator(".nh-buildmenu-item").first();
  const secondDisabled = await secondItem.evaluate((el) => el.disabled).catch(() => null);
  const secondReason = (await page.locator(".nh-buildmenu-reason").first().textContent().catch(() => null))?.trim();
  if (secondDisabled) pass(S, `Zweiter Baustart bleibt gesperrt, SELBST mit Debug-Kostenlos aktiv (Grund: "${secondReason}") — der Schalter wirkt nur auf Kosten, nicht auf Gates.`);
  else fail(S, "Mit Debug-Kostenlos aktiv ist ein zweiter Baustart trotz belegtem Bautrupp anklickbar — Debug-Schalter hebt mehr als nur Kosten auf!");
  await setDebugFree(false);

  // Bestätigung über die LISTEN-Ansicht: dieselbe Sperre muss dort ebenfalls sichtbar sein.
  await page.locator(".nh-view-tabbar .nh-view-tab").nth(1).click();
  await page.waitForTimeout(200);
  const blockedTexts = await page.locator(".nh-blocked").allTextContents();
  if (blockedTexts.some((t) => t.trim().length > 0)) pass(S, `Listenansicht zeigt denselben Sperr-Grund auf mind. einer Karte (Beispiel: "${blockedTexts.find((t) => t.trim())}").`);
  else fail(S, "Keine Baukarte in der Listenansicht zeigt einen Sperr-Grund, obwohl der Bautrupp gerade belegt ist.");

  await page.close();
}

async function sectionCapacityAndParity(browser) {
  const S = "Kapazität + Liste↔Karte Kostenparität";
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await openNewHaven(page);
  const capText = (await page.locator(".nh-capacity").textContent())?.trim() ?? "";
  info(S, `Kapazitätsanzeige-Text: "${capText}"`);
  if (/6/.test(capText) && /9/.test(capText)) pass(S, "Kapazitätsanzeige enthält die erwarteten Zahlen 6 (belegt) und 9 (Zentralhaus II).");
  else fail(S, `Kapazitätsanzeige "${capText}" enthält nicht die erwarteten Zahlen 6/9.`);

  // Kostenparität: erstes Baumenü-Item (Kartenansicht) vs. dieselbe Karte in der Listenansicht.
  const menuItem = page.locator(".nh-buildmenu-item").first();
  const menuName = (await menuItem.locator(".nh-buildmenu-name").textContent())?.trim();
  const menuCosts = (await menuItem.locator(".nh-buildmenu-cost").allTextContents()).map((t) => t.trim());
  await page.locator(".nh-view-tabbar .nh-view-tab").nth(1).click();
  await page.waitForTimeout(200);
  const listCard = page.locator(".nh-card", { hasText: menuName ?? "____none____" }).first();
  const listCardCount = await listCard.count();
  if (listCardCount === 0) {
    fail(S, `Karte "${menuName}" in der Listenansicht nicht wiedergefunden — Parität nicht prüfbar.`);
  } else {
    const goldText = (await listCard.locator(".nh-cost-gold").first().textContent())?.trim();
    info(S, `Baumenü "${menuName}" Kosten: [${menuCosts.join(", ")}] · Liste Gold-Kosten: "${goldText}".`);
    const menuGoldNum = menuCosts.map((t) => t.replace(/[^\d]/g, "")).find((t) => t.length > 0);
    const listGoldNum = goldText?.replace(/[^\d]/g, "");
    if (menuGoldNum && listGoldNum && menuGoldNum === listGoldNum) {
      pass(S, `Gold-Kosten stimmen zwischen Baumenü (${menuGoldNum}) und Liste (${listGoldNum}) überein.`);
    } else {
      info(S, `Gold-Zahlen-Abgleich unsicher (Baumenü "${menuGoldNum}" vs. Liste "${listGoldNum}") — manuell verifizieren, Format evtl. unterschiedlich (Icon-Reihenfolge).`);
    }
  }
  await page.close();
}

async function sectionMoveMode(browser) {
  const S = "Move-Modus: Auswahl bei Überlappung + Werkzeugleiste";
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await openNewHaven(page);
  await setLightPhase(page, "day");
  const rect = await mapRect(page);

  await page.click(".nh-move-toggle");
  await page.waitForTimeout(150);
  const moveModeOn = await page.locator(".nh-map.is-move-mode").count();
  if (moveModeOn > 0) pass(S, "Move-Umschalter setzt die Karte in den Move-Modus.");
  else fail(S, "Move-Modus wurde nach Klick auf den Umschalter nicht sichtbar.");

  // Storehouse-EXKLUSIVER Punkt (nicht von trophy_wall überdeckt) anklicken.
  const storeOnly = expectedCenterPx(rect, { x: 0.43, y: 0.50 });
  await page.mouse.click(storeOnly.x, storeOnly.y);
  await page.waitForTimeout(150);
  let sel = await tileCenterPx(page, "camp_storehouse");
  const selEl1 = await page.locator(".nh-map-tile.is-selected").first();
  const selCount1 = await page.locator(".nh-map-tile.is-selected").count();
  if (selCount1 > 0) {
    const box1 = await selEl1.boundingBox();
    const cx = box1.x + box1.width / 2, cy = box1.y + box1.height / 2;
    const dStore = Math.hypot(cx - sel.expected.x, cy - sel.expected.y);
    if (dStore < 6) pass(S, "Klick auf den storehouse-exklusiven Bereich wählt camp_storehouse aus (Werkzeugleiste erscheint dort).");
    else fail(S, `Klick auf den storehouse-exklusiven Bereich wählte ein anderes Gebäude aus (Distanz zu storehouse ${dStore.toFixed(1)}px).`);
  } else {
    fail(S, "Kein Gebäude nach Klick auf storehouse-exklusiven Bereich ausgewählt.");
  }
  const toolsVisible1 = await page.locator(".nh-map-object-tools").count();
  if (toolsVisible1 > 0) pass(S, "Werkzeugleiste erscheint nach Auswahl.");
  else fail(S, "Werkzeugleiste erscheint NICHT nach Auswahl eines Gebäudes im Move-Modus.");

  // Move-Modus aus/an, um selectedId sauber zurückzusetzen, dann den Überlappungsbereich klicken
  // (sollte das VORDERE Gebäude camp_trophy_wall treffen, obwohl storehouse an derselben Stelle
  // ebenfalls eine Bühne hat).
  await page.click(".nh-move-toggle");
  await page.waitForTimeout(100);
  await page.click(".nh-move-toggle");
  await page.waitForTimeout(100);
  const overlapPt = expectedCenterPx(rect, { x: 0.52, y: 0.55 });
  await page.mouse.click(overlapPt.x, overlapPt.y);
  await page.waitForTimeout(150);
  const trophyExp = await tileCenterPx(page, "camp_trophy_wall");
  const selCount2 = await page.locator(".nh-map-tile.is-selected").count();
  if (selCount2 > 0) {
    const box2 = await page.locator(".nh-map-tile.is-selected").first().boundingBox();
    const cx2 = box2.x + box2.width / 2, cy2 = box2.y + box2.height / 2;
    const dTrophy = Math.hypot(cx2 - trophyExp.expected.x, cy2 - trophyExp.expected.y);
    if (dTrophy < 6) pass(S, "Klick im Überlappungsbereich trifft das VORDERE Gebäude camp_trophy_wall — das hintere camp_storehouse ist über den freien Bereich weiterhin separat erreichbar.");
    else fail(S, `Klick im Überlappungsbereich wählte NICHT camp_trophy_wall aus (Distanz ${dTrophy.toFixed(1)}px) — unerwartetes Trefferverhalten bei Überlappung.`);
  } else {
    fail(S, "Kein Gebäude nach Klick in den Überlappungsbereich ausgewählt.");
  }
  await page.screenshot({ path: join(__dirname, "newhaven-335-movemode-overlap.png") });

  // Werkzeugleiste skaliert NICHT mit dem Sprite: Bounding-Box vor/nach Slider-Änderung vergleichen.
  const toolsBox = page.locator(".nh-map-object-tools");
  if (await toolsBox.count() > 0) {
    const before = await toolsBox.boundingBox();
    const slider = page.locator(".nh-map-object-tools-slider");
    await slider.evaluate((el) => { el.value = "300"; el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); });
    await page.waitForTimeout(150);
    const after = await toolsBox.boundingBox();
    const dw = Math.abs(after.width - before.width);
    const dh = Math.abs(after.height - before.height);
    if (dw < 3 && dh < 3) pass(S, `Werkzeugleisten-Größe bleibt bei Skalierungsänderung stabil (Δw=${dw.toFixed(1)}px, Δh=${dh.toFixed(1)}px).`);
    else info(S, `Werkzeugleisten-Größe änderte sich leicht (Δw=${dw.toFixed(1)}px, Δh=${dh.toFixed(1)}px) — bei is-above/is-below-Neuausrichtung durch veränderten Sprite-Platzbedarf ggf. erwartbar, sonst prüfen.`);

    // Reset-Knopf: Skala muss auf den Rang-Standard zurückspringen (camp_trophy_wall ist NICHT in
    // der Kalibrier-Tabelle → Standard 100%).
    const resetBtn = page.locator(".nh-map-object-tools-foot button").last();
    await resetBtn.click();
    await page.waitForTimeout(150);
    const outputText = (await page.locator(".nh-map-object-tools-head output").textContent())?.trim();
    if (outputText === "100%") pass(S, `Reset-Knopf setzt die Skala auf den Rang-Standard zurück (Anzeige "${outputText}").`);
    else fail(S, `Reset-Knopf setzte die Skala auf "${outputText}" statt der erwarteten "100%".`);
  } else {
    fail(S, "Werkzeugleiste nach Überlappungs-Auswahl nicht sichtbar — Skalierungs-/Reset-Test übersprungen.");
  }

  await page.close();
}

async function sectionI18n(browser, locale) {
  const S = `i18n-Stichprobe (${locale})`;
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await openNewHaven(page, { locale });
  await setLightPhase(page, "day");
  await page.waitForTimeout(200);
  await page.screenshot({ path: join(__dirname, `newhaven-335-i18n-${locale}-map.png`) });

  const smelter = await tileCenterPx(page, "camp_smelter");
  if (smelter.best) { await smelter.best.el.click(); await page.waitForTimeout(450); }
  await page.screenshot({ path: join(__dirname, `newhaven-335-i18n-${locale}-popup.png`) });
  const closeBtn = page.locator(".nh-popup-close");
  if (await closeBtn.count() > 0) await closeBtn.click();

  await page.click(".nh-move-toggle");
  await page.waitForTimeout(100);
  const wt = await tileCenterPx(page, "camp_watchtower");
  if (wt.best) { await wt.best.el.click(); await page.waitForTimeout(150); }
  await page.screenshot({ path: join(__dirname, `newhaven-335-i18n-${locale}-movetools.png`) });

  // Rohe, unübersetzte Keys aufspüren: sichtbarer Text, der wie "newhaven.xyz.abc" aussieht.
  const rawKeys = await page.evaluate(() => {
    const root = document.querySelector(".newhaven-page");
    if (!root) return [];
    const out = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode())) {
      const t = n.textContent.trim();
      if (/^newhaven(\.[a-zA-Z0-9_]+){2,}$/.test(t)) out.push(t);
    }
    return out;
  });
  if (rawKeys.length === 0) pass(S, "Keine rohen i18n-Keys im sichtbaren Text von .newhaven-page gefunden.");
  else fail(S, `Rohe i18n-Keys sichtbar: ${rawKeys.join(", ")}`);

  const overflowing = await page.evaluate(() => {
    const out = [];
    const sel = ".nh-view-tab, .nh-capacity, .nh-buildmenu-name, .nh-map-tile-label, .nh-map-object-tools-head label, .nh-move-banner p, .nh-place-hint, .nh-place-reason";
    for (const el of document.querySelectorAll(sel)) {
      if (el.scrollWidth > el.clientWidth + 2) out.push({ cls: el.className, text: el.textContent.trim().slice(0, 60), scrollW: el.scrollWidth, clientW: el.clientWidth });
    }
    return out;
  });
  if (overflowing.length === 0) pass(S, "Keine Überläufe in Toolbar/Popup/Werkzeugleiste gefunden.");
  else for (const o of overflowing) fail(S, `Überlauf (${locale}): "${o.text}" (${o.cls}) scrollW=${o.scrollW} > clientW=${o.clientW}.`);

  await page.close();
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

async function sectionToastOverlap(browser, viewport) {
  // Fix-Welle New Haven #3: Onboarding-/Meilenstein-Toasts (`.toast-stack`, pages.css, fixed
  // bottom-right) legten sich auf Baumenü-Karten (`.nh-buildmenu-list` reicht bis an den
  // Seitenrand, s. `.nh-map-side{height:100%}`). Nutzt den bestehenden Dev-only
  // `?toastTest=rare`-Haken (Toasts.tsx) statt einen echten Drop abzuwarten — derselbe Kniff wie
  // combat-fx-shot-296.mjs. Der Test-Toast pusht nach 4.5s Verzögerung, bleibt 10s sichtbar.
  //
  // Prüft ALLE aktuell gerenderten Karten, nicht nur eine feste (z.B. dritte) — ein erster
  // Fix-Versuch (Toast-Stapel per `bottom` höher stapeln) bestand einen Check auf NUR die dritte
  // Karte, verlagerte das Überdecken dabei aber unbemerkt auf die ERSTE Karte (`.nh-buildmenu-list`
  // füllt praktisch die gesamte Seitenhöhe — es gibt keine "sichere" Y-Position für den Stapel,
  // nur eine sichere X-Position außerhalb der Baumenü-Spalte, s. finaler Fix in newhaven.css).
  const S = `Toast-Stapel vs. Baumenü @ ${viewport.label}`;
  const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
  await openNewHaven(page, { toastTest: "legendary" });
  await setLightPhase(page, "day");

  const items = page.locator(".nh-buildmenu-item");
  const itemCount = await items.count();
  if (itemCount === 0) {
    info(S, "Keine Baumenü-Karte sichtbar (Fixture-Stand) — Überlappungs-Check übersprungen.");
    await page.close();
    return;
  }

  await page.waitForSelector(".toast-stack .toast", { timeout: 9000 }).catch(() => {});
  const toastCount = await page.locator(".toast-stack .toast").count();
  if (toastCount === 0) {
    fail(S, "Test-Toast (?toastTest=legendary) erschien nicht innerhalb von 9s — Überlappungs-Check nicht möglich.");
    await page.close();
    return;
  }
  await page.waitForTimeout(150); // Fade-in der Toast-Stack-Animation abklingen lassen.
  await page.screenshot({ path: join(__dirname, `newhaven-335-toast-overlap-${viewport.label}.png`) });

  const cardBoxes = await items.evaluateAll(
    (els) => els.map((el) => el.getBoundingClientRect()).map((r) => ({ x: r.x, y: r.y, width: r.width, height: r.height })),
  );
  const toastBoxes = await page.locator(".toast-stack .toast").evaluateAll(
    (els) => els.map((el) => el.getBoundingClientRect()).map((r) => ({ x: r.x, y: r.y, width: r.width, height: r.height })),
  );
  if (cardBoxes.length === 0 || toastBoxes.length === 0) {
    fail(S, "Bounding-Box von Baumenü-Karte(n) oder Toast fehlt — Check konnte nicht auswerten.");
  } else {
    const hits = [];
    cardBoxes.forEach((c, idx) => {
      for (const t of toastBoxes) {
        if (rectsOverlap(c, t)) { hits.push({ idx, c, t }); break; }
      }
    });
    if (hits.length === 0) {
      pass(S, `Alle ${cardBoxes.length} sichtbaren Baumenü-Karten bleiben frei von allen ${toastBoxes.length} sichtbaren Toast(s).`);
    } else {
      const h = hits[0];
      fail(S, `${hits.length}/${cardBoxes.length} Baumenü-Karte(n) überlappen einen Toast (erste Kollision: Karte #${h.idx + 1} y=${h.c.y.toFixed(0)}..${(h.c.y + h.c.height).toFixed(0)}, Toast y=${h.t.y.toFixed(0)}..${(h.t.y + h.t.height).toFixed(0)}).`);
    }
  }

  await page.close();
}

async function sectionPerf(browser, viewport, windowMs) {
  const S = `Idle-Performance @ ${viewport.label}`;
  const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
  await openNewHaven(page);
  await setLightPhase(page, "day");
  await page.waitForTimeout(1000); // Settle
  const raw = await measurePerf(page, windowMs);
  const lt = stats(raw.longTasks);
  const fr = stats(raw.frameDeltas);
  const fps = fr.avg > 0 ? 1000 / fr.avg : 0;
  info(S, `${(windowMs / 1000).toFixed(0)}s Leerlauf: long-tasks n=${lt.count} sum=${lt.sum.toFixed(1)}ms max=${lt.max.toFixed(1)}ms · Frame avg=${fr.avg.toFixed(2)}ms (~${fps.toFixed(1)} FPS) max=${fr.max.toFixed(2)}ms`);
  if (lt.count === 0 && fr.avg < 20) pass(S, "Keine Long-Tasks, Frame-Zeiten nahe 60 FPS im Leerlauf.");
  else if (lt.count > 0) fail(S, `${lt.count} Long-Task(s) im Leerlauf auf der Karte (Summe ${lt.sum.toFixed(1)}ms) — die Karte rendert im Leerlauf spürbar durch.`);
  else info(S, `Frame-Zeiten im Leerlauf höher als erwartet (avg ${fr.avg.toFixed(2)}ms ≈ ${fps.toFixed(1)} FPS) — kein Long-Task, aber ggf. Beobachtung wert.`);
  await page.close();
}

async function main() {
  console.log(`[audit] starting dev server on port ${PORT}...`);
  const server = startDevServer(PORT);
  const up = await waitForServer(BASE_URL);
  if (!up) { console.error("DEV SERVER NOT UP:\n" + server.getOutput()); server.child.kill(); process.exitCode = 1; return; }

  const browser = await chromium.launch();
  // Jede Sektion ist unabhängig — ein Hänger/Absturz in EINER Sektion (z.B. ein hängender Klick)
  // soll die übrigen Befunde nicht verschlucken. Ein Absturz selbst ist dabei auch ein Befund.
  async function run(label, fn) {
    console.log(`\n===== ${label} =====`);
    try {
      await fn();
    } catch (err) {
      fail(label, `Sektion abgebrochen mit Ausnahme: ${err.message}`);
    }
  }
  try {
    await run("1) Karte: Projektion, Tiefensortierung, Skalierung/Spiegelung, Tag/Nacht", async () => {
      for (const vp of VIEWPORTS) await sectionProjectionAndDepth(browser, vp);
    });
    await run("2) Popup: Now/Next-Karten, Rahmen, interner Scroll", () => sectionSmelterPopupScroll(browser));
    await run("3) Bauen: Kartenrand-Gate + zweiter Baustart gesperrt (Debug-Kostenlos wirkt nur auf Kosten)", () => sectionBuildingGate(browser));
    await run("4) Kapazität + Liste<->Karte Kostenparität", () => sectionCapacityAndParity(browser));
    await run("5) Move-Modus: Auswahl bei Überlappung + Werkzeugleiste", () => sectionMoveMode(browser));
    await run("6) i18n-Stichprobe (de/zh/ru)", async () => {
      for (const locale of ["de", "zh", "ru"]) await sectionI18n(browser, locale);
    });
    await run("7) Idle-Performance auf der Karte", async () => {
      for (const vp of VIEWPORTS) await sectionPerf(browser, vp, 10000);
    });
    await run("8) Toast-Stapel vs. Baumenü (Fix-Welle New Haven #3)", async () => {
      for (const vp of VIEWPORTS) await sectionToastOverlap(browser, vp);
    });
  } finally {
    await browser.close();
    server.child.kill();
  }

  const failCount = findings.filter((f) => f.level === "FAIL").length;
  const passCount = findings.filter((f) => f.level === "PASS").length;
  console.log(`\n[audit] done. PASS=${passCount} FAIL=${failCount} INFO=${findings.filter((f) => f.level === "INFO").length}`);
  if (failCount > 0) {
    console.log("\n=== FAIL-Zusammenfassung ===");
    for (const f of findings.filter((x) => x.level === "FAIL")) console.log(`  - [${f.section}] ${f.msg}`);
  }
}

main().catch((err) => {
  console.error("[audit] fatal:", err);
  process.exitCode = 1;
});
