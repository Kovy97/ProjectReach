// claude:2026-10-24T20:35:00+02:00 — 1.4.0 Welle 2 FK: Kontrollbilder Bogen + Köcher (de, 1366×768), Browser-Fixture,
// kein Electron, kein echter Spielstand. Ausrüstung, Köcher-Bereich der Kampfvorbereitung, Itemkarte Effektpfeil.
import { startHarness } from "./sim-harness.mjs";

const h = await startHarness({ port: 5415, fixture: "endgame", locale: "de", viewport: { width: 1366, height: 768 } });
const { page } = h;

async function go(id) {
  const loc = page.locator(`[data-guide-id="sidebar.${id}"], [data-guide-id="topbar.${id}"]`).first();
  for (let i = 0; i < 3; i++) await page.keyboard.press("Escape");
  if (await loc.count()) await loc.evaluate((el) => el.click());
  await page.waitForTimeout(700);
}

try {
  await page.evaluate(() => {
    const d = window.__hfDebug;
    const s = d.state;
    s.character.equipment.mainhand = "titanium_shortbow";
    s.character.equippedInstances.mainhand = undefined;
    delete s.character.equippedInstances.mainhand;
    s.character.equipment.offhand = "titanium_quiver";
    delete s.character.equippedInstances.offhand;
    s.character.quiver = { itemId: "titanium_arrow", qty: 1240 };
    s.bank.bloodiron_arrow_poison = 300;
    s.bank.titanium_arrow_bleed = 450;
    s.bank.godiron_arrow = 90;
    s.bank.mithril_arrow = 2000;
  });
  await page.waitForTimeout(600);
  await go("character");
  await h.shot("fk-character-bow-quiver");
  await go("combat");
  const prep = page.locator('[role="tab"]').filter({ hasText: /Vorbereitung|Prep/i }).first();
  if (await prep.count()) await prep.evaluate((el) => el.click());
  await page.waitForTimeout(600);
  const q = page.locator(".cl-section-quiver");
  if (await q.count()) await q.evaluate((el) => el.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(400);
  await h.shot("fk-combat-prep-quiver");
  const btn = page.locator(".cl-section-quiver .cl-food-btn").nth(2);
  if (await btn.count()) {
    await btn.hover();
    await page.waitForTimeout(700);
    await h.shot("fk-tooltip-arrow");
  }
} finally {
  await h.stop();
}
