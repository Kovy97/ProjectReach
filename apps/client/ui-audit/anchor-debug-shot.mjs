#!/usr/bin/env node
/**
 * Portrait-Anker-Sichtprüfung (Chef-Auftrag 28.08.2026 „Magie-Ankerpunkt"): lädt das midgame-
 * Fixture mit `?anchorDebug=1` (Dev-Schalter in CombatPage: roter Punkt = Magie-Anker, blauer =
 * Hand-Anker), betritt per State-Patch einen Kampf (Muster fx-partikel-check.mjs) und schießt je
 * Beispiel-Portrait (Stab / Bogen / Schwert) einen Screenshot nach ui-audit/shots-anchors/.
 * Zusatz: Magie-Waffe anlegen und einen Geschoss-Flug einfangen (Startpunkt = Stabspitze).
 * Port 5477.
 *
 *   node ui-audit/anchor-debug-shot.mjs
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { startHarness } from "./sim-harness.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "shots-anchors");
const PORT = 5477;
const MONSTER_ID = "bull_boss";
const MONSTER_HP = 67;
const PORTRAITS = [
  ["staff", "mage_f"],
  ["bow", "archer_f"],
  ["sword", "elf_rune_knight_f"],
];

async function engage(page) {
  await page.evaluate(
    ({ monsterId, hp }) => {
      const state = window.__hfDebug.state;
      state.combat.monsterId = monsterId;
      state.combat.enemyHp = hp;
      state.combat.enemyEffects = [];
      state.character.buffs = state.character.buffs || [];
    },
    { monsterId: MONSTER_ID, hp: MONSTER_HP },
  );
  await page.waitForSelector(".battle-arena-stage", { timeout: 10000 });
  await page.waitForTimeout(400);
}

async function currentLogLength(page) {
  return page.evaluate(() => window.__hfDebug?.state?.combat?.log?.length ?? 0);
}

async function waitForFreshPlayerHit(page, sinceLen, timeoutMs) {
  try {
    const handle = await page.waitForFunction(
      ({ sinceLen }) => {
        const cs = window.__hfDebug?.state?.combat;
        if (!cs) return "no-combat";
        const fresh = (cs.log || []).slice(sinceLen);
        if (fresh.some((e) => e.by === "player" && ["hit", "crit"].includes(e.kind) && e.amount > 0)) return "hit";
        return cs.monsterId ? false : "no-combat";
      },
      { sinceLen },
      { timeout: timeoutMs, polling: 20 },
    );
    return await handle.jsonValue();
  } catch {
    return null;
  }
}

const h = await startHarness({ port: PORT, fixture: "midgame", locale: "de", viewport: { width: 1920, height: 1080 }, outDir: OUT });
try {
  const { page } = h;
  // Zweiter Aufruf mit dem Dev-Schalter (startHarness kennt nur `?fixture=`).
  await page.goto(`http://localhost:${PORT}/?fixture=midgame&anchorDebug=1`, { waitUntil: "load" });
  await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
  await page.waitForFunction(() => !!window.__hfDebug, null, { timeout: 8000 });
  await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(4500); // Lade-Toasts abklingen lassen

  await h.clickRetry(page.locator('[data-guide-id="sidebar.combat"]').first());
  await page.waitForTimeout(500);
  await engage(page);

  for (const [label, id] of PORTRAITS) {
    // page.evaluate mit Argument statt setState: die Bridge serialisiert fn, ein Closure über `id` ginge verloren.
    await page.evaluate((pid) => {
      window.__hfDebug.state.character.portrait = pid;
    }, id);
    await page.waitForFunction(
      () => {
        const img = document.querySelector(".arena-side-player .fighter-figure-art img");
        return !!img && img.complete && img.naturalWidth > 0 && document.querySelectorAll(".anchor-debug-dot").length === 2;
      },
      null,
      { timeout: 10000 },
    );
    await page.waitForTimeout(900); // Intervall (400ms) einmal durchlaufen lassen
    const info = await page.evaluate(() => {
      const img = document.querySelector(".arena-side-player .fighter-figure-art img");
      const dots = Array.from(document.querySelectorAll(".anchor-debug-dot")).map((d) => `${d.style.display}@${d.style.left},${d.style.top}`);
      return { src: img?.getAttribute("src")?.split("/").pop(), natural: `${img?.naturalWidth}x${img?.naturalHeight}`, dots };
    });
    console.log(label, id, JSON.stringify(info));
    await h.shot(`anchor-${label}-${id}`);
    await page.locator(".arena-side-player").first().screenshot({ path: join(OUT, `anchor-${label}-${id}-crop.png`) });
    console.log(`SHOT SAVED: anchor-${label}-${id}-crop.png`);
  }

  // Zusatz: Magie-Geschoss vom Stab-Portrait aus einfangen (Waffe/Mana/Skill wie fx-partikel-check).
  await page.evaluate(() => {
    const state = window.__hfDebug.state;
    state.character.portrait = "mage_f";
    state.character.equipment.mainhand = "wisp_kindled_bough";
    state.character.equipment.offhand = null;
    state.character.mana = 999;
    state.skills.magic = { xp: 20_000_000 };
    state.capeCeremonySeen = state.capeCeremonySeen || {};
    state.capeCeremonySeen.magic = true;
  });
  await page.waitForTimeout(600);
  for (let i = 0; i < 4; i++) {
    const sinceLen = await currentLogLength(page);
    const outcome = await waitForFreshPlayerHit(page, sinceLen, 15000);
    if (outcome === "no-combat") {
      await engage(page);
      continue;
    }
    if (outcome !== "hit") {
      console.log(`Flug-Versuch ${i + 1}: kein frischer Treffer`);
      continue;
    }
    await page.waitForTimeout(60 + i * 70);
    await h.shot(`anchor-missile-flight-${i}`);
  }
  if (h.errors.length) console.log("PAGE ERRORS:\n" + h.errors.join("\n"));
  else console.log("keine Seitenfehler");
} finally {
  await h.stop();
}
