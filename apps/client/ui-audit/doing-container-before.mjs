/**
 * Beleg-Aufnahmen VORHER (Chef-Auftrag 25.08.2026): Doing-Kasten schmal, Balken darunter separat.
 * 3 Aufloesungen x 2 Zustaende (Skilling / Kampf).
 */
import { startHarness } from "./sim-harness.mjs";

const RES = [
  { name: "1920x1080", width: 1920, height: 1080 },
  { name: "1600x900", width: 1600, height: 900 },
  { name: "1366x768", width: 1366, height: 768 },
];

const OUT = "ui-audit/shots-doing-container";

for (const res of RES) {
  const h = await startHarness({ port: 5387, fixture: "midgame", locale: "de", viewport: { width: res.width, height: res.height } });
  const { page } = h;
  try {
    await page.waitForTimeout(1400);
    await page.keyboard.press("Escape");

    // ── Skilling-Zustand (Fixture-Default: laeuft bereits eine Aktion) ──
    await page.screenshot({ path: `${OUT}/before-${res.name}-skilling.png` });
    const skillBox = await page.evaluate(() => {
      const el = document.querySelector(".gamestats-row--activity");
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { w: r.width, h: r.height, scrollW: el.scrollWidth, clientW: el.clientWidth };
    });
    console.log(`BEFUND before ${res.name} skilling gamestats-row--activity:`, JSON.stringify(skillBox));

    // ── Kampf-Zustand erzwingen ──
    await page.evaluate(() => {
      const s = window.__hfDebug.state;
      s.actionQueue = [{ kind: "fight", monsterId: "chicken", target: 3 }];
      s.queuePaused = false;
      s.activeActionId = null;
    });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${OUT}/before-${res.name}-combat.png` });
    const combatBox = await page.evaluate(() => {
      const el = document.querySelector(".gamestats-row--activity");
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { w: r.width, h: r.height, scrollW: el.scrollWidth, clientW: el.clientWidth };
    });
    console.log(`BEFUND before ${res.name} combat gamestats-row--activity:`, JSON.stringify(combatBox));

    if (h.errors.length) console.log(`BEFUND before ${res.name} page-errors:`, JSON.stringify(h.errors));
  } finally {
    await h.stop();
  }
}
