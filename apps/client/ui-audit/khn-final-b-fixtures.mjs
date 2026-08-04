#!/usr/bin/env node
/**
 * khn-final-b-fixtures.mjs — Finale NH-Generalprüfung (Kontrolleur, 2026-08-03), Lauf B:
 * Fixture-Strecken (Prüfstrecke 9 + Teile 4/8): nh_map_audit (Mid-Build/Scaffold, Labels,
 * Projektion, Move-Tools) und mkt_camp (15 Gebäude, Bank-Note, Popup-Deckung). Nacht wird über
 * Date.prototype.getHours-Override + Reload geprüft (NICHT über den Dev-Toggle).
 *
 * Aufruf: node ui-audit/khn-final-b-fixtures.mjs [breite höhe [port]]  (Default 1920 1080 5352)
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { startHarness } from "./sim-harness.mjs";

const W = Number(process.argv[2] ?? 1920);
const H = Number(process.argv[3] ?? 1080);
const PORT = Number(process.argv[4] ?? 5352);

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "bot-runs", `khn-final-b-${W}x${H}`);
mkdirSync(OUT, { recursive: true });

const findings = [];
const log = (msg) => { console.log(msg); findings.push(msg); };
const RATIO = 1672 / 941;

async function st(h, fn) {
  return h.page.evaluate((src) => {
    const f = new Function("dbg", `return (${src})(dbg);`);
    return f(window.__hfDebug);
  }, fn.toString());
}

/** Feature-Tour-/Guide-Bubbles wegklicken (Fixtures ohne featureTourV2-Marker zeigen die v2-Tour). */
async function skipGuides(page) {
  for (let i = 0; i < 4; i++) {
    const skip = page.locator(".guide-bubble-skip").first();
    if ((await skip.count()) === 0) break;
    await skip.click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(600);
  }
}

