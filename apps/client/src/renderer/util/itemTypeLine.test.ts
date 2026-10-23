import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { WEAPON_TYPE_SPECIALTY } from "@hearthforge/shared";
import { buildItemTypeLine } from "./itemTypeLine";

/**
 * 1.4.0 ZH (Chef 23.10.2026; claude:2026-10-23T17:30:00+02:00): Die Kopfzeile der Itemkarte nennt die Hand
 * aus dem Feld `twoHanded`, für JEDE Haupthand-Waffe. Vorher fehlte sie bei allen 66 Bögen, und Speer/
 * Streitkolben behaupteten im Spezialitätstext das Gegenteil des Feldes.
 */
const t = (k: string): string => k;
const tr = (v: { en: string }): string => v.en;

describe("Zweihand-Kopfzeile", () => {
  const weapons = Object.values(content.items).filter((i) => i.weaponType && i.slot === "mainhand");

  it("jede Zweihandwaffe trägt „Zweihändig“, jede Einhandwaffe „Einhändig“ in der Kopfzeile", () => {
    expect(weapons.filter((w) => w.twoHanded).length).toBeGreaterThanOrEqual(160);
    for (const w of weapons) {
      const line = buildItemTypeLine(w, t, tr as never);
      expect(line.startsWith(w.twoHanded ? "itip.twoHandedPrefix" : "itip.oneHandedPrefix"), w.id).toBe(true);
    }
  });

  it("kein Spezialitätstext behauptet eine Hand-Angabe mehr", () => {
    for (const v of Object.values(WEAPON_TYPE_SPECIALTY)) {
      const o = v as Record<string, string>;
      expect(o.en).not.toMatch(/handed/i);
      expect(o.de ?? "").not.toMatch(/händig/i);
    }
  });
});
