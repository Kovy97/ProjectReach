import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";

/** Verdrahtung der Weiden-Zone: Drops speisen Gerberei/Kochen (Task #286: Fletching-Munition entfernt). */
describe("living world: Pastures zone wiring", () => {
  it("die Weiden-Zone existiert mit Bauernhof-Tieren", () => {
    expect(content.zones.some((z) => z.id === "pastures")).toBe(true);
    for (const id of ["chicken", "cow", "boar"]) {
      expect(content.monsters[id]?.zone, `${id} fehlt/falsche Zone`).toBe("pastures");
    }
  });

  it("Huhn liefert Federn (Fletching) + Hühnchen (Kochen)", () => {
    const drops = content.monsters.chicken!.loot.map((l) => l.itemId);
    expect(drops).toContain("feather");
    expect(drops).toContain("raw_chicken");
  });

  it("Kuh liefert Leder (Gerberei) + Rindfleisch (Kochen)", () => {
    const drops = content.monsters.cow!.loot.map((l) => l.itemId);
    expect(drops).toContain("raw_hide");
    expect(drops).toContain("raw_beef");
  });

  it("Federn sind ein verkäufliches Nebenprodukt (Task #286: Munition komplett entfernt)", () => {
    // Federn fütterten früher die Pfeil-Herstellung (Fletching) — die Munitions-Kette ist
    // seit #286 GELÖSCHT (keine Pfeile mehr im Spiel). Federn bleiben trotzdem ein sinnvoller
    // Weiden-Drop: verkäuflich (Sink) statt tote Ware.
    expect(content.items.feather?.value ?? 0).toBeGreaterThan(0);
  });

  it("Koch-Rezepte für Rind & Hühnchen erzeugen heilendes Essen", () => {
    for (const [action, raw, cooked] of [
      ["cook_beef", "raw_beef", "cooked_beef"],
      ["cook_chicken", "raw_chicken", "cooked_chicken"],
    ] as const) {
      const a = content.actions[action]!;
      expect(a.inputs?.[0]?.itemId).toBe(raw);
      expect(a.loot[0]?.itemId).toBe(cooked);
      expect(content.items[cooked]?.healAmount, `${cooked} ohne healAmount`).toBeGreaterThan(0);
    }
  });
});
