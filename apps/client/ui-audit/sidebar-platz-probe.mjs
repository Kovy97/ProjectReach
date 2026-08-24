/**
 * Chef 24.08.: "wir haben noch sehr viel Platz nach links und rechts zu den Symbol- und
 * Level-Containern, aber trotzdem ist die Schrift unnoetig klein skaliert".
 *
 * Diese Probe misst, wie viel Platz die Beschriftung reserviert bekommt und wie viel davon
 * Symbol und Level-Abzeichen WIRKLICH brauchen. Die Differenz ist verschenkte Textbreite.
 */
import { startHarness } from "./sim-harness.mjs";

const h = await startHarness({ port: 5353, fixture: "midgame", locale: "en" });
const { page } = h;
try {
  await page.waitForTimeout(1200);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);

  const daten = await page.evaluate(() => {
    const leiste = document.querySelector(".sidebar");
    const raus = { leiste: leiste?.getBoundingClientRect().width, zeilen: [] };
    for (const btn of document.querySelectorAll(".sb-skill-btn")) {
      const name = btn.querySelector(".sb-skill-name");
      if (!name) continue;
      const ns = getComputedStyle(name);
      if (ns.display === "none") continue;
      const b = btn.getBoundingClientRect();
      const icon = btn.querySelector(".sb-skill-icon-wrap");
      const lvl = btn.querySelector(".sb-skill-level");
      const ir = icon?.getBoundingClientRect();
      const lr = lvl && getComputedStyle(lvl).display !== "none" ? lvl.getBoundingClientRect() : null;
      const bereich = document.createRange();
      bereich.selectNodeContents(name);
      const pl = parseFloat(ns.paddingLeft || "0");
      const pr = parseFloat(ns.paddingRight || "0");
      raus.zeilen.push({
        text: (name.textContent || "").trim(),
        px: Math.round(parseFloat(ns.fontSize) * 10) / 10,
        reserveLinks: Math.round(pl),
        symbolBraucht: ir ? Math.round(ir.right - b.left) : 0,
        reserveRechts: Math.round(pr),
        levelBraucht: lr ? Math.round(b.right - lr.left) : 0,
        platz: Math.round(name.clientWidth - pl - pr),
        text_px: Math.round(bereich.getBoundingClientRect().width),
      });
    }
    return raus;
  });

  console.log(`Sidebar-Breite: ${Math.round(daten.leiste)} px\n`);
  console.log(
    "Beschriftung        Schrift  Reserve-L  Symbol-L  Reserve-R  Level-R   Platz   Text  verschenkt",
  );
  for (const z of daten.zeilen) {
    const weg = z.reserveLinks - z.symbolBraucht + (z.reserveRechts - z.levelBraucht);
    console.log(
      `${z.text.padEnd(20)}${String(z.px).padStart(5)}px ${String(z.reserveLinks).padStart(8)} ` +
        `${String(z.symbolBraucht).padStart(9)} ${String(z.reserveRechts).padStart(10)} ` +
        `${String(z.levelBraucht).padStart(8)} ${String(z.platz).padStart(7)} ` +
        `${String(z.text_px).padStart(6)} ${String(weg).padStart(11)}`,
    );
  }
} finally {
  await h.stop();
}
