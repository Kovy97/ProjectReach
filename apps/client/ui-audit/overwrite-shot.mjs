/** Aufnahme des Ueberschreiben-Dialogs (Chef-Fund 24.08.: "Buttons sehen kacke aus"). */
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { startHarness } from "./sim-harness.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "shots-overwrite");
mkdirSync(OUT, { recursive: true });

const h = await startHarness({
  port: 5352,
  fixture: null,
  requireDebugHook: false,
  slotSaves: { 0: "midgame" },
  locale: "en",
});
const { page } = h;
try {
  await page.waitForTimeout(1500);
  await page.locator(".menu-nav >> text=New Game").first().click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: join(OUT, "01-neues-spiel-panel.png") });

  // Der belegte Slot bietet "Overwrite" an.
  const btn = page.locator("text=Overwrite").first();
  await btn.click({ timeout: 8000 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: join(OUT, "02-overwrite-dialog.png") });

  const modal = await page.$(".quit-confirm-modal");
  if (modal) await modal.screenshot({ path: join(OUT, "03-dialog-nah.png") });

  const info = await page.evaluate(() => {
    const raus = [];
    for (const b of document.querySelectorAll(".quit-confirm-actions button")) {
      const s = getComputedStyle(b);
      const r = b.getBoundingClientRect();
      raus.push({
        text: b.textContent.trim(),
        klasse: b.className,
        groesse: `${Math.round(r.width)}x${Math.round(r.height)}`,
        farbe: s.color,
        hintergrund: s.backgroundImage !== "none" ? "Bild" : s.backgroundColor,
        rand: `${s.borderTopWidth} ${s.borderTopStyle} ${s.borderTopColor}`,
        rahmenbild: s.borderImageSource === "none" ? "-" : "ja",
        schrift: `${s.fontFamily.split(",")[0]} ${s.fontSize}`,
      });
    }
    return raus;
  });
  console.log(JSON.stringify(info, null, 2));
} finally {
  await h.stop();
}
console.log("Bilder:", OUT);
