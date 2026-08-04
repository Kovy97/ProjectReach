#!/usr/bin/env node
/**
 * khn-final-b2-day.mjs — Supplement zu Lauf B: der Testlauf findet ABENDS statt (echte Uhrzeit
 * 21h → night ist bereits per echter Uhrzeit belegt). Der TAG-Zustand wird hier per
 * Zeit-Injektion (getHours=12) geprüft — Gegenrichtung derselben Mechanik, NICHT der Dev-Toggle.
 * Zusätzlich: interner Panel-Scroll des Seiten-Panels (Baumenü) + Liste.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { startHarness } from "./sim-harness.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "bot-runs", "khn-final-b2-day");
mkdirSync(OUT, { recursive: true });
const findings = [];
const log = (msg) => { console.log(msg); findings.push(msg); };

const main = async () => {
  const h = await startHarness({
    port: 5344, fixture: "nh_map_audit", locale: "en", requireDebugHook: true,
    outDir: OUT, viewport: { width: 1920, height: 1080 },
  });
  const { page } = h;
  const t0 = Date.now();
  try {
    await page.addInitScript(() => { Date.prototype.getHours = function () { return 12; }; });
    await page.reload();
    await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
    await h.waitForDebugHook(15000);
    await page.waitForTimeout(800);
    for (let i = 0; i < 3; i++) {
      const s = page.locator(".guide-bubble-skip").first();
      if ((await s.count()) === 0) break;
      await s.click().catch(() => {});
      await page.waitForTimeout(600);
    }
    await page.locator('[data-guide-id="sidebar.newhaven"]').first().click();
    await page.waitForSelector(".nh-map", { timeout: 10000 });
    await page.waitForTimeout(900);
    const phase = await page.evaluate(() => document.querySelector(".nh-map")?.getAttribute("data-light-phase"));
    const art = await page.evaluate(() => {
      const bg = document.querySelector(".nh-map-bg");
      const img = document.querySelector(".nh-map-tile-img");
      return { bgDay: (getComputedStyle(bg).backgroundImage || "").includes("day"), tileSrc: img?.getAttribute("src")?.slice(-40) ?? null };
    });
    log(`tag via zeit-injektion (getHours=12): phase=${phase} (soll day), assets=${JSON.stringify(art)}`);
    await h.shot("b2day-map-day");

    // Interner Panel-Scroll: Baumenü-Panel muss selbst scrollen, nicht die Seite
    const scroll = await page.evaluate(() => {
      const side = document.querySelector(".nh-map-side");
      const menu = document.querySelector(".nh-buildmenu, .nh-buildmenu-list");
      const pick = (el) => el && { cls: el.className.toString().slice(0, 40), oy: getComputedStyle(el).overflowY, sh: el.scrollHeight, ch: el.clientHeight, scrollable: el.scrollHeight > el.clientHeight + 4 };
      const page_ = document.querySelector(".newhaven-page");
      return { side: pick(side), menu: pick(menu), pageScrollsY: page_ ? page_.scrollHeight > page_.clientHeight + 8 : null, bodyScrollsY: document.documentElement.scrollHeight > document.documentElement.clientHeight + 8 };
    });
    log(`panel-scroll: ${JSON.stringify(scroll)}`);
    // wirklich scrollen
    const scrolled = await page.evaluate(() => {
      const cands = [document.querySelector(".nh-buildmenu-list"), document.querySelector(".nh-buildmenu"), document.querySelector(".nh-map-side")].filter(Boolean);
      for (const el of cands) {
        if (el.scrollHeight > el.clientHeight + 4) { el.scrollTop = 400; return { cls: el.className.toString().slice(0, 40), scrollTop: el.scrollTop }; }
      }
      return null;
    });
    log(`panel-scroll-probe: ${JSON.stringify(scrolled)}`);
    await h.shot("b2day-panel-scrolled");

    // Vertikaler Clip-Check der .nh-blocked-Zeile in der LISTE (ohne Debug-Gratis-Zusatzzeile):
    // nh_map_audit hat Kapazität voll → unbebaute Karten zeigen die no_slot-Reason.
    await page.locator('[role="tab"]').nth(1).click();
    await page.waitForSelector(".nh-grid", { timeout: 8000 });
    await page.waitForTimeout(500);
    const clip = await page.evaluate(() => {
      const out = [];
      for (const card of document.querySelectorAll(".nh-card")) {
        const blocked = card.querySelector(".nh-blocked");
        if (!blocked) continue;
        const cr = card.getBoundingClientRect();
        const br = blocked.getBoundingClientRect();
        const slot = card.querySelector(".nh-card-action-slot");
        const sr = slot?.getBoundingClientRect() ?? null;
        out.push({
          name: card.querySelector(".nh-card-name")?.textContent?.trim(),
          text: blocked.textContent?.trim().slice(0, 50),
          clippedByCard: br.bottom > cr.bottom + 1 ? +(br.bottom - cr.bottom).toFixed(1) : 0,
          clippedBySlot: sr && br.bottom > sr.bottom + 1 ? +(br.bottom - sr.bottom).toFixed(1) : 0,
          slotOverflowY: slot ? getComputedStyle(slot).overflowY : null,
          slotHidden: slot ? slot.scrollHeight > slot.clientHeight + 2 : null,
        });
      }
      return out;
    });
    log(`liste .nh-blocked clip-check (ohne debug): ${JSON.stringify(clip)}`);
    await h.shot("b2day-list-blocked");
    log(`kapazität: ${JSON.stringify(await page.locator(".nh-capacity").textContent().catch(() => null))}`);

    // Bank-Kapazitäts-Ausweis mit "Aus New Haven"-Note (Storehouse I im Fixture; TopBar-Nav!)
    await page.locator('[data-guide-id="topbar.bank"]').first().click();
    await page.waitForSelector(".bank-count", { timeout: 8000 });
    await page.waitForTimeout(500);
    await page.locator(".bank-count").first().hover();
    await page.waitForTimeout(700);
    const bankTip = await page.evaluate(() => {
      const note = document.querySelector(".ct-tip .camp-boost-note");
      if (!note) return { present: false, tip: document.querySelector(".ct-tip")?.textContent?.trim() ?? null };
      const img = note.querySelector("img.camp-boost-note-ico");
      return { present: true, text: note.textContent?.trim(), emblem: img ? img.complete && img.naturalWidth > 0 : false };
    });
    log(`bank-kapazität "Aus New Haven"-note: ${JSON.stringify(bankTip)}`);
    await h.shot("b2day-bank-note");
    log(`pageErrors: ${h.errors.length}`);
  } catch (err) {
    log(`ABBRUCH: ${err.message}`);
    await h.shot("b2day-crash").catch(() => {});
  } finally {
    writeFileSync(join(OUT, "findings.txt"), findings.join("\n"), "utf8");
    console.log(`\nDURATION: ${Math.round((Date.now() - t0) / 1000)}s`);
    await h.stop();
  }
};
main().catch((err) => { console.error("FATAL:", err); process.exit(1); });
