import { startHarness } from "./sim-harness.mjs";
const h = await startHarness({ port: 5460, fixture: "midgame", locale: "de", viewport: { width: 1600, height: 900 } });
const { page } = h;
try {
  await page.waitForTimeout(1400);
  await page.keyboard.press("Escape"); await page.waitForTimeout(300); await page.keyboard.press("Escape");
  const nav = await page.evaluate(() => Array.from(document.querySelectorAll("[data-guide-id^='sidebar.']")).map((e) => e.getAttribute("data-guide-id")));
  await page.locator('[data-guide-id="sidebar.newhaven"]').first().click();
  await page.waitForTimeout(1200);
  const skip = page.locator(".guide-bubble-skip");
  if (await skip.count()) { await skip.first().click(); await page.waitForTimeout(300); }
  const tabs = page.locator(".nh-view-tab");
  if ((await tabs.count()) > 1) { await tabs.nth(1).click(); await page.waitForTimeout(600); }
  const nh = await page.evaluate(() => ({ text: document.body.innerText.includes("Taverne"), cards: document.querySelectorAll(".nh-building-card, .building-card").length }));
  console.log("BEFUND", JSON.stringify({ tavernNav: nav.includes("sidebar.tavern"), navCount: nav.length, newHavenMentionsTaverne: nh.text, cards: nh.cards }));
} finally {
  await h.close?.();
}
