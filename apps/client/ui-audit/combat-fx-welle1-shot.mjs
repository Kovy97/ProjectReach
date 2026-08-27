#!/usr/bin/env node
/**
 * Kampfeffekte Welle 1 (design/combat-fx/konzept-kampfeffekte.md) — Verifikations-Screenshots für
 * die neuen Mira-Sprites (combatFx.ts + CombatPage.tsx Battle: playMissileFx/playImpactFx/
 * playSlashFx/playBloodFx). Modeled on combat-fx-shot-296.mjs (Task #296), Port 5463 laut Auftrag.
 *
 * Drei Szenen:
 *  (a) Magie-Geschoss unterwegs — Fixture `wandbug_staff` (wisp_kindled_bough, ein Feuer-Stab:
 *      weaponEffect burn → magicThemeFor liefert "fire", s. combatFx.test.ts).
 *  (b) Nahkampf-Slash + Blut — Fixture `wandbug_sword` (murkvein_longsword → Slash-Familie "cut").
 *  (c) Gegner-Angriff gespiegelt — dieselbe Schlacht (Rasender Bulle, mehr HP als ein Huhn → mehr
 *      Gegner-Schwünge), wartet auf einen echten Gegner-Treffer im Kampflog.
 *
 * Erkennung ist EDGE-GETRIGGERT (Log-Länge vor dem Warten gemerkt, dann nur NEUE Einträge
 * geprüft) — ein Level-Check à la "log enthält irgendwann einen Treffer" feuert sonst auf einen
 * STEINALTEN Treffer, dessen Sprite unter der 20x-Zeitlupe längst vom Pool-Recycling (Konzept §4
 * Deckel "max. drei je Seite") mit einem späteren Fehlschlag-Wischer überschrieben wurde — genau
 * dieser Bug hat den ersten Anlauf dieses Skripts kaputte Screenshots ohne sichtbares Sprite
 * liefern lassen (Log stimmte, Sprite war aber schon recycelt). Einfrier-Technik (Auftrag):
 * `document.getAnimations().forEach(a => { a.pause(); a.currentTime = duration*0.5; })`, läuft
 * SOFORT nach der Erkennung. `data-sprites` (arena-fx-layer) wird nach jeder Szene mitgeloggt.
 *
 * Run: node combat-fx-welle1-shot.mjs
 * Output: PNGs im scratchpad-Ordner unten.
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5463;
const BASE_URL = `http://localhost:${PORT}`;
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

async function clickWithReloadRetry(page, locator, opts = {}) {
  try {
    await locator.click({ timeout: 6000, ...opts });
  } catch {
    await page.waitForTimeout(400);
    await locator.click({ timeout: 6000, ...opts });
  }
}

/** Scales every WAAPI `.animate()` call by `factor` (ephemeral, page-only) — gibt dem ~200-350ms
 *  Sprite ein bequemes Realzeit-Fenster; die Freeze-Technik unten setzt currentTime aber ohnehin
 *  hart auf die Hälfte der (bereits skalierten) Laufzeit, unabhängig vom genauen Timing. */
async function installSlowMo(page, factor) {
  await page.addInitScript((f) => {
    const orig = Element.prototype.animate;
    Element.prototype.animate = function (keyframes, options) {
      const opts = typeof options === "number"
        ? options * f
        : { ...options, duration: (options?.duration ?? 0) * f };
      return orig.call(this, keyframes, opts);
    };
  }, factor);
}

/** Auftrag: alle laufenden Animationen bei 50% ihrer eigenen Laufzeit einfrieren (nicht nur die
 *  gesuchte Sprite-Animation — pauschal ALLES auf der Seite, für einen stabilen Screenshot). */
async function freezeAnimationsAtHalf(page) {
  await page.evaluate(() => {
    for (const a of document.getAnimations()) {
      try {
        const timing = typeof a.effect?.getTiming === "function" ? a.effect.getTiming() : null;
        const dur = typeof timing?.duration === "number" ? timing.duration : 0;
        a.pause();
        if (dur > 0) a.currentTime = dur * 0.5;
      } catch { /* einzelne Animation ignorieren, Rest trotzdem einfrieren */ }
    }
  });
}

async function readSpriteCounter(page) {
  return page.evaluate(() => document.querySelector(".arena-fx-layer")?.getAttribute("data-sprites") ?? null);
}

async function currentLogLength(page) {
  return page.evaluate(() => window.__hfDebug?.state?.combat?.log?.length ?? 0);
}

