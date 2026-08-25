/**
 * Verifikation Chef-Auftrag 1.1.0 (25.08.): Wiki-Modal + Varianten-Tasche (verzauberte Items)
 * bekommen einen anderen Hintergrund (kein Stein mehr) + die Varianten-Tasche wird großzügiger
 * (mehr Platz, größere Bilder/Schrift, klare Verzauberungs-Zeilen statt loser Chips).
 *
 * Ablauf je Sprache: Bank öffnen, ein Ausrüstungsstück mit Grundmenge + zwei verzauberten
 * Varianten (Affixe+Suffix, unterschiedliche Tiers) ins Inventar legen, die Zelle anklicken
 * (öffnet die Varianten-Tasche, weil versionCount > 1). Danach eine Zeile anklicken (pinnt
 * ItemTooltip) und dessen "?"-Knopf klicken (öffnet das Item-Wiki-Modal). Je Schritt zwei
 * Screenshots: die volle Seite (Viewport-Fit-Check) UND ein Element-Crop NUR des Modals
 * (saubere Detailansicht ohne Toast-Überlagerung).
 */
import { startHarness } from "./sim-harness.mjs";

async function run(locale) {
  const h = await startHarness({ port: 5404, fixture: "midgame", locale, viewport: { width: 1366, height: 768 } });
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

      // Level < 99 in ALLEN Skills halten — die Meisterweihe-Zeremonie faengt sonst jeden Klick ab.
      for (const skillId of Object.keys(s.skills)) {
        if (s.skills[skillId]) s.skills[skillId].xp = Math.min(s.skills[skillId].xp ?? 0, 50000);
      }
      s.character.gold = 999999;

      // Nur MEINE zwei Instanzen — sonst ist die Stern-Badge-Zelle in der Bank-Inventarspalte
      // nicht eindeutig auffindbar (andere Fixture-Items könnten ebenfalls Varianten tragen).
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

      // discoveredItems vorbelegen, damit die "Seltener Fund/Verzaubertes Item"-Toasts beim
      // Diff-Tick NICHT feuern — sie sind reines Test-Rauschen hier und verdecken sonst die
      // Screenshots (s. components/Toasts.tsx discoveredItems-Gate).
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

    // Toasts (falls das discoveredItems-Gate den genauen Feld-/Tick-Mechanismus nicht trifft)
    // vollständig auslaufen lassen, statt den genauen internen Diff-Mechanismus zu erraten.
    await page.waitForTimeout(4600);

    await page.locator('[data-guide-id="topbar.bank"]').first().click();
    await page.waitForTimeout(1000);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);

    const badge = page.locator(".bank-ledger-panel--inventory .item-cell-inst-badge").first();
    const badgeCount = await badge.count();
    console.log(`BEFUND stern-badge-zellen [${locale}]:`, badgeCount);
    await badge.click();
    // "Verzaubertes Item!"-Toasts (Toasts.tsx, Instanz-Diff auf state.totalTicks) feuern
    // erst relativ zu diesem Zeitpunkt, nicht zur State-Injektion oben — lange genug warten,
    // bis TOAST_MS (4000ms, Toasts.tsx) sicher abgelaufen ist, sonst verdecken sie die Karte.
    await page.waitForTimeout(4800);

    const pouchModal = page.locator(".pouch-modal");
    console.log(`BEFUND pouch-modal offen [${locale}]:`, await pouchModal.count());

    await page.screenshot({ path: `ui-audit/shots-modale/pouch-${locale}-1366x768-full.png` });
    await pouchModal.screenshot({ path: `ui-audit/shots-modale/pouch-${locale}-1366x768-crop.png` });

    // ── 1600×900, ohne Server-Neustart — Pouch-Modal zuerst (bevor das Wiki-Modal es per
    // mouseleave schließt, s. VariantPouchModal.tsx JSDoc "Hover-Popover-Verhalten"). ────────
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: `ui-audit/shots-modale/pouch-${locale}-1600x900-full.png` });
    await pouchModal.screenshot({ path: `ui-audit/shots-modale/pouch-${locale}-1600x900-crop.png` });

    // Eine Varianten-Zeile anklicken → pinnt ItemTooltip → dessen "?"-Knopf öffnet das Wiki-Modal
    // (schließt die Pouch dabei automatisch per mouseleave — bewusst so bestehend, nicht mein Bug).
    const variantRow = page.locator(".pouch-row--variant").first();
    await variantRow.click();
    await page.waitForTimeout(500);
    const wikiBtn = page.locator(".itip-wiki-btn").first();
    console.log(`BEFUND wiki-knopf [${locale}]:`, await wikiBtn.count());
    await wikiBtn.click();
    await page.waitForTimeout(600);

    const wikiModal = page.locator(".iwk-modal");
    console.log(`BEFUND wiki-modal offen [${locale}]:`, await wikiModal.count());

    await page.screenshot({ path: `ui-audit/shots-modale/wiki-${locale}-1600x900-full.png` });
    await wikiModal.screenshot({ path: `ui-audit/shots-modale/wiki-${locale}-1600x900-crop.png` });

    await page.setViewportSize({ width: 1366, height: 768 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: `ui-audit/shots-modale/wiki-${locale}-1366x768-full.png` });
    await wikiModal.screenshot({ path: `ui-audit/shots-modale/wiki-${locale}-1366x768-crop.png` });

    if (h.errors.length) {
      console.log(`PAGE ERRORS [${locale}]:\n` + h.errors.join("\n"));
    }
  } finally {
    await h.stop();
  }
}

await run("de");
await run("ru");
