import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import {
  ARMOR_PEN_CAP,
  BLOCK_CAP,
  DODGE_CAP,
  DODGE_EFF_MAX,
  K_DODGE,
  PRECISION_CAP,
  WARD_BREAK_CAP,
  WARD_CORE_PER_INT,
  WARD_RECHARGE_PER_CAST,
  WARD_RECHARGE_PCT_PER_CAST,
  absorbWard,
  castWardRecharge,
  rechargeWard,
} from "@hearthforge/shared";
import type { ContentDB } from "@hearthforge/shared";
import { createGame } from "./state";
import { computeStats } from "./character";

/**
 * Rüstungs-Trinität / Itemization 2.5 (design/armor-trinity-spec.md), Phase A1 — Engine-Fundament.
 * Prüft die neuen computeStats-Klassen-Schichten (armorRating/dodgeChance/blockChance/maxWard) sowie
 * die reinen Ward-Helfer (rechargeWard/absorbWard), die combat.ts in A2 verdrahtet. KEIN Kampf hier —
 * das Absorb/Recharge/Dodge/Block-Rolling im Fight ist combat-dev-Scope (A2).
 */

// Lokaler Content-Klon mit den vier neuen Klassen-Schicht-Feldern auf realen Items (content-dev prägt
// die echten Werte erst später auf; das contentWithCrops-Testpattern hält den Test content-neutral).
function contentWithLayers(overrides: Record<string, Partial<ContentDB["items"][string]>>): ContentDB {
  const items = { ...content.items };
  for (const [id, patch] of Object.entries(overrides)) {
    items[id] = { ...items[id]!, ...patch };
  }
  return { ...content, items };
}

