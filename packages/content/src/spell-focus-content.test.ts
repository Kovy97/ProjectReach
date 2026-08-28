import { describe, expect, it } from "vitest";
import { content } from "./index";
import type { ItemDef } from "@hearthforge/shared";

/**
 * WÄCHTER Zauberfokus (Chef-GO 28.08.2026, bewusster Magier-Buff): jede Magie-HAUPTHAND mit
 * Schadensspanne trägt `spellFocus` > 0 (sonst „definiert, aber nie angewandt"), KEIN anderes Item
 * trägt das Feld (Foki/Orbs haben keine Spanne, Nahkampf/Fernkampf ignorieren es in der Engine —
 * ein Feld dort wäre ein toter Wert). Stäbe (2H) ≈ 20 % mehr Fokus als der Zauberstab derselben
 * Craft-Stufe; innerhalb einer Leiter steigt der Fokus mit der Stufe nie ab.
 * Tabelle/Herleitung: design/zauberfokus-2026-08-28.md.
 */

const items = Object.values(content.items);
const magicMainhand = items.filter((i) => i.weaponStyle === "magic" && i.slot === "mainhand");
const req = (i: ItemDef): number => Math.max(0, ...Object.values(i.requirements ?? {}).map((v) => v ?? 0));
const LADDER_PREFIX = /^(copper|bronze|iron|steel|blacksteel|mithril|adamantium|runite|bloodiron|titanium|aetherium|godiron)_/;

describe("Zauberfokus-Content", () => {
  it("es gibt Magie-Haupthandwaffen, und alle sind Range-Form (Spanne vorhanden)", () => {
    expect(magicMainhand.length).toBeGreaterThan(40);
    for (const w of magicMainhand) {
      expect(typeof w.damageMin, w.id).toBe("number");
      expect(typeof w.damageMax, w.id).toBe("number");
    }
  });

  it("jede Magie-Haupthand trägt spellFocus in (0, 0.01]", () => {
    for (const w of magicMainhand) {
      expect(w.spellFocus, `${w.id}: spellFocus fehlt`).toBeDefined();
      expect(w.spellFocus!, w.id).toBeGreaterThan(0);
      expect(w.spellFocus!, w.id).toBeLessThanOrEqual(0.01);
      expect(Number.isFinite(w.spellFocus!), w.id).toBe(true);
    }
  });

  it("kein Nicht-Magie-Item und kein Fokus/Orb (offhand) trägt spellFocus", () => {
    const offenders = items.filter(
      (i) => i.spellFocus !== undefined && !(i.weaponStyle === "magic" && i.slot === "mainhand"),
    );
    expect(offenders.map((i) => i.id)).toEqual([]);
  });

  it("Craft-Leiter: Stab (2H) trägt ≈ 20 % mehr Fokus als der Zauberstab (1H) derselben Stufe", () => {
    const staffs = magicMainhand.filter((i) => i.id.endsWith("_staff") && i.twoHanded && LADDER_PREFIX.test(i.id));
    let pairs = 0;
    for (const st of staffs) {
      const wand = content.items[st.id.replace(/_staff$/, "_wand")];
      if (!wand || wand.weaponStyle !== "magic") continue;
      pairs++;
      const ratio = (st.spellFocus ?? 0) / (wand.spellFocus ?? 1);
      expect(ratio, `${st.id} / ${wand.id}`).toBeGreaterThanOrEqual(1.15);
      expect(ratio, `${st.id} / ${wand.id}`).toBeLessThanOrEqual(1.3);
    }
    expect(pairs).toBe(12);
  });

  it("innerhalb der Craft-Leitern (X_staff / X_wand) fällt der Fokus mit steigender Stufe nie ab", () => {
    for (const suffix of ["_staff", "_wand"]) {
      const ladder = magicMainhand
        .filter((i) => i.id.endsWith(suffix) && LADDER_PREFIX.test(i.id))
        .sort((a, b) => req(a) - req(b));
      expect(ladder.length, suffix).toBe(12);
      for (let k = 1; k < ladder.length; k++) {
        const prev = ladder[k - 1]!;
        const cur = ladder[k]!;
        expect(cur.spellFocus!, `${prev.id} → ${cur.id}`).toBeGreaterThanOrEqual(prev.spellFocus!);
      }
    }
  });

  it("Einhand-Magiewaffen (Zauberstab/Zepter) liegen immer unter dem höchsten Stab-Fokus", () => {
    const staffMax = Math.max(...magicMainhand.filter((w) => w.twoHanded).map((w) => w.spellFocus ?? 0));
    for (const w of magicMainhand) {
      if (w.twoHanded) continue;
      expect(w.spellFocus!, w.id).toBeLessThan(staffMax);
    }
  });
});
