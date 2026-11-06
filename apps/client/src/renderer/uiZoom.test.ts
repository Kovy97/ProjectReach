// claude:2026-11-06T11:52:01+01:00 — Hotfix 1.4.2.2: Interface-Größe. Belegt Klemmung (nur verkleinern, nie über 100 %),
// Raster, Rückfall auf 100 und dass die Brücke den Faktor bekommt bzw. ohne Brücke nichts passiert.
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_UI_ZOOM,
  UI_ZOOM_MAX,
  UI_ZOOM_MIN,
  UI_ZOOM_PRESETS,
  normalizeUiZoom,
  parseStoredUiZoom,
  wendeUiZoomAn,
} from "./uiZoom";

describe("uiZoom (Hotfix 1.4.2.2)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("liest, klemmt auf 70–100 und rundet auf 5er; Unsinn ergibt 100", () => {
    expect(parseStoredUiZoom("80")).toBe(80);
    expect(parseStoredUiZoom("82")).toBe(80);
    expect(parseStoredUiZoom("10")).toBe(UI_ZOOM_MIN);
    expect(parseStoredUiZoom("150")).toBe(UI_ZOOM_MAX);
    expect(parseStoredUiZoom(null)).toBe(DEFAULT_UI_ZOOM);
    expect(parseStoredUiZoom("")).toBe(DEFAULT_UI_ZOOM);
    expect(parseStoredUiZoom("klein")).toBe(DEFAULT_UI_ZOOM);
    expect(normalizeUiZoom(Number.NaN)).toBe(DEFAULT_UI_ZOOM);
  });

  it("Schnellwahl liegt im erlaubten Bereich und enthält 100 % als Vorgabe", () => {
    for (const p of UI_ZOOM_PRESETS) expect(normalizeUiZoom(p)).toBe(p);
    expect(UI_ZOOM_PRESETS).toContain(DEFAULT_UI_ZOOM);
    expect(Math.max(...UI_ZOOM_PRESETS)).toBe(UI_ZOOM_MAX);
  });

  it("gibt den Faktor an die Brücke weiter, nie über 1", () => {
    const setZoom = vi.fn();
    vi.stubGlobal("window", { hearthforge: { ui: { setZoom } } });
    wendeUiZoomAn(80);
    wendeUiZoomAn(250);
    expect(setZoom.mock.calls).toEqual([[0.8], [1]]);
  });

  it("ohne Brücke (Browser) passiert nichts und nichts wirft", () => {
    vi.stubGlobal("window", {});
    expect(() => wendeUiZoomAn(70)).not.toThrow();
  });
});
