/**
 * Beleg-Aufnahmen NACHHER (Chef-Auftrag 25.08.2026): Doing-Kasten breiter+zentriert, die zwei
 * Segment-Leisten (Aktion + Skill-Level-XP) stecken jetzt IM Kasten unter dem "Doing: X"-Text.
 * 3 Aufloesungen x 2 Zustaende (Skilling / Kampf) + Ueberlauf-Messung.
 */
import { startHarness } from "./sim-harness.mjs";

const RES = [
  { name: "1920x1080", width: 1920, height: 1080 },
  { name: "1600x900", width: 1600, height: 900 },
  { name: "1366x768", width: 1366, height: 768 },
];

const OUT = "ui-audit/shots-doing-container";

async function measure(page) {
  return page.evaluate(() => {
    const box = document.querySelector(".gamestats-row--activity");
    const bars = document.querySelector(".gamestats-activity-bars");
    const tbBars = Array.from(document.querySelectorAll(".gamestats-row--activity .tb-bar"));
    const labelCenters = Array.from(document.querySelectorAll(".gamestats-row--activity .tb-bar-label-center"));
    const row = document.querySelector(".content-header-row");
    const meta = document.querySelector(".gamestats-row--meta");
    const charinfo = document.querySelector(".header-charinfo");
    const rect = (el) => el ? (() => { const r = el.getBoundingClientRect(); return { x: r.x, w: r.width, h: r.height }; })() : null;
    return {
      box: box ? { w: box.getBoundingClientRect().width, h: box.getBoundingClientRect().height, scrollW: box.scrollWidth, clientW: box.clientWidth, scrollH: box.scrollHeight, clientH: box.clientHeight } : null,
      bars: rect(bars),
      tbBarCount: tbBars.length,
      tbBarOverflow: tbBars.map((b) => ({ scrollW: b.scrollWidth, clientW: b.clientWidth })),
      labelOverflow: labelCenters.map((l) => ({ scrollW: l.scrollWidth, clientW: l.clientWidth, text: l.textContent })),
      row: rect(row),
      meta: rect(meta),
      charinfo: rect(charinfo),
      bodyScrollW: document.body.scrollWidth,
      bodyClientW: document.body.clientWidth,
    };
  });
}

for (const res of RES) {
  const h = await startHarness({ port: 5387, fixture: "midgame", locale: "de", viewport: { width: res.width, height: res.height } });
  const { page } = h;
  try {
    await page.waitForTimeout(1400);
    await page.keyboard.press("Escape");

    // ── Skilling-Zustand ──
    await page.screenshot({ path: `${OUT}/after-${res.name}-skilling.png` });
    console.log(`BEFUND after ${res.name} skilling:`, JSON.stringify(await measure(page)));

    // ── Kampf-Zustand erzwingen ──
    await page.evaluate(() => {
      const s = window.__hfDebug.state;
      s.actionQueue = [{ kind: "fight", monsterId: "chicken", target: 3 }];
      s.queuePaused = false;
      s.activeActionId = null;
    });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${OUT}/after-${res.name}-combat.png` });
    console.log(`BEFUND after ${res.name} combat:`, JSON.stringify(await measure(page)));

    if (h.errors.length) console.log(`BEFUND after ${res.name} page-errors:`, JSON.stringify(h.errors));
  } finally {
    await h.stop();
  }
}
