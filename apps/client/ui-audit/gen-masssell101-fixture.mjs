#!/usr/bin/env node
/**
 * Fixture für den 1.0.1-Spielerbug „Massenverkauf verzauberter Items" (Aldric-Feedback: „Selling
 * enchanted items is a real pain right now. needs to be a way to select all or something."):
 * simuliert genau seinen Fall — 30 verzauberte Ausrüstungsstücke, aber über SECHS verschiedene
 * Basis-Items verteilt (je 5 Instanzen: helmet/body/legs/boots/gloves/mainhand). Genau dieser Fall
 * (viele VERSCHIEDENE Basis-Items, nicht nur eine Sorte) ist der Rest-Schmerz, den Task #323
 * ("Ganzer Stapel" pro Container) noch nicht löst — jedes Basis-Item braucht dort einen eigenen
 * Popup-Klickzyklus. Der neue globale „Alle auswählen"-Schalter (Task 1.0.1) soll genau DAS auf
 * einen Klick verkürzen.
 *
 * Run mit tsx (Workspace-Pakete sind rohes TS):
 *   node_modules/.bin/tsx ui-audit/gen-masssell101-fixture.mjs   (aus apps/client/)
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { content } from "@hearthforge/content";
import { addInstance, addItem, createGame } from "@hearthforge/engine";
import { serialize } from "@hearthforge/persistence";
import { legacyOnboarding } from "@hearthforge/shared";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SERVED_DIR = join(__dirname, "..", "src", "renderer", "public", "ui-audit-fixtures");

const state = createGame({ name: "Aldric" }, content, 1);
state.character.gold = 12000;
state.onboarding = legacyOnboarding();
state.onboarding.toursSeen.featureTourV1 = true;
state.onboarding.toursSeen.featureTourV2 = true; // "Neu: New Haven"-Spotlight (0.3.0), sonst blockt es jeden Klick.
state.onboarding.toursSeen.combat = true;
state.onboarding.toursSeen.shop = true;
state.onboarding.toursSeen.bank = true;

const affixIds = Object.keys(content.affixes ?? {});
const suffixIds = Object.keys(content.suffixes ?? {});

// Sechs verschiedene Basis-Items (ein Slot je Ausrüstungsart) — jeweils 5 verzauberte Instanzen,
// bewusst KEINE Grundmenge dieser Items im Stack (reine Instanz-Container, wie bei einem
// Vielspieler, der alles Enchantete behält, aber die schlichte Ware längst verkauft hat).
const BASE_ITEMS = ["leather_helm", "leather_body", "leather_legs", "leather_boots", "copper_gauntlets", "rusty_sword"]
  .filter((id) => content.items[id]);

let total = 0;
for (const baseItemId of BASE_ITEMS) {
  for (let i = 0; i < 5; i++) {
    const useAffix = i % 2 === 0 && affixIds.length > 0;
    addInstance(state.inventory, {
      instanceId: `ms101_${baseItemId}_${i}`,
      baseItemId,
      affixes: useAffix ? [{ affixId: affixIds[i % affixIds.length], tier: 1 + (i % 3) }] : [],
      // ilvl ist PFLICHT (persistence sanitizeInstance verlangt Number.isFinite(suffix.ilvl),
      // sonst wird der Suffix beim Laden verworfen und die Instanz — da dann affixlos UND
      // suffixlos — als "modifikationslos" in einen Bank-Stack aufgelöst, s. persistence/index.ts).
      ...(!useAffix && suffixIds.length > 0
        ? { suffix: { suffixId: suffixIds[i % suffixIds.length], ilvl: 50, roll: 0.4 + i * 0.1 } }
        : {}),
    });
    total++;
  }
}
console.log(`[gen-masssell101] ${total} verzauberte Instanzen über ${BASE_ITEMS.length} Basis-Items verteilt`);

// Ein paar schlichte Materialstapel dazu (realistisches Grid, zeigt: Stacks bleiben vom
// Container-Sonderfall unberührt).
const materials = Object.values(content.items).filter((it) => it.type === "material").slice(0, 4);
for (const m of materials) addItem(state.inventory, content, m.id, 30 + Math.floor(Math.random() * 40));

writeFileSync(join(SERVED_DIR, "masssell101.json"), serialize(state, Date.now()), "utf8");
console.log("[gen-masssell101] masssell101.json written");
