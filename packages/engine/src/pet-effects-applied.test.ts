import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import {
  type ContentDB,
  type PetCombatAbility,
  type PetSkillEffect,
  petDotMagnitude,
} from "@hearthforge/shared";
import { createGame } from "./state";
import { startCombat, combatStep } from "./combat";
import { computeStats, type CharacterCreation } from "./character";

/**
 * #276 Pet-Redesign, Schritt 2 (combat-dev) — Applied-Tests: beweisen, dass die neuen Semantiken
 * WIRKLICH im Kampf ankommen (Anti-„defined but never applied"):
 *  1. DoT-%-Semantik (§5.1): onHitStatus/delayedDot-Magnitude = petDotMagnitude(enemy.maxHp, value).
 *  2. stealDrop-Bindung (§5.2): Chase-Loot (chance < 5 %) ist NIE stehlbar; Menge = roll.min.
 *  3. doubleLoot (§4.2 carrionwing): wiederholt Loot+Gold GENAU einmal (nie doppelt-doppelt).
 *  4. killHeal (§4.2 charnel): heilt round(maxHp·Wert) je Kill (heal-Event source "effect").
 *  5. damageReduction (§4.2 carapace): multiplikativ NACH Armor/Ward/Block, ohne RNG-Drift.
 */

/** Ability-Intervall, das im Testfenster garantiert nie feuert (neutrale Pflicht-Ability). */
const NEVER_MS = 100_000_000;
const NEVER_ABILITY: PetCombatAbility = { name: { en: "Test Ability", de: "Test-Fähigkeit" }, kind: "stun", intervalMs: NEVER_MS, value: 600 };
/** Neutrales Passiv ohne Kampf-/RNG-Wirkung (Referenz-Fixture). */
const NEUTRAL_EFFECT: PetSkillEffect = { kind: "spellReserve", value: 0.05 };

/** Lokales Content mit genau EINEM Combat-Pet (Passiv + Ability frei wählbar) + Chicken-Patch. */
function withPet(
  skillEffect: PetSkillEffect,
  combatAbility: PetCombatAbility,
  monsterPatch?: Record<string, unknown>,
): ContentDB {
  const base: ContentDB = {
    ...content,
    pets: {
      test_pet: {
        id: "test_pet",
        name: { en: "T", de: "T" },
        skillEffect,
        combatAbility,
        source: { kind: "combat", style: "melee" },
        dropChance: 1,
        icon: "x",
      },
    },
  };
  if (monsterPatch) {
    base.monsters = {
      ...content.monsters,
      chicken: { ...content.monsters.chicken!, ...monsterPatch },
    };
  }
  return base;
}

function withCompanion(
  local: ContentDB,
  seed: number,
  baseAttributes: CharacterCreation["baseAttributes"] = { str: 80, dex: 80 },
) {
  const s = createGame({ name: "X", baseAttributes }, local, seed);
  s.character.ownedPets.test_pet = true;
  s.character.companionPetId = "test_pet";
  return s;
}

describe("#276 §5.1 — Pet-DoT: value = Bruch enemy.maxHp pro Sekunde", () => {
  it("onHitStatus burn 0.03 auf maxHp-200-Gegner → Magnitude 6/s (petDotMagnitude), nicht 0.03 roh", () => {
    const local = withPet(
      NEUTRAL_EFFECT,
      { name: { en: "Test Ability", de: "Test-Fähigkeit" }, kind: "onHitStatus", status: "burn", intervalMs: 1000, value: 0.03 },
      { maxHp: 200 },
    );
    const s = withCompanion(local, 9);
    startCombat(s, local, "chicken");
    s.combat.enemyHp = 1_000_000; // kein Kill/Respawn im Fenster
    let burn;
    for (let i = 0; i < 60 && !burn; i++) {
      combatStep(s, local);
      burn = s.combat.enemyEffects.find((e) => e.type === "burn");
    }
    expect(burn).toBeDefined();
    expect(burn!.magnitude).toBe(petDotMagnitude(200, 0.03));
    expect(burn!.magnitude).toBe(6); // max(1, round(200 × 0.03)) — die alte Flat-Semantik hätte 0.03
  });

  it("delayedDot poison nutzt dieselbe %-Umrechnung; frost bleibt reiner Slow (Magnitude 0)", () => {
    const local = withPet(
      NEUTRAL_EFFECT,
      { name: { en: "Test Ability", de: "Test-Fähigkeit" }, kind: "delayedDot", status: "poison", intervalMs: 1000, value: 0.018 },
      { maxHp: 300 },
    );
    const s = withCompanion(local, 5);
    startCombat(s, local, "chicken");
    s.combat.enemyHp = 1_000_000;
    let poison;
    for (let i = 0; i < 60 && !poison; i++) {
      combatStep(s, local);
      poison = s.combat.enemyEffects.find((e) => e.type === "poison");
    }
    expect(poison).toBeDefined();
    expect(poison!.magnitude).toBe(petDotMagnitude(300, 0.018)); // = max(1, round(5.4)) = 5

    const localFrost = withPet(
      NEUTRAL_EFFECT,
      { name: { en: "Test Ability", de: "Test-Fähigkeit" }, kind: "onHitStatus", status: "frost", intervalMs: 1000, value: 0.03 },
      { maxHp: 300 },
    );
    const s2 = withCompanion(localFrost, 5);
    startCombat(s2, localFrost, "chicken");
    s2.combat.enemyHp = 1_000_000;
    let frost;
    for (let i = 0; i < 60 && !frost; i++) {
      combatStep(s2, localFrost);
      frost = s2.combat.enemyEffects.find((e) => e.type === "frost");
    }
    expect(frost).toBeDefined();
    expect(frost!.magnitude).toBe(0);
  });
});

