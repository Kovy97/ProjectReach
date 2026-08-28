import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { ContentDB, ItemDef } from "@hearthforge/shared";
import { computeStats, spellFocusMult } from "./character";
import { createGame } from "./state";
import { buildBisCharacter } from "./balance-envelope-helpers";

/**
 * Zauberfokus (Chef-GO 28.08.2026, bewusster Magier-Buff): Magiewaffen werden durch Intelligenz
 * stärker — die WAFFENspanne (damageMin/damageMax) der Haupthand wird bei aktivem Stil "magic" mit
 * `1 + spellFocus · int` multipliziert (min UND max), der Charakter-Anteil bleibt unberührt.
 *  §1 spellFocusMult — die eine Rechnung für Engine und Tooltip.
 *  §2 computeStats — Spanne ×(1 + focus·int); Nahkampf/Fernkampf unberührt; 0/undefined = keine Änderung.
 *  §3 Zielkurve — mit dem besten legalen Kit OHNE Runen/Suffixe/Tränke (der „realistische" INT einer
 *     Stufe, s. design/zauberfokus-2026-08-28.md) liegt der Spannen-Bonus bei +15/22/30 % (±3 Pp) auf
 *     CL 30/60/90. Reißt dieser Pin, wurde eine Magiewaffe/ein Stoff-Kit umgebaut → neu messen.
 */

function withItems(c: ContentDB, items: ItemDef[]): ContentDB {
  const map = { ...c.items };
  for (const it of items) map[it.id] = it;
  return { ...c, items: map };
}
function weapon(id: string, fields: Partial<ItemDef>): ItemDef {
  return {
    id,
    name: { en: id, de: id },
    type: "equipment",
    stackable: false,
    slot: "mainhand",
    weaponStyle: "magic",
    weaponType: "staff",
    twoHanded: true,
    damageMin: 10,
    damageMax: 16,
    attackIntervalMs: 3000,
    ...fields,
  } as ItemDef;
}
/** Held mit bekanntem INT (Basis-Attribute) und leerem Kit außer der Waffe. */
function hero(c: ContentDB, weaponId: string, int: number) {
  const s = createGame({ name: "Z", baseAttributes: { int } }, c, 7);
  for (const slot of Object.keys(s.character.equipment) as Array<keyof typeof s.character.equipment>) {
    s.character.equipment[slot] = null;
  }
  s.character.equipment.mainhand = weaponId;
  s.character.equippedInstances = {};
  s.character.buffs = [];
  return s;
}

describe("Zauberfokus §1: spellFocusMult", () => {
  it("liefert 1 + focus·int für Magiewaffen mit spellFocus > 0 (0.008 · 42 ⇒ ×1.336)", () => {
    expect(spellFocusMult({ weaponStyle: "magic", spellFocus: 0.008 }, 42)).toBeCloseTo(1.336, 9);
  });
  it("liefert 1 ohne Waffe, ohne Feld, bei 0, bei Nicht-Magie-Stil und bei ungültigen Werten", () => {
    expect(spellFocusMult(undefined, 42)).toBe(1);
    expect(spellFocusMult(null, 42)).toBe(1);
    expect(spellFocusMult({ weaponStyle: "magic" }, 42)).toBe(1);
    expect(spellFocusMult({ weaponStyle: "magic", spellFocus: 0 }, 42)).toBe(1);
    expect(spellFocusMult({ weaponStyle: "magic", spellFocus: -0.01 }, 42)).toBe(1);
    expect(spellFocusMult({ weaponStyle: "magic", spellFocus: Number.NaN }, 42)).toBe(1);
    expect(spellFocusMult({ weaponStyle: "melee", spellFocus: 0.008 }, 42)).toBe(1);
    expect(spellFocusMult({ weaponStyle: "ranged", spellFocus: 0.008 }, 42)).toBe(1);
    // negatives/ungültiges INT zählt als 0 (nie ein Malus unter die Basis-Spanne)
    expect(spellFocusMult({ weaponStyle: "magic", spellFocus: 0.008 }, -5)).toBe(1);
    expect(spellFocusMult({ weaponStyle: "magic", spellFocus: 0.008 }, Number.NaN)).toBe(1);
  });
});

