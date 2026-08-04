#!/usr/bin/env node
/**
 * Task #330 verification: 2,5D-Kampfarena-Prototyp "The Pastures" (Chef-GO).
 *
 * Zwei Teile in einem Lauf:
 *   A) Screenshots — Flag AN: Gesamtszene, Treffer-Moment mit Licht, schwebende Balken (inkl. Mana/
 *      Angriffstimer, Task #330d Punkt 6), Status-Effekt-Nahaufnahme (Punkt 7), Kill-Summary-Karte
 *      mit Respawn-Cooldown (Punkt 8), Ultrawide-Gegenprobe (Punkt 1/2/3/4). Flag AUS: Gegenprobe
 *      (klassische 2D-Darstellung, muss unverändert bleiben).
 *   B) Perf — 10s Steady-State-Kampf bei 3440×1440 (Chef-Vorgabe "gegen perf-combat-audit-Muster
 *      messen"), klassisch vs. Arena25D, Long-Tasks + Frame-Zeiten (identische `measure()`/
 *      `report()`-Logik wie perf-combat-audit.mjs, hier dupliziert statt importiert — das
 *      Referenz-Skript ist selbst kein Modul).
 *
 * NUR gegen den DEV-Server (`vite dev`) — `?fixture=<name>` ist `import.meta.env.DEV`-gegated,
 * genau wie arena25d selbst (s. components/arena25d/flag.ts). Ein echter Production-Build wird
 * separat per Bundle-Grep verifiziert (s. Abschlussbericht "Bundle-Beweis"), nicht hier.
 *
 * Run: node ui-audit/arena25d-verify-330.mjs   (from apps/client/)
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5330;
const BASE_URL = `http://localhost:${PORT}`;
const OUT_DIR = join(__dirname, "_shots-330");
const WINDOW_MS = Number(process.env.PERF_WINDOW_MS) || 10_000;

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

async function routeFixture(page, fixtureName, mutator) {
  await page.route(`**/ui-audit-fixtures/${fixtureName}.json`, async (route) => {
    const res = await route.fetch();
    const json = JSON.parse(await res.text());
    json.state.onboarding = {
      ...(json.state.onboarding ?? {}),
      active: false,
      toursSeen: { combat: true, shop: true, bank: true, featureTourV1: true },
    };
    mutator(json.state);
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(json) });
  });
}

/** bull_boss ist ein "The Pastures"-Zonen-Monster (s. backdrop-aspect-shot.mjs, das denselben
 *  Mob bereits für dieselbe Zone verwendet) — reine Content-Katalog-Zuordnung, keine arena25d-
 *  eigene Auswahl. */
async function openPasturesCombat(browser, { arenaOn, viewport, enemyHp, startHp, enemyEffects }) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
  await page.addInitScript((on) => {
    localStorage.setItem("gr.combatFxLevel", "full");
    if (on) localStorage.setItem("gr.arena25d", "1");
  }, arenaOn);
  await routeFixture(page, "midgame", (s) => {
    s.combat.monsterId = "bull_boss";
    s.combat.enemyHp = enemyHp;
    // Task #330c Punkt 5 (Floater-Nachweis): knapp über der 55%-Auto-Eat-Schwelle starten lassen,
    // damit ein Heal-Floater (Honigkuchen) zuverlässig innerhalb weniger Treffer auftritt.
    if (startHp !== undefined) s.character.hp = startHp;
    // Task #330d Punkt 7 (Chef-Nachtrag "Status-Effekte auf Gegnern fehlt"): fixe DoT-Auflage statt
    // auf einen zufälligen Combat-Proc zu warten — belegt die neue StatusEffectRow zuverlässig.
    if (enemyEffects) s.combat.enemyEffects = enemyEffects;
  });
  await page.goto(`${BASE_URL}/?fixture=midgame`, { waitUntil: "load" });
  await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
  await page.waitForTimeout(4200); // Fixture-Load-Achievement-Toasts abklingen lassen
  await page.locator('[data-guide-id="sidebar.combat"]').first().click({ timeout: 8000 });
  await page.waitForSelector(".battle-arena", { timeout: 10000 });
  page.hfErrors = errors;
  return page;
}

// ── Section B: Perf-Messcode 1:1 aus perf-combat-audit.mjs übernommen (dasselbe Referenz-Muster,
//    Chef-Vorgabe "mit dem perf-combat-audit-Muster gegenmessen") ──────────────────────────────
function percentile(arr, p) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor(p * (sorted.length - 1)));
  return sorted[idx];
}
function stats(arr) {
  if (arr.length === 0) return { count: 0, avg: 0, p95: 0, max: 0, sum: 0 };
  const sum = arr.reduce((a, b) => a + b, 0);
  return { count: arr.length, avg: sum / arr.length, p95: percentile(arr, 0.95), max: Math.max(...arr), sum };
}
async function measure(page, durationMs) {
  return page.evaluate((durationMs) => {
    return new Promise((resolve) => {
      const longTasks = [];
      let po = null;
      try {
        po = new PerformanceObserver((list) => { for (const e of list.getEntries()) longTasks.push(e.duration); });
        po.observe({ entryTypes: ["longtask"] });
      } catch {}
      const frameDeltas = [];
      let last = performance.now();
      let rafId = 0;
      const loop = (now) => { frameDeltas.push(now - last); last = now; rafId = requestAnimationFrame(loop); };
      rafId = requestAnimationFrame(loop);
      setTimeout(() => {
        cancelAnimationFrame(rafId);
        if (po) po.disconnect();
        resolve({ longTasks, frameDeltas: frameDeltas.slice(1) });
      }, durationMs);
    });
  }, durationMs);
}
function report(label, raw, windowMs) {
  const longTaskStats = stats(raw.longTasks);
  const frameStats = stats(raw.frameDeltas);
  console.log(`\n=== ${label} (${(windowMs / 1000).toFixed(0)}s window) ===`);
  console.log(`  long-tasks: n=${longTaskStats.count} sum=${longTaskStats.sum.toFixed(1)}ms max=${longTaskStats.max.toFixed(1)}ms`);
  console.log(
    `  frame-delta: n=${frameStats.count} avg=${frameStats.avg.toFixed(2)}ms p95=${frameStats.p95.toFixed(2)}ms max=${frameStats.max.toFixed(2)}ms` +
      ` (~${(1000 / frameStats.avg).toFixed(1)} FPS avg)`,
  );
  return { longTaskStats, frameStats };
}

const { child, getOutput } = startDevServer();
try {
  const ok = await waitForServer(BASE_URL);
  if (!ok) { console.error("SERVER NOT UP:\n" + getOutput()); process.exit(1); }
  // Playwrights DEFAULT Headless-Modus rendert WebGL über SwiftShader (Software-Rasterizer) — auf
  // dieser Maschine empirisch verifiziert (gpu-check, s. Abschlussbericht): das drückt jede WebGL-
  // Perf-Messung künstlich in den Keller und hat NICHTS mit der echten, GPU-beschleunigten
  // Electron-App zu tun, die der Chef tatsächlich spielt. `--headless=new` + explizite ANGLE/D3D11-
  // Flags lassen Chromium die echte GPU (RTX 4070 auf dieser Maschine) nutzen — bleibt vollständig
  // headless (kein sichtbares Fenster), liefert aber eine repräsentative Zahl.
  const browser = await chromium.launch({
    args: ["--headless=new", "--use-gl=angle", "--use-angle=d3d11", "--ignore-gpu-blocklist", "--enable-gpu"],
  });

  // ═══ A) Screenshots ═══════════════════════════════════════════════════════════════════════
  console.log("\n### Section A: Screenshots ###");

  // A1 — Arena AN: Gesamtszene (9s Einlaufzeit — Textur-/Baseline-Load + StrictMode-Doppelmount
  // brauchen im Dev-Build ein paar Sekunden, bis Kamera-Drift/Feet-Offset stabil stehen, s.
  // Abschlussbericht Punkt 6 "Timing-Investigation").
  const pageOn = await openPasturesCombat(browser, { arenaOn: true, viewport: { width: 1920, height: 1080 }, enemyHp: 400 });
  const mounted = await pageOn.waitForSelector(".a25-root", { timeout: 10000 }).then(() => true).catch(() => false);
  console.log(`.a25-root mounted (arena on, Pastures): ${mounted}`);
  if (!mounted) console.log("!! FAIL: Arena25DStage did not mount — Bundle-/Flag-Logik prüfen.");
  await pageOn.waitForTimeout(9000);
  await pageOn.screenshot({ path: join(OUT_DIR, "arena25d-overview.png") });
  console.log("SHOT SAVED: arena25d-overview.png");

  // A2 — Treffer-Moment mit Schadenszahl (Punkt 5): data-a25Hits-QA-Anker bestätigt den Licht-
  // Flacker, zusätzlich auf den echten `.dmg-number`-Floater warten + kurze Zeit für den
  // floatUp-Fade-in (0%→18%-Keyframe, sonst opacity:0 im Screenshot) verstreichen lassen.
  try {
    await pageOn.waitForFunction(() => {
      const el = document.querySelector(".a25-root");
      return !!el && Number(el.dataset.a25Hits) > 0 && document.querySelectorAll(".a25-root .floaters .dmg-number").length > 0;
    }, null, { timeout: 20000, polling: 15 });
    await pageOn.waitForTimeout(450);
    await pageOn.screenshot({ path: join(OUT_DIR, "arena25d-hit-moment.png") });
    console.log("SHOT SAVED: arena25d-hit-moment.png");
  } catch (e) {
    console.log("!! hit-moment capture failed: " + e.message);
  }

  // A3 — Schwebende Balken, Nahaufnahme (belegt "gestochen scharfer" DOM-Text vs. Textur, jetzt
  // inkl. Mana-/Angriffsbalken, Task #330d Punkt 6). `.a25-bar-anchor` selbst ist bewusst 0x0
  // (reiner Transform-Anker, s. arena25d/styles.ts) — die sichtbare Karte ist ihr Kind
  // `.a25-bar-card`. `locator.screenshot()` (Playwrights eingebaute Stabilitäts-Prüfung) wurde
  // versucht und verworfen: die Kamera hat weiterhin einen sehr dezenten Sinus-Idle-Drift
  // (Modul-JSDoc "Architektur" — bewusst NICHT Teil von Task #330d Punkt 5, der nur den Sprite-
  // Bob betraf), der JEDE Weltposition minimal, aber JEDEN Frame neu projiziert — die Karte wird
  // dadurch nie "stabil" im Playwright-Sinne, `locator.screenshot()` läuft in einen Timeout.
  // `page.screenshot({ clip })` mit einer EINMALIG gelesenen BoundingBox umgeht die Stabilitäts-
  // Prüfung. Extra Vor-Wait (über die A2-Wartezeit hinaus) lässt einen ggf. noch laufenden
  // Treffer-Lunge (400ms, translateX auf der Figur — verschiebt den projizierten Anker-Punkt
  // mit) sicher auslaufen, sonst kann Messung und tatsächlicher Screenshot-Moment auseinanderlaufen.
  try {
    await pageOn.waitForTimeout(600);
    const card = pageOn.locator(".a25-bar-card").first();
    const box = await card.boundingBox();
    if (!box) throw new Error("no bounding box");
    const pad = 6;
    await pageOn.screenshot({
      path: join(OUT_DIR, "arena25d-floating-bar-closeup.png"),
      clip: { x: Math.max(0, box.x - pad), y: Math.max(0, box.y - pad), width: box.width + pad * 2, height: box.height + pad * 2 },
    });
    console.log("SHOT SAVED: arena25d-floating-bar-closeup.png");
  } catch (e) {
    console.log("!! floating-bar closeup failed: " + e.message);
  }

  console.log(`[arena-on] ${pageOn.hfErrors.length ? pageOn.hfErrors.length + " page errors:\n" + pageOn.hfErrors.slice(0, 10).join("\n") : "no page errors"}`);
  await pageOn.close();

  // A1b — Ultrawide-Gegenprobe (3440×1440, Chef-Referenz 40.png): belegt, dass Boden+Kulisse
  // (Punkt 1/2) auch im extremen Seitenverhältnis den kompletten Frame decken — keine dunklen
  // toten Keile links/rechts mehr. BEWUSST als eigene, isolierte Page NACH `pageOn.close()`
  // (nicht mehr zwischen A1/A2 wie im ursprünglichen Skript): eine zweite gleichzeitig offene
  // Page lässt Chromium die erste als Hintergrund-Tab markieren (`document.hidden`), was
  // Arena25DStage.tsx' eigene rAF-Pause-Logik (`onVisibilityChange`) auslöst — die schwebenden
  // Anker der ERSTEN Page frieren dadurch mitten in A2/A3 ein (Fund beim Testen dieser Erweiterung:
  // `.a25-bar-card`-BoundingBox zeigte danach eine über die ganze Kampfdauer stehende, falsche
  // Position). Eine sauber sequenzielle Page-Lebensdauer umgeht das vollständig.
  const pageUW = await openPasturesCombat(browser, { arenaOn: true, viewport: { width: 3440, height: 1440 }, enemyHp: 400 });
  await pageUW.waitForSelector(".a25-root", { timeout: 10000 }).catch(() => {});
  await pageUW.waitForTimeout(9000);
  await pageUW.screenshot({ path: join(OUT_DIR, "arena25d-overview-ultrawide.png") });
  console.log("SHOT SAVED: arena25d-overview-ultrawide.png");
  await pageUW.close();

  // A3c — Chef-Nachtrag Punkt 7 ("Status-Effekte auf Gegnern fehlt"): fixe Burn-Auflage auf dem
  // Gegner, Nahaufnahme der GEGNER-Karte (zweite `.a25-bar-card` im DOM — Spieler zuerst, s.
  // Arena25DStage.tsx JSX-Reihenfolge) belegt die neue StatusEffectRow + Mana/Timer-Reihenfolge.
  const pageStatus = await openPasturesCombat(browser, {
    arenaOn: true,
    viewport: { width: 1920, height: 1080 },
    enemyHp: 400,
    // remainingMs großzügig über der ~9s-Einlaufzeit (s.o.) gewählt, sonst tickt die DoT-Auflage
    // während des Wartens bereits wieder ab, bevor der Screenshot sie fassen kann.
    enemyEffects: [{ type: "burn", remainingMs: 60000, magnitude: 4 }],
  });
  await pageStatus.waitForSelector(".a25-root", { timeout: 10000 }).catch(() => {});
  await pageStatus.waitForTimeout(9000);
  try {
    const card = pageStatus.locator(".a25-bar-card").nth(1); // 0=Spieler, 1=Gegner
    await card.locator(".a25-status-row .effect-badge").first().waitFor({ timeout: 5000 });
    const box = await card.boundingBox();
    if (!box) throw new Error("no bounding box");
    const pad = 6;
    await pageStatus.screenshot({
      path: join(OUT_DIR, "arena25d-status-effect-closeup.png"),
      clip: { x: Math.max(0, box.x - pad), y: Math.max(0, box.y - pad), width: box.width + pad * 2, height: box.height + pad * 2 },
    });
    console.log("SHOT SAVED: arena25d-status-effect-closeup.png");
  } catch (e) {
    console.log("!! status-effect closeup failed: " + e.message);
  }
  console.log(`[arena-status] ${pageStatus.hfErrors.length ? pageStatus.hfErrors.length + " page errors:\n" + pageStatus.hfErrors.slice(0, 10).join("\n") : "no page errors"}`);
  await pageStatus.close();

  // A3d — Chef-Nachtrag Punkt 8 ("End-Combat-Screen ... MUSS kommen"): enemyHp auf 1 gesetzt, damit
  // der ERSTE Treffer tötet — wartet auf die echte `.kill-summary-card` (dieselbe Komponente/
  // derselbe `cs.lastKill`-State wie 2D, s. Arena25DStageProps.killSummary) samt laufendem
  // Respawn-Cooldown-Balken. BEWUSST kein 9s-Vollstabilisierungs-Wait vor dem Poll: die Karte lebt
  // nur `KILL_COOLDOWN_MS` (2s) — ein langes Vor-Warten läuft Gefahr, den einzigen garantiert
  // sofortigen (enemyHp=1) Kill zu verpassen und stattdessen einen bereits-verblassenden Rest-Frame
  // eines SPÄTEREN Zyklus zu erwischen (Playwrights `waitForSelector` prüft KEINE Opacity, nur
  // Bounding-Box/Display — ein `opacity:0`-Element beim Fade-Out gilt für Playwright bereits als
  // "sichtbar" und lässt den Wait fälschlich sofort auflösen, s. Fund beim ersten Testlauf dieses
  // Skripts: Karte im DOM kurz "getroffen", aber im Screenshot schon unsichtbar). Stattdessen per
  // `getComputedStyle(...).opacity` gezielt auf einen FRISCHEN, voll sichtbaren Karten-Frame warten.
  const pageKill = await openPasturesCombat(browser, { arenaOn: true, viewport: { width: 1920, height: 1080 }, enemyHp: 1 });
  await pageKill.waitForSelector(".a25-root", { timeout: 10000 }).catch(() => {});
  await pageKill.waitForTimeout(2500);
  try {
    await pageKill.waitForFunction(
      () => {
        const el = document.querySelector(".a25-root .kill-summary-card");
        if (!el) return false;
        return parseFloat(getComputedStyle(el).opacity || "0") > 0.8;
      },
      null,
      { timeout: 25000, polling: 50 },
    );
    await pageKill.screenshot({ path: join(OUT_DIR, "arena25d-kill-summary.png") });
    console.log("SHOT SAVED: arena25d-kill-summary.png");
  } catch (e) {
    console.log("!! kill-summary capture failed: " + e.message);
  }
  console.log(`[arena-kill] ${pageKill.hfErrors.length ? pageKill.hfErrors.length + " page errors:\n" + pageKill.hfErrors.slice(0, 10).join("\n") : "no page errors"}`);
  await pageKill.close();

  // A3b — Heil-Moment (Punkt 5): Spieler startet knapp über der 55%-Auto-Eat-Schwelle
  // (Honigkuchen), sodass ein grüner Heal-Floater innerhalb weniger Treffer auftritt.
  const pageHeal = await openPasturesCombat(browser, { arenaOn: true, viewport: { width: 1920, height: 1080 }, enemyHp: 400, startHp: 60 });
  await pageHeal.waitForSelector(".a25-root", { timeout: 10000 }).catch(() => {});
  await pageHeal.waitForTimeout(9000);
  try {
    await pageHeal.waitForFunction(
      () => document.querySelectorAll(".a25-root .floaters .dmg-number.heal").length > 0,
      null,
      { timeout: 30000, polling: 20 },
    );
    await pageHeal.waitForTimeout(450);
    await pageHeal.screenshot({ path: join(OUT_DIR, "arena25d-heal-moment.png") });
    console.log("SHOT SAVED: arena25d-heal-moment.png");
  } catch (e) {
    console.log("!! heal-moment capture failed: " + e.message);
  }
  console.log(`[arena-heal] ${pageHeal.hfErrors.length ? pageHeal.hfErrors.length + " page errors:\n" + pageHeal.hfErrors.slice(0, 10).join("\n") : "no page errors"}`);
  await pageHeal.close();

  // A4 — Gegenprobe: Flag AUS ⇒ bestehende 2D-Darstellung, arena25d darf NICHT mounten.
  const pageOff = await openPasturesCombat(browser, { arenaOn: false, viewport: { width: 1920, height: 1080 }, enemyHp: 400 });
  const a25Count = await pageOff.locator(".a25-root").count();
  const classicCount = await pageOff.locator(".battle-arena-stage").count();
  console.log(`flag off — .a25-root count (expect 0): ${a25Count}; .battle-arena-stage count (expect 1): ${classicCount}`);
  await pageOff.waitForTimeout(700);
  await pageOff.screenshot({ path: join(OUT_DIR, "arena25d-flagoff-regression.png") });
  console.log("SHOT SAVED: arena25d-flagoff-regression.png");
  console.log(`[arena-off] ${pageOff.hfErrors.length ? pageOff.hfErrors.length + " page errors:\n" + pageOff.hfErrors.slice(0, 10).join("\n") : "no page errors"}`);
  await pageOff.close();

  // ═══ B) Perf @ 3440×1440 — Steady-State-Kampf, klassisch vs. Arena25D ══════════════════════
  console.log("\n### Section B: Perf (3440x1440, 10s Steady-State) ###");
  const PERF_VIEWPORT = { width: 3440, height: 1440 };
  const results = {};
  for (const arenaOn of [false, true]) {
    const page = await openPasturesCombat(browser, { arenaOn, viewport: PERF_VIEWPORT, enemyHp: 5000 });
    if (arenaOn) await page.waitForSelector(".a25-root", { timeout: 10000 });
    await page.waitForTimeout(1000);
    const dpr = await page.evaluate(() => window.devicePixelRatio);
    const label = `${arenaOn ? "Arena25D" : "Klassisch (2D)"} @ 3440x1440 (dpr=${dpr}) — bull_boss/Pastures, 5000hp, keine Kills`;
    results[arenaOn ? "arena25d" : "classic"] = report(label, await measure(page, WINDOW_MS), WINDOW_MS);
    await page.screenshot({ path: join(OUT_DIR, `arena25d-perf-3440-${arenaOn ? "arena25d" : "classic"}.png`) });
    await page.close();
  }
  console.log("\n=== Vergleichstabelle (Section B) ===");
  for (const [k, r] of Object.entries(results)) {
    console.log(
      `  ${k.padEnd(10)} avgFrame=${r.frameStats.avg.toFixed(2)}ms p95Frame=${r.frameStats.p95.toFixed(2)}ms` +
        ` maxFrame=${r.frameStats.max.toFixed(2)}ms longTasks=${r.longTaskStats.count} longTaskSum=${r.longTaskStats.sum.toFixed(1)}ms`,
    );
  }

  await browser.close();
  console.log("\n[arena25d-verify-330] done.");
} finally {
  child.kill();
}
