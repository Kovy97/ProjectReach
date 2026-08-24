import { startHarness } from "./sim-harness.mjs";

for (const [w, h, port] of [[1920, 1080, 5371], [1600, 900, 5372], [1366, 768, 5373]]) {
  const hh = await startHarness({ port, fixture: "midgame", locale: "en", viewport: { width: w, height: h } });
  const { page } = hh;
  try {
    await page.waitForTimeout(1200);
    await page.keyboard.press("Escape");
    await page.locator('[data-guide-id="sidebar.combat"]').first().click();
    await page.waitForTimeout(900);
    const z = page.locator(".zone-card").first();
    if (await z.count()) { await z.click(); await page.waitForTimeout(1200); }
    const d = await page.evaluate(() => {
      const grid = document.querySelector(".monster-grid");
      if (!grid) return null;
      const gs = getComputedStyle(grid);
      const karten = grid.querySelectorAll(".monster-card");
      const erste = karten[0]?.getBoundingClientRect();
      // Wie viele Karten stehen in der ersten Reihe?
      let proReihe = 0;
      if (erste) {
        for (const k of karten) {
          if (Math.abs(k.getBoundingClientRect().top - erste.top) < 4) proReihe++;
        }
      }
      return {
        gridBreite: Math.round(grid.getBoundingClientRect().width),
        spalten: gs.gridTemplateColumns,
        karten: karten.length,
        proReihe,
        kartenBreite: erste ? Math.round(erste.width) : null,
      };
    });
    console.log(`${w}x${h}:`, JSON.stringify(d));
  } finally {
    await hh.stop();
  }
}
