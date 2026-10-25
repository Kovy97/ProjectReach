// claude:2026-10-25T12:37:00+01:00 — Painterly-Asset-Bestandsaufnahme: Screenshots aller Navigationsseiten (Reforged),
// endgame-Fixture, locale de, Port 5611. Aufruf (aus G:\GameDev): node design/painterly-assets-2026-10-25/tools/shots-pages.mjs <width> <height>
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { startHarness } from "../../../apps/client/ui-audit/sim-harness.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const [w = "1920", hgt = "1080", port = "5611"] = process.argv.slice(2);
const outDir = join(here, "..", "shots", `${w}x${hgt}`);
mkdirSync(outDir, { recursive: true });
const h = await startHarness({ port: Number(port), fixture: "endgame", locale: "de", viewport: { width: Number(w), height: Number(hgt) }, outDir });
const { page } = h;
const log = [];
try {
  await page.evaluate(() => { try { localStorage.setItem("hearthforge:uiStyle", "reforged"); } catch {} document.documentElement.dataset.uiStyle = "reforged"; });
  await page.waitForTimeout(1200);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  await h.shot("00-start");
  const ids = await page.evaluate(() => [...document.querySelectorAll('[data-guide-id^="sidebar."],[data-guide-id^="topbar."]')].map((e) => e.getAttribute("data-guide-id")));
  const uniq = [...new Set(ids)].filter((x) => !/combatStyle|Resize/.test(x));
  log.push({ ids: uniq });
  let i = 1;
  for (const id of uniq) {
    try {
      const loc = page.locator(`[data-guide-id="${id}"]`).first();
      if (!(await loc.isVisible())) { log.push({ id, skip: "invisible" }); continue; }
      await loc.click({ timeout: 4000 });
      await page.waitForTimeout(900);
      await page.keyboard.press("Escape").catch(() => {});
      await page.waitForTimeout(200);
      const name = `${String(i++).padStart(2, "0")}-${id.replace(/[^a-z0-9.-]/gi, "_")}`;
      await h.shot(name);
      log.push({ id, name });
    } catch (e) { log.push({ id, err: String(e).slice(0, 200) }); }
  }
  log.push({ errors: h.errors.slice(0, 20) });
} finally {
  writeFileSync(join(outDir, "log.json"), JSON.stringify(log, null, 1));
  await h.stop();
}
