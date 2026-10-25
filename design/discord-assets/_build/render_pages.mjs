// claude:2026-10-25T13:17:00+01:00 - Discord-Grafiken rendern (headless Chromium, file://, kein Server/Port noetig).
// Aufruf: node design/discord-assets/_build/render_pages.mjs [id ...]   (ohne Argumente: alle Abschnitte)
// Playwright kommt aus apps/client/node_modules (kein eigenes Paket im design-Ordner).
import { chromium } from "file:///G:/GameDev/apps/client/node_modules/@playwright/test/index.mjs";

const ROOT = "G:/GameDev/design/discord-assets/";
const OUT = {
  icon_crown: "server/server-icon_crown.png",
  icon_logo: "server/server-icon_logo.png",
  icon_hearth: "server/server-icon_hearth.png",
  banner_highlands: "server/server-banner_highlands.png",
  banner_dusk: "server/server-banner_dusk.png",
  splash_highlands: "server/invite-background_highlands.png",
  splash_war_table: "server/invite-background_war-table.png",
};
for (const h of ["welcome", "rules", "faq", "announcements", "patch-notes", "dev-log", "guides-and-builds", "suggestions", "bug-reports", "beta-news"]) {
  OUT["hdr_" + h] = `headers/alt-4x1/header_${h}.png`;
  OUT["hdr2_" + h] = `headers/header_${h}.png`; // claude:2026-10-25T13:15:00+01:00 - 2:1-Fassung ist die Hauptfassung
}
const want = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(OUT);

const b = await chromium.launch({ args: ["--allow-file-access-from-files"] });
const p = await b.newPage({ viewport: { width: 1960, height: 1120 }, deviceScaleFactor: 1 });
p.on("pageerror", (e) => console.log("PAGEERROR", e.message));
p.on("requestfailed", (r) => console.log("REQFAIL", r.url()));
await p.goto("file:///" + ROOT + "_build/pages.html");
await p.evaluate(() => document.fonts.ready);
await p.evaluate(() => window.__fitDone); // 2:1-Titel eingepasst
await p.waitForTimeout(600);
for (const id of want) {
  await p.evaluate((sid) => {
    document.querySelectorAll("section").forEach((el) => { el.style.display = el.id === sid ? "" : "none"; });
    window.scrollTo(0, 0);
  }, id);
  await p.evaluate(() => Promise.all([...document.images].filter((i) => i.offsetParent).map((i) => i.decode().catch(() => null))));
  await p.waitForTimeout(120);
  // Kopfbilder: Textblock muss innerhalb der Holzleiste (24 px) liegen und darf nicht ueberlaufen
  const check = await p.evaluate((sid) => {
    const sec = document.getElementById(sid).getBoundingClientRect();
    const bad = [];
    document.querySelectorAll(`#${sid} .txt, #${sid} h1, #${sid} p, #${sid} .medal`).forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.left < sec.left + 30 || r.right > sec.right - 30 || r.top < sec.top + 26 || r.bottom > sec.bottom - 26) bad.push(el.className || el.tagName);
    });
    document.querySelectorAll(`#${sid} h1`).forEach((h) => { if (h.scrollWidth > h.clientWidth + 1) bad.push("h1-ueberlauf"); });
    const t = document.querySelector(`#${sid} .txt`);
    return { bad, right: t ? Math.round(t.getBoundingClientRect().right - sec.left) : null };
  }, id);
  console.log(id, check.bad.length ? "PROBLEM: " + check.bad.join(", ") : "Lage ok", check.right !== null ? `Text bis x=${check.right}` : "");
  await p.locator("#" + id).screenshot({ path: ROOT + OUT[id] });
}
await b.close();
