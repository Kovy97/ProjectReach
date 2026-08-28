#!/usr/bin/env node
/**
 * Kampfeffekte — Partikel-Schicht (Chef-Entscheid 28.08.2026, erweitert 28.08.2026 „sofort ALLE
 * implementieren, für alle Waffen") — Verifikations-Screenshots + Perf-Messung für
 * fxParticles.ts/fxParticleLibrary.ts/ParticleStage. Muster: sim-harness.mjs (s.
 * _zauberfokus-tooltip.mjs) für den Harness-Rahmen, combat-fx-welle1-shot.mjs für den edge-
 * getriggerten Log-Wartemechanismus (neue Log-Einträge statt "irgendwann mal ein Treffer im Log"
 * — sonst reagiert man auf einen steinalten Eintrag). Port 5474 laut Auftrag.
 *
 * Themen-Waffen werden per `page.evaluate` gegen `window.__hfDebug.content.items.<id>.weaponEffect`
 * UMGESCHRIEBEN (ephemer, nur im laufenden Browser-Tab — kein Content-Package-Schreibzugriff):
 * `magicThemeFor` liest nur den Effekt-TYP für die Themen-Wahl (Chance/Magnitude egal), das lässt
 * sich an EINER Stab-Waffe (`voidcaller_staff`) für Frost/Gift/Arkan/Leere durchschalten, ohne im
 * echten Katalog nach passenden Items zu suchen. Für den Status-Ambient-Test bekommt ein
 * Nahkampf-Schwert (`murkvein_longsword`) künstlich `weaponEffect: burn, chance: 1` — „Schwert mit
 * Brand-Verzauberung" (Auftrag).
 *
 * Neun Kampf-Szenen auf EINER Harness-Instanz, per direktem State-Patch (`state.combat.monsterId`,
 * Muster juice-check.mjs `BULL()`) statt UI-Zonen-Navigation:
 *  (a) Feuer normal / (b) Feuer-Crit — wisp_kindled_bough (missile_fire-Rezept).
 *  (c) Blitz — voidcaller_staff, eigener shock-Effekt.
 *  (d) Frost / (e) Gift / (f) Arkan / (g) Leere — voidcaller_staff mit umgeschriebenem weaponEffect.
 *  (h) Aether — aether_orb (ID-Erkennung, kein eigener Statuseffekt).
 *  (i) Bogen — blacksteel_longbow (missile_arrow-Rezept).
 *  (j) Status-Aufflammen / (k) Status-Ambient — murkvein_longsword mit burn-Verzauberung.
 * Danach: 5s Haupt-Thread-Latenz-Messung während aktivem Feuer-Kampf (Ziel: Median < 8ms).
 *
 * Animationen werden hier NICHT eingefroren (Auftrag) — die Partikelschicht ist Canvas/rAF, kein
 * WAAPI; ein `page.screenshot()` fängt ohnehin nur den Ist-Zustand des Canvas zum Aufnahme-
 * Zeitpunkt ein, ein Freeze-Trick wäre wirkungslos für sie.
 */
import { startHarness } from "./sim-harness.mjs";

const OUT = "G:/GameDev/apps/client/ui-audit/shots-fx-partikel";
const MONSTER_ID = "bull_boss";
const MONSTER_HP = 67;

async function currentLogLength(page) {
  return page.evaluate(() => window.__hfDebug?.state?.combat?.log?.length ?? 0);
}

/** Edge-getriggert: wartet auf den ersten NEUEN Log-Eintrag ab `sinceLen` mit `by` in `kinds`
 *  (Muster combat-fx-welle1-shot.mjs `waitForFreshHit`, hier mit wählbaren `kinds`). Rückgabe
 *  "hit" | "no-combat" (Encounter endete ohne frischen Treffer) | null (Timeout). */
async function waitForFreshEvent(page, { by, kinds, sinceLen, timeoutMs }) {
  try {
    const handle = await page.waitForFunction(
      ({ by, kinds, sinceLen }) => {
        const cs = window.__hfDebug?.state?.combat;
        if (!cs) return "no-combat";
        const fresh = (cs.log || []).slice(sinceLen);
        const found = fresh.some((e) => e.by === by && kinds.includes(e.kind) && e.amount > 0);
        if (found) return "hit";
        return cs.monsterId ? false : "no-combat";
      },
      { by, kinds, sinceLen },
      { timeout: timeoutMs, polling: 20 },
    );
    return await handle.jsonValue();
  } catch {
    return null;
  }
}

