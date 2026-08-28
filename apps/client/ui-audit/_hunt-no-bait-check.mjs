import { startHarness } from "./sim-harness.mjs";
const OUT = "G:/GameDev/apps/client/ui-audit/shots-hunting-review";
const h = await startHarness({ port: 5470, fixture: "hfhunt_demo", locale: "de", viewport: { width: 1920, height: 1080 }, outDir: OUT });
try {
  await h.page.addStyleTag({ content: ".toast-stack { display: none !important; }" });
  await h.page.keyboard.press("Escape").catch(() => {});
  await h.page.waitForTimeout(200);
  const skip = h.page.locator(".guide-bubble-skip");
  if (await skip.count()) { await skip.first().click(); await h.page.waitForTimeout(300); }

  // Köder auf 0 setzen (Inventar UND Lager) — prueft den deaktivierten "Falle stellen"-Knopf samt
  // benanntem Hinweis, und die rot getoente Bestandsanzeige auf einer laufenden Falle.
  await h.setState((state) => {
    for (const k of Object.keys(state.inventory)) {
      if (String(k).startsWith("bait_")) delete state.inventory[k];
    }
    state.bank = state.bank || {};
    for (const k of Object.keys(state.bank)) {
      if (String(k).startsWith("bait_")) delete state.bank[k];
    }
  });

  await h.page.locator('[data-guide-id="sidebar.hunting"]').first().click();
  await h.page.waitForTimeout(900);
  await h.shot("no-bait-page-1920-de");

  const emptySlot = h.page.locator(".hunt-traps .hunt-trap-card").nth(3);
  await emptySlot.locator(".hunt-trap-art").click();
  await h.page.waitForTimeout(500);
  await h.page.locator(".hzp-zone-tile").first().click();
  await h.page.waitForTimeout(300);
  await h.shot("no-bait-modal-1920-de");

  console.log(`ok — errors: ${h.errors.length}`);
  if (h.errors.length) console.log(h.errors.join("\n"));
} finally {
  await h.stop();
}
