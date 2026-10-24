// Bildet die Ländereien-Knöpfe der Seitenleiste ab (Status unter dem Namen). Aufruf: node ui-audit/_sidebar-estates.mjs <BxH> <port> <out-präfix> [skala]
import { startHarness } from "./sim-harness.mjs";
const [vp, port, out, scale = "normal"] = process.argv.slice(2);
const [width, height] = vp.split("x").map(Number);
const h = await startHarness({ port: Number(port), fixture: "endgame", locale: "de", viewport: { width, height } });
try {
  await h.page.evaluate((sc) => { localStorage.setItem("hearthforge:textscale", sc); document.documentElement.setAttribute("data-text-scale", sc); localStorage.setItem("gr.updateNotice.suppress", "1"); }, scale);
  await h.page.waitForTimeout(1500);
  await h.page.keyboard.press("Escape");
  const btns = h.page.locator(".sb-estate-btn");
  const n = await btns.count();
  for (let i = 0; i < n; i++) {
    await btns.nth(i).scrollIntoViewIfNeeded();
    await btns.nth(i).screenshot({ path: `${out}-${i}.png` });
  }
  const r = await h.page.evaluate(() => [...document.querySelectorAll(".sb-estate-btn")].map((b) => {
    const nm = b.querySelector(".sb-skill-name")?.getBoundingClientRect();
    const st = b.querySelector(".sb-estate-status")?.getBoundingClientRect();
    return nm && st ? { abstand: Math.round(st.top - nm.bottom), statusPx: getComputedStyle(b.querySelector(".sb-estate-status")).fontSize } : null;
  }));
  console.log(vp, scale, JSON.stringify(r));
} finally { await h.stop(); }
