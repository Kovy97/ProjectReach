import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { createGame } from "./state";
import { equipItem } from "./equipment";
import { computeStats } from "./character";
import { addItem } from "./inventory";
import { xpForLevel } from "./leveling";

describe("combat styles", () => {
  it("Fernkampf hat höhere Krit-Chance und schnellere Angriffe als Nahkampf", () => {
    const s = createGame({ name: "Schütze", baseAttributes: { dex: 5 } }, content, 1);
    const melee = computeStats(s, content); // unbewaffnet = Nahkampf

    addItem(s.inventory, content, "copper_shortbow", 1);
    expect(equipItem(s, content, "copper_shortbow").ok).toBe(true);
    // „Schnellere Angriffe" gehört jetzt zur Fast-Stance (OSRS-Stil); Default-Präzise ist langsamer.
    s.character.rangedStance = "fast";
    const ranged = computeStats(s, content);

    expect(ranged.style).toBe("ranged");
    expect(ranged.critChance).toBeGreaterThan(melee.critChance);
    expect(ranged.attackIntervalMs).toBeLessThan(melee.attackIntervalMs);
  });

  it("Fernkampf-STIL gewährt KEINEN Evasion-Bonus mehr (QA Run3: Glass-Cannon-Identität)", () => {
    // Bei gleicher dex darf der Fernkampf-Stil nicht von sich aus tankiger sein als Nahkampf.
    // Der frühere flache `evasion += 5` machte den Leder-Schützen wendiger als den Platten-
    // Nahkämpfer — entfernt. Evasion kommt jetzt nur aus Attributen/Defence-Skill/Gear.
    const s = createGame({ name: "Schütze", baseAttributes: { dex: 5 } }, content, 1);
    const melee = computeStats(s, content); // unbewaffnet = Nahkampf

    addItem(s.inventory, content, "copper_shortbow", 1); // Bogen ohne Evasion-Bonus
    expect(equipItem(s, content, "copper_shortbow").ok).toBe(true);
    const ranged = computeStats(s, content);

    expect(ranged.style).toBe("ranged");
    expect(ranged.evasion).toBeLessThanOrEqual(melee.evasion);
  });

  it("Waffe bestimmt den Schaden-Stat (Bogen → rangedDamage)", () => {
    const s = createGame({ name: "Schütze", baseAttributes: { dex: 8 } }, content, 1);
    addItem(s.inventory, content, "copper_shortbow", 1);
    equipItem(s, content, "copper_shortbow");
    const st = computeStats(s, content);
    // itemization-parity-fix §1.2 (Waffen 2.0): copper_shortbow trägt jetzt damageMin/damageMax
    // (Range-Form) statt eines bonus.rangedDamage-Flats — rangedDamage bleibt der REINE
    // Charakter-Anteil (ohne Waffe), attackDamage = Charakter-Anteil + Waffen-Spannen-Mittel
    // (munitionsfrei seit #286) ist die einzige Budget-Quelle und liegt ÜBER dem reinen Charakter-Stat.
    expect(st.attackDamage).toBeGreaterThan(st.rangedDamage);
  });

  it("Magie-Defensiv-Stance kostet −15 % Cast-Schaden (Armor-It2.1 #4: dmgMult 0.85)", () => {
    // #4: Die Defensiv-Magie-Stance ist jetzt ein echter Tradeoff — −15 % Schaden (~+18 % TTK)
    // gegen den ×1.5-Ward-Regen (vorher gratis). Der dmgMult MUSS in den Cast-Schaden fließen,
    // sonst wäre die activeStanceMods-Änderung tot (magicDamage → charDamage → attackDamageMin/Max).
    const s = createGame({ name: "Magier", baseAttributes: { int: 20 } }, content, 1);
    s.character.equipment.mainhand = "gnarled_staff"; // weaponStyle: "magic"
    s.character.magicStance = "offensive";
    const off = computeStats(s, content);
    s.character.magicStance = "defensive";
    const def = computeStats(s, content);
    expect(off.style).toBe("magic");
    expect(def.style).toBe("magic");
    expect(off.magicDamage).toBeGreaterThan(0); // Sanity: es gibt überhaupt Cast-Schaden zu senken
    // magicDamage skaliert exakt mit dem dmgMult (0.85) — der reine Charakter-Cast-Schaden.
    expect(def.magicDamage).toBeCloseTo(off.magicDamage * 0.85, 6);
    // …und darüber der tatsächliche Cast-Schaden (attackDamage), den combat.ts pro Zauber auflöst.
    expect(def.attackDamage).toBeLessThan(off.attackDamage);
  });
});

