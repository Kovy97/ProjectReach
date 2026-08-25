/**
 * Beleg fuer den Zonen-Knopf in der Kampf-Kopfzeile (Chef 25.08.2026: "oben rechts wo End Fight
 * ist, sollte oben links Zones stehen als gleicher Button").
 */
import { startHarness } from "./sim-harness.mjs";

const h = await startHarness({ port: 5389, fixture: "midgame", locale: "de" });
const { page } = h;
const shot = (name) => page.screenshot({ path: `ui-audit/shots-report-102/${name}.png` });

try {
  await page.waitForTimeout(1400);
  await page.keyboard.press("Escape");
  const nav = page.locator('.sidebar-btn, [data-guide-id^="sidebar."]');
  const n = await nav.count();
  for (let i = 0; i < n; i++) {
    const txt = ((await nav.nth(i).textContent()) ?? "").trim();
    if (/^kampf|combat/i.test(txt)) { await nav.nth(i).click(); break; }
  }
  await page.waitForTimeout(1300);
  await page.evaluate(() => {
    const s = window.__hfDebug.state;
    s.actionQueue = [{ kind: "fight", monsterId: "chicken", target: 3 }];
    s.queuePaused = false;
    s.activeActionId = null;
  });
  await page.waitForTimeout(2500);

  const mess = await page.evaluate(() => {
    const z = document.querySelector(".combat-zones-btn");
    const e = document.querySelector(".combat-stop-btn:not(.combat-zones-btn)");
    const box = (el) => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; };
    return z && e ? { zonen: box(z), beenden: box(e), zonenText: z.textContent, beendenText: e.textContent } : null;
  });
  console.log("BEFUND knoepfe:", JSON.stringify(mess));
  await shot("09-zonen-knopf");

  await page.locator(".combat-zones-btn").click();
  await page.waitForTimeout(900);
  const liste = await page.locator(".combat-main-area").count();
  const balken = await page.locator(".combat-return-note").allTextContents();
  const kampf = await page.evaluate(() => window.__hfDebug.state.combat.monsterId);
  console.log("BEFUND nach-klick: liste=", liste > 0, "balken=", JSON.stringify(balken), "kampf-aktiv=", kampf);
  await shot("10-zonen-liste");
} finally {
  await h.stop();
}
