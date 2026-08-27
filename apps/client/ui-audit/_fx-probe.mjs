import { startHarness } from "./sim-harness.mjs";
const OUT = "G:/GameDev/apps/client/ui-audit/shots-tavern";
const h = await startHarness({ port: 5464, fixture: "midgame", locale: "de", viewport: { width: 1920, height: 1080 } });
const { page } = h;
try {
  // Jede neu erzeugte WAAPI-Animation nach dem Start bei 45 % einfrieren → Sprites bleiben auf dem Höhepunkt stehen.
  await page.evaluate(() => {
    const orig = Element.prototype.animate;
    Element.prototype.animate = function (k, o) {
      const a = orig.call(this, k, o);
      const d = typeof o === "number" ? o : (o && typeof o.duration === "number" ? o.duration : 0);
      if (d > 0 && (this.classList.contains("fx-sprite") || this.classList.contains("fx-sprite-cell") || this.classList.contains("fx-missile") || this.parentElement?.classList.contains("fx-sprite"))) {
        setTimeout(() => { try { a.pause(); a.currentTime = d * 0.45; } catch {} }, 0);
      }
      return a;
    };
  });
  await page.waitForTimeout(1200);
  await page.keyboard.press("Escape"); await page.waitForTimeout(300);
  await page.locator('[data-guide-id="sidebar.combat"]').first().click();
  await page.waitForTimeout(800);
  const skip = page.locator(".guide-bubble-skip"); if (await skip.count()) { await skip.first().click(); await page.waitForTimeout(300); }
  await page.locator(".zone-card", { hasText: /Weiden|Pastures/ }).first().click();
  await page.waitForTimeout(1000);
  await page.locator(".monster-card", { hasText: /Bulle|Bull/ }).first().locator(".mc-fight-now-btn").click();
  await page.waitForSelector(".battle", { timeout: 10000 });
  await page.waitForTimeout(5000);
  const info = await page.evaluate(() => {
    const layer = document.querySelector(".arena-fx-layer");
    const stage = document.querySelector(".battle-arena-stage")?.getBoundingClientRect();
    const els = Array.from(document.querySelectorAll(".fx-sprite, .fx-missile")).map((e) => {
      const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
      const cells = Array.from(e.querySelectorAll(".fx-sprite-cell")).map((c) => ({ op: getComputedStyle(c).opacity, bg: (getComputedStyle(c).backgroundImage || "").slice(-40) }));
      const kids = Array.from(e.children).map((c) => { const k = getComputedStyle(c); return { tag: c.tagName, cls: c.className, op: k.opacity, bg: (k.backgroundImage || "").slice(0, 70), bs: k.backgroundSize, bp: k.backgroundPosition, w: k.width, h: k.height, disp: k.display, anims: c.getAnimations().map((a) => ({ ps: a.playState, ct: Math.round(a.currentTime ?? -1), d: a.effect?.getTiming().duration })) }; });
      return { html: e.outerHTML.slice(0, 260), kids, cls: e.className, active: e.classList.contains("active"), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), op: cs.opacity, z: cs.zIndex, anims: e.getAnimations({ subtree: true }).length, cells };
    });
    return { counters: layer ? { ...layer.dataset } : null, layerZ: layer ? getComputedStyle(layer).zIndex : null, stage: stage ? { x: Math.round(stage.x), y: Math.round(stage.y), w: Math.round(stage.width), h: Math.round(stage.height) } : null, els };
  });
  console.log("PROBE " + JSON.stringify(info));
  await page.locator(".battle-arena-stage").first().screenshot({ path: `${OUT}/fx-probe-melee-stage.png` });
} finally {
  await h.close?.();
}
