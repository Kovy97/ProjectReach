/**
 * Steam-Review 25.08.2026: "Be sure to play at the recommended fullscreen at 1920x1080 ... The
 * bank does seem to be an issue, as you can only view part of a row to see what you are doing."
 *
 * Nachfolger von bank-fenster-shot.mjs (Fehler dort: die Zellensuche traf das INVENTAR-Raster
 * statt des LAGERS, weil ".bank-grid .inv-slot" beide Spalten matcht und querySelectorAll das
 * erste Dokument-Vorkommen liefert — das ist links das Inventar). Hier: explizit das LETZTE
 * ".bank-grid.bank-ledger-list" (= die Lager-Spalte rechts, "bank-ledger-panel--storage").
 *
 * Misst zusätzlich die Sidebar (Befund B: Einträge unter der Fensterkante ohne Scroll-Hinweis)
 * in denselben vier Fenstergrößen — ein Durchlauf für beide Befunde.
 */
import { startHarness } from "./sim-harness.mjs";

const h = await startHarness({ port: 5398, fixture: "midgame", locale: "de" });
const { page } = h;

async function zuSeite(muster) {
  const nav = page.locator('.sidebar-btn, [data-guide-id^="sidebar."], [data-guide-id^="topbar."]');
  const n = await nav.count();
  for (let i = 0; i < n; i++) {
    const txt = ((await nav.nth(i).textContent()) ?? "").trim();
    if (muster.test(txt)) { await nav.nth(i).click(); return txt; }
  }
  return null;
}

try {
  // Lager mit 60 stapelbaren Items füllen (Auftrag: realistische Fülle statt Leerraster).
  await page.evaluate(() => {
    const s = window.__hfDebug.state;
    const ids = Object.keys(window.__hfDebug.content.items)
      .filter((i) => window.__hfDebug.content.items[i].stackable)
      .slice(0, 60);
    for (const id of ids) s.bank[id] = 10;
  });

  const sizes = [[1920, 1080], [1920, 1017], [1600, 900], [1366, 768]];

  for (const [w, hh] of sizes) {
    await page.setViewportSize({ width: w, height: hh });
    await page.waitForTimeout(1000);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    if (w === 1920 && hh === 1080) console.log("BEFUND nav:", await zuSeite(/^bank$/i));
    await page.waitForTimeout(900);

    const m = await page.evaluate(() => {
      const grids = [...document.querySelectorAll(".bank-grid.bank-ledger-list")];
      const g = grids[grids.length - 1]; // LETZTES Raster = Lager (bank-ledger-panel--storage)
      if (!g) return { fehler: "kein Lager-Raster gefunden", gridsGefunden: grids.length };
      const zellen = [...g.querySelectorAll(".inv-slot")];
      const cs = getComputedStyle(g);
      const r = g.getBoundingClientRect();
      const vh = window.innerHeight;
      const zeileH = zellen.length ? Math.round(zellen[0].getBoundingClientRect().height) : 0;
      const ys = [...new Set(zellen.map((z) => Math.round(z.getBoundingClientRect().y)))].sort((a, b) => a - b);
      const ganzSichtbar = ys.filter((y) => y >= r.top - 1 && y + zeileH <= r.bottom + 1).length;
      const angeschnitten = ys.filter((y) => y < r.bottom && y + zeileH > r.bottom + 1).length;
      // Scrollbar sichtbar? Vergleiche clientWidth vs. offsetWidth des Rasters (Differenz = Scrollbar-Spurbreite)
      const scrollbarBreite = g.offsetWidth - g.clientWidth;
      return {
        zellen: zellen.length,
        rasterHoehe: Math.round(r.height),
        zeileH,
        zeilenGesamt: ys.length,
        zeilenGanzSichtbar: ganzSichtbar,
        zeilenAngeschnitten: angeschnitten,
        scrollHeight: g.scrollHeight,
        clientHeight: g.clientHeight,
        scrollbarBreite,
        overflowY: cs.overflowY,
        innerH: vh,
      };
    });
    console.log(`BANK ${w}x${hh}:`, JSON.stringify(m));
    await page.screenshot({ path: `ui-audit/shots-bank-fenster/v2-bank-${w}x${hh}.png` });
  }

  // ── Sidebar ──
  for (const [w, hh] of sizes) {
    await page.setViewportSize({ width: w, height: hh });
    await page.waitForTimeout(800);
    const m = await page.evaluate(() => {
      const btns = [...document.querySelectorAll(".sb-nav .sb-skill-btn, .sb-nav .sb-combat-btn-row")];
      const vh = window.innerHeight;
      const unten = btns
        .filter((b) => b.getBoundingClientRect().bottom > vh)
        .map((b) => (b.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 22));
      const nav = document.querySelector(".sb-nav");
      const namen = [...document.querySelectorAll(".sb-skill-name")];
      let minFont = Infinity;
      for (const n of namen) {
        const fs = parseFloat(getComputedStyle(n).fontSize);
        if (fs < minFont) minFont = fs;
      }
      const sbScaleEff = getComputedStyle(document.querySelector(".sidebar")).getPropertyValue("--sb-scale-eff").trim();
      const scrollbarBreite = nav ? nav.offsetWidth - nav.clientWidth : null;
      return {
        knoepfe: btns.length,
        unterhalbFold: unten,
        unterhalbFoldAnzahl: unten.length,
        navScrollH: nav?.scrollHeight ?? null,
        navClientH: nav?.clientHeight ?? null,
        navKannScrollen: nav ? nav.scrollHeight > nav.clientHeight + 1 : null,
        scrollbarBreite,
        sbScaleEff,
        minFontSizePx: Number.isFinite(minFont) ? Math.round(minFont * 100) / 100 : null,
        innerH: vh,
      };
    });
    console.log(`SIDEBAR ${w}x${hh}:`, JSON.stringify(m));
    await page.screenshot({ path: `ui-audit/shots-bank-fenster/v2-sidebar-${w}x${hh}.png` });
  }

  // Russisch bei 1366x768 gegenprüfen (längste Texte)
} finally {
  await h.stop();
}
