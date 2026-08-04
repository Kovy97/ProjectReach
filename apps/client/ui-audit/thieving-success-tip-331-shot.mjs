#!/usr/bin/env node
/**
 * Task #331 verification: UX-Transparenz-Fix nach Chef-/Spieler-Report "Beggar zeigt 50 % Gold
 * Purse, aber nur 3 Beutel nach 20 Versuchen" — Thieving hat einen vorgelagerten ERFOLGSWURF, den
 * die Karten bisher nirgends bezifferten. Fix: die Erfolgschance-Kachel bekommt einen
 * Zusammensetzungs-Tooltip (Basis + Level + Risiko-Modus + Cap, s. util/actionRate.ts
 * `successBreakdown`) und der Loot-Bereich heißt jetzt "Loot (on success)" statt nur "Loot".
 *
 * Zwei Screenshots der Pickpocket-Beggar-Karte (Thieving-Seite, midgame-Fixture, EN-Locale):
 * 1) Ruhezustand — Erfolgschance-Kachel + "Loot (on success)"-Label sichtbar (kein Hover nötig,
 *    die Kern-Aussage des Tasks ist schon ohne Interaktion lesbar).
 * 2) Hover auf der Erfolgschance-Kachel — CitadelTip-Portal mit der Zusammensetzung offen.
 *
 * Modeled on ambient-bloom-verify-317.mjs (Dev-Server-Start + Fixture-Navigation-Pattern).
 * Port 5331 (Task-Nummer, kollisionsfrei zu anderen laufenden Sim-Skripten).
 *
 * Run: node thieving-success-tip-331-shot.mjs   (from apps/client/)
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5331;
const BASE_URL = `http://localhost:${PORT}`;
const VIEWPORT = { width: 1600, height: 1000 };
const OUT_DIR = "C:\\Users\\MSchu\\AppData\\Local\\Temp\\claude\\G--GameDev\\553d2095-3a73-4795-9782-0fe746a25f13\\scratchpad";

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

async function main() {
  console.log(`[verify] starting dev server on port ${PORT}...`);
  const server = startDevServer();
  const up = await waitForServer(BASE_URL);
  if (!up) { console.error("DEV SERVER NOT UP:\n" + server.getOutput()); server.child.kill(); process.exitCode = 1; return; }

  const browser = await chromium.launch();
  try {
    // EN + DE (die zwei compile-enforced Pflichtsprachen, s. translations.ts) — DE-Lauf ist der
    // Sichtcheck, dass die Umlaute/Längen der neu übersetzten Strings nicht überlaufen.
    for (const locale of ["en", "de"]) {
      const page = await browser.newPage({ viewport: VIEWPORT });
      const errors = [];
      page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
      page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });

      await page.addInitScript((l) => localStorage.setItem("hearthforge:locale", l), locale);

      await page.goto(`${BASE_URL}/?fixture=midgame`, { waitUntil: "load" });
      await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
      await page.waitForTimeout(4200); // Achievement-Toasts beim Fixture-Load abklingen lassen (s. README Gotchas)

      await page.locator('[data-guide-id="sidebar.thieving"]').click();
      await page.waitForTimeout(600);
      // Aktionen sind in Kategorien ("Steal"/"Fence" bzw. DE "Stehlen"/"Hehlerei") eingeklappt —
      // die erste (Steal) öffnen, um die Beggar-Karte sichtbar zu machen (sprachunabhängig per
      // Position statt Text, da der Kategorie-Name je Locale wechselt).
      await page.locator(".category-header, .skill-category-header, [class*='category']").first().click();
      await page.waitForSelector(".skillcard", { timeout: 10000 });
      await page.waitForTimeout(500);

      const card = page.locator(".skillcard").first();
      await card.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);

      const successValue = await card.locator(".skillcard-tile.acc b, .skillcard-tile b.acc").first().innerText();
      const lootLabel = await card.locator(".skillcard-loot").first().innerText();
      console.log(`[verify/${locale}] success tile value: "${successValue}"`);
      console.log(`[verify/${locale}] loot label: "${lootLabel.split("\n")[0]}"`);

      const restPath = join(OUT_DIR, `thieving-331-beggar-rest-${locale}.png`);
      await card.screenshot({ path: restPath });
      console.log(`[verify/${locale}] wrote ${restPath}`);

      // Hover auf die Erfolgschance-Kachel (1. Kachel im Grid) -> CitadelTip-Portal öffnet sich
      // (document.body, fixed position) -> Vollbild-Screenshot statt Karten-Screenshot.
      await card.locator(".skillcard-tile").first().hover();
      await page.waitForTimeout(300);
      const tipVisible = await page.locator(".ct-tip").count();
      const tipText = tipVisible > 0 ? await page.locator(".ct-tip").first().innerText() : "(kein .ct-tip gefunden)";
      console.log(`[verify/${locale}] .ct-tip count: ${tipVisible}`);
      console.log(`[verify/${locale}] tooltip text:\n${tipText}`);
      const hoverPath = join(OUT_DIR, `thieving-331-beggar-hover-${locale}.png`);
      await page.screenshot({ path: hoverPath });
      console.log(`[verify/${locale}] wrote ${hoverPath}`);

      // Loot-Label-Tooltip separat (effektive Chance pro Versuch) — zweiter Hover, eigenes Bild.
      await page.mouse.move(5, 5);
      await page.waitForTimeout(200);
      await card.locator(".skillcard-loot > span").first().hover();
      await page.waitForTimeout(300);
      const lootTipText = (await page.locator(".ct-tip").count()) > 0 ? await page.locator(".ct-tip").first().innerText() : "(kein .ct-tip gefunden)";
      console.log(`[verify/${locale}] loot tooltip text:\n${lootTipText}`);
      const lootHoverPath = join(OUT_DIR, `thieving-331-beggar-loot-hover-${locale}.png`);
      await page.screenshot({ path: lootHoverPath });
      console.log(`[verify/${locale}] wrote ${lootHoverPath}`);

      console.log(errors.length ? `[${locale}] ${errors.length} page errors:\n` + errors.slice(0, 8).join("\n") : `[${locale}] no page errors`);
      await page.close();
    }
  } finally {
    await browser.close();
    server.child.kill();
  }
  console.log("\n[verify] done.");
}

main().catch((err) => {
  console.error("[verify] fatal:", err);
  process.exitCode = 1;
});
