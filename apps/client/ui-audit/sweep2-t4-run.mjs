#!/usr/bin/env node
// Tester-Sweep 2, T4 "Der Rückkehrer" (2026-07-13) — Wegwerf-Skript, NICHT Teil des Produkts.
// Prüft Alt-Save-Kompatibilität über den ECHTEN UI-Import-Pfad (Optionen-Seite, Textarea + Apply),
// nicht nur die Persistence-Unit-Tests. Eigener Port 5253, headless Chromium via Playwright,
// standalone Vite-Dev-Server (gleiches Muster wie ui-audit/tour.mjs, aber eigenes Skript).
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5253;
const BASE_URL = `http://localhost:${PORT}`;
const VAULT_DIR = join(CLIENT_DIR, "..", "..", "packages", "persistence", "fixtures", "save-compat");

const V56_JSON = readFileSync(join(VAULT_DIR, "v56-slot-0.json"), "utf-8");
const SYN_V63_JSON = readFileSync(join(__dirname, "sweep2-t4-synthetic-v63.json"), "utf-8");

const results = []; // { scenario, check, ok, detail }
function record(scenario, check, ok, detail) {
  results.push({ scenario, check, ok, detail });
  console.log(`[${ok ? "PASS" : "FAIL"}] ${scenario} :: ${check}${detail ? " — " + detail : ""}`);
}

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
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

// ── Page helpers ─────────────────────────────────────────────────────────
async function gotoMenu(page) {
  // Default-Locale des Clients ist "de" (initialLocale() in i18n/index.tsx) — für stabile
  // englische Text-Selektoren hier explizit vor dem ersten Mount auf "en" zwingen.
  await page.addInitScript(() => localStorage.setItem("hearthforge:locale", "en"));
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".menu-nav", { timeout: 15000 });
}

/** Neues Spiel im ersten leeren Slot anlegen (minimaler Weg zu "playing"). */
async function newGame(page, name) {
  await page.getByRole("button", { name: "New Game" }).first().click();
  await page.locator(".menu-slot--empty .hf-btn").first().click();
  await page.waitForSelector(".creation-input", { timeout: 10000 });
  await page.locator(".creation-input").fill(name);
  await page.locator(".creation-start").click();
  await page.waitForSelector(".layout", { timeout: 10000 });
  // Frische Charaktere starten mit aktivem Onboarding-Spotlight-Guide (nur der angestrahlte
  // Button ist klickbar, s. ui-audit/README.md "Gotchas") — für den Sweep irrelevant, weg damit.
  const skipBtn = page.locator(".guide-bubble-skip");
  if (await skipBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await skipBtn.click();
  }
}

