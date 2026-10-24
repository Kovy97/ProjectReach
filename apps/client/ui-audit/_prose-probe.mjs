// claude:2026-10-24T18:30:00+02:00 — Sammelt Fließtext-Elemente (≥4 Wörter) je Seite samt Klasse, Schrift, Größe. Für typography.css.
import { writeFileSync } from "node:fs";
import { startHarness } from "./sim-harness.mjs";
const [out, vp = "1366x768", portArg = "5543", pagesArg] = process.argv.slice(2);
const [width, height] = vp.split("x").map(Number);
const PAGES = (pagesArg ?? "character,combat,skills-overview,woodcutting,smithing,cooking,farming,hunting,tailoring,bank,storage,shop,quests,achievements,mastery,bestiary,companions,enchanting,stats,newhaven,options").split(",");
const h = await startHarness({ port: Number(portArg), fixture: "endgame", locale: process.env.AUDIT_LOCALE ?? "de", viewport: { width, height } });
const { page } = h; const res = {};
try {
  await page.waitForTimeout(1500); await page.keyboard.press("Escape");
  for (const id of PAGES) {
    const sel = `[data-guide-id="sidebar.${id}"], [data-guide-id="topbar.${id}"]`;
    if (id === "options") { await page.locator(".sb-footer-drawer-tab").first().click({ timeout: 2000 }).catch(() => {}); await page.waitForTimeout(400); }
    if ((await page.locator(sel).count()) === 0) { res[id] = "fehlt"; continue; }
    try { await page.locator(sel).first().click({ timeout: 4000 }); } catch { res[id] = "klick"; continue; }
    await page.waitForTimeout(900);
    const skip = page.locator(".guide-bubble-skip"); if (await skip.count()) { await skip.first().click().catch(() => {}); await page.waitForTimeout(300); }
    res[id] = await page.evaluate(() => {
      const o = {};
      for (const e of document.querySelectorAll("#root *")) {
        const own = [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(" ").trim();
        if (own.split(/\s+/).length < 4 || own.length < 22) continue;
        const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue;
        const cs = getComputedStyle(e); if (cs.display === "none" || cs.visibility === "hidden") continue;
        const k = (typeof e.className === "string" ? e.className : "").trim().split(/\s+/).join(".") || e.tagName;
        const f = cs.fontFamily.split(",")[0].replace(/"/g, "");
        (o[k] ??= { n: 0, fs: parseFloat(cs.fontSize), f, ex: own.slice(0, 50) }).n++;
      }
      return o;
    });
  }
} finally { writeFileSync(out, JSON.stringify(res, null, 1)); await h.stop(); }
