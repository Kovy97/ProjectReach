import { describe, expect, it } from "vitest";
import type { ContentDB, ItemDef, MonsterDef } from "@hearthforge/shared";
import { content } from "@hearthforge/content";
import { createGame } from "./state";
import { startCombat, combatStep } from "./combat";
import { computeStats } from "./character";

/**
 * Rüstungs-Trinität / Itemization 2.5 (Phase A2): der alte Ad-hoc-Manaschild (`applyManaShield`,
 * MANA_SHIELD_*) ist ERSETZT durch den Stoff-WARD (§1.4). Dieser Test pinnt die Semantik-Umstellung:
 *   - Mana ist KEIN Defensiv-Puffer mehr — ein eingehender Treffer zieht kein Mana mehr ab.
 *   - Der Ward-Pool (nicht Mana) fängt Treffer VOR der HP ab (Magie-Survival-Identität).
 *
 * (Die vier Mechaniken im Detail — Dodge/Block/One-Shot-Cap/Ward-Absorb/Recharge — liegen in
 *  armor-trinity-combat.test.ts; hier nur der Kontrast „Mana ≠ Schild, Ward = Schild".)
 */

const WAND: ItemDef = {
  id: "ms_wand",
  name: "Manaschild-Test-Zepter",
  type: "equipment",
  stackable: false,
  slot: "mainhand",
  weaponStyle: "magic",
  twoHanded: false,
  bonus: { magicDamage: 5, accuracy: 40 },
  manaCost: 10,
};

function robe(id: string, wardCapacity: number): ItemDef {
  return { id, name: id, type: "equipment", stackable: false, slot: "body", wardCapacity } as ItemDef;
}

function withAll(items: ItemDef[], monster: MonsterDef): ContentDB {
  const map = { ...content.items };
  for (const it of items) map[it.id] = it;
  return { ...content, monsters: { ...content.monsters, [monster.id]: monster }, items: map };
}

/** Trifft zuverlässig jeden Tick, stirbt nie. */
function hitter(id: string, damage: number): MonsterDef {
  return {
    id,
    name: { en: id, de: id },
    level: 20,
    maxHp: 5_000_000,
    damage,
    accuracy: 100_000,
    evasion: 0,
    defense: 0,
    attackIntervalMs: 1000,
    xp: 0,
    gold: 0,
    loot: [],
  };
}

describe("Mana ist kein Schild mehr (Ward ersetzt applyManaShield)", () => {
  it("ein Treffer zieht KEIN Mana mehr ab (Mana ist reine Cast-Ressource)", () => {
    // Ward künstlich auf 0 → jeder Treffer geht direkt auf die HP; Mana darf sich davon NICHT bewegen.
    const c = withAll([WAND], hitter("ms_mob", 25));
    const s = createGame({ name: "Mage", baseAttributes: { int: 20, wis: 10, con: 400 } }, c, 5);
    s.character.equipment.mainhand = "ms_wand";
    s.character.food = null;
    const st = computeStats(s, c);
    expect(st.style).toBe("magic");
    s.character.hp = st.maxHp;
    startCombat(s, c, "ms_mob");
    s.character.ward = 0; // kein Ward → der Treffer MUSS voll auf die HP durchschlagen
    s.character.mana = 0; // kein Cast (kein Ward-Recharge) → Mana bleibt konstant, wenn kein Schild zehrt

    let enemyHits = 0;
    for (let i = 0; i < 60 && enemyHits < 3; i++) {
      const hpBefore = s.character.hp;
      combatStep(s, c);
      s.character.mana = 0; // Regen abklemmen → beobachtbar bleibt nur ein (fälschlicher) Schild-Abzug
      if (s.character.hp < hpBefore) enemyHits++;
    }
    expect(enemyHits).toBeGreaterThan(0); // der Mob trifft und kostet HP
    // Kein Mana-Schild mehr: es gibt keinen einzigen "shield"-Log aus Mana-Absorption.
    expect(s.combat.log.some((e) => e.kind === "shield")).toBe(false);
  });

  it("der Ward-Pool (nicht Mana) fängt Treffer vor der HP ab", () => {
    const c = withAll([WAND, robe("ms_robe", 800)], hitter("ms_mob2", 25));
    const s = createGame({ name: "Mage", baseAttributes: { int: 20, con: 400 } }, c, 5);
    s.character.equipment.mainhand = "ms_wand";
    s.character.equipment.body = "ms_robe";
    s.character.food = null;
    const st = computeStats(s, c);
    s.character.hp = st.maxHp;
    startCombat(s, c, "ms_mob2");
    s.character.ward = st.maxWard;
    s.character.mana = 0; // Mana leer: beweist, dass die Absorption aus WARD kommt, nicht aus Mana
    const hpBefore = s.character.hp;
    const wardBefore = s.character.ward;

    for (let i = 0; i < 10; i++) {
      s.character.mana = 0;
      combatStep(s, c);
    }
    // Ward hat abgefangen (sinkt), die HP bleiben (weitgehend) verschont, Mana bewegt sich nicht.
    expect(s.character.ward).toBeLessThan(wardBefore);
    expect(s.character.hp).toBe(hpBefore); // großer Pool deckt das Fenster komplett
    expect(s.combat.log.some((e) => e.by === "player" && e.kind === "shield")).toBe(true);
  });

  it("Magier mit Ward verliert über ein Fenster weniger HP als ohne Ward", () => {
    function hpLost(wardCapacity: number, seed: number): number {
      const c = withAll([WAND, robe("ms_robe3", wardCapacity)], hitter("ms_mob3", 25));
      const s = createGame({ name: "Mage", baseAttributes: { int: 20, con: 400 } }, c, seed);
      s.character.equipment.mainhand = "ms_wand";
      s.character.equipment.body = "ms_robe3";
      s.character.food = null;
      const st = computeStats(s, c);
      s.character.hp = st.maxHp;
      s.character.mana = st.maxMana; // castet → Ward lädt nach (Sustain-Identität)
      startCombat(s, c, "ms_mob3");
      const hp0 = s.character.hp;
      for (let i = 0; i < 150; i++) {
        combatStep(s, c);
        if (s.combat.monsterId === null) break;
      }
      expect(s.stats.deaths).toBe(0);
      return hp0 - s.character.hp;
    }
    let withWard = 0;
    let withoutWard = 0;
    for (let seed = 1; seed <= 20; seed++) {
      withWard += hpLost(400, seed); // großer Stoff-Pool
      withoutWard += hpLost(0, seed); // nur INT-Kern (winzig)
    }
    expect(withoutWard).toBeGreaterThan(0);
    expect(withWard).toBeLessThan(withoutWard); // Ward = messbare Magie-Survival-Schicht
  });
});
