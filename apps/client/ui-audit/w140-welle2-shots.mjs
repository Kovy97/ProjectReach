// claude:2026-10-24T17:10:00+02:00 — 1.4.0 Welle 2: Kontrollbilder Materiallager + Bergung (de, 1366×768),
// Browser-Fixture, kein Electron, kein echter Spielstand.
import { startHarness } from "./sim-harness.mjs";

const h = await startHarness({ port: 5413, fixture: "endgame", locale: "de", viewport: { width: 1366, height: 768 } });
const { page } = h;

async function go(id) {
  const sel = `[data-guide-id="sidebar.${id}"], [data-guide-id="topbar.${id}"]`;
  const loc = page.locator(sel).first();
  for (let i = 0; i < 3; i++) await page.keyboard.press("Escape");
  if (await loc.count()) await loc.evaluate((el) => el.click());
  await page.waitForTimeout(700);
  return loc.count();
}

try {
  await page.evaluate(() => {
    const d = window.__hfDebug;
    const s = d.state;
    for (const i of [16, 17, 18, 19]) s.inventory.slots[i] = null; // Platz für die Bergungs-Beispiele
    const add = (id, n) => {
      const slot = s.inventory.slots.findIndex((x) => !x);
      if (slot >= 0) s.inventory.slots[slot] = { itemId: id, qty: n };
    };
    add("sickle_shiv", 3);
    add("goblin_warkilt", 2);
    add("marrow_shortbow", 1);
    s.bank.copper_ore = (s.bank.copper_ore ?? 0) + 500;
    s.bank.relic_dust = 37;
  });
  await page.waitForTimeout(600);

  const n = await go("storage");
  console.log("storage nav entries:", n);
  await h.shot("w2-storage");
  await page.locator(".storage-shelves").evaluate((el) => el.scrollTo(0, 900));
  await page.waitForTimeout(300);
  await h.shot("w2-storage-scrolled");

  await go("character");
  const btn = page.locator("button").filter({ hasText: /Beute zerlegen/ }).first();
  if (await btn.count()) {
    await btn.evaluate((el) => el.click());
    await page.waitForTimeout(600);
    await h.shot("w2-salvage-batch");
    await page.keyboard.press("Escape");
  }
  const kilt = page.locator(".item-cell").nth(0);
  await page.waitForTimeout(300);
  await h.shot("w2-character");
} finally {
  await h.stop();
}
