#!/usr/bin/env node
/**
 * Fixture für die Task-#323-Verifikations-Screenshots ("Mass-Sell im Shop"): braucht ALLE drei
 * Klick-Fälle des neuen Auswahlmodus gleichzeitig sichtbar im Verkaufs-Grid —
 *   (a) ein EINZELSTÜCK (qty=1) — direktes An-/Abhaken ohne Popup,
 *   (b) einen GESTAPELTEN FUNGIBLE (qty>1) — Mengen-Slider-Popup (Default=Max),
 *   (c) einen VARIANTEN-CONTAINER (Basis-Stack + mehrere verzauberte Instanzen desselben
 *       Waffen-Items) — Stack-/Single-Popup, Single öffnet die Häkchenliste.
 * Pattern nach gen-bank314-fixture.mjs (dieselbe createGame/addItem/addInstance/serialize-Kette).
 *
 * Run mit tsx (Workspace-Pakete sind rohes TS):
 *   node_modules/.bin/tsx ui-audit/gen-masssell-323-fixture.mjs   (aus apps/client/)
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

const state = createGame({ name: "MassSell323" }, content, 1);
state.character.gold = 5000;
state.onboarding = legacyOnboarding();
state.onboarding.toursSeen.featureTourV1 = true;
state.onboarding.toursSeen.combat = true;
state.onboarding.toursSeen.shop = true;
state.onboarding.toursSeen.bank = true;

// (a) Einzelstück — irgendein eindeutig identifizierbares material mit qty=1.
const singleItem = Object.values(content.items).find((it) => it.type === "material");
if (singleItem) {
  addItem(state.inventory, content, singleItem.id, 1);
  console.log(`[gen-masssell323] single item: ${singleItem.id} x1`);
}

// (b) Gestapelter Fungible — ein ANDERES material mit großer Menge.
const stackItem = Object.values(content.items).find(
  (it) => it.type === "material" && it.id !== singleItem?.id,
);
if (stackItem) {
  addItem(state.inventory, content, stackItem.id, 50);
  console.log(`[gen-masssell323] stack item: ${stackItem.id} x50`);
}

// (c) Varianten-Container — Waffe mit Grundmenge + 3 verzauberten Instanzen (Muster gen-bank314).
const weapon = Object.values(content.items).find((it) => it.type === "equipment" && it.weaponStyle);
const affixIds = Object.keys(content.affixes ?? {});
const suffixIds = Object.keys(content.suffixes ?? {});
if (weapon) {
  addItem(state.inventory, content, weapon.id, 2);
  const variants = [
    { instanceId: "ms323_inst_a", baseItemId: weapon.id, affixes: affixIds[0] ? [{ affixId: affixIds[0], tier: 1 }] : [] },
    { instanceId: "ms323_inst_b", baseItemId: weapon.id, affixes: affixIds[1] ? [{ affixId: affixIds[1], tier: 2 }] : [] },
    {
      instanceId: "ms323_inst_c",
      baseItemId: weapon.id,
      affixes: [],
      ...(suffixIds[0] ? { suffix: { suffixId: suffixIds[0], roll: 0.72 } } : {}),
    },
  ];
  for (const v of variants) addInstance(state.inventory, v);
  console.log(`[gen-masssell323] weapon=${weapon.id} + 2 plain + ${variants.length} instances`);
}

writeFileSync(join(SERVED_DIR, "masssell323.json"), serialize(state, Date.now()), "utf8");
console.log("[gen-masssell323] masssell323.json written");
