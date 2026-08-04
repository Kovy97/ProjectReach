#!/usr/bin/env node
/**
 * Fixtures für die Task-#315-Verifikations-Screenshots ("Kampf-Queue-UI"): ein frischer
 * Level-1-Charakter (pastures-Zone, chicken/cow bereits erreichbar).
 *
 * Drei Varianten:
 *   queue315.json       — frisch, leere Queue (Live-Screenshot des Mengen-Grids auf der
 *                          Monster-Karte, VOR jedem Klick).
 *   queue315mixed.json  — Queue vorab über echte Engine-APIs bestückt: [chicken ×25, Holzfällen
 *                          ×25, cow ∞]. Bewusst NICHT per Playwright-Klick live nachgebaut (ein
 *                          zweiter Klick auf eine andere Monster-Karte kam im ersten Anlauf
 *                          regelmäßig zu spät — der Kampfstart über den nächsten Game-Tick lief
 *                          schneller als der zweite Klick, MonsterSelect war da schon durch
 *                          <Battle> ersetzt). Alles noch UNGESTARTET (activeActionId/combat.
 *                          monsterId beide null) — der erste Tick NACH dem Laden poppt den
 *                          vordersten Eintrag (chicken) ganz regulär über advanceActionQueue,
 *                          genau wie bei einem Live-Klick; der Fortschrittszähler startet ab
 *                          DIESEM Moment bei 0 und zählt in der echten Browser-Session hoch (s.
 *                          ActionQueuePanel.tsx-Kommentar zur Session-Objekt-Identität).
 *   queue315paused.json — Queue bereits pausiert (`queuePaused=true`, Muster wie die Engine-eigenen
 *                          Tests packages/engine/src/fight-queue.test.ts setzen `s.queuePaused`
 *                          direkt) MIT einem wartenden Kampf-Eintrag, für den "Fortsetzen"-Badge-
 *                          Screenshot — ein echter Tod ist im Headless-Lauf zu unzuverlässig
 *                          (Timing-abhängig), das Pause-Flag selbst ist reiner State (keine Engine-
 *                          Logik-Änderung), s. gen-bank314-fixture.mjs für dasselbe Direkt-Feld-
 *                          Muster (`state.bank[...] = n`).
 *
 * Run mit tsx (wie gen-bank314-fixture.mjs — Workspace-Pakete sind rohes TS):
 *   node_modules/.bin/tsx ui-audit/gen-queue315-fixture.mjs   (aus apps/client/)
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { content } from "@hearthforge/content";
import { createGame, enqueueAction, enqueueFight } from "@hearthforge/engine";
import { serialize } from "@hearthforge/persistence";
import { legacyOnboarding } from "@hearthforge/shared";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SERVED_DIR = join(__dirname, "..", "src", "renderer", "public", "ui-audit-fixtures");

function buildBase() {
  const state = createGame({ name: "Queue315" }, content, 1);
  // Seasoned-character fixture (Muster gen-bank314-fixture.mjs): sonst blockt der Onboarding-Guide/
  // die Kampf-Bereichstour jeden Klick außerhalb des Spotlights.
  state.onboarding = legacyOnboarding();
  state.onboarding.toursSeen.featureTourV1 = true;
  state.onboarding.toursSeen.combat = true;
  return state;
}

// ── queue315.json — frisch, leere Queue (Screenshot-Skript zeigt das Mengen-Grid VOR dem Klick) ─
const fresh = buildBase();
writeFileSync(join(SERVED_DIR, "queue315.json"), serialize(fresh, Date.now()), "utf8");
console.log("[gen-queue315] queue315.json geschrieben (leere Queue, Level 1, pastures erreichbar)");

// ── queue315mixed.json — [chicken x25, Holzfällen x25, cow inf], noch nichts aktiv ──────────────
const mixed = buildBase();
enqueueFight(mixed, content, "chicken", 25);
enqueueAction(mixed, content, "cut_normal_tree", 25);
enqueueFight(mixed, content, "cow", null);
writeFileSync(join(SERVED_DIR, "queue315mixed.json"), serialize(mixed, Date.now()), "utf8");
console.log("[gen-queue315] queue315mixed.json geschrieben (3 vorgeplante Einträge, noch nichts läuft)");

// ── queue315paused.json — bereits pausiert, ein Kampf-Eintrag wartet ────────────────────────────
const paused = buildBase();
enqueueFight(paused, content, "chicken", 25); // echte Engine-API, kein hart codierter Queue-Eintrag
paused.queuePaused = true; // reiner State-Flag-Set, kein Engine-Logik-Eingriff (Muster s.o.)
writeFileSync(join(SERVED_DIR, "queue315paused.json"), serialize(paused, Date.now()), "utf8");
console.log("[gen-queue315] queue315paused.json geschrieben (queuePaused=true, 1 wartender Kampf-Eintrag)");
