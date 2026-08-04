#!/usr/bin/env node
/**
 * Meisterweihe Stufe 3 (design/master-capes-konzept.md §3, Chef-GO 2026-07-10) self-check:
 * screenshots MasteryCeremony.tsx — trigger, queue staffelling (never two modals at once), the
 * "without cape item" state (real content, no cape_master_* items yet), the "with cape item"
 * state (mastery-content-shim.ts via vite.tour.mastery.config.mjs), and the sidebar/skills-
 * overview gold-99 insignia. Port 5228 per task instructions.
 *
 * Fixture: mastery.json (gen-masterytest-fixture.mjs) — woodcutting/mining/attack already at
 * Level 99, everything else Level 60. The live tick loop marks all three Weihen on its first
 * tick (engine/capes.ts checkMasteryCapes), queued in that exact order (content.skills insertion
 * order: woodcutting, mining, ..., attack).
 *
 * Run: node mastery-ceremony-shot.mjs
 * Output: PNGs written to the scratchpad dir.
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5228;
const SHIM_PORT = 5229;
const BASE_URL = `http://localhost:${PORT}`;
const SHIM_BASE_URL = `http://localhost:${SHIM_PORT}`;
const OUT_DIR = "C:\\Users\\MSchu\\AppData\\Local\\Temp\\claude\\G--GameDev\\553d2095-3a73-4795-9782-0fe746a25f13\\scratchpad";

function startDevServer(configName, port) {
  const viteBin = join(CLIENT_DIR, "node_modules", "vite", "bin", "vite.js");
  const child = spawn(
    process.execPath,
    [viteBin, "dev", "--config", join(__dirname, configName), "--port", String(port), "--strictPort"],
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

async function shot(page, out, w = 1920, h = 1080) {
  await page.setViewportSize({ width: w, height: h });
  await page.waitForTimeout(300);
  await page.screenshot({ path: out });
  console.log("SHOT SAVED: " + out + " @ " + w + "x" + h);
}

const errors = [];

// ── Run 1: real content (no cape items) — trigger, queue staffelling, sidebar/overview gold. ──
const run1 = startDevServer("vite.tour.config.mjs", PORT);
try {
  const ok = await waitForServer(BASE_URL);
  if (!ok) { console.error("SERVER NOT UP (real):\n" + run1.getOutput()); process.exit(1); }
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on("pageerror", (e) => errors.push("pageerror(real): " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console(real): " + m.text()); });

  await page.goto(`${BASE_URL}/?fixture=mastery`, { waitUntil: "load" });
  await page.waitForSelector(".mwc-card", { timeout: 15000 });

  // 1) First queued ceremony (woodcutting) — real content-dev capes have landed in parallel
  //    (all 20 exist now, incl. cape_master_woodcutting), so this run naturally covers the
  //    "cape block present" state with REAL content (no shim needed for this side anymore).
  const sub1 = await page.locator(".mwc-subtitle").innerText();
  console.log("CEREMONY 1 subtitle: " + sub1);
  const hasCapeBlock1 = await page.locator(".mwc-cape").count();
  const capeName1 = hasCapeBlock1 > 0 ? await page.locator(".mwc-cape-name").innerText() : "(none)";
  const capePerk1 = hasCapeBlock1 > 0 ? await page.locator(".mwc-cape-perk").innerText() : "(none)";
  console.log("CEREMONY 1 cape block present: " + (hasCapeBlock1 > 0) + " (expected true — content-dev shipped cape_master_woodcutting)");
  console.log("CEREMONY 1 cape name: " + capeName1);
  console.log("CEREMONY 1 cape perk line: " + capePerk1);
  await shot(page, join(OUT_DIR, "mastery-1-woodcutting-withcape-1920x1080.png"));
  await shot(page, join(OUT_DIR, "mastery-1-woodcutting-withcape-1280x720.png"), 1280, 720);

  // Close-up of the icon cluster (rise-in + ring + particles) for detail inspection.
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.waitForTimeout(200);
  const iconBox = await page.locator(".mwc-icon-wrap").boundingBox();
  if (iconBox) {
    await page.screenshot({
      path: join(OUT_DIR, "mastery-icon-crop.png"),
      clip: { x: iconBox.x - 60, y: iconBox.y - 60, width: iconBox.width + 120, height: iconBox.height + 120 },
    });
  }

  // 2) Queue proof: click "Weiter", poll the DOM — must NEVER show 2 `.mwc-backdrop` at once,
  //    and the count must legitimately hit 0 during the between-ceremony pause before ceremony 2 mounts.
  await page.locator(".mwc-next-btn").click();
  const counts = [];
  let sawZero = false;
  for (let i = 0; i < 20; i++) {
    const n = await page.locator(".mwc-backdrop").count();
    counts.push(n);
    if (n === 0) sawZero = true;
    if (n > 1) { errors.push(`QUEUE STACK BUG: ${n} .mwc-backdrop elements simultaneously (poll ${i})`); }
    await page.waitForTimeout(120);
  }
  console.log("Queue transition poll (count per 120ms tick): " + counts.join(","));
  console.log("Saw a genuine 0-modal gap during the pause: " + sawZero);

  await page.waitForSelector(".mwc-card", { timeout: 15000 });
  const sub2 = await page.locator(".mwc-subtitle").innerText();
  console.log("CEREMONY 2 subtitle: " + sub2);
  const moreHint2 = await page.locator(".mwc-queue-hint").count();
  console.log("CEREMONY 2 'more await' hint present: " + (moreHint2 > 0) + " (expected true — attack still pending)");
  await shot(page, join(OUT_DIR, "mastery-2-mining-1920x1080.png"));

  // 3) Third + final ceremony (attack — Kämpfer archetype, 3rd stat = kills).
  await page.locator(".mwc-next-btn").click();
  await page.waitForTimeout(1800); // exit (420ms) + queue pause (800ms) + margin
  await page.waitForSelector(".mwc-card", { timeout: 15000 });
  const sub3 = await page.locator(".mwc-subtitle").innerText();
  console.log("CEREMONY 3 subtitle: " + sub3);
  const statLabels3 = await page.locator(".mwc-stat-label").allInnerTexts();
  console.log("CEREMONY 3 stat labels (expect 3, incl. kills): " + JSON.stringify(statLabels3));
  const moreHint3 = await page.locator(".mwc-queue-hint").count();
  console.log("CEREMONY 3 'more await' hint present: " + (moreHint3 > 0) + " (expected false — last in queue)");
  await shot(page, join(OUT_DIR, "mastery-3-attack-1920x1080.png"));

  // 4) Dismiss the last one — queue must be fully drained (0 backdrops), no phantom 4th.
  await page.locator(".mwc-next-btn").click();
  await page.waitForTimeout(1400);
  let finalCount = await page.locator(".mwc-backdrop").count();
  console.log("After 3rd dismiss, .mwc-backdrop count: " + finalCount + " (expected 0 — queue drained)");
  // Diagnostic + drain loop: if content-dev's parallel changes granted an extra Level-99 skill
  // (e.g. a 4th skill crossing 99 from the fixture's Level-60 baseline via some other mechanic),
  // log + dismiss it too instead of crashing the rest of the tour on an unexpected 4th backdrop.
  let guard = 0;
  while (finalCount > 0 && guard < 5) {
    const subN = await page.locator(".mwc-subtitle").innerText();
    console.log("UNEXPECTED extra ceremony subtitle: " + subN);
    await shot(page, join(OUT_DIR, `mastery-unexpected-${guard}.png`));
    await page.locator(".mwc-next-btn").click();
    await page.waitForTimeout(1400);
    finalCount = await page.locator(".mwc-backdrop").count();
    guard++;
  }
  console.log("Final drained .mwc-backdrop count: " + finalCount);

  // 5) Sidebar gold-99 insignia: expand the combat sub-skills (attack=99) + standalone
  //    woodcutting/mining buttons (also 99) should show `.sb-skill-mastered`.
  await page.locator(".sb-combat-toggle").click();
  await page.waitForTimeout(300);
  const masteredCount = await page.locator(".sb-skill-mastered").count();
  console.log("Sidebar .sb-skill-mastered count: " + masteredCount + " (expected 3 — woodcutting/mining/attack)");
  await shot(page, join(OUT_DIR, "mastery-sidebar-gold99.png"));

  // 6) Skills overview gold star.
  await page.locator('[data-guide-id="sidebar.skills-overview"]').click();
  await page.waitForTimeout(400);
  const starCount = await page.locator(".skilloverview-mastery-star").count();
  console.log("Skills overview gold-star count: " + starCount + " (expected 3)");
  await shot(page, join(OUT_DIR, "mastery-skillsoverview-stars.png"));

  await browser.close();
} finally {
  run1.child.kill();
}

// ── Run 2: shimmed content (cape_master_woodcutting REMOVED) — proves the "no cape item (yet)"
//    defensive branch stays intact even though content-dev has since shipped all 20 real capes. ──
const run2 = startDevServer("vite.tour.mastery.config.mjs", SHIM_PORT);
try {
  const ok = await waitForServer(SHIM_BASE_URL);
  if (!ok) { console.error("SERVER NOT UP (shim):\n" + run2.getOutput()); process.exit(1); }
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on("pageerror", (e) => errors.push("pageerror(shim): " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console(shim): " + m.text()); });

  await page.goto(`${SHIM_BASE_URL}/?fixture=mastery`, { waitUntil: "load" });
  await page.waitForSelector(".mwc-card", { timeout: 15000 });
  const sub1 = await page.locator(".mwc-subtitle").innerText();
  console.log("SHIM CEREMONY 1 subtitle: " + sub1);
  const capeBlock = await page.locator(".mwc-cape").count();
  console.log("SHIM cape block present: " + (capeBlock > 0) + " (expected false — shim removed cape_master_woodcutting)");
  await shot(page, join(OUT_DIR, "mastery-1-woodcutting-nocape-1920x1080.png"));
  await shot(page, join(OUT_DIR, "mastery-1-woodcutting-nocape-1280x720.png"), 1280, 720);

  // Reduced-motion check (same media-query gate as PetCelebration).
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload({ waitUntil: "load" });
  await page.waitForSelector(".mwc-card", { timeout: 15000 });
  await shot(page, join(OUT_DIR, "mastery-nocape-reduced-motion.png"));

  await browser.close();
} finally {
  run2.child.kill();
}

console.log(errors.length ? "PAGE ERRORS:\n" + errors.slice(0, 30).join("\n") : "no page errors");
if (errors.some((e) => e.includes("QUEUE STACK BUG"))) process.exit(1);
