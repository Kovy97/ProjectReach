// Task #336: Combat-Sektion (Character-Screen) skaliert bei 1920×1080 kaputt (Overlap SET BONUS
// über Stat-Zeilen), während 3440×1440 (Chef-Fix 2026-07-24) gut aussehen soll. Misst reale
// Zeilenhöhen/Font-Größen/Line-Boxen/Overlaps bei beiden Auflösungen + einem Schmal-Fenster
// (Fallback-Regression-Check @media max-width:600px), VOR und NACH dem Fix (--tag steuert den
// Screenshot-Dateinamen-Suffix).
//
// Update (mitten in der Session): ein PARALLELER Task #340 (Chef-Char-Screen-1080p) hat WÄHREND
// dieser Messung .cs-col-mid-stack von "zwei gestapelte Container" auf "ein Tab-Panel
// (Ausrüstung|Stats)" umgebaut (character.css TASK #340-Block am Dateiende, CharacterPage.tsx/
// components/EquipmentOverview.tsx CombatStatsPanelGrouped) — koordiniert, NICHT meine
// Zonen (.cs-col-stats .cs-stat-row/-label/-val/-icon ~Z.1515-1535, .cs-section-title ~Z.950-960)
// angefasst, reused nur dieselben Klassen. Zwei Konsequenzen für dieses Skript:
//  1) Die Kampfwerte-Sektion ist erst im DOM, NACHDEM der "Stats"-Tab angeklickt wurde (vorher
//     default-Tab "Ausrüstung") — s. gotoStatsTab() unten.
//  2) Es gibt jetzt DREI `.cs-combat-grid` (Offensive/Defensive/Tempo&Krit-Gruppen) statt einer
//     einzigen — measure()/stressInject() iterieren über alle.
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5241;
const BASE = `http://localhost:${PORT}`;
const TAG = process.argv.includes("--tag") ? process.argv[process.argv.indexOf("--tag") + 1] : "run";

const viteBin = join(CLIENT_DIR, "node_modules", "vite", "bin", "vite.js");
const child = spawn(
  process.execPath,
  [viteBin, "dev", "--config", join(__dirname, "vite.tour.config.mjs"), "--port", String(PORT), "--strictPort"],
  { cwd: CLIENT_DIR, stdio: ["ignore", "pipe", "pipe"] },
);
const up = async () => {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(BASE)).ok) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
};

const VIEWPORTS = [
  { name: "1920x1080", width: 1920, height: 1080 },
  { name: "3440x1440", width: 3440, height: 1440 },
  { name: "narrow500", width: 500, height: 900 },
];

/** Klickt (falls vorhanden) den "Stats"-Tab der neuen Task-#340-Tableiste — auf sehr alten
 *  Build-Ständen ohne den Umbau ist der Selector einfach leer (kein Fehler, No-Op), das Panel war
 *  dort ohnehin immer im DOM. */
async function gotoStatsTab(page) {
  const tab = page.locator("#cs-tab-stats");
  if (await tab.count()) {
    try {
      await tab.click({ timeout: 5000 });
    } catch {
      // Schmal-Layout (~500px): ein anderes Element deckt den Tab-Button an seinen Koordinaten ab
      // (separater, vermutlich vorbestehender .cs-layout-Grid-Zeilenhöhen-Bug bei ≤600px, außerhalb
      // dieses Tasks' Zonen — Playwrights `force:true` dispatcht trotzdem an den echten Hit-Test-
      // Treffer, nicht ans Zielelement). DOM-`.click()` per evaluate umgeht Hit-Testing komplett
      // und triggert Reacts synthetisches onClick trotzdem — reicht für diese Messung.
      await page.evaluate(() => (document.getElementById("cs-tab-stats"))?.click());
    }
    await page.waitForTimeout(200);
  }
}

