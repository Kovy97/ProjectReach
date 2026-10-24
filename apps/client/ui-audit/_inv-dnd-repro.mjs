// claude:2026-10-24T19:52:00+02:00 — Repro Spieler-Bugreport „Items lassen sich nicht ziehen, Drag&Drop wirft das
// Inventar durcheinander“ (Chef 24.10.). Baut ein Inventar wie bei einem echten Spieler (Lücken, Teile ganz hinten,
// reine Varianten ohne Grundstapel) und prüft: steht jede Zelle an ihrer echten Fachposition, landet ein Zug dort, wo
// man ihn ablegt? Aufruf (aus apps/client): node ui-audit/_inv-dnd-repro.mjs <out-ordner> [port]
import { mkdirSync, writeFileSync } from "node:fs";
import { startHarness } from "./sim-harness.mjs";

const [outDir = "ui-audit/bot-runs/inv-dnd", portArg = "5551"] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const h = await startHarness({ port: Number(portArg), fixture: "endgame", locale: "de", viewport: { width: 1920, height: 1080 } });
const { page } = h;
const log = [];
const snap = async (label) => {
  const r = await page.evaluate(() => {
    const st = window.__hfDebug.state;
    const slots = st.inventory.slots.map((s) => (s ? s.itemId : null));
    const cells = [...document.querySelectorAll(".cs-inv-grid > *")].map((el) => {
      const img = el.querySelector("img.item-cell-img");
      const src = img ? img.getAttribute("src") : null;
      return src ? src.split("/").pop().split(".")[0].replace(/-[A-Za-z0-9_]{6,}$/, "") : el.className.includes("inv-slot") ? "·leer" : "?";
    });
    return { slots, cells, instances: st.inventory.instances.map((i) => i.baseItemId) };
  });
  log.push({ label, ...r });
  await page.screenshot({ path: `${outDir}/${label}.png` });
  return r;
};
try {
  await page.waitForTimeout(1500);
  await page.keyboard.press("Escape");
  // Spieler-Layout: Fächer 0–9 belegt, 10–17 leer, 18/19 belegt (bewusst ans Ende gelegt) + 3 reine Varianten
  await page.evaluate(() => {
    const { state: st, content } = window.__hfDebug;
    const inv = st.inventory;
    for (let i = 10; i <= 17; i++) inv.slots[i] = null;
    const inSlots = new Set(inv.slots.filter(Boolean).map((s) => s.itemId));
    const gear = Object.values(content.items).filter((it) => it.type === "equipment" && !inSlots.has(it.id)).slice(0, 3);
    inv.instances = gear.map((g, k) => ({ instanceId: `repro-${k}`, baseItemId: g.id, affixes: [] }));
  });
  await page.locator('[data-guide-id="topbar.character"]').first().click();
  await page.waitForTimeout(1200);
  const a = await snap("1-ausgang");
  // Zug 1: Fach 0 auf eine Variantenzelle ziehen (vorher: kein Ablageziel, nichts passierte)
  const vz = a.cells.findIndex((c) => c.startsWith("gemstone_r"));
  const src = page.locator(".cs-inv-grid > *").nth(0).locator(".item-cell").first();
  await src.dragTo(page.locator(".cs-inv-grid > *").nth(vz));
  await page.waitForTimeout(600);
  await snap("2-nach-zug-auf-variantenzelle");
  // Zug 2: Fach 1 auf die erste leere Zelle
  const b = log.at(-1);
  const leerIdx = b.cells.indexOf("·leer");
  await page.locator(".cs-inv-grid > *").nth(1).locator(".item-cell").first().dragTo(page.locator(".cs-inv-grid > *").nth(leerIdx));
  await page.waitForTimeout(600);
  await snap("3-nach-zug-auf-erste-leere");
} finally {
  writeFileSync(`${outDir}/log.json`, JSON.stringify(log, null, 1));
  await h.stop();
}
