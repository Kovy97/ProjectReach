import { startHarness } from "./sim-harness.mjs";
const OUT = "G:/GameDev/apps/client/ui-audit/shots-tavern";
const h = await startHarness({ port: 5458, fixture: "midgame", locale: "de", viewport: { width: 1600, height: 900 } });
const { page } = h;
try {
  await page.waitForTimeout(1400);
  await page.keyboard.press("Escape"); await page.waitForTimeout(300); await page.keyboard.press("Escape");
  await page.locator('[data-guide-id="sidebar.mining"]').first().click();
  await page.waitForTimeout(1200);
  const skip = page.locator(".guide-bubble-skip");
  if (await skip.count()) { await skip.first().click(); await page.waitForTimeout(300); }
  const grid = await page.evaluate(() => Array.from(document.querySelectorAll(".skillcard-craft-cta")).slice(0, 1).map((g) => Array.from(g.querySelectorAll("button")).map((b) => b.textContent?.trim())));
  console.log("GRID", JSON.stringify(grid));
  await page.locator('[data-bot="qty-custom"]').first().click();
  await page.waitForTimeout(400);
  await page.keyboard.type("650");
  await page.waitForTimeout(300);
  const info = await page.evaluate(() => {
    const m = document.querySelector(".qam-modal");
    const r = m?.getBoundingClientRect();
    return { open: !!m, w: r ? Math.round(r.width) : 0, h: r ? Math.round(r.height) : 0, eta: document.querySelector(".qam-eta")?.textContent, level: document.querySelector(".qam-level")?.textContent, btns: Array.from(document.querySelectorAll(".qam-actions button")).map((b) => [b.textContent?.trim(), b.disabled]) };
  });
  console.log("BEFUND", JSON.stringify(info));
  await page.screenshot({ path: `${OUT}/queue-amount-modal-1600x900-de.png` });
  await page.locator(".qam-actions button").first().click();
  await page.waitForTimeout(500);
  const q = await page.evaluate(() => (window.__hfDebug?.state?.actionQueue ?? []).map((e) => [e.actionId, e.target]));
  console.log("QUEUE", JSON.stringify(q));
} finally {
  await h.close?.();
}
