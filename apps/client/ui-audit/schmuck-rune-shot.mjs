/**
 * Offener Punkt des Content-Agents: laesst sich eine Schmuck-Rune (Tier IV) am Verzauberungstisch
 * wirklich auf einen Ring legen? Content und Engine sind gruen, die UI-Verdrahtung war ungeprueft.
 *
 * Ablauf: Rune des Kopfgelds + einen Meister-Ring ins Inventar, Tisch oeffnen, Ring waehlen, Karte
 * pruefen (nicht abgeblendet, Badge "Schmuck"), Verzaubern klicken, Affix am Ring pruefen.
 */
import { startHarness } from "./sim-harness.mjs";

const h = await startHarness({ port: 5400, fixture: "midgame", locale: "de" });
const { page } = h;
try {
  await page.waitForTimeout(1400);
  await page.keyboard.press("Escape"); await page.waitForTimeout(300); await page.keyboard.press("Escape");
  const vorbereitet = await page.evaluate(() => {
    const dbg = window.__hfDebug; const s = dbg.state; const I = dbg.content.items;
    const ring = Object.values(I).find((i) => i.type === "equipment" && (i.slot === "ring1" || i.slot === "ring2") && i.rarity === "legendary")
      ?? Object.values(I).find((i) => i.type === "equipment" && i.slot === "ring1");
    s.character.gold = 1_000_000;
    s.skills.runecrafting = { xp: 5_000_000 }; // nicht 99: die Meisterweihe-Zeremonie faengt sonst jeden Klick ab
    const frei = s.inventory.slots.findIndex((x) => x === null);
    s.inventory.slots[frei] = { itemId: ring.id, qty: 1 };
    s.bank.rune_bounty = 3; // aus dem LAGER, das prueft die heutige Lager-Regel gleich mit
    return { ring: ring.id, ringName: ring.name.de, rarity: ring.rarity };
  });
  console.log("BEFUND vorbereitet:", JSON.stringify(vorbereitet));
  await page.waitForTimeout(500);
  const nav = page.locator('.sidebar-btn, [data-guide-id^="sidebar."]');
  const n = await nav.count();
  for (let i = 0; i < n; i++) { const t = ((await nav.nth(i).textContent()) ?? "").trim(); if (/verzauber/i.test(t)) { await nav.nth(i).click(); break; } }
  await page.waitForTimeout(1300);
  await page.keyboard.press("Escape"); await page.waitForTimeout(300);
  // Ring in der Item-Liste waehlen
  const zeile = page.locator(".ench-item-row").filter({ hasText: vorbereitet.ringName }).first();
  console.log("BEFUND ring-in-liste:", await zeile.count());
  await zeile.click(); await page.waitForTimeout(600);
  const karte = page.locator(".ench-rune-card").filter({ hasText: /Kopfgeld/ }).first();
  const kartenInfo = await karte.evaluate((el) => ({ cls: el.className, badge: el.querySelector(".ench-rune-badge")?.textContent, lager: el.querySelector(".ench-rune-card-stored")?.textContent, title: el.getAttribute("title") }));
  console.log("BEFUND karte:", JSON.stringify(kartenInfo));
  await karte.click(); await page.waitForTimeout(500);
  await page.screenshot({ path: "ui-audit/shots-runen-tier-iv/schmuck-tisch.png" });
  const btn = page.locator("button").filter({ hasText: /^verzaubern$/i }).first();
  console.log("BEFUND verzaubern-knopf:", await btn.count(), "disabled=", await btn.isDisabled().catch(() => "?"));
  await btn.click(); await page.waitForTimeout(700);
  const danach = await page.evaluate((ringId) => {
    const s = window.__hfDebug.state;
    const inst = s.inventory.instances.find((i) => i.baseItemId === ringId);
    return { affixes: inst?.affixes ?? null, lagerRest: s.bank.rune_bounty ?? 0, feedback: document.querySelector(".ench-feedback, .ench-feedback-banner")?.textContent ?? null };
  }, vorbereitet.ring);
  console.log("BEFUND danach:", JSON.stringify(danach));
  await page.screenshot({ path: "ui-audit/shots-runen-tier-iv/schmuck-verzaubert.png" });
} finally { await h.stop(); }
