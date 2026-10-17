import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { ContentDB, GameState, PetCombatAbility, PetDef, TalentTreeDef } from "@hearthforge/shared";
import { createGame } from "./state";
import { xpForLevel } from "./leveling";
import { buyTalent, canBuyTalent, talentEffect, talentRank } from "./talents";
import {
  effectivePetDropChance,
  equipPet,
  equipSecondPet,
  petCombatAbility,
  petDoubleYieldBonus,
  petPityProgress,
  secondPet,
  tryPetDrop,
} from "./pets";
import { recordKillForSlayer, slayerTaskPointsPayout } from "./slayer";
import { combatStep, startCombat } from "./combat";
import { familyBestiaryComplete } from "./drops";

// claude:2026-10-18T00:30:00+02:00 — Talentbaum-System + Jagdbuch (1.3.0 Säule 0, Chef 17.10.).

const TREE = "slayer";

function game(c: ContentDB = content, seed = 1): GameState {
  return createGame({ name: "T", baseAttributes: { str: 80, dex: 80, con: 80 } }, c, seed);
}

function slayerLevel(s: GameState, level: number): void {
  s.skills.slayer = { xp: xpForLevel(level) };
}

/** Setzt Ränge direkt (Kauf-Logik wird separat getestet). */
function ranks(s: GameState, r: Record<string, number>): void {
  s.talents = { [TREE]: { ...r } };
}

const NEVER: PetCombatAbility = { name: { en: "T", de: "T" }, kind: "stun", intervalMs: 100_000_000, value: 1 };

function pet(id: string, patch: Partial<PetDef> = {}): PetDef {
  return {
    id,
    name: { en: id, de: id },
    skillEffect: { kind: "doubleDrop", skill: "mining", value: 0.05 },
    combatAbility: NEVER,
    source: { kind: "skill", skill: "mining" },
    dropChance: 0.5,
    icon: "x",
    ...patch,
  };
}

function withPets(...pets: PetDef[]): ContentDB {
  return { ...content, pets: Object.fromEntries(pets.map((p) => [p.id, p])) };
}

describe("Talentbaum generisch: Kauf, Voraussetzungen, Max-Rang", () => {
  it("unter Slayer 85 gesperrt, ab 85 kaufbar; Kosten je Rang werden abgezogen", () => {
    const s = game();
    s.slayerPoints = 100_000;
    slayerLevel(s, 84);
    expect(canBuyTalent(s, content, TREE, "tracking")).toEqual({ ok: false, reason: "locked" });
    slayerLevel(s, 85);
    expect(buyTalent(s, content, TREE, "tracking")).toEqual({ ok: true, cost: 250 });
    expect(buyTalent(s, content, TREE, "tracking").cost).toBe(500);
    expect(talentRank(s, TREE, "tracking")).toBe(2);
    expect(s.slayerPoints).toBe(100_000 - 750);
  });

  it("J1 kostet zusammen 5.050; danach maxed", () => {
    const s = game();
    slayerLevel(s, 99);
    s.slayerPoints = 5_050;
    for (let i = 0; i < 5; i++) expect(buyTalent(s, content, TREE, "tracking").ok).toBe(true);
    expect(s.slayerPoints).toBe(0);
    s.slayerPoints = 99_999;
    expect(buyTalent(s, content, TREE, "tracking")).toEqual({ ok: false, reason: "maxed" });
    expect(s.slayerPoints).toBe(99_999);
  });

  it("Voraussetzungen: J2 braucht J1 Rang 1, J6 braucht J1 Rang 5; Guthaben-Gate ohne Abzug", () => {
    const s = game();
    slayerLevel(s, 90);
    s.slayerPoints = 1_000_000;
    expect(canBuyTalent(s, content, TREE, "trail").reason).toBe("requires");
    ranks(s, { tracking: 1 });
    expect(canBuyTalent(s, content, TREE, "trail")).toEqual({ ok: true, cost: 650 });
    expect(canBuyTalent(s, content, TREE, "collar").reason).toBe("requires");
    ranks(s, { tracking: 5 });
    expect(canBuyTalent(s, content, TREE, "collar")).toEqual({ ok: true, cost: 3_000 });
    s.slayerPoints = 2_999;
    expect(buyTalent(s, content, TREE, "collar")).toEqual({ ok: false, reason: "not_enough_currency", cost: 3_000 });
    expect(s.slayerPoints).toBe(2_999);
    expect(canBuyTalent(s, content, "nope", "tracking").reason).toBe("not_found");
    expect(canBuyTalent(s, content, TREE, "nope").reason).toBe("not_found");
  });

  it("talentEffect aggregiert: Summe über Bäume, petPity = kleinster positiver Wert, 0 ohne Talente", () => {
    const extra: TalentTreeDef = {
      ...content.talentTrees![0]!,
      id: "extra",
      nodes: [
        { ...content.talentTrees![0]!.nodes.find((n) => n.id === "tracking")!, effect: { kind: "petChanceMult", perRank: [0.5] }, maxRank: 1, costPerRank: [1] },
        { ...content.talentTrees![0]!.nodes.find((n) => n.id === "trail")!, requires: [], effect: { kind: "petPity", perRank: [1.5] } },
      ],
    };
    const c: ContentDB = { ...content, talentTrees: [...content.talentTrees!, extra] };
    const s = game(c);
    expect(talentEffect(s, c, "petChanceMult")).toBe(0);
    s.talents = { slayer: { tracking: 2, trail: 1 }, extra: { tracking: 1, trail: 1 } };
    expect(talentEffect(s, c, "petChanceMult")).toBeCloseTo(0.9, 10);
    expect(talentEffect(s, c, "petPity")).toBe(1.5);
    expect(talentEffect(s, c, "familyDamage")).toBe(0);
  });
});

