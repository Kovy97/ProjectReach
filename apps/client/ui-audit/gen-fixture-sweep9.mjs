#!/usr/bin/env node
/**
 * TESTER 9 ("Der Chaot") — Grenzwert-Fixture für den Chaos-Sweep (2026-07-11).
 * READ-ONLY-Testertool: erzeugt NUR eine zusätzliche Fixture-JSON (ui-audit/fixtures + der servierten
 * Kopie), rührt keinen Produktionscode an. Modelliert auf gen-fixtures.mjs (buildFixture-Kopie, damit
 * dieses Skript unabhängig von dem Original bleibt und nichts daran ändert).
 *
 * Grenzwerte lt. Testauftrag:
 *  - Gold = 0 (überall einkaufen versuchen können)
 *  - Inventar randvoll (alle BASE_INVENTORY_SLOTS belegt, kein Leerslot für neue Beute)
 *  - 5 gleichzeitige Buffs (statt der von Chef vorgegebenen "999" — bewusst reduziert)
 *  - 24-Zeichen-Charaktername (= CharacterCreation maxLength) für Nameplate/Charakterbogen-Overflow-Test
 *
 * Run: node_modules/.bin/tsx ui-audit/gen-fixture-sweep9.mjs   (from apps/client/)
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
  xpForLevel,
} from "@hearthforge/engine";
import { serialize } from "@hearthforge/persistence";
import { EQUIP_SLOTS, legacyOnboarding, BASE_INVENTORY_SLOTS } from "@hearthforge/shared";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CANONICAL_DIR = join(__dirname, "fixtures");
const SERVED_DIR = join(__dirname, "..", "src", "renderer", "public", "ui-audit-fixtures");

const COMBAT_SKILLS = ["attack", "power", "defence", "ranged", "magic_off", "magic_def", "vitality"];

function allEquipment(slot) {
  return Object.values(content.items)
    .filter((it) => it.type === "equipment" && it.slot === slot)
    .sort((a, b) => (a.value ?? 0) - (b.value ?? 0));
}
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
function equipFromInventory(state, itemId) {
  addItem(state.inventory, content, itemId, 1);
  equipItem(state, content, itemId);
}

// 24 Zeichen exakt (CharacterCreation.tsx maxLength=24) — Grenzfall, kein Über-Limit.
const CHAR_NAME = "Reginald Blackthorn XVII";
if (CHAR_NAME.length !== 24) throw new Error(`CHAR_NAME ist ${CHAR_NAME.length} Zeichen, nicht 24`);

const state = createGame({ name: CHAR_NAME, startingStyle: "melee", starterKit: false }, content, 7777);
state.onboarding = legacyOnboarding();

for (const id of Object.keys(content.skills)) {
  setSkillLevel(state, id, COMBAT_SKILLS.includes(id) ? 35 : 28);
}
state.character.totalLevel = totalLevel(state, content);

const skipSlots = new Set(["ammo", "tool1", "tool2", "ring2"]);
for (const slot of EQUIP_SLOTS) {
  if (skipSlots.has(slot)) continue;
  const list = allEquipment(slot).filter((it) => !it.twoHanded);
  const pick = pickAtTier(state, list, 0.4);
  if (pick) equipFromInventory(state, pick.id);
}

// ── Grenzwert: Inventar randvoll — ALLE Slots direkt belegt, kein Platz für neue Beute. ──
const materials = Object.values(content.items)
  .filter((it) => it.type === "material")
  .sort((a, b) => a.id.localeCompare(b.id));
for (let i = 0; i < state.inventory.slots.length; i++) {
  const item = materials[i % materials.length];
  state.inventory.slots[i] = { itemId: item.id, qty: 99 };
}
console.log(`Inventar: ${state.inventory.slots.length}/${state.inventory.slots.length} Slots belegt (Kapazität ${BASE_INVENTORY_SLOTS}).`);

// ── Grenzwert: 5 gleichzeitige Buffs. ──
const buffs = Object.values(content.items).filter((it) => !!it.buff);
for (let i = 0; i < 5 && i < buffs.length; i++) {
  const item = buffs[i];
  state.character.buffs.push({ itemId: item.id, remainingMs: Math.floor(item.buff.durationMs * 0.7) });
}
console.log(`Buffs aktiv: ${state.character.buffs.length}`);

// ── Grenzwert: Gold = 0. ──
state.character.gold = 0;

// Aktive Aktion (Mining), damit die Kampf-/Aktionsleisten nicht leer wirken.
const action = pickAction("mining", 28) ?? pickAction("woodcutting", 28);
if (action) {
  setActiveAction(state, content, action.id, null);
  state.actionProgressMs = Math.floor(action.durationMs * 0.4);
}

const stats = computeStats(state, content);
state.character.hp = Math.max(1, Math.floor(stats.maxHp * 0.75));
state.character.mana = Math.max(0, Math.floor(stats.maxMana * 0.5));

mkdirSync(CANONICAL_DIR, { recursive: true });
mkdirSync(SERVED_DIR, { recursive: true });

const json = serialize(state, Date.now());
writeFileSync(join(CANONICAL_DIR, "sweep9chaos.json"), json, "utf8");
writeFileSync(join(SERVED_DIR, "sweep9chaos.json"), json, "utf8");
console.log(`wrote sweep9chaos: gold=${state.character.gold} name="${state.character.name}" (${json.length} bytes)`);
