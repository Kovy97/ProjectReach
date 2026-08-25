import { describe, expect, it } from "vitest";
import { content } from "./index";
import type { LocalizedString } from "@hearthforge/shared";
import { isStatusEffectType } from "@hearthforge/shared";

/** LocalizedString ist `string | {en, de, ...}` — die 14 Runen tragen immer das Objekt, aber der
 * Typ deckt beides ab; dieser Helper macht das Feld für die Tests typsicher zugänglich. */
function part(v: LocalizedString, locale: "en" | "de"): string {
  return typeof v === "string" ? v : (v[locale] ?? v.en);
}

/**
 * Wächter für die 14 Runen Tier IV (Chef-Entscheid 25.08.2026, design/runen-tier-iv.html).
 * Die Engine-Seite (Kinds, Deckel, requiresTrinity-Gate) ist bereits durch
 * `packages/engine/src/rune-tier-iv.test.ts` content-unabhängig abgesichert — hier prüfen wir
 * NUR die Daten-Seite: existieren alle 14 Affixe/Runen/Rezepte, sind sie korrekt verdrahtet, und
 * halten sie die Design-Regeln (§2 Prinzip 4, §4.2 Klassen-Gate, §4.3 Schmuck-Linie) ein.
 */

// IDs verbindlich aus CODEX/work/2026-08-25-runen-tier-iv/PROMPTS.md (Kopfzeilen je Rune).
const RUNE_IDS = [
  "rune_warpath_iv",
  "rune_second_arrow_iv",
  "rune_thin_veil_iv",
  "rune_wasting_iv",
  "rune_judgement_iv",
  "rune_iron_answer_iv",
  "rune_ambush_iv",
  "rune_veil_drinker_iv",
  "rune_unbroken_wall_iv",
  "rune_bounty",
  "rune_tallyman",
  "rune_restless",
  "rune_chronicle",
  "rune_gleaning",
] as const;

const WEAPON_AFFIX_IDS = [
  "affix_warpath",
  "affix_second_arrow",
  "affix_thin_veil",
  "affix_wasting",
  "affix_judgement",
] as const;
const ARMOR_AFFIX_IDS = ["affix_iron_answer", "affix_ambush", "affix_veil_drinker", "affix_unbroken_wall"] as const;
const JEWELRY_AFFIX_IDS = ["affix_bounty", "affix_tallyman", "affix_restless", "affix_chronicle", "affix_gleaning"] as const;
const ALL_AFFIX_IDS = [...WEAPON_AFFIX_IDS, ...ARMOR_AFFIX_IDS, ...JEWELRY_AFFIX_IDS];

const ARMOR_TRINITY: Record<(typeof ARMOR_AFFIX_IDS)[number], string> = {
  affix_iron_answer: "armorRating",
  affix_ambush: "evasionRating",
  affix_veil_drinker: "wardCapacity",
  affix_unbroken_wall: "blockChance",
};
// Ziel-Tag je Rüstungsrune: die drei Panzerungs-Klassen bleiben appliesTo ["armor"] (das
// Trinity-Gate filtert danach auf Platte/Leder/Stoff), die Schild-Rune ist appliesTo ["shield"]
// (eigener Item-Typ-Tag, s. itemTypeTags in shared).
const ARMOR_APPLIES_TO: Record<(typeof ARMOR_AFFIX_IDS)[number], string> = {
  affix_iron_answer: "armor",
  affix_ambush: "armor",
  affix_veil_drinker: "armor",
  affix_unbroken_wall: "shield",
};

describe("Runen Tier IV: 14 IDs entsprechen PROMPTS.md", () => {
  it("alle 14 Rune-Items existieren im Content", () => {
    const missing = RUNE_IDS.filter((id) => !content.items[id]);
    expect(missing, `fehlende Rune-Items: ${missing.join(", ")}`).toEqual([]);
  });

  it("alle 14 Affix-Familien existieren", () => {
    const missing = ALL_AFFIX_IDS.filter((id) => !content.affixes?.[id]);
    expect(missing, `fehlende Affixe: ${missing.join(", ")}`).toEqual([]);
  });

  it("genau 14 T4-Runen (kein Fünfzehntes/Vierzehntes verloren)", () => {
    expect(RUNE_IDS).toHaveLength(14);
    expect(ALL_AFFIX_IDS).toHaveLength(14);
  });
});

