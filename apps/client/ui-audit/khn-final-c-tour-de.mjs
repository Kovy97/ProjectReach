#!/usr/bin/env node
/**
 * khn-final-c-tour-de.mjs — Finale NH-Generalprüfung (Kontrolleur, 2026-08-03), Lauf C:
 * Teil 1 (Prüfstrecke 10): b4_v72-Ladepfad → Feature-Tour v1 → (Skip) → v2 zeigt auf New Haven,
 * Klick auf den echten Sidebar-Eintrag navigiert hin und schließt die Tour.
 * Teil 2 (Prüfstrecke 11): komplette NH-Strecke auf DEUTSCH (nh_empty → Erstkontakt-Reasons,
 * nh_map_audit → Karte/Popup/Move/Abriss/Veredelung), Keyleak- + Overflow-Scan.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { startHarness } from "./sim-harness.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "bot-runs", "khn-final-c-tour-de");
mkdirSync(OUT, { recursive: true });

const findings = [];
const log = (msg) => { console.log(msg); findings.push(msg); };

const KEY_LEAK_RE = /(?:^|[\s>(])((?:newhaven|menu|creation|skill|nav|common|queue|offline|char|combat|bank|shop|onboarding)\.[a-z][a-zA-Z0-9]*(?:\.[a-zA-Z0-9]+)+)/g;
async function scanKeyLeaks(page, station) {
  const text = await page.evaluate(() => document.body.innerText);
  const hits = new Set();
  let m;
  while ((m = KEY_LEAK_RE.exec(text)) !== null) hits.add(m[1]);
  if (hits.size > 0) log(`KEYLEAK @${station}: ${[...hits].join(", ")}`);
  else log(`keyleak @${station}: sauber`);
}

/** Text-Überlauf-Scan innerhalb der NH-Seite (sichtbare Elemente, deren Inhalt abgeschnitten wird). */
async function scanOverflow(page, station) {
  const bad = await page.evaluate(() => {
    const out = [];
    const els = document.querySelectorAll(".newhaven-page *, .nh-popup *, .nh-confirm *");
    for (const el of els) {
      if (!(el instanceof HTMLElement)) continue;
      if (el.children.length > 0) continue; // nur Blatt-Textelemente
      const cs = getComputedStyle(el);
      if (cs.overflow === "hidden" && cs.textOverflow === "ellipsis") continue; // bewusstes Ellipsis
      if (el.scrollWidth > el.clientWidth + 4 && el.clientWidth > 0) {
        out.push({ cls: el.className?.toString().slice(0, 60), text: el.textContent?.trim().slice(0, 60), sw: el.scrollWidth, cw: el.clientWidth });
      }
    }
    return out.slice(0, 12);
  });
  if (bad.length) log(`OVERFLOW @${station}: ${JSON.stringify(bad)}`);
  else log(`overflow @${station}: sauber`);
}

async function st(h, fn) {
  return h.page.evaluate((src) => {
    const f = new Function("dbg", `return (${src})(dbg);`);
    return f(window.__hfDebug);
  }, fn.toString());
}

