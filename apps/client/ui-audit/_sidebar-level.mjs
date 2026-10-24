// Prüft, ob die Skill-Level der Seitenleiste in ihren Knopf passen (Chef 24.10., Reforged). Aufruf: node ui-audit/_sidebar-level.mjs <BxH> <port> <out.png>
import { startHarness } from "./sim-harness.mjs";
const [vp, port, out, scale = "normal"] = process.argv.slice(2);
const [width, height] = vp.split("x").map(Number);
const h = await startHarness({ port: Number(port), fixture: "endgame", locale: "de", viewport: { width, height } });
try {
  await h.page.evaluate((sc) => { localStorage.setItem("hearthforge:textscale", sc); document.documentElement.setAttribute("data-text-scale", sc); }, scale);
  await h.page.waitForTimeout(1500);
  await h.page.keyboard.press("Escape");
  const r = await h.page.evaluate(() => [...document.querySelectorAll(".sb-skill-btn")].map((b) => {
    const l = b.querySelector(".sb-skill-level");
    if (!l || !l.textContent.trim()) return null;
    const br = b.getBoundingClientRect();
    const rg = document.createRange(); rg.selectNodeContents(l); const lr = rg.getBoundingClientRect();
    return { t: l.textContent.trim(), ueber: Math.round(lr.right - br.right), fs: getComputedStyle(l).fontSize };
  }).filter(Boolean));
  console.log(vp, "max Überstand px:", Math.max(...r.map((x) => x.ueber)), "Schrift", r[0]?.fs, r.slice(0, 3));
  await h.page.screenshot({ path: out, clip: { x: 0, y: 0, width: Math.round(width * 0.2), height } });
} finally { await h.stop(); }
