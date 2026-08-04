#!/usr/bin/env node
/**
 * Task #276 Schritt 4 self-check: builds a "PET TEST"-equivalent GameState (ALL 21 pets owned,
 * gemwraith equipped as companion) and writes it as a `?fixture=pettest` fixture (browser-fetchable
 * static JSON), NOT to the real Electron save folder — the ui-audit tour drives a plain Vite dev
 * server via Playwright (no Electron main process / IPC), so the only way to get a custom GameState
 * into a headless screenshot session is the same `?fixture=<name>` hook `gen-fixtures.mjs` uses for
 * midgame/endgame. Modeled on both `gen-fixtures.mjs` (fixture-hook plumbing, legacyOnboarding so
 * the guide doesn't lock down nav clicks) and `gen-pet-test-save.mjs` (character build: strong
 * melee endgame tester, all pets granted).
 *
 * The two existing fixtures (midgame/endgame) don't cover this: midgame has 0 pets, endgame has
 * only 7 (the first 7 by content insertion order — none of which are the 6 NEW #276 passive kinds,
 * which start at vellumoth/gorehound/ironmaw/carapace/carrionwing/charnel, pets #14-21).
 *
 * Run: pnpm --filter @hearthforge/client exec tsx ui-audit/gen-pettest-fixture-276.mjs
 * Output: ui-audit/fixtures/pettest.json + src/renderer/public/ui-audit-fixtures/pettest.json
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { content } from "@hearthforge/content";
import { createGame, addItem, equipItem, computeStats, totalLevel, xpForLevel } from "@hearthforge/engine";
import { serialize, deserialize } from "@hearthforge/persistence";
import { legacyOnboarding } from "@hearthforge/shared";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CANONICAL_DIR = join(__dirname, "fixtures");
const SERVED_DIR = join(__dirname, "..", "src", "renderer", "public", "ui-audit-fixtures");

const s = createGame(
  { name: "PET TEST", baseAttributes: { str: 60, dex: 60, con: 60, int: 60, wis: 60, lck: 40 } },
  content,
  20260710,
);

// Seasoned character, onboarding already done (else the guide overlay blocks nav clicks in the tour).
s.onboarding = legacyOnboarding();

// Kampf-Skills hoch (Pet-Abilities im Endgame-Kontext testen, Gegner sterben nicht sofort dank
// echtem Kampf-Tempo), Skilling mittel. NOTE: `state.skills` starts EMPTY (lazily populated on
// first XP gain, see engine/src/state.ts) — mutating `s.skills[sk].xp` for existing keys (the
// pattern `gen-pet-test-save.mjs` uses) is a silent no-op here. Assign entries directly instead
// (same pattern as `gen-fixtures.mjs`'s `setSkillLevel`), then recompute the cached totalLevel.
const HIGH = ["attack", "power", "defence", "ranged", "magic", "warding", "vitality"];
for (const id of Object.keys(content.skills)) {
  s.skills[id] = { xp: xpForLevel(HIGH.includes(id) ? 90 : 60) };
}
s.character.totalLevel = totalLevel(s, content);

s.character.gold = 250_000;
s.character.questTokens = 50;

function bestFor(slot) {
  return Object.values(content.items)
    .filter((it) => it.type === "equipment" && it.slot === slot && (!it.weaponStyle || it.weaponStyle === "melee"))
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))[0];
}
for (const slot of ["mainhand", "head", "chest", "legs", "hands", "feet", "back", "neck", "ring"]) {
  const it = bestFor(slot);
  if (!it) continue;
  addItem(s.inventory, content, it.id, 1);
  try { equipItem(s, content, it.id); } catch { /* Requirements o.ä. — egal, Testsave */ }
}
const food = Object.values(content.items)
  .filter((it) => it.type === "consumable" && (it.healAmount || it.healPct))
  .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))[0];
if (food) addItem(s.inventory, content, food.id, 500);

// Ein paar sellbare Materialien, damit die Shop-Sell-Screenshots einen echten Eintrag zeigen.
const materials = Object.values(content.items)
  .filter((it) => it.type === "material")
  .sort((a, b) => a.id.localeCompare(b.id))
  .slice(0, 10);
for (const it of materials) addItem(s.inventory, content, it.id, 25);

// ── ALLE 21 Pets freischalten + gemwraith ausrüsten ─────────────────────────
const petIds = Object.keys(content.pets ?? {});
for (const id of petIds) s.character.ownedPets[id] = true;
s.character.companionPetId = petIds.includes("gemwraith") ? "gemwraith" : (petIds[0] ?? null);

const stats = computeStats(s, content);
s.character.hp = Math.max(1, Math.floor(stats.maxHp * 0.95));
s.character.mana = Math.max(0, Math.floor(stats.maxMana * 0.9));

// ── Serialisieren + Round-Trip-Verifikation ─────────────────────────────────
const json = serialize(s, Date.now());
const back = deserialize(json, content, Date.now());
if (!back) { console.error("FEHLER: Round-Trip-Load fehlgeschlagen — Fixture NICHT geschrieben."); process.exit(1); }
const owned = Object.keys(back.state.character.ownedPets).filter((k) => back.state.character.ownedPets[k]).length;
if (owned !== petIds.length) { console.error(`FEHLER: nur ${owned}/${petIds.length} Pets im Round-Trip.`); process.exit(1); }
if (back.state.character.companionPetId !== "gemwraith") {
  console.error(`FEHLER: companionPetId ist "${back.state.character.companionPetId}", nicht "gemwraith".`);
  process.exit(1);
}

mkdirSync(CANONICAL_DIR, { recursive: true });
mkdirSync(SERVED_DIR, { recursive: true });
writeFileSync(join(CANONICAL_DIR, "pettest.json"), json, "utf8");
writeFileSync(join(SERVED_DIR, "pettest.json"), json, "utf8");

console.log(`OK: wrote pettest fixture (${json.length} bytes)`);
console.log(`Pets: ${owned}/${petIds.length} · aktiv: ${back.state.character.companionPetId}`);
console.log(`Gold: ${back.state.character.gold} · Kampf-Stil: ${stats.style}`);
