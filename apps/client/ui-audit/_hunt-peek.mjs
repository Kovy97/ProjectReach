import { startHarness } from "./sim-harness.mjs";
const OUT = "G:/GameDev/apps/client/ui-audit/shots-hunting-review";
const h = await startHarness({ port: 5469, fixture: "hfhunt_demo", locale: "de", viewport: { width: 1920, height: 1080 } });
const { page } = h;
try {
  await page.waitForTimeout(1500);
  await page.keyboard.press("Escape"); await page.waitForTimeout(300);
  const skip = page.locator(".guide-bubble-skip"); if (await skip.count()) { await skip.first().click(); await page.waitForTimeout(300); }
  await page.locator('[data-guide-id="sidebar.hunting"]').first().click();
  await page.waitForTimeout(1500);
  const skip2 = page.locator(".guide-bubble-skip"); if (await skip2.count()) { await skip2.first().click(); await page.waitForTimeout(300); }
  await page.screenshot({ path: `${OUT}/page-1920-de.png` });
  console.log("PEEK ok");
} finally {
  await h.close?.();
}
