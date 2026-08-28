import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  anchorToStagePoint,
  containedImageRect,
  DEFAULT_PORTRAIT_ANCHOR,
  getPortraitAnchor,
  parseObjectPosition,
  PORTRAIT_ANCHORS,
} from "./portraitAnchors";

/** Alle Portrait-IDs aus dem Asset-Ordner (Dateiname ohne Endung, wie portraits.ts sie ableitet). */
function portraitIdsOnDisk(): string[] {
  const dir = fileURLToPath(new URL("./assets/portraits/", import.meta.url));
  return readdirSync(dir)
    .filter((f) => /\.(png|webp)$/.test(f))
    .map((f) => f.replace(/\.(png|webp)$/, ""));
}

describe("portraitAnchors (Chef-Auftrag 28.08.2026: Magie-Ankerpunkt je Charakterbild)", () => {
  it("jede Portrait-Datei hat einen Eintrag — und keinen verwaisten", () => {
    const ids = portraitIdsOnDisk();
    expect(ids.length).toBeGreaterThan(0);
    const missing = ids.filter((id) => !(id in PORTRAIT_ANCHORS));
    expect(missing, `ohne Anker: ${missing.join(", ")}`).toEqual([]);
    const stale = Object.keys(PORTRAIT_ANCHORS).filter((id) => !ids.includes(id));
    expect(stale, `Anker ohne Datei: ${stale.join(", ")}`).toEqual([]);
  });

  it("alle Werte liegen in 0..1, facing ist left|right", () => {
    for (const [id, a] of Object.entries(PORTRAIT_ANCHORS)) {
      for (const key of ["magic", "hand"] as const) {
        const p = a[key];
        expect(p.x, `${id}.${key}.x`).toBeGreaterThanOrEqual(0);
        expect(p.x, `${id}.${key}.x`).toBeLessThanOrEqual(1);
        expect(p.y, `${id}.${key}.y`).toBeGreaterThanOrEqual(0);
        expect(p.y, `${id}.${key}.y`).toBeLessThanOrEqual(1);
      }
      expect(["left", "right"]).toContain(a.facing);
      expect(typeof a.staff).toBe("boolean");
    }
  });

  it("Stab-Portraits haben ihren Magie-Anker oben (Stabspitze), nie unterhalb der Hand", () => {
    for (const [id, a] of Object.entries(PORTRAIT_ANCHORS)) {
      if (!a.staff) continue;
      expect(a.magic.y, `${id}: Stabspitze unter der Hand?`).toBeLessThanOrEqual(a.hand.y);
    }
  });

  it("getPortraitAnchor: bekannte ID, unbekannte ID/Data-URL/null → Rückfall", () => {
    expect(getPortraitAnchor("mage_f")).toBe(PORTRAIT_ANCHORS["mage_f"]);
    expect(getPortraitAnchor("mage_f").staff).toBe(true);
    expect(getPortraitAnchor("gibt_es_nicht")).toBe(DEFAULT_PORTRAIT_ANCHOR);
    expect(getPortraitAnchor("data:image/webp;base64,AAAA")).toBe(DEFAULT_PORTRAIT_ANCHOR);
    expect(getPortraitAnchor(null)).toBe(DEFAULT_PORTRAIT_ANCHOR);
    expect(getPortraitAnchor(undefined)).toBe(DEFAULT_PORTRAIT_ANCHOR);
  });

  it("containedImageRect: Hochkant-Portrait wird passend begrenzt und per object-position gesetzt", () => {
    // 1086×1448 (3:4) in einer Box 600×400 → Höhe limitiert: h=400, w=300, x mittig, y bündig
    const r = containedImageRect({ x: 100, y: 50, w: 600, h: 400 }, 1086, 1448);
    expect(r.h).toBeCloseTo(400, 6);
    expect(r.w).toBeCloseTo(300, 6);
    expect(r.x).toBeCloseTo(250, 6);
    expect(r.y).toBeCloseTo(50, 6);
    // schmale Box → breitenbegrenzt, Bild sitzt unten (object-position bottom)
    const r2 = containedImageRect({ x: 0, y: 0, w: 300, h: 1000 }, 1086, 1448);
    expect(r2.w).toBeCloseTo(300, 6);
    expect(r2.h).toBeCloseTo(400, 6);
    expect(r2.y).toBeCloseTo(600, 6);
    // object-position top left
    const r3 = containedImageRect({ x: 0, y: 0, w: 300, h: 1000 }, 1086, 1448, 0, 0);
    expect(r3.y).toBeCloseTo(0, 6);
  });

  it("anchorToStagePoint: Anteile → Punkt, Spiegelung klappt x", () => {
    const drawn = { x: 10, y: 20, w: 200, h: 400 };
    expect(anchorToStagePoint({ x: 0.25, y: 0.1 }, drawn)).toEqual({ x: 60, y: 60 });
    expect(anchorToStagePoint({ x: 0.25, y: 0.1 }, drawn, true)).toEqual({ x: 160, y: 60 });
  });

  it("parseObjectPosition: Prozent, Schlüsselwörter, Rückfall bottom center", () => {
    expect(parseObjectPosition("50% 100%")).toEqual({ x: 0.5, y: 1 });
    expect(parseObjectPosition("center bottom")).toEqual({ x: 0.5, y: 1 });
    expect(parseObjectPosition("left top")).toEqual({ x: 0, y: 0 });
    expect(parseObjectPosition("10px 20px")).toEqual({ x: 0.5, y: 1 });
    expect(parseObjectPosition(null)).toEqual({ x: 0.5, y: 1 });
  });
});
