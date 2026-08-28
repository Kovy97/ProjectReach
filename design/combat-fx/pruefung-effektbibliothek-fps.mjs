// Zweitprüfung: Gegnerseite (gespiegelt), Tastatur, Auto-Modus-fps in Echtzeit, Stresstest mit Dichte 200 %.
import { createRequire } from "node:module";
const require = createRequire("G:/GameDev/apps/client/package.json");
const { chromium } = require("@playwright/test");
const OUT = "G:/GameDev/design/combat-fx/shots-effektbibliothek";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 980 } });
const errors = [];
page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") errors.push(`[console ${m.type()}] ${m.text()}`); });
page.on("pageerror", (e) => errors.push(`[pageerror] ${e.message}`));
await page.goto("file:///G:/GameDev/design/combat-fx/demo-partikel-effektbibliothek.html");
await page.waitForTimeout(400);
const wrap = page.locator("#wrap");
// Gespiegelt
await page.check("#mirror");
for (const [id, w, sub, ms, name] of [["fire", 0, 0, 300, "feuerball"], ["melee", 0, 0, 190, "schnitt"], ["pets", 0, 0, 200, "biss"], ["frost", 2, 0, 400, "frostwelle"]]) {
  await page.evaluate(([id, w, sub, ms]) => { window.__fx.clear(); window.__fx.play(id, w, sub); window.__fx.step(ms); }, [id, w, sub, ms]);
  await wrap.screenshot({ path: `${OUT}/gespiegelt-${name}.png` });
}
await page.uncheck("#mirror");
await page.evaluate(() => { window.__fx.clear(); window.__fx.resume(); });
// Tastatur: Familie wechseln, Variante, Crit, Zufall
await page.click("#wrap"); // Fokus weg von Bedienelementen
const tags = [];
for (const key of ["ArrowRight", "ArrowRight", "3", "c", " ", "ArrowLeft", "ArrowDown", "2"]) { await page.keyboard.press(key === " " ? "Space" : key); await page.waitForTimeout(120); tags.push(await page.evaluate(() => document.getElementById("tag").textContent)); }
console.log("TASTATUR:", tags.join(" | "));
// Auto-Modus in Echtzeit, dichte Abtastung
await page.evaluate(() => { window.__fx.clear(); window.__fx.auto(true); });
const s1 = []; let maxP1 = 0;
for (let i = 0; i < 100; i++) { await page.waitForTimeout(100); const s = await page.evaluate(() => window.__fx.stats()); if (s.fps) s1.push(s.fps); maxP1 = Math.max(maxP1, s.particles); }
await page.evaluate(() => window.__fx.auto(false));
console.log(`AUTO 10 s: fps min ${Math.min(...s1)} / avg ${Math.round(s1.reduce((a, b) => a + b, 0) / s1.length)} · max Partikel ${maxP1}`);
// Stress: Dichte 200 %, alle 150 ms ein zufälliger Effekt (Crit an)
await page.evaluate(() => { const d = document.getElementById("dens"); d.value = 200; d.dispatchEvent(new Event("input")); document.getElementById("crit").checked = true; });
const s2 = []; let maxP2 = 0, minAdapt = 1;
const fams = ["fire", "frost", "bolt", "poison", "arcane", "void", "aether", "melee", "arrow", "hits", "pets"];
for (let i = 0; i < 60; i++) {
  await page.evaluate((f) => { const fam = f[Math.floor(Math.random() * f.length)]; window.__fx.play(fam, Math.floor(Math.random() * 2), 0); }, fams);
  await page.waitForTimeout(150);
  const s = await page.evaluate(() => window.__fx.stats()); if (s.fps) s2.push(s.fps); maxP2 = Math.max(maxP2, s.particles); minAdapt = Math.min(minAdapt, s.adapt);
}
await wrap.screenshot({ path: `${OUT}/stress-dichte200.png` });
console.log(`STRESS 9 s (Dichte 200 %, Crit, alle 150 ms): fps min ${Math.min(...s2)} / avg ${Math.round(s2.reduce((a, b) => a + b, 0) / s2.length)} · max Partikel ${maxP2} · adaptiv min ${minAdapt.toFixed(2)}`);
await browser.close();
console.log("ERRORS:", errors.length ? errors.join("\n") : "keine");
