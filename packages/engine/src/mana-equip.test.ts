import { describe, expect, it } from "vitest";
import type { ContentDB, ItemDef, WeaponEffect } from "@hearthforge/shared";
import { effectiveWeaponEffects } from "@hearthforge/shared";
import { content } from "@hearthforge/content";
import { createGame } from "./state";
import { computeStats } from "./character";

/** Klont den Content und schiebt ein Test-Item in die Items-Map (read-only Original bleibt). */
function withItem(item: ItemDef): ContentDB {
  return { ...content, items: { ...content.items, [item.id]: item } };
}

describe("Ticket 2 — Zauberreserve über Ausrüstung (EquipBonus.maxMana; manaRegen ist seit 28.08.2026 entfallen)", () => {
  it("Focus-Offhand erhöht die Zauberreserve (maxMana) additiv (analog maxHp)", () => {
    const focus: ItemDef = {
      id: "test_focus",
      name: "Test-Focus",
      type: "equipment",
      stackable: false,
      slot: "offhand",
      weaponStyle: "magic",
      bonus: { maxMana: 50 },
    };
    const c = withItem(focus);
    const s = createGame({ name: "Magier" }, c, 1);

    const before = computeStats(s, c);
    s.character.equipment.offhand = "test_focus";
    const after = computeStats(s, c);

    // maxMana ist additiv VOR dem Pet-Multiplikator (kein Pet aktiv → Mult 1).
    expect(after.maxMana).toBe(before.maxMana + 50);
  });

  it("ohne maxMana-Bonus bleibt die Reserve unverändert (Rückwärtskompatibel)", () => {
    const plain: ItemDef = {
      id: "test_plain_off",
      name: "Schlichtes Offhand",
      type: "equipment",
      stackable: false,
      slot: "offhand",
      bonus: { magicDamage: 5 },
    };
    const c = withItem(plain);
    const s = createGame({ name: "Magier" }, c, 1);

    const before = computeStats(s, c);
    s.character.equipment.offhand = "test_plain_off";
    const after = computeStats(s, c);

    expect(after.maxMana).toBe(before.maxMana);
  });
});

describe("Ticket 3 — effectiveWeaponEffects(item)", () => {
  const burn: WeaponEffect = { type: "burn", chance: 0.3, magnitude: 4, durationMs: 4000 };
  const bleed: WeaponEffect = { type: "bleed", chance: 0.25, magnitude: 3, durationMs: 4000 };

  it("liefert [] für fehlendes/effektloses Item", () => {
    expect(effectiveWeaponEffects(null)).toEqual([]);
    expect(effectiveWeaponEffects(undefined)).toEqual([]);
    expect(
      effectiveWeaponEffects({ id: "x", name: "x", type: "equipment", stackable: false }),
    ).toEqual([]);
  });

  it("kombiniert weaponEffect + weaponEffects zu [single, ...array]", () => {
    const item: ItemDef = {
      id: "fusion",
      name: "Fusion",
      type: "equipment",
      stackable: false,
      weaponStyle: "magic",
      weaponEffect: burn,
      weaponEffects: [bleed],
    };
    expect(effectiveWeaponEffects(item)).toEqual([burn, bleed]);
  });

  it("dedupliziert identische Effekte (gleiches type/chance/magnitude/durationMs)", () => {
    const item: ItemDef = {
      id: "dup",
      name: "Dup",
      type: "equipment",
      stackable: false,
      weaponEffect: burn,
      weaponEffects: [{ ...burn }, bleed],
    };
    expect(effectiveWeaponEffects(item)).toEqual([burn, bleed]);
  });

  it("behält zwei Burns mit unterschiedlicher Magnitude (kein Over-Dedup nach type)", () => {
    const strongBurn: WeaponEffect = { type: "burn", chance: 0.3, magnitude: 9, durationMs: 4000 };
    const item: ItemDef = {
      id: "twoburn",
      name: "Zwei-Burn",
      type: "equipment",
      stackable: false,
      weaponEffect: burn,
      weaponEffects: [strongBurn],
    };
    expect(effectiveWeaponEffects(item)).toEqual([burn, strongBurn]);
  });

  it("nur weaponEffects-Array (kein single) wird ebenfalls geliefert", () => {
    const item: ItemDef = {
      id: "arronly",
      name: "Array-only",
      type: "equipment",
      stackable: false,
      weaponEffects: [burn, bleed],
    };
    expect(effectiveWeaponEffects(item)).toEqual([burn, bleed]);
  });
});
