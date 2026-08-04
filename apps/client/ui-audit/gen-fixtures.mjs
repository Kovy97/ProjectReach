#!/usr/bin/env node
/**
 * Generates the two GameState fixtures used by the UI-Audit screenshot tour (tour.mjs).
 *
 * Run with tsx (the workspace packages export raw TypeScript, so a plain `node` run can't resolve
 * their extensionless relative imports — tsx transpiles on the fly, same as vitest does for tests):
 *
 *   pnpm --filter @hearthforge/client ui-audit:fixtures
 *   # or directly:
 *   node_modules/.bin/tsx ui-audit/gen-fixtures.mjs   (run from apps/client/)
 *
 * Deliberately generic/content-driven: no hardcoded item/monster/pet IDs. Fixtures are built by
 * filtering the live @hearthforge/content catalog (by type/slot/value), so this script keeps working
 * as content-dev adds/removes/renames items — no fixture maintenance needed on content churn.
 *
 * Output (both are written — see README.md "Why two copies" for why):
 *   - apps/client/ui-audit/fixtures/<name>.json               (canonical, human/agent-inspectable)
 *   - apps/client/src/renderer/public/ui-audit-fixtures/<name>.json  (served by the Vite dev server)
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { content } from "@hearthforge/content";
import {
  createGame,
  addItem,
  equipItem,
  meetsRequirements,
  setActiveAction,
  computeStats,
  totalLevel,
  levelFromXp,
  xpForLevel,
} from "@hearthforge/engine";
import { serialize } from "@hearthforge/persistence";
import { EQUIP_SLOTS, legacyOnboarding } from "@hearthforge/shared";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CANONICAL_DIR = join(__dirname, "fixtures");
const SERVED_DIR = join(__dirname, "..", "src", "renderer", "public", "ui-audit-fixtures");

const COMBAT_SKILLS = ["attack", "power", "defence", "ranged", "magic_off", "magic_def", "vitality"];

// ─────────────────────────────────────────────────────────────────────────
// Generic content pickers — filter the live catalog instead of hardcoding IDs.
// ─────────────────────────────────────────────────────────────────────────

function allEquipment(slot) {
  return Object.values(content.items)
    .filter((it) => it.type === "equipment" && it.slot === slot)
    .sort((a, b) => (a.value ?? 0) - (b.value ?? 0));
}

function toolsForSkill(skillId) {
  return Object.values(content.items)
    .filter((it) => it.type === "tool" && it.tool?.skill === skillId)
    .sort((a, b) => (a.value ?? 0) - (b.value ?? 0));
}

function materialItems() {
  return Object.values(content.items)
    .filter((it) => it.type === "material")
    .sort((a, b) => a.id.localeCompare(b.id));
}

function foodItems() {
  return Object.values(content.items)
    .filter((it) => it.type === "consumable" && (it.healAmount ?? 0) > 0)
    .sort((a, b) => (a.value ?? 0) - (b.value ?? 0));
}

function buffItems() {
  return Object.values(content.items).filter((it) => !!it.buff);
}

/** Picks the item at roughly `fraction` (0..1) through a value-sorted list, walking down to the
 * nearest one the current state actually qualifies for (defensive — fraction is a rough tier hint,
 * not a guarantee the requirements line up exactly). */
function pickAtTier(state, list, fraction) {
  if (list.length === 0) return null;
  const idx = Math.min(list.length - 1, Math.max(0, Math.floor(list.length * fraction)));
  for (let i = idx; i >= 0; i--) {
    if (meetsRequirements(state, list[i])) return list[i];
  }
  return meetsRequirements(state, list[0]) ? list[0] : null;
}

function pickAction(skillId, atLevel) {
  const candidates = Object.values(content.actions).filter(
    (a) => a.skill === skillId && (a.levelRequired ?? 1) <= atLevel,
  );
  candidates.sort((a, b) => (b.levelRequired ?? 1) - (a.levelRequired ?? 1));
  return candidates[0] ?? null;
}

function setSkillLevel(state, skillId, level) {
  if (!content.skills[skillId]) return;
  state.skills[skillId] = { xp: xpForLevel(level) };
}

function equipFromInventory(state, itemId, label) {
  addItem(state.inventory, content, itemId, 1);
  const res = equipItem(state, content, itemId);
  if (!res.ok) {
    console.warn(`  [warn] could not equip ${itemId}${label ? ` (${label})` : ""}: ${res.reason}`);
  }
  return res.ok;
}

// ─────────────────────────────────────────────────────────────────────────
// Fixture builder
// ─────────────────────────────────────────────────────────────────────────

