/**
 * Beleg für das Item-Wiki-Modal-Redesign (Chef-Auftrag 2026-08-25: "viel zu klein — mehr Platz
 * des Screens nutzen, Source/Used-for besser präsentieren, alles größer für die Lesbarkeit").
 *
 * Öffnet das Wiki für DREI Items (ein Drop-Material mit vielen Quellen, ein Ausrüstungsteil, eine
 * Rune) über den echten Klickpfad (Charakterseite → Inventar-Zelle → "?"-Button im Tooltip), bei
 * zwei Auflösungen (1920×1080, 1366×768). Misst Modal-Breite/-Höhe, inneren vs. Rahmen-Scroll und
 * horizontalen Overflow an Modal + Karten.
 *
 * Run: node ui-audit/item-wiki-redesign-shot.mjs   (from apps/client/)
 */
import { startHarness } from "./sim-harness.mjs";

const VIEWPORTS = [
  { name: "1920x1080", width: 1920, height: 1080 },
  { name: "1366x768", width: 1366, height: 768 },
];

async function run(viewport) {
  const h = await startHarness({ port: 5394, fixture: "midgame", locale: "de", viewport });
  const { page } = h;
  try {
    await page.waitForTimeout(600);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);

    // Drei Kandidaten aus dem Content-Katalog wählen: Material mit den meisten Monster-Quellen,
    // eine Ausrüstung mit Schaden/Rüstung (Kernwerte-Chips im neuen Kopf), eine Rune.
    const picks = await h.patchContent((dbg) => {
      const { content } = dbg;
      const counts = {};
      for (const m of Object.values(content.monsters)) {
        for (const roll of m.loot) counts[roll.itemId] = (counts[roll.itemId] ?? 0) + 1;
      }
      let materialId = null;
      let materialCount = 0;
      for (const [id, c] of Object.entries(counts)) {
        const it = content.items[id];
        if (it && it.type === "material" && c > materialCount) {
          materialId = id;
          materialCount = c;
        }
      }
      let equipId = null;
      for (const it of Object.values(content.items)) {
        if (it.type === "equipment" && (it.damageMin !== undefined || it.armorRating)) {
          equipId = it.id;
          break;
        }
      }
      let runeId = null;
      for (const it of Object.values(content.items)) {
        if (it.rune) {
          runeId = it.id;
          break;
        }
      }
      return { materialId, materialCount, equipId, runeId };
    });
    console.log(`[wiki-redesign] picks @ ${viewport.name}:`, JSON.stringify(picks));

    const ids = [picks.materialId, picks.equipId, picks.runeId].filter(Boolean);

    // `patchContent`/`setState` reconstruct `fn` via `.toString()` — sie dürfen NICHT über `ids`
    // schließen (Node-Variable). Direktes `page.evaluate` mit `ids` als Serialisierungs-Argument
    // ist hier der richtige Weg statt der harness-Helfer.
    await page.evaluate((idsArg) => {
      const state = window.__hfDebug.state;
      state.inventory.slots[0] = { itemId: idsArg[0], qty: 1 };
      state.inventory.slots[1] = { itemId: idsArg[1], qty: 1 };
      state.inventory.slots[2] = { itemId: idsArg[2], qty: 1 };
    }, ids);

    await page.waitForTimeout(400);
    await page.locator('[data-guide-id="topbar.character"]').first().click();
    await page.waitForTimeout(600);

    const results = [];
    for (let slot = 0; slot < ids.length; slot++) {
      const cell = page.locator(".cs-inv-grid .cs-inv-slot-wrap").nth(slot).locator(".item-cell").first();
      await cell.click();
      await page.waitForTimeout(250);
      const wikiBtn = page.locator(".itip-wiki-btn").first();
      if ((await wikiBtn.count()) === 0) {
        console.log(`[wiki-redesign] slot ${slot} (${ids[slot]}): kein "?"-Button gefunden — übersprungen`);
        await page.keyboard.press("Escape");
        await page.waitForTimeout(200);
        continue;
      }
      await wikiBtn.click();
      await page.waitForTimeout(400);

      const measure = await page.evaluate(() => {
        const modal = document.querySelector(".iwk-modal");
        if (!modal) return null;
        const r = modal.getBoundingClientRect();
        const body = modal.querySelector(".iwk-body");
        const cols = modal.querySelectorAll(".iwk-list");
        const overflowCols = [...cols].map((c) => c.scrollWidth <= c.clientWidth + 1);
        const frameScrolls = modal.scrollHeight > modal.clientHeight + 1;
        const bodyScrolls = body ? body.scrollHeight > body.clientHeight + 1 : false;
        const colsWidth = getComputedStyle(modal.querySelector(".iwk-columns")).gridTemplateColumns.split(" ").length;
        return {
          modalW: Math.round(r.width),
          modalH: Math.round(r.height),
          modalOverflowsX: modal.scrollWidth > modal.clientWidth + 1,
          frameScrolls,
          bodyScrolls,
          colsCount: colsWidth,
          rowCardsOverflowOk: overflowCols.every(Boolean),
        };
      });
      console.log(`[wiki-redesign] ${viewport.name} slot ${slot} (${ids[slot]}):`, JSON.stringify(measure));
      results.push({ id: ids[slot], measure });

      await page.screenshot({ path: `ui-audit/shots-item-wiki/after-${viewport.name}-${slot}-${ids[slot]}.png` });
      console.log(`SHOT SAVED: after-${viewport.name}-${slot}-${ids[slot]}.png`);

      await page.keyboard.press("Escape");
      await page.waitForTimeout(200);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(200);
    }

    if (h.errors.length) {
      console.log(`[wiki-redesign] PAGE ERRORS @ ${viewport.name}:\n` + h.errors.join("\n"));
    }
    return results;
  } finally {
    await h.stop();
  }
}

for (const vp of VIEWPORTS) {
  await run(vp);
}
