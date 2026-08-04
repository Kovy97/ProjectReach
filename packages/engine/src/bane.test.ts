import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type {
  ContentDB,
  GameState,
  ItemDef,
  ItemInstance,
  MonsterDef,
  WeaponEffect,
} from "@hearthforge/shared";
import { createGame } from "./state";
import { computeStats } from "./character";
import { startCombat } from "./combat";
import { advance } from "./tick";
import { xpForLevel } from "./leveling";

/**
 * Bane-System (Task #213): `bane`-Waffeneffekt = +magnitude-Anteil Schaden, wenn
 * `MonsterDef.family === effect.targetFamily`. Guards (content-unabhängig, synthetisch):
 *  (a) exakter Bonus gegen getaggte Monster, KEIN Bonus gegen ungetaggte/fremde Familien,
 *  (b) Stacking-Regel: gleiches Kind → stärkste Magnitude (kein Multiplizieren),
 *      verschiedene Kinds → multiplikativ (§2.3.3),
 *  (c) Enchant-Proc-Träger (Instanz-Affix, effectiveInstanceWeaponEffects-Pfad),
 *  (d) Determinismus: gleicher Seed → identisches Kampf-Log.
 * Setup wie weapon-effects-2.test.ts: min==max-Waffe + Anti-Krit-Offhand ⇒ deterministische
 * NON-Crit-Treffer; Kampf-Skills auf L60 eingefroren (Monster-L5 ⇒ kein XP-/Stat-Drift).
 */

const FROZEN_SKILLS = ["attack", "power", "defence", "vitality", "ranged", "magic", "warding"];

function eff(type: WeaponEffect["type"], over: Partial<WeaponEffect> = {}): WeaponEffect {
  return { type, chance: 1, magnitude: 0, durationMs: 0, ...over };
}

function dummy(over: Partial<MonsterDef> = {}): MonsterDef {
  return {
    id: "bane_dummy",
    name: "Trainingspuppe",
    level: 5,
    maxHp: 100_000,
    damage: 0.1,
    accuracy: 0,
    evasion: 0,
    defense: 0,
    attackIntervalMs: 9_999_999,
    xp: 0,
    gold: 0,
    loot: [],
    ...over,
  };
}

const NOCRIT: ItemDef = {
  id: "bane_nocrit",
  name: "Anti-Krit-Buckler",
  type: "equipment",
  stackable: false,
  slot: "offhand",
  bonus: { critChance: -1 },
};

function meleeWeapon(effects: WeaponEffect[], over: Partial<ItemDef> = {}): ItemDef {
  return {
    id: "bane_weapon",
    name: "Grabstahl-Probe",
    type: "equipment",
    stackable: false,
    slot: "mainhand",
    weaponStyle: "melee",
    weaponType: "sword",
    damageMin: 99,
    damageMax: 99,
    attackIntervalMs: 1000,
    weaponEffects: effects,
    ...over,
  };
}

function withContent(items: ItemDef[], monsters: MonsterDef[] = [dummy()]): ContentDB {
  const c: ContentDB = {
    ...content,
    items: { ...content.items },
    monsters: { ...content.monsters },
    affixes: { ...content.affixes },
  };
  for (const i of [...items, NOCRIT]) c.items[i.id] = i;
  for (const m of monsters) c.monsters[m.id] = m;
  return c;
}

function newFight(
  c: ContentDB,
  weaponId: string,
  opts: { monsterId?: string; seed?: number; instance?: ItemInstance } = {},
): GameState {
  const s = createGame({ name: "Bane" }, c, opts.seed ?? 7);
  for (const id of FROZEN_SKILLS) s.skills[id] = { xp: xpForLevel(60) };
  s.character.equipment.mainhand = weaponId;
  s.character.equipment.offhand = "bane_nocrit";
  if (opts.instance) s.character.equippedInstances = { mainhand: opts.instance };
  s.character.hp = computeStats(s, c).maxHp;
  startCombat(s, c, opts.monsterId ?? "bane_dummy");
  return s;
}

function firstHit(s: GameState): number {
  const h = s.combat.log.find((e) => e.by === "player" && (e.kind === "hit" || e.kind === "crit"));
  expect(h, "kein Spieler-Treffer im Log").toBeDefined();
  return h!.amount;
}

/** Deterministischer NON-Crit-Basistreffer der ausgerüsteten min==max-Waffe. */
function baseHit(s: GameState, c: ContentDB): number {
  return Math.round(computeStats(s, c).attackDamageMin);
}