describe("Rüstungs-Trinität: computeStats-Klassen-Schichten", () => {
  it("Platte: defense = Σ armorRating (roh via armorRating-Feld, KEIN CON-Term mehr)", () => {
    const c = contentWithLayers({
      iron_platebody: { armorRating: 1.9 },
      iron_platelegs: { armorRating: 1.4 },
    });
    const s = createGame({ name: "T" }, c, 1);
    s.character.equipment.body = "iron_platebody";
    s.character.equipment.legs = "iron_platelegs";
    const st = computeStats(s, c);
    // armorRating = Σ; defense = armorRating · defMult (Default-Stance defMult=1).
    expect(st.armorRating).toBeCloseTo(1.9 + 1.4, 6);
    expect(st.defense).toBeCloseTo(1.9 + 1.4, 6);
  });

  it("Leder: dodgeChance = DODGE_EFF_MAX·Σevr/(Σevr+K_DODGE) diminishing, auf DODGE_CAP gedeckelt (#301)", () => {
    // Armor-Iteration 2 §5.1: LINEAR (Σ/100) → diminishing; Evasion-Tempo-Zähmung #301: Asymptote
    // DODGE_EFF_MAX (0.5) über dem Cap (0.40), K_DODGE 45→60 (Kurve gestreckt).
    const c = contentWithLayers({
      iron_platebody: { evasionRating: 20 },
      iron_platelegs: { evasionRating: 15 },
    });
    const s = createGame({ name: "T" }, c, 1);
    s.character.equipment.body = "iron_platebody";
    s.character.equipment.legs = "iron_platelegs";
    // Σevr = 35 → 0.5·35/(35+60) = 0.1842 (Armor-Iter-2-Kurve: 0.4375; früher linear 0.35).
    expect(computeStats(s, c).dodgeChance).toBeCloseTo((DODGE_EFF_MAX * 35) / (35 + K_DODGE), 6);

    // Deckel: sehr hohes evasionRating → DODGE_CAP (Kurve übersteigt 0.40 ab Σevr 240).
    const capC = contentWithLayers({ iron_platebody: { evasionRating: 500 } });
    const capS = createGame({ name: "T" }, capC, 1);
    capS.character.equipment.body = "iron_platebody";
    expect(computeStats(capS, capC).dodgeChance).toBe(DODGE_CAP);
  });

  it("Schild: blockChance = MAX (ein Schild), auf BLOCK_CAP gedeckelt, 0 bei 2H", () => {
    const c = contentWithLayers({ iron_kiteshield: { blockChance: 0.2 } });
    const s = createGame({ name: "T" }, c, 1);
    s.character.equipment.offhand = "iron_kiteshield";
    expect(computeStats(s, c).blockChance).toBeCloseTo(0.2, 6);

    // Deckel.
    const capC = contentWithLayers({ iron_kiteshield: { blockChance: 0.9 } });
    const capS = createGame({ name: "T" }, capC, 1);
    capS.character.equipment.offhand = "iron_kiteshield";
    expect(computeStats(capS, capC).blockChance).toBe(BLOCK_CAP);
  });

  it("Stoff: maxWard = int·WARD_CORE_PER_INT + Σ wardCapacity", () => {
    const c = contentWithLayers({
      iron_platebody: { wardCapacity: 12 },
      iron_platelegs: { wardCapacity: 8 },
    });
    const s = createGame({ name: "T" }, c, 1);
    const intVal = computeStats(s, c).attributes.int;
    s.character.equipment.body = "iron_platebody";
    s.character.equipment.legs = "iron_platelegs";
    expect(computeStats(s, c).maxWard).toBeCloseTo(WARD_CORE_PER_INT * intVal + 12 + 8, 6);
  });

  it("2H-Melee bekommt KEINEN Waffen-armorRating mehr (#221) — nur getragene Platte zählt", () => {
    // Combat-Depth #221: der frühere `twoHandMeleeArmorBonus` (`weaponAR · min(1, plateWorn/4)`) ist
    // ENTFERNT. 2H-Melee = bewusster Glass-Cannon: armorRating = ausschließlich die getragene Platten-Σ,
    // der Waffen-armorRating schlägt NIE durch (weder nackt, halb- noch voll-gepanzert). Nicht-Melee-2H
    // (Stab) verhält sich identisch (erbte schon vorher nichts). Eine reale 2H-Melee-Waffe und einen 2H-Stab finden.
    const melee2h = Object.values(content.items).find(
      (i) => i.twoHanded && i.weaponStyle === "melee",
    );
    const staff2h = Object.values(content.items).find(
      (i) => i.twoHanded && i.weaponStyle === "magic",
    );
    expect(melee2h, "Content muss eine 2H-Melee-Waffe liefern").toBeTruthy();
    expect(staff2h, "Content muss eine 2H-Magiewaffe liefern").toBeTruthy();

    const c = contentWithLayers({
      [melee2h!.id]: { armorRating: 8 }, // darf NIE mehr durchschlagen (Waffe gibt keine Rüstung)
      [staff2h!.id]: { armorRating: 8 },
      iron_fullhelm: { armorRating: 1 },
      iron_platebody: { armorRating: 2 },
      iron_platelegs: { armorRating: 1 },
      iron_gauntlets: { armorRating: 1 },
    });
    const equipFullPlate = (s: ReturnType<typeof createGame>): void => {
      s.character.equipment.helmet = "iron_fullhelm";
      s.character.equipment.body = "iron_platebody";
      s.character.equipment.legs = "iron_platelegs";
      s.character.equipment.gloves = "iron_gauntlets";
    };

    // (a) Nackter 2H-Melee (nur Waffe, 0 Platten-Teile): 0 Armor = ungepanzert (Glass-Cannon).
    const nakedS = createGame({ name: "N" }, c, 1);
    nakedS.character.equipment.mainhand = melee2h!.id;
    expect(computeStats(nakedS, c).armorRating).toBe(0);

    // (b) 2H-Melee mit voller Platte (4 Teile): NUR die Platte-Σ (1+2+1+1=5), KEIN Waffen-Bonus mehr.
    const meleeS = createGame({ name: "M" }, c, 1);
    meleeS.character.equipment.mainhand = melee2h!.id;
    equipFullPlate(meleeS);
    expect(computeStats(meleeS, c).armorRating).toBeCloseTo(5, 6);

    // (c) 2H-Melee mit halber Platte (2 Teile): NUR die Platte-Σ (1+2=3), unabhängig von der Waffe.
    const halfS = createGame({ name: "H" }, c, 1);
    halfS.character.equipment.mainhand = melee2h!.id;
    halfS.character.equipment.helmet = "iron_fullhelm"; // armorRating 1
    halfS.character.equipment.body = "iron_platebody"; // armorRating 2
    expect(computeStats(halfS, c).armorRating).toBeCloseTo(3, 6);

    // (d) Nicht-Melee-2H (Stab) mit voller Platte: unverändert nur die Platte-Σ (5) — der Stab-armorRating
    // (8) schlägt NICHT durch (wie bisher).
    const magicS = createGame({ name: "C" }, c, 1);
    magicS.character.equipment.mainhand = staff2h!.id;
    equipFullPlate(magicS);
    expect(computeStats(magicS, c).armorRating).toBeCloseTo(5, 6);
  });

  it("nackt: alle Klassen-Schichten sind 0 (armorRating/dodge/block), maxWard nur INT-Kern", () => {
    const s = createGame({ name: "N" }, content, 1);
    s.character.equipment.mainhand = null; // Starter-Waffe ablegen
    const st = computeStats(s, content);
    expect(st.armorRating).toBe(0);
    expect(st.defense).toBe(0);
    expect(st.dodgeChance).toBe(0);
    expect(st.blockChance).toBe(0);
    expect(st.maxWard).toBeCloseTo(WARD_CORE_PER_INT * st.attributes.int, 6);
  });
});

