#!/usr/bin/env node
/**
 * Task #350 (Chef-Fund "Über Wiki-Links können wir in Gebiete rein, wo wir noch nicht rein
 * sollten"): verifiziert am gerenderten Item-Wiki-Modal, dass eine Monster-Quelle-Zeile einer
 * noch STORY-GESPERRTEN Zone nicht mehr klickbar ist (gedimmt + Schloss-Icon + Tooltip, kein
 * Sprung), während dieselbe Zeile für eine bereits FREIGESCHALTETE Zone weiterhin normal
 * funktioniert (Regression). Muster: wiki-audit-shot-309.mjs (headless Vite+Playwright,
 * In-Memory-Fixture-Patch via page.route — die zwei Testitems landen in Inventar-Slots 0/1).
 *
 * `midgame.json` eignet sich unverändert als "früher Story-Stand" fürs Zonen-Gate: die Fixture
 * setzt zwar Kampfstufe/Ausrüstung hoch, rührt aber `state.quests`/`legacyZoneGrants` nie an —
 * beide bleiben leer (verifiziert vor dem Schreiben dieses Skripts), also ist JEDE `requiresQuest`-
 * Zone (u.a. "borderlands", chronicle_03) im Ist-Zustand gesperrt, "pastures" (keine Gate-Quest)
 * bleibt offen. Testpaar:
 *   - goblin_ear  (Quelle u.a. goblin_rogue, zone "borderlands", GESPERRT) → muss gedimmt/no-op sein.
 *   - feather     (Quelle u.a. chicken, zone "pastures", OFFEN)            → muss normal springen.
 *
 * Run: node ui-audit/wikigate-shot-350.mjs   (from apps/client/)
 */
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const SHOTS_DIR = join(__dirname, "shots-350");
const PORT = 5240;
const BASE_URL = `http://localhost:${PORT}`;

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

