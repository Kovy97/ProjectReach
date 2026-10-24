// claude:2026-10-24T17:51:00+02:00 — Schrift-/Flächen-Audit (Chef 24.10.: „Texte zu klein, obwohl Platz da ist“).
// Je Seite: Verteilung der Schriftgrößen, kleinste Texte nach Klasse, Felder mit viel Leerfläche um kleinen Inhalt.
// Aufruf (aus apps/client): node ui-audit/_type-audit.mjs <out.json> <B>x<H> [port] [seiten,kommagetrennt]
// Umgebung (claude:2026-10-24T18:05:00+02:00): AUDIT_LOCALE (Standard de), AUDIT_SCALE (data-text-scale: normal|large|xlarge), AUDIT_FONT (data-font).
import { writeFileSync } from "node:fs";
import { startHarness } from "./sim-harness.mjs";

const [out, vp = "1920x1080", portArg = "5533", pagesArg] = process.argv.slice(2);
const [width, height] = vp.split("x").map(Number);
const PAGES = (pagesArg ?? "character,combat,skills-overview,woodcutting,smithing,cooking,farming,hunting,tailoring,bank,storage,shop,quests,achievements,mastery,bestiary,companions,enchanting,stats,prestige,newhaven,tavern,options").split(",");

const h = await startHarness({ port: Number(portArg), fixture: "endgame", locale: process.env.AUDIT_LOCALE ?? "de", viewport: { width, height } });
const { page } = h;
const result = { viewport: vp, pages: {} };
try {
  await page.waitForTimeout(1500);
  await page.keyboard.press("Escape");
  await page.evaluate(([sc, ft]) => { if (sc) document.documentElement.dataset.textScale = sc; if (ft) document.documentElement.dataset.font = ft; }, [process.env.AUDIT_SCALE ?? "", process.env.AUDIT_FONT ?? ""]);
  for (const id of PAGES) {
    const sel = `[data-guide-id="sidebar.${id}"], [data-guide-id="topbar.${id}"]`;
    if (id === "options") { await page.locator(".sb-footer-drawer-tab").first().click({ timeout: 2000 }).catch(() => {}); await page.waitForTimeout(400); }
    if ((await page.locator(sel).count()) === 0) { result.pages[id] = { fehlt: true }; continue; }
    try { await page.locator(sel).first().click({ timeout: 4000 }); } catch { result.pages[id] = { klickFehler: true }; continue; }
    await page.waitForTimeout(900);
    const skip = page.locator(".guide-bubble-skip");
    if (await skip.count()) { await skip.first().click().catch(() => {}); await page.waitForTimeout(300); }
    await page.screenshot({ path: out.replace(/\.json$/, `-${id}.png`) });
    result.pages[id] = await page.evaluate(() => {
      const W = innerWidth, H = innerHeight;
      const vis = (r) => r.width > 2 && r.height > 2 && r.right > 0 && r.bottom > 0 && r.left < W && r.top < H;
      const cls = (e) => (typeof e.className === "string" ? e.className : "").trim().split(/\s+/).slice(0, 2).join(".");
      const path = (e) => [e.parentElement?.parentElement, e.parentElement, e].filter(Boolean).map(cls).filter(Boolean).join(" > ");
      const texts = [];
      for (const e of document.querySelectorAll("#root *")) {
        const own = [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(" ").trim();
        if (!own) continue;
        const cs = getComputedStyle(e);
        if (cs.visibility === "hidden" || cs.display === "none" || Number(cs.opacity) === 0) continue;
        const r = e.getBoundingClientRect();
        if (!vis(r)) continue;
        texts.push({ fs: parseFloat(cs.fontSize), t: own.slice(0, 36), p: path(e), r: [r.left, r.top, r.width, r.height] });
      }
      const hist = {};
      for (const x of texts) { const b = x.fs < 11 ? "<11" : x.fs < 13 ? "11-12" : x.fs < 15 ? "13-14" : x.fs < 18 ? "15-17" : "18+"; hist[b] = (hist[b] ?? 0) + 1; }
      const small = {};
      for (const x of texts.filter((x) => x.fs < 14)) { const k = x.p; (small[k] ??= { fs: x.fs, n: 0, bsp: x.t }).n++; }
      // Leerflächen: gerahmte/hinterlegte Felder ≥ 120×60, deren Inhalt (Text + Bilder) weniger als 22 % der Fläche deckt
      const sparse = [];
      for (const e of document.querySelectorAll("#root *")) {
        const r = e.getBoundingClientRect();
        if (!vis(r) || r.width < 120 || r.height < 60 || r.width * r.height > W * H * 0.25) continue;
        const cs = getComputedStyle(e);
        const framed = cs.borderImageSource !== "none" || parseFloat(cs.borderTopWidth) >= 1 || cs.backgroundImage !== "none";
        if (!framed) continue;
        let area = 0, maxFs = 0, n = 0;
        for (const c of e.querySelectorAll("*")) {
          const cr = c.getBoundingClientRect();
          if (!vis(cr)) continue;
          const own = [...c.childNodes].some((k) => k.nodeType === 3 && k.textContent.trim());
          if (c.tagName === "IMG" || c.tagName === "CANVAS" || own) {
            // Textfläche = tatsächliche Zeilenbreite, nicht die Blockbreite
            let w = cr.width;
            if (own && c.tagName !== "IMG") { const rg = document.createRange(); rg.selectNodeContents(c); w = Math.min(w, rg.getBoundingClientRect().width); }
            area += w * cr.height; n++;
            if (own) maxFs = Math.max(maxFs, parseFloat(getComputedStyle(c).fontSize));
          }
        }
        const fill = area / (r.width * r.height);
        if (n > 0 && n <= 6 && fill < 0.22 && maxFs < 20) sparse.push({ p: path(e), wh: [Math.round(r.width), Math.round(r.height)], fill: Math.round(fill * 100), maxFs });
      }
      // nur die äußersten melden (keine verschachtelten Doppelungen derselben Klasse)
      const seen = new Set();
      const sparseU = sparse.filter((s) => (seen.has(s.p) ? false : (seen.add(s.p), true))).slice(0, 25);
      const smallTop = Object.entries(small).sort((a, b) => b[1].n - a[1].n).slice(0, 30).map(([p, v]) => ({ p, ...v }));
      // Chrome-Minimum (Seitenleiste, Kopfzeile, Tooltip, Optionen) + Überlauf
      const chromeSel = ".sidebar, .sb-root, aside, .topbar-area, .topbar, .content-header, .itip, .item-tooltip, .options-page, .toast, .toasts";
      const chromeFs = texts.filter((x) => { const el = document.elementFromPoint(x.r[0] + 1, x.r[1] + 1); return el && el.closest(chromeSel); }).map((x) => x.fs);
      const chromeSmall = texts.filter((x) => x.fs < 13).filter((x) => { const el = document.elementFromPoint(x.r[0] + 1, x.r[1] + 1); return el && el.closest(chromeSel); }).map((x) => x.p + " " + x.fs + " " + x.t).slice(0, 8);
      const overflowX = document.documentElement.scrollWidth - innerWidth;
      return { n: texts.length, chromeSmall, chromeMin: chromeFs.length ? Math.min(...chromeFs) : null, overflowX, hist, minFs: Math.min(...texts.map((x) => x.fs)), small: smallTop, sparse: sparseU };
    });
  }
} finally {
  writeFileSync(out, JSON.stringify(result, null, 1));
  await h.stop();
}