async function freshEventKind(page, sinceLen, kind = "player") {
  return page.evaluate(
    ({ n, kind }) => {
      const cs = window.__hfDebug?.state?.combat;
      const evt = (cs?.log || []).slice(n).find((e) => e.by === kind && (e.kind === "hit" || e.kind === "crit") && e.amount > 0);
      return evt?.kind ?? null;
    },
    { n: sinceLen, kind },
  );
}

/** Wartet edge-getriggert auf den ersten neuen `kind:"status"`-Log-Eintrag mit `by==="player"`
 *  (Spieler legt Status auf den Gegner). */
async function waitForFreshStatus(page, sinceLen, timeoutMs) {
  try {
    const handle = await page.waitForFunction(
      (sinceLen) => {
        const cs = window.__hfDebug?.state?.combat;
        if (!cs) return "no-combat";
        const fresh = (cs.log || []).slice(sinceLen);
        if (fresh.some((e) => e.kind === "status" && e.by === "player")) return "status";
        return cs.monsterId ? false : "no-combat";
      },
      sinceLen,
      { timeout: timeoutMs, polling: 20 },
    );
    return await handle.jsonValue();
  } catch {
    return null;
  }
}

async function respawn(h) {
  await h.page.evaluate(
    ({ monsterId, hp }) => {
      const state = window.__hfDebug.state;
      state.combat.monsterId = monsterId;
      state.combat.enemyHp = hp;
      state.combat.enemyEffects = [];
      state.character.buffs = state.character.buffs || [];
    },
    { monsterId: MONSTER_ID, hp: MONSTER_HP },
  );
  await h.page.waitForTimeout(300);
}

/** Schreibt `content.items.<itemId>.weaponEffect` um (`null` löscht ihn) — ephemer, nur im
 *  laufenden Tab. `magicThemeFor` liest daraus nur den Effekt-Typ für die Themen-Wahl. */
async function patchWeaponEffect(h, itemId, effect) {
  await h.page.evaluate(
    ({ itemId, effect }) => {
      const item = window.__hfDebug.content.items[itemId];
      if (effect) item.weaponEffect = effect;
      else delete item.weaponEffect;
    },
    { itemId, effect },
  );
}

async function equipAndEngage(h, mainhand) {
  await h.page.evaluate(
    ({ mainhand, monsterId, hp }) => {
      const state = window.__hfDebug.state;
      state.character.equipment.mainhand = mainhand;
      state.character.equipment.offhand = null;
      state.character.mana = 999;
      state.skills.magic = { xp: 20_000_000 };
      state.capeCeremonySeen = state.capeCeremonySeen || {};
      state.capeCeremonySeen.magic = true; // Fix: Level-99-Magie loeste sonst die vollflaechige Meisterweihe ueber der Arena aus (gen-wandbug-fixture.mjs-Lektion)
      state.combat.monsterId = monsterId;
      state.combat.enemyHp = hp;
      state.combat.enemyEffects = [];
    },
    { mainhand, monsterId: MONSTER_ID, hp: MONSTER_HP },
  );
  await h.page.waitForSelector(".battle-arena-stage", { timeout: 10000 });
  await h.page.waitForTimeout(300);
}

/** Läuft einen Magie-/Bogen-Kampf, wartet auf einen frischen Spieler-Treffer, schießt einen
 *  Screenshot mitten im Effekt (mid-flight, `waitMs` nach dem Log-Eintrag) und respawnt bei Bedarf.
 *  Gibt `true` zurück, sobald der Screenshot gespeichert ist. */
async function shootAndCapture(h, { name, waitMs, maxAttempts = 10, timeoutMs = 15000 }) {
  const { page } = h;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const sinceLen = await currentLogLength(page);
    const outcome = await waitForFreshEvent(page, { by: "player", kinds: ["hit", "crit"], sinceLen, timeoutMs });
    if (outcome === "hit") {
      await page.waitForTimeout(waitMs);
      await page.screenshot({ path: `${OUT}/${name}.png` });
      console.log(`SHOT SAVED: ${name}.png`);
      return true;
    }
    if (outcome === "no-combat") {
      await respawn(h);
    } else {
      console.log(`(${name}) Versuch ${attempt + 1}: Timeout ohne frischen Treffer`);
    }
  }
  return false;
}

