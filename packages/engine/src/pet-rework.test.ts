import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import {
  consumableHeal,
  createElementalCounters,
  FREEZE_IMMUNITY_MS,
  PET_ECHO_FACTOR,
  TICK_MS,
  type ContentDB,
  type GameState,
  type MonsterDef,
  type PetCombatAbility,
} from "@hearthforge/shared";
import { createGame } from "./state";
import { computeStats } from "./character";
import { combatStep, startCombat } from "./combat";
import { advance, effectiveActionDurationMs } from "./tick";
import { effectiveGrowMs } from "./farming";
import { addItem, itemCount } from "./inventory";
import { useConsumable } from "./consumable";
import { isHealPotion } from "./consume-gate";
import { xpForLevel } from "./leveling";
import { talentTrees } from "./talents";
import { nextFloat } from "./rng";
import {
  equipPet,
  equipSecondPet,
  petBonusFind,
  petCombatAbility,
  petCraftSuffixBonus,
  petDoubleYieldBonus,
  petEchoActive,
  petFoodHealMult,
  petGrowSpeed,
  petPrepSpeed,
  petStyleDamage,
  petThievingBonus,
  petThievingStunMult,
  petTierUp,
  petTierUpTarget,
  petWardCapacityPct,
  rollPetBonusFind,
} from "./pets";

/**
 * claude:2026-10-18T02:00:00+02:00 — 1.3.0 Begleiter-Rework (design/1.3.0-begleiter-werte.md §2c–§4):
 * je neue Fertigkeits-/Kampf-Effektart mindestens ein Anwendungs-Test (nicht defined-but-never-applied),
 * Echo (25 %, Maximum statt Summe), Platz 2 + Echo, Aasschwinge ohne Champion-Unikate.
 */

function freshGame(seed = 4242): GameState {
  return createGame({ name: "Rework" }, content, seed);
}

function own(s: GameState, ...ids: string[]): void {
  for (const id of ids) s.character.ownedPets[id] = true;
}

/** Schaltet den zweiten Begleiter-Platz frei (Talent `secondPetSlot` aus dem echten Jagdbuch). */
function unlockSecondSlot(s: GameState, c: ContentDB): void {
  for (const tree of talentTrees(c)) {
    for (const node of tree.nodes) {
      if (node.effect.kind === "secondPetSlot") {
        (s.talents ??= {})[tree.id] = { ...(s.talents?.[tree.id] ?? {}), [node.id]: 1 };
        return;
      }
    }
  }
  throw new Error("kein secondPetSlot-Knoten im Content");
}

function setSkillLevel(s: GameState, skill: string, level: number): void {
  s.skills[skill] = { xp: xpForLevel(level) };
}

/** Ein Engine-Tick über den öffentlichen Pfad (advance mit genau TICK_MS). */
function stepOnce(s: GameState): void {
  advance(s, content, TICK_MS);
}

