import { describe, expect, it } from "vitest";
import { HUNT_BAIT_TIERS, huntBaitForZoneLevel } from "@hearthforge/shared";
import { content } from "./index";
import type { ActionDef, LocalizedString } from "@hearthforge/shared";

function hasText(v: LocalizedString, locale: "en" | "de"): boolean {
  const t = typeof v === "string" ? (locale === "en" ? v : undefined) : v[locale];
  return typeof t === "string" && t.length > 0;
}

/**
 * Fasern, Stoff und Jagen (1.2.0 „Fasern und Fallen", design/handwerk-fasern-jagen/spec-technik.md
 * §1): Content-Guard für den content-dev-Teil der Lieferung — Item-/Aktions-/Crop-/Skill-IDs
 * vorhanden, Kategorien existieren, alle 26 Roben-Rezepte ohne Leder, Stoff-Stufe ≤ Rezept-Stufe,
 * `huntingZones` deckt alle Zonen außer `slayer_tower` mit aufsteigenden Stufen/Fallenzeiten/XP,
 * `dig_bait` auf Stufe 1. Nicht Sache dieses Tests: Engine-Logik (engine/hunting.ts, logic-dev)
 * oder UI (ui-dev) — nur, dass der Content in sich stimmig ist.
 */

const FIBER_TIERS = [
  { fiber: "fiber_nettle", seed: "nettle_seed", cloth: "cloth_nettle", crop: "nettle", forage: "forage_nettle", weave: "weave_nettle", level: 1 },
  { fiber: "fiber_flax", seed: "flax_seed", cloth: "cloth_linen", crop: "flax", forage: "forage_flax", weave: "weave_linen", level: 20 },
  { fiber: "fiber_thornhemp", seed: "thornhemp_seed", cloth: "cloth_thornlinen", crop: "thornhemp", forage: "forage_thornhemp", weave: "weave_thornlinen", level: 40 },
  { fiber: "fiber_ghostsilk", seed: "ghostsilk_seed", cloth: "cloth_ghostweave", crop: "ghostsilk", forage: "forage_ghostsilk", weave: "weave_ghostweave", level: 60 },
  { fiber: "fiber_starflax", seed: "starflax_seed", cloth: "cloth_starweave", crop: "starflax", forage: "forage_starflax", weave: "weave_starweave", level: 80 },
] as const;

const LEATHER_FAMILY = new Set(["cured_leather", "hardened_leather", "scaled_leather", "studded_leather", "warhide"]);

// Die 26 Roben-Rezepte aus spec-technik.md §1.5, je mit ihrem Stoff-Tier-Index (0..4 in FIBER_TIERS).
const ROBE_RECIPES: Array<{ id: string; tier: number }> = [
  { id: "craft_apprentice_hat", tier: 0 },
  { id: "craft_apprentice_robe", tier: 0 },
  { id: "craft_apprentice_robe_legs", tier: 0 },
  { id: "craft_dimweave_hood", tier: 0 },
  { id: "craft_dimweave_robe", tier: 0 },
  { id: "craft_frost_robe_body", tier: 1 },
  { id: "craft_frost_robe_legs", tier: 1 },
  { id: "craft_ember_robe_hood", tier: 1 },
  { id: "craft_ember_robe_body", tier: 1 },
  { id: "craft_ember_robe_legs", tier: 1 },
  { id: "craft_silk_mantle", tier: 1 },
  { id: "craft_aether_hood", tier: 2 },
  { id: "craft_aether_robe_body", tier: 2 },
  { id: "craft_aether_robe_legs", tier: 2 },
  { id: "craft_arcane_cowl", tier: 2 },
  { id: "craft_arcane_robe_body", tier: 2 },
  { id: "craft_arcane_robe_legs", tier: 2 },
  { id: "craft_duskweave_cowl", tier: 3 },
  { id: "craft_duskweave_robe_body", tier: 3 },
  { id: "craft_duskweave_robe_legs", tier: 3 },
  { id: "craft_runewoven_cowl", tier: 3 },
  { id: "craft_runewoven_robe_body", tier: 3 },
  { id: "craft_runewoven_robe_legs", tier: 3 },
  { id: "craft_godspark_vestment", tier: 4 },
  { id: "craft_starweave_vestment", tier: 4 },
  { id: "craft_voidweave_vestment", tier: 4 },
];

