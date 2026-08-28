#!/usr/bin/env node
/**
 * Elementar-Effekte (28.08.2026, Chef-Auftrag an ui-dev) — Verifikations-Screenshots fuer die
 * neuen Kampfprotokoll-Zeilen (Schock-Verzoegerung, Einfrieren, Gift-Stapel, Entzug) und das
 * Entzug-Status-Icon. Muster: fx-partikel-check.mjs (equipAndEngage/respawn/patchWeaponEffect via
 * window.__hfDebug, capeCeremonySeen.magic=true). Port 5478 laut Auftrag, fixture midgame.
 *
 * Waffen (Chef-Zuweisung): Blitz=steel_wand, Frost=mithril_staff, Leere=blacksteel_staff,
 * Gift=runite_staff. `chance` wird je Waffe auf 1 gepatcht (ephemer, nur im laufenden Tab) fuer
 * deterministische/kurze Procs statt auf echtes RNG-Glueck zu warten.
 *
 * CSP-Falle (neu entdeckt): `page.waitForFunction` mit einer per String+eval() rekonstruierten
 * Praedikat-Funktion wird von der echten App-CSP (script-src 'self', kein unsafe-eval, s.
 * index.html) geblockt — ANDERS als `page.evaluate` (dessen eval-Trick, s. sim-harness.mjs
 * evalDebug, nachweislich funktioniert: CDP callFunctionOn ist CSP-exempt, waitForFunctions
 * interne Poll-Injektion offenbar nicht). Deshalb hier ein eigener, DATENgetriebener Poll-Loop
 * über `page.evaluate` (Kriterien als reines JSON, keine Funktions-Serialisierung) statt
 * `page.waitForFunction`.
 */
import { startHarness } from "./sim-harness.mjs";

const OUT = "G:/GameDev/apps/client/ui-audit/shots-elementar";
const MONSTER_ID = "bull_boss";
const MONSTER_HP = 9999; // hoch genug, damit der Encounter waehrend der Beobachtungsfenster nicht vorzeitig endet

async function currentLogLength(page) {
  return page.evaluate(() => window.__hfDebug?.state?.combat?.log?.length ?? 0);
}

/** Datengetriebener Poll-Loop (s. CSP-Kommentar oben) statt page.waitForFunction+eval. `criteria`
 *  ist ein reines Kriterien-Objekt ({kind,status,by,missReason,minAmount}), gegen jedes NEUE
 *  Log-Event ab `sinceLen` geprueft. Rueckgabe "found" | "no-combat" | null (Timeout). */
async function waitForLogMatch(page, sinceLen, criteria, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const result = await page.evaluate(
      ({ sinceLen, criteria }) => {
        const cs = window.__hfDebug?.state?.combat;
        if (!cs) return "no-combat";
        const fresh = (cs.log || []).slice(sinceLen);
        const found = fresh.some((e) => {
          if (criteria.kind && e.kind !== criteria.kind) return false;
          if (criteria.status && e.status !== criteria.status) return false;
          if (criteria.by && e.by !== criteria.by) return false;
          if (criteria.missReason && e.missReason !== criteria.missReason) return false;
          if (criteria.minAmount !== undefined && !(e.amount >= criteria.minAmount)) return false;
          return true;
        });
        if (found) return "found";
        return cs.monsterId ? "pending" : "no-combat";
      },
      { sinceLen, criteria },
    );
    if (result === "found" || result === "no-combat") return result;
    await page.waitForTimeout(200);
  }
  return null;
}

async function patchWeaponChance(h, itemId, mutateSrc) {
  await h.page.evaluate(
    ({ itemId, mutateSrc }) => {
      const item = window.__hfDebug.content.items[itemId];
      const mutate = (0, eval)(`(${mutateSrc})`);
      mutate(item);
    },
    { itemId, mutateSrc },
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
      state.capeCeremonySeen.magic = true; // sonst deckt die Meisterweihe die Arena ab
      state.combat.monsterId = monsterId;
      state.combat.enemyHp = hp;
      state.combat.enemyEffects = [];
      state.combat.elemental = undefined;
    },
    { mainhand, monsterId: MONSTER_ID, hp: MONSTER_HP },
  );
  await h.page.waitForSelector(".battle-arena-stage", { timeout: 10000 });
  await h.page.waitForTimeout(300);
}

