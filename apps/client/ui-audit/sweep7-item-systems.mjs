#!/usr/bin/env node
/**
 * TESTER 7 ("Der Sammler") — Sweep über Item- & Neben-Systeme: Verzauberung, Varianten-Tasche,
 * Begleiter, Anbau, Aufgaben/Quests, Meisterschaft, Tooltips. STRIKT READ-ONLY (keine
 * Quelldateien geändert) — headless Vite + Playwright, Fixture-Patches nur via page.route
 * (in-memory, nichts landet auf Disk). Muster: arena-rework-check.mjs (routeFixture) +
 * enchant-shot-275.mjs / invfilter-shot-309.mjs / tooltip-shot-308.mjs / pet-redesign-shot-276.mjs.
 * Port 5256 (dediziert für Tester 7).
 *
 * Run: node ui-audit/sweep7-item-systems.mjs   (from apps/client/)
 * Output: PNGs + Log unter scratchpad/sweep7/.
 */
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5256;
const BASE_URL = `http://localhost:${PORT}`;
const OUT_DIR = "C:\\Users\\MSchu\\AppData\\Local\\Temp\\claude\\G--GameDev\\553d2095-3a73-4795-9782-0fe746a25f13\\scratchpad\\sweep7";
mkdirSync(OUT_DIR, { recursive: true });

const errors = [];
const findings = [];

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

/** Generischer Notausgang: räumt eine hängengebliebene .modal-overlay weg (Escape → Overlay-Ecke
 *  anklicken → als letzten Ausweg per DOM entfernen), NUR fürs Test-Harness, kein Produktcode-Fix. */
async function clearOverlays(page) {
  if ((await page.locator(".modal-overlay").count()) === 0) return;
  await page.keyboard.press("Escape").catch(() => {});
  await page.waitForTimeout(150);
  if ((await page.locator(".modal-overlay").count()) === 0) return;
  await page.locator(".modal-overlay").first().click({ position: { x: 5, y: 5 }, force: true, timeout: 2000 }).catch(() => {});
  await page.waitForTimeout(150);
  if ((await page.locator(".modal-overlay").count()) === 0) return;
  await page.evaluate(() => document.querySelectorAll(".modal-overlay").forEach((el) => el.remove()));
  await page.waitForTimeout(150);
}

async function clickRetry(page, locator, opts = {}) {
  try { await locator.click({ timeout: 6000, ...opts }); return; }
  catch { /* fällt durch zum Aufräum-Retry unten */ }
  await clearOverlays(page);
  await page.waitForTimeout(300);
  await locator.click({ timeout: 6000, ...opts });
}

