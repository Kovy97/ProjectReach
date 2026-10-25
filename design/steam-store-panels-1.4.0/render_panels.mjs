// claude:2026-10-25T10:19:00+01:00 - Store-Panels 1.4.0 rendern (headless Chromium, ein Panel nach dem anderen).
// Aufruf: node design/steam-store-panels-1.4.0/render_panels.mjs [p1 p2 ...]   (ohne Argumente: alle sieben)
// Playwright kommt aus apps/client/node_modules (kein eigenes Paket im design-Ordner).
import { chromium } from "file:///G:/GameDev/apps/client/node_modules/@playwright/test/index.mjs";

const DIR = "G:/GameDev/design/steam-store-panels-1.4.0/";
const NAMES = { p1: "01_skills", p2: "02_combat", p3: "03_world", p4: "04_companions", p5: "05_raid", p6: "06_heroes", p7: "07_idle" };
const want = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(NAMES);

const b = await chromium.launch({ args: ["--allow-file-access-from-files"] });
const p = await b.newPage({ viewport: { width: 1200, height: 600 }, deviceScaleFactor: 1 });
p.on("pageerror", (e) => console.log("PAGEERROR", e.message));
p.on("requestfailed", (r) => console.log("REQFAIL", r.url()));
await p.goto("file:///" + DIR + "panels.html");
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(800);
for (const id of want) {
  // nur EIN Panel sichtbar, damit nichts am Fensterrand beschnitten wird
  await p.evaluate((pid) => {
    document.querySelectorAll(".panel").forEach((el) => { el.style.display = el.id === pid ? "" : "none"; });
    window.scrollTo(0, 0);
  }, id);
  await p.evaluate(() => Promise.all([...document.images].filter((i) => i.offsetParent).map((i) => i.decode().catch(() => null))));
  await p.waitForTimeout(150);
  // Text-Überlauf prüfen: jedes Textelement muss vollständig in seinem Panel liegen
  // Prüfung: Textelemente liegen innerhalb des Panels (Holzleiste 15 px) und, falls in einer Tafel,
  // innerhalb der Tafel-Innenfläche; kein Element läuft horizontal über (scrollWidth).
  const clip = await p.evaluate((pid) => {
    const inside = (r, box, m) => r.left >= box.left + m && r.right <= box.right - m && r.top >= box.top + m && r.bottom <= box.bottom - m;
    const panel = document.getElementById(pid).getBoundingClientRect();
    const bad = [];
    document.querySelectorAll(`#${pid} .eyebrow, #${pid} h2, #${pid} p, #${pid} .chip, #${pid} .tag, #${pid} .glabel, #${pid} .plaque, #${pid} .slot, #${pid} .board`).forEach((el) => {
      const r = el.getBoundingClientRect();
      const name = el.className || el.tagName;
      if (!inside(r, panel, 15)) bad.push("panel:" + name);
      const pl = el.closest(".plaque");
      if (pl && pl !== el && !inside(r, pl.getBoundingClientRect(), 15)) bad.push("plaque:" + name);
      if (el.scrollWidth > el.clientWidth + 1) bad.push("overflow:" + name);
    });
    const pl = document.querySelector(`#${pid} .plaque`);
    const info = pl ? ` plaque h=${Math.round(pl.getBoundingClientRect().height)}` : "";
    return { bad, info };
  }, id);
  console.log(id, clip.bad.length ? "PROBLEM: " + clip.bad.join(", ") : "Textlage ok", clip.info);
  await p.locator("#" + id).screenshot({ path: DIR + "panel_" + NAMES[id] + ".png" });
  console.log("ok", id);
}
await b.close();
