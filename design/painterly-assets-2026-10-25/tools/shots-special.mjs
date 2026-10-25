// claude:2026-10-25T12:37:00+01:00 — Painterly-Bestandsaufnahme Teil 2: Kampf (Zone, Monster, laufender Kampf), Raid,
// Dungeons, Optionen, Post, Aschesturz, Item-Karte, Dialog, Hauptmenü + Unterscreens. Port 5611, endgame, de.
// Aufruf (aus G:\GameDev): node design/painterly-assets-2026-10-25/tools/shots-special.mjs <width> <height>
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { startHarness } from "../../../apps/client/ui-audit/sim-harness.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const [w = "1920", hgt = "1080", port = "5611"] = process.argv.slice(2);
const outDir = join(here, "..", "shots", `${w}x${hgt}`);
mkdirSync(outDir, { recursive: true });
const vp = { width: Number(w), height: Number(hgt) };
const log = [];
const step = async (name, fn) => { try { await fn(); log.push({ name, ok: true }); } catch (e) { log.push({ name, err: String(e).slice(0, 240) }); } };

let h = await startHarness({ port: Number(port), fixture: "endgame", locale: "de", viewport: vp, outDir });
let { page } = h;
try {
  await page.waitForTimeout(1200);
  await page.keyboard.press("Escape");
  const nav = async (id) => { await page.locator(`[data-guide-id="${id}"]`).first().click({ timeout: 5000 }); await page.waitForTimeout(900); };
  await step("combat-zone", async () => {
    await nav("sidebar.combat");
    await page.locator('[data-bot-zone="pastures"]').first().click({ timeout: 5000 });
    await page.waitForTimeout(1000);
    await h.shot("s01-kampf-zone-weiden");
    await page.mouse.wheel(0, 900); await page.waitForTimeout(500);
    await h.shot("s02-kampf-zone-weiden-scroll");
  });
  await step("combat-fight", async () => {
    const b = page.locator("[data-bot-fight-now]").first();
    await b.scrollIntoViewIfNeeded(); await b.click({ timeout: 5000 });
    await page.waitForTimeout(3500);
    await h.shot("s03-kampf-laeuft");
    await page.waitForTimeout(2500);
    await h.shot("s04-kampf-laeuft-2");
  });
  await step("combat-grid-scroll", async () => {
    await nav("sidebar.combat");
    const back = page.locator(".zone-back").first();
    if (await back.count()) await back.click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(800);
    const scroller = page.locator(".zone-grid").last();
    await scroller.scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(500);
    await h.shot("s05-kampf-dungeons-raid");
    await page.evaluate(() => { const els = [...document.querySelectorAll("*")].filter((e) => e.scrollHeight > e.clientHeight + 50 && getComputedStyle(e).overflowY !== "visible"); els.forEach((e) => e.scrollTop = e.scrollHeight); });
    await page.waitForTimeout(600);
    await h.shot("s06-kampf-raid-unten");
  });
  await step("item-tooltip", async () => {
    await nav("topbar.character");
    const cell = page.locator(".cs-inv-grid .item-cell").first();
    await cell.hover(); await page.waitForTimeout(900);
    await h.shot("s07-itemkarte-inventar");
    const eq = page.locator(".item-cell").nth(3);
    await page.locator('[class*="equip"] .item-cell, [class*="paperdoll"] .item-cell').nth(4).hover().catch(async () => { await eq.hover(); });
    await page.waitForTimeout(900);
    await h.shot("s08-itemkarte-ausruestung");
  });
  await step("dialog-salvage", async () => {
    await page.mouse.move(5, 500);
    const btn = page.getByText("Beute zerlegen", { exact: false }).first();
    await btn.click({ timeout: 4000 }); await page.waitForTimeout(900);
    await h.shot("s09-dialog-beute-zerlegen");
    await page.keyboard.press("Escape"); await page.waitForTimeout(400);
  });
  await step("werte-tab", async () => {
    await page.getByText("Werte", { exact: true }).first().click({ timeout: 4000 }); await page.waitForTimeout(700);
    await h.shot("s10-charakter-werte");
  });
  await step("options", async () => {
    await page.locator(".sb-footer-drawer-tab").first().click({ timeout: 4000 }); await page.waitForTimeout(500);
    await h.shot("s11-sidebar-menue-offen");
    await page.locator('[data-guide-id="sidebar.options"]').first().click({ timeout: 4000 }); await page.waitForTimeout(900);
    await h.shot("s12-optionen");
  });
  await step("mail", async () => {
    await page.locator('[data-guide-id="sidebar.mail"]').first().click({ timeout: 4000 }); await page.waitForTimeout(900);
    await h.shot("s13-post");
  });
  await step("prestige", async () => {
    await h.setState((st) => { st.prestige = { ...(st.prestige || {}), count: Math.max(1, st.prestige?.count ?? 0) }; });
    await page.waitForTimeout(1200);
    const p = page.locator('[data-guide-id="sidebar.prestige"]').first();
    await p.scrollIntoViewIfNeeded(); await p.click({ timeout: 5000 }); await page.waitForTimeout(1200);
    await h.shot("s14-aschesturz");
  });
  await step("shop-dialog", async () => {
    await nav("topbar.shop");
    const buy = page.locator(".shop-citadel-btn, .btn-iron").filter({ hasText: /Kaufen|kaufen/ }).first();
    await buy.click({ timeout: 4000 }); await page.waitForTimeout(800);
    await h.shot("s15-laden-kauf-dialog");
    await page.keyboard.press("Escape");
  });
  log.push({ errors: h.errors.slice(0, 15) });
} finally { await h.stop(); }

// Hauptmenü + Unterscreens
h = await startHarness({ port: Number(port), fixture: null, locale: "de", viewport: vp, outDir, slotSaves: { 0: "endgame" } });
page = h.page;
try {
  await page.waitForTimeout(2500);
  await h.shot("m01-hauptmenue");
  await step("menu-load", async () => {
    await page.getByText(/Spiel laden|Laden/).first().click({ timeout: 4000 }); await page.waitForTimeout(1500);
    await h.shot("m02-laden");
    await page.keyboard.press("Escape"); await page.waitForTimeout(800);
    const back = page.getByText(/Zurück/).first(); if (await back.count()) await back.click().catch(() => {});
    await page.waitForTimeout(1200);
  });
  await step("menu-new", async () => {
    await page.getByText(/Neues Spiel/).first().click({ timeout: 4000 }); await page.waitForTimeout(1500);
    await h.shot("m03-neues-spiel");
    const slot = page.locator("[class*=slot]").filter({ hasText: /Leer|Neu|frei/i }).first();
    if (await slot.count()) { await slot.click().catch(() => {}); await page.waitForTimeout(1500); await h.shot("m04-charaktererstellung"); }
  });
  log.push({ menuErrors: h.errors.slice(0, 10) });
} finally {
  await h.stop();
  writeFileSync(join(outDir, "log-special.json"), JSON.stringify(log, null, 1));
}
