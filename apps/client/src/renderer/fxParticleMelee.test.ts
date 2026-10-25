// claude:2026-10-25T14:48:00+01:00 — Nahkampf 1.4.1: Zuordnung Waffenart → Rezept, Waffeneffekte → Element-Überlagerung,
// Waffenart → Kurzbewegung; dazu Abdeckung aller Content-Nahkampfwaffen und echte Runen-Instanzen.
import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { effectiveInstanceWeaponEffects, type ItemInstance, type WeaponType } from "@hearthforge/shared";
import { hasRecipe, selectRecipe } from "./fxParticles";
import "./fxParticleLibrary";
import {
  MELEE_MOTION_KEYFRAMES,
  MELEE_WEAPON_TYPES,
  meleeElementForStatus,
  meleeElementsFor,
  meleeMotionFor,
  meleeRecipeKeyFor,
} from "./fxParticleMelee";

describe("fxParticleMelee — Waffenart → Rezept", () => {
  it("jede Nahkampf-Waffenart hat ein eigenes Rezept mit zwei Varianten und einer Krit-Variante", () => {
    for (const wt of MELEE_WEAPON_TYPES) {
      const key = meleeRecipeKeyFor(wt);
      expect(key).toBe(`melee_${wt}`);
      expect(hasRecipe(key!)).toBe(true);
      const last = new Map<string, number>();
      const seen = new Set<number>();
      for (let i = 0; i < 40; i++) seen.add(selectRecipe(key!, false, last)!.index);
      expect(seen).toEqual(new Set([0, 1]));
      expect(selectRecipe(key!, true, new Map())?.index).toBe(-1);
    }
  });

  it("Fernkampf, Magie, Köcher und fehlende Waffe liefern kein Nahkampf-Rezept (Rückfall auf die alte Familie)", () => {
    for (const wt of ["shortbow", "longbow", "staff", "wand", "focus", "scepter", "quiver"] as WeaponType[]) {
      expect(meleeRecipeKeyFor(wt)).toBeNull();
    }
    expect(meleeRecipeKeyFor(undefined)).toBeNull();
    expect(meleeRecipeKeyFor(null)).toBeNull();
  });

  it("deckt jede Nahkampf-Waffenart ab, die im Content vorkommt", () => {
    const ranged = new Set(["shortbow", "longbow", "staff", "wand", "focus", "scepter", "quiver"]);
    const used = new Set(Object.values(content.items).map((it) => it.weaponType).filter((wt): wt is WeaponType => !!wt && !ranged.has(wt)));
    expect(used.size).toBeGreaterThan(0);
    for (const wt of used) expect(hasRecipe(meleeRecipeKeyFor(wt) ?? "")).toBe(true);
  });
});

describe("fxParticleMelee — Waffeneffekte → Element-Überlagerung", () => {
  it("bildet jeden Status auf sein Element ab, Spezial-Effekte fallen heraus", () => {
    expect(meleeElementForStatus("burn")).toBe("fire");
    expect(meleeElementForStatus("frost")).toBe("frost");
    expect(meleeElementForStatus("shock")).toBe("shock");
    expect(meleeElementForStatus("poison")).toBe("poison");
    expect(meleeElementForStatus("bleed")).toBe("bleed");
    expect(meleeElementForStatus("void")).toBe("void");
    expect(meleeElementForStatus("execute")).toBeNull();
    expect(meleeElementForStatus(undefined)).toBeNull();
    expect(meleeElementsFor([{ type: "momentum" }, { type: "execute" }])).toEqual([]);
  });

  it("höchstens zwei Elemente, echte Elemente vor Blutung, ohne Doppelte", () => {
    expect(meleeElementsFor([{ type: "bleed" }, { type: "burn" }])).toEqual(["fire", "bleed"]);
    expect(meleeElementsFor([{ type: "burn" }, { type: "burn" }])).toEqual(["fire"]);
    expect(meleeElementsFor([{ type: "frost" }, { type: "shock" }, { type: "poison" }])).toEqual(["frost", "shock"]);
    expect(meleeElementsFor([{ type: "bleed" }])).toEqual(["bleed"]);
  });

  it("Runen der ausgerüsteten Instanz zählen mit (Flammend/Eisig/Sturm auf einer Stahlwaffe)", () => {
    const sword = Object.values(content.items).find((it) => it.weaponType === "sword" && !it.weaponEffect && !it.weaponEffects?.length)!;
    expect(sword).toBeTruthy();
    const inst = (affixId: string): ItemInstance => ({ instanceId: "t", baseItemId: sword.id, affixes: [{ affixId, tier: 2 }] }) as ItemInstance;
    expect(meleeElementsFor(effectiveInstanceWeaponEffects(inst("affix_flame"), sword, content))).toEqual(["fire"]);
    expect(meleeElementsFor(effectiveInstanceWeaponEffects(inst("affix_frost"), sword, content))).toEqual(["frost"]);
    expect(meleeElementsFor(effectiveInstanceWeaponEffects(inst("affix_shock"), sword, content))).toEqual(["shock"]);
    expect(meleeElementsFor(effectiveInstanceWeaponEffects(inst("affix_keen"), sword, content))).toEqual([]);
  });

  it("eine Blutungs-Waffe aus dem Content trägt die Blutungs-Überlagerung", () => {
    const bleeder = Object.values(content.items).find((it) => it.weaponType && meleeRecipeKeyFor(it.weaponType) && it.weaponEffect?.type === "bleed");
    expect(bleeder).toBeTruthy();
    expect(meleeElementsFor(effectiveInstanceWeaponEffects(null, bleeder, content))).toContain("bleed");
  });
});

describe("fxParticleMelee — Kurzbewegung der Spielfigur", () => {
  it("Stich für Dolch/Speer, Schwung für Zweihänder, Überkopf für Streitkolben/Maul", () => {
    expect(meleeMotionFor("dagger")).toBe("stab");
    expect(meleeMotionFor("spear")).toBe("stab");
    expect(meleeMotionFor("greatsword")).toBe("sweep");
    expect(meleeMotionFor("greataxe")).toBe("sweep");
    expect(meleeMotionFor("battleaxe")).toBe("sweep");
    expect(meleeMotionFor("mace")).toBe("overhead");
    expect(meleeMotionFor("maul")).toBe("overhead");
    expect(meleeMotionFor("sword")).toBe("slash");
    expect(meleeMotionFor(undefined)).toBe("slash");
  });

  it("alle Bewegungen sind reine Transforms, kehren in die Ruhelage zurück und bleiben unter einer halben Sekunde", () => {
    for (const m of Object.values(MELEE_MOTION_KEYFRAMES)) {
      expect(m.duration).toBeLessThanOrEqual(500);
      for (const f of m.frames) expect(Object.keys(f).filter((k) => k !== "offset")).toEqual(["transform"]);
      expect(String(m.frames[0]!.transform)).toMatch(/translateX\(0\)/);
      expect(String(m.frames[m.frames.length - 1]!.transform)).toMatch(/translateX\(0\)/);
    }
  });
});
