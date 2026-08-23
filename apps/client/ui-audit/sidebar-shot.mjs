// Beleg-Screenshot der Seitenleiste je Aufloesung/Sprache — zeigt, wie lange Labels umbrechen.
import { startHarness } from "./sim-harness.mjs";

const OUT = "C:/Users/MSchu/AppData/Local/Temp/claude/G--GameDev/553d2095-3a73-4795-9782-0fe746a25f13/scratchpad/sidebar-probe";

const main = async () => {
  const width = Number(process.argv[2] ?? 2560);
  const height = Number(process.argv[3] ?? 1440);
  const locale = process.argv[4] ?? "de";
  const tag = process.argv[5] ?? "nachher";
  const h = await startHarness({
    port: 5397, fixture: "mkt_camp", locale,
    viewport: { width, height },
    outDir: OUT,
  });
  try {
    await h.page.waitForTimeout(1200);
    const bar = await h.page.$(".sidebar");
    if (bar) await bar.screenshot({ path: `${OUT}/sidebar-${tag}-${locale}-${width}x${height}.png` });
    const zeilen = await h.page.evaluate(() => {
      return Array.from(document.querySelectorAll(".sb-skill-name")).map((el) => {
        const r = document.createRange();
        r.selectNodeContents(el);
        const zuHoch = el.scrollHeight - el.clientHeight;
        const zuBreit = el.scrollWidth - el.clientWidth;
        const mark = zuHoch > 1 || zuBreit > 1 ? `  <<< GEKLIPPT h+${zuHoch} b+${zuBreit}` : "";
        return `${(el.textContent || "").trim()}=${r.getClientRects().length}${mark}`;
      });
    });
    console.log(zeilen.join("  "));
  } finally {
    await h.stop();
  }
};
main().catch((e) => { console.error(e); process.exit(1); });
