#!/usr/bin/env node
/**
 * Task #325 verification: (1) the Vhazrak Kampf-Bühne art fix (Battle now resolves enemy art via
 * `getEliteMonsterSrc` when `cs.eliteVariantId` is set, instead of always `getMonsterSrc(monster.id)`
 * — which showed the BASE monster art because `monster.id` stays the base-mob id for kill-credit
 * consistency); (2) the rebuilt ChampionDefeatCeremony (material drops + a highlighted unique with
 * the suffix-sparkle accent). Port 5331 per SIM-AGENT-GUIDE.md registry.
 *
 * Run from apps/client/: node ui-audit/champion-defeat-325-shot.mjs
 */
import { withHarness } from "./sim-harness.mjs";

const OUT_DIR = "C:\\Users\\MSchu\\AppData\\Local\\Temp\\claude\\G--GameDev\\553d2095-3a73-4795-9782-0fe746a25f13\\scratchpad";

await withHarness({ port: 5331, fixture: "midgame", outDir: OUT_DIR }, async (h) => {
  // ── 1) Vhazrak Kampf-Bühne art fix ────────────────────────────────────────────────────────
  // Force an active elite fight directly on the live CombatState (bypasses zone-gate — a fight
  // already in progress doesn't re-check unlocks) and jump straight to the combat page, which
  // renders <Battle> immediately because `state.combat.monsterId` is already set.
  await h.setState((state) => {
    Object.assign(state.combat, {
      monsterId: "goblin_warlock",
      eliteVariantId: "elite_border_warlock",
      enemyHp: 99999, // clamped to 100% by the HP-bar — exact scaled max doesn't matter for this check
      playerTimerMs: 0,
      enemyTimerMs: 0,
      cooldownRemainingMs: 0,
      dungeonId: null,
      paragonFloor: undefined,
      encounterIndex: 0,
      log: [],
      eventCount: 0,
      enemyEffects: [],
      playerEffects: [],
    });
  });

  await h.clickRetry(h.page.locator('[data-guide-id="sidebar.combat"]').first());
  await h.page.waitForTimeout(700);
  await h.shot("champion-325-01-battle-elite-art", { fullPage: false });

  const enemyImgSrc = await h.page
    .locator(".arena-side-enemy .fighter-figure img, .arena-side-enemy img")
    .first()
    .getAttribute("src")
    .catch(() => null);
  console.log(`ENEMY IMG SRC: ${enemyImgSrc}`);
  if (enemyImgSrc && enemyImgSrc.includes("elite_border_warlock")) {
    console.log("PASS: battle stage resolved the ELITE-specific art (elite_border_warlock), not the base goblin_warlock art.");
  } else {
    console.log("FAIL: battle stage did NOT resolve elite_border_warlock art — got: " + enemyImgSrc);
  }

  // End the fake fight before moving on (avoid the arena intercepting the ceremony clicks below).
  await h.setState((state) => {
    state.combat.monsterId = null;
    state.combat.eliteVariantId = undefined;
  });
  await h.page.waitForTimeout(400);

  // ── 2) ChampionDefeatCeremony — material drops only ───────────────────────────────────────
  await h.setState((state) => {
    state.eliteKillSeq = (state.eliteKillSeq ?? 0) + 1;
    state.lastEliteKill = {
      variantId: "elite_border_warlock",
      atMs: state.elapsedMs,
      drops: [
        { itemId: "shaman_totem", qty: 4 },
        { itemId: "dim_essence", qty: 8 },
        { itemId: "ember_essence", qty: 4 },
      ],
      uniqueItemId: null,
      suffixRolled: false,
      bountyTokens: 1,
      seq: state.eliteKillSeq,
    };
  });
  await h.page.waitForTimeout(900);
  await h.shot("champion-325-02-ceremony-materials", { fullPage: false });

  // Dismiss immediately (Chef-Spec: Esc closes right away) before triggering the next one.
  await h.page.keyboard.press("Escape");
  await h.page.waitForTimeout(300);

  // ── 3) ChampionDefeatCeremony — highlighted unique + suffix-sparkle accent ────────────────
  await h.setState((state) => {
    state.eliteKillSeq = (state.eliteKillSeq ?? 0) + 1;
    state.lastEliteKill = {
      variantId: "elite_border_warlock",
      atMs: state.elapsedMs,
      drops: [{ itemId: "shaman_totem", qty: 4 }],
      uniqueItemId: "ashtongue_fetish",
      suffixRolled: true,
      bountyTokens: 1,
      seq: state.eliteKillSeq,
    };
  });
  await h.page.waitForTimeout(900);
  await h.shot("champion-325-03-ceremony-unique-suffix", { fullPage: false });

  if (h.errors.length) {
    console.log("PAGE ERRORS:\n" + h.errors.join("\n"));
  } else {
    console.log("No console/page errors observed.");
  }
});
