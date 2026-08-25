/**
 * Steam-Review 25.08.2026: "The bank does seem to be an issue, as you can only view part of a row
 * to see what you are doing." und "I did not have full screen on, and it made parts of the screen
 * unreachable."
 *
 * Reproduktion in drei Fenstergroessen: 1920x1080 (Vollbild-Referenz), 1920x1017 (1080p-Monitor im
 * Fenstermodus: Titelleiste + Taskleiste fressen ~63 px) und 1600x900 / 1366x768. Gemessen wird das
 * Bank-Raster: sichtbare Hoehe des Scroll-Containers, Zeilenhoehe, wie viele Zeilen ganz sichtbar
 * sind, und ob eine Zeile am unteren Rand angeschnitten ist. Dazu, ob die Seite selbst unter den
 * Fensterrand laeuft (document.scrollingElement.scrollHeight > innerHeight ohne Scrollmoeglichkeit).
 */
import { startHarness } from "./sim-harness.mjs";

const h = await startHarness({ port: 5396, fixture: "midgame", locale: "de" });
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
  for (const [w, hh] of [[1920, 1080], [1920, 1017], [1600, 900], [1366, 768]]) {
    await page.setViewportSize({ width: w, height: hh });
    await page.waitForTimeout(1200);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    if (w === 1920 && hh === 1080) console.log("BEFUND nav:", await zuSeite(/^bank$/i));
    await page.waitForTimeout(900);

    const m = await page.evaluate(() => {
      const zellen = [...document.querySelectorAll(".bank-grid .inv-slot, .bank-grid .item-cell, .bank-slots .inv-slot, .bank-cell, .shop-cell")];
      if (!zellen.length) return { fehler: "keine Bankzellen gefunden" };
      // Den naechsten scrollenden Vorfahren finden
      let el = zellen[0].parentElement;
      let scroller = null;
      while (el && el !== document.body) {
        const cs = getComputedStyle(el);
        if (/(auto|scroll)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 1) { scroller = el; break; }
        el = el.parentElement;
      }
      const r0 = zellen[0].getBoundingClientRect();
      const zeileH = Math.round(r0.height);
      // Zeilen: Zellen nach y gruppieren
      const ys = [...new Set(zellen.map((z) => Math.round(z.getBoundingClientRect().y)))].sort((a, b) => a - b);
      const vh = window.innerHeight;
      const sichtbarGanz = ys.filter((y) => y >= 0 && y + zeileH <= vh).length;
      const angeschnitten = ys.filter((y) => y < vh && y + zeileH > vh).length;
      const sr = scroller ? scroller.getBoundingClientRect() : null;
      return {
        zellen: zellen.length,
        zeileH,
        zeilenGesamt: ys.length,
        zeilenGanzSichtbar: sichtbarGanz,
        zeilenAngeschnitten: angeschnitten,
        scroller: scroller ? { cls: scroller.className.slice(0, 60), y: Math.round(sr.y), h: Math.round(sr.height), scrollH: scroller.scrollHeight, unten: Math.round(sr.bottom) } : null,
        seite: { innerH: vh, docScrollH: document.scrollingElement.scrollHeight, bodyOverflowY: getComputedStyle(document.body).overflowY, rootOverflowY: getComputedStyle(document.documentElement).overflowY },
      };
    });
    console.log(`BEFUND ${w}x${hh}:`, JSON.stringify(m));
    await page.screenshot({ path: `ui-audit/shots-bank-fenster/bank-${w}x${hh}.png` });
  }
} finally {
  await h.stop();
}
