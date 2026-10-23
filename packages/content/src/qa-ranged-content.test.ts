import { describe, expect, it } from "vitest";
import { ARROW_TIER_RANGED_LEVEL, RANGED_DEFENSIVE_DMG_MULT } from "@hearthforge/shared";
import { content } from "./index";

/**
 * QA 1.4.0 Prüfrunde Fernkampf (kontrolleur, 2026-10-23): Content gegen design/1.4.0-balance-fernkampf.md.
 * Jede Tabelle wörtlich aus der Spec (§1, §2, §3, §5, §6, §7, §8, §9). Nur Nachweise.
 */
const METALS = ["copper", "bronze", "iron", "steel", "blacksteel", "mithril", "adamantium", "runite", "bloodiron", "titanium", "aetherium", "godiron"] as const;

describe("§1 Bognerei-Rezepte", () => {
  const arrowLevel = [1, 7, 12, 22, 32, 42, 52, 62, 72, 82, 91, 97];
  const arrowXp = [4, 5, 7, 13, 23, 39, 68, 118, 204, 351, 575, 809];
  it.each(METALS.map((m, i) => [m, i] as const))("fletch_%s_arrow: Level/ms/XP/Inputs/Output", (m, i) => {
    const a = content.actions[`fletch_${m}_arrow`]!;
    expect(a.skill).toBe("bowcraft");
    expect(a.levelRequired ?? 1).toBe(arrowLevel[i]);
    expect(a.durationMs).toBe(2400 + 200 * i);
    expect(a.xp).toBe(arrowXp[i]);
    expect(a.inputs).toEqual([
      { itemId: "arrow_shaft", qty: 15 },
      { itemId: `${m}_arrowheads`, qty: 15 },
      { itemId: "feather", qty: 5 },
    ]);
    expect(a.loot[0]).toMatchObject({ itemId: `${m}_arrow`, min: 15, max: 15 });
  });

  const fx = [
    ["bloodiron", 74, 4000, 225],
    ["titanium", 84, 4200, 388],
    ["aetherium", 92, 4400, 604],
    ["godiron", 98, 4600, 850],
  ] as const;
  const additive = { bleed: "fang", poison: "gloomspore", fire: "emberleaf" } as const;
  it.each(fx.flatMap(([m, lvl, ms, xp]) => (["bleed", "poison", "fire"] as const).map((e) => [m, e, lvl, ms, xp] as const)))(
    "fletch_%s_arrow_%s: Level %i, %i ms, %i XP",
    (m, e, lvl, ms, xp) => {
      const a = content.actions[`fletch_${m}_arrow_${e}`]!;
      expect(a.skill).toBe("bowcraft");
      expect(a.levelRequired ?? 1).toBe(lvl);
      expect(a.durationMs).toBe(ms);
      expect(a.xp).toBe(xp);
      expect(a.inputs).toEqual([
        { itemId: `${m}_arrow`, qty: 15 },
        { itemId: additive[e], qty: 1 },
      ]);
      expect(a.loot[0]).toMatchObject({ itemId: `${m}_arrow_${e}`, min: 15, max: 15 });
    },
  );

  const quiverLevel = [3, 8, 15, 25, 35, 45, 55, 65, 76, 86, 94, 99];
  const quiverMs = [3500, 4500, 5000, 6500, 8500, 8500, 9500, 10500, 11500, 12500, 13500, 15500];
  const quiverXp = [6, 10, 15, 32, 70, 114, 209, 379, 715, 1275, 2046, 3009];
  const quiverInputs = [
    ["cured_leather", 2, "normal_log", 2, 5],
    ["cured_leather", 3, "birchwood_log", 2, 8],
    ["cured_leather", 4, "oak_log", 3, 10],
    ["hardened_leather", 2, "ashbark_log", 3, 12],
    ["hardened_leather", 3, "blackwood_log", 3, 15],
    ["scaled_leather", 3, "blightwood_log", 4, 18],
    ["studded_leather", 2, "ironbark_log", 4, 20],
    ["studded_leather", 3, "bloodoak_log", 4, 24],
    ["warhide", 2, "shadowpine_log", 4, 28],
    ["dragonhide", 2, "wraithwood_log", 4, 32],
    ["dragonhide", 3, "bonewood_log", 5, 36],
    ["shadowhide", 2, "godwood_log", 5, 40],
  ] as const;
  it.each(METALS.map((m, i) => [m, i] as const))("fletch_%s_quiver: Level/ms/XP/Inputs", (m, i) => {
    const a = content.actions[`fletch_${m}_quiver`]!;
    expect(a.skill).toBe("bowcraft");
    expect(a.levelRequired ?? 1).toBe(quiverLevel[i]);
    expect(a.durationMs).toBe(quiverMs[i]);
    expect(a.xp).toBe(quiverXp[i]);
    const [leather, lq, log, wq, f] = quiverInputs[i]!;
    expect(a.inputs).toEqual([
      { itemId: leather, qty: lq },
      { itemId: log, qty: wq },
      { itemId: "feather", qty: f },
    ]);
    expect(a.loot[0]).toMatchObject({ itemId: `${m}_quiver`, min: 1, max: 1 });
  });

  it("Schäfte: Level 1, 2400 ms, 4 XP, 1 Normalholz → 15 Schäfte", () => {
    const a = content.actions.fletch_arrow_shaft!;
    expect(a.skill).toBe("bowcraft");
    expect(a.levelRequired ?? 1).toBe(1);
    expect(a.durationMs).toBe(2400);
    expect(a.xp).toBe(4);
    expect(a.inputs).toEqual([{ itemId: "normal_log", qty: 1 }]);
    expect(a.loot[0]).toMatchObject({ itemId: "arrow_shaft", min: 15, max: 15 });
  });

  it("Bogen-Umzug: alle 26 Bögen + 3 Sehnen bei Bognerei, Schilde beim Handwerk, Skill bowcraft existiert, fletching nicht", () => {
    expect(content.skills.bowcraft).toBeDefined();
    expect((content.skills as Record<string, unknown>).fletching).toBeUndefined();
    const bows = Object.values(content.actions).filter((a) => /^fletch_[a-z]+_(shortbow|longbow)$/.test(a.id));
    expect(bows).toHaveLength(26);
    for (const b of bows) expect(b.skill).toBe("bowcraft");
    for (const id of ["fletch_bowstring", "twist_rawhide_cord", "twist_nettle_cord"]) expect(content.actions[id]?.skill).toBe("bowcraft");
    for (const id of ["fletch_willowbark_shield", "fletch_grimwood_shield", "fletch_ashfen_buckler", "fletch_voidwood_pavise"]) expect(content.actions[id]?.skill).toBe("leatherworking");
  });
});