describe("Bane-System (Task #213): Extra-Schaden gegen Monster-Familien", () => {
  it("bane(undead, +25 %): exakter Bonus NUR gegen die getaggte Familie", () => {
    const c = withContent(
      [meleeWeapon([eff("bane", { magnitude: 0.25, targetFamily: "undead" })])],
      [
        dummy({ id: "bane_zombie", family: "undead" }),
        dummy({ id: "bane_plain" }), // ungetaggt — Familien-Feld ist optional, kein Bruch
        dummy({ id: "bane_wolf", family: "beast" }),
      ],
    );
    const vsUndead = newFight(c, "bane_weapon", { monsterId: "bane_zombie" });
    const b = baseHit(vsUndead, c);
    advance(vsUndead, c, 900);
    expect(firstHit(vsUndead)).toBe(Math.round(b * 1.25));

    const vsPlain = newFight(c, "bane_weapon", { monsterId: "bane_plain" });
    advance(vsPlain, c, 900);
    expect(firstHit(vsPlain)).toBe(b); // ungetaggtes Monster: kein Familien-Match

    const vsBeast = newFight(c, "bane_weapon", { monsterId: "bane_wolf" });
    advance(vsBeast, c, 900);
    expect(firstHit(vsBeast)).toBe(b); // fremde Familie: kein Bonus
  });

  it("Stacking-Guard: 2× bane stapelt NICHT — die stärkste Magnitude gewinnt", () => {
    const c = withContent(
      [
        meleeWeapon([
          eff("bane", { magnitude: 0.25, targetFamily: "undead" }),
          eff("bane", { magnitude: 0.1, targetFamily: "undead" }),
        ]),
      ],
      [dummy({ id: "bane_zombie", family: "undead" })],
    );
    const s = newFight(c, "bane_weapon", { monsterId: "bane_zombie" });
    const b = baseHit(s, c);
    advance(s, c, 900);
    expect(firstHit(s)).toBe(Math.round(b * 1.25)); // NICHT ×1.25×1.1
  });

  it("verschiedene Kinds multiplizieren: bane × giantSlayer auf dem Einzelschlag (§2.3.3)", () => {
    const c = withContent(
      [
        meleeWeapon([
          eff("bane", { magnitude: 0.25, targetFamily: "undead" }),
          eff("giantSlayer", { magnitude: 0.15 }),
        ]),
      ],
      [dummy({ id: "bane_lich", family: "undead", level: 99 })],
    );
    const s = newFight(c, "bane_weapon", { monsterId: "bane_lich" });
    const b = baseHit(s, c);
    advance(s, c, 900);
    expect(firstHit(s)).toBe(Math.round(b * 1.25 * 1.15));
  });

  it("Enchant-Proc-Träger: bane aus Instanz-Affix (weaponEffectByTier) greift ebenfalls", () => {
    const c = withContent(
      [meleeWeapon([])], // Basis-Waffe OHNE eigene Effekte
      [dummy({ id: "bane_zombie", family: "undead" })],
    );
    c.affixes = {
      ...c.affixes,
      test_bane_rune: {
        id: "test_bane_rune",
        prefix: { en: "Grave-forged", de: "Grabgeschmiedet" },
        bonusByTier: [{}],
        weaponEffectByTier: [eff("bane", { magnitude: 0.25, targetFamily: "undead" })],
      },
    };
    const inst: ItemInstance = {
      instanceId: "inst_bane_sword",
      baseItemId: "bane_weapon",
      affixes: [{ affixId: "test_bane_rune", tier: 1 }],
    };
    const s = newFight(c, "bane_weapon", { monsterId: "bane_zombie", instance: inst });
    const b = baseHit(s, c);
    advance(s, c, 900);
    expect(firstHit(s)).toBe(Math.round(b * 1.25));

    const bare = newFight(c, "bane_weapon", { monsterId: "bane_zombie" }); // ohne Instanz
    advance(bare, c, 900);
    expect(firstHit(bare)).toBe(b);
  });

  it("Determinismus: gleicher Seed ⇒ identisches Kampf-Log (bane ändert die RNG-Disziplin nicht)", () => {
    const c = withContent(
      [meleeWeapon([eff("bane", { magnitude: 0.25, targetFamily: "undead" })])],
      // Evasion > 0 ⇒ echte Treffer-Rolls; Monster schlägt zurück ⇒ beide RNG-Pfade aktiv.
      [dummy({ id: "bane_ghoul", family: "undead", damage: 2, accuracy: 50, evasion: 40, attackIntervalMs: 1200 })],
    );
    const run = () => {
      const s = newFight(c, "bane_weapon", { monsterId: "bane_ghoul", seed: 123 });
      advance(s, c, 10_000);
      return s.combat.log;
    };
    expect(run()).toEqual(run());
  });
});