describe("Runen Tier IV: §2 Prinzip 4 — Länge-4-Arrays, NUR Index 3 belegt", () => {
  for (const affixId of ALL_AFFIX_IDS) {
    it(`${affixId}: bonusByTier/weaponEffectByTier Länge 4, Indizes 0..2 leer`, () => {
      const def = content.affixes![affixId]!;
      expect(def, `Affix ${affixId} fehlt`).toBeDefined();
      expect(def.bonusByTier).toHaveLength(4);
      for (const b of def.bonusByTier) expect(b).toEqual({});
      expect(def.weaponEffectByTier, `${affixId} braucht einen Aktiv-Effekt (Tier IV = reine Effekt-Linie)`).toBeDefined();
      expect(def.weaponEffectByTier).toHaveLength(4);
      expect(def.weaponEffectByTier![0]).toBeUndefined();
      expect(def.weaponEffectByTier![1]).toBeUndefined();
      expect(def.weaponEffectByTier![2]).toBeUndefined();
      expect(def.weaponEffectByTier![3]).toBeDefined();
      // Reine Aktiv-Effekt-Linie: kein modifiersByTier/trinityByTier (das wäre eine Stat-Rune,
      // §9 Frage 1 Option A schließt das für Tier IV aus).
      expect(def.modifiersByTier).toBeUndefined();
      expect(def.trinityByTier).toBeUndefined();
    });
  }
});

describe("Runen Tier IV: §4.2 Rüstungs-Linie trägt requiresTrinity (Klassen-Gate ohne Trinity-Bonus)", () => {
  for (const affixId of ARMOR_AFFIX_IDS) {
    it(`${affixId} → requiresTrinity: ${ARMOR_TRINITY[affixId]}`, () => {
      const def = content.affixes![affixId]!;
      expect(def.requiresTrinity).toBe(ARMOR_TRINITY[affixId]);
      expect(def.appliesTo).toEqual([ARMOR_APPLIES_TO[affixId]]);
    });
  }

  it("Waffen- und Schmuck-Affixe tragen KEIN requiresTrinity (das Feld ist exklusiv für die Rüstungs-Linie)", () => {
    for (const affixId of [...WEAPON_AFFIX_IDS, ...JEWELRY_AFFIX_IDS]) {
      expect(content.affixes![affixId]!.requiresTrinity, affixId).toBeUndefined();
    }
  });
});

describe("Runen Tier IV: §4.3 Schmuck-Linie — appliesTo jewelry, kein Status-Kind", () => {
  for (const affixId of JEWELRY_AFFIX_IDS) {
    it(`${affixId}: appliesTo ["jewelry"], Effekt ist ein Spezial-Kind, kein burn/frost/shock/bleed/poison`, () => {
      const def = content.affixes![affixId]!;
      expect(def.appliesTo).toEqual(["jewelry"]);
      const fx = def.weaponEffectByTier![3]!;
      expect(isStatusEffectType(fx.type), `${affixId} trägt einen Status-Kind (${fx.type}) — auf Schmuck stumm, da nur die Mainhand gelesen wird`).toBe(false);
    });
  }

  it("keine Schmuck-Rune trägt einen Tier-Ziffer im Namen (Design: Schmuck-Linie ohne I..III-Historie)", () => {
    for (const id of ["rune_bounty", "rune_tallyman", "rune_restless", "rune_chronicle", "rune_gleaning"]) {
      const item = content.items[id]!;
      expect(part(item.name, "de")).not.toMatch(/\b(I|II|III|IV)\b/);
      expect(part(item.name, "en")).not.toMatch(/\b(I|II|III|IV)\b/);
      // Intern bleibt tier: 4 (Gold-Formel enchantGoldCost).
      expect(item.rune?.tier).toBe(4);
    }
  });
});

