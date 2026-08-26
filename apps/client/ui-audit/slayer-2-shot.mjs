/**
 * Chef-Fund 26.08.2026 (Slayer-Item-Shop-Redesign): Verifikation der neuen `slayer-shop-*`-
 * Kartenfamilie (feste Kartenhöhe, Bild füllt den Container, Rarity nur am Item-Zellen-Rahmen),
 * der Basalt-Flächen (Reward Shop + Auftragszettel, statt Holz), der neu sortierten/vergrößerten
 * Kampf-Knöpfe direkt unterm Zielmonster+Fortschritt und des neuen "Marke einlösen"-Knopfs.
 * de + ru, 1366x768 + 1600x900. Screenshots nach ui-audit/shots-slayer-2/.
 */
import { startHarness } from "./sim-harness.mjs";

const VIEWPORTS = [
  { name: "1366x768", width: 1366, height: 768 },
  { name: "1600x900", width: 1600, height: 900 },
];
const LOCALES = ["de", "ru"];

for (const locale of LOCALES) {
  for (const vp of VIEWPORTS) {
    const h = await startHarness({
      port: 5428,
      fixture: "midgame",
      locale,
      viewport: { width: vp.width, height: vp.height },
      outDir: "ui-audit/shots-slayer-2",
    });
    const { page } = h;
    try {
      await page.waitForTimeout(1200);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);

      // Aktiver Auftrag (Restmenge > 0, Kampf-Knöpfe sichtbar) + Slayer-Level 55 (ein Teil des
      // Shops freigeschaltet, ein Teil noch gesperrt — void_anchor@60/slayer_greaves@65/
      // slayer_amulet@70/slayer_war_brew@70/slayer_helm@80/abyssal_core@80 bleiben zu) +
      // Punkte 180 (einiges leistbar, slayer_vambraces@260 Pkt bewusst NICHT — "zu teuer"-Zustand)
      // + kleiner Streak für den Streak-Chip + eine Auftragsmarke im Inventar (Marke-einlösen-Knopf
      // sichtbar).
      const result = await page.evaluate(() => {
        const dbg = window.__hfDebug;
        const s = dbg.state;
        s.skills.slayer = { xp: 1_050_000 }; // Level ~55
        s.slayerTask = {
          masterId: "brenna_ashwick",
          monsterId: "rot_rat",
          isTower: true,
          required: 12,
          progress: 5,
          xpReward: 340,
          pointReward: 18,
        };
        s.slayerPoints = 180;
        s.slayerStreak = 3;
        const emptyIdx = s.inventory.slots.findIndex((sl) => sl === null);
        if (emptyIdx >= 0) s.inventory.slots[emptyIdx] = { itemId: "chronicle_task_token", qty: 3 };
        return { level: dbg.content ? undefined : undefined, emptyIdx };
      });
      console.log(`[${locale}/${vp.name}] Token-Slot gesetzt bei Index`, result.emptyIdx);
      // Level-Sprung durch das direkte xp-Setzen löst den Levelup-/Meilenstein-Toast aus
      // (Toasts.tsx TOAST_MS=4000) — vor dem Screenshot abklingen lassen.
      await page.waitForTimeout(4600);

      const navBtn = page.locator('[data-guide-id="sidebar.slayer"]').first();
      const clicked = (await navBtn.count()) > 0;
      if (clicked) await navBtn.click();
      console.log(`[${locale}/${vp.name}] Slayer-Nav geklickt:`, clicked);
      await page.waitForTimeout(900);
      for (let k = 0; k < 3; k++) { await page.keyboard.press("Escape"); await page.waitForTimeout(200); }

      // Horizontal-Scroll-Check (Chef-Vorgabe: bei 1366x768 kein horizontales Scrollen).
      const scrollInfo = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      console.log(`[${locale}/${vp.name}] scrollWidth=${scrollInfo.scrollWidth} clientWidth=${scrollInfo.clientWidth}`);

      // Auftragszettel (Monster + Fortschritt + Kampf-Knöpfe + Marke-einlösen).
      await h.shot(`${locale}-${vp.name}-task`);

      // Kartenhöhen-/Bildfüllungs-Check im Reward Shop.
      const shopPanel = page.locator(".slayer-shop-panel").last();
      await shopPanel.scrollIntoViewIfNeeded().catch(() => {});
      await page.waitForTimeout(300);
      const cardInfo = await page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll(".slayer-shop-card"));
        return cards.map((c) => {
          const rect = c.getBoundingClientRect();
          const cell = c.querySelector(".slayer-shop-cell");
          const cellRect = cell ? cell.getBoundingClientRect() : null;
          const img = c.querySelector(".slayer-shop-cell .item-cell-img");
          const imgRect = img ? img.getBoundingClientRect() : null;
          const locked = c.classList.contains("slayer-card-locked");
          const rarityCls = cell ? [...cell.classList].find((cl) => cl.startsWith("rarity-")) : null;
          return {
            height: Math.round(rect.height),
            cellW: cellRect ? Math.round(cellRect.width) : null,
            cellH: cellRect ? Math.round(cellRect.height) : null,
            imgFillPct: cellRect && imgRect ? Math.round((imgRect.width / cellRect.width) * 100) : null,
            locked,
            rarityCls,
          };
        });
      });
      console.log(`[${locale}/${vp.name}] Kartendaten:`, JSON.stringify(cardInfo));
      const heights = cardInfo.map((c) => c.height);
      console.log(`[${locale}/${vp.name}] Kartenhöhen min/max:`, Math.min(...heights), Math.max(...heights));

      await h.shot(`${locale}-${vp.name}-shop`);

      // Volle Seite zusätzlich (Gesamteindruck der Hierarchie/Texturen).
      await h.shot(`${locale}-${vp.name}-full`, { fullPage: true });

      if (h.errors.length) {
        console.log(`[${locale}/${vp.name}] PAGE ERRORS:\n` + h.errors.join("\n"));
      }
    } finally {
      await h.stop();
    }
  }
}
