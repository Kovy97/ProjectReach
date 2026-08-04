#!/usr/bin/env node
/**
 * Diagnostic pass for the "empty OFFENSE value cells" tooltip bug — hovers the mainhand slot on
 * the wandbug_wand fixture at a sweep of viewport widths and dumps, per .itip-stat-row inside
 * .itip-offense-group: label text, value text, value boundingClientRect, and whether the value is
 * actually clipped by an ancestor's overflow:hidden (offense-group / warbanner-record / panel).
 * Not a formal ui-audit script — throwaway, scratchpad only.
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = "G:\\GameDev\\apps\\client";
const AUDIT_DIR = join(CLIENT_DIR, "ui-audit");
const PORT = 5299;
const BASE_URL = `http://localhost:${PORT}`;
const OUT_DIR = __dirname;

function startDevServer() {
  const viteBin = join(CLIENT_DIR, "node_modules", "vite", "bin", "vite.js");
  const child = spawn(
    process.execPath,
    [viteBin, "dev", "--config", join(AUDIT_DIR, "vite.tour.config.mjs"), "--port", String(PORT), "--strictPort"],
    { cwd: CLIENT_DIR, stdio: ["ignore", "pipe", "pipe"] },
  );
  let out = "";
  child.stdout.on("data", (d) => (out += d.toString()));
  child.stderr.on("data", (d) => (out += d.toString()));
  return { child, getOutput: () => out };
}

async function waitForServer(url, t = 40000) {
  const s = Date.now();
  while (Date.now() - s < t) {
    try { const r = await fetch(url); if (r.ok) return true; } catch {}
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

async function inspect(browser, width, height, fixture = "wandbug_wand") {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  await page.goto(`${BASE_URL}/?fixture=${fixture}`, { waitUntil: "load" });
  await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
  await page.waitForTimeout(4500); // let achievement/load toasts clear (they intercept pointer events)

  await page.locator('[data-guide-id="topbar.character"]').first().click({ timeout: 10000 });
  await page.waitForTimeout(400);

  const slot = page.locator(".cs-slot.mainhand .slot-item").first();
  await slot.hover();
  await page.waitForTimeout(1400); // real ≥1s hover-to-show delay

  const panelCount = await page.locator(".item-tooltip.itip-panel").count();
  if (panelCount === 0) {
    console.log(`[${width}x${height}] NO TOOLTIP PANEL FOUND`);
    await page.close();
    return;
  }

  // Single atomic evaluate — nothing can unmount/rerender between measurements.
  const data = await page.evaluate(() => {
    const dims = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return { w: +r.width.toFixed(1), h: +r.height.toFixed(1), overflow: cs.overflow, gridTemplateColumns: cs.gridTemplateColumns };
    };
    const containers = {
      panel: dims(".item-tooltip.itip-panel"),
      warbannerMain: dims(".itip-warbanner-main"),
      warbannerRecord: dims(".itip-warbanner-record"),
      body: dims(".itip-body"),
      offenseGroup: dims(".itip-offense-group"),
      bodyChildCount: document.querySelectorAll(".itip-body > *")?.length ?? null,
      bodyChildClasses: Array.from(document.querySelectorAll(".itip-body > *")).map((e) => e.className),
    };
    const rows = Array.from(document.querySelectorAll(".itip-offense-group .itip-stat-row")).map((row) => {
      const label = row.querySelector(".itip-stat-label")?.textContent?.trim() ?? "";
      const valueEl = row.querySelector(".itip-stat-value");
      const value = valueEl?.textContent?.trim() ?? "";
      const vr = valueEl?.getBoundingClientRect();
      const rr = row.getBoundingClientRect();
      let clippedBy = null;
      let el = valueEl?.parentElement ?? null;
      while (el && el !== document.body) {
        const cs = getComputedStyle(el);
        if (cs.overflow === "hidden" || cs.overflowX === "hidden") {
          const er = el.getBoundingClientRect();
          if (vr && (vr.right > er.right + 0.5 || vr.left < er.left - 0.5)) {
            clippedBy = `${el.className} (box right=${er.right.toFixed(0)}, value right=${vr.right.toFixed(0)})`;
            break;
          }
        }
        el = el.parentElement;
      }
      return {
        label,
        value,
        rowWidth: +rr.width.toFixed(0),
        valueRight: vr ? +vr.right.toFixed(0) : null,
        clippedBy,
      };
    });
    return { containers, rows };
  });

  console.log(`\n=== ${width}x${height} ===`);
  console.log(`  containers: ${JSON.stringify(data.containers)}`);
  for (const r of data.rows) {
    console.log(`  [${r.label}] value="${r.value}" rowWidth=${r.rowWidth} valueRight=${r.valueRight} clippedBy=${r.clippedBy}`);
  }

  await page.screenshot({ path: join(OUT_DIR, `wandbug-${fixture}-${width}x${height}.png`), fullPage: false });
  await page.close();
}

const { child, getOutput } = startDevServer();
try {
  const ok = await waitForServer(BASE_URL);
  if (!ok) { console.error("SERVER NOT UP:\n" + getOutput()); process.exit(1); }
  const browser = await chromium.launch();
  const mode = process.argv[2];
  if (mode === "weapon-types") {
    // Cross-weapon-type guard (Chef requirement): same width (1280 — the previously-clipping
    // case) across melee/ranged/staff/wand, so a fix isn't accidentally wand-specific.
    for (const fixture of ["wandbug_sword", "wandbug_bow", "wandbug_staff", "wandbug_wand"]) {
      await inspect(browser, 1280, 800, fixture);
    }
  } else {
    for (const [w, h] of [[1920, 1080], [1600, 900], [1366, 768], [1280, 800], [1100, 700], [1000, 700], [900, 700], [800, 700]]) {
      await inspect(browser, w, h);
    }
  }
  await browser.close();
  console.log("\nALL DONE");
} finally {
  child.kill();
}
