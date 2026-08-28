import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import {
  BOOSTABLE_COMBAT_SKILL_IDS,
  PET_ABILITY_CAP,
  PET_ABILITY_STATUS,
  PET_SKILL_EFFECT_CAP,
  PET_WHOLE_LEVEL_KINDS,
  SKILL_SCOPED_PET_KINDS,
  type ContentDB,
  type CropDef,
  type ItemDef,
  type PetAbilityKind,
  type PetDef,
  type PetSkillEffect,
  type PetSkillEffectKind,
  type WeaponStyle,
} from "@hearthforge/shared";
import { createGame } from "./state";
import { computeStats } from "./character";
import { advance } from "./tick";
import { plantCrop } from "./farming";
import { setActiveAction } from "./actions";
import { addItem } from "./inventory";
import { effectiveSellPrice, sellItem, sellPrice } from "./shop";
import { nextFloat } from "./rng";
import {
  equipPet,
  grantPet,
  petCombatAbility,
  petDamageReduction,
  petDoubleLootChance,
  petDoubleYieldBonus,
  petInstantActionChance,
  petKillHealFraction,
  petLifesteal,
  petSpellReserveMult,
  petPreserveBonus,
  petSellBonus,
  petSkillBoost,
  petThievingBonus,
  tryPetDrop,
} from "./pets";

const ALL_SKILL_KINDS: PetSkillEffectKind[] = [
  "instantAction", "doubleDrop", "gatherYield", "thievingSuccess", "refundMaterial",
  "perfectCook", "bonusAmmo", "flawlessGem", "bonusRunes", "potionPreserve", "spellReserve",
  // #276 Pet-Redesign: die 6 neuen Passiv-Kinds (Spec §4.2)
  "lifesteal", "skillBoost", "damageReduction", "doubleLoot", "killHeal", "sellBonus",
  // 1.2.0 „Fasern und Fallen" (Chef 28.08.2026): Jagen-Begleiter — Fangchance der Fallen (hunting.ts)
  "huntCatchChance",
];
const ALL_ABILITY_KINDS: PetAbilityKind[] = [
  "stun", "burstDamage", "onHitStatus", "delayedDot", "accuracyDownEnemy", "stealDrop", "heal",
  "shield", "armorRend", "guaranteedCrit", "wardRestore", "lifestealBurst", "enemyAttackDelay",
  "blockNextEnemyHit", "armorPierceHit", "multiHit",
];
/** Status-bringende Kinds müssen ein gültiges `status` tragen. */
const STATUS_KINDS = new Set<PetAbilityKind>(["onHitStatus", "delayedDot"]);
/** Globale (skill-freie) Passiv-Kinds — Gegenstück zu SKILL_SCOPED_PET_KINDS. */
const GLOBAL_SKILL_KINDS: PetSkillEffectKind[] = [
  "spellReserve", "lifesteal", "damageReduction", "doubleLoot", "killHeal", "sellBonus",
];

// ─────────────────────────────────────────────────────────────────────────────
// ÜBERGANGS-DULDUNGEN (#276, Spec design/pet-redesign-spec.md §7): logic-dev (Schritt 1) hat
// Typen/Engine umgestellt, content-dev (Schritt 3) hat die 21 Pet-Einträge nachgezogen — alle
// drei Listen sind jetzt LEER, die Guards unten sind dauerhaft scharf geschaltet.
// ─────────────────────────────────────────────────────────────────────────────

/** Die 6 Alt-Pets mit VERBOTENEM skillXp-Passiv (Engine behandelt es als No-op). */
const LEGACY_SKILLXP_PETS: string[] = [];
/** Bestands-Pets, deren `combatAbility.name` (PFLICHT, Spec §3) noch fehlt. */
const PENDING_ABILITY_NAME_PETS: string[] = [];
/** DoT-Pets, deren `value` noch die ALTE Flat-Magnitude/s trägt (neue Semantik: Bruch maxHp/s, Cap 0.04). */
const PENDING_DOT_PERCENT_PETS: string[] = [];

