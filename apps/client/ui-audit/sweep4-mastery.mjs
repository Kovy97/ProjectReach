#!/usr/bin/env node
/**
 * TESTER 4 ("Der Veteran") — Sweep 4, Brille "Endgame-Systeme", Kapitel 3: MEISTERWEIHE.
 * Read-only Playwright-Sichtprüfung. Port 5253 (Tester-4-Zuweisung).
 *
 * Teil A: EIN Skill (mining) per Fixture-Patch auf Level 99 → Zeremonie erscheint korrekt (Titel,
 *   Skill-Name, "Reise in Zahlen"), Cape wird verliehen, masterPerk-Zeile im Cape-Tooltip
 *   (Inventar-Suche → Tooltip). KEINE Vollendungs-Zeremonie danach (nur 1/20 gemeistert).
 *
 * Teil B: ALLE 20 Skills ≥ 99 → nach den (hier auf die letzten 2 verkürzten, um nicht 20 Popups
 *   klicken zu müssen — die restlichen 18 werden direkt als bereits gesehen markiert, exakt
 *   dasselbe capes.ts-Feld, das ein echter Klick auch setzt) Einzel-Zeremonien MUSS eine
 *   VOLLENDUNGS-Zeremonie folgen: Pokal-Icon, "Alle 20 Disziplinen", Gesamt-XP, 20/20, und der
 *   „Umhang der Vollendung" (cape_master_completion) wird verliehen.
 *
 * Muster: ui-audit/mastery-ceremony-shot.mjs (Queue-Staffelung), ui-audit/gen-masterytest-fixture.mjs
 * (xpForLevel(99) ≈ 13.034.431 — hier mit Sicherheitsmarge 13.100.000 verwendet).
 * Run: node ui-audit/sweep4-mastery.mjs   (from apps/client/)
 */
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5253;
const BASE_URL = `http://localhost:${PORT}`;
const OUT_DIR = "C:\\Users\\MSchu\\AppData\\Local\\Temp\\claude\\G--GameDev\\553d2095-3a73-4795-9782-0fe746a25f13\\scratchpad\\sweep4";
mkdirSync(OUT_DIR, { recursive: true });
const XP99 = 13_100_000; // sicher über xpForLevel(99) ≈ 13.034.431

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