describe("J1 Fährtenkunde: Begleiter-Chance multiplikativ", () => {
  it("×1,2 … ×2,0 auf dropChance, auf 1 geklemmt; ohne Talent exakt dropChance", () => {
    const p = pet("tp", { dropChance: 0.001 });
    const c = withPets(p);
    const s = game(c);
    expect(effectivePetDropChance(s, c, p)).toBe(0.001);
    const want = [1.2, 1.4, 1.6, 1.8, 2.0];
    for (let r = 1; r <= 5; r++) {
      ranks(s, { tracking: r });
      expect(effectivePetDropChance(s, c, p)).toBeCloseTo(0.001 * want[r - 1]!, 12);
    }
    expect(effectivePetDropChance(s, c, pet("hi", { dropChance: 0.7 }))).toBe(1);
  });

  it("der Wurf nutzt die effektive Chance: 0,5 × 2,0 = garantiert", () => {
    const p = pet("tp", { dropChance: 0.5 });
    const c = withPets(p);
    for (let seed = 1; seed <= 20; seed++) {
      const s = game(c, seed);
      ranks(s, { tracking: 5 });
      expect(tryPetDrop(s, c, { kind: "skill", skill: "mining" })).toBe("tp");
    }
  });
});

describe("J2 Spur aufgenommen: Pech-Schutz", () => {
  const p = pet("rare", { dropChance: 1e-9 });
  const c = withPets(p);

  it("ohne J2 kein Zähler", () => {
    const s = game(c);
    ranks(s, { tracking: 1 });
    tryPetDrop(s, c, { kind: "skill", skill: "mining" });
    expect(s.petPity).toEqual({});
    expect(petPityProgress(s, c, p)).toBeNull();
  });

  it("zählt Fehlwürfe; am Schwellwert 2 × (1 / effektive Chance) ist der nächste Wurf garantiert; Zähler fällt beim Erhalt weg", () => {
    const s = game(c);
    ranks(s, { tracking: 1, trail: 1 });
    const threshold = Math.ceil(2 / (1e-9 * 1.2));
    expect(petPityProgress(s, c, p)).toEqual({ count: 0, threshold });
    expect(tryPetDrop(s, c, { kind: "skill", skill: "mining" })).toBeNull();
    expect(s.petPity.rare).toBe(1);
    s.petPity.rare = threshold - 1;
    expect(tryPetDrop(s, c, { kind: "skill", skill: "mining" })).toBeNull();
    expect(s.petPity.rare).toBe(threshold);
    expect(tryPetDrop(s, c, { kind: "skill", skill: "mining" })).toBe("rare");
    expect(s.character.ownedPets.rare).toBe(true);
    expect(s.petPity.rare).toBeUndefined();
  });
});

