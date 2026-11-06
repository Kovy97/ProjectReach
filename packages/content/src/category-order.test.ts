// claude:2026-11-06T12:23:44+01:00 — Hotfix 1.4.2.2 (Spieler-Report „Duskweave sollte über Runewoven stehen“).
// Die Skill-Seite zeigt Kategorien in der Deklarationsreihenfolge von `content.categories`. Für echte Tier-Leitern
// (ein Material pro Stufe) muss diese Reihenfolge nach Level aufsteigen, sonst steht ein niedrigeres Tier hinter
// einem höheren. Thematische Gruppen mit ganzen Levelspannen (Pfeile, Köcher, Umhänge, Kochgruppen, Slayer-Ausrüstung …)
// sind bewusst nicht Teil dieser Prüfung.
import { describe, expect, it } from "vitest";
import { content } from "./index";

/** Skill → Prädikat „gehört zur Tier-Leiter“. */
const LADDERS: Record<string, (catId: string) => boolean> = {
  smithing: (id) => id !== "slayer_requirements",
  leatherworking: (id) => id.startsWith("leather_"),
  tailoring: (id) => id.startsWith("robe_"),
  bowcraft: (id) => id.startsWith("bow_") && id !== "bow_strings",
};

function ladder(skill: string, inLadder: (catId: string) => boolean): Array<{ id: string; min: number }> {
  const acts = Object.values(content.actions).filter((a) => a.skill === skill);
  return content.categories
    .filter((c) => inLadder(c.id))
    .map((c) => {
      const lv = acts.filter((a) => a.category === c.id).map((a) => a.levelRequired ?? 1);
      return lv.length ? { id: c.id, min: Math.min(...lv) } : null;
    })
    .filter((x): x is { id: string; min: number } => x !== null);
}

describe("Kategorie-Reihenfolge der Tier-Leitern", () => {
  for (const [skill, inLadder] of Object.entries(LADDERS)) {
    it(`${skill}: jedes Tier steht nach Level aufsteigend`, () => {
      const steps = ladder(skill, inLadder);
      expect(steps.length).toBeGreaterThan(3);
      const verdreht = steps.filter((s, i) => i > 0 && s.min < steps[i - 1]!.min).map((s, i) => `${s.id} (L${s.min})`);
      expect(verdreht, steps.map((s) => `${s.id} L${s.min}`).join(", ")).toEqual([]);
    });
  }

  it("Dämmergewebe (L63) steht vor Runenwirk (L71)", () => {
    const ids = content.categories.map((c) => c.id);
    expect(ids.indexOf("robe_duskweave")).toBeLessThan(ids.indexOf("robe_runewoven"));
  });
});
