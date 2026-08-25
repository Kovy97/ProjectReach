/**
 * Beleg fuer die Folgesorte je Beet (Chef-GO 25.08.2026 (1.1.0),
 * design/rezension-patch-2026-08-25.html #p12): Beet mit Plan und Saat (Chip + „Jetzt wechseln"),
 * Beet mit Plan ohne Saat (Warnung), LEERES Beet mit wartendem Plan (#12.2), Picker im Modus
 * „Folgesorte" fuer ein Beet und fuer alle Beete (#12.4). Dazu die Kontrollmessung, dass kein Chip
 * und keine Karte horizontal ueberlaeuft — auch bei 1366×768.
 *
 * Port 5401 (logic-dev). Farming-XP ~Lv 90, NICHT 99 (die Meisterweihe-Zeremonie faengt Klicks ab).
 */
import { startHarness } from "./sim-harness.mjs";

const h = await startHarness({ port: 5401, fixture: "midgame", locale: "de" });
const { page } = h;
// Toasts (Erfolge/Stufenaufstieg/Farm-Hinweis) ausblenden, sie legen sich sonst ueber Beet 3 und
// die Infozeile — reine Bildhygiene, kein Spielzustand.
const shot = async (name) => {
  await page.evaluate(() => document.querySelectorAll(".toast-stack").forEach((e) => (e.style.display = "none")));
  await page.screenshot({ path: `ui-audit/shots-farm/${name}.png` });
};

async function messen(label) {
  const m = await page.evaluate(() => {
    const over = [];
    for (const sel of [".plot-card", ".plot-next-chip", ".plot-next-warn", ".farm-info-bar", ".farm-info-actions"]) {
      document.querySelectorAll(sel).forEach((el, i) => {
        if (el.scrollWidth > el.clientWidth + 1) over.push(`${sel}[${i}] ${el.scrollWidth}>${el.clientWidth}`);
      });
    }
    const chips = [...document.querySelectorAll(".plot-next-chip")].map((c) => ({
      text: c.textContent?.trim(),
      missing: c.classList.contains("missing"),
      w: Math.round(c.getBoundingClientRect().width),
      h: Math.round(c.getBoundingClientRect().height),
    }));
    const warn = [...document.querySelectorAll(".plot-next-warn")].map((w) => w.textContent?.trim());
    const btns = [...document.querySelectorAll(".plot-next-btn")].length;
    const sw = [...document.querySelectorAll(".plot-next-switch")].length;
    return { over, chips, warn, btns, sw, vw: window.innerWidth };
  });
  console.log(`BEFUND ${label}:`, JSON.stringify(m));
  return m;
}

try {
  await page.waitForTimeout(1400);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  await page.keyboard.press("Escape");
  const nav = page.locator('.sidebar-btn, [data-guide-id^="sidebar."]');
  const n = await nav.count();
  for (let i = 0; i < n; i++) {
    const txt = ((await nav.nth(i).textContent()) ?? "").trim();
    if (/anbau|farm/i.test(txt)) { await nav.nth(i).click(); break; }
  }
  await page.waitForTimeout(1300);

  await page.evaluate(() => {
    const s = window.__hfDebug.state;
    s.skills.farming = { xp: 8_000_000 }; // ~Lv 90: alle 9 Beete, keine Zeremonie
    s.bank.grimwheat_seed = 5; // Saat der Folgesorte von Beet 1 vorhanden
    delete s.bank.gravetato_seed; // Saat der Folgesorte von Beet 2/3 fehlt
    const now = s.elapsedMs;
    const beet = (cropId, nextCropId, planted) => ({
      cropId, plantedAtMs: planted, autoReplant: true, readyYield: 0, readyItem: null, nextCropId,
    });
    s.farmPlots[0] = beet("ashroot", "grimwheat", now - 120_000); // Plan + Saat da → Chip gruen, „Jetzt wechseln"
    s.farmPlots[1] = beet("graywort", "gravetato", now - 300_000); // Plan, Saat fehlt → Warnung
    s.farmPlots[2] = beet(null, "gravetato", 0); // LEER mit wartendem Plan (#12.2)
    s.farmPlots[3] = beet("graywort", null, now - 60_000); // ohne Plan → „Danach saeen …"
  });
  await page.waitForTimeout(900);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  await shot("folgesorte-01-beete");
  await messen("1920 Beete");

  // Picker „Danach saeen" auf Beet 4 (Index 3).
  await page.locator(".plot-next-btn").first().click();
  await page.waitForTimeout(800);
  const picker = await page.evaluate(() => {
    const mod = document.querySelector(".farm-picker-modal");
    const r = mod?.getBoundingClientRect();
    return {
      modal: r ? `${Math.round(r.width)}x${Math.round(r.height)}` : null,
      title: document.querySelector(".farm-picker-title")?.textContent,
      lead: document.querySelector(".farm-picker-lead")?.textContent,
      current: [...document.querySelectorAll(".farm-picker-current")].map((c) => c.textContent),
      disabled: [...document.querySelectorAll(".farm-picker-card:disabled")].length,
      cards: [...document.querySelectorAll(".farm-picker-card")].length,
    };
  });
  console.log("BEFUND picker einzeln:", JSON.stringify(picker));
  await shot("folgesorte-02-picker");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  if (await page.locator(".farm-picker-modal").count()) {
    await page.locator(".farm-picker-modal .modal-close").first().click();
    await page.waitForTimeout(300);
  }

  // Picker „Fuer alle Beete danach saeen".
  await page.locator(".farm-next-all-btn").first().click();
  await page.waitForTimeout(800);
  const alle = await page.evaluate(() => ({
    title: document.querySelector(".farm-picker-title")?.textContent,
    lead: document.querySelector(".farm-picker-lead")?.textContent,
    plaene: [...document.querySelectorAll(".farm-picker-plan")].map((p) => `${p.textContent}${p.classList.contains("short") ? " [short]" : ""}`),
  }));
  console.log("BEFUND picker alle:", JSON.stringify(alle));
  await shot("folgesorte-03-alle");
  // Grimmkorn fuer alle planen → Beet 0 hat es schon, Beet 1 und 3 bekommen es, Beet 2 (leer) nicht.
  await page.locator(".farm-picker-card").filter({ hasText: /Grimmkorn/ }).first().click();
  await page.waitForTimeout(800);
  const nach = await page.evaluate(() => window.__hfDebug.state.farmPlots.slice(0, 4).map((p) => `${p.cropId}→${p.nextCropId}`));
  console.log("BEFUND nach alle:", JSON.stringify(nach));

  // Kleine Aufloesung: nichts darf abgeschnitten sein.
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.waitForTimeout(700);
  await shot("folgesorte-04-1366-oben");
  // Die Chip-Zeilen liegen bei 768 px Hoehe unterhalb der Falz → Beet 1 ganz ins Bild holen.
  await page.locator(".plot-card").first().locator(".plot-next-row").first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await shot("folgesorte-04-1366");
  await messen("1366 Beete");

  if (h.errors.length) console.log("PAGE ERRORS:\n" + h.errors.join("\n"));
  else console.log("PAGE ERRORS: keine");
} finally {
  await h.stop();
}