describe("Runen Tier IV: jede Rune ist ein Item ↔ Affix ↔ Rezept-Dreiklang", () => {
  for (const runeId of RUNE_IDS) {
    it(`${runeId}: Item verweist auf ein existierendes Affix, ist material+stackable, hat value>0`, () => {
      const item = content.items[runeId]!;
      expect(item).toBeDefined();
      expect(item.type).toBe("material");
      expect(item.stackable).toBe(true);
      expect(item.rune).toBeDefined();
      expect(item.rune!.tier).toBe(4);
      expect(content.affixes![item.rune!.affixId], `${runeId} → Affix ${item.rune!.affixId} fehlt`).toBeDefined();
      expect(item.value ?? 0).toBeGreaterThan(0);
      expect(part(item.name, "en")).toBeTruthy();
      expect(part(item.name, "de")).toBeTruthy();
    });

    it(`${runeId}: hat genau ein Runecrafting-Rezept, das die Rune als Loot liefert`, () => {
      const recipes = Object.values(content.actions).filter((a) =>
        (a.loot ?? []).some((l) => l.itemId === runeId),
      );
      expect(recipes, `Rezepte für ${runeId}: ${recipes.map((r) => r.id).join(", ")}`).toHaveLength(1);
      const recipe = recipes[0]!;
      expect(recipe.skill).toBe("runecrafting");
      expect(recipe.category).toBe("rune_affixes");
      expect(recipe.levelRequired).toBeGreaterThanOrEqual(85);
      expect(recipe.inputs?.length ?? 0).toBeGreaterThan(0);
    });
  }

  it("jede Rezept-Zutat existiert im Item-Katalog", () => {
    const recipes = Object.values(content.actions).filter((a) =>
      (a.loot ?? []).some((l) => RUNE_IDS.includes(l.itemId as (typeof RUNE_IDS)[number])),
    );
    expect(recipes).toHaveLength(14);
    const missingInputs: string[] = [];
    for (const r of recipes) {
      for (const input of r.inputs ?? []) {
        if (!content.items[input.itemId]) missingInputs.push(`${r.id} → ${input.itemId}`);
      }
    }
    expect(missingInputs, `fehlende Zutaten: ${missingInputs.join(", ")}`).toEqual([]);
  });
});

describe("Runen Tier IV: XP-Konvention (~×6,67 der Zielkurve, wie die 36 bestehenden Runen-Rezepte)", () => {
  // xpForLevel-Tabelle 1:1 aus packages/engine/src/leveling.ts nachgebaut (das Content-Paket
  // hängt bewusst nicht von @hearthforge/engine ab, s. smithing-xp-per-bar.test.ts).
  const MAX_LEVEL = 99;
  function buildXpTable(upTo: number): number[] {
    const table: number[] = [0, 0];
    let acc = 0;
    for (let n = 1; n < upTo; n++) {
      acc += Math.floor(n + 300 * Math.pow(2, n / 7));
      table[n + 1] = Math.floor(acc / 4);
    }
    return table;
  }
  const XP_TABLE = buildXpTable(MAX_LEVEL + 2);
  function targetXph(level: number): number {
    return 90 * Math.sqrt(XP_TABLE[level + 1]! - XP_TABLE[level]!);
  }

  it("jedes der 14 Rezepte liegt zwischen ×6,3 und ×7,0 der Zielkurve (Toleranzband der Bestandsrezepte)", () => {
    const recipes = Object.values(content.actions).filter((a) =>
      (a.loot ?? []).some((l) => RUNE_IDS.includes(l.itemId as (typeof RUNE_IDS)[number])),
    );
    expect(recipes).toHaveLength(14);
    for (const r of recipes) {
      expect(r.levelRequired, `${r.id} braucht ein levelRequired für die XP-Zielkurve`).toBeDefined();
      const curveXp = (targetXph(r.levelRequired!) * r.durationMs) / 3_600_000;
      const ratio = r.xp / curveXp;
      expect(ratio, `${r.id}: xp=${r.xp}, curve=${curveXp.toFixed(1)}, ratio=${ratio.toFixed(3)}`).toBeGreaterThan(6.3);
      expect(ratio, `${r.id}: xp=${r.xp}, curve=${curveXp.toFixed(1)}, ratio=${ratio.toFixed(3)}`).toBeLessThan(7.0);
    }
  });
});
