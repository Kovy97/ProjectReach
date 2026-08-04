import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { createGame } from "./state";
import { computeStats } from "./character";
import { equipItem } from "./equipment";
import { addItem } from "./inventory";
import { xpForLevel } from "./leveling";

/** Gem-Tiers: Roh-Edelstein → schleifen → geschliffen → Schmuck. */
const GEMS = [
  { rough: "rough_garnet", cut: "garnet", cutAction: "cut_garnet", ring: "garnet_ring", amulet: "garnet_amulet" },
  { rough: "rough_sapphire", cut: "sapphire", cutAction: "cut_sapphire", ring: "sapphire_ring", amulet: "sapphire_amulet" },
  { rough: "rough_ruby", cut: "ruby", cutAction: "cut_ruby", ring: "ruby_ring", amulet: "ruby_amulet" },
  { rough: "rough_diamond", cut: "diamond", cutAction: "cut_diamond", ring: "diamond_ring", amulet: "diamond_amulet" },
];

describe("jewelcrafting chain", () => {
  it("Skill jewelcrafting existiert", () => {
    expect(content.skills.jewelcrafting).toBeDefined();
  });

  for (const g of GEMS) {
    it(`${g.cut}: Schleif-Kette + Schmuck verdrahtet`, () => {
      const cut = content.actions[g.cutAction];
      expect(cut, `${g.cutAction} fehlt`).toBeDefined();
      expect(cut!.skill).toBe("jewelcrafting");
      expect(cut!.inputs?.some((i) => i.itemId === g.rough)).toBe(true);
      expect(cut!.loot.some((l) => l.itemId === g.cut)).toBe(true);

      for (const piece of [g.ring, g.amulet]) {
        const item = content.items[piece];
        expect(item, `${piece} fehlt`).toBeDefined();
        expect(item!.type).toBe("equipment");
        // Itemization 2.0: Schmuck trägt keine bonus-Kampf-Flats mehr, sondern Attribute
        // (modifiers) + genau einen Skill-Boost (skillBoost) — mindestens eines davon ist gesetzt.
        expect(
          item!.bonus || item!.modifiers || item!.skillBoost,
          `${piece} ohne Bonus/modifiers/skillBoost`,
        ).toBeDefined();
        // Es gibt ein Craft-Rezept, das den geschliffenen Stein verbraucht und das Schmuckstück erzeugt.
        const recipe = Object.values(content.actions).find(
          (a) => a.skill === "jewelcrafting" && a.loot.some((l) => l.itemId === piece),
        );
        expect(recipe, `Kein Craft-Rezept für ${piece}`).toBeDefined();
        expect(recipe!.inputs?.some((i) => i.itemId === g.cut)).toBe(true);
      }
    });
  }

  it("Amulett-Bonus wirkt auf die Werte", () => {
    // garnet_amulet trägt Defence +1 (Boost-Kernmechanik §4.4) + modifiers con 1. Rüstungs-Trinität /
    // Itemization 2.5 (armor-trinity-spec §1.1/§1.3/§3): der Defence-Skill-Boost speist WEDER defense
    // (nur noch armorRating) NOCH evasion (nur DEX-Kern) — beide bleiben unverändert. Der Boost wird
    // weiterhin in skillBoosts aggregiert (UI). CON zahlt jetzt nur noch auf maxHp (con 1 → +2 maxHp).
    const s = createGame({ name: "X" }, content, 1);
    s.skills.jewelcrafting = { xp: xpForLevel(60) };
    const before = computeStats(s, content);
    addItem(s.inventory, content, "garnet_amulet", 1);
    expect(equipItem(s, content, "garnet_amulet").ok).toBe(true);
    const after = computeStats(s, content);
    expect(after.skillBoosts.defence).toBe(1);
    expect(after.defense).toBeCloseTo(before.defense, 6); // Defence-Boost speist keine Mitigation mehr
    expect(after.evasion).toBeCloseTo(before.evasion, 6); // … und keinen Accuracy-Contest-Evasion mehr
    expect(after.maxHp).toBeCloseTo(before.maxHp + 1 * 2, 6); // con 1 → +2 maxHp (CON nur noch HP)
  });

  it("Raubzahn-Kette: Wildwald-Reißzahn wird zu einem tragbaren Amulett verarbeitet", () => {
    // fang ist jetzt Input (kein toter Sell-Drop mehr).
    const recipe = content.actions.craft_fang_necklace;
    expect(recipe, "craft_fang_necklace fehlt").toBeDefined();
    expect(recipe!.skill).toBe("jewelcrafting");
    expect(recipe!.inputs?.some((i) => i.itemId === "fang")).toBe(true);
    expect(recipe!.loot.some((l) => l.itemId === "fang_necklace")).toBe(true);

    const item = content.items.fang_necklace;
    expect(item?.type).toBe("equipment");
    expect(item?.slot).toBe("amulet");

    // Itemization 2.0 §6.4: fang_necklace trägt jetzt str 1 (modifiers) + Power +1 (skillBoost)
    // statt der alten meleeDamage-Flat — meleeDamage = (0.1 + str·0.3 + power·0.08 + …): str+1 → +0.3,
    // Power-Boost+1 → +0.08, zusammen +0.38.
    const s = createGame({ name: "X" }, content, 1);
    s.skills.jewelcrafting = { xp: xpForLevel(10) };
    const base = computeStats(s, content).meleeDamage;
    addItem(s.inventory, content, "fang_necklace", 1);
    expect(equipItem(s, content, "fang_necklace").ok).toBe(true);
    const after = computeStats(s, content);
    expect(after.skillBoosts.power).toBe(1);
    expect(after.meleeDamage).toBeCloseTo(base + 0.38, 6);
  });

  it("Ringe belegen beide Ring-Slots (Routing ring1 → ring2)", () => {
    const s = createGame({ name: "X" }, content, 1);
    s.skills.jewelcrafting = { xp: xpForLevel(60) };
    addItem(s.inventory, content, "garnet_ring", 1);
    addItem(s.inventory, content, "ruby_ring", 1);
    expect(equipItem(s, content, "garnet_ring").ok).toBe(true);
    expect(s.character.equipment.ring1).toBe("garnet_ring");
    expect(equipItem(s, content, "ruby_ring").ok).toBe(true);
    expect(s.character.equipment.ring2).toBe("ruby_ring"); // zweiter Ring → ring2, nicht ersetzt
    expect(s.character.equipment.ring1).toBe("garnet_ring");
  });
});
