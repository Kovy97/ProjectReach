#!/usr/bin/env node
/**
 * Fixtures für die Task-#314-Verifikations-Screenshots ("Bank-Sanierung"): braucht — anders als
 * die bestehenden midgame/endgame/zoneprogress-Fixtures (keine hat Bank-Instanzen) — einen Zustand
 * mit (a) Bank-Beständen (Drag/Highlight sichtbar machen) UND (b) einer Varianten-Container-Zelle
 * (Basis-Stack + mehrere verzauberte Instanzen desselben Waffen-Items, in Inventar UND Lager), um
 * die neuen atomaren Gruppen-Ops (`depositItemGroup`/`withdrawItemGroup`) vor/nach zu zeigen.
 *
 * Zwei Varianten:
 *   bank314.json     — geräumiges Inventar (viele freie Slots), für Drag/Gruppen-Deposit-Demos.
 *   bank314full.json — identisch, aber Inventar auf 20/20 Slots vollgestopft (deterministisch, kein
 *                       fragiler "Shopping-Spree"-Klick-Loop nötig) — für die GameAlert-Screenshots
 *                       ("Kein Platz in deinen Taschen" beim Entnehmen).
 *
 * Run mit tsx (wie gen-fixtures.mjs — Workspace-Pakete sind rohes TS):
 *   node_modules/.bin/tsx ui-audit/gen-bank314-fixture.mjs   (aus apps/client/)
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { content } from "@hearthforge/content";
import { addInstance, addItem, createGame, usedSlots } from "@hearthforge/engine";
import { serialize } from "@hearthforge/persistence";
import { legacyOnboarding } from "@hearthforge/shared";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SERVED_DIR = join(__dirname, "..", "src", "renderer", "public", "ui-audit-fixtures");

function buildBase() {
  const state = createGame({ name: "Bank314" }, content, 1);
  state.character.gold = 5000;
  // Seasoned-character fixture (Muster gen-fixtures.mjs): sonst blockt der Onboarding-Guide/die
  // Bereichstouren (Combat/Shop/Bank) jeden Klick außerhalb des Spotlights.
  state.onboarding = legacyOnboarding();
  state.onboarding.toursSeen.featureTourV1 = true;
  state.onboarding.toursSeen.combat = true;
  state.onboarding.toursSeen.shop = true;
  state.onboarding.toursSeen.bank = true;

  // ── Varianten-Weapon: Basis-Stack (Inventar) + 3 verzauberte Instanzen (Inventar) ─────────────
  const weapon = Object.values(content.items).find((it) => it.type === "equipment" && it.weaponStyle);
  const affixIds = Object.keys(content.affixes ?? {});
  const suffixIds = Object.keys(content.suffixes ?? {});
  if (weapon) {
    addItem(state.inventory, content, weapon.id, 2); // schlichte Grundmenge
    const variants = [
      { instanceId: "b314_inst_a", baseItemId: weapon.id, affixes: affixIds[0] ? [{ affixId: affixIds[0], tier: 1 }] : [] },
      { instanceId: "b314_inst_b", baseItemId: weapon.id, affixes: affixIds[1] ? [{ affixId: affixIds[1], tier: 2 }] : [] },
      {
        instanceId: "b314_inst_c",
        baseItemId: weapon.id,
        affixes: [],
        ...(suffixIds[0] ? { suffix: { suffixId: suffixIds[0], roll: 0.72 } } : {}),
      },
    ];
    for (const v of variants) addInstance(state.inventory, v);
    console.log(`[gen-bank314] weapon=${weapon.id} + 2 plain + ${variants.length} instances im Inventar`);
  } else {
    console.warn("[gen-bank314] kein Waffen-Item im Katalog gefunden — Varianten-Demo entfällt");
  }

  // ── Bank-Bestand: ein paar bestehende Item-Arten, DAMIT die rechte Spalte nicht leer ist ───────
  const materials = Object.values(content.items).filter((it) => it.type === "material").slice(0, 4);
  for (const m of materials) {
    addItem(state.inventory, content, m.id, 25);
    state.bank[m.id] = 12;
  }

  // Ein zweites Basis-Item NUR in der Bank (kein Inventar-Gegenstück) — sauberes Drag-Ziel für
  // "Bank → Inventar" ohne die Varianten-Zelle anzufassen. WICHTIG für den GameAlert-Repro (volles
  // Inventar → Entnehmen schlägt fehl): dieses Item darf NIRGENDS im Inventar auftauchen, sonst
  // hätte `canHold` über den bestehenden Stack noch Platz und die Entnahme würde still gelingen.
  const dragTarget = Object.values(content.items).find((it) => it.type === "material" && !materials.includes(it));
  const bankOnlyIds = new Set([...materials.map((m) => m.id), dragTarget?.id].filter(Boolean));
  if (dragTarget) state.bank[dragTarget.id] = 8;

  // ── Restliches Inventar füllen (realistische Grid-Optik, aber NICHT randvoll — Task #314-Demo
  // braucht sichtbare freie Zielslots für die Drag-Screenshots). Bank-only-IDs bewusst ausgeschlossen
  // (s.o.). ──
  const misc = Object.values(content.items).filter((it) => it.type !== "equipment" && !bankOnlyIds.has(it.id)).slice(0, 4);
  for (const it of misc) addItem(state.inventory, content, it.id, 3);

  return { state, bankOnlyIds };
}

// ── bank314.json — geräumig ──────────────────────────────────────────────────────────────────
const { state: roomy } = buildBase();
writeFileSync(join(SERVED_DIR, "bank314.json"), serialize(roomy, Date.now()), "utf8");
console.log(`[gen-bank314] bank314.json: usedSlots=${usedSlots(roomy.inventory)}/${roomy.inventory.slots.length}`);

// ── bank314full.json — Inventar randvoll (deterministischer GameAlert-Repro) ───────────────────
const { state: full, bankOnlyIds } = buildBase();
const usedIds = new Set([...full.inventory.slots.filter((s) => s).map((s) => s.itemId), ...bankOnlyIds]);
const fillerCandidates = Object.values(content.items).filter((it) => it.type !== "equipment" && !usedIds.has(it.id));
let fi = 0;
while (usedSlots(full.inventory) < full.inventory.slots.length && fi < fillerCandidates.length) {
  addItem(full.inventory, content, fillerCandidates[fi].id, 1);
  fi++;
}
writeFileSync(join(SERVED_DIR, "bank314full.json"), serialize(full, Date.now()), "utf8");
console.log(
  `[gen-bank314] bank314full.json: usedSlots=${usedSlots(full.inventory)}/${full.inventory.slots.length}, ` +
    `bank-only ids kept out of inventory: ${[...bankOnlyIds].join(", ")}`,
);