describe("§2 Pfeilspitzen (Schmiede)", () => {
  const lvl = [1, 5, 10, 20, 30, 35, 45, 55, 65, 75, 85, 95];
  const ms = [2500, 3000, 3000, 4500, 5000, 5000, 6000, 6500, 7500, 8000, 8500, 10000];
  const xp = [4, 6, 7, 18, 32, 41, 80, 143, 270, 473, 825, 1593];
  it.each(METALS.map((m, i) => [m, i] as const))("forge_%s_arrowheads", (m, i) => {
    const a = content.actions[`forge_${m}_arrowheads`]!;
    expect(a.skill).toBe("smithing");
    expect(a.levelRequired ?? 1).toBe(lvl[i]);
    expect(a.durationMs).toBe(ms[i]);
    expect(a.xp).toBe(xp[i]);
    expect(a.inputs).toEqual([{ itemId: `${m}_bar`, qty: 1 }]);
    expect(a.loot[0]).toMatchObject({ itemId: `${m}_arrowheads`, min: 45, max: 45 });
  });
});

describe("§3 Pfeile", () => {
  const bonus: [number, number][] = [[0.2, 0.3], [0.3, 0.4], [0.4, 0.6], [0.5, 0.8], [0.6, 1.0], [0.8, 1.1], [1.0, 1.4], [1.3, 1.7], [1.6, 2.1], [1.9, 2.6], [3.4, 4.6], [5.8, 7.8]];
  const value = [2, 2, 2, 3, 3, 4, 5, 6, 6, 8, 10, 13];
  const headValue = [1, 1, 1, 1, 2, 2, 3, 4, 5, 6, 8, 11];
  it.each(METALS.map((m, i) => [m, i] as const))("%s_arrow: Stufe, Bonus, Wert, Regal; Spitzen-Wert", (m, i) => {
    const a = content.items[`${m}_arrow`]!;
    expect(a.type).toBe("material");
    expect(a.stackable).toBe(true);
    expect(a.shelf).toBe("arrows");
    expect(a.arrow).toEqual({ tier: i + 1, bonusMin: bonus[i]![0], bonusMax: bonus[i]![1] });
    expect(a.value).toBe(value[i]);
    const h = content.items[`${m}_arrowheads`]!;
    expect(h.shelf).toBe("arrows");
    expect(h.value).toBe(headValue[i]);
    expect(h.arrow).toBeUndefined();
    expect(ARROW_TIER_RANGED_LEVEL[i]).toBe(content.items[`${m}_quiver`]!.requirements?.ranged);
  });

  const fx = [
    ["bloodiron", 9, 1.2, 1.6, 3.0, 1.8, 1.5, 7, 11, 8],
    ["titanium", 10, 1.4, 2.0, 3.5, 2.0, 2.0, 8, 12, 9],
    ["aetherium", 11, 2.6, 3.5, 4.0, 2.4, 2.5, 10, 14, 11],
    ["godiron", 12, 4.4, 5.9, 5.0, 2.8, 3.0, 13, 17, 14],
  ] as const;
  it.each(fx)("%s Effektpfeile: 75 % Rohbonus, Status je Spec, Werte", (m, tier, min, max, bleed, poison, burn, vB, vP, vF) => {
    const b = content.items[`${m}_arrow_bleed`]!;
    const p = content.items[`${m}_arrow_poison`]!;
    const f = content.items[`${m}_arrow_fire`]!;
    for (const it of [b, p, f]) {
      expect(it.shelf).toBe("arrows");
      expect(it.arrow).toMatchObject({ tier, bonusMin: min, bonusMax: max });
    }
    expect(b.arrow!.effect).toEqual({ type: "bleed", chance: 0.25, magnitude: bleed, durationMs: 6000 });
    expect(p.arrow!.effect).toEqual({ type: "poison", chance: 0.25, magnitude: poison, durationMs: 5000 });
    expect(f.arrow!.effect).toEqual({ type: "burn", chance: 0.2, magnitude: burn, durationMs: 4000 });
    expect([b.value, p.value, f.value]).toEqual([vB, vP, vF]);
  });

  it("Schaft: Wert 1, Regal Pfeile; genau 24 Pfeilarten (12 + 12 Effekt)", () => {
    expect(content.items.arrow_shaft).toMatchObject({ value: 1, shelf: "arrows", type: "material" });
    expect(Object.values(content.items).filter((i) => i.arrow).length).toBe(24);
  });
});