describe("pet integrity: Content-Guards (Skill-Passiv + getriggerte Ability)", () => {
  const pets = content.pets ?? {};
  const skillIds = new Set(Object.keys(content.skills));

  it("keine doppelten Pet-IDs / Key == id", () => {
    for (const [key, pet] of Object.entries(pets)) {
      expect(pet.id, `Pet-Key ${key} ≠ id ${pet.id}`).toBe(key);
    }
  });

  it("jedes Pet hat name en + de", () => {
    for (const pet of Object.values(pets)) {
      const n = pet.name;
      expect(typeof n === "object" && !!n.en && !!n.de, `Pet ${pet.id}: name en/de fehlt`).toBe(true);
    }
  });

  it("jedes Pet ist erhältlich (Quelle gültig)", () => {
    for (const pet of Object.values(pets)) {
      if (pet.source.kind === "skill") {
        const srcSkill = pet.source.skill;
        expect(skillIds.has(srcSkill), `Pet ${pet.id}: Quell-Skill ${srcSkill} fehlt`).toBe(true);
        // Farming-Skill hat passive Crops statt Aktionen — entweder actions oder crops decken den Skill ab.
        // Jagen (1.2.0) hat passive Fallen (`huntingZones`, Wurf je Fang in hunting.ts grantCatch).
        const hasAction = Object.values(content.actions).some((a) => a.skill === srcSkill);
        const hasCrops = srcSkill === "farming" && Object.keys(content.crops ?? {}).length > 0;
        const hasTraps = srcSkill === "hunting" && (content.huntingZones?.length ?? 0) > 0;
        expect(hasAction || hasCrops || hasTraps, `Pet ${pet.id}: keine Aktion für Skill ${srcSkill}`).toBe(true);
      } else {
        expect(Object.keys(content.monsters).length > 0, `Pet ${pet.id}: keine Monster für Combat-Drop`).toBe(true);
      }
    }
  });

  it("skillEffect: Kind bekannt + value im Deckel", () => {
    for (const pet of Object.values(pets)) {
      const k = pet.skillEffect.kind;
      expect(ALL_SKILL_KINDS.includes(k), `Pet ${pet.id}: unbekanntes skillEffect-Kind ${k}`).toBe(true);
      const cap = PET_SKILL_EFFECT_CAP[k];
      if (pet.skillEffect.value !== undefined) {
        expect(pet.skillEffect.value, `Pet ${pet.id}: skillEffect.value über Deckel ${cap}`).toBeLessThanOrEqual(cap);
        expect(pet.skillEffect.value, `Pet ${pet.id}: skillEffect.value negativ`).toBeGreaterThanOrEqual(0);
      }
      // skillBoost-Sonderfall (#276 §5.3): value = GANZE Level, skill MUSS boostbar sein (nie vitality).
      if (k === "skillBoost") {
        expect(Number.isInteger(pet.skillEffect.value ?? 0), `Pet ${pet.id}: skillBoost.value muss GANZE Level sein`).toBe(true);
        expect(
          (BOOSTABLE_COMBAT_SKILL_IDS as string[]).includes(pet.skillEffect.skill ?? ""),
          `Pet ${pet.id}: skillBoost.skill ${pet.skillEffect.skill} ist nicht boostbar (vitality verboten)`,
        ).toBe(true);
      }
    }
  });

  it("combatAbility: Kind bekannt, intervalMs>0, value im Deckel (DoT-Alt-Werte geduldet)", () => {
    for (const pet of Object.values(pets)) {
      const ab = pet.combatAbility;
      expect(ALL_ABILITY_KINDS.includes(ab.kind), `Pet ${pet.id}: unbekanntes ability-Kind ${ab.kind}`).toBe(true);
      expect(Number.isFinite(ab.intervalMs) && ab.intervalMs > 0, `Pet ${pet.id}: intervalMs ≤ 0`).toBe(true);
      if (ab.value === undefined) continue;
      expect(ab.value, `Pet ${pet.id}: ability.value negativ`).toBeGreaterThanOrEqual(0);
      // ÜBERGANG (#276 §5.1): die 6 DoT-Pets tragen noch Flat-Magnituden über dem neuen 0.04-Cap.
      // Engine klemmt sie defensiv auf den Cap (capAbility). content-dev Schritt 3: §3-Werte
      // eintragen und PENDING_DOT_PERCENT_PETS leeren.
      if (PENDING_DOT_PERCENT_PETS.includes(pet.id)) continue;
      const cap = PET_ABILITY_CAP[ab.kind];
      expect(ab.value, `Pet ${pet.id}: ability.value über Deckel ${cap}`).toBeLessThanOrEqual(cap);
    }
  });

  it("Übergangs-Duldung DoT: jeder gelistete Eintrag ist noch Alt — sonst Liste leeren", () => {
    for (const id of PENDING_DOT_PERCENT_PETS) {
      const pet = pets[id];
      expect(pet, `PENDING_DOT_PERCENT_PETS: Pet ${id} existiert nicht — Eintrag entfernen`).toBeDefined();
      const cap = PET_ABILITY_CAP[pet!.combatAbility.kind];
      expect(
        (pet!.combatAbility.value ?? 0) > cap,
        `PENDING_DOT_PERCENT_PETS: Pet ${id} liegt bereits im neuen Deckel — Eintrag LÖSCHEN (Guard scharf schalten)`,
      ).toBe(true);
    }
  });

  it("status-bringende Abilities (onHitStatus/delayedDot) haben gültigen status; andere keinen", () => {
    for (const pet of Object.values(pets)) {
      const ab = pet.combatAbility;
      if (STATUS_KINDS.has(ab.kind)) {
        expect(ab.status, `Pet ${pet.id}: ${ab.kind} ohne status`).toBeDefined();
        expect(PET_ABILITY_STATUS.includes(ab.status!), `Pet ${pet.id}: ungültiger ability-status ${ab.status}`).toBe(true);
      } else {
        expect(ab.status, `Pet ${pet.id}: ${ab.kind} mit unerwartetem status ${ab.status}`).toBeUndefined();
      }
    }
  });

  it("die 6 Beispiel-Pets tragen ihre vorgesehene live-Ability", () => {
    const expected: Record<string, PetAbilityKind> = {
      rotbark: "stun",
      cragmaw: "burstDamage",
      gloomrat: "stealDrop",
      slagfiend: "onHitStatus",
      ashgut: "heal",
      vellumoth: "shield",
    };
    for (const [id, kind] of Object.entries(expected)) {
      expect(pets[id]?.combatAbility.kind, `Pet ${id}: erwartete Ability ${kind}`).toBe(kind);
    }
  });

  it("skill-gebundene skillEffect-Kinds haben einen gültigen Skill; globale Kinds sind skill-frei", () => {
    for (const pet of Object.values(pets)) {
      const se = pet.skillEffect;
      if (SKILL_SCOPED_PET_KINDS.includes(se.kind)) {
        expect(se.skill, `Pet ${pet.id}: skill-gebundenes Kind ohne skillEffect.skill`).toBeDefined();
        expect(skillIds.has(se.skill!), `Pet ${pet.id}: skillEffect.skill ${se.skill} fehlt`).toBe(true);
      } else {
        expect(
          GLOBAL_SKILL_KINDS.includes(se.kind),
          `Pet ${pet.id}: unerwartetes globales skillEffect-Kind ${se.kind}`,
        ).toBe(true);
      }
    }
  });

  it("combatAbility.name: PFLICHT en+de (Bestands-Pets ohne Namen geduldet — selbstreinigend)", () => {
    for (const pet of Object.values(pets)) {
      const n = pet.combatAbility.name;
      if (n === undefined) {
        // ÜBERGANG (#276 §3): nur Bestands-Pets dürfen (noch) namenlos sein. Jedes NEUE Pet
        // MUSS mit Ability-Namen kommen. content-dev Schritt 3: Namen setzen + Liste leeren.
        expect(
          PENDING_ABILITY_NAME_PETS.includes(pet.id),
          `Pet ${pet.id}: combatAbility.name (en+de) ist PFLICHT (Spec #276 §3)`,
        ).toBe(true);
        continue;
      }
      expect(
        typeof n === "object" && !!n.en && !!(n as { de?: string }).de,
        `Pet ${pet.id}: combatAbility.name braucht nicht-leeres en+de`,
      ).toBe(true);
    }
  });

  it("Übergangs-Duldung Namen: jeder gelistete Eintrag ist noch namenlos — sonst Liste leeren", () => {
    for (const id of PENDING_ABILITY_NAME_PETS) {
      const pet = pets[id];
      expect(pet, `PENDING_ABILITY_NAME_PETS: Pet ${id} existiert nicht — Eintrag entfernen`).toBeDefined();
      expect(
        pet!.combatAbility.name,
        `PENDING_ABILITY_NAME_PETS: Pet ${id} hat bereits einen Namen — Eintrag LÖSCHEN (Guard scharf schalten)`,
      ).toBeUndefined();
    }
  });

  it("jedes Combat-Pet (source.kind=combat) trägt einen gültigen style (Chef-Fix 2026-07-22)", () => {
    const validStyles = ["melee", "ranged", "magic"];
    for (const pet of Object.values(pets)) {
      if (pet.source.kind !== "combat") continue;
      expect(
        validStyles.includes(pet.source.style),
        `Pet ${pet.id}: source.style fehlt/ungültig (${pet.source.style}) — Combat-Pets sind an einen Stil gebunden`,
      ).toBe(true);
    }
  });

  it("dropChance im sehr-seltenen Band (≤ 1/50000, witherling per-Design-Ausnahme)", () => {
    // balance-fix 2026-07 (Sweep4 P2): witherling (Farming) ist bewusst höher als das allgemeine Band.
    // Farming ist passiv/ernte-arm (~1.500 Ernten über einen vollen 1→99-Grind statt ~100k+ Aktionen
    // wie bei aktiven Sammel-Skills), darum braucht es ~1/15000, um ein vergleichbares P(≥1 bis 99) zu
    // erreichen (vorher 1/105000 ⇒ ~1,5 %). Alle anderen Pets bleiben im ≤1/50000-Band.
    // 1.2.0 (Chef 28.08.2026): booted_tomcat (Jagen) wirft je FANG (5–60 min je Falle, ~1 000–2 500 Fänge
    // über einen 1→99-Grind) — dieselbe Ernte-arm-Logik wie witherling, Content trägt 1/15000.
    const SPARSE_SOURCE_PETS = new Set(["witherling", "booted_tomcat"]);
    for (const pet of Object.values(pets)) {
      const cap = SPARSE_SOURCE_PETS.has(pet.id) ? 1 / 10000 : 1 / 50000;
      expect(pet.dropChance, `Pet ${pet.id}: dropChance zu hoch`).toBeLessThanOrEqual(cap);
      expect(pet.dropChance, `Pet ${pet.id}: dropChance ≤ 0`).toBeGreaterThan(0);
    }
  });
});

