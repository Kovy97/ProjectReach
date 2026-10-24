// claude:2026-10-24T18:30:00+02:00 — Schrift-Vergleich Fließtext: Begleiter-Beschreibung + Item-Tooltip je Kandidatin, de.
// Aufruf (aus apps/client): node ui-audit/_font-compare.mjs <outDir> <B>x<H> <port>
import { mkdirSync } from "node:fs";
import { startHarness } from "./sim-harness.mjs";
const [outDir, vp = "1366x768", portArg = "5544"] = process.argv.slice(2);
const [width, height] = vp.split("x").map(Number);
mkdirSync(outDir, { recursive: true });
const CANDS = { haus: null, imfell: '"IM Fell English"', garamond: '"EB Garamond"', alegreya: '"Alegreya"' };
const h = await startHarness({ port: Number(portArg), fixture: "endgame", locale: process.env.AUDIT_LOCALE ?? "de", viewport: { width, height } });
const { page } = h;
const setFace = (v) => page.evaluate((v) => { const r = document.documentElement; if (v) { r.style.setProperty("--body-face", v); r.style.removeProperty("--font-body"); } else { r.style.setProperty("--font-body", 'var(--font-head)'); } }, v);
try {
  await page.waitForTimeout(1500); await page.keyboard.press("Escape");
  const go = async (id) => { await page.locator(`[data-guide-id="sidebar.${id}"], [data-guide-id="topbar.${id}"]`).first().click(); await page.waitForTimeout(900); const s = page.locator(".guide-bubble-skip"); if (await s.count()) { await s.first().click().catch(() => {}); } };
  await go("character");
  await h.setState((st) => { st.inventory.slots[0] = { itemId: "esthar", qty: 1 }; });
  await page.waitForTimeout(400);
  const cell = page.locator(".inv-slot.filled").first();
  for (const [name, face] of Object.entries(CANDS)) {
    await setFace(face);
    await page.mouse.move(5, 5); await page.waitForTimeout(200);
    { await go("character"); await setFace(face); await page.setViewportSize({ width, height: 1250 }); await page.waitForTimeout(300);
      await cell.click({ force: true }); await page.waitForTimeout(700);
      for (let k = 0; k < 3; k++) { const sk = page.locator(".guide-bubble-skip"); if (await sk.count()) { await sk.first().click().catch(() => {}); await page.waitForTimeout(700); } }
      if ((await page.locator(".item-tooltip").count()) === 0) { await cell.click({ force: true }); }
      await page.waitForTimeout(1100);
      await page.locator(".item-tooltip").first().screenshot({ path: `${outDir}/${name}-${vp}-tooltip.png` }).catch(() => {});
      await page.locator(".itip-close-btn").first().click({ timeout: 800 }).catch(() => {});
      await page.setViewportSize({ width, height }); await page.waitForTimeout(300); }
    await page.mouse.move(5, 5);
    await go("companions");
    await setFace(face); await page.waitForTimeout(300);
    const box = page.locator(".pet-field-description").first();
    const panel = box.locator("xpath=ancestor::*[contains(@class,'pet-field')][1]");
    await page.screenshot({ path: `${outDir}/${name}-${vp}-begleiter.png` });
  }
} finally { await h.stop(); }
