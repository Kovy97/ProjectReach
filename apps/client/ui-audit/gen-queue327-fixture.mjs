#!/usr/bin/env node
/**
 * Fixture für die Task-#327-Verifikations-Screenshots ("Priority-UI für die Queue"): ein
 * Charakter mit Kochen AKTIV und einer 3er-Warteschlange dahinter — deckungsgleich mit dem
 * Spieler-Beispiel aus dem Auftrag ("Kochen läuft, Waffe priorisiert → Kochen mit Rest vorn"):
 *
 *   Aktiv:       cook_shrimp ×25 (Shrimp braten)
 *   Warteschl.:  [mine_copper ×25 (Kupferader), mine_tin ×25 (Zinnader), forge_steel_sword ×1
 *                 (Stahl-Schwert schmieden) — DAS ist die "Waffe", die das Shots-Skript per
 *                 ⚡-Klick priorisiert]
 *
 * Stahl statt Kupfer (bewusst, Fund beim ersten Anlauf): `forge_copper_sword` dauert nur 3.5s —
 * kürzer als die Render-/Screenshot-Overhead-Schwankung in diesem headless-Chromium-Setup
 * (Software-GL, "GPU stall"-Warnungen), die reale Wand-Zeit zwischen Klick und Screenshot kostet.
 * Der Live-Loop verarbeitet vergangene Wand-Zeit in einem Rutsch (dieselbe Offline-Catchup-Logik
 * wie der Live-Tick, s. Engine-JSDoc "Offline-Catch-up == Live-Loop bleibt bit-identisch") — bei
 * 3.5s Craft-Dauer war das Schwert im ersten Anlauf schon wieder fertig, BEVOR der "Nachher"-
 * Screenshot entstand (Kochen lief schon wieder). `forge_steel_sword` (11s, levelRequired 20)
 * gibt genug Puffer; Level per direktem XP-Feld gesetzt (Muster gen-fixtures.mjs `setLevel`).
 *
 * Alles über echte Engine-APIs bestückt (kein hart codierter Queue-Eintrag, Muster
 * gen-queue315-fixture.mjs) — Materialien für Kochen/Schmieden ausreichend bevorratet, damit der
 * Lauf während der paar Sekunden Screenshot-Wartezeit nicht wegen "kein Material" stoppt (das
 * Ziel hier ist die Priority-UI, nicht ein Material-Stop-Screenshot).
 *
 * Run mit tsx (wie gen-queue315-fixture.mjs, aus apps/client/):
 *   node_modules/.bin/tsx ui-audit/gen-queue327-fixture.mjs
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { content } from "@hearthforge/content";
import { addItem, createGame, enqueueAction, prioritizeQueueEntry, setActiveAction, xpForLevel } from "@hearthforge/engine";
import { serialize } from "@hearthforge/persistence";
import { legacyOnboarding } from "@hearthforge/shared";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SERVED_DIR = join(__dirname, "..", "src", "renderer", "public", "ui-audit-fixtures");

function buildBase() {
  const state = createGame({ name: "Queue327" }, content, 1);
  // Seasoned-character fixture (Muster gen-queue315-fixture.mjs): sonst blockt der Onboarding-Guide
  // jeden Klick außerhalb des Spotlights.
  state.onboarding = legacyOnboarding();
  state.onboarding.toursSeen.featureTourV1 = true;
  state.onboarding.toursSeen.combat = true;
  // Schmieden auf Stufe 20 (forge_steel_sword-Voraussetzung) — direktes XP-Feld, Muster
  // gen-fixtures.mjs/gen-masterytest-fixture.mjs (`state.skills[id] = { xp: xpForLevel(n) }`).
  state.skills.smithing = { xp: xpForLevel(20) };
  // Material-Vorrat: 50 Shrimp (Kochen läuft ×25, reicht locker über die Screenshot-Wartezeit
  // hinaus) + 5 Stahlbarren (Schmieden braucht nur 2, Rest ist Puffer).
  addItem(state.inventory, content, "raw_shrimp", 50);
  addItem(state.inventory, content, "steel_bar", 5);
  // Aktiv: Kochen (Ziel 25) — setActiveAction VOR den enqueue-Aufrufen, sonst würde die zuerst
  // eingereihte Aktion sofort selbst anlaufen (advanceActionQueue startet, sobald nichts aktiv ist).
  setActiveAction(state, content, "cook_shrimp", 25);
  enqueueAction(state, content, "mine_copper", 25);
  enqueueAction(state, content, "mine_tin", 25);
  enqueueAction(state, content, "forge_steel_sword", 1);
  return state;
}

// ── queue327.json — "vorher": Kochen aktiv, 3 wartende Zeilen (Live-Klick-Demo im Shots-Skript) ──
const before = buildBase();
writeFileSync(join(SERVED_DIR, "queue327.json"), serialize(before, Date.now()), "utf8");
console.log("[gen-queue327] queue327.json geschrieben (Kochen aktiv, Warteschlange: Kupfer/Zinn/Schwert)");

// ── queue327-after.json — "nachher": DIESELBE Ausgangslage, aber `prioritizeQueueEntry` schon
// über die echte Engine-API angewendet (Index 2 = das Schwert, s. enqueue-Reihenfolge oben) —
// deterministisch statt über einen Live-Klick nachgestellt (s. JSDoc oben zur Race-Ursache).
// `prioritizeQueueEntry` ist exakt dieselbe Funktion, die der ⚡-Button in ActionQueuePanel.tsx
// aufruft — kein Sonderpfad, nur ohne die Klick-Zeitschwankung.
const after = buildBase();
const swordIndex = after.actionQueue.findIndex((e) => e.actionId === "forge_steel_sword");
prioritizeQueueEntry(after, content, swordIndex);
writeFileSync(join(SERVED_DIR, "queue327-after.json"), serialize(after, Date.now()), "utf8");
console.log("[gen-queue327] queue327-after.json geschrieben (Schwert aktiv, Kochen mit Restziel vorn in der Warteschlange)");