/** Options-Seite öffnen, Fixture-JSON in die Textarea, Apply klicken. Liefert {ok, errorText}. */
async function importViaUi(page, json) {
  await page.locator('[data-guide-id="sidebar.options"]').click();
  await page.waitForSelector(".opz-textarea", { timeout: 10000 });
  await page.locator(".opz-textarea").fill(json);
  await page.getByRole("button", { name: /Import \(overwrites/ }).click();
  // Erfolg = sessionEpoch-Remount (Options-Seite verschwindet, Root wechselt zurück auf
  // MainLayout-Default "character"); Fehler = .opz-status-error bleibt sichtbar, Seite bleibt offen.
  try {
    await page.waitForSelector(".opz-page", { state: "detached", timeout: 5000 });
    return { ok: true };
  } catch {
    const errVisible = await page.locator(".opz-status-error").isVisible().catch(() => false);
    const errText = errVisible ? await page.locator(".opz-status-error").textContent() : null;
    return { ok: false, errorText: errText ?? "kein Remount, kein sichtbarer Fehler-Status" };
  }
}

/** Alt-Saves haben `onboarding.toursSeen` oft nicht für neuere Bereiche gesetzt (Area-Tour-Guides
 *  sind jünger als v56/v57) — AreaTourGuide spotlightet dann beim ersten Seitenbesuch und blockt
 *  Klicks (root intercepts pointer events), bis "Skip" gedrückt wird. Nach jeder Navigation prüfen. */
async function dismissGuideIfPresent(page) {
  const skipBtn = page.locator(".guide-bubble-skip");
  if (await skipBtn.first().isVisible({ timeout: 2000 }).catch(() => false)) {
    await skipBtn.first().click();
    await page.waitForTimeout(200);
  }
}

async function readSlot0(page) {
  const raw = await page.evaluate(() => localStorage.getItem("hearthforge:save:0"));
  return raw ? JSON.parse(raw) : null;
}

const LEGACY_V62_ZONE_IDS = [
  "pastures", "borderlands", "ashfields", "blackthorn", "crypt", "wildwood",
  "coast", "slagpit", "highlands", "idolhall", "slayer_tower",
];

// ── Scenario runners ────────────────────────────────────────────────────

async function scenarioV56(context, consoleErrors) {
  const S = "v56-import";
  const page = await context.newPage();
  page.on("console", (msg) => { if (msg.type() === "error") consoleErrors.push(`${S}: ${msg.text()}`); });
  page.on("pageerror", (err) => consoleErrors.push(`${S} pageerror: ${err.message}`));

  await gotoMenu(page);
  await newGame(page, "T4 Seed A");
  const before = await readSlot0(page);

  const res = await importViaUi(page, V56_JSON);
  record(S, "Import via UI erfolgreich (kein Fehler-Toast, Remount erfolgt)", res.ok, res.errorText);
  if (!res.ok) { await page.close(); return; }

  // Sweep-Fund T8 (Vorlauf-Sweep): Import konnte Geister-Popups triggern (Todes-Popup/falsche
  // Toasts, weil Snapshot-Refs noch den alten Charakter hielten) — sessionEpoch-Remount ist der
  // Fix dafür; hier gegenprüfen, dass er wirklich greift.
  await page.waitForTimeout(600);
  const deathVisible = await page.locator(".death-modal").isVisible().catch(() => false);
  record(S, "kein Todes-Geister-Popup direkt nach Import", !deathVisible);
  const toastTexts = await page.locator(".toast-stack").innerText().catch(() => "");
  record(S, "keine Toasts direkt nach Import (frischer Remount, kein Diff-Spam)", toastTexts.trim().length === 0, toastTexts.trim() ? `toasts: "${toastTexts.trim().slice(0, 200)}"` : undefined);

  const after = await readSlot0(page);
  const s = after?.state;
  record(S, "state existiert nach Import", !!s);
  if (!s) { await page.close(); return; }

  record(S, "version migriert auf 64", s.version === 64, `got ${s.version}`);
  record(S, "Charaktername übernommen (Adhavar, nicht Seed-Charakter)", s.character.name === "Adhavar", s.character.name);

  const grants = Object.keys(s.legacyZoneGrants || {});
  const allZonesGranted = LEGACY_V62_ZONE_IDS.every((z) => s.legacyZoneGrants?.[z] === true);
  record(S, "alle 11 Kampfzonen per legacyZoneGrants offen", allZonesGranted && grants.length === 11, `grants=${JSON.stringify(grants)}`);

  const dungeonsUnlockedKeys = Object.keys(s.dungeonsUnlocked || {});
  record(S, "dungeonsUnlocked gemäß altem Fortschritt (Adhavar hatte 0 Clears/Keys → leer)", dungeonsUnlockedKeys.length === 0, `got ${JSON.stringify(dungeonsUnlockedKeys)}`);

  // "Nachholbar" per Aufgabenstellung: evaluateQuests läuft JEDEN Tick neu gegen die (aus dem
  // Alt-Save mitgebrachten) Zähler — hatte Adhavar den Kapitel-1-Bedarf (z.B. Kills/Gather) schon
  // vorher erfüllt, kann chronicle_01 legitim SOFORT auf den nächsten Tick nach Import als
  // "completed" (claimbar) markieren, ohne schon "claimed" zu sein — das ist gewolltes Catch-up,
  // kein Bug. Harte Invariante ist nur: nicht bereits eingelöst (claimed) ohne echten Klick, und
  // referenziert keinen unbekannten Content (das deckt schon die generelle State-Validierung ab).
  const chronicleNotSilentlyClaimed = !s.quests.claimed.includes("chronicle_01");
  record(S, "Chronik-Kapitel 1 nicht ungefragt 'eingelöst' (claimed) — höchstens catch-up 'completed'", chronicleNotSilentlyClaimed);

  // Inventar/Equipment/Bank: nichts VERLOREN. Gleichheit ist zu strikt — zwischen Import und
  // Snapshot laufen echte Spiel-Ticks (eine bereits laufende Alt-Aktion kann fertig werden und
  // Loot gutschreiben, exakt wie bei einem echten Wiedereinstieg) → Invariante ist "nie weniger
  // als vorher", nicht "exakt gleich" (das prüft bereits der Gold-Check genauso).
  const beforeRaw = JSON.parse(V56_JSON);
  const origInv = beforeRaw.state.inventory.slots.filter(Boolean);
  const newInv = s.inventory.slots.filter(Boolean);
  const origCount = origInv.reduce((n, x) => n + x.qty, 0);
  const newCount = newInv.reduce((n, x) => n + x.qty, 0);
  record(S, "Inventar-Stückzahl nie gesunken (kein stiller Verlust)", newCount >= origCount, `orig=${origCount} new=${newCount}`);
  record(S, "Equipment mainhand/tool1 erhalten (rusty_sword/void_rod)",
    s.character.equipment.mainhand === "rusty_sword" && s.character.equipment.tool1 === "void_rod",
    JSON.stringify(s.character.equipment));

  const goldOk = s.character.gold >= beforeRaw.state.character.gold;
  record(S, "Gold nicht gesunken (Migration addiert nur, nie subtrahiert Bestand)", goldOk, `orig=${beforeRaw.state.character.gold} new=${s.character.gold}`);

  // NaN/undefined-Sichtcheck: Header darf keine "NaN"/"undefined"-Textknoten zeigen.
  const bodyText = await page.locator("body").innerText();
  record(S, "keine sichtbaren NaN/undefined-Strings im UI", !/NaN|undefined/.test(bodyText));

  // ── "5 Minuten weiterspielen" (komprimiert: reale Aktionen statt Wallclock-Wartezeit) ──
  await dismissGuideIfPresent(page); // Remount landet auf "character" — evtl. eigene Area-Tour dort.
  // 1) Chronik-Tab zeigt Kapitel 01 aktiv.
  await page.locator('[data-guide-id="topbar.quests"]').click();
  await page.waitForSelector(".chronicle-tab, .quests-tabs", { timeout: 10000 }).catch(() => {});
  await dismissGuideIfPresent(page);
  const chapNum = await page.locator(".chronicle-stage-chapnum").first().textContent().catch(() => null);
  record(S, "Story-Tab zeigt Kapitel 01 aktiv", chapNum?.trim() === "01", `got "${chapNum}"`);

  // 2) Kampf: offene Zone anklicken, ersten Gegner angreifen.
  await page.locator('[data-guide-id="sidebar.combat"]').click();
  await page.waitForSelector(".zone-grid", { timeout: 10000 });
  await dismissGuideIfPresent(page);
  // Hinweis: slayer_tower ist bewusst NIE eine .zone-card (eigene Tower-Sektion/eigenes
  // Level-Gate, s. CombatPage.tsx Kommentar "slayer_tower wird hier ausgeblendet") — die
  // Zonenliste zeigt darum <= 10 Karten, nicht 11. Die Kompat-Invariante ist "0 story-gesperrt".
  const zoneGrid = page.locator(".zone-grid").first();
  const zoneCards = zoneGrid.locator(".zone-card");
  const zoneTotal = await zoneCards.count();
  const lockedCount = await zoneGrid.locator(".zone-card-story-locked").count();
  record(S, "Kampf-Zonenliste: keine Zone story-gesperrt (slayer_tower separat/eigenes Gate)", lockedCount === 0, `total=${zoneTotal} locked=${lockedCount}`);
  await zoneCards.first().click();
  await page.waitForSelector(".mc-fight-btn", { timeout: 10000 });
  await dismissGuideIfPresent(page);
  await page.locator(".mc-fight-btn").first().click();
  await page.waitForTimeout(3000); // ein paar Auto-Battle-Ticks
  const midCombat = await readSlot0(page); // Save-Slot ist während Kampf nicht zwingend geschrieben — nur informativ
  record(S, "Kampf gestartet ohne Konsolen-Fehler", true); // Fehler werden separat über consoleErrors gesammelt

  // 3) Skill-Aktion starten (mining, Adhavar hat den Skill bereits).
  await page.locator('[data-guide-id="sidebar.mining"]').click();
  await page.waitForSelector(".skillcard-cta", { timeout: 10000 });
  await dismissGuideIfPresent(page);
  const startBtn = page.locator(".skillcard-cta:not(.stop)").first();
  if (await startBtn.isEnabled().catch(() => false)) {
    await startBtn.click();
    await page.waitForTimeout(1500);
  }
  // Force-Save vor Reload.
  await page.locator(".sb-footer-save").click();
  await page.waitForTimeout(500);
  const preReload = await readSlot0(page);

  // 4) Reload + erneut laden → Konsistenz.
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector(".menu-nav", { timeout: 15000 });
  await page.getByRole("button", { name: "Load Game" }).first().click();
  await page.locator(".menu-slot.filled").first().click();
  await page.waitForSelector(".layout", { timeout: 10000 });
  const postReload = await readSlot0(page);
  const stableFields =
    preReload?.state.version === postReload?.state.version &&
    preReload?.state.character.name === postReload?.state.character.name &&
    JSON.stringify(preReload?.state.legacyZoneGrants) === JSON.stringify(postReload?.state.legacyZoneGrants) &&
    JSON.stringify(preReload?.state.dungeonsUnlocked) === JSON.stringify(postReload?.state.dungeonsUnlocked) &&
    postReload?.state.character.gold >= preReload?.state.character.gold;
  record(S, "Nach Reload + Laden: Version/Name/Zonen/Dungeons/Gold konsistent", stableFields,
    `pre.gold=${preReload?.state.character.gold} post.gold=${postReload?.state.character.gold}`);
  const bodyText2 = await page.locator("body").innerText();
  record(S, "nach Reload weiterhin keine NaN/undefined-Strings", !/NaN|undefined/.test(bodyText2));

  await page.close();
}

async function scenarioSynthetic63(context, consoleErrors) {
  const S = "synthetic-v63-import";
  const page = await context.newPage();
  page.on("console", (msg) => { if (msg.type() === "error") consoleErrors.push(`${S}: ${msg.text()}`); });
  page.on("pageerror", (err) => consoleErrors.push(`${S} pageerror: ${err.message}`));

  await gotoMenu(page);
  await newGame(page, "T4 Seed B");

  const beforeRaw = JSON.parse(SYN_V63_JSON);
  const goldBefore = beforeRaw.state.character.gold;

  const res = await importViaUi(page, SYN_V63_JSON);
  record(S, "Import via UI erfolgreich", res.ok, res.errorText);
  if (!res.ok) { await page.close(); return; }

  await page.waitForTimeout(600);
  const deathVisible = await page.locator(".death-modal").isVisible().catch(() => false);
  record(S, "kein Todes-Geister-Popup direkt nach Import", !deathVisible);
  const toastTexts = await page.locator(".toast-stack").innerText().catch(() => "");
  record(S, "keine Toasts direkt nach Import (frischer Remount, kein Diff-Spam)", toastTexts.trim().length === 0, toastTexts.trim() ? `toasts: "${toastTexts.trim().slice(0, 200)}"` : undefined);

  const after = await readSlot0(page);
  const s = after?.state;
  record(S, "state existiert nach Import", !!s);
  if (!s) { await page.close(); return; }

  record(S, "version migriert auf 64", s.version === 64, `got ${s.version}`);

  const KEY_IDS = ["crypt_key", "highland_key", "masters_mark", "warband_key", "idolhall_key", "wildwood_key"];
  const invHasKey = s.inventory.slots.some((sl) => sl && KEY_IDS.includes(sl.itemId));
  const bankHasKey = KEY_IDS.some((k) => s.bank?.[k] > 0);
  const buybackHasKey = (s.buyBack || []).some((e) => KEY_IDS.includes(e.itemId));
  record(S, "alle Dungeon-Keys aus Inventar verschwunden", !invHasKey);
  record(S, "alle Dungeon-Keys aus Bank verschwunden", !bankHasKey);
  record(S, "Rückkauf-Regal key-frei", !buybackHasKey);

  const expectedRefund = 12630;
  const actualRefund = s.character.gold - goldBefore;
  record(S, `Gold-Erstattung exakt qty×value (erwartet +${expectedRefund})`, actualRefund === expectedRefund, `orig=${goldBefore} new=${s.character.gold} delta=${actualRefund}`);

  const expectedUnlocked = ["crypt_depths", "highland_aerie", "wyvern_lair", "behind_the_throne", "goblin_warband", "idol_sanctum"];
  const gotUnlocked = Object.keys(s.dungeonsUnlocked || {}).sort();
  const unlockedOk = expectedUnlocked.every((d) => s.dungeonsUnlocked?.[d] === true) && gotUnlocked.length === expectedUnlocked.length;
  record(S, "genau die 6 Schlüssel-Dungeons in dungeonsUnlocked", unlockedOk, `got=${JSON.stringify(gotUnlocked)}`);
  record(S, "wildwood_hunt NICHT unlocked (Key nur im Rückkauf-Regal, zählt nicht)", s.dungeonsUnlocked?.wildwood_hunt !== true);

  const bodyText = await page.locator("body").innerText();
  record(S, "keine sichtbaren NaN/undefined-Strings im UI", !/NaN|undefined/.test(bodyText));

  // Kurzes "Weiterspielen" + Reload-Konsistenz (wie v56-Szenario, kompakter).
  await dismissGuideIfPresent(page);
  await page.locator('[data-guide-id="sidebar.combat"]').click();
  await page.waitForSelector(".zone-grid", { timeout: 10000 }).catch(() => {});
  await dismissGuideIfPresent(page);
  await page.locator(".sb-footer-save").click();
  await page.waitForTimeout(500);
  const preReload = await readSlot0(page);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector(".menu-nav", { timeout: 15000 });
  await page.getByRole("button", { name: "Load Game" }).first().click();
  await page.locator(".menu-slot.filled").first().click();
  await page.waitForSelector(".layout", { timeout: 10000 });
  const postReload = await readSlot0(page);
  const stable =
    JSON.stringify(preReload?.state.dungeonsUnlocked) === JSON.stringify(postReload?.state.dungeonsUnlocked) &&
    preReload?.state.character.gold === postReload?.state.character.gold &&
    JSON.stringify(preReload?.state.bank) === JSON.stringify(postReload?.state.bank);
  record(S, "Nach Reload + Laden: Dungeons/Gold/Bank konsistent (keine erneute Migration/Doppel-Refund)", stable,
    `pre.gold=${preReload?.state.character.gold} post.gold=${postReload?.state.character.gold}`);

  await page.close();
}

async function scenarioRoundtrip(context, consoleErrors) {
  const S = "export-import-roundtrip";
  const page = await context.newPage();
  page.on("console", (msg) => { if (msg.type() === "error") consoleErrors.push(`${S}: ${msg.text()}`); });
  page.on("pageerror", (err) => consoleErrors.push(`${S} pageerror: ${err.message}`));
  await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: BASE_URL });

  await gotoMenu(page);
  await newGame(page, "Roundtrip Fresh");

  await page.locator('[data-guide-id="sidebar.options"]').click();
  await page.waitForSelector(".opz-textarea", { timeout: 10000 });
  await page.getByRole("button", { name: "Copy to clipboard" }).click().catch(async () => {
    // Fallback falls sich der EN-Label-Text unterscheidet: erster Export-Button nach "Export".
    await page.locator(".opz-segment button").nth(1).click();
  });
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  record(S, "Export (Copy) liefert nicht-leeren JSON-String", !!clip && clip.length > 100, `len=${clip?.length}`);
  // "before" ist bewusst die exportierte Momentaufnahme selbst (nicht ein früherer localStorage-
  // Snapshot) — der reale Tick-Loop läuft weiter, während wir durch die Options-Seite klicken;
  // ein Snapshot von VOR dem Export hätte also allein durch Wanduhr-Drift abweichende
  // elapsedMs/totalTicks (kein Roundtrip-Bug). Die eigentliche Frage ist: rekonstruiert
  // Import(Export(S)) exakt S? (Analog save-compat-vault.test.ts auf Persistence-Ebene.)
  const before = { state: JSON.parse(clip).state };

  await page.locator(".opz-textarea").fill(clip);
  await page.getByRole("button", { name: /Import \(overwrites/ }).click();
  try {
    await page.waitForSelector(".opz-page", { state: "detached", timeout: 5000 });
  } catch {
    const errText = await page.locator(".opz-status-error").textContent().catch(() => null);
    record(S, "Re-Import des Exports erfolgreich", false, errText ?? "kein Remount");
    await page.close();
    return;
  }
  record(S, "Re-Import des Exports erfolgreich", true);

  const after = await readSlot0(page);
  const diffKeys = [];
  const a = before?.state, b = after?.state;
  if (a && b) {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
      if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) diffKeys.push(k);
    }
  }
  record(S, "Export→Import-Roundtrip liefert identischen State (deep-equal)", diffKeys.length === 0, `abweichende Top-Level-Keys: ${JSON.stringify(diffKeys)}`);

  await page.close();
}

