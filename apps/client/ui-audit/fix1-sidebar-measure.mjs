#!/usr/bin/env node
/**
 * 1.0-Fixrunde FIX 1 — Baseline-Messung (VORHER): Sidebar-Nav-Überlauf bei 1920x1080 und
 * 1366x768. Reine Diagnose, kein Tour-Flow noetig (die Ueberlappung ist reine CSS/Layout-Sache,
 * unabhaengig vom Onboarding-Guide).
 */
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { withHarness } from "./sim-harness.mjs";

const OUT_DIR = "C:\\Users\\MSchu\\AppData\\Local\\Temp\\claude\\G--GameDev\\553d2095-3a73-4795-9782-0fe746a25f13\\scratchpad\\fix-1.0";
mkdirSync(OUT_DIR, { recursive: true });

async function measure(viewport, suffix, port) {
  await withHarness({ port, fixture: "midgame", locale: "de", viewport, outDir: OUT_DIR }, async (h) => {
    const { page } = h;
    await page.waitForTimeout(1000);
    const data = await page.evaluate(() => {
      const nav = document.querySelector(".sb-nav");
      const nh = document.querySelector('[data-guide-id="sidebar.newhaven"]');
      const stats = document.querySelector('[data-guide-id="sidebar.stats"]');
      const footer = document.querySelector(".sb-footer");
      const brand = document.querySelector(".sb-brand");
      const r = (el) => el ? el.getBoundingClientRect() : null;
      return {
        innerHeight: window.innerHeight,
        navScrollHeight: nav?.scrollHeight ?? null,
        navClientHeight: nav?.clientHeight ?? null,
        navRect: r(nav),
        newHavenRect: r(nh),
        statsRect: r(stats),
        footerRect: r(footer),
        brandRect: r(brand),
        sbScaleEff: nav ? getComputedStyle(document.querySelector(".sidebar")).getPropertyValue("--sb-scale-eff") : null,
      };
    });
    console.log(`\n=== ${suffix} (${viewport.width}x${viewport.height}) ===`);
    console.log(JSON.stringify(data, null, 2));
    await h.shot(`before-sidebar-${suffix}`);
  });
}

await measure({ width: 1920, height: 1080 }, "1920x1080", 5901);
await measure({ width: 1366, height: 768 }, "1366x768", 5902);
