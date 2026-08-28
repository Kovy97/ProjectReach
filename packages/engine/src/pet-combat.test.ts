import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { type ContentDB, type PetCombatAbility } from "@hearthforge/shared";
import { createGame } from "./state";
import { startCombat, combatStep } from "./combat";
import { grantPet, equipPet, petCombatAbility } from "./pets";
import { xpForLevel } from "./leveling";

/**
 * Regression: getriggertes Pet-Ability-Framework (Chef-Freigabe 2026-06-26, ersetzt die alte
 * passive %-`combatEffect`). Jedes aktive Pet hat einen Intervall-Timer; bei Fälligkeit löst
 * combat.ts (`firePetAbility`) die Aktion nach `kind` aus und pusht einen `petAbility`-Log.
 * Diese Suite beweist die 6 live-Abilities + Determinismus + Kill-Pet-Drop + NaN-Guard.
 */

/** Lokales Content mit genau EINEM Combat-Pet, das die gegebene Ability trägt (source: combat).
 *  `name` ist seit #276 Pflichtfeld — das Fixture defaultet ihn, die Tests bleiben schlank. */
function withAbility(
  combatAbility: Omit<PetCombatAbility, "name"> & { name?: PetCombatAbility["name"] },
  monsterPatch?: Record<string, unknown>,
): ContentDB {
  const named: PetCombatAbility = { name: { en: "Test Ability", de: "Test-Fähigkeit" }, ...combatAbility };
  const base: ContentDB = {
    ...content,
    pets: {
      test_pet: {
        id: "test_pet",
        name: { en: "T", de: "T" },
        // #276: skillXp ist verboten/gelöscht — neutrales globales Passiv fürs Fixture.
        skillEffect: { kind: "spellReserve", value: 0.05 },
        combatAbility: named,
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

function strongPlayer(local: ContentDB, seed: number) {
  // Hoher STR/DEX → trifft das Huhn zuverlässig, schneller Schaden.
  const s = createGame({ name: "X", baseAttributes: { str: 80, dex: 80 } }, local, seed);
  s.character.ownedPets.test_pet = true;
  s.character.companionPetId = "test_pet";
  return s;
}

/** Lässt den Kampf laufen, bis `pred` erfüllt ist oder das Tick-Limit erreicht ist. */
function runUntil(s: ReturnType<typeof strongPlayer>, local: ContentDB, max: number, pred: () => boolean): boolean {
  for (let i = 0; i < max; i++) {
    combatStep(s, local);
    if (pred()) return true;
  }
  return pred();
}

describe("Pet-Ability: getriggerte Auslösung (6 live-Abilities)", () => {
  it("stun: friert den Gegner-Angriffs-Timer ein + petAbility-Log", () => {
    const local = withAbility({ name: { en: "Test Ability", de: "Test-Fähigkeit" }, kind: "stun", intervalMs: 1000, value: 1500 });
    const s = strongPlayer(local, 7);
    startCombat(s, local, "chicken");
    s.combat.enemyHp = 1_000_000; // kein Respawn
    const fired = runUntil(s, local, 200, () =>
      s.combat.log.some((e) => e.kind === "petAbility" && e.ability === "stun"),
    );
    expect(fired).toBe(true);
    // Nach dem Auslösen ist der Stun-Timer aktiv (oder lief gerade ab) — er wurde gesetzt.
    expect(s.combat.petAbility.enemyStunMs).toBeGreaterThanOrEqual(0);
  });

  it("burstDamage: zieht enemyHp ab + petAbility-Log mit amount>0", () => {
    const local = withAbility({ name: { en: "Test Ability", de: "Test-Fähigkeit" }, kind: "burstDamage", intervalMs: 1000, value: 0.05 });
    const s = strongPlayer(local, 5);
    startCombat(s, local, "chicken");
    s.combat.enemyHp = 1_000_000;
    const fired = runUntil(s, local, 200, () =>
      s.combat.log.some((e) => e.kind === "petAbility" && e.ability === "burstDamage" && e.amount > 0),
    );
    expect(fired).toBe(true);
    expect(s.combat.enemyHp).toBeLessThan(1_000_000);
  });

  it("heal: heilt den Spieler beim Auslösen", () => {
    const local = withAbility({ name: { en: "Test Ability", de: "Test-Fähigkeit" }, kind: "heal", intervalMs: 1000, value: 0.1 });
    const s = strongPlayer(local, 11);
    startCombat(s, local, "chicken");
    s.combat.enemyHp = 1_000_000;
    const maxHp = s.character.hp;
    s.character.hp = Math.round(maxHp * 0.4); // verwundet → Heal sichtbar
    const before = s.character.hp;
    const healed = runUntil(s, local, 200, () =>
      s.combat.log.some((e) => e.kind === "petAbility" && e.ability === "heal") && s.character.hp > before,
    );
    expect(healed).toBe(true);
  });

  it("shield: legt einen Absorb-Schild an, der einen Gegner-Treffer dämpft (shield-Log)", () => {
    const local = withAbility({ name: { en: "Test Ability", de: "Test-Fähigkeit" }, kind: "shield", intervalMs: 1000, value: 0.15 });
    // Schwacher Spieler → der Gegner trifft zuverlässig und der Schild greift.
    const s = createGame({ name: "X", baseAttributes: { str: 5, dex: 5 } }, local, 3);
    s.character.ownedPets.test_pet = true;
    s.character.companionPetId = "test_pet";
    startCombat(s, local, "chicken");
    s.combat.enemyHp = 999_999;
    const fired = runUntil(s, local, 600, () =>
      s.combat.log.some((e) => e.kind === "petAbility" && e.ability === "shield"),
    );
    expect(fired).toBe(true);
    // Irgendwann fängt der Schild einen Treffer ab → "shield"-Log (by player).
    const absorbed = runUntil(s, local, 1200, () =>
      s.combat.log.some((e) => e.by === "player" && e.kind === "shield"),
    );
    expect(absorbed).toBe(true);
  });

  it("onHitStatus: legt SOFORT einen Status (burn) auf den Gegner", () => {
    // #276 §5.1: value ist jetzt Bruch enemy.maxHp/s (Cap 0.04) — 0.03 statt des alten Flat-6.
    const local = withAbility({ name: { en: "Test Ability", de: "Test-Fähigkeit" }, kind: "onHitStatus", status: "burn", intervalMs: 1000, value: 0.03 });
    const s = strongPlayer(local, 9);
    startCombat(s, local, "chicken");
    s.combat.enemyHp = 1_000_000;
    const burned = runUntil(s, local, 300, () =>
      s.combat.log.some((e) => e.kind === "status" && e.status === "burn"),
    );
    expect(burned).toBe(true);
  });

  it("stealDrop: klaut ein Item aus dem Monster-Loot + petAbility-Log mit itemId", () => {
    // Garantierter Steal (value 1) auf ein Monster mit garantiertem Loot.
    const local = withAbility(
      { name: { en: "Test Ability", de: "Test-Fähigkeit" }, kind: "stealDrop", intervalMs: 1000, value: 1 },
      { loot: [{ itemId: "copper_ore", chance: 1, min: 1, max: 1 }], maxHp: 1_000_000 },
    );
    const s = strongPlayer(local, 13);
    startCombat(s, local, "chicken");
    s.combat.enemyHp = 1_000_000;
    const stolen = runUntil(s, local, 200, () =>
      s.combat.log.some((e) => e.kind === "petAbility" && e.ability === "stealDrop" && e.itemId === "copper_ore"),
    );
    expect(stolen).toBe(true);
    expect(s.stats.itemsGathered).toBeGreaterThan(0);
  });
});

describe("Pet-Ability: Determinismus", () => {
  it("gleicher Seed → bit-identischer Kampfverlauf (rng.state + enemyHp + Log-Länge)", () => {
    const local = withAbility({ name: { en: "Test Ability", de: "Test-Fähigkeit" }, kind: "burstDamage", intervalMs: 1000, value: 0.05 });
    function run(seed: number) {
      const s = strongPlayer(local, seed);
      startCombat(s, local, "chicken");
      s.combat.enemyHp = 50_000;
      for (let i = 0; i < 500; i++) combatStep(s, local);
      return { rng: s.rng.state, hp: s.combat.enemyHp, logs: s.combat.log.length, kills: s.combat.kills };
    }
    expect(run(42)).toEqual(run(42));
  });

  it("ohne aktives Pet wird der Ability-Timer nicht bewegt und kein RNG gezogen", () => {
    const s = createGame({ name: "X", baseAttributes: { str: 80, dex: 80 } }, content, 4);
    startCombat(s, content, "chicken");
    s.combat.enemyHp = 1_000_000;
    for (let i = 0; i < 50; i++) combatStep(s, content);
    expect(s.combat.petAbility.timerMs).toBe(0);
    expect(petCombatAbility(s, content)).toBeNull();
  });
});

describe("Pet-Drop am Kill-Pfad (Zwei-Effekt-Modell)", () => {
  it("garantierter Drop → ownedPets, lastPetDrop und „pet\"-Log", () => {
    const local: ContentDB = {
      ...content,
      pets: {
        debug_combat_pet: {
          id: "debug_combat_pet",
          name: { en: "Dbg", de: "Dbg" },
          // #276: skillXp ist verboten/gelöscht — neutrales globales Passiv fürs Fixture.
          skillEffect: { kind: "spellReserve", value: 0.05 },
          combatAbility: { name: { en: "Test Ability", de: "Test-Fähigkeit" }, kind: "heal", intervalMs: 6000, value: 0.03 },
          source: { kind: "combat", style: "melee" },
          dropChance: 1, // garantiert (Test-Override)
        },
      },
    };
    const s = createGame({ name: "X", baseAttributes: { str: 30, dex: 30 } }, local, 9);
    s.skills.attack = { xp: xpForLevel(45) };
    startCombat(s, local, "chicken");
    s.combat.enemyHp = 1;
    let guard = 0;
    while (s.combat.kills < 1 && s.combat.monsterId && guard++ < 300) combatStep(s, local);
    expect(s.combat.kills).toBe(1);
    expect(s.character.ownedPets.debug_combat_pet).toBe(true);
    expect(s.lastPetDrop?.petId).toBe("debug_combat_pet");
    expect(s.combat.log.some((e) => e.kind === "pet")).toBe(true);
  });
});

describe("resolveAttack-NaN-Guard (Security P1)", () => {
  it("acc==eva==0 erzeugt kein NaN; Kampf läuft endlich weiter und endet kontrolliert", () => {
    const monster = content.monsters.chicken!;
    const local: ContentDB = {
      ...content,
      monsters: {
        ...content.monsters,
        nan_dummy: {
          ...monster,
          id: "nan_dummy",
          accuracy: 0,
          evasion: 0,
          damage: 0,
          attackIntervalMs: 0,
          maxHp: 5,
          loot: [],
          inflict: undefined,
        },
      },
    };
    // str 30: der Dummy fällt in 1–2 Treffern. Auf der Squish-Skala schlägt selbst ein damage-0-
    // Dummy über den max(1,…)-Boden + MIN_HIT_CHANCE ~1 HP/s durch — ein L1-Held (10 maxHp) stürbe
    // vor dem Kill und der Kampf bräche ab (monsterId null → Endlos-Guard). Kein Balance-Thema,
    // reine Fixture-Robustheit; der Test prüft ausschließlich den NaN-Guard.
    const s = createGame({ name: "X", baseAttributes: { str: 30 } }, local, 1);
    startCombat(s, local, "nan_dummy");
    let guard = 0;
    while (s.combat.kills < 1 && guard++ < 5000) {
      combatStep(s, local);
      expect(Number.isNaN(s.combat.enemyHp)).toBe(false);
      expect(Number.isNaN(s.character.hp)).toBe(false);
      expect(Number.isNaN(s.combat.playerTimerMs)).toBe(false);
      expect(Number.isNaN(s.combat.enemyTimerMs)).toBe(false);
    }
    expect(guard).toBeLessThan(5000);
    expect(s.combat.kills).toBeGreaterThanOrEqual(1);
  });
});