describe("Echo (1.3.0): besessene, nicht ausgerüstete Begleiter wirken mit 25 %", () => {
  it("nur besessen ⇒ 25 %, ausgerüstet ⇒ 100 % (nie 125 %), nicht besessen ⇒ 0", () => {
    const s = freshGame();
    expect(petDoubleYieldBonus(s, content, "leatherworking")).toBe(0);
    own(s, "quillshrike", "rotbark");
    equipPet(s, "rotbark");
    expect(petEchoActive(s, content, "quillshrike")).toBe(true);
    expect(petEchoActive(s, content, "rotbark")).toBe(false);
    expect(petDoubleYieldBonus(s, content, "leatherworking")).toBeCloseTo(0.05 * PET_ECHO_FACTOR, 12);
    equipPet(s, "quillshrike");
    expect(petDoubleYieldBonus(s, content, "leatherworking")).toBeCloseTo(0.05, 12);
    // Die Kampf-Fähigkeit kommt NIE aus dem Echo: nur Platz 1 kämpft.
    expect(petCombatAbility(s, content)?.kind).toBe("multiHit");
  });

  it("gleiche Effektart im selben Skill: das Maximum zählt, Echo summiert nicht", () => {
    // Zwei Test-Begleiter mit doubleDrop/mining (0,05 und 0,04): beide nur besessen ⇒ max(0,0125; 0,01).
    const c: ContentDB = {
      ...content,
      pets: {
        ...content.pets,
        echo_a: { ...content.pets.cragmaw!, id: "echo_a", skillEffect: { kind: "doubleDrop", skill: "mining", value: 0.05 } },
        echo_b: { ...content.pets.cragmaw!, id: "echo_b", skillEffect: { kind: "doubleDrop", skill: "mining", value: 0.04 } },
      },
    };
    const s = createGame({ name: "Rework" }, c, 1);
    own(s, "echo_a", "echo_b");
    s.character.companionPetId = null;
    expect(petDoubleYieldBonus(s, c, "mining")).toBeCloseTo(0.0125, 12);
    equipPet(s, "echo_b"); // Platz 1 = 0,04 schlägt das Echo von echo_a (0,0125)
    expect(petDoubleYieldBonus(s, c, "mining")).toBeCloseTo(0.04, 12);
  });

  it("Platz 2 + Echo: Platz 2 wirkt voll (nur Fertigkeit), die übrigen als Echo, je Art das Maximum", () => {
    const s = freshGame();
    own(s, "gemwraith", "quillshrike", "flayling", "ironmaw", "carapace");
    unlockSecondSlot(s, content);
    equipPet(s, "gemwraith");
    expect(equipSecondPet(s, content, "quillshrike")).toBe(true);
    // Platz 2 voll (0,05), nicht 0,05 + Echo.
    expect(petDoubleYieldBonus(s, content, "leatherworking")).toBeCloseTo(0.05, 12);
    expect(petEchoActive(s, content, "quillshrike")).toBe(false);
    // Übrige als Echo: Gerberhand 0,015, Eisenkiefer 0,0075, Panzerhaut 0,0125.
    const tan = content.actions.tan_leather!;
    expect(petPrepSpeed(s, content, tan)).toBeCloseTo(0.06 * PET_ECHO_FACTOR, 12);
    expect(petStyleDamage(s, content, "melee")).toBeCloseTo(0.03 * PET_ECHO_FACTOR, 12);
    expect(computeStats(s, content).damageReduction).toBeCloseTo(0.05 * PET_ECHO_FACTOR, 12);
    // Kampf: nur Platz 1 (Prismenlanze).
    expect(petCombatAbility(s, content)?.kind).toBe("guaranteedCrit");
    // Platz 2 = Chitinpanzer ⇒ Panzerhaut voll, Doppelnaht fällt aufs Echo zurück.
    expect(equipSecondPet(s, content, "carapace")).toBe(true);
    expect(computeStats(s, content).damageReduction).toBeCloseTo(0.05, 12);
    expect(petDoubleYieldBonus(s, content, "leatherworking")).toBeCloseTo(0.0125, 12);
  });
});