const main = async () => {
  const t0 = Date.now();

  // ═══ Teil 1: Tour-Verkettung v1 → v2 (b4_v72, EN) ══════════════════════════
  const h = await startHarness({
    port: 5355, fixture: "b4_v72", locale: "en", requireDebugHook: true,
    outDir: OUT, viewport: { width: 1920, height: 1080 },
  });
  const { page } = h;
  try {
    await page.waitForTimeout(1200);
    const tour1 = await page.evaluate(() => {
      const bubble = document.querySelector(".guide-bubble");
      return bubble ? { title: bubble.querySelector(".guide-bubble-title, h3, h2")?.textContent?.trim() ?? bubble.textContent?.trim().slice(0, 120) } : null;
    });
    log(`C1 v1-tour nach v72-load sichtbar: ${JSON.stringify(tour1)}`);
    await h.shot("c1-tour-v1");
    // v1 überspringen
    const skip = page.locator(".guide-bubble-skip").first();
    if ((await skip.count()) > 0) { await skip.click(); await page.waitForTimeout(900); }
    const seen1 = await st(h, (dbg) => dbg.state.onboarding.toursSeen);
    log(`C1 toursSeen nach v1-skip: ${JSON.stringify(seen1)}`);
    // v2 muss jetzt anstehen und auf sidebar.newhaven zeigen
    await page.waitForTimeout(800);
    const tour2 = await page.evaluate(() => {
      const bubble = document.querySelector(".guide-bubble");
      if (!bubble) return null;
      const target = document.querySelector('[data-guide-id="sidebar.newhaven"]');
      const ring = document.querySelector(".guide-spotlight, .guide-ring, [class*='spotlight']");
      const tr = target?.getBoundingClientRect() ?? null;
      const rr = ring?.getBoundingClientRect() ?? null;
      const near = tr && rr ? Math.abs(tr.x - rr.x) < 80 && Math.abs(tr.y - rr.y) < 80 : null;
      return { text: bubble.textContent?.trim().slice(0, 200), ringNearNewhaven: near };
    });
    log(`C1 v2-tour: ${JSON.stringify(tour2)}`);
    await h.shot("c1-tour-v2");
    // Klick auf den ECHTEN Sidebar-Eintrag → navigiert + schließt
    await page.locator('[data-guide-id="sidebar.newhaven"]').first().click();
    await page.waitForTimeout(900);
    const afterClick = await page.evaluate(() => ({
      onNH: !!document.querySelector(".newhaven-page"),
      bubbleGone: !document.querySelector(".guide-bubble"),
    }));
    const seen2 = await st(h, (dbg) => dbg.state.onboarding.toursSeen);
    log(`C1 nach klick: ${JSON.stringify(afterClick)} toursSeen=${JSON.stringify(seen2)}`);
    await h.shot("c1-after-tour-click");
    log(`C1 pageErrors: ${h.errors.length}${h.errors.length ? " :: " + h.errors.slice(0, 5).join(" | ") : ""}`);
  } catch (err) {
    log(`ABBRUCH C1: ${err.message}`);
    await h.shot("c1-crash").catch(() => {});
  } finally {
    await h.stop();
  }

  // ═══ Teil 2a: DE-Erstkontakt (nh_empty) ════════════════════════════════════
  const h2 = await startHarness({
    port: 5356, fixture: "nh_empty", locale: "de", requireDebugHook: true,
    outDir: OUT, viewport: { width: 1920, height: 1080 },
  });
  const page2 = h2.page;
  try {
    await page2.waitForTimeout(1000);
    // v2-Tour skippen (nh_empty kennt featureTourV2 nicht)
    for (let i = 0; i < 3; i++) {
      const s = page2.locator(".guide-bubble-skip").first();
      if ((await s.count()) === 0) break;
      await s.click().catch(() => {});
      await page2.waitForTimeout(600);
    }
    await page2.locator('[data-guide-id="sidebar.newhaven"]').first().click();
    await page2.waitForSelector(".nh-map", { timeout: 10000 });
    await page2.waitForTimeout(800);
    await h2.shot("c2-de-empty-map");
    await scanKeyLeaks(page2, "de-empty-map");
    await scanOverflow(page2, "de-empty-map");
    log(`C2 DE leer-hinweis: ${JSON.stringify(await page2.locator(".nh-map-empty-hint").textContent().catch(() => null))}`);
    log(`C2 DE kapazität: ${JSON.stringify(await page2.locator(".nh-capacity").textContent().catch(() => null))}`);
    const bmenuDe = await page2.evaluate(() => [...document.querySelectorAll(".nh-buildmenu-item")].slice(0, 4).map((el) => ({
      name: el.querySelector(".nh-buildmenu-name")?.textContent?.trim(),
      reason: el.querySelector(".nh-buildmenu-reason")?.textContent?.trim() ?? null,
    })));
    log(`C2 DE buildmenu (townhall_first-reason): ${JSON.stringify(bmenuDe)}`);
    // Liste: Zentralhaus-Karte + Chip-Tooltip DE
    await page2.locator('[role="tab"]').nth(1).click();
    await page2.waitForSelector(".nh-grid", { timeout: 8000 });
    await page2.waitForTimeout(500);
    await h2.shot("c2-de-list");
    await scanKeyLeaks(page2, "de-list");
    await scanOverflow(page2, "de-list");
    const chip = page2.locator(".nh-card").first().locator(".nh-mats .mat-chip").first();
    if ((await chip.count()) > 0) {
      await chip.hover();
      await page2.waitForTimeout(700);
      const tip = await page2.evaluate(() => {
        const tipEl = document.querySelector(".ct-tip");
        return tipEl ? { title: tipEl.querySelector(".ct-tip-title")?.textContent?.trim(), desc: tipEl.querySelector(".ct-tip-desc")?.textContent?.trim() } : null;
      });
      log(`C2 DE chip-tooltip: ${JSON.stringify(tip)}`);
      await h2.shot("c2-de-chip-tooltip");
    }
    log(`C2 pageErrors: ${h2.errors.length}`);
  } catch (err) {
    log(`ABBRUCH C2: ${err.message}`);
    await h2.shot("c2-crash").catch(() => {});
  } finally {
    await h2.stop();
  }

  // ═══ Teil 2b: DE-Vollstrecke (nh_map_audit) ════════════════════════════════
  const h3 = await startHarness({
    port: 5358, // 5357 laut BOT-GUIDE unter Windows oft blockiert
    fixture: "nh_map_audit", locale: "de", requireDebugHook: true,
    outDir: OUT, viewport: { width: 1920, height: 1080 },
  });
  const page3 = h3.page;
  try {
    await page3.waitForTimeout(1000);
    for (let i = 0; i < 3; i++) {
      const s = page3.locator(".guide-bubble-skip").first();
      if ((await s.count()) === 0) break;
      await s.click().catch(() => {});
      await page3.waitForTimeout(600);
    }
    await page3.locator('[data-guide-id="sidebar.newhaven"]').first().click();
    await page3.waitForSelector(".nh-map", { timeout: 10000 });
    await page3.waitForTimeout(800);
    await h3.shot("c3-de-map");
    await scanKeyLeaks(page3, "de-map");
    await scanOverflow(page3, "de-map");
    // Bautrupp-beschäftigt-Reason im Baumenü (Job läuft: fence_tent II)
    const busyDe = await page3.evaluate(() => [...document.querySelectorAll(".nh-buildmenu-item")].slice(0, 3).map((el) => ({
      name: el.querySelector(".nh-buildmenu-name")?.textContent?.trim(),
      reason: el.querySelector(".nh-buildmenu-reason")?.textContent?.trim() ?? null,
    })));
    log(`C3 DE buildmenu bei laufendem bau: ${JSON.stringify(busyDe)}`);
    // Popup + Veredelung DE
    const smIdx = await page3.evaluate(() => {
      const tiles = [...document.querySelectorAll(".nh-map-tile")];
      return tiles.findIndex((t) => (t.getAttribute("title") || "").toLowerCase().includes("schmelz"));
    });
    log(`C3 DE schmelzofen-kachel-index: ${smIdx}`);
    await page3.locator(".nh-map-tile").nth(Math.max(0, smIdx)).click();
    await page3.waitForSelector(".nh-popup", { timeout: 6000 });
    await page3.waitForTimeout(500);
    await h3.shot("c3-de-popup-smelter");
    await scanKeyLeaks(page3, "de-popup");
    await scanOverflow(page3, "de-popup");
    const refineDe = await page3.evaluate(() => ({
      title: document.querySelector(".nh-refine-title")?.textContent?.trim(),
      rate: document.querySelector(".nh-refine-rate")?.textContent?.trim() ?? null,
      name: document.querySelector(".nh-refine-name")?.textContent?.trim() ?? null,
      produced: document.querySelector(".nh-refine-produced")?.textContent?.trim() ?? null,
      stalled: document.querySelector(".nh-refine-stalled")?.textContent?.trim() ?? null,
      buttons: [...document.querySelectorAll(".nh-refine-btn")].map((b) => b.textContent?.trim()),
    }));
    log(`C3 DE veredelung: ${JSON.stringify(refineDe)}`);
    // Abriss-Dialog DE (nur Vorschau, dann abbrechen)
    const demolishBtn = page3.locator(".nh-demolish-btn");
    if ((await demolishBtn.count()) > 0) {
      await demolishBtn.click();
      await page3.waitForSelector(".nh-confirm", { timeout: 6000 });
      await page3.waitForTimeout(400);
      await h3.shot("c3-de-demolish-confirm");
      await scanKeyLeaks(page3, "de-demolish");
      await scanOverflow(page3, "de-demolish");
      log(`C3 DE abriss-dialog: ${JSON.stringify(await page3.evaluate(() => ({
        title: document.querySelector(".nh-confirm-title")?.textContent?.trim(),
        body: document.querySelector(".nh-confirm-body")?.textContent?.trim(),
        refundTitle: document.querySelector(".nh-demolish-refund-title")?.textContent?.trim(),
      })))}`);
      await page3.locator(".nh-confirm .combat-btn.ghost").click(); // Nein
      await page3.waitForTimeout(300);
    } else {
      log("C3 DE abriss-button im popup nicht gefunden (kachel evtl. im bau?)");
    }
    await page3.locator(".nh-popup-close").click().catch(() => {});
    await page3.waitForTimeout(300);
    // Move-Modus DE (Banner, Tools)
    await page3.locator(".nh-move-toggle").click();
    await page3.waitForTimeout(400);
    await page3.locator(".nh-map-tile").first().click();
    await page3.waitForTimeout(400);
    await h3.shot("c3-de-move-tools");
    await scanKeyLeaks(page3, "de-move");
    await scanOverflow(page3, "de-move");
    log(`C3 DE move-banner: ${JSON.stringify(await page3.evaluate(() => document.querySelector(".nh-move-banner")?.textContent?.trim() ?? null))}`);
    log(`C3 DE objekt-tools: ${JSON.stringify(await page3.evaluate(() => document.querySelector(".nh-map-object-tools")?.textContent?.trim() ?? null))}`);
    log(`C3 pageErrors: ${h3.errors.length}${h3.errors.length ? " :: " + h3.errors.slice(0, 5).join(" | ") : ""}`);
  } catch (err) {
    log(`ABBRUCH C3: ${err.message}`);
    await h3.shot("c3-crash").catch(() => {});
  } finally {
    writeFileSync(join(OUT, "findings.txt"), findings.join("\n"), "utf8");
    console.log(`\nDURATION: ${Math.round((Date.now() - t0) / 1000)}s`);
    console.log(`FINDINGS: ${join(OUT, "findings.txt")}`);
    await h3.stop();
  }
};

main().catch((err) => { console.error("FATAL:", err); process.exit(1); });
