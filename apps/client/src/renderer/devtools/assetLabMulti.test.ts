// claude:2026-10-31T12:30:17+01:00 — Asset-Werkstatt Mehrfachauswahl: Anzeigewert „gemischt“ (reine Funktion, kein DOM).
import { describe, expect, it } from "vitest";
import { mergeCur } from "./assetLabCore";
import type { Ov } from "./assetLabCore";

const mk = (id: string, p: Partial<Ov>): Ov => ({ scope: "el", selector: `[x="${id}"]`, labId: id, label: id, ...p });

describe("mergeCur", () => {
  it("behält gleiche Werte und meldet abweichende als gemischt", () => {
    const { cur, mixed } = mergeCur([mk("a", { bg: "x.png", slice: 10 }), mk("b", { bg: "x.png", slice: 12 })]);
    expect(cur.bg).toBe("x.png");
    expect(cur.slice).toBeUndefined();
    expect(mixed).toEqual(["slice"]);
  });
  it("behandelt fehlende Overrides als abweichend und mischt lay je Eigenschaft", () => {
    const { cur, mixed } = mergeCur([mk("a", { border: "f.png", lay: { width: "10px", gap: "2px" } }), undefined]);
    expect(cur.border).toBeUndefined();
    expect(mixed).toContain("border");
    expect(mixed).toContain("width");
    expect(cur.lay).toBeUndefined();
    const same = mergeCur([mk("a", { lay: { width: "10px" } }), mk("b", { lay: { width: "10px" } })]);
    expect(same.cur.lay).toEqual({ width: "10px" });
    expect(same.mixed).toEqual([]);
  });
});
