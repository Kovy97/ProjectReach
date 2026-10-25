// claude:2026-10-25T12:37:00+01:00 — zählt je Seite sichtbare Emoji/Piktogramm-Zeichen (statt Bild) und kaputte <img>.
// Aufruf (aus G:\GameDev): node design/painterly-assets-2026-10-25/tools/scan-emoji.mjs [port]
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { startHarness } from "../../../apps/client/ui-audit/sim-harness.mjs";
const here = dirname(fileURLToPath(import.meta.url));
const port = Number(process.argv[2] || 5612);
const h = await startHarness({ port, fixture: "endgame", locale: "de", viewport: { width: 1920, height: 1080 }, outDir: join(here, "..", "shots", "scan") });
const { page } = h;
const scan = () => page.evaluate(() => {
  const re = /[\p{Extended_Pictographic}\u2600-\u27BF\u2B50\u2B06\u2194-\u21FF\u25A0-\u25FF]/u;
  const out = [];
  const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = tw.nextNode())) {
    const t = n.nodeValue; if (!t || !re.test(t)) continue;
    const el = n.parentElement; if (!el) continue;
    const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    if (r.width === 0 || r.height === 0 || cs.visibility === "hidden" || cs.display === "none" || cs.opacity === "0") continue;
    const chars = [...t].filter((c) => re.test(c)).join("");
    out.push({ chars, cls: (el.className && typeof el.className === "string" ? el.className : el.tagName).slice(0, 60), text: t.trim().slice(0, 40) });
  }
  const broken = [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && i.getAttribute("src")).map((i) => i.getAttribute("src").slice(-60));
  return { emoji: out, broken };
});
const res = {};
try {
  await page.waitForTimeout(1000); await page.keyboard.press("Escape");
  await h.setState((st) => { st.prestige = { ...(st.prestige || {}), count: Math.max(1, st.prestige?.count ?? 0) }; });
  await page.waitForTimeout(800);
  const ids = await page.evaluate(() => [...new Set([...document.querySelectorAll('[data-guide-id^="sidebar."],[data-guide-id^="topbar."]')].map((e) => e.getAttribute("data-guide-id")))].filter((x) => !/combatStyle|Resize/.test(x)));
  for (const id of ids) {
    try {
      const loc = page.locator(`[data-guide-id="${id}"]`).first();
      if (!(await loc.isVisible())) { await page.locator(".sb-footer-drawer-tab").first().click().catch(() => {}); await page.waitForTimeout(300); }
      await loc.scrollIntoViewIfNeeded().catch(() => {});
      await loc.click({ timeout: 4000 }); await page.waitForTimeout(800);
      res[id] = await scan();
    } catch (e) { res[id] = { err: String(e).slice(0, 120) }; }
  }
  // Kampf: Zone + laufender Kampf
  await page.locator('[data-guide-id="sidebar.combat"]').first().click(); await page.waitForTimeout(700);
  await page.evaluate(() => { document.querySelectorAll("*").forEach((e) => { if (e.scrollHeight > e.clientHeight + 50) e.scrollTop = e.scrollHeight; }); });
  await page.waitForTimeout(600);
  res["combat-grid-unten(raid)"] = await scan();
  await h.shot("scan-combat-unten");
  await page.locator('[data-bot-zone="pastures"]').first().click().catch(() => {}); await page.waitForTimeout(700);
  res["combat-zone-pastures"] = await scan();
} finally {
  writeFileSync(join(here, "..", "shots", "emoji-scan.json"), JSON.stringify(res, null, 1));
  await h.stop();
}
