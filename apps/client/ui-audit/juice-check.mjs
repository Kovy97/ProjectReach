#!/usr/bin/env node
/**
 * Kampf-Juice-Welle-Verifikation (Chef-GO „Juice GO" 2026-07-12) — Port 5242.
 * Prüft die 6 neuen Wucht-Effekte in echten Kämpfen (Muster: loadout-scroll-check.mjs +
 * Fixture-Patch-Muster arena-rework-check.mjs). Assertion-Anker: data-*-Zähler auf
 * `.arena-fx-layer` (CombatPage.tsx bumpFx) + `.active`-Klassen auf den gepoolten FX-Elementen.
 *
 * Beweis-Screenshots: für die sehr kurzen FX (Tracer 130ms / Bolt 200ms / Funken ~400ms) wird
 * auf den Evidence-Pages die CDP-Animation-PlaybackRate auf 0.35 gesenkt (NUR Visuals — Engine-
 * Ticks laufen normal weiter); Bursts sind auf die Arena geclippt. Gegner: goblin_butcher
 * (HAT Monster-Art — goblin_warchief zeigt nur die 👤-Platzhalter-Silhouette).
 *
 *  A) midgame-Melee (full): Funken erscheinen+verschwinden, Hit-Stop-Punch (getAnimations),
 *     Arena-Shake NUR über den Crit-Pfad, Crit-Zahl 68px + crit-float-pop.
 *  K) midgame-Melee vs chicken (full, hp=10 ohne Food/Potion, Pet rotbark): Kill-Dissolve
 *     (kill-dying-sink) + goldene Loot-Funken; Low-HP-Vignette; Pet-Boden-Schatten+Rim.
 *  B) endgame-Magie (voidcaller_staff/shock, full): Runen-Ring + Arkan-Bolt + Einschlag .s-shock.
 *  C) midgame-Ranged (blacksteel_longbow, full): Bogen-Tracer; keine Magie-FX.
 *  D) reduced: fx-reduced, KEIN .arena-fx-layer/Punch/Shake; Hit-Flash + Vignette bleiben.
 *  E) off: fx-off, kein Layer, KEINE .low-hp-Klasse trotz 10 HP.
 */
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = "G:\\GameDev\\apps\\client";
const PORT = 5242;
const BASE_URL = `http://localhost:${PORT}`;
const OUT_DIR = join(__dirname, "shots-juice");
mkdirSync(OUT_DIR, { recursive: true });

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

/** Fixture-Patch via route (arena-rework-check-Muster), Fixture-Name wählbar. */
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

/** Öffnet die Kampf-Ansicht (Fixture mit gesetztem combat.monsterId ⇒ Battle rendert direkt).
 *  `slowMo` senkt die CDP-Animation-PlaybackRate (nur Visuals) für fotografierbare Kurz-FX. */
async function newBattlePage(browser, tag, { fixture = "midgame", fxLevel = "full", patch, slowMo, settleMs = 400 } = {}) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  wirePage(page, tag);
  await page.addInitScript((lvl) => localStorage.setItem("gr.combatFxLevel", lvl), fxLevel);
  await routeFixture(page, fixture, (state) => {
    state.character.buffs = [];
    patch?.(state);
  });
  await page.goto(`${BASE_URL}/?fixture=${fixture}`, { waitUntil: "load" });
  await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
  await page.waitForTimeout(2000);
  await page.locator('[data-guide-id="sidebar.combat"]').first().click({ timeout: 8000 });
  await page.waitForSelector(".battle-arena", { timeout: 10000 });
  let cdp = null;
  if (slowMo) {
    cdp = await page.context().newCDPSession(page);
    await cdp.send("Animation.enable");
    await cdp.send("Animation.setPlaybackRate", { playbackRate: slowMo });
  }
  await page.waitForTimeout(settleMs);
  return { page, cdp };
}

