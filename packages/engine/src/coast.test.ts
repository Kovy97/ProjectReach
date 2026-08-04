import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";

/** Fisch-Kette der Küste: fangen (Fishing) → braten (Cooking) → Heilnahrung. */
const FISH = [
  { raw: "raw_cod", cooked: "cooked_cod", catchAction: "catch_cod", cookAction: "cook_cod" },
  { raw: "raw_salmon", cooked: "cooked_salmon", catchAction: "catch_salmon", cookAction: "cook_salmon" },
  { raw: "raw_lobster", cooked: "cooked_lobster", catchAction: "catch_lobster", cookAction: "cook_lobster" },
];

describe("Tidewater Shoals — Küstenzone & Fisch-Kette", () => {
  it("Zone coast existiert und ist mit Monstern besiedelt", () => {
    expect(content.zones.some((z) => z.id === "coast")).toBe(true);
    const dwellers = Object.values(content.monsters).filter((m) => m.zone === "coast");
    expect(dwellers.length).toBeGreaterThanOrEqual(3);
  });

  for (const f of FISH) {
    it(`${f.cooked}: Fang→Koch-Kette verdrahtet, heilt`, () => {
      const c = content.actions[f.catchAction];
      expect(c, `${f.catchAction} fehlt`).toBeDefined();
      expect(c!.skill).toBe("fishing");
      expect(c!.loot.some((l) => l.itemId === f.raw)).toBe(true);

      const k = content.actions[f.cookAction];
      expect(k, `${f.cookAction} fehlt`).toBeDefined();
      expect(k!.skill).toBe("cooking");
      expect(k!.inputs?.some((i) => i.itemId === f.raw)).toBe(true);
      expect(k!.loot.some((l) => l.itemId === f.cooked)).toBe(true);

      const food = content.items[f.cooked];
      expect(food, `${f.cooked} fehlt`).toBeDefined();
      expect(food!.type).toBe("consumable");
      expect(food!.healAmount ?? 0).toBeGreaterThan(0);
    });
  }

  it("Küsten-Monster lassen Fisch fallen, der in der Küche verwertbar ist", () => {
    const cookable = new Set(
      Object.values(content.actions)
        .filter((a) => a.skill === "cooking")
        .flatMap((a) => a.inputs?.map((i) => i.itemId) ?? []),
    );
    const coastDrops = Object.values(content.monsters)
      .filter((m) => m.zone === "coast")
      .flatMap((m) => m.loot.map((l) => l.itemId));
    // Mindestens ein Drop je Küstenfauna ist Koch-Input (Fisch).
    expect(coastDrops.some((id) => cookable.has(id))).toBe(true);
  });
});
