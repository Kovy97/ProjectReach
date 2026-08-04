#!/usr/bin/env node
/**
 * TEMPORÄRE Fixtures für die Task-#369-Verifikation ("die stille Endlos-Sperre") — Präfix `qb-`.
 * Nach dem Beleg-Screenshot wieder löschen (beide Orte).
 *
 *   qb-endless-action.json — ∞-Sammelaktion aktiv (mine_copper, KEIN Mengen-Ziel) + Warteschlange
 *                            dahinter [Kampf chicken ×5, cook_shrimp ×25]. Genau der Sweep-Befund.
 *   qb-endless-fight.json  — ∞-Kampf läuft (chicken, kein Kill-Ziel) + wartende Aktion dahinter.
 *
 * Alles über echte Engine-APIs bestückt (Muster gen-queue327-fixture.mjs) — kein hart codierter
 * Queue-Eintrag. Fixtures MÜSSEN in BEIDE Orte (BOT-GUIDE.md „Lektionen aus dem Sweep").
 *
 * Run aus apps/client/:  node_modules/.bin/tsx ui-audit/gen-qb-fixture.mjs
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { content } from "@hearthforge/content";
import {
  addItem,
  advanceActionQueue,
  createGame,
  enqueueAction,
  enqueueFight,
  queueBlockReason,
  setActiveAction,
  xpForLevel,
} from "@hearthforge/engine";
import { serialize } from "@hearthforge/persistence";
import { legacyOnboarding } from "@hearthforge/shared";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SERVED_DIR = join(__dirname, "..", "src", "renderer", "public", "ui-audit-fixtures");
const AUDIT_DIR = join(__dirname, "fixtures");

function seasoned(name) {
  const state = createGame({ name, baseAttributes: { str: 6, con: 80 } }, content, 1);
  state.onboarding = legacyOnboarding();
  state.onboarding.toursSeen.featureTourV1 = true;
  state.onboarding.toursSeen.combat = true;
  state.skills.mining = { xp: xpForLevel(20) };
  state.skills.cooking = { xp: xpForLevel(20) };
  addItem(state.inventory, content, "raw_shrimp", 50);
  return state;
}

function write(name, state) {
  const json = serialize(state, Date.now());
  writeFileSync(join(SERVED_DIR, `${name}.json`), json, "utf8");
  writeFileSync(join(AUDIT_DIR, `${name}.json`), json, "utf8");
  console.log(`[gen-qb] ${name}.json (beide Orte) — queueBlockReason: ${queueBlockReason(state, content)}`);
}

// ── (1) ∞-Sammelaktion sperrt die Queue ───────────────────────────────────────────────────────
const a = seasoned("QueueBlock");
setActiveAction(a, content, "mine_copper", null); // ∞ — kein Mengen-Ziel
enqueueFight(a, content, "chicken", 5);
enqueueAction(a, content, "cook_shrimp", 25);
write("qb-endless-action", a);

// ── (3) ∞-Sammelaktion, aber NOCH LEERE Queue — Ausgangslage für den Toast-Beleg: der Bot reiht
//        live einen Kampf ein, die Sperre entsteht also während der Sitzung (Flanken-Erkennung).
const c = seasoned("QueueBlockToast");
setActiveAction(c, content, "mine_copper", null);
write("qb-endless-idle", c);

// ── (2) ∞-Kampf sperrt die Queue ──────────────────────────────────────────────────────────────
const b = seasoned("QueueBlockFight");
enqueueFight(b, content, "chicken", null); // ∞-Kampf
advanceActionQueue(b, content); // läuft an → state.queueFight = { chicken, remaining: null }
enqueueAction(b, content, "mine_copper", 25);
enqueueAction(b, content, "cook_shrimp", 25);
write("qb-endless-fight", b);
