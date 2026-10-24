// Prüft den app-weiten Citadel-Ersatz für native title-Tooltips (Chef 24.10.). Aufruf: node ui-audit/_title-tip.mjs <port> <out-präfix>
import { startHarness } from "./sim-harness.mjs";
const [port, out] = process.argv.slice(2);
const h = await startHarness({ port: Number(port), fixture: "endgame", locale: "de", viewport: { width: 1920, height: 1080 } });
try {
  await h.page.evaluate(() => localStorage.setItem("gr.updateNotice.suppress", "1"));
  await h.page.waitForTimeout(1200);
  await h.page.keyboard.press("Escape");
  const kandidaten = await h.page.evaluate(() => [...document.querySelectorAll("[title]")].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 4 && r.height > 4 && r.top >= 0 && r.top < innerHeight; }).slice(0, 40).map((e, i) => { e.setAttribute("data-tt-probe", String(i)); const r = e.getBoundingClientRect(); return { i, t: e.getAttribute("title").slice(0, 50), y: Math.round(r.top), x: Math.round(r.left) }; }));
  console.log("Elemente mit title im Bild:", kandidaten.length);
  const pick = [kandidaten.find((k) => k.y < 120), kandidaten.find((k) => k.y > 300)].filter(Boolean);
  for (const [n, k] of pick.entries()) {
    const el = h.page.locator(`[data-tt-probe="${k.i}"]`);
    await el.hover();
    await h.page.waitForTimeout(450);
    const r = await h.page.evaluate((i) => {
      const e = document.querySelector(`[data-tt-probe="${i}"]`);
      const tip = document.querySelector(".ct-tip");
      const er = e.getBoundingClientRect(), tr = tip?.getBoundingClientRect();
      return { titleWeg: !e.hasAttribute("title"), tipText: tip?.textContent ?? null, tipOben: tr ? Math.round(tr.top) : null, tipUnten: tr ? Math.round(tr.bottom) : null, elOben: Math.round(er.top), elUnten: Math.round(er.bottom) };
    }, k.i);
    console.log(JSON.stringify({ ...k, ...r }));
    await h.page.screenshot({ path: `${out}-${n}.png`, clip: { x: Math.max(0, k.x - 300), y: Math.max(0, k.y - 160), width: 800, height: 360 } });
  }
} finally { await h.stop(); }
