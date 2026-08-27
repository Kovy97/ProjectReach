import { startHarness } from "./sim-harness.mjs";
const OUT = "G:/GameDev/apps/client/ui-audit/shots-tavern";
const h = await startHarness({ port: 5457, fixture: "midgame", locale: "de", viewport: { width: 1600, height: 900 } });
const { page } = h;
try {
  await page.waitForTimeout(1400);
  await page.keyboard.press("Escape"); await page.waitForTimeout(300); await page.keyboard.press("Escape");
  await page.locator('[data-guide-id="sidebar.newhaven"]').first().click();
  await page.waitForTimeout(1200);
  // Tour-Bubble ggf. überspringen
  const skip = page.locator(".guide-bubble-skip");
  if (await skip.count()) { await skip.first().click(); await page.waitForTimeout(300); }
  // Listen-Ansicht
  const tabs = page.locator(".nh-view-tab");
  if ((await tabs.count()) > 1) { await tabs.nth(1).click(); await page.waitForTimeout(600); }
  const chip = page.locator(".mat-chip").first();
  await chip.scrollIntoViewIfNeeded();
  await chip.hover();
  await page.waitForTimeout(500);
  const info = await page.evaluate(() => {
    const tip = document.querySelector(".itip, .item-tooltip, [class*='itip-card']");
    const wiki = document.querySelector(".itip-wiki-btn");
    return { tip: !!tip, tipClass: tip ? String(tip.className).slice(0, 60) : null, wikiBtn: !!wiki };
  });
  console.log("BEFUND", JSON.stringify(info));
  await page.screenshot({ path: `${OUT}/nh-cost-chip-tooltip-1600x900-de.png` });
} finally {
  await h.close?.();
}
