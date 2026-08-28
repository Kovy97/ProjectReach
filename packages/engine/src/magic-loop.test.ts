import { describe, expect, it } from "vitest";
import type { ContentDB, ItemDef, MonsterDef } from "@hearthforge/shared";
import { content } from "@hearthforge/content";
import { createGame } from "./state";
import { computeStats } from "./character";
import { startCombat, combatStep } from "./combat";

/**
 * Zauberreserve (Chef-GO 28.08.2026, design/zauberreserve-weisheit.md): die früheren Tests dieser
 * Datei zu per-Waffe-Manakosten (`castManaCost`) und zum Mana-Depletion-Loop (Cast → Weak-Melee →
 * Regen → Resume) sind ENTFERNT — Zauber kosten nichts mehr, den „schwachen Magier" gibt es nicht
 * mehr. Die neue Semantik (mana == maxMana, Cast ohne Kosten, Haltungs-Boni, Weisheits-Widerstand)
 * pinnt `spell-reserve.test.ts`. Hier bleibt der Multi-Effekt-Apply über effectiveWeaponEffects.
 */

/** Klont den Content und schiebt ein Test-Item in die Items-Map (read-only Original bleibt). */
function withItem(item: ItemDef): ContentDB {
  return { ...content, items: { ...content.items, [item.id]: item } };
}
/** Klont den Content und schiebt einen Test-Gegner in die Monster-Map. */
function withMonster(c: ContentDB, monster: MonsterDef): ContentDB {
  return { ...c, monsters: { ...c.monsters, [monster.id]: monster } };
}

/** Harmloser, praktisch unsterblicher Trainings-Gegner: riesige HP, trifft fast nie, kein Tod/Respawn. */
const DUMMY: MonsterDef = {
  id: "loop_dummy",
  name: { en: "Loop Dummy", de: "Loop-Puppe" },
  level: 5,
  maxHp: 5_000_000,
  damage: 1,
  accuracy: 1,
  evasion: 0,
  defense: 0,
  attackIntervalMs: 1000,
  xp: 0,
  gold: 0,
  loot: [],
};

describe("magic/melee — Multi-Effekt-Apply über effectiveWeaponEffects (≥2 Status)", () => {
  it("wendet beide Status einer Fusions-Waffe an (burn + bleed)", () => {
    const fusion: ItemDef = {
      id: "fusion_staff",
      name: "Fusions-Stab",
      type: "equipment",
      stackable: false,
      slot: "mainhand",
      weaponStyle: "magic",
      twoHanded: true,
      bonus: { magicDamage: 30, accuracy: 120 },
      weaponEffect: { type: "burn", chance: 1, magnitude: 8, durationMs: 4000 },
      weaponEffects: [{ type: "bleed", chance: 1, magnitude: 6, durationMs: 4000 }],
    };
    const c = withMonster(withItem(fusion), DUMMY);
    const s = createGame({ name: "Magier", baseAttributes: { int: 10, wis: 6, con: 30 } }, c, 3);
    s.character.equipment.mainhand = "fusion_staff";
    startCombat(s, c, "loop_dummy");

    let sawBurn = false;
    let sawBleed = false;
    for (let i = 0; i < 400; i++) {
      combatStep(s, c);
      if (s.combat.enemyEffects.some((e) => e.type === "burn")) sawBurn = true;
      if (s.combat.enemyEffects.some((e) => e.type === "bleed")) sawBleed = true;
      if (sawBurn && sawBleed) break;
    }
    expect(sawBurn).toBe(true);
    expect(sawBleed).toBe(true);
  });

  it("Einzel-Effekt-Waffe bleibt identisch (genau ein Status)", () => {
    const c = withMonster(content, DUMMY);
    const s = createGame({ name: "Magier", baseAttributes: { int: 12, wis: 8, con: 30 } }, c, 5);
    s.character.equipment.mainhand = "copper_staff"; // nur weaponEffect: burn
    startCombat(s, c, "loop_dummy");

    let sawBurn = false;
    for (let i = 0; i < 1500; i++) {
      combatStep(s, c);
      if (s.combat.enemyEffects.some((e) => e.type === "burn")) sawBurn = true;
      // ein Burn-Staff darf niemals einen zweiten Status (bleed/poison) erzeugen
      expect(s.combat.enemyEffects.some((e) => e.type === "bleed")).toBe(false);
      expect(s.combat.enemyEffects.some((e) => e.type === "poison")).toBe(false);
    }
    expect(sawBurn).toBe(true);
  });

  it("Zauberreserve: der Magier castet auch mit mana 0 im Save (kein Weak-Melee) — Spell-Status kommt durch", () => {
    const c = withMonster(content, DUMMY);
    const s = createGame({ name: "Magier", baseAttributes: { int: 12, wis: 8, con: 30 } }, c, 9);
    s.character.equipment.mainhand = "copper_staff";
    s.character.mana = 0; // Alt-Save mit leerem Pool
    startCombat(s, c, "loop_dummy");
    let sawBurn = false;
    for (let i = 0; i < 1500 && !sawBurn; i++) {
      combatStep(s, c);
      if (s.combat.enemyEffects.some((e) => e.type === "burn")) sawBurn = true;
    }
    expect(sawBurn).toBe(true);
    expect(s.character.mana).toBe(computeStats(s, c).maxMana); // Reserve wird auf maxMana gehalten
  });
});
