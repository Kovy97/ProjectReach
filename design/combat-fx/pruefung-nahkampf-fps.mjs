// claude:2026-10-25T14:48:00+01:00 — Nahkampf 1.4.1: FPS-Prüfung der Bibliotheksseite (demo-nahkampf.html), Muster wie
// pruefung-effektbibliothek-fps.mjs: (1) Endlosschleife 10 s in Echtzeit, (2) Stress: alle sichtbaren Kacheln alle
// 150 ms (reihum Variante/Auslöser/Krit), (3) derselbe Stress bei „Effekte reduziert", (4) EINE Kampfbühne im Dauerfeuer
// (Krit + Auslöser alle 150 ms, ~6 Treffer/s, weit über jedem echten Angriffstempo). Läuft headless (Software-Rendering).
import { createRequire } from "node:module";
const require = createRequire("G:/GameDev/apps/client/package.json");
const { chromium } = require("@playwright/test");
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1700, height: 1000 } });
const errors = [];
page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") errors.push(`[console ${m.type()}] ${m.text()}`); });
page.on("pageerror", (e) => errors.push(`[pageerror] ${e.message}`));
await page.goto("file:///G:/GameDev/design/combat-fx/demo-nahkampf.html");
await page.waitForTimeout(600);
const avg = (a) => Math.round(a.reduce((x, y) => x + y, 0) / Math.max(1, a.length));

async function sample(ms, every, tick) {
  const fps = []; let maxP = 0, maxStages = 0;
  for (let t = 0; t < ms; t += every) {
    if (tick) await page.evaluate(tick);
    await page.waitForTimeout(every);
    const s = await page.evaluate(() => window.__fx.stats());
    if (s.fps) fps.push(s.fps);
    maxP = Math.max(maxP, s.particles); maxStages = Math.max(maxStages, s.stages);
  }
  return { min: Math.min(...fps), avg: avg(fps), maxP, maxStages };
}

// (1) Endlosschleife — so wie der Chef die Seite offen lässt
await page.evaluate(() => window.__fx.setLoop(true));
const loop = await sample(10000, 250);
await page.evaluate(() => window.__fx.setLoop(false));
console.log(`SCHLEIFE 10 s: fps min ${loop.min} / avg ${loop.avg} · max Partikel ${loop.maxP} · Stages ${loop.maxStages}`);
await page.waitForTimeout(1500);

// (2) Stress: alle sichtbaren Kacheln gleichzeitig, alle 150 ms (deutlich über jedem Kampf)
const stressTick = () => {
  const ids = window.__fx.tiles().map((t) => t.id);
  let n = 0;
  for (const id of ids) {
    const fig = document.querySelector(`.tile[data-id="${id}"]`);
    const r = fig.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) continue;
    fig.querySelector(".stage").click();
    if (++n >= 9) break;
  }
};
const stress = await sample(9000, 150, stressTick);
console.log(`STRESS 9 s (9 Kacheln je 150 ms): fps min ${stress.min} / avg ${stress.avg} · max Partikel gesamt ${stress.maxP} · Stages ${stress.maxStages}`);
await page.waitForTimeout(1500);

// (3) dasselbe bei „Effekte reduziert"
await page.evaluate(() => window.__fx.setReduced(true));
const red = await sample(9000, 150, stressTick);
console.log(`STRESS reduziert: fps min ${red.min} / avg ${red.avg} · max Partikel gesamt ${red.maxP}`);
await page.evaluate(() => window.__fx.setReduced(false));
await page.waitForTimeout(1500);

// (4) eine Bühne (wie im Kampf), Großschwert + Feuer, Krit + Auslöser alle 150 ms
for (const [id, label] of [["greatsword-fire", "Großschwert Feuer"], ["maul-frost", "Maul Frost"]]) {
  const one = await sample(6000, 150, new Function(`window.__fx.play(${JSON.stringify(id)}, "c", true)`));
  console.log(`DAUERFEUER 1 Bühne (${label}, Krit+Auslöser alle 150 ms): fps min ${one.min} / avg ${one.avg} · max Partikel ${one.maxP}`);
  await page.waitForTimeout(1200);
}
await browser.close();
console.log("ERRORS:", errors.length ? errors.join(String.fromCharCode(10)) : "keine");
