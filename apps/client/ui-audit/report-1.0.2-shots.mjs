/**
 * Beleg-Aufnahmen fuer die Umsetzung des Spieler-Reports 1.0.2.
 *
 *   01  Slayer-Auftragszettel  — "Sofort kaempfen" + "Einreihen" mit Restmenge
 *   02  New Haven              — Bauwarteschlange: Einreih-Knopf auf der Karte
 *   03  New Haven              — der Planungs-Streifen mit zwei Eintraegen
 *   04  Kampf                  — "Nachlegen" in der Kampf-Kopfzeile
 *   05  Kampf                  — Gegnerliste bei laufendem Kampf + Rueckweg-Balken
 */
import { startHarness } from "./sim-harness.mjs";

const h = await startHarness({ port: 5383, fixture: "midgame", locale: "de" });
const { page } = h;

const nav = page.locator('.sidebar-btn, [data-guide-id^="sidebar."], [data-guide-id^="topbar."]');
async function zuSeite(muster) {
  const n = await nav.count();
  for (let i = 0; i < n; i++) {
    const txt = ((await nav.nth(i).textContent()) ?? "").trim();
    if (muster.test(txt)) { await nav.nth(i).click(); return txt; }
  }
  return null;
}
const shot = (name) => page.screenshot({ path: `ui-audit/shots-report-102/${name}.png` });

try {
  await page.waitForTimeout(1400);
  await page.keyboard.press("Escape");

  // ── 01 Slayer ────────────────────────────────────────────────────────
  console.log("BEFUND nav-slayer:", await zuSeite(/slayer/i));
  await page.waitForTimeout(1200);
  const fightBtns = await page.locator(".slayer-task-fight-row .btn").allTextContents();
  console.log("BEFUND slayer-knoepfe:", JSON.stringify(fightBtns));
  await shot("01-slayer");

  // ── 02/03 New Haven ──────────────────────────────────────────────────
  console.log("BEFUND nav-newhaven:", await zuSeite(/new haven|haven/i));
  await page.waitForTimeout(1400);
  // In die Listenansicht, dort stehen die Bau-Knoepfe
  const listTab = page.locator(".nh-view-tab").filter({ hasText: /liste|list/i }).first();
  if (await listTab.count()) { await listTab.click(); await page.waitForTimeout(800); }
  const queueBtns = page.locator(".nh-queue-btn");
  const anzahl = await queueBtns.count();
  console.log("BEFUND einreih-knoepfe:", anzahl);
  await shot("02-newhaven-karten");
  for (let i = 0; i < Math.min(anzahl, 2); i++) {
    await page.locator(".nh-queue-btn").first().click();
    await page.waitForTimeout(400);
  }
  const strip = await page.locator(".nh-queue-item .nh-queue-name").allTextContents();
  const wartet = await page.locator(".nh-queue-waiting").allTextContents();
  console.log("BEFUND plan:", JSON.stringify(strip), "wartegrund:", JSON.stringify(wartet));
  await shot("03-newhaven-plan");

  // ── 04/05 Kampf ──────────────────────────────────────────────────────
  console.log("BEFUND nav-kampf:", await zuSeite(/^kampf|combat/i));
  await page.waitForTimeout(1400);
  const kampfLaeuft = await page.locator(".battle-queue-more-btn").count();
  console.log("BEFUND kampf-laeuft:", kampfLaeuft > 0);
  if (kampfLaeuft > 0) {
    await shot("04-kampf-nachlegen");
    await page.locator(".battle-queue-more-btn").first().click();
    await page.waitForTimeout(900);
    const balken = await page.locator(".combat-return-note").allTextContents();
    const liste = await page.locator(".combat-main-area").count();
    console.log("BEFUND rueckweg:", JSON.stringify(balken), "liste-da:", liste > 0);
    await shot("05-kampf-liste");
  } else {
    console.log("BEFUND: kein laufender Kampf im Fixture — Knopf nicht pruefbar");
    await shot("04-kampf-liste-ohne-kampf");
  }
} finally {
  await h.stop();
}
