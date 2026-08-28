import { describe, expect, it } from "vitest";
import { EQUIP_SLOTS, type ContentDB, type EquipSlot, type ItemDef } from "@hearthforge/shared";
import { buildCharacterExportPrompt, type CharacterExportInput } from "./characterExportPrompt";

/** Minimal-Item wie in packages/engine/src/*.test.ts (Muster `weapon()`/`armor()`). */
function item(id: string, over: Partial<ItemDef>): ItemDef {
  return { id, name: { en: `EN ${id}`, de: `DE ${id}` }, type: "equipment", stackable: false, ...over };
}

/** Fixture-Charakter mit ALLEN 14 Slots befüllt (ein Item je Slot, unterschiedliche Rarities). */
function fixtureContent(): ContentDB {
  const items: Record<string, ItemDef> = {};
  EQUIP_SLOTS.forEach((slot, i) => {
    const rarity = (["common", "magic", "rare", "epic"] as const)[i % 4];
    items[`item_${slot}`] = item(`item_${slot}`, {
      slot,
      rarity,
      description: { en: `EN description of ${slot}`, de: `DE Beschreibung von ${slot}` },
    });
  });
  return { items } as unknown as ContentDB;
}

function fixtureEquipment(): Record<EquipSlot, string | null> {
  const eq = {} as Record<EquipSlot, string | null>;
  for (const slot of EQUIP_SLOTS) eq[slot] = `item_${slot}`;
  return eq;
}

function fixtureInput(over: Partial<CharacterExportInput> = {}): CharacterExportInput {
  return {
    name: "Aldric Vane",
    totalLevel: 47,
    style: "melee",
    equipment: fixtureEquipment(),
    ...over,
  };
}

describe("buildCharacterExportPrompt", () => {
  it("enthält alle 14 Ausrüstungsplätze", () => {
    const content = fixtureContent();
    const prompt = buildCharacterExportPrompt(fixtureInput(), content);
    expect(EQUIP_SLOTS.length).toBe(14);
    for (const slot of EQUIP_SLOTS) {
      expect(prompt).toContain(`EN item_${slot}`);
      expect(prompt).toContain(`EN description of ${slot}`);
    }
  });

  it("zeigt die englische Rarity je Slot (nicht die interne ID)", () => {
    const content = fixtureContent();
    const prompt = buildCharacterExportPrompt(fixtureInput(), content);
    expect(prompt).toContain("(Common)");
    expect(prompt).toContain("(Magic)");
    expect(prompt).toContain("(Rare)");
    expect(prompt).toContain("(Epic)");
  });

  it("bleibt Englisch, auch wenn die Item-Namen/Beschreibungen Deutsch enthalten", () => {
    const content = fixtureContent();
    const prompt = buildCharacterExportPrompt(fixtureInput(), content);
    expect(prompt).not.toContain("DE item_");
    expect(prompt).not.toContain("DE Beschreibung");
  });

  it("markiert leere Slots als 'empty'", () => {
    const content = fixtureContent();
    const equipment = fixtureEquipment();
    equipment.cape = null;
    const prompt = buildCharacterExportPrompt(fixtureInput({ equipment }), content);
    expect(prompt).toContain("Cape: empty");
  });

  it("nennt Name, Gesamtlevel und Kampfstil in der Charakterzeile", () => {
    const content = fixtureContent();
    const prompt = buildCharacterExportPrompt(fixtureInput({ name: "Vayla Stormrend", totalLevel: 82, style: "magic" }), content);
    expect(prompt).toContain("Vayla Stormrend");
    expect(prompt).toContain("Total level 82");
    expect(prompt).toContain("a spellcaster");
  });

  it.each(["melee", "ranged", "magic"] as const)("Waffen-Stil-Zeile nennt den aktiven Stil (%s)", (style) => {
    const content = fixtureContent();
    const prompt = buildCharacterExportPrompt(fixtureInput({ style }), content);
    const label = style === "melee" ? "Melee" : style === "ranged" ? "Ranged" : "Magic";
    expect(prompt).toContain(`Weapon style: ${label}`);
  });

  it("endet mit dem Anhang-Hinweis und enthält den Auftragssatz", () => {
    const content = fixtureContent();
    const prompt = buildCharacterExportPrompt(fixtureInput(), content);
    expect(prompt.trim().endsWith("Attach kit.png and portrait.png with this prompt.")).toBe(true);
    expect(prompt).toContain("dark-fantasy RPG Grim Reach");
    expect(prompt).toContain("portrait.png");
    expect(prompt).toContain("kit.png");
  });

  it("Item ohne Beschreibung: Zeile ohne Gedankenstrich-Anhang", () => {
    const content = fixtureContent();
    content.items.item_helmet = item("item_helmet", { slot: "helmet", rarity: "common" });
    const prompt = buildCharacterExportPrompt(fixtureInput(), content);
    expect(prompt).toContain("Helmet: EN item_helmet (Common)");
    expect(prompt).not.toMatch(/Helmet: EN item_helmet \(Common\) —/);
  });
});