/** Liest einen data-Zähler des FX-Layers (camelCase-Key, z.B. "goldSparks" ⇒ data-gold-sparks). */
async function readCounter(page, key) {
  return page.evaluate((k) => Number(document.querySelector(".arena-fx-layer")?.dataset[k] || 0), key);
}

/** Wartet, bis ein Zähler >= min ist (oder Timeout ⇒ null). */
async function waitCounter(page, key, min, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const v = await readCounter(page, key);
    if (v >= min) return v;
    await page.waitForTimeout(50);
  }
  return null;
}

/** Geclippter Screenshot-Burst (Pflichtteil „selbst ansehen"). `clip` VORHER berechnen —
 *  der boundingBox-Roundtrip würde sonst die ersten ~150ms des FX-Fensters kosten. */
async function burstShots(page, name, n, gapMs, clip) {
  for (let i = 0; i < n; i++) {
    await page.screenshot({ path: join(OUT_DIR, `${name}-${i}.png`), clip: clip ?? undefined });
    if (i < n - 1 && gapMs > 0) await page.waitForTimeout(gapMs);
  }
  console.log(`SHOTS: ${name}-0..${n - 1}.png`);
}

/** Wartet auf das nächste Erscheinen eines aktiven FX-Elements (Playwright-internes Polling,
 *  deutlich schneller als evaluate-Roundtrips) und schießt sofort den Burst. */
async function burstOnFx(page, fxSel, name, n, gapMs, clip) {
  try {
    await page.waitForSelector(fxSel, { timeout: 20000, state: "attached" });
  } catch {
    console.log(`BURST-MISS: ${fxSel} erschien nicht binnen 20s (${name})`);
    return false;
  }
  await burstShots(page, name, n, gapMs, clip);
  return true;
}

/** In-page-Watch: hatte `sel` innerhalb von windowMs irgendwann eine laufende WAAPI-Animation? */
async function sawAnimation(page, sel, windowMs) {
  return page.evaluate(async ({ sel, windowMs }) => {
    const el = document.querySelector(sel);
    if (!el || typeof el.getAnimations !== "function") return false;
    const t0 = Date.now();
    while (Date.now() - t0 < windowMs) {
      if (el.getAnimations().length > 0) return true;
      await new Promise((r) => setTimeout(r, 25));
    }
    return false;
  }, { sel, windowMs });
}

// Test-Gegner mit ECHTER Monster-Art (bull_boss, 67 HP, geringe Gefahr): lange genug lebendig,
// dass Crits meist NICHT tödlich sind (Crit-Zahl-Beweisfoto ohne Kill-Karten-Überdeckung).
const BULL = (s) => { s.combat.monsterId = "bull_boss"; s.combat.enemyHp = 67; };
const NO_HEAL_LOW_HP = (s) => {
  s.character.hp = 10;
  s.character.food = null;
  s.character.autoPotion = { healPotionId: null, healThreshold: 0.4, autoRebuffTonics: false };
};