describe("Rüstungs-Trinität: Ward-Helfer (Vertrag für combat.ts A2)", () => {
  it("rechargeWard lädt WARD_RECHARGE_PER_CAST je Zauber (Zauberreserve: fester Betrag statt manaSpent·WARD_PER_MANA), gedeckelt auf maxWard", () => {
    expect(rechargeWard(0, 100)).toBeCloseTo(WARD_RECHARGE_PER_CAST, 6); // 1.2 je Zauber (= früher 6·0.20)
    expect(rechargeWard(0, 100, 6)).toBeCloseTo(6, 6); // expliziter Betrag
    expect(rechargeWard(98, 100, 10)).toBe(100); // Deckel
    expect(rechargeWard(50, 100, 0)).toBe(50); // kein Betrag, kein Recharge
    expect(rechargeWard(50, 100, -5)).toBe(50); // negativer Betrag ignoriert
  });

  // claude:2026-10-25T19:05:00+02:00 — 1.4.0 „Zauber laden den Schild“ (Chef-Entscheid Welle 5).
  it("castWardRecharge: 4 % des Ward-Maximums je Zauber, nie weniger als der alte feste Betrag", () => {
    expect(WARD_RECHARGE_PCT_PER_CAST).toBe(0.04);
    expect(castWardRecharge(2000)).toBeCloseTo(80, 6);
    expect(castWardRecharge(1000)).toBeCloseTo(40, 6);
    expect(castWardRecharge(20)).toBe(WARD_RECHARGE_PER_CAST); // kleiner Pool: Boden 1,2
    expect(castWardRecharge(0)).toBe(WARD_RECHARGE_PER_CAST);
    expect(castWardRecharge(NaN)).toBe(WARD_RECHARGE_PER_CAST);
  });

  it("rechargeWard ist NaN-fest (nicht-endliche Eingaben lassen den Stand stehen)", () => {
    expect(rechargeWard(NaN, 100, 6)).toBeNaN();
    expect(rechargeWard(50, Infinity, 6)).toBe(50);
    expect(rechargeWard(50, 100, NaN)).toBe(50);
  });

  it("absorbWard zieht Schaden zuerst vom Ward-Pool ab, Rest auf HP", () => {
    // Ward deckt den Treffer teilweise.
    expect(absorbWard(4, 10)).toEqual({ ward: 0, absorbed: 4, hpDamage: 6 });
    // Ward deckt den Treffer voll.
    expect(absorbWard(20, 8)).toEqual({ ward: 12, absorbed: 8, hpDamage: 0 });
    // Kein Ward → alles auf HP.
    expect(absorbWard(0, 7)).toEqual({ ward: 0, absorbed: 0, hpDamage: 7 });
    // NaN/negativ defensiv auf 0.
    expect(absorbWard(NaN, 5)).toEqual({ ward: 0, absorbed: 0, hpDamage: 5 });
    expect(absorbWard(5, -3)).toEqual({ ward: 5, absorbed: 0, hpDamage: 0 });
  });
});

