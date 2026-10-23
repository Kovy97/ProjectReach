// claude:2026-10-25T02:20:00+02:00 — 1.4.0 Welle 3: Kontrollbilder Ereignisse/Aufträge (de, 1366×768), Browser-Fixture,
// kein Electron, kein echter Spielstand. Kopf-Chip + Ereigniskarte, Reiter „Arbeitsaufträge“ mit Angebot und Auftrag,
// Logbuch in der Fertigkeiten-Übersicht.
import { startHarness } from "./sim-harness.mjs";

const h = await startHarness({ port: 5416, fixture: "endgame", locale: "de", viewport: { width: 1366, height: 768 } });
const { page } = h;

async function go(id) {
  const loc = page.locator(`[data-guide-id="sidebar.${id}"], [data-guide-id="topbar.${id}"]`).first();
  for (let i = 0; i < 3; i++) await page.keyboard.press("Escape");
  if (await loc.count()) await loc.evaluate((el) => el.click());
  await page.waitForTimeout(700);
}

try {
  await page.evaluate(() => {
    const d = window.__hfDebug;
    const s = d.state;
    const ev = s.skillEvents;
    ev.active = { id: "rich_vein", skill: "mining", actionsLeft: 14, msLeft: 420000 };
    ev.log = [
      { seq: 4, id: "customer", skill: "smithing", atMs: s.elapsedMs - 60000, itemId: "runite_bar", qty: 140 },
      { seq: 3, id: "storm_fell", skill: "woodcutting", atMs: s.elapsedMs - 1500000, itemId: "wraithwood_log", qty: 15 },
      { seq: 2, id: "thrifty_hand", skill: "smithing", atMs: s.elapsedMs - 3700000 },
      { seq: 1, id: "bountiful_harvest", skill: "farming", atMs: s.elapsedMs - 7300000 },
    ];
    ev.seq = 4;
    const o = s.workOrders;
    o.offer = { id: 3, kind: "produce", skill: "smithing", actionId: "smelt_runite", itemId: "runite_bar", count: 140, minutes: 30, band: 4, gold: 9800, xp: 85000, customerId: "dashk", baseline: 0 };
    o.offerMsLeft = 600000;
    o.open = [
      { id: 2, kind: "deliver", skill: "mining", actionId: "mine_runite", itemId: "runite_ore", count: 220, minutes: 25, band: 4, gold: 12400, xp: 64000, customerId: "grumm", baseline: (s.stats.producedById?.runite_ore ?? 0) - 130 },
      { id: 1, kind: "produce", skill: "bowcraft", actionId: "fletch_titanium_arrow", itemId: "titanium_arrow", count: 600, minutes: 35, band: 5, gold: 15600, xp: 410000, customerId: "caedren", baseline: (s.stats.producedById?.titanium_arrow ?? 0) - 600 },
    ];
    o.seq = 3;
    s.bank.titanium_arrow = 800;
  });
  await page.waitForTimeout(800);
  await go("quests");
  const tab = page.locator(".quests-tab-btn").filter({ hasText: /Arbeitsaufträge/ }).first();
  if (await tab.count()) await tab.evaluate((el) => el.click());
  await page.waitForTimeout(9000); // Toasts aus dem Fixture-Aufbau abklingen lassen
  await h.shot("w3-work-orders");
  await page.locator(".work-order").nth(2).evaluate((el) => el.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(300);
  await h.shot("w3-work-orders-open");
  // Ereigniskarte als Toast: Logbuch-Nummer erhöhen
  await page.evaluate(() => {
    const s = window.__hfDebug.state;
    s.skillEvents.log.unshift({ seq: 5, id: "fish_shoal", skill: "fishing", atMs: s.elapsedMs });
    s.skillEvents.seq = 5;
  });
  await page.waitForTimeout(1500);
  await h.shot("w3-event-toast");
  await go("skills-overview");
  await page.waitForTimeout(500);
  await h.shot("w3-event-log");
} finally {
  await h.stop();
}