describe("1.3.0 Fertigkeiten: neue Effektarten sind angewandt", () => {
  it("bonusFind rootFind (Faulrinde): Saat der höchsten Crop ≤ Baum-Stufe oder Vogelnest, nur beim Fällen", () => {
    const s = freshGame();
    own(s, "rotbark");
    equipPet(s, "rotbark");
    const oak = content.actions.cut_oak_tree!;
    const find = petBonusFind(s, content, oak)!;
    expect(find.chance).toBeCloseTo(0.06, 12);
    expect(find.pool).toBe("rootFind");
    expect(find.secondary).toBe("birds_nest");
    const crops = Object.values(content.crops ?? {}).filter((cr) => cr.levelRequired <= (oak.levelRequired ?? 1));
    const best = crops.reduce((a, b) => (b.levelRequired > a.levelRequired ? b : a));
    expect(find.primary).toBe(best.seedItem);
    // Handwerks-Aktion des Skills (mit inputs) ⇒ kein Fund.
    expect(petBonusFind(s, content, content.actions.craft_timber_beam!)).toBeNull();
    // Ohne Begleiter ⇒ kein Fund, kein Wurf.
    expect(petBonusFind(freshGame(), content, oak)).toBeNull();
  });

  it("bonusFind veinGem (Felsschlund): das seltenste rough_* der Loot-Tabelle; Wurf deterministisch", () => {
    const s = freshGame();
    own(s, "cragmaw");
    equipPet(s, "cragmaw");
    expect(petBonusFind(s, content, content.actions.mine_copper!)?.primary).toBe("rough_garnet");
    expect(petBonusFind(s, content, content.actions.mine_garnet_seam!)?.primary).toBe("rough_sapphire");
    // rollPetBonusFind: Treffer genau dann, wenn der erste nextFloat < Chance (ein Zug, ohne Auswahl-Wurf).
    const find = petBonusFind(s, content, content.actions.mine_copper!)!;
    let hit = false;
    for (let seed = 1; seed < 400 && !hit; seed++) {
      s.rng.state = seed;
      const probe = { state: s.rng.state };
      const expectHit = nextFloat(probe) < find.chance;
      const got = rollPetBonusFind(s, find);
      expect(got).toBe(expectHit ? "rough_garnet" : null);
      expect(s.rng.state).toBe(probe.state);
      hit = expectHit;
    }
    expect(hit).toBe(true);
  });

  it("bonusFind über den Aktions-Pfad: Funde landen im Inventar, ohne Begleiter nie", () => {
    const probe = freshGame();
    own(probe, "rotbark");
    equipPet(probe, "rotbark");
    const seed = petBonusFind(probe, content, content.actions.cut_oak_tree!)!.primary!;
    const run = (pets: string[], equip: string | null): number => {
      const s = freshGame(77);
      own(s, ...pets);
      s.character.companionPetId = equip;
      setSkillLevel(s, "woodcutting", 10);
      s.activeActionId = "cut_oak_tree";
      const ms = effectiveActionDurationMs(s, content, content.actions.cut_oak_tree!);
      for (let i = 0; i < 300 * Math.ceil(ms / TICK_MS); i++) stepOnce(s);
      return itemCount(s.inventory, seed) + (s.bank[seed] ?? 0);
    };
    expect(run([], null)).toBe(0);
    expect(run(["rotbark"], "rotbark")).toBeGreaterThan(0);
  });

  it("tierUp (Kiemenfäule/Sporenwicht/Edelsteinwicht/Pergamotte): nächster Leiter-Eintrag nur bis zur eigenen Stufe", () => {
    expect(petTierUpTarget(content, "fishing", "fish", "raw_trout", 99)).toBe("raw_cod");
    expect(petTierUpTarget(content, "fishing", "fish", "raw_trout", 14)).toBeNull(); // Kabeljau ab 15
    expect(petTierUpTarget(content, "fishing", "fish", "raw_idolscale", 99)).toBeNull(); // oberste Stufe
    expect(petTierUpTarget(content, "jewelcrafting", "gemCut", "garnet", 15)).toBe("sapphire");
    expect(petTierUpTarget(content, "jewelcrafting", "gemCut", "garnet_ring", 99)).toBeNull(); // kein Leiter-Item
    expect(petTierUpTarget(content, "foraging", "forage", "fungus_soot", 27)).toBe("fungus_pale");
    expect(petTierUpTarget(content, "runecrafting", "runes", "force_rune", 10)).toBe("frost_rune");
    // Jede Leiter enthält nur vorhandene Items.
    for (const ladders of Object.values(content.petTierLadders ?? {})) {
      for (const ladder of ladders) for (const id of ladder) expect(content.items[id], id).toBeDefined();
    }
    const s = freshGame();
    own(s, "gillrot");
    expect(petTierUp(s, content, "fishing")?.ladder).toBe("fish");
    expect(petTierUp(s, content, "fishing")?.chance).toBeCloseTo(0.05 * PET_ECHO_FACTOR, 12);
    equipPet(s, "gillrot");
    expect(petTierUp(s, content, "fishing")?.chance).toBeCloseTo(0.05, 12);
    expect(petTierUp(s, content, "mining")).toBeNull();
  });

  it("tierUp über den Aktions-Pfad: Meisterschliff liefert gelegentlich den höheren Stein", () => {
    const s = freshGame(31);
    own(s, "gemwraith");
    equipPet(s, "gemwraith");
    setSkillLevel(s, "jewelcrafting", 99);
    addItem(s.inventory, content, "rough_garnet", 400);
    s.activeActionId = "cut_garnet";
    const ms = effectiveActionDurationMs(s, content, content.actions.cut_garnet!);
    for (let i = 0; i < 400 * Math.ceil(ms / TICK_MS) && itemCount(s.inventory, "rough_garnet") > 0; i++) stepOnce(s);
    const sapphires = itemCount(s.inventory, "sapphire") + (s.bank.sapphire ?? 0);
    const garnets = itemCount(s.inventory, "garnet") + (s.bank.garnet ?? 0);
    expect(sapphires).toBeGreaterThan(0);
    expect(garnets).toBeGreaterThan(sapphires * 5);
  });

  it("growSpeed (Welkling): Reifezeit × (1 − 6 %), Echo × (1 − 1,5 %)", () => {
    const crop = Object.values(content.crops ?? {})[0]!;
    const s = freshGame();
    const base = effectiveGrowMs(s, content, crop);
    own(s, "witherling");
    s.character.companionPetId = null;
    expect(petGrowSpeed(s, content)).toBeCloseTo(0.015, 12);
    expect(effectiveGrowMs(s, content, crop)).toBe(Math.round(base * (1 - 0.015)));
    equipPet(s, "witherling");
    expect(effectiveGrowMs(s, content, crop)).toBe(Math.round(base * (1 - 0.06)));
  });

  it("thievingFinesse (Düsterratte): +4 % Erfolg, Betäubung ×0,5; Echo +1 % und ×0,875", () => {
    const s = freshGame();
    expect(petThievingStunMult(s, content, "thieving")).toBe(1);
    own(s, "gloomrat");
    s.character.companionPetId = null;
    expect(petThievingBonus(s, content, "thieving")).toBeCloseTo(0.01, 12);
    expect(petThievingStunMult(s, content, "thieving")).toBeCloseTo(0.875, 12);
    equipPet(s, "gloomrat");
    expect(petThievingBonus(s, content, "thieving")).toBeCloseTo(0.04, 12);
    expect(petThievingStunMult(s, content, "thieving")).toBeCloseTo(0.5, 12);
    expect(petThievingStunMult(s, content, "mining")).toBe(1);
  });

  it("craftSuffixChance (Schlackenscheusal): +5 Pp Suffix-Chance beim Schmieden, sonst 0", () => {
    const s = freshGame();
    own(s, "slagfiend");
    equipPet(s, "slagfiend");
    expect(petCraftSuffixBonus(s, content, "smithing")).toBeCloseTo(0.05, 12);
    expect(petCraftSuffixBonus(s, content, "tailoring")).toBe(0);
  });

  it("foodHealBonus (Aschbauch): Essen heilt 10 % mehr", () => {
    const sturdy = (): GameState => {
      const g = freshGame();
      setSkillLevel(g, "vitality", 99);
      return g;
    };
    const maxHp = computeStats(sturdy(), content).maxHp;
    const food = Object.values(content.items).find(
      (i) =>
        i.type === "consumable" && !i.buff && !i.curesPoison && !i.consumable && !isHealPotion(content, i.id) &&
        consumableHeal(i, maxHp) >= 10 && consumableHeal(i, maxHp) < maxHp / 2,
    )!;
    const heal = (withPet: boolean): number => {
      const s = sturdy();
      if (withPet) {
        own(s, "ashgut");
        equipPet(s, "ashgut");
      }
      s.character.hp = 1;
      addItem(s.inventory, content, food.id, 1);
      expect(useConsumable(s, content, food.id)).toBe(true);
      return s.character.hp - 1;
    };
    const base = heal(false);
    const boosted = heal(true);
    expect(base).toBe(consumableHeal(food, maxHp));
    expect(boosted).toBe(Math.round(base * 1.1));
    const s = freshGame();
    own(s, "ashgut");
    equipPet(s, "ashgut");
    expect(petFoodHealMult(s, content)).toBeCloseTo(1.1, 12);
  });

  it("styleDamage (Eisenschlund): Nahkampf-Schadensspanne × 1,03, andere Stile unberührt", () => {
    const s = freshGame();
    const base = computeStats(s, content);
    own(s, "ironmaw");
    equipPet(s, "ironmaw");
    const boosted = computeStats(s, content);
    expect(base.style).toBe("melee");
    expect(boosted.maxHit).toBeCloseTo(base.maxHit * 1.03, 9);
    expect(petStyleDamage(s, content, "magic")).toBe(0);
  });

  it("wardCapacityPct (Frostgroll): maxWard × 1,06 mit Stoff-Pool, ohne Pool wirkungslos", () => {
    const cloth = Object.values(content.items).find((i) => (i.wardCapacity ?? 0) > 0 && i.slot)!;
    const s = freshGame();
    own(s, "hoarspite");
    equipPet(s, "hoarspite");
    expect(petWardCapacityPct(s, content)).toBeCloseTo(0.06, 12);
    expect(computeStats(s, content).maxWard).toBe(0);
    const noPet = freshGame();
    (noPet.character.equipment as Record<string, string | null>)[cloth.slot!] = cloth.id;
    (s.character.equipment as Record<string, string | null>)[cloth.slot!] = cloth.id;
    expect(computeStats(s, content).maxWard).toBeCloseTo(computeStats(noPet, content).maxWard * 1.06, 9);
  });

  it("prepSpeed (Schindling): Leder-Vorstufen 6 % schneller, Ausrüstungs-Rezepte nicht", () => {
    const s = freshGame();
    const tan = content.actions.tan_leather!;
    const body = content.actions.craft_leather_body!;
    const baseTan = effectiveActionDurationMs(s, content, tan);
    const baseBody = effectiveActionDurationMs(s, content, body);
    own(s, "flayling");
    equipPet(s, "flayling");
    expect(Math.abs(effectiveActionDurationMs(s, content, tan) - baseTan * 0.94)).toBeLessThanOrEqual(1);
    expect(effectiveActionDurationMs(s, content, body)).toBe(baseBody);
  });
});