describe("§5 Köcher", () => {
  const rows = [
    [1, 1, 0, 0.01, 0.01, 0.04, "common", 48],
    [5, 2, 0, 0.01, 0.02, 0.05, "common", 76],
    [10, 3, 0, 0.015, 0.02, 0.06, "common", 112],
    [20, 4, 0, 0.025, 0.03, 0.07, "common", 182],
    [30, 4, 1, 0.02, 0.04, 0.08, "common", 285],
    [40, 5, 1, 0.025, 0.04, 0.09, "common", 356],
    [50, 5, 2, 0.025, 0.05, 0.1, "common", 550],
    [60, 6, 2, 0.03, 0.06, 0.11, "common", 941],
    [70, 6, 3, 0.03, 0.06, 0.12, "common", 1592],
    [80, 7, 3, 0.03, 0.07, 0.13, "common", 2288],
    [90, 8, 3, 0.035, 0.08, 0.14, "rare", 3704],
    [99, 9, 3, 0.04, 0.08, 0.15, "epic", 6320],
  ] as const;
  it.each(METALS.map((m, i) => [m, i] as const))("%s_quiver", (m, i) => {
    const [req, dex, lck, crit, prec, save, rarity, value] = rows[i]!;
    const q = content.items[`${m}_quiver`]!;
    expect(q).toMatchObject({ type: "equipment", slot: "offhand", weaponStyle: "ranged", weaponType: "quiver", rarity, value, requirements: { ranged: req }, precision: prec });
    expect(q.twoHanded).toBeFalsy();
    expect(q.modifiers).toEqual(lck > 0 ? { dex, lck } : { dex });
    expect(q.bonus?.critChance).toBeCloseTo(crit, 9);
    expect(q.weaponEffect).toEqual({ type: "ammoSaver", chance: 1, magnitude: save, durationMs: 0 });
    expect(q.damageMin).toBeUndefined();
  });
});