async function newGamePage(browser, tag) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(`[${tag}] pageerror: ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error") errors.push(`[${tag}] console: ${m.text()}`); });
  await page.goto(`${BASE_URL}/?fixture=endgame`, { waitUntil: "load" });
  await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
  await page.waitForFunction(() => !!window.__hfDebug, null, { timeout: 5000 });
  await page.waitForTimeout(4200); // Achievement-Toast-Batch (endgame-Fixture) abklingen lassen
  return { page, errors };
}

async function run(label, fn) {
  try { await fn(); }
  catch (e) { console.log(`!! ${label} FAILED: ${e.message}\n${e.stack ?? ""}`); }
}

const allErrors = [];
const findings = [];

const { child, getOutput } = startDevServer();
try {
  const ok = await waitForServer(BASE_URL);
  if (!ok) { console.error("SERVER NOT UP:\n" + getOutput()); process.exit(1); }
  const browser = await chromium.launch();

  // ── A) Einzelne Skill-Weihe (mining → 99): Zeremonie, Cape, Perk-Tooltip ──────────────────────
  await run("single-skill-ceremony", async () => {
    const { page, errors } = await newGamePage(browser, "single");
    await page.evaluate((xp) => {
      window.__hfDebug.state.skills.mining = { xp };
    }, XP99);
    const gotCeremony = await page.waitForSelector(".mwc-card", { timeout: 8000 }).then(() => true).catch(() => false);
    if (!gotCeremony) { findings.push("KRITISCH: Meisterweihe-Zeremonie erscheint nicht, wenn ein Skill Level 99 erreicht"); allErrors.push(...errors); await page.close(); return; }
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(OUT_DIR, "ms1-single-ceremony-mining.png") });
    console.log("SHOT SAVED: ms1-single-ceremony-mining.png");
    const domProof = await page.evaluate(() => ({
      subtitle: document.querySelector(".mwc-subtitle")?.textContent,
      hasCapeBlock: !!document.querySelector(".mwc-cape"),
      capeName: document.querySelector(".mwc-cape-name")?.textContent,
      capePerkLine: document.querySelector(".mwc-cape-perk")?.textContent,
      queueHintPresent: !!document.querySelector(".mwc-queue-hint"),
    }));
    console.log(`[single-ceremony] ${JSON.stringify(domProof)}`);
    if (!/bergbau|mining/i.test(domProof.subtitle ?? "")) findings.push(`MITTEL: Zeremonie-Untertitel nennt nicht den erreichten Skill: "${domProof.subtitle}"`);
    if (!domProof.hasCapeBlock) findings.push("KRITISCH: Kein Cape-Block in der Meisterweihe-Zeremonie (cape_master_mining fehlt im Content?)");
    if (domProof.queueHintPresent) findings.push("MITTEL: 'weitere Zeremonien warten'-Hinweis obwohl nur 1 Skill auf 99 gesetzt wurde");

    // Weiter-Klick → keine zweite (Vollendungs-)Zeremonie darf folgen (nur 1/20 Skills gemeistert).
    await clickRetry(page, page.locator(".mwc-next-btn").first());
    await page.waitForTimeout(1600);
    const stillOpen = await page.locator(".mwc-backdrop").count();
    console.log(`[single-ceremony] .mwc-backdrop nach Dismiss: ${stillOpen} (erwartet 0)`);
    if (stillOpen > 0) findings.push("KRITISCH: Nach der einzelnen Meisterweihe folgt fälschlich eine weitere Zeremonie (nur 1/20 Skills gemeistert)");

    // Cape im Inventar ODER in der Bank? Perk-Zeile im Item-Tooltip (goldene Effekt-Zeile)?
    // state.bank ist ein flaches Record<ItemId, number> (kein Tab/Slot-Modell) — s. shared/index.ts.
    const invProof = await page.evaluate(() => {
      const { state, content } = window.__hfDebug;
      const capeId = "cape_master_mining";
      const hasItem = content.items[capeId] !== undefined;
      const inInv = state.inventory.slots.some((s) => s?.itemId === capeId);
      const inBank = (state.bank?.[capeId] ?? 0) > 0;
      const capeGranted = state.capeGranted?.mining === true;
      return { hasItem, inInv, inBank, capeGranted };
    });
    console.log(`[single-ceremony] Cape im Inventar/Bank: ${JSON.stringify(invProof)}`);
    if (!invProof.inInv && !invProof.inBank) findings.push("KRITISCH: cape_master_mining wurde weder ins Inventar noch in die Bank verliehen");

    // Cape liegt je nach Inventar-Füllstand im Inventar (Charakter-Seite) oder in der Bank
    // (autoBank=true per Default) — Suche auf der jeweils richtigen Seite. WICHTIG: `.inv-slot`
    // UND `.item-cell` sitzen auf demselben DOM-Knoten (kein Nesting) — Selektor ohne Leerzeichen
    // kombinieren, sonst matcht ein Nachfahren-Selektor grundlos nie.
    const onCharPage = invProof.inInv || !invProof.inBank;
    await clickRetry(page, page.locator(onCharPage ? '[data-guide-id="topbar.character"]' : '[data-guide-id="topbar.bank"]').first());
    await page.waitForSelector(".invf-search", { timeout: 10000 });
    const capeNames = await page.evaluate(() => {
      const n = window.__hfDebug.content.items.cape_master_mining.name;
      return { de: n.de ?? n.en, en: n.en };
    });
    // Bank: "Lager"-Spalte ist die 2. .bank-columns-Sektion (die 1. ist "Inventar"/Einlagern-Kandidaten).
    const cellLocator = () => (onCharPage
      ? page.locator(".cs-inv-slot-wrap:not(.invf-dim) .item-cell").first()
      : page.locator(".bank-columns section").nth(1).locator(".item-cell").first());
    await page.locator(".invf-search").first().fill(capeNames.de);
    await page.waitForTimeout(300);
    let cell = cellLocator();
    let cellCount = await cell.count();
    if (cellCount === 0 && capeNames.en !== capeNames.de) {
      await page.locator(".invf-search").first().fill(capeNames.en);
      await page.waitForTimeout(300);
      cell = cellLocator();
      cellCount = await cell.count();
    }
    console.log(`[single-ceremony] Treffer (${onCharPage ? "Inventar" : "Bank"}) für "${capeNames.de}"/"${capeNames.en}": ${cellCount}`);
    if (cellCount > 0) {
      await clickRetry(page, cell);
      await page.waitForSelector(".item-tooltip", { timeout: 5000 });
      await page.waitForTimeout(200);
      await page.screenshot({ path: join(OUT_DIR, "ms2-cape-tooltip-mining.png") });
      console.log("SHOT SAVED: ms2-cape-tooltip-mining.png");
      const tooltipProof = await page.evaluate(() => ({
        effectLineText: document.querySelector(".itip-effect-line")?.textContent,
        effectBlockPresent: !!document.querySelector(".itip-effect-block"),
      }));
      console.log(`[single-ceremony] Tooltip-Perk: ${JSON.stringify(tooltipProof)}`);
      if (!tooltipProof.effectBlockPresent) findings.push("MITTEL: Meisterumhang-Tooltip zeigt keine goldene Perk-/Effekt-Zeile (.itip-effect-block fehlt)");
    } else {
      findings.push(`MITTEL: Meisterumhang-Zelle nicht klickbar gefunden (${onCharPage ? "Inventar" : "Bank"}-Seite) — Perk-Tooltip nicht verifizierbar`);
    }
    allErrors.push(...errors);
    await page.close();
  });

  // ── B) VOLLENDUNGS-Fall: ALLE 20 Skills ≥ 99 ────────────────────────────────────────────────────
  await run("completion-ceremony", async () => {
    const { page, errors } = await newGamePage(browser, "completion");

    // Setup: alle 20 Skills auf XP99; die ersten (n-2) Weihen direkt als bereits gesehen markieren
    // (dasselbe capes.ts-Feld, das ein echter "Weiter"-Klick setzt) — spart 18 Klicks, ohne die
    // eigentliche Vollendungs-Trigger-Logik zu umgehen (die läuft für die letzten 2 + Vollendung
    // ganz normal über einen echten Tick / checkMasteryCapes).
    const setup = await page.evaluate((xp) => {
      const { state, content } = window.__hfDebug;
      const ids = Object.keys(content.skills);
      const capes = (state.masteryCapes = {});
      const seen = (state.capeCeremonySeen = {});
      const granted = (state.capeGranted = {});
      ids.forEach((id, i) => {
        state.skills[id] = { xp };
        if (i < ids.length - 2) { capes[id] = true; seen[id] = true; granted[id] = true; }
      });
      return { totalSkills: ids.length, preSeenCount: Object.keys(capes).length, remaining: ids.slice(-2) };
    }, XP99);
    console.log(`[completion] Setup: ${JSON.stringify(setup)}`);

    const gotCeremony1 = await page.waitForSelector(".mwc-card", { timeout: 8000 }).then(() => true).catch(() => false);
    if (!gotCeremony1) { findings.push("KRITISCH: Erste Einzel-Zeremonie der letzten 2 Skills erscheint nicht"); allErrors.push(...errors); await page.close(); return; }
    await page.waitForTimeout(200);
    const c1 = await page.evaluate(() => ({
      subtitle: document.querySelector(".mwc-subtitle")?.textContent,
      isCompletionLooking: document.querySelector(".mwc-tag")?.textContent,
    }));
    console.log(`[completion] Zeremonie 1 (letzter Skill A): ${JSON.stringify(c1)}`);
    await page.screenshot({ path: join(OUT_DIR, "ms3-queue-1-lastskillA.png") });
    console.log("SHOT SAVED: ms3-queue-1-lastskillA.png");

    await clickRetry(page, page.locator(".mwc-next-btn").first());
    await page.waitForTimeout(1600);
    const gotCeremony2 = await page.waitForSelector(".mwc-card", { timeout: 8000 }).then(() => true).catch(() => false);
    if (!gotCeremony2) { findings.push("KRITISCH: Zweite Einzel-Zeremonie (letzter Skill B) erscheint nicht"); allErrors.push(...errors); await page.close(); return; }
    const c2 = await page.evaluate(() => document.querySelector(".mwc-subtitle")?.textContent);
    console.log(`[completion] Zeremonie 2 (letzter Skill B): "${c2}"`);
    await page.screenshot({ path: join(OUT_DIR, "ms4-queue-2-lastskillB.png") });
    console.log("SHOT SAVED: ms4-queue-2-lastskillB.png");

    // Kein Doppel-Modal während des Übergangs.
    await clickRetry(page, page.locator(".mwc-next-btn").first());
    const counts = [];
    for (let i = 0; i < 15; i++) {
      counts.push(await page.locator(".mwc-backdrop").count());
      await page.waitForTimeout(120);
    }
    console.log(`[completion] Übergangs-Poll (sollte nie >1 sein): ${counts.join(",")}`);
    if (counts.some((n) => n > 1)) findings.push("KRITISCH: Zwei Zeremonien gleichzeitig sichtbar beim Übergang zur Vollendungs-Zeremonie");

    // ── Die Vollendungs-Zeremonie selbst ──
    const gotCompletion = await page.waitForSelector(".mwc-card", { timeout: 8000 }).then(() => true).catch(() => false);
    if (!gotCompletion) { findings.push("KRITISCH: Vollendungs-Zeremonie erscheint nach den 20 Einzel-Weihen NICHT"); allErrors.push(...errors); await page.close(); return; }
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(OUT_DIR, "ms5-completion-ceremony.png") });
    console.log("SHOT SAVED: ms5-completion-ceremony.png");

    const domProof = await page.evaluate(() => ({
      subtitle: document.querySelector(".mwc-subtitle")?.textContent,
      statLabels: [...document.querySelectorAll(".mwc-stat-label")].map((el) => el.textContent),
      statValues: [...document.querySelectorAll(".mwc-stat-value")].map((el) => el.textContent),
      hasCapeBlock: !!document.querySelector(".mwc-cape"),
      capeName: document.querySelector(".mwc-cape-name")?.textContent,
      capePerkLine: document.querySelector(".mwc-cape-perk")?.textContent,
      iconImgPresent: !!document.querySelector(".mwc-icon-img"),
      queueHintPresent: !!document.querySelector(".mwc-queue-hint"),
    }));
    console.log(`[completion] Zeremonie-Inhalt: ${JSON.stringify(domProof)}`);

    if (!/20/.test(domProof.subtitle ?? "")) findings.push(`MITTEL: Vollendungs-Untertitel erwähnt nicht "20 Disziplinen": "${domProof.subtitle}"`);
    const has2020 = domProof.statValues.some((v) => v?.trim() === "20/20");
    if (!has2020) findings.push(`MITTEL: Vollendungs-Zeremonie zeigt keinen "20/20"-Disziplinen-Zähler: ${JSON.stringify(domProof.statValues)}`);
    if (!domProof.hasCapeBlock) findings.push("KRITISCH: Vollendungs-Zeremonie zeigt keinen Cape-Block (Umhang der Vollendung)");
    if (domProof.capeName && !/vollendung|completion/i.test(domProof.capeName)) findings.push(`MITTEL: Cape-Name in der Vollendungs-Zeremonie unerwartet: "${domProof.capeName}"`);
    if (!domProof.iconImgPresent) findings.push("KOSMETISCH: Kein Icon-Bild in der Vollendungs-Zeremonie (Pokal/Achievement-Icon)");
    if (domProof.queueHintPresent) findings.push("MITTEL: Vollendungs-Zeremonie zeigt fälschlich einen 'weitere warten'-Hinweis (sollte die letzte sein)");

    // Verleihung + sauberer Queue-Abschluss.
    await clickRetry(page, page.locator(".mwc-next-btn").first());
    await page.waitForTimeout(1400);
    const finalProof = await page.evaluate(() => {
      const { state, content } = window.__hfDebug;
      // state.bank ist ein flaches Record<ItemId, number> (kein Tab/Slot-Modell) — s. shared/index.ts.
      return {
        completionCapeInInv: state.inventory.slots.some((s) => s?.itemId === "cape_master_completion"),
        completionCapeInBank: (state.bank?.cape_master_completion ?? 0) > 0,
        backdropCount: document.querySelectorAll(".mwc-backdrop").length,
        completionMarker: state.masteryCapes?.completion === true,
        completionGranted: state.capeGranted?.completion === true,
        completionCapeInContent: content.items.cape_master_completion !== undefined,
      };
    });
    console.log(`[completion] Nach Dismiss: ${JSON.stringify(finalProof)}`);
    if (finalProof.backdropCount > 0) findings.push("MITTEL: Nach der Vollendungs-Zeremonie bleibt ein Phantom-Modal offen");
    if (!finalProof.completionCapeInInv && !finalProof.completionCapeInBank) findings.push("KRITISCH: Umhang der Vollendung wurde nicht verliehen (weder Inventar noch Bank)");
    if (!finalProof.completionMarker) findings.push("KRITISCH: state.masteryCapes.completion wurde nicht gesetzt");

    allErrors.push(...errors);
    await page.close();
  });

  await browser.close();
  console.log("\n=== FINDINGS ===");
  console.log(findings.length ? findings.map((f) => "- " + f).join("\n") : "keine (alle Checks grün)");
  console.log(`\n=== PAGE ERRORS (${allErrors.length}) ===`);
  console.log(allErrors.length ? allErrors.slice(0, 30).join("\n") : "keine Konsolenfehler");
} finally {
  child.kill();
}
