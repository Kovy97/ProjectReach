import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { WeaponType } from "@hearthforge/shared";

/**
 * Guard-Test: Jedes Item mit `weaponStyle` (= Waffe) muss `weaponType` gesetzt haben
 * und der Wert muss aus der bekannten WeaponType-Union stammen.
 *
 * Verhindert, dass neue Waffen ohne Typ-Angabe hinzugefügt werden — das war die Ursache
 * des "Two Handed Sword"-Tooltip-Bugs bei Speer/Großaxt/Hammer etc.
 */

const KNOWN_WEAPON_TYPES: ReadonlySet<WeaponType> = new Set([
  "dagger",
  "sword",
  "scimitar",
  "mace",
  "axe",
  "battleaxe",
  "spear",
  "greataxe",
  "greatsword",
  "maul",
  "shortbow",
  "longbow",
  "staff",
  "wand",
  "focus",
  "scepter",
  "quiver", // claude:2026-10-24T21:05:00+02:00 — Köcher (1.4.0 FK)
] satisfies WeaponType[]);

describe("weaponType-Vollständigkeit", () => {
  it("jedes Item mit weaponStyle hat ein gültiges weaponType", () => {
    const weapons = Object.values(content.items).filter((item) => item.weaponStyle != null);

    const missing: string[] = [];
    const unknown: string[] = [];

    for (const item of weapons) {
      if (item.weaponType == null) {
        missing.push(item.id);
      } else if (!KNOWN_WEAPON_TYPES.has(item.weaponType as WeaponType)) {
        unknown.push(`${item.id} → "${item.weaponType}"`);
      }
    }

    expect(
      missing,
      `Diese Waffen haben kein weaponType gesetzt (${missing.length}): ${missing.join(", ")}`
    ).toHaveLength(0);

    expect(
      unknown,
      `Diese Waffen haben einen unbekannten weaponType-Wert (${unknown.length}): ${unknown.join(", ")}`
    ).toHaveLength(0);
  });

  it("Stichproben: kritische Waffentypen sind korrekt zugeordnet", () => {
    const items = content.items;

    // Zweihändig melee
    expect(items["copper_spear"]?.weaponType).toBe("spear");
    expect(items["copper_greataxe"]?.weaponType).toBe("greataxe");
    expect(items["copper_greatsword"]?.weaponType).toBe("greatsword");
    expect(items["copper_maul"]?.weaponType).toBe("maul");
    expect(items["copper_battleaxe"]?.weaponType).toBe("battleaxe");

    // Einhändig melee
    expect(items["copper_dagger"]?.weaponType).toBe("dagger");
    expect(items["copper_sword"]?.weaponType).toBe("sword");
    expect(items["copper_scimitar"]?.weaponType).toBe("scimitar");
    expect(items["copper_mace"]?.weaponType).toBe("mace");
    expect(items["copper_axe"]?.weaponType).toBe("axe");

    // Godiron-Tier (höchste Stufe)
    expect(items["godiron_spear"]?.weaponType).toBe("spear");
    expect(items["godiron_greataxe"]?.weaponType).toBe("greataxe");
    expect(items["godiron_greatsword"]?.weaponType).toBe("greatsword");
    expect(items["godiron_maul"]?.weaponType).toBe("maul");

    // Fernkampf
    expect(items["copper_shortbow"]?.weaponType).toBe("shortbow");
    expect(items["copper_longbow"]?.weaponType).toBe("longbow");
    expect(items["cracked_bow"]?.weaponType).toBe("shortbow");

    // Magie
    expect(items["copper_staff"]?.weaponType).toBe("staff");
    expect(items["copper_wand"]?.weaponType).toBe("wand");
    expect(items["copper_focus"]?.weaponType).toBe("focus");

    // Spezial-Waffen (Monster-Drops, Verzaubert, Benannt)
    expect(items["thornfang_blade"]?.weaponType).toBe("dagger");
    expect(items["mire_fang_dagger"]?.weaponType).toBe("dagger");
    expect(items["ashen_reaper"]?.weaponType).toBe("sword");
    expect(items["steel_warblade"]?.weaponType).toBe("sword");
    expect(items["titanium_greatsword"]?.weaponType).toBe("greatsword");
    expect(items["boar_tusk_mace"]?.weaponType).toBe("mace");
    expect(items["frost_scepter"]?.weaponType).toBe("scepter");
    expect(items["stormcaller_rod"]?.weaponType).toBe("scepter");
  });

  it("Zusammenfassung: Anzahl Waffen pro weaponType", () => {
    const weapons = Object.values(content.items).filter((item) => item.weaponStyle != null);
    const counts: Record<string, number> = {};
    for (const item of weapons) {
      const t = item.weaponType ?? "(missing)";
      counts[t] = (counts[t] ?? 0) + 1;
    }

    // Log für Debugging — kein harter Assert, nur Übersicht
    console.log("Waffen pro weaponType:", JSON.stringify(counts, null, 2));

    // Mindest-Erwartungen: jeder Melee-Typ muss mind. 12 Einträge haben (ein pro Tier)
    const meleeTypes: WeaponType[] = [
      "dagger", "sword", "scimitar", "mace", "axe",
      "battleaxe", "spear", "greataxe", "greatsword", "maul",
    ];
    for (const t of meleeTypes) {
      expect(
        counts[t] ?? 0,
        `weaponType="${t}" hat weniger als 12 Einträge (erwartet mind. 12 Tiers)`
      ).toBeGreaterThanOrEqual(12);
    }

    // Fernkampf: mind. 12 Kurzbogen + 12 Langbogen + 1 Starter
    expect(counts["shortbow"] ?? 0).toBeGreaterThanOrEqual(12);
    expect(counts["longbow"] ?? 0).toBeGreaterThanOrEqual(12);

    // Magie: mind. 12 Stäbe + 12 Zauberstäbe + 12 Foki
    expect(counts["staff"] ?? 0).toBeGreaterThanOrEqual(12);
    expect(counts["wand"] ?? 0).toBeGreaterThanOrEqual(12);
    expect(counts["focus"] ?? 0).toBeGreaterThanOrEqual(12);
  });
});
