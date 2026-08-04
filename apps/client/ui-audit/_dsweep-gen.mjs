#!/usr/bin/env node
/**
 * WEGWERF-Skript (Tester-Bot DUNGEON-SWEEP, Task #353) — wird nach dem Sweep geloescht.
 * Baut die Wegwerf-Fixtures fuer den Dungeon-Sweep.
 *
 *   node_modules/.bin/tsx ui-audit/_dsweep-gen.mjs      (aus apps/client/)
 *
 * Held-Modell "on-level": BiS-Tank-Ruestung (engine/balance-envelope-helpers, dieselbe Quelle wie
 * idol-sanctum-clear.test.ts) + beste Damage-Waffe desselben Stils; Kampfskills exakt auf der
 * Empfehlungs-Kampfstufe des jeweiligen Dungeons. Stil je Dungeon = der in der Engine-Simulation
 * schnellste (s. Bericht).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { content } from "@hearthforge/content";
import {
  createGame, addItem, equipItem, meetsRequirements, computeStats, totalLevel, xpForLevel,
  combatLevel, canEnterDungeon, isDungeonUnlocked, expandBaseCapacity, levelFromXp,
  isHealPotion,
} from "@hearthforge/engine";
import { buildBisCharacter } from "../../../packages/engine/src/balance-envelope-helpers";
import { serialize } from "@hearthforge/persistence";
import { legacyOnboarding, COMPLETION_CAPE_KEY } from "@hearthforge/shared";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CANONICAL_DIR = join(__dirname, "fixtures");
const SERVED_DIR = join(__dirname, "..", "src", "renderer", "public", "ui-audit-fixtures");
mkdirSync(CANONICAL_DIR, { recursive: true });
mkdirSync(SERVED_DIR, { recursive: true });

const ALL_CHRONICLES = Array.from({ length: 21 }, (_, i) => `chronicle_${String(i + 1).padStart(2, "0")}`);
// chronicle_05 (Kill goblin_warchief) bleibt OFFEN — Kill-Credit-Probe.
const GATE_QUESTS = ALL_CHRONICLES.filter((q) => q !== "chronicle_05");
const DUNGEONS = content.dungeons.filter((d) => d.id !== "paragon_tower");

const STYLE_BY_DUNGEON = {
  goblin_warband: "melee",
  crypt_depths: "ranged",
  wildwood_hunt: "ranged",
  highland_aerie: "melee",
  wyvern_lair: "ranged",
  idol_sanctum: "ranged",
  behind_the_throne: "ranged",
};

function seasonedOnboarding(s) {
  s.onboarding = legacyOnboarding();
  s.onboarding.toursSeen.featureTourV1 = true;
  s.onboarding.toursSeen.combat = true;
  s.onboarding.toursSeen.shop = true;
  s.onboarding.toursSeen.bank = true;
  // Meisterweihe-Warteschlange: ein L99-Fixture triggert sonst 21 Vollbild-Zeremonien, die
  // JEDEN Klick blocken (MasteryCeremony.tsx). Als "schon gesehen" markieren.
  s.masteryCapes ??= {};
  s.capeCeremonySeen ??= {};
  for (const id of Object.keys(content.skills)) {
    if (levelFromXp(s.skills[id]?.xp ?? 0) >= 99) {
      s.masteryCapes[id] = true;
      s.capeCeremonySeen[id] = true;
    }
  }
  // Vollendungs-Weihe (COMPLETION_CAPE_KEY) — eigener Pseudo-Key, ebenfalls quittieren.
  s.masteryCapes[COMPLETION_CAPE_KEY] = true;
  s.capeCeremonySeen[COMPLETION_CAPE_KEY] = true;
}

/** Bestes ECHTES Koch-Food (Heiltraenke sind der separate Auto-Trank-Slot, s. CombatFoodAutoEat). */
function bestFood(s) {
  return Object.values(content.items)
    .filter((it) => it.type === "consumable" && (it.healAmount ?? 0) > 0 && !isHealPotion(content, it.id) && meetsRequirements(s, it))
    .sort((a, b) => (b.healAmount ?? 0) - (a.healAmount ?? 0))[0] ?? null;
}

/** Bester Heiltrank fuer den Auto-Trank-Slot. */
function bestPotion(s) {
  return Object.values(content.items)
    .filter((it) => it.type === "consumable" && isHealPotion(content, it.id) && meetsRequirements(s, it))
    .sort((a, b) => (b.healAmount ?? 0) - (a.healAmount ?? 0))[0] ?? null;
}

