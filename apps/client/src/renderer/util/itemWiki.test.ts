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
      expect(champ[0]!.chance, elite.id).toBeGreaterThan(0);
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