async function measureMap(page, tag) {
  const m = await page.evaluate(() => {
    const el = document.querySelector(".nh-map");
    if (!el) return null;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const bl = parseFloat(cs.borderLeftWidth), br = parseFloat(cs.borderRightWidth);
    const bt = parseFloat(cs.borderTopWidth), bb = parseFloat(cs.borderBottomWidth);
    const cw = r.width - bl - br, ch = r.height - bt - bb;
    const stage = document.querySelector(".nh-map-stage")?.getBoundingClientRect() ?? null;
    return {
      rect: { w: r.width, h: r.height }, content: { w: cw, h: ch }, ratio: cw / ch,
      boxSizing: cs.boxSizing, border: [bt, br, bb, bl],
      stage: stage ? { w: stage.w ?? stage.width, h: stage.height } : null,
      overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });
  if (!m) { log(`PROJEKTION @${tag}: .nh-map NICHT GEFUNDEN`); return; }
  const dev = Math.abs(m.ratio - RATIO);
  log(`PROJEKTION @${tag}: content ${m.content.w.toFixed(1)}×${m.content.h.toFixed(1)} ratio=${m.ratio.toFixed(5)} soll=${RATIO.toFixed(5)} |Δ|=${dev.toFixed(5)} ${dev < 0.004 ? "OK" : "ABWEICHUNG!"} boxSizing=${m.boxSizing} border=${JSON.stringify(m.border)} hscroll=${m.overflowX}`);
}

const main = async () => {
  const h = await startHarness({
    port: PORT, fixture: "nh_map_audit", locale: "en", requireDebugHook: true,
    outDir: OUT, viewport: { width: W, height: H },
  });
  const { page } = h;
  const t0 = Date.now();

  try {
    await page.waitForSelector(".newhaven-page, [data-guide-id='sidebar.newhaven']", { timeout: 15000 });
    await page.waitForTimeout(800);
    await skipGuides(page);
    await page.locator('[data-guide-id="sidebar.newhaven"]').first().click();
    await page.waitForSelector(".nh-map", { timeout: 10000 });
    await page.waitForTimeout(900);

    // ═══ Strecke 9: Projektion + Tagbild ═════════════════════════════════════
    await measureMap(page, `nh_map_audit ${W}x${H} day`);
    await h.shot("b1-map-day");
    const phase = await page.evaluate(() => document.querySelector(".nh-map")?.getAttribute("data-light-phase"));
    log(`lichtphase (echte uhrzeit ${new Date().getHours()}h): ${phase}`);

    // Scaffold/Fortschritt am laufenden Ausbau (fence_tent → II)
    const scaffold = await page.evaluate(() => {
      const t = document.querySelector(".nh-map-tile.is-scaffold, .nh-map-tile.is-building");
      if (!t) return null;
      return {
        cls: t.className,
        hasScaffoldImg: !!t.querySelector(".nh-map-tile-scaffold-img, .nh-map-tile-scaffold-placeholder"),
        hasProgress: !!t.querySelector(".nh-map-tile-progress"),
        title: t.getAttribute("title"),
      };
    });
    log(`scaffold-kachel (fence_tent II läuft): ${JSON.stringify(scaffold)}`);

    // Labels default aus (auch bei stehendem Bau)
    const labelOps = await page.evaluate(() => [...document.querySelectorAll(".nh-map-tile-label")].map((l) => getComputedStyle(l).opacity));
    log(`labels default (soll alle 0): ${JSON.stringify(labelOps)}`);

    // mapVisuals aus Save wirksam? (watchtower 250% flipped)
    const wtScale = await page.evaluate(() => {
      const tiles = [...document.querySelectorAll(".nh-map-tile")];
      const wt = tiles.find((t) => (t.getAttribute("title") || "").includes("Watchtower"));
      if (!wt) return null;
      const cs = getComputedStyle(wt);
      return { scaleVar: cs.getPropertyValue("--nh-map-sprite-scale").trim(), flipVar: cs.getPropertyValue("--nh-map-sprite-flip").trim() };
    });
    log(`watchtower visual aus fixture (250%/flip → var): ${JSON.stringify(wtScale)}`);

    // Veredelung tickt pro Tick (fixture: smelter II, smelt_iron, accMs 60000)
    const inv = await st(h, (dbg) => ({ ore: dbg.state.inventory.slots.filter((s) => s && s.itemId === "iron_ore").reduce((a, s) => a + s.qty, 0) }));
    const a1 = await st(h, (dbg) => dbg.state.camp.refine?.camp_smelter?.accMs ?? -1);
    await page.waitForTimeout(4000);
    const a2 = await st(h, (dbg) => dbg.state.camp.refine?.camp_smelter?.accMs ?? -1);
    log(`refine-tick @fixture: accMs ${a1}→${a2} (delta=${a2 - a1}ms/4000ms, ore=${inv.ore}; 0 wäre Zutatenmangel → dann ok wenn ore=0)`);

    // Popup öffnen: Deckung über Kacheln
    await page.locator(".nh-map-tile").first().click();
    await page.waitForSelector(".nh-popup", { timeout: 6000 });
    await page.waitForTimeout(500);
    const popupBg = await page.evaluate(() => {
      const p = document.querySelector(".nh-popup");
      const o = document.querySelector(".modal-overlay");
      const csP = getComputedStyle(p), csO = getComputedStyle(o);
      return { popupBgColor: csP.backgroundColor, popupBgImage: csP.backgroundImage !== "none", overlayBg: csO.backgroundColor, overlayBackdrop: csO.backdropFilter };
    });
    log(`popup-deckung: ${JSON.stringify(popupBg)}`);
    await h.shot("b1-popup-over-map");
    await page.locator(".nh-popup-close").click();
    await page.waitForTimeout(300);

    // ═══ Nacht via Date-Override + Reload (NICHT Dev-Toggle) ═════════════════
    await page.addInitScript(() => { Date.prototype.getHours = function () { return 23; }; });
    await page.reload();
    await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
    await h.waitForDebugHook(15000);
    await skipGuides(page);
    await page.locator('[data-guide-id="sidebar.newhaven"]').first().click();
    await page.waitForSelector(".nh-map", { timeout: 10000 });
    await page.waitForTimeout(900);
    const nightPhase = await page.evaluate(() => document.querySelector(".nh-map")?.getAttribute("data-light-phase"));
    log(`nacht via zeit-injektion (getHours=23): data-light-phase=${nightPhase} (soll night)`);
    const nightArt = await page.evaluate(() => {
      const bg = document.querySelector(".nh-map-bg");
      const img = document.querySelector(".nh-map-tile-img");
      return { bgNight: (getComputedStyle(bg).backgroundImage || "").includes("night"), tileSrcNight: img?.getAttribute("src")?.includes("night") ?? null };
    });
    log(`nacht-assets: ${JSON.stringify(nightArt)}`);
    await h.shot("b1-map-night");
    await measureMap(page, `nh_map_audit ${W}x${H} night`);

    log(`pageErrors (teil 1): ${h.errors.length}`);
    if (h.errors.length) log("PAGEERRORS:\n" + h.errors.slice(0, 10).join("\n---\n"));
  } catch (err) {
    log(`ABBRUCH teil 1: ${err.message}`);
    await h.shot("b1-crash").catch(() => {});
  } finally {
    await h.stop();
  }

  // ═══ Teil 2: mkt_camp — 15 Gebäude, Bank-Note, Popup über dichter Karte ════
  const h2 = await startHarness({
    port: PORT + 1, fixture: "mkt_camp", locale: "en", requireDebugHook: true,
    outDir: OUT, viewport: { width: W, height: H },
  });
  const page2 = h2.page;
  try {
    await page2.waitForTimeout(800);
    await skipGuides(page2);
    await page2.locator('[data-guide-id="sidebar.newhaven"]').first().click();
    await page2.waitForSelector(".nh-map", { timeout: 10000 });
    await page2.waitForTimeout(900);
    const tileCount = await page2.locator(".nh-map-tile").count();
    log(`mkt_camp: ${tileCount} kacheln (soll 15)`);
    await h2.shot("b2-full-camp");
    await measureMap(page2, `mkt_camp ${W}x${H}`);

    // Popup über dicht bebauter Karte
    const popTiles = await page2.evaluate(() => {
      const tiles = [...document.querySelectorAll(".nh-map-tile")];
      const th = tiles.find((t) => (t.getAttribute("title") || "").includes("Town Hall"));
      return th ? tiles.indexOf(th) : 0;
    });
    await page2.locator(".nh-map-tile").nth(popTiles).click();
    await page2.waitForSelector(".nh-popup", { timeout: 6000 });
    await page2.waitForTimeout(500);
    await h2.shot("b2-popup-dense-map");
    await page2.locator(".nh-popup-close").click();
    await page2.waitForTimeout(300);

    // Bank: Kapazitäts-Ausweis mit "Aus New Haven"-Note (storehouse III)
    await page2.locator('[data-guide-id="sidebar.bank"]').first().click();
    await page2.waitForSelector(".bank-count", { timeout: 8000 });
    await page2.waitForTimeout(500);
    await page2.locator(".bank-count").first().hover();
    await page2.waitForTimeout(700);
    const bankTip = await page2.evaluate(() => {
      const note = document.querySelector(".ct-tip .camp-boost-note");
      if (!note) return { present: false, tip: document.querySelector(".ct-tip")?.textContent?.trim() ?? null };
      const img = note.querySelector("img.camp-boost-note-ico");
      return { present: true, text: note.textContent?.trim(), emblem: img ? img.complete && img.naturalWidth > 0 : false };
    });
    log(`bank-kapazität "Aus New Haven"-note: ${JSON.stringify(bankTip)}`);
    await h2.shot("b2-bank-note");

    log(`pageErrors (teil 2): ${h2.errors.length}`);
    if (h2.errors.length) log("PAGEERRORS2:\n" + h2.errors.slice(0, 10).join("\n---\n"));
  } catch (err) {
    log(`ABBRUCH teil 2: ${err.message}`);
    await h2.shot("b2-crash").catch(() => {});
  } finally {
    writeFileSync(join(OUT, "findings.txt"), findings.join("\n"), "utf8");
    console.log(`\nDURATION: ${Math.round((Date.now() - t0) / 1000)}s`);
    console.log(`FINDINGS: ${join(OUT, "findings.txt")}`);
    await h2.stop();
  }
};

main().catch((err) => { console.error("FATAL:", err); process.exit(1); });
