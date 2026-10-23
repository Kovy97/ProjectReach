import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { itemTier } from "./tiers";

/**
 * QA 1.4.0 Welle 1 „Klarheit“ ST (Kontrolleur, claude:2026-10-25T23:30:00+02:00).
 * Sterne für Materialien: Leitern monoton, keine Stufe 0, Materialien ohne Weg in Ausrüstung ohne Stufe.
 */
const mats = Object.values(content.items).filter((i) => i.type === "material");

function ladder(ids: string[]): (number | null)[] {
  return ids.map((id) => (content.items[id] ? itemTier(content, id) : null));
}

describe("QA ST: Stufen der Materialien", () => {
  it("jede vergebene Material-Stufe liegt in 1..13", () => {
    for (const m of mats) {
      const t = itemTier(content, m.id);
      if (t === null) continue;
      expect(t, m.id).toBeGreaterThanOrEqual(1);
      expect(t, m.id).toBeLessThanOrEqual(13);
    }
  });

  it("Erz-Leiter ist monoton und deckt sich mit der Barren-Leiter", () => {
    const ores = ["copper_ore", "tin_ore", "iron_ore", "gravesteel_ore", "mithril_ore", "adamantite_ore", "runite_ore", "bloodiron_ore", "titanium_ore", "aetherite_ore", "godiron_ore"];
    const t = ladder(ores);
    for (let i = 1; i < t.length; i++) expect(t[i]!, ores[i]).toBeGreaterThanOrEqual(t[i - 1]!);
    expect(t[0]).toBe(1);
    expect(t[t.length - 1]).toBe(12);
  });

  it("Holz-Leiter (Bögen) ist monoton", () => {
    const logs = ["normal_log", "oak_log", "ashbark_log", "blackwood_log", "ironbark_log", "bloodoak_log", "shadowpine_log", "bonewood_log", "godwood_log"];
    const t = ladder(logs);
    expect(t.every((x) => x !== null), JSON.stringify(Object.fromEntries(logs.map((l, i) => [l, t[i]])))).toBe(true);
    for (let i = 1; i < t.length; i++) expect(t[i]!, `${logs[i]} (${JSON.stringify(t)})`).toBeGreaterThanOrEqual(t[i - 1]!);
  });

  it("Leder-Leiter ist monoton (Reihenfolge der Rezeptkette: gegerbt → gehärtet → Schuppen → genietet → Kriegshaut → Drachen → Schatten)", () => {
    const leather = ["raw_hide", "cured_leather", "hardened_leather", "scaled_leather", "studded_leather", "warhide", "dragonhide", "shadowhide"];
    const t = ladder(leather);
    expect(t.every((x) => x !== null), JSON.stringify(t)).toBe(true);
    for (let i = 1; i < t.length; i++) expect(t[i]!, `${leather[i]} (${JSON.stringify(t)})`).toBeGreaterThanOrEqual(t[i - 1]!);
  });

  it("Stoff-Leiter (Fasern und Stoff) ist monoton", () => {
    for (const ids of [
      ["fiber_nettle", "fiber_flax", "fiber_thornhemp", "fiber_ghostsilk", "fiber_starflax"],
      ["cloth_nettle", "cloth_linen", "cloth_thornlinen", "cloth_ghostweave", "cloth_starweave"],
    ]) {
      const t = ladder(ids);
      expect(t.every((x) => x !== null), JSON.stringify(t)).toBe(true);
      for (let i = 1; i < t.length; i++) expect(t[i]!, `${ids[i]} (${JSON.stringify(t)})`).toBeGreaterThanOrEqual(t[i - 1]!);
    }
  });

  it("Fisch und Saatgut haben keine Stufe, Federn eine", () => {
    expect(itemTier(content, "raw_trout")).toBeNull();
    expect(itemTier(content, "flax_seed")).toBeNull();
    expect(itemTier(content, "feather")).toBe(1);
  });

  it("BEFUND: Pfeile tragen `ArrowDef.tier` (I–XII), aber itemTier liest es nicht (keine Sterne, Stufen-Sortierung = 0)", () => {
    // Erwartung: die Stufe des Pfeils ist seine Pfeilstufe. Heute: null für alle 37 Pfeile/Spitzen/Schäfte (Regal „Pfeile“).
    const arrows = Object.values(content.items).filter((i) => i.arrow);
    expect(arrows.length).toBeGreaterThan(20);
    const missing = arrows.filter((i) => itemTier(content, i.id) !== i.arrow!.tier).map((i) => i.id);
    expect(missing).toEqual([]);
  });

  // claude:2026-10-26T03:10:00+02:00 — Befund P3 behoben: Rezepte ohne Stufen-Ausgabe stimmen für „keine Stufe“; Trank-Kräuter bleiben ohne Sterne.
  it("Trank-Kräuter erben keine Stufe über ein einzelnes Ausrüstungsrezept (Pestmaske)", () => {
    expect(itemTier(content, "herb_marshroot")).toBeNull();
    expect(itemTier(content, "herb_gravemoss")).toBeNull();
    expect(itemTier(content, "copper_ore")).toBe(1); // Erzleiter unverändert
  });

  it("Übersicht: Material-Stufen je Regal (nur Ausgabe, zur Sichtprüfung)", () => {
    const byShelf = new Map<string, string[]>();
    for (const m of mats) {
      const t = itemTier(content, m.id);
      const k = m.shelf ?? "(kein Regal)";
      const arr = byShelf.get(k) ?? [];
      arr.push(`${m.id}:${t ?? "-"}`);
      byShelf.set(k, arr);
    }
    const lines: string[] = [];
    for (const [k, arr] of byShelf) lines.push(`${k}: ${arr.join(" ")}`);
    console.log(lines.join("\n"));
    expect(lines.length).toBeGreaterThan(0);
  });
});