describe("Combat-Depth: Konter-Stats (Waffen-Signatur → DerivedStats, Spec §3.3)", () => {
  it("aggregiert armorPen/precision/wardBreak aus der ausgerüsteten Waffe", () => {
    const melee = Object.values(content.items).find((i) => i.weaponStyle === "melee");
    expect(melee, "Content muss eine Melee-Waffe liefern").toBeTruthy();
    const c = contentWithLayers({
      [melee!.id]: { armorPen: 0.3, precision: 0.2, wardBreak: 0.1 },
    });
    const s = createGame({ name: "K" }, c, 1);
    s.character.equipment.mainhand = melee!.id;
    const st = computeStats(s, c);
    // Die Mainhand IST die Signatur-Quelle (anders als armorRating wird sie NICHT ausgelassen).
    expect(st.armorPen).toBeCloseTo(0.3, 6);
    expect(st.precision).toBeCloseTo(0.2, 6);
    expect(st.wardBreak).toBeCloseTo(0.1, 6);
  });

  it("ohne Signatur sind alle drei Konter-Stats 0", () => {
    const s = createGame({ name: "K0" }, content, 1);
    const st = computeStats(s, content);
    expect(st.armorPen).toBe(0);
    expect(st.precision).toBe(0);
    expect(st.wardBreak).toBe(0);
  });

  it("klemmt jeden Konter-Stat auf seinen Cap (nie 100-%-Negation)", () => {
    const melee = Object.values(content.items).find((i) => i.weaponStyle === "melee");
    const c = contentWithLayers({
      [melee!.id]: { armorPen: 5, precision: 5, wardBreak: 5 },
    });
    const s = createGame({ name: "Kmax" }, c, 1);
    s.character.equipment.mainhand = melee!.id;
    const st = computeStats(s, c);
    expect(st.armorPen).toBe(ARMOR_PEN_CAP);
    expect(st.precision).toBe(PRECISION_CAP);
    expect(st.wardBreak).toBe(WARD_BREAK_CAP);
  });
});

describe("Rüstungs-Trinität: frischer Charakter startet mit vollem Ward", () => {
  it("createGame finalisiert character.ward = maxWard (mirror hp/mana)", () => {
    // Armor-Iteration 2 §2: WARD_CORE_PER_INT=0 ⇒ ein frischer Char OHNE Stoffgear hat maxWard 0
    // (kein INT-Kern mehr). Der Mirror (ward === maxWard) gilt trotzdem.
    const s = createGame({ name: "W" }, content, 1);
    expect(s.character.ward).toBe(computeStats(s, content).maxWard);
    expect(s.character.ward).toBe(0); // ohne Stoffgear kein Ward

    // Mit Stoffgear (wardCapacity auf der Starter-Waffe injiziert) füllt createGame den Ward auf den
    // positiven maxWard → der Mirror trägt auch einen echten Pool.
    const c = contentWithLayers({ rusty_sword: { wardCapacity: 40 } });
    const s2 = createGame({ name: "W2" }, c, 1);
    expect(s2.character.ward).toBe(computeStats(s2, c).maxWard);
    expect(s2.character.ward).toBeGreaterThan(0);
  });
});
