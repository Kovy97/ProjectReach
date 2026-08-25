/**
 * Chef-Auftrag 25.08.2026 (Fortsetzung): Doing-Kasten waechst bei <=1600px nicht in den freien
 * Raum rechts. Diese Sonde misst die Grid-Spalten computed, nicht nur Bounding-Boxen, um die
 * echte Bremse zu finden. Port 5393 (isoliert von doing-header-shot.mjs / 5392).
 */
import { startHarness } from "./sim-harness.mjs";

const h = await startHarness({ port: 5393, fixture: "midgame", locale: "de" });
const { page } = h;
try {
  for (const [w, hh] of [[1920, 1080], [1600, 900], [1366, 768]]) {
    await page.setViewportSize({ width: w, height: hh });
    await page.waitForTimeout(1400);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
    const box = await page.evaluate(() => {
      const row = document.querySelector(".content-header-row");
      const gs = document.querySelector(".game-stats");
      const act = document.querySelector(".gamestats-row--activity");
      const meta = document.querySelector(".gamestats-row--meta");
      const charinfo = document.querySelector(".header-charinfo");
      const rowCs = row ? getComputedStyle(row) : null;
      const gsCs = gs ? getComputedStyle(gs) : null;
      const rr = row ? row.getBoundingClientRect() : null;
      const ar = act ? act.getBoundingClientRect() : null;
      const mr = meta ? meta.getBoundingClientRect() : null;
      const cr = charinfo ? charinfo.getBoundingClientRect() : null;
      const bars = [...document.querySelectorAll(".gamestats-activity-bars .tb-bar")].map((b) => {
        const labels = [...b.querySelectorAll("[class*=label]")].map((l) => ({
          t: (l.textContent ?? "").trim().slice(0, 40), sw: l.scrollWidth, cw: l.clientWidth,
        }));
        return { w: Math.round(b.getBoundingClientRect().width), labels };
      });
      return {
        row: rr && { x: Math.round(rr.x), w: Math.round(rr.width) },
        rowGridTemplateColumns: rowCs && rowCs.gridTemplateColumns,
        rowDisplay: rowCs && rowCs.display,
        gsDisplay: gsCs && gsCs.display,
        gsMaxWidth: gsCs && gsCs.maxWidth,
        charinfo: cr && { x: Math.round(cr.x), w: Math.round(cr.width), scrollW: charinfo.scrollWidth, clientW: charinfo.clientWidth },
        activity: ar && { x: Math.round(ar.x), w: Math.round(ar.width) },
        meta: mr && { x: Math.round(mr.x), w: Math.round(mr.width), scrollW: meta.scrollWidth, clientW: meta.clientWidth },
        bars,
      };
    });
    console.log(`BEFUND ${w}x${hh}:`, JSON.stringify(box, null, 0));
    const headerBox = await page.evaluate(() => {
      const el = document.querySelector(".content-header");
      const r = el.getBoundingClientRect();
      return { y: Math.round(r.y), h: Math.round(r.height) };
    });
    await page.screenshot({
      path: `ui-audit/shots-doing-container/clean2-${w}.png`,
      clip: { x: 0, y: 0, width: w, height: Math.min(hh, headerBox.y + headerBox.h + 12) },
    });
  }
} finally {
  await h.stop();
}
