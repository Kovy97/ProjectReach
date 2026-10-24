// Kontrollbild Laden (Chef 24.10.: Kontrast der Item-Karten). Aufruf: node ui-audit/_shop-shot.mjs <BxH> <port> <out.png>
import { startHarness } from "./sim-harness.mjs";
const [vp, port, out] = process.argv.slice(2);
const [width, height] = vp.split("x").map(Number);
const h = await startHarness({ port: Number(port), fixture: "endgame", locale: "de", viewport: { width, height } });
try {
  await h.page.evaluate(() => localStorage.setItem("gr.updateNotice.suppress", "1"));
  await h.page.waitForTimeout(1200);
  await h.page.keyboard.press("Escape");
  await h.page.locator('[data-guide-id="topbar.shop"], [data-guide-id="sidebar.shop"]').first().click();
  await h.page.waitForTimeout(1500);
  const skip = h.page.locator(".guide-bubble-skip"); if (await skip.count()) await skip.first().click().catch(() => {});
  await h.page.waitForTimeout(400);
  await h.page.mouse.move(width - 5, height - 5);
  await h.page.screenshot({ path: out });
} finally { await h.stop(); }
