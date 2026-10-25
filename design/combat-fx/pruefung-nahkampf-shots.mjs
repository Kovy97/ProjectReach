// claude:2026-10-25T14:48:00+01:00 — Nahkampf 1.4.1: Kontaktbögen der Bibliotheksseite (demo-nahkampf.html). Spult
// jede Kachel deterministisch vor (Zeit-Shim der Seite) und setzt die Kachel-Bilder zu Bögen zusammen:
//   shots-nahkampf/uebersicht-ohne-element.png   — alle Waffenarten, Variante 1/2/Krit
//   shots-nahkampf/waffe-<art>.png               — je Waffenart: alle Elemente × (V1, V2, Krit, Krit später)
//   shots-nahkampf/ausloeser.png                 — Element-Auslöser (Status greift) an vier Waffen
// Aufruf: node design/combat-fx/pruefung-nahkampf-shots.mjs [waffenart]
import { createRequire } from "node:module";
import fs from "node:fs";
const require = createRequire("G:/GameDev/apps/client/package.json");
const { chromium } = require("@playwright/test");
const OUT = "G:/GameDev/design/combat-fx/shots-nahkampf";
const only = process.argv[2] || null;
// nur die eigenen Bögen ersetzen, den Unterordner im-spiel/ (Harness-Aufnahmen) stehen lassen
if (!only && fs.existsSync(OUT)) for (const f of fs.readdirSync(OUT)) if (f.endsWith(".png")) fs.rmSync(`${OUT}/${f}`);
fs.mkdirSync(OUT, { recursive: true });
// Momente je Waffe: [normal früh, normal spät] / [Krit früh, Krit spät] in ms nach dem Auslösen
const T = {
  dagger: [[150, 230], [230, 320]], sword: [[190, 260], [300, 380]], scimitar: [[190, 260], [250, 340]],
  spear: [[150, 230], [210, 300]], mace: [[200, 280], [215, 300]], axe: [[175, 250], [200, 280]],
  battleaxe: [[230, 300], [250, 330]], greataxe: [[250, 330], [280, 360]], greatsword: [[250, 330], [380, 450]],
  maul: [[255, 340], [285, 380]],
};
const NAME = { "": "Stahl", fire: "Feuer", frost: "Frost", shock: "Blitz", poison: "Gift", bleed: "Blutung", void: "Leere" };
const WNAME = { dagger: "Dolch", sword: "Schwert", scimitar: "Krummsäbel", spear: "Speer", mace: "Streitkolben", axe: "Axt", battleaxe: "Kampfaxt", greataxe: "Großaxt", greatsword: "Großschwert", maul: "Maul" };
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1700, height: 1000 } });
const sheet = await browser.newPage({ viewport: { width: 1200, height: 800 } });
const errors = [];
page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") errors.push(`[console ${m.type()}] ${m.text()}`); });
page.on("pageerror", (e) => errors.push(`[pageerror] ${e.message}`));
await page.goto("file:///G:/GameDev/design/combat-fx/demo-nahkampf.html");
await page.waitForTimeout(500);
const CW = 520, CH = 320;
const tileId = (w, e) => (e ? `${w}-${e}` : `${w}-stahl-0`);

async function moment(weapon, element, variant, ms, proc = false) {
  const id = tileId(weapon, element);
  await page.evaluate((id) => { window.__fx.resume(); window.__fx.clear(id); window.__fx.prepare(id); }, id);
  await page.waitForTimeout(40);
  await page.evaluate(([id, v, ms, p]) => { window.__fx.manual(); window.__fx.play(id, v, p); window.__fx.step(ms); }, [id, variant, ms, proc]);
  const buf = await page.locator(`.tile[data-id="${id}"] .stage`).screenshot();
  await page.evaluate((id) => window.__fx.clear(id), id);
  return `data:image/png;base64,${buf.toString("base64")}`;
}

async function writeSheet(file, title, colHeads, rows) {
  const html = `<!doctype html><meta charset="utf-8"><style>
    body{margin:0;background:#0b0a09;color:#d8cdb6;font:14px Georgia,serif}
    h1{font:600 16px Georgia,serif;color:#e7b96b;margin:10px 12px;letter-spacing:.06em;text-transform:uppercase}
    table{border-collapse:collapse;margin:0 8px 8px} th{color:#e7b96b;font:600 12px Georgia,serif;padding:4px;text-transform:uppercase;letter-spacing:.06em}
    td{padding:2px;vertical-align:middle} td.l{color:#d8cdb6;padding-right:8px;white-space:nowrap;text-align:right}
    img{display:block;width:${CW * 0.7}px;height:${CH * 0.7}px;border:1px solid #3a3129}
  </style><h1>${title}</h1><table><tr><th></th>${colHeads.map((h) => `<th>${h}</th>`).join("")}</tr>
  ${rows.map((r) => `<tr><td class="l">${r.label}</td>${r.imgs.map((s) => `<td><img src="${s}"></td>`).join("")}</tr>`).join("")}</table>`;
  await sheet.setContent(html);
  await sheet.waitForTimeout(150);
  await sheet.screenshot({ path: `${OUT}/${file}`, fullPage: true });
  console.log("BOGEN", `${OUT}/${file}`);
}

const weapons = only ? [only] : Object.keys(T);
if (!only) {
  const rows = [];
  for (const w of weapons) {
    const [n, c] = T[w];
    rows.push({ label: WNAME[w], imgs: [await moment(w, "", "0", n[0]), await moment(w, "", "1", n[0]), await moment(w, "", "c", c[0]), await moment(w, "", "c", c[1])] });
  }
  await writeSheet("uebersicht-ohne-element.png", "Nahkampf 1.4.1 · alle Waffenarten ohne Element", ["Variante 1", "Variante 2", "Krit", "Krit, später"], rows);
}
for (const w of weapons) {
  const [n, c] = T[w];
  const rows = [];
  for (const e of Object.keys(NAME)) rows.push({ label: NAME[e], imgs: [await moment(w, e, "0", n[0]), await moment(w, e, "1", n[1]), await moment(w, e, "c", c[0]), await moment(w, e, "c", c[1])] });
  await writeSheet(`waffe-${w}.png`, `${WNAME[w]} · Elemente`, [`Variante 1 @${n[0]}ms`, `Variante 2 @${n[1]}ms`, `Krit @${c[0]}ms`, `Krit @${c[1]}ms`], rows);
}
if (!only) {
  const rows = [];
  for (const e of Object.keys(NAME).filter(Boolean)) rows.push({ label: NAME[e], imgs: [await moment("sword", e, "0", 290, true), await moment("dagger", e, "0", 250, true), await moment("spear", e, "0", 230, true), await moment("maul", e, "0", 340, true)] });
  await writeSheet("ausloeser.png", "Auslöser · Status greift in diesem Schlag", ["Schwert", "Dolch", "Speer", "Maul"], rows);
}
await browser.close();
console.log("ERRORS:", errors.length ? errors.join(String.fromCharCode(10)) : "keine");
