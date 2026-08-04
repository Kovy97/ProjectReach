#!/usr/bin/env node
/**
 * Task "Zonen-Fortschritt" self-check fixture: builds a save where the FIRST populated openworld
 * zone (content.zones order) is fully cleared — every monster in it has kills>0 AND every one of
 * its loot items is possessed (so the persistence sanitize-pass backfill, `discoverPossessedItems`,
 * marks them all `discoveredItems`) — while every other zone stays untouched (0 kills, no items),
 * i.e. "fresh". Lets the screenshot tour prove the gold complete-badge + progress row render
 * end-to-end instead of only trusting the code (endgame.json's random 32-kill spread doesn't
 * reliably hit 100% on any single zone).
 *
 * Run with tsx (same as gen-fixtures.mjs): node_modules/.bin/tsx ui-audit/gen-zoneprogress-fixture.mjs
 * (from apps/client/). Output: fixtures/zoneprogress.json + src/renderer/public/ui-audit-fixtures/zoneprogress.json
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { content } from "@hearthforge/content";
import { createGame } from "@hearthforge/engine";
import { serialize } from "@hearthforge/persistence";
import { legacyOnboarding } from "@hearthforge/shared";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CANONICAL_DIR = join(__dirname, "fixtures");
const SERVED_DIR = join(__dirname, "..", "src", "renderer", "public", "ui-audit-fixtures");

const state = createGame({ name: "Zonentester", startingStyle: "melee", starterKit: false }, content, 777);
state.onboarding = legacyOnboarding();

// Find the first content.zones entry that actually has monsters (mirrors CombatPage's ZONE_PROGRESS_INDEX
// grouping) and isn't the slayer tower (hidden from the zone grid in CombatPage).
const allMonsters = Object.values(content.monsters);
const targetZone = content.zones.find(
  (z) => z.id !== "slayer_tower" && allMonsters.some((m) => m.zone === z.id),
);
if (!targetZone) {
  console.error("No populated zone found in content.zones — nothing to complete.");
  process.exit(1);
}
const zoneMonsters = allMonsters.filter((m) => m.zone === targetZone.id);

// Straight into the bank (not `addItem`/inventory slots — those are capacity-limited and this
// test zone alone has ~30 distinct loot items, more than a fresh character's inventory holds).
// `discoverPossessedItems` (persistence sanitize-pass, runs on every load) unions bank qty>0 into
// `discoveredItems` just like inventory slots, so this is an equally valid "the player owns this"
// signal for the fixture's purposes.
for (const m of zoneMonsters) {
  state.monsterKills[m.id] = 5;
  for (const roll of m.loot) {
    state.bank[roll.itemId] = (state.bank[roll.itemId] ?? 0) + 1;
  }
}

// A second zone (any other populated one) stays completely untouched — 0 kills, "fresh" reference card.
const freshZone = content.zones.find(
  (z) => z.id !== targetZone.id && z.id !== "slayer_tower" && allMonsters.some((m) => m.zone === z.id),
);

console.log(`Completed zone: ${targetZone.id} (${zoneMonsters.length} monsters, ${zoneMonsters.reduce((n, m) => n + m.loot.length, 0)} loot rolls)`);
console.log(`Fresh zone left untouched: ${freshZone?.id ?? "(none found)"}`);

mkdirSync(CANONICAL_DIR, { recursive: true });
mkdirSync(SERVED_DIR, { recursive: true });
const json = serialize(state, Date.now());
writeFileSync(join(CANONICAL_DIR, "zoneprogress.json"), json, "utf8");
writeFileSync(join(SERVED_DIR, "zoneprogress.json"), json, "utf8");
console.log(`wrote zoneprogress.json (${json.length} bytes)`);
