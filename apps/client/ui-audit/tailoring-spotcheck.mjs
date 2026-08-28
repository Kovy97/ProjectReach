/**
 * Schneidern-Split: schneller Rundum-Check über die generischen, datengetriebenen Seiten, die
 * laut Auftrag "alle Client-Stellen mit Skill-Listen" abdecken sollen — Meisterschaft (Crafting-
 * Tab), Erfolge (Skilling-Kategorie), Statistik. Kein Screenshot-Pflichtteil des Auftrags, nur
 * Fehlerfreiheit + Sichtkontrolle in der Konsole.
 */
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { startHarness } from "./sim-harness.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "shots-tailoring");
mkdirSync(OUT, { recursive: true });

const h = await startHarness({ port: 5475, fixture: "midgame", locale: "de", outDir: OUT });
const { page } = h;
try {
  await page.waitForSelector('[data-guide-id="topbar.mastery"]', { timeout: 20000 });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);

  await page.locator('[data-guide-id="topbar.mastery"]').first().click();
  await page.waitForTimeout(500);
  const craftTabSel = 'button:has-text("Handwerk")';
  const tab = page.locator(craftTabSel).first();
  if (await tab.count()) await tab.click();
  await page.waitForTimeout(400);
  const masteryHasTailoring = await page.evaluate(() =>
    document.body.textContent?.includes("Schneidern") ?? false,
  );
  await h.shot("spot-01-mastery-crafting");
  console.log(`Meisterschaft zeigt "Schneidern": ${masteryHasTailoring}`);

  await page.locator('[data-guide-id="topbar.achievements"]').first().click();
  await page.waitForTimeout(500);
  const achHasTailoring = await page.evaluate(() =>
    document.body.textContent?.includes("Schneidern") ?? false,
  );
  await h.shot("spot-02-achievements");
  console.log(`Erfolge zeigen "Schneidern": ${achHasTailoring}`);

  console.log(`errors=${h.errors.length}`);
  if (h.errors.length) console.log(h.errors.join("\n"));
} finally {
  await h.stop();
}