async function measure(page) {
  return page.evaluate(() => {
    const px = (v) => Math.round(v * 100) / 100;
    const rectOf = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { top: px(r.top), bottom: px(r.bottom), left: px(r.left), right: px(r.right), width: px(r.width), height: px(r.height) };
    };
    const csOf = (el, props) => {
      if (!el) return null;
      const cs = getComputedStyle(el);
      const out = {};
      for (const p of props) out[p] = cs.getPropertyValue(p);
      return out;
    };
    const statsScroll = document.querySelector(".cs-col-stats .cs-stats-scroll");
    // Task #340: mehrere Gruppen-Grids (Offensive/Defensive/Tempo&Krit) statt eines einzigen.
    const grids = [...document.querySelectorAll(".cs-col-stats .cs-combat-grid")];
    const rows = grids.flatMap((g) => [...g.querySelectorAll(".cs-stat-row")]);
    const headings = [...document.querySelectorAll(".cs-col-stats .cs-section-title")];
    const setGroup = document.querySelector(".cs-col-stats .cs-tab-setbonus-group");
    const setRows = [...document.querySelectorAll(".cs-col-stats .set-row")];

    const rowDetails = rows.map((row) => {
      const label = row.querySelector(".cs-stat-label");
      const val = row.querySelector(".cs-stat-val");
      const icon = row.querySelector(".cs-stat-icon");
      const rowRect = rectOf(row);
      const labelRect = rectOf(label);
      const valRect = rectOf(val);
      const iconRect = rectOf(icon);
      // Overflow = Kind-Rect ragt oben/unten über das eigene Row-Rect hinaus.
      const overflowTop = (r) => (r ? px(rowRect.top - r.top) : null);
      const overflowBottom = (r) => (r ? px(r.bottom - rowRect.bottom) : null);
      return {
        text: label ? label.textContent : null,
        rowRect,
        label: label ? { rect: labelRect, cs: csOf(label, ["font-size", "line-height"]), overflowTop: overflowTop(labelRect), overflowBottom: overflowBottom(labelRect) } : null,
        val: val ? { rect: valRect, cs: csOf(val, ["font-size", "line-height"]), overflowTop: overflowTop(valRect), overflowBottom: overflowBottom(valRect) } : null,
        icon: icon ? { rect: iconRect, cs: csOf(icon, ["width", "height"]) } : null,
      };
    });

    // Overlap-Check: SET-BONUS-Gruppe-Oberkante < unterste sichtbare Text-Unterkante irgendeiner
    // Kampfwert-Zeile (unabhängig davon, in welcher der drei Gruppen)?
    let maxRowContentBottom = -Infinity;
    for (const rd of rowDetails) {
      if (rd.label) maxRowContentBottom = Math.max(maxRowContentBottom, rd.label.rect.bottom);
      if (rd.val) maxRowContentBottom = Math.max(maxRowContentBottom, rd.val.rect.bottom);
    }
    const setGroupRect = rectOf(setGroup);
    const overlapPx = setGroupRect ? px(maxRowContentBottom - setGroupRect.top) : null;

    return {
      statsScroll: { rect: rectOf(statsScroll), scrollHeight: statsScroll?.scrollHeight, clientHeight: statsScroll?.clientHeight },
      gridCount: grids.length,
      gridRects: grids.map((g) => rectOf(g)),
      rowCount: rows.length,
      rows: rowDetails,
      sectionTitles: headings.map((h) => ({ text: h.textContent, cs: csOf(h, ["font-size", "line-height"]), rect: rectOf(h) })),
      setGroupRect,
      setRowCount: setRows.length,
      maxRowContentBottom: Number.isFinite(maxRowContentBottom) ? px(maxRowContentBottom) : null,
      overlapPx, // > 0 = SET-BONUS-Gruppe überlappt (roh, ohne Berücksichtigung von overflow:hidden-Clipping) mit Kampfwert-Text
    };
  });
}

// Worst-case-Stress: reale Fixtures (midgame/endgame) haben typischerweise nur 5-8 Zeilen/Gruppe
// und KEIN aktives Set (also keine SET-BONUS-Gruppe) — das echte Chef-Save, das den Bug zeigte,
// hatte offensichtlich mehr UND ein aktives Set. Statt ein Fixture dafür zu konstruieren (Engine-
// Innereien), klonen wir echte .cs-stat-row-Elemente im echten DOM hoch (reiner Layout-/CSS-Test)
// und hängen — falls nicht ohnehin durch ein echtes Set vorhanden — eine synthetische SET-BONUS-
// Gruppe an. Task #340: iteriert über ALLE drei Gruppen-Grids, prüft `.cs-tab-setbonus-group`
// (nicht mehr `.cs-section-heading` — davon gibt's jetzt drei reale, je Gruppe eine).
async function stressInject(page) {
  return page.evaluate(() => {
    const grids = [...document.querySelectorAll(".cs-col-stats .cs-combat-grid")];
    if (!grids.length) return { ok: false };
    for (const grid of grids) {
      const cols = [...grid.querySelectorAll(".cs-combat-col")];
      for (const col of cols) {
        const last = col.querySelector(".cs-stat-row:last-child");
        if (!last) continue;
        while (col.querySelectorAll(".cs-stat-row").length < 11) {
          col.appendChild(last.cloneNode(true));
        }
      }
    }
    const scroll = document.querySelector(".cs-col-stats .cs-stats-scroll");
    if (scroll && !scroll.querySelector(".cs-tab-setbonus-group")) {
      const group = document.createElement("div");
      group.className = "cs-tab-setbonus-group";
      group.innerHTML =
        '<div class="cs-section-heading"><span class="cs-section-line"></span><span class="cs-section-title">SET BONUS</span><span class="cs-section-line"></span></div>' +
        '<div class="set-row"><span class="set-name">✦ Stress-Test-Set</span><span class="set-bonus muted">+5 STR, +5 KON</span></div>';
      scroll.appendChild(group);
    }
    return { ok: true };
  });
}

