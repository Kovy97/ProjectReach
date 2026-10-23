// claude:2026-10-23T21:30:00+02:00 — 1.4.0 Welle 1: Kontrollbild Kampfvorbereitung mit Mahlzeit-Platz (de, 1366×768).
import { startHarness } from "./sim-harness.mjs";
const h = await startHarness({ port: 5413, fixture: "endgame", locale: "de", viewport: { width: 1366, height: 768 } });
const { page } = h;
try {
  await page.evaluate(() => {
    const s = window.__hfDebug.state;
    s.inventory.slots[0] = { itemId: "marshroot_chowder", qty: 12 };
    s.inventory.slots[1] = { itemId: "cooked_trout", qty: 40 };
    s.character.meal = "marshroot_chowder";
    s.character.food = "cooked_trout";
  });
  for (let i = 0; i < 4; i++) { await page.keyboard.press("Escape"); await page.waitForTimeout(200); }
  await page.locator('[data-guide-id="sidebar.combat"]').first().click({ force: true });
  await page.waitForTimeout(1200);
  const tabs = page.locator('[role="tab"]');
  const n = await tabs.count();
  for (let i = 0; i < n; i++) {
    const tx = ((await tabs.nth(i).textContent()) ?? "").trim();
    if (/vorbereit|prep|essen|food/i.test(tx)) { await tabs.nth(i).click({ force: true }); break; }
  }
  await page.waitForTimeout(900);
  await h.shot("w1-combat-prep-meal2");
  console.log("TABS:", (await tabs.allTextContents()).join(" | "));
} finally {
  await h.stop();
}