function buildFixture(opts) {
  const {
    charName,
    seed,
    combatSkillLevel,
    gatherSkillLevel,
    gearFraction,
    invMaterialCount,
    invQtyMax,
    achievementCount,
    petCount,
    withCompanion,
    monsterKillCount,
    withActiveAction,
    buffCount,
    hpFraction,
    manaFraction,
    goldAmount,
    masteryEntries,
  } = opts;

  const state = createGame({ name: charName, startingStyle: "melee", starterKit: false }, content, seed);

  // Both fixtures are seasoned characters, not fresh saves — and `OnboardingGuide` makes ONLY the
  // spotlighted element clickable while active (createGame defaults new saves to active:true, step 0),
  // which would block the tour from clicking anything else. `legacyOnboarding()` is the engine's own
  // "already completed" state (same as any pre-guide save).
  state.onboarding = legacyOnboarding();
  // Perf-Welle (2026-07-22) fix: `legacyOnboarding()` only marks the MAIN guide done (`done: true`)
  // — `toursSeen` comes back empty, so the newer area/feature tours (FeatureTourGuide.tsx,
  // AreaTourGuide.tsx on Combat/Shop/Bank) still consider themselves unseen and pop up a
  // click-blocking overlay the moment tour.mjs navigates to those pages, stalling the whole
  // screenshot sweep. Mark all of them seen too — same "seasoned character" rationale as above.
  state.onboarding.toursSeen.featureTourV1 = true;
  // featureTourV2 (New-Haven-Rundgang, seit 2026-08-03) ebenfalls — sonst blockiert das
  // "Was ist neu"-Spotlight jeden Sweep, der frisch generierte Fixtures lädt (Hotfix-Nebenfund 04.08.).
  state.onboarding.toursSeen.featureTourV2 = true;
  state.onboarding.toursSeen.combat = true;
  state.onboarding.toursSeen.shop = true;
  state.onboarding.toursSeen.bank = true;

  // ── Skills: combat skills to one level, everything else (gathering/crafting) to another. ──
  for (const id of Object.keys(content.skills)) {
    setSkillLevel(state, id, COMBAT_SKILLS.includes(id) ? combatSkillLevel : gatherSkillLevel);
  }
  state.character.totalLevel = totalLevel(state, content);

  // ── Gear: fill every sensible melee slot at roughly `gearFraction` through the value curve. ──
  const skipSlots = new Set(["ammo", "tool1", "tool2", "ring2"]);
  for (const slot of EQUIP_SLOTS) {
    if (skipSlots.has(slot)) continue;
    const list = allEquipment(slot).filter((it) => !it.twoHanded);
    const pick = pickAtTier(state, list, gearFraction);
    if (pick) equipFromInventory(state, pick.id, slot);
  }
  // Second ring (equipItem auto-routes a 2nd distinct ring1-slot item into ring2).
  // KNOWN ENGINE/PERSISTENCE BUG (found while building this tool, reported to CEO — logic-dev
  // territory, not fixed here): packages/persistence sanitizeState nulls out ANY equipment slot
  // where `content.items[id].slot !== slot` — true for every ring in "ring2" (rings declare their
  // canonical slot as "ring1"; the 2nd ring legitimately lives in "ring2"). Net effect: a 2nd
  // equipped ring silently vanishes on the very next deserialize (app restart / slot load / this
  // fixture hook). We still equip it here (harmless, and it'll "just work" once that's fixed) —
  // don't be surprised the served fixture only shows one ring.
  const ring1Id = state.character.equipment.ring1;
  const ringList = allEquipment("ring1").filter((it) => it.id !== ring1Id);
  const ring2Pick = pickAtTier(state, ringList, Math.min(1, gearFraction + 0.1));
  if (ring2Pick) equipFromInventory(state, ring2Pick.id, "ring2");
  // Tools (mining pickaxe + fishing rod — dedicated type:"tool" items exist for these two skills;
  // woodcutting/foraging axes/sickles are usually type:"equipment" mainhand weapons instead).
  const toolPick1 = pickAtTier(state, toolsForSkill("mining"), gearFraction);
  if (toolPick1) equipFromInventory(state, toolPick1.id, "tool1");
  const toolPick2 = pickAtTier(state, toolsForSkill("fishing"), gearFraction);
  if (toolPick2) equipFromInventory(state, toolPick2.id, "tool2");

  // ── Inventory: a spread of plain materials (mixed skills) for a "lived-in" bag. ──
  const materials = materialItems();
  for (let i = 0; i < invMaterialCount && materials.length > 0; i++) {
    const item = materials[(i * 37 + seed) % materials.length];
    const qty = 1 + ((i * 13 + seed) % invQtyMax);
    addItem(state.inventory, content, item.id, qty);
  }

  // ── Food + auto-eat ──
  const food = foodItems();
  if (food.length > 0) {
    const pick = food[Math.min(food.length - 1, Math.floor(food.length * gearFraction))];
    addItem(state.inventory, content, pick.id, 15);
    state.character.food = pick.id;
    state.character.autoEatTier = Math.min(4, Math.floor(gearFraction * 5));
  }

  // ── Buffs (a couple of active timed buffs, mid-duration). ──
  const buffs = buffItems();
  for (let i = 0; i < buffCount && i < buffs.length; i++) {
    const item = buffs[i];
    state.character.buffs.push({ itemId: item.id, remainingMs: Math.floor(item.buff.durationMs * 0.6) });
  }

  // ── Gold ──
  state.character.gold = goldAmount;

  // ── Pets ──
  const petIds = Object.keys(content.pets);
  for (let i = 0; i < petCount && i < petIds.length; i++) {
    state.character.ownedPets[petIds[i]] = true;
  }
  if (withCompanion && petIds.length > 0) {
    state.character.companionPetId = petIds[0];
  }

  // ── Monster kills (Bestiary) ──
  const monsterIds = Object.keys(content.monsters);
  for (let i = 0; i < monsterKillCount && i < monsterIds.length; i++) {
    state.monsterKills[monsterIds[i]] = 3 + ((i * 7) % 40);
  }

  // ── Achievements ──
  const achIds = content.achievements.map((a) => a.id);
  state.achievements = achIds.slice(0, Math.min(achievementCount, achIds.length));

  // ── Mastery (a few actions with accrued mastery XP) ──
  const actionIds = Object.keys(content.actions);
  for (let i = 0; i < masteryEntries && i < actionIds.length; i++) {
    const actId = actionIds[(i * 19 + seed) % actionIds.length];
    state.mastery[actId] = { xp: xpForLevel(10 + i * 7) };
  }

  // ── Active action (gathering) — mutually exclusive with combat, so combat stays idle. ──
  if (withActiveAction) {
    const action = pickAction("mining", gatherSkillLevel) ?? pickAction("woodcutting", gatherSkillLevel);
    if (action) {
      setActiveAction(state, content, action.id, null);
      state.actionProgressMs = Math.floor(action.durationMs * 0.4);
    }
  }

  // ── HP/mana: not full, but healthy (avoids a scary near-death bar on a fixture screenshot). ──
  const stats = computeStats(state, content);
  state.character.hp = Math.max(1, Math.floor(stats.maxHp * hpFraction));
  state.character.mana = Math.max(0, Math.floor(stats.maxMana * manaFraction));

  return state;
}

