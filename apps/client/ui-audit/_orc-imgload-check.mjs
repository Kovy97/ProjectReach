import { withHarness } from "./sim-harness.mjs";
const OUT = "G:/GameDev/apps/client/ui-audit/shots-mainmenu";
await withHarness({ port: 5455, viewport: { width: 1600, height: 900 }, locale: "de", slotSaves: {}, outDir: OUT }, async (h) => {
  await h.page.waitForSelector(".menu-nav-btn");
  await h.clickRetry(h.page.locator(".menu-nav-btn").nth(0));
  await h.clickRetry(h.page.locator(".new-relic-cta"));
  await h.page.waitForSelector(".creation-portrait-grid");
  await h.clickRetry(h.page.locator(".creation-filter-bar button", { hasText: "Ork" }));
  await h.page.waitForTimeout(300);
  await h.page.waitForFunction(() => Array.from(document.querySelectorAll(".creation-portrait-grid img")).every((i) => i.complete && i.naturalWidth > 0), null, { timeout: 15000 });
  const st = await h.page.evaluate(() => Array.from(document.querySelectorAll(".creation-portrait-grid img")).map((i) => [i.src.split("/").pop(), i.complete, i.naturalWidth]));
  const bad = st.filter((x) => !(x[1] && x[2] > 0));
  console.log("BEFUND imgs:", st.length, "orc:", st.filter((x) => String(x[0]).startsWith("orc_")).length, "nicht geladen:", JSON.stringify(bad));
  await h.page.screenshot({ path: `${OUT}/orc-creation-loaded-1600x900-de.png` });
});
