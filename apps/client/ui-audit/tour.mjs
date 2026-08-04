#!/usr/bin/env node
/**
 * UI-Audit screenshot tour. Starts a plain (non-Electron) Vite dev server for the renderer,
 * opens it in headless Chromium via Playwright, loads each fixture (?fixture=<name>), clicks
 * through every sidebar + topbar page (using the existing data-guide-id markers — see
 * navigation.ts/Sidebar.tsx/TopBar.tsx), and for each page:
 *   - saves a deterministic full-page screenshot to ui-audit/shots/<fixture>/<pageId>.png
 *   - runs a handful of cheap UI-consistency checks (raw i18n tokens, broken images, overflow,
 *     console errors, font-family drift, button-class census)
 * All findings are written to ui-audit/report.md.
 *
 * Run: pnpm --filter @hearthforge/client ui-audit   (see README.md for details/troubleshooting)
 */
import { spawn } from "node:child_process";
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const SHOTS_DIR = join(__dirname, "shots");
const REPORT_PATH = join(__dirname, "report.md");
const PORT = 5183;
const BASE_URL = `http://localhost:${PORT}`;
const FIXTURES = ["midgame", "endgame"];
const VIEWPORT = { width: 1920, height: 1080 };

// Fonts actually declared in styles/base.css (@font-face) plus the documented fallback chain
// (body { font-family: var(--font-head), "Segoe UI", system-ui, sans-serif }). Keep this in sync
// with base.css if the Ashen Iron type system changes.
const FONT_WHITELIST = new Set([
  "metamorphous",
  "cinzel",
  "marcellus sc",
  "grenze gotisch",
  "medievalsharp",
  "im fell english sc",
  "cormorant garamond",
  "segoe ui",
  "system-ui",
  "sans-serif",
  "serif",
  "inherit",
]);

const RAW_TOKEN_RE = /^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*){1,}$/;
const CITADEL_BUTTON_CLASS_RE = /ds-button|citadel|hf-btn/i;
// Sweep 5, Finding 5/7: the old check only looked at `[class*='fallback']` elements, which
// missed genuine emoji glyphs sitting in plain text nodes with no "fallback" class at all
// (e.g. BestiaryPage's inline "😡" enrage marker) — the report kept saying "0 emoji" while
// screenshots showed several. Restricted to the astral-plane pictograph blocks (U+1F300+,
// covers all real colour emoji: 😷💀🌱😡🪞 etc.) rather than the full \p{Extended_Pictographic}
// set, which would also match BMP dingbats the design system uses on purpose as icon glyphs
// (◆ ✦ ☠ ⚔ ♻ ✗ ★ …) and drown the report in false positives.
// Sweep 6, T9: + die BMP-Zeichen mit Default-EMOJI-Presentation (rendern als
// Farb-Emoji, z. B. U+26A1 Blitz, U+2B50 Stern) — die Text-Dingbats (Rauten,
// Schwerter, Totenkopf usw.) bleiben bewusst ausgenommen (gewollte Icon-Glyphen).
const EMOJI_TOKEN_RE =
  /[\u{1F1E6}-\u{1F1FF}\u{1F300}-\u{1FAFF}☔☕⚡⚽⚾⛄⛅⛪⛲⛳⛵⛺⛽✅✊✋✨❌❎❓-❕❗➕-➗➰➿⬛⬜⭐⭕]/u;
const OVERFLOW_THRESHOLD_PX = 12;
const MAX_FINDINGS_PER_KIND_PER_PAGE = 12;

// ─────────────────────────────────────────────────────────────────────────
// Dev server lifecycle
// ─────────────────────────────────────────────────────────────────────────

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
  child.on("error", (err) => {
    console.error("[tour] failed to spawn vite dev server:", err.message);
  });
  return { child, getOutput: () => out };
}

