#!/usr/bin/env node
/**
 * Marketing-Rohmaterial für die 0.3.0-Sichtbarkeitsrunde — hochauflösende Screenshots + Videoclips.
 * KEIN Produktivcode: nur ein Wegwerf-Playwright-Skript nach dem etablierten ui-audit-Muster
 * (eigener Vite-Dev-Server + Chromium, NIEMALS Electron, Pattern 1:1 aus sim-harness.mjs /
 * newhaven-audit-335.mjs übernommen — s. BOT-GUIDE.md).
 *
 * Fixtures: `nh_map_audit` (unverändert, sehr guter Mix aus entdeckt/Silhouette + starker Endgame-
 * Charakter) für Bestiarium/Zonen/Skills/Kampf; `mkt_camp` (chirurgisch aus nh_map_audit abgeleitet,
 * camp-Feld komplett ersetzt: alle 15 Lager-Gebäude platziert, kollisionsfrei über die ECHTE
 * Kartengeografie verteilt — s. packages/shared/src/index.ts Zeilen 6280-6292: Waldhang oben-links,
 * Felswand oben-rechts, Bach+Brücke unten-links, Palisade unten-rechts) für die Lager-Motive.
 * Beide Fixtures liegen in ui-audit/fixtures/ UND src/renderer/public/ui-audit-fixtures/.
 *
 * Ausgabe: G:\GameDev\marketing\0.3.0-media\{screenshots,clips}\
 *
 * Run (aus apps/client/):
 *   node ui-audit/mkt-0.3.0-media.mjs list
 *   node ui-audit/mkt-0.3.0-media.mjs <motif> [<motif> ...]
 *   node ui-audit/mkt-0.3.0-media.mjs all
 */
import { spawn } from "node:child_process";
import { mkdirSync, renameSync, existsSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const CONFIG_PATH = join(__dirname, "sim-harness.vite.config.mjs");
const PORT = 5391; // außerhalb des bot.mjs-Reservats 5340-5359 (parallele Bot-Sweeps liefen heute dort)
const BASE_URL = `http://localhost:${PORT}`;

const OUT_ROOT = "G:\\GameDev\\marketing\\0.3.0-media";
const SHOT_DIR = join(OUT_ROOT, "screenshots");
const CLIP_DIR = join(OUT_ROOT, "clips");
const CLIP_TMP = join(OUT_ROOT, "_raw");
mkdirSync(SHOT_DIR, { recursive: true });
mkdirSync(CLIP_DIR, { recursive: true });
mkdirSync(CLIP_TMP, { recursive: true });

const DEBUG_HIDE_CSS = `
  .nh-debug-light, .nh-debug-toggle, .nh-debug-complete, .nh-debug-free-note {
    opacity: 0 !important;
  }
`;

// ── dev server ────────────────────────────────────────────────────────────────────────────────
function startDevServer() {
  const viteBin = join(CLIENT_DIR, "node_modules", "vite", "bin", "vite.js");
  const child = spawn(
    process.execPath,
    [viteBin, "dev", "--config", CONFIG_PATH, "--port", String(PORT), "--strictPort"],
    { cwd: CLIENT_DIR, stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, SIM_HARNESS_HMR: "0" } },
  );
  let out = "";
  child.stdout.on("data", (d) => (out += d.toString()));
  child.stderr.on("data", (d) => (out += d.toString()));
  return { child, getOutput: () => out };
}