// ── Kampf-Fähigkeiten ────────────────────────────────────────────────────────

/** Content mit einem robusten Trainings-Huhn (viel LP, kein Regen, keine Resistenzen). */
function arena(patch: Partial<MonsterDef> = {}, extraPets: ContentDB["pets"] = {}): ContentDB {
  return {
    ...content,
    pets: { ...content.pets, ...extraPets },
    monsters: {
      ...content.monsters,
      chicken: { ...content.monsters.chicken!, maxHp: 100_000, regen: undefined, resist: undefined, ...patch },
    },
  };
}

function fighter(c: ContentDB, petId: string, seed = 11): GameState {
  const s = createGame({ name: "Pet", baseAttributes: { str: 5, dex: 5 } }, c, seed);
  own(s, petId);
  equipPet(s, petId);
  expect(startCombat(s, c, "chicken")).toBe(true);
  return s;
}

/** Ein Tick ohne Spieler-Angriff (der Spieler-Timer wird zurückgehalten) — isoliert Pet/DoT-Schaden. */
function quietStep(s: GameState, c: ContentDB): void {
  s.combat.playerTimerMs = -1_000_000;
  combatStep(s, c);
}

function runUntil(s: GameState, c: ContentDB, max: number, pred: () => boolean): boolean {
  for (let i = 0; i < max; i++) {
    quietStep(s, c);
    if (pred()) return true;
  }
  return pred();
}