describe("Fasern, Stoff und Jagen (1.2.0): Item-/Aktions-/Crop-/Skill-Wächter", () => {
  it("alle 16 neuen Items existieren (material, stackable, value > 0, EN+DE Name)", () => {
    const ids = [
      "fiber_nettle", "fiber_flax", "fiber_thornhemp", "fiber_ghostsilk", "fiber_starflax",
      "nettle_seed", "flax_seed", "thornhemp_seed", "ghostsilk_seed", "starflax_seed",
      "cloth_nettle", "cloth_linen", "cloth_thornlinen", "cloth_ghostweave", "cloth_starweave",
      "bait_worm",
    ];
    for (const id of ids) {
      const it = content.items[id];
      expect(it, `Item ${id} fehlt`).toBeDefined();
      expect(it!.type, id).toBe("material");
      expect(it!.stackable, id).toBe(true);
      expect(it!.value ?? 0, id).toBeGreaterThan(0);
      expect(hasText(it!.name, "en"), id).toBe(true);
      expect(hasText(it!.name, "de"), id).toBe(true);
    }
  });

  it("fünf Sammel-Aktionen forage_nettle..forage_starflax existieren (Kategorie forage_fibers, xp > 0)", () => {
    for (const t of FIBER_TIERS) {
      const a = content.actions[t.forage];
      expect(a, t.forage).toBeDefined();
      expect(a!.skill, t.forage).toBe("foraging");
      expect(a!.category, t.forage).toBe("forage_fibers");
      expect(a!.levelRequired ?? 1, t.forage).toBe(t.level);
      expect(a!.xp, t.forage).toBeGreaterThan(0);
      expect(a!.durationMs, t.forage).toBeGreaterThan(0);
      const lootIds = a!.loot.map((l) => l.itemId);
      expect(lootIds, t.forage).toContain(t.fiber);
      expect(lootIds, t.forage).toContain(t.seed);
    }
  });

  it("fünf Pflanzen nettle..starflax existieren (crops, yieldMin/Max 6-9, seedItem/yieldItem lösen auf)", () => {
    for (const t of FIBER_TIERS) {
      const c = content.crops?.[t.crop];
      expect(c, t.crop).toBeDefined();
      expect(c!.seedItem, t.crop).toBe(t.seed);
      expect(c!.yieldItem, t.crop).toBe(t.fiber);
      expect(content.items[c!.seedItem], `${t.crop}: seedItem ${c!.seedItem}`).toBeDefined();
      expect(content.items[c!.yieldItem], `${t.crop}: yieldItem ${c!.yieldItem}`).toBeDefined();
      expect(c!.yieldMin, t.crop).toBe(6);
      expect(c!.yieldMax, t.crop).toBe(9);
      expect(c!.xp, t.crop).toBeGreaterThan(0);
      expect(c!.growMs, t.crop).toBeGreaterThan(0);
    }
    // Anbau-Stufen aufsteigend über die 5 Tiers (T1 L2 < T2 L22 < T3 L44 < T4 L64 < T5 L84).
    const cropLevels = FIBER_TIERS.map((t) => content.crops![t.crop]!.levelRequired);
    for (let i = 1; i < cropLevels.length; i++) expect(cropLevels[i]!).toBeGreaterThan(cropLevels[i - 1]!);
  });

  it("fünf Weben-Rezepte + twist_nettle_cord existieren (Kategorie weave, 3 Fasern → 1 Stoff; Weben seit SAVE 86 tailoring, Sehne bleibt Handwerk)", () => {
    for (const t of FIBER_TIERS) {
      const a = content.actions[t.weave];
      expect(a, t.weave).toBeDefined();
      expect(a!.skill, t.weave).toBe("tailoring");
      expect(a!.category, t.weave).toBe("weave");
      expect(a!.levelRequired ?? 1, t.weave).toBe(t.level);
      expect(a!.inputs, t.weave).toEqual([{ itemId: t.fiber, qty: 3 }]);
      expect(a!.loot, t.weave).toEqual([{ itemId: t.cloth, chance: 1, min: 1, max: 1 }]);
      expect(a!.xp, t.weave).toBeGreaterThan(0);
    }
    const cord = content.actions["twist_nettle_cord"];
    expect(cord).toBeDefined();
    expect(cord!.skill).toBe("leatherworking"); // Bogen-Zubehör bleibt Handwerk (Chef-Entscheid 28.08.2026)
    expect(cord!.levelRequired).toBe(1);
    expect(cord!.inputs).toEqual([{ itemId: "fiber_nettle", qty: 2 }]);
    expect(cord!.loot).toEqual([{ itemId: "bowstring", chance: 1, min: 1, max: 1 }]);
  });

  it("dig_bait existiert auf Stufe 1 (2500ms, xp 1, Basisköder + 20% Zweitköder)", () => {
    const a = content.actions["dig_bait"];
    expect(a).toBeDefined();
    expect(a!.skill).toBe("fishing");
    expect(a!.levelRequired ?? 1).toBe(1);
    expect(a!.durationMs).toBe(2500);
    expect(a!.xp).toBe(1);
    expect(a!.loot).toEqual([
      { itemId: "bait_worm", chance: 1, min: 1, max: 1 },
      { itemId: "bait_worm", chance: 0.2, min: 1, max: 1 },
    ]);
  });

  it("Skill hunting existiert (trains dex)", () => {
    const s = content.skills["hunting"];
    expect(s).toBeDefined();
    expect(s!.trains).toBe("dex");
    expect(hasText(s!.name, "en")).toBe(true);
    expect(hasText(s!.name, "de")).toBe(true);
  });

  it("Kategorien forage_fibers und weave existieren", () => {
    const ids = new Set(content.categories.map((c) => c.id));
    expect(ids.has("forage_fibers")).toBe(true);
    expect(ids.has("weave")).toBe(true);
  });

  it("genau 26 Roben-Rezepte, keines verlangt noch Leder (cured/hardened/scaled/studded_leather, warhide)", () => {
    expect(ROBE_RECIPES.length).toBe(26);
    const offenders: string[] = [];
    for (const r of ROBE_RECIPES) {
      const a: ActionDef | undefined = content.actions[r.id];
      expect(a, r.id).toBeDefined();
      for (const inp of a!.inputs ?? []) {
        if (LEATHER_FAMILY.has(inp.itemId)) offenders.push(`${r.id} → ${inp.itemId}`);
      }
    }
    expect(offenders, `Roben-Rezepte mit Leder-Rest: ${offenders.join(", ")}`).toEqual([]);
  });

  it("jedes Roben-Rezept trägt genau den Stoff seines Tiers, und die Weben-Stufe des Stoffs liegt auf/unter der Rezept-Stufe", () => {
    const offenders: string[] = [];
    for (const r of ROBE_RECIPES) {
      const a = content.actions[r.id]!;
      const tierDef = FIBER_TIERS[r.tier]!;
      const inputIds = (a.inputs ?? []).map((i) => i.itemId);
      if (!inputIds.includes(tierDef.cloth)) offenders.push(`${r.id}: erwartet ${tierDef.cloth}, hat ${inputIds.join("/")}`);
      const recipeLevel = a.levelRequired ?? 1;
      const clothLevel = content.actions[tierDef.weave]!.levelRequired ?? 1;
      if (clothLevel > recipeLevel) {
        offenders.push(`${r.id}: Rezept-Stufe ${recipeLevel} < Weben-Stufe ${tierDef.cloth} (${clothLevel})`);
      }
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });

  it("huntingZones deckt alle Zonen außer slayer_tower, Stufen/trapMs/xp aufsteigend und > 0", () => {
    const zones = content.huntingZones ?? [];
    const zoneIds = content.zones.map((z) => z.id);
    const expectedIds = zoneIds.filter((id) => id !== "slayer_tower");
    expect(zones.length).toBe(expectedIds.length);
    expect(new Set(zones.map((z) => z.zoneId))).toEqual(new Set(expectedIds));
    // Jede zoneId aus huntingZones referenziert eine echte Zone.
    const realZoneIds = new Set(zoneIds);
    for (const z of zones) expect(realZoneIds.has(z.zoneId), z.zoneId).toBe(true);
    expect(zones.some((z) => z.zoneId === "slayer_tower")).toBe(false);

    const byLevel = [...zones].sort((a, b) => a.levelRequired - b.levelRequired);
    for (let i = 1; i < byLevel.length; i++) {
      expect(byLevel[i]!.levelRequired, `${byLevel[i]!.zoneId} vs ${byLevel[i - 1]!.zoneId}`).toBeGreaterThan(byLevel[i - 1]!.levelRequired);
      expect(byLevel[i]!.trapMs, `${byLevel[i]!.zoneId} vs ${byLevel[i - 1]!.zoneId}`).toBeGreaterThan(byLevel[i - 1]!.trapMs);
      expect(byLevel[i]!.xp, `${byLevel[i]!.zoneId} vs ${byLevel[i - 1]!.zoneId}`).toBeGreaterThan(byLevel[i - 1]!.xp);
    }
    for (const z of zones) {
      expect(z.levelRequired, z.zoneId).toBeGreaterThan(0);
      expect(z.trapMs, z.zoneId).toBeGreaterThan(0);
      expect(z.xp, z.zoneId).toBeGreaterThan(0);
    }
  });
});

describe("Köder-Stufen (Chef 28.08.2026: Angeln liefert je Gebietsstufe den Köder)", () => {
  it("fünf Köder, je einer aus einer Angel-Aktion auf Stufe 1/20/40/60/80 (1 sicher + 20 % Zweitköder)", () => {
    expect(HUNT_BAIT_TIERS.map((t) => t.fishingLevel)).toEqual([1, 20, 40, 60, 80]);
    for (const t of HUNT_BAIT_TIERS) {
      const it = content.items[t.itemId];
      expect(it, t.itemId).toBeDefined();
      expect(it!.type, t.itemId).toBe("material");
      expect(it!.stackable, t.itemId).toBe(true);
      const sources = Object.values(content.actions).filter((a) => a.skill === "fishing" && a.loot?.some((l) => l.itemId === t.itemId));
      expect(sources.length, `Angel-Aktion für ${t.itemId}`).toBe(1);
      expect(sources[0]!.levelRequired, t.itemId).toBe(t.fishingLevel);
      expect(sources[0]!.loot!.map((l) => l.chance)).toEqual([1, 0.2]);
    }
  });

  it("jedes Jagdgebiet nennt den Köder seiner Stufe (Tabelle huntBaitForZoneLevel)", () => {
    for (const z of content.huntingZones ?? []) {
      expect(z.baitItemId, z.zoneId).toBe(huntBaitForZoneLevel(z.levelRequired).itemId);
    }
  });
});