async function waitForServer(url, timeoutMs = 40000) {
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

// ── page helpers ──────────────────────────────────────────────────────────────────────────────

/** Neue Context+Page, optional mit Video-Aufnahme. Jeder Aufruf = frischer Storage (kein State-
 * Bluten zwischen Motiven), lädt die Fixture direkt über ?fixture=<name>. */
async function openPage(browser, { fixture, viewport = { width: 1920, height: 1080 }, deviceScaleFactor = 1, record = null, locale = "en" }) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor,
    recordVideo: record ? { dir: record.dir, size: record.size ?? viewport } : undefined,
  });
  await context.addInitScript((loc) => {
    try {
      localStorage.setItem("hearthforge:locale", loc);
    } catch {
      /* noop */
    }
  }, locale);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console: ${m.text()}`);
  });
  const url = fixture ? `${BASE_URL}/?fixture=${encodeURIComponent(fixture)}` : BASE_URL;
  await page.goto(url, { waitUntil: "load" });
  await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
  await page.waitForFunction(() => !!window.__hfDebug, null, { timeout: 8000 });
  await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(2000); // StrictMode-Doppelmount absorbieren (sim-harness Lektion 2)
  // Onboarding-Guide-Overlay (z.B. "Neu: New Haven") dimmt+blockt die ganze Seite, falls die
  // Fixture einen Tour-Key nicht in toursSeen hat — hart abschalten, kein Marketing-Screenshot
  // soll je ein Tutorial-Popup zeigen.
  await evalDebug(page, (state) => {
    if (state.onboarding) {
      state.onboarding.active = false;
      state.onboarding.toursSeen = {
        ...state.onboarding.toursSeen,
        featureTourV1: true,
        featureTourV2: true,
        combat: true,
        shop: true,
        bank: true,
      };
    }
  }).catch(() => {});
  await page.waitForTimeout(300);
  await dismissAnyTour(page);
  await page.addStyleTag({ content: DEBUG_HIDE_CSS });
  return { context, page, errors };
}

/** Playwright zeichnet ab Context-ERSTELLUNG auf — Vite-Ladezeit, Fixture-Boot, Onboarding-Dismiss
 * etc. landen mit im Rohvideo. ERST versucht: vom ENDE her zurückschneiden (`-sseof` mit
 * `-c copy`, dann neu-kodierend mit einer per ffprobe geschätzten Gesamtlänge) — beides unbrauchbar,
 * weil (a) `-c copy` nur an spärlichen VP8-Keyframes schneiden kann und (b) ffprobes
 * `format=duration` für dieses fortlaufend geschriebene webm sich als ungenau erwiesen hat (der
 * Schnitt landete beobachtet mehrere Sekunden zu früh, das kurz aufblitzende Onboarding-Tour-
 * Overlay blieb sichtbar). Robuste Lösung: NICHT vom Ende her schätzen, sondern vom ANFANG her um
 * die exakt GEMESSENE Setup-Dauer (`trimStartSec`, eigene `Date.now()`-Differenz im Skript, kein
 * Video-Metadata-Vertrauen) schneiden — `-ss` NACH `-i` (Decode+Discard, kein `-c copy`) ist dafür
 * frame-genau, der Rest läuft einfach bis EOF durch. */
async function closeVideo(context, page, targetPath, trimStartSec = null) {
  await page.close();
  const video = page.video();
  await context.close();
  const tmpPath = await video.path();
  mkdirSync(dirname(targetPath), { recursive: true });
  if (!trimStartSec) {
    renameSync(tmpPath, targetPath);
    console.log("CLIP SAVED:", targetPath);
    return;
  }
  await new Promise((resolve, reject) => {
    const ff = spawn(
      "ffmpeg",
      ["-y", "-i", tmpPath, "-ss", String(trimStartSec), "-c:v", "libvpx", "-b:v", "3M", "-crf", "10", targetPath],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    let err = "";
    ff.stderr.on("data", (d) => (err += d.toString()));
    ff.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exit ${code}: ${err.slice(-800)}`))));
  });
  console.log("CLIP SAVED (getrimmt):", targetPath, `(erste ${trimStartSec.toFixed(1)}s Setup abgeschnitten)`);
}

function evalDebug(page, fn) {
  return page.evaluate((src) => {
    const dbg = window.__hfDebug;
    if (!dbg) throw new Error("window.__hfDebug missing");
    // eslint-disable-next-line no-eval
    const reconstructed = (0, eval)(`(${src})`);
    return reconstructed(dbg.state);
  }, fn.toString());
}

/** Chef-Vorgabe (Korrektur während des Laufs): JEDER finale Screenshot muss exakt 1920×1080 Pixel
 * sein — keine 3440×1440-Varianten, kein DSF2-Rohformat (3840×2160) als Endergebnis. Nimmt bei
 * DSF>1 (schärfer dank Supersampling) trotzdem auf, skaliert das Rohbild danach aber IMMER
 * verlustarm auf 1920×1080 (Lanczos `scale`+`crop`, uniform — kein Verzerren; bei Element-Shots,
 * deren Seitenverhältnis nicht exakt 16:9 trifft, wird minimal beschnitten statt gestreckt).
 *
 * codex:2026-08-03T (Verfeinerungsrunde) — optionaler `zoomFrac` (0 < f < 1): schneidet VOR dem
 * finalen Resize einen zentrierten Ausschnitt von `f`×Breite/Höhe aus der Rohaufnahme (gleicher
 * Faktor auf beiden Achsen → Seitenverhältnis bleibt 16:9, keine Verzerrung). Dient dem Chef-Wunsch
 * "die Karte darf das Bild FÜLLEN" — komponiert enger auf den warmen Lager-Kern statt die ganze,
 * dünn besiedelte Lichtung zu zeigen. */
