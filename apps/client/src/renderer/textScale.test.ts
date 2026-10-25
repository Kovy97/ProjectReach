// claude:2026-10-25T10:33:00+01:00 — 1.4.1 K4: Textgröße als Prozent-Regler. Belegt Raster/Klemmung, die
// Migration der alten Stufen (normal/large/xlarge) und die abgeleitete data-text-scale-Stufe. Reine Funktionen,
// kein DOM nötig (Muster util/queueTiming.test.ts).
import { describe, expect, it } from "vitest";
import {
  DEFAULT_TEXT_SCALE,
  TEXT_SCALE_MAX,
  TEXT_SCALE_MIN,
  TEXT_SCALE_PRESETS,
  TEXT_SCALE_STEP,
  normalizeTextScale,
  parseStoredTextScale,
  textScaleTier,
} from "./textScale";

describe("textScale (1.4.1 K4)", () => {
  it("alte Stufen aus 1.4.0 werden übersetzt, niemand verliert seine Einstellung", () => {
    expect(parseStoredTextScale("normal")).toBe(100);
    expect(parseStoredTextScale("large")).toBe(110);
    expect(parseStoredTextScale("xlarge")).toBe(125);
  });

  it("Zahlen werden gelesen, geklemmt und aufs 5er-Raster gerundet; Unsinn ergibt 100", () => {
    expect(parseStoredTextScale("115")).toBe(115);
    expect(parseStoredTextScale("112")).toBe(110);
    expect(parseStoredTextScale("50")).toBe(TEXT_SCALE_MIN);
    expect(parseStoredTextScale("999")).toBe(TEXT_SCALE_MAX);
    expect(parseStoredTextScale(null)).toBe(DEFAULT_TEXT_SCALE);
    expect(parseStoredTextScale("")).toBe(DEFAULT_TEXT_SCALE);
    expect(parseStoredTextScale("riesig")).toBe(DEFAULT_TEXT_SCALE);
    expect(normalizeTextScale(Number.NaN)).toBe(DEFAULT_TEXT_SCALE);
  });

  it("Schnellwahl-Werte liegen im Raster des Reglers (sonst leuchtet der Knopf nie)", () => {
    for (const p of TEXT_SCALE_PRESETS) {
      expect(p.pct).toBeGreaterThanOrEqual(TEXT_SCALE_MIN);
      expect(p.pct).toBeLessThanOrEqual(TEXT_SCALE_MAX);
      expect(p.pct % TEXT_SCALE_STEP).toBe(0);
      expect(normalizeTextScale(p.pct)).toBe(p.pct);
    }
  });

  it("data-text-scale bleibt als abgeleitete Stufe für die CSS-Layoutregeln", () => {
    expect(textScaleTier(90)).toBeNull();
    expect(textScaleTier(105)).toBeNull();
    expect(textScaleTier(110)).toBe("large");
    expect(textScaleTier(115)).toBe("large");
    expect(textScaleTier(120)).toBe("xlarge");
    expect(textScaleTier(140)).toBe("xlarge");
  });
});
