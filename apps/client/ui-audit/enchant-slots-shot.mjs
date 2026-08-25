/**
 * Beleg fuer die Verzauberungs-Plaetze im Item-Tooltip (Chef 25.08.2026, "visual learning") und
 * fuer das Runen-Ziel-Label (Spieler-Report 1.0.2).
 *
 * Der Tooltip haengt an der Maus und verschwindet, sobald sie den Kasten verlaesst — deshalb
 * VOLLBILD-Aufnahmen mit stehendem Zeiger statt Element-Clips (ein boundingBox()-Aufruf zwischen
 * Hover und Screenshot reicht schon, um in einen Timeout zu laufen).
 * Shift+Hover, weil der normale Hover eine knappe Sekunde Verzoegerung hat.
 */
import { startHarness } from "./sim-harness.mjs";

const h = await startHarness({ port: 5381, fixture: "midgame", locale: "de" });
const { page } = h;

try {
  await page.waitForTimeout(1400);
  await page.keyboard.press("Escape");

  const nav = page.locator('.sidebar-btn, [data-guide-id^="sidebar."], [data-guide-id^="topbar."]');
  async function zuSeite(muster) {
    const n = await nav.count();
    for (let i = 0; i < n; i++) {
      const txt = ((await nav.nth(i).textContent()) ?? "").trim();
      if (muster.test(txt)) { await nav.nth(i).click(); return txt; }
    }
    return null;
  }

  // ── 1. Ausruestung + Rune im Inventar ────────────────────────────────
  console.log("BEFUND nav-inventar:", await zuSeite(/inventar|inventory|tasche/i));
  await page.waitForTimeout(1200);
  const zellen = page.locator(".inv-slot, .item-cell, .shop-cell");
  const m = await zellen.count();
  let item = false;
  let rune = false;
  for (let i = 0; i < Math.min(m, 40) && !(item && rune); i++) {
    // Zeiger erst wegnehmen: der stehende Tooltip faengt sonst den naechsten Hover ab.
    await page.mouse.move(1900, 1060);
    await page.waitForTimeout(120);
    await zellen.nth(i).hover({ modifiers: ["Shift"] });
    await page.waitForTimeout(600);
    const tip = page.locator(".item-tooltip").first();
    if (!(await tip.count())) continue;
    const grp = await tip.locator(".itip-enchant-group").count();
    const ziel = await tip.locator(".itip-rune-target-value").allTextContents();
    if (grp && !item) {
      item = true;
      console.log("BEFUND item:", JSON.stringify({
        titel: await tip.locator(".itip-enchant-group .itip-group-title").allTextContents(),
        leere: await tip.locator(".itip-enchant-slot-empty").count(),
        hinweis: await tip.locator(".itip-enchant-slot-hint").allTextContents(),
      }));
      await page.screenshot({ path: "ui-audit/shots-enchant-slots/01-item-slots.png" });
    }
    if (ziel.length && !rune) {
      rune = true;
      console.log("BEFUND rune:", JSON.stringify({
        ziel,
        hinweis: await tip.locator(".itip-rune-target-hint").allTextContents(),
      }));
      await page.screenshot({ path: "ui-audit/shots-enchant-slots/02-rune-ziel.png" });
    }
  }

  // ── 2. Verzauberungstisch ────────────────────────────────────────────
  await page.mouse.move(960, 1040);
  console.log("BEFUND nav-tisch:", await zuSeite(/verzauber|enchant/i));
  await page.waitForTimeout(1300);
  const badges = await page.locator(".ench-rune-badge").allTextContents();
  const lager = await page.locator(".ench-rune-card-stored").allTextContents();
  console.log("BEFUND badges:", JSON.stringify(badges.slice(0, 12)));
  console.log("BEFUND lager:", JSON.stringify(lager.slice(0, 8)));
  await page.screenshot({ path: "ui-audit/shots-enchant-slots/03-grimoire.png" });
} finally {
  await h.stop();
}
