// Prüfskript: öffnet die Effekt-Bibliothek mit Playwright, spult jeden Effekt deterministisch vor und macht Screenshots.
import { createRequire } from "node:module";
import fs from "node:fs";
const require = createRequire("G:/GameDev/apps/client/package.json");
const { chromium } = require("@playwright/test");
const OUT = "G:/GameDev/design/combat-fx/shots-effektbibliothek";
const only = process.argv[2] || null;
if (!only) fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
const TIMES = { magic: [300, 760], melee: [190, 330], arrow: [200, 420], hits: [110, 260], pets: [200, 420] };
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 980 } });
const errors = [];
page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") errors.push(`[console ${m.type()}] ${m.text()}`); });
page.on("pageerror", (e) => errors.push(`[pageerror] ${e.message}`));
await page.goto("file:///G:/GameDev/design/combat-fx/demo-partikel-effektbibliothek.html");
await page.waitForTimeout(500);
const fams = await page.evaluate(() => window.__fx.families());
const wrap = page.locator("#wrap");
const shots = [];
for (const f of fams) {
  if (only && f.id !== only) continue;
  const times = TIMES[f.id] || TIMES.magic;
  const subCount = f.subs ? f.subs.length : 1;
  for (let sub = 0; sub < subCount; sub++) {
    await page.evaluate(([id, sub]) => { window.__fx.clear(); window.__fx.play(id, 0, sub); window.__fx.clear(); }, [f.id, sub]);
    const set = await page.evaluate(() => [...document.querySelectorAll("#vars button")].map((x) => [x.dataset.var, x.textContent]));
    for (const [which, name] of set) {
      if (which === "r") continue;
      const w = which === "c" ? "c" : +which;
      for (let i = 0; i < times.length; i++) {
        await page.evaluate(([id, w, sub, ms]) => { window.__fx.clear(); window.__fx.play(id, w, sub); window.__fx.step(ms); }, [f.id, w, sub, times[i]]);
        const file = `${OUT}/${f.id}${f.subs ? "-" + f.subs[sub].toLowerCase().replace(/[^a-z]/g, "") : ""}-${which}-${"ab"[i]}.png`;
        await wrap.screenshot({ path: file });
        shots.push(`${file}  (${f.name}${f.subs ? " / " + f.subs[sub] : ""} · ${name} @${times[i]}ms)`);
      }
    }
  }
}
await page.evaluate(() => { window.__fx.clear(); window.__fx.resume(); window.__fx.auto(true); });
const samples = []; let maxP = 0;
for (let i = 0; i < 24; i++) { await page.waitForTimeout(500); const s = await page.evaluate(() => window.__fx.stats()); samples.push(s.fps); maxP = Math.max(maxP, s.particles); }
await page.evaluate(() => window.__fx.auto(false));
await browser.close();
console.log(shots.join("\n"));
console.log("AUTO fps:", samples.join(" "), "· max Partikel", maxP);
console.log("ERRORS:", errors.length ? errors.join("\n") : "keine");