describe("Zauberfokus §2: computeStats skaliert die Waffenspanne mit INT", () => {
  const plain = weapon("zf_plain", {});
  const focused = weapon("zf_focus", { spellFocus: 0.008 });
  const c = withItems(content, [plain, focused]);

  it("Magiewaffe mit spellFocus: min UND max der Spanne × (1 + focus·int), Charakter-Anteil unverändert", () => {
    const s0 = hero(c, "zf_plain", 40);
    const s1 = hero(c, "zf_focus", 40);
    const a = computeStats(s0, c);
    const b = computeStats(s1, c);
    const int = b.attributes.int;
    expect(int).toBe(a.attributes.int);
    const mult = 1 + 0.008 * int;
    expect(mult).toBeGreaterThan(1.2);
    // Charakter-Anteil C ist derselbe (gleiche Attribute, gleicher Stil) …
    expect(b.magicDamage).toBeCloseTo(a.magicDamage, 9);
    // … die Spanne ist (C + Waffe·mult) × Fokus-Haltung (Zauberreserve 28.08.2026: 1 + spellReserveDamageBonus,
    // gleicher Faktor für beide Waffen — dieselbe Reserve)
    const focus = 1 + b.spellReserveDamageBonus;
    expect(focus).toBe(1 + a.spellReserveDamageBonus);
    expect(b.attackDamageMin).toBeCloseTo((b.magicDamage + 10 * mult) * focus, 9);
    expect(b.attackDamageMax).toBeCloseTo((b.magicDamage + 16 * mult) * focus, 9);
    expect(a.attackDamageMin).toBeCloseTo((a.magicDamage + 10) * focus, 9);
    expect(a.attackDamageMax).toBeCloseTo((a.magicDamage + 16) * focus, 9);
    // Breite der Spanne wächst exakt mit dem Multiplikator
    expect(b.attackDamageMax - b.attackDamageMin).toBeCloseTo((a.attackDamageMax - a.attackDamageMin) * mult, 9);
    // min/maxHit (Anzeige + combat.ts-Roll) tragen dieselbe Spanne
    expect(b.minHit).toBe(b.attackDamageMin);
    expect(b.maxHit).toBe(b.attackDamageMax);
  });

  it("mehr INT ⇒ größerer Waffenbonus (linear in INT)", () => {
    const lo = computeStats(hero(c, "zf_focus", 20), c);
    const hi = computeStats(hero(c, "zf_focus", 60), c);
    // Fokus-Haltung (Zauberreserve) herausrechnen: die Spanne ist × (1 + spellReserveDamageBonus).
    const bonusLo = lo.attackDamageMax / (1 + lo.spellReserveDamageBonus) - lo.magicDamage - 16;
    const bonusHi = hi.attackDamageMax / (1 + hi.spellReserveDamageBonus) - hi.magicDamage - 16;
    expect(bonusLo).toBeCloseTo(16 * 0.008 * lo.attributes.int, 9);
    expect(bonusHi).toBeCloseTo(16 * 0.008 * hi.attributes.int, 9);
    expect(bonusHi / bonusLo).toBeCloseTo(hi.attributes.int / lo.attributes.int, 9);
  });

  it("spellFocus 0 / undefined ⇒ identische Spanne wie ohne Feld", () => {
    const zero = weapon("zf_zero", { spellFocus: 0 });
    const cz = withItems(c, [zero]);
    const a = computeStats(hero(cz, "zf_plain", 40), cz);
    const z = computeStats(hero(cz, "zf_zero", 40), cz);
    expect(z.attackDamageMin).toBe(a.attackDamageMin);
    expect(z.attackDamageMax).toBe(a.attackDamageMax);
  });

  it("Nahkampf/Fernkampf bleiben unberührt — selbst wenn ein Item das Feld fälschlich trüge", () => {
    const melee = weapon("zf_melee", { weaponStyle: "melee", weaponType: "sword", twoHanded: false });
    const meleeF = weapon("zf_melee_f", { weaponStyle: "melee", weaponType: "sword", twoHanded: false, spellFocus: 0.008 });
    const ranged = weapon("zf_bow", { weaponStyle: "ranged", weaponType: "shortbow" });
    const rangedF = weapon("zf_bow_f", { weaponStyle: "ranged", weaponType: "shortbow", spellFocus: 0.008 });
    const cm = withItems(c, [melee, meleeF, ranged, rangedF]);
    for (const [a, b] of [["zf_melee", "zf_melee_f"], ["zf_bow", "zf_bow_f"]] as const) {
      const sa = computeStats(hero(cm, a, 40), cm);
      const sb = computeStats(hero(cm, b, 40), cm);
      expect(sb.style).toBe(sa.style);
      expect(sb.attackDamageMin, `${b} min`).toBe(sa.attackDamageMin);
      expect(sb.attackDamageMax, `${b} max`).toBe(sa.attackDamageMax);
    }
  });

  it("echter Content: blacksteel_staff trägt spellFocus und computeStats wendet ihn an", () => {
    const staff = content.items["blacksteel_staff"]!;
    expect(staff.spellFocus ?? 0).toBeGreaterThan(0);
    const s = hero(content, "blacksteel_staff", 46);
    const st = computeStats(s, content);
    const mult = spellFocusMult(staff, st.attributes.int);
    expect(mult).toBeGreaterThan(1.1);
    expect(st.attackDamageMax).toBeCloseTo((st.magicDamage + (staff.damageMax ?? 0) * mult) * (1 + st.spellReserveDamageBonus), 9);
  });
});

describe("Zauberfokus §3: Zielkurve (+15/22/30 % Spanne auf CL 30/60/90, realistischer INT)", () => {
  const TARGET = { 30: 0.15, 60: 0.22, 90: 0.3 } as const;
  for (const lvl of [30, 60, 90] as const) {
    it(`CL ${lvl}: bestes legales Kit ohne Runen/Suffixe/Tränke ⇒ Waffenspanne +${Math.round(TARGET[lvl] * 100)} % (±3 Pp)`, () => {
      const b = buildBisCharacter(content, "magic", lvl, "damage", { allBuffs: true });
      b.state.character.buffs = [];
      b.state.character.equippedInstances = {};
      const st = computeStats(b.state, content);
      const w = content.items[b.kit.mainhand!]!;
      const bonus = spellFocusMult(w, st.attributes.int) - 1;
      expect(bonus, `${w.id} @ int ${st.attributes.int}`).toBeGreaterThanOrEqual(TARGET[lvl] - 0.03);
      expect(bonus, `${w.id} @ int ${st.attributes.int}`).toBeLessThanOrEqual(TARGET[lvl] + 0.03);
    });
  }
});
