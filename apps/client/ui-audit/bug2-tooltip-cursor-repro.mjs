import { startHarness } from "./sim-harness.mjs";

const main = async () => {
  const h = await startHarness({
    port: 5363, fixture: "midgame", locale: "en",
    viewport: { width: 1920, height: 1080 },
    outDir: "C:/Users/MSchu/AppData/Local/Temp/claude/G--GameDev/553d2095-3a73-4795-9782-0fe746a25f13/scratchpad/bugs-1.0.1-tooltip",
  });
  try {
    // Fixture "midgame" hat noch eine offene Feature-/Bereichs-Tour laufen (guide-active sperrt
    // pointer-events auf fast alles) — erst wegklicken, sonst reagiert nichts auf Hover/Klick.
    for (let i = 0; i < 6; i++) {
      const skip = h.page.locator(".guide-bubble-skip").first();
      if ((await skip.count()) === 0) break;
      await skip.click({ timeout: 3000 }).catch(() => {});
      await h.page.waitForTimeout(500);
    }

    // 1) Inventar-Item-Tooltip (ItemCell in InventoryPanel/Charakterseite).
    await h.page.locator('[data-guide-id^="topbar.character"], [data-guide-id="topbar.character"]').first().click().catch(() => {});
    await h.page.waitForTimeout(500);
    const invCell = h.page.locator(".item-cell").first();
    const box = await invCell.boundingBox();
    if (box) {
      await h.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await h.page.waitForTimeout(1300); // Hover-Delay (~1s) abwarten
      await h.shot("bug2-item-tooltip-inventory-after");
      const info = await h.page.evaluate(() => {
        const tip = document.querySelector(".itip-compare-wrap");
        return tip ? tip.getBoundingClientRect() : null;
      });
      console.log("inventory tooltip rect:", JSON.stringify(info));
      console.log("cursor at:", box.x + box.width / 2, box.y + box.height / 2);
    } else {
      console.log("KEIN item-cell gefunden auf Charakterseite");
    }
    await h.page.mouse.move(10, 10);
    await h.page.waitForTimeout(300);

    // 2) Bank-Item-Tooltip.
    await h.page.locator('[data-guide-id="sidebar.bank"], [data-guide-id="topbar.bank"]').first().click().catch(() => {});
    await h.page.waitForTimeout(500);
    const bankCell = h.page.locator(".item-cell").first();
    const box2 = await bankCell.boundingBox();
    if (box2) {
      await h.page.mouse.move(box2.x + box2.width / 2, box2.y + box2.height / 2);
      await h.page.waitForTimeout(1300);
      await h.shot("bug2-item-tooltip-bank-after");
    } else {
      console.log("KEIN item-cell gefunden auf Bank-Seite");
    }
    await h.page.mouse.move(10, 10);
    await h.page.waitForTimeout(300);

    // 3) Sidebar-HUD-Tooltip (Skill-Level-Button title/HoverTip) — BlessingPanel als Beispiel.
    const blessing = h.page.locator(".blessing-panel, [class*=blessing]").first();
    const box3 = await blessing.boundingBox().catch(() => null);
    if (box3) {
      await h.page.mouse.move(box3.x + box3.width / 2, box3.y + box3.height / 2);
      await h.page.waitForTimeout(600);
      await h.shot("bug2-hud-tooltip-blessing-after");
    } else {
      console.log("KEIN Blessing-Panel gefunden");
    }
  } finally {
    await h.stop();
  }
};
main().catch((e) => { console.error(e); process.exit(1); });
