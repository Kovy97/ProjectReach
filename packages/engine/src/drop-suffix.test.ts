import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { DEFAULT_DROP_SUFFIX_CHANCE } from "@hearthforge/shared";
import type { ContentDB, ItemDef, MonsterDef, SuffixDef } from "@hearthforge/shared";
import { createGame } from "./state";
import { startCombat, combatStep } from "./combat";
import { expandBaseCapacity } from "./inventory";

/**
 * Drop-Suffix-Guard (#128 Abschluss): beweist, dass der KILL-/Loot-Pfad in combat.ts gedroppte
 * Equipment-Gegenstände scharfschaltet — mit hoher `loot.suffixChance` deterministisch Suffix-
 * Instanzen, mit Chance 0 nie, und ohne explizite Chance greift der globale
 * `DEFAULT_DROP_SUFFIX_CHANCE`. Synthetischer Content (Pool + Mob) — der echte Pool kommt von
 * content-dev; hier injizieren wir ihn, um das Engine-Fundament headless zu prüfen.
 */
function dropContent(suffixChance?: number): ContentDB {
  const sword: ItemDef = {
    id: "test_drop_sword",
    name: { en: "Test Drop Sword", de: "Test-Drop-Schwert" },
    type: "equipment",
    slot: "mainhand",
    weaponStyle: "melee",
    stackable: false,
  };
  const bull: SuffixDef = {
    id: "suffix_bull",
    suffix: { en: "of the Bull", de: "des Stiers" },
    appliesTo: ["weapon_melee"],
    statsPerIlvl: { meleeDamage: 0.7 },
    attrPerIlvl: { str: 0.45 },
    weight: 100,
  };
  // Trivialer Mob: stirbt sofort, schlägt kaum zu → der starke Spieler killt zuverlässig.
  const mob: MonsterDef = {
    id: "test_drop_mob",
    name: { en: "Loot Dummy", de: "Loot-Puppe" },
    level: 30, // ilvl der Drop-Suffixe = Monster-Level
    maxHp: 4,
    damage: 0,
    accuracy: 0,
    evasion: 0,
    defense: 0,
    attackIntervalMs: 100_000,
    xp: 1,
    gold: 0,
    loot: [
      {
        itemId: "test_drop_sword",
        chance: 1,
        min: 1,
        max: 1,
        ...(suffixChance !== undefined ? { suffixChance } : {}),
      },
    ],
  };
  return {
    ...content,
    suffixes: { suffix_bull: bull },
    items: { ...content.items, test_drop_sword: sword },
    monsters: { ...content.monsters, test_drop_mob: mob },
  };
}

/** Zählt in der Inventar-Tasche gehaltene Equipment-Instanzen mit Suffix. */
function suffixInstancesIn(s: ReturnType<typeof createGame>): number {
  return s.inventory.instances.filter((i) => i.suffix).length;
}

/** Kämpft (mit starkem Spieler) bis `kills` Kills erreicht sind. */
function farmKills(c: ContentDB, seed: number, kills: number) {
  const s = createGame({ name: "Hunter", baseAttributes: { str: 90, dex: 90, con: 90 } }, c, seed);
  expandBaseCapacity(s.inventory, content, 4000);
  startCombat(s, c, "test_drop_mob");
  let guard = 0;
  while (s.combat.kills < kills && s.combat.monsterId && guard++ < 50_000) combatStep(s, c);
  return s;
}

describe("Drop-Suffix (combat.ts Kill-Loot scharfgeschaltet)", () => {
  it("Equipment-Drop mit hoher suffixChance erzeugt deterministisch Suffix-Instanzen", () => {
    const c = dropContent(1); // → auf SUFFIX_CHANCE_CAP (0.95) gedeckelt
    const s = farmKills(c, 42, 20);
    expect(s.combat.kills).toBe(20);
    const made = suffixInstancesIn(s);
    expect(made).toBeGreaterThan(0); // bei ~0.95/Drop über 20 Kills praktisch sicher
    const inst = s.inventory.instances.find((i) => i.suffix);
    expect(inst?.baseItemId).toBe("test_drop_sword");
    expect(inst?.suffix?.ilvl).toBe(30); // ilvl = Monster-Level
    // Reproduzierbar: gleicher Seed → exakt gleiche Anzahl + identische RNG-Sequenz.
    const s2 = farmKills(c, 42, 20);
    expect(suffixInstancesIn(s2)).toBe(made);
    expect(s2.rng.state).toBe(s.rng.state);
  });

  it("Equipment-Drop mit suffixChance 0 erzeugt NIE eine Suffix-Instanz (und zieht keinen Suffix-RNG)", () => {
    const c = dropContent(0);
    const s = farmKills(c, 42, 20);
    expect(s.combat.kills).toBe(20);
    expect(suffixInstancesIn(s)).toBe(0);
    // Alle gedroppten Schwerter bleiben plaine Items ohne Instanz (Tasche leer).
    expect(s.inventory.instances).toHaveLength(0);
  });

  it("ohne explizite loot.suffixChance greift der globale DEFAULT_DROP_SUFFIX_CHANCE", () => {
    expect(DEFAULT_DROP_SUFFIX_CHANCE).toBeGreaterThan(0);
    const c = dropContent(undefined); // keine per-Loot-Chance → Default (~8 %)
    const s = farmKills(c, 7, 120); // viele Kills → bei ~8 % praktisch sicher ≥1 Suffix
    expect(suffixInstancesIn(s)).toBeGreaterThan(0);
  });
});
