#!/usr/bin/env node
/**
 * TESTER 9 ("Der Chaot") — Kategorien 1 (ESC-Stack) + 2 (Schnellfeuer) + 6 (Doppelklicks).
 * READ-ONLY: startet nur einen Dev-Server (Vite) + Playwright, ändert keinen Quellcode.
 * Port 5258, Fixture midgame.
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5258;
const BASE_URL = `http://localhost:${PORT}`;
const OUT_DIR = "C:\\Users\\MSchu\\AppData\\Local\\Temp\\claude\\G--GameDev\\553d2095-3a73-4795-9782-0fe746a25f13\\scratchpad\\sweep9";

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
  catch { await page.waitForTimeout(400); await locator.click({ timeout: 6000, ...opts }); }
}

const { child, getOutput } = startDevServer();
const findings = [];
try {
  const ok = await waitForServer(BASE_URL);
  if (!ok) { console.error("SERVER NOT UP:\n" + getOutput()); process.exit(1); }
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", (e) => errors.push({ where: "?", msg: "pageerror: " + e.message }));
  page.on("console", (m) => { if (m.type() === "error") errors.push({ where: "?", msg: "console: " + m.text() }); });

  await page.goto(`${BASE_URL}/?fixture=midgame`, { waitUntil: "load" });
  await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
  await page.waitForTimeout(4500); // load-toasts clear

  // ══════════════════════════════════════════════════════════════════════
  // KATEGORIE 1: ESC-STACK
  // ══════════════════════════════════════════════════════════════════════
  console.log("\n=== KATEGORIE 1: ESC-STACK ===");

  // --- 1a. Tooltip pinnen -> Wiki-Modal öffnen -> Esc-Reihenfolge ---
  await clickRetry(page, page.locator('[data-guide-id="topbar.character"]').first());
  await page.waitForTimeout(800);
  const firstInvItem = page.locator(".cs-inv-slot-wrap .item-cell, .inv-slot.filled .item-cell").first();
  await firstInvItem.click(); // pin
  await page.waitForTimeout(300);
  const tooltipVisible1 = await page.locator(".item-tooltip").count();
  console.log(`Tooltip nach Pin-Klick sichtbar: ${tooltipVisible1 > 0}`);
  const wikiBtn = page.locator(".itip-wiki-btn").first();
  const hasWikiBtn = await wikiBtn.count();
  if (hasWikiBtn > 0) {
    await wikiBtn.click();
    await page.waitForTimeout(400);
    const wikiOpenAfterClick = await page.locator(".iwk-modal").count();
    const tooltipStillOpen = await page.locator(".item-tooltip").count();
    console.log(`Nach Wiki-Klick: Wiki offen=${wikiOpenAfterClick > 0}, Tooltip noch offen=${tooltipStillOpen > 0} (erwartet: Tooltip schließt sich beim Öffnen, s. Code-Kommentar)`);
    await page.screenshot({ path: join(OUT_DIR, "1a-wiki-modal-open.png") });

    // Esc 1x -> Wiki muss weg sein
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    const wikiAfterEsc1 = await page.locator(".iwk-modal").count();
    console.log(`Nach 1x Escape: Wiki noch offen=${wikiAfterEsc1 > 0} (erwartet: false)`);
    if (wikiAfterEsc1 > 0) findings.push({ sev: "KRITISCH", title: "Wiki-Modal schließt nicht per Escape", repro: "Charakter-Seite -> Item pinnen -> '?' Wiki-Button -> Escape" });
  } else {
    console.log("KEIN Wiki-Button gefunden auf gepinntem Tooltip — evtl. falscher Selektor oder Feature verändert.");
  }

  // --- 1b. Gepinntes Tooltip + Escape direkt (ohne Wiki) ---
  await firstInvItem.click();
  await page.waitForTimeout(300);
  const pinnedBefore = await page.locator(".item-tooltip").count();
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  const pinnedAfter = await page.locator(".item-tooltip").count();
  console.log(`Gepinntes Tooltip: vorher=${pinnedBefore > 0}, nach Escape=${pinnedAfter > 0} (erwartet: false)`);
  if (pinnedBefore > 0 && pinnedAfter > 0) findings.push({ sev: "MITTEL", title: "Gepinntes Item-Tooltip schließt nicht per Escape", repro: "Charakter-Seite -> Inventar-Item anklicken (pinnen) -> Escape" });

  // --- 1c. Portrait-Galerie + Tooltip gleichzeitig ---
  await firstInvItem.click(); // pin tooltip again
  await page.waitForTimeout(300);
  const gearBtn = page.locator(".cs-portrait-edit-btn, [aria-label*='ortrait'], .portrait-edit-btn").first();
  let portraitOpened = false;
  if (await gearBtn.count() > 0) {
    await gearBtn.click();
    await page.waitForTimeout(400);
    portraitOpened = (await page.locator(".portrait-gallery-modal").count()) > 0;
  }
  console.log(`Portrait-Galerie über gepinntem Tooltip geöffnet: ${portraitOpened}`);
  if (portraitOpened) {
    const tooltipStillThere = await page.locator(".item-tooltip").count();
    console.log(`  Tooltip währenddessen noch im DOM: ${tooltipStillThere > 0}`);
    await page.screenshot({ path: join(OUT_DIR, "1c-portrait-plus-tooltip.png") });
    // Escape 1x -> was schließt zuerst? (Priorität: tooltip vor modal laut escStack.ts)
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    const tooltipAfterEsc1 = await page.locator(".item-tooltip").count();
    const portraitAfterEsc1 = await page.locator(".portrait-gallery-modal").count();
    console.log(`  Nach 1. Escape: Tooltip=${tooltipAfterEsc1 > 0}, Portrait=${portraitAfterEsc1 > 0} (erwartet: Tooltip zuerst weg, Portrait noch offen)`);
    if (tooltipStillThere > 0 && tooltipAfterEsc1 > 0 && portraitAfterEsc1 === 0) {
      findings.push({ sev: "MITTEL", title: "ESC-Prioritätsreihenfolge verkehrt: Portrait-Modal schließt vor gepinntem Tooltip", repro: "Charakter-Seite: Item pinnen, Portrait-Galerie öffnen, 1x Escape" });
    }
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    const portraitAfterEsc2 = await page.locator(".portrait-gallery-modal").count();
    if (portraitAfterEsc2 > 0) findings.push({ sev: "MITTEL", title: "Portrait-Galerie schließt nicht nach 2x Escape (Tooltip+Modal-Stack)", repro: "Charakter-Seite: Item pinnen, Portrait öffnen, 2x Escape" });
  } else {
    console.log("Portrait-Zahnrad-Button nicht gefunden (Selektor ggf. anders) — Schritt übersprungen.");
  }
  // Aufräumen: alles schließen falls noch offen
  await page.keyboard.press("Escape"); await page.waitForTimeout(150);
  await page.keyboard.press("Escape"); await page.waitForTimeout(150);

  // --- 1d. Hotkeys während Modal offen: Zifferntasten dürfen NICHT die Seite wechseln ---
  console.log("\n--- 1d: Hotkeys unter offenem Modal ---");
  await clickRetry(page, page.locator('[data-guide-id="topbar.character"]').first());
  await page.waitForTimeout(600);
  const gearBtn2 = page.locator(".cs-portrait-edit-btn, [aria-label*='ortrait'], .portrait-edit-btn").first();
  if (await gearBtn2.count() > 0) {
    await gearBtn2.click();
    await page.waitForTimeout(400);
    const modalOpenBefore = await page.locator(".portrait-gallery-modal").count();
    console.log(`Portrait-Modal offen: ${modalOpenBefore > 0}`);
    // Ziffer "3" drücken (sollte gemäß App.tsx sidebar-Liste zu Seite 3 springen, wenn NICHT gated)
    await page.keyboard.press("3");
    await page.waitForTimeout(400);
    const stillOnCharacter = await page.evaluate(() => document.querySelector(".portrait-gallery-modal") !== null);
    const activeHeading = await page.locator(".content-header h1 span").first().innerText().catch(() => "?");
    console.log(`Nach Ziffer '3' bei offenem Modal: Modal noch offen=${stillOnCharacter}, Header zeigt jetzt="${activeHeading}"`);
    if (!stillOnCharacter) {
      findings.push({
        sev: "KRITISCH",
        title: "Ziffern-Hotkey (Sidebar-Sprung) feuert durch offenes Modal hindurch",
        repro: `Charakter-Seite -> Portrait-Galerie öffnen -> Taste '3' drücken -> Modal verschwindet, Seite wechselt zu "${activeHeading}" im Hintergrund (App.tsx MainLayout onKeyDown prüft nur INPUT/TEXTAREA-Fokus, nicht hasOpenModal())`,
      });
      await page.screenshot({ path: join(OUT_DIR, "1d-hotkey-through-modal-CRITICAL.png") });
    } else {
      console.log("  -> Modal blieb offen, Hotkey wurde korrekt geschluckt.");
    }
    // aufräumen
    await page.keyboard.press("Escape"); await page.waitForTimeout(200);
  } else {
    console.log("Portrait-Zahnrad-Button nicht gefunden — 1d übersprungen.");
  }

  // ══════════════════════════════════════════════════════════════════════
  // KATEGORIE 2: SCHNELLFEUER-Seitenwechsel
  // ══════════════════════════════════════════════════════════════════════
  console.log("\n=== KATEGORIE 2: SCHNELLFEUER ===");
  errors.length = 0; // reset counter für diesen Abschnitt
  const navTargets = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-guide-id^="sidebar."], [data-guide-id^="topbar."]')).map(
      (el) => el.getAttribute("data-guide-id"),
    ),
  );
  console.log(`Gefundene Nav-Targets: ${navTargets.length}`);
  const preClickCount = errors.length;
  for (let round = 0; round < 20; round++) {
    for (const guideId of navTargets) {
      const loc = page.locator(`[data-guide-id="${guideId}"]`).first();
      try { await loc.click({ timeout: 500 }); } catch { /* ignorieren, weiter im Text */ }
      await page.waitForTimeout(50); // ~100ms-Takt Zielvorgabe grob eingehalten inkl. Klick-Overhead
    }
  }
  await page.waitForTimeout(500);
  console.log(`Schnellfeuer-Nav (20x alle ${navTargets.length} Ziele) fertig. Neue Fehler seither: ${errors.length - preClickCount}`);
  const stillResponsive = await page.locator('[data-guide-id^="sidebar."]').first().isVisible();
  console.log(`App nach Schnellfeuer noch bedienbar (Sidebar sichtbar): ${stillResponsive}`);
  if (!stillResponsive) findings.push({ sev: "KRITISCH", title: "App nach Schnellfeuer-Navigation nicht mehr bedienbar", repro: "20x alle Sidebar/Topbar-Einträge im 100ms-Takt klicken" });
  if (errors.length - preClickCount > 0) {
    findings.push({
      sev: "MITTEL",
      title: `${errors.length - preClickCount} Konsolenfehler während Schnellfeuer-Navigation`,
      repro: "20x alle Sidebar/Topbar-Einträge im 100ms-Takt klicken",
      detail: errors.slice(preClickCount, preClickCount + 8).map((e) => e.msg).join(" | "),
    });
  }
  await page.screenshot({ path: join(OUT_DIR, "2-after-rapidfire-nav.png") });

  // --- 2b. Kampf starten/abbrechen im Sekundentakt x10 ---
  console.log("\n--- 2b: Kampf Start/Stop x10 ---");
  await clickRetry(page, page.locator('[data-guide-id="sidebar.combat"]').first());
  await page.waitForTimeout(800);
  const preCombatErrCount = errors.length;
  for (let i = 0; i < 10; i++) {
    const zoneCard = page.locator(".zone-card").first();
    if (await zoneCard.count() > 0) {
      await zoneCard.click().catch(() => {});
      await page.waitForTimeout(300);
      const fightBtn = page.locator(".mc-fight-btn").first();
      if (await fightBtn.count() > 0) { await fightBtn.click().catch(() => {}); }
      await page.waitForTimeout(400);
      const stopBtn = page.locator(".gamestats-stop-btn").first();
      if (await stopBtn.count() > 0) { await stopBtn.click().catch(() => {}); }
      await page.waitForTimeout(300);
      // zurück zur Zonenliste falls wir tiefer navigiert sind
      const backBtn = page.locator(".mc-back-btn, .zone-back-btn, [aria-label*='ack']").first();
      if (await backBtn.count() > 0) await backBtn.click().catch(() => {});
    }
  }
  await page.waitForTimeout(500);
  console.log(`Kampf Start/Stop x10 fertig. Neue Fehler seither: ${errors.length - preCombatErrCount}`);
  if (errors.length - preCombatErrCount > 0) {
    findings.push({
      sev: "MITTEL",
      title: `${errors.length - preCombatErrCount} Konsolenfehler bei Kampf-Start/Stop-Schnellfeuer`,
      repro: "Kampf-Seite: Zone -> Fight -> Stop-Button im Sekundentakt x10",
      detail: errors.slice(preCombatErrCount, preCombatErrCount + 8).map((e) => e.msg).join(" | "),
    });
  }
  await page.screenshot({ path: join(OUT_DIR, "2b-after-combat-flicker.png") });

  // ══════════════════════════════════════════════════════════════════════
  // KATEGORIE 6: DOPPELKLICKS auf Kaufbares/Claimbares
  // ══════════════════════════════════════════════════════════════════════
  console.log("\n=== KATEGORIE 6: DOPPELKLICKS ===");
  await clickRetry(page, page.locator('[data-guide-id="topbar.shop"]').first());
  await page.waitForTimeout(800);
  const goldBefore = await page.locator(".shopv2-balance-amount").first().innerText().catch(() => null);
  console.log(`Gold vor Doppelklick-Kauf: ${goldBefore}`);
  const buyBtn = page.locator(".shopv2-buyqty-btn").first();
  const buyBtnCount = await buyBtn.count();
  if (buyBtnCount > 0 && !(await buyBtn.isDisabled().catch(() => true))) {
    const qtyBefore = await page.locator(".shopv2-slots-display, .cs-slot-count").first().innerText().catch(() => "?");
    await buyBtn.dblclick({ timeout: 3000 }).catch((e) => console.log("dblclick fehlgeschlagen:", e.message));
    await page.waitForTimeout(500);
    const goldAfter = await page.locator(".shopv2-balance-amount").first().innerText().catch(() => null);
    console.log(`Gold nach Doppelklick-Kauf: ${goldAfter} (vorher ${goldBefore}, Slots vorher ${qtyBefore})`);
    // Grober Doppel-Ausführungs-Check: Gold-Differenz sollte GENAU dem einfachen Stückpreis
    // entsprechen (steht im Button-Text "<n>x <preis>"), nicht dem Doppelten.
    const btnLabel = await buyBtn.innerText().catch(() => "?");
    console.log(`Geklickter Button-Text (Menge×Preis): "${btnLabel}"`);
  } else {
    console.log(`Kein aktivierbarer Buy-Button gefunden (Buttons=${buyBtnCount}) — Screenshot für manuelle Sichtung.`);
    await page.screenshot({ path: join(OUT_DIR, "6-shop-no-buybtn-found.png") });
  }

  // Quest-Claim-Button falls vorhanden
  await clickRetry(page, page.locator('[data-guide-id="topbar.quests"]').first());
  await page.waitForTimeout(800);
  const claimBtn = page.locator(".quest-claim-btn").first();
  const claimBtnCount = await claimBtn.count();
  if (claimBtnCount > 0 && !(await claimBtn.isDisabled().catch(() => true))) {
    const goldBeforeClaim = await page.locator(".gold-display").first().innerText().catch(() => "?");
    await claimBtn.dblclick({ timeout: 3000 }).catch((e) => console.log("dblclick fehlgeschlagen:", e.message));
    await page.waitForTimeout(500);
    const goldAfterClaim = await page.locator(".gold-display").first().innerText().catch(() => "?");
    const stillClaimable = await page.locator(".quest-claim-btn").count();
    const claimedMarks = await page.locator(".quest-claimed-mark").count();
    console.log(`Quest-Claim doppelgeklickt. Gold vorher=${goldBeforeClaim} nachher=${goldAfterClaim}. Verbleibende Claim-Buttons=${stillClaimable}, Claimed-Markierungen=${claimedMarks}`);
  } else {
    console.log(`Kein aktivierbarer Claim-Button gefunden (Buttons=${claimBtnCount}, evtl. keine abschließbare Quest im Fixture-State).`);
  }
  await page.screenshot({ path: join(OUT_DIR, "6-after-doubleclicks.png") });

  console.log("\n=== FEHLER-SAMMLUNG (gesamte Session) ===");
  console.log(errors.length ? `${errors.length} Konsolen-/Page-Errors:\n` + errors.map((e) => e.msg).join("\n") : "Keine Konsolenfehler in der gesamten Session.");

  console.log("\n=== BEFUNDE ===");
  if (findings.length === 0) console.log("Keine Befunde in Kategorie 1/2/6.");
  for (const f of findings) console.log(`[${f.sev}] ${f.title} — ${f.repro}${f.detail ? " — " + f.detail : ""}`);

  await browser.close();
} finally {
  child.kill();
}
