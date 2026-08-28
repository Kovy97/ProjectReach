// Zauberfokus (Chef-GO 28.08.2026): Tooltip einer Magiewaffe — DE 1920x1080 + RU 1366x768. Port 5484.
import { startHarness } from "./sim-harness.mjs";
const OUT = "G:/GameDev/apps/client/ui-audit/shots-bloodgrain_stew";
async function run(locale, viewport, name) {
  const h = await startHarness({ port: 5484, fixture: "midgame", locale, viewport });
  const { page } = h;
  try {
    await page.waitForTimeout(1200);
    await page.keyboard.press("Escape"); await page.waitForTimeout(200);
    await h.setState((state) => { state.inventory.slots[0] = { itemId: "bloodgrain_stew", qty: 1 }; });
    await page.waitForTimeout(500);
    await page.locator('[data-guide-id="topbar.character"]').first().click();
    await page.waitForTimeout(1200);
    const skip = page.locator(".guide-bubble-skip");
    if (await skip.count()) { await skip.first().click(); await page.waitForTimeout(300); }
    const cell = page.locator(".inv-slot.filled").first();
    await cell.scrollIntoViewIfNeeded();
    await cell.hover();
    await page.waitForTimeout(700);
    const info = await page.evaluate(() => {
      const tip = document.querySelector(".itip-tilt-wrap, .itip, .item-tooltip");
      const txt = tip ? tip.textContent : "";
      return { tip: !!tip, hasFocus: /Zauberfokus|Фокус чар|Spell Focus/.test(txt || ""), snippet: (txt || "").replace(/\s+/g, " ").slice(0, 400) };
    });
    console.log(`BEFUND ${name}:`, JSON.stringify(info));
    await page.screenshot({ path: `${OUT}/${name}.png` });
    console.log("SHOT SAVED:", `${OUT}/${name}.png`);
    if (h.errors.length) console.log("PAGE ERRORS:\n" + h.errors.join("\n"));
  } finally {
    await h.stop();
  }
}
await run("en", { width: 1920, height: 1080 }, "bloodgrain_stew-card-en-1920x1080");
await run("de", { width: 1920, height: 1080 }, "bloodgrain_stew-card-de-1920x1080");
