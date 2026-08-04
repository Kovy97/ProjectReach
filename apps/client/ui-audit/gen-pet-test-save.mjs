#!/usr/bin/env node
/**
 * Erzeugt ein Test-Save „PET TEST" mit ALLEN Pets freigeschaltet (Chef-Wunsch, Pet-Redesign #276)
 * und schreibt es DIREKT in den echten Spielstand-Ordner (Slot 5 / Index 4 — Slot 0 ist der aktive
 * Chef-Save und bleibt unangetastet).
 *
 * Run:  pnpm --filter @hearthforge/client exec tsx ui-audit/gen-pet-test-save.mjs
 */
import { writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

import { content } from "@hearthforge/content";
import { createGame, addItem, equipItem, computeStats, totalLevel, meetsRequirements } from "@hearthforge/engine";
import { serialize, deserialize } from "@hearthforge/persistence";
import { EQUIP_SLOTS } from "@hearthforge/shared";
import { xpForLevel } from "@hearthforge/engine";

const SAVES_DIR = join(process.env.APPDATA ?? "", "Grim Reach", "saves");
const SLOT = 4; // Slot 5 im Menü — Slot 0 (aktiver Chef-Save) bleibt unberührt.
const OUT = join(SAVES_DIR, `slot-${SLOT}.json`);

// ── Charakter: kampftauglicher Endgame-Tester ────────────────────────────────
const s = createGame({ name: "PET TEST", baseAttributes: { str: 60, dex: 60, con: 60, int: 60, wis: 60, lck: 40 } }, content, 20260710);

// Kampf-Skills hoch (Pet-Abilities im Endgame-Kontext testen), Skilling mittel.
// WICHTIG: `state.skills` startet LEER (lazy bei erstem XP-Gewinn) — Einträge direkt ANLEGEN,
// über den Content-Katalog iterieren (Bug-Fund #276 Schritt 4: der alte Loop über Object.keys(s.skills)
// war ein stilles No-op). Danach das gecachte totalLevel nachziehen.
const HIGH = ["attack", "power", "defence", "ranged", "magic", "warding", "vitality"];
for (const id of Object.keys(content.skills)) {
  s.skills[id] = { xp: xpForLevel(HIGH.includes(id) ? 90 : 60) };
}
s.character.totalLevel = totalLevel(s, content);

// Gold + Quest-Tokens für Shop-/Reward-Tests.
s.character.gold = 250_000;
s.character.questTokens = 50;

// Brauchbares Kampf-Setup: bestes tragbares Melee-Equip je Slot (generisch aus dem Katalog).
function bestFor(slot) {
  // Bestes TRAGBARES Item (Requirements gegen die frisch gesetzten Level-90/60-Skills geprüft).
  return Object.values(content.items)
    .filter((it) => it.type === "equipment" && it.slot === slot && (!it.weaponStyle || it.weaponStyle === "melee"))
    .filter((it) => meetsRequirements(s, it))
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))[0];
}
for (const slot of EQUIP_SLOTS) {
  if (slot === "ammo") continue; // Melee braucht keine Munition
  const it = bestFor(slot);
  if (!it) continue;
  addItem(s.inventory, content, it.id, 1);
  try { equipItem(s, content, it.id); } catch { /* Requirements o.ä. — egal, Testsave */ }
}
// Food-Stapel für Auto-Eat.
const food = Object.values(content.items)
  .filter((it) => it.type === "consumable" && (it.healAmount || it.healPct))
  .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))[0];
if (food) addItem(s.inventory, content, food.id, 500);

// ── ALLE Pets freischalten + eines ausrüsten ────────────────────────────────
const petIds = Object.keys(content.pets ?? {});
for (const id of petIds) s.character.ownedPets[id] = true;
s.character.companionPetId = petIds.includes("gemwraith") ? "gemwraith" : petIds[0] ?? null;

// ── Serialisieren + Selbst-Verifikation (Round-Trip) ────────────────────────
const json = serialize(s, Date.now());
const back = deserialize(json, content, Date.now());
if (!back) { console.error("FEHLER: Round-Trip-Load fehlgeschlagen — Save NICHT geschrieben."); process.exit(1); }
const owned = Object.keys(back.state.character.ownedPets).filter((k) => back.state.character.ownedPets[k]).length;
if (owned !== petIds.length) { console.error(`FEHLER: nur ${owned}/${petIds.length} Pets im Round-Trip.`); process.exit(1); }

if (!existsSync(SAVES_DIR)) { console.error("FEHLER: Saves-Ordner fehlt: " + SAVES_DIR); process.exit(1); }
writeFileSync(OUT, json, "utf8");
const stats = computeStats(back.state, content);
console.log(`OK: ${OUT}`);
console.log(`Pets: ${owned}/${petIds.length} · aktiv: ${back.state.character.companionPetId}`);
console.log(`Gold: ${back.state.character.gold} · Tokens: ${back.state.character.questTokens} · Kampf-Stil: ${stats.style}`);