/**
 * XP-VERBOTS-GUARD (#276, Chef-Vorgabe / Spec §2+§4.2): Pets dürfen NIE eine XP-Wirkung tragen —
 * Pets fallen meist erst nach Max-Level, ein XP-Passiv wäre totes Design. Das Kind `skillXp` ist
 * KOMPLETT aus der Taxonomie gelöscht; dieser Guard hält das dauerhaft dicht:
 *  (a) Taxonomie-Ebene: kein XP-artiges Kind in Caps/Scoped-Listen,
 *  (b) Content-Ebene: kein Pet trägt ein XP-Kind (Übergangs-Duldung NUR für die 6 bekannten
 *      Alt-Pets, bis content-dev Schritt 3 sie ersetzt — selbstreinigend),
 *  (c) Engine-Ebene: ein Alt-Pet mit Legacy-Kind ist ein vollständiger No-op.
 */
describe("pet XP-Verbot (#276): kein Pet-Passiv mit XP-Wirkung — dauerhaft", () => {
  const pets = content.pets ?? {};

  it("(a) Taxonomie: skillXp ist gelöscht, kein /xp/i-Kind existiert", () => {
    const kinds = Object.keys(PET_SKILL_EFFECT_CAP);
    expect(kinds).not.toContain("skillXp");
    for (const k of kinds) {
      expect(/xp/i.test(k), `XP-artiges Pet-Passiv-Kind "${k}" ist VERBOTEN (#276)`).toBe(false);
    }
    expect(SKILL_SCOPED_PET_KINDS as string[]).not.toContain("skillXp");
    for (const k of ALL_SKILL_KINDS) {
      expect(/xp/i.test(k), `XP-artiges Pet-Passiv-Kind "${k}" ist VERBOTEN (#276)`).toBe(false);
    }
  });

  it("(b) Content: kein Pet trägt ein XP-Kind (nur die 6 bekannten Alt-Pets geduldet)", () => {
    for (const pet of Object.values(pets)) {
      const kind = pet.skillEffect.kind;
      if (!/xp/i.test(kind)) continue;
      expect(
        LEGACY_SKILLXP_PETS.includes(pet.id),
        `Pet ${pet.id}: XP-Passiv "${kind}" ist VERBOTEN (#276, Chef-Vorgabe)`,
      ).toBe(true);
    }
  });

  it("(b2) Übergangs-Duldung skillXp: jeder gelistete Eintrag trägt noch skillXp — sonst Liste leeren", () => {
    for (const id of LEGACY_SKILLXP_PETS) {
      const pet = pets[id];
      expect(pet, `LEGACY_SKILLXP_PETS: Pet ${id} existiert nicht — Eintrag entfernen`).toBeDefined();
      expect(
        pet!.skillEffect.kind,
        `LEGACY_SKILLXP_PETS: Pet ${id} trägt kein skillXp mehr — Eintrag LÖSCHEN (Guard scharf schalten)`,
      ).toBe("skillXp");
    }
  });

  it("(c) Engine: ein aktives Legacy-skillXp-Pet ist ein vollständiger No-op", () => {
    // Typ-System verbietet skillXp seit #278-Nachschärfung — der Cast simuliert handgepatchte
    // Alt-Daten; die Engine muss unbekannte Kinds weiterhin neutral behandeln (Defensive).
    const c = withSkillEffect({
      kind: "skillXp",
      skill: "woodcutting",
      value: 0.05,
    } as unknown as Parameters<typeof withSkillEffect>[0]);
    const s = gameWith(c);
    // Alle Lese-Helfer neutral …
    expect(petInstantActionChance(s, c, "woodcutting")).toBe(0);
    expect(petDoubleYieldBonus(s, c, "woodcutting")).toBe(0);
    expect(petPreserveBonus(s, c, "woodcutting")).toBe(0);
    expect(petThievingBonus(s, c, "thieving")).toBe(0);
    expect(petSpellReserveMult(s, c)).toBe(1);
    expect(petLifesteal(s, c)).toBe(0);
    expect(petSkillBoost(s, c, "attack")).toBe(0);
    expect(petDamageReduction(s, c)).toBe(0);
    expect(petDoubleLootChance(s, c)).toBe(0);
    expect(petKillHealFraction(s, c)).toBe(0);
    expect(petSellBonus(s, c)).toBe(0);
    // … und die abgeleiteten Stats sind bit-identisch zu „kein Pet aktiv".
    const noPet = createGame({ name: "PetFx" }, c, 777);
    expect(computeStats(s, c)).toEqual(computeStats(noPet, c));
  });
});