async function main() {
  const h = await startHarness({ port: 5474, fixture: "midgame", locale: "de", viewport: { width: 1920, height: 1080 } });
  const { page } = h;
  const problems = [];
  try {
    await page.locator('[data-guide-id="sidebar.combat"]').first().click({ timeout: 8000 });
    await page.waitForTimeout(500);

    // ── (a)+(b) Feuer normal + Feuer-Crit ─────────────────────────────────────────────────
    await equipAndEngage(h, "wisp_kindled_bough");
    let gotNormal = false;
    let gotCrit = false;
    for (let attempt = 0; attempt < 10 && (!gotNormal || !gotCrit); attempt++) {
      const sinceLen = await currentLogLength(page);
      const outcome = await waitForFreshEvent(page, { by: "player", kinds: ["hit", "crit"], sinceLen, timeoutMs: 15000 });
      if (outcome === "hit") {
        const kind = await freshEventKind(page, sinceLen);
        if (kind === "crit" && !gotCrit) {
          gotCrit = true;
          await page.waitForTimeout(260); // mitten im Flug (MISSILE_FLIGHT_MS=560)
          await page.screenshot({ path: `${OUT}/feuer-crit.png` });
          console.log("SHOT SAVED: feuer-crit.png");
        } else if (kind === "hit" && !gotNormal) {
          gotNormal = true;
          await page.waitForTimeout(260);
          await page.screenshot({ path: `${OUT}/feuer-normal.png` });
          console.log("SHOT SAVED: feuer-normal.png");
        }
      } else if (outcome === "no-combat") {
        await respawn(h);
      } else {
        console.log(`(a/b) Versuch ${attempt + 1}: Timeout ohne frischen Treffer`);
      }
    }
    if (!gotNormal) problems.push("kein Feuer-normal-Screenshot");
    if (!gotCrit) problems.push("kein Feuer-Crit-Screenshot");

    // ── Perf-Messung: 5s Haupt-Thread-Kontention während aktivem Feuer-Kampf ──────────────
    // NICHT rAF-zu-rAF (das misst in headless Chromium nur den virtuellen 60Hz-Vsync-Takt, immer
    // ~16,7ms Boden, egal wie billig die eigentliche Arbeit ist). Stattdessen `setTimeout(fn,0)`-
    // Kette: läuft NICHT vsync-getaktet, sondern sobald der Haupt-Thread frei wird — ihr Delta
    // zeigt echte Kontention durch ParticleStage.frame()/React/Engine-Tick.
    const frameDeltas = await page.evaluate(
      () =>
        new Promise((resolve) => {
          const deltas = [];
          let last = performance.now();
          const start = last;
          function tick() {
            const now = performance.now();
            deltas.push(now - last);
            last = now;
            if (now - start < 5000) setTimeout(tick, 0);
            else resolve(deltas);
          }
          setTimeout(tick, 0);
        }),
    );
    const sorted = [...frameDeltas].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)] ?? NaN;
    const max = frameDeltas.length ? Math.max(...frameDeltas) : NaN;
    console.log(`PERF: ${frameDeltas.length} Samples in 5s, Median ${median.toFixed(2)}ms, Max ${max.toFixed(2)}ms`);
    if (median >= 8) problems.push(`Median-Haupt-Thread-Latenz ${median.toFixed(2)}ms >= 8ms (Ziel unterschritten)`);

    // ── (c) Blitz (shock, voidcaller_staff eigener Effekt) ────────────────────────────────
    await patchWeaponEffect(h, "voidcaller_staff", { type: "shock", chance: 1, magnitude: 0.32, durationMs: 4500 });
    await equipAndEngage(h, "voidcaller_staff");
    if (!(await shootAndCapture(h, { name: "blitz", waitMs: 380 }))) problems.push("kein Blitz-Screenshot");

    // ── (d) Frost ──────────────────────────────────────────────────────────────────────────
    await patchWeaponEffect(h, "voidcaller_staff", { type: "frost", chance: 1, magnitude: 1, durationMs: 4000 });
    await equipAndEngage(h, "voidcaller_staff");
    if (!(await shootAndCapture(h, { name: "frost", waitMs: 260 }))) problems.push("kein Frost-Screenshot");

    // ── (e) Gift (poison) ─────────────────────────────────────────────────────────────────
    await patchWeaponEffect(h, "voidcaller_staff", { type: "poison", chance: 1, magnitude: 2, durationMs: 4000 });
    await equipAndEngage(h, "voidcaller_staff");
    if (!(await shootAndCapture(h, { name: "gift", waitMs: 260 }))) problems.push("kein Gift-Screenshot");

    // ── (f) Arkan (kein Statuseffekt, kein aether_/godspark_-Präfix → Standard-Thema) ─────
    await patchWeaponEffect(h, "voidcaller_staff", null);
    await equipAndEngage(h, "voidcaller_staff");
    if (!(await shootAndCapture(h, { name: "arkan", waitMs: 260 }))) problems.push("kein Arkan-Screenshot");

    // ── (g) Leere (void, bane-Effekt) ─────────────────────────────────────────────────────
    await patchWeaponEffect(h, "voidcaller_staff", { type: "bane", chance: 1, magnitude: 1, durationMs: 1000, targetFamily: "undead" });
    await equipAndEngage(h, "voidcaller_staff");
    if (!(await shootAndCapture(h, { name: "leere", waitMs: 260 }))) problems.push("kein Leere-Screenshot");

    // ── (h) Aether (ID-Erkennung, aether_orb — echter Content-Item ohne eigenen Statuseffekt) ─
    await equipAndEngage(h, "aether_orb");
    if (!(await shootAndCapture(h, { name: "aether", waitMs: 260 }))) problems.push("kein Aether-Screenshot");

    // ── (i) Bogen (missile_arrow) ──────────────────────────────────────────────────────────
    await equipAndEngage(h, "blacksteel_longbow");
    if (!(await shootAndCapture(h, { name: "bogen", waitMs: 260 }))) problems.push("kein Bogen-Screenshot");

    // ── (j)+(k) Status-Aufflammen + Ambient (Schwert mit Brand-Verzauberung) ──────────────
    await patchWeaponEffect(h, "murkvein_longsword", { type: "burn", chance: 1, magnitude: 2, durationMs: 4200 });
    await equipAndEngage(h, "murkvein_longsword");
    let gotFlare = false;
    let gotAmbient = false;
    for (let attempt = 0; attempt < 10 && (!gotFlare || !gotAmbient); attempt++) {
      const sinceLen = await currentLogLength(page);
      const outcome = await waitForFreshStatus(page, sinceLen, 15000);
      if (outcome === "status") {
        if (!gotFlare) {
          gotFlare = true;
          await page.waitForTimeout(150);
          await page.screenshot({ path: `${OUT}/status-aufflammen.png` });
          console.log("SHOT SAVED: status-aufflammen.png");
        }
        if (!gotAmbient) {
          await page.waitForTimeout(900);
          const stillBurning = await page.evaluate(() => (window.__hfDebug?.state?.combat?.enemyEffects || []).some((e) => e.type === "burn"));
          if (stillBurning) {
            gotAmbient = true;
            await page.screenshot({ path: `${OUT}/status-ambient.png` });
            console.log("SHOT SAVED: status-ambient.png");
          }
        }
      } else if (outcome === "no-combat") {
        await respawn(h);
      } else {
        console.log(`(j/k) Versuch ${attempt + 1}: Timeout ohne frischen Status`);
      }
    }
    if (!gotFlare) problems.push("kein Status-Aufflammen-Screenshot");
    if (!gotAmbient) problems.push("kein Status-Ambient-Screenshot (Burn lief vorzeitig ab oder proccte nicht)");

    console.log(h.errors.length ? `PAGE ERRORS (${h.errors.length}):\n` + h.errors.slice(0, 20).join("\n") : "no page errors");
    console.log(problems.length ? `PROBLEME:\n- ${problems.join("\n- ")}` : "KEINE PROBLEME");
  } finally {
    await h.stop();
  }
}

await main();