async function waitForServer(url, timeoutMs = 30_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────
// In-page check (runs inside the browser via page.evaluate)
// ─────────────────────────────────────────────────────────────────────────

/** Serialized into the page — keep this self-contained (no closures over Node-side values besides
 * the plain-data args passed in). */
function collectPageFindings({ fontWhitelist, rawTokenSource, overflowThreshold, emojiTokenSource }) {
  const rawTokenRe = new RegExp(rawTokenSource);
  const emojiRe = new RegExp(emojiTokenSource, "gu");
  const results = {
    rawTokens: [],
    brokenImages: [],
    emojiFallbacks: [],
    emojiTextNodes: [],
    overflow: [],
    fontDrift: [],
    buttons: { total: 0, citadel: 0, other: [] },
  };

  function selectorFor(el) {
    const tag = el.tagName.toLowerCase();
    const cls = typeof el.className === "string" && el.className.trim() ? `.${el.className.trim().split(/\s+/).slice(0, 2).join(".")}` : "";
    return `${tag}${cls}`;
  }

  // ── Raw i18n tokens + font-family drift: walk elements with direct text content. ──
  const seenFonts = new Set();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
  let node = walker.currentNode;
  while (node) {
    const el = node;
    let directText = "";
    for (const child of el.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) directText += child.textContent;
    }
    directText = directText.trim();
    if (directText && rawTokenRe.test(directText)) {
      results.rawTokens.push({ text: directText, selector: selectorFor(el) });
    }
    if (directText) {
      const fam = getComputedStyle(el).fontFamily || "";
      const first = fam.split(",")[0]?.trim().replace(/^["']|["']$/g, "").toLowerCase();
      if (first && !fontWhitelist.includes(first) && !seenFonts.has(first)) {
        seenFonts.add(first);
        results.fontDrift.push({ font: first, selector: selectorFor(el), sample: directText.slice(0, 40) });
      }
      // Emoji-in-text-node scan (Sweep 5, Finding 7): catches real emoji glyphs regardless of
      // className — the old [class*='fallback'] census below only caught the subset that
      // happened to carry a "fallback" class.
      emojiRe.lastIndex = 0;
      const emojiMatches = directText.match(emojiRe);
      if (emojiMatches) {
        results.emojiTextNodes.push({ emoji: emojiMatches.join(""), text: directText.slice(0, 60), selector: selectorFor(el) });
      }
    }
    node = walker.nextNode();
  }

  // ── Broken images + emoji-fallback census. ──
  for (const img of document.querySelectorAll("img")) {
    if (img.complete && img.naturalWidth === 0 && img.src) {
      results.brokenImages.push({ src: img.src, selector: selectorFor(img), alt: img.alt || "" });
    }
  }
  for (const el of document.querySelectorAll("[class*='fallback']")) {
    const t = el.textContent?.trim();
    if (t) results.emojiFallbacks.push({ text: t, selector: selectorFor(el) });
  }

  // ── Overflow (clipped text). Classify by computed style so graceful ellipsis truncation
  // (deliberate, e.g. `.topbar-label`) doesn't drown out real layout spillover in the report:
  //   - "ellipsis": overflow hidden/clip + text-overflow ellipsis → by design, informational only.
  //   - "hard-clip": overflow hidden/clip, no ellipsis → text silently cut off, worth a look.
  //   - "spillover": overflow visible → content visibly pokes out of its box, likely a real bug.
  const allEls = document.body.querySelectorAll("*");
  for (const el of allEls) {
    const sw = el.scrollWidth;
    const cw = el.clientWidth;
    if (cw > 0 && sw - cw > overflowThreshold) {
      const cs = getComputedStyle(el);
      const clips = cs.overflowX === "hidden" || cs.overflowX === "clip" || cs.overflow === "hidden" || cs.overflow === "clip";
      const kind = !clips ? "spillover" : cs.textOverflow === "ellipsis" ? "ellipsis" : "hard-clip";
      results.overflow.push({ selector: selectorFor(el), scrollWidth: sw, clientWidth: cw, kind });
    }
  }

  // ── Button class census. ──
  const buttonClassRe = /ds-button|citadel|hf-btn/i;
  for (const btn of document.querySelectorAll("button")) {
    results.buttons.total++;
    const cls = btn.className || "";
    if (buttonClassRe.test(cls)) {
      results.buttons.citadel++;
    } else {
      results.buttons.other.push(cls || "(no class)");
    }
  }

  return results;
}

// ─────────────────────────────────────────────────────────────────────────
// Tour
// ─────────────────────────────────────────────────────────────────────────

function dedupeCap(list, cap) {
  const seen = new Set();
  const out = [];
  for (const item of list) {
    const key = JSON.stringify(item);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
    if (out.length >= cap) break;
  }
  return out;
}

async function runTourForFixture(browser, fixtureName, findings) {
  const shotsDir = join(SHOTS_DIR, fixtureName);
  mkdirSync(shotsDir, { recursive: true });

  const page = await browser.newPage({ viewport: VIEWPORT });
  let currentPageId = "(load)";
  page.on("console", (msg) => {
    const type = msg.type();
    if (type === "error" || type === "warning") {
      findings.console.push({ fixture: fixtureName, page: currentPageId, type, text: msg.text() });
    }
  });
  page.on("pageerror", (err) => {
    findings.console.push({ fixture: fixtureName, page: currentPageId, type: "pageerror", text: err.message });
  });

  await page.goto(`${BASE_URL}/?fixture=${fixtureName}`, { waitUntil: "load" });
  const ready = await page
    .waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15_000 })
    .then(() => true)
    .catch(() => false);
  if (!ready) {
    findings.console.push({
      fixture: fixtureName,
      page: "(load)",
      type: "fatal",
      text: "sidebar never appeared — fixture failed to load (menu screen stuck?)",
    });
    await page.close();
    return;
  }
  // Let the initial achievement-unlock toasts (TOAST_MS=4000 in components/Toasts.tsx) clear —
  // a fixture "arrives" with achievements already unlocked, which the toast diff treats as
  // fresh unlocks on first render. Not a bug, just fixture-load noise we don't want in every shot.
  await page.waitForTimeout(4200);

  const targets = await page.$$eval('[data-guide-id^="sidebar."], [data-guide-id^="topbar."]', (els) =>
    els.map((e) => e.getAttribute("data-guide-id")),
  );
  const uniqueTargets = [...new Set(targets)];
  console.log(`[tour] ${fixtureName}: ${uniqueTargets.length} nav targets`);

  for (const guideId of uniqueTargets) {
    const pageId = guideId.split(".").slice(1).join(".");
    currentPageId = pageId;
    const btn = page.locator(`[data-guide-id="${guideId}"]`).first();
    try {
      await btn.click({ timeout: 5000 });
    } catch (err) {
      findings.console.push({ fixture: fixtureName, page: pageId, type: "fatal", text: `click failed: ${err.message}` });
      continue;
    }
    await page.waitForLoadState("networkidle", { timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(350);

    const shotPath = join(shotsDir, `${pageId}.png`);
    await page.screenshot({ path: shotPath, fullPage: true }).catch((err) => {
      findings.console.push({ fixture: fixtureName, page: pageId, type: "fatal", text: `screenshot failed: ${err.message}` });
    });

    let result;
    try {
      result = await page.evaluate(collectPageFindings, {
        fontWhitelist: [...FONT_WHITELIST],
        rawTokenSource: RAW_TOKEN_RE.source,
        overflowThreshold: OVERFLOW_THRESHOLD_PX,
        emojiTokenSource: EMOJI_TOKEN_RE.source,
      });
    } catch (err) {
      findings.console.push({ fixture: fixtureName, page: pageId, type: "fatal", text: `evaluate failed: ${err.message}` });
      continue;
    }

    for (const r of dedupeCap(result.rawTokens, MAX_FINDINGS_PER_KIND_PER_PAGE)) {
      findings.rawTokens.push({ fixture: fixtureName, page: pageId, ...r });
    }
    for (const r of dedupeCap(result.brokenImages, MAX_FINDINGS_PER_KIND_PER_PAGE)) {
      findings.brokenImages.push({ fixture: fixtureName, page: pageId, ...r });
    }
    for (const r of dedupeCap(result.overflow, MAX_FINDINGS_PER_KIND_PER_PAGE)) {
      findings.overflow.push({ fixture: fixtureName, page: pageId, ...r });
    }
    for (const r of dedupeCap(result.fontDrift, MAX_FINDINGS_PER_KIND_PER_PAGE)) {
      findings.fontDrift.push({ fixture: fixtureName, page: pageId, ...r });
    }
    findings.emojiFallbackCount += result.emojiFallbacks.length;
    for (const r of dedupeCap(result.emojiTextNodes, MAX_FINDINGS_PER_KIND_PER_PAGE)) {
      findings.emojiTextNodes.push({ fixture: fixtureName, page: pageId, ...r });
    }
    findings.buttonCensus.push({
      fixture: fixtureName,
      page: pageId,
      total: result.buttons.total,
      citadel: result.buttons.citadel,
      other: result.buttons.total - result.buttons.citadel,
    });
    findings.pagesVisited.push({ fixture: fixtureName, page: pageId, shot: `shots/${fixtureName}/${pageId}.png` });
  }

  await page.close();
}

function renderReport(findings, meta) {
  const lines = [];
  lines.push("# UI-Audit Report");
  lines.push("");
  lines.push(`Generated: ${meta.generatedAt}`);
  lines.push(`Fixtures: ${FIXTURES.join(", ")}`);
  lines.push(`Pages visited per fixture: ${meta.pagesPerFixture}`);
  lines.push(`Total screenshots: ${findings.pagesVisited.length}`);
  lines.push("");
  lines.push("See README.md for how to read this report and where the screenshots live.");
  lines.push("");

  lines.push("## Summary");
  lines.push("");
  lines.push(`- Raw i18n tokens found: ${findings.rawTokens.length}`);
  lines.push(`- Broken images (naturalWidth 0): ${findings.brokenImages.length}`);
  lines.push(`- Emoji-fallback icons seen via [class*='fallback'] (informational, narrower — see below): ${findings.emojiFallbackCount}`);
  lines.push(`- Emoji found in text nodes (Unicode scan, any className): ${findings.emojiTextNodes.length}`);
  const overflowByKind = { ellipsis: 0, "hard-clip": 0, spillover: 0 };
  for (const o of findings.overflow) overflowByKind[o.kind] = (overflowByKind[o.kind] ?? 0) + 1;
  lines.push(
    `- Overflow/clipped-text elements: ${findings.overflow.length} ` +
      `(ellipsis by design: ${overflowByKind.ellipsis}, hard-clip: ${overflowByKind["hard-clip"]}, ` +
      `spillover — likely real bugs: ${overflowByKind.spillover})`,
  );
  lines.push(`- Off-whitelist font-families: ${findings.fontDrift.length}`);
  lines.push(`- Console errors/warnings/pageerrors: ${findings.console.length}`);
  lines.push("");

  function table(title, rows, cols) {
    lines.push(`## ${title}`);
    lines.push("");
    if (rows.length === 0) {
      lines.push("None found.");
      lines.push("");
      return;
    }
    lines.push(`| ${cols.join(" | ")} |`);
    lines.push(`| ${cols.map(() => "---").join(" | ")} |`);
    for (const row of rows) {
      lines.push(`| ${cols.map((c) => String(row[c] ?? "").replace(/\|/g, "\\|").slice(0, 200)).join(" | ")} |`);
    }
    lines.push("");
  }

  table("Raw i18n tokens", findings.rawTokens, ["fixture", "page", "text", "selector"]);
  table("Broken images", findings.brokenImages, ["fixture", "page", "selector", "src", "alt"]);
  table(
    "Emoji in text nodes (Sweep 5, Finding 7 — Unicode astral-plane pictograph scan, not just [class*='fallback'])",
    findings.emojiTextNodes,
    ["fixture", "page", "emoji", "text", "selector"],
  );
  const spilloverOnly = findings.overflow.filter((o) => o.kind === "spillover");
  const hardClipOnly = findings.overflow.filter((o) => o.kind === "hard-clip");
  const ellipsisOnly = findings.overflow.filter((o) => o.kind === "ellipsis");
  table(
    "Overflow — spillover (overflow:visible, content likely pokes out of its box — investigate first)",
    spilloverOnly,
    ["fixture", "page", "selector", "scrollWidth", "clientWidth"],
  );
  table(
    "Overflow — hard-clip (text silently cut off, no ellipsis — worth a look)",
    hardClipOnly,
    ["fixture", "page", "selector", "scrollWidth", "clientWidth"],
  );
  table(
    "Overflow — ellipsis (graceful truncation by design, informational only)",
    ellipsisOnly,
    ["fixture", "page", "selector", "scrollWidth", "clientWidth"],
  );
  table("Font-family drift (not in styles/base.css whitelist)", findings.fontDrift, ["fixture", "page", "font", "selector", "sample"]);
  table("Console errors / warnings / pageerrors", findings.console, ["fixture", "page", "type", "text"]);

  lines.push("## Button class census (informational — Citadel design system rollout is gradual)");
  lines.push("");
  lines.push("| fixture | page | total buttons | citadel-class | other |");
  lines.push("| --- | --- | --- | --- | --- |");
  for (const row of findings.buttonCensus) {
    lines.push(`| ${row.fixture} | ${row.page} | ${row.total} | ${row.citadel} | ${row.other} |`);
  }
  lines.push("");

  lines.push("## Screenshots");
  lines.push("");
  for (const fixture of FIXTURES) {
    lines.push(`### ${fixture}`);
    lines.push("");
    for (const p of findings.pagesVisited.filter((p) => p.fixture === fixture)) {
      lines.push(`- ${p.page}: \`${p.shot}\``);
    }
    lines.push("");
  }

  return lines.join("\n");
}

async function main() {
  console.log(`[tour] starting dev server on port ${PORT}...`);
  const server = startDevServer();
  const up = await waitForServer(BASE_URL, 30_000);
  if (!up) {
    console.error("[tour] dev server did not come up in time. Output so far:\n" + server.getOutput());
    server.child.kill();
    process.exitCode = 1;
    return;
  }
  console.log("[tour] dev server is up.");

  // Fresh shots dir per run — deterministic filenames, no stale screenshots from a previous tour.
  rmSync(SHOTS_DIR, { recursive: true, force: true });
  mkdirSync(SHOTS_DIR, { recursive: true });

  const findings = {
    rawTokens: [],
    brokenImages: [],
    emojiFallbackCount: 0,
    emojiTextNodes: [],
    overflow: [],
    fontDrift: [],
    console: [],
    buttonCensus: [],
    pagesVisited: [],
  };

  const browser = await chromium.launch();
  try {
    for (const fixtureName of FIXTURES) {
      await runTourForFixture(browser, fixtureName, findings);
    }
  } finally {
    await browser.close();
    server.child.kill();
  }

  const pagesPerFixture = findings.pagesVisited.length / (FIXTURES.length || 1);
  const report = renderReport(findings, { generatedAt: new Date().toISOString(), pagesPerFixture });
  writeFileSync(REPORT_PATH, report, "utf8");

  console.log(`[tour] done. ${findings.pagesVisited.length} screenshots written to ${SHOTS_DIR}`);
  console.log(`[tour] report: ${REPORT_PATH}`);
  console.log(
    `[tour] findings: rawTokens=${findings.rawTokens.length} brokenImages=${findings.brokenImages.length} ` +
      `overflow=${findings.overflow.length} fontDrift=${findings.fontDrift.length} console=${findings.console.length} ` +
      `emojiTextNodes=${findings.emojiTextNodes.length}`,
  );
}

main().catch((err) => {
  console.error("[tour] fatal:", err);
  process.exitCode = 1;
});
