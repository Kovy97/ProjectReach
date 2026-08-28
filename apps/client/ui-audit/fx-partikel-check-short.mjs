#!/usr/bin/env node
/**
 * Kampfeffekte — Partikel-Schicht: KURZ-Verifikation (Chef-Auftrag: nicht weiter auf den vollen
 * 9-Szenen-Lauf warten, stattdessen Feuer + Status-Aufflammen + ein Nahkampf, kurze Timeouts).
 * Port 5474. Muster: fx-partikel-check.mjs (voller Lauf, dort auch die Doku der Helfer).
 */
import { startHarness } from "./sim-harness.mjs";

const OUT = "G:/GameDev/apps/client/ui-audit/shots-fx-partikel";
const MONSTER_ID = "bull_boss";
const MONSTER_HP = 67;

async function currentLogLength(page) {
  return page.evaluate(() => window.__hfDebug?.state?.combat?.log?.length ?? 0);
}

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
    },
    { monsterId: MONSTER_ID, hp: MONSTER_HP },
  );
  await h.page.waitForTimeout(200);
}

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
  await h.page.waitForTimeout(200);
}

async function main() {
  const h = await startHarness({ port: 5474, fixture: "midgame", locale: "de", viewport: { width: 1920, height: 1080 } });
  const { page } = h;
  const problems = [];
  try {
    await page.locator('[data-guide-id="sidebar.combat"]').first().click({ timeout: 8000 });
    await page.waitForTimeout(500);

    // ── Feuer normal ────────────────────────────────────────────────────────────────────────
    await equipAndEngage(h, "wisp_kindled_bough");
    {
      let got = false;
      for (let attempt = 0; attempt < 5 && !got; attempt++) {
        const sinceLen = await currentLogLength(page);
        const outcome = await waitForFreshEvent(page, { by: "player", kinds: ["hit", "crit"], sinceLen, timeoutMs: 8000 });
        if (outcome === "hit") {
          got = true;
          await page.waitForTimeout(260);
          await page.screenshot({ path: `${OUT}/feuer-normal.png` });
          console.log("SHOT SAVED: feuer-normal.png");
        } else if (outcome === "no-combat") {
          await respawn(h);
        } else {
          console.log(`(feuer) Versuch ${attempt + 1}: Timeout`);
        }
      }
      if (!got) problems.push("kein Feuer-normal-Screenshot");
    }

    // ── Perf-Messung (Haupt-Thread-Kontention, setTimeout-Kette statt rAF-vsync-Boden) ────
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
            if (now - start < 4000) setTimeout(tick, 0);
            else resolve(deltas);
          }
          setTimeout(tick, 0);
        }),
    );
    const sorted = [...frameDeltas].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)] ?? NaN;
    const max = frameDeltas.length ? Math.max(...frameDeltas) : NaN;
    console.log(`PERF: ${frameDeltas.length} Samples in 4s, Median ${median.toFixed(2)}ms, Max ${max.toFixed(2)}ms`);
    if (median >= 8) problems.push(`Median-Haupt-Thread-Latenz ${median.toFixed(2)}ms >= 8ms`);

    // ── Nahkampf-Beweis (slash_cut Partikel-Rezept läuft) ─────────────────────────────────
    await equipAndEngage(h, "murkvein_longsword");
    {
      let got = false;
      for (let attempt = 0; attempt < 5 && !got; attempt++) {
        const sinceLen = await currentLogLength(page);
        const outcome = await waitForFreshEvent(page, { by: "player", kinds: ["hit", "crit"], sinceLen, timeoutMs: 8000 });
        if (outcome === "hit") {
          got = true;
          await page.waitForTimeout(80);
          await page.screenshot({ path: `${OUT}/nahkampf.png` });
          console.log("SHOT SAVED: nahkampf.png");
        } else if (outcome === "no-combat") {
          await respawn(h);
        } else {
          console.log(`(nahkampf) Versuch ${attempt + 1}: Timeout`);
        }
      }
      if (!got) problems.push("kein Nahkampf-Screenshot");
    }

    // ── Status-Aufflammen (Schwert mit Brand-Verzauberung) ────────────────────────────────
    await patchWeaponEffect(h, "murkvein_longsword", { type: "burn", chance: 1, magnitude: 2, durationMs: 4200 });
    await equipAndEngage(h, "murkvein_longsword");
    {
      let got = false;
      for (let attempt = 0; attempt < 6 && !got; attempt++) {
        const sinceLen = await currentLogLength(page);
        const outcome = await waitForFreshStatus(page, sinceLen, 8000);
        if (outcome === "status") {
          got = true;
          await page.waitForTimeout(150);
          await page.screenshot({ path: `${OUT}/status-aufflammen.png` });
          console.log("SHOT SAVED: status-aufflammen.png");
        } else if (outcome === "no-combat") {
          await respawn(h);
        } else {
          console.log(`(status) Versuch ${attempt + 1}: Timeout`);
        }
      }
      if (!got) problems.push("kein Status-Aufflammen-Screenshot");
    }

    console.log(h.errors.length ? `PAGE ERRORS (${h.errors.length}):\n` + h.errors.slice(0, 20).join("\n") : "no page errors");
    console.log(problems.length ? `PROBLEME:\n- ${problems.join("\n- ")}` : "KEINE PROBLEME");
  } finally {
    await h.stop();
  }
}

await main();