describe("#276 §5.2 — stealDrop-Bindung (Rare-Drop-Schutz)", () => {
  it("klaut NUR Einträge mit chance ≥ 5 % und immer qty = roll.min (der Dieb erntet nicht)", () => {
    const local = withPet(
      NEUTRAL_EFFECT,
      { name: { en: "Test Ability", de: "Test-Fähigkeit" }, kind: "stealDrop", intervalMs: 1000, value: 1 },
      {
        maxHp: 1_000_000,
        loot: [
          // Chase-Item wie am echten Huhn (farmhand_sling 0.0019 + Suffix) — darf NIE stehlbar sein.
          { itemId: "farmhand_sling", chance: 0.0019, min: 1, max: 1, suffixChance: 0.3 },
          { itemId: "copper_ore", chance: 1, min: 2, max: 5 },
        ],
      },
    );
    const s = withCompanion(local, 13);
    startCombat(s, local, "chicken");
    s.combat.enemyHp = 1_000_000;
    // claude:2026-10-18T02:00:00+02:00 — 1.3.0: höchstens EIN Erfolg je Begegnung; der Test simuliert je Tick eine frische
    // Begegnung (Sperre zurück), damit die Bindung über mehrere Diebstähle geprüft wird.
    for (let i = 0; i < 350; i++) {
      s.combat.petAbility.stolenThisEncounter = false;
      combatStep(s, local);
    }
    const steals = s.combat.log.filter((e) => e.kind === "petAbility" && e.ability === "stealDrop");
    expect(steals.length).toBeGreaterThanOrEqual(5); // Ability feuerte mehrfach
    // Kein einziger Steal des Chase-Items; ausschließlich das Common, immer mit min-Menge (2).
    for (const e of steals) {
      expect(e.itemId).toBe("copper_ore");
      expect(e.amount).toBe(2);
    }
  });

  it("nur-Chase-Loot → kein Effekt, kein Log, KEIN RNG-Draw (bit-identisch zu leerer Loot-Tabelle)", () => {
    function run(loot: unknown[]) {
      const local = withPet(
        NEUTRAL_EFFECT,
        { name: { en: "Test Ability", de: "Test-Fähigkeit" }, kind: "stealDrop", intervalMs: 1000, value: 1 },
        { maxHp: 1_000_000, loot },
      );
      const s = withCompanion(local, 17);
      startCombat(s, local, "chicken");
      s.combat.enemyHp = 1_000_000;
      for (let i = 0; i < 400; i++) combatStep(s, local);
      return s;
    }
    const chaseOnly = run([
      { itemId: "farmhand_sling", chance: 0.0019, min: 1, max: 1, suffixChance: 0.3 },
      { itemId: "cowhide_cap", chance: 0.0019, min: 1, max: 1, suffixChance: 0.3 },
    ]);
    const empty = run([]);
    expect(chaseOnly.combat.log.some((e) => e.kind === "petAbility" && e.ability === "stealDrop")).toBe(false);
    expect(chaseOnly.stats.itemsGathered).toBe(0);
    // Determinismus-Regel: die leere GEFILTERTE Liste zieht keinen RNG — Sequenz wie ohne Loot.
    expect(chaseOnly.rng.state).toEqual(empty.rng.state);
    expect(chaseOnly.combat.log.length).toBe(empty.combat.log.length);
  });
});

