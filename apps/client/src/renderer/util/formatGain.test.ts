// claude:2026-10-25T10:42:00+01:00 — 1.4.1 B2 (Spieler-Report „massive floating point“ beim Fechten): die „+XP“-
// Einblendung der Skill-Karten zeigte rohe Floats aus XP-Multiplikatoren. formatGain rundet unter 10 auf eine
// Nachkommastelle, sonst ganzzahlig, im Zahlenformat der Spielsprache.
import { afterEach, describe, expect, it } from "vitest";
import { formatGain, setFormatLocale } from "./format";

describe("formatGain (1.4.1 B2)", () => {
  afterEach(() => setFormatLocale("en-US"));

  it("kein Float-Krümel mehr: unter 10 eine Nachkommastelle, ab 10 ganzzahlig", () => {
    setFormatLocale("en-US");
    expect(formatGain(8.400000000000091)).toBe("8.4");
    expect(formatGain(4)).toBe("4");
    expect(formatGain(0.35)).toBe("0.4");
    expect(formatGain(12.6000000001)).toBe("13");
    expect(formatGain(1234.5)).toBe("1,235");
  });

  it("Trennzeichen folgt der Spielsprache", () => {
    setFormatLocale("de-DE");
    expect(formatGain(8.400000000000091)).toBe("8,4");
    expect(formatGain(1234.5)).toBe("1.235");
  });
});
