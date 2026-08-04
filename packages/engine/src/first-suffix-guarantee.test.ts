import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { ActionDef, ContentDB, ItemDef, SuffixDef } from "@hearthforge/shared";
import { createGame } from "./state";
import { tryCraftSuffix } from "./suffix";
import { setActiveAction } from "./actions";
import { advance } from "./tick";
import { addItem, expandBaseCapacity } from "./inventory";

/**
 * Früh-Garantie-Suffix (SAVE_VERSION 72, selber Bump, Chef-GO 2026-07-22 „Identitäts-Paket"):
 * `tryCraftSuffix` (suffix.ts) hebt die Chance auf 1 an, solange `state.firstSuffixGranted` noch
 * false ist UND der Kandidat strukturell einen Suffix tragen könnte. Test-Content analog
 * suffix.test.ts/drop-suffix.test.ts (Muster: echtes Content + injizierter Pool).
 */
function guaranteeContent(): ContentDB {
  const sword: ItemDef = {
    id: "test_guarantee_sword",
    name: { en: "Test Guarantee Sword", de: "Test-Garantie-Schwert" },
    type: "equipment",
    slot: "mainhand",
    weaponStyle: "melee",
    stackable: false,
  };
  const bull: SuffixDef = {
    id: "suffix_bull",
    suffix: { en: "of the Bull", de: "des Stiers" },
    appliesTo: ["weapon_melee"],
    statsPerIlvl: { meleeDamage: 0.7 },
    attrPerIlvl: { str: 0.45 },
    weight: 100,
  };
  return {
    ...content,
    suffixes: { suffix_bull: bull },
    items: { ...content.items, test_guarantee_sword: sword },
  };
}

