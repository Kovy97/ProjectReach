// Verifikations-Shots für das neue Jagdbuch-Sammelalbum (Redesign 28.08.2026 Runde 3, Chef-Kritik
// "Der Hunting Log gehört auch überarbeitet und cooler gemacht. Aktuell sehr simpel und langweilig.").
// Fixture hfhunt_demo hat von Haus aus KEINE Fang-Historie (huntCatchesById fehlt) — patcht per
// setState eine realistische Weiden-Zeile (Huhn viele Fänge, Kuh besiegt-aber-nie-gefangen, Wildschwein
// nie besiegt, Wildziege wenige Fänge inkl. einem seltenen entdeckten Rüstungsteil) hinein, damit alle
// drei Kartenzustände + die Kopf-Kacheln (seltenster Fund/Lieblingsfang) im Screenshot sichtbar sind.
// Weiter entfernte Gebiete (Aschfelder/Schwarzdornwald quest-gesperrt, Wildwald-Jagdgründe
// stufengesperrt) liefern ihre Sperr-Zustände bereits nativ aus dem Fixture. Port 5473 (eigener Port
// dieses Agenten).
import { startHarness } from "./sim-harness.mjs";

const OUT = "G:/GameDev/apps/client/ui-audit/shots-hunting-review";
const PORT = 5473;

async function hideToasts(page) {
  // .mwc-backdrop: die fixture-eigene laufende Aktion ("Grabstahlader") verdient während der
  // Harness-Laufzeit Meisterschafts-XP — bei genug Wartezeit kann eine Aufstiegs-Zeremonie mitten
  // ins Bild poppen (beobachtet in einem Debug-Lauf dieses Skripts). Defensiv mit ausgeblendet.
  await page.addStyleTag({ content: ".toast-stack, .mwc-backdrop { display: none !important; }" });
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

function seedHuntBook(state) {
  state.stats.huntCatches = 57;
  state.stats.huntCatchesById = { chicken: 42, cow: 0, feral_goat: 15 };
  state.monsterKills.chicken = 50;
  state.monsterKills.cow = 20;
  state.monsterKills.boar = 0;
  state.monsterKills.feral_goat = 8;
  state.seenDrops.chicken = ["feather", "raw_chicken"];
  state.seenDrops.cow = [];
  state.seenDrops.feral_goat = ["raw_hide", "goat_hide_jerkin"];
}

async function shotBook(locale, viewport, name) {
  const h = await startHarness({ port: PORT, fixture: "hfhunt_demo", locale, viewport, outDir: OUT });
  try {
    await hideToasts(h.page);
    await h.setState(seedHuntBook);
    await gotoHunting(h.page);

    // Jagdbuch ist per Default aufgeklappt (getHuntBookCollapsed() → false) — defensiv trotzdem
    // prüfen, falls ein früherer Lauf denselben Browser-Kontext/localStorage wiederverwendet.
    const header = h.page.locator(".hunt-book-section .category-header");
    const expanded = await header.getAttribute("aria-expanded");
    if (expanded === "false") {
      await header.click();
      await h.page.waitForTimeout(300);
    }

    // Explizit an den OBEREN Rand des Jagdbuchs scrollen (Kopf-Kacheln + Filter sollen im Shot
    // sichtbar sein) — `scrollIntoViewIfNeeded()`s "nearest edge"-Heuristik landet bei einer so
    // hohen Sektion (viele Gebiets-Bänder) auf kleinen Viewports (1366×768) sonst mitten im Inhalt.
    await h.page.locator(".hunt-book-section").evaluate((el) => el.scrollIntoView({ block: "start" }));
    await h.page.waitForTimeout(300);
    await h.shot(name);
    console.log(`${name} ok — errors: ${h.errors.length}`);
    if (h.errors.length) console.log(h.errors.join("\n"));
  } finally {
    await h.stop();
  }
}

await shotBook("de", { width: 1920, height: 1080 }, "book-1920-de");
await shotBook("ru", { width: 1366, height: 768 }, "book-1366-ru");