async function finalizeTo1080p(rawPath, finalPath, zoomFrac = null) {
  const cropStage = zoomFrac ? `crop=iw*${zoomFrac}:ih*${zoomFrac}:(iw-iw*${zoomFrac})/2:(ih-ih*${zoomFrac})/2,` : "";
  await new Promise((resolve, reject) => {
    const ff = spawn(
      "ffmpeg",
      ["-y", "-i", rawPath, "-vf", `${cropStage}scale=1920:1080:force_original_aspect_ratio=increase:flags=lanczos,crop=1920:1080`, "-frames:v", "1", finalPath],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    let err = "";
    ff.stderr.on("data", (d) => (err += d.toString()));
    ff.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exit ${code}: ${err.slice(-800)}`))));
  });
  if (rawPath !== finalPath) rmSync(rawPath, { force: true });
}

async function shot(page, name, opts = {}) {
  const finalPath = join(SHOT_DIR, name.endsWith(".png") ? name : `${name}.png`);
  const rawPath = join(SHOT_DIR, `_raw-${name.endsWith(".png") ? name : `${name}.png`}`);
  await page.screenshot({ path: rawPath, fullPage: false, ...opts });
  await finalizeTo1080p(rawPath, finalPath);
  console.log("SHOT SAVED (1920x1080):", finalPath);
  return finalPath;
}

async function elShot(locator, name, zoomFrac = null) {
  const finalPath = join(SHOT_DIR, name.endsWith(".png") ? name : `${name}.png`);
  const rawPath = join(SHOT_DIR, `_raw-${name.endsWith(".png") ? name : `${name}.png`}`);
  await locator.screenshot({ path: rawPath });
  await finalizeTo1080p(rawPath, finalPath, zoomFrac);
  console.log("SHOT SAVED (1920x1080):", finalPath);
  return finalPath;
}

/** Klickt den Sidebar- ODER TopBar-Nav-Button einer page-id (Muster aus bot.mjs actGoto — manche
 * Seiten wie bestiary/mastery/character/companions/achievements/quests hängen in der TopBar, der
 * Rest in der linken Sidebar; beide tragen data-guide-id="<ort>.<id>"). */
/** UI-seitiger Fallback zum State-Patch in openPage(): manche Touren (z.B. featureTourV2s Schritt
 * "sidebar.newhaven anklicken") triggern erst bei echter Navigation zur beworbenen Seite, nicht
 * beim initialen Fixture-Load — ein reiner State-Patch VOR der Navigation reicht dafür nicht.
 * Klickt "Skip" (`.guide-bubble-skip`), so oft ein Tour-Overlay sichtbar ist (mehrere Touren
 * können hintereinander hängen, z.B. v1 dann v2). */
async function dismissAnyTour(page, maxTries = 5) {
  for (let i = 0; i < maxTries; i++) {
    const skip = page.locator(".guide-bubble-skip");
    if ((await skip.count()) === 0) return;
    await skip.first().click({ timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(250);
  }
}

async function gotoPage(page, id) {
  const sidebarSel = `[data-guide-id="sidebar.${id}"]`;
  const topbarSel = `[data-guide-id="topbar.${id}"]`;
  const sel = (await page.locator(sidebarSel).count()) > 0 ? sidebarSel : topbarSel;
  await page.locator(sel).first().click({ timeout: 8000 });
  await page.waitForTimeout(400);
  await dismissAnyTour(page);
}

async function gotoNewHaven(page) {
  await page.locator('[data-guide-id="sidebar.newhaven"]').first().click({ timeout: 8000 });
  await page.waitForSelector(".nh-map", { timeout: 10000 });
  await page.waitForTimeout(400);
  await dismissAnyTour(page);
}

async function setLightPhase(page, target) {
  for (let i = 0; i < 4; i++) {
    const cur = await page.locator(".nh-map").getAttribute("data-light-phase");
    if (cur === target) return true;
    await page.locator(".nh-debug-light").click({ timeout: 4000 });
    await page.waitForTimeout(150);
  }
  return (await page.locator(".nh-map").getAttribute("data-light-phase")) === target;
}

async function mapRect(page) {
  return page.locator(".nh-map-bg").boundingBox();
}
function fracToPx(rect, frac) {
  return { x: rect.x + frac.x * rect.width, y: rect.y + frac.y * rect.height };
}

// ── motifs: screenshots ──────────────────────────────────────────────────────────────────────

const STD_RES = { width: 1920, height: 1080 };

// codex:2026-08-03T (Verfeinerungsrunde) — Chef-Sichtprüfung des ersten Laufs fand drei Probleme:
// (1) ein Gerüst-Fortschrittsbalken ohne erkennbares Gebäude im Nacht-Shot (die alte `mkt_camp`-
// Fixture hatte einen dauerhaften `buildJob`, der Rest-Bauzeit 10h betrug — im 5×3-Raster stand er
// weit unter seinem kleinen, im Dunkeln kaum sichtbaren Gerüst); (2) ein reines Kästchenraster (5
// exakt gleichmäßige Spalten × 3 Zeilen); (3) nur EIN echtes Glutlicht in der ganzen Szene — ein
// Pixel-Scan aller 15 `_3_night.webp`-Sprites (jedes Pixel, Schwelle r>150 & r-b>60 & r>g+10) fand
// NUR bei `camp_smelter` einen echten Ember-Cluster (2 Ofenmäuler, ~28 kräftige warme Pixel); alle
// anderen (inkl. Zentralhaus/Räucherhaus) sind komplett kalt — der einzige weitere warme Fleck ist
// ein fest ins Kartenbild `camp_map_night.webp` gebackener Lagerfeuer-Fleck am Kartenmittelpunkt
// (~49%/47%), unabhängig davon, welches Gebäude dort steht. Fix: `mkt_camp.json`s `positions` sind
// jetzt eine gewachsene Siedlung (dichter Kern um camp_townhall — bewusst AUF den Lagerfeuer-Fleck
// gesetzt, s.o. — plus Schrein/Ahnenwand/Schreiberzelt/Lagerhaus/Handelsposten ringsum ohne
// Rasterausrichtung; Schmelzofen+Stollen an der Felswand, Sägegrube+Fischerhütte am Bach,
// Wachturm am Waldrand, Saatgarten an der Palisade), `buildJob` ist in der Basis-Fixture NULL
// (kein Balken ohne Gebäude im sauberen Nacht-Hero-Shot) und ein `zoomFrac`-Crop holt den warmen
// Kern näher heran, damit die Karte das Bild füllt statt eine dünn besiedelte Lichtung zu zeigen.
const CAMP_ZOOM_FRAC = 0.82;

async function motifCampNight(browser) {
  const { context, page } = await openPage(browser, { fixture: "mkt_camp", viewport: STD_RES, deviceScaleFactor: 2 });
  await gotoNewHaven(page);
  await setLightPhase(page, "night");
  await page.waitForTimeout(1500);
  await elShot(page.locator(".nh-map"), `01-newhaven-night-1920x1080`, CAMP_ZOOM_FRAC);
  await context.close();
}

async function motifCampDay(browser) {
  const { context, page } = await openPage(browser, { fixture: "mkt_camp", viewport: STD_RES, deviceScaleFactor: 2 });
  await gotoNewHaven(page);
  await setLightPhase(page, "day");
  // Die "lebende Baustelle" gehört NUR in den Tag-Shot: camp_fence_tent läuft hier temporär (reiner
  // Runtime-State-Patch, s. evalDebug-Muster unten) auf Stufe II mit aktivem Ausbau nach III — Gerüst
  // UND Fortschrittsbalken sitzen direkt auf derselben Kachel, also klar erkennbar zusammengehörig.
  await evalDebug(page, (state) => {
    state.camp.buildings.camp_fence_tent = 2;
    state.camp.buildJob = { buildingId: "camp_fence_tent", targetLevel: 3, remainingMs: 36000000 };
  });
  await page.waitForTimeout(1500);
  await elShot(page.locator(".nh-map"), `02-newhaven-day-construction-1920x1080`, CAMP_ZOOM_FRAC);
  await context.close();
}

async function motifBestiary(browser) {
  const { context, page } = await openPage(browser, { fixture: "nh_map_audit", viewport: STD_RES, deviceScaleFactor: 2 });
  await gotoPage(page, "bestiary");
  await page.waitForSelector(".bjw-band", { timeout: 10000 });
  await page.waitForTimeout(1000);
  // an den Übergang pastures(voll) -> borderlands(voll) -> ashfields(voll) -> blackthorn(Mix) scrollen,
  // damit ein Silhouetten-Band mit im Bild ist (2-3 Bänder, entdeckt+unentdeckt gemischt).
  await page.evaluate(() => {
    const bands = document.querySelectorAll(".bjw-band");
    const target = bands[2]; // ashfields (0=pastures,1=borderlands,2=ashfields,3=blackthorn)
    target?.scrollIntoView({ block: "start" });
  });
  await page.waitForTimeout(1200);
  await shot(page, `03-bestiary-journey-1920x1080`);
  await context.close();
}

async function motifZones(browser) {
  const { context, page } = await openPage(browser, { fixture: "nh_map_audit", viewport: STD_RES, deviceScaleFactor: 2 });
  await gotoPage(page, "combat");
  await page.waitForSelector(".zone-grid", { timeout: 10000 });
  await page.waitForTimeout(1200);
  await shot(page, `04-zones-overview-1920x1080`);
  await context.close();
}

async function motifCombat(browser) {
  const { context, page } = await openPage(browser, { fixture: "nh_map_audit", viewport: STD_RES, deviceScaleFactor: 2 });
  await gotoPage(page, "combat");
  await page.waitForSelector(".zone-grid", { timeout: 10000 });
  // Direkt in den Endboss-Encounter des Goblin-Warband-Dungeons springen (dungeonOnly-Monster,
  // kein fight-now möglich) — reiner Runtime-State-Patch über __hfDebug, kein Produktivcode.
  await evalDebug(page, (state) => {
    state.dungeonsUnlocked = { ...(state.dungeonsUnlocked || {}), goblin_warband: true };
    state.quests = state.quests || { completed: [], claimed: [] };
    if (!state.quests.completed.includes("chronicle_04")) state.quests.completed.push("chronicle_04");
    state.combat = {
      monsterId: "goblin_warchief",
      enemyHp: 128,
      playerTimerMs: 0,
      enemyTimerMs: 0,
      kills: 4,
      eventCount: 9,
      enemyEffects: [],
      playerEffects: [],
      log: [],
      dungeonId: "goblin_warband",
      encounterIndex: 4,
      petAbility: { timerMs: 0, shieldHp: 0, blockNextHit: false, enemyStunMs: 0, enemyAccDownMs: 0, enemyAccDownPct: 0, enemyVulnMs: 0, enemyVulnPct: 0 },
    };
  });
  await page.waitForTimeout(1500);
  await page.waitForSelector(".battle-arena", { timeout: 8000 }).catch(() => {});
  // Dock einklappen, damit die Bühne dominiert (Design-Kollegin baut die Dock-Styles gerade um).
  const toggle = page.locator(".cl-dock-toggle.cl-dock-toggle--left");
  if (await toggle.count()) await toggle.click({ timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(2500); // ein paar echte Kampf-Ticks abwarten (Floater/Log im Bild)
  await shot(page, `05-combat-goblin-warchief-1920x1080`);
  await context.close();
}

// codex:2026-08-03T (Verfeinerungsrunde) — Zusatzmotiv aus dem Chef-Auftrag: das Frontline-Harness-
// Dock-Redesign ist inzwischen gelandet, Screenshot #5 zeigt es bewusst EINGEKLAPPT (damalige
// Design-Umbau-Vorsicht, s. Kommentar dort) — jetzt lohnt ein zweiter Kampf-Shot mit BEIDEN Docks
// AUSGEKLAPPT (linkes Ausrüstungs-Dock + rechter Battle Record; Default-Zustand ohne Klick, s.
// util/uiPrefs.ts getCombatDockCollapsed/getCombatRecordCollapsed — "1" nur nach explizitem
// Einklappen, ein frischer Context hat leeres localStorage). "endgame"-Fixture (Lv1915,
// vollständiges Godly/Ninth-Warden-Loadout aus 14 Slots) + Runtime-Patch direkt in `drazhan` (den
// Endboss hinter `behind_the_throne`, s. packages/content — bewusst NICHT der frühere
// goblin_warchief, für visuelle Abwechslung UND weil sein Art-Asset (`drazhan.webp`, gekrönter
// Dunkelritter) tatsächlich vorhanden und imposant ist, anders als der Content-Kommentar dort
// vermuten lässt).
async function motifCombatDock(browser) {
  const { context, page } = await openPage(browser, { fixture: "endgame", viewport: STD_RES, deviceScaleFactor: 2 });
  await gotoPage(page, "combat");
  await page.waitForSelector(".zone-grid", { timeout: 10000 });
  await evalDebug(page, (state) => {
    state.dungeonsUnlocked = { ...(state.dungeonsUnlocked || {}), behind_the_throne: true };
    state.quests = state.quests || { completed: [], claimed: [] };
    if (!state.quests.completed.includes("chronicle_19")) state.quests.completed.push("chronicle_19");
    // KEIN künstlicher hp-Boost: der Balken clamped pct auf 100 (Bar() in CombatPage.tsx), ein
    // erfundener Wert würde also nur ein unplausibles Label ("999999 / 640") zeigen, keinen
    // sichereren Balken. Präzedenz Screenshot #5 (goblin_warchief, 3400ms Angriffsintervall, ~4s
    // Wartezeit) landete ohne Patch einen echten Treffer für nur 14 von 208 hp — volles Godly-
    // Loadout hier mitigiert mindestens ebenso gut, die unveränderte Fixture-hp bleibt sicher.
    state.combat = {
      monsterId: "drazhan",
      enemyHp: 6200, // von maxHp 8700 — sichtbar angeschlagen, aber klar noch im Kampf
      playerTimerMs: 0,
      enemyTimerMs: 0,
      kills: 0,
      eventCount: 6,
      enemyEffects: [],
      playerEffects: [],
      log: [],
      dungeonId: "behind_the_throne",
      encounterIndex: 0,
      petAbility: { timerMs: 0, shieldHp: 0, blockNextHit: false, enemyStunMs: 0, enemyAccDownMs: 0, enemyAccDownPct: 0, enemyVulnMs: 0, enemyVulnPct: 0 },
    };
  });
  await page.waitForTimeout(1000);
  await page.waitForSelector(".battle-arena", { timeout: 8000 }).catch(() => {});
  // Bewusst KEIN Dock-Toggle-Klick — beide Docks starten ausgeklappt (frisches localStorage).
  // Wartezeit bewusst KNAPP unter drazhans attackIntervalMs (3500ms, s. packages/content) gehalten
  // (Gesamt ab enemyTimerMs:0 ~1,8s) — der Spieler landet mit seinem schnelleren Timer sicher schon
  // einen echten Treffer (Floater/Log lebendig), der erste (potenziell kräftige, dmg 262 vor
  // Mitigation) Gegenschlag ist zum Aufnahmezeitpunkt aber noch gar nicht fällig — kein Risiko
  // eines One-Shot-Defeat-Overlays im Marketing-Shot.
  await page.waitForTimeout(1700);
  await shot(page, `07-combat-drazhan-dock-1920x1080`);
  await context.close();
}

async function motifSkills(browser) {
  for (const skillId of ["mining", "foraging", "woodcutting"]) {
    const { context, page, errors } = await openPage(browser, { fixture: "nh_map_audit", viewport: STD_RES, deviceScaleFactor: 2 });
    try {
      await gotoPage(page, skillId);
      // manche Skills (z.B. foraging) gruppieren viele Aktionen in einklappbare Kategorien —
      // erste Kategorie aufklappen, falls keine Karte direkt sichtbar ist.
      const hasCard = await page.locator(".skillcard").count();
      if (!hasCard) {
        const firstCategory = page.locator("[class*='category']").first();
        if (await firstCategory.count()) await firstCategory.click({ timeout: 4000 }).catch(() => {});
      }
      await page.waitForSelector(".skillcard", { timeout: 10000 });
      // eine Aktion anstoßen, damit die Karte "lebendig" wirkt (aktiver Zustand/Stop-Button) statt
      // rein idle — erste Karte, 25er-Preset.
      const startBtn = page.locator(".skillcard").first().locator(".skillcard-cta.qty").first();
      if (await startBtn.count()) await startBtn.click({ timeout: 4000 }).catch(() => {});
      // codex:2026-08-03T (Verfeinerungsrunde) — Chef-Sichtprüfung fand hier einen losen "Mist
      // Vigil"-Tooltip über der TopBar in allen 3 Skill-Shots: (10,10) liegt GENAU auf dem
      // Wetter-Buff-Badge unter dem Charakterporträt oben links, die Maus landete also nicht in
      // neutralem Raum, sondern löste DESSEN Hover-Tooltip aus. Zielpunkt jetzt in der leeren
      // Zone zwischen Charakterleiste und Content-Body (kein Hover-Ziel dort).
      await page.mouse.move(960, 215); // Hover-Tooltip des Start-Buttons wieder loslassen, ohne ein neues auszulösen
      await page.waitForTimeout(1800);
      await shot(page, `06-skills-${skillId}-1920x1080`);
    } catch (err) {
      console.log(`  [skills:${skillId}] FEHLER:`, err.message.split("\n")[0]);
      console.log(`  [skills:${skillId}] pageErrors:`, errors.slice(0, 5));
      await shot(page, `_debug-skills-${skillId}-1920x1080`).catch(() => {});
    }
    await context.close();
  }
}

// ── motifs: video clips ──────────────────────────────────────────────────────────────────────

async function clipDayNight(browser) {
  const t0 = Date.now();
  const dir = join(CLIP_TMP, "daynight");
  mkdirSync(dir, { recursive: true });
  const { context, page } = await openPage(browser, {
    fixture: "mkt_camp",
    viewport: STD_RES,
    record: { dir, size: STD_RES },
  });
  await gotoNewHaven(page);
  await setLightPhase(page, "day");
  const trimStartSec = Math.max(0, (Date.now() - t0) / 1000 - 0.3); // 0.3s Vorlauf behalten
  await page.waitForTimeout(2000);
  await page.locator(".nh-debug-light").click({ timeout: 4000 });
  await page.waitForTimeout(8000);
  await closeVideo(context, page, join(CLIP_DIR, "clip-01-day-to-night.webm"), trimStartSec);
}

async function clipCampLife(browser) {
  const t0 = Date.now();
  const dir = join(CLIP_TMP, "camplife");
  mkdirSync(dir, { recursive: true });
  const { context, page } = await openPage(browser, {
    fixture: "mkt_camp",
    viewport: STD_RES,
    record: { dir, size: STD_RES },
  });
  await gotoNewHaven(page);
  await setLightPhase(page, "day");
  const trimStartSec = Math.max(0, (Date.now() - t0) / 1000 - 0.3);
  await page.waitForTimeout(1500);
  const rect = await mapRect(page);
  // sanfte Cursorbewegung über mehrere Gebäude (kein echtes Kamera-Pan möglich — die Karte ist
  // laut Design fix vollständig sichtbar, kein Zoom/Scroll, s. NewHavenPage.tsx-Recherche).
  const stops = [
    { x: 0.50, y: 0.18 }, // townhall
    { x: 0.88, y: 0.18 }, // smelter
    { x: 0.69, y: 0.49 }, // fence_tent
  ];
  for (const s of stops) {
    const p = fracToPx(rect, s);
    await page.mouse.move(p.x, p.y, { steps: 18 });
    await page.waitForTimeout(500);
  }
  // Townhall anklicken -> Popup -> wieder zu.
  const townhall = fracToPx(rect, { x: 0.50, y: 0.18 });
  await page.mouse.click(townhall.x, townhall.y);
  await page.waitForSelector(".nh-popup", { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(1800);
  await page.locator(".nh-popup-close").click({ timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(800);
  // Move-Modus kurz zeigen: Wachturm anwählen und sanft verschieben.
  await page.locator(".nh-move-toggle").click({ timeout: 4000 });
  await page.waitForTimeout(600);
  const watchtower = fracToPx(rect, { x: 0.12, y: 0.18 });
  await page.mouse.move(watchtower.x, watchtower.y, { steps: 10 });
  await page.mouse.down();
  const dest = fracToPx(rect, { x: 0.18, y: 0.30 });
  await page.mouse.move(dest.x, dest.y, { steps: 24 });
  await page.waitForTimeout(600);
  await page.mouse.up();
  await page.waitForTimeout(1200);
  await page.locator(".nh-move-toggle").click({ timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(1000);
  await closeVideo(context, page, join(CLIP_DIR, "clip-02-camp-life.webm"), trimStartSec);
}

async function clipBestiaryJourney(browser) {
  const t0 = Date.now();
  const dir = join(CLIP_TMP, "bestiary");
  mkdirSync(dir, { recursive: true });
  const { context, page } = await openPage(browser, {
    fixture: "nh_map_audit",
    viewport: STD_RES,
    record: { dir, size: STD_RES },
  });
  await gotoPage(page, "bestiary");
  await page.waitForSelector(".bjw-band", { timeout: 10000 });
  await page.waitForTimeout(1500);
  const trimStartSec = Math.max(0, (Date.now() - t0) / 1000 - 0.3);
  const scrollHeight = await page.evaluate(() => {
    const el = document.querySelector(".content-body");
    return el ? el.scrollHeight - el.clientHeight : 0;
  });
  const durationMs = 12000;
  const steps = 120;
  const start = Date.now();
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const y = Math.round(scrollHeight * t);
    await page.evaluate((yy) => document.querySelector(".content-body")?.scrollTo(0, yy), y);
    const elapsed = Date.now() - start;
    const targetElapsed = t * durationMs;
    const wait = targetElapsed - elapsed;
    if (wait > 0) await page.waitForTimeout(wait);
  }
  await page.waitForTimeout(1000);
  await closeVideo(context, page, join(CLIP_DIR, "clip-03-bestiary-journey.webm"), trimStartSec);
}

async function clipCombat(browser) {
  const t0 = Date.now();
  const dir = join(CLIP_TMP, "combat");
  mkdirSync(dir, { recursive: true });
  const { context, page } = await openPage(browser, {
    fixture: "nh_map_audit",
    viewport: STD_RES,
    record: { dir, size: STD_RES },
  });
  await gotoPage(page, "combat");
  await page.waitForSelector(".zone-grid", { timeout: 10000 });
  const trimStartSec = Math.max(0, (Date.now() - t0) / 1000 - 0.3);
  await evalDebug(page, (state) => {
    state.dungeonsUnlocked = { ...(state.dungeonsUnlocked || {}), goblin_warband: true };
    state.quests = state.quests || { completed: [], claimed: [] };
    if (!state.quests.completed.includes("chronicle_04")) state.quests.completed.push("chronicle_04");
    state.combat = {
      monsterId: "goblin_warchief",
      enemyHp: 187,
      playerTimerMs: 0,
      enemyTimerMs: 0,
      kills: 4,
      eventCount: 9,
      enemyEffects: [],
      playerEffects: [],
      log: [],
      dungeonId: "goblin_warband",
      encounterIndex: 4,
      petAbility: { timerMs: 0, shieldHp: 0, blockNextHit: false, enemyStunMs: 0, enemyAccDownMs: 0, enemyAccDownPct: 0, enemyVulnMs: 0, enemyVulnPct: 0 },
    };
  });
  await page.waitForSelector(".battle-arena", { timeout: 8000 }).catch(() => {});
  const toggle = page.locator(".cl-dock-toggle.cl-dock-toggle--left");
  if (await toggle.count()) await toggle.click({ timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(12000); // echte Kampf-Ticks laufen lassen
  await closeVideo(context, page, join(CLIP_DIR, "clip-04-combat-loop.webm"), trimStartSec);
}

// ── dispatch ──────────────────────────────────────────────────────────────────────────────────

const MOTIFS = {
  "camp-night": (b) => motifCampNight(b),
  "camp-day": (b) => motifCampDay(b),
  bestiary: (b) => motifBestiary(b),
  zones: (b) => motifZones(b),
  combat: (b) => motifCombat(b),
  "combat-dock": (b) => motifCombatDock(b),
  skills: (b) => motifSkills(b),
  "clip-daynight": (b) => clipDayNight(b),
  "clip-camplife": (b) => clipCampLife(b),
  "clip-bestiary": (b) => clipBestiaryJourney(b),
  "clip-combat": (b) => clipCombat(b),
};

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args[0] === "list") {
    console.log("Verfügbare Motive:\n" + Object.keys(MOTIFS).map((k) => `  ${k}`).join("\n"));
    return;
  }
  const names = args[0] === "all" ? Object.keys(MOTIFS) : args;
  for (const n of names) {
    if (!MOTIFS[n]) throw new Error(`Unbekanntes Motiv "${n}". "list" für alle Optionen.`);
  }

  const { child, getOutput } = startDevServer();
  try {
    const up = await waitForServer(BASE_URL);
    if (!up) throw new Error(`Dev-Server auf Port ${PORT} kam nicht hoch:\n${getOutput()}`);
    const browser = await chromium.launch();
    try {
      for (const n of names) {
        console.log(`\n=== ${n} ===`);
        const t0 = Date.now();
        await MOTIFS[n](browser);
        console.log(`=== ${n} done in ${Date.now() - t0}ms ===`);
      }
    } finally {
      await browser.close();
    }
  } finally {
    try {
      child.kill();
    } catch {
      /* already dead */
    }
  }
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
