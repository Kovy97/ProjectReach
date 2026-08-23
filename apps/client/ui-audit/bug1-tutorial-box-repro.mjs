#!/usr/bin/env node
/**
 * bug1-tutorial-box-repro.mjs — Repro + Vorher/Nachher-Beleg für den Spieler-Bugreport
 * "Farming-Button im Tutorial fast komplett verdeckt" (Marina, 44min Spielzeit, 1.0.0-Launch-Tag).
 *
 * Springt per Debug-State-Patch direkt in einzelne Onboarding-Guide-Schritte (kein mühsames
 * Durchklicken von 12 Schritten nötig — s. onboarding-steps.ts für die Index-Reihenfolge) und
 * screenshottet bei 1920×1080 UND 1366×768. Getestet: der gemeldete Schritt (sidebar.farming,
 * Index 12) + zwei Randfälle (sidebar.herblore = letzter/tiefster Sidebar-Eintrag, Index 18;
 * topbar.bestiary = Top-Bar-Ziel nah am oberen Rand, Index 1).
 *
 * Run: node ui-audit/bug1-tutorial-box-repro.mjs   (aus apps/client/)
 */
import { startHarness } from "./sim-harness.mjs";

const PORT = 5362;
const STEPS = [
  { idx: 1, name: "topbar-bestiary" },
  { idx: 12, name: "sidebar-farming" },
  { idx: 18, name: "sidebar-herblore" },
];
const VIEWPORTS = [
  { width: 1920, height: 1080, tag: "1920x1080" },
  { width: 1366, height: 768, tag: "1366x768" },
];

async function main() {
  for (const vp of VIEWPORTS) {
    const h = await startHarness({
      port: PORT,
      fixture: "midgame",
      locale: "en",
      viewport: { width: vp.width, height: vp.height },
      outDir: "C:\\Users\\MSchu\\AppData\\Local\\Temp\\claude\\G--GameDev\\553d2095-3a73-4795-9782-0fe746a25f13\\scratchpad\\bugs-1.0.1-tooltip",
    });
    try {
      for (const step of STEPS) {
        // setState()/patchContent() serialisieren `fn` per .toString() (keine Closures über
        // äußere Node-Variablen erlaubt, s. sim-harness.mjs-Header) — der Step-Index kommt daher
        // per echtem page.evaluate()-Argument rein statt über eine setState-Closure.
        await h.page.evaluate((idx) => {
          const dbg = window.__hfDebug;
          dbg.state.onboarding.active = true;
          dbg.state.onboarding.step = idx;
          dbg.state.onboarding.done = false;
        }, step.idx);
        await h.page.waitForTimeout(400);
        await h.shot(`bug1-${step.name}-${vp.tag}-after`);
      }
    } finally {
      await h.stop();
    }
  }
  console.log("DONE");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
