// claude:2026-10-24T18:30:00+02:00 — Screenshots je Seite bei gewählter Textgröße/Sprache + Überlaufprüfung (Seite, Seitenleiste).
// node ui-audit/_scale-shots.mjs <outPrefix> <B>x<H> <port> <locale> <scale> [seiten]
import { writeFileSync } from "node:fs";
import { startHarness } from "./sim-harness.mjs";
const [prefix, vp, portArg, locale, scale, pagesArg] = process.argv.slice(2);
const [width, height] = vp.split("x").map(Number);
const PAGES = (pagesArg ?? "character,bank,woodcutting,combat,options").split(",");
const h = await startHarness({ port: Number(portArg), fixture: "endgame", locale, viewport: { width, height } });
const { page } = h; const res = {};
try {
  await page.waitForTimeout(1500); await page.keyboard.press("Escape");
  await page.evaluate((sc) => { if (sc !== "normal") document.documentElement.dataset.textScale = sc; }, scale);
  for (const id of PAGES) {
    if (id === "options") { await page.locator(".sb-footer-drawer-tab").first().click({ timeout: 2000 }).catch(() => {}); await page.waitForTimeout(400); }
    const sel = `[data-guide-id="sidebar.${id}"], [data-guide-id="topbar.${id}"]`;
    try { await page.locator(sel).first().click({ timeout: 4000 }); } catch { res[id] = "klick"; continue; }
    await page.waitForTimeout(1000);
    const skip = page.locator(".guide-bubble-skip"); if (await skip.count()) { await skip.first().click().catch(() => {}); await page.waitForTimeout(300); }
    await page.screenshot({ path: `${prefix}-${id}.png` });
    res[id] = await page.evaluate(() => {
      const bad = [];
      for (const e of document.querySelectorAll(".sidebar button, .sidebar .sb-skill-name, .topbar button, .topbar-area button")) {
        if (e.scrollWidth > e.clientWidth + 2 && getComputedStyle(e).overflow !== "visible") bad.push((e.className || e.tagName).toString().slice(0, 40) + " " + e.textContent.trim().slice(0, 20));
      }
      return { docOverflowX: document.documentElement.scrollWidth - innerWidth, sbOverflowX: (document.querySelector(".sidebar")?.scrollWidth ?? 0) - (document.querySelector(".sidebar")?.clientWidth ?? 0), clipped: bad.slice(0, 6) };
    });
  }
} finally { writeFileSync(`${prefix}.json`, JSON.stringify(res, null, 1)); await h.stop(); }
