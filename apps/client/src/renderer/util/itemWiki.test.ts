import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { ITEM_SOURCE_INDEX } from "./itemWiki";

/**
 * Spieler-Report 28.08.2026 („Legendary cape Greytooth Mantle: no Sources info in the Wiki"): Champion-Unikate
 * (content.elites[*].uniqueItemId) und Champion-Zusatzbeute (extraLoot) müssen im Quellen-Index stehen.
 */
describe("Item-Wiki: Champion-Quellen", () => {
  it("jedes Champion-Unikat hat mindestens eine champion-Quelle mit Zone und Chance", () => {
    for (const elite of Object.values(content.elites ?? {})) {
      const sources = ITEM_SOURCE_INDEX.get(elite.uniqueItemId) ?? [];
      const champ = sources.filter((s) => s.kind === "champion" && s.eliteId === elite.id);
      expect(champ.length, elite.id).toBeGreaterThan(0);
      expect(champ[0]!.kind === "champion" && champ[0]!.zoneId, elite.id).toBe(elite.zone);
      expect(champ[0]!.kind === "champion" && champ[0]!.chance, elite.id).toBeGreaterThan(0);
    }
  });

  it("Grauzahn-Mantel: Quelle ist Grauzahn der Ausgehungerte im Wildwald", () => {
    const sources = ITEM_SOURCE_INDEX.get("greytooth_mantle") ?? [];
    const champ = sources.find((s) => s.kind === "champion");
    expect(champ).toBeDefined();
    expect(champ!.kind === "champion" && champ!.eliteId).toBe("elite_wild_wolf");
    expect(champ!.kind === "champion" && champ!.zoneId).toBe("wildwood");
  });

  it("normale Monster-Drops bleiben indiziert", () => {
    const sources = ITEM_SOURCE_INDEX.get("raw_hide") ?? [];
    expect(sources.some((s) => s.kind === "monster")).toBe(true);
  });
});

/**
 * Chef-Auftrag 29.08.2026 ("wo kriegt man das Saatgut her"): die `crop`-Quelle trägt jetzt das
 * Saatgut mit (ID + Name), damit das Wiki-Modal unter der Anbau-Quelle die Samen-Herkunft anzeigen
 * und per Klick zur Samen-Wiki-Seite springen kann. Reine Datenableitung — s. JSDoc in itemWiki.ts.
 */
describe("Item-Wiki: Saatgut-Herkunft an der Anbau-Quelle", () => {
  it("jede crop-Quelle trägt seedItemId + seedName, und der Samen hat selbst eine crop-Quelle im Index", () => {
    for (const crop of Object.values(content.crops ?? {})) {
      const sources = ITEM_SOURCE_INDEX.get(crop.yieldItem) ?? [];
      const cropSource = sources.find((s) => s.kind === "crop" && s.cropId === crop.id);
      expect(cropSource, crop.id).toBeDefined();
      expect(cropSource!.kind === "crop" && cropSource!.seedItemId, crop.id).toBe(crop.seedItem);
      // seedName ist die Item-Definition des Samens (nicht nur die rohe ID) — außer der seltene
      // Fall eines Content-Lochs, dann bleibt es beim Fallback (Assertion unten deckt beides ab).
      const seedDef = content.items[crop.seedItem];
      const expectedName = seedDef ? seedDef.name : crop.seedItem;
      expect(cropSource!.kind === "crop" && cropSource!.seedName, crop.id).toEqual(expectedName);
    }
  });

  it("Grauwurz: Samen (graywort_seed) hat eigene sammelbare/käufliche Quellen im Index", () => {
    const cropSources = ITEM_SOURCE_INDEX.get("graywort") ?? [];
    const cropSource = cropSources.find((s) => s.kind === "crop");
    expect(cropSource).toBeDefined();
    expect(cropSource!.kind === "crop" && cropSource!.seedItemId).toBe("graywort_seed");

    const seedSources = ITEM_SOURCE_INDEX.get("graywort_seed") ?? [];
    expect(seedSources.length).toBeGreaterThan(0);
    expect(seedSources.some((s) => s.kind === "action")).toBe(true);
    expect(seedSources.some((s) => s.kind === "shop")).toBe(true);
  });
});