describe("pet Caps (#276 §5.3): Passiv-Budget ≤5 % (Bruch), skillBoost-Sonderfall, DoT-Caps", () => {
  it("alle Bruch-Caps ≤ 0.05; PET_WHOLE_LEVEL_KINDS (skillBoost) = GANZE Level ≤ 2", () => {
    for (const [kind, cap] of Object.entries(PET_SKILL_EFFECT_CAP)) {
      if ((PET_WHOLE_LEVEL_KINDS as string[]).includes(kind)) {
        expect(Number.isInteger(cap), `Cap ${kind}: ganze Level erwartet`).toBe(true);
        expect(cap, `Cap ${kind}: max +2 Level (Spec §5.3)`).toBeLessThanOrEqual(2);
      } else {
        expect(cap, `Cap ${kind}: Passiv-Budget ≤ 5 % (Spec §2)`).toBeLessThanOrEqual(0.05);
        expect(cap, `Cap ${kind}: > 0`).toBeGreaterThan(0);
      }
    }
    expect(PET_SKILL_EFFECT_CAP.skillBoost).toBe(2);
    expect(PET_SKILL_EFFECT_CAP.lifesteal).toBe(0.02);
    expect(PET_SKILL_EFFECT_CAP.damageReduction).toBe(0.04);
  });

  it("DoT-Ability-Caps tragen die neue %-Semantik (Bruch enemy.maxHp/s, Spec §5.1)", () => {
    expect(PET_ABILITY_CAP.onHitStatus).toBe(0.04);
    expect(PET_ABILITY_CAP.delayedDot).toBe(0.04);
  });
});

/** Lokales Content mit einem Test-Pet (source: combat), das das gegebene Passiv trägt. */
function withSkillEffect(effect: PetSkillEffect, extraItems?: Record<string, ItemDef>): ContentDB {
  return {
    ...content,
    items: extraItems ? { ...content.items, ...extraItems } : content.items,
    pets: {
      ...content.pets,
      fx_pet: {
        id: "fx_pet",
        name: { en: "Fx", de: "Fx" },
        skillEffect: effect,
        combatAbility: { name: { en: "Test Ability", de: "Test-Fähigkeit" }, kind: "heal", intervalMs: 6000, value: 0.03 },
        source: { kind: "combat", style: "melee" },
        dropChance: 1 / 100000,
      },
    },
  };
}

