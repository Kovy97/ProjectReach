import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";

describe("smithing tiers & categories", () => {
  const smithing = Object.values(content.actions).filter((a) => a.skill === "smithing");
  const catIds = new Set(content.categories.map((c) => c.id));

  it("12 Metall-Tier-Kategorien sind definiert", () => {
    expect(content.categories.length).toBeGreaterThanOrEqual(12);
    for (const id of ["copper", "bronze", "iron", "steel", "godiron"]) {
      expect(catIds.has(id), `Kategorie ${id} fehlt`).toBe(true);
    }
  });

  it("jede Smithing-Aktion hat eine gültige Kategorie und ein levelRequired", () => {
    expect(smithing.length).toBeGreaterThanOrEqual(12);
    for (const a of smithing) {
      expect(a.category, `${a.id} ohne category`).toBeDefined();
      expect(catIds.has(a.category!), `${a.id} → unbekannte Kategorie ${a.category}`).toBe(true);
      expect(a.levelRequired ?? 0, `${a.id} ohne levelRequired`).toBeGreaterThanOrEqual(1);
    }
  });

  it("Legierungen verbrauchen Kohle (Stahl, Schwarzstahl, Mithril …)", () => {
    for (const id of ["smelt_steel", "smelt_blacksteel", "smelt_mithril", "smelt_godiron"]) {
      const a = content.actions[id]!;
      expect(a.inputs?.some((i) => i.itemId === "coal"), `${id} ohne Kohle`).toBe(true);
    }
  });

  it("die neuen Tier-Barren existieren als Items", () => {
    for (const bar of [
      "copper_bar",
      "blacksteel_bar",
      "mithril_bar",
      "adamantium_bar",
      "runite_bar",
      "titanium_bar",
      "godiron_bar",
    ]) {
      expect(content.items[bar], `${bar} fehlt`).toBeDefined();
    }
  });
});
