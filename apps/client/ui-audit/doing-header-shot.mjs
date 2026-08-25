/**
 * Kopfleisten-Beleg fuer den Doing-Container (Chef 25.08.2026) OHNE das Tour-Overlay, das die
 * Agent-Aufnahmen abdunkelte. Ausschnitt nur die Kopfleiste, bei 1920 und 1366 breit.
 */
import { startHarness } from "./sim-harness.mjs";

const h = await startHarness({ port: 5392, fixture: "midgame", locale: "de" });
const { page } = h;
try {
  for (const [w, hh] of [[1920, 1080], [1366, 768]]) {
    await page.setViewportSize({ width: w, height: hh });
    await page.waitForTimeout(1400);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
    const box = await page.evaluate(() => {
      const el = document.querySelector(".content-header") ?? document.querySelector(".game-stats");
      const r = el.getBoundingClientRect();
      const act = document.querySelector(".gamestats-row--activity");
      const a = act ? act.getBoundingClientRect() : null;
      const bars = [...document.querySelectorAll(".gamestats-activity-bars .tb-bar")].map((b) => {
        const labels = [...b.querySelectorAll("[class*=label]")].map((l) => ({
          t: (l.textContent ?? "").trim().slice(0, 40), sw: l.scrollWidth, cw: l.clientWidth,
        }));
        return { w: Math.round(b.getBoundingClientRect().width), labels };
      });
      return { header: { y: Math.round(r.y), h: Math.round(r.height) }, activity: a && { x: Math.round(a.x), w: Math.round(a.width), h: Math.round(a.height) }, bars };
    });
    console.log(`BEFUND ${w}:`, JSON.stringify(box));
    await page.screenshot({
      path: `ui-audit/shots-doing-container/clean-${w}.png`,
      clip: { x: 0, y: 0, width: w, height: Math.min(hh, box.header.y + box.header.h + 12) },
    });
  }
} finally {
  await h.stop();
}