function gameWith(c: ContentDB) {
  const s = createGame({ name: "PetFx" }, c, 777);
  grantPet(s, "fx_pet");
  equipPet(s, "fx_pet");
  return s;
}

describe("pet skillEffect (#276): die 6 neuen Passive sind angewandt (nicht defined-but-never-applied)", () => {
  it("lifesteal: fließt additiv in computeStats.lifestealPct", () => {
    const c = withSkillEffect({ kind: "lifesteal", value: 0.015 });
    const s = gameWith(c);
    expect(petLifesteal(s, c)).toBeCloseTo(0.015, 6);
    const base = computeStats(createGame({ name: "PetFx" }, c, 777), c).lifestealPct;
    expect(computeStats(s, c).lifestealPct).toBeCloseTo(base + 0.015, 6);
  });

  it("skillBoost: +2 effektive Power-Level in computeStats (skillBoosts + Kampfterme), nur für seinen Skill", () => {
    const c = withSkillEffect({ kind: "skillBoost", skill: "power", value: 2 });
    const s = gameWith(c);
    expect(petSkillBoost(s, c, "power")).toBe(2);
    expect(petSkillBoost(s, c, "attack")).toBe(0);
    const stats = computeStats(s, c);
    expect(stats.skillBoosts.power).toBe(2);
    // Wirkt auf die Kampfterme (Melee-Damage-Term liest das effektive Power-Level).
    const noPet = computeStats(createGame({ name: "PetFx" }, c, 777), c);
    expect(stats.maxHit).toBeGreaterThan(noPet.maxHit);
  });

  it("damageReduction: landet als computeStats.damageReduction (0 ohne Pet)", () => {
    const c = withSkillEffect({ kind: "damageReduction", value: 0.03 });
    const s = gameWith(c);
    expect(computeStats(s, c).damageReduction).toBeCloseTo(0.03, 6);
    expect(computeStats(createGame({ name: "PetFx" }, c, 777), c).damageReduction).toBe(0);
  });

  it("doubleLoot/killHeal: Lese-Helfer liefern den gedeckelten Wert (Anwendung: combat-dev Kill-Pfad)", () => {
    const c = withSkillEffect({ kind: "doubleLoot", value: 0.05 });
    const s = gameWith(c);
    expect(petDoubleLootChance(s, c)).toBeCloseTo(0.05, 6);
    expect(petKillHealFraction(s, c)).toBe(0);
    const c2 = withSkillEffect({ kind: "killHeal", value: 0.03 });
    const s2 = gameWith(c2);
    expect(petKillHealFraction(s2, c2)).toBeCloseTo(0.03, 6);
    expect(petDoubleLootChance(s2, c2)).toBe(0);
  });

  it("sellBonus: Verkauf zahlt effectiveSellPrice (Basis × 1.05, gerundet, min 1)", () => {
    const valuable: ItemDef = { id: "fx_valuable", name: "fx_valuable", type: "material", stackable: true, value: 100 };
    const c = withSkillEffect({ kind: "sellBonus", value: 0.05 }, { fx_valuable: valuable });
    const s = gameWith(c);
    addItem(s.inventory, c, "fx_valuable", 10);
    const base = sellPrice(c, "fx_valuable");
    const unit = effectiveSellPrice(s, c, "fx_valuable");
    expect(unit).toBe(Math.max(1, Math.round(base * 1.05)));
    expect(unit).toBeGreaterThan(base); // bei value 100 ist der Bonus sichtbar (kein Rundungs-Schlucker)
    const goldBefore = s.character.gold;
    const gained = sellItem(s, c, "fx_valuable", 10);
    expect(gained).toBe(unit * 10);
    expect(s.character.gold).toBe(goldBefore + unit * 10);
  });

  it("Caps klemmen Fehl-Content (lifesteal 0.5→0.02, skillBoost 7→2, sellBonus 1→0.05)", () => {
    const c1 = withSkillEffect({ kind: "lifesteal", value: 0.5 });
    expect(petLifesteal(gameWith(c1), c1)).toBe(0.02);
    const c2 = withSkillEffect({ kind: "skillBoost", skill: "power", value: 7 });
    expect(petSkillBoost(gameWith(c2), c2, "power")).toBe(2);
    const c3 = withSkillEffect({ kind: "sellBonus", value: 1 });
    expect(petSellBonus(gameWith(c3), c3)).toBe(0.05);
  });
});

describe("pet skillEffect: angewandt (nicht defined-but-never-applied)", () => {
  function freshGame() {
    return createGame({ name: "PetTester" }, content, 12345);
  }

  it("instantAction-Pet erhöht den Doppelertrag-Bonus nur für seinen Skill", () => {
    const s = freshGame();
    grantPet(s, "rotbark"); // instantAction woodcutting 0.05
    equipPet(s, "rotbark");
    expect(petInstantActionChance(s, content, "woodcutting")).toBeCloseTo(0.05, 5);
    expect(petInstantActionChance(s, content, "mining")).toBe(0);
  });

  it("doubleDrop/gatherYield-Familie erhöht den Doppelertrag-Bonus nur für seinen Skill", () => {
    const s = freshGame();
    grantPet(s, "cragmaw"); // doubleDrop mining 0.05
    equipPet(s, "cragmaw");
    expect(petDoubleYieldBonus(s, content, "mining")).toBeCloseTo(0.05, 5);
    expect(petDoubleYieldBonus(s, content, "woodcutting")).toBe(0);
  });

  it("refundMaterial-Familie erhöht den Preserve-Bonus nur für seinen Skill", () => {
    const s = freshGame();
    grantPet(s, "slagfiend"); // refundMaterial smithing 0.05
    equipPet(s, "slagfiend");
    expect(petPreserveBonus(s, content, "smithing")).toBeCloseTo(0.05, 5);
    expect(petPreserveBonus(s, content, "cooking")).toBe(0);
  });

  it("spellReserve-Pet skaliert die Zauberreserve (global, ×1.05 auf maxMana; Zauberreserve 28.08.2026)", () => {
    const s = freshGame();
    const base = computeStats(s, content).maxMana;
    grantPet(s, "pyreling"); // spellReserve 0.05
    equipPet(s, "pyreling");
    expect(petSpellReserveMult(s, content)).toBeCloseTo(1.05, 5);
    const stats = computeStats(s, content);
    expect(stats.maxMana).toBeCloseTo(base * 1.05, 6);
  });

  it("nicht besessenes/ausgerüstetes Pet wirkt nicht", () => {
    const s = freshGame();
    s.character.companionPetId = "rotbark";
    expect(petInstantActionChance(s, content, "woodcutting")).toBe(0);
  });
});

