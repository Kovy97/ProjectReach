// Verifikations-Shots für die Jagen-Seite + Gebiet-Modal, Redesign Runde 2 (Chef-Kritik 28.08.2026:
// "sieht immer noch komisch aus" / "Modal immer noch zu klein"). Fixture hfhunt_demo deckt alle
// Fallen-Zustände ab: Falle 1+2 laufen (pastures/borderlands), Falle 3 hat einen frischen Fang ohne
// Gebiet ("Fang wartet"), Falle 4 ist leer mit Fehlschlag-Historie ("Leer"), Falle 5+6 sind gesperrt
// (Jagen-Stufe zu niedrig). Port 5470 (eigener Port dieses Agenten).
import { startHarness } from "./sim-harness.mjs";

const OUT = "G:/GameDev/apps/client/ui-audit/shots-hunting-review";
const PORT = 5470;

async function hideToasts(page) {
  await page.addStyleTag({ content: ".toast-stack { display: none !important; }" });
}

async function gotoHunting(page) {
  await page.keyboard.press("Escape").catch(() => {});
  await page.waitForTimeout(200);
  const skip = page.locator(".guide-bubble-skip");
  if (await skip.count()) {
    await skip.first().click();
    await page.waitForTimeout(300);
  }
  await page.locator('[data-guide-id="sidebar.hunting"]').first().click();
  await page.waitForTimeout(900);
}

async function shotPage(locale, viewport, name) {
  const h = await startHarness({ port: PORT, fixture: "hfhunt_demo", locale, viewport, outDir: OUT });
  try {
    await hideToasts(h.page);
    await gotoHunting(h.page);
    await h.shot(name);
    console.log(`${name} ok — errors: ${h.errors.length}`);
    if (h.errors.length) console.log(h.errors.join("\n"));
  } finally {
    await h.stop();
  }
}

async function openPickerOnSlot(page, slotIndex) {
  const slot = page.locator(".hunt-traps .hunt-trap-card").nth(slotIndex);
  // Leerer/needs-zone Platz: die ganze Karte ist klickbar (Redesign Runde 2) — Klick auf das
  // Fallen-Illustration-Feld statt auf einen bestimmten Knopf.
  await slot.locator(".hunt-trap-art").click();
  await page.waitForTimeout(500);
  // Erstes Gebiet der Liste explizit anklicken (prüft die Auswahl-Interaktion selbst mit).
  await page.locator(".hzp-zone-tile").first().click();
  await page.waitForTimeout(300);
}

async function shotModal(locale, viewport, name) {
  const h = await startHarness({ port: PORT, fixture: "hfhunt_demo", locale, viewport, outDir: OUT });
  try {
    await hideToasts(h.page);
    await gotoHunting(h.page);
    // Slot-Index 3 (0-based, "Falle 4") ist im Fixture leer (kein Gebiet) → öffnet den Picker.
    await openPickerOnSlot(h.page, 3);
    await h.shot(name);
    console.log(`${name} ok — errors: ${h.errors.length}`);
    if (h.errors.length) console.log(h.errors.join("\n"));
  } finally {
    await h.stop();
  }
}

await shotPage("de", { width: 1920, height: 1080 }, "page-1920-de");
await shotPage("ru", { width: 1366, height: 768 }, "page-1366-ru");
await shotModal("de", { width: 1920, height: 1080 }, "modal-1920-de");
await shotModal("ru", { width: 1366, height: 768 }, "modal-1366-ru");
