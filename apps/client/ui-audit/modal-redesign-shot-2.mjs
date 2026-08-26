/**
 * Verifikation Chef-Testbericht 26.08.2026 (Variante-Tasche + Item-Wiki):
 * - VariantPouchModal: Aktionsknöpfe jetzt .btn-iron/.btn-iron--sm, Zeilen-9-Slice-Rahmen mit
 *   synchronem border-width/border-image-width (plain 2.125-Multiplikator statt driftendem
 *   calc(Npx*2.125)) + border-image-repeat:round (kein Stretch-Verschmieren am breiten/flachen
 *   Rahmen mehr), Zeilen-Hintergrund jetzt Basalt statt derselben Leder-Textur wie der Modalgrund.
 * - ItemWikiModal: Zeilen-Hintergrund ebenfalls Basalt statt Leder, alle Emojis durch
 *   icon_ach_*-Embleme ersetzt.
 *
 * Eigenständige Kopie von modal-redesign-shot.mjs (Vorlage) — eigener Port (5424, Multi-Agent-
 * Konvention) + eigener Screenshot-Ordner (shots-modale-2/) + zusätzlicher Zeilen-Rahmen-Crop
 * (Vergrößerung EINER .pouch-row, um alle vier Kanten nebeneinander zu prüfen).
 */
import { startHarness } from "./sim-harness.mjs";

async function run(locale) {
  const h = await startHarness({ port: 5424, fixture: "midgame", locale, viewport: { width: 1366, height: 768 } });
  const { page } = h;
  try {
    await page.waitForTimeout(1200);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
    await page.keyboard.press("Escape");

    const prep = await page.evaluate(() => {
      const dbg = window.__hfDebug;
      const s = dbg.state;
      const C = dbg.content;
      const items = Object.values(C.items);
      let base =
        items.find((i) => i.type === "equipment" && i.rarity === "epic" && i.requirements && Object.keys(i.requirements).length > 0) ??
        items.find((i) => i.type === "equipment" && i.rarity === "epic") ??
        items.find((i) => i.type === "equipment" && i.requirements && Object.keys(i.requirements).length > 0) ??
        items.find((i) => i.type === "equipment");
      const affixIds = Object.keys(C.affixes ?? {});
      const suffixIds = Object.keys(C.suffixes ?? {});

      for (const skillId of Object.keys(s.skills)) {
        if (s.skills[skillId]) s.skills[skillId].xp = Math.min(s.skills[skillId].xp ?? 0, 50000);
      }
      s.character.gold = 999999;

      s.inventory.instances = [];
      s.inventory.instances.push({
        instanceId: "sim-inst-1",
        baseItemId: base.id,
        affixes: affixIds.length
          ? [
              { affixId: affixIds[0], tier: 3 },
              { affixId: affixIds[Math.min(1, affixIds.length - 1)], tier: 2 },
            ]
          : [],
        suffix: suffixIds.length ? { suffixId: suffixIds[0], roll: 0.87 } : undefined,
      });
      s.inventory.instances.push({
        instanceId: "sim-inst-2",
        baseItemId: base.id,
        affixes: affixIds.length ? [{ affixId: affixIds[Math.min(2, affixIds.length - 1)], tier: 1 }] : [],
        suffix: suffixIds.length > 1 ? { suffixId: suffixIds[1], roll: 0.42 } : undefined,
      });

      const freeSlot = s.inventory.slots.findIndex((x) => x === null);
      if (freeSlot >= 0) s.inventory.slots[freeSlot] = { itemId: base.id, qty: 3 };

      s.discoveredItems = s.discoveredItems ?? {};
      s.discoveredItems[base.id] = true;

      return {
        baseId: base.id,
        baseName: base.name?.de ?? base.name?.en ?? base.id,
        rarity: base.rarity,
        affixCount: affixIds.length,
        suffixCount: suffixIds.length,
      };
    });
    console.log(`BEFUND vorbereitet [${locale}]:`, JSON.stringify(prep));

    await page.waitForTimeout(4600);

    await page.locator('[data-guide-id="topbar.bank"]').first().click();
    await page.waitForTimeout(1000);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);

    const badge = page.locator(".bank-ledger-panel--inventory .item-cell-inst-badge").first();
    const badgeCount = await badge.count();
    console.log(`BEFUND stern-badge-zellen [${locale}]:`, badgeCount);
    await badge.click();
    await page.waitForTimeout(4800);

    const pouchModal = page.locator(".pouch-modal");
    console.log(`BEFUND pouch-modal offen [${locale}]:`, await pouchModal.count());

    await page.screenshot({ path: `ui-audit/shots-modale-2/pouch-${locale}-1366x768-full.png` });
    await pouchModal.screenshot({ path: `ui-audit/shots-modale-2/pouch-${locale}-1366x768-crop.png` });
    // Zoom auf EINE Zeilen-Karte — alle vier Rahmenkanten nebeneinander vergleichbar.
    const firstRow = page.locator(".pouch-row").first();
    await firstRow.screenshot({ path: `ui-audit/shots-modale-2/pouch-row-${locale}-1366x768.png` });

    await page.setViewportSize({ width: 1600, height: 900 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: `ui-audit/shots-modale-2/pouch-${locale}-1600x900-full.png` });
    await pouchModal.screenshot({ path: `ui-audit/shots-modale-2/pouch-${locale}-1600x900-crop.png` });
    await firstRow.screenshot({ path: `ui-audit/shots-modale-2/pouch-row-${locale}-1600x900.png` });

    const variantRow = page.locator(".pouch-row--variant").first();
    await variantRow.click();
    await page.waitForTimeout(500);
    const wikiBtn = page.locator(".itip-wiki-btn").first();
    console.log(`BEFUND wiki-knopf [${locale}]:`, await wikiBtn.count());
    await wikiBtn.click();
    await page.waitForTimeout(600);

    const wikiModal = page.locator(".iwk-modal");
    console.log(`BEFUND wiki-modal offen [${locale}]:`, await wikiModal.count());

    await page.screenshot({ path: `ui-audit/shots-modale-2/wiki-${locale}-1600x900-full.png` });
    await wikiModal.screenshot({ path: `ui-audit/shots-modale-2/wiki-${locale}-1600x900-crop.png` });

    await page.setViewportSize({ width: 1366, height: 768 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: `ui-audit/shots-modale-2/wiki-${locale}-1366x768-full.png` });
    await wikiModal.screenshot({ path: `ui-audit/shots-modale-2/wiki-${locale}-1366x768-crop.png` });

    if (h.errors.length) {
      console.log(`PAGE ERRORS [${locale}]:\n` + h.errors.join("\n"));
    }
  } finally {
    await h.stop();
  }
}

await run("de");
await run("ru");