describe("pet combatAbility: Lese-API für combat-dev", () => {
  function freshGame() {
    return createGame({ name: "PetTester" }, content, 12345);
  }

  it("petCombatAbility liefert kind+intervalMs+value (gedeckelt); skill-Helfer bleiben separat", () => {
    const s = freshGame();
    grantPet(s, "cragmaw"); // skillEffect doubleDrop(mining), combatAbility burstDamage
    equipPet(s, "cragmaw");
    const ab = petCombatAbility(s, content);
    expect(ab?.kind).toBe("burstDamage");
    expect(ab?.intervalMs).toBeGreaterThan(0);
    expect(ab?.value).toBeLessThanOrEqual(PET_ABILITY_CAP.burstDamage);
    // Skill-Helfer eines Mining-Pets greifen nur auf mining; thieving bleibt neutral.
    expect(petThievingBonus(s, content, "thieving")).toBe(0);
  });

  it("status-bringende Ability trägt status durch (slagfiend → burn)", () => {
    const s = freshGame();
    grantPet(s, "slagfiend"); // combatAbility onHitStatus(burn)
    equipPet(s, "slagfiend");
    const ab = petCombatAbility(s, content);
    expect(ab?.kind).toBe("onHitStatus");
    expect(ab?.status).toBe("burn");
  });

  it("ohne aktives Pet ist die Ability-API null", () => {
    const s = freshGame();
    expect(petCombatAbility(s, content)).toBeNull();
  });
});

describe("pet drop: deterministisch & nur wenn nicht besessen", () => {
  it("kein RNG-Wurf, wenn das einzige woodcutting-Pet besessen ist (Sequenz unverändert)", () => {
    const s = createGame({ name: "X" }, content, 999);
    grantPet(s, "rotbark");
    const before = s.rng.state;
    const got = tryPetDrop(s, content, { kind: "skill", skill: "woodcutting" });
    expect(got).toBeNull();
    expect(s.rng.state).toBe(before); // kein nextFloat konsumiert
  });

  it("garantierter Drop bei dropChance=1 (gemocktes Pet-Content)", () => {
    const s = createGame({ name: "X" }, content, 7);
    const localContent = {
      ...content,
      pets: {
        ...content.pets,
        debug_pet: {
          id: "debug_pet",
          name: { en: "Debug", de: "Debug" },
          skillEffect: { kind: "doubleDrop", skill: "mining", value: 0.05 } as const,
          combatAbility: { name: { en: "Test Ability", de: "Test-Fähigkeit" }, kind: "heal", intervalMs: 6000, value: 0.03 } as const,
          source: { kind: "skill", skill: "mining" } as const,
          dropChance: 1,
        },
      },
    };
    const got = tryPetDrop(s, localContent, { kind: "skill", skill: "mining" });
    expect(got).toBe("debug_pet");
    expect(s.character.ownedPets.debug_pet).toBe(true);
    expect(s.lastPetDrop?.petId).toBe("debug_pet");
  });

  it("Welle DD: der 2. Session-Drop trägt eine ECHT höhere seq — auch nach der UI-Quittung (null)", () => {
    // Fun-Sweep pets-fenn Top-1 „Kein Drop darf je stumm sein": PetCelebration.tsx quittiert den
    // Breadcrumb mit `lastPetDrop = null`, hält aber eine seenSeq-Hochwassermarke. Vor dem Fix
    // leitete tryPetDrop die seq aus `(lastPetDrop?.seq ?? 0) + 1` ab → nach der Quittung begann
    // sie wieder bei 1 und jeder weitere Drop derselben Session blieb stumm. Jetzt kommt sie aus
    // dem monotonen `petDropSeq`.
    const s = createGame({ name: "X" }, content, 7);
    const localContent = {
      ...content,
      pets: {
        ...content.pets,
        debug_pet_a: {
          id: "debug_pet_a",
          name: { en: "A", de: "A" },
          skillEffect: { kind: "doubleDrop", skill: "mining", value: 0.05 } as const,
          combatAbility: { name: { en: "T", de: "T" }, kind: "heal", intervalMs: 6000, value: 0.03 } as const,
          source: { kind: "skill", skill: "mining" } as const,
          dropChance: 1,
        },
        debug_pet_b: {
          id: "debug_pet_b",
          name: { en: "B", de: "B" },
          skillEffect: { kind: "doubleDrop", skill: "fishing", value: 0.05 } as const,
          combatAbility: { name: { en: "T", de: "T" }, kind: "heal", intervalMs: 6000, value: 0.03 } as const,
          source: { kind: "skill", skill: "fishing" } as const,
          dropChance: 1,
        },
      },
    };

    expect(tryPetDrop(s, localContent, { kind: "skill", skill: "mining" })).toBe("debug_pet_a");
    const seq1 = s.lastPetDrop?.seq ?? 0;
    expect(seq1).toBe(1);
    expect(s.petDropSeq).toBe(1);

    // UI-Quittung simulieren (Anzeige gesehen → Breadcrumb genullt). Der Zähler bleibt stehen.
    s.lastPetDrop = null;
    expect(s.petDropSeq).toBe(1);

    expect(tryPetDrop(s, localContent, { kind: "skill", skill: "fishing" })).toBe("debug_pet_b");
    // Cast nötig: TS hat s.lastPetDrop nach der Quittungs-Zuweisung auf `null` verengt und sieht
    // die Mutation in tryPetDrop nicht.
    const drop2 = s.lastPetDrop as { petId: string; seq: number } | null;
    const seq2 = drop2?.seq ?? 0;
    // Zwei unterscheidbare Celebration-Events: seq2 liegt STRIKT über seq1 → eine UI mit
    // seenSeq-Hochwassermarke (seenSeq = seq1) feiert den zweiten Drop garantiert erneut.
    expect(seq2).toBe(2);
    expect(seq2).toBeGreaterThan(seq1);
    expect(s.petDropSeq).toBe(2);
    expect(drop2?.petId).toBe("debug_pet_b");
  });
});

