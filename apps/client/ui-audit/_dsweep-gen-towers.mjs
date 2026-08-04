// WEGWERF (Task #353): Turm-/Paragon-Zutritts-Fixture.
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { content } from "@hearthforge/content";
import { addItem, computeStats, totalLevel, expandBaseCapacity, meetsRequirements, equipItem, isHealPotion, levelFromXp } from "@hearthforge/engine";
import { buildBisCharacter } from "../../../packages/engine/src/balance-envelope-helpers";
import { serialize } from "@hearthforge/persistence";
import { legacyOnboarding, COMPLETION_CAPE_KEY, PARAGON_DUNGEON_ID } from "@hearthforge/shared";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CHR = Array.from({ length: 21 }, (_, i) => `chronicle_${String(i + 1).padStart(2, "0")}`);

const s = buildBisCharacter(content, "ranged", 99, "tank", { allBuffs: true }).state;
const dmg = buildBisCharacter(content, "ranged", 99, "damage", { allBuffs: true }).state;
const w = dmg.character.equipment.mainhand;
if (w && !content.items[w].twoHanded) { addItem(s.inventory, content, w, 1); equipItem(s, content, w); }
s.character.name = "Turmwart";
s.onboarding = legacyOnboarding();
s.onboarding.toursSeen.featureTourV1 = true;
s.onboarding.toursSeen.combat = true;
s.onboarding.toursSeen.shop = true;
s.onboarding.toursSeen.bank = true;
s.masteryCapes ??= {}; s.capeCeremonySeen ??= {};
for (const id of Object.keys(content.skills)) if (levelFromXp(s.skills[id]?.xp ?? 0) >= 99) { s.masteryCapes[id] = true; s.capeCeremonySeen[id] = true; }
s.masteryCapes[COMPLETION_CAPE_KEY] = true; s.capeCeremonySeen[COMPLETION_CAPE_KEY] = true;
s.quests.completed = [...CHR]; s.quests.claimed = [...CHR];
s.character.totalLevel = totalLevel(s, content);
expandBaseCapacity(s.inventory, content, 60);
const f = Object.values(content.items).filter((it) => it.type === "consumable" && (it.healAmount ?? 0) > 0 && !isHealPotion(content, it.id) && meetsRequirements(s, it)).sort((a, b) => (b.healAmount ?? 0) - (a.healAmount ?? 0))[0];
if (f) { addItem(s.inventory, content, f.id, 5000); s.character.food = f.id; s.character.autoEatTier = 4; }
s.character.gold = 500_000;
// Paragonturm: Einmal-Unlock (sonst nur die gesperrte "Schlüssel gesucht"-Karte).
s.dungeonsUnlocked[PARAGON_DUNGEON_ID] = true;
const st = computeStats(s, content);
s.character.hp = st.maxHp; s.character.mana = st.maxMana;

const json = serialize(s, Date.now());
writeFileSync(join(__dirname, "fixtures", "dsw_towers.json"), json, "utf8");
writeFileSync(join(__dirname, "..", "src", "renderer", "public", "ui-audit-fixtures", "dsw_towers.json"), json, "utf8");
console.log("dsw_towers geschrieben; slayerTower-Etagen:", (content.slayerTower ?? []).map((x) => `${x.floor}(req ${x.slayerLevelRequired})`).join(", "));
