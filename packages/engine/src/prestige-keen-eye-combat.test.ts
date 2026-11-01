import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { ContentDB, GameState, MonsterDef } from "@hearthforge/shared";
import { PRESTIGE_TALENT_TREE_ID, TALENT_RARE_DROP_MAX_BASE_CHANCE } from "@hearthforge/shared";
import { createGame } from "./state";
import { startCombat } from "./combat";
import { advance } from "./tick";
import { itemCount } from "./inventory";

// claude:2026-10-30T19:30:00+01:00 — 1.4.2 „Scharfer Blick“ im echten Kill-Pfad (combat.ts rollLootTable): gleicher Wurf,
// höhere Schwelle für seltene Einträge. Mit identischem Seed ist jeder Fund ohne Talent auch mit Talent ein Fund (Obermenge),
// es kommen nur welche dazu. Häufige Einträge bleiben unberührt.

const RARE_ITEM = Object.values(content.items).find((i) => i.type === "material" && i.stackable)!.id;
const COMMON_ITEM = Object.values(content.items).find((i) => i.type === "material" && i.stackable && i.id !== RARE_ITEM)!.id;

const dummy: MonsterDef = {
  id: "keen_dummy",
  name: { en: "Dummy", de: "Puppe" },
  level: 1,
  maxHp: 1,
  damage: 0.1,
  accuracy: 0,
  evasion: 0,
  defense: 0,
  attackIntervalMs: 9_999_999,
  xp: 0,
  gold: 0,
  loot: [
    { itemId: RARE_ITEM, chance: TALENT_RARE_DROP_MAX_BASE_CHANCE, min: 1, max: 1, suffixChance: 0 },
    { itemId: COMMON_ITEM, chance: 0.05, min: 1, max: 1, suffixChance: 0 },
  ],
} as MonsterDef;
const local: ContentDB = { ...content, monsters: { ...content.monsters, [dummy.id]: dummy } };

function farm(withKeenEye: boolean): { rare: number; common: number; kills: number } {
  const s: GameState = createGame({ name: "Blick" }, local, 4242);
  if (withKeenEye) {
    s.prestige.count = 1;
    s.talents = { ...s.talents, [PRESTIGE_TALENT_TREE_ID]: { damage: 2, goldFind: 1, rareDrop: 3 } };
  }
  expect(startCombat(s, local, dummy.id)).toBe(true);
  advance(s, local, 6 * 60 * 60 * 1000);
  return { rare: itemCount(s.inventory, RARE_ITEM) + (s.bank[RARE_ITEM] ?? 0), common: itemCount(s.inventory, COMMON_ITEM) + (s.bank[COMMON_ITEM] ?? 0), kills: s.combat.kills };
}

describe("1.4.2 · Scharfer Blick im Kampf", () => {
  it("bringt mehr seltene Beute, häufige Beute bleibt gleich wahrscheinlich", () => {
    const without = farm(false);
    const withTalent = farm(true);
    expect(without.kills).toBeGreaterThan(1000);
    expect(withTalent.rare).toBeGreaterThan(without.rare);
    // Häufige Einträge laufen mit unveränderter Schwelle; die Menge bleibt in derselben Größenordnung.
    expect(Math.abs(withTalent.common - without.common)).toBeLessThan(without.common * 0.2 + 5);
  });
});