async function main() {
  const h = await startHarness({ port: 5478, fixture: "midgame", locale: "de", viewport: { width: 1600, height: 1000 } });
  const { page } = h;
  const problems = [];
  const notes = [];
  try {
    await page.locator('[data-guide-id="sidebar.combat"]').first().click({ timeout: 8000 });
    await page.waitForTimeout(500);

    // ── Blitz (Schock-Verzoegerung, steel_wand, chance→1) ────────────────────────────────
    await patchWeaponChance(h, "steel_wand", "(item) => { item.weaponEffect.chance = 1; }");
    await equipAndEngage(h, "steel_wand");
    {
      const sinceLen = await currentLogLength(page);
      const outcome = await waitForLogMatch(page, sinceLen, { kind: "status", status: "shock", minAmount: 1 }, 15000);
      if (outcome !== "found") {
        problems.push(`Kein Schock-Verzoegerung-Log-Eintrag gefunden (outcome=${outcome})`);
      } else {
        // ein paar weitere Treffer abwarten, damit die Kette Richtung Deckel (1,2s) laeuft
        await page.waitForTimeout(9000);
        await page.locator(".battle-log-panel").screenshot({ path: `${OUT}/schock-log.png` });
        console.log("SHOT SAVED: schock-log.png");
        const lines = await page.evaluate(() =>
          (window.__hfDebug.state.combat.log || [])
            .filter((e) => e.kind === "status" && e.status === "shock")
            .map((e) => e.amount),
        );
        notes.push(`Schock-Verzoegerung amounts (ms): ${JSON.stringify(lines)}`);
      }
    }

    // ── Frost (Einfrieren, mithril_staff, chance→1) ──────────────────────────────────────
    await patchWeaponChance(h, "mithril_staff", "(item) => { item.weaponEffect.chance = 1; }");
    await equipAndEngage(h, "mithril_staff");
    {
      const sinceLen = await currentLogLength(page);
      const outcome = await waitForLogMatch(page, sinceLen, { kind: "miss", missReason: "frozen", by: "enemy" }, 30000);
      if (outcome !== "found") {
        problems.push(`Kein Einfrieren-Log-Eintrag (missReason frozen, Gegner) gefunden (outcome=${outcome})`);
      } else {
        await page.waitForTimeout(400);
        await page.locator(".battle-log-panel").screenshot({ path: `${OUT}/frost-log.png` });
        console.log("SHOT SAVED: frost-log.png");
      }
    }

    // ── Gift (Stapel-Zeile, runite_staff, chance→1) ──────────────────────────────────────
    await patchWeaponChance(h, "runite_staff", "(item) => { item.weaponEffect.chance = 1; }");
    await equipAndEngage(h, "runite_staff");
    {
      const sinceLen = await currentLogLength(page);
      const outcome = await waitForLogMatch(page, sinceLen, { kind: "status", status: "poison", by: "player", minAmount: 2 }, 15000);
      if (outcome !== "found") {
        problems.push(`Kein Gift-Stapel-Log-Eintrag gefunden (outcome=${outcome})`);
      } else {
        await page.waitForTimeout(400);
        await page.locator(".battle-log-panel").screenshot({ path: `${OUT}/gift-log.png` });
        console.log("SHOT SAVED: gift-log.png");
      }
    }

    // ── Leere (Entzug, blacksteel_staff, chance→1 auf weaponEffects[0]) ──────────────────
    await patchWeaponChance(
      h,
      "blacksteel_staff",
      "(item) => { const fx = item.weaponEffects?.find((e) => e.type === 'void'); if (fx) fx.chance = 1; }",
    );
    await equipAndEngage(h, "blacksteel_staff");
    {
      const sinceLen = await currentLogLength(page);
      const outcome = await waitForLogMatch(page, sinceLen, { kind: "status", status: "void", by: "player" }, 15000);
      if (outcome !== "found") {
        problems.push(`Kein Entzug-Log-Eintrag gefunden (outcome=${outcome})`);
      } else {
        await page.waitForTimeout(400);
        await page.locator(".battle-log-panel").screenshot({ path: `${OUT}/entzug-log.png` });
        console.log("SHOT SAVED: entzug-log.png");
        // Entzug-Icon: das Debuff-Badge auf der Gegner-Figur (fighter-effects-overlay).
        const enemyBadge = page.locator(".arena-side-enemy .effect-badge").first();
        try {
          await enemyBadge.screenshot({ path: `${OUT}/entzug-icon.png` });
          console.log("SHOT SAVED: entzug-icon.png");
          const title = await enemyBadge.getAttribute("title");
          notes.push(`Entzug-Icon-Tooltip: ${title}`);
        } catch (e) {
          problems.push(`Entzug-Icon-Badge nicht gefunden: ${e.message}`);
        }
        // volle Arena-Ansicht (Icon im Kontext) zusaetzlich.
        await page.locator(".battle-arena-stage").screenshot({ path: `${OUT}/entzug-arena.png` });
        console.log("SHOT SAVED: entzug-arena.png");
      }
    }

    // ── Frost-Tooltip-Zaehler: nochmal Frost anlegen und den Badge-Titel auslesen ────────
    await patchWeaponChance(h, "mithril_staff", "(item) => { item.weaponEffect.chance = 1; }");
    await equipAndEngage(h, "mithril_staff");
    {
      const sinceLen = await currentLogLength(page);
      const outcome = await waitForLogMatch(page, sinceLen, { kind: "status", status: "frost" }, 10000);
      if (outcome === "found") {
        await page.waitForTimeout(200);
        const enemyBadge = page.locator(".arena-side-enemy .effect-badge").first();
        const title = await enemyBadge.getAttribute("title").catch(() => null);
        notes.push(`Frost-Icon-Tooltip (nach 1. Anwendung): ${title}`);
      }
    }

    // ── Schock-Tooltip-Zaehler ────────────────────────────────────────────────────────────
    await patchWeaponChance(h, "steel_wand", "(item) => { item.weaponEffect.chance = 1; }");
    await equipAndEngage(h, "steel_wand");
    {
      const sinceLen = await currentLogLength(page);
      const outcome = await waitForLogMatch(page, sinceLen, { kind: "status", status: "shock", minAmount: 1 }, 10000);
      if (outcome === "found") {
        await page.waitForTimeout(200);
        const enemyBadge = page.locator(".arena-side-enemy .effect-badge").first();
        const title = await enemyBadge.getAttribute("title").catch(() => null);
        notes.push(`Schock-Icon-Tooltip (nach 1. Anwendung): ${title}`);
      }
    }

    if (h.errors.length) {
      console.log("PAGE ERRORS:\n" + h.errors.join("\n"));
    }
    console.log("\nNOTES:\n" + notes.join("\n"));
    if (problems.length) {
      console.log("\nPROBLEMS:\n" + problems.join("\n"));
      process.exitCode = 1;
    } else {
      console.log("\nALLE SZENEN OK");
    }
  } finally {
    await h.stop();
  }
}

main();
