// claude:2026-10-23T21:20:00+02:00 — 1.4.0 Welle 1: je Bereich ein Kontrollbild (de, 1366×768), Browser-Fixture,
// kein Electron, kein echter Spielstand. Mahlzeit-Platz, Ländereien in Seitenleiste/Kopf, Stufen-Sterne + 2H im
// Inventar, gesperrter Nebenhand-Platz, Itemkarte mit „Zweihändig · Langbogen“ und Sternen.
import { startHarness } from "./sim-harness.mjs";

const h = await startHarness({ port: 5412, fixture: "endgame", locale: "de", viewport: { width: 1366, height: 768 } });
const { page } = h;

async function go(id) {
  const sel = `[data-guide-id="sidebar.${id}"], [data-guide-id="topbar.${id}"]`;
  const loc = page.locator(sel).first();
  for (let i = 0; i < 3; i++) await page.keyboard.press("Escape");
  if (await loc.count()) await loc.click({ force: true });
  await page.waitForTimeout(700);
}

try {
  await page.evaluate(() => {
    const d = window.__hfDebug;
    const s = d.state;
    const add = (id, n) => {
      const slot = s.inventory.slots.findIndex((x) => !x);
      if (slot >= 0) s.inventory.slots[slot] = { itemId: id, qty: n };
    };
    add("marshroot_chowder", 12);
    add("cooked_trout", 40);
    add("godiron_longbow", 1);
    add("mithril_sword", 1);
    add("mithril_bar", 120);
    s.character.meal = "marshroot_chowder";
    s.character.food = "cooked_trout";
    s.character.equipment.mainhand = "godiron_longbow";
    s.character.equipment.offhand = null;
    // Ländereien: zwei Beete wachsen, eine Falle läuft
    if (s.farmPlots?.[0]) { s.farmPlots[0].cropId = Object.keys(d.content.crops)[0]; s.farmPlots[0].plantedAtMs = s.elapsedMs; }
    if (s.farmPlots?.[1]) { s.farmPlots[1].cropId = Object.keys(d.content.crops)[0]; s.farmPlots[1].plantedAtMs = s.elapsedMs; }
    const z = d.content.huntingZones?.[0];
    if (z && s.huntTraps?.[0]) { s.huntTraps[0].zoneId = z.id; s.huntTraps[0].remainingMs = 600000; }
  });
  await page.waitForTimeout(800);

  await go("combat");
  const prep = page.locator('[role="tab"]').filter({ hasText: /Vorbereitung|Prep/i }).first();
  if (await prep.count()) await prep.click({ force: true });
  await page.waitForTimeout(800);
  await h.shot("w1-combat-prep-meal");

  await go("farming");
  await h.shot("w1-farm-estates");

  await go("character");
  await h.shot("w1-character-2h-stars");
  const bowCell = page.locator(".item-cell").filter({ has: page.locator(".item-cell-2h-badge") }).first();
  if (await bowCell.count()) {
    await bowCell.hover();
    await page.waitForTimeout(700);
    await h.shot("w1-tooltip-bow");
  }
} finally {
  await h.stop();
}
