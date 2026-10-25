// claude:2026-10-24T19:57:00+02:00 — Regression Spieler-Bugreport 24.10.: jede Inventarzelle an ihrer echten Fachposition.
// claude:2026-10-25T18:03:00+01:00 — SAVE 98 (Chef-Report 25.10.2026): Variantenzellen stehen an ihrem GESPEICHERTEN Fach
// (`inventory.variantCells`), das Raster berechnet ihre Lage nicht mehr selbst. Die alte Berechnung prüft engine
// `legacyVariantCellLayout` (variant-cells.test.ts).
import { describe, expect, it } from "vitest";
import { inventarRaster } from "./inventoryLayout";

const raster = (belegt: number[], n: number): Array<string | null> =>
  Array.from({ length: n }, (_, i) => (belegt.includes(i) ? `item${i}` : null));
const faecher = (zuordnung: Record<string, number>) => (g: string): number | undefined => zuordnung[g];

describe("inventarRaster", () => {
  it("Variantenzellen stehen an ihrem gespeicherten Fach, Teile ganz hinten bleiben an ihrem Fach", () => {
    const slots = raster([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 18, 19], 20);
    const r = inventarRaster(slots, ["A", "B", "C"], faecher({ A: 15, B: 16, C: 17 }), 20 - 12 - 3);
    expect([...r.variantenImFach.entries()]).toEqual([[15, "A"], [16, "B"], [17, "C"]]);
    expect([...r.leereSichtbar]).toEqual([10, 11, 12, 13, 14]);
    expect(r.variantenFachlos).toEqual([]);
    for (const fach of r.variantenImFach.keys()) expect(slots[fach]).toBeNull();
  });

  it("Lage hängt NICHT vom letzten belegten Fach ab (Chef-Report 25.10.: Zelle sprang in die Lücke)", () => {
    // Vorher: Fach 9 belegt, Zellen auf 10/11. Fach 9 wird nach vorne gezogen: die Zellen bleiben auf 10/11.
    const vorher = inventarRaster(raster([0, 1, 2, 3, 4, 5, 8, 9], 20), ["A", "B"], faecher({ A: 10, B: 11 }), 10);
    const nachher = inventarRaster(raster([0, 1, 2, 3, 4, 5, 6, 8], 20), ["A", "B"], faecher({ A: 10, B: 11 }), 10);
    expect([...vorher.variantenImFach.keys()]).toEqual([10, 11]);
    expect([...nachher.variantenImFach.keys()]).toEqual([10, 11]);
    expect(nachher.leereSichtbar.has(9)).toBe(true);
  });

  it("ungültiges Fach (belegt, außerhalb, doppelt, keins): Gruppe steht fachlos hinten", () => {
    const slots = raster([0, 1], 6);
    const r = inventarRaster(slots, ["A", "B", "C", "D", "E"], faecher({ A: 1, B: 9, C: 3, D: 3 }), 0);
    expect([...r.variantenImFach.entries()]).toEqual([[3, "C"]]);
    expect(r.variantenFachlos).toEqual(["A", "B", "D", "E"]);
  });

  it("übervoll: keine Leerzellen", () => {
    const r = inventarRaster(raster([0, 1, 2, 3], 4), ["A", "B"], () => undefined, 0);
    expect(r.variantenImFach.size).toBe(0);
    expect(r.variantenFachlos).toEqual(["A", "B"]);
    expect(r.leereSichtbar.size).toBe(0);
  });

  it("Zellenzahl = Fächer (+ fachlose Varianten): keine Zelle verschiebt eine andere", () => {
    const slots = raster([2, 7, 11], 12);
    const r = inventarRaster(slots, ["A"], faecher({ A: 5 }), 12 - 3 - 1);
    const sichtbar = slots.filter((s, i) => s !== null || r.variantenImFach.has(i) || r.leereSichtbar.has(i)).length;
    expect(sichtbar + r.variantenFachlos.length).toBe(12);
  });
});