const { child, getOutput } = startDevServer();
try {
  const ok = await waitForServer(BASE_URL);
  if (!ok) { console.error("SERVER NOT UP:\n" + getOutput()); process.exit(1); }
  const browser = await chromium.launch();

  // ── A) Melee — Funken/Punch/Crit-Shake/Crit-Zahl ────────────────────────────────────────────
  {
    const { page, cdp } = await newBattlePage(browser, "A", { patch: BULL, slowMo: 0.35, settleMs: 6000 });
    const layer = await page.evaluate(() => ({
      exists: !!document.querySelector(".arena-fx-layer"),
      cls: document.querySelector(".battle-arena")?.className,
    }));
    console.log("A layer:", JSON.stringify(layer));
    if (!layer.exists) problems.push("(A) .arena-fx-layer fehlt bei fxLevel full");
    if (!layer.cls?.includes("fx-full")) problems.push("(A) fx-full-Klasse fehlt auf .battle-arena");

    // §1c Funken: erscheinen bei Treffer … (Evidence in Zeitlupe 0.35, Burst direkt beim
    // Erscheinen des ersten aktiven Funken-Elements — Clip vorab berechnet).
    const arenaClip = await page.locator(".battle-arena").boundingBox();
    const sparkBase = await readCounter(page, "sparks");
    const gotSparks = await burstOnFx(page, ".fx-spark.active", "a-melee-sparks", 4, 60, arenaClip);
    const sparks = await readCounter(page, "sparks");
    console.log(`A sparks=${sparks} (Basis ${sparkBase}), burst=${gotSparks}`);
    if (!gotSparks || sparks <= sparkBase) problems.push("(A) keine Funken binnen 20s (kein .fx-spark.active / Zähler stieg nicht)");
    // … und verschwinden wieder (zurück auf Normal-Speed, Fenster ohne neuen Treffer abpassen).
    if (cdp) await cdp.send("Animation.setPlaybackRate", { playbackRate: 1 });
    let vanished = false;
    for (let i = 0; i < 12 && !vanished; i++) {
      const before = await readCounter(page, "sparks");
      await page.waitForTimeout(700);
      const [after, active] = await Promise.all([
        readCounter(page, "sparks"),
        page.evaluate(() => document.querySelectorAll(".fx-spark.active").length),
      ]);
      if (after === before && active === 0) vanished = true;
    }
    if (!vanished) problems.push("(A) .fx-spark.active verschwindet nicht nach der Animation");

    // §1b Punch am Getroffenen (Gegner wird vom Spieler getroffen → Punch auf der Gegner-Figur).
    const sawPunch = await sawAnimation(page, ".arena-side-enemy .fighter-figure-punch", 12000);
    console.log("A punch (enemy):", sawPunch);
    if (!sawPunch) problems.push("(A) kein Hit-Stop-Punch auf .fighter-figure-punch binnen 12s");

    // §1a Shake NUR bei Crit + §2 Crit-Zahl (wieder Zeitlupe für den Burst).
    if (cdp) await cdp.send("Animation.setPlaybackRate", { playbackRate: 0.35 });
    const shakes = await waitCounter(page, "shake", 1, 120000);
    if (shakes === null) {
      problems.push("(A) kein Crit/Arena-Shake binnen 120s — nicht verifizierbar (Wiederholung nötig)");
    } else {
      await burstShots(page, "a-crit-shake", 4, 80, arenaClip);
      // Crit-Floater lebt 2.6s — die Style-Prüfung darf NACH dem Burst laufen.
      const critInfo = await page.evaluate(() => {
        const el = document.querySelector(".dmg-number.crit");
        if (!el) return null;
        const cs = getComputedStyle(el);
        return { fontSize: cs.fontSize, anim: cs.animationName, color: cs.color };
      });
      console.log(`A shake=${shakes}, critFloater=${JSON.stringify(critInfo)}`);
      if (!critInfo) problems.push("(A) Shake gezählt, aber keine .dmg-number.crit sichtbar (Timing?)");
      else {
        if (critInfo.fontSize !== "68px") problems.push(`(A) Crit-Zahl nicht 68px (${critInfo.fontSize})`);
        if (!critInfo.anim.includes("crit-float-pop")) problems.push(`(A) Crit-Zahl ohne crit-float-pop (${critInfo.anim})`);
      }
    }
    await page.close();
  }

  // ── K) Kill-Moment vs Huhn + Low-HP-Vignette + Pet-Verankerung ──────────────────────────────
  {
    // BEWUSST ohne slowMo: das dying-Klassenfenster läuft in ECHTZEIT (650ms setTimeout) — bei
    // gesenkter PlaybackRate würde der Dissolve nur seine ersten Keyframes erreichen. Ein enger
    // 6er-Burst ohne Pause deckt die 650ms stattdessen komplett ab.
    const { page } = await newBattlePage(browser, "K", {
      settleMs: 6000, // Meilenstein-Toasts abklingen lassen (saubere Beweis-Shots)
      patch: (s) => {
        s.combat.monsterId = "chicken";
        s.combat.enemyHp = 3;
        NO_HEAL_LOW_HP(s);
        s.character.companionPetId = "rotbark";
        s.character.ownedPets = { rotbark: true };
      },
    });

    // §6 Low-HP-Vignette: Klasse + ::after mit Puls-Animation.
    const vignette = await page.evaluate(() => {
      const arena = document.querySelector(".battle-arena");
      if (!arena) return null;
      const after = getComputedStyle(arena, "::after");
      return { lowHp: arena.classList.contains("low-hp"), anim: after.animationName, bg: after.backgroundImage.slice(0, 60) };
    });
    console.log("K vignette:", JSON.stringify(vignette));
    if (!vignette?.lowHp) problems.push("(K) .low-hp-Klasse fehlt bei 10 HP");
    else if (!vignette.anim.includes("low-hp-vignette")) problems.push(`(K) Vignetten-Puls fehlt (${vignette.anim})`);

    // Sweep-Fund T2: Pet-Boden-Schatten (::before) + heller Rim im filter.
    const pet = await page.evaluate(() => {
      const el = document.querySelector(".battle-pet-sprite");
      if (!el) return null;
      const before = getComputedStyle(el, "::before");
      return {
        shadow: before.backgroundImage.includes("radial-gradient"),
        rim: getComputedStyle(el).filter.split("drop-shadow").length - 1,
      };
    });
    console.log("K pet:", JSON.stringify(pet));
    if (!pet) problems.push("(K) Pet-Sprite fehlt (rotbark nicht gemountet?)");
    else {
      if (!pet.shadow) problems.push("(K) Pet-Boden-Schatten (::before radial-gradient) fehlt");
      if (pet.rim < 2) problems.push(`(K) Pet-Rim fehlt (nur ${pet.rim} drop-shadow im filter)`);
    }
    // Vignetten/Pet-Shot in einem Kampf-Fenster OHNE Kill-Karte (zwischen zwei Huhn-Kills).
    for (let i = 0; i < 60; i++) {
      const cardVisible = await page.evaluate(() => !!document.querySelector(".kill-summary-card"));
      if (!cardVisible) break;
      await page.waitForTimeout(150);
    }
    const clip = await page.locator(".battle-arena").boundingBox();
    const enemyClip = await page.locator(".arena-side-enemy").boundingBox();
    await page.screenshot({ path: join(OUT_DIR, "k-lowhp-pet.png"), clip: clip ?? undefined });
    console.log("SHOT: k-lowhp-pet.png");

    // §5 Kill-Moment: auf .fighter.dying warten (Huhn stirbt am ersten Treffer), Dissolve + Gold-Funken.
    let dyingSeen = false;
    const goldBase = await readCounter(page, "goldSparks");
    const t0 = Date.now();
    while (Date.now() - t0 < 20000) {
      const state = await page.evaluate(() => {
        const el = document.querySelector(".fighter.dying .fighter-figure-art");
        return el ? getComputedStyle(el).animationName : null;
      });
      if (state) {
        dyingSeen = true;
        console.log("K dissolve animation:", state);
        if (!state.includes("kill-dying-sink")) problems.push(`(K) Dissolve nutzt nicht kill-dying-sink (${state})`);
        // Kill-Karte am TITEL wegklicken (Karten-Feature: Klick blendet früher aus) — nicht die
        // Kartenmitte treffen, dort sitzen klickbare Loot-ItemCells (öffnen das Item-Wiki-Modal).
        try { await page.locator(".kill-summary-title").click({ timeout: 300 }); } catch {}
        await burstShots(page, "k-kill-dissolve", 6, 0, enemyClip);
        break;
      }
      await page.waitForTimeout(40);
    }
    if (!dyingSeen) problems.push("(K) kein Kill/.fighter.dying binnen 20s");
    const goldSparks = await waitCounter(page, "goldSparks", goldBase + 4, 4000);
    console.log("K goldSparks:", goldSparks);
    if (goldSparks === null) problems.push("(K) goldene Loot-Funken fehlen (goldSparks-Zähler stieg nicht um ≥4)");
    await page.close();
  }

  // ── B) Magie (endgame, shock-Stab) — Runen-Ring + Bolt + Element-Einschlag ──────────────────
  {
    const { page } = await newBattlePage(browser, "B", {
      fixture: "endgame",
      patch: BULL,
      slowMo: 0.35,
      settleMs: 6000,
    });
    // WICHTIG: Baselines VOR dem Warten lesen — während der 6s-Settle-Phase casten bereits
    // Zauber (stale counter). Bursts hängen am nächsten ERSCHEINEN des aktiven FX-Elements.
    const arenaClipB = await page.locator(".battle-arena").boundingBox();
    const ringBase = await readCounter(page, "rings");
    const gotRing = await burstOnFx(page, ".fx-ring.active", "b-spell-cast", 5, 70, arenaClipB);
    const rings = await readCounter(page, "rings");
    console.log(`B rings=${rings} (Basis ${ringBase}), burst=${gotRing}`);
    if (!gotRing || rings <= ringBase) problems.push("(B) kein Runen-Ring binnen 20s (kein .fx-ring.active / Zähler stieg nicht)");
    const impactBase = await readCounter(page, "impacts");
    const gotImpact = await burstOnFx(page, ".fx-flash.active", "b-spell-impact", 4, 70, arenaClipB);
    const [impacts, bolts] = await Promise.all([readCounter(page, "impacts"), readCounter(page, "bolts")]);
    console.log(`B bolts=${bolts}, impacts=${impacts} (Basis ${impactBase}), burst=${gotImpact}`);
    if (bolts === 0) problems.push("(B) kein Arkan-Bolt (bolts=0)");
    if (!gotImpact || impacts <= impactBase) problems.push("(B) kein Einschlag-Flash (kein .fx-flash.active / Zähler stieg nicht)");
    else {
      // Elementfarbe: voidcaller_staff trägt shock ⇒ gepooltes Flash-Element behält .s-shock.
      const shock = await page.evaluate(() => !!document.querySelector(".fx-flash.s-shock"));
      console.log("B impact element class s-shock:", shock);
      if (!shock) problems.push("(B) Einschlag-Flash nicht elementgefärbt (.s-shock fehlt)");
    }
    await page.close();
  }

  // ── C) Ranged (midgame + blacksteel_longbow) — Bogen-Tracer ─────────────────────────────────
  {
    const { page } = await newBattlePage(browser, "C", {
      slowMo: 0.35,
      settleMs: 6000,
      patch: (s) => {
        BULL(s);
        s.character.equipment.mainhand = "blacksteel_longbow";
        delete s.character.equipment.offhand;
      },
    });
    // Tracer ist mit 130ms das kürzeste FX (Zeitlupe 0.35 ⇒ ~370ms): Burst direkt beim
    // Erscheinen des aktiven Tracer-Elements, Clip vorab.
    const arenaClipC = await page.locator(".battle-arena").boundingBox();
    const tracerBase = await readCounter(page, "tracers");
    const gotTracer = await burstOnFx(page, ".fx-beam.tracer.active", "c-ranged-tracer", 4, 40, arenaClipC);
    const tracers = await readCounter(page, "tracers");
    console.log(`C tracers=${tracers} (Basis ${tracerBase}), burst=${gotTracer}`);
    if (!gotTracer || tracers <= tracerBase) problems.push("(C) kein Bogen-Tracer binnen 20s (kein aktives Tracer-Element / Zähler stieg nicht)");
    // Gegenprobe: keine Magie-FX im Ranged-Lauf.
    const [rings, bolts] = await Promise.all([readCounter(page, "rings"), readCounter(page, "bolts")]);
    if (rings > 0 || bolts > 0) problems.push(`(C) Magie-FX im Ranged-Lauf (rings=${rings}, bolts=${bolts})`);
    await page.close();
  }

  // ── D) fxLevel "reduced": kein Layer/Shake/Punch, Flash + Vignette bleiben ──────────────────
  {
    const { page } = await newBattlePage(browser, "D", {
      fxLevel: "reduced",
      patch: (s) => { BULL(s); NO_HEAL_LOW_HP(s); },
    });
    const d = await page.evaluate(() => ({
      cls: document.querySelector(".battle-arena")?.className,
      layer: !!document.querySelector(".arena-fx-layer"),
      fxEls: document.querySelectorAll(".fx-spark, .fx-beam, .fx-ring, .fx-flash").length,
      lowHp: document.querySelector(".battle-arena")?.classList.contains("low-hp"),
    }));
    console.log("D:", JSON.stringify(d));
    if (!d.cls?.includes("fx-reduced")) problems.push("(D) fx-reduced-Klasse fehlt");
    if (d.layer) problems.push("(D) .arena-fx-layer existiert trotz reduced");
    if (d.fxEls > 0) problems.push(`(D) ${d.fxEls} FX-Elemente trotz reduced`);
    if (!d.lowHp) problems.push("(D) Low-HP-Vignette fehlt in reduced (Opacity-Effekt soll bleiben)");
    const [punchR, shakeR, flashR] = await Promise.all([
      sawAnimation(page, ".arena-side-enemy .fighter-figure-punch", 10000),
      sawAnimation(page, ".battle-arena-stage", 3000),
      sawAnimation(page, ".arena-side-enemy .hit-flash-overlay", 10000),
    ]);
    console.log(`D punch=${punchR} shake=${shakeR} flash(bestehend)=${flashR}`);
    if (punchR) problems.push("(D) Punch läuft trotz reduced");
    if (shakeR) problems.push("(D) Arena-Shake läuft trotz reduced");
    if (!flashR) problems.push("(D) bestehender Hit-Flash läuft NICHT mehr in reduced (Regression)");
    await page.screenshot({ path: join(OUT_DIR, "d-reduced.png") });
    console.log("SHOT: d-reduced.png");
    await page.close();
  }

  // ── E) fxLevel "off": kein Layer, KEINE Vignette trotz 10 HP ────────────────────────────────
  {
    const { page } = await newBattlePage(browser, "E", {
      fxLevel: "off",
      patch: (s) => { BULL(s); NO_HEAL_LOW_HP(s); },
    });
    await page.waitForTimeout(4000);
    const e = await page.evaluate(() => ({
      cls: document.querySelector(".battle-arena")?.className,
      layer: !!document.querySelector(".arena-fx-layer"),
      lowHp: document.querySelector(".battle-arena")?.classList.contains("low-hp"),
    }));
    console.log("E:", JSON.stringify(e));
    if (!e.cls?.includes("fx-off")) problems.push("(E) fx-off-Klasse fehlt");
    if (e.layer) problems.push("(E) .arena-fx-layer existiert trotz off");
    if (e.lowHp) problems.push("(E) Low-HP-Vignette trotz off");
    await page.screenshot({ path: join(OUT_DIR, "e-off.png") });
    console.log("SHOT: e-off.png");
    await page.close();
  }

  console.log(problems.length ? "PROBLEME:\n- " + problems.join("\n- ") : "ALLE CHECKS GRÜN");
  console.log(errors.length ? `${errors.length} page errors:\n` + errors.slice(0, 10).join("\n") : "no page errors");
  await browser.close();
  process.exitCode = problems.length || errors.length ? 1 : 0;
} finally {
  child.kill();
}
