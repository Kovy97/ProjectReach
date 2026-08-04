#!/usr/bin/env node
/**
 * Meisterweihe Stufe 3 (UI-Zeremonie, design/master-capes-konzept.md §3) self-check fixture:
 * builds a GameState with three skills already at Level 99 — woodcutting (Sammler), mining
 * (Sammler), attack (Kämpfer) — everything else mid-game. Modeled directly on
 * gen-pettest-fixture-276.mjs (same createGame/serialize/round-trip idiom).
 *
 * `s.skills[id]` is assigned directly (NOT mutated) because `state.skills` starts EMPTY and is
 * lazily populated on first XP gain (see engine/src/state.ts) — mutating an absent key would be a
 * silent no-op, same gotcha gen-pettest-fixture-276.mjs documents.
 *
 * Once this fixture loads and the live tick loop runs its first tick, engine/capes.ts
 * `checkMasteryCapes` marks all three Weihen in `Object.keys(content.skills)` order — which is
 * exactly the content insertion order woodcutting → mining → ... → attack → ... (see
 * packages/content/src/index.ts) — so `pendingCapeCeremonies` queues them woodcutting, mining,
 * attack. MasteryCeremony.tsx then staffelt them one at a time. Used by mastery-ceremony-shot.mjs.
 *
 * Run: pnpm --filter @hearthforge/client exec tsx ui-audit/gen-masterytest-fixture.mjs
 * Output: ui-audit/fixtures/mastery.json + src/renderer/public/ui-audit-fixtures/mastery.json
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
  { name: "MASTERY TEST", baseAttributes: { str: 50, dex: 50, con: 50, int: 50, wis: 50, lck: 40 } },
  content,
  20260710,
);

// Seasoned character, onboarding already done (else the guide overlay blocks nav clicks in the tour).
s.onboarding = legacyOnboarding();

// woodcutting/mining = Sammler-Archetyp (Konzept-Tabelle), attack = Kämpfer-Archetyp — deckt beide
// "Reise in Zahlen"-Zweige ab (2 generische Kennzahlen vs. +Kills als dritte). Reihenfolge im
// `content.skills`-Objekt (woodcutting, mining, ..., attack, ...) bestimmt die Queue-Reihenfolge.
const MASTERED = ["woodcutting", "mining", "attack"];
for (const id of Object.keys(content.skills)) {
  s.skills[id] = { xp: xpForLevel(MASTERED.includes(id) ? 99 : 60) };
}
s.character.totalLevel = totalLevel(s, content);

s.character.gold = 50_000;

// Ein paar Kill-Zahlen, damit die Kampf-Kennzahl ("Besiegte Gegner") in der Zeremonie nicht bei 0
// steht (state.stats.kills ist die einzige Quelle dafür, s. MasteryCeremony.tsx journeyStats).
s.stats.kills = 342;
s.slayerTasksCompleted = 5;

// Etwas Grundausrüstung, damit die Sidebar/Kampf-Seite nicht komplett nackt aussieht.
function bestFor(slot) {
  return Object.values(content.items)
    .filter((it) => it.type === "equipment" && it.slot === slot && (!it.weaponStyle || it.weaponStyle === "melee"))
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))[0];
}
for (const slot of ["mainhand", "head", "chest", "legs"]) {
  const it = bestFor(slot);
  if (!it) continue;
  addItem(s.inventory, content, it.id, 1);
  try { equipItem(s, content, it.id); } catch { /* Requirements o.ä. — egal, Testsave */ }
}

const stats = computeStats(s, content);
s.character.hp = Math.max(1, Math.floor(stats.maxHp * 0.95));
s.character.mana = Math.max(0, Math.floor(stats.maxMana * 0.9));

// ── Serialisieren + Round-Trip-Verifikation ─────────────────────────────────
const json = serialize(s, Date.now());
const back = deserialize(json, content, Date.now());
if (!back) { console.error("FEHLER: Round-Trip-Load fehlgeschlagen — Fixture NICHT geschrieben."); process.exit(1); }
for (const id of MASTERED) {
  const lvl = back.state.skills[id]?.xp ?? 0;
  if (lvl < xpForLevel(99)) { console.error(`FEHLER: ${id} nicht auf Level 99 im Round-Trip.`); process.exit(1); }
}

mkdirSync(CANONICAL_DIR, { recursive: true });
mkdirSync(SERVED_DIR, { recursive: true });
writeFileSync(join(CANONICAL_DIR, "mastery.json"), json, "utf8");
writeFileSync(join(SERVED_DIR, "mastery.json"), json, "utf8");

console.log(`OK: wrote mastery fixture (${json.length} bytes)`);
console.log(`Mastered (Lv99): ${MASTERED.join(", ")}`);
