#!/usr/bin/env node
/**
 * Self-check for the Bank/Inventory search+filter+sort feature (Chef-Auftrag 2026-07-09).
 * Screenshots BankPage (search+category chip active, sort=value-desc) and CharacterPage
 * inventory (search active, dim effect visible) against the "endgame" fixture (full bank/
 * inventory — 1034 items in the game, need to actually see the navigation working under load).
 * Modeled on enchant-shot-275.mjs. Port 5212 (dedicated to this script).
 *
 * Run: node invfilter-shot-309.mjs
 * Output: PNGs written to OUT_DIR (scratchpad).
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5212;
const BASE_URL = `http://localhost:${PORT}`;
const OUT_DIR = "C:\\Users\\MSchu\\AppData\\Local\\Temp\\claude\\G--GameDev\\553d2095-3a73-4795-9782-0fe746a25f13\\scratchpad";
const FIXTURE = "endgame";

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

async function shot(page, out, w, h) {
  await page.setViewportSize({ width: w, height: h });
  await page.waitForTimeout(300);
  await page.screenshot({ path: out });
  console.log("SHOT SAVED: " + out + " @ " + w + "x" + h);
}

const { child, getOutput } = startDevServer();
try {
  const ok = await waitForServer(BASE_URL);
  if (!ok) { console.error("SERVER NOT UP:\n" + getOutput()); process.exit(1); }
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });

  await page.goto(`${BASE_URL}/?fixture=${FIXTURE}`, { waitUntil: "load" });
  await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
  await page.waitForTimeout(4200); // let achievement-unlock toasts clear (see ui-audit README)

  // ── BankPage ──────────────────────────────────────────────────────────────
  await page.click('[data-guide-id="topbar.bank"]');
  await page.waitForTimeout(500);
  await shot(page, join(OUT_DIR, "invfilter-bank-baseline.png"), 1920, 1080);

  // Count chip badges before touching anything (sanity: category counts sum to "all").
  const chipCounts = await page.locator(".invf-chip").evaluateAll((els) =>
    els.map((el) => el.querySelector(".invf-chip-label")?.textContent + ":" + (el.querySelector(".invf-chip-count")?.textContent ?? "-")),
  );
  console.log("BANK chip counts:", JSON.stringify(chipCounts));

  // Category filter: click "Materials" chip (6th non-all chip).
  await page.locator(".invf-chiprow .invf-chip").nth(6).click();
  await page.waitForTimeout(200);
  const materialsLabel = await page.locator(".invf-chiprow .invf-chip").nth(6).locator(".invf-chip-label").textContent();
  console.log("Clicked category chip:", materialsLabel);

  // Search: type something that should match within materials (bar/ore/ingot-ish — use "bar").
  await page.locator(".invf-search").first().fill("bar");
  await page.waitForTimeout(250);
  await shot(page, join(OUT_DIR, "invfilter-bank-search-materials.png"), 1920, 1080);

  const bankResultRows = await page.locator(".bank-columns .bank-grid .inv-slot.filled").count();
  console.log("BANK: filled cells visible after 'bar' + materials filter:", bankResultRows);

  // Clear search, switch to sort=value desc, keep category filter for a fuller shot too.
  await page.locator(".invf-search").first().fill("");
  await page.locator(".invf-chiprow .invf-chip").first().click(); // back to "All"
  await page.waitForTimeout(150);
  await page.locator(".cs-sort-select").selectOption("value");
  await page.waitForTimeout(250);
  await shot(page, join(OUT_DIR, "invfilter-bank-sort-value.png"), 1920, 1080);

  // Edge case: search for something that matches nothing.
  await page.locator(".invf-search").first().fill("zzzznomatch");
  await page.waitForTimeout(250);
  await shot(page, join(OUT_DIR, "invfilter-bank-no-matches.png"), 1920, 1080);
  const noMatchNotes = await page.locator(".invf-empty-note").count();
  console.log("BANK: 'no matches' notes visible:", noMatchNotes);
  await page.locator(".invf-search").first().fill("");

  // "Menge" (qty) sort mode — new option added for this feature, verify label + it actually
  // reorders by quantity descending.
  const qtyOptionLabel = await page.locator('.cs-sort-select option[value="qty"]').textContent();
  console.log("BANK: qty sort option label:", qtyOptionLabel);
  await page.locator(".cs-sort-select").selectOption("qty");
  await page.waitForTimeout(250);
  const qtyOrder = await page.locator(".bank-columns .shop-panel").first()
    .locator(".inv-slot.filled .item-cell-qty").allTextContents();
  console.log("BANK: visible quantities after 'Menge' sort (should be descending):", JSON.stringify(qtyOrder.slice(0, 8)));
  await shot(page, join(OUT_DIR, "invfilter-bank-sort-qty.png"), 1920, 1080);

  // Persistence check: reload the page (still same fixture query) and confirm the category chip
  // + sort mode survived via localStorage (gr.bankFilterCat / gr.bankSort) — search text should
  // NOT persist (reset to empty), by design.
  await page.locator(".invf-chiprow .invf-chip").nth(6).click(); // Materials again
  await page.waitForTimeout(150);
  await page.reload({ waitUntil: "load" });
  await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
  await page.waitForTimeout(2500);
  await page.click('[data-guide-id="topbar.bank"]');
  await page.waitForTimeout(400);
  const persistedSort = await page.locator(".cs-sort-select").inputValue();
  const persistedActiveChip = await page.locator(".invf-chiprow .invf-chip.active .invf-chip-label").textContent();
  const persistedSearch = await page.locator(".invf-search").first().inputValue();
  console.log(`PERSISTENCE after reload: sort="${persistedSort}" (expect qty), activeChip="${persistedActiveChip}" (expect Materialien), search="${persistedSearch}" (expect empty)`);
  await shot(page, join(OUT_DIR, "invfilter-bank-persisted-after-reload.png"), 1920, 1080);
  // Reset chip back to "All" for the rest of the run (cosmetic, not required).
  await page.locator(".invf-chiprow .invf-chip").first().click();

  // Edge case: search for an enchanted-instance suffix/prefix word. Grab a real instance display
  // name from the DOM first (VariantContainerCell renders qty/star badges, not always the full
  // name) — instead, just try a common affix word and report the hit count; also directly probe
  // via a known suffix search term used across the game ("of the").
  await page.locator(".invf-search").first().fill("of the");
  await page.waitForTimeout(250);
  const suffixHits = await page.locator(".bank-columns .bank-grid .inv-slot.filled").count();
  console.log("BANK: cells matching search 'of the' (suffix-name probe):", suffixHits);
  await shot(page, join(OUT_DIR, "invfilter-bank-suffix-search.png"), 1920, 1080);
  await page.locator(".invf-search").first().fill("");
  await page.waitForTimeout(150);

  // ── CharacterPage inventory ──────────────────────────────────────────────
  await page.click('[data-guide-id="topbar.character"]');
  await page.waitForTimeout(500);
  await shot(page, join(OUT_DIR, "invfilter-char-baseline.png"), 1920, 1080);

  const invChipCounts = await page.locator(".cs-inv-filterrow .invf-chip").evaluateAll((els) =>
    els.map((el) => el.querySelector(".invf-chip-label")?.textContent + ":" + (el.querySelector(".invf-chip-count")?.textContent ?? "-")),
  );
  console.log("CHAR inventory chip counts:", JSON.stringify(invChipCounts));

  await page.locator(".cs-inv-filterrow .invf-search").fill("sword");
  await page.waitForTimeout(300);
  await shot(page, join(OUT_DIR, "invfilter-char-search-dim.png"), 1920, 1080);

  const dimCount = await page.locator(".cs-inv-grid .invf-dim").count();
  const totalFilled = await page.locator(".cs-inv-grid .inv-slot.filled").count();
  console.log(`CHAR inventory: ${dimCount} dimmed / ${totalFilled} filled slots after search "sword"`);

  // Confirm slot order in state didn't change: same originalIdx keys should still be present after
  // toggling the filter off (structural check — we compare filled-slot count only, since exact
  // per-index diffing needs app internals; the dim class is purely additive per the CSS above).
  await page.locator(".cs-inv-filterrow .invf-search").fill("");
  await page.waitForTimeout(200);
  const totalFilledAfterClear = await page.locator(".cs-inv-grid .inv-slot.filled").count();
  console.log(`CHAR inventory: filled slots after clearing search: ${totalFilledAfterClear} (should equal ${totalFilled})`);

  await page.locator(".cs-inv-filterrow .invf-chip").nth(1).click(); // "Weapons" chip
  await page.waitForTimeout(250);
  const weaponsChipLabel = await page.locator(".cs-inv-filterrow .invf-chip").nth(1).locator(".invf-chip-label").textContent();
  console.log("CHAR: clicked category chip:", weaponsChipLabel);
  await shot(page, join(OUT_DIR, "invfilter-char-category-weapons.png"), 1920, 1080);
  const dimCount2 = await page.locator(".cs-inv-grid .invf-dim").count();
  console.log(`CHAR inventory: ${dimCount2} dimmed slots with Weapons-only filter`);

  console.log(errors.length ? "PAGE ERRORS:\n" + errors.slice(0, 30).join("\n") : "no page errors");
  await browser.close();
} finally {
  child.kill();
}