const petLogs = (s: GameState, ability: string) =>
  s.combat.log.filter((e) => e.kind === "petAbility" && e.ability === ability);

describe("1.3.0 Kampf-Fähigkeiten: neue Effektarten sind angewandt", () => {
  it("currentHpStrike (Kiemenfäule „Sog“): 16 % der AKTUELLEN Gegner-LP", () => {
    const c = arena();
    const s = fighter(c, "gillrot");
    s.combat.enemyHp = 50_000;
    let before = s.combat.enemyHp;
    const fired = runUntil(s, c, 100, () => {
      if (petLogs(s, "currentHpStrike").length > 0) return true;
      before = s.combat.enemyHp;
      return false;
    });
    expect(fired).toBe(true);
    expect(petLogs(s, "currentHpStrike")[0]!.amount).toBe(Math.round(before * 0.16));
  });

  it("crippleStrike (Leon): Krit-Treffer, danach 3 s lang −25 % Gegner-Angriffstempo", () => {
    const c = arena();
    const s = fighter(c, "booted_tomcat");
    expect(runUntil(s, c, 100, () => petLogs(s, "crippleStrike").length > 0)).toBe(true);
    expect(petLogs(s, "crippleStrike")[0]!.amount).toBe(Math.round(100_000 * 0.05));
    expect(s.combat.petAbility.enemySlowMs).toBeGreaterThan(0);
    expect(s.combat.petAbility.enemySlowPct).toBe(0.25);
    s.combat.enemyTimerMs = 0;
    quietStep(s, c);
    expect(s.combat.enemyTimerMs).toBeCloseTo(TICK_MS * 0.75, 9);
  });

  it("cripplingPoison (Schierling): Gift, und solange es liegt −20 % Gegner-Angriffstempo", () => {
    const c = arena();
    const s = fighter(c, "hemlock");
    expect(runUntil(s, c, 100, () => s.combat.enemyEffects.some((e) => e.type === "poison"))).toBe(true);
    s.combat.enemyTimerMs = 0;
    quietStep(s, c);
    expect(s.combat.enemyTimerMs).toBeCloseTo(TICK_MS * 0.8, 9);
  });

  it("emberBrand (Schlackenscheusal): Brand 5 s, Glut-Stapel steigern die Brand-Ticks (+10 % je Stapel über 1)", () => {
    const c = arena();
    const s = fighter(c, "slagfiend");
    expect(runUntil(s, c, 100, () => s.combat.enemyEffects.some((e) => e.type === "burn"))).toBe(true);
    const burn = s.combat.enemyEffects.find((e) => e.type === "burn")!;
    expect(burn.magnitude).toBe(Math.round(100_000 * 0.012));
    expect(burn.remainingMs).toBe(5000);
    expect(s.combat.elemental?.enemy.emberStacks).toBe(1);
    const tickDmg = (stacks: number): number => {
      s.combat.elemental!.enemy.emberStacks = stacks;
      burn.remainingMs = 4000;
      s.combat.petAbility.timerMs = 0; // kein Auslösen in diesem Tick
      const hp = s.combat.enemyHp;
      quietStep(s, c);
      return hp - s.combat.enemyHp;
    };
    const one = tickDmg(1);
    const three = tickDmg(3);
    expect(three / one).toBeCloseTo(1.2, 6);
  });

  it("emberDetonate (Scheiterling): Brand + Zündung aller Glut-Stapel (Stapel × 3,5 % maxHp), danach 0 Stapel", () => {
    const c = arena();
    const s = fighter(c, "pyreling");
    s.combat.enemyEffects.push({ type: "burn", remainingMs: 60_000, magnitude: 1 });
    s.combat.elemental = createElementalCounters();
    s.combat.elemental.enemy.emberStacks = 3;
    expect(runUntil(s, c, 100, () => petLogs(s, "emberDetonate").length > 0)).toBe(true);
    // Der Brand des Scheiterlings zählt +1 ⇒ 4 Stapel; brennendes Ziel ⇒ Glut ×1,1.
    expect(petLogs(s, "emberDetonate")[0]!.amount).toBe(Math.round(100_000 * 4 * 0.035 * 1.1));
    expect(s.combat.elemental.enemy.emberStacks).toBe(0);
    expect(s.combat.enemyEffects.some((e) => e.type === "burn")).toBe(true);
  });

  it("executeBleed (Blutbracke „Reißen“): Blutungs-Ticks ×2 unter 50 % Gegner-LP", () => {
    const c = arena();
    const s = fighter(c, "gorehound");
    expect(runUntil(s, c, 100, () => s.combat.enemyEffects.some((e) => e.type === "bleed"))).toBe(true);
    const bleed = s.combat.enemyEffects.find((e) => e.type === "bleed")!;
    const tickDmg = (hp: number): number => {
      s.combat.enemyHp = hp;
      bleed.remainingMs = 2000;
      s.combat.petAbility.timerMs = 0;
      quietStep(s, c);
      return hp - s.combat.enemyHp;
    };
    const high = tickDmg(80_000);
    const low = tickDmg(40_000);
    expect(low / high).toBeCloseTo(2, 6);
  });

  it("frostBite (Frostgroll): jeder dritte Biss friert ein; läuft die Immunität, bleibt der Zähler bei 2", () => {
    const c = arena({ damage: 0 });
    const s = fighter(c, "hoarspite");
    expect(runUntil(s, c, 2000, () => petLogs(s, "frostBite").length >= 3)).toBe(true);
    expect(s.combat.petAbility.frostBites).toBe(0);
    const ec = s.combat.elemental!.enemy;
    expect(ec.frozen || s.combat.log.some((e) => e.by === "enemy" && e.missReason === "frozen")).toBe(true);
    expect(ec.freezeImmunityMs).toBeGreaterThan(0);
    // Zwei weitere Bisse, dann mit laufender Immunität der dritte: kein Einfrieren, Zähler 2.
    expect(runUntil(s, c, 2000, () => petLogs(s, "frostBite").length >= 5)).toBe(true);
    ec.freezeImmunityMs = FREEZE_IMMUNITY_MS * 10;
    ec.frozen = false;
    expect(runUntil(s, c, 2000, () => petLogs(s, "frostBite").length >= 6)).toBe(true);
    expect(s.combat.petAbility.frostBites).toBe(2);
    expect(ec.frozen).toBe(false);
  });

  it("emergencyHeal (Aschbauch „Notration“): geladen ab Kampfbeginn, heilt unter 40 % LP, dann 20 s Abklingzeit", () => {
    const c = arena({ damage: 0 });
    const s = fighter(c, "ashgut");
    const maxHp = computeStats(s, c).maxHp;
    const low = Math.floor(maxHp * 0.3);
    s.character.hp = low;
    quietStep(s, c);
    expect(petLogs(s, "emergencyHeal")).toHaveLength(1);
    expect(petLogs(s, "emergencyHeal")[0]!.amount).toBe(Math.round(maxHp * 0.15));
    expect(s.combat.petAbility.chargeMs).toBeGreaterThan(19_000);
    for (let i = 0; i < 150; i++) {
      s.character.hp = low; // 15 s unter der Schwelle: noch nicht wieder geladen
      quietStep(s, c);
    }
    expect(petLogs(s, "emergencyHeal")).toHaveLength(1);
    const again = runUntil(s, c, 100, () => {
      if (petLogs(s, "emergencyHeal").length === 2) return true;
      s.character.hp = low;
      return false;
    });
    expect(again).toBe(true);
  });

  it("deathSave (Seidenweber „Rettungsfaden“): ein tödlicher Treffer lässt 1 LP, danach 60 s Abklingzeit", () => {
    const c = arena({ damage: 5000, accuracy: 100_000 });
    const s = fighter(c, "silkweaver");
    s.character.hp = 5; // unter ONE_SHOT_CAP × maxHp ⇒ jeder Treffer ist tödlich
    expect(runUntil(s, c, 200, () => petLogs(s, "deathSave").length > 0)).toBe(true);
    expect(s.character.hp).toBe(1);
    expect(s.combat.petAbility.chargeMs).toBeGreaterThan(50_000);
    // Der nächste tödliche Treffer (Abklingzeit läuft) beendet den Kampf.
    expect(runUntil(s, c, 200, () => s.combat.monsterId === null)).toBe(true);
    expect(petLogs(s, "deathSave")).toHaveLength(1);
  });

  it("stealDrop (Düsterratte „Langfinger“): höchstens EIN Erfolg je Begegnung", () => {
    const sure: PetCombatAbility = { kind: "stealDrop", name: { en: "T", de: "T" }, intervalMs: 1000, value: 1 };
    const c = arena({}, { thief: { ...content.pets.gloomrat!, id: "thief", combatAbility: sure } });
    const s = fighter(c, "thief");
    for (let i = 0; i < 100; i++) quietStep(s, c);
    expect(petLogs(s, "stealDrop")).toHaveLength(1);
    expect(s.combat.petAbility.stolenThisEncounter).toBe(true);
  });

  it("wardRestore (Glyphenschlund, gedämpft): Gutschrift 4 % der maxHp, ohne Stoff-Pool ein No-op", () => {
    const cloth = Object.values(content.items)
      .filter((i) => (i.wardCapacity ?? 0) > 0 && i.slot)
      .reduce((a, b) => ((b.wardCapacity ?? 0) > (a.wardCapacity ?? 0) ? b : a));
    const c = arena({ damage: 0 });
    const s = createGame({ name: "Pet", baseAttributes: { str: 5, dex: 5 } }, c, 5);
    (s.character.equipment as Record<string, string | null>)[cloth.slot!] = cloth.id;
    own(s, "glyphmaw");
    equipPet(s, "glyphmaw");
    expect(startCombat(s, c, "chicken")).toBe(true);
    const stats = computeStats(s, c);
    expect(stats.maxWard).toBeGreaterThan(stats.maxHp * 0.08); // genug Luft, damit der Deckel nicht greift
    s.character.ward = 0;
    expect(runUntil(s, c, 100, () => petLogs(s, "wardRestore").length > 0)).toBe(true);
    expect(petLogs(s, "wardRestore")[0]!.amount).toBe(Math.round(stats.maxHp * 0.04));
    const bare = fighter(c, "glyphmaw", 6);
    expect(runUntil(bare, c, 100, () => petLogs(bare, "wardRestore").length > 0)).toBe(true);
    expect(petLogs(bare, "wardRestore")[0]!.amount).toBe(0);
  });
});