describe("J4 Jagdtempo: +10/20/30 % Slayer-Punkte je Auftrag", () => {
  it("auf die Gutschrift nach Etagen-Skalierung (pointReward)", () => {
    for (const [rank, want] of [[0, 1000], [1, 1100], [2, 1200], [3, 1300]] as const) {
      const s = game();
      if (rank > 0) ranks(s, { pace: rank });
      s.slayerTask = { masterId: "m", monsterId: "chicken", isTower: false, required: 1, progress: 0, xpReward: 0, pointReward: 1000 };
      // claude:2026-10-17T20:30:00+02:00 — Zettel/Toast lesen dieselbe Zahl wie die Gutschrift.
      expect(slayerTaskPointsPayout(s, content, 1000)).toBe(want);
      const before = s.slayerPoints;
      expect(recordKillForSlayer(s, content, "chicken")).toBe(true);
      expect(s.slayerPoints - before).toBe(want);
    }
  });
});

describe("J3 Beute: seltene Drops nur beim Auftragsmonster", () => {
  const RARE = 1 / 500;
  const c: ContentDB = {
    ...content,
    monsters: {
      ...content.monsters,
      chicken: { ...content.monsters.chicken!, loot: [{ itemId: "copper_ore", chance: RARE, min: 1, max: 1 }] },
    },
  };
  const base = game(c, 3);

  /** Erster Kill an chicken mit gegebenem RNG-Stand; true = Drop. */
  function firstKillDrops(rngState: number, spoils: number, taskOn: string | null): boolean {
    const s = structuredClone(base);
    s.rng = { state: rngState };
    if (spoils > 0) ranks(s, { spoils });
    if (taskOn) {
      s.slayerTask = { masterId: "m", monsterId: taskOn, isTower: false, required: 50, progress: 0, xpReward: 0, pointReward: 1 };
    }
    startCombat(s, c, "chicken");
    for (let i = 0; i < 2000 && s.combat.kills === 0; i++) {
      s.character.hp = 9_999;
      combatStep(s, c, 0);
    }
    expect(s.combat.kills).toBe(1);
    return (s.combat.lastKill?.loot ?? []).some((l) => l.itemId === "copper_ore");
  }

  it("Rang 3 hebt die Schwelle um ×1,3 (derselbe Wurf); ohne aktiven Auftrag auf das Monster kein Effekt", () => {
    // Deterministische Suche nach einem RNG-Stand, dessen Loot-Wurf zwischen 1/500 und 1,3/500 fällt.
    let found = -1;
    for (let st = 1; st < 40_000 && found < 0; st++) {
      if (firstKillDrops(st, 3, "chicken") && !firstKillDrops(st, 0, "chicken")) found = st;
    }
    expect(found).toBeGreaterThan(0);
    expect(firstKillDrops(found, 0, null)).toBe(false);
    expect(firstKillDrops(found, 3, "cow")).toBe(false); // Auftrag auf ein anderes Monster
    expect(firstKillDrops(found, 3, "chicken")).toBe(true);
  });
});

