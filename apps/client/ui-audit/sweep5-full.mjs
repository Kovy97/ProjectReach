#!/usr/bin/env node
/**
 * TESTER 5 ("Der Pixel-Pedant") — vollstaendiger Layout-Sweep ueber ALLE Topbar- und
 * Sidebar-Seiten bei 1920x1080 und 1366x768, plus Modal-Stichproben.
 * Port 5254. Fixture midgame (Hauptlauf) + endgame (Stichprobe, separater Phase-2-Block).
 * READ-ONLY: keine Quelldateien angefasst, kein pnpm build, kein Electron.
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5254;
const BASE_URL = `http://localhost:${PORT}`;
const OUT_DIR = "C:\\Users\\MSchu\\AppData\\Local\\Temp\\claude\\G--GameDev\\553d2095-3a73-4795-9782-0fe746a25f13\\scratchpad\\sweep5";

const RES_WIDE = { width: 1920, height: 1080 };
const RES_NARROW = { width: 1366, height: 768 };

// Alle Topbar-Seiten (siehe navigation.ts topBarPages).
const TOPBAR_PAGES = [
  ["bestiary", "bestiary"],
  ["quests", "quests"],
  ["mastery", "mastery"],
  ["character", "character"],
  ["companions", "companions"],
  ["shop", "shop"],
  ["bank", "bank"],
  ["achievements", "achievements"],
];

// Alle Sidebar-Seiten (flache Liste, siehe getSidebarPages()) + options (Footer, gleicher guideId).
const SIDEBAR_PAGES = [
  ["skills-overview", "skills-overview"],
  ["combat", "combat"],
  ["woodcutting", "woodcutting"],
  ["mining", "mining"],
  ["fishing", "fishing"],
  ["smithing", "smithing"],
  ["cooking", "cooking"],
  ["farming", "farming"],
  ["foraging", "foraging"],
  ["thieving", "thieving"],
  ["leatherworking", "leatherworking"],
  ["jewelcrafting", "jewelcrafting"],
  ["runecrafting", "runecrafting"],
  ["herblore", "herblore"],
  ["slayer", "slayer"],
  ["enchanting", "enchanting"],
  ["stats", "stats"],
  ["options", "options"],
];

// Endgame-Stichprobe (spot-check), Kernseiten mit hoher Datendichte.
const ENDGAME_SAMPLE = [
  ["topbar", "character"],
  ["topbar", "bank"],
  ["topbar", "shop"],
  ["topbar", "mastery"],
  ["topbar", "achievements"],
  ["sidebar", "combat"],
  ["sidebar", "stats"],
];

function startDevServer() {
  const viteBin = join(CLIENT_DIR, "node_modules", "vite", "bin", "vite.js");
  const child = spawn(
    process.execPath,
    [viteBin, "dev", "--config", join(__dirname, "vite.tour.config.mjs"), "--port", String(PORT), "--strictPort"],
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

async function clickRetry(page, locator, opts = {}) {
  try { await locator.click({ timeout: 6000, ...opts }); }
  catch { await page.waitForTimeout(400); await locator.click({ timeout: 6000, force: true, ...opts }); }
}

function measurePage() {
  const cb = document.querySelector(".content-body");
  const overflowX = cb ? cb.scrollWidth - cb.clientWidth : null;
  const imgs = Array.from(document.querySelectorAll("img"));
  const broken = imgs
    .filter((img) => img.getAttribute("src") && img.complete && img.naturalWidth === 0)
    .map((img) => (img.getAttribute("src") || "").split("/").pop() + " class=" + img.className)
    .slice(0, 12);
  // Riesige/winzige gerenderte Icon-Bilder (heuristisch: <img> mit "icon" im Klassennamen).
  const iconImgs = imgs.filter((img) => /icon/i.test(img.className));
  const sizes = iconImgs.map((img) => Math.round(img.getBoundingClientRect().width));
  const tiny = sizes.filter((w) => w > 0 && w < 8).length;
  const huge = sizes.filter((w) => w > 220).length;
  // Leere Listen/Grids (heuristisch: Container mit "list" oder "grid" im Klassennamen, 0 Kinder).
  const emptyContainers = Array.from(document.querySelectorAll('[class*="grid"],[class*="list"]'))
    .filter((el) => el.children.length === 0 && el.textContent.trim() === "")
    .map((el) => el.className)
    .slice(0, 8);
  return {
    overflowX,
    bodyScrollW: document.body.scrollWidth,
    bodyClientW: document.body.clientWidth,
    totalImgs: imgs.length,
    brokenImgCount: broken.length,
    brokenImgs: broken,
    tinyIconCount: tiny,
    hugeIconCount: huge,
    emptyContainers,
  };
}

async function sweepPage(page, kind, id, resTag, errorsBucket) {
  const before = errorsBucket.length;
  const m = await page.evaluate(measurePage);
  const flags = [];
  if (m.overflowX > 4) flags.push(`H-SCROLL contentBody overflowX=${m.overflowX}`);
  if (m.bodyScrollW - m.bodyClientW > 4) flags.push(`H-SCROLL body overflow=${m.bodyScrollW - m.bodyClientW}`);
  if (m.brokenImgCount > 0) flags.push(`BROKEN-IMG x${m.brokenImgCount}: ${m.brokenImgs.join(" | ")}`);
  if (m.tinyIconCount > 0) flags.push(`TINY-ICONS x${m.tinyIconCount}`);
  if (m.hugeIconCount > 0) flags.push(`HUGE-ICONS x${m.hugeIconCount}`);
  if (m.emptyContainers.length > 0) flags.push(`EMPTY-CONTAINERS: ${m.emptyContainers.join(", ")}`);
  const newErrors = errorsBucket.slice(before);
  console.log(`[${kind}.${id} @ ${resTag}] ${flags.length ? "FLAGS: " + flags.join(" ;; ") : "ok"}${newErrors.length ? " | consoleErrors: " + newErrors.join(" | ") : ""}`);
  const fname = `sweep5-${kind}-${id}-${resTag}.png`;
  await page.screenshot({ path: join(OUT_DIR, fname), fullPage: false });
  return { flags, screenshot: fname };
}

async function run() {
  const { child, getOutput } = startDevServer();
  const report = [];
  try {
    const ok = await waitForServer(BASE_URL);
    if (!ok) { console.error("SERVER NOT UP:\n" + getOutput()); process.exit(1); }

    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: RES_WIDE, deviceScaleFactor: 1 });
    const errors = [];
    page.on("pageerror", (e) => errors.push(`pageerror[${page.url()}]: ${e.message}`));
    page.on("console", (m) => { if (m.type() === "error") errors.push(`console[${page.url()}]: ${m.text()}`); });

    // ───────────────────── PHASE 1: midgame — vollstaendiger Sweep ─────────────────────
    await page.goto(`${BASE_URL}/?fixture=midgame`, { waitUntil: "load" });
    await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
    await page.waitForTimeout(4000); // Toasts abklingen lassen

    for (const [kind, list] of [["topbar", TOPBAR_PAGES], ["sidebar", SIDEBAR_PAGES]]) {
      for (const [id] of list) {
        await page.setViewportSize(RES_WIDE);
        await clickRetry(page, page.locator(`[data-guide-id="${kind}.${id}"]`).first());
        await page.waitForTimeout(900);
        const wide = await sweepPage(page, kind, id, "1920x1080", errors);
        report.push({ kind, id, res: "1920x1080", ...wide });

        await page.setViewportSize(RES_NARROW);
        await page.waitForTimeout(600);
        const narrow = await sweepPage(page, kind, id, "1366x768", errors);
        report.push({ kind, id, res: "1366x768", ...narrow });
      }
    }

    // ───────────────────── MODAL-STICHPROBEN (midgame, 1920x1080) ─────────────────────
    await page.setViewportSize(RES_WIDE);
    await page.waitForTimeout(300);

    // Item-Tooltip gepinnt + Item-Wiki (?): Bank hat garantiert Items.
    await clickRetry(page, page.locator('[data-guide-id="topbar.bank"]').first());
    await page.waitForTimeout(900);
    try {
      await clickRetry(page, page.locator(".item-cell").first());
      await page.waitForTimeout(400);
      await page.screenshot({ path: join(OUT_DIR, "sweep5-modal-item-tooltip-pinned.png") });
      console.log("SHOT: sweep5-modal-item-tooltip-pinned.png");
      const wikiBtn = page.locator(".itip-wiki-btn").first();
      if (await wikiBtn.count() > 0) {
        await clickRetry(page, wikiBtn);
        await page.waitForTimeout(500);
        await page.screenshot({ path: join(OUT_DIR, "sweep5-modal-item-wiki.png") });
        console.log("SHOT: sweep5-modal-item-wiki.png");
        await page.keyboard.press("Escape");
        await page.waitForTimeout(300);
      } else {
        console.log("!! .itip-wiki-btn nicht gefunden auf gepinntem Tooltip");
      }
    } catch (e) { console.log("!! item tooltip/wiki modal step failed: " + e.message); }

    // Porträt-Galerie: Charakter-Seite, Zahnrad-Button oben links.
    await clickRetry(page, page.locator('[data-guide-id="topbar.character"]').first());
    await page.waitForTimeout(700);
    try {
      await clickRetry(page, page.locator(".cs-portrait-settings-btn").first());
      await page.waitForTimeout(500);
      await page.screenshot({ path: join(OUT_DIR, "sweep5-modal-portrait-gallery.png") });
      console.log("SHOT: sweep5-modal-portrait-gallery.png");
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);
    } catch (e) { console.log("!! portrait gallery modal step failed: " + e.message); }

    // Charakter-Seite: 2 Buttons am Porträt (heutige Aenderung) close-up.
    try {
      await page.locator(".cs-portrait-wrap").first().screenshot({ path: join(OUT_DIR, "sweep5-charpage-portrait-buttons.png") });
      console.log("SHOT: sweep5-charpage-portrait-buttons.png");
    } catch (e) { console.log("!! charpage portrait closeup failed: " + e.message); }

    // Rezept-Pin-Tracker: Skill-Seite (Cooking hat sicher Rezepte), .skillcard-pin klicken.
    await clickRetry(page, page.locator('[data-guide-id="sidebar.cooking"]').first());
    await page.waitForTimeout(900);
    try {
      const pinBtn = page.locator(".skillcard-pin").first();
      if (await pinBtn.count() > 0) {
        await clickRetry(page, pinBtn);
        await page.waitForTimeout(400);
        await page.screenshot({ path: join(OUT_DIR, "sweep5-modal-recipe-pin.png") });
        console.log("SHOT: sweep5-modal-recipe-pin.png");
      } else {
        console.log("!! .skillcard-pin nicht gefunden auf Cooking-Seite");
      }
    } catch (e) { console.log("!! recipe pin step failed: " + e.message); }

    // Autosave-Haekchen unten (Sidebar-Footer Save-Button).
    try {
      await page.locator(".sb-footer-save").first().click({ timeout: 4000 });
      await page.waitForTimeout(200);
      await page.locator(".sb-footer").first().screenshot({ path: join(OUT_DIR, "sweep5-modal-autosave-check.png") });
      console.log("SHOT: sweep5-modal-autosave-check.png");
    } catch (e) { console.log("!! autosave checkmark step failed: " + e.message); }

    // ───────────────────── PHASE 2: endgame — Stichprobe ─────────────────────
    await page.goto(`${BASE_URL}/?fixture=endgame`, { waitUntil: "load" });
    await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
    await page.waitForTimeout(4000);

    for (const [kind, id] of ENDGAME_SAMPLE) {
      await page.setViewportSize(RES_WIDE);
      await clickRetry(page, page.locator(`[data-guide-id="${kind}.${id}"]`).first());
      await page.waitForTimeout(900);
      const wide = await sweepPage(page, `endgame-${kind}`, id, "1920x1080", errors);
      report.push({ kind: `endgame-${kind}`, id, res: "1920x1080", ...wide });

      await page.setViewportSize(RES_NARROW);
      await page.waitForTimeout(600);
      const narrow = await sweepPage(page, `endgame-${kind}`, id, "1366x768", errors);
      report.push({ kind: `endgame-${kind}`, id, res: "1366x768", ...narrow });
    }

    console.log("\n===== SUMMARY =====");
    const flagged = report.filter((r) => r.flags && r.flags.length > 0);
    console.log(`${report.length} page-checks total, ${flagged.length} flagged.`);
    for (const f of flagged) {
      console.log(`FLAGGED: ${f.kind}.${f.id} @ ${f.res} -> ${f.flags.join(" ;; ")}`);
    }
    console.log(`\n${errors.length} total console/page errors across whole run.`);
    if (errors.length) console.log(errors.slice(0, 40).join("\n"));

    await browser.close();
  } finally {
    child.kill();
  }
}

run().catch((e) => { console.error(e); process.exit(1); });
