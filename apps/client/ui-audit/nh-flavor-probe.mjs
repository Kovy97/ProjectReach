// 1.0.1-Nachpruefung: sind die Flavor-Texte auf den New-Haven-Karten wirklich vollstaendig
// sichtbar, oder ueberlappt der naechste Block sie nur (dann meldet die Clip-Messung nichts,
// weil kein overflow:hidden mehr im Spiel ist)? Misst Boxen und echte Ueberdeckung.
import { startHarness } from "./sim-harness.mjs";

const OUT = "C:/Users/MSchu/AppData/Local/Temp/claude/G--GameDev/553d2095-3a73-4795-9782-0fe746a25f13/scratchpad/nh-flavor";

const main = async () => {
  const width = Number(process.argv[2] ?? 1920);
  const height = Number(process.argv[3] ?? 1080);
  const h = await startHarness({
    port: 5393, fixture: "mkt_camp", locale: "de",
    viewport: { width, height },
    outDir: OUT,
  });
  try {
    await h.page.click('[data-guide-id="sidebar.newhaven"]');
    await h.page.waitForTimeout(1400);
    const tabs = await h.page.$$(".nh-view-tab");
    if (tabs[1]) await tabs[1].click();
    await h.page.waitForTimeout(1400);

    const info = await h.page.evaluate(() => {
      const out = [];
      for (const el of document.querySelectorAll(".nh-card-flavor")) {
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        const lh = parseFloat(cs.lineHeight) || 16;
        const lastLineY = r.top + Math.max(0, el.scrollHeight - lh / 2);
        const hit = document.elementFromPoint(Math.round(r.left + r.width / 2), Math.round(lastLineY));
        const sib = el.nextElementSibling;
        const sr = sib ? sib.getBoundingClientRect() : null;
        out.push({
          text: (el.textContent || "").trim().slice(0, 44),
          box: { h: Math.round(r.height), w: Math.round(r.width) },
          inhalt: { scrollH: el.scrollHeight, clientH: el.clientHeight },
          zuHoch: el.scrollHeight - el.clientHeight,
          overflow: cs.overflow,
          lineClamp: cs.webkitLineClamp,
          maxHeight: cs.maxHeight,
          letzteZeileVerdecktVon: hit && hit !== el ? String(hit.className || hit.tagName).slice(0, 50) : "frei",
          naechstesUeberlappt: sr ? Math.round(r.top + el.scrollHeight - sr.top) : null,
        });
      }
      const schlimm = out.filter((k) => k.zuHoch > 2);
      return { viewport: [window.innerWidth, window.innerHeight], anzahl: out.length, nochZuKlein: schlimm.length, schlimmste: schlimm.slice(0, 5) };
    });
    console.log(JSON.stringify(info, null, 2));
    await h.page.screenshot({ path: `${OUT}/nh-list-${width}x${height}.png` });
  } finally {
    await h.stop();
  }
};
main().catch((e) => { console.error(e); process.exit(1); });
