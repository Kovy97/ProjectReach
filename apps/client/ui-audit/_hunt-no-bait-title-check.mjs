import { startHarness } from "./sim-harness.mjs";
const h = await startHarness({ port: 5470, fixture: "hfhunt_demo", locale: "de", viewport: { width: 1920, height: 1080 } });
try {
  await h.page.keyboard.press("Escape").catch(() => {});
  await h.page.waitForTimeout(200);
  const skip = h.page.locator(".guide-bubble-skip");
  if (await skip.count()) { await skip.first().click(); await h.page.waitForTimeout(300); }
  await h.setState((state) => {
    for (const k of Object.keys(state.inventory)) if (String(k).startsWith("bait_")) delete state.inventory[k];
    state.bank = state.bank || {};
    for (const k of Object.keys(state.bank)) if (String(k).startsWith("bait_")) delete state.bank[k];
  });
  await h.page.locator('[data-guide-id="sidebar.hunting"]').first().click();
  await h.page.waitForTimeout(900);
  const emptySlot = h.page.locator(".hunt-traps .hunt-trap-card").nth(3);
  await emptySlot.locator(".hunt-trap-art").click();
  await h.page.waitForTimeout(500);
  await h.page.locator(".hzp-zone-tile").first().click();
  await h.page.waitForTimeout(300);
  const btn = h.page.locator(".hzp-footer-actions .btn-iron").first();
  const title = await btn.getAttribute("title");
  const disabled = await btn.isDisabled();
  console.log("title:", title, "disabled:", disabled);
  console.log(`errors: ${h.errors.length}`);
} finally {
  await h.stop();
}
