import { startHarness } from "./sim-harness.mjs";
const main = async () => {
  const h = await startHarness({
    port: 5362, fixture: "midgame", locale: "en",
    viewport: { width: 1920, height: 1080 },
    outDir: "C:/Users/MSchu/AppData/Local/Temp/claude/G--GameDev/553d2095-3a73-4795-9782-0fe746a25f13/scratchpad/bugs-1.0.1-tooltip",
  });
  try {
    await h.page.evaluate((idx) => {
      const dbg = window.__hfDebug;
      dbg.state.onboarding.active = true;
      dbg.state.onboarding.step = idx;
      dbg.state.onboarding.done = false;
    }, 12);
    await h.page.waitForTimeout(600);
    const info = await h.page.evaluate(() => {
      const bubble = document.querySelector(".guide-bubble");
      const spot = document.querySelector(".guide-spotlight");
      const target = document.querySelector('[data-guide-id="sidebar.farming"]');
      const r = (el) => el ? el.getBoundingClientRect() : null;
      return {
        vw: window.innerWidth, vh: window.innerHeight,
        bubble: r(bubble), spotlight: r(spot), target: r(target),
        bubbleStyleTop: bubble ? bubble.style.top : null,
        bubbleStyleLeft: bubble ? bubble.style.left : null,
      };
    });
    console.log(JSON.stringify(info, null, 2));
  } finally {
    await h.stop();
  }
};
main().catch((e) => { console.error(e); process.exit(1); });