async function waitForServer(url, timeoutMs = 30_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

async function main() {
  mkdirSync(SHOTS_DIR, { recursive: true });
  console.log("[wikigate350] starting dev server on port " + PORT + "...");
  const server = startDevServer();
  if (!(await waitForServer(BASE_URL, 30_000))) {
    console.error("[wikigate350] dev server did not come up:\n" + server.getOutput());
    server.child.kill();
    process.exitCode = 1;
    return;
  }

  const fixtureRaw = readFileSync(join(CLIENT_DIR, "src/renderer/public/ui-audit-fixtures/midgame.json"), "utf-8");
  const fixture = JSON.parse(fixtureRaw);
  // Zonen-Gate-Fundament der Fixture defensiv bestätigen (falls gen-fixtures.mjs das je ändert,
  // soll dieses Skript LAUT scheitern statt still ein falsches Ergebnis zu melden).
  const q = fixture.state.quests;
  if (q.completed.length !== 0 || q.claimed.length !== 0 || Object.keys(fixture.state.legacyZoneGrants ?? {}).length !== 0) {
    console.error("[wikigate350] Annahme verletzt: midgame.json hat bereits Quest-Fortschritt/Zonen-Grants — 'borderlands' wäre nicht mehr gesperrt. Skript-Fixture-Wahl prüfen.");
    server.child.kill();
    process.exitCode = 1;
    return;
  }
  fixture.state.inventory.slots[0] = { itemId: "goblin_ear", qty: 1 };
  fixture.state.inventory.slots[1] = { itemId: "feather", qty: 1 };

  const browser = await chromium.launch();
  let failed = false;
  try {
    const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
    page.on("pageerror", (err) => console.error("[wikigate350] pageerror:", err.message));
    await page.route("**/ui-audit-fixtures/midgame.json", (route) =>
      route.fulfill({ contentType: "application/json", body: JSON.stringify(fixture) }),
    );

    await page.goto(`${BASE_URL}/?fixture=midgame`, { waitUntil: "load" });
    await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15_000 });
    await page.waitForTimeout(4200); // Achievement-Unlock-Toasts der Fixture abklingen lassen (s. README Gotchas)
    await page.locator('[data-guide-id="topbar.character"]').first().click();
    await page.waitForTimeout(400);

    // ── Fall 1: goblin_ear (Quelle: goblin_rogue, Zone "borderlands", GESPERRT) ──────────────
    await page.locator(".cs-inv-grid .cs-inv-slot-wrap").nth(0).locator(".item-cell").first().click();
    await page.waitForTimeout(300);
    await page.locator(".itip-wiki-btn").first().click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(SHOTS_DIR, "1-goblin_ear-wiki-locked.png"), fullPage: true });

    const lockedRow = page.locator(".iwk-section").nth(0).locator(".iwk-row-locked");
    const lockedCount = await lockedRow.count();
    const clickableMonsterRows = await page.locator(".iwk-section").nth(0).locator(".iwk-row-clickable").count();
    const lockedTitle = lockedCount > 0 ? await lockedRow.first().getAttribute("title") : null;
    console.log(`[wikigate350] goblin_ear: .iwk-row-locked=${lockedCount}, .iwk-row-clickable=${clickableMonsterRows}, title="${lockedTitle}"`);
    if (lockedCount === 0) {
      console.error("[wikigate350] FAIL: keine gesperrte Zeile gefunden — Gate fehlt oder Fixture-Annahme falsch.");
      failed = true;
    }
    if (!lockedTitle || !/chronicle_03|Aschechronik|chronicle/i.test(lockedTitle) && lockedTitle === null) {
      console.error("[wikigate350] FAIL: gesperrte Zeile hat keinen Gate-Tooltip.");
      failed = true;
    }

    // Klick auf die gesperrte Zeile darf NICHT navigieren (Modal bleibt offen, kein Kampf-Tab-Wechsel).
    if (lockedCount > 0) await lockedRow.first().click({ force: true });
    await page.waitForTimeout(400);
    const stillOnCharacter = await page.locator('[data-guide-id="topbar.character"].active').count();
    // "combat" sitzt in der Sidebar, nicht in der TopBar (navigation.ts — kein `placement: "topbar"`
    // auf dem combat-Eintrag), daher `sidebar.combat` statt `topbar.combat`.
    const jumpedToCombat = await page.locator('[data-guide-id="sidebar.combat"].active').count();
    const modalStillOpen = await page.locator(".iwk-modal").count();
    console.log(`[wikigate350] nach Klick auf gesperrte Zeile: stillOnCharacter=${stillOnCharacter}, jumpedToCombat=${jumpedToCombat}, modalStillOpen=${modalStillOpen}`);
    if (jumpedToCombat > 0 || stillOnCharacter === 0 || modalStillOpen === 0) {
      console.error("[wikigate350] FAIL: Klick auf gesperrte Zeile hat navigiert (Gate umgangen)!");
      failed = true;
    }
    await page.screenshot({ path: join(SHOTS_DIR, "2-goblin_ear-after-click-still-character.png"), fullPage: true });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);

    // ── Fall 2: feather (Quelle u.a. chicken, Zone "pastures", OFFEN) — Regression ───────────
    await page.locator(".cs-inv-grid .cs-inv-slot-wrap").nth(1).locator(".item-cell").first().click();
    await page.waitForTimeout(300);
    await page.locator(".itip-wiki-btn").first().click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(SHOTS_DIR, "3-feather-wiki-unlocked.png"), fullPage: true });

    const featherClickableRows = page.locator(".iwk-section").nth(0).locator(".iwk-row-clickable");
    const featherRowCount = await featherClickableRows.count();
    console.log(`[wikigate350] feather: .iwk-row-clickable=${featherRowCount}`);
    // Die erste klickbare Zeile im Sources-Abschnitt ist die Monster-Quelle (chicken/pastures) —
    // Aktionen/Rezepte tauchen hier nicht auf (feather hat keine "used in crafting"-Quelle-Zeile
    // dieser Art), Farming-Quelle wäre nicht klickbar (kind "crop", separater Zweig).
    if (featherRowCount === 0) {
      console.error("[wikigate350] FAIL: erwartete klickbare Monster-Zeile für feather/chicken fehlt.");
      failed = true;
    } else {
      await featherClickableRows.first().click();
      await page.waitForTimeout(600);
      const nowOnCombat = await page.locator('[data-guide-id="sidebar.combat"].active').count();
      const chickenCardVisible = await page.locator("#monstercard-chicken").count();
      console.log(`[wikigate350] nach Klick auf feather-Monster-Zeile: nowOnCombat=${nowOnCombat}, chickenCardVisible=${chickenCardVisible}`);
      if (nowOnCombat === 0 || chickenCardVisible === 0) {
        console.error("[wikigate350] FAIL: Sprung zu chicken/pastures (offene Zone) funktioniert nicht mehr (Regression)!");
        failed = true;
      }
      await page.screenshot({ path: join(SHOTS_DIR, "4-feather-jumped-to-pastures-combat.png"), fullPage: true });
    }
  } finally {
    await browser.close();
    server.child.kill();
  }
  console.log(failed ? "[wikigate350] MINDESTENS EIN FAIL" : "[wikigate350] alle Faelle OK");
  process.exitCode = failed ? 1 : 0;
}

main();
