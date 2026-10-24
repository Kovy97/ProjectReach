import { describe, expect, it } from "vitest";
import { content } from "./index";

/**
 * QA-Runde 2, 1.4.0 — Stoff-Roben (Rüstungs-Trinität: Stoff = Ward): Stufen vollständig (5 Teile je Familie),
 * Ward je Slot steigt entlang der vollständigen Linien mit der Anforderung, Sets kennen alle Teile, Raid-Stoff
 * Normal/Heroisch zählt über `variantOf` zum selben Set.
 * claude:2026-10-24T12:00:00+02:00 — Reine Prüfdatei, ändert keinen Produktcode.
 */

const ARMOR_SLOTS = ["helmet", "body", "legs", "gloves", "boots"] as const;
type ArmorSlot = (typeof ARMOR_SLOTS)[number];

const cloth = Object.values(content.items).filter(
  (i) => i.type === "equipment" && (i.wardCapacity ?? 0) > 0 && ARMOR_SLOTS.includes(i.slot as ArmorSlot),
);

/** Familie = Set-Zugehörigkeit (Set-Id), sonst Id ohne Slot-Suffix. */
const setOfPiece = new Map<string, string>();
for (const set of content.sets) for (const p of set.pieces) setOfPiece.set(p, set.id);
function familyOf(id: string): string {
  const base = content.items[id]?.variantOf ?? id;
  const viaSet = setOfPiece.get(base);
  if (viaSet) return viaSet + (base !== id ? "_heroic" : "");
  const parts = id.split("_");
  return parts.slice(0, -1).join("_");
}

const families = new Map<string, typeof cloth>();
for (const i of cloth) {
  const f = familyOf(i.id);
  if (!families.has(f)) families.set(f, []);
  families.get(f)!.push(i);
}
const complete = [...families.entries()].filter(([, items]) => new Set(items.map((i) => i.slot)).size === 5);

describe("QA2 Stoff: Roben-Katalog", () => {
  it("Stoff-Linien: mindestens sechs vollständige Familien (5 Slots), jede Set-Familie vollständig", () => {
    expect(cloth.length).toBeGreaterThanOrEqual(25);
    expect(complete.length, `vollständig: ${complete.map(([f]) => f).join(", ")}`).toBeGreaterThanOrEqual(6);
    for (const set of content.sets) {
      const pieces = set.pieces.map((p) => content.items[p]).filter((p) => p && (p.wardCapacity ?? 0) > 0);
      if (pieces.length === 0) continue;
      for (const p of set.pieces) expect(content.items[p], `${set.id}: Teil ${p} fehlt`).toBeTruthy();
      const slots = new Set(set.pieces.map((p) => content.items[p]!.slot));
      expect(slots.size, `${set.id}: Slots ${[...slots].join(",")}`).toBe(Math.min(5, set.pieces.length));
    }
  });

  it("Vollständige Linien: Ward je Slot steigt mit der Magie-Anforderung (Chase-Einzelstücke ausgenommen)", () => {
    const violations: string[] = [];
    for (const slot of ARMOR_SLOTS) {
      const rows = complete
        .map(([f, items]) => ({ f, item: items.find((i) => i.slot === slot)! }))
        .map((r) => ({ f: r.f, id: r.item.id, req: r.item.requirements?.magic ?? 0, ward: r.item.wardCapacity! }))
        .sort((a, b) => a.req - b.req || a.ward - b.ward);
      for (let k = 1; k < rows.length; k++) {
        const lo = rows[k - 1]!;
        const hi = rows[k]!;
        if (hi.req > lo.req && hi.ward < lo.ward) violations.push(`${slot}: ${hi.id} (M${hi.req}, ${hi.ward}) < ${lo.id} (M${lo.req}, ${lo.ward})`);
      }
    }
    expect(violations, violations.join("\n")).toEqual([]);
  });

  it("Stoffteile sind reiner Stoff: keine Rüstungs-/Ausweichwerte auf Ward-Teilen (Trinität)", () => {
    const mixed = cloth.filter((i) => (i.armorRating ?? 0) > 0 || (i.evasionRating ?? 0) > 0).map((i) => i.id);
    expect(mixed, mixed.join(", ")).toEqual([]);
  });

  it("Raid-Stoff: Heroisch-Teile verweisen per variantOf auf das Normal-Teil, alle fünf Slots im Set gk_fire", () => {
    const set = content.sets.find((s) => s.id === "gk_fire");
    expect(set).toBeTruthy();
    expect(new Set(set!.pieces.map((p) => content.items[p]!.slot)).size).toBe(5);
    for (const part of ["head", "chest", "legs", "hands", "feet"]) {
      const n = `gk_fire_${part}`;
      const h = `${n}_heroic`;
      expect(set!.pieces).toContain(n);
      expect(content.items[h], h).toBeTruthy();
      expect(content.items[h]!.variantOf, `${h}.variantOf`).toBe(n);
      expect(content.items[h]!.wardCapacity!).toBeGreaterThan(content.items[n]!.wardCapacity!);
      expect(content.items[n]!.requirements?.magic).toBe(99);
      expect(content.items[h]!.requirements?.magic).toBe(99);
    }
  });

  it("Übersicht (nur Ausgabe): Stoff-Familien mit Anforderung und Ward je Slot", () => {
    const lines = [...families.entries()]
      .sort((a, b) => (a[1][0]!.requirements?.magic ?? 0) - (b[1][0]!.requirements?.magic ?? 0) || a[0].localeCompare(b[0]))
      .map(([f, items]) => {
        const bySlot = new Map(items.map((i) => [i.slot, `${i.wardCapacity} (M${i.requirements?.magic ?? 0})`]));
        return `${f.padEnd(26)} ${ARMOR_SLOTS.map((s) => (bySlot.get(s) ?? "–").padEnd(14)).join(" ")}`;
      });
    console.log(["Familie".padEnd(26) + " " + ARMOR_SLOTS.map((s) => s.padEnd(14)).join(" "), ...lines].join("\n"));
    expect(lines.length).toBeGreaterThan(0);
  });
});
