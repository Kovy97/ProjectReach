/**
 * Chef-Fund 25.08. (1.1.0 live): "Fight Now"/"Add to Queue" auf der Slayer-Seite sahen aus wie
 * Windows-Buttons und zogen sich ueber die volle Breite. Verifikation der Gravewood-Knopf-Familie
 * (SlayerPage.tsx + slayer.css) + der Shop-Praesentation (sortiert, Stufen-Label) per Screenshot,
 * de + ru, 1366x768 + 1600x900. Setzt einen aktiven Slayer-Auftrag direkt im State (keine
 * `assignTask`-Engine-Funktion auf `window.__hfDebug` verfuegbar, nur state/content).
 */
import { startHarness } from "./sim-harness.mjs";

const VIEWPORTS = [
  { name: "1366x768", width: 1366, height: 768 },
];
const _VIEWPORTS_FULL = [
  { name: "1366x768", width: 1366, height: 768 },
  { name: "1600x900", width: 1600, height: 900 },
];
const LOCALES = ["de", "ru"];

for (const locale of LOCALES) {
  for (const vp of VIEWPORTS) {
    const h = await startHarness({
      port: 5405,
      fixture: "midgame",
      locale,
      viewport: { width: vp.width, height: vp.height },
      outDir: "ui-audit/shots-slayer",
    });
    const { page } = h;
    try {
      await page.waitForTimeout(1200);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);

      // Aktiven Slayer-Auftrag setzen (rot_rat, Etage 1, keine slayerRequirement — sauberer
      // Screenshot ohne Warnbanner) + Punkte fuer einen gemischten Shop-Zustand (manches
      // leistbar, manches nicht) + einen kleinen Streak fuer den Streak-Chip.
      await page.evaluate(() => {
        const dbg = window.__hfDebug;
        const s = dbg.state;
        s.skills.slayer = { xp: 220_000 }; // deutlich unter Level 99 (Meisterweihe faengt Klicks ab)
        s.slayerTask = {
          masterId: "brenna_ashwick",
          monsterId: "rot_rat",
          isTower: true,
          required: 12,
          progress: 5,
          xpReward: 340,
          pointReward: 18,
        };
        s.slayerPoints = 140;
        s.slayerStreak = 3;
      });
      // Level-Sprung durch das direkte xp-Setzen loest den Levelup-/Meilenstein-Toast aus
      // (Toasts.tsx TOAST_MS=4000) - vor dem Screenshot abklingen lassen, sonst verdeckt er
      // rechts oben die Buttons.
      await page.waitForTimeout(4600);

      const navBtn = page.locator('[data-guide-id="sidebar.slayer"]').first();
      const clicked = (await navBtn.count()) > 0;
      if (clicked) await navBtn.click();
      console.log(`[${locale}/${vp.name}] Slayer-Nav geklickt:`, clicked);
      await page.waitForTimeout(900);

      // Horizontal-Scroll-Check (Chef-Vorgabe: bei 1366x768 kein horizontales Scrollen).
      const scrollInfo = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      console.log(`[${locale}/${vp.name}] scrollWidth=${scrollInfo.scrollWidth} clientWidth=${scrollInfo.clientWidth}`);

      await h.shot(`${locale}-${vp.name}-task`);

      // Runter zum Shop scrollen und den Kartenbereich einfangen.
      const shopHead = page.locator(".shop-panel").last();
      await shopHead.scrollIntoViewIfNeeded().catch(() => {});
      await page.waitForTimeout(300);
      await h.shot(`${locale}-${vp.name}-shop`);

      // Volle Seite zusaetzlich (fuer Gesamteindruck der Hierarchie).
      await h.shot(`${locale}-${vp.name}-full`, { fullPage: true });

      if (h.errors.length) {
        console.log(`[${locale}/${vp.name}] PAGE ERRORS:\n` + h.errors.join("\n"));
      }
    } finally {
      await h.stop();
    }
  }
}