/** Edge-getriggert: wartet auf den ERSTEN NEUEN Log-Eintrag (Index ≥ `sinceLen`) mit `by`/`kind`
 *  passend zu `by`+`kinds`, mit `amount>0`. `null` = Timeout (kein Treffer in `timeoutMs`),
 *  `"no-combat"` = der Encounter endete (kein `monsterId` mehr) BEVOR ein Treffer kam. */
async function waitForFreshHit(page, { by, sinceLen, timeoutMs }) {
  try {
    const handle = await page.waitForFunction(
      ({ by, sinceLen }) => {
        const cs = window.__hfDebug?.state?.combat;
        if (!cs) return "no-combat";
        const fresh = (cs.log || []).slice(sinceLen);
        const hit = fresh.some((e) => e.by === by && (e.kind === "hit" || e.kind === "crit") && e.amount > 0);
        if (hit) return "hit";
        return cs.monsterId ? false : "no-combat";
      },
      { by, sinceLen },
      { timeout: timeoutMs, polling: 20 },
    );
    return await handle.jsonValue();
  } catch {
    return null;
  }
}

async function enterBattle(page, { fixture, zoneMatch, monsterMatch }) {
  await page.addInitScript(() => {
    try { localStorage.setItem("gr.updateNotice.suppress", "1"); } catch { /* noop */ }
  });
  await page.addInitScript(() => {
    try { localStorage.setItem("hearthforge:locale", "de"); } catch { /* noop */ }
  });
  await page.goto(`${BASE_URL}/?fixture=${fixture}`, { waitUntil: "load" });
  await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
  await page.waitForTimeout(4500); // Ladehinweise/Toasts abklingen lassen

  await clickWithReloadRetry(page, page.locator('[data-guide-id="sidebar.combat"]').first());
  await page.waitForTimeout(500);

  await clickWithReloadRetry(page, page.locator(".zone-card", { hasText: zoneMatch }).first());
  await page.waitForTimeout(1500);

  const card = monsterMatch
    ? page.locator(".monster-card", { hasText: monsterMatch }).first()
    : page.locator(".monster-card").first();
  await clickWithReloadRetry(page, card.locator(".mc-fight-now-btn"));
  await page.waitForSelector(".battle", { timeout: 10000 });
  await page.waitForTimeout(600);
}

/** (a) Magie-Geschoss unterwegs (Feuer-Stab-Fixture). `.fx-missile` ist eine EIGENE, exklusive
 *  Klasse (nur playMissileFx erzeugt sie) — hier reicht die einfache Anwesenheits-Prüfung, keine
 *  Log-Verwechslungsgefahr wie bei (b)/(c) unten. */
async function shootMissile(browser) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });

  await installSlowMo(page, 20);
  await enterBattle(page, { fixture: "wandbug_staff", zoneMatch: /Weiden|Pastures/, monsterMatch: null });
  await page.screenshot({ path: join(OUT_DIR, "fxw1-a-battle-start.png") });
  console.log("SHOT SAVED: fxw1-a-battle-start.png");

  try {
    await page.waitForFunction(
      () => !!document.querySelector(".fx-missile.active"),
      null,
      { timeout: 30000, polling: 20 },
    );
    await freezeAnimationsAtHalf(page);
    await page.screenshot({ path: join(OUT_DIR, "fxw1-a-missile-inflight.png") });
    console.log("SHOT SAVED: fxw1-a-missile-inflight.png");
    const stageEl = page.locator(".battle-arena-stage").first();
    await stageEl.screenshot({ path: join(OUT_DIR, "fxw1-a-missile-inflight-crop.png") });
    console.log("SHOT SAVED: fxw1-a-missile-inflight-crop.png");
    console.log("data-sprites after (a): " + (await readSpriteCounter(page)));
  } catch (e) {
    console.log("!! missile capture failed: " + e.message);
  }
  console.log("[a] " + (errors.length ? `${errors.length} page errors:\n` + errors.slice(0, 12).join("\n") : "no page errors"));
  await page.close();
}

/** (b) Nahkampf-Slash + Blut, (c) Gegner-Angriff gespiegelt — beide aus derselben Schlacht, damit
 *  der Kampf nicht doppelt gestartet werden muss. `wandbug_sword`: reines Schwert
 *  (murkvein_longsword → Slash-Familie "cut"), KEIN Pet-Schild/Block-Gear — bei einer Tank-
 *  Ausrüstung (Pet-Schild + Waffen-Block) absorbierten frühere Läufe JEDEN Bullen-Treffer auf
 *  amount:0 (kein FX-Trigger, s. e.amount>0-Gate), ein echter Gegner-Treffer landete dort nie. */