describe("Früh-Garantie-Suffix (tryCraftSuffix Choke-Point)", () => {
  it("frischer Save: der ERSTE eligible Kandidat rollt garantiert einen Suffix, auch bei sehr niedriger Chance", () => {
    const c = guaranteeContent();
    const s = createGame({ name: "Neu" }, c, 1);
    expect(s.firstSuffixGranted).toBe(false);
    const rngBefore = s.rng.state;

    // Chance 0.01 — natürlich fast immer ein Fehlschlag, hier garantiert per Erst-Suffix-Regel.
    const res = tryCraftSuffix(s, c, "test_guarantee_sword", 50, 0.01);

    expect(res, "erster Kandidat muss garantiert einen Suffix rollen").not.toBeNull();
    expect(res!.instance.suffix).toBeDefined();
    expect(s.firstSuffixGranted).toBe(true);
    // RNG-Disziplin: Roll 1+2+3 wurden gezogen (genau wie ein NATÜRLICHER Erfolg auch täte) — kein
    // zusätzlicher/übersprungener Zug, nur der Vergleichswert in Roll 1 war 1 statt 0.01.
    expect(s.rng.state).not.toBe(rngBefore);
  });

  it("zweiter Kandidat NACH der Garantie läuft normal — bei niedriger Chance NICHT jedes Mal ein Treffer", () => {
    const c = guaranteeContent();
    const s = createGame({ name: "Neu" }, c, 2);
    // Erste Garantie „verbrauchen" (beliebiges Item genügt, Equipment mit Pool).
    const first = tryCraftSuffix(s, c, "test_guarantee_sword", 50, 0.01);
    expect(first).not.toBeNull();
    expect(s.firstSuffixGranted).toBe(true);

    // Danach: 200 weitere Würfe bei 10 % Chance — bei einer fortbestehenden Garantie wären es 200
    // Treffer; natürlich sind es statistisch ~20 (astronomisch unwahrscheinlich alle 200).
    let hits = 0;
    for (let i = 0; i < 200; i++) {
      const r = tryCraftSuffix(s, c, "test_guarantee_sword", 50, 0.1);
      if (r) hits++;
    }
    expect(hits).toBeGreaterThan(0);
    expect(hits).toBeLessThan(200);
  });

  it("suffixChance 0/fehlend bleibt von der Garantie UNBERÜHRT (Content-Entscheidung respektiert)", () => {
    const c = guaranteeContent();
    const s = createGame({ name: "Neu" }, c, 3);
    expect(s.firstSuffixGranted).toBe(false);
    const before = s.rng.state;
    // Chance 0 → weiterhin komplett RNG-frei, KEINE Garantie-Aktivierung, Flag bleibt false.
    expect(tryCraftSuffix(s, c, "test_guarantee_sword", 50, 0)).toBeNull();
    expect(s.rng.state).toBe(before);
    expect(s.firstSuffixGranted).toBe(false);
  });

  it("bereits gewährte Garantie (firstSuffixGranted true): Verhalten identisch zum Alt-Pfad ohne Garantie", () => {
    const c = guaranteeContent();
    const withFlag = createGame({ name: "Migrated" }, c, 4);
    withFlag.firstSuffixGranted = true; // simuliert einen migrierten Alt-Save (persistence härtet echt)
    const withoutFeature = createGame({ name: "Baseline" }, c, 4);
    withoutFeature.firstSuffixGranted = true;

    // Identischer Seed + identischer (bereits-true) Flag ⇒ identisches Ergebnis, ob die Garantie
    // JE aktiv war oder nicht — der Choke-Point unterscheidet nicht zwischen den beiden Fällen.
    const a = tryCraftSuffix(withFlag, c, "test_guarantee_sword", 50, 0.01);
    const b = tryCraftSuffix(withoutFeature, c, "test_guarantee_sword", 50, 0.01);
    expect(a).toEqual(b);
    expect(withFlag.rng.state).toBe(withoutFeature.rng.state);
  });

  it("keine Auswirkung auf Nicht-Equipment/pool-lose Kandidaten (weiterhin RNG-frei, Flag bleibt false)", () => {
    const c = guaranteeContent();
    const s = createGame({ name: "Neu" }, c, 5);
    const before = s.rng.state;
    const matId = Object.values(c.items).find((i) => i.type === "material")!.id;
    expect(tryCraftSuffix(s, c, matId, 50, 1)).toBeNull();
    expect(s.rng.state).toBe(before);
    expect(s.firstSuffixGranted).toBe(false); // noch nichts entstanden — die Garantie bleibt scharf
  });

  it("offline == online: die Garantie + der Flag-Übergang bleiben bit-identisch (Determinismus-Gesetz)", () => {
    const bar: ItemDef = { id: "test_guarantee_bar", name: { en: "Bar", de: "Barren" }, type: "material", stackable: true };
    const action: ActionDef = {
      id: "craft_test_guarantee_sword",
      name: { en: "Forge", de: "Schmieden" },
      skill: "smithing",
      durationMs: 100,
      xp: 5,
      inputs: [{ itemId: "test_guarantee_bar", qty: 1 }],
      loot: [{ itemId: "test_guarantee_sword", chance: 1, min: 1, max: 1, suffixChance: 0.15 }],
    };
    const base = guaranteeContent();
    const c: ContentDB = {
      ...base,
      items: { ...base.items, test_guarantee_bar: bar },
      actions: { ...base.actions, craft_test_guarantee_sword: action },
    };
    const SEED = 123;
    const GAME_MS = 5_000; // ~50 Crafts

    const build = () => {
      const s = createGame({ name: "Crafter" }, c, SEED);
      expandBaseCapacity(s.inventory, c, 1000);
      addItem(s.inventory, c, "test_guarantee_bar", 500);
      setActiveAction(s, c, "craft_test_guarantee_sword");
      return s;
    };

    const online = build();
    for (let t = 0; t < GAME_MS; t += 100) advance(online, c, 100);

    const offline = build();
    advance(offline, c, GAME_MS, { offline: true });

    expect(offline.firstSuffixGranted).toBe(online.firstSuffixGranted);
    expect(offline.firstSuffixGranted).toBe(true); // mind. ein Craft ⇒ Garantie greift sicher
    expect(offline.rng).toEqual(online.rng);
    expect(offline.inventory).toEqual(online.inventory);
    expect(offline.mastery).toEqual(online.mastery);
  });
});
