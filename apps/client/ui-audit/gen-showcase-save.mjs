#!/usr/bin/env node
/**
 * Erzeugt den „Schaufenster"-Account (Chef 2026-07-11): ein NORMALER Mid-Game-Spielstand für
 * Screenshots & Trailer — alle Skills zwischen 1 und 99 (natürliche Streuung), zufällige Items,
 * aber AUSSCHLIESSLICH Items mit echter Bild-Art (keine Emoji-/Platzhalter-Icons im Bild!).
 * Schreibt in Slot 2 (Index 1) — Slot 0 (Chef) und Slot 4 (PET TEST) bleiben unangetastet.
 *
 * Run:  pnpm --filter @hearthforge/client exec tsx ui-audit/gen-showcase-save.mjs
 */
import { writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { content } from "@hearthforge/content";
import { createGame, addItem, equipItem, computeStats, totalLevel, meetsRequirements, xpForLevel } from "@hearthforge/engine";
import { serialize, deserialize } from "@hearthforge/persistence";
import { EQUIP_SLOTS } from "@hearthforge/shared";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SAVES_DIR = join(process.env.APPDATA ?? "", "Grim Reach", "saves");
const SLOT = 1; // „Slot 2" — frei laut Prüfung 2026-07-11.
const OUT = join(SAVES_DIR, `slot-${SLOT}.json`);

// ── Seeded RNG (mulberry32) — reproduzierbar, damit der Account bei Regeneration gleich bleibt ──
let seed = 0x5eed2026;
function rand() {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const randInt = (min, max) => Math.floor(rand() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

// ── Nur Items MIT echter Art (Chef-Regel: keine Platzhalter im Trailer) ─────────────────────
const artIds = new Set(
  readdirSync(join(__dirname, "..", "src", "renderer", "assets", "items"))
    .filter((f) => /\.(png|webp)$/i.test(f))
    .map((f) => f.replace(/\.(png|webp)$/i, "").toLowerCase()),
);
const hasArt = (id) => artIds.has(id.toLowerCase());

// ── Charakter ────────────────────────────────────────────────────────────────────────────────
const s = createGame(
  { name: "Aldric Thornwald", startingStyle: "melee", starterKit: false, baseAttributes: {} },
  content,
  20260711,
);
s.character.portrait = "char_3"; // Renderer-Fallback korrigiert, falls die ID nicht existiert.

// Skills: natürliche Mid-Game-Streuung — Kampf solide, ein Vorzeige-Skill hoch, ein paar niedrig.
const COMBAT = ["attack", "power", "defence", "ranged", "magic", "warding", "vitality"];
for (const id of Object.keys(content.skills)) {
  let lvl;
  if (COMBAT.includes(id)) lvl = randInt(48, 64);
  else lvl = randInt(18, 78);
  s.skills[id] = { xp: xpForLevel(lvl) + randInt(0, 500) };
}
s.skills.mining = { xp: xpForLevel(87) + 1200 }; // der Vorzeige-Skill (fast Meister)
s.skills.herblore = { xp: xpForLevel(12) };      // ehrlich unfertig — wirkt echt

// ── Ausrüstung: Mid-Tier je Slot, NUR mit Art, Requirements erfüllt ─────────────────────────
function equipMidTier(slot) {
  const candidates = Object.values(content.items)
    .filter((it) => it.slot === slot && hasArt(it.id) && meetsRequirements(s, it) && !it.id.startsWith("cape_master"))
    .sort((a, b) => (a.value ?? 0) - (b.value ?? 0));
  if (candidates.length === 0) return;
  // ~60. Perzentil = solide Mid-Ausrüstung, kein BiS, kein Schrott.
  const it = candidates[Math.min(candidates.length - 1, Math.floor(candidates.length * 0.6))];
  addItem(s.inventory, content, it.id, 1);
  equipItem(s, content, it.id);
}
for (const slot of EQUIP_SLOTS) equipMidTier(slot);

// ── Inventar + Bank: zufällige Items mit Art (Materialien/Essen/Tränke-Mix) ─────────────────
const lootables = Object.values(content.items).filter(
  (it) => hasArt(it.id) && (it.type === "material" || it.type === "consumable") && (it.value ?? 0) > 0,
);
for (let i = 0; i < 13; i++) {
  const it = pick(lootables);
  addItem(s.inventory, content, it.id, it.stackable ? randInt(4, 180) : 1);
}
for (let i = 0; i < 26; i++) {
  const it = pick(lootables);
  s.bank[it.id] = (s.bank[it.id] ?? 0) + (it.stackable ? randInt(20, 900) : 1);
}

// Essen fürs Auto-Eat (mit Art): bestes tragbares gekochtes Essen.
const food = lootables
  .filter((it) => (it.healAmount ?? 0) > 0 || (it.healPct ?? 0) > 0)
  .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))[0];
if (food) {
  addItem(s.inventory, content, food.id, 220);
  s.character.food = food.id;
}

// ── Welt-Fortschritt: Bestiarium/Zonen leben (Kills auf Low/Mid-Monstern) ────────────────────
const midMonsters = Object.values(content.monsters)
  .filter((m) => !m.dungeonOnly && !m.id.startsWith("dg_") && !m.id.startsWith("tower_") && m.level <= 70);
for (let i = 0; i < 18; i++) {
  const m = pick(midMonsters);
  s.monsterKills[m.id] = (s.monsterKills[m.id] ?? 0) + randInt(6, 420);
}
s.stats.kills = Object.values(s.monsterKills).reduce((a, b) => a + b, 0);
s.stats.deaths = randInt(3, 9);
s.stats.itemsGathered = randInt(8000, 20000);
s.stats.itemsCrafted = randInt(1500, 4000);

// Dungeons: die ersten zwei entsperrt + Warband einmal geclearrt (Erst-Clear-Haken im Trailer).
s.dungeonsUnlocked = { goblin_warband: true, crypt_depths: true };
s.dungeonsCleared = { goblin_warband: 3 };

// Pets: 3 Begleiter (alle 21 haben echte Art), einer aktiv.
const petIds = Object.keys(content.pets);
const chosenPets = [pick(petIds), pick(petIds), pick(petIds)];
for (const p of chosenPets) s.character.ownedPets[p] = true;
s.character.companionPetId = chosenPets[0];

// Wirtschaft: Mid-Game-Konto.
s.character.gold = 38_500;
s.quests.tokens = (s.quests.tokens ?? 0) + 14;

// Kein Tutorial-Popup im Schaufenster-Account (Trailer/Screenshots): Guide gilt als absolviert.
s.onboarding = { active: false, step: 0, done: true };

// Total-Level + Vitals finalisieren.
s.character.totalLevel = totalLevel(s, content);
const st = computeStats(s, content);
s.character.hp = st.maxHp;
s.character.mana = st.maxMana;
s.character.ward = st.maxWard;

// ── Round-Trip-Beweis + Schreiben ────────────────────────────────────────────────────────────
const json = serialize(s, Date.now());
const back = deserialize(json, content, Date.now());
if (!back) throw new Error("Round-Trip fehlgeschlagen — Save NICHT geschrieben");
writeFileSync(OUT, json);
console.log(`SHOWCASE-Save geschrieben: ${OUT}`);
console.log(`  Name: ${s.character.name} · Gesamtlevel ${s.character.totalLevel} · Gold ${s.character.gold}`);
console.log(`  Skills: mining ${87}, Kampf ~48-64, Streuung 18-78, herblore 12`);
console.log(`  Equipment-Slots belegt: ${Object.values(s.character.equipment).filter(Boolean).length}`);
console.log(`  Pets: ${chosenPets.join(", ")} · Kills gesamt: ${s.stats.kills}`);
