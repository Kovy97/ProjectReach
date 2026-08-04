#!/usr/bin/env node
/**
 * Tester-Sweep 2, T7 "Der Kämpfer" — Punkt 2: Sound-Verdrahtung (Port 5256).
 * Instrumentiert `HTMLMediaElement.prototype.play` + `AudioContext.prototype.createOscillator` via
 * addInitScript (reine Aufruf-Zählung, kein Produktcode-Edit).
 *
 * Szenario 0 deckt einen KRITISCHEN Fund auf (Diagnose-Lauf davor): auf frischem localStorage
 * (= jeder Neuinstallation/neuer Spielstand) ist die Kampf-/UI-SFX komplett stumm — nur Musik läuft.
 * Ursache vermutet in util/audio.ts readVolume()/readAchievementVolume(): `Number(localStorage.
 * getItem(key))` liefert bei fehlendem Key `Number(null) === 0`, was die `Number.isFinite(raw) &&
 * raw>=0 && raw<=1`-Prüfung TROTZDEM besteht (0 ist ein gültiger Wert) → der eigentlich beabsichtigte
 * Default (0.5 bzw. 1) wird nie erreicht, `volume`/`achievementVolume` bleiben bei 0 → jeder `if
 * (muted || volume <= 0) return;`-Guard in playSfx/playClickFile/playCombatSfx/playAchievementFile
 * greift dauerhaft. Die restlichen Szenarien seeden `localStorage["hf.audio.volume"]` deshalb
 * VORAB (simuliert einen Spieler, der den Regler schon einmal bewegt hat), um Melee/Ranged/Magie/
 * Hook-Verdrahtung ISOLIERT vom Volume-Bug zu prüfen.
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5256;
const BASE_URL = `http://localhost:${PORT}`;

function startDevServer() {
  const viteBin = join(CLIENT_DIR, "node_modules", "vite", "bin", "vite.js");
  const child = spawn(
    process.execPath,
    [viteBin, "dev", "--config", join(CLIENT_DIR, "ui-audit", "vite.tour.config.mjs"), "--port", String(PORT), "--strictPort"],
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
    mutator(json.state);
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(json) });
  });
}

const errors = [];
const problems = [];
function wirePage(page, tag) {
  page.on("pageerror", (e) => errors.push(`[${tag}] pageerror: ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error") errors.push(`[${tag}] console: ${m.text()}`); });
}

async function installAudioProbe(page, { seedVolume } = {}) {
  await page.addInitScript((seed) => {
    window.__playLog = [];
    window.__oscCount = 0;
    if (seed) localStorage.setItem("hf.audio.volume", String(seed));
    const origPlay = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function (...a) {
      try { window.__playLog.push({ src: this.currentSrc || this.src || "", t: performance.now() }); } catch {}
      return origPlay.apply(this, a);
    };
    const RealCtor = window.AudioContext || window.webkitAudioContext;
    if (RealCtor) {
      class PatchedCtx extends RealCtor {
        createOscillator(...a) {
          window.__oscCount++;
          return super.createOscillator(...a);
        }
      }
      window.AudioContext = PatchedCtx;
      window.webkitAudioContext = PatchedCtx;
    }
  }, seedVolume ?? 0);
}

function playedGroup(log, needle) {
  return log.filter((e) => e.src.includes(needle));
}

async function newBattlePage(browser, tag, { fixture = "midgame", patch, settleMs = 1500, seedVolume = 0.6 } = {}) {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  wirePage(page, tag);
  await installAudioProbe(page, { seedVolume });
  await routeFixture(page, fixture, (state) => {
    state.character.buffs = [];
    // Bereichs-Erst-Touren (AreaTourGuide) als "schon gesehen" markieren — sonst blockt der
    // Combat-Spotlight (state.onboarding.toursSeen fehlt in der rohen Fixture) jede Navigation
    // nach dem ersten Kampf-Seitenbesuch (pointer-events:none auf allem außer dem Tour-Ziel).
    // Realistisch für einen etablierten Midgame-Charakter — kein Produktbug, reine Fixture-Hygiene.
    state.onboarding = { ...(state.onboarding ?? {}), active: false, toursSeen: { combat: true, shop: true, bank: true } };
    patch?.(state);
  });
  await page.goto(`${BASE_URL}/?fixture=${fixture}`, { waitUntil: "load" });
  await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
  await page.waitForTimeout(1200);
  await page.locator('[data-guide-id="sidebar.combat"]').first().click({ timeout: 8000 });
  await page.waitForSelector(".battle-arena", { timeout: 10000 });
  await page.waitForTimeout(settleMs);
  return page;
}

const BULL = (s) => { s.combat.monsterId = "bull_boss"; s.combat.enemyHp = 400; };

const { child, getOutput } = startDevServer();
try {
  const ok = await waitForServer(BASE_URL);
  if (!ok) { console.error("SERVER NOT UP:\n" + getOutput()); process.exit(1); }
  const browser = await chromium.launch();

  // ── 0) KRITISCH-Verdacht: frisches localStorage (= jeder Neuspieler) → SFX komplett stumm ──
  {
    const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
    wirePage(page, "0");
    await installAudioProbe(page, { seedVolume: 0 }); // 0 = KEIN Seed (simuliert leeres localStorage exakt)
    await routeFixture(page, "midgame", (state) => {
      state.character.buffs = [];
      state.onboarding = { ...(state.onboarding ?? {}), active: false, toursSeen: { combat: true, shop: true, bank: true } };
    });
    await page.goto(`${BASE_URL}/?fixture=midgame`, { waitUntil: "load" });
    await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
    await page.waitForTimeout(800);
    const before = await page.evaluate(() => ({
      muted: localStorage.getItem("hf.audio.muted"),
      volume: localStorage.getItem("hf.audio.volume"),
    }));
    // Ein Klick auf einen Sidebar-Eintrag soll laut App.tsx IMMER "click" abspielen (globaler Klick-Listener).
    await page.locator('[data-guide-id="topbar.character"]').first().click({ timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(400);
    const clickLog = await page.evaluate(() => window.__playLog);
    const clickPlayed = playedGroup(clickLog, "click.mp3");
    console.log(`0: localStorage vor jeder Interaktion: muted=${before.muted}, volume=${before.volume} (beide null = frisch)`);
    console.log(`0: click.mp3-Plays nach Sidebar-Klick=${clickPlayed.length} (erwartet: bei intaktem Default >=1)`);
    if (before.muted === null && before.volume === null && clickPlayed.length === 0) {
      problems.push(
        "(0) KRITISCH: Auf frischem localStorage (jede Neuinstallation/jeder neue Spielstand) bleibt " +
        "SFX-Lautstärke bei 0 statt dem beabsichtigten Default 0.5 — util/audio.ts readVolume() prüft " +
        "`Number.isFinite(raw) && raw>=0 && raw<=1`, aber `Number(localStorage.getItem('hf.audio.volume'))` " +
        "liefert bei fehlendem Key `Number(null) === 0`, was diese Prüfung besteht (0 ist gültig) statt auf " +
        "den 0.5-Fallback zu fallen. Ergebnis: JEDE SFX (Klick, Treffer/Crit, Zauber, Level-Up, Equip, " +
        "Seitenwechsel, Achievement) ist beim allerersten Start stumm, nur Musik läuft (eigener Lautstärke-" +
        "Pfad in music.ts). Derselbe Bug-Musterin readAchievementVolume() (Default sollte 1 sein, wird 0). " +
        "Betrifft JEDEN Spieler beim ersten Start bis er manuell am Options-Regler dreht — der Regler selbst " +
        "zeigt dabei korrekt 0 % (liest denselben Wert über getVolume()), fällt also nicht sofort als " +
        "Anzeigefehler auf, nur als 'Spiel hat keine Sound-Effekte'.",
      );
    } else {
      console.log("0: Volume-Init-Verdacht NICHT bestätigt (evtl. bereits gefixt) — kein Problem gemeldet.");
    }
    await page.close();
  }

  // Ab hier: Lautstärke bewusst vorbelegt (0.6), um die restlichen Hooks UNABHÄNGIG vom Fund (0) zu prüfen.

  // ── A) Melee (sword) — attack whoosh geliefert, impact/blocked NICHT ───────────────────────
  {
    const page = await newBattlePage(browser, "A", { patch: BULL });
    await page.waitForTimeout(5500);
    const log = await page.evaluate(() => window.__playLog);
    const oscCount = await page.evaluate(() => window.__oscCount);
    const hitLines = await page.evaluate(() =>
      document.querySelectorAll(".log-line.hit.player, .log-line.crit.player").length,
    );
    const attack = playedGroup(log, "sword_attack");
    const impact = playedGroup(log, "sword_impact");
    const blocked = playedGroup(log, "sword_blocked");
    console.log(`A: player-hit-log-lines=${hitLines}, sword_attack=${attack.length}, sword_impact=${impact.length}, sword_blocked=${blocked.length}, oscCount=${oscCount}`);
    if (hitLines === 0) problems.push("(A) keine Spieler-Treffer im Log binnen 5.5s — Szenario nicht verifizierbar (Wiederholung nötig)");
    if (hitLines > 0 && attack.length === 0) problems.push("(A) sword_attack_3.wav wird NICHT abgespielt, obwohl die Datei vorliegt und Volume>0 ist");
    if (hitLines > 0 && impact.length === 0 && blocked.length === 0 && oscCount === 0) {
      problems.push(
        `(A) MITTEL: ${hitLines} Spieler-Treffer, aber weder sword_impact/sword_blocked (Dateien fehlen im ` +
        `Content-Ordner assets/audio/combat/ — nur sword_attack_3.wav liegt vor) NOCH der Synth-Fallback ` +
        `(oscCount=${oscCount}) feuerten. CombatPage.tsx gated den Synth-Fallback auf \`attackPlayed\` (nur ob ` +
        `der ATTACK-Sound existiert), nicht auf den Erfolg von \`playCombatSfx(resultGroup, 140)\` selbst — ` +
        `bei nur sword_attack_3.wav geliefert bleibt der Treffer/Block-Moment für Melee dauerhaft stumm ` +
        `(hörbar nur der Schwung, kein Einschlag).`,
      );
    }
    await page.close();
  }

  // ── B) Ranged (bow) — keine Datei-Lieferung überhaupt → Synth-Fallback MUSS greifen ────────
  {
    const page = await newBattlePage(browser, "B", {
      patch: (s) => { BULL(s); s.character.equipment.mainhand = "blacksteel_longbow"; delete s.character.equipment.offhand; },
    });
    await page.waitForTimeout(5500);
    const log = await page.evaluate(() => window.__playLog);
    const oscCount = await page.evaluate(() => window.__oscCount);
    const hitLines = await page.evaluate(() =>
      document.querySelectorAll(".log-line.hit.player, .log-line.crit.player").length,
    );
    const attack = playedGroup(log, "bow_attack");
    console.log(`B: player-hit-log-lines=${hitLines}, bow_attack=${attack.length}, oscCount=${oscCount}`);
    if (hitLines === 0) problems.push("(B) keine Spieler-Treffer im Log binnen 5.5s — Szenario nicht verifizierbar (Wiederholung nötig)");
    if (attack.length > 0) problems.push("(B) bow_attack_*.wav abgespielt, obwohl keine Datei im Content liegt (Phantom-Play?)");
    if (hitLines > 0 && oscCount === 0) problems.push("(B) Ranged-Treffer ohne bow-Dateien UND ohne Synth-Fallback — Ranged-Kampf stumm (Gegenprobe zu A schlägt fehl)");
    await page.close();
  }

  // ── C) Magic (Stab) — Cast-SFX läuft IMMER über Synth (playSfx direkt, kein playCombatSfx) ──
  {
    const page = await newBattlePage(browser, "C", {
      fixture: "endgame",
      patch: (s) => { BULL(s); s.combat.enemyHp = 500; },
    });
    await page.waitForTimeout(4000);
    const oscCount = await page.evaluate(() => window.__oscCount);
    const castLines = await page.evaluate(() => document.querySelectorAll(".log-line.hit.player, .log-line.crit.player").length);
    console.log(`C: player-cast-log-lines=${castLines}, oscCount=${oscCount}`);
    if (castLines === 0) problems.push("(C) keine Zauber-Treffer im Log binnen 4s — Szenario nicht verifizierbar (Wiederholung nötig)");
    if (castLines > 0 && oscCount === 0) problems.push("(C) Magie-Cast-SFX feuert nicht (oscCount blieb 0 trotz Zaubertreffern, Volume war vorbelegt)");
    await page.close();
  }

  // ── D) PageOpen-Hook: Seitenwechsel Combat → Character → Combat ────────────────────────────
  {
    const page = await newBattlePage(browser, "D", { patch: BULL, settleMs: 500 });
    await page.evaluate(() => { window.__playLog = []; });
    const charNav = page.locator('[data-guide-id="topbar.character"]').first();
    const navCount = await charNav.count();
    if (navCount === 0) {
      problems.push("(D) kein [data-guide-id='topbar.character']-Ziel gefunden — Szenario mit anderem Selektor wiederholen");
    } else {
      await charNav.click({ timeout: 8000, force: true });
      await page.waitForTimeout(400);
      await page.locator('[data-guide-id="sidebar.combat"]').first().click({ timeout: 8000 });
      await page.waitForTimeout(400);
      const log = await page.evaluate(() => window.__playLog);
      const pageOpen = playedGroup(log, "page_open");
      console.log(`D: page_open plays=${pageOpen.length} (erwartet >=2, ein Klick je Wechsel)`);
      if (pageOpen.length < 2) problems.push(`(D) page_open.wav feuerte nur ${pageOpen.length}× bei 2 Seitenwechseln (erwartet >=2)`);
    }
    await page.close();
  }

  // ── E) Equip-Hook: Helm auf Character-Seite ablegen (Paperdoll-Klick → Aktionsmenü → Unequip) ─
  {
    const page = await newBattlePage(browser, "E", { patch: BULL, settleMs: 500 });
    const charNav = page.locator('[data-guide-id="topbar.character"]').first();
    if ((await charNav.count()) === 0) {
      problems.push("(E) kein Character-Nav-Ziel gefunden — Equip-Hook nicht verifizierbar, siehe (D)");
    } else {
      await charNav.click({ timeout: 8000, force: true });
      await page.waitForSelector(".cs-slot.helmet.filled", { timeout: 8000 }).catch(() => {});
      const slotCount = await page.locator(".cs-slot.helmet.filled").count();
      if (slotCount === 0) {
        problems.push("(E) kein gefüllter Helm-Slot auf der Character-Seite gefunden (Fixture ohne Helm?) — Equip-Hook nicht verifizierbar");
      } else {
        await page.evaluate(() => { window.__playLog = []; });
        await page.locator(".cs-slot.helmet.filled .item-cell").click({ timeout: 5000 });
        const unequipBtn = page.locator(".it-action-btn", { hasText: /unequip|ablegen/i }).first();
        if ((await unequipBtn.count()) === 0) {
          problems.push("(E) kein 'Unequip'-Aktionsbutton nach Klick auf den gefüllten Helm-Slot erschienen");
        } else {
          await unequipBtn.click({ timeout: 5000 });
          await page.waitForTimeout(300);
          const log = await page.evaluate(() => window.__playLog);
          const equip = playedGroup(log, "equip_unequip");
          const stillFilled = await page.locator(".cs-slot.helmet.filled").count();
          console.log(`E: equip_unequip plays=${equip.length}, Helm-Slot nach Unequip noch gefüllt=${stillFilled > 0}`);
          if (equip.length === 0) problems.push("(E) equip_unequip.wav feuerte NICHT beim Ablegen des Helms");
          if (stillFilled > 0) problems.push("(E) Helm-Slot blieb 'filled' nach Unequip-Klick (Aktion griff nicht?)");
        }
      }
    }
    await page.close();
  }

  console.log(problems.length ? "PROBLEME:\n- " + problems.join("\n- ") : "ALLE CHECKS GRÜN");
  console.log(errors.length ? `${errors.length} page errors:\n` + errors.slice(0, 10).join("\n") : "no page errors");
  await browser.close();
  process.exitCode = problems.length || errors.length ? 1 : 0;
} finally {
  child.kill();
}
