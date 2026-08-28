import { startHarness } from "./sim-harness.mjs";
const OUT = "G:/GameDev/apps/client/ui-audit/shots-hunting-review";
const h = await startHarness({ port: 5470, fixture: "hfhunt_demo", locale: "de", viewport: { width: 1920, height: 1080 }, outDir: OUT });
try {
  await h.page.addStyleTag({ content: ".toast-stack { display: none !important; }" });
  await h.page.keyboard.press("Escape").catch(() => {});
  await h.page.waitForTimeout(200);
  const skip = h.page.locator(".guide-bubble-skip");
  if (await skip.count()) { await skip.first().click(); await h.page.waitForTimeout(300); }
  await h.page.locator('[data-guide-id="sidebar.hunting"]').first().click();
  await h.page.waitForTimeout(900);
  // Jagdbuch startet offen (bestehendes Verhalten, nicht Teil dieses Auftrags) — einmal zuklappen,
  // um die neue Zusammenfassungszeile zu prüfen.
  const header = h.page.locator(".hunt-book-section .category-header");
  if ((await header.locator(".category-caret").innerText()) === "▾") {
    await header.click();
    await h.page.waitForTimeout(200);
  }
  await h.page.evaluate(() => {
    const body = document.querySelector(".content-body");
    if (body) body.scrollTop = body.scrollHeight;
  });
  await h.page.waitForTimeout(200);
  await h.shot("hunt-book-collapsed-summary");
  console.log(`ok — errors: ${h.errors.length}`);
  if (h.errors.length) console.log(h.errors.join("\n"));
} finally {
  await h.stop();
}