describe("Aasschwinge (Chef 17.10.): doppelte Beute ohne Champion-Unikate", () => {
  it("der Zweitwurf verdoppelt normale Beute, aber nie ein Champion-Unikat", () => {
    // Ein stapelbares Material als (Test-)Champion-Unikat registrieren, damit die Zählung über Stapel läuft.
    const unique = "raw_chicken";
    const anyVariant = Object.values(content.elites ?? {})[0]!;
    const c: ContentDB = {
      ...content,
      elites: { ...content.elites, test_variant: { ...anyVariant, id: "test_variant", uniqueItemId: unique } },
      monsters: {
        ...content.monsters,
        chicken: {
          ...content.monsters.chicken!,
          loot: [
            { itemId: "feather", chance: 1, min: 1, max: 1 },
            { itemId: unique, chance: 1, min: 1, max: 1 },
          ],
        },
      },
    };
    const s = createGame({ name: "Aas", baseAttributes: { str: 80, dex: 80 } }, c, 99);
    own(s, "carrionwing");
    equipPet(s, "carrionwing");
    expect(startCombat(s, c, "chicken")).toBe(true);
    for (let i = 0; i < 120_000 && s.combat.kills < 400; i++) combatStep(s, c);
    const kills = s.combat.kills;
    expect(kills).toBeGreaterThanOrEqual(400);
    const count = (id: string) => itemCount(s.inventory, id) + (s.bank[id] ?? 0);
    expect(count("feather")).toBeGreaterThan(kills); // mind. ein Aasfund-Proc
    expect(count(unique)).toBe(kills); // Unikat genau einmal je Kill
  });
});
