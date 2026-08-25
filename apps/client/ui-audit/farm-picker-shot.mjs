/**
 * Beleg fuer die ueberholte Samen-Auswahl (Chef 25.08.2026: "zu schmal, macht die Anzeige kaputt"
 * + "Plant on all Plots" mit Vorrechnung).
 *
 * Zwei Faelle: (1) viel Saat, mehr als Beete — die Karte sagt "9 von 9"; (2) wenig Saat — die
 * Karte sagt warnend "2 von 9". Dazu die Kontrollmessung, dass das Modal wirklich breit ist.
 */
import { startHarness } from "./sim-harness.mjs";

const h = await startHarness({ port: 5390, fixture: "midgame", locale: "de" });
const { page } = h;
const shot = (name) => page.screenshot({ path: `ui-audit/shots-farm/${name}.png` });

try {
  await page.waitForTimeout(1400);
  await page.keyboard.press("Escape");
  const nav = page.locator('.sidebar-btn, [data-guide-id^="sidebar."]');
  const n = await nav.count();
  for (let i = 0; i < n; i++) {
    const txt = ((await nav.nth(i).textContent()) ?? "").trim();
    if (/anbau|farm/i.test(txt)) { await nav.nth(i).click(); break; }
  }
  await page.waitForTimeout(1300);
  // Level ~90 (alle 9 Beete ab 85), NICHT 99: das wuerde die Meisterweihe-Zeremonie ausloesen,
  // die den Klick abfaengt. Saat gemischt: viel Grimmkorn, wenig Aschwurz.
  await page.evaluate(() => {
    const s = window.__hfDebug.state;
    s.skills.farming = { xp: 8_000_000 };
    s.bank.grimwheat_seed = 40;
    s.bank.ashroot_seed = 2;
  });
  await page.waitForTimeout(800);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  await shot("01-farm-seite");

  await page.locator("button").filter({ hasText: /alle bepflanzen/i }).first().click();
  await page.waitForTimeout(900);
  const mess = await page.evaluate(() => {
    const mod = document.querySelector(".farm-picker-modal");
    const r = mod.getBoundingClientRect();
    const lead = document.querySelector(".farm-picker-lead")?.textContent;
    const plaene = [...document.querySelectorAll(".farm-picker-plan")].map((p) => p.textContent);
    const spalten = getComputedStyle(document.querySelector(".farm-picker-list")).gridTemplateColumns.split(" ").length;
    return { modal: `${Math.round(r.width)}x${Math.round(r.height)}`, scroll: mod.scrollWidth <= mod.clientWidth, lead, plaene, spalten };
  });
  console.log("BEFUND modal:", JSON.stringify(mess));
  await shot("02-samen-modal");
} finally {
  await h.stop();
}
