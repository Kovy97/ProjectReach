// claude:2026-10-24T19:57:00+02:00 — Regression Spieler-Bugreport 24.10.: jede Inventarzelle an ihrer echten Fachposition.
import { describe, expect, it } from "vitest";
import { inventarRaster } from "./inventoryLayout";

const raster = (belegt: number[], n: number): Array<string | null> =>
  Array.from({ length: n }, (_, i) => (belegt.includes(i) ? `item${i}` : null));

describe("inventarRaster", () => {
  it("Teile ganz hinten bleiben an ihrem Fach, Varianten nehmen echte freie Fächer davor", () => {
    // Fall aus dem Repro: 0–9 belegt, 10–17 leer, 18/19 bewusst ans Ende gelegt, drei reine Varianten.
    const slots = raster([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 18, 19], 20);
    const r = inventarRaster(slots, ["A", "B", "C"], 20 - 12 - 3);
    expect([...r.variantenImFach.entries()]).toEqual([[15, "A"], [16, "B"], [17, "C"]]);
    expect([...r.leereSichtbar]).toEqual([10, 11, 12, 13, 14]);
    expect(r.variantenFachlos).toEqual([]);
    // Belegte Fächer werden nie von einer Variante überdeckt.
    for (const fach of r.variantenImFach.keys()) expect(slots[fach]).toBeNull();
  });

  it("Varianten stehen direkt hinter dem letzten belegten Fach (Chef-Regel 06.07.)", () => {
    const r = inventarRaster(raster([0, 1, 2, 3, 4], 20), ["A", "B"], 20 - 5 - 2);
    expect([...r.variantenImFach.keys()]).toEqual([5, 6]);
    expect(r.leereSichtbar.has(5)).toBe(false);
    expect(r.leereSichtbar.size).toBe(13);
  });

  it("übervoll: Gruppen ohne freies Fach stehen fachlos hinten, keine Leerzellen", () => {
    const r = inventarRaster(raster([0, 1, 2, 3], 4), ["A", "B"], 0);
    expect(r.variantenImFach.size).toBe(0);
    expect(r.variantenFachlos).toEqual(["A", "B"]);
    expect(r.leereSichtbar.size).toBe(0);
  });

  it("Zellenzahl = Fächer (+ fachlose Varianten): keine Zelle verschiebt eine andere", () => {
    const slots = raster([2, 7, 11], 12);
    const r = inventarRaster(slots, ["A"], 12 - 3 - 1);
    const sichtbar = slots.filter((s, i) => s !== null || r.variantenImFach.has(i) || r.leereSichtbar.has(i)).length;
    expect(sichtbar + r.variantenFachlos.length).toBe(12);
  });
});