describe("J5 Wissen: Schaden gegen Familien mit vollständigem Bestiarium", () => {
  const c: ContentDB = {
    ...content,
    monsters: { ...content.monsters, chicken: { ...content.monsters.chicken!, maxHp: 10_000_000, family: "beast" } },
  };
  const beasts = Object.values(c.monsters).filter((m) => m.family === "beast" && !m.id.startsWith("dg_"));

  function firstHit(complete: boolean, lore: number): number {
    const s = game(c, 5);
    if (lore > 0) ranks(s, { lore });
    for (const m of beasts) s.monsterKills[m.id] = 1;
    if (!complete) s.monsterKills[beasts[beasts.length - 1]!.id] = 0;
    expect(familyBestiaryComplete(s, c, "beast")).toBe(complete);
    startCombat(s, c, "chicken");
    for (let i = 0; i < 2000; i++) {
      s.character.hp = 9_999;
      combatStep(s, c, 0);
      const hit = s.combat.log.find((e) => e.by === "player" && e.kind === "hit");
      if (hit) return hit.amount;
    }
    throw new Error("kein Treffer");
  }

  it("+6 % bei Rang 3 und vollständiger Familie; unvollständig oder ohne Talent kein Bonus; dg_-Varianten zählen nicht", () => {
    const plain = firstHit(true, 0);
    expect(firstHit(false, 3)).toBe(plain);
    expect(firstHit(true, 3)).toBe(Math.max(1, Math.round(plain * 1.06)));
    expect(beasts.length).toBeGreaterThan(1);
  });
});

describe("J6 Zweites Halsband: zweiter Begleiter-Platz", () => {
  const a = pet("pa", { skillEffect: { kind: "doubleDrop", skill: "mining", value: 0.05 }, source: { kind: "combat", style: "melee" }, combatAbility: { ...NEVER, intervalMs: 3000 } });
  const b = pet("pb", { skillEffect: { kind: "doubleDrop", skill: "mining", value: 0.03 }, combatAbility: { ...NEVER, intervalMs: 4000 } });
  const f = pet("pf", { skillEffect: { kind: "doubleDrop", skill: "fishing", value: 0.04 } });
  const c = withPets(a, b, f);

  function owner(): GameState {
    const s = game(c);
    s.character.ownedPets = { pa: true, pb: true, pf: true };
    s.character.companionPetId = null;
    return s;
  }

  it("Platz 2 nur mit Talent; nie dasselbe Pet in beiden Plätzen", () => {
    const s = owner();
    expect(equipSecondPet(s, c, "pb")).toBe(false);
    ranks(s, { tracking: 5, collar: 1 });
    equipPet(s, "pa");
    expect(equipSecondPet(s, c, "pa")).toBe(false);
    expect(equipSecondPet(s, c, "pb")).toBe(true);
    expect(secondPet(s, c)?.id).toBe("pb");
    // Platz-2-Pet in Platz 1 heben ⇒ Tausch.
    equipPet(s, "pb");
    expect(s.character.companionPetId).toBe("pb");
    expect(s.character.companionPetId2).toBe("pa");
    // Talent fehlt (z. B. manipulierter Save) ⇒ Platz 2 wirkt nicht.
    s.talents = {};
    expect(secondPet(s, c)).toBeNull();
  });

  it("Kampf ignoriert Platz 2; Fertigkeits-Effekt wirkt, gleiche Art = Maximum, andere Skills unabhängig", () => {
    const s = owner();
    ranks(s, { tracking: 5, collar: 1 });
    s.character.companionPetId2 = "pa";
    expect(petCombatAbility(s, c)).toBeNull();
    expect(petDoubleYieldBonus(s, c, "mining")).toBe(0.05);
    equipPet(s, "pb");
    expect(petCombatAbility(s, c)?.intervalMs).toBe(4000); // Kampf = Platz 1
    expect(petDoubleYieldBonus(s, c, "mining")).toBe(0.05); // max(0.03, 0.05), nicht 0.08
    s.character.companionPetId2 = "pf";
    expect(petDoubleYieldBonus(s, c, "mining")).toBe(0.03);
    expect(petDoubleYieldBonus(s, c, "fishing")).toBe(0.04);
  });
});