function equipConsumables(s, foodQty, potionQty) {
  const f = bestFood(s);
  if (f) { addItem(s.inventory, content, f.id, foodQty); s.character.food = f.id; s.character.autoEatTier = 4; }
  const p = bestPotion(s);
  if (p) {
    addItem(s.inventory, content, p.id, potionQty);
    s.character.autoPotion = { ...(s.character.autoPotion ?? {}), healPotionId: p.id, healThreshold: 0.5, autoRebuffTonics: false };
  }
  return { food: f?.id ?? null, potion: p?.id ?? null };
}

function hybridHero({ level, style, quests = GATE_QUESTS, name }) {
  const s = buildBisCharacter(content, style, level, "tank", { allBuffs: true }).state;
  const dmg = buildBisCharacter(content, style, level, "damage", { allBuffs: true }).state;
  const w = dmg.character.equipment.mainhand;
  if (w && !content.items[w].twoHanded) { addItem(s.inventory, content, w, 1); equipItem(s, content, w); }
  s.character.name = name ?? `${style}-${level}`;
  seasonedOnboarding(s);
  s.quests.completed = [...quests];
  s.quests.claimed = [...quests];
  s.character.totalLevel = totalLevel(s, content);
  expandBaseCapacity(s.inventory, content, 60);
  equipConsumables(s, 5000, 2000);
  s.character.gold = 250_000;
  const st = computeStats(s, content);
  s.character.hp = st.maxHp;
  s.character.mana = st.maxMana;
  return s;
}

function underdog(level = 20) {
  const s = createGame({ name: "Underdog", startingStyle: "melee", starterKit: false }, content, 99);
  seasonedOnboarding(s);
  for (const id of Object.keys(content.skills)) s.skills[id] = { xp: xpForLevel(level) };
  s.quests.completed = [...GATE_QUESTS];
  s.quests.claimed = [...GATE_QUESTS];
  s.character.totalLevel = totalLevel(s, content);
  const w = Object.values(content.items)
    .filter((it) => it.type === "equipment" && it.slot === "mainhand" && !it.twoHanded && it.weaponStyle === "melee" && meetsRequirements(s, it))
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))[0];
  if (w) { addItem(s.inventory, content, w.id, 1); equipItem(s, content, w.id); }
  equipConsumables(s, 500, 200);
  s.character.autoEatTier = 2;
  const st = computeStats(s, content);
  s.character.hp = st.maxHp;
  s.character.mana = st.maxMana;
  return s;
}

function write(name, state) {
  const json = serialize(state, Date.now());
  writeFileSync(join(CANONICAL_DIR, `${name}.json`), json, "utf8");
  writeFileSync(join(SERVED_DIR, `${name}.json`), json, "utf8");
  return json.length;
}

for (const d of DUNGEONS) {
  const style = STYLE_BY_DUNGEON[d.id] ?? "melee";
  const s = hybridHero({ level: d.requiredLevel, style, name: `OnLevel-${d.id}` });
  write(`dsw_${d.id}`, s);
  const st = computeStats(s, content);
  console.log(
    `dsw_${d.id.padEnd(20)} style=${style.padEnd(6)} CL=${String(combatLevel(s)).padStart(3)} ` +
      `canEnter=${canEnterDungeon(s, content, d.id)} hp=${Math.round(st.maxHp)} armor=${Math.round(st.armorRating)} maxHit=${st.maxHit.toFixed(1)} mainhand=${s.character.equipment.mainhand}`,
  );
}

const und = underdog(20);
write("dsw_under", und);
const lok = hybridHero({ level: 99, style: "ranged", quests: [], name: "Nogate" });
write("dsw_locked", lok);
console.log(`dsw_under CL=${combatLevel(und)} | dsw_locked CL=${combatLevel(lok)} (keine Quests)`);

console.log("\nGate-Matrix:");
for (const d of DUNGEONS) {
  console.log(
    `  ${d.id.padEnd(20)} under(CL20): unlocked=${isDungeonUnlocked(und, content, d.id)} canEnter=${canEnterDungeon(und, content, d.id)}` +
      ` | locked: unlocked=${isDungeonUnlocked(lok, content, d.id)} canEnter=${canEnterDungeon(lok, content, d.id)}`,
  );
}