describe("#276 §4.2 — doubleLoot (carrionwing Scavenger)", () => {
  it("wiederholt Loot+Gold-Wurf GENAU einmal (qty 3 oder 6, nie 9; Gold koppelt mit)", () => {
    const local = withPet({ kind: "doubleLoot", value: 0.05 }, NEVER_ABILITY, {
      gold: 5,
      loot: [{ itemId: "copper_ore", chance: 1, min: 3, max: 3 }],
    });
    const s = withCompanion(local, 42);
    startCombat(s, local, "chicken");
    let seenSingle = false;
    let seenDouble = false;
    let kills = 0;
    for (let i = 0; i < 40_000 && !(seenSingle && seenDouble); i++) {
      s.character.hp = 9_999; // Tod ausschließen (kein Food konfiguriert; rein deterministisch)
      combatStep(s, local);
      if (s.combat.kills > kills) {
        kills = s.combat.kills;
        const lk = s.combat.lastKill!;
        expect(lk).toBeDefined();
        // Merged Summary: genau EIN copper_ore-Eintrag, auch beim Doppel-Wurf (keine Doppelzeile).
        const copper = lk.loot.filter((l) => l.itemId === "copper_ore");
        expect(copper.length).toBe(1);
        const qty = copper[0]!.qty;
        // 3 = ein Wurf, 6 = genau ZWEI Würfe. Alles andere (9, 12, …) wäre Rekursion/Mehrfach-Proc.
        expect([3, 6]).toContain(qty);
        if (qty === 3) {
          seenSingle = true;
          expect(lk.gold).toBeGreaterThanOrEqual(5); // ein Gold-Wurf: 5 + [0..2]
          expect(lk.gold).toBeLessThanOrEqual(7);
        } else {
          seenDouble = true;
          expect(lk.gold).toBeGreaterThanOrEqual(10); // zwei Gold-Würfe: 10 + [0..4]
          expect(lk.gold).toBeLessThanOrEqual(14);
        }
      }
    }
    expect(seenSingle).toBe(true); // Normalfall kommt vor (kein Dauer-Proc)
    expect(seenDouble).toBe(true); // und der 5 %-Proc verdoppelt wirklich (applied!)
  });
});

describe("#276 §4.2 — killHeal (charnel Corpsefeeder)", () => {
  it("heilt round(maxHp × 0.03) beim Kill als heal-Event mit source 'effect'", () => {
    const local = withPet({ kind: "killHeal", value: 0.03 }, NEVER_ABILITY);
    const s = withCompanion(local, 9, { str: 80, dex: 80, con: 60 });
    const maxHp = computeStats(s, local).maxHp;
    startCombat(s, local, "chicken");
    s.character.hp = Math.round(maxHp / 2); // verwundet → Heilung sichtbar/ungecappt
    let guard = 0;
    while (s.combat.kills < 1 && s.combat.monsterId && guard++ < 500) combatStep(s, local);
    expect(s.combat.kills).toBe(1);
    // Einziger source-"effect"-Heal im Setup (Ability feuert nie, kein healOnKill-Gear): killHeal.
    const heals = s.combat.log.filter((e) => e.kind === "heal" && e.source === "effect");
    expect(heals.length).toBe(1);
    expect(heals[0]!.amount).toBe(Math.round(maxHp * 0.03));
  });
});

describe("#276 §4.2 — damageReduction (carapace Stoneshell)", () => {
  it("reduziert JEDEN HP-Resttreffer um max(1, round(dmg·(1−dr))) — nach Armor/Ward/Block, ohne RNG-Drift", () => {
    // Zwei seed-identische Läufe; einziger Unterschied: neutrales manaRegen-Passiv vs.
    // damageReduction 0.04. Beide Passive ziehen keinen RNG → die Gegner-Treffer-Sequenzen
    // MÜSSEN 1:1 alignen; nur der HP-Schaden je Treffer differiert um den dr-Faktor.
    const patch = { damage: 25, accuracy: 300, attackIntervalMs: 1000 };
    function run(skillEffect: PetSkillEffect) {
      const local = withPet(skillEffect, NEVER_ABILITY, patch);
      const s = withCompanion(local, 21, { con: 40 }); // schwache Offense, genug maxHp
      const maxHp = computeStats(s, local).maxHp;
      startCombat(s, local, "chicken");
      s.combat.enemyHp = 1_000_000; // kein Kill; 500 Ticks < Stalemate-Fenster (60 s)
      const perTick: number[] = [];
      for (let i = 0; i < 500; i++) {
        s.character.hp = maxHp; // Pin auf maxHp: Delta je Tick = exakter HP-Treffer, kein Tod
        combatStep(s, local);
        perTick.push(maxHp - s.character.hp);
      }
      return { perTick, rng: s.rng.state };
    }
    const base = run(NEUTRAL_EFFECT);
    const reduced = run({ kind: "damageReduction", value: 0.04 });
    // Kein zusätzlicher RNG-Draw durch damageReduction → Sequenzen bleiben bit-identisch.
    expect(reduced.rng).toEqual(base.rng);
    let strictlySmaller = 0;
    for (let t = 0; t < base.perTick.length; t++) {
      const a = base.perTick[t]!;
      const b = reduced.perTick[t]!;
      // Formel aus combat.ts STEP 8b: 0 bleibt 0; ein echter Resttreffer fällt nie unter 1.
      expect(b).toBe(a > 0 ? Math.max(1, Math.round(a * (1 - 0.04))) : 0);
      if (a > 0 && b < a) strictlySmaller++;
    }
    expect(base.perTick.some((a) => a > 0)).toBe(true); // der Gegner traf überhaupt
    expect(strictlySmaller).toBeGreaterThanOrEqual(1); // und die Reduktion war real messbar
  });
});
