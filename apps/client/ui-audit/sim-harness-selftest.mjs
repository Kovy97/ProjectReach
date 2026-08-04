#!/usr/bin/env node
/**
 * sim-harness-selftest.mjs — self-test AND living usage example for sim-harness.mjs.
 *
 * Not a game-feature check (nothing here asserts anything about game design/content) — this is
 * infrastructure verification: does the harness module itself actually do what its API promises?
 * Kept around deliberately (unlike the sweep*-/review*- throwaway convention — see
 * SIM-AGENT-GUIDE.md) as the canonical "how do I use this" reference for the next agent.
 *
 * Three sequential sessions, all on the SAME port (5280) — sequential reuse also proves `stop()`
 * actually frees the port every time, not just that the module "runs once":
 *
 *   (A) Menu-Shot        — no `fixture`, bare menu screen, a screenshot + a DOM sanity check.
 *   (B) Fixture-Load     — `fixture: "midgame"`, confirms __hfDebug + sidebar are ready.
 *   (C) __hfDebug-Patch  — patchContent with `verify` (retry-until-sticks path) injecting a
 *                          synthetic quest, PLUS setState mutating a single state field, both
 *                          read back to confirm they actually landed on the live page.
 *
 * Run: node ui-audit/sim-harness-selftest.mjs   (from apps/client/, or anywhere — cwd-independent)
 */
import { withHarness } from "./sim-harness.mjs";

const PORT = 5280; // registered in SIM-AGENT-GUIDE.md — reused sequentially across all 3 sessions below.

const problems = [];

function check(cond, msg) {
  if (!cond) problems.push(msg);
  console.log(`${cond ? "OK" : "FAIL"}: ${msg}`);
}

// ── (A) Menu-Shot ─────────────────────────────────────────────────────────────────────────────
await withHarness({ port: PORT, fixture: null }, async (h) => {
  const menuInfo = await h.page.evaluate(() => ({
    menuPresent: !!document.querySelector(".menu"),
    navBtnCount: document.querySelectorAll(".menu-nav-btn").length,
  }));
  console.log("(A) menu info:", JSON.stringify(menuInfo));
  check(menuInfo.menuPresent, "(A) .menu is present on the bare start screen");
  check(menuInfo.navBtnCount >= 2, `(A) .menu-nav-btn count is >= 2 (got ${menuInfo.navBtnCount})`);

  const shotPath = await h.shot("selftest-01-menu");
  check(!!shotPath, "(A) shot() returned a path");
  check(h.errors.length === 0, `(A) no page errors (got ${h.errors.length}: ${h.errors.slice(0, 3).join(" | ")})`);
});

// ── (B) Fixture-Load ─────────────────────────────────────────────────────────────────────────
await withHarness({ port: PORT, fixture: "midgame" }, async (h) => {
  const loaded = await h.page.evaluate(() => ({
    hasDebugHook: !!window.__hfDebug,
    sidebarCount: document.querySelectorAll('[data-guide-id^="sidebar."]').length,
    charName: window.__hfDebug?.state?.character?.name ?? null,
  }));
  console.log("(B) fixture-load info:", JSON.stringify(loaded));
  check(loaded.hasDebugHook, "(B) window.__hfDebug is set after fixture load");
  check(loaded.sidebarCount > 0, `(B) sidebar nav buttons are present (got ${loaded.sidebarCount})`);
  check(!!loaded.charName, `(B) fixture character has a name (got ${JSON.stringify(loaded.charName)})`);

  await h.shot("selftest-02-fixture-midgame");
  check(h.errors.length === 0, `(B) no page errors (got ${h.errors.length}: ${h.errors.slice(0, 3).join(" | ")})`);

  // ── (C) __hfDebug-Patch: patchContent with verify (retry-until-sticks path) ─────────────────
  // Mirrors the real pattern from story-tab-check.mjs / dungeon-gate-check.mjs: apply a mutation,
  // then keep re-applying + re-checking until an independent verify() confirms it stuck. There's
  // no real fixture-load race left to fight by this point in the script (settle already happened
  // in startHarness), so this mainly proves the retry/verify plumbing itself works end-to-end.
  const patchResult = await h.patchContent(
    (dbg) => {
      if (!dbg.content.quests.some((q) => q.id === "sim_harness_selftest_quest")) {
        dbg.content.quests.push({
          id: "sim_harness_selftest_quest",
          name: { en: "Selftest Quest", de: "Selbsttest-Quest" },
          description: { en: "Injected by sim-harness-selftest.mjs.", de: "Von sim-harness-selftest.mjs injiziert." },
          objectives: [{ type: "kill_monster", target: "chicken", count: 1 }],
          rewards: { gold: 1 },
        });
      }
      return dbg.content.quests.filter((q) => q.id === "sim_harness_selftest_quest").length;
    },
    {
      verify: (dbg) => dbg.content.quests.filter((q) => q.id === "sim_harness_selftest_quest").length === 1,
      attempts: 4,
      settleMs: 300,
    },
  );
  console.log("(C) patchContent result:", patchResult);
  check(patchResult === 1, `(C) patchContent injected exactly one test quest (result was ${patchResult})`);

  const questStuck = await h.page.evaluate(
    () => window.__hfDebug.content.quests.filter((q) => q.id === "sim_harness_selftest_quest").length,
  );
  check(questStuck === 1, `(C) test quest is still present after patchContent returned (got ${questStuck})`);

  // setState: sugar for the common single-field mutation case.
  const MARKER_GOLD = 424242;
  await h.setState((state) => {
    state.character.gold = 424242;
  });
  const goldReadBack = await h.page.evaluate(() => window.__hfDebug.state.character.gold);
  console.log("(C) setState gold read-back:", goldReadBack);
  check(goldReadBack === MARKER_GOLD, `(C) setState wrote character.gold (got ${goldReadBack}, expected ${MARKER_GOLD})`);

  check(h.errors.length === 0, `(C) no page errors after patches (got ${h.errors.length}: ${h.errors.slice(0, 3).join(" | ")})`);
});

console.log(problems.length ? "PROBLEME:\n- " + problems.join("\n- ") : "ALLE CHECKS GRÜN");
if (problems.length) process.exitCode = 1;