/**
 * Regressions-Guard (Sweep2 10-achievements P1): Farming hat keine ActionDef und läuft über den
 * Plot-/Ernte-Pfad (`farming.grantHarvest`). Früher rief NUR `tick.ts` `tryPetDrop` → das Farming-Pet
 * `witherling` konnte NIE droppen → `ach_pets_all` unerreichbar. Dieser Test forciert dropChance und
 * prüft den ECHTEN Ernte-Pfad (nicht nur „Crop existiert"): das Farming-Pet MUSS über die Ernte fallen.
 */
describe("pet drop: Farming-Pet fällt über den ERNTE-Pfad (nicht nur Action-Pfad)", () => {
  const GROW = 600_000;
  function farmingContent(): ContentDB {
    const seed: ItemDef = { id: "wp_seed", name: "wp_seed", type: "material", stackable: true };
    const herb: ItemDef = { id: "wp_herb", name: "wp_herb", type: "material", stackable: true };
    const crop: CropDef = {
      id: "wp_crop", name: "WP Crop", seedItem: "wp_seed", yieldItem: "wp_herb",
      yieldMin: 1, yieldMax: 1, levelRequired: 1, growMs: GROW, xp: 10, tier: 1,
    };
    const witherling = content.pets?.witherling;
    if (!witherling) throw new Error("Fixture erwartet das Farming-Pet 'witherling' im Content");
    return {
      ...content,
      items: { ...content.items, wp_seed: seed, wp_herb: herb },
      crops: { wp_crop: crop },
      // dropChance forcieren, damit die erste Ernte garantiert das Pet zieht.
      pets: { ...content.pets, witherling: { ...witherling, dropChance: 1 } },
    };
  }

  it("witherling droppt über tickFarmPlots/grantHarvest, nicht nur über completeAction", () => {
    const c = farmingContent();
    const s = createGame({ name: "Farmer" }, c, 4242);
    addItem(s.inventory, c, "wp_seed", 50);
    expect(plantCrop(s, c, 0, "wp_crop")).toBe(true);
    expect(s.character.ownedPets.witherling).toBeFalsy(); // vor der Ernte nicht besessen

    // Crop reif → advance tickt tickFarmPlots → grantHarvest feuert tryPetDrop(skill:"farming").
    advance(s, c, GROW);

    expect(s.character.ownedPets.witherling).toBe(true); // über den Ernte-Pfad gedroppt
    expect(s.lastPetDrop?.petId).toBe("witherling");
  });

  it("ohne reife Ernte fällt kein Pet (Harvest-Pfad zieht nur mit tatsächlicher Ernte)", () => {
    const c = farmingContent();
    const s = createGame({ name: "Farmer" }, c, 4242);
    addItem(s.inventory, c, "wp_seed", 50);
    plantCrop(s, c, 0, "wp_crop");
    advance(s, c, GROW - 1000); // knapp vor der Reife → keine Ernte
    expect(s.character.ownedPets.witherling).toBeFalsy();
  });
});

/**
 * 1.2.0 (Chef 28.08.2026): Schneidern-Begleiter silkweaver — Schneidern läuft über normale Rezepte, der
 * Begleiter-Wurf kommt also automatisch aus tick.ts `completeAction` (kein eigener Hook nötig; der Jagen-
 * Begleiter booted_tomcat hat seinen Hook in hunting.ts, s. hunting.test.ts).
 */
