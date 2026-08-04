import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";

describe("zone data integrity", () => {
  const zoneIds = new Set(content.zones.map((z) => z.id));

  it("jeder Gegner verweist auf eine existierende Zone", () => {
    for (const m of Object.values(content.monsters)) {
      expect(m.zone, `Monster ${m.id} ohne Zone`).toBeTruthy();
      expect(zoneIds.has(m.zone!), `Monster ${m.id} → unbekannte Zone ${m.zone}`).toBe(true);
    }
  });

  it("jede Zone enthält mindestens einen Gegner", () => {
    for (const z of content.zones) {
      const count = Object.values(content.monsters).filter((m) => m.zone === z.id).length;
      expect(count, `Zone ${z.id} ist leer`).toBeGreaterThan(0);
    }
  });
});