try {
  if (!(await up())) throw new Error("vite down");
  const browser = await chromium.launch();
  for (const vp of VIEWPORTS) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    await page.goto(`${BASE}/?fixture=midgame`, { waitUntil: "load" });
    await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
    await page.waitForTimeout(2500);
    await page.locator('[data-guide-id="topbar.character"]').first().click();
    await page.waitForTimeout(600);
    await gotoStatsTab(page);
    const report = await measure(page);
    console.log(`\n=== ${vp.name} (${TAG}) ===`);
    console.log(JSON.stringify(report, null, 1));
    await page.screenshot({ path: join(__dirname, `combat-scale-336-${vp.name}-${TAG}.png`) });

    await stressInject(page);
    await page.waitForTimeout(150);
    const stressReport = await measure(page);
    console.log(`\n=== ${vp.name} STRESS (${TAG}) ===`);
    console.log(JSON.stringify(stressReport, null, 1));
    await page.screenshot({ path: join(__dirname, `combat-scale-336-${vp.name}-stress-${TAG}.png`) });

    if (vp.name === "narrow500") {
      const dbg = await page.evaluate(() => {
        const all = [...document.querySelectorAll(".cs-col-stats")];
        return all.map((el) => {
          const r = el.getBoundingClientRect();
          return { rect: { top: r.top, bottom: r.bottom, left: r.left, width: r.width, height: r.height }, display: getComputedStyle(el).display, visibility: getComputedStyle(el).visibility };
        });
      });
      console.log(`\n=== narrow500 .cs-col-stats ALL MATCHES (${TAG}) ===`);
      console.log(JSON.stringify(dbg, null, 1));
      // Schmal-Fallback-Regressionscheck (@media max-width:600px, Z.2440ff): .cs-col-mid-stack
      // stapelt bei 500px Fensterbreite Charakter/Panel/Inventar vertikal (äußere .cs-layout-
      // Stapelung) — das Panel ist entsprechend schmal. Element-Screenshot statt Viewport-
      // Screenshot, damit es unabhängig vom Scroll-Zustand sichtbar wird.
      const statsEl = page.locator(".cs-col-stats").last();
      await statsEl.scrollIntoViewIfNeeded();
      await page.waitForTimeout(200);
      await statsEl.screenshot({ path: join(__dirname, `combat-scale-336-narrow500-statscol-${TAG}.png`) });
    }

    await page.close();
  }

  // Equipment-Tab im Combat-Log gegenprüfen (nutzt .equip-overview OHNE .cs-col-stats — darf sich
  // nicht verändert haben, und ist von Task #340 (nur CharacterPage-Tabs) unberührt). .battle-log-
  // panel rendert erst WÄHREND eines echten Kampfs (inCombat, s. CombatPage.tsx ~Z.5085). Ein
  // simpler Linksklick auf ein Mengen-Preset ruft `onQueue(target, atFront=false)` ->
  // `enqueueFight` auf, das nur HINTEN anreiht (state.combat.monsterId bleibt null, <Battle>
  // mountet nie — 10s-Timeout, real beobachtet). Etablierter Fix aus combat-log-resize-333.mjs:
  // SHIFT-Klick auf den "∞"-Knopf -> atFront=true -> `enqueueFightAtFront` startet sofort.
  const page2 = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page2.goto(`${BASE}/?fixture=midgame`, { waitUntil: "load" });
  await page2.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
  await page2.waitForTimeout(2500);
  await page2.locator('[data-guide-id="sidebar.combat"]').first().click();
  await page2.waitForTimeout(600);
  await page2.locator(".zone-card").first().click();
  await page2.waitForTimeout(1200);
  await page2.locator(".monster-card").first().locator(".qty-picker-btn--infinite").click({ modifiers: ["Shift"] });
  await page2.waitForSelector(".battle", { timeout: 10000 });
  await page2.waitForTimeout(600);
  // App läuft standardmäßig auf Deutsch ("Ausrüstung") — Klasse statt Text (locale-unabhängig).
  const equipTabBtn = page2.locator(".battle-log-tabs .battle-log-tab").nth(1);
  await equipTabBtn.click({ timeout: 6000 });
  await page2.waitForTimeout(400);
  const equipReport = await page2.evaluate(() => {
    const el = document.querySelector(".equip-overview .cs-stat-row");
    if (!el) return null;
    const label = el.querySelector(".cs-stat-label");
    const val = el.querySelector(".cs-stat-val");
    const rows = document.querySelectorAll(".equip-overview .cs-stat-row");
    const r = el.getBoundingClientRect();
    return {
      found: true,
      rowCount: rows.length,
      rowRect: { top: r.top, height: r.height },
      containerType: getComputedStyle(el).containerType,
      labelCS: label ? { fontSize: getComputedStyle(label).fontSize, lineHeight: getComputedStyle(label).lineHeight } : null,
      valCS: val ? { fontSize: getComputedStyle(val).fontSize, lineHeight: getComputedStyle(val).lineHeight } : null,
    };
  });
  console.log(`\n=== equip-overview (${TAG}) ===`);
  console.log(JSON.stringify(equipReport, null, 1));
  await page2.screenshot({ path: join(__dirname, `combat-scale-336-equipoverview-${TAG}.png`) });
  await page2.close();

  await browser.close();
} finally {
  child.kill();
}