describe("§6 Bögen", () => {
  it("alle Fernkampf-Haupthände sind shortbow/longbow und zweihändig (Köcher-Regel lückenlos)", () => {
    const ranged = Object.values(content.items).filter((i) => i.weaponStyle === "ranged" && i.slot === "mainhand");
    expect(ranged.length).toBeGreaterThan(60);
    for (const b of ranged) {
      expect(["shortbow", "longbow"]).toContain(b.weaponType);
      expect(b.twoHanded).toBe(true);
    }
  });
  const craft: Array<[string, number, number]> = [
    ["copper_shortbow", 1.1, 1.4], ["bronze_shortbow", 1.6, 2.2], ["iron_shortbow", 2.1, 2.9], ["steel_shortbow", 2.6, 3.6],
    ["blacksteel_shortbow", 3.2, 4.4], ["mithril_shortbow", 4.0, 5.6], ["adamantium_shortbow", 5.0, 6.9], ["runite_shortbow", 6.3, 8.8],
    ["bloodiron_shortbow", 7.8, 10.8], ["titanium_shortbow", 9.7, 13.5], ["aetherium_shortbow", 12.7, 17.5], ["censerwood_shortbow", 14.5, 19.9],
    ["godiron_shortbow", 15.9, 21.9],
    ["copper_longbow", 1.0, 1.5], ["bronze_longbow", 1.6, 2.4], ["iron_longbow", 2.1, 3.1], ["steel_longbow", 2.6, 4.0],
    ["blacksteel_longbow", 3.2, 4.8], ["mithril_longbow", 4.0, 6.2], ["adamantium_longbow", 5.0, 7.6], ["runite_longbow", 6.3, 9.6],
    ["bloodiron_longbow", 7.8, 11.8], ["titanium_longbow", 9.6, 14.7], ["aetherium_longbow", 12.7, 19.0], ["censerwood_longbow", 14.5, 21.7],
    ["godiron_longbow", 15.9, 23.8],
    ["farmhand_sling", 2.0, 3.2], ["drovers_shortbow", 2.2, 2.9], ["stolen_shortbow", 3.1, 4.7], ["spectral_hunter_bow", 6.0, 10.1],
    ["driftwood_bow", 12.2, 18.3], ["skytalon_recurve", 15.3, 23.3], ["abyssal_tide_bow", 11.6, 19.3], ["crownless_warbow", 20.7, 28.5],
    ["nameless_longbow", 19.0, 28.5], ["voidwing_greatbow", 16.7, 25.0], ["blackantler_warbow", 12.6, 19.2],
  ];
  it.each(craft)("%s: %f–%f", (id, min, max) => {
    expect(content.items[id]).toMatchObject({ damageMin: min, damageMax: max });
  });
});

describe("§7–§9 Rune, Haltung, Beute, Federn, Meisterring", () => {
  it("Jägerisch I–III: Geschick 3/6/10, kein Glück", () => {
    const def = content.affixes!.affix_hunter!;
    expect(def.modifiersByTier).toEqual([{ dex: 3 }, { dex: 6 }, { dex: 10 }]);
    expect(def.bonusByTier).toEqual([{}, {}, {}]);
    expect(def.appliesTo).toEqual(["weapon_ranged"]);
  });
  it("Abwehrhaltung Fernkampf: Schaden ×0,9", () => {
    expect(RANGED_DEFENSIVE_DMG_MULT).toBe(0.9);
  });
  it.each([
    ["skeleton_archer", 0.5, 2, 4],
    ["goblin_crossbower", 0.4, 1, 3],
    ["tide_siren", 0.6, 3, 6],
  ])("Federn: %s %f × %i–%i", (m, chance, min, max) => {
    const row = content.monsters[m]!.loot.find((l) => l.itemId === "feather");
    expect(row).toMatchObject({ chance, min, max });
  });
  it.each([
    ["gray_wolf", "direhide_jerkin", 0.0004], ["gray_wolf", "thornwolf_pelt_hood", 0.0008], ["frost_hound", "direhide_jerkin", 0.0004],
    ["slag_kobold", "skygrip_gauntlets", 0.0006], ["skarn_whelp", "wyvernscale_aegis", 0.0004], ["prayer_eater", "cloudwalker_boots", 0.0005],
    ["goblin", "stolen_shortbow", 0.0007], ["ashfield_jackal", "ratpelt_cap", 0.001], ["mire_crawler", "chitinweave_leggings", 0.0008],
  ])("Beute: %s → %s (%f)", (m, item, chance) => {
    const row = content.monsters[m]!.loot.find((l) => l.itemId === item);
    expect(row).toMatchObject({ chance, min: 1, max: 1 });
    // Regel 4 (Spec §9): Anforderung ≤ Zonen-Höchstlevel (nicht Monster-Level).
    const def = content.items[item]!;
    const maxReq = Math.max(...Object.values(def.requirements ?? {}).map((v) => v ?? 0));
    const zoneOf = (x: unknown): unknown => (x as Record<string, unknown>).zone ?? (x as Record<string, unknown>).zoneId;
    const zone = zoneOf(content.monsters[m]!);
    const zoneMax = Math.max(...Object.values(content.monsters).filter((x) => zoneOf(x) === zone).map((x) => x.level));
    expect(maxReq).toBeLessThanOrEqual(zoneMax);
  });
  it("Meisterring Bognerei, Erfolge 25–99, Vollendungsring verlangt bowcraft 99", () => {
    expect(content.items.ring_master_bowcraft).toMatchObject({ slot: "ring1", requirements: { bowcraft: 99 } });
    for (const n of [25, 50, 75, 90, 99]) {
      const a = content.achievements.find((x) => x.id === `ach_skill_bowcraft_${n}`);
      expect(a?.condition).toMatchObject({ type: "skill_level", target: "bowcraft", count: n });
    }
    const completion = Object.values(content.items).find((i) => i.id.startsWith("ring_master_") && i.requirements?.bowcraft === 99 && Object.keys(i.requirements).length > 1);
    expect(completion).toBeDefined();
    expect(Object.keys(completion!.requirements!)).toHaveLength(23);
  });
});
