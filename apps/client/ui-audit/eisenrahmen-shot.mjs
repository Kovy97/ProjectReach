/**
 * Beleg fuer den Eisenrahmen-Schnitt (Chef 25.08.2026: "Die Frames im Quest Menue sind falsch
 * gesliced ... die Rede hier ist von den Stahlrahmen").
 *
 * Nimmt das Quest-Menue auf und misst zusaetzlich, was der Browser wirklich rechnet:
 * `border-image-slice` und `border-image-width` der betroffenen Elemente. Ein Screenshot allein
 * wuerde einen halb abgeschnittenen Eckbeschlag leicht uebersehen lassen.
 */
import { startHarness } from "./sim-harness.mjs";

const h = await startHarness({ port: 5385, fixture: "midgame", locale: "de" });
const { page } = h;

try {
  await page.waitForTimeout(1400);
  await page.keyboard.press("Escape");

  const nav = page.locator('.sidebar-btn, [data-guide-id^="sidebar."], [data-guide-id^="topbar."]');
  const n = await nav.count();
  for (let i = 0; i < n; i++) {
    const txt = ((await nav.nth(i).textContent()) ?? "").trim();
    if (/aufgaben|quest/i.test(txt)) { console.log("BEFUND nav:", txt); await nav.nth(i).click(); break; }
  }
  await page.waitForTimeout(1500);

  const gemessen = await page.evaluate(() => {
    const raus = [];
    for (const sel of [".quests-tab-btn", ".quest-token-badge", ".npc-greeting-head", ".npc-bubble"]) {
      const el = document.querySelector(sel);
      if (!el) { raus.push({ sel, fehlt: true }); continue; }
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      raus.push({
        sel,
        slice: cs.borderImageSlice,
        width: cs.borderImageWidth,
        rand: cs.borderTopWidth,
        box: `${Math.round(r.width)}x${Math.round(r.height)}`,
      });
    }
    return raus;
  });
  for (const g of gemessen) console.log("BEFUND", JSON.stringify(g));

  await page.screenshot({ path: "ui-audit/shots-eisenrahmen/quests-voll.png" });
  const kopf = page.locator(".quests-tabs").first();
  if (await kopf.count()) {
    const b = await kopf.boundingBox();
    await page.screenshot({
      path: "ui-audit/shots-eisenrahmen/quests-tabs.png",
      clip: { x: Math.max(0, b.x - 10), y: Math.max(0, b.y - 10), width: b.width + 20, height: b.height + 20 },
    });
  }
} finally {
  await h.stop();
}
