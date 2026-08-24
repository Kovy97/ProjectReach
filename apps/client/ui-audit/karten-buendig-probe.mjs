/**
 * Chef 24.08.: "Da haben wir den Holzrahmen, dann sieht man den Hintergrund und dann kommt ein
 * dunkler Container. Warum ist der dunkle Container und die Bilder nicht buendig zum Holzrahmen?"
 *
 * Diese Probe misst je Karte, wie weit das Bild vom Rahmen entfernt sitzt: aussen die Kartenkante,
 * dann die Rahmenbreite, dann der Innenabstand — und wie viel davon als dunkler Streifen sichtbar
 * bleibt.
 */
import { startHarness } from "./sim-harness.mjs";

const h = await startHarness({ port: 5354, fixture: "midgame", locale: "en" });
const { page } = h;
try {
  await page.waitForTimeout(1200);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  await page.locator('[data-guide-id="sidebar.combat"]').first().click();
  await page.waitForTimeout(900);
  // In die erste Zone hinein, dort stehen die Monsterkarten
  const zone = page.locator(".zone-card").first();
  if ((await zone.count()) > 0) {
    await zone.click();
    await page.waitForTimeout(1200);
  }

  const daten = await page.evaluate(() => {
    const raus = [];
    for (const sel of [".monster-card", ".zone-card"]) {
      const karte = document.querySelector(sel);
      if (!karte) continue;
      const ks = getComputedStyle(karte);
      const kr = karte.getBoundingClientRect();
      const kind =
        karte.querySelector(".monster-card-artwork") ||
        karte.querySelector(".zone-card-art") ||
        karte.firstElementChild;
      const cr = kind ? kind.getBoundingClientRect() : null;
      raus.push({
        selektor: sel,
        karte: `${Math.round(kr.width)}x${Math.round(kr.height)}`,
        rahmen: ks.borderTopWidth,
        rahmenbild: ks.borderImageWidth,
        innenabstand: `${ks.paddingTop} ${ks.paddingRight} ${ks.paddingBottom} ${ks.paddingLeft}`,
        kindKlasse: kind ? kind.className : "-",
        abstandOben: cr ? Math.round(cr.top - kr.top) : null,
        abstandLinks: cr ? Math.round(cr.left - kr.left) : null,
        abstandRechts: cr ? Math.round(kr.right - cr.right) : null,
        hintergrundKarte: ks.backgroundImage !== "none" ? "Verlauf/Bild" : ks.backgroundColor,
      });
    }
    return raus;
  });
  console.log(JSON.stringify(daten, null, 2));
} finally {
  await h.stop();
}