function wirePage(page, tag) {
  page.on("pageerror", (e) => errors.push(`[${tag}] pageerror: ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error") errors.push(`[${tag}] console: ${m.text()}`); });
}

async function shot(page, name) {
  await page.screenshot({ path: join(OUT_DIR, name), fullPage: false });
  console.log("SHOT: " + name);
}

const { child, getOutput } = startDevServer();
try {
  const ok = await waitForServer(BASE_URL);
  if (!ok) { console.error("SERVER NOT UP:\n" + getOutput()); process.exit(1); }
  const browser = await chromium.launch();

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE A — fixture=midgame, gepatcht: Runen bereits vorhanden, wir fügen Saatgut,
  // Varianten-Instanzen, Farm-Plot-Zustände, Quest-Tokens und ein Vergleichsitem hinzu.
  // ═══════════════════════════════════════════════════════════════════════════
  const pageA = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  wirePage(pageA, "A");
  await pageA.route("**/ui-audit-fixtures/midgame.json", async (route) => {
    const res = await route.fetch();
    const json = JSON.parse(await res.text());
    const st = json.state;
    // Saatgut fürs Bepflanzen von Plot 2 (leer).
    st.inventory.slots[14] = { itemId: "gravetato_seed", qty: 5 };
    // Vergleichsitem (eine Stufe über dem angelegten mainhand steel_scimitar) für Compare-Delta.
    st.inventory.slots[15] = { itemId: "blacksteel_scimitar", qty: 1 };
    // Varianten-Tasche: 3 Instanzen von rusty_sword — 2 identische Signaturen (→ ×2-Stack),
    // 1 abweichende (→ eigener Stack). Plain rusty_sword (qty 1) bleibt zusätzlich im Slot 0.
    st.inventory.instances = [
      { instanceId: "t7-inst-1", baseItemId: "rusty_sword", affixes: [{ affixId: "affix_precise", tier: 1 }] },
      { instanceId: "t7-inst-2", baseItemId: "rusty_sword", affixes: [{ affixId: "affix_precise", tier: 1 }] },
      { instanceId: "t7-inst-3", baseItemId: "rusty_sword", affixes: [{ affixId: "affix_keen", tier: 2 }] },
    ];
    // Farm-Plots: Plot0 reif/erntebereit, Plot1 auf ~50% Wachstum, Plot2 bleibt leer (Pflanz-Flow).
    // WICHTIG: persistence/src/index.ts clampt plantedAtMs defensiv auf [0, elapsedMs] (Schutz vor
    // manipulierten/negativen Zeitstempeln) — ein negativer Wert würde beim Laden auf 0 geklemmt und
    // ergäbe fälschlich "frisch gepflanzt" statt "reif". Stattdessen elapsedMs selbst anheben und
    // plantedAtMs relativ dazu positiv setzen (gravetato growMs = 600_000ms).
    st.elapsedMs = 700000;
    st.farmPlots[0] = { cropId: "gravetato", plantedAtMs: 0, autoReplant: false, readyYield: 0, readyItem: null };
    st.farmPlots[1] = { cropId: "gravetato", plantedAtMs: 400000, autoReplant: false, readyYield: 0, readyItem: null };
    // Quest-Tokens für den Rewards-Shop-Kauf-Test.
    st.character.questTokens = 60;
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(json) });
  });

  await pageA.goto(`${BASE_URL}/?fixture=midgame`, { waitUntil: "load" });
  await pageA.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
  await pageA.waitForTimeout(4200);

  // ── 1) VERZAUBERUNG ──────────────────────────────────────────────────────────
  console.log("\n=== 1) ENCHANTING ===");
  await clickRetry(pageA, pageA.locator('[data-guide-id="sidebar.enchanting"]').first());
  await pageA.waitForTimeout(700);
  await shot(pageA, "01-enchant-grimoire.png");

  const runeCardCount = await pageA.locator(".ench-rune-card").count();
  console.log(`Grimoire: ${runeCardCount} Runen-Karten sichtbar`);
  if (runeCardCount === 0) findings.push("[KRITISCH] Enchanting-Grimoire zeigt keine Runen obwohl midgame-Fixture rune_precise_i/force_rune/aether_rune besitzt.");

  // Zerlegen-Tab-Check: EnchantingPage.tsx hat NUR 3 Spalten (Item-Wahl / Altar / Grimoire),
  // kein eigener "Zerlegen"-Tab (Altar-Rework #275 hat Tabs entfernt). Ein Kommentar in
  // CharacterPage.tsx (Zeile ~176) verweist aber noch auf "der Enchanting-Page-Tab 'Zerlegen'".
  const tabCount = await pageA.locator(".ench-tabs, .ench-tab-btn, [class*='ench-tab']").count();
  console.log(`Enchanting-Tab-Elemente gefunden: ${tabCount} (erwartet 0 seit Altar-Rework)`);
  if (tabCount === 0) {
    findings.push("[KOSMETISCH] Kein separater \"Zerlegen\"-Tab auf der Enchanting-Seite — nur Item-Wahl/Altar/Grimoire (Altar-Rework #275 hat Tabs entfernt). Ein Code-Kommentar in CharacterPage.tsx (~Z.176) beschreibt Zerlegen weiterhin als \"der Enchanting-Page-Tab 'Zerlegen'\" — das ist ein stale-doc-Verweis auf ein nicht mehr existierendes UI-Element. Funktional gibt es stattdessen den Entzaubern-Button pro Affix direkt am Altar (getestet unten) — passt zur Sprint-Entscheidung \"kein Salvage/Vault\", aber der Kommentar sollte korrigiert werden.");
  }

  // Ziel wählen: das INVENTAR-Exemplar von rusty_sword (nicht das angelegte) → soll bei
  // erfolgreicher Verzauberung eine ECHTE neue Instanz in inventory.instances erzeugen.
  const invSection = pageA.locator(".ench-select-list");
  const goldBefore = await pageA.locator(".content-header, .topbar").first().innerText().catch(() => "");
  await clickRetry(pageA, invSection.locator(".ench-item-row").filter({ hasText: /Rostiges Schwert|Rusty Sword/i }).first());
  await pageA.waitForTimeout(300);
  await shot(pageA, "02-enchant-target-selected.png");

  // Kompatible Rune wählen (keine .incompatible-Klasse).
  const compatibleRune = pageA.locator(".ench-rune-card:not(.incompatible)").first();
  const compatCount = await compatibleRune.count();
  if (compatCount === 0) {
    findings.push("[MITTEL] Keine kompatible Rune für rusty_sword (Inventar) im Grimoire gefunden — Enchant-Flow konnte nicht real getestet werden.");
  } else {
    await clickRetry(pageA, compatibleRune);
    await pageA.waitForTimeout(300);
    await shot(pageA, "03-enchant-rune-selected-preview.png");

    const enchantBtn = pageA.locator(".ench-btn");
    const btnReady = await enchantBtn.evaluate((el) => el.classList.contains("ready") && !el.hasAttribute("disabled")).catch(() => false);
    console.log(`Enchant-Button bereit: ${btnReady}`);
    if (btnReady) {
      await clickRetry(pageA, enchantBtn);
      await pageA.waitForTimeout(500);
      await shot(pageA, "04-enchant-applied.png");
      const feedback = await pageA.locator(".ench-feedback").first().innerText().catch(() => "(kein Feedback-Banner)");
      console.log(`Feedback nach Enchant: "${feedback}"`);
      const affixRows = await pageA.locator(".ench-affix-row").count();
      console.log(`Affix-Zeilen am Altar nach Enchant: ${affixRows}`);
      if (affixRows === 0) findings.push("[KRITISCH] Nach erfolgreichem Enchant zeigt der Altar keine Affix-Zeile (ench-affix-row) — Verzauberung optisch nicht bestätigt.");

      // Entzaubern (= die einzige "Zerlegen"-artige Aktion, die es gibt) direkt testen.
      const disenchantBtn = pageA.locator(".ench-disenchant-btn").first();
      if (await disenchantBtn.count() > 0) {
        await clickRetry(pageA, disenchantBtn);
        await pageA.waitForTimeout(400);
        await shot(pageA, "05-enchant-disenchanted.png");
        const feedback2 = await pageA.locator(".ench-feedback").first().innerText().catch(() => "(kein Feedback)");
        console.log(`Feedback nach Entzaubern: "${feedback2}"`);
        const affixRowsAfter = await pageA.locator(".ench-affix-row").count();
        console.log(`Affix-Zeilen nach Entzaubern: ${affixRowsAfter} (erwartet 0)`);
        if (affixRowsAfter !== 0) findings.push(`[MITTEL] Nach Entzaubern sind noch ${affixRowsAfter} Affix-Zeile(n) am Altar sichtbar (erwartet 0).`);
      } else {
        findings.push("[MITTEL] Kein Entzaubern-Button (.ench-disenchant-btn) nach erfolgreichem Enchant sichtbar.");
      }
    } else {
      findings.push("[MITTEL] Enchant-Button blieb disabled trotz als kompatibel markierter Rune + genug Gold (5400) — Verzauberungs-Flow real nicht abschließbar.");
      await shot(pageA, "03b-enchant-blocked-state.png");
    }
  }

  // Fixture-injizierte Varianten (t7-inst-1/2/3) sollten unter "Varianten" gelistet sein.
  const variantSectionLabelCount = await pageA.locator(".ench-section-label", { hasText: /Varianten|Variants/i }).count();
  const variantRowCount = await pageA.locator(".ench-select-list .ench-item-row").count();
  console.log(`Varianten-Sektion sichtbar: ${variantSectionLabelCount > 0}, Gesamt-Item-Zeilen: ${variantRowCount}`);

  // ── 2) VARIANTEN-TASCHE ──────────────────────────────────────────────────────
  console.log("\n=== 2) VARIANT-POUCH ===");
  await clickRetry(pageA, pageA.locator('[data-guide-id="topbar.character"]').first());
  await pageA.waitForTimeout(500);
  await shot(pageA, "06-charpage-inventory.png");

  // rusty_sword-Zelle finden (Stern-Badge da instances.length>0).
  const rustySwordCell = pageA.locator(".cs-inv-grid .cs-inv-slot-wrap").filter({ has: pageA.locator("img[alt=''], .item-cell") }).first();
  // Robuster: direkt über den Container mit Stern-Icon suchen.
  const starBadges = await pageA.locator(".pouch-row-star, [class*='hasVariants'], .cs-inv-grid .item-cell").count();
  console.log(`Inventar-Zellen gesamt: ${starBadges}`);

  // Klicke die erste Zelle, die beim Klick ein Pouch-Modal statt normalem Tooltip öffnet — wir
  // klicken einfach alle gefüllten Slots durch, bis .pouch-modal erscheint (robust gg. Slot-Order).
  let pouchOpened = false;
  const filledSlots = pageA.locator(".cs-inv-grid .cs-inv-slot-wrap .item-cell");
  const slotCount = await filledSlots.count();
  for (let i = 0; i < slotCount && !pouchOpened; i++) {
    await filledSlots.nth(i).click({ timeout: 3000 }).catch(() => {});
    await pageA.waitForTimeout(150);
    if (await pageA.locator(".pouch-modal").count() > 0) { pouchOpened = true; break; }
    await pageA.keyboard.press("Escape").catch(() => {});
  }
  console.log(`Varianten-Pouch-Modal geöffnet: ${pouchOpened}`);
  if (!pouchOpened) {
    findings.push("[KRITISCH] Konnte die Varianten-Tasche (Pouch-Modal) trotz 3 fixture-injizierter rusty_sword-Instanzen (2 identisch → sollte ×2-Stack ergeben) nicht öffnen.");
  } else {
    await shot(pageA, "07-variant-pouch-open.png");
    const qtyBadges = await pageA.locator(".pouch-row-qty").allInnerTexts();
    console.log(`Pouch qty-Badges: ${JSON.stringify(qtyBadges)}`);
    // Erwartung angepasst: der vorangegangene REALE Enchant hat rune_precise_i (affix_precise T1)
    // auf rusty_sword angewendet — dieselbe Signatur wie die 2 fixture-injizierten Instanzen
    // (t7-inst-1/2) → verschmilzt zu EINEM ×3-Stack statt eines separaten ×2-Stacks. Prüfe daher
    // nur generisch auf irgendeinen Stack >1, nicht auf eine feste Zahl.
    const hasStack = qtyBadges.some((t) => /×[2-9]/.test(t));
    if (!hasStack) findings.push(`[MITTEL] Varianten-Pouch zeigt keinen gestapelten (×N>1) Eintrag trotz mehrerer identischer Instanzen im Umlauf. Gefundene Badges: ${JSON.stringify(qtyBadges)}`);
    const rowCount = await pageA.locator(".pouch-row").count();
    console.log(`Pouch-Zeilen gesamt: ${rowCount} (Stacks nach Signatur, Grundmenge zu diesem Zeitpunkt 0 da der reale Enchant den letzten Grund-Stack konsumiert hat)`);

    // Klick auf einen Varianten-Stack → sollte großes Item-Tooltip mit Aktionen pinnen.
    const variantRow = pageA.locator(".pouch-row:not(.pouch-row-full)").first();
    if (await variantRow.count() > 0) {
      await clickRetry(pageA, variantRow);
      await pageA.waitForTimeout(300);
      await shot(pageA, "08-variant-pouch-row-tooltip.png");
      const tooltipVisible = await pageA.locator(".item-tooltip").count();
      const actionBtns = await pageA.locator(".item-tooltip button, .itip-action").count();
      console.log(`Tooltip nach Pouch-Zeilen-Klick: ${tooltipVisible > 0}, Aktions-Buttons: ${actionBtns}`);
      if (tooltipVisible === 0) findings.push("[MITTEL] Klick auf eine Varianten-Zeile im Pouch pinnt kein Item-Tooltip.");
    }
    // Escape schließt NUR das gepinnte Item-Tooltip, NICHT das Pouch-Modal selbst (VariantPouchModal
    // hat keinen onKeyDown-Handler — nur onClick auf dem Overlay + onMouseLeave). Das ist eine echte
    // Inkonsistenz ggü. dem Wiki-?-Modal (das Escape unterstützt) und hat meinen ersten Testlauf
    // zum Absturz gebracht (Overlay blockierte alle folgenden Klicks) — hier bewusst dokumentiert.
    await pageA.keyboard.press("Escape");
    await pageA.waitForTimeout(200);
    let pouchStillOpen = await pageA.locator(".pouch-modal").count();
    console.log(`Pouch-Modal nach Escape noch offen: ${pouchStillOpen > 0}`);
    if (pouchStillOpen > 0) {
      findings.push("[MITTEL] Varianten-Pouch-Modal (.pouch-modal) schließt NICHT per Escape — nur per Klick außerhalb oder Maus-weg-Bewegen (onMouseLeave). Inkonsistent zum Wiki-?-Modal, das Escape unterstützt; für Tastatur-/Screenreader-Nutzung ist das ein Trap-Risiko.");
      // Direkt auf das Overlay klicken (force, weit weg vom Modal-Panel) — das ist der reale
      // Schließen-Weg laut Code (onClick auf .pouch-overlay, nur wenn e.target===e.currentTarget).
      await pageA.locator(".pouch-overlay").click({ position: { x: 5, y: 5 }, force: true }).catch(() => {});
      await pageA.waitForTimeout(300);
      pouchStillOpen = await pageA.locator(".pouch-modal").count();
      console.log(`Pouch-Modal nach Overlay-Klick noch offen: ${pouchStillOpen > 0}`);
      if (pouchStillOpen > 0) {
        // Letzter Ausweg NUR fürs Test-Harness (kein Produktcode betroffen): DOM-Cleanup, damit der
        // Rest des Sweeps nicht dauerhaft blockiert bleibt.
        await pageA.evaluate(() => document.querySelectorAll(".pouch-overlay").forEach((el) => el.remove()));
        await pageA.waitForTimeout(200);
        console.log("Pouch-Overlay per Test-Harness-DOM-Cleanup entfernt (letzter Ausweg, kein UI-Fix).");
      }
    }
  }

  // ── 8b) TOOLTIP: Compare-Delta (Inventar-Item vs. angelegt) ──────────────────
  console.log("\n=== 8) TOOLTIPS: Compare-Delta + Hover-Zoom ===");
  await pageA.keyboard.press("Escape").catch(() => {});
  await pageA.waitForTimeout(200);
  // blacksteel_scimitar (injiziert) ist eine Stufe über dem angelegten steel_scimitar. NICHT über
  // einen festen Slot-Index ansteuern: CharacterPage kompaktiert die Anzeige (null-Slots werden
  // übersprungen, verwaiste Varianten-Gruppen ans Ende gehängt) — nach dem Enchant oben (Slot 0
  // wurde null) verschieben sich alle nachfolgenden Indizes. Robust über den Bild-Pfad ansteuern.
  const compareCell = pageA.locator(".cs-inv-grid img[src*='blacksteel_scimitar']").first().locator("xpath=ancestor::*[contains(@class,'item-cell')][1]");
  await clickRetry(pageA, compareCell);
  await pageA.waitForTimeout(350);
  await shot(pageA, "09-tooltip-compare-delta.png");
  const deltaTags = await pageA.locator(".itip-delta").count();
  const deltaTexts = await pageA.locator(".itip-delta").allInnerTexts();
  console.log(`Compare-Delta-Tags: ${deltaTags}, Werte: ${JSON.stringify(deltaTexts.slice(0, 10))}`);
  if (deltaTags === 0) findings.push("[MITTEL] blacksteel_scimitar (Inventar) vs. angelegtes steel_scimitar zeigt keine Compare-Delta-Tags (.itip-delta) im Tooltip.");

  // Hover-Zoom-Schärfe: Bild im Tooltip antippen/hovern und die gerenderte Auflösung prüfen.
  const tiltImg = pageA.locator(".itip-tilt-wrap img, .item-tooltip img").first();
  if (await tiltImg.count() > 0) {
    const box = await tiltImg.boundingBox();
    if (box) {
      await pageA.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await pageA.waitForTimeout(300);
      const naturalInfo = await tiltImg.evaluate((img) => ({
        naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight,
        displayW: img.getBoundingClientRect().width, displayH: img.getBoundingClientRect().height,
        transform: getComputedStyle(img).transform,
      }));
      console.log(`Hover-Zoom-Bild: ${JSON.stringify(naturalInfo)}`);
      if (naturalInfo.naturalWidth < naturalInfo.displayW) {
        findings.push(`[MITTEL] Tooltip-Hover-Bild wird größer dargestellt (${Math.round(naturalInfo.displayW)}px) als seine natürliche Auflösung (${naturalInfo.naturalWidth}px) — könnte trotz Schärfe-Fix wieder unscharf sein.`);
      }
      const cropBox = { x: Math.max(0, box.x - 20), y: Math.max(0, box.y - 20), width: box.width + 40, height: box.height + 40 };
      await pageA.screenshot({ path: join(OUT_DIR, "10-tooltip-hover-zoom-crop.png"), clip: cropBox });
      console.log("SHOT: 10-tooltip-hover-zoom-crop.png (visuell auf Schärfe prüfen)");
    }
  } else {
    findings.push("[KOSMETISCH] Kein Hover-Zoom-Bild-Element (.itip-tilt-wrap img) im Tooltip gefunden.");
  }
  await pageA.keyboard.press("Escape").catch(() => {});
  await pageA.waitForTimeout(200);

  // ── 4) ANBAU (Farming) ────────────────────────────────────────────────────────
  console.log("\n=== 4) FARMING ===");
  await clickRetry(pageA, pageA.locator('[data-guide-id="sidebar.farming"]').first());
  await pageA.waitForTimeout(600);
  await shot(pageA, "11-farm-overview.png");

  const plot0Class = await pageA.locator(".farm-plots .plot-card").nth(0).getAttribute("class");
  const plot1Class = await pageA.locator(".farm-plots .plot-card").nth(1).getAttribute("class");
  console.log(`Plot0 class="${plot0Class}" (erwartet 'ready'), Plot1 class="${plot1Class}" (erwartet 'growing')`);
  if (!plot0Class?.includes("ready")) findings.push(`[MITTEL] Plot 0 (fixture: plantedAtMs=-growMs, sollte reif sein) hat nicht die 'ready'-Klasse: "${plot0Class}"`);
  if (!plot1Class?.includes("growing")) findings.push(`[MITTEL] Plot 1 (fixture: 50% Wachstum) hat nicht die 'growing'-Klasse: "${plot1Class}"`);

  // Ernten (Plot 0).
  const farmXpBefore = await pageA.evaluate(() => document.body.textContent?.match(/Anbau[^\d]*(\d+)/)?.[1] ?? null).catch(() => null);
  const harvestBtn = pageA.locator(".farm-plots .plot-card").nth(0).locator(".skillcard-cta").first();
  if (await harvestBtn.count() > 0) {
    await clickRetry(pageA, harvestBtn);
    await pageA.waitForTimeout(400);
    await shot(pageA, "12-farm-harvested.png");
    const plot0ClassAfter = await pageA.locator(".farm-plots .plot-card").nth(0).getAttribute("class");
    console.log(`Plot0 class nach Ernte: "${plot0ClassAfter}" (erwartet nicht mehr 'ready')`);
    if (plot0ClassAfter?.includes("ready")) findings.push("[MITTEL] Plot 0 zeigt nach Klick auf Ernten weiterhin die 'ready'-Klasse — Ernte griff nicht sichtbar.");
  } else {
    findings.push("[MITTEL] Kein Ernte-Button auf dem als 'ready' erwarteten Plot 0 gefunden.");
  }

  // Pflanzen (Plot 2, leer) → CropPicker-Modal.
  const plantBtn = pageA.locator(".farm-plots .plot-card").nth(2).locator(".skillcard-cta").first();
  if (await plantBtn.count() > 0) {
    await clickRetry(pageA, plantBtn);
    await pageA.waitForTimeout(300);
    const pickerOpen = await pageA.locator(".farm-picker-modal").count();
    console.log(`Crop-Picker-Modal offen: ${pickerOpen > 0}`);
    await shot(pageA, "13-farm-crop-picker.png");
    const gravetatoCard = pageA.locator(".farm-picker-card").filter({ hasText: /Grabkartoffel|Gravetato/i }).first();
    if (await gravetatoCard.count() > 0) {
      const disabled = await gravetatoCard.evaluate((el) => el.hasAttribute("disabled"));
      console.log(`Gravetato-Karte disabled (sollte false sein, Saat injiziert): ${disabled}`);
      if (disabled) findings.push("[MITTEL] Gravetato-Saat wurde injiziert (Slot 14, qty 5), aber die Crop-Picker-Karte ist trotzdem disabled.");
      else {
        await clickRetry(pageA, gravetatoCard);
        await pageA.waitForTimeout(300);
        await shot(pageA, "14-farm-plot2-planted.png");
        const plot2Class = await pageA.locator(".farm-plots .plot-card").nth(2).getAttribute("class");
        console.log(`Plot2 class nach Pflanzen: "${plot2Class}" (erwartet 'growing')`);
        if (!plot2Class?.includes("growing")) findings.push("[MITTEL] Plot 2 zeigt nach Pflanzen nicht die 'growing'-Klasse.");
      }
    } else {
      findings.push("[MITTEL] Gravetato-Crop-Karte nicht im Crop-Picker gefunden (Level-Gate oder falsches Icon-Mapping?).");
    }
  } else {
    findings.push("[MITTEL] Kein Pflanzen-Button auf dem leeren Plot 2 gefunden.");
  }

  // Rezept-Pin-Tracker: NICHT auf der Farm-Seite (Farming hat keine "Aktionen" mit Material-
  // Inputs im SkillPage-Sinn) — der Pin-Button lebt auf SkillPage.tsx (Crafting-Skills). Test auf
  // Cooking als nächstliegendes Material-Sink-System zu Farming-Ernten.
  console.log("Hinweis: Rezept-Pin-Tracker existiert NICHT auf der Farm-Seite (FarmPage.tsx hat keine SkillPage-Actions) — teste stattdessen auf Cooking.");
  await clickRetry(pageA, pageA.locator('[data-guide-id="sidebar.cooking"]').first());
  await pageA.waitForTimeout(500);
  const pinBtn = pageA.locator(".skillcard-pin").first();
  if (await pinBtn.count() > 0) {
    await clickRetry(pageA, pinBtn);
    await pageA.waitForTimeout(400);
    await shot(pageA, "15-recipe-pin-set.png");
    const trackerVisible = await pageA.locator(".ptr-widget").count();
    console.log(`Pin-Tracker-Widget sichtbar nach Pin: ${trackerVisible > 0}`);
    if (trackerVisible === 0) {
      findings.push("[KRITISCH] Rezept-Pin gesetzt (.skillcard-pin geklickt) aber das Tracker-Widget (.ptr-widget) erscheint nicht unten rechts.");
    } else {
      const matRow = await pageA.locator(".ptr-row").count();
      console.log(`Pin-Tracker-Zeilen: ${matRow}`);
    }
  } else {
    findings.push("[MITTEL] Kein Pin-Button (.skillcard-pin) auf der Cooking-Seite gefunden.");
  }

  // ── 5) AUFGABEN/Quests ────────────────────────────────────────────────────────
  console.log("\n=== 5) QUESTS ===");
  await clickRetry(pageA, pageA.locator('[data-guide-id="topbar.quests"]').first());
  await pageA.waitForTimeout(500);
  await shot(pageA, "16-quests-daily.png");
  const tokenBalance1 = await pageA.locator(".quests-header .quest-token-badge-count").innerText().catch(() => "?");
  console.log(`Quest-Token-Anzeige (Header): ${tokenBalance1} (erwartet 60)`);
  if (tokenBalance1.trim() !== "60") findings.push(`[MITTEL] Quest-Token-Header zeigt "${tokenBalance1}" statt erwarteter 60 (fixture-injiziert).`);

  // Story-Tab: bei totalLevel 510 sollten early-game Story-Quests bereits claimbar sein.
  await clickRetry(pageA, pageA.locator(".quests-tab-btn").nth(0));
  await pageA.waitForTimeout(300);
  await shot(pageA, "17-quests-story.png");
  const claimableStory = pageA.locator(".quest-card--completed .quest-claim-btn").first();
  if (await claimableStory.count() > 0) {
    const goldBeforeClaim = await pageA.evaluate(() => document.querySelector(".topbar")?.textContent ?? "");
    await clickRetry(pageA, claimableStory);
    await pageA.waitForTimeout(400);
    await shot(pageA, "18-quests-story-claimed.png");
    const claimedMarks = await pageA.locator(".quest-claimed-mark").count();
    console.log(`Claimed-Markierungen nach Story-Claim: ${claimedMarks}`);
  } else {
    console.log("Keine claimbare Story-Quest im Ausgangszustand gefunden — Claim-Flow stattdessen im Daily-Tab bzw. Token-Shop unten getestet.");
  }

  // Rewards Shop.
  await clickRetry(pageA, pageA.locator(".quests-tab-btn").nth(2));
  await pageA.waitForTimeout(400);
  await shot(pageA, "19-quests-tokenshop.png");
  const offerCount = await pageA.locator(".quest-shop-offer").count();
  console.log(`Token-Shop-Angebote: ${offerCount}`);
  if (offerCount > 0) {
    const balBefore = await pageA.locator(".quest-shop-panel .quest-token-badge-count").innerText();
    await clickRetry(pageA, pageA.locator(".quest-shop-buy-btn").first());
    await pageA.waitForTimeout(400);
    const balAfter = await pageA.locator(".quest-shop-panel .quest-token-badge-count").innerText();
    console.log(`Token-Shop-Kauf: Balance ${balBefore} → ${balAfter}`);
    await shot(pageA, "20-quests-tokenshop-bought.png");
    if (balBefore === balAfter) findings.push(`[MITTEL] Token-Shop-Kauf änderte die Balance nicht (${balBefore} → ${balAfter}).`);
  } else {
    findings.push("[KOSMETISCH] Token-Shop hat keine Angebote (content.tokenShop leer?) — \"Bald verfügbar\"-Platzhalter statt echter Wares.");
  }

  await pageA.close();

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE B — fixture=pettest (alle 21 Pets besessen): Begleiter-Galerie.
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("\n=== 3) BEGLEITER (Pets) ===");
  const pageB = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  wirePage(pageB, "B");
  await pageB.goto(`${BASE_URL}/?fixture=pettest`, { waitUntil: "load" });
  await pageB.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
  await pageB.waitForTimeout(4200);

  await clickRetry(pageB, pageB.locator('[data-guide-id="topbar.companions"]').first());
  await pageB.waitForTimeout(600);
  await shot(pageB, "21-pets-gallery.png");
  const petCardCount = await pageB.locator(".pet-card-owned").count();
  console.log(`Besessene Pet-Karten sichtbar: ${petCardCount} (erwartet 21)`);
  if (petCardCount < 21) findings.push(`[MITTEL] Nur ${petCardCount}/21 Pet-Karten als "besessen" markiert trotz pettest-Fixture (alle 21 owned).`);

  // Detail: gibt es einen separaten Detail-Dialog? (Es gibt keinen — die Karte selbst zeigt Effekte/
  // Quelle/Drop-Chance inline. Das ist Absicht, kein Bug — hier nur verifiziert.)
  const firstOwnedCard = pageB.locator(".pet-card-owned").first();
  const hasEffectRows = await firstOwnedCard.locator(".pet-effect-rows").count();
  const hasSource = await firstOwnedCard.locator(".pet-card-source").count();
  const hasDropChance = await firstOwnedCard.locator(".pet-card-drop").count();
  console.log(`Pet-Karte "Detail" inline: Effekte=${hasEffectRows > 0}, Quelle=${hasSource > 0}, Drop-Chance=${hasDropChance > 0} (kein separates Detail-Modal vorhanden — by design)`);

  // Ausrüsten/Wechseln.
  await clickRetry(pageB, pageB.locator(".pet-slot-btn").first());
  await pageB.waitForTimeout(300);
  await shot(pageB, "22-pets-picker-open.png");
  const pickerEntries = await pageB.locator(".pet-select-entry").count();
  console.log(`Picker-Einträge: ${pickerEntries}`);
  const secondEntry = pageB.locator(".pet-select-entry").nth(1); // Index 0 = "Keins"
  const secondName = await secondEntry.locator(".pet-select-name").innerText().catch(() => "?");
  await clickRetry(pageB, secondEntry);
  await pageB.waitForTimeout(400);
  await shot(pageB, "23-pets-equipped.png");
  const slotName = await pageB.locator(".pet-slot-name").innerText().catch(() => "?");
  console.log(`Ausgewählt: "${secondName}", Slot zeigt jetzt: "${slotName}"`);
  if (!slotName.includes(secondName) && secondName !== "?") {
    findings.push(`[MITTEL] Pet-Wechsel: Picker-Auswahl "${secondName}" spiegelt sich nicht im Slot-Button ("${slotName}").`);
  }
  const equippedBadgeCount = await pageB.locator(".pet-card-equipped").count();
  console.log(`Pet-Karten mit "equipped"-Badge: ${equippedBadgeCount} (erwartet genau 1)`);
  if (equippedBadgeCount !== 1) findings.push(`[MITTEL] ${equippedBadgeCount} Pet-Karten zeigen das "ausgerüstet"-Badge statt genau 1.`);

  console.log(errors.length ? `${errors.length} Page-Errors bisher (siehe unten)` : "keine Page-Errors bisher");
  await pageB.close();

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE C — fixture=endgame: Meisterschaft + Wiki-Modal-Regressionscheck (bekannte Items).
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("\n=== 6) MEISTERSCHAFT ===");
  const pageC = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  wirePage(pageC, "C");
  await pageC.goto(`${BASE_URL}/?fixture=endgame`, { waitUntil: "load" });
  await pageC.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
  await pageC.waitForTimeout(4200);

  await clickRetry(pageC, pageC.locator('[data-guide-id="topbar.mastery"]').first());
  await pageC.waitForTimeout(600);
  await shot(pageC, "24-mastery-overview.png");
  const skillBlockCount = await pageC.locator(".ms2-skill-block").count();
  console.log(`Mastery-Skill-Blöcke: ${skillBlockCount}`);
  if (skillBlockCount === 0) findings.push("[KRITISCH] Meisterschaft-Seite zeigt keine Skill-Blöcke.");
  else {
    // Ersten Block aufklappen → Pool + Checkpoints + Action-Detail-Zeilen.
    await clickRetry(pageC, pageC.locator(".ms2-skill-hdr").first());
    await pageC.waitForTimeout(300);
    await shot(pageC, "25-mastery-skill-expanded.png");
    const actionRows = await pageC.locator(".ms2-action-row").count();
    const poolCps = await pageC.locator(".ms2-pool-cp").count();
    console.log(`Aufgeklappt: ${actionRows} Action-Zeilen, ${poolCps} Pool-Checkpoints`);
    if (actionRows === 0) findings.push("[MITTEL] Aufgeklappter Mastery-Skill-Block zeigt keine Action-Detailzeilen.");
    // Checkpoint-Zoom.
    const poolBar = pageC.locator(".ms2-pool-bar").first();
    if (await poolBar.count() > 0) {
      const b = await poolBar.boundingBox();
      if (b) await pageC.screenshot({ path: join(OUT_DIR, "26-mastery-pool-crop.png"), clip: { x: b.x - 10, y: b.y - 10, width: b.width + 20, height: b.height + 30 } });
    }
    // Tabs — "Kampf"-Tab existiert nur, wenn Kampf-Skills eigene content.actions-Einträge haben
    // (hasCombatActions in MasteryPage.tsx). Robust prüfen statt blind zu klicken.
    const combatTab = pageC.locator(".ms2-tab", { hasText: /Kampf|Combat/i });
    const tabLabels = await pageC.locator(".ms2-tab-btns .ms2-tab").allInnerTexts();
    console.log(`Mastery-Tabs vorhanden: ${JSON.stringify(tabLabels)}`);
    if (await combatTab.count() > 0) {
      await clickRetry(pageC, combatTab.first());
      await pageC.waitForTimeout(300);
      await shot(pageC, "27-mastery-combat-tab.png");
    } else {
      console.log("Kein 'Kampf'-Tab in der Meisterschaft — erwartet, da Kampf-Skills keine eigenen content.actions haben (hasCombatActions=false in MasteryPage.tsx); kein Bug.");
      await clickRetry(pageC, pageC.locator(".ms2-tab-btns .ms2-tab").last());
      await pageC.waitForTimeout(300);
      await shot(pageC, "27-mastery-completed-tab.png");
    }
  }

  // ── 8c) TOOLTIP: Wiki-?-Modal Regressionscheck (bekannte Items aus tooltip-shot-308/wiki-309) ──
  console.log("\n=== 8c) WIKI-MODAL REGRESSION ===");
  await clickRetry(pageC, pageC.locator('[data-guide-id="topbar.character"]').first());
  await pageC.waitForTimeout(500);
  const ironOreCell = pageC.locator(".cs-inv-grid .cs-inv-slot-wrap").nth(2).locator(".item-cell").first();
  await clickRetry(pageC, ironOreCell);
  await pageC.waitForTimeout(300);
  const wikiBtn = pageC.locator(".itip-wiki-btn").first();
  if (await wikiBtn.count() > 0) {
    await clickRetry(pageC, wikiBtn);
    await pageC.waitForTimeout(300);
    const modalOpen = await pageC.locator(".iwk-modal").count();
    console.log(`Wiki-Modal offen: ${modalOpen > 0}`);
    await shot(pageC, "28-wiki-modal.png");
    const sourceRows = await pageC.locator(".iwk-section").nth(0).locator(".iwk-row").count();
    console.log(`Quellen-Zeilen: ${sourceRows}`);
    if (modalOpen === 0) findings.push("[MITTEL] Wiki-?-Modal öffnet nicht beim Klick auf .itip-wiki-btn (Regression ggü. Task #308).");
    await pageC.keyboard.press("Escape");
    await pageC.waitForTimeout(200);
    const modalAfterEsc = await pageC.locator(".iwk-modal").count();
    if (modalAfterEsc !== 0) findings.push("[MITTEL] Wiki-Modal schließt nicht per Escape.");
  } else {
    findings.push("[MITTEL] Kein Wiki-?-Button (.itip-wiki-btn) am gepinnten Tooltip in slot 2 (iron_ore erwartet) gefunden.");
  }

  console.log(errors.length ? `${errors.length} Page-Errors gesamt` : "keine Page-Errors gesamt");
  await pageC.close();

  await browser.close();

  console.log("\n\n========== ZUSAMMENFASSUNG ==========");
  console.log(findings.length ? findings.map((f, i) => `${i + 1}. ${f}`).join("\n") : "Keine Findings — alle Checks grün.");
  console.log(`\nPage-Errors (${errors.length}):`);
  console.log(errors.length ? errors.slice(0, 30).join("\n") : "keine");
} finally {
  child.kill();
}