async function shootMeleeAndMirror(browser) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });

  await installSlowMo(page, 20);
  // Rasender Bulle (bull_boss, 67 HP/damage 7/3.2s Takt) statt Huhn: mehr HP → mehrere
  // Schlagwechsel, bevor er fällt — gibt dem Gegner realistisch Zeit für einen eigenen Treffer
  // (Szene c braucht einen ANGRIFF DES GEGNERS, ein 1-Hit-Huhn liefert das kaum).
  await enterBattle(page, { fixture: "wandbug_sword", zoneMatch: /Weiden|Pastures/, monsterMatch: /Bulle|Bull/ });
  await page.screenshot({ path: join(OUT_DIR, "fxw1-b-battle-start.png") });
  console.log("SHOT SAVED: fxw1-b-battle-start.png");

  // ── (b) Slash + Blut: warten auf den ERSTEN NEUEN Spieler-Treffer (amount>0), dann SOFORT
  // einfrieren — edge-getriggert, s. Datei-Kopfkommentar zum Pool-Recycling-Bug des ersten Anlaufs.
  const bStartLen = await currentLogLength(page);
  const bOutcome = await waitForFreshHit(page, { by: "player", sinceLen: bStartLen, timeoutMs: 30000 });
  if (bOutcome === "hit") {
    await freezeAnimationsAtHalf(page);
    await page.screenshot({ path: join(OUT_DIR, "fxw1-b-slash-blood.png") });
    console.log("SHOT SAVED: fxw1-b-slash-blood.png");
    const stageEl = page.locator(".battle-arena-stage").first();
    await stageEl.screenshot({ path: join(OUT_DIR, "fxw1-b-slash-blood-crop.png") });
    console.log("SHOT SAVED: fxw1-b-slash-blood-crop.png");
    console.log("data-sprites after (b): " + (await readSpriteCounter(page)));
  } else {
    console.log(`!! slash+blood capture failed: outcome=${bOutcome}`);
  }

  // ── (c) Gegner-Angriff gespiegelt. Ein EINZELNER Bulle liefert nur ~2-4 Gegner-Schwünge
  // (attackIntervalMs 3200ms) — darum mehrere Leben in Folge, bis ein ECHTER (amount>0) neuer
  // Gegner-Treffer im Kampflog auftaucht (edge-getriggert je Versuch neu ab der aktuellen Länge).
  let mirrored = false;
  for (let attempt = 0; attempt < 8 && !mirrored; attempt++) {
    const cStartLen = await currentLogLength(page);
    const outcome = await waitForFreshHit(page, { by: "enemy", sinceLen: cStartLen, timeoutMs: 20000 });
    if (outcome === "hit") {
      mirrored = true;
      await freezeAnimationsAtHalf(page);
      await page.screenshot({ path: join(OUT_DIR, "fxw1-c-enemy-mirrored.png") });
      console.log("SHOT SAVED: fxw1-c-enemy-mirrored.png");
      const stageEl = page.locator(".battle-arena-stage").first();
      await stageEl.screenshot({ path: join(OUT_DIR, "fxw1-c-enemy-mirrored-crop.png") });
      console.log("SHOT SAVED: fxw1-c-enemy-mirrored-crop.png");
      console.log("data-sprites after (c): " + (await readSpriteCounter(page)));
      break;
    }
    if (outcome === null) {
      console.log(`[c] attempt ${attempt + 1}: Timeout ohne frischen Gegner-Treffer, Bulle lebt/eventCount friert nicht ein`);
      break;
    }
    // "no-combat": der Bulle ist gefallen, ohne dass in diesem Leben ein Treffer landete — neu
    // ansetzen (voller enterBattle-Flow statt Direkt-Klick, s. Lektion oben zur Post-Kill-Navigation).
    console.log(`[c] attempt ${attempt + 1}: kein frischer Gegner-Treffer, Bulle erneut ansetzen`);
    try {
      await enterBattle(page, { fixture: "wandbug_sword", zoneMatch: /Weiden|Pastures/, monsterMatch: /Bulle|Bull/ });
    } catch (e) {
      console.log(`[c] Re-Engage fehlgeschlagen: ${e.message}`);
      break;
    }
  }
  if (!mirrored) console.log("!! mirrored-enemy capture failed after all retries");

  console.log("[bc] " + (errors.length ? `${errors.length} page errors:\n` + errors.slice(0, 12).join("\n") : "no page errors"));
  await page.close();
}

const { child, getOutput } = startDevServer();
try {
  const ok = await waitForServer(BASE_URL);
  if (!ok) { console.error("SERVER NOT UP:\n" + getOutput()); process.exit(1); }
  const browser = await chromium.launch();
  await shootMissile(browser);
  await shootMeleeAndMirror(browser);
  await browser.close();
} finally {
  child.kill();
}