describe("stil-abhängige Treffsicherheit (Balance-Audit B1)", () => {
  // Treffsicherheit muss mit dem OFFENSE-Skill des AKTIVEN Stils wachsen, nicht pauschal mit Attack.
  // Vorher addierte die Accuracy stets Attack·2 → ein Magier traf nie zuverlässiger, egal wie hoch
  // sein Magie-Skill war. Jetzt: Melee→Attack, Ranged→Ranged, Magie→Magie-Offense (gleiches Gewicht).

  it("Magie-Accuracy skaliert mit dem Magie-Offense-Skill", () => {
    const low = createGame({ name: "Magier", baseAttributes: { int: 5 } }, content, 1);
    low.character.equipment.mainhand = "gnarled_staff"; // weaponStyle: "magic"
    const high = createGame({ name: "Magier", baseAttributes: { int: 5 } }, content, 1);
    high.character.equipment.mainhand = "gnarled_staff";
    high.skills["magic"] = { xp: xpForLevel(50) };

    const stLow = computeStats(low, content);
    const stHigh = computeStats(high, content);
    expect(stLow.style).toBe("magic");
    expect(stHigh.style).toBe("magic");
    expect(stHigh.accuracy).toBeGreaterThan(stLow.accuracy);
  });

  it("ein Magier mit hohem Magie-Skill trifft so zuverlässig wie ein gleichwertiger Krieger", () => {
    // Isoliert den Offense-Skill-Term: Beide bekommen dasselbe dex-Attribut-Training (Attack UND
    // Ranged trainieren dex). Der Krieger zieht seine dex aus Attack L50, der Magier aus Ranged L50
    // — Summe der dex-trainierenden Skill-Level ist identisch. Damit bleibt als einziger Unterschied
    // der Offense-Skill-Beitrag zur Accuracy (Attack·2 vs. Magie-Offense·2), der jetzt gleich wiegt.
    const mage = createGame({ name: "Magier", baseAttributes: { dex: 5 } }, content, 1);
    mage.character.equipment.mainhand = "gnarled_staff"; // Magie-Stil
    mage.skills["magic"] = { xp: xpForLevel(50) }; // Offense-Term
    mage.skills["ranged"] = { xp: xpForLevel(50) }; // gleicht das dex-Training des Kriegers aus

    const warrior = createGame({ name: "Krieger", baseAttributes: { dex: 5 } }, content, 1);
    // Start-Schwert ablegen → unbewaffnet = Nahkampf ohne accuracy-Bonus (isoliert den Offense-Term).
    warrior.character.equipment.mainhand = null;
    // Neutrale Acc-Stance (Angriff gäbe +12% Bonus, Magie-Offensiv 0) → isoliert den Offense-Term.
    warrior.character.combatStyle = "defensive";
    warrior.skills["attack"] = { xp: xpForLevel(50) }; // Offense-Term + dex-Training

    const mageStats = computeStats(mage, content);
    const warriorStats = computeStats(warrior, content);
    expect(mageStats.style).toBe("magic");
    expect(warriorStats.style).toBe("melee");
    // Gleiche dex, gleiches Offense-Skill-Level, kein accuracy-Bonus an Stab/Faust → identische Accuracy.
    expect(mageStats.attributes.dex).toBe(warriorStats.attributes.dex);
    expect(mageStats.accuracy).toBe(warriorStats.accuracy);
  });

  it("Nahkampf-Accuracy bleibt unverändert vom Magie-Skill (keine Regression)", () => {
    const base = createGame({ name: "Krieger", baseAttributes: { dex: 5 } }, content, 1);
    const withMagic = createGame({ name: "Krieger", baseAttributes: { dex: 5 } }, content, 1);
    // Hoher Magie-Skill darf die NAHKAMPF-Treffsicherheit nicht beeinflussen.
    withMagic.skills["magic"] = { xp: xpForLevel(50) };
    expect(computeStats(withMagic, content).accuracy).toBe(computeStats(base, content).accuracy);
  });
});