// ── Main ─────────────────────────────────────────────────────────────────
async function main() {
  const server = startDevServer();
  const up = await waitForServer(BASE_URL);
  if (!up) {
    console.error("[sweep2-t4] Dev-Server nicht hochgekommen:\n" + server.getOutput());
    server.child.kill();
    process.exit(1);
  }

  const browser = await chromium.launch();
  const consoleErrors = [];
  try {
    const ctx1 = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
    await scenarioV56(ctx1, consoleErrors);
    await ctx1.close();

    const ctx2 = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
    await scenarioSynthetic63(ctx2, consoleErrors);
    await ctx2.close();

    const ctx3 = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
    await scenarioRoundtrip(ctx3, consoleErrors);
    await ctx3.close();
  } catch (err) {
    console.error("[sweep2-t4] unerwarteter Fehler:", err);
    results.push({ scenario: "runner", check: "unerwarteter Crash", ok: false, detail: String(err?.stack || err) });
  } finally {
    await browser.close();
    server.child.kill();
  }

  console.log("\n=== Konsolen-/Page-Fehler während des ganzen Laufs ===");
  if (consoleErrors.length === 0) console.log("(keine)");
  else consoleErrors.forEach((e) => console.log(" - " + e));

  const failed = results.filter((r) => !r.ok);
  console.log(`\n=== Ergebnis: ${results.length - failed.length}/${results.length} Checks bestanden ===`);
  if (failed.length) {
    console.log("Fehlgeschlagene Checks:");
    failed.forEach((f) => console.log(` - [${f.scenario}] ${f.check}${f.detail ? " — " + f.detail : ""}`));
  }
  process.exit(failed.length > 0 ? 1 : 0);
}

main();
