/**
 * Schneidern-Split (Chef-Entscheid 28.08.2026): belegt den neuen Sidebar-Eintrag „Schneidern"
 * direkt nach Handwerk (gleiche Bauart, Icon links + Stufe x/99 rechts) und die Skill-Seite
 * selbst. Content/Engine/Persistence sind zum Zeitpunkt dieses Laufs noch parallel im Bau
 * (logic-dev) — die Seite kann daher noch den "unbekannter Skill"-Fallback statt echter Rezepte
 * zeigen; das ist erwartet und wird im UI-Dev-Bericht vermerkt.
 */
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { startHarness } from "./sim-harness.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "shots-tailoring");
mkdirSync(OUT, { recursive: true });

const RUNS = [
  { locale: "de", viewport: { width: 1920, height: 1080 }, tag: "de-1920x1080" },
  { locale: "ru", viewport: { width: 1366, height: 768 }, tag: "ru-1366x768" },
];

for (const run of RUNS) {
  const h = await startHarness({ port: 5475, fixture: "midgame", locale: run.locale, viewport: run.viewport, outDir: OUT });
  const { page } = h;
  try {
    await page.waitForSelector('[data-guide-id="sidebar.tailoring"]', { timeout: 20000 });
    await page.keyboard.press("Escape"); // Onboarding-Sprechblase ggf. wegklicken
    await page.waitForTimeout(300);
    await h.shot(`${run.tag}-01-sidebar`, { fullPage: false });

    await page.locator('[data-guide-id="sidebar.tailoring"]').first().click();
    await page.waitForTimeout(500);
    await h.shot(`${run.tag}-02-tailoring-page`, { fullPage: false });

    console.log(`${run.tag}: OK, errors=${h.errors.length}`);
    if (h.errors.length) console.log(h.errors.join("\n"));
  } finally {
    await h.stop();
  }
}

console.log(`Bilder: ${OUT}`);