describe("Schneidern-Begleiter silkweaver (1.2.0): fällt über den normalen Aktions-Pfad", () => {
  it("weave_nettle mit dropChance 1 ⇒ silkweaver nach dem ersten Abschluss; Passiv refundMaterial 5 % NUR auf tailoring", () => {
    const silk = content.pets.silkweaver!;
    expect(silk.source).toEqual({ kind: "skill", skill: "tailoring" });
    expect(silk.skillEffect).toMatchObject({ kind: "refundMaterial", skill: "tailoring", value: 0.05 });
    const c: ContentDB = { ...content, pets: { ...content.pets, silkweaver: { ...silk, dropChance: 1 } } };
    const s = createGame({ name: "Weberin" }, c, 99);
    addItem(s.inventory, c, "fiber_nettle", 30);
    setActiveAction(s, c, "weave_nettle");
    expect(s.activeActionId).toBe("weave_nettle");
    advance(s, c, 3200); // ein Abschluss (durationMs 3000)
    expect(s.character.ownedPets.silkweaver).toBe(true);
    expect(s.character.companionPetId).toBe("silkweaver");
    expect(s.lastPetDrop?.petId).toBe("silkweaver");
    expect(petPreserveBonus(s, c, "tailoring")).toBe(0.05);
    expect(petPreserveBonus(s, c, "smithing")).toBe(0);
  });
});

describe("Pet-Ability-Lokalisierung (Loc-Pass 2026-07-09)", () => {
  it("jeder Kampf-Fähigkeits-Name liegt in allen 7 Sprachen vor (Overlay via Punkt-Pfad angewendet)", () => {
    const locales = ["en", "de", "es", "fr", "pt-BR", "ru", "zh"] as const;
    for (const p of Object.values(content.pets)) {
      const name = p.combatAbility.name as Record<string, string | undefined>;
      for (const loc of locales) {
        expect(name[loc], `${p.id}.combatAbility.name fehlt in "${loc}"`).toBeTruthy();
      }
    }
  });
});

/**
 * Combat-Pets sind an den geführten Kampfstil gebunden (Chef-Fix 2026-07-22): `tryPetDrop`
 * würfelte vorher bei JEDEM Kill jedes noch nicht besessene Combat-Pet an — unabhängig vom
 * geführten Stil. Jetzt filtert `{ kind: "combat", style }` auf Pets mit passendem
 * `source.style`; nicht-passende Pets werden übersprungen OHNE nextFloat zu ziehen (RNG-Disziplin
 * wie beim bestehenden skill/dropChance<=0-Pfad).
 */
describe("pet Combat-Stil-Bindung (Chef-Fix 2026-07-22): tryPetDrop filtert nach aktivem Stil", () => {
  function stylePet(id: string, style: WeaponStyle, dropChance: number): PetDef {
    return {
      id,
      name: { en: id, de: id },
      skillEffect: { kind: "spellReserve", value: 0.01 },
      combatAbility: { name: { en: "T", de: "T" }, kind: "heal", intervalMs: 6000, value: 0.03 },
      source: { kind: "combat", style },
      dropChance,
    };
  }

  it("Gegenstil-Pet (dropChance=1) droppt NICHT und zieht KEIN nextFloat", () => {
    const local: ContentDB = {
      ...content,
      pets: { off_style: stylePet("off_style", "ranged", 1) },
    };
    const s = createGame({ name: "X" }, local, 1);
    const before = s.rng.state;
    const got = tryPetDrop(s, local, { kind: "combat", style: "melee" });
    expect(got).toBeNull();
    expect(s.character.ownedPets.off_style).toBeFalsy();
    expect(s.rng.state).toBe(before); // kein nextFloat konsumiert (Stil passt nicht)
  });

  it("Stil-Treffer-Pet (dropChance=1) droppt garantiert", () => {
    const local: ContentDB = {
      ...content,
      pets: { on_style: stylePet("on_style", "melee", 1) },
    };
    const s = createGame({ name: "X" }, local, 1);
    const got = tryPetDrop(s, local, { kind: "combat", style: "melee" });
    expect(got).toBe("on_style");
    expect(s.character.ownedPets.on_style).toBe(true);
  });

  it("RNG-Zugfolge: genau ein nextFloat je passendem UNBESESSENEM Pet des aktiven Stils — nicht mehr", () => {
    const local: ContentDB = {
      ...content,
      pets: {
        // Gegenstil-Kanarienvogel mit dropChance=1: würde SOFORT droppen, falls er fälschlich
        // mitgewürfelt würde — bleibt er unbesessen, hat der Stil-Filter ihn korrekt übersprungen.
        canary_ranged: stylePet("canary_ranged", "ranged", 1),
        // Zwei passende, unbesessene melee-Pets mit winziger Chance (praktisch kein Treffer bei
        // diesem Seed) — jedes zieht GENAU EIN nextFloat.
        melee_low_1: stylePet("melee_low_1", "melee", 1e-9),
        melee_low_2: stylePet("melee_low_2", "melee", 1e-9),
        // Bereits besessenes melee-Pet: wird VOR dem Stil-/Chance-Check übersprungen → kein Zug.
        melee_owned: stylePet("melee_owned", "melee", 1),
      },
    };
    const s = createGame({ name: "X" }, local, 1);
    s.character.ownedPets.melee_owned = true;
    const before = s.rng.state;
    const got = tryPetDrop(s, local, { kind: "combat", style: "melee" });
    expect(got).toBeNull(); // kein Treffer bei den Niedrig-Chance-Pets
    expect(s.character.ownedPets.canary_ranged).toBeFalsy(); // nie mitgewürfelt
    // Erwartet exakt 2 Züge (melee_low_1 + melee_low_2, in Insertion-Reihenfolge) — per
    // Vorwärts-Simulation derselben deterministischen Sequenz nachgewiesen.
    const simulated = { state: before };
    nextFloat(simulated);
    nextFloat(simulated);
    expect(s.rng.state).toBe(simulated.state);
  });
});