const midgame = buildFixture({
  charName: "Mira Ashfall",
  seed: 4200,
  combatSkillLevel: 30,
  gatherSkillLevel: 24,
  gearFraction: 0.32,
  invMaterialCount: 12,
  invQtyMax: 30,
  achievementCount: 4,
  petCount: 0,
  withCompanion: false,
  monsterKillCount: 9,
  withActiveAction: true,
  buffCount: 2,
  hpFraction: 0.82,
  manaFraction: 0.55,
  goldAmount: 5_400,
  masteryEntries: 5,
});

const endgame = buildFixture({
  charName: "Korveth Grimhollow",
  seed: 9001,
  combatSkillLevel: 92,
  gatherSkillLevel: 97,
  gearFraction: 0.97,
  invMaterialCount: 18,
  invQtyMax: 99,
  achievementCount: 24,
  petCount: 7,
  withCompanion: true,
  monsterKillCount: 32,
  withActiveAction: false,
  buffCount: 1,
  hpFraction: 0.93,
  manaFraction: 0.8,
  goldAmount: 482_000,
  masteryEntries: 14,
});

mkdirSync(CANONICAL_DIR, { recursive: true });
mkdirSync(SERVED_DIR, { recursive: true });

for (const [name, state] of [["midgame", midgame], ["endgame", endgame]]) {
  const json = serialize(state, Date.now());
  writeFileSync(join(CANONICAL_DIR, `${name}.json`), json, "utf8");
  writeFileSync(join(SERVED_DIR, `${name}.json`), json, "utf8");
  console.log(
    `wrote ${name}: totalLevel=${state.character.totalLevel} gold=${state.character.gold} ` +
      `achievements=${state.achievements.length} pets=${Object.keys(state.character.ownedPets).length} ` +
      `(${json.length} bytes)`,
  );
}
