import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { itemTier, tierForLevel } from "./tiers";

// claude:2026-10-23T18:00:00+02:00 — Stufen-Anzeige (1.4.0 ST).
const METALS = ["copper", "bronze", "iron", "steel", "blacksteel", "mithril", "adamantium", "runite", "bloodiron", "titanium", "aetherium", "godiron"];

describe("Stufen I–XII", () => {
  it("Bänder entsprechen der Metallleiter", () => {
    expect([1, 4, 5, 9, 10, 19, 20, 30, 40, 50, 60, 70, 80, 89, 90, 98, 99].map(tierForLevel)).toEqual([1, 1, 2, 2, 3, 3, 4, 5, 6, 7, 8, 9, 10, 10, 11, 11, 12]);
  });

  it("Metall-Schwerter und -Bögen steigen Stufe für Stufe von I bis XII", () => {
    for (const kind of ["sword", "longbow"]) {
      const tiers = METALS.map((m) => itemTier(content, `${m}_${kind}`));
      expect(tiers, kind).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    }
  });

  it("Materialien erben die Stufe ihres niedrigsten Ausrüstungsteils, monoton entlang der Barren-Leiter", () => {
    const bars = METALS.map((m) => itemTier(content, `${m}_bar`));
    expect(bars.every((t) => t !== null)).toBe(true);
    for (let i = 1; i < bars.length; i++) expect(bars[i]!, METALS[i]).toBeGreaterThanOrEqual(bars[i - 1]!);
    expect(bars[0]).toBe(1);
    expect(bars[11]).toBe(12);
  });

  it("Verbrauchsgüter haben keine Stufe", () => {
    expect(itemTier(content, "cooked_trout")).toBeNull();
  });

  it("jedes Ausrüstungsteil hat eine Stufe 1–12", () => {
    for (const item of Object.values(content.items)) {
      if (item.type !== "equipment") continue;
      const t = itemTier(content, item.id);
      expect(t, item.id).not.toBeNull();
      expect(t!).toBeGreaterThanOrEqual(1);
      expect(t!).toBeLessThanOrEqual(13);
    }
  });

  it("Ausrüstung ohne Anforderung erbt die Stufe ihrer niedrigsten Drop-Quelle (Werkstatt-Spec §1.2)", () => {
    expect(itemTier(content, "field_cape")).toBe(3);
    expect(itemTier(content, "warbanner_cape")).toBe(5);
    expect(itemTier(content, "eye_of_the_idol")).toBe(12);
    expect(itemTier(content, "abyssal_signet")).toBe(11);
  });
});
