#!/usr/bin/env node
/**
 * Hotfix repro (Discord bug report, screenshot #54): item-tooltip OFFENSE block shows empty value
 * cells (Speed/Effective/DPS/Ward Break/Mana Cost) for a magic weapon (wand), while the header line
 * ("FAST · WARD BREAK · FROST/SHOCK") proves the data exists. Generates FOUR tiny fixtures — one
 * rare weapon per style (melee/ranged/magic-staff/magic-wand) — so the tooltip can be screenshotted
 * for all four and compared, per the CEO's guard requirement ("mehrere Waffentypen").
 *
 * Run with tsx (workspace packages export raw TS): node_modules/.bin/tsx ui-audit/gen-wandbug-fixture.mjs
 * (run from apps/client/)
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { content } from "@hearthforge/content";
import { createGame, addItem, equipItem, computeStats, xpForLevel } from "@hearthforge/engine";
import { serialize } from "@hearthforge/persistence";
import { legacyOnboarding } from "@hearthforge/shared";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CANONICAL_DIR = join(__dirname, "fixtures");
const SERVED_DIR = join(__dirname, "..", "src", "renderer", "public", "ui-audit-fixtures");

function buildFixture(charName, seed, mainhandId) {
  const state = createGame({ name: charName, startingStyle: "melee", starterKit: false }, content, seed);
  state.onboarding = legacyOnboarding();
  // Mark EVERY known tour/guide seen (not just a fixed subset) — App.tsx currently mounts
  // featureTourV1 AND featureTourV2 (chained via requiresTourKey), plus per-page AreaTourGuide
  // instances (combat/shop/bank). Missing featureTourV2 here caused a full-viewport `.guide-bubble`
  // overlay to block every click/hover during this repro's own diagnostic pass — hardcode the
  // known set generously so a future v3 doesn't silently reintroduce the same trap.
  for (const key of ["featureTourV1", "featureTourV2", "combat", "shop", "bank"]) {
    state.onboarding.toursSeen[key] = true;
  }

  // High-but-not-99 level on every skill (meets any weapon requirement regardless of style).
  // NOT level 99: `pendingCapeCeremonies`/MasteryCeremony.tsx fires a full-viewport, click-blocking
  // "Meisterweihe" modal for every skill freshly AT 99 with no `capeCeremonySeen` flag — with every
  // skill maxed at once, one pops immediately and intercepts every subsequent click/hover in this
  // script (found the hard way: `<div class="mwc-backdrop">…</div> intercepts pointer events`).
  // gen-fixtures.mjs's own fixtures dodge this the same way (endgame caps at 92/97, never 99).
  for (const id of Object.keys(content.skills)) {
    state.skills[id] = { xp: xpForLevel(90) };
  }

  addItem(state.inventory, content, mainhandId, 1);
  const res = equipItem(state, content, mainhandId);
  if (!res.ok) {
    console.error(`FAILED to equip ${mainhandId}: ${res.reason}`);
    process.exit(1);
  }

  const stats = computeStats(state, content);
  state.character.hp = stats.maxHp;
  state.character.mana = stats.maxMana;
  state.character.gold = 10_000;

  return state;
}

const fixtures = [
  ["wandbug_wand", 101, "chitinshell_sparker"], // WAND · rare — the exact repro from the report
  ["wandbug_staff", 102, "wisp_kindled_bough"], // STAFF · rare — same magic style, twoHanded
  ["wandbug_bow", 103, "soulflayer_snapbow"], // SHORTBOW · epic — ranged style control
  ["wandbug_sword", 104, "murkvein_longsword"], // SWORD · control for melee style (if present)
];

mkdirSync(CANONICAL_DIR, { recursive: true });
mkdirSync(SERVED_DIR, { recursive: true });

for (const [name, seed, itemId] of fixtures) {
  if (!content.items[itemId]) {
    console.warn(`skip ${name}: item ${itemId} not found in catalog`);
    continue;
  }
  const state = buildFixture("Repro " + itemId, seed, itemId);
  const json = serialize(state, Date.now());
  writeFileSync(join(CANONICAL_DIR, `${name}.json`), json, "utf8");
  writeFileSync(join(SERVED_DIR, `${name}.json`), json, "utf8");
  console.log(`wrote ${name} (mainhand=${itemId}, ${json.length} bytes)`);
}
