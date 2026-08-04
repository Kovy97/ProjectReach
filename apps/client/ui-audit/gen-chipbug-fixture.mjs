#!/usr/bin/env node
/**
 * Hotfix repro (Discord bug report, screenshot #54): the Smelt Steel action-card's material rack
 * chips clip "978" and "309…" at the chip edge instead of shrinking — the numbers exist (bank
 * stockpiles), the CHIP just can't fit them. Generates four fixtures with the smelt_steel inputs
 * (iron_ore, coal — see packages/content smelt_steel) stocked at 1/3/4/5-digit tiers in the BANK
 * (state.bank is a plain Record<ItemId, number>, no stack cap — unlike inventory slots, this is
 * exactly how a long-lived player's ore stockpile actually gets this large).
 *
 * Run: node_modules/.bin/tsx ui-audit/gen-chipbug-fixture.mjs   (from apps/client/)
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { content } from "@hearthforge/content";
import { createGame, xpForLevel } from "@hearthforge/engine";
import { serialize } from "@hearthforge/persistence";
import { legacyOnboarding } from "@hearthforge/shared";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CANONICAL_DIR = join(__dirname, "fixtures");
const SERVED_DIR = join(__dirname, "..", "src", "renderer", "public", "ui-audit-fixtures");

function buildFixture(charName, seed, ironOre, coal) {
  const state = createGame({ name: charName, startingStyle: "melee", starterKit: false }, content, seed);
  state.onboarding = legacyOnboarding();
  for (const key of ["featureTourV1", "featureTourV2", "combat", "shop", "bank"]) {
    state.onboarding.toursSeen[key] = true;
  }

  // Level 90, not 99 — see gen-wandbug-fixture.mjs comment: every skill freshly AT 99 queues a
  // full-viewport "Meisterweihe" modal (MasteryCeremony.tsx) that blocks every subsequent click.
  for (const id of Object.keys(content.skills)) {
    state.skills[id] = { xp: xpForLevel(90) }; // well past smelt_steel's levelRequired:20
  }

  state.bank.iron_ore = ironOre;
  state.bank.coal = coal;
  state.character.gold = 10_000;

  return state;
}

const fixtures = [
  ["chipbug_1d", 201, 7, 3],
  ["chipbug_3d", 202, 978, 309], // exact numbers from the Discord report
  ["chipbug_4d", 203, 4230, 1875],
  ["chipbug_5d", 204, 45210, 30988],
];

mkdirSync(CANONICAL_DIR, { recursive: true });
mkdirSync(SERVED_DIR, { recursive: true });

for (const [name, seed, ironOre, coal] of fixtures) {
  const state = buildFixture("Repro " + name, seed, ironOre, coal);
  const json = serialize(state, Date.now());
  writeFileSync(join(CANONICAL_DIR, `${name}.json`), json, "utf8");
  writeFileSync(join(SERVED_DIR, `${name}.json`), json, "utf8");
  console.log(`wrote ${name} (iron_ore=${ironOre}, coal=${coal}, ${json.length} bytes)`);
}
