import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { itemTier, tierForLevel } from "./tiers";
import { storageShelfOf } from "./storage";

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

  // claude:2026-10-24T16:03:31+02:00 — Kettenkappe (CEO-Korrektur QA-Runde 2 Klarheit B3): ein Material steht nie über einem Material, zu dem es direkt
  // verarbeitet wird (Kräuter, Essenzen und Zauberrunen ausgenommen). Erz ≤ Barren, Kohle ≤ Stahlbarren.
  it("Kettenkappe: kein Material steht über einem Material, zu dem es direkt verarbeitet wird", () => {
    const viol: string[] = [];
    for (const a of Object.values(content.actions)) {
      for (const inp of a.inputs ?? []) {
        const item = content.items[inp.itemId];
        const ti = itemTier(content, inp.itemId);
        if (item?.type !== "material" || ti === null || typeof item.tier === "number") continue;
        const shelf = storageShelfOf(content, inp.itemId);
        if (shelf === "herbs" || shelf === "essences") continue; // Kräuter-/Essenzen-Ausnahme
        for (const l of a.loot) {
          const to = itemTier(content, l.itemId);
          if (content.items[l.itemId]?.type === "material" && to !== null && ti > to) viol.push(`${inp.itemId} ${ti} > ${l.itemId} ${to}`);
        }
      }
    }
    expect(viol).toEqual([]);
    expect(itemTier(content, "iron_ore")).toBe(itemTier(content, "iron_bar"));
    expect(itemTier(content, "coal")).toBe(itemTier(content, "steel_bar"));
  });

  // claude:2026-10-24T16:33:21+02:00 — CEO-Entscheid QA-Runde 2: Umhänge mit Stufe aus der Herstellungs-Anforderung (B4) tragen diese nur selbst; bei den
  // Material-Stimmen zählen sie wie vor B4 mit Stufe I und kippen keine Material-Mehrheit.
  it("B4-Umhänge tragen ihre Rezept-Stufe, kippen aber keine Material-Stufe (Nessel, Dämmer-Essenz, Hauptbuchseite bleiben I)", () => {
    expect(itemTier(content, "hardened_warcape")).toBe(6);
    expect(itemTier(content, "arcane_cape")).toBe(3);
    for (const id of ["cloth_nettle", "fiber_nettle", "dim_essence", "ledger_page"]) expect(itemTier(content, id), id).toBe(1);
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
